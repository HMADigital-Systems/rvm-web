<template>
  <div class="relative min-h-screen overflow-hidden bg-gradient-to-br from-green-50 via-green-100 to-green-50 flex items-center justify-center px-4 py-8">
    
    <!-- Floating background elements -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <span class="absolute text-3xl opacity-[0.06] top-[10%] left-[10%] animate-[float_20s_infinite]">♻️</span>
      <span class="absolute text-4xl opacity-[0.06] top-[70%] left-[85%] animate-[float_25s_infinite_-5s]">🌿</span>
      <span class="absolute text-3xl opacity-[0.06] top-[20%] left-[80%] animate-[float_22s_infinite_-10s]">🌍</span>
      <span class="absolute text-[28px] opacity-[0.06] top-[80%] left-[15%] animate-[float_18s_infinite_-15s]">💚</span>
      <span class="absolute text-2xl opacity-[0.06] top-[50%] left-[5%] animate-[float_23s_infinite_-7s]">♻️</span>
    </div>

    <!-- Login Card -->
    <div class="relative z-10 w-full max-w-sm bg-white/85 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_40px_rgba(22,163,74,0.12)] px-6 py-8 animate-[cardIn_0.6s_ease-out]">

      <!-- Logo & Branding -->
      <div class="text-center mb-8">
        <img src="/icons/logo_icon.png" alt="MyGreenPlus" class="w-[72px] h-[72px] mx-auto mb-4 object-contain rounded-[20px] shadow-[0_8px_24px_rgba(22,163,74,0.25)]" onerror="this.style.display='none'" />
        <h1 class="font-serif font-extrabold text-[28px] text-green-800 tracking-tight leading-tight">MyGreenPlus</h1>
        <p class="text-gray-500 text-sm mt-1">Recycle smart. Earn rewards. Save Earth.</p>
      </div>

      <!-- Step 1: Normal Login (Google + Phone) -->
      <div v-if="!showGooglePhoneStep">
        <!-- Google Sign-In -->
        <button 
          @click="handleGoogleLogin"
          :disabled="isLoading"
          class="relative flex items-center justify-center gap-3 w-full py-3.5 px-6 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-60"
        >
          <div v-if="isLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
            <div class="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 my-5">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-[11px] text-gray-400 uppercase tracking-widest font-medium">or</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <!-- Phone Login -->
        <div class="mb-3">
          <label class="block text-xs font-semibold text-green-800 mb-1.5">Phone Number</label>
          <div class="flex border border-gray-200 rounded-xl overflow-hidden focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/10 transition-all">
            <span class="bg-green-50 px-3.5 py-3 text-sm font-medium text-green-800 border-r border-gray-200 shrink-0">🇲🇾 +60</span>
            <input 
              v-model="phone"
              type="tel" 
              placeholder="12 345 6789"
              class="flex-1 px-3.5 py-3 text-[15px] outline-none bg-white"
              @input="phone = phone.replace(/[^0-9]/g, '')"
            />
          </div>
        </div>

        <button 
          @click="handlePhoneLogin"
          :disabled="phoneLoading || !phone"
          class="flex items-center justify-center gap-2.5 w-full py-3.5 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-semibold shadow-[0_4px_14px_rgba(22,163,74,0.25)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:shadow-none disabled:translate-y-0"
        >
          <svg v-if="phoneLoading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <template v-else>
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M5 3L2 6L5 9L9 5L5 3Z"/><path d="M6 10L3 13L6 16L10 12L6 10Z"/><path d="M13 7L10 10L13 13L17 9L13 7Z"/><path d="M20 14L17 17L20 20L21 21L22 14H20Z"/><path d="M15 15L12 18L15 21L19 17L15 15Z"/></svg>
            Send OTP
          </template>
        </button>

        <p v-if="errorMessage" class="mt-3 text-sm text-red-600 font-medium bg-red-50 px-4 py-2.5 rounded-lg text-center">
          {{ errorMessage }}
        </p>

        <!-- Terms -->
        <p class="mt-6 text-[11px] text-gray-400 text-center leading-relaxed">
          By continuing, you agree to our <a href="#" class="text-green-600 font-medium hover:underline">Terms of Service</a> and <a href="#" class="text-green-600 font-medium hover:underline">Privacy Policy</a>
        </p>
      </div>

      <!-- Step 2: Phone Collection for Google Users -->
      <div v-if="showGooglePhoneStep && !showPhoneConflictPrompt">
        <div class="text-center mb-4">
          <div class="w-14 h-14 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 class="text-lg font-bold text-gray-800">Link Your Account</h2>
          <p class="text-xs text-gray-500 mt-1">Enter the phone number you used to recycle to see your data</p>
        </div>

        <div class="mb-3">
          <label class="block text-xs font-semibold text-green-800 mb-1.5">Your Phone Number</label>
          <div class="flex border border-gray-200 rounded-xl overflow-hidden focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/10 transition-all">
            <span class="bg-green-50 px-3.5 py-3 text-sm font-medium text-green-800 border-r border-gray-200 shrink-0">🇲🇾 +60</span>
            <input 
              v-model="googlePhone"
              type="tel" 
              placeholder="12 345 6789"
              class="flex-1 px-3.5 py-3 text-[15px] outline-none bg-white"
              @input="googlePhone = googlePhone.replace(/[^0-9]/g, '')"
            />
          </div>
        </div>

        <button 
          @click="handleGoogleLinkPhone"
          :disabled="googlePhoneLoading || !googlePhone"
          class="flex items-center justify-center gap-2.5 w-full py-3.5 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-semibold shadow-[0_4px_14px_rgba(22,163,74,0.25)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:shadow-none disabled:translate-y-0"
        >
          <svg v-if="googlePhoneLoading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <template v-else>
            <svg class="w-[18px] h-[18px] mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Link &amp; Continue
          </template>
        </button>

        <p v-if="googlePhoneError" class="mt-3 text-sm text-red-600 font-medium bg-red-50 px-4 py-2.5 rounded-lg text-center">
          {{ googlePhoneError }}
        </p>

        <div class="text-center mt-4">
          <button @click="cancelGooglePhoneLink" class="text-xs text-gray-400 hover:text-gray-600 underline">
            Skip — I'll use another login method
          </button>
        </div>
      </div>

      <!-- Step 3: Phone Mismatch Prompt -->
      <div v-if="showPhoneConflictPrompt">
        <div class="text-center mb-4">
          <div class="w-14 h-14 mx-auto mb-3 bg-amber-100 rounded-full flex items-center justify-center">
            <svg class="w-7 h-7 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 class="text-lg font-bold text-gray-800">Phone Number Conflict</h2>
          <p class="text-sm text-gray-600 mt-2">
            This email ({{ pendingGoogleData?.email }}) is already linked to 
            <strong>{{ formatPhoneDisplay(conflictingPhone) }}</strong>.
          </p>
          <p class="text-xs text-gray-500 mt-1">
            Do you want to update it to <strong>{{ formatPhoneDisplay(googlePhone) }}</strong> instead?
          </p>
        </div>

        <div class="flex flex-col gap-3 mt-4">
          <button 
            @click="confirmPhoneUpdate"
            :disabled="googlePhoneLoading"
            class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
          >
            <svg v-if="googlePhoneLoading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <template v-else>✅ Yes, update to {{ formatPhoneDisplay(googlePhone) }}</template>
          </button>
          <button 
            @click="keepExistingPhone"
            class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
          >
            ❌ No, keep {{ formatPhoneDisplay(conflictingPhone) }}
          </button>
        </div>

        <div class="text-center mt-4">
          <button @click="cancelGooglePhoneLink" class="text-xs text-gray-400 hover:text-gray-600 underline">
            Back to login
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import app from "../firebase/firebaseConfig"; 
import { useI18n } from "vue-i18n";

