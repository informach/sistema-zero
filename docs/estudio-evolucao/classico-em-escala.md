# Clássico em escala (pacote C)

As tabelas abaixo pertencem à sessão inicial no Linux. A continuação registra resultados novos
e condições em [`diagnostico-windows.md`](diagnostico-windows.md). O script atual aceita
`SZ_PROFILE_SAMPLES` (31 por padrão), mantém as amostras no JSON v2, calcula p50/p95 por rodada
e separa a criação da fixture da carga do modelo. Não comparar esses números com as tabelas
históricas como se fossem um antes/depois da mesma máquina.

## C0: quanto custa cada edição de bloco (17/11/2026)

`packages/studio/scripts/profile-js-classic.ts` mede, num Blockly **sem tela**, as etapas que o
`BlocklyPanel` roda a cada edição (depois do agrupador de 120 ms). Base: o jogo final de A Chave
do Farol, com os eventos de "Quando acontecer" repetidos até o tamanho pedido. Mediana de 7
rodadas, em milissegundos, nesta máquina (não compare com números de outra).

```bash
cd packages/studio && bun scripts/profile-js-classic.ts
```

Desde a continuação (18/11/2026) o padrão são 31 rodadas, com p50 e p95, e o `--json` mudou de
formato: era uma lista de resultados e agora é `{ version: 2, resultados, amostras }`. Nenhum script
do repositório lê esse JSON; quem guardou um arquivo do formato antigo precisa ler `resultados`.

| Blocos | Estado (KB) | Linhas de código | Abrir | Serializar | Virar texto | Ler a IR | Diagnósticos | Gerar | **Por edição** |
|---|---|---|---|---|---|---|---|---|---|
| 80 (o Farol) | 8 | 50 | 53 | 0,3 | 0,05 | 0,7 | 3,5 | 1,8 | **6** |
| 512 | 49 | 428 | 44 | 0,4 | 0,1 | 1,8 | 16 | 10 | **28** |
| 2 000 | 192 | 1 730 | 126 | 1,3 | 0,5 | 4 | 50 | 32 | **88** |
| 5 008 | 481 | 4 362 | 384 | 4 | 1,2 | 10 | 121 | 79 | **216** |
| 10 000 | 961 | 8 730 | 1 193 | 9 | 2,5 | 21 | 244 | 168 | **444** |

### O que a medição diz

- O custo cresce em linha reta com o número de blocos: cerca de 0,044 ms por bloco por edição.
- **Diagnósticos são 55% e a geração de código 38%.** Serializar, virar texto e ler a IR somam 7%.
- Nos jogos dos cursos (80 blocos) uma edição custa 6 ms: não há o que otimizar ali, e nada do
  pacote C precisa tocar o que as aulas usam.
- Um quadro de 60 por segundo tem 16 ms: a edição passa disso por volta de 350 blocos, e de
  100 ms (onde a pessoa sente) por volta de 2 300.

### O que muda no plano

O plano previa começar pela IR incremental (C2). A regra era seguir o custo medido e tirar o que
pesa menos de 10%:

- **Saem:** IR incremental (5%) e serialização menor (2%).
- **Entram na frente:** diagnósticos e geração só do que mudou, por filho direto de área, com a
  prova de que o resultado incremental é igual ao inteiro em cada edição (os sete projetos dos
  cursos e as referências de `e2e/fixtures/protected-lessons/` servem de acervo).

### O que esta medição NÃO cobre

- **Desenhar os blocos** (abrir um projeto grande na tela, arrastar, rolar): é do navegador e
  costuma ser o maior custo percebido. O "Abrir" da tabela é só montar o modelo, sem desenho.
- A gravação no IndexedDB, a Ponte (ler o código de volta) e a prévia.
- Aparelhos fracos: os números são de um servidor.

Falta, portanto, a medição no navegador (`e2e/classic-scale.spec.ts`, não escrito) antes de
decidir a montagem sob demanda (C3).

## C1: o perfil de CPU, e o que ele mudou (17/11/2026)

O perfil de CPU do mesmo script (`SZ_PROFILE_BLOCKS=5000 bun --cpu-prof scripts/profile-js-classic.ts`)
mostrou que o custo não pedia cache: pedia tirar trabalho repetido.

| Onde | O que era | Peso no perfil | O que mudou |
|---|---|---|---|
| Geração (`generators/js.ts`) | `treeHasStatementType` andava a árvore inteira para cada tipo perguntado, dezenas de vezes por edição | 79% da geração | `statementTypesIn`: uma varredura, depois é consulta a um conjunto |
| Diagnósticos (`ir/schema.ts`) | `createCanvas3DStatementContextIndex` copiava a tabela de símbolos três vezes por corpo de bloco, em todo projeto | 36% dos diagnósticos | só é montado quando o programa importa classes do three (`programImportsThreeClasses`); sem o import ele sairia vazio |
| Diagnósticos (`ir/programmingReferences.ts`) | as cópias criavam listas intermediárias | parte dos 40% de `cloneSymbols` | laços diretos |

Nenhuma das três muda resultado: são o mesmo cálculo, feito uma vez. Provas: 7 437 testes do IR,
dos geradores, dos blocos, dos parsers e das extensões (as 4 falhas da suíte de extensões são as
mesmas sem a mudança); `ir/__tests__/canvas3dIndexShortcut.test.ts` confere, em todos os exemplos
oficiais e nos projetos dos cursos, que o índice de verdade sai vazio quando o atalho é usado; e
as aulas protegidas geram o mesmo código, linha por linha.

### Antes e depois (mesma sessão, mesma máquina, mediana de 7, em ms por edição)

