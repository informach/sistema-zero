# Estrela Vermelha

Ache a estrela vermelha entre as outras antes que elas caiam. Pixel art.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Clique na estrela vermelha antes que as estrelas cheguem ao chão. A cada fase aparecem mais estrelas e elas caem mais rápido.

## Ideias para mudar

- Mude a quantidade de fases.
- Troque a cor da estrela certa.
- Desenhe uma estrela nova no Pinta, em pixel art.

## Imagens e sons

O Pygame Zero procura as imagens em `images/`, os sons em `sounds/` e as músicas em
`music/`, pelo nome do arquivo sem a extensão: `Actor('nave')` usa `images/nave`.
Você pode trocar qualquer um deles por um desenho seu do Pinta, com o mesmo nome.

## Jogar no computador

O Pygame Zero roda no computador com o pygame-ce:

```
python -m pip install pygame-ce numpy
python -m pip install --no-deps pgzero
python main.py
```

O programa termina com `pgzrun.go()`, então `python main.py` já abre o jogo. Num programa
sem essa linha, use `python -X utf8 -m pgzero main.py` (o `-X utf8` mantém os acentos
certos no Windows).

Ao baixar o projeto pelo Estúdio, os desenhos em SVG ganham uma cópia em PNG, que é o
formato que o Pygame Zero do computador abre.
