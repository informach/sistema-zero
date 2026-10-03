/**
 * What ships is the code alone. The comments and the indentation below are for whoever
 * reads this file; in the preview they were bytes in every document a child opens, and
 * the document of the largest game has a size budget (e2e/reino-zero-performance).
 * Safe here because no string in this runtime spans lines.
 */
const lean = (source: string): string =>
  source
    .split('\n')
    .map((line) => line.trimStart())
    .filter((line) => line !== '' && !line.startsWith('//'))
    .join('\n')

/** Self-contained JS, injected once inside each engine. No dependency on entities/physics. */
export const sceneTwoDSource = `
/**
 * @param {import('../scene-2d/host').SceneHost} host
 * @returns {import('../scene-2d/contract').SceneTwoDApi & { reset(): void }}
 */
function createScene2D(host) {
  var layers = new Map(), tracks = new Map(), warnings = new Set(), sequence = 0;
  // Rebuild draw lists only when the set of layers or their order changes.
  var backLayers = [], frontLayers = [], stale = true;
  // The second budget is for the creator-in-a-loop warning: a game that already
  // spent the first one on mistyped names must still hear about it.
  function warn(message, reserved) {
    if (warnings.has(message)) return;
    if (warnings.size < (reserved ? 128 : 64)) { warnings.add(message); host.warn(message); }
  }
  // Number.isFinite is false for anything that is not a number: no typeof needed.
  function finite(values) { return values.every(Number.isFinite); }
  // Names and ids are text, but a loop counter is the natural id for a child: accept it.
  // Spaces around a name are never meant: the list of names offers it without them.
  function key(value) {
    if (Number.isFinite(value)) value = String(value);
    if (typeof value !== 'string') return '';
    value = value.trim();
    return value.length > 0 && value.length <= 200 ? value : '';
  }
  function layer(name) {
    var value = layers.get(key(name));
    if (!value) warn('A camada “' + String(name) + '” ainda não existe. Use antes o bloco “Adicionar cenário”.');
    return value;
  }
  function track(name) {
    var value = tracks.get(key(name));
    if (!value) warn('A pista “' + String(name) + '” ainda não existe. Use antes o bloco “Criar pista para o fundo”.');
    return value;
  }
  // A creator placed in the frame loop silently restarts its record sixty times a
  // second: the track never advances and the layer forgets its position. Ninety
  // rebuilds in a row, each right after the previous one, is that mistake; a restart
  // key held down for a moment is not.
  function rebuilt(old, message) {
    var now = Date.now();
    var streak = old && now - old.born < 120 ? old.streak + 1 : 0;
    if (streak === 90) warn(message, true);
    return { born: now, streak: streak };
  }
  function repeatMode(value) {
    return value === 'x' || value === 'y' || value === 'both' ? value : value === 'none' ? 'none' : '';
  }
  function byOrder(a, b) { return a.order - b.order || a.sequence - b.sequence; }

  function layersOf(pass) {
    if (stale) {
      backLayers.length = 0; frontLayers.length = 0;
      layers.forEach(function (l) { (l.pass === 'front' ? frontLayers : backLayers).push(l); });
      backLayers.sort(byOrder); frontLayers.sort(byOrder);
      stale = false;
    }
    return pass === 'front' ? frontLayers : backLayers;
  }
  function projection(t, x, z) {
    var distance = z - t.z + t.follow;
    if (!finite([x, z, distance]) || distance < t.near || distance > t.far) return null;
    var scale = t.focal / distance;
    var screenX = host.width() / 2 + (x - t.x) * scale;
    var screenY = host.height() * t.horizon / 100 + t.height * scale;
    return finite([screenX, screenY, scale]) ? { x: screenX, y: screenY, scale: scale } : null;
  }
  function withScreen(draw) {
    var ctx = host.context();
    if (!ctx) return;
    ctx.save();
    try { host.screen(ctx); draw(ctx); } finally { ctx.restore(); }
  }
  var api = {
    reset: function () {
      layers.clear(); tracks.clear(); warnings.clear(); sequence = 0; stale = true;

    },
    createSceneLayer: function (name, image, pass) {
      var id = key(name), source = key(image);
      if (!id || !source || (pass !== 'back' && pass !== 'front')) { warn('“Adicionar cenário” precisa de um nome, de uma imagem do projeto e do plano fundo ou frente.'); return; }
      var old = layers.get(id);
      if (!old && layers.size >= 64) { warn('Só cabem 64 camadas. Reduza a quantidade de cenários.'); return; }
      var life = rebuilt(old, '“Adicionar cenário” está rodando a cada quadro e a camada “' + id + '” volta ao começo toda vez. Deixe esse bloco em “Ao iniciar”.');
      layers.set(id, { name: id, image: source, pass: pass, x: 0, y: 0, scale: 1, opacity: 1,
        space: 'screen', fx: 1, fy: 1, repeat: 'none', order: 0, visible: true,
        sequence: old ? old.sequence : sequence++, born: life.born, streak: life.streak });
      stale = true;
      host.image(source);
    },
    transformSceneLayer: function (name, x, y, scale, opacity) {
      var l = layer(name); if (!l) return;
      if (!finite([x, y, scale, opacity]) || scale <= 0) { warn('O cenário precisa de posição e tamanho finitos, com tamanho maior que zero.'); return; }
      // A fade that counts past the end (0.9999… + 0.1) still means "fully visible".
      l.x = x; l.y = y; l.scale = scale; l.opacity = Math.max(0, Math.min(1, opacity));
    },
    motionSceneLayer: function (name, space, fx, fy, repeat) {
      var l = layer(name); if (!l) return;
      var mode = repeatMode(repeat);
      if (['screen', 'world', 'parallax'].indexOf(space) < 0 || !finite([fx, fy]) || !mode) { warn('Escolha como o cenário acompanha o jogador e como sua imagem se repete.'); return; }
      l.space = space; l.fx = fx; l.fy = fy; l.repeat = mode;
    },
    orderSceneLayer: function (name, order) {
      var l = layer(name); if (!l) return;
      if (!finite([order])) { warn('A posição do cenário na composição precisa ser um número finito.'); return; }
      l.order = order; stale = true;
    },
    drawSceneLayers: function (pass) {
      if (pass !== 'back' && pass !== 'front') return;
      var list = layersOf(pass);
      if (!list.length && pass === 'front') return;
      withScreen(function (ctx) {
        var cam = host.camera(), width = host.width(), height = host.height();
        for (var index = 0; index < list.length; index++) {
          var l = list[index];
          if (!l.visible || l.opacity === 0) continue;
          var img = host.image(l.image); if (!img) continue;
          var w = (img.naturalWidth || img.width) * l.scale, h = (img.naturalHeight || img.height) * l.scale;
          if (!finite([w, h]) || w <= 0 || h <= 0) continue;
          var x = l.x, y = l.y;
          if (l.space !== 'screen') { x -= cam.x * (l.space === 'world' ? 1 : l.fx); y -= cam.y * (l.space === 'world' ? 1 : l.fy); }
          if (!finite([x, y])) { warn('A posição da camada “' + l.name + '” passou do limite dos números. Confira os fatores e a câmera.'); continue; }
          var acrossX = l.repeat === 'x' || l.repeat === 'both', acrossY = l.repeat === 'y' || l.repeat === 'both';
          var cols = 1, rows = 1;
          // An aligned copy already covers the edge: start one image back only when shifted.
          if (acrossX) { x = ((x % w) + w) % w; if (x > 0) x -= w; cols = Math.ceil((width - x) / w); }
          if (acrossY) { y = ((y % h) + h) % h; if (y > 0) y -= h; rows = Math.ceil((height - y) / h); }
          if (cols * rows > 4096) { warn('A camada “' + l.name + '” precisaria de mais de 4096 cópias para cobrir a tela. Use uma imagem maior ou escolha cobrir a tela.'); continue; }
          ctx.save();
          try {
            ctx.globalAlpha *= l.opacity;
            if (host.smoothing) host.smoothing(ctx, img, w);
            for (var row = 0; row < rows; row++) for (var col = 0; col < cols; col++) ctx.drawImage(img, x + col * w, y + row * h, w, h);
          } finally { ctx.restore(); }
        }
      });
    },
    createTrack: function (name, horizon, focal, height, follow) {
      var id = key(name);
      if (!id || !finite([horizon, focal, height, follow]) || horizon < 0 || horizon > 100 || focal <= 0 || height <= 0 || follow <= 0) { warn('Não consegui preparar a vista da pista. Escolha uma das vistas disponíveis.'); return; }
      var old = tracks.get(id);
      if (!old && tracks.size >= 16) { warn('Só cabem 16 pistas ao mesmo tempo.'); return; }
      var life = rebuilt(old, '“Criar pista para o fundo” está rodando a cada quadro e a pista “' + id + '” recomeça vazia toda vez. Deixe esse bloco em “Ao iniciar” ou em uma função chamada só para recomeçar.');
      tracks.set(id, { horizon: horizon, focal: focal, height: height, follow: follow,
        near: 1, far: 10000, x: 0, z: 0, previous: 0, born: life.born, streak: life.streak });
    },
    viewTrack: function (name, near, far) {
      var t = track(name); if (!t) return;
      if (!finite([near, far]) || near <= 0 || far <= near) { warn('Não consegui ajustar o alcance da pista. Escolha uma das vistas disponíveis.'); return; }
      t.near = near; t.far = far;
    },
    cameraTrack: function (name, x, z) {
      var t = track(name); if (!t) return;
      if (!finite([x, z])) { warn('A posição da pista precisa de números finitos. Confira a lateral e a distância.'); return; }
      t.x = x;
      // Placing the camera where it already is must not erase the step just taken:
      // advancing and then setting the camera to the same distance still finds what
      // was crossed. A different distance is a jump, and a jump crosses nothing.
      if (z !== t.z) { t.z = z; t.previous = z; }
    },
    advanceTrack: function (name, distance) {
      var t = track(name); if (!t) return;
      if (!finite([distance, t.z + distance])) { warn('A distância da pista passou do limite dos números. Reduza a velocidade ou a distância.'); return; }
      t.previous = t.z; t.z += distance;
    },
    projectTrack: function (name, x, z, property) {
      var t = track(name), p = t && projection(t, x, z);
      if (!p) return 0;
      return property === 'visible' ? 1 : property === 'x' ? p.x : property === 'y' ? p.y : property === 'scale' ? p.scale : 0;
    },

  };
  return api;
}
`

