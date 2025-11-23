export interface Relationship {
  actor: string;
  action: string;
  target: string;
  doc_id?: string;
  timestamp?: string;
  location?: string;
  tags?: string[];
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  val: number; // Connection count
  centrality?: number; // PageRank or Eigenvector score
  color: string;
  baseColor?: string;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  action?: string;
  location?: string;
  timestamp?: string;
  count?: number;
}

export interface CentralityResponse {
  algorithm: 'pagerank' | 'eigenvector';
  centrality: Record<string, number>;
  node_count: number;
  edge_count: number;
}

export interface DomainConfig {
  domain: string;
  version: string;
  visualization: {
    mode: 'mesh' | 'radial';
    colorScheme: 'centrality' | 'distance' | 'category' | 'custom';
    centralEntities: string[];
    defaultAlgorithm?: 'pagerank' | 'eigenvector';
  };
}
