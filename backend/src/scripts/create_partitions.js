/**
 * Auto-create Monthly Partitions
 * 
 * Creates partitions for next 3 months to ensure
 * impressions and view_history tables can accept new data.
 * 
 * Run as cron job: monthly on 1st at 1 AM
 * Schedule: 0 1 1 * *
 */

import pool from '../config/database.js';

async function createNextMonthPartitions() {
    console.log('\n[Partition] Creating partitions for next 3 months...');
    
    try {
        // Get next 3 months
        const months = [];
        for (let i = 1; i <= 3; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            
            const nextDate = new Date(date);
            nextDate.setMonth(nextDate.getMonth() + 1);
            const nextYear = nextDate.getFullYear();
            const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
            
            months.push({
                name: `${year}_${month}`,
                start: `${year}-${month}-01`,
                end: `${nextYear}-${nextMonth}-01`
            });
        }
        
        let created = 0;
        
        for (const month of months) {
            // Check if partition already exists for impressions
            const impressionsExists = await pool.query(`
                SELECT 1 FROM pg_tables 
                WHERE tablename = 'impressions_${month.name}'
            `);
            
            if (impressionsExists.rows.length === 0) {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS impressions_${month.name} 
                    PARTITION OF impressions
                    FOR VALUES FROM ('${month.start}') TO ('${month.end}')
                `);
                console.log(`[Partition] ✅ Created impressions_${month.name}`);
                created++;
            } else {
                console.log(`[Partition] ⏭️  impressions_${month.name} already exists`);
            }
            
            // Check if partition already exists for view_history
            const viewHistoryExists = await pool.query(`
                SELECT 1 FROM pg_tables 
                WHERE tablename = 'view_history_${month.name}'
            `);
            
            if (viewHistoryExists.rows.length === 0) {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS view_history_${month.name} 
                    PARTITION OF view_history
                    FOR VALUES FROM ('${month.start}') TO ('${month.end}')
                `);
                console.log(`[Partition] ✅ Created view_history_${month.name}`);
                created++;
            } else {
                console.log(`[Partition] ⏭️  view_history_${month.name} already exists`);
            }
        }
        
        console.log(`\n[Partition] Summary: ${created} new partitions created`);
        
        return { success: true, created };
    } catch (error) {
        console.error('[Partition] ❌ Error creating partitions:', error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createNextMonthPartitions()
        .then(result => {
            console.log('\n[Partition] Result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n[Partition] Failed:', error);
            process.exit(1);
        });
}

export default createNextMonthPartitions;
