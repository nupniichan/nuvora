import { Text, TouchableOpacity, View } from 'react-native';
import { DatePickerStyles } from './date-picker.styles';

export interface CalendarMatrixProps {
  calendarDays: {
    dateStr: string;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[];
  weekdays: string[];
  selectedDate: string;
  minDateOnly?: string;
  maxDateOnly?: string;
  onSelectDay: (dateStr: string) => void;
  styles: DatePickerStyles;
}

export function CalendarMatrix({
  calendarDays,
  weekdays,
  selectedDate,
  minDateOnly,
  maxDateOnly,
  onSelectDay,
  styles,
}: CalendarMatrixProps) {
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.weekdaysRow}>
        {weekdays.map((weekdayTitle, index) => (
          <Text
            key={index}
            style={[styles.weekdayText, index === 0 && styles.sundayText]}
          >
            {weekdayTitle}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((calendarItem, index) => {
          const isSelected = calendarItem.dateStr === selectedDate;
          const isDisabled = Boolean(
            (minDateOnly && calendarItem.dateStr < minDateOnly) ||
            (maxDateOnly && calendarItem.dateStr > maxDateOnly)
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
              onPress={() => onSelectDay(calendarItem.dateStr)}
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
  );
}