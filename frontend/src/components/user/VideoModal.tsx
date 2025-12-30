import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  Heart, Share2, Bookmark, MessageCircle, X, User, Copy, Loader2, Flag, AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  toggleLikeVideoThunk,
  toggleSaveVideoThunk,
  fetchCommentsThunk,
  addCommentThunk,
  deleteCommentThunk
} from '../../store/videosSlice';
import { subscribeToUser, unsubscribeFromUser } from '../../store/notificationsSlice';
import { reportVideoApi, reportCommentApi } from '../../api/reports';
import { copyVideoLink, shareVideoApi, generateShareUrl } from '../../api/share';
import { toast } from 'sonner';

interface Video {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  uploaderUsername: string;
  likes?: number;
  views?: number;
  shares?: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface VideoModalProps {
  videos: Video[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onUserClick?: (username: string) => void;
}

export function VideoModal({ videos, initialIndex, isOpen, onClose, onUserClick }: VideoModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const users = useSelector((state: RootState) => state.users.allUsers);
  const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);
  const currentVideoComments = useSelector((state: RootState) => state.videos.currentVideoComments);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [bookmarkAnimation, setBookmarkAnimation] = useState(false);
  const [followAnimation, setFollowAnimation] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localVideoState, setLocalVideoState] = useState<{ isLiked: boolean; isSaved: boolean; likes: number }>({
    isLiked: false,
    isSaved: false,
    likes: 0
  });

  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('spam');
  const [reportReason, setReportReason] = useState('');
  const [showVideoReportConfirm, setShowVideoReportConfirm] = useState(false);

