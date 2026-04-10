export const MORSE_DICT: Record<string, string> = {
  'A': '.-',   'B': '-...', 'C': '-.-.', 'D': '-..',  'E': '.',    'F': '..-.',
  'G': '--.',  'H': '....', 'I': '..',   'J': '.---', 'K': '-.-',  'L': '.-..',
  'M': '--',   'N': '-.',   'O': '---',  'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...',  'T': '-',    'U': '..-',  'V': '...-', 'W': '.--',  'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
};

export const REVERSE_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_DICT).map(([k, v]) => [v, k])
);

export function decodeMorse(morse: string): string {
  return morse.trim()
    .split('   ')
    .map(word => word.split(' ').map(c => REVERSE_MORSE[c] || '?').join(''))
    .join(' ');
}

// MorseMania letter introduction order: pairs by complexity
const PAIRS: [string, string][] = [
  ['E', 'T'],
  ['A', 'N'],
  ['I', 'M'],
  ['S', 'O'],
  ['D', 'U'],
  ['R', 'K'],
  ['G', 'W'],
  ['H', 'V'],
  ['F', 'L'],
  ['P', 'J'],
  ['B', 'X'],
  ['C', 'Y'],
  ['Z', 'Q'],
];

export interface Lesson {
  id: number;
  newLetters: [string, string];
  pool: string[]; // all letters known at this lesson
}

export const LESSONS: Lesson[] = PAIRS.map((pair, idx) => ({
  id: idx + 1,
  newLetters: pair,
  pool: PAIRS.slice(0, idx + 1).flat(),
}));

export const TOTAL_LESSONS = LESSONS.length;
