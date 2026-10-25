# Full review — Extensões 3D do Estúdio (`game-3d`, `world-3d`, `game-3d-advanced`) — 2026-10-24

Passada de review nas três extensões 3D: **Jogo 3D** (`sz_g3d_`, `window.SZGame3D`), **Mundo 3D**
(`sz_w3d_`, `SZWorld3D`) e **Jogo 3D Avançado** (`sz_g3k_`, `SZGameKit3D`). Feita em 16 lotes
(0 a 15), cada um fechado com a própria verificação. Baseline: HEAD `cec154cb0` (branch
`staging`). Versões dos manifests: Jogo 3D **0.30.0 → 0.31.0**, Mundo 3D **4.3.1 → 4.4.0**,
Avançado **0.21.1 → 0.23.0**.

As três extensões ainda não tinham usuário. Por isso o review renomeou, fundiu e removeu blocos
SEM migração: a regra "bloco que a criança já usa não muda de forma" ficou suspensa para os três
prefixos durante o review e volta a valer a partir dele. Os ids citados fora do Studio foram
mantidos (`sz_g3d_create_box`, `sz_g3d_sky_photo`, `sz_w3d_setup`), e
`project-migrations/legacy-contracts.json` não foi tocado.

## Gate final

| Verificação | Resultado |
|---|---|
| `bun run typecheck` (studio) | **0 erros** |
| `bun run check` (biome, studio) | **0 erros**; 2 avisos e 9 infos, todos fora das extensões 3D (`pro-kits/`, `pro-templates`, `game-2d`) |
| `bun run check:game-3d-examples` | **IR de 37 exemplos atualizada** (Jogo 3D + Avançado) |
| `bun run check:world-3d-examples` | **IR de 14 exemplos atualizada** |
| `bun run test` (studio, suíte isolada completa) | **9.997 pass / 0 fail** (144 lotes) |
| `bun run test` + `typecheck` (member-shell) | **1.831 pass / 0 fail**; typecheck **0 erros** |
| `bun run test` (molda, as três partes) + `typecheck` | **1.105 + 1.293 + 1.150 pass / 0 fail**; typecheck **0 erros** |
| E2E Chromium `examples-gallery.spec.ts` (galeria inteira) | **185/185 pass (11,6 min)**: 163 cartões, os três casos GLB + HDR, DPR e layouts estreitos |
| E2E Chromium `runtime-inline-csp`, `behavior-lifecycle`, `molda-library` | **10/10 pass** |

## Achados do levantamento

| # | Extensão | Achado | Resolução (lote) |
|---|---|---|---|
| 1 | as três | Paletas planas e despejadas: 21, 18 e 24 abas, sem família nem seção | Árvore família → seção em `palette.ts` de cada uma: 10, 11 e 11 famílias (0, 3, 8, 11) |
| 2 | Jogo 3D | 6 jeitos de criar cena, 9 de colidir, 11 câmeras | `camera_mode` funde 6 câmeras; `hit_any` absorve `touches_box`; enxame vira grupo (3) |
| 3 | as três | Vocabulário divergente (cena/mundo, céu 360°/céu de foto, entidade, fábrica, semente, dt, radianos) e valores padrão "por quadro" | Vocabulário comum; graus e "por segundo" na borda da API do Jogo 3D; o `docDrift` do Avançado proíbe os termos antigos (4, 8, 11) |
| 4 | Jogo 3D | Não fechava um jogo básico: sem placar, vida, contagem, telas nem recomeçar; os exemplos usavam HTML/DOM | Regras de jogo comuns (`game3dRules/`), `managedProjectRun` + `restart`, exemplo Pega-Estrelas só com o núcleo (5, 7) |
| 5 | Mundo 3D | Não virava jogo; empurrar, explodir, pinos e corrida só reagiam ao carro; o texto da criança ficava por baixo dos painéis; 54% dos blocos só no início | Regras de jogo, jogador ativo em todos os sistemas, gerenciador de cantos, coisas nascem durante o jogo (9, 10) |
| 6 | Jogo 3D e Mundo 3D | Modelo do Molda com ossos quebrava; sem animação | Carregador comum com SkeletonUtils, animador e pintura animada nos três (2, 6, 10) |
| 7 | Avançado | Personagem do Molda virava um boneco de 6,5 m com colisão de 1 m, flutuando | Modelo encaixado (`contain`) na caixa da peça, colisão pelo que se vê (`partBoxes`) (11) |
| 8 | as três | Nome de animação em texto livre ("Idle"); nenhum exemplo usava .glb ou .hdr | Seletor de clipes lido do próprio GLB; exemplos Meu herói do Molda e Herói do Molda (7, 12, 13) |
| 9 | as três | Alocações por quadro, raycast na cena inteira, resolução fixa 1280×720, sombra em toda luz pontual, nada compartilhado | Orçamento de render comum, zero alocação no Jogo 3D, `pickables`, cache de geometria/material (14) |
| 10 | as três | Runtimes de 208/248/325 KB injetados inteiros | Compactação com `trimIndent`, Kit Plataforma só quando usado, catraca de payload (0, 14) |
| 11 | Mundo 3D | Sem `removeEventListener` | `listen()` + `unlistenAll()` no `disposeAll` (9) |
| 12 | escada | Todo `sz_g3d_*` no iniciante-3d (159 blocos de uma vez); Mundo 3D e Avançado no mesmo degrau | Uma extensão por degrau (1) |

