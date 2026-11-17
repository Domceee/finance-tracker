import { Router } from 'express';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId } from '../lib/ids.js';
import { validateTransactionCreate, validateTransactionUpdate } from '../lib/transaction-input.js';

const router = Router();

router.use(requireAuth);

async function isOwnedAccount(accountId: number, userId: number) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
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
  const result = validateTransactionCreate(req.body);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  if (!(await isOwnedAccount(result.data.accountId, userId))) {
    return res.status(400).json({ error: 'Invalid account' });
  }

  const transaction = await prisma.transaction.create({
    data: { ...result.data, userId },
  });

  return res.status(201).json(transaction);
});

router.get('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
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
  const id = parseId(req.params.id);

  if (id === null) {
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
  const id = parseId(req.params.id);

  if (id === null) {
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
  const id = parseId(req.params.id);

  if (id === null) {
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
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  const existingTransaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!existingTransaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const result = validateTransactionUpdate(req.body, existingTransaction);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  if (result.data.accountId !== undefined && !(await isOwnedAccount(result.data.accountId, userId))) {
    return res.status(400).json({ error: 'Invalid account' });
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: result.data,
  });

  return res.json(updatedTransaction);
});

export default router;
