import { Router } from 'express';
import type { Note, Transaction } from '@prisma/client';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId } from '../lib/ids.js';
import { noteLinks, transactionLinks, withLinks } from '../lib/links.js';
import { parseNoteFilters, parseTransactionFilters } from '../lib/list-filters.js';
import { INVALID_PAGINATION_MESSAGE, listResponse, parsePagination } from '../lib/pagination.js';
import { validateTransactionCreate, validateTransactionUpdate } from '../lib/transaction-input.js';

const router = Router();

router.use(requireAuth);

async function isOwnedAccount(accountId: number, userId: number) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });

  return account !== null;
}

function presentTransaction(transaction: Transaction) {
  return withLinks(transaction, transactionLinks(transaction));
}

function presentNote(note: Note) {
  return withLinks(note, noteLinks(note));
}

router.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({ error: INVALID_PAGINATION_MESSAGE });
  }

  const filters = parseTransactionFilters(req.query);

  if ('error' in filters) {
    return res.status(400).json({ error: filters.error });
  }

  const where = { ...filters.where, userId };

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return res.json(listResponse(req, transactions.map(presentTransaction), total, pagination));
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

  return res.status(201).json(presentTransaction(transaction));
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

  return res.json(presentTransaction(transaction));
});

router.get('/:id/notes', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({ error: INVALID_PAGINATION_MESSAGE });
  }

  const filters = parseNoteFilters(req.query);

  if ('error' in filters) {
    return res.status(400).json({ error: filters.error });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const where = { ...filters.where, transactionId: id };

  const [notes, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.note.count({ where }),
  ]);

  return res.json(listResponse(req, notes.map(presentNote), total, pagination));
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

  return res.status(201).json(presentNote(note));
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

  return res.json(presentTransaction(updatedTransaction));
});

export default router;
