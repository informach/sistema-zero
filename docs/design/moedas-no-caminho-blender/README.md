# Moedas no caminho no Blender (29/10/2026)

Os modelos 3D do Poder "Moedas no caminho" (Faísca), com o mesmo acabamento da Ilha do Farol
(as mesmas formas da `../ilha-do-farol-blender/lib_ilha.py` e as cores do desenho 2D).

| Modelo | O que é | Medidas (Blender, base no chão) |
|---|---|---|
| `moeda-de-ouro` | disco de borda escura, face dourada e estrela clara em relevo dos dois lados, de pé e de frente para a câmera; o jogo a faz girar (bloco "Girar") | 0,68 de diâmetro, centro a 0,42 do chão |
| `bau-do-tesouro` | caixa de madeira com tábuas, faixas, cantoneiras e fechadura de ouro, tampa arredondada; dentro, um monte de moedas e duas pedras preciosas. Repouso = fechado; clipe `abrir` | 1,12 x 0,75 x 0,92 |

O clipe `abrir` (24 quadros por segundo, ~1,7 s): a tampa dá um tranco, abre além (116°) e
assenta em 106°, girando na dobradiça da borda de trás; o tesouro dá um pulinho e quatro brilhos
sobem. A pose de repouso não tem rotação (a tampa fechada é a malha como está). Tocado "uma vez",
o Jogo 3D segura o último quadro (`clampWhenFinished`): o baú fica aberto.

As artes 2D do mesmo Poder (`moeda.svg`, `bau-fechado.svg` e `bau-aberto.svg`, com a mesma caixa
fechado e aberto) moram com as do Farol em `packages/studio/src/arte/assets/farol/` e entram pelo
`packages/studio/scripts/gen-farol-assets.py` (só `rect`, `ellipse`, `line`, `polygon` e `path`
com M, L, C e Z, sem transparência).

## Gerar e publicar

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3

cd docs/design/moedas-no-caminho-blender
MOEDAS_OUT=./out /tmp/blender-venv/bin/python moedas.py                    # os dois
MOEDAS_OUT=./out /tmp/blender-venv/bin/python moedas.py -- bau-do-tesouro  # só esse
cd ../../..
bun docs/design/moedas-no-caminho/gerar-artes.ts --remover-antigos         # otimiza, publica, modelos.json
```

`--remover-antigos` tira da biblioteca as versões substituídas: só antes de o curso sair (depois,
um projeto salvo de uma criança aponta para o sha antigo).

| Arquivo | O quê |
|---|---|
| `moedas.py` | a moeda e o baú com o clipe |
| `../moedas-no-caminho/gerar-artes.ts` | otimiza os GLBs, publica na biblioteca de modelos dos cursos e grava `modelos.json` (sha, centro, lado maior, clipes) |
| `previa/` | os modelos com a luz do Jogo 3D e a moeda e o baú 2D na praia do Farol |
