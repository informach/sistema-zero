/**
 * Contexto de IA da extensão "Jogo 3D Avançado" — descreve a API global
 * window.SZGameKit3D para o assistente gerar código coerente com os blocos.
 * É um template literal: NADA de backtick nem interpolação aqui dentro.
 */
export const gameKit3DPromptContext = `
Extensão "Jogo 3D Avançado" (game-3d-advanced): a base de um jogo 3D
profissional via window.SZGameKit3D (Three.js por dentro, encapsulado).
Unidades em metros do mundo 3D. Receita canônica: setup -> defineMold (peças
dentro) -> ganchos (onEnterState('jogando') monta a partida; cérebros por
estado) -> start() no FIM.

API global (cada método corresponde a exatamente 1 bloco):
- Ciclo: setup({width, height, world, sky, ground}); start(); worldSize();
  scatterDecor(n); setEffects({shadows, bloom, strength, vignette}) — efeitos
  de cinema (pós-processamento), tudo ligado por padrão.
- Moldes: defineMold('nome', {health, speed}, function () { ...part()... });
  part({shape: 'box'|'sphere'|'cylinder'|'cone'|'plane'|'torus'|'pyramid'|
  'rampa'|'modelo', material: 'normal'|'metal'|'vidro'|'brilho', color, texture,
  model, w, h, d, x, y, z}) — o part SÓ funciona dentro do defineMold; 'brilho'
  acende no bloom; texture = nome de imagem do projeto; shape 'modelo' + model =
  nome de um .glb do projeto (o colisor segue sendo a caixa w/h/d).
- Céu de foto: setSkyPhoto('nome') — um .hdr do projeto vira o céu 360 e ilumina
  a cena. GLB/HDR carregam por parse() de um ArrayBuffer (a rede é bloqueada no
  preview); KTX2/Draco NÃO existem (precisariam de WASM).
- Valores da entidade: posOf(ent, 'x'|'y'|'z'); velocityOf(ent, eixo);
  distanceBetween(a, b); healthOf(ent); maxHealthOf(ent); stateOf(ent).
- Enxames: spawn('molde', x, y, z) devolve a entidade (use const nome = ...
  para apelidar); spawnFrom('molde', ent) nasce no lugar e virado igual (o
  tiro da torre); startSpawner('molde', segundos, 'edge'|'anywhere');
  stopSpawner('molde'); forEachAlive('molde', function (item) {});
  countAlive('molde'); recycle(ent); recycleAll('molde'); cullFar('molde', d).
- Laço/teclas: onUpdate(function (dt) {}) — roda só no estado 'jogando';
  moveWithKeys(ent, velocidade) — WASD/setas no chão, dt embutido;
  keyDown('w'); keyPressed('j'); setPauseKey('Escape').
- Câmera: cameraFollow(ent, dist, altura); cameraOrbit(dist); cameraTop(alt);
  cameraFps(ent) — 1a pessoa, olhar com o mouse (clique captura o ponteiro);
  cameraAngle(azGraus, elGraus) — gira/inclina a órbita por código;
  cameraDistance(d) — vale p/ órbita E seguir; cameraLens(graus) — FOV (60 =
  normal, 30 = zoom de mira); cameraLookAt(ent) / cameraLookAtPoint(x, y, z) —
  o PIVÔ da órbita/de-cima (antes era cravado na origem do mundo);
  cameraShake(forca, seg) — tremor de impacto, decai sozinho, usa a semente;
  cameraSmooth(lambda) — suavidade do seguir (3 = padrão).
- ⭐ CONVENÇÃO DE FRENTE: a frente do molde é +Z (a do curso e a dos .glb) —
  moveForward/lookAt/faceVelocity/aimAt/isAimingAt todos usam +Z. Ponha o
  nariz/cano das peças em z POSITIVO.
- ⭐ WASD é RELATIVO À CÂMERA (moveWithKeys/platformerKeys/moveFps): W entra na
  tela em qualquer modo de câmera, inclusive na órbita arrastada. Não gere
  código que ande por eixo fixo do mundo esperando que "W = -Z".
- Fisica (na unha, sem lib): fall(ent, gravidade) — liga a queda; jump(ent,
  forca) — so no chao; onGround(ent); makeSolid('molde') — vira parede/chao
  solido e PARA TUDO que nao seja fantasma (⚠️ v0.3.0: antes so parava quem
  tinha gravidade, entao tiro atravessava parede); passThrough(ent, true) —
  fantasma, o escape hatch; platformerKeys(ent, velocidade, pulo) — WASD +
  espaco; moveFps(ent, velocidade); setCollider('molde', 'box'|'sphere'|
  'capsule') — capsula nao engancha em quina e sobe rampa liso;
  makeTrigger('molde') — zona que nao empurra; onOverlap('molde', function
  (zona, quem) {}) — dispara ao ENTRAR, 1x por entrada; setBounce('molde',
  0..1); setFriction('molde', 0..1).
  setPhysics('molde', 'bola'|'caixa'|'personagem'|'gelo'|'flutuante') — preset
  coerente (colisor + quique + atrito + gravidade-padrao do molde, aplicada no
  spawn). E o atalho: prefira-o a afinar 4 blocos na mao.
  ⭐ Quique e atrito valem dos DOIS lados: quique = o MAIOR dos dois (bola quica
  em qualquer chao, inclusive no piso-base; personagem nao quica em chao nenhum,
  mas o trampolim ainda o arremessa); atrito = o mais ESCORREGADIO dos dois.
  Rampa = FORMA de peca (part shape 'rampa'), nao bloco. Plataforma que anda =
  makeSolid + setVelocity: ela CARREGA quem esta em cima, sem bloco novo.
  Tiro rapido nao tunela (o motor parte o passo do quadro em substeps).
- Anima o modelo (.glb): setStateAnim('molde', 'estado', 'Clipe') — ⭐ AMARRA a
  animação ao estado da FSM (o setEntityState troca o clipe sozinho, com
  crossfade); playAnim(ent, 'Clipe', loop) — na hora (loop=false fica no último
  quadro); stopAnim(ent). O nome do clipe vem de DENTRO do .glb (Idle/Run/Walk —
  cada site nomeia do seu jeito); clipe inexistente = aviso, nunca exceção. O
  mixer é POR ENTIDADE (nasce no spawn, não no part) e o clone usa SkeletonUtils
  (o clone comum não reamarra o esqueleto). Molde só de peças não tem animação.
- ⭐ Acaso: setSeed(n) — a MESMA semente da a MESMA partida (0 = acaso de verdade).
  randomBetween(a, b) e randomChance(percent) sao o sorteio DO KIT e obedecem a
  semente. NUNCA gere Math.random() nem o bloco "numero aleatorio" do nucleo
  dentro de um jogo 3D que use setSeed: eles IGNORAM a semente e quebram a
  reprodutibilidade.
- Tempo: startTimer(seg); timeLeft(); stopTimer(); onTimerEnd(fn) — o relogio da
  crianca (so corre em 'jogando'; a pausa congela; recomecar zera).
- Fala: say(ent, 'texto', seg) — balao ancorado NA entidade, acompanha ela na
  tela e some sozinho (1 por entidade); hideSay(ent).
- Musica: playMusic('nome') — em loop, UMA por vez; stopMusic(). O playSound e
  tiro-e-esquece (efeito), o playMusic e a trilha.
- Luz & ceu: addLight(cor, x, y, z, forca) — luz pontual; setAmbient(forca) —
  luz do ambiente (0 escuro, 1 claro); setFog(cor, perto, longe) — nevoa;
  setSky(topo, horizonte) — troca o ceu em runtime.
- Mira/clique (raycast): const alvo = pick('molde') — a entidade do molde sob o
  mouse (point-and-click/RTS); pointerOver(ent) — o mouse esta sobre ela?;
  groundPoint('x'|'y'|'z') — o ponto do chao sob o mouse; mousePressed() — o
  clique ACONTECEU neste quadro (o gatilho do point-and-click: if
  (mousePressed()) { const alvo = pick('molde'); ... }); mouseDown() — segurando.
- Entidades: place(ent, x, y, z); setYaw(ent, graus); setVelocity(ent, x, y,
  z); setDrag(ent, n) — freia so no plano x/z; lookAt(a, b); moveForward(ent,
  vel); posOf(ent, 'x'|'y'|'z'); exists(ent) — sempre pergunte antes de usar um
  alvo guardado; isMold(ent, 'molde') — a identidade (o filtro do 'quem' das
  zonas: em onOverlap, confira isMold(quem, 'heroi') antes de contar o ponto).
- FSM por entidade (o coração): toda entidade nasce no estado 'parado'.
  onEnterEntityState('molde', 'estado', function (ela) {});
  onEntityStateUpdate('molde', 'estado', function (ela, dt) {});
  onExitEntityState('molde', 'estado', function (ela) {});
  setEntityState(ent, 'estado') — idempotente; entityStateIs(ent, 'estado');
  stateTimer('molde', 'estado', segundos, 'proximo') — transição por tempo.
- Comportamentos: seek(quem, alvo) — persegue com a velocidade do molde;
  seekPoint(quem, x, z) — anda rumo a um PONTO do mundo (waypoint/patrulha; so
  no plano, para ao chegar); aimAt(quem, alvo, suavidade) — giro suave de torre
  (slerp); faceVelocity(ent); isAimingAt(a, b) — hora de atirar.
- Vizinhança (grade espacial): forEachNear(ent, 'molde', raio, function
  (vizinho) {}); const alvo = nearest('molde', ent); touches(a, b, dist).
- Combate: hurt(ent, dano) — i-frames de 0.5s embutidos; healthOf(ent);
  onEntityDeath('molde', function (ela) {}) — recolhe sozinho depois;
  showHealthBar('molde', true) — barrinha de vida flutuante sobre cada entidade
  viva do molde (verde -> vermelha; chefao/RPG). Morte dramatica (cair antes de
  sumir): NAO use hurt no golpe final — vida numa gaveta + estado 'morrendo'
  (fall + stateTimer) + recycle no estado seguinte.
- Faíscas 3D (partículas data-driven): defineEffect('nome', {count, colorFrom,
  colorTo, spread, sizeFrom, sizeTo, life, gravity}) — EXPLOSAO; burstAt('nome',
  x, y, z); burstOn('nome', ent) — combine com onEntityDeath.
- Emissores CONTINUOS + atratores: defineEmitter('nome', {colorFrom, colorTo,
  sizeFrom, sizeTo, rate, speed, cone, gravity, glow}) — fogo/fumaca/rastro
  (cone em graus: 0 reto, 180 esfera; glow true=fogo, false=fumaca ordenada);
  startEmitter('nome', x, y, z) — jorra num ponto; emitterOn('nome', ent) —
  jorra seguindo a entidade; stopEmitter('nome') — apaga TODOS os jorros da
  receita; addAttractor('nome', x, y, z, forca, alcance) — ima que puxa as
  particulas (vortice). Varios jorros da MESMA receita convivem (2 tochas,
  rastro em N naves; ate 8 por efeito; religar no mesmo alvo nao duplica). O
  defineEmitter aceita curve: 'linear'|'suave'|'pulso'|'fogo' (curva de vida
  assada numa textura; 'fogo' + glow nasce luz pura e morre fumaca — o
  additiveOverLife do curso).
- Telas/HUD: setScreenText('menu'|'pausa'|'carregando'|'fim'|'vitoria',
  titulo, texto, botao); createScreen('nome', titulo, texto);
  addButton('tela', 'rotulo', function () {}); showScreen('nome');
  hideScreens(); setHud('top-left'|'top-center'|'top-right'|'bottom-left'|
  'bottom-right', texto) — texto vazio apaga.
- Estados do jogo: setState('jogando'); onEnterState('estado', function ()
  {}); stateIs('estado'); state(); returnToMenu(); endGame(). Entrar em
  'jogando' fora da pausa RECOMEÇA a arena (recolhe todas as entidades).
- Avisos: on('nome', function () {}); emit('nome').
- Som: loadSound('nome', 'asset'); playSound('nome'); playEffect('coin'|
  'hit'|'explosion'|'jump'|'laser'|'hurt'|'powerup'|'win'|'gameover'|
  'click'); playTone(hz, ms).

Quando ajudar o aluno com o Jogo 3D Avançado:
- A partida se monta dentro de onEnterState('jogando') — nascer o herói com
  const, espalhar enfeites, ligar fábricas, zerar pontos.
- Cérebro de torre: 'parado' acha o alvo (nearest + exists + touches) e vai
  para 'mirar'; 'mirar' usa aimAt e isAimingAt e vai para 'atirar'; ao entrar
  em 'atirar' usa spawnFrom + moveForward no tiro e vai para 'recarregar';
  stateTimer volta para 'parado'.
- Nunca crie moldes ou ganchos dentro do onUpdate; registre tudo uma vez, no
  topo, e chame start() por último.
- Não misture com as outras extensões de jogo no mesmo projeto.
`
