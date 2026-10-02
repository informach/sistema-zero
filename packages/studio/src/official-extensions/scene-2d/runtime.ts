/** Self-contained JS, injected once inside each engine. No dependency on entities/physics. */
export const sceneTwoDRuntime = `
/**
 * @param {import('../scene-2d/host').SceneHost} host
 * @returns {import('../scene-2d/contract').SceneTwoDApi & { reset(): void }}
 */
function createScene2D(host) {
  var layers = new Map(), tracks = new Map(), warnings = new Set(), sequence = 0;
  // Draw lists are rebuilt only when the set of layers or their order changes, and
  // the list of objects in view is reused from one frame to the next.
  var backLayers = [], frontLayers = [], stale = true, inView = [];
  // What was drawn since the last background pass, kept so that a host without a
  // frame loop can repeat it when an image arrives late. Two flat lists, no objects.
  var drawnKinds = [], drawnNames = [], replaying = false;
  // The second budget is for the creator-in-a-loop warning: a game that already
  // spent the first one on mistyped names must still hear about it.
  function warn(message, reserved) {
    if (warnings.has(message)) return;
    if (warnings.size < (reserved ? 128 : 64)) { warnings.add(message); host.warn(message); }
  }
  function finite(values) { return values.every(function (v) { return typeof v === 'number' && Number.isFinite(v); }); }
  // Names and ids are text, but a loop counter is the natural id for a child: accept it.
  // Spaces around a name are never meant: the list of names offers it without them.
  function key(value) {
    if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
    if (typeof value !== 'string') return '';
    value = value.trim();
    return value.length > 0 && value.length <= 200 ? value : '';
  }
  function layer(name) {
    var value = layers.get(key(name));
    if (!value) warn('A camada “' + String(name) + '” ainda não existe. Use antes o bloco “Criar camada”.');
    return value;
  }
  function track(name) {
    var value = tracks.get(key(name));
    if (!value) warn('A pista “' + String(name) + '” ainda não existe. Use antes o bloco “Criar pista”.');
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
    if (value === true) return 'both';
    return value === 'x' || value === 'y' || value === 'both' ? value : value === false || value === 'none' ? 'none' : '';
  }
  function byOrder(a, b) { return a.order - b.order || a.sequence - b.sequence; }
  function byDepth(a, b) { return b.z - a.z || a.sequence - b.sequence; }
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
  function passed(t, object) {
    return !!object && (t.z > t.previous ? object.z > t.previous && object.z <= t.z :
      t.z < t.previous && object.z < t.previous && object.z >= t.z);
  }
  function withScreen(draw) {
    var ctx = host.context();
    if (!ctx) return;
    ctx.save();
    try { host.screen(ctx); draw(ctx); } finally { ctx.restore(); }
  }
  // kind 0 = a pass of layers, 1 = the objects of a track. A background pass starts
  // the picture over, so the list never grows in a game that draws every frame.
  function remember(kind, name) {
    if (replaying || !host.late) return;
    if (kind === 0 && name === 'back') { drawnKinds.length = 0; drawnNames.length = 0; }
    if (drawnKinds.length < 32) { drawnKinds.push(kind); drawnNames.push(name); }
  }
  function replay() {
    var kinds = drawnKinds.slice(), names = drawnNames.slice();
    replaying = true;
    try {
      for (var index = 0; index < kinds.length; index++) {
        if (kinds[index] === 0) api.drawSceneLayers(names[index]); else api.drawTrack(names[index]);
      }
    } finally { replaying = false; }
  }
  // An image still on its way: the host may call back when it lands.
  function picture(name) {
    var img = host.image(name);
    if (!img && host.late) host.late(name, replay);
    return img;
  }
  var api = {
    reset: function () {
      layers.clear(); tracks.clear(); warnings.clear(); sequence = 0; stale = true;
      inView.length = 0; drawnKinds.length = 0; drawnNames.length = 0;
    },
    createSceneLayer: function (name, image, pass) {
      var id = key(name), source = key(image);
      if (!id || !source || (pass !== 'back' && pass !== 'front')) { warn('“Criar camada” precisa de um nome, de uma imagem do projeto e do plano fundo ou frente.'); return; }
      var old = layers.get(id);
      if (!old && layers.size >= 64) { warn('Só cabem 64 camadas. Tire as que não usa mais com “Remover camada”.'); return; }
      var life = rebuilt(old, '“Criar camada” está rodando a cada quadro e a camada “' + id + '” volta ao começo toda vez. Deixe esse bloco em “Ao iniciar”.');
      layers.set(id, { name: id, image: source, pass: pass, x: 0, y: 0, scale: 1, opacity: 1,
        space: 'screen', fx: 1, fy: 1, repeat: 'none', order: 0, visible: true,
        sequence: old ? old.sequence : sequence++, born: life.born, streak: life.streak });
      stale = true;
      host.image(source);
    },
    transformSceneLayer: function (name, x, y, scale, opacity) {
      var l = layer(name); if (!l) return;
      if (!finite([x, y, scale, opacity]) || scale <= 0 || scale > 100) { warn('No bloco “Camada … em x”, use números, com a escala entre pouco mais que 0 e 100. A opacidade vai de 0 a 1.'); return; }
      // A fade that counts past the end (0.9999… + 0.1) still means "fully visible".
      l.x = x; l.y = y; l.scale = scale; l.opacity = Math.max(0, Math.min(1, opacity));
    },
    motionSceneLayer: function (name, space, fx, fy, repeat) {
      var l = layer(name); if (!l) return;
      var mode = repeatMode(repeat);
      if (['screen', 'world', 'parallax'].indexOf(space) < 0 || !finite([fx, fy]) || !mode) { warn('No bloco “Camada … acompanha”, escolha tela, mundo ou paralaxe, use números nos fatores e escolha como repetir.'); return; }
      l.space = space; l.fx = fx; l.fy = fy; l.repeat = mode;
    },
    orderSceneLayer: function (name, order) {
      var l = layer(name); if (!l) return;
      if (!finite([order])) { warn('No bloco “Ordem da camada”, use um número.'); return; }
      l.order = order; stale = true;
    },
    showSceneLayer: function (name, visible) { var l = layer(name); if (l) l.visible = !!visible; },
    removeSceneLayer: function (name) { if (layers.delete(key(name))) stale = true; },
    drawSceneLayers: function (pass) {
      if (pass !== 'back' && pass !== 'front') return;
      remember(0, pass);
      var list = layersOf(pass);
      if (!list.length && pass === 'front') return;
      withScreen(function (ctx) {
        if (pass === 'back') host.clear(ctx);
        var cam = host.camera(), width = host.width(), height = host.height();
        for (var index = 0; index < list.length; index++) {
          var l = list[index];
          if (!l.visible || l.opacity === 0) continue;
          var img = picture(l.image); if (!img) continue;
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
          if (cols * rows > 4096) { warn('A camada “' + l.name + '” precisaria de mais de 4096 cópias para cobrir a tela. Aumente a escala ou use uma imagem maior.'); continue; }
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
      if (!id || !finite([horizon, focal, height, follow]) || horizon < 0 || horizon > 100 || focal <= 0 || height <= 0 || follow <= 0) { warn('No bloco “Criar pista”, o horizonte vai de 0 a 100 e foco, altura e recuo precisam ser maiores que 0.'); return; }
      var old = tracks.get(id);
      if (!old && tracks.size >= 16) { warn('Só cabem 16 pistas ao mesmo tempo.'); return; }
      var life = rebuilt(old, '“Criar pista” está rodando a cada quadro e a pista “' + id + '” recomeça vazia toda vez. Deixe esse bloco em “Ao iniciar” ou em uma função chamada só para recomeçar.');
      tracks.set(id, { horizon: horizon, focal: focal, height: height, follow: follow,
        near: 1, far: 10000, x: 0, z: 0, previous: 0, objects: new Map(), born: life.born, streak: life.streak });
    },
    viewTrack: function (name, near, far) {
      var t = track(name); if (!t) return;
      if (!finite([near, far]) || near <= 0 || far <= near) { warn('No bloco “Pista … mostrar de … até”, o perto precisa ser maior que 0 e o longe maior que o perto.'); return; }
      t.near = near; t.far = far;
    },
    cameraTrack: function (name, x, z) {
      var t = track(name); if (!t) return;
      if (!finite([x, z])) { warn('No bloco “Câmera da pista”, use números no x e no z.'); return; }
      t.x = x;
      // Placing the camera where it already is must not erase the step just taken:
      // advancing and then setting the camera to the same distance still finds what
      // was crossed. A different distance is a jump, and a jump crosses nothing.
      if (z !== t.z) { t.z = z; t.previous = z; }
    },
    advanceTrack: function (name, distance) {
      var t = track(name); if (!t) return;
      if (!finite([distance, t.z + distance])) { warn('No bloco “Avançar na pista”, a distância precisa ser um número.'); return; }
      t.previous = t.z; t.z += distance;
    },
    placeTrackObject: function (name, id, image, x, z, w, h) {
      var t = track(name); if (!t) return;
      var object = key(id), source = key(image);
      if (!object || !source || !finite([x, z, w, h]) || w <= 0 || h <= 0) { warn('No bloco “Na pista … objeto”, confira o nome do objeto e a imagem, e use largura e altura maiores que 0.'); return; }
      var old = t.objects.get(object);
      if (!old && t.objects.size >= 2048) { warn('Só cabem 2048 objetos em cada pista. Tire os que já passaram com “Na pista … remover objeto”.'); return; }
      t.objects.set(object, { image: source, x: x, z: z, w: w, h: h, sequence: old ? old.sequence : sequence++ });
      host.image(source);
    },
    moveTrackObject: function (name, id, x, z) {
      var t = track(name), o = t && t.objects.get(key(id));
      if (!o) return;
      if (!finite([x, z])) { warn('No bloco “Na pista … mover objeto”, use números no x e no z.'); return; }
      o.x = x; o.z = z;
    },
    removeTrackObject: function (name, id) { var t = track(name); if (t) t.objects.delete(key(id)); },
    drawTrack: function (name) {
      var t = track(name); if (!t) return;
      remember(1, name);
      // Cull by distance before sorting: a long course keeps thousands of objects
      // and only a handful are in view.
      inView.length = 0;
      t.objects.forEach(function (o) {
        var distance = o.z - t.z + t.follow;
        if (distance >= t.near && distance <= t.far) inView.push(o);
      });
      if (!inView.length) return;
      inView.sort(byDepth);
      withScreen(function (ctx) {
        for (var index = 0; index < inView.length; index++) {
          var o = inView[index], p = projection(t, o.x, o.z); if (!p) continue;
          var w = o.w * p.scale, h = o.h * p.scale, x = p.x - w / 2, y = p.y - h;
          if (!finite([x, y, w, h]) || w > 32768 || h > 32768 || x > host.width() || x + w < 0 || y > host.height() || y + h < 0) continue;
          var img = picture(o.image); if (!img) continue;
          if (host.smoothing) host.smoothing(ctx, img, w);
          ctx.drawImage(img, x, y, w, h);
        }
      });
      inView.length = 0;
    },
    trackValue: function (name, property) {
      var t = track(name); if (!t) return 0;
      return property === 'distance' ? t.z : property === 'previous' ? t.previous : property === 'x' ? t.x : 0;
    },
    projectTrack: function (name, x, z, property) {
      var t = track(name), p = t && projection(t, x, z);
      if (!p) return 0;
      return property === 'visible' ? 1 : property === 'x' ? p.x : property === 'y' ? p.y : property === 'scale' ? p.scale : 0;
    },
    trackPassed: function (name, id) { var t = track(name); return !!t && passed(t, t.objects.get(key(id))); },
    trackTouching: function (name, id, x, width) {
      var t = track(name), o = t && t.objects.get(key(id));
      if (!t || !o) return false;
      if (!finite([x, width]) || width <= 0) { warn('No bloco “Na pista … encontrou objeto”, o x do jogador precisa ser um número e a largura maior que 0.'); return false; }
      return passed(t, o) && Math.abs(x - o.x) <= (width + o.w) / 2;
    }
  };
  return api;
}
`

