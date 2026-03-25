export const MORSE_DICT: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.'
};

export const REVERSE_MORSE_DICT: Record<string, string> = Object.entries(MORSE_DICT).reduce(
  (acc, [key, val]) => ({ ...acc, [val]: key }),
  {}
);

export function decodeMorse(morse: string): string {
  return morse
    .trim()
    .split('   ') // words separator
    .map((word) =>
      word
        .split(' ') // letters separator
        .map((char) => REVERSE_MORSE_DICT[char] || '?')
        .join('')
    )
    .join(' ');
}
