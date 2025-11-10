// Excalidraw diagram types based on official schema
export interface ExcalidrawElement {
  id: string;
  type: 'rectangle' | 'diamond' | 'ellipse' | 'arrow' | 'line' | 'freedraw' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'hachure' | 'cross-hatch' | 'solid';
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: number;
  opacity: number;
  groupIds: string[];
  roundness: { type: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: any[] | null;
  updated: number;
  link: string | null;
  locked: boolean;
  [key: string]: any;
}

export interface ExcalidrawFile {
  mimeType: string;
  id: string;
  dataURL: string;
  created: number;
  lastRetrieved?: number;
}

export interface ExcalidrawAppState {
  gridSize: number | null;
  viewBackgroundColor: string;
  [key: string]: any;
}

export interface ExcalidrawData {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: ExcalidrawAppState;
  files?: Record<string, ExcalidrawFile>;
}

export interface DiagramMetadata {
  id: string;
  name: string;
  hash: string;
  localTimestamp: number;
  cloudTimestamp: number | null;
  cloudId: string | null;
  lastSynced: number | null;
  isSyncing: boolean;
  conflictStatus: 'none' | 'conflict' | 'resolved';
  deviceId: string;
  size: number; // bytes
}

export interface Diagram extends DiagramMetadata {
  data: ExcalidrawData;
}

export interface ConflictDiagram {
  local: Diagram;
  cloud: Diagram;
  detectedAt: number;
}
