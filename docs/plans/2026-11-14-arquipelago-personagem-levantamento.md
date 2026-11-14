# Arquipélago: o personagem, o mundo novo e a Morada (levantamento técnico)

Data: 14/11/2026. Só estudo: nada foi implementado. Fontes: o código do jogo (`packages/arquipelago`,
`arquipelago-contracts`, `arquipelago-api`, a porta em `member-shell`) e o repositório de arte
(`artes-3d`, `origin/main` em `37ddf5a2f`), lidos em três frentes.

## 1. O que a dona decidiu

- O avatar do jogador passa a ser o boneco do pack Cute Characters, o mesmo da plataforma.
- A solução tem de ser a mais robusta e profissional, mesmo que isso signifique refazer o jogo.
- Depois do avatar, o jogo inteiro é refeito com as artes da biblioteca de aventura (terra doce,
  vilarejo do reino e o que vier). As ilhas crescem para cerca de 100 a 200 m cada, mais
  distantes entre si.
- A construção e os móveis (o quarto da criança na plataforma e a construção dentro do jogo)
  passam a ser os itens da Morada.
- O avatar e a Morada vivem na plataforma e no jogo, e precisam conviver nos dois.

## 2. A escala: a recomendação mudou duas vezes, e esta é a final

| Biblioteca | Corpo de referência | Exemplos |
|---|---|---|
| Avatar (Cute Characters) | 1,15 m nativo | cabeça de 0,57 m, braço de 0,26 m até o pulso |
| Morada (móveis e construção) | escala real; a criança `crianca_m` tem **1,12 m** | porta de 0,90 × 2,10; assento a 0,44; cama com colchão a 0,57; parede de 3 m; grade de 0,5 m |
| Nossas bibliotecas de aventura (doce, reino, faroeste, inverno, templo, estádio) | manequim de **1,70 m**; cápsula de 1,7 × 0,5 m de raio; altura livre de 1,7 m | passagem de 2,2 m; laterais do `muro_portao` com 1,9 m; degrau de jogo até 0,4 m; rampa até 30°; pulo de referência de 1,5 m de altura por 3 m |
| Pack Adventure Land | "tamanho de jogo" gigante | porta de 4,3 m; plataformas de 7 × 7 m com 3, 6 ou 12 m de altura; personagens de 0,9 a 2,9 m |
| Mundo de hoje do jogo | avatar antigo de 2,13 m | cápsula até 1,8 m; porta da construção de 2,2 × 3 m |

Recomendações anteriores:

- **Escala real (avatar de 1,15 m):** a primeira recomendação, sem olhar a arte.
- **Ampliar para cerca de 2,1 m:** a segunda, olhando só o Adventure Land.

A segunda quebra justamente o que mais importa:

- o herói de 2,13 m passaria pela porta de 2,2 m com 7 cm de folga;
- não passaria nas laterais de 1,9 m do portão do reino;
- ficaria fora da régua de 1,70 m com que as nossas bibliotecas foram conferidas;
- não caberia nas portas da Morada (2,10 m).

**Recomendação final: o herói é o avatar no tamanho nativo, com fator 1, na plataforma e no jogo.**

- **Morada sem fator.** O avatar mede o mesmo que a criança da Morada (1,15 contra 1,12 m). A cama, a
  cadeira e a porta servem a ele do jeito que a arte desenhou, no quarto e no jogo, sem nenhum
  fator de conversão.
- **Nossas bibliotecas de aventura continuam valendo.** Foram conferidas com um corpo de 1,70 m,
  então tudo por onde esse corpo passa, o de 1,15 m também passa. Os números de jogo da arte
  (degrau de 0,4 m, rampa de 30°, pulo de 1,5 × 3 m) são regras de física e ficam como estão; não
  dependem do tamanho do desenho. Uma criança que pula mais que a própria altura é normal em jogo
  de plataforma.
- **O Adventure Land fica como mundo de fantasia gigante.** Os personagens dele vão de 0,9 a 2,9 m,
  e a criança de 1,15 m cabe nesse elenco. Portas e casas desse pack ficam grandes de propósito.
  Nunca devem ser misturadas com as casas da Morada no mesmo lugar (ver a decisão D4).
- **Um tamanho só em todo lugar:** na página "Meu avatar", no quarto, no Mural e no jogo. Some a
  constante de escala que hoje divide plataforma e jogo.

