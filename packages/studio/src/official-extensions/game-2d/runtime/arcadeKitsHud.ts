export const gameTwoDArcadeHudRuntime = `  // ---- HUD no canvas: placar, texto, vidas (corações) e barra ----
  /**
   * Puxa o x para a esquerda quando o texto passaria da borda direita do palco.
   * Só age quando ia cortar: layout que já cabia continua idêntico ao pixel.
   */
  function _clampHudTextX(ctx, text, px) {
    var largura = 0;
    try { largura = ctx.measureText(text).width; } catch (e) { largura = 0; }
    if (!(largura > 0)) return px;
    var palco = stageW(ctx);
    if (!(palco > 0)) return px;
    var sobra = palco - 2 - (px + largura);
    return sobra < 0 ? Math.max(2, px + sobra) : px;
  }
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
    // ⚠️ Rede contra o placar que "sai pela direita e corta". O x é escolhido à mão
    // pela criança, mas a LARGURA depende do valor (um placar de 6 dígitos ocupa o
    // dobro de um de 1) e a fonte é proporcional — não dá para prever no bloco.
    // Quando o texto passaria da borda, ele desliza para caber; quem já cabia não
    // se mexe um pixel.
    px = _clampHudTextX(ctx, text, px);
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
  function drawBar(ctx, value, max, x, y, width, height, color) {
    _drawBarVisual(ctx, value, max, x, y, width, height, color);
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
  function showScreen(ctx, title, subtitle, hint, background) {
    if (!ctx || !ctx.canvas) return;
    _announceScreen(title, subtitle, hint);
    var w = stageW(ctx), h = stageH(ctx);
    var sc = Math.max(0.7, Math.min(2, w / 640));
    ctx.save();
    // Overlay SEMITRANSPARENTE: o jogo continua aparecendo por trás (à la referência).
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = background || '#02111f';
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

`
