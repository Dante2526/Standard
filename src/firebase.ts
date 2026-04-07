import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import newFirebaseConfig from '../firebase-applet-config.json';

// Configuração do banco de dados ANTIGO (apenas leitura de usuários, etc)
const oldFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializa o app antigo (leitura)
const oldApp = initializeApp(oldFirebaseConfig, 'oldApp');
export const db = getFirestore(oldApp);
export const auth = getAuth(oldApp);

// Inicializa o app novo (escrita/leitura do novo banco de Kaizens)
const newApp = initializeApp(newFirebaseConfig, 'newApp');
export const newDb = getFirestore(newApp, (newFirebaseConfig as any).firestoreDatabaseId || '(default)');
export const newAuth = getAuth(newApp);

export { signInAnonymously };
