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
   · OU SZGameKit.setupFull({ background, accent }) — "ocupar a tela toda": SEM
     dimensões, o canvas preenche a viewport e config.w/h (width()/height())
     ACOMPANHAM a janela (centralize por eles, não por número fixo). Use UM dos dois.
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
  HTML/CSS para elas. setScreenBg(tela, cor, imagem) pinta o painel (cor de
  fundo + imagem do Pinta opcional). Tela 100% desenhada no canvas = ESTADO
  inventado (esconde os painéis prontos, os on_draw seguem rodando).
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
  setCheckpoint(x, y) + respawn(quem) = a bandeirinha e o buraco. São GERAIS
  (valem em RPG, corrida, bullet hell) e por isso ficam AQUI, não no Kit
  Plataforma. ⚠️ os helpers ainda se chamam plat* por história — o chip é 🧍.
- Teclas: keyDown(k) — tecla SEGURADA (lowercase; letras, "arrowup"…, " ");
  keyPressed(k) — true SÓ no quadro do aperto (edge-trigger: golpe/tiro 1 por
  aperto, sem flag manual). setPauseKey(k) troca a tecla de pausa (padrão Esc).
- 📢 Avisos (event bus do P24 — a espinha da arquitetura): on(nome, fn) escuta;
  emit(nome) dispara. Desacopla quem causa de quem reage (ex.: goblin morre →
  emit("inimigo:morreu"); o listener soma o kill e toca o som).
- 🐛 Moldes & enxames (data-driven + object pooling do vídeo de otimização):
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
- 🎨 Aparência (vetorial): defineLook(nome, fn(ctx), baseW, baseH) desenha uma
  vez em coords LOCAIS (0,0 = canto, no tamanho-base) — molde com look ganha o
  visual escalado ao w/h dele; drawLook(nome, x, y, w, h) desenha avulso
  (escala do tamanho-base). Blocos de Canvas do núcleo valem dentro da fn.
- 🎯 Comportamentos (steering): seek(c, alvo, dt) persegue; drift(c, dt)
  vagueia; face(c, alvo) espelha o desenho na direção do alvo.
- 🗡️ Combate (P24): hurt(c, dano, iframesSeg) tira vida + invencibilidade
  piscante; isInvincible(c) é o GATE — padrão canônico:
  "se touchCircle(a, b) E NÃO isInvincible(b): hurt + knockback + som" (só o
  hit VÁLIDO empurra e toca som). knockback(c, de, força) empurra com
  decaimento; touchCircle(a, b) colisão por círculo; isDead(c) vida <= 0;
  healthOf(c); drawHealthBar(c, max) barrinha em cima (max 0 = usa maxHealth).
