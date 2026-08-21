const { clearAll } = require('./_storage');
const { applyNoCache } = require('./_html');

module.exports = async (req, res) => {
  applyNoCache(res);
  try {
    await clearAll();
  } catch {}
  res.statusCode = 302;
  res.setHeader('Location', '/admin');
  res.end();
};
