import pool from '../config/database.js';
import * as qdrantService from './qdrant.service.js';
import * as analyticsService from './analytics.service.js';
import * as impressionService from './impression.service.js';

/**
 * Feed Service
 * Generates personalized video feeds with anti-repeat logic
 */

// MinIO URL prefix for video/thumbnail URLs
const MINIO_BASE_URL = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';

/**
 * Build user profile vector from watch history
 * @param {string} userId - User ID
 * @param {number} limit - Number of recent watches to consider (default: 20)
 * @returns {Promise<Array|null>} L2 normalized profile vector or null if insufficient data
 */
async function buildUserProfileVector(userId, limit = 20) {
  console.log(`[Feed] Building user profile for ${userId}`);
  
  // Get recent videos user watched >= 10 seconds (positive signal)
  const query = `
    SELECT DISTINCT ON (vh.video_id)
      vh.video_id,
      vh.watch_duration
    FROM view_history vh
    WHERE vh.user_id = $1
      AND vh.watch_duration >= 10
    ORDER BY vh.video_id, vh.created_at DESC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [userId, limit]);
  
  if (result.rows.length === 0) {
    console.log(`[Feed] No watch history found for user ${userId}`);
    return null; // No watch history
  }
  
  console.log(`[Feed] Found ${result.rows.length} watched videos for profile building`);
  
  const videoIds = result.rows.map(row => row.video_id);
  const watchDurations = result.rows.map(row => parseInt(row.watch_duration));
  
  // Fetch video embeddings from Qdrant
  const embeddings = await qdrantService.getVideoEmbeddings(videoIds);
  
  if (embeddings.length === 0) {
    console.log(`[Feed] No embeddings found in Qdrant for watched videos`);
    return null;
  }
  
  console.log(`[Feed] Retrieved ${embeddings.length} embeddings from Qdrant`);
  
  // Weighted mean pooling (weight by watch duration)
  const totalWeight = watchDurations.reduce((sum, dur) => sum + dur, 0);
  const weights = watchDurations.map(dur => dur / totalWeight);
  
  const profileVector = qdrantService.meanPool(embeddings, weights);
  console.log(`[Feed] Built profile vector (${profileVector.length}-dim)`);
  
  return qdrantService.l2Normalize(profileVector);
}

/**
 * Get seen video IDs (recent + session)
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {number} recentHours - Hours to look back for recent views (default: 6)
 * @returns {Promise<Set>} Set of video IDs
 */
async function getSeenVideoIds(userId, sessionId, recentHours = 6) {
  const seenRecent = await impressionService.getSeenVideoIds(userId, null, recentHours);
  const seenSession = await impressionService.getSessionSeenVideos(sessionId);
  
  return new Set([...seenRecent, ...seenSession]);
}

/**
 * Generate personal recommendations using Qdrant similarity search
 * @param {string} userId - User ID
 * @param {Array} profileVector - User profile vector
 * @param {Set} seenVideoIds - Videos to exclude
 * @param {number} limit - Number of candidates (default: 30)
 * @returns {Promise<Array>} Array of {video_id, similarity_score}
 */
async function generatePersonalCandidates(userId, profileVector, seenVideoIds, limit = 30) {
  if (!profileVector) {
    return [];
  }
  
  const excludeIds = Array.from(seenVideoIds);
  
  // Search similar videos in Qdrant
  const results = await qdrantService.searchSimilarVideos(
    profileVector,
    limit * 2, // Fetch more to account for filtering
    { 
      status: 'active',
      excludeIds: excludeIds 
    }
  );
  
  return results.slice(0, limit).map(r => ({
    video_id: r.video_id,
    similarity_score: r.score,
    source: 'personal'
  }));
}

/**
 * Generate trending candidates
 * @param {Set} seenVideoIds - Videos to exclude
 * @param {number} limit - Number of candidates (default: 30)
 * @returns {Promise<Array>} Array of {video_id, popularity_score}
 */
async function generateTrendingCandidates(seenVideoIds, limit = 30) {
  const trending = await analyticsService.getTrendingVideos(limit * 2, 5);
  
  return trending
    .filter(v => !seenVideoIds.has(v.video_id))
    .slice(0, limit)
    .map(v => ({
      video_id: v.video_id,
      popularity_score: parseFloat(v.popularity_score),
      watch_10s_rate: parseFloat(v.watch_10s_rate),
      source: 'trending'
    }));
}

/**
 * Generate fresh/random candidates (recent uploads)
 * @param {Set} seenVideoIds - Videos to exclude
 * @param {number} limit - Number of candidates (default: 20)
 * @returns {Promise<Array>} Array of {video_id}
 */
async function generateFreshCandidates(seenVideoIds, limit = 20) {
  const excludeList = Array.from(seenVideoIds);
  
  const query = `
    SELECT id as video_id, upload_date
    FROM videos
    WHERE status = 'active'
      AND ($1::uuid[] IS NULL OR id != ALL($1::uuid[]))
      AND upload_date >= NOW() - INTERVAL '3 days'
    ORDER BY upload_date DESC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [excludeList.length > 0 ? excludeList : null, limit]);
  
  return result.rows.map(row => ({
    video_id: row.video_id,
    source: 'fresh'
  }));
}

