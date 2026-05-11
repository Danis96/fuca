import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD0SwzDbXaqZgmkOIKhIXXPYPrefhwe4IM",
  authDomain: "fuca-e61ab.firebaseapp.com",
  projectId: "fuca-e61ab",
  storageBucket: "fuca-e61ab.firebasestorage.app",
  messagingSenderId: "607287236388",
  appId: "1:607287236388:web:83a3708ed5b48ba9b385b1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
