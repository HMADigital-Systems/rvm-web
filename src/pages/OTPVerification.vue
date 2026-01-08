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
    // alert("Session expired. Please verify phone again.");
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

// 🟢 HELPER: Convert Malaysian Format to "Chinese-Compatible" Format
// Rules: 
// 1. Must be 11 digits.
// 2. Must start with '1'.
const convertToChineseFormat = (phone) => {
  // Input: 0123456789 (10 digits) -> Output: 10123456789 (11 digits, starts with 1)
  if (phone.length === 10 && phone.startsWith('0')) {
    return '1' + phone; 
  }
  // Input: 01123456789 (11 digits) -> Output: 11123456789 (Replace leading 0 with 1)
  if (phone.length === 11 && phone.startsWith('0')) {
    return '1' + phone.substring(1);
  }
  return phone; // Return original if we can't format it safely
};

const verifyOTP = async () => {
  const code = otp.value.join("");
  if (code.length !== 6) return;
  
  isLoading.value = true;
  errorMessage.value = "";

  try {
    if (!window.confirmationResult) {
      router.push("/verify-phone");
      return;
    }

    // 1. Verify with Firebase
    const result = await window.confirmationResult.confirm(code);
    const firebaseUser = result.user;

    // 2. Format the Real Malaysian Number
    let rawPhone = firebaseUser.phoneNumber; // e.g. +60149607561
    let finalPhone = rawPhone.replace('+60', '0'); // e.g. 0149607561
    console.log("✅ Firebase Verified Real Phone:", finalPhone);

    // 3. ATTEMPT 1: Try Registering with REAL Phone (For Existing/Legacy Users)
    let response = await registerUserWithAutoGCM("", finalPhone, "");
    let usedPhoneForAutoGCM = finalPhone;

    // 4. ATTEMPT 2: If Failed, Try "Chinese Format" (For New Users blocked by API)
    if (response.code !== 200) {
      console.warn(`⚠️ Real phone rejected (${response.msg}). Trying Chinese Format...`);
      
      const chinesePhone = convertToChineseFormat(finalPhone);
      if (chinesePhone !== finalPhone) {
        response = await registerUserWithAutoGCM("", chinesePhone, "");
        usedPhoneForAutoGCM = chinesePhone;
      }
    }

    // 5. Final Check
    if (response.code !== 200) {
      throw new Error("RVM Registration Failed: " + response.msg);
    }

    console.log(`✅ Success! Registered as: ${usedPhoneForAutoGCM}`);

    // 6. SAVE SESSION
    // Store the AutoGCM response (which might contain the 'Hacked' number)
    // This ensures subsequent logins on this device work smoothly.
    localStorage.setItem("autogcmUser", JSON.stringify(response.data));

    // 7. SYNC SUPABASE (CRITICAL: Save the REAL Phone)
    // We always want our clean DB to have the user's actual 01x number.
    const supabaseUser = await getOrCreateUser(finalPhone, "New User", "");

    // 8. Run Onboarding
    await runOnboarding(finalPhone);

    // 9. Navigate
    // We check 'isNewUser' from AutoGCM response to decide where to go
    if (response.data.isNewUser === 0 && supabaseUser?.nickname && supabaseUser.nickname !== 'New User') {
      router.push("/home-page");
    } else {
      // Pass the REAL phone for profile completion
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