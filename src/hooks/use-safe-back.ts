import { Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { goBackOrReplace } from '@/shared/navigation';

export function useSafeBack(fallback: Href): () => void {
  const router = useRouter();

  return useCallback(() => {
    goBackOrReplace(router, fallback);
  }, [fallback, router]);
}
