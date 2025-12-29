/**
 * Upload Service
 * Handles complete video upload workflow including:
 * - Video upload to MinIO
 * - Keyframe extraction
 * - Feature extraction (embedding)
 * - OCR extraction
 * - Indexing to Qdrant and Elasticsearch
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pool from '../config/database.js';
import qdrantClient from '../config/qdrant.js';
import esClient, { ELASTIC_OCR_INDEX } from '../config/elasticsearch.js';
import minioService from './minio.service.js';
import qdrantService from './qdrant.service.js';

// Temp directory for keyframe processing
const TEMP_DIR = path.join(process.cwd(), 'temp', 'keyframes');

// Qdrant collection name
const QDRANT_COLLECTION = 'clipiq_vectors';

// Environment URLs
const EXTRACT_KEYFRAME_URL = process.env.EXTRACT_KEYFRAME_URL;
const EMBEDDING_KEYFRAME_URL = process.env.EMBEDDING_KEYFRAME_URL;
const OCR_KEYFRAME_URL = process.env.OCR_KEYFRAME_URL;

/**
 * Ensure temp directory exists
 * @param {string} videoId - Video ID for subfolder
 * @returns {string} - Path to video's temp directory
 */
function ensureTempDir(videoId) {
    const videoTempDir = path.join(TEMP_DIR, videoId);
    if (!fs.existsSync(videoTempDir)) {
        fs.mkdirSync(videoTempDir, { recursive: true });
    }
    return videoTempDir;
}

/**
 * Cleanup temp directory for a video
 * @param {string} videoId - Video ID
 */
export function cleanupTempFiles(videoId) {
    const videoTempDir = path.join(TEMP_DIR, videoId);
    try {
        if (fs.existsSync(videoTempDir)) {
            fs.rmSync(videoTempDir, { recursive: true, force: true });
            console.log(`✅ Cleaned up temp files for video: ${videoId}`);
        }
    } catch (error) {
        console.error(`Failed to cleanup temp files for ${videoId}:`, error);
    }
}

/**
 * Extract first frame from video as thumbnail using the keyframe extraction service
 * This is a quick operation for generating thumbnail before returning to frontend
 * @param {Buffer} videoBuffer - Video data
 * @returns {Promise<Buffer|null>} - First frame as image buffer or null
 */
async function extractFirstFrameAsThumbnail(videoBuffer) {
    if (!EXTRACT_KEYFRAME_URL) {
        console.warn('EXTRACT_KEYFRAME_URL not configured, cannot auto-extract thumbnail');
        return null;
    }

    try {
        // Create form data with video file
        const formData = new FormData();
        const blob = new Blob([videoBuffer], { type: 'video/mp4' });
        formData.append('file', blob, 'video.mp4');

        console.log(`📸 Extracting first frame for thumbnail...`);

        const response = await fetch(EXTRACT_KEYFRAME_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Keyframe API error (${response.status}):`, errorText);
            return null;
        }

        // Response is a ZIP file
        const zipBuffer = Buffer.from(await response.arrayBuffer());

        // Extract first image from ZIP
        const AdmZip = (await import('adm-zip')).default;
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
            if (!entry.isDirectory && entry.entryName.match(/\.(jpg|jpeg|png|webp)$/i)) {
                // Return the first image found
                const imageBuffer = entry.getData();
                console.log(`✅ Extracted first frame as thumbnail (${imageBuffer.length} bytes)`);
                return imageBuffer;
            }
        }

        console.warn('No image found in keyframe extraction result');
        return null;
    } catch (error) {
        console.error('Failed to extract first frame for thumbnail:', error);
        return null;
    }
}

/**
 * Extract keyframes from video using external service
 * Returns ZIP file containing keyframe images
 * @param {Buffer} videoBuffer - Video data
 * @param {string} videoId - Video ID for organizing keyframes
 * @returns {Promise<string[]>} - Array of keyframe file paths
 */
export async function extractKeyframes(videoBuffer, videoId) {
    if (!EXTRACT_KEYFRAME_URL) {
        console.warn('EXTRACT_KEYFRAME_URL not configured');
        return [];
    }

    const videoTempDir = ensureTempDir(videoId);

    try {
        // Create form data with video file (field name: "file")
        const formData = new FormData();
        const blob = new Blob([videoBuffer], { type: 'video/mp4' });
        formData.append('file', blob, 'video.mp4');

        console.log(`📹 Extracting keyframes for video ${videoId}...`);

        const response = await fetch(EXTRACT_KEYFRAME_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Keyframe API error (${response.status}):`, errorText);
            throw new Error(`Keyframe extraction failed: ${response.status}`);
        }

        // Response is a ZIP file
        const zipBuffer = Buffer.from(await response.arrayBuffer());

        // Save ZIP temporarily
        const zipPath = path.join(videoTempDir, 'keyframes.zip');
        fs.writeFileSync(zipPath, zipBuffer);

        // Extract images from ZIP using AdmZip
        const AdmZip = (await import('adm-zip')).default;
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        const keyframePaths = [];
        let frameIndex = 1;

        for (const entry of zipEntries) {
            if (!entry.isDirectory && entry.entryName.match(/\.(jpg|jpeg|png|webp)$/i)) {
                const framePath = path.join(videoTempDir, `frame_${String(frameIndex).padStart(3, '0')}.jpg`);
                fs.writeFileSync(framePath, entry.getData());
                keyframePaths.push(framePath);
                frameIndex++;
            }
        }

        // Delete ZIP file
        fs.unlinkSync(zipPath);

        console.log(`✅ Extracted ${keyframePaths.length} keyframes for video ${videoId}`);
        return keyframePaths;
    } catch (error) {
        console.error('Keyframe extraction failed:', error);
        return [];
    }
}