## Decisões (da usuária)

- **Uma extensão por degrau**: Jogo 3D = `iniciante-3d` só no núcleo (`INICIANTE_3D_G3D`), o resto
  `intermediario-3d`; Mundo 3D = `intermediario-3d`; Avançado = `avancado-3d` (`minLevel`).
- Os kits de gênero do Jogo 3D ficam numa família "🧰 Kits prontos", no fim da paleta.
- **Paridade com o Molda nos três**: ossos, clipes, pintura animada e céu 360°.
- Todos os lotes em sequência, com testes em cada um.

Decisões de desenho tomadas no caminho:

- Regras de jogo com **um membro de IR por regra cobrindo os três prefixos**
  (`'g3d:hudText' | 'w3d:hudText' | 'g3k:hudText'`): a união `JSStatement` está perto do TS2590.
- Blocos novos entram por **codec da extensão** (molde `platformIR.ts` + `platformCodec.ts`), com
  ganchos de 2 a 4 linhas nas fachadas que estão no teto do `architecture.test.ts`.
- Unidades novas do Jogo 3D **só na borda da API**: física interna, IR e gerador ficaram iguais.
- Recomeçar do Mundo 3D é **leve** (o projeto não roda de novo; terreno e cidade ficam); o do
  Jogo 3D roda a fábrica de novo (`managedProjectRun`); o Avançado mantém o modelo de estados.
- A mochila do Avançado zera ao recomeçar e continua entre fases; a do Mundo 3D fica salva no
  projeto e só o `inventory_clear` esvazia.

## O que mudou por extensão

### Jogo 3D (`game-3d`, 0.31.0)

- 174 blocos (eram 159), 43 no núcleo `iniciante-3d` (40 no lote 5; a 2ª rodada somou `start_timer`, `on_timer_end` e `time_left`), 131 no `intermediario-3d`. Paleta em 10
  famílias: 🎬 Cena, céu e câmera · 🧊 Objetos · 🏃 Movimento · 🎮 Controles · 💥 Encostar ·
  📦 Grupos · 🏆 Placar, vida e telas · ⏱️ Tempo e sorteio · 🔊 Som · 🧰 Kits prontos.
- Fusões e remoções: `camera_mode` (seis câmeras) + `camera_distance`; grupos absorveram os
  enxames (`create_swarm`/`count_swarm`/`for_each_swarm`/`remove_from_swarm` e o kind `swarm3d`
  saíram); `hit_any` absorveu `touches_box`; `every_frames` saiu; `sz_g3d_stop` virou `end_game`.
- Unidades: graus e "por segundo" na borda da API; `move_by`/`rotate_by` agem uma vez; o giro
  contínuo é o `spin`.
- Regras de jogo (pontos, vida, telas, fim, recomeçar, contagem, "depois de", sorteio, tremer,
  piscar) e chapéus novos `on_key`, `on_click_object`, `on_touch_group`, `blink`.
  `GAME_3D_LIFECYCLE` com `managedProjectRun` + `restartMethod: 'restart'`.
