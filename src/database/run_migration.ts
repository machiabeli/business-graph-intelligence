#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * Runs SQL migrations with safety checks and rollback support.
 *
 * Usage:
 *   npm run migrate                    # Run all pending migrations
 *   tsx src/database/run_migration.ts  # Run migrations directly
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || 'document_analysis.db';
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

/**
 * Load all migration files
 */
function loadMigrations(): Migration[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => {
    const match = filename.match(/^(\d+)_/);
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}. Must start with number (e.g., 001_name.sql)`);
    }

    const id = parseInt(match[1]);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8');

    return { id, filename, sql };
  });
}

/**
 * Create migrations tracking table if it doesn't exist
 */
function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      checksum TEXT NOT NULL
    )
  `);
}

/**
 * Calculate checksum for migration SQL
 */
function calculateChecksum(sql: string): string {
  // Simple checksum based on content length and first 100 chars
  const hash = sql.length + sql.substring(0, 100).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash.toString(36);
}

/**
 * Get list of applied migrations
 */
function getAppliedMigrations(db: Database.Database): Set<number> {
  const rows = db.prepare(`SELECT id FROM schema_migrations ORDER BY id`).all() as Array<{ id: number }>;
  return new Set(rows.map(r => r.id));
}

/**
 * Run migration with transaction safety
 */
function runMigration(db: Database.Database, migration: Migration) {
  console.log(`\n📝 Running migration ${migration.id}: ${migration.filename}`);

  const checksum = calculateChecksum(migration.sql);

  // Wrap in transaction
  const transaction = db.transaction(() => {
    // Execute migration SQL
    db.exec(migration.sql);

    // Record migration
    db.prepare(`
      INSERT INTO schema_migrations (id, filename, applied_at, checksum)
      VALUES (?, ?, ?, ?)
    `).run(migration.id, migration.filename, new Date().toISOString(), checksum);
  });

  try {
    transaction();
    console.log(`✅ Migration ${migration.id} applied successfully`);
  } catch (error: any) {
    console.error(`❌ Migration ${migration.id} failed:`, error.message);
    console.error('Transaction rolled back automatically.');
    throw error;
  }
}

/**
 * Main migration logic
 */
function main() {
  console.log('🔧 BGIS Database Migration Tool\n');
  console.log(`Database: ${DB_PATH}`);

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Database not found: ${DB_PATH}`);
    console.error('Please create database first or set DB_PATH environment variable.');
    process.exit(1);
  }

  // Create backup
  const backupPath = `${DB_PATH}.backup.${Date.now()}`;
  console.log(`\n📦 Creating backup: ${backupPath}`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✅ Backup created');

  // Open database
  let db: Database.Database;
  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  } catch (error: any) {
    console.error('❌ Failed to open database:', error.message);
    process.exit(1);
  }

  // Ensure migrations table exists
  ensureMigrationsTable(db);

  // Load migrations
  const migrations = loadMigrations();
  console.log(`\n📋 Found ${migrations.length} migration(s)`);

  // Get applied migrations
  const applied = getAppliedMigrations(db);
  console.log(`📊 Already applied: ${applied.size} migration(s)`);

  // Find pending migrations
  const pending = migrations.filter(m => !applied.has(m.id));

  if (pending.length === 0) {
    console.log('\n✅ No pending migrations. Database is up to date.');
    db.close();
    return;
  }

  console.log(`\n⏳ Pending migrations: ${pending.length}`);
  pending.forEach(m => {
    console.log(`  - ${m.filename}`);
  });

  // Run pending migrations
  let successCount = 0;
  for (const migration of pending) {
    try {
      runMigration(db, migration);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Migration process halted at migration ${migration.id}`);
      console.error(`✅ Successfully applied: ${successCount}/${pending.length} migrations`);
      console.error(`📦 Backup available at: ${backupPath}`);
      db.close();
      process.exit(1);
    }
  }

  // Verify schema
  console.log('\n🔍 Verifying schema...');
  const tableInfo = db.prepare(`PRAGMA table_info(rdf_triples)`).all();
  const columnNames = (tableInfo as any[]).map(col => col.name);

  const expectedColumns = [
    'actor_pagerank',
    'target_pagerank',
    'properties',
    'value_numeric',
    'ownership_percentage'
  ];

  const missing = expectedColumns.filter(col => !columnNames.includes(col));
  if (missing.length > 0) {
    console.error(`⚠️  Missing expected columns: ${missing.join(', ')}`);
  } else {
    console.log('✅ All expected columns present');
  }

  // Show final status
  console.log('\n✅ Migration complete!');
  console.log(`📊 Applied ${successCount}/${pending.length} migration(s)`);
  console.log(`📦 Backup: ${backupPath}\n`);

  db.close();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
