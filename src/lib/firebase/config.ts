
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth"; // Import getAuth

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxGglrCkjQnEZZ1T4i79x6F0JC34kaNQo",
  authDomain: "squadron-manager-ekm3y.firebaseapp.com",
  projectId: "squadron-manager-ekm3y",
  storageBucket: "squadron-manager-ekm3y.firebasestorage.app",
  messagingSenderId: "108573147047",
  appId: "1:108573147047:web:0fb238bfab1f516d338082"
};


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully.");
} else {
  app = getApp();
  console.log("Firebase app already exists.");
}

// Connect to the specified Firestore database instance "dataset1"
const db: Firestore = getFirestore(app, "dataset1");
const auth: Auth = getAuth(app); // Initialize Firebase Auth

export { app, db, auth }; // Export auth instance

// Basic check for required environment variables
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error("Firebase configuration values seem to be missing or incomplete!");
}
