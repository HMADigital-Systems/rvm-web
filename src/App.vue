<script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>


<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-green-100 text-center">
    <h1 class="text-3xl font-bold text-green-700">Tailwind is Working!</h1>
    <p class="text-gray-600 mt-2">Welcome to your RVM Web App 🚀</p>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
