# Ilhas completas no Blender

As versões completas das ilhas do anel. Cada uma tem um script Python que monta a ilha no Blender
sem tela (o mesmo `bpy` do mundo) e grava os GLBs em `src/assets/ilhas/`. O jogo mostra a versão
leve (`ilhas-do-anel.glb`, de `arte/mundo/ilhas_anel.py`) e troca pela completa quando a pessoa
atravessa a ponte. Por enquanto só o Bosque está ligado (`src/mundo/ilha-completa.tsx`).

Por enquanto existem três ilhas: Bosque dos Bichos, Vila Doce e Recife Coral. O Recife tem também dois
lugares de exploração de mergulho, cada um num GLB próprio: o navio afundado e o labirinto de corais
(veja "Lugares de exploração do Recife").

## Rodar

```sh
# as três ilhas, as peças soltas, o barco e os lugares do Recife, com a conferência no fim
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas/build_all.py

# uma ilha só
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas/bosque.py

# prévia em Cycles (as variáveis são as de arte/mundo/render.py)
ALVO=0,2,0 DIR=0.75,0.85,1 DIST=46 AGUA=1 \
  /tmp/claude-0/blender-venv/bin/python arte/ilhas/render.py /tmp/bosque.png src/assets/ilhas/bosque.glb
```

`ILHAS_OUT=/outra/pasta` grava em outro lugar. O `build_all.py` lê cada GLB e confere:

- os nós, as âncoras e os clipes do contrato abaixo;
- os grupos de nós de colisão `col-*` que o jogo espera, e que nenhum deles tem material;
- o teto de cada ilha (40 mil triângulos e 1,5 MB) e o das peças soltas;
- o `relatorio.json` terminando em quebra de linha.

Antes de exportar, cada script também confere que nada na altura do corpo ocupa o corredor da
chegada (`conferir_corredor`).

## Referencial e troca com a versão leve

- **Referencial:** cada ilha fica no centro dela, com y = 0 no mar e o tampo plano em y = 1.
- **Mesmo chão da leve:** o contorno, a praia e o barranco saem de `ilhas_anel.base` com a mesma
  semente, então a completa ocupa o mesmo lugar da leve. O jogo troca uma pela outra no mesmo grupo
  e com o mesmo giro.
- **Chegada da ponte:** é o +x do modelo, como na versão leve; o jogo gira a ilha para esse lado
  olhar a ilha central.
- **Corredor livre:** em x > 5,5 e |z| < 2,5 só há chão e trilha, e copa de árvore apenas acima de
  2,6.
- **O que sai do contorno:**
  - no Recife, a caverna submarina fica do lado de fora (−x, até 21 do centro) e o cais avança 16
    para o mar;
  - no Bosque, as copas e o galho dos cipós passam um pouco da borda.
- **Colisões:** o desenho nunca vira colisão. Cada ilha traz nós de colisão `col-*`, feitos à mão
  ao lado das peças (veja abaixo). Vila Doce e Recife ainda não têm os deles.
- **Brilho:** os vidros que acendem (`vidroJanela`, `lampiao`, `lanterna`) e os novos `perolaLuz` e
  `cristalLuz` saem com força de emissão 1; o jogo regula o brilho.

## Arquivos e contrato

