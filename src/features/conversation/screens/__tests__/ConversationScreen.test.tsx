import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithServices } from '@/test-utils/renderWithServices';

import { findScenario } from '../../content';
import { ConversationScreen } from '../ConversationScreen';

const cafe = findScenario('es', 'cafe')!;

async function talk() {
  const button = screen.getByTestId('hold-to-talk');
  await fireEvent(button, 'pressIn');
  await fireEvent(button, 'pressOut');
}

describe('ConversationScreen', () => {
  it('runs a spoken turn with an inline correction that can be saved to review', async () => {
    const { services } = await renderWithServices(
      <ConversationScreen scenario={cafe} language="es" level="A1" />,
    );
    expect(await screen.findByText(cafe.steps[0]!.tutor)).toBeTruthy();
    expect(screen.getByText('Scripted recogniser (demo)')).toBeTruthy();
    expect(screen.getByText('Scripted tutor')).toBeTruthy();

    await talk();
    expect(await screen.findByText(cafe.steps[1]!.tutor)).toBeTruthy();
    expect(screen.getByText('una café')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('correction-chip'));
    expect(screen.getByText('Café is masculine, so it takes un, not una.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('add-to-review'));
    await waitFor(() => expect(screen.getByText('Added to review')).toBeTruthy());
    expect((await services.reviewRepo.all('es')).map((c) => c.answer)).toEqual(['un café']);
    expect(screen.getByText('+5 XP')).toBeTruthy();
  });

  it('completes the scenario', async () => {
    await renderWithServices(<ConversationScreen scenario={cafe} language="es" level="A1" />);
    await screen.findByText(cafe.steps[0]!.tutor);
    for (let i = 0; i < cafe.steps.length; i++) {
      await talk();
      // Each turn ends with the tutor's next line; the last one with the closing.
      await screen.findByText(cafe.steps[i + 1]?.tutor ?? cafe.closing.tutor);
    }
    expect(await screen.findByTestId('conversation-done')).toBeTruthy();
    expect(screen.getByText('+25 XP. Corrections you saved are waiting in Review.')).toBeTruthy();
  });

  it('shows the translation on request', async () => {
    await renderWithServices(<ConversationScreen scenario={cafe} language="es" level="A1" />);
    await fireEvent.press(await screen.findByText('Show translation'));
    expect(screen.getByText(cafe.steps[0]!.translation)).toBeTruthy();
  });
});
