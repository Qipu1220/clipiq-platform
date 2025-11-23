# ClipIQ Backend Architecture

## Overview
ClipIQ backend follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         Client (Frontend)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Routes (API Endpoints)         │
│  - Auth, Users, Videos, etc.        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Middlewares (Validation)        │
│  - Auth, Role, Upload, Validation   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Controllers (Handlers)         │
│  - Request/Response handling        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Services (Business Logic)        │
│  - Auth, User, Video, MinIO         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Models (Data Layer)           │
│  - PostgreSQL queries               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Database (PostgreSQL + MinIO)    │
└─────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Routes Layer
- Define API endpoints
- Map URLs to controllers
- Apply middleware chains
- Group related endpoints

### 2. Middlewares Layer
- **auth.middleware**: JWT verification
- **role.middleware**: Role-based access control
- **upload.middleware**: File upload handling
- **validation.middleware**: Request validation
- **error.middleware**: Global error handling
- **ratelimit.middleware**: Rate limiting

### 3. Controllers Layer
- Handle HTTP requests/responses
- Call appropriate services
- Return formatted responses
- Handle errors

### 4. Services Layer
- Business logic implementation
- Database operations
- External API calls (MinIO)
- Complex computations

### 5. Models Layer
- Database schema definitions
- Query builders
- Data validation
- Relationships

## Key Design Patterns

### 1. Repository Pattern
Each model acts as a repository for data access.

### 2. Service Pattern
Business logic is encapsulated in service classes.

### 3. Middleware Chain
Express middleware for cross-cutting concerns.

### 4. Error Handling
Centralized error handling with custom error classes.

## Data Flow Example: Upload Video

```
1. POST /api/v1/videos
   ↓
2. auth.middleware (verify JWT)
   ↓
3. role.middleware (check user role)
   ↓
4. upload.middleware (handle file upload)
   ↓
5. validation.middleware (validate request)
   ↓
6. video.controller.upload()
   ↓
7. minio.service.uploadVideo() (upload to MinIO)
   ↓
8. video.service.create() (save metadata to DB)
   ↓
9. notification.service.notifySubscribers()
   ↓
10. Return response to client
```

## Technology Stack

### Core
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: JavaScript (ES6+)

### Database
- **Primary**: PostgreSQL 14+
- **ORM/Query Builder**: pg (node-postgres) or Prisma

### Storage
- **Object Storage**: MinIO S3

### Authentication
- **JWT**: jsonwebtoken
- **Password Hash**: bcryptjs

### Validation
- **express-validator** or **joi**

### Security
- **helmet**: Security headers
- **cors**: CORS configuration
- **express-rate-limit**: Rate limiting

### File Handling
- **multer**: File uploads
- **minio**: MinIO client

### Utilities
- **winston**: Logging
- **dotenv**: Environment variables
- **nodemon**: Development

### Testing
- **jest**: Unit & integration tests
- **supertest**: API testing

## Security Considerations

1. **Password Security**: Bcrypt hashing
2. **JWT Security**: Short expiration, refresh tokens
3. **File Upload**: Size limits, type validation
4. **SQL Injection**: Parameterized queries
5. **XSS Protection**: Helmet middleware
6. **CSRF Protection**: SameSite cookies
7. **Rate Limiting**: Prevent abuse
8. **Input Validation**: Sanitize all inputs

## Scalability Considerations

1. **Database Indexing**: Optimize queries
2. **Caching**: Redis for sessions/cache
3. **Load Balancing**: Nginx reverse proxy
4. **CDN**: For static assets
5. **Queue System**: Bull/BullMQ for async jobs
6. **Microservices**: Separate video processing service

## Future Enhancements

1. WebSocket for real-time notifications
2. Elasticsearch for advanced search
3. Redis for caching
4. Bull for background jobs
5. GraphQL API alternative
6. Video transcoding service
7. OCR & ASR implementation
