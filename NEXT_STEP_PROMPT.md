# NEXT STEP: Complete Exact Prompt for BGIS Implementation

## 🎯 CONTEXT

You are beginning implementation of the **Business Graph Intelligence System (BGIS)** by adapting the Epstein Document Explorer codebase.

**Multi-model consensus validation** (Grok-4 + Gemini-3-Pro-Preview) has confirmed:
- ✅ 70-80% of codebase is reusable
- ⚠️ Critical architecture refactoring required (radial → mesh)
- ⚠️ Complete prompt rewrite needed (not just "configuration")
- ⚠️ Cost model: $40-60 per 1000 documents (not $16-19)
- ✅ Timeline: 8 weeks with 2-3 engineers

**All analysis documentation is in:**
- `/Users/ma/Projects/Personal/business-graph-intelligence/COMPLETE_DEPENDENCY_ANALYSIS.md`
- `/Users/ma/projects/personal/Epstein-doc-explorer/` (reference codebase)

---

## 📋 PHASE 1: ARCHITECTURE REFACTORING (Weeks 1-3)

### **Objective:**
Transform the "radial" graph system (everything revolves around Jeffrey Epstein) into a "mesh" graph system (multi-polar business network analysis).

### **Your Task:**

You are a senior software architect specializing in graph algorithms and knowledge graph systems. You need to refactor the Epstein Document Explorer to support **multi-center graph analysis** for business intelligence.

**CRITICAL ARCHITECTURAL ISSUE IDENTIFIED BY EXPERTS:**
- Current system: Radial architecture (BFS from single root node)
- BGIS requirement: Mesh architecture (PageRank, Eigenvector centrality, arbitrary node pairs)

### **Specific Files to Modify:**

#### 1. **Backend: api_server.ts (Lines 324-344)**

**Current Implementation:**
```typescript
// api_server.ts lines 324-344
// BFS from single root node (Jeffrey Epstein)
function calculateHopDistance(rootNode: string) {
  const queue = [rootNode];
  const distances = new Map();
  distances.set(rootNode, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    const currentDist = distances.get(current);
    // ... BFS traversal
  }
  return distances;
}
```

**Required Refactoring:**

1. **Replace BFS with PageRank algorithm**
```typescript
// NEW: Calculate node centrality using PageRank
function calculatePageRank(
  nodes: string[],
  edges: Array<{source: string, target: string}>,
  dampingFactor: number = 0.85,
  iterations: number = 100
): Map<string, number> {
  // Implement PageRank algorithm
  // Return: Map of node → centrality score
}
```

2. **Add Eigenvector centrality calculation**
```typescript
function calculateEigenvectorCentrality(
  nodes: string[],
  edges: Array<{source: string, target: string}>,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): Map<string, number> {
  // Implement power iteration method
  // Return: Map of node → centrality score
}
```

3. **Add shortest path calculation between arbitrary nodes**
```typescript
function calculateShortestPath(
  nodeA: string,
  nodeB: string,
  edges: Array<{source: string, target: string}>
): {path: string[], distance: number} | null {
  // Implement Dijkstra's algorithm or BFS for unweighted
  // Return: Path and distance, or null if no path exists
}
```

4. **Create new API endpoints**
```typescript
// GET /api/centrality?algorithm=pagerank|eigenvector
app.get('/api/centrality', (req, res) => {
  const algorithm = req.query.algorithm || 'pagerank';
  const nodes = /* fetch from database */;
  const edges = /* fetch from database */;

  let centrality;
  if (algorithm === 'pagerank') {
    centrality = calculatePageRank(nodes, edges);
  } else if (algorithm === 'eigenvector') {
    centrality = calculateEigenvectorCentrality(nodes, edges);
  }

  res.json({centrality: Object.fromEntries(centrality)});
});

// GET /api/shortest-path?from=CompanyA&to=CompanyB
app.get('/api/shortest-path', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const result = calculateShortestPath(from, to, edges);
  res.json(result);
});
```

**Deliverable:**
- Modified api_server.ts with 3 new algorithms implemented
- 2 new API endpoints tested with Postman/curl
- Unit tests for PageRank and Eigenvector algorithms (Jest)

---

#### 2. **Frontend: NetworkGraph.tsx (Lines 32, 86-119, 210-226, 287, 300)**

**Current Implementation:**
```typescript
// NetworkGraph.tsx line 32
const EPSTEIN_NAME = 'Jeffrey Epstein';

// Lines 86-119: BFS from hardcoded center
const distances = new Map();
distances.set(EPSTEIN_NAME, 0);
// ... BFS calculation

// Lines 210-226: Color based on distance from center
const color = distanceToColor(distances.get(node.id));

// Line 300: Radial force positioning
.force('radial', d3.forceRadial(radius, centerX, centerY))
```

