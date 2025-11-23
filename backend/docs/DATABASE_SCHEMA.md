# ClipIQ Database Schema

## 📋 Overview

This document describes the complete database schema for the ClipIQ platform (YouTube clone). The schema uses **UUID primary keys** for better scalability, flexibility, and follows PostgreSQL best practices.

## 🎯 Key Features

1. **UUID Primary Keys**: All tables use `UUID` as primary key with `gen_random_uuid()` function
2. **Immutable Foreign Keys**: References use UUID (no cascade updates needed)
3. **username is UNIQUE**: Username is a display name with UNIQUE constraint, not a primary key
4. **Email Support**: For password recovery and notifications
5. **Enhanced Notifications**: 7 notification types (new_video, new_comment, new_like, etc.)
6. **View History**: Track user watch analytics
7. **Playlists**: User-created video playlists with ordering
8. **Better Indexing**: Optimized indexes including full-text search (GIN)
9. **Nested Comments**: Support for comment replies via `parent_id`
10. **Moderation System**: Reports, appeals, and review tracking

## 📊 Database Tables

### Core Tables

#### 1. **users**
Primary user accounts table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique user identifier |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Display username |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'user' | admin \| staff \| user |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `banned` | BOOLEAN | DEFAULT FALSE | Ban status |
| `ban_expiry` | TIMESTAMP | NULL | Ban expiration (NULL = permanent) |
| `ban_reason` | TEXT | NULL | Reason for ban |
| `warnings` | INTEGER | DEFAULT 0, CHECK >= 0 | Warning count |
| `display_name` | VARCHAR(100) | NULL | Optional display name |
| `bio` | TEXT | NULL | User biography |
| `avatar_url` | VARCHAR(500) | NULL | MinIO S3 URL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Auto-updated |

**Indexes:**
- `idx_users_username` (UNIQUE)
- `idx_users_email` (UNIQUE)
- `idx_users_role`
- `idx_users_banned_expiry` (WHERE banned = TRUE)

**Trigger:** `users_updated_at` - Auto-updates `updated_at` on row change

---

#### 2. **videos**
Video metadata (files stored in MinIO S3).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Video identifier |
| `title` | VARCHAR(255) | NOT NULL | Video title |
| `description` | TEXT | NULL | Video description |
| `uploader_id` | UUID | NOT NULL, FK → users.id | Video uploader |
| `thumbnail_url` | VARCHAR(500) | NULL | MinIO S3 thumbnail |
| `video_url` | VARCHAR(500) | NOT NULL | MinIO S3 video file |
| `duration` | INTEGER | CHECK >= 0 | Duration in seconds |
| `views` | INTEGER | DEFAULT 0, CHECK >= 0 | View count |
| `status` | VARCHAR(20) | DEFAULT 'active' | active \| deleted \| flagged |
| `upload_date` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Auto-updated |

**Indexes:**
- `idx_videos_uploader_id`
- `idx_videos_upload_date` (DESC)
- `idx_videos_views` (DESC)
- `idx_videos_status`
- `idx_videos_title` (GIN, full-text search)

**Foreign Keys:**
- `uploader_id` → `users.id` (ON DELETE CASCADE)

---

#### 3. **comments**
User comments on videos with nested reply support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Comment identifier |
| `video_id` | UUID | NOT NULL, FK → videos.id | Target video |
| `user_id` | UUID | NOT NULL, FK → users.id | Comment author |
| `parent_id` | UUID | NULL, FK → comments.id | Parent comment (for replies) |
| `text` | TEXT | NOT NULL | Comment content |
| `edited` | BOOLEAN | DEFAULT FALSE | Edit status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Auto-updated |

**Indexes:**
- `idx_comments_video_id`
- `idx_comments_user_id`
- `idx_comments_parent_id`
- `idx_comments_created_at` (DESC)

**Foreign Keys:**
- `video_id` → `videos.id` (ON DELETE CASCADE)
- `user_id` → `users.id` (ON DELETE CASCADE)
- `parent_id` → `comments.id` (ON DELETE CASCADE)

---

#### 4. **likes**
Many-to-Many relationship between users and videos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Like identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | User who liked |
| `video_id` | UUID | NOT NULL, FK → videos.id | Liked video |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:**
- `idx_likes_user_id`
- `idx_likes_video_id`
- `idx_likes_created_at` (DESC)
- **UNIQUE constraint:** `(user_id, video_id)` - Prevent duplicate likes

**Foreign Keys:**
- `user_id` → `users.id` (ON DELETE CASCADE)
- `video_id` → `videos.id` (ON DELETE CASCADE)

---

### Moderation Tables

