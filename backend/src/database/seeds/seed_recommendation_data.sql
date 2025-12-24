-- Seed data for recommendation system testing
-- Run after migration 012 and video seeding
-- This file assigns tags and categories to existing videos

-- Insert sample tags
INSERT INTO tags (name, usage_count) VALUES
    ('funny', 150),
    ('viral', 200),
    ('tutorial', 80),
    ('music', 120),
    ('dance', 90),
    ('cooking', 60),
    ('gaming', 110),
    ('tech', 75),
    ('travel', 50),
    ('fitness', 65),
    ('comedy', 140),
    ('educational', 55),
    ('trending', 180),
    ('challenge', 95),
    ('reaction', 70),
    ('diy', 85),
    ('beauty', 95),
    ('art', 70),
    ('sports', 100),
    ('finance', 60)
ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- Insert categories (categories already exist from migration, just update descriptions if needed)
INSERT INTO categories (name, description) VALUES
    ('Comedy', 'Funny and entertaining content'),
    ('Music', 'Music videos and covers'),
    ('Gaming', 'Video game content and streams'),
    ('Education', 'Tutorials and learning content'),
    ('Food', 'Cooking and recipes'),
    ('Technology', 'Tech reviews and tutorials'),
    ('Travel', 'Travel vlogs and guides'),
    ('Fitness', 'Workout and health content'),
    ('DIY', 'Do it yourself projects'),
    ('Fashion', 'Style and beauty content')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Assign categories and tags to videos