- 🖥️ HUD & Missão: setMission(segundos, kills) — cumpriu (sobreviveu OU
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
- 🎞️ Folha de quadros (em 🎨 Aparência): setSheet(c, "imagem", fw, fh) cola a spritesheet
  (carregada por loadImage) no personagem; playAnim(c, de, até, fps) toca a
  faixa em loop — PODE rodar todo quadro (guarda de transição: repetir a mesma
  não reinicia). A folha VENCE a imagem estática no desenho.
- 🎥 Câmera: cameraFollow(c, mundoW, mundoH) liga o mundo maior (onDraw vira
  world-space; keepOnScreen/spawner/cull passam a valer o mundo/retângulo
  visível); cameraFollowMap(c, "mapa") = mundo do TAMANHO do mapa de tiles
  (colunas × célula, sem conta) — e o motor CULLA o desenho (tilemap fatiado +
  entidade fora da vista nem pinta): mundo gigante custa o preço de uma tela;
  cameraStop(); cameraX()/cameraY() = canto visível.
  onDrawHud(fn(ctx)) desenha DEPOIS, SEM câmera (placar/barras presos na tela).
- ➡️ Tiro e giro (na cat 🎯 Comportamentos): launchTowards(quem, alvo, v) mira UMA vez (seta vx/vy pelo vetor
  normalizado × v); moveByVelocity(quem, dt) aplica × dt a cada quadro. Com
  const tiro = spawnFromMold(...) fecha tiro reto E mirado. setAngle(c, graus)
  gira o desenho em volta do centro.
- 🖱️ Mouse/toque (em 🎮 Controles) — coords do JOGO, letterbox e câmera resolvidos:
  onGameClick(fn(px, py)) roda a cada clique/toque no canvas; mouseX()/
  mouseY()/mouseDown() para mirar e arrastar.
- 📊 drawBar(atual, max, x, y, w, h, cor): barra proporcional (vida/mana/
  progresso) — ideal dentro do onDrawHud.
- 👾 Kit Monstrinhos (o gênero "pegue e treine bichinhos"). ⭐ TESE: é um jogo do
  Kit RPG com OUTRA batalha — o mundo (rpgMoveGrid/NPC/rpgSay/rpgOnMap/flags/
  rpgSave) vem de lá; NÃO duplique nada disso. Dados: pkmCreature(nome, tipo, vida,
  força, defesa, veloc, imagem, aparência) — os pontos são do NÍVEL 1 (+8 vida/+2
  força/+1 def por nível); ⭐ o TIPO é TEXTO LIVRE (fogo, gelo, doce, dinossauro —
  não só os clássicos). pkmMove(golpe, criatura, tipo, dano, acerto, efeito, cor) —
  até 4 por bicho, e ⭐ o menu da batalha é MONTADO desta lista; efeito ∈
  investida|bola|raio|onda. ⭐ pkmTypeChart(atacante, defensor, mult) — a criança
  ESCREVE a regra (2 = super efetivo, 0.5 = fraco, 0 = nada); 3 blocos = o triângulo
  fogo>planta>água>fogo. SEM tabela, tudo vale 1× (nada de mágica implícita).
  pkmEvolve(de, para, nível) · pkmCatchDifficulty(nome, "fácil|normal|difícil|
  raríssimo"). Time: pkmGive(espécie, nível) (até 6) · pkmGiveBall(qtd, força%) ·
  pkmHealTeam() (o Centro de Cura num bloco) · pkmHas/pkmTeamSize/pkmBallCount/
  pkmLevelOf/pkmDrawTeam(x, y). Encontros: pkmGrassCells(x1,y1,x2,y2) ou
  pkmGrassTiles(peça, mapa) + pkmWild(espécie, min, max) (um por bicho = a tabela) +
  pkmEncounterRate(%) — ⭐ o sorteio é por PASSO do rpgMoveGrid (não por quadro).
  Monte tudo no rpgOnMap e cada rota ganha os bichos dela. Batalha:
  pkmBattleWild(espécie, nível) (o lendário/cena; a grama chama sozinha) ·
  pkmBattleTrainer(nome, fn) + pkmTrainerCreature(espécie, nível) DENTRO (rival/
  ginásio: troca sozinho, sem bola nem fuga) · pkmCaught(). ⭐ REUSE
  rpgOnBattleEnd/rpgBattleWon (é o MESMO conceito — não existe pkmOnBattleEnd). O
  XP/nível/evolução são automáticos e ANUNCIADOS; o rpgSave leva o time junto.
  ⚠️ Um kit OU o outro: pkmBattleWild com a batalha do Kit RPG aberta avisa e sai.
  Padrão canônico: rpgOnMap("rota") → rpgBlockCell/rpgCreateNpc/pkmGrassCells/
  pkmWild; rpgOnTalk("professora") → pkmGive+pkmGiveBall; rpgOnTalk("enfermeira") →
  pkmHealTeam; rpgOnBattleEnd → "se pkmCaught() e pkmTeamSize() >= 3: vitoria".
- 🧙 Kit RPG (Canvas RPG Kit em blocos; mecânicas PRONTAS sobre o mesmo motor):
  rpgMoveGrid(heroi, cellPx, dt) — andar por CÉLULAS c/ paredes, portas e o
  ESPAÇO conversando com o NPC à frente (use no onUpdate; a fala/batalha travam
  o herói sozinhas); rpgBlockCell(cx, cy) parede; rpgCell(n) célula→px;
  rpgCreateNpc(nome, cx, cy, img, look) NPC sólido + rpgDrawNpcs() no onDraw +
  rpgOnTalk(nome, fn); rpgSay(texto, quem) caixa typewriter (fila; emite
  "fala:terminada"); rpgAddFlag/rpgHasFlag (story flags — conversa condicionada);
  rpgGiveItem(nome, img)/rpgHasItem/rpgRemoveItem/rpgDrawInventory(x, y);
  rpgSetStartMap(nome) escolhe explicitamente o mapa de início/recomeço;
  rpgOnMap(nome, fn) monta o mapa (sem rpgSetStartMap, o 1º registrado segue
  como fallback legado; trocar limpa paredes/NPCs/portas e REMONTA — reposicione
  o herói na montagem; nome inexistente avisa e cai no 1º mapa válido) +
  rpgGoMap(nome) + rpgCreateDoor(cx, cy, mapa); MUNDO ABERTO estilo Zelda:
  DENTRO do rpgOnMap declare rpgMapSize(cols, rows) (trava da câmera + a borda
  vira fim do mundo) e rpgConnectEdge("leste"|"oeste"|"norte"|"sul", "mapa") —
  atravessou, entra no vizinho pelo lado oposto na MESMA linha (declare a borda
  espelhada NOS DOIS mapas; sai o aviso "mapa:<nome>"); rpgCurrentMap() = o nome
  do mapa de agora ("se = praia → música da praia"); batalha por TURNOS com menu
  PRONTO: rpgBattleStats(vida, força) 1x + rpgBattleStart(nome, vida, força)
  (Atacar = força ± 20%, Defender = ½ do próximo dano, Fugir = 50%; o mundo
  congela SEM resetar) + rpgOnBattleEnd(fn) + rpgBattleWon(). Padrão canônico:
  no onTalk do chefe → rpgBattleStart; no rpgOnBattleEnd → "se ganhei:
  setState('vitoria') senão endGame()". Recomeçar o jogo zera flags/itens e
  volta ao 1º mapa.
- 🎬 cenas (& NPCs vivos — Pizza Legends): rpgCutscene(fn) grava o corpo (cada
  passo ENFILEIRA) e toca a fila com esperas — o herói fica TRAVADO até acabar.
  Passos: rpgWait(seg), rpgSay, rpgNpcWalkTo("npc", cx, cy) (anda célula a
  célula; a cena espera chegar), rpgFace("npc", "down"|"up"|"left"|"right"),
  rpgAddFlag, rpgGoMap, rpgBattleStart — na ordem montada. Fora de cena:
  rpgNpcWander("npc") (mila pela vila) e rpgOnStep(cx, cy, fn) (roda ao herói
  PISAR na célula — encontros/armadilhas/cenas automáticas; montar no rpgOnMap).
  Abertura única: no rpgOnMap, "se NÃO tem a flag intro: rpgCutscene(...);
  rpgAddFlag('intro')". Reserva de intenção: herói e NPC não entram na mesma
  célula. setWalkSheet(c, "folha", fw, fh) = folha de ANDAR de 4 linhas
  (baixo/cima/esquerda/direita) animada pela direção + movimento.
- 🗨️ Fala & escolhas (GERAL — o motor desenha e navega em QUALQUER jogo, apesar do
  prefixo rpg no nome): rpgSay(texto, quem) = caixa typewriter (fila; ESPAÇO avança;
  emite "fala:terminada"). rpgMenu(titulo, fn) abre um menu no canvas (setas +
  espaço/clique) e roda a opção escolhida; DENTRO do fn use rpgOption(label, optFn)
  por escolha — árvore de diálogo/loja/sim-não/quiz. Padrão: no rpgOnTalk do
  lojista → rpgMenu("Comprar?", () => { rpgOption("Sim", () => {...});
  rpgOption("Não", () => {}); }).
- 💾 salvar: rpgSave()/rpgLoad()/rpgHasSave() persistem flags/itens/mapa/
  célula/atributos/poções/especial no localStorage (sobrevive a reabrir).
  Continuar: "se rpgHasSave(): rpgLoad()".
- ⚔️ batalha (a RICA — progressão, TurnCycle/Combatant do Pizza; agora em EQUIPE no
  CANVAS): rpgBattleStats(vida, força, DEFESA) 1x no começo (nível 1); rpgBattleStart(
  nome, vida, força, defesa) abre a batalha desenhada no canvas — o time do jogador
  (herói + aliados) embaixo, os inimigos em cima. Clicar num combatente INSPECIONA
  (painel de info) e destaca; no turno de cada aliado o painel de ação lista Atacar
  (força ± 20% − defesa/2) + os golpes nomeados + Defender/Item/Fugir, e o alvo é
  escolhido clicando num inimigo (com vários) ou automático (com um). Os inimigos
  agem por IA. rpgAddAlly(nome, vida, força, defesa, cor) = aliado no SEU time
  (persiste; o herói já entra); rpgAddFoe(nome, vida, força, defesa, cor) = MAIS um
  inimigo na próxima batalha; rpgTeachMove("Você"|nomeDoAliado, "golpe", dano, custo)
  = golpes NOMEADOS (vários por lutador; gastam energia). rpgTeachHeal("Você"|
  nomeDoAliado, "golpe", cura, custo) = golpe de CURA (devolve VIDA em vez de ferir —
  a Curandeira; aparece no mesmo painel de ação). rpgSetSpecial(nome, dano,
  custo) = 1 golpe do herói (compat); rpgGivePotion(nome, cura) abastece o Item;
  rpgBattleReward(xp) no rpgOnBattleEnd (se ganhou) → sobe de nível (+vida/força/
  defesa, aviso "subiu:nivel"); rpgLevel()/rpgXp() getters; rpgInflict("inimigo"|
  "heroi", "veneno", turnos) aplica status (inimigo = 1º foe vivo). Padrão:
  rpgOnBattleEnd → "se rpgBattleWon(): rpgBattleReward(20); setState('vitoria') senão
  endGame()". 🩸 A vida do HERÓI PERSISTE entre batalhas (entra com playerHp, não cheio;
  endBattle grava de volta ao sobreviver; morrer reseta cheio). rpgHealHero() = curar ao
  máximo FORA da luta (estalagem/save) — a recuperação, já que poção só vale na batalha;
  subir de nível também cura. Aliados ainda entram cheios.
  👑 CHEFES (R30): ⭐ o inimigo AGORA usa os golpes ensinados a ele (rpgTeachMove/
  rpgTeachHeal pelo NOME do foe; antes o foeStep só batia pela força). rpgAddBoss(nome,
  vida, força, defesa) = inimigo MAIOR com barra proeminente + coroa. battlerLife(nome)/
  battlerMaxLife(nome) = a vida de QUALQUER combatente (herói "Você", aliados/inimigos
  por nome; 0 fora) → a receita de FASE: "se battlerLife('Chefe') < battlerMaxLife(
  'Chefe')/2: ...". rpgOnFoeTurn(nome, fn) = IA de chefe (no turno dele roda fn no lugar
  do ataque comum); DENTRO: rpgFoeUse(nome, "golpe") (usa um golpe ensinado) e
  rpgFoeHitAll(nome, dano) (golpe de área em TODO o time). Padrão: rpgOnFoeTurn("Chefe",
  () => { se battlerLife < metade: rpgFoeHitAll('Chefe', 25); senão rpgFoeUse('Chefe',
  'Garra') }).
  🖼️ IMAGEM no combatente + FICHA reutilizável (R34): rpgAddFoe/rpgAddAlly(...,cor,
  "imagem"?), rpgAddBoss(...,defesa, "imagem"?) e rpgBattleStart(...,defesa, "imagem"?)
  aceitam a imagem carregada (loadImage pelo nome) → o lutador vira sprite, não
  retângulo (antes só o herói). rpgDefineBattler(nome, vida, força, defesa, "imagem",
  "cor", chefão?) guarda uma FICHA de inimigo; rpgBattleNamed(nome) começa a batalha
  contra a ficha (inimigo principal) e rpgAddFoeNamed(nome) enfileira mais — "define
  separado, escolhe na hora" (como os moldes do mundo). Ficha inexistente = no-op+aviso.
