import { reactive, watch } from 'vue';
import { LESSONS, TOTAL_LESSONS } from './morseUtils';

export interface LetterProgress {
  fill: number;       // 0-100, fills based on correct answers
  attempts: number;
  correct: number;
}

export interface StoreState {
  letters: Record<string, LetterProgress>;
  unlockedLesson: number; // max lesson id unlocked
  totalXP: number;
  streak: number;
  bestStreak: number;
}

const KEY = 'mm_v2';

function defaultState(): StoreState {
  return {
    letters: {},
    unlockedLesson: 1,
    totalXP: 0,
    streak: 0,
    bestStreak: 0,
  };
}

function load(): StoreState {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return { ...defaultState(), ...JSON.parse(s) };
  } catch {}
  return defaultState();
}

export const store = reactive<StoreState>(load());

watch(() => store, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true });

export function getLetter(letter: string): LetterProgress {
  if (!store.letters[letter]) store.letters[letter] = { fill: 0, attempts: 0, correct: 0 };
  return store.letters[letter];
}

export function getFill(letter: string): number {
  return store.letters[letter]?.fill ?? 0;
}

// Record an answer. hintUsed reduces fill gain, fast answers boost it.
export function recordAnswer(letter: string, correct: boolean, hintUsed: boolean, replayCount: number) {
  const p = getLetter(letter);
  p.attempts++;
  if (correct) {
    p.correct++;
    store.streak++;
    if (store.streak > store.bestStreak) store.bestStreak = store.streak;
    // Fill gain: base 20, -5 per hint, -3 per replay, min 5
    const gain = Math.max(5, 20 - (hintUsed ? 8 : 0) - replayCount * 3);
    p.fill = Math.min(100, p.fill + gain);
    store.totalXP += Math.round(gain / 2);
  } else {
    store.streak = 0;
    p.fill = Math.max(0, p.fill - 10);
  }
}

export function isLessonUnlocked(lessonId: number): boolean {
  return lessonId <= store.unlockedLesson;
}

// Returns true if lesson can be advanced (enough fill on new letters)
export function checkAdvance(lessonId: number): boolean {
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return false;
  const avg = lesson.newLetters.reduce((a, l) => a + getFill(l), 0) / 2;
  return avg >= 80;
}

export function unlockNextLesson(currentId: number) {
  if (currentId < TOTAL_LESSONS && store.unlockedLesson === currentId) {
    store.unlockedLesson = currentId + 1;
  }
}

export function resetProgress() {
  const d = defaultState();
  store.letters = d.letters;
  store.unlockedLesson = d.unlockedLesson;
  store.totalXP = d.totalXP;
  store.streak = d.streak;
  store.bestStreak = d.bestStreak;
}
