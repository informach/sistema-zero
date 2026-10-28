# Casa do Arquipélago no Blender: kit de construir e móveis dos cômodos

O kit modular do modo construir (paredes, portas, janelas, quinas, pisos e telhado) e os móveis
da cozinha, da sala e do banheiro. Cada grupo tem um script que monta as peças no Blender sem tela
(o mesmo `bpy` de `arte/itens` e `arte/mundo`) e grava GLBs em `src/assets/casa/`, com uma peça por
nó. As peças ainda não estão ligadas ao jogo.

## Rodar

```sh
# tudo, a conferência do contrato, as faces coplanares de cada GLB e o relatorio.json
/tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py

# o mesmo, montando também as cenas de conferência e conferindo as emendas entre peças vizinhas
CENAS=1 /tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py

# só um grupo (GLB filtra pelo nome: paredes, portas, pisos, telhado / cozinha, sala, banheiro)
GLB=telhado /tmp/claude-0/blender-venv/bin/python -B arte/casa/kit.py
GLB=sala /tmp/claude-0/blender-venv/bin/python -B arte/casa/comodos.py

# prévias das cenas montadas (Cycles; RES, AMOSTRAS, DIR_PREVIAS; VISTA troca a câmera)
DIR_PREVIAS=/tmp/casa RES=640 AMOSTRAS=24 /tmp/claude-0/blender-venv/bin/python -B arte/casa/cenas.py kit cozinha
```

`CASA_OUT=/outra/pasta` grava os GLBs em outro lugar. As cenas e as prévias vão para `DIR_PREVIAS`
(padrão: `arte-casa` no diretório temporário), nunca para o repositório.

## Scripts

| Script | O que faz |
|---|---|
| `lib_casa.py` | importa a `lib_itens` (formas, paleta, `exportar`) e aponta a saída para `src/assets/casa` e o relatório para `arte/casa/relatorio.json` antes de cada exportação; paleta da casa; `extrudar`, `parede_grade`, `varrer`, `loft_ret`, `bloco`, `exportar_casa` |
| `kit.py` | `casa-paredes.glb`, `casa-portas.glb`, `casa-pisos.glb`, `casa-telhado.glb` |
| `comodos.py` | `casa-cozinha.glb`, `casa-sala.glb`, `casa-banheiro.glb` |
| `cenas.py` | cenas de conferência (kit encaixado, cozinha, sala, banheiro, vitrine dos móveis): GLB temporário e prévias |
| `build_all.py` | roda tudo e confere |

## Medidas que o modo construir usa

- **Grade:** 1 unidade por célula. No Blender o z aponta para cima e a frente olha para -Y; no
  three.js isso vira y para cima e frente para +Z. Abaixo, "x" e "y" são do Blender (no jogo, x e -z).
- **Parede:** fica centrada na linha da grade, com espessura 0,20 (de -0,10 a +0,10). Altura 4,0 (a do
  quarto e da casa). O pé desce até -0,10, para dentro do piso. A parede cortada (`-baixa`, o corte
  automático para ver dentro) tem 1,0.
- **Lados da parede:** o +Y local é sempre o lado de DENTRO do cômodo. Uma parede na linha y = c com o
  cômodo em +y usa giro 0; com o cômodo em -y, 180°. Numa linha x = c, com o cômodo em +x o giro é
  -90°; em -x, +90°.
- **Origem das paredes:** no meio da base, sobre a linha da grade. Larguras: 1 célula (`parede-*`,
  `parede-janela-redonda-*`), 2 (`parede-janela-arco-*`) e 3 (`parede-porta-*`,
  `parede-janela-grande-*`). Uma peça de largura n começa n/2 antes da origem.
- **Famílias:** `lambri` é a parede de fora da casa: o -Y local é a fachada, com o alicerce de pedra,
  o rodapé branco, os frisos do lambri e o friso de cima, iguais aos da `casa.py`; o +Y tem o rodapé
  de dentro. `lisa` separa dois cômodos e tem rodapé dos dois lados.
