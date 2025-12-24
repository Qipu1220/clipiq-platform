import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateDisplayName, updateAvatar, logoutThunk, updateProfileThunk } from '../../store/authSlice';
import { updateUserDisplayName, updateUserAvatar } from '../../store/usersSlice';
import { fetchUserVideosThunk, fetchLikedVideosThunk, fetchSavedVideosThunk, setVideos, setFocusedVideoId } from '../../store/videosSlice';
import {
    Play, Search, Home, Compass, Users, Video, User,
    Share2, Settings, Upload, Heart, Eye, LogOut, ChevronDown,
    X, Image as ImageIcon, Bookmark
} from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface UserProfileProps {
    onVideoClick?: (videoId: string) => void;
    onNavigateHome?: () => void;
    onNavigateUpload?: () => void;
}

export function UserProfile({ onVideoClick, onNavigateHome, onNavigateUpload }: UserProfileProps) {
    const dispatch = useDispatch();
    const currentUser = useSelector((state: RootState) => state.auth.currentUser);
    const { userVideos, likedVideos, savedVideos } = useSelector((state: RootState) => state.videos);
    const users = useSelector((state: RootState) => state.users.allUsers);
    const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'videos' | 'favorites' | 'liked'>('videos');
    const [sortBy, setSortBy] = useState<'newest' | 'trending' | 'oldest'>('newest');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [bio, setBio] = useState(currentUser?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
    const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatarUrl || '');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Fetch data based on active tab
    useEffect(() => {
        if (!currentUser) return;

        // Always fetch user videos initially
        dispatch(fetchUserVideosThunk(currentUser.username) as any);

        if (activeTab === 'liked') {
            dispatch(fetchLikedVideosThunk() as any);
        } else if (activeTab === 'favorites') {
            dispatch(fetchSavedVideosThunk() as any);
        }
    }, [dispatch, currentUser, activeTab]);

    const myVideos = userVideos || [];

    // Calculate stats
    const followingCount = subscriptions[currentUser?.username || '']?.length || 0;
    const followerCount = Object.values(subscriptions).filter(
        subs => subs.includes(currentUser?.username || '')
    ).length;
    const totalLikes = myVideos.reduce((sum, video) => sum + (typeof video.likes === 'number' ? video.likes : 0), 0);

    // Sort videos
    const sortVideos = (vids: typeof userVideos) => {
        const sorted = [...(vids || [])];
        if (sortBy === 'newest') {
            return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        } else if (sortBy === 'oldest') {
            return sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        } else {
            return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
        }
    };

    const displayVideos = activeTab === 'videos'
        ? sortVideos(myVideos)
        : activeTab === 'liked'
            ? sortVideos(likedVideos || [])
            : sortVideos(savedVideos || []);

    // Click outside to close user menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước file phải nhỏ hơn 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setAvatarUrl(result);
                setAvatarPreview(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser) return;

        try {
            const updates: any = {};
            if (displayName.trim() && displayName !== currentUser.displayName) {
                updates.displayName = displayName;
            }
            if (bio !== currentUser.bio) {
                updates.bio = bio;
            }
            if (avatarUrl && avatarUrl !== currentUser.avatarUrl) {
                updates.avatarUrl = avatarUrl;
            }

            if (Object.keys(updates).length > 0) {
                await dispatch(updateProfileThunk(updates) as any).unwrap();

                // Also update local users list for consistency (optional)
                if (updates.displayName) {
                    dispatch(updateUserDisplayName({ username: currentUser.username, displayName: updates.displayName }));
                }
                if (updates.avatarUrl) {
                    dispatch(updateUserAvatar({ username: currentUser.username, avatarUrl: updates.avatarUrl }));
                }

                toast.success('Cập nhật hồ sơ thành công!');
                setShowEditModal(false);
            }
        } catch (error) {
            toast.error('Cập nhật thất bại');
            console.error(error);
        }
    };

    const formatCount = (count: number) => {
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

    return (
        <div className="h-screen bg-black flex overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-60 bg-black flex flex-col border-r border-zinc-900">
                {/* Logo */}
                <div className="p-4 flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
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
                        />
                    </div>
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1">
                    <div className="px-2 space-y-1">
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                            onClick={onNavigateHome}
                        >
                            <Home className="w-5 h-5" />
                            <span>Dành cho bạn</span>
                        </button>

                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm">
                            <Users className="w-5 h-5" />
                            <span>Đã follow</span>
                        </button>

                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                            onClick={onNavigateHome}
                        >
                            <Compass className="w-5 h-5" />
                            <span>Khám phá</span>
                        </button>

                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors text-sm"
                            onClick={onNavigateUpload}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span>Tải lên</span>
                        </button>

                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-zinc-900/80 text-white font-medium transition-colors text-sm">
                            <User className="w-5 h-5" />
                            <span>Hồ sơ</span>
                        </button>

                        <div className="h-px bg-zinc-800 my-3" />

                        <div className="text-zinc-500 text-xs px-3 mb-2 font-medium">Tài khoản đã follow</div>
                        {subscriptions[currentUser.username]?.slice(0, 8).map((username) => {
                            const user = users.find(u => u.username === username);
                            return (
                                <button
                                    key={username}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-900/40 transition-colors"
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar with User Menu */}
                <div className="p-4 border-b border-zinc-900 flex justify-end flex-shrink-0">
                    <div className="relative" ref={userMenuRef}>
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
                            <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
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

                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            dispatch(logoutThunk());
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-left group"
                                        style={{ color: '#ff3b5c' }}
                                    >
                                        <LogOut className="w-4 h-4 transition-colors" style={{ color: '#ff3b5c' }} />
                                        <span className="text-sm">Đăng xuất</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-8 py-8">
                        {/* Profile Header */}
                        <div className="flex gap-8 mb-8">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                {currentUser?.avatarUrl ? (
                                    <img
                                        src={currentUser.avatarUrl}
                                        alt={currentUser.username}
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
                                    <h1 className="text-white text-2xl font-medium">{currentUser?.displayName || currentUser?.username}</h1>
                                    <span className="text-zinc-500">@{currentUser?.username}</span>
                                </div>

                                <div className="flex gap-3 mb-4">
                                    <Button
                                        onClick={() => setShowEditModal(true)}
                                        className="text-white px-6"
                                        style={{ backgroundColor: '#ff3b5c' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6315a'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff3b5c'}
                                    >
                                        Sửa hồ sơ
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800 px-4"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>

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
                                    {currentUser?.bio || 'Chưa có tiểu sử.'}
                                </p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-zinc-800 mb-6">
                            <div className="flex gap-8">
                                <button
                                    onClick={() => setActiveTab('videos')}
                                    className={`pb-3 px-1 border-b-2 transition-colors ${activeTab === 'videos'
                                        ? 'border-white text-white font-medium'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4" />
                                        <span>Video</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('favorites')}
                                    className={`pb-3 px-1 border-b-2 transition-colors ${activeTab === 'favorites'
                                        ? 'border-white text-white font-medium'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Bookmark className="w-4 h-4" />
                                        <span>Đã lưu</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('liked')}
                                    className={`pb-3 px-1 border-b-2 transition-colors ${activeTab === 'liked'
                                        ? 'border-white text-white font-medium'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-4 h-4" />
                                        <span>Đã thích</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Sort Buttons */}


                        {/* Videos Grid */}
                        {displayVideos.length === 0 ? (
                            <div className="text-center py-20">
                                {activeTab === 'videos' && <Video className="w-16 h-16 text-zinc-700 mx-auto mb-4" />}
                                {activeTab === 'liked' && <Heart className="w-16 h-16 text-zinc-700 mx-auto mb-4" />}
                                {activeTab === 'favorites' && <Bookmark className="w-16 h-16 text-zinc-700 mx-auto mb-4" />}
                                <p className="text-zinc-500">
                                    {activeTab === 'videos' && 'Chưa có video nào'}
                                    {activeTab === 'liked' && 'Chưa có video đã thích'}
                                    {activeTab === 'favorites' && 'Chưa có video đã lưu'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {displayVideos.map(video => (
                                    <div
                                        key={video.id}
                                        className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer group"
                                        onClick={() => {
                                            if (displayVideos.length > 0) {
                                                dispatch(setVideos(displayVideos));
                                                dispatch(setFocusedVideoId(video.id));
                                            }
                                            onVideoClick?.(video.id);
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
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-zinc-800">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900">
                            <h2 className="text-white text-xl font-medium">Sửa hồ sơ</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Avatar */}
                            <div>
                                <Label className="text-zinc-300 mb-3 block">Ảnh đại diện</Label>
                                {avatarPreview && (
                                    <div className="mb-3 flex justify-center">
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar preview"
                                            className="w-24 h-24 rounded-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 w-full"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Chọn ảnh
                                    </Button>
                                    <p className="text-xs text-zinc-500 text-center">Hoặc nhập URL ảnh:</p>
                                    <Input
                                        value={avatarUrl}
                                        onChange={(e) => {
                                            setAvatarUrl(e.target.value);
                                            setAvatarPreview(e.target.value);
                                        }}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="https://example.com/avatar.jpg"
                                    />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>

                            {/* Display Name */}
                            <div>
                                <Label className="text-zinc-300 mb-2 block">Tên hiển thị</Label>
                                <Input
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="Nhập tên hiển thị"
                                />
                            </div>

                            {/* Bio */}
                            <div>
                                <Label className="text-zinc-300 mb-2 block">Tiểu sử</Label>
                                <Textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white resize-none"
                                    placeholder="Giới thiệu về bản thân..."
                                    rows={4}
                                />
                            </div>

                            {/* Save Button */}
                            <div className="pt-4">
                                <Button
                                    onClick={handleSaveProfile}
                                    className="text-white w-full"
                                    style={{ backgroundColor: '#ff3b5c' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6315a'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff3b5c'}
                                >
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}