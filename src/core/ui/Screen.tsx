import { type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

/** Height of the floating native tab bar, so the last row is never hidden under it. */
const TAB_BAR_CLEARANCE = 96;

export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  tabBar = false,
  contentStyle,
  testID,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  /** The screen sits under the tab bar. */
  tabBar?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
}) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const top = edges.includes('top') ? insets.top : 0;
  const padding: ViewStyle = {
    paddingTop: top + (scroll && top > 0 ? spacing.sm : 0),
    paddingBottom:
      (edges.includes('bottom') || tabBar ? insets.bottom : 0) +
      (tabBar ? TAB_BAR_CLEARANCE : spacing.lg),
  };

  if (scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          testID={testID}
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            { paddingHorizontal: spacing.lg, gap: spacing.lg },
            padding,
            contentStyle,
          ]}>
          {children}
        </ScrollView>
        {/* Content scrolls under the status bar; this keeps the clock legible. */}
        {top > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: top,
              backgroundColor: colors.background,
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[{ flex: 1, backgroundColor: colors.background }, padding, contentStyle]}>
      {children}
    </View>
  );
}
