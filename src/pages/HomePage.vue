<template>
  <div class="flex flex-col min-h-screen bg-gradient-to-b from-green-50 to-white pb-24">
    <UserGreeting :user="user" />
    <section class="px-6 mt-20"></section>

    <!-- My Balance Card -->
    <section class="px-6 mt-2">
      <div class="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-5 shadow-lg text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-green-100 text-sm font-medium">{{ t('home.my_balance') }}</p>
            <p class="text-3xl font-bold mt-1">RM {{ user.balance !== null ? user.balance : '...' }}</p>
          </div>
          <div class="bg-white/20 rounded-full p-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-green-400/30 flex items-center justify-between text-xs text-green-100">
          <span>{{ t('home.total_weight') }}: {{ user.totalWeight || '0.00' }} kg</span>
          <span v-if="user.pendingEarnings > 0" class="bg-green-700/40 px-2 py-1 rounded flex items-center">
            <span class="mr-1 animate-pulse">●</span> +RM{{ user.pendingEarnings || '0.00' }} {{ t('home.pending') }}
          </span>
        </div>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="px-6 mt-5">
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{{ t('home.quick_actions') }}</h3>
      <div class="grid grid-cols-2 gap-3">
        <!-- Cash Out -->
        <button @click="$router.push('/withdraw')" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all active:scale-95">
          <span class="text-2xl">💰</span>
          <span class="font-semibold text-gray-800 text-sm">{{ t('home.cash_out') }}</span>
        </button>

        <!-- Activity (Dashboard) -->
        <button @click="$router.push('/dashboard')" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all active:scale-95">
          <span class="text-2xl">📜</span>
          <span class="font-semibold text-gray-800 text-sm">{{ t('home.activity') }}</span>
        </button>

        <!-- MyGreenShop -->
        <button @click="$router.push('/market')" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all active:scale-95">
          <span class="text-2xl">🏪</span>
          <span class="font-semibold text-gray-800 text-sm">{{ t('home.market') }}</span>
        </button>

        <!-- Scan QR -->
        <button @click="triggerQR" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all active:scale-95">
          <span class="text-2xl">📷</span>
          <span class="font-semibold text-gray-800 text-sm">{{ t('home.scan_qr') }}</span>
        </button>
      </div>
    </section>

    <!-- On-Demand Collection Banner -->
    <section class="px-6 mt-4">
      <button @click="$router.push('/on-demand-collection')" class="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-md flex items-center justify-center gap-3 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]">
        <span class="text-2xl">🚛</span>
        <div class="text-left">
          <p class="font-bold text-sm">On-Demand Collection</p>
          <p class="text-xs text-amber-100">UCO min 50kg • Others we review • Submit request</p>
        </div>
        <span class="ml-auto text-xl">→</span>
      </button>
    </section>

    <!-- Promo Carousel -->
    <section class="relative w-full max-w-md mx-auto mt-5">
      <Swiper
        :modules="[Autoplay, Pagination]"
        :autoplay="{ delay: 3500, disableOnInteraction: false }"
        :pagination="{ clickable: true }"
        loop
        class="rounded-2xl overflow-hidden shadow-lg"
      >
        <SwiperSlide v-for="(card, i) in promoSlides" :key="i" class="h-44 md:h-56 w-full">
          <div @click="$router.push(card.link)" :class="['w-full h-full flex items-center px-6 cursor-pointer bg-gradient-to-r', card.bg]">
            <div class="flex-1 text-white">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{{ card.emoji }}</span>
                <span class="text-xs font-semibold uppercase tracking-wider opacity-80">{{ card.subtitle }}</span>
              </div>
              <h2 class="text-xl font-bold leading-tight">{{ card.title }}</h2>
              <p class="text-sm mt-1 opacity-90">{{ card.desc }}</p>
              <div class="mt-2 flex items-center gap-2">
                <span class="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">{{ card.cta }}</span>
              </div>
            </div>
            <span class="text-6xl ml-2 opacity-30">{{ card.emoji }}</span>
          </div>
        </SwiperSlide>
      </Swiper>
    </section>

    <!-- Achievements Section -->
    <section class="px-6 mt-6">
      <div class="flex items-center space-x-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
        <h3 class="text-lg font-semibold text-gray-800">{{ t('home.achievements') }}</h3>
      </div>

      <div class="grid grid-cols-4 gap-3">
        <div v-for="(badge, i) in badgeData" :key="badge.name"
          @click="badge.progress >= 100 ? showBadge(badge) : null"
          :class="['flex flex-col items-center', badge.progress >= 100 ? 'cursor-pointer hover:scale-110 transition-transform' : '']"
        >
          <div class="relative w-16 h-16 mb-1">
            <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" stroke-width="4" />
              <circle cx="32" cy="32" r="28" fill="none" :stroke="badge.color" stroke-width="4" 
                :stroke-dasharray="175.93" :stroke-dashoffset="175.93 - (badge.progress / 100 * 175.93)" stroke-linecap="round" />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xl">{{ badge.icon }}</span>
            </div>
            <div v-if="badge.progress >= 100" class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] shadow">✓</div>
          </div>
          <p class="text-[10px] font-semibold text-gray-700 text-center">{{ badge.name }}</p>
          <p v-if="badge.progress >= 100" class="text-[9px] text-green-600 text-center">🎉 Tap</p>
          <p v-else class="text-[9px] text-gray-400 text-center">{{ badge.progress }}%</p>
        </div>
      </div>

      <div v-if="nextMilestone" class="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
        <p class="text-xs text-yellow-700">{{ remainingWeight }} kg more to reach {{ nextMilestone.name }}</p>
      </div>
    </section>

    <!-- Nearby Stations -->
    <section class="px-6 mt-6">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <h3 class="text-lg font-semibold text-green-700">{{ t('home.nearby') }}</h3>
          <span v-if="!isLoading" class="text-sm text-gray-500">({{ rvmList.length }})</span>
        </div>
      </div>

      <div class="flex overflow-x-auto space-x-4 pb-3 scrollbar-hide">
        <template v-if="isLoading">
          <RVMCardSkeleton v-for="n in 3" :key="n" />
        </template>
        <template v-else>
          <RVMCard
            v-for="rvm in rvmList"
            :key="rvm.deviceNo"
            :deviceNo="rvm.deviceNo"
            :status="rvm.status"
            :distance="rvm.distance"
            :address="rvm.address"
            :compartments="rvm.compartments"
            :latitude="rvm.latitude"
            :longitude="rvm.longitude"
            @click="goToMachineDetails(rvm.deviceNo)"
          />
        </template>
      </div>
    </section>

    <Navbar />
  </div>
