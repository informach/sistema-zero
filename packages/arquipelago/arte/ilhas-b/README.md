# Ilhas completas, segunda metade (Blender)

Pico Gelado, Vale dos Dinos, Ilha das Nuvens e o alto do Farol, feitos no Blender sem tela (o mesmo
`bpy` do mundo), e dois lugares de exploração: a caverna de cristal do Pico e as constelações das
Nuvens. Cada script grava GLBs em `src/assets/ilhas/`. Bosque, Vila Doce e Recife moram em
`arte/ilhas/`, com as mesmas convenções.

## Rodar

```sh
# tudo, com a conferência do contrato (nós, âncoras, clipes, tetos) e o relatorio.json
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/build_all.py

# um script só (pico.py e nuvens.py aceitam ilha | props | treno | balao no fim)
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/pico.py ilha

# prévias em Cycles numa pasta qualquer (pico vale nuvens alto alto-escada balao)
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/render.py /tmp/previas pico
```

`ILHAS_OUT=/outra/pasta` grava os GLBs em outro lugar.

## Convenções

- **Ajudantes:** `lib_ilhas_b.py` lê o `lib_mundo` (paleta, formas, `_juntar`) e o
  `ilhas_anel.py` (o chão da ilha leve), sem copiar. O `relatorio.json` é próprio desta pasta.
- **Mesmo tamanho da versão leve:** cada ilha usa o mesmo chão da leve, com a mesma semente e o
  mesmo contorno. O tampo é plano em y = 1 até ~12,5 de raio, e a completa troca a leve sem mudar de
  tamanho. A montanha e o vulcão sobem do tampo. Os colisores continuam no código.
- **Referencial:** o centro da ilha, com y = 0 no mar. A Ilha das Nuvens fica num grupo a y = 7 no
  jogo. O alto do Farol é uma sala: o centro fica no meio do piso, com y = 0 no piso.
- **Chegada da ponte:** é o +x de cada ilha. O jogo gira o nó como faz com as leves. O corredor
  x > 5,5 e |z| < 2,5 fica livre na altura do corpo, e `conferir_corredor` reprova o build se
  algo cair ali.
- **Materiais:** o jogo acha cada material pelo nome.
  - Acendem à noite: `lava`, `luz`, `lanterna`, `chama`, `estrela` e os `fio1` a `fio6`, que têm
    um brilho baixo.
  - Transparentes: `janelaFarol`, `lenteFarol`, `gelo` e `geloClaro`.
- **Nomes:** nenhum nó tem o nome de uma âncora (o three.js renomearia para `nome001`), e o build
  confere isso.
- **Faces sobrepostas:** caminhos que se cruzam ficam em alturas um pouco diferentes. Faces no
  mesmo plano piscam no jogo e saem pretas no render.

## Arquivos, nós e âncoras

As âncoras são nós vazios: o jogo lê a posição de cada uma. Todas as ilhas têm `chegada` (na
borda do +x), `morador` e `lumi-1` a `lumi-4`.

