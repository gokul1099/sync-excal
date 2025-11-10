/**
 * Data validation utilities using Zod
 */

import { z } from 'zod';

// Excalidraw element schema
export const ExcalidrawElementSchema = z.object({
  id: z.string(),
  type: z.enum([
    'rectangle',
    'diamond',
    'ellipse',
    'arrow',
    'line',
    'freedraw',
    'text',
    'image',
  ]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

// Excalidraw data schema
export const ExcalidrawDataSchema = z.object({
  type: z.literal('excalidraw'),
  version: z.number(),
  source: z.string(),
  elements: z.array(z.any()), // More flexible for now
  appState: z.record(z.any()),
  files: z.record(z.any()).optional(),
});

/**
 * Validate if data is valid Excalidraw format
 */
export function isValidExcalidrawData(data: any): boolean {
  try {
    ExcalidrawDataSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if URL is an Excalidraw page
 */
export function isExcalidrawUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === 'excalidraw.com' ||
      urlObj.hostname.endsWith('.excalidraw.com') ||
      (urlObj.hostname === 'localhost' && urlObj.port !== '')
    );
  } catch {
    return false;
  }
}

/**
 * Extract diagram ID from URL if available
 */
export function extractDiagramIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Excalidraw uses hash-based routing: https://excalidraw.com/#room=abc,key
    const hash = urlObj.hash;
    if (hash.startsWith('#json=')) {
      return null; // This is an embedded diagram
    }
    if (hash.includes('room=')) {
      const match = hash.match(/room=([^,]+)/);
      return match ? match[1] : null;
    }
    // For local diagrams, use the full hash as ID
    return hash ? hash.substring(1) : null;
  } catch {
    return null;
  }
}
