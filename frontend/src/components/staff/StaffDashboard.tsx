import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { resolveVideoReport, resolveUserReport, updateAppealStatus } from '../../store/reportsSlice';
import { banUser, unbanUser, warnUser, clearWarnings } from '../../store/usersSlice';
import { deleteVideo } from '../../store/videosSlice';
import { logout } from '../../store/authSlice';
import { 
  Shield, AlertTriangle, Flag, MessageSquare, UserX, Trash2, CheckCircle, 
  Eye, UserCircle, Play, Search, Home, BarChart3, Users, Video, User,
  ChevronDown, LogOut, FileText, Clock, TrendingUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { StaffProfile } from './StaffProfile';
import { toast } from 'sonner';

interface StaffDashboardProps {
  onVideoClick: (videoId: string) => void;
  onViewUserProfile: (username: string) => void;
}

export function StaffDashboard({ onVideoClick, onViewUserProfile }: StaffDashboardProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const videoReports = useSelector((state: RootState) => state.reports.videoReports);
  const userReports = useSelector((state: RootState) => state.reports.userReports);
  const appeals = useSelector((state: RootState) => state.reports.appeals);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'video-reports' | 'user-reports' | 'comments' | 'support' | 'moderation' | 'profile'>('dashboard');
  const [banUsername, setBanUsername] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-video' | 'dismiss-video' | 'warn-user' | 'dismiss-user' | 'ban-temp' | 'ban-permanent' | 'approve-appeal' | 'deny-appeal';
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);
  
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Helper function to get Vietnamese report type name
  const getReportTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'spam': 'Spam hoặc quảng cáo',
      'harassment': 'Quấy rối hoặc bắt nạt',
      'hate': 'Ngôn từ gây thù ghét',
      'violence': 'Bạo lực hoặc nguy hiểm',
      'nudity': 'Nội dung không phù hợp',
      'copyright': 'Vi phạm bản quyền',
      'misleading': 'Thông tin sai lệch',
      'other': 'Khác'
    };
    return typeMap[type] || type;
  };

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
  const pendingVideoReports = videoReports.filter(r => r.status === 'pending').length;
  const pendingUserReports = userReports.filter(r => r.status === 'pending').length;
  const pendingAppeals = appeals.filter(a => a.status === 'pending').length;
  const resolvedToday = [...videoReports, ...userReports].filter(
    r => r.status === 'resolved' && new Date(r.timestamp).toDateString() === new Date().toDateString()
  ).length;
  const violatingVideos = videos.filter(v => 
    videoReports.some(r => r.videoId === v.id && r.status === 'pending')
  ).length;

  const handleResolveVideoReport = (reportId: string, videoId: string, shouldDelete: boolean) => {
    if (shouldDelete) {
      setConfirmAction({
        type: 'delete-video',
        title: 'Xóa video',
        message: 'Bạn có chắc muốn xóa video này? Video sẽ bị xóa vĩnh viễn.',
        confirmText: 'Xóa video',
        confirmColor: '#ff3b5c',
        onConfirm: () => {
          dispatch(deleteVideo(videoId));
          dispatch(resolveVideoReport({
            id: reportId,
            reviewedBy: currentUser?.id || '',
            reviewedByUsername: currentUser?.username || '',
            resolutionNote: 'Video đã bị xóa'
          }));
          setShowConfirmModal(false);
        }
      });
      setShowConfirmModal(true);
    } else {
      setConfirmAction({
        type: 'dismiss-video',
        title: 'Bỏ qua báo cáo video',
        message: 'Bạn có chắc muốn bỏ qua báo cáo này? Báo cáo sẽ được đánh dấu là đã xử lý.',
        confirmText: 'Bỏ qua',
        confirmColor: '#ff3b5c',
        onConfirm: () => {
          dispatch(resolveVideoReport({
            id: reportId,
            reviewedBy: currentUser?.id || '',
            reviewedByUsername: currentUser?.username || '',
            resolutionNote: 'Báo cáo bị bỏ qua'
          }));
          setShowConfirmModal(false);
        }
      });
      setShowConfirmModal(true);
    }
  };

  const handleResolveUserReport = (reportId: string, username: string, shouldWarn: boolean) => {
    if (shouldWarn) {
      setConfirmAction({
        type: 'warn-user',
        title: 'Cảnh báo người dùng',
        message: `Bạn có chắc muốn cảnh báo người dùng ${username}? Người dùng sẽ nhận được 1 cảnh báo.`,
        confirmText: 'Cảnh báo',
        confirmColor: '#ff3b5c',
        onConfirm: () => {
          dispatch(warnUser(username));
          dispatch(resolveUserReport({
            id: reportId,
            reviewedBy: currentUser?.id || '',
            reviewedByUsername: currentUser?.username || '',
            resolutionNote: 'User đã bị cảnh báo'
          }));
          setShowConfirmModal(false);
        }
      });
      setShowConfirmModal(true);
    } else {
      setConfirmAction({
        type: 'dismiss-user',
        title: 'Bỏ qua báo cáo người dùng',
        message: 'Bạn có chắc muốn bỏ qua báo cáo này? Báo cáo sẽ được đánh dấu là đã xử lý.',
        confirmText: 'Bỏ qua',
        confirmColor: '#ff3b5c',
        onConfirm: () => {
          dispatch(resolveUserReport({
            id: reportId,
            reviewedBy: currentUser?.id || '',
            reviewedByUsername: currentUser?.username || '',
            resolutionNote: 'Báo cáo bị bỏ qua'
          }));
          setShowConfirmModal(false);
        }
      });
      setShowConfirmModal(true);
    }
  };

  const handleBanUser = (permanent: boolean) => {
    if (!banUsername) {
      toast.error('Vui lòng nhập tên người dùng!');
      return;
    }
    if (!banReason) {
      toast.error('Vui lòng nhập lý do cấm!');
      return;
    }
    if (permanent) {
      setConfirmAction({
        type: 'ban-permanent',
        title: 'Cấm vĩnh viễn người dùng',
        message: `Bạn có chắc muốn cấm vĩnh viễn người dùng ${banUsername}?`,
        confirmText: 'Cấm vĩnh viễn',
        confirmColor: '#ff3b5c',
        onConfirm: () => {
          dispatch(banUser({ username: banUsername, reason: banReason }));
          toast.success(`Đã cấm vĩnh viễn người dùng ${banUsername}`);
          setBanUsername('');
          setBanDuration('');
          setBanReason('');
          setShowConfirmModal(false);
        }
      });
      setShowConfirmModal(true);
    } else {
      const duration = parseInt(banDuration);
      if (duration > 0) {
        setConfirmAction({
          type: 'ban-temp',
          title: 'Cấm tạm thời người dùng',
          message: `Bạn có chắc muốn cấm người dùng ${banUsername} trong ${duration} ngày?`,
          confirmText: 'Cấm tạm thời',
          confirmColor: '#ff3b5c',
          onConfirm: () => {
            dispatch(banUser({ username: banUsername, duration, reason: banReason }));
            toast.success(`Đã cấm người dùng ${banUsername} trong ${duration} ngày`);
            setBanUsername('');
            setBanDuration('');
            setBanReason('');
            setShowConfirmModal(false);
          }
        });
        setShowConfirmModal(true);
      } else {
        toast.error('Vui lòng nhập thời gian cấm (số ngày dương)!');
      }
    }
  };

  const handleAppeal = (appealId: string, status: 'approved' | 'denied', username?: string) => {
    dispatch(updateAppealStatus({ 
      id: appealId, 
      status,
      reviewedBy: currentUser?.id || '',
      reviewedByUsername: currentUser?.username || '',
      resolutionNote: status === 'approved' ? 'Khiếu nại được chấp nhận' : 'Khiếu nại bị từ chối'
    }));
    if (status === 'approved' && username) {
      dispatch(unbanUser(username));
      dispatch(clearWarnings(username));
      toast.success(`Đã chấp nhận khiếu nại của ${username} và gỡ bỏ các hình phạt`);
    } else {
      toast.info('Đã từ chối khiếu nại');
    }
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
              onClick={() => setActiveTab('video-reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'video-reports'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Flag className={`w-5 h-5 ${activeTab === 'video-reports' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Báo cáo Video</span>
              </div>
              {pendingVideoReports > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white">
                  {pendingVideoReports}
                </div>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('user-reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'user-reports'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${activeTab === 'user-reports' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Báo cáo User</span>
              </div>
              {pendingUserReports > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white">
                  {pendingUserReports}
                </div>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('comments')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'comments'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <MessageSquare className={`w-5 h-5 ${activeTab === 'comments' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Quản lý Bình luận</span>
            </button>

            <button 
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'support'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className={`w-5 h-5 ${activeTab === 'support' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Hỗ trợ</span>
              </div>
              {pendingAppeals > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white">
                  {pendingAppeals}
                </div>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('moderation')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'moderation'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <UserX className={`w-5 h-5 ${activeTab === 'moderation' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Kiểm duyệt</span>
            </button>

            <div className="h-px bg-zinc-900/50 my-3 mx-2" />

            <div className="text-zinc-600 text-xs px-3 mb-2 uppercase tracking-wider">Thống kê</div>
            <div className="px-3 py-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Đã xử lý hôm nay</span>
                <span className="text-white font-medium">{resolvedToday}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Video vi phạm</span>
                <span className="text-[#ff3b5c] font-medium">{violatingVideos}</span>
              </div>
            </div>
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
              {activeTab === 'video-reports' && 'Báo cáo Video'}
              {activeTab === 'user-reports' && 'Báo cáo Người dùng'}
              {activeTab === 'comments' && 'Quản lý Bình luận'}
              {activeTab === 'support' && 'Hỗ trợ Người dùng'}
              {activeTab === 'moderation' && 'Kiểm duyệt & Cấm'}
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
                      <span className="text-xs px-2 py-0.5 bg-[#ff3b5c]/20 text-[#ff3b5c] rounded mt-1 w-fit">
                        Staff
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
                        <div className="w-10 h-10 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center">
                          <Flag className="w-5 h-5 text-[#ff3b5c]" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{pendingVideoReports}</div>
                      <div className="text-sm text-zinc-500">Báo cáo video chờ xử lý</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{pendingUserReports}</div>
                      <div className="text-sm text-zinc-500">Báo cáo user chờ xử lý</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{pendingAppeals}</div>
                      <div className="text-sm text-zinc-500">Khiếu nại chờ xử lý</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{resolvedToday}</div>
                      <div className="text-sm text-zinc-500">Đã xử lý hôm nay</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50 pb-4">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Flag className="w-5 h-5 text-[#ff3b5c]" />
                        Báo cáo Video gần đây
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {videoReports.filter(r => r.status === 'pending').slice(0, 5).map(report => (
                          <div key={report.id} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-white text-sm truncate flex-1">{report.videoTitle}</p>
                              <span className="text-xs text-zinc-500 ml-2">
                                {new Date(report.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">Báo cáo bởi: {report.reportedBy}</p>
                          </div>
                        ))}
                        {videoReports.filter(r => r.status === 'pending').length === 0 && (
                          <p className="text-zinc-600 text-sm text-center py-8">Không có báo cáo nào</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50 pb-4">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-yellow-500" />
                        Người dùng cảnh báo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {allUsers.filter(u => u.warnings > 0 || u.banned).slice(0, 5).map(user => (
                          <div key={user.username} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-white text-sm">{user.username}</p>
                                <div className="flex gap-2 mt-1">
                                  {user.banned && (
                                    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">BANNED</span>
                                  )}
                                  {user.warnings > 0 && (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">{user.warnings} cảnh báo</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => onViewUserProfile(user.username)}
                                className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-8 text-xs"
                              >
                                Xem
                              </Button>
                            </div>
                          </div>
                        ))}
                        {allUsers.filter(u => u.warnings > 0 || u.banned).length === 0 && (
                          <p className="text-zinc-600 text-sm text-center py-8">Không có người dùng nào</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Video Reports Tab */}
            {activeTab === 'video-reports' && (
              <div className="space-y-4">
                {videoReports.filter(r => r.status === 'pending').map(report => {
                  const video = videos.find(v => v.id === report.videoId);
                  return (
                    <Card key={report.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-32 h-20 bg-zinc-900/50 rounded-lg overflow-hidden">
                              {video?.thumbnailUrl && (
                                <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-medium mb-2">{report.videoTitle}</h3>
                            <div className="space-y-1 text-sm mb-4">
                              <p className="text-zinc-400">Báo cáo bởi: <span className="text-white">{report.reportedBy}</span></p>
                              <p className="text-zinc-400">Lý do: <span className="text-[#ff3b5c]">{getReportTypeName(report.reason)}</span></p>
                              <p className="text-zinc-600 text-xs">{new Date(report.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => onVideoClick(report.videoId)}
                                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Xem video
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleResolveVideoReport(report.id, report.videoId, true)}
                                className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xóa video
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleResolveVideoReport(report.id, report.videoId, false)}
                                className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Bỏ qua
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {videoReports.filter(r => r.status === 'pending').length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                      <Flag className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 text-sm">Không có báo cáo video nào</p>
                  </div>
                )}
              </div>
            )}

            {/* User Reports Tab */}
            {activeTab === 'user-reports' && (
              <div className="space-y-4">
                {userReports.filter(r => r.status === 'pending').map(report => (
                  <Card key={report.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-2">Người dùng: {report.reportedUsername}</h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-zinc-400">Báo cáo bởi: <span className="text-white">{report.reportedBy}</span></p>
                            <p className="text-zinc-400">Lý do: <span className="text-[#ff3b5c]">{getReportTypeName(report.reason)}</span></p>
                            <p className="text-zinc-600 text-xs">{new Date(report.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onViewUserProfile(report.reportedUsername)}
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg"
                        >
                          <UserCircle className="w-4 h-4 mr-2" />
                          Xem profile
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolveUserReport(report.id, report.reportedUsername, true)}
                          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30 h-9 rounded-lg"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Cảnh báo
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolveUserReport(report.id, report.reportedUsername, false)}
                          className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Bỏ qua
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {userReports.filter(r => r.status === 'pending').length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 text-sm">Không có báo cáo người dùng nào</p>
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white text-lg">Quản lý Bình luận</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-zinc-600" />
                      </div>
                      <p className="text-zinc-500 text-sm mb-2">Chức năng đang phát triển</p>
                      <p className="text-zinc-600 text-xs">Quản lý bình luận vi phạm và spam sẽ có sớm</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Support Tab */}
            {activeTab === 'support' && (
              <div className="space-y-4">
                {appeals.filter(a => a.status === 'pending').map(appeal => (
                  <Card key={appeal.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-white font-medium mb-2">Người dùng: {appeal.username}</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-zinc-400">Lý do khiếu nại: <span className="text-white">{appeal.reason}</span></p>
                          <p className="text-zinc-600 text-xs">{new Date(appeal.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAppeal(appeal.id, 'approved', appeal.username)}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30 h-9 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Chấp nhận
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAppeal(appeal.id, 'denied')}
                          className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                        >
                          Từ chối
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {appeals.filter(a => a.status === 'pending').length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 text-sm">Không có khiếu nại nào</p>
                  </div>
                )}
              </div>
            )}

            {/* Moderation Tab */}
            {activeTab === 'moderation' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ban User Card */}
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <UserX className="w-5 h-5 text-[#ff3b5c]" />
                        Cấm người dùng
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <Label className="text-zinc-400 mb-2 block text-sm">Tên người dùng</Label>
                        <Input
                          value={banUsername}
                          onChange={(e) => setBanUsername(e.target.value)}
                          className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                          placeholder="Nhập tên người dùng"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 mb-2 block text-sm">Thời gian (ngày)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={banDuration}
                          onChange={(e) => setBanDuration(e.target.value)}
                          className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                          placeholder="Để trống nếu cấm vĩnh viễn"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 mb-2 block text-sm">Lý do</Label>
                        <Input
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                          placeholder="Nhập lý do cấm"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleBanUser(false)}
                          className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border-orange-500/30 flex-1 h-11 rounded-lg"
                        >
                          Cấm tạm thời
                        </Button>
                        <Button
                          onClick={() => handleBanUser(true)}
                          className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 flex-1 h-11 rounded-lg"
                        >
                          Cấm vĩnh viễn
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Status Card */}
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50">
                      <CardTitle className="text-white text-lg">Tổng quan người dùng</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2 pr-4">
                          {allUsers.filter(u => u.role === 'user').map(user => (
                            <div key={user.username} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-white text-sm font-medium">{user.username}</p>
                                  <div className="flex gap-2 mt-1">
                                    {user.banned ? (
                                      <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">BANNED</span>
                                    ) : user.warnings > 0 ? (
                                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">{user.warnings} cảnh báo</span>
                                    ) : (
                                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Tốt</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {user.banned && (
                                    <Button
                                      size="sm"
                                      onClick={() => dispatch(unbanUser(user.username))}
                                      className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-8 text-xs rounded-lg"
                                    >
                                      Gỡ cấm
                                    </Button>
                                  )}
                                  {user.warnings > 0 && (
                                    <Button
                                      size="sm"
                                      onClick={() => dispatch(clearWarnings(user.username))}
                                      className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-8 text-xs rounded-lg"
                                    >
                                      Xóa cảnh báo
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <StaffProfile />
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-900/50 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-zinc-900/50">
              <h3 className="text-white text-xl font-medium">{confirmAction.title}</h3>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-zinc-400 text-sm leading-relaxed">{confirmAction.message}</p>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-11 px-6 rounded-lg"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmAction.onConfirm}
                className="h-11 px-6 rounded-lg"
                style={{
                  backgroundColor: `${confirmAction.confirmColor}20`,
                  color: confirmAction.confirmColor,
                  borderColor: `${confirmAction.confirmColor}30`,
                }}
              >
                {confirmAction.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}