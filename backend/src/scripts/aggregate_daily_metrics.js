/**
 * Aggregate Daily Metrics
 * 
 * Pre-aggregates impression and watch metrics by day
 * to speed up analytics queries and reduce storage.
 * 
 * Creates summary tables:
 * - video_metrics_daily: Per-video daily stats
 * - user_activity_daily: Per-user daily activity
 * 
 * Run as cron job: daily at 3 AM
 * Schedule: 0 3 * * *
 */

import pool from '../config/database.js';

async function aggregateDailyMetrics() {
    console.log('\n[Aggregate] Starting daily metrics aggregation...');
    
    const startTime = Date.now();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    try {
        // Create aggregated tables if not exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS video_metrics_daily (
                video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
                date DATE,
                impressions_count INTEGER DEFAULT 0,
                views_count INTEGER DEFAULT 0,
                total_watch_seconds INTEGER DEFAULT 0,
                avg_watch_seconds NUMERIC(10,2) DEFAULT 0,
                completions_count INTEGER DEFAULT 0,
                watch_10s_count INTEGER DEFAULT 0,
                PRIMARY KEY (video_id, date)
            );
            
            CREATE INDEX IF NOT EXISTS idx_video_metrics_date ON video_metrics_daily(date);
            CREATE INDEX IF NOT EXISTS idx_video_metrics_video ON video_metrics_daily(video_id);
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_activity_daily (
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                date DATE,
                impressions_count INTEGER DEFAULT 0,
                videos_watched INTEGER DEFAULT 0,
                total_watch_seconds INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, date)
            );
            
            CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity_daily(date);
            CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_daily(user_id);
        `);
        
        console.log(`[Aggregate] Aggregating metrics for date: ${dateStr}`);
        
        // Aggregate video metrics
        const videoResult = await pool.query(`
            INSERT INTO video_metrics_daily (
                video_id,
                date,
                impressions_count,
                views_count,
                total_watch_seconds,
                avg_watch_seconds,
                completions_count,
                watch_10s_count
            )
            SELECT 
                i.video_id,
                $1::date as date,
                COUNT(DISTINCT i.id) as impressions_count,
                COUNT(DISTINCT vh.id) as views_count,
                COALESCE(SUM(vh.watch_duration), 0) as total_watch_seconds,
                COALESCE(AVG(vh.watch_duration), 0) as avg_watch_seconds,
                COUNT(DISTINCT CASE WHEN vh.completed THEN vh.id END) as completions_count,
                COUNT(DISTINCT CASE WHEN vh.watch_duration >= 10 THEN vh.id END) as watch_10s_count
            FROM impressions i
            LEFT JOIN view_history vh ON i.id = vh.impression_id
            WHERE DATE(i.shown_at) = $1::date
            GROUP BY i.video_id
            ON CONFLICT (video_id, date) 
            DO UPDATE SET
                impressions_count = EXCLUDED.impressions_count,
                views_count = EXCLUDED.views_count,
                total_watch_seconds = EXCLUDED.total_watch_seconds,
                avg_watch_seconds = EXCLUDED.avg_watch_seconds,
                completions_count = EXCLUDED.completions_count,
                watch_10s_count = EXCLUDED.watch_10s_count
        `, [dateStr]);
        
        console.log(`[Aggregate] ✅ Aggregated video metrics: ${videoResult.rowCount} videos`);
        
        // Aggregate user activity
        const userResult = await pool.query(`
            INSERT INTO user_activity_daily (
                user_id,
                date,
                impressions_count,
                videos_watched,
                total_watch_seconds
            )
            SELECT 
                i.user_id,
                $1::date as date,
                COUNT(DISTINCT i.id) as impressions_count,
                COUNT(DISTINCT vh.video_id) as videos_watched,
                COALESCE(SUM(vh.watch_duration), 0) as total_watch_seconds
            FROM impressions i
            LEFT JOIN view_history vh ON i.id = vh.impression_id
            WHERE DATE(i.shown_at) = $1::date
            GROUP BY i.user_id
            ON CONFLICT (user_id, date) 
            DO UPDATE SET
                impressions_count = EXCLUDED.impressions_count,
                videos_watched = EXCLUDED.videos_watched,
                total_watch_seconds = EXCLUDED.total_watch_seconds
        `, [dateStr]);
        
        console.log(`[Aggregate] ✅ Aggregated user activity: ${userResult.rowCount} users`);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Aggregate] ✅ Aggregation completed in ${duration}s`);
        
        return {
            success: true,
            date: dateStr,
            videosAggregated: videoResult.rowCount,
            usersAggregated: userResult.rowCount,
            duration
        };
    } catch (error) {
        console.error('[Aggregate] ❌ Error during aggregation:', error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    aggregateDailyMetrics()
        .then(result => {
            console.log('\n[Aggregate] Result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n[Aggregate] Failed:', error);
            process.exit(1);
        });
}

export default aggregateDailyMetrics;
