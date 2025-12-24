-- Verification queries for seeded recommendation data
-- Run with: psql -U postgres -d clipiq -f verify_seed_data.sql

\echo '================================================'
\echo '📊 SEED DATA VERIFICATION'
\echo '================================================'
\echo ''

\echo '1️⃣ Overall Database Stats:'
\echo '----------------------------------------'
SELECT 
    'Users' as entity,
    COUNT(*) as count
FROM users
UNION ALL
SELECT 
    'Videos',
    COUNT(*)
FROM videos
UNION ALL
SELECT 
    'Categories',
    COUNT(*)
FROM categories
UNION ALL
SELECT 
    'Tags',
    COUNT(*)
FROM tags
UNION ALL
SELECT 
    'Likes',
    COUNT(*)
FROM likes
UNION ALL
SELECT 
    'Comments',
    COUNT(*)
FROM comments
UNION ALL
SELECT 
    'View History',
    COUNT(*)
FROM view_history
UNION ALL
SELECT 
    'Saved Videos',
    COUNT(*)
FROM playlist_videos
ORDER BY entity;

\echo ''
\echo '2️⃣ user001 Interaction Stats:'
\echo '----------------------------------------'
SELECT 
    'Likes' as interaction_type,
    COUNT(*) as count
FROM likes 
WHERE user_id = (SELECT id FROM users WHERE username = 'user001')
UNION ALL
SELECT 
    'Views',
    COUNT(*)
FROM view_history 
WHERE user_id = (SELECT id FROM users WHERE username = 'user001')
UNION ALL
SELECT 
    'Comments',
    COUNT(*)
FROM comments 
WHERE user_id = (SELECT id FROM users WHERE username = 'user001')
UNION ALL
SELECT 
    'Saved Videos',
    COUNT(*)
FROM playlist_videos pv
JOIN playlists p ON pv.playlist_id = p.id
WHERE p.user_id = (SELECT id FROM users WHERE username = 'user001')
UNION ALL
SELECT 
    'Following',
    COUNT(*)
FROM subscriptions 
WHERE follower_id = (SELECT id FROM users WHERE username = 'user001')
ORDER BY interaction_type;

\echo ''
\echo '3️⃣ Top 10 Trending Videos:'
\echo '----------------------------------------'
SELECT 
    title,
    views,
    likes_count as likes,
    comments_count as comments,
    c.name as category
FROM videos v
LEFT JOIN categories c ON v.category_id = c.id
ORDER BY views DESC
LIMIT 10;

\echo ''
\echo '4️⃣ Category Distribution:'
\echo '----------------------------------------'
SELECT 
    c.name as category,
    COUNT(v.id) as video_count,
    SUM(v.views) as total_views,
    SUM(v.likes_count) as total_likes
FROM categories c
LEFT JOIN videos v ON v.category_id = c.id
GROUP BY c.id, c.name
ORDER BY video_count DESC;

\echo ''
\echo '5️⃣ user001 Category Preferences (by likes):'
\echo '----------------------------------------'
SELECT 
    c.name as category,
    COUNT(*) as likes_count,
    ROUND(COUNT(*) * 100.0 / (
        SELECT COUNT(*) 
        FROM likes 
        WHERE user_id = (SELECT id FROM users WHERE username = 'user001')
    ), 1) as percentage
FROM likes l
JOIN videos v ON l.video_id = v.id
JOIN categories c ON v.category_id = c.id
WHERE l.user_id = (SELECT id FROM users WHERE username = 'user001')
GROUP BY c.id, c.name
ORDER BY likes_count DESC;

\echo ''
\echo '6️⃣ Top 10 Most Used Tags:'
\echo '----------------------------------------'
SELECT 
    t.name,
    COUNT(vt.video_id) as video_count
FROM tags t
LEFT JOIN video_tags vt ON vt.tag_id = t.id
GROUP BY t.id, t.name
ORDER BY video_count DESC
LIMIT 10;

\echo ''
\echo '7️⃣ user001 Watch History Summary:'
\echo '----------------------------------------'
SELECT 
    COUNT(*) as total_watched,
    COUNT(*) FILTER (WHERE completed = true) as completed,
    COUNT(*) FILTER (WHERE completed = false) as incomplete,
    ROUND(AVG(watch_duration), 2) as avg_watch_duration_sec,
    ROUND(COUNT(*) FILTER (WHERE completed = true) * 100.0 / COUNT(*), 1) as completion_rate_pct
FROM view_history
WHERE user_id = (SELECT id FROM users WHERE username = 'user001');

\echo ''
\echo '8️⃣ user001 Following (Users & Their Videos):'
\echo '----------------------------------------'
SELECT 
    u.username,
    u.display_name,
    COUNT(v.id) as video_count
FROM subscriptions s
JOIN users u ON s.following_id = u.id
LEFT JOIN videos v ON v.uploader_id = u.id
WHERE s.follower_id = (SELECT id FROM users WHERE username = 'user001')
GROUP BY u.id, u.username, u.display_name
ORDER BY username;

\echo ''
\echo '9️⃣ Most Engaging Videos (Top 10 by engagement):'
\echo '----------------------------------------'
SELECT 
    v.title,
    v.views,
    v.likes_count,
    v.comments_count,
    (v.likes_count + v.comments_count * 2 + v.views / 10) as engagement_score
FROM videos v
ORDER BY engagement_score DESC
LIMIT 10;

\echo ''
\echo '🔟 Recent Activity Timeline (Last 20 actions):'
\echo '----------------------------------------'
SELECT 
    'LIKE' as action_type,
    u.username,
    v.title as video_title,
    l.created_at as timestamp
FROM likes l
JOIN users u ON l.user_id = u.id
JOIN videos v ON l.video_id = v.id
WHERE u.username = 'user001'
UNION ALL
SELECT 
    'COMMENT',
    u.username,
    v.title,
    c.created_at
FROM comments c
JOIN users u ON c.user_id = u.id
JOIN videos v ON c.video_id = v.id
WHERE u.username = 'user001'
UNION ALL
SELECT 
    'VIEW',
    u.username,
    v.title,
    vh.viewed_at
FROM view_history vh
JOIN users u ON vh.user_id = u.id
JOIN videos v ON vh.video_id = v.id
WHERE u.username = 'user001'
ORDER BY timestamp DESC
LIMIT 20;

\echo ''
\echo '================================================'
\echo '✅ Verification Complete!'
\echo '================================================'
\echo ''
\echo 'Next steps:'
\echo '1. Login as user001 with password: User@123456'
\echo '2. Test recommendation API endpoints'
\echo '3. Check Explorer tab for similar videos'
\echo ''

