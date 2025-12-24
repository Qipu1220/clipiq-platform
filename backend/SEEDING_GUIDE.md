# 🌱 Database Seeding Guide - Recommendation Testing

Hướng dẫn chi tiết để seed database với data phong phú cho recommendation system testing.

## 📋 Quick Start

**⚠️ Prerequisites:** Đảm bảo Docker đang chạy:
```bash
docker-compose up -d
docker-compose ps  # Check all services running
```

### Windows (CMD):
```cmd
cd backend
npm run db:seed-full-win
```

### Windows (PowerShell):
```powershell
cd backend
npm run db:seed-full-ps1
```

### Linux/Mac:
```bash
cd backend
chmod +x src/database/seed-full.sh
npm run db:seed-full
```

**💡 Note:** Scripts sử dụng `docker exec` để chạy SQL trong PostgreSQL container, không cần cài `psql` trên host machine.

**🔧 Troubleshooting:**
- Nếu gặp lỗi `ParserError` với `<` character → Bạn đang dùng PowerShell, hãy dùng `npm run db:seed-full-ps1`
- Hoặc chuyển sang CMD: gõ `cmd` rồi chạy `npm run db:seed-full-win`

Hoặc chạy manual từng bước:

```bash
# 1. Run JavaScript seeders
npm run db:seed

# 2. Run SQL seed for categories & tags
psql -U postgres -d clipiq -f src/database/seeds/seed_recommendation_data.sql
```

## 🎯 Seed Data Overview

### 1️⃣ Users (004-seed-regular-users.js)
- **50 users** (user001 - user050)
- Username: `user001`, `user002`, etc.
- Password: `User@123456` (tất cả users)
- Đa dạng bio và interests

### 2️⃣ Videos (006-seed-videos.js)
- **100 videos** tổng cộng
- Mỗi user upload **2 videos**
- Phân bố đều: Tech, Gaming, Music, Cooking, Travel, Fitness, DIY, Fashion, Education, Comedy

### 3️⃣ Tags & Categories (seed_recommendation_data.sql)
- **10 categories**: Comedy, Music, Gaming, Education, Food, Technology, Travel, Fitness, DIY, Fashion
- **20 tags**: funny, viral, tutorial, music, dance, cooking, gaming, tech, travel, fitness, comedy, educational, trending, challenge, reaction, diy, beauty, art, sports, finance
- Tự động assign dựa vào title/description

### 4️⃣ Interactions (007-seed-interactions.js) ⭐ **KEY**

#### user001 Profile:
```
❤️  25 likes       - Tech, Gaming, Music videos
👁️  40 views       - 70% completion rate
💬 15 comments     - Authentic engagement
🔖 12 saved        - Bookmarked favorites
👥 8 following     - user002, user003, user005, user010, user015, user020, user025, user030
```

#### Trending Videos:
- **10 videos** với 5000-10000 views
- Được đánh dấu 'trending' và 'viral'

#### Ecosystem:
- **20 other users** cũng có interactions
- Realistic engagement patterns
- Timestamps spread over 30-60 days

## 📊 Data Verification

### Check user001 interactions:
```sql
-- All interactions summary
SELECT 
    (SELECT COUNT(*) FROM likes WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as likes,
    (SELECT COUNT(*) FROM view_history WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as views,
    (SELECT COUNT(*) FROM comments WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as comments,
    (SELECT COUNT(*) FROM playlist_videos pv 
     JOIN playlists p ON pv.playlist_id = p.id 
     WHERE p.user_id = (SELECT id FROM users WHERE username = 'user001')) as saved,
    (SELECT COUNT(*) FROM subscriptions WHERE follower_id = (SELECT id FROM users WHERE username = 'user001')) as following;
```

### Check trending videos:
```sql
SELECT v.title, v.views, v.likes_count, v.comments_count, c.name as category
FROM videos v
LEFT JOIN categories c ON v.category_id = c.id
ORDER BY v.views DESC
LIMIT 10;
```