- **Quinas:** a parede não tem tampa nas pontas, para emendar com a vizinha sem face escondida e
  sem fresta. Por isso vai uma quina, centrada no ponto da grade, em toda ponta solta de parede, em
  toda dobra em L e onde uma parede em pé encontra uma cortada na mesma linha. Num T (uma parede que
  chega no meio de outra) e na emenda reta entre duas paredes da mesma altura não vai nada: a ponta
  fica dentro da outra parede. Use `quina-lambri` quando houver parede de lambri no ponto e
  `quina-lisa` entre paredes lisas (e as `-baixa` com paredes cortadas).
- **Portas:** o vão tem 2,2 × 3,0, como o da casa, no meio da peça de 3 células, do pé da parede para
  cima, com uma soleira de madeira 3 cm acima do piso. A folha (`porta` de madeira com vigia, para a
  porta de fora, ou `porta-interna` verde-água) vai com a MESMA posição e giro da parede. A
  dobradiça fica em x = -1,02, y = -0,04 (o pivô do nó); fechada, a folha fica no meio da espessura.
  O clipe gira -100° (-1,75 rad em y no three.js, como a porta da casa), abrindo para o -Y local
  (para fora, no lambri). Para abrir para o outro lado, gire a parede e a folha 180° juntas. Na
  parede cortada fica só o batente até 1,02: esconda a folha.
- **Janelas:** grande com venezianas e floreira (vão 1,5 × 1,2, de 1,6 a 2,8); em arco (vão 1,0 ×
  1,2, arco de raio 0,5 a partir de 2,3); redonda (vidro de raio 0,18 com centro em 2,55). Todas as
  vergas ficam em 2,8. Na família `lisa` saem sem venezianas e sem floreira (janela entre cômodos).
  Com as paredes cortadas, use a parede cortada da mesma família no lugar da janela.
- **Pisos:** 1 × 1, origem no meio da célula. Os da casa (`piso-tabua`, `piso-ladrilho`,
  `piso-azulejo`) têm o topo em z = 0 (a altura do piso do quarto) e 10 cm de espessura, sem a face
  de baixo; vão até a linha da grade, por baixo das paredes. A grama do quintal (`piso-grama`,
  `piso-pedra`) tem o topo em -0,02 (o chão da ilha fica 2 cm abaixo do piso da casa) e não tem
  lados. A tábua continua de uma célula para a outra em x: gire os pisos de um cômodo todos iguais.
- **Telhado:** duas águas com a cumeeira ao longo de x, inclinação de 0,5 por célula (26,6°, quase a
  da casa). Para um cômodo de w × d células com as paredes em y0 e y0 + d e topo das paredes em 4,0:
  - em cada coluna x (meio da célula), `beiral` em (x, y0, 4) e `agua` k em (x, y0 + k, 4 + 0,5 k),
    para k = 0 até d/2 - 1, giro 0. Com d ímpar, a última é a `agua-meia`. O outro lado é igual a
    partir de y0 + d, com giro 180° e y diminuindo;
  - `cumeeira` em (x, y0 + d/2, 4 + 0,25 d) em cada coluna, e `cumeeira-ponta` nas duas pontas
    (na coluna da ponta; a da direita com giro 180°);
  - nas pontas da fileira, `testeira-esq` (lado -x local) e `testeira-dir` (lado +x local), com a
    MESMA posição e giro da água daquele lugar; idem `testeira-meia-*` e `testeira-beiral-*`. Com o
    giro de 180°, a ponta -x do mundo é o lado +x local (`-dir`). O telhado passa 0,24 do oitão e a
    tábua da testeira fecha a ponta;
  - oitões (empenas) nas linhas x = x0 (giro -90°) e x = x0 + w (giro +90°), no referencial de parede
    (fora em -Y local, 3 cm à frente da parede de baixo). Na coluna c a partir da beira (c = 0, 1, …),
    c peças `oitao-faixa` empilhadas a partir de 4,0 (0,5 cada) e um triângulo em 4,0 + 0,5 c, com o
    alto virado para a cumeeira: `oitao-dir` tem o alto no +x local, `oitao-esq` no -x. Com d ímpar,
    a coluna do meio usa `oitao-meia-*` e `oitao-faixa-meia` (meia célula);
  - `vigia` (janelinha redonda do oitão) tem a origem no centro, na linha da grade: mesmo giro do
    oitão, no meio da empena, a uns 0,55 abaixo do cume.
  O `Cena.telhado` de `cenas.py` faz exatamente isso e serve de referência.
