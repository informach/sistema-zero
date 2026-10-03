import { spriteSceneRuntime } from './spriteRuntime'

/** Beginner screens and HUD. The advanced engine composes its existing native UI blocks. */
const scenePanelRuntime = `
  function _spriteScenePointerAction(x, y, width, height) {
    var scale = Math.min(width / 640, height / 720);
    var px = (x - (width - 640 * scale) / 2) / scale;
    var py = (y - (height - 720 * scale) / 2) / scale;
    return px >= 520 && px <= 624 && py >= 16 && py <= 90 ? 'pause' : 'start';
  }
  function _drawSpriteScenePanel(ctx, width, height, state, title, instructions, label, score, total, lives, progress, hud, controls) {
    if (!ctx) return;
    var scale = Math.min(width / 640, height / 720);
    ctx.save();
    try {
      ctx.translate((width - 640 * scale) / 2, (height - 720 * scale) / 2); ctx.scale(scale, scale);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      if (hud) {
        ctx.fillStyle = '#123149'; ctx.fillRect(16, 16, 608, 58);
        ctx.fillStyle = '#ffffff'; ctx.font = '20px ' + _szGameUIFont;
        ctx.fillText('VIDAS ' + lives + (label ? '    ' + label.toUpperCase() + ' ' + score + (total ? '/' + total : '') : ''), 30, 51);
        ctx.fillText('II  P', 550, 51);
        ctx.fillStyle = '#82d1dc'; ctx.fillRect(24, 80, 592 * Math.max(0, Math.min(1, progress)), 5);
      }
      var help = controls === 'arrows' ? 'SETAS / A D para virar' : controls === 'pointer' ? 'Arraste na pista' : controls === 'both' ? 'SETAS / A D para virar • Arraste na pista' : '';
      ctx.textAlign = 'center';
      if (help) { ctx.fillStyle = '#24465e'; ctx.font = '16px ' + _szGameUIFont; ctx.fillText(help, 320, 680); }
      if ((title || state === 'paused') && state !== 'playing') {
        ctx.fillStyle = '#0d263c'; ctx.fillRect(52, 238, 536, 222);
        ctx.fillStyle = '#fff0cb'; ctx.font = '28px ' + _szGameUIFont;
        ctx.fillText(state === 'start' ? title : state === 'paused' ? 'JOGO PAUSADO' : state === 'won' ? 'VOCÊ CHEGOU!' : 'VAMOS TENTAR DE NOVO?', 320, 290, 500);
        ctx.fillStyle = '#d9edf3'; ctx.font = '18px ' + _szGameUIFont;
        ctx.fillText(instructions, 320, 340, 500);
        if (state === 'won' || state === 'lost') ctx.fillText(label + ': ' + score + (total ? ' de ' + total : ''), 320, 385, 500);
        ctx.fillStyle = '#ffd18a'; ctx.fillText('ENTER ou TOQUE para continuar', 320, 430);
      }
    } finally { ctx.restore(); }
  }
`
const namedAnimationRuntime = ` 
  function _namedSceneAnimation(image, animation) {
    var meta = Object.prototype.hasOwnProperty.call(ASSET_META, image) && ASSET_META[image].sprite;
    if (!meta || !Array.isArray(meta.animations)) return null;
    var found = meta.animations.find(function (a) { return a.name === animation; });
    return found ? { frameW: meta.frameW, frameH: meta.frameH, animation: found } : null;
  }
`

