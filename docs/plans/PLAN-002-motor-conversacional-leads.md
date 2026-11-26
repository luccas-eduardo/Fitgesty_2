# PLAN-002-motor-conversacional-leads
Status: Proposto
Issue: #2
Data: 2026-10-15

## Metadados SDD
- versao_plano: 2.0.0
- tipo: feature
- blast_radius: baixo
- orcamento_tokens: 15000

## Não-Objetivos / Fora de Escopo
- Não integrar ferramentas SaaS terceirizadas de chat (Typebot, Leadster, Hubspot).
- Não instalar dependências no package.json (manter 0 dependências npm).
- Não criar interface de CRM complexa nesta issue (apenas tabela de dados, endpoints REST e widget conversacional).

## Contexto e Problema
A engenharia reversa nos concorrentes diretos (Nextfit e Sistema Pacto) demonstrou que formulários conversacionais dialógicos com simulação de digitação, validação reflexiva de nome e máscara de WhatsApp são os maiores geradores de reuniões e demonstrações do mercado fitness. O FitGesty atualmente não possui mecanismo de captação de leads na sua porta de entrada, dependendo de cadastros manuais de alunos no painel de administração.
Precisamos de um motor proprietário soberano, ultraleve (< 15KB) e nativo em Node.js + SQLite WAL.

## Requisitos EARS

| REQ | Tipo | Declaração |
| :--- | :--- | :--- |
| REQ-001 | ubiquitous | O sistema deve persistir leads qualificados em uma tabela relacional leads_demonstracao no banco fitgesty.sqlite com modo WAL e índices em data de criação e segmento. |
| REQ-002 | event | Quando uma requisição válida for enviada para POST /api/leads/capturar, o sistema deve registrar o lead com UUID v4, sanitizar as entradas contra XSS e responder com status HTTP 201 Created. |
| REQ-003 | unwanted | Se uma requisição para POST /api/leads/capturar contiver nome ausente, telefone com menos de 10 dígitos ou dados malformados, o sistema deve rejeitar a operação com HTTP 400 Bad Request. |
| REQ-004 | state | Enquanto um usuário autenticado com perfil admin requisitar GET /api/leads, o sistema deve retornar a lista de leads ordenada de forma decrescente pela data de criação. |
| REQ-005 | event | Quando o usuário clicar em qualquer elemento com o atributo data-open-demo-chat, o widget deve ser exibido com rolagem suave e simulação de digitação em dois tempos. |

## Orçamentos Não-Funcionais
- Zero dependências externas no package.json (0 pacotes npm).
- Latência de ingestão de lead inferior a 15ms.
- Tamanho total do script do widget inferior a 15KB.
- Cobertura de testes automatizados TDD com node:test maior ou igual a 80%.
- Limite máximo de 700 linhas por arquivo de código (Regra Tear #24).

## Hotspots Compartilhados
- backend/server.js
- frontend/public/styles.css

## T1
- Requisitos: REQ-001
- Agent: tear-database
- Model: inherit
- Effort: baixo
- Tempo: 15m
- Depends-on: nenhuma

## T2
- Requisitos: REQ-002, REQ-003
- Agent: tear-backend
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: T1

## T3
- Requisitos: REQ-004
- Agent: tear-backend
- Model: inherit
- Effort: baixo
- Tempo: 15m
- Depends-on: T1

## T4
- Requisitos: REQ-005
- Agent: tear-frontend
- Model: inherit
- Effort: médio
- Tempo: 25m
- Depends-on: T2

## T5
- Requisitos: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- Agent: tear-qa
- Model: inherit
- Effort: alto
- Tempo: 30m
- Depends-on: T1, T2, T3, T4

## Matriz de Rastreabilidade

| REQ | TAREFA | TESTE |
| :--- | :--- | :--- |
| REQ-001 | T1, T5 | test/server.test.js#leads-sqlite-persistence |
| REQ-002 | T2, T5 | test/server.test.js#leads-capture-success |
| REQ-003 | T2, T5 | test/server.test.js#leads-capture-validation-error |
| REQ-004 | T3, T5 | test/server.test.js#leads-admin-list |
| REQ-005 | T4, T5 | test/server.test.js#leads-widget-events |

## 🛡️ Critérios de Aceite (Definition of Done)
* [x] Zero pacotes npm instalados (dependencies e devDependencies vazios).
* [x] Tabela leads_demonstracao criada e persistida no banco backend/fitgesty.sqlite com modo WAL.
* [x] Rota POST /api/leads/capturar validada e sanitizada contra injeção de scripts (XSS).
* [x] Rota GET /api/leads protegida por autenticação JWT (apenas administradores).
* [x] Mínimo 3 cenários por teste unitário (Happy Path, Edge Case, Error Path) passando 100% verdes.
* [x] Componente visual conversacional operando com o listener [data-open-demo-chat].
* [x] Limite de 700 linhas por arquivo respeitado em todos os módulos alterados.
