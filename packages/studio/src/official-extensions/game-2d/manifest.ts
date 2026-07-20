import type { ExtensionManifest } from '#extensions'
import {
  animatedHeroExample,
  asteroidsClassicExample,
  asteroidsExample,
  balloonExample,
  cameraAdventureExample,
  codeDrawnExample,
  dinoRunExample,
  enemyPlatformerExample,
  gorilasExample,
  gorilasVsRobotExample,
  platformerExample,
  pongExample,
  stickHeroExample,
  tilemapExample,
} from './examples'

export const gameTwoDManifest: ExtensionManifest = {
  id: 'game-2d',
  name: 'Jogo 2D',
  version: '0.32.0',
  description:
    'Blocos para criar jogos 2D no Canvas: sprites (cor, imagem, animação por estado com virada automática) ou desenhados por código, grupos de muitos sprites, inimigos com comportamento (patrulha, perseguidor, voador, saltador, atirador), movimento, física, colisão sólida, tiles PLATAFORMA (one-way: pisa por cima, passa por baixo), efeitos, tiles/tilemaps (do Pinta ou por upload), HUD, telas/cenas, som, e KITS por tema. Espaço, dino, gorilas, equilibrista e balão.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: listeners de pointer (onPointer). Audio: Web Audio em playSound.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: `## Jogo 2D

Esta extensão adiciona um pequeno runtime didático em \`window.SZGame2D\`
que ajuda a montar jogos 2D simples sobre Canvas API. O código gerado é
intencionalmente legível. Quando você abrir o modo Código vai ver
chamadas explícitas para \`SZGame2D.createSprite(...)\` e \`SZGame2D.gameLoop(...)\`.

### Blocos disponíveis

- **⚙️ Ao iniciar**. Prepare a tela, crie personagens, grupos e variáveis. Esta
  área roda novamente depois de **Reiniciar o jogo**.
- **⚡ Quando acontecer**. Coloque os chapéus “Quando…”: tecla, clique, contato e outras
  reações. O runtime registra tudo uma vez por partida.
- **🔁 Enquanto estiver rodando**. Coloque “A cada quadro”, “A cada N quadros” e “A cada N
  segundos”. Cada raiz tem seu próprio agendamento e não fica dentro de outra.

Esses são os destinos no projeto. Na paleta, os blocos ficam organizados pelo que
fazem: **🎛️ Controles** reúne teclado e clique/toque; **💥 Colisões** reúne contato
entre sprites e grupos; **⏱️ Tempo e repetição** reúne os três “A cada…”, recarga e
tempo de vida. Assim você procura pelo assunto e usa as aulas para aprender em
qual área colocar cada bloco.

- **Preparar o jogo em tela cheia**. Atalho para começar: prepara a tela (largura × altura) ocupando a janela, responsiva (mantém a proporção e redimensiona sozinha), **centralizada**, com uma **cor de fundo** que combina com o jogo (vai no canvas e na sobra ao redor). O campo de descrição explica objetivo e controles para quem usa leitor de tela. Não precisa criar o canvas no HTML. Os blocos individuais continuam disponíveis para montar na mão.
- **Preparar o jogo para ocupar a tela toda**. Como o de cima, mas **sem dimensões**: o canvas preenche a tela INTEIRA (sem barras nas laterais) e a área do jogo **acompanha** o tamanho da janela. A resolução do jogo passa a ser o tamanho da tela. Também pede uma descrição acessível. Aqui "a largura/altura da tela" mudam com a janela, então centralize por eles (não por números fixos). Combine com "entrar em tela cheia" para o jogo tomar o monitor todo. Use UM dos dois "Preparar", no começo.
- **Criar sprite**. Define um objeto com \`x\`, \`y\`, \`largura\`, \`altura\`, \`cor\`.
- **Desenhar o sprite**. Desenha o sprite no contexto do canvas.
- **Mover em 4 direções**. Move o sprite com as setas do teclado (ver "Movimento" abaixo).
- **Mudar a posição do sprite** / **Mudar a velocidade do sprite**. Atualiza x/y e vx/vy.
- **Guardar em X se o sprite A colide com o sprite B**. Devolve sim/não por interseção retangular.
- **Criar pontuação**. Declara a variável de pontos.
- **Mostrar fim de jogo com o texto**. Escreve a mensagem em vermelho no canvas.
- **A cada quadro do jogo...**. Registra uma atualização no agendador do motor, em
  passos fixos de 60 Hz. Vários blocos desse tipo coexistem sem cancelar um ao outro.

O Estúdio liga o motor automaticamente. O antigo bloco “Quando o jogo começar”
existe apenas para migrar projetos salvos e não aparece na paleta.

### Física, áudio e mouse (v0.2.0)

- **Definir gravidade** / **Aplicar velocidade**. Integra vx/vy e soma a gravidade.
- **Ricochetear nas bordas**. Quica o sprite nas bordas do canvas.
- **Colisão por círculo**. Colisão mais justa para objetos redondos.
- **Tocar som**. Bip sintetizado via Web Audio (sem arquivos). Permissão \`audio\`.
- **Quando clicar/tocar**. Roda um bloco com a posição do ponteiro. Permissão \`mouse\`.

### Imagens e animação (v0.3.0)

Use a aba **Assets** para enviar imagens do computador ou escolher da biblioteca;
depois é só usar o **nome** da imagem nos blocos.

- **Criar sprite com imagem**. Um sprite que mostra uma imagem (em vez de um retângulo colorido).
- **Trocar imagem do sprite**. Troca a imagem fixa do sprite.
- **Carregar spritesheet**. Prepara uma folha com vários quadros (informe o tamanho de cada quadro).
- **Animar sprite**. Percorre os quadros da spritesheet a N fps.
- **Desenhar quadro**. Desenha um quadro específico da spritesheet (controle manual).

Enquanto a imagem carrega (ou se o nome não existir), o sprite aparece como um
retângulo da cor. O jogo nunca quebra por falta de imagem.

### Movimento e efeitos (v0.4.0)

Use estes blocos dentro do **"A cada quadro do jogo"**:

- **Plataforma**. Esquerda/direita + pulo com gravidade (chão = base da tela).
- **4 direções (top-down)**. Anda nas 4 direções; a diagonal não fica mais rápida.
- **Seguir o ponteiro**. O sprite persegue o mouse/dedo.
- **Manter dentro da tela**. Gruda nas bordas em vez de sumir.
- **Clarão**. Pinta a tela com uma cor translúcida (ex.: ao levar dano).
- **Tremer a tela**. Sacode e para sozinho (chame uma vez, ex.: numa explosão).
- **Soltar partículas** + **Atualizar e desenhar as partículas**. Uma explosão de
  partículas no ponto x/y; lembre de desenhá-las a cada quadro (somem sozinhas).

### Tiles / tilemaps (v0.5.0)

Tiles montam cenários (chão, paredes, plataformas) a partir de UMA imagem com vários
quadros (o **tileset**). Escolha um da aba **Assets** (ex.: \`tileset\`).

- **Criar mapa de tiles**. Informe o tileset, o tamanho do tile (px) e a **grade**:
  cada número escolhe um quadro do tileset; \`;\` separa as linhas e espaço separa as
  colunas; \`.\` é uma célula vazia. Em **tiles sólidos**, liste os números que barram o
  jogador (ex.: \`1\`).
- **Desenhar mapa**. Desenha o mapa na tela (use no "a cada quadro", antes do sprite). Com
  "tiles de 0 px" ele ENCAIXA sozinho no canvas (centralizado, sem distorcer); um valor
  como \`32\` fixa o tamanho do tile na tela (controle de zoom do mapa).
- **Impedir de atravessar tiles sólidos**. O sprite pousa no chão e bate nas paredes;
  use a cada quadro, depois de mover o sprite.
- **Impedir de atravessar os sprites de um grupo** (em 📦 Muitos). Mesma colisão, mas
  contra obstáculos SEM mapa: jogue as pedras/casas (até desenhadas por figura) num grupo
  e o sprite não atravessa nenhuma delas, deslizando pela beirada.
- **Impedir de atravessar o sprite** (em 📦 Muitos). A mesma ideia, mas contra UM sprite
  só (uma parede, uma plataforma solta), sem precisar montar um grupo.

Enquanto o tileset carrega (ou se faltar), os tiles aparecem como retângulos. O jogo
nunca quebra por falta de imagem.

### Grupos, HUD e telas (v0.6.0)

Para jogos com MUITOS sprites (tiros, inimigos, estrelas) e telas de início/vitória/derrota:

- **Grupos**. \`Criar grupo\`, \`Criar no grupo … um sprite\` (x/y/vx/vy aceitam número
  aleatório), \`Atualizar/Desenhar o grupo\`, \`Para cada sprite do grupo\`, \`quantos
  sprites tem no grupo\`, \`Esvaziar/Tirar do grupo\`, \`Tirar do grupo quem sair da tela\`.
  Há também \`Mover o grupo sem gravidade\`. Para os TIROS do jogador num jogo COM
  gravidade (senão os tiros arqueiam para baixo em vez de ir reto).
- **Colisão de grupo**. \`Quando um sprite do grupo A encostar num do grupo B\` roda o
  "fazer" com os dois sprites (use dentro do "a cada quadro").
- **Temporizadores**. \`A cada N quadros/segundos fazer\` (ótimo para criar inimigos).
- **HUD no canvas**. \`Mostrar placar\`, \`Escrever\`, \`Desenhar vidas (corações)\`, \`Barra de … / …\`.
- **Telas/cenas**. \`Ir para a tela\` e \`a tela atual é … ?\` aceitam tanto os
  nomes prontos quanto nomes inventados (como \`ganhou1\`); \`Mostrar tela (título/subtítulo/dica)\`,
  \`Reiniciar o jogo\`. Prepare grupos, sprites, variáveis e a tela inicial em **⚙️ Ao iniciar**;
  registre teclas, cliques e contatos em **⚡ Quando acontecer**; coloque cada atualização periódica
  como uma raiz de **🔁 Enquanto estiver rodando**. As três áreas compartilham o estado da partida.
  Reiniciar limpa tudo e executa novamente as áreas usadas pelo projeto.
- **Cenário**. \`Desenhar fundo de estrelas\` e \`Mover o sprite com o dedo (só na horizontal)\`.

### Kit espaço (v0.7.0)

A categoria **🚀 Kit espaço** reúne atalhos PRONTOS (não genéricos) para jogos de nave
espacial. Os desenhos, efeitos e sons já vêm feitos: criar nave (cabine + foguinho animado,
cores do corpo e das asas escolhidas), criar asteroide no grupo (pedra que gira), desenhar
fundo de estrelas (céu com gradiente e estrelas que cintilam), soltar
explosão e tocar som de tiro/explosão. Os blocos genéricos seguem nas categorias normais. A ideia é ir somando KITS de outros temas (corrida, fazenda…).

### Nave clássica: girar + impulsionar (v0.10.0)

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

### Acabamentos (v0.8.0)

- **Criar tiro no grupo**. Um tiro redondo com brilho (em vez de retângulo).
- **Mover o sprite com as setas**. Anda só na horizontal com ← → (1 bloco).
- **Fazer o sprite piscar**. O sprite fica intermitente por N quadros (ex.: invencibilidade).
- **A cada N quadros** agora aceita um número OU uma variável (spawn que acelera por fase).
- Asteroides nascem com tamanhos variados sozinhos; a tela de início/fim escurece de leve
  (o jogo aparece atrás) e quebra o subtítulo em linhas.

### Tela responsiva

O bloco **Fazer a tela preencher N% da janela** (genérico) deixa o canvas grande, nítido e responsivo: ocupa quase toda a janela e se reajusta sozinho quando ela muda de tamanho, mantendo a proporção. As coordenadas do jogo continuam as mesmas, mas o desenho passa a ser feito na resolução REAL da tela. Fica grande E nítido (sem borrar), em qualquer tamanho.

Para começar rápido, o bloco **Preparar o jogo em tela cheia** (no grupo ✨ Aparência) já faz tudo isso de uma vez. Cria a tela com o tamanho escolhido, centraliza na janela e pinta o fundo (canvas e a sobra ao redor) com a cor do jogo. Sem precisar criar o canvas no HTML. Os blocos individuais (criar a tela, preencher %) continuam disponíveis para quem quer montar na mão.

### Pulo no chão e Kit dino (v0.9.0)

Para jogos de **corrida** (estilo "Dino Run"), em que o personagem não anda para os lados, só pula e abaixa:

- **Fazer o sprite pular no chão** (genérico, em Movimento). Gravidade + pouso na base da tela + pulo
  com ↑/Espaço/W ou um toque. Serve a qualquer jogo de pulo.
- A categoria **🦕 Kit dino** reúne atalhos PRONTOS: **criar dinossauro** (desenhado, com perninhas que
  correm sozinhas), **controlar o dinossauro** (pula e abaixa, com gravidade/chão/poeira já embutidos),
  **criar obstáculo no grupo** (cacto/pedra no chão para pular, pássaro no alto para abaixar, ou sorteado),
  **criar ovo de bônus no grupo** (item para coletar), **desenhar fundo de floresta** (céu, sol, nuvens,
  morros e grama que rola. Parallax), e **sons** de pulo, dano e coletar.
- O **recorde** (maior pontuação) que persiste entre partidas usa os blocos genéricos de armazenamento
  (\`localStorage\`), não precisa de bloco novo.

Veja o exemplo **"Nave contra Asteroides"** para um jogo de tiro e **"Dino Run"** para um jogo de corrida. Ambos completos, montados só com blocos.

### Kit gorilas: batalha de bananas (v0.11.0)

A categoria **🦍 Kit gorilas** monta um jogo de artilharia por turnos (estilo "Gorillas") para **2 jogadores** no mesmo aparelho. Cidade, física e crateras já vêm prontas: **Criar/Desenhar a cidade**, **Pôr o gorila no lado**, **Sortear/Desenhar o vento**, **Mirar arrastando** (mais longe = mais forte) + **soltou a mira?** → **Jogar a banana**, **Mover/Desenhar a banana** (gravidade + vento entortam), **a banana acertou o gorila?** (vitória) / **bateu num prédio?** (abre cratera, troca de turno), e **sons** de queda/explosão. Tem também blocos genéricos de canvas em ✏️ Traçado (retângulo ao traçado, recortar/clip, ponto dentro do traçado?) e os eventos apertar/soltar o mouse. Veja o exemplo **"Guerra de Gorilas"**.

### Kit gorilas: robô adversário (v0.12.0)

- **O robô do gorila … joga na cidade … mirando no …**. Um lançador **computador (IA)**: ele simula vários arremessos, escolhe o melhor, "pensa" um instante e joga sozinho. Use no "a cada quadro", na vez do robô, passando o gorila INIMIGO. Dá pra fazer **1 jogador vs computador** (troque o ramo de um gorila por este bloco) ou **autoplay** (troque os dois). Veja o exemplo **"Guerra de Gorilas vs Robô"**.
- **Mostrar ângulo e força da mira**. Escreve no canto o ângulo (graus) e a força do último arremesso; bom para ver o que o robô escolheu.

### Fazer jogos parecidos "na mão" (sem o facilitador, v0.12.0)

Dá pra montar jogos deste estilo **só com blocos genéricos** (HTML + CSS + Programação/Canvas), sem a extensão. Para isso entraram blocos novos no núcleo:

- **Mudar o estilo do elemento por código** (elemento.style.x = …) e **Definir atributo**. Posicionar/mover/mostrar/esconder painéis e formas, ou mudar stroke/fill/etc. De um SVG por código.
- **Blocos de SVG** (categoria **🎨 SVG**): caixa SVG, grupo, caminho (d), círculo, retângulo, linha e "reusar". Bom para um **moinho/cata-vento que gira por CSS** (@keyframes).
- **o sistema está no modo escuro?** (lê prefers-color-scheme) e **densidade de pixels da tela** (devicePixelRatio). Para temas claro/escuro e canvas nítido.
- A **tela cheia** já existia (entrar/sair/alternar e "está em tela cheia?").

Veja o exemplo clássico **"Cidade & Moinho (na mão)"** (no painel de Extensões → "Exemplos clássicos"). Um mini-Gorillas montado SÓ com esses blocos: arrastar a bomba, vento, moinho SVG girando, painel de HTML e botão de tela cheia.

### Kit equilibrista (v0.13.0)

Categoria **🤸 Kit equilibrista**. Atalhos PRONTOS para um jogo estilo "Stick Hero":
estique o bastão do tamanho certo e atravesse para a próxima plataforma. O jogo
inteiro (herói, plataformas, bastões, fase) mora no runtime; você só guarda o jogo
numa variável. O controle é pelo ponteiro: **segurar** estica o bastão, **soltar**
derruba. Não precisa registrar teclas. Melhor num canvas **em pé** (ex.: 360×480).

- **Criar equilibrista**. Monta o jogo lendo o tamanho da tela. Guarde numa variável
  (ex.: \`jogo\`). Faça UMA vez, FORA do "a cada quadro do jogo".
- **Atualizar o equilibrista**. Um passo do jogo + desenha tudo (placar e dicas).
  Use DENTRO do "a cada quadro do jogo". Acertar o meio (faixa vermelha) vale 2 pontos;
  ele recomeça sozinho quando você toca depois de cair.
- **pontos do equilibrista** / **o equilibrista caiu?**. Para o placar e o fim de jogo.
- **Recomeçar o equilibrista**. Zera o jogo (bom para um botão "de novo").

Veja o exemplo pronto **"Equilibrista"** na vitrine.

### Kit balão (v0.13.0)

Categoria **🎈 Kit balão**. Atalhos PRONTOS para um jogo estilo balão de ar quente:
suba segurando o ponteiro (gasta combustível), voe baixo para economizar e desvie das
árvores. O jogo mora no runtime; você guarda tudo numa variável. Melhor num canvas
**deitado** (ex.: 560×360).

- **Criar balão**. Monta o jogo (céu, colinas, árvores, combustível) lendo o tamanho
  da tela. Guarde numa variável. Faça UMA vez.
- **Atualizar o balão**. Um passo do jogo + desenha tudo (medidor de combustível,
  metros e dicas). Use DENTRO do "a cada quadro do jogo". Recomeça ao tocar depois do fim.
- **metros do balão** / **combustível do balão** (0 a 100) / **o balão bateu/acabou?**. Para o placar, a barra de combustível e o fim de jogo.
- **Recomeçar o balão**. Zera o jogo.

Veja o exemplo pronto **"Balão"** na vitrine.

### Som rico: efeitos, notas e música (v0.14.0)

A categoria **🔊 Som** ganhou uma biblioteca de sons PRONTOS. Tudo sintetizado (Web Audio), sem
precisar de arquivos:

- **Tocar efeito**. Um menu com dezenas de efeitos típicos de jogo: moeda, joia, vida, power-up,
  subir de nível, coletar, tiro, tiro grande, explosão, batida, dano, socar, pulo, aterrissar,
  zunido, passo, quicar, assobio, vitória, derrota, começar, alarme, clique, confirmar, erro,
  selecionar e aviso. É só escolher no menu. Um bloco só dá acesso a todos.
- **Tocar a nota … por … ms**. Toca uma nota musical (dó, ré, mi, fá, sol, lá, si e dó agudo);
  junte várias para montar uma melodia.
- **Tocar música de fundo**. Uma musiquinha em loop (aventura, alegre, tensão, calma ou vitória);
  só uma música toca por vez. **Parar a música de fundo** silencia.

Lembrete: o navegador só deixa o som tocar **depois** de um clique ou tecla do jogador.

### Blocos genéricos Tier 1 (v0.15.0)

Tijolinhos que faltavam para montar mais tipos de jogo, em categorias novas e existentes:

- **🎯 Mira e contas**: **Apontar para** e **Mover na direção de** (perseguição/IA), **a distância entre** e
  **o ângulo até** dois sprites, **um número de … a …** (sorteia sempre um inteiro, incluindo as pontas) e
  **tem chance de … %?** (evento aleatório).
- **❤️ Vida**: **Dar vida**, **Mudar a vida** (negativo = dano), **a vida do sprite** e **ainda tem vida?**.
- **⏱️ Tempo e repetição**: **pode agir? (recarga de N quadros)** (cadência de tiro por sprite) e
  **Tirar do grupo quem viveu mais de N segundos** (tiros somem sozinhos), junto dos blocos **A cada…**.
- **✨ Aparência**: **Virar** (espelhar esquerda/direita), **Mudar a transparência**, **Mudar o tamanho** e
  **Multiplicar o tamanho** do sprite.
- **🕹️ Movimento**: **Dar a volta na tela** (sai de um lado, reaparece no outro. Estilo Pac-Man/Asteroids).
- **📺 Telas e cenas**: **Pausar o jogo** CONGELA tudo (o "a cada quadro" para de rodar, e o "quando
  encostar" também), **Continuar o jogo** descongela e **o jogo está pausado?** lê o estado. Os eventos de
  toque **"Quando apertar a tecla"** e **"Quando clicar/tocar"** continuam funcionando na pausa DE PROPÓSITO
  assim você pode fazer "aperte R para continuar". Para mostrar "Você ganhou/perdeu", **desenhe a tela
  ANTES de Pausar** (ela fica congelada por cima). Para um fim de jogo com recomeço, prefira as **cenas**
  (**Ir para a tela 'perdeu'/'ganhou'** + **a tela atual é …?**): o "a cada quadro" decide o que mostrar e o
  jogo segue rodando a tela de fim.

### Blocos genéricos Tier 2 (v0.16.0)

Para mundos maiores que a tela e jogos mais ricos:

- **🎥 Câmera**: **Fazer a câmera seguir o sprite** (mundo maior que a tela, presa às bordas), **Mover a
  câmera** na mão e **a posição x/y da câmera** (para fundos em parallax). A câmera rola só o MUNDO. Desenhe o HUD (placar, vidas, textos) DEPOIS do mundo que ele fica fixo na tela. ⚠️ Cliques/toques
  continuam em coordenadas de tela; com câmera, a posição no mundo é tela + câmera.
- **🗺️ Mapa** (destrutível): **Quebrar o tile** onde está um sprite (mineração/destruição), **pôr um tile**
  e **o número do tile** onde está o sprite (ler/construir em tempo real).
- **📦 Muitos**: **Trazer para a frente** / **Mandar para trás**. Controla quem é desenhado por
  cima de quem dentro de um grupo.
- **✨ Aparência** (depuração): **Mostrar a caixa de colisão** de um sprite e **Mostrar os FPS**. Para
  enxergar colisões e a performance enquanto cria.

### Posição & tamanho do sprite (valores, v0.18.0)

Bloquinhos de VALOR (na categoria **📐 Posição & tamanho**) que poupam a criança de fazer as contas na
mão. Em vez de \`x + largura / 2\`, ela encaixa um bloco pronto:

- **a posição x / y do sprite**. Onde o sprite está (borda esquerda / borda de cima).
- **a largura / a altura do sprite**. O tamanho do sprite, em pixels.
- **o centro x / y do sprite**. O MEIO do sprite (já soma metade da largura/altura). Ótimo para atirar,
  mirar ou posicionar uma coisa a partir do centro de outra (ex.: o tiro sai do centro da nave).

### Posição aleatória na tela (valores, v0.19.0)

Na categoria **🎯 Mira e contas**, dois valores para um sprite nascer num lugar SORTEADO sem a criança
montar a continha \`Math.random() * largura\` na mão:

- **um x aleatório na tela** / **um y aleatório na tela**. Sorteia uma posição dentro da largura/altura
  da tela. Encaixe no x (ou y) ao **criar** ou **spawnar** um sprite. Ex.: asteroides/estrelas nascendo
  em pontos aleatórios. (Para um intervalo específico de números, continua valendo **um número de … a …**.)

### Animação por estado + flip automático (v0.22.0)

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

### Mapa pronto do Pinta (v0.22.0)

- **Criar mapa do meu desenho** (🗺️ Mapa). Desenhe o MAPA no Pinta, toque no 🚀 e escolha o
  desenho neste bloco: grade, peças e sólidos vêm JUNTOS, nada de colar texto.
- No **Criar mapa de tiles** (o clássico, para montar/editar na mão), a GRADE agora abre um
  mini-editor visual: escolha uma peça e PINTE as células (borracha apaga, dá para mudar
  linhas/colunas).

### Tipos de inimigo (v0.22.0)

Na categoria **😈 Inimigos**, CLASSES de inimigo prontas (como o Goomba e o Koopa do Mario):

- **Criar tipo de inimigo**. Defina UMA vez comportamento e atributos (vida, velocidade, dano
  de contato, tamanho, cor OU imagem): patrulha (anda e vira na parede/borda), perseguidor,
  voador (deitado ou em pé), saltador e atirador (fica no chão e atira no alvo).
- **Soltar um inimigo do tipo**. Solte quantos quiser, cada um nasce com a vida/dano do tipo.
- **Atualizar os inimigos do tipo** (dentro do "a cada quadro"). Move pelo comportamento,
  anima, atira e REMOVE os derrotados (vida 0 → partículas + "Quando for derrotado").
- **Desenhar os inimigos do tipo**. Todos + os tiros deles.
- **Quando um tiro acertar o sprite** + **Machucar o sprite com o dano do inimigo**. Dano de
  contato com INVENCIBILIDADE de piscar (não drena a vida no encostão contínuo).
- O tipo É um grupo: os blocos de **Muitos (grupos)** funcionam nele. Patrulha em mapa de tiles:
  some o "Impedir de atravessar" num "Para cada" que o inimigo vira sozinho na parede.
- **Ajustar no tipo de inimigo…**. Força/ritmo do pulo, alcance do voo, cadência/velocidade do tiro.

### Desenhar por código (v0.23.0)

Na categoria **🎨 Desenho**, faça o visual do sprite com formas, sem imagem nenhuma:

- **Desenhar a figura … assim**. Monte um desenho com **retângulo, círculo, oval, triângulo, linha** e dê um nome. Você desenha DENTRO do quadro do sprite: x/y começam no cantinho (0,0). Dá para usar os blocos de **Canvas** aqui dentro também (gradiente, curvas…).
- **Criar sprite … com a figura**. Cria um sprite que usa esse desenho; ele anda, gira, vira, anima e colide como qualquer outro. **Trocar a figura** muda o desenho de um sprite.
- **a largura / a altura da figura**. O tamanho do sprite que está sendo desenhado (para centralizar). Veja o exemplo **"Jogo desenhado por código"**.
`,
  examples: [
    pongExample,
    animatedHeroExample,
    platformerExample,
    enemyPlatformerExample,
    codeDrawnExample,
    tilemapExample,
    asteroidsExample,
    asteroidsClassicExample,
    dinoRunExample,
    gorilasExample,
    gorilasVsRobotExample,
    stickHeroExample,
    balloonExample,
    cameraAdventureExample,
  ],
}
