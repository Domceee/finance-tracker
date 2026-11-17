import { Router } from 'express';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { withBalances } from '../lib/accounts.js';
import { withSpent } from '../lib/budgets.js';
import { accountLinks, link, transactionLinks, withLinks } from '../lib/links.js';
import { getOverviewForMonth } from '../lib/overview.js';

const router = Router();
const RECENT_TRANSACTIONS = 5;

router.use(requireAuth);

router.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const [user, accounts, recentTransactions, budgets, currentMonth] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, currency: true, role: true },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: RECENT_TRANSACTIONS,
    }),
    prisma.budget.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
    getOverviewForMonth(userId, year, month),
  ]);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const accountsWithBalances = await withBalances(accounts);
  const totalBalance = accountsWithBalances.reduce((sum, account) => sum + account.balance, 0);

  return res.json({
    user,
    totalBalance: Math.round(totalBalance * 100) / 100,
    accounts: accountsWithBalances.map((account) => withLinks(account, accountLinks(account))),
    currentMonth,
    recentTransactions: recentTransactions.map((transaction) => withLinks(transaction, transactionLinks(transaction))),
    budgets: await withSpent(userId, budgets),
    _links: {
      self: link('/dashboard'),
      accounts: link('/accounts'),
      transactions: link('/transactions'),
      budgets: link('/budgets'),
      overview: link(`/overview?year=${year}&month=${month}`),
    },
  });
});

export default router;
