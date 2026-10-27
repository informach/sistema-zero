# Itens do Arquipélago no Blender

Lote 5 do `arte/INVENTARIO.md`: colheita, sementes, comidas, ferramentas, coleção, peças de lugar
e a cozinha da casa. Cada item tem uma função num script por grupo, que monta o modelo no Blender
sem tela (o mesmo `bpy` do mundo, dos personagens e dos Lumis) e grava um GLB em
`src/assets/itens/<id>.glb`. Para o HUD, cada item também tem um ícone de 256 px com fundo
transparente em `src/assets/icones/<id>.png`. Os itens ainda não estão ligados ao jogo.

## Rodar

```sh
# todos os itens, a conferência do contrato e o relatorio.json (triângulos, tamanho, nós, clipes)
/tmp/claude-0/blender-venv/bin/python -B arte/itens/build_all.py

# o mesmo, refazendo os ícones (Cycles na CPU, cerca de 1 min para os 44)
ICONES=1 /tmp/claude-0/blender-venv/bin/python -B arte/itens/build_all.py

# um grupo, ou só alguns itens dele
ITEM=bau,moeda /tmp/claude-0/blender-venv/bin/python -B arte/itens/colecao.py

# ícones de alguns itens e a redução de paleta (Pillow do Python do sistema)
ITEM=bau /tmp/claude-0/blender-venv/bin/python -B arte/itens/render.py icones
python3 -I arte/itens/icones_paleta.py [folha.png]

# prévia grande de um item, fora do jogo
/tmp/claude-0/blender-venv/bin/python -B arte/itens/render.py previa /tmp/fogao.png src/assets/itens/fogao.glb
```

`ITENS_OUT=/outra/pasta` grava os GLBs em outro lugar.

## Ajudantes

`lib_itens.py` reaproveita, sem copiar, as formas do quarto (`community-kids/scripts/room-blender/
lib_q.py`) e as da Ilha do Farol (`docs/design/ilha-do-farol-blender/lib_ilha.py`), como o
`arte/mundo` faz. Ele também acrescenta:

- a paleta dos itens;
- `torneado` (peça de torno), `prato`, `tigela`, `meio_cilindro` e `malha`;
- `exportar(pid, nos, vazios, clipes)`: grava vários nós com nome e pivô, nós vazios e clipes.
  Os clipes são gravados como faixas do NLA, do jeito da Ilha do Farol;
- `rodar(itens)`: uma cena limpa por item.

## Convenções

- **Origem e eixos:** no Blender o z aponta para cima e a frente olha para −Y; o glTF converte
  para o y para cima do three.js. Cada item sai com a origem no meio da base: o ponto mais baixo
  fica em y = 0, centrado em x e z (conferido no three.js). A escala é a do avatar (1,6 de altura)
  e a do Zappy.
- **Cores e materiais:** as cores são chapadas, sem texturas. O código acha os materiais pelo nome:
  - a lanterna usa `luz` e o fogo do fogão usa `fogo` e `brasa`. Todos saem com força de emissão
    1, e o jogo regula o brilho, como no lampião da casa;
  - no Quadro das Cores, cada espaço tem o material `cor-1` a `cor-6` com a cor de verdade. O jogo
    deixa cinza e acende um por um, como as ilhas do anel;
  - nas placas, a face lisa do nó `texto` usa o material `placaFace`.
- **Ferramentas:** ficam de pé, com o cabo para cima. O nó vazio `mao` marca a pegada, e o jogo
  prende esse ponto na mão do avatar.
- **Clipes:**
  - `bau`: o clipe `abrir` gira a `tampa` na dobradiça, atrás em cima. Dura 0,75 s e toca uma vez
    (`LoopOnce` com `clampWhenFinished`). No fim, a tampa fica em −104°;
  - `moeda`: o clipe `girar` dá uma volta em 1 s, em laço.
- **Nós com mais de um material:** viram um grupo com uma malha por material no three.js. O nome
  do grupo é o nome do nó.

## Peças

Tamanho = largura × altura × fundo, em unidades do jogo.

