import type { Href } from 'expo-router';

export type MainTab = 'index' | 'transactions' | 'budgets' | 'more';

export function getActiveMainTab(segments: readonly string[]): MainTab | null {
  const [group, screen] = segments;
  if (group === '(main)') {
    if (screen === 'transactions' || screen === 'budgets' || screen === 'more') return screen;
    return 'index';
  }
  if (group === '(modal)') {
    if (screen === 'add-transaction') return 'transactions';
    if (screen === 'manage-categories' || screen === 'backup-restore' || screen === 'account-security') return 'more';
    return 'budgets';
  }
  return null;
}

export interface BackNavigation {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
}

export function goBackOrReplace(navigation: BackNavigation, fallback: Href): void {
  if (navigation.canGoBack()) {
    navigation.back();
    return;
  }

  navigation.replace(fallback);
}