  // Comment report states
  const [showCommentReportModal, setShowCommentReportModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [commentReportReason, setCommentReportReason] = useState('');
  const [showCommentReportConfirm, setShowCommentReportConfirm] = useState(false);

  const selectedVideo = videos[currentIndex];

  // Update local state only when video ID changes (not on prop updates)
  useEffect(() => {
    if (selectedVideo) {
      setLocalVideoState({
        isLiked: selectedVideo.isLiked || false,
        isSaved: selectedVideo.isSaved || false,
        likes: selectedVideo.likes || 0
      });
    }
  }, [selectedVideo?.id]); // Only depend on ID to prevent reset during optimistic updates

  // Reset index when modal opens with new initialIndex
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // Fetch comments when video changes
  useEffect(() => {
    if (isOpen && selectedVideo) {
      dispatch(fetchCommentsThunk(selectedVideo.id));
    }
  }, [selectedVideo?.id, isOpen, dispatch]);

  // Handle wheel event to change videos
  useEffect(() => {
    if (!isOpen || videos.length === 0) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.sidebar-scroll')) return;

      e.preventDefault();

      if (e.deltaY > 0) {
        const nextIndex = (currentIndex + 1) % videos.length;
        setCurrentIndex(nextIndex);
      } else if (e.deltaY < 0) {
        const prevIndex = (currentIndex - 1 + videos.length) % videos.length;
        setCurrentIndex(prevIndex);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isOpen, currentIndex, videos.length]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.share-menu-container')) {
          setShowShareMenu(false);
        }
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  if (!isOpen || !selectedVideo) return null;

  const uploaderInfo = users.find(u => u.username === selectedVideo.uploaderUsername);
  const isSubscribed = currentUser && subscriptions[currentUser.username]?.includes(selectedVideo.uploaderUsername);

  const formatCount = (count: number | undefined) => {
    if (!count || typeof count !== 'number') return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleLike = async () => {
    if (!selectedVideo || !currentUser || isLiking) return;

    setIsLiking(true);
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 300);

    // Get fresh state from Redux before calling API
    const videoFromRedux = videos.find((v: any) => v.id === selectedVideo.id);
    const currentIsLiked = !!(videoFromRedux?.isLiked || localVideoState.isLiked);

    // Optimistic update
    setLocalVideoState(prev => ({
      ...prev,
      isLiked: !currentIsLiked,
      likes: currentIsLiked ? prev.likes - 1 : prev.likes + 1
    }));

    try {
      await dispatch(toggleLikeVideoThunk({
        videoId: selectedVideo.id,
        isLiked: currentIsLiked
      })).unwrap();
    } catch (error) {
      // Revert on error
      setLocalVideoState(prev => ({
        ...prev,
        isLiked: currentIsLiked,
        likes: currentIsLiked ? prev.likes + 1 : prev.likes - 1
      }));
      toast.error('Không thể thích video');
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVideo || !currentUser || isSaving) return;

    setIsSaving(true);
    setBookmarkAnimation(true);
    setTimeout(() => setBookmarkAnimation(false), 300);

    // Optimistic update
    const wasSaved = localVideoState.isSaved;
    setLocalVideoState(prev => ({
      ...prev,
      isSaved: !wasSaved
    }));

    try {
      await dispatch(toggleSaveVideoThunk(selectedVideo.id)).unwrap();
      toast.success(wasSaved ? 'Đã bỏ lưu video' : 'Đã lưu video');
    } catch (error) {
      // Revert on error
      setLocalVideoState(prev => ({
        ...prev,
        isSaved: wasSaved
      }));
      toast.error('Không thể lưu video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !selectedVideo || !currentUser) return;

    try {
      await dispatch(addCommentThunk({
        videoId: selectedVideo.id,
        text: commentText.trim()
      })).unwrap();
      setCommentText('');
      toast.success('Đã thêm bình luận');
    } catch (error) {
      toast.error('Không thể thêm bình luận');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedVideo) return;

    try {
      await dispatch(deleteCommentThunk({ videoId: selectedVideo.id, commentId })).unwrap();
      toast.success('Đã xóa bình luận');
    } catch (error) {
      toast.error('Không thể xóa bình luận');
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser || !selectedVideo || currentUser.username === selectedVideo.uploaderUsername) return;

    setFollowAnimation(true);
    setTimeout(() => setFollowAnimation(false), 500);

    if (isSubscribed) {
      dispatch(unsubscribeFromUser({
        follower: currentUser.username,
        following: selectedVideo.uploaderUsername,
      }));
    } else {
      dispatch(subscribeToUser({
        follower: currentUser.username,
        following: selectedVideo.uploaderUsername,
      }));
    }
  };

  // Copy comment text helper
  const handleCopyComment = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('Đã copy bình luận'))
        .catch(() => {
          // Fallback
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            toast.success('Đã copy bình luận');
          } catch (err) {
            toast.error('Không thể copy bình luận');
          }
          document.body.removeChild(textArea);
        });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Đã copy bình luận');
      } catch (err) {
        toast.error('Không thể copy bình luận');
      }
      document.body.removeChild(textArea);
    }
  };

  // Handle video report
  const handleVideoReport = async () => {
    if (!selectedVideo || !currentUser) return;
    try {
      // Map frontend reportType to backend valid reasons
      const reasonMap: { [key: string]: string } = {
        'spam': 'spam',
        'inappropriate': 'other',
        'violence': 'violence',
        'harassment': 'harassment',
        'copyright': 'copyright',
        'other': 'other'
      };
      const validReason = reasonMap[reportType] || 'other';
      await reportVideoApi(selectedVideo.id, validReason, reportReason);
      setShowReportModal(false);
      setShowVideoReportConfirm(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.';
      toast.error(errorMessage);
    }
  };

  // Handle comment report
  const handleCommentReport = async () => {
    if (!selectedComment || !currentUser) return;
    try {
      await reportCommentApi(selectedComment.id, `other: ${commentReportReason}`, commentReportReason);
      setShowCommentReportModal(false);
      setShowCommentReportConfirm(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.';
      toast.error(errorMessage);
    }
  };

  // Handle user click - close modal and navigate
  const handleUserClick = (username: string) => {
    handleClose();
    onUserClick?.(username);
  };

  const handleCopyLink = async () => {
    if (!selectedVideo) return;
    try {
      const token = localStorage.getItem('accessToken');
      await copyVideoLink(selectedVideo.id, token || undefined);
      toast.success('Đã copy link video');
      setShowShareMenu(false);
    } catch (error) {
      toast.error('Không thể copy link');
    }
  };

  const handleShareToPlatform = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'telegram') => {
    if (!selectedVideo) return;
    try {
      const url = generateShareUrl(selectedVideo.id, platform);
      window.open(url, '_blank', 'width=600,height=400');
      const token = localStorage.getItem('accessToken');
      await shareVideoApi(selectedVideo.id, platform, token || undefined);
      setShowShareMenu(false);
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleClose = () => {
    setShowShareMenu(false);
    setCommentText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex">
      <div className="w-full h-full flex">
        {/* Video Player Section */}
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              key={selectedVideo.id}
              src={selectedVideo.videoUrl}
              poster={selectedVideo.thumbnailUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Info & Comments Section */}
        <div className="w-[420px] flex-shrink-0 bg-zinc-900 flex flex-col overflow-hidden h-full">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white transition-colors bg-black/50 rounded-full p-2 hover:bg-black/70"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 pt-2 h-full sidebar-scroll">
            <div className="p-4 space-y-4 pb-20">
              {/* User Info */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    handleClose();
                    onUserClick?.(selectedVideo.uploaderUsername);
                  }}
                >
                  {uploaderInfo?.avatarUrl ? (
                    <img
                      src={uploaderInfo.avatarUrl}
                      alt={selectedVideo.uploaderUsername}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-zinc-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {uploaderInfo?.displayName || selectedVideo.uploaderUsername}
                    </p>
                    <p className="text-zinc-500 text-sm">@{selectedVideo.uploaderUsername}</p>
                  </div>
                </div>

                {currentUser?.username !== selectedVideo.uploaderUsername && (
                  <Button
                    onClick={handleSubscribe}
                    size="sm"
                    className={`${isSubscribed
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      : 'bg-[#ff3b5c] hover:bg-[#e6344f] text-white'
                      } transition-all ${followAnimation ? 'scale-110' : 'scale-100'}`}
                  >
                    {isSubscribed ? 'Đang follow' : 'Follow'}
                  </Button>
                )}
              </div>

              {/* Video Info */}
              <div>
                <h4 className="text-white font-medium mb-2">{selectedVideo.title}</h4>
                <p className="text-zinc-400 text-sm">{selectedVideo.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 py-2 border-y border-zinc-800">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-all ${localVideoState.isLiked ? 'text-[#ff3b5c]' : 'text-zinc-400 hover:text-white'
                    } ${likeAnimation ? 'scale-125' : 'scale-100'}`}
                >
                  <Heart className={`w-5 h-5 ${localVideoState.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{formatCount(localVideoState.likes)}</span>
                </button>

                <button
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{currentVideoComments.length || 0}</span>
                </button>

                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 transition-all ${localVideoState.isSaved ? 'text-yellow-500' : 'text-zinc-400 hover:text-white'
                    } ${bookmarkAnimation ? 'scale-125' : 'scale-100'}`}
                >
                  <Bookmark className={`w-5 h-5 ${localVideoState.isSaved ? 'fill-current' : ''}`} />
                </button>

                {/* Share Button with DropdownMenu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span className="text-sm font-medium">{formatCount(selectedVideo.shares)}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-white">
                    <DropdownMenuItem onClick={handleCopyLink} className="hover:bg-zinc-700 cursor-pointer">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    <DropdownMenuItem onClick={() => handleShareToPlatform('facebook')} className="hover:bg-zinc-700 cursor-pointer">
                      <span className="mr-2">📘</span>
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareToPlatform('twitter')} className="hover:bg-zinc-700 cursor-pointer">
                      <span className="mr-2">🐦</span>
                      Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareToPlatform('whatsapp')} className="hover:bg-zinc-700 cursor-pointer">
                      <span className="mr-2">💬</span>
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareToPlatform('telegram')} className="hover:bg-zinc-700 cursor-pointer">
                      <span className="mr-2">✈️</span>
                      Telegram
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Report Video Button */}
                {currentUser?.username !== selectedVideo.uploaderUsername && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-red-500 transition-colors ml-auto"
                    title="Báo cáo video"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Comments Section */}
              <div>
                <h5 className="text-white font-medium mb-3">
                  Bình luận ({currentVideoComments.length || 0})
                </h5>

                {/* Comment Input */}
                <div className="mb-4 space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Thêm bình luận..."
                    className="bg-zinc-800 border-zinc-700 text-white resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    size="sm"
                    className="bg-[#ff3b5c] hover:bg-[#e6344f] text-white w-full"
                  >
                    Đăng
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {currentVideoComments.length > 0 ? (
                    currentVideoComments.map((comment: any) => {
                      const commentUser = users.find(u => u.username === comment.username);
                      return (
                        <div key={comment.id} className="flex gap-2 group">
                          {commentUser?.avatarUrl ? (
                            <img
                              src={commentUser.avatarUrl}
                              alt={comment.username}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
                              onClick={() => handleUserClick(comment.username)}
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 cursor-pointer"
                              onClick={() => handleUserClick(comment.username)}
                            >
                              <User className="w-4 h-4 text-zinc-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="bg-zinc-800 rounded-lg p-2">
                              <p
                                className="text-white text-sm font-medium cursor-pointer hover:text-[#ff3b5c]"
                                onClick={() => handleUserClick(comment.username)}
                              >
                                {commentUser?.displayName || comment.username}
                              </p>
                              <p className="text-zinc-300 text-sm">{comment.text}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {currentUser?.username === comment.username && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-zinc-500 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Xóa
                                </button>
                              )}
                              <button
                                onClick={() => handleCopyComment(comment.text)}
                                className="text-zinc-500 hover:text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Copy
                              </button>
                              {currentUser?.username !== comment.username && (
                                <button
                                  onClick={() => {
                                    setSelectedComment(comment);
                                    setCommentReportReason('');
                                    setShowCommentReportModal(true);
                                  }}
                                  className="text-zinc-500 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Báo cáo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-zinc-500 text-sm text-center py-8">
                      Chưa có bình luận nào
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Video Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
            <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Báo cáo video
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-sm mb-2 block">Loại vi phạm</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="spam">Spam</option>
                  <option value="inappropriate">Nội dung không phù hợp</option>
                  <option value="violence">Bạo lực</option>
                  <option value="harassment">Quấy rối</option>
                  <option value="copyright">Vi phạm bản quyền</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-sm mb-2 block">Chi tiết (tùy chọn)</label>
                <Textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Mô tả chi tiết vi phạm..."
                  className="bg-zinc-800 border-zinc-700 text-white resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowReportModal(false)}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                Hủy
              </Button>
              <Button
                onClick={handleVideoReport}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Gửi báo cáo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Report Modal */}
      {showCommentReportModal && selectedComment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
            <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Báo cáo bình luận
            </h3>

            <div className="bg-zinc-800 rounded-lg p-3 mb-4">
              <p className="text-zinc-400 text-sm">Bình luận của @{selectedComment.username}:</p>
              <p className="text-white text-sm mt-1">"{selectedComment.text}"</p>
            </div>

            <div>
              <label className="text-zinc-400 text-sm mb-2 block">Lý do báo cáo</label>
              <Textarea
                value={commentReportReason}
                onChange={(e) => setCommentReportReason(e.target.value)}
                placeholder="Mô tả lý do báo cáo..."
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowCommentReportModal(false);
                  setSelectedComment(null);
                }}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCommentReport}
                disabled={!commentReportReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Gửi báo cáo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Report Confirmation */}
      <AlertDialog open={showVideoReportConfirm} onOpenChange={setShowVideoReportConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Đã gửi báo cáo</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét video này trong thời gian sớm nhất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-[#ff3b5c] hover:bg-[#e6344f] text-white">
              Đóng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comment Report Confirmation */}
      <AlertDialog open={showCommentReportConfirm} onOpenChange={setShowCommentReportConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Đã gửi báo cáo</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét bình luận này trong thời gian sớm nhất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-[#ff3b5c] hover:bg-[#e6344f] text-white">
              Đóng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
