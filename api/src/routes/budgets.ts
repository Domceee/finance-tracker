import { Router } from 'express';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { buildBudgetResponse, withSpent } from '../lib/budgets.js';
import { parseId } from '../lib/ids.js';
import { parseBudgetFilters } from '../lib/list-filters.js';
import { INVALID_PAGINATION_MESSAGE, listResponse, parsePagination } from '../lib/pagination.js';

const router = Router();

const VALID_CATEGORIES = new Set([
  'FOOD', 'SHOPPING', 'RENT', 'TRANSPORT', 'SALARY',
  'ENTERTAINMENT', 'BAR', 'EATOUT', 'OTHER',
]);

router.get('/', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({ error: INVALID_PAGINATION_MESSAGE });
  }

  const filters = parseBudgetFilters(req.query);

  if ('error' in filters) {
    return res.status(400).json({ error: filters.error });
  }

  const where = { ...filters.where, userId };

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.budget.count({ where }),
  ]);

  return res.json(listResponse(req, await withSpent(userId, budgets), total, pagination));
});

router.get('/:id', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid budget id' });
  }

  const budget = await prisma.budget.findUnique({ where: { id } });

  if (!budget || budget.userId !== userId) {
    return res.status(404).json({ error: 'Budget not found' });
  }

  return res.json(await buildBudgetResponse(budget));
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
  const id = parseId(req.params.id);

  if (id === null) {
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

  return res.json(await buildBudgetResponse(updated));
});

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
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
