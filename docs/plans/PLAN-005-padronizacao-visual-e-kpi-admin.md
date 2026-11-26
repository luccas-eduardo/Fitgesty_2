# PLAN-005-padronizacao-visual-e-kpi-admin
Status: Aprovado
Issue: #5
Data: 2026-10-29

## Metadados SDD
- versao_plano: 2.0.0
- tipo: feature
- blast_radius: médio
- orcamento_tokens: 14000

## Não-Objetivos / Fora de Escopo
- Não adicionar frameworks ou dependências de terceiros no package.json (zero-dependencies estrito).
- Não violar o teto de 700 linhas por arquivo da Regra Ponytail #24.
- Não descaracterizar a paleta institucional do logotipo FitGesty (#0f172a / #2563eb).

## Contexto e Problema
1. As funcionalidades de alternância de tema (Dark/Light mode), alto contraste e ajuste de tamanho de fonte estão ativas e funcionando no painel do funcionário, porém encontram-se inconsistentes ou incompletas nos painéis do aluno e do administrador devido a chaves divergentes no localStorage (`fitgesty_theme` vs `fit_theme`) e seletores isolados.
2. Todas as interfaces possuem emojis em botões, cartões, tabelas e modais, reduzindo a percepção de produto corporativo de alta tecnologia.
3. No tema claro, há saturação de branco plano (`#ffffff`) sem diferenciação de camadas de elevação e profundidade ótica, enquanto algumas caixas e gavetas de seção permanecem escurecidas de forma isolada, gerando quebra visual.
4. No dashboard do administrador, o card de KPI "Alunos Ativos" (`#metric-alunos`) não altera seu valor dinamicamente após o cadastro ou remoção de alunos devido a um descasamento de nomenclatura entre os dados devolvidos pelo backend (`activeMembers`) e os atributos consumidos pelo frontend (`membersCount`).
5. As demais operações de cadastro e gestão (tarefas, equipamentos, espaços e comunicados) precisam de auditoria ponta a ponta para comprovação de integridade lógica em demonstração prática.

## Requisitos EARS

| REQ | Tipo | Declaração |
| :--- | :--- | :--- |
| REQ-001 | ubiquitous | O sistema deve compartilhar um módulo unificado de controle de tema (Light/Dark), alto contraste e tamanho de fonte com persistência sincronizada em localStorage em admin.html, aluno.html e funcionario.html. |
| REQ-002 | ubiquitous | O sistema deve utilizar micro-ícones vetoriais SVG nítidos e padronizados em substituição aos emojis legados em todas as interfaces web. |
| REQ-003 | ubiquitous | O sistema deve estabelecer três camadas ópticas de elevação no modo claro com background grounded, cards brancos e bordas definidas eliminando caixas escuras descoladas. |
| REQ-004 | event | Quando um membro for cadastrado ou removido na interface de administração, o sistema deve atualizar imediatamente o indicador de Alunos Ativos. |
| REQ-005 | ubiquitous | O sistema deve fornecer tanto as propriedades canônicas quanto aliases de retrocompatibilidade para contagem de membros ativos no endpoint do dashboard. |
| REQ-006 | ubiquitous | O sistema deve manter a integridade funcional sem erros não tratados em todas as telas de gerenciamento de membros, tarefas, recursos, comunicados e leads. |

## Orçamentos Não-Funcionais
- Zero dependências externas no package.json.
- Linhas por arquivo: cada arquivo modificado deve permanecer estritamente abaixo de 700 linhas (Regra Ponytail #24).
- Cobertura de testes automatizados com node:test maior ou igual a 80%.
- Acessibilidade WCAG 2.1 AA com taxas de contraste superiores a 4.5:1 no tema padrão e 7:1 no alto contraste.

## Hotspots Compartilhados
- backend/db.js
- frontend/public/design-tokens.css
- frontend/public/admin.html
- frontend/public/admin.js
- frontend/public/admin.css
- frontend/public/aluno.html
- frontend/public/aluno.js
- frontend/public/aluno.css
- frontend/public/funcionario.html
- frontend/public/styles.css
- test/server.test.js
- test/frontend.test.js

## T1
- Requisitos: REQ-004, REQ-005
- Agent: tear-backend
- Model: inherit
- Effort: baixo
- Tempo: 15m
- Depends-on: nenhuma

## T2
- Requisitos: REQ-001, REQ-003
- Agent: design-system-architect
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: nenhuma

## T3
- Requisitos: REQ-001, REQ-002, REQ-003, REQ-004, REQ-006
- Agent: frontend-engineer
- Model: inherit
- Effort: alto
- Tempo: 35m
- Depends-on: T1, T2

## T4
- Requisitos: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
- Agent: tear-qa
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: T1, T2, T3

## Matriz de Rastreabilidade

| REQ | TAREFA | TESTE |
| :--- | :--- | :--- |
| REQ-001 | T2, T3, T4 | test/frontend.test.js#theme-and-a11y-sync |
| REQ-002 | T3, T4 | test/frontend.test.js#svg-icons-no-emojis |
| REQ-003 | T2, T3, T4 | test/frontend.test.js#light-theme-elevation |
| REQ-004 | T1, T3, T4 | test/server.test.js#dashboard-active-members-update |
| REQ-005 | T1, T4 | test/server.test.js#dashboard-metrics-contract |
| REQ-006 | T1, T3, T4 | test/server.test.js#crud-integrity-all-modules |

## 🛡️ Critérios de Aceite (Definition of Done)
* [ ] Light/Dark mode, Alto Contraste e Aumento de Fonte funcionando de forma sincronizada em admin.html, aluno.html e funcionario.html.
* [ ] Emojis substituídos por micro-ícones vetoriais SVG nítidos e profissionais em todas as telas.
* [ ] Modo claro padronizado com profundidade ótica (fundo #f1f5f9, cards #ffffff, bordas #cbd5e1, sombras multicamadas) sem caixas escurecidas órfãs.
* [ ] Card de Alunos Ativos no Admin atualizando dinamicamente a contagem real após inserção e remoção de alunos.
* [ ] Todas as funcionalidades de CRUD (membros, recursos, tarefas, comunicados, leads) validadas e funcionais.
* [ ] Todos os arquivos abaixo de 700 linhas.
* [ ] Suíte TDD 100% verde com novos cenários unitários e de integração.
