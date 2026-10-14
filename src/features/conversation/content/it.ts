import { type Scenario, type ScriptedRule } from './types';

export const italianRules: ScriptedRule[] = [
  {
    pattern: '(?:io )?sono ([\\p{L}\\d-]+) anni',
    corrected: 'ho $1 anni',
    explanation: 'Italian uses avere for age: "ho trent\'anni", literally "I have thirty years".',
    type: 'vocabulary',
  },
];

export const italianScenarios: Scenario[] = [
  {
    id: 'cafe',
    language: 'it',
    icon: 'cup',
    level: 'A1',
    title: 'Order at a café',
    subtitle: 'Espresso at the bar',
    goal: 'Order a drink and a pastry, then ask how much it is.',
    tutorRole: 'A barista at a bar in Bologna',
    steps: [
      {
        tutor: 'Buongiorno! Cosa le preparo?',
        translation: 'Good morning! What can I make you?',
        hint: 'Ask for a cappuccino.',
        demoUtterance: 'Buongiorno, vorrei una cappuccino, per favore.',
        vocabulary: [{ term: 'vorrei', meaning: 'I would like' }],
        rules: [
          {
            pattern: 'una cappuccino',
            corrected: 'un cappuccino',
            explanation: 'Cappuccino is masculine: un cappuccino.',
            type: 'gender',
          },
        ],
      },
      {
        tutor: 'Certo. Qualcos’altro?',
        translation: 'Sure. Anything else?',
        hint: 'Add a croissant (cornetto).',
        demoUtterance: 'Sì, anche un cornetto.',
        vocabulary: [{ term: 'un cornetto', meaning: 'an Italian croissant' }],
        rules: [],
      },
      {
        tutor: 'Ecco a lei.',
        translation: 'Here you are.',
        hint: 'Ask how much it is.',
        demoUtterance: 'Quanto costa?',
        vocabulary: [{ term: 'quanto costa', meaning: 'how much is it' }],
        rules: [],
      },
    ],
    closing: {
      tutor: 'Sono tre euro. Grazie e buona giornata!',
      translation: 'That is three euros. Thanks and have a good day!',
    },
  },
  {
    id: 'directions',
    language: 'it',
    icon: 'map',
    level: 'A2',
    title: 'Ask for directions',
    subtitle: 'Find the station',
    goal: 'Ask where the station is and thank the person.',
    tutorRole: 'A passer-by in Florence',
    steps: [
      {
        tutor: 'Ciao! Ti serve aiuto?',
        translation: 'Hi! Do you need help?',
        hint: 'Ask where the station is.',
        demoUtterance: 'Sì, dov’è la stazione?',
        vocabulary: [{ term: 'la stazione', meaning: 'the station' }],
        rules: [],
      },
      {
        tutor: 'Vai sempre dritto e poi gira a destra.',
        translation: 'Go straight on and then turn right.',
        hint: 'Thank them.',
        demoUtterance: 'Grazie mille!',
        vocabulary: [{ term: 'sempre dritto', meaning: 'straight on' }],
        rules: [],
      },
    ],
    closing: { tutor: 'Prego, buon viaggio!', translation: 'You are welcome, have a good trip!' },
  },
  {
    id: 'interview',
    language: 'it',
    icon: 'briefcase',
    level: 'B1',
    title: 'Job interview',
    subtitle: 'Introduce yourself',
    goal: 'Introduce yourself and your experience.',
    tutorRole: 'A hiring manager in Milan',
    steps: [
      {
        tutor: 'Buongiorno. Mi parli un po’ di lei.',
        translation: 'Good morning. Tell me a little about yourself.',
        hint: 'Give your name and age.',
        demoUtterance: 'Mi chiamo Alex e sono ventotto anni.',
        vocabulary: [{ term: 'parlare di sé', meaning: 'to talk about yourself' }],
        rules: [],
      },
      {
        tutor: 'E che esperienza ha?',
        translation: 'And what experience do you have?',
        hint: 'Say you have worked in design for five years.',
        demoUtterance: 'Lavoro nel design da cinque anni.',
        vocabulary: [{ term: 'da cinque anni', meaning: 'for five years (ongoing)' }],
        rules: [],
      },
    ],
    closing: {
      tutor: 'Perfetto, la richiameremo presto.',
      translation: 'Perfect, we will call you back soon.',
    },
  },
];
