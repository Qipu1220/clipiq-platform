# ClipIQ Database Schema Documentation

> **Last Updated:** 2025-12-30  
> **Database:** PostgreSQL with UUID Primary Keys  
> **Total Tables:** 17

## Overview

ClipIQ uses a PostgreSQL database with UUID primary keys for all entities. The schema supports:
- Multi-role user system (admin, staff, user)
- Video management with processing states
- Social features (likes, comments, subscriptions, shares)
- Content moderation (reports, appeals, bans, warnings)
- Analytics (impressions, view history)
- Playlists and saved videos

---

## Table Summary

| Table | Description | Key Features |
|-------|-------------|--------------|
| `users` | User accounts | Roles, bans, warnings, profiles |
| `videos` | Video metadata | Processing status, denormalized counts |
| `comments` | Video comments | Nested replies support |
| `likes` | User-video likes | Many-to-many junction |
| `user_reports` | User violation reports | Staff moderation |
| `video_reports` | Video violation reports | Staff moderation |
| `comment_reports` | Comment violation reports | Staff moderation |
| `appeals` | Ban appeals | User appeal system |
| `subscriptions` | User follows | Self-referencing M:M |
| `notifications` | User notifications | Multiple event types |
| `shares` | Video shares | Social sharing tracking |
| `playlists` | User playlists | Public/private/unlisted |
| `playlist_videos` | Playlist-video junction | Ordered videos |
| `view_history` | Watch history | Duration tracking |
| `impressions` | Feed impressions | Recommendation analytics |
| `system_settings` | Global config | Key-value store |
| `system_logs` | Admin actions log | Audit trail |

---

## Core Tables

### users

Core user table supporting admin, staff, and regular users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default | Unique identifier |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Display username |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Account email |
| `role` | VARCHAR(20) | NOT NULL, CHECK | 'admin', 'staff', 'user' |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt hash |
| `banned` | BOOLEAN | default: false | Ban status |
| `ban_expiry` | TIMESTAMP | NULL | NULL = permanent ban |
| `ban_reason` | TEXT | NULL | Shown to user |
| `warnings` | INTEGER | default: 0, CHECK >= 0 | Warning count (0-3) |
| `is_demoted` | BOOLEAN | default: false | Demoted staff flag |
| `display_name` | VARCHAR(100) | NULL | Optional display name |
| `bio` | TEXT | NULL | User biography |
| `avatar_url` | VARCHAR(500) | NULL | MinIO S3 URL |
| `created_at` | TIMESTAMP | default: NOW | Account creation |
| `updated_at` | TIMESTAMP | default: NOW | Last update |

### videos

Video metadata (files stored in MinIO S3).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Video identifier |
| `title` | VARCHAR(255) | NOT NULL | Video title |
| `description` | TEXT | NULL | Video description |
| `uploader_id` | UUID | FK → users, NOT NULL | Uploader reference |
| `thumbnail_url` | VARCHAR(500) | NULL | Thumbnail S3 URL |
| `video_url` | VARCHAR(500) | NOT NULL | Video S3 URL/key |
| `duration` | INTEGER | CHECK >= 0 | Duration in seconds |
| `views` | INTEGER | default: 0 | View count |
| `likes_count` | INTEGER | default: 0 | Cached like count |
| `comments_count` | INTEGER | default: 0 | Cached comment count |
| `shares_count` | INTEGER | default: 0 | Cached share count |
| `status` | VARCHAR(20) | CHECK | 'active', 'deleted', 'flagged' |
| `processing_status` | VARCHAR(20) | CHECK | 'processing', 'ready', 'failed' |
| `upload_date` | TIMESTAMP | default: NOW | Upload timestamp |
| `created_at` | TIMESTAMP | default: NOW | Creation time |
| `updated_at` | TIMESTAMP | default: NOW | Last update |

### comments

User comments on videos with nested reply support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Comment identifier |
| `video_id` | UUID | FK → videos, NOT NULL | Video reference |
| `user_id` | UUID | FK → users, NOT NULL | Author reference |
| `parent_id` | UUID | FK → comments, NULL | Parent for nested replies |
| `text` | TEXT | NOT NULL | Comment content |
| `edited` | BOOLEAN | default: false | Edit flag |
| `created_at` | TIMESTAMP | default: NOW | Creation time |
| `updated_at` | TIMESTAMP | default: NOW | Last update |

### likes

