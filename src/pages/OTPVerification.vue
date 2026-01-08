<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-6">
    <div class="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
      
      <h2 class="text-2xl font-semibold text-gray-800 mb-2">Enter Verification Code</h2>
      <p class="text-sm text-gray-500 mb-6">
        We have sent a 6-digit code to your phone.
      </p>

      <div class="flex justify-center gap-2 mb-6">
        <input 
          v-for="(digit, index) in otp" 
          :key="index"
          v-model="otp[index]"
          type="text" 
          maxlength="1"
          class="w-12 h-12 text-center border rounded-lg text-xl font-bold focus:border-green-500 outline-none transition"
          @input="moveToNext(index, $event)"
          @keydown.backspace="moveToPrev(index, $event)"
        />
      </div>

      <button @click="verifyOTP" :disabled="isLoading"
        class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50">
        <span v-if="isLoading">Verifying...</span>
        <span v-else>Verify OTP</span>
      </button>

      <button @click="router.push('/verify-phone')" class="mt-4 text-sm text-green-600 hover:underline">
        Wrong number? Go back
      </button>

      <p v-if="errorMessage" class="mt-4 text-sm text-red-500">{{ errorMessage }}</p>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { registerUserWithAutoGCM, runOnboarding } from "../services/autogcm.js";
import { getOrCreateUser } from "../services/supabase.js";

const router = useRouter();
const otp = ref(["", "", "", "", "", ""]);
const isLoading = ref(false);
const errorMessage = ref("");

onMounted(() => {
  if (!window.confirmationResult) {
    router.push("/verify-phone");
  }
});

const moveToNext = (index, event) => {
  const value = event.target.value;
  if (value && index < 5) event.target.nextElementSibling?.focus();
};

const moveToPrev = (index, event) => {
  if (!otp.value[index] && index > 0) event.target.previousElementSibling?.focus();
};

const convertToChineseFormat = (phone) => {
  if (phone.length === 10 && phone.startsWith('0')) {
    return '1' + phone; 
  }
  if (phone.length === 11 && phone.startsWith('0')) {
    return '1' + phone.substring(1);
  }
  return phone; 
};

const verifyOTP = async () => {
  const code = otp.value.join("");
  if (code.length !== 6) return;
  
  isLoading.value = true;
  errorMessage.value = "";

  try {
    if (!window.confirmationResult) {
      throw new Error("Session expired. Please try again.");
    }

    // 1. Verify with Firebase
    const result = await window.confirmationResult.confirm(code);
    const firebaseUser = result.user;

    // 2. Format the Real Malaysian Number
    let rawPhone = firebaseUser.phoneNumber; 
    let finalPhone = rawPhone.replace('+60', '0'); 
    console.log("✅ Firebase Verified Real Phone:", finalPhone);

    let response = null;
    let usedPhoneForAutoGCM = finalPhone;

    // ---------------------------------------------------------
    // 🛡️ THE SAFETY NET (Attempt 1)
    // ---------------------------------------------------------
    // We wrap this in a TRY/CATCH so if the API returns 500 (Reject),
    // we DON'T crash. We just swallow the error and move to Attempt 2.
    try {
        console.log("👉 Attempt 1: Trying Real Phone:", finalPhone);
        response = await registerUserWithAutoGCM("", finalPhone, "");
    } catch (err) {
        console.warn("⚠️ Attempt 1 Failed (API Rejected Number):", err.message);
        response = null; // Mark as failed so we force Attempt 2
    }

    // ---------------------------------------------------------
    // 🛡️ THE FALLBACK (Attempt 2)
    // ---------------------------------------------------------
    // If response is null (crashed) OR the code is not 200 (logic error)
    if (!response || response.code !== 200) {
      const chinesePhone = convertToChineseFormat(finalPhone);
      
      if (chinesePhone !== finalPhone) {
        console.log(`🔄 Attempt 2: Retrying with Chinese Format: ${chinesePhone}`);
        try {
            response = await registerUserWithAutoGCM("", chinesePhone, "");
            usedPhoneForAutoGCM = chinesePhone;
        } catch (err2) {
            console.error("❌ Attempt 2 Failed:", err2.message);
            throw new Error("Registration System Unavailable. Please contact support.");
        }
      }
    }

    // 5. Final Check
    if (!response || response.code !== 200) {
      throw new Error(response ? response.msg : "Unknown Registration Error");
    }

    console.log(`✅ Success! Registered as: ${usedPhoneForAutoGCM}`);

    // 6. SAVE SESSION
    localStorage.setItem("autogcmUser", JSON.stringify(response.data));

    // 7. SYNC SUPABASE (Save REAL Phone)
    const supabaseUser = await getOrCreateUser(finalPhone, "New User", "");

    // 8. Run Onboarding
    await runOnboarding(finalPhone);

    // 9. Navigate
    if (response.data.isNewUser === 0 && supabaseUser?.nickname && supabaseUser.nickname !== 'New User') {
      router.push("/home-page");
    } else {
      localStorage.setItem("pendingPhoneVerified", finalPhone);
      router.push("/complete-profile");
    }

  } catch (err) {
    console.error(err);
    errorMessage.value = err.message || "Verification failed";
  } finally {
    isLoading.value = false;
  }
};
</script>