import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';

const WEB_ORIGIN = 'https://finance-tracker-web.vercel.app';

describe.sequential('App configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows cross-origin requests from WEB_ORIGIN', async () => {
    vi.stubEnv('WEB_ORIGIN', WEB_ORIGIN);

    const response = await request(app).get('/categories').set('Origin', WEB_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });

  it('allows any origin listed in a comma-separated WEB_ORIGIN', async () => {
    vi.stubEnv('WEB_ORIGIN', `${WEB_ORIGIN}, http://localhost:8081`);

    const response = await request(app).get('/categories').set('Origin', 'http://localhost:8081');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
  });

  it('does not allow cross-origin requests from other origins', async () => {
    vi.stubEnv('WEB_ORIGIN', WEB_ORIGIN);

    const response = await request(app).get('/categories').set('Origin', 'https://evil.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not allow any cross-origin requests when WEB_ORIGIN is not set', async () => {
    vi.stubEnv('WEB_ORIGIN', '');

    const response = await request(app).get('/categories').set('Origin', WEB_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflight requests for authenticated writes from WEB_ORIGIN', async () => {
    vi.stubEnv('WEB_ORIGIN', WEB_ORIGIN);

    const response = await request(app)
      .options('/accounts/1')
      .set('Origin', WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
    expect(response.headers['access-control-allow-headers']).toContain('authorization');
  });

  it('trusts the first proxy so rate limiting sees the real client IP', () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});
