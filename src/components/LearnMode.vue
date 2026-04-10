<script setup lang="ts">
import { ref } from 'vue';
import { MORSE_DICT, LEVELS } from '../morseUtils';
import { getStars, isLevelUnlocked } from '../store';
import { morseAudio } from '../audio';

const emit = defineEmits<{
  back: [];
  'go-quiz': [level: number];
}>();

const selected = ref<string | null>(null);
const selectedLevelId = ref(1);

function open(letter: string, levelId: number) {
  selected.value = letter;
  selectedLevelId.value = levelId;
  playLetter(letter);
}

function close() {
  selected.value = null;
}

function playLetter(letter: string) {
  const seq = MORSE_DICT[letter];
  if (seq) morseAudio.playSequence(seq, 120);
}
</script>

<template>
  <div class="learn">

    <!-- Header -->
    <div class="learn-header">
      <button class="back-btn" @click="emit('back')">← Retour</button>
      <span class="header-title">ALPHABET MORSE</span>
      <div style="width:70px"></div>
    </div>

    <!-- Letter detail overlay -->
    <Transition name="slide-up">
      <div v-if="selected" class="overlay" @click.self="close">
        <div class="detail-card">
          <button class="close-x" @click="close">✕</button>

          <div class="detail-letter">{{ selected }}</div>
          <div class="detail-morse-text">{{ MORSE_DICT[selected] }}</div>

          <div class="detail-symbols">
            <span
              v-for="(s, i) in (MORSE_DICT[selected] || '').split('')"
              :key="i"
              class="dsym"
              :class="s === '.' ? 'dot' : 'dash'"
            ></span>
          </div>

          <div class="detail-stars">
            <span v-for="i in 3" :key="i" :class="i <= getStars(selected) ? 'star-on' : 'star-off'">★</span>
          </div>

          <div class="detail-actions">
            <button class="btn-listen" @click="playLetter(selected)">&#9654; Réécouter</button>
            <button class="btn-practice" @click="emit('go-quiz', selectedLevelId)">
              Pratiquer ce niveau
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Alphabet by level -->
    <div class="learn-body">
      <div v-for="level in LEVELS" :key="level.id" class="level-block">
        <div class="level-head">
          <span class="level-tag">N{{ level.id }}</span>
          <span class="level-name">{{ level.name }}</span>
          <span v-if="!isLevelUnlocked(level.id)" class="locked-tag">VERROUILLÉ</span>
        </div>
        <div class="letter-grid" :class="{ locked: !isLevelUnlocked(level.id) }">
          <div
            v-for="letter in level.letters"
            :key="letter"
            class="lcard"
            :class="{ mastered: getStars(letter) >= 3 }"
            @click="isLevelUnlocked(level.id) && open(letter, level.id)"
          >
            <div class="lcard-letter">{{ letter }}</div>
            <div class="lcard-morse">{{ MORSE_DICT[letter] }}</div>
            <div class="lcard-stars">
              <span v-for="i in 3" :key="i" :class="i <= getStars(letter) ? 'star-on' : 'star-off'">★</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.learn {
  min-height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.learn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-title {
  font-size: 0.65rem;
  letter-spacing: 2.5px;
  color: var(--text-dim);
}

/* Letter detail overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.detail-card {
  background: var(--surface);
  border: 2px solid var(--primary);
  border-radius: 22px;
  padding: 2.5rem 1.8rem;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  position: relative;
  box-shadow: 0 0 40px var(--primary-glow);
}

.close-x {
  position: absolute;
  top: 0.8rem;
  right: 0.9rem;
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.3rem;
}

.detail-letter {
  font-size: 5.5rem;
  font-weight: bold;
  color: var(--primary);
  line-height: 1;
  text-shadow: 0 0 30px var(--primary-glow);
}

.detail-morse-text {
  font-size: 1.4rem;
  letter-spacing: 5px;
  color: var(--text-dim);
}

.detail-symbols {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.dsym {
  background: var(--primary);
  display: block;
  border-radius: 4px;
}

.dsym.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.dsym.dash {
  width: 48px;
  height: 16px;
}

.detail-stars {
  font-size: 1.4rem;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

.btn-listen {
  background: transparent;
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: 0.7rem;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  width: 100%;
}

.btn-listen:active {
  background: var(--primary);
  color: #000;
}

.btn-practice {
  background: var(--primary);
  border: none;
  color: #000;
  padding: 0.8rem;
  border-radius: 12px;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.9rem;
  width: 100%;
}

/* Alphabet body */
.learn-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.level-block {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.level-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.level-tag {
  background: var(--primary);
  color: #000;
  font-size: 0.6rem;
  font-weight: bold;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 1px;
}

.level-name {
  font-size: 0.85rem;
  color: var(--text);
}

.locked-tag {
  margin-left: auto;
  font-size: 0.55rem;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  letter-spacing: 1px;
}

.letter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
}

.letter-grid.locked {
  opacity: 0.3;
  pointer-events: none;
}

.lcard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s, transform 0.1s;
}

.lcard:active {
  transform: scale(0.91);
  border-color: var(--primary);
}

.lcard.mastered {
  border-color: rgba(0, 255, 65, 0.35);
  background: rgba(0, 255, 65, 0.04);
}

.lcard-letter {
  font-size: 1.5rem;
  font-weight: bold;
}

.lcard-morse {
  font-size: 0.6rem;
  color: var(--text-dim);
  letter-spacing: 2px;
}

.lcard-stars {
  font-size: 0.5rem;
}

/* Slide-up transition */
.slide-up-enter-active { transition: all 0.25s ease; }
.slide-up-leave-active { transition: all 0.2s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(30px); }
.slide-up-leave-to  { opacity: 0; transform: translateY(10px); }

@media (min-width: 480px) {
  .letter-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
