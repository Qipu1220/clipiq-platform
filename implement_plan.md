# RCM System Implementation Plan

## Goal Description

Implement a comprehensive Recommendation System (RCM) for the ClipIQ video platform with the following capabilities:

- **Impression Logging**: Track when videos are shown to users (>=600ms visibility) and their watch behavior
- **Qdrant Video-Level Collection**: Create a separate collection for video-level embeddings (pooled from frame embeddings)
- **Rule-Based Feed with Anti-Repeat**: Generate personalized feeds using user profile vectors, popularity metrics, and anti-repeat logic
- **Metrics Dashboard**: Track WATCH_10S metrics (videos watched >= 10 seconds)
- **ML-Based Ranking**: Train a binary classifier to predict P(watch_duration >= 10s | impression)

The system will use:
- **Core Metric**: `WATCH_10S` (watch_duration >= 10 seconds) as the primary engagement signal
- **Impression Threshold**: 600ms on-screen visibility to count as an impression
- **Vector Distance**: Cosine similarity (L2 normalized vectors)
- **Anti-Repeat**: Filter videos seen in last 6 hours + current session

---

## User Review Required

> [!IMPORTANT]
> **Vector Dimension**: The current system uses **1024-dimensional** vectors from the embedding service. This will be used for the new `videos` collection in Qdrant.

> [!WARNING]
> **Breaking Changes**: 
> - The feed endpoint will replace the current `/api/v1/videos` endpoint for the main feed
> - All video impressions will be logged, which will increase database writes significantly
> - Frontend must be updated to generate session_id and call impression/watch endpoints

> [!CAUTION]
> **Performance Considerations**:
> - With limited inventory (few hundred videos), we'll use brute-force filtering instead of complex indexing
> - Seen video cooldown is set to 6 hours (not 24h) to avoid running out of content
> - Qdrant search will retrieve 200 candidates for personal feed (may need tuning)

---

## Proposed Changes

### Backend - Database Layer

#### [MODIFY] [012_create_impression_table.sql](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/database/migrations/012_create_impression_table.sql)

Migration already exists and looks correct. Will verify it has been run and test the schema.

---

### Backend - Services

#### [NEW] [impression.service.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/services/impression.service.js)

Service for impression and watch event database operations:

- `createImpression(data)` - Insert impression record
- `getImpressionById(impressionId)` - Retrieve impression by ID
- `getSeenVideoIds(userId, sessionId, hours)` - Get video IDs seen by user in time window
- `createWatchEvent(data)` - Insert watch event into view_history
- `incrementVideoViews(videoId)` - Increment video view counter
- `getUserImpressions(userId, limit, offset)` - Get user's impression history

#### [NEW] [qdrant.service.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/services/qdrant.service.js)

Create a dedicated Qdrant service to manage video-level collection operations:

- `createVideosCollection()` - Create `videos` collection with cosine distance, 1024-dim vectors
- `upsertVideoEmbedding(videoId, vector, payload)` - Upsert video-level embedding
- `searchSimilarVideos(queryVector, limit, filters)` - Search for similar videos
- `batchRetrieveVideos(videoIds)` - Batch retrieve video vectors by IDs
- `getCollectionInfo()` - Get collection stats
- `l2Normalize(vector)` - L2 normalization utility
- `meanPool(vectors, weights)` - Weighted mean pooling utility

#### [NEW] [analytics.service.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/services/analytics.service.js)

Analytics service for computing popularity metrics:

- `getWatch10Rate7d(videoId)` - Calculate 7-day watch_10s rate for a video
- `getAvgWatch7d(videoId)` - Calculate 7-day average watch duration
- `getBatchPopularityStats(videoIds)` - Batch fetch popularity stats
- `getTopTrendingVideos(limit)` - Get top videos by watch_10s rate
- `getUserActivityLevel(userId)` - Get user's impressions per day
- `getUploaderAffinity(userId, uploaderId)` - Calculate user's affinity to uploader

