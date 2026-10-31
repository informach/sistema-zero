# Peças do avatar feitas no Blender

Scripts que geram as peças próprias do avatar 3D. As 32 de 26/10/2026 são os cabelos `hair-12` a
`hair-18`, o rosto delicado, roupas, calçados, óculos, acessórios e a aba Enfeite; as oito roupas
de festa de 31/10/2026 estão na seção própria, abaixo. Todas usam o mesmo esqueleto
(`public/avatar3d/base/Armature.glb`) e as mesmas regras de material das peças do pacote
Quaternius: `Color_*` pega a cor escolhida e `Skin_*` usa a pele.

## Preparar

O Blender roda sem tela pelo pacote `bpy` do PyPI, que pede Python 3.13:

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3
```

O pacote ocupa perto de 1 GB.

## Gerar uma peça

Cada arquivo agrupa uma família, e o nome da função vai depois de `--`:

```sh
/tmp/blender-venv/bin/python cabelos.py -- longo ponytail trancas afro cachos coque chiquinha
/tmp/blender-venv/bin/python enfeites.py -- laco tiara flores presilhas gatinho
/tmp/blender-venv/bin/python roupas.py -- mangalonga moletom listrada calca saialonga vestidolongo bota sapatilha
/tmp/blender-venv/bin/python rosto.py -- redondo gatinho sardas bochecha colar cachecol
/tmp/blender-venv/bin/python rostos.py -- sorrisos cilios brilho sobrancelha nariz
/tmp/blender-venv/bin/python festas.py -- cartolinha colete palha chita lanternas capa gorro sueter
/tmp/blender-venv/bin/python ajustes.py -- cartola
/tmp/blender-venv/bin/python conferir_festas.py
```

O arquivo sai em `out/<id oficial>.glb` (ou na pasta de `AVATAR_OUT`). Peça gerada entra nas DUAS
pastas, `community-kids/public/avatar3d/parts/` e `community/public/avatar3d/parts/`, e ganha a
miniatura com `bun run gen:avatar-thumbs <id>` (copie o PNG para as duas pastas `thumbs/`). Peça
que ainda não está no catálogo também ganha miniatura: o gerador aceita o id quando o GLB já está
em `public/avatar3d/parts/` e tira a categoria do prefixo (`hat`, `enfeite`, `top`, `outfit`...).

## Roupas de festa (31/10/2026)

Uma peça de cabeça e uma de corpo por festa, todas em `festas.py`:

| Festa | Id | Função | Peça | Cor própria (sem `Color_`) |
| --- | --- | --- | --- | --- |
| Carnaval | `hat-08` | `cartolinha` | cartolinha de lantejoula com pluma curta e serpentina na aba, com a aba no alto da testa | fita, pluma, serpentina |
| Carnaval | `top-07` | `colete` | colete de franjas coloridas sobre camiseta com confetes | camiseta, franjas, confetes |
| Junina | `hat-09` | `palha` | chapéu de palha com dois remendos de chita e aba desfiada | palha, chita (a fita é `Color_`) |
| Junina | `outfit-07` | `chita` | vestido de chita com babado, barra repesada nas coxas | chita e florzinhas (o babado é `Color_`) |
| Lanternas | `enfeite-06` | `lanternas` | tiara com três lanterninhas de papel penduradas | lanternas (com emissão), arame, ouro |
| Lanternas | `top-08` | `capa` | capa curta de estrelas, dos ombros à cintura | camiseta, estrelas (capa e gola são `Color_`) |
| Fim de ano | `hat-10` | `gorro` | gorro de tricô com pompom e barra branca | barra, pompom |
| Fim de ano | `top-09` | `sueter` | suéter com estrela grande no peito e flocos na barra | estrela, faixa e flocos |

- **Chapéus encaixam na cabeça, como os antigos (31/10/2026, decisão da dona).** O app esconde o
  cabelo e o enfeite debaixo de qualquer chapéu (`AVATAR_HIDE_GROUPS`), então `hat-08`, `hat-09` e
  `hat-10` assentam na cabeça careca. Cada chapéu é desenhado num tamanho de referência (o primeiro,
  que cabia sobre os cabelos) e `menor_escala` acha a menor escala em que o oco guarda as seis
  cabeças `head-01` a `head-06` acima da boca do chapéu; `colocar` aplica essa escala, a planta oval
  do crânio (`Q_OVAL` 1,13 mais fundo que largo, `P_OVAL` 2,25) e a posição, igual em todas as
  partes (o remendo continua colado na copa, a serpentina na aba). O gorro ainda acha a menor altura
  (`menor_altura`) e ganha 7 cm de folga no cocuruto. A altura e a inclinação de cada boca
  (`Z_CARTOLA`, `Z_PALHA`, `Z_GORRO`) seguem a régua dos chapéus antigos: a palha e o gorro descem
  até a testa, acima das sobrancelhas, como o boné `hat-02` e o pirata `hat-07`. A cartolinha tira o
  tamanho da boca no alto da cabeça, como a cartola `hat-04`, e depois afunda `AFUNDA_CARTOLA`
  (5,5 cm, pedido da dona) até a aba ficar no alto da testa, a 13 cm das sobrancelhas; para não
  crescer inteira, só a boca se abre no formato do crânio (`menor_boca`: a planta alarga 1,17 vez na
  aba e volta ao normal no alto da copa).
- **A régua dos chapéus.** `conferir_festas.py` mede, em cada uma das seis cabeças, os chapéus
  antigos que ficam na cabeça (`hat-01` a `hat-04`, `hat-06`, `hat-07`; a auréola `hat-05` flutua) e
  os novos: a menor distância até a cabeça (`folga_min`), a folga do topo do crânio até o chapéu
  (`topo`), quanto o chapéu desce na frente, dos lados e na nuca (o ponto mais baixo do couro cujo
  raio, saindo do centro da cabeça, acha o chapéu a até 15 cm), a mediana dessa folga
  (`folga_oco`) e a distância até as sobrancelhas e os olhos (`rosto`, todas as variantes
  `eyebrow-*` e `eyes-*`). O chapéu novo passa com zero vértices atravessando as cabeças,
  `folga_min` até 3 cm (o boné `hat-02`, o mais folgado dos antigos que encostam, tem 2,7), descida
  e folga no máximo iguais às dos antigos que cobrem o crânio (`hat-02`, `hat-03`, `hat-07`) e
  `rosto` de pelo menos 6 mm. Os números de cada chapéu, os dos antigos e os limites ficam em
  `festas-relatorio.json` (`pecas.<id>`, `ajustadas.hat-04`, `regua_chapeus`); o script grava o
  relatório já no formato do biome do monorepo.

  | Chapéu | Escala | `folga_min` | `topo` | Frente | Lado | Nuca | `folga_oco` |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | `hat-08` cartolinha | 0,783 (boca 1,17) | 1,5 cm | 18,9 cm | 17,6 cm | 27,1 cm | 25,1 cm | 9,8 cm |
  | `hat-09` palha | 0,797 | 1,0 cm | 5,6 cm | 23,9 cm | 28,9 cm | 32,4 cm | 7,8 cm |
  | `hat-10` gorro | 0,642 (altura 0,511) | 1,0 cm | 8,8 cm | 17,6 cm | 28,9 cm | 35,1 cm | 8,5 cm |
  | `hat-04` cartola (ajustada) | boca 1,55 | 0,8 cm | 48,3 cm | 17,6 cm | 23,6 cm | 28,2 cm | 8,7 cm |
  | limite (antigos) | | 3 cm | | 23,9 cm | 34,1 cm | 35,7 cm | 10,3 cm |

- **A cartola do pacote também afunda (`ajustes.py -- cartola`, pedido da dona).** A `hat-04` não
  tem script de origem: `ajustes.py` importa o GLB atual de `parts/`, mexe só na posição dos
  vértices e exporta pelo `export` de sempre (com o `reordenar.py`). Nó `Hat.004`, malha `Hat`,
  material `Hat` (a mesma textura, rugosidade e especular), UV e pesos (só a cabeça) ficam como
  vieram. A copa do pacote ficava 6,6 cm atrás do meio do crânio: a boca é centrada nele, a peça
  afunda `AFUNDA_HAT04` (11 cm) no eixo dela até a aba ficar no alto da testa, como a da cartolinha,
  e a boca se abre na planta oval do crânio (`menor_boca_malha`: a menor abertura, 1,55 vez, em que
  ela não cruza nem chega a menos de 8 mm de nenhuma das seis cabeças). A copa abre metade disso no
  alto (`ABRE_NO_ALTO`) e sobe reta; o anel de baixo da aba, que estreitava a boca, encosta por
  dentro da copa; a aba mantém a largura para fora. A função recusa uma peça já afundada: para
  refazer, `AJUSTE_ORIGEM` aponta a cópia original do pacote (no git, commit `9968ca967`). Ela
  continua medida na régua, mas saiu dos limites da descida (nunca foi o maior valor deles).

- **A tiara cabe sobre os cabelos.** Enfeite não esconde o cabelo: o arco de `enfeite-06` é medido
  contra os próprios cabelos (`FORA_TIARA`) e as cabeças. `conferir_festas.py` aceita um cabelo que
  a tiara atravesse só quando TODOS os enfeites que já existem (`enfeite-01` a `enfeite-05`) também
  o atravessam (hoje, só o crespo volumoso `hair-15`).
- **Roupas herdam os pesos do pacote** (`herdar_pesos`: cada vértice novo copia os pesos do vértice
  mais próximo de `top-01`/`outfit-01`; a capa só do tronco, para não seguir o braço).
- **Ainda fora do catálogo.** As oito peças não estão em `AVATAR_PART_INFO` (o catálogo é da dona);
  `tests/avatar3d-catalog.test.ts` lê os oito GLBs direto: arquivos iguais nos dois apps, juntas na
  ordem do `Armature.glb`, só o osso da cabeça nos chapéus e na tiara, `Color_` presente e abaixo
  do maior triângulos/KB da família. A categoria `hat` não tem paleta no catálogo: a cor do
  `Color_` dos chapéus só troca quando ela ganhar uma.

## Cuidados

- **Ordem das juntas.** O exportador de glTF do Blender grava as juntas do esqueleto em outra
  ordem, e o avatar prende cada peça pelo índice da junta. Por isso toda exportação passa por
  `reordenar.py`, que devolve a ordem do `Armature.glb`. Sem ele a peça fica parada no ar quando o
  corpo faz uma pose. O teste `tests/avatar3d-catalog.test.ts` confere todas as peças.
- **Coordenadas.** A armadura importada tem escala 0,01 e eixo Y para cima. `worldify` (em
  `lib.py`) grava cada malha copiada em metros, com z para cima e o rosto virado para -Y.
- **Pesos.** Cabelos, enfeites, óculos e rosto ficam presos só ao osso da cabeça. Roupas nascem das
  peças do pacote e herdam os pesos delas; a barra das saias compridas passa do quadril para as
  coxas (`repesar_barra`), para o joelho não atravessar o tecido.
- **Cor embutida.** Peça sem material `Color_` numa categoria com paleta entra em
  `AVATAR_FIXED_COLOR_PARTS` (`member-shell/src/lib/avatar3d-catalog.ts`).
