<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-6">
    <div class="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">

      <h2 class="text-2xl font-semibold mb-6">Complete Your Profile</h2>

      <div class="flex flex-col items-center mb-6">
        <div class="relative">
          <img 
            :src="avatar || '/images/default-avatar.png'" 
            alt="Profile Avatar" 
            class="w-24 h-24 rounded-full border-4 border-green-100 object-cover shadow-sm"
            @error="handleImageError"
          />
          <span v-if="isGoogleAvatar" class="absolute bottom-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-full border-2 border-white">
            Google
          </span>
        </div>
        <p class="text-xs text-gray-400 mt-2">Photo from your Google Account</p>
      </div>

      <div class="mb-4 text-left">
        <label class="block text-sm text-gray-600 mb-1">Nickname</label>
        <input v-model="nickname" placeholder="Enter nickname"
               class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
      </div>

      <button @click="saveProfile"
        class="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium shadow-md">
        Save & Continue
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { registerUserWithAutoGCM } from "../services/autogcm.js";

const router = useRouter();
const nickname = ref("");
const avatar = ref("");
const isGoogleAvatar = ref(false);

// Default image if Google image breaks
const handleImageError = (e) => {
  e.target.src = "https://lassification.oss-cn-shenzhen.aliyuncs.com/static/mini/imgv3/head.png";
};

onMounted(() => {
  // 1. Get the temp data we saved in Login.vue
  const tempUser = JSON.parse(localStorage.getItem("tempGoogleUser") || "{}");
  
  if (tempUser.nickname) {
    nickname.value = tempUser.nickname;
  }
  
  if (tempUser.avatar) {
    avatar.value = tempUser.avatar;
    isGoogleAvatar.value = true;
  }
});

const saveProfile = async () => {
  const phone = localStorage.getItem("pendingPhoneVerified");

  if (!nickname.value) return alert("Please enter a nickname.");

  // ✅ Pass the 'avatar.value' as the 4th argument
  // Signature: registerUserWithAutoGCM(token, phone, nickname, avatarUrl)
  const response = await registerUserWithAutoGCM("", phone, nickname.value, avatar.value);

  if (response.code === 200) {
    // Save the FULL user profile returned by the API
    localStorage.setItem("autogcmUser", JSON.stringify(response.data));
    
    // Clean up temp storage
    localStorage.removeItem("pendingPhoneVerified");
    localStorage.removeItem("tempGoogleUser"); 
    
    router.push("/home-page");
  } else {
    alert("Failed: " + (response.msg || "Unknown Error"));
  }
};
</script>