/** What the basic engine (Jogo 2D) lends to the scene. */
export const basicSceneHost = `
  var _sceneVector = new WeakMap();
  var _scene2d = createScene2D({
    context: ensureStage, width: stageWidth, height: stageHeight,
    image: function (name) { var h = loadImage(name); return h && h.loaded ? h.img : null; },
    camera: function () { return camera; },
    screen: function (ctx) { ctx.setTransform(ctx.canvas.width / stageW(ctx), 0, 0, ctx.canvas.height / stageH(ctx), 0, 0); },
    // The same rule as sprites and the fixed backdrop: pixel art enlarged stays sharp,
    // a reduced image (or a vector one) is smoothed. Set inside the scene's own
    // save/restore, so the stage gets its previous setting back.
    smoothing: function (ctx, img, width) {
      // Asked once per image: the test reads the whole address, and a drawing from
      // the project is a long data address.
      var vector = _sceneVector.get(img);
      if (vector === undefined) { vector = _isVectorImage(img); _sceneVector.set(img, vector); }
      var source = vector ? 0 : (img.naturalWidth || img.width || 0);
      try { ctx.imageSmoothingEnabled = !(source > 0 && width * _deviceScale(ctx) >= source); } catch (e) {}
    },
    warn: function (message) { console.warn('[Jogo 2D] ' + message); }
  });
  _registerRuntimeDomain('scene-2d', { reset: _scene2d.reset });
`

