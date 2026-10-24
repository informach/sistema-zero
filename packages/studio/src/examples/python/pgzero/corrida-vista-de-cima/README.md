# Corrida Vista de Cima

Corra três voltas contra três carros do computador que se guiam pela cor de um mapa escondido.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Seta para cima acelera, para baixo freia e dá ré, e as setas dos lados viram o carro. Espere a contagem e complete as três voltas. Bater na grama faz o carro voltar um pouco.

## Ideias para mudar

- Mude VELOCIDADE_MAXIMA e veja se ainda dá para fazer a curva.
- Deixe os carros do computador mais rápidos em guiar_o_computador.
- Mude VOLTAS para uma corrida mais longa.

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
