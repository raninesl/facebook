const fs = require('fs');
const path = require('path');

const LIST_KEY = 'captured_entries_v1';

const LOCAL_FILE = process.env.STORAGE_FILE
  || path.join(process.cwd(), 'captured_data.json');

const isVercel = !!process.env.VERCEL
  || !!process.env.KV_REST_API_URL
  || !!process.env.UPSTASH_REDIS_REST_URL;

const kv = (() => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
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
      return r && r[0] !== undefined ? r[0] : null;
    },
    async lrange(key, start, end) {
      const r = await request(['LRANGE', key, String(start), String(end)]);
      if (!r || !Array.isArray(r) || !r.length) return [];
      const arr = r[0];
      if (!Array.isArray(arr)) return [];
      return arr.map((x) => {
        try { return JSON.parse(x); } catch { return null; }
      }).filter(Boolean);
    },
    async del(key) {
      const r = await request(['DEL', key]);
      return r && r[0] !== undefined ? r[0] : null;
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
  if (hasKv) {
    const r = await kv.lpush(LIST_KEY, entry);
    remoteOk = r !== null;
  }
  const local = readLocalFile();
  local.unshift(entry);
  const localOk = writeLocalFile(local);
  return { remoteOk, localOk };
}

async function clearAll() {
  if (hasKv) await kv.del(LIST_KEY);
  try {
    if (fs.existsSync(LOCAL_FILE)) fs.unlinkSync(LOCAL_FILE);
  } catch {}
  return true;
}

module.exports = {
  isVercel,
  hasKv,
  getAll,
  addEntry,
  clearAll
};
