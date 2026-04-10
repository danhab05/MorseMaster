<script setup lang="ts">
import { ref } from 'vue';
import HomeScreen from './components/HomeScreen.vue';
import GameScreen from './components/GameScreen.vue';
import FreeMode from './components/FreeMode.vue';

type Screen = 'home' | 'game' | 'free';

const screen = ref<Screen>('home');
const activeLesson = ref(1);

function goLesson(id: number) {
  activeLesson.value = id;
  screen.value = 'game';
}

function onLessonDone() {
  // Go to next lesson or home
  activeLesson.value = Math.min(activeLesson.value + 1, 13);
  screen.value = 'game';
}
</script>

<template>
  <Transition name="screen">
    <HomeScreen
      v-if="screen === 'home'"
      @go-lesson="goLesson"
      @go-free="screen = 'free'"
    />
    <GameScreen
      v-else-if="screen === 'game'"
      :lesson-id="activeLesson"
      @back="screen = 'home'"
      @lesson-done="onLessonDone"
    />
    <FreeMode
      v-else-if="screen === 'free'"
      @back="screen = 'home'"
    />
  </Transition>
</template>

<style>
.screen-enter-active, .screen-leave-active {
  transition: opacity 0.18s ease;
}
.screen-enter-from, .screen-leave-to {
  opacity: 0;
}
</style>
