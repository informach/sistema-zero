# Pedidos de arte para completar a entrega integral

## Situação atual: cinco portos recebidos

O commit remoto `080b6a3d2` entregou os cinco modelos, relatórios e provas da arte. Eles foram
integrados ao trabalho local em 30/10/2026, sem regeneração de GLB. A espera pelo chão foi
ampliada na direção dos deques e conferida contra todos os seus vértices. O pedido abaixo
fica preservado como especificação da entrega. Não resta pedido de arte destes cinco portos.
A rede ampliada e as boias estão implementadas no recorte L10 de 30/10, com plano e provas
em `docs/superpowers/plans/2026-10-30-arquipelago-rede-do-barco.md`.

Base conferida: staging `6461f19c0`, em 30/10/2026. Pedido derivado da leitura dos GLBs e do
plano `docs/superpowers/plans/2026-10-30-arquipelago-mapa-descoberto.md`. Esta sessão não altera
geradores nem GLBs. A dona encaminha a implementação à sessão de Blender.

## Prioridade 1: cinco pontos de embarque para a rede do barco

Faltam as âncoras de porto nos seguintes modelos:

| Ilha | Modelo de destino |
| --- | --- |
| Bosque dos Bichos | `packages/arquipelago/src/assets/ilhas/bosque.glb` |
| Vila Doce | `packages/arquipelago/src/assets/ilhas/vila-doce.glb` |
| Pico Gelado | `packages/arquipelago/src/assets/ilhas/pico.glb` |
| Vale dos Dinos | `packages/arquipelago/src/assets/ilhas/vale-dos-dinos.glb` |
| Ilha das Nuvens | `packages/arquipelago/src/assets/ilhas/nuvens.glb` |

Conservar os caminhos já consumidos pelo jogo, sem criar um modelo paralelo.

Em cada modelo, entregar:

1. Um deque visível com ligação caminhável ao terreno da ilha.
2. Empty `barco`, na posição de atracação na superfície do mar. Sua orientação deve apontar
   a proa local em +X, como no porto atual. Não é um barco estático novo dentro da ilha:
   o jogo reutiliza `ilhas/barco.glb` e o seu Empty `passageiro` já existente.
3. Empty `cais`, no ponto livre do tampo em que os pés ficam ao embarcar/desembarcar.
   Não colocar o ponto em estaca, guarda-corpo, corda ou malha decorativa.
4. Colisores simples `col-cais-*`, no padrão já lido pelo jogo. O tampo e o caminho até
   o terreno precisam ter apoio real. Evitar uma malha visual sem chão de colisão.
5. Uma aproximação do barco livre de pedras, pontes, cabos e elementos do deque. O motor
   atual trabalha com corredor de navegação de meia largura 5 m; a rota final será medida
   e testada no jogo, inclusive nas aberturas das boias.

Posição candidata no referencial local dos modelos: lado externo da ilha, próximo de
`x=-20, z=0`, oposto à chegada da ponte em `x=11,5..11,6`. É uma proposta de implantação,
não uma coordenada final medida. Ajustar para não atravessar caverna, escavação, árvores,
atrações ou caminhos. Registrar as coordenadas finais, em vez de assumir que todas as
ilhas aceitam a mesma posição. A superfície do mar usada pelo barco é `y=0` no mundo.

Para a passagem a pé, a cápsula tem raio 0,35 m, altura total 1,80 m e degrau automático
de 0,45 m. Referência editorial segura para a arte: faixa livre de pelo menos 1,5 m,
altura livre de 2,4 m e degraus de no máximo 0,30 m. Rampas devem ficar confortavelmente
abaixo dos 52 graus máximos do controlador. Estes valores são folgas propostas; o aceite
final usa os colisores exportados e a busca de caminho do jogo.

### Particularidade das Nuvens

