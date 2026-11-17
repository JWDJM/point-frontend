const USER = { id: 7, email: 'a@b.co', name: '테스트', createdAt: '2026-11-17T00:00:00Z' };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 요청 URL·Authorization 을 기록하고, 정해진 순서대로 응답하는 가짜 fetch */
function fakeFetch(responses: Response[]) {
  const calls: { path: string; auth: string | null }[] = [];
  const fn = vi.fn(async (input: Request) => {
    calls.push({ path: new URL(input.url).pathname, auth: input.headers.get('Authorization') });
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    return next;
  });
  return { fn, calls };
}

// createClient 가 생성 시점의 fetch 를 잡으므로, 테스트마다 fetch 를 바꾼 뒤 모듈을 새로 불러온다
async function loadClient(fetchFn: unknown) {
  vi.stubGlobal('fetch', fetchFn);
  vi.resetModules();
  const session = await import('@/shared/auth/session');
  const client = await import('./client');
  return { ...client, session };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authMiddleware', () => {
  it('access token 을 Bearer 헤더로 붙인다', async () => {
    const { fn, calls } = fakeFetch([json(200, { code: 'OK', data: { balance: 10 } })]);
    const { apiClient, session } = await loadClient(fn);
    session.setSession({ accessToken: 'tok-1', tokenType: 'Bearer', expiresIn: 900, user: USER });

    const { data } = await apiClient.GET('/api/points/balance');

    expect(data?.data?.balance).toBe(10);
    expect(calls).toEqual([{ path: '/api/points/balance', auth: 'Bearer tok-1' }]);
  });

  it('401 이면 refresh 후 새 토큰으로 한 번 재시도한다', async () => {
    const { fn, calls } = fakeFetch([
      json(401, { code: 'UNAUTHORIZED' }),
      json(200, {
        code: 'OK',
        data: { accessToken: 'tok-2', tokenType: 'Bearer', expiresIn: 900, user: USER },
      }),
      json(200, { code: 'OK', data: { balance: 20 } }),
    ]);
    const { apiClient, session } = await loadClient(fn);
    session.setSession({ accessToken: 'expired', tokenType: 'Bearer', expiresIn: 900, user: USER });

    const { data } = await apiClient.GET('/api/points/balance');

    expect(data?.data?.balance).toBe(20);
    expect(calls).toEqual([
      { path: '/api/points/balance', auth: 'Bearer expired' },
      { path: '/api/auth/refresh', auth: null },
      { path: '/api/points/balance', auth: 'Bearer tok-2' },
    ]);
    expect(session.getAccessToken()).toBe('tok-2');
  });

  it('refresh 도 실패하면 세션을 지운다 (→ 로그인 화면)', async () => {
    const { fn } = fakeFetch([
      json(401, { code: 'UNAUTHORIZED' }),
      json(401, { code: 'INVALID_REFRESH_TOKEN' }),
    ]);
    const { apiClient, session } = await loadClient(fn);
    session.setSession({ accessToken: 'expired', tokenType: 'Bearer', expiresIn: 900, user: USER });

    const { response } = await apiClient.GET('/api/points/balance');

    expect(response.status).toBe(401);
    expect(session.getSession()).toEqual({ status: 'anonymous' });
  });

  it('동시에 401 이 여러 번 와도 refresh 요청은 한 번만 보낸다', async () => {
    const { fn, calls } = fakeFetch([
      json(401, {}),
      json(401, {}),
      json(200, {
        code: 'OK',
        data: { accessToken: 'tok-3', tokenType: 'Bearer', expiresIn: 900, user: USER },
      }),
      json(200, { code: 'OK', data: { balance: 1 } }),
      json(200, { code: 'OK', data: [] }),
    ]);
    const { apiClient, session } = await loadClient(fn);
    session.setSession({ accessToken: 'expired', tokenType: 'Bearer', expiresIn: 900, user: USER });

    await Promise.all([apiClient.GET('/api/points/balance'), apiClient.GET('/api/points/history')]);

    expect(calls.filter((c) => c.path === '/api/auth/refresh')).toHaveLength(1);
  });
});
