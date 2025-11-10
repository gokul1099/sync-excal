import React, { useEffect, useState } from 'react';
import { Cloud, RefreshCw, Settings, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { sendToBackground } from '@/lib/utils/messaging';
import { isAuthenticated } from '@/lib/supabase/client';
import type { SyncState } from '@/types/sync';

export const Popup: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [diagramCount, setDiagramCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const auth = await isAuthenticated();
      setAuthenticated(auth);

      if (auth) {
        const status = await sendToBackground<SyncState>('GET_SYNC_STATUS');
        setSyncState(status || null);

        const diagrams = await sendToBackground<{ diagrams: any[] }>('GET_DIAGRAMS');
        setDiagramCount(diagrams?.diagrams.length || 0);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await sendToBackground('SYNC_NOW');
      await loadStatus();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const openSidePanel = async () => {
    // Side panel API may not be available in all browsers
    if (chrome.sidePanel && chrome.sidePanel.open) {
      try {
        // Get current window to open side panel
        const window = await chrome.windows.getCurrent();
        if (window.id) {
          await chrome.sidePanel.open({ windowId: window.id });
        } else {
          throw new Error('No window ID');
        }
      } catch (error) {
        // Fallback: open side panel page in new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('src/sidepanel/index.html') });
      }
    } else {
      // Fallback: open side panel page in new tab
      chrome.tabs.create({ url: chrome.runtime.getURL('src/sidepanel/index.html') });
    }
  };

  if (!authenticated) {
    return (
      <div className="w-80 p-4">
        <div className="text-center">
          <Cloud className="w-16 h-16 mx-auto mb-4 text-brand-500" />
          <h1 className="text-xl font-bold mb-2">Excalidraw Sync</h1>
          <p className="text-gray-600 mb-4">Sign in to start syncing your diagrams</p>
          <Button onClick={openOptions} className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const getSyncIcon = () => {
    if (!syncState) return <AlertCircle className="w-5 h-5 text-gray-400" />;

    switch (syncState.status) {
      case 'synced':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSyncStatusText = () => {
    if (!syncState) return 'Unknown';

    switch (syncState.status) {
      case 'synced':
        return 'All synced';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync error';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="w-80 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Cloud className="w-6 h-6 text-brand-500" />
          Excalidraw Sync
        </h1>
        <button
          onClick={openOptions}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Sync Status</span>
          {getSyncIcon()}
        </div>
        <p className="text-lg font-semibold mb-2">{getSyncStatusText()}</p>
        {syncState?.lastSync && (
          <p className="text-xs text-gray-500">
            Last sync: {new Date(syncState.lastSync).toLocaleTimeString()}
          </p>
        )}
        {syncState?.queueLength ? (
          <p className="text-xs text-yellow-600 mt-1">
            {syncState.queueLength} items in queue
          </p>
        ) : null}
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">Diagrams</span>
        </div>
        <p className="text-2xl font-bold">{diagramCount}</p>
        <p className="text-xs text-gray-500">Total synced diagrams</p>
      </Card>

      <div className="space-y-2">
        <Button
          onClick={handleSync}
          isLoading={isSyncing}
          disabled={isSyncing}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Now
        </Button>

        <Button onClick={openSidePanel} variant="secondary" className="w-full">
          <Database className="w-4 h-4 mr-2" />
          Browse Diagrams
        </Button>
      </div>

      <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
        v1.0.0 • Powered by Supabase
      </div>
    </div>
  );
};
