export {}; // 모듈로 만들어 다른 테스트 파일과 이름 충돌 방지

const USER = { id: 7, email: 'a@b.co', name: '테스트', createdAt: '2026-11-17T00:00:00Z' };
const TOKEN = { accessToken: 'tok', tokenType: 'Bearer' as const, expiresIn: 900, user: USER };

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Route = (req: Request) => Response | Promise<Response>;

/** 경로별로 응답을 정하는 가짜 fetch. 'down' 이면 네트워크 오류 */
function fakeServer(routes: Record<string, Route | 'down'>) {
  const hits: string[] = [];
  const fn = vi.fn(async (req: Request) => {
    const path = new URL(req.url).pathname;
    hits.push(path);
    const route = routes[path];
    if (route === 'down' || !route) throw new TypeError('Failed to fetch');
    return route(req);
  });
  return { fn, hits, routes };
}

async function load(fetchFn: unknown) {
  vi.stubGlobal('fetch', fetchFn);
  vi.resetModules();
  const session = await import('@/shared/auth/session');
  const status = await import('./systemStatus');
  const client = await import('./client');
  return { session, status, client };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('점검 화면 판단', () => {
  it('API 가 5xx 이고 헬스체크도 실패하면 down', async () => {
    const server = fakeServer({
      '/api/points/balance': () => json(502),
      '/api/health': () => json(503, { code: 'SERVICE_UNAVAILABLE' }),
    });
    const { session, status, client } = await load(server.fn);
    session.setSession(TOKEN);

    await client.apiClient.GET('/api/points/balance');

    await vi.waitFor(() => expect(status.getSystemStatus().state).toBe('down'));
  });

  it('API 만 500 이고 헬스체크가 정상이면 up 유지 (일시 오류로 화면 전체를 막지 않는다)', async () => {
    const server = fakeServer({
      '/api/points/balance': () => json(500),
      '/api/health': () => json(200, { code: 'OK', data: { status: 'UP' } }),
    });
    const { session, status, client } = await load(server.fn);
    session.setSession(TOKEN);

    await client.apiClient.GET('/api/points/balance');

    await vi.waitFor(() => expect(server.hits).toContain('/api/health'));
    expect(status.getSystemStatus().state).toBe('up');
  });

  it('네트워크 오류(서버에 닿지 않음)도 down', async () => {
    const server = fakeServer({ '/api/points/balance': 'down', '/api/health': 'down' });
    const { session, status, client } = await load(server.fn);
    session.setSession(TOKEN);

    await expect(client.apiClient.GET('/api/points/balance')).rejects.toThrow();

    await vi.waitFor(() => expect(status.getSystemStatus().state).toBe('down'));
  });

  it('이벤트 API 장애는 화면 전체를 막지 않는다 (카드별 안내)', async () => {
    const server = fakeServer({
      '/api/events/attendance': () => json(503, { code: 'EVENT_MAINTENANCE' }),
    });
    const { session, status, client } = await load(server.fn);
    session.setSession(TOKEN);

    await client.apiClient.POST('/api/events/attendance');

    expect(server.hits).not.toContain('/api/health');
    expect(status.getSystemStatus().state).toBe('up');
  });

  it('down 이면 주기적으로 다시 확인하고, 회복되면 up + 회복 콜백', async () => {
    vi.useFakeTimers();
    let healthy = false;
    const server = fakeServer({
      '/api/health': () => (healthy ? json(200, { code: 'OK' }) : json(503)),
    });
    const { status } = await load(server.fn);
    const recovered = vi.fn();
    status.onSystemRecover(recovered);

    await status.checkHealth();
    expect(status.getSystemStatus().state).toBe('down');

    healthy = true;
    await vi.advanceTimersByTimeAsync(status.RECHECK_INTERVAL_MS);

    expect(status.getSystemStatus().state).toBe('up');
    expect(recovered).toHaveBeenCalledTimes(1);
  });
});

describe('서버 장애 중 로그인 복원', () => {
  it('재발급이 5xx 이고 서버가 down 이면 로그아웃시키지 않고 회복 후 다시 복원한다', async () => {
    let up = false;
    const server = fakeServer({
      '/api/auth/refresh': () => (up ? json(200, { code: 'OK', data: TOKEN }) : json(502)),
      '/api/health': () => (up ? json(200, { code: 'OK' }) : json(502)),
    });
    const { session, status, client } = await load(server.fn);

    expect(await client.restoreSession()).toBe(false);
    expect(session.getSession().status).toBe('loading'); // 로그인 화면으로 보내지 않음
    expect(status.getSystemStatus().state).toBe('down');

    up = true;
    await status.checkHealth();
    expect(await client.restoreSession()).toBe(true); // 실패 결과를 캐시하지 않고 다시 시도
    expect(session.getSession().status).toBe('authenticated');
  });

  it('서버는 정상인데 재발급만 5xx 면 로그인 화면으로 (무한 로딩 방지)', async () => {
    const server = fakeServer({
      '/api/auth/refresh': () => json(500),
      '/api/health': () => json(200, { code: 'OK' }),
    });
    const { session, client } = await load(server.fn);

    expect(await client.restoreSession()).toBe(false);
    expect(session.getSession().status).toBe('anonymous');
  });
});