- **Peças de parede dos cômodos** (prateleira, quadro, espelho, toalheiro): centradas na origem,
  com o fundo em y = +0,10. A face da parede do kit fica a 0,10 da linha da grade: a origem vai a
  0,20 da linha, com o giro da parede.

## Móveis: contrato

- Base em z = 0, centrado em x no footprint (largura × fundo em células) e frente para -Y.
- Os móveis de encostar têm o fundo em y = +0,35: encostam no rodapé de dentro do kit (que vai até
  0,36 do meio da célula, e 0,40 é a face da parede) sem atravessar. O varão e o cano do box vão
  até a face das paredes (0,40), porque ficam presos nelas, bem acima do rodapé.
- Alturas de apoio: tampo dos balcões 0,92, mesa da cozinha 0,81 (a do nicho da mesa do quarto),
  mesinha de centro 0,44, assento da cadeira 0,50, do sofá e da poltrona 0,58, borda da pia 0,86.
- O box tem as paredes atrás e à direita (+x, +y): no canto de trás à esquerda, gire 90°.
- Sem animação; cada móvel é um nó (com mais de um material, vira um grupo com uma malha por
  material no three.js, com o nome do nó).

## Materiais que o jogo procura pelo nome

- `vidroJanela` (janelas, vigia, vigia da porta): emissão com força 1, o jogo acende à noite, como
  na casa. As prévias deixam em 0,08 (de dia).
- `luz` (lâmpada e lado de dentro da cúpula da luminária de pé): emissão com força 1, aceso à noite.
- `paredeDentro` (lado de dentro de toda parede) e `paredeVerso` (lado -Y da parede lisa): o jogo
  pinta por cômodo. As prévias pintam cada cômodo com uma cor.
- `paredeTopo`: o topo da parede, que aparece no corte.
- `vidroArmario`: único material translúcido (alfa 0,32, BLEND), para ver a louça no armário alto.
- Os da casca têm o mesmo nome e cor da `casa.py` (`parede`, `paredeSombra`, `acabamento`,
  `batente`, `alicerce`, `telhado`, `telhadoSombra`, `floreira`, `macaneta`).

## Clipes

| Arquivo | Clipe | Nó | O que faz |
|---|---|---|---|
| `casa-portas.glb` | `abrir` | `porta` | gira na dobradiça de 0 a -100° em 0,75 s; toca uma vez (`LoopOnce` com `clampWhenFinished`) |
| `casa-portas.glb` | `abrir-interna` | `porta-interna` | o mesmo |

## Sem pisca-pisca

As regras do README de `arte/mundo` valem aqui, e mais as das peças que se repetem:

- Peça repetida não tem tampa onde encosta na vizinha, e as faixas (alicerce, rodapés, frisos,
  calha, fiadas do telhado) são perfis puxados que casam vértice a vértice com a vizinha.
- Toda parede é uma malha em grade com as MESMAS linhas: as alturas `CORTES_Y` (-0,1; 1,0; 1,6; 2,3;
  2,8; 3,0; 4,0) e uma coluna a cada meia célula. A janela em arco e a redonda fecham os cantos do
  vão com um tampão rente à parede, que divide os vértices com ela.
- A testeira passa 5 mm das pontas da água, o oitão fica 3 cm à frente da parede de baixo, os
  livros da estante afundam alturas diferentes na prateleira: nada fica no mesmo plano por acaso.

Conferir: `bun scripts/faces-coplanares.ts --separados src/assets/casa/<arquivo>.glb` em cada GLB
(o `build_all.py` já roda) e, nas cenas montadas, o mesmo sem `--separados` (`CENAS=1`). Na cena da
cozinha, o fogão a lenha de `arte/itens` acusa pares só dele (lenha, fogo e chapa); as peças daqui
não acusam nada.

## O que o jogo ainda desenha no código (falta no kit)

O modo construção (28/10/2026, `arquipelago/src/sistemas/construcao/` e `src/mundo/obra.tsx`) usa
este kit e precisa de duas peças que ele ainda não tem. Até elas chegarem, o jogo desenha formas
simples no código:

