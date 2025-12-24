import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

export const recommendationApi = {
    /**
     * Get personalized feed for user with batch loading support (FOR YOU TAB)
     * @param limit - Number of videos per batch (default 5 for better performance)
     * @param page - Page number
     * @param seed - Random seed for consistent batches (use timestamp)
     * @param freshRatio - Ratio of fresh videos (0-1, default 0.3)
     */
    getPersonalizedFeed: async (
        limit: number = 5, 
        page: number = 1, 
        seed: number | null = null,
        freshRatio: number = 0.3
    ) => {
        const params: any = { limit, page };
        if (seed !== null) {
            params.seed = seed;
        }
        if (freshRatio !== null) {
            params.fresh_ratio = freshRatio;
        }

        const response = await axios.get(`${API_BASE_URL}/recommendations/feed`, {
            params,
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        return response.data;
    },

    /**
     * Get explorer feed (EXPLORER TAB)
     * All videos ranked by engagement score with recent activity boost
     */
    getExplorerFeed: async (limit: number = 20, page: number = 1) => {
        const response = await axios.get(`${API_BASE_URL}/recommendations/explorer`, {
            params: { limit, page },
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        return response.data;
    },

    /**
     * Get videos similar to a specific video
     */
    getSimilarVideos: async (videoId: string, limit: number = 100) => {
        const response = await axios.get(`${API_BASE_URL}/recommendations/similar/${videoId}`, {
            params: { limit },
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        return response.data;
    },

    /**
     * Get trending videos
     */
    getTrending: async (limit: number = 20, minViews: number | null = null) => {
        const params: any = { limit };
        if (minViews) params.min_views = minViews;

        const response = await axios.get(`${API_BASE_URL}/recommendations/trending`, {
            params
        });
        return response.data;
    },

    /**
     * Get popular videos
     */
    getPopular: async (limit: number = 20, days: number = 7) => {
        const response = await axios.get(`${API_BASE_URL}/recommendations/popular`, {
            params: { limit, days }
        });
        return response.data;
    },

    /**
     * Get videos by category
     */
    getByCategory: async (categoryId: string, limit: number = 20) => {
        const response = await axios.get(`${API_BASE_URL}/recommendations/category/${categoryId}`, {
            params: { limit }
        });
        return response.data;
    }
};
