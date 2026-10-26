# Memória contra o Computador

O jogo da memória com oito bichos, contra um computador que lembra das cartas que viu.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Clique em duas cartas para virá-las. Se forem do mesmo bicho, o par é seu e você joga de novo; se não, elas voltam e é a vez do computador. Ele também vê as cartas que você vira e quase sempre lembra delas. Quem fizer mais pares vence; espaço começa outra partida.

## Ideias para mudar

- Mude MEMORIA_DO_COMPUTADOR para 1 e jogue contra um computador que nunca esquece.
- Mude TEMPO_PARA_OLHAR para ter mais tempo de decorar as cartas.
- Crie um método novo na classe Carta que faça a carta piscar.

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
