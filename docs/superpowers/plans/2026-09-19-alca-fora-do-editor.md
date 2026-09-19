# Alça fora dos projetos abertos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirar a alça esquerda e recolher o menu apenas enquanto um projeto está aberto nas quatro ferramentas de criação Kids.

**Architecture:** O `FocusModeProvider` continua dono do menu e recebe um sinal efêmero de editor ativo. Os pacotes Pinta, Molda e Pensa expõem um callback opcional para o host; o Estúdio comum informa seu estado no host, e a rota exclusiva do Estúdio Pro é identificada pelo caminho. O sinal não altera a preferência de abertura da galeria.

**Tech Stack:** React, Next.js App Router, TypeScript, Bun Testing Library.

**Spec:** `docs/plans/2026-09-19-alca-fora-do-editor-design.md`

## Global Constraints

- Galeria/lista conserva a alça; editor aberto não conserva alça nem menu aberto.
- Voltar ao catálogo restaura o estado do menu da mesma visita.
- Aulas, avatar e quarto mantêm a alça e os estados atuais.
- Pinta, Molda e Pensa não importam código do shell Kids.
- A mudança não deve remontar o editor nem perder trabalho em andamento.

---

### Task 1: Estado de projeto aberto no shell

**Files:** `packages/community-kids/src/components/kids/focus-mode.tsx`, `packages/community-kids/tests/focus-mode.test.tsx`.

**Interfaces:** `useFocusMode()` produz `setWorkspaceActive(active: boolean): void` além dos valores existentes. O sinal vale apenas para a rota atual. `navCollapsed = onFocus && (workspaceActive || !navOpen)`; `navAvailable = onFocus && isTablet && !workspaceActive`.

- [ ] Escrever teste que abre o menu na galeria, ativa o projeto por um botão de teste, verifica ausência da alça e `navCollapsed=true`, desativa e verifica restauração do menu aberto. Testar separadamente `/estudio/pro/id` sem sinal, e aula/avatar/quarto inalterados.
- [ ] Executar `bun test tests/focus-mode.test.tsx` em `packages/community-kids` e observar falha dos novos casos.
- [ ] Implementar o estado em `FocusModeProvider` e limpar o sinal ao trocar rota ou perfil. Derivar Estúdio Pro com um predicado de segmento (`/estudio/pro/<id>`). Não mudar `EdgePanelHandle` nem a sidebar.
- [ ] Reexecutar teste e `bun run typecheck` no Kids. Revisar se `FocusModeToggle` continua sem botão quando `navAvailable=false`.
- [ ] Commitar com `git add packages/community-kids/src/components/kids/focus-mode.tsx packages/community-kids/tests/focus-mode.test.tsx` e `git commit -m "feat(kids): ocultar alca em projeto aberto"`.

### Task 2: Sinais dos apps com estado interno

**Files:** `packages/pinta/src/components/PintaApp.tsx`, `packages/molda/src/components/MoldaApp.tsx`, `packages/pensa/src/components/PensaApp.tsx`, testes existentes desses três pacotes.

**Interfaces:** Cada app recebe `onWorkspaceChange?: (active: boolean) => void`. Pinta informa `view.screen === 'editor'`; Molda informa `screen.type === 'editor'`; Pensa informa `detail !== null`. O callback é opcional para playgrounds e blocos de aula. Ao desmontar, informar `false`.

- [ ] Escrever testes de transição galeria/editor/galeria para Pinta e Molda e lista/plano/lista para Pensa, capturando a sequência do callback. Cobrir ausência do callback.
- [ ] Executar os testes focados em `packages/pinta`, `packages/molda` e `packages/pensa` e observar falha dos novos casos.
- [ ] Adicionar a prop opcional e um `useLayoutEffect` dependente do booleano de editor e do callback; o cleanup envia `false`. Não duplicar estado de navegação, alterar armazenamento ou remounts.
- [ ] Reexecutar testes e `bun run typecheck` em cada pacote; revisar deep links e retornos internos.
- [ ] Commitar os três pacotes e seus testes com `git commit -m "feat(tools): informar quando projeto esta aberto"`.

### Task 3: Fiação no Kids e revisão final

**Files:** `packages/community-kids/src/components/kids/{pinta-client,molda-client,pensa-client,studio-full-client}.tsx`, `packages/community-kids/tests/focus-mode.test.tsx`, testes de clients existentes, `packages/community-kids/CLAUDE.md`.

**Interfaces:** Os três clients passam `setWorkspaceActive` à prop dos apps. O `StudioFullClient` reporta `view.name === 'editor'` somente quando o editor é mostrado. Todos limpam o sinal ao desmontar.

- [ ] Adicionar teste de integração do host para cada fiação e para o Estúdio comum; confirmar que voltar à galeria torna a alça disponível sem remontar o projeto.
- [ ] Executar esses testes e confirmar falha antes da fiação.
- [ ] Conectar os callbacks de Pinta, Molda e Pensa ao `useFocusMode`; no Estúdio, reportar o editor visível por efeito de layout. Atualizar `CLAUDE.md` com a regra de galeria versus projeto.
- [ ] Executar testes focados, suítes dos pacotes alterados, typechecks e `bunx biome check` dos arquivos modificados. Revisar o diff, estados de erro e deep links; não fazer push/deploy sem pedido.
- [ ] Commitar o lote final com `git commit -m "feat(kids): liberar area de criacao sem alca lateral"` e conferir `git status --short --branch`.
