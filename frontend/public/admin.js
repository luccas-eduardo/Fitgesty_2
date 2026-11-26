/* ==========================================================================
   FitGesty — admin.js (Consolidado: Planos com Dias, Vencimentos, Reservas e Gráficos)
   ========================================================================== */

const role = localStorage.getItem('fit_role');
const token = localStorage.getItem('fit_token');

if (!token || (role !== 'admin' && role !== 'superadmin')) {
  window.location.href = '/login.html';
}

const isDemo = localStorage.getItem('fit_is_demo') === 'true';

const escapeHtml = (val = '') =>
  String(val).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatBRL = (val) =>
  Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const setTxt = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
};

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
  toast.style.cssText = `padding:12px 16px;border-radius:10px;font-size:0.84rem;font-weight:600;color:#fff;background:${isError ? '#dc2626' : '#16a34a'};box-shadow:0 10px 25px rgba(15,23,42,0.18);`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

async function reqAdmin(url, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  // Só 401 significa sessão inválida/expirada. 403 é "sem permissão para este recurso" e não deve deslogar.
  if (res.status === 401) {
    if (!isDemo) {
      logout();
      throw new Error('Sessão expirada.');
    }
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    throw new Error((data && typeof data === 'object' && data.error) || `Erro HTTP ${res.status}`);
  }
  return data;
}

function logout() {
  const estavaNaDemo = localStorage.getItem('fit_is_demo') === 'true';

  localStorage.removeItem('fit_token');
  localStorage.removeItem('fit_role');
  localStorage.removeItem('fit_is_demo');
  localStorage.removeItem('fit_academy_id');
  localStorage.removeItem('fit_academy_name');
  localStorage.removeItem('fit_user_name');
  localStorage.removeItem('fit_user_id');

  window.location.href = estavaNaDemo ? '/index.html' : '/login.html';
}

function switchView(viewId) {
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.fg-nav-item').forEach(btn => {
    const isTarget = btn.getAttribute('data-view') === viewId;
    btn.classList.toggle('active', isTarget);
    if (isTarget) {
      const crumb = document.getElementById('topbarCrumb');
      if (crumb) crumb.textContent = btn.getAttribute('data-crumb') || 'Visão geral';
    }
  });

  document.getElementById('appSidebar')?.classList.remove('open');
}

// ── BUSCA RÁPIDA NOS RECURSOS DA SIDEBAR + ATALHO CTRL+K / ⌘K ───────────────
const RECURSOS_SIDEBAR = [
  { view: 'view-painel', titulo: 'Visão geral', desc: 'Resumo, métricas e movimento da semana', keywords: 'inicio home painel resumo kpi movimento' },
  { view: 'view-alunos', titulo: 'Alunos', desc: 'Matrículas, planos e cadastro de alunos', keywords: 'matriculas alunos cadastro planos pcd' },
  { view: 'view-vencimentos', titulo: 'Vencimentos', desc: 'Planos vencidos e prestes a vencer', keywords: 'vencimentos planos expirados renovar prazo dias' },
  { view: 'view-equipamentos', titulo: 'Equipamentos e salas', desc: 'Inventário de aparelhos e espaços', keywords: 'equipamentos salas aparelhos inventario manutencao' },
  { view: 'view-reservas', titulo: 'Reservas', desc: 'Agendamento de salas e equipamentos', keywords: 'reservas horarios agendamento capacidade' },
  { view: 'view-pagamentos', titulo: 'Financeiro', desc: 'Planos, duração em dias e despesas do mês', keywords: 'financeiro planos mensalidades despesas contas' },
  { view: 'view-resultados', titulo: 'Resultados', desc: 'Gráfico de receitas, despesas e DRE', keywords: 'resultados dre lucro receita grafico margem' },
  { view: 'view-leads', titulo: 'Leads', desc: 'Contatos interessados e atendimento', keywords: 'leads contatos interessados whatsapp crm' },
  { view: 'view-catraca', titulo: 'Controle de acesso', desc: 'Entradas, saídas e presença em tempo real', keywords: 'catraca acesso biometria entrada saida frequencia' },
  { view: 'view-avisos', titulo: 'Avisos', desc: 'Mural de comunicados para alunos e equipe', keywords: 'avisos comunicados mural notificacoes' }
];

function normalizarTextoBusca(str = '') {
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function obterDropdownBusca() {
  const bar = document.querySelector('.fg-search-bar');
  if (!bar) return null;
  let dd = document.getElementById('globalSearchDropdown');
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'globalSearchDropdown';
    dd.className = 'fg-search-dropdown';
    bar.appendChild(dd);
  }
  return dd;
}

function selecionarRecursoBusca(viewId) {
  switchView(viewId);
  const dd = document.getElementById('globalSearchDropdown');
  const inp = document.getElementById('globalSearchInput');
  if (dd) dd.classList.remove('open');
  if (inp) inp.value = '';
}

function handleGlobalSearch(q) {
  const dd = obterDropdownBusca();
  if (!dd) return;

  const termo = normalizarTextoBusca(q).trim();
  if (!termo) {
    dd.classList.remove('open');
    dd.innerHTML = '';
    return;
  }

  const encontrados = RECURSOS_SIDEBAR.filter(item =>
    normalizarTextoBusca(`${item.titulo} ${item.desc} ${item.keywords}`).includes(termo)
  );

  dd.innerHTML = encontrados.length === 0
    ? `<div style="padding:0.75rem 0.9rem;font-size:0.82rem;color:var(--fg-text-muted);">Nenhum recurso encontrado para "${escapeHtml(q)}".</div>`
    : encontrados.map((item, idx) => `
        <button type="button" class="fg-search-item ${idx === 0 ? 'active' : ''}" data-view="${item.view}" onclick="selecionarRecursoBusca('${item.view}')">
          <div>
            <div style="font-weight:600;">${escapeHtml(item.titulo)}</div>
            <div style="font-size:0.74rem;color:var(--fg-text-sec);">${escapeHtml(item.desc)}</div>
          </div>
          <span style="font-size:0.75rem;font-weight:700;">Abrir →</span>
        </button>
      `).join('');

  dd.classList.add('open');
}

