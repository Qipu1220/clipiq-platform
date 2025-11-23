# Database Seeders

This directory contains seed scripts for populating initial data in PostgreSQL and MinIO.

## 📁 Structure

```
seeders/
├── README.md                 # This file
├── index.js                  # Main seeder runner
├── download-pixabay-videos.js # Video downloader from Pixabay
├── .env                      # Configuration (add your API key)
├── 001-seed-admin-users.js   # Create admin accounts
├── 002-seed-system-settings.js # Initialize system settings
├── 003-seed-sample-users.js  # Create sample users (dev only)
├── 004-seed-minio-buckets.js # Upload sample videos to MinIO
└── data/                     # Static seed data
    ├── admin-users.json
    ├── sample-users.json
    ├── system-settings.json
    └── sample-videos/        # Sample video files (download here)
```

## 🚀 Quick Start

### 1. Run All Seeders
```bash
npm run seed
```

### 2. Download Sample Videos from Pixabay (Optional)

**Setup:**
```bash
# Edit .env file and add your Pixabay API key
# Get free key at: https://pixabay.com/api/docs/
nano .env  # or use any editor
```

**Download:**
```bash
# Download 100 videos (default)
node download-pixabay-videos.js

# Or download custom amount
DOWNLOAD_COUNT=20 node download-pixabay-videos.js

# Or download specific category
VIDEO_CATEGORY=nature node download-pixabay-videos.js
```

**Available options in .env:**
- `DOWNLOAD_COUNT` - Number of videos (default: 100)
- `VIDEO_TYPE` - all, film, animation (default: all)
- `VIDEO_CATEGORY` - nature, business, education, etc. (optional)

## 📋 Seeder Execution Order

1. **001-seed-admin-users.js** - Admin & staff accounts
2. **002-seed-system-settings.js** - 20+ system settings
3. **003-seed-sample-users.js** - 5 test users (dev only)
4. **004-seed-minio-buckets.js** - MinIO buckets + upload videos

## 🔑 Default Credentials

After seeding:
- Admin: `admin@clipiq.com` / `Admin@123456`
- Staff: `staff@clipiq.com` / `Staff@123456`
- User: `john@example.com` / `Test@123456`

⚠️ **Change passwords in production!**

## � Key Features

- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Transactions** - Atomic operations
- ✅ **Environment-aware** - Skips sample data in production
- ✅ **Auto-download** - Get 100 videos from Pixabay automatically
- ✅ **Progress tracking** - Detailed logs

## � Environment Variables

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=clipiq

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Pixabay (for video downloads)
PIXABAY_API_KEY=your_key_here
DOWNLOAD_COUNT=100
VIDEO_TYPE=all
VIDEO_CATEGORY=
```

## 🐛 Troubleshooting

**Database connection failed:**
```bash
docker compose up -d postgres
```

**MinIO connection failed:**
```bash
docker compose up -d minio
# Access console: http://localhost:9001
```

**Video download failed:**
```bash
# Check API key in .env file
# Get free key: https://pixabay.com/api/docs/
```

**"User already exists":**
```bash
# Not an error - seeders skip existing data
# To reset: docker compose down -v && docker compose up -d
```

## 📚 More Info

See [backend/SEEDING_GUIDE.md](../../SEEDING_GUIDE.md) for detailed documentation.
