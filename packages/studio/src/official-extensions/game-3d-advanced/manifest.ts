import type { ExtensionManifest } from '#extensions'

export const gameKit3DManifest: ExtensionManifest = {
  id: 'game-3d-advanced',
  name: 'Jogo 3D Avançado',
  version: '0.21.1',
  description:
    'A base de um jogo 3D profissional, portada de um curso de engine. Um SANDBOX 3D completo. Entidades com máquina de estados que ANIMA o boneco .glb sozinha; física por TIPO (bola quica, personagem não, gelo escorrega) com pulo, rampas e plataformas; peças, modelos, luz e névoa; câmera que segue/orbita/1ª pessoa com zoom, tremor e WASD relativo a ela; partículas; enxames com pool; vizinhança por grade; combate com chefões, fala, cronômetro, sorteio semeado, HUD e música.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: botões das telas + câmera de órbita arrastável. Audio: sons/efeitos.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: `## Jogo 3D Avançado

Esta extensão te dá a **base de um jogo 3D profissional de verdade**, com a mesma
arquitetura que os cursos de engine ensinam. Ela usa \`window.SZGameKit3D\`.
Diferente do "Jogo 3D" (que traz kits prontos de gêneros), aqui o motor cuida
só do que **nunca muda** num jogo grande, e **as regras são suas**: você monta
a mecânica nos ganchos, com blocos de matemática, "se" e variáveis.
As telas e os HUDs prontos usam Baloo 2, uma fonte arredondada incorporada no
runtime e disponível mesmo quando o jogo está offline.

O que o motor já faz por você:

- **Mundo pronto**. Céu em degradê, chão com sombra, luz de sol, câmera de
  órbita (arraste o mouse) e telas de UI (menu, pausa, carregando, fim,
  vitória). Um bloco: "Preparar o jogo 3D".
- **Máquina de estados POR ENTIDADE**. O coração dos jogos profissionais:
  cada torre e cada invasor vive num estado (\`parado\`, \`mirar\`,
  \`atirar\`…) com ganchos de entrar, de ficar (a cada quadro) e de sair.
  Um cérebro por MOLDE vale para o enxame inteiro.
- **Moldes de peças 3D**. A aparência é montada de caixas, bolas, cilindros
  e cones coloridos (como um brinquedo de montar). Nada de imagem: tudo
  procedural.
- **Enxames com pool**. Nascer/recolher reaproveita o mesh, o esqueleto e o
  mixer, mas cada vida recebe uma entidade nova. Um alvo já recolhido nunca
  passa a controlar quem nasceu depois.
  As fábricas ("A cada X s, nascer…") soltam inimigos sem parar.
- **Vizinhança rápida**. "para cada vizinho a até X" usa uma grade espacial
  por dentro: nunca compara todo mundo com todo mundo (a lição de otimização
  do curso).
- **Combate com invencibilidade**. Machucar dá meio segundo de piscada
  invencível; vida no zero roda o "quando for derrotado" e recolhe sozinho.
- **Barra de vida flutuante**. "Mostrar a barra de vida do molde" pendura uma
  barrinha sobre a cabeça de cada entidade viva do molde (verde → vermelha),
  que acompanha ela pela tela. O chefão e o inimigo de RPG agradecem.
- **Laço com delta-time (dt)**. O "A cada quadro" recebe quanto durou o
  último quadro, em segundos. O jogo anda igual em qualquer computador.

### Começando (a receita)

1. Em **⚙️ Ao iniciar**, use **Preparar o jogo 3D** uma vez: resolução, tamanho
   do mundo, céu e chão.
2. Ainda em **⚙️ Ao iniciar**, use **Criar o molde 3D** uma vez por tipo de coisa
   (herói, torre, invasor, tiro), com as peças dentro.
3. Em **⚡ Quando acontecer**, use **Quando o jogo entrar no estado
   jogando** para montar a partida: nascer o herói ("chamando de"), espalhar
   enfeites e ligar as fábricas.
4. Em **🔁 Enquanto estiver rodando**, use **A cada quadro (dt)** para a
   mecânica geral: mover pelas teclas, placar e condição de vitória.
5. Ainda em **🔁 Enquanto estiver rodando**, monte os cérebros com
   **Enquanto ela do molde X estiver no estado Y** para cada estado de cada molde.
6. Pronto: o motor **começa automaticamente**, uma única vez, depois que todos
   os moldes, eventos e telas foram registrados.

### A máquina de estados (a lição do curso)

A torre profissional funciona assim, e você monta igual, em blocos:

- No estado **parado**: guardar em \`alvo\` quem do molde invasor está mais
  perto; se o alvo existe e está encostando (a menos de 14) → mudar para **mirar**.
- No estado **mirar**: fazer mirar em \`alvo\` (suave); se "já está mirando?"
  → mudar para **atirar**.
- Ao entrar em **atirar**: nascer 1 tiro "no lugar dela (virado igual)",
  tocar o som laser, mudar para **recarregar**.
- No molde torre, depois de 1 s no estado **recarregar**, mudar para
  **parado** (transição automática por tempo).

Toda entidade NASCE no estado \`parado\`. Mudar para o estado em que já está
não faz nada (proteção dos jogos de verdade). Se um gancho de entrar/sair pedir
outra mudança, o motor termina a transição atual e executa a nova em seguida,
na ordem, sem repetir o gancho antigo nem perder o estado pedido.

A morte do "Machucar" recolhe NA HORA (de propósito). Quer a morte DRAMÁTICA
do curso. O bicho cai uns segundos antes de sumir? Faça a SUA: guarde a vida
numa gaveta e, quando zerar, mude para um estado "morrendo" (ligue a queda,
espere 2 s com a transição por tempo e recolha ao entrar no estado seguinte).

### Enxames, alvos e vizinhos

- O "Nascer 1… chamando de" dá um APELIDO (herói, cristal, chefão). Os
  anônimos do enxame são controlados pelo cérebro do MOLDE.
- "Guardar em alvo quem está mais perto" + "alvo ainda está no jogo?" é o
  padrão de mira: o alvo pode ter sido derrotado. Pergunte antes de usar.
- "Para cada vizinho a até X" é a colisão em área: o tiro pergunta quem do
  molde invasor está a até 1 dele.
- **"Andar rumo ao ponto x z"** leva a entidade a um LUGAR do mundo (waypoint)
  na velocidade do molde, e para ao chegar. Com "sortear de … a …" nos dois
  eixos + uma transição por tempo, vira PASSEIO: o bicho vagueia sozinho.

### Física & mundo sólido (🏃 Física)

O motor de entidade tem física de verdade. Feita à mão, sem biblioteca:

- **Fazer o molde … ter física de** é o atalho: escolha 🏀 bola, 📦 caixa,
  🧍 personagem, 🧊 gelo ou 🪶 flutuante e o molde já ganha, de uma vez, o
  formato que colide, o quique, o atrito e a queda combinando entre si. Depois
  dá para afinar cada coisa com os blocos abaixo.
- **Quique é da COISA e do CHÃO. O maior manda.** Uma 🏀 bola quica em
  qualquer chão, até no chão comum do mundo; um 🧍 personagem não quica em chão
  nenhum; mas se o personagem cair num trampolim (quique alto), o trampolim
  ganha e joga ele para cima. ⚠️ Mudou na v0.4.0: antes o quique era só do chão,
  então uma bola era OBRIGADA a não quicar no chão comum.
- **Atrito é o contrário: o mais escorregadio manda.** Chão de gelo escorrega
  todo mundo; um disco de gelo escorrega em qualquer chão.
- **Fazer … cair com gravidade** liga a queda numa entidade. Ela passa a cair
  e a POUSAR no chão e nas plataformas sólidas.
- **Fazer o molde … ser sólido** transforma aquele molde em parede/chão: ele
  para **tudo** que não for fantasma. ⚠️ Mudou na v0.3.0: antes só quem tinha
  gravidade era parado, então **tiro atravessava parede**. Agora ser sólido é
  consequência de EXISTIR; se você QUER que algo atravesse, use "Fazer …
  atravessar as paredes".
- **Fazer … pular** dá um impulso para cima, mas só quando está no chão (nada
  de voar segurando o pulo). **… está no chão?** conta o pulo.
- **Mover … como plataforma** é o controle pronto: WASD/setas no plano + pulo
  com espaço (liga a gravidade sozinho). Use dentro do "A cada quadro".
- **Fazer o molde … colidir como** troca o formato invisível que bate: caixa
  (padrão), bola ou **cápsula**. A melhor para gente e bicho, porque não
  engancha em quina e sobe rampa lisinho.
- **Rampa** é uma FORMA de peça: arraste uma peça "rampa" e o molde vira uma
  ladeira que dá para subir (o desenho e a colisão casam sozinhos).
- **Plataforma que anda** não precisa de bloco novo: um molde sólido + "Definir
  velocidade" já CARREGA quem está em cima dele.
- **Fazer o molde … ser uma zona** cria uma área que não empurra ninguém, mas
  avisa: **Quando alguém encostar em … do molde …** roda na hora em que a
  entidade ENTRA (uma vez por visitante e por entrada, não a cada quadro). Dois
  visitantes podem entrar juntos, e até uma entidade parada que nasceu dentro
  da zona é detectada. É a moeda, a porta, a armadilha, a linha de chegada.
- ⭐ O "quem" da zona pode ser QUALQUER corpo que entrou. O herói, uma bola,
  um tiro perdido. Pergunte **"… é do molde …?"** antes de contar o ponto: é o
  filtro de alvo dos jogos de verdade (sem ele, uma bola caindo através de
  outra contava como "pega").
- **Quicar** (trampolim, bola pula-pula) e **atrito** (0 = gelo, 1 = gruda)
  valem tanto para a coisa que cai quanto para o chão. Veja a regra do "maior
  manda" lá em cima.
- Um tiro rápido **não atravessa** mais parede fina: o motor varre todo o caminho
  do quadro e encontra o primeiro impacto mesmo quando o passo pularia a parede.

### Formas, modelos, texturas & luz (🧊 Moldes & peças, 💡 Luz & céu)

- As **peças** dos moldes vêm em muitas formas (caixa, bola, cilindro, cone,
  **plano, rosca, pirâmide, rampa**), com **material** (fosco, metal, vidro,
  brilho. O "brilho" acende o bloom) e uma **textura** (uma imagem do projeto
  estampada na peça).
- **Modelo importado**: escolha a forma "modelo importado" e selecione um
  arquivo **.glb** do projeto. A peça vira o modelo 3D
  de verdade (feito no Blender, baixado de um site de modelos…). A caixa que
  colide continua sendo o tamanho que você deu, então o jogo não muda de
  comportamento. **Céu de foto**: um arquivo **.hdr** vira o céu 360° E ilumina
  a cena inteira (é o que faz o metal refletir o ambiente).
- O motor mede malhas, triângulos, ossos, materiais e chamadas de desenho do
  **.glb** depois de abrir o arquivo. Modelos acima dos tetos seguros usam a
  forma de reserva. O orçamento das cópias vivas é global entre todos os
  moldes; recolher uma entidade devolve o custo dela antes do próximo
  nascimento.
- **Pôr uma luz** acende uma luz colorida num ponto (tocha, fogueira). Declare
  no começo; o motor aceita até 8 luzes extras para proteger o desempenho;
  **Luz do ambiente** deixa o mundo mais claro ou escuro (modo noturno/caverna);
  **Névoa** faz o longe sumir numa cor (mistério); **Trocar o céu** muda o
  degradê em runtime (dia → pôr do sol → noite). Luz, ambiente e névoa são
  persistentes: use na preparação ou em uma reação que acontece uma vez, nunca
  dentro de um laço.

### A câmera (🎥). E por que o WASD sempre acerta

⭐ **Andar com as teclas é SEMPRE relativo à câmera**: o W entra na tela, o S
volta, o A e o D andam para os lados DA TELA. Não importa se a câmera está de
cima, seguindo alguém, em 1ª pessoa, ou se você girou a órbita com o mouse. É
assim que os jogos 3D de verdade funcionam, e é o que faz o controle "acertar"
sem você pensar nisso. (⚠️ Mudou na v0.4.0: antes o WASD andava por um eixo fixo
do mundo, então com a câmera atrás do herói ele corria **ao contrário**.)

A **frente** de tudo no 3D é o lado +Z do molde: é para lá que aponta o "Mover
para a frente", é isso que o "Encarar" e o "Fazer mirar" alinham, e é assim que
os modelos **.glb** já vêm feitos. Ponha o nariz/cano das peças em z positivo.

Escolha a câmera. **seguir** alguém, **girar em volta** (órbita, arrastável),
**ver de cima** ou **1ª pessoa**. E depois mande nela por código:

- **Girar para … ° e inclinar … °** move a órbita sem esperar o mouse (abertura
  de fase, virar para o chefão, girar devagar a cada quadro).
- **Afastar** aproxima/afasta (na órbita E no seguir): perto na conversa, longe
  na luta. **Lente de … °** é o zoom de verdade (60 é o normal; 30 = luneta de
  mira; 100 = alarga tudo e dá sensação de velocidade).
- **Olhar para …** faz a órbita/a de cima girarem em volta de uma ENTIDADE ou de
  um ponto, em vez do meio do mundo. Num mundo grande, é o que deixa você
  acompanhar o herói. (Antes era cravado no centro.)
- **Tremer a câmera** é o impacto do cinema: explosão, tiro grande, chefão
  pisando. Some sozinho.
- **Suavidade do seguir**: baixo (1) = preguiçosa, cara de cinema; alto (10) =
  colada.

### Mira, clique & 1ª pessoa (🖱️)

- **Guardar … a entidade do molde … sob o mouse** dispara um raio da câmera
  pelo ponteiro e devolve quem está embaixo do mouse. O coração do
  point-and-click, da estratégia e da torre-por-clique.
- **O mouse está sobre …?** e **o ponto do chão sob o mouse** (eixo x/y/z)
  completam a mira: brilhar ao passar o mouse, mover algo até o clique.
- **"O mouse foi clicado agora?"** e **"o mouse está apertado?"** são o GATILHO
  do point-and-click: "se o mouse foi clicado agora → guardar quem está sob o
  mouse → acertou!". O primeiro vale só no quadro do clique (como a tecla
  "apertada agora"); o segundo, enquanto o dedo segura.
- **Câmera em 1ª pessoa em …** vê o mundo pelos olhos da entidade (clique para
  capturar o mouse e olhar em volta); **Mover … em 1ª pessoa** anda para onde
  a câmera olha (WASD relativo ao olhar). Trocar de câmera, pausar ou encerrar
  devolve o cursor automaticamente.

### Faíscas 3D, emissores & efeitos de cinema (💥 🌊)

- **Faíscas** são o sistema de partículas dos jogos de verdade, feito só de
  DADOS: "Criar o efeito 3D" define a receita da EXPLOSÃO (quantas, cor do
  começo → cor do fim, espalhamento, tamanho, vida, gravidade) e "Soltar o
  efeito" estoura quantas quiser. O motor reaproveita tudo (nunca pesa).
- **Emissores contínuos** ("Criar o emissor 3D") jorram partículas SEM PARAR:
  fogo, fumaça, rastro de nave, aura mágica. Você escolhe a cor, o tamanho,
  quantos por segundo, a força, o cone (0° = raio reto, 180° = todas as
  direções), a gravidade e se BRILHA (ligado = fogo; desligado = fumaça
  transparente, ordenada por profundidade). "Ligar o jorro" prende num ponto
  ou **em cima de uma entidade** (ele acompanha); "Desligar" para de jorrar.
- **Atratores** ("Puxar as faíscas … para") criam um ímã que suga as
  partículas para um ponto. Vórtice, buraco negro, vento. Registre uma vez,
  fora do quadro; cada efeito aceita até 16.
- **Vários jorros da MESMA receita convivem** (duas tochas na parede, rastro em
  cada nave. Até 8 por efeito): religar no mesmo lugar não duplica, e
  "Desligar o jorro" apaga todos os da receita. Para um jorro que ANDA, prenda
  numa entidade.
- A curva **"fogo"** faz o truque-assinatura do curso: o grão NASCE luz pura
  (brilho que soma) e MORRE fumaça (cobre o fundo), numa passada só.
- **Efeitos de cinema** já vêm ligados: sombras, brilho (bloom. As coisas
  claras "vazam" luz, como o tiro amarelo) e vinheta (cantos escuros). Num
  computador fraco, desligue no bloco "Efeitos de cinema" (modo turbo).

### 🕺 O boneco importado ganha VIDA (animação do modelo)

Um **.glb** não traz só o desenho: traz as **animações** que fizeram nele (andar,
pular, atacar). O motor lê todas.

- ⭐ **No molde …, no estado …, tocar a animação …** é o jeito profissional, e o
  mesmo do curso: você amarra UMA vez e pronto. Quando o cérebro da entidade
  muda de estado, a animação troca junto, com uma passagem suave. O personagem
  não "pede para animar": ele só muda de estado, e o corpo acompanha.
- **Tocar a animação … em …** serve para a hora exata (o pulo, o golpe): escolha
  *repetindo* (andar/parado) ou *uma vez só* (fica no último quadro no fim e
  pode ser tocada de novo no próximo pulo/golpe).
- O NOME da animação é o que vem dentro do arquivo. Cada site nomeia do seu
  jeito (Idle, Run, Walk…). Nome que não existe = aviso, o jogo não quebra.

### 🎲 Sorteio & ⏱️ tempo

- **Sortear de … a …** e **sortear com …% de chance** são o acaso DO KIT.
  ⚠️ Use estes, não o "número aleatório" comum: **só o sorteio do kit obedece à
  semente**.
- **Começar a contagem de … s** + **tempo que falta** + **Quando o tempo acabar**
  são a corrida contra o relógio, a bomba, o tempo da fase. O relógio só corre
  no estado jogando: na pausa ele CONGELA, e recomeçar a partida zera.

### 💬 Fala & 🎵 música

- **… diz … por … s** põe um balão em cima da cabeça da entidade que ACOMPANHA
  ela pela tela e some sozinho. É o que faz o jogo contar história (o HUD dos
  cantos não conversa com ninguém).
- **Tocar a música … sem parar** é a música de fundo, em repetição (uma por vez).
  Carregue antes com "Carregar o som".

### Acaso com semente (jogo que se repete igual)

**Usar a semente … para o acaso** trava o sorteio do jogo: a MESMA semente dá
exatamente a MESMA partida. Os enfeites nascem no mesmo lugar, os inimigos vêm
na mesma ordem, as faíscas voam igual. Serve para testar (o bug acontece de novo,
do mesmo jeito!) e para dar o mesmo desafio para todo mundo. Semente 0 volta ao
acaso de verdade. ⚠️ Vale para o acaso do MOTOR (enfeites, faíscas, fábricas) e
para os blocos **sortear** deste kit. O bloco "número aleatório" comum NÃO
obedece à semente.

### Chefões: reagir a dano, atacar em anel e curar

O gênero CHEFÃO em três blocos, todos irmãos do que você já tem:

- **Quando um do molde … levar dano** (❤️ Combate) roda um "fazer" toda vez que
  uma entidade daquele molde é machucada. Leia a vida dela ali dentro (com "a
  vida de …" e "a vida máxima de …") para trocar de FASE, piscar ou revidar. É o
  coração de um chefão em várias fases.
- **Disparar um anel de … tiros** (👾 Nascer & fábricas) faz nascer vários tiros
  ao redor de uma entidade, espalhados em círculo e voando para fora. É o ataque
  clássico de chefão. Ligue o "cortar longe" para limpar os tiros que saem do mundo.
- **Curar … somando … de vida** (❤️ Combate) devolve vida a uma entidade, sem
  passar do máximo com que ela nasceu. É o oposto do "Machucar": poções, pontos de
  descanso ou um chefão que se recupera entre as fases.

No exemplo "O Chefão das Sombras", você clica no chefão para machucá-lo e, a cada
fase (por "quando levar dano" lendo a vida), ele fica mais bravo, dispara um anel
maior e se cura um pouco. Desvie do anel com WASD.

### Dicas

- Unidades são METROS do mundo 3D: um boneco tem ~1 a 2 de altura, velocidades
  boas ficam entre 3 e 18 por segundo, o mundo padrão tem 80 de lado.
- A resolução interna mantém a proporção escolhida, mas é reduzida
  automaticamente se ultrapassar o limite da GPU ou o orçamento de 1920×1080
  pixels. O canvas continua ocupando o espaço disponível na tela.
- O jogo pausa com Esc (troque com "Usar a tecla … para pausar"). Segurar a
  tecla não alterna a pausa repetidamente.
- Entrar em "jogando" fora da pausa RECOMEÇA a arena (recolhe todo mundo). Por
  isso a partida se monta no "quando entrar no estado jogando". Retomar da
  pausa preserva a arena e não repete esse gancho.
- Pedir o estado que já está ativo não repete o gancho "quando entrar".
- O placar fica nos cantos da tela com "Escrever no canto … da tela".

> ⚠️ Use APENAS UMA extensão de jogo por projeto (Jogo 2D, Jogo 2D Avançado,
> Jogo 3D ou esta). Cada uma cria a própria tela e elas brigam pelo canvas.
`,
}
