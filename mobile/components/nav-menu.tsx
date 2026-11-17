import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavLink } from './nav-link';
import { NAV_ITEMS, isActiveNavItem } from '../constants/nav-items';
import { AppPalette } from '../constants/theme';
import { FontFamily } from '../constants/fonts';
import { useAuth } from '../providers/auth-provider';

const PANEL_MAX_WIDTH = 320;

export function NavMenu({ onClose }: { onClose: () => void }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
        <Pressable accessibilityLabel="Close menu" style={styles.backdrop} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInRight.duration(250)}
        exiting={SlideOutRight.duration(200)}
        style={[
          styles.panel,
          { width: Math.min(width * 0.8, PANEL_MAX_WIDTH), paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Menu</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close menu" style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={AppPalette.text} />
          </Pressable>
        </View>

        <View style={styles.links}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              variant="menu"
              active={isActiveNavItem(pathname, item)}
              onNavigate={onClose}
            />
          ))}
        </View>

        {user ? <Text style={styles.signedIn}>Signed in as {user.email}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppPalette.surface,
    borderLeftWidth: 1,
    borderLeftColor: AppPalette.elevated,
    paddingHorizontal: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    color: AppPalette.text,
    fontFamily: FontFamily.bold,
    fontSize: 22,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
  },
  links: {
    gap: 4,
    flex: 1,
  },
  signedIn: {
    color: AppPalette.muted,
    fontSize: 12,
  },
});
