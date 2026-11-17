import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Note } from '../lib/api';
import { AppPalette } from '../constants/theme';

export function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const isEdited = note.updatedAt !== note.createdAt;

  return (
    <Pressable accessibilityRole="button" style={styles.card} onPress={onPress}>
      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={2}>
          {note.content}
        </Text>
        <Text style={styles.date}>
          {new Date(note.createdAt).toLocaleString()}
          {isEdited ? ' · edited' : ''}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={AppPalette.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppPalette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 14,
    marginBottom: 10,
  },
  body: {
    flex: 1,
  },
  text: {
    color: AppPalette.text,
    fontSize: 15,
    lineHeight: 21,
  },
  date: {
    color: AppPalette.muted,
    fontSize: 12,
    marginTop: 6,
  },
});
