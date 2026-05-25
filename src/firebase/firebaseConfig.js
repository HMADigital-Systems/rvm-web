// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";

// Use VITE env vars if available (Vercel build), fallback to hardcoded defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDY0PAA1OIyLvBqKz24r2sfezv6jNShuY0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rvm-web-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rvm-web-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rvm-web-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "738705045695",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:738705045695:web:cc8111ad8fa1bb5cd8ae0a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FQ5QV62775",
};

const app = initializeApp(firebaseConfig);
export default app;
