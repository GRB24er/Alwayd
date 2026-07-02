// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Hardcoded Firebase configuration - REPLACE THESE VALUES WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBWw5wL86Tn_ssO24OKs6HRoeY7lUlCoL0",
  authDomain: "chat-3fde3.firebaseapp.com",
  projectId: "chat-3fde3",
  storageBucket: "chat-3fde3.appspot.com",
  messagingSenderId: "984676655951",
  appId: "1:984676655951:web:3625030deee61a01f95b3a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);

// Explicit exports
export { db, auth };