| Blocos | Diagnósticos antes | depois | Gerar antes | depois | **Por edição antes** | **depois** |
|---|---|---|---|---|---|---|
| 80 (o Farol) | 3,5 | 2,8 | 1,8 | 0,9 | **6** | **5** |
| 512 | 16 | 10 | 10 | 2,7 | **28** | **15** |
| 2 000 | 50 | 29 | 32 | 7,6 | **88** | **43** |
| 5 008 | 121 | 71 | 79 | 18 | **216** | **106** |
| 10 000 | 244 | 127 | 168 | 40 | **444** | **199** |

A edição passa de 100 ms por volta de 4 700 blocos (era 2 300).

### O que sobra, pelo perfil de agora (5 mil blocos)

- Diagnósticos são 68% da edição. Dentro deles: a validação de referências 45% (com 30% em
  cópias da tabela de símbolos, uma por corpo de bloco), o parse do zod 15% a 20%, as regras de
  ciclo de vida 10%.
- Geração: 17%. Ler a IR: 10%.

Próximo alvo, se for preciso descer mais: a tabela de símbolos em camadas (sem copiar os nomes
implícitos a cada corpo) e o parse estrutural guardado por filho de área. A memória por raiz na
geração, que o plano previa (C4), **sai**: a geração deixou de ser o gargalo.

## C5: o perfil no navegador (17/11/2026)

`packages/studio/e2e/classic-scale.spec.ts` abre o dia 3 de A Chave do Farol com os eventos
repetidos (`/aula?…&escala=N`), edita um campo de número e arrasta a área "Ao iniciar". Chromium
153 **sem interface e sem placa de vídeo**, tela de 1440 por 900.

```bash
cd packages/studio && PW_CHROMIUM=/opt/pw-browsers/chromium bunx playwright test e2e/classic-scale.spec.ts --project=chromium --trace off
```

| Blocos | Abrir e desenhar | Editar um campo (tarefas longas) | Arrastar uma área (tarefas longas, maior) |
|---|---|---|---|
| 70 (o curso) | 1,7 s | nenhuma | nenhuma |
| 502 | 2,2 s | nenhuma | 202 ms (82 ms) |
| 2 002 | 4,8 s | 69 ms | 1 926 ms (717 ms) |
| 5 002 | 18,2 s | 605 ms | 10 900 ms (3 105 ms) |

Onde o tempo vai (contadores do navegador, 2 mil blocos, 38 mil nós na página, 19 por bloco):

| | Script | Estilo | Layout | Total da tarefa |
|---|---|---|---|---|
| Abrir | 2 308 ms | 626 ms | 308 ms | 3 886 ms |
| Arrastar | 46 ms | 10 ms | 5 ms | 493 ms |

- **Arrastar não é JavaScript**: de 493 ms, 46 são script. O resto é pintura do SVG. Um perfil
  de CPU do arrasto confirmou: 130 ms de script, metade do próprio Playwright.
- **Editar um campo ficou barato** depois do C1: nenhuma tarefa longa até 500 blocos.
- **Abrir** cresce mais rápido que o número de blocos (2,2 s para 4,8 s para 18 s).

### O que isso decide

O que sobra de escala no Clássico é **quantidade de nós desenhados**, não processamento. O remédio
é desenhar menos: a montagem sob demanda (recolher o que está longe da tela), que o Python
Clássico já tem em `python/blocks/programNavigation.ts`. Ela entra só acima de um limiar e
**nunca em aula**: nos cursos (70 blocos) não há nada a ganhar e o robô acha os blocos pelo texto
na tela.

### Ressalvas desta medição

- Sem placa de vídeo, a pintura aqui é por software: num computador comum o arrasto deve custar
  menos, e num tablet fraco pode custar mais. Os números servem para comparar antes e depois
  nesta máquina, não como orçamento.
- O arrasto variou entre rodadas (493 ms numa, 1 926 ms noutra, com 2 mil blocos).
- Os tamanhos grandes são o Farol repetido: muitos eventos iguais lado a lado numa área só. Um
  projeto de verdade tem outra distribuição.
- O Playwright não devolve um objeto com centenas de blocos encadeados (a serialização dele
  estoura e acusa uma navegação que não houve): o teste lê o projeto como texto.

## Estado

| Item | Estado |
|---|---|
| C0 perfil sem tela | **feito** |
| C0 perfil no navegador | feito no C5; a gravação no IndexedDB segue sem medir |
| C1 perfil de CPU e os três desperdícios tirados | **feito** |
| C2 acervo de equivalência para caches | não foi preciso (nenhum cache entrou); a prova do atalho está em `canvas3dIndexShortcut.test.ts` |
| C3 diagnósticos por diferença, tabela de símbolos em camadas | pendente |
| C4 memória por raiz na geração | saiu do plano |
| C5 perfil no navegador | **feito** (sem placa de vídeo) |
| Montagem sob demanda no JavaScript (fora das aulas) | **feita em 18/11/2026** (ver abaixo); abrir projeto enorme continua lento |
| Abertura sem desenhar a cauda distante | **feita em 20/11/2026** (etapa 3, ver o fim); 5 mil abre em ~5 s; 10 mil abre, mas não gera código (teto da serialização, anterior a isto) |
| 10 mil blocos geram código | **feito em 21/11/2026** no formato dos jogos, nos três navegadores (ver o fim); a sequência única de 10 mil depende do formato plano |

## Montagem sob demanda (18/11/2026)

`packages/studio/src/blockly/offscreenBodies.ts`. A partir de 1 500 blocos
(`OFFSCREEN_BODIES_MIN_BLOCKS`), o corpo dos blocos que estão a mais de uma tela de distância da
vista sai da página, e o contorno do bloco de fora deixa de ser pintado (classe `sz-block-far`).
Volta quando a vista chega perto, antes de "Mostrar o bloco" rolar até ele, e antes de desfazer ou
refazer mexer nele.

- **O modelo não muda**: ids, conexões, seleção, histórico, estado gravado e código gerado são os
  mesmos. Só o desenho sai do DOM, e o bloco de fora continua do mesmo tamanho, então nada pula.
