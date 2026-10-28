# Itens do Arquipélago no Blender

Lote 5 do `arte/INVENTARIO.md`: colheita, sementes, comidas, ferramentas, coleção, peças de lugar,
a cozinha da casa, os ingredientes das receitas, as iscas de pesca e as coleções de cada ilha. Cada
item tem uma função num script por grupo, que monta o modelo no Blender sem tela (o mesmo `bpy` do
mundo, dos personagens e dos Lumis) e grava um GLB em `src/assets/itens/<id>.glb`. Para o HUD,
cada item também tem um ícone de 256 px com fundo transparente em `src/assets/icones/<id>.png`. Os
itens ainda não estão ligados ao jogo.

## Rodar

```sh
# todos os itens, a conferência do contrato e o relatorio.json (triângulos, tamanho, nós, clipes)
/tmp/claude-0/blender-venv/bin/python -B arte/itens/build_all.py

# o mesmo, refazendo os ícones (Cycles na CPU, cerca de 3 min para os 79 em 4 núcleos)
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

`lib_extra.py` (usado pelos ingredientes, pelas iscas e pelas coleções) acrescenta `setor_torneado`
(peça de torno sem uma fatia, com o corte fechado), `almofada` (placa fofa a partir de um contorno:
estrelas), `leque` (concha em leque), `tubo_plano` (traço das notas, que não torce), `olho_fofo`,
`pinta` (bolinha colada na superfície, achada por raio) e `girar` (gira um conjunto de peças como
um bloco só).

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
  - nas placas, a face lisa do nó `texto` usa o material `placaFace`;
  - as notas musicais e as estrelas caídas têm a frente e as costas de `luz` e o contorno de outra
    cor (uma por peça); os cristais brilham fraco na própria cor (emissão 0,25).
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
| `chocolate-quente.glb` | comidas | `chocolate-quente` | 0.19 × 0.24 × 0.19 | 3604 | 94 KB |
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
| `cacau.glb` | ingredientes | `cacau` | 0.28 × 0.11 × 0.22 | 3282 | 64 KB |
| `coco.glb` | ingredientes | `coco` | 0.19 × 0.12 × 0.23 | 1332 | 34 KB |
| `fuba.glb` | ingredientes | `fuba` | 0.16 × 0.21 × 0.16 | 2288 | 52 KB |
| `leite.glb` | ingredientes | `leite` | 0.10 × 0.20 × 0.10 | 1112 | 36 KB |
| `limao.glb` | ingredientes | `limao` | 0.17 × 0.08 × 0.18 | 1232 | 32 KB |
| `ovo.glb` | ingredientes | `ovo` | 0.20 × 0.15 × 0.18 | 3164 | 62 KB |
| `peixe.glb` | ingredientes | `peixe` | 0.39 × 0.07 × 0.20 | 1280 | 42 KB |
| `polvilho.glb` | ingredientes | `polvilho` | 0.12 × 0.14 × 0.15 | 1464 | 47 KB |
| `queijo.glb` | ingredientes | `queijo` | 0.29 × 0.08 × 0.29 | 1020 | 32 KB |
| `isca-minhoca.glb` | iscas | `isca-minhoca` | 0.10 × 0.17 × 0.14 | 3736 | 88 KB |
| `isca-pena.glb` | iscas | `isca-pena` | 0.16 × 0.05 × 0.10 | 1884 | 44 KB |
| `concha-caracol.glb` | colecoes | `concha-caracol` | 0.10 × 0.12 × 0.09 | 1368 | 33 KB |
| `concha-listrada.glb` | colecoes | `concha-listrada` | 0.09 × 0.06 × 0.08 | 3600 | 98 KB |
| `concha-mexilhao.glb` | colecoes | `concha-mexilhao` | 0.07 × 0.02 × 0.05 | 1320 | 35 KB |
| `concha-tigre.glb` | colecoes | `concha-tigre` | 0.08 × 0.05 × 0.06 | 3360 | 69 KB |
| `concha-vieira.glb` | colecoes | `concha-vieira` | 0.11 × 0.02 × 0.10 | 1768 | 55 KB |
| `cristal-azul.glb` | colecoes | `cristal-azul` | 0.12 × 0.15 × 0.07 | 152 | 14 KB |
| `cristal-rosa.glb` | colecoes | `cristal-rosa` | 0.09 × 0.07 × 0.08 | 60 | 5 KB |
| `cristal-roxo.glb` | colecoes | `cristal-roxo` | 0.12 × 0.13 × 0.10 | 224 | 17 KB |
| `cristal-verde.glb` | colecoes | `cristal-verde` | 0.13 × 0.09 × 0.14 | 808 | 49 KB |
| `estrela-cadente.glb` | colecoes | `estrela-cadente`; material `luz` | 0.18 × 0.14 × 0.04 | 1400 | 30 KB |
| `estrela-cintilante.glb` | colecoes | `estrela-cintilante`; material `luz` | 0.15 × 0.13 × 0.04 | 1024 | 26 KB |
| `estrela-do-mar.glb` | colecoes | `estrela-do-mar` | 0.10 × 0.02 × 0.10 | 2144 | 40 KB |
| `estrela-sorriso.glb` | colecoes | `estrela-sorriso`; material `luz` | 0.11 × 0.10 × 0.06 | 1262 | 30 KB |
| `estrela-trio.glb` | colecoes | `estrela-trio`; material `luz` | 0.16 × 0.12 × 0.03 | 2456 | 54 KB |
| `nota-clave-de-sol.glb` | colecoes | `nota-clave-de-sol`; material `luz` | 0.07 × 0.23 × 0.02 | 2756 | 62 KB |
| `nota-colcheia.glb` | colecoes | `nota-colcheia`; material `luz` | 0.11 × 0.16 × 0.04 | 1180 | 28 KB |
| `nota-dupla.glb` | colecoes | `nota-dupla`; material `luz` | 0.15 × 0.17 × 0.03 | 1644 | 38 KB |
| `nota-seminima.glb` | colecoes | `nota-seminima`; material `luz` | 0.07 × 0.16 × 0.04 | 608 | 15 KB |
| `peixe-garoupa.glb` | colecoes | `peixe-garoupa` | 0.28 × 0.14 × 0.07 | 3186 | 77 KB |
| `peixe-linguado.glb` | colecoes | `peixe-linguado` | 0.22 × 0.04 × 0.14 | 2130 | 49 KB |
| `peixe-robalo.glb` | colecoes | `peixe-robalo` | 0.27 × 0.09 × 0.05 | 2062 | 61 KB |
| `peixe-sardinha.glb` | colecoes | `peixe-sardinha` | 0.17 × 0.06 × 0.04 | 2350 | 60 KB |
| `peixe-voador.glb` | colecoes | `peixe-voador` | 0.23 × 0.07 × 0.23 | 1826 | 54 KB |
| **total (79)** | | | | **110.632** | **2,98 MB** |

Os ícones somam 328 KB (128 cores com alfa, o maior tem 7,8 KB).

## Scripts

| Script | Itens |
|---|---|
| `colheita.py` | alface, tomate, milho, morango (Vila Doce), alga (Recife), batata-doce (Pico), abóbora (Vale dos Dinos), flor de algodão (Nuvens). As funções `forma_*` também desenham as miniaturas dos pacotinhos |
| `sementes.py` | um pacotinho por planta da colheita, com a planta em miniatura na etiqueta |
| `comidas.py` | salada, pipoca, pão de queijo, bolo de fubá, brigadeiro, açaí, moqueca, peixe com coco, chocolate quente (caneca no pires com chantili, marshmallows e fumacinha) |
| `ferramentas.py` | lanterna, regador, pá, rede, vara de pescar |
| `colecao.py` | chave, carta, página do diário, baú, moeda |
| `lugares.py` | luneta do píer, Quadro das Cores, três placas |
| `cozinha.py` | fogão a lenha, panela, frigideira, colher de pau, tábua de corte |
| `ingredientes.py` | fubá (saco de pano com a conchinha), leite (garrafinha), ovo (caixinha de meia dúzia), polvilho (saquinho de papel), queijo minas sem uma fatia, peixe cru na folha de bananeira, coco seco e a metade partida, limão e a metade cortada, cacau inteiro e aberto |
| `iscas.py` | latinha de minhocas, isca colorida de penas (anzol de ponta redonda) |
| `colecoes.py` | conchas da praia (caracol, vieira, tigre (um cauri pintado), mexilhão, conchinha listrada (uma valva com uma costela de cada cor), estrela-do-mar), peixes da praia (sardinha, robalo, garoupa, linguado, peixe-voador), notas do Pico Gelado (semínima, colcheia, duas colcheias, clave de sol), cristais do Pico (ponta de gelo azul, pedra lapidada rosa, ametista na pedra, geodo verde), estrelas da Ilha das Nuvens (cadente, sorriso, cintilante, trio) |