**A ponte com o mundo de hoje.** Até as ilhas novas ficarem prontas, o mundo atual (feito para
2,13 m) continua no ar só para a equipe. O módulo do personagem recebe do mundo a **escala do
herói**, e todas as medidas saem do esqueleto já escalado (seção 5.2). O mundo antigo declara 1,85
e os mundos novos declaram 1. Com isso, o personagem é feito uma vez só, para o mundo novo, e o
antigo segue jogável enquanto não sai.

## 3. O que existe hoje: o personagem

**Estado atual.** Desde 13/11 (`56eefdc61`), o jogo mostra o boneco do pack parado e no tamanho
nativo de 1,15 m: sem animação de movimento, sem patins e sem lanterna
(`personagem/avatar-do-jogo.tsx:16-20`). O resto do código continua medido para o boneco antigo
de 2,13 m. Na prática:

- a barra do planador (1,25 m) fica acima da cabeça;
- o Zappy fica a 2,2 m do pé;
- a câmera mira a 1,8 m.

**Controlador.**
- `RigidBody kinematicPosition` com uma cápsula de 0,55 + 0,35, centro a 0,9 m do pé
  (`personagem/personagem.tsx:573-580`). Montado, ganha uma segunda cápsula.
- Dois `KinematicCharacterController` do Rapier: o do chão (degrau automático de 0,45, snap 0,35,
  sobe rampa até 52°, escorrega acima de 60°, massa 30) e o livre, para os modos guiados
  (`P:204-223`).
- Gravidade do jogo: 24 m/s², passo da física de 1/60 (`mundo/medidas.ts:14,17`).

**Modos de movimento.**
- São 13 modos (`estado/contexto.tsx:154-167`): chão (com ar e nado), cipó, escalada,
  equilíbrio, escada, escorregar, borda, descanso, barco, balão, mergulho, planar e montar.
- Patins é uma marca, não um modo.
- Tabela e contrato em `sistemas/modos/index.ts:38-52` e `tipos.ts:220-244`.
- O que se reaproveita é o **consumidor**: os modos recebem listas do mundo em
  `MundoDoMovimento` (`modos/tipos.ts:194-212`).

**Câmera.**
- Orbital em terceira pessoa, com campo de visão de 55°.
- Distância inicial de 6, 9 ou 13 m, zoom de 4 a 18 m, colisão por esfera.
- O foco fica a 0,9 m acima do centro e outras distâncias estão fixas no código
  (`personagem/camera.tsx:539,559,566`).

**Animação.**
- O caminho antigo misturava os 19 clipes Mixamo (`assets/avatar/locomocao.glb`) pela regra pura
  `sistemas/locomocao.ts`, com tempo e peso postos à mão. Esse caminho está no git
  (`56eefdc61^`) e serve de molde.
- A regra casa a velocidade com a passada (teto de 1,8 ciclo por segundo).
- **IK existe só nos braços do cipó** (`personagem/bracos.ts:82-123`).

**Ossos procurados pelo nome Mixamo antigo:**
- braços do cipó: `mixamorig*Arm/ForeArm/Hand`;
- lanterna: `mixamorigRightHand`;
- patins: `mixamorig*Foot/Leg`;
- testes: `mixamorigHips`/`LeftToeBase`.

No esqueleto novo eles não existem: os nomes não têm o prefixo `mixamorig`. Hoje falham sem
quebrar nada.

