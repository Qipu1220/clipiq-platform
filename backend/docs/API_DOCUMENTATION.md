# ClipIQ API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh token

### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/:username` - Get user profile
- `PUT /users/:username` - Update user
- `DELETE /users/:username` - Delete user (Admin only)
- `POST /users/:username/ban` - Ban user (Admin/Staff)
- `POST /users/:username/warn` - Warn user (Admin/Staff)
- `PUT /users/:username/role` - Change role (Admin only)

### Videos
- `GET /videos` - Get all videos
- `GET /videos/:id` - Get video by ID
- `POST /videos` - Upload video
- `PUT /videos/:id` - Update video
- `DELETE /videos/:id` - Delete video
- `GET /videos/search` - Search videos

### Comments
- `GET /videos/:videoId/comments` - Get comments
- `POST /videos/:videoId/comments` - Add comment
- `PUT /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

### Likes
- `POST /videos/:videoId/like` - Toggle like
- `GET /videos/:videoId/likes` - Get likes

### Reports
- `POST /reports/videos` - Report video
- `POST /reports/users` - Report user
- `POST /reports/appeals` - Submit appeal
- `GET /reports/videos` - Get video reports (Staff)
- `GET /reports/users` - Get user reports (Staff)
- `GET /reports/appeals` - Get appeals (Staff)
- `PUT /reports/:id/resolve` - Resolve report (Staff)

### Subscriptions
- `POST /subscriptions/:username` - Subscribe
- `DELETE /subscriptions/:username` - Unsubscribe
- `GET /subscriptions/followers` - Get followers
- `GET /subscriptions/following` - Get following

### Notifications
- `GET /notifications` - Get notifications
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

### Admin
- `GET /admin/settings` - Get system settings
- `PUT /admin/maintenance` - Toggle maintenance mode
- `GET /admin/stats` - Get system statistics

(Will be expanded with detailed request/response examples)
