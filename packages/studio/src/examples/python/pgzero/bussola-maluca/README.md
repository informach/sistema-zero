# Bússola Maluca

Corra até a borda que a bússola mostra antes de o tempo acabar e desvie das pedras. O recorde fica guardado.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Espaço começa. A agulha da bússola e a palavra embaixo dela mostram para onde ir: corra com as setas até aquela borda antes de o tempo acabar. Cada borda certa vale um ponto, e a cada dez pontos aparece mais uma pedra no caminho. O recorde fica no arquivo recorde.txt e continua lá na próxima vez que você jogar.

## Ideias para mudar

- Mude TEMPO_INICIAL para ter mais tempo em cada direção.
- Mude PONTOS_POR_NIVEL para as pedras chegarem mais cedo.
- Ponha mais lugares em LUGARES_DAS_PEDRAS.

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
