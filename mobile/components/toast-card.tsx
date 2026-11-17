import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { AppPalette } from '../constants/theme';

export type ToastKind = 'success' | 'error' | 'info';

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

const ACCENTS: Record<ToastKind, string> = {
  success: AppPalette.success,
  error: AppPalette.danger,
  info: AppPalette.accent,
};

export function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.card, { borderLeftColor: ACCENTS[toast.kind] }]}>
      <Pressable accessibilityRole="alert" onPress={() => onDismiss(toast.id)}>
        <Text style={styles.message}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: AppPalette.elevated,
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  message: {
    color: AppPalette.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