- Molda: `play_animation`, `stop_animation`, `animation_done`; cópia de grupo com ossos e
  animador próprios; `set_texture` em sRGB com "repetindo N vezes".
- Exemplos (21): demos → jogos simples (Pega-Estrelas primeiro, só com o núcleo) → jogos maiores
  → kits. Novos: Pega-Estrelas e Meu herói do Molda; Desvie reescrito com vidas, pontos, fim e
  recomeçar.

### Mundo 3D (`world-3d`, 4.4.0)

- 160 blocos visíveis, todos `intermediario-3d`. Paleta em 11 famílias; o despejo "⏱️ Jogo &
  tela" acabou. Marcas de fora (folio, Coastal, Vocation Vista) só em "Créditos e inspirações".
- Jogador ativo (a pé, carro ou barco) em empurrar, derrubar, explodir, corrida, tornado e
  fogueira; `player_pos` fundiu `car_pos`/`person_pos`.
- Gerenciador de cantos: o texto da criança fica acima dos painéis de moedas, missão, corrida,
  conquista e minimapa.
- Moedas, ícone, missão, pôr coisa/modelo, empurrável, explosivo e amigo podem nascer durante o
  jogo, com tetos. `listen()`/`removeEventListener`; terreno com teto de 64 pedidos e uma
  reconstrução por quadro; clima com sorteio semeado.
- Regras de jogo (19 blocos, vida sempre do jogador) e recomeçar leve. Novos: `collectible`,
  `on_collect_item`, `remove_named`, `inventory_clear`.
- Molda: `place_model` com tamanho em metros e pé no chão, `person_model`, `npc_model`,
  `car_model`, `model_anim` (parado/andando/correndo/pulando); céu 360° ajusta as luzes por
  `hdrAmbient`.
- Exemplos (14), com o novo Caça às Estrelas entre o Parque e o Boliche. Script novo
  `gen:world-3d-examples`/`check:world-3d-examples`.

### Jogo 3D Avançado (`game-3d-advanced`, 0.23.0)

- 147 blocos visíveis, todos `avancado-3d`. 24 abas → 11 famílias. Vocabulário: "objeto",
  "molde", "tirar do jogo", "jorro de faíscas", "sorteio repetível com o código"; dicas com no
  máximo 220 caracteres nas três extensões.
- Consome as regras de jogo comuns (placar, cantos, contagem, sorteio, tremor); telas e estados
  continuam do Avançado.
- Molda: modelo encaixado na peça, `state_anim` "uma vez", `anim_speed`, chapéu `on_anim_end`.
- Novos: `patrol`, mochila (5 blocos), `save_value`/`saved_value` (permissão `storage`), fases
  (`next_level`, `level`, `on_level_start`).
- Exemplos (20): primeiros (Tiro ao Alvo primeiro) → completos (Arena dos Cristais, Herói do
  Molda, Noite das Fogueiras) → Profissional. Todos os 147 blocos visíveis aparecem em algum
  exemplo (`exampleCoverage.test.ts` exige cobertura total).

## Peças compartilhadas (`src/official-extensions/`)

| Peça | O que faz |
|---|---|
| `extensionPalette.ts` | Árvore família → seção → tipos vira toolbox, cores e ordem. Também usada pelo Jogo 2D, sem mudança visível |
| `three3dModelsRuntime.ts` | Carregador único: GLB com SkeletonUtils, orçamento com ossos, `fit` longest/contain/height, animador, pintura animada do Molda (contrato 1), HDR, `hdrAmbient`, textura sRGB |
| `game3dRules/` | Regras de jogo com a mesma cara nos três prefixos (blocos, IR, codec, runtime) |
| `threeRenderBudgetRuntime.ts` | Níveis alta/leve com sonda de FPS, resolução pelo canvas real, pixel ratio com teto, sombra, efeitos e MSAA |
| `threeKeys.ts` | Dropdown comum de teclas |
| `runtimeSource.ts` | `compactOfficialRuntimeSource(…, { trimIndent: true })`, que recusa texto com crase |
| `__tests__/three3d/` | Fixtures reais do Molda, `assetFixtures.ts`, THREE contador e o stub de ResizeObserver |

