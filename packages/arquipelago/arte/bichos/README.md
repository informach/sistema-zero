# Bichos do Arquipélago (Lote 4)

Scripts de Blender sem tela que geram os bichos em `src/assets/bichos/<id>.glb`. Ainda não estão
ligados ao jogo (ver `arte/INVENTARIO.md`). Mesmo estilo dos moradores e dos Lumis: cores chapadas,
formas arredondadas, olhos grandes e brilhantes, sem textura.

## Rodar

O mesmo `bpy` 5.2.3 do Zappy, dos moradores e dos Lumis:

```sh
/tmp/claude-0/blender-venv/bin/python arte/bichos/build_all.py              # todos, confere e grava relatorio.json
/tmp/claude-0/blender-venv/bin/python arte/bichos/build_all.py vale pico    # só esses grupos
/tmp/claude-0/blender-venv/bin/python arte/bichos/adotar.py gato-filhote    # um bicho só
BICHO_CONTAR=1 …/adotar.py gato   # lista as peças que mais gastam triângulos
```

Prévia (Cycles na CPU, lê o próprio GLB; as opções estão no topo do arquivo):

```sh
/tmp/claude-0/blender-venv/bin/python arte/bichos/render.py saida.png \
  "src/assets/bichos/cachorro.glb:clipe=truque:q=24" "src/assets/bichos/gato.glb:x=0.7"
```

## Os bichos

| id | Grupo | Clipes | Detalhes |
|---|---|---|---|
| `cachorro`, `cachorro-filhote` | adotar | `parado`, `andar`, `correr`, `sentar`, `feliz`, `truque` | vira-lata caramelo de coleira; truque: senta e dá a pata |
| `gato`, `gato-filhote` | adotar | idem | frajola de olhos verdes e bigodes; truque: espreguiça |
| `coelho`, `coelho-filhote` | adotar | idem | cinza-lavanda, orelhas em pé; anda aos pulinhos; truque: pulo alto com giro |
| `porquinho`, `porquinho-filhote` | adotar | idem | porquinho-da-índia tricolor; truque: pulinhos de pipoca |
| `peixe-palhaco`, `peixe-cirurgiao`, `baiacu` | recife | `nadar`, `parado` | origem no meio do corpo (eles boiam) |
| `tartaruguinha` | recife | `nadar`, `parado` | nadadeiras da frente batem como asas |
| `pinguim`, `pinguim-filhote` | pico | `parado`, `andar`, `deslizar` | o filhote é cinza e mais fofo |
| `rex-filhote` | vale | `parado`, `andar`, `pular` | bípede, cabeção e bracinhos |
| `triceratops-filhote` | vale | `parado`, `andar`, `pular` | babado de bolinhas e três chifrinhos |
| `passaro-das-nuvens` | nuvens | `voar`, `pousado` | azul-céu, peito de nuvem, penacho enrolado |
| `bem-te-vi` | bosque | `voar`, `pousado` | barriga amarela e faixa branca na cabeça |
| `borboleta` | bosque | `voar`, `pousado` | azul-morfo; pousa com as asas fechadas e abre devagar |
| `dino-montaria` | montaria | `parado`, `andar`, `correr`, `pular` | parassaurolofo de sela e manta; vazio `sela` |

O filhote dos bichos de adotar é o mesmo desenho com a cabeça maior, as pernas mais curtas e os olhos
maiores, e sai menor pela escala do `Bicho` (cerca de 0,7 do adulto).

## O que todo arquivo traz

- **Clipes em laço** (o `truque` e o `feliz` também, para o jogo tocar com `LoopOnce` quando
  quiser uma vez só). Todos os clipes de um bicho animam os MESMOS ossos, então a troca com fade no
  `AnimationMixer` não deixa osso preso. Exportação por ação, como nos moradores.
- **Olhos numa malha própria** (`<id>-olhos`, materiais `olho` e `brilho`; o gato também `iris`)
  com as formas `piscar` e `feliz`, desligadas no arquivo; o jogo pisca mudando
  `morphTargetInfluences`.
- **Cores chapadas** por material com nome (`pelo`, `claro`, `penas`, `pele`, `casco`, `couro`…).
- **Escala:** a do avatar (~2,2 de altura). Frente para +Z no three.js e os pés em y = 0 (os peixes
  e a tartaruguinha têm a origem no meio do corpo). Altura aproximada: cachorro 0,71, gato 0,59,
  coelho 0,68, porquinho 0,26, pinguim 0,51, rex 0,63, dino de montaria 2,4 (sela a 1,51).

## Esqueletos

Pesos rígidos (cada peça segue um osso só), como nos moradores.

- **Quatro patas** (`esqueleto_quadrupede`): `raiz`, `corpo` (da anca ao ombro: girar o corpo gira
  em volta das ancas, que é como ele senta), `cabeca`, `pata_fe`, `pata_fd`, `pata_te`, `pata_td`,
  `cauda` e, quando tem, `orelha_esq`/`orelha_dir` e `pescoco` (o dino de montaria).
- **Ave e borboleta** (`esqueleto_ave`): `raiz`, `corpo`, `cabeca`, `asa_esq`, `asa_dir`, `cauda`.
  As asas estão abertas no desenho; o `pousado` dobra para trás.
- **Peixe** (`esqueleto_peixe`): `raiz`, `corpo`, `cabeca`, `cauda`, `nadadeira_esq`,
  `nadadeira_dir`.
- **Bípede pequeno** (`esqueleto_chibi`, o dos moradores): pinguim e rex.

## A sela do dino de montaria

`sela` é um vazio filho do osso `corpo`, no assento (y = 1,51 no arquivo). No jogo:
`gltf.scene.getObjectByName('sela')` e o avatar vai como filho dele (ou copia a matriz do mundo a
cada quadro). Ele acompanha o corpo em todos os clipes, inclusive o `pular`.

## Para o jogo cuidar

- Começar cada bicho de um bando num ponto diferente do `parado`/`nadar`, para não piscarem e
  baterem as asas juntos.
- O `deslizar` do pinguim deita o corpo para a frente a partir da `raiz`: a caixa de colisão
  deitada é outra.
- O `voar` dos pássaros e da borboleta não sobe do chão: o jogo põe o bicho na altura de voo.

## Arquivos

- `lib_bichos.py`: os ajudantes (partiu de `arte/personagens/lib_personagens.py`), com os
  esqueletos, os clipes de quatro patas, ave e peixe, o passarinho e a escala do filhote.
- `adotar.py`, `recife.py`, `pico.py`, `vale.py`, `nuvens.py`, `bosque.py`, `montaria.py`: um por grupo.
- `build_all.py`: gera e confere (clipes, olhos, tamanho, teto de triângulos, `sela`).
- `render.py`: a prévia (cópia do dos moradores).
- `relatorio.json`: triângulos, tamanho, clipes e materiais de cada bicho.
