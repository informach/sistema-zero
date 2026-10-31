# Peças do quarto feitas no Blender

Scripts que geram as 66 peças do quarto 3D (27/10/2026): as 39 que existiam, refeitas com
acabamento (antes eram caixas e cilindros montados em código), e 27 novas. Cada peça vira um GLB
em `public/room3d/items/<id>.glb` e uma miniatura em `public/room3d/thumbs/<id>.png`, nas duas
comunidades. O quarto continua com as primitivas antigas como reserva, para quando o arquivo não
baixa.

## Preparar

O Blender roda sem tela pelo pacote `bpy` do PyPI, que pede Python 3.13 (o mesmo do avatar):

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3
```

## Gerar

```sh
ROOM_OUT=./out /tmp/blender-venv/bin/python build_all.py              # todas
ROOM_OUT=./out /tmp/blender-venv/bin/python build_all.py -- cama tv   # só essas
```

Cada id do catálogo é uma função (com `-` trocado por `_`) de um destes arquivos:

| Arquivo | Peças |
|---|---|
| `moveis.py` | cama, cadeira, mesa, sofá, estante, baú, escrivaninha, TV, beliche, pufe |
| `decor.py` | enfeites de chão e de parede, plantas e luzes antigos |
| `trofeus.py` | os 8 troféus e a estante de troféus |
| `pets.py` | gato, cachorro e passarinho, com animação (gato e cachorro também com `andar` e `correr` para o Arquipélago, ver o topo do arquivo) |
| `novos.py` | as 27 peças novas (guarda-roupa, cantinho gamer, aquário animado, lâmpada de lava animada, letreiro neon…) |
| `lib_q.py` | paleta e ajudantes (caixa chanfrada, almofada, tubo, prisma, texto, exportação) |

Depois de gerar, copie os GLBs para as duas pastas e refaça as miniaturas:

```sh
cp out/*.glb ../../public/room3d/items/ && cp out/*.glb ../../../community/public/room3d/items/
cd ../.. && bun run gen:room-thumbs            # ou: bun run gen:room-thumbs cama tv
```

O gerador de miniaturas grava nas duas comunidades.

## O contrato do quarto

- 1 célula da grade = 1 unidade. No Blender, z é para cima e a FRENTE da peça olha para -Y; o
  exportador converte para o y para cima do three.js e a frente vira +Z.
- **Peça de chão:** base em z = 0, centrada no footprint `w × h` do catálogo.
- **Peça de parede:** centrada na origem, com o fundo em y = +0,10. O quarto a pendura 0,14 à
  frente da parede, então nada pode passar de y = +0,14.
- **Nichos** (`SURFACE_SLOTS` em `member-shell/src/lib/room-catalog.ts`): a altura do tampo do
  modelo tem que bater com o `y` do nicho (mesa 0,81, escrivaninha 0,84, criado-mudo 0,64, cômoda
  0,92, prateleiras da estante e da estante de troféus).
- Peça que empilha (`stackable`) cabe em ~0,8 de lado: em cima de um móvel ela encolhe para 0,72.
- Peça parada vira uma malha só, com a transformação aplicada. Peça animada (bichinhos, aquário,
  lâmpada de lava) guarda as partes que mexem como objetos com o pivô na junta, e as chaves em
  laço; o quarto toca todas as animações do arquivo e marca a peça como `animated` no catálogo.
  Exceção: `andar` e `correr` do gato e do cachorro (31/10/2026) são do jogo, e o quarto não os
  toca (`CLIPES_SO_DO_JOGO` em `avatar-quarto/src/quarto/room-glb-model.tsx`). Eles saem das faixas
  do NLA (`export(..., clipes=True)`), e a cena desses dois roda a 120 qps.
  Conferência: `arquipelago/tests/pets-andam-sem-escorregar.test.ts`.

`tests/room3d-catalog.test.ts` (no Kids) confere que toda peça tem GLB e miniatura iguais nas duas
pastas, que só as peças animadas têm animação e, lendo os GLBs, que cada peça parada está no lugar
certo (base no chão, dentro do footprint, sem atravessar a parede).