- **Nunca nas aulas**: os jogos dos cursos têm de 70 a 80 blocos. O teste
  `e2e/classic-offscreen.spec.ts` confere que ali nenhum bloco sai da página, e que num projeto de
  2 mil blocos rolar não muda o projeto, editar chega ao código e desfazer com o bloco longe
  devolve o código de antes.
- **Limite**: a unidade é o bloco filho direto de uma área (um evento, uma função) ou de uma
  pilha solta. Uma pilha de milhares de comandos simples, sem corpo, só deixa de ser pintada; os
  nós dela continuam na página.

Mesma máquina e mesmo teste do C5 (Chromium 153 sem interface e sem placa de vídeo):

| Blocos | Nós desenhados antes | depois | Abrir antes | depois | Mover uma área (maior tarefa) antes | depois |
|---|---|---|---|---|---|---|
| 70 (o curso) | 70 | 70 | 1,8 s | 1,8 s | nenhuma | nenhuma |
| 2 002 | 2 002 | 422 | 6,1 s | 4,6 s | 790 ms | 245 ms |
| 5 002 | 5 002 | 922 | 21,0 s | 14,7 s | 3 570 ms | 938 ms |
| 10 000 | não medido | 1 755 | não medido | 58,7 s | não medido | 3 823 ms |

O que os números dizem, sem enfeite:

- **Mover** com 5 mil blocos ficou quase quatro vezes mais leve. No que sobra, o JavaScript são
  137 ms; estilo e layout somam 16 ms. O resto é a pintura por software desta máquina e o próprio
  controle do teste. A meta de 500 ms **não foi atingida aqui** e precisa ser medida num
  computador com placa de vídeo.
- **Abrir** melhorou pouco e **não atingiu a meta de 8 s** com 5 mil blocos; com 10 mil abre, mas
  em quase um minuto. O perfil de CPU da abertura (5 mil blocos, 15 s ocupados) aponta o desenho
  inicial do Blockly: 6,6 s em `render`, dos quais 2,3 s medindo texto (`getComputedStyle` por
  campo) e 1,4 s em `getRelativeToSurfaceXY`, que sobe a pilha inteira a cada bloco (por isso
  cresce mais rápido que o número de blocos). A carga desenha tudo e o conserto de depois da
  carga (`schedulePostLoadRepaint`) desenha tudo de novo.
- Tentado e desfeito: ligar a memória de larguras de texto do Blockly durante a carga. Ganhou 3%
  e arriscava reaproveitar uma largura medida antes de a fonte chegar, que é justamente o defeito
  que o segundo desenho conserta.

Próximo passo para a abertura, não feito: carregar a pilha em pedaços, desmontando o que fica
longe enquanto carrega (o DOM pequeno tira o custo que cresce), e desenhar de novo só o que está
à vista. Mexe na carga de todo projeto, então precisa da prova de que o estado e o código saem
iguais nos sete projetos dos cursos antes de entrar.

## Abertura sem trabalho repetido (19/11/2026, lote 2.2)

Linux deste contêiner, Chromium 1243 sem interface e sem placa de vídeo, 1440×900, fixture
`/aula?…&escala=N`, dois builds locais (`baseline` = staging antes do lote, `candidate`) servidos
lado a lado e medidos com `scripts/measure-classic-opening.mjs` em ordem alternada. Não comparar
com as tabelas acima (outra máquina e outra sessão).

**O que o perfil de CPU mostrou** (5 mil blocos, `SZ_CLASSIC_OPEN_CPU_PROFILE=1`, nomes
resolvidos no bundle e confirmados no código-fonte do Blockly 12.5.1 extraído do source map):

| Onde | Custo | Por quê |
|---|---|---|
| `dom.getTextWidth` | 3,1 s | `getComputedStyle` por campo. A memória de larguras do Blockly dura só o desenho de UM bloco. Contagem no navegador: 4 076 medições para 90 textos distintos (2 mil blocos). |
| Construtor do `Drawer` | 0,9 s | `topLeft_ = block.getRelativeToSurfaceXY()` em todo desenho, e nada lê `topLeft_` (uma atribuição, nenhuma leitura no `blockly_compressed.js`). A cadeia única de eventos faz a subida pelo DOM ser O(profundidade). |
| Pós-carga duplicada | uma repintura inteira + um `regenerateFromBlocks` a mais | O Blockly despacha eventos em `requestAnimationFrame → setTimeout(0)`. O fallback "se o FINISHED_LOADING não vier" era um microtask e rodava SEMPRE antes do evento; os dois salvavam, regeneravam e repintavam tudo. |
| `svgResize` | 1,5 s | layout forçado da página inteira; cai com menos nós, não com menos código. |

**O que mudou** (`src/blockly/openingRender.ts`, `BlocklyPanel.tsx`), depois da revisão do mesmo dia:

1. O `Drawer` nasce sem a subida pelo DOM (o valor descartado vira a origem só durante
   `makeDrawer_`). Um teste reprova se uma versão nova do Blockly passar a ler `topLeft_`.
2. A fonte dos blocos (`fontStyle` do tema, `500 13pt 'Baloo 2'`) é carregada ANTES de abrir, no
   máximo 1,5 s. Achado da revisão: no código anterior, campos medidos antes de essa face chegar
   ficavam com a largura errada até serem editados (o Blockly não mede de novo um campo limpo).
   Conferido no navegador: a folga entre a caixa do campo e o texto desenhado era irregular antes
   (36,2 · 38,3 · 38,6 · 39,7 px) e agora é constante; o cabeçalho "Ao iniciar" ficou com 202,1 px
   de texto + 16 de folga.
3. O fallback pós-carga passou para o mesmo caminho do despacho do Blockly e só trabalha quando
   o evento não veio (antes salvava, regenerava e repintava tudo duas vezes).

