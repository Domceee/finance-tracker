import { Router } from 'express';
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

function isCurrentMonth(year: number, month: number) {
  const now = new Date();
  return year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
}

router.post('/ask', async (req, res) => {
  const { prompt } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
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
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
});

router.post('/overview-insights', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const parsed = parseYearMonth(
    req.body?.year !== undefined ? String(req.body.year) : undefined,
    req.body?.month !== undefined ? String(req.body.month) : undefined,
  );

  if (!parsed) {
    return res.status(400).json({ error: 'Invalid year or month '});
  }

  const { year, month } = parsed;
  const currentMonth = isCurrentMonth(year, month);

  try {
    const existingSummary = await prisma.monthlySummary.findUnique({
      where: {
        userId_year_month: {
          userId,
          year,
          month,
        },
      },
      select: {
        aiInsights: true,
        aiGeneratedAt: true,
      },
    });

    const cachedInsights = parseOverviewInsights(existingSummary?.aiInsights ?? null);

    if (!currentMonth && cachedInsights) {
      return res.json({
        insights: cachedInsights,
        cached: true,
        generatedAt: existingSummary?.aiGeneratedAt,
      });
    }

    const overview = await getOverviewForMonth(userId, year, month);
    const insights = await generateOverviewInsights(apiKey, overview);

    if (!currentMonth) {
      await prisma.monthlySummary.update({
        where: {
          userId_year_month: {
            userId,
            year,
            month,
          },
        },
        data: {
          aiInsights: stringifyOverviewInsights(insights),
          aiGeneratedAt: new Date(),
        },
      });
    }

    return res.json({
      insights,
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Overview insights request failed:', error);

    if (error instanceof Error && error.message === 'Missing GEMINI_API_KEY') {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    return res.status(500).json({ error: 'Failed to generate overview insights' });
  }
});

export default router;
