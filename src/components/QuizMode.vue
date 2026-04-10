<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { MORSE_DICT, LEVELS, LETTERS_BY_DIFFICULTY } from '../morseUtils';
import { store, getStars, isMastered, recordAnswer, getLevelProgress } from '../store';
import { morseAudio } from '../audio';

const props = defineProps<{ levelId: number }>();
const emit = defineEmits<{ back: [] }>();

const ROUND_SIZE = 10;

const level = computed(() => LEVELS.find(l => l.id === props.levelId)!);

// Quiz state
const currentLetter = ref('');
const choices = ref<string[]>([]);
const answered = ref(false);
const selectedChoice = ref('');
const isCorrect = ref(false);
const questionCount = ref(0);
const roundResults = ref<{ letter: string; correct: boolean }[]>([]);
const showSummary = ref(false);
const isAnimating = ref(false);

// Level complete bonus
const justUnlocked = computed(() => {
  const nextId = props.levelId + 1;
  const nextLevel = LEVELS.find(l => l.id === nextId);
  if (!nextLevel) return null;
  const prog = getLevelProgress(props.levelId);
  return prog.mastered === prog.total ? nextLevel : null;
});

function getDistractorPool(): string[] {
  // Current level letters first, then expand with simpler letters if needed
  const pool = [...level.value.letters];
  if (pool.length < 4) {
    for (const l of LETTERS_BY_DIFFICULTY) {
      if (!pool.includes(l)) pool.push(l);
      if (pool.length >= 8) break;
    }
  }
  return pool;
}

function pickWeightedLetter(): string {
  const letters = level.value.letters;
  const weights = letters.map(l => Math.max(1, 4 - getStars(l)));
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < letters.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return letters[i];
  }
  return letters[letters.length - 1];
}

