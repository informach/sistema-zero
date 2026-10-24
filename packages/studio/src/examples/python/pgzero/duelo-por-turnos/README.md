# Duelo por Turnos

Lute contra o dragão escolhendo, a cada vez, atacar, se proteger com o escudo ou tomar uma poção.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Na sua vez, aperte 1 para atacar, 2 para se proteger com o escudo (o próximo golpe tira só metade) ou 3 para tomar uma poção (são duas por luta). Depois o dragão escolhe a jogada dele. Quem ficar sem vida perde.

## Ideias para mudar

- Mude POCOES para ter mais poções.
- Mude a vida máxima do dragão.
- Faça o dragão se defender mais quando estiver fraco.

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
