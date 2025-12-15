# ClipIQ Platform API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api/v1`  
**Last Updated:** December 2024

---

## 📑 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Roles & Permissions](#roles--permissions)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [🔐 Authentication](#-authentication-endpoints)
  - [👤 Users](#-user-endpoints)
  - [🎥 Videos](#-video-endpoints)
  - [💬 Comments](#-comment-endpoints)
  - [❤️ Likes](#%EF%B8%8F-like-endpoints)
  - [👥 Subscriptions](#-subscription-endpoints)
  - [🔔 Notifications](#-notification-endpoints)
  - [🚩 Reports](#-report-endpoints)
  - [⚙️ Admin](#%EF%B8%8F-admin-endpoints)

---

## Overview

ClipIQ is a TikTok-style video streaming platform with role-based access control and comprehensive moderation features.

**Tech Stack:**
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL 14+
- **Storage:** MinIO (S3-compatible)
- **Authentication:** JWT (Access + Refresh tokens)

**Test Accounts:**

| Role | Username | Password | Email |
|------|----------|----------|-------|
| Admin | admin001 | 123456 | admin@clipiq.com |
| Staff | staff001 | 123456 | staff@clipiq.com |
| User | user001 | 123456 | user001@example.com |

---

## Authentication

**Token Format:**
```http
Authorization: Bearer <access_token>
```

**Token Lifecycle:**
- Access Token: 15 minutes
- Refresh Token: 7 days

---

## Roles & Permissions

| Permission | Admin | Staff | User |
|------------|-------|-------|------|
| View/Upload Videos | ✓ | ✓ | ✓ |
| Comment & Like | ✓ | ✓ | ✓ |
| Report Content | ✓ | ✓ | ✓ |
| Review Reports | ✓ | ✓ | ✗ |
| Ban/Warn Users | ✓ | ✓ | ✗ |
| Delete Any Content | ✓ | ✓ | ✗ |
| Manage Staff | ✓ | ✗ | ✗ |
| System Settings | ✓ | ✗ | ✗ |
| Maintenance Access | ✓ | ✗ | ✗ |

---

## Error Handling

**Standard Format (Problem+JSON RFC 9457):**
```json
{
  "type": "/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Video with ID 'abc123' does not exist",
  "instance": "/api/v1/videos/abc123",
  "timestamp": "2024-12-04T10:30:00Z"
}
```

**HTTP Status Codes:**
- `200` OK - Success
- `201` Created - Resource created
- `204` No Content - Success (no body)
- `400` Bad Request - Validation error
- `401` Unauthorized - Missing/invalid auth
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not exists
- `409` Conflict - Duplicate resource
- `429` Too Many Requests - Rate limit
- `500` Internal Error - Server error
- `503` Service Unavailable - Maintenance mode

---

## API Endpoints

## 🔐 Authentication Endpoints

### POST /auth/login
Authenticate user and get tokens.

**Request:**
```json
{
  "login": "admin@clipiq.com",
  "password": "123456"
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin001",
      "email": "admin@clipiq.com",
      "role": "admin"
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci...",
      "expiresIn": "15m"
    }
  }
}
```

**Errors:**
- `400` Missing credentials
- `401` Invalid credentials
- `403` Account banned

---

### POST /auth/logout
Invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/refresh
Get new access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "expiresIn": "15m"
  }
}
```

**Errors:**
- `401` Token expired/invalid

---

### GET /auth/me
Get current user profile.

**Auth:** Required

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin001",
    "email": "admin@clipiq.com",
    "role": "admin",
    "displayName": "Admin User",
    "bio": "System administrator",
    "avatarUrl": "https://...",
    "banned": false,
    "warnings": 0,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 👤 User Endpoints

### GET /users
List all users (Admin only).

**Auth:** Admin

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `role` (admin|staff|user)
- `banned` (true|false)
- `search` (username/email)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "pages": 8
    }
  }
}
```

---

### GET /users/:username
Get user profile by username.

**Auth:** Public

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "user001",
    "displayName": "John Doe",
    "bio": "Content creator",
    "avatarUrl": "https://...",
    "role": "user",
    "banned": false,
    "stats": {
      "videos": 42,
      "followers": 1500,
      "following": 230
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Errors:**
- `404` User not found

---

### PUT /users/:username
Update user profile (own profile only).

**Auth:** Required

**Request:**
```json
{
  "displayName": "New Name",
  "bio": "New bio",
  "avatarUrl": "https://..."
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "user001",
    "displayName": "New Name",
    ...
  }
}
```

**Errors:**
- `403` Cannot edit other user's profile

---

### DELETE /users/:username
Delete user account (Admin only).

**Auth:** Admin

**Success (204):** No content

**Errors:**
- `403` Insufficient permissions
- `404` User not found

---

### POST /users/:username/ban
Ban user account (Admin/Staff).

**Auth:** Admin or Staff

**Request:**
```json
{
  "reason": "Spam content",
  "duration": 7,
  "permanent": false
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "User banned successfully",
  "data": {
    "username": "user001",
    "banned": true,
    "banReason": "Spam content",
    "banExpiry": "2024-12-11T00:00:00Z"
  }
}
```

---

### POST /users/:username/unban
Unban user (Admin/Staff).

**Auth:** Admin or Staff

**Success (200):**
```json
{
  "success": true,
  "message": "User unbanned successfully"
}
```

---

### POST /users/:username/warn
Warn user (Admin/Staff).

**Auth:** Admin or Staff

**Request:**
```json
{
  "reason": "Inappropriate comment"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "User warned",
  "data": {
    "warnings": 1
  }
}
```

---

### PUT /users/:username/role
Change user role (Admin only).

**Auth:** Admin

**Request:**
```json
{
  "role": "staff"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Role updated",
  "data": {
    "username": "user001",
    "role": "staff"
  }
}
```

---

## 🎥 Video Endpoints

### GET /videos
Get video feed (For You / Following).

**Auth:** Optional

**Query Params:**
- `feed` (foryou|following, default: foryou)
- `page` (default: 1)
- `limit` (default: 10, max: 50)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "uuid",
        "title": "Amazing video",
        "description": "Check this out!",
        "videoUrl": "https://minio.../video.mp4",
        "thumbnailUrl": "https://minio.../thumb.jpg",
        "duration": 45,
        "views": 12500,
        "likes": 850,
        "comments": 124,
        "user": {
          "username": "creator01",
          "displayName": "Creator Name",
          "avatarUrl": "https://..."
        },
        "createdAt": "2024-12-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "hasMore": true
    }
  }
}
```

---

### GET /videos/:id
Get video by ID.

**Auth:** Optional

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Video title",
    "description": "Description",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "duration": 45,
    "views": 12500,
    "likes": 850,
    "comments": 124,
    "user": {...},
    "isLiked": false,
    "isBookmarked": false,
    "createdAt": "2024-12-01T10:00:00Z"
  }
}
```

**Errors:**
- `404` Video not found

---

## 🔍 Search Engine Endpoints

### GET /search
Classify search query using AI.

**Auth:** Optional

**Query Params:**
- `q` (string, required): usage "Who is..."

**Success (200):**
```json
{
  "success": true,
  "data": {
    "title": "text for title search",
    "semantic": "text for vector search",
    "ocr": "text for ocr"
  }
}
```

---

### POST /videos
Upload new video.

**Auth:** Required

**Request (multipart/form-data):**
```
title: "My video"
description: "Description"
videoFile: <file>
thumbnailFile: <file> (optional)
notifyFollowers: true
```

**Success (201):**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "uuid",
    "title": "My video",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "status": "processing"
  }
}
```

**Errors:**
- `400` Invalid file format
- `413` File too large (max 500MB)

---

### PUT /videos/:id
Update video metadata.

**Auth:** Required (owner only)

**Request:**
```json
{
  "title": "New title",
  "description": "New description"
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "New title",
    ...
  }
}
```

**Errors:**
- `403` Not video owner
- `404` Video not found

---

### DELETE /videos/:id
Delete video.

**Auth:** Required (owner, or Admin/Staff)

**Success (204):** No content

---

### GET /videos/search
Search videos.

**Auth:** Optional

**Query Params:**
- `q` (search query, required)
- `page` (default: 1)
- `limit` (default: 20)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "videos": [...],
    "total": 45,
    "query": "funny cats"
  }
}
```

---

### GET /videos/trending
Get trending videos.

**Auth:** Optional

**Success (200):**
```json
{
  "success": true,
  "data": {
    "videos": [...]
  }
}
```

---

## 💬 Comment Endpoints

### GET /videos/:videoId/comments
Get video comments.

**Auth:** Optional

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `sort` (newest|oldest|top, default: newest)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "uuid",
        "text": "Great video!",
        "user": {
          "username": "user001",
          "displayName": "John",
          "avatarUrl": "https://..."
        },
        "likes": 5,
        "replies": 2,
        "createdAt": "2024-12-04T10:00:00Z"
      }
    ],
    "total": 124
  }
}
```

---

### POST /videos/:videoId/comments
Add comment to video.

**Auth:** Required

**Request:**
```json
{
  "text": "Amazing content!",
  "parentId": null
}
```

**Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "text": "Amazing content!",
    "user": {...},
    "createdAt": "2024-12-04T10:30:00Z"
  }
}
```

