import express from 'express';
import transactionsRouter from './routes/transactions.js';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.json({ message: 'Backend is running' });
});

app.use('/transactions', transactionsRouter);

export default app;
