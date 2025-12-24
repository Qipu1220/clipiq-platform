# Full Database Seeding Script for PowerShell
# Runs all seeders and SQL seeds in correct order

Write-Host ""
Write-Host "🌱 Starting full database seeding process..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

# Step 1: Run JavaScript seeders
Write-Host "📦 Step 1: Running JavaScript seeders..." -ForegroundColor Yellow
npm run db:seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ JavaScript seeders failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ JavaScript seeders completed" -ForegroundColor Green
Write-Host ""

# Step 2: Run SQL seed for categories and tags
Write-Host "📦 Step 2: Running SQL seed for categories and tags..." -ForegroundColor Yellow

# Use Get-Content to pipe SQL file into docker exec
Get-Content "src\database\seeds\seed_recommendation_data.sql" | docker exec -i clipiq_postgres psql -U clipiq_user -d clipiq_db

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SQL seed failed" -ForegroundColor Red
    Write-Host "    Make sure docker-compose is running: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ SQL seed completed" -ForegroundColor Green
Write-Host ""

# Step 3: Verify data
Write-Host "📊 Step 3: Verifying seeded data..." -ForegroundColor Yellow
Write-Host ""

# Create temporary SQL file
$verifyQuery = @"
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Videos', COUNT(*) FROM videos
UNION ALL SELECT 'Categories', COUNT(*) FROM categories
UNION ALL SELECT 'Tags', COUNT(*) FROM tags
UNION ALL SELECT 'Likes', COUNT(*) FROM likes
UNION ALL SELECT 'Comments', COUNT(*) FROM comments
UNION ALL SELECT 'View History', COUNT(*) FROM view_history
UNION ALL SELECT 'Video Tags', COUNT(*) FROM video_tags
ORDER BY table_name;
"@

$verifyQuery | docker exec -i clipiq_postgres psql -U clipiq_user -d clipiq_db

Write-Host ""
Write-Host "🎉 Full database seeding completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Quick stats for user001:" -ForegroundColor Cyan

$statsQuery = @"
SELECT 
    (SELECT COUNT(*) FROM likes WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as likes,
    (SELECT COUNT(*) FROM view_history WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as views,
    (SELECT COUNT(*) FROM comments WHERE user_id = (SELECT id FROM users WHERE username = 'user001')) as comments,
    (SELECT COUNT(*) FROM subscriptions WHERE follower_id = (SELECT id FROM users WHERE username = 'user001')) as following;
"@

$statsQuery | docker exec -i clipiq_postgres psql -U clipiq_user -d clipiq_db

Write-Host ""
Write-Host "✅ Ready to test recommendations!" -ForegroundColor Green
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Username: user001" -ForegroundColor White
Write-Host "  Password: User@123456" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"

