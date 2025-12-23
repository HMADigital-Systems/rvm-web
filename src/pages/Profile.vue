<template>
  <div class="flex flex-col items-center min-h-screen bg-gradient-to-b from-green-50 to-white pb-24 relative">
    
    <div class="w-full bg-green-600 text-white py-10 text-center shadow-md">
      <div class="relative w-24 h-24 mx-auto">
        <img
          :src="user.avatar || '/images/profile.png'"
          alt="Profile"
          class="w-full h-full rounded-full border-4 border-white object-cover shadow-lg bg-gray-200"
          @error="handleImageError"
        />
      </div>
      <h2 class="text-xl font-semibold mt-3">{{ user.name }}</h2>
      <p class="text-sm text-green-100">{{ user.phone || "Phone not set" }}</p>
    </div>

    <div class="w-11/12 max-w-md bg-white rounded-2xl shadow p-6 mt-6 text-gray-700">
      <div class="flex justify-between items-center border-b pb-3 mb-3">
        <span class="font-medium">Total Recycled</span>
        
        <span v-if="user.totalWeight !== null" class="font-bold text-green-600">{{ user.totalWeight }} kg</span>
        <div v-else class="h-6 w-20 bg-gray-200 animate-pulse rounded"></div>

      </div>

      <div class="flex justify-between items-center">
        <span class="font-medium">Reward Points</span>
        <span>{{ user.points }}</span>
      </div>
    </div>

    <button 
      @click="openEditModal"
      class="mt-8 text-green-600 font-semibold hover:underline"
    >
      Edit Profile
    </button>

    <button
      @click="confirmLogout"
      class="mt-4 w-11/12 max-w-md bg-red-500 text-white py-2 rounded-full font-semibold hover:bg-red-600 transition shadow-md"
    >
      Logout
    </button>

    <Navbar />

    <div v-if="showLogoutModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
        <h3 class="text-lg font-bold text-gray-800 mb-2">Log Out?</h3>
        <p class="text-gray-500 mb-6">Are you sure you want to sign out of your account?</p>
        <div class="flex gap-3 justify-center">
          <button @click="showLogoutModal = false" class="px-5 py-2 rounded-full bg-gray-200 text-gray-700 font-medium hover:bg-gray-300">Cancel</button>
          <button @click="performLogout" class="px-5 py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-600">Yes, Logout</button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">Edit Profile</h3>
        <div class="mb-4">
          <label class="block text-sm text-gray-600 mb-1">Nickname</label>
          <input v-model="editForm.name" class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none transition" placeholder="Enter new nickname" />
        </div>
        <div class="mb-6">
          <label class="block text-sm text-gray-600 mb-2">Select Avatar</label>
          <div class="grid grid-cols-4 gap-2">
            <div 
              v-for="(av, index) in presetAvatars" 
              :key="index"
              @click="editForm.avatar = av"
              class="relative cursor-pointer rounded-full p-1 border-2 transition"
              :class="editForm.avatar === av ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent hover:bg-gray-100'"
            >
              <img :src="av" class="w-10 h-10 rounded-full mx-auto bg-gray-100" />
              <div v-if="editForm.avatar === av" class="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-xs">✓</div>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="showEditModal = false" class="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition">Cancel</button>
          <button @click="saveProfile" class="flex-1 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50" :disabled="isSaving">{{ isSaving ? "Saving..." : "Save Changes" }}</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import Navbar from "../components/NavBar.vue";
import { useProfileLogic } from "../composables/useProfileLogic.js";

const { user, showLogoutModal, showEditModal, isSaving, editForm, presetAvatars, handleImageError, confirmLogout, performLogout, openEditModal, saveProfile } = useProfileLogic();
</script>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
</style>