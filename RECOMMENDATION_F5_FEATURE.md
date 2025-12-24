# Feature: F5 Refresh Load New Recommendation Batch

## 📋 Tổng quan

Tính năng này cho phép mỗi lần F5 (refresh page), tab "For You" sẽ load một batch video hoàn toàn mới dựa trên:
- **70% Recommended Videos**: Dựa trên user preferences, trending, similarity
- **30% Fresh Videos**: Videos mới đăng trong 3 ngày gần đây
- **Random Shuffle**: Sử dụng seed để shuffle, mỗi seed = 1 batch khác nhau

## 🔧 Implementation Details

### 1. Backend - Recommendation Service (Python)

#### File: `recommendation-service/app/services/aggregator.py`

**Thêm function mới:**
```python
def get_fresh_videos(db: Session, days: int = 3, limit: int = 50) -> List[Video]:
    """Get recently uploaded videos (last N days)"""
    cutoff_date = datetime.now() - timedelta(days=days)
    fresh_videos = db.query(Video).filter(
        Video.status == "active",
        Video.upload_date >= cutoff_date
    ).order_by(Video.upload_date.desc()).limit(limit).all()
    return fresh_videos
```

**Cập nhật function:**
```python
def get_personalized_feed(
    db: Session,
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    seed: int = None,           # NEW: Random seed
    fresh_ratio: float = 0.3    # NEW: Ratio of fresh videos
) -> List[Video]:
    # Set random seed for consistency
    if seed is not None:
        random.seed(seed)
    
    # Calculate split
    num_fresh = int(limit * fresh_ratio)
    num_recommended = limit - num_fresh
    
    # Get fresh videos
    fresh_videos = get_fresh_videos(db, days=3, limit=num_fresh * 3)
    
    # Get recommended videos (exclude fresh)
    fresh_video_ids = {str(v.id) for v in fresh_videos}
    recommended_videos = db.query(Video).filter(
        Video.status == "active",
        ~Video.id.in_(fresh_video_ids)
    ).offset(offset).limit(num_recommended * 3).all()
    
    # Score and select
    scored_recommended = aggregate_scores(db, user_id, recommended_videos)
    top_recommended = [item["video"] for item in scored_recommended[:num_recommended]]
    
    # Random select fresh
    selected_fresh = random.sample(fresh_videos, min(num_fresh, len(fresh_videos)))
    
    # Combine and shuffle
    final_videos = top_recommended + selected_fresh
    random.shuffle(final_videos)
    
    return final_videos
```

#### File: `recommendation-service/app/routers/recommendations.py`

**Cập nhật endpoint:**
```python
@router.get("/feed/{user_id}", response_model=RecommendationListResponse)
async def get_user_feed(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    seed: int = Query(None, description="Random seed for batch consistency"),
    fresh_ratio: float = Query(0.3, ge=0.0, le=1.0, description="Ratio of fresh videos"),
    db: Session = Depends(get_db)
):
    videos = get_personalized_feed(
        db, user_id, limit=limit, offset=offset,
        seed=seed, fresh_ratio=fresh_ratio
    )
    # ... return response
```

### 2. Backend API (Node.js)

#### File: `backend/src/services/recommendation.service.js`

```javascript
async getPersonalizedFeed(userId, limit = 20, page = 1, seed = null, freshRatio = 0.3) {
    const params = { limit, page };
    if (seed !== null) params.seed = seed;
    if (freshRatio !== null) params.fresh_ratio = freshRatio;
    
    const response = await axios.get(
        `${RECOMMENDATION_SERVICE_URL}/api/recommendations/feed/${userId}`,
        { params, timeout: 5000 }
    );
    return response.data;
}
```

#### File: `backend/src/controllers/recommendation.controller.js`

```javascript
export const getPersonalizedFeed = async (req, res) => {
    const userId = req.user?.id || req.params.userId;
    const { limit = 20, page = 1, seed = null, fresh_ratio = 0.3 } = req.query;

    const recommendations = await recommendationService.getPersonalizedFeed(
        userId,
        parseInt(limit),
        parseInt(page),
        seed ? parseInt(seed) : null,
        fresh_ratio ? parseFloat(fresh_ratio) : 0.3
    );

    // Transform URLs and enrich with likes/saves
    const transformedVideos = recommendations.videos?.map(transformVideoUrls) || [];
    const enrichedVideos = await enrichVideosWithInteractions(transformedVideos, userId);

    res.json({
        success: true,
        data: { ...recommendations, videos: enrichedVideos }
    });
};
```

### 3. Frontend (React)

#### File: `frontend/src/api/recommendationApi.ts`

```typescript
getPersonalizedFeed: async (
    limit: number = 20, 
    page: number = 1, 
    seed: number | null = null,
    freshRatio: number = 0.3
) => {
    const params: any = { limit, page };
    if (seed !== null) params.seed = seed;
    if (freshRatio !== null) params.fresh_ratio = freshRatio;

    const response = await axios.get(`${API_BASE_URL}/recommendations/feed`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
    });
    return response.data;
}
```

#### File: `frontend/src/store/videosSlice.ts`

**Thêm action mới:**
```typescript
appendVideos: (state, action: PayloadAction<Video[]>) => {
    // Append new videos, avoiding duplicates
    const existingIds = new Set(state.videos.map(v => v.id));
    const newVideos = action.payload.filter(v => !existingIds.has(v.id));
    state.videos = [...state.videos, ...newVideos];
}
```

