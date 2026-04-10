<script setup lang="ts">
import { ref } from 'vue';
import HomeScreen from './components/HomeScreen.vue';
import LearnMode from './components/LearnMode.vue';
import QuizMode from './components/QuizMode.vue';
import FreeMode from './components/FreeMode.vue';

type Screen = 'home' | 'learn' | 'quiz' | 'free';

const screen = ref<Screen>('home');
const quizLevel = ref(1);

function goQuiz(level: number) {
  quizLevel.value = level;
  screen.value = 'quiz';
}
</script>

<template>
  <HomeScreen
    v-if="screen === 'home'"
    @go-learn="screen = 'learn'"
    @go-quiz="goQuiz"
    @go-free="screen = 'free'"
  />
  <LearnMode
    v-else-if="screen === 'learn'"
    @back="screen = 'home'"
    @go-quiz="goQuiz"
  />
  <QuizMode
    v-else-if="screen === 'quiz'"
    :level-id="quizLevel"
    @back="screen = 'home'"
  />
  <FreeMode
    v-else-if="screen === 'free'"
    @back="screen = 'home'"
  />
</template>
