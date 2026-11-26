---
numero: 7
titulo: Motor Conversacional Proprietário de Leads com SQLite WAL
status: Proposto
data: 2026-10-15
autores: ["Kazuhiro Kamimura", "Antigravity"]
aplica_a: ["backend/**", "frontend/**"]
tags: ["leads", "conversational", "sqlite-wal", "zero-dependency"]
---

# ADR-007: Motor Conversacional Proprietário de Leads com SQLite WAL

## Decisão

No contexto de captação de clientes para o FitGesty, enfrentando o alto custo de ferramentas terceirizadas de chat e o overhead de scripts externos pesados, decidimos por implementar um motor conversacional nativo baseado na máquina de estados do Sistema Pacto integrado ao SQLite WAL, para alcançar conversão de alta fidelidade e zero custo operacional com total privacidade LGPD, aceitando a manutenção interna das etapas do formulário conversacional.

## Contexto e Forças

O FitGesty opera no mesmo mercado competitivo de softwares como Nextfit e Sistema Pacto. A engenharia reversa comprovou que formulários conversacionais com simulação de digitação, validação dialógica de nome e segmentação por porte aumentam drasticamente a geração de leads qualificados para demonstrações comerciais. As forças determinantes são:
1. **Zero Dependências Externas:** O FitGesty não pode adicionar pacotes pesados de terceiros no `package.json`.
2. **Custo Operacional Zero:** Ferramentas SaaS (Leadster, Typebot) cobram entre R$ 250 a R$ 800/mês.
3. **Privacidade e LGPD:** Contatos comerciais e números de WhatsApp devem residir exclusivamente no banco local `fitgesty.sqlite`, com sanitização estrita de dados sintéticos e ausência de e-mails pessoais no frontend.
4. **Desempenho Extremo:** A landing page deve manter tempo de carregamento < 500ms e Lighthouse 100 sem scripts de tracking de terceiros bloqueáveis por ad-blockers.

## Opções Consideradas

1. **Opção 1 (Terceirização via SaaS externo - estilo Nextfit/Leadster):** Integração via script externo do Leadster ou Typebot. Rejeitada por violar o princípio Zero-Dependency, acarretar custo mensal fixo e injetar mais de 450 KB de JavaScript.
2. **Opção 2 (Microsserviço Isolado via Iframe - estilo Sistema Pacto original):** Subir um serviço separado de CRM em nuvem (ex: Supabase/PostgREST) e carregar via `iframe` com `embed.js`. Rejeitada por introduzir complexidade desnecessária de dois backends e custos de nuvem.
3. **Opção 3 (Motor Nativo Integrado em Vanilla JS + SQLite WAL - RECOMENDADA):** Motor conversacional construído em Vanilla JS no frontend, com simulação de digitação em dois tempos (250ms/900ms), confirmação reflexiva de nome, máscara de telefone e persistência direta no `fitgesty.sqlite` via endpoint nativo `POST /api/leads/capturar`.

## Detalhes da Implementação

1. **Banco de Dados (`backend/db.js`):** Criação da tabela relacional `leads_demonstracao` com campos de qualificação (`nome`, `whatsapp`, `email`, `segmento`, `tamanho_alunos`) e metadados de tráfego (`origem_url`, `utm_source`, `utm_medium`, `utm_campaign`, `tempo_resposta_segundos`), indexada por data e segmento.
2. **Roteador HTTP (`backend/server.js`):**
   - `POST /api/leads/capturar`: Ingestão pública com validação defensiva de campos obrigatórios e sanitização contra injeção.
   - `GET /api/leads`: Rota protegida por autenticação JWT (RBAC: Admin) para gestão do pipeline comercial no painel de administração.
3. **Widget Conversacional (`frontend/public/lead-bot.js`):** Componente declarativo ativado via delegação global por atributo `[data-open-demo-chat]`.

## Consequências

### Positivas
- **Custo Operacional R$ 0:** Nenhum custo com assinaturas de chatbots ou CRM de terceiros.
- **Soberania e Privacidade Total (LGPD):** Dados e metadados de UTMs guardados com segurança no SQLite local.
- **Performance Imbatível:** Payload ultraleve (< 10 KB total), mantendo nota 100 no Lighthouse.
- **Zero Dependências:** Código em Node.js nativo com `node:sqlite` e `node:crypto`.

### Negativas
- Qualquer alteração na sequência de perguntas ou inclusão de novos campos de triagem exige ajuste no código fonte (sem editor drag-and-drop externo).
- Exige suíte de testes TDD específica para validar cenários de payload malicioso e concorrência de escrita.

### Neutras/Riscos Mitigados
- Riscos de concorrência mitigados pelo modo WAL do SQLite com transações atômicas `BEGIN IMMEDIATE`.
- Erros de digitação de WhatsApp e nome mitigados pela máquina de estados dialógica (confirmação reflexiva).
