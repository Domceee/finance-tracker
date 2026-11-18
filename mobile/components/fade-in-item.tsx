import Animated, { FadeInDown } from 'react-native-reanimated';

const STEP_MS = 50;
const MAX_STAGGERED = 8;

export function FadeInItem({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, MAX_STAGGERED) * STEP_MS)}>
      {children}
    </Animated.View>
  );
}
