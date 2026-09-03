import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog helper.
 * On Web: uses window.confirm (or fallback).
 * On Native (Android/iOS): uses native Alert.alert with cancel/confirm buttons.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = 'Xác nhận',
  cancelText: string = 'Hủy'
): void {
  if (Platform.OS === 'web') {
    const fullMessage = title ? `${title}\n\n${message}` : message;
    const ok = typeof window !== 'undefined' ? window.confirm(fullMessage) : true;
    if (ok) {
      Promise.resolve(onConfirm()).catch((err) => {
        console.error('Error executing confirmed action:', err);
      });
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    {
      text: confirmText,
      style: 'destructive',
      onPress: () => {
        Promise.resolve(onConfirm()).catch((err) => {
          console.error('Error executing confirmed action:', err);
        });
      },
    },
  ]);
}

/**
 * Cross-platform alert message helper.
 */
export function alertMessage(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title ? `${title}: ` : ''}${message}`);
    } else {
      console.log(`${title}: ${message}`);
    }
    return;
  }

  Alert.alert(title, message);
}
