import { Router } from 'express';
import { TransactionCategory } from '@prisma/client';

const router = Router();

router.get('/', (_req, res) => {
  res.json(Object.values(TransactionCategory));
});

export default router;