---

### PUT /comments/:id
Update comment.

**Auth:** Required (owner only)

**Request:**
```json
{
  "text": "Updated comment"
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "text": "Updated comment",
    "updatedAt": "2024-12-04T10:35:00Z"
  }
}
```

---

### DELETE /comments/:id
Delete comment.

**Auth:** Required (owner, or Admin/Staff)

**Success (204):** No content

---

## ❤️ Like Endpoints

### POST /videos/:videoId/like
Toggle like on video.

**Auth:** Required

**Success (200):**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "totalLikes": 851
  }
}
```

---

### GET /videos/:videoId/likes
Get video likes.

**Auth:** Optional

**Query Params:**
- `page` (default: 1)
- `limit` (default: 50)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "username": "user001",
        "displayName": "John",
        "avatarUrl": "https://..."
      }
    ],
    "total": 851
  }
}
```

---

## 👥 Subscription Endpoints

### POST /subscriptions/:username
Follow user.

**Auth:** Required

**Success (201):**
```json
{
  "success": true,
  "message": "Subscribed successfully",
  "data": {
    "following": true
  }
}
```

**Errors:**
- `400` Cannot follow yourself
- `409` Already following

---

### DELETE /subscriptions/:username
Unfollow user.

**Auth:** Required

**Success (204):** No content

