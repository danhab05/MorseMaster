<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MORSE_DICT, LESSONS } from '../morseUtils';
import { store, getFill, recordAnswer, checkAdvance, unlockNextLesson } from '../store';
import { morseAudio } from '../audio';

const props = defineProps<{ lessonId: number }>();
const emit = defineEmits<{ back: []; 'lesson-done': [] }>();

// ─── State ────────────────────────────────────────────────────────────────────
const lesson = computed(() => LESSONS.find(l => l.id === props.lessonId)!);

type Phase = 'intro' | 'quiz' | 'result' | 'levelup';
const phase = ref<Phase>('intro');

const currentLetter = ref('');
const shuffledPool = ref<string[]>([]);
const answered = ref(false);
const selectedLetter = ref('');
const isCorrect = ref(false);
const hintUsed = ref(false);
const replayCount = ref(0);
const isPlaying = ref(false);
const playingSymbols = ref<string[]>([]);  // animated dots/dashes during playback
const questionIndex = ref(0);
const ROUND_Q = 10;

// ─── Pool & Letter picking ────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickLetter(): string {
  const pool = lesson.value.pool;
  // Weight: lower fill = higher chance of being picked
  const weights = pool.map(l => Math.max(1, 100 - getFill(l)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ─── Morse animation ─────────────────────────────────────────────────────────
async function animateAndPlay(letter: string): Promise<void> {
  const seq = MORSE_DICT[letter] || '';
  const DOT_MS = 120;
  const DASH_MS = DOT_MS * 3;
  const SYM_GAP = DOT_MS;
  const PRE_GAP = 400;

  isPlaying.value = true;
  playingSymbols.value = [];

  await delay(PRE_GAP);

  const syms = seq.split('');
  for (const s of syms) {
    const dur = s === '.' ? DOT_MS : DASH_MS;
    playingSymbols.value = [...playingSymbols.value, s];
    morseAudio.playSequence(s, DOT_MS);
    await delay(dur + SYM_GAP * 2 + 20);
  }

  isPlaying.value = false;
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// ─── Question flow ────────────────────────────────────────────────────────────
async function nextQuestion() {
  answered.value = false;
  selectedLetter.value = '';
  hintUsed.value = false;
  replayCount.value = 0;
  playingSymbols.value = [];

  currentLetter.value = pickLetter();
  shuffledPool.value = shuffle(lesson.value.pool);

  await animateAndPlay(currentLetter.value);
}

async function replay() {
  if (isPlaying.value) return;
  replayCount.value++;
  playingSymbols.value = [];
  await animateAndPlay(currentLetter.value);
}

function showHint() {
  if (answered.value) return;
  hintUsed.value = true;
  // Animate hint (show symbols without audio)
  playingSymbols.value = MORSE_DICT[currentLetter.value]?.split('') ?? [];
}

async function selectAnswer(letter: string) {
  if (answered.value || isPlaying.value) return;

  answered.value = true;
  selectedLetter.value = letter;
  isCorrect.value = letter === currentLetter.value;

  recordAnswer(currentLetter.value, isCorrect.value, hintUsed.value, replayCount.value);
  if (isCorrect.value) morseAudio.playCorrect();
  else morseAudio.playWrong();
  questionIndex.value++;

  const waitMs = isCorrect.value ? 600 : 1200;
  await delay(waitMs);

  if (questionIndex.value >= ROUND_Q) {
    if (checkAdvance(props.lessonId)) {
      unlockNextLesson(props.lessonId);
      phase.value = 'levelup';
    } else {
      phase.value = 'result';
    }
  } else {
    await nextQuestion();
  }
}

function restart() {
  questionIndex.value = 0;
  phase.value = 'quiz';
  nextQuestion();
}

// ─── Intro ────────────────────────────────────────────────────────────────────
function startQuiz() {
  phase.value = 'quiz';
  nextQuestion();
}

function playIntroLetter(letter: string) {
  morseAudio.playSequence(MORSE_DICT[letter], 120);
}

// ─── Keyboard spacebar for replay ─────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' && phase.value === 'quiz' && !answered.value) {
    e.preventDefault();
    replay();
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));

// ─── SVG ring helper ──────────────────────────────────────────────────────────
const RING_R = 26;
const RING_CIRC = 2 * Math.PI * RING_R;
function ringOffset(fill: number): number {
  return RING_CIRC * (1 - fill / 100);
}
</script>

<template>
  <div class="game">

    <!-- Header -->
    <div class="header">
      <button class="btn-back" @click="emit('back')">‹ Retour</button>
      <div class="header-center">
        <span class="lesson-tag">Leçon {{ lessonId }}</span>
        <span class="lesson-name">{{ lesson.newLetters.join(' & ') }}</span>
      </div>
      <div class="xp-badge">⚡{{ store.totalXP }}</div>
    </div>

    <!-- Progress bar -->
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: (questionIndex / ROUND_Q * 100) + '%' }"></div>
    </div>

    <!-- ═══ INTRO PHASE ════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="intro">
      <div class="intro-title">Nouvelles lettres</div>
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
        <div class="pool-label">Révision incluse :</div>
        <div class="pool-letters">
          <span v-for="l in lesson.pool.filter(x => !lesson.newLetters.includes(x))" :key="l" class="pool-l">{{ l }}</span>
        </div>
      </div>
      <button class="btn-start" @click="startQuiz">Commencer</button>
    </div>

    <!-- ═══ QUIZ PHASE ═════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'quiz'" class="quiz">

      <!-- Morse animation zone -->
      <div class="signal-zone">
        <div class="signal-symbols">
          <TransitionGroup name="sym-pop">
            <span
              v-for="(s, i) in playingSymbols"
              :key="i"
              class="sym"
              :class="s === '.' ? 'dot' : 'dash'"
            ></span>
          </TransitionGroup>
          <span v-if="!isPlaying && playingSymbols.length === 0" class="sig-placeholder">···</span>
        </div>
        <div class="signal-actions">
          <button class="btn-replay" :disabled="isPlaying" @click="replay">
            <span>▶</span> Réécouter
          </button>
          <button class="btn-hint" :class="{ used: hintUsed }" :disabled="answered" @click="showHint">
            ?
          </button>
        </div>
      </div>

      <!-- Streak banner -->
      <div v-if="store.streak >= 3" class="streak-bar">
        🔥 {{ store.streak }} en série
      </div>

      <!-- Letter grid -->
      <div
        class="letter-grid"
        :class="'cols-' + Math.ceil(Math.sqrt(shuffledPool.length))"
      >
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
          @click="selectAnswer(letter)"
        >
          <!-- SVG progress ring -->
          <svg class="ring" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" :r="RING_R" />
            <circle
              class="ring-fill"
              cx="32" cy="32"
              :r="RING_R"
              :stroke-dasharray="RING_CIRC"
              :stroke-dashoffset="ringOffset(getFill(letter))"
            />
          </svg>
          <span class="btn-char">{{ letter }}</span>
          <span v-if="lesson.newLetters.includes(letter)" class="new-dot"></span>
        </button>
      </div>

      <!-- Feedback -->
      <Transition name="fade">
        <div v-if="answered" class="feedback" :class="isCorrect ? 'fb-ok' : 'fb-err'">
          <template v-if="isCorrect">Correct !</template>
          <template v-else>
            C'était <strong>{{ currentLetter }}</strong> = {{ MORSE_DICT[currentLetter] }}
          </template>
        </div>
      </Transition>
    </div>

    <!-- ═══ RESULT PHASE ════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result'" class="result-screen">
      <div class="result-emoji">📡</div>
      <div class="result-title">Bonne session !</div>
      <div class="result-sub">Continue à pratiquer pour débloquer la leçon suivante.</div>
      <div class="result-letter-grid">
        <div v-for="l in lesson.pool" :key="l" class="rl-item">
          <svg viewBox="0 0 64 64" class="rl-ring">
            <circle class="ring-bg" cx="32" cy="32" :r="RING_R" />
            <circle class="ring-fill" cx="32" cy="32" :r="RING_R"
              :stroke-dasharray="RING_CIRC"
              :stroke-dashoffset="ringOffset(getFill(l))" />
          </svg>
          <span class="rl-char">{{ l }}</span>
        </div>
      </div>
      <div class="result-actions">
        <button class="btn-start" @click="restart">Rejouer</button>
        <button class="btn-home" @click="emit('back')">Accueil</button>
      </div>
    </div>

    <!-- ═══ LEVEL UP PHASE ══════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'levelup'" class="levelup-screen">
      <div class="lu-glow">🏆</div>
      <div class="lu-title">Leçon {{ lessonId }} terminée !</div>
      <div class="lu-sub" v-if="lessonId < 13">
        Leçon {{ lessonId + 1 }} débloquée !
      </div>
      <div class="lu-sub" v-else>Tu as maîtrisé l'alphabet Morse !</div>
      <div class="result-actions">
        <button class="btn-start" @click="emit('lesson-done')">Continuer</button>
        <button class="btn-home" @click="emit('back')">Accueil</button>
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

