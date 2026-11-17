import { useNavigate } from 'react-router-dom';
import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { SignupForm } from '@/features/auth/components/SignupForm';

export function SignupPage() {
  const navigate = useNavigate();
  return (
    <AuthScreen title="회원가입" subtitle="이메일로 1분 만에 가입할 수 있어요">
      <SignupForm onSuccess={() => navigate('/', { replace: true })} />
    </AuthScreen>
  );
}
