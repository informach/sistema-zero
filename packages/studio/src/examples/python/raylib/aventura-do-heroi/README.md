# Aventura do Herói

Explore a ilha com a espada: corte o mato, derrote as gosmas e não deixe os corações acabarem.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

As setas andam e o espaço balança a espada para onde o herói está olhando. As gosmas perseguem quem chega perto; cada encostão tira um coração. Derrote todas para limpar a ilha; Enter recomeça.

## Ideias para mudar

- Desenhe uma ilha nova trocando as letras de MAPA.
- Dê mais corações ao herói em VIDAS.
- Faça as gosmas mais rápidas mudando o 70 em `Gosma.atualizar`.
- Desenhe o seu herói no Pinta com três animações de um quadro (baixo, lado e cima) e troque `images/heroi.png`.

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
