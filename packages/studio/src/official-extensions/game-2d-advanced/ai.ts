export const gameKitPromptContext = `Extensão: Jogo 2D Avançado (id: game-2d-advanced)

FILOSOFIA: é a BASE de um jogo profissional (o "starter kit"): máquina de
estados + laço com delta-time + carregamento assíncrono + telas de UI + canvas
responsivo de resolução interna FIXA. O runtime encapsula só o que nunca muda;
a MECÂNICA (movimento custom, colisões, pontos, fases) o aluno escreve nos
ganchos com blocos do núcleo (se/variáveis/matemática/Canvas). Não confundir
com a extensão "Jogo 2D" (game-2d, SZGame2D) — aquela traz comportamentos
prontos; esta traz a arquitetura. Não misturar as duas no mesmo projeto.

RECEITA CANÔNICA (ordem no ⚙️ Comportamento):
1. SZGameKit.setup({ width, height, background, accent })  — 1x, no começo
2. SZGameKit.loadImage("nome", "asset do projeto")          — 1x por imagem
3. const heroi = SZGameKit.createCharacter({ image, w, h, speed, color })
4. SZGameKit.onEnterState("jogando", function () {…})       — reiniciar partida
5. SZGameKit.onUpdate(function (dt) {…})                    — mecânica (só roda em "jogando")
6. SZGameKit.onDraw(function (ctx) {…})                     — visual (ctx = contexto 2D de verdade)
7. SZGameKit.start()                                        — 1x, NO FIM

API global injetada como window.SZGameKit:
- setup({ width, height, background, accent }): resolução INTERNA fixa (o canvas
  se ajusta à janela com letterbox; as coordenadas do jogo nunca mudam) + cores
  da UI. width/height clampados a 64..4096.
- start(): mostra a tela "carregando", espera as imagens (Promise.all), vai ao
  estado "menu" e liga o requestAnimationFrame. Chamar UMA vez, por último.
- width() / height(): a resolução interna (use nas contas de limite/aleatório).
- loadImage(nome, asset): registra p/ pré-carregamento; falhou → retângulo (nunca quebra).
- Estados: setState(nome) / state() / stateIs(nome) / pause() / resume() /
  returnToMenu() / endGame(). Fixos com comportamento automático: "menu",
  "jogando", "pausado", "fim" (telas ligam sozinhas; update SÓ roda em
  "jogando"). Estados INVENTADOS (ex.: "loja") valem: congelam o update e
  escondem as telas — mostre a sua com showScreen. onEnterState(nome, fn) roda
  fn a cada ENTRADA no estado (zerar pontos, recolocar personagens).
- Telas: setScreenText("menu"|"pausa"|"carregando"|"fim", titulo, texto, botao)
  personaliza as prontas ('' = mantém); createScreen(nome, titulo, texto) cria
  uma nova (escondida); addButton(tela, rotulo, fn) põe botão clicável;
  showScreen(nome) / hideScreens(). Telas são painéis DOM injetados pelo
  runtime (ids szgk-*) — o aluno NÃO escreve HTML/CSS para elas.
- Laço: onUpdate(fn(dt)) — dt em SEGUNDOS, clampado a 0.1 (aba em segundo plano
  não teleporta); onUpdate só roda em "jogando" (pausa congela de graça).
  onDraw(fn(ctx)) — roda todo quadro fora do menu; ctx é um
  CanvasRenderingContext2D real: os blocos de Canvas do núcleo funcionam dentro.
  drawBackground(cor, grade): pinta a tela toda (apaga o quadro anterior) +
  grade opcional de 40px.
- Personagens: createCharacter({ image, w, h, speed, color }) → objeto PLANO
  { x, y, w, h, speed, speedMultiplier, image, color }, nasce CENTRADO; speed em
  px/SEGUNDO. moveWithKeys(c, dt): WASD+setas com diagonal normalizada ×
  speed × speedMultiplier × dt (o movimento profissional pronto — para mecânica
  própria, o aluno soma em c.x/c.y multiplicando por dt). keepOnScreen(c) /
  placeCharacter(c, x, y) / resetCharacter(c) (centro + turbo 1) /
  setSpeedMultiplier(c, f) (power-up). touching(a, b): AABB. charX(c)/charY(c).
  Sendo objeto plano, propriedades extras (vida, moedas) via blocos de Objetos
  do núcleo são bem-vindas.
- Teclas: keyDown(k) — mapa lowercase de teclas SEGURADAS (letras, "arrowup"…,
  "espaço"/" "); limpo automaticamente em blur/contextmenu. setPauseKey(k):
  troca a tecla que alterna jogando↔pausado (padrão Escape).

REGRAS DE OURO ao gerar código:
- Velocidade SEMPRE × dt (px/segundo), nunca px/quadro.
- onDraw: começar com drawBackground e desenhar TUDO de novo (o quadro zera).
- Reinício de partida vive em onEnterState("jogando") — assim os botões
  "Jogar"/"Jogar de novo" das telas prontas funcionam sem código extra.
- start() é a ÚLTIMA linha. setup() a primeira.
- Posição aleatória: Math.random() * (SZGameKit.width() - larguraDoPersonagem).
- Vitória/derrota custom: setState("vitoria") + createScreen/showScreen, ou o
  endGame() pronto (tela "fim" com "Jogar de novo").
`
