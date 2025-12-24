import { useState, useEffect, useCallback } from 'react';
import { recommendationApi } from '../api/recommendationApi';

interface Video {
    id: string;
    title: string;
    description?: string;
    uploader_id?: string;
    uploaderId?: string;
    thumbnail_url?: string;
    thumbnailUrl?: string;
    video_url?: string;
    videoUrl?: string;
    duration?: number;
    views: number;
    likes?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    category_id?: string;
    categoryId?: string;
    upload_date?: string;
    uploadDate?: string;
    uploaderUsername?: string;
    uploaderDisplayName?: string;
    uploaderAvatarUrl?: string;
}

export function useRecommendations(currentVideoId: string | null) {
    const [explorerQueue, setExplorerQueue] = useState<Video[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch explorer feed (all videos ranked by engagement)
    const fetchExplorerFeed = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await recommendationApi.getExplorerFeed(50, 1);
            console.log('🧭 Explorer API response:', response);
            
            const videos = response.data?.videos || response.videos || [];
            console.log('🧭 Explorer videos:', videos.length);

            setExplorerQueue(videos);
        } catch (err: any) {
            console.error('Error fetching explorer feed:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch explorer feed';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch similar videos when currentVideoId changes (for suggestions sidebar)
    const fetchSimilarVideos = useCallback(async (videoId: string) => {
        if (!videoId) return;

        // Check if user is authenticated
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setError('Vui lòng đăng nhập để xem video gợi ý');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await recommendationApi.getSimilarVideos(videoId, 50);
            console.log('🎬 Similar videos API response:', response);
            
            const newVideos = response.data || response;
            console.log('🎬 Similar videos:', newVideos.length);

            // Add to queue, avoiding duplicates
            setExplorerQueue((prev: Video[]) => {
                const existingIds = new Set(prev.map((v: Video) => v.id));
                const uniqueNewVideos = newVideos.filter((v: Video) => !existingIds.has(v.id));
                console.log('🎬 Unique new videos to add:', uniqueNewVideos.length);
                return [...prev, ...uniqueNewVideos];
            });
        } catch (err: any) {
            console.error('Error fetching similar videos:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch recommendations';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch explorer feed on mount
    useEffect(() => {
        fetchExplorerFeed();
    }, [fetchExplorerFeed]);

    const clearQueue = useCallback(() => {
        setExplorerQueue([]);
    }, []);

    const removeFromQueue = useCallback((videoId: string) => {
        setExplorerQueue((prev: Video[]) => prev.filter((v: Video) => v.id !== videoId));
    }, []);

    return {
        explorerQueue,
        loading,
        error,
        clearQueue,
        removeFromQueue,
        fetchSimilarVideos
    };
}

export function useTrending(limit: number = 20) {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrending = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await recommendationApi.getTrending(limit);
            const trendingVideos = response.data?.videos || response.videos || [];
            setVideos(trendingVideos);
        } catch (err: any) {
            console.error('Error fetching trending videos:', err);
            setError(err.message || 'Failed to fetch trending videos');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchTrending();
    }, [fetchTrending]);

    return { videos, loading, error, refetch: fetchTrending };
}
