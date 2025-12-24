import React, { useState, useRef, useEffect } from 'react';
import { useRecommendations } from '../../hooks/useRecommendations';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { 
    Compass, Loader2, Play, Heart, MessageCircle, Send, Eye, 
    Volume2, VolumeX, Bookmark, Share2, X, ChevronDown, ChevronUp,
    Flag, Copy, MoreHorizontal, UserPlus
} from 'lucide-react';
import { 
    getCommentsApi, 
    addCommentApi, 
    likeVideoApi, 
    unlikeVideoApi, 
    toggleSaveVideoApi,
    Comment 
} from '../../api/interactionVideo';
import { toast } from 'sonner';

interface Video {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    thumbnailUrl?: string;
    video_url?: string;
    videoUrl?: string;
    views: number;
    likes?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    uploaderUsername?: string;
    uploaderDisplayName?: string;
    uploaderAvatarUrl?: string;
}

interface ExplorerTabProps {
    currentVideoId: string | null;
    onVideoClick: (videoId: string) => void;
}

export function ExplorerTab({ currentVideoId, onVideoClick }: ExplorerTabProps) {
    const dispatch = useAppDispatch();
    const { explorerQueue, loading, error } = useRecommendations(currentVideoId);
    const currentUser = useAppSelector((state) => state.auth.currentUser);
    const users = useAppSelector((state) => state.users.allUsers);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalVideoIndex, setModalVideoIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Comments state
    const [explorerComments, setExplorerComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'creator'>('comments');
    
    // Interaction state - track local likes/saves with counts
    const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
    const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
    const [isLiking, setIsLiking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Limit displayed videos for performance
    const [displayLimit, setDisplayLimit] = useState(12);
    const displayedVideos = explorerQueue.slice(0, displayLimit);
    
    const getThumbnailUrl = (video: Video): string => {
        const url = video.thumbnailUrl || video.thumbnail_url || '';
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:9000/clipiq-thumbnails/${url}`;
    };
    
    const getVideoUrl = (video: Video): string => {
        const url = video.videoUrl || video.video_url || '';
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:9000/clipiq-videos/${url}`;
    };

    const modalVideo = explorerQueue[modalVideoIndex];

    const openModal = (index: number) => {
        setModalVideoIndex(index);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Pause all videos when closing modal
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = '';
        }
    };

    // Cleanup when component unmounts or tab changes
    useEffect(() => {
        return () => {
            // Pause video when leaving the tab
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = '';
            }
        };
    }, []);

    // Initialize liked/saved state from video data
    useEffect(() => {
        if (explorerQueue.length > 0) {
            const initialLiked = new Set<string>();
            const initialSaved = new Set<string>();
            const initialLikeCounts: Record<string, number> = {};
            
            explorerQueue.forEach((video) => {
                if (video.isLiked) initialLiked.add(video.id);
                if (video.isSaved) initialSaved.add(video.id);
                initialLikeCounts[video.id] = video.likes || 0;
            });
            
            setLikedVideos(initialLiked);
            setSavedVideos(initialSaved);
            setLikeCounts(initialLikeCounts);
        }
    }, [explorerQueue]);

    // Fetch comments
    useEffect(() => {
        if (isModalOpen && modalVideo?.id) {
            setCommentsLoading(true);
            getCommentsApi(modalVideo.id)
                .then(response => setExplorerComments(response.data || []))
                .catch(() => setExplorerComments([]))
                .finally(() => setCommentsLoading(false));
        }
    }, [modalVideo?.id, isModalOpen]);

    // Auto-play video in modal
    useEffect(() => {
        if (isModalOpen && videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    }, [modalVideoIndex, isModalOpen]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !modalVideo) return;
        try {
            const response = await addCommentApi(modalVideo.id, commentText.trim());
            setExplorerComments(prev => [response.data, ...prev]);
            setCommentText('');
            toast.success('Đã thêm bình luận');
        } catch {
            toast.error('Không thể thêm bình luận');
        }
    };

    const handleLike = async (videoId: string) => {
        if (isLiking) return;
        if (!currentUser) {
            toast.error('Vui lòng đăng nhập để thích video');
            return;
        }

        setIsLiking(true);
        const isCurrentlyLiked = likedVideos.has(videoId);
        
        // Optimistic update
        setLikedVideos(prev => {
            const newSet = new Set(prev);
            if (isCurrentlyLiked) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            return newSet;
        });
        setLikeCounts(prev => ({
            ...prev,
            [videoId]: (prev[videoId] || 0) + (isCurrentlyLiked ? -1 : 1)
        }));

        try {
            if (isCurrentlyLiked) {
                await unlikeVideoApi(videoId);
                toast.success('Đã bỏ thích');
            } else {
                await likeVideoApi(videoId);
                toast.success('Đã thích video');
            }
        } catch (error) {
            // Revert on error
            setLikedVideos(prev => {
                const newSet = new Set(prev);
                if (isCurrentlyLiked) {
                    newSet.add(videoId);
                } else {
                    newSet.delete(videoId);
                }
                return newSet;
            });
            setLikeCounts(prev => ({
                ...prev,
                [videoId]: (prev[videoId] || 0) + (isCurrentlyLiked ? 1 : -1)
            }));
            toast.error('Không thể thực hiện thao tác');
        } finally {
            setIsLiking(false);
        }
    };

    const handleSave = async (videoId: string) => {
        if (isSaving) return;
        if (!currentUser) {
            toast.error('Vui lòng đăng nhập để lưu video');
            return;
        }

        setIsSaving(true);
        const isCurrentlySaved = savedVideos.has(videoId);

        // Optimistic update
        setSavedVideos(prev => {
            const newSet = new Set(prev);
            if (isCurrentlySaved) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            return newSet;
        });

        try {
            const response = await toggleSaveVideoApi(videoId);
            if (response.data.isSaved) {
                toast.success('Đã lưu video');
            } else {
                toast.success('Đã bỏ lưu');
            }
            // Update state based on server response
            setSavedVideos(prev => {
                const newSet = new Set(prev);
                if (response.data.isSaved) {
                    newSet.add(videoId);
                } else {
                    newSet.delete(videoId);
                }
                return newSet;
            });
        } catch (error) {
            // Revert on error
            setSavedVideos(prev => {
                const newSet = new Set(prev);
                if (isCurrentlySaved) {
                    newSet.add(videoId);
                } else {
                    newSet.delete(videoId);
                }
                return newSet;
            });
            toast.error('Không thể thực hiện thao tác');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFollow = (username: string) => {
        setFollowedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(username)) {
                newSet.delete(username);
                toast.success('Đã hủy theo dõi');
            } else {
                newSet.add(username);
                toast.success('Đã theo dõi');
            }
            return newSet;
        });
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Đã sao chép link');
    };

    const handleReport = () => {
        toast.success('Đã gửi báo cáo');
    };

    const formatCount = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    // Loading/Error/Empty states
    if (loading && explorerQueue.length === 0) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6">
                <Compass className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-white text-lg mb-2">Không thể tải recommendations</p>
                <p className="text-zinc-400 text-sm">{error}</p>
            </div>
        );
    }

    if (explorerQueue.length === 0) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6">
                <Compass className="w-16 h-16 text-zinc-600 mb-4" />
                <h3 className="text-white text-xl mb-2">Chưa có video gợi ý</h3>
                <p className="text-zinc-400 text-sm text-center max-w-xs">
                    Lướt qua các video ở tab "Dành cho bạn" để nhận được gợi ý!
                </p>
            </div>
        );
    }

    return (
        <>
            {/* GRID VIEW - 6 columns like TikTok */}
            <div className="absolute inset-0 bg-black overflow-y-auto">
                <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {displayedVideos.map((video, index) => {
                            const isLiked = likedVideos.has(video.id);
                            
                            return (
                                <div
                                    key={video.id}
                                    className="group cursor-pointer"
                                    onClick={() => openModal(index)}
                                >
                                    {/* Thumbnail - using image instead of video for performance */}
                                    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-zinc-900">
                                        <img
                                            src={getThumbnailUrl(video) || `https://images.unsplash.com/photo-${Math.abs((video.id?.charCodeAt(0) || 0) * 1000 + (video.id?.charCodeAt(1) || 0) * 100)}?w=300&h=500&fit=crop`}
                                            alt={video.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                        
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        {/* Play icon */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                                                <Play className="w-6 h-6 text-white fill-white" />
                                            </div>
                                        </div>
                                        
                                        {/* Like count */}
                                        <div className="absolute bottom-2 left-2 flex items-center gap-1">
                                            <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                                            <span className="text-white text-sm font-semibold drop-shadow-lg">
                                                {formatCount(likeCounts[video.id] ?? video.likes ?? video.views ?? 0)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Video info */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-xs font-bold">
                                                {video.title?.charAt(0).toUpperCase() || 'V'}
                                            </span>
                                        </div>
                                        <p className="text-white text-sm font-medium truncate">
                                            {video.title || 'Video'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Load more button */}
                    {displayLimit < explorerQueue.length && (
                        <div className="flex justify-center py-6">
                            <button
                                onClick={() => setDisplayLimit(prev => prev + 12)}
                                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                            >
                                Xem thêm ({explorerQueue.length - displayLimit} video)
                            </button>
                        </div>
                    )}
                    
                    {loading && (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL - TikTok style Dark Theme */}
            {isModalOpen && modalVideo && (
                <div className="fixed inset-0 z-[100] flex bg-black">
                    {/* Close button - prominent */}
                    <button
                        onClick={closeModal}
                        className="absolute top-4 left-4 z-50 p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                        <X className="w-7 h-7 text-white" />
                    </button>

                    {/* Video Section - Single video with scroll navigation */}
                    <div 
                        className="flex-1 relative overflow-hidden flex items-center justify-center"
                        onWheel={(e) => {
                            e.preventDefault();
                            if (e.deltaY > 0 && modalVideoIndex < explorerQueue.length - 1) {
                                // Scroll down - next video
                                setModalVideoIndex(modalVideoIndex + 1);
                            } else if (e.deltaY < 0 && modalVideoIndex > 0) {
                                // Scroll up - previous video
                                setModalVideoIndex(modalVideoIndex - 1);
                            }
                        }}
                    >
                        {/* Single video player */}
                        <div className="relative max-w-[500px] w-full h-full max-h-[90vh] bg-zinc-950 rounded-xl overflow-hidden m-8">
                            <video
                                ref={videoRef}
                                key={modalVideo.id}
                                src={getVideoUrl(modalVideo)}
                                poster={getThumbnailUrl(modalVideo)}
                                muted={isMuted}
                                loop
                                playsInline
                                autoPlay
                                className="w-full h-full object-contain"
                                onClick={() => {
                                    if (videoRef.current?.paused) videoRef.current.play();
                                    else videoRef.current?.pause();
                                }}
                            />
                            
                            {/* Video info overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                <p className="text-white font-semibold mb-1">{modalVideo.title}</p>
                                <p className="text-zinc-300 text-sm line-clamp-2">{modalVideo.description}</p>
                            </div>
                            
                            {/* Mute button */}
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="absolute bottom-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                            </button>
                            
                            {/* Video counter */}
                            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                                {modalVideoIndex + 1} / {explorerQueue.length}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Dark Theme */}
                    <div className="w-[360px] bg-zinc-900 border-l border-zinc-800 flex flex-col">
                        {/* User info */}
                        <div className="p-4 border-b border-zinc-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                                        <span className="text-white font-bold">
                                            {modalVideo.title?.charAt(0).toUpperCase() || 'V'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">
                                            {modalVideo.uploaderUsername || 'creator'}
                                        </p>
                                        <p className="text-sm text-zinc-400">
                                            {modalVideo.uploaderDisplayName || modalVideo.title}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFollow(modalVideo.uploaderUsername || '')}
                                    className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-colors ${
                                        followedUsers.has(modalVideo.uploaderUsername || '')
                                            ? 'bg-zinc-700 text-white'
                                            : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                >
                                    {followedUsers.has(modalVideo.uploaderUsername || '') ? 'Đang follow' : 'Follow'}
                                </button>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-6 mt-4">
                                <button
                                    onClick={() => handleLike(modalVideo.id)}
                                    disabled={isLiking}
                                    className="flex items-center gap-1"
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                        likedVideos.has(modalVideo.id) ? 'bg-red-500/20' : 'bg-zinc-800'
                                    }`}>
                                        <Heart className={`w-4 h-4 transition-colors ${
                                            likedVideos.has(modalVideo.id) ? 'text-red-500 fill-red-500' : 'text-white'
                                        }`} />
                                    </div>
                                    <span className="text-sm font-semibold text-white">
                                        {formatCount(likeCounts[modalVideo.id] ?? modalVideo.likes ?? 0)}
                                    </span>
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <MessageCircle className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm font-semibold text-white">
                                        {explorerComments.length}
                                    </span>
                                </div>
                                
                                <button
                                    onClick={() => handleSave(modalVideo.id)}
                                    disabled={isSaving}
                                    className="flex items-center gap-1"
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                        savedVideos.has(modalVideo.id) ? 'bg-yellow-500/20' : 'bg-zinc-800'
                                    }`}>
                                        <Bookmark className={`w-4 h-4 transition-colors ${
                                            savedVideos.has(modalVideo.id) ? 'text-yellow-500 fill-yellow-500' : 'text-white'
                                        }`} />
                                    </div>
                                </button>
                            </div>

                            {/* Share & Report */}
                            <div className="flex items-center gap-2 mt-4">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-white"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span className="text-sm font-medium">Sao chép link</span>
                                </button>
                                <button
                                    onClick={handleReport}
                                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-white"
                                >
                                    <Flag className="w-4 h-4" />
                                    <span className="text-sm font-medium">Báo cáo</span>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-zinc-800">
                            <button
                                onClick={() => setActiveTab('comments')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                                    activeTab === 'comments'
                                        ? 'text-white border-b-2 border-white'
                                        : 'text-zinc-500 hover:text-white'
                                }`}
                            >
                                Bình luận ({explorerComments.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('creator')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                                    activeTab === 'creator'
                                        ? 'text-white border-b-2 border-white'
                                        : 'text-zinc-500 hover:text-white'
                                }`}
                            >
                                Video của creator
                            </button>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {commentsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                                </div>
                            ) : explorerComments.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-500">Chưa có bình luận</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {explorerComments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                                                {comment.userAvatarUrl ? (
                                                    <img src={comment.userAvatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    <span className="text-white text-sm font-medium">
                                                        {(comment.userDisplayName || comment.username)?.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm text-white">
                                                    {comment.userDisplayName || comment.username}
                                                </p>
                                                <p className="text-sm text-zinc-300 mt-0.5">{comment.text}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                                    <span>{formatTimeAgo(comment.createdAt)}</span>
                                                    <button className="hover:text-white">Trả lời</button>
                                                </div>
                                            </div>
                                            <button className="text-zinc-500 hover:text-red-500">
                                                <Heart className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comment Input - Dark */}
                        <form onSubmit={handleCommentSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Thêm bình luận..."
                                    className="flex-1 px-4 py-2.5 bg-zinc-800 text-white placeholder-zinc-500 rounded-full text-sm outline-none focus:ring-2 focus:ring-zinc-600"
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim()}
                                    className="text-red-500 font-semibold text-sm disabled:text-zinc-600"
                                >
                                    Đăng
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    return `${Math.floor(seconds / 604800)} tuần trước`;
}
