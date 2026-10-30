import { Colors } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { DatePickerStyles } from './date-picker.styles';

export interface TimePickerWheelProps {
  selectedHour: number;
  selectedMinute: number;
  onSetTimeToNow: () => void;
  hourIncProps: { onPressIn: () => void; onPressOut: () => void; onPress: () => void };
  hourDecProps: { onPressIn: () => void; onPressOut: () => void; onPress: () => void };
  minIncProps: { onPressIn: () => void; onPressOut: () => void; onPress: () => void };
  minDecProps: { onPressIn: () => void; onPressOut: () => void; onPress: () => void };
  styles: DatePickerStyles;
  theme: typeof Colors.light;
  t: (key: string, options?: { defaultValue: string }) => string;
}

export function TimePickerWheel({
  selectedHour,
  selectedMinute,
  onSetTimeToNow,
  hourIncProps,
  hourDecProps,
  minIncProps,
  minDecProps,
  styles,
  theme,
  t,
}: TimePickerWheelProps) {
  return (
    <View style={styles.timeSection}>
      <View style={styles.timeLeftCol}>
        <View style={styles.timeLabelRow}>
          <MaterialIcons name="access-time" size={16} color={theme.textSecondary} />
          <Text style={styles.timeLabel}>
            {t('datePicker.time', { defaultValue: 'Thời gian' })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.timeNowBtn}
          onPress={onSetTimeToNow}
          accessibilityRole="button"
          accessibilityLabel={t('datePicker.now', { defaultValue: 'Hiện tại' })}
        >
          <MaterialIcons name="schedule" size={12} color={Colors.primaryDark} />
          <Text style={styles.timeNowText}>
            {t('datePicker.now', { defaultValue: 'Hiện tại' })}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timeControlRow}>
        {/* Hour stepper */}
        <View style={styles.timeStepper}>
          <TouchableOpacity
            style={styles.timeStepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('datePicker.decrementHour', { defaultValue: 'Giảm giờ' })}
            {...hourDecProps}
          >
            <MaterialIcons name="remove" size={16} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.timeValueText}>
            {String(selectedHour).padStart(2, '0')}
          </Text>
          <TouchableOpacity
            style={styles.timeStepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('datePicker.incrementHour', { defaultValue: 'Tăng giờ' })}
            {...hourIncProps}
          >
            <MaterialIcons name="add" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.timeSeparator}>:</Text>

        {/* Minute stepper */}
        <View style={styles.timeStepper}>
          <TouchableOpacity
            style={styles.timeStepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('datePicker.decrementMinute', { defaultValue: 'Giảm phút' })}
            {...minDecProps}
          >
            <MaterialIcons name="remove" size={16} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.timeValueText}>
            {String(selectedMinute).padStart(2, '0')}
          </Text>
          <TouchableOpacity
            style={styles.timeStepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('datePicker.incrementMinute', { defaultValue: 'Tăng phút' })}
            {...minIncProps}
          >
            <MaterialIcons name="add" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}