O porto aquático fica junto ao mar e o terreno fica em torno de `y=8`. Entregar uma ligação
visível e segura entre `cais` e o terreno, com apoio contínuo, seguindo os limites acima.
A solução mais simples para esta entrega é um acesso fixo caminhável. Não adicionar
elevador, teleporte, plataforma animada ou novo modo de transporte sem um contrato próprio.
Se esse acesso comprometer a composição da ilha, devolver a alternativa com medidas antes
de exportar. A ponte existente não pode ser tratada como um cais na água.

## O que já existe e deve ser preservado

- Porto da ilha central: `mundo/pier.glb`, âncoras `barco` e `embarque`.
- Porto do Recife: `ilhas/recife.glb`, âncoras `barco` e `cais`.
- Barco: `ilhas/barco.glb`, Empty `passageiro` filho do nó animado `barco`.
- As quatro plataformas móveis das Nuvens e os seus tampos já foram entregues; não há
  novo pedido de arte para essa mecânica nesta revisão.
- Não remover ou renomear nós, colisores, clipes e materiais existentes. Conservar a
  origem, escala e rotação usadas pelo carregamento atual das ilhas.

## Entrega esperada da sessão de arte

Atualizar os geradores e exportações na máquina com Blender. Incluir os cinco GLBs,
os relatórios de arte e os seguintes dados no relatório de cada ilha:

- Coordenadas e rotação finais de `barco` e `cais`.
- Lista e limites dos novos colisores, inclinação/degraus do acesso e ponto de conexão ao terreno.
- Caixa ocupada pelo deque e trecho livre para a aproximação do casco.
- Diferença da caixa total da ilha, para recalcular o raio de espera/carregamento.
- No caso das Nuvens, o percurso completo entre o mar e o terreno elevado.

Depois dessa entrega, esta sessão liga a rede, mede as rotas, confere pontes/boias e testa
embarque, desembarque, colisão, pausa e carregamento no navegador. Um GLB exportado não
significa que a rede de barcos já esteja implementada.

## Outros lotes

Ainda não há um pedido de Blender suficientemente especificado para o catálogo de roupas,
as ampliações ou a terraformação de L11. Primeiro serão aproveitados o avatar e os módulos
existentes. Se a revisão desses trechos encontrar uma peça ausente, o pedido será acrescentado
a este documento com nome, medidas e finalidade. Não produzir modelos por suposição.
O fantasma familiar é gravação/reprodução do avatar existente e não exige personagem novo.

## Pedido do levantamento de 30/10: o lote do iglu no Pico (E04)

> **Histórico (31/10/2026):** entregue. O iglu, o andar de cima, o terreno e a subida do Farol
> entraram no B7 (`6ee28cb35`, `9e114f324`, merge `9511bac57`, sobras em `f2f441cf6`), com a obra
> estendida em documento próprio (migração 0023). Os pedidos abaixo ficam como registro.

A proposta põe "construir o iglu" no Pico. A cabana da ilha já é genérica (`CabanaDaIlha`, que
lê o lote das âncoras como a do Bosque). Os tetos do iglu saíram do salvamento na integração da
V20 (salvamento cheio): voltam num documento próprio do serviço quando este lote chegar. A busca no `pico.glb` atual (chão plano com variação de até 12 cm, nada
acima até 3 m, dentro do raio de 12 m) só achou a praça de chegada da ponte (x 6 a 11, z -2 a
3), onde uma construção fecharia a entrada da ilha.

Entregar em `packages/arquipelago/src/assets/ilhas/pico.glb`:

1. Uma clareira plana de pelo menos 5 × 5 m, fora do caminho da ponte, da subida ao cume, do
   palco do festival, da caverna e do iglu do Floco. Neve plana, sem pedra solta nem pinheiro.
2. Os Empty `lote-cabana-a` e `lote-cabana-b` em dois cantos opostos dela, na altura do chão
   (o jogo arredonda x e z para o metro e usa o y da âncora `-a` como piso).