#### 5. **user_reports**
Reports about user violations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Report identifier |
| `reported_user_id` | UUID | NOT NULL, FK → users.id | Reported user |
| `reported_by_id` | UUID | NOT NULL, FK → users.id | Reporter |
| `reason` | TEXT | NOT NULL | Report reason |
| `evidence_url` | VARCHAR(500) | NULL | Evidence (screenshot) |
| `status` | VARCHAR(20) | DEFAULT 'pending' | pending \| reviewed \| resolved |
| `reviewed_by_id` | UUID | NULL, FK → users.id | Staff reviewer |
| `reviewed_at` | TIMESTAMP | NULL | Review timestamp |
| `resolution_note` | TEXT | NULL | Staff notes |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Constraint:** `CHECK (reported_user_id != reported_by_id)` - No self-reports

---

#### 6. **video_reports**
Reports about video violations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Report identifier |
| `video_id` | UUID | NOT NULL, FK → videos.id | Reported video |
| `reported_by_id` | UUID | NOT NULL, FK → users.id | Reporter |
| `reason` | TEXT | NOT NULL | Report reason |
| `evidence_url` | VARCHAR(500) | NULL | Evidence |
| `status` | VARCHAR(20) | DEFAULT 'pending' | pending \| reviewed \| resolved |
| `reviewed_by_id` | UUID | NULL, FK → users.id | Staff reviewer |
| `reviewed_at` | TIMESTAMP | NULL | |
| `resolution_note` | TEXT | NULL | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

#### 7. **appeals**
User appeals for bans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Appeal identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | Appealing user |
| `reason` | TEXT | NOT NULL | Appeal reason |
| `status` | VARCHAR(20) | DEFAULT 'pending' | pending \| approved \| denied |
| `reviewed_by_id` | UUID | NULL, FK → users.id | Reviewer |
| `reviewed_at` | TIMESTAMP | NULL | |
| `resolution_note` | TEXT | NULL | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

### Social Features

