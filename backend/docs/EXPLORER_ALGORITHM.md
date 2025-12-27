# Explorer Feed Algorithm

## Overview

Explorer feed sử dụng weighted scoring algorithm để recommend videos, với cơ chế đảm bảo **variety mỗi lần refresh**.

---

## 🎯 Weighted Scoring

### Công thức tính điểm

```
Final Score = Base Score + Recent Boost + Randomness Factor
```

#### Base Score (Normal engagement)
- **Likes:** 5 points each
- **Shares:** 3 points each (ready for future)
- **Comments:** 2 points each
- **Impressions:** 3 points each

#### Recent Boost (Last 24 hours)
- **Likes:** 20 points each
- **Shares:** 13 points each (ready for future)
- **Comments:** 9 points each
- **Impressions:** 13 points each

#### Randomness Factor
- Thêm 10% randomness vào score để videos có điểm tương tự sẽ shuffle
- Sử dụng seeded random để có thể control consistency

**Ví dụ:**
```
Video A:
- 100 likes (50 trong 24h)
- 20 comments (5 trong 24h)
- 200 impressions (100 trong 24h)

Score = (50 * 5) + (15 * 2) + (100 * 3) +    // Base
        (50 * 20) + (5 * 9) + (100 * 13) +   // Recent boost
        randomness(0-10)                      // Variety

      = 250 + 30 + 300 + 1000 + 45 + 1300 + random
      = 2925 + random(0-10)
```

---

## 🔄 Diversity Mechanisms

### 1. Automatic Randomness (Default)

**Khi không truyền `seed` parameter:**

```javascript
// Frontend không truyền seed
fetchExplorerVideosApi(1, 20, 'weighted');

// Backend tự generate random seed mới mỗi request
const randomSeed = Math.random(); // 0.847362...
```

✅ **Kết quả:** Mỗi lần F5 sẽ thấy videos khác nhau (vị trí shuffle)

### 2. Seeded Randomness (Consistent Pagination)

**Khi truyền `seed` parameter:**

```javascript
// Frontend truyền seed cố định cho một session
const sessionSeed = Date.now();
fetchExplorerVideosApi(1, 20, 'weighted', { seed: sessionSeed });
fetchExplorerVideosApi(2, 20, 'weighted', { seed: sessionSeed }); // Same seed
```

✅ **Kết quả:** 
- Pagination consistent trong cùng session
- Nhưng mỗi session mới (seed khác) sẽ có order khác

### 3. Fresh/Random Mode

**Sort by `fresh` hoặc `random`:**

```javascript
fetchExplorerVideosApi(1, 20, 'fresh');
```

✅ **Kết quả:**
- Chỉ show videos upload trong 7 ngày gần đây
- Hoàn toàn random order
- Ideal cho "What's New" section

### 4. Exclude Watched Videos

**Loại bỏ videos đã xem:**

```javascript
// Requires authentication
fetchExplorerVideosApi(1, 20, 'weighted', { 
  excludeWatched: true 
});
```

✅ **Kết quả:** 
- Không show lại videos user đã xem
- Tăng discovery của nội dung mới

---

## 📊 Use Cases

### Case 1: Maximum Variety (Recommended)

```javascript
// Mỗi lần F5 hoàn toàn khác nhau
fetchExplorerVideosApi(page, 20, 'weighted');
```

**Best for:** 
- Explorer/Discovery page
- User muốn explore nhiều content khác nhau

---

### Case 2: Consistent Session

```javascript
// Session-based seed
const sessionSeed = sessionStorage.getItem('explorerSeed') || Date.now();
sessionStorage.setItem('explorerSeed', sessionSeed);

fetchExplorerVideosApi(page, 20, 'weighted', { 
  seed: sessionSeed 
});
```

**Best for:**
- Khi cần pagination stable
- User scroll và back/forward

---

### Case 3: Fresh Content Only

```javascript
fetchExplorerVideosApi(page, 20, 'fresh');
```

**Best for:**
- "What's New" section
- Show trending recent uploads

---

### Case 4: Personalized Discovery

```javascript
fetchExplorerVideosApi(page, 20, 'weighted', {
  excludeWatched: true
});
```

**Best for:**
- Logged-in users
- Avoid showing repeated content

---

## 🔧 Algorithm Details

### How Randomness Works

