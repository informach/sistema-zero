# Continuar?

Desvie da chuva de pedras e, quando as vidas acabarem, decida a tempo se quer continuar com os seus pontos.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

No título, espaço começa. As setas desviam a nave das pedras, e cada pedra que passa vale um ponto. Sem vidas, aparece a tela de continuar: aperte espaço antes de a contagem chegar a zero para voltar ao jogo com os seus pontos.

## Ideias para mudar

- Mude CONTAGEM para ter mais tempo de decidir.
- Mude VIDAS para começar com mais vidas.
- Crie um estado novo, de pausa, com as suas regras.

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