/**
 * Extract feature embedding from a keyframe image
 * @param {string} imagePath - Path to keyframe image
 * @returns {Promise<number[]|null>} - Feature vector or null
 */
export async function extractFeatures(imagePath) {
    if (!EMBEDDING_KEYFRAME_URL) {
        console.warn('EMBEDDING_KEYFRAME_URL not configured');
        return null;
    }

    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, path.basename(imagePath)); // Field name: "file"

        const response = await fetch(EMBEDDING_KEYFRAME_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vectorize API error (${response.status}):`, errorText);
            throw new Error(`Feature extraction failed: ${response.status}`);
        }

        const result = await response.json();
        // Response format: {filename, vector_dim, vector}
        const vector = result.vector;

        if (!vector || !Array.isArray(vector)) {
            console.warn('Invalid vector format from embedding service');
            return null;
        }

        return vector;
    } catch (error) {
        console.error('Feature extraction failed:', error);
        return null;
    }
}

/**
 * Extract OCR text from a keyframe image
 * @param {string} imagePath - Path to keyframe image
 * @returns {Promise<string|null>} - OCR text or null
 */
export async function extractOCR(imagePath) {
    if (!OCR_KEYFRAME_URL) {
        console.warn('OCR_KEYFRAME_URL not configured');
        return null;
    }

    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, path.basename(imagePath)); // Field name: "file"

        const response = await fetch(OCR_KEYFRAME_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OCR API error (${response.status}):`, errorText);
            throw new Error(`OCR extraction failed: ${response.status}`);
        }

        const result = await response.json();
        // Response format: {filename, text, raw_markdown}
        const text = result.text || '';

        return text.trim();
    } catch (error) {
        console.error('OCR extraction failed:', error);
        return null;
    }
}

/**
 * Index a keyframe's feature vector to Qdrant
 * @param {string} videoId - Video ID
 * @param {string} videoName - Video name (for payload)
 * @param {string} framePath - Frame path
 * @param {number} frameIndex - Frame index
 * @param {number[]} vector - Feature vector
 */
