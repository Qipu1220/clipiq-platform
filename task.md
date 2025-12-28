# RCM System Implementation Tasks

## Milestone 1 — Logging (ABSOLUTELY REQUIRED)

### TASK 1.1 — DB Migration: `impressions` + link to `view_history`
- [x] Migration file already exists (012_create_impression_table.sql)
- [x] Verify migration has been run successfully
- [x] Test joins between impressions and view_history

### TASK 1.2 — API: POST /impressions
- [x] Create impression service (`src/services/impression.service.js`)
  - [x] Implement createImpression()
  - [x] Implement getImpressionById()
  - [x] Implement getSeenVideoIds()
  - [x] Implement getUserImpressions()
- [x] Create impression controller (`src/controllers/impression.controller.js`)
- [x] Create impression routes (`src/routes/impression.routes.js`)
- [x] Implement POST /impressions endpoint
  - [x] Validate video exists and status='active'
  - [x] Insert into impressions table via service
  - [x] Return impression_id
- [x] Add route to main server
- [x] Test endpoint with Postman/curl

### TASK 1.3 — API: POST /watch
- [x] Add createWatchEvent() to impression service
- [x] Add incrementVideoViews() to impression service
- [x] Add POST /watch endpoint to impression controller
- [x] Implement watch event logging
  - [x] Insert into view_history with impression_id
  - [x] Update videos.views counter
- [x] Test endpoint with various watch durations

### TASK 1.4 — Client wiring (minimal)
- [x] Add session_id generation on app load
- [x] Implement impression tracking (>=600ms visibility)
- [x] Implement watch event on video leave
- [x] Test impression logging in browser

---

## Milestone 2 — Qdrant Video-level Collection

### TASK 2.1 — Create Qdrant collection `videos`
- [x] Create Qdrant service (`src/services/qdrant.service.js`)
- [x] Implement collection creation function
  - [x] Set distance: cosine
  - [x] Define vector size (DIM from embeddings)
  - [x] Set payload schema
- [x] Create initialization script
- [x] Verify collection exists in Qdrant

### TASK 2.2 — Pooling + Upsert when upload finishes
- [x] Locate frame embedding extraction code
- [x] Implement L2 normalization utility
- [x] Implement mean pooling function
- [x] Add upsert to Qdrant after upload processing
- [x] Test with new video upload

### TASK 2.3 — Backfill demo videos
- [x] Create backfill script (`src/scripts/backfill_qdrant.js`)
- [x] Read active videos from Postgres
- [x] Gather frame embeddings
- [x] Pool to video embeddings
- [x] Upsert to Qdrant
- [x] Verify point count matches video count

---

## Milestone 3 — Feed v0 (Rule-based) with Anti-repeat

### TASK 3.1 — SQL: popularity stats based on WATCH_10S
- [x] Create analytics service (`src/services/analytics.service.js`)
- [x] Implement watch10_rate_7d calculation
- [x] Implement avg_watch_7d calculation
- [x] Add fallback for low impression count
- [x] Test SQL queries

### TASK 3.2 — GET /feed (limit=20)
- [x] Create feed controller (`src/controllers/feed.controller.js`)
- [x] Create feed routes (`src/routes/feed.routes.js`)
- [x] Implement GET /feed endpoint
  - [x] Extract seen_recent (6 hours)
  - [x] Extract seen_session
  - [x] Build user profile vector
    - [x] Fetch last 20 watch_duration>=10
    - [x] Batch retrieve from Qdrant
    - [x] Weighted mean pooling
    - [x] L2 normalize
  - [x] Generate candidates
    - [x] Personal (Qdrant search)
    - [x] Trending (SQL top 50)
    - [x] Fresh/random (recent uploads)
  - [x] Merge and deduplicate
  - [x] Filter seen videos
  - [x] Apply uploader cap (max 2/uploader)
  - [x] Score and rank
  - [x] Insert impressions
  - [x] Return feed with impression_ids
- [x] Add route to main server
- [x] Test feed endpoint

### TASK 3.3 — Ensure F5 shows different videos
- [ ] Implement session-based filtering
- [ ] Add shuffle by session_id seed
- [ ] Test refresh behavior
- [ ] Verify different videos on F5

---

## Milestone 4 — Metrics (basic, WATCH_10S)

### TASK 4.1 — SQL metrics dashboards
- [ ] Create metrics controller (`src/controllers/metrics.controller.js`)
- [ ] Create metrics routes (`src/routes/metrics.routes.js`)
- [ ] Implement daily/weekly metrics
  - [ ] watch_10s_rate
  - [ ] avg_watch_seconds_per_impression
  - [ ] skip_rate
- [ ] Add route to main server
- [ ] Test metrics endpoints

---

## Milestone 5 — Feed v1 (ML ranking)

### TASK 5.1 — Build training dataset (impression-level)
- [ ] Create dataset builder script (`src/scripts/build_training_dataset.js`)
- [ ] Join impressions + view_history
- [ ] Generate label (watch_10s binary)
- [ ] Extract features
  - [ ] sim (Qdrant score)
  - [ ] age_hours
  - [ ] watch10_rate_7d
  - [ ] uploader_affinity
  - [ ] user_activity_level
- [ ] Export to CSV/Parquet
- [ ] Verify label distribution

### TASK 5.2 — Train LR/LightGBM + offline eval
- [ ] Create ML training directory (`src/ml/`)
- [ ] Implement Logistic Regression trainer
- [ ] Implement time-based train/test split
- [ ] Calculate offline metrics (AUC, logloss)
- [ ] Save model artifact
- [ ] Compare to baseline
- [ ] (Optional) Implement LightGBM trainer
- [ ] Document model performance
