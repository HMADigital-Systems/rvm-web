<template>
  <div class="flex flex-col items-center min-h-screen bg-gradient-to-b from-green-50 to-white pb-24">
    <!-- 🧑 User Header -->
    <div class="w-full bg-green-600 text-white py-10 text-center shadow-md">
      <img
        :src="user.avatar"
        alt="Profile"
        class="w-24 h-24 mx-auto rounded-full border-4 border-white object-cover shadow-lg"
      />
      <h2 class="text-xl font-semibold mt-3">{{ user.name }}</h2>
      <p class="text-sm text-green-100">{{ user.phone || "Phone not set" }}</p>
    </div>

    <!-- 📋 User Details -->
    <div class="w-11/12 max-w-md bg-white rounded-2xl shadow p-6 mt-6 text-gray-700">
      <div class="flex justify-between items-center border-b pb-3 mb-3">
        <span class="font-medium">Total Recycled</span>
        <span>{{ user.totalWeight }} kg</span>
      </div>

      <div class="flex justify-between items-center">
        <span class="font-medium">Reward Points</span>
        <span>{{ user.points }}</span>
      </div>
    </div>

    <!-- 🚪 Logout Button -->
    <button
      @click="logout"
      class="mt-8 w-11/12 max-w-md bg-red-500 text-white py-2 rounded-full font-semibold hover:bg-red-600 transition"
    >
      Logout
    </button>

    <!-- ⚙️ Bottom Navbar -->
    <Navbar />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Navbar from "../components/Navbar.vue";
import { useRouter } from "vue-router";
import { getUserRecords } from "../services/autogcm.js";

const router = useRouter();

const user = ref({
  name: "",
  phone: "",
  totalWeight: 0,
  points: 0,
  avatar: "/images/profile.png",
});

onMounted(async () => {
  const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");

  user.value.name = localUser.nikeName || "User";
  user.value.phone = localUser.phone || "Not linked";
  user.value.avatar = localUser.avatarUrl || "/images/profile.png";
  user.value.points = localUser.integral || 0;

  if (localUser.phone) {
    const recordRes = await getUserRecords(localUser.phone);
    if (recordRes?.data?.list?.length) {
      const total = recordRes.data.list.reduce((sum, item) => sum + (item.weight || 0), 0);
      user.value.totalWeight = total.toFixed(2);
    }
  }
});

const logout = () => {
  localStorage.clear();
  router.push("/login");
};
</script>