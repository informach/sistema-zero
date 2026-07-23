export const gameTwoDInputAndMotionRuntime = `  // ---- Ponteiro (mouse/toque, Pointer Events) ----
  var pointer = { x: 0, y: 0, down: false };
  var pointerHandlers = Object.create(null);
  var pointerHandlerOrder = [];
  function pointerXY(e) {
    var c = document.querySelector('canvas');
    if (!c) return { x: e.clientX || 0, y: e.clientY || 0 };
    var rect = c.getBoundingClientRect();
    // Mapeia a posição na TELA para as coordenadas internas do canvas: quando ele
    // é exibido maior/menor que a resolução (ex.: "preencher a janela"), display ≠
    // interno, então escalamos — senão o ponteiro (dragX/onPointer) fica torto.
    var sx = rect.width ? (_logicalW || c.width) / rect.width : 1;
    var sy = rect.height ? (_logicalH || c.height) / rect.height : 1;
    return { x: ((e.clientX || 0) - rect.left) * sx, y: ((e.clientY || 0) - rect.top) * sy };
  }
  window.addEventListener('pointermove', function (e) {
    var p = pointerXY(e); pointer.x = p.x; pointer.y = p.y;
    if (pointer.down && e && typeof e.preventDefault === 'function') e.preventDefault();
  });
  function _releasePointer(e) {
    pointer.down = false;
    if (e && e.target && typeof e.target.releasePointerCapture === 'function' && e.pointerId !== undefined) {
      try { e.target.releasePointerCapture(e.pointerId); } catch (ignored) {}
    }
  }
  window.addEventListener('pointerup', _releasePointer);
  window.addEventListener('pointercancel', _releasePointer);
  /**
   * @param {EventTarget | null} target
   * @returns {HTMLCanvasElement | null}
   */
  function _canvasEventTarget(target) {
    if (target === _stageCanvas) return _stageCanvas;
    return (typeof HTMLCanvasElement !== 'undefined' && target instanceof HTMLCanvasElement)
      ? target
      : null;
  }
  window.addEventListener('pointerdown', function (e) {
    var p = pointerXY(e); pointer.x = p.x; pointer.y = p.y; pointer.down = true;
    var target = _canvasEventTarget(e && e.target);
    if (target) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof target.focus === 'function') { try { target.focus({ preventScroll: true }); } catch (ignored) {} }
      if (typeof target.setPointerCapture === 'function' && e.pointerId !== undefined) {
        try { target.setPointerCapture(e.pointerId); } catch (ignored) {}
      }
    }
    var generation = _driverGeneration;
    var handlers = pointerHandlerOrder.slice();
    for (var i = 0; i < handlers.length; i++) {
      var id = handlers[i];
      var handler = pointerHandlers[id];
      if (typeof handler !== 'function') continue;
      try { _invokeProjectCallback(handler, undefined, [p.x, p.y]); }
      catch (error) {
        _reportHandlerError('“Quando clicar/tocar”', id, error);
        _removeOrderedIfCurrent(pointerHandlers, pointerHandlerOrder, id, handler);
      }
      if (_runGenerationChanged(generation)) return;
    }
  });
  /**
   * Registra uma função chamada a cada clique/toque. O id vem do bloco Blockly:
   * reexecutar o mesmo bloco substitui o callback, sem teto artificial e sem
   * multiplicar disparos. Código manual sem id é deduplicado por referência.
   */
  function onPointer(fn, explicitId) {
    if (typeof fn !== 'function') return;
    if (_runningLoopId && !explicitId) {
      warnOnce('evento-clique-no-quadro', '“Quando clicar/tocar” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    var id = _stableHandlerId('clique', explicitId, fn);
    if (!pointerHandlers[id]) pointerHandlerOrder.push(id);
    pointerHandlers[id] = fn;
  }

  // ---- Movimento (v0.4.0) ----
  /** Plataforma: esq/dir + pulo (só no chão) + gravidade. */
  function platformer(sprite, ctx, speed, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var s = _finiteNumber(speed, 4);
    var j = _positiveFiniteNumber(jump, 11);
    var g = _worldGravityOr(0.6);
    // Grava a velocidade horizontal p/ os getters (vx/velocidade/está se movendo) —
    // o vy já é real (gravidade/pulo abaixo).
    sprite.vx = (keys.right ? s : 0) - (keys.left ? s : 0);
    if (keys.left) sprite.x -= s;
    if (keys.right) sprite.x += s;
    sprite.vy = _finiteNumber(sprite.vy, 0) + g;
    sprite.y += sprite.vy;
    var visible = _visibleWorldRect(ctx);
    // Persiste "no chão" NO sprite: a animação por estado (autoAnimate) e os
    // jogos leem s.onGround p/ saber se está pulando/caindo.
    _resolveGravityGround(sprite, visible.top, visible.bottom, g);
    if (keys.up && sprite.onGround) {
      sprite.vy = _jumpVelocityForGravity(g, j);
      sprite.onGround = false;
    }
  }

  /** Top-down: 4 direções com diagonal normalizada (diagonal não fica mais rápida). */
  function topDown(sprite, speed) {
    if (!sprite) return;
    var s = _finiteNumber(speed, 3);
    var dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    // Grava a velocidade (o passo real deste quadro) p/ os getters de velocidade;
    // parado → 0 → "está se movendo?" falso.
    sprite.vx = dx * s;
    sprite.vy = dy * s;
    sprite.x += dx * s;
    sprite.y += dy * s;
    // Top-down não possui estado aéreo. Apaga a marca deixada por um helper de
    // plataforma para que autoAnimate resolva parado/andando/vertical corretamente.
    // A marca transitória também não pode sobreviver: collideTileMap a consulta
    // para confirmar um apoio exato no quadro seguinte.
    delete sprite.onGround;
    delete sprite._groundedLastFrame;
  }

  /** Faz o sprite andar em direção ao ponteiro (mouse/toque). */
  function followPointer(sprite, speed) {
    if (!sprite) return;
    var s = _finiteNumber(speed, 3);
    var cx = sprite.x + sprite.w / 2, cy = sprite.y + sprite.h / 2;
    var pointerWorldX = pointer.x + camera.x, pointerWorldY = pointer.y + camera.y;
    var dx = pointerWorldX - cx, dy = pointerWorldY - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > s) {
      // Grava a velocidade (o passo dado) p/ os getters; ao chegar no ponteiro, para (0).
      sprite.vx = (dx / dist) * s; sprite.vy = (dy / dist) * s;
      sprite.x += sprite.vx; sprite.y += sprite.vy;
    }
    else { sprite.vx = 0; sprite.vy = 0; sprite.x = pointerWorldX - sprite.w / 2; sprite.y = pointerWorldY - sprite.h / 2; }
  }

  /** Gruda o sprite nas bordas do canvas (não deixa sair da tela). */
  function clampToScreen(sprite, ctx) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var visible = _visibleWorldRect(ctx);
    if (sprite.x < visible.left) sprite.x = visible.left;
    if (sprite.y < visible.top) sprite.y = visible.top;
    if (sprite.x + sprite.w > visible.right) sprite.x = visible.right - sprite.w;
    if (sprite.y + sprite.h > visible.bottom) sprite.y = visible.bottom - sprite.h;
  }

  // ---- Nave clássica: girar + impulsionar na direção apontada (v0.10.0) ----
  // Ângulo do sprite em RADIANOS; 0 = apontando pra cima; positivo = horário.
  // "Pra frente" = (sin a, -cos a). Os blocos falam em GRAUS; convertemos aqui.
  var DEG = Math.PI / 180;
  function _ensureAngle(s) { s.angle = _finiteNumber(s.angle, 0); return s.angle; }
  function _forward(s) {
    var a = _finiteNumber(s.angle, 0);
    return { x: Math.sin(a), y: -Math.cos(a) };
  }
  /** Gira o sprite em N GRAUS (positivo = horário; negativo = anti-horário). */
  function rotateSprite(s, deg) {
    if (!s) return;
    _ensureAngle(s);
    s.angle += _finiteNumber(deg, 0) * DEG;
  }
  /** Aponta o sprite para um ângulo em GRAUS (0 = pra cima, horário). */
  function pointSprite(s, deg) {
    if (!s) return;
    s.angle = _finiteNumber(deg, 0) * DEG;
  }
  /** Soma força à velocidade na direção apontada (impulso pra frente). */
  function thrust(s, force) {
    if (!s) return;
    var f = _finiteNumber(force, 0.1);
    var d = _forward(s);
    s.vx = _finiteNumber(s.vx, 0) + d.x * f;
    s.vy = _finiteNumber(s.vy, 0) + d.y * f;
  }
  /** Freia o sprite aos poucos: multiplica a velocidade pelo fator (0..1). */
  function applyFriction(s, factor) {
    if (!s) return;
    var k = Math.max(0, Math.min(1, _finiteNumber(factor, 0.97)));
    if (k === 0) { s.vx = 0; s.vy = 0; return; }
    s.vx = _finiteNumber(s.vx, 0) * k;
    s.vy = _finiteNumber(s.vy, 0) * k;
  }
  /**
   * Controle estilo NAVE (asteroids): vira com esquerda/A e direita/D, acelera
   * com cima/W na direção apontada e desliza com atrito ao soltar. Integra a
   * posição (move o sprite pela velocidade). Use a cada quadro.
   */
  function steerThrust(sprite, speed, turnDeg) {
    if (!sprite) return;
    _ensureAngle(sprite);
    var sp = _finiteNumber(speed, 3);
    var turn = _finiteNumber(turnDeg, 3);
    if (keys.left) sprite.angle -= turn * DEG;
    if (keys.right) sprite.angle += turn * DEG;
    var d = _forward(sprite);
    if (keys.up) { sprite.vx = d.x * sp; sprite.vy = d.y * sp; }
    else { sprite.vx = _finiteNumber(sprite.vx, 0) * 0.97; sprite.vy = _finiteNumber(sprite.vy, 0) * 0.97; }
    sprite.x = _finiteNumber(sprite.x, 0) + _finiteNumber(sprite.vx, 0);
    sprite.y = _finiteNumber(sprite.y, 0) + _finiteNumber(sprite.vy, 0);
  }
  /** Devolve a direção (em GRAUS) que o sprite está apontando. */
  function spriteAngleDeg(s) {
    if (!s || !_isFiniteNumber(s.angle)) return 0;
    return s.angle / DEG;
  }
  /**
   * Atira do sprite PARA A FRENTE: cria um tiro na ponta do sprite, com
   * velocidade na direção apontada. Reusa o tiro brilhante (spawnBullet).
   */
  function shootFrom(sprite, group, opts) {
    if (!sprite || !group) return null;
    opts = opts || {};
    var speed = _finiteNumber(opts.speed, 6);
    var d = _forward(sprite);
    var cx = sprite.x + (sprite.w || 0) / 2, cy = sprite.y + (sprite.h || 0) / 2;
    var nose = Math.max(sprite.w || 0, sprite.h || 0) / 2 + 4;
    return spawnBullet(group, {
      x: cx + d.x * nose, y: cy + d.y * nose,
      radius: opts.radius, color: opts.color,
      vx: d.x * speed, vy: d.y * speed
    });
  }
  /**
   * Solta um asteroide vindo de uma BORDA aleatória da tela, rumo ao centro.
   * Sorteia um dos 4 lados, nasce logo fora dele e ganha velocidade pra dentro.
   * Reusa o asteroide desenhado (spawnAsteroid).
   */
  function spawnAsteroidFromEdge(group, opts) {
    if (!group) return null;
    opts = opts || {};
    var ctx = ensureStage();
    var visible = _visibleWorldRect(ctx);
    var W = visible.width || 360;
    var H = visible.height || 360;
    var left = visible.left, top = visible.top;
    var right = left + W, bottom = top + H;
    var speed = _finiteNumber(opts.speed, 1.5);
    var base = _positiveFiniteNumber(opts.size, 40);
    var m = base;
    var side = Math.floor(Math.random() * 4);
    var x, y;
    if (side === 0) { x = left - m; y = top + Math.random() * H; }
    else if (side === 1) { x = left + Math.random() * W; y = bottom + m; }
    else if (side === 2) { x = right + m; y = top + Math.random() * H; }
    else { x = left + Math.random() * W; y = top - m; }
    var asteroid = spawnAsteroid(group, { x: x, y: y, size: base, color: opts.color, vx: 0, vy: 0 });
    if (!asteroid) return null;
    var dx = left + W / 2 - (asteroid.x + asteroid.w / 2);
    var dy = top + H / 2 - (asteroid.y + asteroid.h / 2);
    var distanceToCenter = Math.sqrt(dx * dx + dy * dy) || 1;
    asteroid.vx = dx / distanceToCenter * speed;
    asteroid.vy = dy / distanceToCenter * speed;
    return asteroid;
  }

  // ---- Efeitos visuais (v0.4.0) ----
  /** Clarão: pinta a tela inteira com uma cor translúcida (use num frame). */
  function flash(ctx, color) {
    if (!ctx || !ctx.canvas) return;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, stageW(ctx), stageH(ctx));
    ctx.restore();
  }

  /**
   * Tremor de tela: sacode o ELEMENTO canvas via CSS transform e PARA SOZINHO (o
   * tremor decai num RAF próprio). Chamar de novo renova a intensidade. Usar o
   * transform do elemento (não o ctx.translate) evita conflito com clear/draw.
   */
  var shakeAmount = 0;
  var shakeActive = false;
  var shakeCanvas = null;
  var shakeFrame = 0;
  function _scheduleShake() {
    if (!shakeActive || _paused || shakeFrame) return;
    shakeFrame = requestAnimationFrame(_shakeTick);
  }
  function _shakeTick() {
    shakeFrame = 0;
    if (_paused || !shakeCanvas) return;
    if (shakeAmount > 0.3) {
      var dx = (Math.random() * 2 - 1) * shakeAmount;
      var dy = (Math.random() * 2 - 1) * shakeAmount;
      shakeCanvas.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      shakeAmount *= 0.88;
      _scheduleShake();
    } else {
      shakeCanvas.style.transform = '';
      shakeAmount = 0;
      shakeActive = false;
      shakeCanvas = null;
    }
  }
  function _resetShake() {
    if (shakeFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(shakeFrame);
    shakeFrame = 0;
    if (shakeCanvas) shakeCanvas.style.transform = '';
    shakeAmount = 0;
    shakeActive = false;
    shakeCanvas = null;
  }
  function shake(ctx, intensity) {
    if (!ctx || !ctx.canvas) return;
    var inten = _finiteNumber(intensity, 8);
    if (inten > shakeAmount) shakeAmount = inten;
    shakeCanvas = ctx.canvas;
    if (shakeActive) { _scheduleShake(); return; }
    shakeActive = true;
    _scheduleShake();
  }

  // Partículas: estado + emitir + (atualizar e desenhar). Teto rígido p/ não vazar.
  var particles = [];
  var MAX_PARTICLES = 400;
  // Marca se o aluno já desenhou as partículas NESTE quadro (bloco "atualizar e
  // desenhar as partículas"). Se NÃO, o gameLoop as desenha sozinho no fim do
  // quadro — assim "soltar explosão" funciona sem precisar de bloco extra. Ver tick().
  var _particlesDrawnThisFrame = false;
  /** Explosão de N partículas no ponto x/y, espalhando em todas as direções. */
  function emitParticles(x, y, count, color) {
    var n = Math.max(0, Math.min(Math.floor(_finiteNumber(count, 12)), 80));
    var px = _finiteNumber(x, 0), py = _finiteNumber(y, 0);
    for (var i = 0; i < n; i++) {
      if (particles.length >= MAX_PARTICLES) break;
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * 3 + 1;
      particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, size: Math.random() * 3 + 2, color: color || '#fbbf24'
      });
    }
  }
  /** Move E desenha as partículas (uma chamada por frame); elas somem sozinhas. */
  function drawParticles(ctx) {
    if (!ctx) return;
    _particlesDrawnThisFrame = true;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.06;
      p.life -= 0.02;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  _registerRuntimeDomain('input-and-motion', {
    reset: function () {
      pointer.x = 0;
      pointer.y = 0;
      pointer.down = false;
      pointerHandlers = Object.create(null);
      pointerHandlerOrder = [];
      _resetShake();
      particles = [];
      _particlesDrawnThisFrame = false;
    },
    pause: function () {
      if (shakeFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(shakeFrame);
      shakeFrame = 0;
      if (shakeCanvas) shakeCanvas.style.transform = '';
    },
    resume: function () { _scheduleShake(); }
  });

`
