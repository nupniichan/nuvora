import { StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/theme';

export const createTimezonePickerModalStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: theme.surface,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 18,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 8px 30px rgba(0,0,0,0.18)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
    marginTop: -4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundElement,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    padding: 0,
  },
  systemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 12,
  },
  systemTextContainer: {
    flex: 1,
    gap: 2,
  },
  systemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  systemDesc: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 2,
  },
  listContent: {
    paddingBottom: 10,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  itemRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: theme.backgroundElement,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  badgeSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
  },
  badgeTextSelected: {
    color: Colors.primaryStrong,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
});


export type TimezonePickerModalStyles = ReturnType<typeof createTimezonePickerModalStyles>;
