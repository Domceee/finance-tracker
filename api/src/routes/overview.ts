import { Router } from 'express';
import { getOverviewForMonth, parseYearMonth } from '../lib/overview.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const parsed = parseYearMonth(
    typeof req.query.year === 'string' ? req.query.year : undefined,
    typeof req.query.month === 'string' ? req.query.month : undefined,
  );

  if (!parsed) {
    return res.status(400).json({ error: 'Invalid year or month' });
  }

  const { year, month } = parsed;
  const overview = await getOverviewForMonth(userId, year, month);

  return res.json(overview);
});

export default router;
