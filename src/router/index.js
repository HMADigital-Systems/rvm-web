import { createRouter, createWebHistory } from "vue-router";
import Welcome from "../pages/Welcome.vue";
import Login from "../pages/Login.vue"; 
import PhoneVerification from "../pages/PhoneVerification.vue";
import OTPVerification from "../pages/OTPVerification.vue";
import CompleteProfile from "../pages/CompleteProfile.vue";
import RegistrationComplete from "../pages/RegistrationComplete.vue"; // ✅ Keep this one
import Homepage from "../pages/HomePage.vue";
import Profile from "../pages/Profile.vue";
import UserDashboard from "../pages/UserDashboard.vue";
import WithdrawPage from "../pages/WithdrawPage.vue";

// ❌ DELETED: import RegistrationComplete from '../pages/RegistrationComplete.vue' (Duplicate)

const routes = [
  { path: "/", component: Welcome },
  { path: "/login", component: Login },
  { path: "/verify-phone", component: PhoneVerification},
  { path: "/complete-profile", component: CompleteProfile},
  { path: "/enter-otp", component: OTPVerification },
  
  // ✅ This uses the import from above. 
  // I kept both paths just in case you use /register-success elsewhere, 
  // but they both point to the same page now.
  { path: "/register-success", component: RegistrationComplete},
  { path: '/registration-complete', component: RegistrationComplete }, 

  { path: "/home-page", component: Homepage},
  { path: "/profile", component: Profile},
  { path: "/dashboard", component: UserDashboard },
  { path: "/withdraw", component: WithdrawPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;