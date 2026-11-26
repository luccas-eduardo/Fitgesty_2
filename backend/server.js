/*
  =============================================================================
  FitGesty — Backend SaaS Multi-Tenant V3.1 (Blindado contra IDOR e Vazamento LGPD)
  Super Admin (Login Mestre) -> Academias Clientes (Admin) -> Alunos
  =============================================================================
*/

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db');
const auth = require('./auth');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

const STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

const DEMO_STATE = {
  members: [
    { id: 'demo-m1', name: 'Carlos Demonstração', email: 'carlos.demo@teste.com', phone: '(67) 99911-2233', plan: 'Premium Inclusivo', status: 'Ativo', accessibilityNeeds: 'Nenhuma informada' },
    { id: 'demo-m2', name: 'Ana Exemplo', email: 'ana.demo@teste.com', phone: '(67) 98822-3344', plan: 'Mensal', status: 'Ativo', accessibilityNeeds: 'Alto contraste' }
  ],
  tasks: [
    { id: 'demo-t1', title: 'Revisar equipamentos da sala cardio', responsible: 'Equipe Demo', priority: 'Alta', status: 'Pendente', dueDate: '2026-12-01' }
  ],
  announcements: [
    { id: 'demo-a1', title: 'Bem-vindo ao Modo Demonstração!', audience: 'Todos', message: 'Ambiente de testes isolado. Fale com nosso consultor na página inicial para contratar o FitGesty para sua academia.', createdAt: new Date().toISOString() }
  ]
};

const SESSION_COOKIE = 'fit_session';
const SESSION_MAX_AGE = 24 * 60 * 60;

function sessionCookie(token, req) {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function clearSessionCookie(req) {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function send(res, status, payload, headers = {}, req = null) {
  const body = payload === undefined ? '' : JSON.stringify(payload, null, 2);
  const responseHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
    ...headers
  };

  if (payload && typeof payload.token === 'string') {
    responseHeaders['Set-Cookie'] = sessionCookie(payload.token, req || res.req);
  }

  res.writeHead(status, responseHeaders);
  res.end(body);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function sendStatic(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(STATUS.NOT_FOUND, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }
    res.writeHead(STATUS.OK, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN'
    });
    res.end(content);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON inválido')); }
    });
  });
}

const webauthnChallenges = new Map();
setInterval(() => {
  const agora = Date.now();
  for (const [k, v] of webauthnChallenges) if (v.exp < agora) webauthnChallenges.delete(k);
}, 60 * 1000).unref();

