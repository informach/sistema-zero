# Primeira Cena 3D

O primeiro mundo 3D: a câmera, uma grade no chão, um cilindro com degradê girando e uma bola que anda com as setas.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

A barra de espaço troca o sentido do giro do cilindro e as setas andam com a bola.

## Ideias para mudar

- Mude a posição da câmera em `Camera3D` e veja a cena de outro lugar.
- Troque as cores do degradê em `gen_image_gradient_linear`.
- Desenhe mais formas: `draw_cylinder`, `draw_capsule` ou outro `draw_cube`.

## Jogar no computador

```
python -m pip install raylib==6.0.1.0
python main.py
```