export const basicSceneAdapter =
  sceneTwoDRuntime +
  `
  var _sceneLate = Object.create(null);
  var _sceneVector = new WeakMap();
  var _scene2d = createScene2D({
    context: ensureStage, width: stageWidth, height: stageHeight,
    image: function (name) { var h = loadImage(name); return h && h.loaded ? h.img : null; },
    camera: function () { return camera; },
    screen: function (ctx) { ctx.setTransform(ctx.canvas.width / stageW(ctx), 0, 0, ctx.canvas.height / stageH(ctx), 0, 0); },
    clear: clear,
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
    // A scene with no frame loop (the child just dragged the blocks and ran) has
    // nobody to paint it again when the image arrives: repeat the picture once.
    late: function (name, redraw) {
      var h = loadImage(name), img = h && h.img;
      if (!h || !img || h.loaded || h.failed || _sceneLate[name] || typeof img.addEventListener !== 'function') return;
      _sceneLate[name] = true;
      img.addEventListener('load', function () {
        _sceneLate[name] = false;
        if (!_driverHasWork()) redraw();
      });
    },
    warn: function (message) { console.warn('[Jogo 2D] ' + message); }
  });
  _registerRuntimeDomain('scene-2d', { reset: _scene2d.reset });
`

export const advancedSceneAdapter =
  sceneTwoDRuntime +
  `
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
    clear: function (ctx) {
      // A map or a campaign stage is painted by the engine BEFORE the child's
      // drawing. Wiping here would erase the stage, the enemies and the hero.
      var map = rpg.maps[rpg.currentMap];
      if (proCampaign.active || (map && typeof map.draw === 'function' && !map.empty)) {
        warnOnce('scene-over-world', 'este jogo tem um mapa ou uma fase que o motor desenha antes do seu desenho. Por isso as camadas do fundo não limpam a tela aqui e aparecem por cima dele. Para enfeitar por cima, prefira as camadas da frente.');
        return;
      }
      ctx.clearRect(0, 0, config.w, config.h); ctx.fillStyle = config.bg; ctx.fillRect(0, 0, config.w, config.h); _paintBackdrop(_backdropName, 0, 0);
    },
    // The whole canvas runs with smoothing off (sharp pixel art). A large image
    // reduced looks jagged that way, so smoothing returns just for it.
    smoothing: function (ctx, img, width) {
      try { ctx.imageSmoothingEnabled = width < (img.naturalWidth || img.width || 0); } catch (e) {}
    },
    warn: function (message) { warnOnce('scene:' + message, message); }
  });
  _registerRuntimeDomain('scene-2d', { resetProject: _scene2d.reset });
`
