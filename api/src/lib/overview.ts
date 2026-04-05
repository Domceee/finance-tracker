import { TransactionCategory } from '@prisma/client';
import prisma from '../prisma.js';

export type OverviewData = {
  year: number;
  month: number;
  incomeTotal: number;
  spentTotal: number;
  leftTotal: number;
  categoryBreakdown: Array<{
    category: TransactionCategory;
    amount: number;
    percentage: number;
  }>;
};

export function parseYearMonth(
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

function isCurrentMonth(year: number, month: number) {
  const now = new Date();
  return year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
}

async function buildOverviewFromTransactions(
  userId: number,
  year: number,
  month: number,
): Promise<OverviewData> {
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
  const categoryTotals = new Map<TransactionCategory, number>();

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

  return {
    year,
    month,
    incomeTotal,
    spentTotal,
    leftTotal,
    categoryBreakdown,
  };
}

async function getOrCreateMonthlySnapshot(
  userId: number,
  year: number,
  month: number,
): Promise<OverviewData> {
  const existingSummary = await prisma.monthlySummary.findUnique({
    where: {
      userId_year_month: {
        userId,
        year,
        month,
      },
    },
    include: {
      categorySummaries: true,
    },
  });

  if (existingSummary) {
    return {
      year: existingSummary.year,
      month: existingSummary.month,
      incomeTotal: existingSummary.incomeTotal,
      spentTotal: existingSummary.spentTotal,
      leftTotal: existingSummary.leftTotal,
      categoryBreakdown: existingSummary.categorySummaries
        .map((summary) => ({
          category: summary.category,
          amount: summary.amount,
          percentage:
            existingSummary.spentTotal === 0
              ? 0
              : Number(((summary.amount / existingSummary.spentTotal) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  const overview = await buildOverviewFromTransactions(userId, year, month);

  await prisma.monthlySummary.create({
    data: {
      userId,
      year,
      month,
      incomeTotal: overview.incomeTotal,
      spentTotal: overview.spentTotal,
      leftTotal: overview.leftTotal,
      categorySummaries: {
        create: overview.categoryBreakdown.map((item) => ({
          category: item.category,
          amount: item.amount,
        })),
      },
    },
  });

  return overview;
}

export async function getOverviewForMonth(
  userId: number,
  year: number,
  month: number,
): Promise<OverviewData> {
  if (isCurrentMonth(year, month)) {
    return buildOverviewFromTransactions(userId, year, month);
  }

  return getOrCreateMonthlySnapshot(userId, year, month);
}
