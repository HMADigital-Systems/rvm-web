<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white px-6">
    <img src="/icons/logo.png" alt="Logo" class="w-36 h-36 mb-4" />
    <h2 class="text-2xl font-bold text-green-700 mb-2">Welcome Back</h2>
    <p class="text-gray-500 mb-6 text-center">Login to continue recycling smarter.</p>

    <button class="gsi-material-button" @click="handleGoogleLogin" :disabled="isLoading">
      <div class="gsi-material-button-content-wrapper">
        <div class="gsi-material-button-icon">
          <svg v-if="isLoading" class="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <img v-else src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" />
        </div>
        <span class="gsi-material-button-contents">
          {{ isLoading ? 'Signing in...' : 'Sign in with Google' }}
        </span>
      </div>
    </button>

    <p class="mt-6 text-sm text-gray-500">By signing in, you agree to our Terms and Privacy Policy.</p>
    <p v-if="errorMessage" class="mt-4 text-sm text-red-500 font-bold">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
// 🟢 Import Firebase Auth functions
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import app from "../firebase/firebaseConfig"; // Ensure this path is correct

// Services
import { syncUser, runOnboarding } from "../services/autogcm.js";
import { getOrCreateUser } from "../services/supabase.js";

const router = useRouter();
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const isLoading = ref(false);
const errorMessage = ref("");

const handleGoogleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    // 1. Firebase Google Sign-In (Replaces the old window.google logic)
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // 2. Save Basic Info locally
    const googleUser = {
      nickname: user.displayName || "User",
      avatar: user.photoURL || "",
      email: user.email
    };
    localStorage.setItem("tempGoogleUser", JSON.stringify(googleUser));

    // 3. Logic: Does this browser remember a linked Phone Number?
    const existingUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
    const storedPhone = existingUser.phone;

    if (storedPhone) {
      console.log("📲 Phone found in storage, verifying with RVM system...");
      
      // Sync with RVM System (AutoGCM)
      const res = await syncUser(storedPhone, "", "");
      
      if (res.code === 200 && res.data) {
        localStorage.setItem("autogcmUser", JSON.stringify(res.data));
        
        // Sync with Supabase
        await getOrCreateUser(storedPhone, res.data.nikeName, res.data.avatarUrl);
        await runOnboarding(storedPhone);

        router.push("/home-page");
      } else {
        // If sync fails, maybe the phone number is invalid or system is down
        throw new Error(res.msg || "RVM Sync Failed");
      }
    } else {
      // 4. New Device / New User: Redirect to Bind Phone
      console.log("⚠️ No phone detected locally. Redirecting to Phone Verification.");
      router.push("/verify-phone");
    }

  } catch (error) {
    console.error("❌ Login Error:", error);
    errorMessage.value = "Login failed: " + error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.gsi-material-button {
  background-color: white;
  border: 1px solid #747775;
  border-radius: 4px;
  box-sizing: border-box;
  color: #1f1f1f;
  cursor: pointer;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 14px;
  height: 40px;
  padding: 0 12px;
  transition: background-color .218s, border-color .218s;
  user-select: none;
  min-width: 200px;
}

.gsi-material-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gsi-material-button-content-wrapper {
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  height: 100%;
}

.gsi-material-button-icon {
  height: 20px;
  margin-right: 12px;
  min-width: 20px;
  width: 20px;
}

.gsi-material-button-contents {
  flex-grow: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>