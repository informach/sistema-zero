# Super Pirate World

Um pirata atravessa um mundo de ilhas. No mapa, o ícone anda pelos caminhos até a fase
escolhida; em cada fase, ele pula, escorrega nas paredes, enfrenta dentes e conchas, foge de
serras e espinhos e corre até a bandeira. Chegar à bandeira libera a próxima fase do mapa.

## Como jogar

- **Setas**: andam. No mapa, levam o ícone pelo caminho até a próxima fase.
- **Espaço**: pula. Encostado numa parede, no ar, o pirata escorrega devagar; segure Espaço
  para dar o pulo na parede (ele salta para o lado oposto).
- **Seta para baixo**: atravessa a plataforma de madeira em que o pirata está.
- **X**: ataca com a espada. O golpe rebate as pérolas das conchas e faz os dentes darem
  meia-volta.
- **Enter**: no mapa, entra na fase; nas telas de título, fim de jogo e vitória, continua.

As moedas valem 1 (prata), 5 (ouro), 20 (diamante) e 50 (caveira); a cada 100 moedas o
pirata ganha um coração. A poção dá um coração. Cair da fase, encostar em serra, espinho,
dente ou pérola tira um coração. Sem corações aparece o fim de jogo, e o pirata volta ao
mapa com os cinco corações de novo.

## Como o código está organizado

| Arquivo | O que tem |
| --- | --- |
| `main.py` | A classe `Game`: janela, desenhos e sons, as fases, troca entre mapa e fase, telas |
| `settings.py` | Tamanho da janela e das peças, velocidade das animações, camadas de desenho (`Z_LAYERS`) |
| `support.py` | Leitura dos desenhos do Pinta (`import_image`, `import_folder`, `import_sub_folders`…) |
| `data.py` | `Data`: moedas, corações, fase atual e fases liberadas |
| `level.py` | `Level`: monta a fase a partir do mapa do Pinta e cuida das colisões |
| `player.py` | `Player`: andar, pular, escorregar e pular na parede, atacar, ser atingido |
| `enemies.py` | `Tooth` (dente), `Shell` (concha que atira) e `Pearl` (pérola) |
| `sprites.py` | `Sprite`, `AnimatedSprite`, itens, partículas, plataformas móveis, bola de espinhos, nuvens e as peças do mapa do mundo |
| `groups.py` | `AllSprites` (câmera, céu, mar e nuvens da fase) e `WorldSprites` (câmera do mapa) |
| `overworld.py` | `Overworld`: o mapa do mundo, os caminhos e o ícone |
| `ui.py` | `UI` (corações e moedas na tela) e `Screen` (título, fim de jogo e vitória) |
| `timer.py` | `Timer`: um cronômetro simples |
| `debug.py` | `debug()`: escreve um valor na tela, para testar |

## Os desenhos do Pinta

Os desenhos foram feitos no Pinta, e os sprites, cenários e mapas estão em `assets/`. O jogo
os lê com o módulo `pinta` (pelas funções de `support.py`).

| Desenho | Animações ou peças | Onde aparece |
| --- | --- | --- |
| `pirata` | `parado` (5), `correr` (6), `pular`, `cair`, `parede`, `atacar` (3), `atacar-no-ar` (3), `ferido` (3) | o pirata |
| `dente` | `correr` (6) | o dente que patrulha o chão |
| `concha` | `parado`, `atirar` (6), `perola` | a concha e a pérola que ela atira |
| `serra` | `girar` (8), `elo` | serras e a corrente das serras que andam |
| `bola-espinhos` | `bola`, `elo` | a bola de espinhos que gira presa na corrente |
| `espinhos` | `brilhar` (4) | espinhos do chão (virados para baixo no teto) |
| `bandeira` | `tremular` (9) | o fim da fase |
| `palmeiras` | `pequena`, `grande`, `esquerda`, `direita`, `fundo`, `fundo-esquerda`, `fundo-direita` (4 cada) | palmeiras; a copa da pequena e da grande é plataforma |
| `decoracao` | `barril`, `caixa`, `barril-fundo`, `barril-deitado`, `caixa-fundo`, `garrafa-verde`, `garrafa-verde-deitada`, `garrafa-azul`, `garrafa-azul-deitada`, `cortina`, `cortina-rasgada`, `porta` | enfeites; barril e caixa também são chão |
| `vela` e `luz-vela` | `queimar` (6) e `brilhar` (4) | velas do castelo |
| `janela` | `brilhar` (24) | escotilhas do castelo |
| `correntes` | `grande` (8), `pequena` (8) | correntes penduradas |
| `helice` e `barco` | `girar` (4) e `flutuar` | plataformas que andam |
| `itens` | `ouro`, `prata`, `diamante` (4 cada), `pocao` (7), `caveira` (8) | moedas e poção |
| `particula` | `brilho` (3) | o brilho ao pegar um item ou quebrar uma pérola |
| `agua` | `superficie` (3), `fundo` | o mar das fases |
| `azulejos` | `azul`, `marrom`, `cinza`, `verde`, `rosa`, `roxo`, `amarelo` | o papel de parede das fases de interior |
| `interface` | `coracao` (4), `moeda` | corações e moedas no canto da tela |
| `nuvem-grande`, `nuvem-1`, `nuvem-2`, `nuvem-3` | cenários | o banco de nuvens do horizonte e as nuvens que passam |
| `icone` | `parado`, `baixo` (4), `esquerda` (4), `direita` (3), `cima` (3) | o pirata no mapa do mundo |
| `mar`, `palmeira-mapa` | `ondas` (3), `balancar` (5) | o mar e as palmeiras do mapa |
| `enfeites-mapa` | `capim-1` a `capim-5`, `pedra` | capim e pedras do mapa |
| `caminho`, `marco` | `horizontal`, `vertical` e quatro curvas; `fase` | o caminho entre as fases e o marco de cada fase |
| `terreno` | 58 peças sólidas | ilhas de grama e pedra, muralhas de tijolo |
| `metal` | 43 peças sólidas | molduras e blocos de aço e de cobre |
| `parede`, `plataformas`, `capim` | 13, 8 e 3 peças | parede de fundo do castelo, tábuas de madeira, tufos de capim |
| `ilhas` | 27 peças | grama, encostas, espuma e pontes do mapa do mundo |
| `fase-0` a `fase-5`, `mapa-mundo` | mapas | as seis fases e o mapa do mundo |

