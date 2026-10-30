import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export const createCategoryPickerStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
  fieldCard: {
    padding: 14,
    gap: 10,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
  },
  clearCatText: {
    fontSize: 12,
    color: theme.textSecondary,
    textDecorationLine: 'underline',
  },
  catHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  manageCategoryLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    textDecorationLine: 'underline',
  },
  categoryCardBody: {
    gap: 10,
  },
  selectedCategoryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.backgroundElement,
    borderWidth: 1.5,
  },
  selectedCatIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCatInfo: {
    flex: 1,
    gap: 2,
  },
  selectedCatName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  selectedCatGroup: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  noCatTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    justifyContent: 'center',
  },
  noCatText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  expandedCatPanel: {
    gap: 10,
    marginTop: 4,
  },
  catSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.backgroundElement,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catSearchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
    padding: 0,
  },
  groupPillsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.backgroundElement,
  },
  activeGroupPill: {
    backgroundColor: Colors.primary,
  },
  groupPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  activeGroupPillText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  quickAddCatBox: {
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  quickAddCatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAddCatTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  quickAddCatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAddCatInput: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickAddCatSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddCatSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  catGridScroll: {
    maxHeight: 180,
  },
  categoryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: '48%',
  },
  categoryGridText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
    flexShrink: 1,
  },
  selectedCategoryChipText: {
    color: Colors.primaryStrong,
    fontWeight: '700',
  },
  addCustomCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primaryDark,
  },
  addCustomCatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  emptyCatBox: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  emptyCatText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  seedCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  seedCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1C2E',
  },
});


export type CategoryPickerStyles = ReturnType<typeof createCategoryPickerStyles>;
