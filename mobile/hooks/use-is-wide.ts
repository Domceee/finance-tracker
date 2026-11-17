import { useWindowDimensions } from 'react-native';
import { BREAKPOINT } from '../constants/layout';

export function useIsWide() {
  const { width } = useWindowDimensions();

  return width >= BREAKPOINT;
}
