import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { SearchBar } from '../SearchBar';
import { VideoCard } from '../VideoCard';

interface HomePageProps {
  onVideoClick: (videoId: string) => void;
}

export function HomePage({ onVideoClick }: HomePageProps) {
  const videos = useSelector((state: RootState) => state.videos.videos);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'nor' | 'em'>('nor');

  const handleSearch = (query: string, mode: 'nor' | 'em', ocr?: string, asr?: string) => {
    setSearchQuery(query.toLowerCase());
    setSearchMode(mode);
    // In a real app, OCR and ASR would filter results differently
    console.log('Search mode:', mode, 'Query:', query, 'OCR:', ocr, 'ASR:', asr);
  };

  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    return videos.filter(video =>
      video.title.toLowerCase().includes(searchQuery) ||
      video.uploader.toLowerCase().includes(searchQuery) ||
      video.description.toLowerCase().includes(searchQuery)
    );
  }, [videos, searchQuery]);

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <SearchBar onSearch={handleSearch} />

        <div className="mt-8">
          <h2 className="text-white text-xl mb-4">
            {searchQuery ? `Search Results (${filteredVideos.length})` : 'Recommended Videos'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => onVideoClick(video.id)}
              />
            ))}
          </div>
          {filteredVideos.length === 0 && (
            <p className="text-zinc-500 text-center py-12">No videos found</p>
          )}
        </div>
      </div>
    </div>
  );
}
