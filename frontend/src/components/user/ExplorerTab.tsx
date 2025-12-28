import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  Heart, Share2, Bookmark, MessageCircle, Play, Eye, X, User,
  Loader2, Copy, MoreVertical, Flag, Trash2, AtSign, Smile, AlertTriangle
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
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { addVideoReport, addCommentReport } from '../../store/reportsSlice';
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

  // Handle user click - close modal and navigate
  const handleUserClick = (username: string) => {
    handleCloseModal();
    onUserClick?.(username);
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
                      <ImageWithFallback
                        src={video.thumbnailUrl && video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=500&fit=crop`}
                        alt={video.title}
                        videoSrc={video.videoUrl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
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
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleUserClick(selectedVideo.uploaderUsername)}
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
                  <div className="flex items-center gap-3 py-2 border-y border-zinc-800">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1.5 transition-all ${
                        selectedVideo.isLiked ? 'text-[#ff3b5c]' : 'text-zinc-400 hover:text-white'
                      } ${likeAnimation ? 'scale-125' : 'scale-100'}`}
                    >
                      <Heart className={`w-5 h-5 ${selectedVideo.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-medium">{formatCount(selectedVideo.likes || 0)}</span>
                    </button>

                    <button
                      onClick={() => {}}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{currentVideoComments.length || 0}</span>
                    </button>

                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-1.5 transition-all ${
                        selectedVideo.isSaved ? 'text-yellow-500' : 'text-zinc-400 hover:text-white'
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
                                {/* Comment actions */}
                                <div className="flex items-center gap-3 mt-1">
                                  {currentUser?.username === comment.username ? (
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-zinc-500 hover:text-red-500 text-xs flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Xóa
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleCopyComment(comment.text)}
                                        className="text-zinc-500 hover:text-white text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Copy className="w-3 h-3" />
                                        Copy
                                      </button>
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
                                    </>
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
        </div>
      )}

      {/* Report Video Modal */}
      {showReportModal && selectedVideo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                  <Flag className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-white text-xl">Báo cáo video</h2>
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
                <p className="text-white">{selectedVideo.title}</p>
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

      {/* Comment Report Modal */}
      {showCommentReportModal && selectedComment && selectedVideo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg border border-zinc-800">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
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

      {/* Video Report Confirmation Dialog */}
      <AlertDialog open={showVideoReportConfirm} onOpenChange={setShowVideoReportConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Xác nhận báo cáo video
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Bạn có chắc chắn muốn gửi báo cáo này không? Hành động này không thể hoàn tác.
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-500 text-sm">
                  ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai sự thật có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (currentUser && selectedVideo) {
                  dispatch(addVideoReport({
                    videoId: selectedVideo.id,
                    userId: currentUser.id,
                    type: reportType,
                    reason: reportReason,
                  }));
                  toast.success('Báo cáo đã được gửi thành công! Staff sẽ xem xét trong 24-48 giờ.');
                  setShowReportModal(false);
                  setShowVideoReportConfirm(false);
                  setReportReason('');
                  setReportType('spam');
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
            <AlertDialogDescription className="text-zinc-400">
              Bạn có chắc chắn muốn báo cáo bình luận của <strong className="text-white">{selectedComment?.username}</strong> không?
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-500 text-sm">
                  ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedComment && selectedVideo && currentUser) {
                  dispatch(addCommentReport({
                    id: Date.now().toString(),
                    commentId: selectedComment.id,
                    commentText: selectedComment.text,
                    commentUsername: selectedComment.username,
                    videoId: selectedVideo.id,
                    videoTitle: selectedVideo.title,
                    reporterId: currentUser.id,
                    reporterUsername: currentUser.username,
                    reason: commentReportReason,
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                  }));
                  toast.success('Báo cáo bình luận đã được gửi!');
                  setShowCommentReportModal(false);
                  setShowCommentReportConfirm(false);
                  setSelectedComment(null);
                  setCommentReportReason('');
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
