import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Play, Mail, User, Lock } from 'lucide-react';
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
      setError('All fields are required');
      return;
    }

    if (!validateUsername(formData.username)) {
      setError('Username must be 3-50 characters, alphanumeric and underscore only');
      return;
    }

    if (allUsers.some(u => u.username === formData.username)) {
      setError('Username already exists');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Invalid email format');
      return;
    }

    if (allUsers.some(u => u.email === formData.email)) {
      setError('Email already registered');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to Terms & Conditions');
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
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 max-w-md w-full text-center">
          <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white text-xl mb-2">Registration Successful!</h2>
          <p className="text-zinc-400 text-sm">
            Your account has been created. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-red-600 p-2 rounded">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-white text-2xl">clipiq</h1>
        </div>

        <h2 className="text-white text-xl mb-2 text-center">Create Account</h2>
        <p className="text-zinc-400 text-sm mb-6 text-center">
          Join clipiq to start sharing and watching videos
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-600 text-red-200 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-zinc-300">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white pl-10"
              />
            </div>
            <p className="text-zinc-500 text-xs mt-1">3-50 characters, letters, numbers, underscore</p>
          </div>

          <div>
            <Label className="text-zinc-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white pl-10"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white pl-10"
              />
            </div>
            <p className="text-zinc-500 text-xs mt-1">Min 8 chars, uppercase, lowercase, number</p>
          </div>

          <div>
            <Label className="text-zinc-300">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white pl-10"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1"
            />
            <label className="text-zinc-400 text-sm cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
              I agree to the Terms & Conditions and Privacy Policy
            </label>
          </div>

          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{' '}
            <button
              onClick={onBackToLogin}
              className="text-red-500 hover:text-red-400 hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-zinc-500 text-xs text-center">
            Demo accounts: admin001, staff001, user001 (password: 123456)
          </p>
        </div>
      </div>
    </div>
  );
}
