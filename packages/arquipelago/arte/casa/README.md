# Casa do Arquipélago no Blender: kit de construir e móveis dos cômodos

O kit modular do modo construir (paredes, portas, janelas, quinas, pisos, telhado e, desde
31/10/2026, o segundo andar e a varanda da porta de entrada) e os móveis da cozinha, da sala e do banheiro, do café e da banca de
feira e a decoração de festa. Cada grupo tem um script que monta as peças no Blender sem tela
(o mesmo `bpy` de `arte/itens` e `arte/mundo`) e grava GLBs em `src/assets/casa/`, com uma peça por
nó. As peças ainda não estão ligadas ao jogo.

## Rodar

```sh
# tudo, a conferência do contrato, as faces coplanares de cada GLB e o relatorio.json
/tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py

# o mesmo, montando também as cenas de conferência e conferindo as emendas entre peças vizinhas
CENAS=1 /tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py

# só um grupo (GLB com os nomes, separados por vírgula: no kit, paredes, portas, pisos, telhado, andar,
# paredes-andar, pelo nome exato; nos cômodos, cozinha, sala, banheiro)
GLB=telhado /tmp/claude-0/blender-venv/bin/python -B arte/casa/kit.py
GLB=sala /tmp/claude-0/blender-venv/bin/python -B arte/casa/comodos.py
/tmp/claude-0/blender-venv/bin/python -B arte/casa/cafe.py      # casa-cafe.glb
/tmp/claude-0/blender-venv/bin/python -B arte/casa/festas.py    # casa-festas.glb
/tmp/claude-0/blender-venv/bin/python -B arte/casa/varanda.py   # casa-varanda.glb

# prévias das cenas montadas (Cycles; RES, AMOSTRAS, DIR_PREVIAS; VISTA troca a câmera)
DIR_PREVIAS=/tmp/casa RES=640 AMOSTRAS=24 /tmp/claude-0/blender-venv/bin/python -B arte/casa/cenas.py kit cozinha

# miniaturas das escolhas do Construir (janelas, pisos, caminhos e objetos), depois a paleta
/tmp/claude-0/blender-venv/bin/python -B arte/casa/miniaturas.py
PASTA=src/assets/casa/miniaturas python3 -I arte/itens/icones_paleta.py
```

⚠️ Os scripts regravam todos os GLBs do grupo, e o Blender não sai byte a byte igual (o conteúdo é o
mesmo): depois do `build_all.py`, volte com `git checkout` os GLBs que você não quis mudar.

`CASA_OUT=/outra/pasta` grava os GLBs em outro lugar. As cenas e as prévias vão para `DIR_PREVIAS`
(padrão: `arte-casa` no diretório temporário), nunca para o repositório.

## Scripts

| Script | O que faz |
|---|---|
| `lib_casa.py` | importa a `lib_itens` (formas, paleta, `exportar`) e aponta a saída para `src/assets/casa` e o relatório para `arte/casa/relatorio.json` antes de cada exportação; paleta da casa; `extrudar`, `parede_grade`, `varrer`, `loft_ret`, `bloco`, `exportar_casa` (com `junto`, grava também os colisores `col_caixa`/`col_girada` e as âncoras `ancora` de cada peça) |
| `kit.py` | `casa-paredes.glb`, `casa-portas.glb`, `casa-pisos.glb`, `casa-telhado.glb`, `casa-andar.glb`, `casa-paredes-andar.glb` |
| `comodos.py` | `casa-cozinha.glb`, `casa-sala.glb`, `casa-banheiro.glb` |
| `cafe.py` | `casa-cafe.glb` (café e banca de feira; importa os ajudantes e a paleta de `comodos.py`) |
| `festas.py` | `casa-festas.glb` (decoração de festa; importa a `lib_festas` e os modelos da fogueira, da lanterna e da máscara de `arte/festas`) |
| `varanda.py` | `casa-varanda.glb` (31/10/2026): a varanda da porta de entrada da casa construída, com o desenho e os materiais da varanda do `casa.glb` e os colisores `col-varanda-*` (contrato abaixo) |
| `miniaturas.py` | `src/assets/casa/miniaturas/<id>.png` (160 px, fundo transparente): cada janela no meio de uma parede de lambri, cada piso e caminho numa grade, cada objeto de `src/assets/objetos` e cada móvel dos cômodos (`movel-<nó>.png`, 30/10/2026) e, desde 31/10/2026, cada peça do café e da decoração de festa (também `movel-<nó>.png`), com o enquadramento e a luz dos ícones dos itens (`arte/itens/render.py`). Refaça depois de mudar uma dessas peças; `tests/miniaturas.test.ts` confere que há uma por escolha |
| `cenas.py` | cenas de conferência (kit encaixado, cozinha, sala, banheiro, vitrine dos móveis, segundo andar `andar`, a escada encostada na parede `andar-parede`, a porta de lambri do andar em pé e cortada `andar-porta`, vitrine do café e das festas `cafe-festas`, as janelas na parede cortada `janela-baixa`, a varanda na porta de entrada da frente e na de lado, em pé e cortada, `varanda`): GLB temporário e prévias |
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
  Com as paredes cortadas, use a janela baixa da mesma família e tipo (abaixo) no lugar da janela.
