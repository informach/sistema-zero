# Cavando por Gemas

Cave a terra da caverna atrás de gemas, mas cuidado com as pedras que despencam quando você tira o apoio delas.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

As setas cavam uma casa de cada vez. Pegue as dez gemas para abrir a porta e saia antes de o tempo acabar. Pedra parada em cima de você não machuca, mas pedra caindo amassa. Dá para empurrar uma pedra de lado se o outro lado estiver vazio.

## Ideias para mudar

- Desenhe outra caverna em CAVERNA (cada letra vira uma coisa).
- Mude TEMPO_TOTAL para ter mais ou menos tempo.
- Faça a gema também cair, como a pedra.

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
