/**
 * Runtime do "Jogo 2D Avançado" — injetado no <head> do iframe quando a
 * extensão "game-2d-advanced" está instalada. Expõe `window.SZGameKit`.
 *
 * É o "JS Game Starter Kit P9" (Franks Laboratory) achatado e generalizado num
 * facade: a base profissional que NÃO muda fica encapsulada aqui (máquina de
 * estados, loop com delta-time, carregamento assíncrono com tela de espera,
 * painéis de UI injetados por JS, canvas com resolução interna fixa +
 * letterbox responsivo, mapa de teclas com limpeza em blur/contextmenu); o que
 * muda é config (dimensões, cores, textos, tecla de pausa) e a MECÂNICA é da
 * criança, nos ganchos onUpdate(dt)/onDraw(ctx).
 *
 * Regras deste arquivo:
 * - String pura de JS ES5-like, SEM backticks nem interpolação (vive num
 *   template literal do TS) — texto dinâmico é concatenado com '+'.
 * - Nenhum toque em DOM no top-level: tudo lazy em ensureShell() (o script
 *   roda no <head> e os testes avaliam com um stub de window sem document).
 * - Nunca quebrar o jogo do aluno: API pública embrulhada em try/catch com
 *   console.warn (padrão do SZGame2D).
 */
