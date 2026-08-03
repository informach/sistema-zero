export const gameTwoDCasualKitsBalloonRuntime = `  // ============================================================
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
      trees: /** @type {Array<{ x: number, th: number, color: string }>} */ ([]),
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
  function balloonPathOnTreeHit(path, fn, id) {
    _kitRegisterHandler(path, '_onTreeHit', '_onTreeHitOrder', 'balao-bateu', fn, id);
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
