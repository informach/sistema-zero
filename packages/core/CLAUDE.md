# CLAUDE.md — @sistemazero/core

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/API que encostar aqui — não confie só na
> memória. Para pesquisa e padrões, use o **MCP do Octocode**.

Guia operacional deste package. Leia antes de editar.

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
| `/learning/scene` | as **45** cenas de aula: ações, catálogo, motor, avaliação, **elenco** (`cast`: nomes E figura, `actorFigure`/`sceneWorld`), **caso e missão** (`setup`) e o que a cena diz de si (`readout`). ⚠️ Cena nova entra em `SCENE_IDS` + `PORTS` + `SCENE_MODELS` + `leituras`/`situacao` (readout) + `SCENE_ROLES` (cast) + o palco do member-shell; o TS reprova o que faltar, menos o palco | `actions` · `catalog` · `engine` · `evaluate` · `cast` · `readout` · `state` · `session` |
| `/creations` | contratos puros de identidade/armazenamento compartilhados por apps e serviços | `object-deletion` · `pinta-palette-library` · `storage-keys` |

## O núcleo do Iniciante 2D: 11 cenas novas — 15/09/2026

As 24 primeiras nasceram para o **Corre, Dino!**, que é o curso 1 da trilha. Estas cobrem os
degraus da escada que os outros sete cursos do nível 1 pedem — e que voltam nos níveis 2 e 3,
vestidos com outro elenco: `velocity` (a posição é somada em cada quadro), `hold-vs-press`
(evento × estado), `variable` (guardar, mudar e mostrar), `group-loop` (o laço que escolhe o
alvo), `enemy-type` (a ficha que todos leem), `camera` (a tela é uma janela), `contact` (a
pergunta contínua × o acontecimento), `cooldown` (o relógio que faz esperar), `aim` (a seta até
o alvo), `diagonal` (dois passos no tempo de um) e `tilemap` (o desenho nasce das letras).

⚠️ Palco e bancada vivem em `member-shell/components/scene-core-{stages,controls}.tsx` (a `velocity` e
a `variable`) e `scene-nucleo-{stages,controls}.tsx` (as outras nove, desde o lote 5 do Raio-X) — o TS
não reprova a falta deles, e uma cena sem palco chega à criança como uma caixa vazia.

## O motor, o 3D e o ateliê: 10 cenas novas — 15/09/2026

As 35 anteriores moram todas numa tela 2D. Estas dez fecham os degraus que a trilha ainda não
tinha e que começam no curso 9: `pool` (o contador que só sobe é o vazamento), `entity-state`
(cada personagem com o próprio cérebro), `delta-time` (contar quadros × contar tempo),
`circle-collision` (a batida é a conta, não o desenho), `axis-z` (o eixo que faltava — e aqui o
**y cresce para CIMA**), `camera-3d` (o que se vê depende de onde a câmera está), `mesh` (os
pontos ligados por baixo da roupa), `pick-ray` (a reta que para na primeira coisa), `fill-stroke`
(o miolo e o contorno são dois desenhos) e `shading` (duas cores da mesma cor dão volume).

⚠️ **O 3D é DESENHADO, não renderizado** (`member-shell/components/scene-engine-stages.tsx`):
uma projeção isométrica à mão em SVG. Puxar uma biblioteca 3D para o player de aula custaria o
peso dela em toda cena, e o que estas quatro precisam mostrar cabe num cubo e numa sombra.

⚠️ **A régua das faces do cubo é UMA só, `facesAVista`, no motor.** Até o lote 2 do Raio-X
(16/09/2026) havia uma segunda cópia (`faces`) no `readout`, para a faixa escrever "cores à
vista". A leitura saiu (contar as cores é a TAREFA da cena, e a faixa dava a conta pronta embaixo
da previsão), e a cópia saiu junto. Pelo mesmo motivo o caption do `orbit` ficou vazio: a frase
cai na situação, que diz onde a câmera está e não quantas cores ela vê.

⚠️⚠️ **A régua que os reviews mais pegam: a meta só cai quando a criança VIU o que a meta
afirma.** Meta que cai pelo estado inicial, por acidente, ou por metade do gesto é o defeito
mais grave possível nestas cenas — ela ensina que descobrir é apertar qualquer coisa. Os casos
que já apareceram, todos travados por teste:

| Cena | Caía por | Hoje pede |
| --- | --- | --- |
| `entity-state` | contar a diversidade DEPOIS da mudança (um toque fechava duas metas) | os três em estados distintos, e a independência só com diversidade ANTES |
| `pick-ray` | as três caixas eram DISJUNTAS: "parou na primeira" caía sem nada atrás | a faixa em que a da frente cobre a de trás |
| `camera-3d` | a cena ABRE com duas cores à vista, e `recenter` era incondicional | ter GIRADO, e ter SAÍDO da vista de sempre |
| `shading` | a forma nasce chapada: desligar a sombra de saída era um no-op | ter ligado a sombra antes de tirá-la |
| `circle-collision` | "afastar de novo", que o relógio (que só aproxima) nunca permite | o mesmo lugar TROCAR de resultado com a distância parada |
| `pool` | ligar a reciclagem de saída fechava "parou de crescer" | ter visto o contador crescer (`grows`) |
| `contact` | "afastar e voltar" caía no afastar, e depois em TROCAR a pergunta (o `mode` zera o `touching`) | a segunda batida **e** um passo com os dois longe (`hit.away`) |
| `variable` | a caixa nasce fora da tela e com zero: o 1º "somar" e o 1º "mostrar" fechavam meta | ter guardado um número antes |
| `velocity` | a cena nasce com velocidade ZERO: o 1º "Um passo" fechava "com zero ele fica parado" | ter visto o relógio mover alguma coisa |
| `delta-time` | trocar para segundos de saída fechava "chegaram juntas" | ter visto as duas se afastarem |
| `tilemap` | contava TROCAS: três letras diferentes fechavam "a MESMA letra" | a mesma letra em dois lugares |
| `draw-loop` | limpar SEM desenhar fechava "a tela congela" (e a tela mostrava o Dino) | a tela sai VAZIA (`render.empty`); `frozen` só com a limpeza desligada e algo desenhado |
| `velocity` (`down`/`up`) | metas novas, com o y no batente o sinal está certo e nada anda | o personagem ter andado mais de meio pixel NAQUELE sentido |
| `velocity` (as quatro de sentido) | medidas POR FATIA: com ±1 no ▶ nunca passavam de meio pixel | o caminho desde a âncora (onde a velocidade foi escolhida) |
| `spawn` (`every-frame`) | um "Um passo" com 6 cactos num tufo que ninguém conta | 1 s de relógio e 20 cactos |
| `axis-z` | com um caso que abre no ar, mexer só no x fechava "a sombra diz onde ele está" | ter mexido na ALTURA |
| `enemy-type` / `aim` | o deslizante no batente reenvia o MESMO valor, e a meta caía nele | o valor mudar de verdade |
| `circle-collision` | o relógio só APROXIMA: passados ~6s a meta da conta ficava impossível | a distância virou controle (`approach` vale nas duas cenas de distância) |
| `contact` (`drain`) | três CHAMADAS de `advance`: três fatias do ▶ (0,12 s) derrubavam "em todo quadro" | três QUADROS da cena (0,75 s a 4 por segundo) |
| `pool` (`grows`/`steady`) | um corpo por chamada: o ▶ criava ~25 por segundo e "parou" caía em 0,2 s | um corpo por segundo; "parou" pede 4 s com a reciclagem ligada |
| todas as de tempo | um quadro por chamada: o mesmo gesto dava números diferentes no ▶, no passo e no roteiro | o relógio de quadro fixo (`SCENE_FRAME_RATE`): o quadro só fecha quando o tempo dele PASSOU, nunca adiantado |
| `score` (`score-start`/`score-end`), `pool` (`steady`/`recycled`) | a sobra de ANTES do gesto atravessava: o quadro de 1 s que fechava 0,04 s depois de bater rodava inteiro no estado novo, e "o placar ficou parado" caía 0,05 s depois | nas cenas de quadro longo o gesto (e o `undo`) RECOMEÇA o quadro: 1 s inteiro a partir do gesto (`sceneLongFrame`) |

⚠️⚠️ **O CASO não pré-semeia a memória do gesto** (`esquecerOGesto`, no `openScene`). Zerar a
evidência não bastava: vários grupos guardam "o que já foi feito" — o fantasma da posição
anterior, os x já visitados, quantos tiros saíram, de que lados a luz já veio — e esses campos
alimentam metas e desenhos. Um caso que levava a nave para (300, 40) deixava o fantasma no mundo
de fábrica, e a cena abria com o rastro de um lugar onde a criança nunca esteve. O mundo é do
professor; a história é da criança, e ela começa vazia.

⚠️⚠️ **E a lista é de TODOS os contadores, não dos que doeram.** Ela cresceu em duas rodadas de
review: a primeira versão cobria 16 grupos e deixou de fora os que alimentam metas de repetição
(`view.wasLost`, `speed.samples`, `sheet.cuts`, `mirror.painted`, `animation.swaps`,
`weapon.shots`, `hit.damage`, `blueprint.edits`, `render.trail`, `sound.count`, `lifeline.hits`,
`crowd.born`, `nursery.created`) — um caso com um sorteio entregava "dois lugares de nascimento"
no primeiro gesto da criança; a segunda fechou `walkPad.best`, `input.pressX/holdX`,
`sight.shotX/Y` e `description.heard`. **Campo novo que CONTA gesto entra nessa função no mesmo
commit.**

⚠️⚠️ **E o que é DERIVADO de população vai junto com ela.** Zerar `crowd.born`/`removed` sem os
cactos fazia `outside = born − removed − vivos` virar NEGATIVO, e a cena `cleanup` — que existe
para a criança comparar "na tela" com "nos bastidores" — abria com os dois números se
desmentindo. Hoje os contadores são recalculados a partir dos cactos que sobraram.

⚠️⚠️ **Lista que o motor empilha precisa de CORTE no motor, não só de teto no validador.** O
`grid.written` era a única sem, e na 25ª casa trocada o retrato passava a ser recusado pelo
próprio leitor: a criança lia "esta descoberta mudou, recomece" no meio de um mapa de 60 casas
que a pista manda pintar. Hoje ele guarda a LETRA (são três), e as irmãs cortam em 24.

⚠️ **Missão VAZIA reprova** (`evaluateExperimentation`). O filtro por `targets` cruza a lista do
caso com as metas do modelo; uma meta renomeada no catálogo esvaziaria essa lista em todo
manifesto que a cita, e a atividade passaria com evidência ZERO, em silêncio.

