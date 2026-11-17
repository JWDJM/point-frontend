import createClient, { type Middleware } from 'openapi-fetch';
import { clearSession, getAccessToken, getSession, setSession } from '@/shared/auth/session';
import { API_BASE_URL } from './baseUrl';
import type { paths } from './schema';
import { checkHealth, reportPossibleOutage } from './systemStatus';

/** 네트워크 오류(서버·게이트웨이에 닿지 않음)는 점검 여부 확인을 건 뒤 그대로 던진다 */
const watchedFetch = async (request: Request): Promise<Response> => {
  try {
    return await fetch(request);
  } catch (e) {
    reportPossibleOutage();
    throw e;
  }
};

/**
 * 모든 API 호출은 이 클라이언트를 사용한다. (컴포넌트에서 fetch 직접 호출 금지)
 * 타입은 point-backend/api/openapi.yaml 에서 생성: npm run gen:api
 * baseUrl 이 비어 있으면 같은 origin → 로컬은 Vite proxy, 운영은 ALB 경로 라우팅
 */
export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL, fetch: watchedFetch });

/** 토큰 재발급 전용 (인증 미들웨어 없음 → 401 재시도와 순환하지 않는다) */
const refreshClient = createClient<paths>({ baseUrl: API_BASE_URL });

export const ERROR_CODES = {
  EVENT_MAINTENANCE: 'EVENT_MAINTENANCE',
} as const;

let refreshing: Promise<boolean> | null = null;

/**
 * HttpOnly refresh 쿠키로 access token 재발급. 동시에 여러 번 불려도 요청은 한 번만 보낸다
 * (서버가 쓴 refresh token 을 즉시 폐기하므로, 같은 쿠키로 두 번 보내면 두 번째는 실패한다).
 * - 401 등 거절: 세션을 지운다 → RequireAuth 가 로그인 화면으로 보낸다
 * - 서버 장애(5xx·네트워크): 세션은 그대로 두고 점검 화면에 맡긴다 (회복 후 다시 시도).
 *   단, 헬스체크는 정상인데 재발급만 실패하면 로그인 화면으로 보낸다 (무한 로딩 방지)
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const { data, response } = await refreshClient.POST('/api/auth/refresh');
      if (data?.data) {
        setSession(data.data);
        return true;
      }
      if (response.status < 500) {
        clearSession();
        return false;
      }
    } catch {
      // 네트워크 오류 → 아래에서 서버 상태 확인
    } finally {
      refreshing = null;
    }
    if (await checkHealth()) clearSession();
    return false;
  })();
  return refreshing;
}

let restoring: Promise<boolean> | null = null;

/**
 * 앱 시작 시 로그인 상태 복원 (새로고침해도 로그인 유지). StrictMode 이중 실행에도 요청은 한 번.
 * 서버 장애로 판단을 못 했으면(아직 loading) 회복 후 다시 부를 수 있게 비워 둔다.
 */
export function restoreSession(): Promise<boolean> {
  restoring ??= refreshSession().then((ok) => {
    if (!ok && getSession().status === 'loading') restoring = null;
    return ok;
  });
  return restoring;
}

const isAuthEndpoint = (schemaPath: string) => schemaPath.startsWith('/api/auth/');
/** 이벤트는 장애 시 카드별 안내(MaintenanceBanner 등)로 처리하고 화면 전체를 막지 않는다 (ADR-0004) */
const isEventEndpoint = (schemaPath: string) => schemaPath.startsWith('/api/events/');

/** 401 재시도용 원본 복사본 (fetch 가 본문을 소비하므로 보내기 전에 복제해 둔다) */
const retryCopies = new Map<string, Request>();

/**
 * 인증·장애 감지 미들웨어
 * - 요청: Authorization: Bearer <access token>
 * - 401(만료 등): refresh 쿠키로 재발급 후 한 번만 재시도. 재발급도 실패하면 로그인 화면으로
 * - 5xx: 서비스 점검 여부 확인 (systemStatus)
 */
export const authMiddleware: Middleware = {
  onRequest({ request, schemaPath, id }) {
    if (isAuthEndpoint(schemaPath)) return request;
    const token = getAccessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    retryCopies.set(id, request.clone());
    return request;
  },
  async onResponse({ response, schemaPath, id }) {
    const copy = retryCopies.get(id);
    retryCopies.delete(id);
    if (response.status >= 500 && response.status !== 501 && !isEventEndpoint(schemaPath)) {
      reportPossibleOutage();
    }
    if (response.status !== 401 || isAuthEndpoint(schemaPath) || !copy) return response;
    if (!(await refreshSession())) return response;
    copy.headers.set('Authorization', `Bearer ${getAccessToken()}`);
    return watchedFetch(copy);
  },
};

apiClient.use(authMiddleware);
