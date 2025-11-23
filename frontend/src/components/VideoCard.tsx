import { Video } from '../store/videosSlice';
import { Eye, Heart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatCount, formatTimeAgo, formatDuration } from '../utils/formatters';

interface VideoCardProps {
  video: Video;
  onClick: () => void;
}

export function VideoCard({ video, onClick }: VideoCardProps) {
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
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
        {video.status === 'flagged' && (
          <div className="absolute top-2 left-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
            Flagged
          </div>
        )}
        {video.status === 'deleted' && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
            Deleted
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-white line-clamp-2 group-hover:text-red-500 transition-colors">
          {video.title}
        </h3>
        <p className="text-zinc-400 text-sm">{video.uploaderUsername}</p>
        <div className="flex items-center gap-3 text-zinc-500 text-sm">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatCount(video.views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {formatCount(video.likes.length)}
          </span>
          <span>{formatTimeAgo(video.uploadDate)}</span>
        </div>
      </div>
    </div>
  );
}