⚠️⚠️ **Lista que o motor empilha precisa de CORTE no motor, não só de teto no validador.** O
`grid.written` era a única sem, e na 25ª casa trocada o retrato passava a ser recusado pelo
próprio leitor: a criança lia "esta descoberta mudou, recomece" no meio de um mapa de 60 casas
que a pista manda pintar. Hoje ele guarda a LETRA (são três), e as irmãs cortam em 24.

⚠️ **Missão VAZIA reprova** (`evaluateExperimentation`). O filtro por `targets` cruza a lista do
caso com as metas do modelo; uma meta renomeada no catálogo esvaziaria essa lista em todo
manifesto que a cita, e a atividade passaria com evidência ZERO, em silêncio.

⚠️ **Campo novo num grupo que já existe é seguro** desde 15/09/2026: o `hydrateSceneState`
completa CAMPO a campo, não só grupo a grupo. Antes, um retrato guardado antes do campo era
recusado inteiro pelo validador — e a sessão da criança voltava ao começo sem ninguém saber por
quê.

⚠️ **A demonstração com `setup` confere o roteiro do MODELO** (`isDemonstrationActivity`). O
`playsOut` só olhava o roteiro AUTORAL, então uma demonstração com caso escapava inteira: um caso
que já liga a reciclagem faz o `waitFor: 'grows'` do `pool` nunca chegar, com a fala narrando
"sem reciclagem, cada passo cria mais um corpo" sobre a tela contrária.

## O CASO da atividade (`setup`) — 15/09/2026

⭐⭐ **É a peça que faz um modelo render mais de um uso.** Até aqui uma cena tinha uma missão só —
as metas eram as do catálogo, iguais para todo mundo — e a biblioteca rendia um uso por cena. O
elenco trocou QUEM está no palco; o `setup` troca DE ONDE ele parte (`actions`) e O QUE conta como
descoberta (`goals`), que é como uma mesma mecânica serve dezenas de exercícios no Brilliant.

- **`openScene(start)` (engine) é a abertura de verdade**; `initialScene` continua sendo o mundo de
  fábrica. ⚠️ A evidência é ZERADA depois das ações do caso: elas passam pelo motor (é o que
  garante que o caso seja um estado alcançável), e o motor registra descobertas pelo caminho — sem
  o zeramento a criança abriria a cena com metas já fechadas. Toda abertura de sessão passa por
  `openScene`, inclusive o `reset` (recomeçar volta ao CASO, não ao mundo de fábrica).
- ⚠️ `reset` e `hint` são recusados DENTRO do caso (`isSceneSetup`): o primeiro voltaria para o
  próprio caso em laço, o segundo é gesto de quem travou.
- `goals` só vale na experimentação — a demonstração não cobra meta nenhuma, e campo sem efeito é
  armadilha para quem autora. `sceneTargets(activity)` é a fonte única de "o que esta atividade
  cobra"; `evaluateExperimentation` e `sceneGoals` a recebem, e `settled` também (uma missão que
  não cobra "Dino na frente" não pode travar quem deixou a montagem no outro arranjo).
- ⚠️ `setup` é PÚBLICO (`PUBLIC_ACTIVITY_FIELDS`): sem ele no navegador a criança abriria o mundo
  de fábrica enquanto o servidor avalia o caso do professor — duas cenas com o mesmo nome.

⚠️ **Errar e não ter respondido dão recados DIFERENTES** (`withAttachedQuestion`). Davam o
mesmo, e quem tinha escolhido a frase errada lia "agora escolha a frase que explica" — a descrição
de um estado em que ela não estava, e sem nenhum sinal de que errou. O gabarito continua sem sair
do servidor: o recado diz que não é essa, nunca qual é.

⭐ **A cena voltou a aceitar pergunta anexa** (`block.checkpoint`). A proibição existia porque a
sessão da cena morava em `answers.checkpoint`; hoje ela mora em `answers.sceneCheckpoint` e a
colisão acabou. É o TERCEIRO tempo do ciclo — mexer, prever, e enunciar a regra. ⚠️ Enquanto a
cena não fecha, a pergunta NÃO reprova: o feedback continua sendo o da cena, que diz o que fazer.

⭐ **A primeira pista cita o estado** (`sceneHint` nível 1 = `sceneSituation` + o degrau do
modelo). Do segundo degrau em diante, só a escada.

⭐ **A demonstração tem duas apresentações** (`presentation`): `guided` (etapas à vista) e
`inline` — o roteiro inteiro com um ▶ e nada mais, o degrau que faltava entre o parágrafo e a
bancada. O motor é o mesmo; muda só o que o player desenha em volta.

⚠️ **Concordância predicativa no elenco** (`cast.ts`): o adjetivo depois de um verbo de ligação
("o Dino está escondido", "foi criado", "está vivo") também concorda com o personagem. Sem isso um
elenco feminino lia "A nave está escondido" — e essa é a PRIMEIRA pista da cena `layers`.

⚠️⚠️ **E texto que o elenco veste NÃO usa pronome de terceira pessoa** (achado do full review de
15/09/2026). A régua flexiona o que está COLADO ao nome e nada mais, então um `ele`/`dele`/`nele`
duas orações adiante fica para trás e a frase sai meio trocada — que é como a criança percebe que
ninguém escreveu aquilo para ela. Eram NOVE, em três camadas: as perguntas novas (`lives`, e a Aula
4 do Desafio usa `lives` com elenco de nave HOJE), o catálogo (`gravity`, `cleanup`, `acceleration`,
`enemy-type`, `camera`) e o próprio MOTOR (duas legendas de `camera`). A regra é ABSOLUTA de
propósito: decidir o referente de um pronome não é coisa que varredura faça, e repetir o nome custa
nada e é mais claro para quem tem 9 anos. Ela só alcança o texto que o elenco REALMENTE veste
(`castText(t) !== t`). Travada em `cast.test.ts`, sobre catálogo, perguntas e legendas do motor.

## A previsão e a pergunta viraram propriedade DA CENA — 15/09/2026 (lote 4)

⭐⭐ **`SCENE_QUESTIONS` (`scene/questions.ts`): a previsão e a explicação das 45 cenas, escritas
uma vez.** Nós construímos os dois padrões mais fortes do estudo do Brilliant como campos
OPCIONAIS do bloco e medimos o resultado: de **52 blocos de cena** nos cursos, **7** tinham
previsão e **8** tinham pergunta. 13% e 15%. Recurso que depende de alguém lembrar não é recurso,
é intenção — e a raiz não era a autoria, era o PADRÃO: a pergunta certa para uma cena é
propriedade da cena, não do bloco. "O que acontece com a velocidade em zero" é a mesma pergunta
em toda aula que usa `velocity`, vestida com outro elenco.

- **`blockPrediction(block)` e `blockCheckpoint(block)`** (em `learning/index.ts`) são os
  RESOLVEDORES, e são a única porta: o campo do bloco vence; sem ele, vale o do modelo, já
  vestido pelo `castText`. `publicInteractiveBlock` e `withAttachedQuestion` passam pelos dois.
  ⚠⚠ Ler `block.checkpoint` cru para uma CENA é voltar aos 15%. (As duas leituras cruas que
  sobraram no `evaluateLearning` são dos tipos `question` e `html`, que não têm padrão nenhum:
  ali o resolvedor devolveria exatamente o mesmo campo.)
- ⚠⚠ **A pergunta padrão vale só na EXPERIMENTAÇÃO.** Na demonstração a criança ASSISTIU, e
  cobrar dela a regra depois de um roteiro que ela não conduziu é cobrar um gesto que a tela não
  ofereceu. A previsão, essa vale nas duas: apostar antes de ver é de graça.
- ⚠⚠ **Menos na demonstração `inline`** (achado do full review). A previsão TRAVA o palco até a
  criança escolher, e a `inline` existe para ser "um ▶ e nada mais, no meio de uma explicação" — o
  degrau entre o parágrafo e a bancada. Herdar o padrão punha uma pergunta de duas opções e um
  portão em frente a um botão de dois segundos, no formato desenhado para não ter nenhum. São duas
  reais hoje (`shading` e `fill-stroke`, no Jogo do Meu Jeito). Quem ESCREVE a previsão no bloco
  continua mandando: o que sai é o padrão, não a possibilidade.
- ⚠ **A previsão continua sem nota** e a explicação dá a palavra final sobre a conclusão do
  bloco. É por isso que a experimentação passou a exigir a frase escolhida para fechar: o
  terceiro tempo do ciclo deixou de ser enfeite.
- ⚠ **`Record<SceneId, SceneQuestions>`**: o TS reprova a cena nova que chegar sem as duas.
- ⚠ A opção errada é sempre uma crença ingênua PLAUSÍVEL, nunca um espantalho — alternativa
  obviamente boba transforma a pergunta em clique, o oposto do que ela existe para fazer.

⚠⚠ **A frase da cena concorda em NÚMERO** (`quantos`, em `scene/cast.ts`). Ela dizia
"1 vidas e 1 pontos", "1 saltos e 1 sons", "1 cactos nos bastidores" — sempre no PRIMEIRO
acontecimento da cena, que é quando a criança está lendo com mais atenção. As duas formas ficam
à vista na chamada porque quem veste o texto é o ELENCO, e a régua só flexiona o que está colado
ao nome.

