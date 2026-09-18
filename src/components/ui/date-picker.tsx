import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import {
  addDays,
  formatDateDisplay,
  formatDateISO,
  getCalendarMatrix,
  parseISODate,
} from '@/shared/date-utils';

export interface DatePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  mode?: 'date' | 'datetime' | 'time';
  allowClear?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  style?: StyleProp<ViewStyle>;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder,
  error,
  helperText,
  mode = 'date',
  allowClear = false,
  disabled = false,
  minDate,
  maxDate,
  style,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'vi';

  const [isOpen, setIsOpen] = useState(false);

  const initialDateString = useMemo(() => {
    if (value && value.trim()) {
      return value.includes('T') ? value.split('T')[0] : value.split(' ')[0];
    }
    return formatDateISO(new Date());
  }, [value]);

  const initialTime = useMemo(() => {
    if (value && value.includes('T')) {
      const timePart = value.split('T')[1]?.slice(0, 5) || '12:00';
      const [hours, minutes] = timePart.split(':').map((num) => parseInt(num, 10));
      return {
        hour: isNaN(hours) ? 12 : Math.max(0, Math.min(23, hours)),
        minute: isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes)),
      };
    }
    const current = new Date();
    return { hour: current.getHours(), minute: current.getMinutes() };
  }, [value]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDateString);
  const [selectedHour, setSelectedHour] = useState<number>(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initialTime.minute);

  const initialParsedDate = parseISODate(initialDateString);
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialParsedDate.year) ? new Date().getFullYear() : initialParsedDate.year
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialParsedDate.month) ? new Date().getMonth() + 1 : initialParsedDate.month
  );
  const [pickerView, setPickerView] = useState<'calendar' | 'month-year'>('calendar');

  const todayDateString = useMemo(() => formatDateISO(new Date()), []);
  const yesterdayDateString = useMemo(() => addDays(todayDateString, -1), [todayDateString]);
  const sevenDaysAgoDateString = useMemo(() => addDays(todayDateString, -7), [todayDateString]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    const current = value && value.trim()
      ? (value.includes('T') ? value.split('T')[0] : value.split(' ')[0])
      : todayDateString;
    const parsed = parseISODate(current);
    setSelectedDate(current);
    setViewYear(isNaN(parsed.year) ? new Date().getFullYear() : parsed.year);
    setViewMonth(isNaN(parsed.month) ? new Date().getMonth() + 1 : parsed.month);
    setPickerView('calendar');
    if (value && value.includes('T')) {
      const timePart = value.split('T')[1]?.slice(0, 5) || '12:00';
      const [hours, minutes] = timePart.split(':').map((num) => parseInt(num, 10));
      setSelectedHour(isNaN(hours) ? 12 : Math.max(0, Math.min(23, hours)));
      setSelectedMinute(isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes)));
    } else {
      const now = new Date();
      setSelectedHour(now.getHours());
      setSelectedMinute(now.getMinutes());
    }
    setIsOpen(true);
  }, [disabled, value, todayDateString]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => Math.max(1900, prev - 1));
    } else {
      setViewMonth((prev) => prev - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => Math.min(2100, prev + 1));
    } else {
      setViewMonth((prev) => prev + 1);
    }
  }, [viewMonth]);

  const handleSelectDay = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    const { year, month } = parseISODate(dateStr);
    if (!isNaN(year) && !isNaN(month)) {
      setViewYear(year);
      setViewMonth(month);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    let finalValue = selectedDate;
    if (mode === 'datetime') {
      const formattedHour = String(selectedHour).padStart(2, '0');
      const formattedMinute = String(selectedMinute).padStart(2, '0');
      finalValue = `${selectedDate}T${formattedHour}:${formattedMinute}:00`;
    }
    onChange(finalValue);
    setIsOpen(false);
  }, [selectedDate, mode, selectedHour, selectedMinute, onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setIsOpen(false);
  }, [onChange]);

  const calendarDays = useMemo(() => {
    return getCalendarMatrix(viewYear, viewMonth, todayDateString);
  }, [viewYear, viewMonth, todayDateString]);

  const weekdays = useMemo(() => [
    t('datePicker.weekdays.sun', { defaultValue: 'CN' }),
    t('datePicker.weekdays.mon', { defaultValue: 'T2' }),
    t('datePicker.weekdays.tue', { defaultValue: 'T3' }),
    t('datePicker.weekdays.wed', { defaultValue: 'T4' }),
    t('datePicker.weekdays.thu', { defaultValue: 'T5' }),
    t('datePicker.weekdays.fri', { defaultValue: 'T6' }),
    t('datePicker.weekdays.sat', { defaultValue: 'T7' }),
  ], [t]);

  const monthNames = useMemo(() => [
    t('datePicker.months.1', { defaultValue: 'Tháng 1' }),
    t('datePicker.months.2', { defaultValue: 'Tháng 2' }),
    t('datePicker.months.3', { defaultValue: 'Tháng 3' }),
    t('datePicker.months.4', { defaultValue: 'Tháng 4' }),
    t('datePicker.months.5', { defaultValue: 'Tháng 5' }),
    t('datePicker.months.6', { defaultValue: 'Tháng 6' }),
    t('datePicker.months.7', { defaultValue: 'Tháng 7' }),
    t('datePicker.months.8', { defaultValue: 'Tháng 8' }),
    t('datePicker.months.9', { defaultValue: 'Tháng 9' }),
    t('datePicker.months.10', { defaultValue: 'Tháng 10' }),
    t('datePicker.months.11', { defaultValue: 'Tháng 11' }),
    t('datePicker.months.12', { defaultValue: 'Tháng 12' }),
  ], [t]);

  const displayString = useMemo(() => {
    return value ? formatDateDisplay(value, locale) : '';
  }, [value, locale]);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[
          styles.inputButton,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <MaterialIcons
          name="event"
          size={20}
          color={value ? Colors.primaryDark : Colors.light.textSecondary}
          style={styles.leftIcon}
        />

        <Text
          style={[
            styles.inputText,
            !value && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayString || placeholder || t('datePicker.placeholder', { defaultValue: 'Chọn ngày...' })}
        </Text>

        <View style={styles.rightActions}>
          {allowClear && Boolean(value) && !disabled && (
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                handleClear();
              }}
              style={styles.clearBtn}
            >
              <MaterialIcons name="close" size={16} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
          <MaterialIcons name="arrow-drop-down" size={22} color={Colors.light.textSecondary} />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialIcons name="calendar-month" size={22} color={Colors.primaryDark} />
                <Text style={styles.modalTitle}>
                  {mode === 'datetime'
                    ? t('datePicker.selectDateTime', { defaultValue: 'Chọn ngày & giờ' })
                    : t('datePicker.selectDate', { defaultValue: 'Chọn ngày' })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsOpen(false)}
              >
                <MaterialIcons name="close" size={20} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.presetContainer}>
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  selectedDate === todayDateString && styles.presetChipActive,
                ]}
                onPress={() => handleSelectDay(todayDateString)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedDate === todayDateString && styles.presetTextActive,
                  ]}
                >
                  {t('datePicker.today', { defaultValue: 'Hôm nay' })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  selectedDate === yesterdayDateString && styles.presetChipActive,
                ]}
                onPress={() => handleSelectDay(yesterdayDateString)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedDate === yesterdayDateString && styles.presetTextActive,
                  ]}
                >
                  {t('datePicker.yesterday', { defaultValue: 'Hôm qua' })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  selectedDate === sevenDaysAgoDateString && styles.presetChipActive,
                ]}
                onPress={() => handleSelectDay(sevenDaysAgoDateString)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedDate === sevenDaysAgoDateString && styles.presetTextActive,
                  ]}
                >
                  {t('datePicker.sevenDaysAgo', { defaultValue: '7 ngày trước' })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.navArrowBtn}
                onPress={handlePrevMonth}
              >
                <MaterialIcons name="chevron-left" size={24} color={Colors.light.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.monthYearSelector}
                onPress={() =>
                  setPickerView((prev) =>
                    prev === 'calendar' ? 'month-year' : 'calendar'
                  )
                }
              >
                <Text style={styles.monthYearText}>
                  {monthNames[viewMonth - 1]} {viewYear}
                </Text>
                <MaterialIcons
                  name={pickerView === 'month-year' ? 'arrow-drop-up' : 'arrow-drop-down'}
                  size={20}
                  color={Colors.primaryDark}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navArrowBtn}
                onPress={handleNextMonth}
              >
                <MaterialIcons name="chevron-right" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {pickerView === 'month-year' ? (
              <View style={styles.monthYearGridContainer}>
                <View style={styles.yearControlRow}>
                  <TouchableOpacity
                    style={styles.yearStepBtn}
                    onPress={() => setViewYear((prev) => Math.max(1900, prev - 1))}
                  >
                    <MaterialIcons name="remove" size={18} color={Colors.light.text} />
                  </TouchableOpacity>
                  <Text style={styles.yearDisplayTitle}>{viewYear}</Text>
                  <TouchableOpacity
                    style={styles.yearStepBtn}
                    onPress={() => setViewYear((prev) => Math.min(2100, prev + 1))}
                  >
                    <MaterialIcons name="add" size={18} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.monthsGrid}>
                  {monthNames.map((monthTitle, index) => {
                    const monthNumber = index + 1;
                    const isSelectedMonth = monthNumber === viewMonth;
                    return (
                      <TouchableOpacity
                        key={monthNumber}
                        style={[
                          styles.monthGridItem,
                          isSelectedMonth && styles.monthGridItemActive,
                        ]}
                        onPress={() => {
                          setViewMonth(monthNumber);
                          setPickerView('calendar');
                        }}
                      >
                        <Text
                          style={[
                            styles.monthGridText,
                            isSelectedMonth && styles.monthGridTextActive,
                          ]}
                        >
                          {monthTitle}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.calendarContainer}>
                <View style={styles.weekdaysRow}>
                  {weekdays.map((weekdayTitle, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.weekdayText,
                        index === 0 && styles.sundayText,
                      ]}
                    >
                      {weekdayTitle}
                    </Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {calendarDays.map((calendarItem, index) => {
                    const isSelected = calendarItem.dateStr === selectedDate;
                    const isDisabled = Boolean(
                      (minDate && calendarItem.dateStr < minDate) ||
                      (maxDate && calendarItem.dateStr > maxDate)
                    );

                    return (
                      <TouchableOpacity
                        key={`${calendarItem.dateStr}-${index}`}
                        style={[
                          styles.dayCell,
                          isSelected && styles.selectedDayCell,
                          calendarItem.isToday && !isSelected && styles.todayCell,
                          isDisabled && styles.disabledDayCell,
                        ]}
                        disabled={isDisabled}
                        onPress={() => handleSelectDay(calendarItem.dateStr)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !calendarItem.isCurrentMonth && styles.outsideMonthText,
                            calendarItem.isToday && !isSelected && styles.todayText,
                            isSelected && styles.selectedDayText,
                            isDisabled && styles.disabledDayText,
                          ]}
                        >
                          {calendarItem.day}
                        </Text>
                        {calendarItem.isToday && !isSelected && <View style={styles.todayDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {mode === 'datetime' && (
              <View style={styles.timeSection}>
                <Text style={styles.timeLabel}>
                  {t('datePicker.time', { defaultValue: 'Thời gian' })}
                </Text>
                <View style={styles.timeControlRow}>
                  <View style={styles.timeStepper}>
                    <TouchableOpacity
                      style={styles.timeStepBtn}
                      onPress={() => setSelectedHour((prev) => (prev > 0 ? prev - 1 : 23))}
                    >
                      <MaterialIcons name="remove" size={16} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.timeValueText}>
                      {String(selectedHour).padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.timeStepBtn}
                      onPress={() => setSelectedHour((prev) => (prev < 23 ? prev + 1 : 0))}
                    >
                      <MaterialIcons name="add" size={16} color={Colors.light.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.timeSeparator}>:</Text>

                  <View style={styles.timeStepper}>
                    <TouchableOpacity
                      style={styles.timeStepBtn}
                      onPress={() => setSelectedMinute((prev) => (prev > 0 ? prev - 5 : 55))}
                    >
                      <MaterialIcons name="remove" size={16} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.timeValueText}>
                      {String(selectedMinute).padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.timeStepBtn}
                      onPress={() => setSelectedMinute((prev) => (prev < 55 ? prev + 5 : 0))}
                    >
                      <MaterialIcons name="add" size={16} color={Colors.light.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <View style={styles.selectedSummaryRow}>
                <Text style={styles.selectedSummaryLabel}>
                  {t('datePicker.selectDate', { defaultValue: 'Ngày đã chọn' })}:
                </Text>
                <Text style={styles.selectedSummaryValue}>
                  {formatDateDisplay(selectedDate, locale)}
                  {mode === 'datetime'
                    ? ` ${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
                    : ''}
                </Text>
              </View>

              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>
                    {t('common.cancel', { defaultValue: 'Hủy' })}
                  </Text>
                </TouchableOpacity>

                {allowClear && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                  >
                    <Text style={styles.clearButtonText}>
                      {t('datePicker.clear', { defaultValue: 'Xóa' })}
                    </Text>
                  </TouchableOpacity>
                )}

                <Button
                  title={t('common.confirm', { defaultValue: 'Xác nhận' })}
                  variant="primary"
                  onPress={handleConfirm}
                  style={styles.confirmBtn}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  inputButton: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.light.backgroundElement,
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
    color: Colors.light.text,
  },
  placeholderText: {
    fontWeight: '400',
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
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
    backgroundColor: Colors.light.surface,
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
    color: Colors.light.text,
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
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  presetTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
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
    backgroundColor: Colors.light.backgroundElement,
  },
  monthYearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
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
    color: Colors.light.textSecondary,
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
    color: Colors.light.text,
  },
  outsideMonthText: {
    color: Colors.light.border,
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
    color: Colors.light.textSecondary,
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
    backgroundColor: Colors.light.backgroundElement,
  },
  yearDisplayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
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
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
  },
  monthGridItemActive: {
    backgroundColor: Colors.primaryDark,
  },
  monthGridText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  monthGridTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    marginBottom: 14,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 4,
  },
  timeStepBtn: {
    padding: 6,
  },
  timeValueText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    minWidth: 26,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
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
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
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
