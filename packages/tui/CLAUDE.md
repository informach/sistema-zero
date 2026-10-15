# CLAUDE.md — @sistemazero/tui

> **⚠️ Antes de mexer em `@opentui/*`/React aqui, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`). Para padrões, use o **MCP do Octocode**.

## O que é

**Cliente de terminal do agente local do Sistema Zero**, construído com **OpenTUI + React 19**
(renderer de CLI, não DOM). A interface e o CLI compartilham o supervisor de `agent-runtime`,
com journal SQLite, IPC autenticado, execução de ferramentas e perguntas persistidas.
`agent-core` contém os contratos; `agent-integrations` contém os adapters externos.

A interface é uma projeção do supervisor. Fechar a UI preserva tarefas; `/cancel` cancela uma
tarefa e `sistemazero rpc runtime.shutdown` encerra o supervisor. A UI não deve executar
ferramentas de agente, guardar tokens ou manter um segundo estado autoritativo de execução.

## Estrutura (`src/`)

- `cli.ts` — entrada pública, help sem renderer, execução não interativa e controles locais.
- `app.tsx` — layout, painéis, teclado, providers e renderer sob demanda.
- `index.tsx` — entrada direta alternativa para a interface.
- `state/runtime.ts` — projeção, stream cancelável, paginação e comandos da interface.
- `state/editor.ts` — edição do rascunho em editor externo.
- `components/` — `input-bar` · `status-bar` · `border` · `command-menu/`.
- `providers/` — `theme` · `toast` · `keyboard-layer` (roteamento de teclado por camada).
- `theme.ts` — paleta de cores (`ThemeColors`).

## Como roda (da RAIZ do repo)

| Comando | O quê |
|---|---|
| `bun run dev:tui` | executa `packages/tui/src/cli.ts` |
| `bun run test:tui` | testa core, runtime, integrations, UI e manifest de release |
| `bun run build:tui` | empacota CLI, workers, helpers nativos e manifesto verificado |
| `bun run verify:tui` | instala fora do monorepo e verifica os componentes empacotados |
| `bun run verify:tui:upgrade` | verifica upgrade interrompido, backup e rollback |
| `bun run link:tui` | build, instalação congelada e `bun link` do pacote distribuível |

De dentro do pacote: `bun run dev` / `build` / `check` / `check:fix`.

O bin de desenvolvimento aponta para `src/cli.ts`; o pacote distribuível fica em `dist/` e
aponta para `cli.js`. Não importar arquivos de desenvolvimento por caminhos absolutos no build.
Use `SISTEMAZERO_HOME` temporário para testes; preserve o perfil real e as credenciais oficiais.

Leia `docs/tui/support.md`, `docs/tui/performance.md` e `docs/tui/implementation-review.md` na
raiz para a matriz de suporte e as limitações medidas. Windows x64 é o alvo homologado.
Não confundir fixtures locais com homologação de contas externas ou avaliação comparativa.

## Stack

Bun · TS (ESM) · React 19 · `@opentui/core` + `@opentui/react` · Zod · Biome.
A UI usa componentes próprios de terminal e os contratos de `agent-core`; não importa a UI web.
