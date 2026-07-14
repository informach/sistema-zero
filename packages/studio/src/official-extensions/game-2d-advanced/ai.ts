export const gameKitPromptContext = `Extensão: Jogo 2D Avançado (id: game-2d-advanced)

FILOSOFIA: é a BASE de um jogo profissional (o "starter kit"): máquina de
estados + laço com delta-time + carregamento assíncrono + telas de UI + canvas
responsivo de resolução interna FIXA + arquitetura P24 (event bus, moldes
data-driven com pooling, combate com i-frames, missão, partículas, som). O
runtime encapsula só o que nunca muda; a MECÂNICA (movimento custom, colisões,
pontos, fases) o aluno escreve nos ganchos com blocos do núcleo
(se/variáveis/matemática/Canvas). Não confundir com a extensão "Jogo 2D"
(game-2d, SZGame2D) — aquela traz comportamentos prontos; esta traz a
arquitetura. Não misturar as duas no mesmo projeto.

RECEITA CANÔNICA (ordem no ⚙️ Comportamento):
1. SZGameKit.setup({ width, height, background, accent })  — 1x, no começo
2. SZGameKit.loadImage("nome", "asset") / loadSound("nome", "asset")
3. SZGameKit.defineLook / defineMold / defineEffect / setMission — os DADOS
4. const heroi = SZGameKit.createCharacter({ image, w, h, speed, color })
5. SZGameKit.onEnterState("jogando", function () {…})       — reiniciar partida
6. SZGameKit.startSpawner("molde", segundos)                — fábricas
7. SZGameKit.onUpdate(function (dt) {…})                    — mecânica (só roda em "jogando")
8. SZGameKit.on("aviso", function () {…})                   — reações desacopladas
9. SZGameKit.onDraw(function (ctx) {…})                     — visual (ctx = contexto 2D de verdade)
10. SZGameKit.start()                                       — 1x, NO FIM

API global injetada como window.SZGameKit:
- setup({ width, height, background, accent }): resolução INTERNA fixa (o canvas
  se ajusta à janela com letterbox; as coordenadas do jogo nunca mudam) + cores
  da UI. width/height clampados a 64..4096.
- start(): mostra a tela "carregando", espera imagens+sons (Promise.all), vai ao
  estado "menu" e liga o requestAnimationFrame. Chamar UMA vez, por último.
- width() / height(): a resolução interna (use nas contas de limite/aleatório).
- loadImage(nome, asset): registra p/ pré-carregamento; falhou → retângulo (nunca quebra).
- Estados: setState(nome) / state() / stateIs(nome) / pause() / resume() /
  returnToMenu() / endGame(). Fixos com comportamento automático: "menu",
  "jogando", "pausado", "fim" (derrota) e "vitoria" (missão cumprida) — telas
  ligam sozinhas; update SÓ roda em "jogando". Entrar em "jogando" RECOMEÇA a
  arena (recolhe enxames, zera missão/faíscas/i-frames). Estados INVENTADOS
  (ex.: "loja") valem: congelam o update e escondem as telas — mostre a sua com
  showScreen. onEnterState(nome, fn) roda fn a cada ENTRADA no estado.
- Telas: setScreenText("menu"|"pausa"|"carregando"|"fim"|"vitoria", titulo,
  texto, botao) personaliza as prontas ('' = mantém); createScreen(nome, titulo,
  texto) cria uma nova (escondida) — usar o NOME de uma pronta ASSUME a tela
  (os botões default saem e os textos passam a ser seus); addButton(tela,
  rotulo, fn) põe botão clicável; showScreen(nome) / hideScreens(). Telas são
  painéis DOM injetados pelo runtime (ids szgk-*) — o aluno NÃO escreve
  HTML/CSS para elas.
- Laço: onUpdate(fn(dt)) — dt em SEGUNDOS, clampado a 0.1 (aba em segundo plano
  não teleporta); onUpdate só roda em "jogando" (pausa congela de graça).
  onDraw(fn(ctx)) — roda todo quadro fora do menu; ctx é um
  CanvasRenderingContext2D real: os blocos de Canvas do núcleo funcionam dentro.
  drawBackground(cor, grade): pinta a tela toda (apaga o quadro anterior) +
  grade opcional de 40px.
- Personagens: createCharacter({ image, w, h, speed, color }) → objeto PLANO
  { x, y, w, h, speed, health: 100, maxHealth: 100, … }, nasce CENTRADO; speed
  em px/SEGUNDO. moveWithKeys(c, dt): WASD+setas com diagonal normalizada.
  keepOnScreen(c) / placeCharacter(c, x, y) / resetCharacter(c) (centro + vida
  cheia) / setSpeedMultiplier(c, f). touching(a, b): AABB. charX(c)/charY(c).
- Teclas: keyDown(k) — tecla SEGURADA (lowercase; letras, "arrowup"…, " ");
  keyPressed(k) — true SÓ no quadro do aperto (edge-trigger: golpe/tiro 1 por
  aperto, sem flag manual). setPauseKey(k) troca a tecla de pausa (padrão Esc).
- 📢 Avisos (event bus do P24 — a espinha da arquitetura): on(nome, fn) escuta;
  emit(nome) dispara. Desacopla quem causa de quem reage (ex.: goblin morre →
  emit("inimigo:morreu"); o listener soma o kill e toca o som).
- 👾 Moldes & enxames (data-driven + object pooling do vídeo de otimização):
  defineMold(nome, { w, h, health, speed, damage, color, image, look }) define
  os DADOS de um tipo; spawnFromMold(molde, x, y) nasce 1 (reaproveita
  recolhidos — rápido com centenas); const chefe = spawnFromMold(...) dá
  APELIDO ao que nasceu (funciona nos blocos de personagem — tiro mirado,
  boss); startSpawner(molde, seg) nasce 1 a cada seg numa borda (re-ligar só
  TROCA o ritmo; stopSpawner(molde) desliga); forEachActive(molde, fn(item))
  itera os vivos (reverso — recycle dentro é seguro); cullOffscreen(molde,
  margem) recolhe quem passou da margem (use 200; SEMPRE chamar no onUpdate —
  é a lição de otimização); recycle(item) devolve ao pool; drawActive(molde)
  desenha todos (look > image > retângulo); countActive(molde).
- 🎨 Aparência vetorial: defineLook(nome, fn(ctx), baseW, baseH) desenha uma
  vez em coords LOCAIS (0,0 = canto, no tamanho-base) — molde com look ganha o
  visual escalado ao w/h dele; drawLook(nome, x, y, w, h) desenha avulso
  (escala do tamanho-base). Blocos de Canvas do núcleo valem dentro da fn.
- 🎯 Comportamentos (steering): seek(c, alvo, dt) persegue; drift(c, dt)
  vagueia; face(c, alvo) espelha o desenho na direção do alvo.
- ❤️ Combate (P24): hurt(c, dano, iframesSeg) tira vida + invencibilidade
  piscante; isInvincible(c) é o GATE — padrão canônico:
  "se touchCircle(a, b) E NÃO isInvincible(b): hurt + knockback + som" (só o
  hit VÁLIDO empurra e toca som). knockback(c, de, força) empurra com
  decaimento; touchCircle(a, b) colisão por círculo; isDead(c) vida <= 0;
  healthOf(c); drawHealthBar(c, max) barrinha em cima (max 0 = usa maxHealth).
- 🖥️ Missão & HUD: setMission(segundos, kills) — cumpriu (sobreviveu OU
  derrotou) → estado "vitoria" (tela pronta) + emit("missao:completa");
  missionKill() soma 1 kill; kills() / timeSurvived(); drawTimer(x, y) mm:ss.
- ✨ Faíscas (partículas data-driven pooled): defineEffect(nome, { count,
  color, size, life, speed, gravity }) é a RECEITA; burst(nome, x, y) explode;
  drawEffects() no onDraw move+desenha (congela fora de "jogando").
- 🔊 Som: loadSound(nome, assetDeAudio) pré-carrega (mp3/ogg importado ou do
  Pinta); playSound(nome); playEffect("coin"|"hit"|"explosion"|"jump"|"laser"|
  "hurt"|"powerup"|"win"|"gameover"|"click") tons sintetizados prontos;
  playTone(freqHz, ms) synth cru. Áudio "acorda" no 1º gesto (clique/tecla) —
  automático.
- 🎞️ Folha de quadros: setSheet(c, "imagem", fw, fh) cola a spritesheet
  (carregada por loadImage) no personagem; playAnim(c, de, até, fps) toca a
  faixa em loop — PODE rodar todo quadro (guarda de transição: repetir a mesma
  não reinicia). A folha VENCE a imagem estática no desenho.
- 🎥 Câmera: cameraFollow(c, mundoW, mundoH) liga o mundo maior (onDraw vira
  world-space; keepOnScreen/spawner/cull passam a valer o mundo/retângulo
  visível); cameraStop(); cameraX()/cameraY() = canto visível.
  onDrawHud(fn(ctx)) desenha DEPOIS, SEM câmera (placar/barras presos na tela).
- ➡️ Tiro: launchTowards(quem, alvo, v) mira UMA vez (seta vx/vy pelo vetor
  normalizado × v); moveByVelocity(quem, dt) aplica × dt a cada quadro. Com
  const tiro = spawnFromMold(...) fecha tiro reto E mirado. setAngle(c, graus)
  gira o desenho em volta do centro.
- 🖱️ Mouse/toque (coords do JOGO, letterbox e câmera resolvidos):
  onGameClick(fn(px, py)) roda a cada clique/toque no canvas; mouseX()/
  mouseY()/mouseDown() para mirar e arrastar.
- 📊 drawBar(atual, max, x, y, w, h, cor): barra proporcional (vida/mana/
  progresso) — ideal dentro do onDrawHud.
- 🧙 Kit RPG (Canvas RPG Kit em blocos; mecânicas PRONTAS sobre o mesmo motor):
  rpgMoveGrid(heroi, cellPx, dt) — andar por CÉLULAS c/ paredes, portas e o
  ESPAÇO conversando com o NPC à frente (use no onUpdate; a fala/batalha travam
  o herói sozinhas); rpgBlockCell(cx, cy) parede; rpgCell(n) célula→px;
  rpgCreateNpc(nome, cx, cy, img, look) NPC sólido + rpgDrawNpcs() no onDraw +
  rpgOnTalk(nome, fn); rpgSay(texto, quem) caixa typewriter (fila; emite
  "fala:terminada"); rpgAddFlag/rpgHasFlag (story flags — conversa condicionada);
  rpgGiveItem(nome, img)/rpgHasItem/rpgRemoveItem/rpgDrawInventory(x, y);
  rpgOnMap(nome, fn) monta o mapa (1º registrado = inicial; trocar limpa
  paredes/NPCs/portas e REMONTA — reposicione o herói na montagem!) +
  rpgGoMap(nome) + rpgCreateDoor(cx, cy, mapa); batalha por TURNOS com menu
  PRONTO: rpgBattleStats(vida, força) 1x + rpgBattleStart(nome, vida, força)
  (Atacar = força ± 20%, Defender = ½ do próximo dano, Fugir = 50%; o mundo
  congela SEM resetar) + rpgOnBattleEnd(fn) + rpgBattleWon(). Padrão canônico:
  no onTalk do chefe → rpgBattleStart; no rpgOnBattleEnd → "se ganhei:
  setState('vitoria') senão endGame()". Recomeçar o jogo zera flags/itens e
  volta ao 1º mapa.

REGRAS DE OURO ao gerar código:
- Velocidade SEMPRE × dt (px/segundo), nunca px/quadro.
- onDraw: começar com drawBackground e desenhar TUDO de novo (o quadro zera).
- Reinício de partida vive em onEnterState("jogando") — os botões
  "Jogar"/"Jogar de novo" das telas prontas funcionam sem código extra.
- start() é a ÚLTIMA linha. setup() a primeira. defineMold/defineLook/
  defineEffect/setMission ANTES do start.
- Posição aleatória: Math.random() * (SZGameKit.width() - larguraDoPersonagem).
- Dano no jogador: gatear com isInvincible (senão empurrão+som repetem 60x/s
  durante o piscar). Morte de inimigo: "se isDead(item): burst + recycle +
  emit" DENTRO do forEachActive.
- Vitória: prefira setMission (tela "vitoria" pronta + aviso
  "missao:completa"). Derrota: endGame() (tela "fim").
- Enxames: SEMPRE parear startSpawner com cullOffscreen no onUpdate.
`
