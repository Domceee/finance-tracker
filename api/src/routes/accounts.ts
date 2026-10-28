import { Router } from 'express';
import { AccountType, type Account } from '@prisma/client';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const accountTypes = new Set<string>(Object.values(AccountType));

router.use(requireAuth);

function isValidName(name: unknown): name is string {
  return typeof name === 'string' && name.trim().length > 0;
}

async function getBalances(accountIds: number[]) {
  const sums = await prisma.transaction.groupBy({
    by: ['accountId', 'type'],
    where: { accountId: { in: accountIds } },
    _sum: { amount: true },
  });

  const balances = new Map<number, number>();

  for (const sum of sums) {
    const amount = sum._sum.amount ?? 0;
    const signedAmount = sum.type === 'income' ? amount : sum.type === 'expense' ? -amount : 0;
    balances.set(sum.accountId, (balances.get(sum.accountId) ?? 0) + signedAmount);
  }

  return balances;
}

async function withBalances(accounts: Account[]) {
  const balances = await getBalances(accounts.map((account) => account.id));

  return accounts.map((account) => ({
    ...account,
    balance: Math.round((balances.get(account.id) ?? 0) * 100) / 100,
  }));
}

async function findOwnedAccount(id: number, userId: number) {
  return prisma.account.findFirst({ where: { id, userId } });
}

router.get('/', async (req, res) => {
  const userId = req.user!.userId;

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return res.json(await withBalances(accounts));
});

router.post('/', async (req, res) => {
  const userId = req.user!.userId;
  const { name, type } = req.body;

  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (type !== undefined && !accountTypes.has(type)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  const account = await prisma.account.create({
    data: {
      userId,
      name: name.trim(),
      ...(type !== undefined && { type }),
    },
  });

  const [result] = await withBalances([account]);
  return res.status(201).json(result);
});

router.get('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  const account = await findOwnedAccount(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const [result] = await withBalances([account]);
  return res.json(result);
});

router.patch('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  const existing = await findOwnedAccount(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const { name, type } = req.body;

  if (name !== undefined && !isValidName(name)) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (type !== undefined && !accountTypes.has(type)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(type !== undefined && { type }),
    },
  });

  const [result] = await withBalances([updated]);
  return res.json(result);
});

router.delete('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  const existing = await findOwnedAccount(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Account not found' });
  }

  await prisma.account.delete({ where: { id } });

  return res.status(204).send();
});

router.get('/:id/transactions', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  const account = await findOwnedAccount(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const transactions = await prisma.transaction.findMany({
    where: { accountId: id, userId },
    orderBy: { date: 'desc' },
  });

  return res.json(transactions);
});

export default router;
