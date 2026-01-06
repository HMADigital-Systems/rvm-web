<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white px-6">
    <img src="/icons/logo.png" alt="Logo" class="w-36 h-36 mb-4" />
    <h2 class="text-2xl font-bold text-green-700 mb-2">Welcome Back</h2>
    <p class="text-gray-500 mb-6 text-center">Login to continue recycling smarter.</p>

    <button class="gsi-material-button" @click="handleGoogleLogin">
      <div class="gsi-material-button-content-wrapper">
        <div class="gsi-material-button-icon">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" />
        </div>
        <span class="gsi-material-button-contents">Sign in with Google</span>
      </div>
    </button>

    <p class="mt-6 text-sm text-gray-500">By signing in, you agree to our Terms and Privacy Policy.</p>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
// 🟢 FIXED IMPORTS: Combined into one line
import { syncUser, runOnboarding } from "../services/autogcm.js";
import { getOrCreateUser } from "../services/supabase.js";

const router = useRouter();
let client = null;

onMounted(() => {
  if (window.google && window.google.accounts) initGoogleClient();
  else {
    const interval = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(interval);
        initGoogleClient();
      }
    }, 500);
  }
});

const initGoogleClient = () => {
  client = google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: "profile email openid",
    callback: async (response) => {
      try {
        const googleToken = response.access_token;
        localStorage.setItem("googleToken", googleToken);

        // 1. Get Google Profile
        const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${googleToken}` },
        }).then((r) => r.json());

        const googleNick = userInfo.name || "User";
        const googleAvatar = userInfo.picture || "";

        // 2. Save Google info temporarily
        localStorage.setItem("tempGoogleUser", JSON.stringify({ 
            nickname: googleNick, 
            avatar: googleAvatar 
        }));

        // 3. Check for existing phone login
        const existingUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
        const phone = existingUser.phone || "";

        if (phone) {
          const res = await syncUser(phone, "", ""); 
          
          if (res.code === 200 && res.data) {
            localStorage.setItem("autogcmUser", JSON.stringify(res.data));
            
            // 🟢 1. Create User in Supabase (Safety)
            await getOrCreateUser(phone, res.data.nikeName, res.data.avatarUrl);

            // 🟢 2. Run Onboarding (Fixes the Points)
            await runOnboarding(phone);

            router.push("/home-page");
          } else {
             alert("Login failed: " + (res.msg || "Unknown error"));
          }
        } else {
          // No phone saved locally -> Treat as fresh login
          console.log("⚠️ No phone detected, redirecting to verify phone.");
          router.push("/verify-phone");
        }
      } catch (err) {
        console.error("❌ AutoGCM login failed:", err);
        alert("Login failed. Please try again.");
      }
    },
  });
};

const handleGoogleLogin = () => {
  if (!client) {
    alert("Google login is not ready yet.");
    return;
  }
  client.requestAccessToken();
};
</script>