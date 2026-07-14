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

  /** Botão dentro de um painel; o clique roda fn protegido. */
  function makeButton(entry, label, fn) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = function () {
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

      // As 4 telas PRONTAS do kit, com textos default em português.
      var menu = makeScreen('menu', 'h1', 'Meu Jogo', 'WASD ou setas para andar');
      makeButton(menu, 'Jogar', function () { api.setState('jogando'); });
      var pausa = makeScreen('pausa', 'h2', 'Pausa', '');
      makeButton(pausa, 'Continuar', function () { api.resume(); });
      makeButton(pausa, 'Sair para o menu', function () { api.returnToMenu(); });
      makeScreen('carregando', 'h2', 'Carregando...', 'Preparando os pixels...');
      var fim = makeScreen('fim', 'h2', 'Fim de jogo', '');
      makeButton(fim, 'Jogar de novo', function () { api.setState('jogando'); });

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
      warn('a tela "' + key + '" não existe — crie com "Criar a tela" (prontas: menu, pausa, carregando, fim)');
      return;
    }
    hideScreens();
    entry.el.classList.add('szgk-active');
  }

  /** Telas automáticas por estado (menu/pausado/fim/carregando); resto esconde. */
  function applyStateScreens(name) {
    if (!shellReady) return;
    if (name === 'menu') showScreen('menu');
    else if (name === 'pausado') showScreen('pausa');
    else if (name === 'fim') showScreen('fim');
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
      var k = String(e.key).toLowerCase();
      keys[k] = true;
      if (k === config.pauseKey) {
        if (state === 'jogando') setState('pausado');
        else if (state === 'pausado') setState('jogando');
      }
    });
    window.addEventListener('keyup', function (e) {
      keys[String(e.key).toLowerCase()] = false;
    });
    // Menu de contexto / perder o foco: solta todas as teclas (evita a tecla
    // "presa" quando o navegador engole o keyup).
    window.addEventListener('contextmenu', function () { keys = {}; });
    window.addEventListener('blur', function () { keys = {}; });
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
    runHooks(drawHooks, ctx2d, 'Desenhar o jogo');
  }

  function gameLoop(timestamp) {
    var dt = (timestamp - lastTime) / 1000;
    if (!(dt >= 0)) dt = 0;
    if (dt > 0.1) dt = 0.1; // clamp do kit: aba em segundo plano não teleporta o jogo
    lastTime = timestamp;
    currentDt = dt;
    if (state === 'jogando') {
      stepSystems(dt);
      runHooks(updateHooks, dt, 'A cada quadro');
    }
    render();
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
    for (var c = 0; c < combatants.length; c++) {
      var e = combatants[c];
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
        api.emit('missao:completa');
        setState('fim');
      }
    }
  }

  // ---- Personagens (Player do kit, generalizado p/ N nomeados) ----

  function createCharacter(opts) {
    var o = (opts && typeof opts === 'object') ? opts : {};
    var w = num(o.w, 64);
    var h = num(o.h, 64);
    var c = {
      x: (config.w - w) / 2,
      y: (config.h - h) / 2,
      w: w,
      h: h,
      speed: num(o.speed, 300),
      speedMultiplier: 1,
      image: text(o.image, ''),
      color: text(o.color, '#4a9eff')
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
    c.x = Math.max(0, Math.min(config.w - num(c.w, 0), num(c.x, 0)));
    c.y = Math.max(0, Math.min(config.h - num(c.h, 0), num(c.y, 0)));
  }

  // Desenha 1 personagem: aparência (look) > imagem > retângulo. Herda de graça o
  // piscar (i-frames) e a virada (facingLeft) — como o RenderSystem do P24.
  function drawEntity(c) {
    if (!ctx2d || !c || typeof c !== 'object') return;
    var prevAlpha = 1;
    var blinking = c._iFrames > 0;
    if (blinking) {
      try { prevAlpha = ctx2d.globalAlpha; } catch (e) {}
      try { ctx2d.globalAlpha = 0.1 + 0.8 * Math.abs(Math.sin(c._iFrames * 20)); } catch (e) {}
    }
    var flip = c._facingLeft === true;
    if (flip) {
      ctx2d.save();
      ctx2d.translate(c.x + c.w, c.y);
      ctx2d.scale(-1, 1);
    }
    var lx = flip ? 0 : c.x;
    var ly = flip ? 0 : c.y;
    var lookFn = looks[c.look];
    var drew = false;
    if (typeof lookFn === 'function') {
      ctx2d.save();
      ctx2d.translate(lx, ly);
      try { lookFn(ctx2d); drew = true; } catch (e) {}
      ctx2d.restore();
    }
    if (!drew) {
      var entry = images[c.image];
      if (entry && entry.loaded && entry.img) {
        try {
          ctx2d.imageSmoothingEnabled = false;
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
    if (blinking) { try { ctx2d.globalAlpha = prevAlpha; } catch (e) {} }
  }

  function drawCharacter(c) {
    drawEntity(c);
  }

  function drawBackground(color, grid) {
    if (!ctx2d) return;
    ctx2d.fillStyle = text(color, config.bg);
    ctx2d.fillRect(0, 0, config.w, config.h);
    if (grid) {
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      for (var i = 0; i < config.w; i += 40) {
        ctx2d.moveTo(i, 0);
        ctx2d.lineTo(i, config.h);
      }
      for (var j = 0; j < config.h; j += 40) {
        ctx2d.moveTo(0, j);
        ctx2d.lineTo(config.w, j);
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
    for (var i = 0; i < list.length; i++) {
      try { list[i](); } catch (e) { warn('erro no "quando chegar o aviso": ' + e); }
    }
  }

  // ---- 👾 Moldes, pools e spawner (data-driven + ObjectPooler do P24) ----
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
    if (!pools[k]) pools[k] = { active: [], free: [] };
  }
  function spawnFromMold(name, x, y) {
    var k = text(name, '');
    var m = molds[k];
    if (!m) { warn('molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var pool = pools[k] || (pools[k] = { active: [], free: [] });
    var e = pool.free.pop();
    if (!e) e = {};
    e.x = num(x, 0); e.y = num(y, 0);
    e.w = m.w; e.h = m.h;
    e.speed = m.speed; e.damage = m.damage; e.color = m.color;
    e.image = m.image; e.look = m.look; e.radius = m.radius;
    e.health = m.health; e.maxHealth = m.health;
    e._active = true; e._facingLeft = false; e._iFrames = 0;
    e._pushX = 0; e._pushY = 0; e._driftAngle = null; e._mold = k;
    pool.active.push(e);
    return e;
  }
  function spawnAtEdge(name) {
    var edge = Math.floor(Math.random() * 4);
    var x, y;
    if (edge === 0) { x = Math.random() * config.w; y = -80; }
    else if (edge === 1) { x = config.w + 80; y = Math.random() * config.h; }
    else if (edge === 2) { x = Math.random() * config.w; y = config.h + 80; }
    else { x = -80; y = Math.random() * config.h; }
    return spawnFromMold(name, x, y);
  }
  function recycle(e) {
    if (!e || typeof e !== 'object') return;
    e._active = false;
    var pool = pools[e._mold];
    // A remoção real do "active" acontece na varredura reversa (forEachActive/cull);
    // aqui só marcamos. Mas se veio de fora do laço, guardamos direto.
    if (pool && pool.active.indexOf(e) === -1) {
      // já não está ativo — nada a fazer
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
      pool.active[i]._active = false;
      pool.free.push(pool.active[i]);
    }
    pool.active.length = 0;
  }
  function forEachActive(name, fn) {
    var pool = pools[text(name, '')];
    if (!pool || typeof fn !== 'function') return;
    // Ordem REVERSA: recolher/remover durante o laço é seguro.
    for (var i = pool.active.length - 1; i >= 0; i--) {
      var e = pool.active[i];
      if (!e._active) continue;
      try { fn(e); } catch (err) { warn('erro no "para cada vivo": ' + err); }
    }
    compact(pool);
  }
  function cullOffscreen(name, margin) {
    var pool = pools[text(name, '')];
    if (!pool) return;
    var m = num(margin, 120);
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      if (e.x < -m || e.x > config.w + m || e.y < -m || e.y > config.h + m) e._active = false;
    }
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
    return pool ? pool.active.length : 0;
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
    var full = num(max, num(who.maxHealth, 100));
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
  function burst(name, x, y) {
    var e = effects[text(name, '')];
    if (!e) { warn('efeito "' + text(name, '') + '" não existe — crie com "Criar o efeito"'); return; }
    for (var i = 0; i < e.count; i++) {
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
    var dt = currentDt;
    for (var i = particles.active.length - 1; i >= 0; i--) {
      var p = particles.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.active.splice(i, 1);
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
  function defineLook(name, fn) {
    var k = text(name, '');
    if (k && typeof fn === 'function') looks[k] = fn;
  }
  function drawLook(name, x, y, w, h) {
    if (!ctx2d) return;
    var fn = looks[text(name, '')];
    if (typeof fn !== 'function') return;
    ctx2d.save();
    ctx2d.translate(num(x, 0), num(y, 0));
    try { fn(ctx2d, num(w, 0), num(h, 0)); } catch (e) {}
    ctx2d.restore();
  }

  // ---- 🖥️ HUD & Missão ----
  function drawTimer(x, y) {
    if (!ctx2d) return;
    var mins = Math.floor(playTime / 60);
    var secs = Math.floor(playTime % 60);
    var label = mins + ':' + (secs < 10 ? '0' + secs : '' + secs);
    ctx2d.fillStyle = config.accent;
    ctx2d.font = '28px "Courier New", monospace';
    try { ctx2d.textAlign = 'left'; } catch (e) {}
    ctx2d.fillText(label, num(x, 20), num(y, 40));
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
        var audio = new Audio();
        audio.preload = 'auto';
        audio.oncanplaythrough = function () { resolve(); };
        audio.onerror = function () { warn('o som "' + key + '" falhou ao carregar'); resolve(); };
        audio.src = src;
        sounds[key] = audio;
        // fallback: se nunca disparar canplaythrough, não travar o start
        setTimeout(resolve, 3000);
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
  function playTone(freq, ms) {
    var ac = ensureAudioCtx();
    if (!ac) return;
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
        warn('tela pronta desconhecida: "' + text(screen, '') + '" (use menu, pausa, carregando ou fim)');
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
        // Já existe (pronta ou criada de novo): só atualiza os textos.
        api.setScreenText(key, title, textBody, '');
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
    }),
    setSpeedMultiplier: guard('setSpeedMultiplier', function (c, factor) {
      if (!c || typeof c !== 'object') return;
      c.speedMultiplier = num(factor, 1);
    }),
    touching: guard('touching', touching),
    charX: guard('charX', function (c) { return (c && typeof c === 'object') ? num(c.x, 0) : 0; }),
    charY: guard('charY', function (c) { return (c && typeof c === 'object') ? num(c.y, 0) : 0; }),
    keyDown: guard('keyDown', function (k) { return keys[normKey(k)] === true; }),
    setPauseKey: guard('setPauseKey', function (k) {
      var key = normKey(k);
      if (key) config.pauseKey = key;
    }),
    // ----- P24 -----
    on: guard('on', onEvent),
    emit: guard('emit', emit),
    defineMold: guard('defineMold', defineMold),
    spawnFromMold: guard('spawnFromMold', spawnFromMold),
    startSpawner: guard('startSpawner', function (mold, seconds) {
      var k = text(mold, '');
      if (!k) return;
      spawners.push({ mold: k, interval: Math.max(0.05, num(seconds, 1.5)), timer: 0 });
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
