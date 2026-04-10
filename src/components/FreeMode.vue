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
function onKeyUp(e: KeyboardEvent)   { if (e.code === 'Space') stopPress(e); }

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

    <!-- Header -->
    <div class="free-header">
      <button class="back-btn" @click="emit('back')">← Retour</button>
      <span class="header-title">MODE LIBRE</span>
      <div style="width:70px"></div>
    </div>

    <div class="free-body">

      <!-- Screen -->
      <div class="screen">
        <div class="morse-seq">{{ sequence || '...' }}</div>
        <div class="decoded">{{ decoded || '—' }}</div>
      </div>
      <button class="clear-btn" @click="sequence = ''">Effacer</button>

      <!-- Tap button -->
      <div class="tap-zone">
        <div
          class="tap-btn"
          :class="{ active: pressing }"
          @mousedown="startPress"
          @mouseup="stopPress"
          @mouseleave="stopPress"
          @touchstart.prevent="startPress"
          @touchend.prevent="stopPress"
          @touchcancel.prevent="stopPress"
        >
          <div class="tap-label">TAPPER</div>
          <div class="tap-hint">court = •   long = ━</div>
        </div>
      </div>

      <div class="timing-hint">
        Court &lt; {{ DOT_MAX_MS }}ms &nbsp;|&nbsp; Long &gt; {{ DOT_MAX_MS }}ms
      </div>

    </div>
  </div>
</template>

<style scoped>
.free {
  min-height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.free-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
}

.header-title {
  font-size: 0.65rem;
  letter-spacing: 2.5px;
  color: var(--text-dim);
}

.free-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem 2rem;
  gap: 1rem;
}

.screen {
  width: 100%;
  background: #000;
  border: 2px solid var(--primary);
  border-radius: 14px;
  padding: 1.5rem;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 22px var(--primary-glow);
  text-align: center;
}

.morse-seq {
  font-size: 1rem;
  color: var(--primary);
  opacity: 0.55;
  word-break: break-all;
  min-height: 1.4rem;
  margin-bottom: 0.6rem;
  letter-spacing: 2px;
}

.decoded {
  font-size: 2.2rem;
  font-weight: bold;
  color: var(--primary);
  word-break: break-all;
  text-transform: uppercase;
  min-height: 2.5rem;
}

.clear-btn {
  align-self: flex-end;
  background: transparent;
  border: 1px solid #ff4400;
  color: #ff4400;
  padding: 0.35rem 0.9rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: inherit;
}

.tap-zone {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}

.tap-btn {
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: var(--surface);
  border: 4px solid var(--primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.08s;
  box-shadow: 0 0 16px var(--primary-glow);
  -webkit-tap-highlight-color: transparent;
}

.tap-btn.active {
  background: var(--primary);
  transform: scale(0.91);
  box-shadow: 0 0 36px var(--primary);
}

.tap-btn.active .tap-label,
.tap-btn.active .tap-hint {
  color: #000;
}

.tap-label {
  font-size: 1.6rem;
  font-weight: bold;
  color: var(--primary);
  letter-spacing: 2px;
}

.tap-hint {
  font-size: 0.72rem;
  color: #666;
  letter-spacing: 1px;
}

.timing-hint {
  font-size: 0.7rem;
  color: var(--text-dim);
  opacity: 0.5;
}

@media (max-width: 380px) {
  .tap-btn {
    width: 155px;
    height: 155px;
  }

  .decoded {
    font-size: 1.8rem;
  }
}
</style>
