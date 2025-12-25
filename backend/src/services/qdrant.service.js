/**
 * Qdrant Service
 * 
 * Manages Qdrant vector database operations for video-level embeddings.
 * Used by the RCM system for personalized recommendations.
 */

import qdrantClient from '../config/qdrant.js';

// Constants
const VIDEOS_COLLECTION = 'videos';
const VECTOR_DIM = 1024; // From embedding service (CLIP or similar)
const FRAMES_COLLECTION = 'clipiq_vectors'; // Existing frame-level collection

/**
 * Create videos collection with cosine distance
 * 
 * @returns {Promise<boolean>} True if created or already exists
 */
export async function createVideosCollection() {
    try {
        // Check if collection already exists
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === VIDEOS_COLLECTION);

        if (exists) {
            console.log(`Collection '${VIDEOS_COLLECTION}' already exists`);
            return true;
        }

        // Create collection with cosine distance
        await qdrantClient.createCollection(VIDEOS_COLLECTION, {
            vectors: {
                size: VECTOR_DIM,
                distance: 'Cosine' // Cosine similarity for normalized vectors
            },
            optimizers_config: {
                default_segment_number: 2
            },
            replication_factor: 1
        });

        // Create payload indexes for efficient filtering
        await qdrantClient.createPayloadIndex(VIDEOS_COLLECTION, {
            field_name: 'video_id',
            field_schema: 'keyword'
        });

        await qdrantClient.createPayloadIndex(VIDEOS_COLLECTION, {
            field_name: 'uploader_id',
            field_schema: 'keyword'
        });

        await qdrantClient.createPayloadIndex(VIDEOS_COLLECTION, {
            field_name: 'status',
            field_schema: 'keyword'
        });

        await qdrantClient.createPayloadIndex(VIDEOS_COLLECTION, {
            field_name: 'upload_date',
            field_schema: 'datetime'
        });

        console.log(`Collection '${VIDEOS_COLLECTION}' created successfully`);
        return true;
    } catch (error) {
        console.error('Error creating videos collection:', error);
        throw error;
    }
}

/**
 * Upsert video embedding to Qdrant
 * 
 * @param {string} videoId - Video UUID
 * @param {number[]} vector - Video-level embedding (1024-dim, L2 normalized)
 * @param {Object} payload - Additional metadata
 * @param {string} payload.video_id - Video UUID
 * @param {string} payload.uploader_id - Uploader UUID
 * @param {string} payload.status - Video status (active/processing/deleted)
 * @param {string} payload.upload_date - Upload timestamp
 * @param {number} payload.duration - Video duration in seconds
 * @param {string} [payload.title] - Video title (optional)
 * @returns {Promise<void>}
 */
export async function upsertVideoEmbedding(videoId, vector, payload) {
    try {
        // Validate vector
        if (!vector || !Array.isArray(vector) || vector.length !== VECTOR_DIM) {
            throw new Error(`Invalid vector: expected ${VECTOR_DIM} dimensions`);
        }

        // Validate vector is L2 normalized (magnitude should be ~1.0)
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (Math.abs(magnitude - 1.0) > 0.01) {
            console.warn(`Vector for ${videoId} is not L2 normalized (magnitude: ${magnitude})`);
        }

        await qdrantClient.upsert(VIDEOS_COLLECTION, {
            wait: true,
            points: [
                {
                    id: videoId,
                    vector: vector,
                    payload: {
                        video_id: videoId,
                        ...payload
                    }
                }
            ]
        });

        console.log(`Upserted video embedding for ${videoId}`);
    } catch (error) {
        console.error(`Error upserting video ${videoId}:`, error);
        throw error;
    }
}

/**
 * Search for similar videos using vector similarity
 * 
 * @param {number[]} queryVector - Query vector (1024-dim, L2 normalized)
 * @param {number} limit - Number of results to return
 * @param {Object} [filters] - Optional filters
 * @param {string} [filters.status] - Filter by status (e.g., 'active')
 * @param {string[]} [filters.excludeIds] - Video IDs to exclude
 * @returns {Promise<Array>} Search results with scores
 */
export async function searchSimilarVideos(queryVector, limit = 20, filters = {}) {
    try {
        // Validate query vector
        if (!queryVector || !Array.isArray(queryVector) || queryVector.length !== VECTOR_DIM) {
            throw new Error(`Invalid query vector: expected ${VECTOR_DIM} dimensions`);
        }

        // Build filter conditions
        const filter = {};

        if (filters.status) {
            filter.must = filter.must || [];
            filter.must.push({
                key: 'status',
                match: { value: filters.status }
            });
        }

        if (filters.excludeIds && filters.excludeIds.length > 0) {
            filter.must_not = filter.must_not || [];
            filter.must_not.push({
                has_id: filters.excludeIds
            });
        }

        // Perform search
        const searchResult = await qdrantClient.search(VIDEOS_COLLECTION, {
            vector: queryVector,
            limit: limit,
            with_payload: true,
            filter: Object.keys(filter).length > 0 ? filter : undefined,
            params: {
                exact: false,
                hnsw_ef: 128
            }
        });

        return searchResult.map(result => ({
            video_id: result.id,
            score: result.score,
            payload: result.payload
        }));
    } catch (error) {
        console.error('Error searching similar videos:', error);
        throw error;
    }
}

/**
 * Batch retrieve video vectors by IDs
 * 
 * @param {string[]} videoIds - Array of video UUIDs
 * @returns {Promise<Array>} Array of {video_id, vector, payload}
 */
