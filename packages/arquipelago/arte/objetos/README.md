# Objetos com função da casa no Blender

Os objetos que a casa ganha pelos pedidos e desafios: geladeira (nas duas versões do projeto
azul), forno, aquário, lareira, instrumentos da banda, fliperama, museu dos fósseis, casinha de
bicho e a planta de interior em vaso (29/10/2026, para o aconchego dos cômodos novos). Cada grupo tem um script que monta o modelo no Blender sem tela (o mesmo `bpy` dos itens,
do mundo e dos personagens) e grava um GLB em `src/assets/objetos/<id>.glb`. Os objetos ainda não
estão ligados ao jogo.

Pela proposta, a moeda compra o visual pronto e a função vem dos pedidos e desafios: a geladeira
vem do primeiro pedido da ilha (holograma que guarda 4 alimentos; com aparência, guarda 12 e
conserva), o bolo de fubá e o pão de queijo vão no forno, o Recife Coral pede o aquário, o Pico
Gelado a lareira e a banda, o Vale dos Dinos o museu, o Bosque dos Bichos a casinha, e os
minijogos aprovados viram fliperama.

## Rodar

```sh
# todos os objetos, a conferência do contrato, a busca de faces coplanares e o relatorio.json
/tmp/claude-0/blender-venv/bin/python -B arte/objetos/build_all.py

# um grupo, ou só um arquivo dele
/tmp/claude-0/blender-venv/bin/python -B arte/objetos/aquario.py
ITEM=geladeira-holograma /tmp/claude-0/blender-venv/bin/python -B arte/objetos/geladeira.py

# prévia de um quadro do meio de um clipe: grava um GLB parado na pasta das prévias
# (PREVIAS_OUT, padrão a pasta do scratchpad desta frente) e não mexe no arquivo do jogo
POSE=abrir:18 ITEM=geladeira /tmp/claude-0/blender-venv/bin/python -B arte/objetos/geladeira.py

# prévia grande de um arquivo, com o render dos itens
DIR=0.75,-1.25,0.85 RES=480 AMOSTRAS=24 /tmp/claude-0/blender-venv/bin/python -B \
  arte/itens/render.py previa /tmp/geladeira.png src/assets/objetos/geladeira.glb

# faces coplanares e emendas em T (--separados só na banda e no museu, em que cada nó é uma peça)
bun scripts/faces-coplanares.ts src/assets/objetos/forno.glb
bun scripts/faces-coplanares.ts --separados src/assets/objetos/banda.glb
```

`OBJETOS_OUT=/outra/pasta` grava os GLBs em outro lugar.

## Ajudantes

`lib_objetos.py` importa a `arte/itens/lib_itens.py` e reaproveita as formas, a paleta,
`exportar` e `rodar`. Antes de qualquer exportação ele troca `lib_itens.SAIDA` para
`src/assets/objetos` e `lib_itens.RELATORIO` para `arte/objetos/relatorio.json` (a lib dos itens
lê as duas na hora de exportar). Ele também acrescenta:

- a paleta dos objetos e os translúcidos (`vidro`, `agua`, `projetoAzul`, `prateleira`, `gaveta`,
  `garrafa`, `bolha`, `vidroForno`, `gelatina`);
- `caixa_redonda`, `barra` (vareta entre dois pontos), `booleana` (recorte, com `fechar_emendas`
  costurando as emendas em T que o recorte deixa) e `mover`;
- `uv_plano`: coordenadas de textura de 0 a 1 numa face plana;
- `exportar(..., uv=True)`: grava as coordenadas de textura (usado na geladeira e no fliperama);
- `POSE=clipe:quadro`: a prévia parada no meio de um clipe.

## Convenções

- **Origem, eixos e footprint:** no Blender o z aponta para cima e a frente olha para −Y; o glTF
  converte para o y para cima do three.js (a frente vira +Z). 1 célula = 1 unidade, paredes de 4
  de altura, avatar de uns 1,6. Cada arquivo tem a base em y = 0 e fica centrado no seu footprint
  em células (tabela abaixo). Nada passa do footprint, a não ser a porta aberta durante o clipe.
- **Nós:** nós com mais de um material viram um grupo com uma malha por material no three.js; o
  nome do grupo é o nome do nó. A pose de repouso de cada nó não tem giro.