| Arquivo | Nós | Âncoras próprias | Clipes | Triângulos | Tamanho |
|---|---|---|---|---|---|
| `pico.glb` | `chao`, `montanha` (com a trilha cavada e o platô do cume), `cenario`, `treno-desenho` (o trenó no platô, origem na base dele), `telhado-iglu` (a cúpula oca do iglu com o vestíbulo, que o jogo esmaece, fase3-08), `caverna` e `caverna-joia` (a caverna de cristal, fase3-07) e 172 `col-*` mais o `col-terreno` (os da caverna com `caverna` no nome) | `palco` (no tablado), `iglu` (na porta), `trilha-inicio`, `trilha-fim`, `cume` (meio do platô), `parede-de-gelo` (no pé), `topo-da-parede`, `lago-congelado`, `treno` (o trenó no platô), `treno-curva-1` a `-26` (a descida, do trenó ao começo da trilha, no chão dela), `subida-1` a `-4` (as paradas da subida ao cume), `floco-1` a `-5` (os flocos, no chão da trilha), `caverna-entrada`, `caverna-galeria`, `caverna-laguinho`, `caverna-degrau-1` a `-4`, `cristal-raro`, `iglu-dentro`, `fogareiro`, `instrumento-xilofone`/`-violao`/`-bateria` (onde cada um se perdeu), `banda-*` e `musico-*` (o lugar do instrumento e do pinguim no palco) | | 30.547 | 1.168 KB |
| `pico-props.glb` | `pinheiro-nevado-a`, `pinheiro-nevado-b`, `bloco-de-gelo`, `boneco-de-neve`, `painel-de-gelo` (base em y = 0) | | | 3.300 | 96 KB |
| `pico-treno.glb` | `treno` (frente para −z do jogo) | | | 668 | 33 KB |
| `vale-dos-dinos.glb` | `chao`, `vulcao`, `lava` (cratera, rios e poças), `cenario` e 61 `col-*` mais o `col-terreno` | `observatorio` (na porta), `varanda` (do observatório), `escavacao`, `ninho-1` a `ninho-3`, `cratera`, `pe-do-vulcao` | | 22.500 | 626 KB |
| `vale-dos-dinos-props.glb` | `samambaia-gigante`, `cavalinha`, `ninho`, `ovo-dino`, `osso`, `cranio-fossil` | | | 4.278 | 100 KB |
| `nuvens.glb` | `chao`, `cenario`, `fio-1` a `fio-6`, `plataforma-1` a `plataforma-4` e 49 `col-*` mais o `col-terreno` | `tear`, `ninho` (dentro do ninho, no alto da árvore), `pe-da-arvore`, `balao` (a 1,9 m do poste da corda), `arco-iris`, `mirante` (no deque da luneta), `topo-plataforma-1` a `-4` | | 19.560 | 471 KB |
| `nuvens-balao.glb` | `balao` (base do cesto em y = 0) | `passageiro` (piso do cesto, filha de `balao`) | `flutuar` (3 s, laço) | 848 | 36 KB |
| `alto-do-farol.glb` | `sala`, `escada`, `mesa-da-iris`, `vidros`, `lente` (pivô no centro da lâmpada) | `entrada` (onde a escada chega), `lanterna`, `mesa`, `rascunhos`, `quadro`, `janela`, `varanda` | `girar` (4 s, uma volta, laço) | 14.436 | 479 KB |
| `pico-caverna.glb` | `rocha`, `chao`, `cristais`, `cristais-luz`, `gelo`, `percurso`, `joia` e 49 `col-*` | `entrada`, `galeria`, `laguinho`, `degrau-1` a `-4`, `cristal-raro` | | 6.796 | 355 KB |
| `nuvens-constelacoes.glb` | `mirante`, `luneta-tubo`, `constelacao-1` a `-6` (cada uma com as filhas `constelacao-N-estrela-M`, 57 estrelas) e 16 `col-*` | `luneta`, `quadro-das-estrelas` | | 4.646 | 240 KB |
| **total das ilhas** | | | | **86.619** | **2,38 MB** |

### O que o jogo pode ligar

- **Pico (29/10/2026, aj-ligar-01):** a montanha tem 12 m, e o cume é um platô plano de uns 5 m
  de diâmetro (o `cume`, com o mastro no meio). A trilha é um corte em espiral na encosta (boolean
  de um sólido varrido, `cavar_trilha`): dá 1,25 volta no sentido horário, pelo lado do iglu, do
  `trilha-inicio` (a um degrau do chão) ao platô, sempre na mesma rampa (18°). O chão do corte tem
  uns 1,5 a 1,9 m entre a parede de rocha de dentro e a beira da encosta. A encosta (66°) não se
  sobe; os postinhos com corda da beira têm o guarda-corpo invisível `col-guarda-trilha-*` entre
  eles. A colisão vem toda do arquivo: o `col-terreno` (chão, montanha cortada e montinhos de
  neve) e os colisores das peças (o iglu oco, palco com os degraus de 0,15 e 0,30,
  painéis e topo da parede de gelo, trenó, pinheiros, bonecos, blocos, postes). Teste:
  `tests/colisores-do-pico.test.ts` (busca em grade da chegada ao platô). A parede de gelo tem três
  painéis em degraus, e no alto dela fica o platô do `topo-da-parede`.
- **O iglu por dentro (fase3-08, 29/10/2026):** a cúpula (raio 2,9, 2,76 de altura, parede de
  0,3) é oca e tem a porta em arco virada para o meio da ilha (meia-largura 0,75, lados retos até
  1,45 e o arco a 2,2), com o vestíbulo de 1,2 m na frente; lá dentro, o tapete, o fogareiro aceso
  (`brasa`, que brilha sempre) com a panela de chocolate no fundo, e dois bancos de gelo
  (`col-banco-N`, onde se senta) dos lados, perto da porta, virados para o meio. O xilofone perdido
  fica no fundo, à esquerda: chegando de frente em cada um (xilofone, fogareiro, banco), o botão do
  jogo é o daquele, não o do lado (`DENTRO_DO_IGLU`; o teste confere). A cúpula, as juntas e o vestíbulo são o nó `telhado-iglu`, que o jogo esmaece
  quando fica entre a câmera e a criança. O anel `col-parede-iglu` (24 pedaços de 2,0 a 3,0 do
  meio, menos os que invadem o corredor da porta) e os lados grossos do vestíbulo seguram o corpo
  onde a cúpula ainda passa da cabeça: o teste em grade confere que, de tudo que se alcança lá
  dentro, nada fica com a cabeça acima da cúpula ou do arco (`tests/colisores-do-pico.test.ts`).
  O iglu foi para (3,4; 7,6), longe da parede de gelo e dos pinheiros, e o caminho de neve vai até
  a porta. A banda: o xilofone perdido fica dentro do iglu, o violão na beira do lago congelado e a
  bateria no platô do cume, do outro lado da boca da trilha; no palco, `banda-*` e `musico-*`
  ficam em cima do tablado (o Floco no meio).
