import { randomInt } from 'node:crypto';

export const CODE_LENGTH = 6;

export function generateCode() {
  return randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, '0');
}
