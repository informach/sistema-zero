# Space Shooter

Uma chuva de meteoros cai sobre a sua nave. Desvie e destrua os meteoros com o
laser: os pontos sobem enquanto você continua vivo.

## Como jogar

- **Setas**: movem a nave.
- **Espaço**: atira (um tiro a cada 0,4 segundo).
- **Enter**: depois de ser atingido, começa outra rodada.

## Os desenhos do Pinta

Os desenhos estão em `assets/` e foram feitos no Pinta. Abra o painel Materiais para
editar qualquer um deles:

| Desenho | Animação | Onde aparece |
| --- | --- | --- |
| `nave` | `voar` (3 quadros) | a nave, com a chama do motor |
| `meteoro` | `pedras` (3 quadros) | cada meteoro sorteia uma das pedras |
| `laser` | `brilhar` | o tiro |
| `estrela` | `piscar` (4 quadros) | as estrelas do fundo |
| `explosao` | `explodir` (21 quadros) | a explosão |

O jogo lê os desenhos com o módulo `pinta`: `pinta.carregar_sprite('nave')` traz o
sprite com as animações, e `animacao('voar')` devolve a lista de quadros.

## Sons

`laser.wav`, `explosion.wav`, `damage.wav` e a música `game_music.ogg` (em laço).

## O que foi completado

No original, ser atingido fechava a janela. Aqui o jogo mostra o fim da rodada, o
recorde da sessão e recomeça com Enter. A música, que estava desligada no código,
toca em laço, e a nave não sai da tela.

O quadro do `laser` tem 8 pixels de largura no Pinta (o menor quadro que ele guarda,
16 no jogo), mais largo que o raio. Por isso o jogo recorta o tiro na parte pintada
(`get_bounding_rect`): o tiro acerta com os 12 pixels do raio, e não com o quadro
inteiro.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
