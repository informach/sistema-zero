# @sistemazero/studio

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em qualquer lib/framework, e use Octocode para pesquisa/exploração de código no GitHub.

IDE educacional embarcável (Sistema Zero Studio) — biblioteca INTERNA do monorepo, consumida como TS source (modelo do `@sistemazero/ui`). Migrada do repo standalone `sistema-zero-studio` em 2026-06-10; os 11 sub-packages `@sz/*` viraram pastas de `src/` referenciadas por subpath imports `#core`, `#ir`, `#blockly`, `#monaco`, `#parsers`, `#generators`, `#preview`, `#extensions`, `#official-extensions`, `#ai`, `#ui` (ver `imports` no package.json).

## O que é

Editor com 3 modos — Blocos (Blockly), Código (Monaco) e Ponte (sync bidirecional blocos⇄código via worker de reverse-parse) — + preview sandbox, console, terminal (WebContainer), painel de IA (OpenRouter) e extensões.

**API pública** (`src/index.ts` — TUDO fora dela é interno): `<Studio>` (uncontrolled: `initialProject` + `onChange`/`onSave`/`onError`; `persistence: 'local'|'none'|adapter`; `features` com terminal/IA OFF por default; `allowedModes`/`initialMode`; `theme`/`locale`; `limits`; `ref` → `StudioHandle`), `<ProjectList>` (IndexedDB local), `createLocalPersistenceAdapter`, `createEmptyProject`, `prefetchStudioModes`, e o CSS `@sistemazero/studio/styles.css`. **Como consumir: ver `docs/embedding.md`** (transpilePackages, `@source`, ssr:false, headers do terminal).

**Arquitetura de estado**: stores Zustand POR INSTÂNCIA (factories + `StudioStoresContext`); os hooks `useXStore(selector)` caem na store DEFAULT de módulo fora de um `<Studio>` (lista/testes), e as estáticas `useXStore.getState/setState` operam SEMPRE na default (contrato dos testes). `settingsStore` é singleton de propósito (preferência do usuário). Persistência = `PersistenceService` por instância (`src/persistence/service.ts`): qualquer adapter ganha autosave debounced + flush (pagehide/unmount/Salvar); `onChange` SEMPRE no debounce, inclusive com 'none'.

**Paleta**: tokens `--color-sz-*` em `src/styles/studio.css` espelham a paleta oficial do sistema-zero (referência comunidade-sistema-zero) em oklch, dark E light, com identidade dual (accent = brand-lime no dark, cyan no light). Blockly tem temas `sz-dark`/`sz-light` em HEX equivalentes (`src/blockly/theme.ts` — manter em SINCRONIA com o CSS); Monaco segue o tema da instância. Toggle sol/lua na Topbar (some quando o host fixa `theme`). Logo oficial: `BrandLogo` (`src/ui-internal/BrandLogo.tsx`) = só o SÍMBOLO (160×160), para a Topbar compacta; `BrandWordmark` (`src/ui-internal/BrandWordmark.tsx`) = logo COMPLETO (símbolo + wordmark "Sistema Zero" do logoszs.svg, viewBox 1500×160), usado no header da ProjectList. O wordmark usa `fill="currentColor"` para recolorir conforme o tema (branco no escuro, escuro no claro); o símbolo mantém o gradiente lime→cyan e a moldura branca. Gradientes com id via `useId()` (multi-instância). Ambos extraídos do logoszs.svg oficial.

## Regras não-negociáveis

1. **Workers cross-bundler**: todo worker nasce de `new Worker(new URL('./caminho-relativo.ts', import.meta.url), { type: 'module' })` com URL **literal inline** — nada de `?worker` (Vite-only), nada de bare specifier dentro de `new URL()` (Vite não resolve), nada de variável/helper no 1º argumento (quebra a análise estática de Vite/Turbopack/webpack). Os workers do Monaco usam os wrappers em `src/monaco/workers/`. Plano B se um bundler de host falhar: extrair a criação p/ factory injetável via prop.
2. **`loader.config({ monaco })` em `src/monaco/workers.ts` é intocável**: sem ele o `@monaco-editor/react` injeta o loader AMD, que colide com o UMD do Blockly ("Can only have one anonymous define").
3. **CSS**: `src/styles/studio.css` é o CSS exportado — SEM `@import "tailwindcss"`, SEM `@source`, SEM `@custom-variant dark` (sobrescreveria a variant dos apps) e SEM regras globais de app (html/body/scrollbar — vivem no `playground/styles.css`). Tema escopado por `[data-sz-theme]` no root do componente, NUNCA no `<html>` do host. Conteúdo PORTALADO p/ document.body precisa de `<StudioThemeScope>` (ver Modal/ProjectCard).
4. **Sem react-router**: navegação é do host. Páginas/cards recebem callbacks (`onOpenProject`, `onExit`).
5. **Globais residuais de multi-instância**: WebContainer é singleton por aba; o atalho da busca de blocos (`startSearch`) fica com a última instância (PtSearchCategory desregistra antes de registrar — NÃO remover, era crash na 2ª instância). `deleteProject` cancela autosaves em voo em TODAS as instâncias via registro de serviços.
6. **Testes = bun:test** (`bun test src`; e2e Playwright FORA do CI — `bun run e2e` contra o playground). Gotchas que esta suíte já paga:
   - `mock.module` NÃO é isolado por arquivo — capture os exports reais antes e restaure no `afterAll` (ver `BlocksMode.test.tsx`); mocks de idb-keyval ficam sem restore de propósito (IndexedDB não existe no happy-dom).
   - Sem fake timers — debounce do autosave encurta via `setAutosaveDelayForTests` (`src/persistence/service.ts`); relógio via `setSystemTime` (que RESETA se receber epoch 0).
   - DOM via happy-dom no preload (`bunfig.toml` + `test-setup.ts`).
   - Componentes que rendem DENTRO de um `<Studio>` precisam de PROBE (mock do Shell lendo hooks) — as estáticas `getState` leem a store default, não a da instância.
7. **Vite playground** (`bun run dev`): `optimizeDeps.entries`/`include` precisam casar com os imports REAIS (sufixo `.js` nos deep imports do Monaco; paths com forward slash — backslash do Windows não casa no glob e o Vite re-otimiza com full reload no meio da navegação). Headers COOP/COEP do dev server são obrigatórios p/ o Terminal.

## Comandos

- `bun run dev` — playground Vite (porta 5173; rota `/dual` = 2 instâncias lado a lado)
- `bun run typecheck` / `bun run test` / `bun run check`
- `bun run e2e` — Playwright contra o playground (manual)

## Backlog

- `<ProjectList>` adapter-based (hoje acoplada ao IndexedDB local).
- Dicionário `en` real (prop `locale` já existe; EN cai em pt-BR).
- `baseUrl` da IA (OpenRouterProvider não suporta).
- CSS pré-compilado como alternativa ao `@source` dos consumers.
- `autoSaveId` do PanelGroup é global ao origin (layout compartilhado entre instâncias/hosts no mesmo domínio).
- Campo `fontSize` (UI) ainda existe no settingsStore mas sem UI (o controle mutava o `<html>` do host e foi removido).
