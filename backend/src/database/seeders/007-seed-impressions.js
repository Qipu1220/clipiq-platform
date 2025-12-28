/**
 * Seeder: Impressions and Watch History
 * 
 * Creates realistic impression and watch history data for testing:
 * - Generates impressions for users viewing videos
 * - Creates corresponding watch events with varying durations
 * - Simulates different engagement patterns (skip, partial watch, full watch)
 */

import crypto from 'node:crypto';

/**
 * Generate random watch duration based on video duration
 * Simulates realistic user behavior:
 * - 40% skip (< 3 seconds)
 * - 30% partial watch (3-30 seconds)
 * - 20% medium watch (30s - 60s)
 * - 10% long watch (> 60s or completed)
 */
function generateWatchDuration(videoDuration) {
    const rand = Math.random();

    if (rand < 0.4) {
        // Skip: 0-3 seconds
        return Math.floor(Math.random() * 3);
    } else if (rand < 0.7) {
        // Partial watch: 3-30 seconds
        return 3 + Math.floor(Math.random() * 27);
    } else if (rand < 0.9) {
        // Medium watch: 30-60 seconds
        const maxWatch = Math.min(60, videoDuration);
        return 30 + Math.floor(Math.random() * (maxWatch - 30));
    } else {
        // Long watch or completed
        const watchTime = Math.min(videoDuration, 60 + Math.floor(Math.random() * 120));
        return watchTime;
    }
}

/**
 * Generate random source for impression
 */
function generateSource() {
    const sources = ['personal', 'trending', 'random'];
    const weights = [0.6, 0.3, 0.1]; // 60% personal, 30% trending, 10% random

    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < sources.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
            return sources[i];
        }
    }

    return 'personal';
}

/**
 * Seed impressions and watch history
 */
export async function seed(client) {
    console.log('   Seeding impressions and watch history...');

    // Get all active videos
    const videosResult = await client.query(`
    SELECT id, duration, uploader_id 
    FROM videos 
    WHERE status = 'active' 
    ORDER BY upload_date DESC
  `);

    const videos = videosResult.rows;

    if (videos.length === 0) {
        console.log('   ⚠️  No videos found, skipping impression seeding');
        return;
    }

    // Get all regular users
    const usersResult = await client.query(`
    SELECT id 
    FROM users 
    WHERE role = 'user' 
    ORDER BY created_at ASC
  `);

    const users = usersResult.rows;

    if (users.length === 0) {
        console.log('   ⚠️  No users found, skipping impression seeding');
        return;
    }

    console.log(`   Found ${videos.length} videos and ${users.length} users`);

    let impressionCount = 0;
    let watchEventCount = 0;

    // Generate impressions for the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Each user will have 20-50 impressions over the last 30 days
    for (const user of users) {
        const numImpressions = 20 + Math.floor(Math.random() * 31); // 20-50
        const sessionIds = []; // Track sessions for this user

        // Generate 3-5 sessions per user
        const numSessions = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numSessions; i++) {
            sessionIds.push(crypto.randomUUID());
        }

        // Track seen videos to avoid duplicates within same session
        const seenVideosPerSession = new Map();
        sessionIds.forEach(sid => seenVideosPerSession.set(sid, new Set()));

        for (let i = 0; i < numImpressions; i++) {
            // Random timestamp within last 30 days
            const randomTime = new Date(
                thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
            );

            // Pick a random session
            const sessionId = sessionIds[Math.floor(Math.random() * sessionIds.length)];
            const seenInSession = seenVideosPerSession.get(sessionId);

            // Pick a random video (avoid duplicates in same session)
            let video;
            let attempts = 0;
            do {
                video = videos[Math.floor(Math.random() * videos.length)];
                attempts++;
            } while (seenInSession.has(video.id) && attempts < 10);

            if (attempts >= 10) continue; // Skip if can't find unseen video

            seenInSession.add(video.id);

            const source = generateSource();
            const position = i % 20; // Position in feed (0-19)

            // Insert impression
            const impressionResult = await client.query(`
        INSERT INTO impressions (
          id,
          user_id,
          video_id,
          session_id,
          position,
          source,
          model_version,
          shown_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
                crypto.randomUUID(),
                user.id,
                video.id,
                sessionId,
                position,
                source,
                'v0',
                randomTime
            ]);

            const impressionId = impressionResult.rows[0].id;
            impressionCount++;

            // 85% of impressions result in a watch event
            if (Math.random() < 0.85) {
                const watchDuration = generateWatchDuration(video.duration || 60);
                const completed = watchDuration >= (video.duration || 60) * 0.95;

                // Watch event happens a few seconds after impression
                const watchTime = new Date(randomTime.getTime() + (watchDuration + 1) * 1000);

                // Insert watch event
                await client.query(`
          INSERT INTO view_history (
            id,
            user_id,
            video_id,
            watch_duration,
            completed,
            impression_id,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
                    crypto.randomUUID(),
                    user.id,
                    video.id,
                    watchDuration,
                    completed,
                    impressionId,
                    watchTime
                ]);

                watchEventCount++;
            }

            // Log progress every 100 impressions
            if (impressionCount % 100 === 0) {
                console.log(`   ✅ Created ${impressionCount} impressions...`);
            }
        }
    }

    // Update video view counts based on watch history
    console.log('   Updating video view counts...');
    await client.query(`
    UPDATE videos v
    SET views = (
      SELECT COUNT(*)
      FROM view_history vh
      WHERE vh.video_id = v.id
    )
    WHERE status = 'active'
  `);

    console.log(`   📊 Summary:`);
    console.log(`      - ${impressionCount} impressions created`);
    console.log(`      - ${watchEventCount} watch events created`);
    console.log(`      - ${impressionCount - watchEventCount} impressions without watch (skipped before 600ms)`);

    // Calculate and display some metrics
    const metricsResult = await client.query(`
    SELECT 
      COUNT(DISTINCT i.id) as total_impressions,
      COUNT(DISTINCT vh.id) as total_watches,
      COUNT(DISTINCT CASE WHEN vh.watch_duration >= 10 THEN vh.id END) as watch_10s_count,
      ROUND(AVG(vh.watch_duration), 2) as avg_watch_duration
    FROM impressions i
    LEFT JOIN view_history vh ON vh.impression_id = i.id
  `);

    const metrics = metricsResult.rows[0];
    const watch10sRate = ((metrics.watch_10s_count / metrics.total_impressions) * 100).toFixed(2);

    console.log(`   📈 Metrics:`);
    console.log(`      - Watch rate: ${((metrics.total_watches / metrics.total_impressions) * 100).toFixed(2)}%`);
    console.log(`      - WATCH_10S rate: ${watch10sRate}%`);
    console.log(`      - Avg watch duration: ${metrics.avg_watch_duration}s`);
}

export default seed;