3. Nada de colisor sobre a clareira até 3 m de altura; o caminho a pé até ela com as folgas do
   pedido dos portos (faixa de 1,5 m, degraus de até 0,30 m).

O aceite: um teste novo em `tests/cabana.test.ts` que confere o lote plano e livre contra os
colisores do modelo (o teste do Pico que esperava as âncoras saiu junto com o iglu na V20).

## Pedidos do levantamento de 30/10: o resto da criação avançada e a subida final (E04)

> **Histórico (31/10/2026):** entregue no B7 (ver a nota da seção anterior). A subida por fora
> leva ao final desde a revisão de 31/10 (N4, `c94c34139`), e os móveis valem no andar de cima
> (C3, `e2f151602`).

O código do jogo não desenha peça de construção nem colisor que falte na arte. Os três pedidos
abaixo destravam o que a proposta põe no Pico, nas Nuvens e na Lenda. Plano do lote:
`docs/superpowers/plans/2026-10-30-arquipelago-e04-criacao-avancada.md`.

### 1. Segundo andar da casa (Pico), no kit `arte/casa`

Entregar em `src/assets/casa/` (novo `casa-andar.glb` ou dentro dos GLBs existentes, uma peça por
nó, com as mesmas regras do README de `arte/casa`: grade de 1, parede de 4,0, sem faces
coplanares, sem emenda em T):

1. `piso-andar-*` (tábua, ladrilho e azulejo): 1 × 1, topo em z = 4,10, 10 cm de espessura, com a
   face de baixo pintada de forro (o teto do térreo). Vai até a linha da grade, por cima das
   paredes de baixo.
2. `escada-interna`: 1 de largura por 4 de comprimento, sobe de 0 a 4,10 em 14 degraus de
   0,293 m (o corpo sobe até 0,45), com corrimão de um lado. Origem no meio do pé da escada,
   subindo para +Y. Colisores `col-escada-reta` como a escada do Bosque e as âncoras
   `escada-1-base`, `escada-1-topo` e `escada-1-saida` (o modo `escada` já existe).
3. `piso-andar-vao`: a peça de piso de cima com o vão da escada (1 × 4), com guarda-corpo
   (`col-guarda-*`) nos três lados abertos.
4. `guarda-corpo-andar`: 1 de largura, 1,0 de altura, para a beira do piso de cima sem parede.

As paredes e o telhado do andar de cima reaproveitam as peças atuais deslocadas em 4,10.
Aceite: `tests/faces-coplanares.test.ts` com as peças novas e um teste do kit que sobe a escada
com a cápsula real do corpo.

### 2. Moldar o terreno (Nuvens), no `terreno.glb` da sua ilha

O lote grande da casa (x -15 a 16, z -14 a 10) precisa virar um pedaço separado do chão, para o
jogo trocar só ele por uma grade de alturas da criança (de 0 a 1,5 m, passo de 1 m) sem mexer
no resto da ilha:

1. Nó `chao-do-lote`: o chão do retângulo acima como malha própria, com o mesmo material e as
   mesmas UVs da grama vizinha, emendado ao resto sem fresta (vértices iguais na borda).
2. Capim, flores, moitas e pedras de enfeite fora do retângulo, ou num nó `enfeites-do-lote` à
   parte (o jogo os esconde onde a criança moldar).
3. Nenhum colisor `col-*` dentro do retângulo além dos que já existem para a casa e a horta.

Aceite: um teste lê o `terreno.glb`, confere o nó, a emenda e que `alturaDaIlha` continua igual
fora do retângulo.

### 3. A subida final pelo Farol (Lenda), no `farol.glb`

A proposta põe a subida final como um percurso que usa os movimentos já aprendidos. Entregar, por
fora da torre, um caminho do pé até a varanda (`camera-varanda`), com:

1. Uma escada reta (`escada-N-base`, `-topo`, `-saida`, colisor `col-escada-reta`).
2. Duas quinas de agarrar (`borda-N-a`, `-b`, `-fora`), com espaço embaixo, pendurado e em cima.
3. Um trecho de equilíbrio (`equilibrio-N-a`, `-b`) e um ponto de corrente de ar
   (`corrente-de-ar`) até a varanda, para o planador.
4. As âncoras do percurso: `subida-farol-largada`, `subida-farol-1` a `-6` (pontos de volta) e
   cinco `vagalume-farol-N` no caminho.
5. Colisores de tudo o que se pisa, com as folgas do pedido dos portos.

Aceite: um teste no molde de `tests/subida-ao-cume.test.ts` (pontos em cima de colisor, vãos
dentro do pulo, cada trecho com o modo certo).

## Pedidos da revisão da proposta v3 (30/10/2026, aprovados pela dona)

Origem: `docs/arquipelago-levantamento-proposta-v3-2026-10-30.md`, seção 10. A especificação
completa de cada item (arquivo, nós e âncoras, medidas, tetos de triângulos, o que preservar e o
aceite) está lá, com os mesmos números; decisões em `docs/arquipelago-regras.md` §6.28. As regras
gerais deste documento valem para todos (gerar pelos scripts de `arte/`, não renomear nada que
existe, cores pelo nome do material, relatório e README do kit atualizados).

Ordem de produção:

1. **B3. Bichinho do quarto andando:** clipes `andar` e `correr` em `pet-cachorro.glb` e
   `pet-gato.glb`, nas duas comunidades, sem mexer nos clipes de parado.
2. **B1 e B2. Silhuetas das ilhas e a altura pelo posto:** ver "As ilhas mais altas nos postos mais
   altos (B1 e B2)" abaixo. Revisto em 30/10/2026 depois de medir os modelos: a altura vai nas duas
   versões, por marcos que não se pisam, e a silhueta copia o contorno da ilha completa.
3. **B10. Barraca do minijogo** (`ilhas/vila-doce-props.glb`, `barraca-do-jogo`) e **brinquedo do
   festival** (`ilhas/pico-props.glb`, `brinquedo-do-festival`), cada um com o nó `tela` e a âncora
   `jogar`.
4. **B7. Café e banca de feira para casa** (`arte/casa`, arquivo novo `casa-cafe.glb`, sete peças).
5. **B4 e B5. Fósseis do Vale** (seis, nos props do Vale e em `arte/itens`) e **ícones do álbum**
   (os seis fósseis e quatro pegadas).
6. **B6. Jardim do céu** (terraço e seis canteiros em `ilhas/nuvens.glb`, três plantas em três
   estágios em `arte/itens`) e **a ilha que floresce** (três níveis de florada e 24 âncoras em
   `mundo/terreno.glb`).
7. **B8. Variações da galeria:** `-retro` e `-moderno` para os nove objetos, com a mesma caixa e os
   mesmos nós funcionais do clássico; uma das duas só com cores da paleta do Pinta.
8. **B9. Decoração de festa para a casa** (`arte/casa`, arquivo novo `casa-festas.glb`).
9. **B11. Segredos para os outros movimentos:** medidas e lugares na seção "As medidas dos
   movimentos para os segredos" logo abaixo.
10. **B13. Atalhos pelos telhados da Vila:** confirmado; especificação na seção "Os atalhos pelos
    telhados da Vila" logo abaixo.

Não pedidos por decisão da dona em 30/10: Lumis raros com modelo próprio (B12), bolsa de carteiro
do Nico (B15) e roupas de festa novas (B16). Revisto em 31/10/2026: B12 e B16 pedidos (seção
"Pedidos de 31/10/2026" no fim); a bolsa do Nico já existe.

### As ilhas mais altas nos postos mais altos (B1 e B2)

Medido nos GLBs em 30/10/2026 (altura do topo acima do mar, em metros; as Nuvens flutuam mais 7 m,
`ALTURA_DAS_NUVENS`):