| Arquivo | Nós (malhas) | Âncoras (nós vazios) | Clipes | Triângulos | Tamanho |
|---|---|---|---|---|---|
| `bosque.glb` | `terreno`, `agua`, `construcoes`, `vegetacao`, `cipo-1`…`cipo-3`, `copa-1`…`copa-11`, `tronco-1`…`tronco-5`, `telhado-casa-na-arvore` e 265 `col-*` | comuns + `escada`, `casa-na-arvore`, `cabana`, `cercado`, `lago`, `escorregador-fim`, `copas-1`…`copas-4`, `esconderijo-1`…`esconderijo-4` | não tem | 27.762 | 958 KB |
| `vila-doce.glb` | `terreno`, `fonte`, `construcoes`, `telhados`, `feira`, `enfeites` | comuns + `fonte`, `padaria`, `sorveteria`, `telhados-inicio`, `telhados-1`…`telhados-3`, `telhados-fim`, `barraca-1`…`barraca-6` | não tem | 27.606 | 925 KB |
| `recife.glb` | `terreno`, `lagoa`, `construcoes`, `corais`, `enfeites`, `caverna`, `alga-1`…`alga-10` | comuns + `casa-mare`, `mapa`, `lagoa`, `cais`, `barco`, `caverna-entrada`, `caverna`, `caverna-tesouro`, `mergulho` | `balancar` (2 s, as algas) | 17.484 | 547 KB |
| `bosque-props.glb` | `arvore-grande-a`/`-b`/`-c`, `arvore-media`, `moita`, `tora`, `toco`, `cogumelo` | | não tem | 3.958 | 84 KB |
| `vila-doce-props.glb` | `casinha-a`/`-b`/`-c`, `barraca`, `pirulito`, `jujuba`, `bengala`, `lampiao` | | não tem | 7.966 | 272 KB |
| `recife-props.glb` | `coral-galho`, `coral-cerebro`, `coral-leque`, `coral-tubo`, `mapa-aberto`, `mapa-rolo`, `alga` | | `balancar` (a alga) | 1.416 | 49 KB |
| `barco.glb` | `barco` (pivô na linha d'água, proa em +x) | | `balancar` (3 s: rola, arfa e sobe e desce) | 2.456 | 70 KB |
| `recife-navio.glb` | `navio`, `vela`, `carga`, `fundo`, `corais`, `alga-1`…`alga-6` e 71 `col-*` | `entrada`, `bau`, `pagina-diario`, `escotilha`, `mastro` | `balancar` (as algas) | 13.931 | 447 KB |
| `recife-labirinto.glb` | `paredes`, `corais`, `chao`, `portais`, `gruta`, `alga-1`…`alga-6` e 64 `col-*` | `entrada`, `saida`, `tesouro` | `balancar` (as algas) | 27.472 | 627 KB |

As peças soltas ficam cada uma na origem, com o pé em y = 0, para o jogo repetir (e o modo de
construir usar depois). Nas ilhas, as mesmas peças já vêm posicionadas dentro dos nós.

### Nós de colisão (`col-*`)

Formas simples e invisíveis, exportadas no mesmo GLB, que o jogo lê para montar os colisores do
Rapier (`src/mundo/colisores-da-ilha.ts`). Os ajudantes estão no `lib_ilhas.py`: `col_caixa`,
`col_cilindro`, `col_entre` (cilindro de um ponto a outro, para tronco torto) e `col_terreno`. As
peças que se pisam (`plataforma`, `ponte_corda`, `escada_espiral`, `cerca`, `arvore_grande`,
`arvore_media`, `tora`, `toco`) recebem uma lista `col` e põem a colisão delas ali, ao lado do
desenho; o `exportar(..., colisores=col)` grava tudo.

- **Nome é a forma:**
  - `col-terreno`: malha de triângulos, a única (cópia do tampo, da praia e do barranco);
  - `col-cil-<peça>-<n>`: cilindro em pé no eixo do nó;
  - `col-<peça>-<n>`: caixa.
- **Tamanho no nó, não na malha:** todo nó usa a mesma malha unitária (cubo de lado 1, cilindro de
  diâmetro 1 e altura 1) e guarda posição, giro e escala no TRS. O jogo mede a caixa da malha vezes
  a escala, então outra forma também serviria.
- **Sem material:** o jogo tira os nós da cena ao ler; o `build_all.py` reprova `col-*` com material.
- **O que colide no Bosque:** chão, deques e o guarda-corpo deles (aberto onde chega ponte, escada
  e escorregador), o piso das pontes em trechos que seguem a barriga e uma parede baixa sob cada
  corrimão, os degraus, a casa na árvore, o escorregador e as laterais dele, a cabana (caixa até o
  beiral), a varanda, os postes, o barril, o caixote, a cerca, a casinha, o cocho e o feno do
  cercadinho, os troncos (um cilindro por trecho, 85% da grossura do desenho), as toras e os tocos.
  Também os enfeites que se veem de pé (28/10/2026), com um cilindro um pouco menor que o desenho
  (`col_no_tampo` e as medidas `MOITA_COL`, `PEDRA_COL`, `COGUMELO_COL` no `bosque.py`): moitas,
  pedras, cogumelos, tocas (um degrau baixo, o personagem sobe), as pedras da beira do lago (abaixo
  do degrau, `PEDRA_DO_LAGO_ALTA`, para os cipós ficarem ao alcance), as floreiras da cabana e as
  pernas do escorregador.
- **O que não colide:** copas, raízes, flores, tufos, taboas, vitórias-régias, o balde da roldana e
  os enfeites miúdos das construções. O personagem passa por eles sem tropeçar.
- **Câmera:** o jogo diz pelo prefixo do nome o que só segura o corpo (`SO_PARA_O_CORPO` em
  `src/mundo/colisores-da-ilha.ts`): guarda-corpo, corrimão, moitas, cogumelos, postes, floreiras
  e pernas do escorregador. O resto também tapa a câmera.
- O jogo arredonda as bordas (3 cm) para o personagem não enganchar em quina de degrau ou deque.

### Nós que esmaecem (`copa-*`, `tronco-*`, `telhado-*`)

O que pode tapar a câmera no percurso sai em nós próprios, para o jogo esmaecer só o que está entre
a câmera e o personagem (e voltar quando sai da frente):

- `copa-1`…`copa-11`: a copa de cada árvore, com os galhos lá de cima (`arvore_grande(..., copa=lista)`
  e `arvore_media(..., folhas=lista)`);
- `tronco-1`…`tronco-5`: os troncos das árvores grandes (`arvore_grande(..., tronco=lista)`); eles
  também colidem com a câmera, que os contorna, e esmaecem quando tapam só um pedaço do avatar;
- `telhado-casa-na-arvore`: o telhado e a bandeirinha.

### Âncoras

As âncoras comuns às três ilhas são:

- `chegada`: o fim da ponte, no corredor;
- `morador`: onde fica a Capi, o Bento ou a Maré, na frente da casa;
- `lumi-1`…`lumi-4`: os quatro Lumis da família da ilha.

A posição de cada âncora (x, y, z do jogo) está no `relatorio.json`. As específicas de cada ilha:

- **Bosque:**
  - `escada`: o pé da escada em espiral;
  - `casa-na-arvore`: na frente da porta, do lado de fora, em cima do deque;
  - `mecanismos-casa` (a dobradiça da porta, no batente do lado do tronco) e `mecanismos-rumo` (para
    dentro da casa): o jogo monta a folha e o batente nelas (`mundo/mecanismos.tsx`);
  - `mecanismos-placa`, `mecanismos-caixote` e `mecanismos-alcapao`: no anel do deque, onde o jogo
    põe a placa, o caixote (onde ele começa) e o meio do alçapão;
  - `copas-1`…`copas-4`: o centro de cada deque, na altura dele (pontos de controle do percurso);
  - `escorregador-fim`, `cabana` (a porta), `cercado`, `lago`.
  - `esconderijo-1`…`esconderijo-4`: onde se escondem o cachorro, o gato, o coelho e o porquinho,
    no chão (y = 1); o giro em Z do empty é para onde o bicho olha (no jogo, o giro em Y com o mesmo
    sinal, lido do quatérnio por `rumoDoNo`).
  - `lote-cabana-a` e `lote-cabana-b`: os cantos do lote da cabana que a criança constrói (células
    de x −18 a −13 e de z −4 a 3, `LOTE_DA_CABANA` em `bosque.py`), na ponta de campo do lado de
    fora. O Bosque é a única ilha que não é redonda: o contorno cresce para o −x do modelo
    (`LOBO_DO_BOSQUE` em `arte/mundo/ilhas_anel.py`, a mesma conta em `src/mundo/medidas.ts`), na
    versão completa e na leve. Não ponha nada que colida nem nada alto no lote (o telhado do kit
    começa a 4 m); `tests/bosque-crescido.test.ts` confere.
- **Vila Doce:**
  - `fonte`, `padaria` (a porta), `sorveteria` (o balcão);
  - `barraca-1`…`barraca-6`: a frente de cada barraca;
  - percurso dos telhados: `telhados-inicio` (o topo dos caixotes, 1 de altura), `telhados-1`…`-3`
    (o topo de cada casinha: 2,0, 2,8 e 3,6) e `telhados-fim` (o terraço da sorveteria, 4,4).
- **Recife:**
  - `casa-mare` (a porta), `mapa` (a mesa de mapas), `lagoa`;
  - `cais`: a ponta onde se embarca;
  - `barco`: onde o barco fica atracado; o giro da âncora é a direção da proa;
  - `caverna-entrada`: a boca, na linha d'água; `caverna`: o chão do salão, em y = −1,3;
    `caverna-tesouro`: o mexilhão com as pérolas;
  - `mergulho`: na frente da ponta do cais.

### Falta passar para o Blender (cipó, escalada e percurso, 27/10/2026)

O jogo marca no código o que ainda não está no `bosque.glb`. O Blender sem tela roda pelo `bpy`
do PyPI (veja "Rodar" acima); o que falta passar para o modelo:

- **Tronco de escalar:** um nó `escalada-cil-tronco-dos-cipos` no tronco da árvore do galho dos
  cipós (T6), na convenção dos colisores: cilindro unitário sem material, em pé, do chão (y = 1) até
  6,5, com o raio da casca desenhada (0,86 embaixo, 0,5 em cima; o meio vai de x 8,6, z 5,21 a
  x 8,84, z 5,07 no referencial do jogo). Hoje esses números estão em `TRONCO_DOS_CIPOS`
  (`src/mundo/bosque.ts`), e o jogo desenha uma trepadeira em espiral por cima para mostrar que ele
  sobe. Ficaria melhor com a trepadeira modelada (ou degraus de madeira pregados) no próprio tronco.
  O jogo ainda não lê `escalada-*`: quando o nó chegar, troque a constante pela leitura dele.
- **Lago (28/10/2026):** a bacia de 0,85 m já está no `col-terreno` (`bacia` em `bosque.py`, só na
  colisão; `tests/lago-do-bosque.test.ts` mede o fundo e a rampa). O desenho continua com a água
  opaca por cima do tampo: um fundo desenhado e a água com transparência e ondinhas (física viva,
  etapa 2) ficam para quando a água ganhar shader.
- **Placa de largada e vagalumes:** desenhados no código (`PLACA_DA_LARGADA` e
  `VAGALUMES_DAS_COPAS`). Uma placa modelada ao lado do pé da escada (x 0,6, z 1,3), na madeira da
  casa na árvore, combinaria com o resto.
- **Esconderijos dos bichos (28/10/2026):** as quatro âncoras `esconderijo-*` já estão no
  `bosque.glb` (`ESCONDERIJOS` em `bosque.py`, as mesmas medidas de `ESCONDERIJOS_NO_MODELO` em
  `src/mundo/bosque.ts`; `tests/esconde-no-bosque.test.ts` confere que batem). Falta só o desenho:
  uma moita um pouco maior atrás do cachorro e uma toca com a boca mais funda para o coelho
  deixariam o esconderijo mais claro.

### Nós que mexem

- **`cipo-1`…`cipo-3` (Bosque):** o pivô fica no galho. O jogo balança cada cipó girando o nó; o
  cipó tem 4,2 de comprimento e uma alça no fim. As mãos seguram acima da alça, onde os pés passam
  livres do chão (`comprimentoDaPegada` em `src/sistemas/cipo.ts`).
- **Algas e barco:** o `balancar` toca em laço. O do barco também mexe na posição do nó: ponha o
  barco dentro de um grupo na âncora `barco`.
- **Recife:** `agua`/`lagoa` e a fonte de chocolate são nós à parte, para o jogo trocar o material
  (água que mexe, chocolate brilhante).

## Lugares de exploração do Recife

Dois GLBs de mergulho, cada um no seu referencial (não são nós do `recife.glb`): o jogo põe o arquivo
inteiro no lugar proposto abaixo, no mesmo grupo e com o mesmo giro da ilha. Os dois têm a mesma
convenção das ilhas (malha de desenho, nós `col-*` simples e âncoras vazias) e o teto deles no
`build_all.py` é de 30 mil triângulos e 768 KB.

- **Referencial:** o centro do lugar na linha d'água (y = 0 no mar) e a areia em y = −3,5, o
  `FUNDO_DO_MAR` do jogo. Debaixo d'água tudo foi medido para a cápsula do avatar em pé (raio 0,35 e
  1,9 de altura): os vãos por onde se nada têm pelo menos 2,1 m de altura livre.
