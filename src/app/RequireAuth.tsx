import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SessionSplash } from '@/features/auth/components/AuthScreen';
import { restoreSession } from '@/shared/api/client';
import { useSession } from '@/shared/auth/session';

/** 첫 진입 시 refresh 쿠키로 로그인 상태를 복원한다 (새로고침해도 로그인 유지) */
function useRestoredSession() {
  const session = useSession();
  useEffect(() => {
    void restoreSession();
  }, []);
  return session;
}

/** 로그인해야 볼 수 있는 화면. 아니면 /login 으로 보내고, 로그인 후 원래 주소로 돌아온다 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useRestoredSession();
  const location = useLocation();
  if (session.status === 'loading') return <SessionSplash />;
  if (session.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

/** 로그인·회원가입 화면. 이미 로그인했으면 홈(또는 원래 가려던 곳)으로 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const session = useRestoredSession();
  const from = useRedirectTarget();
  if (session.status === 'loading') return <SessionSplash />;
  if (session.status === 'authenticated') return <Navigate to={from} replace />;
  return children;
}

export function useRedirectTarget(): string {
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  // 외부 주소로의 오픈 리다이렉트 방지: 앱 내부 경로만 허용
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}
