# CLAUDE.md — @sistemazero/core

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/API que encostar aqui — não confie só na
> memória. Para pesquisa e padrões, use o **MCP do Octocode**.

Guia operacional deste package. Leia antes de editar.

> **Contrato vigente das aulas (20/09/2026):** o bloco interativo aceita somente
> `experimentation` e `html`. As 56 cenas não têm `script` nem executor de demonstração;
> palpite, pistas e pergunta final continuam anexados à experimentação. Menções a
> demonstração ou pergunta curta nas notas históricas abaixo não descrevem mais o contrato.

## O que é

**Lib compartilhada, sem framework**: as utilidades de baixo nível que TODOS os backends do
monorepo reusam (auth, catalog, members, payments, messaging, funnel, fiscal, hub, marketing,
helpdesk…). Runtime: **Bun**. Linguagem: **TS (ESM)**. **Não sobe servidor, não tem banco, não
tem porta.**

## Regra de ouro (dependência)

`core` é a **base da pirâmide**: é importado por todos, e **NUNCA importa de pacote de serviço/app**
(`auth`, `catalog`, `members`, `ui`, `member-shell` etc.) — isso criaria ciclo e vazaria regra de
negócio para dentro da lib comum. Só depende de Bun/TS e do runtime. Mantenha-o **framework-free**
(sem Elysia/Next/React/Drizzle aqui). Mudou um contrato daqui? Ele reverbera em toda a frota — trate
como mudança de API pública (é dependência de `watchPatterns` no CI: mexer em `core` redeploya
backends + funnel + fiscal).

## Como é consumido

Importe pelos **subpaths** (intenção explícita), não pelo barrel raiz:

```ts
import { hmacSign, safeEqual, RateLimiter } from '@sistemazero/core/security'
import { createLogger, serializeError } from '@sistemazero/core/logging'
import { DomainError, ValidationError } from '@sistemazero/core/errors'
import { type Result, ok, err } from '@sistemazero/core/result'
import { toErrorEnvelope, EdgeError } from '@sistemazero/core/http'
import { saoPauloDayKey } from '@sistemazero/core/time'
```

Use `import type` para tipos (`verbatimModuleSyntax`). O barrel raiz (`@sistemazero/core`) existe
por conveniência, mas prefira o subpath. Os subpaths são declarados no campo `exports` do
`package.json` — **subpath novo entra lá** (senão o import não resolve).

## Módulos (`src/`)

| Subpath | O que mora | Arquivos |
|---|---|---|
| `/security` | HMAC de borda, hash, comparação constante, IP do request, rate limiter | `hmac` · `hash` · `safe-equal` · `ip` · `rate-limiter` |
| `/logging` | logger estruturado + serialização segura de erro (redige segredos) | `logger` · `serialize-error` |
| `/errors` | hierarquia de erros de domínio compartilhada (base do `shared/errors` dos serviços) | `domain-errors` |
| `/result` | `Result<T,E>` (ok/err) — fluxo de erro sem exceção | `result` |
| `/http` | envelope de erro `{error:{code,message}}` + erros de borda (edge) | `error-envelope` · `edge-errors` |
| `/time` | calendário civil compartilhado, sem converter data de negócio em instante UTC | `sao-paulo` |
| `/learning/scene` | as **45** cenas de aula: ações, catálogo, motor, avaliação, **elenco** (`cast`: nomes E figura, `actorFigure`), **cenário** (`cenario`: qual JOGO a cena retrata — o fundo, o chão e o elenco de fábrica), **caso e missão** (`setup`) e o que a cena diz de si (`readout`). ⚠️ Cena nova: checklist em "Cenas de aula" abaixo (o TS reprova o que faltar, o palco do member-shell incluído) | `actions` · `state` · `engine` · `nucleo` · `atelie` · `pistas` · `pilha` · `catalog` · `evaluate` · `readout` · `cast` · `cenario` · `questions` · `session` · `index` |
| `/creations` | contratos puros de identidade/armazenamento compartilhados por apps e serviços | `object-deletion` · `pinta-palette-library` · `storage-keys` |

## Cenas de aula (`src/learning/scene/`)

As 45 cenas das aulas interativas. O mesmo motor serve a demonstração (o roteiro conduz) e a
experimentação (a criança conduz), no navegador (o player do member-shell) e no servidor (o members
rejoga os comandos e avalia); o admin monta os blocos com as mesmas réguas. Nada aqui desenha: palco e
bancada moram no member-shell, com a tabela cena → palco/bancada no `packages/member-shell/CLAUDE.md`.
⚠️ O 3D (`axis-z`, `camera-3d`, `mesh`, `pick-ray`) é DESENHADO à mão em SVG (`scene-3d.tsx` do
member-shell), não renderizado: uma biblioteca 3D pesaria em toda cena do player.

Deploy, ordem dos serviços (members ANTES de kids e community) e manifestos a importar:
[`docs/aulas-interativas-legado/raio-x-implantacao.md`](../../docs/aulas-interativas-legado/raio-x-implantacao.md).

### Mapa: arquivo → responsabilidade

