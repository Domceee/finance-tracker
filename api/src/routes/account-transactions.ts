import { Router, type NextFunction, type Request, type Response } from 'express';
import prisma from '../prisma.js';
import { parseId } from '../lib/ids.js';
import { noteLinks, transactionLinks, withLinks } from '../lib/links.js';
import { parseNoteFilters, parseTransactionFilters } from '../lib/list-filters.js';
import { INVALID_PAGINATION_MESSAGE, listResponse, parsePagination } from '../lib/pagination.js';

const router = Router({ mergeParams: true });

type AccountParams = { accountId: string };
type TransactionParams = AccountParams & { transactionId: string };
type NoteParams = TransactionParams & { noteId: string };

async function loadAccount(req: Request<AccountParams>, res: Response, next: NextFunction) {
  const accountId = parseId(req.params.accountId);

  if (accountId === null) {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: req.user!.userId },
  });

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.locals.accountId = account.id;
  return next();
}

async function findAccountTransaction(req: Request<TransactionParams>, res: Response) {
  const transactionId = parseId(req.params.transactionId);

  if (transactionId === null) {
    res.status(400).json({ error: 'Invalid transaction ID' });
    return null;
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId: res.locals.accountId },
  });

  if (!transaction) {
    res.status(404).json({ error: 'Transaction not found' });
    return null;
  }

  return transaction;
}

router.use(loadAccount);

router.get('/', async (req: Request<AccountParams>, res) => {
  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({ error: INVALID_PAGINATION_MESSAGE });
  }

  const filters = parseTransactionFilters(req.query);

  if ('error' in filters) {
    return res.status(400).json({ error: filters.error });
  }

  const where = { ...filters.where, accountId: res.locals.accountId as number };

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

router.get('/:transactionId', async (req: Request<TransactionParams>, res) => {
  const transaction = await findAccountTransaction(req, res);

  if (!transaction) {
    return;
  }

  return res.json(withLinks(transaction, transactionLinks(transaction)));
});

router.get('/:transactionId/notes', async (req: Request<TransactionParams>, res) => {
  const transaction = await findAccountTransaction(req, res);

  if (!transaction) {
    return;
  }

  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({ error: INVALID_PAGINATION_MESSAGE });
  }

  const filters = parseNoteFilters(req.query);

  if ('error' in filters) {
    return res.status(400).json({ error: filters.error });
  }

  const where = { ...filters.where, transactionId: transaction.id };

  const [notes, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.note.count({ where }),
  ]);

  const items = notes.map((note) => withLinks(note, noteLinks(note)));

  return res.json(listResponse(req, items, total, pagination));
});

router.post('/:transactionId/notes', async (req: Request<TransactionParams>, res) => {
  const transaction = await findAccountTransaction(req, res);

  if (!transaction) {
    return;
  }

  const { content } = req.body;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const note = await prisma.note.create({
    data: { transactionId: transaction.id, content: content.trim() },
  });

  return res.status(201).json(withLinks(note, noteLinks(note)));
});

router.get('/:transactionId/notes/:noteId', async (req: Request<NoteParams>, res) => {
  const transaction = await findAccountTransaction(req, res);

  if (!transaction) {
    return;
  }

  const noteId = parseId(req.params.noteId);

  if (noteId === null) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const note = await prisma.note.findFirst({
    where: { id: noteId, transactionId: transaction.id },
  });

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  return res.json(withLinks(note, noteLinks(note)));
});

export default router;
