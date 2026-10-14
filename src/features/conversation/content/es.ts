import { type Scenario, type ScriptedRule } from './types';

/** Mistakes English speakers make in Spanish whatever the scenario. */
export const spanishRules: ScriptedRule[] = [
  {
    pattern: '(?:yo )?soy ([\\p{L}\\d-]+) años',
    corrected: 'tengo $1 años',
    explanation:
      'Spanish uses tener (to have) for age: "tengo veinte años", literally "I have twenty years".',
    type: 'vocabulary',
  },
  {
    pattern: 'estoy (estudiante|ingeniera?|profesora?|médica?)',
    corrected: 'soy $1',
    explanation: 'Professions and identity take ser, not estar: "soy estudiante".',
    type: 'conjugation',
  },
];

export const spanishScenarios: Scenario[] = [
  {
    id: 'cafe',
    language: 'es',
    icon: 'cup',
    level: 'A1',
    title: 'Order at a café',
    subtitle: 'Coffee, a snack and the bill',
    goal: 'Order a drink and something to eat, then ask how to pay.',
    tutorRole: 'A friendly barista at Café Sol in Madrid',
    steps: [
      {
        tutor: '¡Hola! Bienvenido al Café Sol. ¿Qué te pongo?',
        translation: 'Hi! Welcome to Café Sol. What can I get you?',
        hint: 'Ask for a coffee with milk.',
        demoUtterance: 'Hola, quiero una café con leche, por favor.',
        vocabulary: [{ term: 'un café con leche', meaning: 'a coffee with milk' }],
        rules: [
          {
            pattern: 'una café',
            corrected: 'un café',
            explanation: 'Café is masculine, so it takes un, not una.',
            type: 'gender',
          },
        ],
      },
      {
        tutor: '¡Claro! ¿Lo quieres grande o pequeño? ¿Y algo para comer?',
        translation: 'Sure! Do you want it large or small? And something to eat?',
        hint: 'Choose a size and add toast.',
        demoUtterance: 'Grande, por favor. Y también un tostada con tomate.',
        vocabulary: [
          { term: 'una tostada', meaning: 'a slice of toast' },
          { term: 'también', meaning: 'also, too' },
        ],
        rules: [
          {
            pattern: 'un tostada',
            corrected: 'una tostada',
            explanation: 'Tostada ends in -a and is feminine: una tostada.',
            type: 'gender',
          },
        ],
      },
      {
        tutor: 'Perfecto. Son cuatro euros con cincuenta. ¿Para tomar aquí o para llevar?',
        translation: 'Perfect. That is four euros fifty. For here or to take away?',
        hint: 'Say it is to go and ask to pay by card.',
        demoUtterance: 'Para llevar. ¿Puedo pagar con tarjeta?',
        vocabulary: [
          { term: 'para llevar', meaning: 'to take away' },
          { term: 'pagar con tarjeta', meaning: 'to pay by card' },
        ],
        rules: [
          {
            pattern: 'pagar por tarjeta',
            corrected: 'pagar con tarjeta',
            explanation: 'You pay with (con) a card in Spanish, not by (por) it.',
            type: 'grammar',
          },
        ],
      },
    ],
    closing: {
      tutor: '¡Sí, claro! Aquí tienes. ¡Que tengas un buen día!',
      translation: 'Yes, of course! Here you go. Have a good day!',
    },
  },
  {
    id: 'interview',
    language: 'es',
    icon: 'briefcase',
    level: 'B1',
    title: 'Job interview',
    subtitle: 'Introduce yourself and your experience',
    goal: 'Introduce yourself, describe your experience and ask one question.',
    tutorRole: 'A hiring manager at a design studio in Barcelona',
    steps: [
      {
        tutor: 'Buenos días. Gracias por venir. Para empezar, ¿puede hablarme un poco de usted?',
        translation:
          'Good morning. Thanks for coming. To start, can you tell me a little about yourself?',
        hint: 'Give your name, age and what you do.',
        demoUtterance: 'Me llamo Alex, soy veintiocho años y estoy ingeniero.',
        vocabulary: [{ term: 'hablar de uno mismo', meaning: 'to talk about yourself' }],
        rules: [],
      },
      {
        tutor: 'Muy bien. ¿Y cuánta experiencia tiene en este sector?',
        translation: 'Very good. And how much experience do you have in this field?',
        hint: 'Say how long you have worked in it.',
        demoUtterance: 'Trabajo en diseño desde hace cinco años.',
        vocabulary: [{ term: 'desde hace', meaning: 'for (a length of time, still ongoing)' }],
        rules: [
          {
            pattern: 'por ([\\p{L}\\d]+) años',
            corrected: 'desde hace $1 años',
            explanation:
              'For something still ongoing, Spanish uses desde hace with the present tense.',
            type: 'grammar',
          },
        ],
      },
      {
        tutor: 'Excelente. ¿Tiene alguna pregunta para nosotros?',
        translation: 'Excellent. Do you have any questions for us?',
        hint: 'Ask what a typical day looks like.',
        demoUtterance: '¿Cómo es un día normal en el equipo?',
        vocabulary: [{ term: 'el equipo', meaning: 'the team' }],
        rules: [],
      },
    ],
    closing: {
      tutor:
        'Buena pregunta. Trabajamos en proyectos cortos y muy creativos. ¡Le llamaremos pronto!',
      translation:
        'Good question. We work on short, very creative projects. We will call you soon!',
    },
  },
  {
    id: 'directions',
    language: 'es',
    icon: 'map',
    level: 'A2',
    title: 'Ask for directions',
    subtitle: 'Find the train station',
    goal: 'Ask where the station is, check the way and thank the person.',
    tutorRole: 'A local walking past in Sevilla',
    steps: [
      {
        tutor: '¡Hola! Pareces un poco perdido. ¿Te puedo ayudar?',
        translation: 'Hi! You look a little lost. Can I help you?',
        hint: 'Ask where the train station is.',
        demoUtterance: 'Sí, por favor. ¿Dónde es la estación de tren?',
        vocabulary: [{ term: 'la estación de tren', meaning: 'the train station' }],
        rules: [
          {
            pattern: 'dónde es',
            corrected: 'dónde está',
            explanation: 'For where something is located, use estar: ¿dónde está…?',
            type: 'conjugation',
          },
        ],
      },
      {
        tutor: 'Está cerca. Sigue todo recto y gira a la izquierda en el semáforo.',
        translation: 'It is close. Go straight on and turn left at the traffic lights.',
        hint: 'Check: left at the lights?',
        demoUtterance: '¿A la izquierda en el semáforo?',
        vocabulary: [
          { term: 'todo recto', meaning: 'straight on' },
          { term: 'el semáforo', meaning: 'the traffic lights' },
        ],
        rules: [],
      },
      {
        tutor: 'Exacto. Luego la verás a la derecha. Son cinco minutos andando.',
        translation: 'Exactly. Then you will see it on the right. It is five minutes on foot.',
        hint: 'Thank them warmly.',
        demoUtterance: '¡Muchas gracias por tu ayuda!',
        vocabulary: [{ term: 'andando', meaning: 'on foot' }],
        rules: [],
      },
    ],
    closing: {
      tutor: '¡De nada! ¡Buen viaje!',
      translation: 'You are welcome! Have a good trip!',
    },
  },
];
