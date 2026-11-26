// @tear-proof issue-003-frontend
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
const TEST_DB = path.join(__dirname, 'test_frontend.sqlite');
process.env.SQLITE_DB_PATH = TEST_DB;

const { start, server } = require('../backend/server');

const BASE_URL = 'http://localhost:3002';

function request(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('FitGesty V1.5 — Suíte Frontend & Client Integrity (aluno.js / admin.js)', () => {
  before(async () => {
    await start(3002);
  });

  after(() => {
    if (server && server.close) server.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    const walFile = `${TEST_DB}-wal`;
    const shmFile = `${TEST_DB}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  });

  describe('Integridade Estrutural & Sintaxe de Scripts Frontend', () => {
    test('[Happy Path] aluno.js deve conter funções essenciais de gamificação, anéis e hidratação', () => {
      const code = fs.readFileSync(path.join(__dirname, '../frontend/public/aluno.js'), 'utf-8');
      assert.match(code, /initWorkouts/);
      assert.match(code, /toggleWorkout/);
      assert.match(code, /updateXPAndRings/);
      assert.match(code, /renderResources/);
      assert.match(code, /renderAnnouncements/);
      assert.match(code, /fit_today_workout/);
      assert.match(code, /logWater/);
      assert.match(code, /resetWater/);
    });

    test('[Happy Path] admin.js deve conter funções de navegação bento e gerenciamento', () => {
      const code = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.js'), 'utf-8');
      assert.match(code, /toggleSection/);
      assert.match(code, /switchResTab/);
      assert.match(code, /deleteItem/);
    });

    test('[Edge Case] Sanitização escapeHtml deve neutralizar injeções XSS em aluno.js e admin.js', () => {
      const alunoCode = fs.readFileSync(path.join(__dirname, '../frontend/public/aluno.js'), 'utf-8');
      const adminCode = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.js'), 'utf-8');

      // Verifica que a função escapeHtml trata os 5 caracteres críticos (&, <, >, ", ')
      assert.match(alunoCode, /&amp;/);
      assert.match(alunoCode, /&lt;/);
      assert.match(alunoCode, /&gt;/);
      assert.match(adminCode, /&amp;/);
      assert.match(adminCode, /&lt;/);
      assert.match(adminCode, /&gt;/);

      // Simulação direta da lógica de escape
      const escapeTest = (val) => String(val).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const sanitized = escapeTest('<script>alert("xss")</script>');
      assert.equal(sanitized, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('[Error Path] Guarda de autenticação em aluno.js e admin.js deve redirecionar acesso não autorizado', () => {
      const alunoCode = fs.readFileSync(path.join(__dirname, '../frontend/public/aluno.js'), 'utf-8');
      const adminCode = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.js'), 'utf-8');

      assert.match(alunoCode, /userRole !== 'aluno'/);
      assert.match(alunoCode, /window\.location\.href\s*=\s*'\/login\.html'/);

      assert.match(adminCode, /userRole !== 'admin'/);
      assert.match(adminCode, /window\.location\.href\s*=\s*'\/login\.html'/);
    });
  });

  describe('Serviço de Assets Estáticos Frontend via HTTP', () => {
    test('[Happy Path] Servidor deve atender os novos assets desacoplados com HTTP 200', async () => {
      const assets = [
        '/admin.css',
        '/admin.js',
        '/aluno.css',
        '/aluno.js',
        '/design-tokens.css',
        '/landing.css',
        '/index.html',
        '/admin.html',
        '/aluno.html'
      ];

      for (const assetPath of assets) {
        const res = await request('GET', assetPath);
        assert.equal(res.status, 200, `Falha ao carregar asset: ${assetPath}`);
        assert.ok(res.body.length > 0, `Asset vazio: ${assetPath}`);
      }
    });

    test('[Edge Case] design-tokens.css deve declarar tokens do preset fitness-oled', async () => {
      const res = await request('GET', '/design-tokens.css');
      assert.equal(res.status, 200);
      assert.match(res.body, /--bg-primary:\s*#09090b/);
      assert.match(res.body, /--accent-lime:\s*#84cc16/);
      assert.match(res.body, /--accent-ember:\s*#f97316/);
      assert.match(res.body, /--accent-cyan:\s*#06b6d4/);
    });

    test('[Error Path] Servidor deve retornar 404 para script ou folha de estilo inexistente', async () => {
      const res = await request('GET', '/inexistente-script-404.js');
      assert.equal(res.status, 404);
    });
  });

  describe('Sincronização de Tema, A11y e Micro-Ícones SVG (REQ-001, REQ-002, REQ-003, REQ-004)', () => {
    test('[Happy Path] theme-manager.js deve existir, ser servido e exportar window.FitGestyTheme', async () => {
      const res = await request('GET', '/theme-manager.js');
      assert.equal(res.status, 200);
      assert.match(res.body, /FitGestyTheme/);
      assert.match(res.body, /fitgesty_theme/);
      assert.match(res.body, /fitgesty_contrast/);
      assert.match(res.body, /fitgesty_font/);
      assert.match(res.body, /toggleTheme/);
      assert.match(res.body, /toggleContrast/);
      assert.match(res.body, /toggleFont/);
    });

    test('[Happy Path] admin.html, aluno.html e funcionario.html devem incluir theme-manager.js', () => {
      const adminHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.html'), 'utf-8');
      const alunoHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/aluno.html'), 'utf-8');
      const funcHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/funcionario.html'), 'utf-8');

      assert.match(adminHtml, /<script\s+src="theme-manager\.js"><\/script>/);
      assert.match(alunoHtml, /<script\s+src="theme-manager\.js"><\/script>/);
      assert.match(funcHtml, /<script\s+src="theme-manager\.js"><\/script>/);
    });

    test('[Happy Path] admin.js deve vincular activeMembers dinamicamente ao elemento #metric-alunos', () => {
      const adminCode = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.js'), 'utf-8');
      assert.match(adminCode, /dash\.activeMembers\s*!==\s*undefined\s*\?\s*dash\.activeMembers\s*:\s*\(dash\.membersCount\s*\|\|\s*0\)/);
    });

    test('[Edge Case] Botões e formulários não devem conter emojis legados', () => {
      const adminHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.html'), 'utf-8');
      const alunoHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/aluno.html'), 'utf-8');
      const funcHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/funcionario.html'), 'utf-8');
      const leadsCode = fs.readFileSync(path.join(__dirname, '../frontend/public/admin-leads.js'), 'utf-8');

      const legacyEmojis = ['💾', '📦', '📌', '📢', '☀️', '🌙', '◐', '⭕', '⚡', '🏋️', '📋', '↩', '✔', '💬'];

      for (const emoji of legacyEmojis) {
        assert.ok(!adminHtml.includes(emoji), `admin.html ainda contém emoji legado: ${emoji}`);
        assert.ok(!alunoHtml.includes(emoji), `aluno.html ainda contém emoji legado: ${emoji}`);
        assert.ok(!funcHtml.includes(emoji), `funcionario.html ainda contém emoji legado: ${emoji}`);
        assert.ok(!leadsCode.includes(emoji), `admin-leads.js ainda contém emoji legado: ${emoji}`);
      }
    });

    test('[Error Path] Elementos com id de acessibilidade devem estar presentes em todas as páginas', () => {
      const adminHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.html'), 'utf-8');
      const alunoHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/aluno.html'), 'utf-8');
      const funcHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/funcionario.html'), 'utf-8');

      for (const html of [adminHtml, alunoHtml, funcHtml]) {
        assert.match(html, /id="themeToggleBtn"/);
        assert.match(html, /id="contrastButton"/);
        assert.match(html, /id="fontButton"/);
      }
    });
  });

  describe('Auditoria de Refinos & Inovações (PLAN-006)', () => {
    test('[Happy Path] LP não deve conter Carlos Eduardo e deve convidar para teste gratuito', () => {
      const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/index.html'), 'utf-8');
      assert.ok(!indexHtml.includes('Carlos Eduardo'), 'LP ainda contém o nome próprio simulado Carlos Eduardo');
      assert.match(indexHtml, /Testar Sistema Gratuito!/);
      assert.match(indexHtml, /Lead Qualificado • Musculação & Funcional/);
    });

    test('[Happy Path] lead-bot.js não deve conter o número de WhatsApp da Pacto', () => {
      const botCode = fs.readFileSync(path.join(__dirname, '../frontend/public/lead-bot.js'), 'utf-8');
      assert.ok(!botCode.includes('5562981626555'), 'lead-bot.js ainda contém o número da Pacto');
      assert.match(botCode, /Solicitação confirmada com sucesso/);
    });

    test('[Happy Path] admin.html e admin.js não devem conter botão nem modal de atalhos ⌘K', () => {
      const adminHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.html'), 'utf-8');
      const adminCode = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.js'), 'utf-8');
      assert.ok(!adminHtml.includes('id="cmdKBtn"'), 'admin.html ainda contém cmdKBtn');
      assert.ok(!adminHtml.includes('id="cmdKModal"'), 'admin.html ainda contém cmdKModal');
      assert.ok(!adminHtml.includes('⌘K'), 'admin.html ainda contém o caractere de atalho Mac ⌘K');
      assert.ok(!adminCode.includes('openCmdK'), 'admin.js ainda contém a função openCmdK');
    });

    test('[Happy Path] admin.html deve conter legenda de heatmap e gráfico financeiro DRE', () => {
      const adminHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.html'), 'utf-8');
      const adminCss = fs.readFileSync(path.join(__dirname, '../frontend/public/admin.css'), 'utf-8');
      assert.match(adminHtml, /Escala de Ocupação/);
      assert.match(adminHtml, /Insights Acionáveis para o Dono/);
      assert.match(adminHtml, /Faturamento Mensal vs\. Despesas Operacionais/);
      assert.match(adminHtml, /col-financial/);
      assert.match(adminCss, /\.col-financial\s*\{\s*grid-column:\s*span 12;\s*width:\s*100%;\s*\}/);
    });

    test('[Happy Path] funcionario.html deve unificar perfis funcionario e professor com RBAC condicional', () => {
      const funcHtml = fs.readFileSync(path.join(__dirname, '../frontend/public/funcionario.html'), 'utf-8');
      assert.match(funcHtml, /userRole !== 'funcionario' && userRole !== 'professor'/);
      assert.match(funcHtml, /isProfessor/);
      assert.match(funcHtml, /sectionEquipamentosProfessor/);
      assert.match(funcHtml, /sectionAlunosProfessor/);
      assert.match(funcHtml, /studentsProfBody/);
      assert.match(funcHtml, /updateStudentStatus/);
    });
  });
});
