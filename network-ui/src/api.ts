import type { Relationship, CentralityResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Fetch relationships from API
 */
export async function fetchRelationships(params: {
  limit?: number;
  yearMin?: number;
  yearMax?: number;
  keywords?: string[];
  clusters?: string[];
} = {}): Promise<Relationship[]> {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.yearMin) queryParams.set('yearMin', params.yearMin.toString());
  if (params.yearMax) queryParams.set('yearMax', params.yearMax.toString());
  if (params.keywords?.length) queryParams.set('keywords', params.keywords.join(','));
  if (params.clusters?.length) queryParams.set('clusters', params.clusters.join(','));

  const response = await fetch(`${API_BASE_URL}/api/relationships?${queryParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch relationships: ${response.statusText}`);
  }

  const data = await response.json();
  return data.relationships || [];
}

/**
 * NEW: Fetch centrality scores from V2 API
 */
export async function fetchCentrality(
  algorithm: 'pagerank' | 'eigenvector' = 'pagerank'
): Promise<CentralityResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v2/centrality?algorithm=${algorithm}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch centrality: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch graph statistics
 */
export async function fetchStats(): Promise<{
  unique_actors: number;
  unique_targets: number;
  total_relationships: number;
  total_documents: number;
  earliest_date: string;
  latest_date: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  return response.json();
}
