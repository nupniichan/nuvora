import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createDatePickerStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      gap: 6,
      alignSelf: 'stretch',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    inputButton: {
      height: 48,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
    },
    inputDisabled: {
      opacity: 0.6,
      backgroundColor: theme.backgroundElement,
    },
    inputError: {
      borderColor: Colors.error,
    },
    leftIcon: {
      marginRight: 10,
    },
    inputText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    placeholderText: {
      fontWeight: '400',
      color: theme.textSecondary,
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clearBtn: {
      padding: 4,
    },
    errorText: {
      fontSize: 12,
      color: Colors.error,
    },
    helperText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 16, 25, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    modalCloseBtn: {
      padding: 4,
    },
    presetContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    presetChip: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetChipActive: {
      backgroundColor: Colors.primaryLight,
      borderWidth: 1,
      borderColor: Colors.primaryDark,
    },
    presetChipDisabled: {
      opacity: 0.35,
    },
    presetText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    presetTextActive: {
      color: Colors.primaryDark,
      fontWeight: '700',
    },
    presetTextDisabled: {
      color: theme.textSecondary,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    navArrowBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
    },
    navArrowBtnDisabled: {
      opacity: 0.3,
    },
    monthYearSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
    },
    monthYearText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    calendarContainer: {
      marginBottom: 12,
    },
    weekdaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 6,
    },
    weekdayText: {
      width: 38,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    sundayText: {
      color: Colors.expense,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      rowGap: 4,
    },
    dayCell: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedDayCell: {
      backgroundColor: Colors.primaryDark,
    },
    todayCell: {
      borderWidth: 1.5,
      borderColor: Colors.primaryDark,
    },
    disabledDayCell: {
      opacity: 0.25,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    outsideMonthText: {
      color: theme.border,
    },
    todayText: {
      color: Colors.primaryDark,
      fontWeight: '700',
    },
    selectedDayText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    disabledDayText: {
      color: theme.textSecondary,
    },
    todayDot: {
      position: 'absolute',
      bottom: 3,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.primaryDark,
    },
    monthYearGridContainer: {
      paddingVertical: 8,
      marginBottom: 12,
    },
    yearControlRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      marginBottom: 14,
    },
    yearStepBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
    },
    yearDisplayTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    monthsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    monthGridItem: {
      width: '30%',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
    },
    monthGridItemActive: {
      backgroundColor: Colors.primaryDark,
    },
    monthGridItemDisabled: {
      opacity: 0.3,
    },
    monthGridText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    monthGridTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    monthGridTextDisabled: {
      color: theme.border,
    },
    timeSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      marginBottom: 14,
    },
    timeLeftCol: {
      gap: 4,
    },
    timeLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timeLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    timeNowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 3,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
      backgroundColor: Colors.primaryLight,
    },
    timeNowText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
    timeControlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timeStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 2,
    },
    timeStepBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeValueText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      minWidth: 30,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    timeSeparator: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    modalFooter: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 12,
      gap: 12,
    },
    selectedSummaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedSummaryLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    selectedSummaryValue: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
    footerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    clearButton: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    clearButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.error,
    },
    confirmBtn: {
      paddingHorizontal: 20,
    },
  });

export type DatePickerStyles = ReturnType<typeof createDatePickerStyles>;