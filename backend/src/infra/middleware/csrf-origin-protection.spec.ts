import { csrfOriginProtection } from './csrf-origin-protection';

describe('CSRF origin protection', () => {
  const env = process.env.NODE_ENV;
  afterAll(() => { process.env.NODE_ENV = env; });

  function run(method: string, headers: Record<string, string> = {}) {
    const next = jest.fn();
    const response: any = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const req: any = { method, headers, get: (name: string) => headers[name.toLowerCase()] };
    csrfOriginProtection(['https://www.rentalflow.club', 'http://localhost:5173'])(req, response, next);
    return { next, response };
  }

  beforeEach(() => { process.env.NODE_ENV = 'production'; });

  it('allows safe requests without Origin', () => {
    expect(run('GET').next).toHaveBeenCalled();
  });

  it('allows state changes from exact trusted Origin', () => {
    expect(run('POST', { origin: 'https://www.rentalflow.club', 'sec-fetch-site': 'same-site' }).next).toHaveBeenCalled();
  });

  it('rejects a forged subdomain', () => {
    expect(run('PATCH', { origin: 'https://www.rentalflow.club.evil.test' }).response.status).toHaveBeenCalledWith(403);
  });

  it('rejects cross-site requests even if their Origin claims to be trusted', () => {
    expect(run('DELETE', { origin: 'https://www.rentalflow.club', 'sec-fetch-site': 'cross-site' }).response.status).toHaveBeenCalledWith(403);
  });

  it('rejects missing Origin on production mutations', () => {
    expect(run('POST').response.status).toHaveBeenCalledWith(403);
  });

  it('rejects Origin with a path or malformed value', () => {
    expect(run('POST', { origin: 'https://www.rentalflow.club/evil' }).response.status).toHaveBeenCalledWith(403);
    expect(run('POST', { origin: 'null' }).response.status).toHaveBeenCalledWith(403);
  });

  it('rejects cookie-authenticated mutations without Origin in development', () => {
    process.env.NODE_ENV = 'development';
    expect(run('PUT', { cookie: 'access_token=test' }).response.status).toHaveBeenCalledWith(403);
  });

  it('permits origin-less development test requests only without cookies', () => {
    process.env.NODE_ENV = 'development';
    expect(run('POST').next).toHaveBeenCalled();
  });
});
