import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { NavItem } from '../constants/nav-items';
import { AppPalette } from '../constants/theme';
import { FontFamily } from '../constants/fonts';

export function NavLink({
  item,
  active,
  variant,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  variant: 'inline' | 'menu';
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = active ? AppPalette.text : hovered ? AppPalette.text : AppPalette.accent;

  function handlePress() {
    router.navigate(item.href);
    onNavigate?.();
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.base,
        variant === 'menu' ? styles.menu : styles.inline,
        hovered && styles.hovered,
        active && styles.active,
      ]}>
      <MaterialIcons name={item.icon} size={variant === 'menu' ? 22 : 18} color={color} />
      <Text style={[styles.label, variant === 'menu' && styles.menuLabel, { color }]}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
  },
  inline: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menu: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  hovered: {
    backgroundColor: AppPalette.elevated,
  },
  active: {
    backgroundColor: AppPalette.elevated,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  menuLabel: {
    fontSize: 17,
  },
});