// ── ESTADO GLOBAL ───────────────────────────────────────────────────────────
const PLANOS_ADMIN_KEY = () => `fitgesty_admin_planos_${localStorage.getItem('fit_academy_id') || 'default'}`;
const VENCIMENTOS_ALUNOS_KEY = () => `fitgesty_alunos_venc_${localStorage.getItem('fit_academy_id') || 'default'}`;

let stateMembers = [];
let stateEquipamentos = [];
let stateReservas = [];
let stateLeads = [];
let stateDespesas = [];
let statePlanos = JSON.parse(localStorage.getItem(PLANOS_ADMIN_KEY()) || 'null') || [
  { id: 'mensal', nome: 'Mensal', preco: 120, dias: 30 },
  { id: 'estudante', nome: 'Estudante', preco: 90, dias: 30 },
  { id: 'premium', nome: 'Premium Inclusivo', preco: 180, dias: 30 }
];

// ── 1. PLANOS COM DURAÇÃO EM DIAS & CÁLCULO DE VENCIMENTO ───────────────────
function getMapaVencimentos() {
  try { return JSON.parse(localStorage.getItem(VENCIMENTOS_ALUNOS_KEY()) || '{}'); } catch { return {}; }
}

function salvarVencimentoAluno(chave, dataIso) {
  if (!chave || !dataIso) return;
  const mapa = getMapaVencimentos();
  mapa[String(chave).toLowerCase()] = dataIso;
  localStorage.setItem(VENCIMENTOS_ALUNOS_KEY(), JSON.stringify(mapa));
}

function obterVencimentoAluno(m) {
  const mapa = getMapaVencimentos();
  const bruto = m.planEndDate || m.vencimento || m.data_vencimento || mapa[String(m.id)] || mapa[String(m.email || '').toLowerCase()];
  if (bruto) return String(bruto).slice(0, 10);

  const planoObj = statePlanos.find(p => p.nome === m.plan) || statePlanos[0];
  const dias = Number(planoObj?.dias || 30);
  const base = m.created_at ? new Date(m.created_at) : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
}

function atualizarDataVencimentoPorPlano() {
  const sel = document.getElementById('memPlan');
  const inpVenc = document.getElementById('memVencimento');
  if (!sel || !inpVenc) return;

  const planoObj = statePlanos.find(p => p.nome === sel.value) || statePlanos[0];
  const dias = Number(planoObj?.dias || 30);

  const dt = new Date();
  dt.setDate(dt.getDate() + dias);
  inpVenc.value = dt.toISOString().slice(0, 10);
}

