import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface SplashContextValue {
  isSplashFinished: boolean;
  markSplashFinished: () => void;
}

const defaultContextValue: SplashContextValue = {
  isSplashFinished: true,
  markSplashFinished: () => {},
};

const SplashContext = createContext<SplashContextValue>(defaultContextValue);

export interface SplashProviderProps {
  children: React.ReactNode;
  initialFinished?: boolean;
}

export function SplashProvider({
  children,
  initialFinished = false,
}: SplashProviderProps) {
  const [isSplashFinished, setIsSplashFinished] = useState(initialFinished);

  const markSplashFinished = useCallback(() => {
    setIsSplashFinished(true);
  }, []);

  const value = useMemo(
    () => ({ isSplashFinished, markSplashFinished }),
    [isSplashFinished, markSplashFinished]
  );

  return (
    <SplashContext.Provider value={value}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash(): SplashContextValue {
  try {
    const ctx = useContext(SplashContext);
    return ctx ?? defaultContextValue;
  } catch {
    return defaultContextValue;
  }
}
