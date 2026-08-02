export const gameTwoDWorldEventsRuntime = `  // ---- Eventos "Quando…" ----
  // Um listener real despacha para callbacks identificados pelo id do bloco.
  // A identidade não depende do texto da função: closures iguais continuam
  // sendo eventos diferentes quando vieram de blocos diferentes.
  var keyHandlers = Object.create(null);
  var keyHandlerOrder = [];
  window.addEventListener('keydown', function (e) {
    _setDirectionalKey(e, true);
    pressedKeys[_normalizeGameKey(e.key)] = true;
    pressedKeys[_normalizeGameKey(e.code)] = true;
    // O sistema REPETE keydown enquanto a tecla fica segurada; "quando apertar" só
    // dispara no toque, então ignoramos as repetições (senão vira metralhadora).
    if (e.repeat) return;
    var generation = _driverGeneration;
    var handlers = keyHandlerOrder.slice();
    for (var i = 0; i < handlers.length; i++) {
      var id = handlers[i];
      var h = keyHandlers[id];
      if (!h) continue;
      var hit = _eventMatchesGameKey(e, h.key);
      if (!hit) continue;
      try { _invokeProjectCallback(h.fn, h, []); }
      catch (error) {
        _reportHandlerError('“Quando apertar a tecla”', id, error);
        _removeOrderedIfCurrent(keyHandlers, keyHandlerOrder, id, h);
      }
      if (_runGenerationChanged(generation)) return;
    }
    // "Qualquer tecla" vem DEPOIS das teclas específicas (e herda o filtro de
    // repetição acima: segurar a tecla não dispara em rajada). Se um handler
    // específico reiniciou o jogo, o laço já saiu e este nem roda.
    _emitAnyInput();
  });
  /** Roda fn toda vez que a tecla é apertada (compara e.key e e.code). */
  function onKey(key, fn, id) {
    if (typeof fn !== 'function' || !key) return;
    if (_runningLoopId && !id) {
      warnOnce('evento-tecla-no-quadro', '“Quando apertar a tecla” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    var handlerId = _stableHandlerId('tecla', id, fn);
    if (!keyHandlers[handlerId]) keyHandlerOrder.push(handlerId);
    keyHandlers[handlerId] = { key: key, fn: fn };
  }
  // Sobreposição: registra pares (getA, getB, fn) e checa num rAF interno (começa
  // sob demanda). Edge-triggered: dispara UMA vez quando começam a encostar. Os
  // sprites entram como thunks (() => sprite) — resolvidos no disparo, então a
  // ordem dos blocos no topo não causa erro de "antes de declarar".
  var overlapHandlers = Object.create(null);
  var _overlapOrder = [];
  function _runOverlapHandlers() {
    // "Pausar o jogo" congela também a checagem de sobreposição: sem isto, dois
    // sprites parados encostados seguiriam disparando o "quando encostar", e ao
    // despausar viria uma borda FALSA. Congelar o wasOverlapping preserva o estado.
    if (!_paused) {
      var generation = _driverGeneration;
      var handlers = _overlapOrder.slice();
      for (var i = 0; i < handlers.length; i++) {
        var id = handlers[i];
        var h = overlapHandlers[id];
        if (!h) continue;
        var a = null, b = null;
        try {
          a = _invokeProjectCallback(h.getA, h, []);
          b = _invokeProjectCallback(h.getB, h, []);
        }
        catch (error) {
          _reportHandlerError('“Quando encostar”', id, error);
          _removeOrderedIfCurrent(overlapHandlers, _overlapOrder, id, h);
          if (_runGenerationChanged(generation)) return;
          continue;
        }
        if (_runGenerationChanged(generation)) return;
        var over = isColliding(a, b);
        if (over && !h.wasOverlapping) {
          try { _invokeProjectCallback(h.fn, h, []); }
          catch (error) {
            _reportHandlerError('“Quando encostar”', id, error);
            _removeOrderedIfCurrent(overlapHandlers, _overlapOrder, id, h);
          }
          if (_runGenerationChanged(generation)) return;
        }
        h.wasOverlapping = over;
      }
    }
  }
  function onOverlap(getA, getB, fn, id) {
    if (typeof getA !== 'function' || typeof getB !== 'function' || typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-contato-no-quadro', '“Quando encostar” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    var handlerId = _stableHandlerId('contato', id, fn);
    if (!overlapHandlers[handlerId]) _overlapOrder.push(handlerId);
    overlapHandlers[handlerId] = { getA: getA, getB: getB, fn: fn, wasOverlapping: false };
    _ensureDriver();
  }

  // ---- "Quando o sprite PULAR" ----
  // Quem avisa é o MOTOR, no instante exato em que o pulo acontece: o "estilo
  // plataforma", o "pular no chão" e o "controlar o dinossauro" chamam _emitJump
  // logo depois de mandar o sprite para cima. Assim o bloco funciona em qualquer
  // jogo de pulo, e não só no kit em que a criança está. O sprite entra como
  // thunk (() => sprite), igual ao "quando encostar": resolvido no DISPARO, então
  // a ordem dos blocos no topo não causa erro de "antes de declarar".
  var jumpHandlers = Object.create(null);
  var _jumpOrder = [];
  function onJump(getSprite, fn, id) {
    if (typeof getSprite !== 'function' || typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-pulo-no-quadro', '“Quando o sprite pular” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    var handlerId = _stableHandlerId('pulo', id, fn);
    if (!jumpHandlers[handlerId]) _jumpOrder.push(handlerId);
    jumpHandlers[handlerId] = { getSprite: getSprite, fn: fn };
  }
  /** Chamado pelo motor quando um sprite pula de verdade. */
  function _emitJump(sprite) {
    if (!sprite || _jumpOrder.length === 0) return;
    var generation = _driverGeneration;
    var handlers = _jumpOrder.slice();
    for (var i = 0; i < handlers.length; i++) {
      var id = handlers[i];
      var h = jumpHandlers[id];
      if (!h) continue;
      var alvo = null;
      try { alvo = _invokeProjectCallback(h.getSprite, h, []); }
      catch (error) {
        _reportHandlerError('“Quando o sprite pular”', id, error);
        _removeOrderedIfCurrent(jumpHandlers, _jumpOrder, id, h);
        continue;
      }
      if (alvo !== sprite) continue;
      try { _invokeProjectCallback(h.fn, h, []); }
      catch (error) {
        _reportHandlerError('“Quando o sprite pular”', id, error);
        _removeOrderedIfCurrent(jumpHandlers, _jumpOrder, id, h);
      }
      if (_runGenerationChanged(generation)) return;
    }
  }

  // ---- "Quando apertar QUALQUER tecla ou tocar na tela" ----
  // A tela de início ("aperte qualquer coisa para começar"). Uma lista só, viva
  // aqui; o listener de PONTEIRO mora noutro arquivo e apenas chama o _emitAnyInput,
  // p/ a limpeza do "Jogar de novo" ficar num domínio só (o 'world', abaixo).
  var anyInputHandlers = Object.create(null);
  var _anyInputOrder = [];
  function onAnyInput(fn, id) {
    if (typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-qualquer-no-quadro', '“Quando apertar qualquer tecla ou tocar na tela” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    // "Qualquer entrada" inclui toque; prepare o palco mesmo quando não existe
    // um bloco onPointer no projeto.
    ensureStage();
    var handlerId = _stableHandlerId('qualquer', id, fn);
    if (!anyInputHandlers[handlerId]) _anyInputOrder.push(handlerId);
    anyInputHandlers[handlerId] = { fn: fn };
  }
  /** Um disparo por APERTO/TOQUE (o keydown já filtrou a repetição da tecla). */
  function _emitAnyInput() {
    if (_anyInputOrder.length === 0) return;
    var generation = _driverGeneration;
    var handlers = _anyInputOrder.slice();
    for (var i = 0; i < handlers.length; i++) {
      var id = handlers[i];
      var h = anyInputHandlers[id];
      if (!h) continue;
      try { _invokeProjectCallback(h.fn, h, []); }
      catch (error) {
        _reportHandlerError('“Quando apertar qualquer tecla ou tocar na tela”', id, error);
        _removeOrderedIfCurrent(anyInputHandlers, _anyInputOrder, id, h);
      }
      if (_runGenerationChanged(generation)) return;
    }
  }

  // ---- Perguntas (booleanos): "tecla apertada?" e "sprites se tocando?" ----
  // Estado de TODAS as teclas seguradas (o "keys" lá de cima só cobre as setas).
  var pressedKeys = Object.create(null);
  window.addEventListener('keyup', function (e) {
    _setDirectionalKey(e, false);
    pressedKeys[_normalizeGameKey(e.key)] = false;
    pressedKeys[_normalizeGameKey(e.code)] = false;
  });
  // Ao trocar de aba/janela (alt-tab), o "keyup"/"pointerup" não chega ao jogo e a
  // tecla/dedo ficaria "grudado" (o herói anda sozinho para sempre). Ao perder o
  // foco, soltamos tudo: setas, todas as teclas seguradas e o clique.
  function _releaseAllInputs() {
    keys.left = keys.right = keys.up = keys.down = false;
    for (var k in pressedKeys) pressedKeys[k] = false;
    pointer.down = false;
    _activePointerId = null;
  }
  function _suspendInputAndClock() {
    _releaseAllInputs();
    _resetDriverClock();
  }
  window.addEventListener('blur', _suspendInputAndClock);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) _suspendInputAndClock();
  });
  /** Verdadeiro enquanto a tecla está segurada (compara e.key e e.code). */
  function keyDown(key) {
    return !!pressedKeys[_normalizeGameKey(key)];
  }
  /** Verdadeiro enquanto os dois sprites se tocam (alias de isColliding). */
  function touches(a, b) { return isColliding(a, b); }

`