- **Janelas na parede cortada** (31/10/2026, pedido dela): no modo Construir todas as paredes viram
  as cortadas (`-baixa`), e a janela virava parede lisa baixa (a criança não via a janela nem
  conseguia apagá-la). Agora a janela vira a **janela baixa**: `parede-janela-grande-<família>-baixa`,
  `parede-janela-arco-<família>-baixa` e `parede-janela-redonda-<família>-baixa` (`lambri` e `lisa`).
  Cada uma tem a MESMA largura (3, 2 e 1), origem (o meio do vão, no meio da base), giro e colunas
  da janela alta, e a altura da parede cortada da família: a parede tem só as linhas
  `CORTES_Y_BAIXA` nas pontas, então emenda vértice a vértice com as vizinhas baixas e altas (e,
  onde a altura muda, vai a quina de sempre). No alto da parede cortada ela mostra o pé da janela:
  - grande e em arco: o vão de 0,70 até o topo, a moldura em U com os lados subindo até 1,02 (2 cm
    acima do topo, como o batente da porta cortada), o peitoril de fora e o de dentro (sem chanfro),
    o montante do meio e o vidro (`vidroJanela`, 14 cm de espessura, topo em 0,99), que de cima é
    a faixa azul entre as molduras. No pé a janela em arco é reta, como a alta (o arco fica no alto
    dela): ela se distingue pela largura (1,0 contra 1,5) e por não ter venezianas;
  - grande no lambri: também o pé das venezianas (até 1,01, com duas ripas) e a floreira com flores
    por fora (a 0,50 abaixo do peitoril, como na alta, com as bolinhas mais leves). A em arco e a
    redonda altas não têm floreira, e as baixas seguem as altas; a lisa (entre cômodos) nunca tem;
  - redonda: a metade de baixo da vigia, com o centro no topo da parede cortada (o corte passa pelo
    meio dela): o vão quadrado de 0,75 ao topo com o tampão nos cantos de baixo, a metade do aro
    (que sobe até 1,02) e a metade do vidro, sem peitoril (a alta também não tem).
  O friso de 0,75 do lambri para embaixo da moldura (ou do aro), com a ponta escondida nela.
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

## Varanda da porta de entrada: contrato (31/10/2026)

Pedido dela: a porta de entrada da casa construída muda de lugar no Construir, e a varanda vai
junto. A varanda do `casa.glb` (`arte/mundo/casa.py`) é fixa na frente do quarto; a do kit é a
mesma, peça por peça, no referencial das peças de parede.

- **`casa-varanda.glb`**, nós `varanda` (o deque de 8 tábuas com as vigas, o degrau, as duas
  colunas com as bases, o lampião ao lado da porta, material `lampiao` com emissão, e os dois
  vasinhos) e `varanda-toldo` (o toldo com o barrado de bandeirinhas). Os materiais e as cores são
  os da varanda do `casa.glb` (`deque`, `dequeEscuro`, `batente`, `acabamento`, `lampiao`,
  `metalEscuro`, `terracotta`, `copaClara`, `telhado`).
