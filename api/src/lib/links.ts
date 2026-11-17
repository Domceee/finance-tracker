export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type Link = {
  href: string;
  method: HttpMethod;
};

export function link(href: string, method: HttpMethod = 'GET'): Link {
  return { href, method };
}

export function accountLinks(account: { id: number }) {
  const self = `/accounts/${account.id}`;

  return {
    self: link(self),
    update: link(self, 'PATCH'),
    delete: link(self, 'DELETE'),
    transactions: link(`${self}/transactions`),
  };
}

export function transactionLinks(transaction: { id: number; accountId: number }) {
  const self = `/transactions/${transaction.id}`;

  return {
    self: link(self),
    update: link(self, 'PATCH'),
    delete: link(self, 'DELETE'),
    account: link(`/accounts/${transaction.accountId}`),
    notes: link(`${self}/notes`),
    createNote: link(`${self}/notes`, 'POST'),
  };
}

export function noteLinks(note: { id: number; transactionId: number }) {
  const self = `/notes/${note.id}`;

  return {
    self: link(self),
    update: link(self, 'PATCH'),
    delete: link(self, 'DELETE'),
    transaction: link(`/transactions/${note.transactionId}`),
  };
}

export function withLinks<T extends object, L extends Record<string, Link>>(resource: T, links: L) {
  return { ...resource, _links: links };
}
