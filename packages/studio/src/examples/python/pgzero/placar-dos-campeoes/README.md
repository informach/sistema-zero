# Placar dos Campeões

Clique em quantas estrelas puder e escreva seu nome no placar dos dez melhores, que o jogo escreve num arquivo.

Um exemplo original feito com [Pygame Zero](https://pygame-zero.readthedocs.io/): o
programa inteiro está em `main.py` e é o mesmo nas versões de Blocos e de Código da
galeria.

## Como jogar

Espaço começa a rodada: clique em quantas estrelas puder em 15 segundos. Se você fizer mais pontos que o último do placar, digite seu nome na tela (a tecla de apagar volta uma letra) e aperte Enter. O placar é escrito no arquivo placar.txt.

## Ideias para mudar

- Mude TEMPO para a rodada durar mais.
- Mude TAMANHO_DO_PLACAR para guardar mais nomes.
- Faça a estrela ficar menor a cada ponto.

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
