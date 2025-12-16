import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkData() {
    console.log('Checking database content...');

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'clipiq_db',
    });

    try {
        const client = await pool.connect();

        const tables = ['users', 'videos', 'comments', 'likes'];
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Table '${table}': ${res.rows[0].count} rows`);

                if (table === 'videos' && res.rows[0].count > 0) {
                    const vid = await client.query('SELECT title FROM videos LIMIT 1');
                    console.log(`Sample Video Title: "${vid.rows[0].title}"`);
                }
            } catch (e) {
                console.log(`Table '${table}': Error - ${e.message}`);
            }
        }

        client.release();
        await pool.end();
    } catch (err) {
        console.log(`❌ Connection failed: ${err.message}`);
        await pool.end();
    }
}

checkData();
