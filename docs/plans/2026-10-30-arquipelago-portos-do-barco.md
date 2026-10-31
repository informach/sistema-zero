# Portos do barco: a entrega de arte

Resposta ao pedido "Pedidos de arte para completar a entrega integral" (base staging `6461f19c0`,
30/10/2026), prioridade 1: os cinco pontos de embarque da rede do barco. Esta entrega é só de arte
(geradores, GLBs, relatório e testes contra os arquivos). A rede, as rotas, as boias, a espera pelo
chão e o embarque no navegador continuam com a sessão do jogo.

## O que foi feito

- Os cinco modelos de sempre, sem modelo paralelo: `src/assets/ilhas/bosque.glb`, `vila-doce.glb`,
  `pico.glb`, `vale-dos-dinos.glb` e `nuvens.glb`. Nada foi removido nem renomeado; origem, escala e
  rotação continuam as mesmas. Cada um ganhou o nó `porto` (o desenho), as âncoras `barco` e `cais` e
  os colisores do porto.
- Um módulo só para os cinco: `arte/mundo/lib_cais.py` (`deque_de_praia` e `torre_de_escada`). O lugar
  de cada porto fica no `PORTO` do script da ilha (`arte/ilhas/bosque.py`, `vila_doce.py`,
  `arte/ilhas-b/pico.py`, `vale.py`, `nuvens.py`), medido no `col-terreno`.
- O mesmo arranjo do cais do Recife, para o embarque valer igual: o barco atraca ao lado da ponta do
  deque, com o meio dele a 2,2 m do eixo, proa para o mar (o +x da âncora `barco`); os pés ficam na
  âncora `cais`, no meio do tampo, 1,2 m antes da ponta, no topo do `col-cais-deque` (0,89 acima do
  mar). Do lado do barco não há estaca nos últimos 2,8 m do deque: ali a criança passa do tampo ao
  convés. O jogo reaproveita o `ilhas/barco.glb` e a âncora `passageiro`.
- Colisores: o que se pisa é `col-cais-*` (`col-cais-beira`, as tábuas que entram no tampo;
  `col-cais-deque`; nas Nuvens também `col-cais-degrau`, `col-cais-patamar` e `col-cais-ponte`); o miolo
  da torre é `col-cais-torre`; o guarda-corpo é `col-guarda-cais-*` e as estacas são
  `col-cil-estaca-cais-*` (a câmera passa por esses dois, pelos prefixos que já existem em
  `SO_PARA_O_CORPO`).
- O relatório de cada ilha (`arte/ilhas/relatorio.json`, `arte/ilhas-b/relatorio.json`) traz o bloco
  `porto` com tudo o que vem abaixo. Os dois `build_all.py` conferem o nó, as âncoras e os grupos de
  colisores do porto.
- Prints: `docs/qa/2026-10-30-portos-do-barco/` (os quatro deques, a torre de dia e de noite, com as
  escotilhas e o farolete acesos).

## A conferência

`packages/arquipelago/tests/portos-das-ilhas.test.ts` (31 testes, contra os GLBs):

- `barco` na linha d'água (y 0; nas Nuvens, −7 no arquivo), proa para fora da ilha e o `cais` na mesma
  posição relativa do Recife (lida do `recife.glb`);
- os pés do `cais` no topo de um `col-cais-*`, com a cápsula do corpo cabendo;
- a busca em grade (`gradeDeAndar`, passos de 25 cm, degrau e rampa do corpo) anda do `cais` até um
  ponto do tampo longe da beira; nas Nuvens, pela torre inteira;
- o casco atracado (5 × 2 m, da quilha a 0,85 m abaixo da âncora até 2,3 m acima) não encosta em
  colisor nem no chão da ilha;
- o corredor do casco, da proa até 25 m para fora com 5 m de meia largura, sem colisor nem chão;
- nas Nuvens, todo espelho até 0,30 m, do fundo da escadinha do mar até a ponte, e nenhum degrau
  com outro piso a menos de 2,4 m acima dele.

Os testes antigos continuam passando. Mudaram só as contagens de colisores (Vale 62 → 70, Pico 173 →
180, Nuvens 50 → 110) e as conferências da espera pelo chão do Vale, do Pico e das Nuvens, que agora
deixam o porto de fora (`doPortoDoBarco`, em `tests/ajuda-colisores.ts`), até a espera ser
recalculada (abaixo).

## Os números de cada ilha

