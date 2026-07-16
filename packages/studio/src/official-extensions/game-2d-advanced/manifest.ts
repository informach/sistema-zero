import type { ExtensionManifest } from '#extensions'
import {
  arenaGoblinsExample,
  bichinhosDoQuintalExample,
  cacaMoedasExample,
  florestaNinjaExample,
  saltoNaFlorestaExample,
  vilaDoDragaoExample,
} from './examples'

export const gameKitManifest: ExtensionManifest = {
  id: 'game-2d-advanced',
  name: 'Jogo 2D Avançado',
  version: '0.17.1',
  description:
    'A base de um jogo 2D profissional, pronta para você inventar as regras. Máquina de estados, laço com delta-time (dt), telas de UI, personagens, e a arquitetura de verdade: avisos (eventos), moldes e enxames de inimigos que nascem sozinhos, comportamentos (perseguir/vaguear), combate (vida, dano, empurrão), faíscas, missão e som importado. O motor pronto fica no runtime; a mecânica você escreve nos ganchos, com os blocos — igual a quem programa jogos na unha.',
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
   fundo e cor de destaque das telas.
2. **Carregar a imagem** — uma por imagem do projeto (aba Imagens); o nome que
   você der é o que o personagem usa.
3. **Criar o personagem** — quantos quiser. Nasce no centro; sem imagem, vira um
   retângulo da cor.
4. **A cada quadro (dt)** — a mecânica: mover, testar "encostou", somar pontos…
5. **Desenhar o jogo (ctx)** — o visual: fundo, personagens, placar (os blocos
   de Canvas funcionam aqui dentro, com esse pincel).
6. **Começar o jogo** — uma vez, NO FIM: carrega tudo e liga o laço.

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
- "Quando entrar no estado jogando" é onde se REINICIA a partida (zerar pontos,
  recolocar personagens) — aí "Jogar de novo" funciona de graça.
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

### ❤️ Combate

**Machucar** (tira vida e deixa piscando e invencível um tempinho), **empurrar**,
**barra de vida** (vida cheia 0 = automática), **encostou (círculo)**, **a vida
acabou?**, **está invencível?** e **a vida de**. O padrão profissional de dano:
*se encostou E NÃO está invencível → machucar + empurrar + som* (assim o som só
sai no dano de verdade). E a morte: *se a vida de item acabou → faíscas +
recolher + avisar*.

### 🖥️ HUD & Missão

**Vencer quando sobreviver X s ou derrotar N** define a missão (ganhou → tela de
VITÓRIA pronta + aviso \`missao:completa\`; derrota é o "Terminar o jogo", tela
de fim). **Contar +1 inimigo derrotado**, **cronômetro**, **tempo jogando** e
**quantos derrotei** completam o placar.

### ✨ Faíscas

**Criar o efeito** é a RECEITA de uma explosão (dados: quantas, cor, tamanho,
duração, velocidade, gravidade). **Soltar o efeito** estoura uma; **Desenhar
todas as faíscas** as anima. Poucos blocos, muitos efeitos.

### 🎨 Aparência & animação

**Criar a aparência** desenha um personagem com formas (do cantinho 0,0 para
dentro, no tamanho-base que você declarar) e dá um nome. Um molde pode usá-la —
aí TODO o enxame ganha esse visual vetorial, esticado para o tamanho do molde.
Ou use **Desenhar a aparência** em qualquer lugar e tamanho (ex.: o herói).

**Pixel art viva:**

**Usar a folha de quadros** cola uma spritesheet (do Pinta ou baixada) no
personagem, dizendo o tamanho de cada quadro. **Tocar a animação** roda uma
faixa de quadros em loop — pode chamar TODO quadro ("se andando, tocar andar;
senão, tocar parado"): repetir a mesma não reinicia. Desenhou no Pinta? O
seletor lista as animações da folha e preenche os números.

### 🎥 Câmera (mundos maiores que a tela)

**Fazer a câmera seguir** liga um mundo maior: a tela vira uma janela que
acompanha o personagem, presa nas bordas do mundo. O "Desenhar o jogo" passa a
desenhar o MUNDO; **Desenhar por cima (HUD)** desenha DEPOIS, preso na tela
(placar, barras) — a separação profissional entre mundo e painel. **o canto
x/y da câmera** dizem que pedaço do mundo aparece. **Tremer a câmera** dá um
abalo de impacto (explosão, o chefe pisando) — funciona com a câmera ligada ou
desligada.

### ➡️ Tiro e giro (em 🎯 Comportamentos)

**Lançar na direção** mira UMA vez (guarda a velocidade no personagem);
**Mover pela velocidade** anda com ela a cada quadro — com o "Nascer 1 e
chamar de", isso é o tiro reto e o tiro mirado dos jogos de nave. **Girar
para X graus** roda o desenho em volta do centro.

### 📊 Barra (em 🖥️ HUD & Missão)

**Desenhar uma barra de atual/máximo** — vida grande, energia, progresso.
Combine com "a vida de" e ponha no HUD.

### 🗺️ Mundo & profundidade

Para o mundo ter cara de jogo de verdade (vale para QUALQUER jogo, não só RPG):

- **Carregar o mapa … do meu desenho** — monta um mapa de peças (tiles) do Pinta
  (grade, peças e sólidos já vêm juntos). Dê um nome e use no comecinho.
- **Desenhar o mapa … (camada chão / topos)** — o segredo da profundidade: o
  **chão** ANTES dos personagens e os **topos** (árvores, telhados) DEPOIS —
  assim o herói passa POR TRÁS das copas. Dentro do "Desenhar o jogo".
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
cartas, match-3 e tower defense.

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

### ⚔️ Batalha por turnos (em ⚔️ Kit RPG: batalha)

- **Meus pontos de batalha** (vida/força/**defesa**, 1x no começo) e **Começar a
  batalha contra…** (o inimigo também tem defesa) — abre o menu PRONTO: **Atacar**
  (força ± 20% − defesa/2), **Especial** (gasta energia), **Item** (usa poção),
  **Defender** (dano pela metade) e **Fugir** (50%). O inimigo revida sozinho.
- **Golpe especial** (dano forte que gasta energia; a energia recupera por turno)
  + **Ganhar a poção** (cura, usada pelo botão Item) — as armas do RPG.
- **Ganhar XP** (no "quando a batalha terminar", se venceu) → o herói **sobe de
  nível** (mais vida/força/defesa + aviso \`subiu:nivel\`); **meu nível** / **meu
  XP** mostram a progressão. **Envenenar** tira vida por turno.
- **Quando a batalha terminar / ganhei a batalha?** — decida o rumo: vitória →
  tela de vitória (+ XP), derrota → fim de jogo, fuga → tentar de novo.

### 🎬 Cenas & NPCs vivos (em 🎬 Kit RPG: cenas)

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

### 💾 Salvar (em 💾 Kit RPG: salvar)

**Salvar o jogo** / **Continuar o jogo salvo** / **tem jogo salvo?** — guarda o
progresso do RPG (flags, itens, mapa, posição, atributos, poções, golpe especial) e
continua de onde parou, mesmo fechando e reabrindo. Ligue o "Continuar" só quando
"tem jogo salvo?". (O **Menu de escolha** subiu para 💬 Fala & escolhas — vale em
qualquer jogo; aqui ele combina lindo com o "Quando conversar" e as cenas.)
`,
  examples: [
    cacaMoedasExample,
    arenaGoblinsExample,
    vilaDoDragaoExample,
    florestaNinjaExample,
    saltoNaFlorestaExample,
    bichinhosDoQuintalExample,
  ],
}
