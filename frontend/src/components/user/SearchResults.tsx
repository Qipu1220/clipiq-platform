import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  Heart, User, Play, Search
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface SearchResultsProps {
  searchQuery: string;
  onVideoClick: (videoId: string) => void;
  onUserClick: (username: string) => void;
}

export function SearchResults({ searchQuery, onVideoClick, onUserClick }: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<'top' | 'users'>('top');
  const videos = useSelector((state: RootState) => state.videos.videos);
  const users = useSelector((state: RootState) => state.users.allUsers);

  // Filter videos based on search query
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.uploaderUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter(user => user.role === 'user'); // Only show regular users

  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* Search Tabs */}
      <div className="border-b border-zinc-900/50 bg-black sticky top-0 z-10">
        <div className="flex items-center gap-8 px-6">
          <button
            onClick={() => setActiveTab('top')}
            className={`py-4 relative transition-colors ${
              activeTab === 'top' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <span className="font-medium">Top</span>
            {activeTab === 'top' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 relative transition-colors ${
              activeTab === 'users' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <span className="font-medium">Người dùng</span>
            {activeTab === 'users' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
        </div>
      </div>

      {/* Search Results Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Videos Tab */}
        {activeTab === 'top' && (
          <div className="p-6">
            {filteredVideos.length > 0 ? (
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
                        onClick={() => onVideoClick(video.id)}
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
                            {uploader?.avatarUrl ? (
                              <img 
                                src={uploader.avatarUrl} 
                                alt={uploader.username}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                                <User className="w-3 h-3 text-zinc-600" />
                              </div>
                            )}
                            <span className="text-zinc-400 text-xs truncate">
                              {uploader?.displayName || video.uploaderUsername}
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
                            <span>{user.followers?.toLocaleString() || 0} Followers</span>
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
    </div>
  );
}