| Arquivo | O que mora |
|---|---|
| `actions.ts` | `SCENE_IDS`, `SCENE_GROUPS`, as portas (`SCENE_PORTS` e o `PORTS` de cada cena), a união `SceneAction` e `isSceneAction`, a régua ÚNICA de legalidade (player, validador de roteiro e DTO do members perguntam a ela); `SCENE_LIMITS` e as listas (`MIRROR_MODES`, `SYMMETRY_PIECES`, `SHEET_CROP_WIDTHS`, `MESH_LEVELS`, `MESH_SKIN_LABELS`, `MAP_TILES`); o relógio (`SCENE_FRAME_RATE`, `sceneFrameRate`, `sceneStepLabel`, `sceneStepSeconds`, `sceneLongFrame`); `SceneSetup` |
| `state.ts` | `SceneState` (um grupo por assunto), `initialScene` (o mundo de fábrica), `hydrateSceneState`, `isSceneState` (campo a campo), `cloneScene` (à mão), `observe`, `sceneCactiOnScreen` e as constantes de cena (`POOL_CROSSING`, `DELTA_RACE`, `HITBOX_*`, `DRAW_LOOP_LANE`…) |
| `engine.ts` | `openScene` (abre o caso) e os `esquecerOGesto*`, `stepScene` (o motor, puro), o quadro (`umQuadro`) e as réguas exportadas: `facesAVista`, `scenePickPath`, `sceneBrainLabel`, `sceneDescriptionSays`, `PARADA_DO_SALTO`/`TOPO_DO_SALTO` e as do ▶ (`sceneClockShouldStop`, `sceneGestureRunsClock`) |
| `nucleo.ts`, `atelie.ts` | As réguas puras do núcleo do Iniciante 2D (de `hold-vs-press` a `tilemap`) e do ateliê (de `frames` a `sheet-vs-sprite`), sem importar o estado |
| `pistas.ts`, `pilha.ts` | `PISTA_DA_META` (a meta a que cada degrau da escada de pistas serve); `ScenePilha` e `LAYERS_CAMADAS` (a `layers` apresentada como o painel Camadas do Pinta) |
| `catalog.ts` | `SCENE_MODELS` (título, instrução, metas `SceneGoal`, pistas, roteiro, `successNoCaso`), `sceneGoalIds`, `sceneDefaultGoalIds`, `SCENE_COMPARISONS`/`sceneShowsComparison` |
| `evaluate.ts` | `sceneGoals`, `evaluateExperimentation`, `evaluateDemonstration`, `sceneSuccess`, a pista (`sceneHint`, `sceneHintStep`, `sceneHintDone`) |
| `readout.ts` | O que a cena diz de si: a faixa (`sceneReadout`) e a frase (`sceneSituation`); `drawLoopOnScreen`, `screenReaderSays` |
| `cast.ts` | O elenco (`castText`, `SCENE_FIGURES`, `actorFigure`, `SCENE_ROLES`, `sceneCenario`) e o português que a plataforma gera (`quantos`, `decimal`, `numero`) |
| `cenario.ts` | O CENÁRIO: `SCENE_CENARIOS` (os quatro jogos que os cursos ensinam), `SceneCenarioId`, `cenarioTemChao`, `cenarioEscuro`, `fundoDoCenario`, `isSceneCenario`, `CENARIO_DA_FIGURA` |
| `questions.ts` | `SCENE_QUESTIONS`: a previsão e a explicação de cada cena |
| `voz.ts` | A voz do Zappy: `chaveDeVoz`/`textoFalado` (a chave do dicionário É o texto falado), `SceneVozes`/`isSceneVozes`, `filaDeVoz` (tudo ou nada por fala), `falaDoPalpite`, `falaDaInstrucao`, `falaDaPergunta` e `textosFalaveisDaCena` (o que o gerador do admin grava). ⚠⚠ Mora aqui porque gerador e player precisam produzir a MESMA string — duas cópias que divirjam dão áudio que o player nunca encontra |
| `audio-url.ts` | `isSceneAudioUrl` (módulo próprio só para o `voz.ts` usá-la sem fechar ciclo com o `index.ts`) |
| `session.ts` | As sessões (`stepExperiment`, `stepDemonstration`, `SESSION_LIMITS`), o pacote guardado (`pack*`, `read*Session`), os segmentos (`apply*Segment`, `SceneConflictError`) e `sceneEmitsSound` |
| `index.ts` | As duas atividades, `isSceneSetup`, `isSceneScript`, `sceneStart`, `sceneTargets`, `sceneScript`, `sceneModelFor`, `sceneHintsFor` e a leitura tolerante (`sceneSetupGoals`, `sceneUnknownSetupGoals`, `sceneActivityForReading`) |
| `learning/index.ts` | O bloco: `isInteractiveBlock`, a projeção pública (`publicInteractiveBlock`, `PUBLIC_ACTIVITY_FIELDS`, `isPublicInteractiveBlock`), `blockPrediction`/`blockCheckpoint`, `learningHints`, `evaluateLearning`, `PERGUNTA_MUDOU` |

Fora do core: o DTO TypeBox do members (`packages/members/src/interfaces/http/learning.dtos.ts`, que deriva
das listas e dos limites daqui) e o editor do admin (`packages/admin/src/components/editor/scene-action-editor.tsx`
e `scene-cast-editor.tsx`). Os testes ficam ao lado dos arquivos (`src/learning/scene/*.test.ts`); os caminhos
de gesto compartilhados, em `tests/fixtures/exploration-paths.ts`.

### Checklist: cena, meta, ação ou campo novo

- **Cena nova.** `SCENE_IDS`, `PORTS`, `SCENE_MODELS`, `SCENE_QUESTIONS`, `SCENE_ROLES`, `PISTA_DA_META`, as
  leituras e a situação do `readout.ts` e, se ela tiver tempo, `SCENE_FRAME_RATE`. No member-shell, o palco (o
  `ExplorationStage` é exaustivo: cena sem palco é erro de tipo) e a bancada. As metas entram na tabela
  `CENAS` do `pedidos-no-motor.test.ts`, e o `tests/scene-figures.test.tsx` do member-shell reprova o palco
  que desenhe papel a mais ou a menos que `SCENE_ROLES`.
- **Meta nova.** `SceneGoal` com `pedido` (obrigatório, regras em "Texto e elenco") e `soNoCaso: true`
  quando ela só existe para um caso (fica fora da missão de fábrica, `sceneDefaultGoalIds`). A ORDEM no
  catálogo é a do "Conferir" em cadeia, e a meta do `revealOn` precisa cair antes da conclusão. O degrau de
  pista que serve a ela vai no `PISTA_DA_META`. Ela obedece à régua "a meta só cai quando a criança VIU".
  ⚠️ Id de meta não muda: sessões, manifestos e `revealOn` o citam; meta nova é ACRÉSCIMO. A descoberta
  guardada não é validada contra o catálogo, então sessão com meta que saiu continua abrindo.
- **Meta que sai.** A autoria (`isSceneSetup`) passa a recusar o id velho, e o editor do admin NOMEIA cada
  objetivo que a cena não tem. A leitura (`sceneSetupGoals`, `sceneActivityForReading`) descarta o id
  desconhecido — senão o bloco do banco some da aula e trava a seção obrigatória —, e NADA entra no lugar:
  quem autora conserta. A consulta ao banco antes de importar está no doc de implantação.
- **Ação ou porta nova.** Ação no fim da união `SceneAction`, com o `case` de `isSceneAction` dizendo em que
  cena ela vale; porta em `SCENE_PORTS` e no `PORTS` da cena. No mesmo passo o `SceneActionSchema` do members
  e o editor do admin (os dois leem `SCENE_PORTS`). ⚠️ Ação que sai da bancada SAI do core
  (união, `isSceneAction`, motor, DTO do members e lista `TODAS` do admin): a funcionalidade nasce na primeira
  versão e não carrega gesto de antes. O editor do admin NOMEIA a ação que a lista da cena não oferece
  ("<nome> · não vale nesta cena" quando o domínio a recusa, "<nome> · não cabe aqui" quando ela é legal e só
  não é oferecida ali), porque o motor trata ação ilegal como no-op.
- **Campo novo na atividade** (como `setup`, `cast`, `presentation`, `pilha`, `vozes`): o tipo e o validador em
  `index.ts`, `PUBLIC_ACTIVITY_FIELDS` em `learning/index.ts` (⚠️ fora da lista ele não chega ao navegador, e
  a criança abre uma cena diferente da que o servidor avalia), o `InteractiveBlockSchema` do members e o
  editor do admin.
