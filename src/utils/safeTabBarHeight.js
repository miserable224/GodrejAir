import { useContext } from 'react';
import { Platform } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Icon + label row (safe area padding is stacked below this inside total height). */
export const TAB_BAR_INNER_HEIGHT = 62;

export function tabBarBottomPadding(insets) {
  const raw = Number(insets?.bottom) || 0;
  if (raw > 0) return raw;
  return Platform.select({ android: 16, ios: 8, web: 20, default: 12 });
}

export function tabBarTotalHeight(insets) {
  return TAB_BAR_INNER_HEIGHT + tabBarBottomPadding(insets);
}

/** Same as useBottomTabBarHeight but never throws (web / missing context). */
export function useSafeBottomTabBarHeight() {
  const insets = useSafeAreaInsets();
  const h = useContext(BottomTabBarHeightContext);
  if (typeof h === 'number' && !Number.isNaN(h) && h > 0) return h;
  return tabBarTotalHeight(insets);
}
