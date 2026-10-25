# Batalha Naval

Esconda cinco navios e afunde os do computador antes que ele afunde os seus.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Clique na sua grade para pôr os cinco navios; espaço gira o próximo antes de pôr e R tira todos para recomeçar. Depois, clique na grade do computador para atirar: cada um tem um tiro por vez. O computador procura em casas alternadas, como as pretas de um tabuleiro, e quando acerta atira nas casas em volta. Quem afundar os cinco navios do outro vence; espaço começa outra partida.

## Ideias para mudar

- Mude TAMANHOS para jogar com mais navios, ou com navios maiores (até 10 casas cada um).
- Mude TEMPO_DO_COMPUTADOR para o computador pensar mais devagar.
- Tire a regra das casas alternadas do Computador e veja se ele demora mais para achar os seus navios.

## Imagens e sons

O Pygame Zero procura as imagens em `images/`, os sons em `sounds/` e as músicas em
`music/`, pelo nome do arquivo sem a extensão: `Actor('nave')` usa `images/nave`.
Para trocar um desenho, edite-o no Pinta pelo Estúdio, ou traga outro e use no código o
nome que o painel mostra em "nome no código".

## Jogar no computador

O Pygame Zero roda no computador com o pygame-ce:

```
python -m pip install pygame-ce==2.5.8 numpy
python -m pip install --no-deps pgzero==1.2.1
python main.py
```

O programa termina com `pgzrun.go()`, então `python main.py` já abre o jogo. Num programa
sem essa linha, use `python -X utf8 -m pgzero main.py` (o `-X utf8` mantém os acentos
certos no Windows).

Ao baixar o projeto pelo Estúdio, os desenhos em SVG ganham uma cópia em PNG, que é o
formato que o Pygame Zero do computador abre.
