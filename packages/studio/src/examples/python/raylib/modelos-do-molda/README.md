# Modelos do Molda

Uma vitrine que gira os modelos prontos do Molda e deixa todos do mesmo tamanho pela caixa de cada um.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

As setas trocam o modelo que gira na mesa.

## Ideias para mudar

- Faça um modelo no Molda, traga pelo "Trazer do Molda" (menu ⋯ → Materiais do jogo) e ponha o nome do arquivo na lista `arquivos`.
- Mude TAMANHO para os modelos ficarem maiores na mesa.
- Troque o eixo do giro em `draw_model_ex` para o modelo girar de outro jeito.

## Modelos, texturas e sons

O raylib abre cada arquivo pelo caminho, com a extensão: `load_model('models/nave.glb')`
abre `models/nave.glb` (a barra `/` funciona também no Windows). Os modelos 3D ficam em
`models/`, as texturas e o céu em `images/` e os sons em `sounds/`. Para trocar um
modelo, uma textura ou o céu, faça o seu no Molda e traga para o jogo pelo menu ⋯ → Modelos 3D
→ "Trazer do Molda"; um desenho do Pinta entra pelo menu ⋯ → Imagens → "Trazer do Pinta".
Depois use no código o caminho que o painel mostra em "nome no código". Cada modelo do Molda
vem de um tamanho, e o jogo lê a caixa dele (`get_model_bounding_box`) para deixá-lo do
tamanho certo. O céu 360° chega como uma imagem panorâmica, que o jogo pinta por dentro de uma
esfera grande.

## Jogar no computador

```
python -m pip install raylib==6.0.1.0
python main.py
```
