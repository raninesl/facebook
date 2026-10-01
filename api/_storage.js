const fs = require('fs');
const path = require('path');

const LIST_KEY = 'captured_entries_v1';

const LOCAL_FILE = process.env.STORAGE_FILE
  || path.join(process.cwd(), 'captured_data.json');

const isVercel = !!process.env.VERCEL
  || !!process.env.KV_REST_API_URL
  || !!process.env.UPSTASH_REDIS_REST_URL
  || !!process.env.REDIS_URL
  || !!process.env.KV_URL;

function parseRedisUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = url.trim();
    let restEndpoint = '';
    let token = '';
    if (/^rediss?:\/\//i.test(u) || /^redis:\/\/\//i.test(u)) {
      const authIdx = u.lastIndexOf('@');
      const protoEnd = u.indexOf('://') + 3;
      if (authIdx > protoEnd) {
        const userPass = decodeURIComponent(u.slice(protoEnd, authIdx));
        const hostPort = u.slice(authIdx + 1).split('/')[0].split('?')[0];
        const [host] = hostPort.split(':');
        if (host && /\.upstash\.io$/i.test(host)) {
          restEndpoint = 'https://' + host;
          const colon = userPass.indexOf(':');
          token = colon >= 0 ? userPass.slice(colon + 1) : userPass;
        }
      }
    } else if (/^https?:\/\//i.test(u)) {
      const slash = u.indexOf('/', u.indexOf('://') + 3);
      restEndpoint = (slash > 0 ? u.slice(0, slash) : u).replace(/\/$/, '');
    }
    if (restEndpoint && token) return { base: restEndpoint, token };
  } catch (e) {
    console.warn('[storage] Impossible de parser REDIS_URL', e && e.message);
  }
  return null;
}

const kv = (() => {
  let url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if ((!url || !token) && process.env.REDIS_URL) {
    const p = parseRedisUrl(process.env.REDIS_URL);
    if (p) { url = p.base; token = p.token; }
  }
  if ((!url || !token) && process.env.KV_URL && process.env.KV_REST_TOKEN) {
    const p = parseRedisUrl(process.env.KV_URL);
    if (p) { url = p.base; }
    else if (/^https?:\/\//i.test(process.env.KV_URL)) {
      const slash = process.env.KV_URL.indexOf('/', process.env.KV_URL.indexOf('://') + 3);
      url = (slash > 0 ? process.env.KV_URL.slice(0, slash) : process.env.KV_URL).replace(/\/$/, '');
    }
    token = process.env.KV_REST_TOKEN;
  }
  if (!url || !token) return null;
  const base = url.replace(/\/$/, '');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const request = async (body) => {
    try {
      const res = await fetch(`${base}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        console.warn('[storage] Upstash HTTP error', res.status, await res.text());
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn('[storage] Upstash request failed', err && err.message);
      return null;
    }
  };
  return {
    async lpush(key, value) {
      const r = await request(['LPUSH', key, JSON.stringify(value)]);
      return r && (r.result !== undefined || r[0] !== undefined) ? (r.result ?? r[0]) : null;
    },
    async lrange(key, start, end) {
      const r = await request(['LRANGE', key, String(start), String(end)]);
      const arr = (r && (r.result !== undefined ? r.result : (Array.isArray(r) ? r[0] : null))) || null;
      if (!arr || !Array.isArray(arr) || !arr.length) return [];
      return arr.map((x) => {
        try { return JSON.parse(x); } catch { return null; }
      }).filter(Boolean);
    },
    async del(key) {
      const r = await request(['DEL', key]);
      return r && (r.result !== undefined || r[0] !== undefined) ? (r.result ?? r[0]) : null;
    }
  };
})();

const hasKv = !!kv;

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
  getAll,
  addEntry,
  clearAll,
  parseRedisUrl
};
