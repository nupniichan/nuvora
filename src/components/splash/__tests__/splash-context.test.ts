import React from 'react';
import { SplashProvider, useSplash } from '../splash-context';

describe('SplashContext and useSplash', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns fallback default isSplashFinished: true when consumed outside SplashProvider or when dispatcher throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const splash = useSplash();
    consoleSpy.mockRestore();
    expect(splash).not.toBeNull();
    expect(splash.isSplashFinished).toBe(true);
    expect(typeof splash.markSplashFinished).toBe('function');
  });

  test('returns provided context value when inside context hierarchy', () => {
    const mockContextValue = {
      isSplashFinished: false,
      markSplashFinished: jest.fn(),
    };
    jest.spyOn(React, 'useContext').mockReturnValue(mockContextValue);

    const splash = useSplash();
    expect(splash.isSplashFinished).toBe(false);
    splash.markSplashFinished();
    expect(mockContextValue.markSplashFinished).toHaveBeenCalledTimes(1);
  });

  test('SplashProvider initializes with isSplashFinished false by default and switches to true on markSplashFinished', () => {
    let capturedState = false;
    let setCapturedState: ((val: any) => void) | undefined;

    (jest.spyOn(React, 'useState') as any).mockImplementation((initial: any) => {
      capturedState = initial;
      setCapturedState = (next: any) => {
        capturedState = typeof next === 'function' ? next(capturedState) : next;
      };
      return [capturedState, setCapturedState];
    });

    (jest.spyOn(React, 'useCallback') as any).mockImplementation(((fn: any) => fn) as any);
    (jest.spyOn(React, 'useMemo') as any).mockImplementation(((fn: any) => fn()) as any);

    const element = SplashProvider({ children: null }) as any;

    expect(capturedState).toBe(false);
    expect(element).not.toBeNull();
    expect(element.props.value.isSplashFinished).toBe(false);

    // Call markSplashFinished
    element.props.value.markSplashFinished();
    expect(capturedState).toBe(true);
  });

  test('SplashProvider supports custom initialFinished parameter', () => {
    let capturedState = false;

    (jest.spyOn(React, 'useState') as any).mockImplementation((initial: any) => {
      capturedState = initial;
      return [capturedState, jest.fn()];
    });

    (jest.spyOn(React, 'useCallback') as any).mockImplementation(((fn: any) => fn) as any);
    (jest.spyOn(React, 'useMemo') as any).mockImplementation(((fn: any) => fn()) as any);

    const element = SplashProvider({ children: null, initialFinished: true }) as any;

    expect(capturedState).toBe(true);
    expect(element.props.value.isSplashFinished).toBe(true);
  });
});
