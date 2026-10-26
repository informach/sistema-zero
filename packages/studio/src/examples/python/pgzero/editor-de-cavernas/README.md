# Editor de Cavernas

Desenhe sua própria caverna com pedras, gemas e paredes, guarde num arquivo e teste se dá para vencer.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Clique numa peça do painel e depois no mapa (arrastar pinta várias casas). Guardar escreve a caverna no arquivo caverna.txt e Carregar traz ela de volta, mesmo depois de fechar o jogo. Espaço testa a caverna com as setas e espaço de novo volta para o editor.

## Ideias para mudar

- Invente uma peça nova, como um bloco de fogo, e diga o que ela faz em mover_minerador.
- Abra o caverna.txt e veja a caverna escrita com letras.
- Faça uma caverna que só dá para vencer cavando na ordem certa, sem ser amassado.

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
