/*
  =============================================================================
  FitGesty — Camada de Persistência Cloud Multi-Tenant (Supabase PostgreSQL)
  Hierarquia SaaS: Super Admin (Dono do Software) -> Admin (Academia) -> Aluno
  =============================================================================
*/

const crypto = require('node:crypto');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

function hashPassword(password) {
  const cleanPass = String(password || '').trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(cleanPass, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const cleanPass = String(password || '').trim();
  const cleanStored = String(stored).trim();

  if (!cleanStored.includes(':')) {
    const sha256 = crypto.createHash('sha256').update(cleanPass).digest('hex');
    return cleanPass === cleanStored || sha256 === cleanStored;
  }

  const [salt, key] = cleanStored.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(cleanPass, salt, 64);
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

async function sbFetch(table, { method = 'GET', query = '', body = null, single = false } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_KEY não configuradas.');
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  if (single) headers['Accept'] = 'application/vnd.pgrst.object+json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    if (single && res.status === 406) return null;
    const msg = data?.message || data?.details || `Erro Supabase HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

function isMissingTable(err) {
  return err && (err.code === 'PGRST205' || err.code === '42P01' || /could not find the table|does not exist/i.test(err.message || ''));
}

async function orFallback(promise, fallback) {
  try { return await promise; } catch (err) { if (isMissingTable(err)) return fallback; throw err; }
}

function mapUser(row) {
  if (Array.isArray(row)) row = row[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash || row.password || null,
    role: row.role,
    academyId: row.academy_id || null,
    memberId: row.member_id || null,
    biometricCredentialId: row.biometric_credential_id,
    createdAt: row.created_at
  };
}

function mapMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    academyId: row.academy_id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    plan: row.plan,
    status: row.status,
    accessibilityNeeds: row.accessibility_needs || 'Nenhuma informada',
    createdAt: row.created_at
  };
}

function mapEquipamento(row) {
  if (!row) return null;
  return {
    id: row.id,
    academyId: row.academy_id,
    name: row.nome,
    category: row.categoria,
    quantity: Number(row.quantidade || 1),
    status: row.situacao,
    notes: row.observacao || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

function mapAnnouncement(row) {
  if (!row) return null;
  return {
    id: row.id,
    academyId: row.academy_id,
    title: row.title,
    audience: row.audience,
    message: row.message,
    createdAt: row.created_at
  };
}

// ── INICIALIZAÇÃO DO LOGIN MESTRE (SUPER ADMIN) ───────────────────────────
async function initDb() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const masterEmail = (process.env.SUPER_ADMIN_EMAIL || 'mestre@fitgesty.com').trim().toLowerCase();
  const masterPass = process.env.SUPER_ADMIN_PASSWORD || 'mestre123';

  try {
    const existingMaster = await getUserByEmail(masterEmail);
    if (!existingMaster) {
      await sbFetch('users', {
        method: 'POST',
        single: true,
        body: {
          id: crypto.randomUUID(),
          name: 'Dono FitGesty (Login Mestre)',
          email: masterEmail,
          password_hash: hashPassword(masterPass),
          role: 'superadmin',
          created_at: new Date().toISOString()
        }
      });
      console.log(`✓ Login Mestre configurado (${masterEmail})`);
    }
  } catch (err) {
    console.error('Erro ao inicializar Login Mestre:', err.message);
  }
}

// ── GESTÃO DE ACADEMIAS CLIENTES & ADMINS (EXCLUSIVO LOGIN MESTRE) ────────
async function getAcademies() {
  return (await sbFetch('academies', { query: 'order=created_at.desc' })) || [];
}

async function getAcademyById(id) {
  if (!id) return null;
  return await sbFetch('academies', { query: `id=eq.${encodeURIComponent(id)}&limit=1`, single: true });
}

async function createAcademyWithAdmin({ academyName, ownerName, ownerEmail, password, plan = 'Pro' }) {
  const cleanEmail = String(ownerEmail).trim().toLowerCase();
  const cleanPassword = String(password).trim();
  const academyId = crypto.randomUUID();
  const now = new Date().toISOString();

  await sbFetch('users', { method: 'DELETE', query: `email=ilike.${encodeURIComponent(cleanEmail)}` });
  await sbFetch('academies', { method: 'DELETE', query: `owner_email=ilike.${encodeURIComponent(cleanEmail)}` });

  const academy = await sbFetch('academies', {
    method: 'POST',
    single: true,
    body: {
      id: academyId,
      name: String(academyName).trim(),
      owner_name: String(ownerName).trim(),
      owner_email: cleanEmail,
      plan,
      status: 'Ativa',
      created_at: now
    }
  });

  try {
    await sbFetch('users', {
      method: 'POST',
      single: true,
      body: {
        id: crypto.randomUUID(),
        name: String(ownerName).trim(),
        email: cleanEmail,
        password_hash: hashPassword(cleanPassword),
        role: 'admin',
        academy_id: academyId,
        created_at: now
      }
    });
  } catch (err) {
    await sbFetch('academies', { method: 'DELETE', query: `id=eq.${encodeURIComponent(academyId)}` });
    throw new Error(`Falha ao criar login do gestor no Supabase: ${err.message}`);
  }

  return academy;
}

async function upsertAcademyAdmin({ academyId, name, email, password }) {
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();
  const existing = await getUserByEmail(cleanEmail);

  if (existing) {
    return sbFetch('users', {
      method: 'PATCH',
      query: `id=eq.${encodeURIComponent(existing.id)}`,
      single: true,
      body: {
        name: String(name || existing.name).trim(),
        password_hash: hashPassword(cleanPass),
        role: 'admin',
        academy_id: academyId || existing.academyId
      }
    });
  }

  return sbFetch('users', {
    method: 'POST',
    single: true,
    body: {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      email: cleanEmail,
      password_hash: hashPassword(cleanPass),
      role: 'admin',
      academy_id: academyId,
      created_at: new Date().toISOString()
    }
  });
}

async function updateAcademyStatus(id, status) {
  return await sbFetch('academies', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(id)}`,
    single: true,
    body: { status }
  });
}

