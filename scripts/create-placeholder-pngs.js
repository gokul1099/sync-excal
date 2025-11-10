/**
 * Create placeholder PNG icons (base64 encoded simple PNGs)
 * These are minimal valid PNG files for development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '../public/assets/icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Simple blue square PNG (1x1 pixel, will be scaled by browser)
// This is a valid PNG file in base64
const base64PNG = {
  16: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAA5SURBVDiNY2AYBaNgFIyCYQ5AwIj/xGCQmiG7ARooYPx/YsHINgMZDNk/qOYF0mFANZdQ3QsYBgEAJzgLJOqnvicAAAAASUVORK5CYII=',
  32: 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAsAAAALAAp+I8nAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAB5SURBVFiF7dc9CsJAFATgbxMEwU6wsBXrFLZ2XkEvYOkF9AZ6gpzAI3gDK0HEQlKIf4WFhZWFGxjYhd03M7tTJEmS/okGuGGP9pdtO+CLZdRg12KfR4/1Bft6+LcBPtjkUV9wqLpwxbyI+obzr5PuuOJQRH3H5RfJH/IAeOAXOdZKd0wAAAAASUVORK5CYII=',
  48: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAB/AAAAfwBamSLlgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACbSURBVGiB7dmxCYBAEATAe0UQbEPBVqykt7H0Bp7ewMYLrMFGfEEQBMUv+BkYWNiZXZIkSf+0Bm7giV3WbXvgjnVU49hhnXWP3YB/Lb7uC45Fl3XFsYn6jtMvA+64NFHfcP5lcMelifqKy68Dd1yaqC+4/jpwx6WJ+oLrrwN3XJqoz7j9OnDHpYn6hNuvA3dcmqiPuA2QJOn/vQGTxRsM8Nck0gAAAABJRU5ErkJggg==',
  128: 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsAAAA7ABT+PnCQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAHPSURBVHic7doxSgRBFEXR36OgoKCgYGCgYGCgYODCXJiLcgcuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAW4ABfgAlyAC3ABLsAFuAAX4AJcgAtwAS7ABbgAF+ACXIALcAEuwAX8AQoMG0EjFp3rAAAAAElFTkSuQmCC'
};

const sizes = [16, 32, 48, 128];

sizes.forEach((size) => {
  const buffer = Buffer.from(base64PNG[size], 'base64');
  const outputPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Created icon-${size}.png`);
});

console.log('\n✨ Placeholder PNG icons created!');
console.log('\n⚠️  Note: These are minimal placeholder icons.');
console.log('For better quality icons, convert the SVG files to PNG using:');
console.log('  - ImageMagick: brew install imagemagick');
console.log('  - Online: https://cloudconvert.com/svg-to-png');
console.log('  - Inkscape: Export SVG as PNG\n');
