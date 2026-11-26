---
numero: 9
titulo: Desacoplamento da Landing Page e Hardening de Autenticação
status: Aprovado
data: 2026-10-29
autores: ["Kazuhiro Kamimura", "Equipe FitGesty"]
aplica_a: ["frontend/public/**", "backend/server.js", "test/**"]
tags: ["frontend", "landing-page", "lead-bot", "auth", "security", "zero-dependency"]
---

# ADR-009: Desacoplamento da Landing Page e Hardening de Autenticação

## Decisão

No contexto de reestruturação do posicionamento estratégico do FitGesty para a banca avaliadora, enfrentando a sobreposição de responsabilidades entre marketing e autenticação na tela de login legada, decidimos por desacoplar uma Landing Page oficial index.html servida na rota raiz contendo o Consultor de Leads e link de acesso, enquanto login.html é blindada exclusivamente para credenciais com rejeição estrita de senhas incorretas, para alcançar separação de privilégios limpa, alta conversão de visitantes e segurança defensiva sem vazamento de estado, aceitando a manutenção coordenada de dois arquivos HTML compartilhando tokens comuns.

## Contexto e Forças

O FitGesty atendia a rota raiz `/` servindo diretamente `login.html`, que acumulava a responsabilidade de autenticação de usuários cadastrados e, simultaneamente, abrigava o botão e script do widget de qualificação de leads (`lead-bot.js`). Esta sobreposição gerava atrito cognitivo na apresentação acadêmica e na jornada do usuário:
1. O visitante não autenticado era confrontado imediatamente com um formulário de credenciais antes de conhecer a proposta de valor do sistema para o dono, funcionário e aluno.
2. O usuário legítimo encontrava elementos de captação de marketing dentro de um ambiente seguro de login.
3. Havia necessidade de garantir que senhas incorretas bloqueassem estritamente o fluxo, limpando credenciais e impedindo qualquer redirecionamento ou vazamento de sessão.

## Opções Consideradas

1. **Opção 1 (Arquitetura Desacoplada e Semântica Web Canônica — RECOMENDADA):** Criar `frontend/public/index.html` na raiz `/` com a nova tese de valor (Triângulo Virtuoso) e o Consultor de Leads embutido, isolando `login.html` exclusivamente para formulário de credenciais com hardening de senha.
2. **Opção 2 (Landing Page em Rota Secundária /landing.html):** Manter a rota raiz `/` servindo login e criar página promocional isolada. Rejeitada por gerar atrito cognitivo e forçar navegação manual na banca.
3. **Opção 3 (Single Page Application com Toggle Dinâmico em login.html):** Unificar apresentação e autenticação em um único documento via modais. Rejeitada por violar a Regra Ponytail #24 de arquivos com menos de 700 linhas e misturar segurança e marketing no mesmo escopo de execução.

## Detalhes da Implementação

1. **Landing Page (`frontend/public/index.html`) & Estilização Modular (`frontend/public/landing.css`):**
   - Implementada no padrão B2B institucional com a paleta oficial da marca FitGesty: Navy Profundo (`#0f172a`) e Azul Royal Elétrico (`#2563eb`), com fundo claro limpo (`#f8fafc`), cartões brancos e bordas sutis.
   - Craft visual inspirado nos benchmarks de mercado **Wellhub** (clareza tipográfica e proposta de valor B2B de alto impacto) e **YouGym** (cards flutuantes interativos e animações de scroll reveal a 60 FPS com `IntersectionObserver` nativo).
   - Eliminação completa de caixas e textos de "IA" (ex.: removidos "SQLite WAL", "Plataforma B2B para Gestão Fitness & Alta Rentabilidade" e menções a concorrentes de mercado).
   - Rodapé canônico e simplificado: `"FitGesty — Sistema Corporativo de Gestão e Rentabilidade para Academias"`.
   - Botão de atendimento padronizado estritamente como `"Atendimento com Consultor"`.
   - Incorporação do logotipo oficial (`assets/logo.png`) no cabeçalho e do ícone oficial (`assets/icon.png`) como favicon e avatar.
   - Modularização estrita per Regra Ponytail #24: `index.html` (261 linhas) e `landing.css` (449 linhas), mantendo ambos confortavelmente abaixo do orçamento de 700 linhas.

2. **Hardening de Login (`frontend/public/login.html`):**
   - Logotipo oficial aplicado no cabeçalho, estética limpa e profissional com botões azul royal elétrico.
   - Remoção de qualquer referência ao widget de leads (`lead-bot.js`).
   - Inserção de navegação de retorno à página inicial (`/`).
   - Tratamento estrito de falhas de autenticação: limpeza de `localStorage`, limpeza do campo de senha, exibição de alerta em vermelho e garantia de nenhum redirecionamento não-autorizado.

3. **Experiência Multi-Tema e Logotipo nas Áreas Internas (`admin.html`, `aluno.html`, `funcionario.html`):**
   - Aplicação da imagem da logo oficial (`assets/logo.png`) e ícone favicon (`assets/icon.png`) em todos os cabeçalhos das áreas restritas.
   - Suporte completo e bidirecional a **Tema Claro (Light)** e **Tema Escuro (Dark)** com alternador tátil no topbar (`#themeToggleBtn`) e persistência segura em `localStorage` (`fitgesty_theme`).
   - Fichas de estilo `admin.css`, `aluno.css` e `design-tokens.css` com classes `body.light-theme` e `body.dark-theme` perfeitamente contrastadas contra WCAG 2.1 AA.

4. **Motor Conversacional de Leads sem Popups (`frontend/public/lead-bot.js`):**
   - Avatar atualizado com o ícone oficial da marca (`assets/icon.png`).
   - Erradicação de popups `alert()` do navegador. Quando o visitante insere um dado inválido (nome curto ou telefone sem DDD/menos de 10 dígitos), o próprio consultor virtual envia uma mensagem amigável no chat orientando a correção e reapresenta o campo de digitação de forma fluida.
   - Remoção completa de referências a marcas externas em comentários e código.

5. **Mapeamento de Rotas no Servidor (`backend/server.js`):**
   - Atualização do roteador nativo para mapear a raiz `/` para `/index.html`.

## Consequências

### Positivas
- Clareza na jornada: visitantes interagem com a Landing Page e o Consultor; usuários com credencial acessam tela dedicada de login.
- Separação estrita de responsabilidades: marketing/captação reside em `index.html`; controle de acesso reside em `login.html`.
- Preservação do princípio Zero-Dependency (Node.js nativo + Vanilla JS/CSS).
- Suíte TDD 100% verde com 40 testes aprovados.

### Negativas
- Necessidade de sincronizar alterações de navegação entre `index.html` e `login.html`.

### Neutras/Riscos Mitigados
- Riscos de inconsistência visual mitigados pelo compartilhamento do design system unificado em `design-tokens.css`.
- Riscos de falha de login mascarada mitigados por asserções explícitas de HTTP 401 e validação de corpo sem token em `test/server.test.js`.
