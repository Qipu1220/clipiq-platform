import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { User, Video, ArrowLeft, Plus, Check, Flag, X, Eye, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { subscribeToUser, unsubscribeFromUser } from '../../store/notificationsSlice';
import { fetchUserVideosThunk } from '../../store/videosSlice';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { addUserReport } from '../../store/reportsSlice';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface PublicUserProfileProps {
  username: string;
  onVideoClick: (videoId: string) => void;
  onBack: () => void;
}

export function PublicUserProfile({ username, onVideoClick, onBack }: PublicUserProfileProps) {
  const dispatch = useDispatch();
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  const userVideos = useSelector((state: RootState) => state.videos.userVideos);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('spam');
  const [reportReason, setReportReason] = useState('');

  const user = allUsers.find(u => u.username === username);

  // const userVideos = videos.filter(v => v.uploaderUsername === username); // Removed: using state.videos.userVideos now

  const isSubscribed = currentUser && subscriptions[currentUser.username]?.includes(username);

  useEffect(() => {
    if (username) {
      // @ts-ignore - dispatch type issue
      dispatch(fetchUserVideosThunk(username));
    }
  }, [dispatch, username]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <Button onClick={onBack} variant="outline" className="mb-4 bg-zinc-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <p className="text-white">User not found</p>
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

  const handleReportSubmit = () => {
    dispatch(addUserReport({
      username: username,
      type: reportType,
      reason: reportReason
    }));
    toast.success(`Báo cáo user "@${username}" thành công`);
    setShowReportModal(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <Button onClick={onBack} variant="outline" className="mb-4 bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-20 h-20 rounded-full object-cover border-2"
                  style={{ borderColor: '#ff3b5c' }}
                />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ff3b5c' }}>
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-white text-3xl">
                  {user.displayName || user.username}
                </h1>
                <p className="text-zinc-400 text-sm">@{user.username}</p>
                <div className="flex gap-3 mt-2 text-sm">
                  <span className="text-zinc-400">Role: {user.role}</span>
                  {user.warnings > 0 && (
                    <span className="text-yellow-500">{user.warnings} warnings</span>
                  )}
                  {user.banned && (
                    <span className="text-red-500">BANNED</span>
                  )}
                  {!user.banned && user.warnings === 0 && (
                    <span className="text-green-500">Good standing</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {currentUser && currentUser.username !== username && (
              <div className="flex gap-3">
                <Button
                  onClick={handleSubscribe}
                  className="transition-all duration-300"
                  style={{
                    backgroundColor: isSubscribed ? '#16a34a' : '#ff3b5c',
                    color: 'white',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (isSubscribed) {
                      e.currentTarget.style.backgroundColor = '#15803d';
                    } else {
                      e.currentTarget.style.backgroundColor = '#e6344f';
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
                  onClick={handleReport}
                  className="transition-all duration-300 border-0"
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Báo cáo
                </Button>
              </div>
            )}
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Uploaded Videos ({userVideos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {userVideos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">This user hasn't uploaded any videos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {userVideos.map(video => (
                    <div
                      key={video.id}
                      className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => onVideoClick(video.id)}
                    >
                      <ImageWithFallback
                        src={video.thumbnailUrl || `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=500&fit=crop`}
                        alt={video.title}
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
                            <span>{formatCount(video.likes.length)}</span>
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
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  );
}
