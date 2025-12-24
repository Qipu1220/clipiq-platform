# Database Seeders

Seeders để populate database với test data cho recommendation system.

## 📋 Danh sách Seeders

1. **001-seed-admin-users.js** - Tạo admin accounts
2. **002-seed-system-settings.js** - Tạo system settings
3. **003-seed-staff-users.js** - Tạo staff accounts  
4. **004-seed-regular-users.js** - Tạo 50 regular users (user001-user050)
5. **005-seed-minio-buckets.js** - Setup MinIO buckets
6. **006-seed-videos.js** - Upload 100 videos (2 videos/user)
7. **007-seed-interactions.js** - ⭐ **MỚI** - Tạo interaction data cho recommendation testing

## 🎯 Seed Data cho Recommendation Testing

File **007-seed-interactions.js** tạo data phong phú cho user001:

### User001 có:
- ❤️ **25 likes** - Videos tech, gaming, music
- 👁️ **40 views** - Watch history với completion rate
- 💬 **15 comments** - Authentic comments
- 🔖 **12 saved videos** - Bookmark trong playlist "Đã lưu"
- 👥 **8 follows** - Subscribe 8 users khác (user002, user003, user005, user010, user015, user020, user025, user030)

### Trending Videos:
- 📈 **10 trending videos** với 5000-10000 views
- Được tag với 'trending' và 'viral'

### Categories & Tags:
- Videos được phân loại vào 10 categories: Tech, Gaming, Music, Food, Travel, Fitness, DIY, Fashion, Education, Comedy
- Mỗi video có 2-3 tags liên quan

### Ecosystem:
- 20 users khác cũng có interactions (likes, views) để tạo realistic data
- View counts được cập nhật từ view_history

## 🚀 Chạy Seeders

### Chạy tất cả seeders theo thứ tự:
```bash
npm run db:seed
```

### Chạy một seeder cụ thể:
```bash
node backend/src/database/seeders/007-seed-interactions.js
```

### Chạy seed SQL (categories & tags):
```bash
psql -U postgres -d clipiq -f backend/src/database/seeds/seed_recommendation_data.sql
```

## 📊 Kiểm tra Data

### Kiểm tra user001 interactions:
```sql
-- Likes
SELECT COUNT(*) FROM likes WHERE user_id = (SELECT id FROM users WHERE username = 'user001');

-- Views
SELECT COUNT(*) FROM view_history WHERE user_id = (SELECT id FROM users WHERE username = 'user001');

-- Comments
SELECT COUNT(*) FROM comments WHERE user_id = (SELECT id FROM users WHERE username = 'user001');

-- Saved videos
SELECT COUNT(*) 
FROM playlist_videos pv 
JOIN playlists p ON pv.playlist_id = p.id 
WHERE p.user_id = (SELECT id FROM users WHERE username = 'user001');

-- Following
SELECT COUNT(*) FROM subscriptions WHERE follower_id = (SELECT id FROM users WHERE username = 'user001');
```

### Kiểm tra trending videos:
```sql
SELECT title, views, likes_count, comments_count 
FROM videos 
ORDER BY views DESC 
LIMIT 10;
```

### Kiểm tra categories:
```sql
SELECT c.name, COUNT(v.id) as video_count
FROM categories c
LEFT JOIN videos v ON v.category_id = c.id
GROUP BY c.id, c.name
ORDER BY video_count DESC;
```

### Kiểm tra tags:
```sql
SELECT t.name, COUNT(vt.video_id) as usage_count
FROM tags t
LEFT JOIN video_tags vt ON vt.tag_id = t.id
GROUP BY t.id, t.name
ORDER BY usage_count DESC;
```

## 🔄 Reset Data

```bash
# Drop và recreate database
npm run db:reset

# Run migrations
npm run db:migrate

# Run seeders
npm run db:seed

# Run SQL seed cho tags/categories
psql -U postgres -d clipiq -f backend/src/database/seeds/seed_recommendation_data.sql
```

## 🧪 Test Recommendation API

### Lấy similar videos cho user001:
```bash
# Login as user001
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user001", "password": "User@123456"}'

# Sử dụng accessToken để gọi API
curl http://localhost:5000/api/v1/recommendations/similar/{videoId} \
  -H "Authorization: Bearer <accessToken>"
```

### Lấy trending videos:
```bash
curl http://localhost:5000/api/v1/recommendations/trending
```

## 📝 Notes

- Default password cho tất cả users: `User@123456`
- user001 là test user chính cho recommendation system
- Interactions được spread ra trong 30-60 ngày qua (realistic timestamps)
- Video views được cập nhật từ view_history count
- Likes count và comments count được tự động tính

## ⚠️ Prerequisites

1. Database đã được migrate (run `npm run db:migrate`)
2. MinIO đang chạy (docker-compose up)
3. Sample videos đã được download (run `node download-pixabay-videos.js`)

