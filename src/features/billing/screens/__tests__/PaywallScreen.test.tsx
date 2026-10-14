import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithServices } from '@/test-utils/renderWithServices';

import { PaywallScreen } from '../PaywallScreen';

describe('PaywallScreen', () => {
  it('shows store prices, the trial badge and the quota upsell', async () => {
    await renderWithServices(<PaywallScreen source="quota" onClose={jest.fn()} />);
    expect(await screen.findByTestId('plan-yearly')).toBeTruthy();
    expect(screen.getByText('$59.99')).toBeTruthy();
    expect(screen.getByText('$9.99')).toBeTruthy();
    expect(screen.getByText('7-day free trial')).toBeTruthy();
    expect(screen.getByText("You've used 3/3 free conversations today")).toBeTruthy();
    expect(screen.getByText('-49%')).toBeTruthy();
    expect(screen.getByText('Start free trial')).toBeTruthy();
    expect(screen.queryByTestId('paywall-later')).toBeNull();
  });

  it('starts the yearly trial and reflects Pro across the app', async () => {
    const { services } = await renderWithServices(
      <PaywallScreen source="home" onClose={jest.fn()} />,
    );
    await screen.findByTestId('plan-yearly');
    await fireEvent.press(screen.getByTestId('paywall-cta'));
    await waitFor(() => expect(screen.getByTestId('paywall-done')).toBeTruthy());
    expect(services.entitlement.state.get().status).toBe('trial');
  });

  it('switches plan, and a monthly purchase has no trial', async () => {
    const { services } = await renderWithServices(
      <PaywallScreen source="settings" onClose={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByTestId('plan-monthly'));
    expect(screen.getByText('Subscribe')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('paywall-cta'));
    await waitFor(() => expect(services.entitlement.state.get().status).toBe('active'));
  });

  it('reports a failed purchase and an empty restore, and offers "maybe later" in onboarding', async () => {
    const onClose = jest.fn();
    const { services } = await renderWithServices(
      <PaywallScreen source="onboarding" onClose={onClose} />,
    );
    await screen.findByTestId('plan-yearly');
    services.billing.nextOutcome = 'fail';
    await fireEvent.press(screen.getByTestId('paywall-cta'));
    expect(await screen.findByText('The purchase did not go through.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('paywall-restore'));
    expect(await screen.findByText('No subscription found for this account.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('paywall-later'));
    expect(onClose).toHaveBeenCalled();
  });

  it('says so when the store has no products', async () => {
    const { services } = await renderWithServices(
      <PaywallScreen source="home" onClose={jest.fn()} />,
      {},
    );
    services.billing.plans = async () => [];
    // Re-render with the empty catalogue.
    await renderWithServices(<PaywallScreen source="home" onClose={jest.fn()} />, { services });
    expect(await screen.findAllByText('The store is not available on this device.')).toBeTruthy();
  });
});