- **Peças soltas (banda e museu):** cada nó tem o pivô no meio da sua própria base (y = 0), e a
  posição do nó é o lugar dele na arrumação do arquivo. O jogo pode copiar um nó e pôr onde quiser.
- **Materiais pelo nome:** cores chapadas, sem texturas. O que acende sai com força de emissão 1
  e o jogo regula o brilho: `luz` (lâmpadas e letreiro), `fogo` e `brasa` (lareira), `chama`
  (velas), `tela`, `projetoAzul` e `projetoAzulLinha`. Na placa e na casinha, a face lisa do nó
  `texto` usa `placaFace`, como as placas dos itens.
- **Projeto azul:** `projetoAzul` são as faces translúcidas (alfa 0,32) e `projetoAzulLinha` o
  contorno e as linhas da grade da planificação, mais fortes. Como na bancada, o jogo deve somar a
  luz (`AdditiveBlending`, sem `depthWrite`).
- **Faces que recebem imagem:** `pintaFrente`, `pintaLadoEsq`, `pintaLadoDir`, `pintaTopo` e
  `tela` (no fliperama) têm coordenadas de textura de 0 a 1, com u para a direita e v para cima de
  quem olha a face de fora (o topo, visto de cima, com a frente embaixo). A cor de base é a do
  objeto sem pintura (cada script troca a cor dos `pinta*` pela da peça, então o modelo não muda);
  ao pôr a imagem no `map`, o jogo põe a cor em branco. Uma face pode ser feita de várias peças
  (as duas portinhas do aquário: `uv_plano_juntos`, a mesma projeção em todas).
- **Clipes:** gravados como faixas do NLA, um clipe do glTF por nome. `abrir` toca uma vez
  (`LoopOnce` com `clampWhenFinished`); `nadar` e `crepitar` são laços.

## O que o jogo usa e o que falta (modo construção, 28/10/2026)

- O jogo lê o catálogo com o molde de cada objeto no contrato (`arquipelago-contracts/src/objetos.ts`,
  `CATALOGO_DE_OBJETOS`), com a área e a caixa desta página.
- **Holograma:** só a geladeira tem (`geladeira-holograma.glb`). Os outros aparecem em projeto azul
  com os materiais trocados por um azul translúcido no código (`mundo/objetos-da-casa.tsx`). Falta,
  se a dona quiser o mesmo acabamento, um `<id>-holograma.glb` de cada um, com `projetor` e as
  faces em `projetoAzul` e `projetoAzulLinha`.
- **Faces do Pinta (29/10/2026, fase3-11):** a geladeira, o forno, o aquário, a casinha, o museu e
  a planta de interior têm faces `pinta*`, e o fliperama a `tela` (medidas em cada arquivo abaixo,
  as mesmas do catálogo). A lareira e a banda ficam sem faces de propósito: a lareira é toda de
  tijolinhos em relevo (pintar por baixo deles estragaria o desenho) e os instrumentos da banda têm
  formas diferentes demais para uma imagem só. Sem faces, o molde vai sem elas e o jogo deixa o
  "Pintar no Pinta" desligado; o Molda vale para todos.

## Contrato de cada arquivo

### `geladeira.glb` (footprint 1 × 1)

- `geladeira`: o corpo oco de quinas arredondadas, o rodapé com a grade de respiro, três
  prateleiras de vidro, a gaveta de legumes, a luzinha de dentro (`luz`) e os alimentos (bolo de
  fubá, gelatina, ovos, caixa de leite, queijo, maçãs, jarra de suco, potinhos, cenouras e alface).
- `porta`: a porta com o puxador, o forro, duas prateleiras de porta com garrafas, leite e ovos.
  Pivô na dobradiça, na quina da frente à esquerda (x −0,41, y 0,15, z +0,375 no three.js).
- Clipe `abrir`: 0,75 s, toca uma vez; a porta gira para a esquerda e para aberta em −105° em
  volta do eixo vertical.
