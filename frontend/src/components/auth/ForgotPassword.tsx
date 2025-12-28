/**
 * Forgot Password Component
 * 
 * Uses Firebase sendPasswordResetEmail to send password reset link to user's email
 */

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, passwordResetSettings } from '../../config/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
  disabled?: boolean;
}

export function ForgotPassword({ onBack, disabled = false }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
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

      // Send password reset email
      await sendPasswordResetEmail(auth, email, passwordResetSettings);

      setEmailSent(true);

    } catch (err: any) {
      console.error('Forgot Password Error:', err);

      if (err.code === 'auth/invalid-email') {
        setError('Email không hợp lệ');
      } else if (err.code === 'auth/user-not-found') {
        setError('Không tìm thấy tài khoản với email này');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Quá nhiều yêu cầu. Vui lòng thử lại sau');
      } else if (err.code === 'auth/unauthorized-continue-uri') {
        setError('URL redirect không được phép. Vui lòng liên hệ admin.');
      } else {
        setError(err.message || 'Không thể gửi email đặt lại mật khẩu');
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
            Chúng tôi đã gửi link đặt lại mật khẩu đến
          </p>
          <p className="text-[#ff3b5c] font-medium mb-6">{email}</p>
          <p className="text-zinc-500 text-xs">
            Click vào link trong email để đặt lại mật khẩu. Link có hiệu lực trong 1 giờ.
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
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Quay lại đăng nhập</span>
      </button>

      <div className="text-center">
        <div className="w-16 h-16 bg-[#ff3b5c]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-[#ff3b5c]" />
        </div>
        <h3 className="text-white text-xl font-medium mb-2">Quên mật khẩu?</h3>
        <p className="text-zinc-400 text-sm">
          Nhập email đã đăng ký để nhận link đặt lại mật khẩu
        </p>
      </div>

      <form onSubmit={handleSendResetEmail} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-zinc-400 text-sm font-normal">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              id="reset-email"
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || disabled}
              className="h-10 bg-zinc-900/50 border-zinc-800/50 text-white placeholder:text-zinc-600 focus:border-[#ff3b5c]/50 focus:ring-1 focus:ring-[#ff3b5c]/20 rounded-xl pl-10"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || disabled || !email}
          className="w-full h-10 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white font-medium rounded-xl transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang gửi...
            </span>
          ) : (
            'Gửi link đặt lại mật khẩu'
          )}
        </Button>
      </form>

      <p className="text-center text-zinc-500 text-xs">
        Nếu không nhận được email, vui lòng kiểm tra thư mục spam
      </p>
    </div>
  );
}
