import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Account } from '../lib/api';
import { AppPalette } from '../constants/theme';

export function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: number | null;
  onChange: (accountId: number) => void;
}) {
  return (
    <>
      <Text style={styles.label}>Account</Text>
      <View style={styles.row}>
        {accounts.length === 0 ? (
          <Text style={styles.empty}>No accounts yet. Add one in the Accounts tab.</Text>
        ) : (
          accounts.map((account) => {
            const isActive = account.id === value;

            return (
              <Pressable
                key={account.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: isActive }}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => onChange(account.id)}>
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{account.name}</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: AppPalette.accent,
    fontSize: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  chipText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  chipTextActive: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  empty: {
    color: AppPalette.muted,
  },
});
