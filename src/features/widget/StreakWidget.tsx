import { Gauge, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import { type StreakWidgetProps } from './lib/streakSnapshot';

/*
 * Runs inside the widget extension, not the app: the 'widget' directive
 * bundles this function on its own, so every constant it needs is declared
 * inside it and all data arrives through props.
 */
const StreakWidget = (props: StreakWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const ink = dark ? '#F4F1FF' : '#1B1736';
  const muted = dark ? '#B4ADD6' : '#5D5880';
  const flame = props.practisedToday ? '#FF7A2F' : dark ? '#6E6890' : '#B9B3D6';
  const accent = dark ? '#9E8BFF' : '#6C4DFF';
  const background = dark ? '#1C1838' : '#FFFFFF';
  const small = environment.widgetFamily === 'systemSmall';

  return (
    <HStack
      spacing={14}
      modifiers={[
        frame({ maxWidth: 9999, maxHeight: 9999 }),
        padding({ all: 2 }),
        containerBackground(background, 'widget'),
        widgetURL('parla://'),
      ]}>
      <VStack alignment="leading" spacing={4}>
        <HStack spacing={4}>
          <Image systemName="flame.fill" size={small ? 26 : 30} color={flame} />
          <Spacer />
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(accent)]}>
            {props.language}
          </Text>
        </HStack>
        <Spacer />
        <Text
          modifiers={[
            font({ size: small ? 40 : 44, weight: 'heavy', design: 'rounded' }),
            foregroundStyle(ink),
          ]}>
          {String(props.streak)}
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted)]}>
          day streak
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>
          {props.caption}
        </Text>
      </VStack>
      {small ? null : (
        <VStack alignment="leading" spacing={8}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted)]}>
            Today
          </Text>
          <Gauge value={props.goal} modifiers={[frame({ width: 120 })]} />
          <HStack spacing={6}>
            <Image systemName="snowflake" size={14} color={accent} />
            <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(ink)]}>
              {`${props.freezes} freeze${props.freezes === 1 ? '' : 's'}`}
            </Text>
          </HStack>
          <HStack spacing={6}>
            <Image systemName="rectangle.stack.fill" size={14} color={accent} />
            <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(ink)]}>
              {`${props.dueReviews} due`}
            </Text>
          </HStack>
        </VStack>
      )}
    </HStack>
  );
};

export default createWidget<StreakWidgetProps>('StreakWidget', StreakWidget);