---

### GET /subscriptions/followers
Get your followers.

**Auth:** Required

**Success (200):**
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "username": "user001",
        "displayName": "John",
        "avatarUrl": "https://...",
        "followedAt": "2024-12-01T00:00:00Z"
      }
    ],
    "total": 1500
  }
}
```

---

### GET /subscriptions/following
Get users you follow.

**Auth:** Required

**Success (200):**
```json
{
  "success": true,
  "data": {
    "following": [...],
    "total": 230
  }
}
```

---

## 🔔 Notification Endpoints

### GET /notifications
Get user notifications.

**Auth:** Required

**Query Params:**
- `unreadOnly` (true|false)
- `page` (default: 1)
- `limit` (default: 20)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "like",
        "message": "user001 liked your video",
        "data": {
          "videoId": "uuid",
          "username": "user001"
        },
        "read": false,
        "createdAt": "2024-12-04T10:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

**Notification Types:**
- `like` - Video liked
- `comment` - New comment
- `follow` - New follower
- `upload` - New video from followed user
- `mention` - Mentioned in comment

---

### PUT /notifications/:id/read
Mark notification as read.

**Auth:** Required

**Success (200):**
```json
{
  "success": true
}
```

---

### PUT /notifications/read-all
Mark all as read.

**Auth:** Required

**Success (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### DELETE /notifications/:id
Delete notification.

**Auth:** Required

**Success (204):** No content

---

## 🚩 Report Endpoints

### POST /reports/videos
Report video.

**Auth:** Required

**Request:**
```json
{
  "videoId": "uuid",
  "reason": "spam",
  "description": "This is spam content"
}
```

**Reason Options:**
- `spam` - Spam or scam
- `harassment` - Harassment or bullying
- `hate` - Hate speech
- `violence` - Violence
- `nudity` - Nudity or sexual content
- `copyright` - Copyright violation
- `misleading` - Misleading content
- `other` - Other

**Success (201):**
```json
{
  "success": true,
  "message": "Report submitted",
  "data": {
    "reportId": "uuid"
  }
}
```

---

### POST /reports/users
Report user.

**Auth:** Required

**Request:**
```json
{
  "username": "user001",
  "reason": "harassment",
  "description": "Sending abusive messages"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Report submitted"
}
```

---

### POST /reports/comments
Report comment.

**Auth:** Required

**Request:**
```json
{
  "commentId": "uuid",
  "reason": "hate",
  "description": "Hate speech"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Report submitted"
}
```

---

### GET /reports/videos
Get video reports (Staff/Admin).

**Auth:** Staff or Admin

**Query Params:**
- `status` (pending|reviewed|resolved)
- `page` (default: 1)
- `limit` (default: 20)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "video": {...},
        "reporter": {...},
        "reason": "spam",
        "description": "...",
        "status": "pending",
        "createdAt": "2024-12-04T10:00:00Z"
      }
    ],
    "total": 45
  }
}
```

---

### GET /reports/users
Get user reports (Staff/Admin).

**Auth:** Staff or Admin

**Success (200):**
```json
{
  "success": true,
  "data": {
    "reports": [...],
    "total": 12
  }
}
```

---

### PUT /reports/:id/resolve
Resolve report (Staff/Admin).

**Auth:** Staff or Admin

**Request:**
```json
{
  "action": "ban_user",
  "note": "Violated community guidelines",
  "banDuration": 7
}
```

**Action Options:**
- `dismiss` - No action needed
- `warn_user` - Issue warning
- `ban_user` - Ban user
- `delete_content` - Delete content

**Success (200):**
```json
{
  "success": true,
  "message": "Report resolved",
  "data": {
    "reportId": "uuid",
    "status": "resolved",
    "action": "ban_user"
  }
}
```

---

