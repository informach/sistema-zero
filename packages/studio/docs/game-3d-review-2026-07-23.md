# Full review — Extensão "Jogo 3D" (`game-3d`) — 2026-07-23

Passada sistemática de review na extensão **`game-3d`** ("Jogo 3D": kits Desvie /
Travessia / Corrida / Empilhar sobre Three.js), no modelo do full review do Jogo 2D
(rodadas R1–R5, achado rotulado `R{n}/{X}{k}`, um teste vermelho→verde por achado,
verificação adversarial). Baseline: HEAD `70ca10c6`. Versão do manifest **0.14.0 → 0.16.0**.

**O wiring já era sólido** (auditoria inicial): os 118 blocos estão ligados em todos os
~12 pontos do round-trip, os pontos "tudo-ou-nada" (Set `G3D_STATEMENT_TYPES`, allowlist
derivada do `OFFICIAL_CATALOG`) são test-guardados/derivados e `blockAudit.test.ts` prova
def→IR→blocos→IR + IR→JS→helper + JS→IR por bloco. Por isso o review focou em **correção
de runtime, playthrough dos kits, teste/doc e limpeza** — não no wiring.

## Gate final

| Verificação | Resultado |
|---|---|
| `bun run typecheck` (tsc) | **0 erros** |
| `bun run check` (biome) | **0 erros e 0 avisos** (800 arquivos; 1 sugestão informativa fora do Jogo 3D) |
| Suíte exclusiva `bun test src/official-extensions/game-3d/__tests__` | **325 pass / 0 fail** |
| Suíte conjunta `bun test src/official-extensions/game-3d` | **632 pass / 0 fail** (Jogo 3D + Jogo 3D Avançado) |
| E2E Chromium (`examples-gallery.spec.ts --grep "game-3d:"`) | **10/10 pass (43 s)**: 8 cartões + 2 layouts estreitos, WebGL real, primeiro frame e controles |
| Repetição adversarial da Corrida maluca | **5/5 pass** depois da correção do foco do preview |
| `bun run test` (suíte completa) | **5297 pass / 4 fail**. As quatro falhas pertencem às mudanças paralelas ainda incompletas de “O Chefão das Sombras”, no Jogo 3D Avançado |

## R1 — Correções de runtime (série A)

Cada achado foi confirmado adversarialmente lendo o código, corrigido em `runtime.ts` e
travado por um teste **vermelho→verde** (os 5 falham no runtime pré-fix e passam depois —
provado com `git stash` do `runtime.ts`).

| Id | Sev. | Achado | Correção | Teste |
|---|---|---|---|---|
| **A1** | ALTO | `crosserHit` só checava a linha LÓGICA `g.row`; durante o pulo (hop) o boneco já entrou na faixa de destino, mas `g.row` só avança quando o passo termina → **atravessava o carro ileso** durante a animação | Enquanto `g.moving`, testa também a linha de destino do passo em curso (`forward`→`row+1`, `backward`→`row-1`) | `physics.test.ts` R1/A1 + `playthrough.test.ts` (Travessia, fim-a-fim) |
| **A2** | MÉDIO | `applyGravity` concedia `grounded=true` mesmo quando o `resolveAABB` separou o objeto de LADO (parede) → **pulo de parede** | Só marca `grounded`/zera `vy` quando o objeto ficou APOIADO no topo (pouso), não na separação lateral | `physics.test.ts` R1/A2 |
| **A3** | MÉDIO | `setBackground` trocava `scene.background` sem descartar a `CanvasTexture` de um `setSky` anterior → **vazamento de textura na GPU** | Descarta a textura anterior antes de trocar pela cor sólida (espelha o que o `setSky` já fazia) | `physics.test.ts` R1/A3 |
| **A5** | MÉDIO | `installOrthographicCamera` parenteava a câmera no alvo (`parent.add`) → a câmera iso/aérea **herdava a ROTAÇÃO** do alvo (girava a vista ao seguir um objeto que gira) | A câmera ortográfica fica SEMPRE na cena; o `_updateCameras` recompõe só a POSIÇÃO do alvo (+ offset do molde), sem rotação. Kits não afetados (o crosser parenteia no outer que não gira; a corrida usa câmera estática) | `physics.test.ts` R1/A5 |
| **A6** | BAIXO | `setFOV` era **no-op silencioso** numa câmera ortográfica (iso/aérea) — o bloco "Lente" não fazia nada | Numa câmera ortográfica, "Lente" vira **zoom** (60 = normal, 30 = 2×/luneta, 120 = afasta) | `physics.test.ts` R1/A6 |

