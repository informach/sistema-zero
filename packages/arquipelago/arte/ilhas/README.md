# Ilhas completas no Blender

As versões completas das ilhas do anel. Cada uma tem um script Python que monta a ilha no Blender
sem tela (o mesmo `bpy` do mundo) e grava os GLBs em `src/assets/ilhas/`. O jogo mostra a versão
leve (`ilhas-do-anel.glb`, de `arte/mundo/ilhas_anel.py`) e troca pela completa quando a pessoa
atravessa a ponte. Por enquanto só o Bosque está ligado (`src/mundo/ilha-completa.tsx`).

Por enquanto existem três ilhas: Bosque dos Bichos, Vila Doce e Recife Coral.

## Rodar

```sh
# as três ilhas, as peças soltas e o barco, com a conferência no fim
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
| `bosque.glb` | `terreno`, `agua`, `construcoes`, `vegetacao`, `cipo-1`…`cipo-3`, `copa-1`…`copa-11`, `tronco-1`…`tronco-5`, `telhado-casa-na-arvore` e 265 `col-*` | comuns + `escada`, `casa-na-arvore`, `cabana`, `cercado`, `lago`, `escorregador-fim`, `copas-1`…`copas-4` | não tem | 27.782 | 959 KB |
| `vila-doce.glb` | `terreno`, `fonte`, `construcoes`, `telhados`, `feira`, `enfeites` | comuns + `fonte`, `padaria`, `sorveteria`, `telhados-inicio`, `telhados-1`…`telhados-3`, `telhados-fim`, `barraca-1`…`barraca-6` | não tem | 27.606 | 925 KB |
| `recife.glb` | `terreno`, `lagoa`, `construcoes`, `corais`, `enfeites`, `caverna`, `alga-1`…`alga-10` | comuns + `casa-mare`, `mapa`, `lagoa`, `cais`, `barco`, `caverna-entrada`, `caverna`, `caverna-tesouro`, `mergulho` | `balancar` (2 s, as algas) | 17.484 | 547 KB |
| `bosque-props.glb` | `arvore-grande-a`/`-b`/`-c`, `arvore-media`, `moita`, `tora`, `toco`, `cogumelo` | | não tem | 3.958 | 84 KB |
| `vila-doce-props.glb` | `casinha-a`/`-b`/`-c`, `barraca`, `pirulito`, `jujuba`, `bengala`, `lampiao` | | não tem | 7.966 | 272 KB |
| `recife-props.glb` | `coral-galho`, `coral-cerebro`, `coral-leque`, `coral-tubo`, `mapa-aberto`, `mapa-rolo`, `alga` | | `balancar` (a alga) | 1.416 | 49 KB |
| `barco.glb` | `barco` (pivô na linha d'água, proa em +x) | | `balancar` (3 s: rola, arfa e sobe e desce) | 2.456 | 70 KB |

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
  - `casa-na-arvore`: a porta, em cima do deque;
  - `copas-1`…`copas-4`: o centro de cada deque, na altura dele (pontos de controle do percurso);
  - `escorregador-fim`, `cabana` (a porta), `cercado`, `lago`.
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

Esta sessão não tinha o Blender sem tela, então o jogo marca no código o que ainda não está no
`bosque.glb`. Quando o Blender rodar de novo:

- **Tronco de escalar:** um nó `escalada-cil-tronco-dos-cipos` no tronco da árvore do galho dos
  cipós (T6), na convenção dos colisores: cilindro unitário sem material, em pé, do chão (y = 1) até
  6,5, com o raio da casca desenhada (0,86 embaixo, 0,5 em cima; o meio vai de x 8,6, z 5,21 a
  x 8,84, z 5,07 no referencial do jogo). Hoje esses números estão em `TRONCO_DOS_CIPOS`
  (`src/mundo/bosque.ts`), e o jogo desenha uma trepadeira em espiral por cima para mostrar que ele
  sobe. Ficaria melhor com a trepadeira modelada (ou degraus de madeira pregados) no próprio tronco.
  O jogo ainda não lê `escalada-*`: quando o nó chegar, troque a constante pela leitura dele.
- **Lago:** o nó `agua` é uma mancha sobre o tampo, sem fundo. O jogo trata a elipse dele como água
  rasa (o avatar nada e afunda até a cintura, com o corpo no chão). Um fundo de uns 0,6 abaixo do
  tampo, com a margem em rampa no `col-terreno`, deixaria a água de verdade.
- **Placa de largada e vagalumes:** desenhados no código (`PLACA_DA_LARGADA` e
  `VAGALUMES_DAS_COPAS`). Uma placa modelada ao lado do pé da escada (x 0,6, z 1,3), na madeira da
  casa na árvore, combinaria com o resto.

### Nós que mexem

- **`cipo-1`…`cipo-3` (Bosque):** o pivô fica no galho. O jogo balança cada cipó girando o nó; o
  cipó tem 4,2 de comprimento e uma alça no fim. As mãos seguram acima da alça, onde os pés passam
  livres do chão (`comprimentoDaPegada` em `src/sistemas/cipo.ts`).
- **Algas e barco:** o `balancar` toca em laço. O do barco também mexe na posição do nó: ponha o
  barco dentro de um grupo na âncora `barco`.
- **Recife:** `agua`/`lagoa` e a fonte de chocolate são nós à parte, para o jogo trocar o material
  (água que mexe, chocolate brilhante).

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
- `build_all.py`, com a conferência;
- `render.py`, que chama o `arte/mundo/render.py`;
- `relatorio.json`: triângulos, tamanho, nós, âncoras e clipes de cada arquivo.
