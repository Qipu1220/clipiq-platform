
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new pg.Pool({
    user: 'clipiq_user',
    host: 'localhost',
    database: 'clipiq_db',
    password: 'clipiq_password',
    port: 5432,
});

async function debug() {
    try {
        console.log('Connected to DB');

        // Check for is_demoted column
        const schemaRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_demoted';
    `);

        console.log('Column is_demoted exists:', schemaRes.rows.length > 0);
        if (schemaRes.rows.length > 0) {
            console.log('Column details:', schemaRes.rows[0]);
        } else {
            console.log('WARNING: is_demoted column MISSING!');
        }

        // Check admin user
        const adminRes = await pool.query("SELECT id, username, email, role FROM users WHERE username = 'admin'");
        console.log('Admin user found:', adminRes.rows.length > 0);
        if (adminRes.rows.length > 0) {
            console.log('Admin user details:', adminRes.rows[0]);
        } else {
            console.log('WARNING: Admin user NOT FOUND!');
        }

        // Check who user001 is
        const user001Res = await pool.query("SELECT id, username, email, role FROM users WHERE username = 'user001'");
        if (user001Res.rows.length > 0) {
            console.log('User001 details:', user001Res.rows[0]);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

debug();
