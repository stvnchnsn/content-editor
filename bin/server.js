import { createServer } from 'node:http';
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const cwd = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const EXTENSION_SETS = {
  markdown: new Set(['.md', '.markdown', '.mdx', '.txt']),
  json: new Set(['.json']),
  csv: new Set(['.csv', '.tsv']),
};

function listFiles(dir, type) {
  const extensions = EXTENSION_SETS[type] || EXTENSION_SETS.markdown;
  try {
    return readdirSync(dir)
      .filter((f) => {
        try {
          return statSync(join(dir, f)).isFile() && extensions.has(extname(f).toLowerCase());
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    return [];
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

function serveStatic(res, urlPath) {
  let filePath = join(distDir, urlPath === '/' ? 'index.html' : urlPath);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    // SPA fallback
    filePath = join(distDir, 'index.html');
  }

  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function handleApi(req, res, url) {
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/api/cwd' && req.method === 'GET') {
    const type = url.searchParams.get('type') || 'markdown';
    const files = listFiles(cwd, type);
    res.writeHead(200);
    res.end(JSON.stringify({ cwd, files }));
    return;
  }

  if (url.pathname === '/api/file' && req.method === 'GET') {
    const filePath = url.searchParams.get('path');
    if (!filePath) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing path parameter' }));
      return;
    }
    const fullPath = resolve(cwd, filePath);
    // Security: ensure path stays within cwd
    if (!fullPath.startsWith(cwd)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Path outside working directory' }));
      return;
    }
    try {
      const content = readFileSync(fullPath, 'utf-8');
      res.writeHead(200);
      res.end(JSON.stringify({ name: filePath, content }));
    } catch {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'File not found' }));
    }
    return;
  }

  if (url.pathname === '/api/file' && req.method === 'POST') {
    const filePath = url.searchParams.get('path');
    if (!filePath) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing path parameter' }));
      return;
    }
    const fullPath = resolve(cwd, filePath);
    if (!fullPath.startsWith(cwd)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Path outside working directory' }));
      return;
    }
    readBody(req).then((body) => {
      try {
        writeFileSync(fullPath, body, 'utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Unknown API endpoint' }));
}

export function startServer({
  port = 4000,
  fileArg = '',
  mode = '',
  theme = '',
  title = 'Code Editor',
} = {}) {
  // Verify dist exists
  if (!existsSync(distDir)) {
    console.error(
      'Error: dist/ not found. Run "npm run build" in the content-editor directory first.',
    );
    process.exit(1);
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url);
    } else {
      serveStatic(res, url.pathname);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer({ port: port + 1, fileArg, mode, theme, title });
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    const params = new URLSearchParams();
    if (fileArg) params.set('file', fileArg);
    if (mode) params.set('mode', mode);
    if (theme) params.set('theme', theme);
    const query = params.toString() ? `?${params.toString()}` : '';
    const url = `http://localhost:${port}${query}`;

    console.log(`${title} running at ${url}`);
    console.log(`Working directory: ${cwd}`);
    console.log('Press Ctrl+C to stop\n');

    // Open in default browser
    const platform = process.platform;
    const cmd =
      platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${url}"`);
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close();
    process.exit(0);
  });
}
