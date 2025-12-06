import 'dotenv/config';
import pool from './src/config/database.js';

async function listUsers() {
    console.log('CWD:', process.cwd());
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD loaded:', !!process.env.DB_PASSWORD);
    try {
        console.log('Querying users...');
        const result = await pool.query('SELECT id, username, email FROM users');
        console.log('Users found:', result.rows.length);
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

listUsers();
