# Sinuca

Mire com a linha de pontinhos, escolha a força e encaçape as seis bolas coloridas em até 15 tacadas.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

As setas dos lados giram a mira e as de cima e de baixo mudam a força. Espaço dá a tacada. A linha de pontinhos mostra para onde a branca vai. Se a branca cair, ela volta para o lugar dela.

## Ideias para mudar

- Mude ATRITO para a mesa ficar mais lisa ou mais áspera.
- Dê mais ou menos tacadas em TACADAS.
- Arrume as bolas de outro jeito em arrumar_mesa.

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
