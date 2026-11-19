# Comunidade Kids: habilidades cognitivas e oferta única Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar à oferta da Comunidade Kids a direção aprovada do presente e do Desafio: 5 a 17 anos, acompanhamento abaixo de 9, habilidades cognitivas para a vida e prática com escolhas, consequências e frustração.

**Architecture:** Manter o módulo tipado da oferta principal como fonte da copy e da continuidade. Aposentar o corpo separado criar-junto, redirecionar permanentemente à principal com a query intacta e atualizar os destinos novos dos quizzes e o sitemap. Preservar a copy retirada em histórico editorial.

**Tech Stack:** Astro, TypeScript, Bun, Playwright, Markdown gerado.

**Spec:** Solicitação e confirmação do operador nesta conversa em 19/11/2026: unificar a oferta Kids em 5–17 e redirecionar criar-junto à principal.

## Global Constraints

- Faixa pública: 5 a 17 anos; abaixo de 9 anos, acompanhamento durante as atividades. A autonomia a partir de 9 depende da criança.
- Propósito: habilidades cognitivas para a vida, funções executivas e exemplos observáveis; criação de jogos como instrumento de prática orientada.
- Manter preços do catálogo, planos mensal/anual, garantia, créditos, permissões, dois perfis e liberação por requisitos da Jornada.
- Preservar cupons e atribuição em URLs antigas; manter a página de continuidade.
- Não publicar nem modificar as mudanças de comércio e de outras sessões presentes no workspace.
- Usar dependências existentes; não criar worktree ou instalar outro navegador.

### Task 1: Copy e roteamento

**Files:** `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/pagina-9a17.ts`, `oferta/index.ts`, `oferta/types.ts`, `src/components/funnel/OfertaPage.astro`, `src/funnels/kids-vida/narrative.ts`, `src/funnels/comunidade-dos-criadores/quiz/result.ts`, `astro.config.mjs`.

- [x] Atualizar SEO, selo, requisitos, apresentação das habilidades, exemplos de escolhas e FAQ de idade, apoio e frustração.
- [x] Redirecionar `/kids/comunidade-dos-criadores/oferta/criar-junto` com HTTP 301, mantendo `Astro.url.search`; novos links levam diretamente a `/oferta`.
- [x] Remover o despacho para o corpo retirado e sua entrada no sitemap; arquivar o espelho anterior e retirar fontes sem consumidor.
- [x] Preservar as condições comerciais e a fonte compartilhada da continuidade.

### Task 2: Contratos e espelhos

**Files:** `scripts/espelho-copy-comunidade.ts`, `tests/unit/comunidade-offer-copy.test.ts`, `tests/unit/comunidade-offer-css.test.ts`, `tests/unit/comunidade-offer-contrast.test.ts`, `tests/unit/kids-vida.test.ts`, `tests/browser/comunidade-oferta.ts`, `tests/browser/kids-vida.ts`, documentação editorial.

- [x] Atualizar os contratos existentes para duas páginas ativas, faixa 5–17 e destinos do quiz; ajustar somente os hashes de fixtures cuja URL mudou.
- [x] Gerar os espelhos com `bun scripts/espelho-copy-comunidade.ts`.
- [x] Rodar `bun --no-env-file test` no pacote funnel e analisar qualquer falha sem alterar trabalho alheio.

### Task 3: Verificação e entrega

- [x] Executar Biome nos arquivos alterados, `bun run typecheck` e `bun run build` no funnel.
- [x] Executar o browser `tests/browser/comunidade-oferta.ts` com Chrome já instalado; conferir mensal/anual, preços de teste, cupom e atribuição preservados no 301, larguras 320–1440 e ausência de erros.
- [x] Inspecionar visualmente as capturas principais em desktop e celular e registrar a evidência.
- [ ] Publicação segue o fluxo Git/CI do repositório; não enviar alterações locais de terceiros.

## Evidência da implementação local — 19/11/2026

Suíte completa do funnel: `680 pass`, `5 skip`, `0 fail` (os cinco testes dependem de PostgreSQL descartável). Astro check: 399 arquivos, zero erros e zero avisos, cinco sugestões. Build concluído; dois avisos de anotações do Zod/Rollup, sem falha. Biome: 18 arquivos, zero erros e avisos, dez sugestões de estilo preexistentes. Chrome: quatro páginas, cinco larguras (320–1440), 50 imagens, `errors: []`; preços do catálogo de teste, oito fluxos de plano e redirecionamentos validados. Capturas desktop, celular e planos inspecionadas.

Copy ativa e continuidade regeneradas nos espelhos editoriais. Arquivo menor de 9 preservado em `copy/historico/2026-11-19-criar-junto/pagina-menor-9.md`. Novos resultados de quiz apontam à oferta principal; a segmentação etária do quiz permanece.

O operador solicitou o commit local desta revisão na branch staging. O commit inclui somente arquivos desta conversa; push e deploy não fazem parte desta etapa. Stage e Produção ainda não receberam esta copy. A árvore compartilhada contém trabalhos de outras sessões.

Relatório e logs: `C:/Users/tocha/comunidade-kids-copy-20261119/verification.md`. Capturas: `tmp/comunidade-oferta-review/`.
