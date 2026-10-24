# Bolhas que se Dividem

Acerte as bolhas com o arpão: cada uma se divide em duas menores até sumir. Não deixe nenhuma encostar em você!

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

As setas andam para os lados e espaço lança o arpão para cima (um de cada vez). A bolha atingida vira duas menores, e a menor de todas estoura. Se uma bolha encostar em você, perde uma vida e fica piscando um pouquinho, protegido.

## Ideias para mudar

- Mude VELOCIDADE_DO_ARPAO para o arpão subir mais depressa.
- Mude QUIQUES para as bolhas pularem mais alto.
- Comece um nível com uma bolha média e uma grande.

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
