/**
 * Database Seeder Runner
 * 
 * Runs all seed files in order to populate initial data.
 * Usage: npm run db:seed
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const { Pool } = pg;

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Create PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'clipiq',
});

/**
 * Get all seeder files in order
 */
async function getSeederFiles() {
  const files = await fs.readdir(__dirname);
  
  return files
    .filter(file => file.match(/^\d{3}-.*\.js$/) && file !== 'index.js')
    .sort(); // Sort by prefix (001, 002, etc.)
}

/**
 * Run a single seeder file
 */
async function runSeeder(filename) {
  console.log(`\n📦 Running seeder: ${filename}`);
  
  const seederPath = path.join(__dirname, filename);
  const seeder = await import(seederPath);
  
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Run seeder's seed function
    if (typeof seeder.seed === 'function') {
      await seeder.seed(client, pool);
      console.log(`   ✅ ${filename} completed successfully`);
    } else {
      console.warn(`   ⚠️  ${filename} has no seed() function, skipping`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error(`   ❌ ${filename} failed:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main seeder execution
 */
async function runAllSeeders() {
  console.log('🌱 Starting database seeding...\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME || 'clipiq'}`);
  
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');
    client.release();
    
    // Get and run all seeders
    const seederFiles = await getSeederFiles();
    
    if (seederFiles.length === 0) {
      console.log('⚠️  No seeder files found');
      return;
    }
    
    console.log(`Found ${seederFiles.length} seeder(s):\n`);
    seederFiles.forEach(file => console.log(`   - ${file}`));
    
    // Run each seeder in order
    for (const file of seederFiles) {
      await runSeeder(file);
    }
    
    console.log('\n✅ All seeders completed successfully! 🎉\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllSeeders();
}

export default runAllSeeders;
