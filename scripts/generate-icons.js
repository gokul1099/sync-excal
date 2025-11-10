/**
 * Generate placeholder SVG icons for the extension
 * Run with: node scripts/generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '../public/assets/icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG for each size
sizes.forEach((size) => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size / 8}" fill="#0ea5e9"/>
  <path d="M${size / 4} ${size / 2.5}L${size / 2} ${size / 4}L${(3 * size) / 4} ${size / 2.5}" stroke="white" stroke-width="${size / 16}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${size / 2}" cy="${(2 * size) / 3}" r="${size / 8}" stroke="white" stroke-width="${size / 16}" fill="none"/>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Generated icon-${size}.svg`);
});

console.log('Icons generated successfully!');
console.log('Note: Convert SVG to PNG for production using a tool like:');
console.log('  - ImageMagick: convert icon.svg -resize 128x128 icon-128.png');
console.log('  - Online converter: https://svgtopng.com/');
