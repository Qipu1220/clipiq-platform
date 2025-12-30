import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { likeVideo, addComment, incrementViewCount, fetchVideosThunk, toggleLikeVideoThunk, addCommentThunk, fetchCommentsThunk, deleteCommentThunk, toggleSaveVideoThunk, setFocusedVideoId, searchVideosThunk, addVideo, fetchPersonalFeedThunk, setProfileNavigation } from '../../store/videosSlice';
import { followUserThunk, unfollowUserThunk, subscribeToUser, unsubscribeFromUser } from '../../store/notificationsSlice';
import { logoutThunk } from '../../store/authSlice';
import {
  Play, Search, Home, Compass, Users, Video, MessageCircle,
  Heart, Share2, Bookmark, Volume2, VolumeX, User, Plus, Check, LogOut, ChevronDown,
  AtSign, Smile, ChevronRight, ChevronLeft, Flag, X, MoreVertical, Copy, Trash2, Loader2
} from 'lucide-react';
import { useVideoImpression } from '../../hooks/useVideoImpression';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
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
import { toast } from 'sonner';
import { reportVideoApi, reportCommentApi } from '../../api/reports';
import { SearchResults } from './SearchResults';
import { ExplorerTab } from './ExplorerTab';
import { copyVideoLink, shareVideoApi, generateShareUrl } from '../../api/share';

// Helper function to copy text with fallback
const copyToClipboard = (text: string) => {
  // Try modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Đã copy bình luận');
      })
      .catch(() => {
        // Fallback to older method
        fallbackCopy(text);
      });
  } else {
    // Use fallback method directly
    fallbackCopy(text);
  }
};

const fallbackCopy = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    toast.success('Đã copy bình luận');
  } catch (err) {
    toast.error('Không thể copy bình luận');
  }

  document.body.removeChild(textArea);
};