export async function indexToQdrant(videoId, videoName, framePath, frameIndex, vector) {
    try {
        // Generate UUID for point ID (Qdrant requires UUID or unsigned integer)
        const pointId = crypto.randomUUID();

        await qdrantClient.upsert(QDRANT_COLLECTION, {
            wait: true,
            points: [{
                id: pointId,
                vector: vector,
                payload: {
                    video_id: videoId,      // UUID from database
                    video_name: videoName,
                    frame_idx: frameIndex - 1  // 0-indexed like Elasticsearch
                }
            }]
        });

        console.log(`✅ Indexed frame ${frameIndex} to Qdrant for video ${videoId}`);
        return true;
    } catch (error) {
        console.error(`Failed to index to Qdrant:`, error);
        return false;
    }
}

/**
 * Index a keyframe's OCR text to Elasticsearch
 * @param {string} videoId - Video ID
 * @param {string} videoName - Video name
 * @param {string} framePath - Frame path
 * @param {number} frameIndex - Frame index
 * @param {string} ocrText - OCR extracted text
 */
export async function indexToElasticsearch(videoId, videoName, framePath, frameIndex, ocrText) {
    if (!ocrText || ocrText.length === 0) {
        return true; // Skip empty OCR
    }

    try {
        const docId = `${videoId}_frame_${String(frameIndex).padStart(3, '0')}`;

        await esClient.index({
            index: ELASTIC_OCR_INDEX,
            id: docId,  // Elasticsearch document ID (unique per frame)
            document: {
                id: videoId,              // video_id (UUID) - matches legacy format
                video_name: videoName,
                frame_idx: frameIndex - 1,  // 0-indexed like legacy data  
                ocr_text: ocrText
            }
        });

        console.log(`✅ Indexed OCR for frame ${frameIndex} to Elasticsearch`);
        return true;
    } catch (error) {
        console.error(`Failed to index to Elasticsearch:`, error);
        return false;
    }
}

/**
 * Create video record in database
 * @param {object} metadata - Video metadata
 * @returns {Promise<object>} - Created video record
 */
