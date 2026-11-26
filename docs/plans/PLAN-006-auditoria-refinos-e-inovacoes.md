# PLAN-006-auditoria-refinos-e-inovacoes
Status: Aprovado
Issue: #6
Data: 2026-10-30

## Metadados SDD
- versao_plano: 2.0.0
- tipo: feature
- blast_radius: médio
- orcamento_tokens: 16000

## Não-Objetivos / Fora de Escopo
- Não adicionar frameworks ou dependências pesadas externas no package.json (zero-dependencies estrito, gráficos nativos SVG per Opção 1 ratificada).
- Não violar o teto de 700 linhas por arquivo da Regra Ponytail #24.
- Não abrir link externo de WhatsApp no fluxo de teste até a homologação da conta business oficial do FitGesty.

## Contexto e Decisões Ratificadas
1. **Fase 1 (Quick Wins & Visual)**:
   - Remover "Carlos Eduardo" do card flutuante na LP, mantendo apenas "Lead Qualificado • Musculação & Funcional".
   - Atualizar CTAs de "Entrar no Sistema" para "Testar Sistema Gratuito!".
   - Remover o número da Pacto (`5562981626555`) do lead-bot, apresentando confirmação de recebimento no chat sem abrir link externo.
   - Remover botão e modal de Atalhos (`⌘K`) da interface de administração.
   - Corrigir o modo de Alto Contraste no Light Theme eliminando o bug de textos escuros sobre fundo preto.
2. **Fase 2 (Painel do Aluno - Hidratação)**:
   - Adicionar widget interativo com botões de incremento (`+250ml`, `+500ml`, Zerar) e atualização em tempo real do anel SVG `ringStand`.
3. **Fase 3 (Painel do Administrador - Inteligência, Métricas & Gestão)**:
   - Legenda explicativa de cores e card de insights de negócio para o Heatmap de ocupação.
   - Funil de conversão de leads e tráfego financeiro potencial.
   - Gráfico nativo SVG de Faturamento Mensal vs. Despesas e DRE gerencial.
   - Gestão ativa de status para Alunos, Tarefas e Recursos (edição inline).
4. **Fase 4 (RBAC Colaboradores: Funcionário vs Professor)**:
   - Interface unificada para colaboradores (`funcionario.html`), condicionando visibilidade e ações conforme a role autenticada (`funcionario` vs `professor`).
   - Bloquear alteração de status de alunos, equipamentos e reservas para funcionários comuns; liberar controle pedagógico, equipamentos e reservas para professores.

## Requisitos EARS

| REQ | Tipo | Declaração |
| :--- | :--- | :--- |
| REQ-001 | ubiquitous | O sistema deve ocultar nomes próprios simulados nos cards flutuantes da Landing Page. |
| REQ-002 | ubiquitous | O sistema deve apresentar botões de chamada com o texto Testar Sistema Gratuito nos pontos de conversão da Landing Page. |
| REQ-003 | event | Quando o assistente virtual coletar os dados do lead, o sistema deve registrar a solicitação sem abrir links externos de mensageria. |
| REQ-004 | state | Enquanto o Alto Contraste estiver ativo com o Tema Claro, o sistema deve exibir cartões e textos com fundo branco e contraste escuro absoluto. |
| REQ-005 | event | Quando o aluno registrar consumo de água, o sistema deve atualizar dinamicamente a contagem em litros e o anel SVG de hidratação. |
| REQ-006 | ubiquitous | O sistema deve disponibilizar legenda de ocupação e recomendações de gestão no cartão de Heatmap da administração. |
| REQ-007 | ubiquitous | O sistema deve exibir indicadores de conversão de leads e gráfico semestral SVG de faturamento e despesas. |
| REQ-008 | event | Quando o administrador alterar o status de um registro nas tabelas, o sistema deve persistir a atualização via requisição PUT. |
| REQ-009 | ubiquitous | O sistema deve dispensar o botão e o modal de atalhos ⌘K na interface administrativa. |
| REQ-010 | state | Enquanto o usuário estiver autenticado como funcionário comum, o sistema deve bloquear ações de reserva de salas e alteração de maquinário. |
| REQ-011 | ubiquitous | O sistema deve dimensionar o card de demonstrativo financeiro DRE ocupando as 12 colunas completas do grid Bento na administração. |
| REQ-012 | state | Enquanto o usuário estiver autenticado como professor, o sistema deve exibir a tabela de alunos permitindo atualização de status de matrícula e registro de presença, bloqueando essa alteração para funcionários comuns. |

