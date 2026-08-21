const { getAll } = require('./_storage');
const { applyNoCache } = require('./_html');

module.exports = async (req, res) => {
  applyNoCache(res);
  let data = [];
  try {
    data = await getAll();
  } catch {}

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="captured_data_${stamp}.json"`);
  res.end(JSON.stringify(data, null, 2));
};
