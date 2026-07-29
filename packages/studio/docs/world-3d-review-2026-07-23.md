# Full review — Extensão "Mundo 3D" (`world-3d`) — 2026-07-23

Passada sistemática de review na extensão **`world-3d`** ("Mundo 3D": mundo aberto
dirigível estilo folio — a pé / de carro / de barco, cidade, fazenda, lua, ilha),
no modelo dos full reviews do Jogo 2D e Jogo 3D (achado rotulado, **um teste
vermelho→verde por correção**, verificação adversarial). Baseline: HEAD `70ca10c6`.
Versão do manifest **4.1.2 → 4.2.0**.

**O wiring já era sólido** (auditoria inicial dos ~12 pontos do round-trip): os **137
blocos** (120 statement + 17 valor) estão ligados em `schema.ts` (união TS + Zod +
`W3D_STATEMENT_TYPES`), `buildIR.ts`, `generators/js.ts` (compile), `parsers/js.ts`
(+ `isSimpleValue` — nenhum valor degrada o statement para rawJS), `workspaceState.ts`,
allowlist derivada do catálogo e `blockLevels.ts` (piso por prefixo). Os 4 `kind`s de
picker (`w3dpoint`/`w3dnpc`/`w3dquest`/`w3dachieve`) declaram e consomem certo, e o
`blockAudit.test.ts` prova def→IR→blocos + IR→JS→helper + JS→IR por bloco. **Uma única
assimetria latente** ficou (ver Follow-ups — `collectStatementIdentifiers`). Por isso o
review focou em **correção de runtime + cobertura de playthrough**, não no wiring.

## Gate final

| Verificação | Resultado |
|---|---|
| `bun run typecheck` (tsc) | **0 erros nos arquivos do review** (1 erro pré-existente alheio: `game-3d-advanced/__tests__/runtime.test.ts` `setEffects` — WIP concorrente na árvore, não desta passada) |
| `bun run check` (biome) — arquivos tocados | **0 erros / 0 avisos** |
| `bun test src/official-extensions/world-3d` (suíte foco) | **259 pass / 0 fail** (251 → 259, +8 testes) |
| `bun test src` (suíte completa) | **5275 pass / 0 fail** (317 arquivos) |
| E2E Chromium (`examples-gallery.spec.ts --grep "world-3d:"`) | **não rodou nesta sessão** — o dev server não compila por um erro de parse em WIP concorrente (`game-3d-advanced/runtime.ts:1636`, crase crua num template — alheio ao world-3d). Ver "Verificação em browser". |

## R1 — Correções de runtime (série A): "sistemas presos ao carrinho"

