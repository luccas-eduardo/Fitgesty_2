/* ==========================================================================
   FitGesty — aluno.js (100% alinhado com server.js V3.0)
   - Balões individuais por exercício (+100 XP por exercício concluído)
   - 10.000 XP para subir de nível
   - Finalizar treino salva no Supabase (/api/aluno/treinos), atualiza métricas e dá baixa silenciosa
   - Biometria integrada com GET /api/biometric/challenge + POST /api/biometric/register
   ========================================================================== */

const alunoRole = localStorage.getItem('fit_role');
if (alunoRole !== 'aluno') {
  window.location.href = '/login.html';
}

const XP_POR_EXERCICIO = 100;
const XP_POR_NIVEL = 10000;

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
  toast.style.cssText = `padding:12px 16px;border-radius:10px;font-size:0.84rem;font-weight:600;color:#fff;background:${isError ? '#dc2626' : '#16a34a'};box-shadow:0 10px 25px rgba(15,23,42,0.18);`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

async function reqAluno(url, method = 'GET', body = null) {
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

// ── FICHAS A, B, C, D (CADA EXERCÍCIO É UM BALÃO CLICÁVEL) ──────────────────
const FICHAS_PADRAO = {
  A: {
    grupo: 'Peito e Tríceps',
    minutos: 45,
    exercicios: [
      { id: 'a1', nome: 'Supino reto', series: '4x10', concluido: false },
      { id: 'a2', nome: 'Supino inclinado com halteres', series: '3x12', concluido: false },
      { id: 'a3', nome: 'Crucifixo máquina', series: '3x12', concluido: false },
      { id: 'a4', nome: 'Tríceps corda', series: '4x12', concluido: false },
      { id: 'a5', nome: 'Tríceps testa', series: '3x10', concluido: false }
    ]
  },
  B: {
    grupo: 'Costas e Bíceps',
    minutos: 45,
    exercicios: [
      { id: 'b1', nome: 'Puxada frontal', series: '4x10', concluido: false },
      { id: 'b2', nome: 'Remada baixa', series: '3x12', concluido: false },
      { id: 'b3', nome: 'Remada unilateral', series: '3x10', concluido: false },
      { id: 'b4', nome: 'Rosca direta', series: '4x12', concluido: false },
      { id: 'b5', nome: 'Rosca martelo', series: '3x12', concluido: false }
    ]
  },
  C: {
    grupo: 'Pernas Completo',
    minutos: 55,
    exercicios: [
      { id: 'c1', nome: 'Agachamento livre', series: '4x10', concluido: false },
      { id: 'c2', nome: 'Leg press 45°', series: '4x12', concluido: false },
      { id: 'c3', nome: 'Cadeira extensora', series: '3x15', concluido: false },
      { id: 'c4', nome: 'Mesa flexora', series: '3x12', concluido: false },
      { id: 'c5', nome: 'Panturrilha em pé', series: '4x15', concluido: false }
    ]
  },
  D: {
    grupo: 'Ombros, Abdômen e Cardio',
    minutos: 40,
    exercicios: [
      { id: 'd1', nome: 'Desenvolvimento com halteres', series: '4x10', concluido: false },
      { id: 'd2', nome: 'Elevação lateral', series: '4x12', concluido: false },
      { id: 'd3', nome: 'Elevação frontal', series: '3x12', concluido: false },
      { id: 'd4', nome: 'Prancha isométrica', series: '3x45s', concluido: false },
      { id: 'd5', nome: 'Esteira moderada', series: '15 min', concluido: false }
    ]
  }
};

let alunoUserId = localStorage.getItem('fit_user_id') || 'default';
let fichaAtual = 'A';
let fichasSalvas = JSON.parse(JSON.stringify(FICHAS_PADRAO));
let emEdicaoFicha = false;
let xpBaseServidor = 0;

function chaveStorageFichas() {
  return `fitgesty_fichas_v2_${alunoUserId}`;
}

function chaveStorageXpLocal() {
  return `fitgesty_xp_exercicios_${alunoUserId}`;
}

function getXpExerciciosLocal() {
  return Math.max(0, Number(localStorage.getItem(chaveStorageXpLocal()) || 0));
}

function setXpExerciciosLocal(val) {
  localStorage.setItem(chaveStorageXpLocal(), String(Math.max(0, Number(val) || 0)));
  atualizarBarraXpENivel();
}

function atualizarBarraXpENivel() {
  const xpTotal = xpBaseServidor + getXpExerciciosLocal();
  const nivel = Math.floor(xpTotal / XP_POR_NIVEL) + 1;
  const xpNoNivelAtual = xpTotal % XP_POR_NIVEL;
  const faltam = XP_POR_NIVEL - xpNoNivelAtual;
  const pct = Math.min(100, Math.round((xpNoNivelAtual / XP_POR_NIVEL) * 100));

  const tierEl = document.getElementById('alunoTierBanner');
  const subEl = document.getElementById('alunoXpBannerText');
  const fillEl = document.getElementById('alunoXpFill');

  if (tierEl) {
    tierEl.textContent = `Nível ${nivel} • ${xpTotal.toLocaleString('pt-BR')} / ${(nivel * XP_POR_NIVEL).toLocaleString('pt-BR')} XP`;
  }
  if (subEl) {
    subEl.textContent = `Faltam ${faltam.toLocaleString('pt-BR')} XP para alcançar o Nível ${nivel + 1}.`;
  }
  if (fillEl) {
    fillEl.style.width = `${Math.max(2, pct)}%`;
  }
}

function carregarFichasSalvas() {
  try {
    const raw = localStorage.getItem(chaveStorageFichas());
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const letra of ['A', 'B', 'C', 'D']) {
        if (parsed[letra]) {
          fichasSalvas[letra] = {
            grupo: parsed[letra].grupo || FICHAS_PADRAO[letra].grupo,
            minutos: Number(parsed[letra].minutos || FICHAS_PADRAO[letra].minutos),
            exercicios: Array.isArray(parsed[letra].exercicios)
              ? parsed[letra].exercicios
              : JSON.parse(JSON.stringify(FICHAS_PADRAO[letra].exercicios))
          };
        }
      }
    }
    const ultima = localStorage.getItem(`${chaveStorageFichas()}_ativa`);
    if (ultima && ['A', 'B', 'C', 'D'].includes(ultima)) {
      fichaAtual = ultima;
    }
  } catch {
    fichasSalvas = JSON.parse(JSON.stringify(FICHAS_PADRAO));
  }
  renderFichaSelecionada();
}

