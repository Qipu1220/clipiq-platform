import pool from '../config/database.js';
import redis from '../config/redis.js';


class RecommendationService {
    constructor() {
        // Weights for ranking algorithm - BASE WEIGHTS
        this.WEIGHTS = {
            like: 5,
            comment: 2,
            share: 3,
            view: 3
        };
        
        // Weights for videos with recent engagement (24h)
        this.WEIGHTS_RECENT = {
            like: 30,
            comment: 20,
            share: 15,
            view: 15
        };
        
        // Weight multiplier for videos from subscribed users or liked/commented by subscribed users
        this.SUBSCRIPTION_MULTIPLIER = 50;
        
        // Cache settings
        this.CACHE_PREFIX = 'rec:';
        this.CACHE_TTL = 300; // 5 minutes
        this.BATCH_SIZE = 5; // Reduced to 5 videos per batch for better performance
    }

    /**
     * Generate a cache key for user recommendations with seed for freshness
     */
    generateCacheKey(userId, batchNumber, seed = null) {
        // Include seed in cache key to ensure fresh results when user refreshes
        const seedPart = seed ? `:seed:${seed}` : '';
        return `${this.CACHE_PREFIX}user:${userId}:batch:${batchNumber}${seedPart}`;
    }

    /**
     * Get personalized video feed for user (FOR YOU TAB)
     * - Random selection with ranking
     * - Prioritize subscribed users' videos
     * - Boost videos liked/commented by subscribed users (x50)
     * - Exclude videos user already liked/commented
     * - Load only 5 videos per batch
     */
    async getPersonalizedFeed(userId, limit = 5, page = 1, seed = null, freshRatio = 0.7) {
        try {

            
            // NO SEED - use true randomization for better variety on F5
            
            // Get videos the user has already interacted with (to exclude)
            const interactedVideos = await this.getUserInteractedVideos(userId);
            
            // Get user's subscriptions
            const subscriptionsQuery = `
                SELECT following_id 
                FROM subscriptions 
                WHERE follower_id = $1
            `;
            const subsResult = await pool.query(subscriptionsQuery, [userId]);
            const subscribedUserIds = subsResult.rows.map(row => row.following_id);
            
            
            // Build exclude condition
            const excludeCondition = interactedVideos.length > 0 
                ? `AND v.id != ALL($1::uuid[])`
                : '';
            
            const params = [];
            if (interactedVideos.length > 0) params.push(interactedVideos);
            params.push(userId);
            params.push(limit);
            params.push((page - 1) * limit);
            
            const paramOffset = interactedVideos.length > 0 ? 1 : 0;
            
            const query = `
                SELECT 
                    v.id,
                    v.title,
                    v.description,
                    v.uploader_id,
                    v.thumbnail_url,
                    v.video_url,
                    v.duration,
                    v.views,
                    v.upload_date,
                    v.created_at,
                    u.username as uploader_username,
                    u.display_name as uploader_display_name,
                    u.avatar_url as uploader_avatar,
                    COALESCE(l.likes_count, 0) as likes_count,
                    COALESCE(c.comments_count, 0) as comments_count,
                    COALESCE(s.shares_count, 0) as shares_count,
                    (
                        (COALESCE(l.likes_count, 0) * ${this.WEIGHTS.like}) +
                        (COALESCE(c.comments_count, 0) * ${this.WEIGHTS.comment}) +
                        (COALESCE(s.shares_count, 0) * ${this.WEIGHTS.share}) +
                        (v.views * ${this.WEIGHTS.view})
                    ) * CASE 
                        -- Videos from subscribed users get multiplier
                        WHEN v.uploader_id IN (
                            SELECT following_id FROM subscriptions WHERE follower_id = $${paramOffset + 1}
                        ) THEN 10
                        -- Videos liked/commented by subscribed users get huge multiplier
                        WHEN EXISTS (
                            SELECT 1 FROM likes l2
                            WHERE l2.video_id = v.id 
                            AND l2.user_id IN (
                                SELECT following_id FROM subscriptions WHERE follower_id = $${paramOffset + 1}
                            )
                        ) OR EXISTS (
                            SELECT 1 FROM comments c2
                            WHERE c2.video_id = v.id 
                            AND c2.user_id IN (
                                SELECT following_id FROM subscriptions WHERE follower_id = $${paramOffset + 1}
                            )
                        ) THEN ${this.SUBSCRIPTION_MULTIPLIER}
                        ELSE 1
                    END as engagement_score
                FROM videos v
                LEFT JOIN users u ON v.uploader_id = u.id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as likes_count
                    FROM likes
                    GROUP BY video_id
                ) l ON v.id = l.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as comments_count
                    FROM comments
                    GROUP BY video_id
                ) c ON v.id = c.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as shares_count
                    FROM view_history
                    GROUP BY video_id
                ) s ON v.id = s.video_id
                WHERE v.status = 'active'
                    ${excludeCondition}
                ORDER BY RANDOM()
                LIMIT $${paramOffset + 2}
                OFFSET $${paramOffset + 3}
            `;

            const result = await pool.query(query, params);
            
            return {
                videos: result.rows,
                total: result.rows.length,
                page: page,
                has_more: result.rows.length === limit,
                cached: false
            };
        } catch (error) {
            console.error('Error fetching personalized feed:', error.message);
            throw error;
        }
    }
    