- **Origem:** no meio da porta, na linha da grade, em z = 0 (o topo do piso); o lado de fora é o -Y
  local (a fachada do lambri). Vai com a MESMA posição e giro da parede da porta de entrada (a
  `parede-porta-lambri`). O deque vai de 0,20 a 1,75 da linha (o alicerce do lambri chega a 0,19) e
  de -2,1 a 2,1 em x; o degrau passa 0,17 da segunda fileira de células, como na casa de antes. No
  jogo ela ocupa 5 células ao longo da parede (a porta e uma de cada lado) e 2 de fundo, e as 5
  arestas da linha da porta são parede (o lampião, em x = -1,65, fica na parede ao lado da porta).
- **Toldo:** a mesma origem e giro; o jogo esconde o `varanda-toldo` junto com o telhado (no
  Construir e com a pessoa dentro de casa). No `casa.glb` o toldo virou o nó próprio `toldo` (antes
  ia dentro do `telhado`), para a casa construída tirar a varanda e o toldo da casa de antes.
- **Colisores** (nós de primeiro nível no referencial da peça, como os do segundo andar):
  `col-varanda-deque` (o tampo, de -0,05 a 0,05), `col-varanda-degrau`, `col-varanda-coluna-1` e
  `-2` e `col-varanda-vaso-1` e `-2`. São os mesmos de `COLISORES_DA_VARANDA` em
  `src/sistemas/construcao/pecas.ts` (o jogo põe pelo código; `tests/casa-varanda.test.ts` confere
  que são iguais). Só seguram o corpo (`col-varanda-` em `SO_PARA_O_CORPO`).
- Teto: os do kit novo (até 10 mil triângulos por peça e 450 KB). A varanda ficou num arquivo
  próprio: o `casa-paredes.glb` está a 4 KB do teto.

## Segundo andar: contrato (pedido E04, 31/10/2026)

Tudo no referencial do térreo (z = 0 é o piso de baixo). O telhado de cima é o de sempre deslocado
4,10 em z (a altura do piso de cima); as paredes de cima são as do `casa-paredes-andar.glb` (abaixo),
já na altura certa.

**Peças do andar de cima, em resumo:**

| Para | Peça | Onde vem |
|---|---|---|
| piso | `piso-andar-tabua`, `-ladrilho`, `-azulejo` | `casa-andar.glb` |
| escada | `escada-interna` | `casa-andar.glb` |
| vão da escada no meio da sala | `piso-andar-vao` (guarda-corpo nos três lados) | `casa-andar.glb` |
| vão da escada encostada na parede | `piso-andar-vao-parede` (sem o lado +x) | `casa-andar.glb` |
| beira do piso sem parede | `guarda-corpo-andar` | `casa-andar.glb` |
| paredes | o nome da parede de baixo + `-andar` (lambri e lisa, cheias, cortadas, com janela e com porta) | `casa-paredes-andar.glb` |
| quinas | `quina-lambri-andar`, `quina-lisa-andar` e as `-baixa-andar` | `casa-paredes-andar.glb` |
| folha da porta | `porta-interna` (na lisa) ou `porta` (no lambri) de sempre, com z = 4,10 | `casa-portas.glb` |
| telhado | as peças de sempre, com 4,10 a mais em z | `casa-telhado.glb` |

- **Pisos de cima** (`piso-andar-tabua`, `-ladrilho`, `-azulejo`): os pisos da casa subidos: 1 × 1,
  origem no meio da célula (em z = 0), topo em 4,10 e 10 cm de espessura (de 4,00, o topo das
  paredes de baixo, a 4,10). Vão até a linha da grade, por cima das paredes de baixo; a face de
  baixo é o forro (`telhadoForro`), o teto do cômodo de baixo. Sem colisor no arquivo: a caixa da
  célula, de 4,00 a 4,10, como o jogo já monta as paredes em `pecas.ts`.