Fora de `official-extensions`: `core/glbSummary.ts` (clipes, ossos e pintura animada lidos do GLB,
com tetos e cache LRU), `blockly/fields/FieldModelClipPicker.ts` + `modelClipResolution.ts` (o
seletor de clipes) e os selos 🎬/🦴/🎞️ da aba Modelos 3D. No Molda, os textos deixaram de dizer
"só o Avançado" (`packages/molda/src/core/copy.ts`).

## Desempenho

- Orçamento de render nos três; luz pontual sem sombra por padrão (no máximo uma com sombra).
- Jogo 3D: zero alocação por quadro depois do aquecimento (travado com THREE contador: nenhuma
  construção de Vector3/Box3/Matrix4/Raycaster em 120 quadros) e `updateMatrixWorld` no máximo uma
  vez por quadro; geometria das primitivas compartilhada; material de grupo emprestado até a cópia
  ser pintada.
- Avançado: raycast sobre a lista `pickables`; grade com chave numérica; `forEachNear` sem alocar.
- Mundo 3D: `playerXZ` reaproveitado, postes com intervalo, HUD só quando muda, moedas girando só
  perto da câmera, espalhado em pedaços com esfera própria (o culling passa a funcionar).
- Kit Plataforma só no runtime de quem usa (`game-3d/platformKitVariant.ts`).

Payload dos runtimes (o texto que o preview injeta), medido por `runtimePayloadBudget.test.ts`:

| Runtime | Antes do lote 14 (caracteres / bytes gzip) | Depois do lote 14 | Depois da 2ª rodada | Teto da catraca |
|---|---|---|---|---|
| Jogo 3D, com o Kit Plataforma | 221.257 / 58.206 | 214.754 / 59.981 | 219.622 / 61.267 | 219.700 / 61.300 |
| Jogo 3D, sem o Kit Plataforma | — | 181.212 / 50.501 | 185.682 / 51.568 | 185.700 / 51.600 |
| Mundo 3D | 374.334 / 101.528 | 335.985 / 99.900 | 344.375 / 102.711 | 344.400 / 102.750 |
| Jogo 3D Avançado | 217.394 / 59.649 | 205.159 / 60.589 | 208.604 / 61.428 | 208.700 / 61.500 |

A 2ª rodada (abaixo) subiu os quatro: as correções vieram com código (recomeçar completo do Mundo
3D, pool de batidas, guarda do canvas, `matchMedia` do DPR, validações). Cada subida está
justificada na catraca, com a parte de cada correção medida à parte.

O gzip do Jogo 3D com kit e do Avançado subiu um pouco (código novo de orçamento, sombra e
cache); o cru caiu nos três. Cada subida está justificada ao lado do número na catraca. O teto
do runtime do Mundo 3D no `templateGuard` desceu de 390.000 para 360.000 caracteres.

⚠️ **Armadilha registrada**: no build minificado, o `toString()` de `createProjectRunContext`
contém crase. Como o `trimIndent` recusa crase, o contexto da partida é injetado DEPOIS da
compactação no Jogo 3D e no Avançado (`runtimeSource.test.ts`). O `bun test` não pega a ordem
errada; só o build de produção quebraria.

## Testes e verificação

Redes novas ou estendidas no review (além das auditorias de bloco, `docDrift` e `templateGuard`
de cada extensão):

- `three3dModelsRuntime.test.ts`, `threeRenderBudgetRuntime.test.ts`, `runtimeSource.test.ts`,
  `runtimePayloadBudget.test.ts`, `__tests__/threeDTooltips.test.ts`.
- `game3dRules/__tests__/` e `gameRules.test.ts` no Jogo 3D e no Mundo 3D.
- Jogo 3D: `performance.test.ts`, `platformKitVariant.test.ts`, `countGroup.test.ts`.
- Mundo 3D: `activePlayer.test.ts`, `molda.test.ts`, `performance.test.ts`.
- Avançado: `gameplay.test.ts`, `lote12Examples.test.ts`, `exampleCoverage.test.ts`,
  `performance.test.ts`.
- `core/__tests__/glbSummary.test.ts`, `FieldModelClipPicker.test.ts`,
  `modelClipResolution.test.ts`.
