import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EXPENSE_TRANSACTION_CATEGORIES, type TransactionCategory } from '../lib/api';
import { formatCategoryLabel } from '../lib/format';
import { AppPalette } from '../constants/theme';
import { FontFamily } from '../constants/fonts';

export function CategoryPicker({
  value,
  onChange,
}: {
  value: TransactionCategory;
  onChange: (category: TransactionCategory) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.field} onPress={() => setIsOpen(true)}>
        <Text style={styles.label}>Category</Text>
        <Text style={styles.value}>{formatCategoryLabel(value)}</Text>
      </Pressable>

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={() => setIsOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Choose Category</Text>

            <ScrollView contentContainerStyle={styles.list}>
              {EXPENSE_TRANSACTION_CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.option, item === value && styles.optionActive]}
                  onPress={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}>
                  <Text style={[styles.optionText, item === value && styles.optionTextActive]}>
                    {formatCategoryLabel(item)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.cancel} onPress={() => setIsOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  value: {
    color: AppPalette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 7, 16, 0.88)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: AppPalette.surface,
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#211C33',
    maxHeight: '75%',
  },
  title: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    color: AppPalette.text,
    marginBottom: 16,
  },
  list: {
    gap: 10,
    paddingBottom: 12,
  },
  option: {
    backgroundColor: AppPalette.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionActive: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  optionText: {
    color: AppPalette.text,
    fontWeight: '600',
    fontSize: 16,
  },
  optionTextActive: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  cancel: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: AppPalette.accent,
    fontWeight: '600',
  },
});
