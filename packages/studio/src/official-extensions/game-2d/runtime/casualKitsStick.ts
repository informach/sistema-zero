export const gameTwoDCasualKitsStickRuntime = `  // ============================================================
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
    path._pendingCross = null;
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
  // ANDAR: o bastão derrubado gira até deitar, o acerto é guardado, e o herói
  // anda. Os eventos de atravessar/perfeito disparam quando ele alcança a outra
  // plataforma (SEM somar pontos — o placar é da criança). Posiciona o SPRITE em coords de
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
          path._pendingCross = { perfect: hit.perfect };
        } else {
          path._pendingCross = null;
        }
        path.phase = 'walking';
      }
    } else if (path.phase === 'walking') {
      path.heroX += cfg.walk * dt;
      var hw = shHitPlatform(path);
      if (hw.platform) {
        var maxX = hw.platform.x + hw.platform.w - cfg.heroEdge;
        if (path.heroX > maxX) {
          path.heroX = maxX;
          path.phase = 'transitioning';
          if (hero) {
            var reachedTop = path.h - cfg.platformH;
            hero.x = path.heroX - path.sceneOffset - heroW / 2;
            hero.y = reachedTop - heroH + path.heroY;
          }
          var pendingCross = path._pendingCross;
          path._pendingCross = null;
          if (pendingCross) {
            var interrupted = _kitFireHandlers(path, '_onCross', '_onCrossOrder', '"Quando o equilibrista atravessar uma plataforma"');
            if (interrupted) return;
            if (pendingCross.perfect) {
              interrupted = _kitFireHandlers(path, '_onPerfect', '_onPerfectOrder', '"Quando o equilibrista acertar bem no meio"');
              if (interrupted) return;
            }
          }
        }
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
  function stickPathOnCross(path, fn, id) {
    _kitRegisterHandler(path, '_onCross', '_onCrossOrder', 'equilibrista-atravessou', fn, id);
  }
  function stickPathOnPerfect(path, fn, id) {
    _kitRegisterHandler(path, '_onPerfect', '_onPerfectOrder', 'equilibrista-perfeito', fn, id);
  }
  function stickPathFell(path) { return path ? path.phase === 'over' : false; }

`
