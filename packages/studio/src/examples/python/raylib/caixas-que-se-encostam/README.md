# Caixas que se Encostam

Ande com um cubo entre caixas vestidas com uma textura do Molda: a colisão resolvida eixo por eixo deixa deslizar encostado.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

As setas andam com o cubo vermelho. As caixas barram o caminho; pegue as moedas douradas.

## Ideias para mudar

- Mude LUGARES para montar outro labirinto de caixas.
- Desenhe uma textura no Molda e troque `images/caixa.png`.
- Tire a linha `resolver('z', passo_z)` e veja o cubo atravessar as caixas de frente.

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
