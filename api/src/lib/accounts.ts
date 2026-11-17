import type { Account } from '@prisma/client';
import prisma from '../prisma.js';

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

export async function withBalances(accounts: Account[]) {
  const balances = await getBalances(accounts.map((account) => account.id));

  return accounts.map((account) => ({
    ...account,
    balance: Math.round((balances.get(account.id) ?? 0) * 100) / 100,
  }));
}