#### [NEW] [feed.service.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/services/feed.service.js)

Core feed generation logic:

- `buildUserProfile(userId)` - Build user profile vector from watch history (watch_duration >= 10s)
- `getSeenVideos(userId, sessionId, hours)` - Get recently seen video IDs
- `generatePersonalCandidates(userVector, limit)` - Qdrant search for personal recommendations
- `generateTrendingCandidates(limit)` - SQL query for trending videos
- `generateFreshCandidates(limit)` - Recent uploads
- `mergeCandidates(personal, trending, fresh)` - Merge and deduplicate
- `applyFilters(candidates, seenVideos)` - Filter out seen videos
- `applyUploaderCap(candidates, maxPerUploader)` - Cap videos per uploader
- `scoreAndRank(candidates, userVector, weights)` - Rule-based scoring
- `shuffleBySeed(candidates, seed)` - Deterministic shuffle for session variety

#### [MODIFY] [upload.service.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/services/upload.service.js)

Add video-level embedding pooling after keyframe processing:

- After all keyframes are processed, retrieve all frame vectors for the video
- L2 normalize each frame vector
- Compute mean pool
- L2 normalize pooled vector
- Upsert to Qdrant `videos` collection with `id = video_id`

---

### Backend - Controllers

#### [NEW] [impression.controller.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/controllers/impression.controller.js)

Handle impression and watch event logging (uses impression.service.js):

- `POST /impressions` - Log impression when video shown >= 600ms
  - Input: `{ user_id, video_id, session_id, position, source, model_version }`
  - Validate video exists and status='active' (via database query)
  - Call `impressionService.createImpression()`
  - Return `{ impression_id }`

- `POST /watch` - Log watch event when user leaves video
  - Input: `{ impression_id, user_id, video_id, watch_duration, completed }`
  - Call `impressionService.createWatchEvent()`
  - Call `impressionService.incrementVideoViews()`
  - Return success

#### [NEW] [feed.controller.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/controllers/feed.controller.js)

Feed generation endpoint:

- `GET /feed?session_id=<uuid>&limit=20` - Generate personalized feed
  - Extract user_id from auth token
  - Call feed.service to generate feed
  - Insert impressions for returned videos
  - Return feed with impression_ids

#### [NEW] [metrics.controller.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/controllers/metrics.controller.js)

Metrics dashboard endpoints:

- `GET /metrics/watch10s?period=7d` - Overall watch_10s rate
- `GET /metrics/avg-watch?period=7d` - Average watch duration per impression
- `GET /metrics/skip-rate?period=7d` - Skip rate (watch < 1s)
- `GET /metrics/video/:id` - Video-specific metrics

---

### Backend - Routes

#### [NEW] [impression.routes.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/routes/impression.routes.js)

Routes for impression logging:
```javascript
POST /api/v1/impressions - authenticateToken
POST /api/v1/watch - authenticateToken
```

#### [NEW] [feed.routes.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/routes/feed.routes.js)

Routes for feed generation:
```javascript
GET /api/v1/feed - authenticateToken
```

#### [NEW] [metrics.routes.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/routes/metrics.routes.js)

Routes for metrics:
```javascript
GET /api/v1/metrics/watch10s - authenticateToken (admin only)
GET /api/v1/metrics/avg-watch - authenticateToken (admin only)
GET /api/v1/metrics/skip-rate - authenticateToken (admin only)
GET /api/v1/metrics/video/:id - authenticateToken
```

---

### Backend - Scripts

#### [NEW] [init_qdrant_videos.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/scripts/init_qdrant_videos.js)

Initialize Qdrant `videos` collection:
- Create collection with cosine distance, 1024-dim vectors
- Set payload schema for video_id, uploader_id, status, upload_date, duration

#### [NEW] [backfill_qdrant_videos.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/scripts/backfill_qdrant_videos.js)

