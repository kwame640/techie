import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  Auth, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';

// Firebase config for NKAY Technologies
const firebaseConfig = {
  apiKey: "AIzaSyBHkLuQfB056wCzjfWn7mrVYbyXDpWPKFA",
  authDomain: "nkaytechnologies.firebaseapp.com",
  projectId: "nkaytechnologies",
  storageBucket: "nkaytechnologies.firebasestorage.app",
  messagingSenderId: "182848691322",
  appId: "1:182848691322:web:170eca14bc2932531a6fc3",
  measurementId: "G-ZCBKK9J3TS"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, isNewUser: true };
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, isNewUser: false };
  } catch (error) {
    console.error('Email sign-in error:', error);
    throw error;
  }
};

// Helper function for Google sign-in
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, isNewUser: isFirstSignIn(result.user) };
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Firebase v12 no longer exposes additionalUserInfo.isNewUser on sign-in results.
// A brand-new account has creationTime equal to lastSignInTime on its first sign-in.
const isFirstSignIn = (firebaseUser: any): boolean => {
  const metadata = firebaseUser?.metadata;
  const created = metadata?.creationTime;
  const last = metadata?.lastSignInTime;
  return Boolean(created && created === last);
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
};

export default app;
