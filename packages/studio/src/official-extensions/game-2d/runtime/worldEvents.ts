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
