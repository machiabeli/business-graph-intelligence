# PHASE 1 IMPLEMENTATION PLAN: RADIAL TO MESH ARCHITECTURE

## EXECUTIVE SUMMARY

**Objective:** Transform Epstein Document Explorer from radial (single-center) to mesh (multi-polar) graph architecture for Business Graph Intelligence System

**Scope:** 8 major tasks covering algorithms, APIs, database, configuration, frontend, testing, and documentation

**Validation:** Multi-model consensus from Gemini 3 Pro + Grok 4 analysis

---

## ARCHITECTURE TRANSFORMATION

```
BEFORE (Radial)              AFTER (Mesh)
=================            ================
Jeffrey Epstein (center)     No fixed center
     |                       Distributed topology
  BFS distances              PageRank centrality
     |                       Multi-algorithm support
Color by distance            Color by centrality
     |                       Configurable modes
Radial force layout          Force-directed layout
```

---

## TASK BREAKDOWN & DEPENDENCIES

```
DEPENDENCY GRAPH:
================

Task 1: Graph Algorithms (Foundation)
    |
    +---> Task 2: API Endpoints
    |         |
Task 3:       +---> Task 6: Frontend Mesh Viz
Database            |
Migration           |
    |               |
Task 4:       +---> Task 7: Testing
Config              |
System              |
    |               |
Task 5:       +---> Task 8: Documentation
Frontend
Center
Removal

CRITICAL PATH: Task 1 -> Task 2 -> Task 6
```

---

## TASK 1: GRAPH ALGORITHMS (Foundation)

**File:** `/Users/ma/projects/personal/Epstein-doc-explorer/graph_algorithms.ts` (NEW)

### Deliverables

1. **PageRank Algorithm**
   - Damping factor: 0.85 (configurable)
   - Max iterations: 100
   - Convergence tolerance: 0.0001
   - Handles disconnected components
   - Normalized to 0.0-1.0 range

2. **Eigenvector Centrality**
   - Power iteration method
   - L2 normalization
   - Undirected graph support

3. **Shortest Path (BFS)**
   - Returns path + distance
   - Handles missing paths (null response)
   - Undirected traversal

4. **Connected Components**
   - BFS-based component detection
   - Returns componentId per node

### Validation Requirements

- Test against NetworkX on Karate Club graph (34 nodes, 78 edges)
- PageRank accuracy >95% vs NetworkX
- Handle 1000+ node graphs without performance issues
- Unit tests for all edge cases

---

## TASK 2: API ENDPOINTS (Backend)

**File:** `/Users/ma/projects/personal/Epstein-doc-explorer/api_server.ts` (MODIFY)

### New Endpoints

**1. GET /api/centrality**
```
Query params: ?algorithm=pagerank|eigenvector
Response: { algorithm, centrality{}, node_count, edge_count }
Target: <200ms response time
```

**2. GET /api/shortest-path**
```
Query params: ?from=NodeA&to=NodeB
Response: { from, to, path[], distance }
Handles: 404 for no path, 400 for missing params
```

### Precomputation Strategy (CRITICAL)

**File:** `precompute_centrality.ts` (NEW)

- Runs as batch job (nightly cron: `0 2 * * *`)
- Calculates PageRank + Eigenvector for all nodes
- Stores in database columns
- Transaction-safe updates

---

## TASK 3: DATABASE SCHEMA ENHANCEMENT

**File:** `migrations/001_add_centrality_columns.sql` (NEW)

### Schema Changes

```sql
-- Centrality scores
ALTER TABLE rdf_triples ADD COLUMN actor_pagerank REAL DEFAULT 0.0;
ALTER TABLE rdf_triples ADD COLUMN target_pagerank REAL DEFAULT 0.0;
ALTER TABLE rdf_triples ADD COLUMN actor_eigenvector REAL DEFAULT 0.0;
ALTER TABLE rdf_triples ADD COLUMN target_eigenvector REAL DEFAULT 0.0;

-- Business-specific columns
ALTER TABLE rdf_triples ADD COLUMN properties TEXT;
ALTER TABLE rdf_triples ADD COLUMN value_numeric REAL;
ALTER TABLE rdf_triples ADD COLUMN ownership_percentage REAL;

-- Performance indexes
CREATE INDEX idx_actor_target ON rdf_triples(actor, target);
CREATE INDEX idx_doc_timestamp ON rdf_triples(doc_id, timestamp);
CREATE INDEX idx_actor_pagerank ON rdf_triples(actor, actor_pagerank DESC);
```

### Migration Safety Protocol

1. **ALWAYS backup first:** `cp document_analysis.db document_analysis.db.backup`
2. Test on copy first
3. Run in transaction (COMMIT/ROLLBACK)
4. Verify schema
5. Benchmark performance

---

## TASK 4: CONFIGURATION SYSTEM

**File:** `config/domain.json` (NEW)

### Configuration Schema

**Radial Mode (Legacy):**
```json
{
  "visualization": {
    "mode": "radial",
    "colorScheme": "distance",
    "centralEntities": ["Jeffrey Epstein"]
  }
}
```

**Mesh Mode (BGIS):**
```json
{
  "visualization": {
    "mode": "mesh",
    "colorScheme": "centrality",
    "centralEntities": []
  }
}
```

---

## TASK 5-8: Frontend, Testing, Documentation

See full details in planning session output.

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| PageRank Accuracy | >95% vs NetworkX |
| API Response Time | <200ms |
| Frontend Load Time | <2s (500 nodes) |
| Query Performance | >50% faster |
| Test Coverage | >90% |
| Code Quality | 0 ESLint errors |

---

## IMPLEMENTATION FILES

**NEW FILES (9):**
- graph_algorithms.ts
- precompute_centrality.ts
- config/domain.json
- config/config_loader.ts
- migrations/001_add_centrality_columns.sql
- run_migration.ts
- __tests__/graph_algorithms.test.ts
- __tests__/api_server.test.ts
- acceptance_test.sh

**MODIFIED FILES (2):**
- api_server.ts
- network-ui/src/components/NetworkGraph.tsx

**DOCUMENTATION (4):**
- PHASE1_REFACTORING_REPORT.md
- API_ENDPOINTS_V2.md
- SCHEMA_CHANGES.md
- Screenshots

---

**Plan Created:** 2025-11-21
**Status:** Ready for implementation
