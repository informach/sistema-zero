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
| `/learning/scene` | as **45** cenas de aula: ações, catálogo, motor, avaliação, **elenco** (`cast`), **caso e missão** (`setup`) e o que a cena diz de si (`readout`). ⚠️ Cena nova entra em `SCENE_IDS` + `PORTS` + `SCENE_MODELS` + `leituras`/`situacao` (readout) + o palco do member-shell; o TS reprova o que faltar, menos o palco | `actions` · `catalog` · `engine` · `evaluate` · `cast` · `readout` · `state` · `session` |
| `/creations` | contratos puros de identidade/armazenamento compartilhados por apps e serviços | `object-deletion` · `pinta-palette-library` · `storage-keys` |

## O núcleo do Iniciante 2D: 11 cenas novas — 15/09/2026

As 24 primeiras nasceram para o **Corre, Dino!**, que é o curso 1 da trilha. Estas cobrem os
degraus da escada que os outros sete cursos do nível 1 pedem — e que voltam nos níveis 2 e 3,
vestidos com outro elenco: `velocity` (a posição é somada em cada quadro), `hold-vs-press`
(evento × estado), `variable` (guardar, mudar e mostrar), `group-loop` (o laço que escolhe o
alvo), `enemy-type` (a ficha que todos leem), `camera` (a tela é uma janela), `contact` (a
pergunta contínua × o acontecimento), `cooldown` (o relógio que faz esperar), `aim` (a seta até
o alvo), `diagonal` (dois passos no tempo de um) e `tilemap` (o desenho nasce das letras).

⚠️ Palco e bancada vivem em `member-shell/components/scene-core-{stages,controls}.tsx` — o TS
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

⚠️ **A régua das faces do cubo existe em DUAS cópias** — `facesÀVista` no motor e `faces` no
`readout` — porque a leitura não pode importar o motor (ele já a importa) e guardar o número no
estado faria um campo derivado que todo retrato antigo traria errado. Mexeu num, mexa no outro:
o `engine-scenes.test.ts` compara os dois em todas as 24 posições de câmera.

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
| `axis-z` | com um caso que abre no ar, mexer só no x fechava "a sombra diz onde ele está" | ter mexido na ALTURA |
| `enemy-type` / `aim` | o deslizante no batente reenvia o MESMO valor, e a meta caía nele | o valor mudar de verdade |
| `circle-collision` | o relógio só APROXIMA: passados ~6s a meta da conta ficava impossível | a distância virou controle (`approach` vale nas duas cenas de distância) |
| `circle-collision` | o relógio só APROXIMA: passados ~6s a meta da conta ficava impossível | a distância virou controle (`approach` vale nas duas cenas de distância) |

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
