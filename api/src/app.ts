import express from 'express';
import transactionsRouter from './routes/transactions.js';
import authRouter from './routes/auth.js';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.json({ message: 'Backend is running' });
});

app.use('/auth', authRouter)
app.use('/transactions', transactionsRouter);

export default app;
