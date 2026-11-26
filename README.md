# ⚡ FitGesty — Enterprise Fitness Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Node.js_v24+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Architecture-Zero--Dependency-8B5CF6?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/Design_Preset-Fitness_OLED_High--Energy-84cc16?style=for-the-badge" alt="Fitness OLED Preset" />
  <img src="https://img.shields.io/badge/Database-SQLite_WAL_Native-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite Native" />
  <img src="https://img.shields.io/badge/Security-JWT_HMAC--SHA256-blue?style=for-the-badge" alt="JWT" />
  <img src="https://img.shields.io/badge/Tests-100%25_Pass_TDD-success?style=for-the-badge" alt="TDD 100%" />
  <img src="https://img.shields.io/badge/A11y-WCAG_2.1_AA-10B981?style=for-the-badge" alt="A11y WCAG AA" />
  <img src="https://img.shields.io/badge/License-MIT-gray?style=for-the-badge" alt="MIT License" />
</p>

> **FitGesty** é uma plataforma corporativa para gestão operacional e engajamento atlético de academias e centros esportivos, desenvolvida a partir de primeiros princípios em **Node.js puro com zero dependências externas**. O sistema centraliza o controle de matrículas, agendamento de espaços coletivos com transações atômicas ACID, delegação de tarefas operacionais, motor de captação de leads e um portal atlético de alta performance com anéis métricos estilo Apple Fitness e Bento Grid responsivo.

---

## 🎯 Destaques do Projeto

* 🚀 **Zero Dependências Externas (Zero-Dependency):** Servidor HTTP nativo, roteador REST artesanal, autenticação JWT via `node:crypto` e banco de dados SQLite nativo via `node:sqlite`. Nenhum framework pesado, nenhum pacote de terceiro instalado via npm.
* 🎨 **Preset Fitness OLED High-Energy & Zero AI Slop:** Interface de alto padrão inspirada em referências mundiais (Whoop, Strava e Apple Fitness), com paleta Deep Charcoal (`#09090b`), acentos Neon Lime (`#84cc16`), Ember Strain (`#f97316`) e Laser Cyan (`#06b6d4`), erradicando passivos estéticos datados.
* ⭕ **Activity Metric Rings & Gamificação de Atleta:** Portal do aluno com anéis concêntricos vetoriais em SVG (Move/Calorias, Exercício e Hidratação), Level Shield ("⚡ Nível 14 • Atleta Pro"), XP Bar com *shimmer* dinâmico e checklist tátil de treinos diários com persistência local.
* ⚡ **Dashboard Bento Grid com Command Palette (`Cmd+K`):** Painel administrativo modular assimétrico com Sparkline SVG vetorial de alunos ativos, status dot pulsante, heatmap semanal de ocupação por catraca e atalhos rápidos de teclado.
* 🛡️ **Persistência Relacional ACID & Concorrência:** Armazenamento em **SQLite em modo WAL (`PRAGMA journal_mode = WAL`)** com isolamento transacional estrito (`BEGIN IMMEDIATE`) para reservas de salas e espaços, eliminando race conditions e double-spend de vagas.
* 🔒 **Segurança Reforçada (OWASP Hardening):** Tokens JWT nativos (HMAC-SHA256) com tempo de expiração (`exp`), mitigação completa de Cross-Site Scripting (XSS) com sanitização de output (`escapeHtml`), e headers de proteção de sessão.
* ♿ **Acessibilidade Universal (WCAG 2.1 AA):** Alternância instantânea para modo de Alto Contraste (preto/amarelo com taxa de contraste $\ge 7:1$), ampliação tipográfica dinâmica e marcação semântica assistiva com atributos ARIA.
* 🧪 **Suíte de Testes Automatizados TDD (Node.js Test Runner):** 32 testes unitários e de integração cobrindo os 3 cenários obrigatórios (Happy Path, Edge Case, Error Path) com 100% de aprovação.
* 💬 **Motor Conversacional de Leads (Padrão Sistema Pacto):** Widget dialógico nativo (< 15KB) com simulação de digitação em dois tempos, validação reflexiva de nome, máscara de WhatsApp e ingestão direta no banco SQLite WAL com rastreamento UTM completo.

---

## 🏛️ Arquitetura do Sistema

```mermaid
flowchart LR
    subgraph Client["Camada de Apresentação (Browser)"]
        UI_A["admin.html (Bento Grid & Cmd+K)"]
        UI_F["funcionario.html (Operação)"]
        UI_S["aluno.html (Metric Rings & Gamificação)"]
        TOKENS["design-tokens.css (Fitness OLED)"]
    end

    subgraph Core["Servidor Node.js Nativo (Zero-Dependency)"]
        Mux["HTTP Server & Request Router"]
        StaticEngine["Static File Delivery & MIME Mapping"]
        AuthGuard["JWT Auth & RBAC Security Guard"]
        DomainEngine["Validation Engine & Business Rules"]
    end

    subgraph Persistence["Camada de Dados ACID"]
        DBEngine["SQLite Engine (node:sqlite)"]
        WAL[("fitgesty.sqlite (WAL Mode)")]
    end

    Client -->|REST API (Bearer JWT)| Mux
    Mux --> StaticEngine
    Mux --> AuthGuard
    AuthGuard --> DomainEngine
    DomainEngine --> DBEngine
    DBEngine <-->|BEGIN IMMEDIATE Transactions| WAL
```

