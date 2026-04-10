<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MORSE_DICT, LESSONS } from '../morseUtils';
import { store, getFill, recordAnswer, checkAdvance, unlockNextLesson } from '../store';
import { morseAudio } from '../audio';

const props = defineProps<{ lessonId: number }>();
const emit = defineEmits<{ back: []; 'lesson-done': [] }>();

// ─── Constants ────────────────────────────────────────────────────────────────
const ROUND_Q    = 10;
const CHALLENGE_Q = 15;
const MAX_LIVES  = 3;
const RING_R     = 26;
const RING_CIRC  = 2 * Math.PI * RING_R;

// ─── Lesson ───────────────────────────────────────────────────────────────────
const lesson = computed(() => LESSONS.find(l => l.id === props.lessonId)!);

// ─── Phase ────────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'quiz' | 'result'
           | 'challenge-intro' | 'challenge' | 'challenge-fail' | 'levelup';
const phase = ref<Phase>('intro');

// ─── Shared quiz/challenge state ──────────────────────────────────────────────
const currentLetter  = ref('');
const shuffledPool   = ref<string[]>([]);
const answered       = ref(false);
const selectedLetter = ref('');
const isCorrect      = ref(false);
const isPlaying      = ref(false);
const playingSymbols = ref<string[]>([]);

// ─── Quiz-only state ──────────────────────────────────────────────────────────
const hintUsed    = ref(false);
const replayCount = ref(0);
const questionIdx = ref(0);

// ─── Challenge-only state ─────────────────────────────────────────────────────
const lives          = ref(MAX_LIVES);
const challengeIdx   = ref(0);
const shakingHeart   = ref(false);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function ringOffset(fill: number): number {
  return RING_CIRC * (1 - fill / 100);
}

// ─── Progressive pool (quiz) ─────────────────────────────────────────────────
// Q1-2 : nouvelles lettres seulement
// Q3-4 : + 2 anciennes lettres
// Q5-6 : + 2 autres … jusqu'au pool complet
function getProgressivePool(): string[] {
  const newL = lesson.value.newLetters;
  // Anciennes lettres : les plus récemment apprises d'abord (plus difficile)
  const oldL = lesson.value.pool
    .filter(l => !newL.includes(l))
    .reverse();

  const step  = Math.floor(questionIdx.value / 2); // 0, 1, 2, …
  const count = Math.min(step * 2, oldL.length);
  return shuffle([...newL, ...oldL.slice(0, count)]);
}

