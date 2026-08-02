export const gameTwoDWorldTimersRuntime = `  // ---- Temporizadores didáticos: "a cada N quadros / segundos" ----
  // Sem RAF próprio: as raízes periódicas geradas usam contadores por CHAVE
  // estável. everyFrames conta quadros; everySeconds usa o relógio compartilhado.
  var frameCounters = Object.create(null);
  function everyFrames(key, frames) {
    var step = (typeof frames === 'number' && Number.isFinite(frames) && frames > 0)
      ? Math.max(1, Math.floor(frames))
      : 1;
    var c = (frameCounters[key] || 0) + 1;
    frameCounters[key] = c;
    return c % step === 0;
  }
  var secondTimers = Object.create(null);
  function everySeconds(key, seconds) {
    var period = _positiveFiniteNumber(seconds, 1) * 1000;
    var t = now();
    var last = secondTimers[key];
    if (last === undefined) { secondTimers[key] = t; return false; }
    if (t - last >= period) { secondTimers[key] = t; return true; }
    return false;
  }
  // One-shot: "depois de N segundos, fazer" — dispara UMA vez por partida.
  // O reset do domínio zera o mapa, então reiniciar o jogo re-arma o timer.
  var onceTimers = Object.create(null);
  function afterSeconds(key, seconds) {
    // Aceita 0 (dispara no 1º quadro após começar); só cai no default 1s para
    // valor inválido (NaN/negativo). "Depois de 0 segundos" = quase imediato.
    var delay = (_isFiniteNumber(seconds) && seconds >= 0 ? seconds : 1) * 1000;
    var state = onceTimers[key];
    if (state === 'done') return false;
    var t = now();
    if (state === undefined) { onceTimers[key] = t; return false; }
    if (t - state >= delay) { onceTimers[key] = 'done'; return true; }
    return false;
  }

  _registerRuntimeDomain('world', {
    reset: function () {
      keyHandlers = Object.create(null);
      keyHandlerOrder = [];
      overlapHandlers = Object.create(null);
      _overlapOrder = [];
      // Sem estas duas linhas o handler do "Jogar de novo" seria REGISTRADO de
      // novo por cima do antigo e o evento dispararia em dobro a cada partida.
      jumpHandlers = Object.create(null);
      _jumpOrder = [];
      anyInputHandlers = Object.create(null);
      _anyInputOrder = [];
      pressedKeys = Object.create(null);
      frameCounters = Object.create(null);
      secondTimers = Object.create(null);
      onceTimers = Object.create(null);
      _tileMapCreates = 0;
      _releaseAllInputs();
    }
  });

`