- Faces do Pinta (a parte plana, sem o arredondado das quinas; largura × altura):

  | Material | Onde | Tamanho |
  |---|---|---|
  | `pintaFrente` | frente da porta, de y 0,19 a 1,70; é onde o avatar abre a porta | 0,74 × 1,51 |
  | `pintaLadoEsq` | lado esquerdo (−X), de y 0,105 a 1,685 | 0,54 × 1,58 |
  | `pintaLadoDir` | lado direito (+X), de y 0,105 a 1,685 | 0,54 × 1,58 |
  | `pintaTopo` | topo, em y 1,745 | 0,70 × 0,54 |

  A caixa inteira tem 0,82 de largura, 1,745 de altura (com os pezinhos) e 0,75 de fundo com a
  porta (0,83 com o puxador). A planificação do Pinta pode usar estas medidas na mesma proporção.

### `geladeira-holograma.glb` (footprint 1 × 1)

- `projetor`: a base escura de cantos redondos com as luzes azuis (`projetor`, `projetorLuz`).
- `geladeira`: o corpo em holograma (as mesmas medidas da completa, flutuando 0,07 acima do
  chão), o contorno, a grade da planificação nos lados e no topo, a linha de cada prateleira e a
  grade do rodapé.
- `porta`: a porta em holograma com a grade da frente e o puxador; pivô na dobradiça, como na
  completa (x −0,41, y 0,17, z +0,375).
- Clipe `abrir`: o mesmo da completa (0,75 s, uma vez, para em −105°).

### `forno.glb` (footprint 1 × 1)

- `forno`: fogão a gás creme e vermelho com quatro bocas e grelhas, cinco botões, o espelho de
  trás com o relógio, e o miolo do forno com a grade, os trilhos, a luz (`luz`) e o bolo de fubá
  crescendo na forma.
- `porta`: a porta do forno com o vidro (`vidroForno`, translúcido), a moldura e o puxador. Pivô na
  dobradiça, embaixo na frente (x 0, y 0,12, z +0,34).
- Clipe `abrir`: 0,75 s, toca uma vez; a porta deita para a frente e para em 88°.
- Faces do Pinta, na cor creme do forno: `pintaFrente` na frente da porta, em volta do vidro
  (0,66 × 0,43), e `pintaLadoEsq` e `pintaLadoDir` na parte plana dos lados do corpo (0,53 × 0,72).
  O topo é a mesa das bocas: sem face.

### `aquario.glb` (footprint 2 × 1)

- `aquario`: o móvel com duas portinhas (um peixinho recortado em cada), o vidro (`vidro`), a água
  (`agua`), a areia com dunas, pedrinhas coloridas, duas pedras, algas, a planta de folhas
  largas, o coral rosa, a estrela-do-mar, o baú aberto com moedas e a barra de luz (`luz`).
- `peixe-1` (palhaço), `peixe-2` (cirurgião-azul), `peixe-3` (amarelo), `peixe-4` (rosa): pivô no
  meio do corpo; no repouso a cabeça olha para +X.
- `bolha-1` a `bolha-6`: as bolhas que saem do baú.
- Clipe `nadar`: 6 s, em laço. Os peixes nadam em faixas de altura e de lugar que não se cruzam
  (o palhaço numa volta grande, o azul numa volta do outro lado e mais alto, o amarelo num oito
  embaixo, o rosa numa voltinha perto da superfície, à esquerda), com o rabinho balançando. As
  bolhas sobem do baú em 2 s, três vezes por volta, e somem na superfície.
- Faces do Pinta: `pintaFrente` nas duas portinhas, uma imagem só que passa de uma para a outra
  (1,41 × 0,34, na cor delas; os peixinhos recortados ficam por cima), e `pintaLadoEsq` e
  `pintaLadoDir` nos lados do móvel (0,55 × 0,42). O vidro, a água e os peixes não mudam.

### `lareira.glb` (footprint 2 × 1)

- `lareira`: tijolinhos de três tons com a boca em arco e o arco de tijolos em pé, a soleira de
  pedra, a prateleira de madeira com mãos-francesas, duas velas (`chama`), o vaso com planta, o
  porta-retrato com uma montanha nevada, a lenha cruzada na grelha e a pilha de lenha do lado.
