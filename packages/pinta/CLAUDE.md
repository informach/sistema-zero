# CLAUDE.md — @sistemazero/pinta

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em lib/framework, e use
> Octocode para pesquisa/exploração de código no GitHub.

**Pinta** — editor de assets de jogos para crianças: pixel art (personagens com animações,
cenários), tiles/tilemaps e desenho vetorial, com export compatível com o Estúdio. Jornada do
produto: Pensa planeja → **Pinta desenha** → Estúdio constrói. Biblioteca INTERNA do monorepo,
consumida como **TS source** (modelo do pensa/studio): sem build; os apps usam
`transpilePackages` + `@source "../../../pinta/src"` + `@import "../../../pinta/src/styles/pinta.css"`
no globals.css (MESMO gotcha do Studio — sem o @import as utilitárias `pin-*` são no-op).

## API pública (`src/index.ts` — TUDO fora dela é interno)

- **`setPintaStorageNamespace(viewerId)`** — o host chama ANTES de montar (isola a galeria por
  PERFIL no IndexedDB; vazio = store default `sistema-zero-pinta`; mesmo contrato do studio).
- **`<PintaApp adapter={PintaHostAdapter} />`** — uncontrolled, navegação por ESTADO (galeria ⇄
  editor, sem router).
- **`PintaHostAdapter`** (`src/core/types.ts`): `theme?` ('light' default kids | 'dark'),
  `studioOwned?` (só muda a COPY do sucesso da ponte), `onOpenStudio?`,
  `sendToStudio?(PintaExportedAsset) → PintaSendResult` — **ausente = o botão "Usar no Estúdio"
  não aparece** (degrade, padrão Pensa).

## Modelo de dados (`src/core/`)

- **Não há "projeto"**: a galeria é a lista de ASSETS do perfil; cada asset é um registro
  independente no IndexedDB (`pinta:asset:<id>`, store `sistema-zero-pinta-<ns>`).
- `PintaAsset` = união discriminada: `pixel-sprite` (frameW/H + `animations[]` com
  `{name, fps, loop, frames[]}`), `pixel-background` (bitmap único), `tileset`
  (`tiles[]` + `solid[]` paralelo — índice no array = índice do tile no Studio), `tilemap`
  (`tilesetId` + `layers[]` com `cells: Int16Array`, -1 = vazio), `vector` (`shapes[]`).
- **`PintaBitmap { width, height, data: Uint8Array }`** — ÍNDICES de paleta (1 byte/pixel),
  índice 0 = TRANSPARENTE. Paletas SEMPRE 16 cores (`core/palette.ts`): `arcade` (MakeCode,
  default) + `pastel` + `cinzas`.
- Quotas em `PINTA_LIMITS` (compartilhadas criação↔sanitize — subir uma sobe em todos).
  `sanitizePintaAsset(raw)` NUNCA lança (descarta com null, padrão studio).
- Nome de asset: kebab via `normalizeAssetName` — ⚠️ manter em sincronia com o
  `normalizeAssetName` do studio (o nome atravessa a ponte e vira o nome nos blocos).

## Arquitetura

- **Motor pixel (`src/pixel/`)**: `ops.ts` operações PURAS (clonam e devolvem bitmap novo —
  alimenta o undo por referência); `tools.ts` máquina PURA de gesto
  (`toolPointerDown/Move/Up` → preview/commit; 1 gesto = 1 entrada de undo; formas redesenham
  da BASE a cada move, lápis acumula no working); `selection.ts` (retangular
  extract→floating→stamp); `render.ts` única camada canvas (offscreen 1:1 + blit escalado com
  `imageSmoothingEnabled=false`; `bitmapToRGBA` pura; onion skin via `under`).
- **Stores zustand POR INSTÂNCIA** (factories, nunca singleton): `galleryStore` (CRUD, erros
  viram copy gentil, nunca lançam), `editorStore` (asset vivo + history por snapshots de ASSET
  com orçamento em bytes + autosave debounced ~1s com flush em pagehide/unmount/voltar;
  `persist` injetável — testes passam fake), `sessionStore` (ferramenta/cor/zoom/onion —
  separado de propósito: trocar ferramenta não suja o autosave).
- **Persistência (`src/state/persistence.ts`)**: idb-keyval + `runSerializedWrite(id, task)`
  FIFO por asset (clone do studio) — autosave/rename/delete do mesmo id não intercalam.
- **Copy 100% PT** centralizada em `src/core/copy.ts` (sem travessão, sem jargão).
- **CSS**: tokens `--color-pin-*` em `@theme` sob `[data-pinta-theme]` (claro default kids,
  escuro por atributo no ROOT — nunca no `<html>` do host). SEM `@import "tailwindcss"`, SEM
  `@source`, SEM regras globais. Conteúdo portalado usa `<PintaThemeScope>`. Prefixo `pin-`
  (NÃO `pt-`/`px-` — colidem com padding do Tailwind).
- **a11y**: alvos ≥44px, Dialog com foco/Esc/trap (inline, sem portal), Toast aria-live.

## Regras não-negociáveis

1. **NUNCA `fetch('data:')`** — bloqueado pelo `connect-src` da CSP do kids. Conversão data
   URL→Blob é `atob` (`export/png.ts dataUrlToBlob`).
