import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createManageCategoriesStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
    },
    closeBtn: {
      padding: 6,
    },
    content: {
      padding: 20,
      gap: 16,
    },
    topActions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 4,
    },
    actionBtnHalf: {
      flex: 1,
    },
    addGroupBtn: {
      alignSelf: 'flex-start',
    },
    groupCard: {
      padding: 16,
      gap: 12,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    groupIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupTitleInfo: {
      flex: 1,
      gap: 2,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    groupSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    groupActionBtns: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconBtn: {
      padding: 6,
    },
    addCategoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: Colors.primaryFaded,
    },
    addCategoryText: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
    categoryList: {
      gap: 8,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    emptyGroupText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontStyle: 'italic',
      paddingVertical: 4,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    catColorDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    catActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    modalRoot: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    modalContent: {
      padding: 20,
      gap: 16,
    },
    formGroup: {
      gap: 8,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    textInput: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipRow: {
      gap: 8,
      paddingVertical: 2,
    },
    groupSelectChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.backgroundElement,
    },
    selectedGroupSelectChip: {
      backgroundColor: Colors.primary,
    },
    groupSelectText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    selectedGroupSelectText: {
      color: '#1A1C2E',
      fontWeight: '800',
    },
    previewCard: {
      padding: 14,
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      gap: 8,
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    previewBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    modalFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    flowTypeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    flowTypeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeExpenseFlow: {
      backgroundColor: '#FFEBEE',
      borderColor: '#FFCDD2',
    },
    activeIncomeFlow: {
      backgroundColor: '#E8F5E9',
      borderColor: '#C8E6C9',
    },
    flowTypeText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeFlowText: {
      color: theme.text,
      fontWeight: '700',
    },
    templateModalContent: {
      padding: 20,
      gap: 14,
    },
    addAllTemplatesBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: Colors.primaryFaded,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: Colors.primary,
    },
    addAllLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    addAllIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addAllTextContainer: {
      flex: 1,
      gap: 2,
    },
    addAllTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1A1C2E',
    },
    addAllSub: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    templateSectionHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    templateCard: {
      padding: 14,
      gap: 12,
    },
    templateCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    templateHeaderInfo: {
      flex: 1,
      gap: 3,
    },
    templateName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    templateTypeBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    templateTypeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    expenseBadge: {
      backgroundColor: '#FFEBEE',
    },
    incomeBadge: {
      backgroundColor: '#E8F5E9',
    },
    templateTypeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    expenseBadgeText: {
      color: Colors.expense,
    },
    incomeBadgeText: {
      color: Colors.income,
    },
    templateCatCount: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    alreadyExistsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: '#E8F5E9',
    },
    alreadyExistsText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2E7D32',
    },
    addSingleTemplateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: Colors.primary,
    },
    addSingleTemplateBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1A1C2E',
    },
    templateCatWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    templateCatChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: theme.backgroundElement,
    },
    templateCatDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    templateCatText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: '500',
    },
    keyboardAvoid: {
      flex: 1,
    },
  });

export type ManageCategoriesStyles = ReturnType<typeof createManageCategoriesStyles>;