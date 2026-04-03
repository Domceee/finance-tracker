import { Router } from 'express';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

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
  const { title, amount, type, category, date, description } = req.body;

  const transaction = await prisma.transaction.create({
    data: {
      title,
      amount: Number(amount),
      type,
      category,
      date: new Date(date),
      description,
      userId,
    },
  });

  res.status(201).json(transaction);
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

  const { title, amount, type, category, date, description } = req.body;

  const existingTransaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!existingTransaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(type !== undefined && { type }),
      ...(category !== undefined && { category }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(description !== undefined && { description }),
    },
  });

  return res.json(updatedTransaction);
});

export default router;