- **Campo novo no estado.** Todos os passos:
  1. o tipo em `SceneState` e o padrão em `initialScene`;
  2. `hydrateSceneState`: GRUPO novo entra na lista de padrões (é o que deixa um retrato gravado antes de a
     cena ter aquele assunto abrir como a de fábrica). ⚠️⚠️ A régua para no grupo: CAMPO faltando dentro de
     um grupo presente NÃO é completado, o retrato é inválido e quem chama o trata como ausente. Preencher
     campo a campo fabricava estado incoerente e meta falsa (um `drive` sem âncora fechava "a posição mudou
     sozinha" com a velocidade em zero);
  3. `isSceneState` (e a função `is*` da família) com o TETO do campo;
  4. `cloneScene`, escrito à mão: array ou objeto aninhado sem cópia vaza entre estados;
  5. `esquecerOGesto*` quando o campo CONTA gesto ou guarda história (ver "O caso").
- **Lista que o motor empilha** tem CORTE no motor (`.slice(-MAX)` com o teto do validador:
  `SOUND_BEATS_MAX`, `START_TRIES_MAX`, `VELOCITY_TRAIL_MAX`, `MARCAS_NO_PAPEL`, `TILEMAP_MARKS_MAX`), não só
  teto no validador: sem corte, a 25ª casa trocada na `tilemap` tornava o retrato inválido, e a criança lia
  "esta descoberta mudou, recomece" no meio do mapa.
- **Figura nova no elenco.** `SCENE_FIGURES` e `SCENE_FIGURE_NAMES`; o desenho na ARTE DO JOGO
  (`@sistemazero/studio/arte`) e a entrada no `FIGURA_DA_ARTE` do `scene-figures.tsx` do member-shell; o
  TypeBox do members (deriva da lista); `NOME_DA_FIGURA` no `scene-cast-editor.tsx` do admin (os dois
  últimos são `Record`, reprovam a falta). ⚠️ Em que CENÁRIO ela entra é o que decide o mundo dela:
  `SCENE_CENARIOS` no `cenario.ts` (a tabela figura → cenário é DERIVADA dele, não uma lista à parte).
- **Régua nova ou alterada em `nucleo.ts`/`atelie.ts`.** Elas existem para motor, faixa e palco não
  recopiarem números. ⚠️ Nem toda régua tem os três leitores: antes de mudar uma, `git grep` quem a lê.
  Régua lida só por teste não prova nada sobre o motor (a `tilemapCoinRow` era gabarito de teste enquanto o
  motor reescrevia a regra em linha; hoje motor e régua leem `isTilemapCoinRow`).

### A régua das metas: a meta só cai quando a criança VIU

⚠️⚠️ É o defeito que os reviews mais pegam. Meta que cai pelo estado inicial, por acidente, por metade do
gesto ou por um valor que não mudou ensina que descobrir é apertar qualquer coisa. Os casos abaixo
aconteceram e estão travados por teste (o comentário de `SCENE_FRAME_RATE` manda conferir esta tabela
quando um ritmo mudar):

| Cena | Caía por | Hoje pede |
| --- | --- | --- |
| `entity-state` | contar a diversidade DEPOIS da mudança (um toque fechava duas metas) | `own` com as três em estados distintos; `independent` com diversidade ANTES do toque e o relógio já andado |
| `pick-ray` | caixas disjuntas: "parou na primeira" sem nada atrás; depois, mirar no pedaço comum fechava as duas metas | `first` com duas caixas no caminho (`scenePickPath`), `face` com uma só |
| `camera-3d` | a cena ABRE com duas cores à vista, e `recenter` era incondicional | ter GIRADO até ver; `back` pede ter SAÍDO do começo (e é `soNoCaso`) |
| `shading` | a forma nasce chapada: desligar a sombra de saída era um no-op | `flat` só depois de ter ligado a sombra |
| `circle-collision` | "afastar de novo", que o relógio (que só aproxima) nunca permite | `formula`: mudar um raio TROCAR o resultado com a distância parada; `approach` afasta nas duas cenas de distância |
| `pool` | ligar a reciclagem de saída fechava "parou"; um corpo por chamada do ▶ | o cacto atravessa em `POOL_CROSSING` quadros; `grows` com três fabricados; `recycled` com um cacto que já estava na tela; `steady` 4 s com a reciclagem ligada depois de `grows` |
| `contact` | "afastar e voltar" caía no afastar; `drain` contava chamadas do ▶ | `drain` e `once` no terceiro quadro da encostada (`CONTACT_SEEN_FRAMES`); `apart` com `once` numa encostada anterior, um quadro com os dois longe (`hit.away`) e o terceiro quadro da encostada nova |
| `variable` | a caixa nasce fora da tela e com zero: o 1º "somar" e o 1º "mostrar" fechavam meta | `changed-hidden` e `shown` só depois de `stored` |
| `velocity` (`stopped`) | a cena nasce com velocidade ZERO: o 1º passo fechava "com zero fica parado" | ter visto o relógio mover alguma coisa (`moves`) |
| `velocity` (sentidos) | medidas POR FATIA (com ±1 no ▶ nunca passavam de meio pixel); com o y no batente o sinal estava certo e nada andava | o caminho desde a âncora (`drive.anchorX`/`anchorY`, onde a velocidade foi escolhida) naquele sentido; `down`/`up` pedem também três quadros (`drive.steps`) |
| `delta-time` | trocar para segundos de saída fechava "chegaram juntas" | `together` na chegada, depois de `apart` |
| `tilemap` | contava TROCAS; depois, a marca por linha seguia contando um `#` apagado | `same-letter`: a mesma peça (`#` ou `o`) em duas LINHAS, só com as marcas vivas de cada casa (`tilemapMarkedRows`) |
| `draw-loop` | limpar SEM desenhar fechava "a tela congela" | a tela vazia é vazia (`render.drawn` sem nada); `frozen` só sem limpar e com algo desenhado |
| `spawn` (`every-frame`) | um "Um passo" com 6 cactos num tufo que ninguém conta | 1 s de relógio e 20 cactos |
| `axis-z` (`shadow`) | num caso que abre no ar, mexer só no x fechava | ter mexido na ALTURA e mexer x ou z com o cubo no ar |
| `enemy-type`, `aim`, `stage-size` | o deslizante no batente reenvia o MESMO valor | o valor mudar de verdade |
| todas as de tempo | um quadro por chamada: o mesmo gesto dava números diferentes no ▶, no passo e no roteiro | o relógio de quadro fixo |
| `score` (`score-start`/`score-end`) | a sobra de ANTES do gesto atravessava: "o placar ficou parado" caía 0,05 s depois de bater | nas cenas de `sceneLongFrame` o gesto recomeça o quadro |

Regras que saem da tabela:
- Meta de COMPARAÇÃO pede o primeiro termo visto antes: `stopped` depois de `moves`, `landed` depois de
  `floating`, `alike` depois de `stairs`, `axis-decides` depois de `two-sides`, `size-apart` depois de
  `crop-whole`, `score-start` depois de `score-idle-wrong`, `restarted` depois de `screen-only`.
- Chegar não é reenviar: `origin` pede CHEGAR em 0, 0 vindo de outro lugar; `target` pede mudar o tamanho.
- Meta de tempo conta QUADROS da cena, nunca chamadas de `advance`.
- O deslizante do player manda o valor ao motor só quando a mão SOLTA (regra do `Medida`, member-shell): a
  passagem por valores intermediários derrubava meta (arrastar o fogo de 40 a 0 fechava `even-step`).
- ⚠️ Missão VAZIA reprova (`evaluateExperimentation`): um filtro de `targets` que não casa nada faria a
  atividade passar com evidência zero, em silêncio.
- A `jump-sound` pede a montagem FICAR no arranjo descoberto (`settled`: o som no pulo), só quando a
  atividade cobra essa meta; `pedidoDoArranjo` diz o que falta. ⚠️ Condição de conclusão que a faixa não
  mostra vira META, não `settled`. Substituído (16/09/2026): a `layers` exigia no `settled` o Dino de volta
  na frente → a meta `back-in-front`, porque a faixa dizia "2 de 2" sobre uma cena que não concluía.

### O caso da atividade (`setup`)

⭐⭐ É o que faz um modelo render mais de um uso: o elenco troca QUEM está no palco; o `setup` troca DE
ONDE ele parte (`actions`) e O QUE conta como descoberta (`goals`).
- `openScene(start)` abre a cena de verdade; `initialScene` é o mundo de fábrica. As ações do caso passam
  pelo motor (é o que garante um estado alcançável) e ⚠️ a evidência é zerada depois delas. Toda abertura
  passa por `openScene`, inclusive o `reset` (recomeçar volta ao CASO).
- `reset` e `hint` são recusados dentro do caso (`isSceneSetup`). `goals` só vale na experimentação; na
  demonstração o campo é recusado (campo sem efeito é armadilha para quem autora).
- `sceneTargets(activity)` é a fonte única do que a atividade cobra; `evaluateExperimentation`, `sceneGoals`,
  `settled` e `sceneSuccess` recebem a lista.
- ⚠️ `setup` é PÚBLICO (`PUBLIC_ACTIVITY_FIELDS`): sem ele, o navegador abriria o mundo de fábrica enquanto o
  servidor avalia o caso do professor.
- Um caso não abre com um salto parado no chão (`setup: [jump]` sem relógio): o motor desfaz o salto. Salto
  com relógio segue abrindo no ar.
- ⚠️⚠️ **O caso não pré-semeia a memória do gesto** (`esquecerOGesto`, `esquecerOGestoDaSegundaMetade`,
  `esquecerOGestoDoNucleo`). O mundo é do professor; a história é da criança, e começa vazia. Sai tudo o que
  CONTA gesto (apertos, tiros, trocas, escutas, batidas, sorteios, traços) ou guarda "onde eu estava"
  (fantasmas, âncoras, rastros, marcas do papel e do mapa); fica o que é MUNDO. ⚠️ Campo novo que conta
  gesto entra nessas funções no mesmo commit: a lista cresceu em rodadas de review, sempre pelo campo
  esquecido. Os casos que confundem:
  - o DERIVADO vai com a população: os contadores da `crowd` são recalculados dos cactos que sobraram
    (`born − removed − vivos` virava negativo e a `cleanup` abria com os números se desmentindo);
  - na `random` e na `acceleration` os cactos do caso SÃO memória (as raias sorteadas, a fileira dos 5
    segundos) e saem; na `cleanup` saem os que já estão fora da tela; na `pool` sai a pista inteira e fica
    só a chave da reciclagem; na `delta-time` sai a corrida e fica só o modo;
  - o pico de um salto do caso que já pousou sai (o primeiro salto da criança fechava `other-height`); com
    o Dino no ar o voo é mundo e fica;
  - a `group-loop` NÃO zera `hunt.ticks`: as distâncias SÃO o relógio, e zerar trocaria o mais perto no
    primeiro quadro;
  - `clock.carry` zera: o caso não deixa meio quadro adiantado.

### Demonstração

- `isSceneScript` valida a forma E toca o roteiro (`playsOut`): cada `waitFor` precisa acontecer, depois de
  um `advance` na última ação do passo. ⚠️ Sem roteiro autoral, a demonstração com `setup` confere o roteiro
  do MODELO a partir do caso (`isDemonstrationActivity`): um caso que já liga a reciclagem faria o
  `waitFor: 'grows'` da `pool` nunca chegar. O roteiro usa `SCENE_LIMITS.scriptAdvance`; o caso, `advance`.
- ⚠️⚠️ A etapa consome o `advance` INTEIRO (`stepDemonstration`): o `waitFor` é a promessa conferida na
  autoria e não encurta o tempo (encurtado, "avance 1 s" virava 2,5 px). A sobra de um tique abaixo de
  0,001 s é consumida na hora, nunca descartada. `session.test.ts` toca os 45 roteiros com o relógio REAL do
  player (quadros com tremida, semente fixa): fatias exatas não pegam esses defeitos.
- Roteiro que ENCOLHEU desde a sessão guardada recomeça a demonstração do zero, sem perder `viewed` (rever
  nunca desconclui).
- `presentation`: `guided` (as etapas à vista) ou `inline` (o roteiro com um ▶ e nada mais, no meio da
  explicação). O motor é o mesmo.
- `highlight: 'compare'`: `SCENE_COMPARISONS` + `sceneShowsComparison(cena)` são a lista única (o "Guardar
  este jeito" e a comparação no player, a opção "Comparação" do admin). `isSceneScript` segue aceitando
  `compare` em qualquer cena: o roteiro antigo abre, o destaque não desenha nada e o admin avisa.
- Descoberta feita durante a demonstração não credita a criança (`sceneEvents`).

### A previsão e a pergunta são da CENA

⭐⭐ `SCENE_QUESTIONS` escreve a previsão e a explicação das 45 uma vez. Medido antes: de 52 blocos de cena
nos cursos, 7 tinham previsão e 8 pergunta. O que depende de alguém lembrar não acontece.
- `blockPrediction(block)` e `blockCheckpoint(block)` são a ÚNICA porta: o campo do bloco vence, senão vale o
  do modelo, vestido pelo elenco. `publicInteractiveBlock` e `withAttachedQuestion` passam por eles.
  ⚠️ Ler `block.checkpoint` cru para uma cena é voltar aos 15%.
- ⚠️ A pergunta padrão vale só na EXPERIMENTAÇÃO (na demonstração a criança não conduziu). A previsão padrão
  vale nas duas, menos na demonstração `inline`, que existe para não ter portão. Quem escreve a sua no bloco
  continua mandando.
- A previsão não vale nota e é PÚBLICA inteira (`correctChoiceId`, `revealOn`, `shows`, copiados campo a
  campo): o player precisa deles para retomar o palpite. O gabarito da PERGUNTA segue podado.
- Toda previsão do modelo tem `revealOn` (a meta que a bancada de hoje faz cair e que MOSTRA a resposta) e
  `shows` em toda opção errada (o que a cena mostrou, no PASSADO). Previsão escrita numa demonstração pode vir
  sem `revealOn` (volta no "Você viu tudo!"). `questions-order.test.ts` cobra no modelo e nos manifestos v6.
- `isInteractiveBlock` recusa `revealOn` que não é meta da cena. ⚠️⚠️ Só na AUTORIA: o
  `isPublicInteractiveBlock` roda no NAVEGADOR, contra o catálogo do navegador, então descarta o `revealOn` e
  lê a atividade por `sceneActivityForReading`. Com o members um deploy à frente, uma meta nova derrubava a
  atividade inteira em "precisa de uma configuração válida".
- A cena aceita pergunta anexa (`block.checkpoint`): a sessão mora em `answers.sceneCheckpoint`, e não mais
  na chave `answers.checkpoint` da alternativa escolhida (era essa colisão que proibia a pergunta).
- ⭐⭐ **`block.semPerguntaFinal`** (17/09/2026, decisão da dona): a aula dispensa a pergunta do fim daquela
  cena, e a criança só mexe. Escrever a sua TROCA a pergunta; este campo a TIRA — é a única porta para isso.
  Campo de BLOCO (mora ao lado do `checkpoint`, não na atividade), só `true`, e `isInteractiveBlock` o recusa
  fora da experimentação de cena ou junto de um `checkpoint` escrito (campo sem efeito e ordens contrárias).
  Sem pergunta, quem conclui o bloco e a seção é a DESCOBERTA, e o palco mostra a frase de sucesso na hora
  (`SceneConclusion` já fazia isso). Fora do core: o `InteractiveBlockSchema` do members (campo de bloco não
  declarado é recusado com 400) e a caixa "Esta cena entra sem a pergunta do fim" no editor do admin, que sai
  na troca de tipo (`trocarTipo`). Primeiro uso: `stage-size` e `screen-reader` da Aula 1 do Corre Dino, que
  tem quatro cenas seguidas e daria oito momentos de responder na primeira aula da criança.
- A explicação dá a palavra final (`withAttachedQuestion`). Enquanto a cena não fecha, a pergunta não
  reprova; errar e não ter respondido têm recados diferentes, sem nunca dizer qual é a certa; uma resposta
  que não é opção da pergunta de agora devolve `PERGUNTA_MUDOU`, que o player reconhece para oferecer "Abrir
  de novo" (`tests/learning-player-consertos.test.ts`).
- A opção errada é o erro típico PLAUSÍVEL, nunca espantalho. ⚠️ A ORDEM das alternativas é conteúdo: a
  certa não fica sempre no mesmo lugar nem alterna em vaivém (`questions-order.test.ts` mede no catálogo e
  na ordem real de cada curso). Mexeu numa ordem, rode o teste. ⚠️ Id de escolha que muda de SENTIDO ganha id
  novo (o palpite guardado e o relatório mostram a frase pelo id); frase reescrita com o mesmo sentido fica.

### O relógio de quadro fixo

⭐⭐ O mesmo tempo dá o mesmo mundo em qualquer fatiamento: o ▶ em fatias irregulares, o botão de passo e o
roteiro. `SCENE_FRAME_RATE` (`actions.ts`) é o ritmo de cada cena com tempo e a régua de legalidade do
`advance` (cena fora dela não tem relógio); o porquê de cada número está no comentário da tabela. Cite a
constante (`sceneFrameRate`, `sceneLongFrame`), não copie os números.
- ⚠️⚠️ O motor ACUMULA (`clock.carry`) e roda a lógica uma vez por quadro inteiro (`umQuadro`). A sobra é
  FRAÇÃO de quadro, nunca segundos (em segundos, subir o ritmo de uma cena soltaria vários quadros de uma vez
  numa sessão salva). O quadro só fecha quando o tempo dele PASSOU; a folga `1e-6` é de quadro (20 fatias de
  0,05 s somam 0,9999999999999999). Número por segundo entra dividido pelo ritmo, e com ritmos inteiros a
  conta fica exata.
- `sceneStepLabel`/`sceneStepSeconds`: "Avançar 1 quadro" anda um quadro onde o quadro é o assunto; "Um
  passo" anda os quadros inteiros mais perto de 0,2 s. ⚠️ `frames` e `delta-time` ficam "Um passo" de
  propósito (lá "quadro" é o desenho da animação, ou o quadro de outro computador).
- ⚠️⚠️ Nas cenas de `sceneLongFrame` o GESTO recomeça o quadro (fim do `stepScene`, e o `undo` do
  `stepExperiment`); a mesma régua liga a barra do quadro em andamento no player.
- A legenda de um `advance` que não fecha quadro FICA (zerada, piscaria a cada fatia do ▶). Nas cenas de
  salto sem nada no ar e na `restart` fora da partida o `advance` também não a apaga.
- ⚠️⚠️ `SESSION_LIMITS.advanceSeconds`/`advanceFrames`: o comando da CRIANÇA pede no máximo 1 s e 30
  quadros (é CPU do members por requisição); o caso e o roteiro não passam por aí. Fixture de teste que manda
  `advance` maior na experimentação reprova: fatie (`tempo(n)` em `tests/fixtures/exploration-paths.ts`).
- **Quando o ▶ para ou solta.** O player e a bancada do "Agora é sua vez" leem só duas funções do motor:
  `sceneClockShouldStop(cena, antes, depois)` (nas três cenas de salto, nenhum voo depois do tique; o Dino
  sem gravidade passando de `PARADA_DO_SALTO`, pela `sceneJumpLeftView`; a batida da `circle-collision`, pela
  `sceneClockReachedStop`) e `sceneGestureRunsClock(cena, comando, depois)` (`true` solta, `false` para,
  `null` deixa: `jump` solta; `connect` pela `sceneConnectRunsClock`, em que desligar a gravidade acima da
  parada PARA; `start` na `restart` e na `score` com a partida jogando solta). `relogio-do-player.test.ts`
  trava as duas.
  Substituído (16/09/2026): uma cópia dessas regras em cada tela → as duas funções do core, porque a bancada
  da vez tinha divergido e não parava o ▶ com o Dino no chão.

### Texto e elenco

- **Um narrador por coisa.** A legenda (`state.caption`) é do GESTO e dura um passo: o `stepScene` a zera em
  toda ação que não é `hint` nem `advance`. A situação (`sceneSituation`) descreve o ESTADO quando não há
  legenda (⚠️ a legenda vem NA FRENTE da situação, então ela também é narradora); a faixa (`sceneReadout`)
  dá até três números. ⚠️ Nenhum dos três diz a REGRA da cena nem a resposta da previsão: a regra mora no
  `success` e na explicação. Não reintroduzir legenda "de estado" (que repete a situação) nem legenda que diga
  a regra: mais de 30 saíram por um dos dois motivos. `observe()` não escreve o `label` da meta na legenda (o
  `label` é a conclusão; quem comemora é a moldura do player).
- **A pista.** O nível 1 é a situação + o degrau (`sceneHint`): mudou a frase da situação, confira a pista 1 com
  elenco de nave. `degrau` responde primeiro aos estados sem saída e à meta que FALTA; depois a escada do
  modelo PULA o degrau cuja meta já caiu (`PISTA_DA_META`), e sem degrau restante vem o `pedido` da meta que
  falta. `sceneHintStep` devolve o texto com as metas do degrau, e o player troca a caixa por "✓ Feito!"
  quando `sceneHintDone`. ⚠️ A pista do manifesto vence a do modelo (`learningHints`): onde a do modelo é
  melhor, o manifesto fica sem pista.
- **`pedido`** (obrigatório em `SceneGoal`) é o gesto que a meta pede, com o nome do botão da bancada de
  HOJE; é o que o "Conferir" e o "Ainda falta" dizem no lugar do `label`. Nunca o resultado dela nem o de
  outra meta; sem pronome; o tempo é "deixe o tempo passar" ou o ▶ (o botão de passo tem dois nomes), e na
  `acceleration` é o botão "Passar 5 segundos". ⚠️⚠️ `pedidos-no-motor.test.ts` confere RODANDO O MOTOR: o
  texto igual ao do catálogo, a meta cair pelo pedido isolado, o "Conferir" em cadeia fechar a cena (também
  nos casos dos manifestos v6) e a meta do `revealOn` MOSTRAR a resposta antes de cair (as exceções ficam
  comentadas em `revelaNaConclusao`).
- `sceneSuccess(cena, elenco, metas)`: a frase da missão restrita (`successNoCaso`, chave = as metas em ordem
  alfabética unidas por `+`), senão a de sempre. Player e avaliador leem a mesma.
- **Elenco** (`cast.ts`): troca NOMES e DESENHO, nunca o motor. `castText` flexiona artigo, contração, plural
  e o adjetivo predicativo ("a nave está escondida"). ⚠️⚠️ Texto que o elenco veste NÃO usa pronome de
  terceira pessoa (`ele`, `dele`, `nele`): a régua só flexiona o que está colado ao nome, e decidir o
  referente não é coisa que varredura faça. Repita o nome. Vale para catálogo, perguntas, pedidos e legendas
  do motor (`cast.test.ts` varre o texto que o elenco realmente veste).
- `quantos(n, um, varios)`, `decimal` e `numero` (vírgula e o sinal de menos U+2212) moram no `cast.ts`
  porque motor, faixa e bancada escrevem número na tela. `readout.test.ts` varre faixa, situação e legenda em
  TODO passo do roteiro de cada modelo. Na faixa, `liga(on, gênero)` concorda com o rótulo.
- **Figura**: `actorFigure(cast, papel)` = a declarada; senão a que o NOME pede (`figureFromName` sobre
  `SCENE_FIGURE_NAMES`); senão a de fábrica do papel. ⚠️⚠️ Derivar do nome é o que dá o desenho certo aos
  manifestos publicados sem `figure`. ⚠️ Os nomes vão num `Map` ("constructor" num objeto literal devolveria
  uma função do protótipo). "bala" não é sinônimo de tiro: no Brasil é doce. `castText` apara o nome (o
  editor do admin guarda como digitado).
- **Cenário**: ⭐⭐ `sceneCenario(cast, cena, declarado?)` responde QUAL JOGO a cena retrata —
  `corre-dino`, `nave`, `gorilas` ou `meu-jeito` (`cenario.ts`). Era `sceneWorld`, que só dizia
  `terra`/`espaco`; isso bastava enquanto o mundo era um retângulo de cor e deixou de bastar quando o
  palco passou a desenhar a ARTE DO JOGO. O campo `activity.cenario` (opcional, escrito pelo professor)
  VENCE; sem ele vale a derivação, que é o que mantém de pé os manifestos já publicados.
  A régua, na ordem: nave, asteroide, tiro, gorila, banana ou prédio desenhado → aquele cenário; senão,
  papel desenhado DECLARADO com figura do Corre Dino → `corre-dino`; senão, pedra ou chama → `meu-jeito`.
  ⚠️ Papel não declarado não puxa para o Corre Dino (o editor do admin avisa esse caso).
  ⭐⭐ **Os 38 blocos de cena dos três cursos v6 DECLARAM o campo** (20 `corre-dino`, 8 `nave`, 10
  `meu-jeito`), então na prática a derivação é rede, não o caminho: quem manda é o CURSO, e uma cena do
  Desafio montada com o elenco de fábrica do Corre Dino continua mostrando a nave. Quem escreve o campo
  é a receita histórica (`CENARIO_DO_CURSO` em `docs/aulas-interativas-legado/qa/cenas-editorial.ts`), e
  `packages/core/tests/learning.test.ts` cobra as duas metades: toda cena declara, e o que ela declara
  é o cenário do curso dela.
  ⚠️⚠️ Quem pergunta por chão usa **`cenarioTemChao`**, nunca uma comparação com literal: `gorilas` tem
  chão apesar do céu escuro, e `meu-jeito` não tem apesar de não ser o Desafio. E quem pergunta por céu
  escuro usa **`cenarioEscuro`**: são duas perguntas diferentes desde que o registro passou de dois
  mundos para quatro cenários, e confundi-las põe o cromo claro sobre a cidade noturna dos gorilas.
  ⚠️ O campo atravessa a fronteira inteira: `PUBLIC_ACTIVITY_FIELDS` nos dois tipos de atividade e o DTO
  TypeBox do members (`SceneCenarioSchema`) — sem ele lá, o `normalize` do Elysia tira o campo do payload
  em silêncio e o player volta a derivar.
- `sceneEmitsSound(cena)` decide o "Ligar som" pela legalidade da porta `sound` (hoje só a `jump-sound`);
  `session.test.ts` amarra a régua ao motor.

### Por cena: o que não é óbvio

A regra de cada meta está no motor, comentada. Aqui fica o que costuma pegar quem mexe.

**A tela e o mundo**
- `coordinates`: a tela é a do CASO (`place.width`/`height`; a ação `stage` só num caso). O endereço usa
  `SCENE_LIMITS.addressX`/`addressY`: ⚠️ `placeX`/`placeY` medem a tela do Corre Dino para `draw-loop` e
  `hold-vs-press`, e alargá-los mudaria essas cenas. O fantasma fica onde a sequência no mesmo eixo e sentido
  começou.
- `screen-reader`: `description.said` é a frase ouvida COM texto e a subida de `listens` faz o palco falar.
  `sceneDescriptionSays` reconhece objetivo e controle por RADICAL, sem acento; ⚠️ "espaço" e "foge" são
  EXATAS ("espaçonave", "fogo"), a letra "a" não é tecla, e "espaço" depois de palavra de lugar ("no
  espaço") não é a barra.
- `stage-size`: `resized` e `target` só com a BORDA à vista.
- `draw-loop`: o Dino anda uma casa por quadro, desenhado ou não (`render.x`); `render.drawn` guarda ONDE
  estão os desenhos, e `drawLoopOnScreen` (= o tamanho dessa lista) é o número da faixa e do palco. O quadro
  limpa antes e desenha depois; ⚠️ as chaves `loop`/`erase` não zeram o rastro, só o quadro limpa.
- `world`: criar e desenhar são independentes; `hidden` cai pelos dois caminhos.

**O Corre Dino**
- `gravity`: a gravidade age NO AR, por trechos (`flight.base`): ligar ou desligar no meio recomeça o trecho
  da altura e da velocidade de agora, sem teletransporte. `floating` passa de `SALTO_SEM_VOLTA`.
- `impulse`: o pulo guarda a marca e o impulso anteriores (`flight.before`/`beforeForce`); `other-height` pede
  o impulso máximo numa das marcas e `DIFERENCA_DE_ALTURA` entre elas.
- `jump-sound`: abre com o impulso máximo (dois Espaços no mesmo pulo); `sound.beats` é a linha do tempo;
  `quiet-air`, `key-sound` e `tap-sound` são `soNoCaso`; a conclusão pede o som no pulo ligado (`settled`).
- `layers`: três metas em ordem (`front`, `covered`, `back-in-front`). ⚠️ `pilha: 'camadas'` (só nesta cena,
  PÚBLICA) apresenta a pilha como o painel Camadas do Pinta, que se lê AO CONTRÁRIO da lista de blocos do
  Estúdio: muda só o texto que fala da lista (faixa, pedidos, pistas via `LAYERS_CAMADAS` e
  `sceneHintsFor`, bancada); ações, metas e motor são os mesmos. Ausente = `blocos`.
- `spawn`: ligar o relógio guarda o trecho sem relógio (`crowd.untimedBorn`/`untimedSeconds`).
- `cleanup`: abre com `CACTOS_DA_LIMPEZA`; "na tela" é `sceneCactiOnScreen` (0 a 480) para faixa, retrato e
  palco; `invisible-stored` pede DOIS fora da tela ainda no grupo.
- `game-state`: `waiting` pede 2 s na tela de início com a peça dentro do Se e nenhum nascimento; mudar a
  peça limpa a pista.
- `controls`: o Enter fecha `start-key` com ou sem o fio do toque; o toque exige o fio.
- `restart`: o toque é `start {input: 'tap'}`, resolvido pela TELA e pela escolha do fim; tocar jogando não
  faz nada (no jogo é o pulo).
- `hitbox`: a área é dita em PORCENTAGEM, como no Estúdio (`sceneAreaPercent` sobre `HITBOX_DINO_SIZE`), e o
  motor guarda a largura. Abre em 130% com o cacto a 149; `contact` pede o vão visível
  (`HITBOX_VISIBLE_GAP`) e `area-contrast` pede DIMINUIR a área depois de `contact`.
- `score`: mudar a peça zera pontos, sobra e fileira.
- `random` e `acceleration`: ⚠️⚠️ o sorteio é DE VERDADE e viaja no gesto (`sample.unit`, o `Math.random()`
  do navegador); o motor só o transforma e o servidor refaz o mesmo mundo. Não têm ▶ geral: o tempo mora no
  gesto ("Passar 5 segundos"). Na `acceleration` a condição nasce ligada e IMPEDE diminuir, sem puxar a base
  de volta para −9; com a base já abaixo, a pista manda recomeçar.
- `velocity`: usa `SCENE_LIMITS.driveX`/`driveY` (a faixa fora da tela, com y negativo, onde a pedra do
  Desafio nasce); o quadro parado também conta passo e rastro.
- `variable`: guardar a primeira vez CRIA a caixa (guardar 0 vale); somar sem caixa é recusado com legenda.
- `lives`: `shoot` soma ponto e as vidas ficam; `lifeline.last` guarda a causa para o palco.

**O núcleo do Iniciante 2D** (réguas em `nucleo.ts`)
- `hold-vs-press`: UMA tecla (`hold`); o `press` é o "Apertar uma vez", que afunda e solta. Afundar leva as
  duas raquetes ao começo, e o caso não deixa a tecla segurada.
- `group-loop`: as distâncias vão e voltam com o relógio (`huntDistances`); `hunt.measured` é a foto de cada
  régua, e `nearest` compara a foto. `auto` é a troca do mais perto depois de `HUNT_LOOP_SEEN_TICKS` de laço
  ligado; `choose` com o laço ligado é recusado.
- `enemy-type`: a porta `copy` (copiar a ficha ao nascer); `all-change` no quadro seguinte à mudança, com dois
  antigos na tela; `copied` com um antigo no número velho e um novo no número novo. A pista cheia tira o mais
  antigo em vez de recusar (a recusa deixava `copied` impossível).
- `camera`: `window` pede a janela MUDAR de lugar com a câmera seguindo, depois de o Dino ter sumido; `follows`
  pede ligar a câmera com o Dino FORA. `CAMERA_WALK_MAX` é o fim do "Andar"; o motor aceita o mundo inteiro.
- `contact`: as duas regras ao mesmo tempo, uma pista cada; o encosto é distância 0 dos desenhos
  (`contactTouching`; o palco posiciona com `CONTACT_DRAWINGS`). Um "fim de jogo" recomeça as duas pistas.
- `cooldown`: os tiros VOAM; `burst` no terceiro tiro sem recarga em 1 s de relógio; `spaced` pede o vão à
  vista; o aperto recusado aparece por `COOLDOWN_REFUSED_SECONDS` e some. Recarga abaixo de 0,001 s acabou (a
  sobra binária recusava o tiro de quem esperou).
- `aim`: o tiro sai com "Atirar" e o acerto é conferido no TRECHO do quadro (`aimDistanceToPath`); sem legenda
  de quadro (dependeria da fatia do ▶). O acerto no disparo (alvo em cima do Dino) não fecha `follows`.
  `AIM_TARGET_MARGIN` é a folga da bancada; o motor aceita a tela inteira.
- `diagonal`: sem relógio; o gesto é `stride` ("Andar 1 segundo"). `faster` e `same` são comparações com os
  fantasmas; a distância vem dos componentes sem arredondar.
- `tilemap`: a marca é da CASA (`tilemapMark`, `#3:4`, com o formato travado por `TILEMAP_MARK`) e só as
  vivas contam; `coin-row` olha só a linha escrita (`isTilemapCoinRow`).

**O motor e a porta do 3D**
- `pool`: o cacto atravessa com um NÚMERO (`nursery.onScreen`); sem reciclagem cada saída fabrica o próximo,
  com reciclagem o mesmo número volta.
- `entity-state`: `brain-scope` guarda o estado em cada torre ou no jogo; no jogo, mudar uma muda as três
  (meta `shared`, a crença errada testável). `SCENE_ROLES` é vazio (são torres, não o elenco);
  `sceneBrainLabel` concorda com a TORRE ("parada", "mirando").
- `delta-time`: uma corrida até `DELTA_RACE.chegada`; `count` recomeça na largada.
- `circle-collision`: `encostam` compara `distance <= a + b` SEM arredondar (motor, palco e faixa fazem a mesma
  conta), e o relógio anda inteiros e só aproxima ATÉ a batida. Substituído (16/09/2026): comparar
  arredondando no milionésimo → sem arredondar, porque o relógio de quadro fixo deixa a distância inteira e a
  faixa dizia "ainda não" no instante da batida.
- `axis-z`: o y cresce para CIMA e o z NEGATIVO é o fundo (as convenções do Jogo 3D do Estúdio); a faixa pinta
  cada número com a cor do eixo (tom `leaf` no `SceneReading`).
- `camera-3d`: `facesAVista` é a régua ÚNICA das faces (motor e palco); nem faixa nem legenda contam cores,
  que é a tarefa da criança.
- `mesh`: `see-points` com `MESH_LEVELS`; `MESH_SKIN_LABELS` é como faixa, bancada e admin dizem os degraus
  (os ids não mudaram). `skin` pede a pele sobre pontos JÁ vistos (a revelação e a conclusão não caem no
  mesmo gesto).
- `pick-ray`: `PICK_BOXES` (a da frente é a menor); `scenePickPath(x, y)` devolve as caixas no caminho, da
  mais perto para a mais longe, e `scenePickLetter` dá a letra.

**O ateliê** (réguas em `atelie.ts`; o desenho é a nave do Pinta, e `SCENE_ROLES` fica vazio)
- `frames`: `paused-one` pede parar a prévia RÁPIDA depois de vê-la pulsar. ⚠️ `frame` com a prévia tocando
  no motor PARA a prévia e não conta meta nesse toque (o relógio do player para por fora: aba escondida, F5).
  `framesPreviewSlice(ritmo)` é a fatia do ▶ da prévia: um quadro da animação por fatia, mandado exato.
- `onion-skin`: o fantasma é o contorno TRACEJADO do fogo 1; as metas do `shift` pedem o quadro 2
  (`onionFireZone`).
- `symmetry`: os dois espelhos são DUAS chaves, como no Pinta (`MIRROR_MODES` com `xy`, `mirrorAxes`,
  `mirrorModeFor`, `mirrorCopyAxes`), sempre no MEIO do desenho; com as duas ligadas nenhuma meta cai. ⚠️⚠️ A cópia COLADA no traço não
  conta (`symmetryCopySeparated`): é o desenho da resposta errada. `mirror.strokes`/`copies` contam GESTOS,
  e é o que faixa e painel do professor mostram.
- `pixel-vector`: uma lupa para as duas pedras, e só o zoom conta (degraus em `LUPA`).
- `sheet-vs-sprite`: o jogo abre VAZIO (`sheet.loaded`) e em 54; `size-apart` pede o tamanho fora de
  `TAMANHO_PARECIDO`, depois de `crop-whole`. ⚠️ O `cut` é o "Quadro do recorte" da bancada (e o pulsar do
  fogo na parte 3 da demonstração): preso ao que cabe na largura de agora, ele carrega o jogo.
- `fill-stroke` e `shading`: os rótulos do Pinta; `shade` ligado com o sol já do outro lado também é `side`.

### Leitura do que está guardado, e deploy

- O retrato guardado passa pela hidratação antes do validador: `readExperimentSession`/
  `readDemonstrationSession` chamam `hydrateSceneState` (o GRUPO ausente recebe o padrão de fábrica; o grupo
  presente vale como veio, inteiro) e só então `isSceneState` confere campo a campo. É robustez contra
  retrato truncado, não ponte de versão. A cena vai gravada no pacote, e retrato de outra cena é recusado
  (as cenas dividem ids de meta).
- ⚠️⚠️ **Retrato incompleto é INVÁLIDO, e quem chama o trata como ausente** (17/09/2026): no members, a
  linha guardada que não hidrata vale como sessão inexistente — a cena recomeça limpa e a gravação nova
  substitui a linha. Antes ela virava 409 em toda gravação daquele bloco, para sempre.
- ⭐⭐ **A funcionalidade nasce na PRIMEIRA versão** (decisão da dona, 17/09/2026): nada de carimbo de versão
  das regras, flag de compatibilidade, tolerância a player anterior nem substituição de meta que saiu. Mudou
  uma regra? Muda para todo mundo.
- ⚠️⚠️ O pipeline NÃO garante a ordem dos serviços, e reimportar manifesto recomeça o progresso em andamento:
  a ordem (members ANTES de kids e community), a consulta ao banco e os manifestos estão em
  [`docs/aulas-interativas-legado/raio-x-implantacao.md`](../../docs/aulas-interativas-legado/raio-x-implantacao.md).

## Comandos (de dentro de `packages/core`)

| Comando | O quê |
|---|---|
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` / `check:fix` | Biome |

## Checklist antes de finalizar

`SectionCompletion.materialItems` seleciona IDs de arquivos de blocos `materials` explicitamente
incluídos em `blockIds`. O validador exige itens `file` existentes e o avaliador combina todos os
arquivos selecionados com outros critérios da seção, como 90% do vídeo. Progresso do download é
`answers.downloadedMaterialItemIds` na revisão corrente do bloco; o cliente não pode gravá-lo pelo
POST genérico de aprendizagem.

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Nada de framework nem de import de pacote de serviço/app entrou aqui.
- [ ] Subpath novo? Adicionou ao `exports` do `package.json`.
- [ ] Mudou contrato público? Ciente de que redeploya os consumidores (é dependência de todos).
