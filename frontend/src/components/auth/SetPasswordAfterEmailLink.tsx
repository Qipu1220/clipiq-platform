/**
 * Set Password After Email Link Sign-In
 * 
 * Allows users who signed in via Email Link to set a password
 * so they can login with email/password in the future
 */

import { useState } from 'react';
import { updatePassword, EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { KeyRound, CheckCircle, X } from 'lucide-react';

interface SetPasswordAfterEmailLinkProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function SetPasswordAfterEmailLink({ onComplete, onSkip }: SetPasswordAfterEmailLinkProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    return null;
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Không tìm thấy thông tin người dùng');
      }

      // Validate password
      const passwordError = validatePassword(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      if (password !== confirmPassword) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }

      // Check if user already has password provider
      const hasPasswordProvider = user.providerData.some(
        (provider) => provider.providerId === 'password'
      );

      if (hasPasswordProvider) {
        // User already has password, update it
        await updatePassword(user, password);
      } else {
        // Link email/password credential to existing account
        const credential = EmailAuthProvider.credential(user.email, password);
        await linkWithCredential(user, credential);
      }

      setSuccess(true);
      
      // Wait a bit then complete
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: any) {
      console.error('Set Password Error:', err);

      if (err.code === 'auth/weak-password') {
        setError('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (err.code === 'auth/provider-already-linked') {
        setError('Tài khoản đã có mật khẩu. Bạn có thể đăng nhập bằng email/mật khẩu.');
      } else if (err.code === 'auth/credential-already-in-use') {
        setError('Email này đã được sử dụng cho tài khoản khác.');
      } else {
        setError(err.message || 'Không thể tạo mật khẩu');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-white text-xl font-medium mb-2">Đã tạo mật khẩu!</h3>
            <p className="text-zinc-400 text-sm">
              Lần sau bạn có thể đăng nhập bằng email và mật khẩu này.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-md w-full relative">
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#ff3b5c]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-[#ff3b5c]" />
          </div>
          <h3 className="text-white text-xl font-medium mb-2">Tạo mật khẩu?</h3>
          <p className="text-zinc-400 text-sm">
            Bạn vừa đăng nhập bằng Email Link. Tạo mật khẩu để lần sau đăng nhập nhanh hơn.
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-zinc-400 text-sm">
              Mật khẩu mới
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-11 bg-zinc-900/50 border-zinc-800/50 text-white placeholder:text-zinc-600 focus:border-[#ff3b5c]/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-zinc-400 text-sm">
              Xác nhận mật khẩu
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="h-11 bg-zinc-900/50 border-zinc-800/50 text-white placeholder:text-zinc-600 focus:border-[#ff3b5c]/50 rounded-xl"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              disabled={loading}
              className="flex-1 h-11 bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl"
            >
              Bỏ qua
            </Button>
            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="flex-1 h-11 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo...
                </span>
              ) : (
                'Tạo mật khẩu'
              )}
            </Button>
          </div>
        </form>

        <p className="text-center text-zinc-500 text-xs mt-4">
          Bạn vẫn có thể dùng Email Link hoặc Google để đăng nhập
        </p>
      </div>
    </div>
  );
}
