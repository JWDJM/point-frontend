import { useSyncExternalStore } from 'react';
import type { components } from '@/shared/api/schema';

export type UserProfile = components['schemas']['UserProfile'];
export type TokenData = NonNullable<components['schemas']['TokenResponse']['data']>;

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; accessToken: string; user: UserProfile };

/**
 * 로그인 상태. access token 은 메모리에만 보관한다 (localStorage 사용 금지 — XSS 시 토큰 유출 방지).
 * 새로고침하면 사라지므로 앱 시작 시 HttpOnly refresh 쿠키로 다시 받는다 (shared/api/client restoreSession).
 */
let state: SessionState = { status: 'loading' };
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

export function getSession(): SessionState {
  return state;
}

export function getAccessToken(): string | null {
  return state.status === 'authenticated' ? state.accessToken : null;
}

export function setSession(data: TokenData) {
  set({ status: 'authenticated', accessToken: data.accessToken, user: data.user });
}

export function clearSession() {
  set({ status: 'anonymous' });
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

/** 로그인한 화면(RequireAuth 안쪽)에서만 사용 */
export function useCurrentUser(): UserProfile {
  const session = useSession();
  if (session.status !== 'authenticated') throw new Error('NOT_AUTHENTICATED');
  return session.user;
}
