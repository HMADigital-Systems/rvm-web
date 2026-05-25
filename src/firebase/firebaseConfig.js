// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";

// Using OLD Firebase project (rvm-auth-system) which already has app.mygreenplus.com authorized
const firebaseConfig = {
  apiKey: "AIzaSyA4BfOOkmtC1UYp8NDhG5CLffZgaNLvKBU",
  authDomain: "rvm-auth-system.firebaseapp.com",
  projectId: "rvm-auth-system",
  storageBucket: "rvm-auth-system.firebasestorage.app",
  messagingSenderId: "628987362418",
  appId: "1:628987362418:web:6af14ac4c1c30544a1d6eb"
};

const app = initializeApp(firebaseConfig);
export default app;
