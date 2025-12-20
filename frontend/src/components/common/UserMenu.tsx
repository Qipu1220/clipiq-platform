import { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { logoutThunk } from '../../store/authSlice';
import { User, ChevronDown, LogOut, Shield } from 'lucide-react';

interface UserMenuProps {
  variant?: 'user' | 'staff';
  onProfileClick?: () => void;
}

export function UserMenu({ variant = 'user', onProfileClick }: UserMenuProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    setShowUserMenu(false);
    dispatch(logoutThunk());
  };

  const handleProfileClickInternal = () => {
    setShowUserMenu(false);
    onProfileClick?.();
  };

  return (
    <div className="relative" ref={userMenuRef}>
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900/50 px-3 py-1.5 rounded-full transition-all border border-zinc-800 hover:border-zinc-700"
        onClick={() => setShowUserMenu(!showUserMenu)}
      >
        {currentUser?.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.username}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        )}
        <span className="text-white text-sm font-medium">
          {currentUser?.displayName || currentUser?.username}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
      </div>

      {showUserMenu && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-white text-sm font-medium truncate">
                  {currentUser?.displayName || currentUser?.username}
                </span>
                <span className="text-zinc-500 text-xs truncate">@{currentUser?.username}</span>
                {variant === 'staff' && (
                  <span className="text-[#ff3b5c] text-xs font-medium mt-0.5 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {currentUser?.role === 'admin' ? 'Administrator' : 'Staff'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleProfileClickInternal}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-zinc-800 transition-colors text-left group"
            >
              <User className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              <span className="text-sm">{variant === 'staff' ? 'Hồ sơ của tôi' : 'Xem tài khoản'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-zinc-800 transition-colors text-left group"
            >
              <LogOut className="w-4 h-4 group-hover:text-red-300 transition-colors" />
              <span className="text-sm">Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
