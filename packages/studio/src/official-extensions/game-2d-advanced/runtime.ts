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
    pauseKey: 'escape',
    // "Ocupar a tela toda": a resolução interna ACOMPANHA a viewport (sem
    // proporção fixa, sem barras) em vez do letterbox de resolução travada.
    fill: false
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
        // R21: sobras visuais da partida anterior ("+100" no ar, onda no meio).
        // Os RASTROS ficam: o do herói (persistente) deve sobreviver ao "Jogar de
        // novo", e o de entidade reciclada o stepTrails varre sozinho.
        while (floaties.active.length) floaties.free.push(floaties.active.pop());
        while (shockwaves.active.length) shockwaves.free.push(shockwaves.active.pop());
        while (sheetBursts.active.length) sheetBursts.free.push(sheetBursts.active.pop());
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
        // ⚠️ R18: um "Esperar 30 s → nasce o chefe" da partida ANTERIOR dispararia
        // no meio da partida nova. É o mesmo erro do checkpoint/tweens abaixo.
        waits.length = 0;
        // ⚠️ idem: sem isto, "Jogar de novo" recomeçava no round 3 com 2 a 0.
        lutaNewGame();
        // 🚀 idem: onda/bomba/poder da partida anterior não invadem a nova.
        naveNewGame();
        // 🏰 idem: ondas somem, slots liberam, moedas voltam ao inicial.
        tdNewGame();
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
    // Rect 0x0 = canvas ainda sem layout (só no teste headless; o preview usa
    // opacity:0, que preserva o rect). Escala 1: clientX vira coord do jogo.
    var rw = rect.width > 0 ? rect.width : config.w;
    var rh = rect.height > 0 ? rect.height : config.h;
    var x = (ev.clientX - rect.left) * (config.w / rw);
    var y = (ev.clientY - rect.top) * (config.h / rh);
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
      // ⚔️ Batalha em equipe: o clique é da BATALHA (painel de ação + escolher/
      // inspecionar combatente). Coords SEM câmera (a cena é desenhada em tela).
      if (rpg.battle && state === 'batalha') {
        rpgBattleClick(p.x - (camera.on ? camera.x : 0), p.y - (camera.on ? camera.y : 0));
        return;
      }
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
      // 🏰 Compra de torre: um slot livre sob o clique consome o evento ANTES
      // dos "Quando clicar no jogo" (que segue livre p/ a receita de upgrade).
      if (tdHandleClick(p.x, p.y)) return;
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
      canvasEl.style.border = '0';
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
    var imgKey = '__tm_' + nm;
    loadImage(imgKey, meta.tileset.dataUrl); // a folha embutida entra por dataUrl
    tilemaps[nm] = {
      rows: parseTileGrid(meta.grid),
      artTile: (typeof meta.tileSize === 'number' && meta.tileSize > 0) ? meta.tileSize : 32,
      imgKey: imgKey, solid: solid, platform: platform
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
    // 🌍 Culling: só a FATIA visível da câmera (o jeito dos jogos profissionais).
    // Um mapa 512x512 cai de ~262 mil drawImage/quadro para ~200. Fora do passe
    // de mundo (HUD/chamada avulsa) a fatia é a tela — mesmo recorte do canvas.
    var vx = (worldPass && camera.on) ? camera.x : 0;
    var vy = (worldPass && camera.on) ? camera.y : 0;
    var pad = camera.shakeT > 0 ? camera.shakeMag : 0;
    var r0 = Math.max(0, Math.floor((vy - pad) / cell));
    var r1 = Math.min(m.rows.length, Math.ceil((vy + config.h + pad) / cell) + 1);
    for (var r = r0; r < r1; r++) {
      var rowArr = m.rows[r];
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
    worldPass = true; // 🌍 culling SO aqui (mundo transladado; HUD fica de fora)
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
    // ⭐ TUDO do quadro dentro de um try/catch que SEMPRE reagenda o próximo: um erro
    // no motor (batalha, render, um sistema) avisa UMA vez e o jogo SEGUE — nunca
    // congela de vez (antes, um throw aqui matava o requestAnimationFrame e a criança
    // só recuperava recarregando). Os ganchos da criança já eram protegidos pelo
    // runHooks; isto fecha o buraco do próprio motor.
    try {
      // O tremor decai FORA do gate de estado: o render o aplica em todo estado
      // (fim/vitória/pausado/batalha), então decair só em 'jogando' deixava a tela
      // de fim vibrando PARA SEMPRE ("morrer → tremer + terminar o jogo").
      if (camera.shakeT > 0) camera.shakeT = Math.max(0, camera.shakeT - dt);
      stepScreenFx(dt); // idem: o render aplica em TODO estado
      // ⭐ A batalha do Kit Monstrinhos roda no estado 'batalha', onde o
      // stepSystems NÃO anda — e é ele que bombeia o relógio da fala, a
      // navegação do menu, os tweens e as faíscas. Por isso o step é AQUI.
      var estavaEmBatalha = state === 'batalha';
      stepPkmBattle(dt);
      stepRpgBattle(dt); // a batalha em equipe do Kit RPG (mesmo motivo: fora do gate)
      // ⚠️ Se a batalha ACABOU neste quadro, o stepPkmBattle já bombeou relógio + UI +
      // tweens + faíscas (ele faz isso justamente porque o stepSystems não anda em
      // 'batalha'). Sem esta guarda o stepSystems rodaria tudo 2× no quadro da volta.
      if (state === 'jogando' && !estavaEmBatalha) {
        stepSystems(dt);
        // A missão pode ter mudado o estado NESTE quadro (vitória) — não rodar o
        // update da criança num jogo que acabou de terminar (paridade P24).
        if (state === 'jogando') runHooks(updateHooks, dt, 'A cada quadro');
      }
      render();
    } catch (e) {
      warnOnce('gameloop', 'erro no laço do jogo: ' + e);
    }
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
      opacity: 1, _hbX: 0, _hbY: 0, _hbW: 0, _hbH: 0,
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
    c._animFrom = f; c._animTo = t; c._animFps = r; c._animOnce = true;
    c._animStart = playTime;
  }
  /** "Ja tocou tudo?" - puro, sai da conta do playTime: sem lista, sem passo, sem
   * reset. Vale para animacao de uma vez so (a que repete nunca "acaba"). */
  function animEnded(c) {
    if (!c || typeof c !== 'object') return true;
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
    if (!key) return; // nada declarado p/ este estado nem p/ os parentes: no-op
    if (looks && looks[key]) who.look = looks[key];
    if (anims && anims[key]) {
      var a = anims[key];
      if (a.once) {
        // fps ESTICADO p/ a animacao durar exatamente a trava: e isto que faz
        // "pular quadro" nao quebrar nada - a mecanica manda, a animacao obedece.
        var dur = num(who._stateUntil, 0) - playTime;
        var span = a.to - a.from + 1;
        var fps = (who._state === key && dur > 0.01) ? span / dur : a.fps;
        if (who._animState !== key) playAnimOnce(who, a.from, a.to, fps);
      } else if (who._animState !== key) {
        who._animOnce = false;
        playAnim(who, a.from, a.to, a.fps);
      }
    }
    who._animState = key;
  }

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
  /**
   * ⭐ ONDE a caixa vale, e por quê:
   *   · vale  → encostar, olhar, o ponto, a colisão SÓLIDA (parede/chão/tile), as
   *             plataformas de atravessar, andar em cima, pisar no inimigo;
   *   · NÃO vale → borda da tela (não sair / quicar / emendar). Essas são sobre o
   *             DESENHO: a criança quer que o sprite não suma da tela, não que a
   *             caixa não suma. Manter as bordas no desenho é a escolha certa.
   */
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
  /** ⚠️ CAMINHO MAIS QUENTE do runtime: o overlapGroups chama isto até 90 mil vezes
   * por quadro (300 × 300 é o teto de dois enxames cheios). Por isso as bordas são
   * lidas INLINE, uma vez cada: a versão com os 8 hb* aninhados custava ~22 num()
   * por par (o hbRight recalcula o hbLeft por dentro) contra 12 aqui. Mesma conta,
   * mesma caixa — só sem o trabalho repetido. */
  function touching(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
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
      opacity: 1, _hbX: 0, _hbY: 0, _hbW: 0, _hbH: 0,
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
    e.speed = m.speed; e.speedMultiplier = 1; e.damage = m.damage; e.color = m.color;
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
    // R18: janela do golpe + estado/trava de animação (ver blankEntity).
    e._swingStart = 0; e._swingActive = 0; e._swingDur = 0;
    e._animOnce = false; e._animState = '';
    e._state = ''; e._stateUntil = 0; e._stateAnims = null; e._stateLooks = null;
    // ⚙️ Física: reciclado NÃO pode nascer "no chão" nem com recarga/varredura velhas.
    e.onGround = false; e._maxFall = 0; e._cd = 0; e._prevX = e.x; e._prevY = e.y;
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
    var pick = Math.floor(Math.random() * n);
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
   * varrido — o feetNext já projeta o movimento inteiro do quadro (anti-túnel).
   */
  function collideTilemapPlatform(who, m, d) {
    if (!m.platform) return;
    if (num(who.vy, 0) < 0) return; // subindo: atravessa
    if (num(who._dropT, 0) > 0) return; // pediu descer (↓): ignora
    var t = tilePx;
    var feet = hbBottom(who);
    var feetNext = feet + num(who.vy, 0) * d;
    var c0 = Math.floor(hbLeft(who) / t);
    var c1 = Math.floor((hbRight(who) - 1) / t);
    var r0 = Math.floor(feet / t);
    var r1 = Math.floor(feetNext / t) + 1;
    for (var r = r0; r <= r1; r++) {
      var rowArr = m.rows[r];
      if (!rowArr) continue;
      var top = r * t;
      if (feet > top + 1) continue; // já estava abaixo do topo: não é pouso
      if (feetNext < top) continue; // não alcança o plano neste quadro
      for (var c = c0; c <= c1; c++) {
        var idx = rowArr[c];
        if (idx == null || idx < 0 || !m.platform[idx]) continue;
        if (hbRight(who) <= c * t) continue;
        if (hbLeft(who) >= c * t + t) continue;
        who.y = top - hbH(who) - num(who._hbY, 0);
        who.vy = 0;
        who.onGround = true;
        who._prevY = num(who.y, 0); // a varredura não desfaz este pouso
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

  // ---- 🧩 Tabuleiro / grade (Snake, Match-3, Sokoban, campo-minado, puzzles) ----
  // Uma grade NOMEADA de células; a criança varre com "repita" do núcleo + ler/pôr.
  var boards = Object.create(null); // nome -> {cols, rows, empty, cells:[]} (flat row*cols+col)
  function boardAt(name) { return boards[text(name, 'tabuleiro')] || null; }
  function boardCreate(name, cols, rows, empty) {
    var c = Math.max(1, Math.round(num(cols, 8)));
    var r = Math.max(1, Math.round(num(rows, 8)));
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

  // ---- 🃏 R30 — CARTAS: uma pilha É uma LISTA do núcleo (array); os verbos operam
  // por REFERÊNCIA. A criança MONTA memória, Uno, deck-battler com listas + estes. ----
  function pileMoveTop(from, to) {
    if (!Array.isArray(from) || !Array.isArray(to) || from.length === 0) return;
    to.push(from.pop());
  }
  function pileShuffleFrom(deck, discard) {
    if (!Array.isArray(deck) || !Array.isArray(discard)) return;
    while (discard.length) deck.push(discard.pop()); // junta o descarte no monte
    for (var i = deck.length - 1; i > 0; i--) { // e embaralha (Fisher-Yates)
      var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
  }
  function pileTop(pile) { return (Array.isArray(pile) && pile.length) ? pile[pile.length - 1] : null; }
  function pileSize(pile) { return Array.isArray(pile) ? pile.length : 0; }
  // Carta = objeto leve de 2 faces (frente/verso + virada?). Açúcar de apresentação.
  function makeCard(front, back) {
    return { front: front, back: (back === undefined || back === null) ? '?' : back, faceUp: false };
  }
  function cardFlip(c) { if (c && typeof c === 'object') c.faceUp = !c.faceUp; }
  function cardIsUp(c) { return !!(c && typeof c === 'object' && c.faceUp); }
  function cardFace(c) {
    if (!c || typeof c !== 'object') return c; // valor cru (não é carta de 2 faces)
    return c.faceUp ? c.front : c.back;
  }
  // Mão clicável: desenha a lista como fileira/leque e guarda os retângulos por
  // REFERÊNCIA (WeakMap pela própria lista) — o cardAt lê de volta o clique.
  var handRects = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function handDraw(pile, x, y, fan) {
    if (!Array.isArray(pile) || !ctx2d) return;
    var cw = 60, ch = 84, gap = 12, n = pile.length, rects = [];
    var bx = num(x, 0), by = num(y, 0);
    for (var i = 0; i < n; i++) {
      var rx = bx + i * (cw + gap);
      var ry = by + (fan ? Math.abs(i - (n - 1) / 2) * 6 : 0); // leque = leve arco
      ctx2d.save();
      ctx2d.fillStyle = '#fdfdfd'; ctx2d.strokeStyle = '#2b2b2b'; ctx2d.lineWidth = 2;
      ctx2d.fillRect(rx, ry, cw, ch); ctx2d.strokeRect(rx, ry, cw, ch);
      var card = pile[i];
      var face = (card && typeof card === 'object' && 'faceUp' in card) ? (card.faceUp ? card.front : card.back) : card;
      ctx2d.fillStyle = '#1b1b1b'; ctx2d.font = '22px sans-serif';
      ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
      ctx2d.fillText(String(face === undefined || face === null ? '' : face), rx + cw / 2, ry + ch / 2);
      ctx2d.restore();
      rects.push({ x: rx, y: ry, w: cw, h: ch });
    }
    if (handRects) handRects.set(pile, rects);
  }
  function cardAt(x, y, pile) {
    if (!Array.isArray(pile) || !handRects) return -1;
    var rects = handRects.get(pile);
    if (!rects) return -1;
    var px = num(x, 0), py = num(y, 0);
    for (var i = rects.length - 1; i >= 0; i--) { // de trás pra frente: o de cima vence
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  // ---- 🃏 R30 — Kit Cartas: o RPG DE CARTAS (deck-battler). RECEITA, não mágica:
  // o kit dá o andaime (vida/energia/escudo/intenção/turnos + HUD); a criança MONTA
  // o deck (listas + cartas), a mão e O QUE CADA CARTA FAZ com os verbos abaixo. ----
  var cards = { battle: null, onTurn: [], onEnemyTurn: [] };
  function cardsStart(heroHp, enemyHp) {
    var hh = Math.max(1, num(heroHp, 30)), eh = Math.max(1, num(enemyHp, 40));
    cards.battle = {
      heroHp: hh, heroMax: hh, enemyHp: eh, enemyMax: eh,
      energy: 3, energyPerTurn: 3, block: 0,
      intentAction: 'atacar', intentValue: 6
    };
    // ⚠️ NÃO muda o estado: o jogo de cartas roda no 'jogando' da criança (senão o
    // onUpdate/teclas congelariam). O 1º "meu turno" começa já.
    cardsStartTurn();
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
    var absorbed = Math.min(cards.battle.block, d); // o escudo absorve primeiro
    cards.battle.block -= absorbed; d -= absorbed;
    cards.battle.heroHp -= d;
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
    cards.battle.energy = cards.battle.energyPerTurn; // RESET (não regenera como o RPG)
    cards.battle.block = 0; // o escudo some no começo do meu turno (como no gênero)
    for (var i = 0; i < cards.onTurn.length; i++) { try { cards.onTurn[i](); } catch (e) { warn('erro no "Quando começar o meu turno": ' + e); } }
  }
  function cardsEndTurn() {
    if (!cards.battle) return;
    for (var i = 0; i < cards.onEnemyTurn.length; i++) { try { cards.onEnemyTurn[i](); } catch (e) { warn('erro no "Quando for a vez do inimigo": ' + e); } }
    cardsStartTurn(); // volta pra mim (reseta energia/escudo e roda o meu turno)
  }
  function cardsDrawHud() {
    if (!cards.battle || !ctx2d) return;
    var b = cards.battle;
    drawBar(Math.max(0, b.enemyHp), b.enemyMax, config.w / 2 - 130, 46, 260, 18, '#ef4444');
    drawBar(Math.max(0, b.heroHp), b.heroMax, config.w / 2 - 130, config.h - 66, 260, 18, '#4ade80');
    ctx2d.save();
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '15px sans-serif'; ctx2d.textAlign = 'center';
    ctx2d.fillText('👿 vai: ' + b.intentAction + ' ' + b.intentValue, config.w / 2, 34);
    ctx2d.fillText('⚡ Energia: ' + b.energy + '     🛡️ Escudo: ' + b.block, config.w / 2, config.h - 34);
    ctx2d.restore();
  }

  // ---- ⏱️ Tempo (acumulador de dt — NÃO relógio de parede: pausa tem que pausar) ----
  var secondTimers = Object.create(null);
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
    // Os pés são os da CAIXA (quem declarou uma caixa nos pés quer pousar por ela).
    var feet = hbBottom(who);
    var feetNext = feet + num(who.vy, 0) * d;
    var act = pool.active;
    for (var i = 0; i < act.length; i++) {
      var p = act[i];
      if (p === who || p._active === false) continue;
      var top = hbTop(p);
      if (feet > top) continue; // já estava abaixo do topo: não é pouso
      if (feetNext < top) continue; // não alcança o plano neste quadro
      if (hbRight(who) <= hbLeft(p)) continue;
      if (hbLeft(who) >= hbRight(p)) continue;
      who.y = top - hbH(who) - num(who._hbY, 0);
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
    ctxSave();
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
    ctxRestore();
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
    if (rpg.battle) { warn('já tem uma batalha do Kit RPG aberta — use um kit OU o outro'); return; }
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
    var vary = 0.85 + Math.random() * 0.3;
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
    ctx2d.font = '15px sans-serif';
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
    // ⚠️ TODO estado de jogo entra no reset (é a 3ª vez que esta linha é a causa):
    // sem isto, "Jogar de novo" recomeçava com a tabela de selvagens acumulada.
    pkm.wild = [];
    pkm.grass = {};
    pkm.grassTiles = {};
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
  function lutaBlank(c) {
    return {
      c: c, guard: false, stun: 0, combo: 0, comboT: 0, special: 0, wins: 0,
      homeX: num(c.x, 0), homeY: num(c.y, 0), moves: Object.create(null), ai: null, aiT: 0
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
      rounds: Math.max(1, Math.round(num(rounds, 3))),
      secs: Math.max(5, num(secs, 60)),
      round: 1, t: 0, phase: 'anuncio', phaseT: 0, winner: '', roundWinner: ''
    };
  }
  function lutaOther(side) { return side === luta.p1 ? luta.p2 : luta.p1; }
  /** Golpe data-driven. O 3o argumento e a PALAVRA; os tempos sao do motor. */
  function lutaMove(name, who, speed, dmg, range, pierce, special) {
    var side = lutaSide(who);
    if (!side) { warnOnce('lutamove', 'use "Luta de" ANTES de criar os golpes'); return; }
    var k = text(name, '');
    if (!k) { warn('o golpe precisa de um nome'); return; }
    var sp = LUTA_SPEEDS[text(speed, 'médio')];
    if (!sp) { warnOnce('lutasp:' + text(speed, ''), 'velocidade "' + text(speed, '') + '" não existe (use rápido, médio ou pesado)'); return; }
    side.moves[k] = {
      name: k, sp: sp,
      dmg: Math.max(1, num(dmg, 10)),
      range: Math.max(4, num(range, 50)),
      pierce: !!pierce, special: !!special,
      from: 0, to: 0, hasAnim: false
    };
  }
  /** A animacao do golpe: os quadros. O fps e ESTICADO p/ durar exatamente o golpe. */
  function lutaMoveAnim(name, who, from, to) {
    var side = lutaSide(who);
    if (!side) { warnOnce('lutaanim', 'use "Luta de" ANTES'); return; }
    var mv = side.moves[text(name, '')];
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
    ctx2d.font = 'bold 28px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(String(falta), W / 2, 47);
    // bolinhas de round ganho
    lutaDots(W / 2 - 46, 68, luta.p1.wins);
    lutaDots(W / 2 + 34, 68, luta.p2.wins);
    // o letreiro da fase
    var msg = '';
    if (luta.phase === 'anuncio') msg = 'ROUND ' + luta.round;
    else if (luta.phase === 'ko') {
      msg = luta.roundWinner === 'empate' ? 'EMPATE!' : (luta.t >= luta.secs ? 'TEMPO!' : 'K.O.!');
    }
    if (msg) {
      ctx2d.fillStyle = config.accent || '#ffffff';
      ctx2d.font = 'bold 56px sans-serif';
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
      ctx2d.font = 'bold 16px sans-serif';
      ctx2d.textAlign = direita ? 'right' : 'left';
      ctx2d.fillText(side.combo + ' seguidos!', direita ? x + w : x, y + 50);
      ctx2d.textAlign = 'left';
    }
  }
  function lutaDots(x, y, n) {
    for (var i = 0; i < 2; i++) {
      ctx2d.fillStyle = i < n ? '#e0b020' : 'rgba(255,255,255,0.25)';
      ctx2d.beginPath();
      ctx2d.arc(x + i * 16, y, 5, 0, Math.PI * 2);
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

  // ---- 🖥️/✨/🔁 R21: primitivos gerais de "juice" (o MOTOR desenha) ----
  /**
   * Texto flutuante ("+100" que sobe e some) — o feedback de TODO arcade/RPG/luta.
   * O motor move e desenha sozinho (precedente: a fala do RPG); em coords do
   * MUNDO, entao acompanha a camera. Fisica fixa de proposito: sobe 40px e some
   * em 0,75 s (o score label do Chris Courses) — nao e resposta da crianca.
   */
  function floatText(txt, x, y, color, size) {
    if (floaties.active.length >= MAX_FLOATIES) {
      warnOnce('floaties', 'muitos textos flutuantes de uma vez (teto ' + MAX_FLOATIES + ')');
      return;
    }
    var f = floaties.free.pop() || {};
    f.text = text(txt, '');
    f.x = num(x, 0);
    f.y = num(y, 0);
    f.t = 0;
    f.life = 0.75;
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
      ctx2d.font = floatieFonts[fs] || (floatieFonts[fs] = 'bold ' + fs + 'px sans-serif');
      ctx2d.fillText(f.text, f.x, f.y);
    }
    try { ctx2d.globalAlpha = prev; } catch (e) {}
  }
  /**
   * Onda de choque VISUAL (a explosao da Bomb do Chris: circulo cresce 0->R e
   * some). So desenho — o dano em area e da crianca: "para cada vivo do molde +
   * distancia entre + machucar" (receita nas docs). Assim a colisao continua
   * sendo dela.
   */
  function shockwave(x, y, radius, seconds, color) {
    if (shockwaves.active.length >= MAX_SHOCKWAVES) {
      warnOnce('shockwaves', 'muitas ondas de choque de uma vez (teto ' + MAX_SHOCKWAVES + ')');
      return;
    }
    var s = shockwaves.free.pop() || {};
    s.x = num(x, 0);
    s.y = num(y, 0);
    s.r = Math.max(1, num(radius, 200));
    s.t = 0;
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
      try {
        ctx2d.arc(s.x, s.y, Math.max(1, s.r * k), 0, Math.PI * 2);
        ctx2d.fill();
      } catch (e) {}
    }
    try { ctx2d.globalAlpha = prev; } catch (e) {}
  }
  /**
   * Rastro continuo (jato da nave, cauda de cometa, escapamento): solta faiscas
   * do CENTRO da entidade numa taxa por segundo. Reusa o pool GLOBAL de faiscas
   * (o teto MAX_PARTICLES degrada suave, como o burst). Estado por ENTIDADE
   * (contrato do pool) + registro varrido reverso (padrao combatants).
   */
  function trailOn(who, color, size, rate, life) {
    if (!who || typeof who !== 'object') return;
    if (!who._trailOn) trailed.push(who);
    who._trailOn = true;
    who._trailColor = text(color, '#ffffff');
    who._trailSize = Math.max(1, num(size, 3));
    // clamp 60/s: um enxame inteiro com rastro forte engoliria o teto global e
    // as EXPLOSOES da crianca parariam de aparecer.
    who._trailRate = Math.max(1, Math.min(60, num(rate, 30)));
    who._trailLife = Math.max(0.05, Math.min(3, num(life, 0.4)));
  }
  function trailOff(who) {
    if (who && typeof who === 'object') who._trailOn = false;
  }
  function stepTrails(dt) {
    for (var i = trailed.length - 1; i >= 0; i--) {
      var e = trailed[i];
      if (!e || e._trailOn !== true || e._active === false) {
        // morreu/desligou/foi reciclado: sai do registro (e o flag morre junto,
        // p/ o objeto reusado pelo pool nao arrastar o rastro do anterior).
        if (e) e._trailOn = false;
        trailed[i] = trailed[trailed.length - 1];
        trailed.pop();
        continue;
      }
      // Registrado 2x (ligar de novo apos reciclar)? O carimbo emite 1x so.
      if (e._trailFrame === frameCount) continue;
      e._trailFrame = frameCount;
      e._trailAcc = num(e._trailAcc, 0) + e._trailRate * dt;
      while (e._trailAcc >= 1) {
        e._trailAcc -= 1;
        if (particles.active.length >= MAX_PARTICLES) { e._trailAcc = 0; break; }
        var p = particles.free.pop() || {};
        p.x = centerX(e) + (Math.random() - 0.5) * e.w * 0.3;
        p.y = centerY(e) + (Math.random() - 0.5) * e.h * 0.3;
        p.vx = (Math.random() - 0.5) * 30;
        p.vy = (Math.random() - 0.5) * 30;
        p.life = e._trailLife;
        p.max = e._trailLife;
        p.size = e._trailSize;
        p.color = e._trailColor;
        p.gravity = 0;
        particles.active.push(p);
      }
    }
  }
  /**
   * 🎨 Inclinacao ao andar de lado (o "lean" da nave do Chris, ±0.15 rad): o
   * desenho tomba ate N graus na direcao do movimento, suavizado. 0 = desliga.
   * So visual — quem inclina e o wrapper de giro do drawEntity.
   */
  function leanOnMove(who, degrees) {
    if (!who || typeof who !== 'object') return;
    who._leanMax = num(degrees, 10);
  }
  /**
   * 🔁 Fundo que ROLA (a versao geral do starfield/parallax): repete a imagem
   * cobrindo o retangulo visivel (camera-aware, como o drawBackground) e desloca
   * o padrao em px/s. Chame no "Desenhar o jogo" como 1a camada; varias imagens
   * com velocidades diferentes = parallax. Anda 1x por quadro (carimbo — desenhar
   * 2x nao dobra a velocidade) e congela fora de 'jogando' (pausa pausa).
   */
  function scrollImage(name, vx, vy) {
    var k = text(name, '');
    var rec = images[k];
    // O aviso vem ANTES do gate de canvas: nome errado nunca e silencioso.
    if (!rec || !rec.loaded || !rec.img) {
      warnOnce('scroll:' + k, 'a imagem "' + k + '" não está carregada — use "Carregar a imagem"');
      return;
    }
    if (!ctx2d) return;
    var iw = Math.max(1, num(rec.img.width, 1));
    var ih = Math.max(1, num(rec.img.height, 1));
    // Imagem minuscula viraria milhares de drawImage por quadro.
    if ((config.w / iw + 2) * (config.h / ih + 2) > 4096) {
      warnOnce('scrollsmall:' + k, 'a imagem "' + k + '" é pequena demais para rolar de fundo');
      return;
    }
    var st = scrolls[k] || (scrolls[k] = { ox: 0, oy: 0, frame: -1 });
    if (st.frame !== frameCount && state === 'jogando') {
      st.frame = frameCount;
      st.ox += num(vx, 0) * currentDt;
      st.oy += num(vy, 0) * currentDt;
    }
    var camX = camera.on ? camera.x : 0;
    var camY = camera.on ? camera.y : 0;
    var mx = (((camX - st.ox) % iw) + iw) % iw;
    var my = (((camY - st.oy) % ih) + ih) % ih;
    var x0 = camX - mx;
    var y0 = camY - my;
    for (var ty = y0; ty < camY + config.h; ty += ih) {
      for (var tx = x0; tx < camX + config.w; tx += iw) {
        try { ctx2d.drawImage(rec.img, tx, ty, iw, ih); } catch (e) {}
      }
    }
  }
  /**
   * 🔁 R25 — fundo PRESO À CÂMERA (paralaxe do sunnyland: camera.x*0.32). O
   * scrollImage rola por VELOCIDADE (tela fixa); este acompanha a POSIÇÃO da
   * câmera a um fator (0 = céu ao infinito; 1 = colado no mundo). Duas camadas
   * com fatores diferentes = profundidade de verdade num jogo com câmera.
   */
  function parallaxLayer(name, fx, fy) {
    var k = text(name, '');
    var rec = images[k];
    if (!rec || !rec.loaded || !rec.img) {
      warnOnce('parallax:' + k, 'a imagem "' + k + '" não está carregada — use "Carregar a imagem"');
      return;
    }
    if (!ctx2d) return;
    if (!camera.on) { warnOnce('parallaxcam:' + k, 'a paralaxe precisa da câmera ligada — use "A câmera segue"'); }
    var iw = Math.max(1, num(rec.img.width, 1));
    var ih = Math.max(1, num(rec.img.height, 1));
    if ((config.w / iw + 2) * (config.h / ih + 2) > 4096) {
      warnOnce('parallaxsmall:' + k, 'a imagem "' + k + '" é pequena demais para o fundo');
      return;
    }
    var camX = camera.on ? camera.x : 0;
    var camY = camera.on ? camera.y : 0;
    var pfx = Math.max(0, Math.min(1, num(fx, 0.3)));
    var pfy = Math.max(0, Math.min(1, num(fy, 1)));
    // A camada "atrasa" a câmera pelo fator: desenhada em coords de mundo, seu
    // canto acompanha camX*(1-fator) — fator 0 fica colado na tela (céu), 1
    // acompanha o mundo. Tiling cobrindo o retângulo visível.
    var ax = camX * (1 - pfx);
    var ay = camY * (1 - pfy);
    var mx = (((camX - ax) % iw) + iw) % iw;
    var my = (((camY - ay) % ih) + ih) % ih;
    var x0 = camX - mx;
    var y0 = camY - my;
    for (var ty = y0; ty < camY + config.h; ty += ih) {
      for (var tx = x0; tx < camX + config.w; tx += iw) {
        try { ctx2d.drawImage(rec.img, tx, ty, iw, ih); } catch (e) {}
      }
    }
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
    return Math.floor(Math.random() * n) + 1;
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
    tweenTo(who, p.x - who.w / 2, p.y - who.h / 2, 0.3); // desliza suave até a casa
    emit('casa:parou', who);
    for (var i = 0; i < landHooks.length; i++) {
      try { landHooks[i](); } catch (e) { warn('erro no "Quando um peão parar numa casa": ' + e); }
    }
  }
  function spaceOf(who) {
    return (who && typeof who === 'object') ? Math.max(0, Math.round(num(who._spaceIdx, 0))) : 0;
  }
  function onLandSpace(fn) { if (typeof fn === 'function') landHooks.push(fn); }

  // ---- ✨ R25 — explosao por FOLHA one-shot (a explosion.png do Chris em 1
  // bloco; hoje custa spawn + playAnimOnce + vigiar animEnded + recycle). ----
  function sheetBurst(name, frames, fps, x, y, size) {
    if (sheetBursts.active.length >= MAX_SHEET_BURSTS) {
      warnOnce('sheetbursts', 'muitas explosões de folha ao mesmo tempo (teto ' + MAX_SHEET_BURSTS + ')');
      return;
    }
    var k = text(name, '');
    var rec = images[k];
    if (!rec || !rec.loaded || !rec.img) {
      warnOnce('sheetburst:' + k, 'a imagem "' + k + '" não está carregada — use "Carregar a imagem"');
      return;
    }
    var s = sheetBursts.free.pop() || {};
    s.img = rec.img;
    s.frames = Math.max(1, Math.round(num(frames, 4)));
    s.fps = Math.max(1, num(fps, 12));
    s.x = num(x, 0);
    s.y = num(y, 0);
    s.size = Math.max(4, num(size, 64));
    s.t = 0;
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
  // Os "Quando comprar" registrados: cada clique num slot livre com moedas roda o corpo.
  var tdBuyers = [];
  function tdOnBuy(cost, fn) {
    if (typeof fn !== 'function') return;
    tdBuyers.push({ cost: Math.max(0, num(cost, 50)), fn: fn });
  }
  /** Clique no jogo: 1o slot livre sob o ponto. Paga e roda o corpo, ou avisa. */
  function tdHandleClick(px, py) {
    if (!tdBuyers.length) return false;
    var slot = tdSlotAt(px, py);
    if (!slot) return false;
    var did = false;
    for (var i = 0; i < tdBuyers.length; i++) {
      var b = tdBuyers[i];
      if (td.coins >= b.cost) {
        td.coins -= b.cost;
        slot.occupied = true;
        did = true;
        try { b.fn(slot.x, slot.y); } catch (e) { warn('erro no "Quando comprar a torre": ' + e); }
      } else {
        emit('compra:negada', null);
        did = true; // consome o clique (nao cai no "Quando clicar no jogo")
      }
    }
    return did;
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
        st.xs.push(Math.random() * config.w);
        st.ys.push(Math.random() * config.h);
        st.rs.push(1 + Math.random() * 2);
      }
    }
    var v = num(speed, 20);
    // Anda 1x por quadro (carimbo) e congela fora de 'jogando', como as faiscas.
    if (st.frame !== frameCount && state === 'jogando') {
      st.frame = frameCount;
      for (var j = 0; j < n; j++) {
        st.ys[j] += v * currentDt;
        if (st.ys[j] > config.h) { st.ys[j] = -2; st.xs[j] = Math.random() * config.w; }
        else if (st.ys[j] < -4) { st.ys[j] = config.h; st.xs[j] = Math.random() * config.w; }
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
    e.x = ox + e.w + Math.random() * (config.w - e.w * 3);
    e.y = oy + e.h + Math.random() * (config.h * 0.5);
    e._prevX = e.x; e._prevY = e.y;
    e.vx = (Math.random() - 0.5) * 360; // o +-3 px/quadro do Chris, em px/s
    e.vy = (Math.random() - 0.5) * 360;
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
    npcs: nameMap(),      // nome -> entidade (sólida na grade)
    npcTalk: nameMap(),   // nome -> [fns do "quando conversar"]
    doors: {},            // 'cx,cy' -> nome do mapa
    stepHandlers: {},     // 'cx,cy' -> [fns do "quando pisar" — footstep cutscenes]
    flags: nameMap(),     // StoryFlags: nome -> true
    items: [],            // inventário: {name, image}
    maps: nameMap(),      // nome -> [fns de montagem]
    mapOrder: [],         // ordem de registro (o 1º é o mapa inicial)
    currentMap: '',
    // 🌍 Mundo aberto: tamanho do mapa ATUAL em células + bordas ligadas
    // ('norte'|'sul'|'leste'|'oeste' -> nome do mapa). Declarados DENTRO do
    // "Quando chegar no mapa" e remontados a cada entrada (como pkm.grass).
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
    movesByName: {},      // nome -> [{name, dmg, cost, heal}] — "Ensinar o golpe"
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
    foeTurnHooks: nameMap()
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
    // O time e os golpes fazem parte do JOGO, não do motor: zeram ao recomeçar.
    rpg.allies = [];
    rpg.foeQueue = [];
    rpg.movesByName = nameMap();
    rpg.scene = null;
    rpg.recording = false;
    rpg.sceneSteps = [];
    rpg.fade = 0;
    rpg.menu = null;
    rpg.menuBuilding = null;
    if (rpg.mapOrder.length > 0) rpgGoMap(rpg.mapOrder[0]);
    // Se "Recomeçar" rodou NO MEIO de uma batalha, a batalha foi zerada acima —
    // sem isto o mundo ficaria preso no estado 'batalha' (nada a desenhar/avançar).
    // No caminho normal (setState('jogando')) o estado já é 'jogando' → no-op.
    if (state === 'batalha') setState('jogando');
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
      _swingStart: 0, _swingActive: 0, _swingDur: 0,
      _animOnce: false, _animState: '',
      _state: '', _stateUntil: 0, _stateAnims: null, _stateLooks: null,
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
      // 🌍 Mundo aberto: o passo cruzaria a BORDA do mapa? Com ligação, viaja
      // (estilo Zelda: entra espelhado do outro lado); sem ligação, a borda é o
      // fim do mundo (só virou de lado). Sem "Este mapa tem", NADA muda. ⭐ POR EIXO:
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
    rpg.npcs = nameMap();
    rpg.doors = {};
    rpg.stepHandlers = {};   // gatilhos de pisar são por-mapa (montados de novo)
    // ⭐ A grama e a tabela de selvagens TAMBÉM são por-mapa (o exemplo oficial
    // chama "Na grama alta deste mapa..." de DENTRO do "Quando chegar no mapa").
    // Sem limpar aqui, o pkmWild — que faz PUSH — duplicava a cada entrada: sair e
    // voltar 20× no quintal dava 40 entradas; e a tabela sendo global fazia os
    // bichos do quintal aparecerem na caverna, apesar do comentário prometer o
    // contrário. Quem chama no topo (sem mapas) nunca passa por aqui: segue global.
    pkm.wild = [];
    pkm.grass = {};
    pkm.grassTiles = {};
    // 🌍 Tamanho e bordas TAMBÉM são por-mapa (declarados dentro do hook).
    rpg.mapCols = 0;
    rpg.mapRows = 0;
    rpg.edges = {};
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
  // ---- 🌍 Mundo aberto: tamanho do mapa + bordas ligadas (estilo Zelda) ----
  /** Tamanho do mapa ATUAL em células (use dentro do "Quando chegar no mapa").
   *  Liga a trava da câmera E o "fim do mundo" nas bordas sem ligação. */
  function rpgMapSize(cols, rows) {
    rpg.mapCols = Math.max(0, Math.round(num(cols, 0)));
    rpg.mapRows = Math.max(0, Math.round(num(rows, 0)));
  }
  var EDGE_SIDES = { norte: true, sul: true, leste: true, oeste: true };
  /** Liga uma borda deste mapa a outro mapa: atravessou, viaja (declare o
   *  "Este mapa tem" antes, e ligue a borda ESPELHADA no outro mapa também). */
  function rpgConnectEdge(side, map) {
    var s = text(side, '');
    var k = text(map, '');
    if (!EDGE_SIDES[s]) {
      warnOnce('edgeside:' + s, 'a borda "' + s + '" não existe (use norte, sul, leste ou oeste)');
      return;
    }
    if (!k) return;
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
      rpg.flags = nameMap(data.flags); // save vem por JSON.parse (protótipo comum) -> normaliza
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
      // "Continuar" no meio de uma batalha: a batalha foi zerada acima — devolve o
      // jogo ao mundo, senão fica preso no estado 'batalha' sem nada a avançar.
      if (state === 'batalha') setState('jogando');
    } catch (e) { warn('não consegui carregar o jogo: ' + e); }
  }

  // ⚔️ Batalha por turnos RICA (Combatant/TurnCycle do Pizza, 1v1): Atacar/
  // Especial (energia)/Item (poção)/Defender/Fugir; defesa reduz o dano; XP sobe
  // de nível; veneno tira vida por turno. Dano = força ± 20% − defesa/2.
  function rollDamage(strength, targetDef) {
    var raw = Math.round(num(strength, 1) * (0.8 + Math.random() * 0.4));
    return Math.max(1, raw - Math.floor(num(targetDef, 0) / 2));
  }
  // ---- ⚔️ Batalha em EQUIPE (canvas): combatentes clicáveis + painéis ----
  // Um COMBATENTE carrega os próprios atributos (o createCharacter não tem stats de
  // luta). O herói entra a partir dos rpg.player* (progressão persiste); aliados e
  // inimigos vêm de "Adicionar aliado/inimigo"; os golpes nomeados de "Ensinar o golpe".
  function makeBattler(name, side, hp, str, def, look, color) {
    var mx = Math.max(1, num(hp, 20));
    return {
      name: text(name, side === 'inimigo' ? 'Inimigo' : 'Aliado'), side: side,
      hp: mx, max: mx, str: Math.max(0, num(str, 5)), def: Math.max(0, num(def, 0)),
      energy: 10, maxEnergy: 10, moves: [],
      defending: false, poison: 0, regen: 0, blind: 0, alive: true,
      look: text(look, ''), color: text(color, side === 'inimigo' ? '#e05a5a' : '#4a9eff'),
      image: '', x: 0, y: 0, w: 72, h: 72
    };
  }
  function heroBattler() {
    var b = makeBattler('Você', 'aliado', rpg.playerMax, rpg.playerStr, rpg.playerDef, '', '#4a9eff');
    b.energy = rpg.playerMaxEnergy; b.maxEnergy = rpg.playerMaxEnergy; b.isHero = true;
    // O herói aparece com o SEU visual do mundo (sprite/vetor/cor), se existir.
    if (rpg.hero) { b.image = text(rpg.hero.image, ''); b.look = text(rpg.hero.look, ''); b.color = text(rpg.hero.color, b.color); }
    if (rpg.special) b.moves.push({ name: rpg.special.name, dmg: rpg.special.dmg, cost: rpg.special.cost, heal: false });
    var extra = rpg.movesByName['Você'];
    if (extra) for (var i = 0; i < extra.length; i++) b.moves.push(extra[i]);
    return b;
  }
  function defToBattler(def, side) {
    var b = makeBattler(def.name, side, def.hp, def.str, def.def, def.look, def.color);
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
  function rpgAddAlly(name, hp, str, def, color) {
    rpg.allies.push({ name: text(name, 'Aliado'), hp: num(hp, 24), str: num(str, 6), def: num(def, 1), look: '', color: text(color, '#4ade80') });
  }
  function rpgAddFoe(name, hp, str, def, color) {
    rpg.foeQueue.push({ name: text(name, 'Inimigo'), hp: num(hp, 20), str: num(str, 5), def: num(def, 0), look: '', color: text(color, '#e05a5a') });
  }
  // 👑 O CHEFÃO: um inimigo da próxima batalha desenhado MAIOR, com barra proeminente.
  function rpgAddBoss(name, hp, str, def) {
    rpg.foeQueue.push({ name: text(name, 'Chefão'), hp: num(hp, 120), str: num(str, 9), def: num(def, 2), look: '', color: '#b23b6e', boss: true });
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
    var f = findBattler(name); if (!f || !f.alive) return;
    var mn = text(moveName, ''), mv = null;
    for (var i = 0; i < f.moves.length; i++) if (f.moves[i].name === mn) { mv = f.moves[i]; break; }
    if (!mv) { warnOnce('foeuse:' + f.name + mn, 'o inimigo "' + f.name + '" não tem o golpe "' + mn + '" — ensine com "Ensinar o golpe"'); return; }
    if (mv.heal) foeHeal(f, mv); else foeHit(f, mv);
  }
  // O golpe ASSINATURA de chefão: acerta TODO o time de uma vez.
  function rpgFoeHitAll(name, dmg) {
    var b = rpg.battle; if (!b) return;
    var f = findBattler(name);
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
    b.message = (f ? f.name : text(name, 'O inimigo')) + ' atingiu TODO o time!';
  }
  function rpgTeachMove(who, moveName, dmg, cost) {
    var k = text(who, 'Você');
    if (!rpg.movesByName[k]) rpg.movesByName[k] = [];
    rpg.movesByName[k].push({ name: text(moveName, 'Golpe'), dmg: Math.max(1, num(dmg, 10)), cost: Math.max(0, num(cost, 3)), heal: false });
  }
  // Golpe de CURA (heal:true) — o painel de ação mostra "(cura N)" e o applyHeal
  // devolve vida ao próprio lutador em vez de ferir o inimigo.
  function rpgTeachHeal(who, moveName, amount, cost) {
    var k = text(who, 'Você');
    if (!rpg.movesByName[k]) rpg.movesByName[k] = [];
    rpg.movesByName[k].push({ name: text(moveName, 'Cura'), dmg: Math.max(1, num(amount, 12)), cost: Math.max(0, num(cost, 3)), heal: true });
  }
  function layoutRow(list, cy) {
    var n = list.length; if (n === 0) return;
    var sz = 72, boss = 112, gap = 28;
    var totalW = 0;
    for (var k = 0; k < n; k++) totalW += (list[k].boss ? boss : sz) + (k ? gap : 0);
    var x = (config.w - totalW) / 2;
    for (var i = 0; i < n; i++) {
      var c = list[i];
      var s = c.boss ? boss : sz;
      c.w = s; c.h = s; c.x = x; c.y = cy - s / 2; // topos alinhados; o chefão desce mais
      x += s + gap;
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
    rpg.potions.push({ name: text(name, 'Poção'), heal: Math.max(1, num(heal, 20)) });
  }
  function rpgBattleStart(name, hp, str, def) {
    if (rpg.recording) { rpg.sceneSteps.push({ type: 'battle', name: text(name, 'Inimigo'), hp: num(hp, 20), str: num(str, 5), def: num(def, 0) }); return; }
    if (!ensureShell()) return;
    if (rpg.battle) return;
    // Aliados: o herói (dos atributos) + a party. Inimigos: o nomeado + a fila.
    var allies = [heroBattler()];
    for (var i = 0; i < rpg.allies.length; i++) allies.push(defToBattler(rpg.allies[i], 'aliado'));
    var foes = [makeBattler(name, 'inimigo', hp, str, def, '', '#e05a5a')];
    var mv = rpg.movesByName[text(name, 'Inimigo')];
    if (mv) for (var m = 0; m < mv.length; m++) foes[0].moves.push(mv[m]);
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
    if (a.blind > 0) { a.blind -= 1; if (Math.random() < 0.33) dmg = 0; }
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
    if (Math.random() < 0.5) { rpg.menu = null; endBattle(false); return; }
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
    var victim = allies[Math.floor(Math.random() * allies.length)];
    var dmg = rollDamage(mv ? mv.dmg : f.str, victim.def);
    if (f.blind > 0) { f.blind -= 1; if (Math.random() < 0.33) dmg = 0; }
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
      var mv = (f.moves && f.moves.length) ? f.moves[Math.floor(Math.random() * f.moves.length)] : null;
      if (mv && mv.heal) foeHeal(f, mv);
      else foeHit(f, mv);
    }
    b.t = 0;
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
  }
  function endRound() {
    var b = rpg.battle; if (!b) return;
    tickSide(b.allies, true);
    tickSide(b.foes, false);
    for (var i = 0; i < b.allies.length; i++) b.allies[i].defending = false;
    if (aliveList(b.foes).length === 0) { winBattle(); return; }
    if (aliveList(b.allies).length === 0) { loseBattle(); return; }
    startAllyTurn(firstAlive(b.allies));
  }
  function tickSide(list, isAlly) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c.alive) continue;
      if (c.poison > 0) { c.hp -= 3; c.poison -= 1; floatText('-3', c.x + c.w / 2, c.y, '#a855f7', 18); }
      if (c.regen > 0) { c.hp = Math.min(c.max, c.hp + 3); c.regen -= 1; }
      if (isAlly) c.energy = Math.min(c.maxEnergy, c.energy + 2);
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
      ctx2d.font = (c.boss ? 'bold 17px' : '13px') + ' sans-serif'; ctx2d.textAlign = 'center';
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
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '15px sans-serif'; ctx2d.textAlign = 'left';
    ctx2d.fillText(b.message, 14, 22);
    ctx2d.restore();
  }
  // Painel de INFORMAÇÕES do selecionado: dano, vida/energia e os atributos.
  function drawBattleInfo(b) {
    var c = b.inspect || b.actor; if (!c) return;
    var lines = [];
    lines.push('Vida: ' + Math.max(0, c.hp) + ' / ' + c.max);
    if (c.side === 'aliado') lines.push('Energia: ' + c.energy + ' / ' + c.maxEnergy);
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
    ctx2d.fillStyle = '#ffd166'; ctx2d.font = 'bold 15px sans-serif';
    ctx2d.fillText(c.name + (c.side === 'inimigo' ? '  (inimigo)' : '  (do seu time)'), x + pad, y + 22);
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = '13px sans-serif';
    for (var j = 0; j < lines.length; j++) ctx2d.fillText(lines[j], x + pad, y + 44 + j * 20);
    ctx2d.restore();
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
        warn('"Preparar o jogo" depois de começar não muda a tela — deixe-o no comecinho');
        return;
      }
      config.fill = true;
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
    rpgCountItem: guard('rpgCountItem', rpgCountItem),
    rpgRemoveItem: guard('rpgRemoveItem', rpgRemoveItem),
    rpgDrawInventory: guard('rpgDrawInventory', rpgDrawInventory),
    rpgGoMap: guard('rpgGoMap', rpgGoMap),
    rpgOnMap: guard('rpgOnMap', rpgOnMap),
    rpgCreateDoor: guard('rpgCreateDoor', rpgCreateDoor),
    // ----- 🌍 Mundo aberto (tamanho do mapa + bordas ligadas) -----
    rpgMapSize: guard('rpgMapSize', rpgMapSize),
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
    rpgBattleReward: guard('rpgBattleReward', rpgBattleReward),
    rpgInflict: guard('rpgInflict', rpgInflict),
    // ----- ⚔️ batalha em EQUIPE: aliados, inimigos e golpes nomeados -----
    rpgAddAlly: guard('rpgAddAlly', rpgAddAlly),
    rpgAddFoe: guard('rpgAddFoe', rpgAddFoe),
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

  // Espelho SÓ-LEITURA da batalha em equipe para os testes dirigirem o painel de
  // ação sem enxergar o estado interno. NÃO-enumerável: fora do Object.keys(api),
  // então não conta como "método" nem vira bloco (invisível para o jogo da criança).
  try {
    Object.defineProperty(api, '_battle', {
      enumerable: false,
      value: function () {
        var b = rpg.battle;
        if (!b) return null;
        function snap(c) { return { name: c.name, side: c.side, hp: c.hp, max: c.max, energy: c.energy, alive: c.alive, poison: c.poison, regen: c.regen, str: c.str, def: c.def, moves: c.moves.length, boss: !!c.boss }; }
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
      }
    });
  } catch (e) {}

  window.SZGameKit = api;
})();
`
