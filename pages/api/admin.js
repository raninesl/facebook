const { getAll } = require('./_storage');
const { applyNoCache, renderAdmin, requireAdminAuth } = require('./_html');

module.exports = async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  applyNoCache(res);
  let data = [];
  try {
    data = await getAll();
  } catch (err) {
    console.warn('[admin] getAll failed', err && err.message);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(renderAdmin(data));
};