⚠️ **Tentado e retirado na revisão:** ligar a memória de larguras do Blockly durante a abertura
inteira. A chave dela é texto + classe, que não descreve a fonte calculada de cada lugar; o ganho
medido depois de retirá-la ficou o mesmo. Não religar sem a prova de geometria igual.

Medido contra a staging atual sem o commit da abertura (mesma máquina, ordem alternada):

| Blocos | Abrir antes | depois | Maior tarefa antes | depois |
|---|---|---|---|---|
| 2 002 | 5,4 a 6,3 s | 4,3 s | 2,1 a 2,2 s | 1,6 a 1,7 s |
| 5 002 | 16,7 a 17,8 s | 13,9 a 14,0 s | 8,3 a 9,3 s | 7,0 a 7,2 s |

"Abrir" é `settledMs` (contagem de blocos desenhados parada por 1 s, acrescentado ao script). Duas
amostras por braço: é ordem de grandeza, não p95.

**O que isso NÃO resolve.** A meta de 8 s com 5 mil blocos continua longe. O que sobra é criar e
desenhar todos os SVGs (criação ~2,2 s, desenho, layout ~1,5 s). Fica descartada a ideia de
recolher os corpos distantes na carga: `render_management.renderBlock` desenha todos os filhos de
um bloco recolhido do mesmo jeito. O caminho que resta é não criar os corpos distantes
(estado JSON guardado fora do workspace e montado ao chegar perto), com `save` recompondo o
estado inteiro. Ainda não foi feito.

## Abertura sem desenhar a cauda distante (20/11/2026, etapa 3)

`packages/studio/src/blockly/deferredTail.ts`. A partir de 1 500 blocos, todos os blocos continuam
CRIADOS (o modelo fica inteiro: gravar, gerar o código, desfazer e copiar leem os blocos vivos do
workspace), mas a cauda de cada área longe da vista inicial não é desenhada na abertura.

**Como funciona**

1. Antes do `load`, só com 1 500 blocos ou mais, o plano estima pelo JSON onde cada unidade
   (filho direto de uma área `sz_frame_*`, na cadeia `next`) vai cair e escolhe, por área, a
   primeira que começa mais de uma tela abaixo da vista inicial (zoom e "blocos no alto" da
   primeira carga; a vista de agora nas recargas da Ponte).
2. Quando essa unidade termina de nascer (`initSvg`, que roda depois dos filhos e da cadeia
   seguinte), ela e tudo o que vem depois saem da página antes do primeiro desenho (a árvore da
   área ainda nem entrou na página), cada unidade num pedaço solto, cortado de baixo para cima.
3. Bloco adiado não é desenhado (`renderEfficiently`), não põe conexão no banco de conexões
   (`setConnectionTracking`: o `appendInternal` liga a árvore inteira num `setTimeout`), não empurra
   vizinhos (`bumpNeighbours`) e, para quem está acima, ocupa `NOTCH_HEIGHT` (`getHeightWidth`), o
   que fecha a conta do anterior exatamente na borda do último desenhado.
4. Quando a vista chega perto do fim do que foi desenhado (rolar, zoom, painel que cresce, mudança
   no projeto), as próximas unidades voltam à página e são desenhadas, sempre de cima para baixo, em
   lotes de até 24 ms. Cada lote mede cada texto uma vez (a mesma memória de larguras que o
   `workspaces.load` do Blockly liga na abertura de sempre, só durante o lote). A raiz se redesenha
   pela fila do próprio Blockly (a área cresce, as conexões vão para o lugar, os vizinhos são
   empurrados como na abertura de sempre).
5. "Mostrar o bloco", o chip do Zappy (`centerOnBlock`), o cursor do código (`select`),
   desfazer/refazer, desencaixar um bloco adiado (`setParent(null)`), "Organizar blocos" e a foto
   dos blocos desenham a cauda até onde precisam antes de medir. Bloco adiado que o Blockly põe
   dentro de um pai desenhado sem passar por "sem pai" sai de novo da página na mesma hora.
   Arrastar uma pilha que leva a cauda NÃO a desenha: da cauda o arrasto só consulta a conexão de
   baixo da pilha, que fica longe durante o gesto (`parkStackBottom`).
6. O módulo só é baixado com o projeto grande, junto da espera da fonte. O `offscreenBodies` para
   no primeiro bloco adiado de cada cadeia (o que não está na página não tem corpo a tirar).

As adaptações em `BlockSvg.prototype` estão marcadas como WORKAROUND no código: o Blockly 12.5.1 não
tem ponto de extensão para desenhar só parte do workspace. O que elas supõem do Blockly instalado
(o `renderBlock`, a ordem da carga, o `setTimeout` das conexões, a conta do `getHeightWidth`, o
`setParent` e o `tightenEfficiently`) está preso em `deferredTail.test.ts`.

**O que divergiu do desenho recomendado, e por quê**

- *Unidade sem id.* Projeto recém-criado de um exemplo nasce da IR sem ids (o Blockly sorteia um
  na carga), e o plano não teria como reconhecer a unidade. O plano sorteia o id da unidade da
  fronteira numa cópia rasa do caminho da área até ela; o estado de quem chamou não muda.
- *Desenhar o lote sem marcar os ancestrais.* `queueRender` num bloco marca todos os pais: com a
  cadeia `next`, desenhar a unidade 500 redesenharia as 499 de cima. O lote é desenhado direto
  (`renderEfficiently`, filhos antes do pai, como o `renderBlock`), e só a raiz entra na fila.
- *O pai reencaixa a unidade.* Quem estava acima posicionou a unidade adiada quando a conexão de
  cima dela ainda estava em (0, 0): sem reencaixar depois do desenho, a unidade ficava deslocada na
  horizontal. Pego pelo teste de geometria.
- *Desencaixar desenha antes.* O Blockly mede a posição do bloco que perde o pai pelo DOM; com a
  unidade fora da página a posição saía errada. Ela é desenhada antes do `setParent(null)`.