⚠⚠ **Ele mora no `cast.ts`, e não no `readout.ts`, porque quem escreve essas frases são DOIS.**
O full review achou mais duas, em superfícies que a primeira varredura não alcançava: a FAIXA de
estado abria `pixel-vector` com "lupa **1 vezes**", e o `caption` do MOTOR dizia "Desenhou de novo
sem limpar: **1 Dinos** na tela" no `draw-loop` — e o teste antigo apagava o caption (`caption:
''`) justamente para isolar a situação. Hoje a varredura do `readout.test.ts` cobre a faixa, a
situação E o caption, em TODO passo do roteiro de cada modelo, e não só nas duas pontas: contador
chega a UM no meio do caminho e volta a passar de um depois.

## Raio-X, lote 1: as cenas que travavam ou mentiam — 16/09/2026

Consertos curtos, na direção do redesenho do lote 5 (relatórios em
`packages/community-kids/tmp/storyboard/analise/`, plano em `.../implementacao/PLANO.md`).

- ⚠️⚠️ **A demonstração consome o `advance` INTEIRO** (`stepDemonstration`). O `waitFor` encerrava
  a etapa na primeira fatia em que a descoberta acontecia, e o player toca em fatias de ~0,05 s:
  "avance 1 s" virava 2,5 px de movimento. O `waitFor` segue sendo a promessa que o `playsOut`
  confere; ele só não encurta mais o tempo. `session.test.ts` toca os 45 roteiros em fatias de
  0,04 / 0,05 / 1/30 / 0,1 e exige cada `waitFor` no fim da etapa — foi essa varredura que achou
  a `circle-collision` parando em 60,0000001 contra 60 (a distância agora é arredondada no motor).
- **`draw-loop`: `render.empty`** (campo novo, hidratado). Limpar sem desenhar deixa a tela vazia,
  e **`drawLoopOnScreen(state)`** (readout, exportada) é a régua ÚNICA de quantos Dinos a tela
  mostra: `empty ? 0 : max(1, trail)`. O palco do member-shell deve ler a mesma função.
- **`sceneCactiOnScreen(crowd)`** (state): "na tela" é `0 ≤ x ≤ 480`, para a faixa da `cleanup`, o
  retrato das descobertas e o palco. Os que saíram continuam só nos "guardados".
- **O `liga()` do readout exige o GÊNERO do rótulo**; `readout.test.ts` trava a tabela dos rótulos
  com chave, nas duas posições.
- **`controls`: o Enter fecha `start-key` com ou sem o fio do toque** (sempre que a tela sai do
  Início por ele). O toque segue exigindo o fio.
- **`screen-reader`: `sceneDescriptionSays(texto)`** (engine, exportada) reconhece objetivo e
  controle por RADICAL, sem acento e sem maiúscula. ⚠️ "espaço" e "foge" são EXATAS (os radicais
  casariam "espaçonave" e "fogo") e a letra "a" não conta como tecla (é artigo).
- **`velocity`: metas `down` e `up`** (o Dia 2 do Desafio cobrava `left` pedindo para baixo), e a
  fala diz "subiu"/"desceu" pelo número, sem pronome.
- ⚠️ **Um caso não abre com um salto que não saiu do chão** (`openScene`): `setup: [jump]` deixava
  o salto iniciado e parado, e o primeiro toque respondia "O Dino já está no ar". O caso continua
  ACEITO (há conteúdo publicado); o motor o abre coerente. Salto + relógio segue abrindo no ar.
- **`evaluateExperimentation` veste a frase de sucesso com o elenco.**

### Consertos do review do lote 1 (16/09/2026)

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote1-consertos.md`.

- ⚠️⚠️ **A sobra do `advance` nunca se perde** (`stepDemonstration`): se o que resta depois do
  tique não chega a 0,001 s, ele é consumido INTEIRO agora. O player acumula quadros de ~0,04 s com
  tremida, e a sobra descartada fazia a `circle-collision` parar em 60,0016 contra 60 em ~9 de cada
  10 execuções. `session.test.ts` toca os 45 roteiros com o relógio REAL do player (quadros com
  tremida, semente fixa): fatias exatas não pegam o defeito.
- ⚠️⚠️ **`tolerarPlayerAnterior`** (`DemonstrationReplayOptions`, só o members passa): o servidor
  aceita o `next` e marca `viewed` quando a etapa está na ÚLTIMA ação, ela é `advance` e o
  `waitFor` já caiu — o que o player de antes do lote 1 chamava de "pronta". Sem isto, aba aberta
  durante o deploy nunca registrava a demonstração. ⚠️ O caminho INVERSO não tem conserto: player
  novo contra servidor velho quebra ~9% das demonstrações (a sobra muda o fim da ação), então o
  **members sobe ANTES do kids** neste deploy.
- **`circle-collision`**: a distância fica CRUA e a comparação (`encostam`) arredonda no
  milionésimo. Arredondar a cada fatia acumulava erro.
- ⚠️⚠️ **`drive.anchorX/anchorY`**: onde o personagem estava quando a velocidade ATUAL foi
  escolhida. As metas `moves`/`left`/`down`/`up` e a frase "foi de A para B" medem desde ela, e não
  por fatia (com ±1 no ▶ as quatro metas eram impossíveis). Gravada na ação `velocity` e no
  `esquecerOGesto`; ⚠️ o `hydrateSceneState` a completa com o `x`/`y` do PRÓPRIO retrato, nunca com o
  padrão de fábrica (senão um retrato antigo em x 200 afirmaria 140 px de caminho).
- ⚠️⚠️ **`SceneGoal.soNoCaso`**: meta que só vale marcada num caso (`down` e `up` da `velocity`).
  `sceneDefaultGoalIds` é a missão de FÁBRICA e é o que `sceneTargets`/`sceneGoals` usam sem caso;
  `sceneGoalIds` continua sendo a lista inteira (caso e `waitFor` são conferidos contra ela).
- **`SceneGoal.pedido`**: o "Ainda falta" (`feedback` do avaliador) diz o GESTO quando o rótulo
  entregaria o resultado ("Velocidade negativa levou para cima" é a resposta do palpite).
- **`decimal` e `numero` moram no `cast.ts`**, como o `quantos`: vírgula no decimal e o sinal de
  menos do conteúdo (U+2212). Motor, leitor e a `Medida` do member-shell escrevem número na tela.
- **`spawn`**: `every-frame` só com 1 s de relógio e 20 cactos (a parede à vista).
- O segundo toque com o salto começado e parado diz "O salto já começou. Deixe o tempo passar para
  ver o Dino subir." ("já está no ar" só com o Dino no ar).

## Raio-X, lote 2: a moldura do player — 16/09/2026

- ⚠️⚠️ **A PREVISÃO é pública inteira** (`PublicInteractiveBlock.prediction: LearningPrediction`):
  `correctChoiceId`, `revealOn` e o `shows` de cada escolha atravessam a projeção, copiados campo a
  campo. Ela não vale nota, e o player precisa deles para retomar o palpite. O gabarito da PERGUNTA
  (`checkpoint`) continua podado. `blockPrediction` leva `revealOn` e veste o `shows` com o elenco.
- `isInteractiveBlock` recusa `revealOn` que não é meta DA cena (ou fora de cena) e `shows` que não é
  texto. ⚠️⚠️ **Só na AUTORIA** (consertos do review do lote 2): o `isPublicInteractiveBlock` roda no
  NAVEGADOR, contra o catálogo do navegador, e descarta o `revealOn` antes de delegar. Com o members um
  deploy à frente (uma meta nova), a atividade inteira virava "precisa de uma configuração válida";
  uma meta que o player não conhece só nunca cai, e o palpite volta na conclusão.
- **`PERGUNTA_MUDOU`** (consertos do review do lote 2): no `withAttachedQuestion`, uma resposta que não
  é NENHUMA opção da pergunta de agora (aba aberta antes de a pergunta trocar de ids) devolve "Esta
  pergunta mudou. Abra a aula de novo." em vez de "Ainda não é essa". O player reconhece a frase e
  oferece "Abrir de novo". Teste: `tests/learning-player-consertos.test.ts`.
- **`sceneEmitsSound(scene)`** (`session.ts`): a régua do "Ligar som" (porta `sound` legal na cena).
  `session.test.ts` a amarra ao MOTOR (cena que diz não nunca emite `sound`, e a que diz sim emite).
- Textos: a resposta errada virou "Ainda não é essa. Olhe a cena de novo e tente outra." e a não
  respondida "Última parte: escolha a frase que explica o que aconteceu."; `evaluateDemonstration` diz
  "Você viu tudo!" / "Veja todas as partes até o fim.".

## Raio-X, lote 2: o conteúdo das 45 cenas — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote2-conteudo.md`.

- ⚠️⚠️ **`SceneGoal.pedido` é OBRIGATÓRIO** (era opcional no lote 1). É o gesto que a meta pede,
  com o nome do botão da bancada de HOJE, e é o que o "Conferir" do player responde no lugar do
  `label` (que é a conclusão). Três regras: nunca o resultado da meta, nunca o resultado de OUTRA
  meta da cena, e sobreviver ao elenco (`cast.test.ts` varre o `pedido` na concordância e no
  pronome).
- ⚠️⚠️ **Toda previsão do modelo tem `revealOn`** (a meta que responde a pergunta; o player
  retoma o palpite quando ela cai) **e `shows` em toda opção ERRADA** (o que olhar na cena para
  ver que não é aquilo; a certa e as da explicação não levam). `questions-order.test.ts` trava as
  duas coisas no modelo E nos blocos de cena dos manifestos v6.
- ⚠️⚠️ **A certa deixou de ser quase sempre a primeira.** Era em 86 de 90 perguntas, e a criança
  aprende a clicar em cima. Hoje são 44 de 90, sem alternância rígida (o teste reprova acima de
  60%, abaixo de 40% e a troca a cada pergunta). Pergunta nova: olhe o total antes de escolher.
- ⚠️ Opção errada é o ERRO TÍPICO, nunca espantalho: a lista de trocas por cena está no relatório.
  Ids de escolha mudaram onde o SENTIDO mudou (resposta antiga guardada com o id velho não casa).
- ⚠️⚠️ **UM NARRADOR POR COISA** (`sceneSituation`): a frase descreve o ESTADO do palco e nunca a
  regra; na abertura, sem gesto, diz o que está na tela sem o resultado. A regra fica para o
  `success` e a explicação. O mesmo vale para a faixa (`sceneReadout`): nada de "escadinha/lisa"
  na `pixel-vector`, "cores à vista" na `camera-3d` ou "(para cima)" no eixo antes de a criança
  ver. `ONDE` (a tela da partida) e `liga(on, gênero)` são as réguas comuns.
- ⚠️ A situação é o 1º degrau da pista (`sceneHint`): mudou a frase, confira a pista nível 1 com
  elenco de nave.
