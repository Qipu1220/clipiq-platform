import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { resolveVideoReport, resolveUserReport, updateAppealStatus, setVideoReports } from '../../store/reportsSlice';
import { banUser, unbanUser, warnUser, clearWarnings } from '../../store/usersSlice';
import { deleteVideo } from '../../store/videosSlice';
import { logoutThunk } from '../../store/authSlice';
import { 
  Shield, AlertTriangle, Flag, MessageSquare, UserX, Trash2, CheckCircle, 
  Eye, UserCircle, Play, Search, Home, BarChart3, Users, Video, User,
  ChevronDown, LogOut, FileText, Clock, TrendingUp, ArrowLeft, X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { StaffProfile } from './StaffProfile';
import { toast } from 'sonner';
import { getVideoReportsApi, resolveVideoReportApi, VideoReport, getUserReportsApi, resolveUserReportApi, UserReport, getCommentReportsApi, resolveCommentReportApi, CommentReport } from '../../api/reports';
import { getAllUsersApi, banUserApi, unbanUserApi, warnUserApi, clearWarningsApi, User as ApiUser } from '../../api/admin';

interface StaffDashboardProps {
  onVideoClick: (videoId: string) => void;
  onViewUserProfile: (username: string) => void;
}

export function StaffDashboard({ onVideoClick, onViewUserProfile }: StaffDashboardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const videoReports = useSelector((state: RootState) => state.reports.videoReports);
  const userReports = useSelector((state: RootState) => state.reports.userReports);
  const appeals = useSelector((state: RootState) => state.reports.appeals);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  
  // API Users state
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  
  // Use API users if available, otherwise fall back to Redux store
  const displayUsers = apiUsers.length > 0 ? apiUsers.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    banned: u.banned,
    banReason: u.banReason,
    banExpiry: u.banExpiry,
    warnings: u.warnings,
    videoCount: u.stats.videos,
    followerCount: u.stats.followers
  })) : allUsers;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'comments' | 'support' | 'user-management' | 'profile'>('dashboard');
  const [banUsername, setBanUsername] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiVideoReports, setApiVideoReports] = useState<VideoReport[]>([]);
  const [videoReportsSubTab, setVideoReportsSubTab] = useState<'pending' | 'resolved'>('pending');
  const [apiUserReports, setApiUserReports] = useState<UserReport[]>([]);
  const [userReportsSubTab, setUserReportsSubTab] = useState<'pending' | 'resolved'>('pending');
  const [apiCommentReports, setApiCommentReports] = useState<CommentReport[]>([]);
  const [commentReportsSubTab, setCommentReportsSubTab] = useState<'pending' | 'resolved'>('pending');
  const [showBanModal, setShowBanModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnUsername, setWarnUsername] = useState('');
  const [warnReason, setWarnReason] = useState('');
  const [warnDuration, setWarnDuration] = useState('7'); // Default 7 days
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [previousTab, setPreviousTab] = useState<'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'comments' | 'support' | 'user-management' | 'profile'>('dashboard');
  
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

  // Fetch video reports from API
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        console.log('🔄 Fetching video reports for staff...');
        // Fetch both pending and resolved reports
        const [pendingResponse, resolvedResponse] = await Promise.all([
          getVideoReportsApi('pending', 1, 100),
          getVideoReportsApi('resolved', 1, 100)
        ]);
        const allReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
        console.log('✅ Fetched reports:', allReports);
        setApiVideoReports(allReports);
        
        // Also update Redux store for compatibility
        dispatch(setVideoReports(allReports.map((r: VideoReport) => ({
          id: r.id,
          videoId: r.video_id,
          videoTitle: r.video_title || 'Unknown',
          reportedBy: r.reporter_username || 'Unknown',
          reportedByUsername: r.reporter_username || 'Unknown',
          reason: r.reason,
          timestamp: new Date(r.created_at).getTime(),
          status: r.status as 'pending' | 'resolved'
        }))));
        
      } catch (error: any) {
        console.error('❌ Error fetching reports:', error);
        if (error.response?.status === 403) {
          toast.error('Bạn không có quyền xem báo cáo');
        } else {
          toast.error('Không thể tải danh sách báo cáo');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchReports, 30000);
    
    return () => clearInterval(interval);
  }, [dispatch]);

  // Fetch user reports from API
  useEffect(() => {
    const fetchUserReports = async () => {
      try {
        console.log('🔄 Fetching user reports for staff...');
        const [pendingResponse, resolvedResponse] = await Promise.all([
          getUserReportsApi('pending', 1, 100),
          getUserReportsApi('resolved', 1, 100)
        ]);
        const allUserReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
        console.log('✅ Fetched user reports:', allUserReports);
        setApiUserReports(allUserReports);
      } catch (error: any) {
        console.error('❌ Error fetching user reports:', error);
        if (error.response?.status === 403) {
          toast.error('Bạn không có quyền xem báo cáo user');
        } else {
          toast.error('Không thể tải danh sách báo cáo user');
        }
      }
    };

    fetchUserReports();
    const interval = setInterval(fetchUserReports, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch comment reports from API
  useEffect(() => {
    const fetchCommentReports = async () => {
      try {
        console.log('🔄 Fetching comment reports for staff...');
        const [pendingResponse, resolvedResponse] = await Promise.all([
          getCommentReportsApi('pending', 1, 100),
          getCommentReportsApi('resolved', 1, 100)
        ]);
        const allCommentReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
        console.log('✅ Fetched comment reports:', allCommentReports);
        setApiCommentReports(allCommentReports);
      } catch (error: any) {
        console.error('❌ Error fetching comment reports:', error);
        if (error.response?.status === 403) {
          toast.error('Bạn không có quyền xem báo cáo comment');
        } else {
          toast.error('Không thể tải danh sách báo cáo comment');
        }
      }
    };

    fetchCommentReports();
    const interval = setInterval(fetchCommentReports, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('🔄 Fetching users for staff...');
        const response = await getAllUsersApi({ page: 1, limit: 100 });
        console.log('✅ Fetched users:', response.users);
        setApiUsers(response.users);
      } catch (error: any) {
        console.error('❌ Error fetching users:', error);
        if (error.response?.status === 403) {
          toast.error('Bạn không có quyền xem danh sách người dùng');
        } else {
          toast.error('Không thể tải danh sách người dùng');
        }
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats - Dùng apiVideoReports, apiUserReports và apiCommentReports từ API thay vì Redux
  const pendingVideoReports = apiVideoReports.filter((r: VideoReport) => r.status === 'pending').length;
  const pendingUserReports = apiUserReports.filter((r: UserReport) => r.status === 'pending').length;
  const pendingCommentReports = apiCommentReports.filter((r: CommentReport) => r.status === 'pending').length;
  const pendingAppeals = appeals.filter(a => a.status === 'pending').length;
  const resolvedToday = [
    ...apiVideoReports.map((r: VideoReport) => ({ status: r.status, timestamp: new Date(r.created_at).getTime() })),
    ...apiUserReports.map((r: UserReport) => ({ status: r.status, timestamp: new Date(r.created_at).getTime() }))
  ].filter(
    r => r.status === 'resolved' && new Date(r.timestamp).toDateString() === new Date().toDateString()
  ).length;
  const violatingVideos = videos.filter(v => 
    apiVideoReports.some((r: VideoReport) => r.video_id === v.id && r.status === 'pending')
  ).length;

  const handleResolveVideoReport = (reportId: string, videoId: string, shouldDelete: boolean) => {
    if (shouldDelete) {
      setConfirmAction({
        type: 'delete-video',
        title: 'Xóa video',
        message: 'Bạn có chắc muốn xóa video này? Video sẽ bị xóa vĩnh viễn.',
        confirmText: 'Xóa video',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            console.log('🗑️ Deleting video and resolving report:', reportId);
            // Gọi API resolve với action delete_content
            await resolveVideoReportApi(reportId, 'delete_content', 'Video đã bị xóa vì vi phạm quy định');
            
            // Update local state
            dispatch(deleteVideo(videoId));
            dispatch(resolveVideoReport({
              id: reportId,
              reviewedBy: currentUser?.id || '',
              reviewedByUsername: currentUser?.username || '',
              resolutionNote: 'Video đã bị xóa'
            }));
            
            // Refresh reports list
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getVideoReportsApi('pending', 1, 100),
              getVideoReportsApi('resolved', 1, 100)
            ]);
            const allReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
            setApiVideoReports(allReports);
            
            toast.success('Đã xóa video và resolve báo cáo');
            setShowConfirmModal(false);
          } catch (error: any) {
            console.error('❌ Error resolving report:', error);
            toast.error('Không thể xử lý báo cáo. Vui lòng thử lại.');
          }
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
        onConfirm: async () => {
          try {
            console.log('✅ Dismissing report:', reportId);
            // Gọi API resolve với action dismiss
            await resolveVideoReportApi(reportId, 'dismiss', 'Báo cáo không có căn cứ');
            
            // Update local state
            dispatch(resolveVideoReport({
              id: reportId,
              reviewedBy: currentUser?.id || '',
              reviewedByUsername: currentUser?.username || '',
              resolutionNote: 'Báo cáo bị bỏ qua'
            }));
            
            // Refresh reports list
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getVideoReportsApi('pending', 1, 100),
              getVideoReportsApi('resolved', 1, 100)
            ]);
            const allReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
            setApiVideoReports(allReports);
            
            toast.success('Đã bỏ qua báo cáo');
            setShowConfirmModal(false);
          } catch (error: any) {
            console.error('❌ Error resolving report:', error);
            toast.error('Không thể xử lý báo cáo. Vui lòng thử lại.');
          }
        }
      });
      setShowConfirmModal(true);
    }
  };

  const handleResolveUserReport = async (reportId: string, username: string, shouldWarn: boolean) => {
    if (shouldWarn) {
      setConfirmAction({
        type: 'warn-user',
        title: 'Cảnh báo người dùng',
        message: `Bạn có chắc muốn cảnh báo người dùng ${username}? Người dùng sẽ nhận được 1 cảnh báo.`,
        confirmText: 'Cảnh báo',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            dispatch(warnUser(username));
            await resolveUserReportApi(reportId, 'warn_user', 'User đã bị cảnh báo');
            
            // Refresh data
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getUserReportsApi('pending', 1, 100),
              getUserReportsApi('resolved', 1, 100)
            ]);
            setApiUserReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            
            toast.success('Đã cảnh báo người dùng');
            setShowConfirmModal(false);
          } catch (error) {
            console.error('Failed to resolve user report:', error);
            toast.error('Không thể xử lý báo cáo');
          }
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
        onConfirm: async () => {
          try {
            await resolveUserReportApi(reportId, 'dismiss', 'Báo cáo bị bỏ qua');
            
            // Refresh data
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getUserReportsApi('pending', 1, 100),
              getUserReportsApi('resolved', 1, 100)
            ]);
            setApiUserReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            
            toast.success('Đã bỏ qua báo cáo');
            setShowConfirmModal(false);
          } catch (error) {
            console.error('Failed to resolve user report:', error);
            toast.error('Không thể xử lý báo cáo');
          }
        }
      });
      setShowConfirmModal(true);
    }
  };

  const handleResolveCommentReport = (reportId: string, commentId: string, shouldDelete: boolean) => {
    if (shouldDelete) {
      setConfirmAction({
        type: 'delete-video',
        title: 'Xóa bình luận',
        message: 'Bạn có chắc muốn xóa bình luận này? Bình luận sẽ bị xóa vĩnh viễn.',
        confirmText: 'Xóa bình luận',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            console.log('🗑️ Deleting comment and resolving report:', reportId);
            await resolveCommentReportApi(reportId, 'delete_content', 'Bình luận đã bị xóa vì vi phạm quy định');
            
            // Refresh reports list
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getCommentReportsApi('pending', 1, 100),
              getCommentReportsApi('resolved', 1, 100)
            ]);
            const allReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
            setApiCommentReports(allReports);
            
            toast.success('Đã xóa bình luận và resolve báo cáo');
            setShowConfirmModal(false);
          } catch (error: any) {
            console.error('❌ Error resolving comment report:', error);
            toast.error('Không thể xử lý báo cáo. Vui lòng thử lại.');
          }
        }
      });
      setShowConfirmModal(true);
    } else {
      setConfirmAction({
        type: 'dismiss-video',
        title: 'Bỏ qua báo cáo bình luận',
        message: 'Bạn có chắc muốn bỏ qua báo cáo này? Báo cáo sẽ được đánh dấu là đã xử lý.',
        confirmText: 'Bỏ qua',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            console.log('✅ Dismissing comment report:', reportId);
            await resolveCommentReportApi(reportId, 'dismiss', 'Báo cáo không có căn cứ');
            
            // Refresh reports list
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getCommentReportsApi('pending', 1, 100),
              getCommentReportsApi('resolved', 1, 100)
            ]);
            const allReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
            setApiCommentReports(allReports);
            
            toast.success('Đã bỏ qua báo cáo');
            setShowConfirmModal(false);
          } catch (error: any) {
            console.error('❌ Error resolving comment report:', error);
            toast.error('Không thể xử lý báo cáo. Vui lòng thử lại.');
          }
        }
      });
      setShowConfirmModal(true);
    }
  };

  const handleBanUser = async () => {
    if (!banUsername) {
      toast.error('Vui lòng nhập tên người dùng!');
      return;
    }
    if (!banReason) {
      toast.error('Vui lòng nhập lý do cấm!');
      return;
    }
    
    const durationValue = banDuration ? parseInt(banDuration, 10) : null;
    if (durationValue !== null && (Number.isNaN(durationValue) || durationValue <= 0)) {
      toast.error('Thời hạn cấm phải là số ngày hợp lệ!');
      return;
    }
    const isPermanent = !durationValue;
    
    setConfirmAction({
      type: isPermanent ? 'ban-permanent' : 'ban-temp',
      title: isPermanent ? 'Cấm vĩnh viễn người dùng' : 'Cấm tạm thời người dùng',
      message: isPermanent 
        ? `Bạn có chắc muốn cấm vĩnh viễn người dùng ${banUsername}?`
        : `Bạn có chắc muốn cấm người dùng ${banUsername} trong ${durationValue} ngày?`,
      confirmText: isPermanent ? 'Cấm vĩnh viễn' : 'Cấm tạm thời',
      confirmColor: '#ff3b5c',
      onConfirm: async () => {
        try {
          await banUserApi(banUsername, banReason, durationValue);
          
          if (isPermanent) {
            toast.success(`Đã cấm vĩnh viễn người dùng ${banUsername}`);
          } else {
            toast.success(`Đã cấm người dùng ${banUsername} trong ${durationValue} ngày`);
          }
          
          // Refresh users list
          const response = await getAllUsersApi({ page: 1, limit: 100 });
          setApiUsers(response.users);
          
          setBanUsername('');
          setBanDuration('');
          setBanReason('');
          setShowConfirmModal(false);
          setShowBanModal(false);
        } catch (error: any) {
          console.error('❌ Error banning user:', error);
          console.error('Error response:', error.response?.data);
          if (error.response?.status === 404) {
            toast.error('Không tìm thấy người dùng');
          } else if (error.response?.status === 400) {
            const errorData = error.response?.data;
            const validationErrors = errorData?.errors;
            console.log('Validation errors array:', validationErrors);
            console.log('Validation errors detailed:', JSON.stringify(validationErrors, null, 2));
            
            if (validationErrors && validationErrors.length > 0) {
              // Show all validation errors
              const errorMessages = validationErrors.map((err: any) => `${err.path}: ${err.msg}`).join(', ');
              console.log('Formatted error messages:', errorMessages);
              toast.error(`Lỗi validation: ${errorMessages}`);
            } else {
              const errorMsg = errorData?.message || errorData?.detail || 'Lỗi xác thực dữ liệu';
              toast.error(errorMsg);
            }
          } else {
            toast.error('Không thể cấm người dùng. Vui lòng thử lại.');
          }
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleWarnUser = async () => {
    if (!warnUsername) {
      toast.error('Vui lòng nhập tên người dùng!');
      return;
    }
    if (!warnReason) {
      toast.error('Vui lòng nhập lý do cảnh báo!');
      return;
    }
    
    const durationValue = warnDuration ? parseInt(warnDuration, 10) : 7;
    
    setConfirmAction({
      type: 'warn-user',
      title: 'Cảnh báo người dùng',
      message: `Bạn có chắc muốn cảnh báo người dùng ${warnUsername}? Cảnh báo sẽ được ghi nhận trong hồ sơ của họ trong ${durationValue} ngày.`,
      confirmText: 'Cảnh báo',
      confirmColor: '#eab308',
      onConfirm: async () => {
        try {
          await warnUserApi(warnUsername, warnReason, durationValue);
          toast.success(`Đã cảnh báo người dùng ${warnUsername}`);
          
          // Refresh users list
          const response = await getAllUsersApi({ page: 1, limit: 100 });
          setApiUsers(response.users);
          
          setWarnUsername('');
          setWarnReason('');
          setWarnDuration('7');
          setShowConfirmModal(false);
          setShowWarnModal(false);
        } catch (error: any) {
          console.error('❌ Error warning user:', error);
          console.error('Error response:', error.response?.data);
          if (error.response?.status === 404) {
            toast.error('Không tìm thấy người dùng');
          } else if (error.response?.status === 400) {
            const errorData = error.response?.data;
            const validationErrors = errorData?.errors;
            console.log('Validation errors:', validationErrors);
            
            if (validationErrors && validationErrors.length > 0) {
              // Show all validation errors
              const errorMessages = validationErrors.map((err: any) => err.msg).join(', ');
              toast.error(`Lỗi: ${errorMessages}`);
            } else {
              const errorMsg = errorData?.message || errorData?.detail || 'Lỗi xác thực dữ liệu';
              toast.error(errorMsg);
            }
          } else {
            toast.error('Không thể cảnh báo người dùng. Vui lòng thử lại.');
          }
        }
      }
    });
    setShowConfirmModal(true);
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
              onClick={() => setActiveTab('comment-reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'comment-reports'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className={`w-5 h-5 ${activeTab === 'comment-reports' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Báo cáo Bình luận</span>
              </div>
              {pendingCommentReports > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white">
                  {pendingCommentReports}
                </div>
              )}
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
              onClick={() => setActiveTab('user-management')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'user-management'
                  ? 'bg-zinc-900/40 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
              }`}
            >
              <Users className={`w-5 h-5 ${activeTab === 'user-management' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Quản lý User</span>
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
              {activeTab === 'user-management' && 'Quản lý User'}
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
                      dispatch(logoutThunk());
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
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-purple-500" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{pendingCommentReports}</div>
                      <div className="text-sm text-zinc-500">Báo cáo comment chờ xử lý</div>
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
                        {apiVideoReports.filter((r: VideoReport) => r.status === 'pending').slice(0, 5).map((report: VideoReport) => (
                          <div key={report.id} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-white text-sm truncate flex-1">{report.video_title || 'Unknown'}</p>
                              <span className="text-xs text-zinc-500 ml-2">
                                {new Date(report.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">Báo cáo bởi: {report.reporter_username || 'Unknown'}</p>
                          </div>
                        ))}
                        {apiVideoReports.filter((r: VideoReport) => r.status === 'pending').length === 0 && (
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
                                onClick={() => {
                                  setPreviousTab(activeTab);
                                  onViewUserProfile(user.username);
                                }}
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
                {/* Sub-tabs for Video Reports */}
                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={() => setVideoReportsSubTab('pending')}
                    className={`h-10 px-6 rounded-lg transition-all ${
                      videoReportsSubTab === 'pending'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Chưa xử lý ({apiVideoReports.filter((r: VideoReport) => r.status === 'pending').length})
                  </Button>
                  <Button
                    onClick={() => setVideoReportsSubTab('resolved')}
                    className={`h-10 px-6 rounded-lg transition-all ${
                      videoReportsSubTab === 'resolved'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Đã xử lý ({apiVideoReports.filter((r: VideoReport) => r.status === 'resolved').length})
                  </Button>
                </div>

                {/* Reports List */}
                {apiVideoReports.filter((r: VideoReport) => r.status === videoReportsSubTab).map((report: VideoReport) => {
                  const video = videos.find(v => v.id === report.video_id);
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
                            <h3 className="text-white font-medium mb-2">{report.video_title || 'Unknown'}</h3>
                            <div className="space-y-1 text-sm mb-4">
                              <p className="text-zinc-400">Báo cáo bởi: <span className="text-white">{report.reporter_username || 'Unknown'}</span></p>
                              <p className="text-zinc-400">Lý do: <span className="text-[#ff3b5c]">{getReportTypeName(report.reason)}</span></p>
                              <p className="text-zinc-600 text-xs">{new Date(report.created_at).toLocaleString()}</p>
                              {report.status === 'resolved' && report.resolution_note && (
                                <p className="text-green-400 text-xs mt-2">✓ {report.resolution_note}</p>
                              )}
                              {report.status === 'resolved' && report.reviewed_at && (
                                <p className="text-zinc-600 text-xs">Xử lý lúc: {new Date(report.reviewed_at).toLocaleString()}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => onVideoClick(report.video_id)}
                                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Xem video
                              </Button>
                              {report.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleResolveVideoReport(report.id, report.video_id, true)}
                                    className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Xóa video
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleResolveVideoReport(report.id, report.video_id, false)}
                                    className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Bỏ qua
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {apiVideoReports.filter((r: VideoReport) => r.status === videoReportsSubTab).length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                      {videoReportsSubTab === 'pending' ? (
                        <Flag className="w-8 h-8 text-zinc-600" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-zinc-600" />
                      )}
                    </div>
                    <p className="text-zinc-500 text-sm">
                      {videoReportsSubTab === 'pending' 
                        ? 'Không có báo cáo chưa xử lý' 
                        : 'Không có báo cáo đã xử lý'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* User Reports Tab */}
            {activeTab === 'user-reports' && (
              <div className="space-y-4">
                {/* Sub-tabs for User Reports */}
                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={() => setUserReportsSubTab('pending')}
                    className={`h-10 px-6 rounded-lg transition-all ${
                      userReportsSubTab === 'pending'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Chưa xử lý ({apiUserReports.filter((r: UserReport) => r.status === 'pending').length})
                  </Button>
                  <Button
                    onClick={() => setUserReportsSubTab('resolved')}
                    className={`h-10 px-6 rounded-lg transition-all ${
                      userReportsSubTab === 'resolved'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Đã xử lý ({apiUserReports.filter((r: UserReport) => r.status === 'resolved').length})
                  </Button>
                </div>

                {/* Reports List */}
                {apiUserReports.filter((r: UserReport) => r.status === userReportsSubTab).map((report: UserReport) => (
                  <Card key={report.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-2">Người dùng: {report.reported_username || 'Unknown'}</h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-zinc-400">Báo cáo bởi: <span className="text-white">{report.reporter_username || 'Unknown'}</span></p>
                            <p className="text-zinc-400">Lý do: <span className="text-[#ff3b5c]">{getReportTypeName(report.reason)}</span></p>
                            <p className="text-zinc-600 text-xs">{new Date(report.created_at).toLocaleString('vi-VN')}</p>
                            {report.status === 'resolved' && report.resolution_note && (
                              <p className="text-green-400 text-xs mt-2">✓ {report.resolution_note}</p>
                            )}
                            {report.status === 'resolved' && report.reviewed_at && (
                              <p className="text-zinc-600 text-xs">Xử lý lúc: {new Date(report.reviewed_at).toLocaleString('vi-VN')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setPreviousTab(activeTab);
                            onViewUserProfile(report.reported_username || '');
                          }}
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg"
                        >
                          <UserCircle className="w-4 h-4 mr-2" />
                          Xem profile
                        </Button>
                        {report.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleResolveUserReport(report.id, report.reported_username || '', true)}
                              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30 h-9 rounded-lg"
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Cảnh báo
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleResolveUserReport(report.id, report.reported_username || '', false)}
                              className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Bỏ qua
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {apiUserReports.filter((r: UserReport) => r.status === userReportsSubTab).length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                      {userReportsSubTab === 'pending' ? (
                        <AlertTriangle className="w-8 h-8 text-zinc-600" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-zinc-600" />
                      )}
                    </div>
                    <p className="text-zinc-500 text-sm">
                      {userReportsSubTab === 'pending' 
                        ? 'Không có báo cáo chưa xử lý' 
                        : 'Không có báo cáo đã xử lý'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comment Reports Tab */}
            {activeTab === 'comment-reports' && (
              <div className="space-y-4">
                {/* Sub-tabs for Comment Reports */}
                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={() => setCommentReportsSubTab('pending')}
                    className={`h-10 px-6 rounded-lg transition-all ${
                      commentReportsSubTab === 'pending'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chưa xử lý ({apiCommentReports.filter((r: CommentReport) => r.status === 'pending').length})
                  </Button>
                  <Button
                    onClick={() => setCommentReportsSubTab('resolved')}
                    className={`h-10 px-6 rounded-lg transition-all ${
                      commentReportsSubTab === 'resolved'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Đã xử lý ({apiCommentReports.filter((r: CommentReport) => r.status === 'resolved').length})
                  </Button>
                </div>

                {/* Reports List */}
                {apiCommentReports.filter((r: CommentReport) => r.status === commentReportsSubTab).map((report: CommentReport) => (
                  <Card key={report.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Comment Content */}
                        <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                          <p className="text-zinc-400 text-xs mb-2">Nội dung bình luận:</p>
                          <p className="text-white text-sm">{report.comment_text || 'Bình luận đã bị xóa'}</p>
                        </div>

                        {/* Report Details */}
                        <div className="flex-1">
                          <div className="space-y-1 text-sm mb-4">
                            <p className="text-zinc-400">Bình luận bởi: <span className="text-white">{report.commenter_username || 'Unknown'}</span></p>
                            <p className="text-zinc-400">Báo cáo bởi: <span className="text-white">{report.reporter_username || 'Unknown'}</span></p>
                            <p className="text-zinc-400">Lý do: <span className="text-[#ff3b5c]">{getReportTypeName(report.reason)}</span></p>
                            <p className="text-zinc-600 text-xs">{new Date(report.created_at).toLocaleString('vi-VN')}</p>
                            {report.status === 'resolved' && report.resolution_note && (
                              <p className="text-green-400 text-xs mt-2">✓ {report.resolution_note}</p>
                            )}
                            {report.status === 'resolved' && report.reviewed_at && (
                              <p className="text-zinc-600 text-xs">Xử lý lúc: {new Date(report.reviewed_at).toLocaleString('vi-VN')}</p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleResolveCommentReport(report.id, report.comment_id, true)}
                                  className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Xóa bình luận
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleResolveCommentReport(report.id, report.comment_id, false)}
                                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Bỏ qua
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {apiCommentReports.filter((r: CommentReport) => r.status === commentReportsSubTab).length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                      {commentReportsSubTab === 'pending' ? (
                        <MessageSquare className="w-8 h-8 text-zinc-600" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-zinc-600" />
                      )}
                    </div>
                    <p className="text-zinc-500 text-sm">
                      {commentReportsSubTab === 'pending' 
                        ? 'Không có báo cáo chưa xử lý' 
                        : 'Không có báo cáo đã xử lý'}
                    </p>
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

            {/* User Management Tab */}
            {activeTab === 'user-management' && (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => u.role === 'user').length}</div>
                      <div className="text-sm text-zinc-500">Tổng users</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <UserX className="w-5 h-5 text-red-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => u.banned).length}</div>
                      <div className="text-sm text-zinc-500">Đang bị cấm</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => u.warnings > 0 && !u.banned).length}</div>
                      <div className="text-sm text-zinc-500">Có cảnh báo</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => !u.banned && u.warnings === 0 && u.role === 'user').length}</div>
                      <div className="text-sm text-zinc-500">Tình trạng tốt</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800/50 text-white pl-13 pr-4 h-12 rounded-lg focus:border-[#ff3b5c]"
                    placeholder="Tìm kiếm theo username hoặc display name..."
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSearchQuery('')}
                    className={`h-10 px-6 rounded-lg transition-colors ${
                      searchQuery === ''
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Tất cả ({displayUsers.filter(u => u.role === 'user').length})
                  </Button>
                  <Button
                    onClick={() => setSearchQuery('banned')}
                    className={`h-10 px-6 rounded-lg transition-colors ${
                      searchQuery === 'banned'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Bị cấm ({displayUsers.filter(u => u.banned).length})
                  </Button>
                  <Button
                    onClick={() => setSearchQuery('warned')}
                    className={`h-10 px-6 rounded-lg transition-colors ${
                      searchQuery === 'warned'
                        ? 'bg-[#ff3b5c] text-white'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Cảnh báo ({displayUsers.filter(u => u.warnings > 0 && !u.banned).length})
                  </Button>
                </div>

                {/* Users List */}
                <div className="space-y-3">
                  {displayUsers
                    .filter(u => u.role === 'user')
                    .filter(u => {
                      if (searchQuery === 'banned') return u.banned;
                      if (searchQuery === 'warned') return u.warnings > 0 && !u.banned;
                      return true;
                    })
                    .filter(u => {
                      if (!userSearchQuery) return true;
                      const search = userSearchQuery.toLowerCase();
                      return u.username.toLowerCase().includes(search) || 
                             u.displayName?.toLowerCase().includes(search);
                    })
                    .map(user => (
                      <Card key={user.username} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden hover:border-zinc-800/80 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            {/* User Info */}
                            <div className="flex items-start gap-4 flex-1">
                              {/* Avatar */}
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ff3b5c] to-purple-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xl font-bold">
                                  {user.displayName?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                                </span>
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-white font-medium text-lg">{user.displayName || user.username}</h3>
                                  {user.banned && (
                                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-md font-medium">BANNED</span>
                                  )}
                                  {!user.banned && user.warnings > 0 && (
                                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-md font-medium">{user.warnings} cảnh báo</span>
                                  )}
                                  {!user.banned && user.warnings === 0 && (
                                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-md font-medium">Tốt</span>
                                  )}
                                </div>
                                <p className="text-zinc-400 text-sm mb-3">@{user.username}</p>
                                
                                {/* Stats */}
                                <div className="flex gap-4 text-xs">
                                  <div className="flex items-center gap-1 text-zinc-500">
                                    <Video className="w-3.5 h-3.5" />
                                    <span>{videos.filter(v => v.uploaderUsername === user.username).length} videos</span>
                                  </div>
                                </div>

                                {/* Ban Info */}
                                {user.banned && user.banReason && (
                                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-red-400 text-xs">
                                      <span className="font-medium">Lý do cấm:</span> {user.banReason}
                                    </p>
                                    {user.banExpiry && (
                                      <p className="text-red-400/70 text-xs mt-1">
                                        Hết hạn: {new Date(user.banExpiry).toLocaleString('vi-VN')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPreviousTab(activeTab);
                                  onViewUserProfile(user.username);
                                }}
                                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg whitespace-nowrap"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Xem profile
                              </Button>
                              
                              {user.banned ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setConfirmAction({
                                      type: 'ban-permanent',
                                      title: 'Gỡ cấm người dùng',
                                      message: `Bạn có chắc muốn gỡ cấm cho người dùng ${user.username}? Họ sẽ có thể đăng nhập và sử dụng hệ thống trở lại.`,
                                      confirmText: 'Gỡ cấm',
                                      confirmColor: '#22c55e',
                                      onConfirm: async () => {
                                        try {
                                          await unbanUserApi(user.username);
                                          toast.success(`Đã gỡ cấm người dùng ${user.username}`);
                                          
                                          // Refresh users list
                                          const response = await getAllUsersApi({ page: 1, limit: 100 });
                                          setApiUsers(response.users);
                                          
                                          setShowConfirmModal(false);
                                        } catch (error: any) {
                                          console.error('❌ Error unbanning user:', error);
                                          if (error.response?.status === 404) {
                                            toast.error('Không tìm thấy người dùng');
                                          } else if (error.response?.status === 400) {
                                            toast.error('Người dùng không bị cấm');
                                          } else {
                                            toast.error('Không thể gỡ cấm người dùng. Vui lòng thử lại.');
                                          }
                                        }
                                      }
                                    });
                                    setShowConfirmModal(true);
                                  }}
                                  className="bg-green-500/20 hover:bg-green-500/40 text-green-400 border-green-500/30 h-9 rounded-lg whitespace-nowrap transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Gỡ cấm
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setBanUsername(user.username);
                                      setBanReason('');
                                      setBanDuration('');
                                      setShowBanModal(true);
                                    }}
                                    className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border-red-500/30 h-9 rounded-lg whitespace-nowrap transition-colors"
                                  >
                                    <UserX className="w-4 h-4 mr-2" />
                                    Cấm
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setWarnUsername(user.username);
                                      setWarnReason('');
                                      setWarnDuration('7');
                                      setShowWarnModal(true);
                                    }}
                                    className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 border-yellow-500/30 h-9 rounded-lg whitespace-nowrap transition-colors"
                                  >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Cảnh báo
                                  </Button>
                                </>
                              )}
                              
                              {user.warnings > 0 && (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await clearWarningsApi(user.username);
                                      toast.success(`Đã xóa cảnh báo của ${user.username}`);
                                      
                                      // Refresh users list
                                      const response = await getAllUsersApi({ page: 1, limit: 100 });
                                      setApiUsers(response.users);
                                    } catch (error: any) {
                                      console.error('❌ Error clearing warnings:', error);
                                      if (error.response?.status === 404) {
                                        toast.error('Không tìm thấy người dùng');
                                      } else if (error.response?.status === 400) {
                                        toast.error('Người dùng không có cảnh báo');
                                      } else {
                                        toast.error('Không thể xóa cảnh báo. Vui lòng thử lại.');
                                      }
                                    }
                                  }}
                                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg whitespace-nowrap"
                                >
                                  Xóa cảnh báo
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  
                  {allUsers.filter(u => u.role === 'user').filter(u => {
                    if (searchQuery === 'banned') return u.banned;
                    if (searchQuery === 'warned') return u.warnings > 0 && !u.banned;
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-24">
                      <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-zinc-600" />
                      </div>
                      <p className="text-zinc-500 text-sm">Không có người dùng nào</p>
                    </div>
                  )}
                </div>


              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <Button
                  onClick={() => setActiveTab(previousTab)}
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
                <StaffProfile />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ban User Modal */}
      {showBanModal && banUsername && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-[#ff3b5c]/30 rounded-xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-900/50 bg-[#ff3b5c]/5">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-lg font-medium flex items-center gap-2">
                  <UserX className="w-5 h-5 text-[#ff3b5c]" />
                  Cấm: <span className="text-[#ff3b5c]">{banUsername}</span>
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowBanModal(false);
                    setBanUsername('');
                    setBanReason('');
                    setBanDuration('');
                  }}
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-8 w-8 p-0 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div>
                <Label className="text-zinc-400 mb-1.5 block text-sm">Lý do cấm *</Label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white h-10 rounded-lg focus:border-[#ff3b5c]"
                  placeholder="Nhập lý do cấm (tối thiểu 3 ký tự)..."
                />
                {banReason && banReason.length < 3 && (
                  <p className="text-red-400 text-xs mt-1">Lý do cấm phải có ít nhất 3 ký tự</p>
                )}
                {banReason && banReason.length > 500 && (
                  <p className="text-red-400 text-xs mt-1">Lý do cấm không được quá 500 ký tự</p>
                )}
              </div>
              
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Thời hạn cấm (ngày)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white h-10 rounded-lg focus:border-[#ff3b5c]"
                  placeholder="Để trống để cấm vĩnh viễn"
                />
                <p className="text-zinc-600 text-xs mt-1">Để trống = vĩnh viễn, nhập số ngày = tạm thời (1-365 ngày)</p>
                {banDuration && (parseInt(banDuration) < 1 || parseInt(banDuration) > 365) && (
                  <p className="text-red-400 text-xs mt-1">Thời hạn cấm phải từ 1 đến 365 ngày</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowBanModal(false);
                  setBanUsername('');
                  setBanReason('');
                  setBanDuration('');
                }}
                className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 px-5 rounded-lg"
              >
                Hủy
              </Button>
              <Button
                onClick={handleBanUser}
                disabled={
                  !banReason || 
                  banReason.length < 3 || 
                  banReason.length > 500 ||
                  (banDuration && (parseInt(banDuration) < 1 || parseInt(banDuration) > 365))
                }
                className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/40 text-[#ff3b5c] border-[#ff3b5c]/30 h-10 px-5 rounded-lg disabled:opacity-50 transition-colors"
              >
                <UserX className="w-4 h-4 mr-2" />
                {banDuration ? `Cấm ${banDuration} ngày` : 'Cấm vĩnh viễn'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warn User Modal */}
      {showWarnModal && warnUsername && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/30 rounded-xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-900/50 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-lg font-medium flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Cảnh báo: <span className="text-yellow-500">{warnUsername}</span>
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowWarnModal(false);
                    setWarnUsername('');
                    setWarnReason('');
                    setWarnDuration('7');
                  }}
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-8 w-8 p-0 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div>
                <Label className="text-zinc-400 mb-1.5 block text-sm">Nội dung cảnh báo *</Label>
                <Input
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white h-10 rounded-lg focus:border-yellow-500"
                  placeholder="Nhập nội dung cảnh báo (tối thiểu 3 ký tự)..."
                />
                {warnReason && warnReason.length < 3 && (
                  <p className="text-red-400 text-xs mt-1">Nội dung cảnh báo phải có ít nhất 3 ký tự</p>
                )}
                {warnReason && warnReason.length > 500 && (
                  <p className="text-red-400 text-xs mt-1">Nội dung cảnh báo không được quá 500 ký tự</p>
                )}
              </div>
              
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Thời hạn cảnh báo (ngày)</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={warnDuration}
                  onChange={(e) => setWarnDuration(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white h-10 rounded-lg focus:border-yellow-500"
                  placeholder="Số ngày cảnh báo có hiệu lực"
                />
                <p className="text-zinc-600 text-xs mt-1">Mặc định 7 ngày (1-90 ngày), sau đó cảnh báo sẽ hết hiệu lực</p>
                {warnDuration && (parseInt(warnDuration) < 1 || parseInt(warnDuration) > 90) && (
                  <p className="text-red-400 text-xs mt-1">Thời hạn cảnh báo phải từ 1 đến 90 ngày</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowWarnModal(false);
                  setWarnUsername('');
                  setWarnReason('');
                  setWarnDuration('7');
                }}
                className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 px-5 rounded-lg"
              >
                Hủy
              </Button>
              <Button
                onClick={handleWarnUser}
                disabled={
                  !warnReason || 
                  warnReason.length < 3 || 
                  warnReason.length > 500 ||
                  (warnDuration && (parseInt(warnDuration) < 1 || parseInt(warnDuration) > 90))
                }
                className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 border-yellow-500/30 h-10 px-5 rounded-lg disabled:opacity-50 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Gửi cảnh báo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900/50 rounded-xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-zinc-900/50">
              <h3 className="text-white text-xl font-medium">{confirmAction.title}</h3>
            </div>

            {/* Body */}
            <div className="p-5">
              <p className="text-zinc-400 text-sm leading-relaxed">{confirmAction.message}</p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 px-5 rounded-lg"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmAction.onConfirm}
                className="h-10 px-5 rounded-lg transition-all hover:opacity-80"
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