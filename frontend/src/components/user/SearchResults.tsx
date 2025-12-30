import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  Heart, User, Play, Search, Loader2, Share2, Bookmark, MessageCircle, X, Copy, Flag, Trash2
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { searchUsersThunk } from '../../store/usersSlice';
import {
  toggleLikeVideoThunk,
  toggleSaveVideoThunk,
  fetchCommentsThunk,
  addCommentThunk,
  deleteCommentThunk
} from '../../store/videosSlice';
import { followUserThunk, unfollowUserThunk } from '../../store/notificationsSlice';
import { copyVideoLink, shareVideoApi, generateShareUrl } from '../../api/share';
import { toast } from 'sonner';
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
import { reportVideoApi, reportCommentApi } from '../../api/reports';
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

interface SearchResultsProps {
  searchQuery: string;
  onVideoClick: (videoId: string) => void;
  onUserClick: (username: string) => void;
}

export function SearchResults({ searchQuery, onVideoClick, onUserClick }: SearchResultsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<'top' | 'users'>('top');
  const searchResults = useSelector((state: RootState) => state.videos.searchResults);
  const searchLoading = useSelector((state: RootState) => state.videos.searchLoading);
  const users = useSelector((state: RootState) => state.users.allUsers);
  const searchUserResults = useSelector((state: RootState) => state.users.searchUserResults);
  const userStatus = useSelector((state: RootState) => state.users.status);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const followingIds = useSelector((state: RootState) => state.notifications.followingIds);
  const currentVideoComments = useSelector((state: RootState) => state.videos.currentVideoComments);

  // Video modal states
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [bookmarkAnimation, setBookmarkAnimation] = useState(false);
  const [followAnimation, setFollowAnimation] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Trigger user search when tab changes or query changes
  useEffect(() => {
    if (activeTab === 'users' && searchQuery) {
      dispatch(searchUsersThunk({ query: searchQuery }));
    }
  }, [activeTab, searchQuery, dispatch]);

  // Handle wheel event to change videos in modal
  const handleWheel = (e: WheelEvent) => {
    if (!showVideoModal || searchResults.length === 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('.sidebar-scroll')) return;

    e.preventDefault();

    if (e.deltaY > 0) {
      const nextIndex = (currentVideoIndex + 1) % searchResults.length;
      setCurrentVideoIndex(nextIndex);
      // Don't set selectedVideo here - let the useEffect sync it from searchResults
      dispatch(fetchCommentsThunk(searchResults[nextIndex].id));
    } else if (e.deltaY < 0) {
      const prevIndex = (currentVideoIndex - 1 + searchResults.length) % searchResults.length;
      setCurrentVideoIndex(prevIndex);
      // Don't set selectedVideo here - let the useEffect sync it from searchResults
      dispatch(fetchCommentsThunk(searchResults[prevIndex].id));
    }
  };

  useEffect(() => {
    if (showVideoModal) {
      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        window.removeEventListener('wheel', handleWheel);
      };
    }
  }, [showVideoModal, currentVideoIndex, searchResults]);

  // Use backend results directly for videos
  const filteredVideos = searchResults;

  // Use backend results for users
  const filteredUsers = activeTab === 'users' ? searchUserResults : [];

  // Sync selectedVideo with Redux updates when searchResults change or index changes
  useEffect(() => {
    if (showVideoModal && searchResults.length > 0 && currentVideoIndex >= 0 && currentVideoIndex < searchResults.length) {
      const updatedVideo = searchResults[currentVideoIndex];
      console.log('[SearchResults] Syncing selectedVideo:', updatedVideo.id, 'isLiked:', updatedVideo.isLiked, 'isSaved:', updatedVideo.isSaved);
      // Always update to ensure we have latest state from Redux
      setSelectedVideo(updatedVideo);
    }
  }, [searchResults, currentVideoIndex, showVideoModal]);

  const handleVideoClick = (video: any) => {
    setShowVideoModal(true);
    const index = searchResults.findIndex(v => v.id === video.id);
    setCurrentVideoIndex(index);
    dispatch(fetchCommentsThunk(video.id));
  };

  const handleCloseModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
    setCommentText('');
  };

  const handleLike = async () => {
    if (!selectedVideo || !currentUser || isLiking) return;

    setIsLiking(true);
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 500);

    // Get fresh state from Redux to avoid stale local state
    const videoFromRedux = searchResults.find((v: any) => v.id === selectedVideo.id);
    const currentIsLiked = !!(videoFromRedux?.isLiked || selectedVideo.isLiked);

    try {
      await dispatch(toggleLikeVideoThunk({ videoId: selectedVideo.id, isLiked: currentIsLiked })).unwrap();
      // No need for optimistic update - useEffect will sync selectedVideo from searchResults
    } catch (error) {
      toast.error('Không thể thích video');
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVideo || !currentUser || isSaving) return;

    setIsSaving(true);
    setBookmarkAnimation(true);
    setTimeout(() => setBookmarkAnimation(false), 500);

    try {
      await dispatch(toggleSaveVideoThunk(selectedVideo.id)).unwrap();
      const wasSaved = !!selectedVideo.isSaved;
      toast.success(wasSaved ? 'Đã bỏ lưu video' : 'Đã lưu video');
      // No need for optimistic update - useEffect will sync selectedVideo from searchResults
    } catch (error) {
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

    // Try to get uploaderId from video first (API response), then from users array (fallback)
    const uploader = users.find(u => u.username === selectedVideo.uploaderUsername);
    const uploaderId = selectedVideo.uploaderId || uploader?.id;

    if (!uploaderId) {
      console.error('[SearchResults] No uploader ID found for:', selectedVideo.uploaderUsername);
      toast.error('Không thể tìm thấy thông tin người dùng');
      return;
    }

    const isCurrentlySubscribed = followingIds.includes(uploaderId);

    setFollowAnimation(true);
    setTimeout(() => setFollowAnimation(false), 500);

    try {
      if (isCurrentlySubscribed) {
        await dispatch(unfollowUserThunk({ userId: uploaderId, username: selectedVideo.uploaderUsername })).unwrap();
        toast.success('Đã bỏ follow');
      } else {
        await dispatch(followUserThunk({ userId: uploaderId, username: selectedVideo.uploaderUsername })).unwrap();
        toast.success(`Đã follow ${selectedVideo.uploaderUsername}`);
      }
    } catch (error) {
      toast.error('Không thể thực hiện thao tác');
    }
  };

  const handleCopyLink = async () => {
    if (!selectedVideo) return;
    try {
      const token = localStorage.getItem('accessToken');
      await copyVideoLink(selectedVideo.id, token || undefined);
      toast.success('Đã copy link video');
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
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Copy comment text helper
  const handleCopyComment = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('Đã copy bình luận'))
        .catch(() => {
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

  const handleUserClickFromModal = (username: string) => {
    handleCloseModal();
    onUserClick(username);
  };

  const formatCount = (count: number) => {
    if (!count || typeof count !== 'number') return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const uploaderInfo = selectedVideo ? users.find(u => u.username === selectedVideo.uploaderUsername) : null;
  const uploaderIdForCheck = selectedVideo?.uploaderId || uploaderInfo?.id;
  const isSubscribed = currentUser && uploaderIdForCheck
    ? followingIds.includes(uploaderIdForCheck)
    : false;

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Search Tabs - Hidden when modal is open */}
      {!showVideoModal && (
        <div className="border-b border-zinc-900/50 bg-black sticky top-0 z-10">
          <div className="flex items-center gap-8 px-6">
            <button
              onClick={() => setActiveTab('top')}
              className={`py-4 relative transition-colors ${activeTab === 'top' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
                }`}
            >
              <span className="font-medium">Top</span>
              {activeTab === 'top' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 relative transition-colors ${activeTab === 'users' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
                }`}
            >
              <span className="font-medium">Người dùng</span>
              {activeTab === 'users' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Search Results Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Videos Tab */}
        {activeTab === 'top' && (
          <div className="p-6">
            {searchLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-[#ff3b5c] animate-spin mb-4" />
                <p className="text-zinc-500 text-sm">Đang tìm kiếm...</p>
              </div>
            ) : filteredVideos.length > 0 ? (
              <>
                <div className="text-zinc-400 text-sm mb-4">
                  {filteredVideos.length} kết quả
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredVideos.map(video => {
                    const uploader = users.find(u => u.username === video.uploaderUsername);
                    return (
                      <div
                        key={video.id}
                        onClick={() => handleVideoClick(video)}
                        className="group cursor-pointer"
                      >
                        {/* Video Thumbnail */}
                        <div className="relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden mb-2">
                          {video.thumbnailUrl ? (
                            <ImageWithFallback
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-12 h-12 text-zinc-700" />
                            </div>
                          )}

                          {/* Play icon overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Play className="w-6 h-6 text-white fill-white" />
                              </div>
                            </div>
                          </div>

                          {/* Views count */}
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-medium">
                            <Play className="w-3 h-3 fill-white" />
                            <span>{video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views}</span>
                          </div>

                          {/* Người theo dõi badge */}
                          {video.views > 100000 && (
                            <div className="absolute top-2 left-2 bg-[#ff3b5c]/90 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs font-medium">
                              Nhiều người thích
                            </div>
                          )}
                        </div>

                        {/* Video Info */}
                        <div className="space-y-1">
                          <p className="text-white text-sm line-clamp-2 group-hover:text-[#ff3b5c] transition-colors">
                            {video.title}
                          </p>
                          <div className="flex items-center gap-2">
                            {uploader?.avatarUrl || video.uploaderAvatarUrl ? (
                              <img
                                src={uploader?.avatarUrl || video.uploaderAvatarUrl}
                                alt={uploader?.username || video.uploaderUsername}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                                <User className="w-3 h-3 text-zinc-600" />
                              </div>
                            )}
                            <span className="text-zinc-400 text-xs truncate">
                              {uploader?.displayName || video.uploaderDisplayName || video.uploaderUsername}
                            </span>
                          </div>
                          <div className="text-zinc-500 text-xs">
                            {new Date(video.uploadedAt).toLocaleDateString('vi-VN', {
                              day: 'numeric',
                              month: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                  <Search className="w-10 h-10 text-zinc-700" />
                </div>
                <p className="text-zinc-500 text-sm">Không tìm thấy video nào</p>
                <p className="text-zinc-600 text-xs mt-1">Thử tìm kiếm với từ khóa khác</p>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-6">
            {filteredUsers.length > 0 ? (
              <>
                <div className="text-zinc-400 text-sm mb-4">
                  {filteredUsers.length} kết quả
                </div>
                <div className="space-y-3 max-w-2xl">
                  {filteredUsers.map(user => {
                    const userVideos = videos.filter(v => v.uploaderUsername === user.username);
                    const totalLikes = userVideos.reduce((sum, v) => sum + v.likes, 0);

                    return (
                      <div
                        key={user.username}
                        onClick={() => onUserClick(user.username)}
                        className="flex items-center gap-4 p-4 bg-zinc-950/50 rounded-xl hover:bg-zinc-900/50 transition-colors cursor-pointer border border-zinc-900/50"
                      >
                        {/* Avatar */}
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-zinc-800"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-800">
                            <User className="w-7 h-7 text-zinc-600" />
                          </div>
                        )}

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium">
                              {user.displayName || user.username}
                            </h3>
                            {user.verified && (
                              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="text-zinc-500 text-sm mb-2">@{user.username}</p>
                          <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <span>{user.followersCount?.toLocaleString() || 0} Followers</span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {totalLikes >= 1000 ? `${(totalLikes / 1000).toFixed(1)}K` : totalLikes}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                  <User className="w-10 h-10 text-zinc-700" />
                </div>
                <p className="text-zinc-500 text-sm">Không tìm thấy người dùng nào</p>
                <p className="text-zinc-600 text-xs mt-1">Thử tìm kiếm với từ khóa khác</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Modal - Explorer Style */}
      {showVideoModal && selectedVideo && (
        <div className="fixed inset-0 bg-black z-[60] flex">
          <div className="w-full h-full flex">
            {/* Video Player Section */}
            <div className="flex-1 flex items-center justify-center bg-black">
              <div className="relative w-full h-full flex items-center justify-center">
                <video
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
                onClick={handleCloseModal}
                title="Đóng"
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
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleUserClickFromModal(selectedVideo.uploaderUsername)}
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
                  <div className="flex items-center gap-3 py-2 border-y border-zinc-800">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1.5 transition-all ${selectedVideo.isLiked ? 'text-[#ff3b5c]' : 'text-zinc-400 hover:text-white'
                        } ${likeAnimation ? 'scale-125' : 'scale-100'}`}
                    >
                      <Heart className={`w-5 h-5 ${selectedVideo.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-medium">{formatCount(selectedVideo.likes || 0)}</span>
                    </button>

                    <button className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{currentVideoComments.length || 0}</span>
                    </button>

                    <button
                      onClick={handleSave}
                      title="Lưu video"
                      className={`flex items-center gap-1.5 transition-all ${selectedVideo.isSaved ? 'text-yellow-500' : 'text-zinc-400 hover:text-white'
                        } ${bookmarkAnimation ? 'scale-125' : 'scale-100'}`}
                    >
                      <Bookmark className={`w-5 h-5 ${selectedVideo.isSaved ? 'fill-current' : ''}`} />
                    </button>

                    {/* Share Button with Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
                          <Share2 className="w-5 h-5" />
                          <span className="text-sm font-medium">{formatCount(selectedVideo.shares || 0)}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                        <DropdownMenuItem onClick={handleCopyLink} className="text-white hover:bg-zinc-700 cursor-pointer">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-700" />
                        <DropdownMenuItem onClick={() => handleShareToPlatform('facebook')} className="text-white hover:bg-zinc-700 cursor-pointer">
                          <span className="mr-2">📘</span> Facebook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareToPlatform('twitter')} className="text-white hover:bg-zinc-700 cursor-pointer">
                          <span className="mr-2">🐦</span> Twitter
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareToPlatform('whatsapp')} className="text-white hover:bg-zinc-700 cursor-pointer">
                          <span className="mr-2">💬</span> WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareToPlatform('telegram')} className="text-white hover:bg-zinc-700 cursor-pointer">
                          <span className="mr-2">✈️</span> Telegram
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Report Video Button */}
                    {currentUser?.username !== selectedVideo.uploaderUsername && (
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-red-400 transition-colors ml-auto"
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
                                  onClick={() => handleUserClickFromModal(comment.username)}
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 cursor-pointer"
                                  onClick={() => handleUserClickFromModal(comment.username)}
                                >
                                  <User className="w-4 h-4 text-zinc-500" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="bg-zinc-800 rounded-lg p-2">
                                  <p
                                    className="text-white text-sm font-medium cursor-pointer hover:text-[#ff3b5c]"
                                    onClick={() => handleUserClickFromModal(comment.username)}
                                  >
                                    {commentUser?.displayName || comment.username}
                                  </p>
                                  <p className="text-zinc-300 text-sm">{comment.text}</p>
                                </div>
                                {/* Comment actions */}
                                <div className="flex items-center gap-3 mt-1">
                                  {/* Copy button - always visible on hover */}
                                  <button
                                    onClick={() => handleCopyComment(comment.text)}
                                    className="text-zinc-500 hover:text-white text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Copy className="w-3 h-3" />
                                    Copy
                                  </button>

                                  {currentUser?.username === comment.username ? (
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-zinc-500 hover:text-red-500 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Xóa
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedComment(comment);
                                        setShowCommentReportModal(true);
                                      }}
                                      className="text-zinc-500 hover:text-red-400 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Flag className="w-3 h-3" />
                                      Tố cáo
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <MessageCircle className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                          <p className="text-zinc-500 text-sm">Chưa có bình luận nào</p>
                          <p className="text-zinc-600 text-xs">Hãy là người đầu tiên bình luận!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Report Video Modal */}
      {showReportModal && selectedVideo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85">
          <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600">
                  <Flag className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-white text-xl">Báo cáo video</h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                title="Đóng"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <p className="text-zinc-400 text-sm mb-1">Bạn đang báo cáo:</p>
                <p className="text-white">{selectedVideo.title}</p>
              </div>

              <div>
                <label className="block text-white text-sm mb-2" htmlFor="reportType">Loại vi phạm:</label>
                <select
                  id="reportType"
                  title="Chọn loại vi phạm"
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
                  <option value="misleading">Thông tin sai lệch</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm mb-2">Chi tiết (không bắt buộc):</label>
                <Textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Mô tả thêm về vấn đề bạn gặp phải..."
                  className="bg-zinc-800 border-zinc-700 text-white resize-none"
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
                onClick={() => setShowVideoReportConfirm(true)}
                className="flex-1 text-white py-3 rounded-lg transition-all bg-red-600 hover:bg-red-700"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Report Modal */}
      {showCommentReportModal && selectedComment && selectedVideo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg border border-zinc-800">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600">
                  <Flag className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-white text-xl">Báo cáo bình luận</h2>
              </div>
              <button
                onClick={() => {
                  setShowCommentReportModal(false);
                  setSelectedComment(null);
                  setCommentReportReason('');
                }}
                title="Đóng"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <p className="text-zinc-400 text-sm mb-1">Bình luận của:</p>
                <p className="text-white mb-2">{selectedComment.username}</p>
                <p className="text-zinc-300 text-sm italic">"{selectedComment.text}"</p>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Lý do báo cáo</label>
                <Textarea
                  value={commentReportReason}
                  onChange={(e) => setCommentReportReason(e.target.value)}
                  placeholder="Mô tả lý do bạn báo cáo bình luận này..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[120px] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => {
                  setShowCommentReportModal(false);
                  setSelectedComment(null);
                  setCommentReportReason('');
                }}
                className="flex-1 bg-zinc-800 text-white py-3 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (!commentReportReason.trim()) {
                    toast.error('Vui lòng nhập lý do báo cáo');
                    return;
                  }
                  setShowCommentReportConfirm(true);
                }}
                className="flex-1 text-white py-3 rounded-lg transition-all bg-red-600 hover:bg-red-700"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Report Confirmation Dialog */}
      <AlertDialog open={showVideoReportConfirm} onOpenChange={setShowVideoReportConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Xác nhận báo cáo video
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400" asChild>
              <div>
                Bạn có chắc chắn muốn gửi báo cáo này không? Hành động này không thể hoàn tác.
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-500 text-sm">
                    ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai sự thật có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (currentUser && selectedVideo) {
                  try {
                    const reasonMap: { [key: string]: string } = {
                      'spam': 'spam',
                      'harassment': 'harassment',
                      'hate': 'hate',
                      'violence': 'violence',
                      'nudity': 'other',
                      'copyright': 'copyright',
                      'misleading': 'misleading',
                      'other': 'other'
                    };
                    const validReason = reasonMap[reportType] || 'other';
                    await reportVideoApi(selectedVideo.id, validReason, reportReason);
                    toast.success('Báo cáo đã được gửi thành công! Staff sẽ xem xét trong 24-48 giờ.');
                    setShowReportModal(false);
                    setShowVideoReportConfirm(false);
                    setReportReason('');
                    setReportType('spam');
                  } catch (error: any) {
                    const errorMessage = error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.';
                    toast.error(errorMessage);
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Xác nhận gửi báo cáo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comment Report Confirmation Dialog */}
      <AlertDialog open={showCommentReportConfirm} onOpenChange={setShowCommentReportConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Xác nhận báo cáo bình luận
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400" asChild>
              <div>
                Bạn có chắc chắn muốn báo cáo bình luận của <strong className="text-white">{selectedComment?.username}</strong> không?
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-500 text-sm">
                    ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedComment && selectedVideo && currentUser) {
                  try {
                    await reportCommentApi(selectedComment.id, `other: ${commentReportReason}`, commentReportReason);
                    toast.success('Báo cáo bình luận đã được gửi!');
                    setShowCommentReportModal(false);
                    setShowCommentReportConfirm(false);
                    setSelectedComment(null);
                    setCommentReportReason('');
                  } catch (error: any) {
                    const errorMessage = error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.';
                    toast.error(errorMessage);
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Xác nhận gửi báo cáo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}