
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // If using Firebase Auth
// import { getStorage } from "firebase/storage"; // If using Firebase Storage

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxGglrCkjQnEZZ1T4i79x6F0JC34kaNQo",
  authDomain: "squadron-manager-ekm3y.firebaseapp.com",
  projectId: "squadron-manager-ekm3y",
  storageBucket: "squadron-manager-ekm3y.firebasestorage.app",
  messagingSenderId: "108573147047",
  appId: "1:108573147047:web:0fb238bfab1f516d338082"
  // measurementId: "YOUR_MEASUREMENT_ID" // Measurement ID is optional
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

const db: Firestore = getFirestore(app);
// const auth = getAuth(app); // Uncomment if using Firebase Auth
// const storage = getStorage(app); // Uncomment if using Firebase Storage

export { app, db /*, auth, storage */ };

// Basic check for required environment variables
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error("Firebase configuration values seem to be missing or incomplete!");
}
