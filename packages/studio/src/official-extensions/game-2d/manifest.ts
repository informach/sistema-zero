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
  version: '0.26.0',
  description:
    'Blocos para criar jogos 2D no Canvas: sprites (cor, imagem, animação por estado com virada automática) ou desenhados por código, grupos de muitos sprites, inimigos com comportamento (patrulha, perseguidor, voador, saltador, atirador), movimento, física, colisão sólida, efeitos, tiles/tilemaps (do Pinta ou por upload), HUD, telas/cenas, som, e KITS por tema — espaço, dino, gorilas, equilibrista e balão.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: listeners de pointer (onPointer). audio: Web Audio em playSound.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: `## Jogo 2D

Esta extensão adiciona um pequeno runtime didático em \`window.SZGame2D\`
que ajuda a montar jogos 2D simples sobre Canvas API. O código gerado é
intencionalmente legível — quando você abrir o modo Código vai ver
chamadas explícitas para \`SZGame2D.createSprite(...)\` e \`SZGame2D.gameLoop(...)\`.

### Blocos disponíveis

- **Preparar o jogo em tela cheia** — atalho para começar: prepara a tela (largura × altura) ocupando a janela, responsiva (mantém a proporção e redimensiona sozinha), **centralizada**, com uma **cor de fundo** que combina com o jogo (vai no canvas e na sobra ao redor). Não precisa criar o canvas no HTML. Os blocos individuais continuam disponíveis para montar na mão.
- **Preparar o jogo para ocupar a tela toda** — como o de cima, mas **sem dimensões**: o canvas preenche a tela INTEIRA (sem barras nas laterais) e a área do jogo **acompanha** o tamanho da janela — a resolução do jogo passa a ser o tamanho da tela. Aqui "a largura/altura da tela" mudam com a janela, então centralize por eles (não por números fixos). Combine com "entrar em tela cheia" para o jogo tomar o monitor todo. Use UM dos dois "Preparar", no começo.
- **Criar sprite** — define um objeto com \`x\`, \`y\`, \`largura\`, \`altura\`, \`cor\`.
- **Desenhar o sprite** — desenha o sprite no contexto do canvas.
- **Mover em 4 direções** — move o sprite com as setas do teclado (ver "Movimento" abaixo).
- **Mudar a posição do sprite** / **Mudar a velocidade do sprite** — atualiza x/y e vx/vy.
- **Guardar em X se o sprite A colide com o sprite B** — devolve sim/não por interseção retangular.
- **Criar pontuação** — declara a variável de pontos.
- **Mostrar fim de jogo com o texto** — escreve a mensagem em vermelho no canvas.
- **A cada quadro do jogo...** — abre um loop de \`requestAnimationFrame\`.

### Física, áudio e mouse (v0.2.0)

- **Definir gravidade** / **Aplicar velocidade** — integra vx/vy e soma a gravidade.
- **Ricochetear nas bordas** — quica o sprite nas bordas do canvas.
- **Colisão por círculo** — colisão mais justa para objetos redondos.
- **Tocar som** — bip sintetizado via Web Audio (sem arquivos) — permissão \`audio\`.
- **Quando clicar/tocar** — roda um bloco com a posição do ponteiro — permissão \`mouse\`.

### Imagens e animação (v0.3.0)

Use a aba **Assets** para enviar imagens do computador ou escolher da biblioteca;
depois é só usar o **nome** da imagem nos blocos.

- **Criar sprite com imagem** — um sprite que mostra uma imagem (em vez de um retângulo colorido).
- **Trocar imagem do sprite** — troca a imagem fixa do sprite.
- **Carregar spritesheet** — prepara uma folha com vários quadros (informe o tamanho de cada quadro).
- **Animar sprite** — percorre os quadros da spritesheet a N fps.
- **Desenhar quadro** — desenha um quadro específico da spritesheet (controle manual).

Enquanto a imagem carrega (ou se o nome não existir), o sprite aparece como um
retângulo da cor — o jogo nunca quebra por falta de imagem.

### Movimento e efeitos (v0.4.0)

Use estes blocos dentro do **"A cada quadro do jogo"**:

- **Plataforma** — esquerda/direita + pulo com gravidade (chão = base da tela).
- **4 direções (top-down)** — anda nas 4 direções; a diagonal não fica mais rápida.
- **Seguir o ponteiro** — o sprite persegue o mouse/dedo.
- **Manter dentro da tela** — gruda nas bordas em vez de sumir.
- **Clarão** — pinta a tela com uma cor translúcida (ex.: ao levar dano).
- **Tremer a tela** — sacode e para sozinho (chame uma vez, ex.: numa explosão).
- **Soltar partículas** + **Atualizar e desenhar as partículas** — uma explosão de
  partículas no ponto x/y; lembre de desenhá-las a cada quadro (somem sozinhas).

### Tiles / tilemaps (v0.5.0)

Tiles montam cenários (chão, paredes, plataformas) a partir de UMA imagem com vários
quadros (o **tileset**) — escolha um da aba **Assets** (ex.: \`tileset\`).

- **Criar mapa de tiles** — informe o tileset, o tamanho do tile (px) e a **grade**:
  cada número escolhe um quadro do tileset; \`;\` separa as linhas e espaço separa as
  colunas; \`.\` é uma célula vazia. Em **tiles sólidos**, liste os números que barram o
  jogador (ex.: \`1\`).
- **Desenhar mapa** — desenha o mapa na tela (use no "a cada quadro", antes do sprite). Com
  "tiles de 0 px" ele ENCAIXA sozinho no canvas (centralizado, sem distorcer); um valor
  como \`32\` fixa o tamanho do tile na tela (controle de zoom do mapa).
- **Impedir de atravessar tiles sólidos** — o sprite pousa no chão e bate nas paredes;
  use a cada quadro, depois de mover o sprite.
- **Impedir de atravessar os sprites de um grupo** (em 📦 Muitos) — mesma colisão, mas
  contra obstáculos SEM mapa: jogue as pedras/casas (até desenhadas por figura) num grupo
  e o sprite não atravessa nenhuma delas, deslizando pela beirada.
- **Impedir de atravessar o sprite** (em 📦 Muitos) — a mesma ideia, mas contra UM sprite
  só (uma parede, uma plataforma solta), sem precisar montar um grupo.

Enquanto o tileset carrega (ou se faltar), os tiles aparecem como retângulos — o jogo
nunca quebra por falta de imagem.

### Grupos, HUD e telas (v0.6.0)

Para jogos com MUITOS sprites (tiros, inimigos, estrelas) e telas de início/vitória/derrota:

- **Grupos** — \`Criar grupo\`, \`Criar no grupo … um sprite\` (x/y/vx/vy aceitam número
  aleatório), \`Atualizar/Desenhar o grupo\`, \`Para cada sprite do grupo\`, \`quantos
  sprites tem no grupo\`, \`Esvaziar/Tirar do grupo\`, \`Tirar do grupo quem sair da tela\`.
  Há também \`Mover o grupo sem gravidade\` — para os TIROS do jogador num jogo COM
  gravidade (senão os tiros arqueiam para baixo em vez de ir reto).
- **Colisão de grupo** — \`Quando um sprite do grupo A encostar num do grupo B\` roda o
  "fazer" com os dois sprites (use dentro do "a cada quadro").
- **Temporizadores** — \`A cada N quadros/segundos fazer\` (ótimo para criar inimigos).
- **HUD no canvas** — \`Mostrar placar\`, \`Escrever\`, \`Desenhar vidas (corações)\`, \`Barra de … / …\`.
- **Telas/cenas** — \`Ir para a tela\`, \`a tela atual é … ?\`, \`Mostrar tela (título/subtítulo/dica)\`,
  \`Reiniciar o jogo\`. O setup (grupos, sprites, variáveis) fica no TOPO do programa, fora do
  "a cada quadro", para o loop conseguir enxergá-lo; um único "a cada quadro" decide o que
  desenhar com "se a tela atual é X".
- **Cenário** — \`Desenhar fundo de estrelas\` e \`Mover o sprite com o dedo (só na horizontal)\`.

### Kit espaço (v0.7.0)

A categoria **🚀 Kit espaço** reúne atalhos PRONTOS (não genéricos) para jogos de nave
espacial — os desenhos, efeitos e sons já vêm feitos: criar nave (cabine + foguinho animado,
cores do corpo e das asas escolhidas), criar asteroide no grupo (pedra que gira), desenhar
fundo de estrelas (céu com gradiente e estrelas que cintilam), soltar
explosão e tocar som de tiro/explosão. Os blocos genéricos seguem nas categorias normais —
a ideia é ir somando KITS de outros temas (corrida, fazenda…).

### Nave clássica: girar + impulsionar (v0.10.0)

Para o **Asteroids clássico** (a nave GIRA e ACELERA para onde aponta). Os sprites passam a ter
um **ângulo em graus** (0 = pra cima, sentido horário) que o desenho respeita — a nave aparece
girada na direção apontada.

- **Controlar o sprite como nave** (Movimento) — vira com ← → (ou A/D), acelera com ↑ (ou W) na
  direção apontada e desliza com atrito ao soltar. Um bloco só já pilota a nave.
- **Girar o sprite N graus** / **Apontar o sprite para N graus** / **Impulsionar para a frente** /
  **Frear aos poucos (atrito)** / **a direção do sprite** — os tijolinhos para montar o controle
  na mão ou inventar variações.
- **Atirar do sprite para a frente, no grupo** (Kit espaço) — cria o tiro na ponta da nave, indo
  na direção apontada (use no "quando apertar Espaço").
- **No grupo soltar um asteroide de uma borda** (Kit espaço) — o asteroide nasce numa borda
  sorteada e vem rumo ao centro (use no "a cada X segundos"). Veja o exemplo **"Asteroides
  clássico"**.

### Acabamentos (v0.8.0)

- **Criar tiro no grupo** — um tiro redondo com brilho (em vez de retângulo).
- **Mover o sprite com as setas** — anda só na horizontal com ← → (1 bloco).
- **Fazer o sprite piscar** — o sprite fica intermitente por N quadros (ex.: invencibilidade).
- **A cada N quadros** agora aceita um número OU uma variável (spawn que acelera por fase).
- Asteroides nascem com tamanhos variados sozinhos; a tela de início/fim escurece de leve
  (o jogo aparece atrás) e quebra o subtítulo em linhas.

### Tela responsiva

O bloco **Fazer a tela preencher N% da janela** (genérico) deixa o canvas grande, nítido e responsivo: ocupa quase toda a janela e se reajusta sozinho quando ela muda de tamanho, mantendo a proporção. As coordenadas do jogo continuam as mesmas, mas o desenho passa a ser feito na resolução REAL da tela — fica grande E nítido (sem borrar), em qualquer tamanho.

Para começar rápido, o bloco **Preparar o jogo em tela cheia** (no grupo ✨ Aparência) já faz tudo isso de uma vez — cria a tela com o tamanho escolhido, centraliza na janela e pinta o fundo (canvas e a sobra ao redor) com a cor do jogo — sem precisar criar o canvas no HTML. Os blocos individuais (criar a tela, preencher %) continuam disponíveis para quem quer montar na mão.

### Pulo no chão e Kit dino (v0.9.0)

Para jogos de **corrida** (estilo "Dino Run"), em que o personagem não anda para os lados, só pula e abaixa:

- **Fazer o sprite pular no chão** (genérico, em Movimento) — gravidade + pouso na base da tela + pulo
  com ↑/Espaço/W ou um toque. Serve a qualquer jogo de pulo.
- A categoria **🦕 Kit dino** reúne atalhos PRONTOS: **criar dinossauro** (desenhado, com perninhas que
  correm sozinhas), **controlar o dinossauro** (pula e abaixa, com gravidade/chão/poeira já embutidos),
  **criar obstáculo no grupo** (cacto/pedra no chão para pular, pássaro no alto para abaixar, ou sorteado),
  **criar ovo de bônus no grupo** (item para coletar), **desenhar fundo de floresta** (céu, sol, nuvens,
  morros e grama que rola — parallax), e **sons** de pulo, dano e coletar.
- O **recorde** (maior pontuação) que persiste entre partidas usa os blocos genéricos de armazenamento
  (\`localStorage\`), não precisa de bloco novo.

Veja o exemplo **"Nave contra Asteroides"** para um jogo de tiro e **"Dino Run"** para um jogo de corrida — ambos completos, montados só com blocos.

### Kit gorilas: batalha de bananas (v0.11.0)

A categoria **🦍 Kit gorilas** monta um jogo de artilharia por turnos (estilo "Gorillas") para **2 jogadores** no mesmo aparelho — cidade, física e crateras já vêm prontas: **Criar/Desenhar a cidade**, **Pôr o gorila no lado**, **Sortear/Desenhar o vento**, **Mirar arrastando** (mais longe = mais forte) + **soltou a mira?** → **Jogar a banana**, **Mover/Desenhar a banana** (gravidade + vento entortam), **a banana acertou o gorila?** (vitória) / **bateu num prédio?** (abre cratera, troca de turno), e **sons** de queda/explosão. Tem também blocos genéricos de canvas em ✏️ Traçado (retângulo ao traçado, recortar/clip, ponto dentro do traçado?) e os eventos apertar/soltar o mouse. Veja o exemplo **"Guerra de Gorilas"**.

### Kit gorilas: robô adversário (v0.12.0)

- **O robô do gorila … joga na cidade … mirando no …** — um lançador **computador (IA)**: ele simula vários arremessos, escolhe o melhor, "pensa" um instante e joga sozinho. Use no "a cada quadro", na vez do robô, passando o gorila INIMIGO. Dá pra fazer **1 jogador vs computador** (troque o ramo de um gorila por este bloco) ou **autoplay** (troque os dois). Veja o exemplo **"Guerra de Gorilas vs Robô"**.
- **Mostrar ângulo e força da mira** — escreve no canto o ângulo (graus) e a força do último arremesso; bom para ver o que o robô escolheu.

### Fazer jogos parecidos "na mão" (sem o facilitador, v0.12.0)

Dá pra montar jogos deste estilo **só com blocos genéricos** (HTML + CSS + Programação/Canvas), sem a extensão. Para isso entraram blocos novos no núcleo:

- **Mudar o estilo do elemento por código** (elemento.style.x = …) e **Definir atributo** — posicionar/mover/mostrar/esconder painéis e formas, ou mudar stroke/fill/etc. de um SVG por código.
- **Blocos de SVG** (categoria **🎨 SVG**): caixa SVG, grupo, caminho (d), círculo, retângulo, linha e "reusar" — bom para um **moinho/cata-vento que gira por CSS** (@keyframes).
- **o sistema está no modo escuro?** (lê prefers-color-scheme) e **densidade de pixels da tela** (devicePixelRatio) — para temas claro/escuro e canvas nítido.
- A **tela cheia** já existia (entrar/sair/alternar e "está em tela cheia?").

Veja o exemplo clássico **"Cidade & Moinho (na mão)"** (no painel de Extensões → "Exemplos clássicos") — um mini-Gorillas montado SÓ com esses blocos: arrastar a bomba, vento, moinho SVG girando, painel de HTML e botão de tela cheia.

### Kit equilibrista (v0.13.0)

Categoria **🤸 Kit equilibrista** — atalhos PRONTOS para um jogo estilo "Stick Hero":
estique o bastão do tamanho certo e atravesse para a próxima plataforma. O jogo
inteiro (herói, plataformas, bastões, fase) mora no runtime; você só guarda o jogo
numa variável. O controle é pelo ponteiro: **segurar** estica o bastão, **soltar**
derruba — não precisa registrar teclas. Melhor num canvas **em pé** (ex.: 360×480).

- **Criar equilibrista** — monta o jogo lendo o tamanho da tela. Guarde numa variável
  (ex.: \`jogo\`). Faça UMA vez, FORA do "a cada quadro do jogo".
- **Atualizar o equilibrista** — um passo do jogo + desenha tudo (placar e dicas).
  Use DENTRO do "a cada quadro do jogo". Acertar o meio (faixa vermelha) vale 2 pontos;
  ele recomeça sozinho quando você toca depois de cair.
- **pontos do equilibrista** / **o equilibrista caiu?** — para o placar e o fim de jogo.
- **Recomeçar o equilibrista** — zera o jogo (bom para um botão "de novo").

Veja o exemplo pronto **"Equilibrista"** na vitrine.

### Kit balão (v0.13.0)

Categoria **🎈 Kit balão** — atalhos PRONTOS para um jogo estilo balão de ar quente:
suba segurando o ponteiro (gasta combustível), voe baixo para economizar e desvie das
árvores. O jogo mora no runtime; você guarda tudo numa variável. Melhor num canvas
**deitado** (ex.: 560×360).

- **Criar balão** — monta o jogo (céu, colinas, árvores, combustível) lendo o tamanho
  da tela. Guarde numa variável. Faça UMA vez.
- **Atualizar o balão** — um passo do jogo + desenha tudo (medidor de combustível,
  metros e dicas). Use DENTRO do "a cada quadro do jogo". Recomeça ao tocar depois do fim.
- **metros do balão** / **combustível do balão** (0 a 100) / **o balão bateu/acabou?** —
  para o placar, a barra de combustível e o fim de jogo.
- **Recomeçar o balão** — zera o jogo.

Veja o exemplo pronto **"Balão"** na vitrine.

### Som rico: efeitos, notas e música (v0.14.0)

A categoria **🔊 Som** ganhou uma biblioteca de sons PRONTOS — tudo sintetizado (Web Audio), sem
precisar de arquivos:

- **Tocar efeito** — um menu com dezenas de efeitos típicos de jogo: moeda, joia, vida, power-up,
  subir de nível, coletar, tiro, tiro grande, explosão, batida, dano, socar, pulo, aterrissar,
  zunido, passo, quicar, assobio, vitória, derrota, começar, alarme, clique, confirmar, erro,
  selecionar e aviso. É só escolher no menu — um bloco só dá acesso a todos.
- **Tocar a nota … por … ms** — toca uma nota musical (dó, ré, mi, fá, sol, lá, si e dó agudo);
  junte várias para montar uma melodia.
- **Tocar música de fundo** — uma musiquinha em loop (aventura, alegre, tensão, calma ou vitória);
  só uma música toca por vez. **Parar a música de fundo** silencia.

Lembrete: o navegador só deixa o som tocar **depois** de um clique ou tecla do jogador.

### Blocos genéricos Tier 1 (v0.15.0)

Tijolinhos que faltavam para montar mais tipos de jogo, em categorias novas e existentes:

- **🎯 Mira e contas**: **Apontar para** e **Mover na direção de** (perseguição/IA), **a distância entre** e
  **o ângulo até** dois sprites, **um número de … a …** (sorteio) e **tem chance de … %?** (evento aleatório).
- **❤️ Vida e tempo**: **Dar vida**, **Mudar a vida** (negativo = dano), **a vida do sprite**, **ainda tem
  vida?**, **pode agir? (recarga de N quadros)** (cadência de tiro por sprite) e **Tirar do grupo quem viveu
  mais de N segundos** (tiros somem sozinhos).
- **✨ Aparência**: **Virar** (espelhar esquerda/direita), **Mudar a transparência**, **Mudar o tamanho** e
  **Multiplicar o tamanho** do sprite.
- **🕹️ Movimento**: **Dar a volta na tela** (sai de um lado, reaparece no outro — estilo Pac-Man/Asteroids).
- **📺 Telas e cenas**: **Pausar o jogo** CONGELA tudo (o "a cada quadro" para de rodar, e o "quando
  encostar" também), **Continuar o jogo** descongela e **o jogo está pausado?** lê o estado. Os eventos de
  toque **"Quando apertar a tecla"** e **"Quando clicar/tocar"** continuam funcionando na pausa DE PROPÓSITO
  — assim você pode fazer "aperte R para continuar". Para mostrar "Você ganhou/perdeu", **desenhe a tela
  ANTES de Pausar** (ela fica congelada por cima). Para um fim de jogo com recomeço, prefira as **cenas**
  (**Ir para a tela 'perdeu'/'ganhou'** + **a tela atual é …?**): o "a cada quadro" decide o que mostrar e o
  jogo segue rodando a tela de fim.

### Blocos genéricos Tier 2 (v0.16.0)

Para mundos maiores que a tela e jogos mais ricos:

- **🎥 Câmera**: **Fazer a câmera seguir o sprite** (mundo maior que a tela, presa às bordas), **Mover a
  câmera** na mão e **a posição x/y da câmera** (para fundos em parallax). A câmera rola só o MUNDO —
  desenhe o HUD (placar, vidas, textos) DEPOIS do mundo que ele fica fixo na tela. ⚠️ Cliques/toques
  continuam em coordenadas de tela; com câmera, a posição no mundo é tela + câmera.
- **🗺️ Mapa** (destrutível): **Quebrar o tile** onde está um sprite (mineração/destruição), **pôr um tile**
  e **o número do tile** onde está o sprite (ler/construir em tempo real).
- **📦 Muitos (grupos)**: **Trazer para a frente** / **Mandar para trás** — controla quem é desenhado por
  cima de quem dentro de um grupo.
- **✨ Aparência** (depuração): **Mostrar a caixa de colisão** de um sprite e **Mostrar os FPS** — para
  enxergar colisões e a performance enquanto cria.

### Posição & tamanho do sprite (valores, v0.18.0)

Bloquinhos de VALOR (na categoria **📐 Posição & tamanho**) que poupam a criança de fazer as contas na
mão — em vez de \`x + largura / 2\`, ela encaixa um bloco pronto:

- **a posição x / y do sprite** — onde o sprite está (borda esquerda / borda de cima).
- **a largura / a altura do sprite** — o tamanho do sprite, em pixels.
- **o centro x / y do sprite** — o MEIO do sprite (já soma metade da largura/altura). Ótimo para atirar,
  mirar ou posicionar uma coisa a partir do centro de outra (ex.: o tiro sai do centro da nave).

### Posição aleatória na tela (valores, v0.19.0)

Na categoria **🎯 Mira e contas**, dois valores para um sprite nascer num lugar SORTEADO sem a criança
montar a continha \`Math.random() * largura\` na mão:

- **um x aleatório na tela** / **um y aleatório na tela** — sorteia uma posição dentro da largura/altura
  da tela. Encaixe no x (ou y) ao **criar** ou **spawnar** um sprite — ex.: asteroides/estrelas nascendo
  em pontos aleatórios. (Para um intervalo específico de números, continua valendo **um número de … a …**.)

### Animação por estado + flip automático (v0.22.0)

Na categoria **🎬 Animação**, o jeito FÁCIL de o personagem trocar de animação sozinho:

- **Quando o sprite estiver … tocar a animação …** — guarda a animação de UM estado do sprite:
  parado, andando (para os lados), andando (cima/baixo), pulando, caindo ou tomando dano. Use um
  bloco por estado, FORA do "a cada quadro" (é configuração, roda uma vez). A animação vem da sua
  folha de quadros — escolha pelo NOME (do Pinta) que os quadros/fps se preenchem sozinhos.
- **Animar e virar o sprite sozinho** — vai DENTRO do "a cada quadro": ele descobre o estado do
  sprite (pela velocidade, pelo chão e pela vida) e troca a animação SÓ quando o estado muda.
  Também VIRA o desenho para a esquerda/direita conforme o sprite anda (flip automático; parado,
  vale o "Virar o sprite" manual).
- Estado sem animação registrada cai no parente mais parecido (caindo → pulando → andando →
  parado) — dá para começar só com "parado" e "andando" e crescer depois.
- "Tomando dano" liga sozinho por meio segundo quando o sprite PERDE vida (bloco "Mudar a vida…
  em -1") ou enquanto ele pisca (bloco "Fazer o sprite piscar").
- "Pulando/caindo" só acontecem em jogos com chão (plataforma/pulo no chão/colisão com mapa) —
  num jogo de vista de cima, andar para cima/baixo usa "andando (cima/baixo)".

### Mapa pronto do Pinta (v0.22.0)

- **Criar mapa do meu desenho** (🗺️ Mapa) — desenhe o MAPA no Pinta, toque no 🚀 e escolha o
  desenho neste bloco: grade, peças e sólidos vêm JUNTOS, nada de colar texto.
- No **Criar mapa de tiles** (o clássico, para montar/editar na mão), a GRADE agora abre um
  mini-editor visual: escolha uma peça e PINTE as células (borracha apaga, dá para mudar
  linhas/colunas).

### Tipos de inimigo (v0.22.0)

Na categoria **😈 Inimigos**, CLASSES de inimigo prontas (como o Goomba e o Koopa do Mario):

- **Criar tipo de inimigo** — defina UMA vez comportamento e atributos (vida, velocidade, dano
  de contato, tamanho, cor OU imagem): patrulha (anda e vira na parede/borda), perseguidor,
  voador (deitado ou em pé), saltador e atirador (fica no chão e atira no alvo).
- **Soltar um inimigo do tipo** — solte quantos quiser, cada um nasce com a vida/dano do tipo.
- **Atualizar os inimigos do tipo** (dentro do "a cada quadro") — move pelo comportamento,
  anima, atira e REMOVE os derrotados (vida 0 → partículas + "Quando for derrotado").
- **Desenhar os inimigos do tipo** — todos + os tiros deles.
- **Quando um tiro acertar o sprite** + **Machucar o sprite com o dano do inimigo** — dano de
  contato com INVENCIBILIDADE de piscar (não drena a vida no encostão contínuo).
- O tipo É um grupo: os blocos de **Muitos (grupos)** funcionam nele. Patrulha em mapa de tiles:
  some o "Impedir de atravessar" num "Para cada" que o inimigo vira sozinho na parede.
- **Ajustar no tipo de inimigo…** — força/ritmo do pulo, alcance do voo, cadência/velocidade do tiro.

### Desenhar por código (v0.23.0)

Na categoria **🎨 Desenho**, faça o visual do sprite com formas, sem imagem nenhuma:

- **Desenhar a figura … assim** — monte um desenho com **retângulo, círculo, oval, triângulo, linha** e dê um nome. Você desenha DENTRO do quadro do sprite: x/y começam no cantinho (0,0). Dá para usar os blocos de **Canvas** aqui dentro também (gradiente, curvas…).
- **Criar sprite … com a figura** — cria um sprite que usa esse desenho; ele anda, gira, vira, anima e colide como qualquer outro. **Trocar a figura** muda o desenho de um sprite.
- **a largura / a altura da figura** — o tamanho do sprite que está sendo desenhado (para centralizar). Veja o exemplo **"Jogo desenhado por código"**.
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
