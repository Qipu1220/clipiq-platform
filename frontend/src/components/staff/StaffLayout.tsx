import { ReactNode, useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { logoutThunk } from '../../store/authSlice';
import { Shield, Search, Home, Flag, Users, MessageSquare, UserCircle, ChevronDown, LogOut } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

interface StaffLayoutProps {
  children: ReactNode;
  activeTab: 'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'user-management' | 'profile';
  onTabChange: (tab: 'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'user-management' | 'profile') => void;
  pendingVideoReports: number;
  pendingUserReports: number;
  pendingCommentReports: number;
}

export function StaffLayout({ 
  children, 
  activeTab, 
  onTabChange,
  pendingVideoReports,
  pendingUserReports,
  pendingCommentReports
}: StaffLayoutProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    dispatch(logoutThunk());
  };

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-60 bg-zinc-950 flex flex-col border-r border-zinc-900/50 flex-shrink-0">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <img 
            src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png" 
            alt="ShortV Logo" 
            className="w-6 h-6 object-contain"
          />
          <h1 className="text-white text-xl tracking-tight logo-text">shortv</h1>
          <div className="ml-auto">
            <Shield className="w-5 h-5 text-[#ff3b5c]" />
          </div>
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/30 border-zinc-800/50 text-white text-sm pl-9 pr-3 py-1.5 h-9 rounded-lg focus:border-zinc-700"
              placeholder="Tìm kiếm"
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="px-2 space-y-0.5">
            <button 
              onClick={() => onTabChange('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#ff3b5c]/10 text-[#ff3b5c] font-medium shadow-sm border border-[#ff3b5c]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => onTabChange('video-reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'video-reports'
                  ? 'bg-[#ff3b5c]/10 text-[#ff3b5c] font-medium shadow-sm border border-[#ff3b5c]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Flag className="w-4 h-4 flex-shrink-0" />
                <span>Báo cáo Video</span>
              </div>
              {pendingVideoReports > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white">
                  {pendingVideoReports}
                </div>
              )}
            </button>

            <button 
              onClick={() => onTabChange('user-reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'user-reports'
                  ? 'bg-[#ff3b5c]/10 text-[#ff3b5c] font-medium shadow-sm border border-[#ff3b5c]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>Báo cáo User</span>
              </div>
              {pendingUserReports > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white">
                  {pendingUserReports}
                </div>
              )}
            </button>

            <button 
              onClick={() => onTabChange('comment-reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'comment-reports'
                  ? 'bg-[#ff3b5c]/10 text-[#ff3b5c] font-medium shadow-sm border border-[#ff3b5c]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span>Báo cáo Bình luận</span>
              </div>
              {pendingCommentReports > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white">
                  {pendingCommentReports}
                </div>
              )}
            </button>

            <div className="h-px bg-zinc-900/50 my-3 mx-2" />

            <button 
              onClick={() => onTabChange('user-management')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'user-management'
                  ? 'bg-[#ff3b5c]/10 text-[#ff3b5c] font-medium shadow-sm border border-[#ff3b5c]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Quản lý User</span>
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
        {/* Top Bar */}
        <div className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-zinc-950 relative z-40 flex-shrink-0">
          <div>
            <h2 className="text-white text-xl font-medium">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'video-reports' && 'Báo cáo Video'}
              {activeTab === 'user-reports' && 'Báo cáo User'}
              {activeTab === 'comment-reports' && 'Báo cáo Bình luận'}
              {activeTab === 'user-management' && 'Quản lý User'}
              {activeTab === 'profile' && 'Hồ sơ'}
            </h2>
          </div>

          <div className="relative z-50" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 transition-all border border-zinc-800/50"
            >
              <UserCircle className="w-5 h-5 text-zinc-400" />
              <span className="text-white text-sm">{currentUser?.username || 'Staff'}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-900/50 rounded-lg shadow-2xl overflow-hidden z-50">
                <div className="p-3 border-b border-zinc-900/50">
                  <p className="text-white text-sm font-medium">{currentUser?.username}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {currentUser?.role === 'admin' ? 'Administrator' : 'Staff'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onTabChange('profile');
                  }}
                  className="w-full px-3 py-2 text-left text-zinc-400 hover:bg-zinc-900/50 hover:text-white text-sm flex items-center gap-2 transition-all"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>Hồ sơ của tôi</span>
                </button>

                <div className="h-px bg-zinc-900/50" />

                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-red-400 hover:bg-zinc-900/50 text-sm flex items-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