Backfill existing videos to Qdrant `videos` collection:
- Query all active videos from Postgres
- For each video:
  - Retrieve all frame vectors from Qdrant `clipiq_vectors` collection
  - L2 normalize each frame vector
  - Compute mean pool
  - L2 normalize pooled vector
  - Upsert to `videos` collection with id = video_id
- Report progress and final count

#### [NEW] [build_training_dataset.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/scripts/build_training_dataset.js)

Build ML training dataset:
- Join impressions + view_history on impression_id
- Generate binary label: watch_10s = 1 if watch_duration >= 10, else 0
- Extract features:
  - sim: cosine similarity (from user profile vector)
  - age_hours: hours since upload
  - watch10_rate_7d: video popularity
  - uploader_affinity: user's avg watch time for this uploader
  - user_activity_level: user's impressions per day
- Export to CSV with header
- Report label distribution

---

### Backend - ML (Optional - Milestone 5)

#### [NEW] [ml/train_lr.js](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/backend/src/ml/train_lr.js)

Logistic Regression trainer:
- Load training dataset CSV
- Time-based split (80/20)
- Train LR model (using ml.js or similar)
- Evaluate on validation set (AUC, logloss)
- Save model weights as JSON
- Compare to baseline (rule-based scoring)

---

### Frontend - Session Management

#### [MODIFY] [App.tsx](file:///d:/UIT/Nam3/HK1/SE347/app/clipiq-platform/frontend/src/App.tsx)

Add session_id generation on app load:
- Generate UUID on mount and store in sessionStorage
- Regenerate on F5 (page refresh)
- Pass session_id to feed and impression components

---

### Frontend - Video Player Component

#### [MODIFY] Video player component (location TBD)

Add impression and watch tracking:
- Track video visibility time (IntersectionObserver)
- Call POST /impressions when visible >= 600ms
- Store impression_id for the video
- On video leave (swipe/unmount):
  - Call POST /watch with impression_id, watch_duration, completed
  - Clear impression_id

---

### Frontend - Feed Component

#### [MODIFY] Feed component (location TBD)

Update feed fetching:
- Call GET /feed?session_id=<uuid>&limit=20 instead of /videos
- Store impression_ids returned with each video
- Pass impression_ids to video player for watch tracking

---

## Verification Plan

### Automated Tests

#### Database Migration Test
```bash
cd backend
npm run migrate
# Verify impressions table exists
psql -U clipiq_user -d clipiq_db -c "\d impressions"
psql -U clipiq_user -d clipiq_db -c "\d view_history"
# Check impression_id column exists in view_history
```

#### Qdrant Collection Test
```bash
cd backend
node src/scripts/init_qdrant_videos.js
# Verify collection exists via Qdrant API
curl http://localhost:6333/collections/videos
```

#### Backfill Test
```bash
cd backend
node src/scripts/backfill_qdrant_videos.js
# Verify point count matches video count
curl http://localhost:6333/collections/videos | jq '.result.points_count'
psql -U clipiq_user -d clipiq_db -c "SELECT COUNT(*) FROM videos WHERE status='active';"
```

#### API Endpoint Tests (using curl)

**Test POST /impressions:**
```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' | jq -r '.token')

# Log impression
curl -X POST http://localhost:5000/api/v1/impressions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<user-uuid>",
    "video_id": "<video-uuid>",
    "session_id": "<session-uuid>",
    "position": 0,
    "source": "personal",
    "model_version": "v0"
  }'
# Should return { "impression_id": "<uuid>" }
```

**Test POST /watch:**
```bash
curl -X POST http://localhost:5000/api/v1/watch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "impression_id": "<impression-uuid>",
    "user_id": "<user-uuid>",
    "video_id": "<video-uuid>",
    "watch_duration": 15,
    "completed": false
  }'
# Should return success
```

**Test GET /feed:**
```bash
curl -X GET "http://localhost:5000/api/v1/feed?session_id=<session-uuid>&limit=20" \
  -H "Authorization: Bearer $TOKEN"
# Should return array of 20 videos with impression_ids
```