- ⚠️ **O caption do MOTOR vem na frente da situação**, então ele também é narrador. Quatro foram
  consertados neste lote: `camera-3d` (contava as cores; hoje fica vazio), `diagonal` ("ele andou
  84.85": pronome e ponto decimal), `cooldown` ("faltam 1 s"; `faltam()` põe singular abaixo de 2)
  e `hold-vs-press` ("vez(es)"). Os
  captions que ainda diziam a regra depois do gesto saíram nos consertos do review (abaixo).

### Consertos do review do lote 2, conteúdo (16/09/2026)

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote2-consertos-conteudo.md`.

- ⚠️⚠️ **O caption vive UM passo** (`stepScene`): ele é zerado no começo de todo passo que não é
  `hint`. Antes ele ficava na tela até outro gesto escrever por cima, e a frase de situação (que
  segue o estado) perdia para uma legenda velha: "As áreas encostaram: batida!" continuava lá com
  os dois já separados. Gesto sem acontecimento próprio deixa o caption vazio, e quem fala é a
  situação. ⚠️ Não reintroduzir caption "de estado" (que só repete a situação) nem caption que
  diga a REGRA: mais de 30 saíram por um dos dois motivos.
- ⚠️⚠️ **`observe()` não escreve mais o `label` da meta no caption** (`state.ts`). O `label` é a
  CONCLUSÃO, e ele aparecia no palco no instante em que a meta caía, em cima da previsão que ela
  responde. A meta continua registrada; quem comemora é o player.
- ⚠️⚠️ **`pedidos-no-motor.test.ts`: o pedido é conferido RODANDO O MOTOR.** Para cada meta das
  45 cenas há uma sequência de gestos que faz LITERALMENTE o que o `pedido` diz (com o ▶ em fatias
  de 0,05 s), e o teste exige: (a) o texto da tabela igual ao do catálogo, (b) a meta cair pelo
  pedido isolado, (c) o "Conferir" em cadeia (ordem do catálogo filtrada pelos `targets`) fechar a
  cena inteira, inclusive nos casos dos manifestos v6, e (d) a meta do `revealOn` de toda previsão
  MOSTRAR a resposta no palco antes de cair. Pedido novo ou reescrito entra na tabela `CENAS` no
  mesmo commit. As exceções de (d) são sete e estão comentadas na lista `revelaNaConclusao`.
- **Pedido não diz "avance o relógio"** (nem depende do nome do botão "Um passo", que o lote 4
  renomeia): diz "deixe o tempo passar" ou cita o ▶. Única exceção: `acceleration`, cuja bancada tem
  o botão "Avançar o relógio".
- **Metas que caíam sem a criança ver** (a régua da tabela acima): `enemy-type` `all-change` só
  mudando a VELOCIDADE (é o número embaixo de cada cacto; a vida não aparece); `entity-state`
  `independent` só depois de o relógio andar; `pool` `recycled` só do segundo corpo em diante;
  `impulse` `other-height` só com um dos saltos no impulso máximo (é o que a previsão pergunta).
  E duas que NÃO caíam quando deviam: `onion-skin` `ghost-on` agora cai também ao ir para o quadro
  2 com o fantasma já ligado, e o `cooldown` zera a sobra binária da recarga (1,1e−16 recusava o
  tiro de quem esperou a barra inteira).
- **`sceneBrainLabel(estado)`** (engine, exportada): o estado do `entity-state` no GERÚNDIO
  ("mirando", "atirando", "recarregando"). Motor, faixa, palco e bancada leem a mesma função.
- ⚠️ **Ids de escolha novos onde o sentido mudou**: `impulse` (`mais-150`/`uns-100`), `game-state`
  (`so-depois`/`ja-nascem`), explicação da `pixel-vector` (`menores`), previsões de `random`,
  `tilemap` e `pool` (`tres`). O `shows` de toda opção está no PASSADO ("o y ficou maior").
- `questions-order.test.ts` mede também os TRECHOS: alternância perfeita até 4 e o mesmo lado até
  3, no catálogo e na ordem REAL de cada curso (pelos resolvedores), e previsão × explicação da
  mesma cena em lados opostos entre 40% e 60%.

## Raio-X, lote 3: o desenho veste o elenco — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote3.md`. O elenco trocava só os
NOMES: o Desafio mostrava "nave" num dinossauro na grama, e O Jogo do Meu Jeito, "pedra" e "chama"
sobre um Dino e três árvores. Agora ele troca o DESENHO também (`cast.ts`):

- **`SCENE_FIGURES`** (lista fechada: `dino`, `cacto`, `floresta`, `nave`, `asteroide`, `pedra`,
  `tiro`, `chama`) e **`SceneActor.figure?`**. `isSceneActor` recusa figura fora da lista. ⚠️ Figura
  nova entra aqui E ganha desenho no `scene-figures.tsx` do member-shell (o `Record` de lá reprova a
  falta), no TypeBox do members (`SceneActorSchema`, derivado da lista) e no rótulo do editor do
  admin (`NOME_DA_FIGURA`, também um `Record`).
- **`actorFigure(cast, papel)`**: a figura declarada; senão a que o NOME pede (`figureFromName`:
  minúsculas, sem acento, sem o "s"/"es" do plural, nome inteiro e depois palavra a palavra, com
  sinônimos curtos: dinossauro, foguete, meteoro/meteorito, rocha, laser/bala/disparo, fogo,
  árvore/mata); senão a de fábrica do papel (Dino, cacto, floresta). ⚠️⚠️ Derivar do nome é o que
  faz os manifestos JÁ publicados (nenhum declara `figure`) ganharem o desenho certo sem
  reimportação. ⚠️ A tabela de nomes é um `Map`: num objeto literal, "constructor" (nome válido de
  elenco) devolvia uma função do protótipo no lugar da figura.
- **`sceneWorld(cast)`** → `SceneWorldKind` (`'terra' | 'espaco'`): espaço quando alguma figura do
  elenco é nave, asteroide, tiro, pedra ou chama. ⚠️ O tipo não se chama `SceneWorld` porque esse
  nome já é o grupo `world` do estado (criado/desenhado).
- Testes em `cast.test.ts` (nome, plural, acento, sinônimo, figura declarada, mundo e guard). A
  varredura do DESENHO (45 cenas × elencos dos manifestos) mora no consumidor:
  `member-shell/tests/scene-figures.test.tsx`.

### Consertos do review do lote 3 (16/09/2026)

Relatório: `packages/community-kids/tmp/storyboard/implementacao/consertos-lote3.md`. ⚠️ **Revoga**,
acima, `sceneWorld(cast)` com um argumento e "bala" entre os sinônimos.
- ⭐⭐ **`SCENE_ROLES: Record<SceneId, SceneRole[]>`**: os papéis que o PALCO de cada cena desenha (33
  cenas com papel, 12 sem). Tabela LITERAL, e a varredura do member-shell reprova palco que desenhe
  papel a mais ou a menos. ⚠️ Cena nova entra aqui junto com o palco (o `Record` reprova a falta).
- ⭐⭐ **`sceneWorld(cast, scene)`**, com a cena OBRIGATÓRIA: só contam os papéis de `SCENE_ROLES`.
  Antes, `{obstacle: asteroide}` levava a `spawn` ao espaço com o Dino no céu, e uma chama de cenário
  mudava o mundo de cena que nem desenha cenário. A régua: nave, asteroide ou tiro desenhado → espaço;
  senão, papel desenhado DECLARADO com figura da terra (Dino, cacto, floresta) → terra (a pedra no
  caminho do Dino); senão, pedra ou chama → espaço. ⚠️ Papel NÃO declarado não puxa para a terra: o
  editor do admin avisa esse caso, porque o texto dele continua dizendo "cacto".
- **`SCENE_FIGURE_NAMES`** (exportado, com acento): os nomes de cada figura. O `Map` normalizado sai
  dele, e o editor do admin monta a nota a partir dele. Entraram espaçonave, astronave, óvni, disco
  voador, cometa, projétil, míssil, pedrinha, pedregulho e labareda. ⚠️ **"bala" saiu**: no Brasil é
  doce, e um jogo de pegar balas desenharia tiros no espaço.
- `castText` apara o nome e o plural do ator: o editor guarda o nome como digitado (aparar a cada
  tecla transformava "nave espacial" em "naveespacial") e só apara ao sair do campo.

## Raio-X, lote 4: o relógio de quadro fixo — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote4.md`. O motor contava UM quadro
por chamada de `advance`, qualquer que fosse o tempo, e o player manda três tamanhos (o ▶ em fatias
irregulares de ~0,04 s, o passo e o roteiro de 1 s): a `contact` perdia ~25 de vida por segundo com o
▶ e 1 no roteiro, a `diagonal` marcava 3,39, 16,97 ou 84,85 conforme o botão. ⚠️ **Revoga**, no lote 1,
"a comparação (`encostam`) arredonda no milionésimo" da `circle-collision` e a ponte de 0,25 s do
`draw-loop` no player.

- ⭐⭐ **`SCENE_FRAME_RATE`** (`actions.ts`): quadros por segundo de cada cena com tempo, e a régua de
  legalidade do `advance` (cena fora da tabela não tem relógio). O ritmo é o que a criança precisa VER
  (o porquê de cada número está no comentário da tabela e no relatório): 4 (`draw-loop`, `contact`,
  `hold-vs-press`), 5 (`velocity`), 30 (o salto, `spawn`, `random`/`acceleration`), 24 (`frames`), 20
  (`cleanup`, `game-state`), 10 (`cooldown`, `aim`, `delta-time`, `circle-collision`, `restart`,
  `enemy-type`) e 1 (`score`, `lives`, `pool`, `entity-state`, `diagonal`). `sceneFrameRate(cena)`.
- ⚠️⚠️ **O motor ACUMULA** (`clock.carry`, grupo novo do estado, hidratado com 0 e zerado no
  `esquecerOGesto`) e roda a lógica UMA vez por quadro inteiro (`umQuadro`): número por segundo entra
  dividido pelo ritmo (`40 / fps`), e com ritmos inteiros a conta fica exata. A folga de `1e-6` é de
  QUADRO (20 fatias de 0,05 s somam 0,9999999999999999). ⚠️ O quadro fecha quando o tempo dele PASSOU,
  nunca adiantado: adiantado, "no início o placar ficou parado" cairia no primeiro 0,04 s do ▶.
- **Por quadro, de verdade**: `velocity` soma `x + vx` (era `vx × 10 × segundos`, e a faixa contava
  "quadros 21" numa etapa de 1 s); `spawn` sem relógio nasce um cacto por quadro da cena; o salto conta
  em tiques do modelo arredondados no milionésimo; `random`/`acceleration` andam a velocidade de cada
  cacto por quadro; `diagonal` mostra o passo de UM quadro (60 reto, 84,85 na diagonal).
- ⚠️ **A legenda de um `advance` que não fecha quadro FICA** (`stepScene`): zerada, ela piscaria entre
  a frase do quadro e a situação a cada fatia do ▶. Quem zera é o `advance` que roda um quadro.
- **`sceneStepLabel(cena)`**: o botão de passo avança exatamente um quadro (`1 / fps`) e se chama
  "Avançar 1 quadro" onde o quadro é o assunto (`draw-loop`, `spawn`, `velocity`, `hold-vs-press`,
  `contact`) e "Um passo" nas outras. ⚠️ `frames` e `delta-time` ficam "Um passo" de propósito: lá
  "quadro" é o desenho da animação, ou os quadros de outro computador.
- ⚠️⚠️ **`tolerarPlayerAnterior` olha o FIM da ação** (`fimDaEspera`, `session.ts`). O player de
  produção decide pelo motor DELE (um quadro por fatia) e dava a etapa por pronta muito antes de o
  servidor ver a descoberta: medido com o motor de HEAD, 6 dos 45 modelos voltavam a não registrar. O
  servidor toca o resto do `advance` numa cópia e aceita se a descoberta está lá; no `next` a cópia vira
  o estado. ⚠️ **O members sobe ANTES do kids** (o inverso não tem conserto: servidor velho conta por
  chamada).
- Testes: `clock.test.ts` (o mesmo mundo com o ▶ do player, quadros de 16 ms, 0,2 s e 1 s nas 24 cenas;
  um passo = um quadro com sobra no meio; metas de tempo que pedem o tempo visto; servidor em segmentos
  de 100 = navegador; retrato sem `clock` abre; os roteiros do catálogo e dos manifestos v6 tocam) e
  `session.test.ts` (o player anterior terminando na primeira fatia registra). Conferidos por mutação.

### Consertos do review do lote 4 (16/09/2026)

Relatório: `packages/community-kids/tmp/storyboard/implementacao/consertos-lote4.md`. ⚠️ Revoga, acima,
"o botão de passo avança exatamente um quadro" e "a sobra em segundos".

- ⚠️⚠️ **`sceneLongFrame(cena)`** (`actions.ts`, até 2 quadros por segundo: `score`, `lives`, `pool`,
  `entity-state`, `diagonal`): nessas cenas **o gesto recomeça o quadro** (fim do `stepScene`: toda ação
  que não é `advance` nem `hint` zera `clock.carry`; o `undo` do `stepExperiment` também). A sobra de
  antes do gesto atravessava para o estado novo, e na `score` "o placar ficou parado" caía 0,05 s depois
  de bater. Nas de 4 por segundo em diante NÃO recomeça (o adiantamento máximo é um quadro de 0,25 s).
  A mesma régua liga a barra do quadro em andamento no player.
- ⚠️⚠️ **`clock.carry` é FRAÇÃO de quadro** ([0, 1]), nunca segundos: em segundos a sobra dependia do
  ritmo de quando foi gravada, e subir o ritmo de uma cena (o lote 5 planeja) soltaria vários quadros de
  uma vez numa sessão salva. O validador e a hidratação não mudaram (uma sobra antiga em segundos, menor
  que `1 / fps`, lida como fração só atrasa o próximo quadro, uma vez).
- **`sceneStepSeconds(cena)`**: o tempo do botão de passo. "Avançar 1 quadro" continua 1 quadro; "Um
  passo" anda os quadros INTEIROS mais perto de 0,2 s (6 no salto, 5 na `frames`, 4 nas de 20, 2 nas
  de 10, 1 s nas de 1 por segundo). Um quadro de 1/30 s era um tique invisível (30 cliques para um pulo).