// Pick pondéré dans le pool visible seulement
function pickWeightedLetter(pool: string[]): string {
  const weights = pool.map(l => Math.max(1, 100 - getFill(l)));
  const total   = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ─── Equal pick (challenge) ───────────────────────────────────────────────────
function pickRandomLetter(): string {
  const pool = lesson.value.pool;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Morse animation ──────────────────────────────────────────────────────────
async function animateAndPlay(letter: string) {
  const seq = MORSE_DICT[letter] || '';
  const DOT  = 120;
  const DASH = DOT * 3;
  const GAP  = DOT;

  isPlaying.value = true;
  playingSymbols.value = [];
  await delay(380);

  for (const s of seq.split('')) {
    const dur = s === '.' ? DOT : DASH;
    playingSymbols.value = [...playingSymbols.value, s];
    morseAudio.playSequence(s, DOT);
    await delay(dur + GAP * 2 + 20);
  }
  isPlaying.value = false;
}

async function replay() {
  if (isPlaying.value) return;
  replayCount.value++;
  playingSymbols.value = [];
  await animateAndPlay(currentLetter.value);
}

// ─── Quiz flow ────────────────────────────────────────────────────────────────
async function nextQuizQuestion() {
  answered.value       = false;
  selectedLetter.value = '';
  hintUsed.value       = false;
  replayCount.value    = 0;
  playingSymbols.value = [];

  const pool           = getProgressivePool();   // pool visible pour cette question
  shuffledPool.value   = pool;
  currentLetter.value  = pickWeightedLetter(pool);
  await animateAndPlay(currentLetter.value);
}

function showHint() {
  if (answered.value) return;
  hintUsed.value = true;
  playingSymbols.value = MORSE_DICT[currentLetter.value]?.split('') ?? [];
}

async function selectQuizAnswer(letter: string) {
  if (answered.value || isPlaying.value) return;
  answered.value    = true;
  selectedLetter.value = letter;
  isCorrect.value   = letter === currentLetter.value;

  recordAnswer(currentLetter.value, isCorrect.value, hintUsed.value, replayCount.value);
  if (isCorrect.value) morseAudio.playCorrect();
  else                 morseAudio.playWrong();

  questionIdx.value++;
  await delay(isCorrect.value ? 600 : 1200);

  if (questionIdx.value >= ROUND_Q) {
    // End of quiz round
    if (checkAdvance(props.lessonId)) {
      // Ready for challenge
      phase.value = 'challenge-intro';
    } else {
      phase.value = 'result';
    }
  } else {
    await nextQuizQuestion();
  }
}

function restartQuiz() {
  questionIdx.value = 0;
  phase.value = 'quiz';
  nextQuizQuestion();
}

// ─── Challenge flow ───────────────────────────────────────────────────────────
async function startChallenge() {
  lives.value        = MAX_LIVES;
  challengeIdx.value = 0;
  phase.value        = 'challenge';
  await nextChallengeQuestion();
}

async function nextChallengeQuestion() {
  answered.value       = false;
  selectedLetter.value = '';
  isCorrect.value      = false;
  replayCount.value    = 0;
  playingSymbols.value = [];

  currentLetter.value = pickRandomLetter();
  shuffledPool.value  = shuffle(lesson.value.pool);
  await animateAndPlay(currentLetter.value);
}

async function selectChallengeAnswer(letter: string) {
  if (answered.value || isPlaying.value) return;
  answered.value       = true;
  selectedLetter.value = letter;
  isCorrect.value      = letter === currentLetter.value;

  // Still record for fill purposes
  recordAnswer(currentLetter.value, isCorrect.value, false, replayCount.value);

  if (isCorrect.value) {
    morseAudio.playCorrect();
  } else {
    morseAudio.playWrong();
    lives.value--;
    shakingHeart.value = true;
    setTimeout(() => { shakingHeart.value = false; }, 500);
  }

  challengeIdx.value++;
  await delay(isCorrect.value ? 650 : 1300);

  if (lives.value <= 0) {
    phase.value = 'challenge-fail';
    return;
  }

  if (challengeIdx.value >= CHALLENGE_Q) {
    unlockNextLesson(props.lessonId);
    phase.value = 'levelup';
    return;
  }

  await nextChallengeQuestion();
}

async function replayChallenge() {
  if (isPlaying.value) return;
  replayCount.value++;
  playingSymbols.value = [];
  await animateAndPlay(currentLetter.value);
}

// ─── Intro ────────────────────────────────────────────────────────────────────
function startQuiz() {
  phase.value = 'quiz';
  nextQuizQuestion();
}

function playIntroLetter(letter: string) {
  morseAudio.playSequence(MORSE_DICT[letter], 120);
}

// ─── Keyboard ─────────────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (phase.value === 'quiz' && !answered.value)      replay();
  if (phase.value === 'challenge' && !answered.value) replayChallenge();
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="game">

    <!-- ══ HEADER ══ -->
    <div class="header" :class="{ 'header-challenge': phase === 'challenge' }">
      <button class="btn-back" @click="emit('back')">‹ Retour</button>

      <!-- Quiz header -->
      <div v-if="phase === 'quiz' || phase === 'intro'" class="header-center">
        <span class="lesson-tag">Leçon {{ lessonId }}</span>
        <span class="lesson-name">{{ lesson.newLetters.join(' & ') }}</span>
      </div>

      <!-- Challenge header -->
      <div v-else-if="phase === 'challenge'" class="header-center">
        <span class="lesson-tag challenge-tag">DÉFI</span>
        <div class="hearts" :class="{ shake: shakingHeart }">
          <span
            v-for="i in MAX_LIVES"
            :key="i"
            class="heart"
            :class="{ lost: i > lives }"
          >♥</span>
        </div>
      </div>

      <div v-else class="header-center">
        <span class="lesson-name">Leçon {{ lessonId }}</span>
      </div>

      <div class="xp-badge">⚡{{ store.totalXP }}</div>
    </div>

    <!-- Progress bar -->
    <div class="progress-track" :class="{ 'track-challenge': phase === 'challenge' }">
      <div
        class="progress-fill"
        :style="{
          width: phase === 'challenge'
            ? (challengeIdx / CHALLENGE_Q * 100) + '%'
            : (questionIdx / ROUND_Q * 100) + '%'
        }"
      ></div>
    </div>

    <!-- ══ INTRO ══ -->
    <div v-if="phase === 'intro'" class="intro">
      <div class="section-label">Nouvelles lettres</div>
      <div class="intro-cards">
        <div
          v-for="letter in lesson.newLetters"
          :key="letter"
          class="intro-card"
          @click="playIntroLetter(letter)"
        >
          <div class="ic-letter">{{ letter }}</div>
          <div class="ic-morse-syms">
            <span
              v-for="(s, i) in MORSE_DICT[letter].split('')"
              :key="i"
              class="ic-sym"
              :class="s === '.' ? 'dot' : 'dash'"
            ></span>
          </div>
          <div class="ic-code">{{ MORSE_DICT[letter] }}</div>
          <div class="ic-play">▶ Écouter</div>
        </div>
      </div>
      <div class="intro-pool-preview" v-if="lesson.pool.length > 2">
        <div class="pool-label">Révision incluse</div>
        <div class="pool-letters">
          <span
            v-for="l in lesson.pool.filter(x => !lesson.newLetters.includes(x))"
            :key="l"
            class="pool-l"
          >{{ l }}</span>
        </div>
      </div>
      <button class="btn-primary" @click="startQuiz">Commencer</button>
    </div>

    <!-- ══ QUIZ ══ -->
    <div v-else-if="phase === 'quiz'" class="quiz-body">

      <div class="signal-zone">
        <div class="signal-symbols">
          <TransitionGroup name="sym-pop">
            <span v-for="(s, i) in playingSymbols" :key="i" class="sym" :class="s === '.' ? 'dot' : 'dash'"></span>
          </TransitionGroup>
          <span v-if="!isPlaying && playingSymbols.length === 0" class="sig-empty">· · ·</span>
        </div>
        <div class="signal-actions">
          <button class="btn-replay" :disabled="isPlaying" @click="replay">▶ Réécouter</button>
          <button class="btn-hint" :class="{ used: hintUsed }" :disabled="answered" @click="showHint">?</button>
        </div>
      </div>

      <div class="quiz-info-row">
        <div v-if="store.streak >= 3" class="streak-bar">🔥 {{ store.streak }} en série</div>
        <div class="pool-count">{{ shuffledPool.length }} lettre{{ shuffledPool.length > 1 ? 's' : '' }}</div>
      </div>

      <div class="letter-grid" :class="'cols-' + Math.ceil(Math.sqrt(shuffledPool.length))">
        <button
          v-for="letter in shuffledPool"
          :key="letter"
          class="letter-btn"
          :class="{
            'btn-correct': answered && letter === currentLetter,
            'btn-wrong':   answered && letter === selectedLetter && letter !== currentLetter,
            'btn-dim':     answered && letter !== selectedLetter && letter !== currentLetter,
            'btn-new':     lesson.newLetters.includes(letter),
          }"
          :disabled="answered || isPlaying"
          @click="selectQuizAnswer(letter)"
        >
          <svg class="ring" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" :r="RING_R" />
            <circle class="ring-fill" cx="32" cy="32" :r="RING_R"
              :stroke-dasharray="RING_CIRC"
              :stroke-dashoffset="ringOffset(getFill(letter))" />
          </svg>
          <span class="btn-char">{{ letter }}</span>
          <span v-if="lesson.newLetters.includes(letter)" class="new-dot"></span>
        </button>
      </div>

      <Transition name="fade">
        <div v-if="answered" class="feedback" :class="isCorrect ? 'fb-ok' : 'fb-err'">
          <span v-if="isCorrect">Correct !</span>
          <span v-else>C'était <strong>{{ currentLetter }}</strong> — {{ MORSE_DICT[currentLetter] }}</span>
        </div>
      </Transition>
    </div>

    <!-- ══ RESULT (not ready for challenge yet) ══ -->
    <div v-else-if="phase === 'result'" class="end-screen">
      <div class="end-icon">📡</div>
      <div class="end-title">Continue comme ça !</div>
      <div class="end-sub">Pratique encore pour débloquer le défi.</div>
      <div class="ring-grid">
        <div v-for="l in lesson.pool" :key="l" class="rg-item">
          <svg viewBox="0 0 64 64" class="rg-ring">
            <circle class="ring-bg" cx="32" cy="32" :r="RING_R" />
            <circle class="ring-fill" cx="32" cy="32" :r="RING_R"
              :stroke-dasharray="RING_CIRC" :stroke-dashoffset="ringOffset(getFill(l))" />
          </svg>
          <span class="rg-char">{{ l }}</span>
        </div>
      </div>
      <div class="end-actions">
        <button class="btn-primary" @click="restartQuiz">Rejouer</button>
        <button class="btn-secondary" @click="emit('back')">Accueil</button>
      </div>
    </div>

    <!-- ══ CHALLENGE INTRO ══ -->
    <div v-else-if="phase === 'challenge-intro'" class="end-screen">
      <div class="end-icon">⚔️</div>
      <div class="end-title">Prêt pour le défi ?</div>
      <div class="end-sub">
        {{ CHALLENGE_Q }} questions · 3 vies · pas d'indice<br>
        Toutes les lettres apprises sont testées.
      </div>
      <div class="challenge-lives-preview">
        <span v-for="i in MAX_LIVES" :key="i" class="heart">♥</span>
      </div>
      <div class="end-actions">
        <button class="btn-challenge" @click="startChallenge">C'est parti !</button>
        <button class="btn-secondary" @click="restartQuiz">Encore s'entraîner</button>
      </div>
    </div>

    <!-- ══ CHALLENGE ══ -->
    <div v-else-if="phase === 'challenge'" class="quiz-body">

      <div class="signal-zone signal-challenge">
        <div class="signal-symbols">
          <TransitionGroup name="sym-pop">
            <span v-for="(s, i) in playingSymbols" :key="i" class="sym sym-red" :class="s === '.' ? 'dot' : 'dash'"></span>
          </TransitionGroup>
          <span v-if="!isPlaying && playingSymbols.length === 0" class="sig-empty">· · ·</span>
        </div>
        <div class="signal-actions">
          <button class="btn-replay btn-replay-red" :disabled="isPlaying" @click="replayChallenge">▶ Réécouter</button>
        </div>
      </div>

      <!-- Question counter -->
      <div class="challenge-counter">{{ challengeIdx + 1 }} / {{ CHALLENGE_Q }}</div>

      <div class="letter-grid" :class="'cols-' + Math.ceil(Math.sqrt(shuffledPool.length))">
        <button
          v-for="letter in shuffledPool"
          :key="letter"
          class="letter-btn"
          :class="{
            'btn-correct': answered && letter === currentLetter,
            'btn-wrong':   answered && letter === selectedLetter && letter !== currentLetter,
            'btn-dim':     answered && letter !== selectedLetter && letter !== currentLetter,
          }"
          :disabled="answered || isPlaying"
          @click="selectChallengeAnswer(letter)"
        >
          <svg class="ring" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" :r="RING_R" />
            <circle class="ring-fill ring-fill-red" cx="32" cy="32" :r="RING_R"
              :stroke-dasharray="RING_CIRC"
              :stroke-dashoffset="ringOffset(getFill(letter))" />
          </svg>
          <span class="btn-char">{{ letter }}</span>
        </button>
      </div>

      <Transition name="fade">
        <div v-if="answered" class="feedback" :class="isCorrect ? 'fb-ok' : 'fb-err'">
          <span v-if="isCorrect">Correct ! ({{ lives }}/{{ MAX_LIVES }} ♥)</span>
          <span v-else>C'était <strong>{{ currentLetter }}</strong> — {{ MORSE_DICT[currentLetter] }}</span>
        </div>
      </Transition>
    </div>

    <!-- ══ CHALLENGE FAIL ══ -->
    <div v-else-if="phase === 'challenge-fail'" class="end-screen">
      <div class="end-icon">💔</div>
      <div class="end-title">Défi échoué</div>
      <div class="end-sub">
        Plus de vies… Entraîne-toi encore et réessaie !
      </div>
      <div class="ring-grid">
        <div v-for="l in lesson.pool" :key="l" class="rg-item">
          <svg viewBox="0 0 64 64" class="rg-ring">
            <circle class="ring-bg" cx="32" cy="32" :r="RING_R" />
            <circle class="ring-fill" cx="32" cy="32" :r="RING_R"
              :stroke-dasharray="RING_CIRC" :stroke-dashoffset="ringOffset(getFill(l))" />
          </svg>
          <span class="rg-char">{{ l }}</span>
        </div>
      </div>
      <div class="end-actions">
        <button class="btn-challenge" @click="startChallenge">Réessayer le défi</button>
        <button class="btn-secondary" @click="restartQuiz">S'entraîner d'abord</button>
        <button class="btn-secondary" @click="emit('back')">Accueil</button>
      </div>
    </div>

    <!-- ══ LEVEL UP ══ -->
    <div v-else-if="phase === 'levelup'" class="end-screen">
      <div class="end-icon">🏆</div>
      <div class="end-title">Défi réussi !</div>
      <div class="end-sub" v-if="lessonId < 13">
        Leçon {{ lessonId + 1 }} débloquée !
      </div>
      <div class="end-sub" v-else>
        Tu as maîtrisé tout l'alphabet Morse !
      </div>
      <div class="end-actions">
        <button class="btn-primary" @click="emit('lesson-done')">Continuer</button>
        <button class="btn-secondary" @click="emit('back')">Accueil</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.game {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── HEADER ─────────────────────────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: background 0.3s;
}

