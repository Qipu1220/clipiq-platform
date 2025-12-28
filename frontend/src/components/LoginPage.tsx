import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginThunk, googleLoginThunk, clearError } from '../store/authSlice';
import { RootState, AppDispatch } from '../store/store';
import { Video, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RegisterPage } from './RegisterPage';
import { GoogleSignInButton } from './auth/GoogleSignInButton';
import { EmailLinkSignIn } from './auth/EmailLinkSignIn';
import { ForgotPassword } from './auth/ForgotPassword';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showEmailLink, setShowEmailLink] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  if (showRegister) {
    return <RegisterPage onBackToLogin={() => setShowRegister(false)} />;
  }

  // Show Forgot Password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-4">
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
              <ForgotPassword onBack={() => setShowForgotPassword(false)} disabled={loading} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    dispatch(clearError());
    setLocalError(null);

    // Check if input looks like an email
    const isEmail = username.includes('@');

    if (isEmail) {
      // Try Firebase Email/Password login first for email inputs
      try {
        const userCredential = await signInWithEmailAndPassword(auth, username, password);
        const idToken = await userCredential.user.getIdToken();

        // Use Google login thunk (same flow - send to backend)
        await dispatch(googleLoginThunk({
          idToken,
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || undefined,
          photoURL: userCredential.user.photoURL || undefined
        })).unwrap();
        
        return; // Success, exit
      } catch (firebaseError: any) {
        console.log('Firebase login failed, trying backend:', firebaseError.code);
        
        // If Firebase fails with user-not-found or wrong-password, try backend
        if (firebaseError.code === 'auth/user-not-found' || 
            firebaseError.code === 'auth/wrong-password' ||
            firebaseError.code === 'auth/invalid-credential') {
          // Fall through to backend login
        } else if (firebaseError.code === 'auth/invalid-email') {
          setLocalError('Email không hợp lệ');
          return;
        } else if (firebaseError.code === 'auth/too-many-requests') {
          setLocalError('Quá nhiều lần thử. Vui lòng thử lại sau.');
          return;
        }
        // For other Firebase errors, try backend login
      }
    }

    // Try backend login (for username or fallback for email)
    try {
      await dispatch(loginThunk({ login: username, password })).unwrap();
    } catch (backendError: any) {
      // If both failed, show error
      if (isEmail) {
        setLocalError('Email hoặc mật khẩu không đúng');
      }
      // Backend error will be shown from Redux state
    }
  };

  const displayError = localError || error;

  // Show Email Link Sign-In form
  if (showEmailLink) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-4">
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
              <EmailLinkSignIn onBack={() => setShowEmailLink(false)} disabled={loading} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-4">
      {/* Subtle background accent - minimal */}
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

      {/* Main login card */}
      <div className="w-full max-w-md relative z-10">
        {/* Clean minimal card */}
        <div className="backdrop-blur-md bg-zinc-950/80 rounded-3xl border border-zinc-900/50 shadow-2xl overflow-hidden">
          <div className="p-10">
            {/* Logo section - clean & centered */}
            <div className="flex flex-col items-center gap-6 mb-10">
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

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-zinc-400 block mb-2 text-sm">
                  Tên đăng nhập hoặc Email
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white h-12 rounded-xl focus:border-[#ff3b5c]/50 transition-all"
                  placeholder="Nhập tên đăng nhập hoặc email"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-zinc-400 block mb-2 text-sm">
                  Mật khẩu
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white h-12 rounded-xl focus:border-[#ff3b5c]/50 transition-all"
                  placeholder="Nhập mật khẩu"
                  disabled={loading}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-[#ff3b5c] hover:text-[#ff6b87] transition-colors"
                    disabled={loading}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>

              {displayError && (
                <div className="bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-[#ff9fb3] p-3.5 rounded-xl text-sm">
                  {displayError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl shadow-lg transition-all duration-200 mt-6"
                disabled={loading}
              >
                <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-zinc-500 bg-zinc-950/80">hoặc</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <GoogleSignInButton disabled={loading} />

            {/* Email Link Sign-In Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailLink(true)}
              disabled={loading}
              className="w-full h-12 mt-3 bg-zinc-900/50 border-zinc-800/50 text-white hover:bg-zinc-800/50 hover:border-zinc-700/50 rounded-xl transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#ff3b5c]" />
                <span>Đăng nhập bằng Email Link</span>
              </div>
            </Button>

            {/* Register link */}
            <div className="mt-6 text-center">
              <p className="text-zinc-500 text-sm">
                Chưa có tài khoản?{' '}
                <button
                  onClick={() => setShowRegister(true)}
                  className="text-[#ff3b5c] hover:text-[#ff6b87] transition-colors"
                  disabled={loading}
                >
                  Đăng ký ngay
                </button>
              </p>
            </div>

            {/* Demo accounts - refined */}
            <div className="mt-8 p-5 bg-zinc-900/30 rounded-2xl border border-zinc-900/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center">
                  <Video className="w-3.5 h-3.5 text-[#ff3b5c]" />
                </div>
                <p className="text-sm text-zinc-400">Tài khoản Demo</p>
              </div>
              <div className="space-y-2 text-xs text-zinc-500 font-mono">
                <div className="flex justify-between items-center p-2 bg-zinc-900/30 rounded-lg">
                  <span>admin</span>
                  <span className="text-zinc-600">•</span>
                  <span>Admin@123456</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-zinc-900/30 rounded-lg">
                  <span>staff_mod1</span>
                  <span className="text-zinc-600">•</span>
                  <span>Staff@123456</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-zinc-900/30 rounded-lg">
                  <span>user001</span>
                  <span className="text-zinc-600">•</span>
                  <span>User@123456</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
