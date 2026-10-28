# Personagens do Arquipélago (Lote 2)

Scripts de Blender sem tela que geram Íris e os sete moradores em
`src/assets/personagens/<id>.glb`. Ainda não estão ligados ao jogo (ver `arte/INVENTARIO.md`).

| id | Quem | Acessórios |
|---|---|---|
| `iris` | Íris, a faroleira (final e retrato do diário) | boné de faroleira, lampião aceso |
| `capi` | Capi, capivara veterinária do Bosque dos Bichos | folha de chapéu, maleta |
| `bento` | Bento, tamanduá confeiteiro da Vila Doce | chapéu de confeiteiro, avental, batedor |
| `mare` | Maré, tartaruga cartógrafa do Recife Coral | óculos, bússola, mapa enrolado |
| `floco` | Floco, pinguim músico do Pico Gelado | cachecol de tricô, cavaquinho |
| `jade` | Jade, coruja dos fósseis e ninhos do Vale dos Dinos | chapéu de safári, lupa |
| `irie` | Iriê, arara que tece o arco-íris da Ilha das Nuvens | tear de mão com o arco-íris |
| `nico` | Nico, caranguejo carteiro da praia (recebe a criança na sua ilha, com o Zappy) | quepe de carteiro, bolsa de cartas a tiracolo com envelopes, carta na pinça |

## Rodar

O mesmo `bpy` 5.2.3 das peças do avatar e do quarto (ver `community-kids/scripts/avatar-blender`):

```sh
/tmp/blender-venv/bin/python arte/personagens/build_all.py           # todos, e confere os limites
/tmp/blender-venv/bin/python arte/personagens/build_all.py capi iris  # só alguns
/tmp/blender-venv/bin/python arte/personagens/capi.py                 # um só
PERSONAGEM_CONTAR=1 …/capi.py   # lista as peças que mais gastam triângulos
```

Prévia (Cycles na CPU, lê o próprio GLB):

```sh
/tmp/blender-venv/bin/python arte/personagens/render.py saida.png \
  "src/assets/personagens/capi.glb:clipe=acenar:q=8" "src/assets/zappy.glb:x=1.2:z=1.5:escala=0.4"
```

## O que cada arquivo traz

- **Clipes em laço:** `parado` (2 s), `andar` (1 s, um ciclo de dois passos), `falar` (2 s),
  `acenar` (2 s, com a mão direita) e `feliz` (1 s, um pulinho). Todos os clipes animam os mesmos
  ossos, então trocar de clipe com fade no `AnimationMixer` não deixa osso preso.
- **Olhos numa malha própria** (`<id>-olhos`, materiais `olho` e `brilho`, a coruja também
  `iris`) com as formas `piscar` e `feliz` (olho em arco). Começam em 0; o jogo pisca mudando
  `morphTargetInfluences`.
- **Cores chapadas** por material com nome (`pelo`, `penas`, `chapeu`, `luz`…), sem textura.
- **Escala:** moradores com ~1,5 a 1,7 de altura, Íris com ~2,2, na mesma escala do avatar. A
  frente olha para +Z no three.js e os pés ficam em y = 0.

### Moradores

Esqueleto próprio e simples (`raiz`, `quadril`, `tronco`, `cabeca`, `braco_esq`, `braco_dir`,
`perna_esq`, `perna_dir` e `cauda` quando tem), com peso 1 por peça: cada pedaço do bicho segue
um osso só, o que combina com as formas arredondadas e separadas. O acessório de mão vai na mão
esquerda, para a direita ficar livre no `acenar`. Teto de ~6 mil triângulos: se passar, `lib_personagens`
afina só as peças grandes e lisas do corpo (a cabeça e os detalhes ficam inteiros).

### Nico

O caranguejo usa o mesmo esqueleto dos moradores com outro sentido: o casco é o `tronco` (com o
rosto, o quepe e a bolsa, que ficam firmes), a `cabeca` leva só as antenas e os olhos (balançam
quando ele fala), as pinças são `braco_esq` e `braco_dir` e as três perninhas de cada lado vão em
`perna_esq` e `perna_dir`. Os clipes são dele (`clipes` em `nico.py`), com os mesmos nomes e
durações: no `andar` as perninhas de cada lado sapateiam alternadas, duas vezes por segundo. A
alça da bolsa dá a volta no casco num plano inclinado (`faixa`), encostada na superfície.

### Íris

Montada com as peças do próprio avatar da plataforma (`community-kids/public/avatar3d/parts`)
no **mesmo esqueleto** `mixamorig:*` do `Armature.glb`: cabeça `head-01`, olhos `eyes-12`,
sobrancelha, nariz, bochechas, tranças `hair-14`, blusa `top-04` com listras de marinheira
cortadas aqui, calça `bottom-04` (a barra entra na galocha), galochas `shoes-04` e cachecol
`acc-10`, com as cores dela gravadas. O boné e o lampião são feitos aqui. Como o esqueleto é o
do avatar, os clipes dela também servem no avatar do jogador.

A cabeça do avatar fica inteira (4,7 mil triângulos) para manter as bocas de fala `B`, `C`, `D`
e o `smile` (morph targets na malha `iris-cabeca`); as outras peças são afinadas. Por isso a Íris
passa do teto dos moradores (~13 mil triângulos, 551 KB). Ela só aparece no final e no retrato.

## Cuidados

- **Formas desligadas no arquivo.** O exportador grava o valor atual de cada forma como peso
  inicial; `formas_dos_olhos` zera `piscar` e `feliz` antes de exportar.
- **Exportação por ação** (`export_animation_mode='ACTIONS'`). No modo `NLA_TRACKS` o exportador
  não sabe quais ossos têm curva e apaga os canais que ficam parados num clipe (o antebraço da
  Íris no `parado`), e no jogo esse osso voltaria para a pose em T.
- **Giros nos eixos do mundo.** As poses dizem `('X', graus)` nos eixos do mundo, a partir da
  pose de descanso. O esqueleto do avatar chega do glTF com y para cima e um giro de 90 graus no
  objeto; `_rot_local` desconta isso.
- **Peças do avatar.** O importador separa os vértices nas costuras: antes de afinar, `iris.py`
  junta de volta, senão o afinar rasga a malha.
