# A ponte apressada no Blender (29/10/2026)

Os modelos 3D do Poder "A ponte apressada" (Faísca), com o mesmo acabamento da Ilha do Farol (as
mesmas formas da `../ilha-do-farol-blender/lib_ilha.py` e as cores do desenho 2D).

| Modelo | O que é | Medidas (Blender, base no chão) |
|---|---|---|
| `ponte-levadica` | dois postes com a roldana na margem, a tábua fixa de entrada, o tabuleiro de tábuas com o corrimão e os postinhos do outro lado. Repouso = levantada; clipes `baixar` e `subir` | 2,8 de comprimento, 1,1 de largura |
| `alavanca` | caixa de madeira com o trilho e o braço com a bola vermelha. Repouso = para cima; clipes `puxar` (o braço vai para o outro lado e a bola fica verde) e `soltar` | 0,64 x 0,44, braço até 1,0 |
| `pedra-do-sino` | pedra com o topo de areia, o pórtico de madeira e o sino de bronze. Clipe `tocar` (o sino balança e para) | 1,5 x 1,2 x 1,6 |
| `laguinho` | água rasa com o fundo mais escuro, a espuma e a borda de areia, chato no chão | 4,0 x 3,0 |

A ponte atravessa no eixo x do jogo, com a margem no x menor. O tabuleiro gira na dobradiça da
margem: `baixar` (~1,2 s) começa devagar, deita sobre a água, quica um pouco e assenta; `subir`
(~1,2 s) dá um tranco, levanta e passa um pouquinho antes de parar em pé. O tabuleiro e os
postinhos do outro lado levam `szSemCaixa`: a área de toque da ponte é só a entrada (os postes e a
tábua fixa), a mesma com a ponte em pé ou deitada, e quem está na pedra do outro lado não encosta
nela. Tocados "uma vez", o Jogo 3D segura o último quadro de cada clipe.

As artes 2D do mesmo Poder (`alavanca-cima.svg`, `alavanca-baixo.svg`, `ponte-levantada.svg`,
`ponte-baixada.svg`, `pedra-do-sino.svg`, `pedra-do-sino-tocando.svg` e `laguinho.svg`, cada par
com a mesma caixa nos dois estados) moram com as do Farol em `packages/studio/src/arte/assets/farol/`
e entram pelo `packages/studio/scripts/gen-farol-assets.py`.

**Onde fica:** o laguinho no gramado da frente da Ilha (no 2D, no gramado de baixo da praia), com
a pedra do sino dentro dele, a ponte saindo da margem do lado do começo e a alavanca do outro lado
da água, na areia: depois de puxar, a criança corre em volta do laguinho até a ponte. O mar da
praia não serve: o barco do Farol para justo no canto de baixo do mar.

## Gerar e publicar

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3

cd docs/design/a-ponte-apressada-blender
PONTE_OUT=./out /tmp/blender-venv/bin/python ponte.py                  # os quatro
PONTE_OUT=./out /tmp/blender-venv/bin/python ponte.py -- alavanca      # só esse
cd ../../..
PONTE_OUT=docs/design/a-ponte-apressada-blender/out bun docs/design/a-ponte-apressada/gerar-artes.ts --remover-antigos
```

`--remover-antigos` tira da biblioteca as versões substituídas: só antes de o curso sair (depois,
um projeto salvo de uma criança aponta para o sha antigo).

| Arquivo | O quê |
|---|---|
| `ponte.py` | a ponte, a alavanca, a pedra do sino e o laguinho, com os clipes |
| `../a-ponte-apressada/gerar-artes.ts` | otimiza os GLBs, publica na biblioteca de modelos dos cursos e grava `modelos.json` (sha, centro, lado maior, clipes) |
| `previa/` | a cena 3D com a ponte levantada e baixada (render do Cycles) e as artes 2D no Farol |
