/**
 * Crypto utilities for hashing and encryption
 */

/**
 * Calculate SHA-256 hash of data
 */
export async function calculateHash(data: any): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate a unique device ID
 */
export async function generateDeviceId(): Promise<string> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hexString = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `device_${hexString}`;
}

/**
 * Compare two hashes for equality
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}
