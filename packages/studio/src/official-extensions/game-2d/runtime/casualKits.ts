export const gameTwoDCasualKitsRuntime = `  // ============================================================
  // Kits Equilibrista (Stick Hero) e Balão (Hot-Air-Balloon) — v0.42.0
  // Semântica sprite + caminho: o PERSONAGEM é um sprite NORMAL (participa dos
  // blocos genéricos de sprite: desenhar, trocar figura/imagem, tamanho); as
  // REGRAS do jogo moram num objeto "caminho" nomeado. A criança monta o loop
  // e a leitura do mouse (pointerDown) com blocos genéricos, como no Kit nave
  // e no Kit dino. Coordenadas SEMPRE de tela: o caminho guarda x de mundo e
  // aplica o deslocamento internamente (câmera não combina com estes kits).
  // ============================================================
  var _casualKitSequence = 0;
  // Registro/disparo de eventos dos kits — o MESMO idioma do onEnemyDefeated
  // (mapa por id estável + ordem + desativa só o handler quebrado).
  function _kitRegisterHandler(target, mapKey, orderKey, prefix, fn, explicitId) {
    if (!target || typeof fn !== 'function') return;
    if (!target[mapKey]) target[mapKey] = Object.create(null);
    if (!target[orderKey]) target[orderKey] = [];
    var id = _stableHandlerId(prefix, explicitId, fn);
    if (!target[mapKey][id]) target[orderKey].push(id);
    target[mapKey][id] = fn;
  }
  function _kitFireHandlers(target, mapKey, orderKey, label) {
    if (!target || !target[orderKey]) return;
    var generation = _driverGeneration;
    var order = target[orderKey].slice();
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var handler = target[mapKey] ? target[mapKey][id] : null;
      if (typeof handler !== 'function') continue;
      try { _invokeProjectCallback(handler, undefined, []); }
      catch (error) {
        _reportHandlerError(label, id, error);
        _removeOrderedIfCurrent(target[mapKey], target[orderKey], id, handler);
      }
      if (_runGenerationChanged(generation)) return;
    }
  }
  function _kitColor(value, fallback) {
    return (typeof value === 'string' && value) ? value : fallback;
  }
  function _kitSpeedMultiplier(speed) {
    var mult = _finiteNumber(speed, 1);
    return mult > 0 ? mult : 0;
  }
  // Relógio próprio por objeto+chave: cada comando do kit mede o SEU dt (clamp
  // de 50ms), então a ordem dos blocos no loop não muda a física.
  function _kitDt(target, key) {
    var t = now();
    var dt = target[key] ? (t - target[key]) / 1000 : 0;
    target[key] = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    return dt;
  }
  // Tamanho LÓGICO vigente do palco (o mesmo que o "Preparar a tela" definiu).
  // Sem tamanho lógico congelado, cai no canvas do palco (largura/altura crua).
  function _kitStageW() {
    var c = ensureStage();
    var w = stageW(c);
    if (w) return w;
    if (_stageCanvas && _stageCanvas.width) return _stageCanvas.width;
    return 300;
  }
  function _kitStageH() {
    var c = ensureStage();
    var h = stageH(c);
    if (h) return h;
    if (_stageCanvas && _stageCanvas.height) return _stageCanvas.height;
    return 150;
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

  // ============================================================
  // 🤸 Equilibrista — o HERÓI é um sprite; as regras moram no CAMINHO.
  // ============================================================
  function createStickHero(opts) {
    opts = opts || {};
    var w = _positiveFiniteNumber(opts.w, 18);
    var h = _positiveFiniteNumber(opts.h, 36);
    var s = createSprite({ x: 0, y: 0, w: w, h: h, color: opts.color || '#d6455d' });
    s.skin = { kind: 'stickhero', color: opts.color || '#d6455d' };
    return s;
  }
  // Boneco do equilibrista desenhado na caixa do sprite (dispatch em sprites).
  function drawStickHeroSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var col = sk.color || sprite.color || '#d6455d';
    var x = sprite.x, y = sprite.y, w = sprite.w, h = sprite.h;
    ctx.fillStyle = col;
    shRoundRect(ctx, x, y, w, h, Math.max(2, w * 0.25));
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.28, Math.max(1.5, w * 0.13), 0, Math.PI * 2);
    ctx.fill();
  }
  function _stickPathConfig(w, h) {
    return {
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
  function shGeneratePlatform(path) {
    var w = path.w;
    var minGap = Math.round(w * 0.10), maxGap = Math.round(w * 0.42);
    var minW = Math.round(w * 0.06), maxW = Math.round(w * 0.24);
    var last = path.platforms[path.platforms.length - 1];
    var furthest = last.x + last.w;
    var x = furthest + minGap + Math.floor(Math.random() * (maxGap - minGap));
    var pw = minW + Math.floor(Math.random() * (maxW - minW));
    path.platforms.push({ x: x, w: pw });
  }
  function shGenerateTree(path) {
    var last = path.trees[path.trees.length - 1];
    var furthest = last ? last.x : 0;
    var x = furthest + Math.round(path.w * 0.08) + Math.floor(Math.random() * Math.round(path.w * 0.30));
    var colors = ['#6D8821', '#8FAC34', '#98B333'];
    path.trees.push({ x: x, color: colors[Math.floor(Math.random() * 3)] });
  }
  function _stickPathReset(path) {
    path.phase = 'waiting';
    path._lastGrow = 0;
    path._lastWalk = 0;
    path.sceneOffset = 0;
    var startW = Math.round(path.w * 0.13);
    path.platforms = [{ x: Math.round(path.w * 0.12), w: startW }];
    shGeneratePlatform(path); shGeneratePlatform(path);
    shGeneratePlatform(path); shGeneratePlatform(path);
    path.sticks = [{ x: path.platforms[0].x + path.platforms[0].w, length: 0, rotation: 0 }];
    path.trees = [];
    for (var i = 0; i < 12; i++) shGenerateTree(path);
    path.heroX = path.platforms[0].x + path.platforms[0].w - path.cfg.heroEdge;
    path.heroY = 0;
  }
  function createStickPath(ctx, opts) {
    if (!ctx || !ctx.canvas) return null;
    opts = opts || {};
    var w = stageW(ctx), h = stageH(ctx);
    var path = {
      ctx: ctx,
      w: w,
      h: h,
      cfg: _stickPathConfig(w, h),
      paddingX: Math.round(w * 0.27),
      colors: {
        platform: _kitColor(opts.platform, '#0ea5a0'),
        stick: _kitColor(opts.stick, '#1b2330')
      },
      _hudKey: 'kit:equilibrista:' + (++_casualKitSequence)
    };
    _stickPathReset(path);
    return path;
  }
  // Re-sincroniza a geometria quando o tamanho LÓGICO do palco muda (inclusive
  // quando o caminho foi criado ANTES do "Preparar a tela" — tudo rescala).
  function _stickPathSync(path) {
    var nextW = stageW(path.ctx), nextH = stageH(path.ctx);
    if (!nextW || !nextH || (nextW === path.w && nextH === path.h)) return;
    if (!path.w || !path.h) {
      path.w = nextW; path.h = nextH;
      path.cfg = _stickPathConfig(nextW, nextH);
      _stickPathReset(path);
      return;
    }
    var scaleX = nextW / path.w, scaleY = nextH / path.h;
    for (var i = 0; i < path.platforms.length; i++) {
      path.platforms[i].x *= scaleX;
      path.platforms[i].w *= scaleX;
    }
    for (var j = 0; j < path.sticks.length; j++) {
      path.sticks[j].x *= scaleX;
      path.sticks[j].length *= scaleX;
    }
    for (var k = 0; k < path.trees.length; k++) path.trees[k].x *= scaleX;
    path.heroX *= scaleX;
    path.heroY *= scaleY;
    path.sceneOffset *= scaleX;
    path.paddingX *= scaleX;
    path.w = nextW;
    path.h = nextH;
    path.cfg = _stickPathConfig(nextW, nextH);
  }
  function shHitPlatform(path) {
    var st = path.sticks[path.sticks.length - 1];
    var far = st.x + st.length;
    var p = path.cfg.perfect;
    for (var i = 0; i < path.platforms.length; i++) {
      var pl = path.platforms[i];
      if (pl.x < far && far < pl.x + pl.w) {
        var mid = pl.x + pl.w / 2;
        var perfect = (mid - p / 2 < far) && (far < mid + p / 2);
        return { platform: pl, perfect: perfect };
      }
    }
    return { platform: null, perfect: false };
  }
  // CRESCER: chamado enquanto a criança quiser esticar (ex.: se o mouse estiver
  // segurado). Em "waiting" começa a esticar na hora; fora disso é inofensivo.
  function stickPathGrow(path, speed) {
    if (!path) return;
    _stickPathSync(path);
    var dt = _kitDt(path, '_lastGrow') * _kitSpeedMultiplier(speed);
    if (path.phase === 'waiting') path.phase = 'stretching';
    if (path.phase !== 'stretching') return;
    var st = path.sticks[path.sticks.length - 1];
    st.length += path.cfg.stretch * dt;
  }
  // DERRUBAR: solta o bastão (só faz efeito se estava esticando).
  function stickPathDrop(path) {
    if (!path) return;
    _stickPathSync(path);
    if (path.phase === 'stretching') path.phase = 'turning';
  }
  // ANDAR: o bastão derrubado gira até deitar, o acerto é resolvido (eventos de
  // atravessar/perfeito, SEM somar pontos — o placar é da criança), e o herói
  // anda, atravessa (o mundo desliza) ou cai. Posiciona o SPRITE em coords de
  // tela — o "Desenhar o sprite" genérico desenha o herói no lugar certo.
  function stickPathWalk(path, hero, speed) {
    if (!path) return;
    _stickPathSync(path);
    var dt = _kitDt(path, '_lastWalk') * _kitSpeedMultiplier(speed);
    var cfg = path.cfg;
    var st = path.sticks[path.sticks.length - 1];
    var heroW = (hero && hero.w) || 12;
    var heroH = (hero && hero.h) || 24;
    if (path.phase === 'turning') {
      st.rotation += cfg.turn * dt;
      if (st.rotation >= 90) {
        st.rotation = 90;
        var hit = shHitPlatform(path);
        if (hit.platform) {
          shGeneratePlatform(path); shGenerateTree(path); shGenerateTree(path);
          _kitFireHandlers(path, '_onCross', '_onCrossOrder', '"Quando o equilibrista atravessar uma plataforma"');
          if (hit.perfect) {
            _kitFireHandlers(path, '_onPerfect', '_onPerfectOrder', '"Quando o equilibrista acertar bem no meio"');
          }
        }
        path.phase = 'walking';
      }
    } else if (path.phase === 'walking') {
      path.heroX += cfg.walk * dt;
      var hw = shHitPlatform(path);
      if (hw.platform) {
        var maxX = hw.platform.x + hw.platform.w - cfg.heroEdge;
        if (path.heroX > maxX) { path.heroX = maxX; path.phase = 'transitioning'; }
      } else {
        var maxX2 = st.x + st.length + heroW;
        if (path.heroX > maxX2) { path.heroX = maxX2; path.phase = 'falling'; }
      }
    } else if (path.phase === 'transitioning') {
      path.sceneOffset += cfg.trans * dt;
      var ht = shHitPlatform(path);
      if (ht.platform) {
        var goal = ht.platform.x + ht.platform.w - path.paddingX;
        if (path.sceneOffset > goal) {
          path.sceneOffset = goal;
          path.sticks.push({ x: ht.platform.x + ht.platform.w, length: 0, rotation: 0 });
          path.phase = 'waiting';
        }
      } else { path.phase = 'waiting'; }
    } else if (path.phase === 'falling') {
      if (st.rotation < 180) st.rotation += cfg.turn * dt;
      path.heroY += cfg.fall * dt;
      if (path.heroY > path.h) path.phase = 'over';
    }
    if (hero) {
      var top = path.h - cfg.platformH;
      hero.x = path.heroX - path.sceneOffset - heroW / 2;
      hero.y = top - heroH + path.heroY;
    }
  }
  function shDrawHill(path, fromBottom, amp, color) {
    var ctx = path.ctx, w = path.w, h = path.h;
    var baseY = h - fromBottom;
    var off = path.sceneOffset * 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (var x = 0; x <= w; x += 14) ctx.lineTo(x, baseY - Math.sin((x + off) * 0.02) * amp);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  // CENÁRIO: céu + colinas + árvores no tamanho LÓGICO vigente do palco (o
  // gradiente cobre a tela inteira; funciona com ou sem o "Limpar a tela").
  function stickPathScenery(path) {
    if (!path) return;
    _stickPathSync(path);
    var ctx = path.ctx, w = path.w, h = path.h;
    ctx.save();
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#BBD691');
    sky.addColorStop(1, '#FEF1E1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    shDrawHill(path, h * 0.30, h * 0.05, '#95C629');
    shDrawHill(path, h * 0.22, h * 0.08, '#659F1C');
    var baseY = h - path.cfg.platformH - 2;
    for (var i = 0; i < path.trees.length; i++) {
      var tr = path.trees[i];
      var x = tr.x - path.sceneOffset * 0.2;
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
    ctx.restore();
  }
  // DESENHO das regras: plataformas (com a marca do acerto perfeito) e bastões,
  // nas cores do caminho. O herói é desenhado pelo "Desenhar o sprite" genérico.
  function stickPathDraw(path) {
    if (!path) return;
    _stickPathSync(path);
    var ctx = path.ctx, cfg = path.cfg, w = path.w, h = path.h;
    var top = h - cfg.platformH;
    ctx.save();
    ctx.translate(-path.sceneOffset, 0);
    for (var i = 0; i < path.platforms.length; i++) {
      var pl = path.platforms[i];
      ctx.fillStyle = path.colors.platform;
      ctx.fillRect(pl.x, top, pl.w, cfg.platformH);
      if (path.sticks[path.sticks.length - 1].x < pl.x) {
        ctx.fillStyle = '#e23b3b';
        ctx.fillRect(pl.x + pl.w / 2 - cfg.perfect / 2, top, cfg.perfect, cfg.perfect);
      }
    }
    for (var k = 0; k < path.sticks.length; k++) {
      var s = path.sticks[k];
      ctx.save();
      ctx.translate(s.x, top);
      ctx.rotate((Math.PI / 180) * s.rotation);
      ctx.strokeStyle = path.colors.stick;
      ctx.lineWidth = Math.max(2, w * 0.008);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s.length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    var hudParts = [];
    if (path.phase === 'waiting') hudParts.push('Segure para esticar o bastão');
    else if (path.phase === 'over') hudParts.push('Caiu!');
    _updateAccessibleHud(path._hudKey, hudParts.join('. '));
  }
  function stickPathOnCross(path, fn, explicitId) {
    _kitRegisterHandler(path, '_onCross', '_onCrossOrder', 'equilibrista-atravessou', fn, explicitId);
  }
  function stickPathOnPerfect(path, fn, explicitId) {
    _kitRegisterHandler(path, '_onPerfect', '_onPerfectOrder', 'equilibrista-perfeito', fn, explicitId);
  }
  function stickPathFell(path) { return path ? path.phase === 'over' : false; }

  // ============================================================
  // 🎈 Balão — o BALÃO é um sprite (com combustível); as árvores moram no CAMINHO.
  // ============================================================
  function createBalloon(opts) {
    opts = opts || {};
    var s = createSprite({
      x: opts.x, y: opts.y,
      w: _positiveFiniteNumber(opts.w, 70),
      h: _positiveFiniteNumber(opts.h, 100),
      color: opts.body || '#D62828'
    });
    s.skin = {
      kind: 'balloon',
      body: _kitColor(opts.body, '#D62828'),
      basket: _kitColor(opts.basket, '#8a5a2b')
    };
    s._fuel = 100;
    s._fire = 0;
    return s;
  }
  // Balão desenhado na caixa do sprite (dispatch em sprites): envelope, cordas,
  // cesto e a chama quando o fogo está aceso.
  function drawBalloonSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var body = sk.body || sprite.color || '#D62828';
    var basket = sk.basket || '#8a5a2b';
    var w = sprite.w, h = sprite.h;
    var x = sprite.x + w / 2;
    var by = sprite.y + h;
    var R = Math.min(w / 2, h / 3);
    ctx.save();
    if (sprite._fire > 0) {
      ctx.fillStyle = '#ff9d2e';
      ctx.beginPath();
      ctx.arc(x, by - R * 0.6, R * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath();
      ctx.arc(x, by - R * 0.55, R * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
    var cy = by - R * 2.0;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - R * 0.4, by - R * 0.95);
    ctx.quadraticCurveTo(x - R, cy + R * 0.7, x - R, cy);
    ctx.arc(x, cy, R, Math.PI, 0, false);
    ctx.quadraticCurveTo(x + R, cy + R * 0.7, x + R * 0.4, by - R * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, R * 0.04);
    ctx.beginPath();
    ctx.moveTo(x - R * 0.3, by - R * 0.95); ctx.lineTo(x - R * 0.22, by - R * 0.3);
    ctx.moveTo(x + R * 0.3, by - R * 0.95); ctx.lineTo(x + R * 0.22, by - R * 0.3);
    ctx.stroke();
    ctx.fillStyle = basket;
    ctx.fillRect(x - R * 0.28, by - R * 0.3, R * 0.56, R * 0.3);
    ctx.restore();
  }
  function _kitGroundY(h) { return h * 0.82; }
  // FOGO: empurra o balão para cima e queima combustível (mais alto, mais
  // gasto). Chame enquanto a criança quiser subir (ex.: se o mouse estiver
  // segurado). Sem combustível, o fogo não acende.
  function balloonFire(balloon, force) {
    if (!balloon) return;
    if (balloon._fuel == null) { balloon._fuel = 100; balloon._fire = 0; }
    var h = _kitStageH();
    var dt = _kitDt(balloon, '_lastFire');
    var step = dt * 60 * _kitSpeedMultiplier(force);
    if (balloon._fuel <= 0) return;
    var maxRise = h * 0.013;
    if (balloon.vy > -maxRise) balloon.vy -= h * 0.0011 * step;
    var groundY = _kitGroundY(h);
    var altitude = (groundY - (balloon.y + balloon.h)) / groundY;
    if (altitude < 0) altitude = 0;
    balloon._fuel -= (0.06 + altitude * 0.10) * step;
    if (balloon._fuel < 0) balloon._fuel = 0;
    balloon._fire = 3;
  }
  // VOAR: a gravidade suave puxa o balão para baixo quando o fogo não está
  // aceso, e ele pousa no chão (nunca afunda).
  function balloonFly(balloon) {
    if (!balloon) return;
    var h = _kitStageH();
    var dt = _kitDt(balloon, '_lastFly');
    var step = dt * 60;
    var maxFall = h * 0.009;
    if (balloon._fire > 0) {
      balloon._fire -= 1;
    } else if (balloon.vy < maxFall) {
      balloon.vy += h * 0.0006 * step;
    }
    balloon.y += balloon.vy * step;
    var groundY = _kitGroundY(h);
    if (balloon.y + balloon.h > groundY) {
      balloon.y = groundY - balloon.h;
      balloon.vy = 0;
    }
  }
  function blMakeTree(path, fromX) {
    var w = path.w;
    var gap = w * 0.45 + Math.random() * w * 1.1;
    var th = path.h * (0.16 + Math.random() * 0.22);
    var colors = ['#6D8821', '#8FAC34', '#98B333'];
    return { x: fromX + gap, th: th, color: colors[Math.floor(Math.random() * 3)] };
  }
  function createBalloonPath(ctx) {
    if (!ctx || !ctx.canvas) return null;
    var w = stageW(ctx), h = stageH(ctx);
    var path = {
      ctx: ctx,
      w: w,
      h: h,
      dist: 0,
      meters: 0,
      hVel: Math.max(2, w * 0.006),
      trees: [],
      _lastScroll: 0,
      _hitLatch: false,
      _hudKey: 'kit:balao:' + (++_casualKitSequence)
    };
    var fromX = w;
    for (var i = 0; i < 6; i++) { var t = blMakeTree(path, fromX); path.trees.push(t); fromX = t.x; }
    return path;
  }
  function _balloonPathSync(path) {
    var nextW = stageW(path.ctx), nextH = stageH(path.ctx);
    if (!nextW || !nextH || (nextW === path.w && nextH === path.h)) return;
    if (!path.w || !path.h) { path.w = nextW; path.h = nextH; return; }
    var scaleX = nextW / path.w, scaleY = nextH / path.h;
    for (var i = 0; i < path.trees.length; i++) {
      path.trees[i].x *= scaleX;
      path.trees[i].th *= scaleY;
    }
    path.dist *= scaleX;
    path.hVel *= scaleX;
    path.w = nextW;
    path.h = nextH;
  }
  function blCircle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function blHill(path, fromBottom, amp, color, par) {
    var ctx = path.ctx, w = path.w, h = path.h;
    var baseY = h - fromBottom;
    var off = path.dist * par;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (var x = 0; x <= w; x += 14) ctx.lineTo(x, baseY - Math.sin((x + off) * 0.015) * amp);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  // CENÁRIO: céu + colinas + chão + árvores no tamanho LÓGICO vigente do palco.
  function balloonPathScenery(path) {
    if (!path) return;
    _balloonPathSync(path);
    var ctx = path.ctx, w = path.w, h = path.h;
    ctx.save();
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#AADBEA');
    sky.addColorStop(1, '#FEF1E1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    blHill(path, h * 0.30, h * 0.05, '#AAD155', 0.2);
    blHill(path, h * 0.20, h * 0.07, '#84B249', 0.4);
    var groundY = _kitGroundY(h);
    ctx.fillStyle = '#5fa24a';
    ctx.fillRect(0, groundY + h * 0.02, w, h);
    var baseY = groundY + h * 0.02;
    for (var i = 0; i < path.trees.length; i++) {
      var tr = path.trees[i];
      var x = tr.x - path.dist;
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
    ctx.restore();
  }
  // AVANÇAR: o mundo anda para trás enquanto o balão está no ar, os metros
  // contam, as árvores reciclam e a batida é conferida com o RETÂNGULO do
  // sprite (dispara o evento a cada novo toque; a criança decide o que fazer).
  function balloonPathScroll(path, balloon, speed) {
    if (!path) return;
    _balloonPathSync(path);
    var w = path.w, h = path.h;
    var dt = _kitDt(path, '_lastScroll');
    var step = dt * 60 * _kitSpeedMultiplier(speed);
    var groundY = _kitGroundY(h);
    var airborne = balloon ? (balloon.y + balloon.h) < groundY - 1 : false;
    if (airborne) path.dist += path.hVel * step;
    path.meters = Math.floor(path.dist / (w * 0.03));
    if (path.trees.length && (path.trees[0].x - path.dist) < -80) {
      path.trees.shift();
      var lastT = path.trees[path.trees.length - 1];
      path.trees.push(blMakeTree(path, lastT ? lastT.x : path.dist + w));
    }
    var hit = false;
    if (balloon) {
      var baseY = groundY + h * 0.02;
      for (var i = 0; i < path.trees.length; i++) {
        var tr = path.trees[i];
        var tx = tr.x - path.dist;
        var half = Math.max(w * 0.02, tr.th * 0.35);
        var topY = baseY - tr.th;
        if (balloon.x < tx + half && balloon.x + balloon.w > tx - half && balloon.y + balloon.h > topY) {
          hit = true;
          break;
        }
      }
    }
    if (hit && !path._hitLatch) {
      _kitFireHandlers(path, '_onTreeHit', '_onTreeHitOrder', '"Quando o balão bater numa árvore"');
    }
    path._hitLatch = hit;
    if (balloon) {
      var hudParts = [
        'Distância: ' + path.meters + ' metros',
        'Combustível: ' + Math.round(balloon._fuel == null ? 100 : balloon._fuel) + ' de 100'
      ];
      if (!airborne && path.dist === 0) {
        hudParts.push('Segure para subir; voe baixo para poupar combustível');
      }
      _updateAccessibleHud(path._hudKey, hudParts.join('. '));
    }
  }
  function balloonPathOnTreeHit(path, fn, explicitId) {
    _kitRegisterHandler(path, '_onTreeHit', '_onTreeHitOrder', 'balao-bateu', fn, explicitId);
  }
  function balloonPathMeters(path) { return path ? path.meters : 0; }
  function balloonFuel(balloon) {
    if (!balloon) return 0;
    return Math.round(balloon._fuel == null ? 100 : balloon._fuel);
  }
  function balloonLandedOut(balloon) {
    if (!balloon) return false;
    var groundY = _kitGroundY(_kitStageH());
    return (balloon._fuel != null && balloon._fuel <= 0) && (balloon.y + balloon.h) >= groundY - 1;
  }

  _registerRuntimeDomain('casual-kits', {
    reset: function () { _casualKitSequence = 0; }
  });

`
