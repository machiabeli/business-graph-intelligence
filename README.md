# Business Graph Intelligence System (BGIS)

**Phase 1 Implementation: Mesh Architecture for Multi-Polar Business Networks**

## Overview

BGIS adapts the Epstein Document Explorer's 4-tier architecture from radial (single-center) to mesh (multi-polar) graph analysis for business relationship mapping.

### Key Architectural Changes

**From Radial → To Mesh:**
- ❌ BFS from single root node ("Jeffrey Epstein")
- ✅ PageRank & Eigenvector centrality (multi-polar analysis)
- ❌ Color by distance from center
- ✅ Color by centrality score
- ❌ Hardcoded entity names
- ✅ Configurable domain JSON

## Project Structure

```
business-graph-intelligence/
├── src/
│   ├── algorithms/
│   │   └── graph_algorithms.ts      # PageRank, Eigenvector, BFS, Components
│   ├── api/
│   │   └── api_server.ts            # REST API with centrality endpoints
│   ├── database/
│   │   └── run_migration.ts         # Database migration runner
│   └── config/
├── __tests__/
│   └── graph_algorithms.test.ts     # 22 tests, 100% statement coverage
├── migrations/
│   └── 001_add_centrality_columns.sql
├── config/
│   ├── domain.json                  # BGIS domain configuration
│   └── domain.schema.json           # JSON schema for validation
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Installation

```bash
npm install
```

## API Endpoints

### New V2 Endpoints (Mesh Architecture)

**Get Centrality Scores:**
```bash
GET /api/v2/centrality?algorithm=pagerank
GET /api/v2/centrality?algorithm=eigenvector
```

Response:
```json
{
  "algorithm": "pagerank",
  "centrality": {
    "Company A": 0.85,
    "Company B": 0.62,
    ...
  },
  "node_count": 100,
  "edge_count": 450
}
```

**Get Shortest Path:**
```bash
GET /api/v2/shortest-path?from=CompanyA&to=CompanyB
```

Response:
```json
{
  "from": "CompanyA",
  "to": "CompanyB",
  "path": ["CompanyA", "CompanyC", "CompanyB"],
  "distance": 2
}
```

**Get Connected Components:**
```bash
GET /api/v2/components
```

### Original V1 Endpoints (Domain-Agnostic)

- `GET /api/actors` - All nodes with connection counts
- `GET /api/relationships` - Filtered relationships
- `GET /api/stats` - Graph statistics
- `GET /api/tag-clusters` - Tag cluster data
- `GET /health` - Health check

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

**Current Test Results:**
- ✅ 22/22 tests passing
- ✅ 100% statement coverage
- ✅ 100% function coverage
- ✅ 100% line coverage
- ⚠️  80% branch coverage

## Database Schema

### New Columns (Migration 001)

**Centrality Scores:**
- `actor_pagerank` REAL
- `target_pagerank` REAL
- `actor_eigenvector` REAL
- `target_eigenvector` REAL

**Business Properties:**
- `properties` TEXT (JSON)
- `value_numeric` REAL
- `ownership_percentage` REAL
- `effective_date` TEXT
- `expiration_date` TEXT

**Performance Indexes:**
- `idx_actor_target` - Composite index for relationship queries
- `idx_doc_timestamp` - Document timeline queries
- `idx_actor_pagerank` - Centrality-sorted queries
- `idx_ownership` - Ownership threshold queries

### Running Migrations

```bash
npm run migrate
```

## Configuration

Edit `config/domain.json` to customize:

- **Visualization mode:** `mesh` (multi-polar) or `radial` (single-center)
- **Color scheme:** `centrality`, `distance`, `category`, `custom`
- **Algorithms:** PageRank damping factor, iteration limits
- **Entity types:** Companies, people, organizations
- **Relationship types:** Ownership, partnerships, investments

## Graph Algorithms

### PageRank
- **Damping factor:** 0.85 (configurable)
- **Max iterations:** 100
- **Convergence tolerance:** 0.0001
- **Output:** Normalized 0.0-1.0 scores

### Eigenvector Centrality
- **Method:** Power iteration
- **Max iterations:** 100
- **Normalization:** L2 norm
- **Output:** Normalized 0.0-1.0 scores

### Shortest Path
- **Algorithm:** BFS (undirected graphs)
- **Returns:** Path array + distance
- **Handles:** Disconnected nodes (returns null)

### Connected Components
- **Algorithm:** BFS-based component detection
- **Returns:** Map of node → component ID

## Development Status

### ✅ Phase 1 - Complete (All 3 Batches)

**Batch 1: Core Algorithms & Testing**
- [x] Project structure
- [x] Package configuration
- [x] Graph algorithms implementation (PageRank, Eigenvector, BFS, Components)
- [x] Comprehensive test suite (22 tests, 100% statement coverage)

**Batch 2: API & Database**
- [x] API server with centrality endpoints (V2)
- [x] Database migration scripts
- [x] Domain configuration system
- [x] Migration runner with transaction safety

**Batch 3: Frontend**
- [x] React + Vite + TypeScript setup
- [x] NetworkGraph component (mesh architecture)
- [x] API integration layer
- [x] Centrality-based visualization
- [x] Algorithm selector (PageRank/Eigenvector)

### ⏸️ Future Enhancements (Post-Phase 1)

- [ ] Precompute centrality batch job (cron)
- [ ] Integration tests (API + Frontend)
- [ ] Sample business dataset
- [ ] Deployment configuration
- [ ] Performance benchmarks
- [ ] Visual comparison screenshots

## Architecture Transformation

### Before (Radial - Epstein Explorer)
```typescript
const EPSTEIN_NAME = 'Jeffrey Epstein';
const distances = calculateBFS(EPSTEIN_NAME);
// Color nodes by hop distance from center
```

### After (Mesh - BGIS)
```typescript
const config = loadDomainConfig();
const centrality = calculatePageRank(graph);
// Color nodes by centrality score (no fixed center)
```

## Performance Targets

| Metric | Target | Current Status |
|--------|--------|----------------|
| PageRank Accuracy | >95% vs NetworkX | ✅ Validated |
| API Response Time | <200ms | ⏸️ Not measured |
| Frontend Load Time | <2s (500 nodes) | ⏸️ Not implemented |
| Test Coverage | >90% | ⚠️  80% branches |

## License

Proprietary - Business Graph Intelligence System

## References

- Original Analysis: `COMPLETE_DEPENDENCY_ANALYSIS.md`
- Implementation Plan: `PHASE1_IMPLEMENTATION_PLAN.md`
- Session Context: `SESSION_CONTEXT.md`
- Source Codebase: `/Users/ma/projects/personal/Epstein-doc-explorer/`
