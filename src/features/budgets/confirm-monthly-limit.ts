import { TFunction } from 'i18next';
import { Alert, Platform } from 'react-native';
import { formatMoney } from '@/shared/money';
import { getCurrentLanguage } from '@/i18n/language-state';
import { MonthlyLimitExceededError, MonthlyLimitValidationError } from './monthly-limits';

export async function withMonthlyLimitConfirmation(task: (approval?: string) => Promise<unknown>, t: TFunction): Promise<boolean> {
  let approval: string | undefined;
  for (;;) {
    try {
      await task(approval);
      return true;
    } catch (error) {
      if (error instanceof MonthlyLimitValidationError) throw new Error(t(`monthlyLimit.${error.code}`));
      if (!(error instanceof MonthlyLimitExceededError)) throw error;
      const locale = getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
      const p = error.projection;
      const title = t('monthlyLimit.confirmTitle');
      const message = t('monthlyLimit.confirmMessage', {
        month: p.month.split('-').reverse().join('/'),
        limit: formatMoney(p.limit!, p.currency, locale),
        spent: formatMoney(p.spent, p.currency, locale),
        projected: formatMoney(p.projected, p.currency, locale),
        exceeded: formatMoney(p.exceeded, p.currency, locale),
      });
      const accepted = await new Promise<boolean>(resolve => {
        if (Platform.OS === 'web') {
          resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
        } else {
          Alert.alert(title, message, [
            { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('monthlyLimit.confirmSave'), onPress: () => resolve(true) },
          ], { cancelable: true, onDismiss: () => resolve(false) });
        }
      });
      if (!accepted) return false;
      approval = error.approval;
    }
  }
}