// Utility
import { normalizePhone, formatPhone } from "../utils/phone-utils.js";

// Services
import { syncUser, runOnboarding } from "../services/autogcm.js";
import { supabase, getUserByEmail, checkEmailPhoneConflict, upsertUserByEmail } from "../services/supabase.js"; 

const { t } = useI18n();
const router = useRouter();
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const isLoading = ref(false);
const phoneLoading = ref(false);
const errorMessage = ref("");
const phone = ref("");

// Google phone link flow
const showGooglePhoneStep = ref(false);
const googlePhone = ref("");
const googlePhoneLoading = ref(false);
const googlePhoneError = ref("");
let pendingGoogleData = null; // Stores Google user info for linking

// Phone conflict prompt
const showPhoneConflictPrompt = ref(false);
const conflictingPhone = ref("");

const formatPhoneDisplay = (p) => {
  const f = formatPhone(p);
  return f || p;
};

const isGenericName = (name, phone) => {
  if (!name) return true;
  const lower = name.toLowerCase();
  return (
    lower === "user" || 
    lower === "new user" || 
    lower === "rvm user" ||
    lower === "null" ||
    name === phone
  );
};

const handleGoogleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    // 1. Get Google user info
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email;

    if (!email) {
      errorMessage.value = "Google account has no email. Please use phone OTP instead.";
      isLoading.value = false;
      return;
    }

    // 2. Look up by EMAIL (authoritative primary UID)
    const dbUser = await getUserByEmail(email);

    if (dbUser && dbUser.phone) {
      // 🔹 Email found in DB with phone → smart login
      console.log("🔹 Email found: logging in as", dbUser.phone);
      
      const isAlreadyOnboarded = !!dbUser.vendor_user_no;
      const currentLocalName = dbUser.nickname || "";
      const localNameIsGeneric = isGenericName(currentLocalName, dbUser.phone);
      const safeName = localNameIsGeneric ? undefined : currentLocalName;

      const res = await syncUser(dbUser.phone, safeName, dbUser.avatar_url);
      
      if (res.code === 200 && res.data) {
        const sessionData = {
            ...res.data, 
            nikeName: dbUser.nickname || res.data.nikeName || "User", 
            avatarUrl: dbUser.avatar_url || res.data.avatarUrl || ""  
        };
        localStorage.setItem("autogcmUser", JSON.stringify(sessionData));

        if (isAlreadyOnboarded && !localNameIsGeneric) {
            runOnboarding(dbUser.phone);
            router.push("/home-page");
            return;
        }

        localStorage.setItem("pendingPhoneVerified", dbUser.phone); 
        await runOnboarding(dbUser.phone); 

        const freshApiName = res.data.nikeName || res.data.name || "";
        const apiNameIsGeneric = isGenericName(freshApiName, dbUser.phone);

        if (apiNameIsGeneric) {
             router.push({ path: "/complete-profile", query: { legacyName: freshApiName } });
        } else {
            router.push("/home-page");
        }
        return; 
      }
    }

    // 3. Email found but no phone → OR email not found
    //    Store Google info, ask user for their phone number
    console.log("🔸 Google User needs phone linking — asking for phone");
    pendingGoogleData = {
      nickname: user.displayName || "User",
      avatar: user.photoURL || "",
      email: user.email
    };
    showGooglePhoneStep.value = true;
    return;

  } catch (error) {
    console.error("❌ Login Error:", error);
    if (error.code !== "PGRST116") { 
        errorMessage.value = "Login failed: " + error.message;
    }
  } finally {
    isLoading.value = false;
  }
};

