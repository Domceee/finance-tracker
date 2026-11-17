import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { atNoon } from '../lib/dates';
import { AppPalette } from '../constants/theme';

export function DateInput({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }

    if (event.type === 'set' && selected) {
      onChange(atNoon(selected));
    }
  }

  return (
    <View>
      <Pressable style={styles.field} onPress={() => setIsOpen((open) => !open)}>
        <Text style={styles.label}>Date</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value.toLocaleDateString()}</Text>
          <MaterialIcons name="calendar-today" size={18} color={AppPalette.accent} />
        </View>
      </Pressable>

      {isOpen ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant="dark"
          maximumDate={new Date(2100, 11, 31)}
          minimumDate={new Date(1900, 0, 1)}
          onChange={handleChange}
        />
      ) : null}
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
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: {
    color: AppPalette.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
