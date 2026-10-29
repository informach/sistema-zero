# O baú dos símbolos no Blender (29/10/2026)

Os modelos 3D do Poder "O baú dos símbolos" (Faísca), com o mesmo acabamento da Ilha do Farol (as
formas da `../ilha-do-farol-blender/lib_ilha.py` e as cores do desenho 2D). O baú é o
`bau-do-tesouro` das Moedas (clipe `abrir`), que já está publicado.

| Modelo | O que é | Medidas (Blender, base no chão) |
|---|---|---|
| `pedra-sol` | pedra baixa com o rosto redondo virado para a câmera e o sol gravado (o disco e oito raios soltos). Repouso = apagada; clipes `acender` e `apagar` | 0,95 x 0,8, altura 0,7 |
| `pedra-lua` | a mesma pedra com a meia-lua | idem |
| `pedra-estrela` | a mesma pedra com a estrela de cinco pontas | idem |
| `placa-da-ordem` | a tabuleta de madeira em dois postes com o sol, a lua e a estrela em fila e as setas entre eles | 1,5 de largura, 1,36 de altura |

O aceso é uma peça só (o rosto claro, o símbolo dourado e o anel de luz em volta), com a origem no
centro do rosto: em repouso tem escala zero, o `acender` (~0,4 s) a faz crescer e passar um pouco
antes de assentar, e o `apagar` a esconde na hora. O `apagar` não encolhe de propósito: o Jogo 3D
começa o clipe do início a cada pedido, e o "senão" do jogo apaga as três pedras de uma vez; com
escala zero do começo ao fim, numa pedra que já estava apagada ele não pisca. Tocados "uma vez", o Jogo 3D segura o último quadro de
cada clipe. O sol leva os raios soltos do disco de propósito: a estrela tem as pontas grudadas, e
de longe os dois não podem se confundir.

As artes 2D do mesmo Poder (`pedra-sol.svg`, `pedra-sol-acesa.svg`, `pedra-lua.svg`,
`pedra-lua-acesa.svg`, `pedra-estrela.svg`, `pedra-estrela-acesa.svg` e `placa-da-ordem.svg`, cada
par com a mesma caixa nos dois estados) moram com as do Farol em
`packages/studio/src/arte/assets/farol/` e entram pelo `packages/studio/scripts/gen-farol-assets.py`,
que desde este Poder aceita `<circle>`, `opacity` e os arcos (`A`) dos caminhos.

## Gerar e publicar

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3

cd docs/design/o-bau-dos-simbolos-blender
SIMBOLOS_OUT=./out /tmp/blender-venv/bin/python simbolos.py                  # os quatro
SIMBOLOS_OUT=./out /tmp/blender-venv/bin/python simbolos.py -- pedra-lua     # só esse
cd ../../..
SIMBOLOS_OUT=docs/design/o-bau-dos-simbolos-blender/out bun docs/design/o-bau-dos-simbolos/gerar-artes.ts --remover-antigos
```

`--remover-antigos` tira da biblioteca as versões substituídas: só antes de o curso sair (depois,
um projeto salvo de uma criança aponta para o sha antigo).

| Arquivo | O quê |
|---|---|
| `simbolos.py` | as três pedras com os clipes e a placa da ordem |
| `../o-bau-dos-simbolos/gerar-artes.ts` | otimiza os GLBs, publica na biblioteca de modelos dos cursos e grava `modelos.json` (sha, centro, lado maior, clipes) |
| `previa/` | as pedras apagadas e acesas e a placa (render do Cycles) e as artes 2D com o baú das Moedas |