**Constantes ligadas ao corpo.** São dezenas (lista completa no relatório da frente 1), e
várias aparecem em três lugares ao mesmo tempo: o jogo, o script `arte/avatar/mixamo.py:44-52`,
que grava as poses dentro dos clipes, e os testes com números escritos à mão. Exemplos:
- `CORPO` (`sistemas/corpo.ts`): cápsula, velocidades e pulo;
- `CINTURA` 0,55 (linha d'água);
- `BORDA.maosAcimaDoCentro` 0,9;
- `ESCALADA`, `CIPO` e `ESCADA`;
- banco com assento a 0,53;
- cama com colchão a 0,72;
- barra do planador a 1,25;
- Zappy a 1,3 acima do centro;
- esmaecer copas: 0,5 e 0,7;
- avatar escondido no mergulho a 1,4 e 1,65.

**Testes.** De 60 a 70 arquivos dependem do tamanho do corpo: 51 importam `CORPO`, e há os que
recriam o controlador do Rapier, os de câmera e os que copiam a cápsula à mão.

**Quem mais usa o avatar.**
- O fantasma da família usa o boneco ANTIGO, com as peças padrão.
- O retrato da barra procura o nó `avatar-visual`.
- Os moradores têm modelos próprios, desenhados na escala de 2,2 m.

## 4. O que existe hoje: o mundo

**Tamanho.**
- A sua ilha tem cerca de 58 m de terra.
- As seis ilhas do anel têm de 26 a 57 m.
- O anel tem 82 m de raio. Vizinhas ficam a 82 m de centro a centro, e as pontes têm cerca de 44 m.
- O mundo inteiro tem uns 220 m (`mundo/medidas.ts:21-74,353-369`).

**Carga.**
- Cada ilha tem três versões: silhueta, média e completa (`mundo/carregar-ilha.ts`).
- A completa entra a menos de 17 m e a média a menos de 43 m.
- Teto de memória: uma completa e uma média ao mesmo tempo.
- Teto de arte: 1,5 MB e 40 mil triângulos por ilha completa.
- **Não há carga por partes dentro de uma ilha.** Uma ilha de 200 m não cabe num arquivo só.

**Colisão.**
- Nunca vem da malha de desenho. Vem de nós `col-*` feitos à mão no Blender
  (`mundo/colisores-da-ilha.ts`).
- A sua ilha é calculada no código.

**Pontos de interação hoje.**
- São nós com nome nos modelos do Blender: `borda-N-a/b/fora`, `escada-N-base/topo/saida`,
  `cipo-N`, `equilibrio-N-a/b`, `escalada-cil-*`, `escorregador-curva-N`, `col-banco-N`, mais
  dezenas de lugares por nome.
- Cada ilha tem um componente `*-vivo.tsx`, cerca de 40 arquivos, que lê esses nós e preenche o
  `MundoDoMovimento`.
- Outros pontos estão fixos no código: montaria, mergulho, chaves, coleções, mirante.
- Há 58 botões de agir em 43 arquivos (`mundo/interativos.ts`).
- São só pontos, sem a pose da mão ou do pé.

**Salvamento.**
- A posição do jogador está em coordenadas do mundo, **sem o identificador da ilha**
  (`salvamento.ts:77`).
- A obra da casa usa células de −60 a 60 em volta da origem do mundo.
- Os fantasmas ficam em coordenadas do mundo, com limite de ±500 m.
- **Os móveis da obra são guardados pelo ÍNDICE numa lista congelada** (`construcao/moveis.ts:1-55`).
- As cabanas já são por ilha, no referencial da ilha.

**Limites para um mundo de alguns km.**
- Fantasma: ±500 m. Obra: ±60 m.
- Mar e piso de colisão: 700 m.
- Câmera: enxerga até 450 m; estrelas a 320 m; névoa de 70 a 210 m.
- Mapa da ilha: 8 × 8, o que numa ilha de 200 m dá células de 25 m.

**Testes e conferências.** São 71 testes que leem modelos do mundo. Há ~105 scripts de
conferência no navegador, dos quais 52 começam em coordenadas fixas.

**Quarto e construção.**
- O jogo lê o mesmo quarto do Members e o desenha com o mesmo `FurniturePiece`: grade de 12 × 8
  com células de 1 m e paredes de 4 m.
- A construção usa grade de 1 m, paredes de 4 m e porta de 2,2 × 3 m.
- O inventário do quarto (`room_inventory`) é o mesmo que a galeria do jogo usa.
- Ids de móvel aparecem no código do jogo (`cama`, `beliche`, plantas, luzes).

**Para a pista de conferência.** A sala de movimento (`playground/sala-de-movimento.ts`) já é
calculada a partir do `CORPO` e tem teste. É o ponto de partida natural.

## 5. O que existe hoje: a arte

### 5.1 O esqueleto e as animações do avatar

**Esqueleto (44 ossos, no estilo Mixamo, sem prefixo).**
- `Root` → `Hips` → pernas e coluna (`Spine`, `Spine1`, `Neck`, `Head`); dedos com 2 ossos.
- Encaixes já existentes: `LeftHandProp` e `RightHandProp`. Não há osso de cabeça, costas nem pé.

**Medidas em repouso (pose em A).**
- Altura: 1,156 m.
- Quadril (`Hips`): 0,314. Ombro: 0,535. Mão com o braço caído: cerca de 0,28.
- Cabeça: de 0,58 a 1,156, metade do corpo. Olhos: cerca de 0,80.
- Braço: 0,26 m até o pulso. Perna: de 0,34 m da junta do quadril até o chão.
- Fonte: `biblioteca_aventura/avatar/esqueleto/catalogo.json` (`lista_ossos` com a posição de
  cada osso).

**Animações: 29 clipes a 30 qps.**
- Base de aventura: parado, andar e correr nas quatro direções, agachado, pulo em três partes,
  cair, subir escada, rolar e desviar.
- ⚠️ **O deslocamento está na translação do `Hips`**, não no `Root`: andar move cerca de 0,5 m
  por ciclo e o pulo sobe 0,97 m. O jogo precisa extrair esse deslocamento ou zerá-lo.

**O que falta no pack.**
- Nadar, boiar, entrar e sair da água.
- Pendurar e subir na borda.
- Cipó ou corda, equilibrar, escorregar.
- Sentar, deitar, montar.
- Empurrar, pegar, acenar.
- As versões dos bichos estão em outro esqueleto, a 24 qps, e não servem.

### 5.2 A biblioteca de aventura

**Tamanho.** São 1.606 peças em 58 catálogos:

| Coleção | Peças |
|---|---|
| Adventure Land | 247 |
| doce | 244 |
| reino | 168 |
| faroeste | 142 |
| templo | 183 |
| inverno | 207 |
| estádio | 415 |

**Campos comuns a toda peça:** `dims`, `colisao` (caixas), `fixacao`, `tris` e `kb`.

**Campos que só algumas peças têm:**
- `colisao_malha` e `colisao_jogo` (estádio);
- `partes`, `interativos` (elevador, trampolim, porta, botão), `formas` e `anima`;
- `coletavel`, `agua` e `encaixe` (grade de montagem).

**Pontos de interação já existem, mas cada coleção usa um nome diferente.** Não há esquema único:
- `escalavel` (escadas do doce): pé, topo, degraus, passo e saída no topo;
- `assentos` e `embarque` (barcos);
- `assento` (veículos e boias);
- `segura` (armas de mão, no `RightHandProp`);
- `entrada` (iglu);
- `vao_m` (arcos e portões).

**Não existe** agarrar borda, cipó ou corda, sentar em banco nem montar em bicho.

**Cenas montadas** (só posições, mais rotas e acessos com nome):

| Cena | Tamanho |
|---|---|
| terra doce | 280 × 277 m |
| reino | 133 × 106 m |
| templo | 213 × 171 m |
| inverno | 138 × 127 m |
| faroeste | 128 × 116 m |

O tamanho delas já é o das ilhas novas de 100 a 200 m.

### 5.3 A Morada

**Peças.**
- Móveis: 2.455 em 28 categorias (`biblioteca/moveis`).
- Construção: 459 peças (`biblioteca/construcao`). São chãos, paredes, telhados, lajes,
  degraus, cercas, portas e janelas.
- Casas prontas: 39, descritas como dados.

**Escala real**, com grade de 0,5 m:
- parede de 3 m; andar de 3,2 m;
- porta de 0,90 × 2,10;
- assento a 0,44; mesa a 0,75; cama com colchão a 0,57.

**O que o catálogo de móveis já traz:**
- `pontos`: 240 peças com `sentar`, `deitar`, `usar` e `abrir`, cada um com ponto e direção;
- `slots`: 2.073 espaços para apoiar objetos;
- `interativos`: portas, gavetas e correr;
- `encaixes`: módulos;
- além disso, `biblioteca/interacoes_moveis.json` (49 tipos de interação).

**Corpos de referência:** humanos de 0,66 a 1,88 m. A criança mede 1,12 m.

## 6. Arquitetura recomendada

### 6.1 Uma escala só

- O herói é o avatar no tamanho nativo, com fator 1, como explicado na seção 2.
- Mundo novo e Morada entram sem fator.
- O mundo antigo declara a escala 1,85 enquanto existir.

### 6.2 O personagem como módulo que não depende do mundo

**Medidas tiradas do esqueleto escalado, ao carregar.**
- Altura, quadril, ombro, alcance da mão, olhos, topo da cabeça e largura.
- Delas saem a cápsula, a câmera (foco nos olhos), a linha d'água, o Zappy no ombro, o
  passarinho, o esmaecer das copas e as alturas de agarrar.
- Nenhum número solto no código. As constantes de hoje viram funções dessas medidas e são
  conferidas por teste.

**Física do jogo como regra própria.**
- Degrau, rampa e pulo seguem as regras de jogo da arte (0,4 m, 30°, 1,5 × 3 m), declaradas uma
  vez só.
- O desenho de fase usa essas mesmas regras.

**Deslocamento das animações.**
- O avanço do `Hips` é extraído na importação: vira a passada medida e a animação fica no lugar.
- O corpo físico manda na posição; a animação só acompanha a velocidade.

**Câmera calculada a partir do corpo.** O pack de demonstração usa a câmera a 3 m; o valor final
sai da pista de conferência.

### 6.3 Animações próprias e IK

- **Conjunto completo para este corpo**, feito pela sessão de arte. Lista mínima, a partir dos
  modos:
  - parado, andar, correr, pulo em três partes, cair;
  - nadar, boiar, entrar e sair da água;
  - pendurar, subir borda, subir escada, escalar, cipó;
  - equilibrar, escorregar, planar, sentar, deitar, montar, patinar;
  - empurrar, pegar, acenar.
- O Mixamo serve só de rascunho. O pack já cobre a base de aventura.
- **IK em tempo real:**
  - dos pés, no degrau e na rampa;
  - das mãos, na borda, no degrau da escada, no cipó, na barra do planador e na alça da lanterna.
- É o IK que resolve o braço curto e qualquer acessório.
- **Encaixes declarados no esqueleto:** pedir à arte ossos de cabeça, costas e pés, além dos dois
  `HandProp` que já existem.

### 6.4 Um contrato único de pontos de interação

Um vocabulário só, no catálogo de cada peça e no referencial da própria peça. Ele vale para a
biblioteca de aventura e para a Morada:

| Ponto | Uso | Vem de |
|---|---|---|
| `subir` | escada de mão, com pé, topo, degraus, passo e saída | `escalavel` |
| `agarrar` | quina de borda ou parapeito | novo |
| `pendurar` | cipó ou corda, com pivô e comprimento | novo |
| `equilibrar` | eixo | novo |
| `escorregar` | curva | novo |
| `sentar`, `deitar`, `usar` | ponto e direção | `pontos` da Morada, `assentos`, `assento` |
| `montar` | sela | novo |
| `embarcar` | barcos | `embarque` |
| `entrar` | vão e porta | `entrada`, `vao_m` |
| `apoiar` | objeto em cima de móvel | `slots` |
| `alavanca` | elevador, trampolim, porta, botão | `interativos` |

- O jogo traduz esse catálogo para o `MundoDoMovimento`, que é o consumidor que já existe e
  continua.
- Os ~40 componentes `*-vivo.tsx`, que leem nomes de nós do Blender, saem.
- A cena montada pela arte declara onde cada peça está. O jogo monta a ilha a partir da cena e do
  catálogo, sem código por ilha.
- Peça nova, com pontos declarados, funciona sem código novo.

### 6.5 A Morada na plataforma e no jogo

- **Um catálogo no core**, gerado da arte (como o do avatar), com registro do que já foi migrado.
- **Um componente de desenho**, o mesmo no quarto e no jogo, com a mesma escala.
- **Um formato de posicionamento:** peça, posição na grade de 0,5 m, rotação e cômodo, sempre
  relativo ao cômodo.
- **Um inventário** no Members (posse e compras) que vale nos dois lugares.
- **Recomendação:** o quarto da plataforma é um cômodo da casa da criança no jogo. Mudou num,
  mudou no outro.
- A construção do jogo passa a usar os módulos da Morada: paredes, chão, telhados, portas e
  janelas na grade de 0,5 m.
- **Migração:** todos os ids de móveis mudam. A troca segue o molde da do avatar:
  - inventário: devolver as moedas e decidir o que fazer com os troféus;
  - `room_state`;
  - o salvamento da obra, que hoje guarda os móveis pelo índice e passa a guardar pelo id;
  - a galeria do jogo.

### 6.6 O mundo novo: ilhas de 100 a 200 m

- **Carga por ilha e por setor dentro da ilha.** Os tetos de hoje (1,5 MB e 40 mil triângulos por
  ilha) não servem. A arte de cada ilha é montada por peças instanciadas, a colisão vem das caixas
  do catálogo e os setores longe são soltos.
- **Salvamento relativo à ilha:**
  - o jogador vira id da ilha + posição local;
  - a obra fica na casa, que tem a ilha dela;
  - os fantasmas ficam por percurso, no referencial do percurso.
  - Assim dá para reorganizar o arquipélago e aumentar uma ilha sem estragar o salvamento de ninguém.
  - É uma nova versão do salvamento, com migração.
- **Viagem entre ilhas como parte do jogo** (barco, balão, planador). A próxima ilha carrega
  durante a viagem.
- **Limites revistos:** alcance da câmera e névoa, mar, coordenada dos fantasmas, mapa da ilha.

### 6.7 A pista de conferência

- A sala de movimento ganha as peças reais da biblioteca:
  - escada de mão, degraus, rampa e borda;
  - cipó, tronco caído, escorregador;
  - água rasa e funda;
  - banco, cama e cadeira da Morada;
  - trampolim, elevador e barco.
- Em cada estação, o personagem faz a ação sozinho e uma foto automática é comparada com a
  referência aprovada.
- É nela que o personagem é ajustado. Depois, ela confere os mundos novos e as peças novas.

### 6.8 Um avatar só

- O mesmo `PackAvatarRig` para o jogador, o fantasma da família, as visitas e o retrato.
- O fantasma passa a usar o avatar de quem correu.
- Saem o boneco antigo (`public/avatar3d`, 43 MB por app), o `locomocao.glb`, o `mixamo.py` e os
  testes Mixamo.

## 7. Riscos

- **As 25 animações que faltam dependem da sessão de arte.** Sem elas, o personagem fica sem nadar,
  pendurar, sentar e montar. A ordem de produção precisa ser combinada.
- **O deslocamento no `Hips` em todos os clipes do pack** exige um passo de importação que extraia
  a passada e deixe a animação no lugar.
- **Os pontos de interação dependem de a arte acrescentar campos** em 1.600 peças. Dá para começar
  pelas peças que a pista usa e pelas que as ilhas novas usam.
- **Dois salvamentos mudam de formato:** a posição relativa à ilha e os móveis pelo id. Cada um
  precisa de migração e teste.
- **Os testes e conferências do mundo antigo (71 testes e 105 scripts) saem junto com o mundo
  antigo.** Os do personagem são refeitos contra a pista.

## 8. Decisões da dona

- **D1. Escala do herói:** o avatar no tamanho nativo (1,15 m), com fator 1, na plataforma e no
  jogo. *Recomendado.*
- **D2. O quarto da plataforma é um cômodo da casa no jogo:** mesmo inventário e mesmo arranjo.
  **Decidido pela dona em 14/11/2026.**
- **D3. Troca dos móveis:** devolver as moedas e os quartos recomeçarem com móveis grátis, como no
  avatar; ou uma equivalência peça a peça.
- **D4. O Adventure Land gigante:** usar só como fantasia (montanhas, vegetação, coletáveis,
  mecanismos, plataformas altas) e nunca misturar portas e casas dele com casas da Morada no mesmo
  lugar; ou deixar de fora as portas e casas dele. *Recomendado: só como fantasia.*
- **D5. Animações próprias pela sessão de arte**, com a lista da seção 6.3 e encaixes de cabeça,
  costas e pés no esqueleto.
- **D6. Contrato único de pontos de interação** (seção 6.4), levado à sessão de arte para entrar
  nos catálogos.

## 9. Próximos passos

1. Fechar D1 a D6.
2. Escrever, com a sessão de arte:
   - o **contrato do personagem**: medidas, encaixes, lista de animações e regras de importação;
   - o **contrato de pontos de interação**.
3. Plano de implementação em etapas:
   1. Módulo do personagem e pista de conferência, no mundo antigo pela ponte (escala 1,85).
   2. Animações e IK.
   3. Morada na plataforma (quarto) e migração dos móveis.
   4. Mundo novo: carga por setor, salvamento por ilha, montagem a partir das cenas da arte,
      viagem.
   5. Morada na construção do jogo.
   6. Limpeza do avatar antigo e do mundo antigo.
