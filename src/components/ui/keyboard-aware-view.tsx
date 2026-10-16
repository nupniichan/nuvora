import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, ViewStyle } from 'react-native';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
  scrollEnabled?: boolean;
}

export function KeyboardAwareView({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  scrollEnabled = true,
}: KeyboardAwareViewProps) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[styles.flex, style]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
