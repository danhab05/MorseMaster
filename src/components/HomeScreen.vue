<script setup lang="ts">
import { computed, ref } from 'vue';
import { LESSONS, MORSE_DICT } from '../morseUtils';
import { store, getFill, isLessonUnlocked, resetProgress } from '../store';

const emit = defineEmits<{
  'go-lesson': [id: number];
  'go-free': [];
}>();

const showReset = ref(false);

const completedCount = computed(() =>
  Object.values(store.letters).filter(l => l.fill >= 100).length
);

function doReset() { resetProgress(); showReset.value = false; }
</script>

<template>
  <div class="home">

    <!-- Top bar -->
    <header class="topbar">
      <div class="app-name">Morse<span class="app-name-accent">Master</span></div>
      <div class="xp-pill">⚡ {{ store.totalXP }}</div>
    </header>

    <!-- Stats row -->
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-val">{{ completedCount }}</div>
        <div class="stat-lbl">lettres</div>
      </div>
      <div class="stat-box" :class="{ 'streak-active': store.streak >= 3 }">
        <div class="stat-val">{{ store.streak }}</div>
        <div class="stat-lbl">streak</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">{{ store.bestStreak }}</div>
        <div class="stat-lbl">meilleur</div>
      </div>
    </div>

    <!-- Lesson list -->
    <div class="section-label">LEÇONS</div>
    <div class="lesson-list">
      <div
        v-for="lesson in LESSONS"
        :key="lesson.id"
        class="lesson-row"
        :class="{
          unlocked: isLessonUnlocked(lesson.id),
          locked: !isLessonUnlocked(lesson.id),
          active: lesson.id === store.unlockedLesson,
        }"
        @click="isLessonUnlocked(lesson.id) && emit('go-lesson', lesson.id)"
      >
        <!-- Number bubble -->
        <div class="lesson-num" :class="{ done: lesson.newLetters.every(l => getFill(l) >= 100) }">
          <span v-if="lesson.newLetters.every(l => getFill(l) >= 100)">✓</span>
          <span v-else>{{ lesson.id }}</span>
        </div>

        <!-- New letters preview -->
        <div class="lesson-letters">
          <div v-for="letter in lesson.newLetters" :key="letter" class="ll-item">
            <span class="ll-char">{{ letter }}</span>
            <span class="ll-code">{{ MORSE_DICT[letter] }}</span>
            <!-- mini progress bar -->
            <div class="ll-bar">
              <div class="ll-bar-fill" :style="{ width: getFill(letter) + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Pool size + arrow -->
        <div class="lesson-right">
          <div class="pool-hint">{{ lesson.pool.length }} lettres</div>
          <div v-if="isLessonUnlocked(lesson.id)" class="arrow">›</div>
          <div v-else class="lock-ico">🔒</div>
        </div>
      </div>
    </div>

    <!-- Bottom buttons -->
    <div class="bottom-row">
      <button class="btn-free" @click="emit('go-free')">
        ·— Mode libre
      </button>
      <button class="btn-reset" @click="showReset = true">Reset</button>
    </div>

    <!-- Reset modal -->
    <div v-if="showReset" class="overlay" @click.self="showReset = false">
      <div class="modal">
        <div class="modal-title">Réinitialiser ?</div>
        <div class="modal-sub">Toute la progression sera perdue.</div>
        <div class="modal-row">
          <button class="modal-cancel" @click="showReset = false">Annuler</button>
          <button class="modal-ok" @click="doReset">Confirmer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 0 5rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Topbar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.2rem 0.6rem;
}

.app-name {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--text);
}

.app-name-accent { color: var(--accent); }

.xp-pill {
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
}

/* Stats */
.stats-row {
  display: flex;
  gap: 0.6rem;
  padding: 0.5rem 1.2rem 1.2rem;
}

.stat-box {
  flex: 1;
  background: var(--surface);
  border-radius: 12px;
  padding: 0.8rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  border: 1px solid var(--border);
}

.stat-box.streak-active {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.stat-box.streak-active .stat-val { color: var(--accent); }

.stat-val {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.stat-lbl {
  font-size: 0.6rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Section label */
.section-label {
  font-size: 0.6rem;
  letter-spacing: 2px;
  color: var(--text-muted);
  padding: 0 1.2rem 0.5rem;
}

/* Lesson list */
.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1.2rem;
  flex: 1;
}

.lesson-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 0.85rem 1rem;
  transition: transform 0.1s;
}

.lesson-row.unlocked { cursor: pointer; }
.lesson-row.locked { opacity: 0.35; cursor: default; }
.lesson-row.active { border-color: var(--accent); }
.lesson-row.unlocked:active { transform: scale(0.97); }

/* Lesson number bubble */
.lesson-num {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 700;
  flex-shrink: 0;
  color: var(--text-dim);
}

.lesson-num.done {
  background: var(--green);
  border-color: var(--green);
  color: #000;
}

/* New letters */
.lesson-letters {
  flex: 1;
  display: flex;
  gap: 1rem;
}

.ll-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 36px;
}

.ll-char {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.ll-code {
  font-size: 0.6rem;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
}

.ll-bar {
  width: 36px;
  height: 3px;
  background: var(--ring-bg);
  border-radius: 2px;
  overflow: hidden;
}

.ll-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* Right side */
.lesson-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  flex-shrink: 0;
}

.pool-hint {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.arrow {
  font-size: 1.4rem;
  color: var(--text-dim);
  line-height: 1;
}

.lock-ico { font-size: 0.9rem; }

/* Bottom */
.bottom-row {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 0.5rem;
  padding: 0.8rem 1.2rem;
  background: linear-gradient(to top, var(--bg) 80%, transparent);
  max-width: 480px;
  margin: 0 auto;
}

.btn-free {
  flex: 1;
  background: var(--accent);
  color: #000;
  border: none;
  padding: 0.9rem;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 700;
}

.btn-free:active { opacity: 0.85; transform: scale(0.97); }

.btn-reset {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 0.9rem 1rem;
  border-radius: 14px;
  font-size: 0.85rem;
}

/* Modal */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1.2rem;
}

.modal {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2rem 1.5rem;
  max-width: 300px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.modal-title { font-size: 1.1rem; font-weight: 700; }
.modal-sub { font-size: 0.85rem; color: var(--text-dim); }

.modal-row {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.modal-cancel {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
}

.modal-ok {
  flex: 1;
  background: var(--red);
  border: none;
  color: #fff;
  padding: 0.75rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
