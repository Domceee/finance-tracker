import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getCategories, getRates, type TransactionCategory } from '../lib/api';
import { formatCategoryLabel } from '../lib/format';
import { AppPalette } from '../constants/theme';

const SHOWN_CURRENCIES = ['USD', 'GBP', 'PLN', 'SEK', 'NOK', 'CHF', 'JPY'];

export default function GuestScreen() {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesError, setRatesError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPublicData() {
      const [categoriesResult, ratesResult] = await Promise.allSettled([
        getCategories(),
        getRates(),
      ]);

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value);
      }

      if (ratesResult.status === 'fulfilled') {
        setRates(ratesResult.value.rates);
      } else {
        setRatesError('Exchange rates are not available right now.');
      }

      setIsLoading(false);
    }

    loadPublicData();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Browsing as guest</Text>
      <Text style={styles.subtitle}>
        Sign in to track your own accounts, transactions and notes.
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={AppPalette.accent} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Exchange rates · 1 EUR</Text>
          <View style={styles.card}>
            {rates ? (
              SHOWN_CURRENCIES.filter((code) => rates[code] !== undefined).map((code) => (
                <View key={code} style={styles.rateRow}>
                  <Text style={styles.rateCode}>{code}</Text>
                  <Text style={styles.rateValue}>{rates[code]!.toFixed(4)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>{ratesError}</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Transaction categories</Text>
          <View style={styles.chipGrid}>
            {categories.map((category) => (
              <View key={category} style={styles.chip}>
                <Text style={styles.chipText}>{formatCategoryLabel(category)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Pressable style={styles.primaryButton} onPress={() => router.replace('/login')}>
        <Text style={styles.primaryButtonText}>Sign in</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => router.push('/register')}>
        <Text style={styles.secondaryButtonText}>Create an account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppPalette.void,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 16,
  },
  backText: {
    color: AppPalette.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppPalette.text,
    marginBottom: 8,
  },
  subtitle: {
    color: AppPalette.accent,
    marginBottom: 24,
  },
  sectionTitle: {
    color: AppPalette.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: AppPalette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 16,
    marginBottom: 24,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rateCode: {
    color: AppPalette.text,
    fontWeight: '700',
  },
  rateValue: {
    color: AppPalette.text,
    fontVariant: ['tabular-nums'],
  },
  mutedText: {
    color: AppPalette.muted,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  chip: {
    borderWidth: 1,
    borderColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: AppPalette.accent,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
});