#### File: `frontend/src/components/user/TikTokStyleHome.tsx`

**State management:**
```typescript
const [batchSeed, setBatchSeed] = useState<number>(0);
const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
const hasInitializedRef = useRef(false);
```

**On component mount (F5):**
```typescript
useEffect(() => {
    if (currentUser && activeTab === 'for-you') {
        const newSeed = Date.now();
        console.log(`🔄 Component mounted - New seed: ${newSeed}`);
        dispatch(setVideos([])); // Clear videos
        setBatchSeed(newSeed);   // Generate new seed
        hasInitializedRef.current = true;
    }
}, []); // Run only once on mount
```

**On tab switch:**
```typescript
useEffect(() => {
    if (activeTab === 'for-you' && currentUser && hasInitializedRef.current) {
        const newSeed = Date.now();
        console.log(`🔄 Switched to For You - New seed: ${newSeed}`);
        dispatch(setVideos([]));
        setBatchSeed(newSeed);
    }
}, [activeTab]);
```

**Load videos when seed changes:**
```typescript
useEffect(() => {
    const loadRecommendedVideos = async () => {
        if (batchSeed > 0 && activeTab === 'for-you' && currentUser) {
            setIsLoadingRecommendations(true);
            
            try {
                const response = await recommendationApi.getPersonalizedFeed(
                    30,        // Load 30 videos per batch
                    1,         // First page
                    batchSeed, // Use seed for consistency
                    0.3        // 30% fresh videos
                );
                
                if (response.data?.videos && response.data.videos.length > 0) {
                    dispatch(appendVideos(response.data.videos));
                    console.log(`✅ Loaded batch: ${response.data.videos.length} videos (seed: ${batchSeed})`);
                }
            } catch (error) {
                console.error('❌ Error loading recommendations:', error);
                if (videos.length === 0) {
                    dispatch(fetchVideosThunk({ page: 1, limit: 30 }) as any);
                }
            } finally {
                setIsLoadingRecommendations(false);
            }
        }
    };

    loadRecommendedVideos();
}, [batchSeed, activeTab, currentUser, dispatch]);
```

**Infinite scroll:**
```typescript
useEffect(() => {
    // ... video intersection observer logic ...
    
    // Infinite Scroll Logic
    if (activeTab === 'for-you' && currentVideoIndex >= videos.length - 3 && videos.length > 0) {
        if (!isLoadingRecommendations) {
            const newSeed = Date.now();
            console.log(`📜 Infinite Scroll - New seed: ${newSeed}`);
            setBatchSeed(newSeed); // Trigger new batch load
        }
    }
}, [currentVideoIndex, isMuted, videos.length, activeTab, isLoadingRecommendations]);
```

## 🎯 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER ACTIONS                            │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
            F5 Refresh    Tab Switch    Scroll Down
                │             │             │
                ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. Clear videos: dispatch(setVideos([]))            │  │
│  │  2. Generate seed: setBatchSeed(Date.now())          │  │
│  │  3. Trigger load: useEffect watches batchSeed        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              API Call with Seed Parameter                    │
│  GET /api/v1/recommendations/feed?seed=1702345678901        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND API (Node.js)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. Parse seed from query params                     │  │
│  │  2. Forward to recommendation service                │  │
│  │  3. Transform video URLs                             │  │
│  │  4. Enrich with likes/saves data                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          RECOMMENDATION SERVICE (Python/FastAPI)             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. Set random.seed(seed)                            │  │
│  │  2. Get fresh videos (30%)                           │  │
│  │  3. Get recommended videos (70%)                     │  │
│  │  4. Aggregate scores                                 │  │
│  │  5. Random shuffle with seed                         │  │
│  │  6. Return batch                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE TO FRONTEND                      │
│  { videos: [...30 videos...], total: 30, page: 1 }         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. Receive videos                                   │  │
│  │  2. dispatch(appendVideos(videos))                   │  │
│  │  3. Filter duplicates                                │  │
│  │  4. Render video feed                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing

### Test Case 1: F5 Refresh
1. Load page → Check seed in console
2. F5 refresh → Check new seed (must be different)
3. Compare video list → Must be different

### Test Case 2: Tab Switching
1. Go to "Đã follow" tab
2. Return to "For You" tab
3. Check new seed → Videos should reload

### Test Case 3: Infinite Scroll
1. Scroll to video #28 (out of 30)
2. Check console → Should trigger new batch load
3. Videos should append (not replace)

### Test Case 4: Seed Consistency
1. Note current seed from console
2. Same seed should return same batch (if called again)
3. Different seed should return different batch

## 📊 Expected Results

- ✅ Each F5 generates new seed → New batch
- ✅ 30% fresh videos (uploaded in last 3 days)
- ✅ 70% recommended videos (based on preferences)
- ✅ Videos shuffled randomly per seed
- ✅ No duplicate videos in feed
- ✅ Smooth infinite scroll

## 🐛 Debugging

See `frontend/DEBUG_RECOMMENDATIONS.md` for detailed debugging guide.

## 🔧 Configuration

Adjust in `TikTokStyleHome.tsx`:
```typescript
const response = await recommendationApi.getPersonalizedFeed(
    30,   // Batch size (videos per load)
    1,    // Page number
    batchSeed,
    0.3   // Fresh ratio (0.0 - 1.0)
);
```

Adjust fresh video window in `aggregator.py`:
```python
fresh_videos = get_fresh_videos(db, days=3, limit=num_fresh * 3)
#                                     ^^^^
#                                     Change this
```

