import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateContent, mockGenerateOverviewInsights } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGenerateOverviewInsights: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

vi.mock('../lib/insights.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/insights.js')>();

  return {
    ...actual,
    generateOverviewInsights: mockGenerateOverviewInsights,
  };
});

import app from '../app.js';
import prisma from '../prisma.js';

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `ai-${Date.now()}-${Math.random()}@example.com`,
      googleId: `dev-ai-${Date.now()}-${Math.random()}`,
      name: 'AI User',
    },
  });
}

async function loginTestUser() {
  const email = `ai-login-${Date.now()}-${Math.random()}@example.com`;

  const response = await request(app).post('/auth/dev-login').send({
    email,
    name: 'AI User',
  });

  return {
    accessToken: response.body.accessToken as string,
    user: response.body.user as { id: number },
  };
}

describe.sequential('AI API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.session.deleteMany();
    await prisma.monthlyCategorySummary.deleteMany();
    await prisma.monthlySummary.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.monthlyCategorySummary.deleteMany();
    await prisma.monthlySummary.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 when asking AI without auth', async () => {
    const response = await request(app).post('/ai/ask').send({
      prompt: 'hello',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when ask prompt is missing', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .post('/ai/ask')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Prompt is required' });
  });

  it('returns an AI answer for an authenticated ask request', async () => {
    const { accessToken } = await loginTestUser();
    mockGenerateContent.mockResolvedValue({ text: 'Budget more carefully.' });

    const response = await request(app)
      .post('/ai/ask')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        prompt: 'Give me a budgeting tip.',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ answer: 'Budget more carefully.' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when requesting overview insights without auth', async () => {
    const response = await request(app).post('/ai/overview-insights').send({
      year: 2026,
      month: 4,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 for invalid overview insights month', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .post('/ai/overview-insights')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        year: 2026,
        month: 13,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid year or month' });
  });

  it('returns cached past-month insights without regenerating them', async () => {
    const { accessToken, user } = await loginTestUser();

    await prisma.monthlySummary.create({
      data: {
        userId: user.id,
        year: 2026,
        month: 1,
        incomeTotal: 1000,
        spentTotal: 400,
        leftTotal: 600,
        aiInsights: JSON.stringify({
          summary: 'Cached summary',
          warning: 'Cached warning',
          tip: 'Cached tip',
        }),
        aiGeneratedAt: new Date('2026-02-01T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .post('/ai/overview-insights')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        year: 2026,
        month: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      insights: {
        summary: 'Cached summary',
        warning: 'Cached warning',
        tip: 'Cached tip',
      },
      cached: true,
    });
    expect(mockGenerateOverviewInsights).not.toHaveBeenCalled();
  });

  it('generates and stores insights for a past month without cache', async () => {
    const { accessToken, user } = await loginTestUser();
    mockGenerateOverviewInsights.mockResolvedValue({
      summary: 'Generated summary',
      warning: 'Generated warning',
      tip: 'Generated tip',
    });

    await prisma.transaction.createMany({
      data: [
        {
          title: 'Salary',
          amount: 1200,
          type: 'income',
          category: 'SALARY',
          date: new Date('2026-02-03T12:00:00.000Z'),
          userId: user.id,
        },
        {
          title: 'Groceries',
          amount: 300,
          type: 'expense',
          category: 'FOOD',
          date: new Date('2026-02-05T12:00:00.000Z'),
          userId: user.id,
        },
      ],
    });

    const response = await request(app)
      .post('/ai/overview-insights')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        year: 2026,
        month: 2,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      insights: {
        summary: 'Generated summary',
        warning: 'Generated warning',
        tip: 'Generated tip',
      },
      cached: false,
    });

    const snapshot = await prisma.monthlySummary.findUnique({
      where: {
        userId_year_month: {
          userId: user.id,
          year: 2026,
          month: 2,
        },
      },
    });

    expect(snapshot?.aiInsights).toBe(
      JSON.stringify({
        summary: 'Generated summary',
        warning: 'Generated warning',
        tip: 'Generated tip',
      }),
    );
    expect(snapshot?.aiGeneratedAt).not.toBeNull();
    expect(mockGenerateOverviewInsights).toHaveBeenCalledTimes(1);
  });
});
