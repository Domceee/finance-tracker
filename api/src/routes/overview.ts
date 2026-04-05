import { Router } from 'express';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function parseYearMonth(
  yearParam: string | undefined,
  monthParam: string | undefined,
) {
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getUTCFullYear();
  const month = monthParam ? Number(monthParam) : now.getUTCMonth() + 1;

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

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
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: { date: 'desc' },
  });

  const incomeTotal = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const spentTotal = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const leftTotal = incomeTotal - spentTotal;

  const categoryTotals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }

    categoryTotals.set(
      transaction.category,
      (categoryTotals.get(transaction.category) ?? 0) + transaction.amount,
    );
  }

  const categoryBreakdown = [...categoryTotals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: spentTotal === 0 ? 0 : Number(((amount / spentTotal) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.amount - a.amount);

  return res.json({
    year,
    month,
    incomeTotal,
    spentTotal,
    leftTotal,
    categoryBreakdown,
  });
});

export default router;