Coordenadas no referencial do modelo (o jogo gira a ilha para a ponte ficar no +x). Nas Nuvens, y do
arquivo; no mundo, some 7.

### Bosque dos Bichos (`bosque.glb`)

- Tipo: deque de praia, rumo de 180° no chão do modelo (do +x para o +z).
- `barco`: x -25,90, y 0,00, z 2,20; giro em y de 180° (o +x da âncora, a proa, aponta para o mar).
- `cais`: x -24,70, y 0,89, z 0,00.
- Ligação com o terreno: x -19,30, z 0,00, tábuas a y 1,12 (beira do tampo; as tábuas da beira entram 1,2 m no tampo , a y = 1).
- Acesso: largura livre 1,58 m entre as estacas; degrau de 0,12 do tampo para as tábuas da beira e de 0,23 das tábuas para o deque; sem rampa; céu aberto.
- Caixa do porto (desenho): x -26,17 a -18,12, y -2,50 a 3,02, z -1,29 a 1,05.
- Caixa da ilha: sem o porto x -22,54 a 14,34, z -15,41 a 14,17; com o porto x -26,17 a 14,34, z -15,41 a 14,17, y -2,50 a 14,44. O ponto do porto mais longe do meio, no chão: 26,19 m.
- Corredor livre do casco (da proa até 25 m para fora, meia largura 5 m), cantos (x, z): (-28,40, 7,20); (-28,40, -2,80); (-53,40, -2,80); (-53,40, 7,20).

### Vila Doce (`vila-doce.glb`)

- Tipo: deque de praia, rumo de 180° no chão do modelo (do +x para o +z).
- `barco`: x -18,40, y 0,00, z 4,25; giro em y de 180° (o +x da âncora, a proa, aponta para o mar).
- `cais`: x -17,20, y 0,89, z 2,05.
- Ligação com o terreno: x -12,70, z 2,05, tábuas a y 1,12 (beira do tampo; as tábuas da beira entram 1,2 m no tampo , a y = 1).
- Acesso: largura livre 1,58 m entre as estacas; degrau de 0,12 do tampo para as tábuas da beira e de 0,23 das tábuas para o deque; sem rampa; céu aberto.
- Caixa do porto (desenho): x -18,67 a -11,54, y -2,50 a 3,02, z 0,76 a 3,10.
- Caixa da ilha: sem o porto x -15,44 a 13,82, z -13,79 a 15,01; com o porto x -18,67 a 13,82, z -13,79 a 15,01, y -2,50 a 10,55. O ponto do porto mais longe do meio, no chão: 18,70 m.
- Corredor livre do casco (da proa até 25 m para fora, meia largura 5 m), cantos (x, z): (-20,90, 9,25); (-20,90, -0,75); (-45,90, -0,75); (-45,90, 9,25).

### Pico Gelado (`pico.glb`)

- Tipo: deque de praia, rumo de 250° no chão do modelo (do +x para o +z).
- `barco`: x -4,36, y 0,00, z -18,42; giro em y de 110° (o +x da âncora, a proa, aponta para o mar).
- `cais`: x -6,02, y 0,89, z -16,54.
- Ligação com o terreno: x -4,55, z -12,50, tábuas a y 1,12 (beira do tampo; as tábuas da beira entram 1,2 m no tampo , a y = 1).
- Acesso: largura livre 1,58 m entre as estacas; degrau de 0,12 do tampo para as tábuas da beira e de 0,23 das tábuas para o deque; sem rampa; céu aberto.
- Caixa do porto (desenho): x -7,62 a -3,35, y -2,50 a 3,02, z -17,91 a -11,10.
- Caixa da ilha: sem o porto x -30,53 a 14,52, z -15,45 a 13,91; com o porto x -30,53 a 14,52, z -17,91 a 13,91, y -2,50 a 11,32. O ponto do porto mais longe do meio, no chão: 19,10 m.
- Corredor livre do casco (da proa até 25 m para fora, meia largura 5 m), cantos (x, z): (-9,92, -19,06); (-0,52, -22,48); (-9,07, -45,97); (-18,47, -42,55).

### Vale dos Dinos (`vale-dos-dinos.glb`)

