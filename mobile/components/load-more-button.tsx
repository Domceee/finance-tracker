import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { AppPalette } from '../constants/theme';

export function LoadMoreButton({
  shown,
  total,
  hasMore,
  isLoading,
  onPress,
}: {
  shown: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  if (total === 0) {
    return null;
  }

  if (!hasMore) {
    return <Text style={styles.done}>Showing all {total}</Text>;
  }

  return (
    <Pressable style={[styles.button, isLoading && styles.disabled]} disabled={isLoading} onPress={onPress}>
      {isLoading ? (
        <ActivityIndicator color={AppPalette.accent} />
      ) : (
        <Text style={styles.text}>
          Load more · {shown} of {total}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: AppPalette.accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: AppPalette.accent,
    fontWeight: '700',
  },
  done: {
    textAlign: 'center',
    color: AppPalette.muted,
    fontSize: 12,
    marginTop: 8,
  },
});