- 🗺️ Mundo & profundidade (tiles do Ninja Adventure; GERAL, vale fora do RPG):
  loadTilemap(nome, assetDeMapa) lê um MAPA do Pinta (grade+peças+sólidos juntos,
  via ASSET_META). No onDraw, drawTilemap(nome, "chão") ANTES dos personagens e
  drawTilemap(nome, "topos") (só peças sólidas) OU drawTilemap(nome, "frente") (a
  camada da frente marcada no Pinta) DEPOIS = profundidade (herói passa atrás).
  drawByDepth(quem) desenha por Y (quem está mais embaixo, na frente) o personagem
  passado + TODOS os enxames vivos + os NPCs do RPG (se houver) — substitui
  drawCharacter+rpgDrawNpcs. drawShadow(c) = sombrinha sob o personagem (antes de
  desenhá-lo). cameraShake(força, segundos) treme a tela (impacto), com câmera
  ligada ou não.
  ⚠️ tilemapSolid(nome) NÃO é geral: ele só alimenta a GRADE do RPG (rpg.walls),
  que apenas o rpgMoveGrid lê. Num jogo de movimento LIVRE ele não faz nada — não
  emita tilemapSolid fora do Kit RPG.
- ⚙️ Física (GERAL — primitivos soltos, FORA de todo kit; é com eles que se faz
  plataforma/quicar/arco "na unha"): applyGravity(quem, forca, dt) puxa p/ baixo
  (padrão 2160 px/s²) e DESLIGA onGround; setVelocity(quem, vx, vy) e
  velocityOf(quem, "x"|"y") escrevem E LEEM (ler destrava "se velocityOf(h,'y') >
  0: tocar cair"); jump(quem, forca) só age NO CHÃO (padrão 660; é o que impede
  pulo infinito); isOnGround(quem); setTerminalVelocity(quem, max) limita a queda
  (padrão 900); bounceOnEdges(quem)/wrapEdges(quem); paddleBounce(bola, raquete) =
  rebate a bola na raquete invertendo vy e ABRINDO o ângulo pelo ponto de impacto
  (meio = reto, beirada = aberto). Com o bounceOnEdges nas paredes = Breakout/Pong.
  ⭐ ORDEM OBRIGATÓRIA no onUpdate, nesta sequência: applyGravity → moveByVelocity
  → collide*. A gravidade zera onGround; SÓ o pouso da colisão (vy > 0) liga de
  volta. Fora dessa ordem o personagem vibra ou atravessa o chão.