async function deleteAcademy(id) {
  await sbFetch('users', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` });
  await sbFetch('members', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` });
  await orFallback(sbFetch('despesas', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` }), null);
  await orFallback(sbFetch('equipamentos', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` }), null);
  await orFallback(sbFetch('reservas_equipamentos', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` }), null);
  await orFallback(sbFetch('financeiro_config', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` }), null);
  await orFallback(sbFetch('treinos', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` }), null);
  await orFallback(sbFetch('acessos', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` }), null);
  await sbFetch('announcements', { method: 'DELETE', query: `academy_id=eq.${encodeURIComponent(id)}` });
  await sbFetch('academies', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}` });
  return { id };
}

// ── USUÁRIOS & BIOMETRIA ──────────────────────────────────────────────────
async function getUserByEmail(email) {
  const clean = encodeURIComponent(String(email).trim().toLowerCase());
  const row = await sbFetch('users', { query: `email=eq.${clean}&limit=1`, single: true });
  return mapUser(row);
}

async function getUsersByEmail(email) {
  const clean = encodeURIComponent(String(email).trim().toLowerCase());
  const rows = await sbFetch('users', { query: `email=eq.${clean}` });
  return (rows || []).map(mapUser);
}

async function getUserById(id) {
  const row = await sbFetch('users', { query: `id=eq.${encodeURIComponent(id)}&limit=1`, single: true });
  return mapUser(row);
}

// Cada usuário pode ter VÁRIAS biometrias (celular, PC...). Ficam na tabela
// "biometrias"; a coluna users.biometric_credential_id segue como legado.
async function getUserByCredentialId(credentialId) {
  const cred = await orFallback(sbFetch('biometrias', {
    query: `credential_id=eq.${encodeURIComponent(credentialId)}&limit=1`,
    single: true
  }), null);
  if (cred && cred.user_id) {
    const u = await getUserById(cred.user_id);
    if (u) return u;
  }
  const row = await sbFetch('users', {
    query: `biometric_credential_id=eq.${encodeURIComponent(credentialId)}&limit=1`,
    single: true
  });
  return mapUser(row);
}

async function saveUserBiometric(userId, credentialId, label = '') {
  const existente = await orFallback(sbFetch('biometrias', {
    query: `credential_id=eq.${encodeURIComponent(credentialId)}&limit=1`,
    single: true
  }), null);
  if (existente && String(existente.user_id) !== String(userId)) {
    throw Object.assign(new Error('Esta biometria já está vinculada a outro usuário.'), { validation: true });
  }
  if (!existente) {
    const user = await getUserById(userId);
    await orFallback(sbFetch('biometrias', {
      method: 'POST',
      body: {
        credential_id: credentialId,
        user_id: String(userId),
        academy_id: user?.academyId ? String(user.academyId) : null,
        label: String(label || '').slice(0, 80),
        created_at: new Date().toISOString()
      }
    }), null);
  }
  // legado: mantém a última credencial também na tabela de usuários
  const row = await sbFetch('users', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(userId)}`,
    single: true,
    body: { biometric_credential_id: credentialId }
  });
  return mapUser(row);
}

// ── MEMBERS (ISOLADOS POR ACADEMIA + CRIAÇÃO DE ACESSO DO ALUNO) ──────────
async function getMembers(academyId, query = '') {
  const filters = ['order=created_at.desc'];
  if (academyId) filters.push(`academy_id=eq.${encodeURIComponent(academyId)}`);
  if (query) {
    const q = encodeURIComponent(`*${query}*`);
    filters.push(`or=(name.ilike.${q},email.ilike.${q})`);
  }
  const rows = await sbFetch('members', { query: filters.join('&') });
  return (rows || []).map(mapMember);
}

async function getMemberById(id) {
  const row = await sbFetch('members', { query: `id=eq.${encodeURIComponent(id)}&limit=1`, single: true });
  return mapMember(row);
}

async function insertMemberWithLogin(academyId, data) {
  const cleanEmail = String(data.email).trim().toLowerCase();

  const dup = await sbFetch('members', {
    query: `academy_id=eq.${encodeURIComponent(academyId)}&email=ilike.${encodeURIComponent(cleanEmail)}&limit=1`,
    single: true
  });
  if (dup) {
    const e = new Error(`Este e-mail já está cadastrado nesta academia (aluno: ${dup.name}, status: ${dup.status}).`);
    e.statusCode = 409;
    throw e;
  }

  const memberId = crypto.randomUUID();
  const now = new Date().toISOString();

  const row = await sbFetch('members', {
    method: 'POST',
    single: true,
    body: {
      id: memberId,
      academy_id: academyId,
      name: data.name,
      email: cleanEmail,
      phone: data.phone || '',
      plan: data.plan || 'Mensal',
      status: data.status || 'Ativo',
      accessibility_needs: data.accessibilityNeeds || 'Nenhuma informada',
      created_at: now
    }
  });

  if (data.password && String(data.password).trim().length >= 4) {
    const existingInAcademy = await sbFetch('users', {
      query: `academy_id=eq.${encodeURIComponent(academyId)}&email=ilike.${encodeURIComponent(cleanEmail)}&role=eq.aluno&limit=1`,
      single: true
    });
    if (!existingInAcademy) {
      await sbFetch('users', {
        method: 'POST',
        single: true,
        body: {
          id: crypto.randomUUID(),
          name: data.name,
          email: cleanEmail,
          password_hash: hashPassword(data.password),
          role: 'aluno',
          academy_id: academyId,
          member_id: memberId,
          created_at: now
        }
      });
    }
  }

  return mapMember(row);
}

