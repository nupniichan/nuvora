import { BackNavigation, getActiveMainTab, goBackOrReplace } from '../navigation';

describe('persistent bottom navigation', () => {
  it.each([
    [[], null],
    [['(auth)', 'lock'], null],
    [['(auth)', 'welcome'], null],
    [['(main)'], 'index'],
    [['(main)', 'index'], 'index'],
    [['(main)', 'transactions'], 'transactions'],
    [['(main)', 'budgets'], 'budgets'],
    [['(main)', 'more'], 'more'],
    [['(modal)', 'manage-budget'], 'budgets'],
    [['(modal)', 'manage-goals'], 'budgets'],
    [['(modal)', 'manage-recurring'], 'budgets'],
    [['(modal)', 'manage-categories'], 'more'],
    [['(modal)', 'backup-restore'], 'more'],
    [['(modal)', 'add-transaction'], 'transactions'],
  ])('selects the correct tab for %j', (segments, expected) => {
    expect(getActiveMainTab(segments as string[])).toBe(expected);
  });
});

function createNavigation(canGoBack: boolean): BackNavigation {
  return {
    canGoBack: jest.fn(() => canGoBack),
    back: jest.fn(),
    replace: jest.fn(),
  };
}

describe('goBackOrReplace', () => {
  it('goes back when navigation history exists', () => {
    const navigation = createNavigation(true);

    goBackOrReplace(navigation, '/(main)');

    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('replaces with the fallback when opened without navigation history', () => {
    const navigation = createNavigation(false);

    goBackOrReplace(navigation, '/(main)/more');

    expect(navigation.back).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('/(main)/more');
  });
});
