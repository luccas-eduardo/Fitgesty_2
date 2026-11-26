# PLAN-003-refatoracao-frontend-fitness-oled
Status: Concluído
Issue: #3
Data: 2026-10-20

## Metadados SDD
- versao_plano: 2.0.0
- tipo: refactor
- blast_radius: médio
- orcamento_tokens: 15000

## Não-Objetivos / Fora de Escopo
- Não adicionar bibliotecas ou frameworks externos no package.json (0 dependências npm).
- Não alterar regras de negócio ou contratos das rotas da API REST do backend.
- Não utilizar bibliotecas externas de ícones ou gráficos via CDN (usar SVGs nativos).

## Contexto e Problema
A auditoria visual do `frontend-sentinel` diagnosticou a presença de "AI Slop" na camada frontend legada (gradientes roxo/azul borrados, tipografia conflitante entre Syne, DM Sans e Montserrat e arquivos monolíticos com mais de 600 linhas). O FitGesty precisa de uma renovação visual e arquitetural de nível boutique esportivo mundial (padrão Whoop/Apple Fitness), adotando o Preset Fitness OLED High-Energy (`#09090b`), Bento Grid e componentes gamificados, respeitando a Regra Ponytail #24 de arquivos com menos de 700 linhas.

## Requisitos EARS

| REQ | Tipo | Declaração |
| :--- | :--- | :--- |
| REQ-001 | ubiquitous | O sistema deve centralizar tokens de design (cores, tipografia, espaçamentos) no arquivo design-tokens.css utilizando a paleta Fitness OLED High-Energy. |
| REQ-002 | event | Quando o usuário acessar login.html, o sistema deve renderizar o card de login em estilo Glassmorphism translúcido com iluminação radial biométrica sutil e botão de acesso em gradiente Ember Strain. |
| REQ-003 | ubiquitous | O sistema deve estruturar o painel administrativo admin.html em uma grade Bento Grid modular e responsiva com Sparkline SVG de alunos ativos e heatmap de ocupação semanal. |
| REQ-004 | event | Quando o usuário pressionar a combinação de teclas Cmd+K ou Ctrl+K no admin, o sistema deve exibir a Command Palette com atalhos de navegação e filtros rápidos. |
| REQ-005 | ubiquitous | O sistema deve renderizar no portal do aluno aluno.html os Activity Metric Rings concêntricos em SVG (Move, Exercise, Stand) e o Level Badge gamificado com barra de XP. |
| REQ-006 | event | Quando o aluno interagir com o checklist de treinos em aluno.html, o sistema deve atualizar o estado de conclusão com feedback visual imediato e persistência em localStorage. |
| REQ-007 | unwanted | Se a tela for visualizada em viewport móvel de 375px, o sistema não deve permitir overflow ou scroll horizontal indesejado na viewport principal. |

## Orçamentos Não-Funcionais
- Zero dependências externas no package.json (0 pacotes npm).
- Todos os arquivos de código de produção estritamente abaixo do orçamento de 700 linhas (Regra Tear #24).
- Contraste tipográfico conforme padrões WCAG 2.1 AA (taxa de contraste superior a 7:1 em texto primário).
- Cobertura de testes automatizados com node:test maior ou igual a 80%.
- Tempo de carregamento de assets estáticos inferior a 50ms em rede local.

## Hotspots Compartilhados
- frontend/public/login.html
- frontend/public/admin.html
- frontend/public/aluno.html
- frontend/public/base.css
- frontend/public/styles.css

## T1
- Requisitos: REQ-001
- Agent: design-system-architect
- Model: inherit
- Effort: baixo
- Tempo: 15m
- Depends-on: nenhuma

## T2
- Requisitos: REQ-002
- Agent: web-craft-designer
- Model: inherit
- Effort: baixo
- Tempo: 15m
- Depends-on: T1

## T3
- Requisitos: REQ-003, REQ-004
- Agent: frontend-engineer
- Model: inherit
- Effort: médio
- Tempo: 25m
- Depends-on: T1

## T4
- Requisitos: REQ-005, REQ-006
- Agent: frontend-engineer
- Model: inherit
- Effort: médio
- Tempo: 25m
- Depends-on: T1

## T5
- Requisitos: REQ-007
- Agent: frontend-sentinel
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: T2, T3, T4

## T6
- Requisitos: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007
- Agent: tear-qa
- Model: inherit
- Effort: alto
- Tempo: 25m
- Depends-on: T1, T2, T3, T4, T5

## Matriz de Rastreabilidade

| REQ | TAREFA | TESTE |
| :--- | :--- | :--- |
| REQ-001 | T1, T6 | test/frontend.test.js#design-tokens-oled |
| REQ-002 | T2, T6 | test/server.test.js#static-login-mapping |
| REQ-003 | T3, T6 | test/frontend.test.js#admin-bento-navigation |
| REQ-004 | T3, T6 | test/frontend.test.js#admin-cmdk-palette |
| REQ-005 | T4, T6 | test/frontend.test.js#aluno-activity-rings |
| REQ-006 | T4, T6 | test/frontend.test.js#aluno-workout-checklist |
| REQ-007 | T5, T6 | test/frontend.test.js#static-assets-200 |

## 🛡️ Critérios de Aceite (Definition of Done)
* [x] Zero pacotes npm instalados (dependencies e devDependencies vazios no package.json).
* [x] Preset Fitness OLED High-Energy injetado com tokens de mercado (#09090b, #84cc16, #f97316, #06b6d4).
* [x] login.html refatorado com Glassmorphism Card e botão Ember Gradient.
* [x] admin.html transformado em Bento Grid responsivo com Sparkline SVG e Command Palette (Cmd+K).
* [x] aluno.html equipado com Activity Metric Rings, Level Badge e checklist de treinos diários.
* [x] Todos os arquivos modulares abaixo de 450 linhas (respeitando o orçamento de 700 linhas da Regra Ponytail #24).
* [x] Scanner do frontend-sentinel zerado (0 violações de AI Slop).
* [x] Suíte de testes automatizados com 39 testes passando 100% verdes.
