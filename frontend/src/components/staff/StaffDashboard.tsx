import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { resolveVideoReport, resolveUserReport, setVideoReports } from '../../store/reportsSlice';
import { warnUser } from '../../store/usersSlice';
import { deleteVideo } from '../../store/videosSlice';
import { toast } from 'sonner';
import { getVideoReportsApi, resolveVideoReportApi, VideoReport, getUserReportsApi, resolveUserReportApi, UserReport, getCommentReportsApi, resolveCommentReportApi, CommentReport } from '../../api/reports';
import { fetchAllUsersApi, banUserApi, warnUserApi, deleteVideoApi, User as ApiUser } from '../../api/admin';
import { StaffLayout } from './StaffLayout';
import { Dashboard } from './Dashboard';
import { VideoReports } from './VideoReports';
import { UserReports } from './UserReports';
import { CommentReports } from './CommentReports';
import { UserManagement } from './UserManagement';
import { StaffProfile } from './StaffProfile';
import { BanUserModal } from '../shared/BanUserModal';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { X, AlertTriangle, UserX } from 'lucide-react';

interface StaffDashboardProps {
  onVideoClick: (videoId: string) => void;
  onViewUserProfile: (username: string) => void;
}

export function StaffDashboard({ onVideoClick, onViewUserProfile }: StaffDashboardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const appeals = useSelector((state: RootState) => state.reports.appeals);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'user-management' | 'profile'>('dashboard');
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  const [apiVideoReports, setApiVideoReports] = useState<VideoReport[]>([]);
  const [apiUserReports, setApiUserReports] = useState<UserReport[]>([]);
  const [apiCommentReports, setApiCommentReports] = useState<CommentReport[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUsername, setBanUsername] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [banReason, setBanReason] = useState('');
  
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnUsername, setWarnUsername] = useState('');
  const [warnReason, setWarnReason] = useState('');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  // Use API users only - no fallback to mock data
  const displayUsers = apiUsers.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    banned: u.banned,
    banReason: u.banReason,
    banExpiry: u.banExpiry,
    warnings: u.warnings,
    videoCount: u.videoCount
  }));

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

  // Fetch data
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [pendingResponse, resolvedResponse] = await Promise.all([
          getVideoReportsApi('pending', 1, 100),
          getVideoReportsApi('resolved', 1, 100)
        ]);
        const allReports = [...pendingResponse.data.reports, ...resolvedResponse.data.reports];
        setApiVideoReports(allReports);
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
        if (error.response?.status !== 403) {
          toast.error('Không thể tải danh sách báo cáo');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchUserReports = async () => {
      try {
        const [pendingResponse, resolvedResponse] = await Promise.all([
          getUserReportsApi('pending', 1, 100),
          getUserReportsApi('resolved', 1, 100)
        ]);
        setApiUserReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
      } catch (error: any) {
        console.error('❌ Error fetching user reports:', error);
      }
    };

    const fetchCommentReports = async () => {
      try {
        const [pendingResponse, resolvedResponse] = await Promise.all([
          getCommentReportsApi('pending', 1, 100),
          getCommentReportsApi('resolved', 1, 100)
        ]);
        setApiCommentReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
      } catch (error: any) {
        console.error('❌ Error fetching comment reports:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        console.log('🔍 Staff: Fetching users...');
        const response = await fetchAllUsersApi({ page: 1, limit: 100 });
        console.log('✅ Staff: Users fetched:', response.data.users.length, 'users');
        console.log('📊 Staff: First user:', response.data.users[0]);
        setApiUsers(response.data.users);
      } catch (error: any) {
        console.error('❌ Error fetching users:', error);
        console.error('Error response:', error.response?.data);
      }
    };

    fetchReports();
    fetchUserReports();
    fetchCommentReports();
    fetchUsers();

    const interval = setInterval(() => {
      fetchReports();
      fetchUserReports();
      fetchCommentReports();
      fetchUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // Calculate stats
  const pendingVideoReports = apiVideoReports.filter(r => r.status === 'pending').length;
  const pendingUserReports = apiUserReports.filter(r => r.status === 'pending').length;
  const pendingCommentReports = apiCommentReports.filter(r => r.status === 'pending').length;
  const pendingAppeals = appeals.filter(a => a.status === 'pending').length;
  const resolvedToday = [
    ...apiVideoReports.map(r => ({ status: r.status, timestamp: new Date(r.created_at).getTime() })),
    ...apiUserReports.map(r => ({ status: r.status, timestamp: new Date(r.created_at).getTime() }))
  ].filter(r => r.status === 'resolved' && new Date(r.timestamp).toDateString() === new Date().toDateString()).length;

  // Handlers
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
            await resolveVideoReportApi(reportId, 'delete_content', 'Video đã bị xóa vì vi phạm quy định');
            dispatch(deleteVideo(videoId));
            dispatch(resolveVideoReport({
              id: reportId,
              reviewedBy: currentUser?.id || '',
              reviewedByUsername: currentUser?.username || '',
              resolutionNote: 'Video đã bị xóa'
            }));
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getVideoReportsApi('pending', 1, 100),
              getVideoReportsApi('resolved', 1, 100)
            ]);
            setApiVideoReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
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
        message: 'Bạn có chắc muốn bỏ qua báo cáo này?',
        confirmText: 'Bỏ qua',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            await resolveVideoReportApi(reportId, 'dismiss', 'Báo cáo không có căn cứ');
            dispatch(resolveVideoReport({
              id: reportId,
              reviewedBy: currentUser?.id || '',
              reviewedByUsername: currentUser?.username || '',
              resolutionNote: 'Báo cáo bị bỏ qua'
            }));
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getVideoReportsApi('pending', 1, 100),
              getVideoReportsApi('resolved', 1, 100)
            ]);
            setApiVideoReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            toast.success('Đã bỏ qua báo cáo');
            setShowConfirmModal(false);
          } catch (error: any) {
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
        message: `Bạn có chắc muốn cảnh báo người dùng ${username}?`,
        confirmText: 'Cảnh báo',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            dispatch(warnUser(username));
            await resolveUserReportApi(reportId, 'warn_user', 'User đã bị cảnh báo');
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getUserReportsApi('pending', 1, 100),
              getUserReportsApi('resolved', 1, 100)
            ]);
            setApiUserReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            toast.success('Đã cảnh báo người dùng');
            setShowConfirmModal(false);
          } catch (error) {
            toast.error('Không thể xử lý báo cáo');
          }
        }
      });
      setShowConfirmModal(true);
    } else {
      setConfirmAction({
        type: 'dismiss-user',
        title: 'Bỏ qua báo cáo người dùng',
        message: 'Bạn có chắc muốn bỏ qua báo cáo này?',
        confirmText: 'Bỏ qua',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            await resolveUserReportApi(reportId, 'dismiss', 'Báo cáo bị bỏ qua');
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getUserReportsApi('pending', 1, 100),
              getUserReportsApi('resolved', 1, 100)
            ]);
            setApiUserReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            toast.success('Đã bỏ qua báo cáo');
            setShowConfirmModal(false);
          } catch (error) {
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
        message: 'Bạn có chắc muốn xóa bình luận này?',
        confirmText: 'Xóa bình luận',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            await resolveCommentReportApi(reportId, 'delete_content', 'Bình luận đã bị xóa vì vi phạm quy định');
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getCommentReportsApi('pending', 1, 100),
              getCommentReportsApi('resolved', 1, 100)
            ]);
            setApiCommentReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            toast.success('Đã xóa bình luận và resolve báo cáo');
            setShowConfirmModal(false);
          } catch (error: any) {
            toast.error('Không thể xử lý báo cáo. Vui lòng thử lại.');
          }
        }
      });
      setShowConfirmModal(true);
    } else {
      setConfirmAction({
        type: 'dismiss-video',
        title: 'Bỏ qua báo cáo bình luận',
        message: 'Bạn có chắc muốn bỏ qua báo cáo này?',
        confirmText: 'Bỏ qua',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            await resolveCommentReportApi(reportId, 'dismiss', 'Báo cáo không có căn cứ');
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getCommentReportsApi('pending', 1, 100),
              getCommentReportsApi('resolved', 1, 100)
            ]);
            setApiCommentReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            toast.success('Đã bỏ qua báo cáo');
            setShowConfirmModal(false);
          } catch (error: any) {
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
    
    const durationValue = banDuration ? parseInt(banDuration, 10) : undefined;
    if (durationValue !== undefined && (Number.isNaN(durationValue) || durationValue <= 0)) {
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
          toast.success(isPermanent ? `Đã cấm vĩnh viễn người dùng ${banUsername}` : `Đã cấm người dùng ${banUsername} trong ${durationValue} ngày`);
          const response = await fetchAllUsersApi({ page: 1, limit: 100 });
          setApiUsers(response.data.users);
          setBanUsername('');
          setBanDuration('');
          setBanReason('');
          setShowConfirmModal(false);
          setShowBanModal(false);
        } catch (error: any) {
          if (error.response?.status === 404) {
            toast.error('Không tìm thấy người dùng');
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
    
    const user = displayUsers.find(u => u.username === warnUsername);
    const currentWarnings = user?.warnings || 0;
    const durationValue = currentWarnings === 0 ? 30 : currentWarnings === 1 ? 60 : 90;
    const warningLevel = currentWarnings + 1;
    
    setConfirmAction({
      type: 'warn-user',
      title: 'Cảnh báo người dùng',
      message: `Bạn có chắc muốn cảnh báo người dùng ${warnUsername}?\n\nĐây sẽ là cảnh báo lần ${warningLevel}.\nThời hạn: ${durationValue} ngày (tự động xóa sau ${durationValue} ngày không vi phạm).`,
      confirmText: 'Cảnh báo',
      confirmColor: '#eab308',
      onConfirm: async () => {
        try {
          await warnUserApi(warnUsername, warnReason, durationValue);
          toast.success(`Đã cảnh báo người dùng ${warnUsername}`);
          const response = await fetchAllUsersApi({ page: 1, limit: 100 });
          setApiUsers(response.data.users);
          setWarnUsername('');
          setWarnReason('');
          setShowConfirmModal(false);
          setShowWarnModal(false);
        } catch (error: any) {
          if (error.response?.status === 404) {
            toast.error('Không tìm thấy người dùng');
          } else {
            toast.error('Không thể cảnh báo người dùng. Vui lòng thử lại.');
          }
        }
      }
    });
    setShowConfirmModal(true);
  };

  return (
    <>
      <StaffLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingVideoReports={pendingVideoReports}
        pendingUserReports={pendingUserReports}
        pendingCommentReports={pendingCommentReports}
      >
        {activeTab === 'dashboard' && (
          <Dashboard
            pendingVideoReports={pendingVideoReports}
            pendingUserReports={pendingUserReports}
            pendingCommentReports={pendingCommentReports}
            pendingAppeals={pendingAppeals}
            resolvedToday={resolvedToday}
            apiVideoReports={apiVideoReports}
            apiUserReports={apiUserReports}
            allUsers={displayUsers.map(u => ({
              username: u.username,
              warnings: u.warnings,
              banned: u.banned
            }))}
            onViewUserProfile={onViewUserProfile}
          />
        )}
        
        {activeTab === 'video-reports' && (
          <VideoReports
            apiVideoReports={apiVideoReports}
            videos={videos}
            onVideoClick={onVideoClick}
            onResolveReport={handleResolveVideoReport}
            getReportTypeName={getReportTypeName}
          />
        )}
        
        {activeTab === 'user-reports' && (
          <UserReports
            apiUserReports={apiUserReports}
            onViewUserProfile={onViewUserProfile}
            onResolveReport={handleResolveUserReport}
            getReportTypeName={getReportTypeName}
          />
        )}
        
        {activeTab === 'comment-reports' && (
          <CommentReports
            apiCommentReports={apiCommentReports}
            onResolveReport={handleResolveCommentReport}
            getReportTypeName={getReportTypeName}
          />
        )}
        
        {activeTab === 'user-management' && (
          <UserManagement
            displayUsers={displayUsers}
            videos={videos}
            onViewUserProfile={onViewUserProfile}
            onBanUser={(username) => {
              setBanUsername(username);
              setBanReason('');
              setBanDuration('');
              setShowBanModal(true);
            }}
            onWarnUser={(username) => {
              setWarnUsername(username);
              setWarnReason('');
              setShowWarnModal(true);
            }}
            setShowConfirmModal={setShowConfirmModal}
            setConfirmAction={setConfirmAction}
            setApiUsers={setApiUsers}
          />
        )}
        
        {activeTab === 'profile' && (
          <StaffProfile />
        )}
      </StaffLayout>

      {/* Ban User Modal */}
      <BanUserModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        username={banUsername}
        banDuration={banDuration}
        setBanDuration={setBanDuration}
        banReason={banReason}
        setBanReason={setBanReason}
        onConfirm={handleBanUser}
      />

      {/* Warn User Modal */}
      {showWarnModal && warnUsername && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/30 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-3 border-b border-zinc-900/50 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg">Cảnh báo người dùng</h3>
                    <p className="text-zinc-500 text-xs">@{warnUsername}</p>
                  </div>
                </div>
                <button onClick={() => setShowWarnModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Lý do cảnh báo</Label>
                <Input
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white focus:border-yellow-500 h-10"
                  placeholder="Vi phạm quy định cộng đồng..."
                />
                {warnReason.length > 500 && (
                  <p className="text-red-400 text-xs mt-1">Nội dung cảnh báo không được quá 500 ký tự</p>
                )}
              </div>
              
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Thông tin cảnh báo</Label>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
                  {(() => {
                    const user = displayUsers.find(u => u.username === warnUsername);
                    const currentWarnings = user?.warnings || 0;
                    const warningLevel = currentWarnings + 1;
                    const duration = currentWarnings === 0 ? 30 : currentWarnings === 1 ? 60 : 90;
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-zinc-400 text-sm">Cảnh báo lần:</span>
                          <span className="text-white font-semibold">{warningLevel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">Thời hạn:</span>
                          <span className="text-yellow-400 font-semibold">{duration} ngày</span>
                        </div>
                        <p className="text-zinc-600 text-xs mt-2">Tự động xóa sau {duration} ngày không vi phạm</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button onClick={() => setShowWarnModal(false)} className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg">
                Hủy
              </Button>
              <Button onClick={handleWarnUser} className="bg-yellow-500 hover:bg-yellow-500/90 text-white h-10 rounded-lg">
                Xác nhận cảnh báo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900/50 rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-900/50">
              <h3 className="text-white font-medium text-lg">{confirmAction.title}</h3>
            </div>

            <div className="p-5">
              <p className="text-zinc-400 whitespace-pre-line">{confirmAction.message}</p>
            </div>

            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button onClick={() => setShowConfirmModal(false)} className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg">
                Hủy
              </Button>
              <Button
                onClick={confirmAction.onConfirm}
                style={{ backgroundColor: confirmAction.confirmColor }}
                className="hover:opacity-90 text-white h-10 rounded-lg"
              >
                {confirmAction.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
