import express from 'express';
import transactionsRouter from './routes/transactions.js';
import authRouter from './routes/auth.js';
import aiRouter from './routes/ai.js';
import overviewRouter from './routes/overview.js';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.json({ message: 'Backend is running' });
});

app.use('/auth', authRouter);
app.use('/ai', aiRouter);
app.use('/overview', overviewRouter);
app.use('/transactions', transactionsRouter);

export default app;