Os conjuntos de peças (`terreno`, `metal`, `parede`, `plataformas`, `capim` e `ilhas`) não
têm arquivo próprio em `assets/`: eles moram em `desenhos.pinta.json`, junto com os outros
desenhos, e as peças de cada mapa vão dentro da imagem do próprio mapa (`fase-0.png` a
`fase-5.png` e `mapa-mundo.png`). Para mudar uma peça, edite o mapa no Pinta: as peças dele
vêm junto.

### Os mapas

Cada fase tem 8 camadas: as de peças `BG` (parede de fundo), `Terrain` (chão sólido),
`Platforms` (tábuas que só seguram por cima) e `FG` (capim), e quatro de objetos. Os objetos
guardam o nome do original (`player`, `flag`, `saw`, `tooth`, `gold`…) e, no **tipo**, o nome
da camada de onde vieram no original: por isso `level.py` lê `tmx_map.objetos('Moving
Objects')` mesmo com plataformas móveis e objetos fixos na mesma camada `Objects`. Os dados da
fase estão num objeto `Data` (tipo `Data`) com as propriedades `bg` (cor do papel de parede ou
vazio para céu e mar), `level_unlock`, `top_limit` e `horizon_line`. Enfeites e barris/caixas
dizem qual desenho usam na propriedade `image`.

No `mapa-mundo`, cada marco de fase é um objeto `Node` com a propriedade `stage` e as direções
(`left`, `right`, `up`, `down`) com o número do caminho (o `r` no fim quer dizer "percorrer ao
contrário"). Os caminhos, que no original eram polígonos, viraram **pontos numerados**: objetos
`point` (tipo `Paths`) com as propriedades `start`, `end` e `order`. `overworld.py` junta os
pontos de cada caminho e os ordena por `order`.

## Sons

`coin.wav`, `attack.wav`, `jump.wav`, `damage.wav`, `pearl.wav`, `game_over.wav`,
`victory.wav` e a música `pirate_theme.ogg` (uma cantiga de marinheiro, em laço).

## O que foi completado

- **Fases liberadas em sequência.** No original, terminar qualquer fase liberava todas (um resto
  de teste). Agora a bandeira libera a fase indicada por `level_unlock`. A fase 4 liberava a 3
  (que já estava aberta) e a 5 nunca seria alcançada: agora ela libera a 5.
- **A fase 4 ganhou três tábuas.** Ela é uma cópia da fase 2 com os blocos mudados de lugar, e
  nada mais levava até a bandeira. Uma tábua dupla e uma tripla ao lado do canto esquerdo e
  uma dupla perto do bloco da bandeira refazem o caminho.
- **Fim de jogo.** Sem corações, o original fechava o jogo. Agora aparece a tela de fim de jogo
  e o pirata volta ao mapa com os cinco corações (as fases liberadas continuam).
- **Tela de título** e **tela de vitória** ao terminar a última fase. Os corações e as moedas
  não aparecem nessas telas.
- **O mapa começava sempre na fase 0**: ao voltar de uma fase, o ícone estava no marco certo,
  mas a primeira tecla o levava pelos caminhos da fase 0. Agora o marco atual é o da fase.

## Mudanças no código (o comportamento é o mesmo)

- `support.py` lê os desenhos do Pinta no lugar das pastas de PNG. `trim` corta a sobra
  transparente dos desenhos menores que o quadro, e `keyed` troca a transparência por uma cor
  de fundo invisível: a imagem é a mesma e o navegador desenha bem mais rápido.
- A câmera (`AllSprites`, `WorldSprites`) só desenha o que aparece na tela.
- `data.py` continua com `@property` (moedas e corações), `level.py` com o `match/case` que
  escolhe a camada de desenho das peças e `overworld.py` com os dicionários por compreensão,
  como no original: os Blocos abrem essas construções.

## Diferenças inevitáveis

- A arte foi redesenhada com metade do tamanho e dobrada no jogo, então posições e tamanhos dos
  objetos ficaram em números pares (um pixel de diferença, no máximo).
- A janela do castelo tem 24 quadros (eram 74), o banco de nuvens tem 1024 pixels de largura
  (repete na horizontal, como antes), os elos das correntes e os corações têm o tamanho mínimo
  de um quadro do Pinta, e a pérola fica no canto de um quadro do tamanho da concha (todos os
  quadros de um desenho do Pinta têm o mesmo tamanho). O jogo corta a sobra de todos eles.
- O som `hit.wav` do original não era usado e não foi feito.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
