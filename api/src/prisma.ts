import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.SQLITE_DATABASE_URL;

if (!databaseUrl) {
    throw new Error('Missing SQLITE_DATABASE_URL in api/.env');
}

const adapter = new PrismaBetterSqlite3({
    url: databaseUrl,
});

const prisma = new PrismaClient({
    adapter,
});

export default prisma;