function pickChoices(correct: string): string[] {
  const pool = getDistractorPool();
  const others = pool.filter(l => l !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
  return [...others, correct].sort(() => Math.random() - 0.5);
}

function startQuestion() {
  if (isAnimating.value) return;
  answered.value = false;
  selectedChoice.value = '';
  isCorrect.value = false;

  const letter = pickWeightedLetter();
  currentLetter.value = letter;
  choices.value = pickChoices(letter);

  // Auto-play after short delay
  setTimeout(() => playMorse(), 250);
}

function playMorse() {
  const seq = MORSE_DICT[currentLetter.value];
  if (seq) morseAudio.playSequence(seq, 120);
}

function selectAnswer(choice: string) {
  if (answered.value || isAnimating.value) return;

  answered.value = true;
  selectedChoice.value = choice;
  isCorrect.value = choice === currentLetter.value;

  recordAnswer(currentLetter.value, isCorrect.value);
  roundResults.value.push({ letter: currentLetter.value, correct: isCorrect.value });
  questionCount.value++;

  const delay = isCorrect.value ? 700 : 1400;

  if (questionCount.value >= ROUND_SIZE) {
    setTimeout(() => { showSummary.value = true; }, delay);
  } else {
    isAnimating.value = true;
    setTimeout(() => {
      isAnimating.value = false;
      startQuestion();
    }, delay);
  }
}

function startNewRound() {
  questionCount.value = 0;
  roundResults.value = [];
  showSummary.value = false;
  startQuestion();
}

onMounted(() => startQuestion());
</script>

<template>
  <div class="quiz">

    <!-- Header -->
    <div class="quiz-header">
      <button class="back-btn" @click="emit('back')">← Retour</button>
      <div class="header-center">
        <span class="level-label">NIVEAU {{ levelId }} — {{ level.name }}</span>
        <span class="q-count">{{ questionCount }}/{{ ROUND_SIZE }}</span>
      </div>
      <div class="header-score">{{ store.totalScore }}</div>
    </div>

    <!-- Progress bar -->
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: (questionCount / ROUND_SIZE * 100) + '%' }"></div>
    </div>

    <!-- Streak banner -->
    <Transition name="fade">
      <div v-if="store.streak >= 3" class="streak-banner">
        STREAK <span class="streak-n">{{ store.streak }}</span>
      </div>
    </Transition>

    <!-- QUIZ AREA -->
    <div v-if="!showSummary" class="quiz-body">

      <!-- Morse signal display -->
      <div class="signal-box">
        <div class="morse-symbols">
          <span
            v-for="(sym, i) in (MORSE_DICT[currentLetter] || '').split('')"
            :key="i"
            class="sig"
            :class="sym === '.' ? 'dot' : 'dash'"
          ></span>
        </div>
        <div class="morse-text-hint">{{ MORSE_DICT[currentLetter] }}</div>
        <button class="replay" @click="playMorse">&#9654; Réécouter</button>
      </div>

      <p class="question-label">Quelle est cette lettre ?</p>

      <!-- 2x2 answer grid -->
      <div class="choices">
        <button
          v-for="c in choices"
          :key="c"
          class="choice"
          :class="{
            'choice-correct': answered && c === currentLetter,
            'choice-wrong':   answered && c === selectedChoice && c !== currentLetter,
            'choice-dim':     answered && c !== selectedChoice && c !== currentLetter,
          }"
          @click="selectAnswer(c)"
        >
          <span class="choice-letter">{{ c }}</span>
          <span class="choice-code">{{ MORSE_DICT[c] }}</span>
        </button>
      </div>

      <!-- Feedback message -->
      <Transition name="fade">
        <div
          v-if="answered"
          class="feedback"
          :class="isCorrect ? 'fb-ok' : 'fb-err'"
        >
          <template v-if="isCorrect">
            Correct !
            <span v-if="isMastered(currentLetter)" class="mastered-badge">Maitrisée ★★★</span>
          </template>
          <template v-else>
            C'était <strong>{{ currentLetter }}</strong> = {{ MORSE_DICT[currentLetter] }}
          </template>
        </div>
      </Transition>

    </div>

    <!-- SUMMARY -->
    <div v-else class="summary">
      <div class="summary-top">
        <div class="sum-title">RÉSULTATS</div>
        <div class="sum-score">
          {{ roundResults.filter(r => r.correct).length }}
          <span class="sum-total">/{{ ROUND_SIZE }}</span>
        </div>
        <div class="sum-subtitle" v-if="justUnlocked">
          Niveau {{ justUnlocked.id }} débloqué — {{ justUnlocked.name }} !
        </div>
      </div>

      <div class="sum-list">
        <div
          v-for="(r, i) in roundResults"
          :key="i"
          class="sum-item"
          :class="r.correct ? 'si-ok' : 'si-err'"
        >
          <span class="si-letter">{{ r.letter }}</span>
          <span class="si-morse">{{ MORSE_DICT[r.letter] }}</span>
          <span class="si-stars">
            <span v-for="s in 3" :key="s" :class="s <= getStars(r.letter) ? 'star-on' : 'star-off'">★</span>
          </span>
          <span class="si-check">{{ r.correct ? '✓' : '✗' }}</span>
        </div>
      </div>

      <div class="sum-actions">
        <button class="btn-primary" @click="startNewRound">Rejouer</button>
        <button class="btn-secondary" @click="emit('back')">Accueil</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.quiz {
  min-height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

/* Header */
.quiz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.level-label {
  font-size: 0.65rem;
  color: var(--primary);
  letter-spacing: 1.5px;
}

.q-count {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.header-score {
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--primary);
  min-width: 60px;
  text-align: right;
}

/* Progress */
.progress-track {
  height: 3px;
  background: var(--border);
  flex-shrink: 0;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.4s ease;
}

/* Streak */
.streak-banner {
  background: rgba(255, 170, 0, 0.12);
  border-bottom: 1px solid rgba(255, 170, 0, 0.2);
  color: var(--warning);
  font-size: 0.65rem;
  letter-spacing: 2.5px;
  padding: 0.35rem;
  text-align: center;
  flex-shrink: 0;
}

.streak-n {
  font-size: 0.9rem;
  font-weight: bold;
  margin-left: 0.4rem;
}

/* Quiz body */
.quiz-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.2rem 1rem 1.5rem;
  gap: 1.2rem;
}

