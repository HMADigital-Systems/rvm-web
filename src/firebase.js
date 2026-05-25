// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// ⭐ Using OLD Firebase project (rvm-auth-system) which already has app.mygreenplus.com authorized
const firebaseConfig = {
  apiKey: "AIzaSyA4BfOOkmtC1UYp8NDhG5CLffZgaNLvKBU",
  authDomain: "rvm-auth-system.firebaseapp.com",
  projectId: "rvm-auth-system",
  storageBucket: "rvm-auth-system.firebasestorage.app",
  messagingSenderId: "628987362418",
  appId: "1:628987362418:web:6af14ac4c1c30544a1d6eb"
};

// Initialize App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

auth.languageCode = "en";

// ⭐ FIX: Safety check before accessing settings
// Set this to TRUE if using "Phone numbers for testing" (e.g., +1 650-555-3434)
// Set this to FALSE if using REAL PHONES
if (auth.settings) {
  auth.settings.appVerificationDisabledForTesting = false; 
}

export { auth, RecaptchaVerifier, signInWithPhoneNumber };