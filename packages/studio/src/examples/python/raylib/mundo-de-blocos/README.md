# Mundo de Blocos

Um mundo de cubos com texturas pintadas no Molda: a mira coloca um bloco encostado na face que você aponta, ou tira o bloco.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

Mexa o mouse (ou as setas) para olhar, W A S D para andar e espaço para pular. Clique ou C coloca um bloco, clique direito ou X tira, Q e E trocam o bloco.

## Ideias para mudar

- Pinte uma textura nova no Molda, ponha em `images/` e acrescente o nome dela na lista NOMES.
- Mude TAMANHO_DO_MUNDO para um mundo maior (e mais pesado de desenhar).
- Mude PULO para pular por cima de dois blocos.

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
