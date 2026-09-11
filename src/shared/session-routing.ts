export function getSessionRedirect(onboarding: boolean, pathname: string, initialized: boolean, unlocked: boolean): '/(auth)/lock' | '/(auth)/welcome' | null {
  if (onboarding) {
    if (initialized && pathname !== '/lock') return '/(auth)/lock';
    if (!initialized && pathname === '/lock') return '/(auth)/welcome';
    return null;
  }
  if (!initialized) return '/(auth)/welcome';
  return unlocked ? null : '/(auth)/lock';
}
