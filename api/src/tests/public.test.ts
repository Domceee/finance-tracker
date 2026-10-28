import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';

describe.sequential('Public (guest) API', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET / is reachable without auth', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
  });

  it('GET /categories lists transaction categories without auth', async () => {
    const response = await request(app).get('/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      'FOOD',
      'SHOPPING',
      'RENT',
      'TRANSPORT',
      'SALARY',
      'ENTERTAINMENT',
      'BAR',
      'EATOUT',
      'OTHER',
    ]);
  });

  it('GET /rates is reachable without auth', async () => {
    vi.stubEnv('EXCHANGE_RATE_API_KEY', '');

    const response = await request(app).get('/rates');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Exchange rate service is not configured' });
  });
});