## Orçamentos Não-Funcionais
- Zero dependências externas adicionadas.
- Limite de 700 linhas por arquivo (Regra Ponytail #24).
- 100% dos testes unitários e de integração passando verde.
- WCAG AA / AAA compliance.

## Hotspots Compartilhados
- backend/server.js
- frontend/public/index.html
- frontend/public/lead-bot.js
- frontend/public/admin.html
- frontend/public/admin.js
- frontend/public/admin.css
- frontend/public/admin-leads.js
- frontend/public/aluno.html
- frontend/public/aluno.js
- frontend/public/aluno.css
- frontend/public/funcionario.html
- frontend/public/design-tokens.css
- frontend/public/base.css
- test/frontend.test.js
- test/server.test.js

## T1
- Requisitos: REQ-001, REQ-002, REQ-003, REQ-009
- Agent: frontend-engineer
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: nenhuma

## T2
- Requisitos: REQ-004, REQ-005
- Agent: design-system-architect
- Model: inherit
- Effort: médio
- Tempo: 25m
- Depends-on: nenhuma

## T3
- Requisitos: REQ-006, REQ-007, REQ-008, REQ-011
- Agent: tear-frontend
- Model: inherit
- Effort: alto
- Tempo: 35m
- Depends-on: T1, T2

## T4
- Requisitos: REQ-010, REQ-012
- Agent: tear-backend
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: T1, T3

## Matriz de Rastreabilidade

| REQ | TAREFA | TESTE |
| :--- | :--- | :--- |
| REQ-001 | T1 | test/frontend.test.js#lp-clean-showcase |
| REQ-002 | T1 | test/frontend.test.js#lp-cta-free-trial |
| REQ-003 | T1 | test/frontend.test.js#lead-bot-safe-confirmation |
| REQ-004 | T2 | test/frontend.test.js#high-contrast-light-mode |
| REQ-005 | T2 | test/frontend.test.js#aluno-hydration-tracker |
| REQ-006 | T3 | test/frontend.test.js#admin-heatmap-scale-insights |
| REQ-007 | T3 | test/frontend.test.js#admin-financial-dre-chart |
| REQ-008 | T3 | test/frontend.test.js#admin-inline-status-update |
| REQ-009 | T1 | test/frontend.test.js#admin-no-cmdk-shortcuts |
| REQ-010 | T4 | test/server.test.js#rbac-funcionario-vs-professor |
| REQ-011 | T3 | test/frontend.test.js#admin-financial-dre-span12 |
| REQ-012 | T4 | test/server.test.js#rbac-professor-aluno-status |

## 🛡️ Critérios de Aceite (Definition of Done)
* [x] Landing Page limpa sem nomes próprios artificiais em cards flutuantes.
* [x] CTAs convidando para Testar Sistema Gratuito!.
* [x] Chat do consultor registrando leads sem link externo da Pacto.
* [x] Alto Contraste funcional sem bugs de cores no Tema Claro.
* [x] Registro diário de hidratação no painel do aluno com anel dinâmico.
* [x] Heatmap no admin com legenda percentual de 4 cores e insights acionáveis.
* [x] Gráfico SVG nativo de faturamento e despesas com DRE gerencial.
* [x] Card de DRE e Faturamento Mensal preenchendo as 12 colunas do Bento Grid.
* [x] Admin capaz de alterar status de alunos, tarefas e recursos inline.
* [x] Remoção completa da aba e atalhos ⌘K.
* [x] RBAC unificado em funcionario.html separando professor e funcionário.
* [x] Seção de Alunos e Presença liberada para o professor com bloqueio para funcionários.
* [x] Suíte TDD com 55 testes 100% verde.
