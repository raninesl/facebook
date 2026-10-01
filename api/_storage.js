const fs = require('fs');
const path = require('path');

const LIST_KEY = 'captured_entries_v1';

const LOCAL_FILE = process.env.STORAGE_FILE
  || path.join(process.cwd(), 'captured_data.json');

const storageDiag = {
  lastError: null,
  lastErrorAt: null,
  lastTarget: null,
  lastStatus: null,
  lastDurationMs: null,
  config: null,
  healthChecked: false,
  healthOk: false,
  healthError: null,
  healthTarget: null
};

function parseRedisUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = url.trim();
    let restEndpoint = '';
    let token = '';
    let host = '';
    if (/^rediss?:\/\//i.test(u) || /^redis:\/\/\//i.test(u)) {
      const protoEnd = u.indexOf('://') + 3;
      const pathStart = u.indexOf('/', protoEnd);
      const authAndHost = (pathStart >= 0 ? u.slice(protoEnd, pathStart) : u.slice(protoEnd)).split('?')[0];
      const atIdx = authAndHost.lastIndexOf('@');
      let userPass = '';
      let hostPort = authAndHost;
      if (atIdx >= 0) {
        userPass = decodeURIComponent(authAndHost.slice(0, atIdx));
        hostPort = authAndHost.slice(atIdx + 1);
      }
      const colon = hostPort.lastIndexOf(':');
      host = (colon >= 0 ? hostPort.slice(0, colon) : hostPort).toLowerCase();
      if (userPass) {
        const up = userPass.indexOf(':');
        token = up >= 0 ? userPass.slice(up + 1) : userPass;
      }
      if (host && token) {
        if (/\.upstash\.io$/i.test(host)) {
          restEndpoint = 'https://' + host;
        } else if (/localhost|127\.0\.0\.1/i.test(host)) {
          return null;
        } else if (host.length >= 6) {
          restEndpoint = 'https://' + host;
        }
      }
    } else if (/^https?:\/\//i.test(u)) {
      const slash = u.indexOf('/', u.indexOf('://') + 3);
      restEndpoint = (slash > 0 ? u.slice(0, slash) : u).replace(/\/$/, '');
    }
    if (restEndpoint && token) return { base: restEndpoint, token, host };
  } catch (e) {
    storageDiag.lastError = 'parseRedisUrl: ' + (e && e.message);
    storageDiag.lastErrorAt = Date.now();
    console.warn('[storage] Impossible de parser REDIS_URL', e && e.message);
  }
  return null;
}

function fetchWithTimeout(url, opts, timeoutMs = 4500) {
  const start = Date.now();
  let timeoutId = null;
  const ctrl = new AbortController();
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => ctrl.abort(new Error('Timeout ' + timeoutMs + 'ms')), timeoutMs);
  }
  const req = (typeof fetch === 'function')
    ? fetch(url, Object.assign({ signal: ctrl.signal }, opts || {}))
    : Promise.reject(new Error('fetch non disponible'));
  return req.then(
    (r) => {
      clearTimeout(timeoutId);
      storageDiag.lastDurationMs = Date.now() - start;
      return r;
    },
    (err) => {
      clearTimeout(timeoutId);
      storageDiag.lastDurationMs = Date.now() - start;
      throw err;
    }
  );
}

