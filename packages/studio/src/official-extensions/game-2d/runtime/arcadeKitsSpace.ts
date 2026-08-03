export const gameTwoDArcadeSpaceRuntime = `  // ---- Kit "Nave & Asteroides" (v0.7.0): desenhos prontos + efeitos ----
  // Um sprite pode ter um "skin" (sprite.skin) que muda o jeito que ele é
  // desenhado. drawSprite despacha: skin 'ship' -> nave; 'asteroid' -> asteroide.
  // Assim o mesmo modelo de sprite (x/y/w/h/vx/vy) ganha o visual do jogo.

  /** Cria uma nave (corpo + asas customizáveis; cabine e foguinho fixos, animados). */
  function createShip(options) {
    options = options || {};
    var s = createSprite({ x: options.x, y: options.y, w: options.w, h: options.h, color: options.body });
    s.skin = { kind: 'ship', body: options.body || '#35e8ff', wings: options.wings || '#2568ff' };
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
  function spawnAsteroid(group, options) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    options = options || {};
    var base = _positiveFiniteNumber(options.size, 36);
    // Cada asteroide nasce com um tamanho um pouco diferente (variedade automática).
    var size = Math.round(base * (0.65 + Math.random() * 0.5));
    var s = createSprite({ x: options.x, y: options.y, w: size, h: size, color: options.color, vx: options.vx, vy: options.vy });
    s.skin = {
      kind: 'asteroid',
      color: options.color || '#8d8f9b',
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
  function createEnemyType(options) {
    options = options || {};
    _enemyTypeCreates += 1;
    if (_enemyTypeCreates === 61) {
      console.warn(
        'SZGame2D: "Criar tipo de inimigo" está rodando sem parar: ele provavelmente está DENTRO do "A cada quadro do jogo". Monte esse bloco FORA do laço (ele roda uma vez só); dentro do laço a lista é recriada a cada quadro e os inimigos soltos somem da tela.'
      );
    }
    var type = createGroup();
    type.bullets = createGroup();
    type.config = {
        behavior: options.behavior || 'patrulha',
        color: options.color || '#e4573d',
        image: (typeof options.image === 'string') ? options.image : '',
        // Figura desenhada (defineShape) como visual do tipo; '' = imagem/cor.
        shape: (typeof options.shape === 'string') ? options.shape : '',
        hp: _positiveFiniteNumber(options.hp, 3),
        speed: _finiteNumber(options.speed, 2),
        dmg: _finiteNumber(options.dmg, 1),
        w: _positiveFiniteNumber(options.w, 32),
        h: _positiveFiniteNumber(options.h, 32),
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
    // Figura desenhada VENCE a imagem (setShape cancela imagem — "uma coisa por vez").
    if (c.shape) setShape(s, c.shape);
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
    // GRAÇA: jogos de ONDA soltam o 1º inimigo via "A cada N quadros", alguns
    // segundos depois do início. Sem esta janela, o aviso dispararia já no 1º
    // quadro (antes da 1ª onda) — falso-positivo em Sobrevivente/Herói que Evolui
    // e reprova o smoke e2e. ~6s (chamado ~2×/quadro por update+draw) dá tempo à
    // onda; se NUNCA soltar (esquecimento real), avisa depois disso.
    type._emptyUpdates = (type._emptyUpdates || 0) + 1;
    if (type._emptyUpdates < 720) return;
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
    // A direção do mundo escolhe chão/pulo, mas a aceleração nunca vem escondida
    // neste helper: use applyGravityToGroup(type) antes de atualizar inimigos
    // terrestres que devem cair.
    var g = world.gravity;
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
        // Pula de tempos em tempos ("ritmo" quadros) e resolve o chão.
        s.vx = 0;
        s.vy = _finiteNumber(s.vy, 0);
        s.y += s.vy;
        if (s.vy !== 0 || typeof s.onGround === 'boolean') {
          _resolveGravityGround(s, visible.top, visible.bottom, g);
        }
        if (typeof s._jcd !== 'number') s._jcd = c.jumpRate;
        if (s.onGround) {
          s._jcd -= 1;
          if (s._jcd <= 0) { s.vy = _jumpVelocityForGravity(g, c.jump); s.onGround = false; s._jcd = c.jumpRate; }
        }
      } else if (b === 'atirador') {
        // Fica no chao, vira para o alvo e atira a cada "cadencia" quadros.
        s.vx = 0;
        s.vy = _finiteNumber(s.vy, 0);
        s.y += s.vy;
        if (s.vy !== 0 || typeof s.onGround === 'boolean') {
          _resolveGravityGround(s, visible.top, visible.bottom, g);
        }
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
        // Integra o vy existente. Num top-down ele continua 0; num jogo de
        // plataforma applyGravityToGroup o acelera explicitamente antes daqui.
        s.vy = _finiteNumber(s.vy, 0);
        s.y += s.vy;
        if (s.vy !== 0 || typeof s.onGround === 'boolean') {
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
    // Integra e poda os tiros numa passagem. Eles seguem em linha reta, sem a
    // gravidade do mundo, e usam uma margem de 40 px fora da área visível.
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
  function onEnemyDefeated(type, fn, id) {
    if (!type || typeof fn !== 'function') return;
    if (!type._defeatHandlers) type._defeatHandlers = Object.create(null);
    if (!type._defeatOrder) type._defeatOrder = [];
    var handlerId = _stableHandlerId('inimigo-derrotado', id, fn);
    if (!type._defeatHandlers[handlerId]) type._defeatOrder.push(handlerId);
    type._defeatHandlers[handlerId] = fn;
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
  function enemyDamage(sprite) {
    return sprite ? _finiteNumber(sprite.dmg, 1) : 1;
  }

  /**
   * Machuca o sprite com o dano do inimigo/tiro e faz piscar. Enquanto pisca,
   * e INVENCIVEL (nao leva dano de novo) — sem isso, o contato continuo
   * drenaria a vida a cada quadro.
   */
  function hurtByEnemy(sprite, enemy) {
    if (!sprite || !enemy) return;
    damageSprite(sprite, enemyDamage(enemy), 45);
  }

`
