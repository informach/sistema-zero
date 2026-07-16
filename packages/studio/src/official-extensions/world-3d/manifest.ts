import type { ExtensionManifest } from '#extensions'
import { world3DExamples } from './examples'

export const world3DManifest: ExtensionManifest = {
  id: 'world-3d',
  name: 'Mundo 3D',
  version: '0.3.0',
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
- **Quando o carrinho bater forte** — a trombada em coisa sólida com boa
  velocidade roda os blocos de dentro (encostar devagar não conta).

### 🚗 Carrinho

- **Criar o carrinho dirigível: … da cor …** — o bloco mágico. 🚗 passeio é
  equilibrado, 🚙 jipe sobe morro melhor (rodões), 🏎️ corrida é baixinho e
  muito rápido. Dirigir: W/seta-cima acelera, S/seta-baixo dá ré, A/D viram,
  espaço pula. Descer um morro em alta velocidade DECOLA o carrinho!
- **Ajustar o carrinho: velocidade …, curva …, pulo …** — os números do seu
  jeito: velocidade máxima (m/s), curva (graus por segundo) e força do pulo.
- **Levar o carrinho para x … z …, virado para … graus** — teleporte: pousa
  no chão, parado, olhando para onde você mandou. A câmera pula junto.
- **onde o carrinho está (eixo …)** — a posição, um eixo por vez (y = altura).
- **a velocidade do carrinho** — em m/s, sempre positiva. Ótima para HUD.

### 🎥 Câmera & efeitos

- **Efeitos de cinema ligados/desligados (brilho …)** — o look de filme:
  bloom (as coisas claras "vazam" luz) + vinheta (cantos escurecidos), já
  LIGADOS de fábrica. Brilho 1 é o normal; até 3 vira show de luz. Num
  computador fraco o **modo turbo** liga sozinho: menos grama, sombra menor
  e sem efeitos — o passeio continua liso.

### ⏱️ Jogo & tela

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
