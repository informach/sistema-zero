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