### POST /reports/appeals
Submit ban appeal.

**Auth:** Required

**Request:**
```json
{
  "reason": "I believe the ban was unjust",
  "explanation": "Detailed explanation..."
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Appeal submitted",
  "data": {
    "appealId": "uuid",
    "status": "pending"
  }
}
```

---

### GET /reports/appeals
Get appeals (Staff/Admin).

**Auth:** Staff or Admin

**Query Params:**
- `status` (pending|approved|denied)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "appeals": [
      {
        "id": "uuid",
        "user": {...},
        "reason": "...",
        "status": "pending",
        "createdAt": "2024-12-04T10:00:00Z"
      }
    ]
  }
}
```

---

### PUT /reports/appeals/:id
Process appeal (Staff/Admin).

**Auth:** Staff or Admin

**Request:**
```json
{
  "status": "approved",
  "note": "Appeal approved, ban lifted"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Appeal processed"
}
```

---

## ⚙️ Admin Endpoints

### GET /admin/stats
Get system statistics (Admin only).

**Auth:** Admin

**Success (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1562,
      "admins": 2,
      "staff": 10,
      "regular": 1550,
      "banned": 12
    },
    "videos": {
      "total": 4280,
      "uploadedToday": 45,
      "totalViews": 1250000
    },
    "reports": {
      "pending": 23,
      "resolved": 187
    },
    "appeals": {
      "pending": 3
    }
  }
}
```

---

### GET /admin/users
Manage all users (Admin only).

**Auth:** Admin

**Query Params:**
- `role` (admin|staff|user)
- `banned` (true|false)
- `search` (username/email)
- `page` (default: 1)
- `limit` (default: 50)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 1562
  }
}
```

---

### GET /admin/staff
Manage staff (Admin only).

**Auth:** Admin

**Success (200):**
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "username": "staff001",
        "email": "staff@clipiq.com",
        "stats": {
          "reportsResolved": 124,
          "appealsProcessed": 23
        }
      }
    ]
  }
}
```

---

### POST /admin/staff
Promote user to staff (Admin only).

**Auth:** Admin

**Request:**
```json
{
  "username": "user001"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "User promoted to staff"
}
```

---

### DELETE /admin/staff/:username
Demote staff to user (Admin only).

**Auth:** Admin

**Success (204):** No content

---

### GET /admin/settings
Get system settings (Admin only).

**Auth:** Admin

**Success (200):**
```json
{
  "success": true,
  "data": {
    "maintenance": false,
    "registrationEnabled": true,
    "maxVideoSize": 524288000,
    "maxVideoLength": 300
  }
}
```

---

### PUT /admin/settings
Update system settings (Admin only).

**Auth:** Admin

**Request:**
```json
{
  "maintenance": true,
  "registrationEnabled": false
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Settings updated"
}
```

---

### PUT /admin/maintenance
Toggle maintenance mode (Admin only).

**Auth:** Admin

**Request:**
```json
{
  "enabled": true
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "maintenance": true
  }
}
```

**Note:** During maintenance, only admins can access the API. All other users receive `503 Service Unavailable`.

---

### GET /admin/logs
Get system logs (Admin only).

**Auth:** Admin

**Query Params:**
- `type` (user_banned|user_unbanned|video_deleted|staff_promoted|staff_demoted|maintenance_toggle)
- `page` (default: 1)
- `limit` (default: 50)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "type": "user_banned",
        "performedBy": "admin001",
        "targetUser": "user123",
        "details": {
          "reason": "Spam",
          "duration": 7
        },
        "timestamp": "2024-12-04T10:00:00Z"
      }
    ],
    "total": 342
  }
}
```

---

## Testing

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin@clipiq.com","password":"123456"}'
```

**Get Profile:**
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using PowerShell

**Login:**
```powershell
$body = @{ login = "admin@clipiq.com"; password = "123456" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" `
  -Method POST -Body $body -ContentType "application/json"
```

---

## Rate Limiting

**Default Limits:**
- 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701691200
```

**Error (429):**
```json
{
  "type": "/errors/rate-limit",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded. Try again in 14 minutes.",
  "retryAfter": 840
}
```

---

## Notes

⚠️ **Security:**
- Always use HTTPS in production
- Store refresh tokens securely (HttpOnly cookies recommended)
- Never expose JWT secrets
- Implement CSRF protection for cookie-based auth

💡 **Best Practices:**
- Use pagination for large datasets
- Implement proper error handling
- Follow RESTful conventions
- Version your API endpoints

📝 **Development:**
- Check `docker logs clipiq_backend -f` for server logs
- Database auto-migrates and seeds on startup
- MinIO dashboard: http://localhost:9001 (admin/minioadmin)

---

**For more details, see:**
- [Architecture Documentation](./ARCHITECTURE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Deployment Guide](./DEPLOYMENT.md)
