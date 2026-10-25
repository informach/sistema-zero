# Olá, Raylib

O primeiro programa: formas, a mesma nave em três versões e texto com duas fontes.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

Clique no círculo grande para trocar a cor dele.

## Ideias para mudar

- Troque o texto de boas-vindas.
- Mude a cor do fundo em `clear_background`.
- Troque `images/nave.png` por um desenho seu do Pinta.

## Imagens, sons e fontes

O raylib abre cada arquivo pelo caminho, com a extensão: `load_texture('images/nave.png')`
abre `images/nave.png` (a barra `/` funciona também no Windows). As imagens ficam em `images/`, os sons em
`sounds/`, as músicas em `music/` e as fontes em `fonts/`. Para trocar um desenho,
faça o seu no Pinta e traga para o jogo pelo menu ⋯ → Imagens → "Trazer do Pinta"; depois
use no código o caminho que o painel mostra em "nome no código". Um desenho animado é uma
folha de quadros, igual à que o Pinta exporta: uma linha por animação, com os quadros lado a
lado, e o jogo recorta um quadro de cada vez.

## Jogar no computador

```
python -m pip install raylib==6.0.1.0
python main.py
```