- **Vale:** o nó `lava` pode pulsar o brilho, e a fumaça fica no `cenario`. As pegadas de dino vão
  da ponte até o observatório. Colisão (29/10/2026, aj-ligar-01): o vulcão entra no `col-terreno`
  (as encostas não se sobem; o facetado deixa subir uns 0,8 m no pé, e a cratera fica a 6,5 m); o
  observatório é fechado (torre, varanda e cúpula, com os degraus da frente); a cerca da escavação
  segura quem anda (`col-guarda-cerca-*`), com a entrada entre o 5º e o 6º postes, e o crânio e as
  costelas do esqueleto seguram o corpo; ninhos, samambaias e cavalinhas (`col-cil-moita-*`, a
  câmera passa), coqueiros, pedras e postes. O `lumi-4` e o `pe-do-vulcao` saíram da encosta.
  Teste: `tests/colisores-do-vale.test.ts`.
- **Nuvens:**
  - cada `fio-N` tem a cor do arco-íris e um material próprio (`fio1` a `fio6`): o jogo pode
    deixá-los cinza e acender um por vez;
  - as plataformas sobem em degraus atrás da ilha (−x, de 2,2 a 7,6 acima do tampo). Os degraus de
    nuvem da beira até a primeira estão no `cenario`;
  - o balão fica amarrado no poste do `balao`;
  - colisão (29/10/2026, aj-ligar-10): o `col-terreno` do chão que flutua, o tear (o quadro e o
    banquinho), a árvore do ninho (tronco, copas, o fundo do ninho que se pisa e a borda de palha,
    `col-guarda-ninho-*`), moitas de nuvem e copas (a câmera passa), os pés do arco-íris, os
    degraus de nuvem (`col-cil-degrau-nuvem-*`, que se sobem pulando: 0,9 do chão até o primeiro e
    0,6 de um para o outro) e o tampo de cada plataforma, `col-cil-plataforma-N`, no lugar do nó
    `plataforma-N`. As plataformas sobem 1,8 m de uma para a outra, mais que o pulo (1,5): são para o
    jogo mexer, e quem move o nó move o colisor do mesmo número. Teste:
    `tests/colisores-das-nuvens.test.ts`.
- **Alto do Farol:**
  - a `lente` gira com `girar`, e a `luz` é a lâmpada;
  - os `vidros` estão separados para o jogo poder trocar a transparência;
  - o vão da escada é um furo de verdade no piso, com o poço descendo 3,2 m.

## Lugares de exploração

Cada lugar é um GLB próprio, com a convenção das ilhas de `arte/ilhas`: malha de desenho, nós
`col-*` de colisão simples (caixa ou cilindro, sem material, o tamanho no TRS do nó) e âncoras
vazias. O `exportar` do `lib_ilhas_b.py` não grava colisores, então cada script tem o seu (com os
`col-*` e os grupos deles no `relatorio.json`), e o `build_all.py` confere os grupos. O teto dos
dois é de 12 mil triângulos e 512 KB.

### Caverna de cristal (`pico_caverna.py` → `pico-caverna.glb`)

- Um morro de rocha nevada (uma casca de pedra lapidada, com a neve em cima e pedras no pé) com a
  boca virada para +x: arco de pedra com neve, pingentes de gelo, cristais que acendem dos dois
  lados (chamam de longe) e a placa com o desenho do cristal. Uma ponta de neve de 2,6 m na frente
  da boca avança por cima da beira da ilha, 3 cm acima do tampo.
- O túnel desce numa rampa de 12° (de y = 1 até o chão da galeria em y = 0,4). A galeria é redonda
  (uns 10 m), com cachos de cristais grandes e pequenos nas paredes, no chão e no teto, estalactites
  de gelo e o laguinho congelado (borda de neve, gelo por cima e o fundo escuro).
- O percurso: quatro saliências de rocha em volta da parede, cada uma com uma capa de neve por cima,
  uma beira de geada e cachos de cristal nas bordas, subindo 0,65 m por degrau, com vãos de 0,6 a
  0,7 m, até a saliência maior do fundo (y 3,65), onde fica o cristal raro rosa no pedestal de gelo. Em cima de cada coluna e da laje a cabeça fica a
  pelo menos 0,35 m do colisor do teto; um pulo inteiro lá do alto encosta no teto, o que nenhum degrau exige.
