/**
 * Graph Algorithms for Business Graph Intelligence System
 *
 * Implements centrality calculations and shortest path algorithms
 * for multi-polar business network analysis (mesh topology).
 */

export interface Edge {
  source: string;
  target: string;
  weight?: number;
}

export interface Graph {
  nodes: string[];
  edges: Edge[];
}

/**
 * Calculate PageRank centrality scores for all nodes.
 *
 * @param graph - Graph with nodes and edges
 * @param dampingFactor - Probability of following links (default: 0.85)
 * @param maxIterations - Maximum iterations for convergence (default: 100)
 * @param tolerance - Convergence threshold (default: 0.0001)
 * @returns Map of node ID to PageRank score (normalized 0.0-1.0)
 */
export function calculatePageRank(
  graph: Graph,
  dampingFactor: number = 0.85,
  maxIterations: number = 100,
  tolerance: number = 0.0001
): Map<string, number> {
  const { nodes, edges } = graph;
  const N = nodes.length;

  if (N === 0) {
    return new Map();
  }

  // Initialize scores uniformly
  const scores = new Map<string, number>();
  for (const node of nodes) {
    scores.set(node, 1.0 / N);
  }

  // Build adjacency structures
  const outgoingEdges = new Map<string, string[]>();
  const incomingEdges = new Map<string, string[]>();

  for (const node of nodes) {
    outgoingEdges.set(node, []);
    incomingEdges.set(node, []);
  }

  for (const edge of edges) {
    outgoingEdges.get(edge.source)?.push(edge.target);
    incomingEdges.get(edge.target)?.push(edge.source);
  }

  // Iterative calculation
  for (let iter = 0; iter < maxIterations; iter++) {
    const newScores = new Map<string, number>();
    let maxDiff = 0;

    for (const node of nodes) {
      // Base rank from damping
      let rank = (1 - dampingFactor) / N;

      // Add contributions from incoming links
      const incoming = incomingEdges.get(node) || [];
      for (const neighbor of incoming) {
        const neighborScore = scores.get(neighbor) || 0;
        const outDegree = outgoingEdges.get(neighbor)?.length || 1;
        rank += dampingFactor * (neighborScore / outDegree);
      }

      newScores.set(node, rank);

      // Track convergence
      const diff = Math.abs(rank - (scores.get(node) || 0));
      maxDiff = Math.max(maxDiff, diff);
    }

    // Update scores
    for (const [node, score] of newScores) {
      scores.set(node, score);
    }

    // Check convergence
    if (maxDiff < tolerance) {
      break;
    }
  }

  // Normalize to 0-1 range
  const maxScore = Math.max(...scores.values());
  const minScore = Math.min(...scores.values());
  const range = maxScore - minScore;

  if (range > 0) {
    for (const [node, score] of scores) {
      scores.set(node, (score - minScore) / range);
    }
  }

  return scores;
}

/**
 * Calculate Eigenvector centrality using power iteration method.
 *
 * @param graph - Graph with nodes and edges
 * @param maxIterations - Maximum iterations (default: 100)
 * @param tolerance - Convergence threshold (default: 0.0001)
 * @returns Map of node ID to eigenvector centrality score (normalized 0.0-1.0)
 */
