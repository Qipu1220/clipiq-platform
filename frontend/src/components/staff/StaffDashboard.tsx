import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { resolveVideoReport, resolveUserReport, setVideoReports } from '../../store/reportsSlice';
import { warnUser } from '../../store/usersSlice';
import { deleteVideo } from '../../store/videosSlice';
import { toast } from 'sonner';
import { getVideoReportsApi, resolveVideoReportApi, VideoReport, getUserReportsApi, resolveUserReportApi, UserReport, getCommentReportsApi, resolveCommentReportApi, CommentReport } from '../../api/reports';
import { getAllUsersApi, User as ApiUser, deleteVideoApi } from '../../api/admin';
import { StaffLayout } from './StaffLayout';
import { Dashboard } from './Dashboard';
import { VideoReports } from './VideoReports';
import { UserReports } from './UserReports';
import { CommentReports } from './CommentReports';
import { UserManagement } from './UserManagement';
import { StaffProfile } from './StaffProfile';
import { Button } from '../ui/button';

interface StaffDashboardProps {
  onVideoClick: (videoId: string, fromTab?: string) => void;
  onViewUserProfile: (username: string, fromTab?: string) => void;
  initialTab?: string;
  onReviewVideoReport?: (videoId: string) => void;
  children?: React.ReactNode;
}

export function StaffDashboard({ onVideoClick, onViewUserProfile, initialTab, onReviewVideoReport, children }: StaffDashboardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const appeals = useSelector((state: RootState) => state.reports.appeals);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'user-management' | 'profile'>(
    (initialTab as any) || 'dashboard'
  );
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  const [apiVideoReports, setApiVideoReports] = useState<VideoReport[]>([]);
  const [apiUserReports, setApiUserReports] = useState<UserReport[]>([]);
  const [apiCommentReports, setApiCommentReports] = useState<CommentReport[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Confirmation modal for reports only
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

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
        const response = await getAllUsersApi({ page: 1, limit: 100 });
        setApiUsers(response.users);
      } catch (error: any) {
        console.error('❌ Error fetching users:', error);
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
        message: 'Bạn có chắc muốn xóa video này? Video sẽ bị đánh dấu là đã xóa (soft delete).',
        confirmText: 'Xóa video',
        confirmColor: '#ff3b5c',
        onConfirm: async () => {
          try {
            // First delete the video from database (soft delete - status='deleted')
            await deleteVideoApi(videoId);
            // Then resolve the report with special marker
            await resolveVideoReportApi(reportId, 'delete_content', 'Đã xóa video');
            // Update Redux state
            dispatch(deleteVideo(videoId));
            dispatch(resolveVideoReport({
              id: reportId,
              reviewedBy: currentUser?.id || '',
              reviewedByUsername: currentUser?.username || '',
              resolutionNote: 'Đã xóa video'
            }));
            // Refresh reports list
            const [pendingResponse, resolvedResponse] = await Promise.all([
              getVideoReportsApi('pending', 1, 100),
              getVideoReportsApi('resolved', 1, 100)
            ]);
            setApiVideoReports([...pendingResponse.data.reports, ...resolvedResponse.data.reports]);
            toast.success('Đã xóa video và xử lý báo cáo');
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
            await resolveVideoReportApi(reportId, 'dismiss', 'Báo cáo được bỏ qua');
            dispatch(resolveVideoReport({
              id: reportId,
              reviewedBy: currentUser?.id || '',
              reviewedByUsername: currentUser?.username || '',
              resolutionNote: 'Báo cáo được bỏ qua'
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
            await resolveCommentReportApi(reportId, 'dismiss', 'Báo cáo được bỏ qua');
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



  return (
    <>
      <StaffLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingVideoReports={pendingVideoReports}
        pendingUserReports={pendingUserReports}
        pendingCommentReports={pendingCommentReports}
      >
        {children || (
        <>
        {activeTab === 'dashboard' && (
          <Dashboard
            pendingVideoReports={pendingVideoReports}
            pendingUserReports={pendingUserReports}
            pendingCommentReports={pendingCommentReports}
            pendingAppeals={pendingAppeals}
            resolvedToday={resolvedToday}
            apiVideoReports={apiVideoReports}
            apiUserReports={apiUserReports}
            allUsers={allUsers}
            onViewUserProfile={onViewUserProfile}
          />
        )}
        
        {activeTab === 'video-reports' && (
          <VideoReports
            apiVideoReports={apiVideoReports}
            videos={videos}
            onVideoClick={(videoId) => onVideoClick(videoId, 'video-reports')}
            onResolveReport={handleResolveVideoReport}
            getReportTypeName={getReportTypeName}
            onReviewVideoReport={onReviewVideoReport}
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
          />
        )}
        
        {activeTab === 'profile' && (
          <StaffProfile onBack={() => setActiveTab('dashboard')} />
        )}
        </>
        )}
      </StaffLayout>

      {/* Confirmation Modal (for reports only) */}
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