- **Âncoras:** `entrada` (na boca, no chão em y = 1), `galeria` (o chão no meio), `laguinho`,
  `degrau-1` a `degrau-4` (o topo da neve de cada saliência) e `cristal-raro` (em cima da saliência
  do fundo, no pedestal).
- **Nós:** `cristais` (os que só brilham de leve) e `cristais-luz` (os que iluminam) separados, para
  o jogo regular o brilho; `joia` é o cristal raro com o pedestal, para sumir quando a criança pega.
- **Colisão:** `col-parede` (duas voltas de caixas por dentro da casca, uma embaixo e uma mais
  fechada no alto), `col-cil-teto`, `col-cil-chao`, `col-rampa`, `col-boca` (os lados e o alto do
  túnel), `col-cil-coluna` (as saliências), `col-cil-laje` (a do fundo), `col-cil-cristal` (os quatro cachos grandes do chão,
  menores que o desenho) e `col-cil-poste` (a placa). Os cristais miúdos, as estalactites e o gelo
  do laguinho não colidem.
- **Materiais pelo nome:** `cristal` (azul-claro, brilho suave de 0,25), `cristalLuz` (o que acende,
  força 1), `cristalRaro` (rosa, força 1), `rochaCaverna`, `rochaCavernaEscura`, `pedraLaje`,
  `madeiraPlaca`, mais os do Pico (`gelo`, `geloClaro`, `geloFundo`, `neve`, `neveSombra`,
  `neveTrilha`, `poste`). `gelo` e `geloClaro` são transparentes.
- **No Pico (fase3-07):** a mesma peça entra no `pico.glb` (`montar_caverna`), no lugar abaixo; o
  `pico-caverna.glb` avulso continua para a conferência.
- **Onde fica no Pico:** a boca em x −14,2, z −0,5, sem giro, atrás da montanha; o morro
  vai até x −28,5, por cima do mar. A ponta de neve chega em x −11,6, em cima do tampo, entre os
  pinheiros de (−11,2; −3) e (−10,5; 1,5); a placa fica em (−12; 1,5). Chega-se pela beira da ilha,
  passando atrás da montanha (a faixa entre o pé dela e a borda tem uns 1,3 m).

### Constelações das Nuvens (`nuvens_constelacoes.py` → `nuvens-constelacoes.glb`)

- Seis figuras do arquipélago: 1 a arara (a Iriê de perfil, com bico curvo, a asa aberta e o rabo
  comprido de duas penas), 2 o balão, 3 o vagalume (o Zappy, com a cauda que brilha), 4 o peixe, 5 o
  farol com o facho e 6 a nota musical (a colcheia, com a cabeça cheia de estrelas e a bandeirinha). Ficam em volta da ilha, de 16 a 26 m acima do tampo e a uns 30 m do mirante, cada uma
  virada para ele (de lá a figura aparece direita).
- Cada figura é um nó `constelacao-N` com as linhas (pivô no meio da figura) e cada estrela é um nó
  filho `constelacao-N-estrela-M`, com o pivô no meio da estrela: o jogo mostra a figura inteira ou
  acende uma estrela por vez. As estrelas são gordinhas, de cinco pontas, em três tamanhos (as
  principais maiores), e as linhas param antes delas.
- O mirante: deque redondo de madeira pousado em nuvenzinhas, com degrau, guarda-corpo de corda, a
  luneta grande de latão num tripé, o quadro azul com as seis figuras em pontinhos, um banquinho e o
  lampião. O tubo da luneta é o nó `luneta-tubo`, com o pivô no apoio do tripé: o jogo gira o nó
  para mirar a constelação (começa mirando a arara).
- **Âncoras:** `luneta` (onde se fica para olhar, atrás da ocular, no deque) e `quadro-das-estrelas`.
- **Colisão:** `col-cil-deque`, `col-degrau`, `col-guarda`, `col-cil-tripe`, `col-quadro`,
  `col-cil-banco` e `col-cil-poste`. As estrelas e as linhas não colidem.
- **Materiais pelo nome:** `estrela` (o mesmo amarelo que acende do observatório do Vale),
  `linhaConstelacao` (azul-claro, transparente 0,7, com um brilho baixo), `quadroEstrelas`, mais os
  das Nuvens (`madeiraTear`, `madeiraTearEscura`, `lunetaLatao`, `cupulaObservatorio`, `fio3`,
  `nuvem`, `nuvemAzulada`, `lanterna`, `lenteFarol`, `corda`, `metalEscuro`).
- **Onde fica nas Nuvens:** no mesmo referencial do `nuvens.glb` (o mesmo grupo a y = 7, sem
  deslocamento). O mirante fica em x −6, z −8, entre o tear e a beira da ilha, longe da nuvem de
  (−9,6; −5,5) e do pé do arco-íris; o degrau olha para o meio da ilha.
