import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
    const transactions = await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
    });

    res.json(transactions);
});

router.post('/', async (req, res) => {
    const { title, amount, type, category, date, description } = req.body;

    const transaction = await prisma.transaction.create({
        data: {
            title,
            amount: Number(amount),
            type,
            category,
            date: new Date(date),
            description,
        },
    });

    res.status(201).json(transaction);
});

router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    try {
        await prisma.transaction.delete({
            where: { id },
        });

        return res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.status(500).json({ error: 'An error occurred while deleting the transaction' });
    }
});

router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const { title, amount, type, category, date, description } = req.body;

    try {
        const updated_transaction = await prisma.transaction.update({
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

        return res.json(updated_transaction);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        return res.status(500).json({ error: 'An error occurred while updating the transaction' });
    }
});

export default router;
