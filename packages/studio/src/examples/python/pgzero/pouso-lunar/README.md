# Pouso Lunar

Gire o módulo e dose o motor para descer devagar numa das pistas planas da Lua, antes de o combustível acabar.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

As setas dos lados giram o módulo e a seta para cima liga o motor, que empurra para onde o bico aponta. Pouse em pé e devagar numa pista amarela: as mais difíceis valem mais. O combustível que sobrar vira pontos.

## Ideias para mudar

- Mude GRAVIDADE para pousar em outro planeta.
- Dê mais ou menos COMBUSTIVEL.
- Mude POUSO_VERTICAL para aceitar pousos mais rápidos.

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
