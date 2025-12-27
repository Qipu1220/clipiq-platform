# Share System Documentation

## Overview

Share system cho phép users chia sẻ videos qua nhiều platforms khác nhau và track share analytics.

---

## 🗄️ Database Schema

### Table: `shares`

```sql
CREATE TABLE shares (
    id UUID PRIMARY KEY,
    user_id UUID,              -- NULL cho anonymous shares
    video_id UUID NOT NULL,
    share_type VARCHAR(50),    -- 'link', 'facebook', 'twitter', etc.
    created_at TIMESTAMP
);
```

**Indexes:**
- `idx_shares_video_id` - Query shares by video
- `idx_shares_user_id` - Query shares by user
- `idx_shares_created_at` - Time-based queries
- `idx_shares_type` - Analytics by share type

### Table: `videos` (updated)

```sql
ALTER TABLE videos ADD COLUMN shares_count INTEGER DEFAULT 0;
```

**Database Trigger:** Auto-updates `shares_count` khi có share mới/xóa

---

## 📡 API Endpoints

### 1. Share a Video

```http
POST /api/v1/videos/:id/share
```

**Auth:** Optional (hỗ trợ cả authenticated và anonymous shares)

**Request Body:**
```json
{
  "share_type": "link"
}
```

**Valid Share Types:**
- `link` - Copy link
- `facebook` - Share to Facebook
- `twitter` - Share to Twitter/X
- `whatsapp` - Share to WhatsApp
- `telegram` - Share to Telegram
- `reddit` - Share to Reddit
- `linkedin` - Share to LinkedIn
- `email` - Share via email
- `embed` - Embed code
- `qr` - QR code
- `other` - Other methods

**Response:**
```json
{
  "success": true,
  "message": "Video shared successfully",
  "data": {
    "shareId": "uuid",
    "shareType": "facebook",
    "sharesCount": 42,
    "sharedAt": "2025-12-27T10:30:00Z"
  }
}
```

---

### 2. Get Video Share Statistics

```http
GET /api/v1/videos/:id/shares
```

**Auth:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "uuid",
    "videoTitle": "Amazing Video",
    "totalShares": 150,
    "sharesByType": [
      {
        "type": "link",
        "count": 80,
        "lastShared": "2025-12-27T10:30:00Z"
      },
      {
        "type": "facebook",
        "count": 45,
        "lastShared": "2025-12-27T09:15:00Z"
      }
    ],
    "recentShares": [
      {
        "id": "uuid",
        "type": "twitter",
        "sharedBy": "john_doe",
        "displayName": "John Doe",
        "sharedAt": "2025-12-27T10:30:00Z"
      }
    ]
  }
}
```

---

### 3. Get My Shared Videos

```http
GET /api/v1/shares/my-shares?page=1&limit=20
```

**Auth:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3,
      "hasMore": true
    }
  }
}
```

---

### 4. Get Share Analytics

```http
GET /api/v1/shares/analytics?period=7d
```

**Auth:** Required (Admin/Staff recommended)

**Query Params:**
- `period`: `24h` | `7d` | `30d` | `all`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "summary": {
      "totalShares": 1523,
      "videosShared": 342,
      "usersWhoShared": 156,
      "anonymousShares": 89
    },
    "sharesByType": [
      {
        "type": "link",
        "count": 850,
        "percentage": 55.81
      },
      {
        "type": "facebook",
        "count": 350,
        "percentage": 22.98
      }
    ],
    "topSharedVideos": [
      {
        "videoId": "uuid",
        "title": "Viral Video",
        "shareCount": 234,
        "uploader": "creator_name"
      }
    ]
  }
}
```

---

## 💻 Frontend Integration

### Basic Usage

```typescript
import { 
  shareVideoApi, 
  getVideoSharesApi,
  copyVideoLink,
  generateShareUrl 
} from '@/api/share';

// 1. Share to Facebook
const handleFacebookShare = async (videoId: string) => {
  try {
    // Generate Facebook share URL
    const shareUrl = generateShareUrl(videoId, 'facebook');
    
    // Open in popup
    window.open(shareUrl, '_blank', 'width=600,height=400');
    
    // Record share (with or without auth)
    await shareVideoApi(videoId, 'facebook', authToken);
    
    console.log('Shared to Facebook!');
  } catch (error) {
    console.error('Failed to share:', error);
  }
};