- **Brilho:** `lanterna` e `perolaLuz` saem com força de emissão 1 e `moedaOuro` com um brilho
  baixo (0,2); o jogo regula.
- **Prévias:** `render.py` com uma montagem que põe o fundo de areia, a superfície vista de baixo e
  a cor da água (as montagens ficam fora do repositório; sem elas a água do `AGUA=1` cobre tudo).

### Navio afundado (`recife_navio.py` → `recife-navio.glb`)

- Veleiro de 11 m inteiro, deitado para bombordo (18°), a popa um pouco mais enterrada e montes de
  areia cobrindo o bombordo e a proa. O casco é uma casca de tábuas (faixa vermelha na borda, fundo
  escuro, vigias de bronze, cracas e corais crescendo no costado), com o rombo do lado de boreste
  embaixo da amurada (2,35 m de largo, da areia do porão até o convés) e as tábuas da beira
  quebradas e entortadas para fora. Por ele se nada para dentro.
- O convés tem a escotilha aberta (1,4 x 1,5 m), um pedaço desabado perto da proa (1,2 x 2,2 m, com
  as tábuas penduradas para dentro do porão), o timão e a lanterna da popa: são mais duas entradas.
  O mastro grande é um toco quebrado que sai 1,2 m da água (de longe se vê onde está o navio); o do
  traquete é um toco curto.
