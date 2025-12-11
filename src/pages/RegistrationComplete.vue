<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white px-6 text-center">
    <div class="w-20 h-20 mb-4 rounded-full bg-green-100 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h2 class="text-2xl font-bold text-green-700 mb-2">Registration Complete</h2>
    <p class="text-gray-600 mb-6">Welcome, <span class="font-semibold text-green-700">{{ displayName }}</span>!</p>
    <button @click="goToHome" class="w-full max-w-xs bg-green-600 text-white py-2 rounded-full font-semibold hover:bg-green-700 transition">
      Start Recycling
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const userData = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
const displayName = ref(userData?.nikeName || "User");

const goToHome = () => router.push("/home-page");
</script>
