# Duelo de Tanques

Acerte o tanque do outro lado do morro escolhendo o ângulo e a força do tiro. O vento muda a cada vez.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Você é o tanque azul. As setas para cima e para baixo mudam o ângulo do cano; para a esquerda e para a direita, a força. O espaço atira. O vento empurra o tiro: veja a seta lá em cima. O computador joga com o tanque laranja e corrige a mira a cada tiro. Quem acertar primeiro vence a rodada; espaço começa outra.

## Ideias para mudar

- Mude COMPUTADOR para False e jogue com um amigo no mesmo teclado.
- Mude GRAVIDADE e veja como o tiro voa.
- Mude SUBIDA para fazer morros mais altos.

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
