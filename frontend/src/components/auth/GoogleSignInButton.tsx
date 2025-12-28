/**
 * Google Sign-In Button Component
 * 
 * Uses Firebase Authentication with Google Provider
 * Sends ID token to backend for verification and user creation/login
 */

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import { googleLoginThunk } from '../../store/authSlice';
import { AppDispatch } from '../../store/store';
import { Button } from '../ui/button';

interface GoogleSignInButtonProps {
  disabled?: boolean;
  className?: string;
}

export function GoogleSignInButton({ disabled = false, className = '' }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Sign in with Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get ID token to send to backend
      const idToken = await user.getIdToken();

      // Dispatch Google login thunk
      await dispatch(googleLoginThunk({
        idToken,
        email: user.email || '',
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      })).unwrap();

    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Đã hủy đăng nhập');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup bị chặn. Vui lòng cho phép popup.');
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError(err.message || 'Đăng nhập Google thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={disabled || loading}
        className={`w-full h-12 bg-zinc-900/50 border-zinc-800/50 text-white hover:bg-zinc-800/50 hover:border-zinc-700/50 rounded-xl transition-all duration-200 ${className}`}
      >
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Đang đăng nhập...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Google Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Đăng nhập với Google</span>
          </div>
        )}
      </Button>

      {error && (
        <div className="mt-2 bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-[#ff9fb3] p-2.5 rounded-lg text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}

export default GoogleSignInButton;