- **O `advance` não apaga a legenda nas cenas de SALTO sem nada no ar** (`SALTOS`): a frase do pouso
  saía no roteiro de 1 s e piscava em fatias. A referência do "mesmo mundo" do `clock.test.ts` passou a
  ser o `advance` INTEIRO.
- ⚠️⚠️ **O comando da criança pede no máximo 1 s e 30 quadros** (`SESSION_LIMITS.advanceSeconds` e
  `advanceFrames`, no `isExperimentCommand`): um segmento roda no máximo 3.000 quadros (antes, 100 × 30 s
  custavam ~0,25 s de CPU do members). O caso e o roteiro do professor seguem com `SCENE_LIMITS.advance`.
  ⚠️ Fixture de teste que manda `advance` acima de 1 s na experimentação reprova: fatie (o
  `exploration-paths.ts` ganhou `tempo(n)`).
- ⭐⭐ **`SCENE_CLOCK_MARK` / `sceneSegmentHasClock(answers)`** (`session.ts`): o `sceneSegmentAnswers`
  manda `sceneClock: 1`, e o members recusa segmento SEM ele numa cena com relógio quando
  `SCENE_CLOCK_STRICT=true` (a aba antiga cai no "Reabra a aula"). ⚠️ O marcador fica FORA do
  `readSceneSegment`: o members guarda o hash do segmento lido, e um campo novo nele transformaria em
  conflito o reenvio de um segmento gravado antes do deploy. A tolerância da demonstração
  (`tolerarPlayerAnterior`) passou a valer só para segmento sem marcador.
- `pool` `steady`: o pedido diz "por 4 segundos" (era "mais um pouco").

## Raio-X, lote 5 (G1): a tela e o mundo — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote5-g1.md` (proposta em
`analise/g1-tela.md`). As cenas `coordinates`, `screen-reader`, `stage-size`, `draw-loop` e `world`.

- ⭐⭐ **`coordinates` tem a tela DO CASO** (`place.width`/`place.height`, hidratados com 480 × 270): a
  ação `stage` passou a ser legal nesta cena e é o CASO que a usa (o Dia 1 do Desafio abre em 800 × 480).
  O `place` é preso na tela do caso. ⚠️ O endereço usa limites PRÓPRIOS, `SCENE_LIMITS.addressX`/
  `addressY` (0..800 e 0..480): `placeX`/`placeY` continuam valendo para `velocity` e `hold-vs-press`, e
  alargá-los mudaria essas duas. O DTO do members e o editor do admin leem os mesmos limites.
- **`coordinates`: a meta `origin`** ("O 0, 0 fica no canto de cima, à esquerda") substituiu `same-x`,
  que caía junto com `down`. Cai só CHEGANDO em x 0 e y 0 (reenviar o mesmo endereço não é chegar).
- **`screen-reader`: `description.said` e `description.listens`** (hidratados). `said` é a frase ouvida
  COM texto (o painel guarda as DUAS escutas, e ouvir vazio de novo não a apaga); `listens` conta as
  escutas, e é a SUBIDA dele que faz o palco falar (`speechSynthesis`). `SCREEN_READER_EMPTY` é a frase
  do vazio; `screenReaderSays(state)` diz se a frase ouvida tem objetivo e controle (os selos).
  ⚠️ `sceneDescriptionSays` não conta "espaço" depois de palavra de LUGAR (`no`, `pelo`, `ao`…):
  "correr no espaço" não é a barra de espaço.
- **`stage-size`**: `resized` e `target` só caem com a BORDA à vista (antes da borda os números estão
  fechados na bancada, e o motor não premia o que a criança não viu).
- ⭐⭐ **`draw-loop` guarda ONDE estão os desenhos**: `render.x` (o Dino nos bastidores, que anda uma
  casa por quadro, desenhado ou não) e `render.drawn` (os x desenhados, até `DRAW_LOOP_LANE.places`).
  `trail` = `drawn.length`; `drawLoopOnScreen` lê o mesmo. Sem desenhar de novo a tela fica parada e o
  x muda na faixa ("Quadro N: o x do Dino mudou e a tela continua igual."). ⚠️ `loop`/`erase` não
  zeram mais o rastro. Retrato antigo sem `drawn` ganha casas seguidas a partir do começo.
- **`world`**: criar e desenhar são independentes (a bancada tem os dois sempre à vista). A previsão
  pergunta um ESTADO ("O Dino foi criado e o desenho está desligado. Onde está o Dino?", `revealOn:
  'hidden'`), e não um gesto: `hidden` cai nos dois caminhos. O roteiro ganhou a terceira parte
  (desligar o desenho).
- Testes: `tela-e-mundo.test.ts` (novo), `lesson-one.test.ts`, `pedidos-no-motor.test.ts`.

## Raio-X, lote 5 (G2): o Corre Dino, primeira metade — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote5-g2.md` (proposta em
`analise/g2-corre-dino-1.md`). As cenas `layers`, `gravity`, `impulse`, `jump-sound`, `spawn`,
`cleanup`, `game-state` e `controls`.

- **Estado novo, todo hidratado** (`completarCorreDino` no fim do `hydrateSceneState`, e zerado no
  `esquecerOGesto`): `flight.base` (a altura onde o trecho do voo começou), `flight.before` e
  `flight.beforeForce` (a marca e o impulso do salto ANTERIOR), `sound.beats` (a linha do tempo
  `{pulo, som}`, cortada em `SOUND_BEATS_MAX` 8), `crowd.untimedBorn`/`untimedSeconds` (o resultado
  SEM relógio guardado quando o relógio entra) e `match.tries` (as tentativas de começar
  `{input, began}`, cortadas em `START_TRIES_MAX` 3). O validador (`isCorreDinoExtra`) cobra os tetos.
- ⭐⭐ **`gravity`: a gravidade age NO AR, sem teletransporte.** O voo é por TRECHOS
  (`recomecarTrecho`): ligar ou desligar a gravidade no meio recomeça o trecho da altura e da
  velocidade de agora, e o Dino sobe, freia e cai. `floating` cai ao passar de `SALTO_SEM_VOLTA`
  (360) sem gravidade; `landed` só pousando COM gravidade depois de `floating`. `TOPO_DO_SALTO` (600) é
  o alto da régua, e **`sceneJumpLeftView(cena, antes, depois)`** diz quando o Dino sem gravidade o
  CRUZA: é por ela que o player para o ▶ (o voo sem gravidade não acaba nunca).
- **`impulse`: as duas marcas.** O pulo guarda a marca e o impulso do salto anterior antes de zerar o
  pico. `other-height` pede um dos dois impulsos ≥ 14 E `DIFERENCA_DE_ALTURA` (40) entre as marcas.
- **`layers`: duas descobertas.** `front` (o Dino no fim da ordem) e `covered` (com `front` já visto,
  a floresta de volta ao fim). `settled` continua pedindo o Dino na frente, então o caminho inteiro são
  TRÊS trocas. `pedidoDoArranjo` (`evaluate.ts`) responde o "Conferir" da montagem desfeita.
- ⭐ **`jump-sound`: um som em cada pulo.** Metas novas `silent-jump` (pulo pelo toque sem som) e
  `every-jump` (com o som no pulo, pulou pela tecla E pelo toque); `quiet-air`, `key-sound` e
  `tap-sound` viraram `soNoCaso` (continuam registradas e valem em missão). O impulso de fábrica da
  cena é o MÁXIMO, para caber o segundo Espaço no mesmo pulo. `settled` inclui `every-jump`.
- **`spawn`**: `every-frame` pede 1 s de relógio e 20 cactos; ligar o relógio com cactos nascidos
  guarda `untimedBorn`/`untimedSeconds` (a faixa mostra "sem relógio: 60 em 2 s" ao lado).
- **`cleanup`** abre com três cactos na pista (`CACTOS_DA_LIMPEZA`) e `invisible-stored` pede DOIS
  fora da tela e ainda no grupo (com um, caía antes de a prateleira ter o que mostrar).
- **`game-state`**: `waiting` pede 2 s na tela de início com Criar cacto dentro do Se e nenhum
  nascimento (reusa `match.scoreIdle`); mudar a peça limpa a pista (`resetTrack`).
- **`controls`**: `start` guarda a tentativa (`registrarTentativa`), e a legenda do toque recusado é
  "Você tocou, e nada aconteceu.".
- ⚠️ Nenhuma ação nova e nenhum id de meta trocado: `silent-jump` e `every-jump` são ACRÉSCIMOS.
- Testes: `corre-dino-lote5.test.ts` (novo: as regras das oito cenas e o retrato antigo),
  `pedidos-no-motor.test.ts`, `readout.test.ts`, `setup.test.ts`, `clock.test.ts` e
  `tests/fixtures/exploration-paths.ts`.

