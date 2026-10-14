import { type CefrLevel, type Language } from '@/core/content/languages';

export type DrillSentence = {
  id: string;
  language: Language;
  level: CefrLevel;
  text: string;
  translation: string;
  /** What to listen for, in English. */
  focus: string;
};

/**
 * Sentences chosen for the sounds English speakers find hardest in each
 * language: the Spanish tapped and trilled r, French nasal vowels and the
 * u/ou contrast, Italian double consonants.
 */
export const drills: Record<Language, DrillSentence[]> = {
  es: [
    {
      id: 'es-perro',
      language: 'es',
      level: 'A2',
      text: 'El perro de Roberto corre por la carretera.',
      translation: "Roberto's dog runs along the road.",
      focus: 'Trilled rr in perro, corre and carretera; a single tap in Roberto.',
    },
    {
      id: 'es-cafe',
      language: 'es',
      level: 'A1',
      text: 'Quiero un café con leche, por favor.',
      translation: 'I would like a coffee with milk, please.',
      focus: 'Pure vowels: keep the e in leche short and clear.',
    },
    {
      id: 'es-ciudad',
      language: 'es',
      level: 'B1',
      text: 'La ciudad está llena de gente durante las fiestas.',
      translation: 'The city is full of people during the festivities.',
      focus: 'The soft d at the end of ciudad and the ll in llena.',
    },
  ],
  fr: [
    {
      id: 'fr-pain',
      language: 'fr',
      level: 'A1',
      text: 'Je voudrais un pain au chocolat.',
      translation: 'I would like a pain au chocolat.',
      focus: 'The nasal vowels in un and pain.',
    },
    {
      id: 'fr-rue',
      language: 'fr',
      level: 'A2',
      text: 'Tout au bout de la rue, tournez à droite.',
      translation: 'At the very end of the street, turn right.',
      focus: 'The ou in tout and bout against the u in rue.',
    },
  ],
  it: [
    {
      id: 'it-anno',
      language: 'it',
      level: 'A2',
      text: "Quest'anno andiamo in vacanza a settembre.",
      translation: 'This year we are going on holiday in September.',
      focus: 'Hold the double n in anno and the double t in settembre.',
    },
    {
      id: 'it-gelato',
      language: 'it',
      level: 'A1',
      text: 'Vorrei un gelato al pistacchio.',
      translation: 'I would like a pistachio ice cream.',
      focus: 'The double r in vorrei and the hard cch in pistacchio.',
    },
  ],
};

export function drillsFor(language: Language): DrillSentence[] {
  return drills[language];
}

export function findDrill(language: Language, id: string): DrillSentence | undefined {
  return drills[language].find((drill) => drill.id === id);
}
