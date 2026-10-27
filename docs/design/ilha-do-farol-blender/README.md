# A Ilha do Farol feita no Blender (piloto, 27/10/2026)

Scripts que geram as artes 3D do curso A Ilha do Farol com acabamento, fiéis aos desenhos 2D da
Chave do Farol (`packages/studio/src/arte/assets/farol/*.svg`). Substituem os projetos do Molda de
`../ilha-do-farol-molda/projetos/`, que eram montados com formas básicas.

**Estado: piloto para aprovação.** As peças ainda NÃO estão ligadas ao curso:
`docs/aulas-interativas-tecnico/qa/ilha-do-farol-assets.ts` continua lendo o Molda.

| Peça (id do GLB) | Substitui (Molda) | Posição no curso |
|---|---|---|
| `mar` | mar | origem |
| `terreno` (praia tropical) | terreno | origem |
| `ponte` | ponte | origem |
| `coqueiro-tras`, `coqueiro-frente` | os dois coqueiros | (-7, 0, -4,2) e (-6,6, 0, 4,5) |
| `vegetacao` | vegetação pequena | origem |
| `pedras` | pedras | (-2, 0, -1) |
| `farol-listrado-apagado`, `farol-listrado-aceso` | farol apagado e aceso | (5,2, 0, 0,1) |
| `veleiro` | veleiro | (8,5, -0,1, 4,5) |
| `aventureiro` | aventureiro | centro em (-6,5, 0,8, 0,75) |
| `chave-dourada` | chave | centro em (-2, 1, -3) e (-3, 1, -2) |
| `bancada` | bancada das experiências | origem, tampo em y = 0 (hoje a cena das experiências desenha uma caixa no código, `scene-island-world.tsx`) |

As imagens de `previa/` comparam o 2D, o 3D atual e o novo, renderizados com o three.js do jogo,
a câmera do curso e as luzes do Jogo 3D: a cena inteira, o farol apagado e aceso, e todas as 13
peças lado a lado (`comparacao-elementos-1` e `-2`; o atual sai do próprio GLB do Molda).

## Preparar

O Blender roda sem tela pelo pacote `bpy` do PyPI (o mesmo do quarto e do avatar):

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3
```

## Gerar e conferir

```sh
ILHA_OUT=./out /tmp/blender-venv/bin/python build_all.py               # todas
ILHA_OUT=./out /tmp/blender-venv/bin/python build_all.py -- veleiro    # só essa
ILHA_OUT=./out /tmp/blender-venv/bin/python verificar_pedra.py         # a pedra esconde a chave?
```

| Arquivo | O quê |
|---|---|
| `lib_ilha.py` | paleta tirada dos SVGs e formas da ilha (contorno orgânico em camadas, faixa, folha, pedra lapidada, superelipsoide, mecha); reaproveita `community-kids/scripts/room-blender/lib_q.py` |
| `cenario.py` | mar, terreno, ponte, coqueiros, moitas, pedras e a bancada das experiências |
| `farol.py` | farol listrado, apagado e aceso |
| `objetos.py` | chave, veleiro e aventureiro |
| `verificar_pedra.py` | lança raios da câmera do jogo até cada vértice da chave e falha se algum ficar à vista no esconderijo |
| `referencias/` | coqueiro e pedras que a autora refez no Molda (27/10/2026): a FORMA dessas peças vem daqui, o acabamento é dos scripts |

## O contrato com o jogo

- Mesmas unidades e referenciais dos projetos do Molda (`../ilha-do-farol-molda/mapa-de-reintegracao.json`).
  No Blender, z é para cima e a frente olha para -Y; o exportador converte para o y para cima do
  three.js e a frente vira +Z, o lado da câmera.
- `createModelFile` encaixa o LADO MAIOR do modelo no tamanho pedido e usa a caixa do modelo como
  área de contato. Por isso o aventureiro mantém ~0,8 x 1,58 x 0,65 e o pé do farol ~1,8 de lado (a
  porta abre quando as duas caixas se tocam).
- O jogo não gira o personagem ao andar: ele fica de frente para a câmera, virado 25° para o farol,
  como no desenho de perfil.
- As pedras precisam esconder a chave em (-2, 1, -3), o esconderijo da aula 1. Em (-3, 1, -2),
  a posição das partes seguintes, a chave já fica em parte à vista com as pedras do Molda, de
  propósito ("a pedra pode esconder a chave dependendo de onde a gente olha"). Mexeu nelas, rode
  `verificar_pedra.py`.
- O coqueiro e as pedras seguem as referências da autora (`referencias/*.glb`): o script lê o
  GLB, solda os vértices (o Molda exporta cada triângulo solto) e refaz o acabamento por cima.
  Uma referência nova é só trocar o arquivo e gerar de novo.

## Pendências para a integração (depois da aprovação)

1. **Ligar os GLBs ao curso**: `ilha-do-farol-assets.ts` passa a ler os GLBs daqui (mesmos nomes de
   asset), e os projetos e a cena das experiências são gerados de novo.
2. **Sombra listrada no Jogo 3D**: o `_setupWorld` de `game-3d/runtime.ts` não define
   `shadow.normalBias`, e as superfícies curvas ficam listradas (shadow acne). O Jogo 3D Avançado e o
   Mundo 3D já usam `normalBias = 0.05`; aplicar o mesmo no Jogo 3D.
3. **Luz do curso**: com a luz de hoje (ambiente 0,65 do curso + 0,6 e sol 0,9 do motor), o three.js
   entrega ~60% da cor e tudo sai apagado em relação ao 2D (vale também para a arte atual). A prévia
   "luz ajustada" usa ambiente 1,4 e um "Adicionar sol" de 0,7 a mais (blocos que já existem).
4. **Peso**: depois da quantização do `ilha-do-farol-assets.ts`, as peças da ilha somam ~730 KB, contra
   ~216 KB das atuais, e todo projeto do curso leva os assets embutidos. Com as variações (8
   personagens, 4 faróis, 4 barcos, 3 chaves, 4 cenários), embutir tudo em cada projeto não serve.