**A4 (REFUTADO):** o listener de grade sem mundo (`listen(world=null)`) vazaria, mas o único
caminho público (`gridStep → wireGridKeys(obj, worldOf(obj))`) sempre recebe um mundo para
objetos do SZGame3D — provado pelo teste existente `physics.test.ts:809` (o listener é
rastreado e removido no dispose). Não é bug vivo; anotado como hardening.

## R2 — Playthrough dos kits (`playthrough.test.ts`, Three.js REAL)

Fechou a maior lacuna: os 4 exemplos de kit só eram validados por schema (nunca rodavam) e a
colisão POSITIVA `crosserHit`/`raceHit` nunca era asserida. Novos testes sobre o three.js real:

- **Travessia:** pular para a faixa do carro PERDE durante o hop (valida A1 fim-a-fim) → congela → reinicia. (Vermelho no runtime pré-fix, verde depois.)
- **Corrida:** bater num rival PERDE → congela o carro → reinicia; e "acelerar faz o carro avançar pela pista".
- **Desvie:** um inimigo alcançar o jogador aciona `hitAny` e o `stop` desinstala o loop de animação.
- *Empilhar já é coberto fim-a-fim em `physics.test.ts` (encaixar/errar/pontuar/reiniciar).*

## R3 — Teardown 3D (documentação + trava)

Investigação a fundo: `managedProjectRun` é padrão **só do Jogo 2D**. Os TRÊS 3D
(`game-3d`, `game-3d-advanced`, `world-3d`) usam **teardown por dispose no `pagehide`** de
propósito (WebGL pesado + loop próprio via `setAnimationLoop`). Decisão (com a usuária): **não**
adicionar `managedProjectRun` ao game-3d (o deixaria inconsistente com os irmãos e, sem
restart in-document, quase não mudaria nada — o `pagehide` já limpa tudo).

- O caminho REAL de teardown (`pagehide` → `disposeAll` → `forceContextLoss`) já é coberto por `runtime.test.ts` (descarte de todos os mundos, idempotente).
- `disposeMethod: 'disposeAll'` do contrato é **metadado descritivo** — o preview nunca o invoca; quem dispara é o próprio runtime no `pagehide`. Novo teste (`runtime.test.ts` R3) amarra as duas pontas e trava o drift do nome.

## R4 — Doc drift + guardas + limpeza

- **`docDrift.test.ts` (novo):** o contexto da IA (`ai.ts`) só pode citar métodos que EXISTEM no `window.SZGame3D` (mesma receita do blockAudit) + todo bloco na toolbox em um lugar só (sem categoria "Mais").
- **`templateGuard.test.ts` (novo):** `runtime.ts`/`ai.ts`/`manifest.docs` são um template literal cada — guarda contra crase/`${` cru no miolo (o gotcha que quebra o parse longe da causa) + o import ESM do three usa o pino central `THREE_CDN` (`three@0.180.0`).
- **B2 (corrigido):** `sz_g3d_isometric_camera` tinha default `FOLLOW: 'jogador'`, contra o próprio tooltip ("deixe em branco para não seguir") e diferente da câmera aérea (branco). Default agora é **branco**.

## R5: contratos, ciclo de vida e estabilidade

Uma nova revisão adversarial encontrou oito problemas que não apareciam nos testes da rodada anterior. Todos foram corrigidos com testes de regressão.

