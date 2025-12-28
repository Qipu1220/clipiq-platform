/**
 * Firebase Configuration
 * 
 * Configure Firebase for Google Sign-In, Email/Password, and Email Link authentication
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, ActionCodeSettings } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfZMyO5ckTIinO4KAu4tjlrmOKoOUz4AE",
  authDomain: "se347-8dc1c.firebaseapp.com",
  projectId: "se347-8dc1c",
  storageBucket: "se347-8dc1c.firebasestorage.app",
  messagingSenderId: "14236579384",
  appId: "1:14236579384:web:22e8105375f283422bd8cd",
  measurementId: "G-T170HMMQE9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Provider
export const googleProvider = new GoogleAuthProvider();

// Add Google-specific scopes if needed
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Configure Google provider settings
googleProvider.setCustomParameters({
  prompt: 'select_account' // Force account selection even if one account is logged in
});

// Get the current origin for redirect URLs
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5173';
};

// Email Link (Passwordless) Sign-In Settings
// IMPORTANT: The URL must be whitelisted in Firebase Console:
// Firebase Console > Authentication > Settings > Authorized domains
export const actionCodeSettings: ActionCodeSettings = {
  // URL to redirect back to after email link click
  // This URL must be added to Authorized domains in Firebase Console
  url: getCurrentOrigin() + '/auth/email-signin',
  // This must be true for email link sign-in
  handleCodeInApp: true,
};

// Password Reset Settings
export const passwordResetSettings: ActionCodeSettings = {
  // URL to redirect after password reset
  url: getCurrentOrigin() + '/auth/reset-complete',
  handleCodeInApp: true,
};

export default app;
