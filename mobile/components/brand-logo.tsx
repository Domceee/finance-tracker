import { Image, StyleSheet, useWindowDimensions } from 'react-native';

const LOGO = require('../assets/images/logo.png');
const HERO_WIDTH_RATIO = 0.3;
const HERO_MAX_SIZE = 140;

export function BrandLogo({ size }: { size?: number }) {
  const { width } = useWindowDimensions();
  const isHero = size === undefined;
  const dimension = size ?? Math.round(Math.min(width * HERO_WIDTH_RATIO, HERO_MAX_SIZE));

  return (
    <Image
      source={LOGO}
      accessibilityLabel="Bim bam logo"
      resizeMode="contain"
      style={[
        { width: dimension, height: dimension, borderRadius: dimension * 0.23 },
        isHero && styles.hero,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'center',
    marginBottom: 20,
  },
});
