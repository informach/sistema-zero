# Nave que Desliza

Pilote a nave com as setas, pegue as estrelas e fuja da pedra que quica sozinha pela tela.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

Use as setas para pilotar a nave e pegar as estrelas. Se a pedra encostar, a nave volta ao começo.

## Ideias para mudar

- Deixe a pedra mais rápida mudando VELOCIDADE_PEDRA.
- Tire a linha do `vector2_normalize` e veja a diagonal ficar mais rápida.
- Coloque uma segunda pedra.

## Imagens, sons e fontes

O raylib abre cada arquivo pelo caminho, com a extensão: `load_texture('images/nave.png')`
abre `images/nave.png` (a barra `/` funciona também no Windows). As imagens ficam em `images/`, os sons em
`sounds/`, as músicas em `music/` e as fontes em `fonts/`. Para trocar um desenho,
faça o seu no Pinta e traga para o jogo pelo menu ⋯ → Imagens → "Trazer do Pinta"; depois
use no código o caminho que o painel mostra em "nome no código". Um desenho animado é uma
folha de quadros, igual à que o Pinta exporta: uma linha por animação, com os quadros lado a
lado, e o jogo recorta um quadro de cada vez. Cada desenho fica com o tamanho que tem no Pinta,
e `ESCALA`, no começo do `main.py`, diz quantas vezes ele aparece maior na tela.

## Jogar no computador

```
python -m pip install raylib==6.0.1.0
python main.py
```