#### SQL Metrics Test
```bash
# Test watch_10s rate query
psql -U clipiq_user -d clipiq_db -c "
SELECT 
  v.id,
  v.title,
  COUNT(DISTINCT i.id) as total_impressions,
  COUNT(DISTINCT CASE WHEN vh.watch_duration >= 10 THEN i.id END) as watch_10s_count,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN vh.watch_duration >= 10 THEN i.id END) / NULLIF(COUNT(DISTINCT i.id), 0), 2) as watch_10s_rate
FROM videos v
LEFT JOIN impressions i ON i.video_id = v.id AND i.shown_at >= NOW() - INTERVAL '7 days'
LEFT JOIN view_history vh ON vh.impression_id = i.id
WHERE v.status = 'active'
GROUP BY v.id, v.title
ORDER BY watch_10s_rate DESC NULLS LAST
LIMIT 10;
"
```

### Manual Verification

#### Frontend Impression Tracking
1. Start the application: `docker-compose up`
2. Open browser to http://localhost:5173
3. Log in with test account
4. Open browser DevTools Network tab
5. Scroll to a video and let it stay visible for >= 600ms
6. **Expected**: See POST /impressions request in Network tab
7. Swipe away from video or scroll away
8. **Expected**: See POST /watch request in Network tab
9. Check database:
   ```sql
   SELECT * FROM impressions ORDER BY shown_at DESC LIMIT 5;
   SELECT * FROM view_history ORDER BY created_at DESC LIMIT 5;
   ```
10. **Expected**: New rows in both tables with matching impression_id

#### Feed Refresh Behavior
1. Load feed page
2. Note the first 5 video titles
3. Press F5 to refresh
4. **Expected**: Different videos appear (at least 50% different)
5. Refresh again
6. **Expected**: Different videos again
7. Check session_id in sessionStorage
8. **Expected**: New UUID generated on each F5

#### Feed Personalization
1. Watch 5 videos about "cooking" for >= 10 seconds each
2. Refresh feed
3. **Expected**: More cooking-related videos appear in feed
4. Watch 5 videos about "gaming" for >= 10 seconds each
5. Refresh feed
6. **Expected**: Mix of cooking and gaming videos

#### Anti-Repeat Logic
1. Load feed (20 videos)
2. Scroll through all 20 (let each show >= 600ms)
3. Refresh feed
4. **Expected**: None of the previous 20 videos appear
5. Wait 6 hours (or manually update timestamps in DB)
6. Refresh feed
7. **Expected**: Previously seen videos can appear again

### Performance Verification

#### Feed Generation Speed
```bash
# Measure feed endpoint response time
time curl -X GET "http://localhost:5000/api/v1/feed?session_id=$(uuidgen)&limit=20" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -s
# Should complete in < 500ms for few hundred videos
```

#### Qdrant Search Speed
```bash
# Check Qdrant search performance via logs
# Look for search timing in backend logs when calling /feed
docker-compose logs -f backend | grep "Qdrant search"
```

### ML Model Verification (Milestone 5)

#### Dataset Generation
```bash
cd backend
node src/scripts/build_training_dataset.js
# Check output CSV
head -20 training_data.csv
wc -l training_data.csv
# Verify label distribution (should have both 0s and 1s)
awk -F',' '{print $1}' training_data.csv | sort | uniq -c
```

#### Model Training
```bash
cd backend/src/ml
node train_lr.js
# Should output:
# - Training set size
# - Validation set size
# - AUC score
# - Logloss
# - Comparison to baseline
```

---

## Implementation Order

1. **Milestone 1**: Impression logging (backend + frontend)
2. **Milestone 2**: Qdrant video collection + backfill
3. **Milestone 3**: Feed v0 (rule-based)
4. **Milestone 4**: Metrics dashboard
5. **Milestone 5**: ML ranking (optional)

Each milestone should be fully tested before moving to the next.