- **`escada-interna`:** 1 × 4. Origem no meio do pé da escada, na linha da grade, subindo para +Y
  (no jogo, para -z): ocupa x de -0,5 a 0,5 e y de 0 a 4. 14 degraus de 0,293 de espelho e 0,286 de
  piso, de 0 a 4,10; o 14º degrau é o próprio piso de cima (de y = 3,71 a 4,00), e o piso de cima
  continua de y = 4 em diante. Os lados ficam a 0,39 do meio (encostada numa parede do kit, sobra
  1 cm até a face dela); o corrimão fica do lado -x (até 0,395 do meio). Por baixo, uma laje
  inclinada de forro.
  - Colisores (`col-escada-reta-*`, só para o corpo: a câmera passa, como a escada do Bosque):
    `-1` é uma rampa de 45,7° (o corpo sobe até 52°) 0,1 acima da reta dos cantos de dentro dos
    degraus, do pé até a beira do piso de cima; `-2` a `-14` são caixas embaixo dela (sempre 5 cm
    abaixo, sem encostar no corpo) que fecham o vão de baixo da escada; `-15` é a faixa do último
    degrau, em 4,10. Por que rampa: o degrau de 0,286 de piso é estreito demais para o degrau
    automático do controlador (ele pede 0,25 livre em cima, além do corpo), e com uma caixa por
    degrau a cápsula para no primeiro.
  - Âncoras do modo escada (`escada.ts`), como as do Bosque: `escada-1-base` (0; 0; 0), no pé;
    `escada-1-topo` (0; 4,0; 4,10), na beira do piso de cima; `escada-1-saida` (0; 4,7; 4,10), 0,7
    dentro do piso de cima (no jogo: (0; 0; 0), (0; 4,1; -4), (0; 4,1; -4,7)). No modo, o corpo vai
    pela reta da base ao topo, 0,47 para trás dela, uns 0,19 acima dos focinhos dos degraus.
  - Andando, o corpo sobe pela rampa; com as âncoras registradas, andar contra o pé pega o modo
    escada. As duas coisas estão no teste.
- **`piso-andar-vao`:** o vão da escada no piso de cima, com a MESMA posição e giro da
  `escada-interna` (1 × 4, de y = 0 a 4). Não tem piso: tem a faixa de acabamento que cobre a beira
  dos pisos vizinhos (de 3,95 a 4,13) e o guarda-corpo nos três lados abertos (os dois compridos,
  de 0,43 a 0,495 do meio, e o do pé, de y = 0,005 a 0,07); o quarto lado é onde a escada chega.
  Colisores `col-guarda-vao-1` (lado -x), `-2` (+x) e `-3` (pé), de 4,00 a 5,10. Entre os dois
  compridos ficam 0,84 livres: a cápsula (0,70 mais a folga do controlador) passa com 1 cm de cada
  lado subindo reto. O guarda-corpo comprido ocupa a faixa de dentro da célula: com a escada
  encostada numa parede, use o `piso-andar-vao-parede`.
- **`piso-andar-vao-parede`** (31/10/2026): o mesmo vão, com a mesma posição e giro da escada, mas
  **sem o guarda-corpo do lado comprido +x local** (x = +0,5, à direita de quem sobe; o corrimão
  da escada fica do outro lado, em -x). A parede vai na linha x = +0,5 da peça (no giro 0, a linha
  à direita da escada). No lugar do guarda-corpo, uma faixa de acabamento de 0,355 a 0,49 (de 3,98
  a 4,12) cobre, do lado do vão, a linha entre a parede de baixo e a de cima e segura por baixo o
  rodapé da parede de cima; o guarda-corpo do pé vai até ela. Colisores `col-guarda-vao-parede-1`
  (lado -x) e `-2` (pé, até 0,40). Para a escada encostar numa parede à esquerda de quem sobe,
  gire escada e vão 180° com o pé na outra ponta (o corrimão fica sempre do lado aberto).
- **`guarda-corpo-andar`:** 1 de largura e 1,0 de altura (o corrimão em 0,99, 1 cm abaixo do topo
  da parede cortada, para não ficarem no mesmo plano onde se encontram; o colisor vai até 1,0),
  para a beira do piso de cima sem parede. Como a parede: origem no meio da base, na linha da
  grade, em z = 0, e o +Y local é o lado do piso (o guarda-corpo fica de 0,02 a 0,10 da linha, em
  cima do piso); mesmos giros da parede. Vizinhos encostam as pontas de costas um para o outro;
  numa parede no fim da fileira, a ponta entra nela (como num T). Colisor `col-guarda-andar-1`.