/**
 * Merge and deduplicate candidates from multiple sources
 * @param {Array} personalCandidates 
 * @param {Array} trendingCandidates 
 * @param {Array} freshCandidates 
 * @returns {Array} Merged and deduplicated candidates
 */
function mergeCandidates(personalCandidates, trendingCandidates, freshCandidates) {
  const candidateMap = new Map();
  
  // Add personal (highest priority)
  personalCandidates.forEach(c => {
    candidateMap.set(c.video_id, {
      video_id: c.video_id,
      similarity_score: c.similarity_score || 0,
      popularity_score: 0,
      source: c.source,
      priority: 3
    });
  });
  
  // Add trending
  trendingCandidates.forEach(c => {
    if (candidateMap.has(c.video_id)) {
      candidateMap.get(c.video_id).popularity_score = c.popularity_score;
    } else {
      candidateMap.set(c.video_id, {
        video_id: c.video_id,
        similarity_score: 0,
        popularity_score: c.popularity_score || 0,
        source: c.source,
        priority: 2
      });
    }
  });
  
  // Add fresh (lowest priority)
  freshCandidates.forEach(c => {
    if (!candidateMap.has(c.video_id)) {
      candidateMap.set(c.video_id, {
        video_id: c.video_id,
        similarity_score: 0,
        popularity_score: 0,
        source: c.source,
        priority: 1
      });
    }
  });
  
  return Array.from(candidateMap.values());
}

/**
 * Apply uploader diversity cap (max N videos per uploader)
 * @param {Array} candidates - Video candidates
 * @param {number} maxPerUploader - Max videos per uploader (default: 2)
 * @returns {Promise<Array>} Filtered candidates
 */
async function applyUploaderCap(candidates, maxPerUploader = 2) {
  if (candidates.length === 0) return [];
  
  // Fetch uploader info
  const videoIds = candidates.map(c => c.video_id);
  const query = `
    SELECT id as video_id, uploader_id
    FROM videos
    WHERE id = ANY($1)
  `;
  
  const result = await pool.query(query, [videoIds]);
  const uploaderMap = new Map(result.rows.map(row => [row.video_id, row.uploader_id]));
  
  // Apply cap
  const uploaderCounts = new Map();
  const filtered = [];
  
  for (const candidate of candidates) {
    const uploaderId = uploaderMap.get(candidate.video_id);
    if (!uploaderId) continue;
    
    const count = uploaderCounts.get(uploaderId) || 0;
    if (count < maxPerUploader) {
      filtered.push({
        ...candidate,
        uploader_id: uploaderId
      });
      uploaderCounts.set(uploaderId, count + 1);
    }
  }
  
  return filtered;
}

/**
 * Score and rank candidates
 * @param {Array} candidates - Video candidates with scores
 * @param {string} sessionId - Session ID for deterministic shuffle
 * @returns {Array} Ranked candidates
 */
function scoreAndRank(candidates, sessionId) {
  // Calculate combined score
  candidates.forEach(c => {
    c.combined_score = 
      (c.similarity_score * 0.6) + 
      (c.popularity_score * 0.3) + 
      (c.priority * 0.1);
  });
  
  // Sort by score
  candidates.sort((a, b) => b.combined_score - a.combined_score);
  
  // Deterministic shuffle within score tiers to add variety
  const seed = hashString(sessionId);
  shuffleWithSeed(candidates, seed);
  
  return candidates;
}

/**
 * Simple string hash function
 * @param {string} str 
 * @returns {number}
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded shuffle (Fisher-Yates with seed)
 * @param {Array} array 
 * @param {number} seed 
 */
function shuffleWithSeed(array, seed) {
  let currentIndex = array.length;
  
  // Simple seeded random number generator
  const random = (function() {
    let x = seed;
    return function() {
      x = (x * 9301 + 49297) % 233280;
      return x / 233280;
    };
  })();
  
  while (currentIndex !== 0) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}

/**
 * Fetch full video details with engagement metrics
 * @param {Array} videoIds 
 * @returns {Promise<Array>}
 */