- **Cerca do quintal:** uma peça de 1 célula na linha da grade, como a parede (origem no meio da
  base, sobre a linha), com 0,9 de altura, e o poste da ponta (`cerca-poste`, centrado no ponto da
  grade). Hoje: um poste de 0,12 em cada ponto e duas travessas (a 0,35 e 0,72) por aresta
  (`CERCA` em `sistemas/construcao/quintal.ts`). O jogo põe um poste em todo ponto com cerca.
- **Canteiro do quintal:** um canteiro de 1 × 1 célula com a terra em cima, como o da horta
  (`arte/mundo/horta.py`, nó `canteiro`, de 1,35) e com os mesmos nós de planta. Hoje o jogo usa o
  canteiro da horta reduzido a 0,66 (`ESCALA_DO_CANTEIRO_DO_QUINTAL` em `mundo/horta.tsx`).
- **Grama e pedra do quintal:** o topo fica na altura do chão da ilha, como diz o contrato acima,
  e por isso o jogo sobe as duas 1 cm (`ACIMA_DO_TERRENO` em `mundo/obra.tsx`) para não piscar contra
  o terreno.

## Peças

Tamanho = largura × altura × fundo, em unidades do jogo. Triângulos por nó; o tamanho em KB é do
arquivo inteiro.

### `casa-paredes.glb` (7.756 triângulos, 337 KB)

| Nó | Células | Tamanho | Triângulos |
|---|---|---|---|
| `parede-lambri` | 1 | 1,00 × 4,30 × 0,33 | 116 |
| `parede-lambri-baixa` | 1 | 1,00 × 1,30 × 0,33 | 38 |
| `parede-porta-lambri` | 3 | 3,00 × 4,30 × 0,67 | 454 |
| `parede-porta-lambri-baixa` | 3 | 3,00 × 1,32 × 0,67 | 214 |
| `parede-janela-grande-lambri` | 3 | 3,00 × 4,30 × 0,70 | 3.070 |
| `parede-janela-arco-lambri` | 2 | 2,00 × 4,30 × 0,49 | 630 |
| `parede-janela-redonda-lambri` | 1 | 1,00 × 4,30 × 0,33 | 694 |
| `quina-lambri` | ponto | 0,44 × 4,34 × 0,44 | 150 |
| `quina-lambri-baixa` | ponto | 0,44 × 1,34 × 0,44 | 150 |
| `parede-lisa` | 1 | 1,00 × 4,10 × 0,28 | 64 |
| `parede-lisa-baixa` | 1 | 1,00 × 1,10 × 0,28 | 24 |
| `parede-porta-lisa` | 3 | 3,00 × 4,10 × 0,34 | 242 |
| `parede-porta-lisa-baixa` | 3 | 3,00 × 1,12 × 0,34 | 134 |
| `parede-janela-grande-lisa` | 3 | 3,00 × 4,10 × 0,49 | 384 |
| `parede-janela-arco-lisa` | 2 | 2,00 × 4,10 × 0,49 | 548 |
| `parede-janela-redonda-lisa` | 1 | 1,00 × 4,10 × 0,30 | 632 |
| `quina-lisa` | ponto | 0,30 × 4,13 × 0,30 | 106 |
| `quina-lisa-baixa` | ponto | 0,30 × 1,13 × 0,30 | 106 |

A altura do lambri conta o alicerce, que desce até -0,30 (dentro do chão da ilha).

### `casa-portas.glb` (3.424 triângulos, 154 KB)

| Nó | Pivô | Tamanho | Triângulos |
|---|---|---|---|
| `porta` | dobradiça (-1,02; -0,04; 0) | 2,04 × 2,87 × 0,43 | 1.992 |
| `porta-interna` | dobradiça (-1,02; -0,04; 0) | 2,04 × 2,87 × 0,43 | 1.432 |

### `casa-pisos.glb` (1.016 triângulos, 50 KB)

| Nó | Topo | Tamanho | Triângulos |
|---|---|---|---|
| `piso-tabua` | 0 | 1,00 × 0,10 × 1,00 | 144 |
| `piso-ladrilho` | 0 | 1,00 × 0,10 × 1,00 | 72 |
| `piso-azulejo` | 0 | 1,00 × 0,10 × 1,00 | 154 |
| `piso-grama` | -0,02 | 1,00 × 0,15 × 1,00 | 330 |
| `piso-pedra` | -0,02 (pedras até +0,012) | 1,00 × 0,17 × 1,00 | 316 |

