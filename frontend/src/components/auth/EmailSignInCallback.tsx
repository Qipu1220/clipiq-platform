/**
 * Email Sign-In Callback Handler
 * 
 * This component handles the callback when user clicks the email sign-in link
 * It verifies the link and completes the authentication process
 */

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { isSignInWithEmailLink, signInWithEmailLink, getAdditionalUserInfo } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { googleLoginThunk } from '../../store/authSlice';
import { AppDispatch } from '../../store/store';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SetPasswordAfterEmailLink } from './SetPasswordAfterEmailLink';

interface EmailSignInCallbackProps {
  onComplete: () => void;
}

export function EmailSignInCallback({ onComplete }: EmailSignInCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'needEmail' | 'success' | 'askPassword' | 'error'>(() => {
    // Check if we already processed this and need to show password setup
    const needPasswordSetup = window.sessionStorage.getItem('emailLinkNeedPasswordSetup');
    if (needPasswordSetup === 'true') {
      return 'askPassword';
    }
    return 'loading';
  });
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [hasProcessed, setHasProcessed] = useState(() => {
    // Check if we already processed this sign-in
    return window.sessionStorage.getItem('emailLinkProcessed') === 'true';
  });
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Don't re-process if already done
    if (hasProcessed) {
      return;
    }
    handleEmailLinkSignIn();
  }, [hasProcessed]);

  const handleEmailLinkSignIn = async (providedEmail?: string) => {
    try {
      // Check if this is a sign-in with email link
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setError('Link đăng nhập không hợp lệ hoặc đã hết hạn');
        setStatus('error');
        return;
      }

      // Get email from localStorage or ask user
      let emailForSignIn = providedEmail || window.localStorage.getItem('emailForSignIn');

      if (!emailForSignIn) {
        // If email is not available, ask user to provide it
        setStatus('needEmail');
        return;
      }

      setStatus('loading');

      // Complete sign-in
      const userCredential = await signInWithEmailLink(auth, emailForSignIn, window.location.href);

      // Clear email from storage
      window.localStorage.removeItem('emailForSignIn');

      // Get ID token
      const idToken = await userCredential.user.getIdToken();

      // Send to backend to create/get user
      await dispatch(googleLoginThunk({
        idToken,
        email: userCredential.user.email || emailForSignIn,
        displayName: userCredential.user.displayName || undefined,
        photoURL: userCredential.user.photoURL || undefined
      })).unwrap();

      // Check if user already has a password set
      const hasPasswordProvider = userCredential.user.providerData.some(
        (provider) => provider.providerId === 'password'
      );

      // Check if this is a new user (just created via email link)
      const additionalInfo = getAdditionalUserInfo(userCredential);
      const isNewUser = additionalInfo?.isNewUser ?? false;

      console.log('=== Email Link Sign-In Debug ===');
      console.log('User UID:', userCredential.user.uid);
      console.log('User email:', userCredential.user.email);
      console.log('Is NEW user:', isNewUser);
      console.log('Additional user info:', additionalInfo);
      console.log('Provider data (full):', JSON.stringify(userCredential.user.providerData, null, 2));
      console.log('User providers:', userCredential.user.providerData.map(p => ({ id: p.providerId, email: p.email })));
      console.log('Has password provider:', hasPasswordProvider);

      // Show password setup modal if:
      // 1. User is NEW (just created via email link), OR
      // 2. User doesn't have password provider
      const shouldShowPasswordSetup = isNewUser || !hasPasswordProvider;
      console.log('Should show password setup modal:', shouldShowPasswordSetup);

      if (!shouldShowPasswordSetup) {
        // User already has password, just show success and redirect
        setStatus('success');
        // Mark as processed
        window.sessionStorage.setItem('emailLinkProcessed', 'true');
        setHasProcessed(true);
        setTimeout(() => {
          window.sessionStorage.removeItem('emailLinkProcessed');
          window.history.replaceState({}, document.title, '/');
          onComplete();
        }, 1500);
      } else {
        // Ask user if they want to set a password
        // Store this in sessionStorage so it persists across re-renders
        console.log('=== Setting askPassword status ===');
        window.sessionStorage.setItem('emailLinkNeedPasswordSetup', 'true');
        window.sessionStorage.setItem('emailLinkProcessed', 'true');
        setHasProcessed(true);
        setStatus('askPassword');
        console.log('Status set to askPassword');
      }

    } catch (err: any) {
      console.error('Email Link Sign-In Error:', err);

      if (err.code === 'auth/invalid-action-code') {
        setError('Link đăng nhập đã hết hạn hoặc đã được sử dụng');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email không khớp với link đăng nhập');
      } else if (err.code === 'auth/expired-action-code') {
        setError('Link đăng nhập đã hết hạn. Vui lòng yêu cầu link mới.');
      } else {
        setError(err.message || 'Đăng nhập thất bại');
      }

      setStatus('error');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      handleEmailLinkSignIn(email);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#ff3b5c] animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Đang xác thực...</p>
          <p className="text-zinc-500 text-sm mt-2">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  // Need email input
  if (status === 'needEmail') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-md bg-zinc-950/80 rounded-3xl border border-zinc-900/50 shadow-2xl p-10">
            <div className="text-center mb-6">
              <h2 className="text-white text-2xl font-medium mb-2">Xác nhận email</h2>
              <p className="text-zinc-500 text-sm">
                Bạn đang mở link ở tab/trình duyệt khác.
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                Vui lòng nhập lại email để hoàn tất đăng nhập.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="confirm-email" className="text-zinc-400 block mb-2 text-sm">
                  Email
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white h-12 rounded-xl focus:border-[#ff3b5c]/50"
                  placeholder="email@example.com"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl"
                disabled={!email}
              >
                Xác nhận
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-white text-2xl font-medium mb-2">Đăng nhập thành công!</h2>
          <p className="text-zinc-500 text-sm">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  // Ask if user wants to set password
  if (status === 'askPassword') {
    console.log('=== Rendering askPassword UI ===');
    const handleComplete = () => {
      // Clear sessionStorage flags
      window.sessionStorage.removeItem('emailLinkNeedPasswordSetup');
      window.sessionStorage.removeItem('emailLinkProcessed');
      window.history.replaceState({}, document.title, '/');
      onComplete();
    };

    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-white text-2xl font-medium mb-2">Đăng nhập thành công!</h2>
          <p className="text-zinc-500 text-sm">Chào mừng bạn quay lại</p>
        </div>
        
        {/* Password setup modal */}
        <SetPasswordAfterEmailLink 
          onComplete={handleComplete}
          onSkip={handleComplete}
        />
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="backdrop-blur-md bg-zinc-950/80 rounded-3xl border border-zinc-900/50 shadow-2xl p-10">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-white text-2xl font-medium mb-2">Đăng nhập thất bại</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>

          <Button
            onClick={onComplete}
            className="w-full h-12 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl"
          >
            Quay lại trang đăng nhập
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EmailSignInCallback;
