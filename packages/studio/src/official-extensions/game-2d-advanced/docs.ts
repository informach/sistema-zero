export const gameKitDocs = `## Jogo 2D Avançado

Esta extensão traz uma base reutilizável: o motor cuida de telas, estados,
tempo, entrada, carregamento e canvas; você cria as regras. O movimento usa
velocidade × \`dt\`, por isso mantém o ritmo em computadores diferentes. Menu,
pausa, carregando, fim e vitória já vêm prontos, e a UI usa Baloo 2 offline sem
substituir fontes escolhidas.

### Começando (a receita)

1. Use uma vez **Preparar o jogo profissional** (resolução fixa) ou **Preparar o
   jogo para ocupar a tela toda**. Na tela cheia, calcule posições pela
   largura/altura do jogo. A tela nasce SEM moldura; se quiser uma, some
   **Mostrar a borda da tela** (com cor e espessura) para todo mundo ver onde
   começa e termina a área do jogo.
2. Escolha a imagem no próprio bloco: personagem, NPC, item e animação carregam
   a arte sozinhos. **Carregar a imagem** serve para pré-carregar ou criar apelido.
3. Em **⚙️ Ao iniciar**, declare dados, personagens, mapas e estado inicial. A
   área roda de novo em cada Jogar/Jogar de novo.
4. Em **⚡ Quando acontecer**, registre clique, aviso, entrada de estado/mapa e
   outras reações da partida.
5. Em **🔁 Enquanto estiver rodando**, use **A cada quadro (dt)**, **Desenhar o
   jogo (ctx)**, **Desenhar o HUD** e ritmos periódicos.

Passos contínuos ficam nesses laços ou em funções chamadas por eles. Ações que já
duram sozinhas (**Mover suavemente**, **Sumir**, **Deslizar propriedade**,
**Ligar o rastro**, **Inclinar ao andar** e o atirador de invasores) são ligadas
uma vez, fora de laços. O Estúdio carrega assets e inicia o motor automaticamente;
os blocos antigos de início aparecem apenas ao migrar projetos salvos.

> ⭐ O jogo abre no \`menu\`; o botão **Jogar** inicia a partida. **A cada quadro**
> só roda em \`jogando\`. **Desenhar o jogo** também roda em pausa, fim e estados
> inventados, mas não em menu/carregamento. Para pular o menu, mude para
> \`jogando\` em **⚙️ Ao iniciar**.

### Qual kit para qual jogo? 🎮

Você monta QUALQUER jogo com os blocos gerais, mas cada **kit** é um atalho pronto
para um gênero. Escolha pelo jogo que você quer:

- 🏃 **Kit Plataforma**. Jogo de pular (fases, plataformas, pulo bom).
- ⚔️ **Kit RPG**. Explorar um mundo + **batalha por TURNOS** com espada e time.
- 👾 **Kit Monstrinhos**. Pegar e treinar **bichinhos** (estilo Pokémon).
- 🃏 **Kit Cartas**. **batalha de cartas** (deck: energia, escudo, intenção).
- 🥊 **Kit Luta**. Luta 1 contra 1 por rounds.
- 🚀 **Kit Nave**. Nave atirando, invasores (estilo Space Invaders).
- 🏰 **Kit Defesa de Torre**. Torres contra ondas de inimigos num caminho.
- 🏁 **Jogo de tabuleiro**. Dado + ordem de turno + andar casas numa trilha.

⭐ Escolha UM gênero de batalha por jogo: ⚔️ turnos, 👾 bichinhos e 🃏 cartas são
três batalhas DIFERENTES. Não misture.

### Onde faço um inimigo? (são coisas diferentes!) 👾

Cada gênero tem seu próprio tipo de oponente:

- Ação no mapa/enxame → 🐛 **molde**.
- Batalha por turnos → **Adicionar inimigo** ou **Criar a ficha do inimigo**.
- Bichinho capturável → 👾 **criatura**; personagem que conversa → 💬 **NPC**.
- No 🃏 Kit Cartas, vida e intenção do oponente já fazem parte da batalha.

### Estados

- **Começar uma nova partida**. Limpa personagens, enxames, missão, itens,
  flags e mapas transitórios; depois entra em \`jogando\`. Os botões prontos
  jogar/Jogar de novo já usam esta operação.
- **⚙️ Ao iniciar**. Lugar para criar/recolocar objetos e zerar variáveis da
  partida. O Estúdio executa essa área novamente em cada Jogar/Jogar de novo.
- **Mudar o estado do jogo para…**. Troca somente o estado, sem apagar a
  partida. O "A cada quadro" só roda em \`jogando\`;
  \`menu\`/\`pausado\`/\`fim\` mostram as telas deles; um estado inventado (ex.:
  \`loja\`) esconde as telas e congela o jogo. Mostre a SUA tela nele.
- **Quando o jogo entrar no estado…**. Roda uma vez por entrada, sem reset.
  Use para montar/desmontar uma loja ou reagir a uma transição de tela.
- **Pausar / Continuar / Voltar ao menu / Terminar o jogo**. Atalhos dos estados
  prontos. A tecla de pausa (Esc) já alterna jogando↔pausado sozinha.
- **o estado do jogo / o estado é…?**. Perguntas para usar num "se".

### Telas

- **Personalizar a tela pronta…**. Título, texto e botão de
  menu/pausa/carregando/fim/vitória. Em branco = não mexe.
- **Criar a tela… / Botão… na tela… / Mostrar a tela / Esconder todas**. Telas
  novas (loja, instruções) no mesmo estilo, com botões que rodam os seus blocos.
  Criar com o nome de uma tela pronta faz você ASSUMIR a tela: os botões dela
  saem e os textos passam a ser os seus.
- **Na tela…, pôr fundo cor… e imagem…**. Dá a SUA cara à tela (pronta ou sua):
  uma cor de fundo e, se quiser, uma imagem do Pinta cobrindo o painel. (Para uma
  tela toda DESENHADA no canvas, use um ESTADO inventado. Ele esconde os painéis
  prontos e deixa você desenhar à vontade.)

### Personagens

- **Criar o personagem…**. Posição, tamanho, velocidade (px por segundo), turbo
  e imagem ou cor.
- **Marcar o ponto de renascer** + **Fazer … renascer**. A bandeirinha e o
  buraco. São GERAIS (valem em RPG, corrida, bullet hell), por isso moram aqui e
  não no Kit Plataforma.
- **Mover pelas teclas usando o tempo…**. O movimento de topo pronto: WASD +
  setas, diagonal na mesma velocidade, tudo × dt. (Plataforma? Use o "Herói de
  plataforma" do 🏃 Kit.) Quer outra mecânica? Troque pelas suas contas.
- **Manter dentro da tela / Colocar em x,y / Recolocar no centro / turbo**. Utilidades de posição.
- **Desenhar o personagem**. Imagem (se carregou) ou retângulo da cor, dentro
  do "Desenhar o jogo".
- **encostou em…? / posição x / posição y**. Perguntas para a mecânica.

### 🎮 Controles (teclado e mouse)

- **a tecla … está apertada?**. Verdadeiro enquanto segura. Escreva a letra
  (\`w\`, \`a\`…), \`ArrowUp\`/\`ArrowDown\`/\`ArrowLeft\`/\`ArrowRight\` para as
  setas, ou \`espaço\`.
- **a tecla … acabou de ser apertada?**. Verdadeiro SÓ no quadro do aperto
  (segurar não repete). O jeito certo de fazer golpe e tiro: um aperto, uma
  ação.
- **Usar a tecla … para pausar**. Troca a tecla de pausa (padrão: Esc).
- **Quando clicar no jogo**. Roda os blocos com a posição nas coordenadas do
  MUNDO (o esticado da tela e a câmera já resolvidos). **o mouse x/y** mira no
  mundo. Para cartas, botões e painéis desenhados em **Desenhar o HUD**, use **o
  mouse x/y na tela**. **o mouse está apertado?** completa o controle por mouse
  ou toque.

### Dicas rápidas

- Cada quadro redesenha tudo: pinte o fundo primeiro.
- Use a largura/altura do jogo em limites e posições aleatórias.

> ⚠️ Use o Jogo 2D Avançado **ou** o Jogo 2D no mesmo projeto. Os dois criam a
> própria tela e podem brigar pelo canvas.

## Peças de arquitetura

Combine estes blocos para criar mecânicas próprias.

### 📢 Avisos (eventos)

Uma parte avisa e outra escuta. Ex.: ao morrer, avise \`inimigo:morreu\`; o evento
correspondente soma pontos e toca o som sem acoplar as duas regras.

### 🐛 Moldes & enxames

- **Criar o molde**. Define tamanho, vida, velocidade, dano e visual de um tipo.
- **Nascer 1 do molde** / **…e chamar de**. Cria um vivo; o apelido permite usar
  nele os blocos de personagem.
- **A cada N s, nascer numa borda** / **Parar a fábrica**. O "spawner" solta
  inimigos sem parar; pare-o entre fases ou no chefão.
- **Para cada vivo do molde… fazer**. Repete para todos do enxame. "item" é o da
  vez.
- **Recolher** / **Recolher quem saiu da tela**. Reaproveita personagens sem
  acumular objetos.
- **Desenhar todos vivos** / **quantos vivos**. Desenha e conta o enxame.

### 🎯 Comportamentos

Movimentos prontos que os inimigos usam: **perseguir** o herói, **vaguear** ao
acaso, **virar** para o lado do alvo. Use dentro do "Para cada vivo" no "A cada
quadro". É o mesmo cálculo que se faz à mão (ir na direção × velocidade × tempo).

**Atirar um leque** solta N tiros num arco (rumo −90 = para cima). Mova-os pela
velocidade e recolha quem sair da tela.

### ⏱️ Esperar (em ⏱️ Tempo)

**Esperar N segundos e então…** faz o que estiver dentro DEPOIS do tempo, uma vez
só. "o chefe aparece aos 30 s", "a mensagem some em 2 s", o próximo golpe do
combo. ("A cada N segundos" repete para sempre; este acontece uma vez.) Conta no
relógio do jogo: se pausar, para de contar. Use na preparação, num evento ou numa
função, nunca dentro de um laço.

### 🗡️ Combate

**Machucar** (tira vida e deixa piscando e invencível um tempinho), **empurrar**,
**barra de vida** (vida cheia 0 = automática), **encostou (círculo)**, **a vida
acabou?**, **está invencível?** e **a vida de**. O padrão profissional de dano:
*se encostou E NÃO está invencível → machucar + empurrar + som* (assim o som só
sai no dano de verdade). E a morte: *se a vida de item acabou → faíscas +
recolher + avisar*.

### 🖥️ HUD & Missão

**Desenhar uma barra** de atual/máximo (vida grande, energia, progresso). Combine com "a vida de".

**Vencer quando sobreviver X s ou derrotar N** define a missão (ganhou → tela de
VITÓRIA pronta + aviso \`missao:completa\`; derrota é o "Terminar o jogo", tela
de fim). **Contar +1 inimigo derrotado**, **cronômetro**, **tempo jogando** e
**quantos derrotei** completam o placar.

**Soltar o texto …** é o "+100" que sobe e some sozinho. Solte na posição de
quem morreu e pronto: o motor anima e apaga (0,75 s, como nos arcades). Para
mostrar os pontos, junte o texto \`"+"\` com a variável. Funciona para "PERDEU!",
"CRÍTICO", combo… qualquer aviso rapidinho no meio do jogo.

### ✨ Faíscas

**Criar o efeito** é a RECEITA de uma explosão (dados: quantas, cor, tamanho,
duração, velocidade, gravidade). **Soltar o efeito** estoura uma; **Desenhar
todas as faíscas** as anima. Poucos blocos, muitos efeitos.

**Ligar o rastro** é o efeito CONTÍNUO: o jato da nave, a cauda do cometa, o
escapamento do carro. Faíscas saem de quem anda, na taxa que você escolher, até
o **Desligar o rastro**. (O "Soltar o efeito" é um estouro único; o rastro é uma
torneira.)

**Soltar uma onda de choque** desenha o círculo que cresce e some. A cara da
explosão GRANDE. É só desenho, de propósito: para machucar quem está no raio, a
regra é sua. *"para cada vivo do molde: se a distância entre ele e a bomba <
raio → machucar"*. Assim explosão de fogo, pulso de cura e ímã usam o MESMO
bloco.

### 🎯 O mais perto (em 🐛 Moldes & enxames)

**o mais perto de x … y … no molde …** devolve o vivo do enxame mais próximo
daquele ponto. É como a torre escolhe em quem atirar, e como o inimigo decide
quem perseguir quando há vários.

### 🎨 Aparência

**Criar a aparência** desenha um personagem com formas (do cantinho 0,0 para
dentro, no tamanho-base que você declarar) e dá um nome. Um molde pode usá-la. Aí TODO o enxame ganha esse visual vetorial, esticado para o tamanho do molde.
Ou use **Desenhar a aparência** em qualquer lugar e tamanho (ex.: o herói).
**Usar a folha de quadros** cola uma spritesheet (do Pinta ou baixada) no
personagem, dizendo o tamanho de cada quadro.

**Inclinar … ao andar de lado** faz o desenho tombar suave na direção do
movimento. A nave que "deita" ao desviar, o peixe, a moto. Ligue UMA vez (0
desliga); convive com o "Girar" (um soma no outro).

### 📽️ Animação

**Tocar a animação** roda quadros em loop e pode ser chamado a cada quadro sem
reiniciar. **Tocar … uma vez só** para no último; **a animação acabou?** avisa o
fim. O seletor do Pinta preenche os quadros.

Para um andar não apagar o golpe, use **Pôr no estado por N s**. Declare uma vez
**Animação/Aparência no estado** e marque as que não podem ser interrompidas;
**Animar sozinho** prioriza morte > golpe > dano > ar > andando > parado.
**o estado de …** permite criar outras regras. "Atacar na direção" já trava o
estado golpe pelo tempo certo.

### 🎥 Câmera (mundos maiores que a tela)

**Fazer a câmera seguir** transforma a tela numa janela presa às bordas do mundo.
**Desenhar por cima (HUD)** mantém placar e barras na tela; **o canto x/y** informa
o trecho visível e **Tremer** dá impacto. **Seguir pelo mapa** calcula o mundo
pelas células e desenha apenas tiles/personagens visíveis, mesmo em mapas grandes.

### ➡️ Tiro e giro (em 🎯 Comportamentos)

**Lançar na direção** mira UMA vez (guarda a velocidade no personagem);
**Mover pela velocidade** anda com ela a cada quadro. Com o "Nascer 1 e
chamar de", isso é o tiro reto e o tiro mirado dos jogos de nave. **Girar
para X graus** roda o desenho em volta do centro.

### 🥷 A janela do golpe (em 🥷 Ação em tempo real)

**Regular o golpe de … : recuo N s, acerta por N s.** Sem isto o golpe machuca
desde o instante em que você aperta. E aí quem aperta primeiro sempre ganha,
sempre. Não dá para ler o outro, nem para desviar, nem para punir quem errou.

Com o recuo, o golpe tem três partes: o braço indo, o momento em que machuca (o
retângulo branco só aparece aqui!) e a volta. Rápido sai antes mas machuca pouco;
pesado demora, mas trava o outro tempo bastante para você emendar. **o combo.**
deixe 0 e 0 para o golpe inteiro machucar, como antes.

### 🗺️ Mundo & profundidade

Para o mundo ter cara de jogo de verdade (vale para QUALQUER jogo, não só RPG):

- **Carregar o mapa … do meu desenho**. Monta um mapa de peças (tiles) do Pinta
  (grade, peças e sólidos já vêm juntos). Dê um nome e use no comecinho.
- **Desenhar o mapa … (camada chão / topos / frente)**. O segredo da
  profundidade: o **chão** ANTES dos personagens; DEPOIS deles os **topos** (só as
  peças sólidas) OU a **frente** (a camada da frente que você marcou no Pinta,
  como copas de árvore). Assim o herói passa POR TRÁS. No "Desenhar o jogo".
- **Desenhar … e os personagens por profundidade** (Y-sort). Desenha na ordem
  certa: quem está mais embaixo na tela aparece na FRENTE. Entram o personagem que
  você passar, TODOS os enxames vivos e os NPCs (se o jogo tiver o Kit RPG).
- **Desenhar a sombra de …**. Uma sombrinha embaixo do personagem (ele gruda no
  chão em vez de flutuar). Use antes de desenhar o personagem.

### ⚙️ Física

Peças gerais para gravidade, plataforma, quique e projéteis:

1. **Aplicar a gravidade em … (força)**. Puxa para baixo (padrão 2160 px/s²).
2. **Mover pela velocidade** (em 🎯 Comportamentos). Anda com o que a gravidade e
   as setas escreveram.
3. **Fazer … colidir com o mapa/enxame** (🧱 abaixo). PARA no chão.

> ⭐ A ordem é *gravidade → mover → colidir*. Só o pouso marca "está no chão".

- **Definir/Ler velocidade x,y** permite animar e decidir pelo movimento.
- **Pular** só funciona no chão; **Velocidade máxima de queda** limita quedas.
- **Quicar nas bordas** e **atravessar para o outro lado** fazem Pong/Pac-Man.
- **Rebater na raquete** muda o ângulo pelo ponto de impacto (meio reto, beira aberto).

### 🚀 Inércia e atrito (em ⚙️ Física)

**Empurrar … no ângulo … com força …** SOMA velocidade em vez de trocar: a nave
continua andando depois que você solta o botão (é o Asteroids; "Mover no ângulo"
apagaria a velocidade de antes). Use no "A cada quadro": a força é POR SEGUNDO
(px/s², padrão 6000), igual em qualquer computador.
**Frear … com atrito …** tira a velocidade aos poucos: 0.9 = chão normal, 0.1 =
gelo. Com os dois, você tem carro, hóquei, nave e patinação.

### 🎯 Mirar de verdade (em 🔧 Propriedades & direção)

**o ângulo de …** e **o ângulo de … até …** deixam você LER a direção. Antes só
dava para escrever. Com eles a torre gira até mirar no inimigo, o inimigo só
atira se estiver de frente, e o leque de tiros vira uma conta simples.

### 🧱 Colisão sólida

- **Fazer … colidir com o mapa …**. O personagem PARA nas peças sólidas do mapa
  (chão, parede, teto). Empurra pelo lado de menor sobreposição, zera a
  velocidade daquele eixo e marca "no chão" ao pousar. É a colisão de verdade.
- **Fazer … colidir com o enxame …**. O mesmo, mas contra os vivos de um molde
  (plataformas, caixas, pedras). Sem precisar de mapa.
- **Para cada … do molde … que encostar em … do molde …, fazer**. O par que se
  tocou (tiro × inimigo, herói × moeda). Pode recolher os dois lá dentro.

### ⏱️ Tempo

- **A cada … s, fazer**. Repete de tempo em tempo (nascer inimigo, piscar).
  Conta o tempo do JOGO: pausou, para de contar (relógio de parede erraria).
- **… pode agir de novo (a cada … s)?**. O "recarregando" do tiro e do golpe:
  verdadeiro só quando o tempo passou, e já reinicia a contagem.

### 🔧 Propriedades & direção

- **a propriedade … de …** / **Mudar a propriedade … de … para …**. Leia e
  escreva x, y, velocidade x/y, velocidade, largura e altura de qualquer
  personagem. É a chave-mestra: o que não tem bloco pronto, você faz com ela.
- **Fazer … olhar para …** / **… está olhando para onde?**. A direção move DUAS
  coisas de uma vez: a folha de andar e a caixa do golpe.

### ✨ Deslizar até (em 🎯 Comportamentos)

**Fazer … deslizar até x y em … s**. Leva o personagem suavemente até um ponto
(porta que abre, plataforma que sai, câmera de cutscene). Chame UMA vez.

### 🗺️ Peças por célula (em 🗺️ Mundo & profundidade)

**a peça do mapa … em x y**, **Trocar a peça …** e **Quebrar a peça do mapa …
onde … está**. Mundo destrutível (cavar, quebrar o bloco com a cabeça) e portas
que abrem trocando a peça. **Tamanho da peça** muda a escala do mapa (padrão 64).

### 🥷 Ação em tempo real

O jeito de lutar sem turnos, no mapa aberto (aventura, beat-em-up. Geral):

- **Fazer … golpear na frente (alcance, por … s)**. Um golpe na direção que o
  personagem olha (uma área de acerto na frente por um tempinho). Chame quando o
  jogador apertar o botão (ex.: "se a tecla espaço foi apertada").
- **o golpe de … acertou … ?**. Verdadeiro quando o golpe encosta no alvo, e só
  UMA vez por golpe (não machuca 60 vezes por segundo). Padrão: "se o golpe de
  heroi acertou inimigo: machucar o inimigo".
- **Fazer … patrulhar em volta de x y (raio)**. O inimigo vagueia sozinho perto
  do posto e nunca se afasta demais. Use no "A cada quadro".
- **Desenhar corações: … de …**. A "vidinha" dos jogos de aventura (cheios = vida
  atual). Fica ótima no HUD; o HUD desenha até **100 corações**.

### 🗨️ Fala & escolhas

A UI que o MOTOR desenha para você. Vale em qualquer jogo, não só no RPG:

- **Mostrar a fala… de…**. Caixa de fala com máquina de escrever (ESPAÇO completa
  e avança). Falas seguidas viram conversa; no fim sai o aviso \`fala:terminada\`.
- **Menu de escolha** + **Opção**. Uma pergunta com opções (setas escolhem, espaço
  ou clique confirma) e roda a opção escolhida. É a loja, o sim/não, o quiz.

### 🔊 Som

Importe sons em **"Imagens e sons"** (efeitos ou música que você baixou/gravou),
**Carregue o som** dando um nome, e **Toque o som** por esse nome. Combina com os
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
> encostar a quina não conta. É isso que faz o jogo parecer justo em vez de
> nervoso. Vale para tudo: só conta a bandeirinha se você chegou mesmo nela.

### 🎲 Sorte & medida

**com chance de … %** é o sorteio (0 = nunca, 100 = sempre): o encontro, o item
raro, o crítico. **a distância entre … e …** é a conta central do stealth (raio de
detecção), da torre (alcance) e do inimigo que só persegue se estiver perto. **o
ponto x y está dentro de …?** junta com "o mouse x/y" e você tem point-and-click,
cartas e tower defense (detectar O CLIQUE). Para jogos de GRADE (match-3, Cobrinha,
sokoban, campo-minado), a peça que faltava é a **🧩 Grade**. Uma grade nomeada
que você lê e escreve por (coluna, linha).

**um vivo qualquer do molde …** sorteia UM dos vivos do enxame (irmão do "o mais
perto de"): é como o jogo de nave escolhe qual invasor atira, quem ganha o
power-up, qual inimigo vira o elite. Sem nenhum vivo, devolve nada. Teste antes
de usar.

**o vivo do molde … com a maior/menor …** escolhe pelo VALOR de uma propriedade:
o inimigo com mais vida, o mais baixo na tela, o mais avançado no caminho. É
assim que a torre de defesa mira no "líder" da fila. Sem nenhum vivo, devolve
nada.

### 🧩 Grade (jogos de grade)

Uma grade NOMEADA de células que você lê e escreve por (coluna, linha). A peça
que faltava para Cobrinha, Match-3, Sokoban, campo-minado e puzzles.

- **Criar o tabuleiro … com … colunas × … linhas (vazio = …)**. No começo; o
  "vazio" preenche toda célula (0, \`""\`, "grama"…). Cada tabuleiro vai até
  **512 × 512** células para o jogo continuar rápido.
- **No tabuleiro …, pôr … na coluna …, linha …**. Grava um valor numa célula.
- **o valor do tabuleiro … em (coluna …, linha …)**. Lê (fora da grade = o vazio).
- **quantas células … têm o valor …**. Conta (minas restantes, peças de uma cor).
- **a (coluna …, linha …) cabe no tabuleiro …?**. Testa a parede/limite.

Não há bloco de laço de propósito: você VARRE a grade com o "repita" do núcleo +
ler/pôr. É assim que se aprende a mexer numa grade de verdade.

### 🎴 Cartas

⭐ **Uma PILHA é só uma LISTA** do núcleo (Valores → "criar lista"). O baralho, a
mão e o descarte são três listas; estes blocos dão o vocabulário de carta em cima
delas:

- **uma carta: frente … verso …**. Cria uma carta de DUAS faces (a frente = o
  valor/figura; o verso = o que aparece virada pra baixo). Nasce virada pra baixo.
  Ponha várias numa lista = o baralho.
- **Mover a carta do topo da pilha … para a pilha …**. O COMPRAR (baralho → mão)
  e o DESCARTAR (mão → descarte) num bloco. **Remontar a pilha … juntando … e
  embaralhar** = quando o baralho acaba, joga o descarte de volta e embaralha.
- **a carta do topo da pilha …** (espia sem tirar) e **quantas cartas tem a pilha
  …** (= 0 quando acaba).
- **Virar a carta …** (memória!), **a carta … está virada para cima** e **o que
  aparece na carta …** (a frente se pra cima, o verso se pra baixo. Compare duas
  para achar o par).
- **Desenhar a pilha … como fileira em x,y** mostra as cartas (marque a caixinha
  para um leque) e guarda onde cada uma ficou; **a carta clicada em x,y da pilha …**
  devolve o índice da carta sob o clique (−1 = nenhuma). Se a fileira estiver no
  HUD, use "o mouse x/y na tela" dentro de "Quando clicar no jogo"; se estiver no
  mundo, use "o mouse x/y".

Receita do jogo da memória: uma lista de cartas pareadas + "embaralhar" (Valores);
no clique, vire a carta; quando duas estão viradas, compare "o que aparece". Par
fica, senão "Esperar 0,6 s" e desvire as duas.

### 🛤️ Caminhos

Um caminho é uma trilha nomeada de pontos. A versão "linha" da região (que é
retângulo). **Criar o caminho …** guarda a lista (ponha blocos **ponto x y**
dentro; os pontos podem começar e terminar fora da tela, como o inimigo que
entra e sai). **Fazer … seguir o caminho …** anda o personagem ponto a ponto (no
"A cada quadro", dentro do "para cada vivo"), na velocidade que você der. Chegou
ao fim? Ele PARA e avisa \`caminho:fim\`. **o progresso de … no caminho** diz
quanto ele já andou, de 0 a 100. É assim que você sabe QUEM chegou (dentro do
"para cada vivo": *"se o progresso de item = 100: tirar uma vida e recolher"*).
Serve para o inimigo de defesa de torre, a patrulha, a esteira, o NPC num trilho
de cena, a corrida.

### 🏁 Jogo de tabuleiro

As peças para MONTAR um Ludo, Jogo da Vida ou Banco Imobiliário. A criança liga
a lógica, como sempre.

- **rolar um dado de … lados** (em 🎲 Sorte & medida). Sorteia 1 até o número de
  lados (um dado de 6 dá 1 a 6). É o motor do turno: role e ande esse tanto.
- **começar com … jogadores** / **o jogador da vez** / **passar a vez**. O
  rodízio de turno (um anel: depois do último volta ao 1). **Quando a vez mudar**
  roda ao passar a vez (anuncie "Vez do jogador X").
- **A trilha de CASAS** reusa o 🛤️ Caminhos: cada **ponto** do "Criar o caminho" é
  uma casa. **Andar … N casas na trilha …** avança a peça N casas e PARA na casa
  (desliza suave e avisa \`casa:parou\`). **a casa de …** diz onde a peça está (0 =
  a primeira). **Quando um peão parar numa casa** roda ao terminar de andar. Lá
  dentro, *"se a casa de peao = 7: pague aluguel"* (dê/tire pontos, mande voltar,
  pule a vez). A RECEITA do turno: role o dado → ande as casas → resolva a casa →
  passe a vez.

### 🌌 Fundo que rola (em 🔁 A cada quadro)

**Pintar o fundo rolando** repete uma imagem cobrindo a tela e a desloca na
velocidade dada. O céu que passa, a estrada infinita. Use como a PRIMEIRA linha
do "Desenhar o jogo"; duas camadas com velocidades diferentes = paralaxe (o
fundo longe anda devagar, o perto anda rápido. Profundidade de graça). Congela
na pausa, como tudo.

**Pintar o fundo preso à câmera** é a paralaxe para jogos COM câmera: o fundo
segue a POSIÇÃO da câmera a um fator (0 = céu ao longe, quase parado; 1 = colado
no mundo). Duas camadas em fatores diferentes = profundidade de verdade.

### ✨ Estourar a folha (em ✨ Faíscas)

**Estourar a folha …** toca uma folha de explosão UMA vez e some (os quadros
lado a lado na imagem). É a explosão de spritesheet num bloco só. Sem molde nem
"tocar uma vez". Perfeita para o impacto do tiro, o baú que abre, o inimigo que
explode.

### 🌫️ Sumir & transição

**opacidade** (100 = normal, 0 = invisível) + **sumir até … % em … s**. O fantasma,
o escudo, o inimigo derrotado que desaparece. **Deslizar a propriedade … até …**
muda QUALQUER coisa suavemente (crescer, drenar a vida, sumir) e avisa
\`deslizou:chegou\` ao terminar. Dá para encadear um movimento no outro.

> ⭐ **Tela: escurecer/clarear** é o truque de TODO jogo: esconder a troca de cena
> atrás do escuro. Escureça, troque tudo, clareie. E a mágica acontece. **Piscar
> a tela** é o susto ("apareceu um inimigo!").

### 🧠 Memória

**Guardar o valor … com o nome …** guarda de VERDADE: fechar o jogo e abrir de
novo, continua lá. O recorde, a fase destravada, o nome do jogador. **o valor
guardado …** lê (nunca guardou? devolve 0).

### 🎵 Música (em 🔊 Som)

**Tocar a música … sem parar** toca em LOOP. É a trilha. Chamar de novo NÃO
reinicia. **Parar o som** e **Volume do som** completam (a música costuma ficar
baixinha, 0.2, atrás dos efeitos).

### 🎯 Mirar (em 🎯 Comportamentos)

**Lançar … até o ponto x y** mira num PONTO (o "Lançar na direção" só mira em
personagem). Junte com o mouse e o tiro vai onde você clicar. **Fazer … andar no
ângulo … graus** é o par do "Girar para X graus": aquele vira só o DESENHO, este
faz ANDAR. Use os dois com o mesmo ângulo = o tanque, a nave, o Asteroids.

### 📦 Caixa de colisão (em 🔧 Propriedades & direção)

**Caixa de colisão de …**. A caixa que COLIDE não precisa ser o desenho todo. Num
personagem alto, deixe só os PÉS colidirem, senão ele encosta nas paredes com a
cabeça (é o erro clássico). Largura/altura 0 = o desenho inteiro.

**Mostrar as caixas de colisão** contorna de verde a caixa que colide de tudo que
está vivo: herói, inimigos, tiros e o que nasce de molde. É assim que se confere
se a caixa ficou no lugar certo. Ponha em ⚙️ Ao iniciar; para tirar, apague o
bloco.

### 🗺️ Mapa por código (em 🗺️ Mundo & profundidade)

**Criar o mapa vazio** faz o mapa por CÓDIGO em vez de desenhado. Masmorra
sorteada, mundo gerado. Depois "Trocar a peça" num laço cava os corredores.
Mapas de peças e mapas-cenário vão até **512 × 512** células.

### 🎮 2º jogador (em 🎮 Controles)

**Mover … com as teclas: cima/baixo/esquerda/direita**. O "Mover pelas teclas"
usa WASD E as setas no MESMO personagem; com este você escolhe as teclas e tem
DOIS jogadores (luta, pong, co-op).

## 🏃 Kit Plataforma

Dá para fazer plataforma na unha só com a ⚙️ Física. Este Kit é o **atalho**: só
o que EXISTE em jogo de plataforma.

- **Herói de plataforma**. Tudo-em-um: gravidade + andar + pular + mover, com o
  pulo gostoso embutido. Ponha no "A cada quadro" e, LOGO DEPOIS, o "colidir com
  o mapa" (ou com o enxame). Setas ou A/D andam; espaço, W ou ↑ pulam.

> ⭐ **O que faz um pulo ser gostoso** (os tutoriais esquecem os dois primeiros):
> **coyote**. Ainda dá para pular um instantinho DEPOIS de sair da beirada;
> **buffer**. Apertar um tiquinho ANTES de pousar não perde o pulo; **pulo
> variável**. Segurou, sobe mais; toquinho, pula baixinho. Correr também pula
> mais alto. **Regular o pulo** mexe nessas janelas e na gravidade (Lua!).

- **Pular no ar** (pulo duplo), **deslizar na parede** e **pular da parede**
  (Celeste). O pouso e a parede devolvem os pulos.
- **Subir a escada**. Na peça de escada, ↑/↓ sobem e descem, a gravidade não
  vale, parar deixa pendurado e espaço pula dela.
- **Pousar nas plataformas do molde**. A tábua: subindo passa por baixo, caindo
  POUSA. **Descer com ↓ e pulo** atravessa de propósito.
- **Plataforma que vai e volta** + **pegar carona** (sem a carona ela escorrega
  debaixo do herói).
- **Derrotar pisando**. CAINDO mais rápido que o bicho, ele morre e você quica
  (aviso \`plataforma:pisou\`). **Patrulhar virando na parede**. Quem manda
  virar é a colisão, então o bicho nunca trava na quina.
- **Quando … estiver (parado/andando/pulando/caindo), usar os quadros …** +
  **Animar o herói**. A animação sai sozinha da física.

## 👾 Kit Monstrinhos

> ⭐ **Um jogo de monstrinhos É um jogo do Kit RPG com OUTRA batalha.** O mundo já
> está pronto lá embaixo: a grade, os NPCs, a fala, os mapas, as flags e o salvar.
> Aqui entram só as CRIATURAS, os ENCONTROS e a batalha criatura-contra-criatura.
> (No ⚔️ Kit RPG quem luta é o herói, com a espada dele. **Escolha um dos dois**. Misturar deixa duas vidas na tela.)

### As criaturas

- **Criatura … do tipo …**. Os DADOS de uma espécie. Os pontos são do NÍVEL 1;
  cada nível dá +8 de vida, +2 de força, +1 de defesa. A velocidade decide quem
  ataca primeiro. ⭐ **O tipo você INVENTA**: fogo, gelo, doce, dinossauro. O que
  quiser. Sem imagem nem aparência, vira um retângulo (dá para jogar assim).
- **Ensinar o golpe … para …**. Até 4 por bicho, e ⭐ **o menu da batalha é
  MONTADO desta lista**. O *acerto* é o tempero: 100 nunca erra, 70 erra às vezes. Um golpe forte com acerto baixo é o risco que vale a pena.
- **Tabela de tipos: … contra … causa … ×**. ⭐ **VOCÊ inventa a regra.** 2 = super
  efetivo, 0.5 = fraquinho, 0 = não teve efeito. **Três destes fazem o triângulo**
  (fogo > planta > água > fogo). E aí a batalha vira ESCOLHER o golpe certo, que é
  a graça do gênero inteiro. Sem tabela, todo golpe vale 1×.
- **… evolui para … no nível …**. Vira outra espécie, mantendo nível e
  experiência. **… é … de pegar** faz o lendário.

### Meu time

**Ganhar a criatura … no nível …** (até 6) é o inicial que a professora dá.
**Ganhar … bola(s) de captura de força … %**. A força é a chance base: 60 é a
comum, 100 é a bola mestra; a mochila guarda até **999 bolas de captura**.
**Curar todas as minhas criaturas** é o Centro de Cura
inteiro num bloco (pendure na enfermeira). **eu tenho a criatura …?**, **quantas
criaturas eu tenho** e **Desenhar o meu time** completam.

### Os encontros

**Grama alta da célula … até …** (ou **a peça … do mapa …**, se você desenhou o
mato no Pinta) + **Na grama alta pode aparecer … do nível … ao …** (um por bicho =
a tabela) + **Chance de encontro: … %**.

> ⭐ O sorteio é **por PASSO** na grama, não por segundo. É como o jogo de verdade
> faz, e é o que dá aquela tensão de andar no mato. Monte tudo dentro do "Quando
> chegar no mapa" e **cada rota ganha os bichos dela** de graça.

### A batalha

Ela abre sozinha na grama. **Começar a batalha contra a criatura selvagem** serve
para o lendário e para as cenas; **contra o treinador …** é o rival e o ginásio (ele
troca sozinho quando a criatura dele cai, e não dá para fugir nem jogar bola).

O menu sai dos golpes da sua criatura, e os botões aparecem sozinhos: sem bola, sem
"Bola"; time de um, sem "Trocar"; treinador, sem "Fugir".

> ⭐ **A bola é 3× mais difícil com a vida cheia**. Nunca impossível, mas a lição
> é ENFRAQUECER primeiro. E **quase pegar parece quase pegar**: a bola treme mais.

**peguei a criatura?** + **Quando a batalha terminar** e **ganhei a batalha?** (os
mesmos do ⚔️ Kit RPG. É o mesmo conceito, não vale aprender duas vezes). O XP, o
nível e a evolução acontecem sozinhos, e o jogo ANUNCIA cada um. **Salvar o jogo**
leva o time junto: nenhum bloco novo.

## 🥊 Kit Luta

### 🥊 a partida

O atalho do jogo de luta. Dois lutadores, rounds, e um amigo (ou o computador)
do outro lado. O que NÃO é só de luta vem do motor geral: gravidade, pulo (o
"Regular o pulo" ajusta o coyote e a gravidade da luta; a força do pulo do
lutador é fixa do kit), chão (molde + nascer + colidir), dano, empurrão,
telas de fim, tremor e faíscas.

**Luta de A × B, melhor de N rounds de N s** casa os dois (de 1 a 9 rounds). Ponha DEPOIS de
posicionar cada um: é dali que sai o lugar onde eles voltam a cada round. No fim
do tempo, quem tem mais vida ganha o round; vida igual = empate.

**Desenhar o placar da luta** (sem argumentos) põe tudo: barras de vida e de
especial, cronômetro, bolinhas de round ganho e os letreiros ROUND 2 / K.O. /
TEMPO. Quer diferente? "Desenhar a barra" + "a vida de". O caminho na unha.

**o vencedor da luta**, **o round de agora** e **os rounds ganhos por** contam o
resto. Os avisos **luta:round**, **luta:acertou**, **luta:defendeu**, **luta:ko**
e **luta:acabou** ligam som, tremor e a tela de fim.

### 🥊 os lutadores

**Lutador. Andar a d, pular w, agachar s, defender f** faz TUDO num bloco:
gravidade, andar, pular, agachar, defender, e virar de frente para o outro. Cada
lutador tem as teclas DELE. Por isso dois destes são dois jogadores no mesmo
teclado, sem mais nada.

**Fazer … ser controlado pelo computador** vai no LUGAR do "Lutador" daquele
lutador: trocar um pelo outro é a diferença entre jogar sozinho e chamar um
amigo. No fácil ele quase não defende; no difícil defende quase sempre, mantém a
distância, espera você errar e usa o especial na hora. Quer a SUA IA? "distância
entre", "sorte de %" e "o estado de" estão no geral.

### 🥊 golpes & combo

**Golpe "soco" de jogador1. Rápido, dano 8, alcance 45.** Você escolhe uma
PALAVRA, e ela decide o ritmo inteiro do golpe: o **rápido** sai quase na hora
mas empurra pouco; o **médio** fica no meio; o **pesado** demora para sair, mas
derruba e trava o outro por muito tempo.
Golpes são definições do personagem: podem ficar no topo, antes de **Luta de**;
quando uma nova partida começa, ela reaproveita essas definições.

⭐ **É daqui que sai o combo:** o pesado trava o outro por mais tempo do que você
leva para se recuperar. Sobra uma frestinha e dá para emendar um rápido (chute →
soco encaixa). Cada golpe machuca um pouco menos (senão mataria de uma vez).

- **atravessa a defesa ✓** é o agarrão: vence quem só fica defendendo (defender
  para sempre também perde no relógio).
- **gasta o especial ✓** só sai com a barra cheia. Ela enche batendo e apanhando
  (defender não enche) e **atravessa os rounds**. Por isso o último round é o
  mais tenso.
- **A animação do golpe … são os quadros N a N**: a velocidade é calculada para
  durar exatamente o golpe. Você não acerta número nenhum.
- **Fazer … dar o golpe** vai com "se a tecla foi apertada". A tecla é sua, e é
  isso que deixa você ter dois botões, o especial e o combo.
- **o combo de** e **o especial de** contam para o placar e para a sua IA.

## 🧙 Kit RPG

O atalho AINDA MAIS FACILITADO, só para montar um RPG (aventura estilo
zelda/Pokémon antigo): grade, NPCs, conversa, história, itens, cenas, escolhas,
salvar e batalha por turnos já vêm PRONTOS. Tudo aqui vive no mundo do RPG. Os
blocos gerais lá de cima (telas, estados, avisos, personagens, câmera, mundo de
tiles) continuam valendo e se combinam com o kit.

### Mundo em grade

- **Mover pela grade**. O andar de RPG: uma célula por vez (setas/WASD),
  parando encaixado. Paredes e NPCs bloqueiam; pisar numa porta troca o mapa; o
  ESPAÇO conversa com quem está na frente. Use no "A cada quadro".
- **Bloquear a célula**. Paredes do cenário. **a célula N** converte célula em
  pixels ("Colocar em x: a célula 3").
- **Deixar sólidas as peças do mapa**. Transforma as peças sólidas do seu mapa de
  tiles em paredes DA GRADE. (Só vale para quem anda pela grade; num jogo de
  movimento livre a colisão sólida é outra.)

### NPCs

- **Criar o NPC**. Um morador parado numa célula (sólido), com imagem ou
  aparência. **Desenhar os NPCs** no "Desenhar o jogo".
- **Quando conversar com o NPC… fazer**. Roda no ESPAÇO olhando para ele. Use a
  **Mostrar a fala** (lá de cima, em 🗨️ Fala & escolhas) para ele responder.

### História, itens e mapas

- **Marcar que … aconteceu / já aconteceu …?**. A MEMÓRIA da história (story
  flags): a conversa muda conforme o que você já fez.
- **Ganhar/Perder o item / tenho o item…? / Desenhar o inventário**. A chave
  que abre a porta, a poção, o tesouro. O inventário fica ótimo no HUD.
- **Começar o jogo no mapa-cenário…**. Escolhe explicitamente onde a aventura começa e
  recomeça. Sem esse bloco, o primeiro mapa criado é usado.
- **Criar mapa-cenário … com … × … células**. Declara o mapa e o seu tamanho. Dentro
  de **desenhar com ctx**, a criança constrói o visual com formas vetoriais, um
  mapa do Pinta ou uma imagem importada; o motor não inventa um cenário.
- **Quando entrar no mapa-cenário… fazer**. Define somente os acontecimentos de CADA
  entrada (paredes, NPCs, portas, posição do herói e diálogos). Trocar de mapa
  limpa os acontecimentos do anterior e executa os do novo.
  **Ir para o mapa** troca na hora; **Criar a porta** troca ao pisar. Um nome de
  mapa inexistente avisa e cai no primeiro mapa válido, sem abrir um mundo vazio.
  O mapa-cenário e um mapa de peças desenhado nele precisam declarar as mesmas
  quantidades de colunas e linhas.

### 🌍 Mundo aberto (em 🧙 mundo)

O RPG de mundo aberto tem DOIS jeitos (e dá para misturar):

1. **Um mapão com câmera**. Carregue um mapa de tiles GRANDE e use **Fazer a
   câmera seguir … pelo mapa** (em 🎥 Câmera): a tela vira uma janela andando
   pelo mundo, e o motor só desenha o que aparece.
2. **Mapas ligados pelas bordas (estilo Zelda)**. Crie cada mapa com seu tamanho
   E, dentro de **Quando entrar no mapa**, use **Ligar a borda … deste mapa ao
   mapa …**. Atravessou a borda → entra no vizinho pelo lado
   oposto, na MESMA linha (aviso \`mapa:<nome>\`). Ligue a borda ESPELHADA no
   outro mapa (leste de um = oeste do outro); borda sem ligação = fim do mundo.
   Com a câmera ligada, o tamanho do **Criar o mapa** também vira a trava dela.

**o nome do mapa de agora** completa: "se o mapa de agora = praia → tocar a
música da praia" e o nome no HUD.

### ⚔️ Batalha por turnos (em ⚔️ batalha)

- **Meus pontos de batalha**, **Golpe especial**, **Adicionar aliado** e os
  blocos **Ensinar golpe** configuram dados persistentes. Use na preparação ou
  em uma reação que acontece uma vez, nunca dentro de um laço. **Começar a
  batalha contra…** abre o combate em
  equipe. No painel, escolha Atacar, um golpe, Defender, Item ou Fugir; depois
  clique no alvo. A defesa reduz dano, e os inimigos agem sozinhos.
- **Adicionar aliado/inimigo** monta confrontos com vários lutadores. O time aceita
  até **5 aliados além do herói**. A fila aceita até **5 inimigos extras** além do
  principal, e o estoque vai até **99 poções**. Monte tudo antes da batalha, nunca
  dentro de um laço. Os campos de imagem usam a arte do Pinta.
- **Criar a ficha do inimigo** guarda vida, força, defesa, visual e a marca de
  chefão. Depois, comece a batalha contra a ficha ou adicione cópias pelo nome.
- **Golpe especial**, **poção** e **Curar o herói** sustentam a aventura entre
  lutas. A vida atravessa batalhas; perder ou subir de nível recupera o herói.
- **Ganhar XP**, nível e status de veneno, regeneração ou atrapalho criam
  progressão. Em **Quando a batalha terminar**, trate vitória, derrota e fuga.

> 👑 **Chefões:** ensine golpes ao inimigo e use **Quando for a vez do
> inimigo** para escolher entre golpe e dano em área. **A vida na batalha** permite
> trocar o padrão quando a vida cair; **Pôr o CHEFÃO** destaca o oponente.


### 🎬 Cenas & NPCs vivos (em 🎬 cenas)

O jeito profissional de contar história:

- **Fazer a cena**. Os passos acontecem UM DE CADA VEZ (o motor espera cada um
  terminar) e o herói fica parado até acabar. Dentro dela: **Esperar N s**,
  **Mostrar a fala**, **Fazer o NPC andar até a célula**, **Virar o NPC**,
  **Marcar flag**, **Ir para o mapa**, **Começar a batalha**.
- **Fazer o NPC andar até a célula**. Ele caminha desviando de paredes; dois
  personagens nunca entram na mesma célula.
- **Fazer o NPC vaguear**. Anda sozinho pela vila (fora de cenas).
- **Quando o herói pisar na célula… fazer**. Encontro, armadilha ou cena
  automática. Monte no "Quando entrar no mapa".
- **Usar a folha de ANDAR** (🎞️). 4 linhas (baixo/cima/esquerda/direita): o
  motor anima na direção certa quando anda. O RPG vivo.

### 💾 Salvar (em 💾 salvar)

**Salvar o jogo** / **Continuar o jogo salvo** / **tem jogo salvo?**. Guarda o
progresso do RPG (flags, itens, mapa, posição, atributos, poções, golpe especial) e
continua de onde parou, mesmo fechando e reabrindo. Ligue o "Continuar" só quando
"tem jogo salvo?". (O **Menu de escolha** subiu para 🗨️ Fala & escolhas. Vale em
qualquer jogo; aqui ele combina lindo com o "Quando conversar" e as cenas.)

## 🚀 Kit Nave

O kit traz nave, formações, invasores e bombas. Tiros, colisão, placar, dano,
som e telas usam as peças gerais do motor.

### 🚀 a nave

**Pilotar a nave** anda de lado (setas ou A/D), preso à tela. Use no "A cada
quadro"; para atirar: *se apertou espaço e recarregou, Atirar um leque de 1*.

**Dar o poder de tiro … por N s** é o power-up TEMPORÁRIO (acaba sozinho):
**metralhadora** = atire com recarga bem menor segurando espaço; **leque** =
"Atirar um leque" de 5. Na hora de atirar, pergunte **o poder de tiro de …**. É o galho do "se". Solte o poder como prêmio: *"ao derrotar, com chance de 8%"*.

### 🛸 a invasão

**Invadir: onda do molde …** cria uma formação que marcha, desce na borda e
acelera. Ela ajusta o espaço para caber. Os invasores continuam sendo vivos
normais do molde; não aplique outro movimento neles.

Derrotou todos? Sai o aviso \`onda:limpa\`. Escute e crie a PRÓXIMA mais
rápida: *"velocidade = velocidade × 1.2; Invadir de novo"*. A dificuldade
infinita em dois blocos.

**A cada N s, um invasor atira**. Um vivo SORTEADO da formação solta o tiro
(ligue UMA vez; religar troca o ritmo). O tiro desce sozinho? Não: mova com
"Para cada vivo + Mover pela velocidade" e recolha com "Recolher quem saiu". Tiro é tiro, do kit ou seu.

**Marcar a linha de invasão** é a derrota clássica: a formação DESCEU até ali →
aviso \`onda:invadiu\` → *"Quando o aviso chegar: Terminar o jogo"*.

### 🌌 o espaço

**Desenhar o céu de estrelas**. O espaço rolando para sempre (primeira linha do
"Desenhar o jogo"). Para fundo com IMAGEM, o geral "Pintar o fundo rolando" faz
até paralaxe.

**Soltar uma bomba** quica até seu tiro recolhê-la; então atinge o molde no raio
e avisa \`bomba:acertou\` por vítima. Máximo de 3 no ar.

### Receitas do gênero de nave (com os blocos gerais)

- **Chefe**: um molde de vida alta + **Nascer com apelido** ("chefe") + **barra
  de vida** + padrões com "A cada N s" e "Atirar um leque". Nenhum bloco novo.
- **Asteroide que se parte**: no "Quando se tocarem" tiro × asteroide-grande,
  nasça 2 do molde pequeno na posição dele e recolha o grande.
- **Escudo**: **machucar … 0 de vida com 3 s de invencibilidade**. Pisca e fica
  imune, sem tirar vida. É o escudo num bloco.
- **3 vidas**: uma variável + **corações** no HUD (o exemplo "Invasão dos Óvnis"
  mostra tudo isso junto).

## 🏰 Kit Defesa de Torre

O kit traz lugares de torre, compra, ondas e moedas. Caminho, mira, tiros, vida,
corações e explosões são peças gerais combinadas na receita abaixo.

### 🏰 as torres

**Marcar um lugar de torre em x … y …** põe um quadrado onde a criança pode
comprar (faça no "Preparar"). Marque vários flanqueando o caminho.

**Desenhar os lugares de torre** mostra os livres (o de baixo do mouse acende,
convidando ao clique); os ocupados somem. Use no "Desenhar o jogo".

**Quando clicar num lugar livre, pagando … moedas** cobra, ocupa e roda o corpo
com o centro em **lugarX/lugarY**. Sem saldo, avisa \`compra:negada\`. Cliques fora
ou em lugar ocupado seguem para "Quando clicar no jogo".

**Liberar o lugar de torre em x … y …** solta o lugar (a torre foi vendida ou
destruída), deixando comprar de novo ali.

**Desenhar o alcance de … (raio …)** pinta um círculo suave sob a torre. Bom
para desenhar sob a torre que o mouse está tocando.

### 👹 a invasão & as moedas

**Invadir pelo caminho …** solta inimigos espaçados. Ao chegar, avisa
\`invasor:passou\`; ao limpar a onda, avisa \`onda:limpa\`, igual ao Kit Nave.

**Começar com … moedas** enche a carteira no "Preparar" e deve ficar fora dos
laços (o "Jogar de novo"
volta a esse valor). **Ganhar … moedas** soma por inimigo derrotado ou onda
vencida (um número negativo GASTA). **As moedas** é o valor de agora. Mostre no
placar e teste antes de deixar comprar.

### A torre que atira (a receita, com os blocos gerais)

O kit cuida de lugar, alcance, caminho e moedas; o tiro usa as peças gerais:

\`\`\`
para cada torre, se recarregou:
  alvo = invasor com MAIOR progresso no caminho
  se existe e está no alcance: nascer tiro; lançar até alvo
para cada tiro: mover pela velocidade; recolher se saiu
ao sobrepor tiro e invasor: recolher tiro; machucar invasor
  se morreu: faíscas; ganhar moedas; recolher invasor
\`\`\`

O exemplo "Defesa do Reino" monta a receita. Para variar: gelo reduz a
velocidade, área atinge vivos próximos e vender usa **Liberar o lugar** + devolve
parte das moedas.

## 🃏 Kit Cartas

O kit entrega vida, energia, escudo, intenção e turnos; você monta baralho, mão
e efeitos com 🎴 Cartas e listas.

- **Começar uma batalha de cartas** abre a arena sem mudar o estado. **A cada
  turno, começar com energia** define o valor que RESETA; leia e **Gaste energia**
  ao jogar.
- Em **Quando começar o meu turno**, compre do baralho para a mão e remonte com o
  descarte quando necessário. **Passar o turno** chama o inimigo e volta para você.
- Ataques tiram vida; **Ganhar escudo** absorve dano até o próximo turno seu.
- **O inimigo vai … de …** anuncia a intenção. O painel mostra intenção, vidas,
  energia e escudo; em **Quando for a vez do inimigo**, resolva a ação e anuncie
  a próxima.
- No clique, descubra a carta da mão; se houver energia, pague, aplique seu efeito
  e mova-a ao descarte. Vida inimiga 0 → vitória; sua vida 0 → fim.

O exemplo "Duelo de Cartas" monta o ciclo completo.
`
