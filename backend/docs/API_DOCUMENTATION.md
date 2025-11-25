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

#### POST /auth/login
Login with email or username and password.

**Request:**
```json
{
  "login": "admin@clipiq.com",
  "password": "Admin@123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@clipiq.com",
      "role": "admin"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d",
      "tokenType": "Bearer"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing credentials
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "MISSING_CREDENTIALS",
  "message": "Email/username and password are required"
}
```

- `401 Unauthorized` - Invalid credentials
```json
{
  "success": false,
  "error": "Authentication failed",
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email/username or password"
}
```

- `403 Forbidden` - Account banned
```json
{
  "success": false,
  "error": "Account suspended",
  "code": "ACCOUNT_BANNED",
  "message": "Your account has been suspended",
  "banReason": "Violation of terms",
  "banExpiry": "2025-12-25T00:00:00.000Z",
  "isPermanent": false
}
```

---

#### POST /auth/logout
Logout and invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d",
    "tokenType": "Bearer"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing refresh token
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "MISSING_REFRESH_TOKEN",
  "message": "Refresh token is required"
}
```

- `401 Unauthorized` - Token expired
```json
{
  "success": false,
  "error": "Refresh token expired",
  "code": "REFRESH_TOKEN_EXPIRED",
  "message": "Your refresh token has expired. Please login again.",
  "expiredAt": "2025-11-25T00:00:00.000Z"
}
```

- `403 Forbidden` - Invalid refresh token
```json
{
  "success": false,
  "error": "Invalid refresh token",
  "code": "REFRESH_TOKEN_INVALID",
  "message": "The provided refresh token is invalid or has been revoked"
}
```

---

#### GET /auth/me
Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@clipiq.com",
      "role": "admin",
      "displayName": "System Administrator",
      "bio": "Main system administrator account",
      "avatarUrl": null,
      "banned": false,
      "warnings": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - No token provided
```json
{
  "error": "Access token required",
  "code": "NO_TOKEN",
  "message": "Please provide a valid access token in the Authorization header"
}
```

- `401 Unauthorized` - Token expired
```json
{
  "error": "Token expired",
  "code": "TOKEN_EXPIRED",
  "message": "Your session has expired. Please login again.",
  "expiredAt": "2025-11-25T00:00:00.000Z"
}
```

- `403 Forbidden` - Invalid token
```json
{
  "error": "Invalid token",
  "code": "TOKEN_INVALID",
  "message": "The provided token is invalid or malformed"
}
```

---

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

---

## Test Credentials

The database has been seeded with test accounts for development:

### Admin Accounts
```
Email: admin@clipiq.com
Password: Admin@123456
Role: admin
```

```
Email: admin2@clipiq.com
Password: Admin@123456
Role: admin
```

### Staff Accounts
- Email: `staff{1-10}@clipiq.com`
- Password: `Staff@123456`
- Role: `staff`

### Regular Users
- Email: `user{1-50}@clipiq.com`
- Password: `User@123456`
- Role: `user`

**⚠️ WARNING:** Change these credentials in production!

---

## Common Error Codes

### Authentication Errors
- `NO_TOKEN` - No access token provided in Authorization header
- `TOKEN_EXPIRED` - Access token has expired
- `TOKEN_INVALID` - Token is malformed or invalid
- `TOKEN_NOT_ACTIVE` - Token is not yet valid (nbf claim)
- `REFRESH_TOKEN_EXPIRED` - Refresh token has expired
- `REFRESH_TOKEN_INVALID` - Refresh token is invalid or revoked
- `MISSING_CREDENTIALS` - Login or password not provided
- `INVALID_CREDENTIALS` - Wrong email/username or password
- `ACCOUNT_BANNED` - User account is suspended

### Authorization Errors
- `NOT_AUTHENTICATED` - User must be logged in
- `FORBIDDEN` - User doesn't have required permissions

### Validation Errors
- `VALIDATION_ERROR` - Input validation failed
- `MISSING_REFRESH_TOKEN` - Refresh token is required

### Resource Errors
- `USER_NOT_FOUND` - User account not found
- `ROUTE_NOT_FOUND` - API endpoint not found

### Server Errors
- `SERVER_ERROR` - Internal server error
- `AUTH_FAILED` - Generic authentication failure

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error details (optional)
  }
}
```

---

## Rate Limiting

The API implements basic rate limiting:
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Testing the API

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin@clipiq.com","password":"Admin@123456"}'
```

**Get Profile:**
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Refresh Token:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

**Logout:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### Using PowerShell

**Login:**
```powershell
$body = @{ login = "admin@clipiq.com"; password = "Admin@123456" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
```

**Get Profile:**
```powershell
$token = "YOUR_ACCESS_TOKEN"
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/me" -Method GET -Headers @{Authorization="Bearer $token"}
```

---

## Docker Setup

### Start All Services
```bash
docker-compose up -d
```

### View Backend Logs
```bash
docker logs clipiq_backend -f
```

### Restart Backend Only
```bash
docker-compose restart backend
```

### Stop All Services
```bash
docker-compose down
```

---

## Environment Variables

Key environment variables for backend:

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=clipiq_user
DB_PASSWORD=clipiq_password
DB_NAME=clipiq_db

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

---

## Security Considerations

### JWT Tokens
- Access tokens expire after 7 days (configurable)
- Refresh tokens expire after 30 days (configurable)
- Refresh tokens are stored in-memory (use Redis in production)
- Tokens include issuer and audience claims

### Passwords
- Hashed using bcrypt with 12 salt rounds
- Minimum 8 characters required
- Must contain uppercase, lowercase, number, and special character

### HTTPS
- Always use HTTPS in production
- Set secure cookies for tokens
- Configure CORS properly

### Rate Limiting
- Implement IP-based rate limiting
- Use Redis for distributed rate limiting in production
- Add exponential backoff for failed login attempts

---

## Future Endpoints (To Be Implemented)