### Check categories distribution:
```sql
SELECT c.name, COUNT(v.id) as video_count
FROM categories c
LEFT JOIN videos v ON v.category_id = c.id
GROUP BY c.id, c.name
ORDER BY video_count DESC;
```

### Check user001's liked categories:
```sql
SELECT c.name, COUNT(*) as likes_count
FROM likes l
JOIN videos v ON l.video_id = v.id
JOIN categories c ON v.category_id = c.id
WHERE l.user_id = (SELECT id FROM users WHERE username = 'user001')
GROUP BY c.id, c.name
ORDER BY likes_count DESC;
```

## 🧪 Test Recommendation API

### 1. Login as user001:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user001",
    "password": "User@123456"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "...",
      "username": "user001",
      "email": "user001@test.com"
    }
  }
}
```

### 2. Get similar videos (recommendation):
```bash
# Replace {videoId} with any video ID user001 liked
# Replace {accessToken} with token from login

curl http://localhost:5000/api/v1/recommendations/similar/{videoId} \
  -H "Authorization: Bearer {accessToken}"
```

### 3. Get trending videos:
```bash
curl http://localhost:5000/api/v1/recommendations/trending \
  -H "Authorization: Bearer {accessToken}"
```

### 4. Get personalized feed:
```bash
curl http://localhost:5000/api/v1/recommendations/feed \
  -H "Authorization: Bearer {accessToken}"
```

## 🎨 Frontend Testing

1. **Login** với user001 / User@123456
2. **For You tab**: Xem personalized feed
3. **Explorer tab**: Click vào video → xem similar videos
4. **Like/Save**: Test interactions → check recommendation thay đổi
5. **Trending**: Xem top videos

## 📈 Expected Behavior

### user001 nên thấy recommendations về:
- ✅ **Tech videos** (vì đã like nhiều tech content)
- ✅ **Gaming videos** (vì có interaction history)
- ✅ **Music videos** (vì follow users post music)
- ✅ **Trending content** (videos hot nhất)

### Recommendation engine sẽ dựa vào:
1. **User interactions**: likes, views, comments
2. **Category preferences**: categories user001 engage nhiều
3. **Tags**: common tags trong videos đã like
4. **Social graph**: videos từ users đang follow
5. **Trending**: popular content globally

## 🔄 Reset & Re-seed

```bash
# Stop backend
docker-compose down

# Drop database (nếu cần)
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait for postgres to be ready
sleep 10

# Run migrations
npm run db:migrate

# Seed data
npm run db:seed-full        # Linux/Mac
npm run db:seed-full-win    # Windows
```

## 📝 Notes

- Seed data được thiết kế realistic với timestamps spread over time
- user001 là **main test user** cho recommendation
- Interactions có varied completion rates và engagement patterns
- Categories và tags auto-assigned based on content
- View counts được sync với view_history table

## 🐛 Troubleshooting

### Issue: "No users found"
```bash
# Make sure seeders run in order
npm run db:seed
```

### Issue: "No videos found"
```bash
# Check MinIO is running
docker-compose ps

# Check sample videos downloaded
ls -la backend/src/database/seeders/data/sample-videos/
```

### Issue: "Categories not assigned"
```bash
# Run SQL seed
psql -U postgres -d clipiq -f backend/src/database/seeds/seed_recommendation_data.sql
```

### Issue: "Recommendations not working"
```bash
# Check recommendation service is running
docker-compose ps recommendation

# Check logs
docker-compose logs recommendation
```

## ✅ Success Checklist

- [ ] 50 users created
- [ ] 100 videos uploaded
- [ ] 10 categories with videos
- [ ] 20 tags assigned
- [ ] user001 has 25+ likes
- [ ] user001 has 40+ views
- [ ] user001 has 15+ comments
- [ ] user001 has 12+ saved videos
- [ ] user001 follows 8 users
- [ ] 10 trending videos exist
- [ ] Can login as user001
- [ ] Can get recommendations
- [ ] Explorer tab shows similar videos

Happy testing! 🚀

