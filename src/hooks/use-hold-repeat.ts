import { useCallback, useEffect, useRef } from 'react';

export function useHoldRepeat(action: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHeldRef = useRef(false);
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  const handlePressIn = useCallback(() => {
    isHeldRef.current = false;
    clear();
    timerRef.current = setTimeout(() => {
      isHeldRef.current = true;
      intervalRef.current = setInterval(() => {
        actionRef.current();
      }, 75);
    }, 350);
  }, [clear]);

  const handlePressOut = useCallback(() => {
    clear();
  }, [clear]);

  const handlePress = useCallback(() => {
    if (!isHeldRef.current) {
      actionRef.current();
    }
    isHeldRef.current = false;
  }, []);

  return {
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    onPress: handlePress,
  };
}
