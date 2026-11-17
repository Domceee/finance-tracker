import { Router } from 'express';
import { createHash } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getOverviewForMonth, parseYearMonth, type OverviewData } from '../lib/overview.js';
import {
  generateOverviewInsights,
  parseOverviewInsights,
  stringifyOverviewInsights,
  type OverviewInsights,
} from '../lib/insights.js';
import { GEMINI_MODEL } from '../lib/ai/config.js';

const router = Router();
const apiKey = process.env.GEMINI_API_KEY;
const model = GEMINI_MODEL;

function hashOverviewData(overview: OverviewData): string {
  const stable = JSON.stringify({
    income: overview.incomeTotal,
    spent: overview.spentTotal,
    categories: [...overview.categoryBreakdown]
      .sort((a, b) => a.category.localeCompare(b.category)),
  });
  return createHash('sha256').update(stable).digest('hex');
}

router.post('/ask', requireAuth, async (req, res) => {
  const { prompt } = req.body;

  if (!apiKey) {
    return res.status(503).json({ error: 'AI service is not configured' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return res.json({
      answer: response.text ?? '',
    });
  } catch (error) {
    console.error('Gemini request failed:', error);
    return res.status(502).json({ error: 'Failed to get AI response' });
  }
});

router.post('/overview-insights', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const parsed = parseYearMonth(
    req.body?.year !== undefined ? String(req.body.year) : undefined,
    req.body?.month !== undefined ? String(req.body.month) : undefined,
  );

  if (!parsed) {
    return res.status(400).json({ error: 'Invalid year or month' });
  }

  const { year, month } = parsed;

  const existingSummary = await prisma.monthlySummary.findUnique({
    where: { userId_year_month: { userId, year, month } },
    select: { aiInsights: true, aiGeneratedAt: true, aiDataHash: true },
  });

  const overview = await getOverviewForMonth(userId, year, month);
  const dataHash = hashOverviewData(overview);
  const cachedInsights = parseOverviewInsights(existingSummary?.aiInsights ?? null);

  if (cachedInsights && existingSummary?.aiDataHash === dataHash) {
    return res.json({
      insights: cachedInsights,
      cached: true,
      generatedAt: existingSummary?.aiGeneratedAt,
    });
  }

  if (!apiKey) {
    return res.status(503).json({ error: 'AI service is not configured' });
  }

  let insights: OverviewInsights;

  try {
    insights = await generateOverviewInsights(apiKey, overview);
  } catch (error) {
    console.error('Overview insights request failed:', error);
    return res.status(502).json({ error: 'Failed to generate overview insights' });
  }

  const aiData = {
    aiInsights: stringifyOverviewInsights(insights),
    aiGeneratedAt: new Date(),
    aiDataHash: dataHash,
  };

  const { count } = await prisma.monthlySummary.updateMany({
    where: { userId, year, month },
    data: aiData,
  });

  if (count === 0) {
    await prisma.monthlySummary.create({
      data: {
        userId,
        year,
        month,
        incomeTotal: overview.incomeTotal,
        spentTotal: overview.spentTotal,
        leftTotal: overview.incomeTotal - overview.spentTotal,
        ...aiData,
      },
    });
  }

  return res.json({
    insights,
    cached: false,
    generatedAt: new Date().toISOString(),
  });
});

export default router;
