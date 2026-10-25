# Raquetada

O pingue-pongue de tela: contra o computador ou contra um amigo, até dez pontos.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

No começo, as setas escolhem 1 ou 2 jogadores e o espaço começa. O azul usa W e S (ou as setas, contra o computador); o laranja, as setas. Quanto mais longe do meio da raquete a bola bate, mais inclinada ela volta, e ela acelera a cada raquetada. Quem fizer dez pontos vence.

## Ideias para mudar

- Mude VELOCIDADE_DO_COMPUTADOR para um computador mais rápido, ou mais lento.
- Mude ACELERACAO para a bola ficar rápida mais cedo.
- Mude PONTOS_PARA_VENCER para partidas mais curtas.

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
