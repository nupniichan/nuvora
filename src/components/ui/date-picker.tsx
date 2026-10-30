import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useHoldRepeat } from '@/hooks/use-hold-repeat';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  formatDateDisplay,
  formatDateISO,
  getCalendarMatrix,
  parseISODate,
} from '@/shared/date-utils';

import { CalendarMatrix } from './date-picker/calendar-matrix';
import { createDatePickerStyles } from './date-picker/date-picker.styles';
import { TimePickerWheel } from './date-picker/time-picker-wheel';

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

function parseDateString(val?: string | null): string {
  if (val && val.trim()) {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.split('T')[0].split(' ')[0];
    }
  }
  return formatDateISO(new Date());
}

function parseTimeString(val?: string | null): { hour: number; minute: number } {
  if (val && val.trim()) {
    let timePart = '';
    const trimmed = val.trim();
    if (trimmed.includes('T')) {
      timePart = trimmed.split('T')[1]?.slice(0, 5) || '';
    } else if (trimmed.includes(':')) {
      const parts = trimmed.split(/\s+/);
      timePart = (parts.length > 1 ? parts[1] : parts[0]).slice(0, 5);
    }
    if (timePart) {
      const [h, m] = timePart.split(':').map((num) => parseInt(num, 10));
      if (!isNaN(h) && !isNaN(m)) {
        return {
          hour: Math.max(0, Math.min(23, h)),
          minute: Math.max(0, Math.min(59, m)),
        };
      }
    }
  }
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
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
  const theme = useTheme();
  const styles = createDatePickerStyles(theme);
  const locale = i18n.language || 'vi';

  const [isOpen, setIsOpen] = useState(false);

  const initialDateString = useMemo(() => parseDateString(value), [value]);
  const initialTime = useMemo(() => parseTimeString(value), [value]);

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

  const minDateOnly = useMemo(() => {
    if (!minDate) return undefined;
    return minDate.includes('T') ? minDate.split('T')[0] : minDate.split(' ')[0];
  }, [minDate]);

  const maxDateOnly = useMemo(() => {
    if (!maxDate) return undefined;
    return maxDate.includes('T') ? maxDate.split('T')[0] : maxDate.split(' ')[0];
  }, [maxDate]);

  const minYear = minDateOnly ? parseInt(minDateOnly.split('-')[0], 10) : 1900;
  const minMonth = minDateOnly ? parseInt(minDateOnly.split('-')[1], 10) : 1;
  const maxYear = maxDateOnly ? parseInt(maxDateOnly.split('-')[0], 10) : 2100;
  const maxMonth = maxDateOnly ? parseInt(maxDateOnly.split('-')[1], 10) : 12;

  const canPrevMonth = useMemo(() => {
    if (!minDateOnly) return viewYear > 1900;
    const currentMetric = viewYear * 12 + viewMonth;
    const minMetric = minYear * 12 + minMonth;
    return currentMetric > minMetric;
  }, [minDateOnly, viewYear, viewMonth, minYear, minMonth]);

  const canNextMonth = useMemo(() => {
    if (!maxDateOnly) return viewYear < 2100;
    const currentMetric = viewYear * 12 + viewMonth;
    const maxMetric = maxYear * 12 + maxMonth;
    return currentMetric < maxMetric;
  }, [maxDateOnly, viewYear, viewMonth, maxYear, maxMonth]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    const current = parseDateString(value);
    const parsed = parseISODate(current);
    setSelectedDate(current);
    setViewYear(isNaN(parsed.year) ? new Date().getFullYear() : parsed.year);
    setViewMonth(isNaN(parsed.month) ? new Date().getMonth() + 1 : parsed.month);
    setPickerView('calendar');

    const parsedTime = parseTimeString(value);
    setSelectedHour(parsedTime.hour);
    setSelectedMinute(parsedTime.minute);

    setIsOpen(true);
  }, [disabled, value]);

  const handlePrevMonth = useCallback(() => {
    if (!canPrevMonth) return;
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => Math.max(minYear, prev - 1));
    } else {
      setViewMonth((prev) => prev - 1);
    }
  }, [canPrevMonth, viewMonth, minYear]);

  const handleNextMonth = useCallback(() => {
    if (!canNextMonth) return;
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => Math.min(maxYear, prev + 1));
    } else {
      setViewMonth((prev) => prev + 1);
    }
  }, [canNextMonth, viewMonth, maxYear]);

  const handleSelectDay = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    const { year, month } = parseISODate(dateStr);
    if (!isNaN(year) && !isNaN(month)) {
      setViewYear(year);
      setViewMonth(month);
    }
  }, []);

  const handleIncrementHour = useCallback(() => {
    setSelectedHour((prev) => (prev >= 23 ? 0 : prev + 1));
  }, []);

  const handleDecrementHour = useCallback(() => {
    setSelectedHour((prev) => (prev <= 0 ? 23 : prev - 1));
  }, []);

  const handleIncrementMinute = useCallback(() => {
    setSelectedMinute((prev) => (prev >= 59 ? 0 : prev + 1));
  }, []);

  const handleDecrementMinute = useCallback(() => {
    setSelectedMinute((prev) => (prev <= 0 ? 59 : prev - 1));
  }, []);

  const handleSetTimeToNow = useCallback(() => {
    const now = new Date();
    setSelectedHour(now.getHours());
    setSelectedMinute(now.getMinutes());
  }, []);

  const hourIncProps = useHoldRepeat(handleIncrementHour);
  const hourDecProps = useHoldRepeat(handleDecrementHour);
  const minIncProps = useHoldRepeat(handleIncrementMinute);
  const minDecProps = useHoldRepeat(handleDecrementMinute);

  const handleConfirm = useCallback(() => {
    const formattedHour = String(selectedHour).padStart(2, '0');
    const formattedMinute = String(selectedMinute).padStart(2, '0');
    let finalValue = selectedDate;

    if (mode === 'datetime') {
      finalValue = `${selectedDate}T${formattedHour}:${formattedMinute}:00`;
    } else if (mode === 'time') {
      finalValue = `${formattedHour}:${formattedMinute}:00`;
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

  const weekdays = useMemo(
    () => [
      t('datePicker.weekdays.sun', { defaultValue: 'CN' }),
      t('datePicker.weekdays.mon', { defaultValue: 'T2' }),
      t('datePicker.weekdays.tue', { defaultValue: 'T3' }),
      t('datePicker.weekdays.wed', { defaultValue: 'T4' }),
      t('datePicker.weekdays.thu', { defaultValue: 'T5' }),
      t('datePicker.weekdays.fri', { defaultValue: 'T6' }),
      t('datePicker.weekdays.sat', { defaultValue: 'T7' }),
    ],
    [t]
  );

  const monthNames = useMemo(
    () => [
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
    ],
    [t]
  );

  const displayString = useMemo(() => {
    if (!value) return '';
    if (mode === 'time') {
      if (value.includes('T')) {
        return value.split('T')[1]?.slice(0, 5) || value;
      }
      return value.slice(0, 5);
    }
    return formatDateDisplay(value, locale);
  }, [value, locale, mode]);

  const isTodayDisabled = Boolean(
    (minDateOnly && todayDateString < minDateOnly) ||
      (maxDateOnly && todayDateString > maxDateOnly)
  );
  const isYesterdayDisabled = Boolean(
    (minDateOnly && yesterdayDateString < minDateOnly) ||
      (maxDateOnly && yesterdayDateString > maxDateOnly)
  );
  const isSevenDaysAgoDisabled = Boolean(
    (minDateOnly && sevenDaysAgoDateString < minDateOnly) ||
      (maxDateOnly && sevenDaysAgoDateString > maxDateOnly)
  );

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
          name={mode === 'time' ? 'access-time' : 'event'}
          size={20}
          color={value ? Colors.primaryDark : theme.textSecondary}
          style={styles.leftIcon}
        />

        <Text style={[styles.inputText, !value && styles.placeholderText]} numberOfLines={1}>
          {displayString ||
            placeholder ||
            (mode === 'time'
              ? t('datePicker.selectTime', { defaultValue: 'Chọn giờ...' })
              : t('datePicker.placeholder', { defaultValue: 'Chọn ngày...' }))}
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
              <MaterialIcons name="close" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          <MaterialIcons name="arrow-drop-down" size={22} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialIcons
                  name={mode === 'time' ? 'access-time' : 'calendar-month'}
                  size={22}
                  color={Colors.primaryDark}
                />
                <Text style={styles.modalTitle}>
                  {mode === 'datetime'
                    ? t('datePicker.selectDateTime', { defaultValue: 'Chọn ngày & giờ' })
                    : mode === 'time'
                    ? t('datePicker.selectTime', { defaultValue: 'Chọn giờ' })
                    : t('datePicker.selectDate', { defaultValue: 'Chọn ngày' })}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsOpen(false)}>
                <MaterialIcons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {mode !== 'time' && (
              <View style={styles.presetContainer}>
                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    selectedDate === todayDateString && styles.presetChipActive,
                    isTodayDisabled && styles.presetChipDisabled,
                  ]}
                  disabled={isTodayDisabled}
                  onPress={() => handleSelectDay(todayDateString)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      selectedDate === todayDateString && styles.presetTextActive,
                      isTodayDisabled && styles.presetTextDisabled,
                    ]}
                  >
                    {t('datePicker.today', { defaultValue: 'Hôm nay' })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    selectedDate === yesterdayDateString && styles.presetChipActive,
                    isYesterdayDisabled && styles.presetChipDisabled,
                  ]}
                  disabled={isYesterdayDisabled}
                  onPress={() => handleSelectDay(yesterdayDateString)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      selectedDate === yesterdayDateString && styles.presetTextActive,
                      isYesterdayDisabled && styles.presetTextDisabled,
                    ]}
                  >
                    {t('datePicker.yesterday', { defaultValue: 'Hôm qua' })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    selectedDate === sevenDaysAgoDateString && styles.presetChipActive,
                    isSevenDaysAgoDisabled && styles.presetChipDisabled,
                  ]}
                  disabled={isSevenDaysAgoDisabled}
                  onPress={() => handleSelectDay(sevenDaysAgoDateString)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      selectedDate === sevenDaysAgoDateString && styles.presetTextActive,
                      isSevenDaysAgoDisabled && styles.presetTextDisabled,
                    ]}
                  >
                    {t('datePicker.sevenDaysAgo', { defaultValue: '7 ngày trước' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode !== 'time' && (
              <>
                <View style={styles.navRow}>
                  <TouchableOpacity
                    style={[styles.navArrowBtn, !canPrevMonth && styles.navArrowBtnDisabled]}
                    disabled={!canPrevMonth}
                    onPress={handlePrevMonth}
                  >
                    <MaterialIcons
                      name="chevron-left"
                      size={24}
                      color={canPrevMonth ? theme.text : theme.border}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.monthYearSelector}
                    onPress={() =>
                      setPickerView((prev) => (prev === 'calendar' ? 'month-year' : 'calendar'))
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
                    style={[styles.navArrowBtn, !canNextMonth && styles.navArrowBtnDisabled]}
                    disabled={!canNextMonth}
                    onPress={handleNextMonth}
                  >
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={canNextMonth ? theme.text : theme.border}
                    />
                  </TouchableOpacity>
                </View>

                {pickerView === 'month-year' ? (
                  <View style={styles.monthYearGridContainer}>
                    <View style={styles.yearControlRow}>
                      <TouchableOpacity
                        style={[styles.yearStepBtn, viewYear <= minYear && styles.navArrowBtnDisabled]}
                        disabled={viewYear <= minYear}
                        onPress={() => setViewYear((prev) => Math.max(minYear, prev - 1))}
                      >
                        <MaterialIcons
                          name="remove"
                          size={18}
                          color={viewYear <= minYear ? theme.border : theme.text}
                        />
                      </TouchableOpacity>
                      <Text style={styles.yearDisplayTitle}>{viewYear}</Text>
                      <TouchableOpacity
                        style={[styles.yearStepBtn, viewYear >= maxYear && styles.navArrowBtnDisabled]}
                        disabled={viewYear >= maxYear}
                        onPress={() => setViewYear((prev) => Math.min(maxYear, prev + 1))}
                      >
                        <MaterialIcons
                          name="add"
                          size={18}
                          color={viewYear >= maxYear ? theme.border : theme.text}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.monthsGrid}>
                      {monthNames.map((monthTitle, index) => {
                        const monthNumber = index + 1;
                        const isSelectedMonth = monthNumber === viewMonth;
                        const isMonthDisabled =
                          (viewYear === minYear && monthNumber < minMonth) ||
                          (viewYear === maxYear && monthNumber > maxMonth);

                        return (
                          <TouchableOpacity
                            key={monthNumber}
                            style={[
                              styles.monthGridItem,
                              isSelectedMonth && styles.monthGridItemActive,
                              isMonthDisabled && styles.monthGridItemDisabled,
                            ]}
                            disabled={isMonthDisabled}
                            onPress={() => {
                              setViewMonth(monthNumber);
                              setPickerView('calendar');
                            }}
                          >
                            <Text
                              style={[
                                styles.monthGridText,
                                isSelectedMonth && styles.monthGridTextActive,
                                isMonthDisabled && styles.monthGridTextDisabled,
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
                  <CalendarMatrix
                    calendarDays={calendarDays}
                    weekdays={weekdays}
                    selectedDate={selectedDate}
                    minDateOnly={minDateOnly}
                    maxDateOnly={maxDateOnly}
                    onSelectDay={handleSelectDay}
                    styles={styles}
                  />
                )}
              </>
            )}

            {(mode === 'datetime' || mode === 'time') && (
              <TimePickerWheel
                selectedHour={selectedHour}
                selectedMinute={selectedMinute}
                onSetTimeToNow={handleSetTimeToNow}
                hourIncProps={hourIncProps}
                hourDecProps={hourDecProps}
                minIncProps={minIncProps}
                minDecProps={minDecProps}
                styles={styles}
                theme={theme}
                t={t}
              />
            )}

            <View style={styles.modalFooter}>
              <View style={styles.selectedSummaryRow}>
                <Text style={styles.selectedSummaryLabel}>
                  {mode === 'time'
                    ? `${t('datePicker.selectTime', { defaultValue: 'Giờ đã chọn' })}:`
                    : `${t('datePicker.selectDate', { defaultValue: 'Ngày đã chọn' })}:`}
                </Text>
                <Text style={styles.selectedSummaryValue}>
                  {mode === 'time'
                    ? `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
                    : `${formatDateDisplay(selectedDate, locale)}${
                        mode === 'datetime'
                          ? ` ${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
                          : ''
                      }`}
                </Text>
              </View>

              <View style={styles.footerButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsOpen(false)}>
                  <Text style={styles.cancelButtonText}>
                    {t('common.cancel', { defaultValue: 'Hủy' })}
                  </Text>
                </TouchableOpacity>

                {allowClear && (
                  <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
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