| Id | Gravidade | Achado | Correção |
|---|---|---|---|
| **C1** | MÉDIO | `g3d:stop` era aceito diretamente no construtor pela IR legada e pela IR v2, embora o encaixe visual não permita esse uso | Os dois validadores agora distinguem construtores de funções e métodos. Eventos e laços realmente ativos continuam válidos |
| **C2** | MÉDIO | `Soltar o bloco` podia ficar em **Ao iniciar** e errava a torre antes de qualquer ação da criança | Novo contrato `action-command`: o bloco só entra em eventos, funções e métodos. Raiz e laços são recusados pelo Blockly e pelas duas versões da IR |
| **C3** | MÉDIO | `pagehide` descartava o contexto WebGL até quando a página entrava no bfcache | Eventos com `persisted: true` preservam a cena para a navegação de volta. Saídas definitivas continuam liberando GPU e áudio |
| **C4** | MÉDIO | O teste de reinício da Travessia dependia da geração aleatória das linhas | O teste cria explicitamente uma linha segura antes de validar o movimento após o reinício |
| **C5** | BAIXO | Parar a cena durante o primeiro callback ainda executava os callbacks seguintes e desenhava mais um quadro | O driver interrompe o quadro assim que o loop é desinstalado |
| **C6** | BAIXO | O listener de setas de um personagem removido permanecia preso ao mundo | Listeners ligados a objetos agora têm proprietário e são removidos junto com a árvore do objeto |
| **C7** | BAIXO | O helper E2E consultava o botão e clicava depois; uma troca de `srcDoc` entre as duas ações podia destacar o frame antigo | Seleção, clique e foco agora acontecem numa única avaliação do `FrameLocator`, com nova resolução automática quando o frame troca |
| **C8** | BAIXO | 138 cores declaradas nos blocos e subcategorias eram imediatamente sobrescritas | A cor passou a ter uma única fonte: `categoryShades` deriva os tons e o mapa aplica o tom de cada subcategoria |

O manifest passou para **0.16.0**. A documentação do Kit Empilhar agora explica que **Soltar o bloco** pertence a um evento ou a uma função, nunca à raiz ou ao loop da torre.

## Follow-ups (documentados, fora do escopo desta passada)

- **B3 — "a cada N quadros" (`run_enemies`):** o runtime é intencionalmente baseado em TEMPO (independente de FPS: igual em 60/120/144 Hz). "quadros" é uma aproximação amigável para a criança (exata a 60 Hz). Revisado e mantido.
- **D1 — footgun de eixo:** genéricos `distanceTo`/`isNear`/`angleTo`/`moveInCircle` medem/movem em X-Z; os kits Travessia/Corrida são z-up. Hoje INTENCIONAL (documentado no manifest: "os kits mantêm sua convenção interna sem mudar os blocos genéricos"). Deixado como está por decisão da usuária.
- **D2 — dois sistemas de colisão:** `collides`/`applyGravity` usam half-extents locais e IGNORAM rotação/pai; `touchesBox`/`crosserHit`/`raceHit` usam `Box3` do mundo. Objetos girados ou dentro de um modelo colidem impreciso sob `collides`. Unificar mudaria o comportamento de cenas existentes (risco de regressão) — deixado como está.
- **D3 — teto de objetos e kits:** as malhas dos kits driblam `addMesh`, então não contam para `MAX_OBJECTS`; os kits têm poda própria (`cullRows`, splice de overhang, `MAX_ROWS`/`MAX_STACK_LAYERS`). By-design.

## Verificação em browser (CONFIRMADA)

Os testes de `bun` rodam em happy-dom (com three.js real onde importa), mas **não** enforçam
CSP nem estrangulam o `rAF` e não renderizam WebGL. A prova visual final foi feita em
Chromium real:

```
bun run e2e examples-gallery.spec.ts --grep "game-3d:"
→ 10 passed (46.0s)
```

Os 8 cartões de kit (Cubo girando, Boneco de formas, Noite enevoada, Enxame que gira, Desvie,
Atravesse a rua, Corrida maluca, Torre maluca) + 2 em layout estreito (390×844) criam, mostram
o primeiro frame com WebGL de verdade e aceitam controles — sem crash, com a11y do canvas.