- Os colisores e as âncoras vão como nós de primeiro nível do arquivo, no mesmo referencial das
  peças (todas na origem), como nas ilhas: quem põe a peça põe os dela com a mesma posição e giro.
  Os nomes dizem de quem são: `col-escada-reta-*` e `escada-1-*` da escada, `col-guarda-vao-1` a
  `-3` do vão, `col-guarda-vao-parede-*` do vão na parede, `col-guarda-andar-1` do guarda-corpo.
  Com mais de uma escada, o jogo renumera as âncoras.
- **Paredes do andar** (`casa-paredes-andar.glb`, 31/10/2026): as mesmas paredes de baixo, com o
  nome + `-andar` e a MESMA posição e giro da parede de baixo (z = 0: a altura já vem na peça). O pé
  fica no topo do piso de cima (4,10) e o alto em 8,10 (o telhado de cima vai com 4,10 a mais). O
  lambri não tem alicerce nem rodapé de fora; no lugar, uma **cinta** branca de 3,955 a 4,17 cobre
  por fora a linha entre a parede de baixo (até 4,00) e a de cima, 5 mm acima do friso de cima da de
  baixo (no mesmo plano dele, piscaria), sem fresta. Por dentro, o piso de cima (de 4,00 a 4,10) tapa a linha. Como a de cima
  começa 10 cm acima do topo da de baixo, qualquer parede de cima emenda em qualquer de baixo sem
  emenda em T (janela sobre parede cheia, parede sobre porta). Peças: `parede-lambri-andar`,
  `parede-lambri-baixa-andar`, `parede-janela-grande-lambri-andar`, `parede-janela-arco-lambri-andar`,
  `parede-janela-redonda-lambri-andar`, `quina-lambri-andar` (pilar de 0,36, 1 cm mais largo que o de
  baixo, de 3,96 para cima, por fora do topo da quina de baixo), `quina-lambri-baixa-andar`, e as
  `lisa` correspondentes, com `parede-porta-lisa-andar` e `parede-porta-lisa-baixa-andar` (a folha
  `porta-interna` vai com z = 4,10). A lisa não tinha alicerce, mas a versão de andar começa
  também em 4,10 (em cima do piso), pelo mesmo motivo das emendas.
- **Porta de lambri do andar** (31/10/2026, B7c): `parede-porta-lambri-andar` e
  `parede-porta-lambri-baixa-andar`, a porta do cômodo de cima para o piso aberto (o lambri, -Y,
  fica do lado do piso aberto, como a de baixo fica do lado de fora). O molde é a
  `parede-porta-lambri` do térreo e as portas lisas do andar: três células, o vão de 2,2 × 3,0, o
  batente, a soleira (de 4,10 a 4,13) e a cornija por fora; sem alicerce nem degrau de pedra, com a
  cinta, que para no vão (a ponta dela entra no batente). A folha é a `porta` do `casa-portas.glb`,
  com a mesma posição e giro e z = 4,10. Nunca dá para fora da casa: o jogo só põe porta no andar
  com piso dos dois lados.

## Café, banca de feira e festas: contrato (31/10/2026)

O mesmo contrato dos móveis (abaixo): base em z = 0, centrados na célula, frente para -Y, peça de
parede centrada com o fundo em y = +0,10. Nomes de nó em português, minúsculos, com hífen. Os do
café usam as cores da casa e da Vila Doce (rosa e creme) com os mesmos nomes de material de
`arte/ilhas/lib_ilhas.py` (`toldoRosa`, `toldoBranco`, `baunilha`, `chocolate`, `menta`,
`casquinha`, `madeiraDoce`, `confeito`, `farinha`). A vitrine usa o `vidroArmario` (o translúcido
da casa); a placa da banca, `placaFace` (para o jogo escrever, como as barracas das festas). O
caixote empilha: o próximo vai 0,32 acima.

