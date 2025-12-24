import recommendationService from '../services/recommendation.service.js';

/**
 * Get personalized feed for user
 */
export const getPersonalizedFeed = async (req, res) => {
    try {
        const userId = req.user?.userId || req.params.userId;
        const { limit = 20, page = 1, seed = null, fresh_ratio = 0.7 } = req.query;
        
        console.log('🎯 getPersonalizedFeed - userId:', userId, 'page:', page, 'seed:', seed);

        const recommendations = await recommendationService.getPersonalizedFeed(
            userId,
            parseInt(limit),
            parseInt(page),
            seed ? parseInt(seed) : null,
            fresh_ratio ? parseFloat(fresh_ratio) : 0.3
        );

        // Transform video URLs and enrich with interactions
        const transformedVideos = recommendations.videos?.map(transformVideoUrls) || [];
        const enrichedVideos = await enrichVideosWithInteractions(transformedVideos, userId);

        res.json({
            success: true,
            data: {
                videos: enrichedVideos,
                total: recommendations.total,
                page: recommendations.page,
                has_more: recommendations.has_more,
                cached: recommendations.cached
            }
        });
    } catch (error) {
        console.error('Error in getPersonalizedFeed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch personalized feed',
            error: error.message
        });
    }
};

/**
 * Transform video URLs from recommendation service
 */
const transformVideoUrls = (video) => {
    const MINIO_BASE_URL = 'http://localhost:9000';
    
    // Generate Unsplash fallback URL based on video id (same logic as video.controller)
    const unsplashFallback = video.id 
        ? `https://images.unsplash.com/photo-${Math.abs(video.id.charCodeAt(0) * 1000 + video.id.charCodeAt(1) * 100)}?w=400&h=600&fit=crop`
        : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop';
    
    return {
        ...video,
        videoUrl: video.video_url 
            ? (video.video_url.startsWith('http') 
                ? video.video_url 
                : `${MINIO_BASE_URL}/clipiq-videos/${video.video_url}`)
            : null,
        thumbnailUrl: (video.thumbnail_url && video.thumbnail_url.startsWith('http'))
            ? video.thumbnail_url
            : unsplashFallback,
        // Map snake_case to camelCase
        uploaderId: video.uploader_id,
        categoryId: video.category_id,
        uploadDate: video.upload_date,
    };
};

/**
 * Enrich videos with likes count and user interaction status
 * NOTE: This should be moved to service layer
 */
const enrichVideosWithInteractions = async (videos, userId) => {
    if (!videos || videos.length === 0) return videos;
    
    try {
        const enrichedVideos = await recommendationService.enrichVideosWithInteractions(videos, userId);
        return enrichedVideos;
    } catch (error) {
        console.error('Error enriching videos with interactions:', error);
        // Return videos without enrichment on error
        return videos.map(video => ({
            ...video,
            likes: video.likes_count || 0,
            comments: video.comments_count || 0,
            views: video.views || 0,
            isLiked: false,
            isSaved: false,
        }));
    }
};

/**
 * Get similar videos
 */
export const getSimilarVideos = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user?.userId;
        const { limit = 10 } = req.query;

        console.log('🔍 getSimilarVideos - req.user:', req.user);
        console.log('🔍 getSimilarVideos - userId:', userId);

        if (!userId) {
            console.log('❌ getSimilarVideos - No userId found');
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const similarVideos = await recommendationService.getSimilarVideos(
            videoId,
            userId,
            parseInt(limit)
        );

        // Transform video URLs
        const transformedVideos = similarVideos.map(transformVideoUrls);

        // Enrich with likes count and user interaction status
        const enrichedVideos = await enrichVideosWithInteractions(transformedVideos, userId);

        res.json({
            success: true,
            data: enrichedVideos
        });
    } catch (error) {
        console.error('Error in getSimilarVideos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch similar videos',
            error: error.message
        });
    }
};

/**
 * Get explorer feed (ranked by engagement, excludes liked/commented videos)
 */
export const getExplorerFeed = async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;
        const userId = req.user?.userId;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        console.log('🧭 getExplorerFeed - userId:', userId, 'limit:', limit, 'page:', page, 'offset:', offset);

        const videos = await recommendationService.getExplorerFeed(
            userId,
            parseInt(limit),
            offset
        );

        // Transform video URLs and enrich with interactions
        const transformedVideos = videos.map(transformVideoUrls);
        const enrichedVideos = await enrichVideosWithInteractions(transformedVideos, userId);

        res.json({
            success: true,
            data: {
                videos: enrichedVideos,
                total: enrichedVideos.length,
                page: parseInt(page),
                has_more: enrichedVideos.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error in getExplorerFeed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch explorer feed',
            error: error.message
        });
    }
};

/**
 * Get trending videos
 */
export const getTrendingVideos = async (req, res) => {
    try {
        const { limit = 20, min_views } = req.query;
        const userId = req.user?.userId;

        const trending = await recommendationService.getTrending(
            parseInt(limit),
            min_views ? parseInt(min_views) : null
        );

        // Transform and enrich with interaction data
        const transformedVideos = trending.map(transformVideoUrls);
        const enrichedVideos = await enrichVideosWithInteractions(transformedVideos, userId);

        res.json({
            success: true,
            data: enrichedVideos
        });
    } catch (error) {
        console.error('Error in getTrendingVideos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trending videos',
            error: error.message
        });
    }
};

/**
 * Get popular videos
 */
export const getPopularVideos = async (req, res) => {
    try {
        const { limit = 20, days = 7 } = req.query;
        const userId = req.user?.userId;

        const popular = await recommendationService.getPopular(
            parseInt(limit),
            parseInt(days)
        );

        // Transform and enrich with interaction data
        const transformedVideos = popular.map(transformVideoUrls);
        const enrichedVideos = await enrichVideosWithInteractions(transformedVideos, userId);

        res.json({
            success: true,
            data: enrichedVideos
        });
    } catch (error) {
        console.error('Error in getPopularVideos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch popular videos',
            error: error.message
        });
    }
};

/**
 * Get videos by category
 */
export const getVideosByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { limit = 20 } = req.query;
        const userId = req.user?.userId;

        const videos = await recommendationService.getByCategory(
            categoryId,
            parseInt(limit)
        );

        // Transform and enrich with interaction data
        const transformedVideos = videos.map(transformVideoUrls);
        const enrichedVideos = await enrichVideosWithInteractions(transformedVideos, userId);

        res.json({
            success: true,
            data: enrichedVideos
        });
    } catch (error) {
        console.error('Error in getVideosByCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category videos',
            error: error.message
        });
    }
};