- Tipo: deque de praia, rumo de 180° no chão do modelo (do +x para o +z).
- `barco`: x -18,30, y 0,00, z 2,20; giro em y de 180° (o +x da âncora, a proa, aponta para o mar).
- `cais`: x -17,10, y 0,89, z 0,00.
- Ligação com o terreno: x -12,40, z 0,00, tábuas a y 1,12 (beira do tampo; as tábuas da beira entram 1,2 m no tampo , a y = 1).
- Acesso: largura livre 1,58 m entre as estacas; degrau de 0,12 do tampo para as tábuas da beira e de 0,23 das tábuas para o deque; sem rampa; céu aberto.
- Caixa do porto (desenho): x -18,57 a -11,22, y -2,50 a 3,02, z -1,29 a 1,05.
- Caixa da ilha: sem o porto x -15,06 a 14,09, z -14,90 a 14,71; com o porto x -18,57 a 14,09, z -14,90 a 14,71, y -2,50 a 11,65. O ponto do porto mais longe do meio, no chão: 18,60 m.
- Corredor livre do casco (da proa até 25 m para fora, meia largura 5 m), cantos (x, z): (-20,80, 7,20); (-20,80, -2,80); (-45,80, -2,80); (-45,80, 7,20).

### Ilha das Nuvens (`nuvens.glb`)

- Tipo: torre de escada (ilha que flutua), rumo de 215° no chão do modelo (do +x para o +z).
- `barco`: x -21,22, y -7,00, z -13,27; giro em y de 145° (o +x da âncora, a proa, aponta para o mar).
- `cais`: x -18,98, y -6,11, z -14,39.
- Ligação com o terreno: x -9,07, z -7,45, tábuas a y 1,12 (fim da ponte, 0,8 m dentro do tampo; y = 1 no arquivo, 8 no mundo).
- Acesso: largura livre 1,70 m; 29 espelhos de 0,2493 m em três lances (10, 10, 9), pisadas de 0,44, 0,44, 0,50 m, inclinação média dos lances 31,9, 31,9, 29,3°; subida total 7,23 m; céu aberto (nenhum lance passa debaixo de outro). Escadinha do mar: 7 degraus de 0,25 × 0,30 até y -7,86.
- Caixa do porto (desenho): x -20,44 a -6,60, y -9,50 a 4,16, z -18,29 a -6,75.
- Caixa da ilha: sem o porto x -19,20 a 12,40, z -12,39 a 15,24; com o porto x -20,44 a 12,40, z -18,29 a 15,24, y -9,50 a 10,23. O ponto do porto mais longe do meio, no chão: 25,35 m.
- Corredor livre do casco (da proa até 25 m para fora, meia largura 5 m), cantos (x, z): (-26,14, -10,61); (-20,40, -18,80); (-40,88, -33,14); (-46,62, -24,95).

## O percurso das Nuvens, do mar ao tampo

A ilha flutua com o tampo a y = 8 no mundo. O deque fica no mar no rumo de 215° (do lado de fora,
entre a plataforma 1, no −x, e o mirante, no −z), e a torre fica do lado −z do eixo, longe das
plataformas e do caminho delas. Não há elevador, teleporte nem peça que se mexe.

1. O barco atraca ao lado da ponta do deque do mar; a criança desce no `cais` (y 0,89 no mundo).
2. Pelo deque, até o canto A da torre (o começo do deque, junto dela).
3. Lance 1: 10 espelhos de 0,249 m pelo lado de fora da torre até o patamar B.
4. Lance 2: 10 espelhos pelo fundo da torre até o patamar C.
5. Lance 3: 9 espelhos, junto da ilha, até o patamar D (y 8,12 no mundo).
6. A ponte de 1,7 m de largura passa sobre o vão e entra 0,8 m no tampo da ilha.

