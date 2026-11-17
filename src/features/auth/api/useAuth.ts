import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { clearSession, setSession, type TokenData } from '@/shared/auth/session';

export type AuthFailure =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_REQUEST'
  | 'UNAVAILABLE';

export type AuthResult = { ok: true } | { ok: false; reason: AuthFailure };

/** HTTP 상태 → 화면 상태 (api/openapi.yaml 의 /api/auth/signup, /api/auth/login 과 동일) */
export function toAuthResult(status: number, data?: TokenData): AuthResult {
  if ((status === 200 || status === 201) && data) return { ok: true };
  switch (status) {
    case 401:
      return { ok: false, reason: 'INVALID_CREDENTIALS' };
    case 409:
      return { ok: false, reason: 'EMAIL_ALREADY_EXISTS' };
    case 400:
      return { ok: false, reason: 'INVALID_REQUEST' };
    default:
      return { ok: false, reason: 'UNAVAILABLE' };
  }
}

export const AUTH_FAILURE_MESSAGE: Record<AuthFailure, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않아요',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일이에요. 로그인해 주세요',
  INVALID_REQUEST: '입력한 내용을 다시 확인해 주세요',
  UNAVAILABLE: '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요',
};

export interface LoginVariables {
  email: string;
  password: string;
}

export interface SignupVariables extends LoginVariables {
  name: string;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: LoginVariables): Promise<AuthResult> => {
      const { response, data } = await apiClient.POST('/api/auth/login', { body });
      const result = toAuthResult(response.status, data?.data);
      if (result.ok && data?.data) {
        queryClient.clear(); // 이전 사용자의 캐시가 보이지 않도록
        setSession(data.data);
      }
      return result;
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SignupVariables): Promise<AuthResult> => {
      const { response, data } = await apiClient.POST('/api/auth/signup', { body });
      const result = toAuthResult(response.status, data?.data);
      if (result.ok && data?.data) {
        queryClient.clear();
        setSession(data.data);
      }
      return result;
    },
  });
}

/** 서버 응답과 관계없이 화면에서는 로그아웃한다 (refresh 쿠키 폐기는 서버가 가능할 때 처리) */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.POST('/api/auth/logout');
      } finally {
        clearSession();
        queryClient.clear();
      }
    },
  });
}
