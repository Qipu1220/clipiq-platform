# Database Seeding Structure

## Overview
Complete database seeding system with 62 accounts and 100 videos for ClipIQ Platform testing.

## Seeding Order

### 1️⃣ `001-seed-admin-users.js`
**Creates**: 2 Administrator accounts
- `admin` (admin@clipiq.com)
- `admin2` (admin2@clipiq.com)
- **Password**: `Admin@123456`
- **Role**: admin
- **Purpose**: Full system administration access

### 2️⃣ `002-seed-system-settings.js`
**Creates**: 20+ system configuration settings
- Site name, description
- Upload limits (500MB, 3600 seconds)
- Video formats (mp4, webm, mov, avi)
- MinIO bucket names
- Feature toggles (comments, likes, etc.)

### 3️⃣ `003-seed-staff-users.js`
**Creates**: 10 Staff accounts
- `staff_mod1` through `staff_mod10`
- Emails: mod1@clipiq.com through mod10@clipiq.com
- **Password**: `Staff@123456`
- **Role**: staff
- **Purpose**: Content moderation, user support, quality control

### 4️⃣ `004-seed-regular-users.js`
**Creates**: 50 Regular user accounts
- `user001` through `user050`
- Emails: user001@test.com through user050@test.com
- **Password**: `User@123456`
- **Role**: user
- **Purpose**: Content creators (each uploads 2 videos)

### 5️⃣ `005-seed-minio-buckets.js`
**Creates**: 3 MinIO storage buckets
- `videos` (private) - Video files
- `thumbnails` (public-read) - Video thumbnails
- `avatars` (public-read) - User profile pictures
- **Note**: Does NOT upload videos anymore (moved to 006)

### 6️⃣ `006-seed-videos.js`
**Creates**: 100 video records + uploads to MinIO
- **Source**: 100 videos from `data/sample-videos/` (downloaded via Pixabay)
- **Distribution**: Each of 50 users uploads 2 videos
- **Metadata**: Realistic titles, descriptions, categories
- **Status**: All videos published
- **Storage**: Uploaded to MinIO `videos` bucket

## Total Data Created

| Resource | Count | Details |
|----------|-------|---------|
| **Admins** | 2 | System administrators |
| **Staff** | 10 | Content moderators |
| **Users** | 50 | Regular content creators |
| **Total Accounts** | 62 | All user accounts |
| **Videos** | 100 | 2 per user, uploaded to MinIO |
| **System Settings** | 20+ | Platform configuration |
| **MinIO Buckets** | 3 | Video storage infrastructure |

## Default Credentials

### Administrators
```
Username: admin
Email: admin@clipiq.com
Password: Admin@123456

Username: admin2
Email: admin2@clipiq.com
Password: Admin@123456
```

### Staff (Pattern)
```
Username: staff_mod1 to staff_mod10
Email: mod1@clipiq.com to mod10@clipiq.com
Password: Staff@123456
```

### Users (Pattern)
```
Username: user001 to user050
Email: user001@test.com to user050@test.com
Password: User@123456
```

## Video Distribution Example

| User | Videos | Titles |
|------|--------|--------|
| user001 | 2 | "Introduction to JavaScript ES6", "3D Printing Basics" |
| user002 | 2 | "React Hooks Tutorial", "Best 3D Printer Under $500" |
| user003 | 2 | "Travel Vlog: Tokyo 2024", "Stock Market for Beginners" |
| ... | ... | ... |
| user050 | 2 | "Street Food Tour Mexico City", "Japanese Ramen Making" |

## Video Categories Covered
- 🖥️ Technology & Programming
- 🎮 Gaming & Entertainment
- 🍳 Cooking & Food
- 💪 Fitness & Wellness
- 🎨 Art & Design
- 📚 Education & Science
- 🌍 Travel & Lifestyle
- 🎵 Music & Performance
- 🏠 DIY & Home Improvement
- 💼 Business & Finance

## Running the Seeders

