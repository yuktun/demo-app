const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8000;
const REMOTE_ORIGIN = 'https://pokebonk.com/';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const localPath = path.join(__dirname, pathname.replace(/^\/+/, ''));

  // Check if file exists locally
  if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
    const ext = path.extname(localPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(localPath);

    // Support range requests for audio files
    const range = req.headers.range;
    if (range && (ext === '.ogg' || ext === '.mp3')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = (end - start) + 1;
      const stream = fs.createReadStream(localPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      stream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(localPath).pipe(res);
    return;
  }

  // Not found locally: Auto-proxy & cache from pokebonk.com
  const remoteUrl = new URL(pathname.replace(/^\/+/, ''), REMOTE_ORIGIN).href;
  console.log(`[CACHE MISS] Fetching on-demand: ${pathname} -> ${remoteUrl}`);

  https.get(remoteUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (remoteRes) => {
    if (remoteRes.statusCode === 200) {
      const ext = path.extname(localPath).toLowerCase();
      const contentType = remoteRes.headers['content-type'] || MIME_TYPES[ext] || 'application/octet-stream';
      const chunks = [];

      remoteRes.on('data', (chunk) => chunks.push(chunk));
      remoteRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, buffer);
        console.log(`[CACHED] Saved ${pathname} (${buffer.length} bytes)`);

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': buffer.length,
        });
        res.end(buffer);
      });
    } else {
      console.log(`[404] Remote also returned ${remoteRes.statusCode} for ${pathname}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }).on('error', (err) => {
    console.error(`[FETCH ERROR] ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error fetching asset');
  });
});

server.listen(PORT, () => {
  console.log('=======================================================');
  console.log(`  PokéBonk Local Server running at http://localhost:${PORT}`);
  console.log(`  All assets served from disk with auto-caching proxy`);
  console.log(`  Press Ctrl+C to stop.`);
  console.log('=======================================================');

  if (process.argv.includes('--open')) {
    const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} http://localhost:${PORT}`);
  }
});
