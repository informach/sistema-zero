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
| `terreno.glb` | `terreno.py` | mundo (ilha central na origem) | `chao` (com o filho `chao-do-lote`), `enfeites`, `espuma` e os `col-cil-moita-*`, `col-cil-pedra-*` | 13.974 | 447 KB |
| `arvores.glb` | `vegetacao.py` | pé da árvore, escala 1 | `arvore-redonda`, `arvore-frutas`, `arvore-pinheiro`, `coqueiro` | 3.852 | 86 KB |
| `casa.glb` | `casa.py` | grupo `Casa` (centro do quarto, piso em y = 0) | `paredes`, `revestimento`, `janelas`, `telhado`, `varanda`, `porta` | 6.874 | 353 KB |
| `horta.glb` | `horta.py` | centro de um canteiro | `canteiro`, `semente`, `alface-broto`/`-crescendo`/`-maduro`, `tomate-…`, `milho-…` | 3.010 | 111 KB |
| `bancada.glb` | `bancada.py` | grupo `Bancada` | `projetor`, `holograma` | 2.342 | 89 KB |
| `farol.glb` | `farol.py` | grupo `Farol` | `farol` (com o filho `subida`), `porta` (folha e maçaneta, pivô na dobradiça; y negativo abre para fora), `vidro`, `lampada`, `facho`, os `col-cil-pedra-farol-*`, `col-degrau-farol-*`, `col-cil-lanterna-farol-1` e os da subida (abaixo), com as âncoras dela | 6.838 | 262 KB |
| `pier.glb` | `pier.py` | grupo `Pier` (x −5, z 27, y = 0 no mar) | `pier` (com o filho `gruta`), `barquinho-decorativo` (o barquinho a remo e a corda até ele, com o casco no `col-barco-1`), os `col-cil-estaca-*`, `col-cil-poste-*`, `col-barco-1`, os `col-gruta-*` e `col-cil-rocha-gruta-*` e as âncoras `barco` (o barco da viagem atracado na linha d'água, giro com a proa para o mar), `embarque` (no tampo, longe da luneta; também o desembarque), `segredo-mergulho`, `mergulho-gruta` e `area-mergulho-gruta` | 3.932 | 170 KB |
| `ponte.glb` | `ponte.py` | uma peça na origem (instanciada) | `tabua`, `poste`, `corda` | 192 | 9 KB |
| `ilhas-do-anel.glb` | `ilhas_anel.py` | o mesmo de cada ilha completa (centro dela, y = 0 no mar; nas Nuvens o mar fica em −7) | `bosque`, `vila-doce`, `recife`, `pico`, `vale-dos-dinos`, `nuvens` (uma malha cada, materiais `ilha` e, no Vale, `lava`) | 17.434 | 549 KB |
| `boias.glb` | `boias.py` | uma peça na linha d'água (instanciada) | `boia`, `corda`, `flutuador` | 1.208 | 28 KB |
| `cata-vento.glb` | `cata_vento.py` | base do poste (`CATA_VENTO` em `medidas.ts`, ao lado da horta) | `poste`, `helice` (pivô no cubo, gira em volta do z do three) e o `col-cil-poste-cata-vento-1` | 662 | 42 KB |
| `florada.glb` | `florada.py` | cada nível no meio de um canteirinho (y = 0 no chão); os pontos no mundo | `florada-1`, `-2`, `-3` e os Empty `ponto-florada-1` a `-24` | 1.424 | 69 KB |
| `segredos-da-ilha.glb` | `segredos_ilha.py` | mundo (ilha central na origem) | `cipo-1` (pivô no galho), `arvore-do-cipo`, `copa-cipo`, `deque-do-cipo`, a âncora `segredo-cipo` e os `col-cil-tronco-cipo-1`, `col-deque-segredo-1`, `col-cil-poste-segredo-*` | 1.440 | 46 KB |
| **total** | | | | **63.182** | **2,21 MB** |

### O que o código liga, desliga e mexe

- **Chão**: a colisão continua sendo o trimesh de `alturaDaIlha`. O lote grande da casa (x −17 a 16,
  z −15 a 12) é o `chao-do-lote`, filho do `chao`, numa grade de 1 m; o resto do chão é polar com os
  ângulos dos 120 pontos da borda do lote, então os dois pedaços dividem os vértices da borda (sem
  fresta nem emenda em T). Quem copia o `chao` leva os dois; para moldar o lote, troque só o filho.
  Teste: `tests/chao-do-lote.test.ts`. A `espuma` balança devagar e é
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
- **Farol, a subida final por fora** (31/10/2026, nó `subida`, filho do `farol`): andaime atrás da
  torre com a escada (`escada-1-*`, `col-escada-reta-1`), duas quinas (`borda-1-*`, `borda-2-*`), a
  viga do equilíbrio (`equilibrio-1-a`/`-b`, 4,4 m de vão), a corrente de ar no deque 4
  (`corrente-de-ar` no tampo e `corrente-de-ar-topo` onde a subida para; a altura dela é a diferença
  entre as duas, não a do Pico) até o mirante na altura da varanda (9 m, o alto do cilindro da torre),
  com o gradil aberto para a varanda. Âncoras do percurso: `subida-farol-largada`, `subida-farol-1`
  a `-6` (deques 1 a 4, mirante e varanda) e `vagalume-farol-1` a `-5`. Colisores
  `col-deque-subida-*`, `col-viga-subida-1`, `col-cil-poste-subida-*` e `col-cil-lanterna-farol-1`.
  Teste: `tests/subida-do-farol.test.ts`. O percurso e a corrente ainda não estão ligados no código.
- **Píer**: o vidro do lampião (`lanterna`) acende à noite. A gruta do mergulho (nó `gruta`, filho do
  `pier`) fica no fundo depois da ponta do píer, no −x, com a entrada para o píer 1,2 m abaixo da
  linha d'água; `segredo-mergulho` no chão de dentro, `mergulho-gruta` na linha d'água ao lado do
  píer (como o `mergulho` do Recife) e `area-mergulho-gruta` no meio da área, no fundo (escala x = z
  o raio, y a altura até a superfície). O mergulho ainda não está ligado na sua ilha.
- **Florada** (`florada.glb`): o jogo põe uma cópia de um nível (`florada-1` a `-3`) em cada
  `ponto-florada-N`. É miúda (até 0,42 m): não colide. Teste: `tests/florada.test.ts`.
- **Segredo do cipó** (`segredos-da-ilha.glb`): ainda não carregado. O `cipo-1` segue o cipó do
  Bosque (pivô na posição do nó, corda até o ponto mais baixo dele); o deque só se alcança soltando
  do balanço. Teste: `tests/segredos-da-ilha.test.ts` (também a gruta).
- **Pontes**:
  - `tabua`, `poste` (um par a cada 6 tábuas) e `corda` são malhas instanciadas;
  - quebrada, a ponte fica cinza e sem corda. Na chegada, tábuas, postes e corda aparecem junto com a
    animação de antes.
- **Ilhas do anel** (a silhueta, refeita em 31/10/2026):
  - sai da ilha completa (`src/assets/ilhas/<ilha>.glb`, com os marcos): o script junta as malhas
    que desenham (sem `col-*` e `escalada-*`), tira as peças menores que 0,5 m, decima cada peça
    pela área até uns 2.900 triângulos por ilha (a lava e as peças na beira da caixa sempre ficam) e
    passa a cor de cada material para a cor por vértice (`COLOR_0`, material `ilha`). Fica com a
    altura e a largura da completa, no mesmo referencial, para a troca na ponte não mudar o tamanho;
    ao regerar uma ilha completa, rode o `ilhas_anel.py` de novo;
  - o código gira cada ilha (a leve e a completa, com `giroDaIlha`) para o +x do modelo, o lado da
    chegada, ficar virado para a ilha central;
  - a tinta da ilha (`pintura-da-ilha.ts`) vai do cinza `#b3b8c1` para a cor de cada vértice conforme
    a ponte abre, e a lava do Vale (material `lava`) acende junto. Quem colide é o
    `apoiosDaIlhaLeve` (topo em y = 1, onde fica o tampo da silhueta), não a malha;
  - teste: `tests/silhuetas-das-ilhas.test.ts` (alvos de altura nas duas versões, uma malha de até 3
    mil triângulos, cor por vértice, altura e largura a menos de 5% da completa, contorno de cima).
- **Boias** (`src/mundo/boias.tsx`): a linha que marca até onde se nada, em volta da sua ilha
  (42 m do centro, depois da parte rasa) e de cada ilha do anel aberta (19 m do centro dela, menos a
  Ilha das Nuvens, que fica no alto). `boia`, `corda` e `flutuador` são malhas instanciadas; a corda
  liga uma boia na outra, com 4 flutuadores por trecho, e as boias balançam devagar. Passando delas,
  a correnteza mansa (`src/sistemas/correnteza.ts`) leva de volta para a praia.
