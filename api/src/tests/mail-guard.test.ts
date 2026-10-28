import { describe, expect, it, vi } from 'vitest';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/mail.js';

describe('Mail guard', () => {
  it('replaces sendVerificationEmail with a mock in every suite', () => {
    expect(vi.isMockFunction(sendVerificationEmail)).toBe(true);
  });

  it('replaces sendPasswordResetEmail with a mock in every suite', () => {
    expect(vi.isMockFunction(sendPasswordResetEmail)).toBe(true);
  });
});