#### 8. **subscriptions**
User follows (self-referencing Many-to-Many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Subscription identifier |
| `follower_id` | UUID | NOT NULL, FK → users.id | Subscriber |
| `following_id` | UUID | NOT NULL, FK → users.id | Content creator |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Constraints:**
- `CHECK (follower_id != following_id)` - No self-subscriptions
- **UNIQUE:** `(follower_id, following_id)` - Prevent duplicates

**Foreign Keys:**
- `follower_id` → `users.id` (ON DELETE CASCADE)
- `following_id` → `users.id` (ON DELETE CASCADE)

---

#### 9. **notifications**
User notifications for various events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Notification identifier |
| `type` | VARCHAR(50) | NOT NULL | Notification type |
| `receiver_id` | UUID | NOT NULL, FK → users.id | Notification recipient |
| `actor_id` | UUID | NULL, FK → users.id | User who triggered event |
| `video_id` | UUID | NULL, FK → videos.id | Related video |
| `comment_id` | UUID | NULL, FK → comments.id | Related comment |
| `message` | TEXT | NULL | Custom message |
| `read` | BOOLEAN | DEFAULT FALSE | Read status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Notification Types:**
- `new_video` - Subscribed channel uploaded
- `new_comment` - Comment on your video
- `new_like` - Like on your video
- `new_subscriber` - New subscriber
- `video_flagged` - Your video was flagged
- `ban_warning` - Warning issued
- `ban_appeal_resolved` - Appeal result

**Indexes:**
- `idx_notifications_receiver_id`
- `idx_notifications_type`
- `idx_notifications_read`
- `idx_notifications_created_at` (DESC)
- `idx_notifications_receiver_unread` (WHERE read = FALSE)

---

### Analytics & Organization

#### 10. **view_history**
Track user video views and watch time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | View record identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | Viewer |
| `video_id` | UUID | NOT NULL, FK → videos.id | Viewed video |
| `watch_duration` | INTEGER | CHECK >= 0 | Seconds watched |
| `completed` | BOOLEAN | DEFAULT FALSE | Finished watching |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | View timestamp |

**Use Cases:**
- Recommendations algorithm
- Analytics dashboard
- "Continue watching" feature
- View count verification

---

#### 11. **playlists**
User-created playlists.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Playlist identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | Playlist owner |
| `name` | VARCHAR(255) | NOT NULL | Playlist name |
| `description` | TEXT | NULL | Description |
| `visibility` | VARCHAR(20) | DEFAULT 'public' | public \| unlisted \| private |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Auto-updated |

---

#### 12. **playlist_videos**
Junction table for playlists and videos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Entry identifier |
| `playlist_id` | UUID | NOT NULL, FK → playlists.id | Playlist |
| `video_id` | UUID | NOT NULL, FK → videos.id | Video |
| `position` | INTEGER | NOT NULL, CHECK >= 0 | Order position |
| `added_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Constraints:**
- **UNIQUE:** `(playlist_id, video_id)` - No duplicate videos
- **UNIQUE:** `(playlist_id, position)` - No position conflicts

---

#### 13. **system_settings**
Global system configuration (key-value store).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | VARCHAR(100) | PK | Setting key |
| `value` | TEXT | NOT NULL | Setting value |
| `description` | TEXT | NULL | Human-readable description |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Auto-updated |

**Default Settings:**
- `maintenance_mode`: false
- `app_version`: 1.0.0
- `max_video_size_mb`: 500
- `max_upload_per_day`: 10

---

## 🔗 Relationships Diagram

```
users (1) ─────< (N) videos
users (1) ─────< (N) comments
users (1) ─────< (N) likes
users (N) ─────< (N) users (subscriptions - self-referencing)
users (1) ─────< (N) notifications (receiver)
users (1) ─────< (N) user_reports (reported_user, reported_by, reviewed_by)
users (1) ─────< (N) video_reports (reported_by, reviewed_by)
users (1) ─────< (N) appeals
users (1) ─────< (N) view_history
users (1) ─────< (N) playlists

videos (1) ─────< (N) comments
videos (1) ─────< (N) likes
videos (1) ─────< (N) video_reports
videos (1) ─────< (N) notifications
videos (1) ─────< (N) view_history
videos (N) ─────< (N) playlists (via playlist_videos)

comments (1) ─────< (N) comments (nested replies)
comments (1) ─────< (N) notifications

playlists (1) ─────< (N) playlist_videos
```

## 🚀 Migration Order

Execute migrations in this order:

1. `001_create_users_table.sql` - Creates users table with UUID extension
2. `002_create_videos_table.sql` - Requires users
3. `003_create_comments_table.sql` - Requires users, videos
4. `004_create_likes_table.sql` - Requires users, videos
5. `005_create_reports_tables.sql` - Requires users, videos
6. `006_create_subscriptions_table.sql` - Requires users
7. `007_create_notifications_table.sql` - Requires users, videos, comments
8. `008_create_system_settings_table.sql` - Standalone
9. `009_create_view_history_table.sql` - Requires users, videos
10. `010_create_playlists_tables.sql` - Requires users, videos

## 📌 Key Improvements

### ✅ Scalability
- **UUID PKs**: Better for distributed systems, no ID collision
- **No cascade updates**: Foreign keys reference immutable UUIDs
- **Username changes**: Easy - just update username field

### ✅ Performance
- **Optimized indexes**: Covering common query patterns
- **Full-text search**: GIN index on video titles
- **Partial indexes**: e.g., banned users, unread notifications

### ✅ Data Integrity
- **CHECK constraints**: Prevent invalid data (views >= 0, no self-follows)
- **UNIQUE constraints**: Prevent duplicates (likes, subscriptions)
- **Foreign key cascades**: Proper cleanup on deletion

### ✅ Flexibility
- **Extensible notifications**: Easy to add new types
- **Nested comments**: Unlimited reply depth
- **Playlist ordering**: Explicit position field

### ✅ Best Practices
- **Auto-updated timestamps**: Triggers for `updated_at`
- **Soft deletes option**: Status field for videos
- **Evidence storage**: URLs for moderation evidence
- **Audit trail**: Reviewed_by and reviewed_at fields

## 🔍 Common Queries

### Get all videos by a user:
```sql
SELECT v.* FROM videos v
JOIN users u ON v.uploader_id = u.id
WHERE u.username = 'johndoe' AND v.status = 'active'
ORDER BY v.upload_date DESC;
```

### Get like count for a video:
```sql
SELECT COUNT(*) as like_count FROM likes
WHERE video_id = 'some-uuid';
```

### Get user's subscriptions:
```sql
SELECT u.* FROM users u
JOIN subscriptions s ON s.following_id = u.id
WHERE s.follower_id = 'user-uuid';
```

### Get unread notifications:
```sql
SELECT * FROM notifications
WHERE receiver_id = 'user-uuid' AND read = FALSE
ORDER BY created_at DESC;
```

---

## 📖 Additional Resources

- **DBML Diagram**: `DATABASE_SCHEMA.dbml` (view at https://dbdiagram.io/)
- **API Documentation**: `API_DOCUMENTATION.md`
- **Architecture**: `ARCHITECTURE.md`
- **Deployment**: `DEPLOYMENT.md`

---

**Last Updated**: November 23, 2025  
**Database Version**: 2.0 (UUID Primary Keys)
