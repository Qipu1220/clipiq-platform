import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Play, Mail, User, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { addUser } from '../store/usersSlice';
import { RootState } from '../store/store';
import type { User as UserType } from '../store/authSlice';

interface RegisterPageProps {
  onBackToLogin: () => void;
}

export function RegisterPage({ onBackToLogin }: RegisterPageProps) {
  const dispatch = useDispatch();
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Tất cả các trường là bắt buộc');
      return;
    }

    if (!validateUsername(formData.username)) {
      setError('Tên đăng nhập phải có 3-50 ký tự, chỉ bao gồm chữ cái, số và gạch dưới');
      return;
    }

    if (allUsers.some(u => u.username === formData.username)) {
      setError('Tên đăng nhập đã tồn tại');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Định dạng email không hợp lệ');
      return;
    }

    if (allUsers.some(u => u.email === formData.email)) {
      setError('Email đã được đăng ký');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự bao gồm chữ hoa, chữ thường và số');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    if (!agreedToTerms) {
      setError('Bạn phải đồng ý với Điều khoản & Điều kiện');
      return;
    }

    // Create new user
    const newUser: UserType = {
      id: `user-${Date.now()}-${Math.random()}`,
      username: formData.username,
      email: formData.email,
      password: formData.password, // In real app, this would be hashed
      role: 'user',
      warnings: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dispatch(addUser(newUser));
    setSuccess(true);

    // Show success message then redirect to login
    setTimeout(() => {
      onBackToLogin();
    }, 2000);
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
              </div>
            </div>

            {error && (
              <div className="bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-[#ff9fb3] p-3.5 rounded-xl text-sm mb-5">
                {error}
              </div>
            )}

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
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <Checkbox
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  className="mt-0.5"
                />
                <label className="text-zinc-500 text-xs cursor-pointer leading-relaxed" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                  Tôi đồng ý với Điều khoản & Điều kiện và Chính sách Bảo mật
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl shadow-lg transition-all duration-200 mt-6"
              >
                <span>Đăng ký</span>
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-900/50">
              <p className="text-zinc-600 text-xs text-center">
                Tài khoản demo: admin001, staff001, user001 (mật khẩu: 123456)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}