import { Colors } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { DashboardStyles } from '../dashboard.styles';

export interface DashboardQuickActionsProps {
  styles: DashboardStyles;
  compact: boolean;
  theme: typeof Colors.light;
  t: (key: string, options?: { defaultValue: string }) => string;
}

export function DashboardQuickActions({
  styles,
  compact,
  theme,
  t,
}: DashboardQuickActionsProps) {
  const router = useRouter();

  const actions = [
    {
      icon: 'add' as const,
      label: t('transactions.quickAdd', { defaultValue: 'Thêm thu chi' }),
      route: '/(modal)/add-transaction',
      color: Colors.primary,
      ink: Colors.primaryStrong,
    },
    {
      icon: 'savings' as const,
      label: t('funds.shortcut', { defaultValue: 'Quỹ tiết kiệm' }),
      route: '/(modal)/manage-funds',
      color: theme.backgroundElement,
      ink: theme.textSecondary,
    },
    {
      icon: 'donut-small' as const,
      label: t('navigation.plans', { defaultValue: 'Kế hoạch' }),
      route: '/(main)/budgets',
      color: theme.backgroundElement,
      ink: theme.textSecondary,
    },
    {
      icon: 'tune' as const,
      label: t('monthlyLimit.shortcut', { defaultValue: 'Hạn mức' }),
      route: '/(modal)/manage-budget',
      color: theme.backgroundElement,
      ink: theme.textSecondary,
    },
    {
      icon: 'outlined-flag' as const,
      label: t('dashboard.goals', { defaultValue: 'Mục tiêu' }),
      route: '/(modal)/manage-goals',
      color: theme.backgroundElement,
      ink: theme.textSecondary,
    },
    {
      icon: 'event-repeat' as const,
      label: t('dashboard.recurringShortcut', { defaultValue: 'Định kỳ' }),
      route: '/(modal)/manage-recurring',
      color: theme.backgroundElement,
      ink: theme.textSecondary,
    },
  ] as const;

  return (
    <View style={styles.shortcuts}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.route}
          accessibilityRole="button"
          style={styles.shortcut}
          onPress={() => router.push(action.route as any)}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.shortcutIcon,
              compact && styles.compactShortcutIcon,
              { backgroundColor: action.color },
            ]}
          >
            <MaterialIcons name={action.icon} size={24} color={action.ink} />
          </View>
          <Text style={styles.shortcutLabel}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}