export const gameTwoDArcadeKitsRuntime = `  // ---- Kit "Nave & Asteroides" (v0.7.0): desenhos prontos + efeitos ----
  // Um sprite pode ter um "skin" (sprite.skin) que muda o jeito que ele é
  // desenhado. drawSprite despacha: skin 'ship' -> nave; 'asteroid' -> asteroide.
  // Assim o mesmo modelo de sprite (x/y/w/h/vx/vy) ganha o visual do jogo.

  /** Cria uma nave (corpo + asas customizáveis; cabine e foguinho fixos, animados). */
  function createShip(opts) {
    opts = opts || {};
    var s = createSprite({ x: opts.x, y: opts.y, w: opts.w, h: opts.h, color: opts.body });
    s.skin = { kind: 'ship', body: opts.body || '#35e8ff', wings: opts.wings || '#2568ff' };
    return s;
  }
  /**
   * Desenha a nave centrada na caixa do sprite, na escala da largura (w=54 => 1:1
   * com o desenho de referência). O foguinho pulsa com o tempo (animação embutida);
   * o corpo usa a cor "body" e as asas a cor "wings"; cabine fixa.
   */
  function drawShip(ctx, sprite) {
    var sk = sprite.skin || {};
    var cx = sprite.x + sprite.w / 2;
    var cy = sprite.y + sprite.h / 2;
    // Escala para a nave INTEIRA (ponta de asa a ponta de asa = 96 no desenho de
    // referência) caber na largura da caixa — assim ela fica proporcional aos
    // outros objetos (não estoura a própria caixa) e a colisão bate com o visual.
    var s = (sprite.w || 54) / 96;
    var oy = -17; // desloca o desenho de referência p/ centralizar na caixa
    var flame = 22 + Math.sin(now() * 0.015) * 5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    // foguinho (laranja)
    ctx.fillStyle = '#ffb13b';
    ctx.beginPath();
    ctx.moveTo(0, oy + 42);
    ctx.lineTo(-11, oy + 66);
    ctx.lineTo(11, oy + 66);
    ctx.closePath();
    ctx.fill();
    // foguinho (vermelho, pulsando)
    ctx.fillStyle = '#ff5d3d';
    ctx.beginPath();
    ctx.moveTo(0, oy + 45);
    ctx.lineTo(-7, oy + flame + 58);
    ctx.lineTo(7, oy + flame + 58);
    ctx.closePath();
    ctx.fill();
    // corpo (cor customizada)
    ctx.fillStyle = sk.body || '#35e8ff';
    ctx.beginPath();
    ctx.moveTo(0, oy - 32);
    ctx.lineTo(-28, oy + 38);
    ctx.quadraticCurveTo(0, oy + 58, 28, oy + 38);
    ctx.closePath();
    ctx.fill();
    // asas (cor customizada)
    ctx.fillStyle = sk.wings || '#2568ff';
    ctx.beginPath();
    ctx.moveTo(-20, oy + 16);
    ctx.lineTo(-48, oy + 46);
    ctx.lineTo(-18, oy + 42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, oy + 16);
    ctx.lineTo(48, oy + 46);
    ctx.lineTo(18, oy + 42);
    ctx.closePath();
    ctx.fill();
    // cabine
    ctx.fillStyle = '#dffcff';
    ctx.beginPath();
    ctx.ellipse(0, oy + 2, 13, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(-4, oy - 4, 4, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Coloca no grupo um asteroide (polígono irregular que gira), com forma única. */
  function spawnAsteroid(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var base = _positiveFiniteNumber(opts.size, 36);
    // Cada asteroide nasce com um tamanho um pouco diferente (variedade automática).
    var size = Math.round(base * (0.65 + Math.random() * 0.5));
    var s = createSprite({ x: opts.x, y: opts.y, w: size, h: size, color: opts.color, vx: opts.vx, vy: opts.vy });
    s.skin = {
      kind: 'asteroid',
      color: opts.color || '#8d8f9b',
      sides: 7 + Math.floor(Math.random() * 3),
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.002
    };
    group.items.push(s);
    _touchGroup(group);
    return s;
  }
  /** Desenha o asteroide: polígono irregular (com "calombos") girando + crateras. */
  function drawAsteroidSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var cx = sprite.x + sprite.w / 2;
    var cy = sprite.y + sprite.h / 2;
    var radius = Math.min(sprite.w, sprite.h) / 2;
    var sides = sk.sides || 8;
    var angle = (sk.spin || 0) + now() * (sk.spinSpeed || 0);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = sk.color || '#8d8f9b';
    ctx.strokeStyle = '#d6d7df';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < sides; i++) {
      var a = (Math.PI * 2 / sides) * i;
      var bump = 0.78 + Math.sin(i * 12.98 + radius) * 0.22;
      var r = radius * bump;
      var px = Math.cos(a) * r;
      var py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.arc(-radius * 0.25, -radius * 0.1, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(radius * 0.25, radius * 0.18, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Explosão temática no centro do sprite (jato da cor + estilhaços cinza). */
  function explodeSprite(sprite, color) {
    if (!sprite) return;
    var cx = sprite.x + (sprite.w || 0) / 2, cy = sprite.y + (sprite.h || 0) / 2;
    emitParticles(cx, cy, 18, color || '#ffb13b');
    emitParticles(cx, cy, 10, '#d6d7df');
  }

  /** Som de tiro: blip curto descendo de tom. */
  function playShoot() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'square';
      var t = ctx.currentTime;
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      _startAudioSource(osc, t); osc.stop(t + 0.1);
    } catch (e) {}
  }
  /** Som de explosão: rajada de ruído filtrado que decai. */
  function playExplosion() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var dur = 0.3;
      var rate = ctx.sampleRate || 44100;
      var len = Math.floor(rate * dur);
      var buffer = ctx.createBuffer(1, len, rate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      var gain = ctx.createGain();
      var t = ctx.currentTime;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      _startAudioSource(src);
    } catch (e) {}
  }

  /**
   * Para cada sprite do grupo que encosta no sprite dado, roda fn(item). O sprite
   * entra como thunk (() => sprite). Varredura por quadro (use no "a cada quadro").
   */
  function overlapSpriteGroup(getSprite, group, fn) {
    if (typeof getSprite !== 'function' || !group || !group.items || typeof fn !== 'function') return;
    var generation = _driverGeneration;
    var sprite = _invokeProjectCallback(getSprite, undefined, []);
    if (_runGenerationChanged(generation)) return;
    if (!sprite) return;
    var traversal = _beginGroupTraversal(group);
    for (var i = traversal.items.length - 1; i >= 0; i--) {
      _refreshGroupTraversal(group, traversal);
      var it = traversal.items[i];
      if (!it || !traversal.members.has(it)) continue;
      if (it && isColliding(sprite, it)) {
        _invokeProjectCallback(fn, undefined, [it]);
        if (_runGenerationChanged(generation)) return;
      }
    }
  }

  // ---- Tipos de inimigo (v0.22.0) ----
  // Um TIPO de inimigo é um GRUPO estendido: { items, bullets: {items}, config,
  // onDefeat }. Como todos os helpers de grupo leem só .items, os blocos de
  // grupo (para cada / contar / colisões / tirar) funcionam direto no tipo.
  //
  // "Criar tipo de inimigo" DENTRO do "a cada quadro" recria o tipo (e ZERA a
  // lista) a cada quadro: os inimigos soltos somem da tela sem pista nenhuma.
  // O teto de chamadas detecta esse laço e avisa UMA vez (o jogo segue rodando).
  var _enemyTypeCreates = 0;
  function createEnemyType(opts) {
    opts = opts || {};
    _enemyTypeCreates += 1;
    if (_enemyTypeCreates === 61) {
      console.warn(
        'SZGame2D: "Criar tipo de inimigo" está rodando sem parar: ele provavelmente está DENTRO do "A cada quadro do jogo". Monte esse bloco FORA do laço (ele roda uma vez só); dentro do laço a lista é recriada a cada quadro e os inimigos soltos somem da tela.'
      );
    }
    var type = createGroup();
    type.bullets = createGroup();
    type.config = {
        behavior: opts.behavior || 'patrulha',
        color: opts.color || '#e4573d',
        image: (typeof opts.image === 'string') ? opts.image : '',
        hp: _positiveFiniteNumber(opts.hp, 3),
        speed: _finiteNumber(opts.speed, 2),
        dmg: _finiteNumber(opts.dmg, 1),
        w: _positiveFiniteNumber(opts.w, 32),
        h: _positiveFiniteNumber(opts.h, 32),
        // Ajustes finos por comportamento (bloco "Ajustar no tipo de inimigo…").
        jump: 10,
        jumpRate: 90,
        range: 80,
        rate: 90,
        shotSpeed: 4,
        animStates: null
    };
    type.onDefeat = null;
    type._defeatHandlers = Object.create(null);
    type._defeatOrder = [];
    return type;
  }

  /** Guarda a animação de UM estado no TIPO (vale p/ todos os inimigos dele). */
  function setEnemyStateAnimation(type, state, sheet, from, to, fps) {
    if (!type || !type.config || !sheet || !state) return;
    if (!type.config.animStates) type.config.animStates = {};
    var f = _finiteNumber(from, 0);
    var t = _finiteNumber(to, f);
    type.config.animStates[state] = {
      sheet: sheet,
      from: Math.max(0, Math.floor(f)),
      to: Math.max(0, Math.floor(t)),
      fps: _positiveFiniteNumber(fps, 8)
    };
  }

  /** Ajuste fino por comportamento: pulo/ritmo (saltador), alcance (voador), cadencia/tiro (atirador). */
  function setEnemyTypeParam(type, param, value) {
    if (!type || !type.config || !_isFiniteNumber(value)) return;
    var c = type.config;
    if (param === 'pulo') c.jump = value;
    else if (param === 'ritmo') c.jumpRate = Math.max(1, Math.round(value));
    else if (param === 'alcance') c.range = value;
    else if (param === 'cadencia') c.rate = Math.max(1, Math.round(value));
    else if (param === 'tiro') c.shotSpeed = value;
  }

  /** Solta um inimigo do tipo em x/y (aplica vida, dano e animações do tipo). */
  function spawnEnemy(type, x, y) {
    if (!type || !type.items || !type.config) return null;
    if (type.items.length >= MAX_GROUP) return null;
    var c = type.config;
    var s = createSprite({
      x: _finiteNumber(x, 0),
      y: _finiteNumber(y, 0),
      w: c.w,
      h: c.h,
      color: c.color,
      image: c.image || null
    });
    s.dmg = c.dmg;
    setHealth(s, c.hp);
    s._dir = 1;
    s._homeX = s.x;
    s._homeY = s.y;
    if (c.animStates) s.animStates = c.animStates;
    // Marca que o tipo JÁ teve inimigo em jogo: desliga o aviso pedagógico do
    // update/draw (lista vazia DEPOIS disso é derrota legítima, não esquecimento).
    type._spawned = true;
    type.items.push(s);
    _touchGroup(type);
    return s;
  }

  /**
   * Move TODOS os inimigos do tipo conforme o comportamento, anima (autoAnimate),
   * atira (atirador), remove os derrotados (vida 0 -> particulas + "quando for
   * derrotado") e move/poda os tiros. Use DENTRO do "a cada quadro".
   */
  /**
   * Tropeço nº 1 dos inimigos: atualizar/desenhar um tipo em que NUNCA se
   * soltou inimigo (o "Criar tipo" define só a CLASSE; sem o "Soltar um
   * inimigo do tipo..." a lista fica vazia e nada aparece na tela). Avisa UMA
   * vez por tipo; depois do primeiro spawn o aviso não dispara mais.
   */
  function warnEnemyTypeEmptyOnce(type) {
    if (!type || !type.config || type._spawned || type._warnedNoSpawn) return;
    if (!type.items || type.items.length !== 0) return;
    type._warnedNoSpawn = true;
    console.warn(
      'SZGame2D: o tipo de inimigo foi criado, mas nenhum inimigo foi solto ainda, por isso nada aparece. Use o bloco "Soltar um inimigo do tipo ... em x y" (fora do "A cada quadro"; para ondas, use dentro de "A cada N quadros fazer").'
    );
  }

  function updateEnemyType(type, ctx, target) {
    warnEnemyTypeEmptyOnce(type);
    if (!type || !type.items || !ctx || !ctx.canvas) return;
    var generation = _driverGeneration;
    var c = type.config || {};
    var visible = _visibleWorldRect(ctx);
    // A patrulha só usa gravidade quando o projeto a declara explicitamente.
    // Saltador/atirador continuam com 0.6 por padrão, mas respeitam inclusive
    // gravidade 0 ou negativa quando ela foi configurada.
    var hasGravity = world.gravityConfigured && world.gravity !== 0;
    var g = _worldGravityOr(0.6);
    for (var i = type.items.length - 1; i >= 0; i--) {
      var s = type.items[i];
      if (!s) { _removeGroupItemAt(type, i); continue; }
      // Animações registradas DEPOIS do spawn ainda alcançam este inimigo.
      if (c.animStates && !s.animStates) s.animStates = c.animStates;
      var b = c.behavior;
      if (b === 'perseguidor') {
        // Persegue o CENTRO do alvo GRAVANDO vx/vy (flip/animação de graça).
        if (target) {
          var dx = (target.x + (target.w || 0) / 2) - (s.x + s.w / 2);
          var dy = (target.y + (target.h || 0) / 2) - (s.y + s.h / 2);
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d > c.speed) { s.vx = (dx / d) * c.speed; s.vy = (dy / d) * c.speed; }
          else { s.vx = dx; s.vy = dy; }
          s.x += s.vx;
          s.y += s.vy;
        } else { s.vx = 0; s.vy = 0; }
      } else if (b === 'voador') {
        // Vai-e-volta voando na horizontal, "alcance" px da posicao de nascenca.
        if (s.x - s._homeX >= c.range) s._dir = -1;
        if (s._homeX - s.x >= c.range) s._dir = 1;
        s.vx = (s._dir || 1) * c.speed;
        s.vy = 0;
        s.x += s.vx;
      } else if (b === 'voador-vertical') {
        if (s.y - s._homeY >= c.range) s._dir = -1;
        if (s._homeY - s.y >= c.range) s._dir = 1;
        s.vy = (s._dir || 1) * c.speed;
        s.vx = 0;
        s.y += s.vy;
      } else if (b === 'saltador') {
        // Pula de tempos em tempos ("ritmo" quadros), com gravidade e chao.
        s.vx = 0;
        s.vy = (s.vy || 0) + g;
        s.y += s.vy;
        _resolveGravityGround(s, visible.top, visible.bottom, g);
        if (typeof s._jcd !== 'number') s._jcd = c.jumpRate;
        if (s.onGround) {
          s._jcd -= 1;
          if (s._jcd <= 0) { s.vy = _jumpVelocityForGravity(g, c.jump); s.onGround = false; s._jcd = c.jumpRate; }
        }
      } else if (b === 'atirador') {
        // Fica no chao, vira para o alvo e atira a cada "cadencia" quadros.
        s.vx = 0;
        s.vy = (s.vy || 0) + g;
        s.y += s.vy;
        _resolveGravityGround(s, visible.top, visible.bottom, g);
        if (target) {
          s.facing = ((target.x + (target.w || 0) / 2) < (s.x + s.w / 2)) ? -1 : 1;
          if (typeof s._scd !== 'number') s._scd = c.rate;
          s._scd -= 1;
          if (s._scd <= 0) {
            s._scd = c.rate;
            var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
            var tx = target.x + (target.w || 0) / 2, ty = target.y + (target.h || 0) / 2;
            var ddx = tx - cx, ddy = ty - cy;
            var dd = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dd < 0.001) { ddx = (s.facing || 1); ddy = 0; dd = 1; }
            var shot = spawnBullet(type.bullets, {
              x: cx,
              y: cy,
              radius: 4,
              color: c.color,
              vx: (ddx / dd) * c.shotSpeed,
              vy: (ddy / dd) * c.shotSpeed
            });
            if (shot) shot.dmg = c.dmg;
          }
        }
      } else {
        // patrulha (default): anda na horizontal e VIRA na parede ou na borda.
        // "Parede" = alguem zerou o vx dele neste meio-tempo (o "Impedir de
        // atravessar os tiles" zera o vx ao bater) — 1 quadro de latencia, ok.
        if (s._moved && (s.vx || 0) === 0) s._dir = -(s._dir || 1);
        if (s.x <= visible.left) s._dir = 1;
        if (s.x + s.w >= visible.right) s._dir = -1;
        s.vx = (s._dir || 1) * c.speed;
        s.x += s.vx;
        // Gravidade/chao SO quando o mundo declarou gravidade. Num top-down puro,
        // o inimigo padrao patrulha na horizontal sem afundar.
        if (hasGravity) {
          s.vy = (s.vy || 0) + g;
          s.y += s.vy;
          _resolveGravityGround(s, visible.top, visible.bottom, g);
        }
        s._moved = true;
      }
      autoAnimate(s);
      // Derrotado: some soltando particulas e avisa o "quando for derrotado".
      if (typeof s.hp === 'number' && s.hp <= 0) {
        _removeGroupItemAt(type, i);
        emitParticles(s.x + s.w / 2, s.y + s.h / 2, 12, s.color || c.color);
        _runEnemyDefeatHandlers(type, s);
        if (_runGenerationChanged(generation)) return;
      }
    }
    // Tiros dos atiradores: linha RETA (sem a gravidade do mundo — nao usar
    // updateGroup aqui) + poda fora da tela (margem 40).
    var bs = (type.bullets && type.bullets.items) ? type.bullets.items : null;
    if (bs) {
      for (var k = bs.length - 1; k >= 0; k--) {
        var shot2 = bs[k];
        if (!shot2) { _removeGroupItemAt(type.bullets, k); continue; }
        shot2.x += shot2.vx || 0;
        shot2.y += shot2.vy || 0;
        if (shot2.x < visible.left - 40 || shot2.y < visible.top - 40 || shot2.x > visible.right + 40 || shot2.y > visible.bottom + 40) _removeGroupItemAt(type.bullets, k);
      }
    }
  }

  /** Desenha os inimigos do tipo E os tiros deles. */
  function drawEnemyType(ctx, type) {
    warnEnemyTypeEmptyOnce(type);
    if (!ctx || !type) return;
    drawGroup(ctx, type);
    drawGroup(ctx, type.bullets);
  }

  function _runEnemyDefeatHandlers(type, sprite) {
    if (!type) return;
    var generation = _driverGeneration;
    var order = type._defeatOrder ? type._defeatOrder.slice() : [];
    // Compatibilidade com código antigo que atribuía type.onDefeat diretamente.
    if (!order.length && typeof type.onDefeat === 'function') order.push('__legacy__');
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var handler = id === '__legacy__' ? type.onDefeat : type._defeatHandlers[id];
      if (typeof handler !== 'function') continue;
      try { _invokeProjectCallback(handler, undefined, [sprite]); }
      catch (error) {
        _reportHandlerError('“Quando um inimigo for derrotado”', id, error);
        if (id === '__legacy__') {
          if (type.onDefeat === handler) type.onDefeat = null;
        } else {
          _removeOrderedIfCurrent(type._defeatHandlers, type._defeatOrder, id, handler);
        }
      }
      if (_runGenerationChanged(generation)) return;
    }
  }

  /** Registra eventos independentes de derrota, identificados pelo bloco. */
  function onEnemyDefeated(type, fn, explicitId) {
    if (!type || typeof fn !== 'function') return;
    if (!type._defeatHandlers) type._defeatHandlers = Object.create(null);
    if (!type._defeatOrder) type._defeatOrder = [];
    var id = _stableHandlerId('inimigo-derrotado', explicitId, fn);
    if (!type._defeatHandlers[id]) type._defeatOrder.push(id);
    type._defeatHandlers[id] = fn;
  }

  /**
   * Para cada TIRO do tipo que encosta no sprite: REMOVE o tiro e roda fn(tiro).
   * Varredura por quadro (use no "a cada quadro"), espelho do overlapSpriteGroup.
   */
  function overlapEnemyShots(getSprite, type, fn) {
    if (typeof getSprite !== 'function' || typeof fn !== 'function') return;
    if (!type || !type.bullets || !type.bullets.items) return;
    var generation = _driverGeneration;
    var sprite = _invokeProjectCallback(getSprite, undefined, []);
    if (_runGenerationChanged(generation)) return;
    if (!sprite) return;
    var items = type.bullets.items;
    for (var i = items.length - 1; i >= 0; i--) {
      var shot = items[i];
      if (shot && isColliding(sprite, shot)) {
        _removeGroupItemAt(type.bullets, i);
        _invokeProjectCallback(fn, undefined, [shot]);
        if (_runGenerationChanged(generation)) return;
      }
    }
  }

  /** O dano de contato guardado no inimigo (ou no tiro dele). */
  function enemyDamage(s) {
    return s ? _finiteNumber(s.dmg, 1) : 1;
  }

  /**
   * Machuca o sprite com o dano do inimigo/tiro e faz piscar. Enquanto pisca,
   * e INVENCIVEL (nao leva dano de novo) — sem isso, o contato continuo
   * drenaria a vida a cada quadro.
   */
  function hurtByEnemy(s, e) {
    if (!s || !e) return;
    damageSprite(s, enemyDamage(e), 45);
  }

  // ---- HUD no canvas: placar, texto, vidas (corações) e barra ----
  /** Escreve "rótulo valor" (ex.: "Pontos: 5") na tela. */
  function drawScore(ctx, label, value, x, y, color, size) {
    if (!ctx) return;
    var px = _finiteNumber(x, 0), py = _finiteNumber(y, 0);
    ctx.save();
    ctx.fillStyle = color || '#ffffff';
    ctx.font = 'bold ' + _positiveFiniteNumber(size, 20) + 'px ' + _szGameUIFont;
    ctx.textAlign = 'left';
    var text = (label === undefined || label === null || label === '') ? String(value)
      : String(label) + ' ' + String(value);
    ctx.fillText(text, px, py);
    ctx.restore();
    _updateAccessibleHud('score:' + String(label || '') + ':' + String(px) + ':' + String(py), text);
  }
  /** Escreve um texto na tela (com alinhamento esquerda/centro/direita). */
  function drawLabel(ctx, text, x, y, color, size, align) {
    if (!ctx) return;
    var labelText = String(text === undefined || text === null ? '' : text);
    var px = _finiteNumber(x, 0), py = _finiteNumber(y, 0);
    ctx.save();
    ctx.fillStyle = color || '#ffffff';
    ctx.font = 'bold ' + _positiveFiniteNumber(size, 20) + 'px ' + _szGameUIFont;
    ctx.textAlign = align || 'left';
    ctx.fillText(labelText, px, py);
    ctx.restore();
    _updateAccessibleHud('label:' + String(px) + ':' + String(py), labelText);
  }
  /** Desenha UM coração de tamanho s, canto superior-esquerdo em (x,y). */
  function drawHeart(ctx, x, y, s) {
    var top = s * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + top);
    ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + top);
    ctx.bezierCurveTo(x, y + (s + top) / 2, x + s / 2, y + (s + top) / 2, x + s / 2, y + s);
    ctx.bezierCurveTo(x + s / 2, y + (s + top) / 2, x + s, y + (s + top) / 2, x + s, y + top);
    ctx.bezierCurveTo(x + s, y, x + s / 2, y, x + s / 2, y + top);
    ctx.closePath();
    ctx.fill();
  }
  /** Desenha somente a parte visual dos corações; os chamadores publicam a semântica. */
  function _drawHeartsVisual(ctx, count, x, y, size, color) {
    if (!ctx) return;
    var n = Math.max(0, Math.min(Math.floor(_finiteNumber(count, 0)), 20));
    var s = _positiveFiniteNumber(size, 22);
    var px = _finiteNumber(x, 0), py = _finiteNumber(y, 0);
    ctx.save();
    ctx.fillStyle = color || '#ff5d5d';
    for (var i = 0; i < n; i++) drawHeart(ctx, px + i * (s + 6), py, s);
    ctx.restore();
  }
  /** Desenha "count" corações em linha (ex.: vidas). Teto de 20. */
  function drawHearts(ctx, count, x, y, size, color) {
    if (!ctx) return;
    _drawHeartsVisual(ctx, count, x, y, size, color);
    var n = Math.max(0, Math.min(Math.floor(_finiteNumber(count, 0)), 20));
    _updateAccessibleHud('hearts:' + String(_finiteNumber(x, 0)) + ':' + String(_finiteNumber(y, 0)), 'Vidas: ' + n);
  }
  /** Barra de progresso/vida: fundo + preenchimento proporcional a value/max. */
  function _drawBarVisual(ctx, value, max, x, y, w, h, color) {
    if (!ctx) return;
    var m = _positiveFiniteNumber(max, 1);
    var v = _finiteNumber(value, 0);
    var frac = Math.max(0, Math.min(v / m, 1));
    var bw = _positiveFiniteNumber(w, 100);
    var bh = _positiveFiniteNumber(h, 12);
    var px = _finiteNumber(x, 0), py = _finiteNumber(y, 0);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px, py, bw, bh);
    ctx.fillStyle = color || '#9cff57';
    ctx.fillRect(px, py, bw * frac, bh);
    ctx.restore();
  }
  function drawBar(ctx, value, max, x, y, w, h, color) {
    _drawBarVisual(ctx, value, max, x, y, w, h, color);
    var v = _finiteNumber(value, 0);
    var m = _positiveFiniteNumber(max, 1);
    _updateAccessibleHud('bar:' + String(_finiteNumber(x, 0)) + ':' + String(_finiteNumber(y, 0)), 'Progresso: ' + v + ' de ' + m);
  }
  /** HUD de vidas ligado ao sprite: corações ou barra, sem variável intermediária. */
  function drawSpriteHealth(ctx, sprite, style, x, y, size, color) {
    if (!ctx || !sprite) return;
    if (!_hasInitializedHealth(sprite)) { _warnHealthNotInitialized(); return; }
    var visual = style === 'bar' ? 'bar' : 'hearts';
    if (visual === 'bar') {
      var width = _positiveFiniteNumber(size, 160);
      var height = Math.max(8, Math.round(width / 10));
      _drawBarVisual(ctx, sprite.hp, sprite.hpMax, x, y, width, height, color);
    } else {
      _drawHeartsVisual(ctx, sprite.hp, x, y, size, color);
    }
    _updateAccessibleHud('health:' + String(_finiteNumber(x, 0)) + ':' + String(_finiteNumber(y, 0)), 'Vidas: ' + sprite.hp + ' de ' + sprite.hpMax);
  }

  // ---- Estado do jogo (cenas): início → jogando → ganhou → perdeu ----
  var _scene = 'inicio';
  /** Troca a tela/cena atual. */
  function setScene(name) {
    var nextScene = String(name || 'inicio');
    if (nextScene !== _scene) _resetAccessibleHud();
    _scene = nextScene;
    _announceScreen('Tela ' + _scene, '', '');
  }
  /** Cena atual (string). */
  function getScene() { return _scene; }
  /** Verdadeiro se a cena atual é "name". Use dentro de um "se". */
  function sceneIs(name) { return _scene === String(name); }
  /** Overlay de tela cheia com título, subtítulo e dica (centralizados). */
  // Quebra o texto em várias linhas para caber em maxWidth (centralizado).
  function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var str = String(text);
    if (!ctx.measureText) { ctx.fillText(str, x, y); return y; }
    var words = str.split(' ');
    var line = '';
    var yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x, yy);
        line = words[i] + ' ';
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.replace(/ +$/, ''), x, yy);
    return yy;
  }
  function showScreen(ctx, title, subtitle, hint, bg) {
    if (!ctx || !ctx.canvas) return;
    _announceScreen(title, subtitle, hint);
    var w = stageW(ctx), h = stageH(ctx);
    var sc = Math.max(0.7, Math.min(2, w / 640));
    ctx.save();
    // Overlay SEMITRANSPARENTE: o jogo continua aparecendo por trás (à la referência).
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = bg || '#02111f';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(36 * sc) + 'px ' + _szGameUIFont;
    ctx.fillText(String(title || ''), w / 2, h / 2 - 24 * sc);
    var afterY = h / 2 + 12 * sc;
    if (subtitle) {
      ctx.font = Math.round(20 * sc) + 'px ' + _szGameUIFont;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      afterY = _wrapText(ctx, subtitle, w / 2, afterY, Math.min(w * 0.8, 640), 30 * sc);
    }
    if (hint) {
      ctx.font = Math.round(16 * sc) + 'px ' + _szGameUIFont;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(String(hint), w / 2, afterY + 40 * sc);
    }
    ctx.restore();
  }
  /** Mensagem terminal simples, preservada para o bloco introdutório de fim de jogo. */
  function showGameOver(ctx, text) {
    if (!ctx || !ctx.canvas) return;
    var message = String(text === undefined || text === null ? '' : text);
    _announceScreen(message, '', '');
    var w = stageW(ctx), h = stageH(ctx);
    var size = Math.max(24, Math.round(Math.min(w, h) * 0.12));
    ctx.save();
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold ' + size + 'px ' + _szGameUIFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, w / 2, h / 2);
    ctx.restore();
  }
  /**
   * Reinicia uma partida em memória. O canvas e os assets carregados são
   * reaproveitados; estado, eventos e quadros da partida anterior são limpos e
   * o factory das Áreas do projeto roda novamente.
   */
  function restart() {
    if (_restarting) return;
    // Projeto legado, criado antes do bloco de início: não há callback que possa
    // reconstruir suas variáveis léxicas. Mantém a compatibilidade por recarga,
    // mas todo projeto novo e todos os exemplos usam o reinício em memória.
    if (!_startOrder.length) {
      warnOnce('reinicio-legado', 'este projeto antigo ainda não usa as Áreas do projeto; vou recarregar o preview para recomeçar.');
      try { location.reload(); } catch (error) { _reportHandlerError('de reinício', 'legado', error); }
      return;
    }
    _restarting = true;
    try {
      _resetRuntimeDomains();
      try { clear(); } catch (error) { _reportHandlerError('de reinício', 'limpar-tela', error); }

      var starts = _startOrder.slice();
      for (var i = 0; i < starts.length; i++) {
        var id = starts[i];
        var start = _startHandlers[id];
        if (typeof start !== 'function') continue;
        try { _invokeProjectCallback(start, undefined, []); }
        catch (error) {
          _reportHandlerError('“Ao iniciar”', id, error);
          _removeOrderedIfCurrent(_startHandlers, _startOrder, id, start);
        }
      }
    } finally {
      _restarting = false;
    }
    _endRestartedCallback();
  }

  // ---- Cenário: fundo de estrelas rolando + arrastar nave com o dedo ----
  var _stars = null;
  function ensureStars(ctx) {
    if (_stars) return _stars;
    _stars = [];
    var w = stageW(ctx), h = stageH(ctx);
    for (var i = 0; i < 100; i++) {
      _stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.4,
        s: Math.random() * 0.7 + 0.2,
        alpha: Math.random() * 0.6 + 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    return _stars;
  }
  /**
   * Fundo espacial completo (à la "Nave contra Asteroides"): gradiente vertical do
   * céu + 100 estrelas que ROLAM para baixo e CINTILAM (twinkle). Use no começo do
   * "a cada quadro" (depois de limpar a tela) — ele já pinta o fundo todo.
   */
  function drawStarfield(ctx, speed) {
    if (!ctx || !ctx.canvas) return;
    var sp = _finiteNumber(speed, 1);
    var w = stageW(ctx), h = stageH(ctx);
    ctx.save();
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#071b3a');
    grad.addColorStop(0.55, '#06101f');
    grad.addColorStop(1, '#020611');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    var stars = ensureStars(ctx);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = st.alpha + Math.sin(now() * 0.003 + st.phase) * 0.25;
      ctx.globalAlpha = Math.max(0.1, Math.min(1, tw));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
      st.y += st.s * sp;
      if (st.y > h) { st.y = 0; st.x = Math.random() * w; }
    }
    ctx.restore();
  }
  /** Faz o sprite seguir o dedo/mouse SÓ na horizontal (ótimo p/ nave no celular). */
  function dragX(sprite) {
    if (!sprite) return;
    sprite.x = pointer.x + camera.x - sprite.w / 2;
  }

  // ---- Pulo no chão (genérico) + Kit dino (v0.9.0) ----
  // Bloco genérico "pular no chão": gravidade + pouso na borda atraída + pulo
  // com ↑/Espaço/W ou um toque (borda de toque). Serve a QUALQUER jogo de pulo.
  var _jumpTapPrev = false;
  function jumpOnGround(sprite, ctx, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var j = (_isFiniteNumber(jump) && jump > 0) ? jump : 14;
    var g = _worldGravityOr(0.6);
    sprite.vy = (sprite.vy || 0) + g;
    sprite.y += sprite.vy;
    var visible = _visibleWorldRect(ctx);
    // Persiste "no chão" NO sprite (mesmo contrato do platformer/autoAnimate).
    _resolveGravityGround(sprite, visible.top, visible.bottom, g);
    var tap = pointer.down && !_jumpTapPrev;
    _jumpTapPrev = pointer.down;
    var wantJump = keys.up || keyDown('Space') || tap;
    if (wantJump && sprite.onGround) {
      sprite.vy = _jumpVelocityForGravity(g, j);
      sprite.onGround = false;
    }
  }

  // Linha do chão do mundo "corrida": fica um pouco acima da base p/ o dino
  // correr sobre a grama desenhada por drawForest (não colado na borda).
  function dinoGround(ctx) {
    var visible = _visibleWorldRect(ctx);
    return visible.bottom - Math.round(visible.height * 0.16);
  }

  /** Cria um dinossauro desenhado (corre sozinho; pose muda no pulo/agachar). */
  function createDino(opts) {
    opts = opts || {};
    var size = _positiveFiniteNumber(opts.size, 64);
    var w = Math.round(size * 0.95), h = size;
    var s = createSprite({ x: opts.x, y: opts.y, w: w, h: h, color: opts.color });
    s.skin = { kind: 'dino', color: opts.color || '#5fb45f', fullH: h, ducking: false, onGround: true };
    return s;
  }

  var _dinoTapPrev = false;
  /**
   * Controla o dinossauro estilo "corrida": pula com ↑/Espaço/W ou toque na
   * METADE DE CIMA da tela; abaixa com ↓/S ou segurando o dedo na METADE DE
   * BAIXO. Aplica gravidade, pousa na linha do chão (dinoGround) e solta poeira
   * ao pular/pousar. Use DENTRO do "a cada quadro".
   */
  function controlDino(sprite, ctx, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var sk = sprite.skin || (sprite.skin = { kind: 'dino' });
    var j = _positiveFiniteNumber(jump, 15);
    var g = _worldGravityOr(0.6);
    var gh = stageH(ctx);
    var gy = dinoGround(ctx);
    var visible = _visibleWorldRect(ctx);
    // Gravidade + integração vertical.
    sprite.vy = (sprite.vy || 0) + g;
    sprite.y += sprite.vy;
    var impactVelocity = sprite.vy;
    sk.onGround = _resolveGravityGround(sprite, visible.top, gy, g);
    if (sk.onGround && (_gravityPullsUp(g) ? -impactVelocity : impactVelocity) > 5) {
      var landingY = _gravityPullsUp(g) ? sprite.y : sprite.y + sprite.h;
      emitParticles(sprite.x + sprite.w / 2, landingY, 5, '#caa977');
    }
    // Agachar (só no chão): encolhe mantendo a borda apoiada no lugar.
    var touchDuck = pointer.down && pointer.y > gh * 0.6;
    var wantDuck = (keys.down || touchDuck) && sk.onGround;
    var fullH = sk.fullH || sprite.h;
    if (wantDuck && !sk.ducking) {
      sk.ducking = true;
      var dh = Math.round(fullH * 0.6);
      if (!_gravityPullsUp(g)) sprite.y += (sprite.h - dh);
      sprite.h = dh;
    } else if (!wantDuck && sk.ducking) {
      sk.ducking = false;
      if (!_gravityPullsUp(g)) sprite.y -= (fullH - sprite.h);
      sprite.h = fullH;
    }
    // Pulo (não enquanto agacha): teclas OU toque na metade de cima.
    var tap = pointer.down && !_dinoTapPrev && pointer.y <= gh * 0.6;
    _dinoTapPrev = pointer.down;
    var wantJump = keys.up || keyDown('Space') || tap;
    if (wantJump && sk.onGround && !sk.ducking) {
      sprite.vy = _jumpVelocityForGravity(g, j);
      sk.onGround = false;
      sprite.onGround = false;
      var takeoffY = _gravityPullsUp(g) ? sprite.y : sprite.y + sprite.h;
      emitParticles(sprite.x + sprite.w / 2, takeoffY, 8, '#caa977');
    }
  }

  /** Desenha o dinossauro (corpo, cabeça, espinhos, perninhas que correm). */
  function drawDino(ctx, sprite) {
    var sk = sprite.skin || {};
    var x = sprite.x, y = sprite.y, w = sprite.w, h = sprite.h;
    var col = sk.color || '#5fb45f';
    var dark = '#3f8f49';
    var belly = '#d6f3b4';
    var ducking = !!sk.ducking;
    var jumping = sk.onGround === false;
    var swing = (!ducking && !jumping) ? Math.sin(now() * 0.02) * (h * 0.09) : (jumping ? -h * 0.05 : 0);
    ctx.save();
    // sombra: FICA na linha do chão (não sobe com o pulo, como acontecia quando era
    // desenhada nos pés) e encolhe/clareia conforme o dino ganha altura — dá
    // profundidade sem "grudar" no dino.
    var invertedGravity = _gravityPullsUp(_worldGravityOr(0.6));
    var groundY = invertedGravity ? _visibleWorldRect(ctx).top : dinoGround(ctx);
    var airborne = invertedGravity ? y - groundY : groundY - (y + h);
    if (airborne < 0) airborne = 0;
    var shadowScale = 1 - airborne / 260;
    if (shadowScale < 0.4) shadowScale = 0.4;
    ctx.fillStyle = 'rgba(32,65,92,' + (0.16 * shadowScale).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.52, groundY + (invertedGravity ? 1 : -1), w * 0.42 * shadowScale, h * 0.06 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    // cauda
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.52);
    ctx.quadraticCurveTo(x - w * 0.06, y + h * 0.46, x + w * 0.02, y + h * 0.74);
    ctx.quadraticCurveTo(x + w * 0.16, y + h * 0.7, x + w * 0.28, y + h * 0.58);
    ctx.closePath();
    ctx.fill();
    // perninhas (duas, alternando)
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(4, w * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.42, y + h * 0.78);
    ctx.lineTo(x + w * 0.38 - swing * 0.4, y + h - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.6, y + h * 0.78);
    ctx.lineTo(x + w * 0.64 + swing * 0.4, y + h - 1);
    ctx.stroke();
    // corpo
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.52, y + h * 0.58, w * 0.3, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    // barriga
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.56, y + h * 0.66, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // espinhos nas costas
    ctx.fillStyle = dark;
    for (var i = 0; i < 3; i++) {
      var spx = x + w * (0.34 + i * 0.12);
      ctx.beginPath();
      ctx.moveTo(spx, y + h * 0.4);
      ctx.lineTo(spx + w * 0.05, y + h * 0.28);
      ctx.lineTo(spx + w * 0.1, y + h * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    // cabeça
    var hx = x + w * 0.74, hy = y + h * (ducking ? 0.5 : 0.36);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(hx, hy, w * 0.2, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // focinho
    ctx.beginPath();
    ctx.ellipse(hx + w * 0.14, hy + h * 0.04, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // olho
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx + w * 0.06, hy - h * 0.03, Math.max(2, w * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20415c';
    ctx.beginPath();
    ctx.arc(hx + w * 0.08, hy - h * 0.03, Math.max(1, w * 0.022), 0, Math.PI * 2);
    ctx.fill();
    // bracinho
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(3, w * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.66, y + h * 0.6);
    ctx.lineTo(x + w * 0.74, y + h * 0.68);
    ctx.stroke();
    ctx.restore();
  }

  /** Coloca no grupo um obstáculo desenhado (cacto/pedra no chão; pássaro no alto). */
  function spawnObstacle(group, ctx, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var type = opts.type || 'cactus';
    if (type === 'random' || type === 'surpresa') {
      var r = Math.random();
      type = r < 0.45 ? 'cactus' : (r < 0.8 ? 'rock' : 'bird');
    }
    var size = _positiveFiniteNumber(opts.size, 44);
    var gy = dinoGround(ctx);
    var w, h, y;
    if (type === 'bird') { w = Math.round(size * 1.3); h = Math.round(size * 0.8); y = gy - h - 46; }
    else if (type === 'rock') { w = size; h = Math.round(size * 0.72); y = gy - h; }
    else { type = 'cactus'; w = Math.round(size * 0.7); h = Math.round(size * 1.3); y = gy - h; }
    var s = createSprite({ x: opts.x, y: y, w: w, h: h, color: '#3f8f49', vx: opts.vx, vy: 0 });
    s.skin = { kind: 'obstacle', shape: type, flap: Math.random() * Math.PI * 2 };
    group.items.push(s);
    _touchGroup(group);
    return s;
  }
  /** Desenha o obstáculo conforme a forma (cacto, pedra ou pássaro batendo asas). */
  function drawObstacleSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var x = sprite.x, y = sprite.y, w = sprite.w, h = sprite.h;
    ctx.save();
    if (sk.shape === 'rock') {
      ctx.fillStyle = '#8f7d70';
      ctx.strokeStyle = '#66564c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.06, y + h);
      ctx.lineTo(x + w * 0.2, y + h * 0.25);
      ctx.lineTo(x + w * 0.55, y + h * 0.05);
      ctx.lineTo(x + w * 0.85, y + h * 0.3);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (sk.shape === 'bird') {
      var flap = Math.sin(now() * 0.02 + (sk.flap || 0)) * (h * 0.35);
      ctx.fillStyle = '#5b6b8c';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + h * 0.55, w * 0.28, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // asas
      ctx.beginPath();
      ctx.moveTo(x + w * 0.45, y + h * 0.5);
      ctx.lineTo(x + w * 0.05, y + h * 0.5 - flap);
      ctx.lineTo(x + w * 0.42, y + h * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.55, y + h * 0.5);
      ctx.lineTo(x + w * 0.95, y + h * 0.5 - flap);
      ctx.lineTo(x + w * 0.58, y + h * 0.68);
      ctx.closePath();
      ctx.fill();
      // bico + olho
      ctx.fillStyle = '#ffb13b';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.74, y + h * 0.52);
      ctx.lineTo(x + w * 0.92, y + h * 0.56);
      ctx.lineTo(x + w * 0.74, y + h * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + w * 0.66, y + h * 0.48, Math.max(2, w * 0.05), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20415c';
      ctx.beginPath();
      ctx.arc(x + w * 0.67, y + h * 0.48, Math.max(1, w * 0.025), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // cacto
      ctx.fillStyle = '#24a05a';
      ctx.strokeStyle = '#157940';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x + w * 0.36, y, w * 0.28, h, w * 0.14) : ctx.rect(x + w * 0.36, y, w * 0.28, h);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y + h * 0.32, w * 0.3, h * 0.5, w * 0.14) : ctx.rect(x, y + h * 0.32, w * 0.3, h * 0.5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x + w * 0.66, y + h * 0.46, w * 0.3, h * 0.42, w * 0.14) : ctx.rect(x + w * 0.66, y + h * 0.46, w * 0.3, h * 0.42);
      ctx.fill();
      ctx.stroke();
      // florzinha no topo
      ctx.fillStyle = '#ff7aa8';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.04, Math.max(2, w * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Coloca no grupo um OVO (item de bônus para coletar). */
  function spawnEgg(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var s = createSprite({ x: opts.x, y: opts.y, w: 30, h: 38, color: '#fff3c4', vx: opts.vx, vy: 0 });
    s.skin = { kind: 'egg', bob: Math.random() * Math.PI * 2 };
    group.items.push(s);
    _touchGroup(group);
    return s;
  }
  /** Desenha o ovo (casca clara com manchinhas e um brilho que pisca). */
  function drawEggSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var cx = sprite.x + sprite.w / 2, cy = sprite.y + sprite.h / 2;
    ctx.save();
    ctx.fillStyle = '#fff5c8';
    ctx.strokeStyle = '#e0b352';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sprite.w * 0.44, sprite.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8fd6ff';
    ctx.beginPath();
    ctx.arc(cx - sprite.w * 0.14, cy, sprite.w * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff93b5';
    ctx.beginPath();
    ctx.arc(cx + sprite.w * 0.12, cy + sprite.h * 0.12, sprite.w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    var shine = 0.4 + Math.sin(now() * 0.006 + (sk.bob || 0)) * 0.3;
    ctx.globalAlpha = Math.max(0.1, Math.min(0.9, shine));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - sprite.w * 0.1, cy - sprite.h * 0.2, sprite.w * 0.08, sprite.h * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Nuvenzinha fofa (usada pelo fundo de floresta).
  function drawCloud(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.arc(30, 9, 17, 0, Math.PI * 2);
    ctx.arc(48, 15, 12, 0, Math.PI * 2);
    ctx.arc(32, 20, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  var _forest = null;
  function ensureForest(ctx) {
    if (_forest) return _forest;
    var w = stageW(ctx), h = stageH(ctx);
    var clouds = [], hills = [];
    for (var i = 0; i < 5; i++) {
      clouds.push({ x: Math.random() * w, y: 20 + Math.random() * (h * 0.3), s: 0.2 + Math.random() * 0.35, scale: 0.7 + Math.random() * 0.7 });
    }
    for (var j = 0; j < 4; j++) {
      hills.push({ x: j * (w / 3), w: w * (0.42 + Math.random() * 0.3), h: h * (0.16 + Math.random() * 0.14) });
    }
    _forest = { clouds: clouds, hills: hills, gx: 0 };
    return _forest;
  }
  /**
   * Fundo de FLORESTA com parallax: céu, sol, nuvens (lentas), morros (médios) e
   * uma faixa de grama/chão que ROLA (rápida). Use no começo do "a cada quadro",
   * depois de limpar a tela. O dino corre sobre a grama (linha dinoGround).
   */
  function drawForest(ctx, speed) {
    if (!ctx || !ctx.canvas) return;
    var sp = _finiteNumber(speed, 4);
    var w = stageW(ctx), h = stageH(ctx);
    var gy = dinoGround(ctx);
    ctx.save();
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8fe7ff');
    sky.addColorStop(0.55, '#c7fff2');
    sky.addColorStop(1, '#fff0b3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // sol
    ctx.fillStyle = '#ffe06b';
    ctx.beginPath();
    ctx.arc(w - 64, 58, 26, 0, Math.PI * 2);
    ctx.fill();
    var F = ensureForest(ctx);
    for (var i = 0; i < F.clouds.length; i++) {
      var c = F.clouds[i];
      drawCloud(ctx, c.x, c.y, c.scale);
      c.x -= c.s * sp;
      if (c.x < -90) { c.x = w + 30; c.y = 20 + Math.random() * (h * 0.3); }
    }
    for (var k = 0; k < F.hills.length; k++) {
      var hl = F.hills[k];
      ctx.fillStyle = (k % 2 === 0) ? '#91dc7a' : '#74cf77';
      ctx.beginPath();
      ctx.moveTo(hl.x, gy);
      ctx.quadraticCurveTo(hl.x + hl.w / 2, gy - hl.h, hl.x + hl.w, gy);
      ctx.closePath();
      ctx.fill();
      hl.x -= sp * 0.4;
      if (hl.x + hl.w < 0) hl.x = w;
    }
    // grama + chão
    var band = h - gy;
    ctx.fillStyle = '#75cc63';
    ctx.fillRect(0, gy, w, band);
    ctx.fillStyle = '#57b850';
    ctx.fillRect(0, gy, w, Math.max(4, band * 0.2));
    ctx.fillStyle = '#9d7346';
    ctx.fillRect(0, gy + band * 0.55, w, h - (gy + band * 0.55));
    // tracinhos do chão rolando (sensação de velocidade)
    // Módulo é constante no tamanho da velocidade; a normalização antiga por
    // adições repetidas podia travar a thread com valores enormes/Infinity.
    F.gx = (_finiteNumber(F.gx, 0) - sp) % 40;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    for (var gx = F.gx; gx < w; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + band * 0.34);
      ctx.lineTo(gx + 16, gy + band * 0.34);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Som de pulo: blip curto subindo de tom. */
  function playJump() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      var t = ctx.currentTime;
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.12);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(ctx.destination);
      _startAudioSource(o, t); o.stop(t + 0.14);
    } catch (e) {}
  }
  /** Som de dano: rosnado grave que decai. */
  function playDinoHurt() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      var t = ctx.currentTime;
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g); g.connect(ctx.destination);
      _startAudioSource(o, t); o.stop(t + 0.3);
    } catch (e) {}
  }
  /** Som de coletar: duas notinhas alegres (ovo bônus). */
  function playCollect() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var t = ctx.currentTime;
      function note(freq, start, dur) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t + start);
        g.gain.exponentialRampToValueAtTime(0.12, t + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
        o.connect(g); g.connect(ctx.destination);
        _startAudioSource(o, t + start); o.stop(t + start + dur);
      }
      note(660, 0, 0.12);
      note(990, 0.09, 0.16);
    } catch (e) {}
  }

  // ---- Kit gorilas: batalha de bananas (artilharia) ----
  // Dois gorilas no alto de prédios jogam bananas um no outro. O vento e a
  // gravidade entortam a parábola; a banana abre crateras nos prédios. É por
  // turnos. Estado interno: a banana ativa (_banana) e a mira atual (_aim).
  var GORILLA_GRAV = 0.32;   // gravidade da banana (px por quadro²)
  var GORILLA_K = 0.16;      // arrasto (px) -> velocidade (px por quadro)
  var GORILLA_MAXV = 26;     // velocidade máxima de arremesso
  var GORILLA_WIND = 0.06;   // vento máximo (px por quadro²) somado ao vx
  var BANANA_BLAST = 26;     // raio da cratera
  var _banana = null;
  var _aim = { dragging: false, power: 0, angle: 0, vx: 0, vy: 0, released: false };

  // Mão do gorila: de onde a banana sai e a seta de mira começa (topo, centro).
  function _throwerHand(s) {
    return { x: s.x + (s.w || 0) / 2, y: s.y + 2 };
  }

  /** Cria a cidade: uma fileira de prédios (com janelas) ocupando a tela. */
  function createCity() {
    var ctx = ensureStage();
    var W = stageW(ctx) || 480, H = stageH(ctx) || 270;
    var buildings = [];
    var palette = ['#3b3a5a', '#454168', '#2f3350', '#544b74', '#3a4a6b'];
    var x = 0, bi = 0;
    while (x < W) {
      var bw = 38 + Math.floor(Math.random() * 34);
      if (x + bw > W) bw = W - x;
      // Prédios das pontas mais baixos (cabem os gorilas e dá pra mirar por cima).
      var edge = x < W * 0.22 || x > W * 0.74;
      var minh = H * 0.28;
      var maxh = edge ? H * 0.45 : H * 0.8;
      var bh = Math.round(minh + Math.random() * (maxh - minh));
      var lights = [];
      for (var L = 0; L < 60; L++) lights.push(Math.random() < 0.34);
      buildings.push({ x: x, w: bw, h: bh, color: palette[bi % palette.length], lights: lights });
      x += bw;
      bi++;
    }
    return { buildings: buildings, holes: [], wind: 0, W: W, H: H };
  }

  /** Desenha a cidade: céu + lua + prédios com janelas, com as crateras furadas. */
  function drawCity(ctx, city) {
    if (!ctx || !city) return;
    var W = city.W, H = city.H;
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1b2a4a');
    sky.addColorStop(1, '#5a3b6b');
    ctx.save();
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(W - 60, 52, 22, 0, Math.PI * 2);
    ctx.fill();
    // Recorta as crateras: tudo MENOS os círculos. Assim os prédios não
    // aparecem dentro dos buracos (mostra o céu) — igual ao jogo clássico.
    for (var k = 0; k < city.holes.length; k++) {
      var ho = city.holes[k];
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(ho.x, ho.y, ho.r, 0, Math.PI * 2, true);
      ctx.clip();
    }
    for (var i = 0; i < city.buildings.length; i++) {
      var b = city.buildings[i];
      var top = H - b.h;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, top, b.w, b.h);
      var gap = 10, ww = 7, wh = 9;
      var cols = Math.floor((b.w - gap) / (ww + gap));
      var rows = Math.floor((b.h - gap) / (wh + gap));
      var li = 0;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          ctx.fillStyle = b.lights[li % b.lights.length] ? '#ffd97a' : '#20203a';
          ctx.fillRect(b.x + gap + c * (ww + gap), top + gap + r * (wh + gap), ww, wh);
          li++;
        }
      }
    }
    ctx.restore();
  }

  /** Põe um gorila no alto de um prédio perto da ponta (lado 'left'/'right'). */
  function placeThrower(city, opts) {
    opts = opts || {};
    if (!city || !city.buildings.length) return createSprite(opts);
    var side = opts.side === 'right' ? 'right' : 'left';
    var idx = side === 'left'
      ? Math.min(1, city.buildings.length - 1)
      : Math.max(0, city.buildings.length - 2);
    var b = city.buildings[idx];
    var w = 30, h = 36;
    var top = city.H - b.h;
    var s = createSprite({ x: b.x + b.w / 2 - w / 2, y: top - h, w: w, h: h, color: opts.color });
    s.skin = { kind: 'gorilla', color: opts.color || '#6b4a2b', side: side };
    return s;
  }

  /** Desenha um gorila (braços levantados prontos pra lançar + carinha). */
  function drawGorilla(ctx, sprite) {
    var sk = sprite.skin || {};
    var x = sprite.x, y = sprite.y, w = sprite.w, h = sprite.h;
    var col = sk.color || '#6b4a2b';
    var dark = '#4a3220';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 1, w * 0.5, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(5, w * 0.22);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.lineTo(x + w * 0.12, y + h * 0.12);
    ctx.moveTo(x + w * 0.7, y + h * 0.5);
    ctx.lineTo(x + w * 0.88, y + h * 0.12);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.66, w * 0.42, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.32, w * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#caa884';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.37, w * 0.2, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    var er = Math.max(1.5, w * 0.05);
    ctx.beginPath();
    ctx.arc(x + w * 0.4, y + h * 0.31, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.6, y + h * 0.31, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Sorteia um novo vento para a cidade (entre -máx e +máx). */
  function newWind(city) {
    if (!city) return;
    city.wind = (Math.random() * 2 - 1) * GORILLA_WIND;
  }

  /** Desenha a seta do vento no topo (tamanho = força, lado = direção). */
  function drawWind(ctx, city) {
    if (!ctx || !city) return;
    var cx = city.W / 2, cy = 18;
    var len = city.wind * 600;
    if (len > 70) len = 70;
    if (len < -70) len = -70;
    ctx.save();
    ctx.strokeStyle = '#ffe06b';
    ctx.fillStyle = '#ffe06b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + len, cy);
    ctx.stroke();
    if (Math.abs(len) > 6) {
      var dir = len > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(cx + len, cy);
      ctx.lineTo(cx + len - dir * 8, cy - 5);
      ctx.lineTo(cx + len - dir * 8, cy + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = 'bold 11px ' + _szGameUIFont;
    ctx.textAlign = 'center';
    ctx.fillText('vento', cx, cy - 9);
    ctx.restore();
    var strength = Math.round(Math.min(1, Math.abs(city.wind || 0) / GORILLA_WIND) * 100);
    var direction = city.wind > 0 ? 'para a direita' : (city.wind < 0 ? 'para a esquerda' : 'parado');
    _updateAccessibleHud('kit:gorilas:vento', 'Vento ' + direction + ': ' + strength + '%');
  }

  /**
   * Mira arrastando: enquanto segura o mouse/dedo, define força e ângulo a
   * partir do gorila (aponte para onde quer jogar; longe = mais forte) e
   * desenha a trajetória prevista (linha pontilhada). Ao SOLTAR, congela a
   * mira e marca "soltou" por um quadro. Use a cada quadro no gorila da vez.
   */
  function aimDrag(ctx, thrower) {
    if (!ctx || !thrower) return;
    // Enquanto uma banana está voando, não dá pra mirar de novo (um tiro por vez).
    if (_banana) { _aim.dragging = false; return; }
    var hand = _throwerHand(thrower);
    if (pointer.down) {
      _aim.dragging = true;
      var dx = pointer.x - hand.x, dy = pointer.y - hand.y;
      var vx = dx * GORILLA_K, vy = dy * GORILLA_K;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > GORILLA_MAXV) { vx = vx / sp * GORILLA_MAXV; vy = vy / sp * GORILLA_MAXV; }
      _aim.vx = vx; _aim.vy = vy;
      _aim.power = Math.sqrt(vx * vx + vy * vy);
      _aim.angle = Math.atan2(vy, vx);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      var sx = hand.x, sy = hand.y, svx = vx, svy = vy;
      for (var i = 0; i < 26; i++) {
        svy = svy + GORILLA_GRAV;
        sx = sx + svx; sy = sy + svy;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    } else if (_aim.dragging) {
      _aim.dragging = false;
      _aim.released = true;
    }
  }

  /** Verdadeiro no quadro em que a criança SOLTA a mira (consome o evento). */
  function aimReleased(thrower) {
    if (_aim.released) { _aim.released = false; return true; }
    return false;
  }

  /** Lança a banana do gorila com a mira atual (vento e gravidade agem depois). */
  function throwBanana(thrower, city) {
    if (!thrower) return;
    _ai = null; // qualquer arremesso (humano ou robô) encerra o plano do robô.
    var hand = _throwerHand(thrower);
    _banana = { x: hand.x, y: hand.y, vx: _aim.vx, vy: _aim.vy, rot: 0, trail: [] };
  }

  // ---- Robô (IA): mira por simulação, "pensa" e joga sozinho. Sem ctx. ----
  var _ai = null;

  /**
   * Simula um arremesso (vx,vy) da mão do gorila e devolve a MENOR distância à
   * cabeça do inimigo ao longo do voo. Mesma física da banana (gravidade +
   * vento), sem desenhar nada — roda sem canvas (headless).
   */
  function _simulateThrow(start, vx, vy, city, enemy) {
    var x = start.x, y = start.y, wind = city ? (city.wind || 0) : 0;
    var ex = enemy.x + enemy.w / 2, ey = enemy.y + enemy.h / 2;
    var best = Infinity;
    var H = (city && city.H) ? city.H : 270, W = (city && city.W) ? city.W : 480;
    for (var i = 0; i < 600; i++) {
      vy = vy + GORILLA_GRAV;
      vx = vx + wind;
      x = x + vx; y = y + vy;
      var dx = x - ex, dy = y - ey;
      var d = dx * dx + dy * dy;
      if (d < best) best = d;
      if (y > H + 40 || x < -60 || x > W + 60) break;
    }
    return Math.sqrt(best);
  }

  /**
   * "Pensa": sorteia N tentativas (ângulo -10..90°, força variável), simula cada
   * uma e guarda a melhor (mais perto do inimigo). difficulty maior = mais
   * tentativas = mira melhor. Devolve { vx, vy, power, angle } ou null.
   */
  function _computeBestAim(thrower, city, enemy, difficulty) {
    var hand = _throwerHand(thrower);
    var dir = (enemy.x >= thrower.x) ? 1 : -1;
    var tries = 12 + Math.floor((difficulty || 1) * 8);
    if (tries > 220) tries = 220;
    var best = null, bestD = Infinity;
    for (var i = 0; i < tries; i++) {
      var angDeg = -10 + Math.random() * 100;
      var ang = angDeg * Math.PI / 180;
      var power = 6 + Math.random() * (GORILLA_MAXV - 6);
      var vx = Math.cos(ang) * power * dir;
      var vy = -Math.sin(ang) * power;
      var d = _simulateThrow(hand, vx, vy, city, enemy);
      if (d < bestD) {
        bestD = d;
        best = { vx: vx, vy: vy, power: power, angle: Math.atan2(vy, vx) };
      }
    }
    return best;
  }

  /**
   * Vez do robô (use no "a cada quadro", na vez dele): na 1ª chamada calcula a
   * melhor mira e começa a "pensar" (~0,8s); quando o relógio zera, joga a
   * banana sozinho. Espera a banana atual terminar (um tiro por vez).
   */
  function computerTurn(thrower, city, enemy) {
    if (!thrower || !city || !enemy) return;
    if (_banana) return;
    if (!_ai) {
      var best = _computeBestAim(thrower, city, enemy, (city.holes ? city.holes.length : 0) + 1);
      if (!best) return;
      _aim.vx = best.vx; _aim.vy = best.vy;
      _aim.power = best.power; _aim.angle = best.angle;
      _aim.dragging = false; _aim.released = false;
      _ai = { thinking: 48, aim: best };
      return;
    }
    if (_ai.thinking > 0) { _ai.thinking--; return; }
    _aim.vx = _ai.aim.vx; _aim.vy = _ai.aim.vy;
    throwBanana(thrower, city); // zera _ai
  }

  /** Mostra ângulo (graus) e força da mira atual no canto inferior esquerdo. */
  function drawAimReadout(ctx) {
    if (!ctx) return;
    var deg = Math.round(-_aim.angle * 180 / Math.PI);
    var pow = Math.round(_aim.power);
    ctx.save();
    ctx.font = 'bold 12px ' + _szGameUIFont;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('angulo ' + deg + ' / forca ' + pow, 12, stageH(ctx) - 12);
    ctx.restore();
    _updateAccessibleHud('kit:gorilas:mira', 'Ângulo: ' + deg + ' graus. Força: ' + pow);
  }

  /** Move a banana: gravidade + vento da cidade (use a cada quadro). */
  function updateBanana(city) {
    if (!_banana) return;
    var wind = city ? (city.wind || 0) : 0;
    _banana.vx += wind;
    _banana.vy += GORILLA_GRAV;
    _banana.x += _banana.vx;
    _banana.y += _banana.vy;
    _banana.rot += 0.25;
    _banana.trail.push({ x: _banana.x, y: _banana.y });
    if (_banana.trail.length > 12) _banana.trail.shift();
  }

  /** Desenha a banana voando (com rastro) — uma meia-lua amarela girando. */
  function drawBanana(ctx, city) {
    if (!ctx || !_banana) return;
    var b = _banana;
    ctx.save();
    for (var i = 0; i < b.trail.length; i++) {
      var t = b.trail[i];
      ctx.globalAlpha = (i + 1) / b.trail.length * 0.5;
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#caa400';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.quadraticCurveTo(0, 11, 7, -2);
    ctx.quadraticCurveTo(0, 3, -7, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** A banana acertou o gorila? (zera a banana no acerto). */
  function bananaHitThrower(city, thrower) {
    if (!_banana || !thrower) return false;
    var cx = thrower.x + thrower.w / 2, cy = thrower.y + thrower.h / 2;
    var dx = _banana.x - cx, dy = _banana.y - cy;
    var r = Math.max(thrower.w, thrower.h) / 2 + 4;
    if (dx * dx + dy * dy <= r * r) { _banana = null; return true; }
    return false;
  }

  /** A banana bateu num prédio (abre cratera) OU saiu da tela? (zera a banana). */
  function bananaHitCity(city) {
    if (!_banana || !city) return false;
    var b = _banana, W = city.W, H = city.H;
    for (var i = 0; i < city.buildings.length; i++) {
      var bd = city.buildings[i];
      var top = H - bd.h;
      if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= top) {
        var inHole = false;
        for (var k = 0; k < city.holes.length; k++) {
          var ho = city.holes[k];
          var hdx = b.x - ho.x, hdy = b.y - ho.y;
          if (hdx * hdx + hdy * hdy < ho.r * ho.r) { inHole = true; break; }
        }
        if (!inHole) {
          city.holes.push({ x: b.x, y: b.y, r: BANANA_BLAST });
          _banana = null;
          return true;
        }
      }
    }
    if (b.y > H + 20 || b.x < -40 || b.x > W + 40) { _banana = null; return true; }
    return false;
  }

  /** Som de banana caindo: assobio que desce de tom. */
  function playWhistle() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      var t = ctx.currentTime;
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.5);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g); g.connect(ctx.destination);
      _startAudioSource(o, t); o.stop(t + 0.55);
    } catch (e) {}
  }

  _registerRuntimeDomain('arcade-kits', {
    reset: function () {
      _enemyTypeCreates = 0;
      _scene = 'inicio';
      _stars = null;
      _jumpTapPrev = false;
      _dinoTapPrev = false;
      _forest = null;
      _banana = null;
      _aim = { dragging: false, power: 0, angle: 0, vx: 0, vy: 0, released: false };
      _ai = null;
    }
  });
  /** Som de explosão da banana (reusa a explosão do kit nave). */

`