2. **happy-dom NÃO tem canvas 2D**: `getContext()` é null — todo caminho de render/PNG guarda
   contra null e devolve false/null em vez de quebrar; a lógica testável fica nas puras.
3. **Compatibilidade com o Studio é por CONSTRUÇÃO**: spritesheet = uma LINHA por animação com
   `columns = max(frames)` (números `from/to` do bloco "Animar sprite"); tileset empacota
   row-major com `cols = min(count, 8)`; tilemap exporta o texto de grade do bloco
   (`"0 1 1 0;. . 2 ."`). Testes reimplementam as fórmulas do runtime do Studio como guarda.
4. **Uint8Array/Int16Array vão DIRETO ao IndexedDB** (structured clone) — o codec RLE é só do
   `.pinta.json` de export (F6).

## Testes

`bun test src` (happy-dom via bunfig/test-setup, padrão pensa). Fixtures de bitmap como
strings (`src/testing/fixtures.ts`: `bmp(['.11.'])`/`rows()`; '.'=0, '1'–'9'/'a'–'f' =
índices). Mock FUNCIONAL de idb-keyval em `src/testing/idbMock.ts` (Map por DB; registry de
mocks é GLOBAL na suíte — importar ANTES do código sob teste; não restaurado de propósito).
Sem fake timers: `setAutosaveDelayForTests(ms)`. Gotcha: update vindo de store zustand fora de
act → flush explícito `await act(async () => Bun.sleep(0))` (waitFor pena no happy-dom).

## Comandos

`bun run typecheck` · `bun test src` · `bun run check[:fix]`

## Status das fases

- **F1 — Fundação + pixel estático**: FEITA (galeria CRUD 3 passos, editor pixel
  lápis/borracha/balde/linha/retângulo/círculo/conta-gotas/espelho/pincel 1-3, undo/redo,
  autosave, zoom, download PNG, tema claro/escuro).
- **F2 — Animações + preview rodando**: FEITA (PreviewPlayer com rAF pausável + FpsControl
  🐢→🐇 [2..24] gravando no `fps` da animação, AnimationList, FrameStrip + onion 👻,
  `export/spritesheet.ts` com GUARDA reimplementando a fórmula do runtime do Studio,
  ExportDialog v1 com a receita em PT; "Usar no Estúdio" envia a FOLHA inteira p/ sprites).
- **F3 — Ponte + plataforma**: FEITA (studio `asset-library/personal.ts` + seção "Meus
  desenhos" no AssetsPanel + wrapper `setStudioStorageNamespace` + subpath `personal-assets`;
  member-shell `PINTA_ACCESS_REF`/`checkPintaAccessReadonly` refs `pinta,estudio-completo`;
  kids `/pinta` 3 estados + nav + main-container + proxy + globals.css + transpilePackages;
  seed catalog produto/oferta `pinta` R$97; railway watchPatterns + case no ci.yml).
- **F4 — Tileset + tilemap**: FEITA (editor de tileset = motor pixel apontado p/ `tiles[i]` +
  TileStrip com badge 🧱 sólido e REMAP automático dos mapas ao inserir/remover peça
  (`remapTilemapCells`, cross-asset/fora do undo); editor de tilemap =
  carimbo/balde/borracha/conta-gotas + picker + camadas, arrasto = 1 undo via `commitGesture`;
  `packTileset` cols=min(count,8); `export/studioGrid.ts` grade colável + sólidos + JSON, com
  GUARDA reimplementando parseGrid/parseSolidList do runtime).
- **F5 — Vetorial**: FEITA (shapes = elementos SVG REAIS — hit-testing do browser; pincel
  suavizado polyline→RDP→Catmull-Rom→`d` M/C ABSOLUTOS (o formato que `geometry.ts` sabe
  mover/escalar — `d` estrangeiro fica intacto); rect/elipse/linha/polígono/estrela/texto,
  fill+stroke+opacidade, seleção com 8 alças + girar + multi (shift), z-order, duplicar;
  `svg.ts vectorToSvg` = MESMO markup do editor (snapshot); `rasterize.ts` SVG→PNG async
  via Blob URL p/ export e ponte).
- **F6 — Export completo + polish**: FEITA ("Baixar tudo" na galeria = ZIP organizado
  (`export/zip.ts`, fflate sob demanda: personagens/ cenarios/ tilesets/ mapas/ vetores/ +
  LEIA-ME com as receitas + `galeria.pinta.json`); backup/restauro `.pinta.json`
  (`export/projectJson.ts` `{assets, warnings}` — RLE+base64 via `core/bitmapCodec.ts`;
  restauro = ids NOVOS + sufixo de nome + tilemap RELIGADO ao tileset restaurado via idMap);
  upscale ×1/×2/×4 no ExportDialog; guarda dos 800k chars ANTES do "Usar no Estúdio").

**Pendências (pós-código):** QA em browser real (desenho pointer/touch, preview 24fps, gate 3
estados, ponte ponta-a-ponta entre perfis, grade colada no bloco, utilitárias `pin-*`
materializadas, tema claro/escuro) + aplicar o seed em staging (deploy roda `db:deploy`).
