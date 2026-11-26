/* ==========================================================================
   FitGesty — superadmin.js (Painel Master / Provisionamento de Academias)
   ========================================================================== */

const role = localStorage.getItem('fit_role');
if (role !== 'superadmin') {
  window.location.href = '/login.html';
}

const escapeHtml = (val = '') =>
  String(val).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:380px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const isError = type === 'error';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `padding:13px 16px;border-radius:10px;font-size:0.85rem;font-weight:600;color:#fff;background:${isError ? '#dc2626' : '#16a34a'};box-shadow:0 10px 25px rgba(15,23,42,0.2);`;
  toast.textContent = `${isError ? '⚠️' : '✅'} ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

async function reqSa(url, method = 'GET', body = null) {
  const token = localStorage.getItem('fit_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    throw new Error((data && typeof data === 'object' && data.error) || `Erro HTTP ${res.status}`);
  }
  return data;
}

// Tenta a rota principal e, se o backend usar o alias em português, faz fallback automático
async function reqSaMulti(urls, method = 'GET', body = null) {
  let lastErr = null;
  for (const url of urls) {
    try {
      return await reqSa(url, method, body);
    } catch (err) {
      lastErr = err;
      if (!String(err.message).includes('404')) throw err;
    }
  }
  throw lastErr || new Error('Endpoint não encontrado.');
}

async function carregarPainelSuperAdmin() {
  try {
    const [academiasRaw, leadsRaw] = await Promise.all([
      reqSaMulti(['/api/superadmin/academies', '/api/academias']).catch(() => []),
      reqSaMulti(['/api/superadmin/leads', '/api/leads']).catch(() => [])
    ]);

    const academias = Array.isArray(academiasRaw) ? academiasRaw : (academiasRaw?.academies || []);
    const leads = Array.isArray(leadsRaw) ? leadsRaw : (leadsRaw?.leads || []);

    const ativas = academias.filter(a => (a.status || 'Ativa').toLowerCase() === 'ativa').length;

    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('saTotalAcademias', academias.length);
    setTxt('saAtivasAcademias', ativas);
    setTxt('saTotalLeadsKpi', leads.length);
    setTxt('saBadgeAcademias', academias.length);
    setTxt('saBadgeLeads', leads.length);

    // Renderizar tabela de academias
    const tbAcad = document.getElementById('tableAcademies');
    if (tbAcad) {
      tbAcad.innerHTML = academias.length === 0
        ? '<tr><td colspan="5" style="color:var(--fg-text-muted);text-align:center;padding:1.75rem;">Nenhuma academia cadastrada ainda. Use o formulário acima para criar a primeira.</td></tr>'
        : academias.map(ac => {
            const nomeAc = ac.name || ac.nome || 'Sem nome';
            const gestor = ac.owner_name || ac.ownerName || ac.gestor || 'Gestor';
            const email = ac.owner_email || ac.ownerEmail || ac.email || '—';
            const plano = ac.plan || ac.plano || 'Pro';
            const status = ac.status || 'Ativa';
            const isAtiva = status.toLowerCase() === 'ativa';

            return `<tr>
              <td><strong>${escapeHtml(nomeAc)}</strong><br><span style="font-size:0.74rem;color:var(--fg-text-muted);">ID: ${escapeHtml(String(ac.id))}</span></td>
              <td><strong>${escapeHtml(gestor)}</strong><br><span style="font-size:0.78rem;color:var(--fg-text-sec);">${escapeHtml(email)}</span></td>
              <td><span class="fg-badge blue">${escapeHtml(plano)}</span></td>
              <td>
                <select class="fg-select" style="padding:4px 8px;font-size:0.8rem;width:auto;" onchange="alterarStatusAcademia('${ac.id}', this.value)">
                  <option value="Ativa" ${isAtiva ? 'selected' : ''}>Ativa</option>
                  <option value="Suspensa" ${!isAtiva ? 'selected' : ''}>Suspensa</option>
                </select>
              </td>
              <td>
                <button type="button" class="fg-btn fg-btn-outline" style="padding:5px 9px;font-size:0.76rem;color:var(--fg-danger);" onclick="excluirAcademia('${ac.id}')">Excluir</button>
              </td>
            </tr>`;
          }).join('');
    }

    // Renderizar tabela de leads comerciais
    const tbLeads = document.getElementById('tableSuperLeads');
    if (tbLeads) {
      tbLeads.innerHTML = leads.length === 0
        ? '<tr><td colspan="6" style="color:var(--fg-text-muted);text-align:center;padding:1.75rem;">Nenhum lead recebido pela página comercial ainda.</td></tr>'
        : leads.map(l => `<tr>
            <td><strong>${escapeHtml(l.nome || l.name || '—')}</strong></td>
            <td>${escapeHtml(l.whatsapp || l.phone || '—')}</td>
            <td>${escapeHtml(l.segmento || 'Academia')}</td>
            <td>${escapeHtml(l.tamanho_alunos || l.alunos || '—')}</td>
            <td><span class="fg-badge blue">${escapeHtml(l.status || 'Novo')}</span></td>
            <td>
              <button type="button" class="fg-btn fg-btn-outline" style="padding:4px 8px;font-size:0.75rem;color:var(--fg-danger);" onclick="excluirLeadSa('${l.id}')">Remover</button>
            </td>
          </tr>`).join('');
    }
  } catch (err) {
    showToast(err.message || 'Erro ao carregar dados do Super Admin.', 'error');
  }
}

// Criar nova academia + login do gestor
document.getElementById('formCreateAcademy')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Criando...';
  }

  const name = document.getElementById('acadName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const ownerEmail = document.getElementById('ownerEmail').value.trim();
  const ownerPassword = document.getElementById('ownerPassword').value;
  const plan = document.getElementById('acadPlan').value;

  // Envia os campos nos formatos em inglês e português para compatibilidade total com server.js
  const payload = {
    name,
    nome: name,
    ownerName,
    owner_name: ownerName,
    gestor: ownerName,
    ownerEmail,
    owner_email: ownerEmail,
    email: ownerEmail,
    ownerPassword,
    owner_password: ownerPassword,
    password: ownerPassword,
    plan,
    plano: plan
  };

  try {
    await reqSaMulti(['/api/superadmin/academies', '/api/academias'], 'POST', payload);
    e.target.reset();
    showToast(`Academia "${name}" e login do gestor criados com sucesso!`);
    await carregarPainelSuperAdmin();
  } catch (err) {
    showToast(err.message || 'Não foi possível cadastrar a academia.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '+ Criar academia e login';
    }
  }
});

async function alterarStatusAcademia(id, status) {
  try {
    await reqSaMulti([`/api/superadmin/academies/${id}`, `/api/academias/${id}`], 'PUT', { status });
    showToast('Status da academia atualizado.');
    await carregarPainelSuperAdmin();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function excluirAcademia(id) {
  if (!confirm('Deseja realmente excluir esta academia e todos os seus dados?')) return;
  try {
    await reqSaMulti([`/api/superadmin/academies/${id}`, `/api/academias/${id}`], 'DELETE');
    showToast('Academia removida.');
    await carregarPainelSuperAdmin();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function excluirLeadSa(id) {
  if (!confirm('Remover este lead?')) return;
  try {
    await reqSaMulti([`/api/superadmin/leads/${id}`, `/api/leads/${id}`], 'DELETE');
    showToast('Lead removido.');
    await carregarPainelSuperAdmin();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.onload = carregarPainelSuperAdmin;