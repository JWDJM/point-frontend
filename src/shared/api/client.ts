import createClient, { type Middleware } from 'openapi-fetch';
import { clearSession, getAccessToken, setSession } from '@/shared/auth/session';
import type { paths } from './schema';

/**
 * 모든 API 호출은 이 클라이언트를 사용한다. (컴포넌트에서 fetch 직접 호출 금지)
 * 타입은 point-backend/api/openapi.yaml 에서 생성: npm run gen:api
 * baseUrl 이 비어 있으면 같은 origin → 로컬은 Vite proxy, 운영은 ALB 경로 라우팅
 */
const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

export const apiClient = createClient<paths>({ baseUrl });

/** 토큰 재발급 전용 (인증 미들웨어 없음 → 401 재시도와 순환하지 않는다) */
const refreshClient = createClient<paths>({ baseUrl });

export const ERROR_CODES = {
  EVENT_MAINTENANCE: 'EVENT_MAINTENANCE',
} as const;

let refreshing: Promise<boolean> | null = null;

/**
 * HttpOnly refresh 쿠키로 access token 재발급. 동시에 여러 번 불려도 요청은 한 번만 보낸다
 * (서버가 쓴 refresh token 을 즉시 폐기하므로, 같은 쿠키로 두 번 보내면 두 번째는 실패한다).
 * 실패하면 세션을 지운다 → RequireAuth 가 로그인 화면으로 보낸다.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const { data } = await refreshClient.POST('/api/auth/refresh');
      if (!data?.data) {
        clearSession();
        return false;
      }
      setSession(data.data);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

let restoring: Promise<boolean> | null = null;

/** 앱 시작 시 로그인 상태 복원 (새로고침해도 로그인 유지). StrictMode 이중 실행에도 요청은 한 번 */
export function restoreSession(): Promise<boolean> {
  restoring ??= refreshSession();
  return restoring;
}

const isAuthEndpoint = (schemaPath: string) => schemaPath.startsWith('/api/auth/');

/** 401 재시도용 원본 복사본 (fetch 가 본문을 소비하므로 보내기 전에 복제해 둔다) */
const retryCopies = new Map<string, Request>();

/**
 * 인증 미들웨어
 * - 요청: Authorization: Bearer <access token>
 * - 401(만료 등): refresh 쿠키로 재발급 후 한 번만 재시도. 재발급도 실패하면 로그인 화면으로
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
    if (response.status !== 401 || isAuthEndpoint(schemaPath) || !copy) return response;
    if (!(await refreshSession())) return response;
    copy.headers.set('Authorization', `Bearer ${getAccessToken()}`);
    return fetch(copy);
  },
};

apiClient.use(authMiddleware);