// 2. Copy link
const handleCopyLink = async (videoId: string) => {
  try {
    const { url } = await copyVideoLink(videoId, authToken);
    alert(`Link copied: ${url}`);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
};

// 3. Get share stats
const loadShareStats = async (videoId: string) => {
  const response = await getVideoSharesApi(videoId);
  console.log('Total shares:', response.data.totalShares);
  console.log('Share breakdown:', response.data.sharesByType);
};
```

---

### Share Button Component Example

```tsx
import React, { useState } from 'react';
import { shareVideoApi, generateShareUrl } from '@/api/share';
import { useAuth } from '@/hooks/useAuth';

interface ShareButtonProps {
  videoId: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ videoId }) => {
  const { token } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  const handleShare = async (platform: ShareType) => {
    try {
      // Open share URL
      const url = generateShareUrl(videoId, platform);
      
      if (platform === 'link') {
        // Copy to clipboard
        await navigator.clipboard.writeText(url);
        alert('Link copied!');
      } else {
        // Open in new window
        window.open(url, '_blank', 'width=600,height=400');
      }
      
      // Record share
      const response = await shareVideoApi(videoId, platform, token);
      setShareCount(response.data.sharesCount);
      setShowMenu(false);
      
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className="share-button">
      <button onClick={() => setShowMenu(!showMenu)}>
        Share {shareCount > 0 && `(${shareCount})`}
      </button>
      
      {showMenu && (
        <div className="share-menu">
          <button onClick={() => handleShare('link')}>
            📋 Copy Link
          </button>
          <button onClick={() => handleShare('facebook')}>
            📘 Facebook
          </button>
          <button onClick={() => handleShare('twitter')}>
            🐦 Twitter
          </button>
          <button onClick={() => handleShare('whatsapp')}>
            💬 WhatsApp
          </button>
          <button onClick={() => handleShare('telegram')}>
            ✈️ Telegram
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## 🔧 Implementation Details

### Anonymous vs Authenticated Shares

**Anonymous Shares:**
```typescript
// No token - user_id will be NULL
await shareVideoApi(videoId, 'link');
```

**Authenticated Shares:**
```typescript
// With token - user_id recorded
await shareVideoApi(videoId, 'facebook', authToken);
```

**Benefits:**
- Track shares even for non-logged-in users
- Better analytics on organic sharing
- Optional user association for personalization

---

### Database Trigger (Auto-update shares_count)

```sql
CREATE TRIGGER trigger_update_shares_count
AFTER INSERT OR DELETE ON shares
FOR EACH ROW
EXECUTE FUNCTION update_video_shares_count();
```

**How it works:**
- `INSERT` → `shares_count++`
- `DELETE` → `shares_count--`
- Automatic, no application code needed

**Alternative (Manual):**
```javascript
// If trigger disabled, update manually in controller
await pool.query(
  'UPDATE videos SET shares_count = shares_count + 1 WHERE id = $1',
  [videoId]
);
```

---

## 📊 Integration with Explorer Feed

Explorer feed đã được update để sử dụng shares data:

```sql
-- Normal shares weight: 3 points
-- Recent shares (24h): 13 points

Score = 
  (shares_count - shares_recent_count) * 3 +
  shares_recent_count * 13 +
  ... (likes, comments, impressions)
```

**Weighted Scoring:**
- Old shares: 3 points each
- Shares in last 24h: 13 points each
- Viral videos với nhiều shares gần đây sẽ được boost cao

---

## 🎯 Use Cases

### 1. Social Sharing
```typescript
// User clicks "Share to Facebook"
const shareUrl = generateShareUrl(videoId, 'facebook');
window.open(shareUrl, '_blank');
await shareVideoApi(videoId, 'facebook', token);
```

### 2. Copy Link
```typescript
// User clicks "Copy Link"
const { url } = await copyVideoLink(videoId, token);
// Automatically copies to clipboard + records share
```

### 3. Embed Video
```typescript
// Generate embed code
const embedCode = `<iframe src="${generateShareUrl(videoId, 'embed')}"></iframe>`;
await shareVideoApi(videoId, 'embed', token);
```

### 4. Analytics Dashboard
```typescript
// Admin views share analytics
const analytics = await getShareAnalyticsApi('30d', adminToken);
console.log('Top platforms:', analytics.data.sharesByType);
console.log('Most shared videos:', analytics.data.topSharedVideos);
```

---

## 🚀 Migration Steps

### 1. Run Migrations

```bash
# From backend directory
npm run migrate

# Or manually with psql
psql -U username -d database_name -f migrations/013_create_shares_table.sql
psql -U username -d database_name -f migrations/014_add_shares_count_to_videos.sql
```

### 2. Verify Tables

```sql
-- Check shares table
SELECT * FROM shares LIMIT 5;

-- Check videos.shares_count column
SELECT id, title, shares_count FROM videos LIMIT 5;

-- Check trigger
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_shares_count';
```

### 3. Test API

```bash
# Test share endpoint
curl -X POST http://localhost:5000/api/v1/videos/{video_id}/share \
  -H "Content-Type: application/json" \
  -d '{"share_type": "link"}'

# Test get shares
curl http://localhost:5000/api/v1/videos/{video_id}/shares
```

---

## 📈 Analytics Insights

### Most Popular Share Types

Track which platforms users prefer:
```sql
SELECT share_type, COUNT(*) as count
FROM shares
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY share_type
ORDER BY count DESC;
```

### Viral Videos

Find videos with most shares:
```sql
SELECT v.id, v.title, v.shares_count
FROM videos v
WHERE v.shares_count > 0
ORDER BY v.shares_count DESC
LIMIT 10;
```

### Share Growth Over Time

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as shares
FROM shares
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

---

## 🔒 Security Considerations

1. **Rate Limiting:** Consider adding rate limit on share endpoint to prevent abuse
2. **Validation:** Share type must be in whitelist
3. **Anonymous Tracking:** Store IP or session ID for spam prevention (optional)
4. **CORS:** Enable for legitimate share sources only

---

## 🎨 UI/UX Recommendations

### Share Button Placement
- Video player controls
- Video card hover menu
- Video details page
- Share count display

### Share Menu Design
```
┌─────────────────┐
│ Share Video     │
├─────────────────┤
│ 📋 Copy Link    │
│ 📘 Facebook     │
│ 🐦 Twitter      │
│ 💬 WhatsApp     │
│ ✈️ Telegram     │
└─────────────────┘
```

### Share Confirmation
- Toast notification: "Link copied!"
- Update share count in real-time
- Show share animation

---

## 📝 Summary

**Features Implemented:**
✅ Database schema (shares table + shares_count)
✅ Backend API (share, get stats, analytics)
✅ Frontend API client with helpers
✅ Database trigger for auto-counting
✅ Explorer integration with weighted scoring
✅ Support for 11 share types
✅ Anonymous + authenticated shares
✅ Comprehensive analytics

**Ready to use!** 🎉

---

**Created:** December 27, 2025  
**Last Updated:** December 27, 2025