**Required Refactoring:**

1. **Remove hardcoded center entity**
```typescript
// BEFORE
const EPSTEIN_NAME = 'Jeffrey Epstein';

// AFTER
import domainConfig from '../config/domain.json';
const centralEntities = domainConfig.centralEntities || []; // Could be empty for mesh
```

2. **Replace radial color scheme with centrality-based coloring**
```typescript
// Fetch centrality scores from API
const [centrality, setCentrality] = useState<Map<string, number>>(new Map());

useEffect(() => {
  fetch('/api/centrality?algorithm=pagerank')
    .then(res => res.json())
    .then(data => setCentrality(new Map(Object.entries(data.centrality))));
}, []);

// Color nodes by centrality score (0.0 - 1.0)
const nodeColor = (nodeId: string) => {
  const score = centrality.get(nodeId) || 0;
  return d3.interpolateViridis(score); // Purple (low) → Yellow (high)
};
```

3. **Replace radial force with standard force-directed layout**
```typescript
// BEFORE (Radial)
simulation
  .force('radial', d3.forceRadial(radius, centerX, centerY))
  .force('charge', d3.forceManyBody().strength(-300));

// AFTER (Mesh - no center bias)
simulation
  .force('charge', d3.forceManyBody().strength(-300))
  .force('link', d3.forceLink(links)
    .id((d: any) => d.id)
    .distance(50)
  )
  .force('center', d3.forceCenter(width / 2, height / 2)) // Only viewport centering
  .force('collision', d3.forceCollide().radius(10));
```

4. **Add configuration for visualization mode**
```typescript
// domain.json
{
  "visualizationMode": "mesh", // or "radial" for backwards compatibility
  "centralEntities": ["Company A", "Company B"], // Only used if mode = radial
  "colorScheme": "centrality", // or "distance", "category"
}
```

**Deliverable:**
- Modified NetworkGraph.tsx with configurable layout modes
- New centrality-based color scheme implemented
- Domain configuration file created
- Visual comparison screenshots (radial vs. mesh layout)

---

#### 3. **Database: Schema Enhancement**

**Current Schema:**
```sql
CREATE TABLE rdf_triples (
  id INTEGER PRIMARY KEY,
  doc_id TEXT,
  actor TEXT,
  action TEXT,
  target TEXT,
  triple_tags TEXT,       -- JSON array (unstructured)
  top_cluster_ids TEXT,   -- Materialized
  hop_distance INTEGER    -- From single center (TO BE DEPRECATED)
);
```

**Required Schema Changes:**

1. **Add structured properties column** (Gemini-3 Pro critical recommendation)
```sql
-- Add JSON column for quantitative business data
ALTER TABLE rdf_triples ADD COLUMN properties TEXT;

-- Add indexed columns for common queries
ALTER TABLE rdf_triples ADD COLUMN value_numeric REAL;
ALTER TABLE rdf_triples ADD COLUMN value_currency TEXT;
ALTER TABLE rdf_triples ADD COLUMN ownership_percentage REAL;
ALTER TABLE rdf_triples ADD COLUMN effective_date TEXT;
ALTER TABLE rdf_triples ADD COLUMN expiration_date TEXT;

-- Add centrality scores (precomputed)
ALTER TABLE rdf_triples ADD COLUMN actor_pagerank REAL;
ALTER TABLE rdf_triples ADD COLUMN target_pagerank REAL;
```

2. **Create missing composite indexes** (Both models recommended)
```sql
CREATE INDEX idx_actor_target ON rdf_triples(actor, target);
CREATE INDEX idx_doc_timestamp ON rdf_triples(doc_id, timestamp);
CREATE INDEX idx_actor_pagerank ON rdf_triples(actor, actor_pagerank DESC);
CREATE INDEX idx_properties ON rdf_triples(properties) WHERE properties IS NOT NULL;
```

3. **Create migration script**
```typescript
// migrations/001_add_properties_column.ts
import Database from 'better-sqlite3';

export function up(db: Database) {
  db.exec(`
    ALTER TABLE rdf_triples ADD COLUMN properties TEXT;
    ALTER TABLE rdf_triples ADD COLUMN value_numeric REAL;
    ALTER TABLE rdf_triples ADD COLUMN value_currency TEXT;
    ALTER TABLE rdf_triples ADD COLUMN ownership_percentage REAL;

    CREATE INDEX idx_actor_target ON rdf_triples(actor, target);
    CREATE INDEX idx_doc_timestamp ON rdf_triples(doc_id, timestamp);
  `);
}

export function down(db: Database) {
  // Rollback logic
  db.exec(`
    DROP INDEX IF EXISTS idx_actor_target;
    DROP INDEX IF EXISTS idx_doc_timestamp;
  `);
}
```

