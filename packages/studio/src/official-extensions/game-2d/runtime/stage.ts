export const gameTwoDStageRuntime = `  // ---- Palco implícito: o runtime é DONO de um canvas + contexto 2D ----
  // Assim os blocos de jogo não precisam mais mostrar "o pincel (ctx)": o código
  // gerado referencia 'ctx'/'tela' (definidos aqui) sem o aluno montar o canvas na
  // mão. Se a página já tiver um <canvas>, usamos ele; senão criamos um. Tudo
  // PREGUIÇOSO (lazy): este script roda no <head>, antes de o <body> existir.
  var _stageCanvas = null;
  var _stageCtx = null;
  var _stageDescription = '';
  var _explicitStageDescription = '';
  var _announcedScreen = '';
  var STAGE_DESCRIPTION_ID = 'sz-game-2d-description';
  var GAME_STATUS_ID = 'sz-game-2d-status';
  var HUD_STATUS_ID = 'sz-game-hud-status';
  var STAGE_FOCUS_STYLE_ID = 'sz-game-2d-focus-style';
  var HUD_ANNOUNCE_INTERVAL_MS = 500;
  var _hudValues = Object.create(null);
  var _hudDirty = false;
  var _lastHudSignature = '';
  var _lastHudAnnouncementAt = -HUD_ANNOUNCE_INTERVAL_MS;
  var _hudTimer = null;
  // Os helpers públicos de HUD podem ser chamados em sequência sem clear().
  // Agrupamos todas as mudanças do mesmo turno JavaScript antes de anunciar a
  // região viva, sem depender da limpeza visual do canvas para definir o lote.
  var _hudBatchPending = false;
  var _hudFrame = 0;
  var _hudSeenAt = Object.create(null);
  var _hudFramePending = false;
  var _hudLifecycleGeneration = 0;

  function _defaultStageDescription() {
    var title = '';
    try { title = String(document.title || '').trim(); } catch (e) {}
    return title ? 'Jogo 2D: ' + title : 'Jogo 2D interativo';
  }

  function _ensureStageDescriptionNode() {
    var node = null;
    try { node = document.getElementById(STAGE_DESCRIPTION_ID); } catch (e) {}
    if (!node && document.body) {
      node = document.createElement('p');
      node.id = STAGE_DESCRIPTION_ID;
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      // Texto disponível para tecnologias assistivas, sem alterar o layout do jogo.
      node.style.position = 'absolute';
      node.style.width = '1px';
      node.style.height = '1px';
      node.style.padding = '0';
      node.style.margin = '-1px';
      node.style.overflow = 'hidden';
      node.style.clip = 'rect(0, 0, 0, 0)';
      node.style.whiteSpace = 'nowrap';
      node.style.border = '0';
      document.body.appendChild(node);
    }
    return node;
  }

  function _visuallyHide(node) {
    node.style.position = 'absolute';
    node.style.width = '1px';
    node.style.height = '1px';
    node.style.padding = '0';
    node.style.margin = '-1px';
    node.style.overflow = 'hidden';
    node.style.clip = 'rect(0, 0, 0, 0)';
    node.style.whiteSpace = 'nowrap';
    node.style.border = '0';
  }

  function _ensureHudStatusNode() {
    var node = null;
    try { node = document.getElementById(HUD_STATUS_ID); } catch (e) {}
    if (!node && document.body) {
      node = document.createElement('p');
      node.id = HUD_STATUS_ID;
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-atomic', 'true');
      _visuallyHide(node);
      document.body.appendChild(node);
    }
    return node;
  }

  function _ensureGameStatusNode() {
    var node = null;
    try { node = document.getElementById(GAME_STATUS_ID); } catch (e) {}
    if (!node && document.body) {
      node = document.createElement('p');
      node.id = GAME_STATUS_ID;
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-atomic', 'true');
      _visuallyHide(node);
      document.body.appendChild(node);
    }
    return node;
  }

  function _announceGameStatus(message) {
    var node = _ensureGameStatusNode();
    if (node) node.textContent = message;
  }

  function _cancelAccessibleHudTimer() {
    if (_hudTimer === null) return;
    clearTimeout(_hudTimer);
    _hudTimer = null;
  }

  function _scheduleAccessibleHudFlush() {
    if (!_hudDirty || _hudTimer !== null || _paused) return;
    var remaining = HUD_ANNOUNCE_INTERVAL_MS - (now() - _lastHudAnnouncementAt);
    if (remaining <= 0) {
      _flushAccessibleHudIfDue();
      return;
    }
    _hudTimer = setTimeout(function () {
      _hudTimer = null;
      _flushAccessibleHudIfDue();
    }, Math.max(1, Math.ceil(remaining)));
  }

  function _flushAccessibleHudIfDue() {
    if (!_hudDirty || _hudFramePending || _hudBatchPending) return;
    var current = now();
    if (current - _lastHudAnnouncementAt < HUD_ANNOUNCE_INTERVAL_MS) {
      _scheduleAccessibleHudFlush();
      return;
    }
    _cancelAccessibleHudTimer();
    var keys = Object.keys(_hudValues).sort();
    var signature = keys.map(function (key) { return _hudValues[key]; }).filter(Boolean).join('. ');
    if (signature !== _lastHudSignature) {
      var node = _ensureHudStatusNode();
      if (node) node.textContent = signature;
      _lastHudSignature = signature;
    }
    _hudDirty = false;
    _lastHudAnnouncementAt = current;
  }

  function _updateAccessibleHud(key, text) {
    var value = String(text || '').trim();
    if (!key) return;
    if (!value) {
      if (Object.prototype.hasOwnProperty.call(_hudValues, key)) {
        delete _hudValues[key];
        delete _hudSeenAt[key];
        _hudDirty = true;
      }
      _scheduleAccessibleHudBatch();
      return;
    }
    _hudSeenAt[key] = _hudFrame;
    if (_hudValues[key] !== value) {
      _hudValues[key] = value;
      _hudDirty = true;
    }
    _scheduleAccessibleHudBatch();
  }

  function _scheduleAccessibleHudBatch() {
    if (_hudBatchPending) return;
    _hudBatchPending = true;
    var generation = _hudLifecycleGeneration;
    Promise.resolve().then(function () {
      if (generation !== _hudLifecycleGeneration) return;
      _hudBatchPending = false;
      _flushAccessibleHudIfDue();
    });
  }

  function _finalizeAccessibleHudFrame() {
    var keys = Object.keys(_hudValues);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (_hudSeenAt[key] === _hudFrame) continue;
      delete _hudValues[key];
      delete _hudSeenAt[key];
      _hudDirty = true;
    }
    _flushAccessibleHudIfDue();
  }

  function _beginAccessibleHudFrame() {
    _hudFrame++;
    if (_hudFramePending) return;
    _hudFramePending = true;
    var generation = _hudLifecycleGeneration;
    Promise.resolve().then(function () {
      if (generation !== _hudLifecycleGeneration) return;
      _hudFramePending = false;
      _finalizeAccessibleHudFrame();
    });
  }

  function _resetAccessibleHud() {
    _cancelAccessibleHudTimer();
    _hudLifecycleGeneration++;
    _hudValues = Object.create(null);
    _hudSeenAt = Object.create(null);
    _hudDirty = false;
    _hudBatchPending = false;
    _hudFrame = 0;
    _hudFramePending = false;
    _lastHudSignature = '';
    _lastHudAnnouncementAt = -HUD_ANNOUNCE_INTERVAL_MS;
    var node = null;
    try { node = document.getElementById(HUD_STATUS_ID); } catch (e) {}
    if (node) node.textContent = '';
    try { node = document.getElementById(GAME_STATUS_ID); } catch (e) { node = null; }
    if (node) node.textContent = '';
    // O reinício abre uma partida nova: a mesma tela terminal precisa voltar a
    // ser anunciada e a região viva não pode continuar descrevendo a partida
    // anterior. Reaplica a descrição-base e rearma a deduplicação de telas.
    _setStageDescription();
  }

  function _ensureStageFocusStyle() {
    var existing = null;
    try { existing = document.getElementById(STAGE_FOCUS_STYLE_ID); } catch (e) {}
    if (existing) return;
    var parent = document.head || document.body;
    if (!parent) return;
    var style = document.createElement('style');
    style.id = STAGE_FOCUS_STYLE_ID;
    style.textContent = 'canvas[data-sz-game-2d-stage]:focus { outline: none; } canvas[data-sz-game-2d-stage]:focus-visible { outline: none; box-shadow: inset 0 0 0 3px rgba(255,255,255,0.9), inset 0 0 0 5px rgba(0,0,0,0.55); }';
    parent.appendChild(style);
  }

  function _setStageDescription(description) {
    if (arguments.length > 0) {
      _explicitStageDescription = typeof description === 'string' ? description.trim() : '';
    }
    _stageDescription = _explicitStageDescription || _defaultStageDescription();
    var c = _stageCanvas;
    if (c && c.setAttribute) {
      c.setAttribute('aria-label', _stageDescription);
      c.setAttribute('aria-describedby', STAGE_DESCRIPTION_ID);
    }
    var node = _ensureStageDescriptionNode();
    if (node) node.textContent = _stageDescription;
    _announcedScreen = '';
  }

  /** Explica objetivo e controles do jogo para tecnologias assistivas. */
  function setStageDescription(description) {
    _setStageDescription(description);
  }

  function _announceScreen(title, subtitle, hint) {
    var screen = [title, subtitle, hint]
      .filter(function (part) { return part !== undefined && part !== null && String(part).trim(); })
      .map(function (part) { return String(part).trim(); })
      .join('. ');
    if (!screen || screen === _announcedScreen) return;
    _announcedScreen = screen;
    var node = _ensureStageDescriptionNode();
    if (node) node.textContent = _stageDescription + '. ' + screen;
  }

  function ensureStage() {
    if (_stageCtx) return _stageCtx;
    var c = null;
    try { c = document.querySelector('canvas'); } catch (e) {}
    if (!c) {
      c = document.createElement('canvas');
      c.width = 320;
      c.height = 480;
      c.style.background = '#11172a';
      c.style.display = 'block';
      if (document.body) document.body.appendChild(c);
    }
    // Convenção do studio: a tela tem id "tela". Garante que o canvas criado pelo
    // facilitador (setupStage) seja achável por getElementById("tela") — senão o
    // bloco "pegar tela de desenho" devolve null.
    if (c && !c.id) c.id = 'tela';
    // Jogos de toque não podem disputar o gesto com scroll/zoom do navegador.
    // O tabindex permite foco de teclado sem inserir controles visuais extras.
    if (c) {
      c.style.touchAction = 'none';
      if (c.setAttribute) c.setAttribute('data-sz-game-2d-stage', '');
      if (!c.hasAttribute || !c.hasAttribute('tabindex')) c.tabIndex = 0;
    }
    _ensureStageFocusStyle();
    _stageCanvas = c;
    _setStageDescription();
    try { _stageCtx = c.getContext('2d'); } catch (e) {}
    return _stageCtx;
  }
  var _logicalW = 0, _logicalH = 0, _resizeHooked = false, _fillMode = false;
  var _stageViewportRevision = 0;
  var MAX_STAGE_BACKING_DPR = 3;
  var MAX_STAGE_BACKING_DIMENSION = 8192;
  var MAX_STAGE_BACKING_PIXELS = 16777216;
  function _viewportUnit(axis) {
    var dynamicUnit = axis === 'width' ? 'dvw' : 'dvh';
    try {
      if (window.CSS && typeof window.CSS.supports === 'function' && window.CSS.supports(axis, '1' + dynamicUnit)) return dynamicUnit;
    } catch (e) {}
    return axis === 'width' ? 'vw' : 'vh';
  }
  // Tamanho LÓGICO do palco (coordenadas do jogo). Sem fitScreen, é o tamanho do
  // próprio canvas; com fitScreen, fica FIXO enquanto o canvas REAL cresce para a
  // resolução da tela (nitidez) — os helpers usam o lógico para não dependerem disso.
  function stageW(ctx) { return _logicalW || (ctx && ctx.canvas ? ctx.canvas.width : 0); }
  function stageH(ctx) { return _logicalH || (ctx && ctx.canvas ? ctx.canvas.height : 0); }
  function _setLogicalStageSize(width, height) {
    var nextW = Math.max(1, Math.round(width));
    var nextH = Math.max(1, Math.round(height));
    var previousW = _logicalW;
    var previousH = _logicalH;
    _logicalW = nextW;
    _logicalH = nextH;
    if (previousW === nextW && previousH === nextH) return;
    _stageViewportRevision += 1;
    if (typeof _onStageViewportChanged === 'function') {
      _onStageViewportChanged();
    }
  }
  function _applyBaseTransform() {
    if (!_stageCtx || !_logicalW || !_stageCanvas) return;
    try { _stageCtx.setTransform(_stageCanvas.width / _logicalW, 0, 0, _stageCanvas.height / _logicalH, 0, 0); } catch (e) {}
  }
  function _resizeBacking() {
    var c = _stageCanvas;
    if (!c || !c.getBoundingClientRect) return;
    var rect = c.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Modo "ocupar a tela toda": a resolução LÓGICA (coordenadas do jogo) acompanha
    // o tamanho REAL do canvas — a área do jogo É a tela e muda de tamanho com a
    // janela. Setar ANTES do guard de _logicalW (que no início é 0).
    if (_fillMode) _setLogicalStageSize(rect.width, rect.height);
    if (!_logicalW) return;
    var rawDpr = _positiveFiniteNumber(window.devicePixelRatio, 1);
    var dimensionScale = Math.min(
      MAX_STAGE_BACKING_DIMENSION / rect.width,
      MAX_STAGE_BACKING_DIMENSION / rect.height
    );
    var pixelScale = Math.sqrt(MAX_STAGE_BACKING_PIXELS / (rect.width * rect.height));
    var dpr = Math.min(rawDpr, MAX_STAGE_BACKING_DPR, dimensionScale, pixelScale);
    if (!_isFiniteNumber(dpr) || dpr <= 0) dpr = 1;
    var bw = Math.max(1, Math.min(MAX_STAGE_BACKING_DIMENSION, Math.round(rect.width * dpr)));
    var bh = Math.max(1, Math.min(MAX_STAGE_BACKING_DIMENSION, Math.round(rect.height * dpr)));
    // O arredondamento independente pode ultrapassar o orçamento por poucos
    // pixels; ajusta somente nesse extremo, preservando o round histórico nos
    // DPRs normais.
    if (bw * bh > MAX_STAGE_BACKING_PIXELS) {
      var adjustment = Math.sqrt(MAX_STAGE_BACKING_PIXELS / (bw * bh));
      bw = Math.max(1, Math.floor(bw * adjustment));
      bh = Math.max(1, Math.floor(bh * adjustment));
    }
    if (dpr < rawDpr) {
      warnOnce(
        'stage-backing-budget',
        'reduzi a nitidez do palco para manter uma resolução segura neste dispositivo.'
      );
    }
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    _applyBaseTransform();
  }
  // Cenário de fundo: o desenho da criança cobrindo o palco inteiro.
  var _backdropName = '';
  /**
   * COBRE o palco sem entortar, centralizado — uma geometria só, usada pelos DOIS
   * blocos (o fixo e o por-quadro), para que trocar de bloco não mude o visual.
   *
   * "Cobrir" e não "esticar" nem "caber": esticar deforma o boneco que ela
   * desenhou e ela vê que está errado sem saber consertar; caber deixa faixas de
   * cor lisa nas laterais e lê como defeito. Cobrir corta um pouco de céu e de
   * chão, e lê como "a câmera está mais perto" — ninguém percebe.
   */
  /**
   * ⭐⭐ NÃO é um setter — é uma VERIFICAÇÃO, e isto precisa estar escrito aqui.
   *
   * Os bytes da fonte não estão na página: quem monta o documento resolve a escolha
   * ANTES do jogo rodar e manda SÓ a fonte escolhida (cinco fontes embutidas seriam
   * ~170 KB em todo jogo exportado). Então aqui não há o que trocar — o que dá para
   * fazer é conferir se o que o bloco pediu foi o que chegou, e avisar quando não.
   *
   * Diverge quando a escolha não é estática: um nome guardado numa variável, ou o
   * bloco dentro de um "se". Aí o documento veio com a fonte padrão e a criança
   * precisa saber por quê.
   */
  function useFont(font) {
    var pedida = String(font || '');
    var atual = window.SZGameUIFont && window.SZGameUIFont.id;
    if (!pedida || !atual || pedida === atual) return;
    warnOnce(
      'fonte-divergente',
      'o jogo carregou a fonte "' + atual + '" e este bloco pediu "' + pedida + '". Se você tem mais de um bloco “Usar a fonte”, vale só o último; deixe um só. Escrevendo no modo Código, use um nome da lista do bloco.'
    );
  }
  function _paintBackdrop(ctx, name) {
    if (!ctx || !name) return false;
    var handle = loadImage(name);
    var img = handle && handle.loaded ? handle.img : null;
    if (!img) return false; // ainda carregando, ou nome errado (o loadImage já avisou)
    var sw = img.naturalWidth || img.width || 0;
    var sh = img.naturalHeight || img.height || 0;
    var cw = stageW(ctx), ch = stageH(ctx);
    if (!(sw > 0) || !(sh > 0) || !(cw > 0) || !(ch > 0)) return false;
    var scale = Math.max(cw / sw, ch / sh);
    var dw = sw * scale, dh = sh * scale;
    // O _crispDraw mantém pixel art nítida ao ampliar (o cenário do Pinta costuma
    // ser bem menor que o palco) e suave ao reduzir.
    return _crispDraw(ctx, sw, dw, function () {
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    });
  }
  /**
   * Uma TELA feita de imagem: cobre o palco com o desenho da criança.
   *
   * ⭐ O que separa este bloco do "Desenhar o cenário", que pinta a mesma coisa: o
   * ANÚNCIO. A tela de texto avisa o leitor de tela; uma tela montada com o cenário
   * seria invisível para quem usa leitor — o jogo mudaria de estado e ninguém
   * saberia. Aqui a imagem também fala.
   */
  function showImageScreen(ctx, image) {
    var nome = String(image || '');
    _announceScreen(nome ? 'Tela ' + nome : 'Tela', '', '');
    return _paintBackdrop(ctx, nome);
  }
  /** Fixa o cenário: repintado a cada clear(), sem a criança fazer nada. */
  function setBackdrop(name) {
    _backdropName = (typeof name === 'string') ? name : '';
    var ctx = ensureStage();
    if (!ctx || !_backdropName) return;
    if (_paintBackdrop(ctx, _backdropName)) return;
    // A imagem quase nunca está pronta aqui: o load é assíncrono e este bloco
    // roda no "Ao iniciar". Num jogo COM laço o clear() do próximo quadro
    // resolve; mas um jogo que ainda não tem laço (a criança acabou de
    // arrastar o bloco e rodou) não teria NINGUÉM repintando: a tela ficaria
    // em branco e o bloco pareceria quebrado logo no primeiro uso. Então
    // esperamos a imagem chegar.
    var handle = loadImage(_backdropName);
    var img = handle && handle.img;
    if (!img || typeof img.addEventListener !== 'function') return;
    var alvo = _backdropName;
    img.addEventListener('load', function () {
      // Trocou de cenário enquanto a imagem vinha: a antiga não pinta.
      if (_backdropName !== alvo) return;
      var c = ensureStage();
      if (c) _paintBackdrop(c, alvo);
    });
  }
  /** Desenha o cenário AGORA, neste ponto do quadro. */
  function drawBackdrop(ctx, name) { return _paintBackdrop(ctx, name); }

  /** Limpa a tela inteira do palco (use no começo de cada quadro). */
  function clear() {
    _beginAccessibleHudFrame();
    var c = ensureStage();
    if (!c || !c.canvas) return;
    if (_logicalW) {
      try { c.setTransform(1, 0, 0, 1, 0, 0); } catch (e) {}
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      _applyBaseTransform();
    } else {
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    }
    // Guardado: sem cenário, o quadro é byte-idêntico ao de antes deste bloco.
    if (_backdropName) _paintBackdrop(c, _backdropName);
  }
  /** O palco responsivo ocupa a viewport; o tremor não deve ampliar a área rolável. */
  function _lockStageViewportOverflow() {
    if (document.documentElement) document.documentElement.style.overflow = 'hidden';
    if (document.body) document.body.style.overflow = 'hidden';
  }
  /**
   * Faz o canvas PREENCHER ~percent% da janela, MANTENDO a proporção do jogo. A
   * resolução interna (coordenadas do jogo) NÃO muda — só o tamanho de exibição
   * (CSS), então todos os desenhos escalam juntos e o navegador re-encaixa sozinho
   * ao redimensionar a janela. Sem distorção: numa tela de formato diferente do
   * jogo, sobra um espaço escuro nas laterais (ou em cima/baixo). Chame uma vez no
   * começo do programa. width = min(P vw, P*proporção vh) garante caber nos dois
   * eixos; box-sizing inclui a borda p/ não criar barra de rolagem.
   */
  function fitScreen(percent) {
    ensureStage();
    _lockStageViewportOverflow();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (!c) return;
    if (!_logicalW) _setLogicalStageSize(c.width || 4, c.height || 3);
    var p = (_isFiniteNumber(percent) && percent > 0 && percent <= 100) ? percent : 100;
    var ar = _logicalW / _logicalH;
    c.style.width = 'min(' + p + _viewportUnit('width') + ', ' + (p * ar) + _viewportUnit('height') + ')';
    c.style.height = 'auto';
    c.style.aspectRatio = _logicalW + ' / ' + _logicalH;
    c.style.maxWidth = '100%';
    c.style.boxSizing = 'border-box';
    c.style.display = 'block';
    _resizeBacking();
    try { requestAnimationFrame(_resizeBacking); } catch (e) {}
    if (!_resizeHooked) {
      _resizeHooked = true;
      try { window.addEventListener('resize', function () { try { requestAnimationFrame(_resizeBacking); } catch (e) { _resizeBacking(); } }); } catch (e) {}
    }
  }
  // Facilitador: prepara o palco em tela cheia (responsivo) num passo só. Define o
  // tamanho do "mundo" do jogo (w x h) e chama fitScreen para o canvas ocupar a
  // janela mantendo a proporção. É o bloco "preparar o jogo em tela cheia".
  function setupStage(width, height, background) {
    ensureStage();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (c && _isFiniteNumber(width) && width > 0 && _isFiniteNumber(height) && height > 0) {
      // O limite precisa vir ANTES da primeira escrita: alguns navegadores tentam
      // alocar o backing store imediatamente ao receber width/height no canvas.
      var logicalScale = Math.min(
        1,
        MAX_STAGE_BACKING_DIMENSION / width,
        MAX_STAGE_BACKING_DIMENSION / height
      );
      var safeWidth = width * logicalScale;
      var safeHeight = height * logicalScale;
      var logicalPixels = safeWidth * safeHeight;
      if (logicalPixels > MAX_STAGE_BACKING_PIXELS) {
        var logicalPixelScale = Math.sqrt(MAX_STAGE_BACKING_PIXELS / logicalPixels);
        safeWidth *= logicalPixelScale;
        safeHeight *= logicalPixelScale;
      }
      safeWidth = Math.max(1, Math.floor(safeWidth));
      safeHeight = Math.max(1, Math.floor(safeHeight));
      var logicalSizeLimited = safeWidth !== Math.round(width) || safeHeight !== Math.round(height);
      _fillMode = false;
      c.width = safeWidth;
      c.height = safeHeight;
      // Congela o tamanho lógico JÁ AQUI (não espera o fitScreen): qualquer
      // leitura de stageW/stageH entre este ponto e o resize do backing veria o
      // valor FÍSICO do canvas (DPR vezes o lógico) e desenharia fora do palco.
      _setLogicalStageSize(safeWidth, safeHeight);
      if (logicalSizeLimited) {
        warnOnce(
          'stage-logical-budget',
          'reduzi o tamanho do palco para manter coordenadas seguras para o jogo.'
        );
      }
    }
    // Cor de fundo escolhida no bloco: vai no canvas E no fundo da janela (a sobra
    // ao redor do canvas centralizado), para a tela inteira combinar com o jogo.
    var color = (typeof background === 'string' && background) ? background : '#0b1020';
    if (c) {
      c.style.position = '';
      c.style.left = '';
      c.style.top = '';
      c.style.background = color;
      c.style.touchAction = 'none';
    }
    if (document.body) {
      document.body.style.margin = '0';
      document.body.style.background = color;
      // Centraliza o canvas na janela: quando a proporção da TELA não bate com a
      // do jogo (ex.: jogo 800x480 numa janela 800x600), o espaço que sobra fica
      // igual dos dois lados, em vez de tudo num canto. O clique continua certo
      // porque o mapeamento do ponteiro usa getBoundingClientRect (posição real).
      document.body.style.minHeight = '100' + _viewportUnit('height');
      document.body.style.display = 'flex';
      document.body.style.alignItems = 'center';
      document.body.style.justifyContent = 'center';
    }
    _setStageDescription();
    fitScreen(100);
  }
  // Facilitador: prepara o palco para OCUPAR A TELA TODA, sem dimensões. Diferente
  // do setupStage (que mantém a proporção fixa e deixa barras nas laterais), aqui a
  // resolução do jogo ACOMPANHA a janela: o canvas preenche 100% da viewport e as
  // coordenadas do jogo passam a valer o tamanho real da tela (via _resizeBacking em
  // _fillMode). É o bloco "preparar o jogo para ocupar a tela toda".
  function setupStageFull(background) {
    ensureStage();
    _lockStageViewportOverflow();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (!c) return;
    _fillMode = true;
    var color = (typeof background === 'string' && background) ? background : '#0b1020';
    // Full-bleed: fixo, ocupando a viewport inteira; sem proporção/limite travados.
    c.style.position = 'fixed';
    c.style.left = '0';
    c.style.top = '0';
    c.style.width = '100' + _viewportUnit('width');
    c.style.height = '100' + _viewportUnit('height');
    c.style.aspectRatio = '';
    c.style.maxWidth = '';
    c.style.boxSizing = 'border-box';
    c.style.display = 'block';
    c.style.background = color;
    c.style.touchAction = 'none';
    if (document.body) {
      document.body.style.margin = '0';
      document.body.style.background = color;
      document.body.style.minHeight = '100' + _viewportUnit('height');
    }
    _setStageDescription();
    _resizeBacking();
    try { requestAnimationFrame(_resizeBacking); } catch (e) {}
    if (!_resizeHooked) {
      _resizeHooked = true;
      try { window.addEventListener('resize', function () { try { requestAnimationFrame(_resizeBacking); } catch (e) { _resizeBacking(); } }); } catch (e) {}
    }
  }
  /**
   * Contorna a TELA do jogo com uma moldura colorida, para dar de ver onde
   * começa e termina a área do palco (ensinar/depurar, como o "mostrar a caixa
   * de colisão"). A borda vai no ELEMENTO, não no desenho: não gasta pixel do
   * jogo, nada a apaga e não custa nada por quadro.
   * O box-sizing border-box mantém a moldura DENTRO da caixa do canvas — sem
   * ele apareceria barra de rolagem, e em tela cheia a borda ficaria fora da
   * janela. Espessura capada para um número enorme não engolir o jogo.
   */
  function showStageBorder(color, width) {
    ensureStage();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (!c) return;
    var w = (_isFiniteNumber(width) && width > 0) ? Math.min(Math.round(width), 40) : 4;
    var cor = (typeof color === 'string' && color) ? color : '#e2e8f0';
    c.style.boxSizing = 'border-box';
    c.style.border = w + 'px solid ' + cor;
  }
  // Expõe 'ctx' e 'tela' como globais preguiçosos. O setter REDEFINE a propriedade
  // como um valor normal — assim um eventual 'const ctx = ...' antigo (canvasSetup)
  // ou uma atribuição direta continuam funcionando sem conflito.
  function defineLazyGlobal(nameKey, getter) {
    try {
      Object.defineProperty(window, nameKey, {
        configurable: true,
        get: getter,
        set: function (v) {
          Object.defineProperty(window, nameKey, { configurable: true, writable: true, value: v });
        }
      });
    } catch (e) {}
  }
  defineLazyGlobal('ctx', function () { return ensureStage(); });
  defineLazyGlobal('tela', function () { ensureStage(); return _stageCanvas; });

  _registerRuntimeDomain('stage-accessibility', {
    reset: _resetAccessibleHud,
    pause: _cancelAccessibleHudTimer,
    resume: _flushAccessibleHudIfDue
  });
  _registerRuntimeDomain('stage-backdrop', {
    reset: function () { _backdropName = ''; }
  });

`
