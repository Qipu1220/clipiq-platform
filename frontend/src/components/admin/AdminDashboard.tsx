import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  banUserByUsername, 
  unbanUserByUsername, 
  deleteUserByUsername, 
  updateUserRole 
} from '../../store/usersSlice';
import { logout } from '../../store/authSlice';
import { toggleMaintenanceMode } from '../../store/systemSlice';
import { 
  Shield, Users, Settings, Activity, TrendingUp, Eye, UserX, Trash2,
  Search, Play, User, ChevronDown, LogOut, BarChart3, Clock, Video,
  AlertTriangle, CheckCircle, Plus, Edit2, Power, Database, FileText,
  UserPlus, Crown, Zap, Download, Save
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { AdminProfile } from './AdminProfile';
import { toast } from 'sonner';

interface AdminDashboardProps {
  onVideoClick: (videoId: string) => void;
  onViewUserProfile: (username: string) => void;
}

export function AdminDashboard({ onVideoClick, onViewUserProfile }: AdminDashboardProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const videoReports = useSelector((state: RootState) => state.reports.videoReports);
  const userReports = useSelector((state: RootState) => state.reports.userReports);
  const maintenanceMode = useSelector((state: RootState) => state.system?.maintenanceMode || false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'staff' | 'analytics' | 'system-logs' | 'settings' | 'profile'>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [selectedUserForAction, setSelectedUserForAction] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);
  
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

  // Calculate stats
  const totalUsers = allUsers.filter(u => u.role === 'user').length;
  const totalStaff = allUsers.filter(u => u.role === 'staff').length;
  const totalVideos = videos.length;
  const bannedUsers = allUsers.filter(u => u.banned).length;
  const activeReports = [...videoReports, ...userReports].filter(r => r.status === 'pending').length;
  const todayVideos = videos.filter(v => 
    new Date(v.uploadedAt).toDateString() === new Date().toDateString()
  ).length;

  // Filter users based on search
  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePromoteToStaff = () => {
    if (!newStaffUsername) return;
    const user = allUsers.find(u => u.username === newStaffUsername);
    if (user && user.role === 'user') {
      dispatch(updateUserRole({ username: newStaffUsername, role: 'staff' }));
      setNewStaffUsername('');
    } else {
      toast.error('Người dùng không tồn tại hoặc đã là staff!');
    }
  };

  const handleDemoteStaff = (username: string) => {
    setConfirmAction({
      title: 'Xác nhận hạ cấp Staff',
      message: `Bạn có chắc muốn hạ cấp ${username} xuống user?`,
      confirmText: 'Hạ cấp',
      confirmColor: '#ff3b5c',
      onConfirm: () => {
        dispatch(updateUserRole({ username, role: 'user' }));
        toast.success(`Đã hạ cấp ${username} xuống user`);
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteUser = (username: string) => {
    setConfirmAction({
      title: 'Xác nhận xóa người dùng',
      message: `CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN người dùng ${username}?\nHành động này không thể hoàn tác!`,
      confirmText: 'Xóa',
      confirmColor: '#ff3b5c',
      onConfirm: () => {
        dispatch(deleteUserByUsername(username));
        setSelectedUserForAction(null);
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleMaintenance = () => {
    dispatch(toggleMaintenanceMode());
  };

  // Mock system logs
  const systemLogs = [
    { id: '1', timestamp: new Date().toISOString(), action: 'User banned', user: 'admin001', details: 'Banned user123 for 7 days' },
    { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'Video deleted', user: 'staff001', details: 'Deleted video due to violation' },
    { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), action: 'Staff promoted', user: 'admin001', details: 'Promoted user456 to staff' },
    { id: '4', timestamp: new Date(Date.now() - 10800000).toISOString(), action: 'System maintenance', user: 'admin001', details: 'Enabled maintenance mode' },
  ];

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
            <Crown className="w-5 h-5 text-yellow-500" />
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
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <BarChart3 className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'users'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${activeTab === 'users' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Quản lý User</span>
              </div>
              <div className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                {totalUsers}
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'staff'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${activeTab === 'staff' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Quản lý Staff</span>
              </div>
              <div className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                {totalStaff}
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'analytics'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <TrendingUp className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Thống kê</span>
            </button>

            <button 
              onClick={() => setActiveTab('system-logs')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'system-logs'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <Activity className={`w-5 h-5 ${activeTab === 'system-logs' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Lịch sử hệ thống</span>
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'settings'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Cài đặt</span>
            </button>

            <div className="h-px bg-zinc-900/50 my-3 mx-2" />

            <div className="text-zinc-600 text-xs px-3 mb-2 uppercase tracking-wider">Hệ thống</div>
            <div className="px-3 py-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Tổng videos</span>
                <span className="text-white font-medium">{totalVideos}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Videos hôm nay</span>
                <span className="text-[#ff3b5c] font-medium">{todayVideos}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Báo cáo chờ</span>
                <span className="text-yellow-500 font-medium">{activeReports}</span>
              </div>
            </div>

            {maintenanceMode && (
              <div className="mx-2 mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-500 text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Chế độ bảo trì</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
        {/* Top Bar */}
        <div className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-zinc-950 relative z-40 flex-shrink-0">
          <div>
            <h2 className="text-white text-xl">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'users' && 'Quản lý Người dùng'}
              {activeTab === 'staff' && 'Quản lý Staff'}
              {activeTab === 'analytics' && 'Thống kê'}
              {activeTab === 'system-logs' && 'Lịch sử Hệ thống'}
              {activeTab === 'settings' && 'Cài đặt'}
              {activeTab === 'profile' && 'Trang cá nhân'}
            </h2>
          </div>

          <div className="relative z-50" ref={userMenuRef}>
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
              <span className="text-sm">{currentUser?.displayName || currentUser?.username}</span>
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
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded mt-1 w-fit">
                        Admin
                      </span>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-zinc-900/40 transition-colors text-left"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Trang cá nhân</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      dispatch(logout());
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
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{totalUsers}</div>
                      <div className="text-sm text-zinc-500">Tổng người dùng</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Video className="w-5 h-5 text-purple-500" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{totalVideos}</div>
                      <div className="text-sm text-zinc-500">Tổng video</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-[#ff3b5c]" />
                        </div>
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{totalStaff}</div>
                      <div className="text-sm text-zinc-500">Staff</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        </div>
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{activeReports}</div>
                      <div className="text-sm text-zinc-500">Báo cáo chờ xử lý</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Overview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* System Status */}
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50 pb-4">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Database className="w-5 h-5 text-green-500" />
                        Trạng thái Hệ thống
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm">Server</span>
                          </div>
                          <span className="text-green-500 text-xs">Online</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm">Database</span>
                          </div>
                          <span className="text-green-500 text-xs">Connected</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                            <span className="text-white text-sm">Application</span>
                          </div>
                          <span className={`text-xs ${maintenanceMode ? 'text-yellow-500' : 'text-green-500'}`}>
                            {maintenanceMode ? 'Maintenance' : 'Running'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm">Storage</span>
                          </div>
                          <span className="text-zinc-400 text-xs">45.2 GB / 100 GB</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activities */}
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50 pb-4">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-[#ff3b5c]" />
                        Hoạt động gần đây
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {systemLogs.slice(0, 4).map(log => (
                          <div key={log.id} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-white text-sm font-medium">{log.action}</p>
                              <span className="text-xs text-zinc-500">
                                {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">{log.details}</p>
                            <p className="text-xs text-zinc-600 mt-1">Bởi: {log.user}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Users đã ban</div>
                    <div className="text-white text-xl font-medium">{bannedUsers}</div>
                  </div>
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Videos hôm nay</div>
                    <div className="text-white text-xl font-medium">{todayVideos}</div>
                  </div>
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Lượt xem hôm nay</div>
                    <div className="text-white text-xl font-medium">12.4K</div>
                  </div>
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Uptime</div>
                    <div className="text-white text-xl font-medium">99.9%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-zinc-400 text-sm">
                    Hiển thị {filteredUsers.filter(u => u.role === 'user').length} người dùng
                  </div>
                  <Button
                    onClick={() => setSearchQuery('')}
                    className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                  >
                    Làm mới
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {filteredUsers.filter(u => u.role === 'user').map(user => (
                    <Card key={user.username} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-800" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-800">
                                <User className="w-6 h-6 text-zinc-500" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-white font-medium">{user.displayName || user.username}</h3>
                                {user.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                              </div>
                              <p className="text-zinc-500 text-sm">@{user.username}</p>
                              <div className="flex gap-2 mt-2">
                                {user.banned && (
                                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">BANNED</span>
                                )}
                                {user.warnings > 0 && (
                                  <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">{user.warnings} cảnh báo</span>
                                )}
                                {!user.banned && user.warnings === 0 && (
                                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Tốt</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-zinc-500 text-xs mb-1">Videos</div>
                              <div className="text-white font-medium">{videos.filter(v => v.username === user.username).length}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => onViewUserProfile(user.username)}
                              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Xem
                            </Button>
                            {user.banned ? (
                              <Button
                                size="sm"
                                onClick={() => dispatch(unbanUserByUsername(user.username))}
                                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30 h-9 rounded-lg"
                              >
                                Gỡ ban
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => dispatch(banUserByUsername({ username: user.username, reason: 'Banned by admin' }))}
                                className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30 h-9 rounded-lg"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Ban
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleDeleteUser(user.username)}
                              className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredUsers.filter(u => u.role === 'user').length === 0 && (
                    <div className="text-center py-24">
                      <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-zinc-600" />
                      </div>
                      <p className="text-zinc-500 text-sm">Không tìm thấy người dùng nào</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Staff Tab */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                {/* Add Staff Card */}
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <UserPlus className="w-5 h-5 text-[#ff3b5c]" />
                      Thêm Staff mới
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Input
                        value={newStaffUsername}
                        onChange={(e) => setNewStaffUsername(e.target.value)}
                        className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700 flex-1"
                        placeholder="Nhập username của người dùng"
                      />
                      <Button
                        onClick={handlePromoteToStaff}
                        className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-11 rounded-lg px-6"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Thăng cấp lên Staff
                      </Button>
                    </div>
                    <p className="text-zinc-500 text-xs mt-2">Nhập username của người dùng hiện tại để thăng cấp lên staff</p>
                  </CardContent>
                </Card>

                {/* Staff List */}
                <div className="grid grid-cols-1 gap-3">
                  {allUsers.filter(u => u.role === 'staff').map(staff => (
                    <Card key={staff.username} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {staff.avatarUrl ? (
                              <img src={staff.avatarUrl} alt={staff.username} className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-800" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-800">
                                <User className="w-6 h-6 text-zinc-500" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-white font-medium">{staff.displayName || staff.username}</h3>
                                <span className="text-xs px-2 py-0.5 bg-[#ff3b5c]/20 text-[#ff3b5c] rounded">Staff</span>
                              </div>
                              <p className="text-zinc-500 text-sm">@{staff.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDemoteStaff(staff.username)}
                              className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                            >
                              Hạ cấp
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {allUsers.filter(u => u.role === 'staff').length === 0 && (
                    <div className="text-center py-24">
                      <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-zinc-600" />
                      </div>
                      <p className="text-zinc-500 text-sm">Chưa có staff nào</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Eye className="w-5 h-5 text-blue-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">1.2M</div>
                      <div className="text-sm text-zinc-500 mb-2">Tổng lượt xem</div>
                      <div className="text-xs text-green-500">+12.5% so với tháng trước</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Play className="w-5 h-5 text-purple-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">45.6K</div>
                      <div className="text-sm text-zinc-500 mb-2">Videos đã tải lên</div>
                      <div className="text-xs text-green-500">+8.3% so với tháng trước</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-green-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">89.2K</div>
                      <div className="text-sm text-zinc-500 mb-2">Người dùng hoạt động</div>
                      <div className="text-xs text-green-500">+15.7% so với tháng trước</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-yellow-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">12.4 phút</div>
                      <div className="text-sm text-zinc-500 mb-2">Thời gian xem TB</div>
                      <div className="text-xs text-green-500">+3.2% so với tháng trước</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-[#ff3b5c]" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{activeReports}</div>
                      <div className="text-sm text-zinc-500 mb-2">Báo cáo chờ xử lý</div>
                      <div className="text-xs text-red-400">Cần xử lý</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-orange-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">94.3%</div>
                      <div className="text-sm text-zinc-500 mb-2">Tỷ lệ tương tác</div>
                      <div className="text-xs text-green-500">+2.1% so với tháng trước</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white text-lg">Top Videos</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {videos.slice(0, 5).map((video, index) => (
                        <div key={video.id} className="flex items-center gap-4 p-3 bg-zinc-900/30 rounded-lg">
                          <div className="text-zinc-500 font-medium text-sm w-6">#{index + 1}</div>
                          <div className="w-24 h-16 bg-zinc-900/50 rounded-lg overflow-hidden flex-shrink-0">
                            {video.thumbnailUrl && (
                              <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white text-sm font-medium truncate">{video.title}</h4>
                            <p className="text-zinc-500 text-xs">@{video.username}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{video.views.toLocaleString()}</div>
                            <div className="text-zinc-500 text-xs">lượt xem</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System Logs Tab */}
            {activeTab === 'system-logs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-zinc-400 text-sm">
                    Hiển thị {systemLogs.length} hoạt động gần nhất
                  </div>
                  <Button
                    className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Xuất log
                  </Button>
                </div>

                <div className="space-y-2">
                  {systemLogs.map(log => (
                    <Card key={log.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Activity className="w-4 h-4 text-[#ff3b5c]" />
                              <h4 className="text-white font-medium">{log.action}</h4>
                              <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                                {log.user}
                              </span>
                            </div>
                            <p className="text-zinc-400 text-sm mb-1">{log.details}</p>
                            <p className="text-zinc-600 text-xs">
                              {new Date(log.timestamp).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Maintenance Mode */}
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Power className="w-5 h-5 text-yellow-500" />
                      Chế độ Bảo trì
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">Bật chế độ bảo trì</h4>
                        <p className="text-zinc-500 text-sm">
                          Khi bật, người dùng thường sẽ không thể truy cập ứng dụng. Admin và Staff vẫn có thể đăng nhập.
                        </p>
                      </div>
                      <Button
                        onClick={handleToggleMaintenance}
                        className={`ml-4 h-11 rounded-lg px-6 ${
                          maintenanceMode
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30'
                            : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {maintenanceMode ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Tắt Bảo trì
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            Bật Bảo trì
                          </>
                        )}
                      </Button>
                    </div>
                    {maintenanceMode && (
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-500 text-sm">Hệ thống đang ở chế độ bảo trì</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* General Settings */}
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-[#ff3b5c]" />
                      Cài đặt chung
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label className="text-zinc-400 mb-2 block text-sm">Tên ứng dụng</Label>
                      <Input
                        defaultValue="clipiq"
                        className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 mb-2 block text-sm">Giới hạn upload (MB)</Label>
                      <Input
                        type="number"
                        defaultValue="100"
                        className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 mb-2 block text-sm">Thời lượng video tối đa (giây)</Label>
                      <Input
                        type="number"
                        defaultValue="60"
                        className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                      />
                    </div>
                    <Button className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-11 rounded-lg">
                      <Save className="w-4 h-4 mr-2" />
                      Lưu thay đổi
                    </Button>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white text-lg">Cài đặt thông báo</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                        <span className="text-white text-sm">Thông báo báo cáo mới</span>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                        <span className="text-white text-sm">Thông báo người dùng mới</span>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                        <span className="text-white text-sm">Cảnh báo hệ thống</span>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <AdminProfile />
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md mx-4 border border-zinc-800 shadow-2xl">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-white text-lg font-medium">{confirmAction.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-zinc-400 text-sm whitespace-pre-line">{confirmAction.message}</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-zinc-800 text-white py-3 rounded-lg hover:bg-zinc-700 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className="flex-1 text-white py-3 rounded-lg transition-all font-medium"
                style={{ backgroundColor: confirmAction.confirmColor }}
                onMouseEnter={(e) => {
                  const color = confirmAction.confirmColor;
                  e.currentTarget.style.backgroundColor = color === '#ff3b5c' ? '#e6315a' : color;
                }}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = confirmAction.confirmColor}
              >
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}