import type { ExtensionManifest } from '#extensions'
import { world3DExamples } from './examples'

export const world3DManifest: ExtensionManifest = {
  id: 'world-3d',
  name: 'Mundo 3D',
  version: '1.4.0',
  description:
    'Crie um MUNDO 3D aberto e dirija nele. Escolha o estilo (🌲 floresta, 🏖️ praia, ❄️ neve, 🏜️ deserto, 🌸 primavera), levante morros com um bloco e crie o carrinho dirigível — WASD, pulo, molejo de suspensão, câmera que segue e a altura do chão prontos. A base do seu mundo dos sonhos: passeie, explore e construa a sua mecânica por cima com o "A cada quadro".',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: entra já na v0.1 pelo botão da telinha inicial (e o joystick mobile e
  // a câmera de cinema arrastável vêm nas próximas versões). audio: o som do
  // motor e os sons do mundo (próximas versões). storage: o recorde da corrida
  // (Kit Corrida) persiste por projeto no shim de localStorage.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  docs: `## Mundo 3D

Esta extensão cria um **mundo 3D aberto de verdade para você dirigir** — como
os sites-mundo dos grandes estúdios — pelo \`window.SZWorld3D\`. Diferente dos
kits de JOGO (fases, inimigos, vida), aqui a estrela é o **mundo**: o chão com
morros, o céu do seu estilo, e um carrinho gostoso de dirigir. Cada bloco é
"mágico": um bloco = um resultado grande na tela.

O que o motor já faz por você:

- **Mundo com estilo** — floresta, praia, neve, deserto ou primavera: as cores
  do chão, do céu e da névoa combinam sozinhas. Um bloco: "Criar o mundo 3D".
- **Morros de dirigir** — "Deixar o chão com morros" levanta colinas suaves no
  mundo inteiro (o meio fica plano para o carrinho nascer em paz). E "a altura
  do chão em x z" te conta a altura em QUALQUER ponto — nada nasce enterrado.
- **Carrinho completo** — "Criar o carrinho dirigível" monta carroceria, rodas
  que giram e esterçam, molejo de suspensão (ele balança de verdade nas curvas
  e aterrissagens!), pulo com espaço, e a câmera que segue por trás com zoom
  pela velocidade. WASD e setas já funcionam.
- **Sol com sombra esperta** — a sombra acompanha o carrinho pelo mundo
  inteiro sem pesar (o truque dos jogos profissionais).
- **Laço com delta-time (dt)** — o "A cada quadro" recebe quanto durou o
  último quadro, em segundos. O mundo anda igual em qualquer computador.

### Começando (a receita)

1. **Criar o mundo 3D** — uma vez, no comecinho: o estilo e o tamanho.
2. **Deixar o chão com morros** — altura 4, suavidade 5 é um ótimo passeio.
3. **Criar o carrinho dirigível** — escolha o jeitão e a cor.
4. **A cada quadro (dt)** — a SUA mecânica extra (opcional).
5. **Começar o passeio** — uma vez, NO FIM.

### 🌍 Mundo

- **Criar o mundo 3D: … de … metros de lado** — o primeiro bloco. O estilo
  muda as cores E o chão: na ❄️ neve o carrinho escorrega de propósito. O
  tamanho é o lado do mundo em metros (160 dá um passeio bom; 400 é ENORME).
- **Deixar o chão com morros: altura …, suavidade …** — altura em metros dos
  morros (4 = colinas; 10 = montanha-russa); suavidade é o tamanho de cada
  morro (maior = largos e calmos). Pode usar até DEPOIS do começar: o chão se
  reconstrói na hora.
- **Aplainar o chão perto de x … z …** — deixa um pedaço bem plano (a praça,
  o quintal, o pátio da corrida). Use antes de pôr as coisas em cima.
- **Desenhar uma trilha de … até …** — abre um caminho plano de um ponto a
  outro (uma estradinha, a pista da corrida), acompanhando os morros.
- **Pôr água na altura … da cor …** — enche o mundo de água até uma altura
  (os buracos viram lago/mar). A água ondula; o carrinho fica lento na
  beirada e, se cair fundo, volta ao último lugar seco.
- **Começar o passeio** — liga tudo e mostra a telinha "Começar o passeio".
  Sempre o ÚLTIMO bloco.
- **o tamanho do mundo** — o lado do mundo, para as suas contas.
- **a altura do chão em x … z …** — a altura do terreno naquele ponto. Use
  para pousar as suas coisas EM CIMA do morro.

### 🌿 Natureza

- **Grama ao vento: pouca/média/muita** — o toque de vida: milhares de
  folhinhas que BALANÇAM com o vento e acompanham os morros, viajando junto
  com o carrinho (parece infinita). Custa UM desenho para a placa de vídeo —
  a mesma mágica dos sites profissionais.
- **Espalhar … pelo mundo** — o bloco que POVOA o mundo: centenas de 🌳
  árvores, 🌲 pinheiros, 🪨 pedras, 🌸 flores, 🍄 cogumelos ou 🌵 cactos de
  uma vez, cada um pousado no seu morro com giro e tamanho um pouquinho
  diferentes — e sempre nos MESMOS lugares (o mundo não muda entre jogadas).
  Árvores, pedras e cactos são SÓLIDOS (o carrinho bate!); flores e cogumelos
  o carrinho atropela de boa. Por dentro é instancing profissional: 300
  árvores custam 3 "desenhos" para a placa de vídeo.
- **Espalhar … cópias do modelo …** — igual, mas com um modelo .glb SEU:
  envie o arquivo no painel de imagens (seção de modelos 3D) e escreva o nome
  dele no bloco. Tamanho 1 = o original.
- **Pôr 1 … em x z / Pôr o modelo …** — UMA coisa num lugar exato, para os
  cantinhos especiais (a árvore gigante do topo, a estátua da praça).
- **Deixar limpo perto de x z num raio de …** — reserva um círculo SEM
  natureza (a sua praça, a sua pista). Use ANTES dos blocos de espalhar. O
  centro do mundo (onde o carrinho nasce) já vem limpo.
- **Pôr uma cachoeira 🏞️** — uma cortina de água caindo com espuma na base.
  Ponha na encosta de um morro e esconda um segredo ATRÁS dela.
- **Pôr um poste de luz 🏮** — acende sozinho quando anoitece; os 4 postes
  mais perto de você iluminam o chão DE VERDADE. Faça uma alameda!
- **Vaga-lumes à noite: pouca/média/muita** — luzinhas dançando quando
  escurece; somem de manhã.
- **Pôr uma fogueira 🔥 (vira ponto de retorno)** — toras crepitando. Passe
  perto e ela vira seu CHECKPOINT: afundou na água, volta na última fogueira
  tocada. E a água agora tem ESPUMA na beirada (a costa fica viva).
- **Quando o carrinho bater forte** — a trombada em coisa sólida com boa
  velocidade roda os blocos de dentro (encostar devagar não conta).

### 🚗 Carrinho

- **Criar o carrinho dirigível: … da cor …** — o bloco mágico. 🚗 passeio é
  equilibrado, 🚙 jipe sobe morro melhor (rodões), 🏎️ corrida é baixinho e
  muito rápido. Dirigir: W/seta-cima acelera, S/seta-baixo dá ré, A/D viram,
  espaço pula. Descer um morro em alta velocidade DECOLA o carrinho!
- **Ajustar o carrinho: velocidade …, curva …, pulo …** — os números do seu
  jeito: velocidade máxima (m/s), curva (graus por segundo) e força do pulo.
- **Ligar o turbo (Shift) com força …** — dá um botão de TURBO: segurando
  Shift o carrinho voa (força 1 = o dobro, até 4).
- **Som do motor ligado/desligado** — o ronco do motor, mais agudo quando
  acelera (feito na hora, sem arquivo).
- **Levar o carrinho para x … z …, virado para … graus** — teleporte: pousa
  no chão, parado, olhando para onde você mandou. A câmera pula junto.
- **Ligar a buzina (tecla H) 📢** — fom-fom em duas notas com um pulinho da
  carroceria. Combine com **Quando buzinar** para a buzina ABRIR coisas
  (buzine perto de um totem e faça um segredo acontecer!).
- **Ligar as luzes do carrinho 🚨** — luzes que se viram sozinhas: faróis
  acendem à noite, freio fica vermelho vivo, ré branca e piscas piscam
  quando você vira.
- **Marcas de pneu ligadas/desligadas** — o chão ganha marcas na derrapagem,
  no turbo e na neve; elas somem sozinhas depois de alguns segundos.
- **Pintar o carrinho de …** — lisa (a sua cor), listras de corrida, chamas,
  arco-íris (muda de cor sozinho) ou estrelas.
- Segredo: quem digitar o código Konami (↑↑↓↓←→←→BA) transforma o carrinho
  num FOGUETE. Conta pra ninguém. 🚀
- **onde o carrinho está (eixo …)** — a posição, um eixo por vez (y = altura).
- **a velocidade do carrinho** — em m/s, sempre positiva. Ótima para HUD.

### 🌦️ Céu & clima

- **Ligar o ciclo dia e noite: um dia dura … minutos** — o tempo passa de
  verdade: manhã dourada → meio-dia → entardecer laranja → noite estrelada
  (o sol enfraquece, a névoa escurece junto, as estrelas acendem).
- **Deixar o céu de manhã/meio-dia/entardecer/noite** — fixa a hora (ou
  escolhe a hora INICIAL do ciclo). O entardecer da corrida, a noite do
  mundo de inverno.
- **Fazer ☀️/🌧️/❄️/🍂/⛈️** — o clima: chuva, neve, folhas dançando ou
  TEMPESTADE (chuva pesada + raios em zigue-zague com clarão; o trovão chega
  ATRASADO pela distância — conte os segundos!). Raio em cima do carrinho
  chacoalha tudo e liga a câmera lenta por um instante. ☀️ desliga.
- **Estação do ano: 🌸/☀️/🍂/❄️** — recolore as copas das árvores e a grama
  NA HORA: outono dourado, inverno branquinho. Outono chove folhas e inverno
  neva sozinhos (se você não pediu outro clima).
- **Nuvens no céu: nenhuma/poucas/muitas** — nuvens fofas lá no alto,
  derivando com o vento.
- **Soltar um tornado 🌪️ passeando por … segundos** — um tornado gira pelo
  mundo: perto ele PUXA o carrinho, perto demais ele te joga pro alto! Some
  sozinho. Combine com um ponto interativo (o "botão do tornado").
- **Vento com força …** — 0 parado, 1 brisa, 3 ventania (até 5): mexe a
  grama E o clima.
- **Quando virar dia/noite** — o gancho da virada: acenda os totens à noite!
- **a hora do mundo (0 a 24)** — para as SUAS regras de horário.

### 📍 Pontos & placas

- **Criar o ponto interativo … em x z** — marca um lugar com um pilar
  brilhante e um apelido. Chegando perto, aparece um "E" na tela.
- **Quando apertar E no ponto …** — roda os blocos de dentro quando o
  carrinho está perto e a criança aperta E (abrir placa, começar corrida).
- **Criar a área mágica … / Quando entrar na área …** — um círculo invisível
  que dispara sozinho quando o carrinho ENTRA (checkpoints, armadilhas).
- **Pôr um totem … com título e texto** — uma placa de madeira com um
  recadinho (a apresentação do seu mundo).
- **Pôr um quadro … com a imagem …** — pendura uma imagem do projeto numa
  moldura, em pé no mundo.

### 🖼️ Galeria

- **Criar a galeria de projetos …** — uma praça de exposição (aplaina o chão
  e põe um totem-título).
- **Pendurar a imagem … com a legenda …** — pendura as imagens num arco;
  cada quadro ganha um "E: ver" que abre a imagem grande.

### 🏁 Kit Corrida

- **Criar a corrida: largada em … (virada …, … voltas)** — monta um portal de
  largada e o cronômetro (aparece sozinho no canto). Depois ponha os
  checkpoints; a ORDEM dos blocos é a ordem da pista.
- **Pôr um checkpoint em …** — um anel na pista; passe por eles NA ORDEM (o
  próximo brilha). Depois do último, cruze a largada para fechar a volta.
- **Quando a corrida começar / passar por um checkpoint / completar a
  corrida** — os ganchos da corrida (largada, cada anel, e a vitória — solte
  fogos!). O recorde é salvo sozinho entre as jogadas.
- **o tempo da corrida / o recorde da corrida** — em segundos, para o HUD.

### 🎳 Boliche & bagunça

- **Criar a pista de boliche em …** — 10 pinos em triângulo. Dirija contra
  eles: tombam e batem uns nos outros!
- **Arrumar os pinos de novo** — levanta tudo para jogar outra vez.
- **Quando derrubar todos os pinos** — STRIKE! Solte os fogos.
- **Empilhar … caixas/latas em …** — uma torre para o carrinho desabar.
- **quantos pinos caíram / quantas coisas derrubadas** — para o placar.
- **Pôr 1 tijolo/banco/cerca/lanterna/cone empurrável** — objetos que o
  carrinho EMPURRA de verdade: deslizam, giram, quicam e voltam pro lugar
  se caírem na água.
- **Espalhar … objetos empurráveis perto de … (raio …)** — a praça da
  bagunça: atravesse com o turbo e veja a física.
- **Escrever … com letras empurráveis** — cubos de LETRA empurráveis (as
  letras "BRUNO" do folio). Até 24 letras — escreva seu nome!
- **Pôr uma caixa explosiva 🧨** — bata em velocidade e BUM: bola de fogo,
  faíscas, tudo por perto voa (você também, com câmera lenta). Caixas
  vizinhas explodem em CADEIA.
- **Quando algo explodir 💥** — o gancho da explosão: pontos, fogos, sustos.

### 🎥 Câmera & efeitos

- **Efeitos de cinema ligados/desligados (brilho …)** — o look de filme:
  bloom (as coisas claras "vazam" luz) + vinheta (cantos escurecidos), já
  LIGADOS de fábrica. Brilho 1 é o normal; até 3 vira show de luz. Num
  computador fraco o **modo turbo** liga sozinho: menos grama, sombra menor
  e sem efeitos — o passeio continua liso.
- **Soltar confete 🎉** — chuva de confete colorido sobre o jogador. A
  celebração de toda vitória: chegada da corrida, strike do boliche…
- **Soltar fogos de artifício 🎆** — um foguete sobe assobiando e explode em
  cores no céu, com "bum" e chacoalhão. Use 3 seguidos para um show.

### 🔊 Sons

- **Carregar o som … do arquivo …** — prepara um som do projeto (envie em
  "Imagens") e dá um apelido. Faça no começo.
- **Tocar o som …** — toca um som carregado (bom em "Quando bater forte").
- **Tocar a música … sem parar** — a trilha sonora do seu mundo (em loop).
- **Parar a música** — desliga a música.

### ⏱️ Jogo & tela

- **Escrever … no canto … da tela** — um texto fixo num canto (placar,
  velocímetro, dica). Texto vazio apaga o canto.
- **Mostrar o balão … por … s** — um balãozinho de fala em cima do carrinho,
  seguindo ele pela tela.
- **A cada quadro, com o tempo dt** — a escotilha para a SUA mecânica: rode
  qualquer bloco a cada quadro. Multiplique velocidades por dt.
- **a tecla … está apertada? / acabou de ser apertada?** — teclas extras para
  as suas ideias (e, q, cima, baixo, espaco…). O WASD do carrinho já é
  automático — não precisa programar.

### ⭐ Regras de ouro

- **Um mundo por projeto**: use APENAS UMA extensão de jogo/mundo por projeto
  (cada uma cria a própria tela — juntas elas brigam pelo canvas).
- "Criar o mundo 3D" só vale ANTES do "Começar o passeio".
- Tudo em METROS: o carrinho tem ~3 m; pense as distâncias de verdade.
- O mundo é sempre O MESMO mundo: os morros não mudam de lugar entre uma
  jogada e outra — dá para decorar o caminho como o seu quintal.
`,
  examples: world3DExamples,
}
