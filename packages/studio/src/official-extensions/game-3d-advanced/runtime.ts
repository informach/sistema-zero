/**
 * Runtime do "Jogo 3D Avançado" — injetado no <head> do iframe quando a
 * extensão "game-3d-advanced" está instalada. É um SCRIPT MODULE (importa
 * `three` via importmap — ver `runtime.esmImports`), então roda DEFERIDO e em
 * ordem antes do código do aluno.
 *
 * Expõe `window.SZGameKit3D`: a base de um jogo 3D PROFISSIONAL (curso do
 * SimonDev) achatada num facade. O motor cuida do que nunca muda — renderer com
 * sombras e tone mapping, canvas com resolução interna fixa + letterbox,
 * telas de UI injetadas por JS, laço com delta-time clampado, entidades com
 * pool por molde, máquina de estados POR ENTIDADE (o coração didático do
 * curso: parado → mirar → atirar → recarregar), busca de vizinhos por grade
 * espacial (nunca O(n²)), mira suave por slerp, combate com i-frames e som.
 * O que muda é config (dimensões, cores, tecla de pausa) e a MECÂNICA é da
 * criança, nos ganchos.
 *
 * Regras deste arquivo (mesmas do gameKitRuntime/gameThreeDRuntime):
 * - A PRIMEIRA linha da string é exatamente `import * as THREE from 'three';`
 *   (os testes tiram essa linha e avaliam o resto com um stub de THREE).
 * - String pura de JS ES5-like, SEM backticks nem interpolação — texto
 *   dinâmico é concatenado com '+'.
 * - Zero `new THREE.*` e zero DOM no top-level: tudo lazy em ensureShell()/
 *   initWorld() (os testes avaliam com stub sem document e THREE vazio).
 * - Nunca quebrar o jogo do aluno: API pública embrulhada em try/catch com
 *   console.warn; avisos de gancho saem UMA vez (60×/s afogaria o console).
 * - Higiene de GPU: pixelRatio 1 (resolução interna fixa), teto de entidades,
 *   clone de molde compartilha geometria/material, dispose + forceContextLoss
 *   no fechamento (o navegador limita ~16 contextos WebGL).
 */
