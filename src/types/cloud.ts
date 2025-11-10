import type { Diagram, DiagramMetadata } from './diagram';

export interface CloudDiagram {
  id: string;
  user_id: string;
  name: string;
  data: any; // JSONB in Supabase
  hash: string;
  created_at: string;
  updated_at: string;
  device_id: string;
  size: number;
}

export interface CloudProvider {
  authenticate(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  uploadDiagram(diagram: Diagram): Promise<void>;
  downloadDiagram(id: string): Promise<Diagram | null>;
  listDiagrams(): Promise<DiagramMetadata[]>;
  deleteDiagram(id: string): Promise<void>;
  onSync(callback: (diagram: Diagram) => void): void;
  disconnect(): void;
}

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  expiresAt: number | null;
}
