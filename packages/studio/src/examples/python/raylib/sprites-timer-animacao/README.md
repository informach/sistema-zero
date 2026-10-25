# Sprites, Timer e Animação

O herói anda com animação e pega as maçãs que um cronômetro solta do céu. Três maçãs no chão e acabou.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

As setas andam para os lados. Pegue as maçãs antes que caiam no chão: cada uma que cai custa uma vida. Enter recomeça.

## Ideias para mudar

- Mude o 0.9 do cronômetro para as maçãs caírem mais depressa.
- Troque o 8 da animação para o herói mexer as pernas mais rápido.
- Desenhe o seu herói no Pinta numa animação de quatro quadros, traga para o jogo e troque `images/heroi.png` pelo caminho dele.

## Imagens, sons e fontes

O raylib abre cada arquivo pelo caminho, com a extensão: `load_texture('images/nave.png')`
abre `images/nave.png` (a barra `/` funciona também no Windows). As imagens ficam em `images/`, os sons em
`sounds/`, as músicas em `music/` e as fontes em `fonts/`. Para trocar um desenho,
faça o seu no Pinta e traga para o jogo pelo menu ⋯ → Imagens → "Trazer do Pinta"; depois
use no código o caminho que o painel mostra em "nome no código". Um desenho animado é uma
folha de quadros, igual à que o Pinta exporta: uma linha por animação, com os quadros lado a
lado, e o jogo recorta um quadro de cada vez. Cada desenho fica com o tamanho que tem no Pinta,
e `ESCALA`, no começo do `main.py`, diz quantas vezes ele aparece maior na tela.

## Jogar no computador

```
python -m pip install raylib==6.0.1.0
python main.py
```
