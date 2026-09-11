import { getSessionRedirect } from '../session-routing';

describe('session routing', () => {
  test.each(['/welcome', '/setup-password', '/setup-biometric', '/setup-currency', '/setup-categories'])('existing account cannot enter %s, even when unlocked', (path) => {
    expect(getSessionRedirect(true, path, true, false)).toBe('/(auth)/lock');
    expect(getSessionRedirect(true, path, true, true)).toBe('/(auth)/lock');
    expect(getSessionRedirect(true, path, false, false)).toBeNull();
  });
  test('lock requires an account and stays visible for an existing account', () => {
    expect(getSessionRedirect(true, '/lock', false, false)).toBe('/(auth)/welcome');
    expect(getSessionRedirect(true, '/lock', true, true)).toBeNull();
  });
  test('protected pages require an initialized, unlocked account', () => {
    expect(getSessionRedirect(false, '/account-security', false, false)).toBe('/(auth)/welcome');
    expect(getSessionRedirect(false, '/account-security', true, false)).toBe('/(auth)/lock');
    expect(getSessionRedirect(false, '/account-security', true, true)).toBeNull();
  });
});
