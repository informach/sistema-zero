# Atirador Espacial

Pilote a nave entre ondas de pedras que vêm de um arquivo de texto que você pode mudar.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

O jogo também lê `inimigos.txt` quando começa: dá
para mudar o jogo editando esse arquivo de texto, sem mexer no código. No computador, abra o
terminal dentro da pasta do jogo e use `python -X utf8 main.py`: assim ele acha o arquivo e
lê os acentos certos.

## Como jogar

Espaço começa. As setas pilotam a nave e o espaço atira. Pedras pequenas valem 30 pontos e caem com um tiro; as médias aguentam dois e as grandes, três. Bater numa pedra custa uma vida e deixa a nave piscando, protegida, por dois segundos. Cada onda recomeça mais rápida; sem vidas, o jogo acaba.

## Ideias para mudar

- Abra o arquivo inimigos.txt e invente a sua onda: mude os segundos, os lugares e a vida das pedras.
- Mude ACELERACAO_POR_ONDA para as ondas ficarem mais rápidas, ou mais calmas.
- Mude TEMPO_ENTRE_TIROS para a nave atirar mais vezes.

## Imagens e sons

O Pygame Zero procura as imagens em `images/`, os sons em `sounds/` e as músicas em
`music/`, pelo nome do arquivo sem a extensão: `Actor('nave')` usa `images/nave`.
Para trocar um desenho, edite-o no Pinta pelo Estúdio, ou traga outro e use no código o
nome que o painel mostra em "nome no código".
A letra dos textos vem de `fonts/pressstart2p.ttf`: `screen.draw.text(..., fontname='pressstart2p')`.

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
