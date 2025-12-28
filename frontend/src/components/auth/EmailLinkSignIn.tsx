/**
 * Email Link Sign-In Component
 * 
 * Passwordless authentication using Firebase Email Link
 * User enters email, receives a sign-in link, clicks it to authenticate
 */

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth, actionCodeSettings } from '../../config/firebase';
import { AppDispatch } from '../../store/store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface EmailLinkSignInProps {
  onBack: () => void;
  disabled?: boolean;
}

export function EmailLinkSignIn({ onBack, disabled = false }: EmailLinkSignInProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email) {
        throw new Error('Vui lòng nhập email');
      }

      if (!validateEmail(email)) {
        throw new Error('Email không hợp lệ');
      }

      // Send sign-in link to email
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // Save email to localStorage for later verification
      window.localStorage.setItem('emailForSignIn', email);

      setEmailSent(true);

    } catch (err: any) {
      console.error('Email Link Sign-In Error:', err);

      if (err.code === 'auth/invalid-email') {
        setError('Email không hợp lệ');
      } else if (err.code === 'auth/missing-android-pkg-name' || 
                 err.code === 'auth/missing-ios-bundle-id') {
        setError('Cấu hình ứng dụng không hợp lệ');
      } else if (err.code === 'auth/unauthorized-continue-uri') {
        setError('URL redirect không được phép. Vui lòng liên hệ admin.');
      } else {
        setError(err.message || 'Không thể gửi link đăng nhập');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show success message after email is sent
  if (emailSent) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Quay lại đăng nhập</span>
        </button>

        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-white text-xl font-medium mb-2">Kiểm tra email của bạn</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Chúng tôi đã gửi link đăng nhập đến
          </p>
          <p className="text-[#ff3b5c] font-medium mb-6">{email}</p>
          <p className="text-zinc-500 text-xs">
            Click vào link trong email để đăng nhập. Link có hiệu lực trong 1 giờ.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEmailSent(false);
            setEmail('');
          }}
          className="w-full h-10 bg-zinc-900/50 border-zinc-800/50 text-white hover:bg-zinc-800/50 rounded-xl"
        >
          Gửi lại link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
        disabled={loading}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Quay lại đăng nhập</span>
      </button>

      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-[#ff3b5c]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-[#ff3b5c]" />
        </div>
        <h3 className="text-white text-xl font-medium mb-2">Đăng nhập không cần mật khẩu</h3>
        <p className="text-zinc-500 text-sm">
          Nhập email và chúng tôi sẽ gửi cho bạn một link đăng nhập
        </p>
      </div>

      <form onSubmit={handleSendEmailLink} className="space-y-4">
        <div>
          <Label htmlFor="email-link" className="text-zinc-400 block mb-2 text-sm">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              id="email-link"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800/50 text-white pl-10 h-12 rounded-xl focus:border-[#ff3b5c]/50 transition-all"
              placeholder="email@example.com"
              disabled={loading || disabled}
            />
          </div>
        </div>

        {error && (
          <div className="bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-[#ff9fb3] p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl shadow-lg transition-all duration-200"
          disabled={loading || disabled}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Đang gửi...</span>
            </div>
          ) : (
            <span>Gửi link đăng nhập</span>
          )}
        </Button>
      </form>
    </div>
  );
}

export default EmailLinkSignIn;
