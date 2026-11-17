import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Notice } from '@/shared/ui/Notice';
import { AUTH_FAILURE_MESSAGE, useSignup } from '../api/useAuth';
import {
  NAME_MAX,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
} from '../model/validation';
import { TextField } from './TextField';
import styles from './auth.module.css';

type Field = 'name' | 'email' | 'password' | 'confirm';

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const signup = useSignup();
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  /** 한 번 벗어난(blur) 칸이나 제출 후에만 오류를 보여준다 — 입력 도중 빨간 글씨 방지 */
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const errors: Record<Field, string | null> = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirm: validatePasswordConfirm(values.password, values.confirm),
  };
  const shown = (f: Field) => (touched[f] ? errors[f] : null);

  const bind = (f: Field) => ({
    name: f,
    value: values[f],
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [f]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [f]: true })),
    error: shown(f),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    setFailure(null);
    if (Object.values(errors).some(Boolean)) return;
    signup.mutate(
      { name: values.name.trim(), email: values.email.trim(), password: values.password },
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
        label="이름"
        autoComplete="name"
        maxLength={NAME_MAX}
        placeholder="홍길동"
        autoFocus
        {...bind('name')}
      />
      <TextField
        label="이메일"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="name@example.com"
        {...bind('email')}
      />
      <TextField
        label="비밀번호"
        type="password"
        autoComplete="new-password"
        hint="영문과 숫자를 함께, 8자 이상"
        {...bind('password')}
      />
      <TextField
        label="비밀번호 확인"
        type="password"
        autoComplete="new-password"
        {...bind('confirm')}
      />
      {failure && <Notice tone="critical">{failure}</Notice>}
      <Button type="submit" size="lg" block disabled={signup.isPending}>
        {signup.isPending ? '가입하는 중…' : '가입하고 시작하기'}
      </Button>
      <p className={styles.switch}>
        이미 계정이 있으신가요?
        <Link to="/login">로그인</Link>
      </p>
    </form>
  );
}
