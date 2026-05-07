<template>
  <div class="w-full min-h-screen flex flex-col justify-between bg-gradient-to-b from-green-100 to-white text-gray-800">
    <!-- 🌐 Language Selector -->
    <LanguageSelector />

    <!-- 🟢 Logo and Tagline -->
    <main class="flex flex-col items-center justify-center flex-grow px-6 text-center md:px-20 lg:px-40 -mt-16">

      <div class="relative">
        <img
          src="/icons/logo.png"
          alt="Smart RVM"
          class="w-48 h-48 md:w-64 md:h-64 animate-fadeIn drop-shadow-lg"
          @error="onLogoError"
        />
      </div>
      <h1 class="text-3xl md:text-4xl font-bold text-green-700 mt-2">{{ t("title") }}</h1>
      <p class="text-gray-500 mt-2 text-base md:text-lg max-w-sm">
        {{ t("tagline") }}
      </p>

      <div class="mt-10 w-full max-w-xs space-y-3">
        <button
          @click="goToLogin"
          class="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3.5 rounded-full text-base font-semibold shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 active:scale-[0.98]"
        >
          {{ t("get_started_button") }}
        </button>
      </div>
    </main>

    <!-- ⚙️ Footer -->
    <footer class="text-gray-400 text-sm text-center py-4">
      © 2025 {{ t("footer") }}
    </footer>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import LanguageSelector from "../components/LanguageSelector.vue";

const router = useRouter();
const { t } = useI18n();

const logoError = ref(false);
const onLogoError = () => { logoError.value = true; };

const goToLogin = () => {
  router.push("/login");
};
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 1.2s ease-in-out;
}
</style>
