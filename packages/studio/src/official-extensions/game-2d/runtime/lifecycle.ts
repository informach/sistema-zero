export const gameTwoDLifecycleRuntime = `  // ---- Ciclo de vida da partida ----
  // Há UM scheduler físico, mas ele compõe todos os blocos "A cada quadro".
  // Cada bloco gerado fornece o próprio id estável: executar de novo o MESMO
  // bloco substitui seu callback; blocos diferentes continuam coexistindo.
  var _loopHandlers = Object.create(null);
  var _loopOrder = [];
  var _startHandlers = Object.create(null);
  var _startOrder = [];
  var _restarting = false;
  var _handlerIds = new WeakMap();
  var _nextHandlerId = 1;
  var _driverFrame = 0;
  var _lastDriverTime = null;
  var _frameAccumulator = 0;
  var _consecutiveDroppedTicks = 0;
  var _runningLoopId = null;
  var FIXED_FRAME_MS = 1000 / 60;
  var MAX_CATCH_UP_STEPS = 5;

  function _resetDriverClock() {
    _lastDriverTime = null;
    _frameAccumulator = 0;
    _consecutiveDroppedTicks = 0;
  }

  function _stableHandlerId(prefix, explicitId, fn) {
    if (typeof explicitId === 'string' && explicitId) return prefix + ':' + explicitId;
    var known = _handlerIds.get(fn);
    if (!known) {
      known = prefix + ':funcao-' + _nextHandlerId++;
      _handlerIds.set(fn, known);
    }
    return known;
  }

  function _removeOrdered(registry, order, id) {
    if (!registry[id]) return;
    delete registry[id];
    var index = order.indexOf(id);
    if (index !== -1) order.splice(index, 1);
  }

  function _reportHandlerError(kind, id, error) {
    var message = error && error.message ? error.message : String(error);
    var key = 'erro:' + kind + ':' + id + ':' + message;
    if (_warnedOnce[key]) return;
    _warnedOnce[key] = true;
    try {
      console.error('SZGame2D: parei o bloco ' + kind + ' porque aconteceu um erro: ' + message);
    } catch (ignored) {}
  }

  function _driverHasWork() {
    return _loopOrder.length > 0 || (typeof _overlapOrder !== 'undefined' && _overlapOrder.length > 0);
  }

  function _runSimulationFrame() {
    if (_paused) return;
    _frameStamp++;
    _particlesDrawnThisFrame = false;
    var loops = _loopOrder.slice();
    for (var i = 0; i < loops.length; i++) {
      var id = loops[i];
      var fn = _loopHandlers[id];
      if (typeof fn !== 'function') continue;
      _runningLoopId = id;
      try { fn(); }
      catch (error) {
        _reportHandlerError('“A cada quadro”', id, error);
        _removeOrdered(_loopHandlers, _loopOrder, id);
      }
      _runningLoopId = null;
    }
    _runOverlapHandlers();
    // Partículas são desenhadas uma vez depois de TODOS os blocos de quadro.
    if (!_particlesDrawnThisFrame && particles.length) {
      try { _camWrap(drawParticles)(ensureStage()); }
      catch (error) { _reportHandlerError('de partículas', 'interno', error); }
    }
  }

  function _driverTick(timestamp) {
    _driverFrame = 0;
    if (!_driverHasWork()) {
      _resetDriverClock();
      return;
    }
    if (typeof timestamp !== 'number') {
      _runSimulationFrame();
    } else {
      if (_lastDriverTime === null) {
        _lastDriverTime = timestamp;
        _frameAccumulator += FIXED_FRAME_MS;
      } else {
        var elapsed = Math.max(0, Math.min(250, timestamp - _lastDriverTime));
        _lastDriverTime = timestamp;
        _frameAccumulator += elapsed;
      }
      var steps = 0;
      while (_frameAccumulator + 0.0001 >= FIXED_FRAME_MS && steps < MAX_CATCH_UP_STEPS) {
        _frameAccumulator -= FIXED_FRAME_MS;
        _runSimulationFrame();
        steps++;
      }
      if (steps === MAX_CATCH_UP_STEPS && _frameAccumulator >= FIXED_FRAME_MS) {
        _frameAccumulator = _frameAccumulator % FIXED_FRAME_MS;
        _consecutiveDroppedTicks++;
        // Um frame isolado pode atrasar por DevTools, resize ou trabalho do próprio
        // navegador. Só há problema pedagógico quando o jogo perde tempo em vários
        // ticks visíveis seguidos. Troca de aba/blur zera o relógio logo abaixo.
        if (_consecutiveDroppedTicks >= 3 && !(typeof document !== 'undefined' && document.hidden)) {
          warnOnce('quadros-atrasados', 'o jogo está demorando para desenhar há vários quadros; descartei atualizações atrasadas para ele continuar responsivo.');
        }
      } else {
        _consecutiveDroppedTicks = 0;
      }
    }
    if (_driverHasWork()) _driverFrame = requestAnimationFrame(_driverTick);
  }

  function _ensureDriver() {
    if (!_driverFrame && _driverHasWork()) _driverFrame = requestAnimationFrame(_driverTick);
  }

  /** Registra um comportamento de quadro. Blocos diferentes rodam juntos. */
  // Carimbo do quadro atual: avança 1× por passada do "a cada quadro do jogo"
  // (nunca em pausa). O piscar de invencibilidade decai por ESTE carimbo, não por
  // desenho — desenhar o mesmo sprite 2× não devora a invencibilidade pela metade,
  // e a pausa não a consome. Sem loop ativo, o decaimento cai no modo antigo.
  var _frameStamp = 0;
  function gameLoop(fn, explicitId) {
    if (typeof fn !== 'function') return function () {};
    var id = _stableHandlerId('quadro', explicitId, fn);
    if (!_loopHandlers[id]) _loopOrder.push(id);
    _loopHandlers[id] = fn;
    _ensureDriver();
    function stop() {
      _removeOrdered(_loopHandlers, _loopOrder, id);
      if (!_driverHasWork() && _driverFrame) {
        cancelAnimationFrame(_driverFrame);
        _driverFrame = 0;
      }
    }
    return stop;
  }

  /** Registra e executa a preparação de uma partida; restart() repete este corpo. */
  function onStart(fn, explicitId) {
    if (typeof fn !== 'function') return;
    var id = _stableHandlerId('inicio', explicitId, fn);
    if (!_startHandlers[id]) _startOrder.push(id);
    _startHandlers[id] = fn;
    try { fn(); }
    catch (error) { _reportHandlerError('“Ao iniciar”', id, error); }
  }

  _registerRuntimeDomain('lifecycle', {
    reset: function () {
      if (_driverFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(_driverFrame);
      _driverFrame = 0;
      _resetDriverClock();
      _loopHandlers = Object.create(null);
      _loopOrder = [];
      _runningLoopId = null;
      _frameStamp = 0;
    }
  });

`