export async function createVideoRecord(metadata) {
    const { title, description, uploaderId, videoUrl, thumbnailUrl, duration } = metadata;
    const videoId = crypto.randomUUID();

    const result = await pool.query(
        `INSERT INTO videos (id, title, description, uploader_id, video_url, thumbnail_url, duration, status, processing_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [videoId, title, description || '', uploaderId, videoUrl, thumbnailUrl, duration || 0, 'active', 'processing']
    );

    return result.rows[0];
}

/**
 * Update video status
 * @param {string} videoId - Video ID
 * @param {string} status - New status
 */
export async function updateVideoStatus(videoId, status) {
    await pool.query(
        'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, videoId]
    );
}

/**
 * Process video in background (keyframe extraction + processing)
 * @param {Buffer} videoBuffer - Video buffer
 * @param {string} videoId - Video ID
 * @param {string} sanitizedTitle - Sanitized title
 * @param {number} timestamp - Timestamp
 */
async function processVideoInBackground(videoBuffer, videoId, sanitizedTitle, timestamp) {
    try {
        console.log(`\n🔄 Background: Starting full processing for video ${videoId}...`);

        // Step 1: Extract keyframes
        console.log(`🔄 Background: Extracting keyframes...`);
        const keyframePaths = await extractKeyframes(videoBuffer, videoId);
        console.log(`✅ Background: Extracted ${keyframePaths.length} keyframes`);

        // Step 2: Generate thumbnail from first keyframe if needed
        const videoRecord = await pool.query('SELECT thumbnail_url FROM videos WHERE id = $1', [videoId]);
        if (!videoRecord.rows[0].thumbnail_url && keyframePaths.length > 0) {
            const firstFrame = fs.readFileSync(keyframePaths[0]);
            const thumbFileName = `thumb_${sanitizedTitle}_${timestamp}.jpg`;
            const thumbResult = await minioService.uploadThumbnail(firstFrame, thumbFileName);

            // Update database with thumbnail filename (not full URL)
            await pool.query(
                'UPDATE videos SET thumbnail_url = $1 WHERE id = $2',
                [thumbFileName, videoId]
            );
            console.log(`✅ Background: Generated and uploaded thumbnail: ${thumbFileName}`);
        }

        // Step 3: Process all keyframes
        if (keyframePaths.length > 0) {
            const videoName = sanitizedTitle.toLowerCase();
            await processKeyframesAsync(videoId, keyframePaths, videoName);
        }

        // Step 4: Mark video as ready
        await pool.query(
            'UPDATE videos SET processing_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['ready', videoId]
        );

        console.log(`✅ Background: Video ${videoId} fully processed and marked as ready`);

    } catch (error) {
        console.error(`❌ Background processing failed for video ${videoId}:`, error);

        // Mark video as failed
        try {
            await pool.query(
                'UPDATE videos SET processing_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['failed', videoId]
            );
            console.log(`⚠️ Background: Video ${videoId} marked as failed`);
        } catch (updateError) {
            console.error(`Failed to update processing_status to failed:`, updateError);
        }
    }
}

/**
 * Create video-level embedding by pooling frame embeddings
 * @param {string} videoId - Video UUID
 * @param {string} videoName - Video name
 */
export async function createVideoLevelEmbedding(videoId, videoName) {
    try {
        console.log(`  Retrieving frame vectors for video ${videoId}...`);

        // Get all frame vectors from Qdrant
        const frameVectors = await qdrantService.getFrameVectors(videoId);

        if (!frameVectors || frameVectors.length === 0) {
            console.warn(`  No frame vectors found for video ${videoId}, skipping video-level embedding`);
            return false;
        }

        console.log(`  Found ${frameVectors.length} frame vectors`);

        // L2 normalize each frame vector
        const normalizedFrames = frameVectors.map(vec => qdrantService.l2Normalize(vec));

        // Mean pool normalized frames
        const pooledVector = qdrantService.meanPool(normalizedFrames);

        // L2 normalize the pooled vector
        const normalizedPooled = qdrantService.l2Normalize(pooledVector);

        // Get video metadata from database
        const videoResult = await pool.query(
            'SELECT uploader_id, status, created_at, duration, title FROM videos WHERE id = $1',
            [videoId]
        );

        if (videoResult.rows.length === 0) {
            console.warn(`  Video ${videoId} not found in database`);
            return false;
        }

        const video = videoResult.rows[0];

        // Upsert to Qdrant videos collection
        await qdrantService.upsertVideoEmbedding(videoId, normalizedPooled, {
            video_id: videoId,
            uploader_id: video.uploader_id,
            status: video.status,
            upload_date: video.created_at.toISOString(),
            duration: video.duration || 0,
            title: video.title || videoName
        });

        console.log(`✅ Video-level embedding created for ${videoId} (${frameVectors.length} frames pooled)`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to create video-level embedding for ${videoId}:`, error);
        return false;
    }
}

/**
 * Process keyframes in background (non-blocking)
 * @param {string} videoId - Video ID
 * @param {Array} keyframePaths - Array of keyframe paths
 * @param {string} videoName - Sanitized video name
 */
async function processKeyframesAsync(videoId, keyframePaths, videoName) {
    try {
        console.log(`\n🔄 Background: Processing ${keyframePaths.length} keyframes for video ${videoId}...`);

        for (let i = 0; i < keyframePaths.length; i++) {
            const framePath = keyframePaths[i];
            const frameIndex = i + 1;

            console.log(`  Processing frame ${frameIndex}/${keyframePaths.length}...`);

            // Extract features and OCR in parallel
            const [vector, ocrText] = await Promise.all([
                extractFeatures(framePath),
                extractOCR(framePath)
            ]);

            // Index to Qdrant if vector exists
            if (vector) {
                await indexToQdrant(videoId, videoName, framePath, frameIndex, vector);
            }

            // Index to Elasticsearch if OCR text exists
            if (ocrText) {
                await indexToElasticsearch(videoId, videoName, framePath, frameIndex, ocrText);
            }
        }

        console.log(`\n✅ Background: All keyframes processed for video ${videoId}`);

        // Step 4: Pool frame embeddings into video-level embedding
        console.log(`\n🔄 Background: Pooling frame embeddings to video-level...`);
        await createVideoLevelEmbedding(videoId, videoName);

        // Cleanup temp files after processing
        cleanupTempFiles(videoId);
        console.log(`✅ Background: Cleaned up temp files for video ${videoId}`);

    } catch (error) {
        console.error(`❌ Background processing failed for video ${videoId}:`, error);
        // Optionally update video status to 'failed' here
    }
}