export async function batchRetrieveVideos(videoIds) {
    try {
        if (!videoIds || videoIds.length === 0) {
            return [];
        }

        const result = await qdrantClient.retrieve(VIDEOS_COLLECTION, {
            ids: videoIds,
            with_vector: true,
            with_payload: true
        });

        return result.map(point => ({
            video_id: point.id,
            vector: point.vector,
            payload: point.payload
        }));
    } catch (error) {
        console.error('Error batch retrieving videos:', error);
        throw error;
    }
}

/**
 * Get collection info and stats
 * 
 * @returns {Promise<Object>} Collection info
 */
export async function getCollectionInfo() {
    try {
        const info = await qdrantClient.getCollection(VIDEOS_COLLECTION);
        return {
            name: VIDEOS_COLLECTION,
            points_count: info.points_count,
            vectors_count: info.vectors_count,
            indexed_vectors_count: info.indexed_vectors_count,
            status: info.status
        };
    } catch (error) {
        console.error('Error getting collection info:', error);
        throw error;
    }
}

/**
 * Delete video embedding by ID
 * 
 * @param {string} videoId - Video UUID
 * @returns {Promise<void>}
 */
export async function deleteVideoEmbedding(videoId) {
    try {
        await qdrantClient.delete(VIDEOS_COLLECTION, {
            wait: true,
            points: [videoId]
        });

        console.log(`Deleted video embedding for ${videoId}`);
    } catch (error) {
        console.error(`Error deleting video ${videoId}:`, error);
        throw error;
    }
}

/**
 * L2 normalize a vector (unit length)
 * 
 * @param {number[]} vector - Input vector
 * @returns {number[]} L2 normalized vector
 */
export function l2Normalize(vector) {
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
        throw new Error('Invalid vector for normalization');
    }

    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

    if (magnitude === 0) {
        throw new Error('Cannot normalize zero vector');
    }

    return vector.map(val => val / magnitude);
}

/**
 * Weighted mean pooling of vectors
 * 
 * @param {number[][]} vectors - Array of vectors to pool
 * @param {number[]} [weights] - Optional weights for each vector (default: uniform)
 * @returns {number[]} Pooled vector (not normalized)
 */
export function meanPool(vectors, weights = null) {
    if (!vectors || vectors.length === 0) {
        throw new Error('Cannot pool empty vector array');
    }

    const dim = vectors[0].length;

    // Validate all vectors have same dimension
    for (const vec of vectors) {
        if (vec.length !== dim) {
            throw new Error('All vectors must have same dimension');
        }
    }

    // Use uniform weights if not provided
    if (!weights) {
        weights = new Array(vectors.length).fill(1.0 / vectors.length);
    }

    // Validate weights
    if (weights.length !== vectors.length) {
        throw new Error('Weights length must match vectors length');
    }

    // Normalize weights to sum to 1
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / weightSum);

    // Compute weighted mean
    const pooled = new Array(dim).fill(0);

    for (let i = 0; i < vectors.length; i++) {
        const weight = normalizedWeights[i];
        for (let j = 0; j < dim; j++) {
            pooled[j] += vectors[i][j] * weight;
        }
    }

    return pooled;
}

/**
 * Retrieve all frame vectors for a video from the frames collection
 * 
 * @param {string} videoId - Video UUID
 * @returns {Promise<number[][]>} Array of frame vectors
 */
export async function getFrameVectors(videoId) {
    try {
        // Search for all points with matching video_id in payload
        const result = await qdrantClient.scroll(FRAMES_COLLECTION, {
            filter: {
                must: [
                    {
                        key: 'video_id',
                        match: { value: videoId }
                    }
                ]
            },
            with_vector: true,
            with_payload: false,
            limit: 1000 // Adjust based on max frames per video
        });

        if (!result.points || result.points.length === 0) {
            console.warn(`No frame vectors found for video ${videoId}`);
            return [];
        }

        return result.points.map(point => point.vector);
    } catch (error) {
        console.error(`Error retrieving frame vectors for ${videoId}:`, error);
        throw error;
    }
}

/**
 * Get video embeddings for multiple videos from videos collection
 * @param {Array<string>} videoIds - Array of video IDs
 * @returns {Promise<Array>} Array of embedding vectors (1024-dim each)
 */
export async function getVideoEmbeddings(videoIds) {
    try {
        if (!videoIds || videoIds.length === 0) {
            return [];
        }

        // Retrieve points by video_id payload filter
        const result = await qdrantClient.scroll(VIDEOS_COLLECTION, {
            filter: {
                should: videoIds.map(videoId => ({
                    key: 'video_id',
                    match: { value: videoId }
                }))
            },
            with_vector: true,
            with_payload: true,
            limit: videoIds.length
        });

        if (!result.points || result.points.length === 0) {
            console.warn(`No video embeddings found for ${videoIds.length} videos`);
            return [];
        }

        // Map to preserve order and match with videoIds
        const embeddingMap = new Map();
        result.points.forEach(point => {
            if (point.payload && point.payload.video_id) {
                embeddingMap.set(point.payload.video_id, point.vector);
            }
        });

        // Return in same order as videoIds input
        return videoIds
            .map(id => embeddingMap.get(id))
            .filter(vec => vec !== undefined);
    } catch (error) {
        console.error(`Error retrieving video embeddings:`, error);
        throw error;
    }
}

export default {
    createVideosCollection,
    upsertVideoEmbedding,
    searchSimilarVideos,
    batchRetrieveVideos,
    getCollectionInfo,
    deleteVideoEmbedding,
    l2Normalize,
    meanPool,
    getFrameVectors,
    getVideoEmbeddings,
    // Constants
    VIDEOS_COLLECTION,
    FRAMES_COLLECTION,
    VECTOR_DIM
};
