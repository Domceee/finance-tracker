import { Router } from 'express';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId } from '../lib/ids.js';

const router = Router();

router.use(requireAuth);

async function findOwnedNote(id: number, userId: number) {
  return prisma.note.findFirst({
    where: { id, transaction: { userId } },
  });
}

router.get('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const note = await findOwnedNote(id, userId);

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  return res.json(note);
});

router.patch('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const existing = await findOwnedNote(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const { content } = req.body;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const updated = await prisma.note.update({
    where: { id },
    data: { content: content.trim() },
  });

  return res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const existing = await findOwnedNote(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Note not found' });
  }

  await prisma.note.delete({ where: { id } });

  return res.status(204).send();
});

export default router;
