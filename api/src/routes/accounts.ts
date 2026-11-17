import { Router } from 'express';
import { AccountType, type Account } from '@prisma/client';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId } from '../lib/ids.js';
import { accountLinks, transactionLinks, withLinks } from '../lib/links.js';
import { parseAccountFilters, parseTransactionFilters } from '../lib/list-filters.js';
import { INVALID_PAGINATION_MESSAGE, listResponse, parsePagination } from '../lib/pagination.js';

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

async function presentAccounts(accounts: Account[]) {
  const accountsWithBalances = await withBalances(accounts);
  return accountsWithBalances.map((account) => withLinks(account, accountLinks(account)));
}

async function presentAccount(account: Account) {
  const [result] = await presentAccounts([account]);
  return result;
}

async function findOwnedAccount(id: number, userId: number) {
  return prisma.account.findFirst({ where: { id, userId } });
}

router.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({ error: INVALID_PAGINATION_MESSAGE });
  }

  const filters = parseAccountFilters(req.query);

  if ('error' in filters) {
    return res.status(400).json({ error: filters.error });
  }

  const where = { ...filters.where, userId };

  const [accounts, total] = await prisma.$transaction([
    prisma.account.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.account.count({ where }),
  ]);

  return res.json(listResponse(req, await presentAccounts(accounts), total, pagination));
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

  return res.status(201).json(await presentAccount(account));
});

router.get('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  const account = await findOwnedAccount(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  return res.json(await presentAccount(account));
});

router.patch('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
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

  return res.json(await presentAccount(updated));
});

router.delete('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
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
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({ error: INVALID_PAGINATION_MESSAGE });
  }

  const filters = parseTransactionFilters(req.query);

  if ('error' in filters) {
    return res.status(400).json({ error: filters.error });
  }

  const account = await findOwnedAccount(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const where = { ...filters.where, accountId: id, userId };

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  const items = transactions.map((transaction) => withLinks(transaction, transactionLinks(transaction)));

  return res.json(listResponse(req, items, total, pagination));
});

export default router;