- 🧱 Colisão sólida (GERAL, sem RPG): collideTilemap(quem, mapa) para o
  personagem nas peças SÓLIDAS do mapa (empurra pelo eixo de MENOR sobreposição,
  zera a velocidade do eixo, seta onGround no pouso) — é o que o plataforma usa,
  NÃO o tilemapSolid do RPG; collideGroup(quem, molde) = o mesmo contra os vivos
  de um molde (plataformas/caixas/pedras, sem mapa); overlapGroups(moldeA, moldeB,
  fn(a, b)) roda o par que se tocou (tiro × inimigo, herói × moeda) — pode
  recycle() os dois lá dentro com segurança.
- ⏱️ Tempo: everySeconds("chave", s) dentro de um "se" repete de tempo em tempo
  (acumula o dt do JOGO — pausou, para de contar; NÃO usa relógio de parede);
  cooldownReady(quem, s) = o "recarregando" do tiro/golpe (true só quando o tempo
  passou, e JÁ reinicia a contagem).
- 📽️ Animação (GERAL — a TRAVA): os 3 sistemas de animação deixavam qualquer
  chamada atropelar a anterior (golpeia e a animação de andar apaga o golpe).
  ⭐ setEntityState(quem, "parado"|"andando"|"pulando"|"caindo"|"dano"|"golpe"|
  "morte", segundos) TRAVA o estado; stateAnim(quem, estado, de, ate, fps, umaVez)
  / stateLook(quem, estado, aparencia) declaram o visual 1x; autoAnimate(quem) todo
  quadro resolve por prioridade FIXA (morte > golpe > dano > no ar > andando >
  parado) + flip por vx + fallback (caindo→pulando→andando→parado). playAnimOnce +
  animEnded = tocar e parar no último quadro. entityState(quem) LÊ o estado.
  ⚠️ o attackFacing/hurt já chamam setEntityState sozinhos: quem usa só os blocos
  gerais de ação ganha a trava sem saber que ela existe. NÃO existe "quadro atual
  da animação" DE PROPÓSITO — "acerta no quadro 4" quebra quando um quadro é
  pulado; a janela é em SEGUNDOS e a animação é esticada p/ caber nela.
- 🥷 setSwingWindow(quem, recuo, ativo) em SEGUNDOS = o golpe não machuca no
  quadro do aperto. Sem isto quem aperta primeiro SEMPRE ganha (sem leitura, sem
  espaçamento, sem punir). O rastro branco do drawEntity pinta só na janela ATIVA.
  Golpe pesado que trava mais tempo do que leva p/ recuperar = COMBO emergente.
- 🚀 thrust(quem, graus, forca) SOMA velocidade (INÉRCIA: nave/Asteroids/carro; o
  setVelocityAngle SOBRESCREVE e por isso nunca desliza). A força é px/s² e o
  runtime aplica × dt por baixo (padrão 6000) — use TODO QUADRO; impulso único de
  evento é setVelocityAngle · applyFriction(quem,
  fator, dt) = atrito (0.9 chão, 0.1 gelo) · angleOf(quem)/angleTo(a, b) = LER o
  ângulo (torre que gira até mirar, leque de tiros, stealth).
