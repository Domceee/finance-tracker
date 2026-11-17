import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENT_MAX_WIDTH } from '../constants/layout';
import { AppPalette } from '../constants/theme';
import { FontFamily } from '../constants/fonts';
import { useIsWide } from '../hooks/use-is-wide';

export function AppFooter() {
  const isWide = useIsWide();
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
      <View style={[styles.inner, !isWide && styles.innerNarrow]}>
        <Text style={styles.brand}>© {year} Bim bam</Text>
        {isWide ? <Text style={styles.text}>Personal finance tracker · KTU T120B165</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: AppPalette.surface,
    borderTopWidth: 1,
    borderTopColor: AppPalette.elevated,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  inner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  innerNarrow: {
    justifyContent: 'center',
  },
  brand: {
    color: AppPalette.accent,
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  text: {
    color: AppPalette.muted,
    fontSize: 12,
  },
});