async function updateMember(id, data) {
  const patch = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) patch.status = data.status;
  if (data.plan !== undefined) patch.plan = data.plan;
  const row = await sbFetch('members', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(id)}`,
    single: true,
    body: patch
  });
  return mapMember(row);
}

async function deleteMember(id) {
  await orFallback(sbFetch('treinos', { method: 'DELETE', query: `aluno_id=eq.${encodeURIComponent(id)}` }), null);
  await orFallback(sbFetch('acessos', { method: 'DELETE', query: `aluno_id=eq.${encodeURIComponent(id)}` }), null);
  await sbFetch('users', { method: 'DELETE', query: `member_id=eq.${encodeURIComponent(id)}` });
  await sbFetch('members', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}` });
  return { id };
}

// ── EQUIPAMENTOS & RESERVAS (ISOLADOS POR ACADEMIA) ───────────────────────
const EQUIP_SITUACOES = ['Operacional', 'Em manutenção', 'Quebrado', 'Fora de uso'];
const EQUIP_CATEGORIAS = ['Musculação', 'Cardio', 'Funcional', 'Outro'];

async function getEquipamentos(academyId) {
  const q = academyId ? `academy_id=eq.${encodeURIComponent(academyId)}&order=created_at.desc` : 'order=created_at.desc';
  const rows = await sbFetch('equipamentos', { query: q });
  return (rows || []).map(mapEquipamento);
}

async function insertEquipamento(academyId, data) {
  const nome = String(data.name || '').trim();
  if (!nome) throw new Error('Informe o nome do equipamento.');
  const situacao = EQUIP_SITUACOES.includes(data.status) ? data.status : 'Operacional';
  const categoria = EQUIP_CATEGORIAS.includes(data.category) ? data.category : 'Outro';
  const quantidade = Math.max(1, Math.min(500, Math.round(Number(data.quantity) || 1)));

  const row = await sbFetch('equipamentos', {
    method: 'POST',
    single: true,
    body: {
      id: crypto.randomUUID(),
      academy_id: academyId,
      nome,
      categoria,
      quantidade,
      situacao,
      observacao: String(data.notes || '').trim().slice(0, 300),
      created_at: new Date().toISOString()
    }
  });
  return mapEquipamento(row);
}

async function updateEquipamento(academyId, id, data) {
  const patch = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) {
    if (!EQUIP_SITUACOES.includes(data.status)) throw new Error('Situação inválida.');
    patch.situacao = data.status;
  }
  if (data.quantity !== undefined) {
    patch.quantidade = Math.max(1, Math.min(500, Math.round(Number(data.quantity) || 1)));
  }
  if (data.notes !== undefined) patch.observacao = String(data.notes).trim().slice(0, 300);
  const row = await sbFetch('equipamentos', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(id)}&academy_id=eq.${encodeURIComponent(academyId)}`,
    single: true,
    body: patch
  });
  return mapEquipamento(row);
}

async function deleteEquipamento(academyId, id) {
  await sbFetch('equipamentos', {
    method: 'DELETE',
    query: `id=eq.${encodeURIComponent(id)}&academy_id=eq.${encodeURIComponent(academyId)}`
  });
  return { id };
}

async function getReservasEquipamentos(academyId) {
  const rows = await orFallback(
    sbFetch('reservas_equipamentos', {
      query: `academy_id=eq.${encodeURIComponent(academyId)}&order=data_reserva.desc,horario.asc&limit=200`
    }),
    []
  );
  return rows || [];
}

async function criarReservaEquipamento(academyId, data) {
  const equipId = String(data.equipamentoId || '').trim();
  const qtdSolicitada = Math.max(1, Math.round(Number(data.quantidade) || 1));
  const dataReserva = String(data.dataReserva || '').trim();
  const horario = String(data.horario || '').trim();

  if (!equipId || !dataReserva || !horario) {
    throw new Error('Selecione o equipamento, a data e o horário.');
  }

  const equip = await sbFetch('equipamentos', {
    query: `id=eq.${encodeURIComponent(equipId)}&academy_id=eq.${encodeURIComponent(academyId)}&limit=1`,
    single: true
  });
  if (!equip) throw new Error('Equipamento não encontrado nesta academia.');
  if (equip.situacao !== 'Operacional') {
    throw new Error(`Equipamento indisponível para reserva (Situação: ${equip.situacao}).`);
  }

  const limiteTotal = Number(equip.quantidade || 1);
  const reservasExistentes = await sbFetch('reservas_equipamentos', {
    query: `academy_id=eq.${encodeURIComponent(academyId)}&equipamento_id=eq.${encodeURIComponent(equipId)}&data_reserva=eq.${encodeURIComponent(dataReserva)}&horario=eq.${encodeURIComponent(horario)}&status=eq.Ativa`
  }) || [];

  const jaReservado = reservasExistentes.reduce((acc, r) => acc + Number(r.quantidade || 1), 0);
  const disponivel = limiteTotal - jaReservado;

  if (qtdSolicitada > disponivel) {
    throw new Error(
      disponivel <= 0
        ? `Limite atingido! Todas as ${limiteTotal} unidades de "${equip.nome}" já estão reservadas neste horário.`
        : `Limite excedido! Você pediu ${qtdSolicitada}, mas restam apenas ${disponivel} de ${limiteTotal} unidades disponíveis.`
    );
  }

  return await sbFetch('reservas_equipamentos', {
    method: 'POST',
    single: true,
    body: {
      id: crypto.randomUUID(),
      academy_id: academyId,
      equipamento_id: equip.id,
      equipamento_nome: equip.nome,
      solicitante_id: data.solicitanteId || null,
      solicitante_nome: String(data.solicitanteNome || 'Recepção / Admin').trim(),
      quantidade: qtdSolicitada,
      data_reserva: dataReserva,
      horario,
      status: 'Ativa',
      created_at: new Date().toISOString()
    }
  });
}

async function cancelarReservaEquipamento(academyId, id) {
  await sbFetch('reservas_equipamentos', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(id)}&academy_id=eq.${encodeURIComponent(academyId)}`,
    body: { status: 'Cancelada' }
  });
  return { id, status: 'Cancelada' };
}

