export const gameTwoDCasualKitsSharedRuntime = `  // ============================================================
  // Kits Equilibrista (Stick Hero) e Balão (Hot-Air-Balloon) — v0.42.0
  // Semântica sprite + caminho: o PERSONAGEM é um sprite NORMAL (participa dos
  // blocos genéricos de sprite: desenhar, trocar figura/imagem, tamanho); as
  // REGRAS do jogo moram num objeto "caminho" nomeado. A criança monta o loop
  // e a leitura do mouse (pointerDown) com blocos genéricos, como no Kit nave
  // e no Kit dino. Coordenadas SEMPRE de tela: o caminho guarda x de mundo e
  // aplica o deslocamento internamente (câmera não combina com estes kits).
  // ============================================================
  var _casualKitSequence = 0;
  // Registro/disparo de eventos dos kits — o MESMO idioma do onEnemyDefeated
  // (mapa por id estável + ordem + desativa só o handler quebrado).
  function _kitRegisterHandler(target, mapKey, orderKey, prefix, fn, explicitId) {
    if (!target || typeof fn !== 'function') return;
    if (!target[mapKey]) target[mapKey] = Object.create(null);
    if (!target[orderKey]) target[orderKey] = [];
    var id = _stableHandlerId(prefix, explicitId, fn);
    if (!target[mapKey][id]) target[orderKey].push(id);
    target[mapKey][id] = fn;
  }
  function _kitFireHandlers(target, mapKey, orderKey, label) {
    if (!target || !target[orderKey]) return false;
    var generation = _driverGeneration;
    var order = target[orderKey].slice();
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var handler = target[mapKey] ? target[mapKey][id] : null;
      if (typeof handler !== 'function') continue;
      try { _invokeProjectCallback(handler, undefined, []); }
      catch (error) {
        _reportHandlerError(label, id, error);
        _removeOrderedIfCurrent(target[mapKey], target[orderKey], id, handler);
      }
      if (_runGenerationChanged(generation)) return true;
    }
    return false;
  }
  function _kitColor(value, fallback) {
    return (typeof value === 'string' && value) ? value : fallback;
  }
  function _kitSpeedMultiplier(speed) {
    var mult = _finiteNumber(speed, 1);
    return mult > 0 ? mult : 0;
  }
  // Relógio próprio por objeto+chave: cada comando do kit mede o SEU dt (clamp
  // de 50ms), então a ordem dos blocos no loop não muda a física.
  function _kitDt(target, key) {
    var t = now();
    var dt = target[key] ? (t - target[key]) / 1000 : 0;
    target[key] = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    return dt;
  }
  // Tamanho LÓGICO vigente do palco (o mesmo que o "Preparar a tela" definiu).
  // Sem tamanho lógico congelado, cai no canvas do palco (largura/altura crua).
  function _kitStageW() {
    var c = ensureStage();
    var w = stageW(c);
    if (w) return w;
    if (_stageCanvas && _stageCanvas.width) return _stageCanvas.width;
    return 300;
  }
  function _kitStageH() {
    var c = ensureStage();
    var h = stageH(c);
    if (h) return h;
    if (_stageCanvas && _stageCanvas.height) return _stageCanvas.height;
    return 150;
  }
  function shRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

`
