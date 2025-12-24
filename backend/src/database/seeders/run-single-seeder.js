/**
 * Run a single seeder file for testing
 * Usage: node src/database/seeders/run-single-seeder.js 007-seed-interactions.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Create PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'clipiq_user',
  password: process.env.DB_PASSWORD || 'clipiq_password',
  database: process.env.DB_NAME || 'clipiq_db',
});

async function runSingleSeeder() {
  const seederFile = process.argv[2];
  
  if (!seederFile) {
    console.error('❌ Please provide seeder filename');
    console.error('Usage: node run-single-seeder.js 007-seed-interactions.js');
    process.exit(1);
  }
  
  console.log(`\n🌱 Running seeder: ${seederFile}\n`);
  
  try {
    // Test database connection
    const testClient = await pool.connect();
    console.log('✅ Database connection successful\n');
    testClient.release();
    
    // Import seeder (use file:// URL for Windows compatibility)
    const seederPath = path.join(__dirname, seederFile);
    const seederUrl = new URL(`file:///${seederPath.replace(/\\/g, '/')}`);
    const seeder = await import(seederUrl.href);
    
    if (typeof seeder.seed !== 'function') {
      console.error(`❌ ${seederFile} has no seed() function`);
      process.exit(1);
    }
    
    // Get client and run
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('🔄 Running seeder...\n');
      
      await seeder.seed(client, pool);
      
      await client.query('COMMIT');
      console.log(`\n✅ ${seederFile} completed successfully!\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`\n❌ ${seederFile} failed:`, error.message);
      console.error('\n📚 Stack trace:');
      console.error(error.stack);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSingleSeeder();

