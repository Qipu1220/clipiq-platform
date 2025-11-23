# ClipIQ Platform - Database Schema

**Date:** 2025-11-24  
**Database:** PostgreSQL 14+  
**Primary Keys:** UUID (using `gen_random_uuid()`)

## Overview

ClipIQ is a YouTube-like video streaming platform with role-based access control and comprehensive moderation features.

**Key Features:**
- Video streaming (files stored in MinIO S3)
- User management (Admin/Staff/User roles)
- Comments with nested replies
- Social features (likes, subscriptions, notifications)
- Moderation system (reports, appeals)
- Analytics (view history)
- Playlists

---

## Tables Summary

| Table | Purpose | Records (Initial) |
|-------|---------|-------------------|
| `users` | User accounts with roles | 62 (2 admin + 10 staff + 50 users) |
| `videos` | Video metadata | 100 |
| `comments` | Video comments with replies | - |
| `likes` | User-video likes | - |
| `subscriptions` | User follows | - |
| `notifications` | User notifications | - |
| `user_reports` | Report user violations | - |
| `video_reports` | Report video violations | - |
| `appeals` | Ban appeals | - |
| `view_history` | Watch analytics | - |
| `playlists` | User playlists | - |
| `playlist_videos` | Playlist-video junction | - |
| `system_settings` | Configuration | ~20+ settings |

---

## Core Tables

### 1. `users`

User accounts with role-based access control.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'admin' | 'staff' | 'user'
    password VARCHAR(255) NOT NULL, -- bcrypt hashed
    banned BOOLEAN DEFAULT FALSE,
    ban_expiry TIMESTAMP NULL, -- NULL = permanent ban
    ban_reason TEXT NULL,
    warnings INTEGER DEFAULT 0,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500), -- MinIO S3 URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `username`, `email`, `role`
- `(banned, ban_expiry)` WHERE banned = TRUE
- `created_at`

**Roles:**
- `admin` - Full system access, user management, toggle maintenance mode
- `staff` - Content moderation, review reports/appeals
- `user` - Regular user (upload videos, comment, like, subscribe)

---

### 2. `videos`

Video metadata (actual video files stored in MinIO S3).

```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thumbnail_url VARCHAR(500), -- MinIO S3 URL
    video_url VARCHAR(500) NOT NULL, -- MinIO S3 key
    duration INTEGER, -- seconds
    views INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active' | 'deleted' | 'flagged'
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `uploader_id`
- `upload_date DESC`, `views DESC`
- `status`
- Full-text search on `title` (GIN index)

**Storage:**
- Videos: `clipiq-videos` bucket in MinIO
- Thumbnails: `clipiq-thumbnails` bucket in MinIO

---

### 3. `comments`

Comments on videos with nested reply support.

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- nested replies
    text TEXT NOT NULL,
    edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `video_id`, `user_id`, `parent_id`
- `created_at DESC`

**Note:** `parent_id` is NULL for top-level comments, otherwise references parent comment.

---

### 4. `likes`

Many-to-many junction table for user-video likes.

```sql
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, video_id)
);
```

**Indexes:**
- `user_id`, `video_id`
- `created_at DESC`
- **Unique constraint:** `(user_id, video_id)`

---

## Social Features

### 5. `subscriptions`

User subscriptions (follows) - self-referencing many-to-many.

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (follower_id != following_id),
    UNIQUE (follower_id, following_id)
);
```

**Indexes:**
- `follower_id`, `following_id`
- `created_at DESC`
- **Unique constraint:** `(follower_id, following_id)`

**Note:** Users cannot subscribe to themselves.

---

### 6. `notifications`

Extensible notification system for various events.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- see types below
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Notification Types:**
- `new_video` - Subscribed channel uploaded new video
- `new_comment` - Someone commented on your video
- `new_like` - Someone liked your video
- `new_subscriber` - Someone subscribed to you
- `video_flagged` - Your video was flagged by staff
- `ban_warning` - Warning issued
- `ban_appeal_resolved` - Appeal decision

**Indexes:**
- `receiver_id`, `type`, `read`
- `created_at DESC`
- `(receiver_id, read)` WHERE read = FALSE

---

## Moderation System

### 7. `user_reports`

Reports about user violations (harassment, spam, etc.).

```sql
CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence_url VARCHAR(500), -- screenshot/link
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'reviewed' | 'resolved'
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (reported_user_id != reported_by_id)
);
```

**Indexes:**
- `status`, `reported_user_id`, `reported_by_id`
- `created_at DESC`

