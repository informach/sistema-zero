# A Ilha do Farol feita no Blender (27/10/2026)

Scripts que geram as artes 3D do curso A Ilha do Farol com acabamento, fiéis aos desenhos 2D da
Chave do Farol (`packages/studio/src/arte/assets/farol/*.svg`), com as mesmas variações da
personalização do 2D. Substituem os projetos do Molda de `../ilha-do-farol-molda/projetos/`.

**Estado: ligado ao curso.** Os modelos ficam na biblioteca de modelos dos cursos do Estúdio
(`packages/studio/src/core/course-models/`, ver `core/courseModels.ts`): o projeto da criança leva
só a referência de cada um nos manifestos das aulas, e o Estúdio carrega o arquivo na hora
de rodar o jogo. O arquivo completo `ilha-do-farol.szproject.json` embute as 24 malhas para
importação portátil, sem depender da biblioteca de modelos da versão instalada. Os comandos
do projeto exigem Jogo 3D 0.32.0 ou posterior. Referências indisponíveis interrompem a prévia
com uma mensagem e opção de tentar novamente, em vez de abrir uma cena sem modelos.

| Categoria | Peças (nome na lista do bloco) | Caixa comum (`lib_ilha.CAIXAS`) |
|---|---|---|
| cenário | `praia-tropical`, `costa-rochosa`, `ilha-nevada`, `noite-na-ilha` (mar, terreno, grama, ponte, árvores, moitas e céu; as pedras são o modelo `pedras`) | x e y ±70, z de -0,5 a 67,7 (tamanho 140) |
| farol | `farol-listrado`, `farol-de-pedra`, `farol-de-madeira`, `farol-colorido`, todos com os clipes `acender` e `aceso` | x e y ±0,9, z de 0 a 5,3 |
| barco | `veleiro`, `barco-de-pesca`, `lancha`, `barco-pirata` | x ±1,55, y ±0,68, z de -0,38 a 2,7 |
| chave | `chave-dourada`, `chave-prateada`, `chave-de-estrela` | x de -0,6 a 0,64, y ±0,12, z de -0,54 a 0,6 |
| personagem | `aventureiro`, `menina-de-laco`, `marinheira`, `menino-de-bone`, `exploradora-de-chapeu`, `pirata`, `mergulhador`, `robo`, todos com `parado` e `andando` | x ±0,5, y ±0,6, z de -0,04 a 1,62 |
| — | `pedras` (o esconderijo da chave) e `bancada` (o chão das experiências) | — |

Cada modelo de uma categoria leva dois marcos de 1 mm nos cantos da caixa da categoria
(`caixa_da_categoria`): o build falha se uma peça passar da caixa, e a caixa que o jogo mede sai
igual em todas. Assim a troca na personalização não muda tamanho, centro nem área de toque.

`previa/` tem as comparações com o 2D e o 3D anterior; `galeria/` tem as miniaturas que o
caderno da aula usa na página das escolhas.

## Preparar

