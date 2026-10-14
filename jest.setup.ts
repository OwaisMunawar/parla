/* eslint-disable @typescript-eslint/no-require-imports */
// Component tests render real screens over in-memory SQLite and the fake
// store, recogniser and tutor. Only native views and device APIs are
// replaced here.
import 'react-native-gesture-handler/jestSetup';
import 'react-native-reanimated/mock';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-haptics', () => ({
  selectionAsync: async () => undefined,
  impactAsync: async () => undefined,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('@shopify/react-native-skia', () => {
  const { View } = require('react-native');
  const path = () => {
    const self = { addArc: () => self, detach: () => ({}), build: () => ({}) };
    return self;
  };
  const Noop = () => null;
  return {
    Canvas: View,
    Group: ({ children }: { children?: unknown }) => children ?? null,
    Path: Noop,
    Line: Noop,
    RoundedRect: Noop,
    LinearGradient: Noop,
    Picture: Noop,
    createPicture: () => ({}),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      PathBuilder: { Make: path },
      Path: { MakeFromSVGString: () => ({}) },
      Paint: () => ({}),
      Color: () => 0,
      XYWHRect: () => ({}),
    },
  };
});

jest.mock('expo-router', () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
  return {
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    Stack: { Screen: () => null },
    __router: router,
  };
});
