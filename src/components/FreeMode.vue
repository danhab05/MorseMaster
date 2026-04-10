<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { morseAudio } from '../audio';
import { decodeMorse } from '../morseUtils';

const emit = defineEmits<{ back: [] }>();

const DOT_MAX_MS = 250;
const LETTER_GAP_MS = 300;
const WORD_GAP_MS = 1000;

const sequence = ref('');
const pressing = ref(false);
const pressStart = ref(0);
const timer = ref<number | null>(null);

function startPress(e?: Event) {
  if (e) e.preventDefault();
  if (pressing.value) return;
  pressing.value = true;
  pressStart.value = Date.now();
  morseAudio.start();
  if (timer.value) { clearTimeout(timer.value); timer.value = null; }
}

function stopPress(e?: Event) {
  if (e) e.preventDefault();
  if (!pressing.value) return;
  pressing.value = false;
  morseAudio.stop();
  const dur = Date.now() - pressStart.value;
  sequence.value += dur < DOT_MAX_MS ? '.' : '-';
  scheduleGap();
}

function scheduleGap() {
  if (timer.value) clearTimeout(timer.value);
  timer.value = setTimeout(() => {
    if (sequence.value) sequence.value += ' ';
    timer.value = setTimeout(() => {
      if (sequence.value && !sequence.value.endsWith('   '))
        sequence.value += '  ';
    }, WORD_GAP_MS - LETTER_GAP_MS);
  }, LETTER_GAP_MS);
}

function onKeyDown(e: KeyboardEvent) { if (e.code === 'Space') startPress(e); }
function onKeyUp(e: KeyboardEvent) { if (e.code === 'Space') stopPress(e); }

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

const decoded = computed(() => decodeMorse(sequence.value));
</script>

<template>
  <div class="free">

    <div class="header">
      <button class="btn-back" @click="emit('back')">‹ Retour</button>
      <span class="header-title">Mode libre</span>
      <div style="width:60px"></div>
    </div>

    <div class="body">
      <div class="screen">
        <div class="seq">{{ sequence || '···' }}</div>
        <div class="decoded">{{ decoded || '—' }}</div>
      </div>
      <button class="clear" @click="sequence = ''">Effacer</button>

      <div class="tap-wrap">
        <div
          class="tap"
          :class="{ active: pressing }"
          @mousedown="startPress"
          @mouseup="stopPress"
          @mouseleave="stopPress"
          @touchstart.prevent="startPress"
          @touchend.prevent="stopPress"
          @touchcancel.prevent="stopPress"
        >
          <div class="tap-label">TAPPER</div>
          <div class="tap-sub">court • &nbsp; long —</div>
        </div>
      </div>

      <div class="hint">Espace = tapper • Maintenir = tiret</div>
    </div>
  </div>
</template>

<style scoped>
.free {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
}

.header-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1.2rem 2rem;
  gap: 0.8rem;
}

.screen {
  width: 100%;
  background: #000;
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
}

.seq {
  font-size: 0.9rem;
  color: var(--text-muted);
  word-break: break-all;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
  min-height: 1.3rem;
}

.decoded {
  font-size: 2.4rem;
  font-weight: 800;
  color: var(--text);
  word-break: break-all;
  text-transform: uppercase;
  min-height: 3rem;
  line-height: 1.1;
}

.clear {
  align-self: flex-end;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 0.3rem 0.8rem;
  border-radius: 8px;
  font-size: 0.75rem;
}

.tap-wrap {
  display: flex;
  justify-content: center;
  padding: 1.8rem 0;
}

.tap {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: var(--surface);
  border: 3px solid var(--accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.08s;
  box-shadow: 0 0 0 0 rgba(245,197,66,0);
}

.tap.active {
  background: var(--accent);
  transform: scale(0.91);
  box-shadow: 0 0 30px rgba(245,197,66,0.35);
}

.tap.active .tap-label,
.tap.active .tap-sub { color: #000; }

.tap-label {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 3px;
}

.tap-sub {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.hint {
  font-size: 0.68rem;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 360px) {
  .tap { width: 160px; height: 160px; }
  .decoded { font-size: 2rem; }
}
</style>
