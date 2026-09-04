import type { Href } from 'expo-router';

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
