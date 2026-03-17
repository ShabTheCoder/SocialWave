import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Support loading config from environment variable for production (Render/Vercel)
// or from the local file in development (AI Studio)
let firebaseConfig;
try {
  // @ts-ignore - This file might not exist in production environments
  firebaseConfig = await import('../firebase-applet-config.json').then(m => m.default);
} catch (e) {
  // Fallback to environment variable if file is missing
  const configEnv = import.meta.env.VITE_FIREBASE_CONFIG || process.env.FIREBASE_CONFIG;
  if (configEnv) {
    firebaseConfig = typeof configEnv === 'string' ? JSON.parse(configEnv) : configEnv;
  } else {
    console.error('Firebase configuration missing! Please provide FIREBASE_CONFIG env var or firebase-applet-config.json file.');
  }
}

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig?.firestoreDatabaseId);
export const auth = getAuth(app);
