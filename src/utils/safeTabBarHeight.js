import { useContext } from 'react';
import { Platform } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/** Same as useBottomTabBarHeight but never throws (web / edge cases where context is missing). */
export function useSafeBottomTabBarHeight() {
  const h = useContext(BottomTabBarHeightContext);
  if (typeof h === 'number' && !Number.isNaN(h)) return h;
  return Platform.OS === 'web' ? 68 : 0;
}