export const gameKitRuntime = `(function () {
  // ---- Config (do bloco "Preparar o jogo profissional") ----
  var config = {
    w: 1280,
    h: 720,
    bg: '#1a1a2e',
    accent: '#4a9eff',
    pauseKey: 'escape'
  };

  // ---- Estado interno ----
  var state = 'menu';
  var started = false;
  var shellReady = false;
  var keys = {};
  var images = Object.create(null);      // nome -> { img, loaded }
  var pending = [];                      // promessas de carregamento
  var updateHooks = [];
  var drawHooks = [];
  var enterStateHooks = Object.create(null); // estado -> [fn]
  var screens = Object.create(null);     // nome -> { el, title, text, mainBtn }
  var stageEl = null;
  var canvasEl = null;
  var ctx2d = null;
  var styleEl = null;
  var lastTime = 0;
  var currentDt = 0;

  // ---- P24: arquitetura de jogo real ----
  var listeners = Object.create(null);   // aviso -> [fn]  (event bus)
  var molds = Object.create(null);       // nome -> data do molde
  var pools = Object.create(null);       // nome do molde -> { active:[], free:[] }
  var spawners = [];                     // { mold, interval, timer }
  var looks = Object.create(null);       // nome -> fn(ctx)  (aparência vetorial)
  var combatants = [];                   // personagens com vida/i-frames/empurrão
  var effects = Object.create(null);     // nome -> receita de faísca
  var particles = { active: [], free: [] };
  var sounds = Object.create(null);      // nome -> HTMLAudioElement
  var mission = null;                    // { seconds, killCount }
  var missionDone = false;
  var playTime = 0;
  var killCount = 0;
  var PUSHBACK_DECAY = 800;
  var justPressed = {};                  // teclas apertadas NESTE quadro (edge)
  var debugOverlay = false;              // tecla de crase desenha os círculos de colisão
  // Câmera que segue um personagem num MUNDO maior que a tela (main.js do RPG kit:
  // translate -> mundo -> restore -> HUD). Desligada = tela fixa (coords iguais).
  var camera = { on: false, target: null, x: 0, y: 0, worldW: 0, worldH: 0, shakeT: 0, shakeMag: 0 };
  var tilemaps = Object.create(null);    // nome -> {rows, artTile, imgKey, solid Set}
  var hudHooks = [];                     // desenham DEPOIS do restore (sem câmera)
  var mouse = { x: 0, y: 0, down: false };
  var gameClickHooks = [];               // fn(x, y) em coords do JOGO (letterbox convertido)

  // Manifesto de imagens do projeto, semeado pelo assetsBridge.
  var ASSETS = (window.__SZGAME_ASSETS && typeof window.__SZGAME_ASSETS === 'object')
    ? window.__SZGAME_ASSETS
    : {};
  var SOUNDS = (window.__SZGAME_SOUNDS && typeof window.__SZGAME_SOUNDS === 'object')
    ? window.__SZGAME_SOUNDS
    : {};
  // Metadados dos assets do Pinta (mapas de tiles): mesmo canal do game-2d.
  var ASSET_META = (window.__SZGAME_ASSET_META && typeof window.__SZGAME_ASSET_META === 'object')
    ? window.__SZGAME_ASSET_META
    : {};

  function warn(msg) {
    try { console.warn('SZGameKit: ' + msg); } catch (e) {}
  }
  // Aviso DEDUPADO por chave: para mensagens que sairiam de dentro do laço (nome
  // de molde/efeito errado chamado a cada quadro) — senão afoga o console 60×/s.
  var warnedOnce = Object.create(null);
  function warnOnce(key, msg) {
    if (warnedOnce[key]) return;
    warnedOnce[key] = true;
    warn(msg);
  }

  function now() {
    try {
      return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    } catch (e) { return Date.now(); }
  }

  function num(v, fallback) {
    // Number(null)/Number('') seriam 0 — aqui ausente/vazio cai no fallback.
    if (v == null || v === '') return fallback;
    var n = Number(v);
    return (typeof n === 'number' && isFinite(n)) ? n : fallback;
  }

  function text(v, fallback) {
    if (v == null) return fallback;
    var s = String(v);
    return s;
  }

  /** '#rgb'/'#rrggbb' -> 'rgba(r,g,b,a)' (p/ o brilho dos painéis). */
  function hexToRgba(hex, alpha) {
    var h = String(hex == null ? '' : hex).replace('#', '');
    if (h.length === 3) {
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    }
    var n = parseInt(h, 16);
    if (!isFinite(n) || h.length !== 6) return 'rgba(74, 158, 255, ' + alpha + ')';
    var r = (n >> 16) & 255;
    var g = (n >> 8) & 255;
    var b = n & 255;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  /** Normaliza nome de tecla p/ o mapa (lowercase; apelidos comuns). */
  function normKey(k) {
    var s = String(k == null ? '' : k).toLowerCase();
    if (s === 'espaco' || s === 'espaço' || s === 'space' || s === 'barra de espaco' || s === 'barra de espaço') return ' ';
    if (s === 'esc') return 'escape';
    if (s === 'seta direita' || s === 'direita') return 'arrowright';
    if (s === 'seta esquerda' || s === 'esquerda') return 'arrowleft';
    if (s === 'seta para cima' || s === 'cima') return 'arrowup';
    if (s === 'seta para baixo' || s === 'baixo') return 'arrowdown';
    return s;
  }

  // ---- Telas (o index.html + styles.css do kit, injetados por JS) ----

  function buildCss() {
    var glowStrong = hexToRgba(config.accent, 0.5);
    var glowSoft = hexToRgba(config.accent, 0.3);
    return '' +
      '#szgk-stage { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; ' +
        'background: ' + config.bg + '; overflow: hidden; ' +
        "font-family: 'Courier New', monospace; color: #eee; }" +
      '#szgk-canvas { border: 4px solid #2e2e3e; image-rendering: pixelated; image-rendering: crisp-edges; ' +
        'background: ' + config.bg + '; }' +
      '.szgk-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); ' +
        'background: rgba(0, 0, 0, 0.35); backdrop-filter: blur(10px); ' +
        'border: 3px solid ' + config.accent + '; padding: 30px; border-radius: 15px; text-align: center; ' +
        'box-shadow: 0 0 30px ' + glowSoft + '; z-index: 1000; display: none; max-width: 82%; }' +
      '.szgk-panel.szgk-active { display: block; }' +
      '.szgk-panel h1, .szgk-panel h2 { color: ' + config.accent + '; margin: 0 0 20px 0; ' +
        'text-shadow: 0 0 20px ' + glowStrong + '; }' +
      '.szgk-panel h1 { font-size: 40px; }' +
      '.szgk-panel h2 { font-size: 35px; }' +
      '.szgk-panel p { margin: 0 0 12px 0; font-size: 14px; min-height: 1em; }' +
      '.szgk-panel button { background: rgba(0, 0, 0, 0.4); color: white; ' +
        'border: 2px solid ' + config.accent + '; padding: 12px 24px; margin: 8px; font-size: 16px; ' +
        'cursor: pointer; font-family: inherit; border-radius: 8px; transition: all 0.3s; ' +
        'box-shadow: 0 0 15px ' + hexToRgba(config.accent, 0.2) + '; }' +
      '.szgk-panel button:hover { background: ' + config.accent + '; ' +
        'box-shadow: 0 0 25px ' + glowStrong + '; transform: translateY(-2px); }';
  }

  /** Cria um painel de tela (título + texto + botões) já escondido. */
  function makeScreen(name, titleTag, titleText, bodyText) {
    var el = document.createElement('div');
    el.className = 'szgk-panel';
    el.setAttribute('data-szgk-screen', name);
    var title = document.createElement(titleTag);
    title.textContent = titleText;
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
      stageEl.appendChild(canvasEl);
      document.body.appendChild(stageEl);
      ctx2d = canvasEl.getContext('2d');
      // Pixel art nítida por padrão (P24 seta no ctor do RenderSystem). Atribuir
      // canvas.width/height reseta o ctx — por isso o resizeCanvas RE-APLICA isto
      // a cada resize (senão o smoothing volta a true e borra os sprites).
      try { ctx2d.imageSmoothingEnabled = false; } catch (e) {}

      // As 5 telas PRONTAS, com textos default em português (P24 tem gameOver E
      // missionComplete SEPARADAS — aqui: 'fim' = derrota, 'vitoria' = missão).
      var menu = makeScreen('menu', 'h1', 'Meu Jogo', 'WASD ou setas para andar');
      makeButton(menu, 'Jogar', function () { api.setState('jogando'); });
      var pausa = makeScreen('pausa', 'h2', 'Pausa', '');
      makeButton(pausa, 'Continuar', function () { api.resume(); });
      makeButton(pausa, 'Sair para o menu', function () { api.returnToMenu(); });
      makeScreen('carregando', 'h2', 'Carregando...', 'Preparando os pixels...');
      var fim = makeScreen('fim', 'h2', 'Fim de jogo', '');
      makeButton(fim, 'Jogar de novo', function () { api.setState('jogando'); });
      makeButton(fim, 'Sair para o menu', function () { api.returnToMenu(); });
      var vitoria = makeScreen('vitoria', 'h2', 'Missão cumprida!', 'Você venceu!');
      makeButton(vitoria, 'Jogar de novo', function () { api.setState('jogando'); });
      makeButton(vitoria, 'Sair para o menu', function () { api.returnToMenu(); });

      shellReady = true;
      return true;
    } catch (e) {
      warn('não consegui montar a tela do jogo: ' + e);
      return false;
    }
  }

  function hideScreens() {
    if (!shellReady) return;
    for (var name in screens) {
      var s = screens[name];
      if (s && s.el) s.el.classList.remove('szgk-active');
    }
  }

  function showScreen(name) {
    if (!ensureShell()) return;
    var key = text(name, '');
    var entry = screens[key];
    if (!entry) {
      warn('a tela "' + key + '" não existe — crie com "Criar a tela" (prontas: menu, pausa, carregando, fim, vitoria)');
      return;
    }
    hideScreens();
    entry.el.classList.add('szgk-active');
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

  function setState(name) {
    var n = text(name, '');
    if (!n) return;
    var prev = state;
    state = n;
    applyStateScreens(n);
    // Entrou em "jogando": zera o relógio p/ o dt não dar um salto (startGame do kit)
    // e RECOMEÇA a arena (recolhe todos os enxames, zera missão/contadores e faíscas)
    // ANTES dos ganchos "quando entrar" da criança — assim "Jogar de novo" funciona.
    // ⚠️ EXCETO vindo de 'pausado'/'batalha' (estados do MEIO do jogo, geridos
    // pelo motor): despausar ou fechar uma batalha NÃO pode apagar os enxames.
    if (n === 'jogando' && prev !== 'jogando') {
      lastTime = now();
      if (prev !== 'pausado' && prev !== 'batalha') {
        missionDone = false;
        playTime = 0;
        killCount = 0;
        for (var pk in pools) releaseAll(pools[pk]);
        for (var si = 0; si < spawners.length; si++) spawners[si].timer = 0;
        particles.active.length = 0;
        // Cura os combatentes ANTES de esquecer a lista — sem isso um herói que
        // morreu piscando ficava com _iFrames congelado (invencível p/ sempre).
        for (var ci = 0; ci < combatants.length; ci++) {
          combatants[ci]._iFrames = 0;
          combatants[ci]._pushX = 0;
          combatants[ci]._pushY = 0;
        }
        combatants.length = 0;
        // Zera os golpes de ação em voo (senão um golpe do jogo anterior "toca").
        for (var wi = 0; wi < swinging.length; wi++) swinging[wi]._swingT = 0;
        swinging.length = 0;
        rpgNewGame();
      }
    }
    // Despausar / fechar batalha é "voltar ao meio do jogo", NÃO uma entrada NOVA
    // em 'jogando' — os hooks de "quando entrar em jogando" (criar inimigos, tocar
    // música) NÃO devem re-disparar aí. Em toda transição REAL (inclusive estados
    // custom), os hooks rodam normalmente.
    var isMidResume = (n === 'jogando' && (prev === 'pausado' || prev === 'batalha'));
    var hooks = enterStateHooks[n];
    if (hooks && !isMidResume) {
      for (var i = 0; i < hooks.length; i++) {
        try { hooks[i](); } catch (e) { warn('erro no "quando entrar no estado ' + n + '": ' + e); }
      }
    }
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
      // Tecla de crase (u0060) liga/desliga o overlay de depuração (círculos de
      // colisão — P24). No ABNT2 a crase é dead key (e.key 'Dead'): aceitamos as
      // duas formas. O escape existe porque crase crua quebraria o template.
      if (k === '\\u0060' || k === 'dead') debugOverlay = !debugOverlay;
    });
    window.addEventListener('keyup', function (e) {
      keys[String(e.key).toLowerCase()] = false;
    });
    // Menu de contexto / perder o foco: solta todas as teclas (evita a tecla
    // "presa" quando o navegador engole o keyup).
    window.addEventListener('contextmenu', function () { keys = {}; });
    window.addEventListener('blur', function () { keys = {}; mouse.down = false; });
    bindMouse();
  }

  /**
   * Mouse/toque em coords do JOGO: desfaz o letterbox (CSS estica o canvas) e,
   * com câmera ligada, soma o deslocamento — o clique cai no MUNDO, onde estão
   * os personagens. Pointer events cobrem mouse E toque (tablet dos kids).
   */
  function toGameCoords(ev) {
    if (!canvasEl) return null;
    var rect = canvasEl.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;
    var x = (ev.clientX - rect.left) * (config.w / rect.width);
    var y = (ev.clientY - rect.top) * (config.h / rect.height);
    if (camera.on) { x += camera.x; y += camera.y; }
    return { x: x, y: y };
  }
  function bindMouse() {
    if (!canvasEl) return;
    canvasEl.addEventListener('pointermove', function (ev) {
      var p = toGameCoords(ev);
      if (p) { mouse.x = p.x; mouse.y = p.y; }
    });
    canvasEl.addEventListener('pointerdown', function (ev) {
      resumeAudio();
      var p = toGameCoords(ev);
      if (!p) return;
      mouse.x = p.x;
      mouse.y = p.y;
      mouse.down = true;
      // Menu de escolha aberto: clicar numa opção escolhe (coords SEM câmera — o
      // menu é UI do motor, desenhado em coords de tela; toGameCoords soma a
      // câmera, então desfazemos aqui).
      if (rpg.menu) {
        var mx = p.x - (camera.on ? camera.x : 0);
        var my = p.y - (camera.on ? camera.y : 0);
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
      for (var i = 0; i < gameClickHooks.length; i++) {
        var fn = gameClickHooks[i];
        try { fn(p.x, p.y); } catch (e) {
          if (!fn.__szgkWarned) {
            fn.__szgkWarned = true;
            warn('erro no "Quando clicar no jogo": ' + e);
          }
        }
      }
    });
    canvasEl.addEventListener('pointerup', function () { mouse.down = false; });
    canvasEl.addEventListener('pointercancel', function () { mouse.down = false; });
  }

  // ---- Canvas responsivo (Game.resizeCanvas do kit, ratio derivado de w/h) ----

  function resizeCanvas() {
    if (!shellReady || !canvasEl) return;
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
    // Resolução INTERNA fixa; o CSS estica mantendo a proporção (letterbox).
    canvasEl.width = config.w;
    canvasEl.height = config.h;
    canvasEl.style.width = w + 'px';
    canvasEl.style.height = h + 'px';
    // Atribuir canvas.width/height RESETA o estado do ctx (volta smoothing=true) —
    // re-aplicar aqui é o que mantém o pixel art nítido a cada resize.
    if (ctx2d) { try { ctx2d.imageSmoothingEnabled = false; } catch (e) {} }
  }

  // ---- Carregamento (ImageManager do kit, lendo os desenhos do projeto) ----

  function resolveAsset(nameOrUrl) {
    var s = text(nameOrUrl, '');
    if (!s) return null;
    if (ASSETS[s]) return ASSETS[s];
    if (s.indexOf('data:') === 0 || s.indexOf('http://') === 0 || s.indexOf('https://') === 0) return s;
    return null;
  }

  function loadImage(name, asset) {
    var key = text(name, '') || text(asset, '');
    if (!key) {
      warn('"Carregar a imagem" precisa de um nome');
      return;
    }
    var entry = { img: null, loaded: false };
    images[key] = entry;
    var src = resolveAsset(asset);
    if (!src) {
      warn('a imagem "' + text(asset, '') + '" não está no projeto — o personagem usa o retângulo');
      return;
    }
    pending.push(new Promise(function (resolve) {
      try {
        var img = new Image();
        entry.img = img;
        img.onload = function () { entry.loaded = true; resolve(); };
        img.onerror = function () {
          warn('a imagem "' + key + '" falhou ao carregar — o personagem usa o retângulo');
          resolve();
        };
        img.src = src;
      } catch (e) { resolve(); }
    }));
  }

  // ---- Laço do jogo (Game.gameLoop do kit) ----

  function runHooks(list, arg, label) {
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      try {
        fn(arg);
      } catch (e) {
        // Avisa UMA vez por gancho (o laço roda ~60x/s — sem isso o console afoga).
        if (!fn.__szgkWarned) {
          fn.__szgkWarned = true;
          warn('erro no "' + label + '": ' + e);
        }
      }
    }
  }

  // ---- 🎥 Câmera (Camera do RPG kit: segue o alvo, presa nas bordas do mundo) ----

  function updateCamera() {
    if (!camera.on || !camera.target) return;
    var tx = centerX(camera.target) - config.w / 2;
    var ty = centerY(camera.target) - config.h / 2;
    camera.x = Math.max(0, Math.min(camera.worldW - config.w, tx));
    camera.y = Math.max(0, Math.min(camera.worldH - config.h, ty));
  }
  function cameraFollow(target, worldW, worldH) {
    if (!target || typeof target !== 'object') {
      warn('"Fazer a câmera seguir" precisa de um personagem');
      return;
    }
    camera.on = true;
    camera.target = target;
    // O mundo nunca é menor que a tela (senão a trava das bordas inverte).
    camera.worldW = Math.max(config.w, num(worldW, config.w));
    camera.worldH = Math.max(config.h, num(worldH, config.h));
    updateCamera();
  }
  function cameraStop() {
    camera.on = false;
    camera.target = null;
    camera.x = 0;
    camera.y = 0;
  }
  /** Treme a câmera (impacto/explosão): intensidade em px, por N segundos. */
  function cameraShake(intensity, seconds) {
    camera.shakeMag = Math.max(0, num(intensity, 8));
    camera.shakeT = Math.max(0, num(seconds, 0.4));
  }

  // ---- 🗺️ Mapa de tiles (camadas + profundidade) — Tiled do Ninja Adventure ----
  // Lê o MAPA do Pinta (ASSET_META[asset].tilemap): grade de índices + folha de
  // peças embutida + sólidos. Desenha alinhado à GRADE do RPG (célula = cellSize).
  function parseTileGrid(str) {
    var rows = [];
    if (typeof str !== 'string') return rows;
    var row = [];
    var token = '';
    function pushToken() {
      if (token === '') return;
      if (token === '.' || token === '-') row.push(-1);
      else { var n = parseInt(token, 10); row.push(isNaN(n) ? -1 : n); }
      token = '';
    }
    function pushRow() { pushToken(); if (row.length > 0) rows.push(row); row = []; }
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      var code = str.charCodeAt(i);
      if (ch === ';' || code === 10 || code === 13) pushRow();
      else if (code === 32 || code === 9 || ch === ',') pushToken();
      else token += ch;
    }
    pushRow();
    return rows;
  }
  function loadTilemap(name, assetName) {
    var nm = text(name, '');
    var an = text(assetName, '');
    if (!nm) { warn('"Carregar o mapa" precisa de um nome'); return; }
    var entry = Object.prototype.hasOwnProperty.call(ASSET_META, an) ? ASSET_META[an] : null;
    var meta = (entry && entry.tilemap && typeof entry.tilemap === 'object') ? entry.tilemap : null;
    if (!meta || !meta.tileset || typeof meta.tileset.dataUrl !== 'string' || typeof meta.grid !== 'string') {
      warn('o desenho "' + an + '" não veio com um MAPA do Pinta — envie o MAPA pelo foguete do Pinta');
      return;
    }
    var solid = Object.create(null);
    if (meta.solid && typeof meta.solid.length === 'number') {
      for (var i = 0; i < meta.solid.length; i++) {
        var s = meta.solid[i];
        if (typeof s === 'number' && s >= 0) solid[Math.floor(s)] = true;
      }
    }
    var imgKey = '__tm_' + nm;
    loadImage(imgKey, meta.tileset.dataUrl); // a folha embutida entra por dataUrl
    tilemaps[nm] = {
      rows: parseTileGrid(meta.grid),
      artTile: (typeof meta.tileSize === 'number' && meta.tileSize > 0) ? meta.tileSize : 32,
      imgKey: imgKey, solid: solid
    };
  }
  /** Desenha o mapa alinhado à grade. layer: 'chão' = tudo; 'topos' = só sólidos
   * (árvores/telhados desenhados POR CIMA do herói — o front-render do Ninja). */
  function drawTilemap(name, layer) {
    if (!ctx2d) return;
    var m = tilemaps[text(name, '')];
    if (!m) return;
    var sheet = images[m.imgKey];
    if (!sheet || !sheet.loaded || !sheet.img) return;
    var at = m.artTile;
    var cols = Math.max(1, Math.floor(num(sheet.img.width, at) / at));
    var cell = rpg.cellSize;
    var onlyTops = (text(layer, 'chão') === 'topos');
    for (var r = 0; r < m.rows.length; r++) {
      var rowArr = m.rows[r];
      for (var c = 0; c < rowArr.length; c++) {
        var idx = rowArr[c];
        if (idx < 0) continue;
        if (onlyTops && !m.solid[idx]) continue;
        var sx = (idx % cols) * at;
        var sy = Math.floor(idx / cols) * at;
        try { ctx2d.drawImage(sheet.img, sx, sy, at, at, c * cell, r * cell, cell, cell); } catch (e) {}
      }
    }
  }
  /** Marca os tiles sólidos do mapa como PAREDES da grade (colisão do RPG). */
  function tilemapSolid(name) {
    var m = tilemaps[text(name, '')];
    if (!m) return;
    for (var r = 0; r < m.rows.length; r++) {
      var rowArr = m.rows[r];
      for (var c = 0; c < rowArr.length; c++) {
        if (rowArr[c] >= 0 && m.solid[rowArr[c]]) { rpg.walls[c + ',' + r] = true; rpg.terrain[c + ',' + r] = true; }
      }
    }
  }
  /** Sombra suave sob um personagem (useShadow do Pizza) — dá volume no top-down. */
  function drawShadow(c) {
    if (!ctx2d || !c || typeof c !== 'object') return;
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx2d.beginPath();
    var rx = Math.max(4, num(c.w, 40) * 0.35);
    ctx2d.ellipse(centerX(c), num(c.y, 0) + num(c.h, 0) - 4, rx, rx * 0.4, 0, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  }
  /** Desenha o herói + os NPCs em ordem de PROFUNDIDADE (quem está mais embaixo
   * fica na frente) — o Y-sort do Pizza (painter's algorithm). */
  // Lista e comparador REUSÁVEIS (roda a cada quadro): evita alocar array + closure
  // 60×/s (GC em celular fraco).
  var depthList = [];
  function depthCmp(a, b) { return (num(a.y, 0) + num(a.h, 0)) - (num(b.y, 0) + num(b.h, 0)); }
  function drawByDepth(hero) {
    depthList.length = 0;
    if (hero && typeof hero === 'object') depthList.push(hero);
    for (var k in rpg.npcs) depthList.push(rpg.npcs[k]);
    depthList.sort(depthCmp);
    for (var i = 0; i < depthList.length; i++) drawEntity(depthList[i]);
  }

  function render() {
    if (!ctx2d) return;
    if (state === 'menu' || state === 'carregando') {
      // Sem jogo rodando: só o fundo (o painel da tela fica por cima).
      ctx2d.fillStyle = config.bg;
      ctx2d.fillRect(0, 0, config.w, config.h);
      return;
    }
    // jogando/pausado/fim/estados custom: os ganchos de desenho são donos do
    // quadro (na pausa nada ATUALIZA, então a imagem congela — como no kit).
    // Com a câmera ligada, o MUNDO desenha transladado (main.js do RPG kit:
    // translate -> mundo -> restore -> HUD); o overlay de debug é world-space.
    updateCamera();
    // Tremor da câmera (impacto): desloca o mundo aleatoriamente enquanto dura.
    var shx = 0;
    var shy = 0;
    if (camera.shakeT > 0 && camera.shakeMag > 0) {
      shx = (Math.random() * 2 - 1) * camera.shakeMag;
      shy = (Math.random() * 2 - 1) * camera.shakeMag;
    }
    var cam = camera.on;
    // O tremor desloca o mundo mesmo SEM câmera — então o save/restore precisa
    // casar pela MESMA condição (pushed), senão um tremor sem câmera vaza o
    // translate (HUD/menus deslocam) e empilha save() sem restore().
    var pushed = cam || shx !== 0 || shy !== 0;
    if (pushed) {
      ctx2d.save();
      ctx2d.translate(-Math.round(camera.x) + Math.round(shx), -Math.round(camera.y) + Math.round(shy));
    }
    runHooks(drawHooks, ctx2d, 'Desenhar o jogo');
    if (debugOverlay) drawDebugOverlay();
    if (pushed) ctx2d.restore();
    // HUD: por cima de tudo, SEM câmera (placar/barras ficam presos na tela).
    runHooks(hudHooks, ctx2d, 'Desenhar por cima (HUD)');
    // Transição de mapa: um preto por cima decaindo (o mapa surge do escuro).
    if (rpg.fade > 0) {
      ctx2d.save();
      try { ctx2d.globalAlpha = Math.min(1, rpg.fade); } catch (e) {}
      ctx2d.fillStyle = '#000000';
      ctx2d.fillRect(0, 0, config.w, config.h);
      ctx2d.restore();
    }
    // A caixa de fala e o menu de escolha são UI do MOTOR: sempre no topo.
    drawDialog();
    drawMenu();
  }

  /** Tecla de crase: círculos de colisão de pools + combatentes (debug do P24). */
  function drawDebugOverlay() {
    if (!ctx2d) return;
    ctx2d.save();
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = '#22c55e';
    function circleOf(e) {
      if (!e || e._active === false) return;
      var r = num(e.radius, Math.min(num(e.w, 0), num(e.h, 0)) / 2);
      if (!(r > 0)) return;
      ctx2d.beginPath();
      ctx2d.arc(num(e.x, 0) + num(e.w, 0) / 2, num(e.y, 0) + num(e.h, 0) / 2, r, 0, Math.PI * 2);
      ctx2d.stroke();
    }
    for (var pk in pools) {
      var act = pools[pk].active;
      for (var i = 0; i < act.length; i++) circleOf(act[i]);
    }
    for (var c = 0; c < combatants.length; c++) circleOf(combatants[c]);
    ctx2d.restore();
  }

  function gameLoop(timestamp) {
    var dt = (timestamp - lastTime) / 1000;
    if (!(dt >= 0)) dt = 0;
    if (dt > 0.1) dt = 0.1; // clamp do kit: aba em segundo plano não teleporta o jogo
    lastTime = timestamp;
    currentDt = dt;
    if (state === 'jogando') {
      stepSystems(dt);
      // A missão pode ter mudado o estado NESTE quadro (vitória) — não rodar o
      // update da criança num jogo que acabou de terminar (paridade P24).
      if (state === 'jogando') runHooks(updateHooks, dt, 'A cada quadro');
    }
    render();
    // Limpa o edge de "apertada AGORA" no fim do quadro (padrão Input do RPG kit).
    justPressed = {};
    requestAnimationFrame(gameLoop);
  }

  // Os "managers" do P24 rodando por quadro (só enquanto joga): spawners por tempo,
  // decaimento de i-frames/empurrão do combate, e a missão (sobreviver/derrotar).
  function stepSystems(dt) {
    playTime += dt;
    if (camera.shakeT > 0) camera.shakeT = Math.max(0, camera.shakeT - dt); // decai o tremor
    stepSwings(dt); // decai o tempo dos golpes de ação (🥷)
    stepRpg(dt); // NPCs que andam + motor de cena + transição de mapa (Kit RPG)
    for (var i = 0; i < spawners.length; i++) {
      var sp = spawners[i];
      sp.timer += dt;
      while (sp.timer >= sp.interval && sp.interval > 0) {
        sp.timer -= sp.interval;
        spawnAtEdge(sp.mold);
      }
    }
    for (var c = combatants.length - 1; c >= 0; c--) {
      var e = combatants[c];
      // Poda entidades recicladas — sem isso a lista acumula e move mortos à toa.
      if (e._active === false) {
        combatants.splice(c, 1);
        continue;
      }
      if (e._iFrames > 0) e._iFrames = Math.max(0, e._iFrames - dt);
      if (e._pushX || e._pushY) {
        e.x += e._pushX * dt;
        e.y += e._pushY * dt;
        var spd = Math.sqrt(e._pushX * e._pushX + e._pushY * e._pushY);
        var decay = PUSHBACK_DECAY * dt;
        if (spd <= decay) { e._pushX = 0; e._pushY = 0; }
        else { var r = (spd - decay) / spd; e._pushX *= r; e._pushY *= r; }
      }
    }
    if (mission && !missionDone) {
      if (playTime >= mission.seconds || killCount >= mission.killCount) {
        missionDone = true;
        // Vitória tem tela PRÓPRIA (P24: MISSION_COMPLETE ≠ GAME_OVER). O estado
        // muda ANTES do aviso — um ouvinte de 'missao:completa' pode sobrescrever
        // (trocar texto, mostrar tela custom) sem ser atropelado.
        setState('vitoria');
        api.emit('missao:completa');
      }
    }
  }

  // ---- Personagens (Player do kit, generalizado p/ N nomeados) ----

  function createCharacter(opts) {
    var o = (opts && typeof opts === 'object') ? opts : {};
    var w = num(o.w, 64);
    var h = num(o.h, 64);
    var hp = num(o.health, 100);
    var c = {
      x: (config.w - w) / 2,
      y: (config.h - h) / 2,
      w: w,
      h: h,
      speed: num(o.speed, 300),
      speedMultiplier: 1,
      image: text(o.image, ''),
      color: text(o.color, '#4a9eff'),
      look: text(o.look, ''),
      // Vida p/ o combate funcionar no personagem (herói leva vários hits, não 1).
      health: hp,
      maxHealth: hp,
      radius: Math.min(w, h) / 2,
      // Velocidade própria (tiro/deriva): "Lançar na direção" seta, "Mover pela
      // velocidade" aplica × dt.
      vx: 0,
      vy: 0,
      _iFrames: 0,
      _pushX: 0,
      _pushY: 0,
      _facingLeft: false,
      _facingDir: 'down',   // 4 direções p/ a folha de andar + conversa do RPG
      _angle: 0,
      _sheetImg: '', _sheetFw: 0, _sheetFh: 0,
      _animFrom: 0, _animTo: 0, _animFps: 0, _animStart: 0,
      // Folha de andar por DIREÇÃO (4 linhas) + detecção de movimento p/ animar.
      _walkImg: '', _walkFw: 0, _walkFh: 0, _walkFrames: 0, _walkFps: 6,
      _lastX: 0, _lastY: 0, _moving: false
    };
    return c;
  }

  function moveWithKeys(c, dt) {
    if (!c || typeof c !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    var dx = 0;
    var dy = 0;
    if (keys.w || keys.arrowup) dy -= 1;
    if (keys.s || keys.arrowdown) dy += 1;
    if (keys.a || keys.arrowleft) dx -= 1;
    if (keys.d || keys.arrowright) dx += 1;
    if (dx || dy) {
      // Diagonal normalizada: andar na diagonal NÃO é mais rápido (kit).
      var len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      c.x += dx * num(c.speed, 0) * num(c.speedMultiplier, 1) * d;
      c.y += dy * num(c.speed, 0) * num(c.speedMultiplier, 1) * d;
      // Direção dominante → linha da folha de andar (baixo/cima/esquerda/direita).
      if (Math.abs(dx) >= Math.abs(dy)) c._facingDir = dx < 0 ? 'left' : 'right';
      else c._facingDir = dy < 0 ? 'up' : 'down';
      c._facingLeft = (c._facingDir === 'left');
    }
  }

  function keepOnScreen(c) {
    if (!c || typeof c !== 'object') return;
    // Com câmera ligada, "a tela" vira o MUNDO — o personagem anda até as
    // bordas do mundo e a câmera o acompanha.
    var bw = camera.on ? camera.worldW : config.w;
    var bh = camera.on ? camera.worldH : config.h;
    c.x = Math.max(0, Math.min(bw - num(c.w, 0), num(c.x, 0)));
    c.y = Math.max(0, Math.min(bh - num(c.h, 0), num(c.y, 0)));
  }

  // Desenha 1 personagem: folha de quadros > aparência (look) > imagem >
  // retângulo. Herda de graça o piscar (i-frames), a virada (facingLeft) e o
  // giro (_angle) — como o RenderSystem do P24.
  function drawEntity(c) {
    if (!ctx2d || !c || typeof c !== 'object') return;
    // Anda? = mudou de posição desde o último quadro (serve p/ grade, teclas e
    // velocidade). Alimenta a folha de andar direcional.
    c._moving = (Math.abs(num(c.x, 0) - num(c._lastX, 0)) > 0.01 ||
                 Math.abs(num(c.y, 0) - num(c._lastY, 0)) > 0.01);
    c._lastX = c.x; c._lastY = c.y;
    var prevAlpha = 1;
    var blinking = c._iFrames > 0;
    if (blinking) {
      try { prevAlpha = ctx2d.globalAlpha; } catch (e) {}
      // FLASH_SPEED 10 do P24 (0.1 + 0.8·|sin|).
      try { ctx2d.globalAlpha = 0.1 + 0.8 * Math.abs(Math.sin(c._iFrames * 10)); } catch (e) {}
    }
    // Giro em volta do CENTRO (o wrapper mais externo — flip e desenho rodam juntos).
    var ang = num(c._angle, 0);
    if (ang) {
      ctx2d.save();
      ctx2d.translate(centerX(c), centerY(c));
      ctx2d.rotate(ang * Math.PI / 180);
      ctx2d.translate(-centerX(c), -centerY(c));
    }
    // A folha de ANDAR tem uma linha por direção (esquerda ≠ espelho): NÃO vira.
    var flip = c._facingLeft === true && !c._walkImg;
    if (flip) {
      ctx2d.save();
      ctx2d.translate(c.x + c.w, c.y);
      ctx2d.scale(-1, 1);
    }
    var lx = flip ? 0 : c.x;
    var ly = flip ? 0 : c.y;
    var drew = false;
    // Folha de ANDAR direcional (4 linhas: baixo/cima/esquerda/direita): linha pela
    // direção, coluna anima quando anda, 1º quadro quando parado (top-down vivo).
    if (!drew && c._walkImg) {
      var wsheet = images[c._walkImg];
      if (wsheet && wsheet.loaded && wsheet.img) {
        var wfw = Math.max(1, num(c._walkFw, 16));
        var wfh = Math.max(1, num(c._walkFh, 16));
        var wcols = Math.max(1, Math.floor(num(wsheet.img.width, wfw) / wfw));
        var wmaxRow = Math.max(0, Math.floor(num(wsheet.img.height, wfh) / wfh) - 1);
        var wrow = DIR_ROW[c._facingDir || 'down'];
        if (wrow == null || wrow > wmaxRow) wrow = 0;
        var wframes = num(c._walkFrames, 0) > 0 ? Math.min(c._walkFrames, wcols) : wcols;
        var wcol = 0;
        if (c._moving && wframes > 1) wcol = Math.floor(playTime * num(c._walkFps, 6)) % wframes;
        try {
          ctx2d.drawImage(wsheet.img, wcol * wfw, wrow * wfh, wfw, wfh, lx, ly, c.w, c.h);
          drew = true;
        } catch (e) {}
      }
    }
    // Folha de quadros (spritesheet): recorta o quadro da vez (pixel art viva).
    if (!drew && c._sheetImg) {
      var sheet = images[c._sheetImg];
      if (sheet && sheet.loaded && sheet.img) {
        var fw = Math.max(1, num(c._sheetFw, 32));
        var fh = Math.max(1, num(c._sheetFh, 32));
        var cols = Math.max(1, Math.floor(num(sheet.img.width, fw) / fw));
        var idx = num(c._animFrom, 0);
        var span = num(c._animTo, 0) - idx + 1;
        if (num(c._animFps, 0) > 0 && span > 0) {
          var el = Math.max(0, playTime - num(c._animStart, 0));
          idx += Math.floor(el * c._animFps) % span;
        }
        var sx = (idx % cols) * fw;
        var sy = Math.floor(idx / cols) * fh;
        try {
          ctx2d.drawImage(sheet.img, sx, sy, fw, fh, lx, ly, c.w, c.h);
          drew = true;
        } catch (e) {}
      }
    }
    var look = looks[c.look];
    if (!drew && look && typeof look.fn === 'function') {
      ctx2d.save();
      ctx2d.translate(lx, ly);
      // A aparência é autoral num quadro-base (baseW×baseH) e ESCALA ao tamanho
      // da entidade — mesmo look serve p/ moldes grandes e pequenos.
      try {
        ctx2d.scale(num(c.w, look.baseW) / look.baseW, num(c.h, look.baseH) / look.baseH);
        look.fn(ctx2d);
        drew = true;
      } catch (e) {}
      ctx2d.restore();
    }
    if (!drew) {
      var entry = images[c.image];
      if (entry && entry.loaded && entry.img) {
        try {
          ctx2d.drawImage(entry.img, lx, ly, c.w, c.h);
          drew = true;
        } catch (e) {}
      }
    }
    if (!drew) {
      // Fallback do kit: retângulo da cor com contorno branco.
      ctx2d.fillStyle = text(c.color, '#4a9eff');
      ctx2d.fillRect(lx, ly, c.w, c.h);
      ctx2d.strokeStyle = 'white';
      ctx2d.strokeRect(lx, ly, c.w, c.h);
    }
    if (flip) ctx2d.restore();
    if (ang) ctx2d.restore();
    if (blinking) { try { ctx2d.globalAlpha = prevAlpha; } catch (e) {} }
    // 🥷 Rastro do golpe (ação): enquanto golpeando, pinta a caixa de acerto à
    // frente — feedback visual de graça em qualquer "Desenhar o personagem".
    if (num(c._swingT, 0) > 0) {
      try {
        var sb = swingBox(c);
        var pa = ctx2d.globalAlpha;
        ctx2d.globalAlpha = 0.45 * Math.min(1, c._swingT / 0.3);
        ctx2d.fillStyle = 'white';
        ctx2d.fillRect(sb.x, sb.y, sb.w, sb.h);
        ctx2d.globalAlpha = pa;
      } catch (e) {}
    }
  }

  function drawCharacter(c) {
    drawEntity(c);
  }

  // ---- 🎞️ Folha de quadros (Sprite + Animations do RPG kit, simplificado) ----

  function setSheet(c, imageName, fw, fh) {
    if (!c || typeof c !== 'object') return;
    c._sheetImg = text(imageName, '');
    c._sheetFw = Math.max(1, num(fw, num(c.w, 32)));
    c._sheetFh = Math.max(1, num(fh, num(c.h, 32)));
    c._animFrom = 0; c._animTo = 0; c._animFps = 0; c._animStart = 0;
  }
  function playAnim(c, from, to, fps) {
    if (!c || typeof c !== 'object') return;
    var f = Math.max(0, Math.floor(num(from, 0)));
    var t = Math.max(f, Math.floor(num(to, f)));
    var r = Math.max(1, num(fps, 8));
    // Guarda de transição (padrão g2d): re-tocar a MESMA animação todo quadro
    // NÃO reinicia — senão o 1º quadro congela para sempre.
    if (c._animFrom === f && c._animTo === t && c._animFps === r) return;
    c._animFrom = f;
    c._animTo = t;
    c._animFps = r;
    // O relógio é o playTime (só anda em 'jogando') — a animação PAUSA junto.
    c._animStart = playTime;
  }

  // Folha de ANDAR direcional (personagem de topo estilo RPGMaker): a folha tem 4
  // LINHAS na ordem baixo/cima/esquerda/direita, cada uma com N quadros. O
  // drawEntity escolhe a linha pela direção que o personagem olha e anima a coluna
  // quando ele anda (parado = 1º quadro). Espelha o walk/idle por direção do
  // Sprite.animations do Pizza Legends, mas por FOLHA em vez de col,row autoral.
  function setWalkSheet(c, imageName, fw, fh) {
    if (!c || typeof c !== 'object') return;
    c._walkImg = text(imageName, '');
    c._walkFw = Math.max(1, num(fw, num(c.w, 16)));
    c._walkFh = Math.max(1, num(fh, num(c.h, 16)));
    c._walkFrames = 0; // 0 = usar todas as colunas da folha
  }

  function drawBackground(color, grid) {
    if (!ctx2d) return;
    // Cobre o retângulo VISÍVEL (com câmera, o ctx está transladado — pintar em
    // camera.x/y cobre a tela). A grade fica em coords do MUNDO: ela "anda"
    // quando a câmera segue, dando a sensação de mundo de graça.
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    ctx2d.fillStyle = text(color, config.bg);
    ctx2d.fillRect(ox, oy, config.w, config.h);
    if (grid) {
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      for (var i = Math.floor(ox / 40) * 40; i < ox + config.w; i += 40) {
        ctx2d.moveTo(i, oy);
        ctx2d.lineTo(i, oy + config.h);
      }
      for (var j = Math.floor(oy / 40) * 40; j < oy + config.h; j += 40) {
        ctx2d.moveTo(ox, j);
        ctx2d.lineTo(ox + config.w, j);
      }
      ctx2d.stroke();
    }
  }

  function touching(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    return (
      num(a.x, 0) < num(b.x, 0) + num(b.w, 0) &&
      num(a.x, 0) + num(a.w, 0) > num(b.x, 0) &&
      num(a.y, 0) < num(b.y, 0) + num(b.h, 0) &&
      num(a.y, 0) + num(a.h, 0) > num(b.y, 0)
    );
  }

  function centerX(c) { return num(c.x, 0) + num(c.w, 0) / 2; }
  function centerY(c) { return num(c.y, 0) + num(c.h, 0) / 2; }

  // ---- 📢 Event bus (EventEmitter do P24) ----
  function onEvent(name, fn) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    (listeners[k] || (listeners[k] = [])).push(fn);
  }
  function emit(name) {
    var list = listeners[text(name, '')];
    if (!list) return;
    // Repassa argumentos extras aos ouvintes (EventEmitter do P24 carrega payload;
    // os blocos de hoje ignoram, mas a semântica fica pronta).
    var extra = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < list.length; i++) {
      try { list[i].apply(null, extra); } catch (e) { warn('erro no "quando chegar o aviso": ' + e); }
    }
  }

  // ---- 👾 Moldes, pools e spawner (data-driven + ObjectPooler do P24) ----
  /** Entidade nova com TODAS as propriedades (hidden class estável p/ o pool). */
  function blankEntity() {
    return {
      x: 0, y: 0, w: 0, h: 0,
      speed: 0, damage: 0, color: '', image: '', look: '', radius: 0,
      health: 0, maxHealth: 0,
      vx: 0, vy: 0,
      _active: false, _facingLeft: false, _facingDir: 'down', _iFrames: 0,
      _pushX: 0, _pushY: 0, _driftAngle: null, _mold: '',
      _angle: 0,
      _sheetImg: '', _sheetFw: 0, _sheetFh: 0,
      _animFrom: 0, _animTo: 0, _animFps: 0, _animStart: 0,
      _walkImg: '', _walkFw: 0, _walkFh: 0, _walkFrames: 0, _walkFps: 6,
      _lastX: 0, _lastY: 0, _moving: false,
      _swingT: 0, _swingRange: 0, _swingId: 0, _hitBySwing: 0
    };
  }
  function defineMold(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o molde" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    var w = num(o.w, 40), h = num(o.h, 40);
    molds[k] = {
      w: w, h: h,
      health: num(o.health, 20),
      speed: num(o.speed, 120),
      damage: num(o.damage, 10),
      color: text(o.color, '#e94f4f'),
      image: text(o.image, ''),
      look: text(o.look, ''),
      radius: Math.min(w, h) / 2
    };
    if (!pools[k]) pools[k] = { active: [], free: [], _sweeping: false };
    // Pré-aquece o pool (P24 pré-cria 10): as primeiras ondas não alocam no loop.
    while (pools[k].free.length + pools[k].active.length < 8) {
      pools[k].free.push(blankEntity());
    }
  }
  function spawnFromMold(name, x, y) {
    var k = text(name, '');
    var m = molds[k];
    if (!m) { warnOnce('mold:' + k, 'molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var pool = pools[k] || (pools[k] = { active: [], free: [], _sweeping: false });
    var e = pool.free.pop();
    if (!e) e = blankEntity();
    e.x = num(x, 0); e.y = num(y, 0);
    e.w = m.w; e.h = m.h;
    e.speed = m.speed; e.damage = m.damage; e.color = m.color;
    e.image = m.image; e.look = m.look; e.radius = m.radius;
    e.health = m.health; e.maxHealth = m.health;
    e._active = true; e._facingLeft = false; e._facingDir = 'down'; e._iFrames = 0;
    e._pushX = 0; e._pushY = 0; e._driftAngle = null; e._mold = k;
    e.vx = 0; e.vy = 0; e._angle = 0;
    e._sheetImg = ''; e._sheetFw = 0; e._sheetFh = 0;
    e._animFrom = 0; e._animTo = 0; e._animFps = 0; e._animStart = 0;
    e._walkImg = ''; e._walkFw = 0; e._walkFh = 0; e._walkFrames = 0; e._walkFps = 6;
    e._lastX = e.x; e._lastY = e.y; e._moving = false;
    // Zera o golpe de ação (senão uma entidade reciclada carrega o rastro/latch).
    e._swingT = 0; e._swingRange = 0; e._swingId = 0; e._hitBySwing = 0;
    pool.active.push(e);
    return e;
  }
  function spawnAtEdge(name) {
    // Margem de nascimento 100 = ENEMY_SPAWN_MARGIN do P24. Com câmera, nasce
    // nas bordas do retângulo VISÍVEL (o inimigo sempre entra "por perto").
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    var edge = Math.floor(Math.random() * 4);
    var x, y;
    if (edge === 0) { x = ox + Math.random() * config.w; y = oy - 100; }
    else if (edge === 1) { x = ox + config.w + 100; y = oy + Math.random() * config.h; }
    else if (edge === 2) { x = ox + Math.random() * config.w; y = oy + config.h + 100; }
    else { x = ox - 100; y = oy + Math.random() * config.h; }
    return spawnFromMold(name, x, y);
  }
  function recycle(e) {
    if (!e || typeof e !== 'object') return;
    if (!e._mold) {
      warn('só personagens nascidos de um molde podem ser recolhidos');
      return;
    }
    e._active = false;
    var pool = pools[e._mold];
    if (!pool) return;
    // Dentro de uma varredura (forEachActive/cull), a compactação reversa cuida
    // da devolução. FORA dela (botão, aviso, quando-entrar), devolvemos AGORA —
    // senão a entidade ficava em active[] para sempre (nunca reusada).
    if (!pool._sweeping) {
      var idx = pool.active.indexOf(e);
      if (idx > -1) {
        pool.active.splice(idx, 1);
        pool.free.push(e);
      }
    }
  }
  function compact(pool) {
    // Move os inativos do active[] para o free[] (varredura reversa, estilo P24).
    for (var i = pool.active.length - 1; i >= 0; i--) {
      if (!pool.active[i]._active) {
        var dead = pool.active[i];
        pool.active.splice(i, 1);
        pool.free.push(dead);
      }
    }
  }
  function releaseAll(pool) {
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      e._active = false;
      e._iFrames = 0;
      e._pushX = 0;
      e._pushY = 0;
      pool.free.push(e);
    }
    pool.active.length = 0;
  }
  function forEachActive(name, fn) {
    var pool = pools[text(name, '')];
    if (!pool || typeof fn !== 'function') return;
    // Ordem REVERSA: recolher/remover durante o laço é seguro.
    pool._sweeping = true;
    var warned = false;
    for (var i = pool.active.length - 1; i >= 0; i--) {
      var e = pool.active[i];
      if (!e._active) continue;
      try {
        fn(e);
      } catch (err) {
        // Avisa UMA vez por chamada (o laço roda por quadro × N vivos — sem isso
        // um erro no corpo afoga o Console com 60·n avisos/s).
        if (!warned) {
          warned = true;
          warn('erro no "para cada vivo": ' + err);
        }
      }
    }
    pool._sweeping = false;
    compact(pool);
  }
  function cullOffscreen(name, margin) {
    var pool = pools[text(name, '')];
    if (!pool) return;
    // Default 200 = margem de despawn do P24 (spawn nas bordas usa 100). Com a
    // câmera ligada, "tela" = o retângulo VISÍVEL (senão o mundo inteiro sumia).
    var m = num(margin, 200);
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    pool._sweeping = true;
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      if (e.x < ox - m || e.x > ox + config.w + m || e.y < oy - m || e.y > oy + config.h + m) {
        e._active = false;
      }
    }
    pool._sweeping = false;
    compact(pool);
  }
  function drawActive(name) {
    var pool = pools[text(name, '')];
    if (!pool) return;
    for (var i = 0; i < pool.active.length; i++) {
      if (pool.active[i]._active) drawEntity(pool.active[i]);
    }
  }
  function countActive(name) {
    var pool = pools[text(name, '')];
    if (!pool) return 0;
    var n = 0;
    for (var i = 0; i < pool.active.length; i++) {
      if (pool.active[i]._active) n++;
    }
    return n;
  }

  // ---- 🎯 Comportamentos (Seek/Drift/facing do P24) ----
  function seek(who, target, dt) {
    if (!who || !target || typeof who !== 'object' || typeof target !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    var dx = centerX(target) - centerX(who);
    var dy = centerY(target) - centerY(who);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      who.x += (dx / len) * num(who.speed, 0) * d;
      who.y += (dy / len) * num(who.speed, 0) * d;
      who._facingLeft = dx < 0;
    }
  }
  function drift(who, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    if (who._driftAngle == null) who._driftAngle = Math.random() * Math.PI * 2;
    who._driftTimer = (who._driftTimer || 0) + d;
    if (who._driftTimer >= 2) { who._driftAngle = Math.random() * Math.PI * 2; who._driftTimer = 0; }
    var dx = Math.cos(who._driftAngle);
    who.x += dx * num(who.speed, 0) * d;
    who.y += Math.sin(who._driftAngle) * num(who.speed, 0) * d;
    who._facingLeft = dx < 0;
  }
  function face(who, target) {
    if (!who || !target || typeof who !== 'object' || typeof target !== 'object') return;
    who._facingLeft = centerX(target) < centerX(who);
  }
  // Tiro/velocidade própria: "lançar" mira UMA vez (seta vx/vy pelo vetor
  // normalizado × velocidade — a conta do Projectile de todo jogo); "mover pela
  // velocidade" aplica × dt a cada quadro. Juntos com "Nascer e chamar de"
  // fecham tiro reto E mirado.
  function launchTowards(who, target, speed) {
    if (!who || !target || typeof who !== 'object' || typeof target !== 'object') return;
    var v = num(speed, 400);
    var dx = centerX(target) - centerX(who);
    var dy = centerY(target) - centerY(who);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 0)) { who.vx = v; who.vy = 0; return; }
    who.vx = (dx / len) * v;
    who.vy = (dy / len) * v;
  }
  function moveByVelocity(who, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    who.x = num(who.x, 0) + num(who.vx, 0) * d;
    who.y = num(who.y, 0) + num(who.vy, 0) * d;
  }
  function setAngle(who, degrees) {
    if (!who || typeof who !== 'object') return;
    who._angle = num(degrees, 0);
  }

  // ---- ❤️ Combate (takeDamage + i-frames + knockback do P24) ----
  function trackCombatant(c) {
    if (combatants.indexOf(c) === -1) combatants.push(c);
  }
  function hurt(who, amount, iframes) {
    if (!who || typeof who !== 'object') return;
    if (who._iFrames > 0) return;
    if (who.health == null) who.health = 1;
    who.health = Math.max(0, num(who.health, 0) - num(amount, 0));
    who._iFrames = Math.max(0, num(iframes, 1));
    trackCombatant(who);
  }
  function knockback(who, from, force) {
    if (!who || !from || typeof who !== 'object' || typeof from !== 'object') return;
    var dx = centerX(who) - centerX(from);
    var dy = centerY(who) - centerY(from);
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var f = num(force, 400);
    who._pushX = (dx / len) * f;
    who._pushY = (dy / len) * f;
    trackCombatant(who);
  }
  function drawHealthBar(who, max) {
    if (!ctx2d || !who || typeof who !== 'object') return;
    // 0 (ou vazio) = automático: usa a vida cheia do próprio personagem/molde
    // (P24 usa data.health — assim a barra do molde de vida 20 mostra 20/20).
    var full = num(max, 0);
    if (full <= 0) full = num(who.maxHealth, 100);
    if (full <= 0) return;
    var pct = Math.max(0, Math.min(1, num(who.health, full) / full));
    var x = num(who.x, 0), y = num(who.y, 0) - 8, w = num(who.w, 0);
    ctx2d.fillStyle = 'rgba(0,0,0,0.6)';
    ctx2d.fillRect(x, y, w, 4);
    ctx2d.fillStyle = '#ff5f6d';
    ctx2d.fillRect(x, y, Math.ceil(w * pct), 4);
  }
  function touchCircle(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    var ra = num(a.radius, num(a.w, 0) / 2);
    var rb = num(b.radius, num(b.w, 0) / 2);
    var dx = centerX(a) - centerX(b);
    var dy = centerY(a) - centerY(b);
    return dx * dx + dy * dy < (ra + rb) * (ra + rb);
  }

  // ---- 🥷 Ação em tempo real (Zelda) — golpe na direção + patrulha (Ninja Adventure) ----
  // O golpe cria uma caixa de acerto NA FRENTE do personagem (pela direção que
  // olha) por alguns instantes, com trava de 1 acerto por golpe e por alvo (o
  // hasHitThisSwing do attackBox do Ninja). "o golpe acertou?" pergunta a caixa.
  var swingId = 0;
  var swinging = []; // entidades golpeando agora (p/ decair o tempo do golpe)
  // Caixa de acerto à frente de quem golpeia (pela direção que olha). Escreve num
  // objeto REUSÁVEL (chamado por quadro em didHit/drawEntity) — o chamador usa na
  // hora, nunca guarda a referência, então reciclar é seguro e evita lixo/quadro.
  var swingRect = { x: 0, y: 0, w: 0, h: 0 };
  function swingBox(c) {
    var range = Math.max(1, num(c._swingRange, 40));
    var w = num(c.w, 0), h = num(c.h, 0);
    var x = num(c.x, 0), y = num(c.y, 0);
    var dir = c._facingDir || (c._facingLeft ? 'left' : 'right');
    if (dir === 'left') { swingRect.x = x - range; swingRect.y = y; swingRect.w = range; swingRect.h = h; }
    else if (dir === 'up') { swingRect.x = x; swingRect.y = y - range; swingRect.w = w; swingRect.h = range; }
    else if (dir === 'down') { swingRect.x = x; swingRect.y = y + h; swingRect.w = w; swingRect.h = range; }
    else { swingRect.x = x + w; swingRect.y = y; swingRect.w = range; swingRect.h = h; } // right
    return swingRect;
  }
  function attackFacing(who, range, duration) {
    if (!who || typeof who !== 'object') return;
    if (num(who._swingT, 0) > 0) return; // já golpeando: espera o golpe acabar
    who._swingRange = Math.max(1, num(range, 40));
    who._swingT = Math.max(0.05, num(duration, 0.3));
    who._swingId = ++swingId; // marca este golpe (trava de 1 acerto por alvo)
    if (swinging.indexOf(who) === -1) swinging.push(who);
  }
  function stepSwings(dt) {
    for (var i = swinging.length - 1; i >= 0; i--) {
      var w = swinging[i];
      w._swingT = num(w._swingT, 0) - dt;
      if (w._swingT <= 0) { w._swingT = 0; swinging.splice(i, 1); }
    }
  }
  function didHit(who, target) {
    if (!who || !target || typeof who !== 'object' || typeof target !== 'object') return false;
    if (!(num(who._swingT, 0) > 0)) return false; // não está golpeando
    if (!touching(swingBox(who), target)) return false;
    if (target._hitBySwing === who._swingId) return false; // já acertou neste golpe
    target._hitBySwing = who._swingId;
    return true;
  }
  // Inimigo que patrulha/vagueia em ANEL em volta do posto (Monster.setVelocity):
  // escolhe um ponto aleatório dentro do raio da origem e vai até ele; ao chegar
  // (ou de tempos em tempos) escolhe outro. Fica sempre por perto do posto.
  function patrolAround(who, ox, oy, radius) {
    if (!who || typeof who !== 'object') return;
    var d = currentDt;
    var r = Math.max(1, num(radius, 80));
    var homeX = num(ox, centerX(who)), homeY = num(oy, centerY(who));
    who._patrolTimer = num(who._patrolTimer, 0) - d;
    var needTarget = who._patrolTX == null || who._patrolTimer <= 0;
    if (!needTarget) {
      var ddx = who._patrolTX - centerX(who);
      var ddy = who._patrolTY - centerY(who);
      if (ddx * ddx + ddy * ddy < 16) needTarget = true; // chegou pertinho
    }
    if (needTarget) {
      var a = Math.random() * Math.PI * 2;
      var dist = Math.sqrt(Math.random()) * r; // distribuição uniforme no disco
      who._patrolTX = homeX + Math.cos(a) * dist;
      who._patrolTY = homeY + Math.sin(a) * dist;
      who._patrolTimer = 1 + Math.random() * 1.5;
    }
    var dx = who._patrolTX - centerX(who);
    var dy = who._patrolTY - centerY(who);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.5) {
      var sp = num(who.speed, 60);
      who.x = num(who.x, 0) + (dx / len) * sp * d;
      who.y = num(who.y, 0) + (dy / len) * sp * d;
      if (Math.abs(dx) >= Math.abs(dy)) { who._facingDir = dx < 0 ? 'left' : 'right'; }
      else { who._facingDir = dy < 0 ? 'up' : 'down'; }
      who._facingLeft = (who._facingDir === 'left');
    }
  }
  // ❤️ HUD de corações (cheios/vazios) — o Heart.js do Ninja. Alternativa
  // "de vidinha" à barra contínua: fica ótimo preso na tela (HUD).
  function heartPath(cx, cy, s) {
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy + s * 0.3);
    ctx2d.lineTo(cx - s * 0.5, cy - s * 0.15);
    ctx2d.arc(cx - s * 0.25, cy - s * 0.15, s * 0.25, Math.PI, 0);
    ctx2d.arc(cx + s * 0.25, cy - s * 0.15, s * 0.25, Math.PI, 0);
    ctx2d.lineTo(cx, cy + s * 0.3);
    ctx2d.closePath();
  }
  function drawHearts(x, y, current, max) {
    if (!ctx2d) return;
    var total = Math.max(0, Math.floor(num(max, 3)));
    var cur = Math.max(0, Math.min(total, Math.floor(num(current, 0))));
    var s = 22, gap = 6, bx = num(x, 20), by = num(y, 20);
    for (var i = 0; i < total; i++) {
      var cx = bx + i * (s + gap) + s / 2;
      var cy = by + s / 2;
      heartPath(cx, cy, s);
      if (i < cur) { ctx2d.fillStyle = '#ff5f6d'; ctx2d.fill(); }
      else { ctx2d.fillStyle = 'rgba(0,0,0,0.35)'; ctx2d.fill(); }
      ctx2d.strokeStyle = 'white'; ctx2d.lineWidth = 2; ctx2d.stroke();
    }
  }

  // ---- ✨ Faíscas (partículas data-driven pooled — o vídeo dos efeitos) ----
  function defineEffect(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o efeito" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    effects[k] = {
      count: Math.max(0, Math.min(200, Math.floor(num(o.count, 16)))),
      color: text(o.color, '#ffd166'),
      size: num(o.size, 4),
      life: num(o.life, 0.6),
      speed: num(o.speed, 200),
      gravity: num(o.gravity, 300)
    };
  }
  var MAX_PARTICLES = 1000;
  function burst(name, x, y) {
    var e = effects[text(name, '')];
    if (!e) { warnOnce('effect:' + text(name, ''), 'efeito "' + text(name, '') + '" não existe — crie com "Criar o efeito"'); return; }
    for (var i = 0; i < e.count; i++) {
      // Teto GLOBAL: burst por quadro sem gate não acumula milhares de fillRect.
      if (particles.active.length >= MAX_PARTICLES) break;
      var p = particles.free.pop() || {};
      var ang = Math.random() * Math.PI * 2;
      var sp = e.speed * (0.4 + Math.random() * 0.6);
      p.x = num(x, 0); p.y = num(y, 0);
      p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
      p.life = e.life; p.max = e.life; p.size = e.size; p.color = e.color; p.gravity = e.gravity;
      particles.active.push(p);
    }
  }
  function drawEffects() {
    if (!ctx2d) return;
    // Fora de 'jogando' as faíscas CONGELAM (a pausa não atualiza nada — kit).
    var dt = (state === 'jogando') ? currentDt : 0;
    for (var i = particles.active.length - 1; i >= 0; i--) {
      var p = particles.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        // swap-com-o-último + pop: remoção O(1) (morte em massa não vira O(n²)).
        var last = particles.active.length - 1;
        particles.active[i] = particles.active[last];
        particles.active.pop();
        particles.free.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      var prev = 1;
      try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = Math.max(0, p.life / p.max); } catch (e) {}
      ctx2d.fillStyle = p.color;
      ctx2d.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      try { ctx2d.globalAlpha = prev; } catch (e) {}
    }
  }

  // ---- 🎨 Aparências (looks) ----
  function defineLook(name, fn, baseW, baseH) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    // Tamanho-base do quadro autoral: drawEntity/drawLook ESCALAM a partir dele.
    looks[k] = {
      fn: fn,
      baseW: Math.max(1, num(baseW, 40)),
      baseH: Math.max(1, num(baseH, 40))
    };
  }
  function drawLook(name, x, y, w, h) {
    if (!ctx2d) return;
    var look = looks[text(name, '')];
    if (!look || typeof look.fn !== 'function') return;
    ctx2d.save();
    ctx2d.translate(num(x, 0), num(y, 0));
    try {
      ctx2d.scale(num(w, look.baseW) / look.baseW, num(h, look.baseH) / look.baseH);
      look.fn(ctx2d);
    } catch (e) {}
    ctx2d.restore();
  }

  // ---- 🖥️ HUD & Missão ----
  /** Barra genérica (vida grande, mana, progresso): fundo + preenchimento + contorno. */
  function drawBar(current, max, x, y, w, h, color) {
    if (!ctx2d) return;
    var m = num(max, 100);
    if (!(m > 0)) m = 100;
    var frac = Math.max(0, Math.min(1, num(current, 0) / m));
    var bx = num(x, 20);
    var by = num(y, 20);
    var bw = Math.max(1, num(w, 200));
    var bh = Math.max(1, num(h, 16));
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx2d.fillRect(bx, by, bw, bh);
    ctx2d.fillStyle = text(color, config.accent);
    ctx2d.fillRect(bx, by, bw * frac, bh);
    ctx2d.strokeStyle = 'white';
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(bx, by, bw, bh);
    ctx2d.restore();
  }
  function drawTimer(x, y) {
    if (!ctx2d) return;
    var mins = Math.floor(playTime / 60);
    var secs = Math.floor(playTime % 60);
    var label = mins + ':' + (secs < 10 ? '0' + secs : '' + secs);
    ctx2d.save();
    ctx2d.fillStyle = config.accent;
    ctx2d.font = '28px "Courier New", monospace';
    try { ctx2d.textAlign = 'left'; } catch (e) {}
    ctx2d.fillText(label, num(x, 20), num(y, 40));
    ctx2d.restore();
  }

  // ---- 🧙 Kit RPG (Canvas RPG Kit do Drew Conley, simplificado p/ blocos) ----
  // Grade + paredes (grid.js/moveTowards), NPC + fala typewriter
  // (SpriteTextString), flags de história (StoryFlags), inventário, mapas com
  // portas (Levels/Exits) e batalha por turnos com menu PRONTO do motor.
  var rpg = {
    cellSize: 64,
    walls: {},            // 'cx,cy' -> true (ocupação do mapa CORRENTE: terreno + NPCs)
    terrain: {},          // 'cx,cy' -> true SÓ do terreno fixo (block_cell/tilemap) —
                          // o NPC nunca "libera" essas ao andar (senão furava o mapa)
    npcs: {},             // nome -> entidade (sólida na grade)
    npcTalk: {},          // nome -> [fns do "quando conversar"]
    doors: {},            // 'cx,cy' -> nome do mapa
    stepHandlers: {},     // 'cx,cy' -> [fns do "quando pisar" — footstep cutscenes]
    flags: {},            // StoryFlags: nome -> true
    items: [],            // inventário: {name, image}
    maps: {},             // nome -> [fns de montagem]
    mapOrder: [],         // ordem de registro (o 1º é o mapa inicial)
    currentMap: '',
    hero: null,           // quem usa a grade (a fala/porta/NPC olham ele)
    dialog: null,         // {queue, text, name, start}
    battle: null,         // {name, hp, max, str, def, defending, poison}
    // Atributos do herói na batalha (Combatant do Pizza): vida/força/defesa + XP/
    // nível + energia (mana p/ o golpe especial). base* = valores iniciais (o
    // "Recomeçar" volta a eles); os correntes sobem com o nível.
    playerHp: 30, playerMax: 30, playerStr: 7, playerDef: 0,
    baseMax: 30, baseStr: 7, baseDef: 0,
    playerXp: 0, playerLevel: 1, playerMaxXp: 20,
    playerEnergy: 10, playerMaxEnergy: 10, playerPoison: 0,
    special: null,        // {name, dmg, cost} — golpe especial que gasta energia
    potions: [],          // [{name, heal}] — poções usáveis na luta (empilham)
    battleWon: false,
    onBattleEnd: [],
    // 🎬 Motor de cena (cutscene) por GRAVAÇÃO: o container liga recording,
    // roda o corpo (cada passo se ENFILEIRA), e a fila toca com esperas.
    recording: false,     // enfileirando os passos do corpo da cena?
    sceneSteps: [],       // fila em montagem enquanto grava
    scene: null,          // {steps, i} tocando; herói TRAVADO enquanto ≠ null
    fade: 0,              // transição de cena: preto por cima decaindo (1 -> 0)
    // 💬 Menu de escolha (KeyboardMenu do Pizza) no canvas: ↑/↓/espaço + clique.
    menu: null,           // {title, options:[{label, fn}], index} — herói TRAVADO
    menuBuilding: null,   // coletando as opções (montagem do menu)
    menuRects: []         // retângulos das opções p/ o clique (recalculado no draw)
  };
  var SAVE_KEY = 'szgk-rpg-save'; // localStorage do preview (persiste por projeto)
  var DIALOG_CPS = 30; // velocidade do typewriter (chars/segundo)
  var DIR_ROW = { down: 0, up: 1, left: 2, right: 3 }; // linha da folha por direção

  function cellKey(cx, cy) { return Math.round(num(cx, 0)) + ',' + Math.round(num(cy, 0)); }
  function rpgBlockCell(cx, cy) { var k = cellKey(cx, cy); rpg.walls[k] = true; rpg.terrain[k] = true; }
  function rpgCellPx(n) { return num(n, 0) * rpg.cellSize; }

  /** Recomeço de partida: a HISTÓRIA zera (flags/itens/batalha) e volta ao 1º mapa. */
  function rpgNewGame() {
    rpg.flags = {};
    rpg.items = [];
    rpg.dialog = null;
    rpg.battle = null;
    rpg.battleWon = false;
    // Volta os atributos ao BASE (o "Recomeçar" reinicia a progressão).
    rpg.playerLevel = 1; rpg.playerXp = 0; rpg.playerMaxXp = 20;
    rpg.playerMax = rpg.baseMax; rpg.playerStr = rpg.baseStr; rpg.playerDef = rpg.baseDef;
    rpg.playerHp = rpg.playerMax;
    rpg.playerEnergy = rpg.playerMaxEnergy; rpg.playerPoison = 0;
    rpg.potions = [];
    rpg.scene = null;
    rpg.recording = false;
    rpg.sceneSteps = [];
    rpg.fade = 0;
    rpg.menu = null;
    rpg.menuBuilding = null;
    if (rpg.mapOrder.length > 0) rpgGoMap(rpg.mapOrder[0]);
  }

  function rpgCreateNpc(name, cx, cy, image, look) {
    var k = text(name, '');
    if (!k) { warn('"Criar o NPC" precisa de um nome'); return; }
    var s = rpg.cellSize;
    rpg.npcs[k] = {
      name: k,
      x: Math.round(num(cx, 0)) * s, y: Math.round(num(cy, 0)) * s,
      w: s, h: s,
      image: text(image, ''), look: text(look, ''), color: '#a78bfa',
      // Anda como o herói: destino na grade, direção, velocidade e patrulha.
      speed: s * 2.4, _gridDest: null, _walkTarget: null, _wander: false, _wanderT: 0,
      _iFrames: 0, _facingLeft: false, _facingDir: 'down', _angle: 0,
      _sheetImg: '', _sheetFw: 0, _sheetFh: 0,
      _animFrom: 0, _animTo: 0, _animFps: 0, _animStart: 0,
      _walkImg: '', _walkFw: 0, _walkFh: 0, _walkFrames: 0, _walkFps: 6,
      _lastX: 0, _lastY: 0, _moving: false,
      _reservedCell: cellKey(cx, cy) // a célula que ESTE NPC ocupa (p/ só ele liberar)
    };
    rpg.walls[cellKey(cx, cy)] = true; // sólido: bloqueia a grade
  }
  function rpgDrawNpcs() { for (var k in rpg.npcs) drawEntity(rpg.npcs[k]); }
  function npcAtCell(cx, cy) {
    var s = rpg.cellSize;
    for (var k in rpg.npcs) {
      var n = rpg.npcs[k];
      if (Math.round(n.x / s) === cx && Math.round(n.y / s) === cy) return n;
    }
    return null;
  }
  function rpgOnTalk(name, fn) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    (rpg.npcTalk[k] || (rpg.npcTalk[k] = [])).push(fn);
  }

  // Fala com typewriter: trava o herói; Espaço completa/avança/fecha.
  function rpgSay(textStr, speaker) {
    // Dentro de uma cena (gravando), a fala vira um PASSO da fila (toca na vez).
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'say', text: text(textStr, ''), speaker: text(speaker, '') }); return; }
    var entry = { text: text(textStr, ''), name: text(speaker, '') };
    if (!entry.text) return;
    if (rpg.dialog) { rpg.dialog.queue.push(entry); return; }
    rpg.dialog = { queue: [], text: entry.text, name: entry.name, start: playTime };
  }
  function advanceDialog() {
    var d = rpg.dialog;
    if (!d) return;
    var shown = Math.floor(Math.max(0, playTime - d.start) * DIALOG_CPS);
    if (shown < d.text.length) {
      // Ainda digitando: o Espaço COMPLETA a linha (pular a espera).
      d.start = playTime - d.text.length / DIALOG_CPS;
      return;
    }
    var next = d.queue.shift();
    if (next) { d.text = next.text; d.name = next.name; d.start = playTime; }
    else { rpg.dialog = null; emit('fala:terminada'); }
  }
  function drawDialog() {
    if (!ctx2d || !rpg.dialog) return;
    var d = rpg.dialog;
    var margin = 20;
    var boxH = 110;
    var bx = margin;
    var by = config.h - boxH - margin;
    var bw = config.w - margin * 2;
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx2d.fillRect(bx, by, bw, boxH);
    ctx2d.strokeStyle = config.accent;
    ctx2d.lineWidth = 3;
    ctx2d.strokeRect(bx, by, bw, boxH);
    var shown = Math.floor(Math.max(0, playTime - d.start) * DIALOG_CPS);
    var visible = d.text.slice(0, shown);
    var ty = by + 30;
    ctx2d.font = 'bold 18px "Courier New", monospace';
    ctx2d.fillStyle = config.accent;
    if (d.name) { ctx2d.fillText(d.name, bx + 16, ty); ty += 26; }
    ctx2d.font = '18px "Courier New", monospace';
    ctx2d.fillStyle = '#ffffff';
    // Quebra por PALAVRA (Courier ~11px/char a 18px): não parte a palavra no meio.
    var perLine = Math.max(10, Math.floor((bw - 32) / 11));
    var words = visible.split(' ');
    var line = '';
    for (var wi = 0; wi < words.length; wi++) {
      var tryLine = line ? line + ' ' + words[wi] : words[wi];
      if (tryLine.length > perLine && line) {
        ctx2d.fillText(line, bx + 16, ty); ty += 24; line = words[wi];
      } else { line = tryLine; }
    }
    if (line) ctx2d.fillText(line, bx + 16, ty);
    if (shown >= d.text.length) {
      ctx2d.fillStyle = config.accent;
      ctx2d.fillText('[espaço]', bx + bw - 110, by + boxH - 12);
    }
    ctx2d.restore();
  }

  // Movimento em grade (moveTowards + destino + paredes do RPG kit). O herói é
  // quem chama; o Espaço conversa com o NPC à frente; chegar numa porta troca o mapa.
  function rpgMoveGrid(c, cellPx, dt) {
    if (!c || typeof c !== 'object') return;
    var s = Math.max(8, num(cellPx, rpg.cellSize));
    rpg.cellSize = s;
    rpg.hero = c;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    // Menu de escolha aberto: ↑/↓ navegam, espaço/enter escolhe. Herói TRAVADO.
    if (rpg.menu) {
      var mo = rpg.menu.options;
      if (justPressed.arrowup || justPressed.w) rpg.menu.index = (rpg.menu.index - 1 + mo.length) % mo.length;
      if (justPressed.arrowdown || justPressed.s) rpg.menu.index = (rpg.menu.index + 1) % mo.length;
      if (justPressed[' '] || justPressed.enter) selectMenu();
      return;
    }
    if (justPressed[' ']) {
      if (rpg.dialog) {
        advanceDialog();
      } else if (!rpg.battle && !rpg.scene && c._gridDest == null) {
        var fcx = Math.round(num(c.x, 0) / s);
        var fcy = Math.round(num(c.y, 0) / s);
        var dir = c._facingDir || 'down';
        if (dir === 'left') fcx -= 1;
        else if (dir === 'right') fcx += 1;
        else if (dir === 'up') fcy -= 1;
        else fcy += 1;
        var npc = npcAtCell(fcx, fcy);
        if (npc) {
          npc._facingDir = oppositeDir(dir); // o NPC vira para o herói (faceHero)
          npc._facingLeft = (npc._facingDir === 'left');
          var fns = rpg.npcTalk[npc.name] || [];
          for (var i = 0; i < fns.length; i++) {
            try { fns[i](); } catch (e) { warn('erro no "quando conversar com ' + npc.name + '": ' + e); }
          }
        }
      }
    }
    // Fala/batalha/CENA aberta: herói TRAVADO (como o RPG kit trava no diálogo).
    if (rpg.dialog || rpg.battle || rpg.scene) return;
    if (c._gridDest == null) {
      var dx = 0;
      var dy = 0;
      if (keys.a || keys.arrowleft) { dx = -1; c._facingLeft = true; c._facingDir = 'left'; }
      else if (keys.d || keys.arrowright) { dx = 1; c._facingLeft = false; c._facingDir = 'right'; }
      else if (keys.w || keys.arrowup) { dy = -1; c._facingDir = 'up'; }
      else if (keys.s || keys.arrowdown) { dy = 1; c._facingDir = 'down'; }
      if (!dx && !dy) return;
      var cx = Math.round(num(c.x, 0) / s);
      var cy = Math.round(num(c.y, 0) / s);
      var nx = cx + dx;
      var ny = cy + dy;
      if (rpg.walls[nx + ',' + ny]) return; // parede/NPC: só virou de lado
      c._gridDest = { x: nx * s, y: ny * s };
    }
    // moveTowards: anda passo a passo até ENCAIXAR na célula (nunca passa).
    var step = Math.max(1, num(c.speed, 200)) * d;
    var gx = c._gridDest.x - num(c.x, 0);
    var gy = c._gridDest.y - num(c.y, 0);
    var dist = Math.sqrt(gx * gx + gy * gy);
    if (dist <= step) {
      c.x = c._gridDest.x;
      c.y = c._gridDest.y;
      c._gridDest = null;
      var dk = Math.round(c.x / s) + ',' + Math.round(c.y / s);
      // Gatilho ao PISAR (footstep cutscene) ANTES da porta: encontro/armadilha/cena.
      var steppers = rpg.stepHandlers[dk];
      if (steppers) {
        for (var si = 0; si < steppers.length; si++) {
          try { steppers[si](); } catch (e) { warn('erro no "quando pisar na célula": ' + e); }
        }
      }
      if (rpg.doors[dk]) rpgGoMap(rpg.doors[dk]);
    } else {
      c.x += (gx / dist) * step;
      c.y += (gy / dist) * step;
    }
  }
  function oppositeDir(d) {
    return d === 'left' ? 'right' : d === 'right' ? 'left' : d === 'up' ? 'down' : 'up';
  }

  // Flags de história (StoryFlags) + inventário.
  function rpgAddFlag(name) {
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'flag', name: text(name, '') }); return; }
    var k = text(name, '');
    if (k) rpg.flags[k] = true;
  }
  function rpgHasFlag(name) { return rpg.flags[text(name, '')] === true; }
  function rpgGiveItem(name, image) {
    var k = text(name, '');
    if (!k) return;
    if (rpgHasItem(k)) return; // sem duplicar
    rpg.items.push({ name: k, image: text(image, '') });
  }
  function rpgHasItem(name) {
    var k = text(name, '');
    for (var i = 0; i < rpg.items.length; i++) if (rpg.items[i].name === k) return true;
    return false;
  }
  function rpgRemoveItem(name) {
    var k = text(name, '');
    for (var i = rpg.items.length - 1; i >= 0; i--) {
      if (rpg.items[i].name === k) rpg.items.splice(i, 1);
    }
  }
  function rpgDrawInventory(x, y) {
    if (!ctx2d) return;
    var size = 40;
    var bx = num(x, 20);
    var by = num(y, 20);
    ctx2d.save();
    for (var i = 0; i < rpg.items.length; i++) {
      var it = rpg.items[i];
      var ix = bx + i * (size + 8);
      ctx2d.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx2d.fillRect(ix, by, size, size);
      var entry = it.image ? images[it.image] : null;
      if (entry && entry.loaded && entry.img) {
        try { ctx2d.drawImage(entry.img, ix + 4, by + 4, size - 8, size - 8); } catch (e) {}
      } else {
        ctx2d.fillStyle = config.accent;
        ctx2d.font = 'bold 20px "Courier New", monospace';
        ctx2d.fillText(it.name.slice(0, 1).toUpperCase(), ix + 13, by + 28);
      }
      ctx2d.strokeStyle = config.accent;
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(ix, by, size, size);
    }
    ctx2d.restore();
  }

  // Mapas: trocar LIMPA paredes/NPCs/portas e roda a montagem do destino.
  function rpgOnMap(name, fn) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    if (!rpg.maps[k]) {
      rpg.maps[k] = [];
      rpg.mapOrder.push(k);
    }
    rpg.maps[k].push(fn);
  }
  function rpgGoMap(name) {
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'goMap', name: text(name, '') }); return; }
    var k = text(name, '');
    if (!k) return;
    rpg.walls = {};
    rpg.terrain = {};
    rpg.npcs = {};
    rpg.doors = {};
    rpg.stepHandlers = {};   // gatilhos de pisar são por-mapa (montados de novo)
    if (rpg.hero) rpg.hero._gridDest = null;
    rpg.currentMap = k;
    var hooks = rpg.maps[k];
    if (!hooks) {
      warn('o mapa "' + k + '" não existe — monte-o com "Quando chegar no mapa"');
    } else {
      for (var i = 0; i < hooks.length; i++) {
        try { hooks[i](); } catch (e) { warn('erro ao montar o mapa "' + k + '": ' + e); }
      }
    }
    rpg.fade = 1; // transição: o mapa novo aparece surgindo do preto (SceneTransition)
    emit('mapa:' + k);
  }
  function rpgCreateDoor(cx, cy, map) {
    var k = text(map, '');
    if (!k) return;
    rpg.doors[cellKey(cx, cy)] = k;
  }
  // Gatilho ao PISAR numa célula (footstep cutscene do Pizza): roda quando o herói
  // ENCAIXA nessa célula. Encontros aleatórios, armadilhas, cenas automáticas.
  function rpgOnStep(cx, cy, fn) {
    if (typeof fn !== 'function') return;
    var kk = cellKey(cx, cy);
    (rpg.stepHandlers[kk] || (rpg.stepHandlers[kk] = [])).push(fn);
  }

  // ---- 🎬 Motor de cena (cutscene) + NPCs que andam ----

  var FACE_DIRS = { down: 1, up: 1, left: 1, right: 1 };
  /** Vira um personagem (herói ou NPC) para uma direção nomeada. */
  function rpgFace(who, dir) {
    var d = text(dir, 'down');
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'face', who: who, dir: d }); return; }
    var c = resolveActor(who);
    if (!c || !FACE_DIRS[d]) return;
    c._facingDir = d;
    c._facingLeft = (d === 'left');
  }
  /** who pode ser o objeto-personagem OU o NOME de um NPC. */
  function resolveActor(who) {
    if (who && typeof who === 'object') return who;
    var nm = text(who, '');
    return nm ? rpg.npcs[nm] : null;
  }
  /** Faz um NPC caminhar (célula a célula) até a célula-alvo, desviando de paredes. */
  function rpgNpcWalkTo(npcName, cx, cy) {
    var nm = text(npcName, '');
    var tx = Math.round(num(cx, 0));
    var ty = Math.round(num(cy, 0));
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'npcWalk', npc: nm, cx: tx, cy: ty }); return; }
    var n = rpg.npcs[nm];
    if (!n) { warn('o NPC "' + nm + '" não existe neste mapa'); return; }
    n._walkTarget = { cx: tx, cy: ty };
  }
  /** NPC vagueia por células vizinhas livres (vida de vila). */
  function rpgNpcWander(npcName) {
    var n = rpg.npcs[text(npcName, '')];
    if (n) n._wander = true;
  }
  /** Passo de cena "esperar N segundos" — só faz sentido gravando. */
  function rpgWait(seconds) {
    if (rpg.recording) rpg.sceneSteps.push({ type: 'wait', seconds: Math.max(0, num(seconds, 1)) });
  }
  /**
   * Cutscene por GRAVAÇÃO: liga recording, roda o corpo (cada passo se ENFILEIRA
   * em vez de executar), desliga, e toca a fila com esperas. Espelha o
   * OverworldMap.startCutscene + OverworldEvent (uma Promise por passo).
   */
  function rpgCutscene(fn) {
    if (typeof fn !== 'function') return;
    if (rpg.scene || rpg.recording) { warn('uma cena já está tocando — espere ela acabar'); return; }
    rpg.recording = true;
    rpg.sceneSteps = [];
    try { fn(); } catch (e) { warn('erro ao montar a cena: ' + e); }
    rpg.recording = false;
    if (rpg.sceneSteps.length > 0) rpg.scene = { steps: rpg.sceneSteps, i: 0 };
    rpg.sceneSteps = [];
  }
  /** Começa o passo corrente da cena (chama a função pública com recording OFF). */
  function startSceneStep() {
    var st = rpg.scene.steps[rpg.scene.i];
    if (!st) { rpg.scene = null; return; }
    st._started = true;
    st._instant = false;
    if (st.type === 'say') rpgSay(st.text, st.speaker);
    else if (st.type === 'wait') st._t = 0;
    else if (st.type === 'npcWalk') { rpgNpcWalkTo(st.npc, st.cx, st.cy); st._t = 0; }
    else if (st.type === 'face') { rpgFace(st.who, st.dir); st._instant = true; }
    else if (st.type === 'flag') { rpgAddFlag(st.name); st._instant = true; }
    else if (st.type === 'goMap') { rpgGoMap(st.name); st._instant = true; }
    else if (st.type === 'battle') rpgBattleStart(st.name, st.hp, st.str, st.def);
    else if (st.type === 'menu') {
      if (st.options.length > 0) rpg.menu = { title: st.title, options: st.options, index: 0 };
      else st._instant = true;
    }
    else st._instant = true;
  }
  /** O passo corrente terminou? (fala fechada / timer / NPC chegou / batalha/menu). */
  function sceneStepDone(st, dt) {
    if (st._instant) return true;
    if (st.type === 'say') return rpg.dialog == null;
    if (st.type === 'wait') { st._t = num(st._t, 0) + dt; return st._t >= st.seconds; }
    if (st.type === 'npcWalk') {
      var n = rpg.npcs[st.npc];
      if (!n) return true;
      // Trava de segurança: caminho em L bloqueado por parede não pode pendurar a
      // cena (e travar o herói) para sempre — desiste depois de 6 s.
      st._t = num(st._t, 0) + dt;
      if (st._t > 6) return true;
      var s = rpg.cellSize;
      return n._gridDest == null && n._walkTarget == null &&
        Math.round(n.x / s) === st.cx && Math.round(n.y / s) === st.cy;
    }
    if (st.type === 'battle') return rpg.battle == null;
    if (st.type === 'menu') return rpg.menu == null;
    return true;
  }

  /** Uma célula está OCUPADA (parede/NPC/herói) — reserva de intenção do Pizza. */
  function cellOccupied(cx, cy) {
    if (rpg.walls[cx + ',' + cy]) return true;
    var s = rpg.cellSize;
    if (rpg.hero) {
      if (Math.round(rpg.hero.x / s) === cx && Math.round(rpg.hero.y / s) === cy) return true;
      if (rpg.hero._gridDest) {
        if (Math.round(rpg.hero._gridDest.x / s) === cx && Math.round(rpg.hero._gridDest.y / s) === cy) return true;
      }
    }
    return false;
  }
  /** Move 1 NPC por quadro: destino da grade (moveTowards) + patrulha/andar-para. */
  function moveNpc(n, dt) {
    var s = rpg.cellSize;
    if (n._gridDest == null) {
      var cx = Math.round(num(n.x, 0) / s);
      var cy = Math.round(num(n.y, 0) / s);
      var dx = 0;
      var dy = 0;
      if (n._walkTarget) {
        var tx = n._walkTarget.cx;
        var ty = n._walkTarget.cy;
        if (cx === tx && cy === ty) { n._walkTarget = null; return; }
        // Reduz primeiro o eixo maior (caminho simples em L — basta p/ cenas).
        if (cx !== tx) dx = tx > cx ? 1 : -1;
        else dy = ty > cy ? 1 : -1;
      } else if (n._wander) {
        n._wanderT = num(n._wanderT, 0) - dt;
        if (n._wanderT > 0) return;
        n._wanderT = 1 + Math.random() * 2;
        var pick = Math.floor(Math.random() * 4);
        dx = pick === 0 ? 1 : pick === 1 ? -1 : 0;
        dy = pick === 2 ? 1 : pick === 3 ? -1 : 0;
        if (!dx && !dy) return;
      } else return;
      var nx = cx + dx;
      var ny = cy + dy;
      if (cellOccupied(nx, ny)) return; // bloqueado (parede/NPC/herói): espera
      // Reserva de intenção: libera SÓ a célula que ESTE NPC reservou (nunca uma
      // parede de terreno) e reserva a de destino ENQUANTO anda (o herói e outros
      // NPCs veem o NPC ocupando o destino).
      if (n._reservedCell && !rpg.terrain[n._reservedCell]) delete rpg.walls[n._reservedCell];
      rpg.walls[nx + ',' + ny] = true;
      n._reservedCell = nx + ',' + ny;
      n._facingDir = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
      n._facingLeft = (n._facingDir === 'left');
      n._gridDest = { x: nx * s, y: ny * s };
    }
    var step = Math.max(1, num(n.speed, s * 2.4)) * dt;
    var gx = n._gridDest.x - num(n.x, 0);
    var gy = n._gridDest.y - num(n.y, 0);
    var dist = Math.sqrt(gx * gx + gy * gy);
    if (dist <= step) { n.x = n._gridDest.x; n.y = n._gridDest.y; n._gridDest = null; }
    else { n.x += (gx / dist) * step; n.y += (gy / dist) * step; }
  }
  /** Toca a fila da cena: começa o passo, e passos INSTANTÂNEOS encadeiam no mesmo
   * quadro (o "flag" entre duas falas não custa um quadro à toa). */
  function advanceScene(dt) {
    var guard = 0;
    while (rpg.scene && guard++ < 128) {
      var st = rpg.scene.steps[rpg.scene.i];
      if (!st) { rpg.scene = null; return; }
      if (!st._started) startSceneStep();
      if (!sceneStepDone(st, dt)) return; // ainda tocando: espera o próximo quadro
      rpg.scene.i += 1;
      if (rpg.scene.i >= rpg.scene.steps.length) { rpg.scene = null; return; }
      dt = 0; // os próximos passos deste quadro não consomem mais tempo
    }
  }
  /** Sistemas do RPG por quadro (só em 'jogando'): NPCs, cena e transição. */
  function stepRpg(dt) {
    for (var k in rpg.npcs) moveNpc(rpg.npcs[k], dt);
    if (rpg.scene) advanceScene(dt);
    if (rpg.fade > 0) rpg.fade = Math.max(0, rpg.fade - dt * 2.5); // fade-in ~0.4s
  }

  // ---- 💬 Menu de escolha (KeyboardMenu do Pizza, no canvas) ----

  /** Coleta as opções do corpo do menu (cada "Opção" empilha {label, fn}). */
  function collectMenuOptions(fn) {
    var prev = rpg.menuBuilding;
    rpg.menuBuilding = [];
    try { fn(); } catch (e) { warn('erro ao montar o menu: ' + e); }
    var opts = rpg.menuBuilding;
    rpg.menuBuilding = prev;
    return opts;
  }
  function rpgOption(label, fn) {
    if (!rpg.menuBuilding) { warn('"Opção" só vale DENTRO de "Menu de escolha"'); return; }
    rpg.menuBuilding.push({ label: text(label, 'Opção'), fn: (typeof fn === 'function' ? fn : function () {}) });
  }
  function rpgMenu(title, fn) {
    if (typeof fn !== 'function') return;
    // Dentro de uma cena: vira um PASSO (as opções ficam guardadas p/ tocar na vez).
    if (rpg.recording) {
      rpg.sceneSteps.push({ type: 'menu', title: text(title, ''), options: collectMenuOptions(fn) });
      return;
    }
    var opts = collectMenuOptions(fn);
    if (opts.length > 0) rpg.menu = { title: text(title, ''), options: opts, index: 0 };
  }
  /** Escolhe a opção destacada: roda o corpo dela e fecha o menu. */
  function selectMenu() {
    var m = rpg.menu;
    if (!m) return;
    var opt = m.options[m.index];
    rpg.menu = null; // fecha ANTES de rodar (a opção pode abrir fala/outro menu)
    if (opt) { try { opt.fn(); } catch (e) { warn('erro na opção "' + opt.label + '": ' + e); } }
    emit('menu:escolha');
  }
  function drawMenu() {
    if (!ctx2d || !rpg.menu) return;
    var m = rpg.menu;
    var pad = 16;
    var lineH = 34;
    var bw = Math.min(config.w - 40, 420);
    var titleH = m.title ? 34 : 8;
    var bh = titleH + m.options.length * lineH + pad;
    var bx = (config.w - bw) / 2;
    var by = (config.h - bh) / 2;
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx2d.fillRect(bx, by, bw, bh);
    ctx2d.strokeStyle = config.accent;
    ctx2d.lineWidth = 3;
    ctx2d.strokeRect(bx, by, bw, bh);
    var ty = by + pad;
    if (m.title) {
      ctx2d.font = 'bold 18px "Courier New", monospace';
      ctx2d.fillStyle = config.accent;
      ctx2d.fillText(m.title, bx + pad, ty + 14);
      ty += titleH;
    }
    rpg.menuRects = [];
    ctx2d.font = '18px "Courier New", monospace';
    for (var i = 0; i < m.options.length; i++) {
      var oy = ty + i * lineH;
      var sel = (i === m.index);
      if (sel) {
        ctx2d.fillStyle = config.accent;
        ctx2d.fillRect(bx + 8, oy, bw - 16, lineH - 6);
      }
      ctx2d.fillStyle = sel ? '#101020' : '#ffffff';
      ctx2d.fillText((sel ? '> ' : '  ') + m.options[i].label, bx + pad, oy + 20);
      rpg.menuRects.push({ x: bx + 8, y: oy, w: bw - 16, h: lineH - 6, index: i });
    }
    ctx2d.restore();
  }

  // ---- 💾 Salvar / Continuar (Progress do Pizza, via localStorage do preview) ----
  function rpgSave() {
    try {
      var s = rpg.cellSize;
      var data = {
        flags: rpg.flags, items: rpg.items, map: rpg.currentMap,
        hx: rpg.hero ? Math.round(num(rpg.hero.x, 0) / s) : 0,
        hy: rpg.hero ? Math.round(num(rpg.hero.y, 0) / s) : 0,
        hp: rpg.playerHp, max: rpg.playerMax, str: rpg.playerStr, def: rpg.playerDef,
        lvl: rpg.playerLevel, xp: rpg.playerXp, maxXp: rpg.playerMaxXp
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { warn('não consegui salvar o jogo: ' + e); }
  }
  function rpgHasSave() {
    try { return !!window.localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }
  function rpgLoad() {
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) { warn('não há jogo salvo'); return; }
      var data = JSON.parse(raw) || {};
      rpg.flags = (data.flags && typeof data.flags === 'object') ? data.flags : {};
      // localStorage é editável pela criança/inspetor — um item sem name string
      // faria rpgDrawInventory/rpgHasItem estourar. Filtra os malformados.
      rpg.items = Array.isArray(data.items)
        ? data.items.filter(function (it) { return it && typeof it === 'object' && typeof it.name === 'string'; })
        : [];
      rpg.playerMax = num(data.max, rpg.playerMax);
      rpg.playerHp = num(data.hp, rpg.playerMax);
      rpg.playerStr = num(data.str, rpg.playerStr);
      rpg.playerDef = num(data.def, rpg.playerDef);
      rpg.playerLevel = num(data.lvl, rpg.playerLevel);
      rpg.playerXp = num(data.xp, rpg.playerXp);
      rpg.playerMaxXp = num(data.maxXp, rpg.playerMaxXp);
      rpg.scene = null; rpg.recording = false; rpg.menu = null; rpg.battle = null; rpg.dialog = null;
      if (data.map) {
        rpgGoMap(data.map);
        if (rpg.hero) {
          rpg.hero.x = num(data.hx, 0) * rpg.cellSize;
          rpg.hero.y = num(data.hy, 0) * rpg.cellSize;
          rpg.hero._gridDest = null;
        }
      }
    } catch (e) { warn('não consegui carregar o jogo: ' + e); }
  }

  // ⚔️ Batalha por turnos RICA (Combatant/TurnCycle do Pizza, 1v1): Atacar/
  // Especial (energia)/Item (poção)/Defender/Fugir; defesa reduz o dano; XP sobe
  // de nível; veneno tira vida por turno. Dano = força ± 20% − defesa/2.
  function ensureBattleScreen() {
    if (screens.batalha) return screens.batalha;
    var scr = makeScreen('batalha', 'h2', 'Batalha!', '');
    makeButton(scr, 'Atacar', function () { battleAction('atacar'); });
    makeButton(scr, 'Especial', function () { battleAction('especial'); });
    makeButton(scr, 'Item', function () { battleAction('item'); });
    makeButton(scr, 'Defender', function () { battleAction('defender'); });
    makeButton(scr, 'Fugir', function () { battleAction('fugir'); });
    return scr;
  }
  function rollDamage(strength, targetDef) {
    var raw = Math.round(num(strength, 1) * (0.8 + Math.random() * 0.4));
    return Math.max(1, raw - Math.floor(num(targetDef, 0) / 2));
  }
  function updateBattleText(msg) {
    var scr = screens.batalha;
    var b = rpg.battle;
    if (!scr || !b) return;
    scr.text.textContent =
      'Você Nv' + rpg.playerLevel + ': ' + Math.max(0, rpg.playerHp) + '/' + rpg.playerMax +
      ' ⚡' + Math.max(0, rpg.playerEnergy) +
      ' | ' + b.name + ': ' + Math.max(0, b.hp) + '/' + b.max + ' — ' + msg;
  }
  function rpgBattleStats(hp, str, def) {
    rpg.baseMax = Math.max(1, num(hp, 30));
    rpg.baseStr = Math.max(1, num(str, 7));
    rpg.baseDef = Math.max(0, num(def, 0));
    rpg.playerMax = rpg.baseMax;
    rpg.playerStr = rpg.baseStr;
    rpg.playerDef = rpg.baseDef;
    rpg.playerHp = rpg.playerMax;
    rpg.playerLevel = 1;
    rpg.playerXp = 0;
    rpg.playerMaxXp = 20;
  }
  function rpgSetSpecial(name, dmg, cost) {
    rpg.special = { name: text(name, 'Especial'), dmg: Math.max(1, num(dmg, 12)), cost: Math.max(0, num(cost, 4)) };
  }
  function rpgGivePotion(name, heal) {
    rpg.potions.push({ name: text(name, 'Poção'), heal: Math.max(1, num(heal, 20)) });
  }
  function rpgBattleStart(name, hp, str, def) {
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'battle', name: text(name, 'Inimigo'), hp: num(hp, 20), str: num(str, 5), def: num(def, 0) }); return; }
    if (!ensureShell()) return;
    if (rpg.battle) return;
    ensureBattleScreen();
    var max = Math.max(1, num(hp, 20));
    rpg.battle = {
      name: text(name, 'Inimigo'), hp: max, max: max,
      str: Math.max(0, num(str, 5)), def: Math.max(0, num(def, 0)),
      defending: false, poison: 0
    };
    rpg.playerHp = rpg.playerMax;     // cada batalha começa com a vida cheia
    rpg.playerEnergy = rpg.playerMaxEnergy; // e a energia cheia
    rpg.playerPoison = 0;
    var scr = screens.batalha;
    scr.title.textContent = 'Batalha contra ' + rpg.battle.name + '!';
    updateBattleText('Sua vez! O que você faz?');
    setState('batalha'); // estado do MEIO do jogo: congela o mundo SEM resetar
    showScreen('batalha');
  }
  function battleAction(kind) {
    var b = rpg.battle;
    if (!b) return;
    if (kind === 'fugir') {
      if (Math.random() < 0.5) { endBattle(false); return; }
      enemyTurn('Não deu para fugir!');
      return;
    }
    if (kind === 'defender') {
      b.defending = true;
      enemyTurn('Você se defendeu.');
      return;
    }
    if (kind === 'especial') {
      if (!rpg.special) { updateBattleText('Você não tem golpe especial.'); return; }
      if (rpg.playerEnergy < rpg.special.cost) { updateBattleText('Sem energia para o ' + rpg.special.name + '!'); return; }
      rpg.playerEnergy -= rpg.special.cost;
      var sdmg = rollDamage(rpg.special.dmg, b.def);
      b.hp -= sdmg;
      if (b.hp <= 0) { endBattle(true); return; }
      enemyTurn(rpg.special.name + ' causou ' + sdmg + '!');
      return;
    }
    if (kind === 'item') {
      if (rpg.potions.length === 0) { updateBattleText('Você não tem poções.'); return; }
      var p = rpg.potions.shift();
      rpg.playerHp = Math.min(rpg.playerMax, rpg.playerHp + p.heal);
      enemyTurn('Usou ' + p.name + ' (+' + p.heal + ' de vida)!');
      return;
    }
    // atacar
    var dmg = rollDamage(rpg.playerStr, b.def);
    b.hp -= dmg;
    if (b.hp <= 0) { endBattle(true); return; }
    enemyTurn('Você causou ' + dmg + '!');
  }
  function enemyTurn(prefix) {
    var b = rpg.battle;
    var dmg = rollDamage(b.str, rpg.playerDef);
    if (b.defending) { dmg = Math.max(1, Math.round(dmg / 2)); b.defending = false; }
    rpg.playerHp -= dmg;
    var extra = '';
    // Fim do turno: veneno tira vida de quem está envenenado (status do Pizza).
    if (b.poison > 0) { b.hp -= 3; b.poison -= 1; extra += ' ' + b.name + ' sofre 3 de veneno.'; }
    if (rpg.playerPoison > 0) { rpg.playerHp -= 3; rpg.playerPoison -= 1; extra += ' Você sofre 3 de veneno.'; }
    rpg.playerEnergy = Math.min(rpg.playerMaxEnergy, rpg.playerEnergy + 2); // regen de energia
    if (b.hp <= 0) { endBattle(true); return; }
    if (rpg.playerHp <= 0) { rpg.playerHp = 0; endBattle(false); return; }
    updateBattleText(prefix + ' ' + b.name + ' devolveu ' + dmg + '.' + extra + ' Sua vez!');
  }
  /** Ganhar XP (após a batalha): sobe de nível, aumenta atributos e cura. */
  function rpgBattleReward(xp) {
    rpg.playerXp += Math.max(0, num(xp, 0));
    var subiu = false;
    while (rpg.playerXp >= rpg.playerMaxXp) {
      rpg.playerXp -= rpg.playerMaxXp;
      rpg.playerLevel += 1;
      rpg.playerMax += 8; rpg.playerStr += 2; rpg.playerDef += 1;
      rpg.playerMaxXp = Math.round(rpg.playerMaxXp * 1.4);
      subiu = true;
    }
    if (subiu) {
      rpg.playerHp = rpg.playerMax; // curou ao subir de nível
      emit('subiu:nivel');
    }
  }
  /** Envenenar (status): who = 'inimigo' ou 'heroi'; perde 3 de vida por turno. */
  function rpgInflict(who, status, turns) {
    var t = Math.max(1, Math.round(num(turns, 3)));
    var w = text(who, 'inimigo');
    if (text(status, 'veneno') !== 'veneno') return; // só veneno por ora
    if (w === 'heroi' || w === 'herói') rpg.playerPoison = t;
    else if (rpg.battle) rpg.battle.poison = t;
  }
  function endBattle(won) {
    rpg.battleWon = won === true;
    rpg.battle = null;
    setState('jogando'); // vindo de 'batalha' o mundo NÃO reseta (ver setState)
    for (var i = 0; i < rpg.onBattleEnd.length; i++) {
      try { rpg.onBattleEnd[i](); } catch (e) { warn('erro no "quando a batalha terminar": ' + e); }
    }
    emit('batalha:fim');
  }

  // ---- 🔊 Som (importado via new Audio + sintetizado) ----
  function loadSound(name, asset) {
    var key = text(name, '') || text(asset, '');
    if (!key) { warn('"Carregar o som" precisa de um nome'); return; }
    var a = text(asset, '');
    var src = SOUNDS[a] || (a.indexOf('data:audio/') === 0 ? a : null);
    if (!src) { warn('o som "' + a + '" não está no projeto (importe em "Imagens e sons")'); return; }
    pending.push(new Promise(function (resolve) {
      try {
        // fallback: se nunca disparar canplaythrough, não travar o start
        var timer = setTimeout(resolve, 3000);
        var done = function () { clearTimeout(timer); resolve(); };
        var audio = new Audio();
        audio.preload = 'auto';
        audio.oncanplaythrough = done;
        audio.onerror = function () { warn('o som "' + key + '" falhou ao carregar'); done(); };
        audio.src = src;
        sounds[key] = audio;
      } catch (e) { resolve(); }
    }));
  }
  function playSound(name) {
    var a = sounds[text(name, '')];
    if (!a) return;
    try { a.currentTime = 0; var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  }
  var _audioCtx = null;
  function ensureAudioCtx() {
    if (_audioCtx) return _audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    } catch (e) { _audioCtx = null; }
    return _audioCtx;
  }
  /**
   * Acorda o áudio no primeiro GESTO (tecla/clique). Sem isto, um AudioContext
   * criado antes do gesto fica 'suspended' p/ sempre = todos os tons MUDOS
   * (Safari/iPad exige resume DENTRO do gesto).
   */
  function resumeAudio() {
    try {
      if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    } catch (e) {}
  }
  function playTone(freq, ms) {
    var ac = ensureAudioCtx();
    if (!ac) return;
    try { if (ac.state === 'suspended') ac.resume(); } catch (e) {}
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = num(freq, 440);
      gain.gain.value = 0.06;
      osc.connect(gain); gain.connect(ac.destination);
      var dur = num(ms, 200) / 1000;
      osc.start();
      gain.gain.setTargetAtTime(0, ac.currentTime + dur * 0.6, 0.05);
      osc.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  var FX_TONES = {
    coin: [880, 90], hit: [180, 80], explosion: [90, 260], jump: [520, 120],
    laser: [1200, 90], hurt: [140, 160], powerup: [700, 200], win: [990, 300],
    gameover: [120, 400], click: [440, 50]
  };
  function playEffect(fx) {
    var t = FX_TONES[text(fx, '')] || FX_TONES.hit;
    playTone(t[0], t[1]);
  }

  // ---- Começar (Game.init do kit: carregar -> menu -> input -> resize -> loop) ----

  function start() {
    if (started) {
      warn('o jogo já começou — use "Começar o jogo" uma vez só');
      return;
    }
    if (!ensureShell()) {
      // Script rodou antes do <body> existir: espera o documento e tenta de novo.
      try {
        document.addEventListener('DOMContentLoaded', function () { start(); });
      } catch (e) {}
      return;
    }
    started = true;
    bindInput();
    resizeCanvas();
    window.addEventListener('resize', function () { resizeCanvas(); });
    setState('carregando');
    Promise.all(pending.slice()).then(function () {
      setState('menu');
      lastTime = now();
      requestAnimationFrame(gameLoop);
    });
  }

  // ---- API pública (1 método por bloco) ----

  function guard(name, fn) {
    return function () {
      try {
        return fn.apply(null, arguments);
      } catch (e) {
        warn('erro em "' + name + '": ' + e);
        return undefined;
      }
    };
  }

  var api = {
    setup: guard('setup', function (opts) {
      var o = (opts && typeof opts === 'object') ? opts : {};
      if (started) {
        warn('"Preparar o jogo" depois de começar não muda a tela — deixe-o no comecinho');
        return;
      }
      config.w = Math.max(64, Math.min(4096, num(o.width, config.w)));
      config.h = Math.max(64, Math.min(4096, num(o.height, config.h)));
      if (o.background != null) config.bg = text(o.background, config.bg);
      if (o.accent != null) config.accent = text(o.accent, config.accent);
    }),
    start: guard('start', start),
    width: guard('width', function () { return config.w; }),
    height: guard('height', function () { return config.h; }),
    loadImage: guard('loadImage', loadImage),
    setScreenText: guard('setScreenText', function (screen, title, textBody, button) {
      if (!ensureShell()) return;
      var entry = screens[text(screen, '')];
      if (!entry) {
        warn('tela pronta desconhecida: "' + text(screen, '') + '" (use menu, pausa, carregando, fim ou vitoria)');
        return;
      }
      var t = text(title, '');
      var x = text(textBody, '');
      var b = text(button, '');
      if (t) entry.title.textContent = t;
      if (x) entry.text.textContent = x;
      if (b && entry.mainBtn) entry.mainBtn.textContent = b;
    }),
    createScreen: guard('createScreen', function (name, title, textBody) {
      if (!ensureShell()) return;
      var key = text(name, '');
      if (!key) {
        warn('"Criar a tela" precisa de um nome');
        return;
      }
      if (screens[key]) {
        // Já existe (pronta ou re-criada): a criança ASSUME a tela — os botões
        // default saem (senão "Jogar de novo" duplicava na vitoria/fim) e os
        // textos passam a ser dela. Para SÓ trocar textos use setScreenText.
        var entry = screens[key];
        var btns = entry.el.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) entry.el.removeChild(btns[i]);
        entry.mainBtn = null;
        entry.title.textContent = text(title, key);
        entry.text.textContent = text(textBody, '');
        return;
      }
      makeScreen(key, 'h2', text(title, key), text(textBody, ''));
    }),
    addButton: guard('addButton', function (screen, label, fn) {
      if (!ensureShell()) return;
      var entry = screens[text(screen, '')];
      if (!entry) {
        warn('a tela "' + text(screen, '') + '" não existe — crie-a antes de pôr o botão');
        return;
      }
      makeButton(entry, text(label, 'Botão'), typeof fn === 'function' ? fn : function () {});
    }),
    showScreen: guard('showScreen', showScreen),
    hideScreens: guard('hideScreens', hideScreens),
    setState: guard('setState', setState),
    onEnterState: guard('onEnterState', function (name, fn) {
      var key = text(name, '');
      if (!key || typeof fn !== 'function') return;
      if (!enterStateHooks[key]) enterStateHooks[key] = [];
      enterStateHooks[key].push(fn);
    }),
    stateIs: guard('stateIs', function (name) { return state === text(name, ''); }),
    state: guard('state', function () { return state; }),
    pause: guard('pause', function () {
      if (state === 'jogando') setState('pausado');
    }),
    resume: guard('resume', function () {
      if (state === 'pausado') setState('jogando');
    }),
    returnToMenu: guard('returnToMenu', function () { setState('menu'); }),
    endGame: guard('endGame', function () { setState('fim'); }),
    onUpdate: guard('onUpdate', function (fn) {
      if (typeof fn === 'function') updateHooks.push(fn);
    }),
    onDraw: guard('onDraw', function (fn) {
      if (typeof fn === 'function') drawHooks.push(fn);
    }),
    onDrawHud: guard('onDrawHud', function (fn) {
      if (typeof fn === 'function') hudHooks.push(fn);
    }),
    drawBackground: guard('drawBackground', drawBackground),
    createCharacter: guard('createCharacter', createCharacter),
    moveWithKeys: guard('moveWithKeys', moveWithKeys),
    keepOnScreen: guard('keepOnScreen', keepOnScreen),
    drawCharacter: guard('drawCharacter', drawCharacter),
    placeCharacter: guard('placeCharacter', function (c, x, y) {
      if (!c || typeof c !== 'object') return;
      c.x = num(x, c.x);
      c.y = num(y, c.y);
    }),
    resetCharacter: guard('resetCharacter', function (c) {
      if (!c || typeof c !== 'object') return;
      c.x = (config.w - num(c.w, 0)) / 2;
      c.y = (config.h - num(c.h, 0)) / 2;
      c.speedMultiplier = 1;
      // Recupera a vida cheia e limpa dano/empurrão (para "Jogar de novo").
      if (c.maxHealth != null) c.health = c.maxHealth;
      c._iFrames = 0;
      c._pushX = 0;
      c._pushY = 0;
    }),
    setSpeedMultiplier: guard('setSpeedMultiplier', function (c, factor) {
      if (!c || typeof c !== 'object') return;
      c.speedMultiplier = num(factor, 1);
    }),
    touching: guard('touching', touching),
    charX: guard('charX', function (c) { return (c && typeof c === 'object') ? num(c.x, 0) : 0; }),
    charY: guard('charY', function (c) { return (c && typeof c === 'object') ? num(c.y, 0) : 0; }),
    keyDown: guard('keyDown', function (k) { return keys[normKey(k)] === true; }),
    keyPressed: guard('keyPressed', function (k) { return justPressed[normKey(k)] === true; }),
    setPauseKey: guard('setPauseKey', function (k) {
      var key = normKey(k);
      if (key) config.pauseKey = key;
    }),
    // ----- R2: fundamentos -----
    setSheet: guard('setSheet', setSheet),
    playAnim: guard('playAnim', playAnim),
    cameraFollow: guard('cameraFollow', cameraFollow),
    cameraStop: guard('cameraStop', cameraStop),
    cameraX: guard('cameraX', function () { return camera.x; }),
    cameraY: guard('cameraY', function () { return camera.y; }),
    launchTowards: guard('launchTowards', launchTowards),
    moveByVelocity: guard('moveByVelocity', moveByVelocity),
    setAngle: guard('setAngle', setAngle),
    mouseX: guard('mouseX', function () { return mouse.x; }),
    mouseY: guard('mouseY', function () { return mouse.y; }),
    mouseDown: guard('mouseDown', function () { return mouse.down === true; }),
    onGameClick: guard('onGameClick', function (fn) {
      if (typeof fn === 'function') gameClickHooks.push(fn);
    }),
    drawBar: guard('drawBar', drawBar),
    setWalkSheet: guard('setWalkSheet', setWalkSheet),
    // ----- 🗺️ V9: mapa de tiles + profundidade -----
    cameraShake: guard('cameraShake', cameraShake),
    loadTilemap: guard('loadTilemap', loadTilemap),
    drawTilemap: guard('drawTilemap', drawTilemap),
    tilemapSolid: guard('tilemapSolid', tilemapSolid),
    drawShadow: guard('drawShadow', drawShadow),
    drawByDepth: guard('drawByDepth', drawByDepth),
    // ----- 🧙 Kit RPG -----
    rpgMoveGrid: guard('rpgMoveGrid', rpgMoveGrid),
    rpgBlockCell: guard('rpgBlockCell', rpgBlockCell),
    rpgCell: guard('rpgCell', rpgCellPx),
    rpgCreateNpc: guard('rpgCreateNpc', rpgCreateNpc),
    rpgDrawNpcs: guard('rpgDrawNpcs', rpgDrawNpcs),
    rpgOnTalk: guard('rpgOnTalk', rpgOnTalk),
    rpgSay: guard('rpgSay', rpgSay),
    rpgAddFlag: guard('rpgAddFlag', rpgAddFlag),
    rpgHasFlag: guard('rpgHasFlag', rpgHasFlag),
    rpgGiveItem: guard('rpgGiveItem', rpgGiveItem),
    rpgHasItem: guard('rpgHasItem', rpgHasItem),
    rpgRemoveItem: guard('rpgRemoveItem', rpgRemoveItem),
    rpgDrawInventory: guard('rpgDrawInventory', rpgDrawInventory),
    rpgGoMap: guard('rpgGoMap', rpgGoMap),
    rpgOnMap: guard('rpgOnMap', rpgOnMap),
    rpgCreateDoor: guard('rpgCreateDoor', rpgCreateDoor),
    rpgBattleStats: guard('rpgBattleStats', rpgBattleStats),
    rpgBattleStart: guard('rpgBattleStart', rpgBattleStart),
    rpgOnBattleEnd: guard('rpgOnBattleEnd', function (fn) {
      if (typeof fn === 'function') rpg.onBattleEnd.push(fn);
    }),
    rpgBattleWon: guard('rpgBattleWon', function () { return rpg.battleWon === true; }),
    // ----- ⚔️ V8: batalha rica (progressão) -----
    rpgSetSpecial: guard('rpgSetSpecial', rpgSetSpecial),
    rpgGivePotion: guard('rpgGivePotion', rpgGivePotion),
    rpgBattleReward: guard('rpgBattleReward', rpgBattleReward),
    rpgInflict: guard('rpgInflict', rpgInflict),
    rpgLevel: guard('rpgLevel', function () { return rpg.playerLevel; }),
    rpgXp: guard('rpgXp', function () { return rpg.playerXp; }),
    // ----- 🎬 V6: cenas & NPCs vivos -----
    rpgCutscene: guard('rpgCutscene', rpgCutscene),
    rpgWait: guard('rpgWait', rpgWait),
    rpgFace: guard('rpgFace', rpgFace),
    rpgNpcWalkTo: guard('rpgNpcWalkTo', rpgNpcWalkTo),
    rpgNpcWander: guard('rpgNpcWander', rpgNpcWander),
    rpgOnStep: guard('rpgOnStep', rpgOnStep),
    // ----- 💬 V7: escolhas & 💾 salvar -----
    rpgMenu: guard('rpgMenu', rpgMenu),
    rpgOption: guard('rpgOption', rpgOption),
    rpgSave: guard('rpgSave', rpgSave),
    rpgLoad: guard('rpgLoad', rpgLoad),
    rpgHasSave: guard('rpgHasSave', rpgHasSave),
    // ----- P24 -----
    on: guard('on', onEvent),
    emit: guard('emit', emit),
    defineMold: guard('defineMold', defineMold),
    spawnFromMold: guard('spawnFromMold', spawnFromMold),
    startSpawner: guard('startSpawner', function (mold, seconds) {
      var k = text(mold, '');
      if (!k) return;
      // Dedupe por molde: re-ligar SUBSTITUI o intervalo (senão o bloco dentro de
      // "quando entrar em jogando" DOBRAVA a taxa a cada "Jogar de novo").
      for (var i = 0; i < spawners.length; i++) {
        if (spawners[i].mold === k) {
          spawners[i].interval = Math.max(0.05, num(seconds, 1.5));
          spawners[i].timer = 0;
          return;
        }
      }
      spawners.push({ mold: k, interval: Math.max(0.05, num(seconds, 1.5)), timer: 0 });
    }),
    stopSpawner: guard('stopSpawner', function (mold) {
      var k = text(mold, '');
      for (var i = spawners.length - 1; i >= 0; i--) {
        if (spawners[i].mold === k) spawners.splice(i, 1);
      }
    }),
    forEachActive: guard('forEachActive', forEachActive),
    cullOffscreen: guard('cullOffscreen', cullOffscreen),
    recycle: guard('recycle', recycle),
    drawActive: guard('drawActive', drawActive),
    countActive: guard('countActive', countActive),
    defineLook: guard('defineLook', defineLook),
    drawLook: guard('drawLook', drawLook),
    seek: guard('seek', seek),
    drift: guard('drift', drift),
    face: guard('face', face),
    hurt: guard('hurt', hurt),
    knockback: guard('knockback', knockback),
    drawHealthBar: guard('drawHealthBar', drawHealthBar),
    touchCircle: guard('touchCircle', touchCircle),
    isDead: guard('isDead', function (c) {
      return !!(c && typeof c === 'object') && num(c.health, 1) <= 0;
    }),
    isInvincible: guard('isInvincible', function (c) {
      // O gate do P24 (o "if (applied)") em forma de pergunta: "se encostou E NÃO
      // está invencível: machucar + empurrar + som" — só o hit VÁLIDO reage.
      return !!(c && typeof c === 'object') && num(c._iFrames, 0) > 0;
    }),
    healthOf: guard('healthOf', function (c) {
      return (c && typeof c === 'object') ? num(c.health, 0) : 0;
    }),
    // ----- 🥷 V10: ação em tempo real (Zelda) -----
    attackFacing: guard('attackFacing', attackFacing),
    didHit: guard('didHit', didHit),
    patrolAround: guard('patrolAround', patrolAround),
    drawHearts: guard('drawHearts', drawHearts),
    setMission: guard('setMission', function (seconds, killGoal) {
      // 0 (ou negativo) = condição DESLIGADA (Infinity), senão "0 s" venceria no
      // 1º quadro (o win é OR). A criança pode querer "só por tempo" ou "só por
      // inimigos" zerando o outro.
      var sec = num(seconds, 30);
      var kills = num(killGoal, 10);
      mission = { seconds: sec > 0 ? sec : Infinity, killCount: kills > 0 ? kills : Infinity };
      missionDone = false;
    }),
    missionKill: guard('missionKill', function () { killCount += 1; }),
    drawTimer: guard('drawTimer', drawTimer),
    timeSurvived: guard('timeSurvived', function () { return playTime; }),
    kills: guard('kills', function () { return killCount; }),
    defineEffect: guard('defineEffect', defineEffect),
    burst: guard('burst', burst),
    drawEffects: guard('drawEffects', drawEffects),
    loadSound: guard('loadSound', loadSound),
    playSound: guard('playSound', playSound),
    playEffect: guard('playEffect', playEffect),
    playTone: guard('playTone', playTone)
  };

  window.SZGameKit = api;
})();
`
