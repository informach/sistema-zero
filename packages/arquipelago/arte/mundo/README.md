# Mundo do Arquipélago no Blender

Cada peça do mundo do jogo tem um script Python que monta o modelo no Blender sem tela (o `bpy` do
PyPI, o mesmo das peças do quarto e do Zappy) e grava um GLB em `src/assets/mundo/`. O jogo carrega
esses arquivos com `new URL(arquivo, import.meta.url)` (`src/mundo/modelos.tsx`). Enquanto um modelo
baixa, ou se ele falhar, aparece o desenho simples de antes, feito no código.

## Rodar

```sh
# todas as peças (mais o relatorio.json com triângulos e tamanho)
/tmp/claude-0/blender-venv/bin/python -B arte/mundo/build_all.py

# uma peça só
/tmp/claude-0/blender-venv/bin/python -B arte/mundo/casa.py

# prévia em Cycles (fora do jogo, só para conferir), veja as variáveis no topo de render.py
ALVO=0,2.4,0 DIR=0.9,0.55,1.1 DIST=24 CHAO='#7dbb5a' \
  /tmp/claude-0/blender-venv/bin/python arte/mundo/render.py /tmp/casa.png src/assets/mundo/casa.glb
```

`MUNDO_OUT=/outra/pasta` grava os GLBs em outro lugar. O `-B` evita `__pycache__` nas pastas de
onde os ajudantes são lidos.

## Ajudantes

`lib_mundo.py` reaproveita, sem copiar:

- `packages/community-kids/scripts/room-blender/lib_q.py`: caixa chanfrada, cilindro, tubo,
  placa recortada, `join`;
- `docs/design/ilha-do-farol-blender/lib_ilha.py`: contorno orgânico, placa, folha, pedra,
  superelipsoide.

Ele também acrescenta:

- a paleta do jogo;
- `altura()`, uma cópia exata de `alturaDaIlha` em `src/mundo/medidas.ts`;
- `exportar(pid, nos)`, que grava um GLB com vários nós de nome fixo, cada um com o seu pivô.

## Convenções

- No Blender o z aponta para cima e a frente olha para −Y. O glTF converte isso para o y para cima
  do three.js. `g(x, z)` leva um ponto do chão do jogo para o Blender (x, −z).
- Cada arquivo fica no referencial do grupo que o desenha no jogo, com y = 0 no chão desse grupo.
- As cores são chapadas, sem texturas. Só o chão usa cor por vértice (COLOR_0).
- O código acha os materiais pelo nome:
  - os que acendem à noite (`vidroJanela`, `lampiao`, `lanterna`, `vidroFarol`, `lampadaFarol`)
    saem com força de emissão 1, e o código regula o brilho;
  - os materiais com transparência (`holograma`, `fachoFarol`, `espuma`) saem em BLEND.
- Colisão: o que tem medida do jogo (casa, horta, bancada, torre do farol, tampo do píer, troncos)
  fica no código (`src/mundo/colisao-da-ilha-central.ts`). O que o script espalha ou posiciona sai
  em nós `col-*` no mesmo GLB, com a convenção das ilhas completas (README de `arte/ilhas`):
  `col-cil-*` é cilindro em pé, outro `col-*` é caixa, malha unitária sem material e o tamanho no
  TRS do nó. Ajudantes no `lib_mundo.py`: `col_caixa`, `col_cilindro` e `col_no_chao` (cilindro
  pousado no chão da ilha central); `exportar(pid, nos, colisores=col)` grava e conta no relatório.
  Capim, flores, pedras do caminho, estrelas-do-mar, corda e boia não colidem.

## Sem pisca-pisca (28/10/2026)

Duas faces no mesmo plano disputam o pixel e piscam em listras (z-fighting); peças encostadas lado a
lado deixam uma costura tracejada que cintila. Regras para todo script daqui:

- **Nenhuma face coplanar de materiais diferentes se sobrepondo.** Uma peça que fica em cima da outra
  sai pelo menos 1 cm à frente (a veneziana passa 3 cm à frente do lambri), ou para antes dela (o
  friso termina atrás da veneziana). Bases que pousam no mesmo plano também: uma desce para dentro
  da outra (os pilares da casa nascem 10 cm dentro do alicerce).
- **Superfície com vão é UMA malha em grade**, com os vértices compartilhados (`parede_com_vaos` da
  casa). Caixas encostadas em volta de um vão deixam junção em T: a quina de uma no meio da aresta da
  outra. Duas paredes que se encontram numa quina usam as mesmas linhas de grade (`cortes_y`,
  `cortes_u`).
- **Vidro e cruz entram na parede ou na moldura** (2 e 1 cm), em vez de terminar rente ao vão.
- **Nada de degrau de 1 a 2 cm visto de lado** (a moldura forra o vão inteiro): uma fatia tão fina
  vira um fio serrilhado que cintila quando a câmera anda.

Conferir: `bun scripts/faces-coplanares.ts src/assets/mundo/casa.glb` (`--separados` nos arquivos
em que cada nó é uma variante) lista as sobreposições e as emendas em T, com um ponto de cada uma.
`tests/faces-coplanares.test.ts` roda a busca em todos os modelos do mundo e reprova qualquer uma.

## Peças

