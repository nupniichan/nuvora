export function validatePassword(password: string): { isValid: boolean; errorKey?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, errorKey: 'onboarding.passwordTooShort' };
  }
  return { isValid: true };
}

export function isValidAmount(amountStr: string): boolean {
  const num = Number(amountStr.replace(/,/g, '.'));
  return !isNaN(num) && num > 0;
}
