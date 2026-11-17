import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { restoreSession } from '@/shared/api/client';
import { onSystemRecover, useSystemStatus } from '@/shared/api/systemStatus';
import { getSession, useSession } from '@/shared/auth/session';

/**
 * 서비스 장애 시 모든 화면을 점검 화면으로 바꾼다 (로그인·회원가입 포함).
 * 예외: 이미 로그인한 상태의 관리자 콘솔 — 장애 상황을 구성도로 보는 화면이므로 그대로 둔다.
 * 회복되면 데이터를 다시 불러오고, 장애 때문에 못 한 로그인 복원을 다시 시도한다.
 */
export function SystemGate() {
  const system = useSystemStatus();
  const session = useSession();
  const isAdmin = useMatch('/admin/*') != null;
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onSystemRecover(() => {
        void queryClient.invalidateQueries();
        if (getSession().status === 'loading') void restoreSession();
      }),
    [queryClient],
  );

  if (system.state === 'down' && !(isAdmin && session.status === 'authenticated')) {
    return <MaintenancePage status={system} />;
  }
  return <Outlet />;
}
