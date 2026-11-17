import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from './brand-logo';
import { NavLink } from './nav-link';
import { NAV_ITEMS, isActiveNavItem } from '../constants/nav-items';
import { CONTENT_MAX_WIDTH } from '../constants/layout';
import { AppPalette } from '../constants/theme';
import { FontFamily } from '../constants/fonts';
import { useIsWide } from '../hooks/use-is-wide';

export function AppHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const isWide = useIsWide();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.inner}>
        <Pressable accessibilityRole="link" style={styles.brand} onPress={() => router.navigate('/')}>
          <BrandLogo size={34} />
          <Text style={styles.brandText}>Finance</Text>
        </Pressable>

        {isWide ? (
          <View style={styles.links}>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} variant="inline" active={isActiveNavItem(pathname, item)} />
            ))}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={styles.menuButton}
            onPress={onOpenMenu}>
            <MaterialIcons name="menu" size={26} color={AppPalette.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: AppPalette.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppPalette.elevated,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  inner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    color: AppPalette.text,
    fontFamily: FontFamily.bold,
    fontSize: 20,
  },
  links: {
    flexDirection: 'row',
    gap: 4,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
  },
});