function salvarFichasNoStorage() {
  localStorage.setItem(chaveStorageFichas(), JSON.stringify(fichasSalvas));
  localStorage.setItem(`${chaveStorageFichas()}_ativa`, fichaAtual);
}

function selecionarFichaTreino(letra) {
  if (!['A', 'B', 'C', 'D'].includes(letra)) return;
  fichaAtual = letra;
  localStorage.setItem(`${chaveStorageFichas()}_ativa`, fichaAtual);
  alternarModoEdicaoFicha(false);
  renderFichaSelecionada();
}

function alternarConcluirExercicio(idx) {
  const ficha = fichasSalvas[fichaAtual];
  if (!ficha || !ficha.exercicios[idx]) return;

  const ex = ficha.exercicios[idx];
  ex.concluido = !ex.concluido;
  salvarFichasNoStorage();

  const xpAtual = getXpExerciciosLocal();
  if (ex.concluido) {
    setXpExerciciosLocal(xpAtual + XP_POR_EXERCICIO);
    showToast(`${ex.nome} concluído! +${XP_POR_EXERCICIO} XP`);
  } else {
    setXpExerciciosLocal(Math.max(0, xpAtual - XP_POR_EXERCICIO));
  }

  renderFichaSelecionada();
}

function renderFichaSelecionada() {
  document.querySelectorAll('.fg-ficha-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-ficha') === fichaAtual);
  });

  const f = fichasSalvas[fichaAtual] || FICHAS_PADRAO[fichaAtual];
  const tit = document.getElementById('fichaTituloDisplay');
  const dur = document.getElementById('fichaDuracaoDisplay');
  const prog = document.getElementById('fichaProgressoDisplay');
  const container = document.getElementById('fichaExerciciosBubbles');

  const concluidos = f.exercicios.filter(e => e.concluido).length;
  const total = f.exercicios.length;

  if (tit) tit.textContent = `Treino ${fichaAtual} — ${f.grupo}`;
  if (dur) dur.textContent = `${f.minutos} min`;
  if (prog) prog.textContent = `${concluidos}/${total} concluídos`;

  if (container) {
    container.innerHTML = f.exercicios.length === 0
      ? '<p style="color:var(--fg-text-muted);font-size:0.84rem;margin:0;">Nenhum exercício nesta ficha. Clique em "Editar treino" para adicionar.</p>'
      : f.exercicios.map((ex, idx) => `
          <div class="fg-ex-bubble ${ex.concluido ? 'done' : ''}" role="checkbox" aria-checked="${ex.concluido}" tabindex="0" onclick="alternarConcluirExercicio(${idx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();alternarConcluirExercicio(${idx});}">
            <div style="display:flex;align-items:center;gap:0.75rem;min-width:0;">
              <span class="fg-ex-check">
                <svg class="fg-svg-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <div style="min-width:0;">
                <div class="fg-ex-name" style="font-size:0.88rem;font-weight:600;">${escapeHtml(ex.nome)}</div>
                <div style="font-size:0.76rem;color:var(--fg-text-sec);">${escapeHtml(ex.series)}</div>
              </div>
            </div>
            <span class="fg-badge ${ex.concluido ? 'green' : 'blue'}">${ex.concluido ? '+100 XP ganho' : '+100 XP'}</span>
          </div>
        `).join('');
  }
}

