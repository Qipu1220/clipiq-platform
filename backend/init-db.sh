#!/bin/sh
#
# Database Initialization Script for ClipIQ Platform
# This script runs migrations and seeding on first container startup
#

set -e

echo "🚀 Starting ClipIQ Database Initialization..."

# Install required tools (Alpine Linux)
if ! command -v curl > /dev/null 2>&1; then
  echo "📦 Installing curl..."
  apk add --no-cache curl postgresql-client
fi

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
until PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  counter=$((counter + 1))
  if [ $counter -gt $timeout ]; then
    echo "❌ PostgreSQL timeout after ${timeout} seconds"
    exit 1
  fi
  echo "   PostgreSQL is unavailable - sleeping (${counter}/${timeout})"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait for MinIO to be ready
echo "⏳ Waiting for MinIO to be ready..."
timeout=60
counter=0
until curl -sf "http://${MINIO_ENDPOINT}:${MINIO_PORT}/minio/health/live" > /dev/null 2>&1; do
  counter=$((counter + 1))
  if [ $counter -gt $timeout ]; then
    echo "❌ MinIO timeout after ${timeout} seconds"
    exit 1
  fi
  echo "   MinIO is unavailable - sleeping (${counter}/${timeout})"
  sleep 2
done
echo "✅ MinIO is ready!"

echo ""
echo "🔧 Running database migrations..."
npm run migrate

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migrations failed!"
  exit 1
fi

echo ""
echo "🌱 Running database seeders..."
echo "   This will create 62 accounts and upload 100 videos (~5-10 minutes)"
npm run seed

if [ $? -eq 0 ]; then
  echo "✅ Seeding completed successfully"
else
  echo "❌ Seeding failed!"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Database initialization complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Created:"
echo "   - 2 Admin accounts"
echo "   - 10 Staff accounts"
echo "   - 50 Regular user accounts"
echo "   - 100 Videos (2 per user)"
echo "   - 20+ System settings"
echo "   - 3 MinIO buckets"
echo ""
echo "🔐 Default Credentials:"
echo "   Admin:  admin@clipiq.com / Admin@123456"
echo "   Staff:  mod1@clipiq.com / Staff@123456"
echo "   User:   user001@test.com / User@123456"
echo ""
echo "⚠️  WARNING: Change default passwords in production!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