- Porão: areia plana a −3,35, barris, caixotes, rolo de corda, moedas e pérolas espalhadas, o
  lampião pendurado logo acima do baú e uma poça de luz quente na areia em volta dele (`luzBau`). O
  vão livre entre a areia e o convés vai de 1,8 m (encostado no bombordo) a 2,7 m (perto do boreste).
- O pedaço de cima do mastro quebrou e caiu para bombordo: uma ponta ficou apoiada na amurada, ao
  lado do toco, e a outra na areia. A verga ficou atravessada nele e a vela listrada caiu por cima,
  como uma tenda encostada no casco. Embaixo dela fica o cesto da gávea tombado, onde se esconde a
  página do diário.
- A âncora de ferro meio enterrada na frente da proa, com a corrente até o escovém. Corais, cracas,
  estrelas-do-mar e seis algas que balançam.
- **Âncoras:**
  - `entrada`: na frente do rombo, a meia água;
  - `bau`: na areia do porão, perto da popa; o giro em Z olha para o rombo. O jogo põe ali o
    `bau.glb` dos itens (o arquivo do navio não desenha o baú);
  - `pagina-diario`: dentro do cesto da gávea, embaixo da vela (o lugar escondido);
  - `escotilha`: em cima da escotilha aberta;
  - `mastro`: a ponta do mastro quebrado, na linha d'água.
