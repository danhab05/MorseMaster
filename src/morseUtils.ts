export const MORSE_DICT: Record<string, string> = {
  'A': '.-',   'B': '-...', 'C': '-.-.', 'D': '-..',  'E': '.',    'F': '..-.',
  'G': '--.',  'H': '....', 'I': '..',   'J': '.---', 'K': '-.-',  'L': '.-..',
  'M': '--',   'N': '-.',   'O': '---',  'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...',  'T': '-',    'U': '..-',  'V': '...-', 'W': '.--',  'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
};

export const REVERSE_MORSE_DICT: Record<string, string> = Object.entries(MORSE_DICT).reduce(
  (acc, [key, val]) => ({ ...acc, [val]: key }),
  {}
);

export function decodeMorse(morse: string): string {
  return morse
    .trim()
    .split('   ')
    .map((word) =>
      word
        .split(' ')
        .map((char) => REVERSE_MORSE_DICT[char] || '?')
        .join('')
    )
    .join(' ');
}

export interface Level {
  id: number;
  name: string;
  description: string;
  letters: string[];
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Les bases',
    description: '2 lettres pour commencer',
    letters: ['E', 'T'],
  },
  {
    id: 2,
    name: 'Premiers pas',
    description: 'Lettres courtes',
    letters: ['I', 'A', 'N', 'M'],
  },
  {
    id: 3,
    name: 'En route',
    description: 'On accélère',
    letters: ['S', 'U', 'R', 'W', 'D', 'K', 'G', 'O'],
  },
  {
    id: 4,
    name: 'Expert',
    description: 'Toutes les lettres',
    letters: ['H', 'V', 'F', 'L', 'P', 'J', 'B', 'X', 'C', 'Y', 'Z', 'Q'],
  },
];

// All letters sorted by difficulty (for distractor pool)
export const LETTERS_BY_DIFFICULTY: string[] = LEVELS.flatMap(l => l.letters);
