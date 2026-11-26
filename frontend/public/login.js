/* ==========================================================================
   FitGesty — login.js (100% alinhado com server.js V3.0)
   ========================================================================== */

function mostrarErroLogin(msg) {
  let el = document.getElementById('loginError');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loginError';
    el.style.cssText = 'margin-bottom:1rem;padding:0.75rem 0.9rem;border-radius:10px;background:#fee2e2;color:#b91c1c;font-size:0.82rem;font-weight:600;';
    document.getElementById('loginForm')?.prepend(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}

function limparErroLogin() {
  const el = document.getElementById('loginError');
  if (el) el.style.display = 'none';
}

function concluirSessao(data) {
  localStorage.setItem('fit_token', data.token);
  localStorage.setItem('fit_role', data.role);
  localStorage.setItem('fit_is_demo', data.isDemo ? 'true' : 'false');
  if (data.academyId) localStorage.setItem('fit_academy_id', data.academyId);
  if (data.academyName) localStorage.setItem('fit_academy_name', data.academyName);
  if (data.name || data.userName) localStorage.setItem('fit_user_name', data.name || data.userName);
  if (data.memberId) localStorage.setItem('fit_user_id', String(data.memberId));
  if (data.presenca?.mensagem) {
    localStorage.setItem('fit_ultima_presenca_msg', data.presenca.mensagem);
  }

  window.location.href = data.redirect || (
    data.role === 'superadmin' ? '/superadmin.html' :
    data.role === 'aluno' ? '/aluno.html' : '/admin.html'
  );
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErroLogin();

  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const selGroup = document.getElementById('academySelectorGroup');
  const sel = document.getElementById('academySelector');
  const academyId = selGroup && selGroup.style.display !== 'none' ? sel.value : undefined;

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Entrando...';
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, academyId })
    });

    const data = await res.json();

    if (data.multipleAcademies && Array.isArray(data.options)) {
      sel.innerHTML = data.options
        .map(o => `<option value="${o.academyId}">${o.academyName} (${o.role === 'admin' ? 'Gestor' : 'Aluno'})</option>`)
        .join('');
      selGroup.style.display = 'flex';
      mostrarErroLogin('Este e-mail possui acesso em mais de uma unidade. Selecione a academia acima e clique em Entrar.');
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || 'E-mail ou senha inválidos.');
    }

    concluirSessao(data);
  } catch (err) {
    mostrarErroLogin(err.message || 'Não foi possível conectar ao servidor.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Entrar no painel';
    }
  }
});

// Modo Demonstração (usa demoRole: 'admin' conforme server.js)
document.getElementById('btnDemoLogin')?.addEventListener('click', async () => {
  limparErroLogin();
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoRole: 'admin' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Modo demonstração indisponível.');
    concluirSessao(data);
  } catch (err) {
    mostrarErroLogin(err.message);
  }
});

// ── LOGIN POR BIOMETRIA (GET /api/biometric/challenge + POST /api/biometric/login) ──
function base64urlToBuffer(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

document.getElementById('btnBiometricLogin')?.addEventListener('click', async () => {
  limparErroLogin();
  if (!window.isSecureContext) {
    return mostrarErroLogin('A biometria exige acesso via http://localhost:3000 ou HTTPS.');
  }
  if (!window.PublicKeyCredential) {
    return mostrarErroLogin('Este dispositivo ou navegador não suporta biometria.');
  }

  try {
    const chRes = await fetch('/api/biometric/challenge');
    const { challenge } = await chRes.json();

    const savedCredId = localStorage.getItem('fit_biometric_cred_id');
    const publicKey = {
      challenge: base64urlToBuffer(challenge),
      timeout: 60000,
      userVerification: 'preferred'
    };

    if (savedCredId) {
      publicKey.allowCredentials = [{
        id: base64urlToBuffer(savedCredId),
        type: 'public-key'
      }];
    }

    const assertion = await navigator.credentials.get({ publicKey });
    const credentialId = assertion.id || bufferToBase64url(assertion.rawId);

    const loginRes = await fetch('/api/biometric/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId })
    });
    const data = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(data.error || 'Biometria não reconhecida.');
    }

    localStorage.setItem('fit_biometric_cred_id', credentialId);
    concluirSessao(data);
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      mostrarErroLogin('Leitura biométrica cancelada ou tempo esgotado.');
    } else {
      mostrarErroLogin(err.message || 'Erro no acesso biométrico.');
    }
  }
});