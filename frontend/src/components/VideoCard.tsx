import { Video } from '../store/videosSlice';
import { Eye, Heart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface VideoCardProps {
  video: Video;
  onClick: () => void;
}

export function VideoCard({ video, onClick }: VideoCardProps) {
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDate = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div 
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative bg-zinc-800 rounded-lg overflow-hidden aspect-video mb-2">
        <ImageWithFallback
          src={video.thumbnailUrl || `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=225&fit=crop`}
          alt={video.title}
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
        />
      </div>
      
      <div className="space-y-1">
        <h3 className="text-white line-clamp-2 group-hover:text-red-500 transition-colors">
          {video.title}
        </h3>
        <p className="text-zinc-400 text-sm">{video.uploader}</p>
        <div className="flex items-center gap-3 text-zinc-500 text-sm">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatViews(video.views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {video.likes.length}
          </span>
          <span>{formatDate(video.uploadDate)}</span>
        </div>
      </div>
    </div>
  );
}