Nas festas, as peças de parede que se emendam (bandeirinhas, serpentina e varal de luz) têm 1,0 com
as pontas do fio em x = ±0,5: lado a lado, o fio continua (na célula do canto, a quina passa na
frente da ponta). O que acende tem emissão, como a luminária: `luz` (lâmpadas, chamas das
lanternas), os papéis `lanternaAmarela` e `lanternaRosa`, `fogo` e `brasa` (fogueira) e `estrela`.
Tetos: até 1.500 triângulos por peça (3 mil na árvore); no café, até 10 mil; arquivo até 450 KB.

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
- `vidroArmario`: único material translúcido (alfa 0,32, BLEND), para ver a louça no armário alto e
  os doces na vitrine do café.
- `telhadoForro`: a face de baixo dos pisos de cima e a laje de baixo da escada (o forro).
- `placaFace`: a face lisa da placa da banca de feira, para o jogo escrever.
- Festas: `luz`, `lanternaAmarela`, `lanternaRosa`, `fogo`, `brasa` e `estrela` saem com a emissão
  ligada (os nomes e as cores de `arte/festas/lib_festas.py`); o jogo acende à noite.
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
(o `build_all.py` já roda; `tests/faces-coplanares.test.ts` cobre `casa-andar`, `casa-cafe` e
`casa-festas`, `casa-paredes-andar` e `casa-paredes`, e a varanda montada na casa construída) e, nas cenas
montadas, o mesmo sem `--separados` (`CENAS=1`, com as cenas `andar`, `andar-parede`, `andar-porta`, `cafe-festas`,
`janela-baixa` e `varanda`). Na cena da cozinha, o fogão a lenha de `arte/itens` acusa pares só dele (lenha,
fogo e chapa); as peças daqui não acusam nada.

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
- **Lote da cabana no Bosque:** feito em 28/10/2026. O Bosque cresceu para o lado de fora (a ponta
  de campo do −x do modelo), e o lote fica lá, de x −18 a −12 e de z −4 a 4 (6 × 8 células), plano,
  sem nada que colida e de céu aberto, com as âncoras `lote-cabana-a` e `lote-cabana-b` nos cantos
  (README de `arte/ilhas`).
- **Grama e pedra do quintal:** o topo fica na altura do chão da ilha, como diz o contrato acima,
  e por isso o jogo sobe as duas 1 cm (`ACIMA_DO_TERRENO` em `mundo/obra.tsx`) para não piscar contra
  o terreno.

## Testes

- `tests/casa-andar.test.ts`: pisos de cima, escada (degraus, colisores e âncoras), vão e
  guarda-corpo, e a cápsula real do corpo (`CORPO`, com o controlador do Rapier do personagem)
  subindo a escada contra os colisores do GLB, andando e no modo escada, até o piso de cima, com o
  `piso-andar-vao` e com o `piso-andar-vao-parede` encostado numa parede. A sala de `andar_na_parede`
  (`cenas.py`) montada no three.js com as paredes do andar: nenhuma face coplanar nem emenda em T, e
  raios de fora na linha do piso batem na cinta (sem fresta). As paredes do andar sem alicerce.
- `tests/casa-cafe-e-festas.test.ts`: nós, medidas pedidas (±5 cm), contrato de chão e de parede,
  triângulos, 450 KB, emissão do que acende, o vidro da vitrine, a placa da banca e as miniaturas.
- `tests/janela-baixa.test.ts` (31/10/2026): lê o `casa-paredes.glb` e confere os seis nós das
  janelas baixas, a altura (a da parede cortada da família, ± 2 cm, sem contar a floreira), a
  largura e a origem da janela alta, o vidro no alto, a floreira por fora no lambri onde a alta tem,
  as pontas só com os vértices da parede cortada vizinha e, montadas como a cena `janela-baixa`, ao
  lado de paredes baixas, altas, janelas altas e quinas, nenhuma face coplanar nem emenda em T.
- `tests/casa-varanda.test.ts` (31/10/2026): lê o `casa-varanda.glb` e confere os nós, os
  materiais (as cores da varanda do `casa.glb`), o lampião com emissão, os tetos (também no
  relatório), o mesmo desenho da varanda e do toldo do `casa.glb` (caixas e triângulos, deslocados
  do meio da porta nova), as células que ela ocupa e os colisores iguais aos de `pecas.ts`. As
  faces coplanares da varanda com o kit, os telhados e o chão, em quatro entradas, ficam no teste
  "a casa construída, entrada ..." de `tests/faces-coplanares.test.ts`.
