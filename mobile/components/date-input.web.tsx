import { StyleSheet, Text, View } from 'react-native';
import { fromDateInputValue, toDateInputValue } from '../lib/dates';
import { AppPalette } from '../constants/theme';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: AppPalette.text,
  colorScheme: 'dark',
  fontSize: 16,
  fontWeight: 600,
  fontFamily: 'inherit',
  padding: 0,
} as const;

export function DateInput({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Date</Text>
      <input
        type="date"
        aria-label="Date"
        min="1900-01-01"
        max="2100-12-31"
        value={toDateInputValue(value)}
        onChange={(event) => {
          const next = fromDateInputValue(event.target.value);

          if (next) {
            onChange(next);
          }
        }}
        style={inputStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: AppPalette.surface,
    borderColor: AppPalette.muted,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    color: AppPalette.accent,
    fontSize: 12,
    marginBottom: 6,
  },
});
