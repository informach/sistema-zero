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
  var pools = Object.create(null);       // nome -> { active:[], free:[], _sweeping }
  var spawners = [];                     // { mold, interval, timer, where }
  var fsmHooks = Object.create(null);    // mold -> estado -> { enter:[], step:[], exit:[] }
  var stateTimers = [];                  // { mold, state, sec, next }
  var deathHooks = Object.create(null);  // mold -> [fn]
  var effects = Object.create(null);     // nome -> receita + Points + buffers (faíscas)
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
  var decor = [];
  var currentDt = 0;
  var playTime = 0;
  var totalAlive = 0;                    // entidades vivas (todos os moldes)
  var entityLimitWarned = false;
  var _currentMold = null;               // contexto de montagem do defineMold
  // Câmera viva: um MODO por vez (órbita arrastável / seguir / topo).
  var camMode = { kind: 'orbit', target: null, dist: 25, height: 4 };
  var orbit = null;                      // { az, el, dist, dragging, px, py }
  // Vetores/quaternions temporários (alocados no initWorld — nunca no top-level).
  var _tv1 = null;
  var _tv2 = null;
  var _tq1 = null;

  // Grade espacial (plano XZ): a resposta do curso ao "getNearbyEntities O(n)".
  // Células esparsas por chave 'x,z'; cada entidade guarda a faixa de células
  // que ocupa e só re-insere quando os índices mudam.
  var GRID_DIM = 16;
  var gridCells = Object.create(null);

  var SOUNDS = (typeof window !== 'undefined' && window.__SZGAME_SOUNDS && typeof window.__SZGAME_SOUNDS === 'object')
    ? window.__SZGAME_SOUNDS
    : {};

  function warn(msg) {
    try { console.warn('SZGameKit3D: ' + msg); } catch (e) {}
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
    var n = parseInt(h, 16);
    if (!isFinite(n) || h.length !== 6) return null;
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
      for (var pk in pools) releaseAll(pools[pk]);
      for (var si = 0; si < spawners.length; si++) spawners[si].timer = 0;
      resetParticles();
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

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      var sun = new THREE.DirectionalLight(0xffffff, 1.0);
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
      grad.addColorStop(1, lighten(config.sky, 0.55));
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 256);
      var old = scene.background;
      if (old && old.isTexture && old.dispose) { try { old.dispose(); } catch (e) {} }
      scene.background = new THREE.CanvasTexture(cv);
    } catch (e) {
      try { scene.background = new THREE.Color(config.sky); } catch (e2) {}
    }
  }

  /** Enfeites procedurais (pedras cinzas + cristais na cor de destaque). */
  function scatterDecor(count) {
    if (!worldReady && !initWorldLater('Espalhar enfeites')) return;
    var n = Math.max(0, Math.min(MAX_DECOR, Math.floor(num(count, 16))));
    for (var d = 0; d < decor.length; d++) {
      var old = decor[d];
      if (old.parent) old.parent.remove(old);
      if (old.geometry && old.geometry.dispose) { try { old.geometry.dispose(); } catch (e) {} }
      if (old.material && old.material.dispose) { try { old.material.dispose(); } catch (e) {} }
    }
    decor.length = 0;
    var radius = config.world * 0.45;
    for (var i = 0; i < n; i++) {
      var isRock = i % 2 === 0;
      var geo = isRock ? new THREE.IcosahedronGeometry(0.5, 0) : new THREE.OctahedronGeometry(0.5, 0);
      var mat;
      if (isRock) {
        var shade = 90 + Math.floor(Math.random() * 60);
        mat = new THREE.MeshStandardMaterial({ color: 'rgb(' + shade + ', ' + shade + ', ' + (shade + 8) + ')' });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: config.accent });
        if (mat.emissive && mat.emissive.set) {
          mat.emissive.set(config.accent);
          mat.emissiveIntensity = 0.25;
        }
      }
      var mesh = new THREE.Mesh(geo, mat);
      var ang = Math.random() * Math.PI * 2;
      var dist = Math.sqrt(Math.random()) * radius;
      var s = isRock ? (0.5 + Math.random() * 1.3) : (0.4 + Math.random() * 0.8);
      mesh.scale.set(s, isRock ? s * 0.7 : s * 1.6, s);
      mesh.position.set(Math.cos(ang) * dist, (isRock ? s * 0.35 : s * 0.8), Math.sin(ang) * dist);
      mesh.rotation.y = Math.random() * Math.PI * 2;
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

  function gridRange(x, z, half) {
    return [gridIndex(x - half), gridIndex(z - half), gridIndex(x + half), gridIndex(z + half)];
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

  /** Recalcula a faixa de células; só re-insere se os índices mudaram. */
  function gridSync(e) {
    var m = molds[e._mold];
    var half = m ? Math.max(0.5, m.radius) : 0.5;
    var p = e.mesh.position;
    var r = gridRange(p.x, p.z, half);
    var old = e._gi;
    if (old && old[0] === r[0] && old[1] === r[1] && old[2] === r[2] && old[3] === r[3]) return;
    gridRemove(e);
    gridInsert(e, r);
  }

  /** Vizinhos brutos num raio (broad-phase) — o chamador refina por distância. */
  function gridQuery(x, z, radius) {
    var r = gridRange(x, z, radius);
    var seen = [];
    for (var gx = r[0]; gx <= r[2]; gx++) {
      for (var gz = r[1]; gz <= r[3]; gz++) {
        var cell = gridCells[gx + ',' + gz];
        if (!cell) continue;
        for (var i = 0; i < cell.length; i++) {
          if (seen.indexOf(cell[i]) === -1) seen.push(cell[i]);
        }
      }
    }
    return seen;
  }

  // ---- Moldes (aparência por composição de peças) + pool + spawner ----

  var UNIT_GEOS = null;
  function unitGeo(shape) {
    if (!UNIT_GEOS) UNIT_GEOS = {};
    if (UNIT_GEOS[shape]) return UNIT_GEOS[shape];
    var g;
    if (shape === 'sphere') g = new THREE.SphereGeometry(0.5, 20, 14);
    else if (shape === 'cylinder') g = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
    else if (shape === 'cone') g = new THREE.ConeGeometry(0.5, 1, 20);
    else g = new THREE.BoxGeometry(1, 1, 1);
    UNIT_GEOS[shape] = g;
    return g;
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
      radius: 0.5
    };
    molds[k] = mold;
    if (!pools[k]) pools[k] = { active: [], free: [], _sweeping: false };
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
      var mat = new THREE.MeshStandardMaterial({ color: text(o.color, config.accent) });
      var mesh = new THREE.Mesh(unitGeo(shape), mat);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mold.template.add(mesh);
      mold.parts += 1;
      // Raio de colisão/grade: alcance horizontal da peça mais afastada.
      var reach = Math.max(Math.abs(x), Math.abs(z)) + Math.max(w, d) / 2;
      if (reach > mold.radius) mold.radius = reach;
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
      _alive: false,
      _mold: '',
      _iFrames: 0,
      _gi: null
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
    var pool = pools[k] || (pools[k] = { active: [], free: [], _sweeping: false });
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
    e._alive = true;
    e._mold = k;
    e._iFrames = 0;
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
    e._alive = false;
    e._iFrames = 0;
    if (e.mesh) e.mesh.visible = false;
    gridRemove(e);
    totalAlive = Math.max(0, totalAlive - 1);
    var pool = pools[e._mold];
    if (!pool) return;
    // Dentro de uma varredura, a compactação reversa devolve ao free[]; fora
    // dela, devolvemos agora (senão a entidade ficava presa no active[]).
    if (!pool._sweeping) {
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
    pool._sweeping = true;
    var warned = false;
    for (var i = pool.active.length - 1; i >= 0; i--) {
      var e = pool.active[i];
      if (!e._alive) continue;
      try {
        fn(e);
      } catch (err) {
        if (!warned) {
          warned = true;
          warn('erro no "para cada vivo": ' + err);
        }
      }
    }
    pool._sweeping = false;
    compact(pool);
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
    pool._sweeping = true;
    for (var i = 0; i < pool.active.length; i++) {
      var e = pool.active[i];
      if (!e._alive || !e.mesh) continue;
      var p = e.mesh.position;
      if (p.x * p.x + p.y * p.y + p.z * p.z > d2) recycle(e);
    }
    pool._sweeping = false;
    compact(pool);
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
    var ang = Math.random() * Math.PI * 2;
    var dist = sp.where === 'anywhere' ? Math.sqrt(Math.random()) * radius : radius;
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
    var newBucket = perMold ? perMold[next] : null;
    if (newBucket) runEntityHooks(newBucket.enter, e, 'quando entrar no estado ' + next);
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

  // ---- Física da entidade (arrasto exponencial + integração + i-frames) ----

  function stepEntity(e, dt) {
    // 1. FSM: ganchos "enquanto estiver no estado" + transições por tempo.
    var perMold = fsmHooks[e._mold];
    if (perMold && e.state) {
      var bucket = perMold[e.state];
      if (bucket) runEntityHooks(bucket.step, e, 'enquanto estiver no estado ' + e.state);
    }
    if (!e._alive) return; // o gancho pode ter recolhido a entidade
    e.stateTime += dt;
    for (var t = 0; t < stateTimers.length; t++) {
      var timer = stateTimers[t];
      if (timer.mold === e._mold && timer.state === e.state && e.stateTime >= timer.sec) {
        setEntityState(e, timer.next);
        if (!e._alive) return;
        break;
      }
    }
    // 2. Arrasto exponencial (estável para qualquer dt) + integração.
    if (e.drag > 0) {
      var f = Math.exp(-e.drag * dt);
      e.vx *= f; e.vy *= f; e.vz *= f;
    }
    if (e.vx || e.vy || e.vz) {
      e.mesh.position.x += e.vx * dt;
      e.mesh.position.y += e.vy * dt;
      e.mesh.position.z += e.vz * dt;
    }
    // 3. Invencibilidade: decai e pisca a 10 Hz.
    if (e._iFrames > 0) {
      e._iFrames = Math.max(0, e._iFrames - dt);
      e.mesh.visible = e._iFrames <= 0 || Math.floor(e._iFrames * 10) % 2 === 0;
      if (e._iFrames <= 0) e.mesh.visible = true;
    }
    // 4. Grade espacial acompanha a posição.
    gridSync(e);
  }

  // ---- Comportamentos (a matemática do curso pronta em blocos) ----

  function moveWithKeys(e, speed) {
    if (!isEntity(e)) return;
    var sp = num(speed, 8);
    var dx = 0;
    var dz = 0;
    if (keys.w || keys.arrowup) dz -= 1;
    if (keys.s || keys.arrowdown) dz += 1;
    if (keys.a || keys.arrowleft) dx -= 1;
    if (keys.d || keys.arrowright) dx += 1;
    if (dx || dz) {
      var len = Math.sqrt(dx * dx + dz * dz);
      e.vx = (dx / len) * sp;
      e.vz = (dz / len) * sp;
    } else {
      e.vx = 0;
      e.vz = 0;
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
    var lambda = Math.max(0.1, num(smooth, 5));
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
    pool._sweeping = true;
    var warned = false;
    for (var hI = 0; hI < hits.length; hI++) {
      if (!hits[hI]._alive) continue;
      try {
        fn(hits[hI]);
      } catch (err) {
        if (!warned) {
          warned = true;
          warn('erro no "para cada vizinho": ' + err);
        }
      }
    }
    pool._sweeping = false;
    compact(pool);
  }

  function nearest(mold, e) {
    if (!isEntity(e)) return null;
    var pool = pools[text(mold, '')];
    if (!pool) return null;
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < pool.active.length; i++) {
      var other = pool.active[i];
      if (!other._alive || other === e) continue;
      var dx = other.mesh.position.x - e.mesh.position.x;
      var dy = other.mesh.position.y - e.mesh.position.y;
      var dz = other.mesh.position.z - e.mesh.position.z;
      var d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; best = other; }
    }
    return best;
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

  var PARTICLE_VSH = [
    'attribute float particleLife;',
    'varying float vLife;',
    'uniform float sizeFrom;',
    'uniform float sizeTo;',
    'uniform float scaleFactor;',
    'void main() {',
    '  vLife = particleLife;',
    '  vec3 mv = (modelViewMatrix * vec4(position, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * vec4(mv, 1.0);',
    '  float size = mix(sizeFrom, sizeTo, vLife);',
    '  gl_PointSize = size * scaleFactor / max(0.1, -mv.z);',
    '}'
  ].join(' ');

  var PARTICLE_FSH = [
    'uniform sampler2D map;',
    'uniform vec3 colorFrom;',
    'uniform vec3 colorTo;',
    'varying float vLife;',
    'void main() {',
    '  vec4 texel = texture2D(map, gl_PointCoord.xy);',
    '  vec3 col = mix(colorFrom, colorTo, vLife);',
    '  float alpha = texel.a * (1.0 - vLife);',
    '  gl_FragColor = vec4(col * alpha, alpha);',
    '}'
  ].join(' ');

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

  function defineEffect(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o efeito 3D" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    var old = effects[k];
    if (old) disposeEffect(old);
    var fx;
    try {
      var geometry = new THREE.BufferGeometry();
      var positions = new Float32Array(MAX_PARTICLES_PER_EFFECT * 3);
      var lifeArr = new Float32Array(MAX_PARTICLES_PER_EFFECT);
      var posAttr = new THREE.BufferAttribute(positions, 3);
      var lifeAttr = new THREE.BufferAttribute(lifeArr, 1);
      if (THREE.DynamicDrawUsage != null) {
        posAttr.setUsage(THREE.DynamicDrawUsage);
        lifeAttr.setUsage(THREE.DynamicDrawUsage);
      }
      geometry.setAttribute('position', posAttr);
      geometry.setAttribute('particleLife', lifeAttr);
      // Esfera de recorte fixa e generosa: nunca recalcular por quadro (curso).
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);
      geometry.setDrawRange(0, 0);
      var cf = new THREE.Color(text(o.colorFrom, '#fb923c'));
      var ct = new THREE.Color(text(o.colorTo, '#451a03'));
      var material = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: ensureSpriteTex() },
          colorFrom: { value: new THREE.Vector3(cf.r, cf.g, cf.b) },
          colorTo: { value: new THREE.Vector3(ct.r, ct.g, ct.b) },
          sizeFrom: { value: Math.max(0.01, num(o.sizeFrom, 0.5)) },
          sizeTo: { value: Math.max(0, num(o.sizeTo, 0)) },
          scaleFactor: { value: config.h * 0.42 }
        },
        vertexShader: PARTICLE_VSH,
        fragmentShader: PARTICLE_FSH,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      var points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      fx = {
        count: Math.max(1, Math.min(MAX_BURST, Math.floor(num(o.count, 24)))),
        life: Math.max(0.05, num(o.life, 0.8)),
        spread: Math.max(0.1, num(o.spread, 6)),
        gravity: num(o.gravity, -9),
        geometry: geometry,
        material: material,
        points: points,
        positions: positions,
        lifeArr: lifeArr,
        particles: [],
        free: []
      };
      if (worldReady && scene) scene.add(points);
    } catch (e) {
      warn('não consegui criar o efeito "' + k + '": ' + e);
      return;
    }
    effects[k] = fx;
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

  function burstAt(name, x, y, z) {
    var fx = effects[text(name, '')];
    if (!fx) {
      warn('o efeito "' + text(name, '') + '" não existe — crie com "Criar o efeito 3D"');
      return;
    }
    var bx = num(x, 0);
    var by = num(y, 1);
    var bz = num(z, 0);
    for (var i = 0; i < fx.count; i++) {
      if (fx.particles.length >= MAX_PARTICLES_PER_EFFECT) break;
      var p = fx.free.pop() || { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 };
      // Direção aleatória na esfera (o ExplosionShape do curso) × espalhamento.
      var phi = Math.random() * Math.PI * 2;
      var theta = Math.random() * Math.PI;
      var speed = fx.spread * (0.4 + Math.random() * 0.6);
      p.x = bx; p.y = by; p.z = bz;
      p.vx = Math.sin(theta) * Math.cos(phi) * speed;
      p.vy = Math.cos(theta) * speed;
      p.vz = Math.sin(theta) * Math.sin(phi) * speed;
      p.life = 0;
      p.maxLife = fx.life * (0.7 + Math.random() * 0.6);
      fx.particles.push(p);
    }
  }

  function burstOn(name, e) {
    if (!isEntity(e)) return;
    burstAt(name, e.mesh.position.x, e.mesh.position.y + 0.5, e.mesh.position.z);
  }

  /** Integra e reescreve os buffers (sem alocação por quadro; swap-pop O(1)). */
  function stepParticles(dt) {
    for (var k in effects) {
      var fx = effects[k];
      var list = fx.particles;
      if (list.length === 0) continue;
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
        p.vy += fx.gravity * dt;
        var dragF = Math.exp(-0.5 * dt);
        p.vx *= dragF; p.vy *= dragF; p.vz *= dragF;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }
      writeParticles(fx);
    }
  }

  function writeParticles(fx) {
    var list = fx.particles;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      fx.positions[i * 3] = p.x;
      fx.positions[i * 3 + 1] = p.y;
      fx.positions[i * 3 + 2] = p.z;
      fx.lifeArr[i] = p.maxLife > 0 ? p.life / p.maxLife : 1;
    }
    try {
      fx.geometry.attributes.position.needsUpdate = true;
      fx.geometry.attributes.particleLife.needsUpdate = true;
      fx.geometry.setDrawRange(0, list.length);
    } catch (e) {}
  }

  function resetParticles() {
    for (var k in effects) {
      var fx = effects[k];
      while (fx.particles.length > 0) fx.free.push(fx.particles.pop());
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
    'vec3 aces(vec3 x) {',
    '  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);',
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
    camMode = { kind: 'orbit', target: null, dist: Math.max(2, num(dist, 25)), height: 0 };
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

  function updateCamera(dt) {
    if (!camera) return;
    if (camMode.kind === 'orbit' && orbit) {
      var ce = Math.cos(orbit.el);
      camera.position.set(
        orbit.dist * ce * Math.sin(orbit.az),
        orbit.dist * Math.sin(orbit.el),
        orbit.dist * ce * Math.cos(orbit.az)
      );
      camera.lookAt(0, 0, 0);
      return;
    }
    if (camMode.kind === 'top') {
      camera.position.set(0, camMode.height, camMode.height * 0.001 + 0.01);
      camera.lookAt(0, 0, 0);
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
      var a = 1 - Math.exp(-3 * (dt > 0 ? dt : 0.016));
      camera.position.lerp(_tv2, a);
      camera.lookAt(t.mesh.position.x, t.mesh.position.y + 1, t.mesh.position.z);
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
      stepSystems(dt);
      // Um gancho pode ter terminado o jogo NESTE quadro — não rodar o update
      // da criança num jogo que acabou de acabar.
      if (state === 'jogando') runHooks(updateHooks, dt, 'A cada quadro');
    }
    updateCamera(state === 'jogando' ? dt : 0);
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
    for (var i = 0; i < spawners.length; i++) {
      var sp = spawners[i];
      sp.timer += dt;
      while (sp.timer >= sp.interval && sp.interval > 0) {
        sp.timer -= sp.interval;
        spawnFromSpawner(sp);
      }
    }
    for (var pk in pools) {
      var pool = pools[pk];
      pool._sweeping = true;
      for (var eI = pool.active.length - 1; eI >= 0; eI--) {
        var e = pool.active[eI];
        if (!e._alive) continue;
        stepEntity(e, dt);
      }
      pool._sweeping = false;
      compact(pool);
    }
    // As faíscas só andam em 'jogando' — a pausa congela tudo, como no curso.
    stepParticles(dt);
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
      disposeComposer();
      if (stageEl && stageEl.parentNode) { try { stageEl.parentNode.removeChild(stageEl); } catch (e) {} }
      if (styleEl && styleEl.parentNode) { try { styleEl.parentNode.removeChild(styleEl); } catch (e) {} }
    } catch (e) {}
    renderer = null;
    scene = null;
    camera = null;
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
      camMode = { kind: 'follow', target: e, dist: Math.max(1, num(dist, 8)), height: num(height, 4) };
    }),
    cameraOrbit: guard('cameraOrbit', function (dist) { setOrbit(dist); }),
    cameraTop: guard('cameraTop', function (height) {
      camMode = { kind: 'top', target: null, dist: 0, height: Math.max(4, num(height, 40)) };
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
    posOf: guard('posOf', function (e, axis) {
      var a = text(axis, 'x');
      if (a !== 'x' && a !== 'y' && a !== 'z') a = 'x';
      return posAxis(e, a);
    }),
    exists: guard('exists', function (e) { return isEntity(e); }),
    // 🚥 Estados da entidade (FSM)
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