/**
 * Process complete video upload workflow
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
export async function processVideoUpload(videoBuffer, options) {
    const { title, description, uploaderId, thumbnailBuffer = null } = options;

    // Generate unique filename
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
    const timestamp = Date.now();
    const videoFileName = `${sanitizedTitle}_${timestamp}.mp4`;

    let videoRecord = null; // Declare videoRecord here for cleanup in catch block
    let videoId = null; // Declare videoId here for cleanup in catch block

    try {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📤 Starting upload for: ${title}`);
        console.log(`${'='.repeat(50)}\n`);

        // Step 1: Upload video to MinIO
        console.log('Step 1: Uploading video to MinIO...');
        const videoUploadResult = await minioService.uploadVideo(videoBuffer, videoFileName);
        console.log(`✅ Video uploaded: ${videoUploadResult.url}`);

        // Step 2: Handle thumbnail (only if user provided one, otherwise background will generate)
        let thumbnailUrl = null;
        const thumbFileName = `thumb_${sanitizedTitle}_${timestamp}.jpg`;
        
        if (thumbnailBuffer) {
            // User provided thumbnail - upload it now
            const thumbResult = await minioService.uploadThumbnail(thumbnailBuffer, thumbFileName);
            thumbnailUrl = thumbFileName; // Store just filename, not full URL
            console.log(`✅ Custom thumbnail uploaded: ${thumbResult.url}`);
        } else {
            // No thumbnail provided - will be auto-generated in background processing
            console.log('ℹ️ No thumbnail provided, will be auto-generated in background');
        }

        // Step 3: Create database record immediately
        console.log('\nStep 3: Creating database record...');
        videoRecord = await createVideoRecord({
            title,
            description,
            uploaderId,
            videoUrl: videoFileName,
            thumbnailUrl: thumbnailUrl, // Will be updated later if null
            duration: 0 // Will be updated later
        });
        videoId = videoRecord.id;
        console.log(`✅ Database record created: ${videoRecord.id}`);

        // Step 4: Start ALL background processing (keyframe extraction + processing)
        console.log('\n🚀 Starting background processing...');

        // Start processing in background - don't await!
        processVideoInBackground(videoBuffer, videoId, sanitizedTitle, timestamp)
            .then(() => {
                console.log(`✅ Video ${videoId} processing complete`);
            })
            .catch(err => {
                console.error(`❌ Video ${videoId} processing failed:`, err);
            });

        // Return immediately to frontend
        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ Upload complete for: ${title}`);
        console.log(`   Video ID: ${videoRecord.id}`);
        console.log(`   Video URL: ${videoUploadResult.url}`);
        console.log(`   Processing frames in background...`);
        console.log(`${'='.repeat(50)}\n`);

        return {
            success: true,
            video: videoRecord,
            videoUrl: videoUploadResult.url,
            thumbnailUrl: thumbnailUrl,
            message: 'Video uploaded successfully. Processing in background.'
        };

    } catch (error) {
        console.error('❌ Upload failed:', error);

        // Cleanup on failure
        if (videoId) {
            cleanupTempFiles(videoId);
        }

        // Delete video record if created (since processing failed)
        if (videoRecord) {
            try {
                await pool.query('DELETE FROM videos WHERE id = $1', [videoRecord.id]);
                console.log(`🗑️ Deleted failed video record: ${videoRecord.id}`);
            } catch (deleteError) {
                console.error('Failed to delete video record:', deleteError);
            }
        }

        throw error;
    }
}

export default {
    processVideoUpload,
    extractKeyframes,
    extractFeatures,
    extractOCR,
    indexToQdrant,
    indexToElasticsearch,
    cleanupTempFiles,
    createVideoRecord,
    updateVideoStatus,
    createVideoLevelEmbedding  // Export for backfill script
};