DO $$
DECLARE
    comedy_id UUID;
    music_id UUID;
    gaming_id UUID;
    education_id UUID;
    food_id UUID;
    tech_id UUID;
    travel_id UUID;
    fitness_id UUID;
    diy_id UUID;
    fashion_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO comedy_id FROM categories WHERE name = 'Comedy';
    SELECT id INTO music_id FROM categories WHERE name = 'Music';
    SELECT id INTO gaming_id FROM categories WHERE name = 'Gaming';
    SELECT id INTO education_id FROM categories WHERE name = 'Education';
    SELECT id INTO food_id FROM categories WHERE name = 'Food';
    SELECT id INTO tech_id FROM categories WHERE name = 'Technology';
    SELECT id INTO travel_id FROM categories WHERE name = 'Travel';
    SELECT id INTO fitness_id FROM categories WHERE name = 'Fitness';
    SELECT id INTO diy_id FROM categories WHERE name = 'DIY';
    SELECT id INTO fashion_id FROM categories WHERE name = 'Fashion';
    
    -- Assign categories based on title keywords
    -- Tech & Programming
    UPDATE videos SET category_id = tech_id 
    WHERE (title ILIKE '%javascript%' OR title ILIKE '%react%' OR title ILIKE '%3d print%' 
           OR title ILIKE '%tech%' OR title ILIKE '%blockchain%' OR title ILIKE '%bitcoin%'
           OR description ILIKE '%programming%' OR description ILIKE '%coding%')
    AND category_id IS NULL;
    
    -- Gaming
    UPDATE videos SET category_id = gaming_id 
    WHERE (title ILIKE '%game%' OR title ILIKE '%gaming%' OR title ILIKE '%elden ring%')
    AND category_id IS NULL;
    
    -- Music
    UPDATE videos SET category_id = music_id 
    WHERE (title ILIKE '%music%' OR title ILIKE '%piano%' OR title ILIKE '%guitar%' 
           OR title ILIKE '%dj%' OR title ILIKE '%ableton%' OR title ILIKE '%song%')
    AND category_id IS NULL;
    
    -- Food & Cooking
    UPDATE videos SET category_id = food_id 
    WHERE (title ILIKE '%recipe%' OR title ILIKE '%cooking%' OR title ILIKE '%pasta%' 
           OR title ILIKE '%baking%' OR title ILIKE '%cookie%' OR title ILIKE '%food%'
           OR title ILIKE '%coffee%' OR title ILIKE '%espresso%' OR title ILIKE '%ramen%')
    AND category_id IS NULL;
    
    -- Travel
    UPDATE videos SET category_id = travel_id 
    WHERE (title ILIKE '%travel%' OR title ILIKE '%tokyo%' OR title ILIKE '%paris%'
           OR title ILIKE '%backpack%' OR title ILIKE '%street food%' OR title ILIKE '%tour%')
    AND category_id IS NULL;
    
    -- Fitness & Health
    UPDATE videos SET category_id = fitness_id 
    WHERE (title ILIKE '%workout%' OR title ILIKE '%yoga%' OR title ILIKE '%fitness%'
           OR title ILIKE '%pilates%' OR title ILIKE '%training%')
    AND category_id IS NULL;
    
    -- DIY & Crafts
    UPDATE videos SET category_id = diy_id 
    WHERE (title ILIKE '%diy%' OR title ILIKE '%woodwork%' OR title ILIKE '%build%'
           OR title ILIKE '%craft%' OR title ILIKE '%jewelry%' OR title ILIKE '%resin%')
    AND category_id IS NULL;
    
    -- Fashion & Beauty
    UPDATE videos SET category_id = fashion_id 
    WHERE (title ILIKE '%fashion%' OR title ILIKE '%makeup%' OR title ILIKE '%beauty%'
           OR title ILIKE '%haul%' OR title ILIKE '%skincare%')
    AND category_id IS NULL;
    
    -- Education
    UPDATE videos SET category_id = education_id 
    WHERE (title ILIKE '%tutorial%' OR title ILIKE '%guide%' OR title ILIKE '%learn%'
           OR title ILIKE '%how to%' OR title ILIKE '%explained%' OR title ILIKE '%basics%'
           OR title ILIKE '%science%' OR title ILIKE '%history%')
    AND category_id IS NULL;
    
    -- Comedy (last, as fallback for remaining)
    UPDATE videos SET category_id = comedy_id 
    WHERE (title ILIKE '%comedy%' OR title ILIKE '%funny%' OR title ILIKE '%magic%'
           OR title ILIKE '%stand up%' OR title ILIKE '%dance%')
    AND category_id IS NULL;
    
    -- Note: video_count is not stored in categories table
    -- It can be calculated dynamically when needed
    
    -- Now assign tags to videos based on categories and keywords
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = tech_id AND t.name IN ('tech', 'tutorial', 'educational')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = gaming_id AND t.name IN ('gaming', 'viral', 'trending')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = music_id AND t.name IN ('music', 'art', 'viral')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = food_id AND t.name IN ('cooking', 'tutorial', 'educational')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = travel_id AND t.name IN ('travel', 'viral')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = fitness_id AND t.name IN ('fitness', 'tutorial', 'educational')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = diy_id AND t.name IN ('diy', 'tutorial', 'educational')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = fashion_id AND t.name IN ('beauty', 'tutorial', 'trending')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO video_tags (video_id, tag_id)
    SELECT DISTINCT v.id, t.id
    FROM videos v, tags t
    WHERE v.category_id = comedy_id AND t.name IN ('funny', 'comedy', 'viral')
    ON CONFLICT DO NOTHING;
    
    -- Add 'trending' tag to top viewed videos
    INSERT INTO video_tags (video_id, tag_id)
    SELECT v.id, t.id
    FROM videos v, tags t
    WHERE t.name = 'trending' AND v.views > 1000
    ON CONFLICT DO NOTHING;
    
    -- Add 'viral' tag to highly engaged videos
    INSERT INTO video_tags (video_id, tag_id)
    SELECT v.id, t.id
    FROM videos v, tags t
    WHERE t.name = 'viral' AND (v.likes_count > 10 OR v.views > 500)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Categories and tags assigned successfully!';
END $$;

-- Note: User interactions are now handled by the JavaScript seeder
-- Run: node backend/src/database/seeders/007-seed-interactions.js
-- This provides more detailed and realistic interaction data for recommendation testing

-- Verify data
SELECT 
    'Categories' as table_name,
    COUNT(*) as count
FROM categories
UNION ALL
SELECT 
    'Tags',
    COUNT(*)
FROM tags
UNION ALL
SELECT 
    'Videos with categories',
    COUNT(*)
FROM videos
WHERE category_id IS NOT NULL
UNION ALL
SELECT 
    'Video-Tag associations',
    COUNT(*)
FROM video_tags;
