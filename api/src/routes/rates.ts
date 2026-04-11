import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedRates: Record<string, number> | null = null;
let cacheExpiresAt = 0;

router.get('/', requireAuth, async (_req, res) => {
  if (cachedRates && Date.now() < cacheExpiresAt) {
    return res.json({ rates: cachedRates, cachedAt: new Date(cacheExpiresAt - CACHE_TTL_MS) });
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    console.warn('[rates] EXCHANGE_RATE_API_KEY is not set — returning empty rates');
    return res.status(503).json({ error: 'Exchange rate service is not configured' });
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/EUR`,
    );

    if (!response.ok) {
      throw new Error(`ExchangeRate-API responded with ${response.status}`);
    }

    const data = await response.json() as { conversion_rates: Record<string, number> };
    cachedRates = data.conversion_rates;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    return res.json({ rates: cachedRates, cachedAt: new Date() });
  } catch (err) {
    console.error('[rates] Failed to fetch exchange rates:', err);
    return res.status(502).json({ error: 'Failed to fetch exchange rates' });
  }
});

export default router;
