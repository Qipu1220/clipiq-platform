import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';
import { RootState } from '../store/store';
import { Play, Sparkles, Video } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RegisterPage } from './RegisterPage';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  
  const dispatch = useDispatch();
  const allUsers = useSelector((state: RootState) => state.users.allUsers);

  if (showRegister) {
    return <RegisterPage onBackToLogin={() => setShowRegister(false)} />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Allow login with username or email
    const user = allUsers.find(
      u => (u.username === username || u.email === username) && u.password === password
    );

    if (!user) {
      setError('Tên đăng nhập/email hoặc mật khẩu không đúng');
      return;
    }

    if (user.banned) {
      if (user.banExpiry && user.banExpiry < Date.now()) {
        // Ban expired, allow login
        dispatch(login(user));
      } else {
        const banMessage = user.banReason 
          ? `Tài khoản của bạn đã bị cấm. Lý do: ${user.banReason}`
          : 'Tài khoản của bạn đã bị cấm';
        setError(banMessage);
        return;
      }
    } else {
      dispatch(login(user));
    }
  };

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
                />
              </div>

              {error && (
                <div className="bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-[#ff9fb3] p-3.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white rounded-xl shadow-lg transition-all duration-200 mt-6"
              >
                <span>Đăng nhập</span>
              </Button>
            </form>

            {/* Register link */}
            <div className="mt-6 text-center">
              <p className="text-zinc-500 text-sm">
                Chưa có tài khoản?{' '}
                <button
                  onClick={() => setShowRegister(true)}
                  className="text-[#ff3b5c] hover:text-[#ff6b87] transition-colors"
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
                  <span>admin001</span>
                  <span className="text-zinc-600">•</span>
                  <span>123456</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-zinc-900/30 rounded-lg">
                  <span>staff001</span>
                  <span className="text-zinc-600">•</span>
                  <span>123456</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-zinc-900/30 rounded-lg">
                  <span>user001</span>
                  <span className="text-zinc-600">•</span>
                  <span>123456</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}