    /**
     * Get explorer feed (EXPLORER TAB)
     * - All videos ranked by engagement score
     * - Recent engagement (24h) gets higher weight: like=30, comment=20
     * - No personalization, no randomization
     * - Simple ranking based on engagement
     * - Exclude videos user already liked/commented
     */
    async getExplorerFeed(userId, limit = 20, offset = 0) {
        try {
            
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            // Get videos user has already interacted with (to exclude)
            const interactedVideos = userId ? await this.getUserInteractedVideos(userId) : [];
            
            // Build exclude condition
            const excludeCondition = interactedVideos.length > 0 
                ? `AND v.id != ALL($1::uuid[])`
                : '';
            
            const params = [];
            if (interactedVideos.length > 0) params.push(interactedVideos);
            params.push(oneDayAgo);
            params.push(limit);
            params.push(offset);
            
            const paramOffset = interactedVideos.length > 0 ? 1 : 0;
            
            const query = `
                SELECT 
                    v.id,
                    v.title,
                    v.description,
                    v.uploader_id,
                    v.thumbnail_url,
                    v.video_url,
                    v.duration,
                    v.views,
                    v.upload_date,
                    v.created_at,
                    u.username as uploader_username,
                    u.display_name as uploader_display_name,
                    u.avatar_url as uploader_avatar,
                    COALESCE(l.likes_count, 0) as likes_count,
                    COALESCE(c.comments_count, 0) as comments_count,
                    COALESCE(s.shares_count, 0) as shares_count,
                    COALESCE(l_recent.likes_recent_count, 0) as likes_recent_count,
                    COALESCE(c_recent.comments_recent_count, 0) as comments_recent_count,
                    (
                        -- Base engagement score
                        (COALESCE(l.likes_count, 0) * ${this.WEIGHTS.like}) +
                        (COALESCE(c.comments_count, 0) * ${this.WEIGHTS.comment}) +
                        (COALESCE(s.shares_count, 0) * ${this.WEIGHTS.share}) +
                        (v.views * ${this.WEIGHTS.view}) +
                        -- Bonus for recent engagement (24h)
                        (COALESCE(l_recent.likes_recent_count, 0) * ${this.WEIGHTS_RECENT.like - this.WEIGHTS.like}) +
                        (COALESCE(c_recent.comments_recent_count, 0) * ${this.WEIGHTS_RECENT.comment - this.WEIGHTS.comment})
                    ) as engagement_score
                FROM videos v
                LEFT JOIN users u ON v.uploader_id = u.id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as likes_count
                    FROM likes
                    GROUP BY video_id
                ) l ON v.id = l.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as comments_count
                    FROM comments
                    GROUP BY video_id
                ) c ON v.id = c.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as shares_count
                    FROM view_history
                    GROUP BY video_id
                ) s ON v.id = s.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as likes_recent_count
                    FROM likes
                    WHERE created_at >= $${paramOffset + 1}
                    GROUP BY video_id
                ) l_recent ON v.id = l_recent.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as comments_recent_count
                    FROM comments
                    WHERE created_at >= $${paramOffset + 1}
                    GROUP BY video_id
                ) c_recent ON v.id = c_recent.video_id
                WHERE v.status = 'active'
                    ${excludeCondition}
                ORDER BY engagement_score DESC, v.upload_date DESC
                LIMIT $${paramOffset + 2}
                OFFSET $${paramOffset + 3}
            `;

            const result = await pool.query(query, params);
            
            return result.rows;
        } catch (error) {
            console.error('Error fetching explorer feed:', error.message);
            throw error;
        }
    }