function renderPlanos() {
  const sel = document.getElementById('memPlan');
  if (sel) {
    const prev = sel.value;
    sel.innerHTML = statePlanos
      .map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)} (${formatBRL(p.preco)} • ${Number(p.dias || 30)} dias)</option>`)
      .join('');
    if (prev && statePlanos.some(p => p.nome === prev)) sel.value = prev;
    atualizarDataVencimentoPorPlano();
  }

  const editor = document.getElementById('listaPlanosEditor');
  if (editor) {
    editor.innerHTML = statePlanos.map((p, idx) => `
      <div style="padding:1rem;border:1px solid var(--fg-border);border-radius:10px;background:var(--fg-surface-muted);display:flex;flex-direction:column;gap:0.45rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <label style="font-size:0.74rem;font-weight:600;color:var(--fg-text-sec);">Nome do plano</label>
          ${statePlanos.length > 1 ? `<button type="button" onclick="removerPlanoAdmin(${idx})" style="border:none;background:transparent;color:var(--fg-danger);font-size:0.74rem;cursor:pointer;">Excluir</button>` : ''}
        </div>
        <input type="text" class="fg-input plano-nome-input" data-idx="${idx}" value="${escapeHtml(p.nome)}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
          <div>
            <label style="font-size:0.72rem;font-weight:600;color:var(--fg-text-sec);">Valor (R$)</label>
            <input type="number" step="0.01" class="fg-input plano-preco-input" data-idx="${idx}" value="${Number(p.preco || 0)}">
          </div>
          <div>
            <label style="font-size:0.72rem;font-weight:600;color:var(--fg-text-sec);">Duração (dias)</label>
            <input type="number" min="1" class="fg-input plano-dias-input" data-idx="${idx}" value="${Number(p.dias || 30)}">
          </div>
        </div>
      </div>
    `).join('');
  }
}

function removerPlanoAdmin(idx) {
  statePlanos.splice(idx, 1);
  localStorage.setItem(PLANOS_ADMIN_KEY(), JSON.stringify(statePlanos));
  renderPlanos();
  showToast('Plano removido.');
}

async function salvarListaPlanos() {
  document.querySelectorAll('.plano-nome-input').forEach(inp => {
    const idx = Number(inp.getAttribute('data-idx'));
    if (statePlanos[idx]) statePlanos[idx].nome = inp.value.trim() || statePlanos[idx].nome;
  });
  document.querySelectorAll('.plano-preco-input').forEach(inp => {
    const idx = Number(inp.getAttribute('data-idx'));
    if (statePlanos[idx]) statePlanos[idx].preco = Number(inp.value || 0);
  });
  document.querySelectorAll('.plano-dias-input').forEach(inp => {
    const idx = Number(inp.getAttribute('data-idx'));
    if (statePlanos[idx]) statePlanos[idx].dias = Math.max(1, Number(inp.value || 30));
  });

  localStorage.setItem(PLANOS_ADMIN_KEY(), JSON.stringify(statePlanos));

  try {
    await reqAdmin('/api/financeiro', 'PUT', {
      precoMensal: statePlanos[0]?.preco ?? 120,
      precoEstudante: statePlanos[1]?.preco ?? 90,
      precoPremium: statePlanos[2]?.preco ?? 180
    });
    renderPlanos();
    renderTabelaVencimentos();
    showToast('Planos, valores e durações salvos!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('formNovoPlano')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('novoPlanoNome').value.trim();
  const preco = Number(document.getElementById('novoPlanoPreco').value || 0);
  const dias = Math.max(1, Number(document.getElementById('novoPlanoDias')?.value || 30));
  if (!nome) return;
  statePlanos.push({ id: `p_${Date.now()}`, nome, preco, dias });
  localStorage.setItem(PLANOS_ADMIN_KEY(), JSON.stringify(statePlanos));
  e.target.reset();
  const diasInp = document.getElementById('novoPlanoDias');
  if (diasInp) diasInp.value = '30';
  renderPlanos();
  showToast(`Plano "${nome}" (${dias} dias) criado.`);
});

// ── 2. ALUNOS & ANÁLISE DE VENCIMENTOS ──────────────────────────────────────
function classificarPrazoAluno(m) {
  const vencIso = obterVencimentoAluno(m);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dtVenc = new Date(`${vencIso}T00:00:00`);
  const diffDias = Math.round((dtVenc - hoje) / (1000 * 60 * 60 * 24));
  const dataFmt = vencIso.split('-').reverse().join('/');

  if (diffDias < 0) {
    return { categoria: 'vencidos', diffDias, dataFmt, badge: 'red', texto: `Vencido há ${Math.abs(diffDias)} dia(s)` };
  }
  if (diffDias <= 7) {
    return {
      categoria: 'vencendo',
      diffDias,
      dataFmt,
      badge: 'yellow',
      texto: diffDias === 0 ? 'Vence hoje!' : `Vence em ${diffDias} dia(s)`
    };
  }
  return { categoria: 'em_dia', diffDias, dataFmt, badge: 'green', texto: `Em dia (${diffDias} dias)` };
}

function renderTabelaAlunos() {
  const busca = (document.getElementById('buscaAlunoInput')?.value || '').toLowerCase();
  const filtroStatus = document.getElementById('filtroStatusAluno')?.value || '';

  const filtrados = stateMembers.filter(m => {
    const matchBusca = !busca ||
      String(m.name || '').toLowerCase().includes(busca) ||
      String(m.email || '').toLowerCase().includes(busca) ||
      String(m.phone || '').toLowerCase().includes(busca);
    const matchStatus = !filtroStatus || m.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const ativos = stateMembers.filter(m => m.status === 'Ativo').length;
  const pendentes = stateMembers.filter(m => m.status === 'Pendente').length;
  const total = stateMembers.length;
  const pct = total > 0 ? Math.round((ativos / total) * 100) : 0;

  setTxt('navBadgeAlunos', total);
  setTxt('metric-alunos', ativos);
  setTxt('metric-alunos-total', `de ${total} alunos cadastrados`);
  setTxt('kpiAlunosTotalCard', total);
  setTxt('kpiAlunosAtivosCard', ativos);
  setTxt('kpiAlunosPctCard', `${pct}% dos alunos cadastrados`);
  setTxt('kpiAlunosEmDiaCard', ativos);
  setTxt('kpiAlunosPendenciaCard', pendentes > 0 ? `${pendentes} pendente(s)` : 'Nenhuma pendência financeira');
  setTxt('kpiInadimplentesQtd', pendentes);
  setTxt('alunosContagemSub', `Mostrando ${filtrados.length} aluno(s)`);

  const pcdCount = stateMembers.filter(m => m.accessibilityNeeds && m.accessibilityNeeds !== 'Nenhuma informada').length;
  setTxt('metric-pcd', pcdCount);

  const tb = document.getElementById('tableMembers');
  if (!tb) return;

  tb.innerHTML = filtrados.length === 0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhum aluno encontrado.</td></tr>'
    : filtrados.map(m => {
        const badgeClass = m.status === 'Ativo' ? 'green' : (m.status === 'Pendente' ? 'yellow' : 'red');
        const prazo = classificarPrazoAluno(m);
        return `<tr>
          <td><strong>${escapeHtml(m.name)}</strong><br><span style="font-size:0.75rem;color:var(--fg-text-sec);">${escapeHtml(m.email)}</span></td>
          <td>${escapeHtml(m.phone || '—')}</td>
          <td><strong>${escapeHtml(m.plan || 'Mensal')}</strong><br><span style="font-size:0.74rem;color:var(--fg-text-sec);">Vence: ${escapeHtml(prazo.dataFmt)}</span></td>
          <td><span class="fg-badge ${badgeClass}">${escapeHtml(m.status || 'Ativo')}</span></td>
          <td><span class="fg-badge ${prazo.badge}">${escapeHtml(prazo.texto)}</span></td>
          <td>${escapeHtml(m.accessibilityNeeds || 'Nenhuma')}</td>
          <td>
            <button type="button" class="fg-btn fg-btn-outline" style="padding:0.35rem 0.65rem;font-size:0.75rem;color:var(--fg-danger);" onclick="excluirAluno('${escapeHtml(m.id)}')">Excluir</button>
          </td>
        </tr>`;
      }).join('');
}

document.getElementById('formMember')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailVal = document.getElementById('memEmail').value.trim();
  const vencimentoVal = document.getElementById('memVencimento')?.value || '';

  const payload = {
    name: document.getElementById('memName').value.trim(),
    email: emailVal,
    password: document.getElementById('memPassword').value.trim(),
    phone: document.getElementById('memPhone').value.trim(),
    plan: document.getElementById('memPlan').value,
    planEndDate: vencimentoVal,
    vencimento: vencimentoVal,
    status: document.getElementById('memStatus').value,
    accessibilityNeeds: document.getElementById('memAccess').value.trim()
  };

  try {
    const criado = await reqAdmin('/api/members', 'POST', payload);
    if (vencimentoVal) {
      salvarVencimentoAluno(emailVal, vencimentoVal);
      if (criado && criado.id) salvarVencimentoAluno(criado.id, vencimentoVal);
    }
    e.target.reset();
    atualizarDataVencimentoPorPlano();
    showToast('Aluno cadastrado com prazo de vencimento definido!');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function excluirAluno(id) {
  if (!confirm('Deseja realmente remover este aluno?')) return;
  try {
    await reqAdmin(`/api/members/${id}`, 'DELETE');
    showToast('Aluno removido.');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderTabelaVencimentos() {
  const filtro = document.getElementById('filtroVencimentoSelect')?.value || 'todos';
  const analisados = stateMembers.map(m => ({ ...m, prazo: classificarPrazoAluno(m) }));

  const vencidos = analisados.filter(a => a.prazo.categoria === 'vencidos');
  const vencendo = analisados.filter(a => a.prazo.categoria === 'vencendo');
  const emDia = analisados.filter(a => a.prazo.categoria === 'em_dia');

  setTxt('kpiPlanosVencidos', vencidos.length);
  setTxt('kpiPlanosVencendo', vencendo.length);
  setTxt('kpiPlanosEmDia', emDia.length);
  setTxt('navBadgeVencidos', vencidos.length + vencendo.length);

  let lista = analisados.sort((a, b) => a.prazo.diffDias - b.prazo.diffDias);
  if (filtro !== 'todos') {
    lista = lista.filter(a => a.prazo.categoria === filtro);
  }

  const tb = document.getElementById('tableVencimentos');
  if (!tb) return;

  tb.innerHTML = lista.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhum aluno neste filtro.</td></tr>'
    : lista.map(a => {
        const planoObj = statePlanos.find(p => p.nome === a.plan) || statePlanos[0];
        const diasRenovar = Number(planoObj?.dias || 30);
        return `<tr>
          <td><strong>${escapeHtml(a.name)}</strong><br><span style="font-size:0.75rem;color:var(--fg-text-sec);">${escapeHtml(a.phone || a.email || '')}</span></td>
          <td>${escapeHtml(a.plan || 'Mensal')} (${diasRenovar} dias)</td>
          <td><strong>${escapeHtml(a.prazo.dataFmt)}</strong></td>
          <td><span class="fg-badge ${a.prazo.badge}">${escapeHtml(a.prazo.texto)}</span></td>
          <td>
            <button type="button" class="fg-btn fg-btn-primary" style="padding:0.35rem 0.7rem;font-size:0.75rem;" onclick="renovarPlanoAluno('${escapeHtml(a.id)}', '${escapeHtml(a.email || '')}', ${diasRenovar})">
              Renovar (+${diasRenovar}d)
            </button>
          </td>
        </tr>`;
      }).join('');
}

async function renovarPlanoAluno(id, email, dias) {
  const base = new Date();
  base.setDate(base.getDate() + Number(dias || 30));
  const novoVenc = base.toISOString().slice(0, 10);

  salvarVencimentoAluno(id, novoVenc);
  if (email) salvarVencimentoAluno(email, novoVenc);

  try {
    await reqAdmin(`/api/members/${id}`, 'PUT', { status: 'Ativo', planEndDate: novoVenc, vencimento: novoVenc }).catch(() => null);
    showToast(`Plano renovado até ${novoVenc.split('-').reverse().join('/')}!`);
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 3. EQUIPAMENTOS E RESERVAS ──────────────────────────────────────────────
function renderEquipamentos() {
  setTxt('navBadgeEquip', stateEquipamentos.length);
  setTxt('equipBannerCount', `${stateEquipamentos.length} recursos cadastrados`);

  const operacionais = stateEquipamentos.filter(eq => (eq.situacao || eq.status || 'Operacional') === 'Operacional');
  setTxt('kpiRecursosDisp', operacionais.length);

  const sel = document.getElementById('resEquipamento');
  if (sel) {
    sel.innerHTML = operacionais.length === 0
      ? '<option value="">Cadastre um equipamento operacional primeiro</option>'
      : operacionais.map(eq => {
          const nomeEq = eq.nome || eq.name || 'Recurso';
          const qtdEq = eq.quantidade ?? eq.quantity ?? 1;
          return `<option value="${escapeHtml(eq.id)}">${escapeHtml(nomeEq)} (Qtd: ${qtdEq})</option>`;
        }).join('');
  }

  const tb = document.getElementById('tableEquipamentos');
  if (!tb) return;

  tb.innerHTML = stateEquipamentos.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhum equipamento cadastrado.</td></tr>'
    : stateEquipamentos.map(eq => {
        const nomeEq = eq.nome || eq.name || 'Recurso';
        const catEq = eq.categoria || eq.category || 'Geral';
        const qtdEq = eq.quantidade ?? eq.quantity ?? 1;
        const sitEq = eq.situacao || eq.status || 'Operacional';
        const obsEq = eq.observacao || eq.observacoes || eq.notes || '—';
        return `<tr>
          <td><strong>${escapeHtml(nomeEq)}</strong></td>
          <td>${escapeHtml(catEq)}</td>
          <td>${Number(qtdEq)}</td>
          <td><span class="fg-badge ${sitEq === 'Operacional' ? 'green' : 'yellow'}">${escapeHtml(sitEq)}</span></td>
          <td>${escapeHtml(obsEq)}</td>
          <td><button type="button" class="fg-btn fg-btn-outline" style="padding:0.35rem 0.65rem;font-size:0.75rem;color:var(--fg-danger);" onclick="excluirEquipamento('${escapeHtml(eq.id)}')">Excluir</button></td>
        </tr>`;
      }).join('');
}

document.getElementById('formNovoEquipamento')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nomeVal = document.getElementById('eqNome').value.trim();
  const catVal = document.getElementById('eqCategoria').value;
  const qtdVal = Number(document.getElementById('eqQuantidade').value || 1);
  const sitVal = document.getElementById('eqSituacao').value;
  const obsVal = document.getElementById('eqObs').value.trim();

  try {
    await reqAdmin('/api/equipamentos', 'POST', {
      nome: nomeVal,
      name: nomeVal,
      categoria: catVal,
      category: catVal,
      quantidade: qtdVal,
      quantity: qtdVal,
      situacao: sitVal,
      status: sitVal,
      observacao: obsVal,
      observacoes: obsVal
    });
    e.target.reset();
    document.getElementById('eqQuantidade').value = '1';
    showToast('Equipamento/sala salvo!');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function excluirEquipamento(id) {
  try {
    await reqAdmin(`/api/equipamentos/${id}`, 'DELETE');
    showToast('Recurso removido.');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function atualizarInfoDisponibilidade() {
  const sel = document.getElementById('resEquipamento');
  const badge = document.getElementById('reservaDisponibilidadeBadge');
  if (!sel || !badge) return;
  const eq = stateEquipamentos.find(e => String(e.id) === String(sel.value));
  const qtd = eq ? (eq.quantidade ?? eq.quantity ?? 1) : 0;
  badge.textContent = eq ? `Capacidade: ${qtd} un.` : 'Selecione um recurso';
}

function renderReservas() {
  const ativas = stateReservas.filter(r => r.status !== 'Cancelada');
  const canceladas = stateReservas.filter(r => r.status === 'Cancelada');

  setTxt('kpiReservasAtivas', ativas.length);
  setTxt('kpiReservasCanceladas', canceladas.length);

  const tb = document.getElementById('tableReservas');
  if (!tb) return;

  tb.innerHTML = stateReservas.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhuma reserva registrada.</td></tr>'
    : stateReservas.map(r => {
        const dataBruta = r.data || r.data_reserva || r.dataReserva || r.date || '';
        const dataFmt = dataBruta && dataBruta.includes('-')
          ? dataBruta.split('T')[0].split('-').reverse().join('/')
          : dataBruta;
        const horaFmt = r.hora_inicio || r.horaInicio || r.horario || r.hora || '';
        const eqNome = r.equipamento_nome || r.equipamentoNome || r.equipamento || r.recurso || 'Recurso';
        const solNome = r.solicitante_nome || r.solicitanteNome || r.solicitante || '—';

        return `<tr>
          <td>${escapeHtml([dataFmt, horaFmt].filter(Boolean).join(' '))}</td>
          <td><strong>${escapeHtml(eqNome)}</strong></td>
          <td>${Number(r.quantidade || 1)}</td>
          <td>${escapeHtml(solNome)}</td>
          <td><span class="fg-badge ${r.status === 'Cancelada' ? 'red' : 'green'}">${escapeHtml(r.status || 'Confirmada')}</span></td>
          <td>${r.status !== 'Cancelada' ? `<button type="button" class="fg-btn fg-btn-outline" style="padding:0.35rem 0.65rem;font-size:0.75rem;" onclick="cancelarReserva('${escapeHtml(r.id)}')">Cancelar</button>` : '—'}</td>
        </tr>`;
      }).join('');
}

document.getElementById('formReservaEquip')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const eqId = document.getElementById('resEquipamento').value;
  const eq = stateEquipamentos.find(item => String(item.id) === String(eqId));
  const eqNome = eq?.nome || eq?.name || 'Equipamento';
  const dataVal = document.getElementById('resData').value;
  const horaVal = document.getElementById('resHoraInicio').value;
  const qtdVal = Number(document.getElementById('resQtd').value || 1);
  const solicitanteVal = document.getElementById('resSolicitante').value.trim();

  try {
    await reqAdmin('/api/reservas', 'POST', {
      equipamentoId: eqId,
      equipamento_id: eqId,
      equipamento: eqNome,
      equipamentoNome: eqNome,
      equipamento_nome: eqNome,
      solicitante: solicitanteVal,
      solicitanteNome: solicitanteVal,
      quantidade: qtdVal,
      data: dataVal,
      dataReserva: dataVal,
      data_reserva: dataVal,
      horario: horaVal,
      hora: horaVal,
      horaInicio: horaVal,
      hora_inicio: horaVal
    });
    e.target.reset();
    document.getElementById('resQtd').value = '1';
    showToast('Reserva confirmada!');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function cancelarReserva(id) {
  try {
    await reqAdmin(`/api/reservas/${id}`, 'DELETE');
    showToast('Reserva cancelada.');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 4. FINANCEIRO, GRÁFICO SVG & DESPESAS ───────────────────────────────────
function renderGraficoFinanceiroSvg(meses = []) {
  const svg = document.getElementById('finChartSvg');
  if (!svg) return;

  if (!meses.length) {
    svg.innerHTML = '<text x="480" y="95" text-anchor="middle" fill="#94a3b8" font-size="14">Sem dados financeiros para exibir no gráfico.</text>';
    return;
  }

  const maxVal = Math.max(100, ...meses.map(m => Math.max(Number(m.faturamento || m.receita || 0), Number(m.despesas || 0))));
  const slotW = 960 / meses.length;
  const barW = Math.min(34, slotW * 0.28);
  const baseH = 148;

  svg.innerHTML = meses.map((m, i) => {
    const rec = Number(m.faturamento || m.receita || 0);
    const desp = Number(m.despesas || 0);
    const hRec = Math.max(4, (rec / maxVal) * 125);
    const hDesp = Math.max(4, (desp / maxVal) * 125);
    const centerX = i * slotW + slotW / 2;
    const label = escapeHtml(m.mes || m.label || '');

    return `
      <g>
        <rect x="${centerX - barW - 3}" y="${baseH - hRec}" width="${barW}" height="${hRec}" rx="4" fill="#3b82f6">
          <title>Receita: ${formatBRL(rec)}</title>
        </rect>
        <rect x="${centerX + 3}" y="${baseH - hDesp}" width="${barW}" height="${hDesp}" rx="4" fill="#cbd5e1">
          <title>Despesas: ${formatBRL(desp)}</title>
        </rect>
        <text x="${centerX}" y="172" text-anchor="middle" fill="#64748b" font-size="12" font-weight="600">${label}</text>
      </g>
    `;
  }).join('');
}

function renderFinanceiro(fin = {}) {
  const faturamento = Number(fin.faturamentoAtual || 0);
  const despesas = Number(fin.despesasAtual || 0);
  const lucro = Number(fin.lucroLiquido || 0);
  const margem = fin.margem || '0.0';

  setTxt('kpiReceitaMes', formatBRL(faturamento));
  setTxt('resumoBoxReceita', formatBRL(faturamento));
  setTxt('resumoBoxDespesas', formatBRL(despesas));
  setTxt('resumoBoxLucro', formatBRL(lucro));
  setTxt('fin-faturamento', formatBRL(faturamento));
  setTxt('fin-despesas', formatBRL(despesas));
  setTxt('fin-lucro', formatBRL(lucro));
  setTxt('fin-margem', `Últimos 6 meses • Margem: ${margem}%`);

  if (fin.config) {
    statePlanos[0].preco = Number(fin.config.precoMensal ?? statePlanos[0].preco);
    statePlanos[1].preco = Number(fin.config.precoEstudante ?? statePlanos[1].preco);
    statePlanos[2].preco = Number(fin.config.precoPremium ?? statePlanos[2].preco);
    renderPlanos();
  }

  const meses = Array.isArray(fin.meses) ? fin.meses : [];
  renderGraficoFinanceiroSvg(meses);

  const tbDre = document.getElementById('tableDre6Meses');
  if (tbDre) {
    tbDre.innerHTML = meses.length === 0
      ? '<tr><td colspan="5" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Sem histórico consolidado ainda.</td></tr>'
      : meses.map(m => {
          const rec = Number(m.faturamento || m.receita || 0);
          const desp = Number(m.despesas || 0);
          const res = rec - desp;
          const mg = rec > 0 ? ((res / rec) * 100).toFixed(1) : '0.0';
          return `<tr>
            <td><strong>${escapeHtml(m.mes || m.label || '')}</strong></td>
            <td>${formatBRL(rec)}</td>
            <td style="color:var(--fg-danger);">${formatBRL(desp)}</td>
            <td style="color:${res >= 0 ? 'var(--fg-success)' : 'var(--fg-danger)'};font-weight:700;">${formatBRL(res)}</td>
            <td>${mg}%</td>
          </tr>`;
        }).join('');
  }
}

function extrairMesDespesa(d) {
  const bruto = d.mes || d.mes_referencia || d.mesRef || d.competencia || (d.data ? String(d.data).slice(0, 7) : '') || (d.created_at ? String(d.created_at).slice(0, 7) : '');
  return String(bruto).slice(0, 7);
}

function renderTabelaDespesas() {
  const filtroMes = document.getElementById('filtroMesDespesas')?.value || '';
  const filtradas = filtroMes
    ? stateDespesas.filter(d => extrairMesDespesa(d) === filtroMes)
    : stateDespesas;
  const total = filtradas.reduce((acc, d) => acc + Number(d.valor || 0), 0);

  setTxt('extratoDespesasResumo', `${filtradas.length} lançamento(s) • Total de ${formatBRL(total)}`);

  const tb = document.getElementById('tableDespesasLancadas');
  if (!tb) return;

  tb.innerHTML = filtradas.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhuma despesa lançada.</td></tr>'
    : filtradas.map(d => {
        const mesStr = extrairMesDespesa(d) || '—';
        return `<tr>
          <td><strong>${escapeHtml(mesStr)}</strong></td>
          <td><span class="fg-badge blue">${escapeHtml(d.categoria || 'Outros')}</span></td>
          <td>${escapeHtml(d.descricao || '')}</td>
          <td style="color:var(--fg-danger);font-weight:600;">${formatBRL(d.valor)}</td>
          <td><button type="button" class="fg-btn fg-btn-outline" style="padding:0.35rem 0.65rem;font-size:0.75rem;color:var(--fg-danger);" onclick="excluirDespesa('${escapeHtml(d.id)}')">Excluir</button></td>
        </tr>`;
      }).join('');
}

document.getElementById('formNovaDespesa')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const mesVal = document.getElementById('despMes').value;
  try {
    await reqAdmin('/api/despesas', 'POST', {
      mes: mesVal,
      mes_referencia: mesVal,
      categoria: document.getElementById('despCategoria').value,
      descricao: document.getElementById('despDescricao').value.trim(),
      valor: Number(document.getElementById('despValor').value)
    });
    e.target.reset();
    document.getElementById('despMes').value = mesVal;
    showToast('Despesa adicionada!');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function excluirDespesa(id) {
  try {
    await reqAdmin(`/api/despesas/${id}`, 'DELETE');
    showToast('Despesa excluída.');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── 5. LEADS, MOVIMENTO DA SEMANA (HEATMAP), CATRACA E AVISOS ───────────────
function renderTabelaLeads() {
  const busca = (document.getElementById('buscaLeadInput')?.value || '').toLowerCase();
  const filtrados = stateLeads.filter(l =>
    !busca ||
    String(l.nome || '').toLowerCase().includes(busca) ||
    String(l.whatsapp || '').toLowerCase().includes(busca) ||
    String(l.utm_source || '').toLowerCase().includes(busca)
  );

  const novos = stateLeads.filter(l => (l.status || 'Novo') === 'Novo').length;
  setTxt('navBadgeLeads', stateLeads.length);
  setTxt('kpiLeadsTotal', stateLeads.length);
  setTxt('kpiLeadsNovos', novos);
  setTxt('kpiLeadsAtendimento', stateLeads.length - novos);

  const tb = document.getElementById('tableLeads');
  if (!tb) return;

  tb.innerHTML = filtrados.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhum lead capturado ainda.</td></tr>'
    : filtrados.map(l => {
        const origem = String(l.utm_source || '').toLowerCase();
        const isGoogleAds = origem.includes('google');
        const badgeOrigem = isGoogleAds
          ? `<span class="fg-badge blue" style="margin-left:6px;">Google Ads${l.utm_campaign ? ` • ${escapeHtml(l.utm_campaign)}` : ''}</span>`
          : (l.utm_source ? `<span class="fg-badge gray" style="margin-left:6px;">${escapeHtml(l.utm_source)}</span>` : '');

        return `<tr>
          <td><strong>${escapeHtml(l.nome)}</strong>${badgeOrigem}</td>
          <td>${escapeHtml(l.whatsapp)}</td>
          <td>${escapeHtml(l.segmento || '—')}</td>
          <td>${escapeHtml(l.tamanho_alunos || '—')}</td>
          <td><span class="fg-badge blue">${escapeHtml(l.status || 'Novo')}</span></td>
        </tr>`;
      }).join('');
}

function renderHeatmapMovimento(stats = {}, historico = []) {
  const container = document.getElementById('heatmapGridContainer');
  if (!container) return;

  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const faixas = ['06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
  const grid = stats.grid && Object.keys(stats.grid).length ? { ...stats.grid } : {};

  if (!Object.keys(grid).length && Array.isArray(historico)) {
    historico.forEach(h => {
      if (h.tipo && h.tipo !== 'ENTRADA') return;
      const dt = h.data_hora ? new Date(h.data_hora) : null;
      if (!dt || Number.isNaN(dt.getTime())) return;
      const diaIdx = (dt.getDay() + 6) % 7;
      const hora = dt.getHours();
      const faixaIdx = Math.min(8, Math.max(0, Math.floor((hora - 6) / 2)));
      const key = `${diaIdx}-${faixaIdx}`;
      grid[key] = (grid[key] || 0) + 1;
    });
  }

  const maxCel = Math.max(1, Number(stats.maxCelula || 0), ...Object.values(grid).map(Number));

  let html = `<div style="display:grid;grid-template-columns:42px repeat(9,1fr);gap:5px;align-items:center;">`;
  html += `<div></div>` + faixas.map(f => `<div style="text-align:center;font-size:0.7rem;color:var(--fg-text-muted);font-weight:600;">${f}</div>`).join('');

  dias.forEach((dia, dIdx) => {
    html += `<div style="font-size:0.74rem;font-weight:600;color:var(--fg-text-sec);">${dia}</div>`;
    faixas.forEach((faixa, fIdx) => {
      const val = Number(grid[`${dIdx}-${fIdx}`] ?? grid[`${dia}-${faixa}`] ?? 0);
      let bg = 'var(--fg-surface-muted)';
      if (val > 0) {
        const ratio = val / maxCel;
        if (ratio >= 0.75) bg = '#3b82f6';
        else if (ratio >= 0.4) bg = '#93c5fd';
        else bg = '#dbeafe';
      }
      html += `<div title="${dia} às ${faixa}: ${val} acesso(s)" style="height:22px;border-radius:5px;background:${bg};border:1px solid var(--fg-border);transition:transform 0.15s;"></div>`;
    });
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderCatraca(status = {}, stats = {}) {
  const presentes = Number(status.totalPresentes || 0);
  const historico = Array.isArray(status.historico) ? status.historico : [];
  const entradas = historico.filter(h => h.tipo === 'ENTRADA').length;
  const saidas = historico.filter(h => h.tipo === 'SAIDA').length;
  const totalAcessos = Number(stats.totalAcessos || entradas);

  setTxt('navBadgePresentes', presentes);
  setTxt('metric-recursos', presentes);
  setTxt('kpiPresentesSub', presentes > 0 ? `${presentes} aluno(s) treinando` : 'Nenhum treino em andamento');
  setTxt('kpiCatracaPresentes', presentes);
  setTxt('kpiCatracaPresentesSub', presentes > 0 ? `${presentes} aluno(s) na unidade` : 'Nenhum treino em andamento');
  setTxt('kpiCatracaEntradas', entradas);
  setTxt('kpiCatracaSaidas', saidas);
  setTxt('kpiAcessosMes', totalAcessos);
  setTxt('heatmap-status-badge', `${totalAcessos} acessos`);
  setTxt('heatmapTotalFoot', `${totalAcessos} acessos registrados`);

  renderHeatmapMovimento(stats, historico);

  const tbLogs = document.getElementById('tableCatracaLogs');
  if (tbLogs) {
    tbLogs.innerHTML = historico.length === 0
      ? '<tr><td colspan="4" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhuma movimentação registrada ainda.</td></tr>'
      : historico.slice(0, 20).map(h => {
          const hora = h.data_hora ? new Date(h.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
          const isEntrada = h.tipo === 'ENTRADA';
          return `<tr>
            <td>${hora}</td>
            <td><strong>${escapeHtml(h.aluno_nome || 'Aluno')}</strong></td>
            <td><span class="fg-badge ${isEntrada ? 'green' : 'yellow'}">${escapeHtml(h.tipo || 'ENTRADA')}</span></td>
            <td>${isEntrada ? 'Na academia' : 'Treino finalizado'}</td>
          </tr>`;
        }).join('');
  }

  const tbAlunosCatraca = document.getElementById('tableCatracaAlunos');
  if (tbAlunosCatraca) {
    const ranking = Array.isArray(stats.rankingAlunos) ? stats.rankingAlunos : [];
    tbAlunosCatraca.innerHTML = stateMembers.length === 0
      ? '<tr><td colspan="5" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhum aluno cadastrado.</td></tr>'
      : stateMembers.map(m => {
          const rk = ranking.find(r => String(r.aluno_id || r.id) === String(m.id));
          const logsAluno = historico.filter(h => String(h.aluno_id) === String(m.id) && h.tipo === 'ENTRADA');
          const totalEntradas = rk ? Number(rk.total || rk.acessos || 0) : logsAluno.length;
          const ultimo = logsAluno[0]?.data_hora
            ? new Date(logsAluno[0].data_hora).toLocaleDateString('pt-BR')
            : 'Sem registro';
          return `<tr>
            <td><strong>${escapeHtml(m.name)}</strong></td>
            <td>${escapeHtml(m.plan || 'Mensal')}</td>
            <td><span class="fg-badge ${m.status === 'Ativo' ? 'green' : 'yellow'}">${escapeHtml(m.status || 'Ativo')}</span></td>
            <td>${totalEntradas}</td>
            <td>${ultimo}</td>
          </tr>`;
        }).join('');
  }
}

function renderAvisos(lista = []) {
  const tb = document.getElementById('tableAnnouncements');
  if (!tb) return;

  tb.innerHTML = lista.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:var(--fg-text-muted);padding:1.5rem;">Nenhum comunicado publicado.</td></tr>'
    : lista.map(a => `<tr>
        <td><strong>${escapeHtml(a.title)}</strong></td>
        <td><span class="fg-badge blue">${escapeHtml(a.audience || 'Todos')}</span></td>
        <td>${escapeHtml(a.message)}</td>
        <td><button type="button" class="fg-btn fg-btn-outline" style="padding:0.35rem 0.65rem;font-size:0.75rem;color:var(--fg-danger);" onclick="excluirAviso('${escapeHtml(a.id)}')">Excluir</button></td>
      </tr>`).join('');
}

document.getElementById('formAnn')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await reqAdmin('/api/announcements', 'POST', {
      title: document.getElementById('annTitle').value.trim(),
      audience: document.getElementById('annAudience').value,
      message: document.getElementById('annMsg').value.trim()
    });
    e.target.reset();
    showToast('Comunicado publicado!');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function excluirAviso(id) {
  try {
    await reqAdmin(`/api/announcements/${id}`, 'DELETE');
    showToast('Aviso removido.');
    await carregarTudo();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── CARREGAMENTO INICIAL COMPLETO ───────────────────────────────────────────
async function carregarTudo() {
  const academyName = localStorage.getItem('fit_academy_name') || 'Minha academia';
  setTxt('sidebarAcademyName', academyName);

  if (isDemo) {
    const demoBanner = document.getElementById('demoBanner');
    if (demoBanner) demoBanner.style.display = 'block';
  }

  try {
    const [members, equipamentos, reservas, financeiro, despesas, leads, catracaStatus, catracaStats, avisos] = await Promise.all([
      reqAdmin('/api/members').catch(() => []),
      reqAdmin('/api/equipamentos').catch(() => []),
      reqAdmin('/api/reservas').catch(() => []),
      reqAdmin('/api/financeiro').catch(() => ({})),
      reqAdmin('/api/despesas').catch(() => []),
      reqAdmin('/api/leads').catch(() => []),
      reqAdmin('/api/catraca/status').catch(() => ({})),
      reqAdmin('/api/catraca/estatisticas').catch(() => ({})),
      reqAdmin('/api/announcements').catch(() => [])
    ]);

    stateMembers = Array.isArray(members) ? members : [];
    stateEquipamentos = Array.isArray(equipamentos) ? equipamentos : [];
    stateReservas = Array.isArray(reservas) ? reservas : [];
    stateDespesas = Array.isArray(despesas) ? despesas : [];
    stateLeads = Array.isArray(leads) ? leads : [];

    renderPlanos();
    renderTabelaAlunos();
    renderTabelaVencimentos();
    renderEquipamentos();
    renderReservas();
    renderFinanceiro(financeiro);
    renderTabelaDespesas();
    renderTabelaLeads();
    renderCatraca(catracaStatus, catracaStats);
    renderAvisos(Array.isArray(avisos) ? avisos : []);
  } catch (err) {
    console.error('Erro ao carregar painel do gestor:', err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const despMesInput = document.getElementById('despMes');
  if (despMesInput && !despMesInput.value) despMesInput.value = mesAtual;

  setTxt('footerDataAtual', hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));

  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) handleGlobalSearch(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const primeiro = document.querySelector('#globalSearchDropdown .fg-search-item');
        if (primeiro) selecionarRecursoBusca(primeiro.getAttribute('data-view'));
      } else if (e.key === 'Escape') {
        document.getElementById('globalSearchDropdown')?.classList.remove('open');
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.fg-search-bar')) {
      document.getElementById('globalSearchDropdown')?.classList.remove('open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  const fontBtn = document.getElementById('fontButton');
  if (fontBtn) {
    const syncHtmlFont = () => {
      const isLarge = document.body.classList.contains('large-font') || localStorage.getItem('fit_large_font') === 'true';
      document.documentElement.classList.toggle('large-font', isLarge);
      document.body.classList.toggle('large-font', isLarge);
      fontBtn.setAttribute('aria-pressed', isLarge ? 'true' : 'false');
    };
    syncHtmlFont();
    fontBtn.addEventListener('click', () => {
      setTimeout(() => {
        const ativo = document.body.classList.contains('large-font');
        document.documentElement.classList.toggle('large-font', ativo);
      }, 0);
    });
  }

  carregarTudo();
});