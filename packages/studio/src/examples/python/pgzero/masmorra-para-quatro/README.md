# Masmorra para Quatro

Até quatro heróis no mesmo teclado juntam os tesouros da masmorra e fogem dos fantasmas até a saída.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Cada herói tem as suas teclas: setas, WASD, IJKL e TFGH. Um herói entra no jogo quando você o move, então dá para jogar sozinho ou com até três amigos. Juntem todos os tesouros e a saída abre no meio da masmorra. O fantasma que encosta tira uma vida do grupo.

## Ideias para mudar

- Desenhe a sua masmorra mudando o MAPA.
- Mude VELOCIDADE para os heróis andarem mais depressa.
- Ponha mais uma toca de fantasmas no mapa.

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
