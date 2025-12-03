import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { RootState } from '../store/store';
import { Play, LogOut, User, Bell, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useRef, useEffect } from 'react';
import { NotificationPanel } from './NotificationPanel';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const notifications = useSelector((state: RootState) => state.notifications.notifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

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
    dispatch(logout());
  };

  const handleVideoClick = (videoId: string) => {
    setShowNotifications(false);
    onNavigate('home');
  };

  return (
    <header className="bg-black border-b border-zinc-800 sticky top-0 z-50 overflow-x-hidden">
      <div className="max-w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png" 
            alt="ShortV Logo" 
            className="w-8 h-8 object-contain"
          />
          <h1 className="text-white text-2xl logo-text">shortv</h1>
        </div>

        <nav className="flex items-center gap-4 flex-shrink-0">
          {currentUser?.role === 'admin' && (
            <Button
              variant={currentPage === 'admin' ? 'default' : 'ghost'}
              onClick={() => onNavigate('admin')}
              className={currentPage === 'admin' ? 'bg-[#ff3b5c] hover:bg-[#ff3b5c]' : 'text-white hover:bg-zinc-800'}
            >
              Quản trị
            </Button>
          )}

          {currentUser?.role === 'staff' && (
            <Button
              variant={currentPage === 'staff' ? 'default' : 'ghost'}
              onClick={() => onNavigate('staff')}
              className={currentPage === 'staff' ? 'bg-[#ff3b5c] hover:bg-[#ff3b5c]' : 'text-white hover:bg-zinc-800'}
            >
              Kiểm duyệt
            </Button>
          )}

          {currentUser?.role === 'user' && (
            <>
              <Button
                variant={currentPage === 'home' ? 'default' : 'ghost'}
                onClick={() => onNavigate('home')}
                className={currentPage === 'home' ? 'bg-[#ff3b5c] hover:bg-[#ff3b5c]' : 'text-white hover:bg-zinc-800'}
              >
                Trang chủ
              </Button>
              <Button
                variant={currentPage === 'upload' ? 'default' : 'ghost'}
                onClick={() => onNavigate('upload')}
                className={currentPage === 'upload' ? 'bg-[#ff3b5c] hover:bg-[#ff3b5c]' : 'text-white hover:bg-zinc-800'}
              >
                Tải lên
              </Button>
            </>
          )}

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <div 
              className="flex items-center gap-2 text-white cursor-pointer hover:bg-zinc-800 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-zinc-800"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.username}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="text-sm">{currentUser?.username}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </div>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-zinc-950 border border-zinc-900/50 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3.5 border-b border-zinc-900/50">
                  <div className="flex items-center gap-3">
                    {currentUser?.avatarUrl ? (
                      <img 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.username}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-zinc-800"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-800">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-white text-sm font-medium truncate">{currentUser?.displayName || currentUser?.username}</span>
                      <span className="text-zinc-500 text-xs truncate">@{currentUser?.username}</span>
                      {currentUser?.role === 'admin' && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded mt-1 w-fit">
                          Admin
                        </span>
                      )}
                      {currentUser?.role === 'staff' && (
                        <span className="text-xs px-2 py-0.5 bg-[#ff3b5c]/20 text-[#ff3b5c] rounded mt-1 w-fit">
                          Staff
                        </span>
                      )}
                      {currentUser?.role === 'user' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded mt-1 w-fit">
                          User
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  {currentUser?.role === 'user' && (
                    <>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('profile');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-zinc-900/40 transition-colors text-left"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm">Trang cá nhân</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('upload');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-zinc-900/40 transition-colors text-left"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm">Tải lên</span>
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[#ff3b5c] hover:bg-zinc-900/40 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentUser?.role === 'user' && (
            <div 
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5 text-white cursor-pointer hover:text-zinc-300 transition-colors" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-[#ff3b5c] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount}
                </div>
              )}
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2">
                  <NotificationPanel
                    onVideoClick={handleVideoClick}
                  />
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}