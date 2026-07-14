import type { ExtensionManifest } from '#extensions'
import { arenaGoblinsExample, cacaMoedasExample } from './examples'

export const gameKitManifest: ExtensionManifest = {
  id: 'game-2d-advanced',
  name: 'Jogo 2D Avançado',
  version: '0.4.0',
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

O que o motor já faz por você:

- **Máquina de estados** — o jogo vive em UM estado por vez: \`menu\`,
  \`jogando\`, \`pausado\`, \`fim\` (derrota), \`vitoria\` (missão cumprida)… ou
  estados que você inventar (\`loja\`). As telas prontas aparecem sozinhas no
  estado certo.
- **Laço com delta-time (dt)** — o "A cada quadro" recebe quanto tempo durou o
  último quadro, em segundos. Multiplicando a velocidade por \`dt\`, o jogo anda
  igual em qualquer computador (rápido ou lento). É assim que os profissionais
  fazem.
- **Carregamento com tela de espera** — as imagens carregam ANTES do jogo
  começar, com a tela de "carregando" na frente.
- **Telas de UI** — menu, pausa, carregando, fim e vitória já vêm prontas
  (personalize título, texto e botão). Dá para criar telas SUAS com botões que
  rodam blocos.
- **Canvas responsivo com resolução fixa** — a tela do jogo tem SEMPRE a mesma
  resolução por dentro (ex.: 1280×720) e se ajusta sozinha à janela, mantendo a
  proporção. Suas contas nunca mudam com o tamanho da janela.
- **Teclado profissional** — mapa de teclas seguradas, com limpeza automática
  quando a janela perde o foco (adeus tecla "presa"), e a tecla de pausa.

### Começando (a receita)

1. **Preparar o jogo profissional** — uma vez, no começo. Escolha a resolução
   (largura × altura), a cor de fundo e a cor de destaque das telas.
2. **Carregar a imagem** — uma vez por imagem do projeto (aba Imagens). Dê um
   nome; é ele que o personagem usa.
3. **Criar o personagem** — quantos quiser (herói, moeda, inimigo…). Nasce no
   centro; sem imagem, aparece um retângulo da cor.
4. **A cada quadro (dt)** — a mecânica: mover pelas teclas, testar "encostou",
   somar pontos, mudar de estado…
5. **Desenhar o jogo (ctx)** — o visual: pintar o fundo, desenhar os
   personagens, escrever o placar (os blocos de Canvas funcionam aqui dentro,
   com esse pincel).
6. **Começar o jogo** — uma vez, NO FIM. Carrega tudo, mostra o menu e liga o
   laço.

### Estados

- **Mudar o estado do jogo para…** — troca o estado. O "A cada quadro" só roda
  em \`jogando\`; \`menu\`/\`pausado\`/\`fim\` mostram as telas deles; um estado
  inventado (ex.: \`loja\`) esconde as telas e congela o jogo — mostre a SUA
  tela nele.
- **Quando o jogo entrar no estado…** — roda uma vez a cada entrada no estado.
  Perfeito para zerar pontos e recolocar personagens quando começar a jogar.
- **Pausar / Continuar / Voltar ao menu / Terminar o jogo** — atalhos dos
  estados prontos. A tecla de pausa (Esc, ou a que você escolher) já alterna
  jogando↔pausado sozinha.
- **o estado do jogo / o estado é…?** — perguntas para usar num "se".

### Telas

- **Personalizar a tela pronta…** — muda título, texto e botão de
  menu/pausa/carregando/fim/vitória. Deixe em branco o que não quiser mudar.
- **Criar a tela… / Botão… na tela… / Mostrar a tela / Esconder todas** — telas
  novas (loja, instruções) no mesmo estilo, com botões que rodam os seus blocos
  ao clicar. Criar com o nome de uma tela pronta faz você ASSUMIR a tela: os
  botões dela saem e os textos passam a ser os seus.

### Personagens

- **Criar o personagem…** — um objeto de jogo com posição, tamanho, velocidade
  (em pixels por segundo), turbo (multiplicador) e imagem ou cor.
- **Mover pelas teclas usando o tempo…** — o movimento profissional pronto:
  WASD + setas, diagonal na mesma velocidade, tudo × dt. Quer outra mecânica?
  Troque este bloco pelas suas contas (é só somar em x/y multiplicando por dt).
- **Manter dentro da tela / Colocar em x,y / Recolocar no centro / turbo** —
  utilidades de posição.
- **Desenhar o personagem** — imagem (se carregou) ou retângulo da cor. Use
  dentro do "Desenhar o jogo".
- **encostou em…? / posição x / posição y** — perguntas para a mecânica.

O personagem é um objeto comum: quem já conhece Objetos pode ler e mudar
\`velocidade\`, \`largura\` etc. pelos blocos de propriedade do núcleo.

### Teclas

- **a tecla … está apertada?** — verdadeiro enquanto segura. Escreva a letra
  (\`w\`, \`a\`…), \`ArrowUp\`/\`ArrowDown\`/\`ArrowLeft\`/\`ArrowRight\` para as
  setas, ou \`espaço\`.
- **a tecla … acabou de ser apertada?** — verdadeiro SÓ no quadro do aperto
  (segurar não repete). O jeito certo de fazer golpe e tiro: um aperto, uma
  ação.
- **Usar a tecla … para pausar** — troca a tecla de pausa (padrão: Esc).

### Dicas de quem faz jogo de verdade

- Velocidade sempre em **pixels por segundo**, multiplicada por \`dt\` — nunca
  "por quadro".
- O desenho recomeça do zero a cada quadro: pinte o fundo primeiro (o bloco
  "Pintar o fundo" já apaga o quadro anterior).
- Use "Quando entrar no estado jogando" para REINICIAR a partida (zerar pontos,
  recolocar personagens) — aí "Jogar de novo" funciona de graça.
- A largura/altura do jogo são fixas: use "a largura do jogo" nas contas de
  limite e de posição aleatória.

> ⚠️ Use o Jogo 2D Avançado **ou** o Jogo 2D no mesmo projeto — os dois criam a
> própria tela e podem brigar pelo canvas.

## A arquitetura de verdade (como o Frank monta)

Estes blocos são as PEÇAS que os programadores de jogo usam de verdade. Você as
liga do seu jeito — é assim que se aprende a construir jogos grandes.

### 📢 Avisos (eventos)

O jeito profissional de ligar as partes do jogo sem elas se conhecerem: uma parte
"avisa" que algo aconteceu, e outra "escuta". Ex.: quando um inimigo morre, avise
\`inimigo:morreu\`; em outro canto, "Quando chegar o aviso inimigo:morreu" some 1
ponto e toca um som. Assim o código não vira um nó.

### 👾 Moldes & enxames

- **Criar o molde** — os DADOS de um tipo de personagem (inimigo, moeda, tiro):
  tamanho, vida, velocidade, dano, cor/imagem/aparência. Defina UMA vez.
- **Nascer 1 do molde** / **…e chamar de** — faça quantos quiser; a versão "e
  chamar de" dá um APELIDO ao que nasceu, e aí os blocos de personagem
  funcionam nele (perfeito para tiro mirado e chefão).
- **A cada N s, nascer numa borda** / **Parar a fábrica** — o "spawner" solta
  inimigos sem parar (jogos de sobrevivência); pare-o entre fases ou no chefão.
- **Para cada vivo do molde… fazer** — repete para todos do enxame (mover, testar
  colisão). "item" é o da vez.
- **Recolher** / **Recolher quem saiu da tela** — guarda personagens para
  reaproveitar (pooling) — o segredo para o jogo não engasgar com muitos.
- **Desenhar todos vivos** / **quantos vivos** — desenha e conta o enxame.

### 🎯 Comportamentos

Movimentos prontos que os inimigos usam: **perseguir** o herói, **vaguear** ao
acaso, **virar** para o lado do alvo. Use dentro do "Para cada vivo" no "A cada
quadro" — é o mesmo cálculo que se faz à mão (ir na direção × velocidade × tempo).

### ❤️ Combate

**Machucar** (tira vida e deixa piscando e invencível um tempinho), **empurrar**
(solavanco que diminui sozinho), **barra de vida** (vida cheia 0 = automática),
**encostou (círculo)**, **a vida acabou?**, **está invencível?** e **a vida
de**. O padrão profissional de dano: *se encostou E NÃO está invencível →
machucar + empurrar + som* — assim o som e o empurrão só acontecem no dano de
verdade. E a morte do inimigo: *se a vida de item acabou → faíscas + recolher +
avisar*.

### 🖥️ HUD & Missão

**Vencer quando sobreviver X s ou derrotar N** define a missão (ganhou → tela de
VITÓRIA pronta + aviso \`missao:completa\`; derrota é o "Terminar o jogo", tela
de fim). **Contar +1 inimigo derrotado**, **cronômetro**, **tempo jogando** e
**quantos derrotei** completam o placar.

### ✨ Faíscas

**Criar o efeito** é a RECEITA de uma explosão de faíscas (feita de dados: quantas,
cor, tamanho, duração, velocidade, gravidade). **Soltar o efeito** estoura uma;
**Desenhar todas as faíscas** as anima (caem e somem). Poucos blocos, muitos
efeitos.

### 🎨 Aparência (desenho vetorial)

**Criar a aparência** desenha um personagem com formas (do cantinho 0,0 para
dentro, no tamanho-base que você declarar) e dá um nome. Um molde pode usá-la —
aí TODO o enxame ganha esse visual vetorial, esticado para o tamanho do molde.
Ou use **Desenhar a aparência** em qualquer lugar e tamanho (ex.: o herói).

### 🎞️ Quadros & animação (pixel art viva)

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
x/y da câmera** dizem que pedaço do mundo aparece.

### ➡️ Tiro e giro

**Lançar na direção** mira UMA vez (guarda a velocidade no personagem);
**Mover pela velocidade** anda com ela a cada quadro — com o "Nascer 1 e
chamar de", isso é o tiro reto e o tiro mirado dos jogos de nave. **Girar
para X graus** roda o desenho em volta do centro.

### 🖱️ Mouse e toque

**Quando clicar no jogo** roda os blocos com a posição já nas coordenadas do
JOGO (o esticado da tela e a câmera são resolvidos por você não se
preocupar). **o mouse x/y** e **o mouse está apertado?** completam: tower
defense, point-and-click, desenhar com o dedo.

### 📊 Barra

**Desenhar uma barra de atual/máximo** — vida grande, energia, progresso.
Combine com "a vida de" e ponha no HUD.

### 🔊 Som

Importe sons em **"Imagens e sons"** (efeitos ou música que você baixou/gravou),
**Carregue o som** dando um nome, e **Toque o som** por esse nome — combina com os
avisos ("Quando chegar o aviso inimigo:morreu, tocar o som explosao"). Sem
importar nada, **Tocar o som pronto** (moeda/batida/explosão…) já funciona.
`,
  examples: [cacaMoedasExample, arenaGoblinsExample],
}