- *Pedaços soltos e memória de larguras por lote.* A primeira versão guardava a cauda inteira
  aninhada na fronteira e media cada campo com `getComputedStyle`. Desenhar muitas unidades de uma
  vez crescia com o quadrado da cauda: tirar um nó do DOM custa o tamanho do que está dentro dele
  (o Blink avisa cada descendente), e cada `getComputedStyle` no fundo da cadeia custa a
  profundidade. Num workspace de teste com uma cauda de 2 500 unidades (5 mil blocos), desenhar as
  primeiras 600 levava 5,5 s (3,8 s só em `remove`); com os pedaços soltos, 1,0 s. Desenhar as 2 500
  levava 24 s só com os pedaços soltos, 5,4 s com a memória por lote e 0,93 s de JavaScript com a
  memória e o atalho do `Drawer` do lote 2.2 (que o Estúdio já instala; o workspace de teste não).
- *O arrasto não desenha a cauda.* Desenhá-la no começo do gesto era o caminho direto e custava a
  abertura inteira: arrastar o primeiro evento (a pilha leva todos os de baixo) travava 1,9 s com 2
  mil blocos e 8,3 s com 5 mil (a base, com tudo desenhado, 0,5 s e 2,0 s). A conexão de baixo
  fica longe durante o gesto; o efeito colateral é que, só nesse arrasto, a pilha não encaixa por
  baixo em outro bloco (o fim dela, a milhares de pixels, nem está desenhado).
- *Sem completar a cauda em segundo plano.* Medido (abaixo): com a cauda inteira desenhada a página
  volta a ter a cadeia aninhada inteira, e no Chromium sem interface (headless shell) a aba cai ao
  passar de ~750 unidades desenhadas (a mesma queda da base ao arrastar com 5 mil). Completar em
  segundo plano levaria todo projeto grande a esse estado sem a criança pedir.

**Como foi medido**

Windows 11 Pro, Ryzen 5 5600G (12 processadores lógicos), 32 GB, estação compartilhada (outras
sessões rodavam ao mesmo tempo: as rodadas variam entre si, compare só dentro de uma rodada).
Chromium 156.0.8078.4 completo, sem interface (`PW_CHROMIUM` = o `chromium-1248` do Playwright),
1440×900, fixture `/aula?aula=desafio-primeiro-jogo/desafio-dia-3&escala=N`. Dois builds servidos
lado a lado: **base** = staging no commit anterior ao desta etapa (`ac7174ace`, construído trocando
só os arquivos da etapa de volta) e **candidato** = o código final. `scripts/measure-classic-opening.mjs`
em ordem alternada, contexto novo por amostra; "editável" é o campo 480 à vista e o editor sem a
camada de carregamento (`readyMs`). O script agora grava o resumo do projeto aberto (ids
canonizados, porque o projeto da aula não traz ids e o Blockly sorteia um por abertura) e os erros
da página.

```bash
cd packages/studio
PW_CHROMIUM=…/chromium-1248/chrome-win64/chrome.exe \
SZ_CLASSIC_OPEN_URLS=baseline=http://127.0.0.1:5302,candidate=http://127.0.0.1:5301 \
SZ_CLASSIC_OPEN_SIZES=2000,5000 SZ_CLASSIC_OPEN_REPEATS=3 node scripts/measure-classic-opening.mjs
```

**Abrir** (rodada final; cada célula são as amostras, em s; "maior" é a maior tarefa longa):

| Blocos | Editável, base | Editável, candidato | Maior tarefa, base | Maior tarefa, candidato | Desenhados na página |
|---|---|---|---|---|---|
| 2 002 | 5,13 · 3,84 · 3,81 | 3,10 · 2,18 · 2,16 | 1,61 · 1,24 · 1,14 | 0,97 · 0,54 · 0,51 | 422 → 106 |
| 5 002 | 11,56 · 13,24 · 12,43 | 6,21 · 5,07 · 5,81 | 4,71 · 5,91 · 5,06 | 3,58 · 2,51 · 3,05 | 922 → 106 |
| 10 000 | 38,9 · 33,8 | 15,9 · 16,8 | 26,4 · 21,8 | 12,0 · 12,6 | 1 755 → 106 |

Uma rodada anterior, com a abertura igual à final (as correções seguintes mexeram no que se desenha
depois de abrir), deu 2 002: 4,14 · 3,64 · 3,70 contra 2,23 · 2,07 · 2,12; 5 002: 10,21 · 10,55 ·
10,59 contra 4,21 · 4,49 · 4,64; 10 000: 26,5 · 28,4 contra 11,3 · 12,7. A diferença entre as
rodadas é a máquina; dentro de cada uma, o candidato abre 2,2 a 2,5 vezes mais rápido.

**Editar e mover** (`e2e/classic-scale.spec.ts`, uma amostra por braço, mesmo Chromium):

| Blocos | Abrir, base | candidato | Editar um campo (maior), base | candidato | Mover uma área (maior · soma), base | candidato |
|---|---|---|---|---|---|---|
| 70 (o curso) | 2,3 s | 2,0 s | nenhuma | nenhuma | nenhuma | nenhuma |
| 2 002 | 4,5 s | 2,8 s | 51 ms | 78 ms | 198 · 448 ms | 55 · 55 ms |
| 5 002 | 11,2 s | 5,6 s | 142 ms | 162 ms | 915 · 3 071 ms | 158 · 638 ms |

**Outros gestos com o projeto aberto** (Chromium completo):

| Gesto | Base | Candidato |
|---|---|---|
| Rolar 30 × 900 px, 5 002 blocos | 30 tarefas longas, maior 349 ms, soma 7,3 s | nenhuma tarefa longa |
| Arrastar o primeiro evento (a pilha leva a cauda), 2 002 | maior 479 ms | maior 102 ms |
| Arrastar o primeiro evento, 5 002 | maior 2 004 ms, soma 5,96 s | maior 334 ms, soma 1,05 s |