### Prerequisites
```bash
# 1. Download 100 sample videos
cd backend/src/database/seeders
node download-pixabay-videos.js

# 2. Start services
cd ../../../../
docker compose up -d postgres minio

# 3. Run migrations
cd backend
npm run migrate
```

### Execute Seeding
```bash
# From backend directory
npm run seed

# Or manually from seeders directory
cd src/database/seeders
node index.js
```

### Execution Time
- **001-004**: ~10-20 seconds (database inserts)
- **005**: ~2-3 seconds (bucket creation)
- **006**: ~5-10 minutes (100 video uploads to MinIO)
- **Total**: ~10-15 minutes

## Verification

### Check Users
```sql
-- PostgreSQL
SELECT role, COUNT(*) FROM users GROUP BY role;
-- Expected: admin: 2, staff: 10, user: 50

SELECT username, email, display_name FROM users WHERE role = 'user' LIMIT 5;
```

### Check Videos
```sql
SELECT COUNT(*) FROM videos;
-- Expected: 100

SELECT u.username, COUNT(v.id) as video_count
FROM users u
LEFT JOIN videos v ON u.id = v.user_id
WHERE u.role = 'user'
GROUP BY u.username
ORDER BY u.username;
-- Expected: Each user has 2 videos
```

### Check MinIO
```bash
# Access MinIO Console
# URL: http://localhost:9001
# Username: minioadmin
# Password: minioadmin

# Check buckets and uploaded files
# videos bucket should have 100 .mp4 files
```

## Database Schema Reference

### users table
- `id` (UUID, PK)
- `username` (unique)
- `email` (unique)
- `password` (bcrypt hashed)
- `role` (admin/staff/user)
- `display_name`
- `bio`
- `banned`, `warnings`
- Timestamps

### videos table
- `id` (UUID, PK)
- `user_id` (FK → users)
- `title`, `description`
- `minio_bucket`, `minio_object_name`
- `thumbnail_path`
- `duration`, `file_size_bytes`
- `status` (published/processing/rejected)
- `views`, `reported`
- Timestamps

## Security Notes

⚠️ **WARNING**: Default passwords are for testing only!

In production:
1. Change all default passwords immediately
2. Enable email verification
3. Use strong password policies
4. Configure proper MinIO access keys
5. Enable HTTPS for MinIO (useSSL: true)

## Troubleshooting

### Error: "Sample videos directory not found"
**Solution**: Run `node download-pixabay-videos.js` first

### Error: "MinIO connection refused"
**Solution**: Start MinIO with `docker compose up -d minio`

### Error: "Relation users does not exist"
**Solution**: Run migrations first with `npm run migrate`

### Error: "User already exists"
**Solution**: This is normal (idempotent), seeder skips existing records

### Slow video upload
**Reason**: Uploading 100 videos (~2GB) takes time
**Solution**: Be patient, progress logged every 10 videos

## File Structure
```
backend/src/database/seeders/
├── 001-seed-admin-users.js       # 2 admins
├── 002-seed-system-settings.js   # 20+ settings
├── 003-seed-staff-users.js       # 10 staff
├── 004-seed-regular-users.js     # 50 users
├── 005-seed-minio-buckets.js     # 3 buckets
├── 006-seed-videos.js            # 100 videos
├── index.js                      # Seeder runner
├── download-pixabay-videos.js    # Video downloader
├── .env                          # API keys
├── README.md                     # Main documentation
└── data/
    ├── admin-users.json          # (Not used anymore)
    ├── sample-users.json         # (Not used anymore)
    ├── system-settings.json      # Settings data
    └── sample-videos/            # 100 downloaded videos
        ├── pixabay-*.mp4
        └── README.md
```

## Notes
- All seeders are **idempotent** (safe to run multiple times)
- Existing records are skipped, not duplicated
- Video metadata includes realistic titles and descriptions
- Videos distributed evenly across all 50 users
- All videos start with status "published"
- Random durations assigned (30-630 seconds)