- `tests/miniaturas.test.ts` e `tests/faces-coplanares.test.ts` (os arquivos de 31/10/2026). As
  peças do andar não têm miniatura: não aparecem como escolha no Construir (o jogo põe sozinho).

## Peças

Tamanho = largura × altura × fundo, em unidades do jogo. Triângulos por nó; o tamanho em KB é do
arquivo inteiro.

### `casa-paredes.glb` (10.076 triângulos, 446 KB)

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
| `parede-janela-grande-lambri-baixa` | 3 | 3,00 × 1,32 × 0,70 | 1.160 |
| `parede-janela-arco-lambri-baixa` | 2 | 2,00 × 1,32 × 0,49 | 160 |
| `parede-janela-redonda-lambri-baixa` | 1 | 1,00 × 1,32 × 0,33 | 360 |
| `parede-janela-grande-lisa-baixa` | 3 | 3,00 × 1,12 × 0,49 | 168 |
| `parede-janela-arco-lisa-baixa` | 2 | 2,00 × 1,12 × 0,49 | 136 |
| `parede-janela-redonda-lisa-baixa` | 1 | 1,00 × 1,12 × 0,30 | 336 |

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

### `casa-andar.glb` (3.842 triângulos, 167 KB)

| Nó | Lugar | Tamanho | Triângulos |
|---|---|---|---|
| `piso-andar-tabua` | 1 × 1, topo em 4,10 | 1,00 × 0,10 × 1,00 | 146 |
| `piso-andar-ladrilho` | 1 × 1, topo em 4,10 | 1,00 × 0,10 × 1,00 | 74 |
| `piso-andar-azulejo` | 1 × 1, topo em 4,10 | 1,00 × 0,10 × 1,00 | 156 |
| `escada-interna` | 1 × 4, origem no meio do pé | 0,78 × 5,17 × 4,00 (degraus até 4,10; o corrimão até 5,17) | 726 |
| `piso-andar-vao` | 1 × 4, a posição da escada | 0,99 × 1,14 × 4,00 (de 3,95 a 5,09) | 1.620 |
| `guarda-corpo-andar` | 1 célula, na linha | 1,00 × 1,00 × 0,08 (os postes entram 1 cm no piso; corrimão até 5,09) | 232 |
| `piso-andar-vao-parede` | 1 × 4, a posição da escada | 0,99 × 1,14 × 4,00 (de 3,95 a 5,09) | 888 |

Colisores: `col-escada-reta-1` a `-15`, `col-guarda-vao-1` a `-3`, `col-guarda-andar-1`,
`col-guarda-vao-parede-1` e `-2`. Âncoras: `escada-1-base`, `escada-1-topo`, `escada-1-saida`.

### `casa-paredes-andar.glb` (7.518 triângulos, 323 KB)

Altura contada do pé da cinta (3,955) ou da quina (3,96); a parede em si vai de 4,10 a 8,10.

| Nó | Células | Tamanho | Triângulos |
|---|---|---|---|
| `parede-lambri-andar` | 1 | 1,00 × 4,15 × 0,30 | 110 |
| `parede-lambri-baixa-andar` | 1 | 1,00 × 1,15 × 0,29 | 32 |
| `parede-janela-grande-lambri-andar` | 3 | 3,00 × 4,15 × 0,70 | 3.064 |
| `parede-janela-arco-lambri-andar` | 2 | 2,00 × 4,15 × 0,49 | 624 |
| `parede-janela-redonda-lambri-andar` | 1 | 1,00 × 4,15 × 0,30 | 688 |
| `quina-lambri-andar` | ponto | 0,36 × 4,18 × 0,36 | 106 |
| `quina-lambri-baixa-andar` | ponto | 0,36 × 1,18 × 0,36 | 106 |
| `parede-lisa-andar` | 1 | 1,00 × 4,00 × 0,28 | 64 |
| `parede-lisa-baixa-andar` | 1 | 1,00 × 1,00 × 0,28 | 24 |
| `parede-porta-lisa-andar` | 3 | 3,00 × 4,00 × 0,34 | 242 |
| `parede-porta-lisa-baixa-andar` | 3 | 3,00 × 1,02 × 0,34 | 134 |
| `parede-janela-grande-lisa-andar` | 3 | 3,00 × 4,00 × 0,49 | 384 |
| `parede-janela-arco-lisa-andar` | 2 | 2,00 × 4,00 × 0,49 | 548 |
| `parede-janela-redonda-lisa-andar` | 1 | 1,00 × 4,00 × 0,30 | 632 |
| `quina-lisa-andar` | ponto | 0,30 × 4,08 × 0,30 | 106 |
| `quina-lisa-baixa-andar` | ponto | 0,30 × 1,08 × 0,30 | 106 |
| `parede-porta-lambri-andar` | 3 | 3,00 × 4,15 × 0,39 | 394 |
| `parede-porta-lambri-baixa-andar` | 3 | 3,00 × 1,17 × 0,34 | 154 |

