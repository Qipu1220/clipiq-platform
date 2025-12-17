/**
 * MinIO Service
 * Handles file uploads to MinIO S3-compatible storage
 */

import * as Minio from 'minio';

// Initialize MinIO client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

// Bucket names from environment
const BUCKET_VIDEOS = process.env.MINIO_BUCKET_VIDEOS || 'clipiq-videos';
const BUCKET_THUMBNAILS = process.env.MINIO_BUCKET_THUMBNAILS || 'clipiq-thumbnails';
const BUCKET_AVATARS = process.env.MINIO_BUCKET_AVATARS || 'clipiq-avatars';

/**
 * Ensure a bucket exists, create if not
 * @param {string} bucketName - Name of the bucket
 */
export async function ensureBucketExists(bucketName) {
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName);
            console.log(`✅ Created bucket: ${bucketName}`);

            // Set bucket policy to public read for videos and thumbnails
            if (bucketName === BUCKET_VIDEOS || bucketName === BUCKET_THUMBNAILS) {
                const policy = {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }]
                };
                await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
                console.log(`✅ Set public read policy for bucket: ${bucketName}`);
            }
        }
        return true;
    } catch (error) {
        console.error(`Failed to ensure bucket ${bucketName}:`, error);
        throw error;
    }
}

/**
 * Upload a file to MinIO
 * @param {string} bucketName - Target bucket
 * @param {string} objectName - Object name (path in bucket)
 * @param {Buffer|Stream} data - File data
 * @param {object} metadata - Optional metadata
 * @returns {Promise<{etag: string, objectName: string}>}
 */
export async function uploadFile(bucketName, objectName, data, metadata = {}) {
    try {
        await ensureBucketExists(bucketName);

        const result = await minioClient.putObject(bucketName, objectName, data, data.length, metadata);

        console.log(`✅ Uploaded ${objectName} to ${bucketName}`);
        return {
            etag: result.etag,
            objectName: objectName,
            url: getFileUrl(bucketName, objectName)
        };
    } catch (error) {
        console.error(`Failed to upload ${objectName}:`, error);
        throw error;
    }
}

/**
 * Get public URL for a file
 * @param {string} bucketName - Bucket name
 * @param {string} objectName - Object name
 * @returns {string} - Public URL
 */
export function getFileUrl(bucketName, objectName) {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || 9000;
    return `${protocol}://${endpoint}:${port}/${bucketName}/${objectName}`;
}

/**
 * Upload a video file
 * @param {Buffer} videoBuffer - Video data
 * @param {string} videoName - Video filename
 * @returns {Promise<{url: string, objectName: string}>}
 */
export async function uploadVideo(videoBuffer, videoName) {
    const objectName = videoName;
    const result = await uploadFile(BUCKET_VIDEOS, objectName, videoBuffer, {
        'Content-Type': 'video/mp4'
    });
    return result;
}

/**
 * Upload a thumbnail image
 * @param {Buffer} imageBuffer - Image data
 * @param {string} imageName - Image filename
 * @returns {Promise<{url: string, objectName: string}>}
 */
export async function uploadThumbnail(imageBuffer, imageName) {
    const objectName = imageName;
    const result = await uploadFile(BUCKET_THUMBNAILS, objectName, imageBuffer, {
        'Content-Type': 'image/jpeg'
    });
    return result;
}

/**
 * Delete a file from MinIO
 * @param {string} bucketName - Bucket name
 * @param {string} objectName - Object name
 */
export async function deleteFile(bucketName, objectName) {
    try {
        await minioClient.removeObject(bucketName, objectName);
        console.log(`✅ Deleted ${objectName} from ${bucketName}`);
        return true;
    } catch (error) {
        console.error(`Failed to delete ${objectName}:`, error);
        throw error;
    }
}

export default {
    minioClient,
    ensureBucketExists,
    uploadFile,
    getFileUrl,
    uploadVideo,
    uploadThumbnail,
    deleteFile,
    BUCKET_VIDEOS,
    BUCKET_THUMBNAILS,
    BUCKET_AVATARS
};