Os três lances dão a volta num miolo fechado de madeira (o guarda-corpo de dentro), com pilares nos
cantos, escotilhas que acendem à noite e o farolete no alto. Nenhum lance passa debaixo de outro: a
altura livre é o céu. O lado de fora tem guarda-corpo do mar ao alto (1 m, colisor até 1,1 m), com
1,7 m livres. Na ponta do deque, do lado de lá do barco, fica a escadinha de sair do mar: quem cair
na água sobe por ela, como numa praia (7 degraus de 0,25 até 0,85 m debaixo d'água).

## Limites dos colisores novos

Caixas que envolvem cada grupo (x, y e z do modelo; nas Nuvens, y do arquivo).

#### bosque
| Grupo | Nós | x (de, até) | y (de, até) | z (de, até) |
|---|---|---|---|---|
| `col-cais-beira` | 1 | -19,70 a -18,10 | 0,80 a 1,12 | -0,85 a 0,85 |
| `col-cais-deque` | 1 | -25,95 a -19,70 | 0,49 a 0,89 | -0,85 a 0,85 |
| `col-cil-estaca-cais` | 6 | -25,89 a -20,27 | -2,50 a 2,40 | -1,05 a 1,05 |

#### vila-doce
| Grupo | Nós | x (de, até) | y (de, até) | z (de, até) |
|---|---|---|---|---|
| `col-cais-beira` | 1 | -13,70 a -11,50 | 0,80 a 1,12 | 1,20 a 2,90 |
| `col-cais-deque` | 1 | -18,45 a -13,70 | 0,49 a 0,89 | 1,20 a 2,90 |
| `col-cil-estaca-cais` | 5 | -18,39 a -14,27 | -2,50 a 2,40 | 1,00 a 3,10 |

#### pico
| Grupo | Nós | x (de, até) | y (de, até) | z (de, até) |
|---|---|---|---|---|
| `col-cais-beira` | 1 | -5,48 a -3,34 | 0,80 a 1,12 | -13,16 a -11,08 |
| `col-cais-deque` | 1 | -7,25 a -3,89 | 0,49 a 0,89 | -18,00 a -12,58 |
| `col-cil-estaca-cais` | 5 | -7,36 a -3,93 | -2,50 a 2,40 | -17,35 a -13,09 |

#### vale-dos-dinos
| Grupo | Nós | x (de, até) | y (de, até) | z (de, até) |
|---|---|---|---|---|
| `col-cais-beira` | 1 | -12,80 a -11,20 | 0,80 a 1,12 | -0,85 a 0,85 |
| `col-cais-deque` | 1 | -18,35 a -12,80 | 0,49 a 0,89 | -0,85 a 0,85 |
| `col-cil-estaca-cais` | 6 | -18,29 a -13,37 | -2,50 a 2,40 | -1,05 a 1,05 |

#### nuvens
| Grupo | Nós | x (de, até) | y (de, até) | z (de, até) |
|---|---|---|---|---|
| `col-cais-degrau` | 33 | -19,12 a -7,65 | -8,16 a 0,87 | -17,30 a -9,16 |
| `col-cais-deque` | 1 | -20,52 a -14,70 | -6,51 a -6,11 | -15,84 a -11,01 |
| `col-cais-patamar` | 3 | -13,88 a -6,62 | -3,92 a 1,12 | -18,27 a -7,69 |
| `col-cais-ponte` | 1 | -10,95 a -8,58 | 0,82 a 1,12 | -9,12 a -6,75 |
| `col-cais-torre` | 1 | -14,70 a -9,12 | -9,50 a 2,22 | -15,76 a -10,19 |
| `col-cil-estaca-cais` | 10 | -19,43 a -6,59 | -9,50 a -1,42 | -18,30 a -12,37 |
| `col-guarda-cais` | 11 | -16,37 a -6,65 | -6,11 a 2,32 | -18,24 a -7,20 |

## O que fica para a sessão do jogo

- `mundo/portos.ts` (`ancorasDoPorto`) monta o mundo com y = 0. Para as Nuvens, a ilha está no grupo
  a y = `ALTURA_DAS_NUVENS`: some 7 ao y (o `barco` volta para o mar, y 0, e o `cais` para 0,89).
- Espera pelo chão e carregamento: o porto passa do raio de espera atual (Bosque 26,2 m, Vila
  18,7 m, Pico 19,1 m, Vale 18,6 m, Nuvens 25,4 m do meio, contra 16 m no Vale e 19,2 m nas Nuvens).
  Quem fechar o jogo em cima do deque volta fora da espera. Na hora de ligar a rede, vale estender a
  espera na direção do porto (como a da caverna do Pico) e tirar o `doPortoDoBarco` dos três testes de
  espera.
- Boias: as rodas do anel ficam a 19 m; o deque e o barco atracado cruzam essa roda nas cinco ilhas
  (no Bosque a roda é puxada para a ponta de campo). O corredor do casco foi conferido contra os
  colisores e o chão; a abertura das boias é do jogo.
- Bosque: o deque chega atrás do lote da cabana (o lote vai até x −18; a beira do tampo fica em
  x −19,3). Com o lote vazio a busca em grade passa pelo meio; com uma cabana cheia no lote, sobra a
  faixa do tampo atrás dela e a praia.
- As âncoras e colisores estão nos arquivos que o jogo já carrega: os deques já aparecem e já se pisam
  nas ilhas completas, mesmo antes da rede.

## Sem pedido de arte novo

Roupas, ampliações e terraformação da L11 ficam como estavam no pedido: nenhum modelo foi feito por
suposição.