/* Header */
.header {
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

.lesson-tag {
  font-size: 0.6rem;
  color: var(--accent);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.lesson-name {
  font-size: 1rem;
  font-weight: 700;
}

.xp-badge {
  font-size: 0.75rem;
  color: var(--accent);
  min-width: 55px;
  text-align: right;
  font-weight: 700;
}

/* Progress */
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

/* ─── INTRO ──────────────────────────────────────────────────────────────── */
.intro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.2rem;
  gap: 1.5rem;
}

.intro-title {
  font-size: 0.7rem;
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
  font-size: 0.65rem;
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

.btn-start {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 1rem 3rem;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 800;
  width: 100%;
  max-width: 320px;
}

.btn-start:active { opacity: 0.85; transform: scale(0.97); }

/* ─── QUIZ ───────────────────────────────────────────────────────────────── */
.quiz {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 1rem 1.5rem;
  gap: 1rem;
}

/* Signal zone */
.signal-zone {
  background: #000;
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 1.4rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  min-height: 120px;
  justify-content: center;
}

.signal-symbols {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  flex-wrap: wrap;
  justify-content: center;
}

.sym {
  background: var(--accent);
  display: block;
  border-radius: 50px;
  box-shadow: 0 0 10px rgba(245,197,66,0.4);
}
.sym.dot  { width: 18px; height: 18px; border-radius: 50%; }
.sym.dash { width: 54px; height: 18px; }

.sig-placeholder {
  font-size: 1.5rem;
  color: var(--text-muted);
  letter-spacing: 6px;
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
  padding: 0.45rem 1.2rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: background 0.1s;
}

.btn-replay:not(:disabled):active {
  background: var(--accent);
  color: #000;
}

.btn-replay:disabled { opacity: 0.4; }

.btn-hint {
  width: 38px;
  height: 38px;
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

.btn-hint.used {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-hint:disabled { opacity: 0.35; }

/* Streak */
.streak-bar {
  background: rgba(245,197,66,0.12);
  border: 1px solid rgba(245,197,66,0.25);
  border-radius: 8px;
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  color: var(--accent);
  text-align: center;
  font-weight: 600;
}

/* Letter grid */
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
  transition: border-color 0.12s, background 0.12s, transform 0.08s;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  padding: 0;
}

.letter-btn:not(:disabled):not(.btn-correct):not(.btn-wrong):not(.btn-dim):active {
  transform: scale(0.9);
  border-color: var(--accent);
}

.letter-btn:disabled:not(.btn-correct):not(.btn-wrong) { opacity: 0.55; }

.btn-correct {
  background: var(--green-dim);
  border-color: var(--green) !important;
}

.btn-wrong {
  background: var(--red-dim);
  border-color: var(--red) !important;
}

.btn-dim { opacity: 0.25; }

.btn-new .btn-char { color: var(--accent); }

/* SVG ring */
.ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--ring-bg);
  stroke-width: 3;
}

.ring-fill {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

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
  padding: 0.7rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  text-align: center;
  font-weight: 600;
}

.fb-ok {
  background: var(--green-dim);
  border: 1px solid var(--green);
  color: var(--green);
}

.fb-err {
  background: var(--red-dim);
  border: 1px solid var(--red);
  color: var(--red);
}

/* ─── RESULT / LEVEL UP ──────────────────────────────────────────────────── */
.result-screen,
.levelup-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1.2rem;
  gap: 1rem;
}

.result-emoji,
.lu-glow {
  font-size: 4rem;
  line-height: 1;
}

.result-title,
.lu-title {
  font-size: 1.4rem;
  font-weight: 800;
}

.result-sub,
.lu-sub {
  font-size: 0.85rem;
  color: var(--text-dim);
  text-align: center;
  max-width: 260px;
}

.result-letter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  max-width: 320px;
  margin: 0.5rem 0;
}

.rl-item {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rl-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.rl-char {
  position: relative;
  font-size: 1.1rem;
  font-weight: 800;
  z-index: 1;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  max-width: 320px;
  margin-top: auto;
}

.btn-home {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 0.85rem;
  border-radius: 14px;
  font-size: 0.9rem;
  width: 100%;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sym-pop-enter-active { transition: transform 0.15s ease, opacity 0.15s; }
.sym-pop-enter-from   { transform: scale(0.5); opacity: 0; }

/* Mobile tweaks */
@media (max-width: 360px) {
  .btn-char { font-size: 1.3rem; }
  .sym.dash { width: 42px; }
  .cols-4 { grid-template-columns: repeat(4, 1fr); gap: 0.35rem; }
}
</style>
