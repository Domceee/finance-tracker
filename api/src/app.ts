import express from 'express';
import prisma from './prisma.js';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.json({ message: 'Backend is running' });
});

app.get('/transactions', async (_req, res) => {
    const transactions = await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
    });

    res.json(transactions);
});

app.post('/transactions', async (req, res) => {
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

export default app;
