/** Casca DOM, acessibilidade, estados, entrada e redimensionamento do jogo. */
export const gameKitShellRuntime = `
  // ---- Telas (o index.html + styles.css do kit, injetados por JS) ----

  function buildCss() {
    var glowStrong = hexToRgba(config.accent, 0.5);
    var glowSoft = hexToRgba(config.accent, 0.3);
    return '' +
      '#szgk-stage { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; ' +
        'background: ' + config.bg + '; overflow: hidden; ' +
        'font-family: var(--sz-game-ui-font); color: #eee; }' +
      // Sem moldura de fábrica: quem quiser uma põe o bloco "Mostrar a borda da
      // tela" (antes vinha uma borda cinza fixa que ninguém escolheu nem tirava,
      // e que o modo tela-cheia apagava — o mesmo jogo tinha dois visuais).
      '#szgk-canvas { image-rendering: pixelated; image-rendering: crisp-edges; touch-action: none; ' +
        'background: ' + config.bg + '; }' +
      '#szgk-canvas:focus-visible { outline: 3px solid #ffffff; outline-offset: -7px; }' +
      '.szgk-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; ' +
        'overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }' +
      '.szgk-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); ' +
        'background: rgba(0, 0, 0, 0.35); backdrop-filter: blur(10px); ' +
        'border: 3px solid ' + config.accent + '; padding: 30px; border-radius: 15px; text-align: center; ' +
        'box-shadow: 0 0 30px ' + glowSoft + '; z-index: 1000; display: none; box-sizing: border-box; ' +
        'max-width: 82%; max-height: calc(100% - 30px); overflow: auto; overflow-wrap: anywhere; }' +
      '.szgk-panel.szgk-active { display: block; }' +
      '.szgk-panel h1, .szgk-panel h2 { color: ' + config.accent + '; margin: 0 0 20px 0; ' +
        'text-shadow: 0 0 20px ' + glowStrong + '; }' +
      '.szgk-panel h1 { font-size: 40px; }' +
      '.szgk-panel h2 { font-size: 35px; }' +
      '.szgk-panel p { margin: 0 0 12px 0; font-size: 14px; min-height: 1em; }' +
      '.szgk-panel button { background: rgba(0, 0, 0, 0.4); color: white; ' +
        'border: 2px solid ' + config.accent + '; padding: 12px 24px; margin: 8px; font-size: 16px; ' +
        'cursor: pointer; font-family: inherit; border-radius: 8px; ' +
        'transition: background-color 0.3s, box-shadow 0.3s, transform 0.3s; ' +
        'box-shadow: 0 0 15px ' + hexToRgba(config.accent, 0.2) + '; }' +
      '.szgk-panel button:hover { background: ' + config.accent + '; ' +
        'box-shadow: 0 0 25px ' + glowStrong + '; transform: translateY(-2px); }' +
      '.szgk-panel button:focus-visible { outline: 3px solid #ffffff; outline-offset: 2px; }' +
      '@media (prefers-reduced-motion: reduce) { ' +
        '.szgk-panel button { transition: none; } ' +
        '.szgk-panel button:hover { transform: none; } ' +
      '}';
  }

  /** Cria um painel de tela (título + texto + botões) já escondido. */
  function makeScreen(name, titleTag, titleText, bodyText) {
    var el = document.createElement('div');
    el.className = 'szgk-panel';
    el.setAttribute('data-szgk-screen', name);
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
    var title = document.createElement(titleTag);
    screenSequence += 1;
    title.id = 'szgk-screen-title-' + screenSequence;
    title.textContent = titleText;
    el.setAttribute('aria-labelledby', title.id);
    el.appendChild(title);
    var p = document.createElement('p');
    p.textContent = bodyText;
    el.appendChild(p);
    if (stageEl) stageEl.appendChild(el);
    var entry = { el: el, title: title, text: p, mainBtn: null };
    screens[name] = entry;
    return entry;
  }

  /** Botão dentro de um painel; o clique roda fn protegido (+ som de clique, P24). */
  function makeButton(entry, label, fn) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = function () {
      resumeAudio();
      try { playEffect('click'); } catch (e) {}
      try { fn(); } catch (e) { warn('erro no clique do botão "' + label + '": ' + e); }
    };
    entry.el.appendChild(btn);
    if (!entry.mainBtn) entry.mainBtn = btn;
    return btn;
  }

  /**
   * Monta a "casca" do jogo (palco + canvas + telas prontas) — LAZY: só quando
   * o jogo realmente começa. Sem document/body ainda, devolve false.
   */
  function ensureShell() {
    if (shellReady) return true;
    try {
      if (typeof document === 'undefined' || !document || !document.body) return false;

      styleEl = document.createElement('style');
      styleEl.id = 'szgk-style';
      styleEl.textContent = buildCss();
      document.head.appendChild(styleEl);

      stageEl = document.createElement('div');
      stageEl.id = 'szgk-stage';
      canvasEl = document.createElement('canvas');
      canvasEl.id = 'szgk-canvas';
      canvasEl.width = config.w;
      canvasEl.height = config.h;
      canvasEl.tabIndex = 0;
      canvasEl.style.touchAction = 'none';
      canvasEl.setAttribute('aria-label', stageDescriptionText);
      canvasEl.setAttribute('aria-describedby', 'szgk-stage-description');
      canvasEl.setAttribute('aria-hidden', 'false');
      stageEl.appendChild(canvasEl);
      var stageDescription = document.createElement('p');
      stageDescription.id = 'szgk-stage-description';
      stageDescription.className = 'szgk-sr-only';
      stageDescription.textContent = stageDescriptionText;
      stageEl.appendChild(stageDescription);
      document.body.appendChild(stageEl);
      ctx2d = canvasEl.getContext('2d');
      // Pixel art nítida por padrão (P24 seta no ctor do RenderSystem). Atribuir
      // canvas.width/height reseta o ctx — por isso o resizeCanvas RE-APLICA isto
      // a cada resize (senão o smoothing volta a true e borra os sprites).
      try { ctx2d.imageSmoothingEnabled = false; } catch (e) {}

      // As 5 telas PRONTAS, com textos default em português (P24 tem gameOver E
      // missionComplete SEPARADAS — aqui: 'fim' = derrota, 'vitoria' = missão).
      var menu = makeScreen('menu', 'h1', 'Meu Jogo', 'WASD ou setas para andar');
      makeButton(menu, 'Jogar', function () { api.restartGame(); });
      var pausa = makeScreen('pausa', 'h2', 'Pausa', '');
      makeButton(pausa, 'Continuar', function () { api.resume(); });
      makeButton(pausa, 'Sair para o menu', function () { api.returnToMenu(); });
      makeScreen('carregando', 'h2', 'Carregando...', 'Preparando os pixels...');
      var fim = makeScreen('fim', 'h2', 'Fim de jogo', '');
      makeButton(fim, 'Jogar de novo', function () { api.restartGame(); });
      makeButton(fim, 'Sair para o menu', function () { api.returnToMenu(); });
      var vitoria = makeScreen('vitoria', 'h2', 'Missão cumprida!', 'Você venceu!');
      makeButton(vitoria, 'Jogar de novo', function () { api.restartGame(); });
      makeButton(vitoria, 'Sair para o menu', function () { api.returnToMenu(); });

      shellReady = true;
      applyStageBorder(); // a criança pode ter pedido a borda ANTES de começar
      return true;
    } catch (e) {
      warn('não consegui montar a tela do jogo: ' + e);
      return false;
    }
  }

  /**
   * Moldura em volta da tela, para enxergar onde é a área do jogo (ensinar).
   * Vai no ELEMENTO, não no desenho: não gasta pixel do jogo e nada a apaga.
   * A escolha fica em config.border porque na gk o canvas só nasce no "Começar
   * o jogo" — o bloco costuma rodar antes.
   */
  function applyStageBorder() {
    if (!canvasEl || !config.border) return;
    canvasEl.style.boxSizing = 'border-box';
    canvasEl.style.border = config.border.width + 'px solid ' + config.border.color;
  }
  function showStageBorder(color, width) {
    var w = num(width, 4);
    if (!(w > 0)) w = 4;
    config.border = { color: text(color, '#e2e8f0'), width: Math.min(Math.round(w), 40) };
    applyStageBorder();
  }

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
    var pedida = text(font, '');
    var atual = window.SZGameUIFont && window.SZGameUIFont.id;
    if (!pedida || !atual || pedida === atual) return;
    warnOnce(
      'fonte-divergente',
      'para trocar a fonte, use o bloco “Usar a fonte” no “Ao iniciar” — a fonte é escolhida antes de o jogo começar, então ela não muda no meio.'
    );
  }

  function focusWithoutScrolling(el) {
    if (!el || typeof el.focus !== 'function') return;
    try {
      el.focus({ preventScroll: true });
    } catch (focusOptionsError) {
      try { el.focus(); } catch (focusError) { warnOnce('focus:' + String(el.id || el.tagName || 'elemento'), 'não consegui mover o foco para a interface do jogo'); }
    }
  }

  function setStageDescription(description) {
    var next = text(description, '').trim();
    if (!next) {
      warn('a descrição do jogo não pode ficar vazia');
      return;
    }
    stageDescriptionText = next;
    if (!canvasEl) return;
    canvasEl.setAttribute('aria-label', next);
    var descriptionEl = document.getElementById('szgk-stage-description');
    if (descriptionEl) descriptionEl.textContent = next;
  }

  function hideScreens(restoreCanvasFocus) {
    if (!shellReady) return;
    for (var name in screens) {
      var s = screens[name];
      if (s && s.el) {
        s.el.classList.remove('szgk-active');
        s.el.setAttribute('aria-hidden', 'true');
      }
    }
    if (canvasEl) canvasEl.setAttribute('aria-hidden', 'false');
    if (restoreCanvasFocus !== false) focusWithoutScrolling(canvasEl);
  }

  function showScreen(name) {
    if (!ensureShell()) return;
    var key = text(name, '');
    var entry = screens[key];
    if (!entry) {
      warn('a tela "' + key + '" não existe — crie com "Criar a tela" (prontas: menu, pausa, carregando, fim, vitoria)');
      return;
    }
    hideScreens(false);
    entry.el.classList.add('szgk-active');
    entry.el.setAttribute('aria-hidden', 'false');
    if (canvasEl) canvasEl.setAttribute('aria-hidden', 'true');
    focusWithoutScrolling(entry.mainBtn || entry.el);
  }

  /** Telas automáticas por estado (menu/pausado/fim/vitoria/carregando); resto esconde. */
  function applyStateScreens(name) {
    if (!shellReady) return;
    if (name === 'menu') showScreen('menu');
    else if (name === 'pausado') showScreen('pausa');
    else if (name === 'fim') showScreen('fim');
    else if (name === 'vitoria') showScreen('vitoria');
    else if (name === 'carregando') showScreen('carregando');
    else hideScreens();
  }

  // ---- Máquina de estados (Game.state do kit, generalizada p/ nomes livres) ----

  function resetCoreGameData() {
        missionDone = false;
        playTime = 0;
        killCount = 0;
        for (var pk in pools) releaseAll(pools[pk]);
        for (var si = 0; si < spawners.length; si++) spawners[si].timer = 0;
        particles.active.length = 0;
        // R21: sobras visuais da partida anterior ("+100" no ar, onda no meio).
        while (floaties.active.length) floaties.free.push(floaties.active.pop());
        while (shockwaves.active.length) shockwaves.free.push(shockwaves.active.pop());
        while (sheetBursts.active.length) sheetBursts.free.push(sheetBursts.active.pop());
        // Cura os combatentes ANTES de esquecer a lista — sem isso um herói que
        // morreu piscando ficava com _iFrames congelado (invencível p/ sempre).
        for (var ci = 0; ci < combatants.length; ci++) {
          combatants[ci]._iFrames = 0;
          combatants[ci]._pushX = 0;
          combatants[ci]._pushY = 0;
          // Recarga do tiro/golpe é prazo ABSOLUTO em playTime, que acaba de
          // zerar acima. Um personagem que SOBREVIVE ao recomeço (fluxo sem
          // factory) guardaria um _cd no futuro e travaria o 1º tiro; zerar
          // aqui reabre a partida nova. No fluxo canônico (managedProjectRun) o
          // personagem nasce de novo com _cd:0, mas zerar não custa nada.
          combatants[ci]._cd = 0;
        }
        combatants.length = 0;
        // Idem para a lista do overlay: uma partida nova cria os personagens de
        // novo; sem zerar, os antigos ficariam sendo contornados para sempre.
        characters.length = 0;
        // Zera os golpes de ação em voo (senão um golpe do jogo anterior "toca").
        for (var wi = 0; wi < swinging.length; wi++) swinging[wi]._swingT = 0;
        swinging.length = 0;
        // ⚠️ R18: um "Esperar 30 s → nasce o chefe" da partida ANTERIOR dispararia
        // no meio da partida nova. É o mesmo erro do checkpoint/tweens abaixo.
        waits.length = 0;
        // ⚠️ TODO global de jogo entra AQUI. Os 3 abaixo escaparam quando nasceram:
        // · checkpoint — a criança marca o ponto numa bandeira no meio da fase (uso
        //   natural do bloco); sem zerar, "Jogar de novo" NASCE no meio da fase da
        //   partida anterior e pula metade do jogo.
        // · tweens — um "mover suave" em voo segura uma entidade que já voltou ao
        //   pool; ao recomeçar, o spawnFromMold reusa o objeto e o tween CONTINUA
        //   arrastando o inimigo novo (e o array retinha o pool inteiro).
        // · everySeconds — mantinha a fase do relógio da partida passada.
        plat.hasCp = false; plat.cpX = 0; plat.cpY = 0;
        screenFx.alpha = 0; screenFx.target = 0; screenFx.flashes = 0;
        resetCameraState();
        scrolls = Object.create(null);
        tweens.length = 0;
        secondTimers = Object.create(null); // sem protótipo: a chave vem da criança
  }
  function resetGameData() {
    _runRuntimeDomainHook('resetGame');
  }
  function runEnterStateHooks(n, prev, force) {
    // Os hooks de "quando entrar no estado" só rodam numa ENTRADA de verdade:
    // - despausar / fechar batalha é "voltar ao meio do jogo" (isMidResume);
    // - trocar para o estado em que JÁ se está não é entrar (senão um setState
    //   dentro do "A cada quadro" re-criaria inimigos/música 60×/s).
    var isMidResume = !force && (n === 'jogando' && (prev === 'pausado' || prev === 'batalha'));
    var isSameState = (n === prev);
    var hooks = enterStateHooks[n];
    if (hooks && !isMidResume && (!isSameState || force)) {
      for (var i = 0; i < hooks.length; i++) {
        try { hooks[i](); } catch (e) { warn('erro no "quando entrar no estado ' + n + '": ' + e); }
      }
    }
  }
  function setState(name) {
    var n = text(name, '');
    if (!n) return;
    if (!started) bootState = n;
    var prev = state;
    state = n;
    applyStateScreens(n);
    if (n === 'jogando' && prev !== 'jogando') lastTime = now();
    runEnterStateHooks(n, prev, false);
  }
  function restartGame() {
    var prev = state;
    resetGameData();
    state = 'jogando';
    applyStateScreens(state);
    lastTime = now();
    if (projectFactory) {
      resetProjectRegistrations();
      executeProjectFactory();
      rpgEnterInitialMap();
    } else {
      rpgEnterInitialMap();
      for (var i = 0; i < gameStartHooks.length; i++) {
        try { gameStartHooks[i](); } catch (e) { warn('erro no "quando começar uma partida": ' + e); }
      }
    }
    runEnterStateHooks(state, prev, true);
  }

  // ---- Entrada (Game.setupInput do kit) ----

  function bindInput() {
    window.addEventListener('keydown', function (e) {
      resumeAudio();
      var k = String(e.key).toLowerCase();
      keys[k] = true;
      // Só o 1º keydown é "apertou AGORA": o auto-repeat do SO (tecla segurada)
      // NÃO conta como edge, senão avança fala/menu várias vezes por segundo.
      if (!e.repeat) justPressed[k] = true;
      if (k === config.pauseKey) {
        if (state === 'jogando') setState('pausado');
        else if (state === 'pausado') setState('jogando');
      }
      // Overlay de depuração (círculos de colisão — P24) na tecla à esquerda do 1.
      // Usamos e.code (tecla FÍSICA), que independe de layout: no ABNT2 o e.key
      // vinha 'Dead' — e isso também é o ´ e o ~, então digitar acento abria o
      // overlay sem querer.
      if (e.code === 'Backquote') debugOverlay = !debugOverlay;
    });
    window.addEventListener('keyup', function (e) {
      keys[String(e.key).toLowerCase()] = false;
    });
    // Menu de contexto / perder o foco: solta todas as teclas (evita a tecla
    // "presa" quando o navegador engole o keyup).
    window.addEventListener('contextmenu', function () { keys = {}; });
    window.addEventListener('blur', function () { keys = {}; releasePointer(); });
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    bindMouse();
    if (proSim.enabled) ensureProfessionalInput();
  }

  /**
   * Mouse/toque: desfaz o letterbox (CSS estica o canvas), preserva a posição
   * fixa na TELA e soma a câmera para obter a posição no MUNDO. Pointer events
   * cobrem mouse E toque (tablet dos kids).
   */
  function toGameCoords(ev) {
    if (!canvasEl) return null;
    var rect = canvasEl.getBoundingClientRect();
    // Rect 0x0 = canvas ainda sem layout (só no teste headless; o preview usa
    // opacity:0, que preserva o rect). Escala 1: clientX vira coord do jogo.
    var borderLeft = num(canvasEl.clientLeft, 0);
    var borderTop = num(canvasEl.clientTop, 0);
    var rw = canvasEl.clientWidth > 0 ? canvasEl.clientWidth : (rect.width > 0 ? rect.width : config.w);
    var rh = canvasEl.clientHeight > 0 ? canvasEl.clientHeight : (rect.height > 0 ? rect.height : config.h);
    var screenX = (ev.clientX - rect.left - borderLeft) * (config.w / rw);
    var screenY = (ev.clientY - rect.top - borderTop) * (config.h / rh);
    var x = screenX;
    var y = screenY;
    if (camera.on) { x += camera.x; y += camera.y; }
    return { x: x, y: y, screenX: screenX, screenY: screenY };
  }
  function releasePointer(ev) {
    mouse.down = false;
    if (!canvasEl || !ev || ev.pointerId == null || typeof canvasEl.releasePointerCapture !== 'function') return;
    try {
      if (!canvasEl.hasPointerCapture || canvasEl.hasPointerCapture(ev.pointerId)) canvasEl.releasePointerCapture(ev.pointerId);
    } catch (releaseError) { warnOnce('pointer-release', 'não consegui liberar a captura do ponteiro'); }
  }
  function bindMouse() {
    if (!canvasEl) return;
    canvasEl.addEventListener('pointermove', function (ev) {
      if (mouse.down && ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      var p = toGameCoords(ev);
      if (p) {
        mouse.x = p.x;
        mouse.y = p.y;
        mouse.screenX = p.screenX;
        mouse.screenY = p.screenY;
      }
    });
    canvasEl.addEventListener('pointerdown', function (ev) {
      resumeAudio();
      var p = toGameCoords(ev);
      if (!p) return;
      mouse.x = p.x;
      mouse.y = p.y;
      mouse.screenX = p.screenX;
      mouse.screenY = p.screenY;
      mouse.down = true;
      focusWithoutScrolling(canvasEl);
      if (ev.pointerId != null && typeof canvasEl.setPointerCapture === 'function') {
        try { canvasEl.setPointerCapture(ev.pointerId); } catch (captureError) { warnOnce('pointer-capture', 'não consegui capturar o ponteiro no canvas'); }
      }
      // ⚔️ Batalha em equipe: o clique é da BATALHA (painel de ação + escolher/
      // inspecionar combatente). Coords SEM câmera (a cena é desenhada em tela).
      if (rpg.battle && state === 'batalha') {
        rpgBattleClick(p.screenX, p.screenY);
        return;
      }
      // Menu de escolha aberto: clicar numa opção escolhe (coords SEM câmera — o
      // menu é UI do motor, desenhado em coords de tela; toGameCoords soma a
      // câmera, então desfazemos aqui).
      if (rpg.menu) {
        var mx = p.screenX;
        var my = p.screenY;
        for (var mi = 0; mi < rpg.menuRects.length; mi++) {
          var r = rpg.menuRects[mi];
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            rpg.menu.index = r.index;
            selectMenu();
            return;
          }
        }
        return;
      }
      // 🏰 Compra de torre: um slot livre sob o clique consome o evento ANTES
      // dos "Quando clicar no jogo" (que segue livre p/ a receita de upgrade).
      if (tdHandleClick(p.x, p.y)) return;
      for (var i = 0; i < gameClickHooks.length; i++) {
        var fn = gameClickHooks[i];
        try { fn(p.x, p.y, p.screenX, p.screenY); } catch (e) {
          if (!fn.__szgkWarned) {
            fn.__szgkWarned = true;
            warn('erro no "Quando clicar no jogo": ' + e);
          }
        }
      }
    });
    canvasEl.addEventListener('pointerup', releasePointer);
    canvasEl.addEventListener('pointercancel', releasePointer);
  }

  // ---- Canvas responsivo (Game.resizeCanvas do kit, ratio derivado de w/h) ----

  function resizeCanvas() {
    if (!shellReady || !canvasEl) return;
    // Modo "ocupar a tela toda": a resolução INTERNA acompanha a viewport, então
    // as coordenadas do jogo (config.w/h) passam a valer o tamanho real da tela e
    // o canvas preenche tudo (sem barras). O "a largura/altura do jogo" acompanham
    // de graça (leem config.w/h) e o toGameCoords segue certo (razão ~1).
    if (config.fill) {
      var fw = Math.max(64, window.innerWidth);
      var fh = Math.max(64, window.innerHeight);
      config.w = fw;
      config.h = fh;
      canvasEl.width = fw;
      canvasEl.height = fh;
      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';
      // (não zeramos mais a borda aqui: ela só existia para anular a moldura de
      // fábrica do CSS. Zerar apagaria a borda escolhida no bloco a cada resize.)
      if (ctx2d) { try { ctx2d.imageSmoothingEnabled = false; } catch (e) {} }
      return;
    }
    var ratio = config.w / config.h;
    var margin = 15;
    var availW = window.innerWidth - margin * 2;
    var availH = window.innerHeight - margin * 2;
    if (!(availW > 0) || !(availH > 0)) return;
    var w;
    var h;
    if (availW / availH > ratio) {
      h = availH;
      w = h * ratio;
    } else {
      w = availW;
      h = w / ratio;
    }
    // A aventura em passos fixos mantém coordenadas lógicas, mas aumenta o
    // backing store em telas densas. Projetos antigos preservam o canvas 1:1.
    var dpr = proSim.enabled ? Math.max(1, Math.min(3, num(window.devicePixelRatio, 1))) : 1;
    canvasEl.width = Math.round(config.w * dpr);
    canvasEl.height = Math.round(config.h * dpr);
    canvasEl.style.width = w + 'px';
    canvasEl.style.height = h + 'px';
    // Atribuir canvas.width/height RESETA o estado do ctx (volta smoothing=true) —
    // re-aplicar aqui é o que mantém o pixel art nítido a cada resize.
    if (ctx2d) { try { ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0); ctx2d.imageSmoothingEnabled = false; } catch (e) {} }
  }

`
