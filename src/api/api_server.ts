#!/usr/bin/env node

/**
 * Business Graph Intelligence System (BGIS) API Server
 *
 * REST API for business relationship graph analysis with multi-polar
 * centrality calculations (PageRank, Eigenvector) instead of radial BFS.
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  calculatePageRank,
  calculateEigenvectorCentrality,
  calculateShortestPath,
  findConnectedComponents,
  type Graph,
} from '../algorithms/graph_algorithms.js';

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || 'document_analysis.db';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.trim())
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('Allowed CORS origins:', ALLOWED_ORIGINS);

// CORS configuration with origin whitelist
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin requests, mobile apps, curl)
    if (!origin) return callback(null, true);

    // Allow localhost origins for development
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Log rejected origins for debugging
    console.warn(`CORS blocked origin: ${origin}`);

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: 86400
}));

// Request size limits
app.use(express.json({ limit: '10mb' }));

// Simple rate limiting middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 1000; // Max requests per window

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const userData = requestCounts.get(ip);

  if (!userData || now > userData.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (userData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }

  userData.count++;
  next();
});

// Initialize database with error handling
let db: Database.Database;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // Enable WAL mode for better concurrency
  console.log(`✓ Database initialized: ${DB_PATH}`);
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Load tag clusters with error handling
let tagClusters: any[] = [];
try {
  const clustersPath = path.join(process.cwd(), 'tag_clusters.json');
  if (fs.existsSync(clustersPath)) {
    tagClusters = JSON.parse(fs.readFileSync(clustersPath, 'utf-8'));
    console.log(`✓ Loaded ${tagClusters.length} tag clusters`);
  }
} catch (error) {
  console.error('Failed to load tag clusters:', error);
  tagClusters = [];
}

// ============================================================================
// GRAPH CONSTRUCTION UTILITIES
// ============================================================================

/**
 * Build graph from database relationships
 */
function buildGraphFromDatabase(): Graph {
  const relationships = db.prepare(`
    SELECT DISTINCT
      COALESCE(ea1.canonical_name, rt.actor) as actor,
      COALESCE(ea2.canonical_name, rt.target) as target
    FROM rdf_triples rt
    LEFT JOIN entity_aliases ea1 ON rt.actor = ea1.original_name
    LEFT JOIN entity_aliases ea2 ON rt.target = ea2.original_name
  `).all() as Array<{ actor: string; target: string }>;

  const nodesSet = new Set<string>();
  const edges = relationships.map(rel => {
    nodesSet.add(rel.actor);
    nodesSet.add(rel.target);
    return { source: rel.actor, target: rel.target };
  });

  return {
    nodes: Array.from(nodesSet),
    edges
  };
}

/**
 * BM25 scoring for keyword search
 */
function calculateBM25Score(text: string, keywords: string[], k1 = 1.5, b = 0.75): number {
  const textLower = text.toLowerCase();
  const words = textLower.split(/\s+/);
  const docLength = words.length;
  const avgDocLength = 100; // Approximate average document length

  let score = 0;

  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    const termFreq = words.filter(w => w.includes(keywordLower)).length;

    if (termFreq > 0) {
      const idf = Math.log((1 + 1) / (1 + termFreq)); // Simplified IDF
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
      score += idf * (numerator / denominator);
    }
  });

  return score;
}

// ============================================================================
// API ENDPOINTS (V2 - Mesh Architecture)
// ============================================================================

/**
 * NEW: Get centrality scores for all nodes
 *
 * Query params:
 *   - algorithm: 'pagerank' | 'eigenvector' (default: pagerank)
 *
 * Returns: { algorithm, centrality{}, node_count, edge_count }
 */