A R15/R21 unificou câmera/grama/festa/**árbitro do E** no **jogador ATIVO**
(`focusState()`/`playerXZ()` — a pé, de barco OU de carro). **Quatro** sistemas ficaram
para trás, ainda medindo do `carState` — quebrados a pé / de barco (mundos sem
carrinho, que a v2/v3 passou a suportar). Cada achado foi confirmado adversarialmente
lendo o código, corrigido em `runtime.ts` e travado por um teste **vermelho→verde** (os
4 falham no runtime pré-fix e passam depois — provado rodando os testes contra o runtime
sem as correções).

| Id | Sev. | Achado | Correção | Teste |
|---|---|---|---|---|
| **A1** | ALTO | `stepSay` projetava `carState` e dava `return` em `!carState` → num mundo **a pé ou de barco** o `say()` deixava o balão VISÍVEL mas **nunca escrevia `left/top`** (preso no canto). `say()` é bloco básico. | Projeta o **jogador ativo** via `playerXZ()`; guarda `!_proj` de sobra. | `playthrough.test.ts` R-A1 |
| **A2** | MÉDIO | `buildWeather`/`stepWeather` centravam a chuva/neve no `carState` (0,0 sem carro) → a pé/de barco o clima seguia o carrinho estacionado (ou a origem), não o jogador. | `playerXZ()` nos **2** sites (build + recycle). | `playthrough.test.ts` R-A2 |
| **A3** | MÉDIO | `updateSun` seguia só o `carState` → a pé/de barco o sol e o **frustum de sombra** ficavam parados (a sombra some ao redor do jogador que anda). | Segue `focusState()` (jogador ativo). | `playthrough.test.ts` R-A3 |
| **A4** | MÉDIO-ALTO | O "descer do veículo" (`stepPerson`, dirigindo) só checava `points[]` antes de sair. Como `isJust('e')` **não é consumido** na leitura, apertar E perto de um **NPC/porta** dirigindo **descia E disparava a interação** no mesmo quadro (2 ações num aperto — fura o "árbitro ÚNICO do E"). | O guard de saída também varre `extraInteract` (NPCs/portas/etc., `r>0`) — se algo está perto, o árbitro resolve o E e o "descer" não rouba o aperto. | `playthrough.test.ts` R-A4 |

**Refutados (verificação adversarial — não viraram correção):**

- **`buildCity` "vazamento"** — o `city()` **guarda contra a 2ª cidade** (facade `runtime.ts:8513`) e `buildCity` roda no máximo **1×** por mundo; o ramo de rebuild sem `disposeObjectTree` (6145) é **código morto/inalcançável**, não vazamento vivo. Anotado como hardening.
- **`stepStorm` `stormT` velho** — `stormT` é resetado para positivo **no mesmo quadro** em que zera (3661), então **nunca fica negativo entre quadros**; voltar à tempestade retoma uma contagem válida. Só resta o "1º raio imediato" (cosmético, defensável). Refutado.
- **`boatState.y` não inicializado** — `stepBoat` roda **antes** da câmera/grama lerem `focusState().y` no laço (7596 < 7613/7623), então `y` já está definido quando é lido; auto-cura no quadro 1. Não é bug vivo (hardening opcional).

## R2 — Cobertura de playthrough (fim-a-fim, THREE real)

Fechou a maior lacuna: **Kit Corrida, Boliche, pontos/zonas e barco** só eram validados
por schema (nunca RODAVAM). 4 novos exercícios fim-a-fim na bancada com three.js real —
**todos passaram** (os sistemas estavam corretos; agora estão guardados contra
regressão):

- **R-B1 · Barco:** pilotado na água **anda** — sem getter público de barco, a câmera
  (que segue `focusState()`=barco) é a prova: barco parado ⇒ câmera parada.
- **R-B2 · Corrida:** larga (arma ao afastar + volta), cruza o checkpoint na ordem, o
  gancho de **fim** dispara e `raceTime`/`raceBest` ficam > 0.
- **R-B3 · Boliche:** dirigir o carro contra o triângulo **derruba ≥ 1 pino** (física de
  knockdown por tombamento).
- **R-B4 · Pontos/zonas:** E no ponto dispara `onPoint`; entrar na zona dispara `onZone`
  (uma vez, na entrada).

## R3 — Teardown / ciclo de vida

Como `game-3d` e `game-3d-advanced`, o `world-3d` usa **teardown por dispose no
`pagehide`** de propósito (WebGL pesado + loop próprio via `setAnimationLoop`), **não**
`managedProjectRun`. O caminho REAL (`pagehide` → `disposeAll` → `forceContextLoss` +
descarte de geometrias/materiais/texturas/áudio + remoção do palco, idempotente) já é
coberto por `runtime.test.ts` e `runtimeRobustness.test.ts`. Decisão (consistência com os
irmãos 3D): **manter**.

**Hardening anotado (follow-up):** o `disposeAll` **não** faz `removeEventListener` dos
listeners anônimos (keydown/keyup/pointerdown/contextmenu/blur + resize). Sem
`managedProjectRun` **não há restart no mesmo documento em produção** (o preview recarrega
a página inteira), então **não é bug vivo** — vira uma limpeza própria, revisada.

## R4 — Guardas + versão

- **`docDrift`/`templateGuard`/`blockAudit` já EXISTEM** e seguem verdes: 137 blocos,
  todo método de `window.SZWorld3D` citado no `ai.ts`, e o `runtime.ts`/`ai.ts`/`docs` são
  cada um **um** template literal válido (sem crase ou `${` cru no miolo).
- **`manifest.version` 4.1.2 → 4.2.0.** Nenhum bloco/método novo → docs e `ai.ts`
  intocados.

## Follow-ups (documentados, fora do escopo desta passada de correção)

- **B1 — wiring (`generators/js.ts:collectStatementIdentifiers`):** omite **18** tipos de
  statement w3d (`city, stringLights, traffic, district, roadGrid, houseRow, quality,
  inventoryGive, inventoryRemove, door, crops, barn, windmill, fence, animals, crater,
  flag, rocket`) — quebra o próprio padrão de chamar `collectExprIdentifiers` nos soquetes
  numéricos/de valor. **LATENTE:** toda DECLARAÇÃO (`var`/`let`/param/laço) é coletada,
  então programas reais não corrompem; só morderia um nome que aparece **só** num desses
  soquetes e **colide** na normalização. `blockAudit` não pega (usa shadows literais).
  Correção = 18 `case`s + uma fixture de variável-num-soquete (ex.: X da `crater`). Arquivo
  CORE delicado, hoje **limpo na árvore** — melhor numa mudança própria (como o game-3d
  adiou a limpeza de cores).
- **Hardening de runtime:** `buildCity` (ramo de rebuild sem `disposeObjectTree`, hoje
  morto); `removeEventListener` no `disposeAll`; cap em `terrainMods` (flatten/path/gallery
  contra chamada dentro de "A cada quadro"); determinismo do recycle do clima
  (`Math.random` no `stepWeather` vs `mulberry` no build).
- **Cobertura ainda rasa:** 11 dos 12 exemplos só são parse-checados (nunca rodam);
  `cameraMode`/`cameraShake`, partículas de clima e os overlays de minimapa/pódio sem
  asserção comportamental.

## Verificação em browser

O E2E de WebGL real (`bun run e2e examples-gallery.spec.ts --grep "world-3d:"`, os 12
cartões da vitrine) **não pôde rodar nesta sessão**: o dev server do playground falha ao
compilar por um **erro de parse em WIP concorrente na árvore** —
`game-3d-advanced/runtime.ts:1636` tem uma **crase crua** num template literal (o gotcha
conhecido da g3k), o que derruba o build do Vite inteiro. É **alheio ao `world-3d`** e a
esta passada (não toquei `game-3d-advanced`).

As mudanças deste review são **não-renderização** (posição/lógica: balão do `say`, centro
das partículas de clima, posição do sol, guard do "descer do veículo") — nenhuma toca o
pipeline de WebGL/shaders. A correção está provada por:

- **259 testes na bancada com THREE de VERDADE** (playthrough + robustness), incluindo os
  8 novos exercícios comportamentais — a matemática de posição/câmera/interação é a MESMA
  do preview.
- **`templateGuard`** — prova que o `runtime.ts` do `world-3d` avalia como corpo de
  `Function` válido (sem crase/`${` cru) — ou seja, o mundo BOOTA.
- **`examples.test`** — os 12 exemplos parseiam e casam o drift de IR.

**Recomendação:** rodar o E2E do `world-3d` assim que o WIP de `game-3d-advanced` fechar a
crase crua (o dev server volta a compilar). O risco de regressão visual é mínimo (nenhuma
mudança de renderização), mas é a prova de GPU real que fecha o padrão da casa.
