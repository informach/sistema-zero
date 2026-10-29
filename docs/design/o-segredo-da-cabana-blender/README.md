# O segredo da cabana no Blender (29/10/2026)

Os modelos 3D do Poder "O segredo da cabana" (Faísca), com o mesmo acabamento da Ilha do Farol
(as mesmas formas da `../ilha-do-farol-blender/lib_ilha.py` e as cores do desenho 2D).

| Modelo | O que é | Medidas (Blender, base no chão) |
|---|---|---|
| `emblema-do-farol` | escudo de borda dourada e fundo azul com um farolzinho listrado em relevo dos dois lados, de pé e de frente para a câmera; o jogo o faz girar (bloco "Girar") | 0,5 x 0,6, centro a 0,42 do chão |
| `cabana-do-faroleiro` | paredes de tábuas, telhado vermelho de duas águas, chaminé, claraboia, duas janelas com cruz, o encaixe do emblema acima da porta e a porta com fechadura de ouro. Repouso = fechada; clipe `abrir` | 2,4 x 2,0 x 2,6 |

O clipe `abrir` (24 quadros por segundo, ~1,7 s): a porta dá um tranco, abre para fora além do
ponto (112°) e assenta em 104°, girando na dobradiça da borda esquerda; atrás dela aparece a luz
quente de dentro, e um a um acendem as duas janelas, a claraboia e o farolzinho branco no encaixe
do emblema. A pose de repouso não tem rotação na porta (fechada é a malha como está) e as luzes
ficam em escala 0. Tocado "uma vez", o Jogo 3D segura o último quadro (`clampWhenFinished`): a
cabana fica aberta.

As artes 2D do mesmo Poder (`emblema.svg`, `cabana-fechada.svg` e `cabana-aberta.svg`, com a
mesma caixa fechada e aberta) moram com as do Farol em `packages/studio/src/arte/assets/farol/` e
entram pelo `packages/studio/scripts/gen-farol-assets.py` (só `rect`, `ellipse`, `line`, `polygon`
e `path` com M, L, C e Z, sem transparência).

## Gerar e publicar

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3

cd docs/design/o-segredo-da-cabana-blender
CABANA_OUT=./out /tmp/blender-venv/bin/python cabana.py                         # os dois
CABANA_OUT=./out /tmp/blender-venv/bin/python cabana.py -- cabana-do-faroleiro  # só esse
cd ../../..
bun docs/design/o-segredo-da-cabana/gerar-artes.ts --remover-antigos            # otimiza, publica, modelos.json
```

`--remover-antigos` tira da biblioteca as versões substituídas: só antes de o curso sair (depois,
um projeto salvo de uma criança aponta para o sha antigo).

| Arquivo | O quê |
|---|---|
| `cabana.py` | o emblema e a cabana com o clipe |
| `../o-segredo-da-cabana/gerar-artes.ts` | otimiza os GLBs, publica na biblioteca de modelos dos cursos e grava `modelos.json` (sha, centro, lado maior, clipes) |
| `previa/` | o emblema e a cabana fechada e aberta (render do Cycles) e as artes 2D na praia do Farol |