const kv = (() => {
  let url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  let source = 'KV_OR_UPSTASH_REST';
  if ((!url || !token) && process.env.REDIS_URL) {
    const p = parseRedisUrl(process.env.REDIS_URL);
    if (p) { url = p.base; token = p.token; source = 'REDIS_URL -> ' + (p.host || ''); }
  }
  if ((!url || !token) && process.env.KV_URL) {
    const p = parseRedisUrl(process.env.KV_URL);
    if (p) {
      url = p.base;
      token = process.env.KV_REST_TOKEN || p.token || '';
      source = 'KV_URL -> ' + (p.host || '');
    } else if (/^https?:\/\//i.test(process.env.KV_URL)) {
      const slash = process.env.KV_URL.indexOf('/', process.env.KV_URL.indexOf('://') + 3);
      url = (slash > 0 ? process.env.KV_URL.slice(0, slash) : process.env.KV_URL).replace(/\/$/, '');
      token = process.env.KV_REST_TOKEN || '';
      source = 'KV_URL https -> ' + url;
    }
  }
  if (!url || !token) return null;
  const base = url.replace(/\/$/, '');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  storageDiag.config = { basePrefix: base.slice(0, 24) + (base.length > 24 ? '...' : ''), source };
  const request = async (body) => {
    const target = base + '/';
    storageDiag.lastTarget = target;
    storageDiag.lastStatus = null;
    try {
      const res = await fetchWithTimeout(target, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }, 4500);
      storageDiag.lastStatus = res.status;
      if (!res.ok) {
        const t = await res.text();
        storageDiag.lastError = 'HTTP ' + res.status + ': ' + ((t || '').slice(0, 120));
        storageDiag.lastErrorAt = Date.now();
        return null;
      }
      const json = await res.json();
      storageDiag.lastError = null;
      return json;
    } catch (err) {
      storageDiag.lastError = (err && err.code ? err.code + ': ' : '') + (err && err.message ? err.message : String(err));
      storageDiag.lastErrorAt = Date.now();
      return null;
    }
  };
  const extractSingle = (r, alt0) => {
    if (r === null || r === undefined) return null;
    if (r && typeof r === 'object' && ('result' in r)) return r.result;
    if (alt0 !== undefined && Array.isArray(r) && r.length > 0) return r[0];
    return r;
  };
  const out = {
    source,
    base,
    async lpush(key, value) {
      const r = await request(['LPUSH', key, JSON.stringify(value)]);
      const v = extractSingle(r, true);
      return v === null || v === undefined ? null : v;
    },
    async lrange(key, start, end) {
      const r = await request(['LRANGE', key, String(start), String(end)]);
      let arr = (r && typeof r === 'object' && ('result' in r)) ? r.result : (Array.isArray(r) ? r[0] : null);
      if (!arr && Array.isArray(r)) arr = r;
      if (!arr || !Array.isArray(arr) || !arr.length) return [];
      return arr.map((x) => {
        try { return JSON.parse(x); } catch { return null; }
      }).filter(Boolean);
    },
    async del(key) {
      const r = await request(['DEL', key]);
      const v = extractSingle(r, true);
      return v === null || v === undefined ? null : v;
    },
    async ping() {
      const r = await request(['PING']);
      if (r === null) return false;
      const s = extractSingle(r, false);
      return (typeof s === 'string') ? /pong/i.test(s) : (s !== null && s !== undefined);
    }
  };
  return out;
})();

let hasKv = !!kv;
let isKvHealthy = !!kv;

async function kvHealthCheck(force = false) {
  if (!kv) { isKvHealthy = false; storageDiag.healthChecked = true; return false; }
  if (storageDiag.healthChecked && !force) return storageDiag.healthOk;
  storageDiag.healthChecked = true;
  storageDiag.healthError = null;
  storageDiag.healthTarget = storageDiag.config && storageDiag.config.basePrefix;
  try {
    const ok = await kv.ping();
    if (!ok) throw new Error('PING null / réponse invalide');
    storageDiag.healthOk = true;
    isKvHealthy = true;
    hasKv = true;
  } catch (e) {
    storageDiag.healthOk = false;
    storageDiag.healthError = (e && e.message || String(e)).slice(0, 200);
    isKvHealthy = false;
  }
  return storageDiag.healthOk;
}

const isVercel = !!process.env.VERCEL
  || !!process.env.KV_REST_API_URL
  || !!process.env.UPSTASH_REDIS_REST_URL
  || !!process.env.REDIS_URL
  || !!process.env.KV_URL;

function readLocalFile() {
  try {
    if (fs.existsSync(LOCAL_FILE)) {
      const raw = fs.readFileSync(LOCAL_FILE, 'utf8');
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch {}
  return [];
}

function writeLocalFile(arr) {
  try {
    const dir = path.dirname(LOCAL_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('[storage] Cannot write local file', err && err.message);
    return false;
  }
}

async function getAll() {
  if (hasKv) {
    const arr = await kv.lrange(LIST_KEY, 0, -1);
    if (arr.length) return arr;
  }
  return readLocalFile();
}

async function addEntry(entry) {
  let remoteOk = false;
  let remoteErr = null;
  if (hasKv) {
    try {
      const r = await kv.lpush(LIST_KEY, entry);
      remoteOk = r !== null;
    } catch (err) { remoteErr = err && err.message; remoteOk = false; }
  }
  const local = readLocalFile();
  local.unshift(entry);
  const localOk = writeLocalFile(local);
  return { remoteOk, localOk, remoteErr };
}

async function clearAll() {
  let remoteOk = true;
  let localOk = true;
  if (hasKv) {
    try { await kv.del(LIST_KEY); remoteOk = true; }
    catch { remoteOk = false; }
  }
  try {
    if (fs.existsSync(LOCAL_FILE)) { fs.unlinkSync(LOCAL_FILE); localOk = true; }
  } catch { localOk = false; }
  return { remoteOk, localOk };
}

module.exports = {
  isVercel,
  hasKv,
  isKvHealthy: () => isKvHealthy,
  getAll,
  addEntry,
  clearAll,
  parseRedisUrl,
  kvHealthCheck,
  getStorageDiag: () => JSON.parse(JSON.stringify(storageDiag, (k, v) => {
    if (typeof v === 'string' && (k === 'healthTarget' || k === 'lastTarget' || k === 'config')) {
      return v;
    }
    return v;
  }))
};