**Deliverable:**
- SQL migration script tested on copy of database
- Documentation of new `properties` JSON schema format
- Sample queries demonstrating structured data usage:
  - "SELECT SUM(value_numeric) WHERE action = 'transferred' AND actor = 'Company A'"
  - "SELECT * WHERE ownership_percentage > 50"

---

### **Success Criteria for Phase 1:**

✅ **Backend:**
- PageRank algorithm implemented and tested (correctness validated against known test graphs)
- Eigenvector centrality implemented and tested
- Shortest path algorithm implemented
- 2 new API endpoints functional (return correct JSON)
- Unit tests: >90% code coverage for new algorithms

✅ **Frontend:**
- NetworkGraph displays mesh layout (no center bias)
- Nodes colored by centrality score (gradient visualization)
- Configuration file controls visualization mode
- Performance: Handles 1000+ nodes without lag

✅ **Database:**
- Migration script runs successfully
- New indexes improve query performance (benchmark: >50% faster)
- Sample business data with properties column populated
- Documentation complete

✅ **Integration:**
- Frontend fetches centrality from new API
- Graph visualization updates dynamically
- End-to-end test: Load business dataset → Visualize → Verify mesh layout

---

## 🎯 DELIVERABLES FOR PHASE 1

1. **Modified Code:**
   - `api_server.ts` (Lines 324-344 replaced + 2 new endpoints)
   - `NetworkGraph.tsx` (Lines 32, 86-119, 210-226, 287, 300 refactored)
   - `config/domain.json` (new file)
   - `migrations/001_add_properties_column.ts` (new file)

2. **Tests:**
   - `api_server.test.ts` (PageRank, Eigenvector, shortest path)
   - `NetworkGraph.test.tsx` (component tests)
   - `integration.test.ts` (end-to-end)

3. **Documentation:**
   - `PHASE1_REFACTORING_REPORT.md` (what changed, why, performance benchmarks)
   - `API_ENDPOINTS_V2.md` (new endpoint documentation)
   - `SCHEMA_CHANGES.md` (migration guide)

4. **Visual Assets:**
   - Screenshots: Before (radial) vs. After (mesh)
   - Performance graphs: Query time before/after indexes

---

## 🚨 COMMON PITFALLS TO AVOID

### **Pitfall #1: Incomplete PageRank Implementation**
❌ **Wrong:** Naively translate Wikipedia pseudocode without handling edge cases
✅ **Right:**
- Handle disconnected components (assign low score)
- Normalize scores to 0.0-1.0 range
- Add damping factor parameter (default 0.85)
- Test on known graphs (Karate Club, Small World)

### **Pitfall #2: Breaking Existing API Contracts**
❌ **Wrong:** Remove old endpoints immediately
✅ **Right:**
- Keep old endpoints under `/api/v1/`
- Add new endpoints under `/api/v2/` or `/api/centrality`
- Document deprecation timeline (6 months)

### **Pitfall #3: Performance Regression**
❌ **Wrong:** Run PageRank on every API request (O(V×E×iterations) = expensive!)
✅ **Right:**
- Precompute centrality scores during ingestion
- Store in `actor_pagerank` column
- Recompute only when graph changes (batch job)

### **Pitfall #4: Schema Migration Data Loss**
❌ **Wrong:** Run ALTER TABLE on production database without backup
✅ **Right:**
- Backup database first: `cp document_analysis.db document_analysis.db.backup`
- Test migration on copy
- Use transactions: BEGIN TRANSACTION → ALTER → COMMIT / ROLLBACK

---

## 📚 REFERENCE MATERIALS

### **PageRank Algorithm (Python Reference)**
```python
# Pseudocode for validation
def pagerank(graph, damping=0.85, iterations=100):
    N = len(graph.nodes)
    scores = {node: 1.0/N for node in graph.nodes}

    for _ in range(iterations):
        new_scores = {}
        for node in graph.nodes:
            rank = (1 - damping) / N
            for neighbor in graph.predecessors(node):
                outbound = len(graph.successors(neighbor))
                rank += damping * scores[neighbor] / outbound
            new_scores[node] = rank
        scores = new_scores

    return scores
```

### **D3 Force Layout Documentation**
- Force Simulation: https://d3js.org/d3-force
- Force-Directed Graph: https://observablehq.com/@d3/force-directed-graph

