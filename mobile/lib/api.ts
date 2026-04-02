const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
    throw new Error('API_BASE_URL environment variable is not defined');
}

export type Transaction = {
    id: number;
    title: string;
    amount: number;
    type: string;
    category: string;
    date: string;
    description?: string | null;
};

type CreateTransactionInput = {
    title: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    date: string;
    description?: string;
};

export async function getTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${BASE_URL}/transactions`);

    if (!response.ok) {
        throw new Error('Failed to fetch transactions');
    }

    return response.json();
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const response = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        throw new Error('Failed to create transaction');
    }

    return response.json();
}