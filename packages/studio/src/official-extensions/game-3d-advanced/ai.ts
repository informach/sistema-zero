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
  part({shape: 'box'|'sphere'|'cylinder'|'cone', color, w, h, d, x, y, z}) —
  o part SÓ funciona dentro do defineMold.
- Enxames: spawn('molde', x, y, z) devolve a entidade (use const nome = ...
  para apelidar); spawnFrom('molde', ent) nasce no lugar e virado igual (o
  tiro da torre); startSpawner('molde', segundos, 'edge'|'anywhere');
  stopSpawner('molde'); forEachAlive('molde', function (item) {});
  countAlive('molde'); recycle(ent); recycleAll('molde'); cullFar('molde', d).
- Laço/teclas: onUpdate(function (dt) {}) — roda só no estado 'jogando';
  moveWithKeys(ent, velocidade) — WASD/setas no chão, dt embutido;
  keyDown('w'); keyPressed('j'); setPauseKey('Escape').
- Câmera: cameraFollow(ent, dist, altura); cameraOrbit(dist); cameraTop(alt).
- Entidades: place(ent, x, y, z); setYaw(ent, graus); setVelocity(ent, x, y,
  z); setDrag(ent, n); lookAt(a, b); moveForward(ent, vel); posOf(ent,
  'x'|'y'|'z'); exists(ent) — sempre pergunte antes de usar um alvo guardado.
- FSM por entidade (o coração): toda entidade nasce no estado 'parado'.
  onEnterEntityState('molde', 'estado', function (ela) {});
  onEntityStateUpdate('molde', 'estado', function (ela, dt) {});
  onExitEntityState('molde', 'estado', function (ela) {});
  setEntityState(ent, 'estado') — idempotente; entityStateIs(ent, 'estado');
  stateTimer('molde', 'estado', segundos, 'proximo') — transição por tempo.
- Comportamentos: seek(quem, alvo) — persegue com a velocidade do molde;
  aimAt(quem, alvo, suavidade) — giro suave de torre (slerp);
  faceVelocity(ent); isAimingAt(a, b) — hora de atirar.
- Vizinhança (grade espacial): forEachNear(ent, 'molde', raio, function
  (vizinho) {}); const alvo = nearest('molde', ent); touches(a, b, dist).
- Combate: hurt(ent, dano) — i-frames de 0.5s embutidos; healthOf(ent);
  onEntityDeath('molde', function (ela) {}) — recolhe sozinho depois.
- Faíscas 3D (partículas data-driven): defineEffect('nome', {count, colorFrom,
  colorTo, spread, sizeFrom, sizeTo, life, gravity}); burstAt('nome', x, y, z);
  burstOn('nome', ent) — combine com onEntityDeath.
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
