@echo off
REM Full Database Seeding Script for Windows
REM Runs all seeders and SQL seeds in correct order

echo.
echo 🌱 Starting full database seeding process...
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the backend directory
    exit /b 1
)

REM Step 1: Run JavaScript seeders
echo 📦 Step 1: Running JavaScript seeders...
call npm run db:seed

if errorlevel 1 (
    echo ❌ JavaScript seeders failed
    exit /b 1
)

echo.
echo ✅ JavaScript seeders completed
echo.

REM Step 2: Run SQL seed for categories and tags
echo 📦 Step 2: Running SQL seed for categories and tags...

REM Run SQL seed using docker exec (no password needed)
docker exec -i clipiq_postgres psql -U clipiq_user -d clipiq_db < src/database/seeds/seed_recommendation_data.sql

if errorlevel 1 (
    echo ❌ SQL seed failed
    echo     Make sure docker-compose is running: docker-compose up -d
    exit /b 1
)

echo.
echo ✅ SQL seed completed
echo.

REM Step 3: Verify data
echo 📊 Step 3: Verifying seeded data...
echo.

docker exec clipiq_postgres psql -U clipiq_user -d clipiq_db -c "SELECT 'Users' as table_name, COUNT(*) as count FROM users UNION ALL SELECT 'Videos', COUNT(*) FROM videos UNION ALL SELECT 'Categories', COUNT(*) FROM categories UNION ALL SELECT 'Tags', COUNT(*) FROM tags UNION ALL SELECT 'Likes', COUNT(*) FROM likes UNION ALL SELECT 'Comments', COUNT(*) FROM comments UNION ALL SELECT 'View History', COUNT(*) FROM view_history UNION ALL SELECT 'Video Tags', COUNT(*) FROM video_tags ORDER BY table_name;"

echo.
echo 🎉 Full database seeding completed successfully!
echo.
echo 📝 Quick stats for user001:

docker exec clipiq_postgres psql -U clipiq_user -d clipiq_db -c "SELECT (SELECT COUNT(*) FROM likes WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as likes, (SELECT COUNT(*) FROM view_history WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as views, (SELECT COUNT(*) FROM comments WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as comments, (SELECT COUNT(*) FROM subscriptions WHERE follower_id = (SELECT id FROM users WHERE username = 'user001')) as following;"

echo.
echo ✅ Ready to test recommendations!
echo.
echo Login credentials:
echo   Username: user001
echo   Password: User@123456
echo.

pause