| Arquivo | Grupo | Nós e contrato | Tamanho | Triângulos | GLB |
|---|---|---|---|---|---|
| `abobora.glb` | colheita | `abobora` | 0.30 × 0.26 × 0.30 | 618 | 15 KB |
| `alface.glb` | colheita | `alface` | 0.23 × 0.17 × 0.24 | 2472 | 46 KB |
| `alga.glb` | colheita | `alga` | 0.08 × 0.29 × 0.09 | 892 | 18 KB |
| `batata-doce.glb` | colheita | `batata-doce` | 0.43 × 0.14 × 0.12 | 366 | 10 KB |
| `flor-de-algodao.glb` | colheita | `flor-de-algodao` | 0.15 × 0.18 × 0.15 | 1180 | 25 KB |
| `milho.glb` | colheita | `milho` | 0.55 × 0.14 × 0.36 | 764 | 37 KB |
| `morango.glb` | colheita | `morango` | 0.10 × 0.13 × 0.10 | 842 | 19 KB |
| `tomate.glb` | colheita | `tomate` | 0.14 × 0.16 × 0.13 | 572 | 14 KB |
| `semente-abobora.glb` | sementes | `semente-abobora` | 0.14 × 0.21 × 0.08 | 938 | 26 KB |
| `semente-alface.glb` | sementes | `semente-alface` | 0.14 × 0.21 × 0.09 | 1820 | 40 KB |
| `semente-alga.glb` | sementes | `semente-alga` | 0.14 × 0.21 × 0.07 | 1030 | 26 KB |
| `semente-batata-doce.glb` | sementes | `semente-batata-doce` | 0.14 × 0.21 × 0.07 | 806 | 23 KB |
| `semente-flor-de-algodao.glb` | sementes | `semente-flor-de-algodao` | 0.14 × 0.21 × 0.07 | 1204 | 31 KB |
| `semente-milho.glb` | sementes | `semente-milho` | 0.14 × 0.21 × 0.07 | 1114 | 43 KB |
| `semente-morango.glb` | sementes | `semente-morango` | 0.14 × 0.21 × 0.07 | 1318 | 33 KB |
| `semente-tomate.glb` | sementes | `semente-tomate` | 0.14 × 0.21 × 0.07 | 936 | 26 KB |
| `acai.glb` | comidas | `acai` | 0.22 × 0.18 × 0.22 | 1082 | 45 KB |
| `bolo-de-fuba.glb` | comidas | `bolo-de-fuba` | 0.34 × 0.12 × 0.34 | 1312 | 31 KB |
| `brigadeiro.glb` | comidas | `brigadeiro` | 0.30 × 0.09 × 0.30 | 1352 | 55 KB |
| `moqueca.glb` | comidas | `moqueca` | 0.35 × 0.09 × 0.27 | 3468 | 71 KB |
| `pao-de-queijo.glb` | comidas | `pao-de-queijo` | 0.32 × 0.09 × 0.32 | 1736 | 37 KB |
| `peixe-com-coco.glb` | comidas | `peixe-com-coco` | 0.36 × 0.09 × 0.36 | 1308 | 36 KB |
| `pipoca.glb` | comidas | `pipoca` | 0.17 × 0.23 × 0.17 | 728 | 47 KB |
| `salada.glb` | comidas | `salada` | 0.26 × 0.12 × 0.26 | 2244 | 47 KB |
| `lanterna.glb` | ferramentas | `lanterna`; vazio `mao` | 0.14 × 0.33 × 0.14 | 994 | 33 KB |
| `pa.glb` | ferramentas | `pa`; vazio `mao` | 0.16 × 0.95 × 0.05 | 508 | 19 KB |
| `rede.glb` | ferramentas | `rede`; vazio `mao` | 0.32 × 0.99 × 0.21 | 988 | 42 KB |
| `regador.glb` | ferramentas | `regador`; vazio `mao` | 0.37 × 0.23 × 0.18 | 600 | 17 KB |
| `vara-de-pescar.glb` | ferramentas | `vara-de-pescar`; vazio `mao` | 0.13 × 1.35 × 0.30 | 844 | 26 KB |
| `bau.glb` | colecao | `bau`, `tampa`; clipe `abrir` | 0.60 × 0.46 × 0.44 | 1088 | 44 KB |
| `carta.glb` | colecao | `carta` | 0.20 × 0.02 × 0.13 | 384 | 20 KB |
| `chave.glb` | colecao | `chave` | 0.22 × 0.03 × 0.10 | 908 | 23 KB |
| `moeda.glb` | colecao | `moeda`; clipe `girar` | 0.12 × 0.12 × 0.02 | 684 | 22 KB |
| `pagina-diario.glb` | colecao | `pagina-diario` | 0.16 × 0.03 × 0.22 | 524 | 17 KB |
| `luneta.glb` | lugares | `luneta`, `tubo` | 0.61 × 1.25 × 0.80 | 1568 | 48 KB |
| `placa-quadro.glb` | lugares | `placa`, `texto` | 1.00 × 1.05 × 0.15 | 296 | 19 KB |
| `placa-seta.glb` | lugares | `placa`, `texto` | 0.66 × 1.20 × 0.12 | 266 | 17 KB |
| `placa-tabuleta.glb` | lugares | `placa`, `texto` | 0.62 × 1.35 × 0.09 | 298 | 18 KB |
| `quadro-das-cores.glb` | lugares | `quadro`, `cor-1`, `cor-2`, `cor-3`, `cor-4`, `cor-5`, `cor-6` | 1.30 × 1.53 × 0.47 | 2172 | 114 KB |
| `colher-de-pau.glb` | cozinha | `colher-de-pau` | 0.34 × 0.03 × 0.07 | 240 | 5 KB |
| `fogao.glb` | cozinha | `fogao`, `fogo` | 1.19 × 1.60 × 0.69 | 2414 | 99 KB |
| `frigideira.glb` | cozinha | `frigideira` | 0.50 × 0.10 × 0.28 | 320 | 10 KB |
| `panela.glb` | cozinha | `panela` | 0.24 × 0.20 × 0.22 | 796 | 20 KB |
| `tabua-de-corte.glb` | cozinha | `tabua-de-corte` | 0.48 × 0.03 × 0.22 | 552 | 14 KB |
| **total (44)** | | | | **46.546** | **1,40 MB** |

Os ícones somam 177 KB (128 cores com alfa, o maior tem 6,8 KB).

## Scripts

| Script | Itens |
|---|---|
| `colheita.py` | alface, tomate, milho, morango (Vila Doce), alga (Recife), batata-doce (Pico), abóbora (Vale dos Dinos), flor de algodão (Nuvens). As funções `forma_*` também desenham as miniaturas dos pacotinhos |
| `sementes.py` | um pacotinho por planta da colheita, com a planta em miniatura na etiqueta |
| `comidas.py` | salada, pipoca, pão de queijo, bolo de fubá, brigadeiro, açaí, moqueca, peixe com coco |
| `ferramentas.py` | lanterna, regador, pá, rede, vara de pescar |
| `colecao.py` | chave, carta, página do diário, baú, moeda |
| `lugares.py` | luneta do píer, Quadro das Cores, três placas |
| `cozinha.py` | fogão a lenha, panela, frigideira, colher de pau, tábua de corte |
