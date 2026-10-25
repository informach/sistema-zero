# Arena de Dois Comandos

Ande com as setas e atire com W, A, S e D para o lado que quiser, enquanto ondas de robôs vêm atrás do tanque.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

As setas andam com o tanque. W, A, S e D apontam a torre e atiram enquanto você segura (dá para atirar na diagonal juntando duas). Destrua os robôs antes que encostem em você e resgate as pessoas encostando nelas.

## Ideias para mudar

- Mude INTERVALO_DOS_TIROS para atirar mais rápido.
- Ponha mais pessoas em cada onda.
- Faça os robôs da onda 5 serem maiores e mais lentos.

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
