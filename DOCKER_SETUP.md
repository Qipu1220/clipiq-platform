# Docker Auto-Initialization Setup

## Overview

ClipIQ Platform now includes **automatic database initialization** when running with Docker for the first time. No manual seeding required!

## What Gets Auto-Initialized?

On first startup, the backend container will automatically:

1. ✅ **Run database migrations** - Create all tables with UUID primary keys
2. ✅ **Seed admin accounts** - 2 administrator accounts
3. ✅ **Seed staff accounts** - 10 content moderators
4. ✅ **Seed regular users** - 50 test users
5. ✅ **Create MinIO buckets** - 3 storage buckets (videos, thumbnails, avatars)
6. ✅ **Upload sample videos** - 100 videos distributed across users

**Total Time**: ~5-10 minutes (depending on video upload speed)

## How It Works

### Initialization Flow

```
docker-compose up -d
       ↓
Check /app/.init/.db-initialized flag
       ↓
   Not found?
       ↓
Run init-db.sh script
       ↓
1. Wait for PostgreSQL ready
2. Wait for MinIO ready
3. Run migrations (npm run migrate)
4. Run seeders (npm run seed)
5. Create flag file
       ↓
Start npm run dev
```

### Files Involved

1. **`docker-compose.yml`**
   - Adds `backend_init` volume to persist initialization flag
   - Modified backend command to check flag and run `init-db.sh`
   - Backend depends on `minio-setup` service completion

2. **`backend/init-db.sh`**
   - Waits for PostgreSQL and MinIO to be ready
   - Runs migrations and seeders
   - Displays summary of created data
   - Shows default credentials

3. **`backend_init` volume**
   - Persists `.db-initialized` flag
   - Prevents re-running seeding on container restart

## Quick Start

### Option 1: Using Makefile (Recommended)

```bash
# First time installation (downloads videos + starts services)
make install

# Or start without downloading videos first
make up

# Check logs to see seeding progress
make logs-backend
```

### Option 2: Manual Commands

```bash
# 1. Download sample videos (one time only)
cd backend/src/database/seeders
node download-pixabay-videos.js
cd ../../../..

# 2. Start all services (auto-seeds on first run)
docker-compose up -d

# 3. Watch initialization progress
docker-compose logs -f backend
```

## Access Information

Once initialization completes:

### Frontend
- URL: http://localhost:5173
- Auto-connects to backend API

### Backend API
- URL: http://localhost:5000
- Health check: http://localhost:5000/health

### MinIO Console
- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`
- Buckets: `clipiq-videos`, `clipiq-thumbnails`, `clipiq-avatars`

### Database (PostgreSQL)
- Host: localhost
- Port: 5432
- Database: `clipiq_db`
- Username: `clipiq_user`
- Password: `clipiq_password`

## Default User Credentials

### Administrators (2 accounts)
```
Email: admin@clipiq.com
Password: Admin@123456

Email: admin2@clipiq.com
Password: Admin@123456
```

### Staff (10 accounts)
```
Email: mod1@clipiq.com to mod10@clipiq.com
Password: Staff@123456
```

### Regular Users (50 accounts)
```
Email: user001@test.com to user050@test.com
Password: User@123456
```

## Makefile Commands

### Installation
```bash
make install          # First time setup with video download
make download-videos  # Download videos only
```

### Service Management
```bash
make up              # Start all services
make down            # Stop all services
make restart         # Restart all services
make status          # Show service status
```

### Logs
```bash
make logs            # All logs
make logs-backend    # Backend only
make logs-db         # Database only
```

### Database
```bash
make migrate         # Run migrations manually
make seed            # Run seeders manually
make reset-db        # Delete all data and re-seed (⚠️ WARNING)
make shell-db        # Open PostgreSQL shell
```

### Cleanup
```bash
make clean           # Remove containers (keep data)
make rebuild         # Rebuild images
```

## Initialization Logs

Successful initialization will show:

```
🚀 Starting ClipIQ Database Initialization...

⏳ Waiting for PostgreSQL to be ready...
✅ PostgreSQL is ready!

⏳ Waiting for MinIO to be ready...
✅ MinIO is ready!

🔧 Running database migrations...
   Creating table: users
   Creating table: videos
   [... more tables ...]
✅ Migrations completed successfully

🌱 Running database seeders...
   This will create 62 accounts and upload 100 videos (~5-10 minutes)
   
   Seeding admin users...
   ✅ Created admin: admin (admin@clipiq.com)
   ✅ Created admin: admin2 (admin2@clipiq.com)
   
   Seeding staff users...
   ✅ Created 10 staff accounts
   
   Seeding 50 regular users...
   ✅ Created 10 users...
   ✅ Created 20 users...
   [...]
   ✅ Created 50 users...
   
   Seeding 100 videos (2 per user)...
   ✅ Uploaded 10 videos...
   ✅ Uploaded 20 videos...
   [...]
   ✅ Uploaded 100 videos...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Database initialization complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Created:
   - 2 Admin accounts
   - 10 Staff accounts
   - 50 Regular user accounts
   - 100 Videos (2 per user)
   - 20+ System settings
   - 3 MinIO buckets

