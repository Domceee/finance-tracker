import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { AppPalette } from '../constants/theme';
import { FontFamily } from '../constants/fonts';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const destructive = options?.destructive ?? true;

  return (
    <Modal visible={options !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        {options ? (
          <Animated.View entering={ZoomIn.duration(180)} style={styles.card}>
            <Text style={styles.title}>{options.title}</Text>
            <Text style={styles.message}>{options.message}</Text>

            <View style={styles.actions}>
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, destructive ? styles.destructive : styles.primary]}
                onPress={onConfirm}>
                <Text style={styles.confirmText}>{options.confirmLabel ?? 'Confirm'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: AppPalette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppPalette.elevated,
    padding: 20,
  },
  title: {
    color: AppPalette.text,
    fontSize: 18,
    fontFamily: FontFamily.bold,
    marginBottom: 8,
  },
  message: {
    color: AppPalette.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  destructive: {
    backgroundColor: AppPalette.danger,
  },
  primary: {
    backgroundColor: AppPalette.accent,
  },
  confirmText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
});
