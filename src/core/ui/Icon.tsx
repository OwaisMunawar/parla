import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { type ColorValue } from 'react-native';

/**
 * Semantic icon names. Screens ask for "mic", not for an SF Symbol or a
 * Material glyph, so each platform gets its native icon from one table.
 */
const glyphs = {
  mic: { ios: 'mic.fill', android: 'mic' },
  speaker: { ios: 'speaker.wave.2.fill', android: 'volume_up' },
  flame: { ios: 'flame.fill', android: 'local_fire_department' },
  snowflake: { ios: 'snowflake', android: 'ac_unit' },
  cards: { ios: 'rectangle.stack.fill', android: 'style' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum' },
  waveform: { ios: 'waveform', android: 'graphic_eq' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle' },
  cup: { ios: 'cup.and.saucer.fill', android: 'local_cafe' },
  briefcase: { ios: 'briefcase.fill', android: 'work' },
  map: { ios: 'map.fill', android: 'map' },
  globe: { ios: 'globe.europe.africa.fill', android: 'public' },
  target: { ios: 'target', android: 'track_changes' },
  bell: { ios: 'bell.fill', android: 'notifications' },
  crown: { ios: 'crown.fill', android: 'workspace_premium' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  close: { ios: 'xmark', android: 'close' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  plus: { ios: 'plus', android: 'add' },
  replay: { ios: 'arrow.counterclockwise', android: 'replay' },
  lightbulb: { ios: 'lightbulb.fill', android: 'lightbulb' },
  book: { ios: 'book.fill', android: 'menu_book' },
  info: { ios: 'info.circle', android: 'info' },
  chip: { ios: 'cpu', android: 'memory' },
  cloud: { ios: 'cloud.fill', android: 'cloud' },
  lock: { ios: 'lock.fill', android: 'lock' },
  restore: { ios: 'arrow.clockwise.circle', android: 'restore' },
  gear: { ios: 'gearshape.fill', android: 'settings' },
  bolt: { ios: 'bolt.fill', android: 'bolt' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof glyphs;

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color: ColorValue;
}) {
  return (
    <SymbolView
      name={glyphs[name]}
      size={size}
      tintColor={color}
      weight="semibold"
      style={{ width: size, height: size }}
    />
  );
}
