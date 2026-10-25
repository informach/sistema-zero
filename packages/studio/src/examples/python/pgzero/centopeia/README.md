# Centopeia

Uma centopeia desce pelo campo de pedras; cada parte que você acerta vira pedra e parte a fila em duas.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Espaço começa. As setas andam pela parte de baixo do campo e o espaço atira, um tiro de cada vez. A centopeia anda de lado e desce uma linha quando bate numa pedra ou na borda. Cada parte acertada vale 10 pontos e vira pedra, e as partes de trás seguem como outra centopeia; uma pedra aguenta três tiros. Encostar na centopeia custa uma vida; acabou a centopeia, vem outra, maior e mais rápida.

## Ideias para mudar

- Mude PEDRAS_NO_COMECO para um campo mais cheio, ou mais vazio.
- Mude PARTES_NA_PRIMEIRA_ONDA para uma centopeia mais comprida.
- Faça a cabeça valer mais pontos que o corpo: cada parte sabe se é cabeça (parte.cabeca).

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
