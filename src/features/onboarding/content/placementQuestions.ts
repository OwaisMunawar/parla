import { type Language } from '@/core/content/languages';

import { type PlacementQuestion } from '../lib/placement';

/** Five rungs, A1 to B2, alternating listening and speaking. */
export const placementQuestions: Record<Language, PlacementQuestion[]> = {
  es: [
    {
      id: 'es-l1',
      kind: 'listening',
      level: 'A1',
      audioText: 'Buenos días, ¿cómo estás?',
      options: ['Good morning, how are you?', 'Good night, see you soon', 'Where is the station?'],
      answerIndex: 0,
    },
    {
      id: 'es-s1',
      kind: 'speaking',
      level: 'A1',
      sentence: 'Me llamo Alex y vivo en Londres.',
      translation: 'My name is Alex and I live in London.',
    },
    {
      id: 'es-l2',
      kind: 'listening',
      level: 'A2',
      audioText: 'Ayer fuimos al mercado y compramos fruta.',
      options: [
        'We will go to the market tomorrow',
        'Yesterday we went to the market and bought fruit',
        'The market is closed today',
      ],
      answerIndex: 1,
    },
    {
      id: 'es-s2',
      kind: 'speaking',
      level: 'B1',
      sentence: 'Si tuviera más tiempo, viajaría por Sudamérica.',
      translation: 'If I had more time, I would travel around South America.',
    },
    {
      id: 'es-l3',
      kind: 'listening',
      level: 'B2',
      audioText:
        'Aunque el proyecto se retrasó, logramos entregarlo antes de que terminara el mes.',
      options: [
        'The project was cancelled at the end of the month',
        'The project was delayed, but we delivered it before the month ended',
        'We will start the project next month',
      ],
      answerIndex: 1,
    },
  ],
  fr: [
    {
      id: 'fr-l1',
      kind: 'listening',
      level: 'A1',
      audioText: 'Bonjour, comment ça va ?',
      options: ['Hello, how are you?', 'Goodbye, see you tomorrow', 'How much is it?'],
      answerIndex: 0,
    },
    {
      id: 'fr-s1',
      kind: 'speaking',
      level: 'A1',
      sentence: "Je m'appelle Alex et j'habite à Londres.",
      translation: 'My name is Alex and I live in London.',
    },
    {
      id: 'fr-l2',
      kind: 'listening',
      level: 'A2',
      audioText: 'Hier, nous sommes allés au marché.',
      options: [
        'Tomorrow we go to the market',
        'Yesterday we went to the market',
        'The market is far',
      ],
      answerIndex: 1,
    },
    {
      id: 'fr-s2',
      kind: 'speaking',
      level: 'B1',
      sentence: "Si j'avais plus de temps, je voyagerais en Amérique du Sud.",
      translation: 'If I had more time, I would travel in South America.',
    },
    {
      id: 'fr-l3',
      kind: 'listening',
      level: 'B2',
      audioText: 'Bien que le projet ait pris du retard, nous l’avons livré avant la fin du mois.',
      options: [
        'The project was cancelled',
        'Despite the delay, it was delivered before the month ended',
        'The project starts next month',
      ],
      answerIndex: 1,
    },
  ],
  it: [
    {
      id: 'it-l1',
      kind: 'listening',
      level: 'A1',
      audioText: 'Buongiorno, come stai?',
      options: ['Good morning, how are you?', 'Good evening, goodbye', 'Where is the bar?'],
      answerIndex: 0,
    },
    {
      id: 'it-s1',
      kind: 'speaking',
      level: 'A1',
      sentence: 'Mi chiamo Alex e abito a Londra.',
      translation: 'My name is Alex and I live in London.',
    },
    {
      id: 'it-l2',
      kind: 'listening',
      level: 'A2',
      audioText: 'Ieri siamo andati al mercato.',
      options: [
        'Tomorrow we go to the market',
        'Yesterday we went to the market',
        'The market is closed',
      ],
      answerIndex: 1,
    },
    {
      id: 'it-s2',
      kind: 'speaking',
      level: 'B1',
      sentence: 'Se avessi più tempo, viaggerei in Sud America.',
      translation: 'If I had more time, I would travel in South America.',
    },
    {
      id: 'it-l3',
      kind: 'listening',
      level: 'B2',
      audioText:
        'Sebbene il progetto fosse in ritardo, l’abbiamo consegnato prima della fine del mese.',
      options: [
        'The project was cancelled',
        'Despite the delay, it was delivered before the month ended',
        'The project starts next month',
      ],
      answerIndex: 1,
    },
  ],
};
