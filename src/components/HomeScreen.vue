<script setup lang="ts">
import { computed, ref } from 'vue';
import { LEVELS } from '../morseUtils';
import { store, getLevelProgress, isLevelUnlocked, getStars, resetProgress } from '../store';

const emit = defineEmits<{
  'go-learn': [];
  'go-quiz': [level: number];
  'go-free': [];
}>();

const showResetConfirm = ref(false);

const totalMastered = computed(() =>
  LEVELS.reduce((acc, level) => acc + getLevelProgress(level.id).mastered, 0)
);
const totalLetters = computed(() =>
  LEVELS.reduce((acc, level) => acc + level.letters.length, 0)
);

function confirmReset() {
  resetProgress();
  showResetConfirm.value = false;
}
</script>

<template>
  <div class="home">
    <header class="home-header">
      <div class="title-wrap">
        <h1 class="title">MORSE<span class="title-dim">MASTER</span></h1>
      </div>
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">{{ store.totalScore }}</span>
          <span class="stat-label">SCORE</span>
        </div>
        <div class="stat streak-stat" :class="{ active: store.streak > 0 }">
          <span class="stat-value">{{ store.streak }}</span>
          <span class="stat-label">STREAK</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ totalMastered }}<span class="stat-sub">/{{ totalLetters }}</span></span>
          <span class="stat-label">MAITRISÉES</span>
        </div>
      </div>
    </header>

    <main class="home-main">
      <section class="section">
        <div class="section-title">NIVEAUX</div>
        <div class="levels-list">
          <div
            v-for="level in LEVELS"
            :key="level.id"
            class="level-card"
            :class="{
              locked: !isLevelUnlocked(level.id),
              completed: getLevelProgress(level.id).mastered === level.letters.length
            }"
            @click="isLevelUnlocked(level.id) && emit('go-quiz', level.id)"
          >
            <div class="level-num">{{ level.id }}</div>
            <div class="level-body">
              <div class="level-name">{{ level.name }}</div>
              <div class="level-sub">{{ level.description }}</div>
              <div class="level-dots">
                <span
                  v-for="letter in level.letters"
                  :key="letter"
                  class="ldot"
                  :class="{ m1: getStars(letter) >= 1, m3: getStars(letter) >= 3 }"
                ></span>
              </div>
            </div>
            <div class="level-right">
              <template v-if="isLevelUnlocked(level.id)">
                <div class="level-count">
                  {{ getLevelProgress(level.id).mastered }}/{{ level.letters.length }}
                </div>
                <div class="play-circle">▶</div>
              </template>
              <div v-else class="lock-badge">VERR.</div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">AUTRES MODES</div>
        <div class="mode-row">
          <button class="mode-card" @click="emit('go-learn')">
            <div class="mode-icon-big">A</div>
            <div class="mode-name">Apprendre</div>
            <div class="mode-hint">Référence alphabet</div>
          </button>
          <button class="mode-card" @click="emit('go-free')">
            <div class="mode-icon-big">•—</div>
            <div class="mode-name">Mode libre</div>
            <div class="mode-hint">Taper du Morse</div>
          </button>
        </div>
      </section>

      <div class="reset-zone">
        <button class="reset-link" @click="showResetConfirm = true">Réinitialiser la progression</button>
      </div>
    </main>

    <!-- Confirm reset modal -->
    <div v-if="showResetConfirm" class="modal-overlay" @click.self="showResetConfirm = false">
      <div class="modal">
        <div class="modal-title">Réinitialiser ?</div>
        <div class="modal-body">Toute la progression sera effacée.</div>
        <div class="modal-actions">
          <button class="modal-cancel" @click="showResetConfirm = false">Annuler</button>
          <button class="modal-confirm" @click="confirmReset">Confirmer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
  gap: 1.5rem;
  padding-bottom: 2rem;
}

.home-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding-top: 0.5rem;
}

.title {
  margin: 0;
  font-size: 2rem;
  letter-spacing: 5px;
  color: var(--primary);
  text-shadow: 0 0 24px var(--primary-glow);
}

.title-dim {
  color: var(--text);
  opacity: 0.5;
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  width: 100%;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.7rem 0.5rem;
  gap: 0.2rem;
  border-right: 1px solid var(--border);
}

.stat:last-child {
  border-right: none;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: bold;
  color: var(--primary);
  line-height: 1;
}

.stat-sub {
  font-size: 0.8rem;
  opacity: 0.5;
}

.stat-label {
  font-size: 0.55rem;
  color: var(--text-dim);
  letter-spacing: 1.5px;
}

.streak-stat.active .stat-value {
  color: var(--warning);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.section-title {
  font-size: 0.65rem;
  letter-spacing: 2.5px;
  color: var(--text-dim);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.4rem;
}

.levels-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.level-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.9rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.level-card:not(.locked):active {
  transform: scale(0.98);
  border-color: var(--primary);
}

.level-card.completed {
  border-color: rgba(0, 255, 65, 0.3);
}

.level-card.locked {
  opacity: 0.38;
  cursor: default;
}

.level-num {
  width: 38px;
  height: 38px;
  border: 2px solid var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
  color: var(--primary);
  flex-shrink: 0;
}

.level-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.level-name {
  font-size: 0.95rem;
  font-weight: bold;
}

.level-sub {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.level-dots {
  display: flex;
  gap: 3px;
  margin-top: 0.3rem;
  flex-wrap: wrap;
}

.ldot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.2s;
}

.ldot.m1 { background: rgba(0, 255, 65, 0.4); }
.ldot.m3 { background: var(--primary); }

.level-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.level-count {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.play-circle {
  width: 34px;
  height: 34px;
  background: var(--primary);
  color: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.lock-badge {
  font-size: 0.55rem;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  letter-spacing: 1px;
}

.mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}

.mode-card {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 14px;
  padding: 1.1rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  transition: border-color 0.15s;
}

.mode-card:active {
  border-color: var(--primary);
}

.mode-icon-big {
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--primary);
  letter-spacing: 3px;
}

.mode-name {
  font-size: 0.85rem;
  font-weight: bold;
}

.mode-hint {
  font-size: 0.65rem;
  color: var(--text-dim);
}

.reset-zone {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.reset-link {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 0.7rem;
  text-decoration: underline;
  opacity: 0.5;
}

.reset-link:hover {
  opacity: 0.8;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem 1.5rem;
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--danger);
}

.modal-body {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.modal-actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.modal-cancel {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.7rem;
  border-radius: 10px;
  font-family: inherit;
}

.modal-confirm {
  flex: 1;
  background: var(--danger);
  border: none;
  color: #fff;
  padding: 0.7rem;
  border-radius: 10px;
  font-family: inherit;
  font-weight: bold;
}
</style>