/* Signal box */
.signal-box {
  width: 100%;
  background: #000;
  border: 2px solid var(--primary);
  border-radius: 18px;
  box-shadow: 0 0 24px var(--primary-glow);
  padding: 1.8rem 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.morse-symbols {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 28px;
  flex-wrap: wrap;
}

.sig {
  background: var(--primary);
  border-radius: 4px;
  display: block;
  box-shadow: 0 0 8px var(--primary-glow);
}

.sig.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.sig.dash {
  width: 48px;
  height: 16px;
}

.morse-text-hint {
  font-size: 1.1rem;
  letter-spacing: 5px;
  color: var(--primary-dim);
}

.replay {
  background: transparent;
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: 0.45rem 1.2rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-family: inherit;
}

.replay:active {
  background: var(--primary);
  color: #000;
}

/* Question label */
.question-label {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-dim);
  letter-spacing: 1px;
}

/* Choices */
.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
  width: 100%;
}

.choice {
  background: var(--surface);
  border: 2px solid var(--border);
  color: var(--text);
  border-radius: 14px;
  padding: 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-height: 88px;
  transition: border-color 0.12s, background 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.choice:not([class*='choice-correct']):not([class*='choice-wrong']):not([class*='choice-dim']):active {
  border-color: var(--primary);
  transform: scale(0.96);
}

.choice-letter {
  font-size: 2.2rem;
  font-weight: bold;
  line-height: 1;
}

.choice-code {
  font-size: 0.65rem;
  color: var(--text-dim);
  letter-spacing: 2px;
}

.choice-correct {
  background: rgba(0, 255, 65, 0.15);
  border-color: var(--primary);
  color: var(--primary);
}

.choice-correct .choice-code { color: var(--primary-dim); }

.choice-wrong {
  background: rgba(255, 68, 68, 0.15);
  border-color: var(--danger);
  color: var(--danger);
}

.choice-wrong .choice-code { color: rgba(255, 68, 68, 0.6); }

.choice-dim {
  opacity: 0.3;
}

/* Feedback */
.feedback {
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  font-size: 0.85rem;
  text-align: center;
  width: 100%;
}

.fb-ok {
  background: rgba(0, 255, 65, 0.12);
  border: 1px solid rgba(0, 255, 65, 0.3);
  color: var(--primary);
}

.fb-err {
  background: rgba(255, 68, 68, 0.12);
  border: 1px solid rgba(255, 68, 68, 0.3);
  color: var(--danger);
}

.mastered-badge {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.2rem;
  opacity: 0.8;
}

/* Summary */
.summary {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem 2rem;
  gap: 1.2rem;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.summary-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.sum-title {
  font-size: 0.65rem;
  letter-spacing: 3px;
  color: var(--text-dim);
}

.sum-score {
  font-size: 4rem;
  font-weight: bold;
  color: var(--primary);
  line-height: 1;
  text-shadow: 0 0 20px var(--primary-glow);
}

.sum-total {
  font-size: 2rem;
  opacity: 0.4;
}

.sum-subtitle {
  font-size: 0.75rem;
  color: var(--warning);
  letter-spacing: 1px;
  margin-top: 0.2rem;
}

.sum-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 40vh;
  overflow-y: auto;
}

.sum-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid transparent;
}

.si-ok {
  background: rgba(0, 255, 65, 0.07);
  border-color: rgba(0, 255, 65, 0.18);
}

.si-err {
  background: rgba(255, 68, 68, 0.07);
  border-color: rgba(255, 68, 68, 0.18);
}

.si-letter {
  font-size: 1.2rem;
  font-weight: bold;
  width: 24px;
}

.si-morse {
  font-size: 0.7rem;
  color: var(--text-dim);
  flex: 1;
  letter-spacing: 2px;
}

.si-stars { font-size: 0.65rem; }

.si-check {
  font-size: 1rem;
  font-weight: bold;
  width: 20px;
  text-align: right;
}

.si-ok .si-check { color: var(--primary); }
.si-err .si-check { color: var(--danger); }

.sum-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: auto;
}

.btn-primary {
  background: var(--primary);
  color: #000;
  border: none;
  padding: 1rem;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: bold;
  font-family: inherit;
  width: 100%;
}

.btn-secondary {
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 0.8rem;
  border-radius: 14px;
  font-size: 0.9rem;
  font-family: inherit;
  width: 100%;
}

/* Transition */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

@media (max-width: 380px) {
  .sig.dash { width: 38px; }
  .choice-letter { font-size: 1.8rem; }
  .choice { min-height: 76px; }
}
</style>
