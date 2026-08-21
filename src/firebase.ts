import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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
export const db = initializeFirestore(oldApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(oldApp);

// Configuração do banco de dados NOVO
const newFirebaseConfig = {
  apiKey: import.meta.env.VITE_NEW_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_NEW_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_NEW_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_NEW_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_NEW_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_NEW_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_NEW_FIREBASE_MEASUREMENT_ID
};

// Inicializa o app novo (escrita/leitura do novo banco de Kaizens)
const newApp = initializeApp(newFirebaseConfig, 'newApp');
export const newDb = initializeFirestore(newApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, import.meta.env.VITE_NEW_FIREBASE_DATABASE_ID || '(default)');
export const newAuth = getAuth(newApp);

let storageInstance: any = null;
try {
  storageInstance = getStorage(newApp);
} catch (error) {
  console.warn("Firebase Storage is not available. Please enable it in the Firebase Console.", error);
}
export const newStorage = storageInstance;

export { signInAnonymously };