function adicionarLinhaExercicioEditor(nome = '', series = '3x12', concluido = false) {
  const wrap = document.getElementById('editorExerciciosContainer');
  if (!wrap) return;
  const row = document.createElement('div');
  row.className = 'fg-ex-edit-row';
  row.setAttribute('data-concluido', concluido ? '1' : '0');
  row.innerHTML = `
    <input type="text" class="fg-input ed-ex-nome" value="${escapeHtml(nome)}" placeholder="Nome do exercício" required>
    <input type="text" class="fg-input ed-ex-series" value="${escapeHtml(series)}" placeholder="Séries (ex: 4x10)" required>
    <button type="button" class="fg-btn fg-btn-outline" style="padding:0.55rem 0.7rem;color:var(--fg-danger);" onclick="this.parentElement.remove()" title="Remover exercício">✕</button>
  `;
  wrap.appendChild(row);
}

function alternarModoEdicaoFicha(forcarEstado) {
  emEdicaoFicha = typeof forcarEstado === 'boolean' ? forcarEstado : !emEdicaoFicha;
  const viewBox = document.getElementById('fichaViewBox');
  const formEdit = document.getElementById('formEditarFicha');
  const btnEdit = document.getElementById('btnToggleEditarFicha');

  if (viewBox) viewBox.style.display = emEdicaoFicha ? 'none' : 'block';
  if (formEdit) formEdit.style.display = emEdicaoFicha ? 'block' : 'none';
  if (btnEdit) btnEdit.style.display = emEdicaoFicha ? 'none' : 'inline-flex';

  if (emEdicaoFicha) {
    const f = fichasSalvas[fichaAtual] || FICHAS_PADRAO[fichaAtual];
    document.getElementById('fichaGrupoInput').value = f.grupo;
    document.getElementById('fichaMinutosInput').value = f.minutos;
    const wrap = document.getElementById('editorExerciciosContainer');
    wrap.innerHTML = '';
    f.exercicios.forEach(ex => adicionarLinhaExercicioEditor(ex.nome, ex.series, ex.concluido));
  }
}

document.getElementById('formEditarFicha')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const grupo = document.getElementById('fichaGrupoInput').value.trim();
  const minutos = Math.max(5, Math.min(300, Number(document.getElementById('fichaMinutosInput').value) || 45));

  const novosExercicios = [];
  document.querySelectorAll('#editorExerciciosContainer .fg-ex-edit-row').forEach((row, idx) => {
    const nome = row.querySelector('.ed-ex-nome')?.value.trim();
    const series = row.querySelector('.ed-ex-series')?.value.trim() || '3x12';
    const concluido = row.getAttribute('data-concluido') === '1';
    if (nome) {
      novosExercicios.push({ id: `${fichaAtual}_${idx}_${Date.now()}`, nome, series, concluido });
    }
  });

  if (novosExercicios.length === 0) {
    return showToast('Adicione pelo menos 1 exercício na ficha.', 'error');
  }

  fichasSalvas[fichaAtual] = { grupo, minutos, exercicios: novosExercicios };
  salvarFichasNoStorage();
  alternarModoEdicaoFicha(false);
  renderFichaSelecionada();
  showToast(`Treino ${fichaAtual} atualizado e salvo.`);
});

