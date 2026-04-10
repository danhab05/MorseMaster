import { reactive, watch } from 'vue';
import { LEVELS } from './morseUtils';

export interface LetterStat {
  correct: number;
  total: number;
}

export interface StoreState {
  letters: Record<string, LetterStat>;
  unlockedLevels: number[];
  streak: number;
  bestStreak: number;
  totalScore: number;
}

const STORAGE_KEY = 'morsemaster_v1';

function defaultState(): StoreState {
  return {
    letters: {},
    unlockedLevels: [1],
    streak: 0,
    bestStreak: 0,
    totalScore: 0,
  };
}

function loadState(): StoreState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultState(), ...JSON.parse(saved) };
  } catch {}
  return defaultState();
}

export const store = reactive<StoreState>(loadState());

watch(() => store, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

export function getLetterStat(letter: string): LetterStat {
  if (!store.letters[letter]) store.letters[letter] = { correct: 0, total: 0 };
  return store.letters[letter];
}

export function getStars(letter: string): number {
  const s = store.letters[letter];
  if (!s || s.correct === 0) return 0;
  if (s.correct >= 5) return 3;
  if (s.correct >= 3) return 2;
  return 1;
}

export function isMastered(letter: string): boolean {
  return getStars(letter) === 3;
}

export function getLevelProgress(levelId: number): { mastered: number; total: number } {
  const level = LEVELS.find(l => l.id === levelId);
  if (!level) return { mastered: 0, total: 0 };
  return {
    mastered: level.letters.filter(l => isMastered(l)).length,
    total: level.letters.length,
  };
}

export function isLevelUnlocked(levelId: number): boolean {
  return store.unlockedLevels.includes(levelId);
}

export function recordAnswer(letter: string, correct: boolean) {
  const stat = getLetterStat(letter);
  stat.total++;
  if (correct) {
    stat.correct++;
    store.streak++;
    if (store.streak > store.bestStreak) store.bestStreak = store.streak;
    store.totalScore += 10 + Math.min(store.streak * 2, 30);
  } else {
    store.streak = 0;
  }
  _checkUnlocks();
}

function _checkUnlocks() {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const level = LEVELS[i];
    const nextId = level.id + 1;
    if (!store.unlockedLevels.includes(nextId)) {
      const mastered = level.letters.filter(l => isMastered(l)).length;
      if (mastered >= Math.ceil(level.letters.length * 0.7)) {
        store.unlockedLevels.push(nextId);
      }
    }
  }
}

export function resetProgress() {
  const fresh = defaultState();
  store.letters = fresh.letters;
  store.unlockedLevels = fresh.unlockedLevels;
  store.streak = fresh.streak;
  store.bestStreak = fresh.bestStreak;
  store.totalScore = fresh.totalScore;
}
