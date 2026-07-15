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
  var frameCount = 0;                    // carimbo do quadro (mede "anda?" 1× por quadro)
  var MAX_ACTIVE_PER_MOLD = 300;         // teto por molde (irmão do MAX_PARTICLES)
  // Tamanho da PEÇA/célula na tela, em px. É NEUTRO (não vive mais dentro do rpg):
  // o mapa de tiles é GERAL — desenhar e colidir precisam do mesmo número, e antes
  // ele só existia no Kit RPG (fora dele o mapa ficava travado em 64 p/ sempre).
  // O "Mover pela grade" (RPG) e o "tamanho da peça" (geral) escrevem os dois aqui.
  var tilePx = 64;

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
        tweens.length = 0;
        secondTimers = Object.create(null); // sem protótipo: a chave vem da criança
        rpgNewGame();
      }
    }
    // Os hooks de "quando entrar no estado" só rodam numa ENTRADA de verdade:
    // - despausar / fechar batalha é "voltar ao meio do jogo" (isMidResume);
    // - trocar para o estado em que JÁ se está não é entrar (senão um setState
    //   dentro do "A cada quadro" re-criaria inimigos/música 60×/s).
    var isMidResume = (n === 'jogando' && (prev === 'pausado' || prev === 'batalha'));
    var isSameState = (n === prev);
    var hooks = enterStateHooks[n];
    if (hooks && !isMidResume && !isSameState) {
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
    var src = resolveAsset(asset);
    if (!src) {
      images[key] = { img: null, loaded: false };
      warnOnce('img:' + key, 'a imagem "' + text(asset, '') + '" não está no projeto — o personagem usa o retângulo');
      return;
    }
    // Idempotente: carregar a MESMA imagem de novo reaproveita (o "Carregar" é p/
    // o comecinho, mas dentro do "A cada quadro" isto criava um Image por quadro e
    // a fila de espera do start crescia sem parar).
    var known = images[key];
    if (known && known._src === src) return;
    var entry = { img: null, loaded: false, _src: src };
    images[key] = entry;
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
    var dk = text(name, '');
    var m = tilemaps[dk];
    if (!m) { warnOnce('drawmap:' + dk, 'o mapa "' + dk + '" não existe — carregue com "Carregar o mapa"'); return; }
    var sheet = images[m.imgKey];
    if (!sheet || !sheet.loaded || !sheet.img) return;
    var at = m.artTile;
    var cols = Math.max(1, Math.floor(num(sheet.img.width, at) / at));
    var cell = tilePx;
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
    var tk = text(name, '');
    var m = tilemaps[tk];
    if (!m) { warnOnce('solid:' + tk, 'o mapa "' + tk + '" não existe — carregue com "Carregar o mapa"'); return; }
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
  /** Desenha em ordem de PROFUNDIDADE (quem está mais embaixo fica na frente) — o
   * Y-sort do Pizza (painter's algorithm). É GERAL: entram o personagem passado,
   * TODOS os moldes/enxames vivos e os NPCs do Kit RPG (se houver). Antes só
   * varria os NPCs, então num jogo de moldes os inimigos simplesmente SUMIAM. */
  // Lista e comparador REUSÁVEIS (roda a cada quadro): evita alocar array + closure
  // 60×/s (GC em celular fraco).
  var depthList = [];
  function depthCmp(a, b) { return (num(a.y, 0) + num(a.h, 0)) - (num(b.y, 0) + num(b.h, 0)); }
  function drawByDepth(hero) {
    depthList.length = 0;
    if (hero && typeof hero === 'object') depthList.push(hero);
    for (var pk in pools) {
      var act = pools[pk].active;
      for (var i = 0; i < act.length; i++) {
        if (act[i]._active !== false && act[i] !== hero) depthList.push(act[i]);
      }
    }
    for (var k in rpg.npcs) if (rpg.npcs[k] !== hero) depthList.push(rpg.npcs[k]);
    depthList.sort(depthCmp);
    for (var j = 0; j < depthList.length; j++) drawEntity(depthList[j]);
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
    // A cena da batalha do Kit Monstrinhos substitui o mundo (o estado
    // 'batalha' congela o jogo e esta é a outra tela).
    if (pkm.battle && state === 'batalha') drawPkmBattle();
    // A caixa de fala e o menu de escolha são UI do MOTOR: sempre no topo.
    drawDialog();
    drawMenu();
    // 🎬 A transição vem por ÚLTIMO: ela existe para ESCONDER a troca de cena —
    // se a fala ficasse por cima do preto, a mágica acabava.
    drawScreenFx();
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
    frameCount += 1;
    // O tremor decai FORA do gate de estado: o render o aplica em todo estado
    // (fim/vitória/pausado/batalha), então decair só em 'jogando' deixava a tela
    // de fim vibrando PARA SEMPRE ("morrer → tremer + terminar o jogo").
    if (camera.shakeT > 0) camera.shakeT = Math.max(0, camera.shakeT - dt);
    stepScreenFx(dt); // idem: o render aplica em TODO estado
    // ⭐ A batalha do Kit Monstrinhos roda no estado 'batalha', onde o
    // stepSystems NÃO anda — e é ele que bombeia o relógio da fala, a
    // navegação do menu, os tweens e as faíscas. Por isso o step é AQUI.
    stepPkmBattle(dt);
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
    stepUiInput(); // fala + menu de escolha: UI do motor, vale em QUALQUER jogo
    stepTweens(dt); // movimentos suaves em curso (✨ mover suave até)
    stepParticles(dt); // física das faíscas (o drawEffects só DESENHA)
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
      _lastX: 0, _lastY: 0, _moving: false, _moveFrame: -1,
      // ⚙️ Física geral: no chão? / teto de queda / recarga / de onde veio (varredura)
      onGround: false, _maxFall: 0, _cd: 0, _prevX: 0, _prevY: 0,
      // 🏃 Kit Plataforma: onde nasceu (renascer sem checkpoint), as 3 janelinhas do
      // pulo bom (coyote/buffer/segurar), o pulo duplo, a parede e a carona.
      _bornX: 0, _bornY: 0, _coyoteT: 0, _bufferT: 0, _holdT: 0, _airJumps: 0,
      _wallDir: 0, _wallSide: 0, _wallT: 0, _wallLockT: 0, _dropT: 0,
      _platT: 0, _carryX: 0, _carryY: 0, _patrolDir: 0, _patrolWas: 0,
      _platFrames: null,
      _driftTimer: 0, _patrolTX: 0, _patrolTY: 0, _patrolTimer: 0,
      // 🌫️ R15: opacidade (1 = opaco) e a caixa que COLIDE (0 = usa o desenho).
      opacity: 1, _hbX: 0, _hbY: 0, _hbW: 0, _hbH: 0
    };
    c._bornX = c.x;
    c._bornY = c.y;
    return c;
  }

  // ⭐ FONTE ÚNICA da direção que o personagem olha. São DOIS campos e eles têm
  // que andar SEMPRE juntos: _facingDir (baixo/cima/esquerda/direita) move a
  // folha de ANDAR e a caixa do GOLPE; _facingLeft move o espelhamento do
  // desenho. Escrever só um deixa o outro sistema mudo (bug silencioso: "virar
  // para o inimigo" + "golpear" nunca acertava).
  function setFacing(c, dx, dy) {
    if (!c || typeof c !== 'object') return;
    if (!dx && !dy) return; // parado: mantém a última direção
    if (Math.abs(dx) >= Math.abs(dy)) c._facingDir = dx < 0 ? 'left' : 'right';
    else c._facingDir = dy < 0 ? 'up' : 'down';
    c._facingLeft = (c._facingDir === 'left');
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
      setFacing(c, dx, dy); // direção dominante → linha da folha de andar
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
    // velocidade). Alimenta a folha de andar direcional. ⚠️ Carimbo de quadro: só
    // mede UMA vez por quadro por entidade — desenhar o mesmo personagem 2× (ex.:
    // "por profundidade" + "desenhar o personagem") congelava a animação de andar,
    // porque a 2ª medida comparava x com ele mesmo.
    if (c._moveFrame !== frameCount) {
      c._moveFrame = frameCount;
      c._moving = (Math.abs(num(c.x, 0) - num(c._lastX, 0)) > 0.01 ||
                   Math.abs(num(c.y, 0) - num(c._lastY, 0)) > 0.01);
      c._lastX = c.x; c._lastY = c.y;
    }
    var prevAlpha = 1;
    // A opacidade da criança (🌫️ "sumir aos poucos") MULTIPLICA o piscar do dano:
    // um herói meio transparente que leva hit tem que piscar transparente.
    var ownAlpha = Math.max(0, Math.min(1, num(c.opacity, 1)));
    var blinking = c._iFrames > 0 || ownAlpha < 1;
    if (blinking) {
      try { prevAlpha = ctx2d.globalAlpha; } catch (e) {}
      // FLASH_SPEED 10 do P24 (0.1 + 0.8·|sin|).
      var flash = c._iFrames > 0 ? 0.1 + 0.8 * Math.abs(Math.sin(c._iFrames * 10)) : 1;
      try { ctx2d.globalAlpha = flash * ownAlpha; } catch (e) {}
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
      // Fallback do kit: retângulo da cor com contorno branco. Dentro de save/
      // restore: sem isso a cor/contorno VAZAVAM para os blocos de Canvas que a
      // criança usa depois no "Desenhar o jogo".
      ctx2d.save();
      ctx2d.fillStyle = text(c.color, '#4a9eff');
      ctx2d.fillRect(lx, ly, c.w, c.h);
      ctx2d.strokeStyle = 'white';
      ctx2d.strokeRect(lx, ly, c.w, c.h);
      ctx2d.restore();
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

  // ---- 📦 Hitbox: a caixa que COLIDE ≠ o desenho ----
  // No Pokémon do Chris Courses a hitbox é o sprite INTEIRO (48×68 num tile de
  // 48) e o herói colide com a própria CABEÇA — passar entre dois obstáculos fica
  // errado. Em jogo de verdade a caixa é só os PÉS. Aqui: _hbW/_hbH em 0 = "usa o
  // desenho todo" (é o padrão, então nada muda em quem não mexer).
  function setHitbox(who, ox, oy, w, h) {
    if (!who || typeof who !== 'object') return;
    who._hbX = num(ox, 0);
    who._hbY = num(oy, 0);
    who._hbW = Math.max(0, num(w, 0));
    who._hbH = Math.max(0, num(h, 0));
  }
  function hbLeft(e) { return num(e.x, 0) + num(e._hbX, 0); }
  function hbTop(e) { return num(e.y, 0) + num(e._hbY, 0); }
  function hbW(e) { var v = num(e._hbW, 0); return v > 0 ? v : num(e.w, 0); }
  function hbH(e) { var v = num(e._hbH, 0); return v > 0 ? v : num(e.h, 0); }
  function hbRight(e) { return hbLeft(e) + hbW(e); }
  function hbBottom(e) { return hbTop(e) + hbH(e); }
  function touching(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    return (
      hbLeft(a) < hbRight(b) && hbRight(a) > hbLeft(b) && hbTop(a) < hbBottom(b) && hbBottom(a) > hbTop(b)
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
      _lastX: 0, _lastY: 0, _moving: false, _moveFrame: -1,
      _swingT: 0, _swingRange: 0, _swingId: 0, _hitBySwing: 0,
      // ⚙️ Física geral (o pool exige a lista COMPLETA: ver o reset no spawnFromMold)
      onGround: false, _maxFall: 0, _cd: 0, _prevX: 0, _prevY: 0,
      // 🏃 Kit Plataforma (idem — reciclar sem zerar ressuscitaria o inimigo com o
      // coyote/pulo do anterior)
      _bornX: 0, _bornY: 0, _coyoteT: 0, _bufferT: 0, _holdT: 0, _airJumps: 0,
      _wallDir: 0, _wallSide: 0, _wallT: 0, _wallLockT: 0, _dropT: 0,
      _platT: 0, _carryX: 0, _carryY: 0, _patrolDir: 0, _patrolWas: 0,
      _platFrames: null,
      // Nasciam por atribuição TARDIA (no drift/patrolAround) — o que anula o
      // propósito desta função: toda entidade que anda mudava de shape.
      _driftTimer: 0, _patrolTX: 0, _patrolTY: 0, _patrolTimer: 0,
      // 🌫️ R15: opacidade (1 = opaco) e a caixa que COLIDE (0 = usa o desenho).
      opacity: 1, _hbX: 0, _hbY: 0, _hbW: 0, _hbH: 0
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
    // Teto por molde (as faíscas já tinham o MAX_PARTICLES): um nascedouro SEM o
    // "Recolher quem saiu da tela" acumulava entidades para sempre e derrubava o
    // FPS sem nenhum aviso — o jogo só ficava lento, off-screen.
    if (pool.active.length >= MAX_ACTIVE_PER_MOLD) {
      warnOnce('moldfull:' + k, 'o molde "' + k + '" chegou a ' + MAX_ACTIVE_PER_MOLD +
        ' no jogo — use "Recolher quem saiu da tela" junto do nascedouro');
      return null;
    }
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
    e._lastX = e.x; e._lastY = e.y; e._moving = false; e._moveFrame = -1;
    // Zera o golpe de ação (senão uma entidade reciclada carrega o rastro/latch).
    e._swingT = 0; e._swingRange = 0; e._swingId = 0; e._hitBySwing = 0;
    // ⚙️ Física: reciclado NÃO pode nascer "no chão" nem com recarga/varredura velhas.
    e.onGround = false; e._maxFall = 0; e._cd = 0; e._prevX = e.x; e._prevY = e.y;
    e._bornX = e.x; e._bornY = e.y;
    e._coyoteT = 0; e._bufferT = 0; e._holdT = 0; e._airJumps = 0;
    e._wallDir = 0; e._wallSide = 0; e._wallT = 0; e._wallLockT = 0; e._dropT = 0;
    e._platT = 0; e._carryX = 0; e._carryY = 0; e._patrolDir = 0; e._patrolWas = 0;
    e._platFrames = null;
    e._driftTimer = 0; e._patrolTX = 0; e._patrolTY = 0; e._patrolTimer = 0;
    e.opacity = 1; e._hbX = 0; e._hbY = 0; e._hbW = 0; e._hbH = 0;
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
      // Dedupado: "Recolher" num personagem criado à mão dentro de uma checagem
      // de colisão sairia 60×/s.
      warnOnce('recycle:nomold', 'só personagens nascidos de um molde podem ser recolhidos');
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
      setFacing(who, dx, dy);
    }
  }
  function drift(who, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    if (who._driftAngle == null) who._driftAngle = Math.random() * Math.PI * 2;
    who._driftTimer = (who._driftTimer || 0) + d;
    if (who._driftTimer >= 2) { who._driftAngle = Math.random() * Math.PI * 2; who._driftTimer = 0; }
    var dx = Math.cos(who._driftAngle);
    var dy = Math.sin(who._driftAngle);
    who.x += dx * num(who.speed, 0) * d;
    who.y += dy * num(who.speed, 0) * d;
    setFacing(who, dx, dy);
  }
  function face(who, target) {
    if (!who || !target || typeof who !== 'object' || typeof target !== 'object') return;
    setFacing(who, centerX(target) - centerX(who), centerY(target) - centerY(who));
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
    setFacing(who, dx, dy); // mirar TAMBÉM vira quem atira (folha de andar/golpe)
  }
  function moveByVelocity(who, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    // Guarda de ONDE veio: a colisão sólida VARRE deste ponto até o atual, senão um
    // quadro lento (dt no teto = 0.1 s) pularia por cima de uma peça inteira.
    who._prevX = num(who.x, 0);
    who._prevY = num(who.y, 0);
    who.x = num(who.x, 0) + num(who.vx, 0) * d;
    who.y = num(who.y, 0) + num(who.vy, 0) * d;
  }
  function setAngle(who, degrees) {
    if (!who || typeof who !== 'object') return;
    who._angle = num(degrees, 0);
  }

  // ============================================================================
  // ⚙️ FÍSICA GERAL (gravidade, pulo, chão, colisão sólida) — os primitivos que
  // valem em QUALQUER jogo: plataforma, corrida, flappy, breakout, top-down livre.
  // Portados do Jogo 2D (que é px/QUADRO) para px/SEGUNDO: gravidade 0.6 → 2160,
  // pulo 11 → 660, velocidade 4 → 240 (×60 velocidade, ×3600 aceleração).
  //
  // ⚠️ CONTRATO DE ORDEM (a criança monta nesta sequência, e é a mesma dos jogos
  // de verdade): 1) aplicar gravidade  2) mover pela velocidade  3) colidir.
  // A gravidade ZERA o "no chão"; só o pouso da colisão marca de volta.
  // ============================================================================

  var TERMINAL_FALL = 900; // teto de queda padrão (px/s) — evita atravessar peça

  function applyGravity(who, g, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    who.vy = num(who.vy, 0) + num(g, 2160) * d;
    // Velocidade terminal: cair para sempre acelerando fura o chão e não existe em
    // jogo nenhum de verdade. ⚠️ 0 = "não escolhi" → usa o padrão (num(0, X) daria
    // 0, e aí NADA cairia).
    var mf = num(who._maxFall, 0);
    var maxFall = mf > 0 ? mf : TERMINAL_FALL;
    if (who.vy > maxFall) who.vy = maxFall;
    who.onGround = false; // só a colisão (pouso) marca de volta
    who._wallDir = 0; // idem para a parede (Kit Plataforma)
  }
  function setTerminalVelocity(who, max) {
    if (!who || typeof who !== 'object') return;
    who._maxFall = Math.max(1, num(max, TERMINAL_FALL));
  }
  function setVelocity(who, vx, vy) {
    if (!who || typeof who !== 'object') return;
    who.vx = num(vx, 0);
    who.vy = num(vy, 0);
  }
  function velocityOf(who, axis) {
    if (!who || typeof who !== 'object') return 0;
    return text(axis, 'x') === 'y' ? num(who.vy, 0) : num(who.vx, 0);
  }
  function isOnGround(who) {
    return !!(who && typeof who === 'object' && who.onGround);
  }
  /** Pulo: SÓ funciona com os pés no chão. Sem essa trava vira voo infinito — é o
   * erro nº 1 dos tutoriais (um deles testa "velocidade y === 0", que também é
   * verdade no ÁPICE do pulo, e ganha um pulo duplo sem querer). */
  function jump(who, force) {
    if (!who || typeof who !== 'object') return;
    if (!who.onGround) return;
    who.vy = -Math.abs(num(force, 660));
    who.onGround = false;
  }

  // ---- 🧱 Colisão sólida (o resolvedor do Jogo 2D, agora com VARREDURA) ----
  // Resolve pelo eixo de MENOR sobreposição (empurra para fora pelo lado mais
  // curto) e só marca "no chão" no POUSO (caindo, vy > 0).
  function resolveSolid(who, tx, ty, tw, th, byCenter) {
    var overlapX = Math.min(num(who.x, 0) + num(who.w, 0), tx + tw) - Math.max(num(who.x, 0), tx);
    var overlapY = Math.min(num(who.y, 0) + num(who.h, 0), ty + th) - Math.max(num(who.y, 0), ty);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) {
      var leftward = byCenter ? (centerX(who) < tx + tw / 2) : (num(who.x, 0) < tx);
      who.x = num(who.x, 0) + (leftward ? -overlapX : overlapX);
      who.vx = 0;
      // De que LADO ficou a parede: empurrei para a esquerda = parede à direita.
      // Espelha o onGround (a gravidade zera, a colisão marca) e é o que o Kit
      // Plataforma lê para o wall jump / deslizar na parede.
      who._wallDir = leftward ? 1 : -1;
    } else {
      var upward = byCenter ? (centerY(who) < ty + th / 2) : (num(who.y, 0) < ty);
      if (upward) {
        who.y = num(who.y, 0) - overlapY;
        if (num(who.vy, 0) > 0) { who.vy = 0; who.onGround = true; } // POUSO
      } else {
        who.y = num(who.y, 0) + overlapY;
        if (num(who.vy, 0) < 0) who.vy = 0; // bateu a cabeça
      }
    }
  }
  /** Roda o resolvedor em PEDAÇOS do movimento deste quadro (varredura): num
   * quadro lento o personagem anda mais que uma peça de uma vez e passaria direto
   * pelo chão — o resolvedor só olha as células que ele ocupa AGORA. */
  // ⚠️ O resolvedor de um passo é escolhido por um ALVO de módulo, não por uma
  // closure passada. Motivo: o caminho canônico é "para cada vivo do molde →
  // colidir com o chão", e com o teto de 300 ativos isso alocaria ~18 mil closures
  // por segundo. O arquivo já evita isso no depthList e no swingRect.
  var sweepWho = null;
  var sweepMap = null;
  var sweepPool = null;
  function sweepStepTilemap() {
    var who = sweepWho, m = sweepMap;
    var t = tilePx;
    var c0 = Math.floor(num(who.x, 0) / t);
    var c1 = Math.floor((num(who.x, 0) + num(who.w, 0) - 1) / t);
    var r0 = Math.floor(num(who.y, 0) / t);
    var r1 = Math.floor((num(who.y, 0) + num(who.h, 0) - 1) / t);
    for (var r = r0; r <= r1; r++) {
      var rowArr = m.rows[r];
      if (!rowArr) continue;
      for (var c = c0; c <= c1; c++) {
        var idx = rowArr[c];
        if (idx == null || idx < 0 || !m.solid[idx]) continue;
        resolveSolid(who, c * t, r * t, t, t, false);
      }
    }
  }
  function sweepStepGroup() {
    var who = sweepWho;
    var act = sweepPool.active;
    for (var i = 0; i < act.length; i++) {
      var o = act[i];
      if (o === who || o._active === false) continue;
      resolveSolid(who, num(o.x, 0), num(o.y, 0), num(o.w, 0), num(o.h, 0), true);
    }
  }
  /** Roda o resolvedor em PEDAÇOS do movimento deste quadro (varredura): num
   * quadro lento o personagem anda mais que uma peça de uma vez e passaria direto
   * pelo chão — o resolvedor só olha as células que ele ocupa AGORA. */
  function sweepSolid(who, resolveOne) {
    var px = num(who._prevX, num(who.x, 0));
    var py = num(who._prevY, num(who.y, 0));
    var dx = num(who.x, 0) - px;
    var dy = num(who.y, 0) - py;
    var dist = Math.max(Math.abs(dx), Math.abs(dy));
    var half = Math.max(4, tilePx / 2);
    var steps = dist > half ? Math.min(16, Math.ceil(dist / half)) : 1;
    if (steps > 1) {
      who.x = px; who.y = py;
      var sx = dx / steps;
      var sy = dy / steps;
      for (var i = 0; i < steps; i++) {
        who.x = num(who.x, 0) + sx;
        who.y = num(who.y, 0) + sy;
        resolveOne();
      }
    } else {
      resolveOne();
    }
    who._prevX = num(who.x, 0);
    who._prevY = num(who.y, 0);
  }
  function collideTilemap(who, mapName) {
    if (!who || typeof who !== 'object') return;
    var mk = text(mapName, '');
    var m = tilemaps[mk];
    if (!m || !m.rows) {
      warnOnce('colmap:' + mk, 'o mapa "' + mk + '" não existe — carregue com "Carregar o mapa"');
      return;
    }
    sweepWho = who;
    sweepMap = m;
    sweepSolid(who, sweepStepTilemap);
    sweepWho = null;
    sweepMap = null;
  }
  function collideGroup(who, moldName) {
    if (!who || typeof who !== 'object') return;
    var ck = text(moldName, '');
    var pool = pools[ck];
    if (!pool) { warnOnce('colgrp:' + ck, 'o molde "' + ck + '" não existe — crie com "Criar o molde"'); return; }
    sweepWho = who;
    sweepPool = pool;
    sweepSolid(who, sweepStepGroup);
    sweepWho = null;
    sweepPool = null;
  }
  /** Cada PAR (a, b) que se encosta — o tiro×inimigo sem dois laços na mão. */
  function overlapGroups(moldA, moldB, fn) {
    var ka = text(moldA, '');
    var kb = text(moldB, '');
    var pa = pools[ka];
    var pb = pools[kb];
    if (typeof fn !== 'function') return;
    if (!pa) { warnOnce('overlap:' + ka, 'o molde "' + ka + '" não existe — crie com "Criar o molde"'); return; }
    if (!pb) { warnOnce('overlap:' + kb, 'o molde "' + kb + '" não existe — crie com "Criar o molde"'); return; }
    pa._sweeping = true;
    pb._sweeping = true;
    var warned = false;
    for (var i = pa.active.length - 1; i >= 0; i--) {
      var a = pa.active[i];
      if (!a || a._active === false) continue;
      for (var j = pb.active.length - 1; j >= 0; j--) {
        var b = pb.active[j];
        if (!b || b._active === false || b === a) continue;
        if (!touching(a, b)) continue;
        try { fn(a, b); } catch (e) {
          if (!warned) { warned = true; warn('erro no "para cada par que se encosta": ' + e); }
        }
        // ⭐ O corpo quase sempre RECOLHE o "a" (é o tiro que acertou). Como a
        // varredura está ligada, o recolher só MARCA e deixa o "a" no active[] —
        // sem esta parada o MESMO tiro seguiria colidindo com todos os inimigos
        // sobrepostos e derrubaria 3-4 de uma vez (placar pulando, intermitente).
        // O irmão "para cada vivo" já recheca assim.
        if (a._active === false) break;
      }
    }
    pa._sweeping = false;
    pb._sweeping = false;
    compact(pa);
    if (pb !== pa) compact(pb);
  }

  // ---- 🔄 Bordas ----
  function bounceOnEdges(who) {
    if (!who || typeof who !== 'object') return;
    var w = camera.on ? camera.worldW : config.w;
    var h = camera.on ? camera.worldH : config.h;
    if (num(who.x, 0) <= 0) { who.x = 0; who.vx = Math.abs(num(who.vx, 0)); }
    else if (num(who.x, 0) + num(who.w, 0) >= w) { who.x = w - num(who.w, 0); who.vx = -Math.abs(num(who.vx, 0)); }
    if (num(who.y, 0) <= 0) { who.y = 0; who.vy = Math.abs(num(who.vy, 0)); }
    else if (num(who.y, 0) + num(who.h, 0) >= h) { who.y = h - num(who.h, 0); who.vy = -Math.abs(num(who.vy, 0)); }
    who._prevX = who.x; // o clamp na borda também é reposicionamento, não caminho
    who._prevY = who.y;
  }
  function wrapEdges(who) {
    if (!who || typeof who !== 'object') return;
    var w = camera.on ? camera.worldW : config.w;
    var h = camera.on ? camera.worldH : config.h;
    if (num(who.x, 0) + num(who.w, 0) < 0) who.x = w;
    else if (num(who.x, 0) > w) who.x = -num(who.w, 0);
    if (num(who.y, 0) + num(who.h, 0) < 0) who.y = h;
    else if (num(who.y, 0) > h) who.y = -num(who.h, 0);
    // ⚠️ Emendar a borda é TELEPORTE: sem zerar a varredura, a colisão sólida do
    // mesmo quadro tentaria varrer da direita do mapa até a esquerda e PARARIA na
    // primeira peça do caminho ("saí pela direita e apareci grudado no meio").
    who._prevX = who.x;
    who._prevY = who.y;
  }

  // ---- ⏱️ Tempo (acumulador de dt — NÃO relógio de parede: pausa tem que pausar) ----
  var secondTimers = Object.create(null);
  function everySeconds(key, secs) {
    var k = text(key, 't');
    var period = Math.max(0.01, num(secs, 1));
    var acc = num(secondTimers[k], 0) + currentDt;
    if (acc >= period) { secondTimers[k] = 0; return true; }
    secondTimers[k] = acc;
    return false;
  }
  /** Cooldown POR personagem, em segundos (recarga do tiro, do golpe…). */
  function cooldownReady(who, secs) {
    if (!who || typeof who !== 'object') return false;
    var cd = num(who._cd, 0) - currentDt;
    if (cd > 0) { who._cd = cd; return false; }
    who._cd = Math.max(0.01, num(secs, 0.5));
    return true;
  }

  // ---- 🗺️ Peça por célula (ler/escrever o mapa em jogo) ----
  function tileAt(mapName, x, y) {
    var ak = text(mapName, '');
    var m = tilemaps[ak];
    if (!m || !m.rows) { warnOnce('tileat:' + ak, 'o mapa "' + ak + '" não existe — carregue com "Carregar o mapa"'); return -1; }
    var col = Math.floor(num(x, 0) / tilePx);
    var row = Math.floor(num(y, 0) / tilePx);
    var r = m.rows[row];
    if (!r || col < 0 || col >= r.length) return -1;
    var v = r[col];
    return typeof v === 'number' ? v : -1;
  }
  function setTileAt(mapName, x, y, index) {
    var stk = text(mapName, '');
    var m = tilemaps[stk];
    if (!m || !m.rows) { warnOnce('settile:' + stk, 'o mapa "' + stk + '" não existe — carregue com "Carregar o mapa"'); return; }
    var col = Math.floor(num(x, 0) / tilePx);
    var row = Math.floor(num(y, 0) / tilePx);
    var r = m.rows[row];
    if (!r || col < 0 || col >= r.length) return;
    r[col] = Math.floor(num(index, -1));
  }
  function breakTileAt(mapName, who) {
    if (!who || typeof who !== 'object') return;
    setTileAt(mapName, centerX(who), centerY(who), -1);
  }
  function setTileSize(px) {
    tilePx = Math.max(4, Math.round(num(px, 64)));
  }

  // ---- 🧍 Propriedade da entidade (ler/escrever o que move o jogo) ----
  var ENTITY_PROPS = { x: 1, y: 1, vx: 1, vy: 1, speed: 1, w: 1, h: 1, health: 1 };
  function propertyOf(who, prop) {
    if (!who || typeof who !== 'object') return 0;
    var p = text(prop, 'x');
    return ENTITY_PROPS[p] ? num(who[p], 0) : 0;
  }
  function setProperty(who, prop, value) {
    if (!who || typeof who !== 'object') return;
    var p = text(prop, 'x');
    if (!ENTITY_PROPS[p]) return;
    who[p] = num(value, 0);
    // Mudar x/y à mão é TELEPORTE (porta, cano, botão) — zera a varredura, senão a
    // colisão do mesmo quadro arrasta o personagem de volta pelo caminho todo.
    if (p === 'x') who._prevX = who.x;
    else if (p === 'y') who._prevY = who.y;
  }
  function setFacingDir(who, dir) {
    if (!who || typeof who !== 'object') return;
    var d = text(dir, 'down');
    if (d !== 'left' && d !== 'right' && d !== 'up' && d !== 'down') return;
    who._facingDir = d;
    who._facingLeft = (d === 'left');
  }
  function facingOf(who) {
    return (who && typeof who === 'object') ? text(who._facingDir, 'down') : 'down';
  }

  // ---- ✨ Tween (mover suave até um ponto) ----
  var tweens = [];
  /** Uma entrada de tween por PROPRIEDADE (era só x/y juntos). Regravar a mesma
   * propriedade do mesmo personagem substitui a anterior. */
  function pushTween(who, prop, to, secs, notify) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      if (tweens[i].e === who && tweens[i].p === prop) tweens.splice(i, 1);
    }
    tweens.push({
      e: who, p: prop, f: num(who[prop], 0), to: num(to, 0),
      t: 0, d: Math.max(0.01, num(secs, 0.5)), ev: !!notify
    });
  }
  function tweenTo(who, x, y, secs) {
    if (!who || typeof who !== 'object') return;
    pushTween(who, 'x', x, secs, false);
    pushTween(who, 'y', y, secs, true); // só o Y avisa: um "cheguei" por deslize
  }
  function tweenProperty(who, prop, to, secs) {
    if (!who || typeof who !== 'object') return;
    var pr = text(prop, 'x');
    if (!ENTITY_PROPS[pr] && pr !== 'opacity') {
      warnOnce('tweenprop:' + pr, 'não dá para deslizar a propriedade "' + pr + '"');
      return;
    }
    pushTween(who, pr, to, secs, true);
  }
  function fadeTo(who, percent, secs) {
    if (!who || typeof who !== 'object') return;
    pushTween(who, 'opacity', Math.max(0, Math.min(1, num(percent, 0) / 100)), secs, true);
  }
  function stepTweens(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i];
      tw.t += dt;
      var p = Math.min(1, tw.t / tw.d);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease-in-out
      tw.e[tw.p] = tw.f + (tw.to - tw.f) * e;
      if (p >= 1) {
        tweens.splice(i, 1);
        // ⚠️ Sem este aviso era IMPOSSÍVEL encadear (o tween sumia calado) — é o
        // que destrava caminho por pontos, torre atirando em rota, cutscene.
        if (tw.ev) emit('deslizou:chegou', tw.e);
      }
    }
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

  // ============================================================================
  // 🧭 REGIÕES · 🎲 SORTE · 🌫️ OPACIDADE · 🎬 TRANSIÇÃO · 💾 MEMÓRIA · 🎵 MÚSICA
  // Primitivos GERAIS (fora de todo kit) — o "lado de fora" que faz qualquer
  // gênero existir. Vieram do review #3 + da leitura do Pokémon do Chris Courses.
  // ============================================================================

  // ---- 🧭 Regiões (um retângulo com nome: a grama alta, a porta, a zona segura) ----
  var regions = Object.create(null);
  function defineRegion(name, x, y, w, h) {
    var k = text(name, '');
    if (!k) { warn('"Criar a região" precisa de um nome'); return; }
    regions[k] = { x: num(x, 0), y: num(y, 0), w: Math.max(1, num(w, 64)), h: Math.max(1, num(h, 64)) };
  }
  function regionOf(name) {
    var k = text(name, '');
    var r = regions[k];
    if (!r) warnOnce('region:' + k, 'a região "' + k + '" não existe — crie com "Criar a região"');
    return r || null;
  }
  function isInside(who, name) {
    var r = regionOf(name);
    if (!r || !who || typeof who !== 'object') return false;
    return (
      hbLeft(who) < r.x + r.w && hbRight(who) > r.x && hbTop(who) < r.y + r.h && hbBottom(who) > r.y
    );
  }
  /** Quanto do corpo está DENTRO da região, de 0 a 100.
   * ⭐ A joia escondida do Pokémon do Chris Courses: o encontro na grama só conta
   * com MAIS DA METADE do corpo dentro do mato — sem isso, 1 px de encosto já
   * sorteia e o jogo fica nervoso.
   * ⚠️ No original a área é calculada ANTES de checar a colisão: sem sobreposição
   * os dois fatores ficam NEGATIVOS e o produto vira positivo grande (só não
   * explode porque o && curto-circuita). Aqui os lados são clampados em 0. */
  function overlapPercent(who, name) {
    var r = regionOf(name);
    if (!r || !who || typeof who !== 'object') return 0;
    var iw = Math.min(hbRight(who), r.x + r.w) - Math.max(hbLeft(who), r.x);
    var ih = Math.min(hbBottom(who), r.y + r.h) - Math.max(hbTop(who), r.y);
    if (iw <= 0 || ih <= 0) return 0; // sem toque = 0, nunca "negativo × negativo"
    var mine = hbW(who) * hbH(who);
    if (!(mine > 0)) return 0;
    return Math.min(100, (iw * ih) / mine * 100);
  }

  // ---- 🎲 Sorte ----
  function chance(percent) {
    return Math.random() * 100 < num(percent, 50);
  }

  // ---- 📏 Distância / ponto ----
  function distanceBetween(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return 0;
    var dx = centerX(a) - centerX(b);
    var dy = centerY(a) - centerY(b);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function pointIn(x, y, who) {
    if (!who || typeof who !== 'object') return false;
    var px = num(x, 0), py = num(y, 0);
    return px >= hbLeft(who) && px <= hbRight(who) && py >= hbTop(who) && py <= hbBottom(who);
  }

  // ---- 🎯 Mirar num PONTO / num ÂNGULO ----
  // O "Lançar na direção" exige um personagem-alvo, mas o mouse dá NÚMEROS; e o
  // "Girar para X graus" só mexe no DESENHO. Sem estes dois, tiro mirado no
  // mouse, bullet hell, asteroids e tanque só saíam com sen/cos na unha — e aí o
  // visual e a lógica dessincronizavam por conta da criança.
  function launchToPoint(who, x, y, speed) {
    if (!who || typeof who !== 'object') return;
    var v = num(speed, 400);
    var dx = num(x, 0) - centerX(who);
    var dy = num(y, 0) - centerY(who);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 0)) { who.vx = v; who.vy = 0; return; }
    who.vx = (dx / len) * v;
    who.vy = (dy / len) * v;
    setFacing(who, dx, dy);
  }
  function setVelocityAngle(who, degrees, force) {
    if (!who || typeof who !== 'object') return;
    var r = num(degrees, 0) * Math.PI / 180;
    var f = num(force, 200);
    who.vx = Math.cos(r) * f;
    who.vy = Math.sin(r) * f;
    setFacing(who, who.vx, who.vy);
  }

  // ---- 🌫️ Opacidade (o "faint" do Pokémon: afunda e SOME) ----
  function setOpacity(who, percent) {
    if (!who || typeof who !== 'object') return;
    who.opacity = Math.max(0, Math.min(1, num(percent, 100) / 100));
  }
  function opacityOf(who) {
    if (!who || typeof who !== 'object') return 100;
    return Math.round(num(who.opacity, 1) * 100);
  }

  // ---- 🎬 Transição de tela (esconder a troca de cena atrás do preto) ----
  var screenFx = { color: '#000000', alpha: 0, target: 0, speed: 0, flashes: 0 };
  function fadeScreen(color, seconds, toDark) {
    screenFx.color = text(color, '#000000');
    screenFx.target = toDark ? 1 : 0;
    if (!toDark && screenFx.alpha === 0) screenFx.alpha = 1; // "abrir" começa fechado
    var s = Math.max(0.01, num(seconds, 0.4));
    screenFx.speed = 1 / s;
    screenFx.flashes = 0;
  }
  function flashScreen(color, times) {
    screenFx.color = text(color, '#ffffff');
    screenFx.flashes = Math.max(1, Math.round(num(times, 3))) * 2;
    screenFx.speed = 1 / 0.12;
    screenFx.target = 1;
    screenFx.alpha = 0;
  }
  function stepScreenFx(dt) {
    if (screenFx.flashes > 0) {
      screenFx.alpha += (screenFx.target === 1 ? 1 : -1) * screenFx.speed * dt;
      if (screenFx.alpha >= 1) { screenFx.alpha = 1; screenFx.target = 0; screenFx.flashes -= 1; }
      else if (screenFx.alpha <= 0) { screenFx.alpha = 0; screenFx.target = 1; screenFx.flashes -= 1; }
      if (screenFx.flashes <= 0) { screenFx.alpha = 0; screenFx.flashes = 0; }
      return;
    }
    if (screenFx.alpha === screenFx.target) return;
    var d = screenFx.speed * dt;
    if (screenFx.alpha < screenFx.target) screenFx.alpha = Math.min(screenFx.target, screenFx.alpha + d);
    else screenFx.alpha = Math.max(screenFx.target, screenFx.alpha - d);
  }
  function drawScreenFx() {
    if (!ctx2d || screenFx.alpha <= 0) return;
    var prev = 1;
    try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = Math.min(1, screenFx.alpha); } catch (e) {}
    ctx2d.fillStyle = screenFx.color;
    ctx2d.fillRect(0, 0, config.w, config.h);
    try { ctx2d.globalAlpha = prev; } catch (e) {}
  }

  // ---- 💾 Memória (guardar/ler QUALQUER valor) ----
  // Salvar era refém do Kit RPG (o rpgSave só serializa o mundo rpg.*): sem isto
  // não havia recorde, fase destravada nem "continuar" fora do RPG — e salvar é o
  // conceito mais genérico que existe.
  function saveValue(name, value) {
    var k = text(name, '');
    if (!k) { warn('"Guardar o valor" precisa de um nome'); return; }
    try {
      window.localStorage.setItem('szgk-val-' + k, JSON.stringify(value === undefined ? null : value));
    } catch (e) { warnOnce('saveval', 'não deu para guardar o valor (memória cheia?)'); }
  }
  function savedValue(name) {
    var k = text(name, '');
    try {
      var raw = window.localStorage.getItem('szgk-val-' + k);
      if (raw == null) return 0;
      var v = JSON.parse(raw);
      return v == null ? 0 : v;
    } catch (e) { return 0; }
  }

  // ---- 🎵 Música (o runtime NÃO tinha: zero loop, sem parar, sem volume) ----
  function playMusic(name) {
    var a = sounds[text(name, '')];
    if (!a) { warnOnce('music:' + text(name, ''), 'o som "' + text(name, '') + '" não foi carregado — use "Carregar o som"'); return; }
    try {
      a.loop = true;
      if (!a.paused) return; // re-chamar não reinicia a música
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function () {});
    } catch (e) {}
  }
  function stopSound(name) {
    var a = sounds[text(name, '')];
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
  }
  function setVolume(name, level) {
    var a = sounds[text(name, '')];
    if (!a) return;
    try { a.volume = Math.max(0, Math.min(1, num(level, 1))); } catch (e) {}
  }

  // ---- 🗺️ Mapa por CÓDIGO (masmorra sorteada, mundo gerado) ----
  function createEmptyTilemap(name, cols, rows, fill, assetName) {
    var nm = text(name, '');
    if (!nm) { warn('"Criar o mapa vazio" precisa de um nome'); return; }
    var c = Math.max(1, Math.min(512, Math.round(num(cols, 20))));
    var r = Math.max(1, Math.min(512, Math.round(num(rows, 15))));
    var f = Math.round(num(fill, -1));
    var grid = [];
    for (var i = 0; i < r; i++) {
      var row = [];
      for (var j = 0; j < c; j++) row.push(f);
      grid.push(row);
    }
    var an = text(assetName, '');
    var imgKey = '__tm_' + nm;
    var solid = Object.create(null);
    var art = 32;
    if (an) {
      var entry = Object.prototype.hasOwnProperty.call(ASSET_META, an) ? ASSET_META[an] : null;
      var ts = entry && entry.tileset;
      if (ts && typeof ts.tileSize === 'number' && ts.tileSize > 0) art = ts.tileSize;
      if (ts && ts.solid && typeof ts.solid.length === 'number') {
        for (var s = 0; s < ts.solid.length; s++) {
          var sv = ts.solid[s];
          if (typeof sv === 'number' && sv >= 0) solid[Math.floor(sv)] = true;
        }
      }
      loadImage(imgKey, an);
    }
    tilemaps[nm] = { rows: grid, artTile: art, imgKey: imgKey, solid: solid };
  }

  // ---- 🎮 2º jogador (teclas ESCOLHIDAS) ----
  // O "Mover pelas teclas" tem WASD E setas fixos no MESMO personagem — não dava
  // para ter dois jogadores. Aqui a criança escolhe as 4 teclas.
  function moveWithCustomKeys(who, up, down, left, right, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    var dx = 0, dy = 0;
    if (keys[normKey(up)]) dy -= 1;
    if (keys[normKey(down)]) dy += 1;
    if (keys[normKey(left)]) dx -= 1;
    if (keys[normKey(right)]) dx += 1;
    if (!dx && !dy) return;
    var len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len; // diagonal não é mais rápida
    who.x = num(who.x, 0) + dx * num(who.speed, 0) * num(who.speedMultiplier, 1) * d;
    who.y = num(who.y, 0) + dy * num(who.speed, 0) * num(who.speedMultiplier, 1) * d;
    setFacing(who, dx, dy);
  }
  // ============================================================================
  // 🏃 KIT PLATAFORMA — o atalho do gênero (Mario, Celeste, Sunnyland)
  // ============================================================================
  // A extensão GERAL já faz plataforma "na unha" com os primitivos de ⚙️ Física
  // (gravidade + mover + colidir + pulo). Este kit é o ATALHO: junta tudo num
  // bloco só e acrescenta o que só existe em jogo de plataforma — o "feel" (o que
  // separa um pulo gostoso de um pulo duro), plataformas de atravessar por baixo,
  // pisar no inimigo, escada, wall jump.
  //
  // ⭐ As três peças do pulo bom (as duas primeiras os tutoriais esquecem):
  //  · COYOTE TIME — você ainda pode pular por um instantinho DEPOIS de sair da
  //    beirada. Ninguém percebe; todo mundo sente. Sem ele o jogo parece "duro".
  //  · BUFFER — apertar um tiquinho ANTES de pousar não perde o pulo: o aperto
  //    fica guardado e dispara no pouso.
  //  · PULO VARIÁVEL — segurou, pula alto; deu um toquinho, pula baixinho. O
  //    empurrão é RE-AFIRMADO enquanto segura (até 0,3 s) e soltar CANCELA.
  var jumpFeel = { coyote: 0.1, buffer: 0.1, hold: 0.3 };
  var plat = { cpX: 0, cpY: 0, hasCp: false, gravity: 2160 };
  var PLAT_SPEED_BOOST = 0.3; // correndo pula mais alto (Mario) — vy += |vx| * 0.3
  function setJumpFeel(coyote, buffer, hold, gravity) {
    jumpFeel.coyote = Math.max(0, num(coyote, 0.1));
    jumpFeel.buffer = Math.max(0, num(buffer, 0.1));
    jumpFeel.hold = Math.max(0, num(hold, 0.3));
    plat.gravity = Math.max(1, num(gravity, 2160));
  }
  function platJumpPressed() {
    return justPressed[' '] === true || justPressed.w === true || justPressed.arrowup === true;
  }
  function platJumpHeld() {
    return keys[' '] === true || keys.w === true || keys.arrowup === true;
  }
  /** O empurrão do pulo (com o bônus de correr do Mario). */
  function platImpulse(who, force) {
    who.vy = -(Math.abs(num(force, 660)) + Math.abs(num(who.vx, 0)) * PLAT_SPEED_BOOST);
    who.onGround = false;
  }
  /** Herói de plataforma TUDO-EM-UM: gravidade + setas + pulo com feel + mover.
   * A colisão fica FORA de propósito (o bloco "colidir com o mapa/enxame" vem
   * DEPOIS) — é a ordem de verdade, e é ela que a criança aprende. */
  function platformerHero(who, speed, force, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    // 1) COYOTE e BUFFER medidos ANTES da gravidade — ela zera o onGround.
    if (who.onGround) {
      who._coyoteT = jumpFeel.coyote;
      who._airJumps = 0; // pousou: devolve o pulo duplo
    } else {
      who._coyoteT = Math.max(0, num(who._coyoteT, 0) - d);
    }
    if (platJumpPressed()) who._bufferT = jumpFeel.buffer;
    else who._bufferT = Math.max(0, num(who._bufferT, 0) - d);
    who._dropT = Math.max(0, num(who._dropT, 0) - d); // janela do "descer da plataforma"
    // Parede: a colisão marcou no FIM do quadro passado e a gravidade logo abaixo
    // vai zerar — guarde aqui (o coyote da parede, que o Celeste também tem),
    // senão "deslizar"/"wall jump" nunca veriam parede nenhuma.
    if (num(who._wallDir, 0)) {
      who._wallSide = who._wallDir;
      who._wallT = jumpFeel.coyote;
    } else {
      who._wallT = Math.max(0, num(who._wallT, 0) - d);
    }
    // 2) gravidade
    applyGravity(who, plat.gravity, d);
    // 3) setas (só na horizontal — em plataforma, cima é PULAR). ⚠️ O empurrão do
    // wall jump manda por um tiquinho: sem essa trava, a seta reescreveria o vx no
    // quadro seguinte e o herói grudaria na parede em vez de sair dela.
    who._wallLockT = Math.max(0, num(who._wallLockT, 0) - d);
    var dir = 0;
    if (keys.a || keys.arrowleft) dir -= 1;
    if (keys.d || keys.arrowright) dir += 1;
    if (num(who._wallLockT, 0) <= 0) {
      who.vx = dir * Math.abs(num(speed, 240));
      if (dir) setFacing(who, dir, 0);
    }
    // 4) pulo: o aperto guardado (buffer) encontra o chão recente (coyote)
    if (num(who._bufferT, 0) > 0 && num(who._coyoteT, 0) > 0) {
      who._bufferT = 0;
      who._coyoteT = 0;
      who._holdT = jumpFeel.hold;
      platImpulse(who, force); // o empurrão sai SEMPRE, mesmo num toque de 1 quadro
    }
    // 5) segurando = continua subindo (pulo alto); soltou = cancela (pulo curto)
    if (num(who._holdT, 0) > 0) {
      if (platJumpHeld()) {
        platImpulse(who, force);
        who._holdT = num(who._holdT, 0) - d;
      } else {
        who._holdT = 0;
      }
    }
    // 6) mover
    moveByVelocity(who, d);
  }
  /** Pulo duplo (INVENTADO — nenhum dos jogos-fonte tem): N pulos no AR, e o
   * pouso devolve todos. Chame DEPOIS do herói, no mesmo quadro. */
  function doubleJump(who, force, times) {
    if (!who || typeof who !== 'object') return;
    var max = Math.max(1, Math.round(num(times, 1)));
    // Só no ar, e só se o pulo do chão já não tiver acabado de sair (o
    // platformerHero zera o buffer quando gasta o aperto).
    if (who.onGround || num(who._bufferT, 0) <= 0) return;
    if (num(who._airJumps, 0) >= max) return;
    who._airJumps = num(who._airJumps, 0) + 1;
    who._bufferT = 0;
    who._holdT = jumpFeel.hold;
    platImpulse(who, force);
  }
  /** Deslizar na parede: caindo e encostado, a queda fica LENTA. */
  function wallSlide(who, speed) {
    if (!who || typeof who !== 'object') return;
    if (who.onGround || num(who._wallT, 0) <= 0) return;
    var s = Math.abs(num(speed, 90));
    if (num(who.vy, 0) > s) who.vy = s;
  }
  /** Wall jump: pula para LONGE da parede (o clássico do Celeste). O empurrão
   * horizontal fica travado um tiquinho, senão a seta apagaria ele no quadro
   * seguinte (o herói escreve vx todo quadro). */
  function wallJump(who, forceX, forceY) {
    if (!who || typeof who !== 'object') return;
    if (who.onGround || num(who._wallT, 0) <= 0) return;
    if (num(who._bufferT, 0) <= 0) return;
    var away = -num(who._wallSide, 0); // longe da parede
    if (!away) return;
    who._bufferT = 0;
    who._holdT = 0; // o empurrão do wall jump é fixo: segurar não estica
    who._wallLockT = 0.15;
    who._wallT = 0;
    who._airJumps = 0; // a parede devolve o pulo duplo (é o combo do Celeste)
    who.vy = -Math.abs(num(forceY, 660));
    who.vx = away * Math.abs(num(forceX, 300));
    who.onGround = false;
    setFacing(who, away, 0);
  }
  /** Escada (INVENTADO): em cima da peça de escada, cima/baixo sobem e descem e a
   * gravidade não vale. Chame DEPOIS do herói e ANTES de colidir. */
  function climbLadder(who, mapName, tileIndex, speed) {
    if (!who || typeof who !== 'object') return;
    var want = Math.round(num(tileIndex, 0));
    if (tileAt(mapName, centerX(who), centerY(who)) !== want) return;
    var s = Math.abs(num(speed, 160));
    var dy = 0;
    if (keys.w || keys.arrowup) dy -= 1;
    if (keys.s || keys.arrowdown) dy += 1;
    if (dy) {
      // ⚠️ Na escada, ↑ é SUBIR — não pular. O herói roda antes daqui e já tratou
      // o ↑/W como pulo (são a mesma tecla): desfaça, senão sair do topo ainda
      // segurando ↑ dispara o empurrão guardado e a criança "voa" sem entender.
      who._holdT = 0;
      who._bufferT = 0;
      who.vy = dy * s; // subir/descer manda: a gravidade deste quadro é anulada
    } else if (num(who._holdT, 0) > 0) {
      return; // pulou da escada (espaço): deixa o pulo acontecer
    } else {
      who.vy = 0; // parado na escada = fica pendurado
    }
    who.onGround = true; // dá para pular DA escada
  }
  /** Plataforma de atravessar por baixo (one-way). ⭐ Técnica do Sunnyland
   * (Platform.js): NÃO testa sobreposição — testa se os pés CRUZAM o plano do
   * topo neste quadro (posição de agora × posição de agora + vy·dt). Por isso não
   * fura numa queda rápida, e subir por baixo passa direto. */
  function oneWayPlatform(who, moldName, dt) {
    if (!who || typeof who !== 'object') return;
    var ok = text(moldName, '');
    var pool = pools[ok];
    if (!pool) { warnOnce('oneway:' + ok, 'o molde "' + ok + '" não existe — crie com "Criar o molde"'); return; }
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    if (num(who.vy, 0) < 0) return; // subindo: atravessa
    if (who._dropT > 0) return; // pediu para descer (↓): ignora as plataformas
    var feet = num(who.y, 0) + num(who.h, 0);
    var feetNext = feet + num(who.vy, 0) * d;
    var act = pool.active;
    for (var i = 0; i < act.length; i++) {
      var p = act[i];
      if (p === who || p._active === false) continue;
      var top = num(p.y, 0);
      if (feet > top) continue; // já estava abaixo do topo: não é pouso
      if (feetNext < top) continue; // não alcança o plano neste quadro
      if (num(who.x, 0) + num(who.w, 0) <= num(p.x, 0)) continue;
      if (num(who.x, 0) >= num(p.x, 0) + num(p.w, 0)) continue;
      who.y = top - num(who.h, 0);
      who.vy = 0;
      who.onGround = true;
      who._prevY = who.y; // a varredura não deve desfazer este pouso
      return;
    }
  }
  /** Descer de uma plataforma one-way (↓ + pulo) — abre uma janelinha em que ela
   * é ignorada. */
  function dropThrough(who) {
    if (!who || typeof who !== 'object') return;
    if (!(keys.s || keys.arrowdown)) return;
    if (!platJumpPressed()) return;
    who._dropT = 0.25;
    who.onGround = false;
  }
  /** Plataforma que anda (INVENTADO) e CARREGA quem está em cima: guarda o quanto
   * ela andou e soma em quem pegou carona. Sem isso o herói "escorrega" dela. */
  function movingPlatform(who, x1, y1, x2, y2, seconds, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    var dur = Math.max(0.1, num(seconds, 2));
    who._platT = num(who._platT, 0) + d / dur;
    // Vai-e-volta suave (0→1→0) sem precisar de estado de direção.
    var t = who._platT % 2;
    var k = t > 1 ? 2 - t : t;
    var ease = k * k * (3 - 2 * k); // suaviza as pontas (smoothstep)
    var nx = num(x1, 0) + (num(x2, 0) - num(x1, 0)) * ease;
    var ny = num(y1, 0) + (num(y2, 0) - num(y1, 0)) * ease;
    who._carryX = nx - num(who.x, 0);
    who._carryY = ny - num(who.y, 0);
    who.x = nx;
    who.y = ny;
    who._prevX = nx;
    who._prevY = ny;
  }
  /** Pega carona: quem está em cima anda junto com a plataforma. */
  function rideOn(who, moldName) {
    if (!who || typeof who !== 'object') return;
    var rk = text(moldName, '');
    var pool = pools[rk];
    if (!pool) { warnOnce('ride:' + rk, 'o molde "' + rk + '" não existe — crie com "Criar o molde"'); return; }
    var act = pool.active;
    var feet = num(who.y, 0) + num(who.h, 0);
    for (var i = 0; i < act.length; i++) {
      var p = act[i];
      if (p._active === false) continue;
      if (Math.abs(feet - num(p.y, 0)) > 4) continue; // não está em cima
      if (num(who.x, 0) + num(who.w, 0) <= num(p.x, 0)) continue;
      if (num(who.x, 0) >= num(p.x, 0) + num(p.w, 0)) continue;
      who.x = num(who.x, 0) + num(p._carryX, 0);
      who.y = num(who.y, 0) + num(p._carryY, 0);
      who._prevX = num(who.x, 0);
      who._prevY = num(who.y, 0);
      who.onGround = true;
      return;
    }
  }
  /** Pisar no inimigo. ⭐ Técnica do Super Mario (Stomper.js): compara as
   * VELOCIDADES (us.vel.y > them.vel.y) em vez de olhar o lado — assim funciona
   * mesmo se os dois estiverem caindo, e um inimigo subindo te machuca. Quem
   * pisou QUICA; quem levou é recolhido e sai o aviso "plataforma:pisou". */
  function stompKill(who, moldName, bounce) {
    if (!who || typeof who !== 'object') return;
    var sk = text(moldName, '');
    var pool = pools[sk];
    if (!pool) { warnOnce('stomp:' + sk, 'o molde "' + sk + '" não existe — crie com "Criar o molde"'); return; }
    var act = pool.active;
    for (var i = act.length - 1; i >= 0; i--) {
      var e = act[i];
      if (e._active === false) continue;
      if (!touching(who, e)) continue;
      if (num(who.vy, 0) <= num(e.vy, 0)) continue; // não estava caindo NELE
      who.y = num(e.y, 0) - num(who.h, 0); // encaixa em cima (bounds.bottom = top)
      who.vy = -Math.abs(num(bounce, 400));
      who.onGround = false;
      who._holdT = 0;
      who._prevY = who.y;
      // ⚠️ Avisar ANTES de recolher: aqui a varredura está DESLIGADA, então o
      // recolher devolve "e" ao pool na hora — e um ouvinte que faça nascer do
      // mesmo molde receberia ESTE objeto de volta, já reescrito.
      emit('plataforma:pisou', e);
      recycle(e);
    }
  }
  /** Patrulha que vira na PAREDE. ⭐ Técnica do Super Mario (PendulumMove.js): a
   * colisão é que manda virar (vx zerado = bateu), em vez de contar passos —
   * então o inimigo nunca cai da beirada errada nem trava na quina. */
  function patrolTurnAtWall(who, speed) {
    if (!who || typeof who !== 'object') return;
    var s = Math.abs(num(speed, 60));
    if (num(who._patrolDir, 0) === 0) who._patrolDir = -1;
    // vx == 0 depois de ter andado = a colisão zerou = bateu numa parede.
    if (num(who._patrolWas, 0) !== 0 && num(who.vx, 0) === 0) {
      who._patrolDir = -num(who._patrolDir, -1);
    }
    who.vx = num(who._patrolDir, -1) * s;
    who._patrolWas = who.vx;
    setFacing(who, who.vx, 0);
  }
  /** Ponto de renascer. */
  function setCheckpoint(x, y) {
    plat.cpX = num(x, 0);
    plat.cpY = num(y, 0);
    plat.hasCp = true;
  }
  function respawn(who) {
    if (!who || typeof who !== 'object') return;
    who.x = plat.hasCp ? plat.cpX : num(who._bornX, num(who.x, 0));
    who.y = plat.hasCp ? plat.cpY : num(who._bornY, num(who.y, 0));
    // Renascer é TELEPORTE, não movimento: zerar a varredura, senão a colisão
    // tentaria varrer do lugar da morte até aqui e travaria no caminho.
    who._prevX = who.x;
    who._prevY = who.y;
    who.vx = 0;
    who.vy = 0;
    who._holdT = 0;
    who._coyoteT = 0;
    who._bufferT = 0;
    who._wallT = 0;
    who._wallSide = 0;
    who._wallDir = 0;
    who._wallLockT = 0;
    who._dropT = 0;
    who._airJumps = 0;
  }
  /** Quadros de um ESTADO do herói (parado/andando/pulando/caindo) — o mapa
   * estado→animação do Sunnyland (Player.js). Declare uma vez por estado. */
  var PLAT_STATES = { parado: 1, andando: 1, pulando: 1, caindo: 1 };
  function platStateFrames(who, state, from, to, fps) {
    if (!who || typeof who !== 'object') return;
    var st = text(state, 'parado');
    if (!PLAT_STATES[st]) {
      warnOnce('platstate:' + st, 'o estado "' + st + '" não existe (use parado, andando, pulando ou caindo)');
      return;
    }
    if (!who._platFrames) who._platFrames = {};
    who._platFrames[st] = { from: Math.max(0, Math.floor(num(from, 0))), to: Math.max(0, Math.floor(num(to, 0))), fps: Math.max(1, num(fps, 8)) };
  }
  /** Animação por ESTADO, lida da FÍSICA (jeito do Sunnyland/Mario): a folha de
   * quadros troca sozinha conforme (no chão, vx, vy) — parado / andando / pulando
   * / caindo. Chame no "A cada quadro", depois de mover. */
  function platformerAnim(who) {
    if (!who || typeof who !== 'object') return;
    var st;
    if (!who.onGround) st = num(who.vy, 0) < 0 ? 'pulando' : 'caindo';
    else st = Math.abs(num(who.vx, 0)) > 1 ? 'andando' : 'parado';
    // Espelha o desenho pelo lado que anda (o setFacing do herói já decidiu).
    var f = who._platFrames && who._platFrames[st];
    // Sem quadros para o estado do ar? Cai no de andar/parado (folha simples de 2
    // estados é o caso comum) — em vez de congelar sem animação nenhuma.
    if (!f && who._platFrames) f = who._platFrames[st === 'caindo' ? 'pulando' : 'parado'];
    if (!f) return;
    playAnim(who, f.from, f.to, f.fps); // a guarda de transição vive no playAnim
  }

  // ============================================================================
  // 👾 KIT MONSTRINHOS — o atalho do gênero "pegue e treine bichinhos"
  // ============================================================================
  // ⭐ A TESE: um jogo destes É um jogo do Kit RPG com OUTRA batalha. O mundo já
  // existe (grade, NPC, fala, mapa, flags, salvar); o kit é só CRIATURAS +
  // ENCONTROS + a batalha criatura-vs-criatura.
  //
  // Três armadilhas do motor que definem esta arquitetura:
  //  1. A batalha do Kit RPG é DOM (makeScreen + 5 makeButton) — por isso o menu
  //     dela é fixo e nunca saiu dos dados. Aqui a UI é CANVAS: o motor escreve
  //     direto no rpg.menu e herda o desenho, as setas, o espaço e o clique.
  //  2. O stepSystems só roda em 'jogando' — e é ELE que faz playTime += dt,
  //     stepUiInput, stepTweens e stepParticles. Uma batalha em canvas precisa dos
  //     quatro, senão a fala fica com 0 letras PARA SEMPRE. Por isso existe o
  //     stepPkmBattle, chamado do gameLoop FORA do gate de estado.
  //  3. O estado TEM que se chamar 'batalha': o setState só poupa o recomeço
  //     quando prev é 'pausado' ou 'batalha' — um nome novo chamaria rpgNewGame()
  //     ao voltar e APAGARIA o jogo da criança ("ganhei e o jogo recomeçou").
  // O efeito do acerto nasce pronto: é do MOTOR da batalha, não uma escolha da
  // criança (ela nunca declarou "faíscas de batalha").
  var pkmFxReady = false;
  function pkmEnsureFx() {
    if (pkmFxReady) return;
    pkmFxReady = true;
    defineEffect('__pkm_hit', { count: 10, color: '#ffffff', size: 4, life: 0.3, speed: 160, gravity: 0 });
  }
  var pkm = {
    species: Object.create(null),   // nome -> DADOS da espécie (nível 1)
    moves: Object.create(null),     // nome -> {creature, type, dmg, acc, fx, color}
    types: Object.create(null),     // 'fogo|planta' -> multiplicador
    evolve: Object.create(null),    // espécie -> {to, level}
    catchDiff: Object.create(null), // espécie -> multiplicador de captura
    team: [],                       // MEUS indivíduos {species, level, hp, hpMax, xp}
    balls: [],                      // [{power}]
    wild: [],                       // [{species, min, max}] — a tabela do mapa
    grass: Object.create(null),     // 'cx,cy' -> true
    grassTiles: Object.create(null),// índice de peça -> true
    grassMap: '',
    rate: 20,                       // % por PASSO
    battle: null,
    caught: false
  };
  var PKM_XP_PER_LEVEL = 30;

  function pkmKeyType(t) { return text(t, 'normal').trim().toLowerCase(); }

  function pkmCreature(name, type, hp, str, def, spd, image, look) {
    var k = text(name, '');
    if (!k) { warn('"Criatura" precisa de um nome'); return; }
    pkm.species[k] = {
      name: k, type: pkmKeyType(type),
      hp: Math.max(1, num(hp, 30)), str: Math.max(1, num(str, 8)),
      def: Math.max(0, num(def, 4)), spd: Math.max(1, num(spd, 5)),
      image: text(image, ''), look: text(look, ''), moves: []
    };
  }
  function pkmMove(move, creature, type, dmg, acc, fx, color) {
    var mk = text(move, '');
    var ck = text(creature, '');
    if (!mk) { warn('"Ensinar o golpe" precisa de um nome'); return; }
    var sp = pkm.species[ck];
    if (!sp) { warnOnce('pkmsp:' + ck, 'a criatura "' + ck + '" não existe — crie com "Criatura"'); return; }
    pkm.moves[mk] = {
      name: mk, type: pkmKeyType(type), dmg: Math.max(0, num(dmg, 20)),
      acc: Math.max(1, Math.min(100, num(acc, 100))), fx: text(fx, 'investida'),
      color: text(color, '#ffffff')
    };
    if (sp.moves.indexOf(mk) === -1 && sp.moves.length < 4) sp.moves.push(mk);
  }
  /** ⭐ A tabela é de TEXTO LIVRE e vazia: quem escreve "fogo vence planta" é a
   * criança. Uma tabela pronta seria a caixa-preta que a regra rejeita (o jogo
   * teria uma opinião que não é dela), e um dropdown fogo/água/planta proibiria
   * gelo, doce, dinossauro — o oposto de "faça o SEU bichinho". */
  function pkmTypeChart(atk, def, mult) {
    pkm.types[pkmKeyType(atk) + '|' + pkmKeyType(def)] = Math.max(0, num(mult, 2));
  }
  function pkmAdvantage(atkType, defType) {
    var v = pkm.types[pkmKeyType(atkType) + '|' + pkmKeyType(defType)];
    return typeof v === 'number' ? v : 1;
  }
  function pkmEvolve(from, to, level) {
    var f = text(from, '');
    if (!pkm.species[f]) { warnOnce('pkmev:' + f, 'a criatura "' + f + '" não existe'); return; }
    pkm.evolve[f] = { to: text(to, ''), level: Math.max(2, Math.round(num(level, 8))) };
  }
  function pkmCatchDifficulty(name, level) {
    var mult = { 'fácil': 1.6, facil: 1.6, normal: 1, 'difícil': 0.5, dificil: 0.5, 'raríssimo': 0.15, rarissimo: 0.15 };
    var m = mult[text(level, 'normal')];
    pkm.catchDiff[text(name, '')] = typeof m === 'number' ? m : 1;
  }

  // ---- os 3 níveis: espécie (dados) → indivíduo (o time) → lutador (efêmero) ----
  /** ⚠️ CÓPIA, nunca referência: é exatamente o bug da base (o gsap mutava o
   * objeto de dados e os monstros desciam 20px a CADA batalha). */
  function pkmSpawn(speciesName, level) {
    var sp = pkm.species[text(speciesName, '')];
    if (!sp) return null;
    var lv = Math.max(1, Math.round(num(level, 5)));
    var hpMax = Math.round(sp.hp + (lv - 1) * 8);
    return { species: sp.name, level: lv, hp: hpMax, hpMax: hpMax, xp: 0 };
  }
  function pkmStat(ind, which) {
    var sp = pkm.species[ind.species];
    if (!sp) return 1;
    var lv = ind.level - 1;
    if (which === 'str') return Math.round(sp.str + lv * 2);
    if (which === 'def') return Math.round(sp.def + lv * 1);
    return sp.spd;
  }
  /** Um objeto no formato do createCharacter: aí o drawEntity o desenha de graça
   * (look/imagem/folha/piscar/giro) e o tweenTo o anima. */
  function pkmFighter(ind, x, y, w, h) {
    var sp = pkm.species[ind.species] || {};
    var f = createCharacter({ image: sp.image || '', w: w, h: h, speed: 0, color: '#e94f4f' });
    f.look = sp.look || '';
    placeCharacterAt(f, x, y);
    return f;
  }
  function placeCharacterAt(c, x, y) {
    c.x = num(x, 0); c.y = num(y, 0); c._prevX = c.x; c._prevY = c.y;
  }

  // ---- 🎒 Meu time ----
  function pkmGive(speciesName, level) {
    var ind = pkmSpawn(speciesName, level);
    if (!ind) { warnOnce('pkmgive:' + text(speciesName, ''), 'a criatura "' + text(speciesName, '') + '" não existe'); return; }
    if (pkm.team.length >= 6) { rpgSay('Seu time está cheio!', ''); return; }
    pkm.team.push(ind);
    emit('monstrinho:ganhou', ind);
  }
  function pkmGiveBall(count, power) {
    var n = Math.max(1, Math.round(num(count, 5)));
    var p = Math.max(1, Math.min(100, num(power, 60)));
    for (var i = 0; i < n; i++) pkm.balls.push({ power: p });
  }
  function pkmHealTeam() {
    for (var i = 0; i < pkm.team.length; i++) pkm.team[i].hp = pkm.team[i].hpMax;
  }
  function pkmHas(name) {
    var k = text(name, '');
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].species === k) return true;
    return false;
  }
  function pkmTeamSize() { return pkm.team.length; }
  function pkmBallCount() { return pkm.balls.length; }
  function pkmLevelOf(name) {
    var k = text(name, '');
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].species === k) return pkm.team[i].level;
    return 0;
  }
  function pkmFirstAlive() {
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].hp > 0) return pkm.team[i];
    return null;
  }
  function pkmDrawTeam(x, y) {
    if (!ctx2d) return;
    var bx = num(x, 10), by = num(y, 10);
    for (var i = 0; i < pkm.team.length; i++) {
      var t = pkm.team[i];
      var yy = by + i * 26;
      ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
      ctx2d.fillRect(bx, yy, 168, 22);
      ctx2d.fillStyle = t.hp > 0 ? '#ffffff' : '#ff8080';
      ctx2d.font = '13px sans-serif';
      ctx2d.fillText(t.species + ' Nv' + t.level, bx + 6, yy + 15);
      var pct = Math.max(0, Math.min(1, t.hp / Math.max(1, t.hpMax)));
      ctx2d.fillStyle = '#333';
      ctx2d.fillRect(bx + 112, yy + 8, 50, 6);
      ctx2d.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#fbbf24' : '#ef4444';
      ctx2d.fillRect(bx + 112, yy + 8, Math.round(50 * pct), 6);
    }
  }

  // ---- 🌿 Encontros (a grama alta) ----
  function pkmGrassCells(x1, y1, x2, y2) {
    var ax = Math.round(num(x1, 0)), ay = Math.round(num(y1, 0));
    var bx = Math.round(num(x2, 0)), by = Math.round(num(y2, 0));
    for (var cy = Math.min(ay, by); cy <= Math.max(ay, by); cy++) {
      for (var cx = Math.min(ax, bx); cx <= Math.max(ax, bx); cx++) pkm.grass[cx + ',' + cy] = true;
    }
  }
  function pkmGrassTiles(index, mapName) {
    pkm.grassTiles[Math.round(num(index, 0))] = true;
    pkm.grassMap = text(mapName, '');
  }
  function pkmWild(speciesName, min, max) {
    var k = text(speciesName, '');
    if (!pkm.species[k]) { warnOnce('pkmwild:' + k, 'a criatura "' + k + '" não existe'); return; }
    pkm.wild.push({ species: k, min: Math.max(1, Math.round(num(min, 3))), max: Math.max(1, Math.round(num(max, 6))) });
  }
  function pkmEncounterRate(pct) { pkm.rate = Math.max(0, Math.min(100, num(pct, 20))); }
  /** ⭐ O sorteio é por PASSO, não por quadro. O herói do kit anda com o
   * rpgMoveGrid (ENCAIXA na célula), então "metade do corpo dentro" não existe —
   * e "20% por passo" é legível para criança de um jeito que "1% por quadro"
   * (= 45% por segundo a 60fps) nunca seria. É como o gênero funciona de verdade. */
  function pkmOnStepCell(cx, cy) {
    if (!pkm.wild.length || pkm.battle) return;
    var inGrass = !!pkm.grass[cx + ',' + cy];
    if (!inGrass && pkm.grassMap) {
      var t = tileAt(pkm.grassMap, cx * tilePx + tilePx / 2, cy * tilePx + tilePx / 2);
      if (pkm.grassTiles[t]) inGrass = true;
    }
    if (!inGrass) return;
    if (!chance(pkm.rate)) return;
    var pick = pkm.wild[Math.floor(Math.random() * pkm.wild.length)];
    var lv = pick.min + Math.floor(Math.random() * (Math.max(pick.min, pick.max) - pick.min + 1));
    pkmBattleWild(pick.species, lv);
  }

  // ---- ⚔️ A batalha (criatura × criatura) ----
  function pkmBattleWild(speciesName, level) {
    var foe = pkmSpawn(speciesName, level);
    if (!foe) { warnOnce('pkmbw:' + text(speciesName, ''), 'a criatura "' + text(speciesName, '') + '" não existe'); return; }
    if (rpg.battle) { warn('já tem uma batalha do Kit RPG aberta — use um kit OU o outro'); return; }
    var mine = pkmFirstAlive();
    if (!mine) { rpgSay('Você não tem nenhum monstrinho em pé!', ''); return; }
    pkm.caught = false;
    pkmEnsureFx();
    pkm.battle = { mine: mine, foe: foe, kind: 'selvagem', phase: 'abrindo', t: 0, mineF: null, foeF: null };
    flashScreen('#ffffff', 2);
    setState('batalha');
    emit('monstrinho:apareceu', foe);
  }
  function pkmBattleTrainer(name, fn) {
    if (typeof fn !== 'function') return;
    pkmTrainerList = [];
    try { fn(); } catch (e) { warn('erro no time do treinador: ' + e); }
    if (!pkmTrainerList.length) { warn('o treinador "' + text(name, '') + '" não tem nenhuma criatura'); return; }
    var mine = pkmFirstAlive();
    if (!mine) { rpgSay('Você não tem nenhum monstrinho em pé!', ''); return; }
    pkm.caught = false;
    pkmEnsureFx();
    pkm.battle = {
      mine: mine, foe: pkmTrainerList[0], kind: 'treinador', trainer: text(name, ''),
      foes: pkmTrainerList.slice(), foeIndex: 0, phase: 'abrindo', t: 0, mineF: null, foeF: null
    };
    flashScreen('#ffffff', 2);
    setState('batalha');
  }
  var pkmTrainerList = [];
  function pkmTrainerCreature(speciesName, level) {
    var ind = pkmSpawn(speciesName, level);
    if (ind) pkmTrainerList.push(ind);
  }

  function pkmSetupFighters() {
    var b = pkm.battle;
    b.mineF = pkmFighter(b.mine, 140, config.h - 240, 140, 140);
    b.foeF = pkmFighter(b.foe, config.w - 300, 90, 120, 120);
  }
  function pkmMainMenu() {
    var b = pkm.battle;
    if (!b) return;
    var opts = [{ label: 'Lutar', fn: pkmMoveMenu }];
    if (b.kind === 'selvagem' && pkm.balls.length > 0) {
      opts.push({ label: 'Bola (' + pkm.balls.length + ')', fn: pkmThrowBall });
    }
    var alive = 0;
    for (var i = 0; i < pkm.team.length; i++) if (pkm.team[i].hp > 0) alive += 1;
    if (alive > 1) opts.push({ label: 'Trocar', fn: pkmSwitchMenu });
    if (b.kind === 'selvagem') opts.push({ label: 'Fugir', fn: pkmFlee });
    rpg.menu = { title: b.mine.species + '  ' + b.mine.hp + '/' + b.mine.hpMax, options: opts, index: 0 };
  }
  /** ⭐ O menu sai dos GOLPES da criatura ativa — a melhor ideia da base. */
  function pkmMoveMenu() {
    var b = pkm.battle;
    if (!b) return;
    var sp = pkm.species[b.mine.species];
    var opts = [];
    for (var i = 0; i < sp.moves.length; i++) {
      (function (mv) {
        var m = pkm.moves[mv];
        if (!m) return;
        opts.push({ label: m.name + '  (' + m.type + ')', fn: function () { pkmUseMove(m, true); } });
      })(sp.moves[i]);
    }
    opts.push({ label: '← Voltar', fn: pkmMainMenu });
    rpg.menu = { title: 'Qual golpe?', options: opts, index: 0 };
  }
  function pkmSwitchMenu() {
    var opts = [];
    for (var i = 0; i < pkm.team.length; i++) {
      (function (t) {
        if (t.hp <= 0 || t === pkm.battle.mine) return;
        opts.push({
          label: t.species + ' Nv' + t.level + ' (' + t.hp + '/' + t.hpMax + ')',
          fn: function () { pkmDoSwitch(t); }
        });
      })(pkm.team[i]);
    }
    opts.push({ label: '← Voltar', fn: pkmMainMenu });
    rpg.menu = { title: 'Trocar por quem?', options: opts, index: 0 };
  }
  function pkmDoSwitch(t) {
    var b = pkm.battle;
    b.mine = t;
    b.mineF = pkmFighter(t, 140, config.h - 240, 140, 140);
    rpgSay('Vai, ' + t.species + '!', '');
    b.phase = 'inimigo';
    b.t = 0;
  }
  function pkmFlee() {
    if (chance(50)) { rpgSay('Escapou!', ''); pkm.battle.phase = 'fim'; pkm.battle.t = 0; }
    else { rpgSay('Não deu para fugir!', ''); pkm.battle.phase = 'inimigo'; pkm.battle.t = 0; }
  }
  /** dano = (dano do golpe + força/2) × vantagem × (0.85..1.15) − defesa/2, mín 1.
   * ⭐ Na base o tipo do golpe NUNCA entrava na conta (era só a cor do texto). Fazer o
   * tipo IMPORTAR é a lição do gênero e a maior oportunidade do porte. */
  function pkmUseMove(m, isMine) {
    var b = pkm.battle;
    var atk = isMine ? b.mine : b.foe;
    var dfd = isMine ? b.foe : b.mine;
    var atkF = isMine ? b.mineF : b.foeF;
    var dfdF = isMine ? b.foeF : b.mineF;
    b.phase = 'anim';
    b.t = 0;
    b.pending = null;
    if (!chance(m.acc)) {
      rpgSay(atk.species + ' usou ' + m.name + '... mas errou!', '');
      b.next = isMine ? 'inimigo' : 'menu';
      return;
    }
    var mult = pkmAdvantage(m.type, pkm.species[dfd.species].type);
    var base = m.dmg + pkmStat(atk, 'str') / 2;
    var vary = 0.85 + Math.random() * 0.3;
    var dmg = Math.max(1, Math.round(base * mult * vary - pkmStat(dfd, 'def') / 2));
    var txt = atk.species + ' usou ' + m.name + '!';
    if (mult > 1) txt += ' É SUPER EFETIVO!';
    else if (mult === 0) txt += ' Não teve efeito!';
    else if (mult < 1) txt += ' Não foi muito eficaz...';
    rpgSay(txt, '');
    b.pending = { dmg: dmg, target: dfd, targetF: dfdF, isMine: isMine };
    // A coreografia: investida = o lutador corre e volta; os outros = piscar.
    if (m.fx === 'investida' && atkF && dfdF) {
      var ox = atkF.x;
      tweenTo(atkF, dfdF.x + (isMine ? -60 : 60), atkF.y, 0.18);
      b.returnTo = { f: atkF, x: ox, y: atkF.y };
    }
    burst('__pkm_hit', dfdF ? centerX(dfdF) : 0, dfdF ? centerY(dfdF) : 0);
    b.next = isMine ? 'inimigo' : 'menu';
  }
  function pkmApplyPending() {
    var b = pkm.battle;
    if (!b.pending) return;
    var p = b.pending;
    p.target.hp = Math.max(0, p.target.hp - p.dmg); // ⚠️ nunca negativo (bug da base)
    if (p.targetF) {
      cameraShake(4, 0.15);
      fadeTo(p.targetF, 40, 0.08);
      fadeTo(p.targetF, 100, 0.2);
    }
    b.pending = null;
    if (b.returnTo) { tweenTo(b.returnTo.f, b.returnTo.x, b.returnTo.y, 0.15); b.returnTo = null; }
  }
  function pkmThrowBall() {
    var b = pkm.battle;
    if (!pkm.balls.length) return;
    var ball = pkm.balls.pop();
    /** ⚠️ O óbvio (1 − vida/máx) daria 0% com a vida cheia: pegar seria
     * IMPOSSÍVEL, não difícil — a criança joga a bola, nunca funciona e conclui
     * que o bloco está quebrado. Este fator vale 1/3 com a vida cheia e ~1 com 1
     * de vida: "sempre possível, 3× mais difícil". A lição é ENFRAQUECER antes. */
    var diff = pkm.catchDiff[b.foe.species];
    if (typeof diff !== 'number') diff = 1;
    var pct = ball.power * ((3 * b.foe.hpMax - 2 * b.foe.hp) / (3 * b.foe.hpMax)) * diff;
    b.phase = 'anim';
    b.t = 0;
    if (chance(pct)) {
      if (pkm.team.length >= 6) { rpgSay('Seu time está cheio!', ''); pkm.balls.push(ball); b.next = 'menu'; return; }
      pkm.team.push(b.foe);
      pkm.caught = true;
      rpgSay(b.foe.species + ' foi capturado!', '');
      emit('monstrinho:pegou', b.foe);
      b.next = 'fim';
    } else {
      var shakes = Math.floor(Math.max(0, Math.min(1, pct / 100)) * 3);
      rpgSay(shakes >= 2 ? 'Ah! Quase!' : shakes === 1 ? 'Ele escapou!' : 'Nem chegou perto...', '');
      b.next = 'inimigo';
    }
  }
  function pkmEnemyTurn() {
    var b = pkm.battle;
    var sp = pkm.species[b.foe.species];
    var mv = sp.moves.length ? pkm.moves[sp.moves[Math.floor(Math.random() * sp.moves.length)]] : null;
    if (!mv) { b.phase = 'menu'; return; }
    pkmUseMove(mv, false);
  }
  function pkmCheckFaint() {
    var b = pkm.battle;
    if (b.foe.hp <= 0) {
      rpgSay(b.foe.species + ' desmaiou!', '');
      if (b.foeF) { tweenTo(b.foeF, b.foeF.x, b.foeF.y + 20, 0.4); fadeTo(b.foeF, 0, 0.4); }
      pkmReward();
      if (b.kind === 'treinador' && b.foeIndex + 1 < b.foes.length) {
        b.foeIndex += 1;
        b.foe = b.foes[b.foeIndex];
        b.foeF = pkmFighter(b.foe, config.w - 300, 90, 120, 120);
        b.phase = 'anim';
        b.next = 'menu';
        rpgSay(b.trainer + ' mandou ' + b.foe.species + '!', '');
        return true;
      }
      b.phase = 'anim';
      b.next = 'fim';
      rpg.battleWon = true;
      return true;
    }
    if (b.mine.hp <= 0) {
      rpgSay(b.mine.species + ' desmaiou!', '');
      if (b.mineF) { tweenTo(b.mineF, b.mineF.x, b.mineF.y + 20, 0.4); fadeTo(b.mineF, 0, 0.4); }
      var next = pkmFirstAlive();
      if (next) { b.phase = 'anim'; b.next = 'trocar-forcado'; return true; }
      b.phase = 'anim';
      b.next = 'fim';
      rpg.battleWon = false;
      return true;
    }
    return false;
  }
  function pkmReward() {
    var b = pkm.battle;
    var xp = PKM_XP_PER_LEVEL * b.foe.level / 2;
    b.mine.xp += Math.round(xp);
    rpgSay(b.mine.species + ' ganhou ' + Math.round(xp) + ' de experiência!', '');
    while (b.mine.xp >= PKM_XP_PER_LEVEL * b.mine.level) {
      b.mine.xp -= PKM_XP_PER_LEVEL * b.mine.level;
      b.mine.level += 1;
      b.mine.hpMax += 8;
      b.mine.hp = b.mine.hpMax;
      rpgSay(b.mine.species + ' subiu para o nível ' + b.mine.level + '!', '');
      emit('monstrinho:subiu', b.mine);
      var ev = pkm.evolve[b.mine.species];
      if (ev && b.mine.level >= ev.level && pkm.species[ev.to]) {
        rpgSay(b.mine.species + ' está evoluindo!', '');
        b.mine.species = ev.to; // mantém nível/XP: o indivíduo é o MESMO
        b.mine.hpMax += 6;
        b.mine.hp = b.mine.hpMax;
        b.mineF = pkmFighter(b.mine, 140, config.h - 240, 140, 140);
        rpgSay('Virou ' + ev.to + '!', '');
        emit('monstrinho:evoluiu', b.mine);
      }
    }
  }
  function pkmEndBattle() {
    pkm.battle = null;
    rpg.menu = null;
    fadeScreen('#000000', 0.25, false);
    setState('jogando'); // ⚠️ 'batalha' → 'jogando' NÃO recomeça (o setState poupa)
    var hooks = rpg.onBattleEnd;
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) { warn('erro no "quando a batalha terminar": ' + e); }
    }
  }
  /** ⭐ Roda FORA do gate de estado (o stepSystems só anda em 'jogando'), e bombeia
   * o relógio + a UI + os tweens + as faíscas — senão a fala fica com 0 letras. */
  function stepPkmBattle(dt) {
    var b = pkm.battle;
    if (!b || state !== 'batalha') return;
    playTime += dt;
    stepUiInput();
    stepTweens(dt);
    stepParticles(dt);
    b.t += dt;
    if (b.phase === 'abrindo') {
      if (b.t < 0.5) return;
      pkmSetupFighters();
      rpgSay(b.kind === 'treinador' ? b.trainer + ' quer batalhar!' : 'Um ' + b.foe.species + ' selvagem apareceu!', '');
      b.phase = 'espera-fala';
      b.next = 'menu';
      b.t = 0;
      return;
    }
    if (b.phase === 'espera-fala') {
      if (rpg.dialog) return; // a criança lê no ritmo dela
      b.phase = b.next || 'menu';
      b.t = 0;
      if (b.phase === 'menu') pkmMainMenu();
      return;
    }
    if (b.phase === 'anim') {
      if (b.t > 0.25 && b.pending) pkmApplyPending();
      if (rpg.dialog || b.t < 0.5) return;
      if (pkmCheckFaint()) { b.phase = 'espera-fala'; return; }
      b.phase = b.next || 'menu';
      b.t = 0;
      if (b.phase === 'menu') pkmMainMenu();
      else if (b.phase === 'inimigo') pkmEnemyTurn();
      else if (b.phase === 'fim') pkmEndBattle();
      else if (b.phase === 'trocar-forcado') pkmSwitchMenu();
      return;
    }
    if (b.phase === 'inimigo') { pkmEnemyTurn(); return; }
    if (b.phase === 'fim') { pkmEndBattle(); return; }
  }
  function drawPkmBattle() {
    var b = pkm.battle;
    if (!b || !ctx2d) return;
    ctx2d.fillStyle = '#5b8c5a';
    ctx2d.fillRect(0, 0, config.w, config.h);
    ctx2d.fillStyle = 'rgba(0,0,0,0.15)';
    ctx2d.fillRect(0, config.h * 0.55, config.w, config.h * 0.45);
    if (b.foeF) drawEntity(b.foeF);
    if (b.mineF) drawEntity(b.mineF);
    pkmBar(b.foe, 50, 40);
    pkmBar(b.mine, config.w - 290, config.h - 190);
    drawEffects(ctx2d);
  }
  function pkmBar(ind, x, y) {
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(x, y, 240, 54);
    ctx2d.strokeStyle = '#111';
    ctx2d.lineWidth = 3;
    ctx2d.strokeRect(x, y, 240, 54);
    ctx2d.fillStyle = '#111';
    ctx2d.font = '15px sans-serif';
    ctx2d.fillText(ind.species + '  Nv' + ind.level, x + 10, y + 22);
    var pct = Math.max(0, Math.min(1, ind.hp / Math.max(1, ind.hpMax)));
    ctx2d.fillStyle = '#ccc';
    ctx2d.fillRect(x + 10, y + 32, 220, 8);
    ctx2d.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#fbbf24' : '#ef4444';
    ctx2d.fillRect(x + 10, y + 32, Math.round(220 * pct), 8);
  }
  function pkmCaught() { return pkm.caught; }
  function pkmNewGame() {
    pkm.team = [];
    pkm.balls = [];
    pkm.battle = null;
    pkm.caught = false;
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
    var dir = c._facingDir || 'down'; // sempre em sincronia via setFacing()
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
      setFacing(who, dx, dy);
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
  // ⚠️ A ordem é (atual, máximo, x, y) — a MESMA do bloco, do gerador e do drawBar.
  // Já esteve (x, y, atual, máximo) e ninguém viu: "3 de 3 em x 20 y 20" desenhava
  // 20 corações colados em (3,3). Os 3 testes se cobriam sem se cruzar (o unit
  // chamava na ordem do runtime, o de exemplo comparava string, o blockAudit só
  // conferia o NOME do helper) — hoje há um teste que EXECUTA o código gerado.
  function drawHearts(current, max, x, y) {
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
  /** A FÍSICA das faíscas (roda no stepSystems, 1× por quadro, só em 'jogando').
   * Ficava dentro do drawEffects — desenhar 2× dobrava a física e NÃO desenhar
   * deixava as faíscas imortais até estourar o teto. Update e draw separados. */
  function stepParticles(dt) {
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
    }
  }
  function drawEffects() {
    if (!ctx2d) return;
    for (var i = 0; i < particles.active.length; i++) {
      var p = particles.active[i];
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
    // (o tamanho da célula agora é o tilePx de módulo — é GERAL, não do RPG)
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
  function rpgCellPx(n) { return num(n, 0) * tilePx; }

  /** Recomeço de partida: a HISTÓRIA zera (flags/itens/batalha) e volta ao 1º mapa. */
  function rpgNewGame() {
    // O time do Kit Monstrinhos morre junto: é parte do "jogo", não do motor.
    pkmNewGame();
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
    var s = tilePx;
    // Recriar um NPC com o MESMO nome deixava a reserva antiga órfã (parede
    // fantasma para sempre); dois NPCs na MESMA célula dividiam uma entrada só e o
    // 1º a andar liberava a do outro. Libera a reserva anterior e recusa a célula
    // já ocupada.
    var old = rpg.npcs[k];
    if (old && old._reservedCell && !rpg.terrain[old._reservedCell]) delete rpg.walls[old._reservedCell];
    var key = cellKey(cx, cy);
    if (!old && rpg.walls[key]) {
      warnOnce('npccell:' + key, 'já tem alguém (ou uma parede) na célula ' + key + ' — o NPC "' + k + '" precisa de uma célula livre');
      return;
    }
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
      _lastX: 0, _lastY: 0, _moving: false, _moveFrame: -1,
      _reservedCell: cellKey(cx, cy) // a célula que ESTE NPC ocupa (p/ só ele liberar)
    };
    rpg.walls[cellKey(cx, cy)] = true; // sólido: bloqueia a grade
  }
  function rpgDrawNpcs() { for (var k in rpg.npcs) drawEntity(rpg.npcs[k]); }
  function npcAtCell(cx, cy) {
    var s = tilePx;
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

  /** Entrada da UI do MOTOR (caixa de fala + menu de escolha) — vale em QUALQUER
   * jogo, não só no Kit RPG. Vivia dentro do rpgMoveGrid: fora do RPG o menu não
   * navegava e a fala NUNCA fechava (cobria a tela para sempre). CONSOME a tecla
   * que usa, senão o mesmo espaço fecharia a fala E abriria outra conversa no
   * mesmo quadro. */
  function stepUiInput() {
    if (rpg.menu) {
      var mo = rpg.menu.options;
      if (justPressed.arrowup || justPressed.w) rpg.menu.index = (rpg.menu.index - 1 + mo.length) % mo.length;
      if (justPressed.arrowdown || justPressed.s) rpg.menu.index = (rpg.menu.index + 1) % mo.length;
      if (justPressed[' '] || justPressed.enter) {
        justPressed[' '] = false;
        justPressed.enter = false;
        selectMenu();
      }
      return;
    }
    if (rpg.dialog && justPressed[' ']) {
      justPressed[' '] = false;
      advanceDialog();
    }
  }

  // Movimento em grade (moveTowards + destino + paredes do RPG kit). O herói é
  // quem chama; o Espaço conversa com o NPC à frente; chegar numa porta troca o mapa.
  // (A fala e o menu são tratados pelo stepUiInput, que é GERAL.)
  function rpgMoveGrid(c, cellPx, dt) {
    if (!c || typeof c !== 'object') return;
    var s = Math.max(8, num(cellPx, tilePx));
    tilePx = s;
    rpg.hero = c;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    if (rpg.menu) return; // menu aberto: herói TRAVADO (o stepUiInput navega)
    // Espaço CONVERSA com o NPC à frente (a fala aberta já foi consumida pelo
    // stepUiInput, então aqui o espaço só chega quando não há conversa em curso).
    if (justPressed[' '] && !rpg.dialog && !rpg.battle && !rpg.scene && c._gridDest == null) {
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
    // Fala/batalha/CENA aberta: herói TRAVADO (como o RPG kit trava no diálogo).
    if (rpg.dialog || rpg.battle || rpg.scene) return;
    if (c._gridDest == null) {
      var dx = 0;
      var dy = 0;
      if (keys.a || keys.arrowleft) dx = -1;
      else if (keys.d || keys.arrowright) dx = 1;
      else if (keys.w || keys.arrowup) dy = -1;
      else if (keys.s || keys.arrowdown) dy = 1;
      if (!dx && !dy) return;
      setFacing(c, dx, dy); // os DOIS campos (antes o up/down deixava o flip velho)
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
      // 👾 Kit Monstrinhos: o encontro na grama é por PASSO — é aqui que ele mora.
      pkmOnStepCell(Math.round(c.x / s), Math.round(c.y / s));
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
      // cena (e travar o herói) para sempre — desiste depois de 6 s. Limpa a
      // INTENÇÃO junto: senão o NPC retomaria a caminhada de uma cena já encerrada
      // quando a parede saísse (troca de mapa, block_cell mudado).
      st._t = num(st._t, 0) + dt;
      if (st._t > 6) { n._walkTarget = null; n._gridDest = null; return true; }
      var s = tilePx;
      return n._gridDest == null && n._walkTarget == null &&
        Math.round(n.x / s) === st.cx && Math.round(n.y / s) === st.cy;
    }
    if (st.type === 'battle') return rpg.battle == null && pkm.battle == null;
    if (st.type === 'menu') return rpg.menu == null;
    return true;
  }

  /** Uma célula está OCUPADA (parede/NPC/herói) — reserva de intenção do Pizza. */
  function cellOccupied(cx, cy) {
    if (rpg.walls[cx + ',' + cy]) return true;
    var s = tilePx;
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
    var s = tilePx;
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
      setFacing(n, dx, dy);
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
      var s = tilePx;
      var data = {
        flags: rpg.flags, items: rpg.items, map: rpg.currentMap,
        hx: rpg.hero ? Math.round(num(rpg.hero.x, 0) / s) : 0,
        hy: rpg.hero ? Math.round(num(rpg.hero.y, 0) / s) : 0,
        hp: rpg.playerHp, max: rpg.playerMax, str: rpg.playerStr, def: rpg.playerDef,
        lvl: rpg.playerLevel, xp: rpg.playerXp, maxXp: rpg.playerMaxXp,
        // Sem isto a criança PERDIA as poções/energia/golpe especial ao continuar
        // — enquanto vida e XP voltavam, o que parecia bug dos blocos dela.
        potions: rpg.potions, energy: rpg.playerEnergy, poison: rpg.playerPoison,
        special: rpg.special,
        // 👾 Sem isto a criança fecha o jogo e PERDE 6 monstrinhos de nível 20.
        // Vai no MESMO "Salvar o jogo" — nenhum bloco novo.
        pkmTeam: pkm.team, pkmBalls: pkm.balls
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
      // Consumíveis/habilidade (save antigo não tem: mantém o que já está em jogo).
      if (Array.isArray(data.potions)) {
        rpg.potions = data.potions.filter(function (p) {
          return p && typeof p === 'object' && typeof p.name === 'string';
        });
      }
      rpg.playerEnergy = num(data.energy, rpg.playerEnergy);
      rpg.playerPoison = num(data.poison, 0);
      if (data.special && typeof data.special === 'object' && typeof data.special.name === 'string') {
        rpg.special = data.special;
      }
      // 👾 O time do Kit Monstrinhos volta junto. O localStorage é EDITÁVEL (pela
      // criança ou pelo inspetor), então cada indivíduo é validado — um registro
      // torto faria a batalha estourar depois, longe daqui.
      pkm.team = Array.isArray(data.pkmTeam)
        ? data.pkmTeam.filter(function (t) {
            return t && typeof t === 'object' && typeof t.species === 'string' && pkm.species[t.species];
          })
        : [];
      pkm.balls = Array.isArray(data.pkmBalls)
        ? data.pkmBalls.filter(function (b) { return b && typeof b === 'object'; })
        : [];
      pkm.battle = null;
      rpg.scene = null; rpg.recording = false; rpg.menu = null; rpg.battle = null; rpg.dialog = null;
      if (data.map) {
        rpgGoMap(data.map);
        if (rpg.hero) {
          rpg.hero.x = num(data.hx, 0) * tilePx;
          rpg.hero.y = num(data.hy, 0) * tilePx;
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
      // Teleporte NÃO é movimento: zera a varredura, senão a colisão sólida tentaria
      // "varrer" do lugar antigo até aqui e travaria o personagem no caminho.
      c._prevX = c.x;
      c._prevY = c.y;
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
    // ----- ⚙️ R11: física geral (gravidade/pulo/chão/colisão sólida) -----
    applyGravity: guard('applyGravity', applyGravity),
    setTerminalVelocity: guard('setTerminalVelocity', setTerminalVelocity),
    setVelocity: guard('setVelocity', setVelocity),
    velocityOf: guard('velocityOf', velocityOf),
    jump: guard('jump', jump),
    isOnGround: guard('isOnGround', isOnGround),
    collideTilemap: guard('collideTilemap', collideTilemap),
    collideGroup: guard('collideGroup', collideGroup),
    overlapGroups: guard('overlapGroups', overlapGroups),
    bounceOnEdges: guard('bounceOnEdges', bounceOnEdges),
    wrapEdges: guard('wrapEdges', wrapEdges),
    everySeconds: guard('everySeconds', everySeconds),
    cooldownReady: guard('cooldownReady', cooldownReady),
    tileAt: guard('tileAt', tileAt),
    setTileAt: guard('setTileAt', setTileAt),
    breakTileAt: guard('breakTileAt', breakTileAt),
    setTileSize: guard('setTileSize', setTileSize),
    propertyOf: guard('propertyOf', propertyOf),
    setProperty: guard('setProperty', setProperty),
    setFacingDir: guard('setFacingDir', setFacingDir),
    facingOf: guard('facingOf', facingOf),
    tweenTo: guard('tweenTo', tweenTo),
    // ----- 🧭 R15: primitivos gerais (o "lado de fora") -----
    defineRegion: guard('defineRegion', defineRegion),
    isInside: guard('isInside', isInside),
    overlapPercent: guard('overlapPercent', overlapPercent),
    chance: guard('chance', chance),
    distanceBetween: guard('distanceBetween', distanceBetween),
    pointIn: guard('pointIn', pointIn),
    launchToPoint: guard('launchToPoint', launchToPoint),
    setVelocityAngle: guard('setVelocityAngle', setVelocityAngle),
    setOpacity: guard('setOpacity', setOpacity),
    opacityOf: guard('opacityOf', opacityOf),
    fadeTo: guard('fadeTo', fadeTo),
    tweenProperty: guard('tweenProperty', tweenProperty),
    setHitbox: guard('setHitbox', setHitbox),
    fadeScreen: guard('fadeScreen', fadeScreen),
    flashScreen: guard('flashScreen', flashScreen),
    saveValue: guard('saveValue', saveValue),
    savedValue: guard('savedValue', savedValue),
    playMusic: guard('playMusic', playMusic),
    stopSound: guard('stopSound', stopSound),
    setVolume: guard('setVolume', setVolume),
    createEmptyTilemap: guard('createEmptyTilemap', createEmptyTilemap),
    moveWithCustomKeys: guard('moveWithCustomKeys', moveWithCustomKeys),
    // ----- 👾 R16: Kit Monstrinhos -----
    pkmCreature: guard('pkmCreature', pkmCreature),
    pkmMove: guard('pkmMove', pkmMove),
    pkmTypeChart: guard('pkmTypeChart', pkmTypeChart),
    pkmEvolve: guard('pkmEvolve', pkmEvolve),
    pkmCatchDifficulty: guard('pkmCatchDifficulty', pkmCatchDifficulty),
    pkmLevelOf: guard('pkmLevelOf', pkmLevelOf),
    pkmGive: guard('pkmGive', pkmGive),
    pkmGiveBall: guard('pkmGiveBall', pkmGiveBall),
    pkmHealTeam: guard('pkmHealTeam', pkmHealTeam),
    pkmHas: guard('pkmHas', pkmHas),
    pkmTeamSize: guard('pkmTeamSize', pkmTeamSize),
    pkmBallCount: guard('pkmBallCount', pkmBallCount),
    pkmDrawTeam: guard('pkmDrawTeam', pkmDrawTeam),
    pkmGrassCells: guard('pkmGrassCells', pkmGrassCells),
    pkmGrassTiles: guard('pkmGrassTiles', pkmGrassTiles),
    pkmWild: guard('pkmWild', pkmWild),
    pkmEncounterRate: guard('pkmEncounterRate', pkmEncounterRate),
    pkmBattleWild: guard('pkmBattleWild', pkmBattleWild),
    pkmBattleTrainer: guard('pkmBattleTrainer', pkmBattleTrainer),
    pkmTrainerCreature: guard('pkmTrainerCreature', pkmTrainerCreature),
    pkmCaught: guard('pkmCaught', pkmCaught),
    // ----- 🏃 R12: Kit Plataforma -----
    platformerHero: guard('platformerHero', platformerHero),
    setJumpFeel: guard('setJumpFeel', setJumpFeel),
    doubleJump: guard('doubleJump', doubleJump),
    wallSlide: guard('wallSlide', wallSlide),
    wallJump: guard('wallJump', wallJump),
    climbLadder: guard('climbLadder', climbLadder),
    oneWayPlatform: guard('oneWayPlatform', oneWayPlatform),
    dropThrough: guard('dropThrough', dropThrough),
    movingPlatform: guard('movingPlatform', movingPlatform),
    rideOn: guard('rideOn', rideOn),
    stompKill: guard('stompKill', stompKill),
    patrolTurnAtWall: guard('patrolTurnAtWall', patrolTurnAtWall),
    setCheckpoint: guard('setCheckpoint', setCheckpoint),
    respawn: guard('respawn', respawn),
    platStateFrames: guard('platStateFrames', platStateFrames),
    platformerAnim: guard('platformerAnim', platformerAnim),
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
