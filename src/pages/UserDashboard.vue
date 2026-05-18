<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    
    <!-- Header -->
    <div class="bg-gradient-to-b from-green-700 to-green-600 text-white pt-6 px-6 pb-8 rounded-b-3xl shadow-lg relative">
      <button @click="router.back()" class="absolute top-6 left-4 p-2 bg-green-700/70 rounded-full hover:bg-green-700 transition z-10">
        <ArrowLeft class="w-5 h-5" />
      </button>

      <div class="text-center px-10">
        <h1 class="text-2xl font-bold">{{ t('dashboard.title') }}</h1>
        <p class="text-green-100 text-sm">{{ t('dashboard.subtitle') }}</p>
      </div>
    </div>

    <!-- Summary Cards (3 cols) -->
    <div class="px-6 -mt-6 grid grid-cols-3 gap-3 relative z-10">
      <div class="bg-white p-3 rounded-2xl shadow-md text-center">
        <Scale class="w-5 h-5 mx-auto text-blue-500 mb-1" />
        <p class="text-lg font-bold text-gray-800">{{ stats.totalWeight }}</p>
        <p class="text-[10px] text-gray-500">KG Recycled</p>
      </div>

      <div class="bg-white p-3 rounded-2xl shadow-md text-center">
        <Coins class="w-5 h-5 mx-auto text-yellow-500 mb-1" />
        <p class="text-lg font-bold text-gray-800">RM {{ stats.totalCash }}</p>
        <p class="text-[10px] text-gray-500">{{ t('dashboard.cash_earned') }}</p>
      </div>

      <div class="bg-white p-3 rounded-2xl shadow-md text-center">
        <Leaf class="w-5 h-5 mx-auto text-green-500 mb-1" />
        <p class="text-lg font-bold text-gray-800">{{ co2Saved }}</p>
        <p class="text-[10px] text-gray-500">CO₂ Saved</p>
      </div>
    </div>

    <!-- Breakdown: Dry Recycling + UCO Recycling -->
    <div class="px-6 mt-5">
      <div class="grid grid-cols-2 gap-3">

        <!-- Dry Recycling -->
        <div class="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">🧴</span>
            <span class="font-bold text-gray-800 text-sm">Dry Recycling</span>
          </div>
          <p class="text-2xl font-bold text-blue-600">{{ dryStats.weight }} kg</p>
          <p class="text-xs text-gray-500 mt-1">RM {{ dryStats.cash }} earned</p>
          <p class="text-[10px] text-blue-400 mt-0.5">Plastic • Paper • Cans • E-Waste</p>
        </div>

        <!-- UCO Recycling -->
        <div class="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-4 shadow-sm border border-amber-100">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">🫒</span>
            <span class="font-bold text-gray-800 text-sm">UCO Recycling</span>
          </div>
          <p class="text-2xl font-bold text-amber-600">{{ ucoStats.weight }} kg</p>
          <p class="text-xs text-gray-500 mt-1">RM {{ ucoStats.cash }} earned</p>
          <p class="text-[10px] text-amber-400 mt-0.5">Used Cooking Oil only</p>
          <div class="mt-2 pt-2 border-t border-amber-200/50">
            <p class="text-[10px] text-gray-400">🍽️ Food Waste — <span class="text-amber-500 font-semibold">Coming Soon</span> (B2B)</p>
          </div>
        </div>

      </div>
    </div>

    <!-- Environmental Impact -->
    <div class="px-6 mt-3">
      <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">🌳</span>
          <span class="text-xs text-gray-600">Equivalent to <strong class="text-green-700">{{ treesPlanted }}</strong> trees planted</span>
        </div>
        <span class="text-xs text-gray-400">🏆 {{ badge }}</span>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="px-6 mt-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-gray-800 text-base">{{ t('dashboard.recent_activity') }}</h3>
        <span class="text-xs text-gray-400">{{ filteredHistory.length }} records</span>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-4">
        <button 
          v-for="tab in filterTabs" :key="tab.key"
          @click="activeFilter = tab.key"
          :class="[
            'px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1',
            activeFilter === tab.key 
              ? 'bg-green-600 text-white shadow-sm' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          ]"
        >
          <span>{{ tab.emoji }}</span> {{ tab.label }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="n in 3" :key="n" class="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredHistory.length === 0" class="text-center py-12">
        <span class="text-5xl block mb-3">♻️</span>
        <p class="text-gray-500 font-medium">{{ t('dashboard.no_records') }}</p>
        <p class="text-sm text-gray-400 mt-1">{{ t('dashboard.start_prompt') }}</p>
      </div>

      <!-- History List -->
      <div v-else class="space-y-3">
        <div 
          v-for="item in filteredHistory" :key="item.id"
          class="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div class="flex items-center space-x-3">
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center text-lg',
              isUCO(item) ? 'bg-amber-50' : 'bg-blue-50'
            ]">
              {{ isUCO(item) ? '🫒' : '🧴' }}
            </div>
            <div>
              <p class="font-semibold text-gray-800 text-sm">
                {{ isUCO(item) ? '🫒 ' : '🧴 ' }}{{ translateWaste(item.rubbishName) }}
              </p>
              <div class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>📍 {{ item.deviceName || 'RVM Station' }}</span>
                <span>•</span>
                <span>{{ formatDate(item.createTime) }}</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p :class="['font-bold', isUCO(item) ? 'text-amber-600' : 'text-blue-600']">
              +RM{{ Number(item.integral || 0).toFixed(2) }}
            </p>
            <p class="text-xs text-gray-500">{{ Number(item.weight || 0).toFixed(2) }} kg</p>
          </div>
        </div>
      </div>
    </div>

    <!-- MyGreenShop Button -->
    <div class="mt-6 mb-4 px-6">
      <button 
        @click="router.push('/market')"
        class="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <ShoppingBag class="w-5 h-5" /> 🏪 MyGreenShop — Spend your earnings
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Scale, Coins, Leaf, ShoppingBag } from "lucide-vue-next";
import { useUserDashboard } from "../composables/useUserDashboard.js";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
const { stats, history, isLoading, formatDate, isUCO } = useUserDashboard();