🔐 Default Credentials:
   Admin:  admin@clipiq.com / Admin@123456
   Staff:  mod1@clipiq.com / Staff@123456
   User:   user001@test.com / User@123456

⚠️  WARNING: Change default passwords in production!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Skipping Re-initialization

After the first successful run, the backend will show:

```
📋 Database already initialized, skipping seeding
```

This is controlled by the persistent flag file in the `backend_init` volume.

## Force Re-initialization

To delete all data and start fresh:

### Using Makefile
```bash
make reset-db
```

### Manual Steps
```bash
# Stop services
docker-compose down

# Remove volumes
docker volume rm clipiq-platform_postgres_data
docker volume rm clipiq-platform_backend_init
docker volume rm clipiq-platform_minio_data

# Start fresh
docker-compose up -d
```

## Troubleshooting

### Issue: "Sample videos directory not found"

**Cause**: Videos not downloaded before seeding

**Solution**: 
```bash
cd backend/src/database/seeders
node download-pixabay-videos.js
```

### Issue: "PostgreSQL connection refused"

**Cause**: Database not ready yet

**Solution**: Wait a few seconds, the script has built-in retry logic with timeout

### Issue: "MinIO connection refused"

**Cause**: MinIO not ready yet

**Solution**: Check MinIO container status with `docker-compose ps`

### Issue: Seeding takes too long

**Cause**: Uploading 100 videos (~2GB) to MinIO

**Solution**: This is normal. Check progress with `make logs-backend`

### Issue: "Already initialized" but want to re-seed

**Cause**: Init flag exists

**Solution**: Use `make reset-db` to delete flag and data

### Issue: Permissions error on init-db.sh (Linux/Mac)

**Cause**: Script not executable

**Solution**:
```bash
chmod +x backend/init-db.sh
```

## File Structure

```
clipiq-platform/
├── docker-compose.yml           # Modified with auto-init logic
├── Makefile                     # Enhanced with new commands
└── backend/
    ├── init-db.sh              # Initialization script (NEW)
    └── src/
        └── database/
            ├── migrate.js       # Migration runner
            └── seeders/
                ├── index.js                  # Seeder runner
                ├── 001-seed-admin-users.js   # 2 admins
                ├── 002-seed-system-settings.js
                ├── 003-seed-staff-users.js   # 10 staff
                ├── 004-seed-regular-users.js # 50 users
                ├── 005-seed-minio-buckets.js # 3 buckets
                ├── 006-seed-videos.js        # 100 videos
                └── data/
                    └── sample-videos/        # 100 downloaded videos
```

## Environment Variables

All configured in `docker-compose.yml`:

```yaml
# Database
DATABASE_URL=postgresql://clipiq_user:clipiq_password@postgres:5432/clipiq_db
DB_HOST=postgres
DB_PORT=5432
DB_USER=clipiq_user
DB_PASSWORD=clipiq_password
DB_NAME=clipiq_db

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_VIDEOS=clipiq-videos
MINIO_BUCKET_THUMBNAILS=clipiq-thumbnails
MINIO_BUCKET_AVATARS=clipiq-avatars
```

## Production Considerations

⚠️ **For production deployment:**

1. **Change all default passwords** immediately after first run
2. **Disable auto-seeding** by commenting out the init logic in docker-compose.yml
3. **Use strong secrets** for JWT, database, and MinIO
4. **Enable SSL** for MinIO (MINIO_USE_SSL=true)
5. **Remove test users** or change their passwords
6. **Backup volumes** before running `make reset-db`

## Benefits

✅ **Zero manual steps** - Just run `make install` or `docker-compose up -d`
✅ **Idempotent** - Safe to restart containers, won't duplicate data
✅ **Self-documenting** - Clear logs show what's being created
✅ **Fast development** - New developers can start in minutes
✅ **Consistent state** - Everyone gets the same initial data
✅ **Easy reset** - One command to start fresh

## Related Documentation

- [`backend/src/database/seeders/SEEDING_SUMMARY.md`](../backend/src/database/seeders/SEEDING_SUMMARY.md) - Complete seeding details
- [`backend/src/database/seeders/README.md`](../backend/src/database/seeders/README.md) - Seeder documentation
- [`SEEDING_GUIDE.md`](../backend/SEEDING_GUIDE.md) - Comprehensive seeding guide
