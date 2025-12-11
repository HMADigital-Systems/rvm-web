<template>
  <div class="flex flex-col min-h-screen bg-gradient-to-b from-green-50 to-white pb-24">
    <UserGreeting :user="user" />
    <section class="px-6 mt-20"></section>

    <section class="relative w-full max-w-md mx-auto mt-4">
      <Swiper
        :modules="[Autoplay, Pagination]"
        :autoplay="{ delay: 2500, disableOnInteraction: false }"
        :pagination="{ clickable: true }"
        loop
        class="rounded-2xl overflow-hidden shadow-lg"
      >
        <SwiperSlide v-for="(img, i) in sliderImages" :key="i" class="h-44 md:h-56 w-full">
          <img :src="img" alt="Banner" class="w-full h-full object-cover" />
        </SwiperSlide>
      </Swiper>
    </section>

    <section class="flex justify-center mt-6">
      <div class="bg-white shadow rounded-2xl p-4 w-11/12 max-w-md text-gray-700 grid grid-cols-2 gap-4 text-center">
        <div>
          <p class="font-semibold text-lg text-green-700">{{ user.totalWeight }}kg</p>
          <p class="text-sm">Total Delivered Weight</p>
        </div>
        <div>
          <p class="font-semibold text-lg text-green-700">RM {{ user.balance }}</p>
          <p class="text-sm">Account Balance</p>
        </div>
      </div>
    </section>

    <section class="px-4 mt-6">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <Recycle class="w-5 h-5 text-green-600" />
          <h3 class="text-lg font-semibold text-green-700">Nearby Stations</h3>
          <span class="text-sm text-gray-500">({{ rvmList.length }})</span>
        </div>
      </div>

      <div class="flex overflow-x-auto space-x-4 pb-3">
        <RVMCard
          v-for="rvm in rvmList"
          :key="rvm.deviceNo"
          :deviceNo="rvm.deviceNo"
          :status="rvm.status"
          :distance="rvm.distance"
          :address="rvm.address"
          :compartments="rvm.compartments"
        />
      </div>
    </section>

    <Navbar />
  </div>
</template>

<script setup>
import Navbar from "../components/NavBar.vue";
import RVMCard from "../components/RVMCard.vue";
import UserGreeting from "../components/UserGreeting.vue";
import { Recycle } from "lucide-vue-next";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

// ⭐ Import the logic from the new file
import { useHomeLogic } from "../composables/useHomeLogic.js";

// Execute logic
const { user, rvmList, sliderImages } = useHomeLogic();
</script>