// Filter tabs
const activeFilter = ref("all");
const filterTabs = [
  { key: "all", label: "All", emoji: "♻️" },
  { key: "dry", label: "Dry", emoji: "🧴" },
  { key: "uco", label: "UCO", emoji: "🫒" }
];

// Compute filtered history
const filteredHistory = computed(() => {
  if (activeFilter.value === "all") return history.value;
  if (activeFilter.value === "dry") return history.value.filter(item => !isUCO(item));
  if (activeFilter.value === "uco") return history.value.filter(item => isUCO(item));
  return history.value;
});

// Dry recycling stats (calculated from vendor API history)
const dryStats = computed(() => {
  const dry = history.value.filter(item => !isUCO(item));
  const weight = dry.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const cash = dry.reduce((sum, item) => sum + (Number(item.integral) || 0), 0);
  return { weight: weight.toFixed(2), cash: cash.toFixed(2) };
});

// UCO recycling stats
const ucoStats = computed(() => {
  const uco = history.value.filter(item => isUCO(item));
  const weight = uco.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const cash = uco.reduce((sum, item) => sum + (Number(item.integral) || 0), 0);
  return { weight: weight.toFixed(2), cash: cash.toFixed(2) };
});

// CO₂ Saved = totalWeight * 0.5 (industry standard: ~0.5kg CO2 per kg recycled)
const co2Saved = computed(() => {
  return (parseFloat(stats.value.totalWeight || 0) * 0.5).toFixed(1);
});

// Trees planted = floor(totalWeight * 0.5 / 25)
const treesPlanted = computed(() => {
  const total = parseFloat(stats.value.totalWeight || 0);
  return Math.floor(total * 0.5 / 25);
});

// Badge based on total weight
const badge = computed(() => {
  const total = parseFloat(stats.value.totalWeight || 0);
  if (total >= 500) return "💎 Platinum";
  if (total >= 100) return "🥇 Gold";
  if (total >= 50) return "🥈 Silver";
  if (total >= 10) return "🥉 Bronze";
  return "🌱 Starter";
});

// Translate waste name
const translateWaste = (name) => {
  if (!name) return t('waste.default');
  const key = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const translated = t(`waste.${key}`);
  return translated !== `waste.${key}` ? translated : name;
};
</script>
