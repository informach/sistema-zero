(function () {
  const createProjectRunContext = function createProjectRunContext(options) {
  const clock = options.clock ?? {
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id)
  }, timers = options.timers ?? {
    setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (callback, delayMs) => setInterval(callback, delayMs),
    clearInterval: (id) => clearInterval(id)
  }, controller = new AbortController, frameCallbacks = new Set, pendingFrames = new Set, pendingTimeouts = new Set, activeIntervals = new Set, resources = [];
  let frameId = null, previousTime = null, paused = !1, schedulerDisposed = !1, disposed = !1;
  const runCallback = (callback) => {
    if (disposed)
      return;
    return options.runCallback ? options.runCallback(callback) : callback();
  }, schedule = () => {
    if (disposed || schedulerDisposed || paused || frameId !== null || frameCallbacks.size === 0)
      return;
    frameId = clock.requestFrame(tick);
  }, tick = (time) => {
    frameId = null;
    if (disposed || schedulerDisposed || paused)
      return;
    const deltaSeconds = previousTime === null ? 0 : Math.max(0, (time - previousTime) / 1000);
    previousTime = time;
    for (const callback of [...frameCallbacks]) {
      runCallback(() => callback(deltaSeconds));
      if (disposed)
        break;
    }
    schedule();
  }, scheduler = {
    onFrame(callback) {
      if (disposed || schedulerDisposed)
        return () => {
          return;
        };
      frameCallbacks.add(callback);
      schedule();
      return () => {
        frameCallbacks.delete(callback);
        if (frameCallbacks.size === 0 && frameId !== null) {
          clock.cancelFrame(frameId);
          frameId = null;
        }
      };
    },
    everyFrames(frames, callback) {
      const interval = Math.max(1, Math.floor(frames));
      let count = 0;
      return scheduler.onFrame(() => {
        count += 1;
        if (count < interval)
          return;
        count = 0;
        callback();
      });
    },
    everySeconds(seconds, callback) {
      const interval = Math.max(0.001, seconds);
      let elapsed = 0;
      return scheduler.onFrame((deltaSeconds) => {
        elapsed += deltaSeconds;
        while (elapsed >= interval) {
          elapsed -= interval;
          callback();
        }
      });
    },
    pause() {
      if (disposed || schedulerDisposed || paused)
        return;
      paused = !0;
      previousTime = null;
      if (frameId !== null)
        clock.cancelFrame(frameId);
      frameId = null;
    },
    resume() {
      if (disposed || schedulerDisposed || !paused)
        return;
      paused = !1;
      previousTime = null;
      schedule();
    },
    dispose() {
      if (schedulerDisposed)
        return;
      schedulerDisposed = !0;
      if (frameId !== null)
        clock.cancelFrame(frameId);
      frameId = null;
      frameCallbacks.clear();
    }
  };
  return {
    signal: controller.signal,
    scheduler,
    run: runCallback,
    isControlSignal(error) {
      return options.isControlSignal?.(error) ?? !1;
    },
    setTimeout(callback, delayMs) {
      if (disposed)
        return -1;
      let id = -1;
      id = timers.setTimeout(() => {
        pendingTimeouts.delete(id);
        if (!disposed)
          runCallback(callback);
      }, delayMs);
      pendingTimeouts.add(id);
      return id;
    },
    setInterval(callback, delayMs) {
      if (disposed)
        return -1;
      const id = timers.setInterval(() => {
        if (!disposed)
          runCallback(callback);
      }, delayMs);
      activeIntervals.add(id);
      return id;
    },
    requestFrame(callback) {
      if (disposed)
        return -1;
      let id = -1;
      id = clock.requestFrame((time) => {
        pendingFrames.delete(id);
        if (!disposed)
          runCallback(() => callback(time));
      });
      pendingFrames.add(id);
      return id;
    },
    setEventHandler(target, property, callback) {
      if (disposed || !target)
        return;
      const managedHandler = (event) => runCallback(() => callback.call(target, event));
      Reflect.set(target, property, managedHandler);
      resources.push(() => {
        if (Reflect.get(target, property) === managedHandler)
          Reflect.set(target, property, null);
      });
    },
    registerResource(dispose) {
      if (disposed) {
        dispose();
        return;
      }
      resources.push(dispose);
    },
    requestRestart() {
      if (!disposed)
        options.requestRestart();
    },
    dispose() {
      if (disposed)
        return;
      disposed = !0;
      scheduler.dispose();
      controller.abort();
      for (const id of pendingFrames)
        clock.cancelFrame(id);
      pendingFrames.clear();
      for (const id of pendingTimeouts)
        timers.clearTimeout(id);
      pendingTimeouts.clear();
      for (const id of activeIntervals)
        timers.clearInterval(id);
      activeIntervals.clear();
      for (const dispose of resources.reverse())
        try {
          dispose();
        } catch (error) {
          console.error("Falha ao descartar um recurso da execu\xE7\xE3o do projeto.", error);
        }
      resources.length = 0;
    }
  };
};
  let currentRun;
  let activeCallbacks = 0;
  const controlSignal = Object.freeze({ kind: 'sz-project-restart' });

  function isControlSignal(error) {
    return error === controlSignal;
  }

  function run(callback, thisArg, args) {
    if (typeof callback !== 'function') return;
    const isRootCallback = activeCallbacks === 0;
    activeCallbacks++;
    try {
      return callback.apply(thisArg, args || []);
    } catch (error) {
      if (isRootCallback && isControlSignal(error)) return;
      throw error;
    } finally {
      activeCallbacks--;
    }
  }

  function endCallback() {
    if (activeCallbacks > 0) throw controlSignal;
  }

  function disposeCurrentRun() {
    if (!currentRun) return;
    currentRun.dispose();
    currentRun = undefined;
  }

  function begin(requestRestart) {
    disposeCurrentRun();
    currentRun = createProjectRunContext({
      requestRestart: typeof requestRestart === 'function' ? requestRestart : function () {},
      runCallback: run,
      isControlSignal: isControlSignal,
    });
    return currentRun;
  }

  window.addEventListener('pagehide', disposeCurrentRun, { once: true });
  window["__SZProjectLifecycle"] = Object.freeze({
    begin: begin,
    dispose: disposeCurrentRun,
    run: run,
    endCallback: endCallback,
    isControlSignal: isControlSignal,
  });
})();
(function () {
  var _szGameUIFont = (window.SZGameUIFont && window.SZGameUIFont.family) || 'sans-serif';
  // ⚠️ Defensivo de propósito: a família deixou de vir embutida no runtime e passou
  // a ser publicada por quem MONTA o documento. Se algum caminho de montagem
  // esquecer, o texto sai numa fonte do sistema — nunca com o jogo quebrado numa
  // leitura de propriedade de undefined.

  var _runtimeDomains = Object.create(null);
  var _runtimeDomainOrder = [];
  function _registerRuntimeDomain(name, hooks) {
    if (!_runtimeDomains[name]) _runtimeDomainOrder.push(name);
    _runtimeDomains[name] = hooks || {};
  }
  function _runRuntimeDomainHook(hookName) {
    var domains = _runtimeDomainOrder.slice();
    for (var i = 0; i < domains.length; i++) {
      var hooks = _runtimeDomains[domains[i]];
      var hook = hooks && hooks[hookName];
      if (typeof hook === 'function') hook();
    }
  }

  // ---- Config (do bloco "Preparar o jogo profissional") ----
  var config = {
    w: 1280,
    h: 720,
    bg: '#1a1a2e',
    accent: '#4a9eff',
    pauseKey: 'escape',
    // "Ocupar a tela toda": a resolução interna ACOMPANHA a viewport (sem
    // proporção fixa, sem barras) em vez do letterbox de resolução travada.
    fill: false,
    // Moldura da tela pedida pelo bloco "Mostrar a borda da tela" ({color,width})
    // ou null. Fica na config porque o canvas só existe depois do "Começar".
    border: null
  };

  // ---- Estado interno ----
  var state = 'menu';
  // Um setState feito pela área "Ao iniciar" roda antes de start(). Guardamos
  // essa escolha para restaurá-la depois da tela obrigatória de carregamento.
  var bootState = '';
  var started = false;
  var shellReady = false;
  var keys = {};
  var images = Object.create(null);      // nome -> { img, loaded }
  var pending = [];                      // promessas de carregamento
  var updateHooks = [];
  var drawHooks = [];
  var gameStartHooks = [];
  var enterStateHooks = Object.create(null); // estado -> [fn]
  var projectFactory = null;
  var runningProjectFactory = false;
  var screens = Object.create(null);     // nome -> { el, title, text, mainBtn }
  var projectButtons = [];               // botões criados pela factory atual
  var projectScreens = [];               // telas autorais criadas pela factory atual
  var stageDescriptionText = 'Use as setas, WASD, espaço, enter ou o mouse conforme as instruções do jogo.';
  var screenSequence = 0;
  var stageEl = null;
  var canvasEl = null;
  var ctx2d = null;
  var styleEl = null;
  var lastTime = 0;
  var currentDt = 0;
  var frameCount = 0;                    // carimbo do quadro (mede "anda?" 1× por quadro)
  /**
   * SONDA DE TRABALHO. Contadores DETERMINISTICOS do que o quadro fez: pares
   * examinados, caixas contornadas, comparacoes desperdicadas, linhas de mapa
   * varridas. Nao sao milissegundos DE PROPOSITO -- relogio em CI e ruido, e o
   * que um lote de desempenho precisa provar e que o TRABALHO caiu (ou, nos
   * lotes que nao sao de desempenho, que ele nao subiu).
   *
   * Sempre mantidos (um incremento inteiro por par, contra os ~225 ns que o par
   * ja custa) e lidos so pelo HOST, pela porta opt-in dos inspetores. Nao entram
   * na API da crianca e nao movem contador de bloco.
   */
  var perf = { quadros: 0, passos: 0, pares: 0, caixas: 0, visitas: 0, linhasDeMapa: 0 };
  var MAX_ACTIVE_PER_MOLD = 300;         // teto por molde (irmão do MAX_PARTICLES)
  // Limites de autoria: todo valor abaixo alimenta laços síncronos no mesmo
  // thread do Studio. Mantê-los centralizados impede que um número digitado por
  // engano congele tanto o jogo quanto o editor da criança.
  var MAX_GRID_SIDE = 512;
  var MAX_CAPTURE_BALLS = 999;
  var MAX_PKM_TEAM = 6;
  var MAX_LUTA_ROUNDS = 9;
  var MAX_GAME_LEVEL = 999; var RPG_BASE_MAX_XP = 20;
  var MAX_HUD_HEARTS = 100;
  var MAX_PKM_GRASS_AREAS = 256;
  var MAX_PKM_GRASS_TILES = 256;
  var MAX_PKM_WILD_ENTRIES = 256;
  var MAX_PENDING_WAITS = 1000;
  // A batalha por turnos desenha cada combatente e percorre cada consumível no
  // mesmo thread. Cinco companheiros + o herói e cinco extras + o principal
  // mantêm o painel legível; poções continuam abundantes sem virar lista infinita.
  var MAX_RPG_ALLIES = 5;
  var MAX_RPG_FOE_QUEUE = 5;
  var MAX_RPG_POTIONS = 99;
  var MAX_SAFE_GAME_INTEGER = 9007199254740991;
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
  // Personagens criados, só para o overlay de caixas de colisão enxergar quem
  // não entra em combate (combatants só recebe quem toma dano). Capado: um
  // "criar personagem" dentro de um laço não pode crescer isto sem fim.
  var characters = [];
  var MAX_TRACKED_CHARACTERS = 200;
  var effects = Object.create(null);     // nome -> receita de faísca
  var particles = { active: [], free: [] };
  // 🖥️ R21: textos flutuantes ("+100" que sobe e some) — o MOTOR desenha (como a
  // fala do RPG); pooled com swap-pop, teto proprio.
  var floaties = { active: [], free: [] };
  var MAX_FLOATIES = 60;
  // R24: cache da string de fonte por tamanho (montar 'bold Npx...' por floatie
  // por quadro alocava ate 60 strings/quadro; chaves = punhado de tamanhos).
  var floatieFonts = Object.create(null);
  // ✨ R21: aneis da onda de choque (a explosao da Bomb do Chris Courses).
  var shockwaves = { active: [], free: [] };
  var MAX_SHOCKWAVES = 16;
  // ✨ R21: entidades com rastro ligado (varrida reversa, como combatants).
  var trailed = [];
  // 🔁 R21: offsets do fundo que rola, por nome de imagem (parallax = N camadas).
  var scrolls = Object.create(null);
  // 🛤️ R25 — caminhos nomeados (waypoints). CONFIG: NAO reseta em jogo novo.
  // Cada caminho: { pts:[{x,y}], cum:[dist acumulada até cada ponto], total }.
  var paths = Object.create(null);
  var pathBuilding = null; // coleta do "Criar o caminho" (espelho do rpg.menuBuilding)
  // 🏰 R26 — Kit Defesa de Torre. Slots/coins sao CONFIG de topo (a economia
  // reseta no jogo novo p/ o coinsInit). As ondas sao anonimas (como o Nave).
  var td = {
    waves: [],   // { id, path, mold, speed, members: [] }
    slots: [],   // { x, y, size, occupied }
    coins: 0, coinsInit: 0,
    seq: 0
  };
  var MAX_TD_WAVES = 8, MAX_TD_SLOTS = 200;
  // ✨ R25 — explosao por FOLHA one-shot (a explosion.png do Chris), pooled.
  var sheetBursts = { active: [], free: [] };
  var MAX_SHEET_BURSTS = 24;
  // 🚀 R22 — Kit Nave. As ondas sao ANONIMAS num array (como os grids do Space
  // Invaders: varias ao mesmo tempo, a crianca nao nomeia); o resto e config.
  var nave = {
    waves: [],      // { id, vx, drop, accel, invaded, members: [] }
    shooters: [],   // { mold, interval, timer, bullet, speed } (dedupe por molde)
    bombs: [],      // { e, radius, target }
    powered: [],    // entidades com _gunMode ativo (varrida reversa)
    stars: null,    // starfield preguicoso { n, xs, ys, rs, frame }
    invadeY: 0,     // 0 = fundo da tela (config; NAO reseta em jogo novo)
    seq: 0          // gerador de id de onda (o carimbo _wave das entidades)
  };
  var MAX_WAVES = 8;
  var MAX_WAVE_VX = 1500;
  var MAX_NAVE_BOMBS = 3;
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
  var camera = { on: false, target: null, x: 0, y: 0, worldW: 0, worldH: 0, shakeT: 0, shakeMag: 0, followMap: '', followCols: 0, followRows: 0 };
  // true SO durante o passe de MUNDO do render (entre o translate da camera e o
  // restore). E o gate do culling: um drawTilemap/drawEntity chamado no HUD (depois
  // do restore, coords de TELA) ou fora do render NUNCA pode ser culled contra o
  // retangulo do mundo — sem isso, minimapa no HUD com camera ligada sumiria.
  var worldPass = false;
  var tilemaps = Object.create(null);    // nome -> {rows, artTile, imgKey, solid Set}
  var hudHooks = [];                     // desenham DEPOIS do restore (sem câmera)
  var mouse = { x: 0, y: 0, screenX: 0, screenY: 0, down: false };
  // Compatível com fn(x, y): os dois argumentos extras dão a posição fixa na
  // tela para HUDs sem alterar projetos que já usam coordenadas do mundo.
  var gameClickHooks = [];               // fn(worldX, worldY, screenX, screenY)

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

  function boundedInteger(v, fallback, min, max) { return Math.max(min, Math.min(max, Math.round(num(v, fallback)))); }
  function text(v, fallback) {
    if (v == null) return fallback;
    var s = String(v);
    return s;
  }

  // Mapa indexado por NOME DA CRIANÇA (golpes, mapas, NPCs, flags…): sem protótipo,
  // então um nome inocente como "constructor"/"toString" NÃO cai na herança do Object
  // (que travava o jogo no "se o mapa[nome] não existe, cria a lista"). Cópia opcional
  // de um objeto simples (ex.: um save carregado por JSON.parse) para o formato seguro.
  function nameMap(src) {
    var m = Object.create(null);
    if (src && typeof src === 'object') {
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) m[k] = src[k];
    }
    return m;
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
      // So um ponteiro de VERDADE pode ser capturado. Um evento montado por codigo
      // (o controle do player, um teste) nao tem ponteiro ativo, a captura lanca, e
      // o aviso acusava um jogo que estava certo: o primeiro exemplo do motor que
      // se joga arrastando (Descida da Neve) reprovava na galeria por isso.
      if (ev.isTrusted !== false && ev.pointerId != null && typeof canvasEl.setPointerCapture === 'function') {
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
  // 🖼️ Unifica o campo IMAGEM: escolher um desenho do Pinta JÁ funciona em todo lugar
  // (personagem/inimigo/molde/ficha), sem precisar "Carregar a imagem" antes. Se o nome
  // bate um asset do projeto e ainda não foi registrado, carrega sozinho — idempotente,
  // e no setup entra no "pending" (a tela de carregando espera). "Carregar a imagem"
  // segue valendo (explícito) e vira OPCIONAL.
  function ensureImageLoaded(name) {
    var k = text(name, '');
    if (!k || images[k]) return;
    if (resolveAsset(k)) loadImage(k, k);
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
    // Tamanho do mundo DERIVADO por quadro (prioridade: mapa seguido > tamanho do
    // mapa RPG > worldW/H passados na mao). Escreve em camera.worldW/H para os
    // consumidores (keepOnScreen/bounceOnEdges/cullOffscreen) verem o mesmo mundo.
    // Por quadro porque o tilePx e GLOBAL e muda (setTileSize/rpgMoveGrid) —
    // nunca congelar no momento da chamada.
    if (camera.followMap) {
      camera.worldW = Math.max(config.w, camera.followCols * tilePx);
      camera.worldH = Math.max(config.h, camera.followRows * tilePx);
    } else if (rpg.mapCols > 0 && rpg.mapRows > 0) {
      camera.worldW = Math.max(config.w, rpg.mapCols * tilePx);
      camera.worldH = Math.max(config.h, rpg.mapRows * tilePx);
    }
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
    camera.followMap = '';
    // O mundo nunca é menor que a tela (senão a trava das bordas inverte).
    camera.worldW = Math.max(config.w, num(worldW, config.w));
    camera.worldH = Math.max(config.h, num(worldH, config.h));
    updateCamera();
  }
  /** Segue o personagem por um MAPA de tiles: o tamanho do mundo vem do PROPRIO
   *  mapa (colunas x celula), recalculado a cada quadro — imune ao tamanho da
   *  celula mudar depois. */
  function cameraFollowMap(target, mapName) {
    if (!target || typeof target !== 'object') {
      warn('"Fazer a câmera seguir pelo mapa" precisa de um personagem');
      return;
    }
    var nm = text(mapName, '');
    var m = tilemaps[nm];
    if (!m) {
      warnOnce('camfollowmap:' + nm, 'o mapa "' + nm + '" não existe — carregue com "Carregar o mapa"');
      cameraFollow(target, config.w, config.h);
      return;
    }
    var cols = 0;
    for (var i = 0; i < m.rows.length; i++) {
      if (m.rows[i].length > cols) cols = m.rows[i].length;
    }
    camera.on = true;
    camera.target = target;
    camera.followMap = nm;
    camera.followCols = cols;
    camera.followRows = m.rows.length;
    updateCamera();
  }
  function resetCameraState() {
    camera.on = false;
    camera.target = null;
    camera.x = 0;
    camera.y = 0;
    camera.worldW = 0;
    camera.worldH = 0;
    camera.shakeT = 0;
    camera.shakeMag = 0;
    camera.followMap = '';
    camera.followCols = 0;
    camera.followRows = 0;
  }
  function cameraStop() {
    camera.on = false;
    camera.target = null;
    camera.followMap = '';
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
    // Peças PLATAFORMA (one-way): mesmo lookup do sólido. O metadado já garante
    // que não se sobrepõem (sólido vence no sanitizer).
    var platform = Object.create(null);
    if (meta.platform && typeof meta.platform.length === 'number') {
      for (var j = 0; j < meta.platform.length; j++) {
        var p = meta.platform[j];
        if (typeof p === 'number' && p >= 0 && !solid[Math.floor(p)]) platform[Math.floor(p)] = true;
      }
    }
    // Grade da FRENTE (opcional): camadas desenhadas POR CIMA do jogador.
    var frontRows = (typeof meta.frontGrid === 'string' && meta.frontGrid)
      ? parseTileGrid(meta.frontGrid) : null;
    var imgKey = '__tm_' + nm;
    loadImage(imgKey, meta.tileset.dataUrl); // a folha embutida entra por dataUrl
    tilemaps[nm] = {
      rows: parseTileGrid(meta.grid),
      frontRows: frontRows,
      artTile: (typeof meta.tileSize === 'number' && meta.tileSize > 0) ? meta.tileSize : 32,
      imgKey: imgKey, solid: solid, platform: platform
    };
  }
  /** Desenha o mapa alinhado à grade. layer: 'chão' = tudo; 'topos' = só sólidos
   * (árvores/telhados desenhados POR CIMA do herói — o front-render do Ninja). */
  /** As colunas do mapa, contadas UMA vez e guardadas nele. */
  function _mapCols(m) {
    if (m._colsPass !== true) {
      perf.linhasDeMapa += m.rows.length;
      var maior = 0;
      for (var i = 0; i < m.rows.length; i++) maior = Math.max(maior, m.rows[i].length);
      m.cols = maior;
      m._colsPass = true;
    }
    return m.cols;
  }
  function drawTilemap(name, layer) {
    if (!ctx2d) return;
    var dk = text(name, '');
    var m = tilemaps[dk];
    if (!m) { warnOnce('drawmap:' + dk, 'o mapa "' + dk + '" não existe — carregue com "Carregar o mapa"'); return; }
    if (rpg.currentMap && rpg.maps[rpg.currentMap]) {
      var declared = rpg.maps[rpg.currentMap];
      var mapRows = m.rows.length;
      // ⚠️ Numero honesto: a varredura custava 1,8 us num mapa 512x512, ou 0,01%
      // do quadro. Isto NAO e ganho de desempenho — e desperdicio, e o
      // o cameraFollowMap ja fazia a MESMA conta noutro lugar.
      var mapCols = _mapCols(m);
      if (declared.cols !== mapCols || declared.rows !== mapRows) {
        warnOnce(
          'mapsize:' + rpg.currentMap + ':' + dk,
          'o mapa-cenário "' + rpg.currentMap + '" tem ' + declared.cols + ' × ' + declared.rows +
          ' células, mas o mapa de peças "' + dk + '" tem ' + mapCols + ' × ' + mapRows + ' — use o mesmo tamanho nos dois',
        );
      }
    }
    var sheet = images[m.imgKey];
    if (!sheet || !sheet.loaded || !sheet.img) return;
    var at = m.artTile;
    var cols = Math.max(1, Math.floor(num(sheet.img.width, at) / at));
    var cell = tilePx;
    var layerText = text(layer, 'chão');
    // 'frente' = só a camada da FRENTE (por cima do jogador), sem filtro de
    // sólido. Sem grade de frente no mapa → nada a desenhar por cima.
    var frente = (layerText === 'frente');
    if (frente && !m.frontRows) return;
    var grid = frente ? m.frontRows : m.rows;
    var onlyTops = (layerText === 'topos');
    // 🌍 Culling: só a FATIA visível da câmera (o jeito dos jogos profissionais).
    // Um mapa 512x512 cai de ~262 mil drawImage/quadro para ~200. Fora do passe
    // de mundo (HUD/chamada avulsa) a fatia é a tela — mesmo recorte do canvas.
    var vx = (worldPass && camera.on) ? camera.x : 0;
    var vy = (worldPass && camera.on) ? camera.y : 0;
    var pad = camera.shakeT > 0 ? camera.shakeMag : 0;
    var r0 = Math.max(0, Math.floor((vy - pad) / cell));
    var r1 = Math.min(grid.length, Math.ceil((vy + config.h + pad) / cell) + 1);
    for (var r = r0; r < r1; r++) {
      var rowArr = grid[r];
      var c0 = Math.max(0, Math.floor((vx - pad) / cell));
      var c1 = Math.min(rowArr.length, Math.ceil((vx + config.w + pad) / cell) + 1);
      for (var c = c0; c < c1; c++) {
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
    // Cenário ANTES do translate: fica preso à tela, atrás de tudo, e não some
    // se a criança esquecer de desenhar o fundo no 'Desenhar o jogo'.
    if (_backdropName) _paintBackdrop(_backdropName, 0, 0);
    if (_spriteScene && _spriteScene.active()) {
      ctx2d.clearRect(0, 0, config.w, config.h);
      ctx2d.fillStyle = config.bg; ctx2d.fillRect(0, 0, config.w, config.h);
      if (_backdropName) _paintBackdrop(_backdropName, 0, 0);
      _spriteScene.draw('back');
    }
    updateCamera();
    // Tremor da câmera (impacto): desloca o mundo aleatoriamente enquanto dura.
    var shx = 0;
    var shy = 0;
    if (camera.shakeT > 0 && camera.shakeMag > 0) {
      shx = (visualRandom() * 2 - 1) * camera.shakeMag;
      shy = (visualRandom() * 2 - 1) * camera.shakeMag;
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
    worldPass = true; // 🌍 culling SO aqui (mundo transladado; HUD fica de fora)
    var activeMap = rpg.maps[rpg.currentMap];
    if (activeMap && typeof activeMap.draw === 'function') {
      try { activeMap.draw(ctx2d); }
      catch (e) { warnOnce('mapdraw:' + rpg.currentMap, 'erro ao desenhar o mapa "' + rpg.currentMap + '": ' + e); }
      if (activeMap.empty && !drawHooks.length) drawEmptyMapNotice(rpg.currentMap);
    }
    drawCampaign();
    runHooks(drawHooks, ctx2d, 'Desenhar o jogo');
    if (debugOverlay) drawDebugOverlay();
    // R21: onda de choque + textos flutuantes são do MUNDO (dentro do translate,
    // acompanham a câmera) e o MOTOR os desenha — por cima do desenho da criança,
    // por baixo de HUD/fala/transição.
    drawShockwaves();
    drawSheetBursts(); // ✨ R25: explosões por folha (mundo, como as ondas)
    drawFloaties();
    worldPass = false;
    if (pushed) ctx2d.restore();
    if (_spriteScene && _spriteScene.active()) { _spriteScene.draw('world'); _spriteScene.draw('front'); _spriteScene.draw('hud'); }
    // HUD: por cima de tudo, SEM câmera (placar/barras ficam presos na tela).
    runHooks(hudHooks, ctx2d, 'Desenhar por cima (HUD)');
    drawCampaignHud();
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
    // A batalha em EQUIPE do Kit RPG é a outra tela do estado 'batalha'.
    if (rpg.battle && state === 'batalha') drawRpgBattle();
    // A caixa de fala e o menu de escolha são UI do MOTOR: sempre no topo.
    drawDialog();
    drawMenu();
    // 🎬 A transição vem por ÚLTIMO: ela existe para ESCONDER a troca de cena —
    // se a fala ficasse por cima do preto, a mágica acabava.
    drawScreenFx();
  }

  /** Tecla de crase: círculos de colisão de pools + combatentes (debug do P24). */
  /**
   * Contorna a caixa que COLIDE de cada coisa viva, com a FORMA de verdade:
   * retângulo da hitbox no padrão, círculo em quem escolheu a caixa redonda —
   * sempre pelos mesmos helpers que o "touching" usa, para o desenho nunca
   * mentir sobre o que colide. (Antes isto desenhava um círculo pelo raio em
   * TUDO, inclusive no que colidia quadrado.)
   * Varre moldes, combatentes E personagens criados: a lista de combatentes só
   * recebe quem toma dano, então num jogo sem combate o herói ficaria de fora.
   */
  /**
   * CARIMBO da passada do overlay. Um personagem pode estar em duas listas, e a
   * de-duplicacao era um indexOf numa lista que cresce: QUADRATICA no
   * numero de personagens. Medido, 3200 entidades custavam 1,40 ms por quadro
   * so nisso.
   *
   * ⚠️ O carimbo NAO pode ser o contador de quadros: com simulacao fixa um quadro
   * pode rodar ZERO passos, o carimbo nao andaria, e o overlay do quadro
   * seguinte acharia que ja desenhou tudo — piscando.
   */
  var debugOverlayPass = 0;
  /** Fora do boxOf: era uma closure NOVA por quadro, com a lista presa nela. */
  function drawDebugBox(e) {
    if (!e || e._active === false) return;
    // VISITAS conta quem chegou ate aqui; CAIXAS conta quem foi contornado. A
    // diferenca entre os dois e a de-duplicacao acontecendo: um personagem pode
    // estar em duas listas, e sem o carimbo ele sairia com contorno duplo.
    perf.visitas += 1;
    if (e._szOverlayPass === debugOverlayPass) return; // ja contornado nesta passada
    e._szOverlayPass = debugOverlayPass;
    var w = hbW(e);
    var h = hbH(e);
    if (!(w > 0) || !(h > 0)) return;
    // Depois da guarda: o contador tem que casar com o que o ctx recebeu, e e
    // essa igualdade que impede a sonda de virar um numero decorativo.
    perf.caixas += 1;
    if (isCircle(e)) {
      var r = hbRadius(e);
      if (!(r > 0)) return;
      ctx2d.beginPath();
      ctx2d.arc(hbCenterX(e), hbCenterY(e), r, 0, Math.PI * 2);
      ctx2d.stroke();
      return;
    }
    ctx2d.strokeRect(hbLeft(e), hbTop(e), w, h);
  }
  function drawDebugOverlay() {
    if (!ctx2d) return;
    ctx2d.save();
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = '#22c55e';
    debugOverlayPass += 1;
    var boxOf = drawDebugBox;
    for (var pk in pools) {
      var act = pools[pk].active;
      for (var i = 0; i < act.length; i++) boxOf(act[i]);
    }
    for (var c = 0; c < combatants.length; c++) boxOf(combatants[c]);
    for (var k = 0; k < characters.length; k++) boxOf(characters[k]);
    ctx2d.restore();
  }

  function stepGameState(dt) {
    if (camera.shakeT > 0) camera.shakeT = Math.max(0, camera.shakeT - dt);
    stepScreenFx(dt);
    var estavaEmBatalha = state === 'batalha';
    stepPkmBattle(dt);
    stepRpgBattle(dt);
    if (state === 'jogando' && !estavaEmBatalha) {
      stepSystems(dt);
      var sceneEpoch = _spriteScene ? _spriteScene.epoch() : 0;
      if (_spriteScene) _spriteScene.step(dt);
      if (_spriteScene && sceneEpoch !== _spriteScene.epoch()) return;
      if (state === 'jogando') runHooks(updateHooks, dt, 'A cada quadro');
    }
  }

  function gameLoop(timestamp) {
    var frameDt = (timestamp - lastTime) / 1000;
    perf.quadros += 1;
    if (!(frameDt >= 0)) frameDt = 0;
    lastTime = timestamp;
    try {
      if (proSim.enabled) {
        proSim.accumulator += frameDt;
        var maxAccumulated = proSim.step * proSim.maxCatchUpSteps;
        if (proSim.accumulator > maxAccumulated) {
          proSim.droppedSeconds += proSim.accumulator - maxAccumulated;
          proSim.accumulator = maxAccumulated;
        }
        var steps = 0;
        while (proSim.accumulator + 0.000000001 >= proSim.step && steps < proSim.maxCatchUpSteps) {
          currentDt = proSim.step;
          frameCount += 1; perf.passos += 1;
          professionalBeforeSimulationStep();
          stepGameState(proSim.step);
          professionalAfterSimulationStep();
          proSim.accumulator -= proSim.step;
          justPressed = {};
          steps += 1;
        }
        proSim.lastFrameSteps = steps;
        proSim.alpha = proSim.step > 0 ? proSim.accumulator / proSim.step : 0;
      } else {
        var dt = frameDt > 0.1 ? 0.1 : frameDt;
        currentDt = dt;
        frameCount += 1; perf.passos += 1;
        stepGameState(dt);
        justPressed = {};
      }
      render();
    } catch (e) {
      warnOnce('gameloop', 'erro no laço do jogo: ' + e);
    }
    requestAnimationFrame(gameLoop);
  }

  // Os "managers" do P24 rodando por quadro (só enquanto joga): spawners por tempo,
  // decaimento de i-frames/empurrão do combate, e a missão (sobreviver/derrotar).
  function stepSystems(dt) {
    playTime += dt;
    stepUiInput(); // fala + menu de escolha: UI do motor, vale em QUALQUER jogo
    stepTweens(dt); // movimentos suaves em curso (✨ mover suave até)
    stepParticles(dt); // física das faíscas (o drawEffects só DESENHA)
    stepTrails(dt); // ✨ R21: rastros contínuos alimentam o pool de faíscas
    stepFloaties(dt); // 🖥️ R21: os "+100" sobem e somem no relógio do jogo
    stepShockwaves(dt); // ✨ R21: anéis da onda de choque crescem e somem
    stepSheetBursts(dt); // ✨ R25: explosões por folha one-shot avançam o quadro
    stepSwings(dt); // decai o tempo dos golpes de ação (🥷)
    stepWaits(); // "Esperar N s, fazer" (⏱️ Tempo) — one-shot no relógio do jogo
    stepLuta(dt); // 🥊 Kit Luta: rounds/fases (travam só os lutadores, sem estado novo)
    stepNave(dt); // 🚀 Kit Nave: a formação marcha, atira, bomba quica, poder expira
    stepTd(dt); // 🏰 Kit Defesa de Torre: as ondas marcham o caminho, avisam vazamento
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
        // Deslocamento do MOTOR segue o padrão do carryRiders: atualiza a
        // varredura junto — o resolveSolid por sobreposição é a rede.
        e._prevX = e.x;
        e._prevY = e.y;
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
    ensureImageLoaded(o.image); // escolher a imagem do Pinta já basta (sem "Carregar")
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
      // 0 = o motor calcula pelo tamanho da CAIXA na hora (hbRadius). Congelar
      // min(w,h)/2 aqui deixava o círculo velho depois de mudar o tamanho.
      radius: 0,
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
      _sweepFromY: 0, _sweepFrame: -1,
      // 🏃 Kit Plataforma: onde nasceu (renascer sem checkpoint), as 3 janelinhas do
      // pulo bom (coyote/buffer/segurar), o pulo duplo, a parede e a carona.
      _bornX: 0, _bornY: 0, _coyoteT: 0, _bufferT: 0, _holdT: 0, _airJumps: 0,
      _wallDir: 0, _wallSide: 0, _wallT: 0, _wallLockT: 0, _dropT: 0,
      _platT: 0, _carryX: 0, _carryY: 0, _patrolDir: 0, _patrolWas: 0,
      _platFrames: null,
      _driftTimer: 0, _patrolTX: 0, _patrolTY: 0, _patrolTimer: 0,
      // 🌫️ R15: opacidade (1 = opaco) e a caixa que COLIDE (0 = usa o desenho).
      opacity: 1, _hbX: 0, _hbY: 0, _hbW: 0, _hbH: 0,
      // 🔵 v0.55: a FORMA da caixa ('' = retângulo, 'circulo' = redonda).
      _hbShape: '',
      // ✨/🎨 R21: rastro contínuo e inclinação ao andar (mesmo shape do pool).
      _trailOn: false, _trailColor: '', _trailSize: 3, _trailRate: 30,
      _trailLife: 0.4, _trailAcc: 0, _trailFrame: -1, _leanMax: 0, _leanNow: 0,
      // 🚀 R22: poder de tiro da nave (o herói É um personagem) + shape do pool.
      _wave: 0, _gunMode: '', _gunT: 0, _naveBomb: false,
      // 🛤️ R25: waypoint atual do caminho que segue (reciclado NÃO herda a rota).
      _pathName: '', _pathIdx: 0, _pathDone: false,
      // 🏰 R26: carimbo da onda de TD (reciclado NÃO marcha na onda fantasma).
      _tdWave: 0
    };
    c._bornX = c.x;
    c._bornY = c.y;
    // Só para o overlay de caixas de colisão alcançar quem não entra em combate.
    if (characters.length < MAX_TRACKED_CHARACTERS) characters.push(c);
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

  function paintLook(look, name, w, h) {
    try {
      ctx2d.scale(num(w, look.baseW) / look.baseW, num(h, look.baseH) / look.baseH);
      look.fn(ctx2d);
      return true;
    } catch (e) {
      // Aparências rodam em todo quadro: diagnostica a receita autoral sem
      // afogar o console e devolve false para drawEntity usar o fallback.
      if (!look.warned) {
        look.warned = true;
        warn('erro na aparência "' + name + '": ' + e);
      }
      return false;
    }
  }

  // Desenha 1 personagem: folha de quadros > aparência (look) > imagem >
  // retângulo. Herda de graça o piscar (i-frames), a virada (facingLeft) e o
  // giro (_angle) — como o RenderSystem do P24.
  function drawEntity(c) {
    if (!ctx2d || !c || typeof c !== 'object') return;
    if (_spriteScene && _spriteScene.owns(c) && !_spriteScenePainting) return;
    // 🌍 Culling: no passe de MUNDO com câmera ligada, quem está fora da vista
    // nem toca o canvas (choke point único: cobre drawActive, drawByDepth,
    // drawCharacter e os NPCs). Margem 128 cobre giro/inclinação + tremor.
    // Seguro: a animação NÃO avança aqui (quadro = função do relógio do jogo).
    if (worldPass && camera.on) {
      var cw = num(c.w, 0);
      var ch = num(c.h, 0);
      if (num(c.x, 0) + cw < camera.x - 128 || num(c.x, 0) > camera.x + config.w + 128 ||
          num(c.y, 0) + ch < camera.y - 128 || num(c.y, 0) > camera.y + config.h + 128) {
        return;
      }
    }
    // Anda? = mudou de posição desde o último quadro (serve p/ grade, teclas e
    // velocidade). Alimenta a folha de andar direcional. ⚠️ Carimbo de quadro: só
    // mede UMA vez por quadro por entidade — desenhar o mesmo personagem 2× (ex.:
    // "por profundidade" + "desenhar o personagem") congelava a animação de andar,
    // porque a 2ª medida comparava x com ele mesmo.
    if (c._moveFrame !== frameCount) {
      c._moveFrame = frameCount;
      c._moving = (Math.abs(num(c.x, 0) - num(c._lastX, 0)) > 0.01 ||
                   Math.abs(num(c.y, 0) - num(c._lastY, 0)) > 0.01);
      // 🎨 R21: inclinacao ao andar de lado (le o dx ANTES de sobrescrever _lastX;
      // roda 1x por quadro pelo mesmo carimbo — desenhar 2x nao dobra o tombo).
      if (num(c._leanMax, 0)) {
        var ldx = num(c.x, 0) - num(c._lastX, 0);
        var lTarget = ldx > 0.01 ? num(c._leanMax, 0) : ldx < -0.01 ? -num(c._leanMax, 0) : 0;
        c._leanNow = num(c._leanNow, 0) + (lTarget - num(c._leanNow, 0)) * Math.min(1, 12 * currentDt);
      } else if (num(c._leanNow, 0)) {
        c._leanNow = 0;
      }
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
    // O lean do R21 SOMA no giro da criança (girar + inclinar convivem).
    var ang = num(c._angle, 0) + num(c._leanNow, 0);
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
          var frame = Math.floor(el * c._animFps);
          idx += c._animOnce ? Math.min(span - 1, frame) : frame % span;
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
      drew = paintLook(look, text(c.look, ''), c.w, c.h);
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
    // ⭐ Pinta só enquanto o golpe MACHUCA — no recuo a caixa existe e não aparece.
    // É frame data ensinada a uma criança de 10 anos sem uma palavra: "o retângulo
    // branco é o momento em que dói".
    if (inSwingWindow(c)) {
      ctxSave();
      try {
        var sb = swingBox(c);
        ctx2d.globalAlpha = 0.45 * Math.min(1, c._swingT / 0.3);
        ctx2d.fillStyle = 'white'; // ⚠️ vazava: só o globalAlpha era devolvido
        ctx2d.fillRect(sb.x, sb.y, sb.w, sb.h);
      } catch (e) {}
      ctxRestore();
    }
  }

  function drawCharacter(c) {
    drawEntity(c);
  }


  // ---- 🎞️ Folha de quadros (Sprite + Animations do RPG kit, simplificado) ----

  function setSheet(c, imageName, fw, fh) {
    if (!c || typeof c !== 'object') return;
    ensureImageLoaded(imageName);
    c._sheetImg = text(imageName, '');
    c._sheetFw = Math.max(1, num(fw, num(c.w, 32)));
    c._sheetFh = Math.max(1, num(fh, num(c.h, 32)));
    c._animFrom = 0; c._animTo = 0; c._animFps = 0; c._animStart = 0; c._animOnce = false;
  }
  function playAnim(c, from, to, fps) {
    if (!c || typeof c !== 'object') return;
    var f = Math.max(0, Math.floor(num(from, 0)));
    var t = Math.max(f, Math.floor(num(to, f)));
    var r = Math.max(1, num(fps, 8));
    // Guarda de transição (padrão g2d): re-tocar a MESMA animação todo quadro
    // NÃO reinicia — senão o 1º quadro congela para sempre.
    if (c._animFrom === f && c._animTo === t && c._animFps === r && !c._animOnce) return;
    c._animFrom = f;
    c._animTo = t;
    c._animFps = r;
    c._animOnce = false;
    // O relógio é o playTime (só anda em 'jogando') — a animação PAUSA junto.
    c._animStart = playTime;
  }

  // Folha de ANDAR direcional (personagem de topo estilo RPGMaker): a folha tem 4
  // LINHAS na ordem baixo/cima/esquerda/direita, cada uma com N quadros. O
  // drawEntity escolhe a linha pela direção que o personagem olha e anima a coluna
  // quando ele anda (parado = 1º quadro). Espelha o walk/idle por direção do
  // Sprite.animations do Pizza Legends, mas por FOLHA em vez de col,row autoral.
  /**
   * Tocar uma animacao UMA VEZ e travar no ultimo quadro (em vez de repetir).
   * Complementa o "Tocar a animacao" comum, que repete para sempre.
   */
  function playAnimOnce(c, from, to, fps) {
    if (!c || typeof c !== 'object') return;
    var f = Math.max(0, Math.floor(num(from, 0)));
    var t = Math.max(f, Math.floor(num(to, f)));
    var r = Math.max(1, num(fps, 8));
    if (c._animFrom === f && c._animTo === t && c._animFps === r && c._animOnce) return;
    startAnimOnce(c, f, t, r);
  }
  // O autoAnimate já protege a transição por ESTADO. Quando um estado one-shot
  // volta depois de outro estado, ele precisa reiniciar mesmo usando os mesmos
  // quadros; a API manual acima continua idempotente quando chamada todo quadro.
  function startAnimOnce(c, f, t, r) {
    c._animFrom = f; c._animTo = t; c._animFps = r; c._animOnce = true;
    c._animStart = playTime;
  }
  /** "Ja tocou tudo?" - puro, sai da conta do playTime: sem lista, sem passo, sem
   * reset. Vale para animacao de uma vez so (a que repete nunca "acaba"). */
  function animEnded(c) {
    if (!c || typeof c !== 'object') return true;
    if (!c._animOnce) return false;
    var span = num(c._animTo, 0) - num(c._animFrom, 0) + 1;
    var fps = num(c._animFps, 0);
    if (!(fps > 0) || !(span > 0)) return true;
    return (playTime - num(c._animStart, 0)) * fps >= span;
  }

  // ---- ANIMACAO POR ESTADO (a trava) ----
  // A TRAVA pertence ao ESTADO, nao a animacao - e por isso que ela serve aos TRES
  // sistemas de animacao (folha manual, folha de andar, quadros por fisica) e
  // tambem ao vetorial, que nao tem quadro nenhum para "terminar".
  //
  // Sem ela, a crianca manda golpear e a animacao de ANDAR apaga o golpe no quadro
  // seguinte. A base de luta resolve com uma cadeia de prioridade fixa dentro do
  // switchSprite; aqui a prioridade e constante do motor (ninguem quer "andar
  // atropela morrer") e o que a crianca responde e o que muda o jogo: se aquela
  // animacao pode ou nao ser interrompida.
  var STATE_FALLBACK = {
    morte: [],
    golpe: ['parado'],
    dano: ['parado'],
    caindo: ['pulando', 'andando', 'parado'],
    pulando: ['andando', 'parado'],
    andando: ['parado'],
    parado: []
  };
  var STATE_NAMES = { parado: 1, andando: 1, pulando: 1, caindo: 1, dano: 1, golpe: 1, morte: 1 };
  var STATE_LIST = 'use parado, andando, pulando, caindo, dano, golpe ou morte';
  // Cadeias completas pre-computadas (estado + fallbacks): o autoAnimate roda
  // por-entidade-por-quadro e um concat ali alocaria ate ~18k arrays/s num enxame.
  var STATE_CHAIN = (function () {
    var m = {};
    for (var k in STATE_FALLBACK) m[k] = [k].concat(STATE_FALLBACK[k]);
    return m;
  })();

  /** Poe a entidade num estado por N segundos - e e a TRAVA: enquanto durar, o
   * autoAnimate nao deixa a fisica roubar a animacao. secs <= 0 = ate a animacao
   * declarada do estado acabar. */
  function setEntityState(who, name, secs) {
    if (!who || typeof who !== 'object') return;
    var st = text(name, '');
    if (!STATE_NAMES[st]) { warnOnce('estado:' + st, 'o estado "' + st + '" nao existe (' + STATE_LIST + ')'); return; }
    who._state = st;
    who._stateUntil = playTime + Math.max(0, num(secs, 0));
  }
  function entityState(who) {
    if (!who || typeof who !== 'object') return 'parado';
    if (who._state && playTime < num(who._stateUntil, 0)) return who._state;
    return derivedState(who);
  }
  /** Declara a animacao de UM estado (1x no comeco). O autoAnimate troca sozinho. */
  function stateAnim(who, name, from, to, fps, once) {
    if (!who || typeof who !== 'object') return;
    var st = text(name, '');
    if (!STATE_NAMES[st]) { warnOnce('stateanim:' + st, 'o estado "' + st + '" nao existe (' + STATE_LIST + ')'); return; }
    if (!who._stateAnims) who._stateAnims = {};
    var f = Math.max(0, Math.floor(num(from, 0)));
    var t = Math.max(f, Math.floor(num(to, f)));
    who._stateAnims[st] = { from: f, to: t, fps: Math.max(1, num(fps, 8)), once: !!once };
  }
  /** O caminho VETORIAL do mesmo contrato: a aparencia de um estado (sem folha). */
  function stateLook(who, name, lookName) {
    if (!who || typeof who !== 'object') return;
    var st = text(name, '');
    if (!STATE_NAMES[st]) { warnOnce('statelook:' + st, 'o estado "' + st + '" nao existe (' + STATE_LIST + ')'); return; }
    if (!who._stateLooks) who._stateLooks = {};
    who._stateLooks[st] = text(lookName, '');
  }
  /** Deriva o estado pela FISICA, na ordem fixa da base de luta (que esta certa):
   * morte > golpe > dano > no ar > andando > parado. */
  function derivedState(c) {
    if (num(c.maxHealth, 0) > 0 && num(c.health, 0) <= 0) return 'morte';
    if (num(c._swingT, 0) > 0) return 'golpe';
    if (num(c._iFrames, 0) > 0) return 'dano';
    if (c.onGround === false) return num(c.vy, 0) < 0 ? 'pulando' : 'caindo';
    if (Math.abs(num(c.vx, 0)) > 0.01) return 'andando';
    return 'parado';
  }
  /**
   * Anima sozinho pelo que a entidade esta FAZENDO. Use todo quadro.
   * Nada declarado = no-op: quem nao usa nao paga nada.
   */
  function autoAnimate(who) {
    if (!who || typeof who !== 'object') return;
    // 1) estado TRAVADO vence a fisica (e a trava)
    var st = (who._state && playTime < num(who._stateUntil, 0)) ? who._state : derivedState(who);
    // 2) flip pelo sinal de vx - so se NAO houver folha de andar (essa tem uma
    //    linha por direcao e se vira sozinha).
    if (!text(who._walkImg, '')) {
      var vx = num(who.vx, 0);
      if (vx > 0.01) { who._facingDir = 'right'; who._facingLeft = false; }
      else if (vx < -0.01) { who._facingDir = 'left'; who._facingLeft = true; }
    }
    // 3) o estado sem visual declarado cai no parente mais proximo, numa ordem FIXA
    //    e previsivel (caindo parece pular; pular parece andar; golpe parece parado).
    var anims = who._stateAnims;
    var looks = who._stateLooks;
    var key = null;
    // st e sempre um dos 7 nomes (derivedState/setEntityState validam); o ramo
    // lazy e so rede - o mapa nao cresce alem deles.
    var chain = STATE_CHAIN[st] || (STATE_CHAIN[st] = [st].concat(STATE_FALLBACK[st] || []));
    for (var i = 0; i < chain.length; i++) {
      if ((anims && anims[chain[i]]) || (looks && looks[chain[i]])) { key = chain[i]; break; }
    }
    if (!key) {
      // O visual atual pode continuar parado no último quadro, mas ele não é
      // mais o ESTADO lógico ativo. Limpar a transição permite tocar o mesmo
      // one-shot de novo quando a entidade voltar àquele estado.
      who._animState = undefined;
      return;
    }
    if (looks && looks[key]) who.look = looks[key];
    if (anims && anims[key]) {
      var a = anims[key];
      if (a.once) {
        // fps ESTICADO p/ a animacao durar exatamente a trava: e isto que faz
        // "pular quadro" nao quebrar nada - a mecanica manda, a animacao obedece.
        var dur = num(who._stateUntil, 0) - playTime;
        var span = a.to - a.from + 1;
        var fps = (who._state === key && dur > 0.01) ? span / dur : a.fps;
        if (who._animState !== key) startAnimOnce(who, a.from, a.to, fps);
      } else if (who._animState !== key) playAnim(who, a.from, a.to, a.fps);
    }
    who._animState = key;
  }

  function setWalkSheet(c, imageName, fw, fh) {
    if (!c || typeof c !== 'object') return;
    ensureImageLoaded(imageName);
    c._walkImg = text(imageName, '');
    c._walkFw = Math.max(1, num(fw, num(c.w, 16)));
    c._walkFh = Math.max(1, num(fh, num(c.h, 16)));
    c._walkFrames = 0; // 0 = usar todas as colunas da folha
  }

  function drawBackground(color, grid) {
    if (!ctx2d) return;
    // O fundo chapado é OPACO: por cima do cenário, ele some sem explicação.
    if (_backdropName) warnOnce('backdrop-tapado', 'o bloco “Pintar o fundo” está tapando o seu cenário — tire um dos dois');
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
  /**
   * ⭐ ONDE a caixa vale, e por quê:
   *   · vale  → encostar, olhar, o ponto, a colisão SÓLIDA (parede/chão/tile), as
   *             plataformas de atravessar, andar em cima, pisar no inimigo;
   *   · NÃO vale → borda da tela (não sair / quicar / emendar). Essas são sobre o
   *             DESENHO: a criança quer que o sprite não suma da tela, não que a
   *             caixa não suma. Manter as bordas no desenho é a escolha certa.
   *
   * ⭐ E onde a FORMA vale (v0.55): o círculo é só de ENCOSTAR — encostar, o par
   * que se encosta, o golpe, o pisar e o clique. O empurrão SÓLIDO (parede, chão,
   * tile, plataforma) segue por retângulo: ele resolve pelo menor eixo de
   * sobreposição, uma conta que não existe em círculo, e trocá-la mexeria em todo
   * jogo de plataforma que já existe. Região e porcentagem também seguem quadradas.
   */
  function setHitbox(who, ox, oy, w, h) {
    if (!who || typeof who !== 'object') return;
    who._hbX = num(ox, 0);
    who._hbY = num(oy, 0);
    who._hbW = Math.max(0, num(w, 0));
    who._hbH = Math.max(0, num(h, 0));
  }
  /** A FORMA da caixa: 'circulo' arredonda, qualquer outra coisa volta ao retângulo.
   * O raio segue o idioma do _hbW/_hbH: 0 = o motor calcula pelo tamanho. */
  function setHitboxShape(who, shape, radius) {
    if (!who || typeof who !== 'object') return;
    who._hbShape = text(shape, '') === 'circulo' ? 'circulo' : '';
    who.radius = Math.max(0, num(radius, 0));
  }
  function hbLeft(e) { return num(e.x, 0) + num(e._hbX, 0); }
  function hbTop(e) { return num(e.y, 0) + num(e._hbY, 0); }
  function hbW(e) { var v = num(e._hbW, 0); return v > 0 ? v : num(e.w, 0); }
  function hbH(e) { var v = num(e._hbH, 0); return v > 0 ? v : num(e.h, 0); }
  function hbRight(e) { return hbLeft(e) + hbW(e); }
  function hbBottom(e) { return hbTop(e) + hbH(e); }
  /** Intervalo vertical coberto por uma queda. moveByVelocity registra o começo
   * separado de _prevY porque colisões sólidas atualizam _prevY antes da one-way. */
  function oneWayFeetFrom(e) {
    var y = num(e.y, 0);
    var fromY = e._sweepFrame === frameCount ? num(e._sweepFromY, y) : y;
    return Math.min(fromY, y) + num(e._hbY, 0) + hbH(e);
  }
  function oneWayFeetTo(e, d) {
    var feet = hbBottom(e);
    return Math.max(feet, feet + num(e.vy, 0) * d);
  }
  /** ⚠️ CAMINHO MAIS QUENTE do runtime: o overlapGroups chama isto até 90 mil vezes
   * por quadro (300 × 300 é o teto de dois enxames cheios). Por isso as bordas são
   * lidas INLINE, uma vez cada: a versão com os 8 hb* aninhados custava ~22 num()
   * por par (o hbRight recalcula o hbLeft por dentro) contra 12 aqui. Mesma conta,
   * mesma caixa — só sem o trabalho repetido. */
  function touching(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    // Sem forma declarada dos dois lados (o caso de quase todo jogo) o caminho
    // quente segue IDÊNTICO: duas leituras de propriedade a mais, nada de contas.
    if (a._hbShape || b._hbShape) return touchingByShape(a, b);
    var aw = num(a._hbW, 0); if (!(aw > 0)) aw = num(a.w, 0);
    var ah = num(a._hbH, 0); if (!(ah > 0)) ah = num(a.h, 0);
    var bw = num(b._hbW, 0); if (!(bw > 0)) bw = num(b.w, 0);
    var bh = num(b._hbH, 0); if (!(bh > 0)) bh = num(b.h, 0);
    var al = num(a.x, 0) + num(a._hbX, 0);
    var at = num(a.y, 0) + num(a._hbY, 0);
    var bl = num(b.x, 0) + num(b._hbX, 0);
    var bt = num(b.y, 0) + num(b._hbY, 0);
    return al < bl + bw && al + aw > bl && at < bt + bh && at + ah > bt;
  }
  /** O ramo frio do touching: pelo menos um dos dois é redondo. */
  function touchingByShape(a, b) {
    var ca = isCircle(a);
    var cb = isCircle(b);
    if (ca && cb) {
      var dx = hbCenterX(a) - hbCenterX(b);
      var dy = hbCenterY(a) - hbCenterY(b);
      var rr = hbRadius(a) + hbRadius(b);
      return dx * dx + dy * dy < rr * rr;
    }
    var circle = ca ? a : b;
    var rect = ca ? b : a;
    return circleHitsRect(circle, hbLeft(rect), hbTop(rect), hbW(rect), hbH(rect));
  }
  function isCircle(e) { return !!e && e._hbShape === 'circulo'; }
  /** O raio que COLIDE: o pedido pela criança, ou metade do menor lado da CAIXA.
   * Derivar na hora (em vez de congelar no nascimento, como era) conserta de graça
   * o raio velho depois de mudar o tamanho do sprite. */
  function hbRadius(e) {
    var r = num(e.radius, 0);
    if (r > 0) return r;
    return Math.min(hbW(e), hbH(e)) / 2;
  }
  /** Círculo × retângulo: distância do centro ao ponto mais perto do retângulo. */
  function circleHitsRect(c, rl, rt, rw, rh) {
    var cx = hbCenterX(c);
    var cy = hbCenterY(c);
    var r = hbRadius(c);
    var nx = Math.max(rl, Math.min(cx, rl + rw));
    var ny = Math.max(rt, Math.min(cy, rt + rh));
    var dx = cx - nx;
    var dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function hbCenterX(e) { return hbLeft(e) + hbW(e) / 2; }
  function hbCenterY(e) { return hbTop(e) + hbH(e) / 2; }
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
      speed: 0, speedMultiplier: 1, damage: 0, color: '', image: '', look: '', radius: 0,
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
      _sweepFromY: 0, _sweepFrame: -1,
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
      opacity: 1, _hbX: 0, _hbY: 0, _hbW: 0, _hbH: 0, _hbShape: '',
      // ✨/🎨 R21: rastro contínuo e inclinação ao andar (reciclar sem zerar
      // deixaria o inimigo novo nascer soltando o jato do anterior, tombado).
      _trailOn: false, _trailColor: '', _trailSize: 3, _trailRate: 30,
      _trailLife: 0.4, _trailAcc: 0, _trailFrame: -1, _leanMax: 0, _leanNow: 0,
      // 🚀 R22: o carimbo da onda (reciclado NÃO marcha na formação fantasma),
      // o poder de tiro e a marca de bomba do kit.
      _wave: 0, _gunMode: '', _gunT: 0, _naveBomb: false,
      // 🛤️ R25: waypoint atual (reciclado NÃO herda a rota do dono anterior).
      _pathName: '', _pathIdx: 0, _pathDone: false,
      // 🏰 R26: carimbo da onda de TD (anti-fantasma).
      _tdWave: 0,
      // 🥷 R18: a janela do golpe (recuo/ativo em segundos; 0/0 = o golpe inteiro
      // machuca, que é o comportamento de sempre) e o ESTADO com a trava de
      // animação. Reciclar sem zerar deixaria o inimigo novo nascer "golpeando",
      // ou travado no estado de morte do anterior.
      _swingStart: 0, _swingActive: 0, _swingDur: 0,
      _animOnce: false, _animState: '',
      _state: '', _stateUntil: 0, _stateAnims: null, _stateLooks: null
    };
  }
  function defineMold(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o molde" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    ensureImageLoaded(o.image); // a imagem do molde (Pinta) carrega sozinha
    var w = num(o.w, 40), h = num(o.h, 40);
    molds[k] = {
      w: w, h: h,
      health: num(o.health, 20),
      speed: num(o.speed, 120),
      damage: num(o.damage, 10),
      color: text(o.color, '#e94f4f'),
      image: text(o.image, ''),
      look: text(o.look, ''),
      // A forma vale para TODO mundo que nascer deste molde (é assim que tiro e
      // inimigo ficam redondos: eles não têm nome p/ receber um bloco próprio).
      shape: text(o.shape, '') === 'circulo' ? 'circulo' : '',
      radius: 0
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
    // A collected source still names its surviving track copies. Do not reuse that
    // identity for another wave until the family has gone away.
    var freeIndex = pool.free.length - 1;
    while (freeIndex >= 0 && _spriteScene.retains(pool.free[freeIndex])) freeIndex--;
    var e = freeIndex >= 0 ? pool.free.splice(freeIndex, 1)[0] : null;
    if (!e) e = blankEntity();
    e.x = num(x, 0); e.y = num(y, 0);
    e.w = m.w; e.h = m.h;
    e.speed = m.speed; e.speedMultiplier = 1; e.damage = m.damage; e.color = m.color;
    e.image = m.image; e.look = m.look; e.radius = m.radius; e._hbShape = m.shape || '';
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
    // R18: janela do golpe + estado/trava de animação (ver blankEntity).
    e._swingStart = 0; e._swingActive = 0; e._swingDur = 0;
    e._animOnce = false; e._animState = '';
    e._state = ''; e._stateUntil = 0; e._stateAnims = null; e._stateLooks = null;
    // ⚙️ Física: reciclado NÃO pode nascer "no chão" nem com recarga/varredura velhas.
    e.onGround = false; e._maxFall = 0; e._cd = 0; e._prevX = e.x; e._prevY = e.y;
    e._sweepFromY = e.y; e._sweepFrame = -1;
    e._bornX = e.x; e._bornY = e.y;
    e._coyoteT = 0; e._bufferT = 0; e._holdT = 0; e._airJumps = 0;
    e._wallDir = 0; e._wallSide = 0; e._wallT = 0; e._wallLockT = 0; e._dropT = 0;
    e._platT = 0; e._carryX = 0; e._carryY = 0; e._patrolDir = 0; e._patrolWas = 0;
    e._platFrames = null;
    e._driftTimer = 0; e._patrolTX = 0; e._patrolTY = 0; e._patrolTimer = 0;
    e.opacity = 1; e._hbX = 0; e._hbY = 0; e._hbW = 0; e._hbH = 0;
    // R21: rastro/lean (ver blankEntity — o contrato exige o par).
    e._trailOn = false; e._trailColor = ''; e._trailSize = 3; e._trailRate = 30;
    e._trailLife = 0.4; e._trailAcc = 0; e._trailFrame = -1; e._leanMax = 0; e._leanNow = 0;
    // R22: sem carimbo de onda, sem poder, sem marca de bomba.
    e._wave = 0; e._gunMode = ''; e._gunT = 0; e._naveBomb = false;
    e._pathName = ''; e._pathIdx = 0; e._pathDone = false; // 🛤️ R25
    e._tdWave = 0; // 🏰 R26
    pool.active.push(e);
    return e;
  }
  function spawnAtEdge(name) {
    // Margem de nascimento 100 = ENEMY_SPAWN_MARGIN do P24. Com câmera, nasce
    // nas bordas do retângulo VISÍVEL (o inimigo sempre entra "por perto").
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    var edge = Math.floor(gameRandom() * 4);
    var x, y;
    if (edge === 0) { x = ox + gameRandom() * config.w; y = oy - 100; }
    else if (edge === 1) { x = ox + config.w + 100; y = oy + gameRandom() * config.h; }
    else if (edge === 2) { x = ox + gameRandom() * config.w; y = oy + config.h + 100; }
    else { x = ox - 100; y = oy + gameRandom() * config.h; }
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
    _spriteScene.release(e);
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
        _spriteScene.release(dead);
        pool.active.splice(i, 1);
        pool.free.push(dead);
      }
    }
  }
  function releaseAll(pool) {
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      _spriteScene.release(e);
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
      var outside = _spriteScene.owns(e) ? _spriteScene.offscreen(e, m) :
        e.x < ox - m || e.x > ox + config.w + m || e.y < oy - m || e.y > oy + config.h + m;
      if (outside) {
        recycle(e);
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
  /**
   * O vivo do molde MAIS PERTO de um ponto (ou null). Nao havia acumulador de
   * minimo: a torre que escolhe o alvo (tower defense) e a IA de horda eram
   * inexprimiveis - a crianca so conseguia "o primeiro que encostar".
   */
  function nearestActive(moldName, x, y) {
    var k = text(moldName, '');
    var pool = pools[k];
    if (!pool) { warnOnce('nearest:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var px = num(x, 0), py = num(y, 0);
    var best = null, bestD = Infinity;
    var act = pool.active;
    for (var i = 0; i < act.length; i++) {
      var e = act[i];
      if (!e || e._active === false) continue;
      var dx = centerX(e) - px, dy = centerY(e) - py;
      var d = dx * dx + dy * dy; // sem sqrt: comparar quadrados basta e e mais rapido
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  /**
   * 🎲 R21: um vivo QUALQUER do molde (ou null). E o "um invasor aleatorio atira"
   * do Space Invaders — e loot/IA de horda em qualquer genero. Sorteio em duas
   * passadas (conta -> k-esimo), zero alocacao.
   */
  function randomActive(moldName) {
    var k = text(moldName, '');
    var pool = pools[k];
    if (!pool) { warnOnce('random:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var act = pool.active;
    var n = 0;
    var i;
    for (i = 0; i < act.length; i++) {
      if (act[i] && act[i]._active !== false) n++;
    }
    if (!n) return null;
    var pick = Math.floor(gameRandom() * n);
    for (i = 0; i < act.length; i++) {
      var e = act[i];
      if (!e || e._active === false) continue;
      if (pick === 0) return e;
      pick--;
    }
    return null;
  }
  /**
   * 🎲 R25 — o vivo do molde com a MAIOR/MENOR de uma propriedade (ou 'progresso
   * no caminho'). Generaliza nearest/random: o alvo "mais avançado no caminho"
   * do Tower Defense sai DE GRAÇA daqui ("genérico primeiro"). Varredura sem
   * alocação (irmã do nearestActive).
   */
  function pickActive(moldName, mode, prop) {
    var k = text(moldName, '');
    var pool = pools[k];
    if (!pool) { warnOnce('pick:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"'); return null; }
    var wantMax = text(mode, 'maior') !== 'menor';
    var p = text(prop, 'x');
    var isPath = p === 'pathProgress';
    var act = pool.active;
    var best = null, bestV = wantMax ? -Infinity : Infinity;
    for (var i = 0; i < act.length; i++) {
      var e = act[i];
      if (!e || e._active === false) continue;
      var v = isPath ? pathProgress(e) : (ENTITY_PROPS[p] ? num(e[p], 0) : 0);
      if ((wantMax && v > bestV) || (!wantMax && v < bestV)) { bestV = v; best = e; }
    }
    return best;
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
    if (who._driftAngle == null) who._driftAngle = gameRandom() * Math.PI * 2;
    who._driftTimer = (who._driftTimer || 0) + d;
    if (who._driftTimer >= 2) { who._driftAngle = gameRandom() * Math.PI * 2; who._driftTimer = 0; }
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
    // A colisão sólida substitui _prevY pela posição resolvida. Esta origem fica
    // intacta até o fim do quadro para a plataforma one-way testar o cruzamento.
    who._sweepFromY = who._prevY;
    who._sweepFrame = frameCount;
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
  /** ⭐ Pela CAIXA DE COLISÃO, não pelo desenho: era a metade que faltava do
   * "Caixa de colisão de %1" — só o encostar/olhar respeitava a caixa, e o
   * empurrão (que é o que o bloco vende: "o herói bate a cabeça") ignorava. Sem
   * caixa declarada os hb* devolvem x/y/w/h, então nada muda para quem não usa. */
  function resolveSolid(who, tx, ty, tw, th, byCenter) {
    var overlapX = Math.min(hbRight(who), tx + tw) - Math.max(hbLeft(who), tx);
    var overlapY = Math.min(hbBottom(who), ty + th) - Math.max(hbTop(who), ty);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) {
      var leftward = byCenter ? (hbCenterX(who) < tx + tw / 2) : (hbLeft(who) < tx);
      who.x = num(who.x, 0) + (leftward ? -overlapX : overlapX);
      who.vx = 0;
      // De que LADO ficou a parede: empurrei para a esquerda = parede à direita.
      // Espelha o onGround (a gravidade zera, a colisão marca) e é o que o Kit
      // Plataforma lê para o wall jump / deslizar na parede.
      who._wallDir = leftward ? 1 : -1;
    } else {
      var upward = byCenter ? (hbCenterY(who) < ty + th / 2) : (hbTop(who) < ty);
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
      resolveSolid(who, hbLeft(o), hbTop(o), hbW(o), hbH(o), true);
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
  /**
   * Colisão ONE-WAY das peças PLATAFORMA do tilemap (pisa por cima, atravessa
   * por baixo). MESMA técnica de cruzamento de plano do oneWayPlatform (molde):
   * só segura CAINDO e quando o pé cruza o topo da peça neste quadro. Não é
   * varrido — o intervalo preserva o começo do movimento e projeta o próximo
   * passo, cobrindo tanto a ordem mover→colidir quanto a chamada antes de mover.
   */
  function collideTilemapPlatform(who, m, d) {
    if (!m.platform) return;
    if (num(who.vy, 0) < 0) return; // subindo: atravessa
    if (num(who._dropT, 0) > 0) return; // pediu descer (↓): ignora
    var t = tilePx;
    var feetFrom = oneWayFeetFrom(who);
    var feetTo = oneWayFeetTo(who, d);
    var c0 = Math.floor(hbLeft(who) / t);
    var c1 = Math.floor((hbRight(who) - 1) / t);
    var rowCount = m.rows.length; if (!rowCount) return;
    // A API pública aceita posição/velocidade: limite ao mapa real para não
    // percorrer milhões de índices inexistentes nem ultrapassar o inteiro seguro.
    var r0 = Math.max(0, Math.floor(feetFrom / t));
    var r1 = Math.min(rowCount - 1, Math.floor(feetTo / t) + 1);
    if (r0 > r1) return;
    for (var r = r0; r <= r1; r++) {
      var rowArr = m.rows[r];
      if (!rowArr) continue;
      var top = r * t;
      if (feetFrom > top + 1) continue; // começou abaixo do topo: não é pouso
      if (feetTo < top) continue; // não alcança o plano neste quadro
      var firstCol = Math.max(0, c0);
      var lastCol = Math.min(rowArr.length - 1, c1);
      for (var c = firstCol; c <= lastCol; c++) {
        var idx = rowArr[c];
        if (idx == null || idx < 0 || !m.platform[idx]) continue;
        if (hbRight(who) <= c * t) continue;
        if (hbLeft(who) >= c * t + t) continue;
        who.y = top - hbH(who) - num(who._hbY, 0);
        who.vy = 0;
        who.onGround = true;
        who._prevY = num(who.y, 0); // a varredura não desfaz este pouso
        who._sweepFrame = -1;
        return;
      }
    }
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
    collideTilemapPlatform(who, m, currentDt);
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

  /**
   * A CAIXA ENVOLVENTE do que de fato colide. Circulo NAO e a caixa: o bloco
   * "forma redonda, raio 40" num sprite 32x32 poe o circulo 24 px para FORA
   * dela, e um indice que recortasse pela caixa rejeitaria acerto de verdade.
   */
  function _shapeLeft(e) { return isCircle(e) ? hbCenterX(e) - hbRadius(e) : hbLeft(e); }
  function _shapeTop(e) { return isCircle(e) ? hbCenterY(e) - hbRadius(e) : hbTop(e); }
  function _shapeRight(e) { return isCircle(e) ? hbCenterX(e) + hbRadius(e) : hbLeft(e) + hbW(e); }
  function _shapeBottom(e) { return isCircle(e) ? hbCenterY(e) + hbRadius(e) : hbTop(e) + hbH(e); }
  function _overlapBounds(e) {
    return [_shapeLeft(e), _shapeTop(e), _shapeRight(e), _shapeBottom(e)];
  }
  function _snapshotOverlapBounds(lista) {
    var limites = new Array(lista.length);
    for (var i = 0; i < lista.length; i++) {
      var e = lista[i];
      limites[i] = (!e || e._active === false) ? null : _overlapBounds(e);
    }
    return limites;
  }
  function _overlapBoundsTouch(a, b) {
    return !!a && !!b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  }
  /**
   * Abaixo deste tanto de PARES o indice nem roda: montar o mapa de celulas
   * custa mais do que o laco duplo poupa. 1600 = 40x40, e o teste da sonda
   * crava exatamente esse numero para o limiar nao virar folclore.
   */
  var OVERLAP_INDEX_MIN_PARES = 1600;
  var OVERLAP_CELL = 64;
  /**
   * Mapa de celulas sobre a lista B, para achar os vizinhos de cada A.
   *
   * ⚠️ Devolve objeto NOVO, e o rascunho vive dentro dele: o corpo que a
   * crianca escreve pode chamar OUTRO "para cada par" la dentro, e um singleton
   * de modulo seria sobrescrito no meio da varredura de fora.
   */
  function _buildOverlapIndex(limites) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < limites.length; i++) {
      var limite = limites[i];
      if (!limite) continue;
      var l = limite[0], t = limite[1], r = limite[2], b = limite[3];
      if (l < minX) minX = l;
      if (t < minY) minY = t;
      if (r > maxX) maxX = r;
      if (b > maxY) maxY = b;
    }
    if (!(maxX >= minX)) return null;
    var cols = Math.floor((maxX - minX) / OVERLAP_CELL) + 1;
    var rows = Math.floor((maxY - minY) / OVERLAP_CELL) + 1;
    // Mundo enorme com dois bichos nas pontas: o mapa teria milhoes de celulas
    // vazias e o remedio sairia mais caro que a doenca.
    if (cols * rows > 262144) return null;
    var cells = new Array(cols * rows);
    for (var j = 0; j < limites.length; j++) {
      var limite2 = limites[j];
      if (!limite2) continue;
      var c0 = Math.floor((limite2[0] - minX) / OVERLAP_CELL);
      var c1 = Math.floor((limite2[2] - minX) / OVERLAP_CELL);
      var r0 = Math.floor((limite2[1] - minY) / OVERLAP_CELL);
      var r1 = Math.floor((limite2[3] - minY) / OVERLAP_CELL);
      for (var rr = r0; rr <= r1; rr++) {
        for (var cc = c0; cc <= c1; cc++) {
          var k = rr * cols + cc;
          if (k < 0 || k >= cells.length) continue;
          (cells[k] || (cells[k] = [])).push(j);
        }
      }
    }
    return { cells: cells, cols: cols, rows: rows, minX: minX, minY: minY, scratch: [] };
  }
  /**
   * Os indices de B que podem encostar em A, em ordem DECRESCENTE.
   *
   * A ordem nao e detalhe: o laco original desce, e a parada em
   * quando o A e recolhido torna essa ordem observavel no placar da crianca.
   */
  function _overlapCandidates(indice, limiteA) {
    var saida = indice.scratch;
    saida.length = 0;
    var c0 = Math.floor((limiteA[0] - indice.minX) / OVERLAP_CELL);
    var c1 = Math.floor((limiteA[2] - indice.minX) / OVERLAP_CELL);
    var r0 = Math.floor((limiteA[1] - indice.minY) / OVERLAP_CELL);
    var r1 = Math.floor((limiteA[3] - indice.minY) / OVERLAP_CELL);
    if (c1 < 0 || r1 < 0 || c0 >= indice.cols || r0 >= indice.rows) return saida;
    if (c0 < 0) c0 = 0;
    if (r0 < 0) r0 = 0;
    if (c1 >= indice.cols) c1 = indice.cols - 1;
    if (r1 >= indice.rows) r1 = indice.rows - 1;
    for (var rr = r0; rr <= r1; rr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var lista = indice.cells[rr * indice.cols + cc];
        if (!lista) continue;
        for (var i = 0; i < lista.length; i++) saida.push(lista[i]);
      }
    }
    if (saida.length > 1) {
      saida.sort(function (x, y) { return y - x; });
      // O mesmo B pode estar em varias celulas: sem tirar o repetido, o corpo
      // da crianca rodaria duas vezes para o MESMO par.
      var escrita = 1;
      for (var k = 1; k < saida.length; k++) if (saida[k] !== saida[k - 1]) saida[escrita++] = saida[k];
      saida.length = escrita;
    }
    return saida;
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
    var paresExaminados = 0;
    // ⚠️ O indice so entra quando ha par o bastante para pagar a montagem, e a
    // ORDEM que ele devolve e a mesma do laco duplo (decrescente): a parada em
    // parada em A recolhido torna a ordem observavel no placar da crianca.
    var limitesB = _snapshotOverlapBounds(pb.active);
    var indice = pa.active.length * pb.active.length >= OVERLAP_INDEX_MIN_PARES
      ? _buildOverlapIndex(limitesB)
      : null;
    for (var i = pa.active.length - 1; i >= 0; i--) {
      var a = pa.active[i];
      if (!a || a._active === false) continue;
      var limiteA = _overlapBounds(a);
      var vizinhos = indice ? _overlapCandidates(indice, limiteA) : null;
      var quantos = vizinhos ? vizinhos.length : pb.active.length;
      for (var n = 0; n < quantos; n++) {
        // Os vizinhos JA vem em ordem decrescente; sem indice, a contagem
        // regressiva e feita aqui. Os dois caminhos visitam B na MESMA ordem.
        var j = vizinhos ? vizinhos[n] : quantos - 1 - n;
        var b = pb.active[j];
        paresExaminados += 1;
        if (!b || b._active === false || b === a) continue;
        if (!_overlapBoundsTouch(limiteA, limitesB[j])) continue;
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
    perf.pares += paresExaminados;
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
  // 🧱 Rebater na RAQUETE (Breakout/Pong): quando a bola encosta na raquete, a
  // velocidade Y inverte (afasta) e a X vem do PONTO do impacto — bater na beirada
  // manda a bola mais de lado. Complementa o "quicar nas bordas" (paredes).
  function paddleBounce(ball, paddle) {
    if (!ball || typeof ball !== 'object' || !paddle || typeof paddle !== 'object') return;
    var bx = num(ball.x, 0) + num(ball.w, 0) / 2, by = num(ball.y, 0) + num(ball.h, 0) / 2;
    var px = num(paddle.x, 0) + num(paddle.w, 0) / 2, py = num(paddle.y, 0) + num(paddle.h, 0) / 2;
    var overX = Math.abs(bx - px) <= num(paddle.w, 0) / 2 + num(ball.w, 0) / 2;
    var overY = Math.abs(by - py) <= num(paddle.h, 0) / 2 + num(ball.h, 0) / 2;
    if (!overX || !overY) return;
    var vy = num(ball.vy, 0);
    var speed = Math.max(1, Math.sqrt(num(ball.vx, 0) * num(ball.vx, 0) + vy * vy));
    // Afasta a bola no eixo Y (raquete embaixo → sobe; raquete em cima → desce).
    ball.vy = (by <= py ? -1 : 1) * Math.abs(vy || speed);
    // Ângulo pelo ponto de impacto (-1 na beirada esquerda, +1 na direita).
    var off = Math.max(-1, Math.min(1, (bx - px) / Math.max(1, num(paddle.w, 1) / 2)));
    ball.vx = off * speed;
  }

  // ---- 🧩 Grade (Snake, Match-3, Sokoban, campo-minado, puzzles) ----
  // Uma grade NOMEADA de células; a criança varre com "repita" do núcleo + ler/pôr.
  var boards = Object.create(null); // nome -> {cols, rows, empty, cells:[]} (flat row*cols+col)
  function boardAt(name) { return boards[text(name, 'tabuleiro')] || null; }
  function boardCreate(name, cols, rows, empty) {
    var c = Math.max(1, Math.min(MAX_GRID_SIDE, Math.round(num(cols, 8))));
    var r = Math.max(1, Math.min(MAX_GRID_SIDE, Math.round(num(rows, 8))));
    if (num(cols, 8) > MAX_GRID_SIDE || num(rows, 8) > MAX_GRID_SIDE) {
      warnOnce('board:limit', 'o tabuleiro foi limitado a ' + MAX_GRID_SIDE + ' × ' + MAX_GRID_SIDE + ' células para o jogo continuar responsivo');
    }
    var cells = [];
    for (var i = 0; i < c * r; i++) cells.push(empty);
    boards[text(name, 'tabuleiro')] = { cols: c, rows: r, empty: empty, cells: cells };
  }
  function boardSet(name, value, col, row) {
    var b = boardAt(name);
    if (!b) { warnOnce('board:' + text(name, ''), 'o tabuleiro "' + text(name, '') + '" não existe — crie com "Criar o tabuleiro"'); return; }
    var cc = Math.round(num(col, 0)), rr = Math.round(num(row, 0));
    if (cc < 0 || cc >= b.cols || rr < 0 || rr >= b.rows) return; // fora da grade: ignora
    b.cells[rr * b.cols + cc] = value;
  }
  function boardGet(name, col, row) {
    var b = boardAt(name);
    if (!b) return 0;
    var cc = Math.round(num(col, 0)), rr = Math.round(num(row, 0));
    if (cc < 0 || cc >= b.cols || rr < 0 || rr >= b.rows) return b.empty; // fora → "vazio"
    return b.cells[rr * b.cols + cc];
  }
  function boardCount(name, value) {
    var b = boardAt(name);
    if (!b) return 0;
    var n = 0;
    for (var i = 0; i < b.cells.length; i++) if (b.cells[i] === value) n += 1;
    return n;
  }
  function boardIn(name, col, row) {
    var b = boardAt(name);
    if (!b) return false;
    var cc = Math.round(num(col, 0)), rr = Math.round(num(row, 0));
    return cc >= 0 && cc < b.cols && rr >= 0 && rr < b.rows;
  }


  // ---- 🃏 Cartas, pilhas e mão clicável ----
  function pileMoveTop(from, to) {
    if (!Array.isArray(from) || !Array.isArray(to) || from.length === 0) return;
    to.push(from.pop());
  }
  function pileShuffleFrom(deck, discard) {
    if (!Array.isArray(deck) || !Array.isArray(discard)) return;
    while (discard.length) deck.push(discard.pop());
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(gameRandom() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
  }
  function pileTop(pile) { return (Array.isArray(pile) && pile.length) ? pile[pile.length - 1] : null; }
  function pileSize(pile) { return Array.isArray(pile) ? pile.length : 0; }
  function makeCard(front, back) {
    return { front: front, back: (back === undefined || back === null) ? '?' : back, faceUp: false };
  }
  function cardFlip(c) { if (c && typeof c === 'object') c.faceUp = !c.faceUp; }
  function cardIsUp(c) { return !!(c && typeof c === 'object' && c.faceUp); }
  function cardFace(c) {
    if (!c || typeof c !== 'object') return c;
    return c.faceUp ? c.front : c.back;
  }
  var handRects = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function handDraw(pile, x, y, fan) {
    if (!Array.isArray(pile) || !ctx2d) return;
    var cw = 60, ch = 84, gap = 12, n = pile.length;
    var rects = handRects ? handRects.get(pile) : null;
    if (!rects) { rects = []; if (handRects) handRects.set(pile, rects); }
    var bx = num(x, 0), by = num(y, 0);
    for (var i = 0; i < n; i++) {
      var rx = bx + i * (cw + gap);
      var ry = by + (fan ? Math.abs(i - (n - 1) / 2) * 6 : 0);
      ctx2d.save();
      ctx2d.fillStyle = '#fdfdfd'; ctx2d.strokeStyle = '#2b2b2b'; ctx2d.lineWidth = 2;
      ctx2d.fillRect(rx, ry, cw, ch); ctx2d.strokeRect(rx, ry, cw, ch);
      var card = pile[i];
      var face = (card && typeof card === 'object' && 'faceUp' in card) ? (card.faceUp ? card.front : card.back) : card;
      ctx2d.fillStyle = '#1b1b1b'; ctx2d.font = '22px ' + _szGameUIFont;
      ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
      ctx2d.fillText(String(face === undefined || face === null ? '' : face), rx + cw / 2, ry + ch / 2);
      ctx2d.restore();
      var r = rects[i];
      if (r) { r.x = rx; r.y = ry; r.w = cw; r.h = ch; }
      else rects[i] = { x: rx, y: ry, w: cw, h: ch };
    }
    rects.length = n;
  }
  function cardAt(x, y, pile) {
    if (!Array.isArray(pile) || !handRects) return -1;
    var rects = handRects.get(pile);
    if (!rects) return -1;
    var px = num(x, 0), py = num(y, 0);
    for (var i = rects.length - 1; i >= 0; i--) {
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  // ---- 🃏 Kit Cartas (deck-battler) ----
  var cards = { battle: null, onTurn: [], onEnemyTurn: [], firstTurnPending: false };
  function cardsStart(heroHp, enemyHp) {
    var hh = Math.max(1, num(heroHp, 30)), eh = Math.max(1, num(enemyHp, 40));
    cards.battle = {
      heroHp: hh, heroMax: hh, enemyHp: eh, enemyMax: eh,
      energy: 3, energyPerTurn: 3, block: 0,
      intentAction: 'atacar', intentValue: 6
    };
    // Durante a factory, os blocos de Início rodam antes dos Eventos. Adie somente
    // esse primeiro turno até a factory terminar, para a compra/configuração já
    // existir. Chamadas feitas depois (clique, estado etc.) continuam imediatas.
    cards.firstTurnPending = runningProjectFactory;
    if (!cards.firstTurnPending) cardsStartTurn();
  }
  function cardsEnergyPerTurn(n) { if (cards.battle) { cards.battle.energyPerTurn = Math.max(0, num(n, 3)); cards.battle.energy = cards.battle.energyPerTurn; } }
  function cardsEnergy() { return cards.battle ? cards.battle.energy : 0; }
  function cardsSpend(n) { if (cards.battle) cards.battle.energy = Math.max(0, cards.battle.energy - Math.max(0, num(n, 1))); }
  function cardsHeroLife() { return cards.battle ? Math.max(0, cards.battle.heroHp) : 0; }
  function cardsEnemyLife() { return cards.battle ? Math.max(0, cards.battle.enemyHp) : 0; }
  function cardsHurtEnemy(n) { if (cards.battle) cards.battle.enemyHp -= Math.max(0, num(n, 0)); }
  function cardsHurtMe(n) {
    if (!cards.battle) return;
    var d = Math.max(0, num(n, 0));
    var absorbed = Math.min(cards.battle.block, d);
    cards.battle.block -= absorbed; d -= absorbed; cards.battle.heroHp -= d;
  }
  function cardsGainBlock(n) { if (cards.battle) cards.battle.block += Math.max(0, num(n, 0)); }
  function cardsEnemyIntent(action, value) {
    if (cards.battle) { cards.battle.intentAction = text(action, 'atacar'); cards.battle.intentValue = Math.max(0, num(value, 6)); }
  }
  function cardsIntentAction() { return cards.battle ? cards.battle.intentAction : ''; }
  function cardsIntentValue() { return cards.battle ? cards.battle.intentValue : 0; }
  function cardsOnTurn(fn) { if (typeof fn === 'function') cards.onTurn.push(fn); }
  function cardsOnEnemyTurn(fn) { if (typeof fn === 'function') cards.onEnemyTurn.push(fn); }
  function cardsStartTurn() {
    if (!cards.battle) return;
    cards.battle.energy = cards.battle.energyPerTurn;
    cards.battle.block = 0;
    for (var i = 0; i < cards.onTurn.length; i++) {
      try { cards.onTurn[i](); } catch (e) { warn('erro no "Quando começar o meu turno": ' + e); }
    }
  }
  function cardsEndTurn() {
    if (!cards.battle) return;
    for (var i = 0; i < cards.onEnemyTurn.length; i++) {
      try { cards.onEnemyTurn[i](); } catch (e) { warn('erro no "Quando for a vez do inimigo": ' + e); }
    }
    cardsStartTurn();
  }
  function cardsProjectReady() {
    if (!cards.firstTurnPending || !cards.battle) return;
    cards.firstTurnPending = false;
    cardsStartTurn();
  }
  function cardsNewGame() { cards.battle = null; cards.firstTurnPending = false; }
  function cardsResetProject() {
    cards.onTurn.length = 0;
    cards.onEnemyTurn.length = 0;
    cards.firstTurnPending = false;
  }
  function cardsDrawHud() {
    if (!cards.battle || !ctx2d) return;
    var b = cards.battle;
    drawBar(Math.max(0, b.enemyHp), b.enemyMax, config.w / 2 - 130, 46, 260, 18, '#ef4444');
    drawBar(Math.max(0, b.heroHp), b.heroMax, config.w / 2 - 130, config.h - 66, 260, 18, '#4ade80');
    ctx2d.save();
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '15px ' + _szGameUIFont; ctx2d.textAlign = 'center';
    ctx2d.fillText('👿 vai: ' + b.intentAction + ' ' + b.intentValue, config.w / 2, 34);
    ctx2d.fillText('⚡ Energia: ' + b.energy + '     🛡️ Escudo: ' + b.block, config.w / 2, config.h - 34);
    ctx2d.restore();
  }


  // ---- ⏱️ Tempo (acumulador de dt — NÃO relógio de parede: pausa tem que pausar) ----
  var secondTimers = Object.create(null);
  var TIMER_EPSILON = 1e-9;
  // Esperas de UMA VEZ em curso. Objeto sem prototipo nao serve aqui (e lista).
  var waits = [];
  /**
   * Fazer algo DEPOIS de N segundos, UMA vez. O buraco mais barato e mais
   * universal que faltava: "o chefe aparece aos 30s", "a mensagem some em 2s", o
   * combo, o ritmo. O "A cada N segundos" REPETE, e o unico "esperar" que existia
   * era o do Kit RPG, que so vale dentro de uma cena.
   * Anda no relogio do JOGO: pausou, para de contar.
   */
  function waitThen(secs, fn) {
    if (typeof fn !== 'function') return;
    if (waits.length >= MAX_PENDING_WAITS) {
      warnOnce('waits:limit', 'há esperas demais pendentes — o limite é ' + MAX_PENDING_WAITS);
      return;
    }
    waits.push({ at: playTime + Math.max(0, num(secs, 1)), fn: fn });
  }
  function stepWaits() {
    for (var i = waits.length - 1; i >= 0; i--) {
      if (playTime < waits[i].at) continue;
      var f = waits[i].fn;
      waits.splice(i, 1); // tira ANTES de rodar: um "Esperar" dentro do corpo
      try { f(); } catch (e) { warn('erro no "Esperar": ' + e); }
    }
  }
  function everySeconds(key, secs) {
    var k = text(key, 't');
    var period = Math.max(0.01, num(secs, 1));
    var acc = num(secondTimers[k], 0) + currentDt;
    if (acc + TIMER_EPSILON >= period) {
      // Mantém a fase do relógio entre quadros. Zerar aqui faria 50 ms virarem
      // 66,7 ms a 30 FPS; o módulo remove períodos inteiros porque o corpo só
      // pode rodar uma vez por quadro. A tolerância evita perder o disparo exato
      // por arredondamento binário (ex.: 3 × 1/60 quase igual a 0,05).
      var remainder = acc % period;
      secondTimers[k] = (remainder < TIMER_EPSILON || period - remainder < TIMER_EPSILON) ? 0 : remainder;
      return true;
    }
    secondTimers[k] = acc;
    return false;
  }
  /** Cooldown POR personagem, em segundos (recarga do tiro, do golpe…). */
  function cooldownReady(who, secs) {
    if (!who || typeof who !== 'object') return false;
    // Prazo ABSOLUTO no relógio do jogo. A versão antiga descontava currentDt
    // POR CHAMADA: com o tiro edge-trigger da receita canônica ("se
    // keyPressed(' ') e cooldownReady(nave, 0.25)"), a recarga só era
    // descontada nos quadros em que a criança APERTAVA — apertar, esperar e
    // apertar de novo continuava travado (só metralhar o botão destravava).
    // Com o prazo em playTime a espera REAL conta; a pausa congela junto
    // (playTime para) e o reinício zera os dois lados (playTime = 0 e os
    // resets zeram _cd; _cd = 0 significa "pronto").
    if (num(who._cd, 0) > playTime) return false;
    who._cd = playTime + Math.max(0.01, num(secs, 0.5));
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
  // ⭐ "dano" e "vida máxima" entram aqui: o bloco "Criar o molde" PEDE o dano à
  // criança, o spawnFromMold copia — e sem estar nesta lista "a propriedade dano
  // de" devolvia 0, então o campo era decorativo. Agora ela lê e usa:
  // "Machucar o herói em (a propriedade dano de este)".
  // ⚠️ DUAS listas, e cada uma vive em 3 lugares que TÊM que casar (divergir faz a
  // Ponte degradar o bloco inteiro para rawJS):
  //   ENTITY_PROPS  = ler/mudar → dropdowns de "a propriedade"/"Mudar a
  //                   propriedade" + GK_ENTITY_PROPS do parsers/js.ts;
  //   TWEEN_PROPS   = deslizar  → dropdown de "Deslizar a propriedade" +
  //                   GK_TWEEN_PROPS do parsers/js.ts.
  // Elas eram IGUAIS por coincidência (o tweenProperty lia ENTITY_PROPS + opacity)
  // até o "dano" entrar: deslizar o dano não é coisa, deslizar a opacidade é.
  var ENTITY_PROPS = {
    x: 1, y: 1, vx: 1, vy: 1, speed: 1, w: 1, h: 1,
    health: 1, maxHealth: 1, damage: 1
  };
  var TWEEN_PROPS = {
    x: 1, y: 1, vx: 1, vy: 1, speed: 1, w: 1, h: 1, health: 1, opacity: 1
  };
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
  function pushTween(who, prop, to, secs, notify, onDone) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      if (tweens[i].e === who && tweens[i].p === prop) tweens.splice(i, 1);
    }
    tweens.push({
      e: who, p: prop, f: num(who[prop], 0), to: num(to, 0),
      t: 0, d: Math.max(0.01, num(secs, 0.5)), ev: !!notify,
      done: typeof onDone === 'function' ? onDone : null
    });
  }
  function tweenTo(who, x, y, secs, onDone) {
    if (!who || typeof who !== 'object') return;
    pushTween(who, 'x', x, secs, false);
    pushTween(who, 'y', y, secs, true, onDone); // só o Y avisa/conclui: uma vez por deslize
  }
  /** ⭐ Versões MUDAS, para uso INTERNO do motor (investida da batalha, desmaio,
   * volta ao posto). O aviso "deslizou:chegou" é da CRIANÇA: quem encadeia
   * cutscene/torre/rota nele recebia disparos fantasmas várias vezes por turno,
   * com um objeto interno de payload, só porque o kit anima por dentro. */
  function tweenToQuiet(who, x, y, secs) {
    if (!who || typeof who !== 'object') return;
    pushTween(who, 'x', x, secs, false);
    pushTween(who, 'y', y, secs, false);
  }
  function fadeToQuiet(who, percent, secs) {
    if (!who || typeof who !== 'object') return;
    pushTween(who, 'opacity', Math.max(0, Math.min(1, num(percent, 0) / 100)), secs, false);
  }
  function tweenProperty(who, prop, to, secs) {
    if (!who || typeof who !== 'object') return;
    var pr = text(prop, 'x');
    if (!TWEEN_PROPS[pr]) {
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
        if (tw.done) {
          try { tw.done(); } catch (e2) { warn('erro ao concluir um movimento suave: ' + e2); }
        }
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
  /** Perguntar por círculo SEM mudar o sprite. Mede pelos mesmos raio e centro da
   * caixa que a forma redonda usa, para os dois caminhos nunca discordarem. */
  function touchCircle(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    var dx = hbCenterX(a) - hbCenterX(b);
    var dy = hbCenterY(a) - hbCenterY(b);
    var rr = hbRadius(a) + hbRadius(b);
    return dx * dx + dy * dy < rr * rr;
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
    return gameRandom() * 100 < num(percent, 50);
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
    // Quem COLIDE redondo também é CLICADO redondo (o canto não conta).
    if (isCircle(who)) {
      var dx = px - hbCenterX(who);
      var dy = py - hbCenterY(who);
      var r = hbRadius(who);
      return dx * dx + dy * dy <= r * r;
    }
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
  /**
   * 🎯 R21: LEQUE de tiros — N nascem do molde num arco centrado no rumo (graus;
   * -90 = para cima, como o setVelocityAngle). E o spread-shot/shotgun/cone de
   * mago: a conta de offsets de angulo e o que crianca nao compoe sozinha.
   */
  function fanShot(who, moldName, count, arcDeg, dirDeg, speed) {
    if (!who || typeof who !== 'object') return;
    var n = Math.max(1, Math.min(64, Math.round(num(count, 3))));
    var arc = num(arcDeg, 30);
    var dir = num(dirDeg, -90);
    var v = num(speed, 600);
    var cx = centerX(who);
    var cy = centerY(who);
    for (var i = 0; i < n; i++) {
      var a = n === 1 ? dir : dir - arc / 2 + (arc * i) / (n - 1);
      var e = spawnFromMold(moldName, 0, 0);
      if (!e) return; // molde inexistente/lotado: o spawnFromMold ja avisou
      e.x = cx - e.w / 2;
      e.y = cy - e.h / 2;
      e._prevX = e.x; e._prevY = e.y; // nasceu AQUI: zera a varredura
      var r = a * Math.PI / 180;
      e.vx = Math.cos(r) * v;
      e.vy = Math.sin(r) * v;
      setFacing(e, e.vx, e.vy);
    }
  }
  /**
   * O angulo de quem (em graus). O setAngle so ESCREVE - nao havia como LER, e sem
   * ler nao existe "girar ate mirar": torre que acompanha, nave, tanque, stealth.
   * (Zero atan2 no arquivo inteiro antes disto.)
   */
  function angleOf(who) {
    return (who && typeof who === 'object') ? num(who._angle, 0) : 0;
  }
  /** O angulo de A para B (graus, 0 = direita, cresce no sentido horario). */
  function angleTo(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return 0;
    return Math.atan2(centerY(b) - centerY(a), centerX(b) - centerX(a)) * 180 / Math.PI;
  }
  /**
   * EMPURRA no angulo, SOMANDO a velocidade (inercia). O setVelocityAngle
   * SOBRESCREVE o vx/vy - e sem somar nao existe Asteroids, nave com impulso, nem
   * carro. (A doc da IA prometia "tanque/nave/Asteroids" com o setVelocityAngle:
   * era mentira, e este bloco e o que a torna verdade.)
   * A forca e ACELERACAO em px/s2, aplicada pelo dt do quadro - use no "A cada
   * quadro" (era o UNICO primitivo de movimento sem dt: a 30fps acelerava a
   * metade). Impulso unico, de evento? setVelocityAngle.
   */
  function thrust(who, deg, force) {
    if (!who || typeof who !== 'object') return;
    var r = num(deg, 0) * Math.PI / 180;
    var f = num(force, 6000) * currentDt;
    who.vx = num(who.vx, 0) + Math.cos(r) * f;
    who.vy = num(who.vy, 0) + Math.sin(r) * f;
  }
  /**
   * Atrito: freia a velocidade por quadro. fator 0..1 por SEGUNDO (0.9 = perde 90%
   * da velocidade em 1s), independente do fps - por isso o Math.pow com o dt.
   * Nao havia atrito nenhum no runtime: corrida, gelo, hoquei, Asteroids.
   */
  function applyFriction(who, factor, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    var f = Math.max(0, Math.min(1, num(factor, 0.9)));
    var k = Math.pow(1 - f, d);
    who.vx = num(who.vx, 0) * k;
    who.vy = num(who.vy, 0) * k;
    if (Math.abs(who.vx) < 0.5) who.vx = 0; // senao fica deslizando para sempre
    if (Math.abs(who.vy) < 0.5) who.vy = 0;
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
      // ⭐ Zerar o TARGET junto com o alpha, não só o alpha. O piscar sempre acaba
      // numa DESCIDA, que deixa target = 1; sem esta linha o quadro seguinte caía no
      // fade comum, via alpha(0) !== target(1) e SUBIA até 1, onde travava — a tela
      // ficava 100% coberta PARA SEMPRE. E o drawScreenFx é o ÚLTIMO desenho do
      // render(), então cobria mundo, HUD, fala e menu: toda batalha do Kit
      // Monstrinhos (que chama flashScreen ao abrir) rodava embaixo de um retângulo
      // branco sólido.
      if (screenFx.flashes <= 0) { screenFx.alpha = 0; screenFx.flashes = 0; screenFx.target = 0; }
      return;
    }
    if (screenFx.alpha === screenFx.target) return;
    var d = screenFx.speed * dt;
    if (screenFx.alpha < screenFx.target) screenFx.alpha = Math.min(screenFx.target, screenFx.alpha + d);
    else screenFx.alpha = Math.max(screenFx.target, screenFx.alpha - d);
  }
  /** ⭐ O estado do canvas (fillStyle/font/lineWidth/globalAlpha) é PERSISTENTE e
   * atravessa o quadro: todo desenho do MOTOR tem que devolver o ctx como pegou,
   * senão vaza para o "Desenhar o jogo" da criança — o pkmBar deixava lineWidth 3
   * e engrossava TODOS os traços dela. */
  function ctxSave() { try { ctx2d.save(); } catch (e) {} }
  function ctxRestore() { try { ctx2d.restore(); } catch (e) {} }
  function drawScreenFx() {
    if (!ctx2d || screenFx.alpha <= 0) return;
    ctxSave();
    try {
      ctx2d.globalAlpha = Math.min(1, screenFx.alpha);
      ctx2d.fillStyle = screenFx.color;
      ctx2d.fillRect(0, 0, config.w, config.h);
    } catch (e) {}
    ctxRestore();
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
    if (!a) { warnOnce('stopsound:' + text(name, ''), 'o som "' + text(name, '') + '" não foi carregado — use "Carregar o som"'); return; }
    try { a.pause(); a.currentTime = 0; } catch (e) {}
  }
  function setVolume(name, level) {
    var a = sounds[text(name, '')];
    if (!a) { warnOnce('volume:' + text(name, ''), 'o som "' + text(name, '') + '" não foi carregado — use "Carregar o som"'); return; }
    try { a.volume = Math.max(0, Math.min(1, num(level, 1))); } catch (e) {}
  }

  // ---- 🗺️ Mapa por CÓDIGO (masmorra sorteada, mundo gerado) ----
  function createEmptyTilemap(name, cols, rows, fill, assetName) {
    var nm = text(name, '');
    if (!nm) { warn('"Criar o mapa vazio" precisa de um nome'); return; }
    var requestedCols = Math.round(num(cols, 20));
    var requestedRows = Math.round(num(rows, 15));
    var c = Math.max(1, Math.min(MAX_GRID_SIDE, requestedCols));
    var r = Math.max(1, Math.min(MAX_GRID_SIDE, requestedRows));
    if (c !== requestedCols || r !== requestedRows) {
      warnOnce('tilemap:limit:' + nm, 'o mapa "' + nm + '" foi limitado a ' + MAX_GRID_SIDE + ' × ' + MAX_GRID_SIDE + ' peças para manter o jogo rápido');
    }
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
    var platform = Object.create(null);
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
      if (ts && ts.platform && typeof ts.platform.length === 'number') {
        for (var pi = 0; pi < ts.platform.length; pi++) {
          var pv = ts.platform[pi];
          if (typeof pv === 'number' && pv >= 0 && !solid[Math.floor(pv)]) platform[Math.floor(pv)] = true;
        }
      }
      loadImage(imgKey, an);
    }
    tilemaps[nm] = { rows: grid, artTile: art, imgKey: imgKey, solid: solid, platform: platform };
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
   * topo neste quadro (começo preservado × posição projetada). Por isso não fura
   * numa queda rápida mesmo quando a colisão sólida já atualizou _prevY. */
  function oneWayPlatform(who, moldName, dt) {
    if (!who || typeof who !== 'object') return;
    var ok = text(moldName, '');
    var pool = pools[ok];
    if (!pool) { warnOnce('oneway:' + ok, 'o molde "' + ok + '" não existe — crie com "Criar o molde"'); return; }
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    if (num(who.vy, 0) < 0) return; // subindo: atravessa
    if (who._dropT > 0) return; // pediu para descer (↓): ignora as plataformas
    // Os pés são os da CAIXA (quem declarou uma caixa nos pés quer pousar por ela).
    var feetFrom = oneWayFeetFrom(who);
    var feetTo = oneWayFeetTo(who, d);
    var act = pool.active;
    for (var i = 0; i < act.length; i++) {
      var p = act[i];
      if (p === who || p._active === false) continue;
      var top = hbTop(p);
      if (feetFrom > top) continue; // começou abaixo do topo: não é pouso
      if (feetTo < top) continue; // não alcança o plano neste quadro
      if (hbRight(who) <= hbLeft(p)) continue;
      if (hbLeft(who) >= hbRight(p)) continue;
      who.y = top - hbH(who) - num(who._hbY, 0);
      who.vy = 0;
      who.onGround = true;
      who._prevY = who.y; // a varredura não deve desfazer este pouso
      who._sweepFrame = -1;
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
    var feet = hbBottom(who);
    for (var i = 0; i < act.length; i++) {
      var p = act[i];
      if (p._active === false) continue;
      if (Math.abs(feet - hbTop(p)) > 4) continue; // não está em cima
      if (hbRight(who) <= hbLeft(p)) continue;
      if (hbLeft(who) >= hbRight(p)) continue;
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
      who.y = hbTop(e) - hbH(who) - num(who._hbY, 0); // encaixa em cima (bounds.bottom = top)
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
  // AVENTURA EM FASES — simulação fixa, ações, save e replay
  // ============================================================================

  var PRO_ACTIONS = ["esquerda","direita","cima","baixo","pular","correr","agir","pausar","confirmar","voltar"];
  var PRO_ACTION_BITS = {"esquerda":1,"direita":2,"cima":4,"baixo":8,"pular":16,"correr":32,"agir":64,"pausar":128,"confirmar":256,"voltar":512};
  var proSim = {
    enabled: false, hz: 60, step: 1 / 60, accumulator: 0, tick: 0,
    maxCatchUpSteps: 5, droppedSeconds: 0, lastFrameSteps: 0, alpha: 0,
    seed: 1, randomState: 1
  };
  var fixedHooks = [];
  var proInputBound = false;
  var proInputDevice = 'teclado';
  var proBindings = {
    esquerda: { keys: ['arrowleft', 'a'], button: 14 },
    direita: { keys: ['arrowright', 'd'], button: 15 },
    cima: { keys: ['arrowup', 'w'], button: 12 },
    baixo: { keys: ['arrowdown', 's'], button: 13 },
    pular: { keys: [' ', 'x'], button: 0 },
    correr: { keys: ['shift', 'z'], button: 2 },
    agir: { keys: ['e', 'c'], button: 1 },
    pausar: { keys: ['escape'], button: 9 },
    confirmar: { keys: ['enter', ' '], button: 0 },
    voltar: { keys: ['escape', 'backspace'], button: 1 }
  };
  var proActionDown = Object.create(null);
  var proActionPrevious = Object.create(null);
  var proActionPressed = Object.create(null);
  var proActionReleased = Object.create(null);
  var proTouchActions = Object.create(null);
  var proTouchPointers = Object.create(null);

  var proVisualRandomState = 2654435769;

  function proUint32(value) {
    var n = Math.floor(num(value, 1)) >>> 0;
    return n === 0 ? 1 : n;
  }
  function gameRandom() {
    if (!proSim.enabled) return Math.random();
    var x = proSim.randomState >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    proSim.randomState = x >>> 0;
    return (proSim.randomState >>> 0) / 4294967296;
  }
  function visualRandom() {
    if (!proSim.enabled) return Math.random();
    var x = proVisualRandomState >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    proVisualRandomState = x >>> 0;
    return (proVisualRandomState >>> 0) / 4294967296;
  }


  function proPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function proObjectHasOnlyKeys(value, allowed) {
    var allowedMap = Object.create(null);
    for (var ai = 0; ai < allowed.length; ai++) allowedMap[allowed[ai]] = true;
    var valueKeys = Object.keys(value);
    for (var vi = 0; vi < valueKeys.length; vi++) if (!allowedMap[valueKeys[vi]]) return false;
    return true;
  }

  function proKnownAction(action) { return PRO_ACTION_BITS[text(action, '')] != null; }
  function enableFixedSimulation(options) {
    var opts = proPlainObject(options) ? options : {};
    proSim.enabled = true;
    proSim.hz = 60;
    proSim.step = 1 / 60;
    proSim.accumulator = 0;
    proSim.tick = 0;
    proSim.alpha = 0;
    proSim.droppedSeconds = 0;
    proSim.lastFrameSteps = 0;
    proSim.maxCatchUpSteps = boundedInteger(opts.maxCatchUpSteps, 5, 1, 5);
    proSim.seed = proUint32(opts.seed);
    proSim.randomState = proSim.seed;
    proVisualRandomState = (proSim.seed ^ 2654435769) >>> 0;
    ensureProfessionalInput();
  }
  function onFixedUpdate(fn) {
    if (typeof fn === 'function') fixedHooks.push(fn);
  }
  function runFixedHooks(dt) {
    for (var i = 0; i < fixedHooks.length; i++) {
      try { fixedHooks[i](dt, proSim.tick); }
      catch (e) { warnOnce('fixed-hook:' + i, 'erro em "A cada passo do jogo": ' + e); }
    }
  }
  function bindAction(action, keys, gamepadButton) {
    var name = text(action, '');
    if (!proKnownAction(name)) { warn('a ação "' + name + '" não existe'); return false; }
    var source = text(keys, '');
    var parts = source.split(',');
    var normalized = [];
    for (var i = 0; i < parts.length; i++) {
      var key = normKey(parts[i].trim());
      if (key && normalized.indexOf(key) === -1) normalized.push(key);
    }
    if (!normalized.length) { warn('escolha ao menos uma tecla para a ação "' + name + '"'); return false; }
    proBindings[name] = { keys: normalized, button: boundedInteger(gamepadButton, proBindings[name].button, 0, 31) };
    return true;
  }
  function proKeyboardDown(binding) {
    for (var i = 0; i < binding.keys.length; i++) if (keys[binding.keys[i]] === true) return true;
    return false;
  }
  function proReadGamepad(binding) {
    try {
      if (!window.navigator || typeof window.navigator.getGamepads !== 'function') return 0;
      var pads = window.navigator.getGamepads();
      for (var i = 0; i < pads.length && i < 2; i++) {
        var pad = pads[i];
        if (!pad || pad.connected === false) continue;
        var button = pad.buttons && pad.buttons[binding.button];
        if (button && (button.pressed || button.value > 0.5)) return i + 1;
      }
    } catch (e) { warnOnce('gamepad-read', 'não consegui ler o controle conectado'); }
    return 0;
  }

  function sampleProfessionalActions() {
    var replayMask = proReplayMask();
    var anyKeyboard = false;
    var gamepad = 0;
    for (var i = 0; i < PRO_ACTIONS.length; i++) {
      var action = PRO_ACTIONS[i];
      var binding = proBindings[action];
      var down;
      if (replayMask >= 0) down = (replayMask & PRO_ACTION_BITS[action]) !== 0;
      else {
        var keyboard = proKeyboardDown(binding);
        var pad = proReadGamepad(binding);
        var touchingNow = proTouchActions[action] === true;
        down = keyboard || pad > 0 || touchingNow;
        if (keyboard) anyKeyboard = true;
        if (pad > gamepad) gamepad = pad;
        if (touchingNow) proInputDevice = 'toque';
      }
      var previous = proActionPrevious[action] === true;
      proActionDown[action] = down;
      proActionPressed[action] = down && !previous;
      proActionReleased[action] = !down && previous;
      proActionPrevious[action] = down;
    }
    if (gamepad > 0) proInputDevice = gamepad === 1 ? 'controle-1' : 'controle-2';
    else if (anyKeyboard) proInputDevice = 'teclado';
  }
  function proActionMask() {
    var mask = 0;
    for (var i = 0; i < PRO_ACTIONS.length; i++) {
      var action = PRO_ACTIONS[i];
      if (proActionDown[action]) mask |= PRO_ACTION_BITS[action];
    }
    return mask >>> 0;
  }
  function proReleaseAllActions() {
    for (var i = 0; i < PRO_ACTIONS.length; i++) {
      var action = PRO_ACTIONS[i];
      proActionDown[action] = false;
      proActionPrevious[action] = false;
      proActionPressed[action] = false;
      proActionReleased[action] = false;
    }
    proTouchActions = Object.create(null);
    proTouchPointers = Object.create(null);
    if (typeof document !== 'undefined') {
      var touchControls = document.querySelectorAll('#szgk-touch-controls [data-sz-gk-action]');
      for (var ti = 0; ti < touchControls.length; ti++) touchControls[ti].setAttribute('aria-pressed', 'false');
    }
  }
  function proTouchButton(parent, label, action, position, accessibleLabel) {
    var button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.setAttribute('aria-label', accessibleLabel);
    button.setAttribute('data-sz-gk-action', action);
    button.style.cssText = 'position:absolute;' + position + ';width:44px;height:44px;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.88);background:rgba(10,18,35,.68);color:#fff;font:700 15px var(--sz-game-ui-font);touch-action:none;user-select:none;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,.28);';
    function pressId(id) {
      var previous = proTouchPointers[id];
      if (previous && previous !== action) releaseId(id);
      proTouchPointers[id] = action; proTouchActions[action] = true; proInputDevice = 'toque';
      button.setAttribute('aria-pressed', 'true');
    }
    function releaseId(id) {
      var released = proTouchPointers[id]; delete proTouchPointers[id];
      if (!released) return;
      var still = false;
      for (var pointer in proTouchPointers) if (proTouchPointers[pointer] === released) still = true;
      proTouchActions[released] = still;
      if (released === action && !still) button.setAttribute('aria-pressed', 'false');
    }
    function press(ev) {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      var id = ev && ev.pointerId != null ? ev.pointerId : action;
      pressId(id);
      try { if (ev && ev.pointerId != null) button.setPointerCapture(ev.pointerId); } catch (e) {}
    }
    function release(ev) {
      var id = ev && ev.pointerId != null ? ev.pointerId : action;
      releaseId(id);
    }
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', function (ev) {
      if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); pressId('key:' + action); }
    });
    button.addEventListener('keyup', function (ev) {
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); releaseId('key:' + action); }
    });
    button.addEventListener('blur', function () { releaseId('key:' + action); });
    button.setAttribute('aria-pressed', 'false');
    parent.appendChild(button);
  }
  function proTouchCluster(overlay, name, style, label) {
    var group = document.createElement('div');
    group.setAttribute('data-sz-gk-cluster', name); group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
    group.style.cssText = 'position:absolute;width:132px;height:132px;pointer-events:none;' + style;
    overlay.appendChild(group);
    return group;
  }
  function ensureTouchOverlay() {
    if (!stageEl || typeof document === 'undefined' || document.getElementById('szgk-touch-controls')) return;
    var coarse = false;
    try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) {}
    if (!coarse && !('ontouchstart' in window)) return;
    var overlay = document.createElement('div');
    overlay.id = 'szgk-touch-controls';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', 'Controles de toque');
    overlay.style.cssText = 'position:absolute;inset:0;z-index:80;pointer-events:none;overflow:hidden;';
    var safeBottom = 'bottom:8px;bottom:max(8px,env(safe-area-inset-bottom))';
    var directions = proTouchCluster(overlay, 'directions', 'left:8px;left:max(8px,env(safe-area-inset-left));' + safeBottom, 'Direções');
    proTouchButton(directions, '◀', 'esquerda', 'left:0;bottom:44px', 'Mover para a esquerda');
    proTouchButton(directions, '▶', 'direita', 'left:88px;bottom:44px', 'Mover para a direita');
    proTouchButton(directions, '▲', 'cima', 'left:44px;bottom:88px', 'Mover para cima');
    proTouchButton(directions, '▼', 'baixo', 'left:44px;bottom:0', 'Mover para baixo');
    var actions = proTouchCluster(overlay, 'actions', 'right:8px;right:max(8px,env(safe-area-inset-right));' + safeBottom, 'Ações');
    proTouchButton(actions, 'A', 'pular', 'left:88px;bottom:44px', 'Pular');
    proTouchButton(actions, 'B', 'correr', 'left:44px;bottom:0', 'Correr');
    proTouchButton(actions, 'X', 'agir', 'left:44px;bottom:88px', 'Agir');
    proTouchButton(actions, '✓', 'confirmar', 'left:0;bottom:44px', 'Confirmar');
    var system = proTouchCluster(overlay, 'system', 'right:8px;right:max(8px,env(safe-area-inset-right));top:8px;top:max(8px,env(safe-area-inset-top));width:96px;height:44px', 'Menu');
    proTouchButton(system, '↩', 'voltar', 'left:0;top:0', 'Voltar');
    proTouchButton(system, 'Ⅱ', 'pausar', 'right:0;top:0', 'Pausar');
    stageEl.appendChild(overlay);
  }
  function ensureProfessionalInput() {
    if (proInputBound) { ensureTouchOverlay(); return; }
    proInputBound = true;
    window.addEventListener('gamepaddisconnected', function () { proReleaseAllActions(); proInputDevice = 'teclado'; });
    window.addEventListener('blur', proReleaseAllActions);
    ensureTouchOverlay();
  }


  var proCampaign = {
    id: '', version: 0, firstStage: '', playersCount: 1, seed: 1, requiredGems: 0,
    stages: Object.create(null), stageOrder: [], active: false, stageId: '', stage: null,
    hero: null, entities: [], entityPool: [], checkpoint: null, listeners: Object.create(null),
    saveSlots: 3, activeSlot: 1, transition: null, elapsed: 0, triggered: Object.create(null),
    progress: null, mapKey: '__szgk_campaign_stage', reducedMotion: false,
    highContrast: false, volume: 1, eventName: '', eventPayload: null
  };
  var PRO_STAGE_ENTITY_CATALOG = {"hero":{"label":"Herói","properties":[]},"coin":{"label":"Moeda","properties":[]},"gem":{"label":"Gema","properties":[]},"walker":{"label":"Inimigo terrestre","properties":[{"key":"speed","label":"Velocidade","type":"number","defaultValue":30,"min":18,"max":1000,"step":1},{"key":"direction","label":"Direção inicial","type":"select","defaultValue":-1,"options":[{"value":-1,"label":"Esquerda"},{"value":1,"label":"Direita"}]}]},"flyer":{"label":"Inimigo voador","properties":[{"key":"speed","label":"Velocidade","type":"number","defaultValue":2,"min":1,"max":1000,"step":1},{"key":"range","label":"Alcance","type":"number","defaultValue":48,"min":16,"max":8192,"step":1}]},"spiky":{"label":"Inimigo com espinhos","properties":[{"key":"speed","label":"Velocidade","type":"number","defaultValue":30,"min":18,"max":1000,"step":1},{"key":"direction","label":"Direção inicial","type":"select","defaultValue":-1,"options":[{"value":-1,"label":"Esquerda"},{"value":1,"label":"Direita"}]}]},"shell":{"label":"Casco","properties":[{"key":"speed","label":"Velocidade","type":"number","defaultValue":30,"min":18,"max":1000,"step":1},{"key":"direction","label":"Direção inicial","type":"select","defaultValue":-1,"options":[{"value":-1,"label":"Esquerda"},{"value":1,"label":"Direita"}]}]},"movingPlatform":{"label":"Plataforma móvel","properties":[{"key":"speed","label":"Velocidade","type":"number","defaultValue":1,"min":0.2,"max":1000,"step":0.1},{"key":"range","label":"Alcance","type":"number","defaultValue":64,"min":16,"max":8192,"step":1}]},"checkpoint":{"label":"Ponto de retorno","properties":[]},"exit":{"label":"Saída","properties":[{"key":"requiresBoss","label":"Exigir guardião derrotado","type":"boolean","defaultValue":false}]},"secretExit":{"label":"Saída secreta","properties":[]},"boss":{"label":"Guardião","properties":[{"key":"health","label":"Vida","type":"number","defaultValue":6,"min":3,"max":999,"step":1},{"key":"speed","label":"Velocidade","type":"number","defaultValue":1,"min":0.2,"max":1000,"step":0.1},{"key":"range","label":"Alcance","type":"number","defaultValue":30,"min":16,"max":8192,"step":1}]},"powerup":{"label":"Poder","properties":[]},"portal":{"label":"Portal","properties":[]},"sign":{"label":"Placa","properties":[]}};
  var PRO_STAGE_KINDS = Object.create(null);
  var proStageKindNames = Object.keys(PRO_STAGE_ENTITY_CATALOG);
  for (var proKindIndex = 0; proKindIndex < proStageKindNames.length; proKindIndex++) PRO_STAGE_KINDS[proStageKindNames[proKindIndex]] = 1;
  var PRO_TILE_INDEX = { '.': 0, '#': 1, '=': 2, 'B': 3, '?': 4, '^': 5, '~': 6, 'H': 7 };
  var PRO_PHYSICS = {"gravidade":520,"gravidadeNaAgua":180,"pulo":205,"puloNaAgua":120,"corteDoPulo":85,"andar":82,"correr":118,"fatorDaAgua":0.6,"nadar":62,"escada":62,"coiote":0.1,"buffer":0.1,"quiqueDaPisada":180,"janelaDaPisada":9,"piscaAoLevarDano":1.5,"duracaoDaEstrela":10,"inimigoVelocidade":30,"inimigoVelocidadeMinima":18,"cascoChutado":130,"gracaDoChute":0.35};
  /**
   * A regua UNICA de "esta peca empurra?" e "esta peca segura?".
   *
   * ⚠️ A sonda do inimigo comparava com '#' na unha enquanto o tilemap declarava
   * TRES pecas solidas: o bicho atravessava tijolo e bloco de premio, e so o
   * heroi era barrado. Aqui as duas pontas leem a MESMA tabela, e o mapa que o
   * motor monta e DERIVADO dela — duplicar o par deixaria um caminho esquecido.
   */
  var PRO_TILE_SOLID = Object.create(null);
  PRO_TILE_SOLID['#'] = 1; PRO_TILE_SOLID['B'] = 1; PRO_TILE_SOLID['?'] = 1;
  var PRO_TILE_PLATFORM = Object.create(null);
  PRO_TILE_PLATFORM['='] = 1;
  var PRO_TILE_SOLID_INDEX = Object.create(null);
  var PRO_TILE_PLATFORM_INDEX = Object.create(null);
  for (var proTileChar in PRO_TILE_INDEX) {
    if (PRO_TILE_SOLID[proTileChar] === 1) PRO_TILE_SOLID_INDEX[PRO_TILE_INDEX[proTileChar]] = true;
    if (PRO_TILE_PLATFORM[proTileChar] === 1) PRO_TILE_PLATFORM_INDEX[PRO_TILE_INDEX[proTileChar]] = true;
  }
  function proTileBlocks(ch) { return PRO_TILE_SOLID[ch] === 1; }
  function proTileSupports(ch) { return PRO_TILE_SOLID[ch] === 1 || PRO_TILE_PLATFORM[ch] === 1; }
  /** Quem ANDA no chao: cai, apoia e vira na beirada. Voador e chefe escrevem o proprio y. */
  var PRO_GROUND_KINDS = Object.create(null);
  PRO_GROUND_KINDS['walker'] = true; PRO_GROUND_KINDS['spiky'] = true; PRO_GROUND_KINDS['shell'] = true;
  /**
   * Quem COBRA no encostao. O espinho ficava de fora — encostar num espinho nao
   * fazia nada, e a guarda de baixo ("pisada && kind !== spiky") era codigo morto.
   * ⚠️ Object.create(null): esta casa ja foi mordida duas vezes por 'toString'
   * passando como chave valida num mapa literal.
   */
  var PRO_CONTACT_ENEMIES = Object.create(null);
  PRO_CONTACT_ENEMIES['walker'] = true; PRO_CONTACT_ENEMIES['flyer'] = true;
  PRO_CONTACT_ENEMIES['shell'] = true; PRO_CONTACT_ENEMIES['boss'] = true;
  PRO_CONTACT_ENEMIES['spiky'] = true;
  function proSafeId(value) {
    var id = text(value, '').trim();
    return id.length > 0 && id.length <= 64 && /^[A-Za-z0-9_-]+$/.test(id) ? id : '';
  }
  function proCopyProps(value) {
    var out = Object.create(null);
    if (!proPlainObject(value)) return out;
    var keysList = Object.keys(value);
    if (keysList.length > 32) return null;
    for (var i = 0; i < keysList.length; i++) {
      var key = keysList[i]; var item = value[key];
      if (key.length > 40 || (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean')) return null;
      if (typeof item === 'string' && item.length > 200) return null;
      if (typeof item === 'number' && !isFinite(item)) return null;
      out[key] = item;
    }
    return out;
  }
  function proEntityPropsValid(kind, props) {
    var definition = PRO_STAGE_ENTITY_CATALOG[kind];
    if (!definition) return false;
    for (var ri = 0; ri < definition.properties.length; ri++) {
      var rule = definition.properties[ri];
      if (!Object.prototype.hasOwnProperty.call(props, rule.key)) continue;
      var value = props[rule.key];
      if (rule.type === 'boolean') { if (typeof value !== 'boolean') return false; continue; }
      if (rule.type === 'number') {
        if (typeof value !== 'number' || !isFinite(value) || value < rule.min || value > rule.max) return false;
        continue;
      }
      var allowed = false;
      for (var oi = 0; oi < rule.options.length; oi++) if (rule.options[oi].value === value) allowed = true;
      if (!allowed) return false;
    }
    return true;
  }
  function proUniqueEntityId(base, usedIds) {
    if (!usedIds[base]) return base;
    for (var suffix = 2; suffix <= 129; suffix++) {
      var suffixText = '-' + suffix;
      var candidate = base.slice(0, 64 - suffixText.length) + suffixText;
      if (!usedIds[candidate]) return candidate;
    }
    return base.slice(0, 59) + '-' + Object.keys(usedIds).length;
  }
  function validateCampaignStage(raw) {
    if (!proPlainObject(raw) || raw.schemaVersion !== 1 || !proObjectHasOnlyKeys(raw, ['schemaVersion', 'id', 'world', 'order', 'theme', 'width', 'height', 'tiles', 'entities', 'triggers', 'nextStage', 'secretStage', 'timeLimit'])) return null;
    var id = proSafeId(raw.id);
    var width = raw.width; var height = raw.height; var world = raw.world; var order = raw.order;
    var nextStageId = raw.nextStage === undefined || raw.nextStage === '' ? '' : proSafeId(raw.nextStage);
    var secretStageId = raw.secretStage === undefined || raw.secretStage === '' ? '' : proSafeId(raw.secretStage);
    var stageTime = raw.timeLimit === undefined ? 300 : raw.timeLimit;
    if (!id || !Number.isInteger(width) || width < 1 || width > 512 || !Number.isInteger(height) || height < 1 || height > 512 || !Number.isInteger(world) || world < 1 || world > 128 || !Number.isInteger(order) || order < 1 || order > 128 || !nextStageId && raw.nextStage !== undefined && raw.nextStage !== '' || !secretStageId && raw.secretStage !== undefined && raw.secretStage !== '' || typeof raw.theme !== 'string' || raw.theme.length < 1 || raw.theme.length > 40 || typeof stageTime !== 'number' || !isFinite(stageTime) || stageTime < 0 || stageTime > 3600 || !Array.isArray(raw.tiles) || raw.tiles.length !== height) return null;
    var tiles = [];
    for (var r = 0; r < raw.tiles.length; r++) {
      if (typeof raw.tiles[r] !== 'string' || raw.tiles[r].length !== width) return null;
      for (var c = 0; c < width; c++) if (PRO_TILE_INDEX[raw.tiles[r].charAt(c)] == null) return null;
      tiles.push(raw.tiles[r]);
    }
    if (!Array.isArray(raw.entities) || raw.entities.length > 128) return null;
    var entities = [];
    var usedEntityIds = Object.create(null);
    for (var ei = 0; ei < raw.entities.length; ei++) {
      var sourceEntity = raw.entities[ei];
      if (!proPlainObject(sourceEntity) || !proObjectHasOnlyKeys(sourceEntity, ['kind', 'id', 'x', 'y', 'variant', 'props']) || !PRO_STAGE_KINDS[sourceEntity.kind]) return null;
      if (sourceEntity.props !== undefined && !proPlainObject(sourceEntity.props)) return null;
      var props = proCopyProps(sourceEntity.props); if (props == null || !proEntityPropsValid(sourceEntity.kind, props)) return null;
      var sourceEntityId = sourceEntity.id === undefined || sourceEntity.id === '' ? '' : proSafeId(sourceEntity.id); if (sourceEntity.id !== undefined && sourceEntity.id !== '' && !sourceEntityId) return null;
      if (typeof sourceEntity.x !== 'number' || !isFinite(sourceEntity.x) || typeof sourceEntity.y !== 'number' || !isFinite(sourceEntity.y) || sourceEntity.variant !== undefined && (typeof sourceEntity.variant !== 'string' || sourceEntity.variant.length > 80)) return null;
      var entityId = proUniqueEntityId(sourceEntityId || sourceEntity.kind + '-' + (ei + 1), usedEntityIds);
      usedEntityIds[entityId] = true;
      entities.push({ kind: sourceEntity.kind, id: entityId, x: num(sourceEntity.x, 0), y: num(sourceEntity.y, 0), variant: text(sourceEntity.variant, ''), props: props });
    }
    if (!Array.isArray(raw.triggers) || raw.triggers.length > 256) return null;
    var triggers = [];
    for (var ti = 0; ti < raw.triggers.length; ti++) {
      var trigger = raw.triggers[ti];
      if (!proPlainObject(trigger) || !proObjectHasOnlyKeys(trigger, ['kind', 'x', 'y', 'w', 'h', 'target', 'value']) || !proSafeId(trigger.kind)) return null;
      var value = trigger.value;
      var triggerTarget = trigger.target === undefined || trigger.target === '' ? '' : proSafeId(trigger.target);
      if (typeof trigger.x !== 'number' || !isFinite(trigger.x) || typeof trigger.y !== 'number' || !isFinite(trigger.y) || typeof trigger.w !== 'number' || !isFinite(trigger.w) || trigger.w < 0 || typeof trigger.h !== 'number' || !isFinite(trigger.h) || trigger.h < 0 || !triggerTarget && trigger.target !== undefined && trigger.target !== '' || value !== undefined && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' || typeof value === 'number' && !isFinite(value) || typeof value === 'string' && value.length > 200) return null;
      triggers.push({ kind: trigger.kind, x: trigger.x, y: trigger.y, w: trigger.w, h: trigger.h, target: triggerTarget, value: value });
    }
    return {
      schemaVersion: 1, id: id, world: world, order: order,
      theme: raw.theme, width: width, height: height, tiles: tiles,
      entities: entities, triggers: triggers, nextStage: nextStageId, secretStage: secretStageId,
      timeLimit: stageTime
    };
  }
  function defineCampaign(options) {
    if (!proPlainObject(options)) { warn('os dados da aventura são inválidos'); return false; }
    var id = proSafeId(options.id); var first = proSafeId(options.firstStage);
    if (!id || !first) { warn('a aventura precisa de nome e primeira fase válidos'); return false; }
    proCampaign.id = id; proCampaign.version = boundedInteger(options.version, 1, 1, 999999);
    proCampaign.firstStage = first; proCampaign.playersCount = boundedInteger(options.players, 1, 1, 2);
    proCampaign.seed = proUint32(options.seed); proCampaign.requiredGems = boundedInteger(options.requiredGems, 0, 0, 128); proCampaign.stages = Object.create(null);
    proCampaign.stageOrder.length = 0; proCampaign.active = false; proCampaign.stageId = ''; proCampaign.stage = null;
    proCampaign.progress = null; proCampaign.checkpoint = null; proCampaign.transition = null;
    return true;
  }
  function defineCampaignStage(stage) {
    if (!proCampaign.id) { warn('prepare a aventura antes de definir fases'); return false; }
    if (!proCampaign.stages[stage && stage.id] && proCampaign.stageOrder.length >= 128) { warn('a aventura aceita até 128 fases'); return false; }
    var valid = validateCampaignStage(stage);
    if (!valid) { warn('a fase não pôde ser usada; confira tamanho, peças, personagens e gatilhos'); return false; }
    if (!proCampaign.stages[valid.id]) proCampaign.stageOrder.push(valid.id);
    proCampaign.stages[valid.id] = valid;
    return true;
  }
  function proNewProgress() {
    var players = [];
    for (var i = 0; i < proCampaign.playersCount; i++) players.push({ lives: 5, score: 0, form: 'pequeno' });
    return { stageId: proCampaign.firstStage, checkpointId: '', checkpointX: 0, checkpointY: 0, activePlayer: 1, players: players, coins: 0, gems: [], secrets: [], journey: 1, settings: { volume: 1, reducedMotion: false, highContrast: false } };
  }
  function proReleaseCampaignEntities() {
    for (var i = 0; i < proCampaign.entities.length; i++) {
      var entity = proCampaign.entities[i]; entity.active = false; entity.props = Object.create(null); proCampaign.entityPool.push(entity);
    }
    proCampaign.entities.length = 0;
  }
  function proEntityFromSpec(spec) {
    var entity = proCampaign.entityPool.pop();
    if (!entity) entity = {};
    entity.kind = spec.kind; entity.id = spec.id; entity.x = spec.x * 16; entity.y = spec.y * 16;
    entity.startX = entity.x; entity.startY = entity.y; entity.prevX = entity.x; entity.prevY = entity.y;
    entity.w = spec.kind === 'coin' || spec.kind === 'gem' ? 10 : spec.kind === 'movingPlatform' ? 28 : spec.kind === 'boss' ? 24 : 14;
    entity.h = spec.kind === 'coin' || spec.kind === 'gem' ? 10 : spec.kind === 'boss' ? 22 : 14; entity.vx = 0; entity.vy = 0;
    entity.active = true; entity.variant = spec.variant; entity.props = spec.props; entity.health = spec.kind === 'boss' ? Math.max(3, num(spec.props.health, 6)) : 1;
    entity.phase = 1; entity.timer = 0; entity.direction = num(spec.props.direction, -1) < 0 ? -1 : 1;
    // ⚠️ O pool RECICLA: sem zerar aqui, o casco novo nasceria com a graca de
    // chute do casco anterior e o primeiro encostao dele sairia de graca.
    entity.kickGrace = 0; entity.onGround = false;
    return entity;
  }
  function proBuildTilemap(stage) {
    var rows = [];
    for (var r = 0; r < stage.tiles.length; r++) {
      var row = [];
      for (var c = 0; c < stage.width; c++) row.push(PRO_TILE_INDEX[stage.tiles[r].charAt(c)]);
      rows.push(row);
    }
    tilePx = 16;
    tilemaps[proCampaign.mapKey] = { rows: rows, artTile: 16, imgKey: '', solid: PRO_TILE_SOLID_INDEX, platform: PRO_TILE_PLATFORM_INDEX };
  }
  function proStageInstance(source) {
    return { schemaVersion: 1, id: source.id, world: source.world, order: source.order, theme: source.theme, width: source.width, height: source.height, tiles: source.tiles.slice(), entities: source.entities, triggers: source.triggers, nextStage: source.nextStage, secretStage: source.secretStage, timeLimit: source.timeLimit };
  }
  function proCampaignEntityKey(stageId, entityId) {
    return String(stageId.length) + '_' + stageId + '_' + entityId;
  }
  function proGemWasCollected(stageId, entityId) {
    if (!proCampaign.progress) return false;
    var gems = proCampaign.progress.gems;
    return gems.indexOf(proCampaignEntityKey(stageId, entityId)) !== -1 || gems.indexOf(entityId) !== -1;
  }

  function proEmitCampaign(name, payload) {
    var list = proCampaign.listeners[name]; if (!list) return;
    var previousName = proCampaign.eventName; var previousPayload = proCampaign.eventPayload;
    proCampaign.eventName = name; proCampaign.eventPayload = proPlainObject(payload) ? payload : Object.create(null);
    for (var i = 0; i < list.length; i++) try { list[i](payload); } catch (e) { warnOnce('campaign-event:' + name + ':' + i, 'erro no aviso da aventura: ' + e); }
    proCampaign.eventName = previousName; proCampaign.eventPayload = previousPayload;
  }
  function onCampaignEvent(name, fn) {
    var key = proSafeId(name); if (!key || typeof fn !== 'function') return;
    (proCampaign.listeners[key] || (proCampaign.listeners[key] = [])).push(fn);
  }
  function campaignEventValue(field) {
    var key = text(field, '');
    if (key === 'event') return proCampaign.eventName;
    var payload = proCampaign.eventPayload;
    var value = payload && (typeof payload[key] === 'string' || typeof payload[key] === 'number' || typeof payload[key] === 'boolean') ? payload[key] : '';
    return value;
  }

  function proLoadStage(stageId, reason) {
    var id = proSafeId(stageId); var sourceStage = proCampaign.stages[id];
    if (!sourceStage) { warn('a fase "' + id + '" não existe'); return false; }
    var stage = proStageInstance(sourceStage);
    proReleaseCampaignEntities(); proBuildTilemap(stage);
    var heroSpec = null;
    for (var i = 0; i < stage.entities.length; i++) {
      var spec = stage.entities[i];
      if (spec.kind === 'hero' && !heroSpec) heroSpec = spec;
      else if (spec.kind === 'gem' && proGemWasCollected(id, spec.id)) continue;
      else proCampaign.entities.push(proEntityFromSpec(spec));
    }
    if (!proCampaign.hero) proCampaign.hero = createCharacter({ w: 12, h: 15, color: '#40d9ff', speed: 82 });
    var hx = heroSpec ? heroSpec.x * 16 : 16; var hy = heroSpec ? heroSpec.y * 16 : 16;
    placeCharacterAt(proCampaign.hero, hx, hy); proCampaign.hero.vx = 0; proCampaign.hero.vy = 0; proCampaign.hero.onGround = false;
    proCampaign.hero._proPrevX = hx; proCampaign.hero._proPrevY = hy;
    proCampaign.hero._proCoyote = 0; proCampaign.hero._proBuffer = 0; proCampaign.hero._proInvincible = 0;
    proCampaign.stage = stage; proCampaign.stageId = id; proCampaign.active = true; proCampaign.elapsed = 0; proCampaign.triggered = Object.create(null);
    proCampaign.checkpoint = { id: heroSpec && heroSpec.id ? heroSpec.id : 'inicio', x: hx, y: hy };
    proCampaign.progress.stageId = id; proCampaign.progress.checkpointId = proCampaign.checkpoint.id;
    proCampaign.progress.checkpointX = hx; proCampaign.progress.checkpointY = hy;
    var settings = proPlainObject(proCampaign.progress.settings) ? proCampaign.progress.settings : {};
    proCampaign.volume = Math.max(0, Math.min(1, num(settings.volume, 1)));
    proCampaign.reducedMotion = settings.reducedMotion === true;
    proCampaign.highContrast = settings.highContrast === true;
    cameraFollow(proCampaign.hero, stage.width * 16, stage.height * 16);
    proEmitCampaign('fase', { stageId: id, reason: reason || 'start' });
    return true;
  }
  function startCampaign(stageId) {
    if (!proCampaign.id || !proCampaign.stages[proCampaign.firstStage]) { warn('a aventura ainda não tem uma primeira fase válida'); return false; }
    if (!proCampaign.progress) proCampaign.progress = proNewProgress();
    enableFixedSimulation({ seed: proCampaign.seed, maxCatchUpSteps: 5 });
    return proLoadStage(stageId || proCampaign.progress.stageId || proCampaign.firstStage, 'start');
  }
  function proQueueStage(stageId, reason) {
    var id = proSafeId(stageId);
    if (!proCampaign.stages[id] || proCampaign.transition) return false;
    if (proCampaign.reducedMotion) {
      var loadedNow = proLoadStage(id, reason);
      if (loadedNow) saveCampaign(proCampaign.activeSlot);
      return loadedNow;
    }
    proCampaign.transition = { stageId: id, reason: reason, phase: 'out', elapsed: 0, duration: 0.18 };
    return true;
  }
  function proStepTransition(dt) {
    var transition = proCampaign.transition;
    if (!transition) return false;
    transition.elapsed += dt;
    if (transition.phase === 'out' && transition.elapsed >= transition.duration) {
      var loaded = proLoadStage(transition.stageId, transition.reason);
      if (!loaded) { proCampaign.transition = null; return false; }
      transition.phase = 'in'; transition.elapsed = 0; proCampaign.transition = transition;
      saveCampaign(proCampaign.activeSlot);
    } else if (transition.phase === 'in' && transition.elapsed >= transition.duration) proCampaign.transition = null;
    return true;
  }
  function goToStage(stageId) { return proQueueStage(stageId, 'go'); }
  function warpToStage(stageId) {
    var id = proSafeId(stageId);
    if (!proCampaign.stages[id] || !proCampaign.progress) return false;
    if (proCampaign.progress.secrets.indexOf(id) === -1) proCampaign.progress.secrets.push(id);
    saveCampaign(proCampaign.activeSlot);
    return proQueueStage(id, 'warp');
  }
  function nextStage() {
    if (!proCampaign.stage) return false;
    var next = proCampaign.stage.nextStage;
    if (!next) {
      var complete = proCampaign.progress.gems.length >= proCampaign.requiredGems;
      if (complete) proCampaign.progress.journey = 2;
      saveCampaign(proCampaign.activeSlot); setState('vitoria'); proEmitCampaign('fim', { complete: complete, journey: proCampaign.progress.journey }); return true;
    }
    saveCampaign(proCampaign.activeSlot);
    return proQueueStage(next, 'next');
  }
  function setCampaignCheckpoint(id, x, y) {
    if (!proCampaign.progress) return;
    var key = proSafeId(id); if (!key) return;
    proCampaign.checkpoint = { id: key, x: num(x, 0) * 16, y: num(y, 0) * 16 };
    proCampaign.progress.checkpointId = key; proCampaign.progress.checkpointX = proCampaign.checkpoint.x; proCampaign.progress.checkpointY = proCampaign.checkpoint.y;
    saveCampaign(proCampaign.activeSlot); proEmitCampaign('checkpoint', { id: key });
  }
  function restartAtCheckpoint() {
    if (!proCampaign.hero || !proCampaign.checkpoint) return false;
    placeCharacterAt(proCampaign.hero, proCampaign.checkpoint.x, proCampaign.checkpoint.y);
    proCampaign.hero._proPrevX = proCampaign.checkpoint.x; proCampaign.hero._proPrevY = proCampaign.checkpoint.y;
    proCampaign.hero.vx = 0; proCampaign.hero.vy = 0; return true;
  }
  function proCurrentPlayer() {
    if (!proCampaign.progress) return null;
    return proCampaign.progress.players[proCampaign.progress.activePlayer - 1] || null;
  }
  function setHeroForm(form) {
    var player = proCurrentPlayer(); if (!player) return;
    var next = text(form, 'pequeno');
    if (next !== 'pequeno' && next !== 'forte' && next !== 'invencivel') next = 'pequeno';
    player.form = next; if (next === 'invencivel' && proCampaign.hero) proCampaign.hero._proInvincible = PRO_PHYSICS.duracaoDaEstrela;
  }
  function heroForm() { var player = proCurrentPlayer(); return player ? player.form : 'pequeno'; }
  function hurtHeroForm() {
    var player = proCurrentPlayer(); if (!player || !proCampaign.hero || proCampaign.hero._proInvincible > 0) return false;
    if (player.form === 'invencivel' || player.form === 'forte') { player.form = 'pequeno'; proCampaign.hero._proInvincible = PRO_PHYSICS.piscaAoLevarDano; return true; }
    player.lives -= 1;
    if (player.lives <= 0) {
      var nextIndex = proCampaign.progress.activePlayer % proCampaign.progress.players.length;
      var nextPlayer = proCampaign.progress.players[nextIndex];
      if (nextPlayer && nextPlayer.lives > 0) { proCampaign.progress.activePlayer = nextIndex + 1; restartAtCheckpoint(); }
      else setState('fim');
    } else restartAtCheckpoint();
    return true;
  }
  function proTileCharAt(x, y) {
    if (!proCampaign.stage) return '.';
    var c = Math.floor(x / 16); var r = Math.floor(y / 16);
    if (r < 0 || r >= proCampaign.stage.tiles.length || c < 0 || c >= proCampaign.stage.width) return '.';
    return proCampaign.stage.tiles[r].charAt(c);
  }
  function proSetTileChar(column, row, tile) {
    if (!proCampaign.stage || PRO_TILE_INDEX[tile] == null) return false;
    if (row < 0 || row >= proCampaign.stage.height || column < 0 || column >= proCampaign.stage.width) return false;
    var source = proCampaign.stage.tiles[row];
    proCampaign.stage.tiles[row] = source.slice(0, column) + tile + source.slice(column + 1);
    var map = tilemaps[proCampaign.mapKey];
    if (map && map.rows[row]) map.rows[row][column] = PRO_TILE_INDEX[tile];
    return true;
  }
  function proBumpTile(hero, wasMovingUp) {
    if (!wasMovingUp || num(hero.vy, 0) !== 0) return;
    var column = Math.floor(centerX(hero) / 16); var row = Math.floor((hero.y - 1) / 16);
    var tile = proCampaign.stage && proCampaign.stage.tiles[row] ? proCampaign.stage.tiles[row].charAt(column) : '.';
    if (tile === '?' && proSetTileChar(column, row, '.')) {
      proCampaign.progress.coins += 1; var player = proCurrentPlayer(); if (player) player.score += 100;
      proEmitCampaign('bloco', { kind: 'surpresa', column: column, row: row });
    } else if (tile === 'B' && heroForm() !== 'pequeno' && proSetTileChar(column, row, '.')) {
      var player2 = proCurrentPlayer(); if (player2) player2.score += 50;
      proEmitCampaign('bloco', { kind: 'quebrado', column: column, row: row });
    }
  }
  function proEntityTouchesHero(entity) {
    var hero = proCampaign.hero;
    return hero && entity.active && hero.x < entity.x + entity.w && hero.x + hero.w > entity.x && hero.y < entity.y + entity.h && hero.y + hero.h > entity.y;
  }
  function proCollect(entity) {
    entity.active = false; var player = proCurrentPlayer();
    if (entity.kind === 'coin') { proCampaign.progress.coins += 1; if (player) player.score += 100; }
    if (entity.kind === 'gem' && !proGemWasCollected(proCampaign.stageId, entity.id)) { proCampaign.progress.gems.push(proCampaignEntityKey(proCampaign.stageId, entity.id)); if (player) player.score += 1000; }
    proEmitCampaign('coleta', { kind: entity.kind, id: entity.id });
  }
  function proStepCampaignEntity(entity, dt) {
    if (!entity.active) return;
    entity.prevX = entity.x; entity.prevY = entity.y;
    entity.timer += dt;
    if (PRO_GROUND_KINDS[entity.kind] === true) {
      entity.kickGrace = Math.max(0, num(entity.kickGrace, 0) - dt);
      // Fase do casco: 1 anda, 2 recolhido, 3 chutado. Quem nao e casco fica em 1.
      var recolhido = entity.kind === 'shell' && entity.phase === 2;
      if (!recolhido) {
        var speed = entity.kind === 'shell' && entity.phase === 3
          ? PRO_PHYSICS.cascoChutado
          : Math.max(PRO_PHYSICS.inimigoVelocidadeMinima, num(entity.props.speed, PRO_PHYSICS.inimigoVelocidade));
        entity.x += entity.direction * speed * dt;
        var aheadX = entity.direction < 0 ? entity.x - 1 : entity.x + entity.w + 1;
        // ⚠️ A beirada so vira quem esta APOIADO: no ar, "nao tem chao adiante" e
        // verdade toda hora, e era isso que fazia o bicho pendurado inverter a
        // direcao sessenta vezes por segundo e tremer parado.
        var semChaoAdiante = entity.onGround === true && !proTileSupports(proTileCharAt(aheadX, entity.y + entity.h + 2));
        // O casco CHUTADO cai da beirada em vez de virar — e o que separa chutar
        // de soltar um bicho novo, e o que o jogo de referencia faz.
        if (entity.kind === 'shell' && entity.phase === 3) semChaoAdiante = false;
        if (proTileBlocks(proTileCharAt(aheadX, entity.y + entity.h / 2)) || semChaoAdiante) entity.direction *= -1;
      }
      proGroundEntity(entity, dt);
    } else if (entity.kind === 'flyer') {
      entity.x = entity.startX + Math.sin(entity.timer * Math.max(1, num(entity.props.speed, 2))) * Math.max(16, num(entity.props.range, 48));
      entity.y = entity.startY + Math.sin(entity.timer * 3) * 8;
    } else if (entity.kind === 'movingPlatform') {
      var range = Math.max(16, num(entity.props.range, 64)); var speed2 = Math.max(0.2, num(entity.props.speed, 1));
      entity.x = entity.startX + Math.sin(entity.timer * speed2) * range;
      var heroOnPlatform = proCampaign.hero;
      if (heroOnPlatform) {
        var oldTop = entity.prevY;
        var feet = heroOnPlatform.y + heroOnPlatform.h;
        var overlaps = heroOnPlatform.x + heroOnPlatform.w > entity.prevX && heroOnPlatform.x < entity.prevX + entity.w;
        if (num(heroOnPlatform.vy, 0) >= 0 && Math.abs(feet - oldTop) <= 4 && overlaps) {
          heroOnPlatform.x += entity.x - entity.prevX; heroOnPlatform.y += entity.y - entity.prevY;
          heroOnPlatform.onGround = true; heroOnPlatform.vy = 0;
        }
      }
    } else if (entity.kind === 'boss') {
      var ratio = entity.health / Math.max(1, num(entity.props.health, 6));
      entity.phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
      var bossSpeed = Math.max(0.2, num(entity.props.speed, 1));
      var bossRange = Math.max(16, num(entity.props.range, 30));
      entity.x = entity.startX + Math.sin(entity.timer * bossSpeed * entity.phase) * (bossRange + (entity.phase - 1) * 10);
      entity.y = entity.startY + Math.abs(Math.sin(entity.timer * 1.5)) * -16 * entity.phase;
    }
    if (!proEntityTouchesHero(entity)) return;
    if (entity.kind === 'coin' || entity.kind === 'gem') { proCollect(entity); return; }
    if (entity.kind === 'powerup') { setHeroForm(entity.variant === 'invencivel' ? 'invencivel' : 'forte'); proCollect(entity); return; }
    if (entity.kind === 'checkpoint') { setCampaignCheckpoint(entity.id || 'checkpoint', entity.x / 16, entity.y / 16); entity.active = false; return; }
    if (entity.kind === 'exit') {
      var bossAlive = false;
      if (entity.props.requiresBoss === true) for (var bi = 0; bi < proCampaign.entities.length; bi++) if (proCampaign.entities[bi].kind === 'boss' && proCampaign.entities[bi].active) bossAlive = true;
      if (bossAlive) { proCampaign.hero.x = Math.min(proCampaign.hero.x, entity.x - proCampaign.hero.w); proEmitCampaign('saida-bloqueada', { boss: true }); return; }
      nextStage(); return;
    }
    if (entity.kind === 'secretExit' || entity.kind === 'portal') { if (proCampaign.stage.secretStage) warpToStage(proCampaign.stage.secretStage); return; }
    if (PRO_CONTACT_ENEMIES[entity.kind] === true) {
      var hero = proCampaign.hero;
      var pisada = hero.vy > 0 && hero.y + hero.h - entity.y < PRO_PHYSICS.janelaDaPisada;
      if (heroForm() === 'invencivel') { proDefeatEnemy(entity); return; }
      // O espinho cobra ATE na pisada: e o que o rotulo do catalogo promete, o
      // que a guarda morta insinuava e o que o irmao classico faz.
      if (entity.kind === 'spiky') { hurtHeroForm(); return; }
      if (entity.kind === 'shell') { proShellContact(entity, pisada, hero); return; }
      if (!pisada) { hurtHeroForm(); return; }
      hero.vy = -PRO_PHYSICS.quiqueDaPisada;
      if (entity.kind !== 'boss') { proDefeatEnemy(entity); return; }
      entity.health -= 1;
      if (entity.health <= 0) proDefeatEnemy(entity);
    }
  }
  /**
   * A UNICA porta de saida de um inimigo do palco.
   *
   * Antes havia duas mortes de chefe e so uma delas avisava: derrubar o guardiao
   * com a estrela pulava o "quando vencer o guardiao" que a crianca ligou. Com o
   * dono unico, quem morre avisa, nao importa por onde tenha morrido.
   */
  function proDefeatEnemy(entity) {
    if (!entity || entity.active !== true) return false;
    entity.active = false;
    if (entity.kind === 'boss') proEmitCampaign('guardiao', { id: entity.id });
    return true;
  }
  /**
   * O casco em TRES fases: anda (1), recolhido (2), chutado (3).
   *
   * Estava invertido — pisar DISPARAVA o casco, a segunda pisada o MATAVA e um
   * casco andando cobrava vida de quem o chutou. Aqui pisar sempre PARA, encostar
   * num casco parado CHUTA, e quem chutou tem uma graca para sair de perto.
   */
  function proShellContact(entity, pisada, hero) {
    if (pisada) {
      hero.vy = -PRO_PHYSICS.quiqueDaPisada;
      entity.phase = 2; entity.vx = 0;
      // ⚠️ A propria sobreposicao que PISOU ainda dura um quadro ou dois (o
      // heroi sobe a -180 e leva ~2 quadros para desencostar). Sem a graca, o
      // casco sairia chutado no quadro seguinte a cada pisada.
      entity.kickGrace = PRO_PHYSICS.gracaDoChute;
      return;
    }
    if (entity.phase === 1) { hurtHeroForm(); return; }
    if (num(entity.kickGrace, 0) > 0) return;
    if (entity.phase === 2) {
      entity.phase = 3;
      entity.direction = hero.x < entity.x ? 1 : -1;
      entity.kickGrace = PRO_PHYSICS.gracaDoChute;
      return;
    }
    hurtHeroForm();
  }
  /**
   * Queda e apoio de quem anda no chao. Chefe e voador ficam de fora de
   * proposito: os dois escrevem o proprio y por seno, e somar gravidade neles
   * derrubaria o guardiao que a fase estaciona no ar.
   *
   * A regua vertical e a MESMA tabela de pecas do heroi (proTileSupports); a
   * horizontal continua sendo a sonda de direcao, que e o idioma do genero.
   */
  function proGroundEntity(entity, dt) {
    entity.vy = num(entity.vy, 0) + PRO_PHYSICS.gravidade * dt;
    entity.y += entity.vy * dt;
    entity.onGround = false;
    // ⚠️ Quem sai do mundo SOME. Antes da gravidade nada caia, entao isto nao
    // podia acontecer; com ela, um casco chutado de uma beirada cai PARA SEMPRE
    // (medido: y = 8652 e vy = 2973 depois de dez segundos), segue "ativo",
    // paga passo todo quadro e ainda encosta em quem cair junto. E a mesma
    // classe que o irmao g2d catalogou em 12/08 com o inimigo que voa.
    if (proCampaign.stage && entity.y > proCampaign.stage.height * 16 + 32) {
      proDefeatEnemy(entity);
      return;
    }
    if (entity.vy < 0) return;
    var pe = entity.y + entity.h;
    // Dois pontos bastam: o bicho tem 14px numa celula de 16, entao nenhuma peca
    // cabe inteira entre os pes dele.
    if (!proTileSupports(proTileCharAt(entity.x + 1, pe)) && !proTileSupports(proTileCharAt(entity.x + entity.w - 1, pe))) return;
    entity.y = Math.floor(pe / 16) * 16 - entity.h;
    entity.vy = 0;
    entity.onGround = true;
  }
  /**
   * Diagnostico do HOST: o estado VIVO da campanha, entidade por entidade.
   *
   * Nao entra na API da crianca (vive no registro opt-in de inspetores) e nao
   * move contador nenhum. Existe porque, sem ele, "o espinho nao fez nada" era
   * inverificavel: campaignHero() e campaignProgress() existem, o estado das
   * entidades nao.
   */
  function proCampaignInspect() {
    var stage = proCampaign.stage;
    var hero = proCampaign.hero;
    var items = [];
    for (var i = 0; i < proCampaign.entities.length; i++) {
      var e = proCampaign.entities[i];
      items.push({
        kind: e.kind, id: e.id, x: e.x, y: e.y, w: e.w, h: e.h,
        vx: num(e.vx, 0), vy: num(e.vy, 0), active: e.active === true, onGround: e.onGround === true,
        phase: num(e.phase, 0), health: num(e.health, 0), direction: num(e.direction, 0),
        variant: e.variant || ''
      });
    }
    return {
      stageId: proCampaign.stageId,
      world: stage ? stage.world : 0,
      order: stage ? stage.order : 0,
      theme: stage ? stage.theme : '',
      width: stage ? stage.width : 0,
      height: stage ? stage.height : 0,
      tiles: stage ? stage.tiles.slice() : [],
      hero: hero ? {
        x: hero.x, y: hero.y, vx: num(hero.vx, 0), vy: num(hero.vy, 0),
        w: hero.w, h: hero.h, onGround: hero.onGround === true, form: heroForm()
      } : null,
      entities: items,
      progress: proCampaign.progress,
      transitioning: proCampaign.transition != null
    };
  }
  function stepCampaign(dt) {
    if (!proCampaign.active || !proCampaign.stage || !proCampaign.hero || state !== 'jogando') return;
    if (proStepTransition(dt)) return;
    var hero = proCampaign.hero; proCampaign.elapsed += dt;
    hero._proPrevX = hero.x; hero._proPrevY = hero.y;
    hero._proInvincible = Math.max(0, num(hero._proInvincible, 0) - dt);
    hero._proCoyote = hero.onGround ? PRO_PHYSICS.coiote : Math.max(0, num(hero._proCoyote, 0) - dt);
    if (proActionPressed.pular) hero._proBuffer = PRO_PHYSICS.buffer; else hero._proBuffer = Math.max(0, num(hero._proBuffer, 0) - dt);
    var inWater = proTileCharAt(centerX(hero), centerY(hero)) === '~';
    var onLadder = proTileCharAt(centerX(hero), centerY(hero)) === 'H';
    var direction = (proActionDown.direita ? 1 : 0) - (proActionDown.esquerda ? 1 : 0);
    var speed = (proActionDown.correr ? PRO_PHYSICS.correr : PRO_PHYSICS.andar) * (inWater ? PRO_PHYSICS.fatorDaAgua : 1);
    hero.vx = direction * speed;
    if ((onLadder || inWater) && (proActionDown.cima || proActionDown.baixo)) {
      var vertical = (proActionDown.baixo ? 1 : 0) - (proActionDown.cima ? 1 : 0);
      hero.vy = vertical * (inWater ? PRO_PHYSICS.nadar : PRO_PHYSICS.escada);
    }
    else {
      applyGravity(hero, inWater ? PRO_PHYSICS.gravidadeNaAgua : PRO_PHYSICS.gravidade, dt);
      if (hero._proBuffer > 0 && (hero.onGround || hero._proCoyote > 0 || inWater)) { hero.vy = inWater ? -PRO_PHYSICS.puloNaAgua : -PRO_PHYSICS.pulo; hero.onGround = false; hero._proBuffer = 0; hero._proCoyote = 0; }
      if (!proActionDown.pular && hero.vy < -PRO_PHYSICS.corteDoPulo) hero.vy = -PRO_PHYSICS.corteDoPulo;
    }
    var wasMovingUp = num(hero.vy, 0) < 0;
    moveByVelocity(hero, dt); collideTilemap(hero, proCampaign.mapKey); proBumpTile(hero, wasMovingUp);
    var material = proTileCharAt(centerX(hero), centerY(hero));
    if (material === '^' || hero.y > proCampaign.stage.height * 16 + 32) hurtHeroForm();
    for (var i = 0; i < proCampaign.entities.length; i++) proStepCampaignEntity(proCampaign.entities[i], dt);
    for (var ti = 0; ti < proCampaign.stage.triggers.length; ti++) {
      var trigger = proCampaign.stage.triggers[ti];
      var tx = trigger.x * 16, ty = trigger.y * 16, tw = trigger.w * 16, th = trigger.h * 16;
      var triggerKey = ti + ':' + trigger.kind;
      if (!proCampaign.triggered[triggerKey] && hero.x < tx + tw && hero.x + hero.w > tx && hero.y < ty + th && hero.y + hero.h > ty) { proCampaign.triggered[triggerKey] = true; proEmitCampaign(trigger.kind, trigger); }
    }
    if (proCampaign.stage.timeLimit > 0 && proCampaign.elapsed >= proCampaign.stage.timeLimit) { proCampaign.elapsed = 0; hurtHeroForm(); }
  }
  function proThemeColors(theme) {
    var themes = {
      campo: ['#5cc8ff', '#9ee56b', '#6f4b2b'], caverna: ['#17162b', '#6f5b88', '#392f4f'],
      agua: ['#36a9e1', '#5eead4', '#175b8a'], neve: ['#bde9ff', '#ffffff', '#6687a3'],
      deserto: ['#ffd166', '#e8a84f', '#8a5636'], castelo: ['#241d35', '#8c6f9d', '#3f334d'],
      ceu: ['#77d9ff', '#ffffff', '#7599c9'], vulcao: ['#3a1520', '#ff6b35', '#5a2a2a']
    };
    return themes[theme] || themes.campo;
  }
  function proDrawTile(ch, x, y, colors) {
    if (ch === '.') return;
    if (ch === '~') { ctx2d.fillStyle = 'rgba(40,180,235,.72)'; ctx2d.fillRect(x, y + 4, 16, 12); return; }
    if (ch === 'H') { ctx2d.strokeStyle = '#d8a15d'; ctx2d.lineWidth = 2; ctx2d.strokeRect(x + 4, y, 8, 16); ctx2d.beginPath(); ctx2d.moveTo(x + 4, y + 5); ctx2d.lineTo(x + 12, y + 5); ctx2d.moveTo(x + 4, y + 11); ctx2d.lineTo(x + 12, y + 11); ctx2d.stroke(); return; }
    ctx2d.fillStyle = ch === '^' ? '#f04d4d' : ch === '=' ? '#c68a4a' : ch === '?' ? '#f7c948' : ch === 'B' ? '#b56a3b' : colors[2];
    if (ch === '^') { ctx2d.beginPath(); ctx2d.moveTo(x, y + 16); ctx2d.lineTo(x + 8, y); ctx2d.lineTo(x + 16, y + 16); ctx2d.fill(); return; }
    ctx2d.fillRect(x, ch === '=' ? y + 10 : y, 16, ch === '=' ? 6 : 16);
    ctx2d.fillStyle = 'rgba(255,255,255,.18)'; ctx2d.fillRect(x + 1, ch === '=' ? y + 10 : y + 1, 14, 2);
    // ⚠️ O setter de ctx.font NÃO resolve custom property: 'bold 12px var(--sz-game-ui-font)'
    // é descartado em silêncio e o texto sai na fonte ANTERIOR. Quem tem o nome
    // resolvido da família é o _szGameUIFont, como nos outros 20 sites do runtime.
    if (ch === '?') { ctx2d.fillStyle = '#6b4d16'; ctx2d.font = 'bold 12px ' + _szGameUIFont; ctx2d.fillText('?', x + 5, y + 13); }
  }
  function proDrawEntity(entity) {
    if (!entity.active) return;
    var alpha = proSim.enabled ? proSim.alpha : 1;
    var x = num(entity.prevX, entity.x) + (entity.x - num(entity.prevX, entity.x)) * alpha;
    var y = num(entity.prevY, entity.y) + (entity.y - num(entity.prevY, entity.y)) * alpha;
    if (entity.kind === 'coin') { ctx2d.fillStyle = '#ffd84a'; ctx2d.beginPath(); ctx2d.ellipse(x + 5, y + 5, 3, 5, 0, 0, Math.PI * 2); ctx2d.fill(); return; }
    if (entity.kind === 'gem') { ctx2d.fillStyle = '#66f5ff'; ctx2d.beginPath(); ctx2d.moveTo(x + 5, y); ctx2d.lineTo(x + 10, y + 5); ctx2d.lineTo(x + 5, y + 10); ctx2d.lineTo(x, y + 5); ctx2d.fill(); return; }
    if (entity.kind === 'checkpoint') { ctx2d.fillStyle = '#ececec'; ctx2d.fillRect(x + 2, y - 8, 2, 22); ctx2d.fillStyle = '#55e37b'; ctx2d.fillRect(x + 4, y - 7, 10, 7); return; }
    if (entity.kind === 'exit' || entity.kind === 'secretExit' || entity.kind === 'portal') { ctx2d.strokeStyle = entity.kind === 'secretExit' ? '#b96cff' : '#63f5ad'; ctx2d.lineWidth = 3; ctx2d.strokeRect(x + 1, y - 10, 12, 24); return; }
    if (entity.kind === 'movingPlatform') { ctx2d.fillStyle = '#c7925b'; ctx2d.fillRect(x, y + 8, 28, 6); return; }
    if (entity.kind === 'powerup') { ctx2d.fillStyle = entity.variant === 'invencivel' ? '#ff77d5' : '#ff4d55'; ctx2d.beginPath(); ctx2d.arc(x + 7, y + 7, 7, Math.PI, 0); ctx2d.fill(); ctx2d.fillStyle = '#f7e6c5'; ctx2d.fillRect(x + 3, y + 7, 8, 7); return; }
    ctx2d.fillStyle = entity.kind === 'boss' ? '#8e3b9c' : entity.kind === 'spiky' ? '#cf4454' : entity.kind === 'flyer' ? '#5b73d6' : '#7a4c2a';
    ctx2d.fillRect(x, y + 3, entity.kind === 'boss' ? 24 : 14, entity.kind === 'boss' ? 22 : 11);
    ctx2d.fillStyle = '#ffffff'; ctx2d.fillRect(x + 3, y + 5, 2, 2); ctx2d.fillRect(x + 9, y + 5, 2, 2);
  }
  function drawCampaign() {
    if (!ctx2d || !proCampaign.active || !proCampaign.stage) return;
    var colors = proThemeColors(proCampaign.stage.theme);
    ctx2d.fillStyle = colors[0]; ctx2d.fillRect(camera.x, camera.y, config.w, config.h);
    ctx2d.fillStyle = colors[1];
    for (var hill = 0; hill < 8; hill++) { var hx = Math.floor(camera.x / 96) * 96 + hill * 96; ctx2d.beginPath(); ctx2d.arc(hx, proCampaign.stage.height * 16 - 12, 46, Math.PI, 0); ctx2d.fill(); }
    var firstCol = Math.max(0, Math.floor(camera.x / 16) - 1); var lastCol = Math.min(proCampaign.stage.width - 1, Math.ceil((camera.x + config.w) / 16) + 1);
    var firstRow = Math.max(0, Math.floor(camera.y / 16) - 1); var lastRow = Math.min(proCampaign.stage.height - 1, Math.ceil((camera.y + config.h) / 16) + 1);
    for (var r = firstRow; r <= lastRow; r++) for (var c = firstCol; c <= lastCol; c++) proDrawTile(proCampaign.stage.tiles[r].charAt(c), c * 16, r * 16, colors);
    for (var i = 0; i < proCampaign.entities.length; i++) proDrawEntity(proCampaign.entities[i]);
    var hero = proCampaign.hero;
    if (hero) {
      var alpha = proSim.enabled ? proSim.alpha : 1;
      var heroX = num(hero._proPrevX, hero.x) + (hero.x - num(hero._proPrevX, hero.x)) * alpha;
      var heroY = num(hero._proPrevY, hero.y) + (hero.y - num(hero._proPrevY, hero.y)) * alpha;
      var blink = hero._proInvincible > 0 && Math.floor(hero._proInvincible * 12) % 2 === 0;
      if (!blink) {
        ctx2d.fillStyle = heroForm() === 'forte' ? '#ff5b55' : heroForm() === 'invencivel' ? '#ff77d5' : '#29b6d8';
        ctx2d.fillRect(heroX + 2, heroY, 8, 5); ctx2d.fillRect(heroX, heroY + 5, 12, 8);
        ctx2d.fillStyle = '#f5d3b3'; ctx2d.fillRect(heroX + 3, heroY + 3, 7, 5);
        ctx2d.fillStyle = '#283044'; ctx2d.fillRect(heroX + 8, heroY + 4, 1, 1);
      }
    }
  }
  function drawCampaignHud() {
    if (!ctx2d || !proCampaign.active || !proCampaign.progress) return;
    var player = proCurrentPlayer();
    ctx2d.save(); ctx2d.fillStyle = proCampaign.highContrast ? '#000000' : 'rgba(10,18,35,.72)'; ctx2d.fillRect(4, 4, 248, 18);
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = 'bold 9px ' + _szGameUIFont;
    ctx2d.fillText('MUNDO ' + proCampaign.stage.world + '  FASE ' + proCampaign.stage.order, 9, 16);
    ctx2d.fillText('P' + proCampaign.progress.activePlayer + ' ×' + (player ? player.lives : 0), 105, 16);
    ctx2d.fillText('MOEDAS ' + proCampaign.progress.coins, 154, 16); ctx2d.fillText('◆' + proCampaign.progress.gems.length, 222, 16); ctx2d.restore();
    if (proCampaign.transition) {
      var transition = proCampaign.transition; var progress = Math.min(1, transition.elapsed / transition.duration);
      var opacity = transition.phase === 'out' ? progress : 1 - progress;
      ctx2d.save(); ctx2d.globalAlpha = opacity; ctx2d.fillStyle = '#05070d'; ctx2d.fillRect(0, 0, config.w, config.h); ctx2d.restore();
    }
  }

  var proReplayRecording = null;
  var proReplayPlaying = null;
  var proReplayRunIndex = 0;
  var proReplayRunTick = 0;
  var proReplayPlaybackTick = 0;
  var proReplayLastError = '';
  var proLastReplay = null;

  function proHashString(value) {
    var hash = 2166136261;
    var input = String(value);
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    var out = (hash >>> 0).toString(16);
    return ('00000000' + out).slice(-8);
  }
  function proStableStringify(value) {
    if (value == null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
      var items = [];
      for (var ai = 0; ai < value.length; ai++) items.push(proStableStringify(value[ai]));
      return '[' + items.join(',') + ']';
    }
    var keysSorted = Object.keys(value).sort();
    var pairs = [];
    for (var oi = 0; oi < keysSorted.length; oi++) {
      var key = keysSorted[oi];
      if (value[key] !== undefined) pairs.push(JSON.stringify(key) + ':' + proStableStringify(value[key]));
    }
    return '{' + pairs.join(',') + '}';
  }
  function proReplayMask() {
    if (!proReplayPlaying) return -1;
    var runs = proReplayPlaying.runs;
    if (proReplayRunIndex >= runs.length) { proReplayPlaying = null; return 0; }
    var run = runs[proReplayRunIndex];
    var mask = run.mask >>> 0;
    proReplayRunTick += 1;
    proReplayPlaybackTick += 1;
    if (proReplayRunTick >= run.ticks) { proReplayRunIndex += 1; proReplayRunTick = 0; }
    return mask;
  }
  function proCampaignSnapshot() {
    var hero = proCampaign.hero;
    return { tick: proSim.tick, random: proSim.randomState, stage: proCampaign.stageId, x: hero ? Math.round(hero.x * 1024) : 0, y: hero ? Math.round(hero.y * 1024) : 0, vx: hero ? Math.round(num(hero.vx, 0) * 1024) : 0, vy: hero ? Math.round(num(hero.vy, 0) * 1024) : 0, progress: proCampaign.progress };
  }
  function replayHash() { return proHashString(proStableStringify(proCampaignSnapshot())); }
  function proReplayCheckpointHash(tick) {
    var snapshot = proCampaignSnapshot(); snapshot.tick = tick;
    return proHashString(proStableStringify(snapshot));
  }
  function professionalBeforeSimulationStep() {
    proSim.tick += 1; sampleProfessionalActions(); stepCampaign(proSim.step);
    if (proReplayRecording) {
      var mask = proActionMask(); var runs = proReplayRecording.runs; var last = runs[runs.length - 1];
      if (last && last.mask === mask) last.ticks += 1; else runs.push({ mask: mask, ticks: 1 });
      proReplayRecording.ticks += 1;
    }
  }
  function professionalAfterSimulationStep() {
    runFixedHooks(proSim.step);
    if (proReplayRecording && proReplayRecording.ticks % 60 === 0) proReplayRecording.checksums.push({ tick: proReplayRecording.ticks, hash: proReplayCheckpointHash(proReplayRecording.ticks) });
    if (proReplayPlaying) {
      var replayCheckpointHash = proReplayCheckpointHash(proReplayPlaybackTick);
      for (var i = 0; i < proReplayPlaying.checksums.length; i++) {
        var expected = proReplayPlaying.checksums[i];
        if (expected.tick === proReplayPlaybackTick && expected.hash !== replayCheckpointHash) {
          proReplayLastError = 'tick ' + proReplayPlaybackTick + ': esperado ' + expected.hash + ', recebido ' + replayCheckpointHash;
          warn('a repetição divergiu no ' + proReplayLastError); proReplayPlaying = null; break;
        }
      }
    }
  }
  function startReplayRecording() {
    proReplayPlaying = null;
    if (proCampaign.active && proCampaign.progress && proCampaign.checkpoint) {
      var checkpointBeforeReplay = { id: proCampaign.checkpoint.id, x: proCampaign.checkpoint.x, y: proCampaign.checkpoint.y };
      proLoadStage(proCampaign.stageId, 'replay-record'); proCampaign.checkpoint = checkpointBeforeReplay;
      proCampaign.progress.checkpointId = checkpointBeforeReplay.id; proCampaign.progress.checkpointX = checkpointBeforeReplay.x; proCampaign.progress.checkpointY = checkpointBeforeReplay.y;
      restartAtCheckpoint(); proCampaign.elapsed = 0;
    }
    var hero = proCampaign.hero; var checkpoint = proCampaign.checkpoint || { id: 'inicio', x: hero ? hero.x : 0, y: hero ? hero.y : 0 };
    var initial = proCampaign.active && proCampaign.progress ? { progress: proSavePayload(), hero: { x: hero ? hero.x : 0, y: hero ? hero.y : 0, vx: hero ? num(hero.vx, 0) : 0, vy: hero ? num(hero.vy, 0) : 0 }, checkpoint: { id: checkpoint.id, x: checkpoint.x, y: checkpoint.y }, elapsed: proCampaign.elapsed, randomState: proSim.randomState } : null;
    proReplayRecording = { schemaVersion: 1, campaignVersion: proCampaign.version, seed: proSim.seed, hz: 60, ticks: 0, runs: [], checksums: [], initial: initial };
  }
  function stopReplayRecording() {
    var replay = proReplayRecording; proReplayRecording = null;
    if (replay) proLastReplay = replay;
    return replay;
  }
  function proCleanReplayInitial(value) {
    if (!proPlainObject(value) || !proObjectHasOnlyKeys(value, ['progress', 'hero', 'checkpoint', 'elapsed', 'randomState'])) return null;
    var progress = proCleanChecksummedSave(value.progress);
    if (!progress || progress.campaignVersion !== proCampaign.version || !proCampaign.stages[progress.stageId]) return null;
    if (!proPlainObject(value.hero) || !proObjectHasOnlyKeys(value.hero, ['x', 'y', 'vx', 'vy']) || typeof value.hero.x !== 'number' || !isFinite(value.hero.x) || typeof value.hero.y !== 'number' || !isFinite(value.hero.y) || typeof value.hero.vx !== 'number' || !isFinite(value.hero.vx) || typeof value.hero.vy !== 'number' || !isFinite(value.hero.vy)) return null;
    if (!proPlainObject(value.checkpoint) || !proObjectHasOnlyKeys(value.checkpoint, ['id', 'x', 'y']) || !proSafeId(value.checkpoint.id) || typeof value.checkpoint.x !== 'number' || !isFinite(value.checkpoint.x) || typeof value.checkpoint.y !== 'number' || !isFinite(value.checkpoint.y)) return null;
    if (typeof value.elapsed !== 'number' || !isFinite(value.elapsed) || value.elapsed < 0 || value.elapsed > 3600 || !Number.isInteger(value.randomState) || value.randomState < 1 || value.randomState > 4294967295) return null;
    return { progress: progress, hero: { x: value.hero.x, y: value.hero.y, vx: value.hero.vx, vy: value.hero.vy }, checkpoint: { id: value.checkpoint.id, x: value.checkpoint.x, y: value.checkpoint.y }, elapsed: value.elapsed, randomState: value.randomState };
  }
  function proCleanReplay(replay) {
    if (!proPlainObject(replay) || !proObjectHasOnlyKeys(replay, ['schemaVersion', 'campaignVersion', 'seed', 'hz', 'ticks', 'runs', 'checksums', 'initial']) || replay.schemaVersion !== 1 || replay.campaignVersion !== proCampaign.version || replay.hz !== 60 || !Number.isInteger(replay.seed) || replay.seed < 1 || replay.seed > 4294967295 || !Number.isInteger(replay.ticks) || replay.ticks < 0 || replay.ticks > 432000) return null;
    if (!Array.isArray(replay.runs) || replay.runs.length > 100000 || !Array.isArray(replay.checksums) || replay.checksums.length > 7200) return null;
    var runs = [];
    var total = 0;
    for (var i = 0; i < replay.runs.length; i++) {
      var run = replay.runs[i]; if (!proPlainObject(run) || !proObjectHasOnlyKeys(run, ['mask', 'ticks']) || !Number.isInteger(run.mask) || run.mask < 0 || run.mask > 1023 || !Number.isInteger(run.ticks) || run.ticks < 1 || run.ticks > 7200) return null;
      total += run.ticks; if (total > 432000) return null;
      runs.push({ mask: run.mask, ticks: run.ticks });
    }
    if (total !== replay.ticks) return null;
    var checksums = [];
    for (var ci = 0; ci < replay.checksums.length; ci++) {
      var checksum = replay.checksums[ci];
      if (!proPlainObject(checksum) || !proObjectHasOnlyKeys(checksum, ['tick', 'hash']) || !Number.isInteger(checksum.tick) || checksum.tick < 1 || checksum.tick > replay.ticks || typeof checksum.hash !== 'string' || !/^[0-9a-f]{8}$/.test(checksum.hash)) return null;
      checksums.push({ tick: checksum.tick, hash: checksum.hash });
    }
    var initial = replay.initial === null ? null : proCleanReplayInitial(replay.initial); if (replay.initial !== null && !initial) return null;
    return { schemaVersion: 1, campaignVersion: replay.campaignVersion, seed: replay.seed, hz: 60, ticks: replay.ticks, runs: runs, checksums: checksums, initial: initial };
  }
  function playReplay(replay) {
    var cleaned = proCleanReplay(replay);
    if (!cleaned) { warn('a repetição não é compatível com esta aventura'); return false; }
    proReplayRecording = null; proReplayPlaying = cleaned; proReplayRunIndex = 0; proReplayRunTick = 0; proReplayPlaybackTick = 0; proReplayLastError = '';
    enableFixedSimulation({ seed: cleaned.seed, maxCatchUpSteps: 5 });
    if (cleaned.initial) {
      proCampaign.progress = proProgressFromSave(cleaned.initial.progress); proLoadStage(cleaned.initial.progress.stageId, 'replay');
      proCampaign.checkpoint = cleaned.initial.checkpoint;
      proCampaign.progress.checkpointId = cleaned.initial.checkpoint.id; proCampaign.progress.checkpointX = cleaned.initial.checkpoint.x; proCampaign.progress.checkpointY = cleaned.initial.checkpoint.y;
      placeCharacterAt(proCampaign.hero, cleaned.initial.hero.x, cleaned.initial.hero.y); proCampaign.hero._proPrevX = cleaned.initial.hero.x; proCampaign.hero._proPrevY = cleaned.initial.hero.y;
      proCampaign.hero.vx = cleaned.initial.hero.vx; proCampaign.hero.vy = cleaned.initial.hero.vy; proCampaign.elapsed = cleaned.initial.elapsed; proSim.randomState = cleaned.initial.randomState;
    }
    return true;
  }
  function playLastReplay() { return proLastReplay ? playReplay(proLastReplay) : false; }
  function configureSaveSlots(count) { proCampaign.saveSlots = boundedInteger(count, 3, 1, 3); }
  function proSaveKey(slot) { return 'szgk-campaign:' + proCampaign.id + ':slot:' + slot; }
  function proSavePayload() {
    var progress = proCampaign.progress || proNewProgress();
    var payload = { schemaVersion: 1, campaignVersion: proCampaign.version, stageId: progress.stageId, checkpointId: progress.checkpointId, checkpointX: progress.checkpointX, checkpointY: progress.checkpointY, activePlayer: progress.activePlayer, players: progress.players, coins: progress.coins, gems: progress.gems, secrets: progress.secrets, journey: progress.journey, settings: progress.settings };
    payload.checksum = proHashString(proStableStringify(payload)); return payload;
  }
  function saveCampaign(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); if (!proCampaign.id || !proCampaign.progress) return false;
    try { window.localStorage.setItem(proSaveKey(index), JSON.stringify(proSavePayload())); proCampaign.activeSlot = index; return true; }
    catch (e) { warn('não consegui guardar a aventura: ' + e); return false; }
  }
  function proSafeIdList(value) {
    if (!Array.isArray(value) || value.length > 128) return null;
    var output = [];
    for (var i = 0; i < value.length; i++) {
      var id = proSafeId(value[i]); if (!id) return null;
      if (output.indexOf(id) === -1) output.push(id);
    }
    return output;
  }
  function proCleanSaveData(data) {
    if (!proPlainObject(data) || !proObjectHasOnlyKeys(data, ['schemaVersion', 'campaignVersion', 'stageId', 'checkpointId', 'checkpointX', 'checkpointY', 'activePlayer', 'players', 'coins', 'gems', 'secrets', 'journey', 'settings'])) return null;
    if (data.schemaVersion !== 1 || !Number.isInteger(data.campaignVersion) || data.campaignVersion < 1 || !proSafeId(data.stageId)) return null;
    var checkpointId = data.checkpointId === '' ? '' : proSafeId(data.checkpointId); if (!checkpointId && data.checkpointId !== '') return null;
    if (typeof data.checkpointX !== 'number' || !isFinite(data.checkpointX) || typeof data.checkpointY !== 'number' || !isFinite(data.checkpointY)) return null;
    if (!Array.isArray(data.players) || data.players.length < 1 || data.players.length > 2 || !Number.isInteger(data.activePlayer) || data.activePlayer < 1 || data.activePlayer > data.players.length) return null;
    var players = [];
    for (var pi = 0; pi < data.players.length; pi++) {
      var sourcePlayer = data.players[pi];
      if (!proPlainObject(sourcePlayer) || !proObjectHasOnlyKeys(sourcePlayer, ['lives', 'score', 'form']) || !Number.isInteger(sourcePlayer.lives) || sourcePlayer.lives < 0 || sourcePlayer.lives > 99 || !Number.isInteger(sourcePlayer.score) || sourcePlayer.score < 0 || sourcePlayer.score > 999999999 || sourcePlayer.form !== 'pequeno' && sourcePlayer.form !== 'forte' && sourcePlayer.form !== 'invencivel') return null;
      players.push({ lives: sourcePlayer.lives, score: sourcePlayer.score, form: sourcePlayer.form });
    }
    if (!Number.isInteger(data.coins) || data.coins < 0 || data.coins > 999999 || data.journey !== 1 && data.journey !== 2) return null;
    var gems = proSafeIdList(data.gems); var secrets = proSafeIdList(data.secrets); if (!gems || !secrets) return null;
    if (!proPlainObject(data.settings) || !proObjectHasOnlyKeys(data.settings, ['volume', 'reducedMotion', 'highContrast']) || typeof data.settings.volume !== 'number' || !isFinite(data.settings.volume) || data.settings.volume < 0 || data.settings.volume > 1 || typeof data.settings.reducedMotion !== 'boolean' || typeof data.settings.highContrast !== 'boolean') return null;
    return { schemaVersion: 1, campaignVersion: data.campaignVersion, stageId: data.stageId, checkpointId: checkpointId, checkpointX: data.checkpointX, checkpointY: data.checkpointY, activePlayer: data.activePlayer, players: players, coins: data.coins, gems: gems, secrets: secrets, journey: data.journey, settings: { volume: data.settings.volume, reducedMotion: data.settings.reducedMotion, highContrast: data.settings.highContrast } };
  }
  function proCleanChecksummedSave(data) {
    if (!proPlainObject(data) || !proObjectHasOnlyKeys(data, ['schemaVersion', 'campaignVersion', 'stageId', 'checkpointId', 'checkpointX', 'checkpointY', 'activePlayer', 'players', 'coins', 'gems', 'secrets', 'journey', 'settings', 'checksum']) || typeof data.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(data.checksum)) return null;
    var payload = Object.create(null); var keysList = Object.keys(data);
    for (var i = 0; i < keysList.length; i++) if (keysList[i] !== 'checksum') payload[keysList[i]] = data[keysList[i]];
    if (proHashString(proStableStringify(payload)) !== data.checksum) return null;
    var cleaned = proCleanSaveData(payload); if (!cleaned) return null;
    cleaned.checksum = data.checksum; return cleaned;
  }
  function proProgressFromSave(data) {
    return { stageId: data.stageId, checkpointId: data.checkpointId, checkpointX: data.checkpointX, checkpointY: data.checkpointY, activePlayer: data.activePlayer, players: data.players, coins: data.coins, gems: data.gems, secrets: data.secrets, journey: data.journey, settings: data.settings };
  }
  function proReadSave(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); var raw;
    try { raw = window.localStorage.getItem(proSaveKey(index)); } catch (e) { return { kind: 'corrupt' }; }
    if (raw == null) return { kind: 'empty' };
    try {
      var data = JSON.parse(raw); var cleaned = proCleanChecksummedSave(data); if (!cleaned) return { kind: 'corrupt' };
      return { kind: cleaned.campaignVersion === proCampaign.version ? 'ok' : 'incompatible', data: cleaned };
    } catch (e) { return { kind: 'corrupt' }; }
  }
  function campaignSaveInfo(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); var result = proReadSave(index); var data = result.data;
    return { slot: index, available: result.kind === 'ok' || result.kind === 'incompatible', compatible: result.kind === 'ok', corrupted: result.kind === 'corrupt', stageId: data ? data.stageId : '', journey: data ? boundedInteger(data.journey, 1, 1, 2) : 1 };
  }
  function loadCampaign(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); var result = proReadSave(index);
    if (result.kind !== 'ok' || !proCampaign.stages[result.data.stageId]) return false;
    var data = result.data;
    proCampaign.progress = proProgressFromSave(data);
    proCampaign.activeSlot = index;
    if (!proLoadStage(data.stageId, 'load')) return false;
    proCampaign.checkpoint = { id: proCampaign.progress.checkpointId || 'inicio', x: proCampaign.progress.checkpointX, y: proCampaign.progress.checkpointY }; restartAtCheckpoint(); return true;
  }
  function deleteCampaignSave(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots);
    try { window.localStorage.removeItem(proSaveKey(index)); return true; } catch (e) { warn('não consegui apagar o slot: ' + e); return false; }
  }
  function campaignProgress() { return proSavePayload(); }

  function resetCampaignProject() {
    fixedHooks.length = 0; proCampaign.listeners = Object.create(null); proCampaign.eventName = ''; proCampaign.eventPayload = null; proCampaign.stages = Object.create(null); proCampaign.stageOrder.length = 0; proCampaign.active = false; proCampaign.stage = null; proCampaign.stageId = ''; proCampaign.progress = null; proReleaseCampaignEntities(); proReplayRecording = null; proReplayPlaying = null; proLastReplay = null; proReleaseAllActions();
  }
  function resetCampaignGame() {
    proSim.accumulator = 0; proSim.tick = 0; proSim.alpha = 0; proSim.droppedSeconds = 0; proSim.randomState = proSim.seed; proReplayRecording = null; proReplayPlaying = null;
    if (proCampaign.id && proCampaign.stages[proCampaign.firstStage]) { proCampaign.progress = proNewProgress(); proLoadStage(proCampaign.firstStage, 'restart'); }
  }



  // Uma única arena usa o estado global "batalha", o menu, o diálogo e o
  // canvas. Portanto a exclusão é uma política do DOMÍNIO, compartilhada pelos
  // dois kits, e precisa acontecer antes de criar oponente/time ou rodar corpos.
  function canStartBattle(nextKit) {
    var activeKit = rpg.battle ? 'Kit RPG' : (pkm.battle ? 'Kit Monstrinhos' : '');
    if (!activeKit) return true;
    warn('já tem uma batalha do ' + activeKit + ' aberta — os kits não podem rodar juntos; termine antes de começar a do ' + nextKit);
    return false;
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
  //  3. O estado 'batalha' pausa o onUpdate do mundo, mas setState preserva toda
  //     a partida ao entrar e sair. Só restartGame chama a limpeza completa.
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
    grassAreas: [],                 // retângulos {x1,y1,x2,y2}; custo independe da área
    grassTiles: Object.create(null),// índice de peça -> true
    grassTileCount: 0,
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
    ensureImageLoaded(image); // a imagem da criatura (Pinta) carrega sozinha
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
    var k = text(name, '');
    // Os irmãos (pkmWild/pkmMove/pkmEvolve) avisam; este falhava calado.
    if (!pkm.species[k]) { warnOnce('pkmcatch:' + k, 'a criatura "' + k + '" não existe'); return; }
    var mult = { 'fácil': 1.6, facil: 1.6, normal: 1, 'difícil': 0.5, dificil: 0.5, 'raríssimo': 0.15, rarissimo: 0.15 };
    var lv = text(level, 'normal');
    var m = mult[lv];
    if (typeof m !== 'number') warnOnce('pkmcatchlv:' + lv, 'dificuldade "' + lv + '" não existe (use fácil, normal, difícil ou raríssimo)');
    pkm.catchDiff[k] = typeof m === 'number' ? m : 1;
  }

  // ---- os 3 níveis: espécie (dados) → indivíduo (o time) → lutador (efêmero) ----
  /** ⚠️ CÓPIA, nunca referência: é exatamente o bug da base (o gsap mutava o
   * objeto de dados e os monstros desciam 20px a CADA batalha). */
  function pkmSpawn(speciesName, level) {
    var sp = pkm.species[text(speciesName, '')];
    if (!sp) return null;
    var lv = boundedInteger(level, 5, 1, MAX_GAME_LEVEL);
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
    if (pkm.team.length >= MAX_PKM_TEAM) { rpgSay('Seu time está cheio!', ''); return; }
    pkm.team.push(ind);
    emit('monstrinho:ganhou', ind);
  }
  function pkmGiveBall(count, power) {
    var n = Math.max(1, Math.round(num(count, 5)));
    var p = Math.max(1, Math.min(100, num(power, 60)));
    var room = Math.max(0, MAX_CAPTURE_BALLS - pkm.balls.length);
    var total = Math.min(n, room);
    if (total < n) warnOnce('pkmball:limit', 'a mochila comporta até ' + MAX_CAPTURE_BALLS + ' bolas de captura');
    for (var i = 0; i < total; i++) pkm.balls.push({ power: p });
  }
  function pkmRestoreTeam(raw) {
    var restored = [];
    if (!Array.isArray(raw)) return restored;
    for (var i = 0; i < raw.length && restored.length < MAX_PKM_TEAM; i++) {
      var saved = raw[i];
      if (!saved || typeof saved !== 'object' || typeof saved.species !== 'string' || !pkm.species[saved.species]) continue;
      var level = boundedInteger(saved.level, 1, 1, MAX_GAME_LEVEL);
      var individual = pkmSpawn(saved.species, level);
      if (!individual) continue;
      individual.hpMax = Math.max(1, Math.min(MAX_SAFE_GAME_INTEGER, Math.round(num(saved.hpMax, individual.hpMax))));
      individual.hp = Math.max(0, Math.min(individual.hpMax, num(saved.hp, individual.hpMax)));
      individual.xp = Math.max(0, Math.min(PKM_XP_PER_LEVEL * individual.level - 1, num(saved.xp, 0)));
      restored.push(individual);
    }
    return restored;
  }
  function pkmRestoreBalls(raw) {
    var restored = [];
    if (!Array.isArray(raw)) return restored;
    for (var i = 0; i < raw.length && restored.length < MAX_CAPTURE_BALLS; i++) {
      var saved = raw[i];
      if (!saved || typeof saved !== 'object') continue;
      restored.push({ power: Math.max(1, Math.min(100, num(saved.power, 60))) });
    }
    return restored;
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
    ctxSave();
    var bx = num(x, 10), by = num(y, 10);
    for (var i = 0; i < pkm.team.length; i++) {
      var t = pkm.team[i];
      var yy = by + i * 26;
      ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
      ctx2d.fillRect(bx, yy, 168, 22);
      ctx2d.fillStyle = t.hp > 0 ? '#ffffff' : '#ff8080';
      ctx2d.font = '13px ' + _szGameUIFont;
      ctx2d.fillText(t.species + ' Nv' + t.level, bx + 6, yy + 15);
      var pct = Math.max(0, Math.min(1, t.hp / Math.max(1, t.hpMax)));
      ctx2d.fillStyle = '#333';
      ctx2d.fillRect(bx + 112, yy + 8, 50, 6);
      ctx2d.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#fbbf24' : '#ef4444';
      ctx2d.fillRect(bx + 112, yy + 8, Math.round(50 * pct), 6);
    }
    ctxRestore();
  }

  // ---- 🌿 Encontros (a grama alta) ----
  function pkmGrassCells(x1, y1, x2, y2) {
    var ax = Math.round(num(x1, 0)), ay = Math.round(num(y1, 0));
    var bx = Math.round(num(x2, 0)), by = Math.round(num(y2, 0));
    var left = Math.min(ax, bx), top = Math.min(ay, by);
    var right = Math.max(ax, bx), bottom = Math.max(ay, by);
    // Dentro de um mapa, coordenadas fora dele não podem ser pisadas. Cortar o
    // retângulo aqui preserva a intenção e impede números acidentais gigantes.
    if (rpg.mapCols > 0 && rpg.mapRows > 0) {
      left = Math.max(0, left); top = Math.max(0, top);
      right = Math.min(rpg.mapCols - 1, right); bottom = Math.min(rpg.mapRows - 1, bottom);
      if (left > right || top > bottom) return;
    }
    if (pkm.grassAreas.length >= MAX_PKM_GRASS_AREAS) {
      warnOnce('pkmgrass:limit', 'use até ' + MAX_PKM_GRASS_AREAS + ' áreas de grama por mapa');
      return;
    }
    pkm.grassAreas.push({ x1: left, y1: top, x2: right, y2: bottom });
  }
  function pkmInGrassArea(cx, cy) {
    for (var i = 0; i < pkm.grassAreas.length; i++) {
      var area = pkm.grassAreas[i];
      if (cx >= area.x1 && cx <= area.x2 && cy >= area.y1 && cy <= area.y2) return true;
    }
    return false;
  }
  function pkmGrassTiles(index, mapName) {
    var tile = boundedInteger(index, 0, 0, MAX_SAFE_GAME_INTEGER);
    if (!pkm.grassTiles[tile]) {
      if (pkm.grassTileCount >= MAX_PKM_GRASS_TILES) {
        warnOnce('pkmgrasstile:limit', 'use até ' + MAX_PKM_GRASS_TILES + ' peças de grama por mapa');
        return;
      }
      pkm.grassTiles[tile] = true;
      pkm.grassTileCount += 1;
    }
    pkm.grassMap = text(mapName, '');
  }
  function pkmWild(speciesName, min, max) {
    var k = text(speciesName, '');
    if (!pkm.species[k]) { warnOnce('pkmwild:' + k, 'a criatura "' + k + '" não existe'); return; }
    var a = boundedInteger(min, 3, 1, MAX_GAME_LEVEL);
    var b = boundedInteger(max, 6, 1, MAX_GAME_LEVEL);
    var lower = Math.min(a, b);
    var upper = Math.max(a, b);
    for (var i = 0; i < pkm.wild.length; i++) {
      if (pkm.wild[i].species === k) {
        pkm.wild[i].min = lower;
        pkm.wild[i].max = upper;
        return;
      }
    }
    if (pkm.wild.length >= MAX_PKM_WILD_ENTRIES) {
      warnOnce('pkmwild:limit', 'use até ' + MAX_PKM_WILD_ENTRIES + ' criaturas selvagens por mapa');
      return;
    }
    pkm.wild.push({ species: k, min: lower, max: upper });
  }
  function pkmEncounterRate(pct) { pkm.rate = Math.max(0, Math.min(100, num(pct, 20))); }
  /** ⭐ O sorteio é por PASSO, não por quadro. O herói do kit anda com o
   * rpgMoveGrid (ENCAIXA na célula), então "metade do corpo dentro" não existe —
   * e "20% por passo" é legível para criança de um jeito que "1% por quadro"
   * (= 45% por segundo a 60fps) nunca seria. É como o gênero funciona de verdade. */
  function pkmOnStepCell(cx, cy) {
    if (!pkm.wild.length || pkm.battle) return;
    var inGrass = pkmInGrassArea(cx, cy);
    if (!inGrass && pkm.grassMap) {
      var t = tileAt(pkm.grassMap, cx * tilePx + tilePx / 2, cy * tilePx + tilePx / 2);
      if (pkm.grassTiles[t]) inGrass = true;
    }
    if (!inGrass) return;
    if (!chance(pkm.rate)) return;
    var pick = pkm.wild[Math.floor(gameRandom() * pkm.wild.length)];
    var lv = pick.min + Math.floor(gameRandom() * (Math.max(pick.min, pick.max) - pick.min + 1));
    pkmBattleWild(pick.species, lv);
  }

  // ---- ⚔️ A batalha (criatura × criatura) ----
  function pkmPrepareBattle() {
    pkm.caught = false;
    rpg.battleWon = false;
    pkmEnsureFx();
  }
  function pkmBattleWild(speciesName, level) {
    if (!canStartBattle('Kit Monstrinhos')) return;
    var foe = pkmSpawn(speciesName, level);
    if (!foe) { warnOnce('pkmbw:' + text(speciesName, ''), 'a criatura "' + text(speciesName, '') + '" não existe'); return; }
    var mine = pkmFirstAlive();
    if (!mine) { rpgSay('Você não tem nenhum monstrinho em pé!', ''); return; }
    pkmPrepareBattle();
    pkm.battle = { mine: mine, foe: foe, kind: 'selvagem', phase: 'abrindo', t: 0, mineF: null, foeF: null };
    flashScreen('#ffffff', 2);
    setState('batalha');
    emit('monstrinho:apareceu', foe);
  }
  function pkmBattleTrainer(name, fn) {
    if (typeof fn !== 'function') return;
    if (!canStartBattle('Kit Monstrinhos')) return;
    var team = [];
    var previousList = pkmTrainerList;
    pkmTrainerList = team;
    try { fn(); } catch (e) { warn('erro no time do treinador: ' + e); }
    finally { pkmTrainerList = previousList; }
    if (!team.length) { warn('o treinador "' + text(name, '') + '" não tem nenhuma criatura'); return; }
    var mine = pkmFirstAlive();
    if (!mine) { rpgSay('Você não tem nenhum monstrinho em pé!', ''); return; }
    pkmPrepareBattle();
    pkm.battle = {
      mine: mine, foe: team[0], kind: 'treinador', trainer: text(name, ''),
      foes: team.slice(), foeIndex: 0, phase: 'abrindo', t: 0, mineF: null, foeF: null
    };
    flashScreen('#ffffff', 2);
    setState('batalha');
  }
  // null fora do callback-construtor: impede que um bloco-filho solto acumule
  // criaturas invisíveis para uma batalha futura.
  var pkmTrainerList = null;
  function pkmTrainerCreature(speciesName, level) {
    if (!pkmTrainerList) {
      warnOnce('pkmtrainerchild', '"Criatura do treinador" só pode ser usado dentro de "Batalha contra treinador"');
      return;
    }
    if (pkmTrainerList.length >= MAX_PKM_TEAM) {
      warnOnce('pkmtrainerfull', 'o time do treinador pode ter no máximo ' + MAX_PKM_TEAM + ' criaturas');
      return;
    }
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
  /** forced = a criatura desmaiou: NÃO pode voltar (lutar com HP 0 não existe). */
  function pkmSwitchMenu(forced) {
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
    if (!forced) opts.push({ label: '← Voltar', fn: pkmMainMenu });
    rpg.menu = {
      title: forced ? 'Quem vai lutar agora?' : 'Trocar por quem?',
      options: opts,
      index: 0
    };
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
    var vary = 0.85 + gameRandom() * 0.3;
    // ⭐ "Não teve efeito!" tem que tirar ZERO. O piso de 1 vale para o golpe fraco
    // (senão a defesa alta trava a batalha para sempre), mas quando a vantagem é 0 a
    // fala promete imunidade — e tirar 1 mesmo assim é mentir para a criança.
    var dmg = mult === 0 ? 0 : Math.max(1, Math.round(base * mult * vary - pkmStat(dfd, 'def') / 2));
    var txt = atk.species + ' usou ' + m.name + '!';
    if (mult > 1) txt += ' É SUPER EFETIVO!';
    else if (mult === 0) txt += ' Não teve efeito!';
    else if (mult < 1) txt += ' Não foi muito eficaz...';
    rpgSay(txt, '');
    b.pending = { dmg: dmg, target: dfd, targetF: dfdF, isMine: isMine };
    // A coreografia: investida = o lutador corre e volta; os outros = piscar.
    if (m.fx === 'investida' && atkF && dfdF) {
      var ox = atkF.x;
      tweenToQuiet(atkF, dfdF.x + (isMine ? -60 : 60), atkF.y, 0.18);
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
      // ⭐ O piscar do acerto reusa os i-frames, que o drawEntity JÁ desenha.
      // Antes eram dois fadeTo em sequência (40% e volta a 100%) — mas o pushTween
      // DEDUPA por (entidade, propriedade): o 2º apagava o 1º ANTES de ele rodar e
      // lia "de: opacity = 1", então o tween ia de 1 para 1 e nada piscava. Sobrava
      // só o tremor. (O pushTween é substitutivo por design; quem quer sequência
      // não pode empilhar na mesma propriedade.)
      p.targetF._iFrames = 0.3;
    }
    b.pending = null;
    if (b.returnTo) { tweenToQuiet(b.returnTo.f, b.returnTo.x, b.returnTo.y, 0.15); b.returnTo = null; }
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
      if (pkm.team.length >= MAX_PKM_TEAM) { rpgSay('Seu time está cheio!', ''); pkm.balls.push(ball); b.next = 'menu'; return; }
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
    var mv = sp.moves.length ? pkm.moves[sp.moves[Math.floor(gameRandom() * sp.moves.length)]] : null;
    // Espécie sem golpe ensinado (o esquecimento nº 1 previsível). 'menu' é fase de
    // REPOUSO: pôr a fase sem ABRIR o menu congelava a batalha para sempre.
    if (!mv) {
      warnOnce('pkm-sem-golpe-' + b.foe.species, 'o ' + b.foe.species + ' não tem nenhum golpe: use "Ensinar o golpe"');
      pkmEnterPhase('menu');
      return;
    }
    pkmUseMove(mv, false);
  }
  function pkmCheckFaint() {
    var b = pkm.battle;
    if (b.foe.hp <= 0) {
      rpgSay(b.foe.species + ' desmaiou!', '');
      if (b.foeF) { tweenToQuiet(b.foeF, b.foeF.x, b.foeF.y + 20, 0.4); fadeToQuiet(b.foeF, 0, 0.4); }
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
      if (b.mineF) { tweenToQuiet(b.mineF, b.mineF.x, b.mineF.y + 20, 0.4); fadeToQuiet(b.mineF, 0, 0.4); }
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
    b.mine.level = boundedInteger(b.mine.level, 1, 1, MAX_GAME_LEVEL);
    b.mine.xp = Math.min(MAX_SAFE_GAME_INTEGER, Math.max(0, num(b.mine.xp, 0)) + Math.round(xp));
    rpgSay(b.mine.species + ' ganhou ' + Math.round(xp) + ' de experiência!', '');
    while (b.mine.level < MAX_GAME_LEVEL && b.mine.xp >= PKM_XP_PER_LEVEL * b.mine.level) {
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
    if (b.mine.level >= MAX_GAME_LEVEL) {
      b.mine.xp = Math.min(b.mine.xp, PKM_XP_PER_LEVEL * b.mine.level - 1);
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
    // Os lutadores da batalha não passam pelo stepSystems (que é quem decai os
    // i-frames de todo mundo), então o piscar do acerto decai aqui — senão ficaria
    // piscando para sempre.
    if (b.mineF && b.mineF._iFrames > 0) b.mineF._iFrames = Math.max(0, b.mineF._iFrames - dt);
    if (b.foeF && b.foeF._iFrames > 0) b.foeF._iFrames = Math.max(0, b.foeF._iFrames - dt);
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
      pkmEnterPhase(b.next);
      return;
    }
    if (b.phase === 'anim') {
      if (b.t > 0.25 && b.pending) pkmApplyPending();
      if (rpg.dialog || b.t < 0.5) return;
      if (pkmCheckFaint()) { b.phase = 'espera-fala'; return; }
      pkmEnterPhase(b.next);
      return;
    }
    if (b.phase === 'inimigo') { pkmEnemyTurn(); return; }
    if (b.phase === 'fim') { pkmEndBattle(); return; }
    // Rede: 'menu' e 'trocar-forcado' são fases de REPOUSO dirigidas pelo menu — se
    // ficarem sem menu aberto, ninguém as move e a batalha congela (só recarregando).
    // Era exatamente o softlock do desmaio. Reabrir é sempre melhor que travar.
    if (!rpg.menu && !rpg.dialog) {
      if (b.phase === 'menu') pkmMainMenu();
      else if (b.phase === 'trocar-forcado') pkmSwitchMenu(true);
    }
  }
  /**
   * Entrar numa fase = despachar o que ela precisa para andar.
   * ⭐ Isto estava DUPLICADO em 'espera-fala' (que só sabia despachar 'menu') e em
   * 'anim' (que sabia as quatro), e as duas cópias divergiram: o desmaio passa por
   * 'espera-fala', então a fase virava 'trocar-forcado' e NINGUÉM abria o menu de
   * troca — a criança perdia a criatura e o jogo morria. Um dispatcher só, um
   * comportamento só.
   */
  function pkmEnterPhase(ph) {
    var b = pkm.battle;
    b.phase = ph || 'menu';
    b.t = 0;
    if (b.phase === 'menu') pkmMainMenu();
    else if (b.phase === 'inimigo') pkmEnemyTurn();
    else if (b.phase === 'fim') pkmEndBattle();
    else if (b.phase === 'trocar-forcado') pkmSwitchMenu(true);
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
    drawEffects();
  }
  function pkmBar(ind, x, y) {
    ctxSave();
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(x, y, 240, 54);
    ctx2d.strokeStyle = '#111';
    ctx2d.lineWidth = 3;
    ctx2d.strokeRect(x, y, 240, 54);
    ctx2d.fillStyle = '#111';
    ctx2d.font = '15px ' + _szGameUIFont;
    ctx2d.fillText(ind.species + '  Nv' + ind.level, x + 10, y + 22);
    var pct = Math.max(0, Math.min(1, ind.hp / Math.max(1, ind.hpMax)));
    ctx2d.fillStyle = '#ccc';
    ctx2d.fillRect(x + 10, y + 32, 220, 8);
    ctx2d.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#fbbf24' : '#ef4444';
    ctx2d.fillRect(x + 10, y + 32, Math.round(220 * pct), 8);
    ctxRestore();
  }
  function pkmCaught() { return pkm.caught; }
  function pkmNewGame() {
    pkm.team = [];
    pkm.balls = [];
    pkm.battle = null;
    pkm.caught = false;
    pkmTrainerList = null;
    // ⚠️ TODO estado de jogo entra no reset (é a 3ª vez que esta linha é a causa):
    // sem isto, "Jogar de novo" recomeçava com a tabela de selvagens acumulada.
    pkm.wild = [];
    pkm.grassAreas = [];
    pkm.grassTiles = {};
    pkm.grassTileCount = 0;
    pkm.grassMap = '';
  }


  // ==========================================================================
  // KIT LUTA - o atalho do genero (Street Fighter / Mortal Kombat)
  // ==========================================================================
  // A extensao GERAL ja faz luta "na unha" (personagem + gravidade + pulo +
  // attackFacing + didHit + hurt + knockback). Este kit e o ATALHO: junta tudo num
  // bloco so e acrescenta o que so existe em jogo de luta - rounds, defesa,
  // especial, combo, e um oponente de computador.
  //
  // O QUE ELE REUSA (nao duplica): applyGravity + o feel do pulo (o setJumpFeel
  // regula coyote e gravidade da luta de graca; a FORCA do pulo e a constante
  // LUTA_JUMP do kit), attackFacing/didHit/swingBox (a caixa ja vira com a
  // direcao e ja tem a trava de 1 acerto por golpe), setSwingWindow (o recuo),
  // setEntityState/autoAnimate (a trava de animacao), hurt/knockback/isInvincible,
  // drawBar, face, setState + as telas prontas, on/emit, cameraShake, defineEffect.
  //
  // O QUE ELE RE-FAZ, e por que: o moveWithCustomKeys e top-down (mexe no y direto,
  // sem gravidade nem pulo) e o platformerHero tem tecla FIXA - nenhum dos dois faz
  // dois jogadores no mesmo teclado num jogo de lado. Por isso o Lutador recebe as
  // teclas dele. E o UNICO ponto em que o kit re-faz algo do geral.
  var luta = null; // null = ninguem declarou luta (tudo aqui vira no-op)

  // A TABELA. E a alma do kit: a crianca responde UMA PALAVRA (rapido/medio/pesado)
  // e o motor traduz em cinco numeros que ela nunca teria como responder.
  // ⭐ O COMBO SAI DAQUI, DE GRACA: "pesado" trava o outro 0,45 s e recupera em
  // 0,42 s -> sobram 0,03 s e da p/ emendar um "rapido". A crianca DESCOBRE que
  // chute->soco encaixa. Combo nao e bloco: e consequencia da tabela.
  var LUTA_SPEEDS = {
    'rápido': { start: 0.08, active: 0.06, recover: 0.16, stun: 0.18, push: 120, down: false },
    rapido: { start: 0.08, active: 0.06, recover: 0.16, stun: 0.18, push: 120, down: false },
    'médio': { start: 0.14, active: 0.08, recover: 0.26, stun: 0.28, push: 220, down: false },
    medio: { start: 0.14, active: 0.08, recover: 0.26, stun: 0.28, push: 220, down: false },
    pesado: { start: 0.26, active: 0.1, recover: 0.42, stun: 0.45, push: 420, down: true }
  };
  var LUTA_AI = {
    'fácil': { think: 0.6, approach: 0.6, guard: 10, jump: 5, special: 20 },
    facil: { think: 0.6, approach: 0.6, guard: 10, jump: 5, special: 20 },
    normal: { think: 0.35, approach: 1, guard: 45, jump: 15, special: 60 },
    'difícil': { think: 0.18, approach: 1, guard: 85, jump: 25, special: 95 },
    dificil: { think: 0.18, approach: 1, guard: 85, jump: 25, special: 95 }
  };
  var LUTA_GUARD_CHIP = 0.15;  // defendeu: 15% do dano passa de raspao
  var LUTA_COMBO_DECAY = 0.1;  // cada golpe do combo tira 10% do dano (min 30%)
  // Forca do pulo do lutador, FIXA do kit (o "Regular o pulo" ajusta coyote e
  // gravidade da luta - a gravidade muda a ALTURA do arco; a forca nao e
  // resposta da crianca).
  var LUTA_JUMP = 700;

  function lutaSide(who) {
    if (!luta) return null;
    if (luta.p1.c === who) return luta.p1;
    if (luta.p2.c === who) return luta.p2;
    return null;
  }
  // Golpes são DEFINIÇÕES do personagem, portanto podem (e naturalmente vão)
  // aparecer antes do bloco "Luta de", que inicia uma partida concreta.
  function lutaStoredMoves(c, create) {
    if (!c || typeof c !== 'object') return null;
    if (!c._lutaMoves && create) c._lutaMoves = Object.create(null);
    return c._lutaMoves || null;
  }
  function lutaBlank(c) {
    var moves = Object.create(null);
    var stored = lutaStoredMoves(c, false);
    if (stored) for (var k in stored) moves[k] = stored[k];
    return {
      c: c, guard: false, stun: 0, combo: 0, comboT: 0, special: 0, wins: 0,
      homeX: num(c.x, 0), homeY: num(c.y, 0), moves: moves, ai: null, aiT: 0
    };
  }
  /**
   * Casa DOIS personagens numa luta. Vem DEPOIS do "Posicionar o personagem": e
   * daqui que sai o lugar de renascer a cada round (o respawn geral nao serve - o
   * _bornX nasce 0 no createCharacter e o placeCharacter nao o atualiza).
   */
  function lutaMatch(a, b, rounds, secs) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
      warn('"Luta de" precisa de DOIS personagens');
      return;
    }
    if (a === b) { warn('"Luta de" precisa de dois personagens DIFERENTES'); return; }
    luta = {
      p1: lutaBlank(a), p2: lutaBlank(b),
      rounds: boundedInteger(rounds, 3, 1, MAX_LUTA_ROUNDS),
      secs: Math.max(5, num(secs, 60)),
      round: 1, t: 0, phase: 'anuncio', phaseT: 0, winner: '', roundWinner: ''
    };
  }
  function lutaOther(side) { return side === luta.p1 ? luta.p2 : luta.p1; }
  /** Golpe data-driven. O 3o argumento e a PALAVRA; os tempos sao do motor. */
  function lutaMove(name, who, speed, dmg, range, pierce, special) {
    var k = text(name, '');
    if (!k) { warn('o golpe precisa de um nome'); return; }
    var stored = lutaStoredMoves(who, true);
    if (!stored) { warn('o golpe precisa de um personagem'); return; }
    var sp = LUTA_SPEEDS[text(speed, 'médio')];
    if (!sp) { warnOnce('lutasp:' + text(speed, ''), 'velocidade "' + text(speed, '') + '" não existe (use rápido, médio ou pesado)'); return; }
    var move = {
      name: k, sp: sp,
      dmg: Math.max(1, num(dmg, 10)),
      range: Math.max(4, num(range, 50)),
      pierce: !!pierce, special: !!special,
      from: 0, to: 0, hasAnim: false
    };
    stored[k] = move;
    var side = lutaSide(who);
    if (side) side.moves[k] = move;
  }
  /** A animacao do golpe: os quadros. O fps e ESTICADO p/ durar exatamente o golpe. */
  function lutaMoveAnim(name, who, from, to) {
    var side = lutaSide(who);
    var moves = side ? side.moves : lutaStoredMoves(who, false);
    var mv = moves && moves[text(name, '')];
    if (!mv) { warnOnce('lutaanim:' + text(name, ''), 'o golpe "' + text(name, '') + '" não existe'); return; }
    mv.from = Math.max(0, Math.floor(num(from, 0)));
    mv.to = Math.max(mv.from, Math.floor(num(to, 0)));
    mv.hasAnim = true;
  }
  function lutaDur(mv) { return mv.sp.start + mv.sp.active + mv.sp.recover; }
  /** Dar o golpe. Trava a animacao, arma a caixa e a janela, gasta o especial. */
  function lutaAttack(who, name) {
    var side = lutaSide(who);
    if (!side) { warnOnce('lutaatk', 'use "Luta de" ANTES'); return; }
    if (luta.phase !== 'lutando') return;
    if (side.stun > 0) return;             // travado pelo dano
    if (num(who._swingT, 0) > 0) return;   // ja golpeando
    var mv = side.moves[text(name, '')];
    if (!mv) { warnOnce('lutaatk:' + text(name, ''), 'o golpe "' + text(name, '') + '" não existe — crie com "Golpe"'); return; }
    if (mv.special && side.special < 100) return; // barra vazia: nao sai
    if (mv.special) side.special = 0;
    side.guard = false;
    var dur = lutaDur(mv);
    attackFacing(who, mv.range, dur);
    setSwingWindow(who, mv.sp.start, mv.sp.active);
    side.pending = mv;
    if (mv.hasAnim) {
      // fps esticado: o golpe manda, a animacao obedece (quadro pulado nao quebra)
      stateAnim(who, 'golpe', mv.from, mv.to, Math.max(1, (mv.to - mv.from + 1) / dur), true);
    }
  }
  /**
   * O lutador tudo-em-um. DOIS blocos = dois jogadores, cada um com as teclas dele.
   */
  function lutaFighter(who, left, right, jump, crouch, guardKey, dt) {
    var side = lutaSide(who);
    if (!side) { warnOnce('lutafighter', 'use "Luta de" ANTES do "Lutador"'); return; }
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    side.stun = Math.max(0, side.stun - d);
    if (side.comboT > 0) { side.comboT -= d; if (side.comboT <= 0) side.combo = 0; }
    // 1) portao de FASE: fora de "lutando" os bonecos congelam (mas caem).
    var podeAgir = luta.phase === 'lutando' && side.stun <= 0 && num(who._swingT, 0) <= 0;
    if (who.onGround) who._coyoteT = jumpFeel.coyote;
    else who._coyoteT = Math.max(0, num(who._coyoteT, 0) - d);
    applyGravity(who, plat.gravity, d);
    // 2) virar de frente - SO na horizontal. ⭐ O face() geral usa o eixo DOMINANTE:
    //    o outro pula por cima e o lutador vira p/ CIMA, e a caixa de golpe dispara
    //    para o ceu. Num jogo de luta isso nunca pode acontecer.
    var alvo = lutaOther(side).c;
    if (num(who._swingT, 0) <= 0) {
      var virarEsq = centerX(alvo) < centerX(who);
      who._facingDir = virarEsq ? 'left' : 'right';
      who._facingLeft = virarEsq;
    }
    side.guard = false;
    if (!podeAgir) { who.vx = 0; moveByVelocity(who, d); return; }
    // 3) defender: trava o andar e reduz o dano
    if (keys[normKey(guardKey)]) { side.guard = true; who.vx = 0; moveByVelocity(who, d); return; }
    // 4) agachar: encolhe (a aparencia vetorial espreme sozinha - o drawEntity
    //    escala pelo w/h), nao anda, nao pula
    var agachado = keys[normKey(crouch)] && who.onGround;
    if (!num(who._lutaH, 0)) who._lutaH = num(who.h, 0);
    who.h = agachado ? Math.round(num(who._lutaH, 0) * 0.6) : num(who._lutaH, 0);
    if (agachado) { who.vx = 0; moveByVelocity(who, d); return; }
    // 5) andar
    var dx = 0;
    if (keys[normKey(left)]) dx -= 1;
    if (keys[normKey(right)]) dx += 1;
    who.vx = dx * num(who.speed, 260);
    // 6) pular, com o feel do bloco GERAL "Regular o pulo"
    if (justPressed[normKey(jump)] && num(who._coyoteT, 0) > 0) {
      who.vy = -LUTA_JUMP;
      who.onGround = false;
      who._coyoteT = 0;
    }
    moveByVelocity(who, d);
  }
  function lutaAI(who, level) {
    var side = lutaSide(who);
    if (!side) { warnOnce('lutaai', 'use "Luta de" ANTES'); return; }
    var cfg = LUTA_AI[text(level, 'normal')];
    if (!cfg) { warnOnce('lutaailv:' + text(level, ''), 'dificuldade "' + text(level, '') + '" não existe (use fácil, normal ou difícil)'); return; }
    side.ai = cfg;
  }
  function lutaStepAI(side, dt) {
    var cfg = side.ai;
    var who = side.c;
    var foe = lutaOther(side);
    var alvo = foe.c;
    side.stun = Math.max(0, side.stun - dt);
    if (side.comboT > 0) { side.comboT -= dt; if (side.comboT <= 0) side.combo = 0; }
    applyGravity(who, plat.gravity, dt);
    var virarEsq = centerX(alvo) < centerX(who);
    if (num(who._swingT, 0) <= 0) { who._facingDir = virarEsq ? 'left' : 'right'; who._facingLeft = virarEsq; }
    side.guard = false;
    if (luta.phase !== 'lutando' || side.stun > 0 || num(who._swingT, 0) > 0) {
      who.vx = 0; moveByVelocity(who, dt); return;
    }
    side.aiT -= dt;
    var dist = Math.abs(centerX(alvo) - centerX(who));
    // o alcance do maior golpe dela
    var alcance = 60;
    for (var k in side.moves) alcance = Math.max(alcance, side.moves[k].range);
    if (side.aiT <= 0) {
      side.aiT = cfg.think;
      // defende: mais quando o outro esta golpeando
      var perigo = num(alvo._swingT, 0) > 0 && dist < alcance + 30;
      side.aiDecision = 'aproximar';
      if (perigo && chance(cfg.guard)) side.aiDecision = 'defender';
      else if (dist <= alcance) side.aiDecision = 'atacar';
      else if (chance(cfg.jump)) side.aiDecision = 'pular';
    }
    if (side.aiDecision === 'defender') { side.guard = true; who.vx = 0; moveByVelocity(who, dt); return; }
    if (side.aiDecision === 'atacar' && dist <= alcance) {
      // o especial quando a barra enche; senao o melhor golpe que alcanca
      var esc = null;
      for (var m in side.moves) {
        var mv = side.moves[m];
        if (mv.range < dist) continue;
        if (mv.special) { if (side.special >= 100 && chance(cfg.special)) { esc = mv; break; } continue; }
        if (!esc || mv.dmg > esc.dmg) esc = mv;
      }
      if (esc) { lutaAttack(who, esc.name); who.vx = 0; moveByVelocity(who, dt); return; }
    }
    if (side.aiDecision === 'pular' && who.onGround) {
      who.vy = -LUTA_JUMP;
      who.onGround = false;
    }
    // o dificil MANTEM a distancia do golpe (recua se colar); os outros so vem
    var quer = (cfg.approach === 1 && dist < alcance * 0.6) ? -1 : (dist > alcance * 0.8 ? 1 : 0);
    var dir = virarEsq ? -1 : 1;
    who.vx = quer * dir * num(who.speed, 260) * (cfg.approach < 1 ? cfg.approach : 1);
    moveByVelocity(who, dt);
  }
  /** O acerto: dano com vantagem de combo, defesa, empurrao e trava. */
  function lutaHit(atacante, alvo) {
    var mv = atacante.pending;
    if (!mv) return;
    var dano = mv.dmg;
    // o dano do combo ESCALA p/ baixo: sem isto um combo de 8 mata e a dificuldade
    // da IA vira decoracao.
    if (atacante.combo > 0) dano *= Math.max(0.3, 1 - LUTA_COMBO_DECAY * atacante.combo);
    var defendeu = alvo.guard && !mv.pierce;
    if (defendeu) {
      dano *= LUTA_GUARD_CHIP;
      alvo.stun = 0.1;
      knockback(alvo.c, atacante.c, mv.sp.push / 2);
      emit('luta:defendeu', alvo.c);
    } else {
      alvo.stun = mv.sp.stun;
      knockback(alvo.c, atacante.c, mv.sp.push);
      atacante.combo += 1;
      atacante.comboT = mv.sp.stun + 0.15;
      // a barra enche batendo (+dano) e apanhando (+dano/2); defender NAO enche
      atacante.special = Math.min(100, atacante.special + dano);
      alvo.special = Math.min(100, alvo.special + dano / 2);
      if (mv.sp.down) { alvo.c.vy = -260; alvo.c.onGround = false; } // pesado DERRUBA
      emit('luta:acertou', alvo.c);
    }
    dano = Math.max(1, Math.round(dano));
    alvo.c.health = Math.max(0, num(alvo.c.health, 0) - dano);
    setEntityState(alvo.c, 'dano', defendeu ? 0.1 : mv.sp.stun);
    cameraShake(defendeu ? 3 : 6, 0.1);
  }
  function lutaRoundEnd(quem) {
    luta.roundWinner = quem;
    luta.phase = 'ko';
    luta.phaseT = 0;
    if (quem === 'jogador 1') luta.p1.wins += 1;
    else if (quem === 'jogador 2') luta.p2.wins += 1;
    var perdedor = quem === 'jogador 1' ? luta.p2 : quem === 'jogador 2' ? luta.p1 : null;
    if (perdedor) setEntityState(perdedor.c, 'morte', 2);
    emit('luta:ko', null);
  }
  function lutaNextRound() {
    var alvo = Math.floor(luta.rounds / 2) + 1;
    if (luta.p1.wins >= alvo || luta.p2.wins >= alvo || luta.round >= luta.rounds) {
      luta.winner = luta.p1.wins > luta.p2.wins ? 'jogador 1'
        : luta.p2.wins > luta.p1.wins ? 'jogador 2' : 'empate';
      // ⚠️ setState ANTES do emit (o padrao do setMission): assim o ouvinte da
      // crianca pode sobrescrever a tela sem ser atropelado.
      setState('fim');
      emit('luta:acabou', null);
      return;
    }
    luta.round += 1;
    luta.phase = 'anuncio';
    luta.phaseT = 0;
    luta.t = 0;
    var lados = [luta.p1, luta.p2];
    for (var i = 0; i < 2; i++) {
      var sd = lados[i];
      sd.c.health = num(sd.c.maxHealth, 100);
      sd.c.x = sd.homeX; sd.c.y = sd.homeY;
      // teleporte zera a varredura (regra do arquivo) - senao o collideGroup do
      // round seguinte varre o caminho morte->home e tromba num muro no meio.
      sd.c._prevX = sd.c.x; sd.c._prevY = sd.c.y;
      sd.c.vx = 0; sd.c.vy = 0;
      sd.stun = 0; sd.combo = 0; sd.guard = false;
      sd.c._swingT = 0;
      sd.c._state = ''; sd.c._stateUntil = 0;
      // o ESPECIAL fica de propósito: e por isso que o round 3 e o tenso.
    }
    emit('luta:round', null);
  }
  /** Um lado ataca, o outro defende (helper interno - nao entra na api). */
  function lutaHitPass(atk, dfd) {
    if (atk.pending && didHit(atk.c, dfd.c)) lutaHit(atk, dfd);
    if (num(atk.c._swingT, 0) <= 0) atk.pending = null;
  }
  /**
   * O passo da luta. ⭐ As fases vivem DENTRO do kit e travam so os lutadores.
   * Um estado 'round' proprio cairia no reset do setState e APAGARIA o jogo da
   * crianca a cada round (recolhe pools, zera playTime/checkpoint/tweens...).
   * Roda no stepSystems, entao o relogio do round pausa junto com o jogo de graca.
   */
  function stepLuta(dt) {
    if (!luta) return;
    luta.phaseT += dt;
    if (luta.phase === 'anuncio') {
      if (luta.phaseT >= 1.5) { luta.phase = 'lutando'; luta.phaseT = 0; luta.t = 0; }
      return;
    }
    if (luta.phase === 'ko') {
      if (luta.phaseT >= 2) lutaNextRound();
      return;
    }
    // fase 'lutando'
    luta.t += dt;
    if (luta.p1.ai) lutaStepAI(luta.p1, dt);
    if (luta.p2.ai) lutaStepAI(luta.p2, dt);
    // o acerto: a caixa do atacante contra o corpo do outro (2 chamadas fixas -
    // montar os pares num array alocava 3 arrays POR QUADRO a luta inteira)
    lutaHitPass(luta.p1, luta.p2);
    lutaHitPass(luta.p2, luta.p1);
    if (luta.p1.c.health <= 0) { lutaRoundEnd('jogador 2'); return; }
    if (luta.p2.c.health <= 0) { lutaRoundEnd('jogador 1'); return; }
    if (luta.t >= luta.secs) {
      // no tempo, mais vida vence; vida IGUAL = ninguem pontua e o round avanca
      var h1 = num(luta.p1.c.health, 0), h2 = num(luta.p2.c.health, 0);
      lutaRoundEnd(h1 > h2 ? 'jogador 1' : h2 > h1 ? 'jogador 2' : 'empate');
    }
  }
  function lutaWinner() { return luta ? text(luta.winner, '') : ''; }
  function lutaRoundNow() { return luta ? luta.round : 0; }
  function lutaWinsOf(who) { var sd = lutaSide(who); return sd ? sd.wins : 0; }
  function lutaComboOf(who) { var sd = lutaSide(who); return sd ? sd.combo : 0; }
  function lutaSpecialOf(who) { var sd = lutaSide(who); return sd ? Math.round(sd.special) : 0; }
  function lutaIsGuarding(who) { var sd = lutaSide(who); return !!(sd && sd.guard); }
  /** O placar. SEM argumentos de propósito: posicao/cor/tamanho das barras nao sao
   * resposta da crianca (todo jogo de luta tem barra em cima). Quem quiser
   * diferente ja tem "Desenhar a barra" + "a vida de" - o caminho na unha. */
  function lutaDrawHud() {
    if (!luta || !ctx2d) return;
    ctxSave();
    var W = config.w;
    var barW = W * 0.36;
    lutaBar(20, 20, barW, luta.p1, false);
    lutaBar(W - 20 - barW, 20, barW, luta.p2, true);
    // cronometro
    var falta = Math.max(0, Math.ceil(luta.secs - luta.t));
    ctx2d.fillStyle = '#000000';
    ctx2d.fillRect(W / 2 - 34, 16, 68, 42);
    ctx2d.fillStyle = '#ffffff';
    ctx2d.font = 'bold 28px ' + _szGameUIFont;
    ctx2d.textAlign = 'center';
    ctx2d.fillText(String(falta), W / 2, 47);
    // bolinhas de round ganho
    var winsNeeded = Math.floor(luta.rounds / 2) + 1;
    lutaDots(W / 2 - 46, 68, luta.p1.wins, winsNeeded, -1);
    lutaDots(W / 2 + 34, 68, luta.p2.wins, winsNeeded, 1);
    // o letreiro da fase
    var msg = '';
    if (luta.phase === 'anuncio') msg = 'ROUND ' + luta.round;
    else if (luta.phase === 'ko') {
      msg = luta.roundWinner === 'empate' ? 'EMPATE!' : (luta.t >= luta.secs ? 'TEMPO!' : 'K.O.!');
    }
    if (msg) {
      ctx2d.fillStyle = config.accent || '#ffffff';
      ctx2d.font = 'bold 56px ' + _szGameUIFont;
      ctx2d.fillText(msg, W / 2, config.h / 2);
    }
    ctx2d.textAlign = 'left';
    ctxRestore();
  }
  function lutaBar(x, y, w, side, direita) {
    var pct = Math.max(0, Math.min(1, num(side.c.health, 0) / Math.max(1, num(side.c.maxHealth, 100))));
    ctx2d.fillStyle = '#000000';
    ctx2d.fillRect(x - 3, y - 3, w + 6, 28);
    ctx2d.fillStyle = '#5a1111';
    ctx2d.fillRect(x, y, w, 22);
    ctx2d.fillStyle = pct > 0.3 ? '#e0b020' : '#e04040';
    var vw = Math.round(w * pct);
    ctx2d.fillRect(direita ? x + w - vw : x, y, vw, 22);
    // a barra de especial, fininha embaixo
    ctx2d.fillStyle = '#111111';
    ctx2d.fillRect(x, y + 25, w, 8);
    ctx2d.fillStyle = side.special >= 100 ? '#40e0ff' : '#2a7a90';
    var sw = Math.round(w * Math.max(0, Math.min(1, side.special / 100)));
    ctx2d.fillRect(direita ? x + w - sw : x, y + 25, sw, 8);
    if (side.combo > 1) {
      ctx2d.fillStyle = '#ffffff';
      ctx2d.font = 'bold 16px ' + _szGameUIFont;
      ctx2d.textAlign = direita ? 'right' : 'left';
      ctx2d.fillText(side.combo + ' seguidos!', direita ? x + w : x, y + 50);
      ctx2d.textAlign = 'left';
    }
  }
  function lutaDots(x, y, n, total, direction) {
    for (var i = 0; i < total; i++) {
      ctx2d.fillStyle = i < n ? '#e0b020' : 'rgba(255,255,255,0.25)';
      ctx2d.beginPath();
      ctx2d.arc(x + i * 16 * direction, y, 5, 0, Math.PI * 2);
      ctx2d.fill();
    }
  }
  function lutaNewGame() { luta = null; }

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
  /**
   * ⭐ Regular o RECUO e a JANELA ATIVA do golpe (em SEGUNDOS).
   *
   * Sem isto o didHit vale desde o 1º quadro do golpe: quem aperta primeiro SEMPRE
   * ganha, e aí não há leitura, não há espaçamento, não há punir o golpe errado —
   * não há jogo de luta (nem espadada de Zelda que se possa desviar).
   *
   * ⚠️ Em SEGUNDOS de propósito, NÃO no "quadro N da animação". O jeito da base de
   * luta ("só acerta em framesCurrent === 4") quebra sozinho: um quadro pulado num
   * computador lento = o golpe NUNCA acerta. Aqui a mecânica manda e a animação é
   * esticada para caber nela (ver stateAnim), então pular quadro não quebra nada.
   *
   * Padrão 0/0 = o comportamento de sempre (a caixa vale o golpe inteiro).
   */
  function setSwingWindow(who, start, active) {
    if (!who || typeof who !== 'object') return;
    who._swingStart = Math.max(0, num(start, 0));
    who._swingActive = Math.max(0, num(active, 0));
  }
  /** true enquanto a caixa de golpe MACHUCA (dentro da janela ativa). */
  function inSwingWindow(who) {
    if (!(num(who._swingT, 0) > 0)) return false;
    var act = num(who._swingActive, 0);
    if (!(act > 0)) return true; // sem janela declarada: o golpe inteiro machuca
    var el = num(who._swingDur, 0) - num(who._swingT, 0); // quanto já correu
    var ini = num(who._swingStart, 0);
    return el >= ini && el <= ini + act;
  }
  function attackFacing(who, range, duration) {
    if (!who || typeof who !== 'object') return;
    if (num(who._swingT, 0) > 0) return; // já golpeando: espera o golpe acabar
    who._swingRange = Math.max(1, num(range, 40));
    who._swingDur = Math.max(0.05, num(duration, 0.3));
    who._swingT = who._swingDur;
    who._swingId = ++swingId; // marca este golpe (trava de 1 acerto por alvo)
    if (swinging.indexOf(who) === -1) swinging.push(who);
    // A animação de golpe trava sozinha: quem usa só os blocos GERAIS de ação já
    // ganha a trava sem saber que ela existe (ver autoAnimate).
    setEntityState(who, 'golpe', who._swingDur);
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
    if (!inSwingWindow(who)) return false; // não está golpeando, ou está no recuo
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
      var a = gameRandom() * Math.PI * 2;
      var dist = Math.sqrt(gameRandom()) * r; // distribuição uniforme no disco
      who._patrolTX = homeX + Math.cos(a) * dist;
      who._patrolTY = homeY + Math.sin(a) * dist;
      who._patrolTimer = 1 + gameRandom() * 1.5;
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

  function drawHealthBar(who, max) {
    if (!ctx2d || !who || typeof who !== 'object') return;
    // 0 (ou vazio) = automático: usa a vida cheia do próprio personagem/molde
    // (P24 usa data.health — assim a barra do molde de vida 20 mostra 20/20).
    var full = num(max, 0);
    if (full <= 0) full = num(who.maxHealth, 100);
    if (full <= 0) return;
    var pct = Math.max(0, Math.min(1, num(who.health, full) / full));
    if (_spriteScene.decorate(who, function (box) {
      var scale = box.w / who.w, y = box.y - 8 * scale;
      ctx2d.fillStyle = 'rgba(0,0,0,0.6)'; ctx2d.fillRect(box.x, y, box.w, 4 * scale);
      ctx2d.fillStyle = '#ff5f6d'; ctx2d.fillRect(box.x, y, box.w * pct, 4 * scale);
    })) return;
    var x = num(who.x, 0), y = num(who.y, 0) - 8, w = num(who.w, 0);
    ctx2d.fillStyle = 'rgba(0,0,0,0.6)';
    ctx2d.fillRect(x, y, w, 4);
    ctx2d.fillStyle = '#ff5f6d';
    ctx2d.fillRect(x, y, Math.ceil(w * pct), 4);
  }
  // ---- ❤️ HUD de corações ----
  function heartPath(cx, cy, s) {
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy + s * 0.3);
    ctx2d.lineTo(cx - s * 0.5, cy - s * 0.15);
    ctx2d.arc(cx - s * 0.25, cy - s * 0.15, s * 0.25, Math.PI, 0);
    ctx2d.arc(cx + s * 0.25, cy - s * 0.15, s * 0.25, Math.PI, 0);
    ctx2d.lineTo(cx, cy + s * 0.3);
    ctx2d.closePath();
  }
  function drawHearts(current, max, x, y) {
    if (!ctx2d) return;
    var requested = Math.max(0, Math.floor(num(max, 3)));
    var total = Math.min(MAX_HUD_HEARTS, requested);
    if (requested > MAX_HUD_HEARTS) warnOnce('hearts:limit', 'o HUD mostra no máximo ' + MAX_HUD_HEARTS + ' corações');
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

  // ---- ✨ Partículas e feedback visual ----
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
      if (particles.active.length >= MAX_PARTICLES) break;
      var p = particles.free.pop() || {};
      var ang = gameRandom() * Math.PI * 2;
      var sp = e.speed * (0.4 + gameRandom() * 0.6);
      p.x = num(x, 0); p.y = num(y, 0);
      p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
      p.life = e.life; p.max = e.life; p.size = e.size; p.color = e.color; p.gravity = e.gravity;
      particles.active.push(p);
    }
  }
  function stepParticles(dt) {
    for (var i = particles.active.length - 1; i >= 0; i--) {
      var p = particles.active[i];
      p.life -= dt;
      if (p.life <= 0) {
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
  function floatText(txt, x, y, color, size) {
    if (floaties.active.length >= MAX_FLOATIES) {
      warnOnce('floaties', 'muitos textos flutuantes de uma vez (teto ' + MAX_FLOATIES + ')');
      return;
    }
    var f = floaties.free.pop() || {};
    f.text = text(txt, '');
    f.x = num(x, 0); f.y = num(y, 0); f.t = 0; f.life = 0.75;
    f.color = text(color, '#ffffff');
    f.size = Math.max(6, num(size, 24));
    floaties.active.push(f);
  }
  function stepFloaties(dt) {
    for (var i = floaties.active.length - 1; i >= 0; i--) {
      var f = floaties.active[i];
      f.t += dt;
      f.y -= (40 / 0.75) * dt;
      if (f.t >= f.life) {
        var last = floaties.active.length - 1;
        floaties.active[i] = floaties.active[last];
        floaties.active.pop();
        floaties.free.push(f);
      }
    }
  }
  function drawFloaties() {
    if (!ctx2d || !floaties.active.length) return;
    var prev = 1;
    try { prev = ctx2d.globalAlpha; } catch (e) {}
    for (var i = 0; i < floaties.active.length; i++) {
      var f = floaties.active[i];
      try { ctx2d.globalAlpha = Math.max(0, 1 - f.t / f.life); } catch (e) {}
      ctx2d.fillStyle = f.color;
      var fs = Math.round(f.size);
      ctx2d.font = floatieFonts[fs] || (floatieFonts[fs] = 'bold ' + fs + 'px ' + _szGameUIFont);
      ctx2d.fillText(f.text, f.x, f.y);
    }
    try { ctx2d.globalAlpha = prev; } catch (e) {}
  }
  function shockwave(x, y, radius, seconds, color) {
    if (shockwaves.active.length >= MAX_SHOCKWAVES) {
      warnOnce('shockwaves', 'muitas ondas de choque de uma vez (teto ' + MAX_SHOCKWAVES + ')');
      return;
    }
    var s = shockwaves.free.pop() || {};
    s.x = num(x, 0); s.y = num(y, 0); s.r = Math.max(1, num(radius, 200)); s.t = 0;
    s.secs = Math.max(0.05, num(seconds, 0.4));
    s.color = text(color, '#ffffff');
    shockwaves.active.push(s);
  }
  function stepShockwaves(dt) {
    for (var i = shockwaves.active.length - 1; i >= 0; i--) {
      var s = shockwaves.active[i];
      s.t += dt;
      if (s.t >= s.secs) {
        var last = shockwaves.active.length - 1;
        shockwaves.active[i] = shockwaves.active[last];
        shockwaves.active.pop();
        shockwaves.free.push(s);
      }
    }
  }
  function drawShockwaves() {
    if (!ctx2d || !shockwaves.active.length) return;
    var prev = 1;
    try { prev = ctx2d.globalAlpha; } catch (e) {}
    for (var i = 0; i < shockwaves.active.length; i++) {
      var s = shockwaves.active[i];
      var k = Math.min(1, s.t / s.secs);
      try { ctx2d.globalAlpha = 0.9 * (1 - k); } catch (e) {}
      ctx2d.fillStyle = s.color;
      ctx2d.beginPath();
      try { ctx2d.arc(s.x, s.y, Math.max(1, s.r * k), 0, Math.PI * 2); ctx2d.fill(); } catch (e) {}
    }
    try { ctx2d.globalAlpha = prev; } catch (e) {}
  }
  function trailOn(who, color, size, rate, life) {
    if (!who || typeof who !== 'object') return;
    if (!who._trailOn) trailed.push(who);
    who._trailOn = true;
    who._trailColor = text(color, '#ffffff');
    who._trailSize = Math.max(1, num(size, 3));
    who._trailRate = Math.max(1, Math.min(60, num(rate, 30)));
    who._trailLife = Math.max(0.05, Math.min(3, num(life, 0.4)));
  }
  function trailOff(who) { if (who && typeof who === 'object') who._trailOn = false; }
  function stepTrails(dt) {
    for (var i = trailed.length - 1; i >= 0; i--) {
      var e = trailed[i];
      if (!e || e._trailOn !== true || e._active === false) {
        if (e) e._trailOn = false;
        trailed[i] = trailed[trailed.length - 1];
        trailed.pop();
        continue;
      }
      if (e._trailFrame === frameCount) continue;
      e._trailFrame = frameCount;
      e._trailAcc = num(e._trailAcc, 0) + e._trailRate * dt;
      while (e._trailAcc >= 1) {
        e._trailAcc -= 1;
        if (particles.active.length >= MAX_PARTICLES) { e._trailAcc = 0; break; }
        var p = particles.free.pop() || {};
        p.x = centerX(e) + (gameRandom() - 0.5) * e.w * 0.3;
        p.y = centerY(e) + (gameRandom() - 0.5) * e.h * 0.3;
        p.vx = (gameRandom() - 0.5) * 30; p.vy = (gameRandom() - 0.5) * 30;
        p.life = e._trailLife; p.max = e._trailLife; p.size = e._trailSize;
        p.color = e._trailColor; p.gravity = 0;
        particles.active.push(p);
      }
    }
  }
  function leanOnMove(who, degrees) {
    if (!who || typeof who !== 'object') return;
    who._leanMax = num(degrees, 10);
  }
  function scrollImage(name, vx, vy) {
    var k = text(name, '');
    ensureImageLoaded(k);
    var rec = images[k];
    if (!rec) { warnOnce('scroll:' + k, 'a imagem "' + k + '" não está no projeto'); return; }
    if (!rec.loaded || !rec.img || !ctx2d) return;
    var iw = Math.max(1, num(rec.img.width, 1));
    var ih = Math.max(1, num(rec.img.height, 1));
    if ((config.w / iw + 2) * (config.h / ih + 2) > 4096) {
      warnOnce('scrollsmall:' + k, 'a imagem "' + k + '" é pequena demais para rolar de fundo');
      return;
    }
    var st = scrolls[k] || (scrolls[k] = { ox: 0, oy: 0, frame: -1 });
    if (st.frame !== frameCount && state === 'jogando') {
      st.frame = frameCount;
      st.ox += num(vx, 0) * currentDt; st.oy += num(vy, 0) * currentDt;
    }
    var camX = camera.on ? camera.x : 0;
    var camY = camera.on ? camera.y : 0;
    var mx = (((camX - st.ox) % iw) + iw) % iw;
    var my = (((camY - st.oy) % ih) + ih) % ih;
    var x0 = camX - mx; var y0 = camY - my;
    for (var ty = y0; ty < camY + config.h; ty += ih) {
      for (var tx = x0; tx < camX + config.w; tx += iw) {
        try { ctx2d.drawImage(rec.img, tx, ty, iw, ih); } catch (e) {}
      }
    }
  }
  function parallaxLayer(name, fx, fy) {
    var k = text(name, '');
    ensureImageLoaded(k);
    var rec = images[k];
    if (!rec) { warnOnce('parallax:' + k, 'a imagem "' + k + '" não está no projeto'); return; }
    if (!rec.loaded || !rec.img || !ctx2d) return;
    if (!camera.on) warnOnce('parallaxcam:' + k, 'a paralaxe precisa da câmera ligada — use "A câmera segue"');
    var iw = Math.max(1, num(rec.img.width, 1));
    var ih = Math.max(1, num(rec.img.height, 1));
    if ((config.w / iw + 2) * (config.h / ih + 2) > 4096) {
      warnOnce('parallaxsmall:' + k, 'a imagem "' + k + '" é pequena demais para o fundo');
      return;
    }
    var camX = camera.on ? camera.x : 0; var camY = camera.on ? camera.y : 0;
    var pfx = Math.max(0, Math.min(1, num(fx, 0.3)));
    var pfy = Math.max(0, Math.min(1, num(fy, 1)));
    var ax = camX * (1 - pfx); var ay = camY * (1 - pfy);
    var mx = (((camX - ax) % iw) + iw) % iw;
    var my = (((camY - ay) % ih) + ih) % ih;
    var x0 = camX - mx; var y0 = camY - my;
    for (var ty = y0; ty < camY + config.h; ty += ih) {
      for (var tx = x0; tx < camX + config.w; tx += iw) {
        try { ctx2d.drawImage(rec.img, tx, ty, iw, ih); } catch (e) {}
      }
    }
  }
  function sheetBurst(name, frames, fps, x, y, size) {
    if (sheetBursts.active.length >= MAX_SHEET_BURSTS) {
      warnOnce('sheetbursts', 'muitas explosões de folha ao mesmo tempo (teto ' + MAX_SHEET_BURSTS + ')');
      return;
    }
    var k = text(name, '');
    ensureImageLoaded(k);
    var rec = images[k];
    if (!rec) { warnOnce('sheetburst:' + k, 'a imagem "' + k + '" não está no projeto'); return; }
    if (!rec.loaded || !rec.img) return;
    var s = sheetBursts.free.pop() || {};
    s.img = rec.img; s.frames = Math.max(1, Math.round(num(frames, 4)));
    s.fps = Math.max(1, num(fps, 12)); s.x = num(x, 0); s.y = num(y, 0);
    s.size = Math.max(4, num(size, 64)); s.t = 0;
    sheetBursts.active.push(s);
  }
  function stepSheetBursts(dt) {
    for (var i = sheetBursts.active.length - 1; i >= 0; i--) {
      var s = sheetBursts.active[i];
      s.t += dt;
      if (Math.floor(s.t * s.fps) >= s.frames) {
        var last = sheetBursts.active.length - 1;
        sheetBursts.active[i] = sheetBursts.active[last];
        sheetBursts.active.pop();
        sheetBursts.free.push(s);
      }
    }
  }
  function drawSheetBursts() {
    if (!ctx2d || !sheetBursts.active.length) return;
    for (var i = 0; i < sheetBursts.active.length; i++) {
      var s = sheetBursts.active[i];
      var idx = Math.min(s.frames - 1, Math.floor(s.t * s.fps));
      var fw = Math.max(1, num(s.img.width, s.frames) / s.frames);
      try {
        ctx2d.drawImage(s.img, idx * fw, 0, fw, num(s.img.height, s.size),
          s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      } catch (e) {}
    }
  }

  // ---- 🎨 Aparências (looks) ----
  function defineLook(name, fn, baseW, baseH) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    looks[k] = {
      fn: fn,
      baseW: Math.max(1, num(baseW, 40)),
      baseH: Math.max(1, num(baseH, 40))
    };
  }
  function drawLook(name, x, y, w, h) {
    if (!ctx2d) return;
    var k = text(name, '');
    var look = looks[k];
    if (!look || typeof look.fn !== 'function') return;
    ctx2d.save();
    ctx2d.translate(num(x, 0), num(y, 0));
    paintLook(look, k, w, h);
    ctx2d.restore();
  }

  // ---- 🖥️ HUD & Missão ----
  function drawCounter(label, value, x, y) {
    if (!ctx2d) return;
    var caption = text(label, '') + (value === '' ? '' : ' ' + String(value));
    var bx = num(x, 24), by = num(y, 24);
    ctx2d.save();
    try {
      ctx2d.font = '20px ' + _szGameUIFont; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'top';
      var width = ctx2d.measureText(caption).width;
      ctx2d.fillStyle = 'rgba(0,0,0,0.75)'; ctx2d.fillRect(bx - 8, by - 6, width + 16, 34);
      ctx2d.fillStyle = '#ffffff'; ctx2d.fillText(caption, bx, by);
    } finally { ctx2d.restore(); }
  }
  function drawBar(current, max, x, y, w, h, color) {
    if (!ctx2d) return;
    var m = num(max, 100);
    if (!(m > 0)) m = 100;
    var frac = Math.max(0, Math.min(1, num(current, 0) / m));
    var bx = num(x, 20); var by = num(y, 20);
    var bw = Math.max(1, num(w, 200)); var bh = Math.max(1, num(h, 16));
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx2d.fillRect(bx, by, bw, bh);
    ctx2d.fillStyle = text(color, config.accent); ctx2d.fillRect(bx, by, bw * frac, bh);
    ctx2d.strokeStyle = 'white'; ctx2d.lineWidth = 2; ctx2d.strokeRect(bx, by, bw, bh);
    ctx2d.restore();
  }
  function drawTimer(x, y) {
    if (!ctx2d) return;
    var mins = Math.floor(playTime / 60); var secs = Math.floor(playTime % 60);
    var label = mins + ':' + (secs < 10 ? '0' + secs : '' + secs);
    ctx2d.save();
    ctx2d.fillStyle = config.accent; ctx2d.font = '28px ' + _szGameUIFont;
    try { ctx2d.textAlign = 'left'; } catch (e) {}
    ctx2d.fillText(label, num(x, 20), num(y, 40));
    ctx2d.restore();
  }

  // ---- Cenário de fundo: o desenho do Pinta cobrindo a tela ----
  // Fica no MOTOR (pintado no render(), antes do translate da câmera) e não numa
  // camada de decoração porque o cenário é o chão de tudo: se dependesse de a
  // criança lembrar de desenhá-lo primeiro, um bloco fora de ordem apagaria o
  // fundo dela sem explicação.
  var _backdropName = '';
  /**
   * COBRE a área visível sem entortar, centralizado. Uma geometria só, usada
   * pelos DOIS blocos (o fixo e o por-quadro), para que trocar de bloco não mude
   * o visual; ox/oy existem porque o motor pinta ANTES do translate da câmera
   * (origem 0,0) e o bloco por-quadro pinta DEPOIS (origem na câmera, igual ao
   * drawBackground) — os dois cobrem exatamente os mesmos pixels.
   *
   * "Cobrir" e não "esticar" nem "caber": esticar deforma o boneco que ela
   * desenhou e ela vê que ficou errado sem saber consertar; caber deixa faixas
   * lisas nas laterais e lê como defeito. Cobrir corta um pouco de céu e de
   * chão, e lê como "a câmera está mais perto".
   */
  function _paintBackdrop(name, ox, oy) {
    if (!ctx2d || !name) return false;
    ensureImageLoaded(name);
    var entry = images[name];
    var img = entry && entry.loaded ? entry.img : null;
    if (!img) return false; // ainda carregando, ou nome errado (o loadImage já avisou)
    var sw = img.naturalWidth || img.width || 0;
    var sh = img.naturalHeight || img.height || 0;
    var cw = config.w, ch = config.h;
    if (!(sw > 0) || !(sh > 0) || !(cw > 0) || !(ch > 0)) return false;
    var scale = Math.max(cw / sw, ch / sh);
    var dw = sw * scale, dh = sh * scale;
    // O canvas inteiro roda com smoothing DESLIGADO (pixel art nítida). Ampliar
    // um cenário pequeno agradece isso; reduzir um grande fica serrilhado, então
    // só nesse caso religamos, e devolvemos como estava.
    var smooth = scale < 1;
    if (smooth) { try { ctx2d.imageSmoothingEnabled = true; } catch (e) {} }
    try {
      ctx2d.drawImage(img, num(ox, 0) + (cw - dw) / 2, num(oy, 0) + (ch - dh) / 2, dw, dh);
    } catch (e) {}
    if (smooth) { try { ctx2d.imageSmoothingEnabled = false; } catch (e) {} }
    return true;
  }
  /** Fixa o cenário: o motor repinta a cada quadro, sem a criança fazer nada. */
  function setBackdrop(name) {
    _backdropName = text(name, '');
    if (_backdropName) ensureImageLoaded(_backdropName);
  }
  /** Desenha o cenário AGORA, neste ponto do quadro (dentro do "Desenhar o jogo"). */
  function drawBackdrop(name) {
    var on = camera.on;
    return _paintBackdrop(text(name, ''), on ? camera.x : 0, on ? camera.y : 0);
  }


  // ---- 🛤️ R25 — Caminhos (waypoints): a polilinha nomeada que destrava TD,
  // corrida, patrulha e cutscene em trilho. definePath é container+filho (o
  // MESMO padrão do rpgMenu/rpgOption). ----
  /** Coleta os pontos do corpo do "Criar o caminho" (cada "ponto" empilha). */
  function definePath(name, fn) {
    var k = text(name, '');
    if (!k) { warn('"Criar o caminho" precisa de um nome'); return; }
    var prev = pathBuilding;
    pathBuilding = [];
    try { if (typeof fn === 'function') fn(); } catch (e) { warn('erro ao montar o caminho: ' + e); }
    var pts = pathBuilding;
    pathBuilding = prev;
    if (pts.length < 2) { warnOnce('pathshort:' + k, 'o caminho "' + k + '" precisa de pelo menos 2 pontos'); return; }
    // Comprimentos ACUMULADOS até cada ponto (progresso O(1) no follow).
    var cum = [0];
    var total = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
      cum.push(total);
    }
    paths[k] = { pts: pts, cum: cum, total: Math.max(1, total) };
  }
  function pathPoint(x, y) {
    if (!pathBuilding) { warnOnce('pathpoint', '"ponto" só vale DENTRO de "Criar o caminho"'); return; }
    pathBuilding.push({ x: num(x, 0), y: num(y, 0) });
  }
  /** O passo do seguidor (compartilhado com o Kit Defesa de Torre): snap-e-avança
   * como o waypoint do Chris, independente de FPS. O while é limitado ao nº de
   * pontos (dt no teto × velocidade alta não trava na quina). */
  function followPathStep(e, rec, v, d) {
    if (e._pathDone) return;
    var pts = rec.pts;
    var idx = Math.max(0, Math.round(num(e._pathIdx, 0)));
    var budget = Math.max(0, v * d);
    var guard = 0;
    while (guard++ <= pts.length) {
      if (idx >= pts.length - 1) {
        e.x = pts[pts.length - 1].x - e.w / 2;
        e.y = pts[pts.length - 1].y - e.h / 2;
        e._pathIdx = pts.length - 1;
        e._pathDone = true;
        e._prevX = e.x; e._prevY = e.y;
        emit('caminho:fim', e);
        return;
      }
      var tx = pts[idx + 1].x - centerX(e);
      var ty = pts[idx + 1].y - centerY(e);
      var dist = Math.sqrt(tx * tx + ty * ty);
      if (dist <= budget) {
        // encaixa NO waypoint e sobra orçamento p/ o próximo trecho
        e.x = pts[idx + 1].x - e.w / 2;
        e.y = pts[idx + 1].y - e.h / 2;
        budget -= dist;
        idx += 1;
        e._pathIdx = idx;
        setFacing(e, tx, ty);
        continue;
      }
      e.x += (tx / dist) * budget;
      e.y += (ty / dist) * budget;
      setFacing(e, tx, ty);
      e._prevX = e.x; e._prevY = e.y;
      return;
    }
  }
  /** Fazer QUEM seguir o caminho (por quadro, dentro do "para cada vivo"). */
  function followPath(who, pathName, speed, dt) {
    if (!who || typeof who !== 'object') return;
    var k = text(pathName, '');
    var rec = paths[k];
    if (!rec) { warnOnce('follow:' + k, 'o caminho "' + k + '" não existe — crie com "Criar o caminho"'); return; }
    if (who._pathName !== k) { who._pathName = k; who._pathIdx = 0; who._pathDone = false; }
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    followPathStep(who, rec, num(speed, 120), d);
  }
  /** O progresso de QUEM no caminho, 0..100 (% é mais kid que 0..1). */
  function pathProgress(who) {
    if (!who || typeof who !== 'object' || !who._pathName) return 0;
    var rec = paths[who._pathName];
    if (!rec) return 0;
    if (who._pathDone) return 100;
    var idx = Math.max(0, Math.round(num(who._pathIdx, 0)));
    var base = rec.cum[idx] || 0;
    var seg = 0;
    if (idx < rec.pts.length - 1) {
      var dx = centerX(who) - rec.pts[idx].x, dy = centerY(who) - rec.pts[idx].y;
      seg = Math.sqrt(dx * dx + dy * dy);
    }
    return Math.max(0, Math.min(100, ((base + seg) / rec.total) * 100));
  }

  // ---- 🎲 R30 — Jogos de TABULEIRO: dado + ordem de turno + trilha de casas ----
  // Peças NEUTRAS: a criança MONTA o Ludo/Jogo-da-Vida. (o dado vai na 🎲 Sorte.)
  function rollDice(faces) {
    var n = Math.max(1, Math.round(num(faces, 6)));
    return Math.floor(gameRandom() * n) + 1;
  }
  // Ordem de turno = um ANEL puro (1..N). Generaliza o nextAliveAfter das batalhas.
  var turnRing = { count: 1, current: 1 };
  var turnHooks = []; // fns do "Quando a vez mudar"
  function playersSetup(n) {
    turnRing.count = Math.max(1, Math.round(num(n, 2)));
    turnRing.current = 1;
  }
  function currentPlayer() { return turnRing.current; }
  function nextPlayer() {
    turnRing.current = (turnRing.current % turnRing.count) + 1;
    for (var i = 0; i < turnHooks.length; i++) {
      try { turnHooks[i](); } catch (e) { warn('erro no "Quando a vez mudar": ' + e); }
    }
  }
  function onTurnChange(fn) { if (typeof fn === 'function') turnHooks.push(fn); }
  // Trilha de casas: cada PONTO do caminho (🛤️) vira uma casa discreta. A peça
  // guarda o índice da casa (_spaceIdx) e desliza (tween) até ela, PARANDO.
  var landHooks = []; // fns do "Quando um peão parar numa casa"
  function moveAlongTrack(who, spaces, pathName) {
    if (!who || typeof who !== 'object') return;
    var k = text(pathName, '');
    var rec = paths[k];
    if (!rec) { warnOnce('track:' + k, 'a trilha "' + k + '" não existe — crie com "Criar o caminho"'); return; }
    var idx = Math.round(num(who._spaceIdx, 0)) + Math.round(num(spaces, 1));
    idx = Math.max(0, Math.min(rec.pts.length - 1, idx));
    who._spaceIdx = idx; who._trackName = k;
    var p = rec.pts[idx];
    tweenTo(who, p.x - who.w / 2, p.y - who.h / 2, 0.3, function () {
      emit('casa:parou', who);
      for (var i = 0; i < landHooks.length; i++) {
        try { landHooks[i](); } catch (e) { warn('erro no "Quando um peão parar numa casa": ' + e); }
      }
    });
  }
  function spaceOf(who) {
    return (who && typeof who === 'object') ? Math.max(0, Math.round(num(who._spaceIdx, 0))) : 0;
  }
  function onLandSpace(fn) { if (typeof fn === 'function') landHooks.push(fn); }

  // ==========================================================================

  // 🏰 KIT DEFESA DE TORRE - o atalho do genero (Tower Defense)
  // ==========================================================================
  // Pela REGRA: o caminho (🛤️ geral), o alvo (pickActive geral), o tiro da torre
  // (cooldown + spawn + seek + overlap) sao GERAIS. O kit so tem o que SO existe
  // em TD: a onda que INVADE pelo caminho, os lugares de torre com compra
  // validada, e o anel de alcance. A economia (carteira) mora no kit como o XP
  // do RPG e os rounds da Luta (precedente rpgLevel/lutaWinsOf).
  /** A onda: nasce ESPACADA atras do inicio do caminho (o xOffset=i*150 do
   * Chris, generalizado); o MOTOR move cada um pelo caminho (stepTd). */
  function tdWave(pathName, count, moldName, gap, speed) {
    var pk = text(pathName, '');
    var rec = paths[pk];
    if (!rec) { warnOnce('tdwave:' + pk, 'o caminho "' + pk + '" não existe — crie com "Criar o caminho"'); return; }
    var mk = text(moldName, '');
    if (!molds[mk]) { warnOnce('tdmold:' + mk, 'o molde "' + mk + '" não existe — crie com "Criar o molde"'); return; }
    if (td.waves.length >= MAX_TD_WAVES) { warnOnce('tdwaves', 'muitas ondas ao mesmo tempo (teto ' + MAX_TD_WAVES + ')'); return; }
    var n = Math.max(1, Math.min(200, Math.round(num(count, 3))));
    var g = Math.max(0, num(gap, 150));
    var v = num(speed, 90);
    // Vetor unitario do 1o trecho: os inimigos entram em fila atras do 1o ponto.
    var p0 = rec.pts[0], p1 = rec.pts[1];
    var dx = p1.x - p0.x, dy = p1.y - p0.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    td.seq += 1;
    var w = { id: td.seq, path: pk, mold: mk, speed: v, members: [] };
    for (var i = 0; i < n; i++) {
      var e = spawnFromMold(mk, 0, 0);
      if (!e) break;
      e.x = p0.x - ux * g * i - e.w / 2;
      e.y = p0.y - uy * g * i - e.h / 2;
      e._prevX = e.x; e._prevY = e.y;
      e._pathName = pk; e._pathIdx = 0; e._pathDone = false;
      e._tdWave = w.id; // ⭐ carimbo anti-fantasma (a licao do _wave do Nave)
      w.members.push(e);
    }
    if (w.members.length) td.waves.push(w);
  }
  /** Marcar um lugar de torre (um por bloco; funciona com qualquer fundo). */
  function tdSlot(x, y, size) {
    if (td.slots.length >= MAX_TD_SLOTS) { warnOnce('tdslots', 'muitos lugares de torre (teto ' + MAX_TD_SLOTS + ')'); return; }
    td.slots.push({ x: num(x, 100), y: num(y, 100), size: Math.max(8, num(size, 64)), occupied: false });
  }
  function tdFreeSlot(x, y) {
    for (var i = 0; i < td.slots.length; i++) {
      var s = td.slots[i];
      if (Math.abs(num(x, 0) - s.x) <= s.size / 2 && Math.abs(num(y, 0) - s.y) <= s.size / 2) {
        s.occupied = false; return;
      }
    }
  }
  function tdSlotAt(px, py) {
    for (var i = 0; i < td.slots.length; i++) {
      var s = td.slots[i];
      if (!s.occupied && Math.abs(px - s.x) <= s.size / 2 && Math.abs(py - s.y) <= s.size / 2) return s;
    }
    return null;
  }
  function tdDrawSlots() {
    if (!ctx2d) return;
    for (var i = 0; i < td.slots.length; i++) {
      var s = td.slots[i];
      if (s.occupied) continue;
      var hover = Math.abs(mouse.x - s.x) <= s.size / 2 && Math.abs(mouse.y - s.y) <= s.size / 2;
      var prev = 1;
      try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = hover ? 0.4 : 0.15; } catch (e) {}
      ctx2d.fillStyle = '#ffffff';
      ctx2d.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      try { ctx2d.globalAlpha = prev; } catch (e) {}
    }
  }
  function tdDrawRange(who, radius) {
    if (!ctx2d || !who || typeof who !== 'object') return;
    var r = Math.max(1, num(radius, 220));
    var prev = 1;
    try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = 0.12; } catch (e) {}
    ctx2d.fillStyle = '#66aaff';
    ctx2d.beginPath();
    try { ctx2d.arc(centerX(who), centerY(who), r, 0, Math.PI * 2); ctx2d.fill(); } catch (e) {}
    try { ctx2d.globalAlpha = prev; ctx2d.strokeStyle = '#66aaff'; ctx2d.lineWidth = 2; ctx2d.stroke(); } catch (e) {}
  }
  // Carteira do kit (precedente rpgLevel/lutaWinsOf — evita o padrao novo de
  // closures no parser p/ ler a variavel da crianca).
  function tdSetCoins(n) { td.coins = Math.round(num(n, 100)); td.coinsInit = td.coins; }
  function tdAddCoins(n) { td.coins = Math.round(td.coins + num(n, 0)); }
  function tdCoins() { return td.coins; }
  // Há um único evento de compra no kit: registrar dois corpos faria o mesmo
  // clique cobrar duas vezes. O primeiro registro vence e o segundo ensina a
  // criança a manter apenas um chapéu de evento.
  var tdBuyer = null;
  function tdOnBuy(cost, fn) {
    if (typeof fn !== 'function') return;
    if (tdBuyer) {
      warnOnce('tdbuyer:duplicate', 'use apenas um bloco "Quando clicar para comprar uma torre" — o primeiro será usado');
      return;
    }
    tdBuyer = { cost: Math.max(0, num(cost, 50)), fn: fn };
  }
  /** Clique no jogo: 1o slot livre sob o ponto. Paga e roda o corpo, ou avisa. */
  function tdHandleClick(px, py) {
    if (!tdBuyer) return false;
    var slot = tdSlotAt(px, py);
    if (!slot) return false;
    if (td.coins >= tdBuyer.cost) {
      td.coins -= tdBuyer.cost;
      slot.occupied = true;
      try { tdBuyer.fn(slot.x, slot.y); } catch (e) { warn('erro no "Quando comprar a torre": ' + e); }
    } else {
      emit('compra:negada', null);
    }
    return true; // consome o clique (nao cai no "Quando clicar no jogo")
  }
  /** O passo do kit (stepSystems): move as ondas pelo caminho, avisa vazamento. */
  function stepTd(dt) {
    for (var wi = td.waves.length - 1; wi >= 0; wi--) {
      var w = td.waves[wi];
      var rec = paths[w.path];
      var ms = w.members;
      for (var i = ms.length - 1; i >= 0; i--) {
        var e = ms[i];
        if (!e || e._active === false || e._tdWave !== w.id) {
          ms[i] = ms[ms.length - 1]; ms.pop(); continue;
        }
        if (rec) followPathStep(e, rec, w.speed, dt);
        if (e._pathDone) {
          ms[i] = ms[ms.length - 1]; ms.pop();
          recycle(e);
          emit('invasor:passou', null); // a crianca tira a vida no on()
        }
      }
      if (!ms.length) {
        td.waves[wi] = td.waves[td.waves.length - 1]; td.waves.pop();
        emit('onda:limpa', null); // MESMO evento do Nave (vocabulario unico)
      }
    }
  }
  /** "Jogar de novo" limpa o kit; slots liberam, moedas voltam ao inicial. */
  function tdNewGame() {
    td.waves.length = 0;
    for (var i = 0; i < td.slots.length; i++) td.slots[i].occupied = false;
    td.coins = td.coinsInit;
  }
  function tdResetProject() {
    td.slots.length = 0;
    tdBuyer = null;
  }


  // ==========================================================================
  // 🚀 KIT NAVE - o atalho do genero (Space Invaders / shoot-'em-up)
  // ==========================================================================
  // A extensao GERAL ja faz nave "na unha" (molde + spawn + setVelocity + colisao
  // + cooldown). O kit e o ATALHO do que so existe no genero: a FORMACAO que
  // marcha em bloco (inverte na borda COLETIVA, desce e acelera - o coracao do
  // Space Invaders, impossivel de compor com blocos por-entidade), o atirador
  // aleatorio da formacao, a linha de invasao, o ceu de estrelas e a bomba.
  //
  // O QUE ELE REUSA (nao duplica): moldes/pools (os invasores sao entidades
  // NORMAIS - overlap/hurt/recycle/drawActive/cull da crianca valem sem uma
  // linha nova; a morte encolhe a formacao sozinha porque o sweep derruba o
  // membro do bbox), randomActive (o atirador), shockwave (a explosao da bomba),
  // bounceOnEdges (o quique), leanOnMove (a inclinacao do Pilotar), fanShot (o
  // poder "leque" e receita: se o poder e leque -> Atirar um leque).
  //
  // ⭐ O carimbo _wave e o que evita a onda FANTASMA: entidade reciclada e
  // renascida p/ outro uso tem _wave zerado pelo spawnFromMold, entao o sweep a
  // derruba da formacao em vez de marchar um tiro alheio.
  /** Pilotar: anda de lado (setas ou A/D), preso na tela, com a inclinacao. */
  function naveShip(who, speed, lean, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    var v = num(speed, 420);
    var dx = 0;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    // De ONDE veio, ANTES de mover (contrato do moveByVelocity): a colisao
    // solida varre _prev->x; gravar depois cegava a varredura no strafe.
    who._prevX = who.x;
    who.x += dx * v * d;
    var maxX = config.w - num(who.w, 0);
    if (who.x < 0) who.x = 0;
    if (who.x > maxX) who.x = maxX;
    who._leanMax = num(lean, 10); // compoe o "Inclinar ao andar" geral
    if (dx) setFacing(who, dx, 0);
  }
  /** Poder de tiro temporario POR ENTIDADE (o MachineGun de 5 s do Chris). */
  var NAVE_POWERS = { metralhadora: 1, leque: 1 };
  function navePowerup(who, power, seconds) {
    if (!who || typeof who !== 'object') return;
    var p = text(power, '');
    if (!NAVE_POWERS[p]) {
      warnOnce('navepower:' + p, 'o poder "' + p + '" não existe — use metralhadora ou leque');
      return;
    }
    // Dedupe por IDENTIDADE, nao por _gunMode: o pool RECICLA o objeto (o
    // spawnFromMold zera _gunMode) e o recycle nao mexe em powered[] — o gate
    // antigo empurrava o MESMO objeto 2x e o _gunT decaia em DOBRO (poder de
    // 5 s durava 2,5 s). powered e minusculo; indexOf aqui e barato (no
    // recycle, laco quente, seria caro a toa).
    if (nave.powered.indexOf(who) === -1) nave.powered.push(who);
    who._gunMode = p;
    who._gunT = Math.max(0.1, num(seconds, 5));
  }
  function navePowerOf(who) {
    if (!who || typeof who !== 'object') return 'normal';
    return who._gunMode ? who._gunMode : 'normal';
  }
  /** A FORMACAO: nasce em grade centrada no topo; o MOTOR marcha (stepNave). */
  function naveWave(moldName, cols, rows, gap, speed, drop, accel) {
    var k = text(moldName, '');
    if (!molds[k]) {
      warnOnce('wave:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"');
      return;
    }
    if (nave.waves.length >= MAX_WAVES) {
      warnOnce('waves', 'muitas ondas ao mesmo tempo (teto ' + MAX_WAVES + ') — espere a onda:limpa');
      return;
    }
    var c = Math.max(1, Math.min(20, Math.round(num(cols, 8))));
    var r = Math.max(1, Math.min(10, Math.round(num(rows, 3))));
    var g = Math.max(8, Math.min(200, num(gap, 60)));
    // A crianca manda nas COLUNAS; o motor espreme o ESPACO p/ caber em 90% da
    // tela. Sem isso, 12 colunas x gap 120 nasciam mais largas que a tela e a
    // marcha invertia TODO quadro (a formacao tremia e DESPENCAVA a 1800 px/s).
    // O g tambem e o passo vertical: a grade encolhe proporcional (previsivel).
    var mwFit = molds[k].w;
    if (c > 1) {
      var fitG = (config.w * 0.9 - mwFit) / (c - 1);
      if (g > fitG) g = Math.max(8, fitG);
    }
    nave.seq += 1;
    var w = {
      id: nave.seq,
      vx: num(speed, 150),
      drop: num(drop, 30),
      accel: Math.max(0, num(accel, 15)),
      invaded: false,
      members: []
    };
    var mw = mwFit;
    var totalW = (c - 1) * g + mw;
    var startX = Math.max(0, (config.w - totalW) / 2);
    var startY = 40;
    for (var row = 0; row < r; row++) {
      for (var col = 0; col < c; col++) {
        var e = spawnFromMold(k, startX + col * g, startY + row * g);
        if (!e) break; // pool lotado: o spawnFromMold ja avisou
        e._wave = w.id;
        w.members.push(e);
      }
    }
    if (w.members.length) nave.waves.push(w);
  }
  /** O atirador da formacao: a cada N s, um vivo ALEATORIO do molde atira. */
  function naveWaveShooter(moldName, seconds, bulletMold, speed) {
    var k = text(moldName, '');
    var b = text(bulletMold, '');
    // Nome errado NUNCA e silencioso — o atirador tambem (R24; antes so o tiro
    // era validado e o ritmo registrava um molde que nunca atiraria).
    if (!molds[k]) {
      warnOnce('waveshootmold:' + k, 'o molde do atirador "' + k + '" não existe — crie com "Criar o molde"');
      return;
    }
    if (!molds[b]) {
      warnOnce('waveshoot:' + b, 'o molde do tiro "' + b + '" não existe — crie com "Criar o molde"');
      return;
    }
    var itv = Math.max(0.1, num(seconds, 1.5));
    var v = num(speed, 300);
    // Dedupe por molde (padrao startSpawner): re-ligar so TROCA o ritmo.
    for (var i = 0; i < nave.shooters.length; i++) {
      if (nave.shooters[i].mold === k) {
        nave.shooters[i].interval = itv;
        nave.shooters[i].bullet = b;
        nave.shooters[i].speed = v;
        return;
      }
    }
    nave.shooters.push({ mold: k, interval: itv, timer: 0, bullet: b, speed: v });
  }
  /** A linha de invasao (0 = fundo da tela). Config: NAO reseta em jogo novo. */
  function naveInvasionLine(y) {
    nave.invadeY = Math.max(0, num(y, 0));
  }
  /** Ceu de estrelas rolando (100 estrelas a 0.3 px/quadro no Chris = 18 px/s). */
  function naveStarfield(count, speed) {
    if (!ctx2d) return;
    var n = Math.max(1, Math.min(500, Math.round(num(count, 100))));
    var st = nave.stars;
    if (!st || st.n !== n) {
      st = nave.stars = { n: n, xs: [], ys: [], rs: [], frame: -1 };
      for (var i = 0; i < n; i++) {
        st.xs.push(visualRandom() * config.w);
        st.ys.push(visualRandom() * config.h);
        st.rs.push(1 + visualRandom() * 2);
      }
    }
    var v = num(speed, 20);
    // Anda 1x por quadro (carimbo) e congela fora de 'jogando', como as faiscas.
    if (st.frame !== frameCount && state === 'jogando') {
      st.frame = frameCount;
      for (var j = 0; j < n; j++) {
        st.ys[j] += v * currentDt;
        if (st.ys[j] > config.h) { st.ys[j] = -2; st.xs[j] = visualRandom() * config.w; }
        else if (st.ys[j] < -4) { st.ys[j] = config.h; st.xs[j] = visualRandom() * config.w; }
      }
    }
    // Decor de TELA: com camera ligada, cola no retangulo visivel (drawBackground).
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    ctx2d.fillStyle = '#ffffff';
    for (var s = 0; s < n; s++) {
      ctx2d.fillRect(ox + st.xs[s], oy + st.ys[s], st.rs[s], st.rs[s]);
    }
  }
  /**
   * A Bomb do Chris: quica pela tela; quando a crianca a RECOLHE (no overlap
   * tiro x bomba ela so diz "Recolher"), o motor solta a onda de choque, varre o
   * molde-alvo no raio recolhendo e avisa 'bomba:acertou' POR vitima. O gatilho
   * ser o recycle mantem a colisao com a CRIANCA (paradigma do kit inteiro).
   */
  function naveBomb(moldName, radius, targetMold) {
    var k = text(moldName, '');
    if (!molds[k]) {
      warnOnce('bomb:' + k, 'o molde "' + k + '" não existe — crie com "Criar o molde"');
      return;
    }
    var vivas = 0;
    for (var i = 0; i < nave.bombs.length; i++) {
      if (nave.bombs[i].e._active !== false) vivas++;
    }
    if (vivas >= MAX_NAVE_BOMBS) {
      warnOnce('bombs', 'já há ' + MAX_NAVE_BOMBS + ' bombas no ar — espere uma explodir');
      return;
    }
    var e = spawnFromMold(k, 0, 0);
    if (!e) return;
    // No retangulo VISIVEL (precedente spawnAtEdge): com camera ligada, nascer
    // em coords de tela jogava a bomba p/ fora da vista (o quique segue o mundo).
    var ox = camera.on ? camera.x : 0;
    var oy = camera.on ? camera.y : 0;
    e.x = ox + e.w + gameRandom() * (config.w - e.w * 3);
    e.y = oy + e.h + gameRandom() * (config.h * 0.5);
    e._prevX = e.x; e._prevY = e.y;
    e.vx = (gameRandom() - 0.5) * 360; // o +-3 px/quadro do Chris, em px/s
    e.vy = (gameRandom() - 0.5) * 360;
    e._naveBomb = true;
    nave.bombs.push({ e: e, radius: Math.max(10, num(radius, 200)), target: text(targetMold, '') });
  }
  /** O passo do kit (roda no stepSystems: pausa pausa tudo de graca). */
  function stepNave(dt) {
    // 1) ondas: sweep de membros -> bbox dos VIVOS -> marcha em bloco.
    for (var wi = nave.waves.length - 1; wi >= 0; wi--) {
      var w = nave.waves[wi];
      var ms = w.members;
      var minX = Infinity;
      var maxX = -Infinity;
      var maxB = -Infinity;
      for (var i = ms.length - 1; i >= 0; i--) {
        var e = ms[i];
        if (!e || e._active === false || e._wave !== w.id) {
          ms[i] = ms[ms.length - 1];
          ms.pop();
          continue;
        }
        if (e.x < minX) minX = e.x;
        if (e.x + e.w > maxX) maxX = e.x + e.w;
        if (e.y + e.h > maxB) maxB = e.y + e.h;
      }
      if (!ms.length) {
        nave.waves[wi] = nave.waves[nave.waves.length - 1];
        nave.waves.pop();
        emit('onda:limpa', null); // estado consistente ANTES do aviso (setMission)
        continue;
      }
      var dx = w.vx * dt;
      var span = maxX - minX;
      // Borda COLETIVA com guarda de SINAL: um quadro no teto do dt (0.1 s) com
      // vx acelerado nao pode re-inverter em loop preso na borda. E a rede do
      // R24: formacao mais LARGA que a tela toca as duas bordas ao mesmo tempo
      // — sem o gate de span ela invertia TODO quadro e descia w.drop 60x/s
      // (despencava). Sem borda p/ inverter, marcha reto e nao desce.
      if (span < config.w && ((maxX + dx >= config.w && w.vx > 0) || (minX + dx <= 0 && w.vx < 0))) {
        w.vx = -w.vx * (1 + w.accel / 100);
        if (w.vx > MAX_WAVE_VX) w.vx = MAX_WAVE_VX;
        if (w.vx < -MAX_WAVE_VX) w.vx = -MAX_WAVE_VX;
        dx = w.vx * dt;
        for (i = 0; i < ms.length; i++) {
          ms[i].y += w.drop;
          ms[i]._prevY = ms[i].y;
        }
        maxB += w.drop;
      }
      for (i = 0; i < ms.length; i++) {
        ms[i].x += dx;
        ms[i]._prevX = ms[i].x; // o motor marcha: varredura consistente
      }
      var line = nave.invadeY > 0 ? nave.invadeY : config.h;
      if (!w.invaded && maxB >= line) {
        w.invaded = true;
        emit('onda:invadiu', null);
      }
    }
    // 2) atiradores: um vivo ALEATORIO do molde atira p/ baixo.
    for (var si = 0; si < nave.shooters.length; si++) {
      var sh = nave.shooters[si];
      sh.timer += dt;
      while (sh.timer >= sh.interval && sh.interval > 0) {
        sh.timer -= sh.interval;
        var atirador = randomActive(sh.mold);
        if (!atirador) continue;
        var b = spawnFromMold(sh.bullet, 0, 0);
        if (!b) break;
        b.x = centerX(atirador) - b.w / 2;
        b.y = num(atirador.y, 0) + num(atirador.h, 0);
        b._prevX = b.x;
        b._prevY = b.y;
        b.vx = 0;
        b.vy = sh.speed;
      }
    }
    // 3) bombas: o motor move + quica; recolhida -> explosao.
    for (var bi = nave.bombs.length - 1; bi >= 0; bi--) {
      var rec = nave.bombs[bi];
      var bomba = rec.e;
      if (bomba._active !== false && bomba._naveBomb === true) {
        moveByVelocity(bomba, dt);
        bounceOnEdges(bomba);
        continue;
      }
      // Recolhida pela crianca (ou reciclada): explode ONDE PAROU — a menos que
      // o pool ja tenha REUSADO o objeto p/ outra entidade (_naveBomb zerado no
      // respawn): ai a posicao e de outro e a explosao e descartada.
      if (bomba._active === false) {
        var bx = centerX(bomba);
        var by = centerY(bomba);
        shockwave(bx, by, rec.radius, 0.4, '#ffffff');
        var alvo = pools[rec.target];
        if (alvo) {
          for (var vi = alvo.active.length - 1; vi >= 0; vi--) {
            var v = alvo.active[vi];
            if (!v || v._active === false) continue;
            var ddx = centerX(v) - bx;
            var ddy = centerY(v) - by;
            if (ddx * ddx + ddy * ddy <= rec.radius * rec.radius) {
              recycle(v);
              emit('bomba:acertou', null);
            }
          }
        } else if (rec.target) {
          warnOnce('bombalvo:' + rec.target, 'o molde-alvo da bomba "' + rec.target + '" não existe');
        }
      }
      nave.bombs[bi] = nave.bombs[nave.bombs.length - 1];
      nave.bombs.pop();
    }
    // 4) poderes: expira sozinho (o setTimeout de 5 s do Chris, no relogio do jogo).
    for (var pi = nave.powered.length - 1; pi >= 0; pi--) {
      var pe = nave.powered[pi];
      pe._gunT = num(pe._gunT, 0) - dt;
      if (pe._gunT <= 0 || pe._active === false) {
        pe._gunMode = '';
        pe._gunT = 0;
        nave.powered[pi] = nave.powered[nave.powered.length - 1];
        nave.powered.pop();
      }
    }
  }
  /** "Jogar de novo" limpa o kit (as ondas a crianca recria no quando-entrar). */
  function naveNewGame() {
    nave.waves.length = 0;
    nave.bombs.length = 0;
    for (var i = 0; i < nave.powered.length; i++) {
      nave.powered[i]._gunMode = '';
      nave.powered[i]._gunT = 0;
    }
    nave.powered.length = 0;
    // Os ritmos PERSISTEM com o relogio zerado (espelho dos spawners); a linha
    // de invasao e o ceu sao config e ficam.
    for (var s = 0; s < nave.shooters.length; s++) nave.shooters[s].timer = 0;
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
    npcs: nameMap(),      // nome -> entidade (sólida na grade)
    npcTalk: nameMap(),   // nome -> [fns do "quando conversar"]
    doors: {},            // 'cx,cy' -> nome do mapa
    stepHandlers: {},     // 'cx,cy' -> [fns do "quando pisar" — footstep cutscenes]
    flags: nameMap(),     // StoryFlags: nome -> true
    items: [],            // inventário: {name, image}
    maps: nameMap(),      // nome -> { cols, rows, draw } — declaração visual explícita
    mapEnter: nameMap(),  // nome -> [fns de comportamento ao entrar]
    mapOrder: [],         // ordem de criação (fallback: o 1º mapa válido)
    startMap: '',         // mapa inicial explícito, escolhido por rpgSetStartMap
    currentMap: '',
    // 🌍 Mundo aberto: tamanho do mapa ATUAL em células vem da declaração;
    // bordas são comportamento e são remontadas a cada entrada (como pkm.grass).
    mapCols: 0,
    mapRows: 0,
    edges: {},
    hero: null,           // quem usa a grade (a fala/porta/NPC olham ele)
    dialog: null,         // {queue, text, name, start}
    battle: null,         // batalha em EQUIPE: {allies, foes, phase, actor, target, ...}
    // ⚔️ Time e golpes (batalha em equipe): party PERSISTENTE de aliados (o herói
    // entra sozinho), fila de inimigos da próxima batalha, e golpes nomeados por nome.
    allies: [],           // [{name, hp, str, def, look, color}] — "Adicionar aliado"
    foeQueue: [],         // [{...}] — "Adicionar inimigo" (consumida em rpgBattleStart)
    movesByName: nameMap(), // nome -> [{name, dmg, cost, heal}] — "Ensinar o golpe" (sem protótipo: nome "constructor"/"toString" da criança não quebra)
    // Atributos do herói na batalha (Combatant do Pizza): vida/força/defesa + XP/
    // nível + energia (mana p/ o golpe especial). base* = valores iniciais (o
    // "Recomeçar" volta a eles); os correntes sobem com o nível.
    playerHp: 30, playerMax: 30, playerStr: 7, playerDef: 0,
    baseMax: 30, baseStr: 7, baseDef: 0,
    playerXp: 0, playerLevel: 1, playerMaxXp: 20,
    playerEnergy: 10, playerMaxEnergy: 10, playerPoison: 0,
    playerRegen: 0, playerBlind: 0, // 🌿 R25: status regenera/atrapalha (Pizza Legends)
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
    menuRects: [],        // retângulos das opções p/ o clique (recalculado no draw)
    // 👑 IA de chefe: nome do inimigo -> fn do "Quando for a vez do inimigo".
    // Registro PERSISTENTE (como onUpdate) — sobrevive ao recomeço; se o inimigo
    // não estiver na batalha, o hook simplesmente não dispara.
    foeTurnHooks: nameMap(),
    // ⚔️ Fichas de inimigo REUTILIZÁVEIS ({name,hp,str,def,image,color,boss}): a
    // criança define o inimigo/chefão UMA vez ("Criar a ficha do inimigo") e depois
    // só ESCOLHE com quem batalhar. Registro PERSISTENTE (como os moldes/aparências).
    battlerDefs: nameMap()
  };

  function resetCoreProjectRegistrations() {
    updateHooks.length = 0;
    drawHooks.length = 0;
    hudHooks.length = 0;
    gameClickHooks.length = 0;
    gameStartHooks.length = 0;
    enterStateHooks = Object.create(null);
    listeners = Object.create(null);
    turnHooks.length = 0;
    landHooks.length = 0;
  }

  function resetProjectOwnedResources() {
    for (var bi = 0; bi < projectButtons.length; bi++) {
      var button = projectButtons[bi];
      if (button && button.parentNode) button.parentNode.removeChild(button);
    }
    projectButtons.length = 0;
    for (var screenName in screens) {
      var screen = screens[screenName];
      if (screen && screen.el) screen.mainBtn = screen.el.querySelector('button');
    }
    for (var si = 0; si < projectScreens.length; si++) {
      var key = projectScreens[si];
      var entry = screens[key];
      if (entry && entry.el && entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
      delete screens[key];
    }
    projectScreens.length = 0;
    for (var ti = 0; ti < trailed.length; ti++) {
      if (trailed[ti]) trailed[ti]._trailOn = false;
    }
    trailed.length = 0;
    for (var soundName in sounds) {
      try { sounds[soundName].pause(); sounds[soundName].currentTime = 0; } catch (e) {}
    }
    stopProjectTones();
  }

  function resetProjectRegistrations() {
    _runRuntimeDomainHook('resetProject');
  }

  function rpgResetProject() {
    rpg.npcTalk = nameMap();
    rpg.maps = nameMap();
    rpg.mapEnter = nameMap();
    rpg.mapOrder = [];
    rpg.startMap = '';
    rpg.currentMap = '';
    rpg.mapCols = 0;
    rpg.mapRows = 0;
    rpg.stepHandlers = {};
    rpg.foeTurnHooks = nameMap();
    rpg.onBattleEnd.length = 0;
  }

  function executeProjectFactory() {
    if (typeof projectFactory !== 'function' || runningProjectFactory) return;
    var completed = false;
    runningProjectFactory = true;
    try { projectFactory(); completed = true; }
    catch (e) { warn('erro em "Ao iniciar": ' + e); }
    runningProjectFactory = false;
    if (completed) _runRuntimeDomainHook('projectReady');
  }

  function runProject(fn) {
    if (typeof fn !== 'function') {
      warn('o projeto precisa de uma função de início');
      return;
    }
    projectFactory = fn;
    resetProjectRegistrations();
    executeProjectFactory();
  }
  var SAVE_KEY = 'szgk-rpg-save'; // localStorage do preview (persiste por projeto)
  var DIALOG_CPS = 30; // velocidade do typewriter (chars/segundo)
  var DIR_ROW = { down: 0, up: 1, left: 2, right: 3 }; // linha da folha por direção

  function cellKey(cx, cy) { return Math.round(num(cx, 0)) + ',' + Math.round(num(cy, 0)); }
  function rpgBlockCell(cx, cy) { var k = cellKey(cx, cy); rpg.walls[k] = true; rpg.terrain[k] = true; }
  function rpgCellPx(n) { return num(n, 0) * tilePx; }

  /** Recomeço de partida: zera somente o ESTADO da história, sem executar
   * callbacks. A entrada no mapa acontece depois que a factory atual foi montada. */
  function rpgNewGame() {
    // O time do Kit Monstrinhos morre junto: é parte do "jogo", não do motor.
    pkmNewGame();
    rpg.flags = nameMap();
    rpg.items = [];
    rpg.dialog = null;
    rpg.battle = null;
    rpg.battleWon = false;
    // Volta os atributos ao BASE (o "Recomeçar" reinicia a progressão).
    rpg.playerLevel = 1; rpg.playerXp = 0; rpg.playerMaxXp = 20;
    rpg.playerMax = rpg.baseMax; rpg.playerStr = rpg.baseStr; rpg.playerDef = rpg.baseDef;
    rpg.playerHp = rpg.playerMax;
    rpg.playerEnergy = rpg.playerMaxEnergy; rpg.playerPoison = 0;
    rpg.playerRegen = 0; rpg.playerBlind = 0;
    rpg.potions = [];
    // O TIME e a fila de inimigos zeram ao recomeçar (são a partida em si).
    rpg.allies = [];
    rpg.foeQueue = [];
    // ⚠️ Os GOLPES ensinados NÃO zeram mais: são DEFINIÇÕES (como as fichas/moldes/
    // aparências, que também persistem). Antes o wipe apagava "Ensinar o golpe" posto
    // no TOPO já no 1º "Jogar" (o jeito natural da criança; o exemplo O Chefão caía
    // nisso). rpgTeachMove/Heal são IDEMPOTENTES (dedup por nome), então re-ensinar
    // no gancho de nova partida também não duplica — os dois jeitos funcionam.
    rpg.scene = null;
    rpg.recording = false;
    rpg.sceneSteps = [];
    rpg.fade = 0;
    rpg.menu = null;
    rpg.menuBuilding = null;
    // No ciclo gerenciado, a próxima factory é dona de um novo herói. No uso
    // direto da API, o herói atual pertence ao chamador e deve sobreviver ao
    // restart para ser reposicionado no mapa inicial, como ocorria antes.
    if (projectFactory) rpg.hero = null;
  }
  function rpgEnterInitialMap() {
    rpgValidateMapEvents();
    var initialMap = rpg.startMap || rpgFirstValidMap();
    if (initialMap) rpgGoMap(initialMap);
  }

  function rpgCreateNpc(name, cx, cy, image, look) {
    var k = text(name, '');
    if (!k) { warn('"Criar o NPC" precisa de um nome'); return; }
    var s = tilePx;
    var npcCx = Math.round(num(cx, 0));
    var npcCy = Math.round(num(cy, 0));
    var key = cellKey(npcCx, npcCy);
    if (rpg.mapCols > 0 && rpg.mapRows > 0 &&
        (npcCx < 0 || npcCx >= rpg.mapCols || npcCy < 0 || npcCy >= rpg.mapRows)) {
      warnOnce('npccell:outside:' + key, 'a célula ' + key + ' fica fora do mapa — escolha uma célula dentro dele');
      return;
    }
    // Recriar um NPC com o MESMO nome deixava a reserva antiga órfã (parede
    // fantasma para sempre); dois NPCs na MESMA célula dividiam uma entrada só e o
    // 1º a andar liberava a do outro. Primeiro valida o novo destino; só depois
    // libera a reserva antiga pertencente a este NPC.
    var old = rpg.npcs[k];
    if (cellOccupied(npcCx, npcCy, old)) {
      warnOnce('npccell:' + key, 'já tem alguém (ou uma parede) na célula ' + key + ' — o NPC "' + k + '" precisa de uma célula livre');
      return;
    }
    if (old && old._reservedCell && old._reservedCell !== key && !rpg.terrain[old._reservedCell]) delete rpg.walls[old._reservedCell];
    ensureImageLoaded(image);
    rpg.npcs[k] = {
      name: k,
      x: npcCx * s, y: npcCy * s,
      w: s, h: s,
      image: text(image, ''), look: text(look, ''), color: '#a78bfa',
      // Anda como o herói: destino na grade, direção, velocidade e patrulha.
      speed: s * 2.4, _gridDest: null, _walkTarget: null,
      _walkPath: [], _walkIndex: 0, _walkFailed: false, _wander: false, _wanderT: 0,
      _iFrames: 0, _facingLeft: false, _facingDir: 'down', _angle: 0,
      _swingStart: 0, _swingActive: 0, _swingDur: 0,
      _animOnce: false, _animState: '',
      _state: '', _stateUntil: 0, _stateAnims: null, _stateLooks: null,
      _sheetImg: '', _sheetFw: 0, _sheetFh: 0,
      _animFrom: 0, _animTo: 0, _animFps: 0, _animStart: 0,
      _walkImg: '', _walkFw: 0, _walkFh: 0, _walkFrames: 0, _walkFps: 6,
      _lastX: 0, _lastY: 0, _moving: false, _moveFrame: -1,
      _reservedCell: key // a célula que ESTE NPC ocupa (p/ só ele liberar)
    };
    rpg.walls[key] = true; // sólido: bloqueia a grade
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
    ctx2d.font = 'bold 18px ' + _szGameUIFont;
    ctx2d.fillStyle = config.accent;
    if (d.name) { ctx2d.fillText(d.name, bx + 16, ty); ty += 26; }
    ctx2d.font = '18px ' + _szGameUIFont;
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
    var isCurrentHero = rpg.hero === c;
    rpg.hero = c;
    if (!isCurrentHero && rpg.currentMap) rpgEnsureHeroSafe('heroi atual');
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
      // 🌍 Mundo aberto: o passo cruzaria a BORDA do mapa? Com ligação, viaja
      // (estilo Zelda: entra espelhado do outro lado); sem ligação, a borda é o
      // fim do mundo (só virou de lado). O tamanho vem do mapa criado. ⭐ POR EIXO:
      // só colunas já limita leste/oeste (norte/sul ficam livres) e vice-versa.
      if (rpg.mapCols > 0 || rpg.mapRows > 0) {
        var outX = rpg.mapCols > 0 && (nx < 0 || nx >= rpg.mapCols);
        var outY = rpg.mapRows > 0 && (ny < 0 || ny >= rpg.mapRows);
        if (outX || outY) {
          var eside = dx > 0 ? 'leste' : dx < 0 ? 'oeste' : dy > 0 ? 'sul' : 'norte';
          var edest = rpg.edges[eside];
          if (edest) rpgEdgeTravel(c, edest, eside, cx, cy);
          return;
        }
      }
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
    ensureImageLoaded(image);
    var it = rpgFindItem(k);
    if (it) { it.qty = num(it.qty, 1) + 1; return; } // ja tem: soma QUANTIDADE
    rpg.items.push({ name: k, image: text(image, ''), qty: 1 });
  }
  function rpgFindItem(k) {
    for (var i = 0; i < rpg.items.length; i++) if (rpg.items[i].name === k) return rpg.items[i];
    return null;
  }
  /**
   * QUANTOS de um item (0 = nenhum). O "Ganhar o item" DEDUPAVA sem contar: sem
   * quantidade nao existe crafting ("3 madeiras"), loja, nem coleta - so
   * chave-e-porta. Agora ele soma, e isto le.
   */
  function rpgCountItem(name) {
    var it = rpgFindItem(text(name, ''));
    return it ? num(it.qty, 1) : 0;
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
      ensureImageLoaded(it.image);
      var ix = bx + i * (size + 8);
      ctx2d.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx2d.fillRect(ix, by, size, size);
      var entry = it.image ? images[it.image] : null;
      if (entry && entry.loaded && entry.img) {
        try { ctx2d.drawImage(entry.img, ix + 4, by + 4, size - 8, size - 8); } catch (e) {}
      } else {
        ctx2d.fillStyle = config.accent;
        ctx2d.font = 'bold 20px ' + _szGameUIFont;
        ctx2d.fillText(it.name.slice(0, 1).toUpperCase(), ix + 13, by + 28);
      }
      ctx2d.strokeStyle = config.accent;
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(ix, by, size, size);
    }
    ctx2d.restore();
  }

  // Mapas têm duas responsabilidades explícitas: criar o espaço visual e reagir
  // à entrada. Um evento nunca cria um mapa implicitamente.
  function drawEmptyMapNotice(name) {
    if (!ctx2d) return;
    drawBackground('#20283a', true);
    ctx2d.save();
    ctx2d.fillStyle = '#ffffff';
    ctx2d.font = 'bold 22px ' + _szGameUIFont;
    ctx2d.textAlign = 'center';
    ctx2d.fillText('O mapa “' + name + '” ainda não tem desenho', config.w / 2, config.h / 2 - 8);
    ctx2d.font = '16px ' + _szGameUIFont;
    ctx2d.fillText('Use formas, um mapa do Pinta ou uma imagem importada.', config.w / 2, config.h / 2 + 22);
    ctx2d.restore();
  }
  /** bounds escolhe bordas físicas ou espaço aberto; o desenho também pode usar onDraw. */
  function rpgCreateMap(name, cols, rows, draw, hasDrawing, bounds) {
    var k = text(name, '');
    var unbounded = bounds === 'unbounded';
    if (bounds !== undefined && bounds !== 'bounded' && !unbounded) { warn('revise os limites do mapa'); return; }
    var requestedCols = Math.round(num(cols, 0));
    var requestedRows = Math.round(num(rows, 0));
    var c = unbounded ? 0 : Math.min(MAX_GRID_SIDE, requestedCols);
    var r = unbounded ? 0 : Math.min(MAX_GRID_SIDE, requestedRows);
    if (!k) { warn('"Criar o mapa" precisa de um nome'); return; }
    if (!unbounded && (requestedCols <= 0 || requestedRows <= 0)) { warn('o mapa "' + k + '" precisa ter largura e altura maiores que zero'); return; }
    if (!unbounded && (requestedCols > MAX_GRID_SIDE || requestedRows > MAX_GRID_SIDE)) {
      warnOnce('rpgmap:limit', 'o mapa foi limitado a ' + MAX_GRID_SIDE + ' × ' + MAX_GRID_SIDE + ' células para o jogo continuar responsivo');
    }
    if (typeof draw !== 'function') { warn('o mapa "' + k + '" precisa de um corpo de desenho'); return; }
    if (rpg.maps[k]) { warn('o mapa "' + k + '" foi criado mais de uma vez — usando a primeira criação'); return; }
    var empty = hasDrawing === false;
    rpg.maps[k] = { cols: c, rows: r, draw: draw, empty: empty };
    rpg.mapOrder.push(k);
  }
  function rpgOnEnterMap(name, fn) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    if (!rpg.mapEnter[k]) rpg.mapEnter[k] = [];
    rpg.mapEnter[k].push(fn);
  }
  function rpgValidateMapEvents() {
    if (!drawHooks.length) for (var name in rpg.maps) {
      if (rpg.maps[name].empty) warnOnce('emptymap:' + name, 'o mapa "' + name + '" foi criado sem desenho — adicione formas, um mapa do Pinta ou uma imagem');
    }
    for (var k in rpg.mapEnter) {
      if (!rpg.maps[k]) warnOnce('mapenter:' + k, 'há um evento de entrada para o mapa "' + k + '", mas ele não foi criado');
    }
  }
  function rpgSetStartMap(name) {
    var k = text(name, '');
    if (!k) { warn('"Começar o jogo no mapa" precisa de um nome'); return; }
    rpg.startMap = k;
  }
  function rpgFirstValidMap() {
    for (var i = 0; i < rpg.mapOrder.length; i++) {
      var k = rpg.mapOrder[i];
      if (rpg.maps[k]) return k;
    }
    return '';
  }
  function rpgResolveMap(name) {
    var requested = text(name, '');
    if (requested && rpg.maps[requested]) return requested;
    var fallback = rpgFirstValidMap();
    if (fallback) {
      warn('o mapa "' + requested + '" não existe — usando o primeiro mapa válido, "' + fallback + '"');
      return fallback;
    }
    warn('o mapa "' + requested + '" não existe e nenhum mapa válido foi criado');
    return '';
  }
  function rpgEnsureHeroSafe(reason) {
    var who = rpg.hero;
    if (!who || rpg.mapCols <= 0 || rpg.mapRows <= 0) return;
    var originalCx = Math.round(num(who.x, 0) / tilePx);
    var originalCy = Math.round(num(who.y, 0) / tilePx);
    var startCx = Math.max(0, Math.min(rpg.mapCols - 1, originalCx));
    var startCy = Math.max(0, Math.min(rpg.mapRows - 1, originalCy));
    var bestCx = startCx;
    var bestCy = startCy;
    if (rpg.walls[cellKey(startCx, startCy)]) {
      bestCx = -1;
      bestCy = -1;
      var width = rpg.mapCols;
      var total = width * rpg.mapRows;
      var queue = new Int32Array(total);
      var seen = new Uint8Array(total);
      var startIndex = startCy * width + startCx;
      var head = 0;
      var tail = 1;
      queue[0] = startIndex;
      seen[startIndex] = 1;
      var dirsX = [0, -1, 1, 0];
      var dirsY = [-1, 0, 0, 1];
      while (head < tail && bestCx < 0) {
        var here = queue[head++];
        var cx = here % width;
        var cy = Math.floor(here / width);
        for (var di = 0; di < 4; di++) {
          var nx = cx + dirsX[di];
          var ny = cy + dirsY[di];
          if (nx < 0 || nx >= width || ny < 0 || ny >= rpg.mapRows) continue;
          var next = ny * width + nx;
          if (seen[next]) continue;
          seen[next] = 1;
          if (!rpg.walls[cellKey(nx, ny)]) { bestCx = nx; bestCy = ny; break; }
          queue[tail++] = next;
        }
      }
    }
    if (bestCx < 0) {
      warnOnce('mapsafe:none:' + rpg.currentMap, 'o mapa "' + rpg.currentMap + '" não tem nenhuma célula livre para o herói');
      return;
    }
    var moved = bestCx !== originalCx || bestCy !== originalCy;
    who.x = bestCx * tilePx;
    who.y = bestCy * tilePx;
    who._prevX = who.x;
    who._prevY = who.y;
    who._gridDest = null;
    if (moved) {
      warnOnce(
        'mapsafe:' + rpg.currentMap + ':' + reason,
        'o herói estava fora do mapa ou numa célula bloqueada — colocado com segurança na célula ' + bestCx + ', ' + bestCy,
      );
    }
  }
  function rpgGoMap(name) {
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'goMap', name: text(name, '') }); return; }
    var k = rpgResolveMap(name);
    // Resolve ANTES do teardown: um destino inválido nunca apaga o mundo atual.
    if (!k) return;
    rpg.walls = {};
    rpg.terrain = {};
    rpg.npcs = nameMap();
    rpg.doors = {};
    rpg.stepHandlers = {};   // gatilhos de pisar são por-mapa (montados de novo)
    // ⭐ A grama e a tabela de selvagens TAMBÉM são por-mapa (o exemplo oficial
    // chama "Na grama alta deste mapa..." de DENTRO do "Quando entrar no mapa").
    // Sem limpar aqui, o pkmWild — que faz PUSH — duplicava a cada entrada: sair e
    // voltar 20× no quintal dava 40 entradas; e a tabela sendo global fazia os
    // bichos do quintal aparecerem na caverna, apesar do comentário prometer o
    // contrário. Quem chama no topo (sem mapas) nunca passa por aqui: segue global.
    pkm.wild = [];
    pkm.grassAreas = [];
    pkm.grassTiles = {};
    pkm.grassTileCount = 0;
    pkm.grassMap = '';
    // 🌍 O tamanho é parte da criação; bordas continuam sendo comportamento.
    var map = rpg.maps[k];
    rpg.mapCols = map.cols;
    rpg.mapRows = map.rows;
    rpg.edges = {};
    if (rpg.hero) rpg.hero._gridDest = null;
    rpg.currentMap = k;
    var hooks = rpg.mapEnter[k] || [];
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) { warn('erro ao entrar no mapa "' + k + '": ' + e); }
    }
    rpgEnsureHeroSafe('entrada');
    rpg.fade = 1; // transição: o mapa novo aparece surgindo do preto (SceneTransition)
    emit('mapa:' + k);
  }
  function rpgCreateDoor(cx, cy, map) {
    var k = text(map, '');
    if (!k) return;
    var destination = rpgResolveMap(k);
    if (destination) rpg.doors[cellKey(cx, cy)] = destination;
  }
  // ---- 🌍 Mundo aberto: bordas ligadas (estilo Zelda) ----
  var EDGE_SIDES = { norte: true, sul: true, leste: true, oeste: true };
  /** Liga uma borda deste mapa a outro mapa: atravessou, viaja (o tamanho vem de
   *  "Criar o mapa"; ligue a borda ESPELHADA no outro mapa também). */
  function rpgConnectEdge(side, map) {
    var s = text(side, '');
    var k = text(map, '');
    if (!EDGE_SIDES[s]) {
      warnOnce('edgeside:' + s, 'a borda "' + s + '" não existe (use norte, sul, leste ou oeste)');
      return;
    }
    if (!k) return;
    if (!rpg.maps[k]) {
      warnOnce('edgemap:' + k, 'a borda aponta para o mapa "' + k + '", mas ele não foi criado');
      return;
    }
    rpg.edges[s] = k;
  }
  function rpgCurrentMap() {
    return rpg.currentMap;
  }
  /** A viagem pela borda: troca o mapa (teardown + hooks + fade + aviso, tudo do
   *  rpgGoMap) e SÓ DEPOIS põe o herói na borda oposta, MESMA linha/coluna — por
   *  vir depois dos hooks, a entrada pela borda VENCE o "Colocar" do hook. */
  function rpgEdgeTravel(who, dest, side, cx, cy) {
    rpgGoMap(dest);
    var ncx = cx;
    var ncy = cy;
    if (side === 'leste') ncx = 0;
    else if (side === 'oeste') ncx = Math.max(0, rpg.mapCols - 1);
    else if (side === 'sul') ncy = 0;
    else if (side === 'norte') ncy = Math.max(0, rpg.mapRows - 1);
    // A coordenada perpendicular preserva e CLAMPA ao tamanho do destino.
    if (rpg.mapCols > 0) ncx = Math.max(0, Math.min(rpg.mapCols - 1, ncx));
    if (rpg.mapRows > 0) ncy = Math.max(0, Math.min(rpg.mapRows - 1, ncy));
    who.x = ncx * tilePx;
    who.y = ncy * tilePx;
    who._gridDest = null;
    rpgEnsureHeroSafe('borda-' + side);
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
    n._walkPath = findNpcPath(n, Math.round(n.x / tilePx), Math.round(n.y / tilePx), tx, ty);
    n._walkIndex = 0;
    n._walkFailed = !n._walkPath;
    if (n._walkFailed) {
      n._walkTarget = null;
      n._walkPath = [];
      warnOnce('npcpath:' + nm + ':' + tx + ',' + ty, 'o NPC "' + nm + '" não encontrou um caminho livre até a célula ' + tx + ',' + ty);
    }
  }
  /** NPC vagueia por células vizinhas livres (vida de vila). */
  function rpgNpcWander(npcName) {
    var n = rpg.npcs[text(npcName, '')];
    if (n) n._wander = true;
  }
  /** Passo de cena "esperar N segundos" — só faz sentido gravando. */
  function rpgWait(seconds) {
    if (rpg.recording) {
      rpg.sceneSteps.push({ type: 'wait', seconds: Math.max(0, num(seconds, 1)) });
      return;
    }
    // ⚠️ Fora de uma cena isto é NO-OP. O bloco lia "Esperar %1 segundos" — texto
    // 100% genérico —, então a criança arrastava no "A cada quadro", nada
    // acontecia e NINGUÉM avisava (a mesma classe das falhas silenciosas do R13).
    // O irmão "Opção" avisa nesse caso exato; este agora também.
    warn('"Esperar" só vale DENTRO de "Fazer a cena" — fora dela nada acontece');
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
    else if (st.type === 'npcWalk') {
      rpgNpcWalkTo(st.npc, st.cx, st.cy);
      var walkingNpc = rpg.npcs[st.npc];
      st._lastX = walkingNpc ? walkingNpc.x : 0;
      st._lastY = walkingNpc ? walkingNpc.y : 0;
      st._stalledFor = 0;
    }
    else if (st.type === 'face') { rpgFace(st.who, st.dir); st._instant = true; }
    else if (st.type === 'flag') { rpgAddFlag(st.name); st._instant = true; }
    else if (st.type === 'goMap') { rpgGoMap(st.name); st._instant = true; }
    else if (st.type === 'battle') startBattleFromDef({ name: st.name, hp: st.hp, str: st.str, def: st.def, image: st.image, color: st.color || (st.boss ? '#b23b6e' : '#e05a5a'), boss: st.boss });
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
      if (n._walkFailed) { n._walkFailed = false; return true; }
      var s = tilePx;
      var arrived = n._gridDest == null && n._walkTarget == null &&
        Math.round(n.x / s) === st.cx && Math.round(n.y / s) === st.cy;
      if (arrived) return true;
      // Uma viagem longa é válida: o watchdog mede FALTA DE PROGRESSO, não o
      // tempo total do caminho. Assim cenas só desistem quando o NPC realmente
      // ficou preso, e não aos seis segundos enquanto ele ainda está andando.
      var moved = Math.abs(num(n.x, 0) - num(st._lastX, n.x)) > 0.01 ||
        Math.abs(num(n.y, 0) - num(st._lastY, n.y)) > 0.01;
      if (moved) {
        st._lastX = n.x; st._lastY = n.y; st._stalledFor = 0;
      } else st._stalledFor = num(st._stalledFor, 0) + dt;
      if (st._stalledFor > 3) {
        // A reserva representa a célula de destino. Se a interpolação travou no
        // meio, conclui esse pequeno passo antes de abandonar a rota para que a
        // posição visual e rpg.walls continuem descrevendo a mesma célula.
        if (n._gridDest) { n.x = n._gridDest.x; n.y = n._gridDest.y; }
        n._walkTarget = null; n._walkPath = []; n._walkIndex = 0; n._gridDest = null;
        warnOnce('npcpath:stalled:' + st.npc, 'o NPC "' + st.npc + '" não conseguiu continuar a caminhada durante a cena');
        return true;
      }
      return false;
    }
    if (st.type === 'battle') return rpg.battle == null && pkm.battle == null;
    if (st.type === 'menu') return rpg.menu == null;
    return true;
  }


  /** Uma célula está OCUPADA (parede/NPC/herói) — reserva de intenção do Pizza. */
  function cellOccupied(cx, cy, movingNpc) {
    if (rpg.mapCols > 0 && (cx < 0 || cx >= rpg.mapCols)) return true;
    if (rpg.mapRows > 0 && (cy < 0 || cy >= rpg.mapRows)) return true;
    var key = cx + ',' + cy;
    if (rpg.walls[key] && (!movingNpc || movingNpc._reservedCell !== key)) return true;
    var s = tilePx;
    if (rpg.hero) {
      if (Math.round(rpg.hero.x / s) === cx && Math.round(rpg.hero.y / s) === cy) return true;
      if (rpg.hero._gridDest) {
        if (Math.round(rpg.hero._gridDest.x / s) === cx && Math.round(rpg.hero._gridDest.y / s) === cy) return true;
      }
    }
    return false;
  }
  /**
   * Busca em largura na grade. O mapa já é limitado por MAX_GRID_SIDE, então
   * até um labirinto sem saída tem trabalho finito e não congela o Studio.
   * Retorna somente os próximos passos (a célula atual fica de fora).
   */
  function findNpcPath(n, startCx, startCy, targetCx, targetCy) {
    if (startCx === targetCx && startCy === targetCy) return [];
    var minX = rpg.mapCols > 0 ? 0 : Math.min(startCx, targetCx) - 16;
    var minY = rpg.mapRows > 0 ? 0 : Math.min(startCy, targetCy) - 16;
    var maxX = rpg.mapCols > 0 ? rpg.mapCols - 1 : Math.max(startCx, targetCx) + 16;
    var maxY = rpg.mapRows > 0 ? rpg.mapRows - 1 : Math.max(startCy, targetCy) + 16;
    if (maxX - minX + 1 > MAX_GRID_SIDE || maxY - minY + 1 > MAX_GRID_SIDE) return null;
    if (targetCx < minX || targetCx > maxX || targetCy < minY || targetCy > maxY) return null;
    if (cellOccupied(targetCx, targetCy, n)) return null;
    // Em uma rota Manhattan livre, a BFS sempre consome primeiro a direção com
    // menor índice em [direita, baixo, esquerda, cima]. Reproduzir exatamente
    // esse desempate evita visitar até 262 mil células no caso comum sem mudar
    // o caminho observável. Ao encontrar qualquer bloqueio, a BFS abaixo segue
    // sendo a única responsável por procurar o desvio.
    var xStep = targetCx > startCx ? 1 : targetCx < startCx ? -1 : 0;
    var yStep = targetCy > startCy ? 1 : targetCy < startCy ? -1 : 0;
    var xPriority = xStep > 0 ? 0 : xStep < 0 ? 2 : 4;
    var yPriority = yStep > 0 ? 1 : yStep < 0 ? 3 : 4;
    var firstIsX = xPriority < yPriority;
    var directPath = [];
    var directCx = startCx;
    var directCy = startCy;
    var directClear = true;
    for (var pass = 0; pass < 2 && directClear; pass++) {
      var moveX = pass === 0 ? firstIsX : !firstIsX;
      if (moveX) {
        while (directCx !== targetCx) {
          directCx += xStep;
          if (cellOccupied(directCx, directCy, n)) { directClear = false; break; }
          directPath.push({ cx: directCx, cy: directCy });
        }
      } else {
        while (directCy !== targetCy) {
          directCy += yStep;
          if (cellOccupied(directCx, directCy, n)) { directClear = false; break; }
          directPath.push({ cx: directCx, cy: directCy });
        }
      }
    }
    if (directClear) return directPath;
    // A grade pode chegar a 512 × 512. Chaves "x,y", arrays que crescem e
    // unshift na reconstrução criavam centenas de milhares de strings/objetos e
    // paravam o quadro. Índices inteiros em buffers contíguos mantêm a mesma BFS
    // determinística sem pressionar o coletor de lixo.
    var width = maxX - minX + 1;
    var height = maxY - minY + 1;
    var total = width * height;
    var startIndex = (startCy - minY) * width + (startCx - minX);
    var targetIndex = (targetCy - minY) * width + (targetCx - minX);
    var parents = new Int32Array(total);
    parents.fill(-2); // -2 = não visitado; -1 = raiz
    parents[startIndex] = -1;
    var queue = new Int32Array(total);
    var head = 0;
    var tail = 1;
    queue[0] = startIndex;
    var dirsX = [1, 0, -1, 0];
    var dirsY = [0, 1, 0, -1];
    while (head < tail) {
      var hereIndex = queue[head++];
      var cx = (hereIndex % width) + minX;
      var cy = Math.floor(hereIndex / width) + minY;
      for (var di = 0; di < 4; di++) {
        var nx = cx + dirsX[di];
        var ny = cy + dirsY[di];
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        var nextIndex = (ny - minY) * width + (nx - minX);
        if (parents[nextIndex] !== -2 || cellOccupied(nx, ny, n)) continue;
        parents[nextIndex] = hereIndex;
        if (nextIndex === targetIndex) {
          var path = [];
          var cursor = targetIndex;
          while (cursor !== startIndex) {
            path.push({ cx: (cursor % width) + minX, cy: Math.floor(cursor / width) + minY });
            cursor = parents[cursor];
          }
          path.reverse();
          return path;
        }
        queue[tail++] = nextIndex;
      }
    }
    return null;
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
        if (cx === tx && cy === ty) {
          n._walkTarget = null; n._walkPath = []; n._walkIndex = 0; return;
        }
        var next = n._walkPath && n._walkPath[n._walkIndex];
        if (!next || Math.abs(next.cx - cx) + Math.abs(next.cy - cy) !== 1 || cellOccupied(next.cx, next.cy, n)) {
          n._walkPath = findNpcPath(n, cx, cy, tx, ty);
          n._walkIndex = 0;
          next = n._walkPath && n._walkPath[0];
        }
        if (!next) {
          n._walkTarget = null; n._walkPath = []; n._walkIndex = 0; n._walkFailed = true;
          warnOnce('npcpath:' + n.name + ':' + tx + ',' + ty, 'o NPC "' + n.name + '" não encontrou um caminho livre até a célula ' + tx + ',' + ty);
          return;
        }
        dx = next.cx - cx;
        dy = next.cy - cy;
        n._walkIndex += 1;
      } else if (n._wander) {
        n._wanderT = num(n._wanderT, 0) - dt;
        if (n._wanderT > 0) return;
        n._wanderT = 1 + gameRandom() * 2;
        var pick = Math.floor(gameRandom() * 4);
        dx = pick === 0 ? 1 : pick === 1 ? -1 : 0;
        dy = pick === 2 ? 1 : pick === 3 ? -1 : 0;
        if (!dx && !dy) return;
      } else return;
      var nx = cx + dx;
      var ny = cy + dy;
      if (cellOccupied(nx, ny, n)) return;
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
      ctx2d.font = 'bold 18px ' + _szGameUIFont;
      ctx2d.fillStyle = config.accent;
      ctx2d.fillText(m.title, bx + pad, ty + 14);
      ty += titleH;
    }
    rpg.menuRects = [];
    ctx2d.font = '18px ' + _szGameUIFont;
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
      rpg.flags = nameMap(data.flags); // save vem por JSON.parse (protótipo comum) -> normaliza
      // localStorage é editável pela criança/inspetor — um item sem name string
      // faria rpgDrawInventory/rpgHasItem estourar. Filtra os malformados.
      rpg.items = [];
      var restoredItems = nameMap();
      if (Array.isArray(data.items)) for (var ii = 0; ii < data.items.length; ii++) {
        var item = data.items[ii];
        if (!item || typeof item !== 'object' || typeof item.name !== 'string' || restoredItems[item.name]) continue;
        restoredItems[item.name] = true;
        rpg.items.push({ name: item.name, image: text(item.image, ''), qty: Math.max(1, Math.min(MAX_SAFE_GAME_INTEGER, Math.round(num(item.qty, 1)))) });
      }
      // O save é uma fronteira não confiável (localStorage pode ser editado).
      // Restabelece aqui os invariantes usados pela batalha; em especial,
      // maxXp positivo garante que o laço de subida de nível sempre progrida.
      rpg.playerMax = Math.max(1, Math.min(MAX_SAFE_GAME_INTEGER, num(data.max, rpg.playerMax)));
      rpg.playerHp = Math.max(0, Math.min(rpg.playerMax, num(data.hp, rpg.playerMax)));
      rpg.playerStr = Math.max(0, Math.min(MAX_SAFE_GAME_INTEGER, num(data.str, rpg.playerStr)));
      rpg.playerDef = Math.max(0, Math.min(MAX_SAFE_GAME_INTEGER, num(data.def, rpg.playerDef)));
      rpg.playerLevel = boundedInteger(data.lvl, rpg.playerLevel, 1, MAX_GAME_LEVEL);
      rpg.playerMaxXp = boundedInteger(data.maxXp, rpg.playerMaxXp, RPG_BASE_MAX_XP, MAX_SAFE_GAME_INTEGER);
      rpg.playerXp = Math.max(0, Math.min(rpg.playerMaxXp - 1, num(data.xp, rpg.playerXp)));
      // Consumíveis/habilidade (save antigo não tem: mantém o que já está em jogo).
      if (Array.isArray(data.potions)) {
        rpg.potions = [];
        for (var pi = 0; pi < data.potions.length; pi++) {
          var potion = data.potions[pi];
          if (potion && typeof potion === 'object' && typeof potion.name === 'string') {
            if (!pushRpgLimited(rpg.potions, { name: potion.name, heal: Math.max(1, num(potion.heal, 20)) }, MAX_RPG_POTIONS, 'potion', 'poções')) break;
          }
        }
      }
      rpg.playerEnergy = Math.max(0, Math.min(rpg.playerMaxEnergy, num(data.energy, rpg.playerEnergy)));
      rpg.playerPoison = Math.max(0, num(data.poison, 0));
      if (data.special && typeof data.special === 'object' && typeof data.special.name === 'string') {
        rpg.special = { name: data.special.name, dmg: Math.max(1, num(data.special.dmg, 12)), cost: Math.max(0, num(data.special.cost, 4)) };
      }
      // 👾 O time do Kit Monstrinhos volta junto. O localStorage é EDITÁVEL (pela
      // criança ou pelo inspetor), então cada indivíduo é validado — um registro
      // torto faria a batalha estourar depois, longe daqui.
      pkm.team = pkmRestoreTeam(data.pkmTeam);
      pkm.balls = pkmRestoreBalls(data.pkmBalls);
      pkm.battle = null;
      rpg.scene = null; rpg.recording = false; rpg.menu = null; rpg.battle = null; rpg.dialog = null;
      if (data.map) {
        rpgGoMap(data.map);
        if (rpg.hero) {
          rpg.hero.x = num(data.hx, 0) * tilePx;
          rpg.hero.y = num(data.hy, 0) * tilePx;
          // O save entra após a validação de rpgGoMap; valide de novo para também
          // sincronizar os campos usados pela varredura de colisão/movimento.
          rpgEnsureHeroSafe('save');
        }
      }
      // "Continuar" no meio de uma batalha: a batalha foi zerada acima — devolve o
      // jogo ao mundo, senão fica preso no estado 'batalha' sem nada a avançar.
      if (state === 'batalha') setState('jogando');
    } catch (e) { warn('não consegui carregar o jogo: ' + e); }
  }


  // ⚔️ Batalha por turnos RICA (Combatant/TurnCycle do Pizza, 1v1): Atacar/
  // Especial (energia)/Item (poção)/Defender/Fugir; defesa reduz o dano; XP sobe
  // de nível; veneno tira vida por turno. Dano = força ± 20% − defesa/2.
  function rollDamage(strength, targetDef) {
    var raw = Math.round(num(strength, 1) * (0.8 + gameRandom() * 0.4));
    return Math.max(1, raw - Math.floor(num(targetDef, 0) / 2));
  }
  // ---- ⚔️ Batalha em EQUIPE (canvas): combatentes clicáveis + painéis ----
  // Um COMBATENTE carrega os próprios atributos (o createCharacter não tem stats de
  // luta). O herói entra a partir dos rpg.player* (progressão persiste); aliados e
  // inimigos vêm de "Adicionar aliado/inimigo"; os golpes nomeados de "Ensinar o golpe".
  function makeBattler(name, side, hp, str, def, look, color, image) {
    var mx = Math.max(1, num(hp, 20));
    ensureImageLoaded(image); // a imagem do combatente (Pinta) carrega sozinha
    return {
      name: text(name, side === 'inimigo' ? 'Inimigo' : 'Aliado'), side: side,
      hp: mx, max: mx, str: Math.max(0, num(str, 5)), def: Math.max(0, num(def, 0)),
      energy: 10, maxEnergy: 10, moves: [],
      defending: false, poison: 0, regen: 0, blind: 0, alive: true,
      look: text(look, ''), color: text(color, side === 'inimigo' ? '#e05a5a' : '#4a9eff'),
      // 🖼️ Imagem do combatente (a que você "Carregou pelo nome"): drawEntity a usa;
      // sem imagem, cai no retângulo da cor. Só o herói herdava sprite — agora os
      // inimigos/aliados/chefões também podem ter arte do Pinta.
      image: text(image, ''), x: 0, y: 0, w: 72, h: 72
    };
  }
  function heroBattler() {
    var b = makeBattler('Você', 'aliado', rpg.playerMax, rpg.playerStr, rpg.playerDef, '', '#4a9eff');
    b.energy = rpg.playerMaxEnergy; b.maxEnergy = rpg.playerMaxEnergy; b.isHero = true;
    // A vida do herói PERSISTE entre batalhas: ele entra com a vida ATUAL, não cheia
    // (o endBattle grava de volta ao vencer). Piso 1 p/ um herói ferido ainda lutar;
    // b.max segue playerMax (subir de nível aumenta o máximo). "Curar o herói" recupera.
    b.hp = Math.max(1, Math.min(rpg.playerMax, num(rpg.playerHp, rpg.playerMax)));
    // O herói aparece com o SEU visual do mundo (sprite/vetor/cor), se existir.
    if (rpg.hero) { b.image = text(rpg.hero.image, ''); b.look = text(rpg.hero.look, ''); b.color = text(rpg.hero.color, b.color); }
    if (rpg.special) b.moves.push({ name: rpg.special.name, dmg: rpg.special.dmg, cost: rpg.special.cost, heal: false });
    var extra = rpg.movesByName['Você'];
    if (extra) for (var i = 0; i < extra.length; i++) b.moves.push(extra[i]);
    return b;
  }
  function defToBattler(def, side) {
    var b = makeBattler(def.name, side, def.hp, def.str, def.def, def.look, def.color, def.image);
    var mv = rpg.movesByName[def.name];
    if (mv) for (var i = 0; i < mv.length; i++) b.moves.push(mv[i]);
    if (def.boss) b.boss = true; // 👑 CHEFÃO: maior + barra proeminente
    return b;
  }
  function firstAlive(list) { for (var i = 0; i < list.length; i++) if (list[i].alive && list[i].hp > 0) return list[i]; return null; }
  function aliveList(list) { var out = []; for (var i = 0; i < list.length; i++) if (list[i].alive && list[i].hp > 0) out.push(list[i]); return out; }
  function nextAliveAfter(list, who) {
    var seen = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === who) { seen = true; continue; }
      if (seen && list[i].alive && list[i].hp > 0) return list[i];
    }
    return null;
  }
  function foeNames(b) {
    var out = '';
    for (var i = 0; i < b.foes.length; i++) out += (i ? ', ' : '') + b.foes[i].name;
    return out;
  }
  // 🧙 Kit RPG: montar o time. rpgAddAlly = party PERSISTENTE (o herói já entra
  // sozinho); rpgAddFoe = inimigos da PRÓXIMA batalha; rpgTeachMove = golpes nomeados.
  function pushRpgLimited(list, value, limit, key, label) {
    if (list.length >= limit) {
      warnOnce('rpg-limit:' + key, 'o Kit RPG aceita até ' + limit + ' ' + label);
      return false;
    }
    list.push(value);
    return true;
  }
  function rpgAddAlly(name, hp, str, def, color, image) {
    pushRpgLimited(rpg.allies, { name: text(name, 'Aliado'), hp: num(hp, 24), str: num(str, 6), def: num(def, 1), look: '', color: text(color, '#4ade80'), image: text(image, '') }, MAX_RPG_ALLIES, 'allies', 'aliados além do herói');
  }
  function rpgAddFoe(name, hp, str, def, color, image) {
    pushRpgLimited(rpg.foeQueue, { name: text(name, 'Inimigo'), hp: num(hp, 20), str: num(str, 5), def: num(def, 0), look: '', color: text(color, '#e05a5a'), image: text(image, '') }, MAX_RPG_FOE_QUEUE, 'foes', 'inimigos extras');
  }
  // 👑 O CHEFÃO: um inimigo da próxima batalha desenhado MAIOR, com barra proeminente.
  function rpgAddBoss(name, hp, str, def, image) {
    pushRpgLimited(rpg.foeQueue, { name: text(name, 'Chefão'), hp: num(hp, 120), str: num(str, 9), def: num(def, 2), look: '', color: '#b23b6e', boss: true, image: text(image, '') }, MAX_RPG_FOE_QUEUE, 'foes', 'inimigos extras');
  }
  // 👑 R30: ler a vida de um combatente (herói/aliado/inimigo) por NOME — a chave
  // das FASES de chefe ("se a vida do Chefe < metade: fica furioso").
  function findBattler(name) {
    var b = rpg.battle; if (!b) return null;
    var nm = text(name, '');
    for (var i = 0; i < b.allies.length; i++) if (b.allies[i].name === nm) return b.allies[i];
    for (var j = 0; j < b.foes.length; j++) if (b.foes[j].name === nm) return b.foes[j];
    return null;
  }
  function findFoe(name) {
    var b = rpg.battle; if (!b) return null;
    var nm = text(name, '');
    for (var i = 0; i < b.foes.length; i++) if (b.foes[i].name === nm) return b.foes[i];
    return null;
  }
  function activeFoe(name, action) {
    var nm = text(name, '');
    var f = findFoe(nm);
    if (f && f.alive) return f;
    warnOnce('foe:' + action + ':' + nm, 'o inimigo "' + nm + '" não está vivo nesta batalha');
    return null;
  }
  function battlerLife(name) { var c = findBattler(name); return c ? Math.max(0, c.hp) : 0; }
  function battlerMaxLife(name) { var c = findBattler(name); return c ? c.max : 0; }
  // 👑 IA de chefe: o corpo roda na vez daquele inimigo (no lugar do ataque padrão).
  function rpgOnFoeTurn(name, fn) {
    if (typeof fn !== 'function') return;
    rpg.foeTurnHooks[text(name, 'Inimigo')] = fn;
  }
  // O inimigo NOMEADO usa um golpe ENSINADO (dano num aliado ao acaso, ou cura nele).
  function rpgFoeUse(name, moveName) {
    if (!rpg.battle) return;
    var f = activeFoe(name, 'golpe'); if (!f) return;
    var mn = text(moveName, ''), mv = null;
    for (var i = 0; i < f.moves.length; i++) if (f.moves[i].name === mn) { mv = f.moves[i]; break; }
    if (!mv) { warnOnce('foeuse:' + f.name + mn, 'o inimigo "' + f.name + '" não tem o golpe "' + mn + '" — ensine com "Ensinar o golpe"'); return; }
    foeUseMove(f, mv);
  }
  // O golpe ASSINATURA de chefão: acerta TODO o time de uma vez.
  function rpgFoeHitAll(name, dmg) {
    var b = rpg.battle; if (!b) return;
    var f = activeFoe(name, 'area'); if (!f) return;
    var base = Math.max(0, num(dmg, 10));
    var allies = aliveList(b.allies);
    for (var i = 0; i < allies.length; i++) {
      var v = allies[i];
      var d = rollDamage(base, v.def);
      if (v.defending) d = Math.max(d > 0 ? 1 : 0, Math.round(d / 2));
      v.hp -= d;
      if (d > 0) floatText('-' + d, v.x + v.w / 2, v.y, '#ff6b6b', 22);
      if (v.hp <= 0) { v.hp = 0; v.alive = false; }
    }
    b.message = f.name + ' atingiu TODO o time!';
  }
  // Ensinar é IDEMPOTENTE: um golpe com o MESMO nome REPÕE o anterior em vez de
  // empilhar — assim re-ensinar no onGameStart (a cada "Jogar de novo")
  // não duplica os golpes, agora que eles PERSISTEM (ver rpgNewGame).
  function teachMoveTo(k, mv) {
    if (!rpg.movesByName[k]) rpg.movesByName[k] = [];
    var list = rpg.movesByName[k];
    for (var i = 0; i < list.length; i++) { if (list[i].name === mv.name) { list[i] = mv; return; } }
    list.push(mv);
  }
  function rpgTeachMove(who, moveName, dmg, cost) {
    teachMoveTo(text(who, 'Você'), { name: text(moveName, 'Golpe'), dmg: Math.max(1, num(dmg, 10)), cost: Math.max(0, num(cost, 3)), heal: false });
  }
  // Golpe de CURA (heal:true) — o painel de ação mostra "(cura N)" e o applyHeal
  // devolve vida ao próprio lutador em vez de ferir o inimigo.
  function rpgTeachHeal(who, moveName, amount, cost) {
    teachMoveTo(text(who, 'Você'), { name: text(moveName, 'Cura'), dmg: Math.max(1, num(amount, 12)), cost: Math.max(0, num(cost, 3)), heal: true });
  }
  function layoutRow(list, cy) {
    var n = list.length; if (n === 0) return;
    var sz = 72, boss = 112, gap = 28;
    var totalW = 0;
    for (var k = 0; k < n; k++) totalW += (list[k].boss ? boss : sz) + (k ? gap : 0);
    // Mesmo no menor canvas aceito, a fileira inteira permanece visível. Os
    // limites acima preservam tamanhos úteis; esta escala resolve larguras custom.
    var scale = Math.min(1, Math.max(1, config.w - 32) / totalW);
    var scaledGap = gap * scale;
    var x = (config.w - totalW * scale) / 2;
    for (var i = 0; i < n; i++) {
      var c = list[i];
      var s = (c.boss ? boss : sz) * scale;
      c.w = s; c.h = s; c.x = x; c.y = cy - s / 2; // topos alinhados; o chefão desce mais
      x += s + scaledGap;
    }
  }
  function layoutBattlers() {
    var b = rpg.battle; if (!b) return;
    layoutRow(b.foes, config.h * 0.30);
    layoutRow(b.allies, config.h * 0.66);
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
    pushRpgLimited(rpg.potions, { name: text(name, 'Poção'), heal: Math.max(1, num(heal, 20)) }, MAX_RPG_POTIONS, 'potion', 'poções');
  }
  // 🩸 Cura o herói ao MÁXIMO fora da batalha (a estalagem/save/checkpoint). Como a
  // vida agora PERSISTE entre lutas, é a forma de recuperar. Espelha o pkmHealTeam.
  function rpgHealHero() { rpg.playerHp = rpg.playerMax; }
  // Núcleo COMPARTILHADO: monta a batalha (herói + party × inimigo principal + fila) e
  // entra no estado 'batalha'. O mainFoe é um battler JÁ pronto (via defToBattler) — assim
  // o inimigo principal ganha imagem, chefão e golpes ensinados de graça, igual à fila.
  function startTeamBattle(mainFoe) {
    if (!canStartBattle('Kit RPG')) return;
    if (!ensureShell()) return;
    var allies = [heroBattler()];
    for (var i = 0; i < rpg.allies.length; i++) allies.push(defToBattler(rpg.allies[i], 'aliado'));
    var foes = [mainFoe];
    for (var j = 0; j < rpg.foeQueue.length; j++) foes.push(defToBattler(rpg.foeQueue[j], 'inimigo'));
    rpg.foeQueue = []; // a fila é consumida pela batalha
    rpg.battle = {
      allies: allies, foes: foes, phase: 'abrindo', actor: null, target: null,
      move: null, inspect: null, message: '', t: 0, foeIdx: 0
    };
    layoutBattlers();
    setState('batalha'); // estado do MEIO do jogo: congela o mundo SEM resetar
    // ⚡ Transição de ENTRADA (JRPG): a tela pisca branco e a cena de batalha EMERGE
    // do flash (fade começa coberto e clareia). stepScreenFx roda fora do gate de
    // estado, então anima já no 'batalha'; drawScreenFx é o último desenho (por cima).
    fadeScreen('#ffffff', 0.3, false);
  }
  // Constrói o inimigo PRINCIPAL a partir de um def-ish e o coloca na batalha. Reusa
  // defToBattler (imagem/chefão/golpes). Compartilhado por battle_start, battle_named e
  // o replay de cutscene.
  function startBattleFromDef(d) {
    if (rpg.recording) {
      rpg.sceneSteps.push({ type: 'battle', name: d.name, hp: d.hp, str: d.str, def: d.def, image: text(d.image, ''), color: text(d.color, ''), boss: !!d.boss });
      return;
    }
    startTeamBattle(defToBattler(d, 'inimigo'));
  }
  function rpgBattleStart(name, hp, str, def, image) {
    startBattleFromDef({ name: text(name, 'Inimigo'), hp: num(hp, 20), str: num(str, 5), def: num(def, 0), image: text(image, ''), color: '#e05a5a' });
  }
  // ⚔️ Ficha REUTILIZÁVEL: define o inimigo/chefão UMA vez, com imagem e atributos.
  function rpgDefineBattler(name, hp, str, def, image, color, boss) {
    var nm = text(name, 'Inimigo');
    ensureImageLoaded(image); // pré-carrega no setup (a tela de carregando espera)
    rpg.battlerDefs[nm] = {
      name: nm, hp: num(hp, 20), str: num(str, 5), def: num(def, 0),
      image: text(image, ''), color: text(color, boss ? '#b23b6e' : '#e05a5a'), boss: !!boss
    };
  }
  function rpgFindDef(name) {
    var d = rpg.battlerDefs[text(name, '')];
    if (!d) warnOnce('battlerdef:' + text(name, ''), 'a ficha do inimigo "' + text(name, '') + '" não existe — crie com "Criar a ficha do inimigo"');
    return d || null;
  }
  // Enfileira um inimigo A PARTIR DA FICHA (a "escolha" de quem entra na próxima batalha).
  function rpgAddFoeNamed(name) {
    var d = rpgFindDef(name); if (!d) return;
    pushRpgLimited(rpg.foeQueue, { name: d.name, hp: d.hp, str: d.str, def: d.def, image: d.image, color: d.color, boss: d.boss }, MAX_RPG_FOE_QUEUE, 'foes', 'inimigos extras');
  }
  // Começa a batalha ESCOLHENDO uma ficha como inimigo principal (o que a criança pediu).
  function rpgBattleNamed(name) {
    var d = rpgFindDef(name); if (!d) return;
    startBattleFromDef(d);
  }
  // A vez de um aliado: abre o painel de ação (o menu do motor) para o jogador escolher.
  function startAllyTurn(actor) {
    var b = rpg.battle; if (!b) return;
    if (!actor) { startFoesTurn(); return; }
    b.actor = actor; b.inspect = actor; b.move = null; b.target = null;
    b.phase = 'escolha'; b.t = 0;
    openActionMenu(actor);
  }
  function openActionMenu(actor) {
    var opts = [];
    opts.push({ label: 'Atacar (força)', fn: function () { chooseMove(null); } });
    for (var i = 0; i < actor.moves.length; i++) {
      (function (mv) {
        var lbl = mv.name + (mv.heal ? ' (cura ' + mv.dmg : ' (dano ' + mv.dmg) + ', energia ' + mv.cost + ')';
        opts.push({ label: lbl, fn: function () { chooseMove(mv); } });
      })(actor.moves[i]);
    }
    opts.push({ label: 'Defender (dano pela metade)', fn: function () { actor.defending = true; resolveNoTarget(actor.name + ' se defendeu.'); } });
    if (rpg.potions.length > 0) opts.push({ label: 'Item (poção)', fn: function () { useItem(actor); } });
    opts.push({ label: 'Fugir', fn: function () { tryFlee(); } });
    rpg.menu = { title: 'Vez de ' + actor.name + '  —  vida ' + Math.max(0, actor.hp) + '/' + actor.max + '  energia ' + actor.energy, options: opts, index: 0 };
  }
  function chooseMove(mv) {
    var b = rpg.battle; if (!b || !b.actor) return;
    if (mv && b.actor.energy < mv.cost) { b.message = 'Sem energia para ' + mv.name + '!'; openActionMenu(b.actor); return; }
    b.move = mv;
    if (mv && mv.heal) { applyHeal(b.actor, mv); return; }
    var foes = aliveList(b.foes);
    if (foes.length === 1) { b.target = foes[0]; applyPlayerHit(); return; }
    // Vários inimigos: entra na MIRA (clicar/tecla escolhe o alvo).
    rpg.menu = null; b.phase = 'mira'; b.t = 0;
    b.message = b.actor.name + ': escolha o alvo (clique num inimigo ou aperte espaço).';
  }
  function applyPlayerHit() {
    var b = rpg.battle; if (!b) return;
    var a = b.actor, tgt = b.target, mv = b.move;
    if (!a || !tgt) return;
    if (mv) a.energy = Math.max(0, a.energy - mv.cost);
    var dmg = rollDamage(mv ? mv.dmg : a.str, tgt.def);
    if (a.blind > 0) { a.blind -= 1; if (gameRandom() < 0.33) dmg = 0; }
    tgt.hp -= dmg;
    if (dmg > 0) { floatText('-' + dmg, tgt.x + tgt.w / 2, tgt.y, '#ffd166', 26); b.message = a.name + (mv ? ' usou ' + mv.name + ' e causou ' : ' causou ') + dmg + ' em ' + tgt.name + '!'; }
    else b.message = a.name + ' se atrapalhou e errou!';
    if (tgt.hp <= 0) { tgt.hp = 0; tgt.alive = false; b.message += ' ' + tgt.name + ' caiu!'; }
    rpg.menu = null; b.phase = 'anima'; b.t = 0;
  }
  function applyHeal(a, mv) {
    var b = rpg.battle; if (!b) return;
    a.energy = Math.max(0, a.energy - mv.cost);
    a.hp = Math.min(a.max, a.hp + mv.dmg);
    floatText('+' + mv.dmg, a.x + a.w / 2, a.y, '#4ade80', 26);
    b.message = a.name + ' usou ' + mv.name + ' (+' + mv.dmg + ' de vida).';
    rpg.menu = null; b.phase = 'anima'; b.t = 0;
  }
  function resolveNoTarget(msg) {
    var b = rpg.battle; if (!b) return;
    b.message = msg; rpg.menu = null; b.phase = 'anima'; b.t = 0;
  }
  function useItem(a) {
    if (rpg.potions.length === 0) { openActionMenu(a); return; }
    var p = rpg.potions.shift();
    a.hp = Math.min(a.max, a.hp + p.heal);
    floatText('+' + p.heal, a.x + a.w / 2, a.y, '#4ade80', 26);
    resolveNoTarget(a.name + ' usou ' + p.name + ' (+' + p.heal + ' de vida).');
  }
  function tryFlee() {
    if (gameRandom() < 0.5) { rpg.menu = null; endBattle(false); return; }
    resolveNoTarget('Não deu para fugir!');
  }
  // Depois de um aliado agir (anima): próximo aliado, ou a vez dos inimigos.
  function afterAction() {
    var b = rpg.battle; if (!b) return;
    if (aliveList(b.foes).length === 0) { winBattle(); return; }
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
    var next = nextAliveAfter(b.allies, b.actor);
    if (next) { startAllyTurn(next); return; }
    startFoesTurn();
  }
  function startFoesTurn() {
    var b = rpg.battle; if (!b) return;
    b.phase = 'foes'; b.t = 0; b.actor = null; b.target = null; b.foeIdx = 0; rpg.menu = null;
    b.message = 'Vez dos inimigos...';
  }
  // Um inimigo ATACA um aliado vivo ao acaso (com um golpe, ou pela força).
  function foeHit(f, mv) {
    var b = rpg.battle; if (!b) return;
    var allies = aliveList(b.allies);
    if (allies.length === 0) { loseBattle(); return; }
    var victim = allies[Math.floor(gameRandom() * allies.length)];
    var dmg = rollDamage(mv ? mv.dmg : f.str, victim.def);
    if (f.blind > 0) { f.blind -= 1; if (gameRandom() < 0.33) dmg = 0; }
    if (victim.defending) dmg = Math.max(dmg > 0 ? 1 : 0, Math.round(dmg / 2));
    victim.hp -= dmg;
    if (dmg > 0) floatText('-' + dmg, victim.x + victim.w / 2, victim.y, '#ff6b6b', 24);
    b.message = mv ? (f.name + ' usou ' + mv.name + ' e causou ' + dmg + ' em ' + victim.name + '!')
                   : (f.name + ' atacou ' + victim.name + ' (' + dmg + ').');
    if (victim.hp <= 0) { victim.hp = 0; victim.alive = false; b.message += ' ' + victim.name + ' caiu!'; }
  }
  function foeHeal(f, mv) {
    var b = rpg.battle; if (!b) return;
    f.hp = Math.min(f.max, f.hp + mv.dmg);
    floatText('+' + mv.dmg, f.x + f.w / 2, f.y, '#4ade80', 22);
    b.message = f.name + ' usou ' + mv.name + ' (+' + mv.dmg + ' de vida).';
  }
  function foeUseMove(f, mv) {
    var b = rpg.battle; if (!b) return false;
    if (f.energy < mv.cost) {
      b.message = f.name + ' está sem energia para ' + mv.name + '!';
      return false;
    }
    f.energy = Math.max(0, f.energy - mv.cost);
    if (mv.heal) foeHeal(f, mv); else foeHit(f, mv);
    return true;
  }
  // A vez de um inimigo por tique. ⭐ R30 fix: o inimigo USA os golpes ensinados
  // (antes ignorava f.moves e só batia pela força — golpe/cura/AoE de chefe eram
  // impossíveis). Modelo do pkmEnemyTurn. E o hook de IA de chefe manda, se houver.
  function foeStep() {
    var b = rpg.battle; if (!b) return;
    var foes = aliveList(b.foes);
    if (b.foeIdx >= foes.length) { endRound(); return; }
    var f = foes[b.foeIdx]; b.foeIdx += 1;
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
    var hook = rpg.foeTurnHooks[f.name];
    if (hook) {
      try { hook(); } catch (e) { warn('erro na vez de ' + f.name + ': ' + e); }
    } else {
      var available = [];
      for (var i = 0; f.moves && i < f.moves.length; i++) if (f.moves[i].cost <= f.energy) available.push(f.moves[i]);
      var mv = available.length ? available[Math.floor(gameRandom() * available.length)] : null;
      if (mv) foeUseMove(f, mv); else foeHit(f, null);
    }
    b.t = 0;
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
  }
  function endRound() {
    var b = rpg.battle; if (!b) return;
    tickSide(b.allies);
    tickSide(b.foes);
    for (var i = 0; i < b.allies.length; i++) b.allies[i].defending = false;
    if (aliveList(b.foes).length === 0) { winBattle(); return; }
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
    startAllyTurn(firstAlive(b.allies));
  }
  function tickSide(list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c.alive) continue;
      if (c.poison > 0) { c.hp -= 3; c.poison -= 1; floatText('-3', c.x + c.w / 2, c.y, '#a855f7', 18); }
      if (c.regen > 0) { c.hp = Math.min(c.max, c.hp + 3); c.regen -= 1; }
      c.energy = Math.min(c.maxEnergy, c.energy + 2);
      if (c.hp <= 0) { c.hp = 0; c.alive = false; }
    }
  }
  function winBattle() { rpg.menu = null; endBattle(true); }
  function loseBattle() { rpg.menu = null; endBattle(false); }
  // O laço da batalha (roda FORA do gate de estado, como o do Kit Monstrinhos).
  function stepRpgBattle(dt) {
    var b = rpg.battle; if (!b || state !== 'batalha') return;
    playTime += dt;
    stepUiInput();      // teclado do painel de ação (setas + espaço)
    stepTweens(dt); stepParticles(dt); stepFloaties(dt);
    b.t += dt;
    if (b.phase === 'abrindo') {
      if (b.t < 0.4) return;
      b.message = 'Batalha! Seu time contra ' + foeNames(b) + '.';
      startAllyTurn(firstAlive(b.allies));
      return;
    }
    if (b.phase === 'escolha') {
      // Rede anti-softlock: sem menu aberto e ainda é a vez do aliado → reabre.
      if (!rpg.menu && b.actor) openActionMenu(b.actor);
      return;
    }
    if (b.phase === 'mira') {
      // Esc/voltar: desiste da mira e reabre o painel de ação (escolher outra coisa).
      if (justPressed.escape) { b.phase = 'escolha'; b.t = 0; openActionMenu(b.actor); return; }
      // Clique escolhe o alvo (rpgBattleClick); espaço mira o 1º inimigo vivo.
      if (justPressed[' ']) { var f = firstAlive(b.foes); if (f) { b.target = f; applyPlayerHit(); } }
      return;
    }
    if (b.phase === 'anima') { if (b.t < 0.55) return; afterAction(); return; }
    if (b.phase === 'foes') { if (b.t < 0.5) return; foeStep(); return; }
  }
  // Clique DENTRO da batalha: o painel de ação tem prioridade; senão, clicar num
  // combatente o INSPECIONA (painel de info) e, na mira, escolhe o alvo inimigo.
  function rpgBattleClick(x, y) {
    var b = rpg.battle; if (!b) return;
    if (rpg.menu) {
      for (var i = 0; i < rpg.menuRects.length; i++) {
        var r = rpg.menuRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { rpg.menu.index = r.index; selectMenu(); return; }
      }
    }
    var who = battlerAt(x, y);
    if (who) {
      b.inspect = who;
      if (b.phase === 'mira' && who.side === 'inimigo' && who.alive) { b.target = who; applyPlayerHit(); }
    }
  }
  function battlerAt(x, y) {
    var b = rpg.battle; if (!b) return null;
    var i;
    for (i = 0; i < b.foes.length; i++) { var f = b.foes[i]; if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) return f; }
    for (i = 0; i < b.allies.length; i++) { var a = b.allies[i]; if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return a; }
    return null;
  }
  // ---- Desenho da batalha em equipe (canvas) ----
  function drawRpgBattle() {
    var b = rpg.battle; if (!b || !ctx2d) return;
    ctx2d.fillStyle = '#242a44'; ctx2d.fillRect(0, 0, config.w, config.h);
    ctx2d.fillStyle = 'rgba(0,0,0,0.18)'; ctx2d.fillRect(0, config.h * 0.5, config.w, config.h * 0.5);
    drawBattlerRow(b.foes, b);
    drawBattlerRow(b.allies, b);
    drawBattleMessage(b);
    drawBattleInfo(b);
    drawEffects(); // faíscas + números de dano por cima da cena
  }
  function drawBattlerRow(list, b) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var prev = 1;
      if (!c.alive) { try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = 0.3; } catch (e) {} }
      drawEntity(c);
      if (!c.alive) { try { ctx2d.globalAlpha = prev; } catch (e) {} }
      // Destaque: amarelo = quem age; branco = clicado (info); vermelho = alvos na mira.
      var ring = null, lw = 2;
      if (c === b.actor && (b.phase === 'escolha' || b.phase === 'mira')) { ring = '#ffd166'; lw = 4; }
      else if (c === b.inspect) { ring = '#ffffff'; lw = 3; }
      else if (b.phase === 'mira' && c.side === 'inimigo' && c.alive) { ring = '#ff6b6b'; lw = 2; }
      if (c === b.target && b.phase === 'mira') { ring = '#ff3b3b'; lw = 4; }
      if (ring) {
        ctx2d.save();
        ctx2d.strokeStyle = ring; ctx2d.lineWidth = lw;
        ctx2d.strokeRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8);
        ctx2d.restore();
      }
      ctx2d.save();
      ctx2d.fillStyle = c.alive ? '#ffffff' : '#ff8080';
      // 👑 O chefão ganha nome maior (com coroa) e barra de vida mais grossa.
      ctx2d.font = (c.boss ? 'bold 17px ' : '13px ') + _szGameUIFont; ctx2d.textAlign = 'center';
      ctx2d.fillText((c.boss ? '👑 ' : '') + c.name, c.x + c.w / 2, c.y - 10);
      ctx2d.restore();
      var bh = c.boss ? 12 : 7;
      drawBar(Math.max(0, c.hp), c.max, c.x, c.y + c.h + 4, c.w, bh, c.hp > c.max * 0.3 ? '#4ade80' : '#ef4444');
    }
  }
  function drawBattleMessage(b) {
    if (!b.message) return;
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0,0,0,0.7)'; ctx2d.fillRect(0, 0, config.w, 34);
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '15px ' + _szGameUIFont; ctx2d.textAlign = 'left';
    ctx2d.fillText(b.message, 14, 22);
    ctx2d.restore();
  }
  // Painel de INFORMAÇÕES do selecionado: dano, vida/energia e os atributos.
  function drawBattleInfo(b) {
    var c = b.inspect || b.actor; if (!c) return;
    var lines = [];
    lines.push('Vida: ' + Math.max(0, c.hp) + ' / ' + c.max);
    lines.push('Energia: ' + c.energy + ' / ' + c.maxEnergy);
    lines.push('Força: ' + c.str + '     Defesa: ' + c.def);
    if (c.moves && c.moves.length) {
      var mv = 'Golpes: ';
      for (var i = 0; i < c.moves.length; i++) mv += (i ? ', ' : '') + c.moves[i].name + ' (' + c.moves[i].dmg + ')';
      lines.push(mv);
    }
    var st = '';
    if (c.poison > 0) st += 'veneno ';
    if (c.regen > 0) st += 'regenera ';
    if (c.blind > 0) st += 'atrapalhado ';
    if (c.defending) st += 'defendendo ';
    if (st) lines.push('Estado: ' + st);
    var pad = 12, w = 280, x = config.w - w - 16, y = 44;
    var h = 30 + lines.length * 20 + pad;
    ctx2d.save();
    ctx2d.textAlign = 'left';
    ctx2d.fillStyle = 'rgba(0,0,0,0.8)'; ctx2d.fillRect(x, y, w, h);
    ctx2d.strokeStyle = c.side === 'inimigo' ? '#ff6b6b' : '#7dd3fc'; ctx2d.lineWidth = 2; ctx2d.strokeRect(x, y, w, h);
    ctx2d.fillStyle = '#ffd166'; ctx2d.font = 'bold 15px ' + _szGameUIFont;
    ctx2d.fillText(c.name + (c.side === 'inimigo' ? '  (inimigo)' : '  (do seu time)'), x + pad, y + 22);
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '13px ' + _szGameUIFont;
    for (var j = 0; j < lines.length; j++) ctx2d.fillText(lines[j], x + pad, y + 44 + j * 20);
    ctx2d.restore();
  }
  /** Ganhar XP (após a batalha): sobe de nível, aumenta atributos e cura. */
  function rpgBattleReward(xp) {
    rpg.playerLevel = boundedInteger(rpg.playerLevel, 1, 1, MAX_GAME_LEVEL);
    rpg.playerMaxXp = boundedInteger(rpg.playerMaxXp, RPG_BASE_MAX_XP, RPG_BASE_MAX_XP, MAX_SAFE_GAME_INTEGER);
    var currentXp = Math.max(0, Math.min(MAX_SAFE_GAME_INTEGER, num(rpg.playerXp, 0)));
    var earnedXp = Math.max(0, Math.min(MAX_SAFE_GAME_INTEGER, num(xp, 0)));
    rpg.playerXp = Math.min(MAX_SAFE_GAME_INTEGER, currentXp + earnedXp);
    var subiu = false;
    while (rpg.playerLevel < MAX_GAME_LEVEL && rpg.playerXp >= rpg.playerMaxXp) {
      rpg.playerXp -= rpg.playerMaxXp;
      rpg.playerLevel += 1;
      rpg.playerMax = Math.min(MAX_SAFE_GAME_INTEGER, rpg.playerMax + 8);
      rpg.playerStr = Math.min(MAX_SAFE_GAME_INTEGER, rpg.playerStr + 2);
      rpg.playerDef = Math.min(MAX_SAFE_GAME_INTEGER, rpg.playerDef + 1);
      rpg.playerMaxXp = boundedInteger(rpg.playerMaxXp * 1.4, RPG_BASE_MAX_XP, RPG_BASE_MAX_XP, MAX_SAFE_GAME_INTEGER);
      subiu = true;
    }
    if (rpg.playerLevel >= MAX_GAME_LEVEL) rpg.playerXp = Math.min(rpg.playerXp, rpg.playerMaxXp - 1);
    if (subiu) {
      rpg.playerHp = rpg.playerMax; // curou ao subir de nível
      emit('subiu:nivel');
    }
  }
  /** Status de batalha (Pizza Legends): who = 'inimigo'/'heroi'; por N turnos.
   * veneno = −3/turno · regenera = +3/turno · atrapalha = 33% de errar o golpe.
   * No time: 'heroi' aplica no herói (1º aliado); 'inimigo' no 1º inimigo vivo. */
  function rpgInflict(who, status, turns) {
    var t = Math.max(1, Math.round(num(turns, 3)));
    var heroi = (text(who, 'inimigo') === 'heroi' || text(who, 'inimigo') === 'herói');
    var s = text(status, 'veneno');
    if (!rpg.battle) {
      warnOnce('inflict', '"Aplicar veneno/regenerar/atrapalhar" só funciona DENTRO de uma batalha (dá o status a quem está lutando)');
      return;
    }
    var target = heroi ? rpg.battle.allies[0] : firstAlive(rpg.battle.foes);
    if (!target) return;
    if (s === 'regenera') target.regen = t;
    else if (s === 'atrapalha') target.blind = t;
    else target.poison = t; // veneno (padrão; o parser barra status desconhecido na Ponte)
  }
  function endBattle(won) {
    rpg.battleWon = won === true;
    // A vida do herói PERSISTE. Se ele SOBREVIVEU (venceu OU fugiu vivo), carrega a
    // vida que sobrou p/ a próxima luta. Se MORREU (perdeu), volta cheio — derrota =
    // recomeço, sem soft-lock (não há cura automática no mundo; use "Curar o herói").
    if (rpg.battle) {
      var hero = null, al = rpg.battle.allies;
      for (var h = 0; h < al.length; h++) { if (al[h].isHero) { hero = al[h]; break; } }
      if (!hero && al.length) hero = al[0];
      if (hero) rpg.playerHp = hero.hp > 0 ? Math.max(0, Math.round(hero.hp)) : rpg.playerMax;
    }
    rpg.battle = null;
    setState('jogando'); // vindo de 'batalha' o mundo NÃO reseta (ver setState)
    fadeScreen('#000000', 0.25, false); // 🎬 SAÍDA: o mundo reaparece emergindo do escuro (como o pkm)
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
    if (!src) { warn('o som "' + a + '" não está no projeto. Importe em "Sons", no menu ⋯'); return; }
    var loaded = sounds[key];
    if (loaded && loaded._szgkSrc === src) return;
    if (loaded) {
      try { loaded.pause(); loaded.currentTime = 0; } catch (e) {}
    }
    pending.push(new Promise(function (resolve) {
      try {
        // fallback: se nunca disparar canplaythrough, não travar o start
        var timer = setTimeout(resolve, 3000);
        var done = function () { clearTimeout(timer); resolve(); };
        var audio = new Audio();
        audio.preload = 'auto';
        audio.oncanplaythrough = done;
        audio.onerror = function () { warn('o som "' + key + '" falhou ao carregar'); done(); };
        audio._szgkSrc = src;
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
  // Osciladores não são HTMLAudioElement e, sem este registro, continuavam
  // tocando depois de "Jogar de novo". Cada partida é dona dos seus tons.
  var activeTones = [];
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
  function releaseTone(record) {
    var index = activeTones.indexOf(record);
    if (index >= 0) activeTones.splice(index, 1);
    try { record.osc.onended = null; record.osc.disconnect(); } catch (e) {}
    try { record.gain.disconnect(); } catch (e) {}
  }
  function stopProjectTones() {
    var owned = activeTones.slice();
    activeTones.length = 0;
    for (var i = 0; i < owned.length; i++) {
      var record = owned[i];
      try { record.osc.onended = null; record.osc.stop(_audioCtx ? _audioCtx.currentTime : 0); } catch (e) {}
      try { record.osc.disconnect(); } catch (e) {}
      try { record.gain.disconnect(); } catch (e) {}
    }
  }
  function playTone(freq, ms) {
    var ac = ensureAudioCtx();
    if (!ac) return;
    try { if (ac.state === 'suspended') ac.resume(); } catch (e) {}
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = Math.max(20, Math.min(20000, num(freq, 440)));
      gain.gain.value = 0.06;
      osc.connect(gain); gain.connect(ac.destination);
      var dur = Math.max(0.01, Math.min(60, num(ms, 200) / 1000));
      var record = { osc: osc, gain: gain };
      activeTones.push(record);
      osc.onended = function () { releaseTone(record); };
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
    var firstState = bootState || 'menu';
    started = true;
    bindInput();
    resizeCanvas();
    window.addEventListener('resize', function () { resizeCanvas(); });
    setState('carregando');
    Promise.all(pending.slice()).then(function () {
      if (firstState === 'jogando' && !rpg.currentMap) rpgEnterInitialMap();
      setState(firstState);
      lastTime = now();
      requestAnimationFrame(gameLoop);
    });
  }

  // Cada domínio declara o estado e os registros que possui. O orquestrador de
  // restart apenas dispara a fase certa; novos kits não dependem de um checklist
  // central que pode esquecer recursos ao crescer.
  _registerRuntimeDomain('stage-backdrop', {
    // resetProject, NAO 'reset': a gk so dispara resetGame/resetProject/
    // projectReady. Um hook com nome que ninguem chama nao limpa nada e ainda
    // parece que limpa. O cenario e' registro de PROJETO (vem do "Ao iniciar"),
    // entao some quando o programa roda de novo, como os demais deste grupo.
    resetProject: function () { _backdropName = ''; }
  });
  _registerRuntimeDomain('core', {
    resetGame: resetCoreGameData,
    resetProject: resetCoreProjectRegistrations
  });
  _registerRuntimeDomain('cards', {
    resetGame: cardsNewGame,
    resetProject: cardsResetProject,
    projectReady: cardsProjectReady
  });
  _registerRuntimeDomain('luta', { resetGame: lutaNewGame });
  _registerRuntimeDomain('nave', { resetGame: naveNewGame });
  _registerRuntimeDomain('tower-defense', {
    resetGame: tdNewGame,
    resetProject: tdResetProject
  });
  _registerRuntimeDomain('rpg', {
    resetGame: rpgNewGame,
    resetProject: rpgResetProject
  });
  _registerRuntimeDomain('project-resources', {
    resetProject: resetProjectOwnedResources
  });
  _registerRuntimeDomain('campaign', {
    resetGame: resetCampaignGame,
    resetProject: resetCampaignProject
  });

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

/**
* @param {import('../scene-2d/host').SceneHost} host
* @returns {import('../scene-2d/contract').SceneTwoDApi & { reset(): void }}
*/
function createScene2D(host) {
var layers = new Map(), tracks = new Map(), warnings = new Set(), sequence = 0;
var backLayers = [], frontLayers = [], stale = true;
function warn(message, reserved) {
if (warnings.has(message)) return;
if (warnings.size < (reserved ? 128 : 64)) { warnings.add(message); host.warn(message); }
}
function finite(values) { return values.every(Number.isFinite); }
function key(value) {
if (Number.isFinite(value)) value = String(value);
if (typeof value !== 'string') return '';
value = value.trim();
return value.length > 0 && value.length <= 200 ? value : '';
}
function layer(name) {
var value = layers.get(key(name));
if (!value) warn('A camada “' + String(name) + '” ainda não existe. Use antes o bloco “Adicionar cenário”.');
return value;
}
function track(name) {
var value = tracks.get(key(name));
if (!value) warn('A pista “' + String(name) + '” ainda não existe. Use antes o bloco “Criar pista para o fundo”.');
return value;
}
function rebuilt(old, message) {
var now = Date.now();
var streak = old && now - old.born < 120 ? old.streak + 1 : 0;
if (streak === 90) warn(message, true);
return { born: now, streak: streak };
}
function repeatMode(value) {
return value === 'x' || value === 'y' || value === 'both' ? value : value === 'none' ? 'none' : '';
}
function byOrder(a, b) { return a.order - b.order || a.sequence - b.sequence; }
function layersOf(pass) {
if (stale) {
backLayers.length = 0; frontLayers.length = 0;
layers.forEach(function (l) { (l.pass === 'front' ? frontLayers : backLayers).push(l); });
backLayers.sort(byOrder); frontLayers.sort(byOrder);
stale = false;
}
return pass === 'front' ? frontLayers : backLayers;
}
function projection(t, x, z) {
var distance = z - t.z + t.follow;
if (!finite([x, z, distance]) || distance < t.near || distance > t.far) return null;
var scale = t.focal / distance;
var screenX = host.width() / 2 + (x - t.x) * scale;
var screenY = host.height() * t.horizon / 100 + t.height * scale;
return finite([screenX, screenY, scale]) ? { x: screenX, y: screenY, scale: scale } : null;
}
function withScreen(draw) {
var ctx = host.context();
if (!ctx) return;
ctx.save();
try { host.screen(ctx); draw(ctx); } finally { ctx.restore(); }
}
var api = {
reset: function () {
layers.clear(); tracks.clear(); warnings.clear(); sequence = 0; stale = true;
},
createSceneLayer: function (name, image, pass) {
var id = key(name), source = key(image);
if (!id || !source || (pass !== 'back' && pass !== 'front')) { warn('“Adicionar cenário” precisa de um nome, de uma imagem do projeto e do plano fundo ou frente.'); return; }
var old = layers.get(id);
if (!old && layers.size >= 64) { warn('Só cabem 64 camadas. Reduza a quantidade de cenários.'); return; }
var life = rebuilt(old, '“Adicionar cenário” está rodando a cada quadro e a camada “' + id + '” volta ao começo toda vez. Deixe esse bloco em “Ao iniciar”.');
layers.set(id, { name: id, image: source, pass: pass, x: 0, y: 0, scale: 1, opacity: 1,
space: 'screen', fx: 1, fy: 1, repeat: 'none', order: 0, visible: true,
sequence: old ? old.sequence : sequence++, born: life.born, streak: life.streak });
stale = true;
host.image(source);
},
transformSceneLayer: function (name, x, y, scale, opacity) {
var l = layer(name); if (!l) return;
if (!finite([x, y, scale, opacity]) || scale <= 0) { warn('O cenário precisa de posição e tamanho finitos, com tamanho maior que zero.'); return; }
l.x = x; l.y = y; l.scale = scale; l.opacity = Math.max(0, Math.min(1, opacity));
},
motionSceneLayer: function (name, space, fx, fy, repeat) {
var l = layer(name); if (!l) return;
var mode = repeatMode(repeat);
if (['screen', 'world', 'parallax'].indexOf(space) < 0 || !finite([fx, fy]) || !mode) { warn('Escolha como o cenário acompanha o jogador e como sua imagem se repete.'); return; }
l.space = space; l.fx = fx; l.fy = fy; l.repeat = mode;
},
orderSceneLayer: function (name, order) {
var l = layer(name); if (!l) return;
if (!finite([order])) { warn('A posição do cenário na composição precisa ser um número finito.'); return; }
l.order = order; stale = true;
},
drawSceneLayers: function (pass) {
if (pass !== 'back' && pass !== 'front') return;
var list = layersOf(pass);
if (!list.length && pass === 'front') return;
withScreen(function (ctx) {
var cam = host.camera(), width = host.width(), height = host.height();
for (var index = 0; index < list.length; index++) {
var l = list[index];
if (!l.visible || l.opacity === 0) continue;
var img = host.image(l.image); if (!img) continue;
var w = (img.naturalWidth || img.width) * l.scale, h = (img.naturalHeight || img.height) * l.scale;
if (!finite([w, h]) || w <= 0 || h <= 0) continue;
var x = l.x, y = l.y;
if (l.space !== 'screen') { x -= cam.x * (l.space === 'world' ? 1 : l.fx); y -= cam.y * (l.space === 'world' ? 1 : l.fy); }
if (!finite([x, y])) { warn('A posição da camada “' + l.name + '” passou do limite dos números. Confira os fatores e a câmera.'); continue; }
var acrossX = l.repeat === 'x' || l.repeat === 'both', acrossY = l.repeat === 'y' || l.repeat === 'both';
var cols = 1, rows = 1;
if (acrossX) { x = ((x % w) + w) % w; if (x > 0) x -= w; cols = Math.ceil((width - x) / w); }
if (acrossY) { y = ((y % h) + h) % h; if (y > 0) y -= h; rows = Math.ceil((height - y) / h); }
if (cols * rows > 4096) { warn('A camada “' + l.name + '” precisaria de mais de 4096 cópias para cobrir a tela. Use uma imagem maior ou escolha cobrir a tela.'); continue; }
ctx.save();
try {
ctx.globalAlpha *= l.opacity;
if (host.smoothing) host.smoothing(ctx, img, w);
for (var row = 0; row < rows; row++) for (var col = 0; col < cols; col++) ctx.drawImage(img, x + col * w, y + row * h, w, h);
} finally { ctx.restore(); }
}
});
},
createTrack: function (name, horizon, focal, height, follow) {
var id = key(name);
if (!id || !finite([horizon, focal, height, follow]) || horizon < 0 || horizon > 100 || focal <= 0 || height <= 0 || follow <= 0) { warn('Não consegui preparar a vista da pista. Escolha uma das vistas disponíveis.'); return; }
var old = tracks.get(id);
if (!old && tracks.size >= 16) { warn('Só cabem 16 pistas ao mesmo tempo.'); return; }
var life = rebuilt(old, '“Criar pista para o fundo” está rodando a cada quadro e a pista “' + id + '” recomeça vazia toda vez. Deixe esse bloco em “Ao iniciar” ou em uma função chamada só para recomeçar.');
tracks.set(id, { horizon: horizon, focal: focal, height: height, follow: follow,
near: 1, far: 10000, x: 0, z: 0, previous: 0, born: life.born, streak: life.streak });
},
viewTrack: function (name, near, far) {
var t = track(name); if (!t) return;
if (!finite([near, far]) || near <= 0 || far <= near) { warn('Não consegui ajustar o alcance da pista. Escolha uma das vistas disponíveis.'); return; }
t.near = near; t.far = far;
},
cameraTrack: function (name, x, z) {
var t = track(name); if (!t) return;
if (!finite([x, z])) { warn('A posição da pista precisa de números finitos. Confira a lateral e a distância.'); return; }
t.x = x;
if (z !== t.z) { t.z = z; t.previous = z; }
},
advanceTrack: function (name, distance) {
var t = track(name); if (!t) return;
if (!finite([distance, t.z + distance])) { warn('A distância da pista passou do limite dos números. Reduza a velocidade ou a distância.'); return; }
t.previous = t.z; t.z += distance;
},
projectTrack: function (name, x, z, property) {
var t = track(name), p = t && projection(t, x, z);
if (!p) return 0;
return property === 'visible' ? 1 : property === 'x' ? p.x : property === 'y' ? p.y : property === 'scale' ? p.scale : 0;
},
};
return api;
}
var _sceneCamera = { x: 0, y: 0 };
var _scene2d = createScene2D({
context: function () { return ctx2d; }, width: function () { return config.w; }, height: function () { return config.h; },
image: function (name) {
ensureImageLoaded(name);
var h = images[name];
if (!h && !resolveAsset(name)) warnOnce('scene-img:' + name, 'a imagem "' + name + '" não está no projeto. Confira o nome em "Imagens" (maiúsculas e espaços contam).');
return h && h.loaded ? h.img : null;
},
camera: function () {
_sceneCamera.x = camera.on ? Math.round(camera.x) : 0;
_sceneCamera.y = camera.on ? Math.round(camera.y) : 0;
return _sceneCamera;
},
screen: function (ctx) { ctx.setTransform(ctx.canvas.width / config.w, 0, 0, ctx.canvas.height / config.h, 0, 0); },
smoothing: function (ctx, img, width) {
try { ctx.imageSmoothingEnabled = width < (img.naturalWidth || img.width || 0); } catch (e) {}
},
warn: function (message) { warnOnce('scene:' + message, message); }
});
_registerRuntimeDomain('scene-2d', { resetProject: _scene2d.reset });


/**
 * @template {import('./spriteContract').SceneSprite} T
 * @param {import('./spriteHostContract').SpriteSceneHost<T>} host
 * @param {import('./contract').SceneTwoDApi} scene
 * @returns {import('./spriteContract').SpriteSceneController}
 */
function createSpriteScene(host, scene) {
  var tracks = new Map(), bindings = new Map(), families = new Map(), backdrops = new Map(), warnings = new Set();
  var failedHandlers = new WeakSet();
  var current = null, generation = 0, sequence = 0, screens = null, decorations = new Map(), worldPainted = false, hudInput = false;
  function warn(message) { if (!warnings.has(message) && warnings.size < 64) { warnings.add(message); host.warn(message); } }
  function key(name) { return typeof name === 'string' ? name.trim() : ''; }
  function finite(values) { return values.every(Number.isFinite); }
  function track(name) {
    var t = tracks.get(key(name));
    if (!t) warn('A pista “' + String(name) + '” ainda não existe. Use “Criar pista para o fundo”.');
    return t;
  }
  function validSprite(s) { return !!s && finite([s.x, s.y, s.w, s.h]) && s.w > 0 && s.h > 0 && host.spriteAlive(s); }
  function alive(b) { return !b.removed && host.spriteAlive(b.sprite); }
  function center(s) { return s.x + s.w / 2; }
  function family(sprite) { var b = bindings.get(sprite); return families.get(sprite) || (b ? new Set([b]) : null); }
  function detach(b) {
    b.removed = true; b.track.items.delete(b.sprite); bindings.delete(b.sprite); decorations.delete(b.sprite);
    var group = families.get(b.source);
    if (group) { group.delete(b); if (!group.size) families.delete(b.source); }
    if (b.track.player === b.sprite) b.track.player = null;
  }
  function invoke(fn, sprite) {
    if (failedHandlers.has(fn)) return;
    var gen = generation;
    try { host.invoke(function () { fn(sprite); }); }
    catch (error) {
      if (gen !== generation) throw error;
      failedHandlers.add(fn); warn('Parei um evento da pista porque aconteceu um erro: ' + String(error));
    }
  }
  function place(t, s, x, z, source) {
    if (!validSprite(s) || !finite([x, z])) { warn('Escolha um sprite criado e use números na posição e na distância da pista.'); return null; }
    var old = bindings.get(s);
    if (!t.items.has(s) && t.items.size >= 2048) { warn('A pista já tem 2048 sprites. Reduza a quantidade de cópias.'); return null; }
    var followed = old && old.track === t && t.player === s;
    if (old) detach(old);
    s.x = x - s.w / 2; s.y = z;
    var b = { sprite: s, source: source || (old && old.source) || s, track: t, vx: old ? old.vx : 0, vz: old ? old.vz : 0, previousX: x, previousZ: z,
      removed: false, sequence: old ? old.sequence : sequence++ };
    bindings.set(s, b); t.items.set(s, b);
    var group = families.get(b.source); if (!group) { group = new Set(); families.set(b.source, group); }
    group.add(b);
    if (followed) { t.player = s; t.distance = Math.max(0, z); scene.cameraTrack(t.name, x * 0.2, t.distance); }
    return b;
  }
  function remove(b) {
    api.release(b.sprite);
    host.destroySprite(b.sprite);
  }
  function configureView(t, view) {
    var distance = t.distance, x = t.player ? center(t.player) * 0.2 : 0;
    var focal = host.width() * (view === 'wide' ? 0.375 : 0.46875);
    scene.createTrack(t.name, view === 'high' ? 22 : 28, focal, host.height() * (view === 'high' ? 0.3 : 2 / 9), 120);
    scene.viewTrack(t.name, 20, 2600); scene.cameraTrack(t.name, x, distance);
  }
  function forLive(t, visit) {
    t.items.forEach(function (b) {
      if (alive(b)) visit(b);
      else api.release(b.sprite);
    });
  }
  function projectedBounds(b) {
    var s = b.sprite, name = b.track.name;
    if (!alive(b) || !scene.projectTrack(name, center(s), s.y, 'visible')) return null;
    var x = scene.projectTrack(name, center(s), s.y, 'x'), y = scene.projectTrack(name, center(s), s.y, 'y');
    var scale = scene.projectTrack(name, center(s), s.y, 'scale'), w = s.w * scale, h = s.h * scale;
    return finite([x, y, w, h]) && w <= 32768 && h <= 32768 ? { x: x - w / 2, y: y - h, w: w, h: h } : null;
  }
  function outside(box, margin) {
    return box.x + box.w < -margin || box.x > host.width() + margin || box.y + box.h < -margin || box.y > host.height() + margin;
  }
  function stepTrack(t, dt) {
    if (t.player && !host.spriteAlive(t.player)) { api.release(t.player); t.player = null; }
    var player = t.player, before = t.distance, px = player ? center(player) : 0, gen = generation, initialState = host.state();
    var binding = bindings.get(player), oldPlayerBox = player ? host.hitbox(player) : { x: 0, w: 0 };
    var oldPlayerCenter = oldPlayerBox.x + oldPlayerBox.w / 2;
    var nextDistance = Math.max(0, Math.min(t.finish || Infinity, before + (t.finished ? 0 : t.speed + (binding ? binding.vz : 0)) * dt));
    if (!Number.isFinite(nextDistance)) { warn('A velocidade da pista passou do limite. Use um número menor.'); return; }
    t.distance = nextDistance;
    var lateral = (t.input === 'arrows' || t.input === 'both' ? host.direction() * t.controlSpeed : 0) + (binding ? binding.vx : 0);
    var pointer = host.pointer();
    if (player && (t.input === 'pointer' || t.input === 'both') && t.controlSpeed > 0 && pointer.down && pointer.y >= host.height() * 0.125) {
      var scale = scene.projectTrack(t.name, px, before, 'scale');
      var target = (pointer.x - host.width() / 2) / (scale * 0.8);
      lateral = dt > 0 ? Math.max(-t.controlSpeed, Math.min(t.controlSpeed, (target - px) / dt)) : 0;
    }
    var nx = player ? Math.max(-t.limit, Math.min(t.rightLimit, px + lateral * dt)) : 0;
    if (player) { player.x = nx - player.w / 2; player.y = t.distance; host.motion(player, nx - px, t.distance - before); }
    var playerBox = player ? host.hitbox(player) : { x: 0, w: 0 }, playerWidth = playerBox.w;
    var playerCenter = playerBox.x + playerWidth / 2;
    var encounters = [];
    forLive(t, function (b) {
      if (b.sprite === player) return;
      var s = b.sprite, oldX = b.previousX, oldZ = b.previousZ;
      s.x += b.vx * dt; s.y += b.vz * dt;
      if (!finite([s.x, s.y])) { warn('Um sprite saiu do limite de números da pista.'); return; }
      host.motion(s, center(s) - oldX, s.y - oldZ);
      var previous = oldZ - before, relative = s.y - t.distance;
      var crossed = previous > 0 && relative <= 0 || previous < 0 && relative >= 0;
      if (player && crossed) {
        var fraction = previous / (previous - relative);
        var box = host.hitbox(s);
        var a = oldPlayerCenter + (playerCenter - oldPlayerCenter) * fraction;
        var bX = oldX + (box.x - s.x) + box.w / 2 - s.w / 2 + (center(s) - oldX) * fraction;
        if (Math.abs(a - bX) <= (playerWidth + box.w) / 2) encounters.push({ binding: b, fraction: fraction });
      }
      b.previousX = center(s); b.previousZ = s.y;
    });
    scene.cameraTrack(t.name, nx * 0.2, before);
    scene.advanceTrack(t.name, t.distance - before);
    encounters.sort(function (a, b) { return a.fraction - b.fraction || a.binding.sequence - b.binding.sequence; });
    for (var i = 0; i < encounters.length; i++) {
      var item = encounters[i].binding; if (!alive(item)) continue;
      var handlers = (t.encounters.get(item.source) || []).concat(t.moldEncounters.get(host.moldName(item.sprite)) || []);
      var prior = current; current = item;
      try { for (var h = 0; h < handlers.length; h++) { invoke(handlers[h], item.sprite); if (gen !== generation) return; } }
      finally { current = gen === generation ? prior : null; }
      if (host.state() !== initialState || screens && host.state() !== 'playing') return;
    }
    if (!t.finished && t.finish > 0 && before < t.finish && t.distance >= t.finish) {
      t.finished = true;
      var finishers = t.finishers.slice();
      for (var f = 0; f < finishers.length; f++) { invoke(finishers[f], undefined); if (gen !== generation) return; }
      if (screens && host.state() === 'playing') host.setState('won');
    }
  }
  var api = {
    hasScreens: function () { return !!screens; },
    simulationBlocked: function () { return !!screens && host.state() !== 'playing'; },
    epoch: function () { return generation; },
    active: function () { return !!screens || tracks.size > 0 || backdrops.size > 0; },
    owns: function (sprite) { var b = bindings.get(sprite); return !!b && alive(b); },
    retains: function (sprite) { return families.has(sprite); },
    release: function (sprite) {
      var b = bindings.get(sprite); if (b) detach(b);
      // Instance events live as long as their family, never as long as a pooled object.
      tracks.forEach(function (t) {
        if (!families.has(sprite)) t.encounters.delete(sprite);
        if (b && !families.has(b.source)) t.encounters.delete(b.source);
      });
    },
    bounds: function (sprite) { var b = bindings.get(sprite), box = b && projectedBounds(b); return box && !outside(box, 0) ? box : null; },
    offscreen: function (sprite, margin) {
      var b = bindings.get(sprite); if (!b || !alive(b) || b.track.player === sprite) return false;
      var box = projectedBounds(b);
      // A distant wave has not entered the view yet. Behind the near plane it has left.
      return box ? outside(box, Math.max(0, margin)) : sprite.y < b.track.distance;
    },
    decorate: function (sprite, draw) {
      if (!api.owns(sprite)) return false;
      var box = api.bounds(sprite); if (!box) return true;
      if (worldPainted) {
        var ctx = host.context(); if (!ctx) return true;
        ctx.save(); try { host.screen(ctx); draw(box); } finally { ctx.restore(); }
      } else {
        var list = decorations.get(sprite) || []; list.push(draw); decorations.set(sprite, list);
      }
      return true;
    },
    reset: function () {
      generation++; tracks.clear(); bindings.clear(); families.clear(); backdrops.clear(); decorations.clear(); warnings.clear(); failedHandlers = new WeakSet();
      screens = null; current = null; sequence = 0; worldPainted = false; hudInput = false;
    },
    addSceneBackdrop: function (name, image, plane) {
      var id = key(name);
      if (!id || !key(image) || ['far', 'back', 'front'].indexOf(plane) < 0) { warn('Escolha um nome, uma imagem e a posição do cenário.'); return; }
      if (!backdrops.has(id) && backdrops.size >= 64) { warn('Use até 64 camadas de cenário.'); return; }
      backdrops.set(id, { image: image, plane: plane, motion: 0, fit: 'cover' });
      scene.createSceneLayer(id, image, plane === 'front' ? 'front' : 'back');
      scene.orderSceneLayer(id, plane === 'far' ? -10 : 0); host.wake();
    },
    sceneBackdropMotion: function (name, percent) {
      var b = backdrops.get(key(name));
      if (!b) { warn('Adicione o cenário antes de escolher seu movimento.'); return; }
      if (!Number.isFinite(percent) || Math.abs(percent) > 100) { warn('Use um movimento de cenário entre -100 e 100.'); return; }
      b.motion = percent / 100;
    },
    sceneBackdropFit: function (name, fit) {
      var b = backdrops.get(key(name));
      if (!b || ['cover', 'contain', 'repeat'].indexOf(fit) < 0) { warn('Escolha um cenário e como sua imagem se encaixa.'); return; }
      b.fit = fit;
    },
    createSpriteTrack: function (name) {
      var id = key(name); if (!id) { warn('Dê um nome à pista.'); return; }
      if (!tracks.has(id) && tracks.size >= 16) { warn('Use até 16 pistas.'); return; }
      var old = tracks.get(id);
      // Replacing a track destroys only the copies it made; the child's own sprites are just let go.
      if (old) Array.from(old.items.values()).forEach(function (b) { if (b.source === b.sprite) api.release(b.sprite); else remove(b); });
      var t = { name: id, items: new Map(), player: null, speed: 0, finish: 0, distance: 0, score: 0,
        controlSpeed: 0, input: 'off', limit: 120, rightLimit: 120, finished: false, encounters: new Map(), moldEncounters: new Map(), finishers: [], hud: null };
      tracks.set(id, t); configureView(t, 'near'); t.view = 'near'; host.wake();
    },
    trackPlayer: function (name, sprite, lives) {
      var t = track(name); if (!t) return;
      if (!Number.isFinite(lives) || lives <= 0) { warn('Escolha uma quantidade de vidas maior que zero.'); return; }
      if (place(t, sprite, 0, t.distance)) { t.player = sprite; host.setHealth(sprite, lives); }
    },
    trackControls: function (name, speed, limit) {
      var t = track(name); if (!t) return;
      if (!finite([speed, limit]) || speed < 0 || limit <= 0) { warn('Use velocidade positiva e um limite lateral maior que zero.'); return; }
      t.controlSpeed = speed; t.limit = limit; t.rightLimit = limit; t.input = 'both';
    },
    trackTravel: function (name, speed, finish) {
      var t = track(name); if (!t) return;
      if (!finite([speed, finish]) || finish < 0) { warn('Use números na velocidade e na chegada da pista.'); return; }
      t.speed = speed; t.finish = finish; t.finished = false;
    },
    putTrackSprite: function (name, sprite, x, distance) { var t = track(name); if (t) place(t, sprite, x, distance); },
    putTrackSpriteAt: function (name, sprite, side, distance) {
      var t = track(name); if (!t) return;
      if (['left', 'center', 'right'].indexOf(side) < 0) { warn('Escolha esquerda, centro ou direita para colocar o sprite.'); return; }
      place(t, sprite, side === 'left' ? -80 : side === 'right' ? 80 : 0, distance);
    },
    repeatTrackSprite: function (name, sprite, count, spacing, pattern) {
      var t = track(name), b = bindings.get(sprite); if (!t) return;
      if (!b || b.track !== t || t.player === sprite) { warn('Coloque o sprite na pista antes de fazer suas cópias.'); return; }
      if (!finite([count, spacing]) || !Number.isInteger(count) || count < 1 || count > 2048 || spacing <= 0 ||
          ['line', 'alternate', 'weave', 'steps-left', 'steps-right'].indexOf(pattern) < 0) { warn('Escolha um padrão, uma quantidade de 1 a 2048 e uma distância maior que zero.'); return; }
      var previousCopies = [];
      t.items.forEach(function (item) { if (item.source === sprite && item.sprite !== sprite) previousCopies.push(item); });
      if (t.items.size - previousCopies.length + count - 1 > 2048 || !Number.isFinite(sprite.y + (count - 1) * spacing)) { warn('A repetição ultrapassa o limite da pista.'); return; }
      previousCopies.forEach(remove);
      var x = center(sprite), z = sprite.y;
      for (var i = 1; i < count; i++) {
        var lateral = pattern === 'alternate' ? (i % 2 ? -x : x) :
          pattern === 'weave' ? (i % 2 ? 0 : i % 4 === 0 ? x : -x) :
          pattern === 'steps-left' ? x - i % 3 * sprite.w / 3 :
          pattern === 'steps-right' ? x + i % 3 * sprite.w / 3 : x;
        var copy = host.copySprite(sprite);
        if (!copy) break;
        var made = place(t, copy, lateral, z + i * spacing, sprite);
        if (made) { made.vx = b.vx; made.vz = b.vz; }
      }
    },
    trackSpriteVelocity: function (sprite, lateral, distance) {
      var group = family(sprite);
      if (!group || !finite([lateral, distance])) { warn('Coloque o sprite na pista e escolha velocidades numéricas.'); return; }
      group.forEach(function (item) { if (alive(item)) { item.vx = lateral; item.vz = distance; } });
    },
    trackFollow: function (name, sprite) {
      var t = track(name); if (!t) return;
      var b = bindings.get(sprite);
      if (b && b.track === t && alive(b)) { t.player = sprite; t.distance = sprite.y; }
      else if (place(t, sprite, 0, t.distance)) t.player = sprite;
    },
    trackSpeed: function (name, speed) {
      var t = track(name); if (!t) return;
      if (!Number.isFinite(speed)) { warn('A velocidade da pista precisa ser um número finito.'); return; }
      t.speed = speed;
    },
    trackFinishLine: function (name, distance) {
      var t = track(name); if (!t) return;
      if (!Number.isFinite(distance) || distance < 0) { warn('Use zero para pista sem fim ou uma distância positiva para a chegada.'); return; }
      t.finish = distance; t.finished = false;
    },
    trackInput: function (name, mode, speed) {
      var t = track(name); if (!t) return;
      if (['arrows', 'pointer', 'both', 'off'].indexOf(mode) < 0 || !Number.isFinite(speed) || speed < 0) { warn('Escolha os controles da pista e uma velocidade positiva.'); return; }
      t.input = mode; t.controlSpeed = speed;
    },
    trackLimit: function (name, left, right) {
      var t = track(name); if (!t) return;
      if (!finite([left, right]) || left < 0 || right < 0) { warn('Use limites laterais maiores ou iguais a zero.'); return; }
      t.limit = left; t.rightLimit = right;
    },
    trackPosition: function (name, property) { return api.spriteTrackValue(name, property); },
    onTrackSpriteEncounter: function (name, sprite, fn) { api.onTrackEncounter(name, sprite, fn); },
    onTrackMoldEncounter: function (name, mold, fn) {
      var t = track(name); if (!t || typeof fn !== 'function') return;
      if (!key(mold)) { warn('Escolha um molde para o encontro na pista.'); return; }
      var handlers = t.moldEncounters.get(mold) || []; handlers.push(fn); t.moldEncounters.set(mold, handlers);
    },
    forEachTrackSprite: function (sprite, fn) {
      if (typeof fn !== 'function') return;
      var group = family(sprite); if (!group) return;
      var list = Array.from(group), gen = generation;
      for (var i = 0; i < list.length; i++) { if (alive(list[i])) invoke(fn, list[i].sprite); if (gen !== generation) return; }
    },
    trackCameraView: function (name, view) {
      var t = track(name); if (!t) return;
      if (['near', 'wide', 'high'].indexOf(view) < 0) { warn('Escolha uma vista próxima, aberta ou alta.'); return; }
      // Asked again inside a frame rule, the same view must not rebuild the track sixty times a second.
      if (t.view === view) return;
      t.view = view; configureView(t, view);
    },
    onTrackEncounter: function (name, sprite, fn) {
      var t = track(name); if (!t || typeof fn !== 'function') return;
      if (!validSprite(sprite)) { warn('Escolha um sprite para o encontro na pista.'); return; }
      var handlers = t.encounters.get(sprite) || []; handlers.push(fn); t.encounters.set(sprite, handlers);
    },
    onTrackFinish: function (name, fn) { var t = track(name); if (t && typeof fn === 'function') t.finishers.push(fn); },
    collectTrackItem: function () {
      if (!current) { warn('Use “Recolher o sprite encontrado” dentro de um encontro na pista.'); return; }
      if (alive(current)) remove(current);
    },
    trackScore: function (name, amount) { var t = track(name); if (t && finite([amount, t.score + amount])) t.score += amount; },
    trackHurt: function (name, amount) {
      var t = track(name); if (!t || !t.player || !Number.isFinite(amount) || amount < 0) return;
      host.hurt(t.player, amount);
      if (host.health(t.player) <= 0) host.setState('lost');
    },
    trackHud: function (name, label, total) {
      var t = track(name); if (!t || !Number.isFinite(total) || total < 0) return;
      t.hud = { label: String(label), total: total };
      hudInput = true;
    },
    sceneGameScreens: function (title, instructions) {
      screens = { title: String(title), instructions: String(instructions) }; host.setState('start'); host.wake();
    },
    sceneAnimation: function (sprite, image, animation, once) {
      var group = family(sprite);
      if (group) { group.forEach(function (item) { if (alive(item)) host.animate(item.sprite, image, animation, !!once); }); return; }
      if (!validSprite(sprite)) { warn('Crie o sprite antes de escolher sua animação.'); return; }
      host.animate(sprite, image, animation, !!once);
    },
    sceneResult: function (result) { if (result === 'won' || result === 'lost') host.setState(result); },
    spriteTrackValue: function (name, property) {
      var t = track(name); if (!t) return 0;
      return property === 'score' ? t.score : property === 'distance' ? t.distance :
        property === 'lateral' ? (t.player ? center(t.player) : 0) : property === 'lives' ? (t.player ? host.health(t.player) : 0) : 0;
    },
    input: function (action) {
      if (!screens && !hudInput) return;
      var state = host.state();
      if (!screens) {
        if (action === 'pause') host.setPaused(state !== 'paused');
        else if (action === 'start' && state === 'paused') host.setPaused(false);
        else if (action === 'restart') host.restart();
        return;
      }
      if (action === 'restart' || action === 'start' && (state === 'won' || state === 'lost')) { host.restart(); return; }
      if (action === 'start' && (screens && state === 'start' || state === 'paused')) host.setState('playing');
      if (action === 'pause' && (state === 'playing' || state === 'paused')) host.setState(state === 'playing' ? 'paused' : 'playing');
    },
    step: function (dt) {
      if (!Number.isFinite(dt) || dt < 0 || screens && host.state() !== 'playing') return;
      var gen = generation, initialState = host.state(), list = Array.from(tracks.values());
      for (var i = 0; i < list.length; i++) { stepTrack(list[i], dt); if (gen !== generation || host.state() !== initialState) return; }
    },
    draw: function (pass) {
      if (!api.active()) return;
      if (pass === 'back') {
        decorations.clear(); worldPainted = false;
        var cam = host.camera(), first = tracks.values().next().value;
        if (first && first.player) cam = { x: center(first.player) * 0.2, y: 0 };
        backdrops.forEach(function (b, id) {
          var img = host.image(b.image); if (!img || !img.width || !img.height) return;
          var scale = b.fit === 'repeat' ? 1 : b.fit === 'contain' ? Math.min(host.width() / img.width, host.height() / img.height) : Math.max(host.width() / img.width, host.height() / img.height);
          if (b.motion && b.fit === 'cover') scale *= 1.04;
          scene.transformSceneLayer(id, (host.width() - img.width * scale) / 2 - cam.x * b.motion, (host.height() - img.height * scale) / 2 - cam.y * b.motion, scale, 1);
          scene.motionSceneLayer(id, 'screen', 0, 0, b.fit === 'repeat' ? 'both' : 'none');
        });
        scene.drawSceneLayers('back');
      } else if (pass === 'front') scene.drawSceneLayers('front');
      else if (pass === 'world') {
        var canvasContext = host.context(); if (!canvasContext) return;
        var ctx = canvasContext;
        ctx.save();
        try {
          host.screen(ctx);
          tracks.forEach(function (t) {
            var list = [];
            forLive(t, function (b) { if (scene.projectTrack(t.name, center(b.sprite), b.sprite.y, 'visible')) list.push(b); });
            list.sort(function (a, b) { return b.sprite.y - a.sprite.y || a.sequence - b.sequence; });
            for (var i = 0; i < list.length; i++) {
              var s = list[i].sprite, box = projectedBounds(list[i]);
              if (!box || outside(box, 0)) continue;
              var scale = box.w / s.w;
              ctx.save();
              try { ctx.translate(box.x, box.y); ctx.scale(scale, scale); ctx.translate(-s.x, -s.y); host.drawSprite(ctx, s); }
              finally { ctx.restore(); }
              var overlays = decorations.get(s) || []; decorations.delete(s);
              for (var d = 0; d < overlays.length; d++) overlays[d](box);
            }
          });
        } finally { ctx.restore(); worldPainted = true; }
      } else if (pass === 'hud') {
        const drawHud = host.drawHud; if (!drawHud) return;
        // The bar only exists with "Mostrar vidas e placar"; the footer only names controls the track has.
        var shown = false, controls = 'off';
        tracks.forEach(function (t) { if (t.input !== 'off' && t.controlSpeed > 0) controls = t.input; });
        tracks.forEach(function (t) {
          if (!t.hud) return; shown = true;
          drawHud(screens ? screens.title : '', screens ? screens.instructions : '', t.hud.label, t.score, t.hud.total,
            t.player ? host.health(t.player) : 0, t.finish ? t.distance / t.finish : 0, true, controls);
        });
        if (screens && !shown) drawHud(screens.title, screens.instructions, '', 0, 0, 0, 0, false, controls);
      }
    }
  };
  return api;
}
 
  function _namedSceneAnimation(image, animation) {
    var meta = Object.prototype.hasOwnProperty.call(ASSET_META, image) && ASSET_META[image].sprite;
    if (!meta || !Array.isArray(meta.animations)) return null;
    var found = meta.animations.find(function (a) { return a.name === animation; });
    return found ? { frameW: meta.frameW, frameH: meta.frameH, animation: found } : null;
  }

  var _spriteScenePainting = false;
  function _spriteSceneState() {
    return state === 'jogando' ? 'playing' : state === 'pausado' ? 'paused' : state === 'vitoria' ? 'won' : state === 'fim' ? 'lost' : 'start';
  }
  var _spriteScene = createSpriteScene(/** @type {import('../scene-2d/spriteHostContract').SpriteSceneHost<import('./runtimeContract').GameKitEntity>} */ ({
    width: function () { return config.w; }, height: function () { return config.h; }, context: function () { return ctx2d; },
    screen: function (ctx) { ctx.setTransform(ctx.canvas.width / config.w, 0, 0, ctx.canvas.height / config.h, 0, 0); },
    image: function (name) { ensureImageLoaded(name); var h = images[name]; return h && h.loaded ? h.img : null; },
    camera: function () { return { x: camera.on ? camera.x : 0, y: camera.on ? camera.y : 0 }; },
    spriteAlive: function (s) { return s._active !== false; },
    moldName: function (s) { return s._mold || ''; },
    copySprite: function (s) {
      var copy = s._mold ? spawnFromMold(s._mold, s.x, s.y) : {};
      if (!copy) return null;
      Object.assign(copy, s, { _active: true });
      // Each copy owns its per-state setup; shared tables would make one change rewrite them all.
      if (s._stateAnims) copy._stateAnims = Object.assign({}, s._stateAnims);
      if (s._stateLooks) copy._stateLooks = Object.assign({}, s._stateLooks);
      if (s._platFrames) copy._platFrames = Object.assign({}, s._platFrames);
      return copy;
    },
    destroySprite: function (s) { if (s._mold) recycle(s); else s._active = false; },
    drawSprite: function (ctx, s) { _spriteScenePainting = true; try { drawEntity(s); } finally { _spriteScenePainting = false; } },
    hitbox: function (s) { return { x: hbLeft(s), y: hbTop(s), w: hbW(s), h: hbH(s) }; },
    motion: function (s, dx, dz) { s._moving = Math.abs(dx) + Math.abs(dz) > 0.001; },
    health: function (s) { return num(s.health, 1); },
    setHealth: function (s, lives) { s.health = lives; s.maxHealth = lives; },
    hurt: function (s, amount) { s.health = Math.max(0, num(s.health, 1) - amount); s._iFrames = 0.35; trackCombatant(s); },
    animate: function (s, image, animation, once) {
      var meta = _namedSceneAnimation(image, animation);
      if (!meta) { warnOnce('scene-animation:' + image + ':' + animation, 'A animação “' + animation + '” não está no desenho “' + image + '”. Escolha uma animação no Pinta ou configure a folha de quadros.'); return; }
      if (s._sheetImg !== image || s._sheetFw !== meta.frameW || s._sheetFh !== meta.frameH) setSheet(s, image, meta.frameW, meta.frameH);
      var a = meta.animation; if (once) playAnimOnce(s, a.from, a.to, a.fps); else playAnim(s, a.from, a.to, a.fps);
    },
    direction: function () { return (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0); },
    pointer: function () { return { x: mouse.screenX, y: mouse.screenY, down: mouse.down }; }, state: _spriteSceneState,
    setPaused: function (paused) { setState(paused ? 'pausado' : 'jogando'); },
    setState: function (value) { setState(value === 'playing' ? 'jogando' : value === 'paused' ? 'pausado' : value === 'won' ? 'vitoria' : value === 'lost' ? 'fim' : 'menu'); },
    restart: function () { restartGame(); setState('jogando'); }, wake: function () {},
    invoke: function (fn) { fn(); },
    warn: function (message) { warnOnce('sprite-scene:' + message, message); }
  }), _scene2d);
  _registerRuntimeDomain('sprite-scene', { resetProject: _spriteScene.reset });

  /** @type {Omit<GameKitRuntimeApi, 'runProject'>} */
  var api = {
    addSceneBackdrop: guard('addSceneBackdrop', _spriteScene.addSceneBackdrop),
    sceneBackdropMotion: guard('sceneBackdropMotion', _spriteScene.sceneBackdropMotion),
    sceneBackdropFit: guard('sceneBackdropFit', _spriteScene.sceneBackdropFit),
    createSpriteTrack: guard('createSpriteTrack', _spriteScene.createSpriteTrack),
    putTrackSprite: guard('putTrackSprite', _spriteScene.putTrackSprite),
    repeatTrackSprite: guard('repeatTrackSprite', _spriteScene.repeatTrackSprite),
    trackSpriteVelocity: guard('trackSpriteVelocity', _spriteScene.trackSpriteVelocity),
    trackCameraView: guard('trackCameraView', _spriteScene.trackCameraView),
    onTrackFinish: guard('onTrackFinish', _spriteScene.onTrackFinish),
    collectTrackItem: guard('collectTrackItem', _spriteScene.collectTrackItem),
    sceneAnimation: guard('sceneAnimation', _spriteScene.sceneAnimation),
    trackFollow: guard('trackFollow', _spriteScene.trackFollow),
    trackSpeed: guard('trackSpeed', _spriteScene.trackSpeed),
    trackFinishLine: guard('trackFinishLine', _spriteScene.trackFinishLine),
    trackInput: guard('trackInput', _spriteScene.trackInput),
    trackLimit: guard('trackLimit', _spriteScene.trackLimit),
    trackPosition: guard('trackPosition', _spriteScene.trackPosition),
    onTrackSpriteEncounter: guard('onTrackSpriteEncounter', _spriteScene.onTrackSpriteEncounter),
    onTrackMoldEncounter: guard('onTrackMoldEncounter', _spriteScene.onTrackMoldEncounter),
    forEachTrackSprite: guard('forEachTrackSprite', _spriteScene.forEachTrackSprite),
    setup: guard('setup', function (opts) {
      var o = (opts && typeof opts === 'object') ? opts : {};
      if (started) {
        if (!runningProjectFactory) warn('"Preparar o jogo" depois de começar não muda a tela — deixe-o no comecinho');
        return;
      }
      config.fill = false; // "Preparar o jogo" normal = resolução fixa (letterbox)
      config.w = Math.max(64, Math.min(4096, num(o.width, config.w)));
      config.h = Math.max(64, Math.min(4096, num(o.height, config.h)));
      if (o.background != null) config.bg = text(o.background, config.bg);
      if (o.accent != null) config.accent = text(o.accent, config.accent);
    }),
    // "Preparar o jogo para ocupar a tela toda": sem dimensões — o canvas preenche
    // a viewport inteira e a área do jogo acompanha o tamanho da janela.
    setupFull: guard('setupFull', function (opts) {
      var o = (opts && typeof opts === 'object') ? opts : {};
      if (started) {
        if (!runningProjectFactory) warn('"Preparar o jogo" depois de começar não muda a tela — deixe-o no comecinho');
        return;
      }
      config.fill = true;
      if (o.background != null) config.bg = text(o.background, config.bg);
      if (o.accent != null) config.accent = text(o.accent, config.accent);
    }),
    setStageDescription: guard('setStageDescription', setStageDescription),
    start: guard('start', start),
    showStageBorder: guard('showStageBorder', showStageBorder),
    useFont: guard('useFont', useFont),
    setBackdrop: guard('setBackdrop', setBackdrop),
    drawBackdrop: guard('drawBackdrop', drawBackdrop),
    // Liga a MESMA chave que a tecla de crase alterna (agora exposta em bloco).
    showHitboxes: guard('showHitboxes', function () { debugOverlay = true; }),
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
      projectScreens.push(key);
    }),
    addButton: guard('addButton', function (screen, label, fn) {
      if (!ensureShell()) return;
      var entry = screens[text(screen, '')];
      if (!entry) {
        warn('a tela "' + text(screen, '') + '" não existe — crie-a antes de pôr o botão');
        return;
      }
      projectButtons.push(makeButton(entry, text(label, 'Botão'), typeof fn === 'function' ? fn : function () {}));
    }),
    // 🖼️ Deixar a tela (pronta ou sua) com a SUA cara: uma cor de fundo (o "quadrado
    // colorido por baixo") e/ou uma imagem do Pinta cobrindo o painel. É DOM (o painel
    // fica por cima do canvas), então mexemos no style do próprio painel.
    setScreenBg: guard('setScreenBg', function (screen, color, image) {
      if (!ensureShell()) return;
      var entry = screens[text(screen, '')];
      if (!entry) {
        warn('a tela "' + text(screen, '') + '" não existe — crie-a antes de pôr o fundo');
        return;
      }
      var c = text(color, '');
      // backgroundColor (não o shorthand background) p/ não apagar a imagem se vier depois.
      if (c) entry.el.style.backgroundColor = c;
      var asset = text(image, '');
      if (asset) {
        var src = resolveAsset(asset);
        if (src) {
          entry.el.style.backgroundImage = 'url("' + src + '")';
          entry.el.style.backgroundSize = 'cover';
          entry.el.style.backgroundPosition = 'center';
        } else {
          warnOnce('screenbg:' + asset, 'a imagem "' + asset + '" não está no projeto. Importe em "Imagens", no menu ⋯');
        }
      }
    }),
    showScreen: guard('showScreen', showScreen),
    hideScreens: guard('hideScreens', hideScreens),
    setState: guard('setState', setState),
    restartGame: guard('restartGame', restartGame),
    onGameStart: guard('onGameStart', function (fn) {
      if (typeof fn === 'function') gameStartHooks.push(fn);
    }),
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
    enableFixedSimulation: guard('enableFixedSimulation', enableFixedSimulation),
    onFixedUpdate: guard('onFixedUpdate', onFixedUpdate),
    fixedTick: guard('fixedTick', function () { return proSim.tick; }),
    renderAlpha: guard('renderAlpha', function () { return proSim.alpha; }),
    simulationStats: guard('simulationStats', function () {
      return { enabled: proSim.enabled, hz: proSim.hz, tick: proSim.tick, alpha: proSim.alpha, droppedSeconds: proSim.droppedSeconds, lastFrameSteps: proSim.lastFrameSteps };
    }),
    bindAction: guard('bindAction', bindAction),
    actionDown: guard('actionDown', function (action) { return proActionDown[text(action, '')] === true; }),
    actionPressed: guard('actionPressed', function (action) { return proActionPressed[text(action, '')] === true; }),
    actionReleased: guard('actionReleased', function (action) { return proActionReleased[text(action, '')] === true; }),
    activeInputDevice: guard('activeInputDevice', function () { return proInputDevice; }),
    defineCampaign: guard('defineCampaign', defineCampaign),
    defineCampaignStage: guard('defineCampaignStage', defineCampaignStage),
    startCampaign: guard('startCampaign', startCampaign),
    goToStage: guard('goToStage', goToStage),
    nextStage: guard('nextStage', nextStage),
    warpToStage: guard('warpToStage', warpToStage),
    setCampaignCheckpoint: guard('setCampaignCheckpoint', setCampaignCheckpoint),
    restartAtCheckpoint: guard('restartAtCheckpoint', restartAtCheckpoint),
    currentStage: guard('currentStage', function () { return proCampaign.stageId; }),
    currentWorld: guard('currentWorld', function () { return proCampaign.stage ? proCampaign.stage.world : 0; }),
    onCampaignEvent: guard('onCampaignEvent', onCampaignEvent),
    campaignEventValue: guard('campaignEventValue', campaignEventValue),
    configureSaveSlots: guard('configureSaveSlots', configureSaveSlots),
    saveCampaign: guard('saveCampaign', saveCampaign),
    loadCampaign: guard('loadCampaign', loadCampaign),
    deleteCampaignSave: guard('deleteCampaignSave', deleteCampaignSave),
    campaignSaveInfo: guard('campaignSaveInfo', campaignSaveInfo),
    startReplayRecording: guard('startReplayRecording', startReplayRecording),
    stopReplayRecording: guard('stopReplayRecording', stopReplayRecording),
    playReplay: guard('playReplay', playReplay),
    playLastReplay: guard('playLastReplay', playLastReplay),
    replayActive: guard('replayActive', function () { return proReplayPlaying != null; }),
    replayHash: guard('replayHash', replayHash),
    setHeroForm: guard('setHeroForm', setHeroForm),
    heroForm: guard('heroForm', heroForm),
    hurtHeroForm: guard('hurtHeroForm', hurtHeroForm),
    campaignHero: guard('campaignHero', function () { return proCampaign.hero; }),
    campaignProgress: guard('campaignProgress', campaignProgress),
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
      placeCharacterAt(c, num(x, c.x), num(y, c.y));
      // Teleporte NÃO é movimento: zera a varredura, senão a colisão sólida tentaria
      // "varrer" do lugar antigo até aqui e travaria o personagem no caminho.
      c._sweepFromY = c.y;
      c._sweepFrame = -1;
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
    playAnimOnce: guard('playAnimOnce', playAnimOnce),
    animEnded: guard('animEnded', animEnded),
    setEntityState: guard('setEntityState', setEntityState),
    entityState: guard('entityState', entityState),
    stateAnim: guard('stateAnim', stateAnim),
    stateLook: guard('stateLook', stateLook),
    autoAnimate: guard('autoAnimate', autoAnimate),
    cameraFollow: guard('cameraFollow', cameraFollow),
    cameraFollowMap: guard('cameraFollowMap', cameraFollowMap),
    cameraStop: guard('cameraStop', cameraStop),
    cameraX: guard('cameraX', function () { return camera.x; }),
    cameraY: guard('cameraY', function () { return camera.y; }),
    launchTowards: guard('launchTowards', launchTowards),
    moveByVelocity: guard('moveByVelocity', moveByVelocity),
    setAngle: guard('setAngle', setAngle),
    mouseX: guard('mouseX', function () { return mouse.x; }),
    mouseY: guard('mouseY', function () { return mouse.y; }),
    mouseScreenX: guard('mouseScreenX', function () { return mouse.screenX; }),
    mouseScreenY: guard('mouseScreenY', function () { return mouse.screenY; }),
    mouseDown: guard('mouseDown', function () { return mouse.down === true; }),
    onGameClick: guard('onGameClick', function (fn) {
      if (typeof fn === 'function') gameClickHooks.push(fn);
    }),
    drawBar: guard('drawBar', drawBar),
    drawCounter: guard('drawCounter', drawCounter),
    setHealth: guard('setHealth', function (who, lives) {
      if (!who || !Number.isFinite(lives) || lives < 0) { warn('Escolha um personagem e uma quantidade de vidas maior ou igual a zero.'); return; }
      who.health = lives; who.maxHealth = lives;
    }),
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
    rpgCountItem: guard('rpgCountItem', rpgCountItem),
    rpgRemoveItem: guard('rpgRemoveItem', rpgRemoveItem),
    rpgDrawInventory: guard('rpgDrawInventory', rpgDrawInventory),
    rpgGoMap: guard('rpgGoMap', rpgGoMap),
    rpgSetStartMap: guard('rpgSetStartMap', rpgSetStartMap),
    rpgCreateMap: guard('rpgCreateMap', rpgCreateMap),
    rpgOnEnterMap: guard('rpgOnEnterMap', rpgOnEnterMap),
    rpgCreateDoor: guard('rpgCreateDoor', rpgCreateDoor),
    // ----- 🌍 Mundo aberto (bordas ligadas; tamanho vem da criação) -----
    rpgConnectEdge: guard('rpgConnectEdge', rpgConnectEdge),
    rpgCurrentMap: guard('rpgCurrentMap', rpgCurrentMap),
    rpgBattleStats: guard('rpgBattleStats', rpgBattleStats),
    rpgBattleStart: guard('rpgBattleStart', rpgBattleStart),
    rpgOnBattleEnd: guard('rpgOnBattleEnd', function (fn) {
      if (typeof fn === 'function') rpg.onBattleEnd.push(fn);
    }),
    rpgBattleWon: guard('rpgBattleWon', function () { return rpg.battleWon === true; }),
    // ----- ⚔️ V8: batalha rica (progressão) -----
    rpgSetSpecial: guard('rpgSetSpecial', rpgSetSpecial),
    rpgGivePotion: guard('rpgGivePotion', rpgGivePotion),
    rpgHealHero: guard('rpgHealHero', rpgHealHero),
    rpgBattleReward: guard('rpgBattleReward', rpgBattleReward),
    rpgInflict: guard('rpgInflict', rpgInflict),
    // ----- ⚔️ batalha em EQUIPE: aliados, inimigos e golpes nomeados -----
    rpgAddAlly: guard('rpgAddAlly', rpgAddAlly),
    rpgAddFoe: guard('rpgAddFoe', rpgAddFoe),
    // ⚔️ Fichas reutilizáveis: define separado + escolhe na hora de batalhar.
    rpgDefineBattler: guard('rpgDefineBattler', rpgDefineBattler),
    rpgAddFoeNamed: guard('rpgAddFoeNamed', rpgAddFoeNamed),
    rpgBattleNamed: guard('rpgBattleNamed', rpgBattleNamed),
    rpgTeachMove: guard('rpgTeachMove', rpgTeachMove),
    rpgTeachHeal: guard('rpgTeachHeal', rpgTeachHeal),
    rpgLevel: guard('rpgLevel', function () { return rpg.playerLevel; }),
    rpgXp: guard('rpgXp', function () { return rpg.playerXp; }),
    // ----- 👑 R30: chefes (o inimigo usa golpes; ler vida; IA de chefe) -----
    rpgAddBoss: guard('rpgAddBoss', rpgAddBoss),
    battlerLife: guard('battlerLife', battlerLife),
    battlerMaxLife: guard('battlerMaxLife', battlerMaxLife),
    rpgOnFoeTurn: guard('rpgOnFoeTurn', rpgOnFoeTurn),
    rpgFoeUse: guard('rpgFoeUse', rpgFoeUse),
    rpgFoeHitAll: guard('rpgFoeHitAll', rpgFoeHitAll),
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
      // onGameStart DOBRAVA a taxa a cada "Jogar de novo").
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
    nearestActive: guard('nearestActive', nearestActive),
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
    paddleBounce: guard('paddleBounce', paddleBounce),
    boardCreate: guard('boardCreate', boardCreate),
    boardSet: guard('boardSet', boardSet),
    boardGet: guard('boardGet', boardGet),
    boardCount: guard('boardCount', boardCount),
    boardIn: guard('boardIn', boardIn),
    // ----- 🃏 R30: cartas (pilha = lista do núcleo; carta de 2 faces; mão) -----
    pileMoveTop: guard('pileMoveTop', pileMoveTop),
    pileShuffleFrom: guard('pileShuffleFrom', pileShuffleFrom),
    pileTop: guard('pileTop', pileTop),
    pileSize: guard('pileSize', pileSize),
    card: guard('card', makeCard),
    cardFlip: guard('cardFlip', cardFlip),
    cardIsUp: guard('cardIsUp', cardIsUp),
    cardFace: guard('cardFace', cardFace),
    handDraw: guard('handDraw', handDraw),
    cardAt: guard('cardAt', cardAt),
    // ----- 🃏 R30: Kit Cartas (deck-battler / RPG de cartas) -----
    cardsStart: guard('cardsStart', cardsStart),
    cardsEnergyPerTurn: guard('cardsEnergyPerTurn', cardsEnergyPerTurn),
    cardsEnergy: guard('cardsEnergy', cardsEnergy),
    cardsSpend: guard('cardsSpend', cardsSpend),
    cardsHeroLife: guard('cardsHeroLife', cardsHeroLife),
    cardsEnemyLife: guard('cardsEnemyLife', cardsEnemyLife),
    cardsHurtEnemy: guard('cardsHurtEnemy', cardsHurtEnemy),
    cardsHurtMe: guard('cardsHurtMe', cardsHurtMe),
    cardsGainBlock: guard('cardsGainBlock', cardsGainBlock),
    cardsEnemyIntent: guard('cardsEnemyIntent', cardsEnemyIntent),
    cardsIntentAction: guard('cardsIntentAction', cardsIntentAction),
    cardsIntentValue: guard('cardsIntentValue', cardsIntentValue),
    cardsOnTurn: guard('cardsOnTurn', cardsOnTurn),
    cardsOnEnemyTurn: guard('cardsOnEnemyTurn', cardsOnEnemyTurn),
    cardsEndTurn: guard('cardsEndTurn', cardsEndTurn),
    cardsDrawHud: guard('cardsDrawHud', cardsDrawHud),
    everySeconds: guard('everySeconds', everySeconds),
    waitThen: guard('waitThen', waitThen),
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
    // R21 — primitivos gerais
    randomActive: guard('randomActive', randomActive),
    floatText: guard('floatText', floatText),
    trailOn: guard('trailOn', trailOn),
    trailOff: guard('trailOff', trailOff),
    shockwave: guard('shockwave', shockwave),
    scrollImage: guard('scrollImage', scrollImage),
    leanOnMove: guard('leanOnMove', leanOnMove),
    fanShot: guard('fanShot', fanShot),
    // 🛤️ R25 — caminhos + escolher-vivo + paralaxe + explosão por folha
    definePath: guard('definePath', definePath),
    pathPoint: guard('pathPoint', pathPoint),
    followPath: guard('followPath', followPath),
    pathProgress: guard('pathProgress', pathProgress),
    // ----- 🎲 R30: jogos de tabuleiro (dado, turnos, trilha de casas) -----
    rollDice: guard('rollDice', rollDice),
    playersSetup: guard('playersSetup', playersSetup),
    currentPlayer: guard('currentPlayer', currentPlayer),
    nextPlayer: guard('nextPlayer', nextPlayer),
    onTurnChange: guard('onTurnChange', onTurnChange),
    moveAlongTrack: guard('moveAlongTrack', moveAlongTrack),
    spaceOf: guard('spaceOf', spaceOf),
    onLandSpace: guard('onLandSpace', onLandSpace),
    pickActive: guard('pickActive', pickActive),
    parallaxLayer: guard('parallaxLayer', parallaxLayer),
    sheetBurst: guard('sheetBurst', sheetBurst),
    // 🏰 R26 — Kit Defesa de Torre
    tdWave: guard('tdWave', tdWave),
    tdSlot: guard('tdSlot', tdSlot),
    tdDrawSlots: guard('tdDrawSlots', tdDrawSlots),
    tdOnBuy: guard('tdOnBuy', tdOnBuy),
    tdFreeSlot: guard('tdFreeSlot', tdFreeSlot),
    tdDrawRange: guard('tdDrawRange', tdDrawRange),
    tdSetCoins: guard('tdSetCoins', tdSetCoins),
    tdAddCoins: guard('tdAddCoins', tdAddCoins),
    tdCoins: guard('tdCoins', tdCoins),
    // 🚀 R22 — Kit Nave
    naveShip: guard('naveShip', naveShip),
    navePowerup: guard('navePowerup', navePowerup),
    navePowerOf: guard('navePowerOf', navePowerOf),
    naveWave: guard('naveWave', naveWave),
    naveWaveShooter: guard('naveWaveShooter', naveWaveShooter),
    naveInvasionLine: guard('naveInvasionLine', naveInvasionLine),
    naveStarfield: guard('naveStarfield', naveStarfield),
    naveBomb: guard('naveBomb', naveBomb),
    setVelocityAngle: guard('setVelocityAngle', setVelocityAngle),
    angleOf: guard('angleOf', angleOf),
    angleTo: guard('angleTo', angleTo),
    thrust: guard('thrust', thrust),
    applyFriction: guard('applyFriction', applyFriction),
    setOpacity: guard('setOpacity', setOpacity),
    opacityOf: guard('opacityOf', opacityOf),
    fadeTo: guard('fadeTo', fadeTo),
    tweenProperty: guard('tweenProperty', tweenProperty),
    setHitbox: guard('setHitbox', setHitbox),
    setHitboxShape: guard('setHitboxShape', setHitboxShape),
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
    setSwingWindow: guard('setSwingWindow', setSwingWindow),
    lutaMatch: guard('lutaMatch', lutaMatch),
    lutaDrawHud: guard('lutaDrawHud', lutaDrawHud),
    lutaWinner: guard('lutaWinner', lutaWinner),
    lutaRoundNow: guard('lutaRoundNow', lutaRoundNow),
    lutaWinsOf: guard('lutaWinsOf', lutaWinsOf),
    lutaFighter: guard('lutaFighter', lutaFighter),
    lutaAI: guard('lutaAI', lutaAI),
    lutaIsGuarding: guard('lutaIsGuarding', lutaIsGuarding),
    lutaMove: guard('lutaMove', lutaMove),
    lutaMoveAnim: guard('lutaMoveAnim', lutaMoveAnim),
    lutaAttack: guard('lutaAttack', lutaAttack),
    lutaComboOf: guard('lutaComboOf', lutaComboOf),
    lutaSpecialOf: guard('lutaSpecialOf', lutaSpecialOf),
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

  // Diagnóstico opt-in do HOST: o Estúdio e seus harnesses podem fornecer um
  // registro separado para inspecionar o runtime. Nada é acrescentado à API da
  // criança, e num projeto/export comum esse objeto nem existe.
  var runtimeInspectors = window.__SZSTUDIO_RUNTIME_INSPECTORS;
  if (runtimeInspectors && typeof runtimeInspectors === 'object') {
    try {
      runtimeInspectors['game-2d-advanced:campaign'] = proCampaignInspect;
      runtimeInspectors['game-2d-advanced:perf'] = function (zerar) {
        var lido = { quadros: perf.quadros, passos: perf.passos, pares: perf.pares, caixas: perf.caixas, visitas: perf.visitas, linhasDeMapa: perf.linhasDeMapa };
        if (zerar === true) perf = { quadros: 0, passos: 0, pares: 0, caixas: 0, visitas: 0, linhasDeMapa: 0 };
        return lido;
      };
      runtimeInspectors['game-2d-advanced:rpg'] = function () {
        var hero = rpg.hero;
        var s = tilePx || 1;
        return {
          map: rpg.currentMap,
          heroCellX: hero ? Math.round(num(hero.x, 0) / s) : null,
          heroCellY: hero ? Math.round(num(hero.y, 0) / s) : null,
          destinationCellX: hero && hero._gridDest ? Math.round(num(hero._gridDest.x, 0) / s) : null,
          destinationCellY: hero && hero._gridDest ? Math.round(num(hero._gridDest.y, 0) / s) : null,
          facingDirection: hero ? hero._facingDir || 'down' : null,
          dialogOpen: !!rpg.dialog,
          sceneOpen: !!rpg.scene,
          doorCells: Object.keys(rpg.doors)
        };
      };
      runtimeInspectors['game-2d-advanced:battle'] = function () {
        var b = rpg.battle;
        if (!b) return null;
        function snap(c) { return { name: c.name, side: c.side, hp: c.hp, max: c.max, energy: c.energy, alive: c.alive, poison: c.poison, regen: c.regen, str: c.str, def: c.def, moves: c.moves.length, boss: !!c.boss, image: c.image, color: c.color }; }
        var i;
        var allies = []; for (i = 0; i < b.allies.length; i++) allies.push(snap(b.allies[i]));
        var foes = []; for (i = 0; i < b.foes.length; i++) foes.push(snap(b.foes[i]));
        return {
          phase: b.phase,
          menuOpen: !!rpg.menu,
          menuIndex: rpg.menu ? rpg.menu.index : -1,
          menuLabels: rpg.menu ? rpg.menu.options.map(function (o) { return o.label; }) : [],
          actor: b.actor ? b.actor.name : '',
          inspect: b.inspect ? b.inspect.name : '',
          target: b.target ? b.target.name : '',
          allies: allies, foes: foes
        };
      };
    } catch (e) {}
  }

  Object.defineProperty(api, 'runProject', {
    value: guard('runProject', runProject), enumerable: false
  });
  // defineProperty installs the non-enumerable lifecycle API before publication.
  window.SZGameKit = /** @type {GameKitRuntimeApi} */ (api);
})();
