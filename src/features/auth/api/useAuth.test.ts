import { toAuthResult } from './useAuth';
import type { TokenData } from '@/shared/auth/session';

const TOKEN: TokenData = {
  accessToken: 'jwt',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: 1, email: 'a@b.co', name: '테스트', createdAt: '2026-11-17T00:00:00Z' },
};

describe('toAuthResult', () => {
  it('200 로그인 / 201 가입 → 성공', () => {
    expect(toAuthResult(200, TOKEN)).toEqual({ ok: true });
    expect(toAuthResult(201, TOKEN)).toEqual({ ok: true });
  });

  it.each([
    [401, 'INVALID_CREDENTIALS'],
    [409, 'EMAIL_ALREADY_EXISTS'],
    [400, 'INVALID_REQUEST'],
    [500, 'UNAVAILABLE'],
    [502, 'UNAVAILABLE'],
  ])('%i → %s', (status, reason) => {
    expect(toAuthResult(status)).toEqual({ ok: false, reason });
  });

  it('200 이어도 본문이 없으면 실패로 본다', () => {
    expect(toAuthResult(200)).toEqual({ ok: false, reason: 'UNAVAILABLE' });
  });
});
