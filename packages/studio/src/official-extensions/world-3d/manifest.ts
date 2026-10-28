import type { ExtensionManifest } from '#extensions'

export const world3DManifest: ExtensionManifest = {
  id: 'world-3d',
  name: 'Mundo 3D',
  version: '4.4.0',
  description:
    'Monte um mundo 3D aberto e passeie nele a pé, de carrinho ou de barco. São 7 cenários (floresta, praia, neve, deserto, primavera, lua e fazenda), com cidade, ilhas, amigos que conversam, missões, moedas, clima e brincadeiras de empurrar e correr. Vira jogo com pontos, vida, cronômetro, coletáveis e telas de início e fim, e aceita os modelos do Molda. Cada bloco faz um pedaço grande do mundo, sem internet.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: entra já na v0.1 pelo botão da telinha inicial (e o joystick mobile e
  // a câmera de cinema arrastável vêm nas próximas versões). Audio: o som do
  // motor e os sons do mundo (próximas versões). Storage: o recorde da corrida
  // (Kit Corrida), as conquistas e a mochila persistem por projeto no shim de localStorage.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  docs: `## Mundo 3D

Esta extensão cria um **mundo 3D aberto de verdade para você passear**: a pé,
de carrinho ou de barco. Ela usa \`window.SZWorld3D\`. Diferente dos kits de
JOGO (fases, inimigos, vida), aqui a estrela é o **mundo**: o chão com morros,
o céu do seu estilo, a natureza, a cidade e quem mora nela. Cada bloco é
"mágico": um bloco = um resultado grande na tela.
Os objetivos, diálogos, placas e demais textos automáticos usam Baloo 2,
incorporada no próprio mundo para funcionar também offline.

**O jogador** é QUEM você controla agora: o personagem a pé, o carrinho ou o
barco. Pontos, áreas, moedas, recados, clima, tornado, corrida, boliche e as
coisas de empurrar e explodir valem para o jogador, a pé ou dirigindo.

### Começando (a receita)

1. Em **⚙️ Ao iniciar**, use **Criar o mundo 3D** uma vez: escolha o estilo e o tamanho.
2. Ainda em **⚙️ Ao iniciar**, use **Deixar o chão com morros**. Altura 4,
   suavidade 5 é um ótimo passeio. Carregue ali também os seus sons.
3. Ainda em **⚙️ Ao iniciar**, crie quem passeia: **Criar o personagem a pé**,
   **Criar o carrinho dirigível** ou **Criar o barco dirigível**.
4. Em **⚡ Quando acontecer**, use os chapéus "Quando…" (pegar moeda, entrar
   na área, completar a missão…).
5. Em **🔁 Enquanto estiver rodando**, use **A cada quadro (dt)** para a SUA
   mecânica extra (opcional).

A área **🧩 Meus moldes** não é usada pelo Mundo 3D: o mundo não tem moldes, e
os sons também são carregados em **⚙️ Ao iniciar**.

Ao executar o projeto, o Studio monta e começa o passeio automaticamente.

Os exemplos vêm em ordem. Comece por **"Meu Mundo"**, **"Inverno Mágico"**,
**"Fazendinha"**, **"Base da Lua"** e **"Parque dos Brinquedos"** (passeios e
bagunça); **"Caça às Estrelas"** é o primeiro JOGO completo (coletáveis, pontos,
vida, cronômetro, telas e jogar de novo). Depois vêm **"Boliche na Praça"**, a
corrida, a ilha, a vila e a **"Pista Maluca"**; os três mundos de referência
fecham a lista.

### 🌍 Mundo

**Criar e moldar o chão**
- **Criar o mundo 3D: … de … metros de lado**. O primeiro bloco. O estilo
  muda as cores E o chão: na ❄️ neve tudo escorrega de propósito; na 🌙 lua a
  gravidade é fraquinha (pulos flutuantes!), o céu nasce estrelado e o chão vem
  com crateras. O tamanho é o lado do mundo em metros (160 dá um passeio bom;
  400 é ENORME).
- **Deixar o chão com morros: altura …, suavidade …**. Altura em metros dos
  morros (4 = colinas; 10 = montanha-russa); suavidade é o tamanho de cada
  morro (maior = largos e calmos). O meio do mundo fica plano para você nascer.
- **Aplainar o chão perto de x … z …**. Deixa um pedaço bem plano (a praça,
  o quintal, o pátio da corrida). Use antes de pôr as coisas em cima.
- **Desenhar uma trilha de … até …**. Abre um caminho plano de um ponto a
  outro (uma estradinha, a pista da corrida), acompanhando os morros.
- Aplainar, trilha e cratera também funcionam DURANTE o jogo (o chão se refaz
  uma vez por quadro), até 64 pedidos por mundo.
- **Deixar limpo perto de x z num raio de …**. Reserva um círculo SEM
  natureza espalhada (a sua praça, a sua pista). Use ANTES dos blocos de
  espalhar. O centro do mundo (onde você nasce) já vem limpo.
- **Pôr água na altura … da cor …**. Enche o mundo de água até uma altura
  (os buracos viram lago/mar). A água ondula e tem espuma na beirada; quem
  afunda volta ao último lugar seco.
- **Transformar o mundo em … ilhas num mar na altura …**. O ARQUIPÉLAGO:
  ilhas com praia separadas por mar (a água entra sozinha). Você nasce na
  ilha do meio.

**Medidas**
- **o tamanho do mundo**. O lado do mundo, para as suas contas.
- **a altura do chão em x … z …**. A altura do terreno naquele ponto. Use
  para pousar as suas coisas EM CIMA do morro.

### 🧍 Jogador

**A pé**
- **Criar o personagem a pé: roupa …, chapéu …**. WASD anda, Shift corre,
  espaço pula. O passeio COMEÇA a pé, do lado do carrinho; chegue perto dele e
  aperte **E para entrar**; dirigindo, **E desce** (longe de pontos).
- **Ajustar o personagem: andar …, correr …, pulo …**. As velocidades e o
  pulo do seu jeito.
- **Levar o personagem para x … z …**. Teleporte a pé.
- **Dar o acessório …**. 🎒 jetpack (segure espaço NO AR para voar!) ou
  👟 botas de fogo (corrida quase o dobro).
- **O personagem faz acenar/pular/girar/dançar**. Gracinhas para os seus
  momentos: acene ao chegar, dance na vitória.
- **Usar o modelo … no personagem, altura …**. Troca o boneco por um modelo
  seu do Molda (aba "Modelos 3D" do menu ⋯), em pé no chão, com a altura em
  metros. Ele anda, pula e esbarra como antes.
- **No personagem/amigo …, quando estiver parado/andando/correndo/pulando,
  tocar …**. Escreva o nome de uma animação do modelo para cada momento: a troca
  é suave. Sem animação, o modelo balança de leve ao andar.

**Carrinho**
- **Quando buzinar** e **Quando o carrinho bater forte**. Os ganchos do
  carro: a buzina pode ABRIR coisas; a trombada em coisa sólida com boa
  velocidade roda os blocos de dentro (encostar devagar não conta).
- **Criar o carrinho dirigível: … da cor …**. 🚗 passeio é equilibrado,
  🚙 jipe sobe morro melhor, 🏎️ corrida é baixinho e muito rápido. W/seta-cima
  acelera, S/seta-baixo dá ré, A/D viram, espaço pula. Descer um morro em alta
  velocidade DECOLA o carrinho!
- **Ajustar o carrinho: velocidade …, curva …, pulo …**. Velocidade máxima
  (m/s), curva (graus por segundo) e força do pulo.
- **Ligar o turbo (Shift) com força …**. Segurando shift o carrinho voa
  (força 1 = o dobro, até 4).
- **Levar o carrinho para x … z …, virado para … graus**. Teleporte: pousa
  no chão, parado. A câmera pula junto.
- **Pintar o carrinho de …**. Lisa, listras de corrida, chamas, arco-íris
  (muda de cor sozinho) ou estrelas.
- **Ligar as luzes do carrinho 🚨**. Faróis à noite, freio vermelho, ré
  branca e piscas quando você vira.
- **Ligar a buzina (tecla H) 📢**. Fom-fom em duas notas com um pulinho.
- **Marcas de pneu** e **Som do motor**. Marcas na derrapagem, no turbo e na
  neve (somem sozinhas); o ronco fica mais agudo quando acelera.
- **Usar o modelo … como carroceria, comprimento …**. Um carro do Molda no
  lugar da carroceria; as rodas continuam girando.
- **a velocidade do carrinho**. Em m/s, sempre positiva. Ótima para o placar.
- Segredo: quem digitar o código Konami (↑↑↓↓←→←→BA) transforma o carrinho
  num FOGUETE. Conta pra ninguém. 🚀

**Barco**
- **Criar o barco dirigível ⛵**. SÓ anda na água (encalha na praia),
  balança com as ondas. Com o personagem, E perto dele sobe a bordo; sem
  carrinho nem personagem, você nasce pilotando.

**Trocar e onde está**
- **Quando entrar/sair do veículo**. O gancho da troca: "Boa viagem!" ao
  entrar, "Vamos explorar!" ao descer.
- **está dirigindo?**. Verdadeiro no volante (do carrinho ou do barco).
- **onde o jogador está (x/y/z)**. A posição de quem você controla agora: a
  pé, no carrinho ou no barco (y = altura).

### 🌿 Natureza e enfeites

- **Grama ao vento: pouca/média/muita**. Milhares de folhinhas que BALANÇAM
  com o vento, acompanham os morros e andam junto com o jogador.
- **Espalhar … pelo mundo**. Centenas de 🌳 árvores, 🌲 pinheiros, 🪨 pedras,
  🌸 flores, 🍄 cogumelos, 🌵 cactos ou 🌴 palmeiras de uma vez, sempre nos
  MESMOS lugares. Árvores, pedras e cactos são SÓLIDOS; flores e cogumelos não.
- **Espalhar … cópias do modelo …**. Igual, mas com um modelo .glb SEU:
  envie o arquivo em "Modelos 3D" (no menu ⋯) e escolha pelo seletor do
  bloco. Tamanho 1 = o original. As cópias ficam PARADAS (a pintura animada do
  Molda continua andando).
- **Pôr 1 … em x z / Pôr o modelo …**. UMA coisa num lugar exato, para os
  cantinhos especiais. Também funcionam durante o jogo (até 200 no mundo). No
  modelo, o tamanho é o lado maior em metros, ele fica em pé no chão, e
  "tocando …" escolhe uma animação dele (vazio = parado; até 24 se mexendo).
- **Pôr uma cachoeira 🏞️**. Uma cortina de água com espuma na base.
  Esconda um segredo ATRÁS dela.
- **Pôr um poste de luz 🏮**. Acende sozinho quando anoitece.
- **Vaga-lumes à noite: pouca/média/muita**. Luzinhas dançando no escuro.
- **Pôr uma fogueira 🔥 (vira ponto de retorno)**. Passe perto (a pé ou
  dirigindo) e ela vira o seu CHECKPOINT: afundou na água, volta na última
  fogueira tocada.
- **Construir uma ponte 🌉 de … até …**. Tábuas em arco ligando duas ilhas:
  carrinho e personagem passam POR CIMA; o barco, POR BAIXO.
- **Pôr um farol 🗼**. A torre listrada com a luz girando à noite.
- **Pendurar um varal de luzinhas ✨ de … até …**. Lâmpadas que ACENDEM
  quando escurece.

### 🌦️ Céu e clima

- **Quando virar dia/noite**. O gancho da virada: acenda os totens à noite!
- **Usar o céu 360° …**. Escolhe um céu 360° do projeto (arquivo .hdr) para
  virar o céu em volta do mundo; a luz do sol e do ambiente pegam as cores
  dele. Sem ele, fica o céu do estilo.
- **Ligar o ciclo dia e noite: um dia dura … minutos**. Manhã dourada →
  meio-dia → entardecer laranja → noite estrelada.
- **Deixar o céu de manhã/meio-dia/entardecer/noite**. Fixa a hora (ou
  escolhe a hora INICIAL do ciclo).
- **a hora do mundo (0 a 24)**. Para as SUAS regras de horário.
- **Fazer ☀️/🌧️/❄️/🍂/⛈️**. O clima em volta do jogador: chuva, neve, folhas
  ou TEMPESTADE (raios com trovão ATRASADO pela distância. Conte os segundos!).
  O sorteio das gotas é sempre o mesmo: o mundo chove igual em toda jogada.
- **Estação do ano: 🌸/☀️/🍂/❄️**. Recolore as copas e a grama NA HORA.
- **Nuvens no céu: nenhuma/poucas/muitas**. Nuvens fofas derivando com o vento.
- **Vento com força …**. 0 parado, 1 brisa, 3 ventania (até 5).
- **Soltar um tornado 🌪️ passeando por … segundos**. Perto ele PUXA o
  jogador; perto demais, joga pro alto!

### 🏘️ Lugares prontos

**Cidade**
- **Construir a cidadezinha 🏙️**. Uma cidade COMPLETA de um bloco só: praça
  com coreto, ruas com faixa de pedestre, casinhas, lojas, predinhos e um
  laguinho. ☀️ de dia ou 🌃 neon à noite. Só cabe UMA por mundo.
- **Construir um distrito**. Um bairro residencial, comercial, de educação,
  de saúde, industrial ou turístico. Aplaina e limpa a área sozinho.
- **Criar ruas em grade/radiais/orgânicas**. Uma rede de ruas com faixas.
- **Fazer … casas de … até …**. Uma fileira de casinhas coloridas, de praia,
  modernas ou de campo.
- **Ligar o trânsito 🚦**. Carrinhos que andam sozinhos pelo anel da cidade:
  param atrás de você, respeitam o semáforo e nunca batem.
- **Pôr uma porta interativa 🚪**. Chegue perto e aperte E: abre um cartaz
  com título, texto e (se quiser) uma imagem do projeto.

**Fazenda**
- **Plantar … fileiras de milho/alface/abóbora 🌾**, **Construir o celeiro**,
  **Pôr o moinho de vento** (as pás giram com o vento), **Fazer uma
  cerquinha 🪵** (postes sólidos) e **Soltar galinhas 🐔 ou vacas 🐄**.

**Lua**
- **Abrir uma cratera 🕳️** (funciona em qualquer mundo), **Fincar a
  bandeira 🚩** e **Pousar o foguete 🚀**.

**Galeria**
- **Criar a galeria de projetos …** e **Pendurar a imagem … com a
  legenda …**: uma praça de exposição; cada quadro ganha um "E: ver".
- **Pôr um quadro … com a imagem …**. Uma imagem do projeto numa moldura.

### 🧑‍🤝‍🧑 Amigos e missões

**Amigos**
- **Quando conversar com o amigo … (aperte E)**. O gancho da conversa. Ponha
  vários **O amigo fala** dentro: as falas entram numa FILA e cada E mostra a
  próxima, letra por letra.
- **Criar o amigo … em x z (roupa, chapéu)**. Um amigo que olha para você
  quando você chega perto. Até 8 amigos (também durante o jogo).
- **Deixar o amigo … passear num raio de …**. Ele caminha sozinho.
- **O amigo … pergunta**. Dentro de **Quando conversar**: uma PERGUNTA com
  dois botões (clique ou 1/2), e cada resposta roda os próprios blocos.
- **O amigo faz acenar/pulinho/girar/dançar**. As gracinhas dele.
- **Usar o modelo … no amigo …, altura …**. O amigo vira um modelo seu do Molda.

**Missões**
- **Quando completar a missão …**. A recompensa: fogos, uma fala do amigo,
  a próxima missão.
- **Criar a missão …: …**. A missão ATIVA aparece sozinha num painel no canto.
  Dá para criar missões novas no meio do jogo.
- **Completar a missão**. Confete + fanfarra e o **Quando completar** dispara.
- **Mostrar o ícone ❗/⭐/🎯/💰 flutuando sobre …**. O "olhe aqui!" (também
  durante o jogo). **Apontar a seta-guia 🧭**: uma seta na tela aponta o alvo.

**Conquistas**
- **Quando ganhar / Dar a conquista 🏆 / ganhou?**. Conquistas PARA SEMPRE
  (ficam salvas no projeto, entre jogadas): aviso dourado + confete na
  primeira vez.

### 📍 Pontos e áreas

- **Quando apertar E no ponto …** e **Quando o jogador entrar na área …**.
  Os ganchos: o ponto espera o E; a área dispara sozinha na ENTRADA.
- **Criar o ponto interativo … em x z**. Um pilar brilhante; chegando perto,
  aparece um "E" na tela.
- **Criar a área mágica … com raio …**. Um círculo invisível (checkpoints,
  armadilhas, boas-vindas).
- **Pôr um totem … com título e texto**. Uma placa de madeira com recado.
- **Recados-chama 🔥**. O "Cantinho dos recados" deixa QUEM JOGA escrever
  (até 20 ficam salvos); o "Pôr um recado-chama" é a SUA dica. E lê.
- **Tirar … do mundo**. Some com tudo que tem esse nome: um amigo, um ponto,
  uma área, os coletáveis ou os ícones de um tipo (❗ "alerta", ⭐ "estrela"…).

### 🏆 Placar, vida e telas

Estes blocos de jogo são os MESMOS do Jogo 3D (pontos, vida, telas, cronômetro),
só que a vida é sempre **do jogador**.

**Moedas e coletáveis**
- **Quando pegar uma moeda**. O gancho da coleta. A META é sua: "se
  **quantas moedas pegou** ≥ 15 → completar a missão".
- **Quando o jogador pegar um …**. O gancho de um coletável pelo nome dele.
- **Espalhar … moedas 🪙 / em anel / em fila**. Moedas girando (nunca embaixo
  d'água). Encoste para pegar: plim + contador no canto. Moedas criadas
  DURANTE o jogo (num "Quando…") também aparecem e contam.
- **Pôr … ⭐/💎/🍎/🔑/🎁 chamados … perto de x z raio …**. Coisas para pegar,
  girando no ar, sem arquivo nenhum. Podem nascer durante o jogo.

**Pontos**
- **Somar … aos pontos** e **os pontos**. Os pontos aparecem sozinhos no canto
  de cima, à direita (separados das moedas).

**Vida e fim**
- **Quando a vida do jogador acabar**. Bom para o "Fim de jogo: você perdeu".
- **Dar … de vida ao jogador**, **Machucar o jogador** e **Curar o jogador**.
  Os corações aparecem em cima, à esquerda; machucado, ele pisca e fica 1 s
  sem se machucar de novo. **a vida do jogador** diz quanto falta.
- **Fim de jogo: você perdeu/ganhou**. Para o jogador e mostra a tela de fim ou
  de vitória; o mundo continua aparecendo atrás.
- **Reiniciar o jogo**. Recomeço LEVE: o jogador volta ao começo; moedas,
  coletáveis, amigos, ícones, empurráveis, pontos, áreas, pinos, caixas
  explosivas, missões e a corrida voltam como eram no começo, inclusive o que foi
  tirado com **Tirar … do mundo** (o que nasceu durante a partida sai); pontos,
  vida e cronômetro recomeçam. O mundo não é refeito, e a mochila NÃO esvazia
  (para isso há **Esvaziar a mochila**).

**Cronômetro**
- **Quando a contagem acabar**, **Começar a contagem de … segundos**,
  **Parar a contagem** e **o tempo que falta**. A contagem aparece em cima, no
  meio da tela.

**Na tela**
- **Na tela de início/fim/vitória: título, texto, botão**. Com a tela de
  início, o mundo espera o botão para começar.
- **Escrever na tela …: …**. Um texto num canto (placar,
  velocímetro, dica): ↖ ↑ ↗ em cima, ↙ ↓ ↘ embaixo. Ele divide o canto com os
  painéis automáticos (moedas, missão, conquista, corrida, minimapa) e fica
  SEMPRE visível, em primeiro lugar. Texto vazio apaga.
- **Mostrar o recado … por … s**. Um balão de fala em cima do jogador.
- **Mostrar o minimapa 🗺️**. Você (seta), pontos, amigos, farol, checkpoints
  e a água no canto. M abre o mapa GRANDE; no modo teleporte, clique nele.

**Mochila 🎒**
- **Pôr / Tirar … do item … na mochila**, **quantos … há na mochila** e
  **a mochila tem pelo menos …?**. A mochila fica SALVA no projeto: ela
  continua cheia na próxima partida (até no outro dia) e nunca fica negativa.
- **Esvaziar a mochila 🎒**. Tira tudo de uma vez (o recomeçar não faz isso).

### 🎳 Brincadeiras e corrida

**Empurrar e derrubar**
- **Quando algo explodir 💥**. O gancho da explosão: pontos, fogos, sustos.
- **Pôr 1 tijolo/banco/cerca/lanterna/cone empurrável**. Objetos que o
  jogador EMPURRA de verdade (a pé ou de carrinho): deslizam, giram, quicam e
  voltam pro lugar se caírem na água.
- **Espalhar … objetos empurráveis perto de … (raio …)**. A praça da bagunça.
- **Escrever … com letras empurráveis**. Cubos de LETRA (até 24). Escreva
  seu nome!
- **Empilhar … caixas/latas em …**. Uma torre para derrubar.
- **quantas coisas derrubadas**. Para o placar.
- **Pôr uma caixa explosiva 🧨**. Encoste nela correndo ou de carrinho e BUM:
  tudo por perto voa (você também, em câmera lenta) e as caixas vizinhas
  explodem em CADEIA. Pode aparecer durante o jogo (até 64).

**Boliche**
- **Quando derrubar todos os pinos**. STRIKE! Solte os fogos.
- **Criar a pista de boliche em …**. 10 pinos em triângulo; derrube de
  carrinho ou correndo a pé.
- **Arrumar os pinos de novo** e **quantos pinos caíram**.

**Corrida**
- **Quando a corrida começar / passar por um checkpoint / completar a
  corrida**. Os ganchos da corrida. O recorde é salvo sozinho entre as jogadas.
- **Criar a corrida: largada em … (virada …, … voltas)**. Um portal de
  largada e o cronômetro (aparece sozinho no canto). Vale a pé ou dirigindo.
- **Pôr um checkpoint em …**. Um anel na pista; passe NA ORDEM dos blocos.
- **o tempo da corrida / o recorde da corrida**. Em segundos.
- **Ligar o pódio da corrida 🏆**. Na chegada, digite 3 iniciais: os 5
  melhores tempos ficam no projeto. P revê.

### 🎥 Câmera e efeitos

- **Câmera: seguir o jogador / de cima / cinema**. O jeito da câmera.
- **Tremer a câmera com força … por … s**. O drama de uma batida (o mesmo
  bloco do Jogo 3D).
- **Efeitos de cinema ligados/desligados (brilho …)**. Brilho nas coisas
  claras e cantos escurecidos, já LIGADOS. Num computador fraco o **modo
  turbo** liga sozinho: menos grama, sombra menor e sem efeitos.
- **Soltar confete 🎉** e **Soltar fogos de artifício 🎆**. As celebrações.
- **Usar qualidade automática/alta/desempenho**. Automática mede o aparelho;
  desempenho reduz sombras, grama e resolução.

### 🎮 Controles, tempo e som

**Controles**
- **A cada quadro, com o tempo dt**. A escotilha para a SUA mecânica: rode
  qualquer bloco a cada quadro. Multiplique velocidades por dt.
- **a tecla … está apertada? / acabou de ser apertada?**. Escolha a tecla na
  lista (W, A, S, D, espaço, shift, setas, Enter, E, Q, R, P, F). As teclas de
  andar e dirigir já funcionam sozinhas.

**Tempo e sorteio**
- **Depois de … segundos**. Roda uma vez quando passar esse tempo de jogo.
- **um número de … a …** e **tem chance de … %?**. O dado e a sorte.

**Som**
- **Carregar o som … do arquivo …**. Prepara um som do projeto (envie em
  "Sons", no menu ⋯) e dá um apelido. Use em **⚙️ Ao iniciar**.
- **Tocar o som …**. Toca um som carregado (bom em "Quando bater forte").
- **Tocar a música … sem parar**. A trilha do seu mundo (em loop). Inicie em
  **⚙️ Ao iniciar**, em **⚡ Quando acontecer** ou numa função, nunca dentro de
  **🔁 Enquanto estiver rodando**. Repetir a mesma música não a recomeça.
- **Parar a música**. Desliga a música.
- **Sons do lugar: 🌊/🐦/🦗**. Mar, passarinhos ou grilos, feitos na hora (sem
  arquivo). Use fora de **🔁 Enquanto estiver rodando**.

### ⭐ Regras de ouro

- **Um mundo por projeto**: use APENAS UMA extensão de jogo/mundo por projeto
  (cada uma cria a própria tela. Juntas elas brigam pelo canvas).
- Coloque "Criar o mundo 3D" em **⚙️ Ao iniciar**. O Estúdio começa o passeio
  automaticamente depois de registrar **⚡ Quando acontecer** e
  **🔁 Enquanto estiver rodando**.
- Tudo em METROS: o carrinho tem ~3 m; pense as distâncias de verdade.
- O mundo é sempre O MESMO mundo: os morros não mudam de lugar entre uma
  jogada e outra. Dá para decorar o caminho como o seu quintal.

### Créditos e inspirações

O Mundo 3D foi inspirado por mundos 3D feitos para o navegador que viraram
referência: o portfólio dirigível de Bruno Simon (o carrinho com molejo, as
letras empurráveis, o sol que segue o jogador), o Coastal World (ilhas,
jetpack e barco) e o Vocation Vista (a cidade das profissões, com portas que
contam o que tem lá dentro). Nada foi copiado: tudo aqui é desenhado na hora
com formas simples, do nosso jeito, para você montar o SEU mundo.
`,
}
