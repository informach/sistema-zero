/** Moldes, criação, visitas e recolhimento compartilham o ciclo de vida do pool. */
export const gameKitPoolsRuntime = `
  // ---- 👾 Moldes, pools e spawner (data-driven + ObjectPooler do P24) ----
  /** Entidade nova com TODAS as propriedades (hidden class estável p/ o pool). */
  function blankEntity() {
    return {
      x: 0, y: 0, w: 0, h: 0,
      speed: 0, speedMultiplier: 1, damage: 0, color: '', image: '', look: '', radius: 0,
      health: 0, maxHealth: 0,
      vx: 0, vy: 0,
      _active: false, _facingLeft: false, _facingDir: 'down', _iFrames: 0,
      _pushX: 0, _pushY: 0, _driftAngle: null, _mold: '',
      _angle: 0,
      _sheetImg: '', _sheetFw: 0, _sheetFh: 0,
      _animFrom: 0, _animTo: 0, _animFps: 0, _animStart: 0,
      _walkImg: '', _walkFw: 0, _walkFh: 0, _walkFrames: 0, _walkFps: 6,
      _lastX: 0, _lastY: 0, _moving: false, _moveFrame: -1,
      _swingT: 0, _swingRange: 0, _swingId: 0, _hitBySwing: 0,
      // ⚙️ Física geral (o pool exige a lista COMPLETA: ver o reset no spawnFromMold)
      onGround: false, _maxFall: 0, _cd: 0, _prevX: 0, _prevY: 0,
      _sweepFromY: 0, _sweepFrame: -1,
      // 🏃 Kit Plataforma (idem — reciclar sem zerar ressuscitaria o inimigo com o
      // coyote/pulo do anterior)
      _bornX: 0, _bornY: 0, _coyoteT: 0, _bufferT: 0, _holdT: 0, _airJumps: 0,
      _wallDir: 0, _wallSide: 0, _wallT: 0, _wallLockT: 0, _dropT: 0,
      _platT: 0, _carryX: 0, _carryY: 0, _patrolDir: 0, _patrolWas: 0,
      _platFrames: null,
      // Nasciam por atribuição TARDIA (no drift/patrolAround) — o que anula o
      // propósito desta função: toda entidade que anda mudava de shape.
      _driftTimer: 0, _patrolTX: 0, _patrolTY: 0, _patrolTimer: 0,
      // 🌫️ R15: opacidade (1 = opaco) e a caixa que COLIDE (0 = usa o desenho).
      opacity: 1, _hbX: 0, _hbY: 0, _hbW: 0, _hbH: 0, _hbShape: '',
      // ✨/🎨 R21: rastro contínuo e inclinação ao andar (reciclar sem zerar
      // deixaria o inimigo novo nascer soltando o jato do anterior, tombado).
      _trailOn: false, _trailColor: '', _trailSize: 3, _trailRate: 30,
      _trailLife: 0.4, _trailAcc: 0, _trailFrame: -1, _leanMax: 0, _leanNow: 0,
      // 🚀 R22: o carimbo da onda (reciclado NÃO marcha na formação fantasma),
      // o poder de tiro e a marca de bomba do kit.
      _wave: 0, _gunMode: '', _gunT: 0, _naveBomb: false,
      // 🛤️ R25: waypoint atual (reciclado NÃO herda a rota do dono anterior).
      _pathName: '', _pathIdx: 0, _pathDone: false,
      // 🏰 R26: carimbo da onda de TD (anti-fantasma).
      _tdWave: 0,
      // 🥷 R18: a janela do golpe (recuo/ativo em segundos; 0/0 = o golpe inteiro
      // machuca, que é o comportamento de sempre) e o ESTADO com a trava de
      // animação. Reciclar sem zerar deixaria o inimigo novo nascer "golpeando",
      // ou travado no estado de morte do anterior.
      _swingStart: 0, _swingActive: 0, _swingDur: 0,
      _animOnce: false, _animState: '',
      _state: '', _stateUntil: 0, _stateAnims: null, _stateLooks: null
    };
  }
  function defineMold(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o molde" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    ensureImageLoaded(o.image); // a imagem do molde (Pinta) carrega sozinha
    var w = num(o.w, 40), h = num(o.h, 40);
    molds[k] = {
      w: w, h: h,
      health: num(o.health, 20),
      speed: num(o.speed, 120),
      damage: num(o.damage, 10),
      color: text(o.color, '#e94f4f'),
      image: text(o.image, ''),
      look: text(o.look, ''),
      // A forma vale para TODO mundo que nascer deste molde (é assim que tiro e
      // inimigo ficam redondos: eles não têm nome p/ receber um bloco próprio).
      shape: text(o.shape, '') === 'circulo' ? 'circulo' : '',
      radius: 0
    };
    if (!pools[k]) pools[k] = { active: [], free: [], _sweeping: false };
    // Pré-aquece o pool (P24 pré-cria 10): as primeiras ondas não alocam no loop.
    while (pools[k].free.length + pools[k].active.length < 8) {
      pools[k].free.push(blankEntity());
    }
  }
  function spawnFromMold(name, x, y) {
    var k = text(name, '');
    var m = molds[k];
    if (!m) { warnOnce('mold:' + k, 'molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var pool = pools[k] || (pools[k] = { active: [], free: [], _sweeping: false });
    // Teto por molde (as faíscas já tinham o MAX_PARTICLES): um nascedouro SEM o
    // "Recolher quem saiu da tela" acumulava entidades para sempre e derrubava o
    // FPS sem nenhum aviso — o jogo só ficava lento, off-screen.
    if (pool.active.length >= MAX_ACTIVE_PER_MOLD) {
      warnOnce('moldfull:' + k, 'o molde "' + k + '" chegou a ' + MAX_ACTIVE_PER_MOLD +
        ' no jogo — use "Recolher quem saiu da tela" junto do nascedouro');
      return null;
    }
    // A collected source still names its surviving track copies. Do not reuse that
    // identity for another wave until the family has gone away.
    var freeIndex = pool.free.length - 1;
    while (freeIndex >= 0 && _spriteScene.retains(pool.free[freeIndex])) freeIndex--;
    var e = freeIndex >= 0 ? pool.free.splice(freeIndex, 1)[0] : null;
    if (!e) e = blankEntity();
    e.x = num(x, 0); e.y = num(y, 0);
    e.w = m.w; e.h = m.h;
    e.speed = m.speed; e.speedMultiplier = 1; e.damage = m.damage; e.color = m.color;
    e.image = m.image; e.look = m.look; e.radius = m.radius; e._hbShape = m.shape || '';
    e.health = m.health; e.maxHealth = m.health;
    e._active = true; e._facingLeft = false; e._facingDir = 'down'; e._iFrames = 0;
    e._pushX = 0; e._pushY = 0; e._driftAngle = null; e._mold = k;
    e.vx = 0; e.vy = 0; e._angle = 0;
    e._sheetImg = ''; e._sheetFw = 0; e._sheetFh = 0;
    e._animFrom = 0; e._animTo = 0; e._animFps = 0; e._animStart = 0;
    e._walkImg = ''; e._walkFw = 0; e._walkFh = 0; e._walkFrames = 0; e._walkFps = 6;
    e._lastX = e.x; e._lastY = e.y; e._moving = false; e._moveFrame = -1;
    // Zera o golpe de ação (senão uma entidade reciclada carrega o rastro/latch).
    e._swingT = 0; e._swingRange = 0; e._swingId = 0; e._hitBySwing = 0;
    // R18: janela do golpe + estado/trava de animação (ver blankEntity).
    e._swingStart = 0; e._swingActive = 0; e._swingDur = 0;
    e._animOnce = false; e._animState = '';
    e._state = ''; e._stateUntil = 0; e._stateAnims = null; e._stateLooks = null;
    // ⚙️ Física: reciclado NÃO pode nascer "no chão" nem com recarga/varredura velhas.
    e.onGround = false; e._maxFall = 0; e._cd = 0; e._prevX = e.x; e._prevY = e.y;
    e._sweepFromY = e.y; e._sweepFrame = -1;
    e._bornX = e.x; e._bornY = e.y;
    e._coyoteT = 0; e._bufferT = 0; e._holdT = 0; e._airJumps = 0;
    e._wallDir = 0; e._wallSide = 0; e._wallT = 0; e._wallLockT = 0; e._dropT = 0;
    e._platT = 0; e._carryX = 0; e._carryY = 0; e._patrolDir = 0; e._patrolWas = 0;
    e._platFrames = null;
    e._driftTimer = 0; e._patrolTX = 0; e._patrolTY = 0; e._patrolTimer = 0;
    e.opacity = 1; e._hbX = 0; e._hbY = 0; e._hbW = 0; e._hbH = 0;
    // R21: rastro/lean (ver blankEntity — o contrato exige o par).
    e._trailOn = false; e._trailColor = ''; e._trailSize = 3; e._trailRate = 30;
    e._trailLife = 0.4; e._trailAcc = 0; e._trailFrame = -1; e._leanMax = 0; e._leanNow = 0;
    // R22: sem carimbo de onda, sem poder, sem marca de bomba.
    e._wave = 0; e._gunMode = ''; e._gunT = 0; e._naveBomb = false;
    e._pathName = ''; e._pathIdx = 0; e._pathDone = false; // 🛤️ R25
    e._tdWave = 0; // 🏰 R26
    pool.active.push(e);
    return e;
  }
  function spawnAtEdge(name) {
    // Margem de nascimento 100 = ENEMY_SPAWN_MARGIN do P24. Com câmera, nasce
    // nas bordas do retângulo VISÍVEL (o inimigo sempre entra "por perto").
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    var edge = Math.floor(gameRandom() * 4);
    var x, y;
    if (edge === 0) { x = ox + gameRandom() * config.w; y = oy - 100; }
    else if (edge === 1) { x = ox + config.w + 100; y = oy + gameRandom() * config.h; }
    else if (edge === 2) { x = ox + gameRandom() * config.w; y = oy + config.h + 100; }
    else { x = ox - 100; y = oy + gameRandom() * config.h; }
    return spawnFromMold(name, x, y);
  }
  function recycle(e) {
    if (!e || typeof e !== 'object') return;
    if (!e._mold) {
      // Dedupado: "Recolher" num personagem criado à mão dentro de uma checagem
      // de colisão sairia 60×/s.
      warnOnce('recycle:nomold', 'só personagens nascidos de um molde podem ser recolhidos');
      return;
    }
    _spriteScene.release(e);
    e._active = false;
    var pool = pools[e._mold];
    if (!pool) return;
    // Dentro de uma varredura (forEachActive/cull), a compactação reversa cuida
    // da devolução. FORA dela (botão, aviso, quando-entrar), devolvemos AGORA —
    // senão a entidade ficava em active[] para sempre (nunca reusada).
    if (!pool._sweeping) {
      var idx = pool.active.indexOf(e);
      if (idx > -1) {
        pool.active.splice(idx, 1);
        pool.free.push(e);
      }
    }
  }
  function compact(pool) {
    // Move os inativos do active[] para o free[] (varredura reversa, estilo P24).
    for (var i = pool.active.length - 1; i >= 0; i--) {
      if (!pool.active[i]._active) {
        var dead = pool.active[i];
        _spriteScene.release(dead);
        pool.active.splice(i, 1);
        pool.free.push(dead);
      }
    }
  }
  function releaseAll(pool) {
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      _spriteScene.release(e);
      e._active = false;
      e._iFrames = 0;
      e._pushX = 0;
      e._pushY = 0;
      pool.free.push(e);
    }
    pool.active.length = 0;
  }
  function forEachActive(name, fn) {
    var pool = pools[text(name, '')];
    if (!pool || typeof fn !== 'function') return;
    // Ordem REVERSA: recolher/remover durante o laço é seguro.
    pool._sweeping = true;
    var warned = false;
    for (var i = pool.active.length - 1; i >= 0; i--) {
      var e = pool.active[i];
      if (!e._active) continue;
      try {
        fn(e);
      } catch (err) {
        // Avisa UMA vez por chamada (o laço roda por quadro × N vivos — sem isso
        // um erro no corpo afoga o Console com 60·n avisos/s).
        if (!warned) {
          warned = true;
          warn('erro no "para cada vivo": ' + err);
        }
      }
    }
    pool._sweeping = false;
    compact(pool);
  }
  function cullOffscreen(name, margin) {
    var pool = pools[text(name, '')];
    if (!pool) return;
    // Default 200 = margem de despawn do P24 (spawn nas bordas usa 100). Com a
    // câmera ligada, "tela" = o retângulo VISÍVEL (senão o mundo inteiro sumia).
    var m = num(margin, 200);
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    pool._sweeping = true;
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      var outside = _spriteScene.owns(e) ? _spriteScene.offscreen(e, m) :
        e.x < ox - m || e.x > ox + config.w + m || e.y < oy - m || e.y > oy + config.h + m;
      if (outside) {
        recycle(e);
      }
    }
    pool._sweeping = false;
    compact(pool);
  }
  function drawActive(name) {
    var pool = pools[text(name, '')];
    if (!pool) return;
    for (var i = 0; i < pool.active.length; i++) {
      if (pool.active[i]._active) drawEntity(pool.active[i]);
    }
  }
  /**
   * O vivo do molde MAIS PERTO de um ponto (ou null). Nao havia acumulador de
   * minimo: a torre que escolhe o alvo (tower defense) e a IA de horda eram
   * inexprimiveis - a crianca so conseguia "o primeiro que encostar".
   */
  function nearestActive(moldName, x, y) {
    var k = text(moldName, '');
    var pool = pools[k];
    if (!pool) { warnOnce('nearest:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var px = num(x, 0), py = num(y, 0);
    var best = null, bestD = Infinity;
    var act = pool.active;
    for (var i = 0; i < act.length; i++) {
      var e = act[i];
      if (!e || e._active === false) continue;
      var dx = centerX(e) - px, dy = centerY(e) - py;
      var d = dx * dx + dy * dy; // sem sqrt: comparar quadrados basta e e mais rapido
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  /**
   * 🎲 R21: um vivo QUALQUER do molde (ou null). E o "um invasor aleatorio atira"
   * do Space Invaders — e loot/IA de horda em qualquer genero. Sorteio em duas
   * passadas (conta -> k-esimo), zero alocacao.
   */
  function randomActive(moldName) {
    var k = text(moldName, '');
    var pool = pools[k];
    if (!pool) { warnOnce('random:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var act = pool.active;
    var n = 0;
    var i;
    for (i = 0; i < act.length; i++) {
      if (act[i] && act[i]._active !== false) n++;
    }
    if (!n) return null;
    var pick = Math.floor(gameRandom() * n);
    for (i = 0; i < act.length; i++) {
      var e = act[i];
      if (!e || e._active === false) continue;
      if (pick === 0) return e;
      pick--;
    }
    return null;
  }
  /**
   * 🎲 R25 — o vivo do molde com a MAIOR/MENOR de uma propriedade (ou 'progresso
   * no caminho'). Generaliza nearest/random: o alvo "mais avançado no caminho"
   * do Tower Defense sai DE GRAÇA daqui ("genérico primeiro"). Varredura sem
   * alocação (irmã do nearestActive).
   */
  function pickActive(moldName, mode, prop) {
    var k = text(moldName, '');
    var pool = pools[k];
    if (!pool) { warnOnce('pick:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var wantMax = text(mode, 'maior') !== 'menor';
    var p = text(prop, 'x');
    var isPath = p === 'pathProgress';
    var act = pool.active;
    var best = null, bestV = wantMax ? -Infinity : Infinity;
    for (var i = 0; i < act.length; i++) {
      var e = act[i];
      if (!e || e._active === false) continue;
      var v = isPath ? pathProgress(e) : (ENTITY_PROPS[p] ? num(e[p], 0) : 0);
      if ((wantMax && v > bestV) || (!wantMax && v < bestV)) { bestV = v; best = e; }
    }
    return best;
  }
  function countActive(name) {
    var pool = pools[text(name, '')];
    if (!pool) return 0;
    var n = 0;
    for (var i = 0; i < pool.active.length; i++) {
      if (pool.active[i]._active) n++;
    }
    return n;
  }

`
