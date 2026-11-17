import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
} from './validation';

describe('validateEmail', () => {
  it.each(['a@b.co', '  user@example.com  ', 'demo1@point.local'])('%s → 통과', (v) => {
    expect(validateEmail(v)).toBeNull();
  });

  it.each(['', '   ', 'no-at.com', 'a@b', 'a b@c.com'])('"%s" → 오류', (v) => {
    expect(validateEmail(v)).not.toBeNull();
  });
});

describe('validatePassword (서버 규칙과 동일)', () => {
  it.each(['pass1234', 'demo1234!', 'A1' + 'x'.repeat(62)])('%s → 통과', (v) => {
    expect(validatePassword(v)).toBeNull();
  });

  it.each([
    ['', '입력'],
    ['short1', '8~64자'],
    ['A1' + 'x'.repeat(63), '8~64자'],
    ['onlyletters', '영문과 숫자'],
    ['12345678', '영문과 숫자'],
    ['비밀번호1234abc', '영문과 숫자'],
    ['pass 1234', '공백'],
  ])('"%s" → %s 안내', (v, hint) => {
    expect(validatePassword(v)).toContain(hint);
  });
});

describe('validatePasswordConfirm', () => {
  it('같으면 통과, 다르면 오류', () => {
    expect(validatePasswordConfirm('pass1234', 'pass1234')).toBeNull();
    expect(validatePasswordConfirm('pass1234', 'pass12345')).toBe('비밀번호가 서로 달라요');
    expect(validatePasswordConfirm('pass1234', '')).not.toBeNull();
  });
});

describe('validateName', () => {
  it('공백만 있거나 30자를 넘으면 오류', () => {
    expect(validateName('홍길동')).toBeNull();
    expect(validateName('   ')).not.toBeNull();
    expect(validateName('가'.repeat(31))).not.toBeNull();
  });
});