- `examples/exampleProgression.test.ts`: ordem das vitrines das três extensões e, no lote 15, a
  escada ENTRE elas (o degrau 3D máximo não diminui Jogo 3D → Mundo 3D → Avançado, e cada exemplo
  do Mundo 3D e do Avançado fica no degrau da extensão).
- E2E `examples-gallery.spec.ts`: o caso GLB animado + HDR do Avançado ganhou os irmãos do Jogo
  3D (o GLB real do Molda do "Meu herói do Molda": clipe "Acenar" parado, "Esticar" andando, céu
  HDR vermelho no pixel, teardown durante o carregamento) e do Mundo 3D (personagem e "Pôr o
  modelo" com o GLB do Molda, céu HDR no pixel, W anda com o corpo do Molda, nenhum aviso no
  console). Provado que morde: sem o `skyPhoto`, o caso do Mundo 3D reprova (0 de 3 amostras
  vermelhas).

## 2ª rodada: review do review (mesmo dia)

A pedido da usuária, uma revisão completa de tudo o que os lotes 0–15 fizeram, por cinco
revisores só de leitura (Jogo 3D + peças comuns, Mundo 3D, Avançado, editor/export/Molda/docs),
cada achado confirmado no código ou por sonda. As correções vieram com teste que morde (falha
antes, passa depois). As pendências da 1ª rodada também foram atacadas (desempenho do Mundo 3D,
blocos sem exemplo no Avançado, assets 3D no ZIP).

**Jogo 3D e peças comuns** (1 alta, 6 médias, ~20 baixas):
- ALTA: os "Quando…" das regras (`on_life_over`, `on_timer_end`, `on_touch_group`, `on_stage_event`)
  declaravam `bodyContext: 'loop-body'` e a IR não: "quando a vida acabar → tocar música" passava no
  schema e o workspace abria pela METADE. Contexto novo `'game-event-body'` (concede `event-body`) e
  matriz permanente Blockly × IR (`game3dRules/__tests__/blocklyIrMatrix.test.ts`, todo comando em
  todo chapéu, nos três prefixos: antes 8/50/34 divergências, hoje 0). A matriz achou também
  `w3d:start`/`g3k:start` aninhados passando na IR.
- Canvas sem CSS com DPR > 1 crescia em laço (o buffer gravado virava o `clientWidth`):
  `pinIntrinsicSize` no orçamento de render; troca de DPR observada por `matchMedia`.
- Herói grande do Kit Plataforma com a colisão escalada duas vezes; `spawnCopy` clonava o
  `userData` por JSON (ciclo lançava; referência a malha serializava geometria); callback `async` ou
  gerador perdia o modificador na Ponte; "Depois de N segundos" não encaixava dentro de evento (hoje
  mora em 🔁 e aninha em evento/função, com corpo de evento); o Pega-Estrelas ganhou a contagem
  visível (`start_timer`/`on_timer_end`/`time_left` no núcleo).
- Baixas: vaga de luz devolvida ao remover; pool de batidas no `stepBody`; `forEachInGroup` não
  engole erro; soquete vazio igual à sombra nas três extensões; `childStatementBodies` genérico
  (o rawJS dentro de "Quando…" volta ao diagnóstico); `superRefine` do `onGame` (evento ↔ campos,
  tecla válida, item com nome de grupo); marcadores trocados por função (`$&`); `skelWait` não
  grava a falha; piscar respeita o esconder da criança; "Dar … de vida" fora do "A cada quadro";
  `syncLayer` só no resize; "Quanto … aparece" no lugar de "Transparência"; rótulos de tecla
  neutros; ShiftRight; teste da troca de variante ao vivo no `PreviewIframe`.
- Seletor de clipes: o cache do `glbSummary` devolvia clipes velhos depois de um renome do mesmo
  tamanho (o hash não cobria `"animations"`); nome de clipe cortado em 48 virava opção morta;
  "não tem animações" quando só não conseguiu ler.
- Falso: o arredondamento dos alvos do bloom (já arredondava).
- Fica: a opção "(ninguém)" no `camera_mode`; as gravidades padrão (7,2 e 36) não foram alinhadas,
  porque mudariam a altura de todos os pulos: as dicas explicam e um teste trava os números.

