import { describe, expect, it } from 'vitest';
import { parseId } from '../lib/ids.js';

describe('parseId', () => {
  it('accepts positive integers as strings or numbers', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId(' 42 ')).toBe(42);
    expect(parseId(7)).toBe(7);
    expect(parseId('2147483647')).toBe(2147483647);
  });

  it('rejects anything that is not a valid int4 ID', () => {
    const invalid = ['0', '-1', '1.5', 'abc', '', '1e3', '2147483648', '99999999999', 1.5, true, null, undefined, {}];

    for (const value of invalid) {
      expect(parseId(value)).toBeNull();
    }
  });
});
