#!/usr/bin/env node
/**
 * Tiny static file server for the bundled example, so `npm run demo` shows a
 * real page rendered with the freshly compiled stylesheet.
 *
 * Zero dependencies: Node's own http module is enough, and binding to 0.0.0.0
 * keeps the server reachable from a container or preview proxy.
 *
 * Usage: node scripts/serve.mjs [port] [root]
 */

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[3] ?? path.join(here, '..'));
const port = Number(process.env.PORT ?? process.argv[2] ?? 4173);
const host = process.env.HOST ?? '0.0.0.0';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
};

/** Resolves a URL path to a file inside the served root, or `undefined`. */
function resolveFile(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    const candidate = path.join(root, decoded);

    // Never serve outside the root, however the path was spelled.
    if (!candidate.startsWith(root)) return undefined;

    const stats = fs.existsSync(candidate) ? fs.statSync(candidate) : undefined;
    if (stats?.isDirectory()) {
        const index = path.join(candidate, 'index.html');
        return fs.existsSync(index) ? index : undefined;
    }

    return stats?.isFile() ? candidate : undefined;
}

const server = http.createServer((request, response) => {
    const urlPath = request.url ?? '/';
    const file = resolveFile(urlPath === '/' ? '/examples/index.html' : urlPath);

    if (file === undefined) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end(`404 Not Found — try ${path.relative(root, path.join(root, 'examples', 'index.html'))}\n`);
        return;
    }

    response.writeHead(200, {
        'content-type': MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store'
    });
    fs.createReadStream(file).pipe(response);
});

server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Pass another one: node scripts/serve.mjs 5000`);
        process.exitCode = 1;
        return;
    }
    throw error;
});

server.listen(port, host, () => {
    console.log(`StratumSS example running at http://localhost:${port}/ (serving ${root})`);
    console.log('Press Ctrl+C to stop.');
});