| Ilha (posto) | Ilha completa | Silhueta hoje | Alvo nas duas versões |
| --- | --- | --- | --- |
| Bosque (2) | 14,4 (árvores) | 7,1 | 14 (como está) |
| Vila Doce (3) | 10,6 | 4,9 | 12 |
| Recife (4) | 6,1, mas a mais larga (37 m) | 4,8 | 9, e continua a mais larga |
| Pico (5) | 11,3 | 11,2 | 18 |
| Vale (6) | 11,6 | 9,7 | 20 |
| Nuvens (7) | 10,2 + 7 = 17,2 | 6,2 + 7 = 13,2 | 24 |

Dois problemas da decisão anterior ("maior só na silhueta"): a silhueta é trocada pela ilha
completa ao atravessar a ponte, e uma silhueta maior que a ilha encolheria na frente da criança; e
hoje a altura não acompanha o posto (o Bosque é a ilha mais alta no chão). Pedido revisto:

1. **A altura vem de marcos que não se pisam, nas duas versões:** a torre de doces da Vila mais alta;
   pináculos de coral e o mastro do navio no Recife; uma ponta de gelo acima do platô do cume no
   Pico (acima da bandeira, fora do caminho); o cone do vulcão mais alto no Vale (acima do pé do
   vulcão, fora da escavação e dos ninhos); torres de nuvem e o arco-íris nas Nuvens. Nenhum marco
   toca o chão pisável, os percursos, o cais ou a ponte; os colisores e as âncoras existentes não
   mudam. Nas Nuvens, o marco que estiver dentro do teto do balão (18 m acima do chão da ilha) ganha
   colisor.
2. **A silhueta copia o contorno da ilha completa**, com os marcos: uma malha, até 3 mil triângulos,
   cor por vértice, o mesmo nome de nó de hoje, e a mesma altura e largura da ilha completa (com
   tolerância de 5%), para a troca na ponte não mudar o tamanho.
3. **A largura da ilha completa não muda** (o raio de 13 m e tudo o que se pisa ficam iguais).

Aceite: um teste que lê os GLBs e confere os alvos de altura (com 1 m de tolerância), a silhueta
com uma malha e até 3 mil triângulos, e a diferença de altura e largura entre a silhueta e a ilha
completa abaixo de 5%.

### As medidas dos movimentos para os segredos (B11)

Tiradas do código em 30/10/2026 (`mundo/medidas.ts`, `sistemas/corpo.ts`, `sistemas/movimento.ts`,
`sistemas/patins.ts`, `sistemas/planador.ts`, `sistemas/montaria.ts`, `sistemas/balao.ts`,
`sistemas/mergulho.ts`, `sistemas/cipo.ts` e `sistemas/modos/`). Gravidade do jogo: 24 m/s². As
alturas são dos pés; as distâncias, no plano, de beirada a beirada.

