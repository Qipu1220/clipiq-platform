import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';
import { RootState } from '../store/store';
import { Play } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const dispatch = useDispatch();
  const allUsers = useSelector((state: RootState) => state.users.allUsers);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = allUsers.find(
      u => u.username === username && u.password === password
    );

    if (!user) {
      setError('Invalid username or password');
      return;
    }

    if (user.banned) {
      if (user.banExpiry && user.banExpiry < Date.now()) {
        // Ban expired, allow login
        dispatch(login(user));
      } else {
        setError('Your account has been banned');
        return;
      }
    } else {
      dispatch(login(user));
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-red-600 p-2 rounded">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-white text-3xl">clipiq</h1>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-zinc-300">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Enter username"
            />
          </div>
          
          <div>
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
            Login
          </Button>
        </form>

        <div className="mt-6 p-4 bg-zinc-800 rounded text-sm text-zinc-400">
          <p className="mb-2">Demo Accounts:</p>
          <p>admin001 / 123456</p>
          <p>staff001 / 123456</p>
          <p>user001 / 123456</p>
        </div>
      </div>
    </div>
  );
}