// ── FINALIZAR TREINO (POST /api/aluno/treinos -> ATUALIZA RESUMO + BAIXA) ────
document.getElementById('btnFinalizarTreino')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnFinalizarTreino');
  const f = fichasSalvas[fichaAtual] || FICHAS_PADRAO[fichaAtual];
  const concluidos = f.exercicios.filter(e => e.concluido).length;

  // Se o aluno finalizou o treino sem marcar exercício por exercício, credita os +100 XP de cada um
  if (concluidos === 0 && f.exercicios.length > 0) {
    setXpExerciciosLocal(getXpExerciciosLocal() + f.exercicios.length * XP_POR_EXERCICIO);
  }

  const tituloTreino = `Treino ${fichaAtual} — ${f.grupo}`;
  const minutosTreino = Number(f.minutos || 45);

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Finalizando treino...';
  }

  try {
    const resp = await reqAluno('/api/aluno/treinos', 'POST', {
      tipo: tituloTreino,
      minutos: minutosTreino,
      finalizarSaida: true
    });

    // Reseta os balões da ficha para o próximo dia de treino
    f.exercicios.forEach(e => { e.concluido = false; });
    salvarFichasNoStorage();
    renderFichaSelecionada();

    if (resp && resp.resumo) {
      aplicarResumoNaTela(resp.resumo);
    } else {
      await carregarDadosAluno();
    }

    showToast(`Treino ${fichaAtual} finalizado! +${minutosTreino} min registrados.`);
  } catch (err) {
    showToast(err.message || 'Não foi possível finalizar o treino.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Finalizar treino';
    }
  }
});

// ── RENDERIZAÇÃO DAS MÉTRICAS DO RESUMO (/api/aluno/resumo) ─────────────────
function aplicarResumoNaTela(resumo = {}) {
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  xpBaseServidor = Number(resumo.xp || 0);
  atualizarBarraXpENivel();

  const minutosHoje = Number(resumo.minutosHoje ?? 0);
  const metaMinutos = Number(resumo.metaMinutos ?? 30);
  const streak = Number(resumo.streak ?? 0);
  const totalTreinos = Number(resumo.totalTreinos ?? 0);
  const totalPresencas = Number(resumo.totalPresencas ?? 0);
  const treinosHoje = Array.isArray(resumo.treinosHoje) ? resumo.treinosHoje : [];

  setTxt('alunoMinutosHoje', `${minutosHoje} min`);
  setTxt('alunoMetaMinutosSub', `Meta diária: ${metaMinutos} min`);
  setTxt('alunoStreak', `${streak} ${streak === 1 ? 'dia' : 'dias'}`);
  setTxt('alunoTotalTreinos', totalTreinos);
  setTxt('alunoTotalPresencas', totalPresencas);

  const tbTreinos = document.getElementById('tableTreinosHoje');
  if (tbTreinos) {
    tbTreinos.innerHTML = treinosHoje.length === 0
      ? '<tr><td colspan="4" style="color:var(--fg-text-muted);text-align:center;padding:1.5rem;">Nenhum treino finalizado hoje ainda.</td></tr>'
      : treinosHoje.map(t => {
          const ref = t.created_at || t.data_hora;
          const hora = ref
            ? new Date(ref).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : 'Hoje';
          return `<tr>
            <td style="color:var(--fg-text-sec);">${hora}</td>
            <td><strong>${escapeHtml(t.tipo || 'Treino')}</strong></td>
            <td>${Number(t.minutos || 0)} min</td>
            <td><span class="fg-badge green">Concluído</span></td>
          </tr>`;
        }).join('');
  }
}