**Mundo 3D** (2 altas, 7 médias, 9 baixas, quase todas anteriores a este review):
- ALTA: "Quando derrubar todos os pinos" nunca disparava (o `buildBowling` jogava fora os ganchos
  registrados antes do `start`, inclusive no exemplo Boliche); não dava para sair do barco (o E
  descia e subia no mesmo quadro).
- Recomeçar leve agora devolve a partida: a corrida volta a `idle`, as missões a "por fazer", os
  pinos em pé, as caixas explosivas refeitas, as moedas e coisas nascidas no jogo saem, e o que é do
  "Ao iniciar" tirado com "Tirar … do mundo" volta (amigos, pontos, áreas, ícones, coletáveis,
  empurráveis). O colisor do modelo posto no jogo sai junto (`colliderCells`).
- Veículo invisível para sempre ao descer durante o piscar; amigo nascido no jogo que não passeava;
  "Levar o carrinho para…" no "Ao iniciar" ignorado; teleporte do minimapa no barco movia o carro;
  nuvens e lua seguiam o carro; teto do terreno contava o "Ao iniciar"; pergunta do amigo boiando;
  listeners acumulando no mapa grande; a tecla M lida só em 1 de 5 quadros; a Ponte perdia o clipe
  do `placeModel` com argumento a mais; textos ("carrinho", erro JS cru em inglês).
- Testes: `world-3d/__tests__/reviewFindings.test.ts` (17) + 3 no `blockAudit`.

**Avançado** (4 médias, 5 baixas):
- Objeto tirado do jogo dentro do "Quando terminar a animação" voltava para a grade espacial e ficava
  para sempre; a Lenda do Herói Profissional se vencia segurando espaço parado; a fase 2 da Arena
  nascia um guarda colado no herói; o Salto nas Nuvens não deixava cair (o chão-base para em y = 0
  em todo ponto: decidido manter o chão e mudar os EXEMPLOS: o Salto perde no chão lá embaixo e o
  Parkour do Vulcão virou lava); a dica da Noite e do Tiro não pausava.
- Vocabulário antigo nos avisos do runtime ("entidade", "recolha", "emissor", nomes de bloco que não
  existem) com drift novo no `docDrift`; luzes acesas durante uma fase saem na troca, como os jorros;
  "Guardar … neste computador" sem regravar o mesmo valor e com frase para "grande demais".

**Editor, Molda e docs:** o caminho do menu no texto do Molda ("menu ⋯ → Materiais → Modelos 3D");
`check:world-3d-examples` entrou no CI; números deste relatório reconferidos.

## Pendências e próximos passos

- **QA visual no navegador real não feito**: MSAA e resolução pelo canvas real (lote 14) e a troca
  ao vivo da variante do Kit Plataforma no preview (o código passa a usar o kit com o preview
  aberto) só foram provados por teste unitário e pela galeria E2E, não olhados num navegador.
- ~~**Mundo 3D, desempenho**~~ (resolvido na 2ª rodada): os bichos e os amigos passeiam sem alocar, e
  a cidade agrupa por FORMA em vez de se dividir. Medido: as cidades têm 68 a 108 m, e 4 pedaços
  davam MAIS chamadas de desenho que um (16/10/44/40 contra 8/7/33/30 por vista); o peso eram ~22
  InstancedMesh de casas e cercas com a esfera da cidade inteira. Hoje é um InstancedMesh por forma
  com cor por instância: 21–52 → 7–33 chamadas por vista, 4 → 0 olhando para fora. Voltar ao 2x2 é
  trocar `80` por `40` em `cityChunkGrid()`. Ficam como malhas soltas o bairro, a malha de ruas, a
  fileira de casas, o coreto, os postes e os varais (cada um cortado pelo culling).
- **E2E do Mundo 3D não lê o clipe tocando**: o `SZWorld3D` não expõe a cena. O caso prova o
  modelo carregado e animado de forma indireta (nenhum aviso de clipe ausente ou de modelo que
  não carregou, corpo do Molda andando com W, céu HDR no pixel). A troca parado → andando do
  clipe está provada no `molda.test.ts` com o GLTFLoader de verdade.