- ⏱️ waitThen(segundos, fn) = esperar UMA vez, no relógio do jogo (o everySeconds
  REPETE; o rpgWait só vale dentro de "Fazer a cena").
- 👾 nearestActive(molde, x, y) = o vivo mais perto de um ponto (tower defense, IA
  de horda que escolhe alvo).
- 🎲 randomActive(molde) = um vivo QUALQUER do pool, ou null (em 🎲 Sorte & medida)
  — o invasor aleatório que atira, o sorteado do power-up. Sempre teste null.
- 🎲 pickActive(molde, "maior"|"menor", prop) = o vivo com o máximo/mínimo de uma
  propriedade (x/y/vx/vy/speed/w/h/health/maxHealth/damage/pathProgress). ⭐ é o
  alvo "mais avançado no caminho" do tower defense: pickActive(inimigo, maior,
  pathProgress). Null com pool vazio.
- 🛤️ definePath(nome, fn) + pathPoint(x, y) DENTRO (container, como rpgMenu/
  rpgOption) = trilha nomeada; followPath(quem, caminho, vel, dt) segue POR QUADRO
  (dentro do forEachActive, como seek); pathProgress(quem) 0..100. Fim → PARA e
  emit "caminho:fim"; QUEM chegou = no forEach, "se pathProgress(item)===100".
  Serve tower defense/patrulha/esteira/cutscene em trilho/corrida. Pontos podem
  ficar fora da tela.
- 🏁 Jogo de tabuleiro (R30 — Ludo/Jogo da Vida; a criança MONTA): rollDice(lados)
  = sorteia 1..lados (o dado, em 🎲 Sorte & medida). Ordem de turno (anel):
  playersSetup(n) · currentPlayer() (a vez, 1..n) · nextPlayer() (rodízio; volta ao 1)
  · onTurnChange(fn). Trilha de CASAS (reusa 🛤️: cada pathPoint é uma casa):
  moveAlongTrack(quem, casas, "trilha") avança N casas e PARA na casa (desliza +
  emit "casa:parou") · spaceOf(quem) = o índice da casa (0 = 1ª) · onLandSpace(fn)
  roda ao parar. Receita do turno: role o dado → moveAlongTrack esse tanto → no
  onLandSpace "se spaceOf(peao)===7: pontos" → nextPlayer.
- 🔁 parallaxLayer(imagem, fatorX, fatorY) = fundo preso à CÂMERA (0 = céu ao
  longe, 1 = colado no mundo); precisa da câmera ligada. O scrollImage rola por
  VELOCIDADE (tela fixa); este segue a POSIÇÃO (mundo grande) — o sunnyland.
- ✨ sheetBurst(imagem, quadros, fps, x, y, tamanho) = explosão de spritesheet
  one-shot num bloco (some sozinha); dispensa molde + playAnimOnce + animEnded.
- ⚔️ rpgInflict(quem, "veneno"|"regenera"|"atrapalha", turnos): veneno −3/turno,
  regenera +3/turno, atrapalha = 33% de errar o golpe (o clumsy do Pizza Legends).
- ✨ trailOn(quem, cor, tamanho, porSegundo, vidaSeg)/trailOff(quem) = rastro
  CONTÍNUO (jato de nave, cauda de cometa; o burst é estouro único) ·
  shockwave(x, y, raio, segundos, cor) = círculo que cresce e some, SÓ VISUAL —
  dano em área é receita: forEachActive + distanceBetween < raio → hurt.
- 🖥️ floatText(texto, x, y, cor, tamanho) = "+100" que sobe e some sozinho
  (0,75 s, coords do MUNDO — acompanha a câmera; em 🖥️ HUD & Missão). Pontos:
  floatText("+" + pontos, ...).
- 🎨 leanOnMove(quem, graus) = tomba suave ao andar de lado (nave/peixe/moto;
  0 desliga; soma com o setAngle) · scrollImage(imagem, vx, vy) = fundo que
  ROLA/paralaxe (1ª linha do onDraw; em 🔁 A cada quadro; imagem via loadImage).
- 🎯 fanShot(quem, moldeDoTiro, n, arcoGraus, rumoGraus, vel) = leque de tiros
  (rumo -90 = p/ cima, como setVelocityAngle); depois mova com moveByVelocity +
  cullOffscreen, como todo tiro.
- 🎁 Itens (GERAL, saiu do Kit RPG): rpgGiveItem SOMA quantidade (antes dedupava) e
  rpgCountItem(nome) LÊ — crafting ("3 madeiras"), loja, coleta. As FLAGS
  (rpgAddFlag/rpgHasFlag) também são gerais e vivem coladas na 🧠 Memória: a flag
  morre com a partida, o valor guardado sobrevive a fechar o jogo.
- 🔧 Propriedades & direção (GERAL): propertyOf(quem, "x"|"y"|"vx"|"vy"|"speed"|"w"|
  "h"|"health"|"maxHealth"|"damage") e setProperty(quem, prop, v) = a chave-mestra
  p/ o que não tem bloco
  pronto. setFacingDir(quem, "down"|"up"|"left"|"right")/facingOf(quem) — a
  direção move DOIS sistemas: a folha de andar e a caixa do attackFacing.
