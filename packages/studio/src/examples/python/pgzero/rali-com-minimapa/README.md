# Rali com Minimapa

Dirija por um labirinto maior que a tela atrás de oito bandeiras, olhando o minimapa e fugindo dos carros vermelhos.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

As setas dizem para onde virar na próxima esquina (dá para dar meia-volta a qualquer hora). Pegue as oito bandeiras antes de o combustível acabar; cada bandeira dá um pouco de combustível. Encostar num carro vermelho custa uma vida.

## Ideias para mudar

- Mude VELOCIDADE_DOS_VERMELHOS para eles correrem mais.
- Redesenhe o LABIRINTO (cada # vira um quarteirão).
- Ponha mais bandeiras em BANDEIRAS.

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
