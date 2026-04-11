import { Router } from 'express';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const VALID_CATEGORIES = new Set([
  'FOOD', 'SHOPPING', 'RENT', 'TRANSPORT', 'SALARY',
  'ENTERTAINMENT', 'BAR', 'EATOUT', 'OTHER',
]);

function parseCategories(raw: string): string[] {
  return raw.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

router.get('/', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { start, end } = getCurrentMonthRange();

  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.transaction.findMany({
      where: { userId, type: 'expense', date: { gte: start, lte: end } },
      select: { category: true, amount: true },
    }),
  ]);

  const result = budgets.map((budget) => {
    const categories = parseCategories(budget.categories);
    const spent = transactions
      .filter((t) => categories.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      id: budget.id,
      name: budget.name,
      limitAmount: budget.limitAmount,
      categories,
      spent: Math.round(spent * 100) / 100,
      createdAt: budget.createdAt,
    };
  });

  return res.json(result);
});

router.post('/', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { name, limitAmount, categories } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (typeof limitAmount !== 'number' || limitAmount <= 0) {
    return res.status(400).json({ error: 'Limit must be a positive number' });
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'At least one category is required' });
  }

  const invalid = categories.find((c) => typeof c !== 'string' || !VALID_CATEGORIES.has(c));
  if (invalid) {
    return res.status(400).json({ error: `Invalid category: ${invalid}` });
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      name: name.trim(),
      limitAmount,
      categories: categories.join(','),
    },
  });

  return res.status(201).json({
    id: budget.id,
    name: budget.name,
    limitAmount: budget.limitAmount,
    categories,
    spent: 0,
    createdAt: budget.createdAt,
  });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid budget id' });
  }

  const existing = await prisma.budget.findUnique({ where: { id } });

  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ error: 'Budget not found' });
  }

  const { name, limitAmount, categories } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Name must be a non-empty string' });
  }

  if (limitAmount !== undefined && (typeof limitAmount !== 'number' || limitAmount <= 0)) {
    return res.status(400).json({ error: 'Limit must be a positive number' });
  }

  if (categories !== undefined) {
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'At least one category is required' });
    }
    const invalid = categories.find((c) => typeof c !== 'string' || !VALID_CATEGORIES.has(c));
    if (invalid) {
      return res.status(400).json({ error: `Invalid category: ${invalid}` });
    }
  }

  const updated = await prisma.budget.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(limitAmount !== undefined && { limitAmount }),
      ...(categories !== undefined && { categories: categories.join(',') }),
    },
  });

  const { start, end } = getCurrentMonthRange();
  const parsedCategories = parseCategories(updated.categories);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'expense',
      category: { in: parsedCategories as any },
      date: { gte: start, lte: end },
    },
    select: { amount: true },
  });

  const spent = transactions.reduce((sum, t) => sum + t.amount, 0);

  return res.json({
    id: updated.id,
    name: updated.name,
    limitAmount: updated.limitAmount,
    categories: parsedCategories,
    spent: Math.round(spent * 100) / 100,
    createdAt: updated.createdAt,
  });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid budget id' });
  }

  const existing = await prisma.budget.findUnique({ where: { id } });

  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ error: 'Budget not found' });
  }

  await prisma.budget.delete({ where: { id } });

  return res.status(204).send();
});

export default router;