O Blender roda sem tela pelo pacote `bpy` do PyPI (o mesmo do quarto e do avatar):

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3
```

## Gerar, conferir e publicar

```sh
ILHA_OUT=./out /tmp/blender-venv/bin/python build_all.py               # todas
ILHA_OUT=./out /tmp/blender-venv/bin/python build_all.py -- veleiro    # só essa
ILHA_OUT=./out /tmp/blender-venv/bin/python verificar_pedra.py         # a pedra esconde a chave?
ILHA_OUT=./out bun docs/aulas-interativas-tecnico/qa/publicar-ilha-modelos.ts   # biblioteca + modelos.json
ILHA_OUT=./out bun docs/aulas-interativas-tecnico/qa/gerar-ilha-artes.ts        # cena das experiências
bun docs/aulas-interativas-tecnico/qa/gerar-ilha-do-farol.ts                    # aulas
```

⚠️ O publicador lê as 24 peças da pasta `ILHA_OUT` e regrava a biblioteca inteira: a pasta precisa
ter TODAS, na versão publicada. Uma peça velha ou faltando muda o sha dela (ou falha). Gere de novo
só o que mudou e copie para a pasta de onde a última publicação saiu.

⚠️ Depois que o curso sair, um modelo substituído CONTINUA na biblioteca (o projeto salvo de uma
criança aponta para o sha antigo). `--remover-antigos` no publicador só antes do lançamento.

| Arquivo | O quê |
|---|---|
| `lib_ilha.py` | paleta tirada dos SVGs, formas (contorno em camadas, faixa, folha, pedra, superelipsoide, mecha), materiais em degradê, clipes por faixas do NLA, as caixas das categorias e a exportação |
| `cenario.py` | os quatro cenários (terreno, mar, grama), as pedras e a bancada |
| `farol.py` | os quatro faróis com a luz animada |
| `barcos.py` | barco de pesca, lancha e barco pirata |
| `objetos.py` | as três chaves, o veleiro e o aventureiro (com o esqueleto e os clipes que os outros personagens usam) |
| `personagens.py` | os outros sete personagens |
| `verificar_pedra.py` | lança raios da câmera do jogo até cada vértice da chave e falha se algum ficar à vista no esconderijo |
| `modelos.json` | o que o publicador gravou: sha, clipes e caixa de cada peça (o gerador do curso lê só isto) |
| `referencias/` | coqueiro, pedras, farol aceso e veleiro que a autora fez no Molda: deles veio a forma do coqueiro e das pedras e a luz do farol; o veleiro é o nosso, com o acabamento que veio da referência |

## O contrato com o jogo

- No Blender, z é para cima e a frente olha para -Y; o exportador converte para o y para cima do
  three.js e a frente vira +Z, o lado da câmera.
- `createModelFile` encaixa o LADO MAIOR no tamanho pedido e centraliza a caixa no objeto. O projeto
  soma o centro medido à posição (`placed` em `ilha-do-farol-projeto.ts`) para o modelo ficar onde
  o Blender o desenhou. O cenário mede 140 (o motor aceita até 200 desde esta integração).
- **Farol**: em repouso a luz tem tamanho ~0 (apagado). `acender` (1,25 s, "uma vez") acende o vidro
  de baixo para cima e abre o feixe; `aceso` (6 s, laço) gira o feixe. O jogo toca `acender` no
  encontro com a chave e passa para `aceso` quando `acender` termina. O feixe, o vidro aceso e a
  lâmpada levam `szSemCaixa` nos extras: o Jogo 3D os deixa fora da área de toque.
- **Personagem**: o laço pronto toca `andando` enquanto ele se move (e o vira para a direção do
  movimento) e `parado` quando para.
- As pedras precisam esconder a chave em (-2, 1, -3), o esconderijo da aula 1. Mexeu nelas, rode
  `verificar_pedra.py`.
- **Cenário com acabamento de jogo 3D** (27/10/2026: não precisa copiar o 2D): o chão é um terreno
  contínuo com a cor nos vértices (`COLOR_0`; areia, trilha, praia seca e molhada) que desce e
  continua por baixo do mar translúcido (o raso clareia sozinho sobre a areia), com uma linha de
  espuma na beira; a grama é um tapete à parte com a borda nítida e inclinada, manchas de tom e
  tufos. O material do chão leva `szSemSombra` nos extras: o Jogo 3D não o deixa fazer sombra (uma
  folha aberta faria sombra nela mesma nas encostas). Peça translúcida (a água, o feixe) também não
  faz sombra.
- Ao juntar as peças, só a primeira camada de UV vira `TEXCOORD_0`: a camada do céu se chama
  `UVMap`, como as outras, e o material liga a textura a ela num nó UV Map. Sem isso o exportador
  gravava `texCoord: -1`, a otimização tirava as coordenadas e o degradê do céu sumia.
- As texturas (o céu e o degradê da luz) vão dentro do GLB. O Jogo 3D e a cena das experiências as
  leem pela img: o fetch(blob:) do GLTFLoader esbarra na CSP.

## Luz (decidida em 27/10/2026)

O curso usa a luz que o Jogo 3D cria sozinho, sem bloco de luz próprio. Antes, com a ambiente 0,65
do curso somada à 0,6 e ao sol 0,9 do motor, as peças saíam mais apagadas que no 2D (o three.js
divide a luz por pi). O motor passou a criar ambiente 2,1 e sol 1,7 (`LIGHT_AMBIENT` e `LIGHT_SUN`
no runtime do Jogo 3D), e a cor da tela agora é a cor do modelo. A oficina do Molda e a cena das
experiências (`scene-island-world.tsx`) usam os mesmos números; o teste `workshopLights` do Estúdio
confere que o jogo e o Molda continuam iguais.
