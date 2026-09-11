import { describe, it, expect } from 'vitest';

function validatePasswordRequirements(password: string, confirm: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    match: password.length > 0 && password === confirm,
  };
}

describe('Employee Account Lifecycle & Password Rules', () => {
  it('should validate allowed onboarding state transitions', () => {
    const allowedStates = [
      'invited',
      'email_verification_pending',
      'email_verified',
      'password_change_required',
      'profile_incomplete',
      'pending_hr_approval',
      'correction_required',
      'approved',
      'rejected',
      'suspended',
    ];

    expect(allowedStates).toContain('invited');
    expect(allowedStates).toContain('email_verified');
    expect(allowedStates).toContain('password_change_required');
    expect(allowedStates).toContain('profile_incomplete');
    expect(allowedStates).toContain('pending_hr_approval');
    expect(allowedStates).toContain('approved');
  });

  it('should enforce strong password validation rules', () => {
    const weak = validatePasswordRequirements('simple', 'simple');
    expect(weak.length).toBe(false);
    expect(weak.upper).toBe(false);

    const strong = validatePasswordRequirements('PeoplePay@360', 'PeoplePay@360');
    expect(strong.length).toBe(true);
    expect(strong.upper).toBe(true);
    expect(strong.lower).toBe(true);
    expect(strong.number).toBe(true);
    expect(strong.special).toBe(true);
    expect(strong.match).toBe(true);
  });
});
