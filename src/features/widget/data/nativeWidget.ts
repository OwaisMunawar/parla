import { Platform } from 'react-native';

import { type StreakWidgetProps } from '../lib/streakSnapshot';
import StreakWidget from '../StreakWidget';

/**
 * Pushes a fresh snapshot to the iOS widget through the shared app group.
 * expo-widgets is iOS-only for now (see the roadmap), so Android is a no-op.
 */
export function publishStreakSnapshot(props: StreakWidgetProps): void {
  if (Platform.OS !== 'ios') return;
  try {
    StreakWidget.updateSnapshot(props);
  } catch (error) {
    // A widget is a nicety: a missing app group must never break the app.
    console.warn('Streak widget update failed', error);
  }
}