**Prova de que o projeto não muda**

- Mesma fixture, os dois braços: o estado gravado e o código gerado depois de abrir têm o mesmo
  resumo em todas as amostras (2 002: `12c51686…`/`30ea420a…`; 5 002: `95bb441a…`/`45ddb464…`).
- Os 185 exemplos oficiais e os sete projetos dos cursos: 183 exemplos e todos os cursos ficam
  abaixo de 1 500 blocos e abrem pelo caminho de sempre (o módulo nem é baixado nos cursos;
  `deferredTail.test.ts`). Os dois de cima abrem pelo caminho novo e foram comparados no navegador:
  **Reino Zero** (1 510 blocos, 683 adiados) com estado e código iguais à base; **Reino Zero Ultra**
  (7 297 blocos, 29 adiados) com código igual e estado igual fora a posição da área "Ao iniciar",
  que varia entre aberturas até na base (o empurrão do Blockly é sorteado: y 352 e 348 em duas
  aberturas da base, 363 no candidato).
- `e2e/offscreen-lifecycle.spec.ts` (Blockly de verdade, nas três engines; um workspace normal e um
  adiado com o mesmo projeto, 50 unidades de 31 blocos): estado igual, posição e tamanho de cada bloco desenhado iguais, a área termina na borda
  do último desenhado, nenhum bloco adiado na página nem no banco de conexões, rolar, "Mostrar o
  bloco", o cursor, desfazer/refazer, arrastar, apagar, encaixar na fronteira, troca de pai por
  programa e nada muda abaixo de 1 500. Cada adaptação foi provada por sabotagem (tirá-la reprova o
  teste dela).

**O que não foi atingido, sem enfeite**

- **10 mil blocos não geram código, nem na base.** Os dois braços abrem (o candidato em 16 a 17 s
  nesta rodada, a base em 34 a 39 s), mas `JSON.stringify` do estado estoura a pilha
  (`RangeError: Maximum call stack size exceeded`) e nenhuma edição chega ao código. A causa é a
  forma do estado do Blockly: cada evento mora dentro do `next` do anterior, e a fixture de 10 mil é
  uma cadeia de ~1 660 eventos. Com 6 mil (~990 eventos) o candidato abre em 5,2 s e a edição chega
  ao código; de 7 mil em diante, não. É o mesmo teto que o protótipo de 18/11 achou no
  `IDBObjectStore.put` e não depende do desenho: resolver pede guardar as cadeias sem aninhamento
  (salvar, IndexedDB, nuvem e Ponte), que não é desta etapa.
- **O Chromium sem interface padrão do Playwright (headless shell) cai com a cadeia aninhada
  inteira desenhada.** Na base: arrastar uma área com 5 mil blocos derruba a aba (2 de 2) e abrir 6
  mil ou 10 mil também. No candidato (primeira versão, a mesma abertura), abrir e mexer com 5 mil
  passa (4,1 a 4,7 s, editar 143 ms, mover 141 ms), mas rolar até o fim derruba a aba quando ~4 470 blocos (~745 unidades aninhadas)
  estão desenhados. No Chromium completo, rolar até o fim desenha tudo (18 mil nós na página) e
  mover a área depois custa 91 ms. Não foi medido em navegador com placa de vídeo nem em tablet.
- **"Mostrar o bloco" no fim de um projeto enorme desenha tudo até ele numa tarefa só** (a regra de
  cima para baixo): no workspace de teste, 2 500 unidades em 0,93 s de JavaScript, mais o layout.
  No projeto real não foi medido.
- **Empurrão de vizinhos**: bloco adiado não empurra quem está perto dele até ser desenhado. Só muda
  algo se outra pilha estiver a menos de 28 px de uma conexão da cauda; nos acervos medidos não há.
- **Firefox**: o caminho normal sofre muito mais com a cadeia aninhada. No workspace de teste
  (blocos padrão do Blockly), abrir 300 unidades de 2 blocos leva 80 s; 50 unidades de 31 blocos,
  6 s. O caminho adiado abre 800 unidades de 2 blocos em 1,5 s. O Estúdio no Firefox não foi medido
  com a fixture do Farol.
- A abertura segue dominada por CRIAR os blocos (o `initSvg` e os campos, ~1,6 s com 5 mil no perfil
  de CPU) e pelo `setConnectionTracking(false)` do próprio Blockly, que anda a cadeia inteira para
  cada bloco criado (quadrático na cadeia). Não foi mexido.

### Revisão da etapa 3 (20/11/2026, à noite)

Uma revisão só de leitura dos três commits achou dois defeitos, os dois vindos do mutador de
argumentos (chamar função, `new`, método), que nenhuma fixture da etapa usava. Conferidos no código
e reproduzidos no navegador antes do conserto:

- **A abertura desenhava a cauda inteira em projeto com chamadas de função.** No `FINISHED_LOADING`
  cada bloco com o mutador refazia os espaços e desencaixava o valor de verdade de cada argumento;
  desencaixar um bloco adiado desenha a cauda até ele. Na fixture de 1.651 blocos com uma chamada por
  unidade, nenhum bloco ficava adiado (0 contra mais de 1.400). Conserto na causa: o
  `rebuild_` do mutador passou a ajustar os espaços no lugar (rótulo trocado, espaço novo ou de sobra
  no fim), sem desencaixar nada. De quebra, saiu um defeito antigo, de fora da etapa: a sombra com o
  número que a criança digitou no argumento voltava a 0 em toda abertura do projeto.
- **Um espaço novo num bloco adiado ia para o banco de conexões.** A conexão criada depois da carga
  nasce para entrar no banco no primeiro movimento, e o redesenho da área passava pelos adiados
  (`updateComponentLocations`), pondo-a na origem da fronteira. O adiado agora não acerta posições;
  ao ser desenhado, o caminho de sempre faz isso. A guarda de versão do Blockly prende as duas
  suposições.