- **Colisão:** `col-casco` (uma caixa fina por pedaço do casco, dentro da tábua, sem as do rombo),
  `col-conves` (o convés inteiro menos a escotilha), `col-cil-mastro`, `col-cil-timao`,
  `col-areia-porao`, `col-cil-barril`, `col-barril-deitado`, `col-caixote`, `col-cil-areia` (o
  leito), `col-cil-pedra`, `col-cil-mastro-caido`, `col-cil-verga`, `col-cesto`, `col-ancora` e
  `col-cil-coral`. A vela, as cordas, as tábuas soltas, as algas e o miúdo do chão não colidem.
- **Materiais pelo nome:** `madeiraNavio`, `madeiraNavioEscura`, `madeiraNavioClara`, `navioFaixa`,
  `navioFundo`, `velaNavio`, `velaListra`, `ferroNavio`, `ferrugem`, `vidroNavio`, `moedaOuro`,
  `luzBau` (brilho baixo, 0,35), mais
  os do Recife (`lanterna`, `perolaLuz`, corais, algas, rochas e areia).
- **Onde fica no Recife (proposta):** o centro em x 7,5, z −25,5, sem giro (proa para +x e o rombo
  virado para o cais). O rombo fica em x 7,4, z −22,8, a uns 7 m do `mergulho` (a ponta do cais); o
  leito de areia vai de x −3,7 a 17,1 e de z −34,8 a −20, longe da praia (raio 14,4), do barco
  atracado e da chegada da ponte.

### Labirinto de corais (`recife_labirinto.py` → `recife-labirinto.glb`)

- Grade de 5 x 4 quadras de 3,6 m (20 x 16 m). Cada trecho de parede é feito de cabeças de coral
  redondas e lisas, de cores diferentes, em cima de um miolo escuro que aparece nas frestas: duas
  embaixo, uma no meio (às vezes com o sulco do coral-cérebro) e a coroa de coral-cérebro, que sai uns
  0,7 m da água (de longe se vê o desenho do labirinto). Cada canto é uma cabeça alta. Nos lados que
  dão para corredor crescem cérebros, esponjas em tubo e em barril, corais-pilar, chifres-de-veado
  de pontas redondas, leques finos, anêmonas e bolhas; no chão de areia há conchas, estrelas,
  pedrinhas lisas e tufos de alga. Uma quadra é um bloco maciço.