function getBrowserSession(req) {
  const cookieHeader = String(req?.headers?.cookie || '');
  const cookie = cookieHeader.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;
  try {
    return auth.verifyToken(decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

function getSession(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return auth.verifyToken(token);
    }
  }
  return getBrowserSession(req);
}

function getRedirectForRole(role) {
  if (role === 'superadmin') return '/superadmin.html';
  if (role === 'admin') return '/admin.html';
  if (role === 'funcionario') return '/funcionario.html';
  return '/aluno.html';
}

async function handleApi(req, res, url) {
  const { method } = req;
  const { pathname, searchParams } = url;

  if (method === 'OPTIONS') return send(res, STATUS.NO_CONTENT, undefined, {}, req);

  if (pathname === '/api/logout' && method === 'POST') {
    return send(res, STATUS.OK, { ok: true }, { 'Set-Cookie': clearSessionCookie(req) }, req);
  }

  // ── 1. LOGIN UNIFICADO (MESTRE / ACADEMIA CLIENTE / ALUNO / DEMO) ────────
  if (pathname === '/api/login' && method === 'POST') {
    const { email, password, demoRole, academyId: selectedAcademyId } = await parseBody(req);

    if (demoRole === 'admin') {
      const token = auth.generateToken({
        userId: 'demo-admin',
        academyId: 'demo-academy',
        memberId: null,
        name: 'Gestor Demo',
        academyName: 'Academia Demonstração',
        role: 'admin',
        isDemo: true
      });
      return send(res, STATUS.OK, {
        role: 'admin',
        name: 'Gestor Demo',
        academyName: 'Academia Demonstração',
        isDemo: true,
        redirect: '/admin.html',
        token
      }, {}, req);
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return send(res, STATUS.BAD_REQUEST, { error: 'Informe seu e-mail e senha.' }, {}, req);
    }

    const masterEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    const masterPass = (process.env.SUPER_ADMIN_PASSWORD || '').trim();

    if (masterEmail && masterPass && cleanEmail === masterEmail && cleanPassword === masterPass) {
      const token = auth.generateToken({
        userId: 'superadmin-master',
        academyId: null,
        memberId: null,
        name: 'Dono FitGesty (Login Mestre)',
        academyName: 'FitGesty Master',
        role: 'superadmin',
        isDemo: false
      });

      return send(res, STATUS.OK, {
        role: 'superadmin',
        name: 'Dono FitGesty (Login Mestre)',
        academyName: 'FitGesty Master',
        isDemo: false,
        redirect: '/superadmin.html',
        token
      }, {}, req);
    }

    const matchingUsers = typeof db.getUsersByEmail === 'function'
      ? await db.getUsersByEmail(cleanEmail)
      : [await db.getUserByEmail(cleanEmail)].filter(Boolean);

    if (!matchingUsers.length) {
      return send(res, STATUS.UNAUTHORIZED, { error: 'E-mail ou senha inválidos.' }, {}, req);
    }

    const validUsers = matchingUsers.filter(u => db.verifyPassword(cleanPassword, u.passwordHash));
    if (!validUsers.length) {
      return send(res, STATUS.UNAUTHORIZED, { error: 'E-mail ou senha inválidos.' }, {}, req);
    }

    let user = validUsers[0];
    if (validUsers.length > 1) {
      if (selectedAcademyId) {
        user = validUsers.find(u => String(u.academyId) === String(selectedAcademyId)) || validUsers[0];
      } else {
        const opcoes = await Promise.all(validUsers.map(async (u) => {
          const ac = u.academyId ? await db.getAcademyById(u.academyId) : null;
          return { academyId: u.academyId, academyName: ac?.name || 'Academia', role: u.role };
        }));
        return send(res, STATUS.OK, { multipleAcademies: true, options: opcoes }, {}, req);
      }
    }

    let academyName = 'FitGesty Master';
    if (user.academyId) {
      const academy = await db.getAcademyById(user.academyId);
      if (!academy || academy.status !== 'Ativa') {
        return send(res, STATUS.FORBIDDEN, { error: 'A assinatura desta academia está suspensa. Entre em contato com o suporte FitGesty.' }, {}, req);
      }
      academyName = academy.name;
    }

    const token = auth.generateToken({
      userId: user.id,
      academyId: user.academyId,
      memberId: user.memberId,
      name: user.name,
      academyName,
      role: user.role,
      isDemo: false
    });

    return send(res, STATUS.OK, {
      role: user.role,
      name: user.name,
      academyName,
      memberId: user.memberId,
      isDemo: false,
      redirect: getRedirectForRole(user.role),
      token
    }, {}, req);
  }

  // ── 1B. VALIDAÇÃO DE SESSÃO ATIVA (/api/auth/me) ─────────────────────────
  if (pathname === '/api/auth/me' && method === 'GET') {
    const activeSession = getSession(req);
    if (!activeSession) {
      return send(res, STATUS.UNAUTHORIZED, { error: 'Sessão inválida ou expirada.' }, {}, req);
    }
    return send(res, STATUS.OK, {
      id: activeSession.userId,
      memberId: activeSession.memberId || null,
      academyId: activeSession.academyId || null,
      name: activeSession.name,
      academyName: activeSession.academyName,
      role: activeSession.role,
      isDemo: Boolean(activeSession.isDemo)
    }, {}, req);
  }

  // ── 2. BIOMETRIA WEBAUTHN ────────────────────────────────────────────────
  if (pathname === '/api/biometric/challenge' && method === 'GET') {
    return send(res, STATUS.OK, { challenge: crypto.randomBytes(32).toString('base64url') }, {}, req);
  }

  if (pathname === '/api/biometric/register' && method === 'POST') {
    const session = getSession(req);
    if (!session || session.isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Disponível apenas para contas reais.' }, {}, req);
    }
    const { credentialId } = await parseBody(req);
    if (!credentialId) return send(res, STATUS.BAD_REQUEST, { error: 'Credencial ausente.' }, {}, req);
    await db.saveUserBiometric(session.userId, credentialId);
    return send(res, STATUS.OK, { ok: true, message: 'Biometria ativada neste aparelho com sucesso!' }, {}, req);
  }

  if (pathname === '/api/webauthn/register-options' && method === 'POST') {
    const session = getSession(req);
    if (!session || session.isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Disponível apenas para contas reais.' }, {}, req);
    }
    const user = await db.getUserById(session.userId);
    if (!user) return send(res, STATUS.NOT_FOUND, { error: 'Usuário não encontrado.' }, {}, req);

    const challenge = crypto.randomBytes(32).toString('base64url');
    webauthnChallenges.set(String(user.id), { challenge, exp: Date.now() + 5 * 60 * 1000 });
    return send(res, STATUS.OK, {
      challenge,
      rp: { name: 'FitGesty' },
      user: {
        id: Buffer.from(String(user.id)).toString('base64url'),
        name: user.email || user.name,
        displayName: user.name || user.email
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred'
      },
      excludeCredentials: []
    }, {}, req);
  }

  if (pathname === '/api/webauthn/register-verify' && method === 'POST') {
    const session = getSession(req);
    if (!session || session.isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Disponível apenas para contas reais.' }, {}, req);
    }
    const body = await parseBody(req);
    const cred = body.credential || body;
    const credentialId = cred.id || body.id;
    const clientDataB64 = cred.response?.clientDataJSON;
    if (!credentialId || !clientDataB64) {
      return send(res, STATUS.BAD_REQUEST, { error: 'Dados da biometria incompletos.' }, {}, req);
    }

    let clientData;
    try { clientData = JSON.parse(Buffer.from(clientDataB64, 'base64url').toString('utf8')); }
    catch { return send(res, STATUS.BAD_REQUEST, { error: 'Dados da biometria inválidos.' }, {}, req); }

    const pendente = webauthnChallenges.get(String(session.userId));
    webauthnChallenges.delete(String(session.userId));
    if (!pendente || pendente.exp < Date.now()) {
      return send(res, STATUS.BAD_REQUEST, { error: 'Pedido de cadastro expirou. Tente novamente.' }, {}, req);
    }
    if (clientData.type !== 'webauthn.create' || clientData.challenge !== pendente.challenge) {
      return send(res, STATUS.BAD_REQUEST, { error: 'Falha na verificação da biometria. Tente novamente.' }, {}, req);
    }
    try {
      const hostReq = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().split(':')[0];
      if (new URL(clientData.origin).hostname !== hostReq) {
        return send(res, STATUS.BAD_REQUEST, { error: 'Origem da biometria não confere com este site.' }, {}, req);
      }
    } catch {
      return send(res, STATUS.BAD_REQUEST, { error: 'Origem da biometria inválida.' }, {}, req);
    }

    try {
      await db.saveUserBiometric(session.userId, credentialId, String(req.headers['user-agent'] || '').slice(0, 80));
    } catch (err) {
      return send(res, err.validation ? STATUS.CONFLICT : STATUS.SERVER_ERROR, { error: err.message }, {}, req);
    }
    return send(res, STATUS.OK, { ok: true, credentialId, message: 'Biometria ativada neste aparelho com sucesso!' }, {}, req);
  }

  if (pathname === '/api/biometric/login' && method === 'POST') {
    const { credentialId } = await parseBody(req);
    if (!credentialId) return send(res, STATUS.BAD_REQUEST, { error: 'Leitura inválida.' }, {}, req);

    const user = await db.getUserByCredentialId(credentialId);
    if (!user) {
      return send(res, STATUS.UNAUTHORIZED, { error: 'Biometria não reconhecida neste aparelho. Entre com e-mail e senha primeiro.' }, {}, req);
    }

    let academyName = 'FitGesty Master';
    if (user.academyId) {
      const academy = await db.getAcademyById(user.academyId);
      if (!academy || academy.status !== 'Ativa') {
        return send(res, STATUS.FORBIDDEN, { error: 'Assinatura da academia suspensa.' }, {}, req);
      }
      academyName = academy.name;
    }

    let presenca = null;
    if (user.role === 'aluno' && user.memberId) {
      try {
        const member = await db.getMemberById(user.memberId);
        if (!member) {
          presenca = { registrada: false, mensagem: 'Cadastro de aluno não encontrado.' };
        } else if (String(member.status).toUpperCase() !== 'ATIVO') {
          presenca = { registrada: false, mensagem: `Presença não registrada: matrícula ${member.status}.` };
        } else {
          const fnPresenca = db.registrarPresencaBiometrica || db.registrarPassagemCatraca;
          const r = await fnPresenca({ academyId: user.academyId, alunoId: member.id, alunoNome: member.name });
          const refHora = r.desde || r.data_hora || new Date().toISOString();
          const hora = new Date(refHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: db.TZ_APP });
          presenca = r.registrada !== false
            ? { registrada: true, tipo: 'ENTRADA', mensagem: `🟢 Presença biométrica registrada às ${hora} — Bom treino, ${member.name}!` }
            : { registrada: false, tipo: 'ENTRADA', mensagem: `✅ Você já está na academia desde as ${hora}.` };
        }
      } catch {
        presenca = { registrada: false, mensagem: 'Login feito, mas não foi possível registrar a presença agora.' };
      }
    }

    const token = auth.generateToken({
      userId: user.id,
      academyId: user.academyId,
      memberId: user.memberId,
      name: user.name,
      academyName,
      role: user.role,
      isDemo: false
    });

    return send(res, STATUS.OK, {
      role: user.role,
      name: user.name,
      academyName,
      memberId: user.memberId,
      isDemo: false,
      redirect: getRedirectForRole(user.role),
      presenca,
      token
    }, {}, req);
  }

  // ── 3. CAPTURA DE LEADS DO CHATBOT (ÚNICA ROTA DE ESCRITA PÚBLICA) ───────
  if (pathname === '/api/leads/capturar' && method === 'POST') {
    const payload = await parseBody(req);
    const answers = payload?.answers || {};
    const metadata = payload?.metadata || {};
    const fullName = String(answers.fullName || '').trim();
    const whatsapp = String(answers.whatsapp || '').trim();
    const businessType = String(answers.businessType || '').trim();

    if (!fullName || !whatsapp || !businessType) {
      return send(res, STATUS.BAD_REQUEST, { error: 'Nome, WhatsApp e Segmento são obrigatórios.' }, {}, req);
    }
    const lead = await db.insertLead({
      nome: escapeHtml(fullName),
      whatsapp: escapeHtml(whatsapp),
      email: answers.email ? escapeHtml(String(answers.email).trim()) : null,
      segmento: escapeHtml(businessType),
      tamanho_alunos: answers.studentCount ? escapeHtml(String(answers.studentCount).trim()) : null,
      origem_url: metadata.originUrl ? escapeHtml(String(metadata.originUrl).trim()) : null,
      dispositivo: metadata.device === 'mobile' ? 'mobile' : 'desktop',
      utm_source: metadata.utms?.source ? escapeHtml(String(metadata.utms.source).trim()) : null,
      utm_campaign: metadata.utms?.campaign ? escapeHtml(String(metadata.utms.campaign).trim()) : null
    });
    return send(res, STATUS.CREATED, { ok: true, leadId: lead.id }, {}, req);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // A PARTIR DESTE PONTO, TODAS AS ROTAS EXIGEM SESSÃO AUTENTICADA VÁLIDA
  // ══════════════════════════════════════════════════════════════════════════
  const session = getSession(req);
  if (!session) {
    return send(res, STATUS.UNAUTHORIZED, { error: 'Acesso não autorizado. Faça login para continuar.' }, {}, req);
  }

  const isDemo = session.isDemo === true;
  if (isDemo && session.role !== 'admin') {
    return send(res, STATUS.FORBIDDEN, { error: 'Perfil de demonstração inválido.' }, {}, req);
  }

  // ── 4. ROTAS EXCLUSIVAS DO LOGIN MESTRE (SUPER ADMIN) ────────────────────
  if (pathname === '/api/superadmin/academies' && method === 'GET') {
    if (session.role !== 'superadmin' || isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao Login Mestre.' }, {}, req);
    }
    return send(res, STATUS.OK, await db.getAcademies(), {}, req);
  }

  if (pathname === '/api/superadmin/academies' && method === 'POST') {
    if (session.role !== 'superadmin' || isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao Login Mestre.' }, {}, req);
    }
    const { academyName, ownerName, ownerEmail, password, plan } = await parseBody(req);
    if (!academyName || !ownerName || !ownerEmail || !password) {
      return send(res, STATUS.BAD_REQUEST, { error: 'Preencha nome da academia, proprietário, e-mail e senha.' }, {}, req);
    }
    try {
      const created = await db.createAcademyWithAdmin({ academyName, ownerName, ownerEmail, password, plan });
      return send(res, STATUS.CREATED, created, {}, req);
    } catch (err) {
      return send(res, STATUS.SERVER_ERROR, { error: err.message }, {}, req);
    }
  }

  const academyMatch = pathname.match(/^\/api\/superadmin\/academies\/([^/]+)$/);
  if (academyMatch && method === 'PUT') {
    if (session.role !== 'superadmin' || isDemo) return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito.' }, {}, req);
    const { status } = await parseBody(req);
    return send(res, STATUS.OK, await db.updateAcademyStatus(academyMatch[1], status), {}, req);
  }
  if (academyMatch && method === 'DELETE') {
    if (session.role !== 'superadmin' || isDemo) return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito.' }, {}, req);
    return send(res, STATUS.OK, await db.deleteAcademy(academyMatch[1]), {}, req);
  }

  if (pathname === '/api/superadmin/admins' && method === 'POST') {
    if (session.role !== 'superadmin' || isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao Login Mestre.' }, {}, req);
    }
    const { academyId, name, email, password } = await parseBody(req);
    if (!academyId || !email || !password) {
      return send(res, STATUS.BAD_REQUEST, { error: 'Informe academia, e-mail e nova senha.' }, {}, req);
    }
    try {
      const admin = await db.upsertAcademyAdmin({ academyId, name: name || 'Gestor', email, password });
      return send(res, STATUS.OK, admin, {}, req);
    } catch (err) {
      return send(res, STATUS.SERVER_ERROR, { error: err.message }, {}, req);
    }
  }

  if (pathname === '/api/leads' && method === 'GET') {
    if (session.role !== 'superadmin') return send(res, STATUS.OK, [], {}, req);
    if (isDemo) return send(res, STATUS.OK, [], {}, req);
    return send(res, STATUS.OK, await db.getLeads(), {}, req);
  }

  const isLeadUpdate = pathname.match(/^\/api\/leads\/([^/]+)$/);
  if (isLeadUpdate && method === 'PUT') {
    if (session.role !== 'superadmin') {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso negado.' }, {}, req);
    }
    if (isDemo) return send(res, STATUS.FORBIDDEN, { error: 'Modo Demonstração.' }, {}, req);
    const { status } = await parseBody(req);
    return send(res, STATUS.OK, await db.updateLeadStatus(isLeadUpdate[1], status), {}, req);
  }

  // ── 5. DASHBOARD, CATRACA & TREINOS DO ALUNO ────────────────────────────
  if (pathname === '/api/dashboard' && method === 'GET') {
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    if (isDemo) {
      return send(res, STATUS.OK, { activeMembers: 2, pendingTasks: 1, accessibilityNotes: 1, presentesNaAcademia: 1 }, {}, req);
    }
    return send(res, STATUS.OK, await db.buildDashboard(session.academyId), {}, req);
  }

  if (pathname === '/api/catraca/passagem' && method === 'POST') {
    if (session.role !== 'aluno') {
      return send(res, STATUS.FORBIDDEN, { liberado: false, mensagem: 'Acesso restrito ao aluno.' }, {}, req);
    }
    if (isDemo) {
      return send(res, STATUS.FORBIDDEN, { liberado: false, mensagem: 'Modo Demonstração.' }, {}, req);
    }
    const payload = await parseBody(req);
    if (payload.tipo !== 'SAIDA') {
      return send(res, STATUS.FORBIDDEN, {
        liberado: false,
        mensagem: 'A entrada na academia é registrada exclusivamente pelo login com biometria.'
      }, {}, req);
    }
    const member = session.memberId ? await db.getMemberById(session.memberId) : null;
    if (!member || String(member.academyId) !== String(session.academyId)) {
      return send(res, STATUS.NOT_FOUND, { liberado: false, mensagem: 'Aluno não encontrado.' }, {}, req);
    }

    const fnSaida = db.registrarSaidaCatraca || db.registrarPassagemCatraca;
    const reg = await fnSaida({
      academyId: session.academyId,
      alunoId: member.id,
      alunoNome: member.name,
      tipoForcado: 'SAIDA',
      metodo: 'finalizar-treino'
    });

    const hora = new Date(reg.data_hora || new Date().toISOString()).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: db.TZ_APP
    });
    return send(res, STATUS.OK, {
      liberado: true,
      tipo: 'SAIDA',
      mensagem: `🟠 Treino finalizado! Saída registrada na catraca às ${hora}.`
    }, {}, req);
  }

  if (pathname === '/api/catraca/status' && method === 'GET') {
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    if (isDemo) {
      return send(res, STATUS.OK, {
        totalPresentes: 1,
        presentesAgora: [{ aluno_id: 'demo-m1', aluno_nome: 'Carlos Demonstração', entrada_em: new Date().toISOString() }],
        historico: [{ id: 1, aluno_id: 'demo-m1', aluno_nome: 'Carlos Demonstração', tipo: 'ENTRADA', data_hora: new Date().toISOString() }]
      }, {}, req);
    }
    const fnStatus = db.getStatusCatraca || db.getStatusPresenca;
    return send(res, STATUS.OK, await fnStatus(session.academyId), {}, req);
  }

  if (pathname === '/api/catraca/estatisticas' && method === 'GET') {
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    if (isDemo || typeof db.getEstatisticasCatraca !== 'function') {
      return send(res, STATUS.OK, { totalAcessos: 0, totalAlunos: 0, mediaAcessosPorAluno: 0, grid: {}, maxCelula: 1, rankingAlunos: [] }, {}, req);
    }
    return send(res, STATUS.OK, await db.getEstatisticasCatraca(session.academyId), {}, req);
  }

  if (pathname === '/api/aluno/resumo' && method === 'GET') {
    if (session.role !== 'aluno' || isDemo || !session.memberId) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao aluno autenticado.' }, {}, req);
    }
    const member = await db.getMemberById(session.memberId);
    if (!member || String(member.academyId) !== String(session.academyId)) {
      return send(res, STATUS.FORBIDDEN, { error: 'Aluno não pertence a esta academia.' }, {}, req);
    }
    return send(res, STATUS.OK, await db.getResumoAluno(member.id), {}, req);
  }

  if (pathname === '/api/aluno/dashboard' && method === 'GET') {
    if (session.role !== 'aluno' || isDemo || !session.memberId) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao aluno autenticado.' }, {}, req);
    }
    const member = await db.getMemberById(session.memberId);
    if (!member || String(member.academyId) !== String(session.academyId)) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso negado.' }, {}, req);
    }
    const [resumo, avisos] = await Promise.all([
      db.getResumoAluno(member.id),
      db.getAnnouncements(session.academyId).catch(() => [])
    ]);
    return send(res, STATUS.OK, {
      aluno: { id: member.id, name: member.name, plan: member.plan, status: member.status },
      academyName: session.academyName,
      stats: {
        minutosHoje: resumo.minutosHoje,
        metaMinutos: resumo.metaMinutos,
        streak: resumo.streak,
        totalTreinos: resumo.totalTreinos,
        totalPresencas: resumo.totalPresencas,
        presenteHoje: resumo.presenteHoje,
        xp: resumo.xp
      },
      treinosHoje: resumo.treinosHoje,
      avisos: (avisos || []).slice(0, 20)
    }, {}, req);
  }

  if (pathname === '/api/aluno/fichas' && (method === 'GET' || method === 'PUT')) {
    if (session.role !== 'aluno' || isDemo || !session.memberId) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao aluno autenticado.' }, {}, req);
    }
    const member = await db.getMemberById(session.memberId);
    if (!member || String(member.academyId) !== String(session.academyId)) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso negado.' }, {}, req);
    }
    try {
      if (method === 'GET') {
        return send(res, STATUS.OK, (await db.getFichasAluno(member.id)) || { fichas: null }, {}, req);
      }
      const payload = await parseBody(req);
      if (!payload || typeof payload.fichas !== 'object') {
        return send(res, STATUS.BAD_REQUEST, { error: 'Fichas inválidas.' }, {}, req);
      }
      return send(res, STATUS.OK, await db.salvarFichasAluno({
        academyId: session.academyId,
        alunoId: member.id,
        fichas: payload.fichas,
        ativa: payload.ativa
      }), {}, req);
    } catch (err) {
      return send(res, STATUS.SERVER_ERROR, { error: err.message }, {}, req);
    }
  }

  if (pathname === '/api/aluno/treinos' && method === 'POST') {
    if (session.role !== 'aluno' || isDemo || !session.memberId) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao aluno autenticado.' }, {}, req);
    }
    const payload = await parseBody(req);
    const member = await db.getMemberById(session.memberId);
    if (!member || String(member.academyId) !== String(session.academyId)) {
      return send(res, STATUS.NOT_FOUND, { error: 'Cadastro de aluno não encontrado.' }, {}, req);
    }

    try {
      const treino = await db.registrarTreino({
        academyId: session.academyId,
        alunoId: member.id,
        alunoNome: member.name,
        tipo: payload.tipo || 'Musculação',
        minutos: payload.minutos || 45,
        xp: payload.xp,
        dataHora: payload.dataHora
      });

      let saida = null;
      if (payload.finalizarSaida !== false && typeof db.registrarSaidaCatraca === 'function') {
        saida = await db.registrarSaidaCatraca({
          academyId: session.academyId,
          alunoId: member.id,
          alunoNome: member.name,
          metodo: 'finalizar-treino'
        });
      }

      const resumo = await db.getResumoAluno(member.id);
      return send(res, STATUS.CREATED, { treino, saida, resumo }, {}, req);
    } catch (err) {
      return send(res, err.validation ? STATUS.BAD_REQUEST : STATUS.SERVER_ERROR, { error: err.message }, {}, req);
    }
  }

  // ── 5B. EQUIPAMENTOS & RESERVAS ───────────────────────────────────────────
  if (pathname === '/api/equipamentos' && method === 'GET') {
    if (isDemo || typeof db.getEquipamentos !== 'function') return send(res, STATUS.OK, [], {}, req);
    return send(res, STATUS.OK, await db.getEquipamentos(session.academyId), {}, req);
  }

  if (pathname === '/api/equipamentos' && method === 'POST') {
    if (session.role !== 'admin' || isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    const payload = await parseBody(req);
    try {
      return send(res, STATUS.CREATED, await db.insertEquipamento(session.academyId, payload), {}, req);
    } catch (err) {
      return send(res, STATUS.BAD_REQUEST, { error: err.message }, {}, req);
    }
  }

  const equipMatch = pathname.match(/^\/api\/equipamentos\/([^/]+)$/);
  if (equipMatch && method === 'PUT') {
    if (session.role !== 'admin' || isDemo) return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito.' }, {}, req);
    const payload = await parseBody(req);
    try {
      return send(res, STATUS.OK, await db.updateEquipamento(session.academyId, equipMatch[1], payload), {}, req);
    } catch (err) {
      return send(res, STATUS.BAD_REQUEST, { error: err.message }, {}, req);
    }
  }

  if (equipMatch && method === 'DELETE') {
    if (session.role !== 'admin' || isDemo) return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito.' }, {}, req);
    return send(res, STATUS.OK, await db.deleteEquipamento(session.academyId, equipMatch[1]), {}, req);
  }

  if (pathname === '/api/reservas' && method === 'GET') {
    if (isDemo || typeof db.getReservasEquipamentos !== 'function') return send(res, STATUS.OK, [], {}, req);
    return send(res, STATUS.OK, await db.getReservasEquipamentos(session.academyId), {}, req);
  }

  if (pathname === '/api/reservas' && method === 'POST') {
    if (isDemo) return send(res, STATUS.FORBIDDEN, { error: 'Modo Demonstração: indisponível.' }, {}, req);
    if (typeof db.criarReservaEquipamento !== 'function') {
      return send(res, STATUS.BAD_REQUEST, { error: 'Função de reservas não configurada em db.js.' }, {}, req);
    }
    const payload = await parseBody(req);
    try {
      const reserva = await db.criarReservaEquipamento(session.academyId, {
        ...payload,
        solicitanteId: session.role === 'aluno' ? session.memberId : session.userId,
        solicitanteNome: session.role === 'aluno' ? session.name : (payload.solicitanteNome || `Admin (${session.name})`)
      });
      return send(res, STATUS.CREATED, reserva, {}, req);
    } catch (err) {
      return send(res, STATUS.BAD_REQUEST, { error: err.message }, {}, req);
    }
  }

  const reservaMatch = pathname.match(/^\/api\/reservas\/([^/]+)$/);
  if (reservaMatch && method === 'DELETE') {
    if (isDemo) return send(res, STATUS.FORBIDDEN, { error: 'Modo Demonstração.' }, {}, req);
    if (typeof db.cancelarReservaEquipamento !== 'function') {
      return send(res, STATUS.BAD_REQUEST, { error: 'Função de cancelamento não configurada em db.js.' }, {}, req);
    }
    return send(res, STATUS.OK, await db.cancelarReservaEquipamento(session.academyId, reservaMatch[1]), {}, req);
  }

  if (pathname === '/api/financeiro' && method === 'GET') {
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    if (isDemo || typeof db.getFinanceiroResumo !== 'function') {
      return send(res, STATUS.OK, {
        config: { despesasMensais: 0, precoMensal: 120, precoEstudante: 90, precoPremium: 180 },
        alunosAtivosPagantes: 0, faturamentoAtual: 0, despesasAtual: 0, lucroLiquido: 0, margem: '0.0', meses: []
      }, {}, req);
    }
    return send(res, STATUS.OK, await db.getFinanceiroResumo(session.academyId), {}, req);
  }

  if (pathname === '/api/financeiro' && method === 'PUT') {
    if (session.role !== 'admin' || isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    if (typeof db.salvarFinanceiroConfig !== 'function') {
      return send(res, STATUS.BAD_REQUEST, { error: 'Função financeira não configurada em db.js.' }, {}, req);
    }
    const payload = await parseBody(req);
    return send(res, STATUS.OK, await db.salvarFinanceiroConfig(session.academyId, payload), {}, req);
  }

  if (pathname === '/api/despesas' && method === 'GET') {
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    if (isDemo || typeof db.listarDespesas !== 'function') return send(res, STATUS.OK, [], {}, req);
    const mes = searchParams.get('mes') || '';
    return send(res, STATUS.OK, await db.listarDespesas(session.academyId, mes), {}, req);
  }

  if (pathname === '/api/despesas' && method === 'POST') {
    if (session.role !== 'admin' || isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    const payload = await parseBody(req);
    try {
      return send(res, STATUS.CREATED, await db.inserirDespesa(session.academyId, payload), {}, req);
    } catch (err) {
      return send(res, STATUS.BAD_REQUEST, { error: err.message }, {}, req);
    }
  }

  const despesaMatch = pathname.match(/^\/api\/despesas\/([^/]+)$/);
  if (despesaMatch && method === 'DELETE') {
    if (session.role !== 'admin' || isDemo) {
      return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito ao gestor.' }, {}, req);
    }
    return send(res, STATUS.OK, await db.excluirDespesa(session.academyId, despesaMatch[1]), {}, req);
  }

  // ── 6. CRUD ISOLADO POR ACADEMIA (MEMBERS, TASKS, ANNOUNCEMENTS) ─────────
  let collection = null;
  if (pathname.startsWith('/api/members')) collection = 'members';
  else if (pathname.startsWith('/api/tasks')) collection = 'tasks';
  else if (pathname.startsWith('/api/announcements')) collection = 'announcements';

  if (!collection) return send(res, STATUS.NOT_FOUND, { error: 'Rota não encontrada' }, {}, req);

  if (session.role === 'aluno') {
    if (collection === 'announcements' && method === 'GET') {
      return send(res, STATUS.OK, await db.getAnnouncements(session.academyId), {}, req);
    }
    return send(res, STATUS.FORBIDDEN, { error: 'Acesso restrito à gestão da academia.' }, {}, req);
  }

  const parts = pathname.split('/').filter(Boolean);
  const id = parts.length >= 3 ? parts[2] : null;
  const q = searchParams.get('q') || '';

  if (isDemo) {
    if (method === 'GET') return send(res, STATUS.OK, DEMO_STATE[collection] || [], {}, req);
    return send(res, STATUS.FORBIDDEN, { error: 'Modo Demonstração: Contrate o FitGesty para salvar alterações reais.' }, {}, req);
  }

  const academyId = session.academyId;
  if (!academyId) {
    return send(res, STATUS.FORBIDDEN, { error: 'Academia não vinculada à sessão.' }, {}, req);
  }

  if (method === 'GET' && !id) {
    if (collection === 'members') return send(res, STATUS.OK, await db.getMembers(academyId, q), {}, req);
    if (collection === 'tasks') return send(res, STATUS.OK, typeof db.getTasks === 'function' ? await db.getTasks(academyId) : [], {}, req);
    if (collection === 'announcements') return send(res, STATUS.OK, await db.getAnnouncements(academyId), {}, req);
  }

  if (method === 'POST' && !id) {
    const payload = await parseBody(req);
    try {
      let created = null;
      if (collection === 'members') created = await db.insertMemberWithLogin(academyId, payload);
      if (collection === 'tasks' && typeof db.insertTask === 'function') created = await db.insertTask(academyId, payload);
      if (collection === 'announcements') created = await db.insertAnnouncement(academyId, payload);
      return send(res, STATUS.CREATED, created, {}, req);
    } catch (err) {
      if (err.statusCode === 409) {
        return send(res, STATUS.CONFLICT, { error: err.message }, {}, req);
      }
      if (err.code === '23505' || (err.message && err.message.includes('duplicate'))) {
        return send(res, STATUS.BAD_REQUEST, { error: 'Já existe um aluno cadastrado com este e-mail.' }, {}, req);
      }
      return send(res, STATUS.SERVER_ERROR, { error: err.message }, {}, req);
    }
  }

  if (method === 'PUT' && id) {
    const payload = await parseBody(req);
    let updated = null;
    if (collection === 'members') {
      const existing = await db.getMemberById(id);
      if (!existing || String(existing.academyId) !== String(academyId)) {
        return send(res, STATUS.FORBIDDEN, { error: 'Registro não pertence à sua academia.' }, {}, req);
      }
      updated = await db.updateMember(id, payload);
    }
    if (collection === 'tasks' && typeof db.updateTask === 'function') updated = await db.updateTask(academyId, id, payload);
    return updated ? send(res, STATUS.OK, updated, {}, req) : send(res, STATUS.NOT_FOUND, { error: 'Não encontrado' }, {}, req);
  }

  if (method === 'DELETE' && id) {
    if (collection === 'members') {
      const existing = await db.getMemberById(id);
      if (!existing || String(existing.academyId) !== String(academyId)) {
        return send(res, STATUS.FORBIDDEN, { error: 'Registro não pertence à sua academia.' }, {}, req);
      }
      return send(res, STATUS.OK, await db.deleteMember(id), {}, req);
    }
    if (collection === 'tasks' && typeof db.deleteTask === 'function') return send(res, STATUS.OK, await db.deleteTask(academyId, id), {}, req);
    if (collection === 'announcements') return send(res, STATUS.OK, await db.deleteAnnouncement(academyId, id), {}, req);
  }

  return send(res, STATUS.METHOD_NOT_ALLOWED, { error: 'Método não permitido' }, {}, req);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

    let requested;
    try {
      requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('URL inválida');
      return;
    }

    const cleanRoutes = {
      '/admin': '/admin.html',
      '/aluno': '/aluno.html',
      '/superadmin': '/superadmin.html',
      '/funcionario': '/funcionario.html',
      '/login': '/login.html'
    };
    const normalizedPath = requested.replace(/\/+$/, '').toLowerCase();
    if (cleanRoutes[normalizedPath]) {
      requested = cleanRoutes[normalizedPath];
    }

    const filePath = path.resolve(PUBLIC_DIR, `.${requested}`);
    const relativePath = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/').toLowerCase();
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Acesso negado');
      return;
    }

    const protectedPages = {
      'admin.html': ['admin'],
      'funcionario.html': ['admin', 'funcionario'],
      'aluno.html': ['aluno'],
      'superadmin.html': ['superadmin']
    };
    const allowedRoles = protectedPages[relativePath];
    if (allowedRoles) {
      const browserSession = getBrowserSession(req);

      if (!browserSession || !browserSession.role) {
        res.writeHead(302, {
          Location: '/login.html',
          'Set-Cookie': clearSessionCookie(req),
          'Cache-Control': 'no-store'
        });
        res.end();
        return;
      }

      const roleAllowed = allowedRoles.includes(browserSession.role);
      const demoAllowed = !browserSession.isDemo || (relativePath === 'admin.html' && browserSession.role === 'admin');

      if (!roleAllowed || !demoAllowed) {
        res.writeHead(302, {
          Location: getRedirectForRole(browserSession.role),
          'Cache-Control': 'no-store'
        });
        res.end();
        return;
      }
    }

    return sendStatic(req, res, filePath);
  } catch (error) {
    return send(res, STATUS.SERVER_ERROR, { error: error.message || 'Erro interno' }, {}, req);
  }
});

async function start(port = PORT) {
  await db.initDb();
  return server.listen(port, '0.0.0.0', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`FitGesty SaaS Multi-Tenant online em: http://0.0.0.0:${port}`);
    }
  });
}

if (require.main === module) start();
module.exports = { server, start };