import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { RootState } from '../store/store';
import { Play, LogOut, User } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className="bg-black border-b border-zinc-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onNavigate('home')}
        >
          <div className="bg-red-600 p-2 rounded">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-white text-2xl">clipiq</h1>
        </div>

        <nav className="flex items-center gap-4">
          {currentUser?.role === 'admin' && (
            <Button
              variant={currentPage === 'admin' ? 'default' : 'ghost'}
              onClick={() => onNavigate('admin')}
              className={currentPage === 'admin' ? 'bg-red-600 hover:bg-red-700' : 'text-white hover:bg-zinc-800'}
            >
              Admin Panel
            </Button>
          )}

          {currentUser?.role === 'staff' && (
            <Button
              variant={currentPage === 'staff' ? 'default' : 'ghost'}
              onClick={() => onNavigate('staff')}
              className={currentPage === 'staff' ? 'bg-red-600 hover:bg-red-700' : 'text-white hover:bg-zinc-800'}
            >
              Staff Panel
            </Button>
          )}

          {currentUser?.role === 'user' && (
            <>
              <Button
                variant={currentPage === 'home' ? 'default' : 'ghost'}
                onClick={() => onNavigate('home')}
                className={currentPage === 'home' ? 'bg-red-600 hover:bg-red-700' : 'text-white hover:bg-zinc-800'}
              >
                Home
              </Button>
              <Button
                variant={currentPage === 'upload' ? 'default' : 'ghost'}
                onClick={() => onNavigate('upload')}
                className={currentPage === 'upload' ? 'bg-red-600 hover:bg-red-700' : 'text-white hover:bg-zinc-800'}
              >
                Upload
              </Button>
            </>
          )}

          <div 
            className="flex items-center gap-2 text-white cursor-pointer hover:bg-zinc-800 px-2 py-1 rounded"
            onClick={() => currentUser?.role === 'user' && onNavigate('profile')}
          >
            {currentUser?.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.username}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="text-sm">{currentUser?.username}</span>
            <span className="text-xs text-zinc-500">({currentUser?.role})</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-zinc-800"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}