export const basicSpriteSceneAdapter =
  spriteSceneRuntime +
  scenePanelRuntime +
  namedAnimationRuntime +
  `
  var _spriteScenePainting = false;
  function _spriteSceneState() {
    return _paused ? 'paused' : _scene === 'jogando' ? 'playing' : _scene === 'venceu' || _scene === 'ganhou' ? 'won' : _scene === 'perdeu' ? 'lost' : 'start';
  }
  var _spriteScene = createSpriteScene(/** @type {import('../scene-2d/spriteHostContract').SpriteSceneHost<import('./runtimeContract').GameTwoDSprite>} */ ({
    width: stageWidth, height: stageHeight, context: ensureStage,
    screen: function (ctx) { ctx.setTransform(ctx.canvas.width / stageW(ctx), 0, 0, ctx.canvas.height / stageH(ctx), 0, 0); },
    image: function (name) { var h = loadImage(name); return h && h.loaded ? h.img : null; }, camera: function () { return camera; },
    spriteAlive: function (s) { return !_isDestroyedSprite(s); },
    moldName: function () { return ''; },
    copySprite: function (s) {
      var copy = Object.assign({}, s);
      copy._paintEpoch = -1; copy._paintOrder = 0; copy._cancelImageRedraw = null; copy._hookedHandle = null;
      if (s.anim) copy.anim = Object.assign({}, s.anim);
      if (s.textAppearance) copy.textAppearance = Object.assign({}, s.textAppearance, { lines: s.textAppearance.lines.slice() });
      if (s.data) copy.data = Object.assign({}, s.data);
      var owners = _spriteGroupOwners.get(s);
      if (owners) owners.forEach(function (group) { addToGroup(group, copy); });
      return copy;
    },
    destroySprite: destroySprite,
    drawSprite: function (ctx, s) { _spriteScenePainting = true; try { drawSprite(ctx, s); } finally { _spriteScenePainting = false; } },
    hitbox: _hitboxOf,
    motion: function (s, dx, dz) { s.vx = dx; s.vy = 0; s._sceneForward = Math.abs(dz) > 0.001; if (s.animStates) autoAnimate(s); },
    health: function (s) { return Number.isFinite(s.hp) ? s.hp : 1; },
    setHealth: setHealth,
    hurt: function (s, amount) { s.hp = Math.max(0, (Number.isFinite(s.hp) ? Number(s.hp) : 1) - amount); s.blinkFrames = 21; },
    animate: function (s, image, animation, once) {
      var meta = _namedSceneAnimation(image, animation);
      if (!meta) { warnOnce('scene-animation:' + image + ':' + animation, 'A animação “' + animation + '” não está no desenho “' + image + '”. Escolha uma animação no Pinta ou configure a folha de quadros.'); return; }
      // A guarda de idempotência do setAnimation compara a FOLHA por identidade: uma folha nova a
      // cada quadro recomeçava a animação e o desenho ficava parado no primeiro quadro.
      var current = s.anim && s.anim.sheet;
      var sheet = current && current.assetName === image && current.frameW === meta.frameW && current.frameH === meta.frameH
        ? current : loadSpriteSheet(image, meta.frameW, meta.frameH);
      var a = meta.animation;
      if (once) playAnimationOnce(s, sheet, a.from, a.to, a.fps); else setAnimation(s, sheet, a.from, a.to, a.fps);
    },
    direction: function () { return (keyDown('ArrowRight') || keyDown('d') ? 1 : 0) - (keyDown('ArrowLeft') || keyDown('a') ? 1 : 0); },
    pointer: function () { return pointer; }, state: _spriteSceneState,
    setPaused: function (paused) { if (paused) { pauseGame(); _spriteScene.draw('hud'); } else resumeGame(); },
    setState: function (value) {
      if (value === 'paused') { pauseGame(); _spriteScene.draw('hud'); return; }
      if (_paused) resumeGame();
      setScene(value === 'playing' ? 'jogando' : value === 'won' ? 'venceu' : value === 'lost' ? 'perdeu' : 'inicio');
    },
    restart: function () { restart(); setScene('jogando'); },
    wake: function () { ensureStage(); _ensureDriver(); },
    invoke: function (fn) { _invokeProjectCallback(fn, undefined, []); },
    drawHud: function (title, instructions, label, score, total, lives, progress, hud, controls) {
      var ctx = ensureStage();
      _drawSpriteScenePanel(ctx, stageWidth(), stageHeight(), _spriteSceneState(), title, instructions, label, score, total, lives, progress, hud, controls);
      _announceScreen(_spriteSceneState() === 'start' ? title : _scene, instructions, 'Enter ou toque para continuar. P pausa. R reinicia.');
      if (hud) { _updateAccessibleHud('pista-vidas', 'Vidas: ' + lives); _updateAccessibleHud('pista-pontos', (label || 'Pontos') + ': ' + score); }
    },
    warn: function (message) { warnOnce('sprite-scene:' + message, message); }
  }), _scene2d);
  _registerRuntimeDomain('sprite-scene', { reset: _spriteScene.reset });
`

