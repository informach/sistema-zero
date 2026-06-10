# @sistemazero/studio

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em qualquer lib/framework, e use Octocode para pesquisa/exploração de código no GitHub.

IDE educacional embarcável (Sistema Zero Studio) — biblioteca INTERNA do monorepo, consumida como TS source (modelo do `@sistemazero/ui`). Migrada do repo standalone `sistema-zero-studio` (pnpm + Vite SPA) em 2026-06-10; os 11 sub-packages `@sz/*` viraram pastas de `src/` referenciadas por subpath imports `#core`, `#ir`, `#blockly`, `#monaco`, `#parsers`, `#generators`, `#preview`, `#extensions`, `#official-extensions`, `#ai`, `#ui` (ver `imports` no package.json).

## O que é

Editor com 3 modos — Blocos (Blockly), Código (Monaco) e Ponte (sync bidirecional blocos⇄código via worker de reverse-parse) — + preview sandbox, console, terminal (WebContainer), painel de IA (OpenRouter) e sistema de extensões. Estado em Zustand; persistência em IndexedDB (idb-keyval).

**Estado da migração**: Fase 0 (transplante mecânico) CONCLUÍDA — paridade com o app original rodando no playground. As próximas fases extraem o componente `<Studio>` com props (`initialProject`/`onChange`/`features`/`persistence`/`theme`), stores por instância e `<ProjectList>`; até lá, NÃO há export público estável (`src/index.ts` ainda não existe) e nenhum app do monorepo consome este package.

## Regras não-negociáveis

1. **Workers cross-bundler**: todo worker nasce de `new Worker(new URL('./caminho-relativo.ts', import.meta.url), { type: 'module' })` com URL **literal inline** — nada de `?worker` (Vite-only), nada de bare specifier dentro de `new URL()` (Vite não resolve), nada de variável/helper no 1º argumento (quebra a análise estática de Vite/Turbopack/webpack). Os workers do Monaco usam os wrappers em `src/monaco/workers/`.
2. **`loader.config({ monaco })` em `src/monaco/workers.ts` é intocável**: sem ele o `@monaco-editor/react` injeta o loader AMD, que colide com o UMD do Blockly ("Can only have one anonymous define").
3. **CSS**: `src/styles/studio.css` é o CSS exportado (`@sistemazero/studio/styles.css`) — SEM `@import "tailwindcss"`, SEM `@source`, SEM `@custom-variant dark` (sobrescreveria a variant dos apps) e SEM regras globais de app (html/body/scrollbar — essas vivem no `playground/styles.css`). Tema escopado por `[data-sz-theme]` no root do componente, NUNCA no `<html>` do host.
4. **Sem react-router**: navegação é responsabilidade do host. Páginas/cards recebem callbacks (`onOpenProject`, `onExit`).
5. **Testes = bun:test** (`bun test src`; e2e Playwright fica FORA do CI — `bun run e2e` manual contra o playground). Gotchas do bun:test que esta suíte já paga:
   - `mock.module` NÃO é isolado por arquivo — capture os exports reais antes e restaure no `afterAll` (ver `BlocksMode.test.tsx`); mocks de idb-keyval ficam sem restore de propósito (IndexedDB não existe no happy-dom).
   - Sem fake timers — debounce de autosave é encurtado via `setAutosaveDelayForTests` (persistence.ts) e o relógio via `setSystemTime` (que RESETA se receber epoch 0).
   - DOM via happy-dom no preload (`bunfig.toml` + `test-setup.ts`).
6. **Vite playground** (`bun run dev`): `optimizeDeps.entries`/`include` precisam casar com os imports REAIS (sufixo `.js` nos deep imports do Monaco; paths com forward slash — backslash do Windows não casa no glob e o Vite re-otimiza com full reload no meio da navegação). Headers COOP/COEP do dev server são obrigatórios para o Terminal (WebContainer).

## Comandos

- `bun run dev` — playground Vite (porta 5173)
- `bun run typecheck` / `bun run test` / `bun run check`
- `bun run e2e` — Playwright contra o playground (manual)

## Consumo futuro (Next/Astro)

Documentação completa virá em `docs/embedding.md` na fase final. Resumo: `transpilePackages: ['@sistemazero/studio']`, no globals.css `@import "@sistemazero/studio/styles.css"` + `@source "../../../studio/src"`, render client-only (`dynamic ssr:false` / `client:only="react"`), e COOP/COEP no host SOMENTE se `features.terminal` for ligado.
