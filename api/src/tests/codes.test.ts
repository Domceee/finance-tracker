import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, generateCode } from '../lib/codes.js';

describe('generateCode', () => {
  it('returns a zero-padded numeric code of the right length', () => {
    for (let index = 0; index < 200; index += 1) {
      const code = generateCode();

      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[0-9]+$/);
    }
  });

  it('does not repeat the same code every time', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateCode()));

    expect(codes.size).toBeGreaterThan(1);
  });
});