- Também: uma falha ao ler a vista ou o estado no plano da cauda (opcional) abre o projeto como
  sempre, em vez de derrubar a carga.

Provas: `e2e/offscreen-lifecycle.spec.ts` ganhou a fixture com o mutador e dois testes (os dois
reprovavam antes; o segundo reprova sem o gancho novo); `classMutators.test.ts` ganhou três (os três
reprovam com o `rebuild_` antigo); as cinco aulas protegidas passam. O pacote de abertura do modo
Blocos foi a 4.749.761 bytes (teto 4.750.000). Com o editor de mundo 3D baixado sob demanda
(`4265fd976`), o pacote foi a 4.221.401 bytes. (A mensagem daquele commit dá um "antes" maior, que
somava trabalho ainda sem commit; a base commitada era 4.749.761.)

### Abrir o projeto reescrevia o programa (20/11/2026, à noite)

Depois do conserto acima, o e2e do Reino Zero Ultra (`reino-zero-ultra.spec.ts`) passou a reprovar:
o jogo voltava à tela de título no meio da partida. O documento da prévia era o mesmo nas duas
versões; o que mudou foi QUANDO ele era trocado. Abrir o projeto mudava o código: o ajuste do
mutador depois da carga completava as chamadas com menos argumentos que a função
(`loadStage(stage.id)` virava `loadStage(stage.id, 0)`), a geração saía diferente e a prévia
recarregava. Com o `rebuild_` antigo isso acontecia logo na abertura, antes de a partida começar
(e a cauda se desenhava quase inteira: sobravam 32 blocos adiados); com o novo, a cauda fica
adiada (7.205 blocos) e a troca chegava segundos depois, no meio do jogo.

O defeito é antigo e é de conteúdo: a quantidade de argumentos é parte do programa. Desde esta data
o mutador só a muda quando a criança mexe (escolhe a função, a classe ou o método, muda os
parâmetros dela, aperta + ou −). Um bloco que vem de um estado guardado (abrir o projeto, a Ponte
refazendo os blocos do código, colar, desfazer) adota a contagem dele e só ganha os rótulos
(`adoptCount_`); a chamada sem argumentos criada por uma carga também (ela não passa pelo
`loadExtraState`). No automático, um parâmetro que ficou sem espaço ganha o +, com o rótulo dele.

Provas: quatro testes novos em `classMutators.test.ts` (menos argumentos, nenhum argumento, o + e a
chamada nova da paleta, que continua ganhando os espaços), e o teste de ida e volta do Ultra
(`reinoZeroUltraExample.test.ts`) agora abre como o editor abre, com a cerca de carga e os eventos
processados (antes ele nunca rodava o ajuste); os dois primeiros e o do Ultra reprovam com o
mutador anterior. `e2e/reino-zero-ultra.spec.ts` e `e2e/offscreen-lifecycle.spec.ts` passam.

## Os 10 mil blocos geram código (21/11/2026, prioridade crítica do relatório de 21/11)

**A causa, medida.** O teto não é da profundidade em si: é a forma dos objetos. O Blockly monta o
estado salvo com `Object.create(null)`. O `JSON.stringify` do V8 anda sem recursão em objetos
comuns, mas nos sem protótipo cai no caminho recursivo. Maior cadeia `next` (elo = bloco → `next`)
que o `JSON.stringify` aguenta, por motor (script de medida no scratchpad desta sessão, o mesmo
formato do estado do Blockly):

| Motor | Objetos comuns | Sem protótipo (o que o Blockly devolve) |
|---|---|---|
| Chromium 156 | mais de 2 milhões | 811 |
| Firefox 157 | 2.021 | 2.021 |
| WebKit 27.2 | 19.999 | 19.999 |
| Node 24 (o BFF) | 2.385 | 1.069 |
| Bun (JSC) | 19.999 | 19.999 |

A fixture de 10 mil é uma cadeia de cerca de 1.660 eventos: passa de 811, por isso de 7 mil em
diante nenhuma edição chegava ao código no Chromium.

**O conserto (sem mudar o formato salvo).**
- `blockly/savedWorkspaceState.ts`: todo estado que sai do Blockly para o projeto passa pela
  `jsonPlainCopy` (`blockly/jsonPlainCopy.ts`), uma cópia iterativa com a semântica exata do JSON
  (não finito vira `null`, `undefined` some, `toJSON`, ciclo lança). Os cinco `workspaces.save` do
  `BlocklyPanel` usam o helper; nada sem protótipo chega ao store, à Ponte, à nuvem ou à exportação.
- Caminhadores que recursavam no `next`, agora com pilha explícita: a área de transferência
  (`blockClipboard.ts`: ler os tipos, ids novos ao colar; o copiar engolia o erro e a cópia sumia
  calada; o colar usava `structuredClone`, que também recursa no V8), os campos de sprite e de
  animação, o `retypeParamsAsArgs` da Ponte e a explicação de uma recusa
  (`describeBlockFailure`, que além disso copiava o caminho a cada nível: trabalho quadrático).
- Testes vermelhos antes e verdes depois: `savedWorkspaceState.test.ts`, a cauda de 100 mil em
  `blockClipboard.test.ts` e a recusa no fim de 20 mil em `projectValidation.test.ts`.

**Resultado, `e2e/classic-scale.spec.ts` com `CLASSIC_SCALE_SIZES=10000` (Windows, local, 10.000
blocos no projeto):**

| Navegador | Abrir | Editar um campo (maior tarefa) | Mover a área (maior tarefa) | Edição chega ao código |
|---|---|---|---|---|
| Chromium 156 | 14,8 s | 220 ms | 643 ms | sim |
| Firefox 157 | 33,9 s | sem a API de tarefas longas | sem a API | sim |
| WebKit 27.2 | 19,5 s | sem a API | sem a API | sim |

