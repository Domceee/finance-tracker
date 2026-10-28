import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { deleteAdminUser, getAdminUsers, updateAdminUser, type AdminUser } from '../../lib/api';
import { confirmAction } from '../../lib/confirm';
import { useAuth } from '../../providers/auth-provider';
import { AppPalette } from '../../constants/theme';

export default function AdminUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdmin = currentUser?.role === 'ADMIN';

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setError('');

    try {
      setIsLoading(true);
      setUsers(await getAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  function handleToggleRole(target: AdminUser) {
    const nextRole = target.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const label = nextRole === 'ADMIN' ? 'Make admin' : 'Remove admin';

    confirmAction(label, `${label} for ${target.email}?`, label, async () => {
      setError('');

      try {
        const updated = await updateAdminUser(target.id, { role: nextRole });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update user');
      }
    });
  }

  function handleDelete(target: AdminUser) {
    confirmAction(
      'Delete User',
      `Delete ${target.email} and all of their data? This cannot be undone.`,
      'Delete',
      async () => {
        setError('');

        try {
          await deleteAdminUser(target.id);
          setUsers((prev) => prev.filter((u) => u.id !== target.id));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete user');
        }
      },
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Users</Text>

      {!isAdmin ? (
        <Text style={styles.emptyText}>Only admins can manage users.</Text>
      ) : isLoading ? (
        <ActivityIndicator size="large" color={AppPalette.accent} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            error ? <Text style={styles.errorText}>{error}</Text> : null
          }
          renderItem={({ item }) => {
            const isSelf = item.id === currentUser?.id;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardText}>
                    <Text style={styles.itemTitle}>{item.name ?? 'No name'}</Text>
                    <Text style={styles.itemSubtitle}>{item.email}</Text>
                  </View>
                  <Text style={item.role === 'ADMIN' ? styles.adminBadge : styles.userBadge}>
                    {item.role === 'ADMIN' ? 'Admin' : 'User'}
                  </Text>
                </View>

                <Text style={styles.meta}>
                  {item.isVerified ? 'Verified' : 'Not verified'} · {item.currency}
                  {isSelf ? ' · You' : ''}
                </Text>

                {isSelf ? null : (
                  <View style={styles.actions}>
                    <Pressable style={styles.actionButton} onPress={() => handleToggleRole(item)}>
                      <Text style={styles.actionText}>
                        {item.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.dangerButton} onPress={() => handleDelete(item)}>
                      <Text style={styles.dangerText}>Delete</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppPalette.void,
    padding: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 12,
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
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: AppPalette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppPalette.text,
  },
  itemSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: AppPalette.accent,
  },
  adminBadge: {
    color: AppPalette.void,
    backgroundColor: AppPalette.accent,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  userBadge: {
    color: AppPalette.accent,
    backgroundColor: AppPalette.elevated,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  meta: {
    marginTop: 10,
    fontSize: 12,
    color: AppPalette.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppPalette.accent,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: {
    color: AppPalette.accent,
    fontWeight: '700',
  },
  dangerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppPalette.danger,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerText: {
    color: AppPalette.danger,
    fontWeight: '700',
  },
  errorText: {
    color: AppPalette.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: AppPalette.accent,
    marginTop: 40,
  },
});
