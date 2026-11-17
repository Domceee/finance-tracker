import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { AppHeader } from '../../components/app-header';
import { AppFooter } from '../../components/app-footer';
import { NavMenu } from '../../components/nav-menu';
import { NAV_ITEMS } from '../../constants/nav-items';
import { CONTENT_MAX_WIDTH } from '../../constants/layout';
import { AppPalette } from '../../constants/theme';
import { useIsWide } from '../../hooks/use-is-wide';

export default function TabLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isWide = useIsWide();

  return (
    <View style={styles.root}>
      <AppHeader onOpenMenu={() => setIsMenuOpen(true)} />

      <View style={styles.content}>
        <Tabs
          tabBar={() => null}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: AppPalette.void } }}>
          {NAV_ITEMS.map((item) => (
            <Tabs.Screen key={item.screen} name={item.screen} options={{ title: item.label }} />
          ))}
        </Tabs>
      </View>

      <AppFooter />

      {isMenuOpen && !isWide ? <NavMenu onClose={() => setIsMenuOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppPalette.void,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
});