Antes do conserto, o mesmo teste reprovava no Chromium: a edição não chegava ao código em 60 s.

**O que ainda falta, sem enfeite.**
- **Uma sequência única de 10 mil blocos** (um bloco por elo, sem corpo) esbarra no próprio
  Blockly 12, que recursa no `next` ao carregar, salvar e descartar. Medido num workspace sem tela:
  5.000 passa nos três; 10.000 estoura o load no Chromium e o save no Firefox (o WebKit passa). E o
  `JSON.stringify` do Firefox e do Node (BFF) recursa mesmo com objetos comuns (2.021 e 2.385
  elos). Resolver isso pede o formato plano das cadeias e carregar, salvar e descartar elo a elo
  (o conserto B do plano, autorizado por ela se a medição pedisse). No formato dos jogos (eventos
  com corpo) o Blockly aguenta 12 mil blocos nos três.
- **"O mesmo código do caminho sem montagem sob demanda" com 10 mil** ainda não foi comparado: a
  comparação de dois braços (`scripts/measure-classic-opening.mjs`) é pesada e vai para um job do
  CI.
- O `canonicalJson` do core (hashes das partes da nuvem) continua recursivo; com o formato dos jogos
  ele não estoura, e mexer nele muda bytes que a nuvem confere. Fica para o conserto B.

### O Python ainda não passa pela cópia segura (medido em 21/11/2026, revisão do lote 1)

O editor de blocos do Python salva por outro caminho (`python/blocks/workspaceState.ts`,
`savePythonWorkspace` e `rebasePythonWorkspaceState`): copia o `save` cru do Blockly com
`structuredClone`, que também recursa. Medido com uma cadeia no formato do estado do Python
(script `sc-browsers.mjs` da sessão, `structuredClone` direto na página):

| Navegador | Objetos sem protótipo (o que o Blockly devolve) | Objetos comuns |
|---|---|---|
| Chromium 159 completo | **859 blocos** | 1.628 blocos |
| Firefox do Playwright | mais de 400 mil | mais de 400 mil |
| WebKit do Playwright | 19.998 | 19.998 |

Uma sequência de ~860 instruções no mesmo corpo derruba o salvar do Python no Chromium. A
comparação `samePythonWorkspaceProgram` também recursa bloco a bloco. Fica para o lote 3, com a
medição no editor de verdade, e o comentário de `savedWorkspaceState.ts` deixou de dizer que todo
estado passa por ali.

## Conserto B: a sequência única de 10 mil blocos (lote 3, 21/11/2026)

**O Python primeiro** (`fce7540e4`): o `rebasePythonWorkspaceState` copia o estado com a
`jsonPlainCopy` e o `samePythonWorkspaceProgram` tira a apresentação com pilha explícita; o estado
que vai ao Zappy sai em objetos comuns. Testes de 30 mil e 18 mil blocos reprovam na versão antiga.

**A sequência única no Clássico, medida no navegador.** Para medir, o playground ganhou
`&forma=sequencia` (`playground/lessonHarness.tsx`): em vez de repetir eventos curtos, completa o
projeto até N blocos com instruções seguidas ("Código avançado JavaScript") no corpo do primeiro
evento. Com 10 mil blocos no Chromium 159:

1. **O editor quebrava inteiro** ("A IDE encontrou um erro inesperado"): o seletor da barra que
   procura blocos 3D (`projectHas3DConsumer`) fazia `JSON.stringify` do estado a cada mudança, e o
   nativo estoura numa cadeia de 20 mil níveis. Conserto: `jsonStringify` (`blockly/jsonPlainCopy.ts`),
   o mesmo texto do `JSON.stringify`, sem recursão, com testes diferenciais (embrulhos, `-0`,
   omitidos, texto com surrogates, ciclos, cadeia de 200 mil níveis). Usado no seletor e nas sete
   impressões digitais do estado no `BlocklyPanel`.
2. **Com o editor de pé, apareceu perda de dados calada.** O `load` do Blockly 12 parava no meio: o
   desenho recursa na cadeia de pais (`queueRender` no gerenciador de desenho) e estoura por volta de
   2 mil blocos seguidos. O erro virava só um aviso no console, e a regeneração seguinte gravava o
   workspace parcial: o projeto passava de 10.000 para ~2.150 blocos, sem nada na tela. Conserto
   (`BlocklyPanel.tsx`): uma restauração que falha trava a gravação do estado dos blocos até uma
   carga dar certo, limpa o workspace sem gerar eventos e mostra na área de blocos "Não deu para
   abrir estes blocos. Nada foi perdido...". O código continua editável pela Ponte. Teste:
   `e2e/classic-long-sequence.spec.ts` (o recado aparece e o projeto continua com os 10.000 blocos;
   vermelho com o `BlocklyPanel` anterior). A trava vale para qualquer falha de carga, não só para
   esta.

**Os 10 mil no formato dos jogos seguem abrindo** (eventos com corpo): `classic-scale` com 10.000,
Chromium 159, abrir 17,7 s, edição de campo chega ao código (`setupStage(500, 360,`), projeto com
os 10.000 blocos. As cinco aulas protegidas passam.

**O que falta do conserto B, sem enfeite.**
- Abrir a sequência única no editor de blocos: a cauda adiada (`deferredTail.ts`) solta da cadeia
  os eventos distantes durante a carga, e por isso o formato dos jogos não esbarra no desenho
  recursivo; uma sequência dentro de UM corpo não é dividida. Estender a divisão para dentro dos
  corpos mexe nos ganchos do Blockly que o módulo já adapta, com a guarda de atualização.
- As migrações antigas (`migrateIfElse`, `migrateValueFields`) clonam por `JSON.parse(JSON.stringify())`
  e andam o estado com recursão; só rodam em projeto de formato antigo.
- O `canonicalJson` do core (hashes das partes da nuvem) continua recursivo.
