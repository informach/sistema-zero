# Monster Battle

Uma batalha por turnos numa arena. Seu time (Sparchu, Jacana, Plumette e Atrox)
enfrenta adversários sorteados entre 16 monstros, um depois do outro. Cada monstro
tem um elemento (fogo, água ou planta) e quatro das seis habilidades: fogo vence
planta, planta vence água e água vence fogo. Quantos adversários você consegue
derrotar antes que o time inteiro desmaie?

## Como jogar

- **Enter**: começa a batalha (e recomeça depois do fim).
- **Setas**: escolhem uma opção do menu.
- **Espaço**: confirma.
- **Esc**: volta ao menu principal.

No menu, **Atacar** abre as quatro habilidades do seu monstro, **Curar** recupera
50 de vida, **Trocar** abre a lista do time para trocar de monstro e **Fugir**
foge da batalha. Depois da sua jogada, o adversário responde em 1 segundo. Quando
um monstro seu desmaia, o próximo do time entra sozinho.

As seis habilidades são **Arranhão** (normal), **Faísca** e **Explosão** (fogo),
**Respingo** e **Granizo** (água) e **Espiral** (planta).

## Os textos da tela

O código continua usando os nomes do original (`'attack'`, `'heal'`, `'scratch'`,
`'shards'`…) como chaves dos dicionários. O que aparece na tela vem da tabela
`DISPLAY_NAMES`, em `settings.py`: para mudar o nome de uma opção ou de uma
habilidade, troque só o texto ali.

## Os módulos

| Arquivo | O que tem |
| --- | --- |
| `main.py` | a classe `Game`: turnos, ataques, telas de início e de fim |
| `settings.py` | tamanho da tela, cores, as tabelas dos monstros, habilidades e elementos e os nomes mostrados na tela |
| `support.py` | carrega os desenhos do Pinta e os sons |
| `monster.py` | `Creature`, `Monster` (o seu) e `Opponent` (o adversário) |
| `attack.py` | `AttackAnimationSprite`, a animação de um ataque |
| `ui.py` | `UI` (menus, lista do time e a vida do seu monstro) e `OpponentUI` |
| `timer.py` | `Timer`, que espera 1 segundo entre os turnos |

## Os desenhos do Pinta

Os desenhos foram feitos no Pinta, e os sprites e o mapa estão em `assets/`. Abra o painel
Materiais para editar qualquer um deles:

| Desenho | Animações | Onde aparece |
| --- | --- | --- |
| `sparchu`, `jacana`, `plumette`, `atrox`, `cindrill`, `charmadillo`, `pluma`, `ivieron`, `pouch`, `draem`, `larvea`, `cleaf`, `finsta`, `gulfin`, `finiette`, `friolera` | `frente` (2 quadros), `costas` (2 quadros), `icone` | cada monstro: de frente quando é o adversário, de costas quando é seu, e o ícone na lista do time |
| `ataques` | `arranhao`, `fogo`, `explosao`, `respingo`, `gelo`, `folhas` (4 quadros cada) | as animações das habilidades e da cura |
| `icones` | `habilidades` (6 quadros), `menu` (4 quadros) | os ícones ao lado de cada opção do menu |
| `chao` | `parado` | o gramado redondo embaixo de cada monstro |
| `arena` | mapa de 20 × 12 casas, camada `Fundo` (peças em `arena-pecas`) | o céu, os morros e o campo da batalha |

O conjunto de peças `arena-pecas` não tem arquivo próprio em `assets/`: ele mora em
`desenhos.pinta.json`, junto com os outros desenhos, e as peças vão dentro da imagem do
mapa (`arena.png`). Para mudar uma peça, edite o mapa `arena` no Pinta: as peças dele vêm
junto.

O jogo lê os desenhos com o módulo `pinta`: `pinta.carregar_sprite('sparchu')` traz o
monstro com as animações, `animacao('costas')` devolve a lista de quadros e
`pinta.carregar_mapa('arena')` traz o fundo, que o jogo desenha uma vez só numa
superfície do tamanho da tela. A tabela `ATTACK_ANIMATIONS` (em `settings.py`) liga o
nome que o jogo usa para cada ataque ao nome da animação no desenho `ataques`.

## Sons

`scratch.wav`, `fire.wav`, `explosion.wav`, `splash.wav`, `ice.wav` e `green.wav`
(um para cada animação de ataque; a cura usa o `green.wav`) e a música `music.ogg`,
em laço.

## O que foi completado

No original, fugir ou perder o time inteiro fechava a janela. Aqui a batalha acaba
numa tela de fim com o motivo, os adversários derrotados e o recorde da sessão, e
recomeça com Enter. O jogo também ganhou uma tela de início com o seu time e os
controles. Os monstros respiram (as animações `frente` e `costas` têm dois quadros)
e cada opção do menu tem um ícone.

Algumas medidas mudaram por causa dos limites do Pinta: um quadro de sprite tem até
128 pixels de lado (256 no jogo), então os monstros maiores ficaram com 256 pixels
em vez de até 385, as animações de ataque têm 256 em vez de 384 e o gramado embaixo
dos monstros também tem 256 de largura. O fundo virou um mapa de peças porque um
cenário do Pinta tem até 512 pixels de lado.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