export const advancedSpriteSceneAdapter =
  spriteSceneRuntime +
  namedAnimationRuntime +
  `
  var _spriteScenePainting = false;
  function _spriteSceneState() {
    return state === 'jogando' ? 'playing' : state === 'pausado' ? 'paused' : state === 'vitoria' ? 'won' : state === 'fim' ? 'lost' : 'start';
  }
  var _spriteScene = createSpriteScene(/** @type {import('../scene-2d/spriteHostContract').SpriteSceneHost<import('./runtimeContract').GameKitEntity>} */ ({
    width: function () { return config.w; }, height: function () { return config.h; }, context: function () { return ctx2d; },
    screen: function (ctx) { ctx.setTransform(ctx.canvas.width / config.w, 0, 0, ctx.canvas.height / config.h, 0, 0); },
    image: function (name) { ensureImageLoaded(name); var h = images[name]; return h && h.loaded ? h.img : null; },
    camera: function () { return { x: camera.on ? camera.x : 0, y: camera.on ? camera.y : 0 }; },
    spriteAlive: function (s) { return s._active !== false; },
    moldName: function (s) { return s._mold || ''; },
    copySprite: function (s) {
      var copy = s._mold ? spawnFromMold(s._mold, s.x, s.y) : {};
      if (!copy) return null;
      Object.assign(copy, s, { _active: true });
      // Each copy owns its per-state setup; shared tables would make one change rewrite them all.
      if (s._stateAnims) copy._stateAnims = Object.assign({}, s._stateAnims);
      if (s._stateLooks) copy._stateLooks = Object.assign({}, s._stateLooks);
      if (s._platFrames) copy._platFrames = Object.assign({}, s._platFrames);
      return copy;
    },
    destroySprite: function (s) { if (s._mold) recycle(s); else s._active = false; },
    drawSprite: function (ctx, s) { _spriteScenePainting = true; try { drawEntity(s); } finally { _spriteScenePainting = false; } },
    hitbox: function (s) { return { x: hbLeft(s), y: hbTop(s), w: hbW(s), h: hbH(s) }; },
    motion: function (s, dx, dz) { s._moving = Math.abs(dx) + Math.abs(dz) > 0.001; },
    health: function (s) { return num(s.health, 1); },
    setHealth: function (s, lives) { s.health = lives; s.maxHealth = lives; },
    hurt: function (s, amount) { s.health = Math.max(0, num(s.health, 1) - amount); s._iFrames = 0.35; trackCombatant(s); },
    animate: function (s, image, animation, once) {
      var meta = _namedSceneAnimation(image, animation);
      if (!meta) { warnOnce('scene-animation:' + image + ':' + animation, 'A animação “' + animation + '” não está no desenho “' + image + '”. Escolha uma animação no Pinta ou configure a folha de quadros.'); return; }
      if (s._sheetImg !== image || s._sheetFw !== meta.frameW || s._sheetFh !== meta.frameH) setSheet(s, image, meta.frameW, meta.frameH);
      var a = meta.animation; if (once) playAnimOnce(s, a.from, a.to, a.fps); else playAnim(s, a.from, a.to, a.fps);
    },
    direction: function () { return (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0); },
    pointer: function () { return { x: mouse.screenX, y: mouse.screenY, down: mouse.down }; }, state: _spriteSceneState,
    setPaused: function (paused) { setState(paused ? 'pausado' : 'jogando'); },
    setState: function (value) { setState(value === 'playing' ? 'jogando' : value === 'paused' ? 'pausado' : value === 'won' ? 'vitoria' : value === 'lost' ? 'fim' : 'menu'); },
    restart: function () { restartGame(); setState('jogando'); }, wake: function () {},
    invoke: function (fn) { fn(); },
    warn: function (message) { warnOnce('sprite-scene:' + message, message); }
  }), _scene2d);
  _registerRuntimeDomain('sprite-scene', { resetProject: _spriteScene.reset });
`
