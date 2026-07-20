import { buildProjectRunContextRuntime } from '#extensions'
import { gameTwoDArcadeKitsRuntime } from './runtime/arcadeKits'
import { gameTwoDAudioRuntime } from './runtime/audio'
import { gameTwoDCasualKitsRuntime } from './runtime/casualKits'
import { gameTwoDInputAndMotionRuntime } from './runtime/inputAndMotion'
import { gameTwoDLifecycleRuntime } from './runtime/lifecycle'
import { gameTwoDPhysicsRuntime } from './runtime/physics'
import { gameTwoDSpritesRuntime } from './runtime/sprites'
import { gameTwoDStageRuntime } from './runtime/stage'
import { gameTwoDUtilitiesRuntime } from './runtime/utilities'
import { gameTwoDWorldRuntime } from './runtime/world'

/**
 * Runtime didático injetado no <head> do iframe quando a extensão "game-2d"
 * está instalada. Expõe `window.SZGame2D` com helpers simples.
 *
 * É intencionalmente legível — o aluno pode abrir o modo Código, ver
 * `SZGame2D.createSprite(...)` no script.js e seguir o link mental até esta
 * função.
 */
export const gameTwoDRuntime =
  buildProjectRunContextRuntime() +
  '\n' +
  `(function () {
  // Estado interno: lista de teclas pressionadas.
  var keys = { left: false, right: false, up: false, down: false };
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
  });

  // Cada domínio é dono do próprio estado de partida. O restart e a pausa apenas
  // orquestram estes hooks; adicionar um domínio novo não exige editar um reset
  // central distante.
  var _runtimeDomains = Object.create(null);
  var _runtimeDomainOrder = [];
  function _registerRuntimeDomain(name, hooks) {
    if (!_runtimeDomains[name]) _runtimeDomainOrder.push(name);
    _runtimeDomains[name] = hooks || {};
  }
  function _runRuntimeDomainHook(hookName) {
    var domains = _runtimeDomainOrder.slice();
    for (var i = 0; i < domains.length; i++) {
      var hooks = _runtimeDomains[domains[i]];
      var hook = hooks && hooks[hookName];
      if (typeof hook === 'function') hook();
    }
  }
  function _resetRuntimeDomains() { _runRuntimeDomainHook('reset'); }
  function _pauseRuntimeDomains() { _runRuntimeDomainHook('pause'); }
  function _resumeRuntimeDomains() { _runRuntimeDomainHook('resume'); }

  // Relógio monotônico da PARTIDA: o tempo de parede continua andando, mas todo
  // período pausado é descontado. Animações, cooldowns e temporizadores usam now().
  var _gameClockPausedAt = null;
  var _gameClockPausedDuration = 0;
  function _wallNow() {
    try {
      return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    } catch (error) { return Date.now(); }
  }
  function now() {
    var wall = _wallNow();
    var currentPause = _gameClockPausedAt === null ? 0 : wall - _gameClockPausedAt;
    return wall - _gameClockPausedDuration - currentPause;
  }
  function _pauseGameClock() {
    if (_gameClockPausedAt === null) _gameClockPausedAt = _wallNow();
  }
  function _resumeGameClock() {
    if (_gameClockPausedAt === null) return;
    _gameClockPausedDuration += Math.max(0, _wallNow() - _gameClockPausedAt);
    _gameClockPausedAt = null;
  }
  function _resetGameClock() {
    _gameClockPausedAt = null;
    _gameClockPausedDuration = 0;
  }

` +
  gameTwoDSpritesRuntime +
  gameTwoDLifecycleRuntime +
  gameTwoDPhysicsRuntime +
  gameTwoDAudioRuntime +
  gameTwoDInputAndMotionRuntime +
  gameTwoDWorldRuntime +
  gameTwoDArcadeKitsRuntime +
  gameTwoDStageRuntime +
  gameTwoDCasualKitsRuntime +
  gameTwoDUtilitiesRuntime +
  `  window.SZGame2D = {
    createSprite: createSprite,
    drawSprite: _camWrap(drawSprite),
    clear: clear,
    fitScreen: fitScreen,
    setupStage: setupStage,
    setupStageFull: setupStageFull,
    spawnBullet: spawnBullet,
    arrowsX: arrowsX,
    blink: blink,
    isColliding: isColliding,
    onStart: onStart,
    gameLoop: gameLoop,
    keys: keys,
    setGravity: setGravity,
    applyVelocity: applyVelocity,
    bounceOnEdges: bounceOnEdges,
    circleCollides: circleCollides,
    playSound: playSound,
    playFx: playFx,
    playMusic: playMusic,
    stopMusic: stopMusic,
    playNote: playNote,
    // Genéricos Tier 1 (v0.15.0): mira/contas, vida/tempo, aparência, mundo, pausa.
    distance: distance,
    angleTo: angleTo,
    aimAt: aimAt,
    moveToward: moveToward,
    randomBetween: randomBetween,
    randomChance: randomChance,
    setHealth: setHealth,
    changeHealth: changeHealth,
    getHealth: getHealth,
    getMaxHealth: getMaxHealth,
    healthDepleted: healthDepleted,
    damageSprite: damageSprite,
    spriteX: spriteX,
    spriteY: spriteY,
    spriteW: spriteW,
    spriteH: spriteH,
    centerX: centerX,
    centerY: centerY,
    spriteVx: spriteVx,
    spriteVy: spriteVy,
    spriteSpeed: spriteSpeed,
    isMoving: isMoving,
    isMovingH: isMovingH,
    isMovingV: isMovingV,
    randomX: randomX,
    randomY: randomY,
    hasHealth: hasHealth,
    cooldownReady: cooldownReady,
    pruneOld: pruneOld,
    flipSprite: flipSprite,
    setOpacity: setOpacity,
    setSize: setSize,
    scaleSprite: scaleSprite,
    wrapEdges: wrapEdges,
    pauseGame: pauseGame,
    resumeGame: resumeGame,
    isPaused: isPaused,
    // Genéricos Tier 2 (v0.16.0): câmera, mapa destrutível, ordem de desenho, depuração.
    cameraFollow: cameraFollow,
    setCamera: setCamera,
    cameraX: cameraX,
    cameraY: cameraY,
    setTileAtSprite: setTileAtSprite,
    breakTileAtSprite: breakTileAtSprite,
    tileAtSprite: tileAtSprite,
    bringToFront: bringToFront,
    sendToBack: sendToBack,
    drawHitbox: drawHitbox,
    showFps: showFps,
    onPointer: onPointer,
    onKey: onKey,
    onOverlap: onOverlap,
    keyDown: keyDown,
    touches: touches,
    pointer: pointer,
    // Imagens / spritesheet / animação (v0.3.0).
    loadImage: loadImage,
    loadSpriteSheet: loadSpriteSheet,
    setImage: setImage,
    setAnimation: setAnimation,
    drawFrame: drawFrame,
    // Animação por estado + flip automático (v0.22.0).
    setStateAnimation: setStateAnimation,
    autoAnimate: autoAnimate,
    // Figuras: sprite desenhado por código (v0.23.0).
    defineShape: defineShape,
    setShape: setShape,
    createShapeSprite: createShapeSprite,
    shapeW: shapeW,
    shapeH: shapeH,
    paintRect: paintRect,
    paintCircle: paintCircle,
    paintEllipse: paintEllipse,
    paintTriangle: paintTriangle,
    paintLine: paintLine,
    // Movimento + efeitos (v0.4.0).
    platformer: platformer,
    topDown: topDown,
    followPointer: followPointer,
    clampToScreen: clampToScreen,
    flash: flash,
    shake: shake,
    emitParticles: emitParticles,
    drawParticles: _camWrap(drawParticles),
    // Tiles / tilemaps (v0.5.0).
    createTileMap: createTileMap,
    createTileMapFromAsset: createTileMapFromAsset,
    drawTileMap: _camWrap(drawTileMap),
    collideTileMap: collideTileMap,
    collideGroup: collideGroup,
    collideSprite: collideSprite,
    tileAt: tileAt,
    // Grupos de sprites + temporizadores (v0.6.0).
    createGroup: createGroup,
    spawn: spawn,
    updateGroup: updateGroup,
    updateGroupNoGravity: updateGroupNoGravity,
    drawGroup: _camWrap(drawGroup),
    forEachInGroup: forEachInGroup,
    countGroup: countGroup,
    clearGroup: clearGroup,
    removeFromGroup: removeFromGroup,
    pruneOffscreen: pruneOffscreen,
    overlapGroups: overlapGroups,
    everyFrames: everyFrames,
    everySeconds: everySeconds,
    // HUD + estado/cenas (v0.6.0).
    drawScore: drawScore,
    drawLabel: drawLabel,
    drawHearts: drawHearts,
    drawBar: drawBar,
    drawSpriteHealth: drawSpriteHealth,
    setStageDescription: setStageDescription,
    setScene: setScene,
    getScene: getScene,
    sceneIs: sceneIs,
    showScreen: showScreen,
    restart: restart,
    drawStarfield: drawStarfield,
    dragX: dragX,
    // Kit Nave & Asteroides (v0.7.0).
    createShip: createShip,
    spawnAsteroid: spawnAsteroid,
    explodeSprite: explodeSprite,
    playShoot: playShoot,
    playExplosion: playExplosion,
    overlapSpriteGroup: overlapSpriteGroup,
    // Tipos de inimigo (v0.22.0).
    createEnemyType: createEnemyType,
    setEnemyStateAnimation: setEnemyStateAnimation,
    setEnemyTypeParam: setEnemyTypeParam,
    spawnEnemy: spawnEnemy,
    updateEnemyType: updateEnemyType,
    drawEnemyType: _camWrap(drawEnemyType),
    onEnemyDefeated: onEnemyDefeated,
    overlapEnemyShots: overlapEnemyShots,
    enemyDamage: enemyDamage,
    hurtByEnemy: hurtByEnemy,
    // Nave clássica: girar + impulsionar na direção apontada (v0.10.0).
    rotateSprite: rotateSprite,
    pointSprite: pointSprite,
    thrust: thrust,
    applyFriction: applyFriction,
    steerThrust: steerThrust,
    spriteAngleDeg: spriteAngleDeg,
    shootFrom: shootFrom,
    spawnAsteroidFromEdge: spawnAsteroidFromEdge,
    // Pulo genérico + Kit dino (v0.9.0).
    jumpOnGround: jumpOnGround,
    createDino: createDino,
    controlDino: controlDino,
    spawnObstacle: spawnObstacle,
    spawnEgg: spawnEgg,
    drawForest: drawForest,
    playJump: playJump,
    playDinoHurt: playDinoHurt,
    playCollect: playCollect,
    // Kit gorilas: batalha de bananas (v0.11.0).
    createCity: createCity,
    drawCity: drawCity,
    placeThrower: placeThrower,
    newWind: newWind,
    drawWind: drawWind,
    aimDrag: aimDrag,
    aimReleased: aimReleased,
    throwBanana: throwBanana,
    updateBanana: updateBanana,
    drawBanana: drawBanana,
    bananaHitThrower: bananaHitThrower,
    bananaHitCity: bananaHitCity,
    playWhistle: playWhistle,
    computerTurn: computerTurn,
    drawAimReadout: drawAimReadout,
    // Kit equilibrista (Stick Hero) (v0.13.0).
    createStickHero: createStickHero,
    updateStickHero: updateStickHero,
    stickHeroScore: stickHeroScore,
    stickHeroOver: stickHeroOver,
    restartStickHero: restartStickHero,
    // Kit balão (Hot-Air-Balloon) (v0.13.0).
    createBalloon: createBalloon,
    updateBalloon: updateBalloon,
    balloonScore: balloonScore,
    balloonFuel: balloonFuel,
    balloonOver: balloonOver,
    restartBalloon: restartBalloon
  };
})();`
