import prisma from '../prisma.js';

export async function createAccount(userId: number, name = 'Main') {
  return prisma.account.create({
    data: { userId, name },
  });
}