- 🗺️ Peças por célula (em 🗺️ Mundo & profundidade): tileAt(mapa, x, y), setTileAt(mapa, x, y, peca),
  breakTileAt(mapa, quem) (mundo destrutível/cavar), setTileSize(px) (padrão 64).
- ✨ tweenTo(quem, x, y, s) desliza suave até um ponto (porta/plataforma/cutscene)
  — chame UMA vez, não todo quadro.
- 🧭 Regiões · 🎲 Sorte & medida · 🌫️ Sumir & transição · 🧠 Memória (GERAIS, fora
  de todo kit — é com eles que se inventa gênero):
  defineRegion(nome, x, y, w, h) = retângulo com NOME (grama, porta, zona de dano,
  área segura) + isInside(quem, regiao) + ⭐ overlapPercent(quem, regiao) 0..100 —
  o gate honesto: "se overlapPercent(heroi,'grama') > 50 E chance(20)". Só encostar
  a quina NÃO conta (a área é clampada em 0 sem toque). chance(pct) = sorteio.
  distanceBetween(a, b) = a conta central de stealth/torre/IA-que-só-persegue-perto.
  pointIn(x, y, quem) + mouseX()/mouseY() = clicou NAQUELE objeto (point&click,
  cartas, match-3, tower defense). ⭐ launchToPoint(quem, x, y, vel) mira num PONTO
  (o launchTowards exige um OBJETO, e o mouse dá números) · setVelocityAngle(quem,
  graus, forca) MOVE no ângulo (o setAngle só gira o DESENHO). ⚠️ ele SOBRESCREVE o
  vx/vy: p/ nave/Asteroids/tanque com inércia use o thrust (⚙️ Física), que SOMA. setOpacity(quem, pct)/opacityOf/fadeTo(quem, pct, s) =
  sumir (o "faint"). tweenProperty(quem, prop, ate, s) = deslizar QUALQUER
  propriedade (x/y/vx/vy/speed/w/h/health/opacity); ao chegar emite
  "deslizou:chegou" (dá p/ encadear). setHitbox(quem, ox, oy, w, h) = a caixa que
  COLIDE ≠ o desenho (num personagem alto, só os PÉS — senão colide com a cabeça);
  w/h 0 = o desenho todo. fadeScreen(cor, s, escuro)/flashScreen(cor, vezes) =
  ESCONDER a troca de cena atrás do preto. saveValue(nome, v)/savedValue(nome) =
  guardar de verdade (recorde/fase destravada) — o rpgSave é SÓ do Kit RPG.
  ⭐ playMusic(nome) = LOOP (o playSound NÃO repete; re-chamar não reinicia) ·
  stopSound(nome) · setVolume(nome, 0..1). createEmptyTilemap(nome, cols, linhas,
  peca, folha) = mapa por CÓDIGO (masmorra sorteada) → setTileAt num laço.
  moveWithCustomKeys(quem, cima, baixo, esq, dir, dt) = 2º jogador (o moveWithKeys
  tem WASD E setas no MESMO personagem).
- 🧩 Grade (GERAL — a grade nomeada dos jogos de grade; Snake/Match-3/Sokoban/
  campo-minado/puzzle): boardCreate(nome, cols, rows, vazio) cria a grade cheia do
  valor "vazio" (0, "", "grama"…); boardSet(nome, valor, col, row) grava numa
  célula (fora da grade = ignora); boardGet(nome, col, row) lê (fora = o "vazio");
  boardCount(nome, valor) conta as células com aquele valor; boardIn(nome, col,
  row) testa se cabe (parede/limite). SEM bloco de laço DE PROPÓSITO: varra a grade
  com o "repita" do núcleo + boardGet/boardSet (a criança MONTA a mecânica). Cobrinha
  = uma lista de células + o tabuleiro marcando o corpo (bateu no corpo = perdeu).
- 🎴 Cartas (R30 — memória/Uno/deck-battler; ⭐ uma PILHA é só uma LISTA do núcleo,
  a criança MONTA): pileMoveTop(de, para) tira o topo de uma lista e põe na outra
  (= comprar deck→mão E descartar mão→descarte) · pileShuffleFrom(deck, descarte) =
  junta o descarte no deck e embaralha (rebaralhar) · pileTop(pilha)/pileSize(pilha).
  Carta de 2 faces: card(frente, verso) (nasce virada pra baixo) · cardFlip(carta) ·
  cardIsUp(carta) · cardFace(carta) (frente se pra cima, verso se pra baixo — compare
  para achar o par). Mão clicável: handDraw(lista, x, y, leque?) desenha a fileira e
  guarda os retângulos · cardAt(mouseX, mouseY, lista) = o índice da carta clicada (−1
  = nenhuma). Memória: lista de pares + shuffle → onGameClick vira; 2 viradas → compara
  cardFace → par fica, senão waitThen(0.6) e desvira as duas.
