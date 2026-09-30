const app = require('../server');
module.exports = (req, res) => {
  if (!app || typeof app.handle !== 'function') {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Erreur: Serveur Express non initialisé');
  }
  app.handle(req, res);
};
