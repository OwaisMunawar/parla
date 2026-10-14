import { type Scenario, type ScriptedRule } from './types';

export const frenchRules: ScriptedRule[] = [
  {
    pattern: 'je suis ([\\p{L}\\d-]+) ans',
    corrected: "j'ai $1 ans",
    explanation: 'French uses avoir for age: "j\'ai trente ans", literally "I have thirty years".',
    type: 'vocabulary',
  },
];

export const frenchScenarios: Scenario[] = [
  {
    id: 'cafe',
    language: 'fr',
    icon: 'cup',
    level: 'A1',
    title: 'Order at a café',
    subtitle: 'Coffee, a croissant and the bill',
    goal: 'Order a drink and something to eat, then ask how to pay.',
    tutorRole: 'A waiter at a café in Lyon',
    steps: [
      {
        tutor: 'Bonjour ! Qu’est-ce que je vous sers ?',
        translation: 'Hello! What can I get you?',
        hint: 'Ask for a coffee.',
        demoUtterance: 'Bonjour, je voudrais une café, s’il vous plaît.',
        vocabulary: [{ term: 'je voudrais', meaning: 'I would like' }],
        rules: [
          {
            pattern: 'une café',
            corrected: 'un café',
            explanation: 'Café is masculine in French: un café.',
            type: 'gender',
          },
        ],
      },
      {
        tutor: 'Très bien. Et avec ceci ?',
        translation: 'Very good. Anything else?',
        hint: 'Add a croissant.',
        demoUtterance: 'Un croissant, s’il vous plaît.',
        vocabulary: [{ term: 'avec ceci', meaning: 'with this, anything else' }],
        rules: [],
      },
      {
        tutor: 'Ça fait quatre euros vingt. Sur place ou à emporter ?',
        translation: 'That is four euros twenty. To eat in or take away?',
        hint: 'Say it is to go and ask to pay by card.',
        demoUtterance: 'À emporter. Je peux payer par carte ?',
        vocabulary: [{ term: 'à emporter', meaning: 'to take away' }],
        rules: [],
      },
    ],
    closing: { tutor: 'Bien sûr. Bonne journée !', translation: 'Of course. Have a good day!' },
  },
  {
    id: 'directions',
    language: 'fr',
    icon: 'map',
    level: 'A2',
    title: 'Ask for directions',
    subtitle: 'Find the metro',
    goal: 'Ask where the metro is and thank the person.',
    tutorRole: 'A passer-by in Paris',
    steps: [
      {
        tutor: 'Bonjour ! Vous cherchez quelque chose ?',
        translation: 'Hello! Are you looking for something?',
        hint: 'Ask where the metro station is.',
        demoUtterance: 'Oui, où est la station de métro ?',
        vocabulary: [{ term: 'la station de métro', meaning: 'the metro station' }],
        rules: [],
      },
      {
        tutor: 'Allez tout droit, puis tournez à gauche après la boulangerie.',
        translation: 'Go straight ahead, then turn left after the bakery.',
        hint: 'Thank them.',
        demoUtterance: 'Merci beaucoup, monsieur !',
        vocabulary: [{ term: 'tout droit', meaning: 'straight ahead' }],
        rules: [],
      },
    ],
    closing: {
      tutor: 'Je vous en prie. Bonne visite !',
      translation: 'You are welcome. Enjoy your visit!',
    },
  },
  {
    id: 'interview',
    language: 'fr',
    icon: 'briefcase',
    level: 'B1',
    title: 'Job interview',
    subtitle: 'Introduce yourself',
    goal: 'Introduce yourself and your experience.',
    tutorRole: 'A recruiter at a startup in Bordeaux',
    steps: [
      {
        tutor: 'Bonjour, merci d’être venu. Présentez-vous, s’il vous plaît.',
        translation: 'Hello, thank you for coming. Please introduce yourself.',
        hint: 'Give your name and age.',
        demoUtterance: 'Je m’appelle Alex et je suis vingt-huit ans.',
        vocabulary: [{ term: 'se présenter', meaning: 'to introduce yourself' }],
        rules: [],
      },
      {
        tutor: 'Et quelle est votre expérience ?',
        translation: 'And what is your experience?',
        hint: 'Say you have worked in design for five years.',
        demoUtterance: 'Je travaille dans le design depuis cinq ans.',
        vocabulary: [{ term: 'depuis', meaning: 'for, since (ongoing)' }],
        rules: [],
      },
    ],
    closing: {
      tutor: 'Parfait, merci. Nous vous rappellerons.',
      translation: 'Perfect, thank you. We will call you back.',
    },
  },
];
