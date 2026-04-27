#!/usr/bin/env node

import { startServer } from './server.js';
import { extname } from 'node:path';

const args = process.argv.slice(2);
const nightMode = args.includes('--night') || args.includes('--dark') || args.includes('-n');
const fileArg = args.find((arg) => !arg.startsWith('-')) || '';

// Auto-detect mode from file extension
const ext = extname(fileArg).toLowerCase();
const EXTENSION_TO_MODE = {
  '.md': 'markdown', '.markdown': 'markdown', '.mdx': 'markdown', '.txt': 'markdown',
  '.csv': 'csv', '.tsv': 'csv',
};
const mode = EXTENSION_TO_MODE[ext] || '';

startServer({
  port: 4000,
  fileArg,
  mode,
  theme: nightMode ? 'dark' : '',
  title: 'Content Editor',
});