### `casa-varanda.glb` (1.142 triângulos, 65 KB)

| Nó | Origem | Tamanho | Triângulos |
|---|---|---|---|
| `varanda` | meio da porta, na linha da grade | 4,30 × 3,59 × 2,06 | 982 |
| `varanda-toldo` | a mesma | 4,80 × 0,80 × 1,91 | 160 |

Colisores: `col-varanda-deque`, `col-varanda-degrau`, `col-varanda-coluna-1` e `-2`,
`col-varanda-vaso-1` e `-2`.

### `casa-cafe.glb` (12.800 triângulos, 382 KB)

| Nó | Footprint | Tamanho | Triângulos |
|---|---|---|---|
| `cafe-mesa-redonda` | 1 × 1 | 0,80 × 0,75 × 0,80 | 640 |
| `cafe-cadeira` | 1 × 1 (assento a 0,50) | 0,44 × 0,93 × 0,44 | 1.316 |
| `cafe-balcao` | 2 × 1 | 1,80 × 1,00 × 0,68 | 1.050 |
| `cafe-vitrine-doces` | 1 × 1, de encostar | 0,92 × 1,26 × 0,66 | 4.210 |
| `cafe-lousa-cardapio` | parede | 0,80 × 0,60 × 0,06 | 492 |
| `cafe-banca-feira` | 2 × 1 | 1,80 × 2,00 × 0,86 | 4.854 |
| `cafe-caixote` | 1 × 1, empilha a cada 0,32 | 0,61 × 0,32 × 0,40 | 238 |

### `casa-festas.glb` (12.606 triângulos, 344 KB)

| Nó | Lugar | Tamanho | Triângulos | Acende |
|---|---|---|---|---|
| `festa-junina-bandeirinhas` | parede, emenda | 1,00 × 0,24 × 0,06 | 430 | |
| `festa-junina-lanterna-papel` | parede (braço de ferro) | 0,31 × 0,54 × 0,45 | 1.308 | `lanternaAmarela`, `luz` |
| `festa-junina-fogueira` | 1 × 1 | 0,76 × 0,71 × 0,74 | 1.052 | `fogo`, `brasa` |
| `festa-carnaval-serpentina` | parede, emenda | 1,00 × 0,57 × 0,10 | 1.212 | |
| `festa-carnaval-mascara` | parede | 0,69 × 0,43 × 0,23 | 992 | |
| `festa-carnaval-confete` | 1 × 1 (no chão, sem fundo) | 0,88 × 0,004 × 0,87 | 892 | |
| `festa-fim-de-ano-arvore` | 1 × 1 | 0,84 × 1,76 × 0,86 | 2.740 | `luz`, `estrela` |
| `festa-fim-de-ano-guirlanda` | parede | 0,50 × 0,58 × 0,12 | 1.372 | |
| `festa-fim-de-ano-estrela-janela` | parede (ventosa) | 0,32 × 0,49 × 0,13 | 228 | `estrela`, `luz` |
| `festa-lanternas-lanterna-chao` | 1 × 1 | 0,52 × 0,97 × 0,51 | 1.440 | `lanternaRosa`, `luz` |
| `festa-lanternas-varal-de-luz` | parede, emenda | 1,00 × 0,14 × 0,06 | 940 | `luz` |

**Total:** 12 arquivos, 91.768 triângulos, 3,05 MB (do `relatorio.json` de 31/10/2026).