### `casa-telhado.glb` (834 triângulos, 67 KB)

| Nó | Origem | Tamanho | Triângulos |
|---|---|---|---|
| `agua` | meio da beira de baixo, no forro | 1,00 × 0,62 × 1,00 | 14 |
| `agua-meia` | idem | 1,00 × 0,37 × 0,50 | 10 |
| `beiral` | idem (desce 0,5 para fora) | 1,00 × 0,48 × 0,74 | 56 |
| `cumeeira` | na cumeeira, altura do forro | 1,00 × 0,23 × 0,32 | 38 |
| `cumeeira-ponta` | idem | 0,36 × 0,23 × 0,32 | 38 |
| `testeira-esq`, `testeira-dir` | a da água | 0,34 × 0,80 × 1,01 | 26 cada |
| `testeira-meia-esq`, `-dir` | a da água-meia | 0,34 × 0,55 × 0,51 | 22 cada |
| `testeira-beiral-esq`, `-dir` | a do beiral | 0,34 × 0,58 × 0,74 | 86 cada |
| `oitao-esq`, `oitao-dir` | meio da base, na linha | 1,00 × 0,53 × 0,21 | 10 cada |
| `oitao-meia-esq`, `-dir` | idem | 0,50 × 0,28 × 0,21 | 8 cada |
| `oitao-faixa` | idem | 1,00 × 0,50 × 0,21 | 12 |
| `oitao-faixa-meia` | idem | 0,50 × 0,25 × 0,21 | 6 |
| `vigia` | centro, na linha | 0,62 × 0,62 × 0,12 | 356 |

### `casa-cozinha.glb` (13.170 triângulos, 400 KB)

| Nó | Footprint | Tamanho | Triângulos |
|---|---|---|---|
| `balcao-pia` | 2 × 1 | 2,00 × 1,32 × 0,78 | 2.442 |
| `balcao` | 1 × 1 | 1,00 × 1,22 × 0,78 | 1.058 |
| `armario-alto` | 1 × 1 | 1,00 × 2,36 × 0,72 | 2.754 |
| `mesa-cozinha` | 2 × 1 | 1,70 × 0,81 × 0,90 | 892 |
| `cadeira-cozinha` | 1 × 1 | 0,50 × 1,13 × 0,46 | 1.568 |
| `prateleira-potes` | parede | 1,40 × 0,70 × 0,30 | 4.456 |

### `casa-sala.glb` (16.350 triângulos, 488 KB)

| Nó | Footprint | Tamanho | Triângulos |
|---|---|---|---|
| `sofa` | 3 × 1 | 2,80 × 1,13 × 0,85 | 5.280 |
| `poltrona` | 1 × 1 | 0,96 × 1,05 × 0,85 | 2.712 |
| `mesinha-centro` | 2 × 1 | 1,30 × 0,44 × 0,70 | 880 |
| `tapete` | 3 × 2 | 2,80 × 0,02 × 1,85 | 418 |
| `estante-baixa` | 2 × 1 | 1,80 × 1,20 × 0,43 | 4.046 |
| `luminaria-pe` | 1 × 1 | 0,61 × 1,89 × 0,61 | 1.320 |
| `planta` | 1 × 1 | 0,94 × 1,34 × 0,89 | 1.338 |
| `quadro` | parede | 1,03 × 0,77 × 0,08 | 356 |

### `casa-banheiro.glb` (9.538 triângulos, 272 KB)

| Nó | Footprint | Tamanho | Triângulos |
|---|---|---|---|
| `banheira` | 2 × 1 | 1,70 × 0,85 × 0,80 | 3.432 |
| `pia-banheiro` | 1 × 1 | 0,62 × 1,06 × 0,48 | 1.660 |
| `espelho` | parede | 0,64 × 0,91 × 0,12 | 484 |
| `vaso-sanitario` | 1 × 1 | 0,43 × 0,86 × 0,69 | 1.096 |
| `box-chuveiro` | 1 × 1 | 0,89 × 2,08 × 0,90 | 2.218 |
| `tapetinho` | 1 × 1 | 0,80 × 0,02 × 0,52 | 232 |
| `toalheiro` | parede | 0,70 × 0,51 × 0,15 | 416 |

**Total:** 7 arquivos, 52.088 triângulos, 1,73 MB.