// Google user enters their phone to link accounts
const handleGoogleLinkPhone = async () => {
  if (!googlePhone.value) {
    googlePhoneError.value = "Please enter your phone number";
    return;
  }
  googlePhoneLoading.value = true;
  googlePhoneError.value = "";
  conflictingPhone.value = "";

  try {
    // 1. Normalize the phone number
    const normalizedPhone = normalizePhone(googlePhone.value);

    // 2. Check for phone conflict: does this email already have a DIFFERENT phone?
    const existingPhone = await checkEmailPhoneConflict(
      pendingGoogleData?.email, 
      normalizedPhone
    );

    if (existingPhone && existingPhone !== normalizedPhone) {
      // ⚠️ CONFLICT! This email is linked to a different phone number
      // Show the prompt instead of silently overwriting
      conflictingPhone.value = existingPhone;
      showPhoneConflictPrompt.value = true;
      googlePhoneLoading.value = false;
      return;
    }

    // 3. No conflict — proceed with linking using EMAIL as primary UID
    await proceedWithLink(normalizedPhone);

  } catch (err) {
    console.error("Google phone link error:", err);
    googlePhoneError.value = "Something went wrong. Please try phone OTP login instead.";
  } finally {
    googlePhoneLoading.value = false;
  }
};

// Proceed with linking (after conflict resolved or no conflict)
const proceedWithLink = async (normalizedPhone) => {
  try {
    // Use EMAIL-first upsert (email is the primary key)
    const userData = await upsertUserByEmail(pendingGoogleData.email, {
      phone: normalizedPhone,
      nickname: pendingGoogleData?.nickname || '',
      avatarUrl: pendingGoogleData?.avatar || '',
      fullName: pendingGoogleData?.nickname || ''
    });

    // Sync with vendor API
    const res = await syncUser(normalizedPhone, pendingGoogleData?.nickname, undefined);

    if (res.code === 200 && res.data) {
      const sessionData = {
        ...res.data,
        nikeName: pendingGoogleData?.nickname || res.data.nikeName || "User",
        avatarUrl: pendingGoogleData?.avatar || res.data.avatarUrl || "",
        userId: normalizedPhone,
        uid: normalizedPhone
      };
      localStorage.setItem("autogcmUser", JSON.stringify(sessionData));
      localStorage.setItem("pendingPhoneVerified", normalizedPhone);
      
      await runOnboarding(normalizedPhone);
      router.push("/home-page");
    } else {
      // Fallback: save bare phone + google data
      const googleUser = {
        ...pendingGoogleData,
        phone: normalizedPhone,
        phonenumber: normalizedPhone,
        userId: normalizedPhone
      };
      localStorage.setItem("autogcmUser", JSON.stringify(googleUser));
      router.push("/home-page");
    }
  } catch (err) {
    console.error("Link proceed error:", err);
    googlePhoneError.value = "Could not link account. Please try again.";
  }
};