- `fogo`: as brasas debaixo da lenha (`brasa`); pivô no meio delas, no chão da boca.
- `chama-1` a `chama-3`: as chamas (`fogo` por fora, `brasa` no miolo), com o pivô na base.
- Clipe `crepitar`: 2 s, em laço; as chamas esticam, encolhem e balançam, cada uma num ritmo, e
  as brasas pulsam. Para apagar, o jogo esconde `fogo` e as três `chama-*`.

### `banda.glb` (footprint 3 × 2, peças soltas)

| Nó | Peça | Lugar no arquivo (x, z no three.js) |
|---|---|---|
| `bateria` | bumbo com a estrela, pedal com a baqueta do bumbo, tom, caixa com duas baquetas e prato | (0, −0,42) |
| `teclado` | duas oitavas no suporte em X, alto-falantes, visor e botões | (−1, −0,30) |
| `violao` | violão no suporte | (−0,62, 0,55) |
| `xilofone` | sete teclas coloridas no cavalete, com duas baquetas | (1, −0,32) |
| `microfone` | microfone no pedestal com o fio enrolado | (0,35, 0,55) |

O teclado, o xilofone e o violão vêm um pouco virados para o meio do palco (o giro já está na
malha; o nó não tem giro).

### `fliperama.glb` (footprint 1 × 1)

- `fliperama`: o gabinete com laterais de faixas e estrelas, o painel de controle com a alavanca,
  quatro botões coloridos e dois de começar, a moldura da tela, a porta das fichas e o letreiro
  em cima (`luz`) com um vagalume e estrelas.
- `tela`: um retângulo de 0,50 × 0,375 (4 por 3), material `tela`, inclinado 16° para trás, com o
  meio em y 1,20. Coordenadas de textura de 0 a 1 (u para a direita, v para cima).

### `museu.glb` (footprint 3 × 2, peças soltas)

| Nó | Peça | Lugar no arquivo (x, z no three.js) |
|---|---|---|
| `redoma` | coluna com almofada e ovo de dinossauro fossilizado debaixo da redoma de vidro | (−1, −0,40) |
| `vitrine` | vitrine baixa de madeira e vidro com uma amonite no suporte e três dentes | (1, −0,40) |
| `cranio` | crânio de tiranossauro de boca entreaberta numa base de pedra | (0, −0,45) |
| `pegada` | pegada de três dedos numa placa de pedra, num pedestal baixo | (−0,40, 0,50) |
| `placa` | pedestal fino com o tampo inclinado da legenda | (0,60, 0,55) |
| `texto` | a face lisa da legenda (`placaFace`), 0,32 × 0,22; mesmo pivô da `placa` | (0,60, 0,55) |

Faces do Pinta, na cor da madeira: a frente (`pintaFrente`, 0,82 × 0,12) e os lados
(`pintaLadoEsq` e `pintaLadoDir`, 0,44 × 0,12) da base de madeira da vitrine. O vidro, os fósseis,
a redoma e o crânio não mudam.

### `casinha.glb` (footprint 2 × 2)

- `casinha`: a casinha de madeira (tábuas, cantoneiras, porta em arco, janelinha de coração e o
  telhadinho vermelho com o cume), a almofada redonda lá dentro, o tapetinho com duas patinhas, o
  potinho de água (`agua`) e o de ração, e um ossinho de brinquedo. A porta tem 0,42 × 0,51 e o
  miolo 0,92 × 1,02: cabe o cachorro adulto (0,71 de altura, 0,97 de comprimento).
- `placa`: a plaquinha do nome em cima da porta.
- `texto`: a face lisa do nome (`placaFace`), 0,30 × 0,09.
- Faces do Pinta, na cor da madeira: `pintaFrente` na parede da frente, com a porta (0,98 × 0,58), e
  `pintaLadoEsq` e `pintaLadoDir` nas paredes dos lados (1,08 × 0,58). Os frisos das tábuas, as
  cantoneiras, o arco da porta e a janelinha ficam por cima, como numa casinha pintada de verdade.

## Peças

Tamanho = largura × altura × fundo, em unidades do jogo.

