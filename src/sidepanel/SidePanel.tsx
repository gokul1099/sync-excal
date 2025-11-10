import React, { useEffect, useState } from 'react';
import {
  Search,
  Trash2,
  Clock,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { sendToBackground } from '@/lib/utils/messaging';
import type { DiagramMetadata } from '@/types/diagram';
import { formatDistanceToNow } from 'date-fns';

export const SidePanel: React.FC = () => {
  const [diagrams, setDiagrams] = useState<DiagramMetadata[]>([]);
  const [filteredDiagrams, setFilteredDiagrams] = useState<DiagramMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDiagrams();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = diagrams.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDiagrams(filtered);
    } else {
      setFilteredDiagrams(diagrams);
    }
  }, [searchQuery, diagrams]);

  const loadDiagrams = async () => {
    try {
      const response = await sendToBackground<{ diagrams: DiagramMetadata[] }>('GET_DIAGRAMS');
      if (response?.diagrams) {
        setDiagrams(response.diagrams);
      }
    } catch (error) {
      console.error('Error loading diagrams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await sendToBackground('SYNC_NOW');
    await loadDiagrams();
    setRefreshing(false);
  };

  const handleDelete = async (diagramId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await sendToBackground('DIAGRAM_DELETED', { diagramId });
      setDiagrams(diagrams.filter((d) => d.id !== diagramId));
    } catch (error) {
      console.error('Error deleting diagram:', error);
      alert('Failed to delete diagram');
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getSyncStatusBadge = (diagram: DiagramMetadata) => {
    if (diagram.isSyncing) {
      return <span className="badge badge-info">Syncing...</span>;
    }
    if (diagram.conflictStatus === 'conflict') {
      return <span className="badge badge-error">Conflict</span>;
    }
    if (diagram.lastSynced) {
      return <span className="badge badge-success">Synced</span>;
    }
    return <span className="badge badge-warning">Pending</span>;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-brand-500 animate-spin" />
          <p className="text-gray-600">Loading diagrams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-bold mb-3">My Diagrams</h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search diagrams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <Button
            onClick={handleRefresh}
            isLoading={refreshing}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredDiagrams.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-2">
              {searchQuery ? 'No diagrams found' : 'No diagrams yet'}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? 'Try a different search term'
                : 'Start drawing on Excalidraw to sync your diagrams'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDiagrams.map((diagram) => (
              <Card key={diagram.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{diagram.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getSyncStatusBadge(diagram)}
                      <span className="text-xs text-gray-500">{formatSize(diagram.size)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(diagram.id, diagram.name)}
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                    title="Delete diagram"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {diagram.conflictStatus === 'conflict' && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800 mb-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      This diagram has a conflict. Open options to resolve it.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {diagram.lastSynced
                        ? `Synced ${formatDistanceToNow(diagram.lastSynced, { addSuffix: true })}`
                        : 'Not synced'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-t p-4 text-xs text-gray-500 text-center">
        {filteredDiagrams.length} of {diagrams.length} diagrams
      </div>
    </div>
  );
};
