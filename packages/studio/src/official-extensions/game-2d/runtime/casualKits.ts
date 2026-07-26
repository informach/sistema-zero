export const gameTwoDCasualKitsRuntime = `  // ============================================================
  // Kit equilibrista (Stick Hero) — v0.13.0; decomposto em blocos v0.40.0
  // Estica o bastão segurando o mouse/dedo, solta para derrubar e atravessar.
  // Lê o estado do ponteiro global (pointer.down) — sem listeners próprios.
  // Os helpers NOVOS (stickHero*/balloon*) fatiam o jogo por aspecto (cenário,
  // segurar, andar, desenhar, eventos); os antigos (create/update*) seguem como
  // COMPOSIÇÃO deles p/ projetos salvos (comportamento byte-equivalente).
  // ============================================================
  var _casualKitSequence = 0;
  // Registro/disparo de eventos dos kits — o MESMO idioma do onEnemyDefeated
  // (mapa por id estável + ordem + desativa só o handler quebrado).
  function _kitRegisterHandler(game, mapKey, orderKey, prefix, fn, explicitId) {
    if (!game || typeof fn !== 'function') return;
    if (!game[mapKey]) game[mapKey] = Object.create(null);
    if (!game[orderKey]) game[orderKey] = [];
    var id = _stableHandlerId(prefix, explicitId, fn);
    if (!game[mapKey][id]) game[orderKey].push(id);
    game[mapKey][id] = fn;
  }
  function _kitFireHandlers(game, mapKey, orderKey, label) {
    if (!game || !game[orderKey]) return;
    var generation = _driverGeneration;
    var order = game[orderKey].slice();
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var handler = game[mapKey] ? game[mapKey][id] : null;
      if (typeof handler !== 'function') continue;
      try { _invokeProjectCallback(handler, undefined, []); }
      catch (error) {
        _reportHandlerError(label, id, error);
        _removeOrderedIfCurrent(game[mapKey], game[orderKey], id, handler);
      }
      if (_runGenerationChanged(generation)) return;
    }
  }
  function shRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shGeneratePlatform(game) {
    var w = game.w;
    var minGap = Math.round(w * 0.10), maxGap = Math.round(w * 0.42);
    var minW = Math.round(w * 0.06), maxW = Math.round(w * 0.24);
    var last = game.platforms[game.platforms.length - 1];
    var furthest = last.x + last.w;
    var x = furthest + minGap + Math.floor(Math.random() * (maxGap - minGap));
    var pw = minW + Math.floor(Math.random() * (maxW - minW));
    game.platforms.push({ x: x, w: pw });
  }
  function shGenerateTree(game) {
    var last = game.trees[game.trees.length - 1];
    var furthest = last ? last.x : 0;
    var x = furthest + Math.round(game.w * 0.08) + Math.floor(Math.random() * Math.round(game.w * 0.30));
    var colors = ['#6D8821', '#8FAC34', '#98B333'];
    game.trees.push({ x: x, color: colors[Math.floor(Math.random() * 3)] });
  }
  function shReset(game) {
    game.phase = 'waiting';
    game.last = 0;
    game._lastHold = 0;
    game._lastStep = 0;
    game.sceneOffset = 0;
    game.score = 0;
    game.perfectFlash = 0;
    game.wasDown = false;
    var startW = Math.round(game.w * 0.13);
    game.platforms = [{ x: Math.round(game.w * 0.12), w: startW }];
    shGeneratePlatform(game); shGeneratePlatform(game);
    shGeneratePlatform(game); shGeneratePlatform(game);
    game.sticks = [{ x: game.platforms[0].x + game.platforms[0].w, length: 0, rotation: 0 }];
    game.trees = [];
    for (var i = 0; i < 12; i++) shGenerateTree(game);
    game.heroX = game.platforms[0].x + game.platforms[0].w - game.cfg.heroEdge;
    game.heroY = 0;
  }
  function shConfig(w, h) {
    return {
      heroW: Math.max(10, Math.round(w * 0.045)),
      heroH: Math.max(16, Math.round(h * 0.085)),
      platformH: Math.round(h * 0.30),
      heroEdge: Math.max(3, Math.round(w * 0.015)),
      perfect: Math.max(6, Math.round(w * 0.022)),
      stretch: w * 0.85,
      turn: 320,
      walk: w * 0.85,
      trans: w * 1.7,
      fall: h * 1.4
    };
  }
  function createStickHero(ctx) {
    if (!ctx || !ctx.canvas) return null;
    var w = stageW(ctx), h = stageH(ctx);
    var game = {
      ctx: ctx,
      w: w,
      h: h,
      cfg: shConfig(w, h),
      paddingX: Math.round(w * 0.27),
      _hudKey: 'kit:equilibrista:' + (++_casualKitSequence)
    };
    shReset(game);
    return game;
  }
  function _kitColor(value, fallback) {
    return (typeof value === 'string' && value) ? value : fallback;
  }
  // VISUAL customizado do kit (v0.41.0): o herói/balão ganham um "sprite de
  // visual" interno e reusam setShape/setImage dos sprites — mesmas regras
  // (figura/imagem "uma coisa por vez", aviso de nome errado, fallback seguro,
  // redraw quando a imagem termina de carregar). Nome VAZIO volta ao desenho
  // pronto do kit. O sprite é persistente (os hooks de imagem cancelam certo).
  function _kitLook(game, key) {
    if (!game[key]) {
      game[key] = { x: 0, y: 0, w: 1, h: 1, color: '#1b2330', vx: 0, vy: 0, image: null, skin: null, anim: null };
    }
    return game[key];
  }
  function _kitSetLook(game, key, kind, name) {
    if (!game) return;
    var s = _kitLook(game, key);
    if (!name || typeof name !== 'string') {
      _disposeSprite(s);
      s.skin = null; s.image = null; s.anim = null;
      return;
    }
    if (kind === 'shape') setShape(s, name);
    else setImage(s, name);
  }
  function _kitDrawLook(game, key, x, y, w, h, color) {
    var s = game[key];
    if (!s || (!s.skin && !s.image)) return false;
    s.x = x; s.y = y; s.w = w; s.h = h;
    s.color = color;
    _drawSpriteBody(game.ctx, s);
    return true;
  }
  function stickHeroSetShape(game, name) { _kitSetLook(game, '_heroLook', 'shape', name); }
  function stickHeroSetImage(game, name) { _kitSetLook(game, '_heroLook', 'image', name); }
  function balloonSetShape(game, name) { _kitSetLook(game, '_balloonLook', 'shape', name); }
  function balloonSetImage(game, name) { _kitSetLook(game, '_balloonLook', 'image', name); }
  // Criação DECOMPOSTA: o mesmo jogo do createStickHero + as cores da criança.
  function stickHeroCreate(ctx, heroColor, stickColor, platformColor) {
    var game = createStickHero(ctx);
    if (game) {
      game.colors = {
        hero: _kitColor(heroColor, '#1b2330'),
        stick: _kitColor(stickColor, '#1b2330'),
        platform: _kitColor(platformColor, '#1b2330')
      };
    }
    return game;
  }
  function shHitPlatform(game) {
    var st = game.sticks[game.sticks.length - 1];
    var far = st.x + st.length;
    var p = game.cfg.perfect;
    for (var i = 0; i < game.platforms.length; i++) {
      var pl = game.platforms[i];
      if (pl.x < far && far < pl.x + pl.w) {
        var mid = pl.x + pl.w / 2;
        var perfect = (mid - p / 2 < far) && (far < mid + p / 2);
        return { platform: pl, perfect: perfect };
      }
    }
    return { platform: null, perfect: false };
  }
  function shSyncStageSize(game) {
    var nextW = stageW(game.ctx), nextH = stageH(game.ctx);
    if (!nextW || !nextH || (nextW === game.w && nextH === game.h)) return;
    var scaleX = nextW / game.w, scaleY = nextH / game.h;
    for (var i = 0; i < game.platforms.length; i++) {
      game.platforms[i].x *= scaleX;
      game.platforms[i].w *= scaleX;
    }
    for (var j = 0; j < game.sticks.length; j++) {
      game.sticks[j].x *= scaleX;
      game.sticks[j].length *= scaleX;
    }
    for (var k = 0; k < game.trees.length; k++) game.trees[k].x *= scaleX;
    game.heroX *= scaleX;
    game.heroY *= scaleY;
    game.sceneOffset *= scaleX;
    game.paddingX *= scaleX;
    game.w = nextW;
    game.h = nextH;
    game.cfg = shConfig(nextW, nextH);
  }
  function _kitSpeedMultiplier(speed) {
    var mult = _finiteNumber(speed, 1);
    return mult > 0 ? mult : 0;
  }
  // SEGURAR/SOLTAR: fases waiting→stretching→turning + resolução do acerto
  // (placar, PERFEITO, plataforma/árvores novas e os eventos do kit). Relógio
  // próprio (_lastHold) — independe da ordem dos blocos no loop.
  function stickHeroHold(game, speed) {
    if (!game) return;
    shSyncStageSize(game);
    var mult = _kitSpeedMultiplier(speed);
    var down = pointer.down;
    var pressed = down && !game.wasDown;
    var released = !down && game.wasDown;
    game.wasDown = down;
    var t = now();
    if (pressed && game.phase === 'waiting') { game.phase = 'stretching'; game._lastHold = t; }
    if (released && game.phase === 'stretching') game.phase = 'turning';
    var dt = game._lastHold ? (t - game._lastHold) / 1000 : 0;
    game._lastHold = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    dt *= mult;
    var cfg = game.cfg;
    var st = game.sticks[game.sticks.length - 1];
    if (game.phase === 'stretching') {
      st.length += cfg.stretch * dt;
    } else if (game.phase === 'turning') {
      st.rotation += cfg.turn * dt;
      if (st.rotation >= 90) {
        st.rotation = 90;
        var hit = shHitPlatform(game);
        if (hit.platform) {
          game.score += hit.perfect ? 2 : 1;
          if (hit.perfect) game.perfectFlash = 1;
          shGeneratePlatform(game); shGenerateTree(game); shGenerateTree(game);
          _kitFireHandlers(game, '_onCross', '_onCrossOrder', '"Quando o equilibrista atravessar uma plataforma"');
          if (hit.perfect) {
            _kitFireHandlers(game, '_onPerfect', '_onPerfectOrder', '"Quando o equilibrista acertar bem no meio"');
          }
        }
        game.phase = 'walking';
      }
    }
  }
  // ANDAR/ATRAVESSAR/CAIR: fases walking→transitioning→falling→over + o
  // decaimento do flash de PERFEITO. Relógio próprio (_lastStep).
  function stickHeroStep(game, speed) {
    if (!game) return;
    shSyncStageSize(game);
    var mult = _kitSpeedMultiplier(speed);
    var t = now();
    var dt = game._lastStep ? (t - game._lastStep) / 1000 : 0;
    game._lastStep = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    dt *= mult;
    var cfg = game.cfg;
    var st = game.sticks[game.sticks.length - 1];
    if (game.phase === 'walking') {
      game.heroX += cfg.walk * dt;
      var hw = shHitPlatform(game);
      if (hw.platform) {
        var maxX = hw.platform.x + hw.platform.w - cfg.heroEdge;
        if (game.heroX > maxX) { game.heroX = maxX; game.phase = 'transitioning'; }
      } else {
        var maxX2 = st.x + st.length + cfg.heroW;
        if (game.heroX > maxX2) { game.heroX = maxX2; game.phase = 'falling'; }
      }
    } else if (game.phase === 'transitioning') {
      game.sceneOffset += cfg.trans * dt;
      var ht = shHitPlatform(game);
      if (ht.platform) {
        var goal = ht.platform.x + ht.platform.w - game.paddingX;
        if (game.sceneOffset > goal) {
          game.sceneOffset = goal;
          game.sticks.push({ x: ht.platform.x + ht.platform.w, length: 0, rotation: 0 });
          game.phase = 'waiting';
        }
      } else { game.phase = 'waiting'; }
    } else if (game.phase === 'falling') {
      if (st.rotation < 180) st.rotation += cfg.turn * dt;
      game.heroY += cfg.fall * dt;
      if (game.heroY > game.h) game.phase = 'over';
    }
    if (game.perfectFlash > 0) { game.perfectFlash -= dt * 0.6; if (game.perfectFlash < 0) game.perfectFlash = 0; }
  }
  // LEGADO: o "Atualizar o equilibrista" antigo = composição dos helpers novos.
  // O toque-para-recomeçar automático vive SÓ aqui (no caminho decomposto a
  // criança pluga o reinício num evento/tecla).
  function updateStickHero(game) {
    if (!game) return;
    shSyncStageSize(game);
    if (game.phase === 'over') {
      var downOver = pointer.down;
      if (downOver && !game.wasDown) { shReset(game); game.wasDown = true; }
      else { game.wasDown = downOver; }
    }
    stickHeroHold(game, 1);
    stickHeroStep(game, 1);
    shDraw(game);
  }
  function stickHeroOnCross(game, fn, explicitId) {
    _kitRegisterHandler(game, '_onCross', '_onCrossOrder', 'equilibrista-atravessou', fn, explicitId);
  }
  function stickHeroOnPerfect(game, fn, explicitId) {
    _kitRegisterHandler(game, '_onPerfect', '_onPerfectOrder', 'equilibrista-perfeito', fn, explicitId);
  }
  function shDrawHill(game, fromBottom, amp, color) {
    var ctx = game.ctx, w = game.w, h = game.h;
    var baseY = h - fromBottom;
    var off = game.sceneOffset * 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (var x = 0; x <= w; x += 14) ctx.lineTo(x, baseY - Math.sin((x + off) * 0.02) * amp);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  function shDrawBackground(game) {
    var ctx = game.ctx, w = game.w, h = game.h;
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#BBD691');
    sky.addColorStop(1, '#FEF1E1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    shDrawHill(game, h * 0.30, h * 0.05, '#95C629');
    shDrawHill(game, h * 0.22, h * 0.08, '#659F1C');
    var baseY = h - game.cfg.platformH - 2;
    for (var i = 0; i < game.trees.length; i++) {
      var tr = game.trees[i];
      var x = tr.x - game.sceneOffset * 0.2;
      if (x < -20 || x > w + 20) continue;
      ctx.fillStyle = '#7D833C';
      ctx.fillRect(x - 1, baseY - h * 0.04, 2, h * 0.04);
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.moveTo(x - h * 0.035, baseY - h * 0.04);
      ctx.lineTo(x, baseY - h * 0.14);
      ctx.lineTo(x + h * 0.035, baseY - h * 0.04);
      ctx.closePath();
      ctx.fill();
    }
  }
  // CENÁRIO decomposto: céu + colinas + árvores (o gradiente cobre a tela
  // inteira, então funciona com ou sem o "Limpar a tela" antes).
  function stickHeroScenery(game) {
    if (!game) return;
    shSyncStageSize(game);
    var ctx = game.ctx;
    ctx.save();
    shDrawBackground(game);
    ctx.restore();
  }
  // Plataformas + herói + bastões (coordenadas do mundo), com as cores da criança.
  function _shDrawWorld(game) {
    var ctx = game.ctx, cfg = game.cfg, w = game.w, h = game.h;
    var top = h - cfg.platformH;
    var heroColor = (game.colors && game.colors.hero) || '#1b2330';
    var stickColor = (game.colors && game.colors.stick) || '#1b2330';
    var platformColor = (game.colors && game.colors.platform) || '#1b2330';
    ctx.save();
    ctx.translate(-game.sceneOffset, 0);
    // platforms
    for (var i = 0; i < game.platforms.length; i++) {
      var pl = game.platforms[i];
      ctx.fillStyle = platformColor;
      ctx.fillRect(pl.x, top, pl.w, cfg.platformH);
      if (game.sticks[game.sticks.length - 1].x < pl.x) {
        ctx.fillStyle = '#e23b3b';
        ctx.fillRect(pl.x + pl.w / 2 - cfg.perfect / 2, top, cfg.perfect, cfg.perfect);
      }
    }
    // hero — visual customizado (figura/imagem) numa caixa QUADRADA de lado
    // heroH ancorada no pé do herói (a caixa nativa é estreita e distorceria o
    // desenho da criança); sem visual, o boneco desenhado de sempre.
    var heroSide = cfg.heroH;
    var heroDrawn = _kitDrawLook(
      game, '_heroLook',
      game.heroX - heroSide / 2, top - heroSide + game.heroY, heroSide, heroSide,
      heroColor
    );
    if (!heroDrawn) {
      var hx = game.heroX - cfg.heroW / 2;
      var hy = top - cfg.heroH + game.heroY;
      ctx.fillStyle = heroColor;
      shRoundRect(ctx, hx, hy, cfg.heroW, cfg.heroH, Math.max(2, cfg.heroW * 0.25));
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(hx + cfg.heroW * 0.72, hy + cfg.heroH * 0.28, Math.max(1.5, cfg.heroW * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }
    // sticks
    for (var k = 0; k < game.sticks.length; k++) {
      var s = game.sticks[k];
      ctx.save();
      ctx.translate(s.x, top);
      ctx.rotate((Math.PI / 180) * s.rotation);
      ctx.strokeStyle = stickColor;
      ctx.lineWidth = Math.max(2, w * 0.008);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s.length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // DESENHO decomposto: mundo + HUD acessível (sem placar/overlay no canvas —
  // esses a criança monta com "Mostrar placar"/telas).
  function stickHeroDraw(game) {
    if (!game) return;
    shSyncStageSize(game);
    _shDrawWorld(game);
    var hudParts = ['Pontos: ' + game.score];
    if (game.perfectFlash > 0) hudParts.push('Perfeito! Mais 2 pontos');
    if (game.phase === 'waiting') hudParts.push('Segure para esticar o bastão');
    else if (game.phase === 'over') hudParts.push('Caiu!');
    _updateAccessibleHud(game._hudKey, hudParts.join('. '));
  }
  function shDraw(game) {
    var ctx = game.ctx, w = game.w, h = game.h;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    shDrawBackground(game);
    _shDrawWorld(game);
    // HUD
    ctx.fillStyle = '#1b2330';
    ctx.font = 'bold ' + Math.round(h * 0.10) + 'px ' + _szGameUIFont;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(String(game.score), w - w * 0.04, h * 0.04);
    if (game.perfectFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, game.perfectFlash);
      ctx.fillStyle = '#e23b3b';
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(h * 0.06) + 'px ' + _szGameUIFont;
      ctx.fillText('PERFEITO! +2', w / 2, h * 0.16);
      ctx.restore();
    }
    if (game.phase === 'waiting') {
      ctx.fillStyle = 'rgba(20,20,30,0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.round(h * 0.045) + 'px ' + _szGameUIFont;
      ctx.fillText('Segure para esticar o bastão', w / 2, h * 0.45);
    } else if (game.phase === 'over') {
      ctx.fillStyle = 'rgba(20,20,30,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(h * 0.06) + 'px ' + _szGameUIFont;
      ctx.fillText('Caiu! Toque para recomeçar', w / 2, h * 0.45);
    }
    ctx.restore();
    var hudParts = ['Pontos: ' + game.score];
    if (game.perfectFlash > 0) hudParts.push('Perfeito! Mais 2 pontos');
    if (game.phase === 'waiting') hudParts.push('Segure para esticar o bastão');
    else if (game.phase === 'over') hudParts.push('Caiu! Toque para recomeçar');
    _updateAccessibleHud(game._hudKey, hudParts.join('. '));
  }
  function stickHeroScore(game) { return game ? game.score : 0; }
  function stickHeroOver(game) { return game ? game.phase === 'over' : false; }
  function restartStickHero(game) { if (game) shReset(game); }

  // ============================================================
  // Kit balão (Hot-Air-Balloon) — v0.13.0; decomposto em blocos v0.40.0
  // Suba segurando o mouse/dedo, economize combustível e desvie das árvores.
  // ============================================================
  function blMakeTree(game, fromX) {
    var w = game.w;
    var gap = w * 0.45 + Math.random() * w * 1.1;
    var th = game.h * (0.16 + Math.random() * 0.22);
    var colors = ['#6D8821', '#8FAC34', '#98B333'];
    return { x: fromX + gap, th: th, color: colors[Math.floor(Math.random() * 3)] };
  }
  function blReset(game) {
    var w = game.w, h = game.h;
    game.over = false;
    game.vVel = 0;
    game.hVel = Math.max(2, w * 0.006);
    game.groundY = h * 0.82;
    game.by = game.groundY;
    game.dist = 0;
    game.meters = 0;
    game.fuel = 100;
    game.wasDown = false;
    game.last = 0;
    game._lastLift = 0;
    game._lastScroll = 0;
    game.trees = [];
    var fromX = w;
    for (var i = 0; i < 6; i++) { var t = blMakeTree(game, fromX); game.trees.push(t); fromX = t.x; }
  }
  function createBalloon(ctx) {
    if (!ctx || !ctx.canvas) return null;
    var w = stageW(ctx), h = stageH(ctx);
    var game = {
      ctx: ctx,
      w: w,
      h: h,
      _hudKey: 'kit:balao:' + (++_casualKitSequence)
    };
    blReset(game);
    return game;
  }
  // Criação DECOMPOSTA: o mesmo jogo do createBalloon + as cores da criança.
  function balloonCreate(ctx, color, basketColor) {
    var game = createBalloon(ctx);
    if (game) {
      game.colors = {
        balloon: _kitColor(color, '#D62828'),
        basket: _kitColor(basketColor, '#8a5a2b')
      };
    }
    return game;
  }
  function blCircle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function blSyncStageSize(game) {
    var nextW = stageW(game.ctx), nextH = stageH(game.ctx);
    if (!nextW || !nextH || (nextW === game.w && nextH === game.h)) return;
    var scaleX = nextW / game.w, scaleY = nextH / game.h;
    for (var i = 0; i < game.trees.length; i++) {
      game.trees[i].x *= scaleX;
      game.trees[i].th *= scaleY;
    }
    game.dist *= scaleX;
    game.hVel *= scaleX;
    game.by *= scaleY;
    game.groundY *= scaleY;
    game.vVel *= scaleY;
    game.w = nextW;
    game.h = nextH;
  }
  // SUBIR/CAIR: física vertical + queima de combustível + pouso; combustível
  // zerado com o balão no chão marca o fim. Relógio próprio (_lastLift).
  function balloonLift(game, force) {
    if (!game) return;
    blSyncStageSize(game);
    if (game.over) return;
    var mult = _kitSpeedMultiplier(force);
    var h = game.h;
    var t = now();
    var dt = game._lastLift ? (t - game._lastLift) / 1000 : 0;
    game._lastLift = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    var step = dt * 60 * mult;
    var heating = pointer.down && game.fuel > 0;
    var maxRise = h * 0.013, maxFall = h * 0.009;
    if (heating) {
      if (game.vVel > -maxRise) game.vVel -= h * 0.0011 * step;
      var altitude = (game.groundY - game.by) / game.groundY;
      game.fuel -= (0.06 + altitude * 0.10) * step;
      if (game.fuel < 0) game.fuel = 0;
    } else if (game.vVel < maxFall) {
      game.vVel += h * 0.0006 * step;
    }
    game.by += game.vVel * step;
    if (game.by > game.groundY) { game.by = game.groundY; game.vVel = 0; }
    if (game.fuel <= 0 && game.by >= game.groundY - 1) game.over = true;
  }
  // AVANÇAR: distância/metros (só no ar), reciclagem das árvores e a batida
  // (dispara o evento do kit). Relógio próprio (_lastScroll).
  function balloonScroll(game, speed) {
    if (!game) return;
    blSyncStageSize(game);
    if (game.over) return;
    var mult = _kitSpeedMultiplier(speed);
    var w = game.w;
    var t = now();
    var dt = game._lastScroll ? (t - game._lastScroll) / 1000 : 0;
    game._lastScroll = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    var step = dt * 60 * mult;
    var airborne = game.by < game.groundY - 1;
    if (airborne) game.dist += game.hVel * step;
    game.meters = Math.floor(game.dist / (w * 0.03));
    // recicla árvores que saíram pela esquerda
    if (game.trees.length && (game.trees[0].x - game.dist) < -80) {
      game.trees.shift();
      var lastT = game.trees[game.trees.length - 1];
      game.trees.push(blMakeTree(game, lastT ? lastT.x : game.dist + w));
    }
    // colisão: passando por uma árvore e baixo demais
    var screenX = w * 0.3;
    var hitTree = false;
    for (var i = 0; i < game.trees.length; i++) {
      var tx = game.trees[i].x - game.dist;
      if (Math.abs(tx - screenX) < w * 0.06 && game.by > game.groundY - game.trees[i].th) {
        hitTree = true;
      }
    }
    if (hitTree && !game.over) {
      game.over = true;
      _kitFireHandlers(game, '_onTreeHit', '_onTreeHitOrder', '"Quando o balão bater numa árvore"');
    }
  }
  // LEGADO: o "Atualizar o balão" antigo = composição dos helpers novos. O
  // toque-para-recomeçar automático vive SÓ aqui.
  function updateBalloon(game) {
    if (!game) return;
    blSyncStageSize(game);
    var down = pointer.down;
    var pressed = down && !game.wasDown;
    game.wasDown = down;
    if (game.over) { if (pressed) blReset(game); blDraw(game); return; }
    balloonLift(game, 1);
    balloonScroll(game, 1);
    blDraw(game);
  }
  function balloonOnTreeHit(game, fn, explicitId) {
    _kitRegisterHandler(game, '_onTreeHit', '_onTreeHitOrder', 'balao-bateu', fn, explicitId);
  }
  function blHill(game, fromBottom, amp, color, par) {
    var ctx = game.ctx, w = game.w, h = game.h;
    var baseY = h - fromBottom;
    var off = game.dist * par;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (var x = 0; x <= w; x += 14) ctx.lineTo(x, baseY - Math.sin((x + off) * 0.015) * amp);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  function blDrawBalloon(game, x, by) {
    var ctx = game.ctx, h = game.h;
    var R = h * 0.11;
    // Visual customizado (figura/imagem): a caixa é o retângulo que o balão
    // desenhado ocupa (envelope + cordas + cesto), 2R de largura por 3R de altura.
    if (_kitDrawLook(game, '_balloonLook', x - R, by - R * 3, R * 2, R * 3,
      (game.colors && game.colors.balloon) || '#D62828')) {
      return;
    }
    var cy = by - R * 2.0;
    var custom = game.colors && game.colors.balloon;
    var body = custom || '#D62828';
    var rope = custom ? 'rgba(0,0,0,0.35)' : '#a51f1f';
    var basket = (game.colors && game.colors.basket) || '#8a5a2b';
    ctx.save();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - R * 0.4, by - R * 0.95);
    ctx.quadraticCurveTo(x - R, cy + R * 0.7, x - R, cy);
    ctx.arc(x, cy, R, Math.PI, 0, false);
    ctx.quadraticCurveTo(x + R, cy + R * 0.7, x + R * 0.4, by - R * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rope;
    ctx.lineWidth = Math.max(1, h * 0.004);
    ctx.beginPath();
    ctx.moveTo(x - R * 0.3, by - R * 0.95); ctx.lineTo(x - R * 0.22, by - R * 0.3);
    ctx.moveTo(x + R * 0.3, by - R * 0.95); ctx.lineTo(x + R * 0.22, by - R * 0.3);
    ctx.stroke();
    ctx.fillStyle = basket;
    ctx.fillRect(x - R * 0.28, by - R * 0.3, R * 0.56, R * 0.3);
    ctx.restore();
  }
  function _blDrawScenery(game) {
    var ctx = game.ctx, w = game.w, h = game.h;
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#AADBEA');
    sky.addColorStop(1, '#FEF1E1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    blHill(game, h * 0.30, h * 0.05, '#AAD155', 0.2);
    blHill(game, h * 0.20, h * 0.07, '#84B249', 0.4);
    ctx.fillStyle = '#5fa24a';
    ctx.fillRect(0, game.groundY + h * 0.02, w, h);
    var baseY = game.groundY + h * 0.02;
    for (var i = 0; i < game.trees.length; i++) {
      var tr = game.trees[i];
      var x = tr.x - game.dist;
      if (x < -60 || x > w + 60) continue;
      var topY = baseY - tr.th;
      ctx.fillStyle = '#885F37';
      ctx.fillRect(x - h * 0.012, topY + tr.th * 0.4, h * 0.024, tr.th * 0.6);
      ctx.fillStyle = tr.color;
      var r = tr.th * 0.28;
      blCircle(ctx, x, topY + r, r);
      blCircle(ctx, x - r * 0.75, topY + r * 1.7, r * 0.9);
      blCircle(ctx, x + r * 0.75, topY + r * 1.7, r * 0.9);
    }
  }
  // CENÁRIO decomposto: céu + colinas + chão + árvores (o gradiente cobre a
  // tela inteira; funciona com ou sem o "Limpar a tela" antes).
  function balloonScenery(game) {
    if (!game) return;
    blSyncStageSize(game);
    var ctx = game.ctx;
    ctx.save();
    _blDrawScenery(game);
    ctx.restore();
  }
  // DESENHO decomposto: só o balão + HUD acessível (barra/metros/overlay a
  // criança monta com "Mostrar barra"/"Mostrar placar"/telas).
  function balloonDraw(game) {
    if (!game) return;
    blSyncStageSize(game);
    var ctx = game.ctx;
    ctx.save();
    blDrawBalloon(game, game.w * 0.3, game.by);
    ctx.restore();
    var hudParts = [
      'Distância: ' + game.meters + ' metros',
      'Combustível: ' + Math.round(game.fuel) + ' de 100'
    ];
    if (game.over) hudParts.push('Fim!');
    else if (game.by >= game.groundY - 1 && game.dist === 0) {
      hudParts.push('Segure para subir; voe baixo para poupar combustível');
    }
    _updateAccessibleHud(game._hudKey, hudParts.join('. '));
  }
  function blDraw(game) {
    var ctx = game.ctx, w = game.w, h = game.h;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    _blDrawScenery(game);
    blDrawBalloon(game, w * 0.3, game.by);
    // HUD: combustível + metros
    var fw = w * 0.4, fh = h * 0.05, fx = w * 0.06, fy = h * 0.06;
    ctx.strokeStyle = game.fuel <= 30 ? '#e23b3b' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.fillStyle = game.fuel <= 30 ? 'rgba(230,40,40,0.55)' : 'rgba(150,150,200,0.55)';
    ctx.fillRect(fx, fy, fw * game.fuel / 100, fh);
    ctx.fillStyle = '#1b2330';
    ctx.font = 'bold ' + Math.round(h * 0.07) + 'px ' + _szGameUIFont;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(game.meters + ' m', w - w * 0.06, fy);
    if (game.over) {
      ctx.fillStyle = 'rgba(20,20,30,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(h * 0.06) + 'px ' + _szGameUIFont;
      ctx.fillText('Fim! Toque para recomeçar', w / 2, h * 0.45);
    } else if (game.by >= game.groundY - 1 && game.dist === 0) {
      ctx.fillStyle = 'rgba(20,20,30,0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.round(h * 0.045) + 'px ' + _szGameUIFont;
      ctx.fillText('Segure para subir · voe baixo p/ poupar combustível', w / 2, h * 0.45);
    }
    ctx.restore();
    var hudParts = [
      'Distância: ' + game.meters + ' metros',
      'Combustível: ' + Math.round(game.fuel) + ' de 100'
    ];
    if (game.over) hudParts.push('Fim! Toque para recomeçar');
    else if (game.by >= game.groundY - 1 && game.dist === 0) {
      hudParts.push('Segure para subir; voe baixo para poupar combustível');
    }
    _updateAccessibleHud(game._hudKey, hudParts.join('. '));
  }
  function balloonScore(game) { return game ? game.meters : 0; }
  function balloonFuel(game) { return game ? Math.round(game.fuel) : 0; }
  function balloonOver(game) { return game ? !!game.over : false; }
  function restartBalloon(game) { if (game) blReset(game); }

  _registerRuntimeDomain('casual-kits', {
    reset: function () { _casualKitSequence = 0; }
  });

`
