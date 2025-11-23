-- Migration 001: Add centrality scores and business properties to rdf_triples
--
-- Purpose: Enhance schema for Business Graph Intelligence System (BGIS)
--
-- Changes:
--   1. Add PageRank and Eigenvector centrality columns (precomputed scores)
--   2. Add properties JSON column for quantitative business data
--   3. Add indexed columns for common business queries
--   4. Create composite indexes for performance optimization
--
-- Safety: This migration is backwards-compatible (only adds columns, no deletes)
--
-- Run with: tsx src/database/run_migration.ts

-- ===========================================================================
-- STEP 1: Add Centrality Columns
-- ===========================================================================

-- Precomputed centrality scores (updated by batch job)
ALTER TABLE rdf_triples ADD COLUMN actor_pagerank REAL DEFAULT 0.0;
ALTER TABLE rdf_triples ADD COLUMN target_pagerank REAL DEFAULT 0.0;
ALTER TABLE rdf_triples ADD COLUMN actor_eigenvector REAL DEFAULT 0.0;
ALTER TABLE rdf_triples ADD COLUMN target_eigenvector REAL DEFAULT 0.0;

-- ===========================================================================
-- STEP 2: Add Business Properties Columns
-- ===========================================================================

-- JSON column for structured business data
-- Example: {"amount": 10000, "currency": "USD", "ownership_pct": 51}
ALTER TABLE rdf_triples ADD COLUMN properties TEXT;

-- Indexed columns for common business queries
ALTER TABLE rdf_triples ADD COLUMN value_numeric REAL;
ALTER TABLE rdf_triples ADD COLUMN ownership_percentage REAL;
ALTER TABLE rdf_triples ADD COLUMN effective_date TEXT;
ALTER TABLE rdf_triples ADD COLUMN expiration_date TEXT;

-- ===========================================================================
-- STEP 3: Create Performance Indexes
-- ===========================================================================

-- Composite index for actor-target queries (most common)
CREATE INDEX IF NOT EXISTS idx_actor_target ON rdf_triples(actor, target);

-- Index for document-timestamp queries
CREATE INDEX IF NOT EXISTS idx_doc_timestamp ON rdf_triples(doc_id, timestamp);

-- Index for PageRank-sorted queries (top entities)
CREATE INDEX IF NOT EXISTS idx_actor_pagerank ON rdf_triples(actor, actor_pagerank DESC);
CREATE INDEX IF NOT EXISTS idx_target_pagerank ON rdf_triples(target, target_pagerank DESC);

-- Index for ownership queries (>50% threshold common in business analysis)
CREATE INDEX IF NOT EXISTS idx_ownership ON rdf_triples(ownership_percentage DESC)
  WHERE ownership_percentage IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_effective_date ON rdf_triples(effective_date)
  WHERE effective_date IS NOT NULL;

-- Index for numeric value queries (transactions, amounts)
CREATE INDEX IF NOT EXISTS idx_value_numeric ON rdf_triples(value_numeric DESC)
  WHERE value_numeric IS NOT NULL;

-- ===========================================================================
-- VERIFICATION QUERIES (run after migration)
-- ===========================================================================

-- Verify new columns exist:
-- PRAGMA table_info(rdf_triples);

-- Verify indexes were created:
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='rdf_triples';

-- Example usage of new columns:
-- UPDATE rdf_triples SET properties = '{"amount": 1000000, "currency": "USD"}'
--   WHERE action = 'transferred';
--
-- SELECT * FROM rdf_triples WHERE ownership_percentage > 50;
-- SELECT * FROM rdf_triples WHERE actor_pagerank > 0.5 ORDER BY actor_pagerank DESC;
