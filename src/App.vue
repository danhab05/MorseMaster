<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { morseAudio } from './audio';
import { MORSE_DICT, decodeMorse } from './morseUtils';

// Constants for timing
const DOT_MAX_DURATION = 300; // ms
const LETTER_GAP = 600;       // ms (Plus rapide entre les lettres)
const WORD_GAP = 1500;        // ms (Plus fluide entre les mots)

const currentSequence = ref('');
const isPressing = ref(false);
const pressStartTime = ref(0);
const timer = ref<number | null>(null);

const startPress = (e?: Event) => {
  if (e) e.preventDefault();
  if (isPressing.value) return;
  
  isPressing.value = true;
  pressStartTime.value = Date.now();
  morseAudio.start();
  
  if (timer.value) {
    clearTimeout(timer.value);
    timer.value = null;
  }
};

const stopPress = (e?: Event) => {
  if (e) e.preventDefault();
  if (!isPressing.value) return;
  
  isPressing.value = false;
  morseAudio.stop();
  
  const duration = Date.now() - pressStartTime.value;
  currentSequence.value += duration < DOT_MAX_DURATION ? '.' : '-';
  startGapTimer();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space') startPress(e);
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') stopPress(e);
};

const startGapTimer = () => {
  if (timer.value) clearTimeout(timer.value);
  
  timer.value = setTimeout(() => {
    if (currentSequence.value) {
      currentSequence.value += ' ';
    }
    
    timer.value = setTimeout(() => {
      if (currentSequence.value && !currentSequence.value.endsWith('   ')) {
        currentSequence.value += '  ';
      }
    }, WORD_GAP - LETTER_GAP);

  }, LETTER_GAP);
};

const playLetter = (letter: string) => {
  const sequence = MORSE_DICT[letter];
  if (sequence) {
    morseAudio.playSequence(sequence);
  }
};

const clearText = () => {
  currentSequence.value = '';
};

const finalOutput = computed(() => {
  return decodeMorse(currentSequence.value);
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});
</script>

<template>
  <div class="morse-container">
    <header>
      <h1>Morse Master</h1>
      <p class="subtitle">Cliquez sur le bouton ou utilisez ESPACE</p>
    </header>

    <main>
      <section class="display-section">
        <div class="screen">
          <div class="morse-flow">{{ currentSequence || '...' }}</div>
          <div class="text-output">{{ finalOutput || 'DÉBUTANT' }}</div>
        </div>
        <button @click="clearText" class="clear-btn">Effacer tout</button>
      </section>

      <section class="control-section">
        <div 
          class="tap-button"
          :class="{ active: isPressing }"
          @mousedown="startPress"
          @mouseup="stopPress"
          @mouseleave="stopPress"
          @touchstart="startPress"
          @touchend="stopPress"
        >
          <div class="tap-label">TAPPER</div>
          <div class="tap-hint">. ou -</div>
        </div>
      </section>

      <section class="alphabet-section">
        <h3>Alphabet (Cliquez pour écouter)</h3>
        <div class="alphabet-grid">
          <div 
            v-for="(code, letter) in MORSE_DICT" 
            :key="letter"
            class="letter-card"
            @click="playLetter(letter as string)"
          >
            <span class="letter">{{ letter }}</span>
            <span class="code">{{ code }}</span>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <div class="legend">
        <span>● Court (< {{ DOT_MAX_DURATION }}ms)</span>
        <span>━ Long (> {{ DOT_MAX_DURATION }}ms)</span>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --primary: #00ff41;
  --primary-glow: rgba(0, 255, 65, 0.3);
  --bg: #0a0a0a;
  --surface: #1a1a1a;
  --text: #e0e0e0;
}

body {
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  background-color: var(--bg);
  color: var(--text);
  touch-action: manipulation; /* Empêche le zoom sur mobile */
}

.morse-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100vh;
}

header {
  text-align: center;
}

h1 {
  color: var(--primary);
  margin-bottom: 0.2rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 1.8rem;
}

.subtitle {
  color: #888;
  font-size: 0.9rem;
}

.screen {
  background: #000;
  border: 2px solid var(--primary);
  padding: 1.5rem;
  border-radius: 12px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 0 20px var(--primary-glow);
  text-align: center;
}

.morse-flow {
  font-size: 1.2rem;
  color: var(--primary);
  opacity: 0.6;
  margin-bottom: 0.5rem;
  min-height: 1.5rem;
  word-wrap: break-word;
}

.text-output {
  font-size: 2rem;
  color: var(--primary);
  font-weight: bold;
  word-break: break-all;
  text-transform: uppercase;
}

.display-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.clear-btn {
  background: transparent;
  border: 1px solid #ff4100;
  color: #ff4100;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  align-self: flex-end;
  border-radius: 4px;
  font-size: 0.8rem;
}

.control-section {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.tap-button {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: var(--surface);
  border: 4px solid var(--primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.1s;
  box-shadow: 0 0 15px var(--primary-glow);
  -webkit-tap-highlight-color: transparent;
}

.tap-button.active {
  background: var(--primary);
  transform: scale(0.92);
  box-shadow: 0 0 30px var(--primary);
}

.tap-button.active .tap-label,
.tap-button.active .tap-hint {
  color: #000;
}

.tap-label {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
}

.tap-hint {
  font-size: 0.8rem;
  color: #666;
}

.alphabet-section h3 {
  font-size: 1rem;
  color: #888;
  margin-bottom: 1rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
}

.alphabet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
  gap: 0.8rem;
}

.letter-card {
  background: var(--surface);
  padding: 0.8rem 0.4rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  border: 1px solid #333;
}

.letter {
  font-size: 1.2rem;
  font-weight: bold;
}

.code {
  font-size: 0.7rem;
  color: #888;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  color: #555;
  font-size: 0.8rem;
  padding: 1rem 0;
}

@media (max-width: 480px) {
  .tap-button {
    width: 150px;
    height: 150px;
  }
  .text-output {
    font-size: 1.6rem;
  }
  .alphabet-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