| Arquivo | Footprint | Nós e contrato | Tamanho | Triângulos | GLB |
|---|---|---|---|---|---|
| `geladeira.glb` | 1 × 1 | `geladeira`, `porta`; clipe `abrir`; `pinta*`, `luz` | 0.82 × 1.75 × 0.83 | 5682 | 291 KB |
| `geladeira-holograma.glb` | 1 × 1 | `projetor`, `geladeira`, `porta`; clipe `abrir`; `projetoAzul`, `projetoAzulLinha` | 0.96 × 1.79 × 0.87 | 2184 | 83 KB |
| `forno.glb` | 1 × 1 | `forno`, `porta`; clipe `abrir`; `luz` | 0.76 × 1.06 × 0.74 | 5592 | 213 KB |
| `aquario.glb` | 2 × 1 | `aquario`, `peixe-1` a `-4`, `bolha-1` a `-6`; clipe `nadar`; `agua`, `vidro`, `luz` | 1.53 × 1.39 × 0.68 | 7322 | 309 KB |
| `lareira.glb` | 2 × 1 | `lareira`, `fogo`, `chama-1` a `-3`; clipe `crepitar`; `fogo`, `brasa` | 1.85 × 1.47 × 0.88 | 3882 | 190 KB |
| `banda.glb` | 3 × 2 | `bateria`, `teclado`, `violao`, `xilofone`, `microfone` | 2.85 × 1.28 × 1.56 | 9680 | 369 KB |
| `fliperama.glb` | 1 × 1 | `fliperama`, `tela`; `tela`, `luz` | 0.84 × 1.80 × 0.81 | 3274 | 142 KB |
| `museu.glb` | 3 × 2 | `redoma`, `vitrine`, `cranio`, `pegada`, `placa`, `texto`; `placaFace` | 2.63 × 1.27 × 1.49 | 8398 | 244 KB |
| `casinha.glb` | 2 × 2 | `casinha`, `placa`, `texto`; `placaFace` | 1.79 × 1.20 × 1.70 | 4840 | 173 KB |
| **total (9)** | | | | **50.854** | **1,97 MB** |

Por peça da banda: bateria 3200, teclado 1908, violão 1892, xilofone 1796, microfone 884
triângulos. Do museu: redoma 1824, vitrine 2556, crânio 2608, pegada 934, placa e texto 476.

## Scripts

| Script | Arquivos |
|---|---|
| `geladeira.py` | `geladeira`, `geladeira-holograma` |
| `forno.py` | `forno` |
| `aquario.py` | `aquario` |
| `lareira.py` | `lareira` |
| `banda.py` | `banda` |
| `fliperama.py` | `fliperama` |
| `museu.py` | `museu` |
| `casinha.py` | `casinha` |
| `lib_objetos.py` | ajudantes (acima) |
| `build_all.py` | gera tudo e confere: nós, clipes (duração no GLB), materiais, coordenadas de textura, tetos (10.000 triângulos e 450 KB por arquivo) e faces coplanares |

### `planta-interior.glb` (footprint 1 × 1, 29/10/2026)

- `vaso`: o vaso redondo de cerâmica creme (`vasoCeramica`) com a faixa e a borda terracota
  (`vasoFaixa`) e o pratinho embaixo (`vasoPrato`).
- `terra`: a terra abaulada na boca do vaso (`terraVaso`) com três pedrinhas (`pedrinhaVaso`).
- `folhas`: doze talos curvos (`talo`) e doze folhas largas, cascas finas fechadas (espessura
  0,008, para se ver dos dois lados), em `folha`, `folhaEscura` e `folhaNova` (as três de cima),
  com a nervura clara no meio (`nervuraFolha`).
- Medidas: 0,78 de largura × 1,28 de altura × 0,88 de fundo, a base em y = 0 e o meio do vaso na
  origem. O script recusa (assert) passar de meia célula para cada lado (0,48) ou de 1,40 de
  altura. 4,5 mil triângulos. Sem clipe, sem luz.
- Face do Pinta: `pintaFrente` é a volta do corpo do vaso fora da faixa e da borda (na cor creme),
  com as coordenadas de textura em volta do eixo (`uv_em_volta`: u de 0 a 1 dando a volta, 0,5 na
  frente e a emenda atrás; v de baixo para cima), como um rótulo: 1,13 de volta × 0,37 de altura.
- Script: `arte/objetos/planta_interior.py`; miniatura em `src/assets/casa/miniaturas/objeto-planta-interior.png`.