Junction table for user-video likes (Many-to-Many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Like identifier |
| `user_id` | UUID | FK → users, NOT NULL | User reference |
| `video_id` | UUID | FK → videos, NOT NULL | Video reference |
| `created_at` | TIMESTAMP | default: NOW | Like timestamp |

**Constraints:**
- `UNIQUE (user_id, video_id)` - One like per user per video

---

## Content Moderation Tables

### user_reports

Reports about user violations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Report identifier |
| `reported_user_id` | UUID | User being reported |
| `reported_by_id` | UUID | Reporter |
| `reason` | TEXT | Report reason |
| `evidence_url` | VARCHAR(500) | Optional evidence |
| `status` | VARCHAR(20) | 'pending', 'reviewed', 'resolved' |
| `reviewed_by_id` | UUID | Staff reviewer |
| `reviewed_at` | TIMESTAMP | Review timestamp |
| `resolution_note` | TEXT | Resolution details |
| `created_at` | TIMESTAMP | Report creation |

### video_reports

Reports about video violations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Report identifier |
| `video_id` | UUID | Video being reported |
| `reported_by_id` | UUID | Reporter |
| `reason` | TEXT | Report reason |
| `evidence_url` | VARCHAR(500) | Optional evidence |
| `status` | VARCHAR(20) | 'pending', 'reviewed', 'resolved' |
| `reviewed_by_id` | UUID | Staff reviewer |
| `reviewed_at` | TIMESTAMP | Review timestamp |
| `resolution_note` | TEXT | Resolution details |
| `created_at` | TIMESTAMP | Report creation |

### comment_reports

Reports about comment violations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Report identifier |
| `comment_id` | UUID | Comment being reported |
| `reported_by_id` | UUID | Reporter |
| `reason` | TEXT | Violation type with details |
| `evidence_url` | VARCHAR(500) | Optional evidence |
| `status` | VARCHAR(20) | 'pending', 'reviewed', 'resolved' |
| `reviewed_by_id` | UUID | Staff reviewer |
| `reviewed_at` | TIMESTAMP | Review timestamp |
| `resolution_note` | TEXT | Resolution details |
| `created_at` | TIMESTAMP | Report creation |

### appeals

Ban appeals from users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Appeal identifier |
| `user_id` | UUID | User submitting appeal |
| `reason` | TEXT | Appeal reason/explanation |
| `status` | VARCHAR(20) | 'pending', 'approved', 'denied' |
| `reviewed_by_id` | UUID | Staff reviewer |
| `reviewed_at` | TIMESTAMP | Review timestamp |
| `resolution_note` | TEXT | Resolution details |
| `created_at` | TIMESTAMP | Appeal creation |

---

## Social Features Tables

### subscriptions

User follow relationships (self-referencing M:M).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Subscription identifier |
| `follower_id` | UUID | User following (subscriber) |
| `following_id` | UUID | User being followed |
| `created_at` | TIMESTAMP | Subscription time |

**Constraints:**
- `UNIQUE (follower_id, following_id)`
- `CHECK (follower_id != following_id)` - No self-follow

### notifications

User notifications for various events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Notification identifier |
| `type` | VARCHAR(50) | Event type (see below) |
| `receiver_id` | UUID | Recipient user |
| `actor_id` | UUID | Triggering user (NULL for system) |
| `video_id` | UUID | Related video (if applicable) |
| `comment_id` | UUID | Related comment (if applicable) |
| `message` | TEXT | Custom message (optional) |
| `read` | BOOLEAN | Read status |
| `created_at` | TIMESTAMP | Notification time |

**Notification Types:**
- `new_video`, `new_comment`, `new_like`, `new_subscriber`
- `video_flagged`, `ban_warning`, `ban_appeal_resolved`

### shares

Video sharing tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Share identifier |
| `user_id` | UUID | User who shared (NULL for anonymous) |
| `video_id` | UUID | Video shared |
| `share_type` | VARCHAR(50) | 'link', 'facebook', 'twitter', etc. |
| `created_at` | TIMESTAMP | Share timestamp |

---

## Playlist Tables

### playlists

User-created playlists.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Playlist identifier |
| `user_id` | UUID | Playlist owner |
| `name` | VARCHAR(255) | Playlist name |
| `description` | TEXT | Optional description |
| `visibility` | VARCHAR(20) | 'public', 'unlisted', 'private' |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### playlist_videos

Junction table for playlist-video relationships.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Entry identifier |
| `playlist_id` | UUID | Playlist reference |
| `video_id` | UUID | Video reference |
| `position` | INTEGER | Order position in playlist |
| `added_at` | TIMESTAMP | Addition timestamp |

**Constraints:**
- `UNIQUE (playlist_id, video_id)`
- `UNIQUE (playlist_id, position)`

---

## Analytics Tables

### view_history

User video view tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Entry identifier |
| `user_id` | UUID | Viewer |
| `video_id` | UUID | Video watched |
| `watch_duration` | INTEGER | Seconds watched |
| `completed` | BOOLEAN | Full video watched |
| `impression_id` | UUID | Related impression |
| `created_at` | TIMESTAMP | View timestamp |

### impressions

Feed impression tracking for recommendation analytics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Impression identifier |
| `user_id` | UUID | User viewing feed |
| `video_id` | UUID | Video shown |
| `session_id` | UUID | Client session |
| `position` | INTEGER | Position in feed |
| `source` | TEXT | 'personal', 'trending', 'random' |
| `model_version` | TEXT | Recommendation model version |
| `shown_at` | TIMESTAMP | Display timestamp |

---

## System Tables

### system_settings

Global configuration key-value store.

| Key | Default Value | Description |
|-----|---------------|-------------|
| `maintenance_mode` | 'false' | Full maintenance mode |
| `service_maintenance_mode` | 'false' | Staff-accessible maintenance |
| `app_version` | '1.0.0' | Application version |
| `max_video_size_mb` | '500' | Max video file size |
| `max_upload_per_day` | '10' | Daily upload limit |
| `max_video_duration_minutes` | '60' | Max video duration |

### system_logs

Audit log for admin/staff actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Log entry identifier |
| `action_type` | VARCHAR(50) | Action type (e.g., 'user_banned') |
| `performed_by_id` | UUID | Admin/staff who acted |
| `target_user_id` | UUID | Affected user |
| `target_video_id` | UUID | Affected video |
| `details` | TEXT | Human-readable description |
| `metadata` | JSONB | Additional structured data |
| `created_at` | TIMESTAMP | Action timestamp |

---

## Entity Relationship Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   users     │────<│    videos    │────<│  comments   │
└─────────────┘     └──────────────┘     └─────────────┘
      │                    │                    │
      │ ┌──────────────────┼────────────────────┤
      │ │                  │                    │
      │ │    ┌─────────────┴─────────────┐      │
      │ │    │                           │      │
      ▼ ▼    ▼                           ▼      ▼
┌──────────┐ ┌──────────────┐  ┌────────────────────┐
│  likes   │ │ video_reports│  │  comment_reports   │
└──────────┘ └──────────────┘  └────────────────────┘

┌─────────────┐     ┌────────────────┐
│   users     │────<│  subscriptions │>────│ users │
└─────────────┘     └────────────────┘

┌─────────────┐     ┌─────────────┐     ┌───────────────────┐
│   users     │────<│  playlists  │────<│  playlist_videos  │
└─────────────┘     └─────────────┘     └───────────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │    videos    │
                                        └──────────────┘

┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   users     │────<│ impressions │────>│    videos    │
└─────────────┘     └─────────────┘     └──────────────┘
      │                    │
      │                    ▼
      │             ┌──────────────┐
      └────────────>│ view_history │
                    └──────────────┘
```

---

## Indexes Summary

Key indexes for query performance:
- Users: username, email, role, banned status
- Videos: uploader_id, upload_date, views, likes_count, status, processing_status
- Comments: video_id, user_id, parent_id, created_at
- Reports: status, created_at (all report tables)
- Subscriptions: follower_id, following_id
- Notifications: receiver_id, read status, type

---

## Triggers

1. **update_updated_at_column()** - Auto-updates `updated_at` on record changes
   - Applied to: users, videos, comments, playlists, system_settings

2. **update_video_shares_count()** - Auto-updates `videos.shares_count` on share insert/delete

---

## Foreign Key Behavior

| Relationship | ON DELETE |
|--------------|-----------|
| videos → users | CASCADE |
| comments → videos/users | CASCADE |
| likes → users/videos | CASCADE |
| reports → related entity | CASCADE |
| reports.reviewed_by → users | SET NULL |
| notifications.actor → users | SET NULL |
| shares.user → users | SET NULL |
