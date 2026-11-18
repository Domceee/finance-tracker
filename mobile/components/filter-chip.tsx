import { Pressable, StyleSheet, Text } from 'react-native';
import { AppPalette } from '../constants/theme';

export function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ hovered }) => [styles.chip, hovered && !active && styles.chipHovered, active && styles.chipActive]}
      onPress={onPress}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipHovered: {
    borderColor: AppPalette.accent,
  },
  chipActive: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  text: {
    color: AppPalette.text,
    fontWeight: '600',
    fontSize: 13,
  },
  textActive: {
    color: AppPalette.void,
    fontWeight: '700',
  },
});