async function getAnnouncements(academyId) {
  const q = academyId ? `academy_id=eq.${encodeURIComponent(academyId)}&order=created_at.desc` : 'order=created_at.desc';
  const rows = await sbFetch('announcements', { query: q });
  return (rows || []).map(mapAnnouncement);
}

async function insertAnnouncement(academyId, data) {
  const row = await sbFetch('announcements', {
    method: 'POST',
    single: true,
    body: {
      id: crypto.randomUUID(),
      academy_id: academyId,
      title: data.title,
      audience: data.audience || 'Todos',
      message: data.message,
      created_at: new Date().toISOString()
    }
  });
  return mapAnnouncement(row);
}

async function deleteAnnouncement(academyId, id) {
  await sbFetch('announcements', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}&academy_id=eq.${encodeURIComponent(academyId)}` });
  return { id };
}

// ── TAREFAS OPERACIONAIS (HOJE) ───────────────────────────────────────────
async function getTasks(academyId) {
  const q = academyId ? `academy_id=eq.${encodeURIComponent(academyId)}&order=created_at.desc` : 'order=created_at.desc';
  return (await orFallback(sbFetch('tasks', { query: q }), [])) || [];
}

async function insertTask(academyId, data) {
  return await sbFetch('tasks', {
    method: 'POST',
    single: true,
    body: {
      id: crypto.randomUUID(),
      academy_id: academyId,
      title: String(data.title || '').trim(),
      responsible: String(data.responsible || '').trim(),
      priority: data.priority || 'Média',
      status: data.status || 'Pendente',
      due_date: data.dueDate || null,
      created_at: new Date().toISOString()
    }
  });
}

async function updateTask(academyId, id, data) {
  const patch = {};
  if (data.status !== undefined) patch.status = data.status;
  return await sbFetch('tasks', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(id)}&academy_id=eq.${encodeURIComponent(academyId)}`,
    single: true,
    body: patch
  });
}

