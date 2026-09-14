import React from 'react';
import { useAutoLock } from '../use-auto-lock';

let appStateChangeHandlers: ((state: string) => void)[] = [];

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((event: string, handler: (state: string) => void) => {
      if (event === 'change') {
        appStateChangeHandlers.push(handler);
      }
      return {
        remove: jest.fn(() => {
          appStateChangeHandlers = appStateChangeHandlers.filter((h) => h !== handler);
        }),
      };
    }),
  },
}));

const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
const mockCanDismiss = jest.fn().mockReturnValue(true);
let mockSegments: string[] = ['(main)'];

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    dismissAll: mockDismissAll,
    canDismiss: mockCanDismiss,
  }),
  useSegments: () => mockSegments,
}));

let mockIsUnlocked = false;
const mockLockApp = jest.fn(() => {
  mockIsUnlocked = false;
});

jest.mock('@/services/security/auth-service', () => ({
  isAppUnlocked: () => mockIsUnlocked,
  lockApp: () => mockLockApp(),
}));

let mockEnvelopeInitialized = true;
jest.mock('@/services/security/key-manager', () => ({
  isKeyEnvelopeInitialized: jest.fn(async () => mockEnvelopeInitialized),
}));

function RenderComponent() {
  useAutoLock();
  return null;
}

function renderHook() {
  const effectCleanups: (() => void)[] = [];
  const refMap = new Map<number, any>();
  let refIndex = 0;

  jest.spyOn(React, 'useRef').mockImplementation((initialValue: any) => {
    const idx = refIndex++;
    if (!refMap.has(idx)) {
      refMap.set(idx, { current: initialValue });
    }
    return refMap.get(idx);
  });

  jest.spyOn(React, 'useEffect').mockImplementation((effect: any) => {
    const cleanup = effect();
    if (typeof cleanup === 'function') {
      effectCleanups.push(cleanup);
    }
  });

  const render = () => {
    refIndex = 0;
    RenderComponent();
  };

  render();

  return {
    rerender: render,
    cleanup: () => effectCleanups.forEach((c) => c()),
  };
}

describe('useAutoLock hook', () => {
  let hookHarness: { rerender: () => void; cleanup: () => void };

  beforeEach(() => {
    jest.clearAllMocks();
    appStateChangeHandlers = [];
    mockSegments = ['(main)'];
    mockIsUnlocked = true;
    mockEnvelopeInitialized = true;
    hookHarness = renderHook();
  });

  afterEach(() => {
    if (hookHarness) hookHarness.cleanup();
  });

  test('locks app and redirects to lock screen when entering background from unlocked state', async () => {
    mockIsUnlocked = true;
    expect(appStateChangeHandlers.length).toBeGreaterThan(0);

    await appStateChangeHandlers[0]('background');

    expect(mockLockApp).toHaveBeenCalled();
    expect(mockCanDismiss).toHaveBeenCalled();
    expect(mockDismissAll).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/lock');
  });

  test('does not redirect if app was already locked when entering background', async () => {
    mockIsUnlocked = false;

    await appStateChangeHandlers[0]('background');

    expect(mockLockApp).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('redirects to lock screen upon becoming active if locked and not in auth group', async () => {

    mockIsUnlocked = true;
    await appStateChangeHandlers[0]('background');
    mockReplace.mockClear();

    mockIsUnlocked = false;
    mockSegments = ['(main)'];
    hookHarness.rerender();
    await appStateChangeHandlers[0]('active');

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/lock');
  });

  test('does not redirect upon becoming active if user is already on auth screen', async () => {

    mockIsUnlocked = true;
    await appStateChangeHandlers[0]('background');
    mockReplace.mockClear();

    mockIsUnlocked = false;
    mockSegments = ['(auth)'];
    hookHarness.rerender();
    await appStateChangeHandlers[0]('active');

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
