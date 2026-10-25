# Vampire Survivor

Um caçador de monstros está num campo cercado por muros de pedra, e morcegos,
gosmas e esqueletos não param de chegar. Mire com o mouse, atire e fuja: quanto
mais tempo você aguentar, melhor.

## Como jogar

- **Setas ou WASD**: andam.
- **Mouse**: mira (a arma gira em volta do caçador apontando para o mouse).
- **Botão esquerdo do mouse**: segure para atirar (um tiro a cada 0,1 segundo).
- **Enter**: começa a partida na tela de início e recomeça depois do fim de jogo.

Cada monstro que encosta tira um pedaço da vida. Depois de um toque o caçador
pisca em vermelho e fica um segundo sem levar dano. Quando a barra de vida acaba,
o jogo mostra quanto tempo você sobreviveu, quantos monstros derrotou e o recorde
da sessão.

## Como o código está organizado

| Arquivo | O que tem |
| --- | --- |
| `main.py` | A classe `Game`: janela, mapa, arma e tiros, monstros que nascem a cada 0,3 segundo, colisões, telas de início e de fim, placar e laço do jogo |
| `settings.py` | Tamanho da janela e das peças, vida do caçador, dano dos monstros, tempo sem dano e cores do placar |
| `player.py` | `Player`: andar com colisão nas paredes, animação nas quatro direções, vida e o piscar depois de um toque |
| `sprites.py` | `CollisionSprite` (árvores, pedras e paredes), `Gun` (gira com `rotozoom` e vira com `flip`), `Bullet` e `Enemy` (persegue o caçador e pisca branco ao morrer) |
| `groups.py` | `AllSprites`: a câmera que segue o caçador, desenha o chão do mapa e os sprites ordenados pela altura na tela |

## Os desenhos do Pinta

Os desenhos estão em `assets/` e foram feitos no Pinta. Abra o painel Materiais para
editar qualquer um deles:

| Desenho | Animações | Onde aparece |
| --- | --- | --- |
| `heroi` | `baixo`, `esquerda`, `direita`, `cima` (4 quadros cada) | o caçador andando |
| `morcego` | `voar` (4 quadros) | o morcego |
| `gosma` | `quicar` (4 quadros) | a gosma |
| `esqueleto` | `andar` (4 quadros) | o esqueleto |
| `arma` | `mirar` | a arma que gira em volta do caçador |
| `bala` | `voar` | o tiro |
| `placar` | `coracao`, `caveira`, `relogio` | os ícones da vida, dos monstros e do tempo |
| `arvores` | `pinheiro`, `frondosa`, `nevada`, `palmeira`, `palmeira-curva`, `pinheirinho`, `palmeirinha` | as árvores do mapa |
| `pedras-e-ruinas` | `pilar`, `pilar-quebrado`, `pilar-rachado`, `pedra-grama`, `pedra-grama-2`, `pedra-areia`, `pedra-areia-2` | as colunas e as pedras do mapa |
| `terreno` | 39 peças | grama, areia, as beiradas entre as duas, o muro de pedra e o cordão de pedrinhas |
| `mundo` | mapa de 52 × 50 peças | o campo inteiro |

O mapa `mundo` tem quatro camadas:

- **Chão** (peças do `terreno`): o jogo a desenha com `camada.desenhar`, que só pinta
  as peças que aparecem na tela.
- **Objetos**: cada árvore, coluna ou pedra é um objeto com o nome da animação
  (`pinheiro`, `pilar-quebrado`…). O jogo corta a área pintada do quadro e ela vira
  a caixa de colisão.
- **Colisões** (escondida no Pinta): os retângulos dos muros e das pedras.
- **Entidades**: o ponto `Jogador`, onde o caçador começa, e os 35 pontos `Inimigo`,
  onde os monstros nascem.

O jogo lê os desenhos com o módulo `pinta`: `pinta.carregar_sprite('heroi')` traz o
sprite com as animações, e `pinta.carregar_mapa('mundo')` traz o mapa com as camadas.

## Sons

`shoot.wav` (tiro), `impact.wav` (monstro atingido), `hurt.wav` (caçador ferido),
`game_over.wav` (fim de jogo) e a música `music.ogg`, que toca em laço.

## O que foi completado

No original o caçador não morria: a colisão com os monstros estava comentada. Aqui
ele tem uma barra de vida, leva dano quando um monstro encosta (com um segundo sem
dano depois de cada toque) e o jogo termina numa tela com o tempo sobrevivido, os
monstros derrotados e o recorde. Também entraram a tela de início, o relógio e o
contador de monstros no placar, o recomeço com Enter e a música, que estava
desligada no código.

Outras diferenças:

- O chão era feito de um sprite por peça (2.600 sprites). Aqui a camada do mapa
  desenha o chão de uma vez e só o que aparece; o grupo da câmera também só desenha
  os sprites que estão na tela. O resultado na tela é o mesmo, bem mais rápido no
  navegador.
- `Enemy.collision` procura as paredes com `collidelist`, na mesma ordem do original,
  e cada sprite guarda a máscara de cada quadro: com dezenas de monstros no mapa,
  o jogo continua leve.
- As peças originais eram 210 (o Pinta guarda até 64 por desenho); o `terreno` redesenhou o mapa com 39. Uma árvore do
  original passava da borda de cima do mapa e foi puxada para dentro.
- A arma não quebra mais quando o mouse fica exatamente em cima do caçador.

## Ideias para mudar

- Mude `ENEMY_DAMAGE` ou `INVULNERABLE_DURATION` em `settings.py`.
- Troque o tempo entre monstros em `pygame.time.set_timer(self.enemy_event, 300)`.
- Abra o mapa `mundo` no Pinta e mova os pontos `Inimigo`, ou plante mais árvores.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