### **SQLite JSON Functions**
- json_extract(): https://www.sqlite.org/json1.html
- json_each(): For querying properties column

---

## ✅ ACCEPTANCE TEST

Before considering Phase 1 complete, run this test:

```bash
# 1. Load business dataset (100 companies, 500 relationships)
npm run ingest -- --domain=business --file=test_data/companies.csv

# 2. Run migration
npm run migrate

# 3. Start API server
npm run api

# 4. Test new endpoints
curl http://localhost:3001/api/centrality?algorithm=pagerank
# Expected: JSON with 100 companies and centrality scores 0.0-1.0

curl http://localhost:3001/api/shortest-path?from=CompanyA&to=CompanyZ
# Expected: {path: [...], distance: N}

# 5. Start frontend
cd network-ui && npm run dev

# 6. Visual validation
# - Open http://localhost:5173
# - Verify: Graph shows mesh layout (no radial bias)
# - Verify: Nodes colored by centrality (gradient visible)
# - Verify: Performance is acceptable (<2s load time for 500 relationships)

# 7. Run test suite
npm test
# Expected: All tests pass, >90% coverage
```

---

## 🎯 SUCCESS METRICS

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **PageRank Accuracy** | >95% match to NetworkX | Compare output on test graph |
| **API Response Time** | <200ms for /api/centrality | Benchmark with `time curl` |
| **Query Performance** | >50% faster with indexes | EXPLAIN QUERY PLAN before/after |
| **Frontend Load Time** | <2s for 500 relationships | Chrome DevTools Network tab |
| **Test Coverage** | >90% | Jest coverage report |
| **Code Quality** | 0 ESLint errors | `npm run lint` |

---

## 🚀 KICK-OFF PROMPT FOR AI ASSISTANT

Copy this prompt into your next Claude Code session:

```
I need to refactor the Epstein Document Explorer for Business Graph Intelligence (BGIS).

CONTEXT:
- Current system: Radial graph (BFS from Jeffrey Epstein as center)
- Target system: Mesh graph (PageRank/centrality for multi-polar business networks)
- Full analysis: /Users/ma/Projects/Personal/business-graph-intelligence/COMPLETE_DEPENDENCY_ANALYSIS.md
- Reference code: /Users/ma/projects/personal/Epstein-doc-explorer/

PHASE 1 TASKS (weeks 1-3):
1. Refactor api_server.ts lines 324-344: Replace BFS with PageRank + Eigenvector centrality
2. Refactor NetworkGraph.tsx: Remove hardcoded "Jeffrey Epstein", implement mesh layout
3. Database: Add properties JSON column, create composite indexes
4. Add 2 new API endpoints: /api/centrality, /api/shortest-path

DELIVERABLES:
- Modified code (api_server.ts, NetworkGraph.tsx, migration script)
- Unit tests (>90% coverage)
- Documentation (what changed, why, performance benchmarks)
- Visual comparison (radial vs. mesh screenshots)

START BY:
1. Reading COMPLETE_DEPENDENCY_ANALYSIS.md (lines 140-350 for architectural issues)
2. Examining api_server.ts lines 324-344 (current BFS implementation)
3. Proposing PageRank algorithm implementation (with pseudocode)
4. Estimating effort (hours per task)

CONSTRAINTS:
- Keep old API endpoints under /api/v1/ (backwards compatibility)
- Precompute centrality scores (don't calculate on every request)
- Test on copy of database first (backup before migration)
- Handle disconnected graph components gracefully

Let's start with step 1: Read the architecture analysis and propose the PageRank implementation.
```

---

## 📞 SUPPORT & ESCALATION

**If you get stuck:**
1. **PageRank not converging:** Increase iterations (default 100 → 500), check for disconnected components
2. **Frontend performance issues:** Reduce node count (pagination), implement virtual scrolling
3. **Database lock errors:** Add WAL mode: `PRAGMA journal_mode=WAL;`
4. **Tests failing:** Check NetworkX reference implementation, validate test data

**Need help? Consult:**
- Original analysis: `COMPLETE_DEPENDENCY_ANALYSIS.md` (lines 140-350 for risks)
- Gemini-3 Pro recommendation: "Refactor Principal Logic" (lines 450-480)
- Grok-4 recommendation: "Implement missing indexes" (lines 520-540)

---

**Phase 1 Duration:** 3 weeks
**Estimated Effort:** 80-120 hours (2 engineers)
**Priority:** CRITICAL (blocks Phases 2-4)
**Risk Level:** MEDIUM-HIGH (architectural refactoring)

Good luck! 🚀
