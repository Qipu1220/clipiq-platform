/**
 * Scheduled Maintenance Tasks
 * 
 * Runs database maintenance tasks on schedule:
 * - Daily cleanup of old impressions (90 days retention)
 * - Daily metrics aggregation
 * - Monthly partition creation
 */

import cron from 'node-cron';
import cleanupOldImpressions from './cleanup_old_impressions.js';
import aggregateDailyMetrics from './aggregate_daily_metrics.js';
import createNextMonthPartitions from './create_partitions.js';

/**
 * Schedule maintenance tasks
 */
export function setupMaintenanceJobs() {
    console.log('[Maintenance] Setting up scheduled tasks...');
    
    // Daily at 2 AM: Cleanup old impressions (90 days retention)
    cron.schedule('0 2 * * *', async () => {
        console.log('\n[Maintenance] Running daily cleanup...');
        try {
            await cleanupOldImpressions();
        } catch (error) {
            console.error('[Maintenance] Cleanup failed:', error);
        }
    }, {
        timezone: 'Asia/Ho_Chi_Minh'
    });
    console.log('[Maintenance] ✅ Daily cleanup scheduled (2 AM)');
    
    // Daily at 3 AM: Aggregate metrics
    cron.schedule('0 3 * * *', async () => {
        console.log('\n[Maintenance] Running daily aggregation...');
        try {
            await aggregateDailyMetrics();
        } catch (error) {
            console.error('[Maintenance] Aggregation failed:', error);
        }
    }, {
        timezone: 'Asia/Ho_Chi_Minh'
    });
    console.log('[Maintenance] ✅ Daily aggregation scheduled (3 AM)');
    
    // Monthly on 1st at 1 AM: Create next month partitions
    cron.schedule('0 1 1 * *', async () => {
        console.log('\n[Maintenance] Creating monthly partitions...');
        try {
            await createNextMonthPartitions();
        } catch (error) {
            console.error('[Maintenance] Partition creation failed:', error);
        }
    }, {
        timezone: 'Asia/Ho_Chi_Minh'
    });
    console.log('[Maintenance] ✅ Monthly partition creation scheduled (1st at 1 AM)');
    
    console.log('[Maintenance] All maintenance tasks scheduled successfully\n');
}

export default setupMaintenanceJobs;
