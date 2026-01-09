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
        class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex justify-center items-center gap-2">
        
        <svg v-if="isLoading" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>

        <span>{{ isLoading ? statusMessage : "Verify OTP" }}</span>
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
const statusMessage = ref(""); // Granular status updates

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
  if (phone.length === 10 && phone.startsWith('0')) return '1' + phone;
  if (phone.length === 11 && phone.startsWith('0')) return '1' + phone.substring(1);
  return phone; 
};

const verifyOTP = async () => {
  const code = otp.value.join("");
  if (code.length !== 6) return;
  
  isLoading.value = true;
  errorMessage.value = "";
  statusMessage.value = "Verifying Code..."; // 1. Initial State

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

    // ✅ FIX: DECLARE VARIABLES HERE BEFORE TRY/CATCH BLOCKS
    let response = null;
    let usedPhoneForAutoGCM = finalPhone;

    // ---------------------------------------------------------
    // 🛡️ THE SAFETY NET (Attempt 1)
    // ---------------------------------------------------------
    try {
        console.log("👉 Attempt 1: Trying Real Phone:", finalPhone);
        response = await registerUserWithAutoGCM("", finalPhone, "");
    } catch (err) {
        console.warn("⚠️ Attempt 1 Failed:", err.message);
        response = null; 
    }

    // ---------------------------------------------------------
    // 🛡️ THE FALLBACK (Attempt 2)
    // ---------------------------------------------------------
    if (!response || response.code !== 200) {
      const chinesePhone = convertToChineseFormat(finalPhone);
      
      if (chinesePhone !== finalPhone) {
        console.log(`🔄 Attempt 2: Retrying with Chinese Format: ${chinesePhone}`);
        statusMessage.value = "Retrying alternative format..."; // Update UI
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

    statusMessage.value = "Syncing History..."; // 2. Update Message before heavy task

    // 7. SYNC SUPABASE (Save REAL Phone)
    const supabaseUser = await getOrCreateUser(finalPhone, "New User", "");

    // 8. Run Onboarding (The Heavy Task)
    await runOnboarding(finalPhone); 

    statusMessage.value = "Finalizing..."; // 3. Almost done

    // 9. Navigate
    if (response.data.isNewUser === 0 && supabaseUser?.nickname && supabaseUser.nickname !== 'New User') {
      router.push("/home-page");
    } else {
      localStorage.setItem("pendingPhoneVerified", finalPhone);
      
      const legacyName = response.data?.nikeName || response.data?.name || '';
      
      router.push({ 
        path: "/complete-profile", 
        query: { legacyName: legacyName } 
      });
    }

  } catch (error) {
      console.error(error);
      errorMessage.value = error.message; // Show error on screen
  } finally {
      isLoading.value = false;
      statusMessage.value = "";
  }
};
</script>