app.get('/api/v2/centrality', (req, res) => {
  try {
    const algorithm = (req.query.algorithm as string) || 'pagerank';

    if (!['pagerank', 'eigenvector'].includes(algorithm)) {
      return res.status(400).json({
        error: 'Invalid algorithm. Use "pagerank" or "eigenvector"'
      });
    }

    const graph = buildGraphFromDatabase();

    let centrality: Map<string, number>;
    if (algorithm === 'pagerank') {
      centrality = calculatePageRank(graph);
    } else {
      centrality = calculateEigenvectorCentrality(graph);
    }

    res.json({
      algorithm,
      centrality: Object.fromEntries(centrality),
      node_count: graph.nodes.length,
      edge_count: graph.edges.length
    });
  } catch (error: any) {
    console.error('Error calculating centrality:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * NEW: Get shortest path between two nodes
 *
 * Query params:
 *   - from: source node name
 *   - to: target node name
 *
 * Returns: { from, to, path[], distance } or 404 if no path
 */
app.get('/api/v2/shortest-path', (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Missing required parameters: from, to'
      });
    }

    const graph = buildGraphFromDatabase();
    const result = calculateShortestPath(graph, from, to);

    if (!result) {
      return res.status(404).json({
        error: `No path found between "${from}" and "${to}"`,
        from,
        to
      });
    }

    res.json({
      from,
      to,
      path: result.path,
      distance: result.distance
    });
  } catch (error: any) {
    console.error('Error calculating shortest path:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * NEW: Get connected components
 *
 * Returns: { components: { node: componentId }, component_count }
 */
app.get('/api/v2/components', (req, res) => {
  try {
    const graph = buildGraphFromDatabase();
    const components = findConnectedComponents(graph);

    const componentCount = new Set(components.values()).size;

    res.json({
      components: Object.fromEntries(components),
      component_count: componentCount,
      node_count: graph.nodes.length
    });
  } catch (error: any) {
    console.error('Error finding connected components:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// API ENDPOINTS (V1 - Original, Domain-Agnostic)
// ============================================================================

/**
 * Get all actors (nodes) with alias resolution
 */
app.get('/api/actors', (req, res) => {
  try {
    const actors = db.prepare(`
      SELECT DISTINCT
        COALESCE(ea.canonical_name, rt.actor) as name,
        COUNT(*) as connection_count
      FROM rdf_triples rt
      LEFT JOIN entity_aliases ea ON rt.actor = ea.original_name
      GROUP BY name
      ORDER BY connection_count DESC
    `).all();

    res.json(actors);
  } catch (error: any) {
    console.error('Error fetching actors:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get relationships with filtering and pruning
 *
 * Query params:
 *   - limit: max edges (default: 500)
 *   - yearMin, yearMax: date range filter
 *   - keywords: comma-separated search terms
 *   - clusters: comma-separated cluster IDs
 */
app.get('/api/relationships', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 5000);
    const yearMin = req.query.yearMin ? parseInt(req.query.yearMin as string) : null;
    const yearMax = req.query.yearMax ? parseInt(req.query.yearMax as string) : null;
    const keywords = req.query.keywords
      ? (req.query.keywords as string).split(',').map(k => k.trim()).filter(Boolean)
      : [];
    const clusterIds = req.query.clusters
      ? (req.query.clusters as string).split(',').map(c => c.trim()).filter(Boolean)
      : [];

    // Build base query with alias resolution
    let query = `
      SELECT
        COALESCE(ea1.canonical_name, rt.actor) as actor,
        rt.action,
        COALESCE(ea2.canonical_name, rt.target) as target,
        rt.doc_id,
        rt.timestamp,
        rt.location,
        rt.triple_tags,
        rt.top_cluster_ids
      FROM rdf_triples rt
      LEFT JOIN entity_aliases ea1 ON rt.actor = ea1.original_name
      LEFT JOIN entity_aliases ea2 ON rt.target = ea2.original_name
      WHERE 1=1
    `;

    const params: any = {};

    // Date range filter
    if (yearMin !== null && yearMax !== null) {
      query += ` AND rt.timestamp BETWEEN @yearMin AND @yearMax`;
      params.yearMin = `${yearMin}-01-01`;
      params.yearMax = `${yearMax}-12-31`;
    }

    // Cluster filter
    if (clusterIds.length > 0) {
      const clusterConditions = clusterIds.map((_, i) => `rt.top_cluster_ids LIKE @cluster${i}`);
      query += ` AND (${clusterConditions.join(' OR ')})`;
      clusterIds.forEach((id, i) => {
        params[`cluster${i}`] = `%"${id}"%`;
      });
    }

    let filteredRelationships = db.prepare(query).all(params) as any[];

    // Filter by keywords using BM25 if specified
    if (keywords.length > 0) {
      filteredRelationships = filteredRelationships.filter(rel => {
        const searchText = `${rel.actor} ${rel.action} ${rel.target} ${rel.location || ''}`;
        const score = calculateBM25Score(searchText, keywords);
        return score > 0;
      });
    }

    // Deduplicate edges and calculate density for pruning
    const edgeMap = new Map<string, any[]>();

    filteredRelationships.forEach(rel => {
      const edgeKey = `${rel.actor}|||${rel.target}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, []);
      }
      edgeMap.get(edgeKey)!.push(rel);
    });

    const uniqueEdges = Array.from(edgeMap.entries()).map(([key, rels]) => ({
      edgeKey: key,
      relationships: rels,
      representative: rels[0]
    }));

    // Calculate node degrees
    const nodeDegrees = new Map<string, number>();
    uniqueEdges.forEach(edge => {
      const rel = edge.representative;
      nodeDegrees.set(rel.actor, (nodeDegrees.get(rel.actor) || 0) + 1);
      nodeDegrees.set(rel.target, (nodeDegrees.get(rel.target) || 0) + 1);
    });

    // Sort by density and prune
    const edgesWithDensity = uniqueEdges.map(edge => {
      const rel = edge.representative;
      const densityScore = (nodeDegrees.get(rel.actor) || 0) + (nodeDegrees.get(rel.target) || 0);
      return { ...edge, _density: densityScore };
    });

    edgesWithDensity.sort((a, b) => b._density - a._density);
    const prunedEdges = edgesWithDensity.slice(0, limit);
    const prunedRelationships = prunedEdges.flatMap(edge => edge.relationships);

    // Parse tags before sending
    const relationships = prunedRelationships.map(({ triple_tags, ...rel }) => ({
      ...rel,
      tags: triple_tags ? JSON.parse(triple_tags) : []
    }));

    res.json({
      relationships,
      total_before_pruning: filteredRelationships.length,
      total_after_pruning: relationships.length
    });
  } catch (error: any) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get statistics about the graph
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT COALESCE(ea1.canonical_name, rt.actor)) as unique_actors,
        COUNT(DISTINCT COALESCE(ea2.canonical_name, rt.target)) as unique_targets,
        COUNT(*) as total_relationships,
        COUNT(DISTINCT rt.doc_id) as total_documents,
        MIN(rt.timestamp) as earliest_date,
        MAX(rt.timestamp) as latest_date
      FROM rdf_triples rt
      LEFT JOIN entity_aliases ea1 ON rt.actor = ea1.original_name
      LEFT JOIN entity_aliases ea2 ON rt.target = ea2.original_name
    `).get();

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tag clusters
 */
app.get('/api/tag-clusters', (req, res) => {
  try {
    res.json({ clusters: tagClusters });
  } catch (error: any) {
    console.error('Error fetching tag clusters:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: DB_PATH,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✓ BGIS API Server running on http://localhost:${PORT}`);
  console.log(`✓ Database: ${DB_PATH}`);
  console.log(`✓ API Endpoints:`);
  console.log(`  - GET /api/v2/centrality?algorithm=pagerank`);
  console.log(`  - GET /api/v2/shortest-path?from=A&to=B`);
  console.log(`  - GET /api/v2/components`);
  console.log(`  - GET /api/actors`);
  console.log(`  - GET /api/relationships`);
  console.log(`  - GET /api/stats`);
  console.log(`  - GET /api/tag-clusters`);
  console.log(`  - GET /health\n`);
});
