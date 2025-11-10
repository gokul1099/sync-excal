import type { DiagramMetadata } from './diagram';
import type { SyncState } from './sync';

export type MessageType =
  | 'DIAGRAM_CHANGED'
  | 'SYNC_NOW'
  | 'GET_SYNC_STATUS'
  | 'SYNC_STATUS_UPDATE'
  | 'AUTH_STATE_CHANGED'
  | 'DIAGRAM_DELETED'
  | 'DIAGRAM_UPDATED'
  | 'GET_DIAGRAMS'
  | 'DIAGRAMS_LIST';

export interface Message<T = any> {
  type: MessageType;
  payload?: T;
  timestamp: number;
}

export interface DiagramChangedMessage {
  diagramId: string;
  data: any;
  url: string;
}

export interface SyncStatusMessage {
  status: SyncState;
}

export interface DiagramsListMessage {
  diagrams: DiagramMetadata[];
}

// Helper to create typed messages
export function createMessage<T>(type: MessageType, payload?: T): Message<T> {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}
