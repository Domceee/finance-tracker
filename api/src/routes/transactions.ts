import { Router } from 'express';
import { TransactionCategory } from '@prisma/client';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const transactionCategories = new Set(Object.values(TransactionCategory));
const expenseCategories = new Set(
  Object.values(TransactionCategory).filter((category) => category !== TransactionCategory.SALARY),
);

router.use(requireAuth);

async function isOwnedAccount(accountId: unknown, userId: number) {
  if (!Number.isInteger(accountId)) {
    return false;
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId as number, userId },
  });

  return account !== null;
}

router.get('/', async (req, res) => {
  const userId = req.user!.userId;

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  res.json(transactions);
});

router.post('/', async (req, res) => {
  const userId = req.user!.userId;
  const { title, amount, type, category, date, description, accountId } = req.body;
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
    return res.status(400).json({ error: 'Amount cannot be 0' });
  }

  if (accountId === undefined || accountId === null) {
    return res.status(400).json({ error: 'Account is required' });
  }

  if (!(await isOwnedAccount(accountId, userId))) {
    return res.status(400).json({ error: 'Invalid account' });
  }

  if (type === 'income') {
    const transaction = await prisma.transaction.create({
      data: {
        title,
        amount: parsedAmount,
        type,
        category: TransactionCategory.SALARY,
        date: new Date(date),
        description,
        userId,
        accountId,
      },
    });

    return res.status(201).json(transaction);
  }

  if (!transactionCategories.has(category) || !expenseCategories.has(category)) {
    return res.status(400).json({ error: 'Invalid transaction category' });
  }

  const transaction = await prisma.transaction.create({
    data: {
      title,
      amount: parsedAmount,
      type,
      category,
      date: new Date(date),
      description,
      userId,
      accountId,
    },
  });

  res.status(201).json(transaction);
});

router.get('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  return res.json(transaction);
});

router.get('/:id/notes', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const notes = await prisma.note.findMany({
    where: { transactionId: id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  return res.json(notes);
});

router.post('/:id/notes', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const { content } = req.body;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const note = await prisma.note.create({
    data: { transactionId: id, content: content.trim() },
  });

  return res.status(201).json(note);
});

router.delete('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  await prisma.transaction.delete({
    where: { id },
  });

  return res.status(204).send();
});

router.patch('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  const { title, amount, type, category, date, description, accountId } = req.body;

  const existingTransaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!existingTransaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (accountId !== undefined && !(await isOwnedAccount(accountId, userId))) {
    return res.status(400).json({ error: 'Invalid account' });
  }

  const nextType = type ?? existingTransaction.type;
  const nextCategory =
    nextType === 'income' ? TransactionCategory.SALARY : category ?? existingTransaction.category;
  const parsedAmount = amount !== undefined ? Number(amount) : undefined;

  if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount === 0)) {
    return res.status(400).json({ error: 'Amount cannot be 0' });
  }

  if (!transactionCategories.has(nextCategory) || (nextType !== 'income' && !expenseCategories.has(nextCategory))) {
    return res.status(400).json({ error: 'Invalid transaction category' });
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(parsedAmount !== undefined && { amount: parsedAmount }),
      ...(type !== undefined && { type }),
      category: nextCategory,
      ...(date !== undefined && { date: new Date(date) }),
      ...(description !== undefined && { description }),
      ...(accountId !== undefined && { accountId }),
    },
  });

  return res.json(updatedTransaction);
});

export default router;
