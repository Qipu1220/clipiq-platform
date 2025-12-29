import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { User, Video, ArrowLeft, Plus, Check, Flag, X, Eye, Heart, Share2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { subscribeToUser, unsubscribeFromUser } from '../../store/notificationsSlice';
import { fetchUserVideosThunk } from '../../store/videosSlice';
import { fetchUserByUsernameThunk } from '../../store/usersSlice';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { addUserReport } from '../../store/reportsSlice';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { reportUserApi } from '../../api/reports';
import { VideoModal } from './VideoModal';

interface PublicUserProfileProps {
  username: string;
  onVideoClick: (videoId: string) => void;
  onBack: () => void;
  isStaffView?: boolean;
  onBanUser?: (userId: string, username: string, reason: string) => void;
  onWarnUser?: (userId: string, username: string, reason: string) => void;
}

export function PublicUserProfile({ username, onVideoClick, onBack, isStaffView = false, onBanUser, onWarnUser }: PublicUserProfileProps) {
  const dispatch = useDispatch();
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  const userVideos = useSelector((state: RootState) => state.videos.userVideos);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('spam');
  const [reportReason, setReportReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [warnReason, setWarnReason] = useState('');
  
  // Video modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  const user = allUsers.find(u => u.username === username);

  // const userVideos = videos.filter(v => v.uploaderUsername === username); // Removed: using state.videos.userVideos now

  const isSubscribed = currentUser && subscriptions[currentUser.username]?.includes(username);

  useEffect(() => {
    if (username) {
      // Always fetch fresh user data when profile is opened
      // @ts-ignore - dispatch type issue
      dispatch(fetchUserByUsernameThunk(username));
      // @ts-ignore  
      dispatch(fetchUserVideosThunk(username));
    }
  }, [dispatch, username]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Loading user profile...</p>
          <Button onClick={onBack} variant="outline" className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  const handleSubscribe = () => {
    if (!currentUser) return;

    if (isSubscribed) {
      dispatch(unsubscribeFromUser({
        follower: currentUser.username,
        following: username,
      }));
    } else {
      dispatch(subscribeToUser({
        follower: currentUser.username,
        following: username,
      }));
    }
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleReportSubmit = async () => {
    try {
      console.log('📝 Reporting user:', username, 'reason:', reportType);
      await reportUserApi(username, reportType, reportReason || undefined);
      
      // Also update Redux for UI consistency
      dispatch(addUserReport({
        username: username,
        type: reportType,
        reason: reportReason
      }));
      
      toast.success(`Báo cáo user "@${username}" thành công`);
      setShowReportModal(false);
      setReportType('spam');
      setReportReason('');
    } catch (error: any) {
      console.error('❌ Error reporting user:', error);
      if (error.response?.status === 409) {
        toast.error('Bạn đã báo cáo người dùng này rồi');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.detail || 'Không thể báo cáo chính mình');
      } else if (error.response?.status === 404) {
        toast.error('Người dùng không tồn tại');
      } else {
        toast.error('Không thể gửi báo cáo. Vui lòng thử lại sau.');
      }
    }
  };

  const formatCount = (count: number | undefined | null) => {
    const safeCount = typeof count === 'number' ? count : 0;
    if (safeCount >= 1000000) return `${(safeCount / 1000000).toFixed(1)}M`;
    if (safeCount >= 1000) return `${(safeCount / 1000).toFixed(1)}K`;
    return safeCount.toString();
  };

  // Calculate stats
  const followingCount = subscriptions[username]?.length || 0;
  const followerCount = Object.values(subscriptions).filter(
    subs => subs.includes(username)
  ).length;
  const totalLikes = userVideos.reduce((sum, video) => sum + (typeof video.likes === 'number' ? video.likes : 0), 0);

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Button onClick={onBack} variant="outline" className="mb-6 bg-zinc-900 text-white border-zinc-800 hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Profile Header - New Layout */}
          <div className="flex gap-8 mb-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="w-16 h-16 text-zinc-500" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-white text-2xl font-medium">{user.displayName || user.username}</h1>
                <span className="text-zinc-500">@{user.username}</span>
                {/* Show warnings only for staff */}
                {currentUser?.role === 'staff' && user.warnings > 0 && (
                  <span className="text-yellow-500 text-sm px-2 py-1 bg-yellow-500/10 rounded border border-yellow-500/30">
                    {user.warnings} cảnh báo
                  </span>
                )}
                {currentUser?.role === 'staff' && user.banned && (
                  <span className="text-red-500 text-sm px-2 py-1 bg-red-500/10 rounded border border-red-500/30">
                    BANNED
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {!isStaffView && currentUser && currentUser.username !== username && (
                <div className="flex gap-3 mb-4">
                  <Button
                    onClick={handleSubscribe}
                    className="text-white px-6 transition-all duration-300"
                    style={{
                      backgroundColor: isSubscribed ? '#16a34a' : '#ff3b5c'
                    }}
                    onMouseEnter={(e) => {
                      if (isSubscribed) {
                        e.currentTarget.style.backgroundColor = '#15803d';
                      } else {
                        e.currentTarget.style.backgroundColor = '#e6315a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isSubscribed) {
                        e.currentTarget.style.backgroundColor = '#16a34a';
                      } else {
                        e.currentTarget.style.backgroundColor = '#ff3b5c';
                      }
                    }}
                  >
                    {isSubscribed ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Đã follow
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800 px-4"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleReport}
                    variant="outline"
                    className="bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800 px-6 transition-all duration-300"
                    style={{ borderColor: '#dc2626', color: '#dc2626' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                      e.currentTarget.style.color = '#dc2626';
                    }}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Báo cáo
                  </Button>
                </div>
              )}

              {/* Staff Ban/Warn Buttons */}
              {isStaffView && currentUser?.role === 'staff' && (
                <div className="flex gap-3 mb-4">
                  <Button
                    onClick={() => setShowWarnModal(true)}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30 px-6"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Cảnh báo
                  </Button>
                  <Button
                    onClick={() => setShowBanModal(true)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 px-6"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cấm
                  </Button>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 mb-4">
                <div className="text-white">
                  <span className="font-medium">{followingCount}</span>
                  <span className="text-zinc-500 ml-1">Đã follow</span>
                </div>
                <div className="text-white">
                  <span className="font-medium">{followerCount}</span>
                  <span className="text-zinc-500 ml-1">Follower</span>
                </div>
                <div className="text-white">
                  <span className="font-medium">{formatCount(totalLikes)}</span>
                  <span className="text-zinc-500 ml-1">Lượt thích</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-zinc-400 text-sm">
                {user.bio || 'Chưa có tiểu sử.'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-zinc-800 mb-6">
            <div className="flex gap-8">
              <button
                className="pb-3 px-1 border-b-2 border-white text-white font-medium"
              >
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span>Video</span>
                </div>
              </button>
            </div>
          </div>

          {/* Videos Grid */}
          {userVideos.length === 0 ? (
            <div className="text-center py-20">
              <Video className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Chưa có video nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {userVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => {
                    // Open video modal instead of navigating
                    setSelectedVideoIndex(index);
                    setShowVideoModal(true);
                  }}
                >
                  <ImageWithFallback
                    src={video.thumbnailUrl && video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=500&fit=crop`}
                    alt={video.title}
                    videoSrc={video.videoUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                  {/* Video info overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Eye className="w-4 h-4" />
                        <span>{formatCount(video.views)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Heart className="w-4 h-4" />
                        <span>{formatCount(typeof video.likes === 'number' ? video.likes : 0)}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {video.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ban Modal - UserManagement style */}
          {showBanModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-zinc-900/50 rounded-xl w-full max-w-md shadow-2xl">
                <div className="px-6 py-3 border-b border-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#ff3b5c]/20 flex items-center justify-center">
                        <X className="w-5 h-5 text-[#ff3b5c]" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium text-lg">Cấm người dùng</h3>
                        <p className="text-zinc-500 text-xs">@{username}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowBanModal(false)} className="text-zinc-500 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="text-zinc-400 mb-2 block text-sm">Lý do cấm (tùy chọn)</label>
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Có thể để trống hoặc nhập lý do..."
                      className="w-full bg-zinc-900/50 border border-zinc-800/50 text-white p-3 rounded-lg focus:border-[#ff3b5c] focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
                  <Button onClick={() => setShowBanModal(false)} className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg">
                    Hủy
                  </Button>
                  <Button
                    onClick={() => {
                      if (onBanUser && user) {
                        onBanUser(user.id, username, banReason);
                        setShowBanModal(false);
                        setBanReason('');
                      }
                    }}
                    className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white h-10 rounded-lg"
                  >
                    Xác nhận cấm
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Warn Modal - UserManagement style */}
          {showWarnModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-yellow-500/30 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="px-6 py-3 border-b border-zinc-900/50 bg-yellow-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <Flag className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium text-lg">Cảnh báo người dùng</h3>
                        <p className="text-zinc-500 text-xs">@{username}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowWarnModal(false)} className="text-zinc-500 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="text-zinc-400 mb-2 block text-sm">Lý do cảnh báo (tùy chọn)</label>
                    <textarea
                      value={warnReason}
                      onChange={(e) => setWarnReason(e.target.value)}
                      placeholder="Có thể để trống hoặc nhập lý do..."
                      className="w-full bg-zinc-900/50 border border-zinc-800/50 text-white p-3 rounded-lg focus:border-yellow-500 focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 mb-2 block text-sm">Thông tin cảnh báo</label>
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
                      {user && (() => {
                        const currentWarnings = user.warnings || 0;
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
                  <Button
                    onClick={() => {
                      if (onWarnUser && user) {
                        onWarnUser(user.id, username, warnReason);
                        setShowWarnModal(false);
                        setWarnReason('');
                      }
                    }}
                    className="bg-yellow-500 hover:bg-yellow-500/90 text-white h-10 rounded-lg"
                  >
                    Xác nhận cảnh báo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
              <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                      <Flag className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-white text-xl">Báo cáo người dùng</h2>
                  </div>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-400 text-sm mb-1">Bạn đang báo cáo:</p>
                    <p className="text-white">@{username}</p>
                  </div>

                  <div>
                    <label className="block text-white text-sm mb-2">Loại vi phạm:</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:border-red-500 focus:outline-none transition-colors"
                    >
                      <option value="spam">Spam hoặc quảng cáo</option>
                      <option value="harassment">Quấy rối hoặc bắt nạt</option>
                      <option value="hate">Ngôn từ gây thù ghét</option>
                      <option value="violence">Bạo lực hoặc nguy hiểm</option>
                      <option value="nudity">Nội dung không phù hợp</option>
                      <option value="copyright">Vi phạm bản quyền</option>
                      <option value="impersonation">Mạo danh</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white text-sm mb-2">Chi tiết (không bắt buộc):</label>
                    <textarea
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Mô tả thêm về vấn đề bạn gặp phải..."
                      className="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:border-red-500 focus:outline-none transition-colors resize-none"
                      rows={4}
                    />
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-500 text-xs">
                      ⚠️ Báo cáo sai sự thật có thể bị xử phạt. Staff sẽ xem xét trong 24-48 giờ.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-zinc-800">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 bg-zinc-800 text-white py-3 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleReportSubmit}
                    className="flex-1 text-white py-3 rounded-lg transition-all"
                    style={{ backgroundColor: '#dc2626' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  >
                    Gửi báo cáo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Video Modal */}
          <VideoModal
            videos={userVideos}
            initialIndex={selectedVideoIndex}
            isOpen={showVideoModal}
            onClose={() => setShowVideoModal(false)}
            onUserClick={(clickedUsername) => {
              setShowVideoModal(false);
              if (clickedUsername !== username) {
                onVideoClick(clickedUsername); // Navigate to different user
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}