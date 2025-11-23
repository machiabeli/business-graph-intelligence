/**
 * NetworkGraph Component - BGIS Mesh Architecture
 *
 * Key Changes from Radial (Epstein) Architecture:
 * - ❌ Removed: EPSTEIN_NAME constant and BFS from single root
 * - ✅ Added: Centrality scores (PageRank/Eigenvector) from API
 * - ❌ Removed: Color by distance from center
 * - ✅ Added: Color by centrality score (gradient)
 * - ❌ Removed: Radial force layout
 * - ✅ Added: Force-directed layout (no center bias)
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { Relationship, GraphNode, GraphLink, CentralityResponse } from '../types';
import { fetchCentrality } from '../api';

interface NetworkGraphProps {
  relationships: Relationship[];
  selectedActor: string | null;
  onActorClick: (actorName: string) => void;
  minDensity?: number;
  algorithm?: 'pagerank' | 'eigenvector';
}

export default function NetworkGraph({
  relationships,
  selectedActor,
  onActorClick,
  minDensity = 0,
  algorithm = 'pagerank'
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [centrality, setCentrality] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Fetch centrality scores on mount and when algorithm changes
  useEffect(() => {
    let mounted = true;

    async function loadCentrality() {
      try {
        setLoading(true);
        const data = await fetchCentrality(algorithm);
        if (mounted) {
          setCentrality(data.centrality);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load centrality:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCentrality();

    return () => {
      mounted = false;
    };
  }, [algorithm]);

  // Build graph data with centrality-based coloring
  const graphData = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    // Build graph and deduplicate edges
    const edgeMap = new Map<string, GraphLink & { count: number }>();

    relationships.forEach((rel) => {
      // Add actor node
      if (!nodeMap.has(rel.actor)) {
        nodeMap.set(rel.actor, {
          id: rel.actor,
          name: rel.actor,
          val: 1,
          centrality: centrality[rel.actor] || 0,
          color: '#6b7280' // Default gray
        });
      } else {
        const node = nodeMap.get(rel.actor)!;
        node.val += 1;
      }

      // Add target node
      if (!nodeMap.has(rel.target)) {
        nodeMap.set(rel.target, {
          id: rel.target,
          name: rel.target,
          val: 1,
          centrality: centrality[rel.target] || 0,
          color: '#6b7280' // Default gray
        });
      } else {
        const node = nodeMap.get(rel.target)!;
        node.val += 1;
      }

      // Deduplicate edges
      const edgeKey = `${rel.actor}|||${rel.target}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          source: rel.actor,
          target: rel.target,
          action: rel.action,
          location: rel.location,
          timestamp: rel.timestamp,
          count: 1
        });
      } else {
        edgeMap.get(edgeKey)!.count += 1;
      }
    });

    links.push(...Array.from(edgeMap.values()));

    // Apply centrality-based coloring (mesh architecture)
    const nodes = Array.from(nodeMap.values()).map(node => {
      const centralityScore = centrality[node.id] || 0;

      // Color by centrality using viridis-like gradient
      // Purple (low centrality) → Yellow (high centrality)
      let color: string;
      if (centralityScore > 0.7) {
        color = '#fde047'; // Yellow - high centrality
      } else if (centralityScore > 0.5) {
        color = '#a3e635'; // Lime - medium-high
      } else if (centralityScore > 0.3) {
        color = '#10b981'; // Green - medium
      } else if (centralityScore > 0.1) {
        color = '#3b82f6'; // Blue - medium-low
      } else {
        color = '#8b5cf6'; // Purple - low centrality
      }

      return {
        ...node,
        centrality: centralityScore,
        color,
        baseColor: color
      };
    });

    return { nodes, links };
  }, [relationships, centrality]);

  // D3 force simulation (mesh layout - no radial bias)
  useEffect(() => {
    if (!svgRef.current || loading || graphData.nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    const g = svg.append('g');

    svg.call(zoom as any);

    // Node size scale (based on connection count)
    const minRadius = 5;
    const maxRadius = 30;
    const maxConnections = Math.max(...graphData.nodes.map(n => n.val), 1);
    const radiusScale = d3.scaleSqrt()
      .domain([1, maxConnections])
      .range([minRadius, maxRadius]);

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(graphData.nodes)
      .join('circle')
      .attr('r', d => radiusScale(d.val))
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        onActorClick(d.id);
      })
      .call(
        d3.drag<SVGCircleElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      );

    // Add labels for high-centrality nodes
    const labels = g.append('g')
      .selectAll('text')
      .data(graphData.nodes.filter(n => (n.centrality || 0) > 0.5))
      .join('text')
      .text(d => d.name)
      .attr('font-size', 12)
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('fill', '#1f2937')
      .style('pointer-events', 'none');

    // Create force simulation (MESH ARCHITECTURE - no radial force!)
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.links as any)
        .id((d: any) => d.id)
        .distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2)) // Only viewport centering
      .force('collision', d3.forceCollide().radius((d: any) => radiusScale(d.val) + 10))
      .on('tick', ticked);

    simulationRef.current = simulation;

    function ticked() {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    }

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData, loading, onActorClick]);

  // Highlight selected actor
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg.selectAll('circle')
      .attr('stroke', (d: any) => d.id === selectedActor ? '#ef4444' : '#fff')
      .attr('stroke-width', (d: any) => d.id === selectedActor ? 4 : 2);
  }, [selectedActor]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full bg-gray-50"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-gray-600">Loading centrality scores...</div>
        </div>
      )}
      <div className="absolute bottom-4 right-4 bg-white/90 p-4 rounded shadow text-xs">
        <div className="font-semibold mb-2">Centrality Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#fde047]"></div>
            <span>High (0.7+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#10b981]"></div>
            <span>Medium (0.3-0.7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#8b5cf6]"></div>
            <span>Low (&lt;0.3)</span>
          </div>
        </div>
        <div className="mt-2 text-gray-500">
          Algorithm: {algorithm}
        </div>
      </div>
    </div>
  );
}
