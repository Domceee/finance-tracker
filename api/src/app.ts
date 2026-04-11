import express from 'express';
import rateLimit from 'express-rate-limit';
import transactionsRouter from './routes/transactions.js';
import authRouter from './routes/auth.js';
import aiRouter from './routes/ai.js';
import overviewRouter from './routes/overview.js';
import ratesRouter from './routes/rates.js';
import budgetsRouter from './routes/budgets.js';

const app = express();

app.use(express.json());

// Strict limiter for login/register — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Looser limiter for token refresh — 60 per 15 minutes per IP
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// AI endpoints are expensive — 20 calls per hour per IP
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    message: { error: 'AI request limit reached, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.get('/', (_req, res) => {
    res.json({ message: 'Backend is running' });
});

if (process.env.NODE_ENV !== 'test') {
    app.use('/auth/login', authLimiter);
    app.use('/auth/register', authLimiter);
    app.use('/auth/verify-email', authLimiter);
    app.use('/auth/refresh', refreshLimiter);
    app.use('/ai', aiLimiter);
}

app.use('/auth', authRouter);
app.use('/ai', aiRouter);
app.use('/overview', overviewRouter);
app.use('/transactions', transactionsRouter);
app.use('/rates', ratesRouter);
app.use('/budgets', budgetsRouter);

export default app;
