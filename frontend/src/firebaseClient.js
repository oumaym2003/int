import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

// Configurez ces variables dans .env.local (voir .env.local.example)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
}

export async function signOut() {
  await firebaseSignOut(auth);
  localStorage.removeItem('access_token');
  localStorage.removeItem('uid');
  localStorage.removeItem('nomMedecin');
}

// Garder localStorage synchronisé avec l'état d'authentification
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const token = await user.getIdToken();
    localStorage.setItem('access_token', token);
    localStorage.setItem('uid', user.uid);
    localStorage.setItem('nomMedecin', user.displayName || '');
  } else {
    localStorage.removeItem('access_token');
    localStorage.removeItem('uid');
    localStorage.removeItem('nomMedecin');
  }
});

// Axios interceptor: ajoute automatiquement l'ID token aux requêtes API
axios.interceptors.request.use(async (config) => {
  try {
    let token = null;
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    } else {
      token = localStorage.getItem('access_token');
    }
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
}, (error) => Promise.reject(error));