export const gameKit3DRuntime = `import * as THREE from 'three';
(function () {
  // ---- Config (do bloco "Preparar o jogo 3D") ----
  var config = {
    w: 1280,
    h: 720,
    world: 80,
    sky: '#0b1026',
    skyBottom: '',
    ground: '#14532d',
    accent: '#22d3ee',
    pauseKey: 'escape',
    shadows: true,
    // Efeitos de cinema (pós-processamento próprio, sem addons): ligados por
    // padrão — são a identidade do kit. setEffects desliga (modo turbo).
    bloom: true,
    bloomStrength: 1.2,
    vignette: true
  };

  // ---- Tetos (higiene de GPU/CPU) ----
  var MAX_ENTITIES = 200;   // cada entidade é um Group multi-peça com sombra
  var MAX_PARTS = 20;       // peças por molde
  var MAX_DECOR = 64;       // enfeites do cenário

  // ---- Estado interno ----
  var state = 'menu';
  var started = false;
  var shellReady = false;
  var worldReady = false;
  var keys = {};
  var justPressed = {};
  var pending = [];                      // promessas de carregamento (sons)
  var updateHooks = [];
  var enterStateHooks = Object.create(null); // estado do JOGO -> [fn]
  var listeners = Object.create(null);   // aviso -> [fn]  (event bus)
  var screens = Object.create(null);     // nome -> { el, title, text, mainBtn }
  var hudEls = Object.create(null);      // canto -> div
  var sounds = Object.create(null);      // nome -> HTMLAudioElement
  var molds = Object.create(null);       // nome -> { health, speed, template, radius }
  var pools = Object.create(null);       // nome -> { active:[], free:[], _sweeping } (contador de profundidade)
  var spawners = [];                     // { mold, interval, timer, where }
  var fsmHooks = Object.create(null);    // mold -> estado -> { enter:[], step:[], exit:[] }
  var stateTimers = [];                  // { mold, state, sec, next }
  var deathHooks = Object.create(null);  // mold -> [fn]
  var overlapHooks = Object.create(null); // mold da ZONA -> [fn(zona, quem)]
  var effects = Object.create(null);     // nome -> receita + Points + buffers (faíscas)
  var emitters = Object.create(null);    // efeito -> jorro contínuo vivo (ponto/entidade)
  var composer = null;                   // mini-composer próprio (bloom + vinheta + ACES)
  var composerFailed = false;            // WebGL/targets falharam -> render direto p/ sempre
  var spriteTex = null;                  // círculo suave compartilhado (CanvasTexture)
  var stageEl = null;
  var canvasEl = null;
  var styleEl = null;
  var hudLayer = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var groundMesh = null;
  var ambientLight = null;                // luz do ambiente (setAmbient muda a força)
  var sunLight = null;                    // sol direcional (initWorld)
  var extraLights = [];                   // luzes pontuais adicionadas (addLight)
  var decor = [];
  var currentDt = 0;
  var playTime = 0;
  var totalAlive = 0;                    // entidades vivas (todos os moldes)
  var entityLimitWarned = false;
  var _currentMold = null;               // contexto de montagem do defineMold
  // Câmera viva: um MODO por vez (órbita arrastável / seguir / topo).
  var camMode = { kind: 'orbit', target: null, dist: 25, height: 4, pivot: null };
  var orbit = null;
  var camSmooth = 3;   // suavidade do seguir (era literal); maior = mais colada
  var _shakeT = 0;     // segundos restantes de tremor
  var _shakeAmp = 0;   // força do tremor, em metros
  var _shakeMax = 1;   // duração pedida (para o tremor decair até zero)                      // { az, el, dist, dragging, px, py }
  // Vetores/quaternions temporários (alocados no initWorld — nunca no top-level).
  var _tv1 = null;
  var _tv2 = null;
  var _tq1 = null;
  // Base do WASD: frente/direita da CÂMERA achatadas no chão. Vetores PRÓPRIOS
  // (não reusam _tv1/_tv2) porque quem chama a base também chama moveForward e
  // companhia — aliasing aqui seria um bug invisível.
  var _camF = null;
  var _camR = null;

  // Grade espacial (plano XZ): a resposta do curso ao "getNearbyEntities O(n)".
  // Células esparsas por chave 'x,z'; cada entidade guarda a faixa de células
  // que ocupa e só re-insere quando os índices mudam.
  var GRID_DIM = 16;
  var gridCells = Object.create(null);
  // Dedup da consulta por CARIMBO (sem alloc + sem indexOf O(k²)); buffer de
  // resultado reusado (o chamador consome antes da próxima consulta). Scratch
  // de faixa evita alocar um array por entidade/quadro na sincronização.
  var gridStamp = 0;
  var gridResults = [];
  var _rangeScratch = [0, 0, 0, 0];
  var _rangeQScratch = [0, 0, 0, 0];

  var SOUNDS = (typeof window !== 'undefined' && window.__SZGAME_SOUNDS && typeof window.__SZGAME_SOUNDS === 'object')
    ? window.__SZGAME_SOUNDS
    : {};
  // Imagens do projeto (data:URL) para textura de peça — semeado pelo assetsBridge.
  var ASSETS = (typeof window !== 'undefined' && window.__SZGAME_ASSETS && typeof window.__SZGAME_ASSETS === 'object')
    ? window.__SZGAME_ASSETS
    : {};
  var _texCache = null;
  // Raycast (mira/clique no mundo) e câmera 1ª pessoa — tudo LAZY (o Raycaster
  // só nasce ao usar; ambientes de teste sem ele seguem sem quebrar).
  var _ray = null;                       // THREE.Raycaster (mira pelo mouse)
  var _mouse = null;                     // { x, y } em coords normalizadas (-1..1)
  var _pickWired = false;                // rastreio do ponteiro já ligado?
  var _fpsWired = false;                 // pointer-lock/olhar do FPS já ligado?

  function warn(msg) {
    try { console.warn('SZGameKit3D: ' + msg); } catch (e) {}
  }

  /**
   * Aviso UMA vez por chave. Coisa chamada a cada quadro (tocar animação, por
   * exemplo) com um nome errado entupiria o console a 60/s e esconderia o resto.
   */
  var _warned = {};
  function warnOnce(key, msg) {
    if (_warned[key]) return;
    _warned[key] = true;
    warn(msg);
  }

  /**
   * Acaso do motor. Sem semente = Math.random (cada partida diferente, o padrão).
   * COM semente = gerador próprio determinístico: a mesma semente dá exatamente a
   * mesma partida — enfeites no mesmo lugar, inimigos nascendo igual, faíscas
   * iguais. É o Mersenne semeado do curso (o ponto didático é a reprodutibilidade,
   * não o algoritmo — mulberry32 dá o mesmo em 5 linhas, e vendorizar o Mersenne
   * inteiro nesta string não se paga).
   * ⚠️ TODO acaso do motor passa por aqui — trocar por Math.random em qualquer
   * lugar fura o determinismo em silêncio.
   */
  var _rngState = 0;
  var _rngOn = false;
  function rand() {
    if (!_rngOn) return Math.random();
    _rngState |= 0;
    _rngState = (_rngState + 0x6d2b79f5) | 0;
    var t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function setSeed(n) {
    var s = num(n, 0);
    if (!s) { _rngOn = false; return; }
    _rngOn = true;
    _rngState = Math.floor(s) | 0;
  }

  function num(v, fallback) {
    if (v == null || v === '') return fallback;
    var n = Number(v);
    return (typeof n === 'number' && isFinite(n)) ? n : fallback;
  }

  function text(v, fallback) {
    if (v == null) return fallback;
    return String(v);
  }

  /** '#rgb'/'#rrggbb' -> {r,g,b} (0-255) ou null. */
  function hexToRgb(hex) {
    var h = String(hex == null ? '' : hex).replace('#', '');
    if (h.length === 3) {
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    }
    // Rejeita hex malformado ANTES do parseInt (senão '12xy56' vira parse parcial
    // 18 e devolveria uma cor errada em silêncio em vez de null). Sem regex (o
    // arquivo vive num template literal): checa os 6 dígitos na mão.
    if (h.length !== 6) return null;
    for (var ci = 0; ci < 6; ci++) {
      var cc = h.charCodeAt(ci);
      var okDigit = cc >= 48 && cc <= 57;
      var okLower = cc >= 97 && cc <= 102;
      var okUpper = cc >= 65 && cc <= 70;
      if (!okDigit && !okLower && !okUpper) return null;
    }
    var n = parseInt(h, 16);
    if (!isFinite(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    if (!c) return 'rgba(34, 211, 238, ' + alpha + ')';
    return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + alpha + ')';
  }

  /** Mistura a cor com branco (0..1) — usada no horizonte do céu. */
  function lighten(hex, amount) {
    var c = hexToRgb(hex);
    if (!c) return '#93c5fd';
    var r = Math.round(c.r + (255 - c.r) * amount);
    var g = Math.round(c.g + (255 - c.g) * amount);
    var b = Math.round(c.b + (255 - c.b) * amount);
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  }

  /** Normaliza nome de tecla p/ o mapa (lowercase; apelidos comuns em PT). */
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

  // ---- Telas + HUD (o index.html/styles.css do kit, injetados por JS) ----

  function buildCss() {
    var glowStrong = rgba(config.accent, 0.5);
    var glowSoft = rgba(config.accent, 0.3);
    return '' +
      '#szg3k-stage { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; ' +
        'background: #05060f; overflow: hidden; ' +
        "font-family: 'Courier New', monospace; color: #eee; }" +
      '#szg3k-frame { position: relative; }' +
      '#szg3k-canvas { display: block; border: 4px solid #1f2337; background: ' + config.sky + '; }' +
      '.szg3k-hud { position: absolute; padding: 10px 14px; font-size: 20px; font-weight: bold; ' +
        'color: #fff; text-shadow: 0 0 12px ' + glowStrong + ', 0 2px 2px rgba(0,0,0,0.8); ' +
        'pointer-events: none; z-index: 500; white-space: pre; }' +
      '.szg3k-hud-top-left { top: 0; left: 0; }' +
      '.szg3k-hud-top-center { top: 0; left: 50%; transform: translateX(-50%); }' +
      '.szg3k-hud-top-right { top: 0; right: 0; text-align: right; }' +
      '.szg3k-hud-bottom-left { bottom: 0; left: 0; }' +
      '.szg3k-hud-bottom-right { bottom: 0; right: 0; text-align: right; }' +
      // Balão de fala: ancorado no MUNDO (o say projeta a posição da entidade a
      // cada quadro). translate(-50%,-100%) põe a ponta do balão na cabeça dela.
      '.szg3k-say { position: absolute; max-width: 40%; padding: 8px 12px; border-radius: 14px; ' +
      'background: rgba(255,255,255,0.95); color: #0f172a; font-size: 16px; font-weight: 600; ' +
      'line-height: 1.3; pointer-events: none; transform: translate(-50%, -100%); ' +
      'box-shadow: 0 4px 14px rgba(0,0,0,0.35); white-space: pre-wrap; }' +
      '.szg3k-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); ' +
        'background: rgba(2, 4, 12, 0.55); backdrop-filter: blur(10px); ' +
        'border: 3px solid ' + config.accent + '; padding: 30px; border-radius: 15px; text-align: center; ' +
        'box-shadow: 0 0 30px ' + glowSoft + '; z-index: 1000; display: none; max-width: 82%; }' +
      '.szg3k-panel.szg3k-active { display: block; }' +
      '.szg3k-panel h1, .szg3k-panel h2 { color: ' + config.accent + '; margin: 0 0 20px 0; ' +
        'text-shadow: 0 0 20px ' + glowStrong + '; }' +
      '.szg3k-panel h1 { font-size: 40px; }' +
      '.szg3k-panel h2 { font-size: 35px; }' +
      '.szg3k-panel p { margin: 0 0 12px 0; font-size: 14px; min-height: 1em; }' +
      '.szg3k-panel button { background: rgba(0, 0, 0, 0.4); color: white; ' +
        'border: 2px solid ' + config.accent + '; padding: 12px 24px; margin: 8px; font-size: 16px; ' +
        'cursor: pointer; font-family: inherit; border-radius: 8px; transition: all 0.3s; ' +
        'box-shadow: 0 0 15px ' + rgba(config.accent, 0.2) + '; }' +
      '.szg3k-panel button:hover { background: ' + config.accent + '; ' +
        'box-shadow: 0 0 25px ' + glowStrong + '; transform: translateY(-2px); }';
  }

  function makeScreen(name, titleTag, titleText, bodyText) {
    var el = document.createElement('div');
    el.className = 'szg3k-panel';
    el.setAttribute('data-szg3k-screen', name);
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
   * Monta a casca do jogo (palco + moldura + canvas + telas prontas) — LAZY.
   * O canvas fica dentro de uma MOLDURA relative: o HUD e os painéis são
   * posicionados sobre a área do jogo (não sobre a janela inteira).
   */
  function ensureShell() {
    if (shellReady) return true;
    try {
      if (typeof document === 'undefined' || !document || !document.body) return false;

      styleEl = document.createElement('style');
      styleEl.id = 'szg3k-style';
      styleEl.textContent = buildCss();
      document.head.appendChild(styleEl);

      stageEl = document.createElement('div');
      stageEl.id = 'szg3k-stage';
      var frame = document.createElement('div');
      frame.id = 'szg3k-frame';
      canvasEl = document.createElement('canvas');
      canvasEl.id = 'szg3k-canvas';
      canvasEl.width = config.w;
      canvasEl.height = config.h;
      frame.appendChild(canvasEl);
      hudLayer = frame;
      stageEl.appendChild(frame);
      document.body.appendChild(stageEl);

      var menu = makeScreen('menu', 'h1', 'Meu Jogo 3D', 'WASD ou setas para andar');
      makeButton(menu, 'Jogar', function () { api.setState('jogando'); });
      var pausa = makeScreen('pausa', 'h2', 'Pausa', '');
      makeButton(pausa, 'Continuar', function () { api.setState('jogando'); });
      makeButton(pausa, 'Sair para o menu', function () { api.returnToMenu(); });
      makeScreen('carregando', 'h2', 'Carregando...', 'Montando o mundo...');
      var fim = makeScreen('fim', 'h2', 'Fim de jogo', '');
      makeButton(fim, 'Jogar de novo', function () { api.setState('jogando'); });
      makeButton(fim, 'Sair para o menu', function () { api.returnToMenu(); });
      var vitoria = makeScreen('vitoria', 'h2', 'Vitória!', 'Você venceu!');
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
      if (s && s.el) s.el.classList.remove('szg3k-active');
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
    entry.el.classList.add('szg3k-active');
  }

  function applyStateScreens(name) {
    if (!shellReady) return;
    if (name === 'menu') showScreen('menu');
    else if (name === 'pausado') showScreen('pausa');
    else if (name === 'fim') showScreen('fim');
    else if (name === 'vitoria') showScreen('vitoria');
    else if (name === 'carregando') showScreen('carregando');
    else hideScreens();
  }

  /** HUD por canto (DOM sobre o canvas): texto vazio APAGA o canto. */
  var HUD_SLOTS = { 'top-left': 1, 'top-center': 1, 'top-right': 1, 'bottom-left': 1, 'bottom-right': 1 };
  function setHud(slot, value) {
    if (!ensureShell()) return;
    var key = text(slot, 'top-left');
    if (!HUD_SLOTS[key]) key = 'top-left';
    var content = text(value, '');
    var el = hudEls[key];
    if (!content) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      delete hudEls[key];
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.className = 'szg3k-hud szg3k-hud-' + key;
      hudLayer.appendChild(el);
      hudEls[key] = el;
    }
    el.textContent = content;
  }

  // ---- Máquina de estados do JOGO (menu/jogando/pausado/fim/vitoria + custom) ----

  function setState(name) {
    var n = text(name, '');
    if (!n) return;
    var prev = state;
    state = n;
    applyStateScreens(n);
    // Entrou em 'jogando' vindo de fora do jogo: RECOMEÇA a arena (recolhe
    // todas as entidades, zera fábricas/tempo) ANTES dos ganchos da criança —
    // assim "Jogar de novo" funciona. Despausar NÃO reseta.
    if (n === 'jogando' && prev !== 'jogando' && prev !== 'pausado') {
      playTime = 0;
      entityLimitWarned = false;
      for (var pk in pools) releaseAll(pools[pk]);
      for (var si = 0; si < spawners.length; si++) spawners[si].timer = 0;
      resetParticles();
      // Recomeço limpa o que sobrou da partida anterior: balão de fala pendurado
      // e cronômetro correndo atravessariam para o jogo novo.
      clearSays();
      _timer.on = false;
      _timer.left = 0;
    }
    var hooks = enterStateHooks[n];
    if (hooks) {
      for (var i = 0; i < hooks.length; i++) {
        try { hooks[i](); } catch (e) { warn('erro no "quando o jogo entrar no estado ' + n + '": ' + e); }
      }
    }
  }

  // ---- Entrada (mapa de teclas com limpeza em blur/contextmenu) ----

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
    });
    window.addEventListener('keyup', function (e) {
      keys[String(e.key).toLowerCase()] = false;
    });
    window.addEventListener('contextmenu', function () { keys = {}; });
    window.addEventListener('blur', function () { keys = {}; });
  }

  // ---- Canvas responsivo (resolução interna fixa + letterbox por CSS) ----

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
    canvasEl.style.width = w + 'px';
    canvasEl.style.height = h + 'px';
  }

  // ---- Mundo three (renderer/cena/câmera/luz/céu/chão) — só no start ----

  function initWorld() {
    if (worldReady) return true;
    try {
      _tv1 = new THREE.Vector3();
      _tv2 = new THREE.Vector3();
      _tq1 = new THREE.Quaternion();
      _camF = new THREE.Vector3(0, 0, -1);
      _camR = new THREE.Vector3(1, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasEl });
      // Resolução interna FIXA (as contas do aluno nunca mudam com a janela).
      renderer.setPixelRatio(1);
      renderer.setSize(config.w, config.h, false);
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = config.shadows !== false;
        if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;

      scene = new THREE.Scene();
      applySky();

      camera = new THREE.PerspectiveCamera(60, config.w / config.h, 0.1, Math.max(1000, config.world * 6));

      ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
      scene.add(ambientLight);
      var sun = new THREE.DirectionalLight(0xffffff, 1.0);
      sunLight = sun;
      sun.position.set(config.world * 0.35, config.world * 0.55, config.world * 0.25);
      sun.castShadow = true;
      if (sun.shadow && sun.shadow.camera) {
        var half = config.world * 0.6;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = config.world * 2;
        sun.shadow.camera.left = -half;
        sun.shadow.camera.right = half;
        sun.shadow.camera.top = half;
        sun.shadow.camera.bottom = -half;
        if (sun.shadow.mapSize && sun.shadow.mapSize.set) sun.shadow.mapSize.set(1024, 1024);
      }
      scene.add(sun);

      var groundGeo = new THREE.PlaneGeometry(config.world, config.world);
      var groundMat = new THREE.MeshStandardMaterial({ color: config.ground });
      groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.receiveShadow = true;
      scene.add(groundMesh);

      // Câmera default: órbita arrastável em volta do centro do mundo.
      if (camMode.kind === 'orbit') setOrbit(camMode.dist);
      updateCamera(0);

      worldReady = true;
      return true;
    } catch (e) {
      warn('não consegui montar o mundo 3D: ' + e);
      return false;
    }
  }

  /** Céu = degradê da cor escolhida para um horizonte mais claro (canvas 2D). */
  function applySky() {
    if (!scene) return;
    try {
      var cv = document.createElement('canvas');
      cv.width = 2;
      cv.height = 256;
      var g = cv.getContext('2d');
      if (!g) {
        scene.background = new THREE.Color(config.sky);
        return;
      }
      var grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, config.sky);
      // Horizonte: cor explícita (setSky com 2 cores) ou um tom mais claro do topo.
      grad.addColorStop(1, config.skyBottom ? config.skyBottom : lighten(config.sky, 0.55));
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 256);
      var old = scene.background;
      if (old && old.isTexture && old.dispose) { try { old.dispose(); } catch (e) {} }
      scene.background = new THREE.CanvasTexture(cv);
    } catch (e) {
      try { scene.background = new THREE.Color(config.sky); } catch (e2) {}
    }
  }

  // ---- 💡 Luz & céu (atmosfera) — mexer depois do start ----

  function addLight(color, x, y, z, intensity) {
    if (!worldReady && !initWorldLater('Pôr uma luz')) return;
    if (!THREE.PointLight) return;
    var p = new THREE.PointLight(text(color, '#ffffff'), Math.max(0, num(intensity, 1)), 0);
    p.position.set(num(x, 0), num(y, 5), num(z, 0));
    scene.add(p);
    extraLights.push(p);
  }
  function setFog(color, near, far) {
    if (!worldReady && !initWorldLater('Névoa')) return;
    if (!THREE.Fog) return;
    scene.fog = new THREE.Fog(text(color, '#9ca3af'), num(near, 8), num(far, config.world));
  }
  function setSkyRuntime(top, bottom) {
    config.sky = text(top, config.sky);
    if (bottom != null) config.skyBottom = text(bottom, '');
    if (worldReady) applySky();
  }
  function setAmbient(intensity) {
    if (ambientLight) ambientLight.intensity = Math.max(0, num(intensity, 0.55));
  }

  /** Enfeites procedurais (pedras cinzas + cristais na cor de destaque). */
  function scatterDecor(count) {
    if (!worldReady && !initWorldLater('Espalhar enfeites')) return;
    var n = Math.max(0, Math.min(MAX_DECOR, Math.floor(num(count, 16))));
    for (var d = 0; d < decor.length; d++) {
      var old = decor[d];
      if (old.parent) old.parent.remove(old);
      // A geometria é COMPARTILHADA (UNIT_GEOS) — não dispor aqui; só o material.
      if (old.material && old.material.dispose) { try { old.material.dispose(); } catch (e) {} }
    }
    decor.length = 0;
    var radius = config.world * 0.45;
    // Geometrias-unidade COMPARTILHADAS pelos enfeites (antes cada um alocava a
    // sua — até 64 geometrias à toa). São liberadas no disposeAll (UNIT_GEOS).
    var rockGeo = unitGeo('rock');
    var crystalGeo = unitGeo('crystal');
    for (var i = 0; i < n; i++) {
      var isRock = i % 2 === 0;
      var geo = isRock ? rockGeo : crystalGeo;
      var mat;
      if (isRock) {
        var shade = 90 + Math.floor(rand() * 60);
        mat = new THREE.MeshStandardMaterial({ color: 'rgb(' + shade + ', ' + shade + ', ' + (shade + 8) + ')' });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: config.accent });
        if (mat.emissive && mat.emissive.set) {
          mat.emissive.set(config.accent);
          mat.emissiveIntensity = 0.25;
        }
      }
      var mesh = new THREE.Mesh(geo, mat);
      var ang = rand() * Math.PI * 2;
      var dist = Math.sqrt(rand()) * radius;
      var s = isRock ? (0.5 + rand() * 1.3) : (0.4 + rand() * 0.8);
      mesh.scale.set(s, isRock ? s * 0.7 : s * 1.6, s);
      mesh.position.set(Math.cos(ang) * dist, (isRock ? s * 0.35 : s * 0.8), Math.sin(ang) * dist);
      mesh.rotation.y = rand() * Math.PI * 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      decor.push(mesh);
    }
  }

  /** Blocos de mundo usados antes do start: avisa (o mundo nasce no start). */
  function initWorldLater(label) {
    warn('"' + label + '" só funciona depois de "Começar o jogo" — deixe-o num gancho (ex.: quando entrar no estado jogando)');
    return false;
  }

  // ---- Grade espacial (plano XZ, células esparsas) ----

  function gridIndex(v) {
    var half = config.world / 2;
    var t = (v + half) / (config.world || 1);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var i = Math.floor(t * GRID_DIM);
    return i >= GRID_DIM ? GRID_DIM - 1 : i;
  }

  function gridRangeInto(out, x, z, half) {
    out[0] = gridIndex(x - half);
    out[1] = gridIndex(z - half);
    out[2] = gridIndex(x + half);
    out[3] = gridIndex(z + half);
    return out;
  }

  function gridInsert(e, range) {
    for (var gx = range[0]; gx <= range[2]; gx++) {
      for (var gz = range[1]; gz <= range[3]; gz++) {
        var k = gx + ',' + gz;
        (gridCells[k] || (gridCells[k] = [])).push(e);
      }
    }
    e._gi = range;
  }

  function gridRemove(e) {
    var r = e._gi;
    if (!r) return;
    for (var gx = r[0]; gx <= r[2]; gx++) {
      for (var gz = r[1]; gz <= r[3]; gz++) {
        var cell = gridCells[gx + ',' + gz];
        if (!cell) continue;
        var idx = cell.indexOf(e);
        if (idx !== -1) cell.splice(idx, 1);
      }
    }
    e._gi = null;
  }

  /** Recalcula a faixa de células; só re-insere (e ALOCA) se os índices mudaram. */
  function gridSync(e) {
    var m = molds[e._mold];
    var half = m ? Math.max(0.5, m.radius) : 0.5;
    var p = e.mesh.position;
    var r = gridRangeInto(_rangeScratch, p.x, p.z, half);
    var old = e._gi;
    if (old && old[0] === r[0] && old[1] === r[1] && old[2] === r[2] && old[3] === r[3]) return;
    gridRemove(e);
    // Copia o scratch num array estável guardado na entidade (só quando muda).
    gridInsert(e, [r[0], r[1], r[2], r[3]]);
  }

  /**
   * Vizinhos brutos num raio (broad-phase) — o chamador refina por distância.
   * Dedup por carimbo (_stamp); devolve o BUFFER reusado gridResults (o
   * chamador consome antes da próxima consulta; nested = snapshot em array local).
   */
  function gridQuery(x, z, radius) {
    gridStamp++;
    gridResults.length = 0;
    var r = gridRangeInto(_rangeQScratch, x, z, radius);
    for (var gx = r[0]; gx <= r[2]; gx++) {
      for (var gz = r[1]; gz <= r[3]; gz++) {
        var cell = gridCells[gx + ',' + gz];
        if (!cell) continue;
        for (var i = 0; i < cell.length; i++) {
          var c = cell[i];
          if (c._stamp !== gridStamp) {
            c._stamp = gridStamp;
            gridResults.push(c);
          }
        }
      }
    }
    return gridResults;
  }

  // ---- Moldes (aparência por composição de peças) + pool + spawner ----

  /**
   * Cunha unitária (rampa) — 6 vértices, 8 triângulos. Caixa de -0.5..0.5 em X e
   * Z; em Y vai de 0 (base) até a reta que sobe de z=-0.5 (altura 0) a z=+0.5
   * (altura 1). Feita na mão porque o three não tem primitiva de cunha (e addons
   * de geometria não valem o download). computeVertexNormals dá a sombra certa.
   */
  function wedgeGeo() {
    var g = new THREE.BufferGeometry();
    // 0..3 = base (y=0); 4..5 = aresta alta (y=1, z=+0.5)
    var v = [
      -0.5, 0, -0.5,   0.5, 0, -0.5,   0.5, 0, 0.5,   -0.5, 0, 0.5,
      -0.5, 1, 0.5,    0.5, 1, 0.5
    ];
    var idx = [
      0, 2, 1,  0, 3, 2,          // base
      3, 4, 2,  2, 4, 5,          // topo (a rampa em si)
      0, 1, 5,  0, 5, 4,          // ré (parede alta, z=+0.5)...
      1, 2, 5,                    // lateral direita
      0, 4, 3                     // lateral esquerda
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  var UNIT_GEOS = null;
  function unitGeo(shape) {
    if (!UNIT_GEOS) UNIT_GEOS = {};
    if (UNIT_GEOS[shape]) return UNIT_GEOS[shape];
    var g;
    if (shape === 'sphere') g = new THREE.SphereGeometry(0.5, 20, 14);
    else if (shape === 'cylinder') g = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
    else if (shape === 'cone') g = new THREE.ConeGeometry(0.5, 1, 20);
    // Plano deitado no chão (para pisos/paredes); rosca (donut) e pirâmide.
    else if (shape === 'plane') g = new THREE.PlaneGeometry(1, 1);
    else if (shape === 'torus') g = new THREE.TorusGeometry(0.35, 0.15, 12, 24);
    else if (shape === 'pyramid') g = new THREE.ConeGeometry(0.5, 1, 4);
    // Rampa: cunha unitária feita na mão (o three não tem). Sobe ao longo de +Z:
    // em z=-0.5 a altura é 0 (pé) e em z=+0.5 é 1 (topo). O COLISOR de rampa usa
    // exatamente essa reta (ver rampHeight) — malha e colisão casam por construção.
    else if (shape === 'rampa') g = wedgeGeo();
    // Enfeites do cenário (facetados) — compartilhados pelo scatterDecor.
    else if (shape === 'rock') g = new THREE.IcosahedronGeometry(0.5, 0);
    else if (shape === 'crystal') g = new THREE.OctahedronGeometry(0.5, 0);
    else g = new THREE.BoxGeometry(1, 1, 1);
    UNIT_GEOS[shape] = g;
    return g;
  }

  // ---- 🧊 Modelos 3D de verdade (GLB) e céu de foto (HDR) ----
  //
  // Os binários chegam como data: URL no __SZGAME_ASSETS_3D. A rede é MORTA no
  // preview (o permissionGuard mata o fetch e a CSP tem connect-src 'none'), então
  // loader.load(url) NUNCA funciona — decodificamos o base64 na mão e chamamos
  // loader.parse(arrayBuffer), que não faz I/O. Mesmo princípio da textura, que já
  // funciona hoje porque o ImageLoader usa <img> (subrecurso passivo).
  var MODELS3D = (typeof window !== 'undefined' && window.__SZGAME_ASSETS_3D && typeof window.__SZGAME_ASSETS_3D === 'object')
    ? window.__SZGAME_ASSETS_3D
    : {};
  var _gltfMod = null;       // módulo do GLTFLoader (import dinâmico)
  var _rgbeMod = null;
  var _skelMod = null;       // SkeletonUtils: clone que REAMARRA o esqueleto
  var _modelCache = null;    // nome -> { scene, clips } já parseado (clonado a cada uso)
  var _modelPending = null;  // nome -> FILA de callbacks (import/parse em voo)

  /** data: URL base64 -> ArrayBuffer, sem tocar na rede. */
  function dataUrlToBuffer(url) {
    var comma = url.indexOf(',');
    if (comma < 0) return null;
    try {
      var bin = atob(url.slice(comma + 1));
      var len = bin.length;
      var u8 = new Uint8Array(len);
      for (var i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
      return u8.buffer;
    } catch (e) {
      return null;
    }
  }

  /**
   * Carrega o modelo do projeto e guarda no cache. Assíncrono por causa do
   * import() do addon; enquanto não chega, o molde usa a peça de reserva (a
   * criança vê um cubo e o modelo aparece quando fica pronto — nunca uma cena
   * quebrada). Chamado do part(), que roda no defineMold (antes do start).
   */
  /**
   * Clona um modelo importado. ⭐ O clone comum do Object3D NÃO reamarra o esqueleto aos
   * ossos do clone — o boneco clonado fica preso ao esqueleto do original e a
   * animação sai deformada. É por isso que o próprio curso trocou o clone comum
   * pelo SkeletonUtils.clone (cached-asset-streamer.js:135-136). Sem o addon
   * carregado, cai no clone comum: peça estática continua certa, e só o boneco
   * animado é que perderia — por isso o aviso vive no caminho da animação.
   */
  function cloneModel(root) {
    if (_skelMod && _skelMod.clone) {
      try { return _skelMod.clone(root); } catch (e) {}
    }
    return root.clone();
  }

  // ---- 🕺 Animação do modelo (a lição do AnimatedObjectComponent do curso) ----

  /**
   * Monta o mixer DA ENTIDADE. ⚠️ Aqui é o spawn, não o part: as peças são do
   * MOLDE (uma vez), mas a animação é de cada boneco (cada um no seu tempo). Foi
   * exatamente confundir esses dois tempos que gerou o bug do cubo.
   */
  function attachMixer(e, m) {
    if (!m.model || !THREE.AnimationMixer) return;
    var hit = _modelCache && _modelCache[m.model];
    if (!hit || !hit.clips || !hit.clips.length) return;
    try {
      e._mixer = new THREE.AnimationMixer(e.mesh);
      e._clips = hit.clips;
      e._action = null;
    } catch (err) {
      e._mixer = null;
    }
  }

  /** Acha o clipe pelo nome (o .glb de cada site nomeia do seu jeito). */
  function clipByName(e, name) {
    if (!e._clips) return null;
    var k = text(name, '');
    for (var i = 0; i < e._clips.length; i++) {
      if (e._clips[i] && e._clips[i].name === k) return e._clips[i];
    }
    return null;
  }

  /**
   * Toca um clipe com uma passagem CURTA de um para o outro. O curso só faz
   * .play() (e quebra num .glb sem "Idle"); o crossfade é o mínimo para o boneco
   * não picotar ao trocar de estado, e o aviso gentil é o mínimo para um nome
   * errado não derrubar o jogo.
   */
  function playAnim(e, name, loop) {
    if (!isEntity(e) || !e._mixer) return;
    var clip = clipByName(e, name);
    if (!clip) {
      warnOnce('anim:' + e._mold + ':' + text(name, ''),
        'o modelo do molde "' + e._mold + '" não tem a animação "' + text(name, '') + '"');
      return;
    }
    try {
      var next = e._mixer.clipAction(clip);
      if (e._action === next) return; // já é essa: não reinicia (idempotente como a FSM)
      var once = loop === false;
      next.reset();
      // Constantes do THREE, não os números (2200/2201) — número cravado é o tipo
      // de coisa que some sem avisar quando a lib mexe na tabela.
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      next.fadeIn(0.2);
      next.play();
      if (e._action) e._action.fadeOut(0.2);
      e._action = next;
    } catch (err) {}
  }

  function stopAnim(e) {
    if (!isEntity(e) || !e._mixer) return;
    try { e._mixer.stopAllAction(); } catch (err) {}
    e._action = null;
  }

  /**
   * Aquece o modelo — a lição do cached-asset-streamer do curso (compileAsync +
   * initTexture). Sem isto, o PRIMEIRO inimigo que nasce compila o shader e sobe a
   * textura NO MEIO do quadro, e o jogo engasga bem na hora da ação. Best-effort:
   * o compileAsync não existe em toda versão, e aquecer é otimização — nunca pode
   * derrubar o carregamento.
   */
  function warmModel(root) {
    if (!root || !renderer || !scene || !camera) return;
    try {
      // Compila CONTRA a cena real: a permutação do shader depende de luz/névoa/
      // sombra, então aquecer noutra cena aqueceria o programa errado.
      if (renderer.compileAsync) renderer.compileAsync(root, camera, scene);
      else if (renderer.compile) renderer.compile(scene, camera);
    } catch (e) {}
    try {
      root.traverse(function (o) {
        if (!o.isMesh || !o.material || !renderer.initTexture) return;
        for (var key in o.material) {
          var t = o.material[key];
          if (t && t.isTexture) { try { renderer.initTexture(t); } catch (e) {} }
        }
      });
    } catch (e) {}
  }

  function loadModel(name, onReady) {
    var k = text(name, '');
    if (!k) return null;
    if (!_modelCache) _modelCache = {};
    if (_modelCache[k]) return _modelCache[k];
    if (!_modelPending) _modelPending = {};
    // Carga JÁ em voo: entra na FILA. Antes devolvia null e DESCARTAVA o onReady —
    // dois moldes com o MESMO .glb e o segundo ficava com o cubo para sempre.
    if (_modelPending[k]) {
      if (typeof onReady === 'function') _modelPending[k].push(onReady);
      return null;
    }
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'model3d') {
      warn('o modelo "' + k + '" não está no projeto — a peça fica com a forma de reserva');
      return null;
    }
    var buf = dataUrlToBuffer(entry.dataUrl);
    if (!buf) return null;
    _modelPending[k] = typeof onReady === 'function' ? [onReady] : [];
    // ⭐ O start() ESPERA esta promessa (o MESMO array dos sons, com a tela de
    // "carregando" que já existe). É o que garante que o template está remendado
    // ANTES do primeiro spawn — senão toda entidade nascida durante o parse ficava
    // com o cubo para sempre, porque o spawn CLONA o template. Nunca REJEITA: um
    // modelo quebrado não pode travar a criança na tela de carregando.
    var release = null;
    pending.push(new Promise(function (resolve) { release = resolve; }));
    var flush = function (hit) {
      var queue = _modelPending[k] || [];
      _modelPending[k] = null;
      if (hit) {
        for (var i = 0; i < queue.length; i++) {
          try { queue[i](hit); } catch (e) {}
        }
      }
      if (release) release();
    };
    var finish = function (mod) {
      _gltfMod = mod;
      try {
        new mod.GLTFLoader().parse(buf, '', function (gltf) {
          if (gltf && gltf.scene) {
            // Guarda os CLIPES junto: são eles que dão vida ao boneco (a lição do
            // AnimatedObjectComponent do curso). Antes o gltf.animations ia no lixo.
            _modelCache[k] = { scene: gltf.scene, clips: gltf.animations || [] };
            warmModel(gltf.scene);
            flush(_modelCache[k]);
          } else {
            warn('o modelo "' + k + '" veio vazio — a peça fica com a forma de reserva');
            flush(null);
          }
        }, function (err) {
          warn('não consegui abrir o modelo "' + k + '": ' + err);
          flush(null);
        });
      } catch (e) {
        warn('não consegui abrir o modelo "' + k + '": ' + e);
        flush(null);
      }
    };
    if (_gltfMod) { finish(_gltfMod); return null; }
    try {
      // Os DOIS addons antes de parsear. O SkeletonUtils é opcional (catch -> null):
      // sem ele o clone não reamarra o esqueleto e só a ANIMAÇÃO se perde — a peça
      // estática continua certa. Esperar os dois evita a corrida de clonar o
      // template antes de o SkeletonUtils chegar.
      Promise.all([
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/utils/SkeletonUtils.js').catch(function () { return null; })
      ]).then(function (mods) {
        if (mods[1] && mods[1].clone) _skelMod = mods[1];
        finish(mods[0]);
      }, function (e) {
        warn('não consegui carregar o leitor de modelos: ' + e);
        flush(null);
      });
    } catch (e) {
      warn('não consegui carregar o leitor de modelos: ' + e);
      flush(null);
    }
    return null;
  }

  /** Céu de FOTO (HDR equirretangular) — vira o background da cena. */
  function setSkyPhoto(name) {
    var k = text(name, '');
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'environment3d') {
      warn('o céu "' + k + '" não está no projeto (envie um arquivo .hdr)');
      return;
    }
    var buf = dataUrlToBuffer(entry.dataUrl);
    if (!buf) return;
    var apply = function (mod) {
      _rgbeMod = mod;
      try {
        var tex = new mod.RGBELoader().parse(buf);
        if (!tex) return;
        // O parse devolve os dados crus: vira DataTexture equirretangular.
        var dt = tex.isTexture ? tex : new THREE.DataTexture(tex.data, tex.width, tex.height);
        if (THREE.EquirectangularReflectionMapping != null) {
          dt.mapping = THREE.EquirectangularReflectionMapping;
        }
        dt.needsUpdate = true;
        if (scene) { scene.background = dt; scene.environment = dt; }
      } catch (e) {
        warn('não consegui abrir o céu "' + k + '": ' + e);
      }
    };
    if (_rgbeMod) { apply(_rgbeMod); return; }
    try {
      import('three/addons/loaders/RGBELoader.js').then(apply, function (e) {
        warn('não consegui carregar o leitor de céu: ' + e);
      });
    } catch (e) {
      warn('não consegui carregar o leitor de céu: ' + e);
    }
  }

  /** Textura de imagem do projeto (data:URL) → cache global + pixel-nítida. */
  function moldTexture(asset) {
    var a = text(asset, '');
    if (!a || !THREE.TextureLoader) return null;
    var url = ASSETS[a] || (a.indexOf('data:') === 0 ? a : null);
    if (!url) return null;
    if (!_texCache) _texCache = {};
    if (_texCache[url]) return _texCache[url];
    var tex = new THREE.TextureLoader().load(url);
    if (THREE.NearestFilter) {
      tex.magFilter = THREE.NearestFilter;
      tex.needsUpdate = true;
    }
    _texCache[url] = tex;
    return tex;
  }

  function defineMold(name, opts, buildFn) {
    var k = text(name, '');
    if (!k) { warn('"Criar o molde 3D" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    var group;
    try {
      group = new THREE.Group();
    } catch (e) {
      warn('não consegui criar o molde "' + k + '": ' + e);
      return;
    }
    var mold = {
      health: Math.max(1, num(o.health, 30)),
      speed: num(o.speed, 3),
      template: group,
      parts: 0,
      radius: 0.5,
      // Caixa LOCAL do colisor (origem = pés, y=0). min/max em vez de meia-largura
      // simétrica: peça fora do centro não infla mais a caixa (uma peça em x=5 com
      // w=1 vira 4.5..5.5, e não ±5.5 para cada lado) e peça ABAIXO de y=0 entra
      // na caixa (antes o fundo era grampeado em 0 e a peça ficava sem colisão).
      col: {
        kind: 0,                          // 0 caixa · 1 bola · 2 cápsula · 3 rampa
        minX: 0, maxX: 0,
        minY: 0, maxY: 0,
        minZ: 0, maxZ: 0,
        r: 0.5,                           // bola/cápsula: raio
        rampAxis: 2, rampY0: 0, rampY1: 0 // rampa: sobe ao longo de Z (2) ou X (0)
      },
      // DERIVADOS da caixa (finishMoldBox) — mantidos porque a grade e o resto do
      // motor já os lêem. hw/hd = meia-extensão; top = altura.
      hw: 0, hd: 0, top: 0,
      solid: false,
      trigger: false,
      // Quique: 0 = não quica. Vale como COISA QUE CAI e como SUPERFÍCIE — o maior
      // dos dois manda (ver contact).
      bounce: 0,
      // Atrito: -1 = "não definido". Precisa do sentinela porque o mesmo campo
      // serve a dois papéis com defaults OPOSTOS: como SUPERFÍCIE, não-definido
      // vale 0 (gelo — sempre foi assim); como COISA QUE ANDA, vale 1 (sem
      // opinião, quem manda é o chão). Fora isso, o mais escorregadio vence.
      friction: -1,
      // Gravidade-padrão do molde (só quem chama "ter física de" define): o spawn
      // aplica por entidade. 0 = o molde não opina, a criança usa "cair com".
      gravity: 0,
      // Nome do .glb de que este molde é feito ('' = só peças). O spawn usa para
      // montar o mixer da entidade; o "no estado X, tocar Y" usa para achar os
      // clipes.
      model: '',
      stateAnims: null
    };
    molds[k] = mold;
    if (!pools[k]) pools[k] = { active: [], free: [], _sweeping: 0 };
    // O corpo de blocos roda AGORA, com o molde corrente implícito (as peças
    // se montam nele) — mesmo padrão do defineShape/defineLook do 2D.
    if (typeof buildFn === 'function') {
      _currentMold = mold;
      try { buildFn(); } catch (e) { warn('erro ao montar as peças do molde "' + k + '": ' + e); }
      _currentMold = null;
    }
    if (mold.parts === 0) {
      // Molde sem peça nenhuma: um cubinho da cor de destaque (nunca invisível).
      _currentMold = mold;
      part({ shape: 'box', color: config.accent, w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 });
      _currentMold = null;
    }
  }

  /**
   * Meia-extensão da geometria UNITÁRIA de cada forma, em coords LOCAIS da peça
   * (antes do scale). Só o plano é girado no part() (deita em XZ), então leva um
   * flag: o giro de -90 em X mapeia (x,y,z) -> (x, z, -y), ou seja o 'h' vira
   * PROFUNDIDADE e o 'd' não participa. Era exatamente o que a conta antiga
   * errava (usava eixo e parâmetro trocados).
   */
  var UNIT_HALF = {
    box:      { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    sphere:   { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    cylinder: { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    cone:     { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    pyramid:  { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    rampa:    { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    torus:    { x: 0.5, y: 0.5, z: 0.15, rot: 0 },  // raio 0.35 + tubo 0.15
    plane:    { x: 0.5, y: 0.5, z: 0,    rot: 1 },
    modelo:   { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    rock:     { x: 0.5, y: 0.5, z: 0.5,  rot: 0 },
    crystal:  { x: 0.5, y: 0.5, z: 0.5,  rot: 0 }
  };
  /**
   * Espessura MÍNIMA de qualquer eixo do colisor. É load-bearing: sem ela, o
   * plano (que tem espessura ZERO de verdade) vira um colisor sem volume e a
   * criança atravessa o próprio piso — a correção honesta da caixa CRIARIA essa
   * regressão. 10 cm é fino de ver e grosso de colidir.
   */
  var MIN_THICK = 0.1;
  var _ext = { x: 0, y: 0, z: 0 };

  function partExtents(shape, w, h, d, out) {
    var u = UNIT_HALF[shape] || UNIT_HALF.box;
    if (u.rot) {
      out.x = u.x * w;
      out.y = u.z * d;   // espessura da folha (≈0) vira o eixo vertical
      out.z = u.y * h;   // a altura da folha vira PROFUNDIDADE
    } else {
      out.x = u.x * w;
      out.y = u.y * h;
      out.z = u.z * d;
    }
    return out;
  }

  /** Deriva da caixa local o que o resto do motor já lê (grade, alcance, topo). */
  function finishMoldBox(mold) {
    var c = mold.col;
    // Espessura mínima: cresce simetricamente em volta do centro do eixo magro.
    if (c.maxX - c.minX < MIN_THICK) {
      var mx = (c.minX + c.maxX) / 2; c.minX = mx - MIN_THICK / 2; c.maxX = mx + MIN_THICK / 2;
    }
    if (c.maxY - c.minY < MIN_THICK) {
      var my = (c.minY + c.maxY) / 2; c.minY = my - MIN_THICK / 2; c.maxY = my + MIN_THICK / 2;
    }
    if (c.maxZ - c.minZ < MIN_THICK) {
      var mz = (c.minZ + c.maxZ) / 2; c.minZ = mz - MIN_THICK / 2; c.maxZ = mz + MIN_THICK / 2;
    }
    mold.hw = (c.maxX - c.minX) / 2;
    mold.hd = (c.maxZ - c.minZ) / 2;
    mold.top = c.maxY;
    // Raio da grade: o canto mais longe da origem no plano XZ.
    var rx = Math.max(Math.abs(c.minX), Math.abs(c.maxX));
    var rz = Math.max(Math.abs(c.minZ), Math.abs(c.maxZ));
    mold.radius = Math.max(0.5, Math.sqrt(rx * rx + rz * rz));
    // Bola/cápsula: raio derivado da caixa (o maior semi-eixo horizontal).
    c.r = Math.max(mold.hw, mold.hd);
    // Rampa: sobe ao longo de +Z, de minY (no minZ) até maxY (no maxZ).
    c.rampY0 = c.minY;
    c.rampY1 = c.maxY;
  }

  function part(opts) {
    var mold = _currentMold;
    if (!mold) {
      warn('o bloco "Peça" só funciona DENTRO de "Criar o molde 3D"');
      return;
    }
    if (mold.parts >= MAX_PARTS) {
      warn('molde com peças demais — o teto é ' + MAX_PARTS + ' por molde');
      return;
    }
    var o = (opts && typeof opts === 'object') ? opts : {};
    var shape = text(o.shape, 'box');
    var w = Math.max(0.05, num(o.w, 1));
    var h = Math.max(0.05, num(o.h, 1));
    var d = Math.max(0.05, num(o.d, 1));
    var x = num(o.x, 0);
    var y = num(o.y, 0.5);
    var z = num(o.z, 0);
    try {
      var color = text(o.color, config.accent);
      var mat = new THREE.MeshStandardMaterial({ color: color });
      // Acabamento da peça. 'brilho' = emissivo → o bloom pega e a peça ACENDE
      // (é o controle explícito do neon que faltava; antes só os cristais brilhavam).
      var kind = text(o.material, 'normal');
      if (kind === 'metal') {
        mat.metalness = 1;
        mat.roughness = 0.25;
      } else if (kind === 'vidro') {
        mat.transparent = true;
        mat.opacity = 0.4;
        mat.roughness = 0;
      } else if (kind === 'brilho') {
        if (mat.emissive && mat.emissive.set) mat.emissive.set(color);
        mat.emissiveIntensity = 1.4;
      }
      // Textura de imagem do projeto (opcional): a peça ganha o desenho.
      var tex = o.texture ? moldTexture(o.texture) : null;
      if (tex) mat.map = tex;
      var mesh;
      if (shape === 'modelo') {
        // Peça = MODELO do projeto. O GLB chega assíncrono (import do addon +
        // parse), então a peça nasce com um cubo de reserva e o modelo entra no
        // lugar quando fica pronto — a cena nunca aparece quebrada.
        mesh = new THREE.Group();
        var holder = mesh;
        // O molde ANOTA de qual modelo ele é feito: o spawn precisa saber para
        // clonar com esqueleto (SkeletonUtils) e montar o mixer da entidade.
        mold.model = text(o.model, '');
        var ready = loadModel(o.model, function (hit) {
          try {
            while (holder.children.length) holder.remove(holder.children[0]);
            holder.add(cloneModel(hit.scene));
          } catch (e) {}
        });
        if (ready) holder.add(cloneModel(ready.scene));
        else holder.add(new THREE.Mesh(unitGeo('box'), mat));
      } else {
        mesh = new THREE.Mesh(unitGeo(shape), mat);
      }
      // Plano nasce deitado no chão (deita a folha em XZ) — piso/parede útil.
      if (shape === 'plane') mesh.rotation.x = -Math.PI / 2;
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mold.template.add(mesh);
      mold.parts += 1;
      // Caixa LOCAL do colisor: UNIÃO das caixas de cada peça (min/max de verdade,
      // não meia-largura simétrica). Uma peça só em x=5 não faz mais o molde
      // colidir do lado oposto, e peça abaixo de y=0 passa a contar.
      partExtents(shape, w, h, d, _ext);
      var c = mold.col;
      if (mold.parts === 1) {
        c.minX = x - _ext.x; c.maxX = x + _ext.x;
        c.minY = y - _ext.y; c.maxY = y + _ext.y;
        c.minZ = z - _ext.z; c.maxZ = z + _ext.z;
      } else {
        if (x - _ext.x < c.minX) c.minX = x - _ext.x;
        if (x + _ext.x > c.maxX) c.maxX = x + _ext.x;
        if (y - _ext.y < c.minY) c.minY = y - _ext.y;
        if (y + _ext.y > c.maxY) c.maxY = y + _ext.y;
        if (z - _ext.z < c.minZ) c.minZ = z - _ext.z;
        if (z + _ext.z > c.maxZ) c.maxZ = z + _ext.z;
      }
      // A peça de RAMPA manda no formato do colisor (cunha em vez de caixa).
      if (shape === 'rampa') c.kind = 3;
      finishMoldBox(mold);
    } catch (e) {
      warn('não consegui criar a peça: ' + e);
    }
  }

  /** Entidade nova com TODAS as propriedades (hidden class estável p/ o pool). */
  function blankEntity() {
    return {
      mesh: null,
      vx: 0, vy: 0, vz: 0,
      drag: 0,
      speed: 0,
      health: 0, maxHealth: 0,
      state: '',
      stateTime: 0,
      // Física: gravidade própria (0 = desligada) e se está pisando em algo.
      gravity: 0,
      grounded: false,
      // 0 = colide com sólidos · 1 = fantasma (atravessa tudo). É POR ENTIDADE e
      // não por molde de propósito: os casos interessantes são por instância (o
      // tiro mágico que passa a cerca, o inimigo fantasma, a câmera que entra na
      // parede) — um flag por molde obrigaria a criança a criar um 2º molde.
      body: 0,
      // Normal do chão sob os pés (o que decide o grounded, em vez do desempate
      // de eixo): (0,1,0) no plano, inclinada na rampa.
      nx: 0, ny: 0, nz: 0,
      // Plataforma que está me carregando (+ geração, contra slot reciclado).
      _ride: null, _rideGen: 0,
      // Deslocamento DESTA entidade neste quadro (o passageiro soma o da
      // plataforma). Sai de pos - _l, então captura integração E teleporte por
      // place() — velocidade sozinha perderia o segundo.
      _dx: 0, _dy: 0, _dz: 0,
      _lx: 0, _ly: 0, _lz: 0,
      // Zona: geração do visitante que JÁ está dentro (0 = ninguém). É o que faz
      // o gancho disparar ao ENTRAR e não a cada quadro.
      _inKey: 0,
      // A "gaveta" de dados da criança (cronômetro/alvo/contador por entidade).
      // Zerada a cada nascimento — nunca vaza de uma vida anterior do slot do pool.
      data: null,
      _alive: false,
      _mold: '',
      _iFrames: 0,
      // Animação do modelo: mixer/clipes/ação são POR ENTIDADE (o mesh é dela).
      // Declarados aqui só para o objeto nascer com a forma final — trocar a forma
      // depois faz o motor de JS re-otimizar o slot do pool.
      _mixer: null,
      _clips: null,
      _action: null,
      // Geração: incrementa a cada nascimento. Um handle guardado de uma entidade
      // reciclada-e-reusada tem _gen antigo → os métodos o tratam como "não é mais ela".
      _gen: 0,
      _gi: null,
      // Carimbo da última consulta de grade que já viu esta entidade (dedup O(1)).
      _stamp: 0
    };
  }

  function spawn(name, x, y, z) {
    if (!worldReady) {
      warn('"Nascer" só funciona depois de "Começar o jogo" — use dentro de "quando o jogo entrar no estado jogando"');
      return null;
    }
    var k = text(name, '');
    var m = molds[k];
    if (!m) {
      warn('o molde "' + k + '" não existe — crie com "Criar o molde 3D"');
      return null;
    }
    if (totalAlive >= MAX_ENTITIES) {
      if (!entityLimitWarned) {
        entityLimitWarned = true;
        warn('o mundo lotou (' + MAX_ENTITIES + ' entidades) — recolha as que saírem do jogo');
      }
      return null;
    }
    var pool = pools[k] || (pools[k] = { active: [], free: [], _sweeping: 0 });
    var e = pool.free.pop();
    if (!e) {
      e = blankEntity();
      try {
        // clone() compartilha geometria e material — nascer não aloca GPU.
        e.mesh = m.template.clone();
      } catch (err) {
        warn('não consegui fazer nascer do molde "' + k + '": ' + err);
        return null;
      }
      scene.add(e.mesh);
      // Ponte mesh→entidade para o raycast (clicar/mirar devolve a entidade).
      if (e.mesh.userData) e.mesh.userData.szEntity = e;
      else e.mesh.userData = { szEntity: e };
    }
    e.mesh.visible = true;
    e.mesh.position.set(num(x, 0), num(y, 0), num(z, 0));
    e.mesh.rotation.set(0, 0, 0);
    e.mesh.scale.set(1, 1, 1);
    e.vx = 0; e.vy = 0; e.vz = 0;
    e.drag = 0;
    e.speed = m.speed;
    e.health = m.health;
    e.maxHealth = m.health;
    e.stateTime = 0;
    // Gravidade-padrão do molde ("ter física de bola/caixa/…"). Molde que não
    // opina nasce em 0, exatamente como antes — "fazer cair com" segue mandando.
    e.gravity = m.gravity ? -Math.abs(m.gravity) : 0;
    e.grounded = false;
    // Higiene do pool: tudo que a vida anterior do slot pôde sujar volta ao zero
    // (mesmo motivo do data = {} logo abaixo).
    e.body = 0;
    e.nx = 0; e.ny = 0; e.nz = 0;
    e._ride = null; e._rideGen = 0;
    e._dx = 0; e._dy = 0; e._dz = 0;
    e._lx = num(x, 0); e._ly = num(y, 0); e._lz = num(z, 0);
    e._inKey = 0;
    // Gaveta de dados NOVA a cada nascimento — nunca herda o lixo do slot reusado
    // do pool (era o vazamento de campo custom entre vidas).
    e.data = {};
    e._alive = true;
    e._mold = k;
    e._iFrames = 0;
    // Mixer POR ENTIDADE (cada boneco anima no tempo dele). Slot reusado do pool
    // já tem o seu — não remonta, só rebobina.
    if (!e._mixer) attachMixer(e, m);
    else e._action = null;
    e._gen = (e._gen || 0) + 1;
    e._gi = null;
    pool.active.push(e);
    totalAlive += 1;
    gridSync(e);
    // Toda entidade NASCE no estado 'parado' (a FSM do curso): os ganchos de
    // entrar rodam já no nascimento.
    e.state = '';
    setEntityState(e, 'parado');
    return e;
  }

  function spawnFrom(name, src) {
    var e = spawn(name, posAxis(src, 'x'), posAxis(src, 'y'), posAxis(src, 'z'));
    if (e && src && src.mesh && e.mesh.quaternion && src.mesh.quaternion) {
      e.mesh.quaternion.copy(src.mesh.quaternion);
    }
    return e;
  }

  function isEntity(e) {
    return !!(e && typeof e === 'object' && e.mesh && e._alive === true);
  }

  function posAxis(e, axis) {
    if (!e || !e.mesh || !e.mesh.position) return 0;
    var v = e.mesh.position[axis];
    return (typeof v === 'number' && isFinite(v)) ? v : 0;
  }

  function recycle(e) {
    if (!e || typeof e !== 'object' || !e._mold) return;
    if (!e._alive) return;
    // Para a animação ANTES de baixar o _alive: o stopAnim passa pelo isEntity, que
    // exige entidade viva — invertido, ele saía calado e a ação seguia mexendo nos
    // ossos de um boneco invisível até o slot ser reusado.
    if (e._mixer) stopAnim(e);
    e._alive = false;
    e._iFrames = 0;
    if (e.mesh) e.mesh.visible = false;
    gridRemove(e);
    totalAlive = Math.max(0, totalAlive - 1);
    var pool = pools[e._mold];
    if (!pool) return;
    // Dentro de uma varredura (contador > 0), a compactação no fim devolve ao
    // free[]; fora dela, devolvemos agora (senão ficava presa no active[]).
    if (pool._sweeping === 0) {
      var idx = pool.active.indexOf(e);
      if (idx > -1) {
        pool.active.splice(idx, 1);
        pool.free.push(e);
      }
    }
  }

  function compact(pool) {
    for (var i = pool.active.length - 1; i >= 0; i--) {
      if (!pool.active[i]._alive) {
        var dead = pool.active[i];
        pool.active.splice(i, 1);
        pool.free.push(dead);
      }
    }
  }

  function releaseAll(pool) {
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      if (e._alive) totalAlive = Math.max(0, totalAlive - 1);
      e._alive = false;
      e._iFrames = 0;
      if (e.mesh) e.mesh.visible = false;
      gridRemove(e);
      pool.free.push(e);
    }
    pool.active.length = 0;
  }

  function recycleAll(name) {
    var pool = pools[text(name, '')];
    if (pool) releaseAll(pool);
  }

  function forEachAlive(name, fn) {
    var pool = pools[text(name, '')];
    if (!pool || typeof fn !== 'function') return;
    // Contador de profundidade: varreduras ANINHADAS (ex.: forEachNear no mesmo
    // molde dentro de um gancho de step) não podem compactar no meio da externa.
    pool._sweeping++;
    for (var i = pool.active.length - 1; i >= 0; i--) {
      var e = pool.active[i];
      if (!e || !e._alive) continue;
      try {
        fn(e);
      } catch (err) {
        // Avisa UMA vez por CALLBACK (flag persistente na fn) — senão 60×/s afoga.
        if (!fn.__szg3kWarned) {
          fn.__szg3kWarned = true;
          warn('erro no "para cada vivo": ' + err);
        }
      }
    }
    pool._sweeping--;
    if (pool._sweeping === 0) compact(pool);
  }

  function countAlive(name) {
    var pool = pools[text(name, '')];
    if (!pool) return 0;
    var n = 0;
    for (var i = 0; i < pool.active.length; i++) {
      if (pool.active[i]._alive) n++;
    }
    return n;
  }

  function cullFar(name, dist) {
    var pool = pools[text(name, '')];
    if (!pool) return;
    var d = Math.max(1, num(dist, 60));
    var d2 = d * d;
    pool._sweeping++;
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      if (!e || !e._alive || !e.mesh) continue;
      var p = e.mesh.position;
      if (p.x * p.x + p.y * p.y + p.z * p.z > d2) recycle(e);
    }
    pool._sweeping--;
    if (pool._sweeping === 0) compact(pool);
  }

  function startSpawner(mold, seconds, where) {
    var k = text(mold, '');
    if (!k) return;
    var mode = text(where, 'edge') === 'anywhere' ? 'anywhere' : 'edge';
    // Dedupe por molde: religar SUBSTITUI o ritmo (senão o bloco dentro de
    // "quando entrar em jogando" dobrava a taxa a cada "Jogar de novo").
    for (var i = 0; i < spawners.length; i++) {
      if (spawners[i].mold === k) {
        spawners[i].interval = Math.max(0.05, num(seconds, 2));
        spawners[i].where = mode;
        spawners[i].timer = 0;
        return;
      }
    }
    spawners.push({ mold: k, interval: Math.max(0.05, num(seconds, 2)), timer: 0, where: mode });
  }

  function stopSpawner(mold) {
    var k = text(mold, '');
    for (var i = spawners.length - 1; i >= 0; i--) {
      if (spawners[i].mold === k) spawners.splice(i, 1);
    }
  }

  function spawnFromSpawner(sp) {
    var radius = config.world * 0.45;
    var ang = rand() * Math.PI * 2;
    var dist = sp.where === 'anywhere' ? Math.sqrt(rand()) * radius : radius;
    spawn(sp.mold, Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
  }

  // ---- FSM por MOLDE (o coração didático do curso: cada entidade tem estado) ----

  function fsmBucket(mold, stateName) {
    var m = text(mold, '');
    var s = text(stateName, '');
    if (!m || !s) return null;
    var perMold = fsmHooks[m] || (fsmHooks[m] = Object.create(null));
    return perMold[s] || (perMold[s] = { enter: [], step: [], exit: [] });
  }

  function setEntityState(e, stateName) {
    if (!e || typeof e !== 'object' || !e._mold) return;
    var next = text(stateName, '');
    if (!next || e.state === next) return; // idempotente, como no curso
    var perMold = fsmHooks[e._mold];
    var oldBucket = perMold && e.state ? perMold[e.state] : null;
    if (oldBucket) runEntityHooks(oldBucket.exit, e, 'quando sair do estado ' + e.state);
    e.state = next;
    e.stateTime = 0;
    // ⭐ A animação amarrada ao ESTADO: é o casamento da lição do curso (mixer por
    // personagem) com o coração do kit (FSM por entidade). A criança amarra uma
    // vez e o boneco se anima sozinho conforme o cérebro dele muda — o mesmo que o
    // autoAnimate do Jogo 2D faz lá.
    var mold = molds[e._mold];
    if (mold && mold.stateAnims && e._mixer) {
      var clipName = mold.stateAnims[next];
      if (clipName) playAnim(e, clipName, true);
    }
    var newBucket = perMold ? perMold[next] : null;
    if (newBucket) runEntityHooks(newBucket.enter, e, 'quando entrar no estado ' + next);
  }

  /** "No molde X, no estado Y, tocar a animação Z." */
  function setStateAnim(mold, state, clip) {
    var m = molds[text(mold, '')];
    if (!m) return;
    if (!m.stateAnims) m.stateAnims = {};
    m.stateAnims[text(state, '')] = text(clip, '');
  }

  function runEntityHooks(list, e, label) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      try {
        fn(e, currentDt);
      } catch (err) {
        if (!fn.__szg3kWarned) {
          fn.__szg3kWarned = true;
          warn('erro no "' + label + '": ' + err);
        }
      }
    }
  }

  /** Ganchos da ZONA: fn(zona, quemEncostou). Warn-1x igual aos outros. */
  function runOverlapHooks(zone, who) {
    var list = overlapHooks[zone._mold];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      try {
        fn(zone, who);
      } catch (err) {
        if (!fn.__szg3kWarned) {
          fn.__szg3kWarned = true;
          warn('erro no "Quando alguém encostar": ' + err);
        }
      }
    }
  }

  function stateTimer(mold, stateName, sec, next) {
    var m = text(mold, '');
    var s = text(stateName, '');
    var n = text(next, '');
    if (!m || !s || !n) return;
    // Dedupe por (molde, estado): re-registrar troca o destino/tempo.
    for (var i = 0; i < stateTimers.length; i++) {
      if (stateTimers[i].mold === m && stateTimers[i].state === s) {
        stateTimers[i].sec = Math.max(0.05, num(sec, 1.5));
        stateTimers[i].next = n;
        return;
      }
    }
    stateTimers.push({ mold: m, state: s, sec: Math.max(0.05, num(sec, 1.5)), next: n });
  }

  // ---- Física sólida (gravidade + chão + colisão de molde sólido) ----
  //
  // Modelo: cinemático, caixa/bola/cápsula/rampa por MOLDE, resolvido por menor
  // penetração DEPOIS de integrar, com substepping quando o passo é grande
  // demais (anti-tunelamento). Quem manda no grounded é a NORMAL do contato —
  // não o desempate de eixo, que empurrava de lado num pouso raso.

  var anySolid = false;      // liga a resolução de sólidos só quando há algum
  var anyTrigger = false;    // idem para as zonas
  var anyCarrier = false;    // algum molde sólido que se MOVE (plataforma)
  var _minSolidThin = 1e9;   // o sólido mais FINO do mundo (critério do substep)
  var MAX_SUBSTEPS = 4;
  var MIN_GROUND_Y = 0.64;   // ~50°: mais íngreme que isso é PAREDE, escorrega
  var SNAP_DIST = 0.3;       // grude no chão ao descer rampa (senão vira trampolim)
  var SKIN = 0.02;
  var BOUNCE_MIN = 1.2;      // quique morto abaixo disso: não fica tremendo
  var _boxA = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  var _boxB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  var _cand = [];            // candidatos do broadphase (buffer PRÓPRIO — ver nota)
  var _candN = 0;

  /** Caixa MUNDO da entidade a partir da caixa local do molde. */
  function entBox(e, out) {
    var m = molds[e._mold];
    var p = e.mesh.position;
    if (!m) {
      out.minX = p.x - 0.5; out.maxX = p.x + 0.5;
      out.minY = p.y;       out.maxY = p.y + 1;
      out.minZ = p.z - 0.5; out.maxZ = p.z + 0.5;
      return;
    }
    var c = m.col;
    out.minX = p.x + c.minX; out.maxX = p.x + c.maxX;
    out.minY = p.y + c.minY; out.maxY = p.y + c.maxY;
    out.minZ = p.z + c.minZ; out.maxZ = p.z + c.maxZ;
  }

  /**
   * Caixa MUNDO de um sólido, no frame LOCAL dele (desfaz o yaw). Yaw preserva o
   * eixo Y do mundo, então uma bola/cápsula vertical continua vertical no frame
   * girado — cápsula-vs-caixa-girada vira cápsula-vs-AABB, sem matemática nova.
   * (A engine não consegue produzir pitch/roll: setYaw/faceVelocity escrevem
   * (0,y,0), lookAt força o Y do alvo e aimAt achata em Y.)
   */
  function localOf(s, px, pz, out) {
    var yaw = s.mesh.rotation.y;
    var dx = px - s.mesh.position.x;
    var dz = pz - s.mesh.position.z;
    if (!yaw) { out.x = dx; out.z = dz; return out; }
    var c = Math.cos(-yaw), si = Math.sin(-yaw);
    out.x = dx * c - dz * si;
    out.z = dx * si + dz * c;
    return out;
  }
  var _loc = { x: 0, z: 0 };

  /** Altura da rampa no ponto local (lx,lz) — a MESMA reta da malha (wedgeGeo). */
  function rampHeight(c, lx, lz) {
    var t = c.rampAxis === 0
      ? (lx - c.minX) / (c.maxX - c.minX || 1)
      : (lz - c.minZ) / (c.maxZ - c.minZ || 1);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return c.rampY0 + (c.rampY1 - c.rampY0) * t;
  }

  /** Marca o contato: a normal decide o grounded (e quem me carrega). */
  function contact(e, nx, ny, nz, solidEnt) {
    if (ny >= MIN_GROUND_Y) {
      e.grounded = true;
      e.nx = nx; e.ny = ny; e.nz = nz;
      if (solidEnt) { e._ride = solidEnt; e._rideGen = solidEnt._gen; }
    }
    // Impulso na normal. bounce=0 -> v -= vn*N -> remove só a componente que
    // ENTRA na superfície, que é exatamente o "zera o eixo" de antes — mas sem
    // matar a velocidade de quem já está SAINDO da parede (o antigo grudava).
    var vn = e.vx * nx + e.vy * ny + e.vz * nz;
    if (vn < 0) {
      // ⭐ O quique é dos DOIS lados, e o MAIOR manda. Antes só a superfície
      // contava — e o piso-base chega aqui com solidEnt null, então NADA quicava
      // nele. Resultado: a bola era obrigada a não quicar no chão comum e o
      // humano era obrigado a quicar no trampolim. Com o máximo: a bola quica em
      // qualquer chão, o humano não quica em chão nenhum, e o trampolim continua
      // arremessando o humano (0.9 vence o 0 dele).
      var m = solidEnt ? molds[solidEnt._mold] : null;
      var em = molds[e._mold];
      var b = m ? m.bounce : 0;
      var eb = em ? em.bounce : 0;
      if (eb > b) b = eb;
      var j = (1 + b) * vn;
      if (b > 0 && Math.abs(vn) < BOUNCE_MIN) j = vn;
      e.vx -= j * nx; e.vy -= j * ny; e.vz -= j * nz;
    }
  }

  /** Pisa no chão-base (y=0): os pés do molde são a origem. */
  function resolveGround(e) {
    var p = e.mesh.position;
    var m = molds[e._mold];
    var foot = m ? m.col.minY : 0;
    if (p.y + foot <= 0) {
      p.y = -foot;
      contact(e, 0, 1, 0, null);
    }
  }

  /** Resolve a entidade contra UM sólido. Devolve true se houve contato. */
  function resolveOne(e, s) {
    var p = e.mesh.position;
    var sm = molds[s._mold];
    if (!sm) return false;
    var c = sm.col;
    entBox(e, _boxA);
    // Rampa: superfície inclinada — trata pelo topo, não por push-out de caixa.
    if (c.kind === 3) {
      localOf(s, p.x, p.z, _loc);
      if (_loc.x < c.minX || _loc.x > c.maxX || _loc.z < c.minZ || _loc.z > c.maxZ) return false;
      var em = molds[e._mold];
      var foot = em ? em.col.minY : 0;
      var surf = s.mesh.position.y + rampHeight(c, _loc.x, _loc.z);
      if (p.y + foot < surf && p.y + foot > surf - 1.2) {
        p.y = surf - foot;
        // Normal da rampa: a reta sobe (rampY1-rampY0) ao longo de (max-min).
        var run = (c.rampAxis === 0 ? c.maxX - c.minX : c.maxZ - c.minZ) || 1;
        var rise = c.rampY1 - c.rampY0;
        var len = Math.sqrt(run * run + rise * rise) || 1;
        var ny = run / len;
        var nt = -rise / len;
        var yaw = s.mesh.rotation.y;
        var cs = Math.cos(yaw), sn = Math.sin(yaw);
        var lnx = c.rampAxis === 0 ? nt : 0;
        var lnz = c.rampAxis === 0 ? 0 : nt;
        contact(e, lnx * cs + lnz * sn, ny, -lnx * sn + lnz * cs, s);
        return true;
      }
      return false;
    }
    var yaw2 = s.mesh.rotation.y;
    localOf(s, p.x, p.z, _loc);
    // Movedor BOLA/CÁPSULA vs caixa sólida: ponto mais próximo na caixa e empurra
    // na direção dele. É o que tira o enganchar em quina (a caixa engata no canto;
    // a cápsula desliza) e o que faz gente subir rampa/degrau liso.
    // Como o yaw preserva o eixo Y do mundo, a cápsula continua EM PÉ no frame
    // local do sólido — vira cápsula-vs-AABB, sem matemática nova.
    var em = molds[e._mold];
    var ec = em ? em.col : null;
    if (ec && (ec.kind === 1 || ec.kind === 2)) {
      var r = ec.r;
      var cy0 = p.y + ec.minY + r;
      var cy1 = p.y + ec.maxY - r;
      if (ec.kind === 1 || cy1 < cy0) { cy0 = cy1 = p.y + (ec.minY + ec.maxY) / 2; }
      var bMinY = s.mesh.position.y + c.minY;
      var bMaxY = s.mesh.position.y + c.maxY;
      // Ponto do SEGMENTO da cápsula mais perto da faixa Y da caixa.
      var segY = (bMinY + bMaxY) / 2;
      if (segY < cy0) segY = cy0;
      if (segY > cy1) segY = cy1;
      // Ponto da CAIXA mais perto desse ponto do segmento.
      var qx = _loc.x < c.minX ? c.minX : (_loc.x > c.maxX ? c.maxX : _loc.x);
      var qy = segY < bMinY ? bMinY : (segY > bMaxY ? bMaxY : segY);
      var qz = _loc.z < c.minZ ? c.minZ : (_loc.z > c.maxZ ? c.maxZ : _loc.z);
      var ddx = _loc.x - qx, ddy = segY - qy, ddz = _loc.z - qz;
      var d2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d2 > 0.000001) {
        var dist = Math.sqrt(d2);
        if (dist >= r) return false;
        var pen = r - dist;
        var lnx3 = ddx / dist, lny3 = ddy / dist, lnz3 = ddz / dist;
        var cw = Math.cos(yaw2), sw = Math.sin(yaw2);
        var wnx = lnx3 * cw + lnz3 * sw;
        var wnz = -lnx3 * sw + lnz3 * cw;
        p.x += wnx * pen; p.y += lny3 * pen; p.z += wnz * pen;
        contact(e, wnx, lny3, wnz, s);
        return true;
      }
      // Centro DENTRO da caixa (penetração profunda): cai no caminho de caixa.
    }
    // Caixa (yaw-aware): resolve no frame LOCAL do sólido e devolve a correção.
    var ehw = (_boxA.maxX - _boxA.minX) / 2;
    var ehd = (_boxA.maxZ - _boxA.minZ) / 2;
    if (yaw2) { var big = Math.max(ehw, ehd); ehw = big; ehd = big; }  // AABB do movedor não gira
    var ox = Math.min(_loc.x + ehw, c.maxX) - Math.max(_loc.x - ehw, c.minX);
    var oz = Math.min(_loc.z + ehd, c.maxZ) - Math.max(_loc.z - ehd, c.minZ);
    var sMinY = s.mesh.position.y + c.minY;
    var sMaxY = s.mesh.position.y + c.maxY;
    var oy = Math.min(_boxA.maxY, sMaxY) - Math.max(_boxA.minY, sMinY);
    if (ox <= 0 || oy <= 0 || oz <= 0) return false;
    // Eixo de MENOR penetração. O empate importa de verdade: um objeto pequeno
    // ENGOLIDO por uma parede grossa tem ox = oy = oz = o próprio tamanho, e aí
    // "o menor" não diz nada. Desempata por VELOCIDADE — o eixo em que a
    // entidade mais se move é aquele por onde ela entrou. Sem isso, um tiro
    // dentro da parede era empurrado para CIMA e seguia atravessando.
    var EPS = 1e-4;
    var mn = Math.min(ox, Math.min(oy, oz));
    var useX = ox <= mn + EPS;
    var useY = oy <= mn + EPS;
    var useZ = oz <= mn + EPS;
    if ((useX ? 1 : 0) + (useY ? 1 : 0) + (useZ ? 1 : 0) > 1) {
      var avx = useX ? Math.abs(e.vx) : -1;
      var avy = useY ? Math.abs(e.vy) : -1;
      var avz = useZ ? Math.abs(e.vz) : -1;
      if (avy >= avx && avy >= avz) { useX = false; useZ = false; }
      else if (avx >= avz) { useY = false; useZ = false; }
      else { useX = false; useY = false; }
    }
    if (useY) {
      // Vertical: pousa em cima ou bate a cabeça.
      if ((_boxA.minY + _boxA.maxY) / 2 > (sMinY + sMaxY) / 2) { p.y += oy; contact(e, 0, 1, 0, s); }
      else { p.y -= oy; contact(e, 0, -1, 0, s); }
      return true;
    }
    // Horizontal: empurra pelo eixo escolhido NO FRAME LOCAL e volta ao mundo.
    var lpx = 0, lpz = 0, lnx2 = 0, lnz2 = 0;
    if (useX) {
      var sx = _loc.x < (c.minX + c.maxX) / 2 ? -1 : 1;
      lpx = ox * sx; lnx2 = sx;
    } else {
      var sz = _loc.z < (c.minZ + c.maxZ) / 2 ? -1 : 1;
      lpz = oz * sz; lnz2 = sz;
    }
    var cc = Math.cos(yaw2), ss = Math.sin(yaw2);
    p.x += lpx * cc + lpz * ss;
    p.z += -lpx * ss + lpz * cc;
    contact(e, lnx2 * cc + lnz2 * ss, 0, -lnx2 * ss + lnz2 * cc, s);
    return true;
  }

  /** Empurra para fora de TODOS os sólidos candidatos (sequencial). */
  function resolveSolids(e) {
    for (var i = 0; i < _candN; i++) {
      var s = _cand[i];
      if (s && s._alive) resolveOne(e, s);
    }
  }

  /**
   * Broadphase UMA vez por quadro: copia os candidatos para um buffer PRÓPRIO.
   * A cópia é obrigatória, não otimização: o gridQuery devolve o buffer
   * COMPARTILHADO ("o chamador consome antes da próxima consulta"), e um gancho
   * da criança dentro da resolução (forEachNear/nearest) o sobrescreveria.
   */
  function fillCandidates(e, dx, dz) {
    _candN = 0;
    var m = molds[e._mold];
    if (!m) return;
    var p = e.mesh.position;
    // alcance = extensão do MOVEDOR + deslocamento do QUADRO + pele. O "+2" fixo
    // de antes ignorava o deslocamento — com substep, um tiro rápido saía da
    // consulta antes de a varredura testá-lo.
    var reach = Math.max(m.hw, m.hd) + Math.sqrt(dx * dx + dz * dz) + SKIN + 0.5;
    var list = gridQuery(p.x, p.z, reach);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s === e || !s._alive) continue;
      var sm = molds[s._mold];
      if (!sm || (!sm.solid && !sm.trigger)) continue;
      _cand[_candN++] = s;
    }
  }

  /** Quantos substeps para não atravessar o sólido mais fino do mundo. */
  function substepsFor(e, dx, dy, dz) {
    var m = molds[e._mold];
    var c = m ? m.col : null;
    var thin = c
      ? Math.min(c.maxX - c.minX, Math.min(c.maxY - c.minY, c.maxZ - c.minZ))
      : MIN_THICK;
    if (_minSolidThin < thin) thin = _minSolidThin;
    if (thin < MIN_THICK) thin = MIN_THICK;
    var disp = Math.abs(dx);
    if (Math.abs(dy) > disp) disp = Math.abs(dy);
    if (Math.abs(dz) > disp) disp = Math.abs(dz);
    var k = 1 + Math.floor(disp / (thin * 0.5));
    return k > MAX_SUBSTEPS ? MAX_SUBSTEPS : k;
  }

  /** Grude no chão ao descer rampa/degrau (senão a descida vira trampolim). */
  function snapDown(e) {
    var p = e.mesh.position;
    var y0 = p.y;
    p.y -= SNAP_DIST;
    var hit = false;
    for (var i = 0; i < _candN; i++) {
      var s = _cand[i];
      if (!s || !s._alive) continue;
      var sm = molds[s._mold];
      if (!sm || !sm.solid) continue;
      if (resolveOne(e, s)) hit = true;
    }
    if (!hit) p.y = y0;
  }

  /** Zonas: sobreposição SEM empurrar; dispara no ENTRAR, não a cada quadro. */
  function stepTriggers(e) {
    entBox(e, _boxA);
    for (var i = 0; i < _candN; i++) {
      var z = _cand[i];
      if (!z || !z._alive) continue;
      var zm = molds[z._mold];
      if (!zm || !zm.trigger) continue;
      entBox(z, _boxB);
      var over = _boxA.maxX > _boxB.minX && _boxA.minX < _boxB.maxX &&
                 _boxA.maxY > _boxB.minY && _boxA.minY < _boxB.maxY &&
                 _boxA.maxZ > _boxB.minZ && _boxA.minZ < _boxB.maxZ;
      // Carimbo de "já estava dentro" no par (zona, geração do visitante): o
      // gancho roda na ENTRADA. Por quadro seria pegadinha (hurt todo frame).
      var key = e._gen;
      if (over) {
        if (z._inKey !== key) { z._inKey = key; runOverlapHooks(z, e); }
      } else if (z._inKey === key) {
        z._inKey = 0;
      }
    }
  }

  // ---- Física da entidade (arrasto exponencial + integração + i-frames) ----

  function stepEntity(e, dt) {
    // 1. FSM: ganchos "enquanto estiver no estado" + transições por tempo.
    var perMold = fsmHooks[e._mold];
    if (perMold && e.state) {
      var bucket = perMold[e.state];
      if (bucket) runEntityHooks(bucket.step, e, 'enquanto estiver no estado ' + e.state);
    }
    if (!e._alive) return; // o gancho pode ter recolhido a entidade
    // 1b. O boneco anima. Só quem TEM mixer paga (o curso roda o mixer.update com
    // o mesmo dt clampado). Vem antes do split estático/dinâmico logo abaixo: um
    // boneco parado no lugar ainda respira.
    if (e._mixer) {
      try { e._mixer.update(dt); } catch (err) {}
    }
    e.stateTime += dt;
    for (var t = 0; t < stateTimers.length; t++) {
      var timer = stateTimers[t];
      if (timer.mold === e._mold && timer.state === e.state && e.stateTime >= timer.sec) {
        setEntityState(e, timer.next);
        if (!e._alive) return;
        break;
      }
    }
    var p = e.mesh.position;
    // 2. Carona: a plataforma que me segura já andou neste quadro (passo A) —
    //    ando junto ANTES de integrar. _gen guarda contra slot reciclado do pool.
    if (e._ride) {
      if (e._ride._alive && e._ride._gen === e._rideGen) {
        p.x += e._ride._dx; p.y += e._ride._dy; p.z += e._ride._dz;
      } else {
        e._ride = null;
      }
    }
    // Split ESTÁTICO/DINÂMICO do curso ("só as dinâmicas dão step"), aqui por
    // ENTIDADE — a gravidade é da entidade, não do molde. Quem está parado, sem
    // gravidade, sem carona e sem piscar não tem NADA para integrar: pula a
    // física, a colisão, as zonas e o gridSync (a posição não mudou, então a
    // grade e os deltas seguem válidos). Conservador de propósito: os ganchos da
    // FSM e o stateTime ACIMA continuam rodando — congelá-los pararia o cérebro
    // da entidade e o relógio que a criança lê.
    if (!e.vx && !e.vy && !e.vz && !e.gravity && !e._ride && e._iFrames <= 0) {
      e._dx = 0; e._dy = 0; e._dz = 0;
      return;
    }
    var wasGrounded = e.grounded;
    // 3. Gravidade própria (se ligada): puxa antes de integrar (semi-implícito).
    if (e.gravity) e.vy += e.gravity * dt;
    e.grounded = false;
    e._ride = null;
    // 4. Arrasto do AR: só no plano. Aplicar em Y brigava com a gravidade — a
    //    criança ligava "arrasto" e a entidade passava a flutuar, que não é o
    //    que o bloco promete.
    if (e.drag > 0) {
      var f = Math.exp(-e.drag * dt);
      e.vx *= f; e.vz *= f;
    }
    var dx = e.vx * dt, dy = e.vy * dt, dz = e.vz * dt;
    // 5. Colisão. Os dois gates são perguntas DIFERENTES e estavam fundidos:
    //    o CHÃO-BASE (y=0) é consequência da GRAVIDADE — quem não cai não tem por
    //    que ser parado por um piso invisível (tiro, drone, câmera). Já ser SÓLIDO
    //    é consequência de EXISTIR: parede para tudo que não é fantasma. Fundir os
    //    dois era o bug do tiro atravessando a parede.
    var wantSolid = (anySolid || anyTrigger) && e.body === 0;
    if (wantSolid && (dx || dy || dz || e.gravity)) {
      fillCandidates(e, dx, dz);
      var k = _candN > 0 ? substepsFor(e, dx, dy, dz) : 1;
      // Integra cada substep com a velocidade VIVA (dt/k), não com um passo
      // pré-calculado: quando a colisão zera a velocidade no meio do quadro, o
      // que sobra do movimento tem que morrer junto. Com passo fixo o tiro
      // continuava avançando dentro da parede depois de já ter sido parado.
      var h = dt / k;
      for (var st = 0; st < k; st++) {
        p.x += e.vx * h; p.y += e.vy * h; p.z += e.vz * h;
        if (anySolid) resolveSolids(e);
      }
      if (e.gravity) resolveGround(e);
      // 7. Grude no chão ao descer rampa/degrau (senão a descida vira trampolim).
      if (wasGrounded && !e.grounded && e.vy <= 0 && anySolid) snapDown(e);
      // 8. Atrito: o mais ESCORREGADIO dos dois manda — gelo no chão OU no disco
      //    e escorrega igual. Não-definido (-1) vale 0 na superfície (gelo, o de
      //    sempre) e 1 em quem anda (sem opinião) → min = a superfície decide,
      //    exatamente como antes de existir atrito por entidade.
      if (e.grounded && e._ride) {
        var rm = molds[e._ride._mold];
        var fm = molds[e._mold];
        var sfr = rm ? (rm.friction < 0 ? 0 : rm.friction) : 0;
        var mfr = fm ? (fm.friction < 0 ? 1 : fm.friction) : 1;
        var fr = sfr < mfr ? sfr : mfr;
        if (fr > 0) {
          var ff = Math.exp(-fr * 8 * dt);
          e.vx *= ff; e.vz *= ff;
        }
      }
      if (anyTrigger) stepTriggers(e);
    } else {
      if (dx || dy || dz) { p.x += dx; p.y += dy; p.z += dz; }
      if (e.gravity) resolveGround(e);
    }
    // 9. Invencibilidade: decai e pisca a 10 Hz.
    if (e._iFrames > 0) {
      e._iFrames = Math.max(0, e._iFrames - dt);
      e.mesh.visible = e._iFrames <= 0 || Math.floor(e._iFrames * 10) % 2 === 0;
      if (e._iFrames <= 0) e.mesh.visible = true;
    }
    // 10. Deslocamento deste quadro (o que os passageiros somam). Sai de
    //     pos - _l, então captura integração E teleporte por place().
    e._dx = p.x - e._lx; e._dy = p.y - e._ly; e._dz = p.z - e._lz;
    e._lx = p.x; e._ly = p.y; e._lz = p.z;
    // 11. Grade espacial acompanha a posição.
    gridSync(e);
  }

  // ---- Comportamentos (a matemática do curso pronta em blocos) ----

  /**
   * A base do WASD: para onde a CÂMERA olha, achatado no plano do chão.
   *
   * ⭐ É o que faz "W entra na tela" valer em TODOS os modos de câmera, que é
   * como todo jogo 3D de verdade funciona (Mario 64, Zelda). Antes o WASD andava
   * por eixo FIXO do mundo (W = -Z sempre): certo por acidente na câmera de cima,
   * torto 40° na de órbita e EXATAMENTE ao contrário na que segue — porque a
   * câmera que segue fica ATRÁS do alvo, olhando para +Z.
   *
   * Lê a orientação REAL da câmera (não o modo), então já nasce certo para
   * qualquer câmera futura, e o amortecimento do seguir suaviza a base de graça.
   */
  function camBasisXZ() {
    _camF.set(0, 0, -1);
    if (camera) {
      camera.getWorldDirection(_camF);
      _camF.y = 0;
      // Olhando reto para baixo (câmera de cima): o topo da tela é -Z.
      if (_camF.lengthSq() < 0.000000000001) _camF.set(0, 0, -1);
      else _camF.normalize();
    }
    // A direita da tela = cross(cima, -frente), achatada.
    _camR.set(-_camF.z, 0, _camF.x);
  }

  /** Anda no chão pela base da câmera (o miolo do WASD e do 1ª pessoa). */
  function moveOnCamBasis(e, sp) {
    var mf = 0;
    var mr = 0;
    if (keys.w || keys.arrowup) mf += 1;
    if (keys.s || keys.arrowdown) mf -= 1;
    if (keys.d || keys.arrowright) mr += 1;
    if (keys.a || keys.arrowleft) mr -= 1;
    if (!mf && !mr) {
      e.vx = 0;
      e.vz = 0;
      return;
    }
    camBasisXZ();
    var dx = _camF.x * mf + _camR.x * mr;
    var dz = _camF.z * mf + _camR.z * mr;
    var len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0.000001) {
      e.vx = (dx / len) * sp;
      e.vz = (dz / len) * sp;
    } else {
      e.vx = 0;
      e.vz = 0;
    }
  }

  function moveWithKeys(e, speed) {
    if (!isEntity(e)) return;
    moveOnCamBasis(e, num(speed, 8));
  }

  // ---- 🏃 Física jogável (gravidade/pulo/plataforma) ----

  function fall(e, g) {
    if (!isEntity(e)) return;
    // Gravidade para BAIXO (o valor é a força; negativo interno).
    e.gravity = -Math.abs(num(g, 20));
  }
  function jump(e, force) {
    if (!isEntity(e)) return;
    if (e.grounded) {
      e.vy = Math.abs(num(force, 8));
      e.grounded = false;
    }
  }
  /** Recalcula os gates globais (custo zero p/ jogo que não usa sólido/zona). */
  function refreshSolidGates() {
    anySolid = false; anyTrigger = false; anyCarrier = false;
    _minSolidThin = 1e9;
    for (var k in molds) {
      var m = molds[k];
      if (m.trigger) { anyTrigger = true; continue; }
      if (!m.solid) continue;
      anySolid = true;
      // O critério do substep é o sólido mais FINO do mundo — não a espessura do
      // movedor: um movedor gordo atravessa uma parede fina do mesmo jeito.
      var c = m.col;
      var thin = Math.min(c.maxX - c.minX, Math.min(c.maxY - c.minY, c.maxZ - c.minZ));
      if (thin < _minSolidThin) _minSolidThin = thin;
      // Molde sólido que anda = plataforma: liga a passada dupla (carona).
      if (m.speed !== 0) anyCarrier = true;
    }
  }
  function makeSolid(mold) {
    var m = molds[text(mold, '')];
    if (!m) return;
    m.solid = true;
    m.trigger = false;
    refreshSolidGates();
  }
  /** Zona: detecta quem entra, mas NÃO empurra (moeda, porta, armadilha). */
  function makeTrigger(mold) {
    var m = molds[text(mold, '')];
    if (!m) return;
    m.trigger = true;
    m.solid = false;
    refreshSolidGates();
  }
  /** Fantasma POR ENTIDADE: atravessa tudo que é sólido. */
  function passThrough(e, on) {
    if (!isEntity(e)) return;
    e.body = on === false ? 0 : 1;
  }
  function setBounce(mold, amount) {
    var m = molds[text(mold, '')];
    if (m) m.bounce = Math.max(0, Math.min(1, num(amount, 0)));
  }
  function setFriction(mold, amount) {
    var m = molds[text(mold, '')];
    if (m) m.friction = Math.max(0, Math.min(1, num(amount, 0)));
  }
  /**
   * Tipos de física prontos: um bloco só e o molde se comporta como a COISA que
   * ele é. É o atalho por cima dos ajustes finos (colisor/quique/atrito/cair),
   * que continuam valendo para quem quiser afinar.
   */
  var PHYS_TYPES = {
    bola:       { col: 1, bounce: 0.7,  friction: 0.4,  g: 20 },
    caixa:      { col: 0, bounce: 0.1,  friction: 0.7,  g: 20 },
    personagem: { col: 2, bounce: 0,    friction: 0.9,  g: 20 },
    gelo:       { col: 0, bounce: 0.05, friction: 0.02, g: 20 },
    flutuante:  { col: 1, bounce: 0.3,  friction: 0.1,  g: 0 }
  };
  function setPhysics(mold, type) {
    var m = molds[text(mold, '')];
    if (!m) return;
    var t = PHYS_TYPES[text(type, 'caixa')];
    if (!t) t = PHYS_TYPES.caixa;
    m.col.kind = t.col;
    m.bounce = t.bounce;
    m.friction = t.friction;
    m.gravity = t.g;
    refreshSolidGates();
  }
  /** Formato invisível que colide: caixa (padrão) · bola · cápsula. */
  function setCollider(mold, shape) {
    var m = molds[text(mold, '')];
    if (!m) return;
    var s = text(shape, 'box');
    m.col.kind = s === 'sphere' ? 1 : (s === 'capsule' ? 2 : 0);
    refreshSolidGates();
  }
  function onOverlap(mold, fn) {
    var k = text(mold, '');
    if (!k || typeof fn !== 'function') return;
    if (!overlapHooks[k]) overlapHooks[k] = [];
    overlapHooks[k].push(fn);
  }
  /** Plataforma pronta: WASD/setas no plano (preserva a queda) + pulo com espaço. */
  function platformerKeys(e, speed, jumpForce) {
    if (!isEntity(e)) return;
    if (!e.gravity) e.gravity = -20;
    moveOnCamBasis(e, num(speed, 8));
    if ((keys[' '] || justPressed[' ']) && e.grounded) {
      e.vy = Math.abs(num(jumpForce, 9));
      e.grounded = false;
    }
  }

  function seek(who, target) {
    if (!isEntity(who) || !isEntity(target)) return;
    var dx = target.mesh.position.x - who.mesh.position.x;
    var dy = target.mesh.position.y - who.mesh.position.y;
    var dz = target.mesh.position.z - who.mesh.position.z;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(len > 0.0001)) { who.vx = 0; who.vy = 0; who.vz = 0; return; }
    var sp = num(who.speed, 3);
    who.vx = (dx / len) * sp;
    who.vy = (dy / len) * sp;
    who.vz = (dz / len) * sp;
  }

  /** Mira suave da torre do curso: slerp com t = 1 - exp(-suavidade · dt). */
  function aimAt(who, target, smooth) {
    if (!isEntity(who) || !isEntity(target) || !_tv1) return;
    _tv1.copy(target.mesh.position).sub(who.mesh.position);
    _tv1.y = 0;
    if (!(_tv1.lengthSq() > 0.000001)) return;
    _tv1.normalize();
    _tq1.setFromUnitVectors(_tv2.set(0, 0, 1), _tv1);
    // λ default 8 (o curso usa 10 na torre; a criança pode subir a suavidade).
    var lambda = Math.max(0.1, num(smooth, 8));
    var t = 1 - Math.exp(-lambda * currentDt);
    who.mesh.quaternion.slerp(_tq1, t);
  }

  /** "Já mirou?" da torre: frente · direção-do-alvo > 0.999. */
  function isAimingAt(who, target) {
    if (!isEntity(who) || !isEntity(target) || !_tv1) return false;
    _tv1.copy(target.mesh.position).sub(who.mesh.position);
    _tv1.y = 0;
    if (!(_tv1.lengthSq() > 0.000001)) return true;
    _tv1.normalize();
    _tv2.set(0, 0, 1).applyQuaternion(who.mesh.quaternion);
    _tv2.y = 0;
    if (!(_tv2.lengthSq() > 0.000001)) return false;
    _tv2.normalize();
    return _tv1.dot(_tv2) > 0.999;
  }

  function faceVelocity(e) {
    if (!isEntity(e)) return;
    if (Math.abs(e.vx) < 0.000001 && Math.abs(e.vz) < 0.000001) return;
    e.mesh.rotation.set(0, Math.atan2(e.vx, e.vz), 0);
  }

  function moveForward(e, speed) {
    if (!isEntity(e) || !_tv1) return;
    var sp = num(speed, 6);
    _tv1.set(0, 0, 1).applyQuaternion(e.mesh.quaternion);
    e.vx = _tv1.x * sp;
    e.vy = _tv1.y * sp;
    e.vz = _tv1.z * sp;
  }

  function lookAt(who, target) {
    if (!isEntity(who) || !isEntity(target)) return;
    who.mesh.lookAt(target.mesh.position.x, who.mesh.position.y, target.mesh.position.z);
  }

  function distanceBetween(a, b) {
    if (!isEntity(a) || !isEntity(b)) return Infinity;
    var dx = a.mesh.position.x - b.mesh.position.x;
    var dy = a.mesh.position.y - b.mesh.position.y;
    var dz = a.mesh.position.z - b.mesh.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ---- Vizinhança (grade espacial encapsulada) ----

  function forEachNear(e, mold, radius, fn) {
    if (!isEntity(e) || typeof fn !== 'function') return;
    var k = text(mold, '');
    var r = Math.max(0.1, num(radius, 10));
    var r2 = r * r;
    var pool = pools[k];
    if (!pool) return;
    var raw = gridQuery(e.mesh.position.x, e.mesh.position.z, r);
    var hits = [];
    for (var i = 0; i < raw.length; i++) {
      var other = raw[i];
      if (other === e || !other._alive || other._mold !== k) continue;
      var dx = other.mesh.position.x - e.mesh.position.x;
      var dy = other.mesh.position.y - e.mesh.position.y;
      var dz = other.mesh.position.z - e.mesh.position.z;
      if (dx * dx + dy * dy + dz * dz <= r2) hits.push(other);
    }
    pool._sweeping++;
    for (var hI = 0; hI < hits.length; hI++) {
      if (!hits[hI]._alive) continue;
      try {
        fn(hits[hI]);
      } catch (err) {
        if (!fn.__szg3kWarned) {
          fn.__szg3kWarned = true;
          warn('erro no "para cada vizinho": ' + err);
        }
      }
    }
    pool._sweeping--;
    if (pool._sweeping === 0) compact(pool);
  }

  /** O mais próximo desse molde. Menor distância dentro do buffer da grade. */
  function nearestOfList(list, e, k) {
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < list.length; i++) {
      var other = list[i];
      if (!other._alive || other === e || other._mold !== k) continue;
      var dx = other.mesh.position.x - e.mesh.position.x;
      var dy = other.mesh.position.y - e.mesh.position.y;
      var dz = other.mesh.position.z - e.mesh.position.z;
      var d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; best = other; }
    }
    return best;
  }

  /**
   * Mais próximo do molde — USA A GRADE (a razão de ela existir). Raio dobrando:
   * acha rápido quando o alvo está por perto (o caso comum torre→inimigo); só cai
   * na varredura do pool inteiro quando não há ninguém por perto (raro).
   */
  function nearest(mold, e) {
    if (!isEntity(e)) return null;
    var k = text(mold, '');
    var pool = pools[k];
    if (!pool) return null;
    var cellSize = config.world / GRID_DIM;
    var px = e.mesh.position.x;
    var pz = e.mesh.position.z;
    for (var mult = 2; mult <= GRID_DIM; mult += mult) {
      var r = cellSize * mult;
      // gridQuery devolve o buffer compartilhado; consumido AQUI antes de re-usar.
      var best = nearestOfList(gridQuery(px, pz, r), e, k);
      if (best) return best;
      if (r >= config.world) break;
    }
    // Fallback: nenhum vizinho na grade — varre o pool (raro, e correto).
    return nearestOfList(pool.active, e, k);
  }

  function touches(a, b, dist) {
    if (!isEntity(a) || !isEntity(b)) return false;
    var d = Math.max(0.01, num(dist, 1.5));
    return distanceBetween(a, b) < d;
  }

  // ---- Combate (dano com i-frames; a derrota roda os ganchos e recolhe) ----

  function hurt(e, amount) {
    if (!isEntity(e)) return;
    if (e._iFrames > 0) return;
    e.health = Math.max(0, num(e.health, 0) - Math.max(0, num(amount, 10)));
    e._iFrames = 0.5;
    if (e.health <= 0) {
      var hooks = deathHooks[e._mold];
      if (hooks) {
        for (var i = 0; i < hooks.length; i++) {
          var fn = hooks[i];
          try {
            fn(e);
          } catch (err) {
            if (!fn.__szg3kWarned) {
              fn.__szg3kWarned = true;
              warn('erro no "quando for derrotado": ' + err);
            }
          }
        }
      }
      recycle(e);
    }
  }

  // ---- 💥 Faíscas 3D (partículas data-driven do curso, simplificadas) ----
  // Cada efeito tem o próprio THREE.Points com buffers pré-alocados (nascer
  // faíscas nunca aloca GPU no meio do jogo). As rampas de 2 chaves (cor/tamanho
  // início→fim) viram UNIFORMS interpolados no shader — sem DataTexture, sem
  // sampler2DArray (zero risco de formato). Aditivo = sem sort. Os shaders são
  // arrays de linhas unidas por espaço: GLSL não liga para whitespace e assim a
  // string não precisa de barra-n nem de diretivas.
  var MAX_PARTICLES_PER_EFFECT = 300;
  var MAX_BURST = 120;

  // particleData = (fração da vida 0→1, id aleatório do grão). O id + o tempo +
  // spinSpeed giram o sprite (o "Data-Driven Particles" do curso). O ramo aditivo
  // pré-multiplica (glow); o normal usa alfa reto (fumaça/névoa com sort por câmera).
  // A curva de vida vive numa TEXTURA assada (o toTexture() do curso): em vez de
  // interpolar 2 chaves num uniform, os shaders AMOSTRAM a rampa — dá N chaves
  // pelo mesmo custo (fogo: amarelo→laranja→vermelho→preto, com o tamanho
  // crescendo e sumindo). Linha de baixo (v=0.25) = COR; de cima (v=0.75) =
  // tamanho no R e opacidade no G. Ver bakeCurve.
  var PARTICLE_VSH = [
    'attribute vec2 particleData;',
    'varying float vLife;',
    'varying float vId;',
    'uniform float sizeFrom;',
    'uniform float sizeTo;',
    'uniform float scaleFactor;',
    'uniform sampler2D curve;',
    'void main() {',
    '  vLife = particleData.x;',
    '  vId = particleData.y;',
    '  vec3 mv = (modelViewMatrix * vec4(position, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * vec4(mv, 1.0);',
    '  float shape = texture2D(curve, vec2(vLife, 0.75)).r;',
    '  float size = mix(sizeFrom, sizeTo, vLife) * shape * 2.0;',
    '  gl_PointSize = size * scaleFactor / max(0.1, -mv.z);',
    '}'
  ].join(' ');

  var PARTICLE_FSH = [
    'uniform sampler2D map;',
    'uniform vec3 colorFrom;',
    'uniform vec3 colorTo;',
    'uniform float spinSpeed;',
    'uniform float time;',
    'uniform float additive;',
    'uniform sampler2D curve;',
    'varying float vLife;',
    'varying float vId;',
    'void main() {',
    '  float ang = spinSpeed * time + vId * 6.2831853;',
    '  float c = cos(ang);',
    '  float s = sin(ang);',
    '  vec2 uv = gl_PointCoord.xy - 0.5;',
    '  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;',
    '  vec4 texel = texture2D(map, uv);',
    // Cor e opacidade saem da rampa ASSADA (N chaves), moduladas pelo par
    // cor-de/cor-até que a criança escolheu nos campos do bloco.
    '  vec3 ramp = texture2D(curve, vec2(vLife, 0.25)).rgb;',
    '  float fade = texture2D(curve, vec2(vLife, 0.75)).g;',
    '  vec3 col = mix(colorFrom, colorTo, vLife) * ramp * 2.0;',
    '  float alpha = texel.a * fade;',
    // Saída SEMPRE premultiplicada (col*alpha) para casar com o CustomBlending
    // do curso (One / OneMinusSrcAlpha). O que separa fogo de fumaça é o ALPHA
    // de saída, não o material: alpha=0 -> src + dst (soma pura, o glow);
    // alpha>0 -> src + dst*(1-alpha) (cobre o que está atrás, a fumaça).
    '  float outA = additive > 0.5 ? 0.0 : alpha;',
    '  gl_FragColor = vec4(col * alpha, outA);',
    '}'
  ].join(' ');

  /**
   * Curvas de vida PRONTAS. Cada uma é um par de rampas com N chaves em
   * [posição 0..1, valor]: shape = tamanho, fade = opacidade, tint =
   * multiplicador de cor. É o Interpolant do curso, com as chaves escolhidas
   * para os casos que a criança pede pelo NOME (ela não vai autorar curva).
   * O valor 0.5 é o neutro (o shader multiplica por 2).
   */
  var CURVES = {
    // Linear: some devagar, tamanho constante. É a rampa de 2 chaves de antes.
    linear: { shape: [[0, 0.5], [1, 0.5]], fade: [[0, 1], [1, 0]], tint: [[0, 0.5], [1, 0.5]] },
    // Suave: nasce pequeno, incha e some — a faísca "respirando".
    suave: { shape: [[0, 0.15], [0.3, 0.5], [1, 0.05]], fade: [[0, 0], [0.15, 1], [1, 0]], tint: [[0, 0.5], [1, 0.5]] },
    // Pulso: estoura grande na hora e murcha rápido (impacto/explosão).
    pulso: { shape: [[0, 0.6], [0.12, 0.5], [1, 0]], fade: [[0, 1], [0.6, 0.7], [1, 0]], tint: [[0, 0.5], [1, 0.5]] },
    // Fogo: clarão no nascimento e escurece morrendo — o brilho vem da COR
    // (tint>0.5 estoura o bloom no começo e apaga no fim).
    fogo: { shape: [[0, 0.35], [0.25, 0.5], [1, 0.1]], fade: [[0, 1], [0.7, 0.5], [1, 0]], tint: [[0, 0.95], [0.4, 0.55], [1, 0.1]] }
  };
  var CURVE_W = 32;
  var _curveCache = null;

  /** Lê a rampa de chaves na posição t (0..1), interpolando linearmente. */
  function sampleKeys(keys, t) {
    var prev = keys[0];
    for (var i = 1; i < keys.length; i++) {
      var k = keys[i];
      if (t <= k[0]) {
        var span = k[0] - prev[0];
        var f = span > 0.00001 ? (t - prev[0]) / span : 0;
        return prev[1] + (k[1] - prev[1]) * f;
      }
      prev = k;
    }
    return prev[1];
  }

  /**
   * Assa a curva numa DataTexture 32×2 (o toTexture() do curso): a interpolação
   * sai da CPU e vira uma amostra de textura no shader — N chaves pelo preço de
   * uma. Linha 0 = cor (tint nos 3 canais), linha 1 = tamanho (R) e opacidade (G).
   */
  function bakeCurve(name) {
    var k = text(name, 'linear');
    if (!CURVES[k]) k = 'linear';
    if (!_curveCache) _curveCache = {};
    if (_curveCache[k]) return _curveCache[k];
    if (!THREE.DataTexture) return null;
    try {
      var c = CURVES[k];
      var data = new Uint8Array(CURVE_W * 2 * 4);
      for (var x = 0; x < CURVE_W; x++) {
        var t = CURVE_W > 1 ? x / (CURVE_W - 1) : 0;
        var tint = Math.max(0, Math.min(1, sampleKeys(c.tint, t)));
        var shape = Math.max(0, Math.min(1, sampleKeys(c.shape, t)));
        var fade = Math.max(0, Math.min(1, sampleKeys(c.fade, t)));
        var row0 = x * 4;                  // linha 0: COR
        data[row0] = Math.round(tint * 255);
        data[row0 + 1] = Math.round(tint * 255);
        data[row0 + 2] = Math.round(tint * 255);
        data[row0 + 3] = 255;
        var row1 = (CURVE_W + x) * 4;      // linha 1: TAMANHO (R) + OPACIDADE (G)
        data[row1] = Math.round(shape * 255);
        data[row1 + 1] = Math.round(fade * 255);
        data[row1 + 2] = 0;
        data[row1 + 3] = 255;
      }
      var tex = new THREE.DataTexture(data, CURVE_W, 2);
      if (THREE.RGBAFormat != null) tex.format = THREE.RGBAFormat;
      if (THREE.LinearFilter != null) { tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; }
      if (THREE.ClampToEdgeWrapping != null) { tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; }
      tex.needsUpdate = true;
      _curveCache[k] = tex;
      return tex;
    } catch (e) {
      return null;
    }
  }

  /** Círculo suave gerado em canvas 2D (nenhum PNG no kit). */
  function ensureSpriteTex() {
    if (spriteTex) return spriteTex;
    try {
      var cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      var g = cv.getContext('2d');
      if (!g) return null;
      var grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.55)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      spriteTex = new THREE.CanvasTexture(cv);
      return spriteTex;
    } catch (e) {
      return null;
    }
  }

  /**
   * Constrói o efeito (Points + buffers + material) a partir de uma config já
   * resolvida. É o coração comum de "efeito de explosão" (burst) e "emissor
   * contínuo": mudam só os números (taxa, cone, giro, brilho, variâncias).
   */
  function buildEffect(k, cfg) {
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(MAX_PARTICLES_PER_EFFECT * 3);
    var dataArr = new Float32Array(MAX_PARTICLES_PER_EFFECT * 2);
    var posAttr = new THREE.BufferAttribute(positions, 3);
    var dataAttr = new THREE.BufferAttribute(dataArr, 2);
    if (THREE.DynamicDrawUsage != null) {
      posAttr.setUsage(THREE.DynamicDrawUsage);
      dataAttr.setUsage(THREE.DynamicDrawUsage);
    }
    geometry.setAttribute('position', posAttr);
    geometry.setAttribute('particleData', dataAttr);
    // Esfera de recorte fixa e generosa: nunca recalcular por quadro (curso).
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);
    geometry.setDrawRange(0, 0);
    var cf = new THREE.Color(cfg.colorFrom);
    var ct = new THREE.Color(cfg.colorTo);
    var material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: ensureSpriteTex() },
        colorFrom: { value: new THREE.Vector3(cf.r, cf.g, cf.b) },
        colorTo: { value: new THREE.Vector3(ct.r, ct.g, ct.b) },
        sizeFrom: { value: Math.max(0.01, cfg.sizeFrom) },
        sizeTo: { value: Math.max(0, cfg.sizeTo) },
        scaleFactor: { value: config.h * 0.42 },
        spinSpeed: { value: cfg.spin },
        time: { value: 0 },
        additive: { value: cfg.glow ? 1 : 0 },
        curve: { value: bakeCurve(cfg.curve) }
      },
      vertexShader: PARTICLE_VSH,
      fragmentShader: PARTICLE_FSH,
      transparent: true,
      depthWrite: false,
      // Mistura PREMULTIPLICADA (o CustomBlending do curso: One /
      // OneMinusSrcAlpha) em vez de dois modos separados. O fragmento já sai
      // premultiplicado (col*alpha), então UM modo só serve para os dois casos:
      // com alpha=0 o grão só SOMA luz (glow do fogo) e com alpha>0 ele também
      // COBRE o que está atrás (fumaça) — a diferença passa a ser do dado, não
      // do material. Fallback para os modos antigos se o three não expuser os
      // fatores (o stub dos testes não expõe).
      blending:
        THREE.CustomBlending != null && THREE.OneFactor != null && THREE.OneMinusSrcAlphaFactor != null
          ? THREE.CustomBlending
          : (cfg.glow ? THREE.AdditiveBlending : THREE.NormalBlending),
      blendSrc: THREE.OneFactor != null ? THREE.OneFactor : undefined,
      blendDst: THREE.OneMinusSrcAlphaFactor != null ? THREE.OneMinusSrcAlphaFactor : undefined
    });
    var points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    var fx = {
      // Emissão em rajada (burst): quantas soltar por estouro.
      count: cfg.count,
      // Emissão contínua: grãos por segundo (0 = só burst).
      emissionRate: cfg.emissionRate,
      life: cfg.life,
      lifeVar: cfg.lifeVar,
      speed: cfg.speed,
      speedVar: cfg.speedVar,
      cone: cfg.cone,               // meia-abertura do cone em radianos (π = esfera)
      volume: cfg.volume,           // raio de nascimento (positionRadiusVariance)
      gravity: cfg.gravity,
      gravityStrength: cfg.gravityStrength,
      drag: cfg.drag,
      spin: cfg.spin,
      glow: cfg.glow,
      attractors: [],
      geometry: geometry,
      material: material,
      points: points,
      positions: positions,
      dataArr: dataArr,
      particles: [],
      free: []
    };
    if (worldReady && scene) scene.add(points);
    return fx;
  }

  function defineEffect(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o efeito 3D" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    if (effects[k]) disposeEffect(effects[k]);
    try {
      // Explosão: esfera cheia, aditivo (glow), sem emissão contínua, sem giro.
      effects[k] = buildEffect(k, {
        count: Math.max(1, Math.min(MAX_BURST, Math.floor(num(o.count, 24)))),
        emissionRate: 0,
        colorFrom: text(o.colorFrom, '#fb923c'),
        colorTo: text(o.colorTo, '#451a03'),
        sizeFrom: num(o.sizeFrom, 0.5),
        sizeTo: num(o.sizeTo, 0),
        life: Math.max(0.05, num(o.life, 0.8)),
        lifeVar: 0.3,
        speed: Math.max(0.1, num(o.spread, 6)) * 0.7,
        speedVar: 0.43,
        cone: Math.PI,
        volume: 0,
        gravity: num(o.gravity, -9),
        gravityStrength: 1,
        drag: 0.5,
        spin: 0,
        glow: true,
        curve: 'pulso'
      });
    } catch (e) {
      warn('não consegui criar o efeito "' + k + '": ' + e);
    }
  }

  /**
   * Emissor CONTÍNUO (fogo/fumaça/rastro/magia): jorra grãos por segundo num
   * cone, com giro do sprite e brilho opcional. Reusa todo o motor de partículas
   * — só liga a emissão contínua (emissionRate) e o cone/giro. As variâncias
   * (vida/velocidade/volume) são derivadas para o efeito parecer vivo.
   */
  function defineEmitter(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o emissor 3D" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    if (effects[k]) disposeEffect(effects[k]);
    try {
      var coneDeg = Math.max(0, Math.min(180, num(o.cone, 20)));
      var glow = o.glow == null ? true : (o.glow !== false && o.glow !== 'FALSE');
      effects[k] = buildEffect(k, {
        count: 1,
        emissionRate: Math.max(1, num(o.rate, 30)),
        colorFrom: text(o.colorFrom, '#fde047'),
        colorTo: text(o.colorTo, '#7f1d1d'),
        sizeFrom: num(o.sizeFrom, 0.5),
        sizeTo: num(o.sizeTo, 0),
        life: Math.max(0.05, num(o.life, 1)),
        lifeVar: 0.4,
        speed: Math.max(0, num(o.speed, 3)),
        speedVar: 0.3,
        cone: coneDeg * Math.PI / 180,
        volume: Math.max(0, num(o.volume, 0.15)),
        gravity: num(o.gravity, 2),
        gravityStrength: 1,
        drag: 0.5,
        spin: num(o.spin, 1.5),
        glow: glow,
        curve: text(o.curve, 'suave')
      });
    } catch (e) {
      warn('não consegui criar o emissor "' + k + '": ' + e);
    }
  }

  function disposeEffect(fx) {
    try {
      if (fx.points && fx.points.parent) fx.points.parent.remove(fx.points);
      if (fx.geometry && fx.geometry.dispose) fx.geometry.dispose();
      if (fx.material && fx.material.dispose) fx.material.dispose();
    } catch (e) {}
  }

  /** No start: pendura na cena os efeitos definidos antes do mundo existir. */
  function attachEffects() {
    for (var k in effects) {
      var fx = effects[k];
      if (fx.points && !fx.points.parent && scene) scene.add(fx.points);
    }
  }

  /**
   * Nasce UM grão no efeito, num cone em torno de +Y (fx.cone = meia-abertura;
   * π = esfera cheia do burst), com variâncias de vida/velocidade e volume de
   * nascimento. É o emitParticle do curso — compartilhado por burst e emissor.
   */
  function emitOne(fx, ox, oy, oz) {
    if (fx.particles.length >= MAX_PARTICLES_PER_EFFECT) return;
    var p = fx.free.pop() || { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, id: 0 };
    // Posição no volume (positionRadiusVariance) — grãos não saem de um ponto só.
    var pphi = rand() * Math.PI * 2;
    var ptheta = rand() * Math.PI;
    var prad = rand() * fx.volume;
    p.x = ox + Math.sin(ptheta) * Math.cos(pphi) * prad;
    p.y = oy + Math.cos(ptheta) * prad;
    p.z = oz + Math.sin(ptheta) * Math.sin(pphi) * prad;
    // Direção no cone: theta ∈ [0, cone] em volta de +Y.
    var dphi = rand() * Math.PI * 2;
    var dtheta = rand() * fx.cone;
    var speed = fx.speed * (1 + (rand() * 2 - 1) * fx.speedVar);
    p.vx = Math.sin(dtheta) * Math.cos(dphi) * speed;
    p.vy = Math.cos(dtheta) * speed;
    p.vz = Math.sin(dtheta) * Math.sin(dphi) * speed;
    p.life = 0;
    p.maxLife = fx.life * (1 + (rand() * 2 - 1) * fx.lifeVar);
    if (p.maxLife < 0.05) p.maxLife = 0.05;
    p.id = rand();
    fx.particles.push(p);
  }

  function burstAt(name, x, y, z) {
    var fx = effects[text(name, '')];
    if (!fx) {
      warn('o efeito "' + text(name, '') + '" não existe — crie com "Criar o efeito 3D"');
      return;
    }
    var bx = num(x, 0);
    var by = num(y, 1);
    var bz = num(z, 0);
    for (var i = 0; i < fx.count; i++) emitOne(fx, bx, by, bz);
  }

  function burstOn(name, e) {
    if (!isEntity(e)) return;
    burstAt(name, e.mesh.position.x, e.mesh.position.y + 0.5, e.mesh.position.z);
  }

  /** Liga um jorro CONTÍNUO do efeito num ponto fixo do mundo. */
  function startEmitter(effect, x, y, z) {
    var k = text(effect, '');
    var fx = effects[k];
    if (!fx) {
      warn('o efeito "' + k + '" não existe — crie com "Criar o emissor 3D"');
      return;
    }
    emitters[k] = { fx: fx, entity: null, x: num(x, 0), y: num(y, 1), z: num(z, 0), t: 0, active: true };
  }

  /** Liga um jorro CONTÍNUO do efeito seguindo uma entidade (tocha/nave/rastro). */
  function emitterOn(effect, e) {
    var k = text(effect, '');
    var fx = effects[k];
    if (!fx) {
      warn('o efeito "' + k + '" não existe — crie com "Criar o emissor 3D"');
      return;
    }
    if (!isEntity(e)) return;
    emitters[k] = { fx: fx, entity: e, x: 0, y: 0, z: 0, t: 0, active: true };
  }

  function stopEmitter(effect) {
    var em = emitters[text(effect, '')];
    if (em) em.active = false;
  }

  /** Puxa as faíscas do efeito para um ponto (inverso do quadrado, como o curso). */
  function addAttractor(effect, x, y, z, intensity, radius) {
    var fx = effects[text(effect, '')];
    if (!fx) return;
    fx.attractors.push({
      x: num(x, 0), y: num(y, 0), z: num(z, 0),
      intensity: num(intensity, 20),
      radius: Math.max(0.1, num(radius, 5))
    });
  }

  /** A cada quadro: cada jorro ativo solta grãos conforme a sua taxa. */
  function stepEmitters(dt) {
    for (var k in emitters) {
      var em = emitters[k];
      if (!em.active) continue;
      var fx = em.fx;
      if (!fx || fx.emissionRate <= 0) continue;
      var ox, oy, oz;
      if (em.entity) {
        if (!em.entity._alive) { em.active = false; continue; }
        ox = em.entity.mesh.position.x;
        oy = em.entity.mesh.position.y + 0.5;
        oz = em.entity.mesh.position.z;
      } else {
        ox = em.x; oy = em.y; oz = em.z;
      }
      em.t += dt;
      var per = 1 / fx.emissionRate;
      var guard = 0;
      while (em.t >= per && guard < MAX_PARTICLES_PER_EFFECT) {
        em.t -= per;
        emitOne(fx, ox, oy, oz);
        guard++;
      }
    }
  }

  /** Integra e reescreve os buffers (sem alocação por quadro; swap-pop O(1)). */
  function stepParticles(dt) {
    for (var k in effects) {
      var fx = effects[k];
      var list = fx.particles;
      if (fx.material && fx.material.uniforms && fx.material.uniforms.time) {
        fx.material.uniforms.time.value = playTime;
      }
      if (list.length === 0) {
        if (fx.geometry.drawRange && fx.geometry.drawRange.count !== 0) {
          try { fx.geometry.setDrawRange(0, 0); } catch (e) {}
        }
        continue;
      }
      var atts = fx.attractors;
      var dragF = Math.exp(-fx.drag * dt);
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          var last = list.length - 1;
          list[i] = list[last];
          list.pop();
          fx.free.push(p);
          continue;
        }
        // Gravidade (× força) + arrasto exponencial.
        p.vy += fx.gravity * fx.gravityStrength * dt;
        p.vx *= dragF; p.vy *= dragF; p.vz *= dragF;
        // Atratores: puxão inverso-do-quadrado para cada ponto (curso).
        for (var a = 0; a < atts.length; a++) {
          var at = atts[a];
          var ax = at.x - p.x, ay = at.y - p.y, az = at.z - p.z;
          var d = Math.sqrt(ax * ax + ay * ay + az * az);
          if (d > 0.0001) {
            var rr = d / at.radius;
            var f = at.intensity / (1 + rr * rr);
            var inv = f * dt / d;
            p.vx += ax * inv; p.vy += ay * inv; p.vz += az * inv;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }
      writeParticles(fx);
    }
  }

  function writeParticles(fx) {
    var list = fx.particles;
    // Fumaça/névoa (não-aditivo) precisa desenhar do fundo para a frente —
    // ordena por distância à câmera (o depth-sort do curso). Glow (aditivo) não.
    if (!fx.glow && camera && camera.position && list.length > 1) {
      var cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      for (var s = 0; s < list.length; s++) {
        var q = list[s];
        var ddx = q.x - cx, ddy = q.y - cy, ddz = q.z - cz;
        q._sf = ddx * ddx + ddy * ddy + ddz * ddz;
      }
      list.sort(sortByDepth);
    }
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      fx.positions[i * 3] = p.x;
      fx.positions[i * 3 + 1] = p.y;
      fx.positions[i * 3 + 2] = p.z;
      fx.dataArr[i * 2] = p.maxLife > 0 ? p.life / p.maxLife : 1;
      fx.dataArr[i * 2 + 1] = p.id;
    }
    try {
      fx.geometry.attributes.position.needsUpdate = true;
      fx.geometry.attributes.particleData.needsUpdate = true;
      fx.geometry.setDrawRange(0, list.length);
    } catch (e) {}
  }

  function sortByDepth(a, b) { return b._sf - a._sf; }

  function resetParticles() {
    for (var ek in emitters) delete emitters[ek];
    for (var k in effects) {
      var fx = effects[k];
      while (fx.particles.length > 0) fx.free.push(fx.particles.pop());
      fx.attractors.length = 0;
      try { fx.geometry.setDrawRange(0, 0); } catch (e) {}
    }
  }

  // ---- 🎬 Mini-composer próprio (bloom dual-filter do curso + vinheta + ACES) ----
  // O esm.sh embute uma SEGUNDA cópia de three nos addons (instanceof quebra),
  // então nada de EffectComposer/Pass: o quad de tela cheia e o ping-pong de
  // render targets são nossos. Shaders do BloomPass do curso (downsample Karis +
  // upsample tent + composite) portados sem a matriz de cor; o passe final faz
  // vinheta + ACES (Narkowicz) + conversão sRGB — com o composer ligado a cena
  // renderiza LINEAR (NoToneMapping) em HalfFloat.
  var BLOOM_LEVELS = 4;

  var QUAD_VSH = [
    'varying vec2 vUvs;',
    'void main() {',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '  vUvs = uv;',
    '}'
  ].join(' ');

  var COPY_FSH = [
    'uniform sampler2D tDiffuse;',
    'varying vec2 vUvs;',
    'void main() { gl_FragColor = texture2D(tDiffuse, vUvs); }'
  ].join(' ');

  var DOWNSAMPLE_FSH = [
    'uniform sampler2D frameTexture;',
    'uniform bool useKaris;',
    'uniform vec2 resolution;',
    'varying vec2 vUvs;',
    'float Luminance(vec4 c) { return max(1.0, dot(c.xyz, vec3(0.2627, 0.6780, 0.0593))); }',
    'vec4 KarisAverage(vec4 s1, vec4 s2, vec4 s3, vec4 s4) {',
    '  float w1 = 1.0 / Luminance(s1);',
    '  float w2 = 1.0 / Luminance(s2);',
    '  float w3 = 1.0 / Luminance(s3);',
    '  float w4 = 1.0 / Luminance(s4);',
    '  float totalWeight = 1.0 / (w1 + w2 + w3 + w4);',
    '  return (s1 * w1 + s2 * w2 + s3 * w3 + s4 * w4) * totalWeight;',
    '}',
    'void main() {',
    '  vec2 texelSize = 1.0 / resolution;',
    '  vec4 A = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, -1.0));',
    '  vec4 B = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, -1.0));',
    '  vec4 C = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, -1.0));',
    '  vec4 D = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, -0.5));',
    '  vec4 E = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, -0.5));',
    '  vec4 F = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 0.0));',
    '  vec4 G = texture2D(frameTexture, vUvs);',
    '  vec4 H = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 0.0));',
    '  vec4 I = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, 0.5));',
    '  vec4 J = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, 0.5));',
    '  vec4 K = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 1.0));',
    '  vec4 L = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, 1.0));',
    '  vec4 M = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 1.0));',
    '  vec2 div = vec2(0.5, 0.125);',
    '  vec4 colour = vec4(0.0);',
    '  if (useKaris) {',
    '    colour = KarisAverage(D, E, I, J) * div.x;',
    '    colour += KarisAverage(A, B, G, F) * div.y;',
    '    colour += KarisAverage(B, C, H, G) * div.y;',
    '    colour += KarisAverage(F, G, L, K) * div.y;',
    '    colour += KarisAverage(G, H, M, L) * div.y;',
    '  } else {',
    '    div *= 0.25;',
    '    colour = (D + E + I + J) * div.x;',
    '    colour += (A + B + G + F) * div.y;',
    '    colour += (B + C + H + G) * div.y;',
    '    colour += (F + G + L + K) * div.y;',
    '    colour += (G + H + M + L) * div.y;',
    '  }',
    '  gl_FragColor = colour;',
    '}'
  ].join(' ');

  var UPSAMPLE_FSH = [
    'uniform sampler2D frameTexture;',
    'uniform sampler2D mipTexture;',
    'uniform vec2 resolution;',
    'varying vec2 vUvs;',
    'void main() {',
    '  float x = 1.0 / resolution.x;',
    '  float y = 1.0 / resolution.y;',
    '  vec4 a = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y + y));',
    '  vec4 b = texture2D(frameTexture, vec2(vUvs.x, vUvs.y + y));',
    '  vec4 c = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y + y));',
    '  vec4 d = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y));',
    '  vec4 e = texture2D(frameTexture, vec2(vUvs.x, vUvs.y));',
    '  vec4 f = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y));',
    '  vec4 g = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y - y));',
    '  vec4 h = texture2D(frameTexture, vec2(vUvs.x, vUvs.y - y));',
    '  vec4 i = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y - y));',
    '  vec4 colour = e * 4.0;',
    '  colour += (b + d + f + h) * 2.0;',
    '  colour += (a + c + g + i);',
    '  colour *= 1.0 / 16.0;',
    '  colour += texture2D(mipTexture, vUvs);',
    '  gl_FragColor = colour;',
    '}'
  ].join(' ');

  var COMPOSITE_FSH = [
    'uniform sampler2D frameTexture;',
    'uniform sampler2D bloomTexture;',
    'uniform float bloomStrength;',
    'uniform float bloomMix;',
    'varying vec2 vUvs;',
    'void main() {',
    '  vec4 textureSample = texture2D(frameTexture, vUvs);',
    '  vec4 bloomSample = texture2D(bloomTexture, vUvs);',
    '  gl_FragColor = mix(textureSample, bloomStrength * bloomSample, bloomMix);',
    '}'
  ].join(' ');

  var FINAL_FSH = [
    'uniform sampler2D tDiffuse;',
    'uniform float intensity;',
    'uniform float dropoff;',
    'varying vec2 vUvs;',
    'float inverseLerp(float v, float minValue, float maxValue) {',
    '  return (v - minValue) / (maxValue - minValue);',
    '}',
    'float remap(float v, float inMin, float inMax, float outMin, float outMax) {',
    '  float t = inverseLerp(v, inMin, inMax);',
    '  return mix(outMin, outMax, t);',
    '}',
    'float vignette(vec2 uvs) {',
    '  float v1 = smoothstep(0.5, 0.3, abs(uvs.x - 0.5));',
    '  float v2 = smoothstep(0.5, 0.3, abs(uvs.y - 0.5));',
    '  float v = v1 * v2;',
    '  v = pow(v, dropoff);',
    '  v = remap(v, 0.0, 1.0, intensity, 1.0);',
    '  return v;',
    '}',
    /* ACES EXATO do three.js (RRTAndODTFit + matrizes in/out, com /0.6 de
       exposição) — a MESMA curva do ACESFilmicToneMapping do caminho direto e do
       OutputPass do curso. Assim ligar/desligar bloom/vinheta NÃO desloca a cor
       da imagem inteira (o furo de consistência do review). mat3 é column-major:
       cada trinca é uma COLUNA, igual ao three. */
    'vec3 RRTAndODTFit(vec3 v) {',
    '  vec3 a = v * (v + 0.0245786) - 0.000090537;',
    '  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;',
    '  return a / b;',
    '}',
    'vec3 aces(vec3 color) {',
    '  mat3 mIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);',
    '  mat3 mOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);',
    '  color *= 1.0 / 0.6;',
    '  color = mIn * color;',
    '  color = RRTAndODTFit(color);',
    '  color = mOut * color;',
    '  return clamp(color, 0.0, 1.0);',
    '}',
    'void main() {',
    '  vec4 texel = texture2D(tDiffuse, vUvs);',
    '  vec3 col = texel.xyz * vignette(vUvs);',
    '  col = aces(col);',
    '  col = pow(col, vec3(0.4545));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join(' ');

  function makeTarget(w, h) {
    return new THREE.WebGLRenderTarget(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), {
      type: THREE.HalfFloatType,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false
    });
  }

  function quadMaterial(fsh, uniforms) {
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: QUAD_VSH,
      fragmentShader: fsh,
      depthTest: false,
      depthWrite: false
    });
  }

  function initComposer() {
    if (composer || composerFailed) return;
    try {
      var quadScene = new THREE.Scene();
      var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      var quadGeo = new THREE.PlaneGeometry(2, 2);
      var quadMesh = new THREE.Mesh(quadGeo, null);
      quadScene.add(quadMesh);

      // Alvo da cena com DEPTH (o mundo 3D precisa dele); os da cascata não.
      var rtScene = new THREE.WebGLRenderTarget(config.w, config.h, {
        type: THREE.HalfFloatType,
        magFilter: THREE.LinearFilter,
        minFilter: THREE.LinearFilter,
        depthBuffer: true,
        stencilBuffer: false
      });
      var rtGrade = makeTarget(config.w, config.h);
      var down = [null];
      var up = [null];
      for (var i = 1; i <= BLOOM_LEVELS; i++) {
        var scaleDiv = Math.pow(2, i);
        down.push(makeTarget(config.w / scaleDiv, config.h / scaleDiv));
        up.push(makeTarget(config.w / scaleDiv, config.h / scaleDiv));
      }

      var matCopy = quadMaterial(COPY_FSH, { tDiffuse: { value: null } });
      var matDown = quadMaterial(DOWNSAMPLE_FSH, {
        frameTexture: { value: null },
        useKaris: { value: false },
        resolution: { value: new THREE.Vector2(1, 1) }
      });
      var matUp = quadMaterial(UPSAMPLE_FSH, {
        frameTexture: { value: null },
        mipTexture: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) }
      });
      var matComposite = quadMaterial(COMPOSITE_FSH, {
        frameTexture: { value: null },
        bloomTexture: { value: null },
        bloomStrength: { value: config.bloomStrength },
        bloomMix: { value: 0.08 }
      });
      var matFinal = quadMaterial(FINAL_FSH, {
        tDiffuse: { value: null },
        intensity: { value: 0.35 },
        dropoff: { value: 0.35 }
      });

      composer = {
        quadScene: quadScene,
        quadCam: quadCam,
        quadGeo: quadGeo,
        quadMesh: quadMesh,
        rtScene: rtScene,
        rtGrade: rtGrade,
        down: down,
        up: up,
        matCopy: matCopy,
        matDown: matDown,
        matUp: matUp,
        matComposite: matComposite,
        matFinal: matFinal
      };
    } catch (e) {
      composerFailed = true;
      composer = null;
      warn('efeitos de cinema indisponíveis neste computador — seguindo sem eles: ' + e);
    }
  }

  function quadPass(material, target) {
    composer.quadMesh.material = material;
    renderer.setRenderTarget(target);
    renderer.render(composer.quadScene, composer.quadCam);
  }

  function renderWithComposer() {
    var c = composer;
    // Cena em LINEAR (o ACES roda no passe final).
    if (THREE.NoToneMapping != null) renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(c.rtScene);
    renderer.render(scene, camera);

    var graded = c.rtScene;
    if (config.bloom) {
      // Cascata para baixo (Karis no primeiro nível, contra vagalumes).
      var src = c.rtScene;
      for (var i = 1; i <= BLOOM_LEVELS; i++) {
        c.matDown.uniforms.frameTexture.value = src.texture;
        c.matDown.uniforms.useKaris.value = i === 1;
        c.matDown.uniforms.resolution.value.set(src.width, src.height);
        quadPass(c.matDown, c.down[i]);
        src = c.down[i];
      }
      // Semente do caminho de volta + cascata para cima (tent 3×3 + mip).
      c.matCopy.uniforms.tDiffuse.value = c.down[BLOOM_LEVELS].texture;
      quadPass(c.matCopy, c.up[BLOOM_LEVELS]);
      for (var j = BLOOM_LEVELS - 1; j >= 1; j--) {
        c.matUp.uniforms.frameTexture.value = c.up[j + 1].texture;
        c.matUp.uniforms.mipTexture.value = c.down[j + 1].texture;
        c.matUp.uniforms.resolution.value.set(c.up[j + 1].width, c.up[j + 1].height);
        quadPass(c.matUp, c.up[j]);
      }
      c.matComposite.uniforms.frameTexture.value = c.rtScene.texture;
      c.matComposite.uniforms.bloomTexture.value = c.up[1].texture;
      c.matComposite.uniforms.bloomStrength.value = config.bloomStrength;
      quadPass(c.matComposite, c.rtGrade);
      graded = c.rtGrade;
    }
    // Passe final SEMPRE roda no caminho do composer: vinheta (intensity 1 =
    // desligada) + ACES + sRGB, direto na tela.
    c.matFinal.uniforms.tDiffuse.value = graded.texture;
    c.matFinal.uniforms.intensity.value = config.vignette ? 0.35 : 1.0;
    quadPass(c.matFinal, null);
  }

  function disposeComposer() {
    var c = composer;
    if (!c) return;
    composer = null;
    try {
      var all = [c.rtScene, c.rtGrade].concat(c.down.slice(1)).concat(c.up.slice(1));
      for (var i = 0; i < all.length; i++) {
        if (all[i] && all[i].dispose) all[i].dispose();
      }
      var mats = [c.matCopy, c.matDown, c.matUp, c.matComposite, c.matFinal];
      for (var m = 0; m < mats.length; m++) {
        if (mats[m] && mats[m].dispose) mats[m].dispose();
      }
      if (c.quadGeo && c.quadGeo.dispose) c.quadGeo.dispose();
    } catch (e) {}
  }

  function renderFrame() {
    if ((config.bloom || config.vignette) && !composerFailed) {
      if (!composer) initComposer();
      if (composer) {
        renderWithComposer();
        return;
      }
    }
    // Caminho direto (efeitos desligados ou indisponíveis): ACES do renderer.
    if (THREE.ACESFilmicToneMapping != null) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  // ---- Câmera viva (um modo por vez) ----

  function setOrbit(dist) {
    camMode = { kind: 'orbit', target: null, dist: Math.max(2, num(dist, 25)), height: 0, pivot: camMode.pivot };
    if (!orbit) {
      var st = { az: 0.7, el: 0.5, dist: camMode.dist, dragging: false, px: 0, py: 0 };
      orbit = st;
      if (canvasEl && canvasEl.addEventListener) {
        canvasEl.addEventListener('pointerdown', function (ev) {
          resumeAudio();
          st.dragging = true;
          st.px = ev.clientX || 0;
          st.py = ev.clientY || 0;
        });
        canvasEl.addEventListener('wheel', function (ev) {
          if (camMode.kind !== 'orbit') return;
          st.dist += ev.deltaY > 0 ? 2 : -2;
          if (st.dist < 3) st.dist = 3;
          if (st.dist > config.world * 2) st.dist = config.world * 2;
        });
        window.addEventListener('pointermove', function (ev) {
          if (!st.dragging || camMode.kind !== 'orbit') return;
          var cx = ev.clientX || 0;
          var cy = ev.clientY || 0;
          st.az -= (cx - st.px) * 0.01;
          st.el += (cy - st.py) * 0.01;
          if (st.el > 1.4) st.el = 1.4;
          if (st.el < 0.08) st.el = 0.08;
          st.px = cx;
          st.py = cy;
        });
        window.addEventListener('pointerup', function () { st.dragging = false; });
      }
    }
    orbit.dist = camMode.dist;
  }

  // ---- 🎥 A câmera na mão da criança (girar/afastar/tremer/lente/olhar) ----

  /** Gira e inclina a órbita POR CÓDIGO (antes só o arrastar do mouse mexia). */
  function cameraAngle(azDeg, elDeg) {
    if (!orbit) setOrbit(camMode.dist);
    if (!orbit) return;
    orbit.az = num(azDeg, 40) * Math.PI / 180;
    var el = num(elDeg, 28) * Math.PI / 180;
    // Mesmos limites do arrastar: nem por baixo do chão, nem no zênite (onde a
    // câmera perde a noção de "para cima" e a base do WASD degenera).
    if (el > 1.4) el = 1.4;
    if (el < 0.08) el = 0.08;
    orbit.el = el;
  }
  /** Afasta/aproxima — vale para a órbita E para a que segue. */
  function cameraDistance(d) {
    var v = Math.max(1, num(d, 25));
    camMode.dist = v;
    if (orbit) orbit.dist = v;
  }
  /** Tremor de impacto: força em metros, por N segundos. */
  function cameraShake(strength, seconds) {
    _shakeAmp = Math.max(0, num(strength, 0.5));
    _shakeT = Math.max(0, num(seconds, 0.3));
    _shakeMax = _shakeT || 1;
  }
  /** Lente: campo de visão em graus (era o literal 60). */
  function cameraLens(deg) {
    if (!camera) return;
    camera.fov = Math.max(15, Math.min(120, num(deg, 60)));
    if (camera.updateProjectionMatrix) camera.updateProjectionMatrix();
  }
  /**
   * Para onde a órbita/a de cima OLHAM. Antes era o (0,0,0) do mundo, cravado:
   * num mundo grande, a criança não tinha como olhar para longe da origem.
   */
  function cameraLookAt(target) {
    if (isEntity(target)) { camMode.pivot = target; return; }
    camMode.pivot = null;
  }
  function cameraLookAtPoint(x, y, z) {
    camMode.pivot = { x: num(x, 0), y: num(y, 0), z: num(z, 0) };
  }
  /** Suavidade do seguir (era a constante 3): maior = mais colada. */
  function cameraSmooth(lambda) {
    camSmooth = Math.max(0.1, num(lambda, 3));
  }

  /** O ponto que a câmera olha: entidade viva, ponto fixo, ou a origem. */
  function pivotInto(v) {
    var p = camMode.pivot;
    if (p && p.mesh) {
      if (isEntity(p)) { v.set(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z); return; }
      camMode.pivot = null; // o alvo morreu: volta à origem
      v.set(0, 0, 0);
      return;
    }
    if (p) { v.set(p.x, p.y, p.z); return; }
    v.set(0, 0, 0);
  }

  /**
   * Tremor: offset DEPOIS de posicionar, para não corromper o camMode (senão o
   * lerp do seguir perseguiria a própria tremedeira). Usa rand(), então a semente
   * continua valendo — mesma partida, mesmo tremor.
   */
  function applyShake(dt) {
    if (_shakeT <= 0) return;
    _shakeT -= dt;
    if (_shakeT < 0) _shakeT = 0;
    var k = _shakeAmp * (_shakeT / _shakeMax); // decai até sumir
    camera.position.x += (rand() * 2 - 1) * k;
    camera.position.y += (rand() * 2 - 1) * k;
    camera.position.z += (rand() * 2 - 1) * k;
  }

  // ---- Mira & clique no mundo (raycast) + câmera 1ª pessoa ----
  function ensureRay() {
    if (_ray) return true;
    if (!THREE.Raycaster || !THREE.Vector3) return false;
    _ray = new THREE.Raycaster();
    return true;
  }
  /** Rastreia o ponteiro em coordenadas normalizadas (-1..1) sobre o canvas. */
  function ensurePointer() {
    if (_pickWired) return;
    _pickWired = true;
    _mouse = { x: 0, y: 0 };
    var upd = function (ev) {
      var rect = canvasEl && canvasEl.getBoundingClientRect
        ? canvasEl.getBoundingClientRect()
        : { left: 0, top: 0, width: 1, height: 1 };
      var cx = typeof ev.clientX === 'number' ? ev.clientX : 0;
      var cy = typeof ev.clientY === 'number' ? ev.clientY : 0;
      _mouse.x = ((cx - rect.left) / (rect.width || 1)) * 2 - 1;
      _mouse.y = -((cy - rect.top) / (rect.height || 1)) * 2 + 1;
    };
    window.addEventListener('pointermove', upd);
    window.addEventListener('pointerdown', upd);
  }
  /** Sobe pelos pais do objeto atingido até achar a entidade viva dona dele. */
  function entityOfMesh(obj) {
    var o = obj;
    while (o) {
      if (o.userData && o.userData.szEntity && o.userData.szEntity._alive === true) {
        return o.userData.szEntity;
      }
      o = o.parent;
    }
    return null;
  }
  /** Sem o loop rodando, matrixWorld fica defasado — atualiza antes de mirar. */
  function syncMatrices() {
    if (camera && camera.updateMatrixWorld) camera.updateMatrixWorld();
    if (scene && scene.updateMatrixWorld) scene.updateMatrixWorld(true);
  }
  /** A entidade (do molde, se dado) sob o mouse — ou null. */
  function pickAtMouse(mold) {
    if (!worldReady || !camera || !ensureRay()) return null;
    ensurePointer();
    syncMatrices();
    _ray.setFromCamera(_mouse, camera);
    var hits = _ray.intersectObjects(scene.children, true);
    var want = text(mold, '');
    for (var i = 0; i < hits.length; i++) {
      var e = entityOfMesh(hits[i].object);
      if (e && (!want || e._mold === want)) return e;
    }
    return null;
  }
  /** O mouse está sobre esta entidade? */
  function pointerOverEntity(e) {
    if (!isEntity(e) || !worldReady || !camera || !ensureRay()) return false;
    ensurePointer();
    syncMatrices();
    _ray.setFromCamera(_mouse, camera);
    var hits = _ray.intersectObjects([e.mesh], true);
    return hits.length > 0;
  }
  /** O ponto do chão (plano y=0) sob o mouse, no eixo pedido. */
  function groundPoint(axis) {
    if (!worldReady || !camera || !ensureRay()) return 0;
    ensurePointer();
    syncMatrices();
    _ray.setFromCamera(_mouse, camera);
    var ro = _ray.ray && _ray.ray.origin;
    var rd = _ray.ray && _ray.ray.direction;
    if (!ro || !rd || Math.abs(rd.y) < 0.000001) return 0;
    var t = -ro.y / rd.y;
    if (t < 0) return 0;
    var a = text(axis, 'x');
    if (a === 'y') return ro.y + rd.y * t;
    if (a === 'z') return ro.z + rd.z * t;
    return ro.x + rd.x * t;
  }
  /** Câmera em 1ª pessoa presa à entidade; olhar com o mouse (pointer-lock). */
  function cameraFps(e, height) {
    if (!isEntity(e)) {
      warn('"Câmera em 1ª pessoa" precisa de uma entidade');
      return;
    }
    var h = num(height, 1.4);
    camMode = {
      kind: 'fps',
      target: e,
      dist: 0,
      height: h,
      yaw: e.mesh ? e.mesh.rotation.y : 0,
      pitch: 0
    };
    ensureFpsLook();
  }
  function ensureFpsLook() {
    if (_fpsWired) return;
    _fpsWired = true;
    if (canvasEl && canvasEl.addEventListener) {
      canvasEl.addEventListener('click', function () {
        if (camMode.kind === 'fps' && canvasEl.requestPointerLock) {
          try { canvasEl.requestPointerLock(); } catch (err) {}
        }
      });
    }
    window.addEventListener('mousemove', function (ev) {
      if (camMode.kind !== 'fps') return;
      if (typeof document !== 'undefined' && document.pointerLockElement !== canvasEl) return;
      camMode.yaw -= (ev.movementX || 0) * 0.0025;
      camMode.pitch -= (ev.movementY || 0) * 0.0025;
      if (camMode.pitch > 1.4) camMode.pitch = 1.4;
      if (camMode.pitch < -1.4) camMode.pitch = -1.4;
      // O corpo vira junto no eixo Y — mover em 1ª pessoa e o olhar batem.
      if (isEntity(camMode.target) && camMode.target.mesh) {
        camMode.target.mesh.rotation.y = camMode.yaw;
      }
    });
  }
  /**
   * Anda a entidade em 1ª pessoa: WASD/setas relativos ao olhar.
   *
   * É a MESMA base do WASD comum — em 1ª pessoa a câmera são os olhos dela, então
   * "para onde a câmera olha" e "para onde ela olha" são a mesma coisa. Achatar em
   * XZ é de propósito: olhar para cima e andar não faz ninguém voar.
   */
  function moveFps(e, speed) {
    if (!isEntity(e)) return;
    moveOnCamBasis(e, num(speed, 6));
  }

  function updateCamera(dt) {
    if (!camera) return;
    if (camMode.kind === 'fps') {
      var f = camMode.target;
      if (!isEntity(f)) return;
      var px = f.mesh.position.x;
      var py = f.mesh.position.y + camMode.height;
      var pz = f.mesh.position.z;
      camera.position.set(px, py, pz);
      var cp = Math.cos(camMode.pitch);
      // Olha ao longo do +Z do corpo (o ensureFpsLook escreve rotation.y = yaw).
      // Era -sin/-cos: a câmera olhava para um lado e o corpo apontava para o
      // outro, então o tiro de spawnFrom+moveForward saía PELAS COSTAS.
      camera.lookAt(
        px + Math.sin(camMode.yaw) * cp,
        py + Math.sin(camMode.pitch),
        pz + Math.cos(camMode.yaw) * cp
      );
      applyShake(dt);
      return;
    }
    if (camMode.kind === 'orbit' && orbit) {
      var ce = Math.cos(orbit.el);
      pivotInto(_tv2);
      camera.position.set(
        _tv2.x + orbit.dist * ce * Math.sin(orbit.az),
        _tv2.y + orbit.dist * Math.sin(orbit.el),
        _tv2.z + orbit.dist * ce * Math.cos(orbit.az)
      );
      camera.lookAt(_tv2.x, _tv2.y, _tv2.z);
      applyShake(dt);
      return;
    }
    if (camMode.kind === 'top') {
      pivotInto(_tv2);
      // O epsilon em Z tira a câmera do zênite exato: sem ele o "para cima" da
      // câmera fica indefinido (gimbal) e a base do WASD não teria para onde
      // apontar. É ele que faz o topo da tela ser -Z.
      camera.position.set(_tv2.x, _tv2.y + camMode.height, _tv2.z + camMode.height * 0.001 + 0.01);
      camera.lookAt(_tv2.x, _tv2.y, _tv2.z);
      applyShake(dt);
      return;
    }
    if (camMode.kind === 'follow') {
      var t = camMode.target;
      if (!isEntity(t)) return;
      // Atrás do alvo (pela frente dele) com amortecimento exponencial.
      _tv1.set(0, 0, 1).applyQuaternion(t.mesh.quaternion);
      _tv1.y = 0;
      if (!(_tv1.lengthSq() > 0.000001)) _tv1.set(0, 0, 1);
      _tv1.normalize();
      _tv2.copy(t.mesh.position)
        .addScaledVector(_tv1, -camMode.dist);
      _tv2.y = t.mesh.position.y + camMode.height;
      var a = 1 - Math.exp(-camSmooth * (dt > 0 ? dt : 0.016));
      camera.position.lerp(_tv2, a);
      camera.lookAt(t.mesh.position.x, t.mesh.position.y + 1, t.mesh.position.z);
      applyShake(dt);
    }
  }

  // ---- Laço do jogo (delta-time clampado; a pausa congela o mundo) ----

  function runHooks(list, arg, label) {
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      try {
        fn(arg);
      } catch (e) {
        if (!fn.__szg3kWarned) {
          fn.__szg3kWarned = true;
          warn('erro no "' + label + '": ' + e);
        }
      }
    }
  }

  var _lastT = 0;
  function gameLoop(t) {
    var nowT = typeof t === 'number' ? t : 0;
    var dt = _lastT ? (nowT - _lastT) / 1000 : 0;
    _lastT = nowT;
    if (!(dt >= 0)) dt = 0;
    // Clamp do curso (1/30): aba em segundo plano não teleporta o jogo e a
    // colisão por distância não atravessa ninguém.
    if (dt > 1 / 30) dt = 1 / 30;
    currentDt = dt;
    if (state === 'jogando') {
      // stepSystems também dentro de try/catch (como o renderFrame): um erro
      // fora dos ganchos guardados não pode escapar do gameLoop e congelar o rAF.
      try {
        stepSystems(dt);
      } catch (e) {
        if (!stepSystems.__szg3kWarned) {
          stepSystems.__szg3kWarned = true;
          warn('erro nos sistemas do jogo: ' + e);
        }
      }
      // Um gancho pode ter terminado o jogo NESTE quadro — não rodar o update
      // da criança num jogo que acabou de acabar.
      if (state === 'jogando') runHooks(updateHooks, dt, 'A cada quadro');
    }
    updateCamera(state === 'jogando' ? dt : 0);
    // Depois da câmera (a projeção precisa dela já posicionada) e com dt=0 fora do
    // jogo: na pausa o balão FICA na tela, mas não gasta o tempo dele.
    stepSays(state === 'jogando' ? dt : 0);
    try {
      renderFrame();
    } catch (e) {
      warn('erro ao desenhar o mundo: ' + e);
      renderer.setAnimationLoop(null);
    }
    justPressed = {};
  }

  function stepSystems(dt) {
    playTime += dt;
    stepTimer(dt);
    for (var i = 0; i < spawners.length; i++) {
      var sp = spawners[i];
      sp.timer += dt;
      while (sp.timer >= sp.interval && sp.interval > 0) {
        sp.timer -= sp.interval;
        spawnFromSpawner(sp);
      }
    }
    // Sem plataforma móvel no jogo, UMA passada — a ordem dos ganchos entre
    // moldes fica exatamente a de antes. Com plataforma, as CARREGADORAS andam
    // primeiro (passo A) para o passageiro somar o deslocamento certo no mesmo
    // quadro; senão ele fica um quadro atrás e escorrega visivelmente.
    if (anyCarrier) {
      stepPools(dt, 1);
      stepPools(dt, 2);
    } else {
      stepPools(dt, 0);
    }
    // As faíscas só andam em 'jogando' — a pausa congela tudo, como no curso.
    stepEmitters(dt);
    stepParticles(dt);
  }

  /** phase: 0 = tudo · 1 = só carregadoras (sólido que anda) · 2 = o resto. */
  function stepPools(dt, phase) {
    for (var pk in pools) {
      if (phase) {
        var m = molds[pk];
        var carrier = !!(m && m.solid && m.speed !== 0);
        if (phase === 1 && !carrier) continue;
        if (phase === 2 && carrier) continue;
      }
      var pool = pools[pk];
      pool._sweeping++;
      for (var eI = pool.active.length - 1; eI >= 0; eI--) {
        var e = pool.active[eI];
        // Tolera encolhimento: uma varredura aninhada do gancho pôde compactar.
        if (!e || !e._alive) continue;
        stepEntity(e, dt);
      }
      pool._sweeping--;
      if (pool._sweeping === 0) compact(pool);
    }
  }

  // ---- 💬 Caixa de fala (o balão ancorado na entidade) ----

  /**
   * Fala presa a uma entidade. É a primeira coisa do kit que mistura DOM com o
   * mundo 3D: o balão é um div e a entidade é um ponto no espaço, então a posição
   * dela é PROJETADA na tela a cada quadro (senão o balão não acompanha a câmera).
   * Sem isso, um RPG/aventura 3D não conta história — só dava HUD nos cantos.
   */
  var says = [];
  function say(e, textValue, seconds) {
    if (!isEntity(e) || !ensureShell()) return;
    hideSay(e); // uma fala por entidade: a nova troca a antiga
    var el = document.createElement('div');
    el.className = 'szg3k-say';
    el.textContent = text(textValue, '');
    hudLayer.appendChild(el);
    says.push({ e: e, gen: e._gen, el: el, left: Math.max(0.1, num(seconds, 2)) });
  }
  function hideSay(e) {
    for (var i = says.length - 1; i >= 0; i--) {
      if (says[i].e !== e) continue;
      if (says[i].el.parentNode) says[i].el.parentNode.removeChild(says[i].el);
      says.splice(i, 1);
    }
  }
  function clearSays() {
    for (var i = 0; i < says.length; i++) {
      if (says[i].el.parentNode) says[i].el.parentNode.removeChild(says[i].el);
    }
    says.length = 0;
  }
  /** Projeta a cabeça da entidade na tela e move o balão para lá. */
  function stepSays(dt) {
    if (!says.length || !camera || !canvasEl) return;
    var m = null;
    for (var i = says.length - 1; i >= 0; i--) {
      var s = says[i];
      s.left -= dt;
      // Entidade recolhida (ou o slot reusado por outra): o balão vai junto.
      if (s.left <= 0 || !s.e._alive || s.e._gen !== s.gen) {
        if (s.el.parentNode) s.el.parentNode.removeChild(s.el);
        says.splice(i, 1);
        continue;
      }
      m = molds[s.e._mold];
      _tv1.set(s.e.mesh.position.x, s.e.mesh.position.y + (m ? m.top : 1) + 0.4, s.e.mesh.position.z);
      _tv1.project(camera);
      // Atrás da câmera (z>1): esconde em vez de desenhar espelhado na frente.
      if (_tv1.z > 1) { s.el.style.display = 'none'; continue; }
      s.el.style.display = '';
      s.el.style.left = ((_tv1.x * 0.5 + 0.5) * 100) + '%';
      s.el.style.top = ((-_tv1.y * 0.5 + 0.5) * 100) + '%';
    }
  }

  // ---- 🎲 Sorteio (semeado) + ⏱️ Cronômetro ----

  /**
   * ⭐ O sorteio DO KIT — passa pelo rand(), então a semente vale de verdade.
   * O kit não tinha sorteio nenhum: a criança usava o bloco do NÚCLEO, que emite
   * Math.random() puro e IGNORA a semente. Ou seja, o "mesma semente = mesma
   * partida" que o setSeed promete só era verdade para o acaso interno (enfeites,
   * partículas, fábricas). Com estes dois a promessa fecha.
   */
  function randomBetween(a, b) {
    var lo = num(a, 0);
    var hi = num(b, 1);
    if (lo > hi) { var t = lo; lo = hi; hi = t; }
    return lo + rand() * (hi - lo);
  }
  function randomChance(percent) {
    return rand() * 100 < num(percent, 50);
  }

  // Cronômetro da criança (corrida contra o tempo, bomba, tempo de fase). O de
  // dentro do motor (stateTimer/fábrica) é outro — este é dela.
  var _timer = { left: 0, on: false };
  var timerHooks = [];
  function startTimer(seconds) {
    _timer.left = Math.max(0, num(seconds, 30));
    _timer.on = _timer.left > 0;
  }
  function timeLeft() { return _timer.left; }
  function stopTimer() { _timer.on = false; }
  function onTimerEnd(fn) {
    if (typeof fn === 'function') timerHooks.push(fn);
  }
  /** Só corre em 'jogando' (o stepSystems), então a pausa CONGELA — como o resto. */
  function stepTimer(dt) {
    if (!_timer.on) return;
    _timer.left -= dt;
    if (_timer.left > 0) return;
    _timer.left = 0;
    _timer.on = false;
    runHooks(timerHooks, 0, 'quando o tempo acabar');
  }

  // ---- 📢 Event bus ----

  function onEvent(name, fn) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    (listeners[k] || (listeners[k] = [])).push(fn);
  }

  function emit(name) {
    var list = listeners[text(name, '')];
    if (!list) return;
    var extra = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < list.length; i++) {
      try { list[i].apply(null, extra); } catch (e) { warn('erro no "quando chegar o aviso": ' + e); }
    }
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

  /**
   * 🎵 Música de fundo. O motor não tinha UM .loop sequer — só efeito de
   * tiro-e-esquece —, então música de fundo era literalmente impossível. Toca UMA
   * de cada vez (pedir outra troca), que é o que a criança espera de "a música do
   * jogo".
   */
  var _music = null;
  function playMusic(name) {
    var k = text(name, '');
    var a = sounds[k];
    if (!a) { warnOnce('mus:' + k, 'a música "' + k + '" não está no projeto (importe em "Imagens e sons")'); return; }
    if (_music === a) return; // já é esta: não recomeça do zero
    stopMusic();
    _music = a;
    try {
      a.loop = true;
      a.currentTime = 0;
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function () {});
    } catch (e) {}
  }
  function stopMusic() {
    if (!_music) return;
    try { _music.pause(); _music.currentTime = 0; _music.loop = false; } catch (e) {}
    _music = null;
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

  /** Acorda o áudio no primeiro GESTO (Safari/iPad exigem resume no gesto). */
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
      osc.connect(gain);
      gain.connect(ac.destination);
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

  // ---- Começar (carregar -> menu -> input -> resize -> loop) ----

  function start() {
    if (started) {
      warn('o jogo já começou — use "Começar o jogo" uma vez só');
      return;
    }
    if (!ensureShell()) {
      try {
        document.addEventListener('DOMContentLoaded', function () { start(); });
      } catch (e) {}
      return;
    }
    if (!initWorld()) return;
    attachEffects();
    started = true;
    bindInput();
    resizeCanvas();
    window.addEventListener('resize', function () { resizeCanvas(); });
    setState('carregando');
    Promise.all(pending.slice()).then(function () {
      setState('menu');
      _lastT = 0;
      renderer.setAnimationLoop(gameLoop);
    });
  }

  // ---- Dispose (higiene de GPU — o preview recria o iframe a cada Atualizar) ----

  var disposed = false;
  function disposeAll() {
    if (disposed) return;
    disposed = true;
    try {
      if (renderer) {
        renderer.setAnimationLoop(null);
        try { renderer.dispose(); } catch (e) {}
        // dispose() sozinho NÃO devolve o contexto WebGL ao navegador — é o
        // forceContextLoss() que libera o slot e evita a cena preta depois de
        // vários "Atualizar".
        try { renderer.forceContextLoss(); } catch (e) {}
      }
      if (scene && scene.traverse) {
        scene.traverse(function (o) {
          if (o.geometry && o.geometry.dispose) { try { o.geometry.dispose(); } catch (e) {} }
          if (o.material) {
            var m = o.material;
            if (m.length) { for (var i = 0; i < m.length; i++) { if (m[i] && m[i].dispose) { try { m[i].dispose(); } catch (e) {} } } }
            else if (m.dispose) { try { m.dispose(); } catch (e2) {} }
          }
        });
      }
      if (scene && scene.background && scene.background.isTexture && scene.background.dispose) {
        try { scene.background.dispose(); } catch (e) {}
      }
      // Templates de molde vivem FORA da cena — descarta os materiais próprios
      // (as geometrias-unidade são compartilhadas e saem junto).
      for (var mk in molds) {
        var tpl = molds[mk].template;
        if (tpl && tpl.traverse) {
          tpl.traverse(function (o) {
            if (o.material && o.material.dispose) { try { o.material.dispose(); } catch (e) {} }
          });
        }
      }
      if (UNIT_GEOS) {
        for (var gk in UNIT_GEOS) {
          if (UNIT_GEOS[gk] && UNIT_GEOS[gk].dispose) { try { UNIT_GEOS[gk].dispose(); } catch (e) {} }
        }
        UNIT_GEOS = null;
      }
      for (var fk in effects) disposeEffect(effects[fk]);
      if (spriteTex && spriteTex.dispose) { try { spriteTex.dispose(); } catch (e) {} }
      spriteTex = null;
      for (var li = 0; li < extraLights.length; li++) {
        if (extraLights[li] && extraLights[li].dispose) { try { extraLights[li].dispose(); } catch (e) {} }
      }
      extraLights.length = 0;
      if (_texCache) {
        for (var tk in _texCache) {
          if (_texCache[tk] && _texCache[tk].dispose) { try { _texCache[tk].dispose(); } catch (e) {} }
        }
        _texCache = null;
      }
      if (_curveCache) {
        for (var ck in _curveCache) {
          if (_curveCache[ck] && _curveCache[ck].dispose) { try { _curveCache[ck].dispose(); } catch (e) {} }
        }
        _curveCache = null;
      }
      disposeComposer();
      if (stageEl && stageEl.parentNode) { try { stageEl.parentNode.removeChild(stageEl); } catch (e) {} }
      if (styleEl && styleEl.parentNode) { try { styleEl.parentNode.removeChild(styleEl); } catch (e) {} }
    } catch (e) {}
    renderer = null;
    scene = null;
    camera = null;
    _ray = null;
    emitters = Object.create(null);
    gridCells = Object.create(null);
  }

  window.addEventListener('pagehide', disposeAll);
  window.addEventListener('beforeunload', disposeAll);

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
    // 🧰 O jogo
    setup: guard('setup', function (opts) {
      var o = (opts && typeof opts === 'object') ? opts : {};
      if (started) {
        warn('"Preparar o jogo 3D" depois de começar não muda o mundo — deixe-o no comecinho');
        return;
      }
      config.w = Math.max(64, Math.min(4096, num(o.width, config.w)));
      config.h = Math.max(64, Math.min(4096, num(o.height, config.h)));
      config.world = Math.max(20, Math.min(1000, num(o.world, config.world)));
      if (o.sky != null) config.sky = text(o.sky, config.sky);
      if (o.ground != null) config.ground = text(o.ground, config.ground);
      camMode.dist = Math.max(6, config.world * 0.35);
    }),
    start: guard('start', start),
    worldSize: guard('worldSize', function () { return config.world; }),
    scatterDecor: guard('scatterDecor', scatterDecor),
    setEffects: guard('setEffects', function (opts) {
      var o = (opts && typeof opts === 'object') ? opts : {};
      if (o.shadows != null) {
        config.shadows = o.shadows !== false;
        if (renderer && renderer.shadowMap) renderer.shadowMap.enabled = config.shadows;
      }
      if (o.bloom != null) config.bloom = o.bloom !== false;
      if (o.strength != null) config.bloomStrength = Math.max(0, Math.min(4, num(o.strength, 1.2)));
      if (o.vignette != null) config.vignette = o.vignette !== false;
      // Desligou TUDO depois do start: o composer fica órfão — libere os render
      // targets (senão ~20MB de GPU presos até o disposeAll).
      if (!config.bloom && !config.vignette && composer) disposeComposer();
    }),
    // 🧊 Moldes & peças
    defineMold: guard('defineMold', defineMold),
    part: guard('part', part),
    // 👾 Nascer & enxames
    spawn: guard('spawn', spawn),
    spawnFrom: guard('spawnFrom', spawnFrom),
    startSpawner: guard('startSpawner', startSpawner),
    stopSpawner: guard('stopSpawner', stopSpawner),
    forEachAlive: guard('forEachAlive', forEachAlive),
    countAlive: guard('countAlive', countAlive),
    recycle: guard('recycle', recycle),
    recycleAll: guard('recycleAll', recycleAll),
    cullFar: guard('cullFar', cullFar),
    // 🕹️ Jogar & teclas
    onUpdate: guard('onUpdate', function (fn) {
      if (typeof fn === 'function') updateHooks.push(fn);
    }),
    moveWithKeys: guard('moveWithKeys', moveWithKeys),
    keyDown: guard('keyDown', function (k) { return keys[normKey(k)] === true; }),
    keyPressed: guard('keyPressed', function (k) { return justPressed[normKey(k)] === true; }),
    setPauseKey: guard('setPauseKey', function (k) {
      var key = normKey(k);
      if (key) config.pauseKey = key;
    }),
    // 🎥 Câmera
    cameraFollow: guard('cameraFollow', function (e, dist, height) {
      if (!e || typeof e !== 'object') {
        warn('"Câmera: seguir" precisa de uma entidade');
        return;
      }
      camMode = { kind: 'follow', target: e, dist: Math.max(1, num(dist, 8)), height: num(height, 4), pivot: camMode.pivot };
    }),
    cameraOrbit: guard('cameraOrbit', function (dist) { setOrbit(dist); }),
    cameraAngle: guard('cameraAngle', cameraAngle),
    cameraDistance: guard('cameraDistance', cameraDistance),
    cameraShake: guard('cameraShake', cameraShake),
    cameraLens: guard('cameraLens', cameraLens),
    cameraLookAt: guard('cameraLookAt', cameraLookAt),
    cameraLookAtPoint: guard('cameraLookAtPoint', cameraLookAtPoint),
    cameraSmooth: guard('cameraSmooth', cameraSmooth),
    cameraTop: guard('cameraTop', function (height) {
      camMode = { kind: 'top', target: null, dist: 0, height: Math.max(4, num(height, 40)), pivot: camMode.pivot };
    }),
    // 🤖 Entidades
    place: guard('place', function (e, x, y, z) {
      if (!isEntity(e)) return;
      e.mesh.position.set(num(x, 0), num(y, 0), num(z, 0));
      gridSync(e);
    }),
    setYaw: guard('setYaw', function (e, deg) {
      if (!isEntity(e)) return;
      e.mesh.rotation.set(0, num(deg, 0) * Math.PI / 180, 0);
    }),
    setVelocity: guard('setVelocity', function (e, x, y, z) {
      if (!isEntity(e)) return;
      e.vx = num(x, 0);
      e.vy = num(y, 0);
      e.vz = num(z, 0);
    }),
    setDrag: guard('setDrag', function (e, amount) {
      if (!isEntity(e)) return;
      e.drag = Math.max(0, num(amount, 3));
    }),
    lookAt: guard('lookAt', lookAt),
    moveForward: guard('moveForward', moveForward),
    // 🏃 Física
    fall: guard('fall', fall),
    jump: guard('jump', jump),
    onGround: guard('onGround', function (e) { return isEntity(e) && e.grounded === true; }),
    makeSolid: guard('makeSolid', makeSolid),
    platformerKeys: guard('platformerKeys', platformerKeys),
    setSeed: guard('setSeed', setSeed),
    randomBetween: guard('randomBetween', randomBetween),
    randomChance: guard('randomChance', randomChance),
    playMusic: guard('playMusic', playMusic),
    stopMusic: guard('stopMusic', stopMusic),
    startTimer: guard('startTimer', startTimer),
    timeLeft: guard('timeLeft', timeLeft),
    stopTimer: guard('stopTimer', stopTimer),
    onTimerEnd: guard('onTimerEnd', onTimerEnd),
    say: guard('say', say),
    hideSay: guard('hideSay', hideSay),
    playAnim: guard('playAnim', function (e, name, loop) { playAnim(e, name, loop !== false); }),
    stopAnim: guard('stopAnim', stopAnim),
    setStateAnim: guard('setStateAnim', setStateAnim),
    setPhysics: guard('setPhysics', setPhysics),
    setCollider: guard('setCollider', setCollider),
    passThrough: guard('passThrough', passThrough),
    makeTrigger: guard('makeTrigger', makeTrigger),
    onOverlap: guard('onOverlap', onOverlap),
    setBounce: guard('setBounce', setBounce),
    setFriction: guard('setFriction', setFriction),
    // 💡 Luz & céu
    addLight: guard('addLight', addLight),
    setFog: guard('setFog', setFog),
    setSky: guard('setSky', setSkyRuntime),
    setSkyPhoto: guard('setSkyPhoto', setSkyPhoto),
    setAmbient: guard('setAmbient', setAmbient),
    // 🖱️ Mira & clique no mundo (raycast) + câmera 1ª pessoa
    pick: guard('pick', pickAtMouse),
    pointerOver: guard('pointerOver', pointerOverEntity),
    groundPoint: guard('groundPoint', groundPoint),
    cameraFps: guard('cameraFps', cameraFps),
    moveFps: guard('moveFps', moveFps),
    posOf: guard('posOf', function (e, axis) {
      var a = text(axis, 'x');
      if (a !== 'x' && a !== 'y' && a !== 'z') a = 'x';
      return posAxis(e, a);
    }),
    exists: guard('exists', function (e) { return isEntity(e); }),
    // Valores que faltavam para a criança escrever a PRÓPRIA regra (o kit tinha
    // muito comando e pouco valor — sem eles, "se a velocidade for..." ou "se a
    // distância for..." não dava para montar).
    velocityOf: guard('velocityOf', function (e, axis) {
      if (!isEntity(e)) return 0;
      var a = text(axis, 'x');
      return a === 'y' ? e.vy : (a === 'z' ? e.vz : e.vx);
    }),
    distanceBetween: guard('distanceBetween', function (a, b) {
      if (!isEntity(a) || !isEntity(b)) return 0;
      return distanceBetween(a, b);
    }),
    maxHealthOf: guard('maxHealthOf', function (e) {
      return isEntity(e) ? e.maxHealth : 0;
    }),
    stateOf: guard('stateOf', function (e) {
      return isEntity(e) ? e.state : '';
    }),
    // Gaveta de dados POR ENTIDADE (cronômetro/alvo/contador próprio — como os
    // campos privados de State no curso). Zerada a cada nascimento (sem vazamento).
    setEntityValue: guard('setEntityValue', function (e, key, value) {
      if (!isEntity(e)) return;
      if (!e.data) e.data = {};
      e.data[text(key, '')] = value;
    }),
    entityValue: guard('entityValue', function (e, key) {
      if (!isEntity(e) || !e.data) return undefined;
      return e.data[text(key, '')];
    }),
    stateTime: guard('stateTime', function (e) {
      return isEntity(e) ? num(e.stateTime, 0) : 0;
    }),
    // 🧠 Cérebro da entidade (FSM)
    onEnterEntityState: guard('onEnterEntityState', function (mold, stateName, fn) {
      var bucket = fsmBucket(mold, stateName);
      if (bucket && typeof fn === 'function') bucket.enter.push(fn);
    }),
    onEntityStateUpdate: guard('onEntityStateUpdate', function (mold, stateName, fn) {
      var bucket = fsmBucket(mold, stateName);
      if (bucket && typeof fn === 'function') bucket.step.push(fn);
    }),
    onExitEntityState: guard('onExitEntityState', function (mold, stateName, fn) {
      var bucket = fsmBucket(mold, stateName);
      if (bucket && typeof fn === 'function') bucket.exit.push(fn);
    }),
    setEntityState: guard('setEntityState', setEntityState),
    entityStateIs: guard('entityStateIs', function (e, stateName) {
      return !!(e && typeof e === 'object') && e.state === text(stateName, '');
    }),
    stateTimer: guard('stateTimer', stateTimer),
    // 🎯 Comportamentos
    seek: guard('seek', seek),
    aimAt: guard('aimAt', aimAt),
    faceVelocity: guard('faceVelocity', faceVelocity),
    isAimingAt: guard('isAimingAt', isAimingAt),
    // 🕸️ Vizinhança
    forEachNear: guard('forEachNear', forEachNear),
    nearest: guard('nearest', nearest),
    touches: guard('touches', touches),
    // ❤️ Combate
    hurt: guard('hurt', hurt),
    healthOf: guard('healthOf', function (e) {
      return (e && typeof e === 'object') ? num(e.health, 0) : 0;
    }),
    onEntityDeath: guard('onEntityDeath', function (mold, fn) {
      var k = text(mold, '');
      if (!k || typeof fn !== 'function') return;
      (deathHooks[k] || (deathHooks[k] = [])).push(fn);
    }),
    // 🖼️ Telas & HUD
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
    setHud: guard('setHud', setHud),
    // 🚦 Estados do jogo
    setState: guard('setState', setState),
    onEnterState: guard('onEnterState', function (name, fn) {
      var key = text(name, '');
      if (!key || typeof fn !== 'function') return;
      (enterStateHooks[key] || (enterStateHooks[key] = [])).push(fn);
    }),
    stateIs: guard('stateIs', function (name) { return state === text(name, ''); }),
    state: guard('state', function () { return state; }),
    returnToMenu: guard('returnToMenu', function () { setState('menu'); }),
    endGame: guard('endGame', function () { setState('fim'); }),
    // 💥 Faíscas 3D
    defineEffect: guard('defineEffect', defineEffect),
    burstAt: guard('burstAt', burstAt),
    burstOn: guard('burstOn', burstOn),
    // 🌊 Emissores contínuos + atratores (partículas data-driven do curso)
    defineEmitter: guard('defineEmitter', defineEmitter),
    startEmitter: guard('startEmitter', startEmitter),
    emitterOn: guard('emitterOn', emitterOn),
    stopEmitter: guard('stopEmitter', stopEmitter),
    addAttractor: guard('addAttractor', addAttractor),
    // 📢 Avisos
    on: guard('on', onEvent),
    emit: guard('emit', emit),
    // 🔊 Som
    loadSound: guard('loadSound', loadSound),
    playSound: guard('playSound', playSound),
    playEffect: guard('playEffect', playEffect),
    playTone: guard('playTone', playTone)
  };

  window.SZGameKit3D = api;
})();
`
