# Pong

A raquete da direita é sua; a da esquerda é do computador, que segue a bola. Quem
fizer sete pontos primeiro vence a partida.

## Como jogar

- **Seta para cima / seta para baixo**: move a sua raquete.
- **Espaço**: depois do fim da partida, começa a revanche.

A bola espera um pouco no meio antes de cada saque. O placar é guardado no arquivo
`data/score.txt` a cada ponto, e o jogo o lê ao começar: a partida continua de onde
parou.

## Como o código está organizado

| Arquivo | O que tem |
| --- | --- |
| `main.py` | A classe `Game`: janela, placar, laço do jogo e o arquivo do placar |
| `settings.py` | Tamanhos, posições, velocidades, cores e a pontuação da vitória |
| `sprites.py` | `Paddle`, `Player`, `Opponent` e `Ball` (movimento e colisões) |
| `groups.py` | `AllSprites`: desenha as sombras e depois os sprites |

## O que foi completado

O jogo original não tinha fim. Esta versão acrescenta a meta de pontos
(`WINNING_SCORE` em `settings.py`), a tela de vitória e a revanche com a tecla
espaço. O placar também é gravado a cada ponto (no original ele só era gravado ao
fechar a janela).

## Ideias para mudar

- Mude `WINNING_SCORE` para uma partida mais longa.
- Aumente `SPEED['opponent']` para o computador ficar mais difícil.
- Troque as cores em `COLORS`.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
