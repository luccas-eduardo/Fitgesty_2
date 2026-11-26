---
numero: 11
titulo: Auditoria de Refinos de Negócio, Acessibilidade Universal, Métricas de Gestão e RBAC Colaboradores
status: Aprovado
data: 2026-10-30
autores: ["Kazuhiro Kamimura", "Equipe FitGesty"]
aplica_a: ["frontend/public/**", "backend/server.js", "backend/db.js", "test/**"]
tags: ["rbac", "a11y", "financial-dre", "heatmap-insights", "zero-dependency", "hydration-tracking"]
---

# ADR-011: Auditoria de Refinos de Negócio, Acessibilidade Universal, Métricas de Gestão e RBAC Colaboradores

## Decisão

No contexto de amadurecimento estratégico do produto FitGesty voltado a donos de academia e gestores de saúde, enfrentando inconsistências de contraste no Light Mode, personificação frágil na Landing Page, necessidade de métricas de conversão e tráfego financeiro, ausência de registro hídrico para alunos e sobreposição de privilégios entre recepcionistas e professores, decidimos por despersonificar a Landing Page com CTAs de teste gratuito, desacoplar links concorrentes no bot, unificar o alto contraste para os temas claro e escuro, adicionar registro hídrico interativo na área do aluno, enriquecer o painel do administrador com DRE gerencial e insights no heatmap, habilitar edição ativa de status e unificar a interface de colaboradores segregando papéis de professor e funcionário via RBAC, para alcançar maior atratividade comercial B2B, acessibilidade digital irrestrita WCAG 2.1 AA e governança operacional à prova de falhas, aceitando o esforço adicional de validação de permissões no frontend e backend.

1. **LP & Conversão:** Despersonificar cards flutuantes na LP (substituindo nomes simulados por qualificações operacionais reais) e trocar CTAs de entrada por convites explícitos de teste gratuito ("Testar Sistema Gratuito!").
2. **Segurança no Lead Bot:** Eliminar qualquer dependência ou link externo de WhatsApp da Pacto Soluções, instituindo confirmação interna contextual no chat com canal de WhatsApp em fase de homologação controlada.
3. **Acessibilidade Universal (Alto Contraste):** Reestruturar a cascata de tokens para alto contraste claro (`body.light-theme.high-contrast`) e escuro (`body.high-contrast`), garantindo bordas táteis de 2px, eliminação de sombras opacas e sobreposição estrita contra textos escuros em fundos escuros.
4. **Hidratação do Aluno:** Implementar controle tátil de registro hídrico diário (+250ml, +500ml e Zerar) com sincronização matemática do anel ciano SVG e persistência no `localStorage`.
5. **Inteligência Administrativa & DRE:** Enriquecer o Heatmap de ocupação com legenda percentual de 4 níveis e painel de recomendações táticas para o dono; adicionar módulo financeiro com gráfico semestral SVG nativo de faturamento vs. despesas, margem líquida e funil de conversão com benchmarks de mercado (Next Fit / EVO).
6. **Gestão Ativa de Status:** Habilitar controles inline para o administrador atualizar status de alunos (Ativo/Inativo/Pendente), condição de equipamentos e status de tarefas diretamente nas tabelas.
7. **RBAC Colaboradores:** Unificar a interface de colaboradores (`funcionario.html`) segregando o perfil operacional (`funcionario` - sem permissão para reservas, equipamentos ou alteração de alunos) do perfil docente (`professor` - com autonomia de alocação de turmas, chamadas e reporte de manutenção), com guarda no backend.
8. **Simplificação de UX:** Remover a dependência de atalhos restritos a Mac (`⌘K Atalhos`), simplificando a barra superior.

## Contexto e Forças

- **Público-Alvo (Dono de Academia):** A proposta de valor central do FitGesty é aumentar a rentabilidade, reduzir cancelamentos e acelerar conversão de novos alunos. Dashboards puramente operacionais não comunicavam a inteligência financeira e de fluxo que o gestor necessita para tomar decisões.
- **Acessibilidade Inegociável:** Usuários com baixa visão enfrentavam quebra de contraste no tema claro, onde regras herdadas de alta especificidade mantinham tipografia cinza escura sobre cartões que recebiam fundo preto, violando os princípios WCAG 2.1 AA/AAA.
- **Governança Operacional (Segregação de Funções):** Permitir que funcionários de balcão alterem o estado de equipamentos ou façam reservas de salas sem supervisão técnica gerava risco de conflito de turmas e falso reporte de maquinário.

## Opções Consideradas

1. **Opção 1 (Vanilla & Zero-Dep Nativo — APROVADA):** Gráficos SVG nativos, menus condicionais no frontend baseados em JWT e overrides de CSS específicos em `design-tokens.css`.
2. **Opção 2 (Adoção de Bibliotecas Externas):** Adição de Chart.js e bibliotecas pesadas de ACL. Rejeitada por introduzir overhead desnecessário e dependências externas no bundle.
3. **Opção 3 (Separação em Arquivos HTML Distintos para Cada Perfil):** Rejeitada pelo usuário em favor de uma interface de colaboradores unificada e condicional.

## Consequências

### Positivas
- Painel do Dono elevado com DRE, funil de conversão e heatmap explicativo com inteligência acionável.
- Resolução definitiva de legibilidade no modo de alto contraste em ambos os temas (Dark e Light).
- Rastreamento completo de hidratação e gamificação para o aluno.
- Governança de acessos clara entre operação e corpo docente.
- 100% de conformidade com os orçamentos não-funcionais (zero dependências, < 600 linhas por arquivo).

### Negativas
- Aumento moderado de lógica de checagem condicional de perfis em `funcionario.html`.

### Neutras/Riscos Mitigados
- Riscos de burla no frontend mitigados pela validação estrita de token no backend em rotas de concorrência crítica de reservas.
