import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const vendorDir = resolve(rootDir, 'public', 'vendor');

mkdirSync(vendorDir, { recursive: true });

cpSync(
  resolve(rootDir, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js'),
  resolve(vendorDir, 'jspdf.umd.min.js'),
);

cpSync(
  resolve(rootDir, 'node_modules', 'jspdf-autotable', 'dist', 'jspdf.plugin.autotable.min.js'),
  resolve(vendorDir, 'jspdf.plugin.autotable.min.js'),
);
