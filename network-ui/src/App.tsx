import { useState, useEffect } from 'react';
import NetworkGraph from './components/NetworkGraph';
import { fetchRelationships } from './api';
import type { Relationship } from './types';

export default function App() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<'pagerank' | 'eigenvector'>('pagerank');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load relationships on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchRelationships({ limit: 500 });
        setRelationships(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Business Graph Intelligence System
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Multi-polar network analysis with {algorithm} centrality
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Algorithm:</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as 'pagerank' | 'eigenvector')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pagerank">PageRank</option>
                <option value="eigenvector">Eigenvector</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              {relationships.length} relationships loaded
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900">Loading data...</div>
              <div className="text-sm text-gray-600 mt-2">
                Fetching relationships from API
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center max-w-md">
              <div className="text-lg font-medium text-red-600">Error Loading Data</div>
              <div className="text-sm text-gray-600 mt-2">{error}</div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left text-xs">
                <div className="font-medium mb-2">Troubleshooting:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure API server is running on port 3001</li>
                  <li>Run: <code className="bg-gray-200 px-1">npm run api</code></li>
                  <li>Check database exists: <code className="bg-gray-200 px-1">document_analysis.db</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <NetworkGraph
            relationships={relationships}
            selectedActor={selectedActor}
            onActorClick={setSelectedActor}
            algorithm={algorithm}
          />
        )}
      </main>

      {/* Footer Info */}
      {selectedActor && (
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="text-sm">
            <span className="font-medium text-gray-900">Selected:</span>{' '}
            <span className="text-gray-700">{selectedActor}</span>
            <button
              onClick={() => setSelectedActor(null)}
              className="ml-4 text-blue-600 hover:text-blue-700"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
