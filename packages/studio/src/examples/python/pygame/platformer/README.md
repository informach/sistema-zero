# Platformer

Um explorador com um lançador de energia atravessa um jardim de plataformas flutuantes.
Minhocas patrulham as plataformas e um enxame de abelhas chega sem parar pela direita.
Chegue à bandeira lá no alto, no fim do caminho, antes de perder os três corações.

## Como jogar

- **Setas para os lados**: andam.
- **Espaço**: pula (só com os pés no chão).
- **S**: atira (um tiro a cada meio segundo, com o clarão no cano).
- **Enter**: começa o jogo na tela de início e começa outra rodada depois da vitória ou do
  fim de jogo.

Cada abelha ou minhoca que encosta em você tira um coração, e por um instante (1,5 segundo)
o explorador pisca e nada o machuca. Cair para fora do mundo também tira um coração e leva
você de volta ao começo. O placar no canto conta os inimigos derrotados.

## Como o código está organizado

| Arquivo | O que tem |
| --- | --- |
| `main.py` | A classe `Game`: carrega os desenhos e os sons, monta o mapa, cria as abelhas, confere as colisões, mostra o placar e as telas, e roda o laço do jogo |
| `settings.py` | Tamanho da janela e das peças, cor do céu, vidas, tempo sem dano e cores do texto |
| `sprites.py` | `Sprite`, `Bullet`, `Fire`, `AnimatedSprite`, `Enemy`, `Bee`, `Worm`, `Flag` e `Player` |
| `groups.py` | `AllSprites`: a câmera que segue o explorador e desenha só o que aparece na tela |
| `timer.py` | `Timer`: conta o tempo da recarga do tiro, do clarão, da morte dos inimigos e das abelhas |
| `support.py` | `audio_importer`: transforma cada som da pasta `assets/` num `Sound` |

As abelhas nascem à direita do mundo a cada 100 milissegundos e voam para a esquerda numa
onda (seno). As minhocas andam de um lado para o outro dentro do retângulo marcado no mapa.
O tiro acerta pela máscara (o contorno desenhado, não o retângulo), e o inimigo atingido
pisca em branco antes de sumir.

## Os desenhos do Pinta

Os desenhos estão em `assets/` e foram feitos no Pinta. Abra o painel Materiais para
editar qualquer um deles:

| Desenho | Animações ou peças | Onde aparece |
| --- | --- | --- |
| `jogador` | `parado` (4 quadros), `correr` (6), `pular` (subir e cair), `ferido` | o explorador |
| `abelha` | `voar` (4 quadros) | as abelhas |
| `minhoca` | `rastejar` (4 quadros) | as minhocas |
| `tiro` | `voar` | o tiro |
| `clarao` | `brilhar` | o clarão no cano do lançador |
| `bandeira` | `tremular` (4 quadros) | a bandeira de chegada |
| `coracao` | `cheio`, `vazio` | os corações do placar |
| `terreno` | 42 peças sólidas | o chão: uma peça para cada jeito de ter os lados abertos, com grama em cima |
| `enfeites` | 14 peças | cogumelos, flores, brotos e as partes das árvores |
| `mundo` | camadas `Main`, `Decoration` e `Entities` | o mapa de 45 × 25 casas |

Na camada de objetos `Entities` ficam o ponto `Player` (onde o explorador começa), os
retângulos `Worm` (por onde cada minhoca anda) e o retângulo `Flag` (a chegada).

O jogo lê tudo com o módulo `pinta`: `pinta.carregar_sprite('jogador').animacoes()` traz as
animações do explorador, e `pinta.carregar_mapa('mundo').camada('Main').tiles()` devolve
cada peça do chão com a sua posição.

## Sons

`shoot.wav` (o tiro), `impact.wav` (o tiro acerta um inimigo), `damage.wav` (o explorador é
atingido), `victory.wav` (a bandeira), `game_over.wav` (os corações acabaram) e a música
`music.ogg`, em laço.

## O que foi completado

No original, encostar num inimigo não fazia nada (a linha estava desligada no código), o
jogo não tinha começo nem fim, e a música não tocava. Esta versão acrescenta:

- três corações e um tempo sem dano depois de cada batida, com o explorador piscando;
- cair para fora do mundo tira um coração e volta ao começo;
- a tela de início, a bandeira de chegada no fim do caminho de cima (um objeto `Flag` no
  mapa) com a tela de vitória, a tela de fim de jogo e o recomeço com Enter;
- a música tocando desde o começo;
- o placar de inimigos derrotados.

Também mudou, para o jogo rodar leve no navegador: a câmera desenha só o que aparece na
tela, as colisões olham primeiro os retângulos e só depois as máscaras (o resultado é o
mesmo), e o tiro some depois de 2 segundos de voo, quando já está longe da tela (no original
ele voava para sempre). O pulo e a gravidade continuam como no original, contando com 60
quadros por segundo.

## Ideias para mudar

- Mude `PLAYER_LIVES` ou `INVULNERABLE_TIME` em `settings.py`.
- Troque o `100` do `bee_timer` em `main.py` para chegarem menos abelhas.
- Mude o `-20` do pulo em `Player.input` para pular mais alto ou mais baixo.
- Abra o `mundo` no Pinta e mude o caminho ou o lugar da bandeira.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
