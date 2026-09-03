import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/theme';

export const PRESET_COLORS = [
  '#EF5350', // Red
  '#EC407A', // Pink
  '#AB47BC', // Purple
  '#7E57C2', // Deep Purple
  '#5C6BC0', // Indigo
  '#42A5F5', // Blue
  '#29B6F6', // Light Blue
  '#26C6DA', // Cyan
  '#26A69A', // Teal
  '#4CAF7D', // Emerald Green
  '#66BB6A', // Green
  '#9CCC65', // Light Green
  '#D4E157', // Lime
  '#FFEE58', // Yellow
  '#FFCA28', // Amber
  '#FFA726', // Orange
  '#FF7043', // Deep Orange
  '#8D6E63', // Brown
  '#78909C', // Blue Grey
  '#37474F', // Dark Charcoal
  '#9999FF', // Periwinkle / Brand Purple
  '#F89E62', // Brand Orange Accent
  '#4A148C', // Deep Violet
  '#00695C', // Deep Teal
];

interface ColorPickerProps {
  label?: string;
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export function ColorPicker({
  label,
  selectedColor,
  onSelectColor,
}: ColorPickerProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {PRESET_COLORS.map((color) => {
          const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
          return (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                isSelected && styles.selectedCircle,
              ]}
              activeOpacity={0.8}
              onPress={() => onSelectColor(color)}
            >
              {isSelected && (
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
});