| Movimento | Onde funciona hoje | Números |
| --- | --- | --- |
| A pé | Em toda ilha | Anda 2,2 m/s e corre 4,6 m/s. O pulo leva os pés a 1,50 m e fica 0,71 s no ar. Vence um vão de até 3,26 m correndo (1,56 m andando), na mesma altura. Sobe sozinho degraus de até 0,45 m e rampas até 52°; acima de 60° escorrega. Agarra quinas só onde há âncoras `borda-N-a`, `-b` e `-fora` (hoje só no Bosque): nelas alcança quinas até 3,65 m acima dos pés |
| Patins | Em toda ilha (item na mochila) | Anda 2,9 m/s e corre 6,0 m/s; chega aos 6 m/s em 0,75 s (uns 2,3 m de embalo) e desliza 3,6 m ao soltar. O pulo é o mesmo (1,50 m), mas vence um vão de até 4,24 m |
| Planador | Em toda ilha (item na mochila) | Abre no ar; desce a 1,8 m/s e avança a 5,5 m/s (cerca de 3 m para a frente por metro de queda). Do alto de um pulo no plano avança mais uns 4,6 m. Só sobe dentro de uma corrente de ar (3,2 m/s até 1,5 m antes do topo dela) |
| Cipó | Só no Bosque (as cordas são registradas pelo Bosque) | Corda de pelo menos 1,6 m, balanço até 63°; ao soltar, sai com a velocidade do balanço vezes 1,15 e mais 3,2 m/s para cima |
| Mergulho | Só no Recife (raio de 48 m do centro) | Nada 2,6 m/s na horizontal e 1,4 m/s na vertical, sem limite de fôlego; o fundo do mar fica a 3,5 m abaixo da superfície |
| Montaria | Só no Vale (o dino espera perto do vulcão e não sai da ilha) | Anda 3,6 m/s e corre 6,0 m/s. O pulo leva os pés a 1,69 m e fica 0,75 s no ar; vence um vão de até 4,5 m. O corpo montado ocupa um cilindro de 0,6 m de raio |
| Balão | Só nas Nuvens | Sobe até 1,8 m/s e chega a 18 m acima do chão da ilha; vai de lado até 3 m/s; passando de 24 m do centro, a brisa traz de volta |

**O que isso muda no pedido.** Montaria e balão são brinquedos da própria ilha (a proposta os chama
de "brinquedos de ilha"), e o mergulho e o cipó só existem no Recife e no Bosque. Por isso os
lugares ficam assim:

| Movimento | Ilha | O que a arte faz | O que o código faz |
| --- | --- | --- | --- |
| Cipó | Sua ilha | Uma árvore alta perto das pedras com o galho do cipó e uma plataforma de 2 × 2 m para o baú, a pelo menos 2,0 m acima de qualquer chão pisável num raio de 5 m e sem ponto pisável mais alto num raio de 12 m (para o planador não chegar descendo) | Registrar cipós na sua ilha (hoje só o Bosque) e posicionar o pivô e a corda por simulação do balanço; a arte deixa a árvore e a plataforma, e esta sessão devolve as âncoras exatas |
| Patins | Bosque | Um vão de 3,6 a 4,0 m entre duas superfícies na mesma altura, com 4 m de corrida reta antes dele e 1,5 m de largura, sem caminho em volta; o baú do outro lado | Nada além do baú |
| Mergulho | Sua ilha | Uma gruta sob o píer com a entrada toda abaixo de 1,0 m de profundidade (o nado na superfície não entra), abertura de pelo menos 2,0 × 1,6 m, chão da gruta acima de 3,3 m de profundidade e o baú a pelo menos 3 m da entrada | Uma área de mergulho em volta da gruta (hoje só o Recife tem) |
| Montaria | Vale | Uma faixa de cinza quente de 4 a 6 m de largura em volta de um ninho de pedra com o baú, com material de brasa (emissão fraca) | A pé, a cinza quente empurra a criança de volta, sem dano; montado, o dino atravessa |
| Balão | Nuvens | Uma nuvem pequena de 2 × 2 m a 12 a 15 m acima do chão da ilha, dentro de 19 m do centro e a mais de 6 m na horizontal de qualquer ponto pisável acima de 10 m | Nada além do baú |

Montaria e balão dentro das próprias ilhas, e não numa ilha anterior, é ajuste técnico da proposta
(registrar em `arquipelago-regras.md` §6.28 quando o lote entrar). Cada lugar vem com a âncora
`segredo-<movimento>` onde fica o baú. Aceite: um teste por segredo provando que o movimento certo
alcança e que, sem ele, não se chega.

### Os atalhos pelos telhados da Vila (B13)

Conferido no `vila-doce.glb` em 30/10/2026: o percurso sobe dos caixotes (topo a 2,0 m) às casinhas
1, 2 e 3 (3,0, 3,8 e 4,6 m) e ao terraço da sorveteria (5,4 m, com mureta até 5,8 m). Pular uma
casinha pede vencer mais de 5 m de vão e 1,6 m de subida, além do pulo a pé (3,26 m e 1,50 m) e dos
patins (4,24 m). O telhado da padaria (4,8 m) encosta no terraço, mas não se chega nele do chão. Ou
seja: hoje não há atalho, e o achado A41 depende da arte. Pedido, em `ilhas/vila-doce.glb`:

