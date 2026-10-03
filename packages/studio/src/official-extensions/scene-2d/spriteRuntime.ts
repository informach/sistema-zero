/** Injected in both engines. Geometry belongs to the track; appearance to the sprite. */
export const spriteSceneRuntime = `
/**
 * @template {import('./spriteContract').SceneSprite} T
 * @param {import('./spriteHostContract').SpriteSceneHost<T>} host
 * @param {import('./contract').SceneTwoDApi} scene
 * @returns {import('./spriteContract').SpriteSceneController}
 */
function createSpriteScene(host, scene) {
  var tracks = new Map(), bindings = new Map(), families = new Map(), backdrops = new Map(), warnings = new Set();
  var failedHandlers = new WeakSet();
  var current = null, generation = 0, sequence = 0, screens = null, decorations = new Map(), worldPainted = false, hudInput = false;
  function warn(message) { if (!warnings.has(message) && warnings.size < 64) { warnings.add(message); host.warn(message); } }
  function key(name) { return typeof name === 'string' ? name.trim() : ''; }
  function finite(values) { return values.every(Number.isFinite); }
  function track(name) {
    var t = tracks.get(key(name));
    if (!t) warn('A pista “' + String(name) + '” ainda não existe. Use “Criar pista para o fundo”.');
    return t;
  }
  function validSprite(s) { return !!s && finite([s.x, s.y, s.w, s.h]) && s.w > 0 && s.h > 0 && host.spriteAlive(s); }
  function alive(b) { return !b.removed && host.spriteAlive(b.sprite); }
  function center(s) { return s.x + s.w / 2; }
  function family(sprite) { var b = bindings.get(sprite); return families.get(sprite) || (b ? new Set([b]) : null); }
  function detach(b) {
    b.removed = true; b.track.items.delete(b.sprite); bindings.delete(b.sprite); decorations.delete(b.sprite);
    var group = families.get(b.source);
    if (group) { group.delete(b); if (!group.size) families.delete(b.source); }
    if (b.track.player === b.sprite) b.track.player = null;
  }
  function invoke(fn, sprite) {
    if (failedHandlers.has(fn)) return;
    var gen = generation;
    try { host.invoke(function () { fn(sprite); }); }
    catch (error) {
      if (gen !== generation) throw error;
      failedHandlers.add(fn); warn('Parei um evento da pista porque aconteceu um erro: ' + String(error));
    }
  }
  function place(t, s, x, z, source) {
    if (!validSprite(s) || !finite([x, z])) { warn('Escolha um sprite criado e use números na posição e na distância da pista.'); return null; }
    var old = bindings.get(s);
    if (!t.items.has(s) && t.items.size >= 2048) { warn('A pista já tem 2048 sprites. Reduza a quantidade de cópias.'); return null; }
    var followed = old && old.track === t && t.player === s;
    if (old) detach(old);
    s.x = x - s.w / 2; s.y = z;
    var b = { sprite: s, source: source || (old && old.source) || s, track: t, vx: old ? old.vx : 0, vz: old ? old.vz : 0, previousX: x, previousZ: z,
      removed: false, sequence: old ? old.sequence : sequence++ };
    bindings.set(s, b); t.items.set(s, b);
    var group = families.get(b.source); if (!group) { group = new Set(); families.set(b.source, group); }
    group.add(b);
    if (followed) { t.player = s; t.distance = Math.max(0, z); scene.cameraTrack(t.name, x * 0.2, t.distance); }
    return b;
  }
  function remove(b) {
    api.release(b.sprite);
    host.destroySprite(b.sprite);
  }
  function configureView(t, view) {
    var distance = t.distance, x = t.player ? center(t.player) * 0.2 : 0;
    var focal = host.width() * (view === 'wide' ? 0.375 : 0.46875);
    scene.createTrack(t.name, view === 'high' ? 22 : 28, focal, host.height() * (view === 'high' ? 0.3 : 2 / 9), 120);
    scene.viewTrack(t.name, 20, 2600); scene.cameraTrack(t.name, x, distance);
  }
  function forLive(t, visit) {
    t.items.forEach(function (b) {
      if (alive(b)) visit(b);
      else api.release(b.sprite);
    });
  }
  function projectedBounds(b) {
    var s = b.sprite, name = b.track.name;
    if (!alive(b) || !scene.projectTrack(name, center(s), s.y, 'visible')) return null;
    var x = scene.projectTrack(name, center(s), s.y, 'x'), y = scene.projectTrack(name, center(s), s.y, 'y');
    var scale = scene.projectTrack(name, center(s), s.y, 'scale'), w = s.w * scale, h = s.h * scale;
    return finite([x, y, w, h]) && w <= 32768 && h <= 32768 ? { x: x - w / 2, y: y - h, w: w, h: h } : null;
  }
  function outside(box, margin) {
    return box.x + box.w < -margin || box.x > host.width() + margin || box.y + box.h < -margin || box.y > host.height() + margin;
  }
  function stepTrack(t, dt) {
    if (t.player && !host.spriteAlive(t.player)) { api.release(t.player); t.player = null; }
    var player = t.player, before = t.distance, px = player ? center(player) : 0, gen = generation, initialState = host.state();
    var binding = bindings.get(player), oldPlayerBox = player ? host.hitbox(player) : { x: 0, w: 0 };
    var oldPlayerCenter = oldPlayerBox.x + oldPlayerBox.w / 2;
    var nextDistance = Math.max(0, Math.min(t.finish || Infinity, before + (t.finished ? 0 : t.speed + (binding ? binding.vz : 0)) * dt));
    if (!Number.isFinite(nextDistance)) { warn('A velocidade da pista passou do limite. Use um número menor.'); return; }
    t.distance = nextDistance;
    var lateral = (t.input === 'arrows' || t.input === 'both' ? host.direction() * t.controlSpeed : 0) + (binding ? binding.vx : 0);
    var pointer = host.pointer();
    if (player && (t.input === 'pointer' || t.input === 'both') && t.controlSpeed > 0 && pointer.down && pointer.y >= host.height() * 0.125) {
      var scale = scene.projectTrack(t.name, px, before, 'scale');
      var target = (pointer.x - host.width() / 2) / (scale * 0.8);
      lateral = dt > 0 ? Math.max(-t.controlSpeed, Math.min(t.controlSpeed, (target - px) / dt)) : 0;
    }
    var nx = player ? Math.max(-t.limit, Math.min(t.rightLimit, px + lateral * dt)) : 0;
    if (player) { player.x = nx - player.w / 2; player.y = t.distance; host.motion(player, nx - px, t.distance - before); }
    var playerBox = player ? host.hitbox(player) : { x: 0, w: 0 }, playerWidth = playerBox.w;
    var playerCenter = playerBox.x + playerWidth / 2;
    var encounters = [];
    forLive(t, function (b) {
      if (b.sprite === player) return;
      var s = b.sprite, oldX = b.previousX, oldZ = b.previousZ;
      s.x += b.vx * dt; s.y += b.vz * dt;
      if (!finite([s.x, s.y])) { warn('Um sprite saiu do limite de números da pista.'); return; }
      host.motion(s, center(s) - oldX, s.y - oldZ);
      var previous = oldZ - before, relative = s.y - t.distance;
      var crossed = previous > 0 && relative <= 0 || previous < 0 && relative >= 0;
      if (player && crossed) {
        var fraction = previous / (previous - relative);
        var box = host.hitbox(s);
        var a = oldPlayerCenter + (playerCenter - oldPlayerCenter) * fraction;
        var bX = oldX + (box.x - s.x) + box.w / 2 - s.w / 2 + (center(s) - oldX) * fraction;
        if (Math.abs(a - bX) <= (playerWidth + box.w) / 2) encounters.push({ binding: b, fraction: fraction });
      }
      b.previousX = center(s); b.previousZ = s.y;
    });
    scene.cameraTrack(t.name, nx * 0.2, before);
    scene.advanceTrack(t.name, t.distance - before);
    encounters.sort(function (a, b) { return a.fraction - b.fraction || a.binding.sequence - b.binding.sequence; });
    for (var i = 0; i < encounters.length; i++) {
      var item = encounters[i].binding; if (!alive(item)) continue;
      var handlers = (t.encounters.get(item.source) || []).concat(t.moldEncounters.get(host.moldName(item.sprite)) || []);
      var prior = current; current = item;
      try { for (var h = 0; h < handlers.length; h++) { invoke(handlers[h], item.sprite); if (gen !== generation) return; } }
      finally { current = gen === generation ? prior : null; }
      if (host.state() !== initialState || screens && host.state() !== 'playing') return;
    }
    if (!t.finished && t.finish > 0 && before < t.finish && t.distance >= t.finish) {
      t.finished = true;
      var finishers = t.finishers.slice();
      for (var f = 0; f < finishers.length; f++) { invoke(finishers[f], undefined); if (gen !== generation) return; }
      if (screens && host.state() === 'playing') host.setState('won');
    }
  }
  var api = {
    hasScreens: function () { return !!screens; },
    simulationBlocked: function () { return !!screens && host.state() !== 'playing'; },
    epoch: function () { return generation; },
    active: function () { return !!screens || tracks.size > 0 || backdrops.size > 0; },
    owns: function (sprite) { var b = bindings.get(sprite); return !!b && alive(b); },
    retains: function (sprite) { return families.has(sprite); },
    release: function (sprite) {
      var b = bindings.get(sprite); if (b) detach(b);
      // Instance events live as long as their family, never as long as a pooled object.
      tracks.forEach(function (t) {
        if (!families.has(sprite)) t.encounters.delete(sprite);
        if (b && !families.has(b.source)) t.encounters.delete(b.source);
      });
    },
    bounds: function (sprite) { var b = bindings.get(sprite), box = b && projectedBounds(b); return box && !outside(box, 0) ? box : null; },
    offscreen: function (sprite, margin) {
      var b = bindings.get(sprite); if (!b || !alive(b) || b.track.player === sprite) return false;
      var box = projectedBounds(b);
      // A distant wave has not entered the view yet. Behind the near plane it has left.
      return box ? outside(box, Math.max(0, margin)) : sprite.y < b.track.distance;
    },
    decorate: function (sprite, draw) {
      if (!api.owns(sprite)) return false;
      var box = api.bounds(sprite); if (!box) return true;
      if (worldPainted) {
        var ctx = host.context(); if (!ctx) return true;
        ctx.save(); try { host.screen(ctx); draw(box); } finally { ctx.restore(); }
      } else {
        var list = decorations.get(sprite) || []; list.push(draw); decorations.set(sprite, list);
      }
      return true;
    },
    reset: function () {
      generation++; tracks.clear(); bindings.clear(); families.clear(); backdrops.clear(); decorations.clear(); warnings.clear(); failedHandlers = new WeakSet();
      screens = null; current = null; sequence = 0; worldPainted = false; hudInput = false;
    },
    addSceneBackdrop: function (name, image, plane) {
      var id = key(name);
      if (!id || !key(image) || ['far', 'back', 'front'].indexOf(plane) < 0) { warn('Escolha um nome, uma imagem e a posição do cenário.'); return; }
      if (!backdrops.has(id) && backdrops.size >= 64) { warn('Use até 64 camadas de cenário.'); return; }
      backdrops.set(id, { image: image, plane: plane, motion: 0, fit: 'cover' });
      scene.createSceneLayer(id, image, plane === 'front' ? 'front' : 'back');
      scene.orderSceneLayer(id, plane === 'far' ? -10 : 0); host.wake();
    },
    sceneBackdropMotion: function (name, percent) {
      var b = backdrops.get(key(name));
      if (!b) { warn('Adicione o cenário antes de escolher seu movimento.'); return; }
      if (!Number.isFinite(percent) || Math.abs(percent) > 100) { warn('Use um movimento de cenário entre -100 e 100.'); return; }
      b.motion = percent / 100;
    },
    sceneBackdropFit: function (name, fit) {
      var b = backdrops.get(key(name));
      if (!b || ['cover', 'contain', 'repeat'].indexOf(fit) < 0) { warn('Escolha um cenário e como sua imagem se encaixa.'); return; }
      b.fit = fit;
    },
    createSpriteTrack: function (name) {
      var id = key(name); if (!id) { warn('Dê um nome à pista.'); return; }
      if (!tracks.has(id) && tracks.size >= 16) { warn('Use até 16 pistas.'); return; }
      var old = tracks.get(id);
      // Replacing a track destroys only the copies it made; the child's own sprites are just let go.
      if (old) Array.from(old.items.values()).forEach(function (b) { if (b.source === b.sprite) api.release(b.sprite); else remove(b); });
      var t = { name: id, items: new Map(), player: null, speed: 0, finish: 0, distance: 0, score: 0,
        controlSpeed: 0, input: 'off', limit: 120, rightLimit: 120, finished: false, encounters: new Map(), moldEncounters: new Map(), finishers: [], hud: null };
      tracks.set(id, t); configureView(t, 'near'); t.view = 'near'; host.wake();
    },
    trackPlayer: function (name, sprite, lives) {
      var t = track(name); if (!t) return;
      if (!Number.isFinite(lives) || lives <= 0) { warn('Escolha uma quantidade de vidas maior que zero.'); return; }
      if (place(t, sprite, 0, t.distance)) { t.player = sprite; host.setHealth(sprite, lives); }
    },
    trackControls: function (name, speed, limit) {
      var t = track(name); if (!t) return;
      if (!finite([speed, limit]) || speed < 0 || limit <= 0) { warn('Use velocidade positiva e um limite lateral maior que zero.'); return; }
      t.controlSpeed = speed; t.limit = limit; t.rightLimit = limit; t.input = 'both';
    },
    trackTravel: function (name, speed, finish) {
      var t = track(name); if (!t) return;
      if (!finite([speed, finish]) || finish < 0) { warn('Use números na velocidade e na chegada da pista.'); return; }
      t.speed = speed; t.finish = finish; t.finished = false;
    },
    putTrackSprite: function (name, sprite, x, distance) { var t = track(name); if (t) place(t, sprite, x, distance); },
    putTrackSpriteAt: function (name, sprite, side, distance) {
      var t = track(name); if (!t) return;
      if (['left', 'center', 'right'].indexOf(side) < 0) { warn('Escolha esquerda, centro ou direita para colocar o sprite.'); return; }
      place(t, sprite, side === 'left' ? -80 : side === 'right' ? 80 : 0, distance);
    },
    repeatTrackSprite: function (name, sprite, count, spacing, pattern) {
      var t = track(name), b = bindings.get(sprite); if (!t) return;
      if (!b || b.track !== t || t.player === sprite) { warn('Coloque o sprite na pista antes de fazer suas cópias.'); return; }
      if (!finite([count, spacing]) || !Number.isInteger(count) || count < 1 || count > 2048 || spacing <= 0 ||
          ['line', 'alternate', 'weave', 'steps-left', 'steps-right'].indexOf(pattern) < 0) { warn('Escolha um padrão, uma quantidade de 1 a 2048 e uma distância maior que zero.'); return; }
      var previousCopies = [];
      t.items.forEach(function (item) { if (item.source === sprite && item.sprite !== sprite) previousCopies.push(item); });
      if (t.items.size - previousCopies.length + count - 1 > 2048 || !Number.isFinite(sprite.y + (count - 1) * spacing)) { warn('A repetição ultrapassa o limite da pista.'); return; }
      previousCopies.forEach(remove);
      var x = center(sprite), z = sprite.y;
      for (var i = 1; i < count; i++) {
        var lateral = pattern === 'alternate' ? (i % 2 ? -x : x) :
          pattern === 'weave' ? (i % 2 ? 0 : i % 4 === 0 ? x : -x) :
          pattern === 'steps-left' ? x - i % 3 * sprite.w / 3 :
          pattern === 'steps-right' ? x + i % 3 * sprite.w / 3 : x;
        var copy = host.copySprite(sprite);
        if (!copy) break;
        var made = place(t, copy, lateral, z + i * spacing, sprite);
        if (made) { made.vx = b.vx; made.vz = b.vz; }
      }
    },
    trackSpriteVelocity: function (sprite, lateral, distance) {
      var group = family(sprite);
      if (!group || !finite([lateral, distance])) { warn('Coloque o sprite na pista e escolha velocidades numéricas.'); return; }
      group.forEach(function (item) { if (alive(item)) { item.vx = lateral; item.vz = distance; } });
    },
    trackFollow: function (name, sprite) {
      var t = track(name); if (!t) return;
      var b = bindings.get(sprite);
      if (b && b.track === t && alive(b)) { t.player = sprite; t.distance = sprite.y; }
      else if (place(t, sprite, 0, t.distance)) t.player = sprite;
    },
    trackSpeed: function (name, speed) {
      var t = track(name); if (!t) return;
      if (!Number.isFinite(speed)) { warn('A velocidade da pista precisa ser um número finito.'); return; }
      t.speed = speed;
    },
    trackFinishLine: function (name, distance) {
      var t = track(name); if (!t) return;
      if (!Number.isFinite(distance) || distance < 0) { warn('Use zero para pista sem fim ou uma distância positiva para a chegada.'); return; }
      t.finish = distance; t.finished = false;
    },
    trackInput: function (name, mode, speed) {
      var t = track(name); if (!t) return;
      if (['arrows', 'pointer', 'both', 'off'].indexOf(mode) < 0 || !Number.isFinite(speed) || speed < 0) { warn('Escolha os controles da pista e uma velocidade positiva.'); return; }
      t.input = mode; t.controlSpeed = speed;
    },
    trackLimit: function (name, left, right) {
      var t = track(name); if (!t) return;
      if (!finite([left, right]) || left < 0 || right < 0) { warn('Use limites laterais maiores ou iguais a zero.'); return; }
      t.limit = left; t.rightLimit = right;
    },
    trackPosition: function (name, property) { return api.spriteTrackValue(name, property); },
    onTrackSpriteEncounter: function (name, sprite, fn) { api.onTrackEncounter(name, sprite, fn); },
    onTrackMoldEncounter: function (name, mold, fn) {
      var t = track(name); if (!t || typeof fn !== 'function') return;
      if (!key(mold)) { warn('Escolha um molde para o encontro na pista.'); return; }
      var handlers = t.moldEncounters.get(mold) || []; handlers.push(fn); t.moldEncounters.set(mold, handlers);
    },
    forEachTrackSprite: function (sprite, fn) {
      if (typeof fn !== 'function') return;
      var group = family(sprite); if (!group) return;
      var list = Array.from(group), gen = generation;
      for (var i = 0; i < list.length; i++) { if (alive(list[i])) invoke(fn, list[i].sprite); if (gen !== generation) return; }
    },
    trackCameraView: function (name, view) {
      var t = track(name); if (!t) return;
      if (['near', 'wide', 'high'].indexOf(view) < 0) { warn('Escolha uma vista próxima, aberta ou alta.'); return; }
      // Asked again inside a frame rule, the same view must not rebuild the track sixty times a second.
      if (t.view === view) return;
      t.view = view; configureView(t, view);
    },
    onTrackEncounter: function (name, sprite, fn) {
      var t = track(name); if (!t || typeof fn !== 'function') return;
      if (!validSprite(sprite)) { warn('Escolha um sprite para o encontro na pista.'); return; }
      var handlers = t.encounters.get(sprite) || []; handlers.push(fn); t.encounters.set(sprite, handlers);
    },
    onTrackFinish: function (name, fn) { var t = track(name); if (t && typeof fn === 'function') t.finishers.push(fn); },
    collectTrackItem: function () {
      if (!current) { warn('Use “Recolher o sprite encontrado” dentro de um encontro na pista.'); return; }
      if (alive(current)) remove(current);
    },
    trackScore: function (name, amount) { var t = track(name); if (t && finite([amount, t.score + amount])) t.score += amount; },
    trackHurt: function (name, amount) {
      var t = track(name); if (!t || !t.player || !Number.isFinite(amount) || amount < 0) return;
      host.hurt(t.player, amount);
      if (host.health(t.player) <= 0) host.setState('lost');
    },
    trackHud: function (name, label, total) {
      var t = track(name); if (!t || !Number.isFinite(total) || total < 0) return;
      t.hud = { label: String(label), total: total };
      hudInput = true;
    },
    sceneGameScreens: function (title, instructions) {
      screens = { title: String(title), instructions: String(instructions) }; host.setState('start'); host.wake();
    },
    sceneAnimation: function (sprite, image, animation, once) {
      var group = family(sprite);
      if (group) { group.forEach(function (item) { if (alive(item)) host.animate(item.sprite, image, animation, !!once); }); return; }
      if (!validSprite(sprite)) { warn('Crie o sprite antes de escolher sua animação.'); return; }
      host.animate(sprite, image, animation, !!once);
    },
    sceneResult: function (result) { if (result === 'won' || result === 'lost') host.setState(result); },
    spriteTrackValue: function (name, property) {
      var t = track(name); if (!t) return 0;
      return property === 'score' ? t.score : property === 'distance' ? t.distance :
        property === 'lateral' ? (t.player ? center(t.player) : 0) : property === 'lives' ? (t.player ? host.health(t.player) : 0) : 0;
    },
    input: function (action) {
      if (!screens && !hudInput) return;
      var state = host.state();
      if (!screens) {
        if (action === 'pause') host.setPaused(state !== 'paused');
        else if (action === 'start' && state === 'paused') host.setPaused(false);
        else if (action === 'restart') host.restart();
        return;
      }
      if (action === 'restart' || action === 'start' && (state === 'won' || state === 'lost')) { host.restart(); return; }
      if (action === 'start' && (screens && state === 'start' || state === 'paused')) host.setState('playing');
      if (action === 'pause' && (state === 'playing' || state === 'paused')) host.setState(state === 'playing' ? 'paused' : 'playing');
    },
    step: function (dt) {
      if (!Number.isFinite(dt) || dt < 0 || screens && host.state() !== 'playing') return;
      var gen = generation, initialState = host.state(), list = Array.from(tracks.values());
      for (var i = 0; i < list.length; i++) { stepTrack(list[i], dt); if (gen !== generation || host.state() !== initialState) return; }
    },
    draw: function (pass) {
      if (!api.active()) return;
      if (pass === 'back') {
        decorations.clear(); worldPainted = false;
        var cam = host.camera(), first = tracks.values().next().value;
        if (first && first.player) cam = { x: center(first.player) * 0.2, y: 0 };
        backdrops.forEach(function (b, id) {
          var img = host.image(b.image); if (!img || !img.width || !img.height) return;
          var scale = b.fit === 'repeat' ? 1 : b.fit === 'contain' ? Math.min(host.width() / img.width, host.height() / img.height) : Math.max(host.width() / img.width, host.height() / img.height);
          if (b.motion && b.fit === 'cover') scale *= 1.04;
          scene.transformSceneLayer(id, (host.width() - img.width * scale) / 2 - cam.x * b.motion, (host.height() - img.height * scale) / 2 - cam.y * b.motion, scale, 1);
          scene.motionSceneLayer(id, 'screen', 0, 0, b.fit === 'repeat' ? 'both' : 'none');
        });
        scene.drawSceneLayers('back');
      } else if (pass === 'front') scene.drawSceneLayers('front');
      else if (pass === 'world') {
        var canvasContext = host.context(); if (!canvasContext) return;
        var ctx = canvasContext;
        ctx.save();
        try {
          host.screen(ctx);
          tracks.forEach(function (t) {
            var list = [];
            forLive(t, function (b) { if (scene.projectTrack(t.name, center(b.sprite), b.sprite.y, 'visible')) list.push(b); });
            list.sort(function (a, b) { return b.sprite.y - a.sprite.y || a.sequence - b.sequence; });
            for (var i = 0; i < list.length; i++) {
              var s = list[i].sprite, box = projectedBounds(list[i]);
              if (!box || outside(box, 0)) continue;
              var scale = box.w / s.w;
              ctx.save();
              try { ctx.translate(box.x, box.y); ctx.scale(scale, scale); ctx.translate(-s.x, -s.y); host.drawSprite(ctx, s); }
              finally { ctx.restore(); }
              var overlays = decorations.get(s) || []; decorations.delete(s);
              for (var d = 0; d < overlays.length; d++) overlays[d](box);
            }
          });
        } finally { ctx.restore(); worldPainted = true; }
      } else if (pass === 'hud') {
        const drawHud = host.drawHud; if (!drawHud) return;
        // The bar only exists with "Mostrar vidas e placar"; the footer only names controls the track has.
        var shown = false, controls = 'off';
        tracks.forEach(function (t) { if (t.input !== 'off' && t.controlSpeed > 0) controls = t.input; });
        tracks.forEach(function (t) {
          if (!t.hud) return; shown = true;
          drawHud(screens ? screens.title : '', screens ? screens.instructions : '', t.hud.label, t.score, t.hud.total,
            t.player ? host.health(t.player) : 0, t.finish ? t.distance / t.finish : 0, true, controls);
        });
        if (screens && !shown) drawHud(screens.title, screens.instructions, '', 0, 0, 0, 0, false, controls);
      }
    }
  };
  return api;
}
`
