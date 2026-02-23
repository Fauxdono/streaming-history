import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmYEugerypA2zKeH5dHKXPErrl-s7HbUM",
  authDomain: "cake-3a62c.firebaseapp.com",
  projectId: "cake-3a62c",
  storageBucket: "cake-3a62c.firebasestorage.app",
  messagingSenderId: "240182855703",
  appId: "1:240182855703:web:5585bf81e74c778e0db452",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
