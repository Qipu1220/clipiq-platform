import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  Heart, Share2, Bookmark, MessageCircle, Play, Eye, X, User,
  Loader2, Copy, MoreVertical, Flag, Trash2, AtSign, Smile
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import {
  toggleLikeVideoThunk,
  toggleSaveVideoThunk,
  fetchCommentsThunk,
  addCommentThunk,
  deleteCommentThunk
} from '../../store/videosSlice';
import { subscribeToUser, unsubscribeFromUser } from '../../store/notificationsSlice';
import { fetchExplorerVideosApi } from '../../api/explorer';
import { copyVideoLink, shareVideoApi, generateShareUrl } from '../../api/share';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ExplorerTabProps {
  onUserClick?: (username: string) => void;
}

export function ExplorerTab({ onUserClick }: ExplorerTabProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const users = useSelector((state: RootState) => state.users.allUsers);
  const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);
  const currentVideoComments = useSelector((state: RootState) => state.videos.currentVideoComments);
  const allVideos = useSelector((state: RootState) => state.videos.videos);

  const [explorerVideos, setExplorerVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [bookmarkAnimation, setBookmarkAnimation] = useState(false);
  const [followAnimation, setFollowAnimation] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle wheel event to change videos
  const handleWheel = (e: WheelEvent) => {
    if (!showVideoModal || explorerVideos.length === 0) return;
    
    // Only handle wheel on video player area, not on sidebar
    const target = e.target as HTMLElement;
    if (target.closest('.sidebar-scroll')) return; // Allow scrolling in sidebar
    
    e.preventDefault();
    
    if (e.deltaY > 0) {
      // Scroll down - next video
      const nextIndex = (currentVideoIndex + 1) % explorerVideos.length;
      setCurrentVideoIndex(nextIndex);
      setSelectedVideo(explorerVideos[nextIndex]);
      dispatch(fetchCommentsThunk(explorerVideos[nextIndex].id));
    } else if (e.deltaY < 0) {
      // Scroll up - previous video
      const prevIndex = (currentVideoIndex - 1 + explorerVideos.length) % explorerVideos.length;
      setCurrentVideoIndex(prevIndex);
      setSelectedVideo(explorerVideos[prevIndex]);
      dispatch(fetchCommentsThunk(explorerVideos[prevIndex].id));
    }
  };

  // Add wheel event listener when modal is open
  useEffect(() => {
    if (showVideoModal) {
      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        window.removeEventListener('wheel', handleWheel);
      };
    }
  }, [showVideoModal, currentVideoIndex, explorerVideos]);

  // Fetch explorer videos from API (placeholder for now)
  useEffect(() => {
    fetchExplorerVideos();
  }, []);

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

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const fetchExplorerVideos = async () => {
    try {
      setLoading(true);
      // Fetch from explorer API (currently using trending endpoint as placeholder)
      const response = await fetchExplorerVideosApi(1, 20);
      console.log('[Explorer] Fetched videos:', response.data.videos.map(v => ({ id: v.id, title: v.title, isLiked: v.isLiked })));
      setExplorerVideos(response.data.videos);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching explorer videos:', error);
      // Fallback to allVideos if API fails
      setExplorerVideos(allVideos.slice(0, 20));
      setLoading(false);
    }
  };

  const handleVideoClick = (video: any) => {
    console.log('[Explorer] Video clicked:', { id: video.id, isLiked: video.isLiked, likes: video.likes });
    setSelectedVideo(video);
    setShowVideoModal(true);
    // Save the index of clicked video
    const index = explorerVideos.findIndex(v => v.id === video.id);
    setCurrentVideoIndex(index);
    // Fetch comments for this video
    dispatch(fetchCommentsThunk(video.id));
  };

  const handleCloseModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
    setShowShareMenu(false); // Close share menu when modal closes
    setCommentText('');
  };

  const handleLike = async () => {
    if (!selectedVideo || !currentUser || isLiking) return;
    
    setIsLiking(true);
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 500);
    
    // Capture current state before async operation
    const currentIsLiked = !!selectedVideo.isLiked;
    const currentLikes = selectedVideo.likes || 0;
    const newIsLiked = !currentIsLiked;
    const newLikes = currentIsLiked ? currentLikes - 1 : currentLikes + 1;
    
    // Optimistic update
    setSelectedVideo((prev: any) => ({
      ...prev,
      isLiked: newIsLiked,
      likes: newLikes
    }));
    
    setExplorerVideos((prev: any[]) => prev.map((v: any) => 
      v.id === selectedVideo.id 
        ? { ...v, isLiked: newIsLiked, likes: newLikes }
        : v
    ));
    
    try {
      await dispatch(toggleLikeVideoThunk({ videoId: selectedVideo.id, isLiked: currentIsLiked })).unwrap();
    } catch (error) {
      // Revert on error
      setSelectedVideo((prev: any) => ({
        ...prev,
        isLiked: currentIsLiked,
        likes: currentLikes
      }));
      setExplorerVideos((prev: any[]) => prev.map((v: any) => 
        v.id === selectedVideo.id 
          ? { ...v, isLiked: currentIsLiked, likes: currentLikes }
          : v
      ));
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
    
    // Capture current state
    const currentIsSaved = !!selectedVideo.isSaved;
    const newIsSaved = !currentIsSaved;
    
    // Optimistic update
    setSelectedVideo((prev: any) => ({
      ...prev,
      isSaved: newIsSaved
    }));
    
    setExplorerVideos((prev: any[]) => prev.map((v: any) => 
      v.id === selectedVideo.id 
        ? { ...v, isSaved: newIsSaved }
        : v
    ));
    
    try {
      await dispatch(toggleSaveVideoThunk(selectedVideo.id)).unwrap();
      toast.success(currentIsSaved ? 'Đã bỏ lưu video' : 'Đã lưu video');
    } catch (error) {
      // Revert on error
      setSelectedVideo((prev: any) => ({
        ...prev,
        isSaved: currentIsSaved
      }));
      setExplorerVideos((prev: any[]) => prev.map((v: any) => 
        v.id === selectedVideo.id 
          ? { ...v, isSaved: currentIsSaved }
          : v
      ));
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

    const isSubscribed = subscriptions[currentUser.username]?.includes(selectedVideo.uploaderUsername);
    
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

  const formatCount = (count: number) => {
    if (!count || typeof count !== 'number') return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#ff3b5c] animate-spin mb-4 mx-auto" />
          <p className="text-zinc-500 text-sm">Đang tải videos...</p>
        </div>
      </div>
    );
  }

  const uploaderInfo = selectedVideo ? users.find(u => u.username === selectedVideo.uploaderUsername) : null;
  const isSubscribed = currentUser && selectedVideo
    ? subscriptions[currentUser.username]?.includes(selectedVideo.uploaderUsername)
    : false;

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Header - Hidden when modal is open */}
      {!showVideoModal && (
        <div className="border-b border-zinc-900 bg-black sticky top-0 z-10">
          <div className="px-6 py-4">
            <h2 className="text-white text-xl font-semibold">Khám phá</h2>
            <p className="text-zinc-500 text-sm mt-1">Những video đang thịnh hành</p>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 min-h-full">
          {explorerVideos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {explorerVideos.map((video) => {
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
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <Play className="w-12 h-12 text-zinc-600" />
                        </div>
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-16 h-16 text-white" />
                      </div>

                      {/* Stats Overlay */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center gap-2 text-white text-sm">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{formatCount(video.likes || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{formatCount(video.views || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="px-1">
                      <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {uploader?.avatarUrl ? (
                          <img
                            src={uploader.avatarUrl}
                            alt={video.uploaderUsername}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User className="w-3 h-3 text-zinc-500" />
                          </div>
                        )}
                        <span className="text-zinc-400 text-xs truncate">
                          {uploader?.displayName || video.uploaderUsername}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-zinc-500">Không có video nào</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Video Modal */}
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
              {/* Close Button - Absolute Position */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white transition-colors bg-black/50 rounded-full p-2 hover:bg-black/70"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1 pt-2 h-full sidebar-scroll">
                <div className="p-4 space-y-4 pb-20">{/* pb-20 for bottom spacing */}
                  {/* User Info */}
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => onUserClick?.(selectedVideo.uploaderUsername)}
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
                        className={`${
                          isSubscribed
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
                      className={`flex items-center gap-2 transition-all ${
                        selectedVideo.isLiked ? 'text-[#ff3b5c]' : 'text-zinc-400 hover:text-white'
                      } ${likeAnimation ? 'scale-125' : 'scale-100'}`}
                    >
                      <Heart className={`w-5 h-5 ${selectedVideo.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-medium">{formatCount(selectedVideo.likes || 0)}</span>
                    </button>

                    <button
                      onClick={() => {}}
                      className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{currentVideoComments.length || 0}</span>
                    </button>

                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-2 transition-all ${
                        selectedVideo.isSaved ? 'text-yellow-500' : 'text-zinc-400 hover:text-white'
                      } ${bookmarkAnimation ? 'scale-125' : 'scale-100'}`}
                    >
                      <Bookmark className={`w-5 h-5 ${selectedVideo.isSaved ? 'fill-current' : ''}`} />
                    </button>

                    {/* Share Button with Menu */}
                    <div className="relative share-menu-container">
                      <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm font-medium">{formatCount(selectedVideo.shares || 0)}</span>
                      </button>

                      {/* Share Menu Dropdown */}
                      {showShareMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-50">
                          <button
                            onClick={handleCopyLink}
                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </button>
                          <button
                            onClick={() => handleShareToPlatform('facebook')}
                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                          >
                            <span className="text-lg">📘</span>
                            Facebook
                          </button>
                          <button
                            onClick={() => handleShareToPlatform('twitter')}
                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                          >
                            <span className="text-lg">🐦</span>
                            Twitter
                          </button>
                          <button
                            onClick={() => handleShareToPlatform('whatsapp')}
                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                          >
                            <span className="text-lg">💬</span>
                            WhatsApp
                          </button>
                          <button
                            onClick={() => handleShareToPlatform('telegram')}
                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                          >
                            <span className="text-lg">✈️</span>
                            Telegram
                          </button>
                        </div>
                      )}
                    </div>
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
                            <div key={comment.id} className="flex gap-2">
                              {commentUser?.avatarUrl ? (
                                <img
                                  src={commentUser.avatarUrl}
                                  alt={comment.username}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-zinc-500" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="bg-zinc-800 rounded-lg p-2">
                                  <p className="text-white text-sm font-medium">
                                    {commentUser?.displayName || comment.username}
                                  </p>
                                  <p className="text-zinc-300 text-sm">{comment.text}</p>
                                </div>
                                {currentUser?.username === comment.username && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-zinc-500 hover:text-red-500 text-xs mt-1"
                                  >
                                    Xóa
                                  </button>
                                )}
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
        </div>
      )}
    
    </div>

  );

}