// User confirmed they want to UPDATE the phone
const confirmPhoneUpdate = async () => {
  googlePhoneLoading.value = true;
  try {
    const normalizedPhone = normalizePhone(googlePhone.value);
    await proceedWithLink(normalizedPhone);
  } catch (err) {
    console.error("Phone update error:", err);
    googlePhoneError.value = "Failed to update. Please try again.";
  } finally {
    googlePhoneLoading.value = false;
  }
};

// User wants to KEEP the existing phone
const keepExistingPhone = () => {
  // Just log in with the existing phone
  showPhoneConflictPrompt.value = false;
  
  // Use the conflicting phone (existing one in DB) for login
  const existingPhone = conflictingPhone.value;
  
  (async () => {
    isLoading.value = true;
    try {
      const res = await syncUser(existingPhone, pendingGoogleData?.nickname, pendingGoogleData?.avatar);
      
      if (res.code === 200 && res.data) {
        const sessionData = {
          ...res.data,
          nikeName: pendingGoogleData?.nickname || res.data.nikeName || "User",
          avatarUrl: pendingGoogleData?.avatar || res.data.avatarUrl || "",
          userId: existingPhone,
          uid: existingPhone
        };
        localStorage.setItem("autogcmUser", JSON.stringify(sessionData));
        localStorage.setItem("pendingPhoneVerified", existingPhone);
        
        await runOnboarding(existingPhone);
        router.push("/home-page");
      }
    } catch (err) {
      console.error("Keep existing phone login failed:", err);
      errorMessage.value = "Login failed. Please try again.";
    } finally {
      isLoading.value = false;
    }
  })();
};

const cancelGooglePhoneLink = () => {
  showGooglePhoneStep.value = false;
  showPhoneConflictPrompt.value = false;
  googlePhone.value = "";
  googlePhoneError.value = "";
  conflictingPhone.value = "";
  pendingGoogleData = null;
  errorMessage.value = "";
  isLoading.value = false;
};

const handlePhoneLogin = async () => {
  if (!phone.value) {
    errorMessage.value = "Please enter a phone number";
    return;
  }
  phoneLoading.value = true;
  errorMessage.value = "";
  try {
    const formattedPhone = normalizePhone(phone.value);
    
    const { default: axios } = await import('axios');
    const res = await axios.post('/api/auth-otp', { action: 'send', phone: formattedPhone });
    localStorage.setItem('pendingPhone', formattedPhone);
    router.push('/enter-otp');
  } catch (err) {
    errorMessage.value = err.response?.data?.msg || err.message || 'Failed to send OTP';
  } finally {
    phoneLoading.value = false;
  }
};
</script>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(5deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(15px) rotate(-5deg); }
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
</style>
