import type { Budget } from '@prisma/client';
import prisma from '../prisma.js';

export function parseCategories(raw: string): string[] {
  return raw.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function withSpent(userId: number, budgets: Budget[]) {
  const { start, end } = getCurrentMonthRange();

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: 'expense', date: { gte: start, lt: end } },
    select: { category: true, amount: true },
  });

  return budgets.map((budget) => {
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
}

export async function buildBudgetResponse(budget: Budget) {
  const [result] = await withSpent(budget.userId, [budget]);
  return result;
}