.header-challenge {
  background: rgba(255, 69, 58, 0.06);
  border-bottom-color: rgba(255, 69, 58, 0.25);
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.lesson-tag {
  font-size: 0.6rem;
  color: var(--accent);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.challenge-tag { color: var(--red); }

.lesson-name {
  font-size: 1rem;
  font-weight: 700;
}

.xp-badge {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 700;
  min-width: 55px;
  text-align: right;
}

/* Hearts */
.hearts {
  display: flex;
  gap: 4px;
}

.heart {
  font-size: 1.3rem;
  color: var(--red);
  transition: all 0.2s;
  line-height: 1;
}

.heart.lost {
  color: var(--border);
  opacity: 0.4;
}

@keyframes heartShake {
  0%   { transform: translateX(0); }
  20%  { transform: translateX(-6px) scale(1.2); }
  40%  { transform: translateX(6px); }
  60%  { transform: translateX(-4px); }
  80%  { transform: translateX(4px); }
  100% { transform: translateX(0); }
}

.hearts.shake { animation: heartShake 0.45s ease; }

/* ── PROGRESS ───────────────────────────────────────────────────────────────── */
.progress-track {
  height: 3px;
  background: var(--border);
  flex-shrink: 0;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.35s ease;
}

.track-challenge .progress-fill {
  background: var(--red);
}

/* ── INTRO ──────────────────────────────────────────────────────────────────── */
.intro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.2rem;
  gap: 1.5rem;
}

.section-label {
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: var(--text-dim);
  text-transform: uppercase;
}

.intro-cards {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.intro-card {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 18px;
  padding: 1.6rem 1.4rem;
  min-width: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.intro-card:active {
  border-color: var(--accent);
  transform: scale(0.95);
}

.ic-letter {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
}

.ic-morse-syms {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ic-sym {
  background: var(--accent);
  display: block;
  border-radius: 50px;
}
.ic-sym.dot  { width: 12px; height: 12px; border-radius: 50%; }
.ic-sym.dash { width: 36px; height: 12px; }

.ic-code {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-family: 'Courier New', monospace;
  letter-spacing: 3px;
}

.ic-play {
  font-size: 0.7rem;
  color: var(--accent);
  margin-top: 0.2rem;
}

.intro-pool-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.pool-label {
  font-size: 0.6rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pool-letters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  justify-content: center;
}

.pool-l {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
}

/* ── BUTTONS ────────────────────────────────────────────────────────────────── */
.btn-primary {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 1rem;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 800;
  width: 100%;
  max-width: 320px;
}
.btn-primary:active { opacity: 0.85; transform: scale(0.97); }

.btn-challenge {
  background: var(--red);
  color: #fff;
  border: none;
  padding: 1rem;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 800;
  width: 100%;
  max-width: 320px;
}
.btn-challenge:active { opacity: 0.85; transform: scale(0.97); }

.btn-secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 0.85rem;
  border-radius: 14px;
  font-size: 0.9rem;
  width: 100%;
  max-width: 320px;
}

/* ── QUIZ / CHALLENGE SHARED BODY ───────────────────────────────────────────── */
.quiz-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 1rem 1.5rem;
  gap: 0.8rem;
}

/* Signal zone */
.signal-zone {
  background: #000;
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 1.3rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  min-height: 110px;
  justify-content: center;
}

.signal-challenge { border-color: rgba(255,69,58,0.35); }

.signal-symbols {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.sym {
  background: var(--accent);
  display: block;
  border-radius: 50px;
  box-shadow: 0 0 10px rgba(245,197,66,0.35);
}
.sym-red {
  background: #ff6b6b;
  box-shadow: 0 0 10px rgba(255,69,58,0.35);
}
.sym.dot  { width: 16px; height: 16px; border-radius: 50%; }
.sym.dash { width: 50px; height: 16px; }

.sig-empty {
  font-size: 1.3rem;
  color: var(--text-muted);
  letter-spacing: 5px;
}

.signal-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn-replay {
  background: transparent;
  border: 1.5px solid var(--accent);
  color: var(--accent);
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
}
.btn-replay:not(:disabled):active { background: var(--accent); color: #000; }
.btn-replay:disabled { opacity: 0.35; }

.btn-replay-red {
  border-color: var(--red);
  color: var(--red);
}
.btn-replay-red:not(:disabled):active { background: var(--red); color: #fff; }

.btn-hint {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--surface2);
  border: 1.5px solid var(--border);
  color: var(--text-dim);
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-hint.used { border-color: var(--accent); color: var(--accent); }
.btn-hint:disabled { opacity: 0.3; }

/* Quiz info row */
.quiz-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 2rem;
}

/* Streak */
.streak-bar {
  background: rgba(245,197,66,0.1);
  border: 1px solid rgba(245,197,66,0.2);
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 600;
  flex: 1;
}

.pool-count {
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-align: right;
  white-space: nowrap;
}

/* Challenge counter */
.challenge-counter {
  text-align: center;
  font-size: 0.7rem;
  color: var(--red);
  letter-spacing: 1.5px;
  font-weight: 700;
}

/* ── LETTER GRID ────────────────────────────────────────────────────────────── */
.letter-grid {
  display: grid;
  gap: 0.5rem;
  flex: 1;
  align-content: start;
}
.cols-2 { grid-template-columns: repeat(2, 1fr); }
.cols-3 { grid-template-columns: repeat(3, 1fr); }
.cols-4 { grid-template-columns: repeat(4, 1fr); }
.cols-5 { grid-template-columns: repeat(5, 1fr); }

.letter-btn {
  position: relative;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s, transform 0.08s;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  padding: 0;
}

.letter-btn:not(:disabled):not(.btn-correct):not(.btn-wrong):not(.btn-dim):active {
  transform: scale(0.88);
  border-color: var(--accent);
}

.letter-btn:disabled:not(.btn-correct):not(.btn-wrong) { opacity: 0.5; }

.btn-correct { background: var(--green-dim); border-color: var(--green) !important; }
.btn-wrong   { background: var(--red-dim);   border-color: var(--red)   !important; }
.btn-dim     { opacity: 0.2; }
.btn-new .btn-char { color: var(--accent); }

/* SVG ring */
.ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg   { fill: none; stroke: var(--ring-bg); stroke-width: 3; }
.ring-fill { fill: none; stroke: var(--accent);  stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
.ring-fill-red { stroke: var(--red); }

.btn-char {
  position: relative;
  font-size: 1.6rem;
  font-weight: 800;
  z-index: 1;
  line-height: 1;
}

.new-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  background: var(--accent);
  border-radius: 50%;
  z-index: 2;
}

/* Feedback */
.feedback {
  padding: 0.65rem 1rem;
  border-radius: 12px;
  font-size: 0.88rem;
  text-align: center;
  font-weight: 600;
}
.fb-ok  { background: var(--green-dim); border: 1px solid var(--green); color: var(--green); }
.fb-err { background: var(--red-dim);   border: 1px solid var(--red);   color: var(--red);   }

/* ── END SCREENS ────────────────────────────────────────────────────────────── */
.end-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1.2rem 2rem;
  gap: 1rem;
}

.end-icon  { font-size: 4rem; line-height: 1; }
.end-title { font-size: 1.5rem; font-weight: 800; }
.end-sub   { font-size: 0.85rem; color: var(--text-dim); text-align: center; max-width: 270px; line-height: 1.5; }

.challenge-lives-preview {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0;
}
.challenge-lives-preview .heart { font-size: 2rem; }

.ring-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  max-width: 320px;
  margin: 0.3rem 0;
}

.rg-item {
  position: relative;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rg-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.rg-char {
  position: relative;
  font-size: 1.05rem;
  font-weight: 800;
  z-index: 1;
}

.end-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  max-width: 320px;
  margin-top: auto;
}

/* ── TRANSITIONS ────────────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }

.sym-pop-enter-active { transition: transform 0.12s ease, opacity 0.12s; }
.sym-pop-enter-from   { transform: scale(0.4); opacity: 0; }

/* ── MOBILE ─────────────────────────────────────────────────────────────────── */
@media (max-width: 360px) {
  .btn-char   { font-size: 1.25rem; }
  .sym.dash   { width: 38px; }
  .letter-btn { border-radius: 10px; }
  .intro-card { min-width: 110px; padding: 1.2rem 1rem; }
  .ic-letter  { font-size: 3rem; }
}
</style>
