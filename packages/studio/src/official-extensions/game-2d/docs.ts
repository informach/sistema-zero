import { withGameTwoDLifecycleGuidance } from './pedagogy'

export const gameTwoDDocs = withGameTwoDLifecycleGuidance(`## Jogo 2D

Esta extensão adiciona um pequeno runtime didático em \`window.SZGame2D\`
que ajuda a montar jogos 2D simples sobre Canvas API. O código gerado é
  intencionalmente legível. Quando você abrir a Ponte vai ver
chamadas explícitas para \`SZGame2D.createSprite(...)\` e \`SZGame2D.gameLoop(...)\`.
Os HUDs, placares e telas dos kits usam a letra que você escolher no bloco
**Usar a fonte**; sem ele, vem a arredondada Baloo 2. A letra escolhida viaja
junto com o jogo, então funciona offline. Fontes escolhidas por você nos
blocos de Canvas continuam sendo respeitadas.

### Comece um projeto

- [[G2D_LIFECYCLE_MOLDS]]
- [[G2D_LIFECYCLE_START]]
- [[G2D_LIFECYCLE_EVENTS]]
- [[G2D_LIFECYCLE_LOOP]]

Esses são os destinos no projeto. Na paleta, os blocos ficam organizados pelo que
fazem: **🎮 Sprites** reúne criar e desenhar os personagens; **📐 Posição & tamanho**
e **💨 Velocidade** reúnem os bloquinhos de VALOR que leem onde o sprite está e o quão
rápido ele vai; **🎛️ Controles** reúne teclado e clique/toque; **💥 Colisões** reúne
contato entre sprites e grupos; **⏱️ Tempo e repetição** reúne os três “A cada…”, recarga
e tempo de vida; **🏆 Placar e HUD** reúne pontos, textos e barras na tela. Assim você
procura pelo assunto e usa as aulas para aprender em qual área colocar cada bloco.

- **Preparar o jogo em tela cheia**. Atalho para começar: prepara a tela (largura × altura) ocupando a janela, responsiva (mantém a proporção e redimensiona sozinha), **centralizada**, com uma **cor de fundo** que combina com o jogo (vai no canvas e na sobra ao redor). Não precisa criar o canvas no HTML. Os blocos individuais continuam disponíveis para montar na mão.
- **Preparar o jogo para ocupar a tela toda**. Como o de cima, mas **sem dimensões**: o canvas preenche a tela INTEIRA (sem barras nas laterais) e a área do jogo **acompanha** o tamanho da janela. A resolução do jogo passa a ser o tamanho da tela. Aqui "a largura/altura da tela" mudam com a janela, então centralize por eles (não por números fixos). Combine com "entrar em tela cheia" para o jogo tomar o monitor todo. Use UM dos dois "Preparar", no começo.
- **Pôr o cenário atrás de tudo**. Escolhe um desenho seu (do Pinta ou das Imagens) como fundo do jogo. Ele **cobre** a tela inteira sem deformar: se a proporção do desenho for diferente da tela, sobra um pouco para fora, em cima e embaixo ou nas laterais. Um desenho de 960 por 540 cabe exatinho numa tela larga. Ponha UMA vez em **⚙️ Ao iniciar** e o jogo repinta sozinho a cada quadro, antes de tudo o mais.
- **Desenhar o cenário**. O irmão do de cima, para quem quer mandar na ordem das camadas: desenha o cenário AGORA, neste quadro. Vai dentro do **🔁 Enquanto estiver rodando**, logo depois de limpar a tela. Use um OU o outro.
- **Descrever o jogo para leitor de tela**. Conte o objetivo e os controles em uma frase, por exemplo: “Pegue as moedas. Use as setas para andar.” Coloque em **⚙️ Ao iniciar**; pode vir antes ou depois do bloco de preparação.
- **Criar sprite**. Define um objeto com \`x\`, \`y\`, \`largura\`, \`altura\`, \`cor\`.
- **Desenhar o sprite**. Desenha o sprite no contexto do canvas.
- **Mover sprite … em 4 direções com setas**. Move o sprite com as setas do teclado (ver
  "Movimento" abaixo).
- **Mudar a posição do sprite** / **Mudar a velocidade do sprite**. Atualiza x/y e vx/vy.
- **Guardar em X se o sprite A colide com o sprite B**. Devolve sim/não por interseção retangular.
- **Criar pontuação**. Declara a variável de pontos.
- **Mostrar fim de jogo com o texto**. Escreve a mensagem em vermelho no canvas.
- **A cada quadro do jogo...**. Registra uma atualização no agendador do motor, em
  passos fixos de 60 Hz. Vários blocos desse tipo coexistem sem cancelar um ao outro.

O Estúdio liga o motor automaticamente. O antigo bloco “Quando o jogo começar”
existe apenas para migrar projetos salvos e não aparece na paleta.

### Faça o jogo reagir

- **Botar a gravidade do mundo em**. Define somente a aceleração do mundo (o padrão é
  0,6). Zero desliga; com gravidade negativa, o teto vira a borda atraída. Definir o
  valor, sozinho, não faz nenhum sprite cair.
- **Aplicar a gravidade do mundo ao sprite**. Soma essa aceleração ao \`vy\` do sprite
  neste quadro. Use logo **antes** do bloco que o movimenta.
- **Aplicar a gravidade do mundo aos sprites do grupo**. Faz o mesmo para os sprites
  atuais de um grupo. Só os sprites que recebem um desses dois blocos respondem à gravidade.
- **Mover usando vx e vy** / **Atualizar o grupo**. Move por \`vx\`/\`vy\` sem acrescentar
  gravidade escondida. A ordem física recomendada é: aplicar gravidade, mover e então
  resolver o chão ou as paredes.
- **Quicar o sprite … nas bordas da tela**. O sprite bate na beirada e volta.
- **Guardar em … se sprite … encosta no sprite … (em círculo)**. Colisão mais justa para
  objetos redondos.
- **Usar área de colisão de N% do tamanho**. O dial da colisão PERDOADORA: menor que
  100% = mais justo para DANO (os cantos vazios do desenho não punem); maior = mais
  fácil de PEGAR (moedas). Vale para todas as perguntas de encostar (retângulo e
  círculo); \`Impedir de atravessar\` continua usando o tamanho cheio (senão o sprite
  afundaria em chão e paredes). Veja a área real com **Mostrar a caixa de colisão**.
- **Tocar som**. Bip sintetizado via Web Audio (sem arquivos). Permissão \`audio\`.
- **Quando clicar/tocar**. Roda um bloco com a posição do ponteiro. Permissão \`mouse\`.
- **Quando apertar qualquer tecla ou tocar na tela**. Útil para começar uma partida e
  também funciona quando o palco ainda não tinha sido preparado explicitamente.
- **Quando o sprite pular**. Dispara no instante do pulo feito por Plataforma, Pular no
  chão ou Controlar o dinossauro.

### Dê aparência aos personagens

Use o painel **Imagens e sons** (no menu ⋯ da barra de cima) para enviar imagens do
computador ou escolher da biblioteca;
depois é só usar o **nome** da imagem nos blocos.

- **Criar sprite com imagem**. Um sprite que mostra uma imagem (em vez de um retângulo colorido).
- **Trocar imagem do sprite**. Troca a imagem fixa do sprite.
- **Carregar folha de quadros**. Prepara uma folha com vários quadros (informe o tamanho de
  cada quadro).
- **Animar sprite**. Percorre os quadros da folha de quadros a N fps. Fica repetindo para sempre.
- **Animar sprite ... uma vez só**. O irmão que toca e PARA no último quadro, em vez de repetir. É o
  bloco da estrela cadente, do golpe, do baú que abre.
- **a animação de ... acabou?**. Pergunta que responde sim quando a animação de "uma vez só" já
  tocou tudo (a que repete nunca acaba). Encaixe num **se** para sumir com o sprite, trocar a
  imagem ou dar ponto quando ela terminar.
- **Desenhar quadro**. Desenha um quadro específico da folha de quadros (controle manual).

Enquanto a imagem carrega, o cenário continua visível e ela aparece assim que fica
pronta. Se o nome não existir ou a carga falhar, o sprite usa um retângulo da cor.

### Controle o movimento e os efeitos

- **Ativar controles clássicos** prepara ações semânticas para teclado e botões de toque
  acessíveis. As perguntas **a ação está sendo segurada?** e **acabou de ser apertada?**
  combinam setas/WASD, Z/Espaço, X, Backspace (selecionar), Enter, Escape e multitoque sem
  duplicar lógica. Coloque
  este bloco uma vez em **⚙️ Ao iniciar**.
- **Quando a ação for apertada** fica em **⚡ Quando acontecer** e reúne teclado, botões de
  toque, botão focado pelo teclado e tecnologia assistiva. Use a ação **pausar** para alternar
  **Pausar/Continuar o jogo**; o botão não pausa sozinho.

Use os demais blocos abaixo dentro do **"A cada quadro do jogo"**:

- **Mover como plataforma clássica** reúne aceleração, corrida, derrapagem, agachamento,
  gravidade e pulo de altura variável. Depois dele, colida o sprite com o Mundo.
- **Mover estilo plataforma na tela (a borda é chão)**. É o atalho para um jogo fixo:
  esquerda/direita + pulo, usando a borda atraída da tela como piso. Encaixe **Aplicar a
  gravidade do mundo ao sprite** logo acima. Não use este bloco quando o mapa tiver poços.
- **Mover estilo plataforma sobre o terreno**. É o controle para mapas, Mundos e chão feito
  por figuras. Ele não inventa piso na borda da tela. A ordem é: aplicar gravidade, mover,
  **Colidir com o Mundo** e então acompanhar com a câmera. Tiles sólidos, tiles-plataforma,
  grupos sólidos, grupos-plataforma ou a borda escolhida no Mundo confirmam o apoio.
- **Fazer o sprite pular sobre o terreno**. A mesma regra, mas sem andar para os lados;
  serve para corrida e outros gêneros que só precisam do salto. Segurar o botão não repete
  o pulo quando o personagem pousa.
- **Mover sprite … em 4 direções com setas**. Anda nas 4 direções; a diagonal não fica mais
  rápida.
- **Voar livre**. Sem gravidade, mas com PESO: leva um tiquinho para engatar, plana um
  bom tanto quando você solta e demora para virar de lado (faça a curva antes!). É essa
  inércia que separa o voo do "4 direções". Passarinho, fadinha.
- **Bater as asas**. Cada TOQUE (seta pra cima, W, espaço ou um toque na tela) dá um
  empurrão, inclusive no ar. Aplique a gravidade logo acima para o sprite voltar a cair.
  Segurar não sobe para sempre.
- **Nadar**. Controle em 8 direções com bastante arrasto. Sem aplicar gravidade, o bicho
  fica boiando; aplique-a logo acima para ele afundar quando estiver solto.
- **Seguir o ponteiro**. O sprite persegue o mouse/dedo.
- **Manter dentro da tela**. Gruda nas bordas em vez de sumir.
- **Clarão**. Pinta a tela com uma cor translúcida (ex.: ao levar dano).
- **Tremer a tela**. Sacode e para sozinho, sem criar barras de rolagem (chame uma vez, ex.: numa explosão).
- **Soltar partículas** + **Atualizar e desenhar as partículas**. Uma explosão de
  partículas no ponto x/y; lembre de desenhá-las a cada quadro (somem sozinhas).

### Construa o cenário com mapas

Tiles montam cenários (chão, paredes, plataformas) a partir de UMA imagem com vários
quadros (o **tileset**). Escolha um no painel **Imagens e sons** (ex.: \`tileset\`).

- **Conjunto e mapa de tiles vetoriais** usam Figuras desenhadas no próprio projeto como
  peças sólidas, plataformas, decoração ou **atravessa e avisa**. Assim um jogo inteiro
  pode ser canvas puro, offline e sem arquivos de imagem.
- **Carregar fase de campanha vetorial** é a versão compacta para campanhas grandes. Ela
  guarda as grades e os metadados em uma receita JSON, mas cria somente o Mapa, o Mundo e a
  Fase escolhidos naquele momento. Também pode guardar um elenco autoral por fase e reforços
  próprios da segunda jornada, usando a lista de tipos indicada no bloco. Use **valor da fase
  atual** para ler mundo, etapa, pontos de nascimento e outras propriedades numéricas da
  receita. Isso evita que dezenas de mapas e inimigos inativos virem milhares de blocos SVG.
- **atravessa e avisa** (só no mapa VETORIAL) é a peça que o herói ATRAVESSA e que mesmo assim
  aparece no **Para cada tile que … toca no lado …**, no lado **dentro**. É com ela que se faz moeda no cenário,
  lava, espinho de chão e água: peça sólida barraria o caminho, e decoração não avisaria
  nada. Quem decide o que a peça significa é você, comparando o índice.
- **Para cada tile que … toca no lado … do mapa …** informa o lado e o índice original da peça. Use **o contato é
  com o tile…?** antes de **trocar o tile no contato** para prêmios que só valem uma vez,
  tijolos quebráveis e interruptores exatos.
- **Criar mapa de tiles**. Informe o tileset, o tamanho do tile (px) e a **grade**:
  cada número escolhe um quadro do tileset; \`;\` separa as linhas e espaço separa as
  colunas; \`.\` é uma célula vazia. Em **tiles sólidos**, liste os números que barram o
  jogador (ex.: \`1\`); em **tiles plataforma**, os que seguram só na face atraída pela
  gravidade e deixam atravessar pela outra.
- **Preparar o mapa encaixado na tela**. Use UMA vez em **⚙️ Ao iniciar** quando o mapa
  inteiro for uma tela. Calcula posição e escala sem distorcer.
- **Preparar o mapa em x/y com tiles de N px**. Use UMA vez quando quiser coordenadas
  exatas, especialmente num Mundo maior que a tela.
- **Desenhar o mapa preparado**. Use no "a cada quadro"; ele apenas desenha e nunca muda
  a geometria. Assim arte e colisão não se deslocam quando a câmera liga.
- **Criar Mundo do mapa**. Atalho para mapa rolável: posiciona em x 0/y 0, calcula os
  limites por colunas × tile e linhas × tile e cadastra o mapa como terreno. Depois use
  os blocos de colidir, acompanhar com câmera e desenhar o Mundo.
- **Colidir com os sólidos e plataformas do mapa**. É a opção direta para a receita de
  uma tela sem Mundo. Sólidos são chão e paredes; plataformas seguram em uma face só.
  Use a cada quadro, depois de mover o sprite.
- **Impedir de atravessar os sprites de um grupo** (em **💥 Colisões**). Mesma colisão, mas
  contra obstáculos SEM mapa: jogue as pedras/casas (até desenhadas por figura) num grupo
  e o sprite não atravessa nenhuma delas, deslizando pela beirada.
- **Impedir de atravessar o sprite** (em **💥 Colisões**). A mesma ideia, mas contra UM sprite
  só, como chão ou parede, sem precisar montar um grupo.
- **Fazer o sprite pousar na plataforma** / **nas plataformas do grupo** (em
  **💥 Colisões**). Transforma figuras em plataformas de uma face: atravessa por baixo e
  pelos lados, pousa na face atraída pela gravidade.
- Uma figura-chão móvel transporta quem estiver apoiado. A ordem é: **mover as
  plataformas → mover o jogador → resolver as colisões → desenhar**. O movimento do
  jogador se soma ao da base. O apoio muda de dono assim que ele pisa em outra
  figura, e some quando ele pula, cai no vazio ou a base sai do grupo.

Enquanto o tileset carrega (ou se faltar), os tiles aparecem como retângulos. O jogo
  nunca quebra por falta de imagem.

### Crie muitos objetos, HUD e telas

Para jogos com MUITOS sprites (tiros, inimigos, estrelas) e telas de início/vitória/derrota:

- **Grupos**. \`Criar grupo\`, \`Criar no grupo … um sprite\` (x/y/vx/vy aceitam número
  aleatório), \`Atualizar/Desenhar o grupo\`, \`Para cada sprite do grupo\`, \`quantos
  sprites tem no grupo\`, \`Esvaziar/Tirar do grupo\`, \`Tirar do grupo quem sair da tela\`
  e \`Pôr o sprite no grupo\`: um sprite que JÁ existe (o herói, um sprite nomeado) entra
  no grupo e passa a valer tudo que o grupo faz; repetido não entra duas vezes.
- **Dar NOME ao sprite que nasce no grupo** (campo "chamado", opcional). Deixe vazio se for
  só mais um da turma; preencha quando quiser fazer algo com ele logo depois: animar, dar
  vida, virar. Assim dá para ter um grupo de sprites ANIMADOS: no mesmo lugar em que você
  cria (por exemplo, dentro de \`A cada 2 segundos\`), ponha o \`Animar sprite\` logo abaixo
  usando esse nome. A animação começa no nascimento e cada um segue no próprio ritmo.
  ⚠️ O nome vale só ali, no trecho onde o sprite nasce.
  \`Atualizar o grupo\` sempre move sem acrescentar gravidade: tiros continuam retos.
  Use \`Aplicar a gravidade do mundo aos sprites do grupo\` antes dele somente nos grupos
  que devem cair. Para jogos vistos de cima (estilo aventura), \`Desenhar o grupo … ordenado pela base\` desenha quem está mais
  para baixo na frente: o herói passa ATRÁS da árvore.
- **Colisões com grupos**. \`Quando um sprite do grupo A encostar num do grupo B\` roda o
  "fazer" com os dois sprites; \`Para cada sprite do grupo que encostar no sprite\`
  compara um sprite com qualquer grupo. Os dois ficam em **💥 Colisões** e são usados dentro
  do "a cada quadro".
- **Temporizadores**. \`A cada N quadros/segundos fazer\` (ótimo para criar inimigos) e
  \`Depois de N segundos fazer\` (roda UMA vez por partida: mensagem de abertura, chegada
  do chefe; reiniciar o jogo re-arma). Essas raízes rodam em todas as telas; coloque \`se a tela atual é jogando?\` dentro delas quando o comando só deve acontecer durante a partida.
- **HUD no canvas**. \`Mostrar placar\`, \`Escrever placar pixel\`, \`Escrever\` e \`Barra de … / …\`.
  O **Escrever placar pixel** é o campo no estilo dos jogos clássicos (o nome em cima, o número
  embaixo) e tem letra PRÓPRIA, desenhada ponto a ponto: ele não muda com o "Usar a fonte". Os
  outros seguem a letra escolhida, então misturar os dois deixa o jogo com duas tipografias. Esses textos também são anunciados por leitores de tela, e a troca de cena limpa os valores da tela anterior. Para vidas, prefira **Desenhar as vidas do sprite** em **❤️ Vida**: escolha corações ou barra e o bloco lê o sprite sozinho.
- **Telas/cenas**. \`Ir para a tela\` e \`a tela atual é … ?\` aceitam tanto os
  nomes prontos quanto nomes inventados (como \`ganhou1\`); \`Mostrar tela (título/subtítulo/dica)\`,
  \`Reiniciar o jogo\`. Prepare grupos, sprites, variáveis e a tela inicial em **⚙️ Ao iniciar**;
  registre teclas, cliques e contatos em **⚡ Quando acontecer**; coloque cada atualização periódica
  como uma raiz de **🔁 Enquanto estiver rodando**. As três áreas compartilham o estado da partida.
  Use Reiniciar dentro de um evento, laço ou função, nunca em **⚙️ Ao iniciar**. Ele limpa tudo,
  encerra a pilha antiga e executa novamente as áreas usadas pelo projeto.
- **Cenário**. \`Desenhar fundo de estrelas\` e \`Mover o sprite com o dedo (só na horizontal)\`.

### Monte um jogo espacial

A categoria **🚀 Kit espaço** reúne atalhos PRONTOS (não genéricos) para jogos de nave
espacial. Os desenhos, efeitos e sons já vêm feitos: criar nave (cabine + foguinho animado,
cores do corpo e das asas escolhidas), criar asteroide no grupo (pedra que gira), desenhar
fundo de estrelas (céu com gradiente e estrelas que cintilam), soltar
explosão e tocar som de tiro/explosão. Os blocos genéricos seguem nas categorias normais. A ideia é ir somando KITS de outros temas (corrida, fazenda…).

### Pilote uma nave clássica

Para o **Asteroids clássico** (a nave GIRA e ACELERA para onde aponta). Os sprites passam a ter
um **ângulo em graus** (0 = pra cima, sentido horário) que o desenho respeita. A nave aparece
girada na direção apontada.

- **Controlar o sprite como nave** (Movimento). Vira com ← → (ou A/D), acelera com ↑ (ou W) na
  direção apontada e desliza com atrito ao soltar. Um bloco só já pilota a nave.
- **Girar o sprite N graus** / **Apontar o sprite para N graus** / **Impulsionar para a frente** /
  **Frear aos poucos (atrito)** / **a direção do sprite**. Os tijolinhos para montar o controle
  na mão ou inventar variações.
- **Atirar do sprite para a frente, no grupo** (Kit espaço). Cria o tiro na ponta da nave, indo
  na direção apontada (use no "quando apertar Espaço").
- **No grupo soltar um asteroide de uma borda** (Kit espaço). O asteroide nasce numa borda
  sorteada e vem rumo ao centro (use no "a cada X segundos"). Veja o exemplo **"Asteroides
  clássico"**.

### Dê acabamento ao jogo

- **Criar tiro no grupo**. Um tiro redondo com brilho (em vez de retângulo).
- **Mover o sprite com as setas**. Anda só na horizontal com ← → (1 bloco).
- **Fazer o sprite piscar**. O sprite fica intermitente por N quadros (ex.: invencibilidade).
- **A cada N quadros** agora aceita um número OU uma variável (spawn que acelera por onda).
- Asteroides nascem com tamanhos variados sozinhos; a tela de início/fim escurece de leve
  (o jogo aparece atrás) e quebra o subtítulo em linhas.

### Adapte o jogo ao tamanho da tela

O bloco **Fazer a tela preencher N% da janela** (genérico) deixa o canvas grande, nítido e responsivo: ocupa quase toda a janela e se reajusta sozinho quando ela muda de tamanho, mantendo a proporção. As coordenadas do jogo continuam as mesmas, mas o desenho passa a ser feito na resolução REAL da tela. Fica grande E nítido (sem borrar), em qualquer tamanho.

Para começar rápido, o bloco **Preparar o jogo em tela cheia** (no grupo ✨ Aparência) já faz tudo isso de uma vez. Cria a tela com o tamanho escolhido, centraliza na janela e pinta o fundo (canvas e a sobra ao redor) com a cor do jogo. Sem precisar criar o canvas no HTML. Os blocos individuais (criar a tela, preencher %) continuam disponíveis para quem quer montar na mão.

### Monte um jogo de corrida e pulo

Para jogos de **corrida** (estilo "Dino Run"), em que o personagem não anda para os lados, só pula e abaixa:

- **Fazer o sprite … pular na tela (a borda é chão)** (genérico, em Movimento). Pouso na borda +
  pulo com ↑/Espaço/W ou um toque. Aplique a gravidade ao sprite logo acima. Serve a
  qualquer jogo de pulo.
- A categoria **🦕 Kit dino** reúne atalhos PRONTOS: **criar dinossauro** (desenhado, com perninhas que
  correm sozinhas), **controlar o dinossauro** (pula e abaixa, com chão/poeira; aplique a gravidade logo acima),
  **criar obstáculo no grupo** (cacto/pedra no chão para pular, pássaro no alto para abaixar, ou sorteado),
  **criar ovo de bônus no grupo** (item para coletar), **desenhar fundo de floresta** (céu, sol, nuvens,
  morros e grama que rola. Parallax), e **sons** de pulo, dano e coletar.
- O **recorde** (maior pontuação) que persiste entre partidas usa os blocos genéricos de armazenamento
  (\`localStorage\`), não precisa de bloco novo.

Veja o exemplo **"Nave contra Asteroides"** para um jogo de tiro e **"Dino Run"** para um jogo de corrida. Ambos completos, montados só com blocos.

### Monte uma batalha de bananas

A categoria **🦍 Kit gorilas** monta um jogo de artilharia por turnos (estilo "Gorillas") para **2 jogadores** no mesmo aparelho. Cidade, física e crateras já vêm prontas: **Criar/Desenhar a cidade**, **Pôr o gorila no lado**, **Sortear/Desenhar o vento**, **Mirar arrastando** (mais longe = mais forte) + **soltou a mira?** → **Jogar a banana**, **Mover/Desenhar a banana** (gravidade + vento entortam), **a banana acertou o gorila?** (vitória) / **bateu num prédio?** (abre cratera, troca de turno), e **sons** de queda/explosão. Tem também blocos genéricos de canvas em ✏️ Traçado (retângulo ao traçado, recortar/clip, ponto dentro do traçado?) e os eventos apertar/soltar o mouse. Veja o exemplo **"Guerra de Gorilas"**.

### Adicione um robô adversário

- **O robô do gorila … joga na cidade … mirando no …**. Um lançador **computador (IA)**: ele simula vários arremessos, escolhe o melhor, "pensa" um instante e joga sozinho. Use no "a cada quadro", na vez do robô, passando o gorila INIMIGO. Dá pra fazer **1 jogador vs computador** (troque o ramo de um gorila por este bloco) ou **autoplay** (troque os dois). Veja o exemplo **"Guerra de Gorilas vs Robô"**.
- **Mostrar ângulo e força da mira**. Escreve no canto o ângulo (graus) e a força do último arremesso; bom para ver o que o robô escolheu.

### Faça jogos parecidos sem os kits

Dá pra montar jogos deste estilo **só com blocos genéricos** (HTML + CSS + Programação/Canvas), sem a extensão. Para isso entraram blocos novos no núcleo:

- **Mudar o estilo do elemento por código** (elemento.style.x = …) e **Definir atributo**. Posicionar/mover/mostrar/esconder painéis e formas, ou mudar stroke/fill/etc. De um SVG por código.
- **Blocos de SVG** (categoria **🎨 SVG**): caixa SVG, grupo, caminho (d), círculo, retângulo, linha e "reusar". Bom para um **moinho/cata-vento que gira por CSS** (@keyframes).
- **o sistema está no modo escuro?** (lê prefers-color-scheme) e **densidade de pixels da tela** (devicePixelRatio). Para temas claro/escuro e canvas nítido.
- A **tela cheia** já existia (entrar/sair/alternar e "está em tela cheia?").

Veja o exemplo clássico **"Cidade & Moinho (na mão)"** (no painel de Extensões → "Exemplos clássicos"). Um mini-Gorillas montado SÓ com esses blocos: arrastar a bomba, vento, moinho SVG girando, painel de HTML e botão de tela cheia.

### Monte um jogo de equilibrista

Categoria **🤸 Kit equilibrista**. Um jogo estilo "Stick Hero" que VOCÊ monta: estique
o bastão do tamanho certo e atravesse para a próxima plataforma. O EQUILIBRISTA é um
**sprite comum** (os blocos de sprite funcionam nele) e as regras moram no **caminho**.
Melhor num canvas **em pé** (ex.: 360×480). Estes kits não combinam com 🌍 Mundos com câmera
(o mundo já desliza sozinho).

- **Criar equilibrista** (largura, altura e cor). É um sprite: dá para trocar a figura
  ou a imagem dele com os blocos de 🎮 Sprites (ex.: um desenho seu do Pinta) e
  desenhá-lo com "Desenhar o sprite". Faça UMA vez, no começo.
- **Criar o caminho de plataformas** (cores das plataformas e do bastão). Guarda as
  plataformas, o bastão e as árvores do fundo. Faça UMA vez, no começo.
- Monte a REGRA DO MOUSE você mesmo, dentro do "a cada quadro do jogo", com um
  se/senão: se **o mouse ou dedo está segurado?** (em 🎛️ Controles) então **Crescer o
  bastão do caminho**, senão **Derrubar o bastão do caminho**.
- **Fazer o equilibrista andar pelo caminho**. A física: o bastão derrubado gira, o
  herói anda, atravessa ou cai; também posiciona o sprite. Como o andar reposiciona o
  equilibrista a cada quadro, os blocos genéricos de movimento (mover com as setas,
  por exemplo) não mexem nele enquanto o jogo roda.
- **Desenhar o cenário do caminho** (fundo) e **Desenhar as plataformas e o bastão**;
  o herói você desenha com "Desenhar o sprite".
- **Quando atravessar uma plataforma** / **Quando acertar bem no meio**. Nos eventos,
  o PLACAR é seu: crie a variável \`pontos\` e some 1 na travessia e 2 extras no acerto
  perfeito (mais som e brilho). Registre UMA vez, fora do "a cada quadro do jogo".
- **o equilibrista caiu no caminho?** Para o fim de jogo: troque de tela num "se" e
  recomece com o "Recomeçar o jogo" genérico.

Veja o exemplo pronto **"Equilibrista"** na vitrine: ele mostra o se/senão do mouse,
os pontos por variável e as telas de início e fim.

### Monte um jogo de balão

Categoria **🎈 Kit balão**. Um jogo estilo balão de ar quente que VOCÊ monta: suba
segurando o ponteiro (gasta combustível), voe baixo para economizar e desvie das
árvores. O BALÃO é um **sprite comum** com combustível próprio (começa com 100); as
árvores moram no **caminho**. Melhor num canvas **deitado** (ex.: 560×360).

- **Criar balão** (posição, tamanho e cores do balão e do cesto). É um sprite: dá para
  trocar a figura ou a imagem dele e desenhá-lo com "Desenhar o sprite". Faça UMA vez.
- **Criar o caminho de árvores**. As árvores que vêm pela frente e os metros. Faça UMA
  vez.
- Monte a REGRA DO MOUSE: se **o mouse ou dedo está segurado?** então **Acender o fogo
  do balão** (a força muda o empurrão; o fogo gasta combustível e não acende sem ele).
- **Fazer o balão voar e cair devagar**. A física: sem fogo, desce e pousa no chão. É o
  bloco que MOVE o balão de verdade: sem ele no loop, nem o fogo tira o balão do lugar.
- **Avançar o caminho com o balão**. O mundo anda enquanto o balão voa, os metros
  contam e a batida nas árvores é conferida com o retângulo do sprite.
- **Quando o balão bater numa árvore**. Evento para explosão, tremida, som e a SUA
  regra de fim (trocar de tela). Registre UMA vez, fora do "a cada quadro do jogo".
- **os metros voados no caminho** / **o combustível do balão** (0 a 100, use com
  "Mostrar barra") / **o balão pousou sem combustível?** Para o placar, a barra e o
  fim de jogo; recomece com o "Recomeçar o jogo" genérico.

Veja o exemplo pronto **"Balão"** na vitrine: ele mostra o "se" do mouse, a barra de
combustível, o evento da árvore e as telas de início e fim.

### Adicione efeitos, notas e música

A categoria **🔊 Som** ganhou uma biblioteca de sons PRONTOS. Tudo sintetizado (Web Audio), sem
precisar de arquivos:

- **Tocar efeito**. Um menu com dezenas de efeitos típicos de jogo: moeda, joia, vida, power-up,
  subir de nível, coletar, tiro, tiro grande, explosão, batida, dano, socar, pulo, aterrissar,
  zunido, passo, quicar, assobio, vitória, derrota, começar, alarme, clique, confirmar, erro,
  selecionar e aviso. É só escolher no menu. Um bloco só dá acesso a todos.
- **Tocar a nota … por … ms**. Toca uma nota musical (dó, ré, mi, fá, sol, lá, si e dó agudo);
  junte várias para montar uma melodia.
- **Tocar música de fundo**. Uma musiquinha em loop (aventura, alegre, tensão, calma ou vitória);
  só uma música toca por vez. Inicie em **⚙️ Ao iniciar**, em **⚡ Quando acontecer** ou
  diretamente numa função, nunca dentro de **🔁 Enquanto estiver rodando**. Repetir o bloco
  com a mesma música mantém a faixa atual sem recomeçar. **Parar a música de fundo** silencia.

### Toque os SEUS sons

Os blocos acima inventam o som na hora. Estes tocam um arquivo que **você** enviou: use o botão
**Enviar som** (o do alto-falante) em "Imagens e sons", na barra de cima. Serve mp3, wav e ogg.

- **Carregar o som … do arquivo …**. Prepara o arquivo e dá um apelido a ele ("moeda", "risada").
  Vai em **⚙️ Ao iniciar**, porque ele não toca nada: só deixa pronto.
- **Tocar o som …**. Toca uma vez, pelo apelido. Use quando algo acontecer no jogo.
- **Parar o som …**. Para e volta para o começo.
- **Tocar a música … sem parar**. Toca a SUA música em loop. Só uma toca por vez: começar outra
  troca a que estava tocando, e repetir a mesma não recomeça a faixa.
- **Parar a música**. Desliga qualquer música: a sua e também a de fundo pronta. Na dúvida, use
  este.
- **Pôr o volume em …**. De 0 (mudo) a 10 (bem alto).

Lembrete: o navegador só deixa o som tocar **depois** de um clique ou tecla do jogador. Se você
pedir um som antes disso, ele **espera** o primeiro clique e toca em seguida, em vez de sumir
calado.

### Resolva regras comuns do jogo

Tijolinhos que faltavam para montar mais tipos de jogo, em categorias novas e existentes:

- **🎯 Mira e contas**: **Apontar para** e **Mover na direção de** (perseguição/IA), **a distância entre** e
  **o ângulo até** dois sprites, **um número de … a …** (sorteia sempre um inteiro, incluindo as pontas) e
  **tem chance de … %?** (evento aleatório; valores abaixo de 0 nunca acontecem e acima de 100 sempre acontecem).
- **❤️ Vida**: use **Dar ao sprite … de vida** uma vez em **⚙️ Ao iniciar**. Durante a partida, **Mudar a vida** cura ou tira pontos; **Machucar o sprite … e deixá-lo invencível** é a opção segura para contatos repetidos. Pergunte **a vida do sprite**, **a vida máxima**, **ainda tem vida?**, **as vidas acabaram?** ou **o sprite está invencível?**. Combine a última pergunta com **não** para disparar tremor, explosão ou som somente quando o dano puder acontecer. Para o HUD, **Desenhar as vidas do sprite** lê a vida automaticamente e oferece **corações** ou **barra**. Uma vida nunca fica negativa nem passa do máximo.
- **⏱️ Tempo e repetição**: **pode agir? (recarga de N quadros)** (cadência de tiro por sprite) e
  **Tirar do grupo quem viveu mais de N segundos** (tiros somem sozinhos), junto dos blocos **A cada…**.
- **✨ Aparência**: **Virar** (esquerda/direita/cima/baixo), **Mudar a transparência**, **Mudar o tamanho** e
  **Multiplicar o tamanho** do sprite.
- **🕹️ Movimento**: **Dar a volta na tela** (sai de um lado, reaparece no outro. Estilo Pac-Man/Asteroids).
- **📺 Telas e cenas**: **Descrever o jogo para leitor de tela** torna objetivo e controles acessíveis. **Pausar o jogo** CONGELA tudo (o "a cada quadro" para de rodar, e o "quando
  encostar" também), **Continuar o jogo** descongela e **o jogo está pausado?** lê o estado. Os eventos de
  toque **"Quando apertar a tecla"**, **"Quando a ação for apertada"** e **"Quando clicar/tocar"**
  continuam funcionando na pausa DE PROPÓSITO;
  assim você pode fazer "aperte R para continuar". Para mostrar "Você ganhou/perdeu", **desenhe a tela
  ANTES de Pausar** (ela fica congelada por cima). Para um fim de jogo com recomeço, prefira as **cenas**
  (**Ir para a tela 'perdeu'/'ganhou'** + **a tela atual é …?**): o "a cada quadro" decide o que mostrar e o
  jogo segue rodando a tela de fim.

### Crie áreas jogáveis e depure

Um Mundo pode ser maior que a tela, caber exatamente nela ou nem usar câmera:

- **🌍 Mundos**: crie uma área jogável, cadastre mapas e grupos como terreno, escolha as bordas e
  configure a câmera. Os inimigos que andam no chão precisam do bloco **os inimigos do tipo … andam
  no terreno**, senão eles pousam na borda da tela, que anda junto com a câmera. A câmera rola só o MUNDO. Desenhe o HUD (placar, vidas, textos) DEPOIS do mundo
  para ele ficar fixo na tela. ⚠️ Cliques/toques continuam em coordenadas de tela; com câmera, a
  posição no mundo é tela + câmera.
- **🗺️ Mapas** (destrutíveis): prepare a geometria uma vez; depois use **Quebrar o tile** onde está um
  sprite (mineração/destruição), **pôr um tile** e **o número do tile** onde está o sprite
  (ler/construir em tempo real).
- **🚩 Fases**: agrupe um Mundo e um ponto de entrada quando o jogo tiver progressão. **Entrar**
  preserva tiles, itens e inimigos já alterados; **Reiniciar** restaura os tiles e esvazia os grupos
  registrados para a Fase. Os dois posicionam o jogador e disparam o evento próprio. Jogos de uma
  área só não precisam desse conceito.
- **📦 Muitos**: **Trazer para a frente** / **Mandar para trás**. Controla quem é desenhado por
  cima de quem dentro de um grupo.
- **✨ Aparência** (depuração): **Mostrar a caixa de colisão** de um sprite e **Mostrar os FPS**. Para
  enxergar colisões e a performance enquanto cria.
- **✨ Aparência**: **Mostrar a borda da tela**, com cor e espessura. Põe uma moldura em volta do
  palco para todo mundo ver onde começa e onde termina a área do jogo. Ótimo para explicar o palco
  a alguém. Ponha em **⚙️ Ao iniciar**; para tirar, apague o bloco. A moldura fica na beirada da
  tela, então ela não atrapalha o desenho nem é apagada pelo jogo.
- **✨ Aparência**: **Usar a fonte**, com cinco letras para escolher: Baloo 2 (arredondada),
  Nunito (limpa), Press Start 2P (de pixel), Bungee (grossa) e Fredoka (gordinha). A escolha vale
  para **todo** texto do jogo: placar, telas e mensagens. Ponha em **⚙️ Ao iniciar** e use **um
  bloco só**: a fonte é decidida **antes** de o jogo começar, então, se houver dois, vale o último
  e o jogo avisa. ⚠️ O **Escrever texto pixel** e o **Escrever placar pixel** têm letras próprias,
  desenhadas ponto a ponto, e não mudam. Os outros blocos de placar seguem a letra escolhida.
- **✨ Aparência**: **Cobrir a tela com fade de N por cento na cor**. Um véu por cima de tudo, para escurecer
  a cena numa pausa ou fechar a fase apagando aos poucos. Vai no **🔁 Enquanto estiver rodando**,
  depois de tudo o que você desenhou.
- **📺 Telas e cenas**: **Mostrar a tela com a imagem**. Cobre o palco inteiro com um desenho seu:
  a tela de abertura, a de vitória, a de fim de jogo. Cobre sem deformar, como o cenário, e ainda
  **anuncia** a tela para quem joga com leitor de tela.
  Vai dentro do **🔁 Enquanto estiver rodando**, no lugar em que você mostraria a tela escrita.

#### Os blocos de Mundo e de Fase

Mundo (🌍) monta a área jogável em **⚙️ Ao iniciar** e depois trabalha a cada quadro:

- **Criar Mundo … com largura … altura …**. A área vazia, com limites próprios.
- **Criar Mundo … do mapa … com tiles de … px**. Já prepara o mapa em x 0, y 0 e tira as medidas dele.
- **No Mundo … usar o mapa preparado … como terreno**. Soma outro mapa ao terreno.
- **No Mundo … usar as figuras do grupo … como terreno sólido**. Chão e parede por todos os lados.
- **No Mundo … usar as figuras do grupo … como plataformas**. Segura só na face atraída pela gravidade.
- **No Mundo … os inimigos do tipo … andam no terreno**. Sem ele o inimigo pousa na borda da tela.
- **No Mundo … usar bordas …**. Abertas (com poços), só o chão ou as quatro sólidas.
- **No Mundo … configurar câmera horizontal … vertical … folga x … y …**. Uma vez, no início.
- **Fazer o sprite … colidir com o Mundo …**. A cada quadro, depois de mover.
- **Fazer a câmera do Mundo … seguir o sprite …**. A cada quadro, depois de colidir.
- **Desenhar o terreno do Mundo …**. Depois vêm os personagens e, por último, o HUD.
- **a posição x da câmera** / **a posição y da câmera**. Para converter tela em mundo (tela + câmera).

Fase (🚩) só entra quando o jogo tem progressão:

- **Criar Fase … usando o Mundo …, entrada x … y …**. Junta a área e o ponto de entrada.
- **Entrar na Fase … com o sprite …**. Troca de área preservando o que já aconteceu nela.
- **Na Fase … reiniciar o grupo … junto com ela**. Registra inimigos e itens que pertencem à Fase.
- **Reiniciar a Fase … com o sprite …**. Restaura os tiles, esvazia os grupos registrados e recria tudo.
- **Quando entrar na Fase …**. Roda uma vez por entrada e por reinício.
- **a Fase … está ativa?**. Para usar num “se”.
- **Fazer o sprite … colidir com a Fase atual** / **Fazer a câmera da Fase atual seguir o sprite …** /
  **Desenhar o terreno da Fase atual**. Os atalhos de quem realmente troca de Fase.

Mundo e Fase moram em **⚙️ Ao iniciar**, e não em 🧩 Meus moldes, porque eles apontam para
coisas VIVAS desta partida (um mapa, um grupo, um tipo de inimigo). Molde é a receita que não
aponta para nada vivo: por isso “Criar tipo de inimigo” é molde e “Criar Mundo” não é.

#### Escolha a receita certa

**1. Um mapa que é só uma tela.** Em **⚙️ Ao iniciar**, crie o mapa e use **Preparar o mapa
encaixado na tela**. Em **🔁 Enquanto estiver rodando**, desenhe o mapa preparado e faça o
personagem colidir diretamente com ele. Não crie Mundo, câmera nem Fase se eles não ajudam esse
jogo.

**2. Uma área jogável, com ou sem rolagem.** Use **Criar Mundo … do mapa …** (terreno de tiles)
ou **Criar Mundo … com largura … altura …** (terreno feito de figuras).
No vazio, cadastre grupos de figuras como terreno sólido ou plataforma; também dá para misturar
figuras e mapas preparados. Configure as bordas e a câmera uma vez. A cada quadro, a ordem é:
aplicar gravidade, mover sobre o terreno, colidir com o Mundo, fazer a câmera seguir e desenhar o
Mundo. Se o jogo tem inimigos que andam no chão, ponha em **⚙️ Ao iniciar** o bloco **No Mundo …
os inimigos do tipo … andam no terreno**: é ele que troca a borda da tela pelo terreno de verdade,
tanto para pousar quanto para virar a marcha. Um Mundo do tamanho da tela funciona normalmente e sua câmera permanece em x 0, y 0. Esta
receita serve para plataforma, nave, labirinto, corrida ou qualquer outro gênero e **não exige
Fases**. O exemplo **Mundo Pirata** usa esta receita com todo o chão feito por figuras.

**3. Várias Fases.** Crie um Mundo para cada área e depois uma Fase para cada Mundo, escolhendo
o ponto de entrada. Registre os grupos de inimigos e itens com **reiniciar o grupo junto com a
Fase**; em **Quando entrar na Fase**, preencha esses grupos. **Entrar na Fase** troca a área e
preserva o que já aconteceu nela. **Reiniciar a Fase** restaura os tiles, limpa os grupos
registrados e recria o conteúdo pelo evento. Os dois reposicionam o personagem e reiniciam vx,
vy, apoio e câmera; vida e pontuação continuam. Os atalhos da **Fase atual** colidem, acompanham e
desenham o Mundo ativo. Fase não significa “plataforma”: pode ser uma missão de nave ou uma arena
de uma tela.

**Ondas não são Fases.** Uma onda normal acontece no mesmo Mundo: guarde o número da onda numa
variável, esvazie ou preencha grupos e ajuste a dificuldade com os blocos de tempo. Não entre de
novo na Fase, porque isso também reposiciona o personagem e reinicia a física e a câmera. Use uma
nova Fase somente quando a onda realmente troca a área jogável. Para refazer a área atual, use o
bloco explícito **Reiniciar a Fase**.

**Telas e cenas continuam separadas.** “Início”, “jogando”, “venceu” e “perdeu” controlam o que
o jogo mostra. Mundo descreve a área jogável; Fase descreve progressão. Um jogo pode usar cenas
sem Fases, Fases sem rolagem ou as duas coisas juntas.

### Leia a posição e o tamanho do sprite

Bloquinhos de VALOR (na categoria **📐 Posição & tamanho**) que poupam a criança de fazer as contas na
mão. Em vez de \`x + largura / 2\`, ela encaixa um bloco pronto:

- **a posição x / y do sprite**. Onde o sprite está (borda esquerda / borda de cima).
- **a largura / a altura do sprite**. O tamanho do sprite, em pixels.
- **o centro x / y do sprite**. O MEIO do sprite (já soma metade da largura/altura). Ótimo para atirar,
  mirar ou posicionar uma coisa a partir do centro de outra (ex.: o tiro sai do centro da nave).

### Leia a velocidade do sprite

Bloquinhos de VALOR (na categoria **💨 Velocidade**) para ler o quão rápido o sprite se move, sem a
criança fazer as contas na mão:

- **a velocidade x / y do sprite**. A velocidade horizontal (vx) e vertical (vy) do sprite.
- **a velocidade total do sprite**. A rapidez geral do sprite (junta vx e vy), sempre positiva.
- **o sprite está se movendo?** (e **… na horizontal?** / **… na vertical?**). Perguntas de sim/não para
  reagir ao movimento, por exemplo tocar a animação de "andando" SÓ quando o sprite está andando, ou virar
  o personagem só quando ele anda para os lados.

### Sorteie posições na tela

Na categoria **🎯 Mira e contas**, dois valores para um sprite nascer num lugar SORTEADO sem a criança
montar a continha \`Math.random() * largura\` na mão:

- **um x aleatório na tela** / **um y aleatório na tela**. Sorteia uma posição em qualquer lugar da
  largura (ou da altura) do palco. (Para um intervalo específico de números, continua valendo
  **um número de … a …**.)

### Anime o personagem pelo estado

Na categoria **🎬 Animação**, o jeito FÁCIL de o personagem trocar de animação sozinho:

- **Quando o sprite estiver … tocar a animação …**. Guarda a animação de UM estado do sprite:
  parado, andando (para os lados), andando (cima/baixo), pulando, caindo ou tomando dano. Use um
  bloco por estado, FORA do "a cada quadro" (é configuração, roda uma vez). A animação vem da sua
  folha de quadros. Escolha pelo NOME (do Pinta) que os quadros/fps se preenchem sozinhos.
- **Animar e virar o sprite sozinho**. Vai DENTRO do "a cada quadro": ele descobre o estado do
  sprite (pela velocidade, pelo chão e pela vida) e troca a animação SÓ quando o estado muda.
  Também VIRA o desenho para a esquerda/direita conforme o sprite anda (flip automático; parado,
  vale o "Virar o sprite" manual).
- Estado sem animação registrada cai no parente mais parecido (caindo → pulando → andando →
  parado). Dá para começar só com "parado" e "andando" e crescer depois.
- "Tomando dano" liga sozinho por meio segundo quando o sprite PERDE vida (bloco "Mudar a vida…
  em -1") ou enquanto ele pisca (bloco "Fazer o sprite piscar").
- "Pulando/caindo" só acontecem em jogos com chão (plataforma/pulo no chão/colisão com mapa). Num jogo de vista de cima, andar para cima/baixo usa "andando (cima/baixo)".

### Use um mapa pronto do Pinta

- **Criar mapa do meu desenho** (🗺️ Mapas). Desenhe o MAPA no Pinta, toque no 🚀 e escolha o
  desenho neste bloco: grade, peças e sólidos vêm JUNTOS, nada de colar texto.
- No **Criar mapa de tiles** (o clássico, para montar/editar na mão), a GRADE agora abre um
  mini-editor visual: escolha uma peça e PINTE as células (borracha apaga, dá para mudar
  linhas/colunas).

### Crie tipos de inimigo

Na categoria **😈 Inimigos**, CLASSES de inimigo prontas (como o Goomba e o Koopa do Mario).

**Onde cada bloco fica.** O que o inimigo É mora em **🧩 Meus moldes**: criar o tipo, somar
comportamento, ajustar os valores e criar o grupo com todos os inimigos. O que a PARTIDA faz com ele
fica em **⚙️ Ao iniciar** e nos eventos: soltar, atualizar, desenhar e reagir. A animação de estado
também fica em **⚙️ Ao iniciar**, depois de carregar a folha de quadros que ela usa. A regra é essa:
molde descreve a criatura; carregar recursos e pôr a receita em jogo pertence à partida.

⚠️ Os dois ajustes de molde também cabem DENTRO de um evento, e é assim que o inimigo muda no meio
do jogo: no **Quando um inimigo do tipo … levar dano**, some um comportamento novo ou aperte a
cadência dele. A animação de estado também cabe no evento ou num temporizador para o inimigo parecer
furioso, mas sua raiz normal continua no **Ao iniciar**, depois da folha.

#### Os dois jeitos de criar um tipo

- **Criar tipo de inimigo**. Você escolhe o jeito dele: UM comportamento agora, e mais quantos
  quiser depois. Defina de uma vez os atributos (vida, velocidade, dano de contato, tamanho e o
  visual: cor, imagem OU uma **figura** desenhada com "Desenhar a figura … assim"; a figura vence
  a imagem, que vence a cor).
- **Criar tipo de inimigo … com inteligência …**. O atalho: escolha só o quanto o inimigo é
  esperto e o resto vem pronto, inclusive os ajustes. São cinco níveis, do mais bobo ao chefão:
  - **burra** (patrulha + bombardeiro): anda de um lado para o outro soltando tiros para baixo,
    sem olhar para onde você está.
  - **básica** (patrulha + atirador alinhado): anda, e só atira quando você passa embaixo dele.
  - **avançada** (perseguidor de lado + atirador): te segue pelos LADOS, na altura em que
    nasceu, e mira em você.
  - **ultra** (perseguidor de lado + atirador esperto): também te segue pelos lados, e mira
    onde você VAI estar. Dessa não dá para
    escapar andando reto, só mudando de direção. Ela já vem com o tiro mais rápido, que é o que
    faz a mira adiantada funcionar.
  - **rei**: o chefão. Diferente das duas de cima, ele persegue por TODO LADO (sobe pelo ar atrás
    de você); mais atirador esperto e raio, com cinco vezes mais vida (mas anda mais devagar).

  Os nomes entre parênteses são comportamentos do outro menu: a inteligência é um atalho que já
  junta as peças por você.

#### Os comportamentos, e como somar

- **O tipo de inimigo … também é …**. Aqui mora a graça: um inimigo pode ter VÁRIOS
  comportamentos ao mesmo tempo. Patrulha mais atirador anda E atira. Voador mais bombardeiro
  passa por cima soltando tiros. Empilhe quantos quiser, e pode somar no meio do jogo para o
  inimigo ficar mais difícil na próxima onda ou etapa de dificuldade.

  A regra é simples: os jeitos de se mexer não se somam, então se você juntar dois vale o último
  que somou; já as ações se juntam todas. ⚠️ Isso vale também em cima da inteligência: somar um
  jeito de andar TROCA o andar que veio com ela.

Os comportamentos, em três famílias:

- **Anda no chão**: patrulha (anda e vira na parede ou na borda), saltador, arrancada (fica
  quieto e sai correndo quando o alvo chega perto), medroso (foge quando o alvo chega perto),
  parado, e os TRÊS modos de perseguir: **perseguidor** vai atrás de você por todo lado (sobe
  pelo ar e nunca pousa), **perseguidor de lado** segue você sem mudar de altura (o jeito
  clássico dos jogos de nave) e **perseguidor vertical** sobe e desce atrás de você sem sair da
  coluna. Só muda o eixo em que ele se mexe; a esperteza é a mesma.
- **Voa**: voador (para os lados, ou subindo e descendo), rondador (voa em círculo em volta de
  onde nasceu), zigue-zague, mergulhador (mergulha no alvo que passa por baixo) e teleporte
  (some e reaparece do lado do alvo).
- **O que ele faz**: atirador (mira no alvo), atirador alinhado (só atira quando o alvo passa
  bem embaixo ou bem em cima dele), atirador de lado (o espelho dele: só atira quando o alvo está na
  mesma altura, e a bala vai reta para o lado; junte os dois e o inimigo cobre uma cruz), atirador
  esperto (mira onde o alvo VAI estar, se o tiro dele
  for mais rápido que o alvo), atirador em leque (3 tiros de uma vez), bombardeiro (solta tiros
  para baixo, sem precisar de alvo), raio, espinho (nunca morre, só machuca), renascer (volta um
  tempinho depois de morrer) e chefão (vida 5 vezes maior, mais lento, atira em leque).

Quem anda no chão fica na horizontal em jogos top-down; para cair num jogo de plataforma,
defina a gravidade em **Ao iniciar** e aplique a gravidade ao grupo do tipo antes de atualizá-lo.
Quem voa nunca cai.

#### O raio

O **raio** é o único ataque que não é um tirinho, e o único cujo dano vem de um bloco separado.
Ele tem três tempos: primeiro avisa por um segundo, com um risco fino piscando (é a sua chance de
sair da frente); depois liga um feixe grosso, que desce reto do inimigo até a borda de baixo e
machuca quem estiver embaixo dele; e então recarrega.

Para o feixe machucar, use **Para cada raio do tipo … que acertar o sprite …** dentro do "a cada
quadro" e ponha lá dentro o "Machucar o sprite com o dano de contato do inimigo". Sem esse bloco o
raio aparece e não faz nada. Diferente do tiro, o raio NÃO some ao acertar: ele fica ligado até o
tempo acabar.

#### Soltar, atualizar, desenhar e reagir

- **Soltar um inimigo do tipo**. Solte quantos quiser, cada um nasce com a vida e o dano do tipo.
  O campo **chamado** é opcional: preencha quando quiser falar DAQUELE inimigo depois, por
  exemplo para desenhar a barra de vida do chefão.
- **Atualizar os inimigos do tipo** (dentro do "a cada quadro"). Move pelos comportamentos,
  anima, atira e REMOVE os derrotados (vida 0 → partículas + "Quando for derrotado").
- **Desenhar os inimigos do tipo**. Todos, mais os tiros e o raio deles.
- **Ao pisar no tipo usar modo…** escolhe derrotar, causar 1 de dano, achatar, virar casco
  ou impedir a pisada por espinhos. O dano permite chefes com vários golpes.
- Escolheu **virar casco**? O gesto é o dos jogos clássicos: **pisar recolhe** o bicho num casco
  PARADO, que não machuca ninguém, e **encostar nele o CHUTA**. O casco andando derrota inimigos
  de qualquer tipo e machuca quem tocar, menos você enquanto ainda estiver saindo de cima dele.
  ⚠️ Ponha também o **Atualizar os cascos do tipo … no Mundo …** dentro do "a cada quadro": é ele
  que faz o casco andar e rebater. Sem esse bloco o casco fica parado para sempre. E a queda vem
  do **Aplicar a gravidade ao grupo**, como em todo inimigo.
- **Animação dos inimigos do tipo no estado …**. Guarda a animação de um estado para TODOS os
  inimigos do tipo (o "Atualizar" troca sozinho).
- **Para cada tiro do tipo … que acertar o sprite …** e **Para cada raio do tipo … que acertar o
  sprite …**. Dois dos TRÊS jeitos de o ataque do inimigo alcançar você. O terceiro é encostar no
  corpo dele, que você pega com o **Para cada sprite do grupo … que colidir com o sprite …**
  (em **💥 Colisões**), porque o tipo de inimigo é um grupo.
- **Machucar o sprite com o dano de contato do inimigo**. Tira a vida e faz o sprite piscar;
  enquanto pisca ele não leva dano de novo, então ficar encostado não acaba com a vida dele de uma
  vez. Este é o dano do TIPO, o mesmo nos três jeitos; para cada ataque doer um tanto diferente,
  veja a receita do chefe mais abaixo.
- **Quando um inimigo do tipo … levar dano**. Roda toda vez que um inimigo desse tipo perde vida
  e continua vivo. É o coração de um chefão com várias formas ou estados: leia a vida dele aqui dentro e, na metade,
  deixe-o furioso (trocar a cor, atirar mais rápido, juntar um comportamento novo).
- **Derrotar os inimigos do tipo quando o sprite pular em cima**. O pulo clássico de plataforma:
  caindo em cima derrota o inimigo e dá um quiquinho; encostar de lado não derrota.
- **Ajustar no tipo de inimigo…**. Força e ritmo do pulo (saltador); alcance (quem voa e também
  medroso e arrancada, para quem o alcance é a distância que faz o inimigo reagir); de quanto em
  quanto tempo ele age e a velocidade do tiro (quem atira, e o raio usa o mesmo relógio para
  recarregar); quantos quadros o raio fica ligado; voltar depois de tantos quadros (renascer); e a
  vida dos próximos que nascerem. Quem aproveita cada valor:
  - **força do pulo** e **ritmo do pulo**: saltador.
  - **alcance**: voador, rondador, zigue-zague, mergulhador, teleporte, arrancada e medroso
    (para quem anda no chão, o alcance é a distância que faz o inimigo reagir).
  - **de quanto em quanto tempo ele age**: atirador, atirador alinhado, atirador de lado,
    atirador esperto, atirador em leque, bombardeiro, teleporte, chefão e raio.
  - **velocidade do tiro**: atirador, atirador alinhado, atirador de lado, atirador esperto,
    atirador em leque, bombardeiro e chefão.
  - **voltar depois de tantos quadros**: renascer. **Quanto tempo o raio fica ligado**: raio.
  - **vida**: todos, e só os que nascerem daqui para a frente.
  ⚠️ O molde roda ANTES de tudo, então um ajuste que está lá vale para o jogo inteiro. Para endurecer
  só a onda seguinte, ponha o "Ajustar" dentro de um evento ou de um "A cada N segundos": aí ele
  acontece no meio da partida, e quem já nasceu fica como estava.
- O tipo É um grupo: os blocos de **Muitos (grupos)** funcionam nele. Patrulha em mapa de tiles:
  some o "Impedir de atravessar" num "Para cada" que o inimigo vira sozinho na parede.

#### Um bloco só para VÁRIOS tipos de inimigo

Com mais de um tipo, cada tipo é um grupo separado, então uma ação que vale para todos (o seu tiro
acertando qualquer inimigo, contar quantos faltam) pediria um bloco por tipo. O atalho é:

- **Criar o grupo … com os inimigos de todos os tipos**. Ponha em **🧩 Meus moldes**, junto dos
  tipos; tanto faz se antes ou depois deles. Ele é uma JANELA para todos os inimigos, sempre atualizada: quem nasce entra e quem morre
  sai na hora, sem você limpar nada. Aí a ação compartilhada vira um bloco só.

O que funciona nesse grupo, e o que não:

- **Funciona igual a qualquer grupo**: as colisões (**Para cada colisão entre os grupos**, **Para
  cada sprite do grupo que colidir com o sprite**), **Para cada sprite do grupo**, **Quantos sprites
  tem no grupo**, **Desenhar o grupo**, **Desenhar o grupo ordenado pela base** e **Impedir de
  atravessar os sprites de um grupo**.
- **Vale para todos os tipos de uma vez**: **Esvaziar o grupo** limpa a fase inteira; **Tirar o
  sprite do grupo** tira do tipo dele; **Tirar do grupo quem sair da tela** poda todos.
- ⚠️ **Não vale**: **Atualizar o grupo** e **Aplicar a gravidade do mundo aos sprites do grupo** (o
  "Atualizar os inimigos do tipo" já move cada um pelo comportamento dele; aqui eles andariam duas
  vezes por quadro), **Pôr o sprite no grupo** (em qual tipo ele entraria?) e **Trazer para a
  frente**/**Mandar para trás**. Nesses casos o Console explica o que usar no lugar.

O **Atualizar** e o **Desenhar os inimigos do tipo** continuam sendo um por tipo, porque cada tipo
tem o seu jeito de se mexer e os seus tiros. É só a parte repetida que sai.

#### Receitas que a gente monta com o que já existe

- **Um chefe com três ataques que doem diferente**: o tipo guarda UM dano, que vale para o corpo dele
  e para os tirinhos. Mas quem tira a vida do jogador é sempre um bloco que você põe, e é ali que
  cada ataque ganha o número dele. Em vez do "Machucar o sprite com o dano de contato do inimigo",
  use o **Machucar o sprite ⟨nave⟩ em ⟨2⟩ e deixá-lo invencível por ⟨45⟩ quadros** (categoria
  ❤️ Vida) dentro de cada bloco de acerto: no **Para cada sprite do grupo ⟨rei⟩ que colidir com o
  sprite ⟨nave⟩** o encostão, no **Para cada tiro do tipo ⟨rei⟩ que acertar o sprite ⟨nave⟩** o tiro,
  e no **Para cada raio do tipo ⟨rei⟩ que acertar o sprite ⟨nave⟩** o raio. Aí é só escolher três
  números, tipo 1, 2 e 4.
  ⚠️ **No raio, os quadros piscando não são enfeite.** O feixe fica ligado uns 3 segundos e esse
  bloco roda a cada quadro, então sem eles a vida some de uma vez. Com 45, o feixe acerta umas 4
  vezes enquanto está ligado, que é o ritmo certo.
- **Cada arma sua tirando um tanto de vida**: do seu lado funciona igual, e o tipo de inimigo É um
  grupo, então ele aparece no seletor. No **Para cada colisão entre os grupos ⟨meusTiros⟩ e ⟨rei⟩**,
  ponha o "Mudar a vida do sprite ⟨alien⟩ em ⟨-2⟩" (o dano DAQUELA arma) e o "Tirar o sprite ⟨tiro⟩
  do grupo ⟨meusTiros⟩". Aqui não precisa de quadros piscando, porque o tiro some ao acertar. E não
  tire o inimigo do grupo na mão: deixe a vida chegar a zero, que o **Atualizar os inimigos do tipo**
  cuida das partículas e do "Quando for derrotado".
- **Um inimigo que às vezes não toma dano**: no bloco de colisão do seu tiro com ele, ponha o
  "Mudar a vida" DENTRO de um **se ⟨tem chance de 50%?⟩**. Metade dos tiros passa batido. Ponha um
  "Fazer o sprite piscar" no senão, para dar o barulhinho de escudo.
- **Um chefão que renasce mais forte**: crie DOIS tipos em 🧩 Meus moldes (o rei e o rei renascido,
  com mais vida). No **Quando um inimigo do tipo ⟨rei⟩ for derrotado**, solte um do tipo
  ⟨rei renascido⟩ na posição dele. Ali dentro também vai o prêmio que você quiser dar ao jogador.

### Desenhe personagens por código

Na categoria **🎨 Desenho**, faça o visual do sprite com formas, sem imagem nenhuma:

- **Desenhar a figura … assim**. Monte um desenho com **retângulo, círculo, oval, triângulo, linha** e dê um nome. Você desenha DENTRO do quadro do sprite: x/y começam no cantinho (0,0). Dá para usar os blocos de **Canvas** aqui dentro também (gradiente, curvas…).
- **Pintar receita de formas** guarda muitos retângulos e círculos em um único campo JSON.
  É a opção avançada para pixel art extensa: o desenho continua vetorial e editável, mas não
  transforma cada pequeno detalhe em vários blocos SVG na área de programação.
- **Criar sprite … com a figura**. Cria um sprite que usa esse desenho; ele anda, gira, vira, anima e colide como qualquer outro. **Trocar a figura** muda o desenho de um sprite.
- **a largura / a altura da figura**. O tamanho do sprite que está sendo desenhado (para centralizar). Veja o exemplo **"Jogo desenhado por código"**.
`)