    /**
     * Get videos user has already interacted with (liked or commented) in the last 30 days
     * Only exclude recent interactions to ensure user has content to see
     */
    async getUserInteractedVideos(userId) {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const query = `
                SELECT DISTINCT video_id
                FROM (
                    SELECT video_id FROM likes 
                    WHERE user_id = $1 AND created_at >= $2
                    UNION
                    SELECT video_id FROM comments 
                    WHERE user_id = $1 AND created_at >= $2
                ) AS interacted
            `;
            const result = await pool.query(query, [userId, thirtyDaysAgo]);
            return result.rows.map(row => row.video_id);
        } catch (error) {
            console.error('Error getting user interacted videos:', error);
            return [];
        }
    }



    /**
     * Get videos similar to a specific video (based on same uploader or high engagement)
     * Excludes videos the user has already interacted with (liked, commented, or saved)
     */
    async getSimilarVideos(videoId, userId, limit = 10) {
        try {
            // Get the target video details
            const videoQuery = `SELECT uploader_id FROM videos WHERE id = $1`;
            const videoResult = await pool.query(videoQuery, [videoId]);
            
            if (videoResult.rows.length === 0) {
                return [];
            }

            const uploaderId = videoResult.rows[0].uploader_id;

            // Get videos from same uploader or all other active videos
            // Priority: same uploader first, then sorted by engagement score
            // Exclude videos user has already interacted with
            const query = `
                SELECT 
                    v.id,
                    v.title,
                    v.description,
                    v.uploader_id,
                    v.thumbnail_url,
                    v.video_url,
                    v.duration,
                    v.views,
                    v.upload_date,
                    u.username as uploader_username,
                    u.display_name as uploader_display_name,
                    u.avatar_url as uploader_avatar,
                    COALESCE(l.likes_count, 0) as likes_count,
                    COALESCE(c.comments_count, 0) as comments_count,
                    (
                        (COALESCE(l.likes_count, 0) * ${this.WEIGHTS.like}) +
                        (COALESCE(c.comments_count, 0) * ${this.WEIGHTS.comment}) +
                        (v.views * ${this.WEIGHTS.view})
                    ) as engagement_score
                FROM videos v
                LEFT JOIN users u ON v.uploader_id = u.id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as likes_count
                    FROM likes
                    GROUP BY video_id
                ) l ON v.id = l.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as comments_count
                    FROM comments
                    GROUP BY video_id
                ) c ON v.id = c.video_id
                WHERE v.status = 'active'
                    AND v.id != $1
                    -- Exclude videos user has liked
                    AND NOT EXISTS (
                        SELECT 1 FROM likes 
                        WHERE likes.video_id = v.id AND likes.user_id = $2
                    )
                    -- Exclude videos user has commented on
                    AND NOT EXISTS (
                        SELECT 1 FROM comments 
                        WHERE comments.video_id = v.id AND comments.user_id = $2
                    )
                    -- Exclude videos user has saved (in playlists)
                    AND NOT EXISTS (
                        SELECT 1 FROM playlist_videos pv
                        JOIN playlists p ON pv.playlist_id = p.id
                        WHERE pv.video_id = v.id AND p.user_id = $2
                    )
                ORDER BY 
                    CASE WHEN v.uploader_id = $3 THEN 0 ELSE 1 END,
                    engagement_score DESC,
                    v.upload_date DESC
                LIMIT $4
            `;

            const result = await pool.query(query, [videoId, userId, uploaderId, limit]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching similar videos:', error.message);
            throw error;
        }
    }

    /**
     * Get trending videos (high engagement in recent period)
     */
    async getTrending(limit = 20, minViews = 0) {
        try {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const query = `
                SELECT 
                    v.id,
                    v.title,
                    v.description,
                    v.uploader_id,
                    v.thumbnail_url,
                    v.video_url,
                    v.duration,
                    v.views,
                    v.upload_date,
                    u.username as uploader_username,
                    u.display_name as uploader_display_name,
                    u.avatar_url as uploader_avatar,
                    COALESCE(likes_count, 0) as likes_count,
                    COALESCE(comments_count, 0) as comments_count
                FROM videos v
                LEFT JOIN users u ON v.uploader_id = u.id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as likes_count
                    FROM likes
                    WHERE created_at >= $1
                    GROUP BY video_id
                ) l ON v.id = l.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as comments_count
                    FROM comments
                    WHERE created_at >= $1
                    GROUP BY video_id
                ) c ON v.id = c.video_id
                WHERE v.status = 'active'
                    AND v.views >= $2
                ORDER BY v.views DESC, likes_count DESC, v.upload_date DESC
                LIMIT $3
            `;

            const result = await pool.query(query, [oneDayAgo, minViews, limit]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching trending videos:', error.message);
            throw error;
        }
    }

    /**
     * Get popular videos (most liked/viewed over time period)
     */
    async getPopular(limit = 20, days = 7) {
        try {
            const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            
            const query = `
                SELECT 
                    v.id,
                    v.title,
                    v.description,
                    v.uploader_id,
                    v.thumbnail_url,
                    v.video_url,
                    v.duration,
                    v.views,
                    v.upload_date,
                    u.username as uploader_username,
                    u.display_name as uploader_display_name,
                    u.avatar_url as uploader_avatar,
                    COALESCE(likes_count, 0) as likes_count,
                    COALESCE(comments_count, 0) as comments_count
                FROM videos v
                LEFT JOIN users u ON v.uploader_id = u.id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as likes_count
                    FROM likes
                    WHERE created_at >= $1
                    GROUP BY video_id
                ) l ON v.id = l.video_id
                LEFT JOIN (
                    SELECT video_id, COUNT(*) as comments_count
                    FROM comments
                    WHERE created_at >= $1
                    GROUP BY video_id
                ) c ON v.id = c.video_id
                WHERE v.status = 'active'
                    AND v.upload_date >= $1
                ORDER BY likes_count DESC, v.views DESC, v.upload_date DESC
                LIMIT $2
            `;

            const result = await pool.query(query, [daysAgo, limit]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching popular videos:', error.message);
            throw error;
        }
    }

    /**
     * Get videos by category (REMOVED - as per requirements)
     */
    async getByCategory(categoryId, limit = 20) {
        // Category feature removed as per requirements
        return [];
    }

    /**
     * Clear user cache (when user interacts with a video)
     */
    async clearUserCache(userId) {
        try {
            const pattern = `${this.CACHE_PREFIX}user:${userId}:*`;
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`✅ Cleared ${keys.length} cache entries for user ${userId}`);
            }
        } catch (error) {
            console.error('Error clearing user cache:', error);
        }
    }

    /**
     * Enrich videos with likes, comments count and user interaction status
     */
    async enrichVideosWithInteractions(videos, userId) {
        if (!videos || videos.length === 0) return videos;
        
        const videoIds = videos.map(v => v.id);
        
        try {
            // Get likes count for all videos
            const likesQuery = `
                SELECT video_id, COUNT(*) as likes_count 
                FROM likes 
                WHERE video_id = ANY($1)
                GROUP BY video_id
            `;
            const likesResult = await pool.query(likesQuery, [videoIds]);
            const likesMap = {};
            likesResult.rows.forEach(row => {
                likesMap[row.video_id] = parseInt(row.likes_count);
            });

            // Get comments count for all videos
            const commentsQuery = `
                SELECT video_id, COUNT(*) as comments_count 
                FROM comments 
                WHERE video_id = ANY($1)
                GROUP BY video_id
            `;
            const commentsResult = await pool.query(commentsQuery, [videoIds]);
            const commentsMap = {};
            commentsResult.rows.forEach(row => {
                commentsMap[row.video_id] = parseInt(row.comments_count);
            });

            // Get user's liked videos
            let userLikedSet = new Set();
            let userSavedSet = new Set();
            
            if (userId) {
                // Get liked videos
                const userLikesQuery = `
                    SELECT video_id FROM likes 
                    WHERE user_id = $1 AND video_id = ANY($2)
                `;
                const userLikesResult = await pool.query(userLikesQuery, [userId, videoIds]);
                userLikedSet = new Set(userLikesResult.rows.map(row => row.video_id));

                // Get saved videos
                const userSavedQuery = `
                    SELECT pv.video_id 
                    FROM playlist_videos pv
                    JOIN playlists p ON pv.playlist_id = p.id
                    WHERE p.user_id = $1 AND p.name = 'Đã lưu' AND pv.video_id = ANY($2)
                `;
                const userSavedResult = await pool.query(userSavedQuery, [userId, videoIds]);
                userSavedSet = new Set(userSavedResult.rows.map(row => row.video_id));
            }

            // Enrich videos with interaction data
            return videos.map(video => ({
                ...video,
                likes: likesMap[video.id] || video.likes_count || 0,
                comments: commentsMap[video.id] || video.comments_count || 0,
                views: video.views || 0,
                isLiked: userLikedSet.has(video.id),
                isSaved: userSavedSet.has(video.id),
            }));
        } catch (error) {
            console.error('Error enriching videos with interactions:', error);
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            await pool.query('SELECT 1');
            await redis.ping();
            return { status: 'healthy', service: 'javascript' };
        } catch (error) {
            console.error('Health check failed:', error.message);
            return { status: 'unhealthy', error: error.message };
        }
    }
}

export default new RecommendationService();
