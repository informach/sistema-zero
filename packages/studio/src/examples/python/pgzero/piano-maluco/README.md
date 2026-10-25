# Piano Maluco

Um piano de verdade na tela: ouça a música e depois toque junto, na tecla certa e na hora certa.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Clique nas teclas para tocar. "Ouvir" toca a música sozinho e mostra as teclas. Em "Jogar", as notas descem até a linha: clique na tecla da nota verde enquanto ela passa pela linha. Cada nota certa é um acerto; tecla errada conta como erro, e a nota que passa sem você tocar fica perdida. Nas pausas, a tecla só toca.

## Ideias para mudar

- Mude BATIDAS_POR_MINUTO para a música ficar mais rápida.
- Crie uma FRASE_D com as notas de BRANCAS e ponha na MUSICA.
- Use as teclas pretas: escreva C#4 ou F#4 na música.

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
