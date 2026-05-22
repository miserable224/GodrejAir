import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DARK } from '../constants/theme';
import { tabBarBottomPadding } from '../utils/safeTabBarHeight';

const shellStyle = Platform.select({
  web: { boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)' },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
});

/**
 * Bottom tabs with safe-area padding below icons + labels.
 * Height comes from screen `tabBarStyle` so labels are not clipped.
 */
export default function AppTabBar(props) {
  const insets = useSafeAreaInsets();
  const bottomPad = tabBarBottomPadding(insets);

  const barInsets = useMemo(() => {
    const fromProps = props.insets ?? {};
    return {
      top: fromProps.top ?? insets.top ?? 0,
      right: fromProps.right ?? insets.right ?? 0,
      bottom: bottomPad,
      left: fromProps.left ?? insets.left ?? 0,
    };
  }, [props.insets, insets.top, insets.right, insets.left, bottomPad]);

  return (
    <View
      style={{
        backgroundColor: DARK.card,
        ...shellStyle,
      }}
    >
      <BottomTabBar {...props} insets={barInsets} />
    </View>
  );
}
