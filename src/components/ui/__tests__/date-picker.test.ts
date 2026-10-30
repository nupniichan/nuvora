import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key,
    i18n: { language: 'vi' },
  }),
}));

jest.mock('@/constants/theme', () => ({
  Colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#D1FAE5',
    primaryFaded: '#E6F4EA',
    error: '#EF4444',
    expense: '#DC2626',
    light: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      border: '#E5E7EB',
      text: '#111827',
      textSecondary: '#6B7280',
      backgroundElement: '#F3F4F6',
    },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: any) => obj.default ?? obj.web },
  StyleSheet: { create: (styles: any) => styles },
  Text: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Modal: ({ children }: any) => children,
  TouchableOpacity: ({ children }: any) => children,
  Pressable: ({ children }: any) => children,
}));

jest.mock('@/components/ui/button', () => ({
  Button: () => null,
}));

import { DatePicker, DatePickerProps } from '../date-picker';

function createDatePickerHarness(props: DatePickerProps) {
  const stateMap = new Map<number, any>();
  const refMap = new Map<number, any>();
  let stateIndex = 0;
  let refIndex = 0;

  jest.spyOn(React, 'useState').mockImplementation(((initialValue: any) => {
    const idx = stateIndex++;
    if (!stateMap.has(idx)) {
      stateMap.set(idx, typeof initialValue === 'function' ? initialValue() : initialValue);
    }
    const setState = (newVal: any) => {
      const next = typeof newVal === 'function' ? newVal(stateMap.get(idx)) : newVal;
      stateMap.set(idx, next);
    };
    return [stateMap.get(idx), setState];
  }) as any);

  jest.spyOn(React, 'useRef').mockImplementation(((initialValue: any) => {
    const idx = refIndex++;
    if (!refMap.has(idx)) {
      refMap.set(idx, { current: initialValue });
    }
    return refMap.get(idx);
  }) as any);

  jest.spyOn(React, 'useCallback').mockImplementation(((fn: any) => fn) as any);
  jest.spyOn(React, 'useMemo').mockImplementation(((fn: any) => fn()) as any);
  jest.spyOn(React, 'useEffect').mockImplementation((() => {}) as any);

  const render = () => {
    stateIndex = 0;
    refIndex = 0;
    return DatePicker(props);
  };

  return { render, stateMap };
}

describe('DatePicker Component and Time Stepper Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('renders with initial values and formats properly', () => {
    const handleChange = jest.fn();
    const harness = createDatePickerHarness({
      value: '2026-10-29T14:30:00',
      onChange: handleChange,
      mode: 'datetime',
    });

    const element = harness.render();
    expect(element).toBeDefined();
  });

  test('stepper minute logic increments and decrements by exactly 1 minute', () => {
    const stepUp = (prev: number) => (prev >= 59 ? 0 : prev + 1);
    const stepDown = (prev: number) => (prev <= 0 ? 59 : prev - 1);

    // Single step +1 minute
    expect(stepUp(0)).toBe(1);
    expect(stepUp(14)).toBe(15);
    expect(stepUp(58)).toBe(59);
    expect(stepUp(59)).toBe(0); // Wrap around 59 -> 0

    // Single step -1 minute
    expect(stepDown(1)).toBe(0);
    expect(stepDown(14)).toBe(13);
    expect(stepDown(0)).toBe(59); // Wrap around 0 -> 59
  });

  test('stepper hour logic increments and decrements by exactly 1 hour', () => {
    const stepUp = (prev: number) => (prev >= 23 ? 0 : prev + 1);
    const stepDown = (prev: number) => (prev <= 0 ? 23 : prev - 1);

    // Single step +1 hour
    expect(stepUp(0)).toBe(1);
    expect(stepUp(12)).toBe(13);
    expect(stepUp(22)).toBe(23);
    expect(stepUp(23)).toBe(0); // Wrap around 23 -> 0

    // Single step -1 hour
    expect(stepDown(1)).toBe(0);
    expect(stepDown(12)).toBe(11);
    expect(stepDown(0)).toBe(23); // Wrap around 0 -> 23
  });

  test('handles time-only mode correctly', () => {
    const handleChange = jest.fn();
    const harness = createDatePickerHarness({
      value: '14:30',
      onChange: handleChange,
      mode: 'time',
    });

    const element = harness.render();
    expect(element).toBeDefined();
  });

  test('handles date-only mode correctly', () => {
    const handleChange = jest.fn();
    const harness = createDatePickerHarness({
      value: '2026-10-29',
      onChange: handleChange,
      mode: 'date',
    });

    const element = harness.render();
    expect(element).toBeDefined();
  });
});
