import { describe, expect, it } from 'vitest';
import { accountLinks, noteLinks, transactionLinks, withLinks } from '../lib/links.js';

describe('resource links', () => {
  it('links an account to itself and its transactions', () => {
    expect(accountLinks({ id: 3 })).toEqual({
      self: { href: '/accounts/3', method: 'GET' },
      update: { href: '/accounts/3', method: 'PATCH' },
      delete: { href: '/accounts/3', method: 'DELETE' },
      transactions: { href: '/accounts/3/transactions', method: 'GET' },
    });
  });

  it('links a transaction to its account and notes', () => {
    const links = transactionLinks({ id: 9, accountId: 3 });

    expect(links.account).toEqual({ href: '/accounts/3', method: 'GET' });
    expect(links.notes).toEqual({ href: '/transactions/9/notes', method: 'GET' });
    expect(links.createNote).toEqual({ href: '/transactions/9/notes', method: 'POST' });
  });

  it('links a note to its transaction', () => {
    expect(noteLinks({ id: 4, transactionId: 9 }).transaction).toEqual({ href: '/transactions/9', method: 'GET' });
  });

  it('withLinks adds _links without changing the resource', () => {
    const account = { id: 3, name: 'Main' };

    expect(withLinks(account, accountLinks(account))).toEqual({ ...account, _links: accountLinks(account) });
    expect(account).not.toHaveProperty('_links');
  });
});
