import { Router } from 'express';
import { Role } from '@prisma/client';
import prisma from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const roles = new Set<string>(Object.values(Role));
const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  currency: true,
  role: true,
  isVerified: true,
} as const;

router.use(requireAuth, requireRole(Role.ADMIN));

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { id: 'asc' },
  });

  return res.json(users);
});

router.get('/users/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json(user);
});

router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { role, name } = req.body;

  if (role !== undefined && !roles.has(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Name must be a non-empty string' });
  }

  if (id === req.user!.userId && role !== undefined && role !== existing.role) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(name !== undefined && { name: name.trim() }),
    },
    select: userSelect,
  });

  return res.json(updated);
});

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (id === req.user!.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account here' });
  }

  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  await prisma.user.delete({ where: { id } });

  return res.status(204).send();
});

export default router;