- 🥊 Kit Luta (Street Fighter — o ATALHO do gênero; luta "na unha" segue possível
  com personagem + applyGravity + attackFacing + didHit + hurt + knockback):
  lutaMatch(a, b, rounds, segundos) casa os DOIS e grava o "home" de cada um da
  posição ATUAL — vem DEPOIS do placeCharacter (o respawn geral não serve: o
  _bornX nasce 0 e o placeCharacter não o atualiza). lutaFighter(quem, esq, dir,
  pular, agachar, defender, dt) = tudo-em-um com as TECLAS DELE → dois blocos =
  dois jogadores (⚠️ o moveWithCustomKeys é top-down sem gravidade e o
  platformerHero tem tecla FIXA: é o ÚNICO ponto em que o kit re-faz algo do
  geral, e é por limitação real). Ele vira de frente SÓ na horizontal — o face()
  geral usa eixo DOMINANTE e mandaria a caixa de golpe p/ o CÉU quando o outro
  pula por cima.
  ⭐ lutaMove(nome, quem, "rápido"|"médio"|"pesado", dano, alcance, atravessa,
  especial): a PALAVRA escolhe recuo/ativo/recuperação/trava/empurrão. O COMBO
  EMERGE daí e não é bloco: o pesado trava 0,45 s e recupera em 0,42 s → sobram
  0,03 s p/ emendar um rápido. O agarrão é o checkbox "atravessa" (vence a
  defesa). lutaAttack(quem, golpe) com keyPressed (a tecla é da criança: é o que
  permite 2 botões + especial + combo). lutaMoveAnim(golpe, quem, de, até) — fps
  esticado p/ durar o golpe. lutaAI(quem, "fácil"|"normal"|"difícil") vai no LUGAR
  do lutaFighter daquele lutador. lutaDrawHud() no onDrawHud, SEM argumentos
  (barras/cronômetro/rounds/letreiros).
  ⚠️ Os ROUNDS não têm estado próprio DE PROPÓSITO: um setState('round') cairia no
  reset de 'jogando' e APAGARIA o jogo da criança a cada round. As fases vivem no
  kit e travam só os lutadores; o stepLuta roda no stepSystems (o relógio do round
  pausa junto com o jogo de graça). O fim faz setState('fim') e SÓ DEPOIS
  emit('luta:acabou') — assim o ouvinte pode sobrescrever a tela.
  Getters: lutaWinner()/lutaRoundNow()/lutaWinsOf/lutaComboOf/lutaSpecialOf/
  lutaIsGuarding. Avisos: luta:round, luta:acertou, luta:defendeu, luta:ko,
  luta:acabou. O CHÃO é geral (defineMold + spawn + collideGroup) — NÃO existe
  "chão da luta", que seria o position.y = 330 hard-coded da base.
- 🏃 Kit Plataforma (Mario/Celeste/Sunnyland — o ATALHO do gênero; o "na unha"
  segue possível só com ⚙️ Física): platformerHero(quem, vel, pulo, dt) =
  gravidade + A/D-setas + pulo + mover, TUDO-EM-UM, com o feel embutido (coyote
  0.1s, buffer 0.1s, pulo variável 0.3s, speedBoost do Mario). ⚠️ a COLISÃO fica
  FORA de propósito: emita collideGroup/collideTilemap LOGO DEPOIS dele.
  setJumpFeel(coyote, buffer, segurar, gravidade) regula (gravidade 2160 = normal).
  doubleJump(quem, força, vezes) · wallSlide(quem, vel) · wallJump(quem, fx, fy)
  (o pouso e a parede devolvem os pulos do ar) · climbLadder(quem, mapa, peça,
  vel) — DEPOIS do herói e ANTES de colidir; na escada ↑ SOBE (não pula).
  oneWayPlatform(quem, molde, dt) = tábua (sobe por baixo, pousa em cima) ·
  dropThrough(quem) = ↓+pulo atravessa · movingPlatform(quem, x1,y1, x2,y2, s, dt)
  + rideOn(quem, molde) — SEMPRE pareados, senão a plataforma escorrega debaixo do
  herói. stompKill(quem, molde, quique) = pisar (compara VELOCIDADE; emite
  "plataforma:pisou") · patrolTurnAtWall(quem, vel) (dirigido por colisão: use
  dentro do forEachActive + collideGroup) ·
  platStateFrames(quem, "parado"|"andando"|"pulando"|"caindo", de, até, fps) 1x
  por estado + platformerAnim(quem) todo quadro (a animação sai da física).
  Ordem canônica no onUpdate: platformerHero → dropThrough → collideGroup(chao) →
  oneWayPlatform → rideOn → stompKill → platformerAnim.
- 🚀 Kit Nave (Space Invaders — o ATALHO do gênero; nave "na unha" segue possível
  com molde + spawn + setVelocity + overlap + cooldown): naveShip(quem, vel,
  inclinaGraus, dt) = anda SÓ de lado (setas/A-D), preso na tela, com lean — o
  TIRO é da criança: "se keyPressed(' ') e cooldownReady(nave, 0.35): fanShot(
  nave, 'tiro', 1, 0, -90, 600)". ⭐ naveWave(molde, cols, linhas, espaço, vel,
  desce, acelera%) = a FORMAÇÃO que o MOTOR marcha em bloco (inverte na borda
  COLETIVA, desce, acelera; a morte encolhe a formação sozinha; se a grade não
  couber na tela o motor ESPREME o espaço p/ caber, respeitando as colunas) —
  NUNCA emita
  seek/tweenTo nos membros (briga com a marcha); o overlap tiro×invasor é da
  criança, como sempre. Avisos: 'onda:limpa' (crie a próxima MAIS RÁPIDA:
  velocidade = velocidade * 1.2 → naveWave de novo — a dificuldade em 2 blocos)
  e 'onda:invadiu' (com naveInvasionLine(y); padrão: endGame()).
  naveWaveShooter(molde, seg, moldeDoTiro, vel) = um invasor SORTEADO atira
  (dedupe por molde; o tiro se move com forEachActive + moveByVelocity + cull).
  navePowerup(quem, "metralhadora"|"leque", seg) + navePowerOf(quem) = power-up
  temporário (metralhadora = keyDown + cooldown 0.12; leque = fanShot de 5).
  naveStarfield(n, vel) = céu rolando (1ª linha do onDraw). naveBomb(molde,
  raio, alvoMolde) = bomba que quica; a criança a RECOLHE no overlap → o motor
  explode (shockwave + recolhe o alvo no raio + 'bomba:acertou' por vítima,
  some os pontos lá). Receitas SEM bloco novo: chefe = molde de vida alta +
  spawn_named + drawHealthBar + fanShot em padrões; asteroide que parte = no
  overlap, 2 spawns do molde menor + recycle; escudo = hurt(quem, 0, 3);
  vidas = variável + drawHearts.
