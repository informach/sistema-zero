import type { ExtensionManifest } from '#extensions'
import {
  arenaGoblinsExample,
  batalhaEmEquipeExample,
  bichinhosDoQuintalExample,
  cacaMoedasExample,
  cobrinhaExample,
  corridaTabuleiroExample,
  defesaDoReinoExample,
  dueloDeCartasExample,
  dueloDosBonecosExample,
  florestaNinjaExample,
  invasaoDosOvnisExample,
  jogoDaMemoriaExample,
  meuPrimeiroJogoExample,
  oChefaoExample,
  quebraBlocosExample,
  reinoAbertoExample,
  saltoNaFlorestaExample,
  vilaDoDragaoExample,
} from './examples'

export const gameKitManifest: ExtensionManifest = {
  id: 'game-2d-advanced',
  name: 'Jogo 2D Avançado',
  version: '0.35.1',
  description:
    'A base de um jogo profissional em blocos: estados, telas, laço com tempo, enxames, colisão, física, câmera, som, faíscas e tabuleiro de grade — dá para inventar qualquer jogo 2D. E seis atalhos prontos: 🏃 plataforma (pulo gostoso, pisar no inimigo), 🧙 RPG (mapas, NPCs, falas, cenas, salvar), 👾 monstrinhos (criaturas, capturar, evoluir), 🥊 luta (rounds, combo, especial), 🚀 nave (a invasão que marcha, desce e acelera) e 🏰 defesa de torre (caminho, ondas, torres que miram).',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: os botões das telas de UI são clicáveis. audio: sons e efeitos.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: `## Jogo 2D Avançado

Esta extensão te dá a **base de um jogo profissional de verdade** — a mesma
estrutura que estúdios usam — pelo \`window.SZGameKit\`. Diferente do "Jogo 2D"
(que traz comportamentos prontos), aqui o motor cuida só do que **nunca muda**
num jogo profissional, e **as regras são suas**: você escreve a mecânica dentro
dos ganchos, com blocos de matemática, "se", variáveis e Canvas.

O que o motor já faz por você (cada um tem a sua seção mais abaixo):

- **Máquina de estados** — o jogo vive em UM estado por vez, e as telas prontas
  aparecem sozinhas no estado certo.
- **Laço com delta-time (dt)** — o "A cada quadro" diz quanto tempo durou o
  último quadro, em segundos. Velocidade × \`dt\` = o jogo anda igual em qualquer
  computador. É assim que os profissionais fazem.
- **Carregamento com tela de espera** — as imagens carregam ANTES de começar.
- **Telas de UI prontas** — menu, pausa, carregando, fim e vitória (e dá para
  criar as suas, com botões que rodam blocos).
- **Canvas responsivo com resolução fixa** — a tela tem SEMPRE a mesma resolução
  por dentro e se ajusta sozinha à janela: suas contas nunca mudam.
- **Teclado profissional** — teclas seguradas, sem tecla "presa" ao perder o
  foco, e a tecla de pausa.

### Começando (a receita)

1. **Preparar o jogo profissional** — uma vez, no começo: resolução, cor de
   fundo e cor de destaque das telas. (Ou **Preparar o jogo para ocupar a tela
   toda** — sem dimensões: o canvas preenche a tela inteira e a área do jogo
   ACOMPANHA a janela. Nesse modo "a largura/altura do jogo" mudam com a tela,
   então centralize por eles, não por números fixos; combine com "entrar em tela
   cheia" para tomar o monitor todo. Use UM dos dois "Preparar".)
2. **Carregar a imagem** — uma por imagem do projeto (aba Imagens); o nome que
   você der é o que o personagem usa.
3. **Criar o personagem** — quantos quiser. Nasce no centro; sem imagem, vira um
   retângulo da cor.
4. **Quando entrar no estado "jogando"** — zere os pontos e recoloque os
   personagens AQUI. É o que faz o "Jogar de novo" recomeçar limpo (sem isto, a
   2ª partida abre com o placar e os inimigos da 1ª).
5. **A cada quadro (dt)** — a mecânica: mover, testar "encostou", somar pontos…
6. **Desenhar o jogo (ctx)** — o visual: fundo, personagens, placar (os blocos
   de Canvas funcionam aqui dentro, com esse pincel).
7. **Começar o jogo** — uma vez, NO FIM: carrega tudo e liga o laço.

> ⭐ **Seu jogo abre no MENU, não jogando.** Ao rodar, você vê a tela de menu —
> clique no botão **Jogar** (ele já vem pronto) para a partida começar. No menu,
> o "A cada quadro" e o "Desenhar o jogo" ainda não aparecem — mas por motivos
> diferentes: **"A cada quadro" só roda no estado \`jogando\`**; já **"Desenhar o
> jogo" roda em \`jogando\`, \`pausado\`, \`fim\` e nos SEUS estados inventados — só
> NÃO no \`menu\` nem no \`carregando\`** (por isso dá para desenhar uma tela de
> pausa ou de fim, mas para um menu 100% seu use um estado inventado). (Sem tela
> de menu? Um bloco "Mudar o estado para jogando" no começo pula direto ao jogo.)

### Qual kit para qual jogo? 🎮

Você monta QUALQUER jogo com os blocos gerais, mas cada **kit** é um atalho pronto
para um gênero. Escolha pelo jogo que você quer:

- 🏃 **Kit Plataforma** — jogo de pular (fases, plataformas, pulo bom).
- ⚔️ **Kit RPG** — explorar um mundo + **batalha por TURNOS** com espada e time.
- 👾 **Kit Monstrinhos** — pegar e treinar **bichinhos** (estilo Pokémon).
- 🃏 **Kit Cartas** — **batalha de cartas** (deck: energia, escudo, intenção).
- 🥊 **Kit Luta** — luta 1 contra 1 por rounds.
- 🚀 **Kit Nave** — nave atirando, invasores (estilo Space Invaders).
- 🏰 **Kit Defesa de Torre** — torres contra ondas de inimigos num caminho.
- 🎲 **Jogo de tabuleiro** — dado + ordem de turno + andar casas numa trilha.

⭐ Escolha UM gênero de batalha por jogo: ⚔️ turnos, 👾 bichinhos e 🃏 cartas são
três batalhas DIFERENTES — não misture.

### Onde faço um inimigo? (são coisas diferentes!) 👾

A palavra "inimigo" aparece em vários lugares porque cada gênero tem o SEU tipo —
não são intercambiáveis:

- **Inimigo que ANDA no mapa e nasce em enxame** (o comum de ação) → 👾 **molde**
  ("Criar o molde" + "Fazer nascer do molde").
- **Oponente da batalha por TURNOS** (⚔️ Kit RPG) → "Adicionar inimigo" (na hora)
  OU **"Criar a ficha do inimigo"** (reutilizável, com imagem) + "batalha contra a ficha".
- **Bichinho que você pega e treina** (👾 Kit Monstrinhos) → **criatura**.
- **Personagem do mundo que CONVERSA** (não luta) → 💬 **NPC**.
- O inimigo da 🃏 batalha de cartas já vem embutido no Kit Cartas (vida + intenção).

### Receita: um chefão com FICHA (⚔️ Kit RPG)

A forma nova e organizada: **crie o inimigo separado** (a "ficha", com imagem e
atributos) e depois **escolha com quem batalhar** — igual aos moldes do mundo.

1. **Criar a ficha do inimigo "Dragão"** (vida 120, imagem do Pinta, cor, e marque
   **chefão**). Faça no começo, no topo — a ficha FICA salva o jogo todo.
2. Dê a SUA cara às telas: **"Na tela menu, pôr fundo cor …"** (ou uma imagem do Pinta).
3. **Ensine os golpes** (do herói e do chefe) — pode ser no topo, junto das fichas:
   os golpes ensinados FICAM salvos e re-ensinar não duplica. Depois, no momento da
   luta, **"Adicionar o inimigo da ficha Capanga"** e **"Começar a batalha contra a
   ficha Dragão"** (ou dentro de "quando falar com o NPC", como no O Chefão).
4. O chefe fica esperto com **"Quando for a vez do inimigo Dragão"** + *"se a vida do
   Dragão < metade: acerta todo o time; senão: usa um golpe"*.

### Estados

- **Mudar o estado do jogo para…** — o "A cada quadro" só roda em \`jogando\`;
  \`menu\`/\`pausado\`/\`fim\` mostram as telas deles; um estado inventado (ex.:
  \`loja\`) esconde as telas e congela o jogo — mostre a SUA tela nele.
- **Quando o jogo entrar no estado…** — roda uma vez por entrada. Perfeito para
  zerar pontos e recolocar personagens ao começar a jogar.
- **Pausar / Continuar / Voltar ao menu / Terminar o jogo** — atalhos dos estados
  prontos. A tecla de pausa (Esc) já alterna jogando↔pausado sozinha.
- **o estado do jogo / o estado é…?** — perguntas para usar num "se".

### Telas

- **Personalizar a tela pronta…** — título, texto e botão de
  menu/pausa/carregando/fim/vitória. Em branco = não mexe.
- **Criar a tela… / Botão… na tela… / Mostrar a tela / Esconder todas** — telas
  novas (loja, instruções) no mesmo estilo, com botões que rodam os seus blocos.
  Criar com o nome de uma tela pronta faz você ASSUMIR a tela: os botões dela
  saem e os textos passam a ser os seus.
- **Na tela…, pôr fundo cor… e imagem…** — dá a SUA cara à tela (pronta ou sua):
  uma cor de fundo e, se quiser, uma imagem do Pinta cobrindo o painel. (Para uma
  tela toda DESENHADA no canvas, use um ESTADO inventado — ele esconde os painéis
  prontos e deixa você desenhar à vontade.)

### Personagens

- **Criar o personagem…** — posição, tamanho, velocidade (px por segundo), turbo
  e imagem ou cor.
- **Marcar o ponto de renascer** + **Fazer … renascer** — a bandeirinha e o
  buraco. São GERAIS (valem em RPG, corrida, bullet hell), por isso moram aqui e
  não no Kit Plataforma.
- **Mover pelas teclas usando o tempo…** — o movimento de topo pronto: WASD +
  setas, diagonal na mesma velocidade, tudo × dt. (Plataforma? Use o "Herói de
  plataforma" do 🏃 Kit.) Quer outra mecânica? Troque pelas suas contas.
- **Manter dentro da tela / Colocar em x,y / Recolocar no centro / turbo** —
  utilidades de posição.
- **Desenhar o personagem** — imagem (se carregou) ou retângulo da cor, dentro
  do "Desenhar o jogo".
- **encostou em…? / posição x / posição y** — perguntas para a mecânica.

### 🎮 Controles (teclado e mouse)

- **a tecla … está apertada?** — verdadeiro enquanto segura. Escreva a letra
  (\`w\`, \`a\`…), \`ArrowUp\`/\`ArrowDown\`/\`ArrowLeft\`/\`ArrowRight\` para as
  setas, ou \`espaço\`.
- **a tecla … acabou de ser apertada?** — verdadeiro SÓ no quadro do aperto
  (segurar não repete). O jeito certo de fazer golpe e tiro: um aperto, uma
  ação.
- **Usar a tecla … para pausar** — troca a tecla de pausa (padrão: Esc).
- **Quando clicar no jogo** — roda os blocos com a posição já nas coordenadas do
  JOGO (o esticado da tela e a câmera resolvidos por você). **o mouse x/y** e **o
  mouse está apertado?** completam: tower defense, point-and-click, desenhar com
  o dedo.

### Dicas de quem faz jogo de verdade

- O desenho recomeça do zero a cada quadro: pinte o fundo primeiro ("Pintar o
  fundo" já apaga o quadro anterior).
- A largura/altura do jogo são fixas: use "a largura do jogo" nas contas de
  limite e de posição aleatória.

> ⚠️ Use o Jogo 2D Avançado **ou** o Jogo 2D no mesmo projeto — os dois criam a
> própria tela e podem brigar pelo canvas.

## A arquitetura de verdade (como o Frank monta)

Estes blocos são as PEÇAS que os programadores de jogo usam de verdade. Você as
liga do seu jeito — é assim que se aprende a construir jogos grandes.

### 📢 Avisos (eventos)

O jeito profissional de ligar as partes do jogo sem elas se conhecerem: uma
"avisa" que algo aconteceu, outra "escuta". Ex.: quando um inimigo morre, avise
\`inimigo:morreu\`; noutro canto, "Quando chegar o aviso inimigo:morreu" soma 1
ponto e toca um som. Assim o código não vira um nó.

### 👾 Moldes & enxames

- **Criar o molde** — os DADOS de um tipo de personagem (inimigo, moeda, tiro):
  tamanho, vida, velocidade, dano, cor/imagem/aparência. Defina UMA vez.
- **Nascer 1 do molde** / **…e chamar de** — quantos quiser; "e chamar de" dá um
  APELIDO ao que nasceu, e aí os blocos de personagem funcionam nele (tiro mirado
  e chefão).
- **A cada N s, nascer numa borda** / **Parar a fábrica** — o "spawner" solta
  inimigos sem parar; pare-o entre fases ou no chefão.
- **Para cada vivo do molde… fazer** — repete para todos do enxame. "item" é o da
  vez.
- **Recolher** / **Recolher quem saiu da tela** — guarda personagens para
  reaproveitar (pooling) — o segredo para o jogo não engasgar com muitos.
- **Desenhar todos vivos** / **quantos vivos** — desenha e conta o enxame.

### 🎯 Comportamentos

Movimentos prontos que os inimigos usam: **perseguir** o herói, **vaguear** ao
acaso, **virar** para o lado do alvo. Use dentro do "Para cada vivo" no "A cada
quadro" — é o mesmo cálculo que se faz à mão (ir na direção × velocidade × tempo).

**Atirar um leque** solta N tiros do molde num arco (rumo −90 = para cima): o
tiro triplo, a shotgun, o cone do mago, a chuva do chefe. Os tiros nascem com
velocidade — mova-os com "Mover pela velocidade" e recolha com "Recolher quem
saiu da tela", como qualquer tiro.

### ⏱️ Esperar (em ⏱️ Tempo)

**Esperar N segundos e então…** faz o que estiver dentro DEPOIS do tempo, uma vez
só — "o chefe aparece aos 30 s", "a mensagem some em 2 s", o próximo golpe do
combo. ("A cada N segundos" repete para sempre; este acontece uma vez.) Conta no
relógio do jogo: se pausar, para de contar.

### ❤️ Combate

**Machucar** (tira vida e deixa piscando e invencível um tempinho), **empurrar**,
**barra de vida** (vida cheia 0 = automática), **encostou (círculo)**, **a vida
acabou?**, **está invencível?** e **a vida de**. O padrão profissional de dano:
*se encostou E NÃO está invencível → machucar + empurrar + som* (assim o som só
sai no dano de verdade). E a morte: *se a vida de item acabou → faíscas +
recolher + avisar*.

### 🖥️ HUD & Missão

**Desenhar uma barra** de atual/máximo (vida grande, energia, progresso) —
combine com "a vida de".

**Vencer quando sobreviver X s ou derrotar N** define a missão (ganhou → tela de
VITÓRIA pronta + aviso \`missao:completa\`; derrota é o "Terminar o jogo", tela
de fim). **Contar +1 inimigo derrotado**, **cronômetro**, **tempo jogando** e
**quantos derrotei** completam o placar.

**Soltar o texto …** é o "+100" que sobe e some sozinho — solte na posição de
quem morreu e pronto: o motor anima e apaga (0,75 s, como nos arcades). Para
mostrar os pontos, junte o texto \`"+"\` com a variável. Funciona para "PERDEU!",
"CRÍTICO", combo… qualquer aviso rapidinho no meio do jogo.

### ✨ Faíscas

**Criar o efeito** é a RECEITA de uma explosão (dados: quantas, cor, tamanho,
duração, velocidade, gravidade). **Soltar o efeito** estoura uma; **Desenhar
todas as faíscas** as anima. Poucos blocos, muitos efeitos.

**Ligar o rastro** é o efeito CONTÍNUO: o jato da nave, a cauda do cometa, o
escapamento do carro — faíscas saem de quem anda, na taxa que você escolher, até
o **Desligar o rastro**. (O "Soltar o efeito" é um estouro único; o rastro é uma
torneira.)

**Soltar uma onda de choque** desenha o círculo que cresce e some — a cara da
explosão GRANDE. É só desenho, de propósito: para machucar quem está no raio, a
regra é sua — *"para cada vivo do molde: se a distância entre ele e a bomba <
raio → machucar"*. Assim explosão de fogo, pulso de cura e ímã usam o MESMO
bloco.

### 🎯 O mais perto (em 👾 Moldes & enxames)

**o mais perto de x … y … no molde …** devolve o vivo do enxame mais próximo
daquele ponto. É como a torre escolhe em quem atirar, e como o inimigo decide
quem perseguir quando há vários.

### 🎨 Aparência

**Criar a aparência** desenha um personagem com formas (do cantinho 0,0 para
dentro, no tamanho-base que você declarar) e dá um nome. Um molde pode usá-la —
aí TODO o enxame ganha esse visual vetorial, esticado para o tamanho do molde.
Ou use **Desenhar a aparência** em qualquer lugar e tamanho (ex.: o herói).
**Usar a folha de quadros** cola uma spritesheet (do Pinta ou baixada) no
personagem, dizendo o tamanho de cada quadro.

**Inclinar … ao andar de lado** faz o desenho tombar suave na direção do
movimento — a nave que "deita" ao desviar, o peixe, a moto. Ligue UMA vez (0
desliga); convive com o "Girar" (um soma no outro).

### 🎬 Animação

**Tocar a animação** roda uma faixa de quadros em loop — pode chamar TODO quadro
("se andando, tocar andar; senão, tocar parado"): repetir a mesma não reinicia.
Desenhou no Pinta? O seletor lista as animações da folha e preenche os números.

**O problema quando o jogo cresce:** você manda golpear e, no quadro seguinte, a
animação de andar apaga o golpe — toda animação atropela a anterior. A saída é
dizer que aquela **não pode ser interrompida**:

- **Tocar a animação … uma vez só** toca e PARA no último quadro (golpe, morrer,
  abrir o baú), e **a animação de … acabou?** diz quando terminou.
- **Pôr … no estado … por N s** é a TRAVA: enquanto durar, nada rouba a animação.
- **Animação de … no estado …** (marque a caixinha para não poder interromper) e
  **Aparência de … no estado …** dizem, UMA vez, qual visual é de cada estado —
  com folha de quadros ou com desenho.
- **Animar … sozinho** faz o resto, todo quadro: escolhe o estado pelo que ele
  está fazendo (a ordem é morte > golpe > dano > no ar > andando > parado) e vira
  o desenho para o lado que ele anda. Estado sem visual declarado usa o parente
  mais próximo (caindo parece pular; pular parece andar).
- **o estado de …** conta o que ele está fazendo agora, para o resto do jogo.

Quem usa "Atacar na direção" ganha a trava de graça: o golpe já entra no estado
"golpe" sozinho e a animação dura exatamente o golpe (um quadro pulado não estraga).

### 🎥 Câmera (mundos maiores que a tela)

**Fazer a câmera seguir** liga um mundo maior: a tela vira uma janela que segue o
personagem, presa nas bordas do mundo. O "Desenhar o jogo" passa a desenhar o
MUNDO; **Desenhar por cima (HUD)** desenha DEPOIS, preso na tela (placar, barras).
**o canto x/y da câmera** dizem que pedaço aparece. **Tremer a câmera** dá o abalo
de impacto (explosão, o chefe pisando), com a câmera ligada ou não.

**Fazer a câmera seguir … pelo mapa** é o atalho do MUNDO GIGANTE: o tamanho do
mundo vem do próprio mapa de tiles (colunas × célula) — sem fazer conta. E o
motor faz como os jogos profissionais: desenha SÓ o pedaço do mapa e os
personagens que estão na janela da câmera (um mapa 512×512 custa o mesmo que uma
telinha) — pode fazer o mundo do tamanho que quiser.

### ➡️ Tiro e giro (em 🎯 Comportamentos)

**Lançar na direção** mira UMA vez (guarda a velocidade no personagem);
**Mover pela velocidade** anda com ela a cada quadro — com o "Nascer 1 e
chamar de", isso é o tiro reto e o tiro mirado dos jogos de nave. **Girar
para X graus** roda o desenho em volta do centro.

### 🥷 A janela do golpe (em 🥷 Ação em tempo real)

**Regular o golpe de … : recuo N s, acerta por N s.** Sem isto o golpe machuca
desde o instante em que você aperta — e aí quem aperta primeiro sempre ganha,
sempre. Não dá para ler o outro, nem para desviar, nem para punir quem errou.

Com o recuo, o golpe tem três partes: o braço indo, o momento em que machuca (o
retângulo branco só aparece aqui!) e a volta. Rápido sai antes mas machuca pouco;
pesado demora, mas trava o outro tempo bastante para você emendar — **o combo.**
Deixe 0 e 0 para o golpe inteiro machucar, como antes.

### 🗺️ Mundo & profundidade

Para o mundo ter cara de jogo de verdade (vale para QUALQUER jogo, não só RPG):

- **Carregar o mapa … do meu desenho** — monta um mapa de peças (tiles) do Pinta
  (grade, peças e sólidos já vêm juntos). Dê um nome e use no comecinho.
- **Desenhar o mapa … (camada chão / topos / frente)** — o segredo da
  profundidade: o **chão** ANTES dos personagens; DEPOIS deles os **topos** (só as
  peças sólidas) OU a **frente** (a camada da frente que você marcou no Pinta,
  como copas de árvore) — assim o herói passa POR TRÁS. No "Desenhar o jogo".
- **Desenhar … e os personagens por profundidade** (Y-sort) — desenha na ordem
  certa: quem está mais embaixo na tela aparece na FRENTE. Entram o personagem que
  você passar, TODOS os enxames vivos e os NPCs (se o jogo tiver o Kit RPG).
- **Desenhar a sombra de …** — uma sombrinha embaixo do personagem (ele gruda no
  chão em vez de flutuar). Use antes de desenhar o personagem.

### ⚙️ Física

As peças de QUALQUER jogo com gravidade (plataforma, quicar, tiro com arco). São
primitivos: você liga do seu jeito, na ordem de verdade.

1. **Aplicar a gravidade em … (força)** — puxa para baixo (padrão 2160 px/s²).
2. **Mover pela velocidade** (em 🎯 Comportamentos) — anda com o que a gravidade e
   as setas escreveram.
3. **Fazer … colidir com o mapa/enxame** (🧱 abaixo) — PARA no chão.

> ⭐ **A ordem importa** (é assim nos jogos de verdade): *gravidade → mover →
> colidir*. A gravidade desliga o "está no chão"; só o pouso da colisão liga de
> volta. Fora dessa ordem o personagem vibra ou atravessa.

- **Definir a velocidade de … (x, y)** e **a velocidade x/y de …** — escreve e
  LÊ. Ler destrava o resto: "se a velocidade y de heroi > 0, tocar cair".
- **Fazer … pular (força)** — só NO CHÃO (é o que impede o pulo infinito).
- **… está no chão?** — verdadeiro no quadro em que pousou.
- **Velocidade máxima de queda** — o limite da queda livre (padrão 900); também
  impede atravessar o chão numa queda longa.
- **Fazer … quicar nas bordas** / **… atravessar para o outro lado** — a bolinha
  do pong e o Pac-Man saindo pela lateral.
- **Rebater … na raquete …** — a bola quica na raquete e o ÂNGULO muda pelo ponto
  que bateu (meio = reto, beirada = aberto). Com o "quicar nas bordas" nas paredes,
  é o Breakout e o Pong inteiros.

### 🚀 Inércia e atrito (em ⚙️ Física)

**Empurrar … no ângulo … com força …** SOMA velocidade em vez de trocar: a nave
continua andando depois que você solta o botão (é o Asteroids; "Mover no ângulo"
apagaria a velocidade de antes). Use no "A cada quadro": a força é POR SEGUNDO
(px/s², padrão 6000), igual em qualquer computador.
**Frear … com atrito …** tira a velocidade aos poucos: 0.9 = chão normal, 0.1 =
gelo. Com os dois, você tem carro, hóquei, nave e patinação.

### 🎯 Mirar de verdade (em 🔧 Propriedades & direção)

**o ângulo de …** e **o ângulo de … até …** deixam você LER a direção — antes só
dava para escrever. Com eles a torre gira até mirar no inimigo, o inimigo só
atira se estiver de frente, e o leque de tiros vira uma conta simples.

### 🧱 Colisão sólida

- **Fazer … colidir com o mapa …** — o personagem PARA nas peças sólidas do mapa
  (chão, parede, teto). Empurra pelo lado de menor sobreposição, zera a
  velocidade daquele eixo e marca "no chão" ao pousar. É a colisão de verdade.
- **Fazer … colidir com o enxame …** — o mesmo, mas contra os vivos de um molde
  (plataformas, caixas, pedras) — sem precisar de mapa.
- **Para cada … do molde … que encostar em … do molde …, fazer** — o par que se
  tocou (tiro × inimigo, herói × moeda). Pode recolher os dois lá dentro.

### ⏱️ Tempo

- **A cada … s, fazer** — repete de tempo em tempo (nascer inimigo, piscar).
  Conta o tempo do JOGO: pausou, para de contar (relógio de parede erraria).
- **… pode agir de novo (a cada … s)?** — o "recarregando" do tiro e do golpe:
  verdadeiro só quando o tempo passou, e já reinicia a contagem.

### 🔧 Propriedades & direção

- **a propriedade … de …** / **Mudar a propriedade … de … para …** — leia e
  escreva x, y, velocidade x/y, velocidade, largura e altura de qualquer
  personagem. É a chave-mestra: o que não tem bloco pronto, você faz com ela.
- **Fazer … olhar para …** / **… está olhando para onde?** — a direção move DUAS
  coisas de uma vez: a folha de andar e a caixa do golpe.

### ✨ Deslizar até (em 🎯 Comportamentos)

**Fazer … deslizar até x y em … s** — leva o personagem suavemente até um ponto
(porta que abre, plataforma que sai, câmera de cutscene). Chame UMA vez.

### 🗺️ Peças por célula (em 🗺️ Mundo & profundidade)

**a peça do mapa … em x y**, **Trocar a peça …** e **Quebrar a peça do mapa …
onde … está** — mundo destrutível (cavar, quebrar o bloco com a cabeça) e portas
que abrem trocando a peça. **Tamanho da peça** muda a escala do mapa (padrão 64).

### 🥷 Ação em tempo real

O jeito de lutar sem turnos, no mapa aberto (aventura, beat-em-up — geral):

- **Fazer … golpear na frente (alcance, por … s)** — um golpe na direção que o
  personagem olha (uma área de acerto na frente por um tempinho). Chame quando o
  jogador apertar o botão (ex.: "se a tecla espaço foi apertada").
- **o golpe de … acertou … ?** — verdadeiro quando o golpe encosta no alvo, e só
  UMA vez por golpe (não machuca 60 vezes por segundo). Padrão: "se o golpe de
  heroi acertou inimigo: machucar o inimigo".
- **Fazer … patrulhar em volta de x y (raio)** — o inimigo vagueia sozinho perto
  do posto e nunca se afasta demais. Use no "A cada quadro".
- **Desenhar corações: … de …** — a "vidinha" dos jogos de aventura (cheios = vida
  atual). Fica ótima no HUD.

### 💬 Fala & escolhas

A UI que o MOTOR desenha para você — vale em qualquer jogo, não só no RPG:

- **Mostrar a fala… de…** — caixa de fala com máquina de escrever (ESPAÇO completa
  e avança). Falas seguidas viram conversa; no fim sai o aviso \`fala:terminada\`.
- **Menu de escolha** + **Opção** — uma pergunta com opções (setas escolhem, espaço
  ou clique confirma) e roda a opção escolhida. É a loja, o sim/não, o quiz.

### 🔊 Som

Importe sons em **"Imagens e sons"** (efeitos ou música que você baixou/gravou),
**Carregue o som** dando um nome, e **Toque o som** por esse nome — combina com os
avisos ("Quando chegar o aviso inimigo:morreu, tocar o som explosao"). Sem
importar nada, **Tocar o som pronto** (moeda/batida/explosão…) já funciona.

## 🧭 O lado de fora (o que faz QUALQUER jogo)

Estes não são de kit nenhum: são as peças com que se inventa o gênero que ainda
não existe.

### 🧭 Regiões

**Criar a região** é um retângulo com NOME no mundo: a grama alta, a porta, a zona
de dano, a área segura. **está dentro da região?** pergunta se encostou.

> ⭐ **quanto de … está dentro da região (em %)** é o segredo do encontro na grama
> alta: *"se MAIS DA METADE do herói estiver no mato, com chance de 20%"*. Só
> encostar a quina não conta — é isso que faz o jogo parecer justo em vez de
> nervoso. Vale para tudo: só conta a bandeirinha se você chegou mesmo nela.

### 🎲 Sorte & medida

**com chance de … %** é o sorteio (0 = nunca, 100 = sempre): o encontro, o item
raro, o crítico. **a distância entre … e …** é a conta central do stealth (raio de
detecção), da torre (alcance) e do inimigo que só persegue se estiver perto. **o
ponto x y está dentro de …?** junta com "o mouse x/y" e você tem point-and-click,
cartas e tower defense (detectar O CLIQUE). Para jogos de GRADE (match-3, Cobrinha,
Sokoban, campo-minado), a peça que faltava é o **🧩 Tabuleiro** — uma grade nomeada
que você lê e escreve por (coluna, linha).

**um vivo qualquer do molde …** sorteia UM dos vivos do enxame (irmão do "o mais
perto de"): é como o jogo de nave escolhe qual invasor atira, quem ganha o
power-up, qual inimigo vira o elite. Sem nenhum vivo, devolve nada — teste antes
de usar.

**o vivo do molde … com a maior/menor …** escolhe pelo VALOR de uma propriedade:
o inimigo com mais vida, o mais baixo na tela, o mais avançado no caminho. É
assim que a torre de defesa mira no "líder" da fila. Sem nenhum vivo, devolve
nada.

### 🧩 Tabuleiro (jogos de grade)

Uma grade NOMEADA de células que você lê e escreve por (coluna, linha) — a peça
que faltava para Cobrinha, Match-3, Sokoban, campo-minado e puzzles.

- **Criar o tabuleiro … com … colunas × … linhas (vazio = …)** — no começo; o
  "vazio" preenche toda célula (0, \`""\`, "grama"…).
- **No tabuleiro …, pôr … na coluna …, linha …** — grava um valor numa célula.
- **o valor do tabuleiro … em (coluna …, linha …)** — lê (fora da grade = o vazio).
- **quantas células … têm o valor …** — conta (minas restantes, peças de uma cor).
- **a (coluna …, linha …) cabe no tabuleiro …?** — testa a parede/limite.

Não há bloco de laço de propósito: você VARRE a grade com o "repita" do núcleo +
ler/pôr — é assim que se aprende a mexer numa grade de verdade.

### 🃏 Cartas

⭐ **Uma PILHA é só uma LISTA** do núcleo (Valores → "criar lista"). O baralho, a
mão e o descarte são três listas; estes blocos dão o vocabulário de carta em cima
delas:

- **uma carta: frente … verso …** — cria uma carta de DUAS faces (a frente = o
  valor/figura; o verso = o que aparece virada pra baixo). Nasce virada pra baixo.
  Ponha várias numa lista = o baralho.
- **Mover a carta do topo da pilha … para a pilha …** — o COMPRAR (baralho → mão)
  E o DESCARTAR (mão → descarte) num bloco. **Remontar a pilha … juntando … e
  embaralhar** = quando o baralho acaba, joga o descarte de volta e embaralha.
- **a carta do topo da pilha …** (espia sem tirar) e **quantas cartas tem a pilha
  …** (= 0 quando acaba).
- **Virar a carta …** (memória!), **a carta … está virada para cima** e **o que
  aparece na carta …** (a frente se pra cima, o verso se pra baixo — compare duas
  para achar o par).
- **Desenhar a pilha … como fileira em x,y** mostra as cartas (marque a caixinha
  para um leque) e guarda onde cada uma ficou; **a carta clicada em x,y da pilha …**
  devolve o índice da carta sob o clique (−1 = nenhuma). Com "o mouse x/y" +
  "Quando clicar no jogo" você joga uma carta clicando nela.

Receita do jogo da memória: uma lista de cartas pareadas + "embaralhar" (Valores);
no clique, vire a carta; quando duas estão viradas, compare "o que aparece" — par
fica, senão "Esperar 0,6 s" e desvire as duas.

### 🛤️ Caminhos

Um caminho é uma trilha nomeada de pontos — a versão "linha" da região (que é
retângulo). **Criar o caminho …** guarda a lista (ponha blocos **ponto x y**
dentro; os pontos podem começar e terminar fora da tela, como o inimigo que
entra e sai). **Fazer … seguir o caminho …** anda o personagem ponto a ponto (no
"A cada quadro", dentro do "para cada vivo"), na velocidade que você der. Chegou
ao fim? Ele PARA e avisa \`caminho:fim\`. **o progresso de … no caminho** diz
quanto ele já andou, de 0 a 100 — é assim que você sabe QUEM chegou (dentro do
"para cada vivo": *"se o progresso de item = 100: tirar uma vida e recolher"*).
Serve para o inimigo de defesa de torre, a patrulha, a esteira, o NPC num trilho
de cena, a corrida.

### 🎲 Turnos & tabuleiro

As peças para MONTAR um Ludo, Jogo da Vida ou Banco Imobiliário — a criança liga
a lógica, como sempre.

- **rolar um dado de … lados** (em 🎲 Sorte & medida) — sorteia 1 até o número de
  lados (um dado de 6 dá 1 a 6). É o motor do turno: role e ande esse tanto.
- **começar com … jogadores** / **o jogador da vez** / **passar a vez** — o
  rodízio de turno (um anel: depois do último volta ao 1). **Quando a vez mudar**
  roda ao passar a vez (anuncie "Vez do jogador X").
- **A trilha de CASAS** reusa o 🛤️ Caminhos: cada **ponto** do "Criar o caminho" é
  uma casa. **Andar … N casas na trilha …** avança a peça N casas e PARA na casa
  (desliza suave e avisa \`casa:parou\`). **a casa de …** diz onde a peça está (0 =
  a primeira). **Quando um peão parar numa casa** roda ao terminar de andar — lá
  dentro, *"se a casa de peao = 7: pague aluguel"* (dê/tire pontos, mande voltar,
  pule a vez). A RECEITA do turno: role o dado → ande as casas → resolva a casa →
  passe a vez.

### 🌌 Fundo que rola (em 🔁 A cada quadro)

**Pintar o fundo rolando** repete uma imagem cobrindo a tela e a desloca na
velocidade dada — o céu que passa, a estrada infinita. Use como a PRIMEIRA linha
do "Desenhar o jogo"; duas camadas com velocidades diferentes = paralaxe (o
fundo longe anda devagar, o perto anda rápido — profundidade de graça). Congela
na pausa, como tudo.

**Pintar o fundo preso à câmera** é a paralaxe para jogos COM câmera: o fundo
segue a POSIÇÃO da câmera a um fator (0 = céu ao longe, quase parado; 1 = colado
no mundo). Duas camadas em fatores diferentes = profundidade de verdade.

### ✨ Estourar a folha (em ✨ Faíscas)

**Estourar a folha …** toca uma folha de explosão UMA vez e some (os quadros
lado a lado na imagem). É a explosão de spritesheet num bloco só — sem molde nem
"tocar uma vez". Perfeita para o impacto do tiro, o baú que abre, o inimigo que
explode.

### 🌫️ Sumir & transição

**opacidade** (100 = normal, 0 = invisível) + **sumir até … % em … s** — o fantasma,
o escudo, o inimigo derrotado que desaparece. **Deslizar a propriedade … até …**
muda QUALQUER coisa suavemente (crescer, drenar a vida, sumir) e avisa
\`deslizou:chegou\` ao terminar — dá para encadear um movimento no outro.

> ⭐ **Tela: escurecer/clarear** é o truque de TODO jogo: esconder a troca de cena
> atrás do escuro. Escureça, troque tudo, clareie — e a mágica acontece. **Piscar
> a tela** é o susto ("apareceu um inimigo!").

### 💾 Memória

**Guardar o valor … com o nome …** guarda de VERDADE: fechar o jogo e abrir de
novo, continua lá. O recorde, a fase destravada, o nome do jogador. **o valor
guardado …** lê (nunca guardou? devolve 0).

### 🎵 Música (em 🔊 Som)

**Tocar a música … sem parar** toca em LOOP — é a trilha. Chamar de novo NÃO
reinicia. **Parar o som** e **Volume do som** completam (a música costuma ficar
baixinha, 0.2, atrás dos efeitos).

### 🎯 Mirar (em 🎯 Comportamentos)

**Lançar … até o ponto x y** mira num PONTO (o "Lançar na direção" só mira em
personagem) — junte com o mouse e o tiro vai onde você clicar. **Fazer … andar no
ângulo … graus** é o par do "Girar para X graus": aquele vira só o DESENHO, este
faz ANDAR. Use os dois com o mesmo ângulo = o tanque, a nave, o Asteroids.

### 📦 Caixa de colisão (em 🔧 Propriedades & direção)

**Caixa de colisão de …** — a caixa que COLIDE não precisa ser o desenho todo. Num
personagem alto, deixe só os PÉS colidirem, senão ele encosta nas paredes com a
cabeça (é o erro clássico). Largura/altura 0 = o desenho inteiro.

### 🗺️ Mapa por código (em 🗺️ Mundo & profundidade)

**Criar o mapa vazio** faz o mapa por CÓDIGO em vez de desenhado — masmorra
sorteada, mundo gerado. Depois "Trocar a peça" num laço cava os corredores.

### 🎮 2º jogador (em 🎮 Controles)

**Mover … com as teclas: cima/baixo/esquerda/direita** — o "Mover pelas teclas"
usa WASD E as setas no MESMO personagem; com este você escolhe as teclas e tem
DOIS jogadores (luta, pong, co-op).

### Receitas úteis (só juntando os blocos)

Alguns clássicos não precisam de bloco novo — saem da combinação certa:

- **Cronômetro regressivo (0 = perdeu):** uma variável \`tempo = 60\`, no "A cada
  quadro" faça \`tempo = tempo − dt\`; quando \`tempo ≤ 0\`, "Terminar o jogo".
  Desenhe com fillText ou uma barra.
- **Fases (mundo livre):** uma variável \`fase\`; ao trocar, "Escurecer a tela",
  carregar outro mapa/cenário e "Colocar" o herói no começo. É o "próximo nível".
- **Dash (arrancada):** ao apertar a tecla, se a "recarga" estiver pronta,
  "Definir a velocidade" forte na direção + deixar invencível um tiquinho; use a
  recarga para não repetir sem parar.
- **Colecionável semeado no mapa:** um laço que varre as células; onde a peça é a
  marcada, "Nascer" uma moeda ali e apagar a peça — espalha itens pelo mapa
  desenhado no Pinta.
- **Cobrinha (Snake):** um 🧩 Tabuleiro marca onde está o corpo; a cada passo, ande
  a cabeça uma célula, marque a nova e apague a cauda. Comeu a maçã = não apaga a
  cauda (cresce). Bateu na parede ou no próprio corpo = perdeu.
- **Quebra-blocos (Breakout):** a bola com velocidade + "quicar nas bordas" +
  "Rebater na raquete"; os blocos são um enxame, e "Quando a bola e um bloco se
  tocarem" recolhe o bloco e o motor já inverteu o rumo pela raquete/parede.
- **Flappy / Corrida infinita:** gravidade na ave + "pular" ao apertar (ou "Pintar
  o fundo rolando"); os canos/obstáculos são um enxame e "Quando se tocarem" = fim.

## 🏃 Kit Plataforma

Dá para fazer plataforma na unha só com a ⚙️ Física — este Kit é o **atalho**: só
o que EXISTE em jogo de plataforma.

- **Herói de plataforma** — tudo-em-um: gravidade + andar + pular + mover, com o
  pulo gostoso embutido. Ponha no "A cada quadro" e, LOGO DEPOIS, o "colidir com
  o mapa" (ou com o enxame). Setas ou A/D andam; espaço, W ou ↑ pulam.

> ⭐ **O que faz um pulo ser gostoso** (os tutoriais esquecem os dois primeiros):
> **coyote** — ainda dá para pular um instantinho DEPOIS de sair da beirada;
> **buffer** — apertar um tiquinho ANTES de pousar não perde o pulo; **pulo
> variável** — segurou, sobe mais; toquinho, pula baixinho. Correr também pula
> mais alto. **Regular o pulo** mexe nessas janelas e na gravidade (Lua!).

- **Pular no ar** (pulo duplo), **deslizar na parede** e **pular da parede**
  (Celeste) — o pouso e a parede devolvem os pulos.
- **Subir a escada** — na peça de escada, ↑/↓ sobem e descem, a gravidade não
  vale, parar deixa pendurado e espaço pula dela.
- **Pousar nas plataformas do molde** — a tábua: subindo passa por baixo, caindo
  POUSA. **Descer com ↓ e pulo** atravessa de propósito.
- **Plataforma que vai e volta** + **pegar carona** (sem a carona ela escorrega
  debaixo do herói).
- **Derrotar pisando** — CAINDO mais rápido que o bicho, ele morre e você quica
  (aviso \`plataforma:pisou\`). **Patrulhar virando na parede** — quem manda
  virar é a colisão, então o bicho nunca trava na quina.
- **Quando … estiver (parado/andando/pulando/caindo), usar os quadros …** +
  **Animar o herói** — a animação sai sozinha da física.

## 👾 Kit Monstrinhos

> ⭐ **Um jogo de monstrinhos É um jogo do Kit RPG com OUTRA batalha.** O mundo já
> está pronto lá embaixo: a grade, os NPCs, a fala, os mapas, as flags e o salvar.
> Aqui entram só as CRIATURAS, os ENCONTROS e a batalha criatura-contra-criatura.
> (No ⚔️ Kit RPG quem luta é o herói, com a espada dele. **Escolha um dos dois** —
> misturar deixa duas vidas na tela.)

### As criaturas

- **Criatura … do tipo …** — os DADOS de uma espécie. Os pontos são do NÍVEL 1;
  cada nível dá +8 de vida, +2 de força, +1 de defesa. A velocidade decide quem
  ataca primeiro. ⭐ **O tipo você INVENTA**: fogo, gelo, doce, dinossauro — o que
  quiser. Sem imagem nem aparência, vira um retângulo (dá para jogar assim).
- **Ensinar o golpe … para …** — até 4 por bicho, e ⭐ **o menu da batalha é
  MONTADO desta lista**. O *acerto* é o tempero: 100 nunca erra, 70 erra às vezes —
  um golpe forte com acerto baixo é o risco que vale a pena.
- **Tabela de tipos: … contra … causa … ×** — ⭐ **VOCÊ inventa a regra.** 2 = super
  efetivo, 0.5 = fraquinho, 0 = não teve efeito. **Três destes fazem o triângulo**
  (fogo > planta > água > fogo) — e aí a batalha vira ESCOLHER o golpe certo, que é
  a graça do gênero inteiro. Sem tabela, todo golpe vale 1×.
- **… evolui para … no nível …** — vira outra espécie, mantendo nível e
  experiência. **… é … de pegar** faz o lendário.

### Meu time

**Ganhar a criatura … no nível …** (até 6) é o inicial que a professora dá.
**Ganhar … bola(s) de captura de força … %** — a força é a chance base: 60 é a
comum, 100 é a bola mestra. **Curar todas as minhas criaturas** é o Centro de Cura
inteiro num bloco (pendure na enfermeira). **eu tenho a criatura …?**, **quantas
criaturas eu tenho** e **Desenhar o meu time** completam.

### Os encontros

**Grama alta da célula … até …** (ou **a peça … do mapa …**, se você desenhou o
mato no Pinta) + **Na grama alta pode aparecer … do nível … ao …** (um por bicho =
a tabela) + **Chance de encontro: … %**.

> ⭐ O sorteio é **por PASSO** na grama, não por segundo — é como o jogo de verdade
> faz, e é o que dá aquela tensão de andar no mato. Monte tudo dentro do "Quando
> chegar no mapa" e **cada rota ganha os bichos dela** de graça.

### A batalha

Ela abre sozinha na grama. **Começar a batalha contra a criatura selvagem** serve
para o lendário e para as cenas; **contra o treinador …** é o rival e o ginásio (ele
troca sozinho quando a criatura dele cai, e não dá para fugir nem jogar bola).

O menu sai dos golpes da sua criatura, e os botões aparecem sozinhos: sem bola, sem
"Bola"; time de um, sem "Trocar"; treinador, sem "Fugir".

> ⭐ **A bola é 3× mais difícil com a vida cheia** — nunca impossível, mas a lição
> é ENFRAQUECER primeiro. E **quase pegar parece quase pegar**: a bola treme mais.

**peguei a criatura?** + **Quando a batalha terminar** e **ganhei a batalha?** (os
mesmos do ⚔️ Kit RPG — é o mesmo conceito, não vale aprender duas vezes). O XP, o
nível e a evolução acontecem sozinhos, e o jogo ANUNCIA cada um. **Salvar o jogo**
leva o time junto: nenhum bloco novo.

## 🥊 Kit Luta

### 🥊 a partida

O atalho do jogo de luta — dois lutadores, rounds, e um amigo (ou o computador)
do outro lado. O que NÃO é só de luta vem do motor geral: gravidade, pulo (o
"Regular o pulo" ajusta o coyote e a gravidade da luta; a força do pulo do
lutador é fixa do kit), chão (molde + nascer + colidir), dano, empurrão,
telas de fim, tremor e faíscas.

**Luta de A × B, melhor de N rounds de N s** casa os dois. Ponha DEPOIS de
posicionar cada um: é dali que sai o lugar onde eles voltam a cada round. No fim
do tempo, quem tem mais vida ganha o round; vida igual = empate.

**Desenhar o placar da luta** (sem argumentos) põe tudo: barras de vida e de
especial, cronômetro, bolinhas de round ganho e os letreiros ROUND 2 / K.O. /
TEMPO. Quer diferente? "Desenhar a barra" + "a vida de" — o caminho na unha.

**o vencedor da luta**, **o round de agora** e **os rounds ganhos por** contam o
resto. Os avisos **luta:round**, **luta:acertou**, **luta:defendeu**, **luta:ko**
e **luta:acabou** ligam som, tremor e a tela de fim.

### 🥊 os lutadores

**Lutador — andar a d, pular w, agachar s, defender f** faz TUDO num bloco:
gravidade, andar, pular, agachar, defender, e virar de frente para o outro. Cada
lutador tem as teclas DELE — por isso dois destes são dois jogadores no mesmo
teclado, sem mais nada.

**Fazer … ser controlado pelo computador** vai no LUGAR do "Lutador" daquele
lutador: trocar um pelo outro é a diferença entre jogar sozinho e chamar um
amigo. No fácil ele quase não defende; no difícil defende quase sempre, mantém a
distância, espera você errar e usa o especial na hora. Quer a SUA IA? "distância
entre", "sorte de %" e "o estado de" estão no geral.

### 🥊 golpes & combo

**Golpe "soco" de jogador1 — rápido, dano 8, alcance 45.** Você escolhe uma
PALAVRA, e ela decide o ritmo inteiro do golpe: o **rápido** sai quase na hora
mas empurra pouco; o **médio** fica no meio; o **pesado** demora para sair, mas
derruba e trava o outro por muito tempo.

⭐ **É daqui que sai o combo:** o pesado trava o outro por mais tempo do que você
leva para se recuperar — sobra uma frestinha e dá para emendar um rápido (chute →
soco encaixa). Cada golpe machuca um pouco menos (senão mataria de uma vez).

- **atravessa a defesa ✓** é o agarrão: vence quem só fica defendendo (defender
  para sempre também perde no relógio).
- **gasta o especial ✓** só sai com a barra cheia. Ela enche batendo e apanhando
  (defender não enche) e **atravessa os rounds** — por isso o último round é o
  mais tenso.
- **A animação do golpe … são os quadros N a N**: a velocidade é calculada para
  durar exatamente o golpe. Você não acerta número nenhum.
- **Fazer … dar o golpe** vai com "se a tecla foi apertada" — a tecla é sua, e é
  isso que deixa você ter dois botões, o especial e o combo.
- **o combo de** e **o especial de** contam para o placar e para a sua IA.

## 🧙 Kit RPG

O atalho AINDA MAIS FACILITADO, só para montar um RPG (aventura estilo
Zelda/Pokémon antigo): grade, NPCs, conversa, história, itens, cenas, escolhas,
salvar e batalha por turnos já vêm PRONTOS. Tudo aqui vive no mundo do RPG — os
blocos gerais lá de cima (telas, estados, avisos, personagens, câmera, mundo de
tiles) continuam valendo e se combinam com o kit.

### Mundo em grade

- **Mover pela grade** — o andar de RPG: uma célula por vez (setas/WASD),
  parando encaixado. Paredes e NPCs bloqueiam; pisar numa porta troca o mapa; o
  ESPAÇO conversa com quem está na frente. Use no "A cada quadro".
- **Bloquear a célula** — paredes do cenário. **a célula N** converte célula em
  pixels ("Colocar em x: a célula 3").
- **Deixar sólidas as peças do mapa** — transforma as peças sólidas do seu mapa de
  tiles em paredes DA GRADE. (Só vale para quem anda pela grade; num jogo de
  movimento livre a colisão sólida é outra.)

### NPCs

- **Criar o NPC** — um morador parado numa célula (sólido), com imagem ou
  aparência. **Desenhar os NPCs** no "Desenhar o jogo".
- **Quando conversar com o NPC… fazer** — roda no ESPAÇO olhando para ele. Use a
  **Mostrar a fala** (lá de cima, em 💬 Fala & escolhas) para ele responder.

### História, itens e mapas

- **Marcar que … aconteceu / já aconteceu …?** — a MEMÓRIA da história (story
  flags): a conversa muda conforme o que você já fez.
- **Ganhar/Perder o item / tenho o item…? / Desenhar o inventário** — a chave
  que abre a porta, a poção, o tesouro. O inventário fica ótimo no HUD.
- **Quando chegar no mapa… montar** — o cenário de CADA mapa (paredes, NPCs,
  portas, posição do herói). O primeiro mapa criado é onde o jogo começa;
  trocar de mapa limpa o anterior e monta o novo. **Ir para o mapa** troca na
  hora; **Criar a porta** troca ao pisar.

### 🌍 Mundo aberto (em 🧙 mundo)

O RPG de mundo aberto tem DOIS jeitos (e dá para misturar):

1. **Um mapão com câmera** — carregue um mapa de tiles GRANDE e use **Fazer a
   câmera seguir … pelo mapa** (em 🎥 Câmera): a tela vira uma janela andando
   pelo mundo, e o motor só desenha o que aparece.
2. **Mapas ligados pelas bordas (estilo Zelda)** — dentro de cada **Quando
   chegar no mapa**: declare **Este mapa tem … × … células** e **Ligar a borda
   … deste mapa ao mapa …**. Atravessou a borda → entra no vizinho pelo lado
   oposto, na MESMA linha (aviso \`mapa:<nome>\`). Ligue a borda ESPELHADA no
   outro mapa (leste de um = oeste do outro); borda sem ligação = fim do mundo.
   Com a câmera ligada, o **Este mapa tem** também vira a trava dela.

**o nome do mapa de agora** completa: "se o mapa de agora = praia → tocar a
música da praia" e o nome no HUD.

### ⚔️ Batalha por turnos (em ⚔️ batalha)

- **Meus pontos de batalha** (vida/força/**defesa**, 1x no começo) e **Começar a
  batalha contra…** (o inimigo também tem defesa) — abre a batalha em EQUIPE
  desenhada no canvas: os combatentes aparecem em fileiras (o seu time embaixo, os
  inimigos em cima). **Clique** em qualquer um para VER o painel de informações
  dele (vida, energia, força, defesa, golpes) e destacar quem está selecionado. No
  seu turno, o painel de AÇÃO lista **Atacar** (força ± 20% − defesa/2), os seus
  **golpes** nomeados, **Defender** (dano pela metade), **Item** (poção) e **Fugir**
  (50%); escolha o golpe e depois **clique no inimigo** que quer acertar. Os
  inimigos agem sozinhos (IA).
- **Adicionar aliado** põe um lutador no SEU time (o herói já entra sozinho) — você
  comanda cada um na vez dele. **Adicionar inimigo** coloca MAIS inimigos na próxima
  batalha (vários contra vários). **Ensinar o golpe … para …** dá golpes NOMEADOS a
  quem você quiser (o herói é "Você"; os aliados pelo nome) — cada um pode ter vários,
  e eles aparecem no painel de ação. Cada golpe gasta energia.
- **Imagem no combatente:** "Adicionar inimigo/aliado", "Pôr o CHEFÃO" e "Começar a
  batalha contra" têm um campo de IMAGEM (a que você "Carregou pelo nome") — o
  lutador aparece com a arte do Pinta em vez do retângulo da cor. Vazio = a cor.
- **Ficha de inimigo REUTILIZÁVEL** (defina separado, escolha na hora): **Criar a
  ficha do inimigo …** guarda um inimigo (vida/força/defesa/imagem/cor, e "chefão?")
  UMA vez; depois **Começar a batalha contra a ficha …** o coloca como inimigo
  principal, e **Adicionar o inimigo da ficha …** enfileira mais — só escolhendo pelo
  nome, sem redigitar. É como os moldes do mundo, mas para a batalha por turnos.
- **Golpe especial** (dano forte que gasta energia; a energia recupera por turno)
  + **Ganhar a poção** (cura, usada pelo botão Item) — as armas do RPG.
- **Ensinar o golpe de CURA … para …** — um golpe que devolve VIDA em vez de ferir
  (a Curandeira do time). Gasta energia e aparece no painel de ação, como os outros.
- **Ganhar XP** (no "quando a batalha terminar", se venceu) → o herói **sobe de
  nível** (mais vida/força/defesa + aviso \`subiu:nivel\`); **meu nível** / **meu
  XP** mostram a progressão. **Aplicar veneno/regenerar/atrapalhar** dá um status
  por alguns turnos: veneno tira 3 de vida por turno, regenerar devolve 3,
  atrapalhar faz o golpe errar às vezes — as armas de status do RPG.
- **Quando a batalha terminar / ganhei a batalha?** — decida o rumo: vitória →
  tela de vitória (+ XP), derrota → fim de jogo, fuga → tentar de novo.

> 👑 **Chefes e chefões:** ⭐ o inimigo AGORA usa os golpes que você ensina a ele
> (pelo NOME dele — "Ensinar o golpe … para 'Dragão'") — dá-lhe especiais e curas.
> **Pôr o CHEFÃO …** entra um inimigo MAIOR, com barra de vida grande e coroa.
> **a vida de … na batalha** (e **a vida máxima de …**) lê QUALQUER combatente → é
> a receita de FASE: *"se a vida do Chefão < metade: fica furioso"*. E **Quando for
> a vez do inimigo … : fazer** é a IA do chefe — no lugar do ataque comum, roda os
> seus blocos; dentro, **O inimigo … usa o golpe …** (um golpe ensinado) e **O
> inimigo … acerta TODO o time (dano …)** (o golpe de área). Assim o chefão muda de
> padrão conforme apanha, como nos jogos de verdade.

### 🎬 Cenas & NPCs vivos (em 🎬 cenas)

O jeito profissional de contar história:

- **Fazer a cena** — os passos acontecem UM DE CADA VEZ (o motor espera cada um
  terminar) e o herói fica parado até acabar. Dentro dela: **Esperar N s**,
  **Mostrar a fala**, **Fazer o NPC andar até a célula**, **Virar o NPC**,
  **Marcar flag**, **Ir para o mapa**, **Começar a batalha**.
- **Fazer o NPC andar até a célula** — ele caminha desviando de paredes; dois
  personagens nunca entram na mesma célula.
- **Fazer o NPC vaguear** — anda sozinho pela vila (fora de cenas).
- **Quando o herói pisar na célula… fazer** — encontro, armadilha ou cena
  automática. Monte no "Quando chegar no mapa".
- **Usar a folha de ANDAR** (🎞️) — 4 linhas (baixo/cima/esquerda/direita): o
  motor anima na direção certa quando anda. O RPG vivo.

### 💾 Salvar (em 💾 salvar)

**Salvar o jogo** / **Continuar o jogo salvo** / **tem jogo salvo?** — guarda o
progresso do RPG (flags, itens, mapa, posição, atributos, poções, golpe especial) e
continua de onde parou, mesmo fechando e reabrindo. Ligue o "Continuar" só quando
"tem jogo salvo?". (O **Menu de escolha** subiu para 💬 Fala & escolhas — vale em
qualquer jogo; aqui ele combina lindo com o "Quando conversar" e as cenas.)

## 🚀 Kit Nave

O atalho do jogo de nave (Space Invaders e primos). O que NÃO é só de nave vem
do motor geral, e é você quem monta: o SEU tiro (molde + "Atirar um leque" ou
nascer + velocidade), a colisão ("Quando se tocarem"), o placar, o dano com
invencibilidade, o som e as telas. O kit traz o que SÓ existe no gênero — e a
joia é a formação que marcha em BLOCO, impossível de montar peça por peça.

### 🚀 a nave

**Pilotar a nave** anda só de lado (setas ou A/D), preso na tela, já com a
inclinação de curva. Use no "A cada quadro" — e o tiro é seu: *"se apertou
espaço E recarregou: Atirar um leque de 1"*.

**Dar o poder de tiro … por N s** é o power-up TEMPORÁRIO (acaba sozinho):
**metralhadora** = atire com recarga bem menor segurando espaço; **leque** =
"Atirar um leque" de 5. Na hora de atirar, pergunte **o poder de tiro de …** —
é o galho do "se". Solte o poder como prêmio: *"ao derrotar, com chance de 8%"*.

### 🛸 a invasão

**Invadir: onda do molde …** cria a formação (colunas × linhas) e o MOTOR marcha
o bloco inteiro: bate na borda → todo mundo DESCE um passo e ACELERA. Se a grade
que você pediu não couber na tela, o motor ESPREME o espaço entre as colunas
para caber (as colunas que você pediu são respeitadas). Os
invasores são vivos NORMAIS do molde — seu tiro os derrota com o "Quando se
tocarem" de sempre, e a formação encolhe sozinha. ⚠️ Não mova os invasores você
mesmo (perseguir/deslizar neles briga com a marcha).

Derrotou todos? Sai o aviso \`onda:limpa\` — escute e crie a PRÓXIMA mais
rápida: *"velocidade = velocidade × 1.2; Invadir de novo"*. A dificuldade
infinita em dois blocos.

**A cada N s, um invasor atira** — um vivo SORTEADO da formação solta o tiro
(ligue UMA vez; religar troca o ritmo). O tiro desce sozinho? Não: mova com
"Para cada vivo + Mover pela velocidade" e recolha com "Recolher quem saiu" —
tiro é tiro, do kit ou seu.

**Marcar a linha de invasão** é a derrota clássica: a formação DESCEU até ali →
aviso \`onda:invadiu\` → *"Quando o aviso chegar: Terminar o jogo"*.

### 🌌 o espaço

**Desenhar o céu de estrelas** — o espaço rolando para sempre (primeira linha do
"Desenhar o jogo"). Para fundo com IMAGEM, o geral "Pintar o fundo rolando" faz
até paralaxe.

**Soltar uma bomba** — ela quica pela tela; quando o SEU tiro a recolher (no
"Quando se tocarem": Recolher a bomba), o motor solta a onda de choque, recolhe
o molde-alvo no raio e avisa \`bomba:acertou\` por vítima (some +50 lá). Máximo
de 3 no ar.

### Receitas do gênero de nave (com os blocos gerais)

- **Chefe**: um molde de vida alta + **Nascer com apelido** ("chefe") + **barra
  de vida** + padrões com "A cada N s" e "Atirar um leque". Nenhum bloco novo.
- **Asteroide que se parte**: no "Quando se tocarem" tiro × asteroide-grande,
  nasça 2 do molde pequeno na posição dele e recolha o grande.
- **Escudo**: **machucar … 0 de vida com 3 s de invencibilidade** — pisca e fica
  imune, sem tirar vida. É o escudo num bloco.
- **3 vidas**: uma variável + **corações** no HUD (o exemplo "Invasão dos Óvnis"
  mostra tudo isso junto).

## 🏰 Kit Defesa de Torre

O atalho do jogo de defesa de torre (tower defense). Pela mesma regra dos outros
kits, o que NÃO é só do gênero vem do motor geral e é você quem monta: o
**caminho** (🛤️ Caminhos, que já era geral), a mira no **alvo mais avançado**
("o vivo do molde … com a MAIOR *progresso no caminho*", da 🎲 Sorte & medida), o
**tiro** da torre, a **barra de vida** do invasor, os **corações** e a
**explosão** ao derrotar. O kit traz só o que SÓ existe em defesa de torre: os
**lugares** de torre (a grade de compra que acende sob o mouse), a **compra** que
valida moeda e lugar, a **onda** que nasce espaçada e marcha o caminho, e a
**carteira** de moedas.

### 🏰 as torres

**Marcar um lugar de torre em x … y …** põe um quadrado onde a criança pode
comprar (faça no "Preparar"). Marque vários flanqueando o caminho.

**Desenhar os lugares de torre** mostra os livres (o de baixo do mouse acende,
convidando ao clique); os ocupados somem. Use no "Desenhar o jogo".

**Quando clicar num lugar livre, pagando … moedas** é o coração da compra: a cada
clique num lugar livre COM moedas, o motor cobra o preço, ocupa o lugar e roda o
"fazer" com o centro dele em **lugarX** e **lugarY** — nasça a torre aí (*"Nascer
com apelido 'torre' em lugarX − 20, lugarY − 20"*). Sem moedas, sai o aviso
\`compra:negada\` e nada acontece. Clique num lugar OCUPADO ou fora dos lugares
cai no "Quando clicar no jogo" comum (dá para melhorar a torre ali).

**Liberar o lugar de torre em x … y …** solta o lugar (a torre foi vendida ou
destruída), deixando comprar de novo ali.

**Desenhar o alcance de … (raio …)** pinta um círculo suave sob a torre — bom
para desenhar sob a torre que o mouse está tocando.

### 👹 a invasão & as moedas

**Invadir pelo caminho …: … inimigos do molde …** solta uma fila de inimigos
entrando pelo começo do caminho, espaçados, marchando até o fim. Chegou algum ao
fim? Sai \`invasor:passou\` — tire uma vida no "Quando o aviso chegar". Acabou a
onda? Sai \`onda:limpa\` (o MESMO aviso do Kit Nave, de propósito: vocabulário
único — se usar os dois no mesmo jogo, um "Quando \`onda:limpa\`" responde aos
dois) — solte a próxima, maior: *"leva = leva + 2; Invadir de novo"*. A
dificuldade infinita em dois blocos.

**Começar com … moedas** enche a carteira no "Preparar" (e o "Jogar de novo"
volta a esse valor). **Ganhar … moedas** soma por inimigo derrotado ou onda
vencida (um número negativo GASTA). **As moedas** é o valor de agora — mostre no
placar e teste antes de deixar comprar.

### A torre que atira (a receita, com os blocos gerais)

O tiro NÃO é um bloco do kit — é a mesma receita de sempre, e é ela que ensina a
lógica de jogo:

\`\`\`
No "A cada quadro", para cada vivo do molde "torre":
  se recarregou (0.8 s):
    alvo = o vivo do molde "invasor" com a MAIOR progresso no caminho
    se alvo existe:
      se a distância entre a torre e o alvo < 220:
        tiro = Nascer com apelido "tiro" na posição da torre
        Lançar o tiro na direção do alvo a 420
Para cada vivo do molde "tiro": Mover pela velocidade; Recolher quem saiu
Quando "tiro" e "invasor" se sobrepõem:
  Recolher o tiro; Machucar o invasor 15
  se o invasor morreu: faíscas + Ganhar 25 moedas + Recolher o invasor
\`\`\`

O exemplo "Defesa do Reino" monta exatamente isso. Torre de gelo? Some um
"deslizar até" com fator baixo no invasor atingido. Torre de área? No acerto,
"para cada vivo perto" leva dano. Vender? **Liberar o lugar** + devolver metade
das moedas. Tudo receita — o kit dá só o esqueleto do gênero.

## 🃏 Kit Cartas

O atalho do RPG DE CARTAS (deck-battler, estilo Slay the Spire). Pela regra dos
kits, o kit dá só o ANDAIME (vida, energia, escudo, intenção e turnos); o DECK, a
MÃO e **o que cada carta faz** são seus — montados com as 🃏 Cartas (que são listas
do núcleo) e blocos gerais.

- **Começar uma batalha de cartas: você com … de vida, inimigo com …** abre a arena
  (roda no "jogando"; não mexe no estado). **A cada turno, começar com … de energia** é o diferencial
  do gênero: a energia RESETA todo turno (não acumula). **a minha energia** / **Gastar
  … de energia** controlam o custo das cartas.
- **Quando começar o meu turno** roda no início de cada turno seu (energia e escudo já
  resetaram): é aqui que você COMPRA a mão — "Mover a carta do topo do baralho para a
  mão" umas 5 vezes (rebaralhe com "Remontar" se o baralho zerou). **Passar o turno**
  dá a vez ao inimigo e volta pra você.
- **A vida:** **a minha vida** / **a vida do inimigo** (na batalha) + **Tirar … de
  vida do inimigo** (ataque) / **Tirar … da minha vida** (o inimigo bate; o ESCUDO
  absorve primeiro) / **Ganhar … de escudo** (defesa; some no começo do seu turno).
- **A intenção (o telegrafo, a alma do gênero):** **O inimigo vai … de … no próximo
  turno** anuncia o que ele fará (a ação é uma palavra que VOCÊ inventa: atacar,
  defender…). **Desenhar o painel da batalha de cartas** mostra as vidas, energia,
  escudo e essa intenção. No **Quando for a vez do inimigo** você RESOLVE a intenção
  ("se o inimigo vai atacar: Tirar a minha vida do valor dele") e anuncia a próxima.
- **Jogar uma carta** é receita das 🃏 Cartas: no "Quando clicar no jogo", "a carta
  clicada em (mouse x, mouse y) da mão"; se tem energia, "Gastar" o custo, aplique o
  efeito (Tirar vida do inimigo / Ganhar escudo) e "Mover" a carta da mão pro descarte.
- Vitória: "se a vida do inimigo ≤ 0: Mudar o estado para vitória". Derrota: "se a
  minha vida ≤ 0: Terminar o jogo". O exemplo "Duelo de Cartas" monta tudo isso.
`,
  examples: [
    meuPrimeiroJogoExample,
    cacaMoedasExample,
    arenaGoblinsExample,
    vilaDoDragaoExample,
    florestaNinjaExample,
    saltoNaFlorestaExample,
    bichinhosDoQuintalExample,
    invasaoDosOvnisExample,
    dueloDosBonecosExample,
    defesaDoReinoExample,
    reinoAbertoExample,
    batalhaEmEquipeExample,
    oChefaoExample,
    corridaTabuleiroExample,
    jogoDaMemoriaExample,
    dueloDeCartasExample,
    cobrinhaExample,
    quebraBlocosExample,
  ],
}