```sql
-- Weighted mode
(hashtext(id::text) % 1000 + seed * 1000) * 0.01 as randomness_factor

-- Fresh/Random mode  
(hashtext(v.id::text) % 1000000 + seed * 1000000) as random_seed
```

**Why hash-based instead of RANDOM()?**

| Method | Pros | Cons |
|--------|------|------|
| `RANDOM()` | True random | Can't control, inconsistent pagination |
| `Hash + Seed` | ✅ Deterministic with seed<br>✅ Different per video<br>✅ Consistent pagination | Need to manage seed |

**With hash-based approach:**
- Same video + same seed = same random value
- Different video = different random value
- Different seed = completely different order

---

## 🎮 Frontend Integration Examples

### Example 1: Simple Explorer

```typescript
import { fetchExplorerVideosApi } from '@/api/explorer';

function ExplorerPage() {
  const [videos, setVideos] = useState([]);
  
  const loadVideos = async () => {
    // Simple: no seed = max variety on each load
    const response = await fetchExplorerVideosApi(1, 20, 'weighted');
    setVideos(response.data.videos);
  };
  
  return <VideoGrid videos={videos} onRefresh={loadVideos} />;
}
```

---

### Example 2: With Pagination

```typescript
function ExplorerWithPagination() {
  const [seed] = useState(Date.now()); // Generate once per component mount
  const [page, setPage] = useState(1);
  
  const loadVideos = async (pageNum: number) => {
    // Use same seed for pagination consistency
    const response = await fetchExplorerVideosApi(
      pageNum, 
      20, 
      'weighted',
      { seed }
    );
    setVideos(response.data.videos);
  };
  
  // When user refreshes page (remount), new seed = new order
}
```

---

### Example 3: Exclude Watched

```typescript
function PersonalizedExplorer() {
  const { isAuthenticated } = useAuth();
  
  const loadVideos = async () => {
    const response = await fetchExplorerVideosApi(
      1, 
      20, 
      'weighted',
      { 
        excludeWatched: isAuthenticated // Only if logged in
      }
    );
    setVideos(response.data.videos);
  };
}
```

---

## 📈 Performance Considerations

### Query Complexity

**Weighted mode:** O(n log n)
- Complex aggregations with multiple JOINs
- Scoring calculations
- Hash-based ordering

**Fresh/Random mode:** O(n log n)
- Simpler (no scoring)
- Only recent videos (7 days filter)
- Hash-based random ordering

### Optimization Tips

1. **Database indexes đã có:**
   - `created_at DESC` on videos
   - `video_id` on likes, comments, impressions
   - `user_id` on view_history

2. **Caching strategy (future):**
   - Cache scored results for 5-10 minutes
   - Invalidate on new engagement
   - Different cache per seed

3. **Limit videos:**
   - Default: 20 per page
   - Max: 50 per page
   - Prevents heavy queries

---

## 🧪 Testing Diversity

### Test Scenario 1: Multiple Refreshes

```bash
# Request 1
curl "http://localhost:5000/api/v1/explorer?page=1&limit=5"
# Returns: [V1, V5, V3, V8, V2]

# Request 2 (no seed)
curl "http://localhost:5000/api/v1/explorer?page=1&limit=5"
# Returns: [V3, V1, V8, V5, V2]  ← Different order!
```

### Test Scenario 2: Same Seed

```bash
# Request 1 with seed
curl "http://localhost:5000/api/v1/explorer?page=1&limit=5&seed=0.5"
# Returns: [V2, V7, V4, V1, V9]

# Request 2 with same seed
curl "http://localhost:5000/api/v1/explorer?page=1&limit=5&seed=0.5"
# Returns: [V2, V7, V4, V1, V9]  ← Same order!

# Request 3 with different seed
curl "http://localhost:5000/api/v1/explorer?page=1&limit=5&seed=0.8"
# Returns: [V4, V1, V9, V2, V7]  ← Different order!
```

---

## 🎯 Summary

| Feature | How It Works | When to Use |
|---------|-------------|-------------|
| **No seed** | New random seed every request | Maximum variety, explorer page |
| **With seed** | Consistent order per seed | Pagination stability |
| **Fresh mode** | Recent videos, random order | What's New section |
| **Exclude watched** | Filter out view history | Personalized discovery |

**Recommendation:** 
- **Explorer page:** No seed (max variety)
- **With pagination:** Session seed
- **Logged-in users:** Consider excludeWatched

---

**Last Updated:** December 27, 2025
