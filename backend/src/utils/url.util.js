/**
 * URL Utility Functions
 * Centralized URL construction for MinIO resources
 */

// MinIO configuration for URL construction (public endpoint for browser access)
const MINIO_PUBLIC_ENDPOINT = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = process.env.MINIO_PORT || '9000';
const MINIO_PROTOCOL = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';

/**
 * Construct full video URL from filename
 * @param {string} videoUrl - Video filename or full URL
 * @returns {string|null} - Full MinIO URL or null if no input
 */
export function getFullVideoUrl(videoUrl) {
    if (!videoUrl) return null;
    if (videoUrl.startsWith('http')) return videoUrl;
    return `${MINIO_PROTOCOL}://${MINIO_PUBLIC_ENDPOINT}:${MINIO_PORT}/clipiq-videos/${videoUrl}`;
}

/**
 * Construct full thumbnail URL from filename
 * @param {string} thumbnailUrl - Thumbnail filename or full URL
 * @param {string} fallbackId - ID for fallback placeholder image
 * @returns {string|null} - Full MinIO URL or placeholder
 */
export function getFullThumbnailUrl(thumbnailUrl, fallbackId = null) {
    if (!thumbnailUrl) {
        return fallbackId ? `https://picsum.photos/seed/${fallbackId}/400/600` : null;
    }
    if (thumbnailUrl.startsWith('http')) return thumbnailUrl;
    return `${MINIO_PROTOCOL}://${MINIO_PUBLIC_ENDPOINT}:${MINIO_PORT}/clipiq-thumbnails/${thumbnailUrl}`;
}

/**
 * Format a video database row to API response format
 * @param {Object} row - Database row
 * @param {Object} options - Additional options
 * @param {boolean} options.isLiked - Whether the video is liked by current user
 * @param {boolean} options.isSaved - Whether the video is saved by current user
 * @returns {Object} - Formatted video object
 */
export function formatVideoForResponse(row, options = {}) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        videoUrl: getFullVideoUrl(row.video_url),
        thumbnailUrl: getFullThumbnailUrl(row.thumbnail_url, row.id),
        duration: row.duration,
        views: parseInt(row.views) || 0,
        likes: parseInt(row.likes_count) || 0,
        comments: parseInt(row.comments_count) || 0,
        shares: parseInt(row.shares_count) || 0,
        isLiked: options.isLiked ?? row.is_liked ?? false,
        isSaved: options.isSaved ?? row.is_saved ?? false,
        uploaderUsername: row.username,
        uploaderDisplayName: row.display_name,
        uploaderAvatarUrl: row.avatar_url,
        processingStatus: row.processing_status,
        createdAt: row.created_at,
        uploadedAt: row.created_at,
    };
}

export default {
    getFullVideoUrl,
    getFullThumbnailUrl,
    formatVideoForResponse
};