---

### 8. `video_reports`

Reports about video violations (inappropriate content, copyright, etc.).

```sql
CREATE TABLE video_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    reported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `status`, `video_id`, `reported_by_id`
- `created_at DESC`

---

### 9. `appeals`

Ban appeals submitted by users.

```sql
CREATE TABLE appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'denied'
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `status`, `user_id`
- `created_at DESC`

---

## Analytics & Features

### 10. `view_history`

Track user viewing history and watch time.

```sql
CREATE TABLE view_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    watch_duration INTEGER, -- seconds watched
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `user_id`, `video_id`
- `(user_id, video_id)`
- `created_at DESC`

---

### 11. `playlists`

User-created playlists.

```sql
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) DEFAULT 'public', -- 'public' | 'unlisted' | 'private'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `user_id`, `visibility`
- `created_at DESC`

---

### 12. `playlist_videos`

Junction table linking playlists to videos with ordering.

```sql
CREATE TABLE playlist_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, -- order in playlist
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (playlist_id, video_id),
    UNIQUE (playlist_id, position)
);
```

**Indexes:**
- `playlist_id`, `video_id`
- `(playlist_id, position)`
- **Unique constraints:** 
  - `(playlist_id, video_id)` - No duplicate videos
  - `(playlist_id, position)` - No duplicate positions

---

## System Configuration

### 13. `system_settings`

Global configuration key-value store.

```sql
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Default Settings:**
- `maintenance_mode` - Enable/disable maintenance mode
- `app_version` - Current application version
- `max_video_size_mb` - Maximum video file size
- `max_upload_per_day` - Maximum uploads per user per day
- `max_video_duration_minutes` - Maximum video length

---

## Relationships

### One-to-Many (1:N)
- `users` → `videos` (uploader)
- `users` → `comments` (author)
- `videos` → `comments` (video comments)
- `comments` → `comments` (nested replies)
- `users` → `notifications` (receiver)
- `users` → `playlists` (owner)
- `users` → `appeals` (appellant)

### Many-to-Many (M:N)
- `users` ↔ `videos` (via `likes`)
- `users` ↔ `users` (via `subscriptions`)
- `playlists` ↔ `videos` (via `playlist_videos`)

### Moderation Chain
- `users` → `user_reports` (reporter)
- `users` → `video_reports` (reporter)
- `staff/admin` → `user_reports` (reviewer)
- `staff/admin` → `video_reports` (reviewer)
- `staff/admin` → `appeals` (reviewer)

---

## Migrations

Database schema is managed through numbered migration files:

```
backend/src/database/migrations/
├── 001_create_users_table.sql
├── 002_create_videos_table.sql
├── 003_create_comments_table.sql
├── 004_create_likes_table.sql
├── 005_create_reports_tables.sql
├── 006_create_subscriptions_table.sql
├── 007_create_notifications_table.sql
├── 008_create_system_settings_table.sql
├── 009_create_view_history_table.sql
└── 010_create_playlists_tables.sql
```

**Run migrations:**
```bash
npm run migrate
# or
make migrate
```

---

## Seeding

Database is auto-seeded on first startup with:
- 2 admin accounts
- 10 staff accounts
- 50 regular users
- 100 sample videos (2 per user)
- System settings

**Manual seeding:**
```bash
npm run seed
# or
make seed
```

---

## Indexes Strategy

**Performance indexes:**
- Foreign keys (all have indexes)
- Frequently queried columns (status, role, created_at)
- Full-text search (video titles)
- Composite indexes for common queries

**Unique constraints:**
- Prevent duplicate likes
- Prevent duplicate subscriptions
- Prevent self-subscriptions
- Prevent self-reporting

---

## Storage

**PostgreSQL:** All relational data
**MinIO S3:** File storage
- `clipiq-videos` - Video files
- `clipiq-thumbnails` - Thumbnail images  
- `clipiq-avatars` - User avatar images

---

## Security

- **UUID Primary Keys:** Non-sequential, harder to guess
- **Bcrypt Passwords:** Hashed with salt
- **ON DELETE CASCADE:** Automatic cleanup
- **CHECK Constraints:** Data validation at DB level
- **Foreign Keys:** Referential integrity
- **Unique Constraints:** Prevent duplicates

---

## DBML Diagram

View visual database diagram at: https://dbdiagram.io/

Import `DATABASE_SCHEMA.dbml` to see interactive ERD.

---

**Last Updated:** 2025-11-24  
**Schema Version:** 1.0
