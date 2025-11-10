/**
 * Supabase cloud provider implementation
 */

import type { CloudProvider } from '@/types/cloud';
import type { Diagram, DiagramMetadata } from '@/types/diagram';
import { getSupabaseClient, getCurrentUser, isAuthenticated } from '@/lib/supabase/client';
import { syncLogger } from '@/lib/utils/logger';
import { getDeviceId } from '@/lib/storage/db';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class SupabaseProvider implements CloudProvider {
  private syncCallbacks: Array<(diagram: Diagram) => void> = [];
  private realtimeChannel: RealtimeChannel | null = null;

  async authenticate(): Promise<void> {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('User not authenticated');
    }
  }

  async isAuthenticated(): Promise<boolean> {
    return await isAuthenticated();
  }

  async uploadDiagram(diagram: Diagram): Promise<void> {
    const client = getSupabaseClient();
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const deviceId = await getDeviceId();

    try {
      syncLogger.info(`Uploading diagram: ${diagram.name}`);

      const { error } = await (client as any).from('diagrams').upsert(
        {
          id: diagram.id,
          user_id: user.id,
          name: diagram.name,
          data: diagram.data,
          hash: diagram.hash,
          device_id: deviceId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

      if (error) {
        throw new Error(`Failed to upload diagram: ${error.message}`);
      }

      syncLogger.info(`Successfully uploaded diagram: ${diagram.name}`);
    } catch (error) {
      syncLogger.error(`Error uploading diagram: ${error}`);
      throw error;
    }
  }

  async downloadDiagram(id: string): Promise<Diagram | null> {
    const client = getSupabaseClient();
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      syncLogger.info(`Downloading diagram: ${id}`);

      const { data, error } = await (client as any)
        .from('diagrams')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new Error(`Failed to download diagram: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      const diagram: Diagram = {
        id: data.id,
        name: data.name,
        data: data.data as any,
        hash: data.hash,
        localTimestamp: new Date(data.updated_at).getTime(),
        cloudTimestamp: new Date(data.updated_at).getTime(),
        cloudId: data.id,
        lastSynced: new Date(data.updated_at).getTime(),
        isSyncing: false,
        conflictStatus: 'none',
        deviceId: data.device_id,
        size: data.size,
      };

      syncLogger.info(`Successfully downloaded diagram: ${diagram.name}`);
      return diagram;
    } catch (error) {
      syncLogger.error(`Error downloading diagram: ${error}`);
      throw error;
    }
  }

  async listDiagrams(): Promise<DiagramMetadata[]> {
    const client = getSupabaseClient();
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      syncLogger.info('Listing all diagrams');

      const { data, error } = await (client as any)
        .from('diagrams')
        .select('id, name, hash, created_at, updated_at, device_id, size')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to list diagrams: ${error.message}`);
      }

      const diagrams: DiagramMetadata[] = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        hash: d.hash,
        localTimestamp: new Date(d.updated_at).getTime(),
        cloudTimestamp: new Date(d.updated_at).getTime(),
        cloudId: d.id,
        lastSynced: new Date(d.updated_at).getTime(),
        isSyncing: false,
        conflictStatus: 'none',
        deviceId: d.device_id,
        size: d.size,
      }));

      syncLogger.info(`Found ${diagrams.length} diagrams`);
      return diagrams;
    } catch (error) {
      syncLogger.error(`Error listing diagrams: ${error}`);
      throw error;
    }
  }

  async deleteDiagram(id: string): Promise<void> {
    const client = getSupabaseClient();
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      syncLogger.info(`Deleting diagram: ${id}`);

      const { error } = await (client as any)
        .from('diagrams')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to delete diagram: ${error.message}`);
      }

      syncLogger.info(`Successfully deleted diagram: ${id}`);
    } catch (error) {
      syncLogger.error(`Error deleting diagram: ${error}`);
      throw error;
    }
  }

  onSync(callback: (diagram: Diagram) => void): void {
    this.syncCallbacks.push(callback);

    // Set up realtime subscription if not already done
    if (!this.realtimeChannel) {
      this.setupRealtimeSync();
    }
  }

  private async setupRealtimeSync(): Promise<void> {
    const client = getSupabaseClient();
    const user = await getCurrentUser();

    if (!user) {
      syncLogger.warn('Cannot setup realtime sync: User not authenticated');
      return;
    }

    const deviceId = await getDeviceId();

    syncLogger.info('Setting up realtime sync');

    this.realtimeChannel = client
      .channel('diagrams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diagrams',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          syncLogger.info('Realtime change received:', payload.eventType);

          // Ignore changes from this device
          if (payload.new && (payload.new as any).device_id === deviceId) {
            syncLogger.debug('Ignoring change from this device');
            return;
          }

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = payload.new as any;
            const diagram: Diagram = {
              id: data.id,
              name: data.name,
              data: data.data,
              hash: data.hash,
              localTimestamp: new Date(data.updated_at).getTime(),
              cloudTimestamp: new Date(data.updated_at).getTime(),
              cloudId: data.id,
              lastSynced: new Date(data.updated_at).getTime(),
              isSyncing: false,
              conflictStatus: 'none',
              deviceId: data.device_id,
              size: data.size,
            };

            // Notify all callbacks
            this.syncCallbacks.forEach((callback) => {
              try {
                callback(diagram);
              } catch (error) {
                syncLogger.error('Error in sync callback:', error);
              }
            });
          }
        }
      )
      .subscribe();
  }

  disconnect(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    this.syncCallbacks = [];
  }
}