1. **Prancha da casinha 1 à casinha 3:** uma tábua de 0,8 m de largura, com corrimão só de um lado,
   subindo do telhado da casinha 1 (3,0 m) ao da casinha 3 (4,6 m), cerca de 5,3 m de comprimento
   (inclinação perto de 18°), com colisor. Pula a casinha 2 e o confeito dela: mais rápido, mas sem
   a terceira estrela.
2. **Escada de caixotes até a casinha 2:** três caixotes empilhados em degraus de 0,6 m entre os
   caixotes da largada e a casinha 2, terminando a 1,2 m do telhado dela (3,8 m), que se vence com
   um pulo. Pula a casinha 1.
3. Âncoras `telhados-atalho-1` e `telhados-atalho-2` no começo de cada atalho, para o percurso
   reconhecer o caminho e o confeito ficar no caminho principal.

Sem mudar os colisores, as casinhas, o terraço e as âncoras `telhados-*` que existem. Aceite: o teste
do percurso medindo que cada atalho é mais curto que o caminho principal e que a chegada continua
no terraço.

Não pedidos por decisão da dona: Lumis raros com modelo próprio (B12, primeiro como variação de cor
no código), bolsa de carteiro do Nico (B15) e roupas de festa novas (B16).

## Pedidos de 31/10/2026: Lumis de luz (B12) e roupas de festa (B16)

A dona decidiu em 31/10/2026 pedir a arte destes dois, que em 30/10 tinham ficado para depois. A
bolsa de carteiro do Nico (B15) não entra: ela já existe no `personagens/nico.glb` (bolsa a
tiracolo com os envelopes, `arte/personagens/nico.py`). O levantamento tinha errado nesse ponto.
As regras gerais deste documento valem para os dois (gerar pelos scripts, não renomear nada que
existe, cores pelo nome do material, relatório e README do kit atualizados).

### B12. Os Lumis de luz, um por família (kit `arte/lumis`)

Hoje cada família já tem a espécie comum e a rara (a rara sai em um de cada cinco borrões). A
proposta põe "Lumis raros" dentro dos baús que só o kit de movimento alcança. Para o baú não dar
uma espécie que a criança já pega à noite, o pedido é uma terceira versão de cada família, que
só se acha nos segredos.

| Família | Parte da rara | Arquivo novo | Nome para a criança |
| --- | --- | --- | --- |
| Sua ilha (praia) | Búzio | `buzio-de-luz.glb` | Búzio de Luz |
| Bosque | Ipê | `ipe-de-luz.glb` | Ipê de Luz |
| Vila Doce | Brigadeiro | `brigadeiro-de-luz.glb` | Brigadeiro de Luz |
| Recife | Pérola | `perola-de-luz.glb` | Pérola de Luz |
| Pico | Cristal | `cristal-de-luz.glb` | Cristal de Luz |
| Vale | Brotinho | `brotinho-de-luz.glb` | Brotinho de Luz |
| Nuvens | Pluma | `pluma-de-luz.glb` | Pluma de Luz |

- **Forma:** a mesma da rara da família, para a criança reconhecer de onde ele vem, com dois
  detalhes iguais em todos: uma coroa de luz (anel de cinco pontinhas acesas flutuando acima da
  cabeça, preso ao mesmo nó da cabeça) e um rastro curto de três faíscas atrás, que acompanha o
  `andar`.
- **Cor:** o corpo num tom mais claro e perolado que o da rara, com emissão leve (0,3) no material
  `corpo`; a coroa e as faíscas no material `luz`, como o resto da luz dos Lumis. De dia ele se
  distingue da rara pela coroa; à noite, por brilhar inteiro.