- Corredores com 2,6 m entre os colisores (os corais dos lados ocupam uma parte desse vão) e a água
  de 3,5 m: dá para nadar na superfície ou mergulhar. Entrada no −z (arco azul de conchas e a boia
  vermelha e branca) e saída no +z (arco amarelo com a estrela e a boia verde).
- Três bifurcações: logo depois da entrada (três caminhos), no meio do lado direito e perto da
  saída; três becos. Dois arcos de coral na altura da água só deixam passar mergulhando por baixo
  (2,3 m livres até a areia).
- O beco do tesouro, no canto de trás à esquerda: uma gruta com teto de coral (entra-se por baixo),
  o mexilhão gigante aberto com três pérolas que brilham e moedas na areia.
- **Âncoras:** `entrada` e `saida` na linha d'água, do lado de fora de cada arco; `tesouro` na
  areia, na boca do mexilhão.
- **Colisão:** `col-parede` (uma caixa de 1 m de grossura por trecho de parede), `col-cil-pilar`
  (um por canto), `col-bloco`, `col-arco` (os dois arcos baixos), `col-teto` (a gruta) e
  `col-cil-mexilhao`. Os corais dos lados, as algas, as boias e o miúdo do chão não colidem.
- **Materiais pelo nome:** `coralina`, `coralinaClara`, `coralPessego`, `coralAreia`, `coralMenta`,
  `boiaVerde`, `boiaBranca`, `boiaAmarela`, `moedaOuro`, mais os do Recife (corais, `perolaLuz`,
  `boia`, algas, rochas e areia).
- **Onde fica no Recife (proposta):** o centro em x −1, z 27, sem giro (a entrada olha para a
  ilha). A entrada fica em x −1, z 18,6 e a saída em x 2,6, z 35,4; a areia do labirinto começa em
  z 17,2, fora da praia (raio 14,4), e de lá se vê a casa da Maré.

## O que tem em cada ilha

- **Bosque dos Bichos:**
  - árvores grandes de três tipos (a copa larga, a alta em andares e o ipê rosa);
  - percurso nas copas: começa na casa na árvore, com escada em espiral de degraus de 0,33 que
    chega no deque longe da casa e da ponte, passa por três pontes de corda entre deques de 4,0 a
    4,8 de altura (raio de 2,0 a 2,9, com folga para contornar o tronco) e termina num escorregador;
  - a cabana de toras da Capi, com a placa da cruz verde, varanda, chaminé e floreiras;
  - o cercadinho dos bichos para adotar e o lago com vitórias-régias;
  - três cipós num galho comprido por cima do lago;
  - toras, tocos, cogumelos, flores, moitas, pedras com musgo e tocas.
- **Vila Doce:**
  - rua de calçada até a praça e a fonte de chocolate em três bacias, com as cortinas escorrendo;
  - seis barracas da feira: frutas, doces, flores, verduras, sucos e brinquedos;
  - a padaria do Bento (enxaimel, telhado de barra de chocolate, vitrine, placa do pão, chaminé);
  - a sorveteria com terraço e a casquinha gigante;
  - três casinhas de telhado plano com cobertura escorrendo: o percurso dos telhados, cada degrau
    com no máximo 1 de altura e uns 2 de vão, dentro do pulo do personagem (1,5);
  - pirulitos, jujubas, bengalas, postes, bancos e canteiros.
- **Recife Coral:**
  - lagoa com corais de quatro tipos e algas;
  - a casa redonda da Maré, com o casco de tartaruga de telhado, escotilhas, cata-vento e luneta;
  - a mesa de mapas, o cavalete com o mapa do arquipélago e o cesto de mapas;
  - o cais com cabeços, boia e lampião;
  - a caverna submarina: boca de ~1,2 acima da água, salão com chão de areia a −1,3, corais, um
    mexilhão aberto com pérolas e cristais que brilham;
  - coqueiros, conchas, estrelas-do-mar, guarda-sol e castelinho de areia.

## Arquivos daqui

- `lib_ilhas.py`: os ajudantes, que reaproveitam o `lib_mundo` e as ilhas leves;
- `bosque.py`, `vila_doce.py`, `recife.py`: um script por ilha;
- `recife_navio.py` e `recife_labirinto.py`: os lugares de exploração do Recife;
- `build_all.py`, com a conferência;
- `render.py`, que chama o `arte/mundo/render.py`;
- `relatorio.json`: triângulos, tamanho, nós, âncoras e clipes de cada arquivo.
