import { useNavigate } from 'react-router-dom';
import { useRedirectTarget } from '@/app/RequireAuth';
import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { LoginForm } from '@/features/auth/components/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const from = useRedirectTarget();
  return (
    <AuthScreen title="로그인" subtitle="출석하고, 퀴즈 풀고, 포인트로 결제하세요">
      <LoginForm onSuccess={() => navigate(from, { replace: true })} />
    </AuthScreen>
  );
}
