// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import localConfig from "../firebase-applet-config.json";

const resolveConfigValue = (envVal: string | undefined, localVal: string | undefined) => {
  if (localVal && localVal.trim() !== "") return localVal;
  if (envVal && !envVal.includes("AIzaSy...") && !envVal.includes("your-")) return envVal;
  return undefined;
};

const firebaseConfig = {
  apiKey: resolveConfigValue(import.meta.env.VITE_FIREBASE_API_KEY, localConfig?.apiKey),
  authDomain: resolveConfigValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, localConfig?.authDomain),
  projectId: resolveConfigValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, localConfig?.projectId),
  storageBucket: resolveConfigValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, localConfig?.storageBucket),
  messagingSenderId: resolveConfigValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, localConfig?.messagingSenderId),
  appId: resolveConfigValue(import.meta.env.VITE_FIREBASE_APP_ID, localConfig?.appId),
};

console.log("Initialize Firebase with:", firebaseConfig.projectId ? "Valid ID" : "Missing", "API Key length:", firebaseConfig.apiKey?.length);

let app, auth, db;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, localConfig?.firestoreDatabaseId);
  } else {
    throw new Error("Missing config");
  }
} catch (error) {
  console.error(
    "Firebase config is missing or invalid. Check your environment variables.",
  );
}

export { auth, db, app };
