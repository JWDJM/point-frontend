/**
 * 가입·로그인 입력 검증. 서버(AuthController.SignupRequest) 규칙과 같다 — 서버가 최종 판단하고, 여기서는 빠른 안내만.
 * 오류가 없으면 null.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 영문·숫자 포함 8~64자, 공백 제외 ASCII (bcrypt 72바이트 제한 안쪽) */
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7E]{8,64}$/;

export const NAME_MAX = 30;

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return '이메일을 입력해 주세요';
  if (v.length > 255 || !EMAIL.test(v)) return '이메일 형식이 올바르지 않아요';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return '비밀번호를 입력해 주세요';
  if (/\s/.test(password)) return '비밀번호에 공백은 쓸 수 없어요';
  if (password.length < 8 || password.length > 64) return '8~64자로 입력해 주세요';
  if (!PASSWORD.test(password)) return '영문과 숫자를 함께 넣어 주세요 (한글 제외)';
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return '비밀번호를 한 번 더 입력해 주세요';
  return password === confirm ? null : '비밀번호가 서로 달라요';
}

export function validateName(name: string): string | null {
  const v = name.trim();
  if (!v) return '이름을 입력해 주세요';
  if (v.length > NAME_MAX) return `${NAME_MAX}자 이하로 입력해 주세요`;
  return null;
}
