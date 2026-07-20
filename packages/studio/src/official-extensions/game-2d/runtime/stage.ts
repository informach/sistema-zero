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
  var STAGE_FOCUS_STYLE_ID = 'sz-game-2d-focus-style';

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
  // Tamanho LÓGICO do palco (coordenadas do jogo). Sem fitScreen, é o tamanho do
  // próprio canvas; com fitScreen, fica FIXO enquanto o canvas REAL cresce para a
  // resolução da tela (nitidez) — os helpers usam o lógico para não dependerem disso.
  function stageW(ctx) { return _logicalW || (ctx && ctx.canvas ? ctx.canvas.width : 0); }
  function stageH(ctx) { return _logicalH || (ctx && ctx.canvas ? ctx.canvas.height : 0); }
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
    if (_fillMode) { _logicalW = Math.max(1, Math.round(rect.width)); _logicalH = Math.max(1, Math.round(rect.height)); }
    if (!_logicalW) return;
    var dpr = window.devicePixelRatio || 1;
    var bw = Math.max(1, Math.round(rect.width * dpr));
    var bh = Math.max(1, Math.round(rect.height * dpr));
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    _applyBaseTransform();
  }
  /** Limpa a tela inteira do palco (use no começo de cada quadro). */
  function clear() {
    var c = ensureStage();
    if (!c || !c.canvas) return;
    if (_logicalW) {
      try { c.setTransform(1, 0, 0, 1, 0, 0); } catch (e) {}
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      _applyBaseTransform();
    } else {
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    }
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
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (!c) return;
    if (!_logicalW) { _logicalW = c.width || 4; _logicalH = c.height || 3; }
    var p = (typeof percent === 'number' && percent > 0 && percent <= 100) ? percent : 100;
    var ar = _logicalW / _logicalH;
    c.style.width = 'min(' + p + 'vw, ' + (p * ar) + 'vh)';
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
  function setupStage(w, h, bg) {
    ensureStage();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (c && typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0) {
      _fillMode = false;
      c.width = Math.round(w);
      c.height = Math.round(h);
      // Recongela o tamanho lógico no novo tamanho quando o fitScreen rodar.
      _logicalW = 0; _logicalH = 0;
    }
    // Cor de fundo escolhida no bloco: vai no canvas E no fundo da janela (a sobra
    // ao redor do canvas centralizado), para a tela inteira combinar com o jogo.
    var color = (typeof bg === 'string' && bg) ? bg : '#0b1020';
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
      document.body.style.minHeight = '100vh';
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
  function setupStageFull(bg) {
    ensureStage();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (!c) return;
    _fillMode = true;
    var color = (typeof bg === 'string' && bg) ? bg : '#0b1020';
    // Full-bleed: fixo, ocupando a viewport inteira; sem proporção/limite travados.
    c.style.position = 'fixed';
    c.style.left = '0';
    c.style.top = '0';
    c.style.width = '100vw';
    c.style.height = '100vh';
    c.style.aspectRatio = '';
    c.style.maxWidth = '';
    c.style.boxSizing = 'border-box';
    c.style.display = 'block';
    c.style.background = color;
    c.style.touchAction = 'none';
    if (document.body) {
      document.body.style.margin = '0';
      document.body.style.background = color;
    }
    _setStageDescription();
    _resizeBacking();
    try { requestAnimationFrame(_resizeBacking); } catch (e) {}
    if (!_resizeHooked) {
      _resizeHooked = true;
      try { window.addEventListener('resize', function () { try { requestAnimationFrame(_resizeBacking); } catch (e) { _resizeBacking(); } }); } catch (e) {}
    }
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

`