## Raio-X, lote 5 (G3): o Corre Dino, segunda metade, e os números — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote5-g3.md` (proposta em
`analise/g3-corre-dino-2.md`). As cenas `restart`, `hitbox`, `score`, `random`, `acceleration`,
`velocity`, `variable` e `lives`.

- **Estado novo, todo hidratado** (`completarCorreDinoSegundaMetade` no `hydrateSceneState`, validado
  por `isCorreDinoSegundaMetade` e zerado no `esquecerOGesto`): `match.seen` (o placar visto em cada
  tela, `PLACAR_NAO_VISTO`), `match.cleared` (quantos cactos o Reiniciar tirou), `speed.spots` (quantas
  vezes cada lugar saiu, `LUGARES_NAO_SORTEADOS`), `crowd.cacti[].base`, `drive.trailX/trailY/prevX/
  prevY/steps` (o rastro, até `VELOCITY_TRAIL_MAX` 6, completado com o x/y do PRÓPRIO retrato),
  `box.created` (retrato antigo com número, mostrar ou mudança já tem caixa) e `lifeline.shots`/`last`
  (`'nada' | 'tiro' | 'batida'`, para o palco desenhar a CAUSA).
- ⚠️⚠️ **O sorteio é DE VERDADE e viaja no gesto**: `sample` leva `unit` (o `Math.random()` do
  navegador) e o motor só o transforma (`random`: lugar 500..560 de 10 em 10, ou −5/−6 com uma corrida
  de 1 s na raia; `acceleration`: o sorteio de 0 ou 1). O servidor refaz o mesmo mundo. `sample`
  `velocity` passou a ser legal na `acceleration` ("Passar 5 segundos": a base anda e UM cacto nasce,
  com a garantia de um −10 depois de três em −9 com a condição ligada).
- ⚠️ **`random` e `acceleration` saíram de `SCENE_FRAME_RATE`** (não têm mais ▶: o tempo é o do gesto)
  e `restart` entrou com 20 por segundo (`avancarAPartida`: cactos a 160/s, um a cada 1 s, batida no
  alcance do Dino). `shoot` passou a ser legal nas `lives` (`acertarComOTiro`: +1 no placar, as vidas
  ficam). Limites novos `SCENE_LIMITS.driveX` (0..540) e `driveY` (−60..270): a `velocity` aceita y
  NEGATIVO (a pedra do Dia 3 nasce acima da tela) e diz "Chegou na borda".
- **`restart`**: o toque é `start {input:'tap'}`, resolvido pela TELA e pela escolha do fim (`connect
  restart` = "Reiniciar o jogo"). Metas `ended` → `screen-only` (a partida nova COMEÇA com os cactos da
  anterior, e não o simples voltar ao início) → `restarted` (a pista limpa, só DEPOIS de `screen-only`).
  Tocar jogando não faz nada (no jogo é o pulo).
- **`hitbox`**: abre com a área em 130% (`sceneAreaWidth`/`sceneAreaPercent`, o Dino tem 64). `contact`
  só com VÃO ≥ `HITBOX_VISIBLE_GAP` (6) entre os desenhos (`sceneDrawingsGap`); `area-contrast` só
  DIMINUINDO a área depois de `contact`. ⚠️ **`separate` saiu** (item adiado dos lotes 1 a 4); sessões
  antigas com a descoberta seguem abrindo (descoberta não é validada contra o catálogo).
- **`score`**: `score-idle-wrong` (a peça solta soma no início) é meta nova e `score-start` é COMPARAÇÃO
  (só depois dela). **`random`**: meta nova `repeat`. **`acceleration`**: meta nova `past-limit`, a
  condição nasce LIGADA e ligar a condição NÃO puxa mais a base para −9 (só impede de diminuir).
  **`variable`**: guardar a primeira vez CRIA a caixa (`stored` com 0 vale) e somar sem caixa é
  recusado com legenda. ⚠️ Os ids antigos não mudaram: as metas acima são ACRÉSCIMOS.