async function deleteTask(academyId, id) {
  await sbFetch('tasks', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}&academy_id=eq.${encodeURIComponent(academyId)}` });
  return { id };
}

// ── PRESENÇA & CATRACA (ISOLADA POR ACADEMIA) ─────────────────────────────
// Fuso da academia (horários e "dia" do treino). Troque com a variável APP_TZ no Render.
const TZ_APP = process.env.APP_TZ || 'America/Sao_Paulo';
const JANELA_PRESENCA_MS = 3 * 60 * 60 * 1000;

function diaLocal(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ_APP });
}

async function ultimaPresenca(alunoId) {
  return await sbFetch('acessos', {
    query: `aluno_id=eq.${encodeURIComponent(alunoId)}&order=id.desc&limit=1`,
    single: true
  });
}

async function registrarPresencaBiometrica({ academyId, alunoId, alunoNome }) {
  const ultimo = await ultimaPresenca(alunoId);
  if (ultimo && ultimo.tipo === 'ENTRADA' &&
      Date.now() - new Date(ultimo.data_hora).getTime() < JANELA_PRESENCA_MS) {
    return { registrada: false, jaPresente: true, desde: ultimo.data_hora };
  }
  const agora = new Date().toISOString();
  await sbFetch('acessos', {
    method: 'POST',
    single: true,
    body: {
      academy_id: academyId,
      aluno_id: alunoId,
      aluno_nome: alunoNome,
      tipo: 'ENTRADA',
      metodo: 'biometria-login',
      data_hora: agora
    }
  });
  return { registrada: true, jaPresente: false, desde: agora };
}

async function registrarSaidaCatraca({ academyId, alunoId, alunoNome, metodo = 'finalizar-treino' }) {
  const agora = new Date().toISOString();
  await sbFetch('acessos', {
    method: 'POST',
    single: true,
    body: {
      academy_id: academyId,
      aluno_id: alunoId,
      aluno_nome: alunoNome,
      tipo: 'SAIDA',
      metodo,
      data_hora: agora
    }
  });
  return { tipo: 'SAIDA', data_hora: agora };
}

async function getStatusPresenca(academyId) {
  const q = academyId ? `academy_id=eq.${encodeURIComponent(academyId)}&order=id.desc&limit=300` : 'order=id.desc&limit=300';
  const todos = (await sbFetch('acessos', { query: q })) || [];
  const historico = todos.slice(0, 25);

  const ultimoPorAluno = new Map();
  for (let i = todos.length - 1; i >= 0; i--) ultimoPorAluno.set(todos[i].aluno_id, todos[i]);

  const presentesAgora = [];
  ultimoPorAluno.forEach((reg) => {
    if (reg.tipo === 'ENTRADA' && Date.now() - new Date(reg.data_hora).getTime() < JANELA_PRESENCA_MS) {
      presentesAgora.push({ aluno_id: reg.aluno_id, aluno_nome: reg.aluno_nome, entrada_em: reg.data_hora });
    }
  });

  return { totalPresentes: presentesAgora.length, presentesAgora, historico };
}

// ── ESTATÍSTICAS DE CATRACA & HEATMAP REAL ────────────────────────────────
async function getEstatisticasCatraca(academyId) {
  const [members, acessos] = await Promise.all([
    getMembers(academyId),
    sbFetch('acessos', { query: `academy_id=eq.${encodeURIComponent(academyId)}&order=id.desc&limit=1500` })
  ]);

  const entradas = (acessos || []).filter(a => a.tipo === 'ENTRADA');
  const totalAlunos = members.length;

  const diasMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const faixas = [6, 8, 10, 12, 14, 16, 18, 20, 22];
  const grid = {};
  let maxCelula = 0;

  const contagemPorAluno = new Map();

  for (const reg of entradas) {
    const dt = new Date(reg.data_hora);
    const localStr = dt.toLocaleString('en-US', { timeZone: TZ_APP, hour12: false });
    const localDt = new Date(localStr);
    const dia = diasMap[localDt.getDay()];
    const hr = localDt.getHours();

    let faixaEscolhida = faixas[0];
    for (const f of faixas) {
      if (hr >= f) faixaEscolhida = f;
    }
    const chave = `${dia}-${String(faixaEscolhida).padStart(2, '0')}h`;
    grid[chave] = (grid[chave] || 0) + 1;
    if (grid[chave] > maxCelula) maxCelula = grid[chave];

    const prev = contagemPorAluno.get(reg.aluno_id) || { alunoId: reg.aluno_id, nome: reg.aluno_nome, acessos: 0, ultimoAcesso: reg.data_hora };
    prev.acessos += 1;
    contagemPorAluno.set(reg.aluno_id, prev);
  }

  const rankingAlunos = members.map(m => {
    const stat = contagemPorAluno.get(m.id);
    return {
      id: m.id,
      name: m.name,
      plan: m.plan,
      status: m.status,
      totalAcessos: stat ? stat.acessos : 0,
      ultimoAcesso: stat ? stat.ultimoAcesso : null
    };
  }).sort((a, b) => b.totalAcessos - a.totalAcessos);

  return {
    totalAcessos: entradas.length,
    totalAlunos,
    mediaAcessosPorAluno: totalAlunos > 0 ? Number((entradas.length / totalAlunos).toFixed(1)) : 0,
    grid,
    maxCelula: Math.max(1, maxCelula),
    rankingAlunos
  };
}

// ── DESPESAS INDIVIDUAIS POR MÊS & DRE 6 MESES REAIS ──────────────────────
function getUltimos6MesesKeys() {
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const agora = new Date();
  const lista = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    lista.push({
      key: `${yyyy}-${mm}`,
      label: `${nomes[d.getMonth()]}/${String(yyyy).slice(2)}`,
      mesCurto: nomes[d.getMonth()]
    });
  }
  return lista;
}

async function listarDespesas(academyId, mesReferencia = '') {
  let query = `academy_id=eq.${encodeURIComponent(academyId)}&order=mes_referencia.desc,created_at.desc&limit=500`;
  if (mesReferencia) {
    query += `&mes_referencia=eq.${encodeURIComponent(mesReferencia)}`;
  }
  return (await orFallback(sbFetch('despesas', { query }), [])) || [];
}

async function inserirDespesa(academyId, { mesReferencia, categoria, descricao, valor, dataVencimento, pago = true }) {
  const mes = String(mesReferencia || '').trim() || new Date().toISOString().slice(0, 7);
  const desc = String(descricao || '').trim();
  const val = Number(valor);

  if (!desc) throw new Error('Informe a descrição da despesa (ex: Conta de Luz).');
  if (!Number.isFinite(val) || val <= 0) throw new Error('Informe um valor maior que zero.');

  return sbFetch('despesas', {
    method: 'POST',
    single: true,
    body: {
      academy_id: academyId,
      mes_referencia: mes,
      categoria: String(categoria || 'Operacional').trim(),
      descricao: desc,
      valor: val,
      data_vencimento: dataVencimento || null,
      pago: pago !== false
    }
  });
}

async function excluirDespesa(academyId, id) {
  await sbFetch('despesas', {
    method: 'DELETE',
    query: `id=eq.${encodeURIComponent(id)}&academy_id=eq.${encodeURIComponent(academyId)}`
  });
  return { ok: true };
}

const DEFAULT_PLANOS = [
  { id: 'mensal', nome: 'Mensal', preco: 120 },
  { id: 'estudante', nome: 'Estudante', preco: 90 },
  { id: 'premium', nome: 'Premium Inclusivo', preco: 180 }
];

function normalizarPlanos(lista, cfgLegacy = {}) {
  if (Array.isArray(lista) && lista.length > 0) {
    return lista
      .map((p, idx) => ({
        id: String(p.id || `plano_${idx}_${Date.now()}`),
        nome: String(p.nome || '').trim(),
        preco: Math.max(0, Number(p.preco) || 0)
      }))
      .filter(p => p.nome.length > 0);
  }
  return [
    { id: 'mensal', nome: 'Mensal', preco: Number(cfgLegacy.precoMensal ?? 120) },
    { id: 'estudante', nome: 'Estudante', preco: Number(cfgLegacy.precoEstudante ?? 90) },
    { id: 'premium', nome: 'Premium Inclusivo', preco: Number(cfgLegacy.precoPremium ?? 180) }
  ];
}

async function getFinanceiroResumo(academyId) {
  const [members, configRow, despesasList, acessos] = await Promise.all([
    getMembers(academyId),
    orFallback(sbFetch('financeiro_config', { query: `academy_id=eq.${encodeURIComponent(academyId)}&limit=1`, single: true }), null),
    listarDespesas(academyId),
    sbFetch('acessos', { query: `academy_id=eq.${encodeURIComponent(academyId)}&tipo=eq.ENTRADA&order=id.desc&limit=2000` })
  ]);

  const cfgLegacy = {
    despesasMensais: Number(configRow?.despesas_mensais || 0),
    precoMensal: Number(configRow?.preco_mensal ?? 120),
    precoEstudante: Number(configRow?.preco_estudante ?? 90),
    precoPremium: Number(configRow?.preco_premium ?? 180)
  };

  const planos = normalizarPlanos(configRow?.planos_lista, cfgLegacy);

  const precoPorPlano = (planName) => {
    const p = String(planName || '').trim().toLowerCase();
    const encontrado = planos.find(pl => pl.nome.toLowerCase() === p);
    if (encontrado) return Number(encontrado.preco || 0);
    if (p.includes('estudante')) return cfgLegacy.precoEstudante;
    if (p.includes('premium')) return cfgLegacy.precoPremium;
    return planos[0] ? Number(planos[0].preco || 0) : cfgLegacy.precoMensal;
  };

  const todosMembros = members || [];
  const ativos = todosMembros.filter(m => String(m.status).toUpperCase() === 'ATIVO');
  const pendentes = todosMembros.filter(m => String(m.status).toUpperCase() === 'PENDENTE');
  const inativos = todosMembros.filter(m => String(m.status).toUpperCase() === 'INATIVO');

  const faturamentoAtual = ativos.reduce((acc, m) => acc + precoPorPlano(m.plan), 0);
  const inadimplenciaAtual = pendentes.reduce((acc, m) => acc + precoPorPlano(m.plan), 0);
  const ticketMedio = ativos.length > 0 ? faturamentoAtual / ativos.length : 0;

  const ultimoAcessoPorAluno = new Map();
  for (const a of (acessos || [])) {
    if (!ultimoAcessoPorAluno.has(a.aluno_id)) {
      ultimoAcessoPorAluno.set(a.aluno_id, a.data_hora);
    }
  }

  const agoraMs = Date.now();
  let churnSilencioso = 0;
  for (const m of ativos) {
    const ult = ultimoAcessoPorAluno.get(m.id) || m.createdAt;
    if (ult) {
      const dias = Math.floor((agoraMs - new Date(ult).getTime()) / (1000 * 60 * 60 * 24));
      if (dias >= 10) churnSilencioso++;
    }
  }

  const totalBaseChurn = ativos.length + inativos.length;
  const churnMensalPct = totalBaseChurn > 0 ? Number(((inativos.length / totalBaseChurn) * 100).toFixed(1)) : 0;
  const ltvEstimado = churnMensalPct > 0 ? ticketMedio / (churnMensalPct / 100) : ticketMedio * 12;

  const mesesKeys = getUltimos6MesesKeys();
  const mesAtualKey = mesesKeys[mesesKeys.length - 1].key;

  const meses = mesesKeys.map(m => {
    const despMes = (despesasList || [])
      .filter(d => d.mes_referencia === m.key)
      .reduce((s, d) => s + Number(d.valor || 0), 0);

    const fimMes = `${m.key}-31T23:59:59.999Z`;
    const ativosNoMes = ativos.filter(al => !al.createdAt || al.createdAt <= fimMes);
    const fatMes = m.key === mesAtualKey
      ? faturamentoAtual
      : ativosNoMes.reduce((acc, al) => acc + precoPorPlano(al.plan), 0);

    const lucro = fatMes - despMes;
    const margem = fatMes > 0 ? Number(((lucro / fatMes) * 100).toFixed(1)) : (despMes > 0 ? -100 : 0);

    return {
      key: m.key,
      label: m.label,
      mesCurto: m.mesCurto,
      faturamento: fatMes,
      despesas: despMes,
      lucro,
      margem
    };
  });

  const atualObj = meses[meses.length - 1];
  const anteriorObj = meses[meses.length - 2] || { faturamento: 0 };

  return {
    config: { ...cfgLegacy, planos },
    planos,
    mesAtualKey,
    alunosAtivosPagantes: ativos.length,
    faturamentoAtual: atualObj.faturamento,
    faturamentoAnterior: anteriorObj.faturamento,
    despesasAtual: atualObj.despesas,
    lucroLiquido: atualObj.lucro,
    margem: atualObj.margem.toFixed(1),
    inadimplenciaAtual,
    alunosInadimplentes: pendentes.length,
    churnSilencioso,
    churnMensalPct,
    alunosInativos: inativos.length,
    ticketMedio,
    ltvEstimado,
    meses,
    despesasLancadas: despesasList || []
  };
}

async function salvarFinanceiroConfig(academyId, data) {
  const existente = await orFallback(
    sbFetch('financeiro_config', { query: `academy_id=eq.${encodeURIComponent(academyId)}&limit=1`, single: true }),
    null
  );

  const planosAtuais = normalizarPlanos(existente?.planos_lista, {
    precoMensal: existente?.preco_mensal,
    precoEstudante: existente?.preco_estudante,
    precoPremium: existente?.preco_premium
  });

  const planosNovos = Array.isArray(data.planos)
    ? normalizarPlanos(data.planos, {})
    : planosAtuais;

  const body = {
    academy_id: academyId,
    despesas_mensais: Math.max(0, Number(data.despesasMensais) || 0),
    preco_mensal: planosNovos[0]?.preco ?? 120,
    preco_estudante: planosNovos[1]?.preco ?? 90,
    preco_premium: planosNovos[2]?.preco ?? 180,
    planos_lista: planosNovos,
    updated_at: new Date().toISOString()
  };

  if (existente) {
    await sbFetch('financeiro_config', {
      method: 'PATCH',
      query: `academy_id=eq.${encodeURIComponent(academyId)}`,
      body
    });
  } else {
    await sbFetch('financeiro_config', { method: 'POST', body });
  }
  return getFinanceiroResumo(academyId);
}

// ── TREINOS DO ALUNO ──────────────────────────────────────────────────────
const TIPOS_TREINO = ['Musculação', 'Cardio', 'Funcional', 'Aula Coletiva', 'Alongamento'];
const XP_POR_TREINO = 100;
const XP_POR_DIA_PRESENTE = 50;
const XP_POR_NIVEL = 10000;
const META_MINUTOS_DIA = 30;

function mapTreino(row) {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome,
    tipo: row.tipo,
    minutos: row.minutos,
    xp: row.xp == null ? XP_POR_TREINO : Number(row.xp),
    dataHora: row.data_hora,
    created_at: row.data_hora
  };
}

// Treino reenviado depois de ficar offline mantém a data original (até 14 dias, nunca no futuro).
function dataValida(valor) {
  const t = valor ? new Date(valor).getTime() : NaN;
  const agora = Date.now();
  if (Number.isFinite(t) && t <= agora && agora - t <= 14 * 24 * 60 * 60 * 1000) return new Date(t).toISOString();
  return new Date().toISOString();
}

const erroValidacao = (msg) => Object.assign(new Error(msg), { validation: true });

// "tipo" pode ser um dos 5 tipos OU o nome da ficha (ex.: "Treino A — Peito e Tríceps").
async function registrarTreino({ academyId, alunoId, alunoNome, tipo, minutos, xp, dataHora }) {
  const nomeTreino = String(tipo || '').trim().slice(0, 80);
  if (!nomeTreino) throw erroValidacao('Informe o tipo de treino.');
  const min = Math.round(Number(minutos));
  if (!Number.isFinite(min) || min < 5 || min > 300) throw erroValidacao('Informe a duração entre 5 e 300 minutos.');
  const xpGanho = Number.isFinite(Number(xp)) ? Math.max(0, Math.min(2000, Math.round(Number(xp)))) : XP_POR_TREINO;

  const base = {
    id: crypto.randomUUID(),
    academy_id: academyId,
    aluno_id: alunoId,
    aluno_nome: alunoNome,
    tipo: nomeTreino,
    minutos: min,
    data_hora: dataValida(dataHora)
  };
  let row;
  try {
    row = await sbFetch('treinos', { method: 'POST', single: true, body: { ...base, xp: xpGanho } });
  } catch (err) {
    // coluna "xp" ainda não criada no Supabase: grava sem ela (XP padrão por treino)
    if (err.code === 'PGRST204' || /'xp' column/i.test(err.message || '')) {
      row = await sbFetch('treinos', { method: 'POST', single: true, body: base });
    } else throw err;
  }
  return mapTreino(row);
}

async function getTreinosAcademia(academyId, limit = 40) {
  const q = academyId
    ? `academy_id=eq.${encodeURIComponent(academyId)}&order=data_hora.desc&limit=${limit}`
    : `order=data_hora.desc&limit=${limit}`;
  return ((await orFallback(sbFetch('treinos', { query: q }), [])) || []).map(mapTreino);
}

async function getResumoAluno(alunoId) {
  const id = encodeURIComponent(alunoId);
  const [treinosRows, acessosRows] = await Promise.all([
    orFallback(sbFetch('treinos', { query: `aluno_id=eq.${id}&order=data_hora.desc&limit=1000` }), []),
    sbFetch('acessos', { query: `aluno_id=eq.${id}&order=id.desc&limit=1000` })
  ]);
  const treinos = (treinosRows || []).map(mapTreino);
  const entradas = (acessosRows || []).filter(a => a.tipo === 'ENTRADA');

  const hoje = diaLocal(new Date().toISOString());
  const treinosHoje = treinos.filter(t => diaLocal(t.dataHora) === hoje);
  const minutosHoje = treinosHoje.reduce((acc, t) => acc + (t.minutos || 0), 0);

  const diasPresenca = new Set(entradas.map(a => diaLocal(a.data_hora)));
  const diasAtivos = new Set([...diasPresenca, ...treinos.map(t => diaLocal(t.dataHora))]);

  let streak = 0;
  const cursor = new Date();
  if (!diasAtivos.has(diaLocal(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
  while (diasAtivos.has(diaLocal(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const xp = treinos.reduce((acc, t) => acc + t.xp, 0) + diasPresenca.size * XP_POR_DIA_PRESENTE;
  const nivel = Math.floor(xp / XP_POR_NIVEL) + 1;
  const tier = nivel >= 10 ? 'Atleta Pro' : nivel >= 5 ? 'Atleta' : 'Iniciante';

  return {
    tipos: TIPOS_TREINO,
    metaMinutos: META_MINUTOS_DIA,
    treinosHoje,
    minutosHoje,
    totalTreinos: treinos.length,
    totalPresencas: diasPresenca.size,
    presenteHoje: diasPresenca.has(hoje),
    streak,
    xp,
    nivel,
    tier,
    xpNoNivel: xp % XP_POR_NIVEL,
    xpPorNivel: XP_POR_NIVEL
  };
}

// ── FICHAS DE TREINO (A–D) SALVAS NO SERVIDOR, PARA SINCRONIZAR CELULAR E PC ─
const LETRAS_FICHA = ['A', 'B', 'C', 'D'];

function sanearFichas(dados) {
  const out = {};
  for (const letra of LETRAS_FICHA) {
    const f = dados && dados[letra];
    if (!f) continue;
    const exercicios = (Array.isArray(f.exercicios) ? f.exercicios : []).slice(0, 40).map((e, i) => ({
      id: String(e.id || `${letra}_${i}`).slice(0, 60),
      nome: String(e.nome || 'Exercício').trim().slice(0, 80),
      series: String(e.series || '3x12').trim().slice(0, 20),
      concluido: Boolean(e.concluido)
    }));
    out[letra] = {
      grupo: String(f.grupo || '').trim().slice(0, 60),
      minutos: Math.max(5, Math.min(300, Math.round(Number(f.minutos) || 45))),
      exercicios
    };
  }
  return out;
}

async function getFichasAluno(alunoId) {
  const row = await sbFetch('fichas_treino', {
    query: `aluno_id=eq.${encodeURIComponent(alunoId)}&limit=1`,
    single: true
  }).catch(err => { throw isMissingTable(err) ? tabelaAusente('fichas_treino') : err; });
  if (!row) return null;
  return { fichas: row.dados || {}, ativa: row.ativa || 'A', updatedAt: row.updated_at };
}

async function salvarFichasAluno({ academyId, alunoId, fichas, ativa }) {
  const dados = sanearFichas(fichas);
  const letra = LETRAS_FICHA.includes(ativa) ? ativa : 'A';
  const agora = new Date().toISOString();
  try {
    const existe = await sbFetch('fichas_treino', {
      query: `aluno_id=eq.${encodeURIComponent(alunoId)}&limit=1`,
      single: true
    });
    if (existe) {
      await sbFetch('fichas_treino', {
        method: 'PATCH',
        query: `aluno_id=eq.${encodeURIComponent(alunoId)}`,
        body: { dados, ativa: letra, updated_at: agora }
      });
    } else {
      await sbFetch('fichas_treino', {
        method: 'POST',
        body: { aluno_id: String(alunoId), academy_id: academyId ? String(academyId) : null, dados, ativa: letra, updated_at: agora }
      });
    }
  } catch (err) {
    throw isMissingTable(err) ? tabelaAusente('fichas_treino') : err;
  }
  return { fichas: dados, ativa: letra, updatedAt: agora };
}

async function buildDashboard(academyId) {
  const [members, equipamentos, tasks, presenca] = await Promise.all([
    getMembers(academyId),
    orFallback(getEquipamentos(academyId), []),
    orFallback(getTasks(academyId), []),
    getStatusPresenca(academyId)
  ]);
  const activeMembers = members.filter(m => m.status === 'Ativo').length;
  const equipamentosAtencao = equipamentos.filter(e => e.status !== 'Operacional').length;
  const pendingTasks = tasks.filter(t => t.status !== 'Concluída').length;
  const accessibilityNotes = members.filter(
    m => m.accessibilityNeeds && m.accessibilityNeeds !== 'Nenhuma informada' && m.accessibilityNeeds !== ''
  ).length;

  return {
    activeMembers,
    totalEquipamentos: equipamentos.length,
    equipamentosAtencao,
    pendingTasks,
    accessibilityNotes,
    presentesNaAcademia: presenca.totalPresentes
  };
}

// ── LEADS DO CHATBOT (VÃO DIRETO PARA O SEU LOGIN MESTRE) ─────────────────
async function insertLead(data) {
  return await sbFetch('leads_demonstracao', {
    method: 'POST',
    single: true,
    body: {
      id: crypto.randomUUID(),
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email || null,
      segmento: data.segmento,
      tamanho_alunos: data.tamanho_alunos || null,
      origem_url: data.origem_url || null,
      dispositivo: data.dispositivo || null,
      utm_source: data.utm_source || null,
      utm_campaign: data.utm_campaign || null,
      status: 'novo',
      criado_em: new Date().toISOString()
    }
  });
}

async function getLeads() {
  return (await sbFetch('leads_demonstracao', { query: 'order=criado_em.desc' })) || [];
}

async function updateLeadStatus(id, status) {
  return await sbFetch('leads_demonstracao', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(id)}`,
    single: true,
    body: { status }
  });
}

