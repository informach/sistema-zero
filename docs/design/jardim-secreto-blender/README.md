# O Jardim Secreto feito no Blender (28/10/2026)

Scripts que geram as artes 3D da missão O Jardim Secreto (Faísca) com o mesmo acabamento da Ilha
do Farol. Substituem os modelos montados por código com formas do three.js (cilindros, esferas e
anéis) que `../jardim-secreto/gerar-artes.ts` fazia antes. As artes 2D continuam lá.

| Modelo | O que é | Medidas (Blender, base no chão) |
|---|---|---|
| `jardim-acolhedor` | o canteiro inteiro, como um diorama: gramado, trilha, pracinha da flor, canteiro de terra, caminho até o arco, moitas, árvores, cerca, arco com portão e trepadeira, tulipas, pedras, cogumelos, toco, capim e florzinhas | ~25,2 x 16,4; o chão da área de andar no nível 0 |
| `regador-azul` | o regador com o bico para a direita, as duas alças, o chuveiro com furinhos e uma florzinha pintada na frente | ~1,95 de comprimento, ~1,05 de altura |
| `flor-do-jardim` | a flor da missão: botão fechado em repouso, clipe `florescer` | ~1,75 de altura (20% maior que o desenho: lê de longe na prévia estreita) |
| `pedra-do-jardim` | a pedra da pergunta do ponto de vista no quiz (esconde parte do regador de frente) | ~3 x 1,5 |

## Preparar, gerar e publicar

O Blender roda sem tela pelo pacote `bpy` do PyPI, o mesmo da Ilha:

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3

cd docs/design/jardim-secreto-blender
JARDIM_OUT=./out /tmp/blender-venv/bin/python build_all.py               # os quatro
JARDIM_OUT=./out /tmp/blender-venv/bin/python build_all.py -- regador-azul
cd ../../..
bun docs/design/jardim-secreto/gerar-artes.ts --remover-antigos          # otimiza, publica, modelos.json
bun docs/aulas-interativas-tecnico/qa/gerar-jardim-quiz-artes.ts         # o regador, o personagem e a pedra do quiz
bun docs/aulas-interativas-tecnico/qa/gerar-jardim-secreto.ts            # aulas e projetos portáteis
```

`--remover-antigos` tira da biblioteca as versões substituídas: só antes de o curso sair (depois,
um projeto salvo de uma criança aponta para o sha antigo).

| Arquivo | O quê |
|---|---|
| `jardim_lib.py` | cor nos vértices (`mat_vc`, `pintar`), tufos de folhagem (`bolota`), florzinhas, curvas e tubos que não torcem, e `assar_cores`, que passa a cor de cada material para os vértices e deixa um material só; usa os ajudantes da Ilha (`../ilha-do-farol-blender/lib_ilha.py`) |
| `cenario.py` | o jardim: terreno, trilha, vegetação, cerca e arco |
| `objetos.py` | o regador, a flor com o clipe e a pedra do quiz |
| `previa/` | o jogo antes e depois, a flor aberta no jogo, o regador e a abertura da flor |

## O contrato com o jogo

- No Blender, z é para cima e a frente olha para -Y; o exportador converte para o y para cima do
  three.js e a frente vira +Z, o lado da câmera. `g(x, z)` traduz um ponto do jogo.
- O projeto (`qa/jardim-projeto.ts`) cria cada modelo com o tamanho e o centro de `modelos.json`,
  então o modelo fica onde o Blender o desenhou. O jardim leva dois marcos de 1 mm nos cantos de
  uma caixa simétrica: o jogo centraliza a caixa e o canteiro fica exatamente na origem.
- A composição segue o projeto: área de andar de x -9 a 9 e z -4 a 4, plana no nível 0;
  personagem em (-7, 1), regador em (-4, -2) e (-2, -2) na grama livre, flor no canteiro em (5, 1).
  Nada de decoração na área de andar além de capim baixo e poucas florzinhas longe desses pontos.
- **Flor**: em repouso é o botão fechado. `florescer` (1,5 s, "uma vez") incha o botão, abre cinco
  pétalas de fora e cinco de dentro, que crescem um pouco ao abrir, com um passo além do ponto e a
  volta; o miolo cresce e cinco brilhos sobem e somem. A pose final fica aberta. Pétalas, miolo e
  brilhos levam `szSemCaixa`: a área de toque (caule, folhas e sépalas) é a mesma fechada ou aberta.
- **Materiais**: o jardim tem três, todos com a cor nos vértices: o chão (`szSemSombra`), o que faz
  sombra (moitas, árvores, pedras, cerca, arco) e o miúdo, que não faz (capim, florzinhas,
  seixos, tulipas, cogumelos). A cor de cada peça vira cor de vértice (`assar_cores`).

## Desempenho: o executor dos objetivos desenha sem placa de vídeo

O "Verificar projeto" roda o jogo num Chromium sem placa de vídeo (aqui e no servidor). Ali cada
quadro custa ~150 a 200 ms e cada comando do robô espera um quadro. Medido no mesmo navegador:

| | triângulos | fazem sombra | quadro aquecido |
|---|---|---|---|
| jardim antigo (formas do three.js) | 35 mil | todos | ~158 ms |
| primeira versão do Blender | 66 mil | todos | — (a abertura travava 6 s) |
| versão publicada | 43 mil | ~17 mil | ~190 ms |

O que pesava e foi cortado: bolotas demais nas moitas (as de trás da cerca têm duas, de baixa
resolução), a grade do gramado fina onde a cor não muda, a borda do canteiro com anéis demais, e a
sombra das peças miúdas. O arquivo publicado tem ~760 KB.

O robô também mudou (`packages/studio-runtime/runtime/check-approach-3d.mjs` e
`check-objectives.mjs`): segura a seta nos trechos longos e acompanha a posição, soltando antes do
ponto pela velocidade medida, em vez de uma sequência de toques; e o primeiro passo espera os
modelos chegarem (`window.__szModelosPendentes`, do Jogo 3D) e uma janela de 2 s de quadros sem
trava. Com isso os cinco cenários 3D do Jardim e os nove da Ilha distinguem como esperado.
