# Batalha de Monstrinhos

Uma batalha por turnos: escolha golpes, troque de monstrinho e use a vantagem dos elementos.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

As setas para cima e para baixo escolhem, Enter confirma e ESC volta. Atacar mostra os golpes, Trocar chama outro da equipe, Defender diminui o próximo golpe e Fugir acaba a batalha. Água vence fogo, fogo vence planta, planta vence água e raio vence água.

## Ideias para mudar

- Mude o dano dos golpes em GOLPES.
- Crie um monstrinho novo em MONSTROS (e desenhe ele no Pinta).
- Acrescente uma vantagem nova em VANTAGENS.

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
