<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-6">
    <div class="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">

      <h2 class="text-2xl font-semibold mb-4">Complete Your Profile</h2>

      <div class="mb-4 text-left">
        <label class="block text-sm text-gray-600 mb-1">Nickname</label>
        <input v-model="nickname" placeholder="Enter nickname"
               class="w-full border rounded-lg px-3 py-2" />
      </div>

      <button @click="saveProfile"
        class="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
        Save & Continue
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { registerUserWithAutoGCM } from "../services/autogcm.js";

const router = useRouter();
const nickname = ref("");

const saveProfile = async () => {
  const phone = localStorage.getItem("pendingPhoneVerified");

  if (!nickname.value) return alert("Please enter a nickname.");

  // Update profile into AutoGCM
  const response = await registerUserWithAutoGCM("", phone, nickname.value);

  if (response.code === 200) {
    localStorage.setItem("autogcmUser", JSON.stringify(response.data));
    router.push("/home-page");
  } else {
    alert("Failed: " + response.msg);
  }
};
</script>
