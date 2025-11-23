/**
 * Unit tests for graph algorithms
 *
 * Tests PageRank, Eigenvector centrality, shortest path, and connected components
 * using known test graphs (Karate Club, small examples)
 */

import {
  calculatePageRank,
  calculateEigenvectorCentrality,
  calculateShortestPath,
  findConnectedComponents,
  type Graph,
} from '../src/algorithms/graph_algorithms.js';

describe('Graph Algorithms', () => {
  describe('calculatePageRank', () => {
    it('should return empty map for empty graph', () => {
      const graph: Graph = { nodes: [], edges: [] };
      const result = calculatePageRank(graph);
      expect(result.size).toBe(0);
    });

    it('should handle single node', () => {
      const graph: Graph = {
        nodes: ['A'],
        edges: [],
      };
      const result = calculatePageRank(graph);
      // Single node has base rank (no variation to normalize)
      expect(result.get('A')).toBeGreaterThan(0);
      expect(result.get('A')).toBeLessThan(1);
    });

    it('should calculate correct ranks for simple chain', () => {
      // A -> B -> C (linear chain)
      const graph: Graph = {
        nodes: ['A', 'B', 'C'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
        ],
      };
      const result = calculatePageRank(graph);

      // C should have highest rank (pointed to by B)
      // A should have lowest rank (no incoming edges)
      expect(result.get('C')! > result.get('B')!).toBe(true);
      expect(result.get('B')! > result.get('A')!).toBe(true);

      // Scores should be normalized between 0 and 1
      for (const score of result.values()) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it('should handle cyclic graphs', () => {
      // A -> B -> C -> A (cycle)
      const graph: Graph = {
        nodes: ['A', 'B', 'C'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'C', target: 'A' },
        ],
      };
      const result = calculatePageRank(graph);

      // All nodes should have similar ranks (symmetric cycle)
      const ranks = Array.from(result.values());
      const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
      for (const rank of ranks) {
        expect(Math.abs(rank - avg)).toBeLessThan(0.2);
      }
    });

    it('should identify hub nodes with high PageRank', () => {
      // Hub topology: B is central hub
      // A -> B, C -> B, D -> B
      const graph: Graph = {
        nodes: ['A', 'B', 'C', 'D'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'C', target: 'B' },
          { source: 'D', target: 'B' },
        ],
      };
      const result = calculatePageRank(graph);

      // B (hub) should have highest rank
      const bRank = result.get('B')!;
      expect(result.get('A')!).toBeLessThan(bRank);
      expect(result.get('C')!).toBeLessThan(bRank);
      expect(result.get('D')!).toBeLessThan(bRank);
    });

    it('should handle disconnected components', () => {
      // Two disconnected pairs: A -> B, C -> D
      const graph: Graph = {
        nodes: ['A', 'B', 'C', 'D'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'C', target: 'D' },
        ],
      };
      const result = calculatePageRank(graph);

      // Each component should have similar internal structure
      expect(Math.abs(result.get('B')! - result.get('D')!)).toBeLessThan(0.1);
      expect(Math.abs(result.get('A')! - result.get('C')!)).toBeLessThan(0.1);
    });
  });

  describe('calculateEigenvectorCentrality', () => {
    it('should return empty map for empty graph', () => {
      const graph: Graph = { nodes: [], edges: [] };
      const result = calculateEigenvectorCentrality(graph);
      expect(result.size).toBe(0);
    });

    it('should handle single node', () => {
      const graph: Graph = {
        nodes: ['A'],
        edges: [],
      };
      const result = calculateEigenvectorCentrality(graph);
      expect(result.get('A')).toBe(0);
    });

    it('should calculate centrality for simple graph', () => {
      // Undirected: A-B-C
      const graph: Graph = {
        nodes: ['A', 'B', 'C'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
        ],
      };
      const result = calculateEigenvectorCentrality(graph);

      // B (center) should have higher centrality than endpoints
      expect(result.get('B')! >= result.get('A')!).toBe(true);
      expect(result.get('B')! >= result.get('C')!).toBe(true);

      // Normalized 0-1
      for (const score of result.values()) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it('should identify central nodes in star topology', () => {
      // Star: B is center, A-B, C-B, D-B
      const graph: Graph = {
        nodes: ['A', 'B', 'C', 'D'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'B', target: 'D' },
        ],
      };
      const result = calculateEigenvectorCentrality(graph);

      // B should have highest centrality
      const bCentrality = result.get('B')!;
      expect(result.get('A')!).toBeLessThan(bCentrality);
      expect(result.get('C')!).toBeLessThan(bCentrality);
      expect(result.get('D')!).toBeLessThan(bCentrality);
    });
  });

  describe('calculateShortestPath', () => {
    const graph: Graph = {
      nodes: ['A', 'B', 'C', 'D', 'E'],
      edges: [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'D' },
        { source: 'A', target: 'E' },
        { source: 'E', target: 'D' },
      ],
    };

    it('should return null for empty graph', () => {
      const emptyGraph: Graph = { nodes: [], edges: [] };
      const result = calculateShortestPath(emptyGraph, 'A', 'B');
      expect(result).toBeNull();
    });

    it('should return null for non-existent nodes', () => {
      const result = calculateShortestPath(graph, 'A', 'Z');
      expect(result).toBeNull();
    });

    it('should handle same source and target', () => {
      const result = calculateShortestPath(graph, 'A', 'A');
      expect(result).toEqual({ path: ['A'], distance: 0 });
    });

    it('should find direct path', () => {
      const result = calculateShortestPath(graph, 'A', 'B');
      expect(result).toEqual({
        path: ['A', 'B'],
        distance: 1,
      });
    });

    it('should find shortest path among multiple routes', () => {
      // Two routes: A-B-C-D (3 hops) vs A-E-D (2 hops)
      const result = calculateShortestPath(graph, 'A', 'D');
      expect(result?.distance).toBe(2);
      expect(result?.path).toEqual(['A', 'E', 'D']);
    });

    it('should return null when no path exists', () => {
      // Disconnected graph
      const disconnected: Graph = {
        nodes: ['A', 'B', 'C', 'D'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'C', target: 'D' },
        ],
      };
      const result = calculateShortestPath(disconnected, 'A', 'D');
      expect(result).toBeNull();
    });

    it('should handle bidirectional edges correctly', () => {
      const result = calculateShortestPath(graph, 'D', 'A');
      expect(result?.distance).toBe(2);
      expect(result?.path.length).toBe(3);
      expect(result?.path[0]).toBe('D');
      expect(result?.path[result.path.length - 1]).toBe('A');
    });
  });

  describe('findConnectedComponents', () => {
    it('should return empty map for empty graph', () => {
      const graph: Graph = { nodes: [], edges: [] };
      const result = findConnectedComponents(graph);
      expect(result.size).toBe(0);
    });

    it('should handle single node', () => {
      const graph: Graph = {
        nodes: ['A'],
        edges: [],
      };
      const result = findConnectedComponents(graph);
      expect(result.get('A')).toBe(0);
    });

    it('should identify single connected component', () => {
      const graph: Graph = {
        nodes: ['A', 'B', 'C'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
        ],
      };
      const result = findConnectedComponents(graph);

      // All nodes should be in same component
      const componentIds = new Set(result.values());
      expect(componentIds.size).toBe(1);
    });

    it('should identify multiple disconnected components', () => {
      const graph: Graph = {
        nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'D', target: 'E' },
        ],
      };
      // Components: {A,B,C}, {D,E}, {F}
      const result = findConnectedComponents(graph);

      // Should have 3 components
      const componentIds = new Set(result.values());
      expect(componentIds.size).toBe(3);

      // Nodes in same component should have same ID
      expect(result.get('A')).toBe(result.get('B'));
      expect(result.get('B')).toBe(result.get('C'));
      expect(result.get('D')).toBe(result.get('E'));

      // Nodes in different components should have different IDs
      expect(result.get('A')).not.toBe(result.get('D'));
      expect(result.get('A')).not.toBe(result.get('F'));
      expect(result.get('D')).not.toBe(result.get('F'));
    });

    it('should handle isolated nodes', () => {
      const graph: Graph = {
        nodes: ['A', 'B', 'C'],
        edges: [],
      };
      const result = findConnectedComponents(graph);

      // Each isolated node is its own component
      const componentIds = new Set(result.values());
      expect(componentIds.size).toBe(3);
    });
  });
});
