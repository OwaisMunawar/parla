import { render } from '@testing-library/react-native';
import { type ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ServicesProvider } from '@/composition/ServicesProvider';
import { ThemeProvider } from '@/core/theme';
import { ToastProvider } from '@/core/ui';

import { createTestServices, type TestServices } from './testServices';

export async function renderWithServices(
  ui: ReactElement,
  options: Parameters<typeof createTestServices>[0] & { services?: TestServices } = {},
) {
  const services = options.services ?? (await createTestServices(options));
  const result = await render(
    <SafeAreaProvider>
      <ThemeProvider scheme="light">
        <ServicesProvider services={services}>
          <ToastProvider>{ui}</ToastProvider>
        </ServicesProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { ...result, services };
}