export function calculateEigenvectorCentrality(
  graph: Graph,
  maxIterations: number = 100,
  tolerance: number = 0.0001
): Map<string, number> {
  const { nodes, edges } = graph;
  const N = nodes.length;

  if (N === 0) {
    return new Map();
  }

  // Initialize scores uniformly
  const scores = new Map<string, number>();
  for (const node of nodes) {
    scores.set(node, 1.0 / Math.sqrt(N));
  }

  // Build adjacency map (undirected)
  const neighbors = new Map<string, string[]>();
  for (const node of nodes) {
    neighbors.set(node, []);
  }

  for (const edge of edges) {
    neighbors.get(edge.source)?.push(edge.target);
    neighbors.get(edge.target)?.push(edge.source);
  }

  // Power iteration
  for (let iter = 0; iter < maxIterations; iter++) {
    const newScores = new Map<string, number>();

    // Calculate new scores
    for (const node of nodes) {
      let sum = 0;
      const nodeNeighbors = neighbors.get(node) || [];
      for (const neighbor of nodeNeighbors) {
        sum += scores.get(neighbor) || 0;
      }
      newScores.set(node, sum);
    }

    // L2 normalization
    let normSquared = 0;
    for (const score of newScores.values()) {
      normSquared += score * score;
    }
    const norm = Math.sqrt(normSquared);

    if (norm > 0) {
      for (const [node, score] of newScores) {
        newScores.set(node, score / norm);
      }
    }

    // Check convergence
    let maxDiff = 0;
    for (const node of nodes) {
      const diff = Math.abs((newScores.get(node) || 0) - (scores.get(node) || 0));
      maxDiff = Math.max(maxDiff, diff);
    }

    // Update scores
    for (const [node, score] of newScores) {
      scores.set(node, score);
    }

    if (maxDiff < tolerance) {
      break;
    }
  }

  // Normalize to 0-1 range
  const maxScore = Math.max(...scores.values());
  const minScore = Math.min(...scores.values());
  const range = maxScore - minScore;

  if (range > 0) {
    for (const [node, score] of scores) {
      scores.set(node, (score - minScore) / range);
    }
  }

  return scores;
}

/**
 * Calculate shortest path between two nodes using BFS.
 *
 * @param graph - Graph with nodes and edges
 * @param source - Starting node
 * @param target - Destination node
 * @returns Object with path array and distance, or null if no path exists
 */
export function calculateShortestPath(
  graph: Graph,
  source: string,
  target: string
): { path: string[]; distance: number } | null {
  const { nodes, edges } = graph;

  // Validate nodes exist
  if (!nodes.includes(source) || !nodes.includes(target)) {
    return null;
  }

  if (source === target) {
    return { path: [source], distance: 0 };
  }

  // Build adjacency map (undirected)
  const neighbors = new Map<string, string[]>();
  for (const node of nodes) {
    neighbors.set(node, []);
  }

  for (const edge of edges) {
    neighbors.get(edge.source)?.push(edge.target);
    neighbors.get(edge.target)?.push(edge.source);
  }

  // BFS
  const queue: string[] = [source];
  const visited = new Set<string>([source]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === target) {
      // Reconstruct path
      const path: string[] = [];
      let node = target;
      while (node !== source) {
        path.unshift(node);
        node = parent.get(node)!;
      }
      path.unshift(source);

      return { path, distance: path.length - 1 };
    }

    const currentNeighbors = neighbors.get(current) || [];
    for (const neighbor of currentNeighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  // No path found
  return null;
}

/**
 * Identify connected components in the graph.
 *
 * @param graph - Graph with nodes and edges
 * @returns Map of node ID to component ID
 */
export function findConnectedComponents(graph: Graph): Map<string, number> {
  const { nodes, edges } = graph;
  const componentId = new Map<string, number>();

  if (nodes.length === 0) {
    return componentId;
  }

  // Build adjacency map (undirected)
  const neighbors = new Map<string, string[]>();
  for (const node of nodes) {
    neighbors.set(node, []);
  }

  for (const edge of edges) {
    neighbors.get(edge.source)?.push(edge.target);
    neighbors.get(edge.target)?.push(edge.source);
  }

  let currentComponentId = 0;
  const visited = new Set<string>();

  // BFS for each component
  for (const startNode of nodes) {
    if (visited.has(startNode)) {
      continue;
    }

    // BFS from unvisited node
    const queue: string[] = [startNode];
    visited.add(startNode);
    componentId.set(startNode, currentComponentId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentNeighbors = neighbors.get(current) || [];

      for (const neighbor of currentNeighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          componentId.set(neighbor, currentComponentId);
          queue.push(neighbor);
        }
      }
    }

    currentComponentId++;
  }

  return componentId;
}