- **Animação:** os mesmos cinco clipes (`andar`, `feliz`, `parado`, `pular`, `trabalhar`), com os
  mesmos nomes, durações e laços da rara. No `feliz`, a coroa dá uma volta.
- **Tetos:** até 3.000 triângulos e 130 KB por arquivo, como as raras; mesma escala de autor (o
  jogo usa 0,3) e a frente para +Z.
- **Miniaturas:** `src/assets/lumis/miniaturas/<id>.png`, 160 px, pelo `miniaturas.py`, no mesmo
  enquadramento das 14 de hoje.
- **Preservar:** as 14 espécies e o borrão sem mudança; o `relatorio.json` ganha as sete com
  `raridade: "luz"`.
- **Aceite:** o `build_all.py` conferindo clipes, tetos e materiais; um teste novo que lê os sete
  GLBs e confere os cinco clipes, a coroa acima da cabeça e o material `corpo` com emissão. Pôr o
  Lumi de luz dentro do baú, o caderno e o álbum é código desta sessão. Nunca sorteado em troca de
  moeda (A28).

### B16. Roupas de festa novas (pipeline do avatar, `community-kids/scripts/avatar-blender`)

Hoje as festas sugerem peças que já existem (`arquipelago-contracts/src/vestuario-festas.ts`). O
pedido é uma peça de cabeça e uma de corpo por festa, feitas para a festa, que a criança
conquista na própria festa (A21).

| Festa | Peça | Id | Como é |
| --- | --- | --- | --- |
| Carnaval | Chapéu | `hat-08` | Cartolinha de lantejoula com uma pluma curta e serpentina enrolada na aba |
| Carnaval | Parte de cima | `top-07` | Colete de franjas coloridas sobre camiseta, com confetes estampados |
| Festa Junina | Chapéu | `hat-09` | Chapéu de palha com dois remendos de chita e a aba desfiada |
| Festa Junina | Roupa inteira | `outfit-07` | Vestido de chita com babado na barra (a barra repesada nas coxas, como as saias compridas) |
| Noite das Lanternas | Enfeite | `enfeite-06` | Tiara com três lanterninhas de papel penduradas |
| Noite das Lanternas | Parte de cima | `top-08` | Capa curta de estrelas, presa nos ombros, até a cintura |
| Fim de ano | Chapéu | `hat-10` | Gorro de tricô com pompom e barra branca |
| Fim de ano | Parte de cima | `top-09` | Suéter de tricô com uma estrela grande no peito e flocos na barra |

- **Regras do pipeline:** o mesmo esqueleto (`public/avatar3d/base/Armature.glb`), exportação
  passando pelo `reordenar.py`, chapéus e enfeites presos só ao osso da cabeça, roupas herdando os
  pesos das peças do pacote. Cada peça entra nas duas pastas
  (`community-kids/public/avatar3d/parts/` e `community/public/avatar3d/parts/`) com a miniatura
  das duas pastas `thumbs/` (`bun run gen:avatar-thumbs <id>`).
- **Cor:** a cor principal de cada peça num material `Color_*`, para a criança trocar como nas
  outras; o que não pode mudar (a palha, a chita, a estrela do suéter) com cor própria. Peça sem
  `Color_` vai para a lista de cores fixas, que é código.
- **Tetos:** no teto das peças do pacote da mesma categoria; os chapéus cabem sobre os cabelos
  `hair-01` a `hair-18` sem atravessar (o mesmo cuidado dos chapéus atuais).
- **Preservar:** nenhuma peça existente muda; os ids novos continuam a numeração de cada categoria.
- **Aceite:** `tests/avatar3d-catalog.test.ts` com as oito peças, as miniaturas nas duas pastas e
  uma prévia de cada peça no avatar parado e andando. O nome no catálogo, a festa de cada uma e a
  conquista na festa são código desta sessão.