module.exports = {
  initDb,
  TZ_APP,
  getFichasAluno,
  salvarFichasAluno,
  hashPassword,
  verifyPassword,
  getAcademies,
  getAcademyById,
  createAcademyWithAdmin,
  upsertAcademyAdmin,
  updateAcademyStatus,
  deleteAcademy,
  getUserByEmail,
  getUsersByEmail,
  getUserById,
  getUserByCredentialId,
  saveUserBiometric,
  getMembers,
  getMemberById,
  insertMemberWithLogin,
  updateMember,
  deleteMember,
  getEquipamentos,
  insertEquipamento,
  updateEquipamento,
  deleteEquipamento,
  getReservasEquipamentos,
  criarReservaEquipamento,
  cancelarReservaEquipamento,
  getAnnouncements,
  insertAnnouncement,
  deleteAnnouncement,
  getTasks,
  insertTask,
  updateTask,
  deleteTask,
  registrarPresencaBiometrica,
  registrarSaidaCatraca,
  getStatusPresenca,
  getEstatisticasCatraca,
  listarDespesas,
  inserirDespesa,
  excluirDespesa,
  getFinanceiroResumo,
  salvarFinanceiroConfig,
  registrarTreino,
  getTreinosAcademia,
  getResumoAluno,
  buildDashboard,
  insertLead,
  getLeads,
  updateLeadStatus
};