async function carregarDadosAluno() {
  const nome = localStorage.getItem('fit_user_name') || 'Aluno';
  const primeiroNome = nome.split(' ')[0];
  const academyName = localStorage.getItem('fit_academy_name') || 'Academia FitGesty';

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('alunoAcademyName', academyName);
  setTxt('alunoHeaderName', nome);
  setTxt('alunoAvatarInitial', primeiroNome.charAt(0).toUpperCase());
  setTxt('alunoWelcomeTitle', `Olá, ${primeiroNome}!`);

  try {
    const [resumo, avisos] = await Promise.all([
      reqAluno('/api/aluno/resumo'),
      reqAluno('/api/announcements').catch(() => [])
    ]);

    aplicarResumoNaTela(resumo);

    const listaAvisosData = Array.isArray(avisos) ? avisos : [];
    const resumoAvisos = document.getElementById('alunoAvisosResumo');
    if (resumoAvisos) {
      resumoAvisos.innerHTML = listaAvisosData.length === 0
        ? '<p style="color:var(--fg-text-muted);font-size:0.84rem;">Nenhum comunicado recente.</p>'
        : listaAvisosData.slice(0, 3).map(a => `
            <div style="padding:0.85rem;border-radius:10px;background:var(--fg-surface-muted);border:1px solid var(--fg-border);">
              <div style="font-size:0.86rem;font-weight:700;color:var(--fg-text);margin-bottom:3px;">${escapeHtml(a.title)}</div>
              <div style="font-size:0.8rem;color:var(--fg-text-sec);">${escapeHtml(a.message)}</div>
            </div>
          `).join('');
    }

    const listaAvisos = document.getElementById('listaAvisosCompletos');
    if (listaAvisos) {
      listaAvisos.innerHTML = listaAvisosData.length === 0
        ? '<article class="fg-card"><p style="color:var(--fg-text-muted);margin:0;">Nenhum aviso publicado pela academia.</p></article>'
        : listaAvisosData.map(a => `
            <article class="fg-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
                <h3 class="fg-card-title">${escapeHtml(a.title)}</h3>
                <span class="fg-badge blue">${escapeHtml(a.audience || 'Todos')}</span>
              </div>
              <p style="margin:0;font-size:0.86rem;color:var(--fg-text-sec);">${escapeHtml(a.message)}</p>
            </article>
          `).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar resumo do aluno:', err);
  }
}

// ── CADASTRO DE BIOMETRIA (GET /api/biometric/challenge + POST /api/biometric/register) ──
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

document.getElementById('btnRegisterBiometric')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnRegisterBiometric');
  const msgEl = document.getElementById('biometricStatusMsg');

  if (!window.isSecureContext) {
    const aviso = 'A biometria exige acesso por http://localhost:3000 ou HTTPS.';
    if (msgEl) msgEl.textContent = aviso;
    return showToast(aviso, 'error');
  }

  if (!window.PublicKeyCredential) {
    const aviso = 'Este navegador ou dispositivo não suporta autenticação biométrica.';
    if (msgEl) msgEl.textContent = aviso;
    return showToast(aviso, 'error');
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Aguardando leitura biométrica...';
  }

  try {
    const { challenge } = await reqAluno('/api/biometric/challenge', 'GET');
    const userName = localStorage.getItem('fit_user_name') || 'Aluno FitGesty';
    const userId = localStorage.getItem('fit_user_id') || `aluno_${Date.now()}`;

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: base64urlToBuffer(challenge),
        rp: { name: 'FitGesty' },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred'
        },
        timeout: 60000
      }
    });

    const credentialId = cred.id || bufferToBase64url(cred.rawId);
    const resp = await reqAluno('/api/biometric/register', 'POST', { credentialId });

    localStorage.setItem('fit_biometric_cred_id', credentialId);
    showToast(resp.message || 'Biometria cadastrada com sucesso!');
    if (msgEl) msgEl.textContent = resp.message || 'Biometria ativada neste aparelho.';
  } catch (err) {
    const texto = err.name === 'NotAllowedError'
      ? 'Leitura biométrica cancelada ou tempo esgotado.'
      : (err.message || 'Erro ao cadastrar biometria.');
    if (msgEl) msgEl.textContent = texto;
    showToast(texto, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Cadastrar Biometria neste dispositivo';
    }
  }
});

window.onload = () => {
  carregarFichasSalvas();
  carregarDadosAluno();
};