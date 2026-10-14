import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startAppEffects } from '@/composition/appEffects';
import { createNativeServices } from '@/composition/createNativeServices';
import { ServicesBoundary, useServices } from '@/composition/ServicesProvider';
import { ThemeProvider, useTheme } from '@/core/theme';
import { EmptyState, ToastProvider } from '@/core/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ServicesBoundary
          create={createNativeServices}
          fallback={null}
          renderError={(error) => <StartupError message={error.message} />}>
          <Navigation />
        </ServicesBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Navigation() {
  const theme = useTheme();
  const services = useServices();
  const { colors } = theme;

  useEffect(() => {
    void SplashScreen.hideAsync();
    const stopEffects = startAppEffects(services);
    // Store state and streak freezes settle on launch and every foreground:
    // a renewal or a missed day can happen while the app is closed.
    const settle = () => {
      void services.entitlement.refresh().then(() => services.changes.emit('entitlement'));
      void services.progress.reconcile().then(() => services.changes.emit('progress'));
    };
    settle();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') settle();
    });
    return () => {
      subscription.remove();
      stopEffects();
    };
  }, [services]);

  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      primary: colors.accent,
      border: colors.border,
    },
  };

  return (
    <NavigationTheme value={navigationTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="conversation/[scenarioId]" />
          <Stack.Screen name="drill/[drillId]" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
      </ToastProvider>
    </NavigationTheme>
  );
}

function StartupError({ message }: { message: string }) {
  const { colors } = useTheme();
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <EmptyState icon="info" title="Parla could not start" message={message} />
    </View>
  );
}
