import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Notice } from '@/shared/ui/Notice';
import { AUTH_FAILURE_MESSAGE, useLogin } from '../api/useAuth';
import { validateEmail } from '../model/validation';
import { TextField } from './TextField';
import styles from './auth.module.css';

/** 로컬 시드 계정 (db/local/V202611170100__seed_local_credentials.sql) — 개발 서버에서만 안내 */
const DEMO = { email: 'demo1@point.local', password: 'demo1234!' };

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const emailError = submitted ? validateEmail(email) : null;
  const passwordError = submitted && !password ? '비밀번호를 입력해 주세요' : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailure(null);
    if (validateEmail(email) || !password) return;
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (result) =>
          result.ok ? onSuccess() : setFailure(AUTH_FAILURE_MESSAGE[result.reason]),
        onError: () => setFailure(AUTH_FAILURE_MESSAGE.UNAVAILABLE),
      },
    );
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label="이메일"
        type="email"
        name="email"
        autoComplete="username"
        inputMode="email"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
        autoFocus
      />
      <TextField
        label="비밀번호"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={passwordError}
      />
      {failure && <Notice tone="critical">{failure}</Notice>}
      <Button type="submit" size="lg" block disabled={login.isPending}>
        {login.isPending ? '로그인 중…' : '로그인'}
      </Button>
      <p className={styles.switch}>
        아직 회원이 아니신가요?
        <Link to="/signup">회원가입</Link>
      </p>
      {import.meta.env.DEV && (
        <div className={styles.demo}>
          <span>
            데모 계정 <code>demo1~5@point.local</code> / <code>{DEMO.password}</code>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
            }}
          >
            채우기
          </Button>
        </div>
      )}
    </form>
  );
}
