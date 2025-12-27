
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'clipiq_user',
    host: 'localhost',
    database: 'clipiq_db',
    password: 'clipiq_password',
    port: 5432,
});

async function checkReports() {
    try {
        const res = await pool.query(`
      SELECT vr.id, vr.video_id, vr.status, v.id as video_exists, v.status as video_status
      FROM video_reports vr
      LEFT JOIN videos v ON vr.video_id = v.id
      WHERE vr.status = 'pending'
    `);

        console.log("Pending Reports:", res.rows);

        if (res.rows.length === 0) {
            console.log("No pending reports found.");
        }

        for (const row of res.rows) {
            if (!row.video_exists) {
                console.error(`Report ${row.id} points to missing video ${row.video_id}`);
            } else {
                console.log(`Report ${row.id} points to video ${row.video_id} (Status: ${row.video_status})`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkReports();