- **Exemplos do Jogo 3D acima do degrau no eixo 2D**: 19 dos 21 exemplos (todos menos
  Pega-Estrelas e Meu herói do Molda) trazem o CSS da página (`sz_css_rule`, `sz_css_position`,
  `sz_css_google_font`…) e seis usam `sz_math_trig`, todos `avancado-2d`; o Avançado também usa `sz_math_trig` na Patrulha
  Espacial Profissional. Por isso a escada entre extensões do `exampleProgression.test.ts` mede
  só os blocos da própria extensão. **Decidido pela dona em 25/10/2026:** os exemplos do Jogo 3D
  perdem o HTML e o CSS da página e passam a usar só blocos 3D, como o Pega-Estrelas (placar,
  vidas, telas e textos pelas regras de jogo). O CSS de página NÃO desce de degrau: na jornada,
  HTML e CSS só aparecem nos extras de Web (a partir do Construtor, opcionais) e na Maestria Web e
  Apps, nunca como requisito da trilha. Ainda por fazer. O `sz_math_trig` é outra conversa.
- **Grade dos cursos**: a orientação (`docs/orientacao-cursos-jogos.md`) passou a mapear
  Iniciante 3D = núcleo do Jogo 3D, Intermediário 3D = Jogo 3D completo + Mundo 3D e Avançado 3D =
  Jogo 3D Avançado + Canvas 3D. A grade dos 49 cursos
  (`comunidade-dos-criadores/entregas/cursos/trilha-cursos-jogos.md`, fora deste repositório)
  ainda segue o mapa antigo (Avançado no Intermediário 3D) e precisa ser revista.
- ~~**Bloco sem exemplo no Avançado**~~ (resolvido no mesmo dia): a lista aceita de 27 blocos do
  `exampleCoverage.test.ts` foi esvaziada e o teste exige cobertura total. Entrou a "Noite das
  Fogueiras" (céu .hdr e dois .wav montados por código em `exampleAssets.ts`) e seis exemplos
  ganharam os blocos que já faziam sentido neles. Achado no caminho: o "Puxar as faíscas" era
  apagado na troca de fase (`resetParticles`), coberto por `attractorLevels.test.ts`.
- **Tipos removidos sem migração**: 18 tipos saíram (`sz_g3d_create_swarm` e irmãos, as seis
  câmeras antigas, `touches_box`, `every_frames`, `stop`, `sz_w3d_car_pos`/`person_pos`/`hud`). Sem
  usuário, foi a decisão; mas um único tipo desconhecido zera o `blocksState` INTEIRO
  (`isSupportedBlocklyWorkspaceState`). Se aparecer projeto real com eles, um mapa `{velho: novo}`
  antes do sanitizador resolve.
- **Resíduo da matriz Blockly × IR**: dentro de um callback síncrono num laço ("para cada do grupo"
  dentro do "A cada quadro") o Blockly perde o `loop-body` e a IR mantém. A mesma classe já existe
  nos criadores de recurso; a matriz testa o filho direto e o filho dentro de um "Se".
- O `campaignParserCodec` do Jogo 2D Avançado tem o mesmo `isInlineFunction` sem a guarda de `async`.
- **Perdas silenciosas na ponte do Molda** (peça escondida some sem aviso) continuam como decisão
  de produto em aberto, registrada no `CLAUDE.md` do Molda.
- ~~Assets 3D fora do ZIP exportado~~: a nota estava DESATUALIZADA. Desde `3bca0f50d` (05/09) o
  `sz-assets.js` do ZIP semeia `__SZGAME_ASSETS_3D` e os três runtimes abrem o .glb/.hdr pelo nome,
  sem rede. Agora está provado num navegador real (`e2e/export-3d-assets.spec.ts`, os três runtimes
  e o modelo ausente) e por unidade (`export/__tests__/fileMap.test.ts`, os bytes do GLB do Molda e
  do HDR). Não há .glb/.hdr soltos no ZIP de propósito: nada os pede por URL, e o service worker
  pré-carregaria cada modelo para todo visitante.

Próximos passos sugeridos, em ordem: QA no playground (`bun run dev`) do Pega-Estrelas de ponta a
ponta, do personagem do Molda nos três kits com o seletor de clipes e da paleta no degrau
iniciante-3d; depois tirar o HTML e o CSS dos 19 exemplos antigos (decidido em 25/10) e a revisão da
grade de cursos.
