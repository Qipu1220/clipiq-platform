# ClipIQ Database Schema

## Tables Overview

### users
- id (UUID, PK)
- username (VARCHAR, UNIQUE)
- password (VARCHAR, hashed)
- role (ENUM: admin, staff, user)
- display_name (VARCHAR)
- avatar_url (VARCHAR)
- banned (BOOLEAN)
- ban_expiry (TIMESTAMP)
- warnings (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### videos
- id (UUID, PK)
- title (VARCHAR)
- description (TEXT)
- uploader_username (VARCHAR, FK → users.username)
- video_url (VARCHAR)
- thumbnail_url (VARCHAR)
- views (INTEGER)
- upload_date (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### comments
- id (UUID, PK)
- video_id (UUID, FK → videos.id)
- username (VARCHAR, FK → users.username)
- text (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### likes
- id (UUID, PK)
- video_id (UUID, FK → videos.id)
- username (VARCHAR, FK → users.username)
- created_at (TIMESTAMP)
- UNIQUE(video_id, username)

### video_reports
- id (UUID, PK)
- video_id (UUID, FK → videos.id)
- video_title (VARCHAR)
- reported_by (VARCHAR, FK → users.username)
- reason (TEXT)
- status (ENUM: pending, resolved)
- created_at (TIMESTAMP)
- resolved_at (TIMESTAMP)

### user_reports
- id (UUID, PK)
- reported_user (VARCHAR, FK → users.username)
- reported_by (VARCHAR, FK → users.username)
- reason (TEXT)
- status (ENUM: pending, resolved)
- created_at (TIMESTAMP)
- resolved_at (TIMESTAMP)

### appeals
- id (UUID, PK)
- username (VARCHAR, FK → users.username)
- reason (TEXT)
- status (ENUM: pending, approved, denied)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### subscriptions
- id (UUID, PK)
- follower_username (VARCHAR, FK → users.username)
- following_username (VARCHAR, FK → users.username)
- created_at (TIMESTAMP)
- UNIQUE(follower_username, following_username)

### notifications
- id (UUID, PK)
- user_username (VARCHAR, FK → users.username)
- type (VARCHAR)
- uploader_username (VARCHAR, FK → users.username)
- video_id (UUID, FK → videos.id)
- video_title (VARCHAR)
- read (BOOLEAN)
- created_at (TIMESTAMP)

### system_settings
- id (UUID, PK)
- key (VARCHAR, UNIQUE)
- value (TEXT)
- updated_at (TIMESTAMP)

## Indexes
(To be defined for optimal query performance)

## Relationships
(ERD diagram to be created)
