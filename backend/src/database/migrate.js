/**
 * Database Migration Runner
 * 
 * Runs all SQL migration files in order to create database schema.
 * Usage: npm run migrate
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
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'clipiq',
});

/**
 * Get all migration files in order
 */
async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = await fs.readdir(migrationsDir);
  
  return files
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort by filename (001, 002, etc.)
}

/**
 * Check if migrations table exists, create if not
 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Check if migration has been run
 */
async function hasBeenRun(client, migrationName) {
  const result = await client.query(
    'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
    [migrationName]
  );
  return result.rows.length > 0;
}

/**
 * Mark migration as completed
 */
async function markAsRun(client, migrationName) {
  await client.query(
    'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
    [migrationName]
  );
}

/**
 * Run a single migration file
 */
async function runMigration(client, filename) {
  console.log(`\n📦 Running migration: ${filename}`);
  
  const migrationPath = path.join(__dirname, 'migrations', filename);
  const sql = await fs.readFile(migrationPath, 'utf-8');
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Run migration SQL
    await client.query(sql);
    
    // Mark as completed
    await markAsRun(client, filename);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`   ✅ ${filename} completed successfully`);
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error(`   ❌ ${filename} failed:`, error.message);
    throw error;
  }
}

/**
 * Main migration execution
 */
async function runAllMigrations() {
  console.log('🔧 Starting database migrations...\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME || 'clipiq'}`);
  
  const client = await pool.connect();
  
  try {
    // Test database connection
    console.log('✅ Database connection successful\n');
    
    // Ensure migrations tracking table exists
    await ensureMigrationsTable(client);
    
    // Get all migration files
    const migrationFiles = await getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }
    
    console.log(`Found ${migrationFiles.length} migration(s):\n`);
    migrationFiles.forEach(file => console.log(`   - ${file}`));
    
    // Run each migration
    let ranCount = 0;
    let skippedCount = 0;
    
    for (const file of migrationFiles) {
      const alreadyRan = await hasBeenRun(client, file);
      
      if (alreadyRan) {
        console.log(`\n⏭️  Skipping ${file} (already run)`);
        skippedCount++;
        continue;
      }
      
      await runMigration(client, file);
      ranCount++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Summary: ${ranCount} ran, ${skippedCount} skipped`);
    console.log('✅ All migrations completed successfully! 🎉\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllMigrations();
}

export default runAllMigrations;
