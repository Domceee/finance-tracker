export const MAX_ID = 2_147_483_647;

export function parseId(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return null;
  }

  const text = String(raw).trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const id = Number(text);

  if (id < 1 || id > MAX_ID) {
    return null;
  }

  return id;
}
