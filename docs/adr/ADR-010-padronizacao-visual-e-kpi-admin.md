---
numero: 10
titulo: Padronização Visual de Profundidade, Ícones SVG Nativos e Sincronização Reativa de KPIs
status: Aprovado
data: 2026-10-29
autores: ["Kazuhiro Kamimura", "Equipe FitGesty"]
aplica_a: ["frontend/public/**", "backend/db.js", "backend/server.js", "test/**"]
tags: ["design-system", "a11y", "svg-icons", "elevation", "dashboard-kpi", "zero-dependency"]
---

# ADR-010: Padronização Visual de Profundidade, Ícones SVG Nativos e Sincronização Reativa de KPIs

## Decisão

No contexto de evolução do FitGesty para apresentação executiva de alto nível, enfrentando falta de profundidade e contraste excessivamente plano no tema claro, caixas escuras descoladas, inconsistência nos seletores de acessibilidade (tema, contraste e fonte) entre as áreas logadas, presença de emojis informais e métrica estática de alunos ativos no painel administrativo, decidimos por padronizar os tokens de elevação em design-tokens.css com micro-ícones SVG vetoriais, centralizar a persistência de acessibilidade em theme-manager.js e harmonizar o contrato de agregação de dados no backend, para alcançar fidelidade estética corporativa, acessibilidade universal consistente e métricas dinâmicas em tempo real, aceitando o esforço adicional de refatoração em múltiplos arquivos estáticos.

1. Instituir um sistema óptico de três camadas de elevação em `design-tokens.css` (Background `#eef2f6`, Superfícies `#ffffff` com bordas `#cbd5e1` e sombras físicas em camadas), padronizando integralmente as gavetas e cards de `admin.html`, `aluno.html` e `funcionario.html`.
2. Substituir 100% dos emojis por micro-ícones vetoriais SVG nítidos e padronizados para cada ação.
3. Centralizar e unificar o gerenciamento de tema (Light/Dark), alto contraste e tamanho de fonte com persistência sincronizada no `localStorage`.
4. Corrigir o contrato de agregação de dados em `backend/db.js` (`buildDashboard`) e `frontend/public/admin.js`, garantindo que `#metric-alunos` reflita reativamente e em tempo real a quantidade exata de alunos ativos cadastrados no banco SQLite WAL.

## Contexto e Forças

- **Experiência do Usuário e Percepção Visual:** O tema claro atual utilizava saturação plana de branco (`#ffffff` sobre `#f8fafc` com bordas quase invisíveis), resultando em ausência de hierarquia visual e dificuldade na percepção de blocos, botões e tabelas pelo olho humano. Além disso, elementos específicos (como seções de expansão no admin e cards de treino no aluno) mantinham fundos escuros do preset antigo, criando um mosaico visual desconexo.
- **Acessibilidade Universal:** Enquanto `funcionario.html` alternava corretamente tema, contraste e escala tipográfica, `admin.html` e `aluno.html` utilizavam chaves divergentes no `localStorage` ou seletores não sincronizados, quebrando a experiência de navegação do usuário.
- **Linguagem Visual Corporativa:** O uso de emojis reduzia o tom profissional e corporativo da plataforma perante a banca acadêmica e o mercado B2B.
- **Integridade da Métrica de Negócio:** Na tela do administrador, o indicador "Alunos Ativos" exibia valor fixo ou zerado porque o backend expunha `activeMembers`, enquanto a camada cliente buscava a chave inexistente `membersCount`.

## Opções Consideradas

1. **Opção 1 (Arquitetura Canônica de Tokens de Elevação, Micro-SVGs Nativos e Aliasing Contratual — RECOMENDADA):**
   - Criação de tokens de elevação semânticos em `design-tokens.css` com background `#f1f5f9`, cards `#ffffff` e bordas `#cbd5e1`.
   - Remoção de todos os estilos de caixas escuras residuais em `admin.css`, `aluno.css` e `styles.css`.
   - Incorporação de micro-SVGs inline e harmonização dos listeners de tema, contraste e tamanho de fonte.
   - Atualização do contrato no backend (`db.buildDashboard`) com aliases completos e escuta reativa em `admin.js`.
2. **Opção 2 (Ajustes Ad-hoc via CSS inline e Scripts Isolados):**
   - Aplicar classes soltas sem refatorar tokens centrais. Rejeitada por perpetuar dívida técnica e fragilidade de manutenção.
3. **Opção 3 (Adoção de Framework CSS Externo como Tailwind ou Bootstrap):**
   - Rejeitada categoricamente por violar o princípio de Zero Dependências e a soberania do código Vanilla.

## Consequências

### Positivas
- Hierarquia visual limpa e elegante, com cartões claramente destacados do fundo no modo claro e alto contraste no modo escuro.
- Interfaces com aspecto moderno e corporativo através de micro-ícones SVG vetoriais precisos.
- Persistência e funcionamento impecável de Light/Dark mode, Alto Contraste e Fonte Ampliada em todos os perfis (Admin, Aluno e Funcionário).
- Métrica de Alunos Ativos no dashboard refletindo em tempo real cada alteração no banco de dados SQLite WAL.
- Preservação estrita da Regra Ponytail #24 (< 700 linhas por arquivo) e Zero Dependências.

### Negativas
- Necessidade de atualizar referências de ícones e classes em múltiplos pontos do frontend.

### Neutras/Riscos Mitigados
- Riscos de regressão no contrato da API mitigados pela manutenção dos nomes originais paralelamente aos novos aliases.
