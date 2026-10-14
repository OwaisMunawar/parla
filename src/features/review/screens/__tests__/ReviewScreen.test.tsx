import { fireEvent, screen } from '@testing-library/react-native';

import { createTestServices } from '@/test-utils/testServices';
import { renderWithServices } from '@/test-utils/renderWithServices';

import { ReviewScreen } from '../ReviewScreen';

async function servicesWithCards() {
  const services = await createTestServices();
  await services.review.addVocabulary('es', { term: 'el semáforo', meaning: 'the traffic lights' });
  await services.review.addCorrection({
    language: 'es',
    correction: {
      original: 'una café',
      corrected: 'un café',
      explanation: 'Café is masculine.',
      type: 'gender',
    },
    sourceMessageId: null,
  });
  return services;
}

describe('ReviewScreen', () => {
  it('shows due counts and the first card prompt', async () => {
    const services = await servicesWithCards();
    await renderWithServices(<ReviewScreen language="es" />, { services });
    expect(await screen.findByText('the traffic lights')).toBeTruthy();
    expect(screen.getByText('New 2')).toBeTruthy();
  });

  it('scores a spoken answer, then grades and moves on', async () => {
    const services = await servicesWithCards();
    await renderWithServices(<ReviewScreen language="es" />, { services });
    await screen.findByText('the traffic lights');
    const talk = screen.getByTestId('review-talk');
    await fireEvent(talk, 'pressIn');
    await fireEvent(talk, 'pressOut');
    expect(await screen.findByText('That was it')).toBeTruthy();
    expect(screen.getByTestId('review-answer')).toHaveTextContent('el semáforo');

    await fireEvent.press(screen.getByTestId('grade-good'));
    expect(await screen.findByText('Say it correctly: "una café"')).toBeTruthy();
    expect(
      (await services.reviewRepo.all('es')).find((c) => c.answer === 'el semáforo')?.schedule.reps,
    ).toBe(1);
  });

  it('reveals the answer without speaking and finishes the session', async () => {
    const services = await servicesWithCards();
    await renderWithServices(<ReviewScreen language="es" />, { services });
    for (let i = 0; i < 2; i++) {
      await fireEvent.press(await screen.findByTestId('review-reveal'));
      await fireEvent.press(screen.getByTestId('grade-easy'));
    }
    expect(await screen.findByText('Session complete')).toBeTruthy();
    expect(screen.getByText('2 cards reviewed. See you tomorrow.')).toBeTruthy();
  });

  it('shows the empty state with nothing to review', async () => {
    await renderWithServices(<ReviewScreen language="es" />);
    expect(await screen.findByText('All caught up')).toBeTruthy();
  });
});
