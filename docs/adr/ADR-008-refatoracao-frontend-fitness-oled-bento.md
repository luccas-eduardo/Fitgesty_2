---
numero: 8
titulo: Refatoração Frontend com Preset Fitness OLED High-Energy e Arquitetura Bento Grid
status: Aprovado
data: 2026-10-20
autores: ["Kazuhiro Kamimura", "design-system-architect", "frontend-engineer"]
aplica_a: ["frontend/public/**"]
tags: ["frontend", "design-tokens", "bento-grid", "fitness-oled", "a11y", "ponytail"]
---

# ADR-008: Refatoração Frontend com Preset Fitness OLED High-Energy e Arquitetura Bento Grid

## Decisão

No contexto de evolução estética e operacional do FitGesty para posicionamento de alto padrão competitivo, enfrentando a proliferação de AI Slop e acoplamento em arquivos monolíticos que violavam o orçamento de linhas, decidimos por adotar o Preset Fitness OLED High-Energy estruturado em Bento Grid modular, Activity Metric Rings em SVG e Gamificação de Atleta com desacoplamento de arquivos per Regra Ponytail #24, para alcançar conformidade visual boutique esportiva, acessibilidade WCAG AA e carregamento instantâneo sem dependências, aceitando a manutenção interna das geometrias SVG e de arquivos modulares separados.

## Contexto e Forças

A auditoria de baseline executada pelo `frontend-sentinel` identificou sintomas críticos de AI Slop no frontend legado:
1. **Passivo Estético Datado:** Gradientes lineares genéricos roxos/azuis em cards e botões sem ancoragem conceitual esportiva.
2. **Desordem Tipográfica:** Conflito entre múltiplas fontes carregadas simultaneamente (`Syne`, `DM Sans`, `Montserrat`).
3. **Acoplamento e Div Soup:** Arquivos monolíticos com HTML, CSS e JS indevidamente misturados, com `admin.html` ultrapassando 600 linhas.
4. **Demandas do Atleta Moderno:** Necessidade de feedback biométrico visual imediato (anéis concêntricos de atividade diária, progressão gamificada de XP e checklists táteis).
5. **Navegação Produtiva de Alta Densidade:** Necessidade de uma Command Palette (`Cmd+K`) para atalhos operacionais rápidos do administrador.

## Opções Consideradas

1. **Opção 1 (Adoção de Frameworks Pesados — Next.js / Tailwind CSS / Lucide Icons):** Reescrita do frontend em framework React com Tailwind. Rejeitada por violar o princípio Zero-Dependency do FitGesty, gerar centenas de megabytes em `node_modules` e introduzir etapa obrigatória de build.
2. **Opção 2 (Ajuste Pontual no CSS Monolítico Legado):** Manter os arquivos monolíticos existentes apenas alterando cores pontuais no `base.css`. Rejeitada por perpetuar o inchaço de código (*code bloat*), mantendo arquivos acima de 600 linhas e violando o orçamento de 700 linhas da Regra Tear #24.
3. **Opção 3 (Nova Esquadra com Tokens Nativos, Bento Grid e Modularização Ponytail — RECOMENDADA):** Utilização dos tokens canônicos do preset `fitness-oled` (`design-tokens.css`), desacoplamento de estilos e scripts (`admin.css`, `admin.js`, `aluno.css`, `aluno.js`), anéis SVG nativos inspirados no MCP `magic-21st` e persistência local tátil sem bibliotecas externas.

## Detalhes da Implementação

1. **Tokens Semânticos de Alta Energia (`design-tokens.css`):**
   - Cores primárias: Deep Charcoal (`#09090b`), Superfície Glass (`#121218`), Borda Sutil (`rgba(255,255,255,0.08)`).
   - Acentos Biométricos: Neon Lime (`#84cc16`), Ember Strain (`#f97316`), Laser Cyan (`#06b6d4`).
   - Tipografia: Display (`Space Grotesk`), Sans (`Inter`), Mono (`JetBrains Mono`).
2. **Autenticação Tátil (`login.html`):** Card Obsidian Glass translúcido com iluminação radial biométrica sutil, inputs com anel de foco em Neon Lime e botão com gradiente Ember Strain.
3. **Bento Grid Operacional (`admin.html`):**
   - KPI Hero de Alunos Ativos com Sparkline SVG vetorial e status dot pulsante.
   - Heatmap de ocupação semanal (06h às 22h) com proteção anti-overflow em viewport 375px.
   - Command Palette modal com acionamento global via `Cmd+K` / `Ctrl+K`.
4. **Painel Esportivo Gamificado (`aluno.html`):**
   - Activity Metric Rings concêntricos em SVG (Move/Ember, Exercício/Lime, Hidratação/Cyan) com cálculo dinâmico de `stroke-dashoffset`.
   - Level Badge ("⚡ NÍVEL 14 • ATLETA PRO") e XP Bar com efeito *shimmer* dinâmico.
   - Checklist de treinos interativo com persistência em `localStorage` (`fit_today_workout`).

## Consequências

### Positivas
- **Zero AI Slop:** 0 violações remanescentes no scanner de auditoria do `frontend-sentinel`.
- **Zero Dependências Preservado:** 100% Vanilla JS, HTML5 semântico e CSS3 Moderno, sem build steps.
- **Conformidade com a Regra Ponytail #24:** Nenhum arquivo excede 450 linhas (redução de mais de 45% sobre o limite de 700 linhas).
- **Acessibilidade WCAG AA:** Contraste superior a 7:1 em texto normal e botões com atalhos de alto contraste e redimensionamento de fonte.
- **Suíte TDD Intacta:** 39/39 testes verdes mantidos com 100% de sucesso.
- **Conformidade LGPD:** Sanitização rigorosa de placeholders e massa de testes com domínios autorizados (`@exemplo.com`, `@test.com`), impedindo vazamento acidental de identificadores pessoais no diff.

### Negativas
- Os SVGs dos anéis de atividade e sparklines requerem cálculos manuais de raio e circunferência caso novos anéis métricos sejam adicionados no futuro.
- A persistência do checklist de treinos em `localStorage` é local ao navegador do aluno; integração com banco SQLite pode ser implementada em sprint futura.

### Neutras/Riscos Mitigados
- Riscos de inconsistência de layout mitigados pela especificação formal em `.preview/layout_spec.json`.
- Riscos de regressão visual mitigados pela validação automatizada de tokens e laudo em `.preview/laudo_auditoria_frontend.md`.
- Riscos de overflow horizontal em mobile mitigados pelo encapsulamento de tabelas e grids com `overflow-x: auto;` e paddings de 16px.