---

## ⚡ Início Rápido (Quickstart)

Sem necessidade de `npm install` ou configurações externas. Basta possuir o [Node.js](https://nodejs.org/) (v22.5+ ou v24+ com suporte nativo a `node:sqlite`).

### 1. Iniciar o servidor
```bash
node backend/server.js
```

### 2. Acessar no navegador
Abra **`http://localhost:3000`**

O banco de dados relacional local (`backend/fitgesty.sqlite`) será gerado automaticamente com dados de demonstração na primeira inicialização.

### 3. Executar a Suíte de Testes
```bash
node --test
```
Ou com relatório de cobertura nativo:
```bash
node --test --experimental-test-coverage
```

### 4. Sincronização Diária no GitHub
```bash
npm run sync
```

---

## 🔑 Credenciais de Acesso (Demonstração)

| Perfil | Usuário | Senha | Painel de Destino | Principais Recursos |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `x` | `admin.html` | Bento Grid, Sparklines SVG, Heatmap de ocupação, Command Palette (`Cmd+K`), pipeline de leads e cadastros. |
| **Funcionário** | `funcionario` | `x` | `funcionario.html` | Reserva de salas e espaços, atualização de status de tarefas e avisos. |
| **Aluno** | `aluno` | `x` | `aluno.html` | Activity Metric Rings (Apple Fitness style), Level Badge & XP Bar, checklist tátil e mural. |

---

## 📡 Endpoints da API REST

O backend provê uma API RESTful completa e padronizada sob `/api`:

```http
POST   /api/login                  # Autenticação, emissão de JWT e autorização
GET    /api/health                 # Heartbeat e telemetria do servidor
GET    /api/dashboard              # Métricas consolidadas em tempo real
GET    /api/members                # Listagem de alunos (suporta ?q= e ?status=)
POST   /api/members                # Cadastro de novo aluno com validação
PUT    /api/members/:id            # Atualização cadastral do aluno
DELETE /api/members/:id            # Remoção física do registro
GET    /api/resources              # Inventário de equipamentos e salas
POST   /api/resources              # Cadastro de recurso patrimonial
PUT    /api/resources/:id          # Atualização de status e disponibilidade
DELETE /api/resources/:id          # Baixa de equipamento/espaço
POST   /api/resources/:id/reserve  # Reserva atômica de vaga (Hermes Transact Guard)
POST   /api/resources/:id/release  # Liberação atômica de vaga
GET    /api/tasks                  # Consulta de tarefas operacionais
POST   /api/tasks                  # Criação e atribuição de tarefa
PUT    /api/tasks/:id              # Atualização de status/conclusão
DELETE /api/tasks/:id              # Exclusão de tarefa
GET    /api/announcements          # Leitura de comunicados oficiais
POST   /api/announcements          # Emissão de comunicado segmentado
DELETE /api/announcements/:id      # Exclusão de comunicado
POST   /api/leads/capturar         # Ingestão de leads do chatbot com UTMs
GET    /api/leads                  # Listagem de leads qualificados (Admin)
```

---

## 📚 Documentação Técnica e Registros Arquiteturais

Este repositório é governado sob a disciplina estrita do **Tear** e **Noesis**:

* 🏛️ [ADR-008: Refatoração Frontend com Preset Fitness OLED e Bento Grid](docs/adr/ADR-008-refatoracao-frontend-fitness-oled-bento.md)
* 📐 [PLAN-003: Refatoração Frontend Fitness OLED](docs/plans/PLAN-003-refatoracao-frontend-fitness-oled.md)
* 🏛️ [ADR-007: Motor Conversacional de Leads com SQLite WAL](docs/adr/ADR-007-motor-conversacional-leads-sqlite.md)
* 📐 [PLAN-002: Motor Conversacional de Leads](docs/plans/PLAN-002-motor-conversacional-leads.md)
* 🏛️ [ADR-006: Migração para SQLite Nativo e Hardening](docs/adr/ADR-006-migracao-sqlite-e-hardening.md)
* 📐 [PLAN-001: Segurança e SQLite](docs/plans/PLAN-001-seguranca-e-sqlite.md)
* 📑 [Laudo Pericial Forense (Tear + Noesis + Hermes)](documentation/auditorias/LAUDO_PERICIAL_LEGADO.md)
* 🎓 [Artigo Técnico-Científico (Padrão SBC / IEEE)](documentation/academico/ARTIGO_TECNICO_CIENTIFICO.md)
* 🪐 [Dossiê Epistêmico 90/10](documentation/academico/DOSSIE_EPISTEMICO_90_10.md)

---

## 👨‍💻 Autor

Desenvolvido por **Kazuhiro Kamimura**  
* GitHub: [@kazuhirokamim](https://github.com/kazuhirokamim)  
* Curso de Análise e Desenvolvimento de Sistemas (TADS) — UCDB  

---

## 📄 Licença

Este projeto está sob a licença [MIT](package.json).