/** What the advanced engine (Jogo 2D Avançado) lends to the scene. */
export const advancedSceneHost = `
  var _sceneCamera = { x: 0, y: 0 };
  var _scene2d = createScene2D({
    context: function () { return ctx2d; }, width: function () { return config.w; }, height: function () { return config.h; },
    image: function (name) {
      ensureImageLoaded(name);
      var h = images[name];
      if (!h && !resolveAsset(name)) warnOnce('scene-img:' + name, 'a imagem "' + name + '" não está no projeto. Confira o nome em "Imagens" (maiúsculas e espaços contam).');
      return h && h.loaded ? h.img : null;
    },
    // Whole pixels, like the world the engine draws: a raw camera made a layer that
    // follows the world shimmer against it by half a pixel.
    camera: function () {
      _sceneCamera.x = camera.on ? Math.round(camera.x) : 0;
      _sceneCamera.y = camera.on ? Math.round(camera.y) : 0;
      return _sceneCamera;
    },
    screen: function (ctx) { ctx.setTransform(ctx.canvas.width / config.w, 0, 0, ctx.canvas.height / config.h, 0, 0); },
    // The whole canvas runs with smoothing off (sharp pixel art). A large image
    // reduced looks jagged that way, so smoothing returns just for it.
    smoothing: function (ctx, img, width) {
      try { ctx.imageSmoothingEnabled = width < (img.naturalWidth || img.width || 0); } catch (e) {}
    },
    warn: function (message) { warnOnce('scene:' + message, message); }
  });
  _registerRuntimeDomain('scene-2d', { resetProject: _scene2d.reset });
`

// The three literals above stay plain (opened and closed on lines of their own) so
// that the template guards of both engines can scan them. What the engines
// inject is derived here, and exported as a list for the same reason.
const sceneTwoDRuntime = lean(sceneTwoDSource)
const basicSceneAdapter = [sceneTwoDRuntime, lean(basicSceneHost), ''].join('\n')
const advancedSceneAdapter = [sceneTwoDRuntime, lean(advancedSceneHost), ''].join('\n')

export { advancedSceneAdapter, basicSceneAdapter, sceneTwoDRuntime }
