import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your actual Firebase project configuration
// 1. Go to Firebase Console (console.firebase.google.com)
// 2. Create a new project
// 3. Add a web app to the project to get these credentials
// 4. Enable Authentication (Email/Password), Firestore Database, and Storage in the console.

const firebaseConfig = {
  apiKey: "AIzaSyDhd06OQ6sA9OL3CCE4K4wl9QTX5_L1Es4",
  authDomain: "olx-copy-8db92.firebaseapp.com",
  projectId: "olx-copy-8db92",
  storageBucket: "olx-copy-8db92.firebasestorage.app", 
  messagingSenderId: "54117416129",
  appId: "1:54117416129:web:a1f936421bf1fe75a9a840",
  measurementId: "G-XXXXXXXXXX" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