- **`velocity`**: a legenda é a do caminho em quadros ("Um quadro: o x foi de 400 para 395.", "N
  quadros: o y foi de A para B. Subiu."), trocar a velocidade passa o rastro para `prev`.
- Testes: `numeros-lote5.test.ts` (novo: as regras das oito cenas, o caso que não pré-semeia o sorteio e
  o retrato antigo), `pedidos-no-motor.test.ts`, `clock.test.ts`, `core-scenes.test.ts`,
  `readout.test.ts`, `scene.test.ts` e `tests/fixtures/exploration-paths.ts`.

### Consertos dos reviews da onda A do lote 5 (16/09/2026)

Relatório: `packages/community-kids/tmp/storyboard/implementacao/consertos-lote5-ondaA.md`. ⚠️ Revoga, no
lote 4, "o segmento leva `sceneClock: 1`" e, acima, "a condição NÃO puxa a base" continua valendo mas com
a saída abaixo.
- ⚠️⚠️ **`SCENE_CLOCK_MARK = 2` é a VERSÃO DAS REGRAS do player** (A2): a onda A mudou metas de cenas sem
  relógio, e o `1` do lote 4 não separava os dois players. Mudou regra que o player decide sozinho? Suba.
- ⚠️⚠️ **`esquecerOGesto(aberto, base, scene)`** (A5): o caso não pré-semeia mais `flight.peak` (sem voo),
  os cactos da `random` e da `acceleration` (a fileira e o sorteio) nem os de fora da tela da `cleanup`, e
  os contadores de população são recalculados do que sobrou.
- **`acceleration` (A1)**: com a condição ligada e a base abaixo de −9 sem as duas metas, a legenda e a
  pista dizem "Recomece para ver a base parar em −9." (a bancada fecha a chave antes; ver member-shell).
- **`hitbox` (A4 + ALTO)**: abre em **149** (o − de 10 em 10 cai em 59, vão 19); com a área abaixo de 100%
  e sem `contact`, a pista manda aumentar a área.
- **`score` (A6)**: `score-end` só com `score-playing` visto; mudar a peça zera pontos, sobra e fileira.
- **`lives` (A3)**: `stepDemonstration` RECOMEÇA a demonstração cuja etapa guardada não existe mais (o
  roteiro encolheu de 4 para 3), em vez de lançar.
- ⭐ **`sceneConnectRunsClock(cena, ação, depois)`** (B1): `true` solta o ▶, `false` para (desligar a
  gravidade acima da parada), `null` deixa. **`PARADA_DO_SALTO` (500)**: o ▶ para aí, e a subida freando
  depois de ligar a gravidade cabe no palco (até ~570, abaixo do topo 600). A frase entre 500 e 600 é
  "O Dino segue subindo…"; acima de 600, "saiu pelo alto da tela… e não voltou".
- **`velocity`**: `up`/`down` pedem três quadros no sentido; o quadro PARADO também conta passo e rastro.
- **`sceneSuccess(cena, elenco, metas)`** + `SceneModel.successNoCaso` (chave = metas em ordem alfabética
  unidas por `+`): a missão restrita tem a frase dela (o Dia 1 cobra só `down`). Player e avaliador leem a
  mesma função.
- **Pistas pela meta que falta** (`degrau`, T4) e a frase do arranjo desfeito na `layers`/`jump-sound` (a
  situação termina com o mesmo pedido do avaliador; `sceneHint` não repete). ⚠️ Pista do MANIFESTO vence o
  degrau: onde a do modelo é melhor, o manifesto fica sem pista.
- **`restart`**: a partida herdada que acaba no toque tem legenda própria. **`variable`**: os pedidos
  usam os nomes dos blocos ("Somar 1 em pontos", "Mostrar placar"). **`coordinates`**: o fantasma fica
  onde a SEQUÊNCIA no mesmo eixo e sentido começou.
- `questions-order.test.ts`: previsão ESCRITA numa demonstração pode vir sem `revealOn` (volta no "Você
  viu tudo!"); na experimentação continua obrigatório.
- Testes: `consertos-onda-a.test.ts` (novo; as sessões antigas vêm de retratos gravados pelo motor do
  lote 4 em `tests/fixtures/retratos-lote4.json`), `corre-dino-lote5.test.ts`, `pedidos-no-motor.test.ts`,
  `clock.test.ts`, `core-scenes.test.ts`, `readout.test.ts`, `session.test.ts`, `questions-order.test.ts`.

## Raio-X, lote 5 (G4): o ateliê de O Jogo do Meu Jeito — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote5-g4.md` (proposta em
`analise/g4-atelie.md`). As cenas `frames`, `onion-skin`, `symmetry`, `pixel-vector`, `sheet-vs-sprite`,
`fill-stroke` e `shading`. ⚠️ **Revoga**, no lote 4 ("desenho e vidas"), o Dino que anda entre os
quadros, a régua do passo, o eixo móvel do espelho e a folha de quatro pedaços.

- ⭐⭐ **As réguas moram em `atelie.ts`** (exportado pelo índice), e o motor, a faixa e o palco leem as
  mesmas: `NAVE_FOGO` (o fogo sai na linha 20 do quadro de 32; pequeno 5, grande 9),
  `onionFireLength(shift)` (5 + um quadradinho a cada 4) e `onionFireZone` (`quase` | `pouco` |
  `passou`); o papel do espelho de 16 (`PAPEL_DO_ESPELHO`, `TRACOS_DA_NAVE` asa/ponta/cabine,
  `MARCA_DO_PAPEL`, `MARCAS_NO_PAPEL` 64, `symmetryMarkCells`, `symmetryCells`, `symmetryCounts`); a lupa
  (`LUPA`: perto 3, pontos 6, longe 2); e a folha (`FOLHA_DA_NAVE` 64 × 32 com quadro de 32,
  `sheetCropCount`, `sheetCropCell`).
- **Cinco ações novas** (acrescentadas no fim da união; `MIRROR_MODES`, `SYMMETRY_PIECES`,
  `SHEET_CROP_WIDTHS` exportados): `mirror-mode {mode: off|x|y}`, `trace {piece}`, `dot {x, y}`
  (`SCENE_LIMITS.paperCell` 0..15) e `clear-paper`, só na `symmetry`; `crop {width: 16|32|64}`, só na
  `sheet-vs-sprite`. ⚠️ `paint` e `mirror` seguem LEGAIS (o `paint` vira a marca `c:N`, o `mirror`
  liga o lado a lado). TypeBox do members e editor do admin no mesmo passo; **o members sobe antes do
  kids**.
- **Estado novo, hidratado pela mistura por grupo** e validado por `isAtelieExtra`: `mirror.axis`
  (`x` | `y`) e `mirror.marks` (até 64 marcas `asa`, `p:x,y`… com `|x`/`|y` na cópia; a original vence a
  cópia na mesma casa) e `sheet.width` (padrão 64). ⚠️ O `sheet.size` de fábrica virou **54** (o jogo da
  Aula 6). `line`/`painted`/`lastLine` ficaram no estado, sem uso no palco.
- **`frames`**: meta nova `paused-one` (parar a prévia rápida, com 4 trocas ou mais a 6 por segundo ou
  mais); a ordem das metas é `two-drawings`, `movement`, `paused-one`, `slow-shows-two`, para a previsão
  (revela em `paused-one`) cair antes da conclusão. Legendas "A prévia começou." / "A prévia parou. Na
  tela ficou o quadro N." e "Velocidade: N quadros por segundo.".
- **`onion-skin`**: `shift` só vale no quadro 2; `blind-move` = mudar o fogo 2 sem o fantasma; `even-step`
  = com o fantasma, o fogo 2 na zona `pouco` (maior e dentro do quadro).
- **`symmetry`**: `one-side` (pintar desligado), `two-sides` (lado a lado) e `axis-decides` (cima e baixo,
  só DEPOIS de `two-sides`). O meio é fixo, como no Pinta. Legenda sem "do outro lado" (a resposta da
  previsão): "Você pintou a asa. O espelho pintou uma cópia.".
- **`pixel-vector`**: só o ZOOM conta (o `kind` não importa mais): `stairs` com 3 ou mais, `smooth` com 6
  ou mais, `alike` voltando a 2 ou menos DEPOIS de `stairs`.
- **`sheet-vs-sprite`**: metas `squeezed` (64), `crop-half` (16), `crop-whole` (32) e `size-apart` (mudar
  o tamanho no jogo, só depois de `crop-whole`). ⚠️ **`cut` e `two-cells` saíram** (nenhum manifesto os
  citava); o `cut` segue legal e prende o quadro na largura.
- **`fill-stroke`** e **`shading`**: rótulos do Pinta (Preenchimento, Contorno, Sem cor; "três tons de
  azul"); a `shading` com o sol trocando de lado ANTES dos tons no roteiro, e `shade` ligado também
  observa `side` quando o sol já mudou.
- `SCENE_ROLES` de `frames`, `onion-skin` e `sheet-vs-sprite` virou `[]`: o desenho é a nave do Pinta.
- Testes: `atelie-lote5.test.ts` (novo: as regras das sete cenas, as marcas do papel, a folha, o retrato
  antigo), `art-scenes.test.ts`, `engine-scenes.test.ts`, `pedidos-no-motor.test.ts`, `readout.test.ts`,
  `legacy-checkpoint.test.ts` e `tests/fixtures/exploration-paths.ts`.

### Consertos dos reviews da onda B do lote 5 (G4, 16/09/2026)

Relatório: `packages/community-kids/tmp/storyboard/implementacao/consertos-5b-g4.md`. ⚠️ Revoga, acima,
`mirror-mode {mode: off|x|y}`, `LUPA` "perto 3", o `sheet.width` que "abre inteira" e "a meta só conta com
a prévia parada" sem mais.
- ⭐⭐ **`symmetry`: os dois espelhos são DUAS chaves, como no Pinta.** `MIRROR_MODES` ganhou `xy` (o
  TypeBox do members deriva da lista) e `mirror.axis` passou a `MirrorAxis` (`x` | `y` | `xy`). Réguas em
  `atelie.ts`: `mirrorAxes(on, axis)` (o que está ligado), `mirrorModeFor(x, y)` (o modo das duas chaves),
  `mirrorCopyAxes` (um traço deixa 0, 1 ou 3 cópias, a de `xy` na diagonal). Com as duas ligadas NENHUMA
  meta cai; `two-sides` pede só o lado a lado e `axis-decides` só o de cima e de baixo.
- ⚠️⚠️ **A cópia COLADA no traço não conta** (`symmetryCopySeparated`): a cabine e a ponta moram nas
  colunas 6 e 7, e com o lado a lado a cópia encostada é o desenho da resposta errada da previsão. A régua:
  nenhum quadradinho na linha 7 ou 8 do eixo. A legenda diz "Você pintou a cabine bem no meio. A cópia
  encostou no traço.".
- **`mirror.strokes` e `mirror.copies`** (hidratados com 0, teto `GESTOS_NO_PAPEL` 999): os GESTOS de pintar
  e as cópias, que a faixa mostra ("seus traços", "cópias do espelho"). `clear-paper` e `esquecerOGesto`
  zeram os dois; o `esquecerOGesto` apaga também `mirror.marks` (o caso que pinta abria com "você pintou 1").
- ⭐⭐ **`sheet.loaded`**: a `sheet-vs-sprite` abre com o jogo VAZIO (`initialScene` põe `false`; o padrão
  da HIDRATAÇÃO é `true`, para o retrato antigo não esvaziar). `crop` e `cut` carregam. A demonstração da
  Aula 6 desenhava a resposta da previsão antes do palpite, e a parte 1 não mudava um pixel. Faixa
  "recorte nenhum" e situação "o jogo está vazio".
- **`size-apart`** só com a nave do jogo fora de `TAMANHO_PARECIDO` (40 a 70): um toque no + (62) fechava a
  meta. O `cut` com 32 diz o fogo ("Recorte no quadro 2: no jogo, a nave com o fogo grande.").
- ⚠️⚠️ **`frame` com a prévia tocando no motor PARA a prévia** e não conta meta nenhuma naquele toque (o
  quadro de antes veio do relógio); o toque seguinte, parado, conta `two-drawings`. O relógio do player para
  por fora (aba escondida, F5) sem passar pelo motor, e o pedido ao pé da letra não derrubava a meta.
- **`framesPreviewSlice(rate)`**: a fatia do relógio da `frames` com menos movimento (um quadro da animação,
  mandada exata pelo player). **`LUPA`** = `{perto: 4, grade: 5, pontos: 6, longe: 2}`.
- `onion-skin`: o fantasma é o contorno TRACEJADO (textos sem "clarinho por baixo"), e o `frame` no quadro 1
  não escreve legenda (a parte 4 e a frase repetiam a mesma). Roteiros: a parte 4 da `frames` para a prévia
  e a 5 toca 1,5 s e para (tempo em quadro inteiro); a parte 3 da `sheet-vs-sprite` tem oito trocas; a `fill-stroke` tem quatro
  partes (a volta do contorno é uma).
- Testes: `atelie-lote5.test.ts` (o `describe` dos consertos), `pedidos-no-motor.test.ts` (os pedidos novos e
  a cabine no laço do eixo), `art-scenes.test.ts`.

## Raio-X, lote 5 (G6): o motor e a porta do 3D — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote5-g6.md` (proposta em
`analise/g6-motor-3d.md`). As cenas `pool`, `entity-state`, `delta-time`, `circle-collision`, `axis-z`,
`camera-3d`, `mesh` e `pick-ray`. ⚠️ **Revoga**, no lote 4, a `pool` a 1 quadro por segundo e na lista
do `sceneLongFrame`, e em "O motor, o 3D e o ateliê" o caminho `scene-engine-stages.tsx` (os palcos
moram em `member-shell/components/scene-motor-stages.tsx` e `scene-3d-stages.tsx`).

- **Duas ações novas** (`actions.ts`, acrescentadas no fim da união): `see-points {level}` (só `mesh`,
  `MESH_LEVELS` = `nada | metade | tudo`, no lugar do liga/desliga `wireframe`, que segue legal) e
  `brain-scope {shared}` (só `entity-state`: o estado mora em cada torre ou no jogo). ⚠️ TypeBox do
  members e editor do admin no mesmo passo; **o members sobe antes do kids**.
- **Estado novo, todo hidratado** (`completarOMotorEO3D` no fim do `hydrateSceneState`, validado por
  `isMotorE3DExtra`): `nursery.onScreen/progress/last` (retrato antigo: `onScreen` = `created`),
  `brains.shared`, `machines.fastFrames/slowFrames` (retrato antigo: posição ÷ `DELTA_RACE.passo`),
  `model.see` (retrato antigo: `wire` → `tudo`) e `model.sawHalf`. Constantes exportadas:
  `POOL_CROSSING` (10 quadros), `DELTA_RACE` (`chegada` 120, `passo` 4) e `MESH_POINTS` (8).
- ⭐⭐ **`pool` a 10 quadros por segundo** (`SCENE_FRAME_RATE`): o cacto ATRAVESSA a pista em
  `POOL_CROSSING` quadros com um NÚMERO (`onScreen`); sem reciclagem cada saída fabrica o próximo número,
  com reciclagem o mesmo número volta (`last: 'voltou'`). `grows` pede três fabricados; `recycled`, o
  mesmo número de volta; `steady`, 4 s com a reciclagem ligada depois de `grows`. Saiu do
  `sceneLongFrame`. ⚠️ O `esquecerOGesto` zera a pista inteira e guarda só a chave.
- **`entity-state`**: com `shared` ligado as três passam a seguir o estado da 1ª, e mudar uma muda as
  três (a crença errada, testável, meta nova `shared`); voltar para "em cada torre" não mexe em nada, e
  mudar uma volta a mudar só ela. As legendas dizem o que cada torre FEZ no quadro (`A 1ª virou para o
  alvo.`). `SCENE_ROLES` virou `[]`: são torres, não o elenco.
- **`delta-time`**: uma corrida até `DELTA_RACE.chegada`. A cada quadro, o rápido desenha um quadro e o
  devagar um a cada dois; "a cada segundo" dobra o passo do devagar. `count` RECOMEÇA a corrida na
  largada. `apart` pede mais de 30 de distância a cada quadro; `together`, os dois na chegada depois de
  `apart`.
- **`axis-z`: z NEGATIVO é o fundo**, como no Jogo 3D do Estúdio (Desvie nasce os inimigos em z −20 e
  anda para +z, na direção da câmera em z 5; os kits Travessia e Corrida usam coordenadas internas de
  grade com o z para cima e não mostram o z à criança). `shadow` só com o cubo no ar (`y > 0`), mexendo
  x ou z depois de ter mexido na altura. O roteiro do modelo leva o cubo ao fundo em z −80.
- **`camera-3d`**: meta nova `three-faces` (girou e achou um lugar com três cores: um canto, por cima
  ou por baixo); `back` virou `soNoCaso`.
- **`mesh`**: `see-points` `metade` derruba `points`; `skin` pede VOLTAR para `nada` (ou `metade` de novo)
  DEPOIS de ter visto a metade (`sawHalf`), para a revelação e a conclusão não caírem no mesmo gesto.
- ⭐ **`pick-ray`**: `PICK_BOXES` ganhou `letra` e `z`, a caixa da FRENTE é a MENOR, e
  `scenePickPath(x, y)` (exportada) devolve as caixas no caminho da reta, da mais perto para a mais
  longe; `scenePickLetter(id)` dá a letra. `first` cai com duas no caminho e `face` só com UMA (a
  ordem das metas virou `first`, `face`), o que tirou a `pick-ray` da lista `revelaNaConclusao`.
- Testes: `motor-3d-lote5.test.ts` (novo: o retrato antigo, o caso que não pré-semeia e as duas ações),
  `engine-scenes.test.ts`, `pedidos-no-motor.test.ts`, `clock.test.ts`, `readout.test.ts`, `cast.test.ts`
  e `tests/fixtures/exploration-paths.ts`.

### Consertos dos reviews da onda B do lote 5 (G6, 16/09/2026)

Relatório: `packages/community-kids/tmp/storyboard/implementacao/consertos-5b-g6.md`. Sem ação, meta ou campo
novo; nenhum manifesto a reimportar.
- ⚠️⚠️ **`circle-collision`: o relógio só aproxima ATÉ a batida** (`umQuadro`); **`sceneClockReachedStop(cena,
  depois)`** diz ao player e à bancada da vez que o ▶ não tem mais o que fazer (hoje só essa cena). Com um raio
  menor os dois se separam e o ▶ volta a aproximar. Degrau novo quando os dois estão SOBREPOSTOS (pela medida).
- **`entity-state`**: a pergunta final pergunta pela DIFERENÇA ("Com o estado em cada torre, mudar só a 2ª não
  mexeu na 1ª. Por quê?"), porque a cena conclui com o estado no jogo; `brain-scope` ligado tem legenda; a escada
  fala da meta que falta (`own`, `shared`, voltar para cada torre).
- **`mesh`**: **`MESH_SKIN_LABELS`** (`actions.ts`: inteira, transparente, sem pele) é como a faixa, a bancada e o
  admin dizem os degraus; "Ver os pontos" saiu (respondia a previsão) e "pontos do modelo" só aparece depois de
  `points`. Os ids `nada/metade/tudo` não mudaram.
- **`axis-z`**: a frase diz onde o cubo está na profundidade e como parece ("lá no fundo… parece menor"), para quem
  usa leitor de tela; a faixa pinta cada número com a cor do seu eixo (tom novo **`leaf`** no `SceneReading`) e diz
  "z (negativo é o fundo)".
- `camera-3d` "Voltar para onde a câmera começou"; `delta-time` "marcas"; `pool` sem mudança no motor (a chave
  fecha na bancada até `grows`).
- Teste: `motor-3d-consertos-5b.test.ts` (novo).

## Raio-X, lote 5 (G5): o núcleo do Iniciante 2D — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/lote5-g5.md` (proposta em
`analise/g5-nucleo-2d.md`). As cenas `hold-vs-press`, `group-loop`, `enemy-type`, `camera`, `contact`,
`cooldown`, `aim`, `diagonal` e `tilemap`. ⚠️ Revoga, acima, "palco e bancada em
`scene-core-{stages,controls}.tsx`" para estas nove (moram em `scene-nucleo-*` no member-shell).

- ⭐⭐ **`nucleo.ts`, as RÉGUAS das nove, puras e exportadas** (sem importar o estado): a pista das
  raquetes (`HOLD_LANE`, `holdLaneNext`), o vaivém dos cactos (`HUNT_BASE`/`HUNT_SWING`,
  `huntDistances`), a pista da ficha (`ENEMY_LANE`, `enemyStep`), o mundo e os marcos da câmera
  (`CAMERA_WORLD`, `CAMERA_LANDMARKS`, `cameraWindow`), os corações do encosto (`CONTACT_HEARTS`,
  `contactTouching`), o tiro que voa (`COOLDOWN_SHOT`, `rechargeWords`/`rechargeFrames`), a mira
  (`AIM_ORIGIN`, `AIM_SHOT`, `aimDistanceToPath`), a andada de 1 segundo (`DIAGONAL_REACH`,
  `diagonalStride`) e o pouso no mapa (`tilemapLanding`, `tilemapCoinRow`). Motor, faixa e palco leem
  as mesmas.
- **Estado novo, todo hidratado** (validado por `isNucleoLote5`, esquecido por
  `esquecerOGestoDoNucleo`): `input.pressFrom/holdFrom/pressSteps/holdSteps`, `hunt.blind`,
  `blueprint.cacti` (cada um com `speed`/`life`/`seq`) + `copy/ticks/seq/editSeq/pending`,
  `hit.top/bottom/frames/topTouch/bottomTouch/touches`, `weapon.time/bullets/shotTimes/refusedAt`,
  `sight.flying/bulletX/bulletY/bulletVX/bulletVY/aimed/result`, `walkPad.x/y/last/ghosts/strides`,
  `grid.marks/lastRow/lastCol`.
- ⚠️⚠️ **Ação nova `stride`** ("Andar 1 segundo", só na `diagonal`) e **porta nova `copy`**
  ("Copiar a ficha ao nascer", `enemy-type`). A `diagonal` SAIU do `SCENE_FRAME_RATE` (acabou o
  contador de passos adiado dos lotes anteriores) e a `group-loop` entrou (10 por segundo). `shoot` passou a valer na `aim`. TypeBox do members e editor do admin no mesmo
  passo; **o members sobe antes do kids**.
- **`hold-vs-press`: UMA tecla.** `hold on/off` só; `press` segue legal (compat) e vira afundar e
  soltar. Metas `one-step` (toque rápido), `while-held` (3 quadros segurando) e `apart` (segurou 1 s e
  soltou, a de cima com 1 passo). A pista dá a volta (14 lugares).
- **`group-loop`:** as distâncias VÃO E VOLTAM com o relógio; `nearest` só medindo os três
  (`blind` guarda a escolha às cegas); `auto` só quando o laço TROCA a escolha sozinho (antes caía ao
  ligar). O caption do `look` diz o número medido.
- **`enemy-type`:** os cactos andam e reaparecem; `all-change` cai no quadro SEGUINTE a mudar a ficha
  com dois antigos na tela; `copied` (nova) com a cópia ligada, um antigo com o número velho e um
  novo com o novo. É a regra do cacto da `acceleration`.
- **`camera`:** `walk` e a janela (`cameraWindow`); `window` só quando a janela MUDA de lugar com a
  câmera seguindo, depois de o Dino ter sumido; `follows` só ligando com o Dino FORA.
- **`contact`:** as duas regras AO MESMO TEMPO, uma pista cada, dez corações; o encosto é distância
  0 dos desenhos. `drain` e `once` caem no mesmo terceiro quadro; `apart` pede a volta depois de um
  quadro longe. O `mode` só guarda o valor (compat).
- **`cooldown`:** os tiros VOAM (`bullets`); sem recarga saem colados (`burst` no 3º tiro em 1 s de
  relógio); o aperto recusado some (`refusedAt`), e `spaced` pede o vão à vista.
- **`aim`:** o tiro sai com "Atirar" e voa; o acerto é conferido no TRECHO do quadro. `straight-miss`
  (nova) e `follows`; sem legenda de quadro (a situação diz), senão o texto dependia da fatia do ▶.
- **`diagonal`:** as metas são COMPARAÇÕES com fantasmas (`faster` pede um reto antes, `same` pede
  a diagonal sem correção antes). A distância vem dos componentes SEM arredondar (60, não 60,01).
- **`tilemap`:** `coin-row` (nova) e `same-letter` pede a mesma PEÇA em duas LINHAS (`marks`). O
  elenco ganhou o herói na `diagonal` e na `tilemap` (`SCENE_ROLES`).
- Testes: `nucleo-lote5.test.ts` (novo: as réguas, o esquecimento do caso e o retrato antigo),
  `pedidos-no-motor.test.ts`, `clock.test.ts`, `core-scenes.test.ts`, `readout.test.ts`,
  `scene.test.ts`, `cast.test.ts` e `tests/fixtures/exploration-paths.ts`.

### Consertos dos reviews da onda B do lote 5, núcleo (G5) — 16/09/2026

Relatório: `packages/community-kids/tmp/storyboard/implementacao/consertos-5b-g5.md`. ⚠️ Revoga, acima,
"a pista dá a volta" como único remédio da `hold-vs-press`, o teto de 8 cactos que RECUSA e as marcas por
linha da `tilemap`.
- **`enemy-type`**: a pista cheia não recusa, sai o cacto mais antigo (`copied` ficava impossível). A
  pergunta final pergunta a DIFERENÇA entre ler e copiar (ids `muda-junto`/`mais-rapido`): ela chega com a
  cópia ligada. `born` zera no caso.
- **`group-loop`**: `HUNT_SWING` novo (da fase 0 o 2º segue o mais perto 1,6 s) e **`HUNT_LOOP_SEEN_TICKS`**:
  `auto` só conta a troca do MAIS PERTO depois de 1 s de laço ligado. Campos novos, hidratados:
  `hunt.loopTicks` e **`hunt.measured`** (a FOTO de cada régua; sem o laço os cactos andam e ela fica).
  `nearest` usa a foto. `choose` com o laço ligado é recusado. O caso não zera `hunt.ticks` (é o mundo).
- **`hold-vs-press`**: afundar a tecla leva as DUAS raquetes ao começo; o caso não deixa a tecla segurada.
- **`contact`**: um "fim de jogo" recomeça as duas pistas juntas, e `apart` cai no terceiro quadro da
  encostada nova. O roteiro da parte 2 passou a encostar 1 s.
- **`cooldown`**: `COOLDOWN_SHOT.speed` 100 (4,4 s na tela) e `COOLDOWN_REFUSED_SECONDS` (1 s de aviso).
- **`aim`**: o acerto NO DISPARO (alvo em cima do Dino) não fecha `follows`. `AIM_TARGET_MARGIN` é a folga da
  bancada e do arrasto (o motor segue aceitando 0..480).
- **`camera`**: `CAMERA_WALK_MAX` (1160) é o fim do "Andar"; o motor segue aceitando 1200.
- **`tilemap`**: a marca é da CASA (`tilemapMark` → `#3:4`, teto 60, `TILEMAP_MARK` aceita a de antes) e só
  as VIVAS contam (`tilemapMarkedRows`); `coin-row` olha só a linha escrita.
- Pistas pela meta que falta (`degrau`) em `group-loop`, `enemy-type`, `cooldown` e `tilemap`.
- Testes: `consertos-onda-b-nucleo.test.ts` (novo, conferido por mutação); atualizados com motivo:
  `nucleo-lote5.test.ts`, `core-scenes.test.ts` e `pedidos-no-motor.test.ts` (o pedido de `apart` em 1 s).

## Comandos (de dentro de `packages/core`)

| Comando | O quê |
|---|---|
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` / `check:fix` | Biome |

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Nada de framework nem de import de pacote de serviço/app entrou aqui.
- [ ] Subpath novo? Adicionou ao `exports` do `package.json`.
- [ ] Mudou contrato público? Ciente de que redeploya os consumidores (é dependência de todos).
