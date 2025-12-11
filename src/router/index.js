import { createRouter, createWebHistory } from "vue-router";
import Welcome from "../pages/Welcome.vue";
import Login from "../pages/Login.vue"; 
//import Register from "../pages/Register.vue";
import PhoneVerification from "../pages/PhoneVerification.vue";
import OTPVerification from "../pages/OTPVerification.vue";
import CompleteProfile from "../pages/CompleteProfile.vue";
import RegistrationComplete from "../pages/RegistrationComplete.vue";
import Homepage from "../pages/HomePage.vue";
import Profile from "../pages/Profile.vue";

const routes = [
  { path: "/", component: Welcome },
  { path: "/login", component: Login },
  //{ path: "/register", component: Register },
  { path: "/verify-phone", component: PhoneVerification},
  { path: "/complete-profile", component: CompleteProfile},
  { path: "/enter-otp", component: OTPVerification },
  { path: "/register-success", component: RegistrationComplete},
  { path: "/home-page", component: Homepage},
  { path: "/profile", component: Profile},

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