interface TikTokStyleHomeProps {
  onViewUserProfile?: (username: string) => void;
  onNavigate?: (page: string) => void;
  initialTab?: 'for-you' | 'following';
  onTabChange?: (tab: 'for-you' | 'following') => void;
  initialShowExplorer?: boolean;
  onExplorerChange?: (show: boolean) => void;
  initialSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export function TikTokStyleHome({ onViewUserProfile, onNavigate, initialTab = 'for-you', onTabChange, initialShowExplorer = false, onExplorerChange, initialSearchQuery = '', onSearchQueryChange }: TikTokStyleHomeProps) {
  const dispatch = useDispatch();
  const allVideos = useSelector((state: RootState) => state.videos.videos);
  // Filter out processing/failed videos for the home feed
  const videos = allVideos.filter(v => v.processing_status === 'ready' || !v.processing_status);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const users = useSelector((state: RootState) => state.users.allUsers);
  const followingIds = useSelector((state: RootState) => state.notifications.followingIds);
  const followingUsernames = useSelector((state: RootState) => state.notifications.followingUsernames);
  const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);
  const { pagination, loading, currentVideoComments, focusedVideoId, searchResults, isProfileNavigation } = useSelector((state: RootState) => state.videos);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialSearchQuery);
  const [isMuted, setIsMuted] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTabState] = useState<'for-you' | 'following'>(initialTab);
  const [rightTab, setRightTab] = useState<'comments' | 'suggestions'>('comments');

  // Wrapper to sync tab changes with parent
  const setActiveTab = (tab: 'for-you' | 'following') => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  // Sync activeTab when initialTab changes (e.g., from navigation)
  useEffect(() => {
    setActiveTabState(initialTab);
  }, [initialTab]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [followAnimation, setFollowAnimation] = useState(false);
  const [bookmarkAnimation, setBookmarkAnimation] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default hidden comments
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('spam');
  const [reportReason, setReportReason] = useState('');
  const [showFollowingList, setShowFollowingList] = useState(false);
  const [showCommentReportModal, setShowCommentReportModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<{ id: string; text: string; username: string } | null>(null);
  const [commentReportReason, setCommentReportReason] = useState('');
  const [showVideoReportConfirm, setShowVideoReportConfirm] = useState(false);
  const [showCommentReportConfirm, setShowCommentReportConfirm] = useState(false);
  const [showExplorerState, setShowExplorerState] = useState(initialShowExplorer);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Wrapper to sync explorer state with parent
  const setShowExplorer = (show: boolean) => {
    setShowExplorerState(show);
    onExplorerChange?.(show);
  };
  const showExplorer = showExplorerState;

  // Sync showExplorer when initialShowExplorer changes
  useEffect(() => {
    setShowExplorerState(initialShowExplorer);
  }, [initialShowExplorer]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoStartTimeRef = useRef<number>(0); // Track video start time

  // Initialize impression tracking hook
  const { trackImpression, trackWatch } = useVideoImpression();

  // Filter videos based on active tab - WITH SAFE CHECKS
  const filteredVideos = activeTab === 'following'
    ? videos.filter(v => {
      // Ensure currentUser exists and has subscriptions
      if (!currentUser) return false;
      const userSubscriptions = subscriptions[currentUser.username];
      if (!userSubscriptions || !Array.isArray(userSubscriptions)) return false;
      return userSubscriptions.includes(v.uploaderUsername);
    })
    : videos;

  const currentVideo = filteredVideos[currentVideoIndex];
  const uploaderInfo = currentVideo ? users.find(u => u.username === currentVideo.uploaderUsername) : null;
  const isSubscribed = currentUser && currentVideo
    ? (uploaderInfo ? followingIds.includes(uploaderInfo.id) : followingUsernames.includes(currentVideo.uploaderUsername))
    : false;

  // Handle initial video focus from profile click
  useEffect(() => {
    if (focusedVideoId && videos.length > 0) {
      const index = videos.findIndex(v => v.id === focusedVideoId);
      console.log('[Feed] Handling focusedVideoId:', focusedVideoId, 'found at index:', index);

      if (index !== -1) {
        setCurrentVideoIndex(index);
        // Scroll to it after a small delay
        setTimeout(() => {
          videoRefs.current[index]?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      }

      // Clear focusedVideoId in Redux (but keep isProfileNavigation true)
      dispatch(setFocusedVideoId(null));

      // Reset isProfileNavigation after navigation is complete
      setTimeout(() => {
        dispatch(setProfileNavigation(false));
        console.log('[Feed] Profile navigation complete, normal mode enabled');
      }, 2000);
    }
  }, [focusedVideoId, videos, dispatch]);

  // Reset video index when tab changes (but not during profile navigation)
  useEffect(() => {
    // Skip if we're in profile navigation mode (from Redux)
    if (isProfileNavigation) {
      console.log('[Feed] Skipping tab switch - profile navigation in progress');
      return;
    }

    setCurrentVideoIndex(0);

    // Fetch appropriate content based on tab
    if (activeTab === 'for-you') {
      console.log('[Feed] Switching to For You tab, fetching personal feed...');
      dispatch(fetchPersonalFeedThunk(20) as any);
    } else if (activeTab === 'following') {
      console.log('[Feed] Switching to Following tab, keeping current videos');
      // Keep existing videos, filter in component
    }
  }, [activeTab, dispatch, isProfileNavigation]);

  useEffect(() => {
    if (currentVideo) {
      dispatch(incrementViewCount(currentVideo.id));
      setIsBookmarked(!!currentVideo.isSaved);
    }
  }, [currentVideo?.id, currentVideo?.isSaved, dispatch]);

  // Click outside to close user menu and share menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      // Close share menu when clicking outside
      if (showShareMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.share-menu-container')) {
          setShowShareMenu(false);
        }
      }
    };

    if (showUserMenu || showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showShareMenu]);

  // Refs for state accessed inside IntersectionObserver
  const isSidebarOpenRef = useRef(isSidebarOpen);
  const rightTabRef = useRef(rightTab);

  // Update refs when state changes
  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
    rightTabRef.current = rightTab;
  }, [isSidebarOpen, rightTab]);

  // Ref to track isProfileNavigation for IntersectionObserver
  const isProfileNavigationRef = useRef(isProfileNavigation);
  useEffect(() => {
    isProfileNavigationRef.current = isProfileNavigation;
  }, [isProfileNavigation]);

  // IntersectionObserver to track which video is currently visible
  useEffect(() => {
    const options = {
      root: videoContainerRef.current,
      threshold: 0.6,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Skip if we're navigating from profile to prevent unwanted index changes
          if (isProfileNavigationRef.current) {
            return;
          }

          const index = videoRefs.current.findIndex(ref => ref === entry.target);
          if (index !== -1 && index !== currentVideoIndex) {
            setCurrentVideoIndex(index);

            // Auto-close comments when scrolling to new video
            // Use refs to get the latest state without recreating the observer
            if (isSidebarOpenRef.current && rightTabRef.current === 'comments') {
              setIsSidebarOpen(false);
            }
          }
        }
      });
    }, options);

    videoRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [filteredVideos]); // Only recreate if video list changes

  // Track impression when video becomes visible (>600ms visibility)
  useEffect(() => {
    if (!currentVideo) return;

    console.log(`[Impression] Video ${currentVideo.id} became visible at index ${currentVideoIndex}`);

    // Track impression with 600ms delay (handled by hook)
    // Source: 'personal' for For You tab, 'trending' for Following tab
    const source = activeTab === 'for-you' ? 'personal' : 'trending';
    trackImpression(currentVideo.id, currentVideoIndex, source);

    // Record start time for watch duration calculation
    videoStartTimeRef.current = Date.now();

    // Cleanup: track watch event when leaving this video
    return () => {
      const watchDuration = Math.floor((Date.now() - videoStartTimeRef.current) / 1000);
      if (watchDuration > 0) {
        console.log(`[Watch] Leaving video ${currentVideo.id} after ${watchDuration}s`);
        const videoElement = videoRefs.current[currentVideoIndex]?.querySelector('video');
        const completed = videoElement ? videoElement.ended : false;
        trackWatch(currentVideo.id, watchDuration, completed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoIndex, currentVideo?.id]); // Only re-run when video changes, not when tab/functions change

  // Scroll to video when index changes (for programmatic navigation) & Auto-play logic
  useEffect(() => {
    const videoContainer = videoRefs.current[currentVideoIndex];
    if (videoContainer && videoContainerRef.current) {
      videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Programmatically play the video
      const videoElement = videoContainer.querySelector('video');
      if (videoElement) {
        // Reset other videos
        videoRefs.current.forEach((ref, index) => {
          if (index !== currentVideoIndex && ref) {
            const otherVideo = ref.querySelector('video');
            if (otherVideo) {
              otherVideo.pause();
              otherVideo.currentTime = 0;
            }
          }
        });

        // Play current video
        videoElement.muted = isMuted;
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Auto-play prevented:", error);
            // Auto-play might be blocked by browser policy if not muted
          });
        }
      }
    }

    // Infinite Scroll Logic: Fetch more videos when approaching the end
    if (activeTab === 'for-you' && currentVideoIndex >= videos.length - 3) {
      const { hasMore, page } = pagination;
      if (hasMore && !loading) {
        console.log(`[Feed] Infinite Scroll: Fetching page ${page + 1}`);
        dispatch(fetchVideosThunk({ page: page + 1, limit: 10 }) as any);
      }
    } else if (activeTab === 'following' && currentVideoIndex >= filteredVideos.length - 3) {
      // For following tab, fetch more if needed
      const { hasMore, page } = pagination;
      if (hasMore && !loading) {
        console.log(`📜 Infinite Scroll (Following): Fetching page ${page + 1}`);
        dispatch(fetchVideosThunk({ page: page + 1, limit: 10 }) as any);
      }
    }
  }, [currentVideoIndex, isMuted, videos.length, filteredVideos.length, activeTab, pagination.hasMore, pagination.page, loading, dispatch]);

  // Polling for processing videos - auto-refresh every 30s
  useEffect(() => {
    const hasProcessingVideos = videos.some(
      v => v.processing_status === 'processing'
    );

    if (!hasProcessingVideos) return;

    console.log('🔄 Polling: Found processing videos, refreshing every 30s...');
    const interval = setInterval(() => {
      console.log('🔄 Polling: Fetching updated video statuses...');
      dispatch(fetchVideosThunk({ page: 1, limit: pagination.total || 20 }) as any);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [videos, dispatch, pagination.total]);

  const handleLike = () => {
    if (!currentUser || !currentVideo) return;
    // Get fresh state from Redux before calling API
    const videoFromRedux = videos.find((v: any) => v.id === currentVideo.id);
    const currentIsLiked = !!(videoFromRedux?.isLiked || currentVideo.isLiked);
    dispatch(toggleLikeVideoThunk({ videoId: currentVideo.id, isLiked: currentIsLiked }) as any);
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 500);
  };


  const handleDeleteComment = async (commentId: string) => {
    if (!currentVideo) return;
    try {
      await dispatch(deleteCommentThunk({ videoId: currentVideo.id, commentId })).unwrap();
      toast.success('Đã xóa bình luận');
    } catch (error) {
      toast.error('Không thể xóa bình luận');
    }
  };

  const handleComment = () => {
    if (!commentText.trim() || !currentUser || !currentVideo) return;
    dispatch(addCommentThunk({
      videoId: currentVideo.id,
      text: commentText,
    }) as any);
    setCommentText('');
  };

  const handleSubscribe = async () => {
    if (!currentUser || !currentVideo || currentUser.username === currentVideo.uploaderUsername) {
      console.log('[Subscribe] Early return:', { currentUser: !!currentUser, currentVideo: !!currentVideo, isSelf: currentUser?.username === currentVideo?.uploaderUsername });
      return;
    }

    // Try to get uploaderId from video first (new API), then from users array (fallback)
    const uploader = users.find(u => u.username === currentVideo.uploaderUsername);
    const uploaderId = currentVideo.uploaderId || uploader?.id;

    console.log('[Subscribe] Attempting:', {
      uploaderUsername: currentVideo.uploaderUsername,
      videoUploaderId: currentVideo.uploaderId,
      uploaderFromUsers: uploader?.id,
      finalUploaderId: uploaderId,
      uploaderFound: !!uploader
    });

    if (!uploaderId) {
      console.error('[Subscribe] No uploader ID found for:', currentVideo.uploaderUsername);
      toast.error('Không thể tìm thấy thông tin người dùng. Vui lòng tải lại trang.');
      return;
    }

    setFollowAnimation(true);
    setTimeout(() => setFollowAnimation(false), 500);

    try {
      if (isSubscribed) {
        await dispatch(unfollowUserThunk({ userId: uploaderId, username: currentVideo.uploaderUsername }) as any).unwrap();
        toast.success('Đã bỏ follow');
      } else {
        await dispatch(followUserThunk({ userId: uploaderId, username: currentVideo.uploaderUsername }) as any).unwrap();
        toast.success(`Đã follow ${currentVideo.uploaderUsername}`);
      }
    } catch (error) {
      console.error('[Subscribe] Error:', error);
      toast.error('Không thể thực hiện thao tác');
    }
  };

  const handleCommentClick = () => {
    if (isSidebarOpen && rightTab === 'comments') {
      // Đang mở và đang ở tab comments → đóng
      setIsSidebarOpen(false);
    } else {
      // Mở và chuyển sang comments
      setIsSidebarOpen(true);
      setRightTab('comments');
      if (currentVideo) {
        dispatch(fetchCommentsThunk(currentVideo.id) as any);
      }
    }
  };

  const handleSuggestionsClick = () => {
    if (isSidebarOpen && rightTab === 'suggestions') {
      // Đang mở và đang ở tab suggestions → đóng
      setIsSidebarOpen(false);
    } else {
      // Mở và chuyển sang suggestions
      setIsSidebarOpen(true);
      setRightTab('suggestions');
    }
  };

  const goToNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const goToPrevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const formatCount = (count: number | undefined) => {
    if (!count || typeof count !== 'number') return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  // Main render with sidebar always visible
  const renderMainLayout = (content: React.ReactNode) => (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Left Sidebar - Always visible */}
      <div className="w-60 bg-black flex flex-col border-r border-zinc-900">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <img
            src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png"
            alt="ShortV Logo"
            className="w-6 h-6 object-contain"
          />
          <h1 className="text-white text-xl logo-text">shortv</h1>
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleSearchSubmit();
                }
              }}
              className="bg-zinc-900/50 border-zinc-800 text-white text-sm pl-9 pr-3 py-1.5 h-9"
              placeholder="Tìm kiếm"
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${activeTab === 'for-you' && !showExplorer ? 'bg-zinc-900/80 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900/40'
                }`}
              onClick={() => {
                setActiveTab('for-you');
                setShowExplorer(false);
                setShowFollowingList(false);
                setActiveSearchQuery('');
                onSearchQueryChange?.(''); // Clear parent search state
              }}
            >
              <Home className="w-5 h-5" />
              <span>Dành cho bạn</span>
            </button>

            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${showFollowingList ? 'bg-zinc-900/80 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900/40'
                }`}
              onClick={() => {
                setShowFollowingList(!showFollowingList);
                setActiveTab('for-you');
                setShowExplorer(false);
              }}
            >
              <Users className="w-5 h-5" />
              <span>Đã follow</span>
            </button>

            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${showExplorer ? 'bg-zinc-900/80 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900/40'
                }`}
              onClick={() => {
                setShowExplorer(true);
                setShowFollowingList(false);
                setActiveSearchQuery('');
                onSearchQueryChange?.(''); // Clear parent search state
              }}
            >
              <Compass className="w-5 h-5" />
              <span>Khám phá</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
              onClick={() => onNavigate?.('upload')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Tải lên</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
              onClick={() => onViewUserProfile?.(currentUser.username)}
            >
              <User className="w-5 h-5" />
              <span>Hồ sơ</span>
            </button>

            <div className="h-px bg-zinc-800 my-3" />

            <div className="text-zinc-500 text-xs px-3 mb-2 font-medium">Tài khoản đã follow</div>
            {followingUsernames.slice(0, 8).map((username) => {
              const user = users.find(u => u.username === username);
              return (
                <button
                  key={username}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors"
                  onClick={() => onViewUserProfile?.(username)}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={username} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                  )}
                  <span className="text-xs truncate">{user?.displayName || username}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* User Menu at Bottom */}
        <div className="p-3 border-t border-zinc-800" ref={userMenuRef}>
          <DropdownMenu open={showUserMenu} onOpenChange={setShowUserMenu}>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium">{currentUser.displayName}</p>
                  <p className="text-zinc-500 text-xs">@{currentUser.username}</p>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800">
              <DropdownMenuItem
                onClick={() => onViewUserProfile?.(currentUser.username)}
                className="text-white hover:bg-zinc-800 cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Xem hồ sơ</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => {
                  dispatch(logoutThunk());
                }}
                className="text-red-400 hover:bg-zinc-800 hover:text-red-300 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Center Content Area */}
      {content}
    </div>
  );

  // Loading state - only in center area
  if (!currentVideo) {
    return renderMainLayout(
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Đang tải videos...</p>
        </div>
      </div>
    );
  }

  // Empty state for following tab
  if (activeTab === 'following' && filteredVideos.length === 0) {
    return renderMainLayout(
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 92, 0.1)' }}>
            <Users className="w-12 h-12" style={{ color: '#ff3b5c' }} />
          </div>
          <h2 className="text-white text-2xl mb-3">Chưa có video nào</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {subscriptions[currentUser.username]?.length > 0
              ? 'Những người bạn follow chưa đăng video nào. Hãy khám phá thêm người sáng tạo mới!'
              : 'Bạn chưa follow ai. Hãy follow những người sáng tạo để xem video của họ!'}
          </p>
          <button
            onClick={() => setActiveTab('for-you')}
            className="px-6 py-3 rounded-lg text-white transition-all"
            style={{ backgroundColor: '#ff3b5c' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6344f'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff3b5c'}
          >
            Khám phá ngay
          </button>
        </div>
      </div>
    );
  }

  const isLiked = currentVideo.isLiked || false;

  // Handle search submit on Enter
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      setActiveSearchQuery(query);
      onSearchQueryChange?.(query); // Notify parent
      setShowExplorer(false);
      dispatch(searchVideosThunk({ query }) as any);
    }
  };

  // Show Explorer tab
  if (showExplorer) {
    return renderMainLayout(
      <ExplorerTab onUserClick={onViewUserProfile} />
    );
  }

  // Show search results if active query exists
  if (activeSearchQuery) {
    return (
      <div className="h-screen bg-black flex overflow-hidden">
        {/* Left Sidebar - Same as main */}
        <div className="w-60 bg-black flex flex-col border-r border-zinc-900">
          {/* Logo */}
          <div className="p-4 flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png"
              alt="ShortV Logo"
              className="w-6 h-6 object-contain"
            />
            <h1 className="text-white text-xl logo-text">shortv</h1>
          </div>

          {/* Search */}
          <div className="px-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800 text-white text-sm pl-9 pr-3 py-1.5 h-9"
                placeholder="Tìm kiếm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
              />
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <div className="px-2 space-y-1">
              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-zinc-400 hover:bg-zinc-900/40"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearchQuery('');
                  onSearchQueryChange?.(''); // Clear parent search state
                  setActiveTab('for-you');
                }}
              >
                <Home className="w-5 h-5" />
                <span>Dành cho bạn</span>
              </button>

              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-zinc-400 hover:bg-zinc-900/40"
                onClick={() => {
                  setSearchQuery('');
                  setShowFollowingList(true);
                }}
              >
                <Users className="w-5 h-5" />
                <span>Đã follow</span>
              </button>

              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                onClick={() => onNavigate?.('upload')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Tải lên</span>
              </button>

              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                onClick={() => onNavigate?.('profile')}
              >
                <User className="w-5 h-5" />
                <span>Hồ sơ</span>
              </button>
            </div>
          </ScrollArea>
        </div>

        {/* Search Results Content */}
        <SearchResults
          key={activeSearchQuery}
          searchQuery={activeSearchQuery}
          onVideoClick={(videoId) => {
            const videoIndex = videos.findIndex(v => v.id === videoId);
            if (videoIndex !== -1) {
              setCurrentVideoIndex(videoIndex);
            } else {
              // Video from search not in current feed. Add it!
              const searchVideo = searchResults.find(v => v.id === videoId);
              if (searchVideo) {
                dispatch(addVideo(searchVideo));
                setCurrentVideoIndex(0); // Since addVideo unshifts to start
              }
            }
            setSearchQuery('');
            setActiveSearchQuery('');
            onSearchQueryChange?.(''); // Clear parent search state
          }}
          onUserClick={(username) => {
            onViewUserProfile?.(username);
            // DON'T clear search - let parent manage this
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-60 bg-black flex flex-col border-r border-zinc-900">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <img
            src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png"
            alt="ShortV Logo"
            className="w-6 h-6 object-contain"
          />
          <h1 className="text-white text-xl logo-text">shortv</h1>
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800 text-white text-sm pl-9 pr-3 py-1.5 h-9"
              placeholder="Tìm kiếm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${activeTab === 'for-you' && !showExplorer ? 'bg-zinc-900/80 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900/40'
                }`}
              onClick={() => {
                setActiveTab('for-you');
                setShowExplorer(false);
                setShowFollowingList(false);
                setActiveSearchQuery('');
                onSearchQueryChange?.(''); // Clear parent search state
              }}
            >
              <Home className="w-5 h-5" />
              <span>Dành cho bạn</span>
            </button>

            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${showFollowingList ? 'bg-zinc-900/80 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900/40'
                }`}
              onClick={() => {
                setShowFollowingList(!showFollowingList);
                setActiveTab('for-you');
                setShowExplorer(false);
              }}
            >
              <Users className="w-5 h-5" />
              <span>Đã follow</span>
            </button>

            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${showExplorer ? 'bg-zinc-900/80 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900/40'
                }`}
              onClick={() => {
                setShowExplorer(true);
                setShowFollowingList(false);
                setActiveSearchQuery('');
                onSearchQueryChange?.(''); // Clear parent search state
              }}
            >
              <Compass className="w-5 h-5" />
              <span>Khám phá</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
              onClick={() => onNavigate?.('upload')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Tải lên</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
              onClick={() => onViewUserProfile?.(currentUser.username)}
            >
              <User className="w-5 h-5" />
              <span>Hồ sơ</span>
            </button>

            <div className="h-px bg-zinc-800 my-3" />

            <div className="text-zinc-500 text-xs px-3 mb-2 font-medium">Tài khoản đã follow</div>
            {followingUsernames.slice(0, 8).map((username) => {
              const user = users.find(u => u.username === username);
              return (
                <button
                  key={username}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors"
                  onClick={() => onViewUserProfile?.(username)}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={username} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                  )}
                  <span className="text-xs truncate">{user?.displayName || username}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Center Video Player */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Scrollable Video Container with snap */}
        <div
          ref={videoContainerRef}
          className="relative w-full max-w-[420px] h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
          style={{
            scrollBehavior: 'smooth',
          }}
        >
          {/* Render all videos */}
          {filteredVideos.map((video, index) => {
            const uploader = users.find(u => u.username === video.uploaderUsername);
            const isVideoLiked = video.isLiked || false;
            const isVideoSubscribed = uploader ? followingIds.includes(uploader.id) : followingUsernames.includes(video.uploaderUsername);

            return (
              <div
                key={video.id}
                ref={(el) => { videoRefs.current[index] = el; }}
                className="relative w-full h-screen flex items-center justify-center snap-start snap-always flex-shrink-0"
              >
                <div className="relative w-full h-[calc(100vh-80px)] bg-zinc-950 rounded-lg overflow-hidden">
                  <video
                    key={`${video.id}-${isMuted}`}
                    src={video.videoUrl}
                    poster={video.thumbnailUrl || `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=1400&fit=crop`}
                    muted={isMuted}
                    playsInline
                    autoPlay={index === currentVideoIndex && video.processing_status !== 'processing'}
                    controls={index === currentVideoIndex && video.processing_status !== 'processing'}
                    className={`w-full h-full object-cover ${video.processing_status === 'processing' ? 'blur-sm opacity-60' : ''}`}
                  />

                  {/* Processing Overlay */}
                  {video.processing_status === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                      <div className="text-center">
                        <Loader2 className="w-16 h-16 animate-spin text-white mx-auto mb-4" />
                        <p className="text-white text-lg font-semibold">Đang xử lý...</p>
                        <p className="text-gray-300 text-sm mt-2">Video sẽ sẵn sàng trong vài phút</p>
                      </div>
                    </div>
                  )}

                  {/* Failed Overlay */}
                  {video.processing_status === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 z-10">
                      <div className="text-center">
                        <X className="w-16 h-16 text-red-200 mx-auto mb-4" />
                        <p className="text-white text-lg font-semibold">Xử lý thất bại</p>
                        <p className="text-gray-200 text-sm mt-2">Video không thể phát</p>
                      </div>
                    </div>
                  )}

                  {/* Video Info Overlay (Bottom) */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
                    <p className="text-white mb-1 font-medium">{video.title}</p>
                    <p className="text-zinc-300 text-sm line-clamp-2">{video.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent video click/toggle
                          onViewUserProfile?.(uploader?.username || video.uploaderUsername);
                        }}
                        className="text-zinc-400 text-xs hover:text-white hover:underline transition-colors font-medium z-50 relative"
                      >
                        @{uploader?.username || video.uploaderUsername}
                      </button>
                      <span className="text-zinc-400 text-xs">· {new Date(video.uploadedAt || video.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Mute Button (Top Right) - Only show on current video */}
                  {index === currentVideoIndex && (
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side Action Buttons (Fixed position, always visible) */}
        <div className="absolute right-6 bottom-28 flex flex-col gap-4 items-center z-50">
          {/* Uploader Avatar with Follow Button */}
          <div className="relative">
            <button
              onClick={() => onViewUserProfile?.(currentVideo.uploaderUsername)}
              className="block"
            >
              {(currentVideo.uploaderAvatarUrl || uploaderInfo?.avatarUrl) ? (
                <img
                  src={currentVideo.uploaderAvatarUrl || uploaderInfo?.avatarUrl}
                  alt={currentVideo.uploaderUsername}
                  className="w-12 h-12 rounded-full object-cover border-2 border-zinc-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-zinc-400" />
                </div>
              )}
            </button>
            {currentUser.username !== currentVideo.uploaderUsername && (
              <button
                onClick={handleSubscribe}
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${followAnimation ? 'scale-125' : ''
                  }`}
                style={{ backgroundColor: '#ff3b5c' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6344f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff3b5c'}
              >
                {isSubscribed ? (
                  <Check className="w-4 h-4 text-white font-bold" strokeWidth={3} />
                ) : (
                  <Plus className="w-4 h-4 text-white font-bold" strokeWidth={3} />
                )}
              </button>
            )}
          </div>

          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${likeAnimation ? 'animate-bounce' : ''
              }`}>
              <Heart
                className={`w-7 h-7 transition-all duration-300 ${isLiked ? 'scale-110' : ''
                  }`}
                style={{
                  fill: isLiked ? '#ff3b5c' : 'none',
                  stroke: isLiked ? '#ff3b5c' : 'white',
                  strokeWidth: 2
                }}
              />
            </div>
            <span className="text-white text-xs font-medium">{formatCount(currentVideo.likes)}</span>
          </button>

          {/* Comment */}
          <button
            onClick={handleCommentClick}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">{formatCount(currentVideo.comments)}</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={() => {
              if (currentVideo) {
                dispatch(toggleSaveVideoThunk(currentVideo.id) as any);
                setIsBookmarked(!isBookmarked); // Optimistic toggle
                setBookmarkAnimation(true);
                setTimeout(() => setBookmarkAnimation(false), 500);
              }
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${bookmarkAnimation ? 'animate-bounce' : ''
              }`}>
              <Bookmark
                className={`w-7 h-7 transition-all duration-300 ${isBookmarked ? 'fill-yellow-500 text-yellow-500 scale-110' : 'text-white'
                  }`}
              />
            </div>
            <span className="text-white text-xs font-medium">Lưu</span>
          </button>

          {/* Share */}
          <div className="relative share-menu-container">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                <Share2 className="w-7 h-7 text-white" />
              </div>
              <span className="text-white text-xs font-medium">Chia sẻ</span>
            </button>

            {/* Share Menu */}
            {showShareMenu && currentVideo && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-50">
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('accessToken');
                      await copyVideoLink(currentVideo.id, token || undefined);
                      toast.success('Đã copy link video');
                      setShowShareMenu(false);
                    } catch (error) {
                      toast.error('Không thể copy link');
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
                <button
                  onClick={async () => {
                    try {
                      const url = generateShareUrl(currentVideo.id, 'facebook');
                      window.open(url, '_blank', 'width=600,height=400');
                      const token = localStorage.getItem('accessToken');
                      await shareVideoApi(currentVideo.id, 'facebook', token || undefined);
                      setShowShareMenu(false);
                    } catch (error) {
                      console.error('Share failed:', error);
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">📘</span>
                  Facebook
                </button>
                <button
                  onClick={async () => {
                    try {
                      const url = generateShareUrl(currentVideo.id, 'twitter');
                      window.open(url, '_blank', 'width=600,height=400');
                      const token = localStorage.getItem('accessToken');
                      await shareVideoApi(currentVideo.id, 'twitter', token || undefined);
                      setShowShareMenu(false);
                    } catch (error) {
                      console.error('Share failed:', error);
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">🐦</span>
                  Twitter
                </button>
                <button
                  onClick={async () => {
                    try {
                      const url = generateShareUrl(currentVideo.id, 'whatsapp');
                      window.open(url, '_blank', 'width=600,height=400');
                      const token = localStorage.getItem('accessToken');
                      await shareVideoApi(currentVideo.id, 'whatsapp', token || undefined);
                      setShowShareMenu(false);
                    } catch (error) {
                      console.error('Share failed:', error);
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">💬</span>
                  WhatsApp
                </button>
                <button
                  onClick={async () => {
                    try {
                      const url = generateShareUrl(currentVideo.id, 'telegram');
                      window.open(url, '_blank', 'width=600,height=400');
                      const token = localStorage.getItem('accessToken');
                      await shareVideoApi(currentVideo.id, 'telegram', token || undefined);
                      setShowShareMenu(false);
                    } catch (error) {
                      console.error('Share failed:', error);
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700 transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">✈️</span>
                  Telegram
                </button>
              </div>
            )}
          </div>

          {/* Report Video */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
              <Flag className="w-7 h-7 text-white group-hover:text-red-400 transition-colors" />
            </div>
            <span className="text-white text-xs font-medium group-hover:text-red-400 transition-colors">Báo cáo</span>
          </button>
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(255, 59, 92, 0.15)',
            border: '1px solid rgba(255, 59, 92, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 59, 92, 0.25)';
            e.currentTarget.style.borderColor = 'rgba(255, 59, 92, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 59, 92, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(255, 59, 92, 0.3)';
          }}
        >
          {isSidebarOpen ? (
            <ChevronRight className="w-5 h-5 text-white" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Right Sidebar - Recommendations & Comments */}
      <div
        className={`bg-black border-l border-zinc-900 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-96' : 'w-0'
          }`}
        style={{ overflow: isSidebarOpen ? 'visible' : 'hidden' }}
      >
        {isSidebarOpen && (
          <>
            {/* User Menu Header */}
            <div className="p-4 border-b border-zinc-800">
              <div className="relative mb-3 flex justify-end" ref={userMenuRef}>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900/50 px-3 py-1.5 rounded-full transition-all border border-zinc-800 hover:border-zinc-700"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.username}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  )}
                  <span className="text-white text-sm font-medium">{currentUser?.displayName || currentUser?.username}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </div>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        {currentUser?.avatarUrl ? (
                          <img
                            src={currentUser.avatarUrl}
                            alt={currentUser.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User className="w-5 h-5 text-zinc-400" />
                          </div>
                        )}
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-white text-sm font-medium truncate">{currentUser?.displayName || currentUser?.username}</span>
                          <span className="text-zinc-500 text-xs truncate">@{currentUser?.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onViewUserProfile?.(currentUser.username);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-zinc-800 transition-colors text-left group"
                      >
                        <User className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                        <span className="text-sm">Xem tài khoản</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          dispatch(logoutThunk());
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-zinc-800 transition-colors text-left group"
                      >
                        <LogOut className="w-4 h-4 group-hover:text-red-300 transition-colors" />
                        <span className="text-sm">Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-0 bg-zinc-900 rounded-lg p-1">
                <button
                  onClick={handleCommentClick}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${rightTab === 'comments' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  Bình luận
                </button>
                <button
                  onClick={handleSuggestionsClick}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${rightTab === 'suggestions' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  Bạn có thể thích
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {rightTab === 'comments' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  <div className="p-4 space-y-3">
                    {currentVideo.comments === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500 text-sm">Chưa có bình luận nào</p>
                        <p className="text-zinc-600 text-xs mt-1">Hãy là người đầu tiên bình luận</p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500 text-sm">{currentVideo.comments} bình luận</p>
                        <p className="text-zinc-600 text-xs mt-1">Chức năng xem chi tiết bình luận sẽ được cập nhật</p>
                      </div>
                    )}
                    {currentVideoComments && currentVideoComments.length > 0 && (
                      currentVideoComments.map(comment => {
                        const isOwnComment = currentUser?.id === comment.userId;
                        return (
                          <div key={comment.id} className="flex gap-3 group hover:bg-zinc-900/30 p-2 -mx-2 rounded-lg transition-colors">
                            {comment.userAvatarUrl ? (
                              <img src={comment.userAvatarUrl} alt={comment.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-zinc-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <p className="text-white text-sm font-medium">{comment.userDisplayName || comment.username}</p>
                                <p className="text-xs text-zinc-600">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-zinc-300 text-sm">{comment.text}</p>
                            </div>

                            {/* More Options Button */}
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                                    <MoreVertical className="w-4 h-4 text-zinc-400" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">

                                  <DropdownMenuItem
                                    onClick={() => {
                                      copyToClipboard(comment.text);
                                    }}
                                    className="text-zinc-300 hover:text-white hover:bg-zinc-800 focus:text-white focus:bg-zinc-800 cursor-pointer"
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy bình luận
                                  </DropdownMenuItem>

                                  {/* Chỉ hiển thị Báo cáo cho bình luận của người khác */}
                                  {!isOwnComment && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedComment({
                                          id: comment.id,
                                          text: comment.text,
                                          username: comment.username
                                        });
                                        setShowCommentReportModal(true);
                                      }}
                                      className="text-zinc-300 hover:text-white hover:bg-zinc-800 focus:text-white focus:bg-zinc-800 cursor-pointer"
                                    >
                                      <Flag className="w-4 h-4 mr-2" />
                                      Báo cáo
                                    </DropdownMenuItem>
                                  )}

                                  {/* Chỉ hiển thị Xóa cho bình luận của chính mình */}
                                  {isOwnComment && (
                                    <>
                                      <DropdownMenuSeparator className="bg-zinc-800" />
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-zinc-800 focus:text-red-300 focus:bg-zinc-800 cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Xóa
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-zinc-800 bg-black flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-1.5 border border-zinc-800">
                      <Input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-transparent border-0 text-white text-sm placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto"
                        placeholder="Thêm bình luận..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleComment();
                          }
                        }}
                      />
                      <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                        <AtSign className="w-4 h-4" />
                      </button>
                      <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>
                    <Button
                      onClick={handleComment}
                      disabled={!commentText.trim()}
                      className="bg-transparent hover:bg-transparent disabled:text-zinc-600 disabled:cursor-not-allowed px-4 font-medium h-auto py-0"
                      style={{ color: commentText.trim() ? '#ff3b5c' : undefined }}
                      onMouseEnter={(e) => { if (commentText.trim()) e.currentTarget.style.color = '#e6344f'; }}
                      onMouseLeave={(e) => { if (commentText.trim()) e.currentTarget.style.color = '#ff3b5c'; }}
                      size="sm"
                    >
                      Đăng
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {videos.filter(v => v.id !== currentVideo.id).slice(0, 12).map((video) => {
                      const uploader = users.find(u => u.username === video.uploaderUsername);
                      return (
                        <button
                          key={video.id}
                          onClick={() => setCurrentVideoIndex(videos.findIndex(v => v.id === video.id))}
                          className="w-full flex gap-3 p-2 rounded-lg hover:bg-zinc-900 transition-colors group"
                        >
                          <div className="w-20 h-28 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0">
                            <ImageWithFallback
                              src={video.thumbnailUrl || `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=300&fit=crop`}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-white text-sm line-clamp-2 mb-1 font-medium">{video.title}</p>
                            <p className="text-zinc-400 text-xs mb-2">{uploader?.displayName || video.uploaderUsername}</p>
                            <div className="flex items-center gap-3 text-zinc-500 text-xs">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {formatCount(video.likes.length)}
                              </span>
                              <span>{formatCount(video.views)} views</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </div>

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
                <p className="text-white">{currentVideo.title}</p>
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
                onClick={() => {
                  setShowVideoReportConfirm(true);
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

      {/* Comment Report Modal */}
      {showCommentReportModal && selectedComment && currentVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
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
            <AlertDialogDescription className="text-zinc-400" asChild>
              <div>
                Bạn có chắc chắn muốn gửi báo cáo này không? Hành động này không thể hoàn tác.
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-500 text-sm">
                    ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai sự thật có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn. Staff sẽ xem xét kỹ lưỡng báo cáo này.
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
                try {
                  const reasonMap: { [key: string]: string } = {
                    'spam': 'spam',
                    'inappropriate': 'other',
                    'violence': 'violence',
                    'harassment': 'harassment',
                    'copyright': 'copyright',
                    'other': 'other'
                  };
                  const validReason = reasonMap[reportType] || 'other';
                  await reportVideoApi(currentVideo.id, validReason, reportReason);
                  toast.success('Báo cáo đã được gửi thành công! Staff sẽ xem xét trong 24-48 giờ.');
                  setShowReportModal(false);
                  setShowVideoReportConfirm(false);
                  setReportReason('');
                  setReportType('spam');
                } catch (error: any) {
                  const errorMessage = error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.';
                  toast.error(errorMessage);
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
                Bạn có chắc chắn muốn báo cáo bình luận của <strong className="text-white">{selectedComment?.username}</strong> không? Hành động này không thể hoàn tác.
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-500 text-sm">
                    ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn. Hãy chắc chắn rằng bình luận này thực sự vi phạm quy định.
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
                if (selectedComment && currentVideo) {
                  try {
                    await reportCommentApi(selectedComment.id, `other: ${commentReportReason}`, commentReportReason);
                    toast.success('Báo cáo bình luận đã được gửi! Staff sẽ xem xét trong 24-48 giờ.');
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

      {/* Following List Modal - With Sidebar & Topbar */}
      {showFollowingList && (
        <div className="h-screen bg-black flex overflow-hidden fixed inset-0 z-50">
          {/* Left Sidebar */}
          <div className="w-60 bg-black flex flex-col border-r border-zinc-900">
            {/* Logo */}
            <div className="p-4 flex items-center gap-2">
              <img
                src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png"
                alt="ShortV Logo"
                className="w-6 h-6 object-contain"
              />
              <h1 className="text-white text-xl logo-text">shortv</h1>
            </div>

            {/* Search */}
            <div className="px-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 text-white text-sm pl-9 pr-3 py-1.5 h-9"
                  placeholder="Tìm kiếm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    }
                  }}
                />
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
              <div className="px-2 space-y-1">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-zinc-400 hover:bg-zinc-900/40"
                  onClick={() => {
                    setShowFollowingList(false);
                    setActiveTab('for-you');
                    setShowExplorer(false);
                  }}
                >
                  <Home className="w-5 h-5" />
                  <span>Dành cho bạn</span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm bg-zinc-900/80 text-white font-medium"
                >
                  <Users className="w-5 h-5" />
                  <span>Đã follow</span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                  onClick={() => {
                    setShowFollowingList(false);
                    setShowExplorer(true);
                    setActiveSearchQuery('');
                    onSearchQueryChange?.(''); // Clear parent search state
                  }}
                >
                  <Compass className="w-5 h-5" />
                  <span>Khám phá</span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                  onClick={() => {
                    setShowFollowingList(false);
                    onNavigate?.('upload');
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Tải lên</span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                  onClick={() => {
                    setShowFollowingList(false);
                    onViewUserProfile?.(currentUser.username);
                  }}
                >
                  <User className="w-5 h-5" />
                  <span>Hồ sơ</span>
                </button>
              </div>
            </ScrollArea>

            {/* User section at bottom */}
            <div className="p-3 border-t border-zinc-900">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-900/40 transition-colors"
                >
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-xs truncate">{currentUser.displayName || currentUser.username}</p>
                    <p className="text-zinc-500 text-xs truncate">@{currentUser.username}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                </button>

                {showUserMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl overflow-hidden">
                    <button
                      onClick={() => {
                        setShowFollowingList(false);
                        onViewUserProfile?.(currentUser.username);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-white hover:bg-zinc-800 transition-colors text-sm"
                    >
                      <User className="w-4 h-4" />
                      <span>Xem hồ sơ</span>
                    </button>
                    <button
                      onClick={() => {
                        dispatch(logoutThunk());
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-zinc-800 transition-colors text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-white text-xl logo-text">Đã follow</h2>
              <button
                onClick={() => setShowFollowingList(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Following List Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {(followingUsernames.length === 0) ? (
                  // Empty State
                  <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-24 h-24 rounded-full mb-6 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 92, 0.1)' }}>
                      <Users className="w-12 h-12" style={{ color: '#ff3b5c' }} />
                    </div>
                    <h3 className="text-white text-xl mb-2">Chưa follow ai</h3>
                    <p className="text-zinc-400 text-sm text-center">
                      Hãy khám phá và follow những người sáng tạo bạn yêu thích!
                    </p>
                  </div>
                ) : (
                  // Grid Layout - TikTok Style
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {followingUsernames.map((username) => {
                      const user = users.find(u => u.username === username);
                      const isCurrentlyFollowing = followingUsernames.includes(username);

                      return (
                        <div
                          key={username}
                          className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 transition-all border border-zinc-800 hover:border-zinc-700"
                        >
                          {/* Avatar */}
                          <button
                            onClick={() => {
                              setShowFollowingList(false);
                              onViewUserProfile?.(username);
                            }}
                            className="mb-3"
                          >
                            {user?.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={username}
                                className="w-20 h-20 rounded-full object-cover ring-2 ring-zinc-800 hover:ring-zinc-700 transition-all"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center ring-2 ring-zinc-700">
                                <User className="w-10 h-10 text-zinc-500" />
                              </div>
                            )}
                          </button>

                          {/* User Info */}
                          <button
                            onClick={() => {
                              setShowFollowingList(false);
                              onViewUserProfile?.(username);
                            }}
                            className="w-full text-center mb-3"
                          >
                            <p className="text-white font-medium truncate mb-0.5">
                              {user?.displayName || username}
                            </p>
                            <p className="text-zinc-500 text-xs truncate">@{username}</p>
                          </button>

                          {/* Follow/Unfollow Button */}
                          <button
                            onClick={() => {
                              if (isCurrentlyFollowing) {
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
                            }}
                            className={`w-full py-2 rounded-lg transition-all font-medium text-sm ${isCurrentlyFollowing
                              ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                              : 'text-white hover:opacity-90'
                              }`}
                            style={isCurrentlyFollowing ? {} : { backgroundColor: '#ff3b5c' }}
                            onMouseEnter={(e) => {
                              if (!isCurrentlyFollowing) e.currentTarget.style.backgroundColor = '#e6344f';
                            }}
                            onMouseLeave={(e) => {
                              if (!isCurrentlyFollowing) e.currentTarget.style.backgroundColor = '#ff3b5c';
                            }}
                          >
                            {isCurrentlyFollowing ? 'Đang follow' : 'Follow'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}