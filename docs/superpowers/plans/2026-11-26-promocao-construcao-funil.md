# Promoção seletiva de construção e funil

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar as novas alterações do quarto, construção e páginas comerciais, por autorização explícita de publicação manual seguida do processo normal do GitHub.

**Architecture:** A candidata parte da produção com a correção operacional do PR 292 e recebe somente os commits selecionados da staging. O bundle do Arquipélago é compilado no serviço `arquipelago-api`: as comunidades de produção não têm `NEXT_PUBLIC_ARQUIPELAGO_CDN`. A atualização do jogo acompanha o motor compartilhado e o salvamento no Members.

**Tech Stack:** Bun 1.3.11, TypeScript, React Three Fiber, Astro, Railway e GitHub Actions.

**Spec:** Pedido da responsável em 26/11/2026: promover as novas alterações do quarto, construção e funil; depois de conferir e preparar, publicar manualmente em paralelo à qualificação normal.

## Global Constraints

- Não promover a staging inteira nem os trabalhos editoriais da Nave/Patrulha e de apelido.
- Preservar a versão canônica publicada 4, os triggers nativos desligados e o plano de infraestrutura sem alterações.
- Mutações de provedor não têm repetição automática; conferir recibos antes de recuperar uma execução.
- Não publicar a nova versão do Funil enquanto a publicação oficial anterior desse serviço estiver em andamento.
- Main exige PR aprovado pelos checks, merge commit e publicação pelo controlador normal. A autorização manual não desativa gates versionados.
- Não criar campanha nem oferta de presente para Vivianne. Preservar preços, entregas, links pessoais e atribuição já configurados.

## Task 1: Candidata e revisão

**Files:** `packages/core/src/morada/`, `packages/member-shell/src/components/cosmetics/`, `packages/members/src/application/room/morada-house.service.ts`, `packages/arquipelago/src/` e `packages/funnel/`.

**Interfaces:** Consome a árvore do PR 292 e os commits selecionados da staging; produz branch isolada com inventário exato do delta e sem mudança de infraestrutura.

- [x] Criar worktree isolada em `49c60358f44f084bfeeeb2a249466691f489e706`.
- [x] Incorporar os 17 commits da Morada/quarto e do Funil. O reparo independente do operador de capas foi excluído porque sua implementação anterior não pertence a esta promoção.
- [ ] Revisar o motor de encaixe, histórico, salvamento, posse, duplicação e as páginas de venda/presente.
- [ ] Executar testes focados, tipos, build do jogo e Funil e provas de navegador dos fluxos alterados.

## Task 2: Publicação manual autorizada

**Files:** Recibos em `.cache/release-construcao-20261126/`; controlador existente em `scripts/ci/production-release.mjs`.

**Interfaces:** Consome SHA fixo revisado e plano sem diferenças; produz deployments reconhecidos pelo provedor e provas de saúde. O jogo acompanha o servidor antes de liberar o novo editor nas comunidades.

- [ ] Fixar SHA e selecionar `arquipelago-api`, `members`, `auth`, `community`, `community-kids` e `funnel`, respeitando as barreiras do controlador.
- [ ] Confirmar o encerramento da publicação anterior do Funil antes de atualizar esse serviço.
- [ ] Executar o controlador com fonte fixada e autorização manual registrada, preservando configuração e versão canônica.
- [ ] Conferir bundle servido, saúde, quarto e páginas reais, sem cobrança nem envio de mensagem de teste.

## Task 3: Integração normal e relatório

**Files:** PR seletivo para main e relatório de produção em `docs/reviews/2026-11-25-campanhas-embaixadores-origens/`.

**Interfaces:** Consome a mesma árvore revisada; produz merge protegido, publicação oficial e recibo final com mudanças comerciais e de construção.

- [ ] Abrir PR seletivo, acompanhar CI completo e plano de produção.
- [ ] Integrar por merge commit e publicar os serviços selecionados pelo workflow oficial.
- [ ] Repetir as conferências críticas após a publicação oficial e guardar os recibos.
- [ ] Atualizar o levantamento funcional e integrar somente os documentos próprios à staging local.
