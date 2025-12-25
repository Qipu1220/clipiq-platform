/**
 * Cleanup Old Impressions
 * 
 * Deletes impressions and view_history older than 90 days
 * to prevent database bloat.
 * 
 * Run as cron job: daily at 2 AM
 * Schedule: 0 2 * * *
 */

import pool from '../config/database.js';

const RETENTION_DAYS = 90;

async function cleanupOldImpressions() {
    console.log(`\n[Cleanup] Starting cleanup of impressions older than ${RETENTION_DAYS} days...`);
    
    const startTime = Date.now();
    
    try {
        // Delete old impressions
        const impressionsResult = await pool.query(`
            DELETE FROM impressions 
            WHERE shown_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
        `);
        
        console.log(`[Cleanup] Deleted ${impressionsResult.rowCount} old impressions`);
        
        // Delete old view_history (orphaned records without impressions)
        const viewHistoryResult = await pool.query(`
            DELETE FROM view_history 
            WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
        `);
        
        console.log(`[Cleanup] Deleted ${viewHistoryResult.rowCount} old view history records`);
        
        // VACUUM to reclaim space
        console.log('[Cleanup] Running VACUUM to reclaim disk space...');
        await pool.query('VACUUM ANALYZE impressions');
        await pool.query('VACUUM ANALYZE view_history');
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Cleanup] ✅ Cleanup completed in ${duration}s`);
        
        return {
            success: true,
            impressionsDeleted: impressionsResult.rowCount,
            viewHistoryDeleted: viewHistoryResult.rowCount,
            duration
        };
    } catch (error) {
        console.error('[Cleanup] ❌ Error during cleanup:', error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanupOldImpressions()
        .then(result => {
            console.log('\n[Cleanup] Result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n[Cleanup] Failed:', error);
            process.exit(1);
        });
}

export default cleanupOldImpressions;
