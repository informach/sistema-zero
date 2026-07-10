# CLAUDE.md — @sistemazero/tui

> **⚠️ Antes de mexer em `@opentui/*`/React aqui, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`). Para padrões, use o **MCP do Octocode**.

## O que é

**UI de terminal (TUI) de dev/ops** do monorepo, construída com **OpenTUI + React 19** (renderer de
CLI, não DOM). Estágio **inicial/scaffold**: shell visual pronto (Header, InputBar, StatusBar,
command menu, providers de tema/toast/camada de teclado), sem fluxo de negócio ligado ainda
(`onSubmit` da barra é no-op). Sem porta, sem banco — é um binário de terminal.

## Estrutura (`src/`)

- `index.tsx` — monta os providers + o layout raiz e chama `createCliRenderer` (targetFps 60).
- `components/` — `header` · `input-bar` · `status-bar` · `border` · `dialog-search-list` ·
  `command-menu/` (paleta de comandos: lista/filtro/hook).
- `providers/` — `theme` · `toast` · `keyboard-layer` (roteamento de teclado por camada).
- `theme.ts` — paleta de cores (`ThemeColors`).

## Como roda (da RAIZ do repo)

| Comando | O quê |
|---|---|
| `bun run dev:tui` | roda em watch (`bun run --watch packages/tui/src/index.tsx`) |
| `bun run build:tui` | build (`bun build … --outdir dist --target bun`) |
| `bun run link:tui` | build + `bun link` (expõe o bin `sistemazero`) |

De dentro do pacote: `bun run dev` / `build` / `check` / `check:fix`.

> ⚠️ O `bin.sistemazero` está declarado no `package.json` mas o arquivo `bin/sistemazero` ainda
> não existe — criar antes de depender do `link:tui` em produção.

## Stack

Bun · TS (ESM) · React 19 · `@opentui/core` + `@opentui/react` · Biome. Consome `@sistemazero/ui`
NÃO (a UI aqui é de terminal, própria); pode consumir `@sistemazero/core` se precisar de utilidades.
