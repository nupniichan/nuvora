import { BackNavigation, goBackOrReplace } from '../navigation';

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
