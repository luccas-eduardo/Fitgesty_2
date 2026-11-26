# PLAN-004-landing-page-e-desacoplamento-auth
Status: Aprovado
Issue: #4
Data: 2026-10-29

## Metadados SDD
- versao_plano: 2.0.0
- tipo: feature
- blast_radius: médio
- orcamento_tokens: 12000

## Não-Objetivos / Fora de Escopo
- Não instalar nenhum framework ou dependência externa via npm (preservar 0-dependencies).
- Não quebrar ou alterar a API REST existente de alunos, recursos, tarefas ou leads.
- Não ultrapassar o limite de 700 linhas nos arquivos criados ou modificados (Regra Tear #24).

## Contexto e Problema
O sistema FitGesty atualmente inicia diretamente na tela de login (`/` -> `login.html`), onde o widget do Consultor FitGesty (`lead-bot.js`) estava inserido no rodapé. Isso gera ambiguidade para a banca avaliadora e para novos clientes: uma tela de login restrita não é o local adequado para captação de novos clientes ou visitantes.
O projeto necessita de uma Landing Page (LP) oficial e moderna (`index.html`), alinhada com a nova tese de valor para o Dono da Academia, com o Consultor conversacional devidamente ancorado para captação de leads/matrículas, link direto para login (`/login.html`), e limpeza completa da tela de login, garantindo hardening visual e comportamental contra senhas incorretas.

## Requisitos EARS

| REQ | Tipo | Declaração |
| :--- | :--- | :--- |
| REQ-001 | ubiquitous | O sistema deve servir a Landing Page oficial index.html na rota raiz / utilizando a paleta Fitness OLED High-Energy. |
| REQ-002 | event | Quando o visitante acionar o botão de acesso na Landing Page, o sistema deve redirecioná-lo para login.html. |
| REQ-003 | ubiquitous | O sistema deve disponibilizar o widget do Consultor FitGesty lead-bot.js na Landing Page para qualificação de visitantes. |
| REQ-004 | event | Quando o usuário carregar login.html, o sistema deve apresentar exclusivamente o formulário de credenciais sem o script do lead-bot. |
| REQ-005 | unwanted | Se o usuário submeter credenciais inválidas em login.html, o sistema deve rejeitar a autenticação com código HTTP 401 e exibir mensagem de erro sem redirecionamento. |
| REQ-006 | ubiquitous | O sistema deve manter todas as interfaces web e folhas de estilo em conformidade com as diretrizes de acessibilidade WCAG 2.1 AA. |

## Orçamentos Não-Funcionais
- Zero dependências externas no package.json.
- Linhas por arquivo: index.html <= 400 linhas; server.js <= 450 linhas.
- Cobertura de testes automatizados com node:test maior ou igual a 80% (100% dos cenários felizes, borda e erro passando).
- Taxa de contraste de textos >= 7:1 em modo padrão e alto contraste.

## Hotspots Compartilhados
- backend/server.js
- frontend/public/index.html
- frontend/public/login.html
- test/server.test.js

## T1
- Requisitos: REQ-001, REQ-002, REQ-003
- Agent: frontend-engineer
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: nenhuma

## T2
- Requisitos: REQ-004, REQ-005
- Agent: tear-security
- Model: inherit
- Effort: baixo
- Tempo: 15m
- Depends-on: T1

## T3
- Requisitos: REQ-001, REQ-004, REQ-005
- Agent: tear-backend
- Model: inherit
- Effort: baixo
- Tempo: 10m
- Depends-on: T1, T2

## T4
- Requisitos: REQ-006
- Agent: design-system-architect
- Model: inherit
- Effort: baixo
- Tempo: 10m
- Depends-on: T1, T2

## T5
- Requisitos: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
- Agent: tear-qa
- Model: inherit
- Effort: médio
- Tempo: 15m
- Depends-on: T1, T2, T3, T4

## Matriz de Rastreabilidade

| REQ | TAREFA | TESTE |
| :--- | :--- | :--- |
| REQ-001 | T1, T3, T5 | test/server.test.js#static-root-mapping |
| REQ-002 | T1, T5 | test/server.test.js#static-root-mapping |
| REQ-003 | T1, T5 | test/server.test.js#static-root-mapping |
| REQ-004 | T2, T3, T5 | test/server.test.js#static-root-mapping |
| REQ-005 | T2, T5 | test/server.test.js#auth-bad-password |
| REQ-006 | T4, T5 | test/frontend.test.js#design-tokens-oled |

## 🛡️ Critérios de Aceite (Definition of Done)
* [x] Landing Page index.html implementada com Hero, Triângulo Virtuoso, paleta da marca e Consultor.
* [x] Botão de atendimento padronizado com o texto "Atendimento com Consultor".
* [x] Logotipo oficial aplicado em index.html, login.html, admin.html, aluno.html e funcionario.html.
* [x] Favicon com o ícone oficial em todas as abas.
* [x] Alternador de tema claro/escuro com persistência local em admin, aluno e funcionário.
* [x] Textos com jargões de IA e referências a concorrentes completamente removidos.
* [x] LeadBot guiando correções de dados pelo chat sem disparar alerts de navegador.
* [x] Rota raiz / atendendo index.html com status HTTP 200.
* [x] login.html limpa, sem lead-bot.js e com link de retorno à raiz.
* [x] Hardening de senha inválida com HTTP 401 e sem vazamento de token ou redirecionamento.
* [x] 40 testes automatizados passando 100% verdes.
* [x] Todos os arquivos abaixo de 500 linhas (respeitando o orçamento de 700 linhas).
