const { clearAll } = require('./_storage');
const { applyNoCache, requireAdminAuth } = require('./_html');

module.exports = async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  applyNoCache(res);
  try {
    await clearAll();
  } catch {}
  res.statusCode = 302;
  res.setHeader('Location', '/admin');
  res.end();
};
