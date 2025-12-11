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

      <button @click="verifyOTP" 
        class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium">
        Verify OTP
      </button>

      <button @click="router.push('/verify-phone')" class="mt-4 text-sm text-green-600 hover:underline">
        Wrong number? Go back
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { registerUserWithAutoGCM } from "../services/autogcm.js";
import { auth } from "../firebase.js";

const router = useRouter();
const otp = ref(["", "", "", "", "", ""]);

onMounted(() => {
  if (!window.confirmationResult) {
    alert("Session expired. Please verify phone again.");
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

const verifyOTP = async () => {
  const code = otp.value.join("");

  if (code.length !== 6) return alert("Please enter complete OTP.");

  try {
    if (!window.confirmationResult) {
      router.push("/verify-phone");
      return;
    }

    const result = await window.confirmationResult.confirm(code);
    const firebaseUser = result.user;

    // --- ⭐ FINAL FIX: MATCH POSTMAN FORMAT ---
    let rawPhone = firebaseUser.phoneNumber; // e.g., +60149607561

    // Convert +60149607561 -> 0149607561
    // This matches exactly what worked in your Postman test.
    let finalPhoneToSend = rawPhone.replace('+60', '0');

    console.log("Sending to API:", finalPhoneToSend);
    // ------------------------------------------

    const response = await registerUserWithAutoGCM("", finalPhoneToSend, "");

    console.log("AutoGCM API response:", response);

    if (response.code !== 200) {
      alert("AutoGCM error: " + response.msg);
      return;
    }

    const userData = response.data;
    localStorage.setItem("autogcmUser", JSON.stringify(userData));

    if (userData.isNewUser === 0) {
      router.push("/home-page");
    } else {
      localStorage.setItem("pendingPhoneVerified", finalPhoneToSend);
      router.push("/complete-profile");
    }

  } catch (err) {
    console.error(err);
    alert("Verification failed: " + err.message);
  }
};
</script>