</template>

<script setup>
import Navbar from "../components/NavBar.vue";
import RVMCard from "../components/RVMCard.vue";
import RVMCardSkeleton from "../components/RVMCardSkeleton.vue"; 
import UserGreeting from "../components/UserGreeting.vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { computed, watch } from "vue";

import { useHomeLogic } from "../composables/useHomeLogic.js";

const { t } = useI18n();
const { user, rvmList, sliderImages, isLoading } = useHomeLogic();
const router = useRouter();

const goToMachineDetails = (deviceNo) => {
  router.push(`/machine/${deviceNo}`);
};

const triggerQR = () => {
  window.dispatchEvent(new CustomEvent("open-qr-scanner"));
};

// Promo slides
const promoSlides = [
  { bg: "from-emerald-600 to-emerald-500", emoji: "🚛", title: "On-Demand Collection", subtitle: "Available Now!", desc: "Need bulk pickup? We come to you!", cta: "Submit Request →", link: "/on-demand-collection" },
  { bg: "from-blue-600 to-blue-500", emoji: "♻️", title: "Recycle Smart, Earn Cash", subtitle: "Every kg counts!", desc: "Turn waste into rewards", cta: "Start Recycling →", link: "/home-page" },
  { bg: "from-purple-600 to-purple-500", emoji: "🏪", title: "MyGreenShop", subtitle: "Coming Soon", desc: "Eco-friendly products & vouchers await!", cta: "Preview →", link: "/market" },
];

// Badge/achievement data
const badgeConfig = [
  { name: "🥉", full: "Bronze", threshold: 10, color: "#cd7f32" },
  { name: "🥈", full: "Silver", threshold: 50, color: "#c0c0c0" },
  { name: "🥇", full: "Gold", threshold: 100, color: "#ffd700" },
  { name: "💎", full: "Platinum", threshold: 500, color: "#e5e4e2" },
];

const badgeData = computed(() => {
  const weight = parseFloat(user.value.totalWeight || 0);
  return badgeConfig.map((b, i) => {
    const prevThreshold = i === 0 ? 0 : badgeConfig[i-1].threshold;
    const range = b.threshold - prevThreshold;
    const progress = Math.max(0, Math.min(range, weight - prevThreshold));
    const pct = range > 0 ? Math.round(progress / range * 100) : 100;
    return { ...b, name: b.full, progress: Math.min(100, pct), color: b.color };
  });
});

const nextMilestone = computed(() => badgeData.value.find(b => b.progress < 100) || null);
const remainingWeight = computed(() => {
  if (!nextMilestone.value) return 0;
  return Math.max(0, nextMilestone.value.threshold - parseFloat(user.value.totalWeight || 0));
});
</script>