- 🏰 Kit Defesa de Torre (tower defense — o ATALHO do gênero; o resto é geral):
  o CAMINHO é 🛤️ (definePath/pathPoint), a MIRA é a 🎲 pickActive(inimigo, "maior",
  "pathProgress") = o invasor mais avançado, e o TIRO/barra/corações/explosão são
  os blocos gerais. Do kit: tdSlot(x, y, tam) = um lugar de torre (no setup;
  marque vários flanqueando o caminho); tdDrawSlots() = desenha os livres, o de
  baixo do mouse acende (no onDraw); tdOnBuy(custo, fn(lugarX, lugarY)) = a
  COMPRA — cada clique num lugar livre COM moedas cobra, ocupa e roda fn com o
  centro do lugar (nasça a torre em lugarX-halfW, lugarY-halfH); sem moedas →
  aviso 'compra:negada'; clique em ocupado/fora cai no onGameClick (upgrade).
  tdFreeSlot(x, y) = solta o lugar (vender/destruir). tdDrawRange(quem, raio) =
  círculo do alcance. tdWave(caminho, quantos, molde, espaço, vel) = a ONDA que
  nasce espaçada e o MOTOR marcha pelo caminho; chegou ao fim → 'invasor:passou'
  (tire vida); onda vazia → 'onda:limpa' (MESMO aviso do Kit Nave — vocabulário
  único; crie a próxima maior: leva = leva + 2 → tdWave). Carteira: tdSetCoins(n)
  no setup (o "Jogar de novo" volta a esse valor), tdAddCoins(n) (negativo gasta),
  tdCoins() no placar. ⭐ A TORRE QUE ATIRA é receita (ensina a lógica): "no
  onUpdate, para cada vivo 'torre': se cooldownReady(torre, 0.8): alvo =
  pickActive('invasor','maior','pathProgress'); se alvo e distanceBetween(torre,
  alvo) < 220: tiro = spawnFromMold('tiro', charX(torre), charY(torre));
  launchTowards(tiro, alvo, 420)". Depois mova os tiros (forEachActive +
  moveByVelocity + cull) e no overlapGroups('tiro','invasor'): recycle(tiro) +
  hurt(invasor) + se isDead: faíscas + tdAddCoins + recycle. Gelo/área/vender =
  receitas sobre esse esqueleto. Exemplo: "Defesa do Reino".
- 🃏 Kit Cartas (R30 — deck-battler/Slay the Spire; RECEITA, não mágica: o kit dá o
  andaime, a criança MONTA o deck/mão/efeitos com as 🎴 Cartas + gerais). cardsStart(
  minhaVida, vidaInimigo) abre a arena (roda no 'jogando'; NÃO muda o estado). cardsEnergyPerTurn(n) = a
  energia RESETA por turno (o diferencial do RPG comum) · cardsEnergy()/cardsSpend(n).
  cardsOnTurn(fn) = começo do meu turno (energia+escudo já resetaram) — COMPRE a mão
  aqui (pileMoveTop baralho→mão ×N; pileShuffleFrom se zerou) · cardsEndTurn() dá a vez
  ao inimigo e volta. Vida/escudo: cardsHeroLife()/cardsEnemyLife() · cardsHurtEnemy(n)
  (ataque) · cardsHurtMe(n) (o escudo absorve antes) · cardsGainBlock(n) (defesa; some
  no começo do meu turno). Intenção (o telegrafo): cardsEnemyIntent("atacar", n) anuncia
  · cardsDrawHud() desenha vidas/energia/escudo/intenção · cardsIntentAction()/
  cardsIntentValue() a criança LÊ no cardsOnEnemyTurn(fn) p/ resolver ("se action==
  'atacar': cardsHurtMe(value)") e anunciar a próxima. Jogar carta = onGameClick + cardAt
  (Fase 🎴 Cartas) + cardsSpend + efeito + pileMoveTop mão→descarte. Exemplo "Duelo de
  Cartas".
- 🥷 Ação em tempo real (Zelda; Ninja Adventure): attackFacing(quem, alcance,
  duracao) cria uma caixa de golpe NA FRENTE (pela direção que olha) por ~0.3s, com
  trava de 1 acerto por golpe; didHit(quem, alvo) = a caixa encostou no alvo NESTE
  golpe (padrão: "se didHit(heroi, inimigo): hurt(inimigo)"). patrolAround(quem, ox,
  oy, raio) = inimigo vagueia perto do posto (no onUpdate). Combate de AÇÃO usa
  createCharacter + moveWithKeys + hurt/isInvincible (não a batalha por turnos do
  RPG). O HUD de corações — drawHearts(atual, max, x, y) — é 🖥️ HUD & Missão.

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