| Arquivo | Script | Referencial | Nós (contrato com o código) | Triângulos | Tamanho |
|---|---|---|---|---|---|
| `terreno.glb` | `terreno.py` | mundo (ilha central na origem) | `chao`, `enfeites`, `espuma` e os `col-cil-moita-*`, `col-cil-pedra-*` | 14.040 | 452 KB |
| `arvores.glb` | `vegetacao.py` | pé da árvore, escala 1 | `arvore-redonda`, `arvore-frutas`, `arvore-pinheiro`, `coqueiro` | 3.852 | 86 KB |
| `casa.glb` | `casa.py` | grupo `Casa` (centro do quarto, piso em y = 0) | `paredes`, `revestimento`, `janelas`, `telhado`, `varanda`, `porta` | 6.874 | 353 KB |
| `horta.glb` | `horta.py` | centro de um canteiro | `canteiro`, `semente`, `alface-broto`/`-crescendo`/`-maduro`, `tomate-…`, `milho-…` | 3.010 | 111 KB |
| `bancada.glb` | `bancada.py` | grupo `Bancada` | `projetor`, `holograma` | 2.342 | 89 KB |
| `farol.glb` | `farol.py` | grupo `Farol` | `farol`, `porta` (folha e maçaneta, pivô na dobradiça; y negativo abre para fora), `vidro`, `lampada`, `facho` e os `col-cil-pedra-farol-*`, `col-degrau-farol-*` | 5.852 | 207 KB |
| `pier.glb` | `pier.py` | grupo `Pier` (x −5, z 27, y = 0 no mar) | `pier`, `barquinho-decorativo` (o barquinho a remo e a corda até ele, com o casco no `col-barco-1`), os `col-cil-estaca-*`, `col-cil-poste-*`, `col-barco-1` e as âncoras `barco` (o barco da viagem atracado na linha d'água, giro com a proa para o mar) e `embarque` (no tampo, longe da luneta; também o desembarque) | 3.604 | 150 KB |
| `ponte.glb` | `ponte.py` | uma peça na origem (instanciada) | `tabua`, `poste`, `corda` | 192 | 9 KB |
| `ilhas-do-anel.glb` | `ilhas_anel.py` | centro de cada ilha, y = 0 no mar | `bosque`, `vila-doce`, `recife`, `pico`, `vale-dos-dinos`, `nuvens` | 19.336 | 527 KB |
| `boias.glb` | `boias.py` | uma peça na linha d'água (instanciada) | `boia`, `corda`, `flutuador` | 1.208 | 28 KB |
| `cata-vento.glb` | `cata_vento.py` | base do poste (`CATA_VENTO` em `medidas.ts`, ao lado da horta) | `poste`, `helice` (pivô no cubo, gira em volta do z do three) e o `col-cil-poste-cata-vento-1` | 662 | 42 KB |
| **total** | | | | **61.916** | **2,02 MB** |

### O que o código liga, desliga e mexe

- **Chão**: a colisão continua sendo o trimesh de `alturaDaIlha`. A `espuma` balança devagar e é
  desenhada depois do mar.
- **Árvores**: as mesmas 12 posições e escalas, com o tronco que colide (e, no pinheiro, a saia de
  galhos de baixo). As que ficam mais perto da praia viram `coqueiro`, e cada árvore tem um giro
  próprio.
- **Casa**:
  - `paredes` e `janelas` ficam translúcidas quando você entra, e o `telhado` (com o toldo da
    varanda) some;
  - `porta` tem o pivô na dobradiça (x 1,4; z 4,03). Fechada, a porta respira com um brilho; aberta,
    gira para fora (−1,75 rad) e o colisor sai;
  - as colunas da varanda ganharam dois colisores pequenos.
- **Horta**:
  - o estágio escolhe o nó: `semente`, depois `<planta>-broto`, `-crescendo` e `-maduro`. Dentro de
    cada estágio a planta ainda cresce um pouco, pela escala;
  - o material `terra` escurece quando o canteiro está regado.
- **Bancada**: o `holograma` flutua e pulsa, com luz somada.
- **Farol**:
  - apagado, as cores desbotam para o cinza;
  - aceso, a `lampada` e o `vidro` brilham e a luz do código fica em y 9,4 (o centro da lâmpada);
  - o `facho` gira em y, com material somado e um degradê por vértice que some na ponta.
- **Píer**: o vidro do lampião (`lanterna`) acende à noite.
- **Pontes**:
  - `tabua`, `poste` (um par a cada 6 tábuas) e `corda` são malhas instanciadas;
  - quebrada, a ponte fica cinza e sem corda. Na chegada, tábuas, postes e corda aparecem junto com a
    animação de antes.
- **Ilhas do anel**:
  - o código gira cada ilha para o +x do modelo, o lado da chegada, sem enfeites num corredor,
    ficar virado para a ilha central;
  - cada material vai do cinza `#b3b8c1` para a cor de verdade conforme a ponte abre, e a lava do
    Vale acende junto.
- **Boias** (`src/mundo/boias.tsx`): a linha que marca até onde se nada, em volta da sua ilha
  (42 m do centro, depois da parte rasa) e de cada ilha do anel aberta (19 m do centro dela, menos a
  Ilha das Nuvens, que fica no alto). `boia`, `corda` e `flutuador` são malhas instanciadas; a corda
  liga uma boia na outra, com 4 flutuadores por trecho, e as boias balançam devagar. Passando delas,
  a correnteza mansa (`src/sistemas/correnteza.ts`) leva de volta para a praia.
