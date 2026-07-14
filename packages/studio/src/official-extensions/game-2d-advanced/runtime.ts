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
  var camera = { on: false, target: null, x: 0, y: 0, worldW: 0, worldH: 0 };
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

  function warn(msg) {
    try { console.warn('SZGameKit: ' + msg); } catch (e) {}
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
      // Pixel art nítida por padrão (P24 seta no ctor do RenderSystem). O resize
      // recria o backing store e reseta o ctx — o resizeCanvas re-aplica.
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
    if (n === 'jogando' && prev !== 'jogando') {
      lastTime = now();
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
    }
    var hooks = enterStateHooks[n];
    if (hooks) {
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
      justPressed[k] = true;
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
    var cam = camera.on;
    if (cam) {
      ctx2d.save();
      ctx2d.translate(-Math.round(camera.x), -Math.round(camera.y));
    }
    runHooks(drawHooks, ctx2d, 'Desenhar o jogo');
    if (debugOverlay) drawDebugOverlay();
    if (cam) ctx2d.restore();
    // HUD: por cima de tudo, SEM câmera (placar/barras ficam presos na tela).
    runHooks(hudHooks, ctx2d, 'Desenhar por cima (HUD)');
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
      _angle: 0,
      _sheetImg: '', _sheetFw: 0, _sheetFh: 0,
      _animFrom: 0, _animTo: 0, _animFps: 0, _animStart: 0
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
    var flip = c._facingLeft === true;
    if (flip) {
      ctx2d.save();
      ctx2d.translate(c.x + c.w, c.y);
      ctx2d.scale(-1, 1);
    }
    var lx = flip ? 0 : c.x;
    var ly = flip ? 0 : c.y;
    var drew = false;
    // Folha de quadros (spritesheet): recorta o quadro da vez (pixel art viva).
    if (c._sheetImg) {
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
      _active: false, _facingLeft: false, _iFrames: 0,
      _pushX: 0, _pushY: 0, _driftAngle: null, _mold: '',
      _angle: 0,
      _sheetImg: '', _sheetFw: 0, _sheetFh: 0,
      _animFrom: 0, _animTo: 0, _animFps: 0, _animStart: 0
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
    if (!m) { warn('molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var pool = pools[k] || (pools[k] = { active: [], free: [], _sweeping: false });
    var e = pool.free.pop();
    if (!e) e = blankEntity();
    e.x = num(x, 0); e.y = num(y, 0);
    e.w = m.w; e.h = m.h;
    e.speed = m.speed; e.damage = m.damage; e.color = m.color;
    e.image = m.image; e.look = m.look; e.radius = m.radius;
    e.health = m.health; e.maxHealth = m.health;
    e._active = true; e._facingLeft = false; e._iFrames = 0;
    e._pushX = 0; e._pushY = 0; e._driftAngle = null; e._mold = k;
    e.vx = 0; e.vy = 0; e._angle = 0;
    e._sheetImg = ''; e._sheetFw = 0; e._sheetFh = 0;
    e._animFrom = 0; e._animTo = 0; e._animFps = 0; e._animStart = 0;
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
    if (!e) { warn('efeito "' + text(name, '') + '" não existe — crie com "Criar o efeito"'); return; }
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
    setMission: guard('setMission', function (seconds, killGoal) {
      mission = { seconds: num(seconds, 30), killCount: num(killGoal, 10) };
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