async function fetchVideoDetails(videoIds) {
  if (videoIds.length === 0) return [];
  
  const query = `
    SELECT 
      v.id,
      v.title,
      v.description,
      v.thumbnail_url,
      v.video_url,
      v.duration,
      v.views,
      v.upload_date,
      v.status,
      v.uploader_id,
      u.username as uploader_username,
      u.display_name as uploader_display_name,
      u.avatar_url as uploader_avatar,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT c.id) as comments_count
    FROM videos v
    INNER JOIN users u ON v.uploader_id = u.id
    LEFT JOIN likes l ON v.id = l.video_id
    LEFT JOIN comments c ON v.id = c.video_id
    WHERE v.id = ANY($1)
    GROUP BY v.id, u.id
  `;
  
  const result = await pool.query(query, [videoIds]);
  
  // Create map for fast lookup and format URLs
  const videoMap = new Map(result.rows.map(row => [
    row.id,
    {
      ...row,
      video_url: `${MINIO_BASE_URL}/clipiq-videos/${row.video_url}`,
      thumbnail_url: row.thumbnail_url ? `${MINIO_BASE_URL}/clipiq-thumbnails/${row.thumbnail_url}` : null,
    }
  ]));
  
  // Return in same order as videoIds
  return videoIds.map(id => videoMap.get(id)).filter(v => v !== undefined);
}

/**
 * Generate personalized feed for user
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {number} limit - Number of videos to return (default: 20)
 * @returns {Promise<Object>} Feed with videos and impression_ids
 */
async function generatePersonalFeed(userId, sessionId, limit = 20) {
  console.log(`\n[Feed] === Generating personal feed for user ${userId} ===`);
  console.log(`[Feed] Session: ${sessionId}, Limit: ${limit}`);
  
  // Step 1: Get seen videos (anti-repeat)
  const seenVideoIds = await getSeenVideoIds(userId, sessionId, 6);
  console.log(`[Feed] Excluding ${seenVideoIds.size} seen videos`);
  
  // Step 2: Build user profile vector
  const profileVector = await buildUserProfileVector(userId, 20);
  
  // Step 3: Generate candidates from multiple sources
  console.log(`[Feed] Generating candidates from multiple sources...`);
  const [personalCandidates, trendingCandidates, freshCandidates] = await Promise.all([
    generatePersonalCandidates(userId, profileVector, seenVideoIds, 30),
    generateTrendingCandidates(seenVideoIds, 30),
    generateFreshCandidates(seenVideoIds, 20)
  ]);
  
  console.log(`[Feed] Candidates: ${personalCandidates.length} personal, ${trendingCandidates.length} trending, ${freshCandidates.length} fresh`);
  
  // Step 4: Merge and deduplicate
  let candidates = mergeCandidates(personalCandidates, trendingCandidates, freshCandidates);
  console.log(`[Feed] Merged to ${candidates.length} unique candidates`);
  
  // Step 5: Apply uploader cap
  candidates = await applyUploaderCap(candidates, 2);
  console.log(`[Feed] After uploader cap: ${candidates.length} candidates`);
  
  // Step 6: Score and rank
  candidates = scoreAndRank(candidates, sessionId);
  
  // Step 7: Take top N
  const topCandidates = candidates.slice(0, limit);
  console.log(`[Feed] Selected top ${topCandidates.length} videos`);
  
  // Step 8: Fetch full video details
  const videos = await fetchVideoDetails(topCandidates.map(c => c.video_id));
  
  // Step 9: Insert impressions and get impression_ids
  console.log(`[Feed] Inserting ${videos.length} impressions...`);
  
  // Step 9: Insert impressions and get impression_ids
  const impressions = [];
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const candidate = topCandidates[i];
    
    const impression = await impressionService.createImpression({
      user_id: userId,
      video_id: video.id,
      session_id: sessionId,
      position: i,
      source: candidate.source,
      model_version: profileVector ? 'v1_personal' : 'v1_trending'
    });
    
    impressions.push({
      impression_id: impression.id,
      video_id: video.id
    });
  }
  
  // Step 10: Combine results
  const feedItems = videos.map((video, idx) => ({
    ...video,
    impression_id: impressions[idx].impression_id,
    position: idx,
    source: topCandidates[idx].source
  }));
  
  console.log(`[Feed] === Feed generation complete: ${feedItems.length} items ===\n`);
  
  return {
    items: feedItems,
    total: feedItems.length,
    has_profile: profileVector !== null,
    session_id: sessionId
  };
}

export {
  buildUserProfileVector,
  getSeenVideoIds,
  generatePersonalCandidates,
  generateTrendingCandidates,
  generateFreshCandidates,
  mergeCandidates,
  applyUploaderCap,
  scoreAndRank,
  fetchVideoDetails,
  generatePersonalFeed
};
