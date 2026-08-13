export const gameTwoDInputAndMotionRuntime = `  // ---- Ponteiro (mouse/toque, Pointer Events) ----
  var pointer = { x: 0, y: 0, down: false };
  var _activePointerId = null;
  var pointerHandlers = Object.create(null);
  var pointerHandlerOrder = [];
  function _eventPointerId(e) {
    return e && e.pointerId !== undefined ? e.pointerId : '__mouse__';
  }
  function pointerXY(e) {
    var c = _stageCanvas || document.querySelector('canvas');
    if (!c) return { x: e.clientX || 0, y: e.clientY || 0 };
    var rect = c.getBoundingClientRect();
    // Mapeia a posição na TELA para as coordenadas internas do canvas: quando ele
    // é exibido maior/menor que a resolução (ex.: "preencher a janela"), display ≠
    // interno, então escalamos — senão o ponteiro (dragX/onPointer) fica torto.
    // clientWidth/clientHeight excluem a moldura CSS. O ponto zero do desenho fica
    // depois de clientLeft/clientTop; usar o rect inteiro deslocava cliques quando
    // a criança ativava “Mostrar a borda da tela”.
    var displayW = _positiveFiniteNumber(c.clientWidth, rect.width);
    var displayH = _positiveFiniteNumber(c.clientHeight, rect.height);
    var sx = displayW ? (_logicalW || c.width) / displayW : 1;
    var sy = displayH ? (_logicalH || c.height) / displayH : 1;
    var left = rect.left + _finiteNumber(c.clientLeft, 0);
    var top = rect.top + _finiteNumber(c.clientTop, 0);
    return { x: ((e.clientX || 0) - left) * sx, y: ((e.clientY || 0) - top) * sy };
  }
  window.addEventListener('pointermove', function (e) {
    var fromStage = _canvasEventTarget(e && e.target);
    var continuesStageDrag = pointer.down && _activePointerId === _eventPointerId(e);
    if (!fromStage && !continuesStageDrag) return;
    var p = pointerXY(e); pointer.x = p.x; pointer.y = p.y;
    if (continuesStageDrag && e && typeof e.preventDefault === 'function') e.preventDefault();
  });
  function _releasePointer(e) {
    if (!pointer.down || _activePointerId !== _eventPointerId(e)) return;
    var activeId = _activePointerId;
    pointer.down = false;
    _activePointerId = null;
    if (_stageCanvas && typeof _stageCanvas.releasePointerCapture === 'function' && activeId !== '__mouse__') {
      try { _stageCanvas.releasePointerCapture(activeId); } catch (ignored) {}
    }
  }
  window.addEventListener('pointerup', _releasePointer);
  window.addEventListener('pointercancel', _releasePointer);
  /** Verdadeiro enquanto o botão do mouse ou o dedo está pressionado no jogo. */
  function pointerDown() { return !!pointer.down; }
  /**
   * @param {EventTarget | null} target
   * @returns {HTMLCanvasElement | null}
   */
  function _canvasEventTarget(target) {
    if (target === _stageCanvas) return _stageCanvas;
    return null;
  }
  window.addEventListener('pointerdown', function (e) {
    var target = _canvasEventTarget(e && e.target);
    // O evento pertence ao JOGO somente quando começou no palco. Controles HTML,
    // letterbox e outros canvases do documento não alteram o estado nem chamam
    // blocos “Quando clicar/tocar”. A soltura continua global para encerrar um
    // arraste que começou no palco e terminou fora dele.
    if (!target) return;
    if (pointer.down) return;
    var p = pointerXY(e); pointer.x = p.x; pointer.y = p.y; pointer.down = true;
    _activePointerId = _eventPointerId(e);
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof target.focus === 'function') { try { target.focus({ preventScroll: true }); } catch (ignored) {} }
    if (typeof target.setPointerCapture === 'function' && e.pointerId !== undefined) {
      try { target.setPointerCapture(e.pointerId); } catch (ignored) {}
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
    // "Qualquer tecla ou toque" — a lista mora no worldEvents (um lugar só, uma
    // limpeza só no "Jogar de novo"); aqui é só o aviso do lado do ponteiro.
    _emitAnyInput();
  });
  /**
   * Registra uma função chamada a cada clique/toque. O id vem do bloco Blockly:
   * reexecutar o mesmo bloco substitui o callback, sem teto artificial e sem
   * multiplicar disparos. Código manual sem id é deduplicado por referência.
   */
  function onPointer(fn, id) {
    if (typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-clique-no-quadro', '“Quando clicar/tocar” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    // O evento pode ser o PRIMEIRO bloco que usa o canvas. Inicializar aqui
    // associa um canvas já existente ao palco antes do primeiro toque.
    ensureStage();
    var handlerId = _stableHandlerId('clique', id, fn);
    if (!pointerHandlers[handlerId]) pointerHandlerOrder.push(handlerId);
    pointerHandlers[handlerId] = fn;
  }

  // ---- Movimento (v0.4.0) ----
  /**
   * Direcional apertado, pelo teclado OU pelo controle de TOQUE.
   *
   * ⚠️ O pad de toque (enableClassicControls) alimenta só a camada semântica, e por
   * muito tempo apenas dois helpers a liam. Todo o resto do movimento lia apenas o
   * mapa de teclas — ou seja, no celular o botão de direção não movia nada nos jogos
   * que não usam a plataforma clássica. Para TECLADO os dois caminhos são
   * equivalentes (as mesmas setas/WASD alimentam os dois), então isto não muda jogo
   * nenhum que já exista: só acrescenta o dedo.
   */
  function _dirHeld(dir) {
    if (keys[dir]) return true;
    return typeof actionDown === 'function' && actionDown(dir);
  }
  /**
   * O gesto de PULAR, por tecla, toque, ponteiro ou o botão A do pad.
   *
   * ⚠️ Do pad vem só o DEDO (_actionDownByTouch), nunca o teclado dele: o mapa de
   * teclas da camada semântica manda a tecla z e o ESPAÇO para "jump", e ler isso aqui daria
   * teclas de pulo NOVAS a blocos que a criança já usa.
   */
  function _jumpHeld() {
    if (keys.up || keyDown('Space') || pointer.down) return true;
    return (
      typeof _actionDownByTouch === 'function' &&
      (_actionDownByTouch('jump') || _actionDownByTouch('up'))
    );
  }
  function _platformerMove(sprite, speed, jump, ctx) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
    var s = _finiteNumber(speed, 4);
    var j = _positiveFiniteNumber(jump, 11);
    var g = world.gravity;
    var wasGrounded = _beginGroundFrame(sprite);
    // Grava a velocidade horizontal p/ os getters (vx/velocidade/está se movendo) —
    // o vy já é real (gravidade explícita/pulo abaixo).
    var indoDireita = _dirHeld('right');
    var indoEsquerda = _dirHeld('left');
    sprite.vx = (indoDireita ? s : 0) - (indoEsquerda ? s : 0);
    if (indoEsquerda) sprite.x -= s;
    if (indoDireita) sprite.x += s;
    sprite.vy = _finiteNumber(sprite.vy, 0);
    // ⚠️ O botão A do pad entra pelo DEDO, não pelo teclado da camada semântica:
    // ler actionDown de "jump" aqui fazia a tecla z e o ESPAÇO pularem em todo jogo de
    // plataforma que já existia (ver _actionDownByTouch).
    var pressingJump =
      _dirHeld('up') || (typeof _actionDownByTouch === 'function' && _actionDownByTouch('jump'));
    var wantsJump = pressingJump && sprite._platformJumpHeld !== true;
    sprite._platformJumpHeld = pressingJump;
    var jumped = false;
    if (wantsJump && wasGrounded) {
      _jumpFromGround(sprite, g, j);
      jumped = true;
    }
    sprite.y += sprite.vy;
    if (ctx && ctx.canvas) {
      var visible = _visibleWorldRect(ctx);
      // O helper legado usa a borda visível como chão. O helper de terreno não.
      _resolveGravityGround(sprite, visible.top, visible.bottom, g);
      if (wantsJump && !jumped && sprite.onGround) _jumpFromGround(sprite, g, j);
    }
    _commitRecordedMotion(sprite);
  }
  /** Plataforma na tela: a borda atraída pela gravidade funciona como chão. */
  function platformer(sprite, ctx, speed, jump) {
    if (!ctx || !ctx.canvas) return;
    _platformerMove(sprite, speed, jump, ctx);
  }
  /** Plataforma no terreno: só tiles, figuras e bordas explícitas confirmam chão. */
  function platformerWithTerrain(sprite, speed, jump) {
    _platformerMove(sprite, speed, jump, null);
  }
  /** Só pula e integra no eixo vertical; o terreno confirma o pouso depois. */
  function jumpWithTerrain(sprite, jump) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
    var g = world.gravity;
    var wasGrounded = _beginGroundFrame(sprite);
    var pressing = _jumpHeld();
    var wantsJump = pressing && sprite._terrainJumpHeld !== true;
    sprite._terrainJumpHeld = pressing;
    if (wantsJump && wasGrounded) _jumpFromGround(sprite, g, jump);
    sprite.vy = _finiteNumber(sprite.vy, 0);
    sprite.y = _finiteNumber(sprite.y, 0) + sprite.vy;
    _commitRecordedMotion(sprite);
  }

  /** Top-down: 4 direções com diagonal normalizada (diagonal não fica mais rápida). */
  function topDown(sprite, speed) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
    var s = _finiteNumber(speed, 3);
    var dx = (_dirHeld('right') ? 1 : 0) - (_dirHeld('left') ? 1 : 0);
    var dy = (_dirHeld('down') ? 1 : 0) - (_dirHeld('up') ? 1 : 0);
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    // Grava a velocidade (o passo real deste quadro) p/ os getters de velocidade;
    // parado → 0 → "está se movendo?" falso.
    sprite.vx = dx * s;
    sprite.vy = dy * s;
    sprite.x += dx * s;
    sprite.y += dy * s;
    _commitRecordedMotion(sprite);
    _leaveGroundMode(sprite);
  }

  // Movimento SEM chão (top-down, voar livre, nadar): apaga a marca deixada por
  // um helper de plataforma para que autoAnimate resolva parado/andando/vertical
  // corretamente — senão um peixe nadando aparece como "caindo". A marca
  // transitória também não pode sobreviver: collideTileMap a consulta para
  // confirmar um apoio exato no quadro seguinte.
  function _leaveGroundMode(sprite) {
    delete sprite.onGround;
    delete sprite._groundedLastFrame;
    delete sprite._groundSupport;
  }

  // ---- Voar e nadar (v0.55.0) ----
  // Três jeitos NOVOS de o sprite se mover, no mesmo formato do "estilo
  // plataforma": a criança encaixa um deles no "a cada quadro" e pronto.
  // O número que ela digita é a velocidade MÁXIMA (o teto), como nos vizinhos.
  function _clampSpeed(vx, vy, max) {
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (!(sp > max) || !(sp > 0)) return { x: vx, y: vy };
    return { x: (vx / sp) * max, y: (vy / sp) * max };
  }

  /**
   * Voar livre: sem gravidade nenhuma, com PESO. Acelera enquanto a tecla está
   * apertada e PLANA um bom tanto ao soltar. Passarinho, fadinha, peixe-balão.
   *
   * ⚠️ A INÉRCIA é a única coisa que separa isto do top-down (que também anda na
   * diagonal e também não tem gravidade), então ela precisa ser SENTIDA. Com os
   * valores da 1ª versão (0.35 / 0.9) a arrancada durava 3 quadros e a virada 6:
   * ninguém enxergava, e na prática era "top-down com um deslizinho". Nestes
   * (0.10 / 0.96), com velocidade 3: sobe ao topo em 0,17s e desliza ~72px por
   * 2,3s; ao inverter, cruza o zero em ~0,18s e chega ao teto oposto em ~0,33s.
   * Dá para sentir o impulso e é preciso antecipar a curva, que é o que "estar
   * no ar" quer dizer.
   */
  function flyFree(sprite, speed) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
    var s = _positiveFiniteNumber(speed, 3);
    var dx = (_dirHeld('right') ? 1 : 0) - (_dirHeld('left') ? 1 : 0);
    var dy = (_dirHeld('down') ? 1 : 0) - (_dirHeld('up') ? 1 : 0);
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    var vx = _finiteNumber(sprite.vx, 0) + dx * s * 0.1;
    var vy = _finiteNumber(sprite.vy, 0) + dy * s * 0.1;
    // Sem tecla naquele eixo, vai parando aos poucos (planeio).
    if (!dx) vx *= 0.96;
    if (!dy) vy *= 0.96;
    // Migalha de velocidade vira zero: senão "está se movendo?" fica verdadeiro
    // para sempre e a animação nunca volta p/ "parado".
    if (Math.abs(vx) < 0.01) vx = 0;
    if (Math.abs(vy) < 0.01) vy = 0;
    var v = _clampSpeed(vx, vy, s);
    sprite.vx = v.x;
    sprite.vy = v.y;
    sprite.x = _finiteNumber(sprite.x, 0) + v.x;
    sprite.y = _finiteNumber(sprite.y, 0) + v.y;
    _commitRecordedMotion(sprite);
    _leaveGroundMode(sprite);
  }

  /**
   * Bater as asas: cada TOQUE (↑/W/Espaço ou um toque na tela) dá um empurrão
   * oposto à gravidade — no ar também. A queda vem do applyGravity explícito.
   * ⚠️ A borda do toque é por SPRITE, não por módulo: dois pássaros na mesma
   * tela precisam bater as asas cada um no seu.
   */
  function flap(sprite, ctx, force) {
    if (!sprite || !ctx || !ctx.canvas) return;
    _recordPreviousPosition(sprite);
    var f = _positiveFiniteNumber(force, 8);
    var g = world.gravity;
    sprite.vy = _finiteNumber(sprite.vy, 0);
    sprite.y = _finiteNumber(sprite.y, 0) + sprite.vy;
    var visible = _visibleWorldRect(ctx);
    // Pousa no chão (senão o bicho some para sempre fora da tela); quem quiser
    // "morreu ao encostar" pergunta a posição.
    _resolveGravityGround(sprite, visible.top, visible.bottom, g);
    var pressing = _jumpHeld();
    if (pressing && !sprite._flapHeld) {
      sprite.vy = _jumpVelocityForGravity(g, f);
      sprite.onGround = false;
    }
    sprite._flapHeld = pressing;
    _commitRecordedMotion(sprite);
  }

  /**
   * Nadar: água pesada. O arrasto deixa tudo mais lento e macio. Sem aplicar
   * gravidade o bicho boia; com applyGravity antes, afunda suavemente porque a
   * água amortece a velocidade vertical.
   */
  function swim(sprite, speed) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
    var s = _positiveFiniteNumber(speed, 2);
    // ⚠️ Le o TOQUE junto do teclado. Lendo so as teclas, uma fase de natacao ficava
    // injogavel no celular: os controles de toque alimentam a acao semantica, entao a
    // crianca nao se movia e morria por tempo, em laco.
    var dx = (_dirHeld('right') ? 1 : 0) - (_dirHeld('left') ? 1 : 0);
    var dy = (_dirHeld('down') ? 1 : 0) - (_dirHeld('up') ? 1 : 0);
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    var vx = (_finiteNumber(sprite.vx, 0) + dx * s * 0.3) * 0.88;
    var vy = (_finiteNumber(sprite.vy, 0) + dy * s * 0.3) * 0.88;
    // Migalha vira zero (sem gravidade explícita, o bicho BOIA de verdade).
    if (Math.abs(vx) < 0.01) vx = 0;
    if (Math.abs(vy) < 0.01) vy = 0;
    var v = _clampSpeed(vx, vy, s);
    sprite.vx = v.x;
    sprite.vy = v.y;
    sprite.x = _finiteNumber(sprite.x, 0) + v.x;
    sprite.y = _finiteNumber(sprite.y, 0) + v.y;
    _commitRecordedMotion(sprite);
    _leaveGroundMode(sprite);
  }

  /** Faz o sprite andar em direção ao ponteiro (mouse/toque). */
  function followPointer(sprite, speed) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
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
    _commitRecordedMotion(sprite);
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
  function rotateSprite(sprite, degrees) {
    if (!sprite) return;
    _ensureAngle(sprite);
    sprite.angle += _finiteNumber(degrees, 0) * DEG;
  }
  /** Aponta o sprite para um ângulo em GRAUS (0 = pra cima, horário). */
  function pointSprite(sprite, degrees) {
    if (!sprite) return;
    sprite.angle = _finiteNumber(degrees, 0) * DEG;
  }
  /** Soma força à velocidade na direção apontada (impulso pra frente). */
  function thrust(sprite, force) {
    if (!sprite) return;
    var f = _finiteNumber(force, 0.1);
    var d = _forward(sprite);
    sprite.vx = _finiteNumber(sprite.vx, 0) + d.x * f;
    sprite.vy = _finiteNumber(sprite.vy, 0) + d.y * f;
  }
  /** Freia o sprite aos poucos: multiplica a velocidade pelo fator (0..1). */
  function applyFriction(sprite, factor) {
    if (!sprite) return;
    var k = Math.max(0, Math.min(1, _finiteNumber(factor, 0.97)));
    if (k === 0) { sprite.vx = 0; sprite.vy = 0; return; }
    sprite.vx = _finiteNumber(sprite.vx, 0) * k;
    sprite.vy = _finiteNumber(sprite.vy, 0) * k;
  }
  /**
   * Controle estilo NAVE (asteroids): vira com esquerda/A e direita/D, acelera
   * com cima/W na direção apontada e desliza com atrito ao soltar. Integra a
   * posição (move o sprite pela velocidade). Use a cada quadro.
   */
  function steerThrust(sprite, speed, turnDegrees) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
    _ensureAngle(sprite);
    var sp = _finiteNumber(speed, 3);
    var turn = _finiteNumber(turnDegrees, 3);
    if (_dirHeld('left')) sprite.angle -= turn * DEG;
    if (_dirHeld('right')) sprite.angle += turn * DEG;
    var d = _forward(sprite);
    if (_dirHeld('up')) { sprite.vx = d.x * sp; sprite.vy = d.y * sp; }
    else { sprite.vx = _finiteNumber(sprite.vx, 0) * 0.97; sprite.vy = _finiteNumber(sprite.vy, 0) * 0.97; }
    sprite.x = _finiteNumber(sprite.x, 0) + _finiteNumber(sprite.vx, 0);
    sprite.y = _finiteNumber(sprite.y, 0) + _finiteNumber(sprite.vy, 0);
    _commitRecordedMotion(sprite);
  }
  /** Devolve a direção (em GRAUS) que o sprite está apontando. */
  function spriteAngleDeg(sprite) {
    if (!sprite || !_isFiniteNumber(sprite.angle)) return 0;
    return sprite.angle / DEG;
  }
  /**
   * Atira do sprite PARA A FRENTE: cria um tiro na ponta do sprite, com
   * velocidade na direção apontada. Reusa o tiro brilhante (spawnBullet).
   */
  function shootFrom(sprite, group, options) {
    if (!sprite || !group) return null;
    options = options || {};
    var speed = _finiteNumber(options.speed, 6);
    var d = _forward(sprite);
    var cx = sprite.x + (sprite.w || 0) / 2, cy = sprite.y + (sprite.h || 0) / 2;
    var nose = Math.max(sprite.w || 0, sprite.h || 0) / 2 + 4;
    return spawnBullet(group, {
      x: cx + d.x * nose, y: cy + d.y * nose,
      radius: options.radius, color: options.color,
      vx: d.x * speed, vy: d.y * speed
    });
  }
  /**
   * Solta um asteroide vindo de uma BORDA aleatória da tela, rumo ao centro.
   * Sorteia um dos 4 lados, nasce logo fora dele e ganha velocidade pra dentro.
   * Reusa o asteroide desenhado (spawnAsteroid).
   */
  function spawnAsteroidFromEdge(group, options) {
    if (!group) return null;
    options = options || {};
    var ctx = ensureStage();
    var visible = _visibleWorldRect(ctx);
    var W = visible.width || 360;
    var H = visible.height || 360;
    var left = visible.left, top = visible.top;
    var right = left + W, bottom = top + H;
    var speed = _finiteNumber(options.speed, 1.5);
    var base = _positiveFiniteNumber(options.size, 40);
    var m = base;
    var side = Math.floor(Math.random() * 4);
    var x, y;
    if (side === 0) { x = left - m; y = top + Math.random() * H; }
    else if (side === 1) { x = left + Math.random() * W; y = bottom + m; }
    else if (side === 2) { x = right + m; y = top + Math.random() * H; }
    else { x = left + Math.random() * W; y = top - m; }
    var asteroid = spawnAsteroid(group, { x: x, y: y, size: base, color: options.color, vx: 0, vy: 0 });
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
      _activePointerId = null;
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
