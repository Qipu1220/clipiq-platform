import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Mail, User, Lock, ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { googleLoginThunk } from '../store/authSlice';
import { AppDispatch } from '../store/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import apiClient from '../api/client';

interface RegisterPageProps {
  onBackToLogin: () => void;
}

export function RegisterPage({ onBackToLogin }: RegisterPageProps) {
  const dispatch = useDispatch<AppDispatch>();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    return hasMinLength && hasUppercase && hasLowercase && hasNumber;
  };

  // Handle Email/Password Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        throw new Error('Tất cả các trường là bắt buộc');
      }

      if (!validateUsername(formData.username)) {
        throw new Error('Tên đăng nhập phải có 3-50 ký tự, chỉ bao gồm chữ cái, số và gạch dưới');
      }

      if (!validateEmail(formData.email)) {
        throw new Error('Định dạng email không hợp lệ');
      }

      if (!validatePassword(formData.password)) {
        throw new Error('Mật khẩu phải có ít nhất 8 ký tự bao gồm chữ hoa, chữ thường và số');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Mật khẩu không khớp');
      }

      if (!agreedToTerms) {
        throw new Error('Bạn phải đồng ý với Điều khoản & Điều kiện');
      }

      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update Firebase profile with display name
      await firebaseUpdateProfile(userCredential.user, {
        displayName: formData.username
      });

      // Get ID token
      const idToken = await userCredential.user.getIdToken();

      // Register user in backend
      await apiClient.post('/auth/register', {
        idToken,
        username: formData.username,
        email: formData.email,
        displayName: formData.username
      });

      setSuccess(true);

      // Show success message then redirect to login
      setTimeout(() => {
        onBackToLogin();
      }, 2000);

    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('Email đã được đăng ký');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu quá yếu');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email không hợp lệ');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || 'Đăng ký thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-Up
  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      if (!agreedToTerms) {
        throw new Error('Bạn phải đồng ý với Điều khoản & Điều kiện');
      }

      // Sign in with Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get ID token to send to backend
      const idToken = await user.getIdToken();

      // Dispatch Google login thunk (creates user if not exists)
      await dispatch(googleLoginThunk({
        idToken,
        email: user.email || '',
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      })).unwrap();

      // Google sign-in successful - user is now logged in

    } catch (err: any) {
      console.error('Google Sign-Up Error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Đã hủy đăng ký');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup bị chặn. Vui lòng cho phép popup.');
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError(err.message || 'Đăng ký Google thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-4">
        {/* Subtle background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
            style={{ background: '#ff3b5c' }}
          />
        </div>

        <div className="backdrop-blur-md bg-zinc-950/80 p-10 rounded-3xl border border-zinc-900/50 max-w-md w-full text-center relative z-10">
          <div className="bg-green-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white text-2xl mb-2">Đăng ký thành công!</h2>
          <p className="text-zinc-500 text-sm">
            Tài khoản của bạn đã được tạo. Đang chuyển hướng đến trang đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-4 py-8">
      {/* Subtle background accent */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: '#ff3b5c' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-8"
          style={{ background: '#ff3b5c' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-md bg-zinc-950/80 rounded-3xl border border-zinc-900/50 shadow-2xl overflow-hidden">
          <div className="p-10">
            {/* Back button */}
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 -mt-2"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Quay lại đăng nhập</span>
            </button>

            {/* Logo section */}
            <div className="flex flex-col items-center gap-6 mb-8">
              <div className="flex justify-center">
                <img 
                  src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png" 
                  alt="ShortV Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              
              <div className="text-center">
                <h1 className="text-white text-4xl tracking-tight logo-text">
                  shortv
                </h1>
                <p className="text-zinc-500 text-sm mt-2">Tạo tài khoản mới</p>
              </div>
            </div>

            {error && (
              <div className="bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-[#ff9fb3] p-3.5 rounded-xl text-sm mb-5">
                {error}
              </div>
            )}

            {/* Google Sign-Up Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full h-12 bg-zinc-900/50 border-zinc-800/50 text-white hover:bg-zinc-800/50 hover:border-zinc-700/50 rounded-xl transition-all duration-200 mb-4"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
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
                  <span>Đăng ký với Google</span>
                </div>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-zinc-500 bg-zinc-950/80">hoặc đăng ký với email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-zinc-400 block mb-2 text-sm">Tên đăng nhập</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="tendangnhap"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-800/50 text-white pl-10 h-12 rounded-xl focus:border-[#ff3b5c]/50 transition-all"
                    disabled={loading}
                  />
                </div>
                <p className="text-zinc-600 text-xs mt-1.5">3-50 ký tự, chữ cái, số, gạch dưới</p>
              </div>

              <div>
                <Label className="text-zinc-400 block mb-2 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-800/50 text-white pl-10 h-12 rounded-xl focus:border-[#ff3b5c]/50 transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label className="text-zinc-400 block mb-2 text-sm">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-800/50 text-white pl-10 h-12 rounded-xl focus:border-[#ff3b5c]/50 transition-all"
                    disabled={loading}
                  />
                </div>
                <p className="text-zinc-600 text-xs mt-1.5">Tối thiểu 8 ký tự, chữ hoa, chữ thường, số</p>
              </div>

              <div>
                <Label className="text-zinc-400 block mb-2 text-sm">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-800/50 text-white pl-10 h-12 rounded-xl focus:border-[#ff3b5c]/50 transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <Checkbox
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  className="mt-0.5"
                  disabled={loading}
                />
                <label className="text-zinc-500 text-xs cursor-pointer leading-relaxed" onClick={() => !loading && setAgreedToTerms(!agreedToTerms)}>
                  Tôi đồng ý với Điều khoản & Điều kiện và Chính sách Bảo mật
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl shadow-lg transition-all duration-200 mt-6"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang đăng ký...</span>
                  </div>
                ) : (
                  <span>Đăng ký</span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}