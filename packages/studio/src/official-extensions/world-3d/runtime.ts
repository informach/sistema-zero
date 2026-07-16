/**
 * Runtime do "Mundo 3D" — injetado no <head> do iframe quando a extensão
 * "world-3d" está instalada. É um SCRIPT MODULE (importa `three` via importmap
 * — ver `runtime.esmImports`), então roda DEFERIDO e em ordem antes do código
 * do aluno.
 *
 * Expõe `window.SZWorld3D`: um MUNDO 3D aberto dirigível (inspirado no folio do
 * Bruno Simon), achatado num facade de alto nível — 1 bloco = 1 resultado. O
 * motor cuida do que nunca muda: terreno por ruído com altura consultável
 * (groundHeight analítico — a espinha dorsal de carro/natureza/água), carrinho
 * ARCADE na unha (sem lib de física: ponto sobre o heightfield + carroceria em
 * molas COSMÉTICAS de pitch/roll — o "molejo" do folio), câmera que segue com
 * zoom por velocidade, céu em degradê por estilo, sol com sombra que SEGUE o
 * carro (frustum pequeno + mundo grande), letterbox de resolução fixa e laço
 * com delta-time clampado. A MECÂNICA extra é da criança, no gancho onUpdate.
 *
 * Regras deste arquivo (mesmas do gameKit3DRuntime):
 * - A PRIMEIRA linha da string é exatamente `import * as THREE from 'three';`
 *   (os testes tiram essa linha e avaliam o resto com um stub de THREE).
 * - String pura de JS ES5-like, SEM backticks nem interpolação — texto
 *   dinâmico é concatenado com '+'.
 * - Zero `new THREE.*` e zero DOM no top-level: tudo lazy em ensureShell()/
 *   initWorld() (os testes avaliam com stub sem document e THREE vazio).
 * - Nunca quebrar o mundo do aluno: API pública embrulhada em try/catch com
 *   console.warn; avisos de gancho saem UMA vez (60×/s afogaria o console).
 * - Higiene de GPU: pixelRatio 1 (resolução interna fixa), terreno rebuild
 *   descarta o antigo, dispose + forceContextLoss no fechamento.
 */
export const world3DRuntime = `import * as THREE from 'three';
(function () {
  // ---- Config (dos blocos "Criar o mundo 3D" / "Deixar o chão com morros") ----
  var config = {
    w: 1280,
    h: 720,
    world: 160,
    style: 'floresta'
  };
  var terrainCfg = {
    hills: 2.5,   // altura dos morros (m) — o default dá um mundo levemente ondulado
    smooth: 6     // "tamanho" de cada morro (maior = colinas largas)
  };

  // Paletas por estilo: céu (topo/horizonte), chão (baixo/alto), pedra, névoa e
  // o quanto o chão agarra (a neve escorrega DE PROPÓSITO).
  var STYLES = {
    floresta:  { skyTop: '#6db8f2', skyBot: '#e8f4d2', low: '#3e7c3a', high: '#7ca63f', rock: '#8a8f7e', fog: '#cfe4c8', grip: 1 },
    praia:     { skyTop: '#5fc0ee', skyBot: '#fdeec9', low: '#e3cb8d', high: '#d2b268', rock: '#b3a284', fog: '#f2e4c2', grip: 1 },
    neve:      { skyTop: '#9dbcdd', skyBot: '#eef4fb', low: '#dfe8f2', high: '#ffffff', rock: '#9fb0c0', fog: '#e3ecf6', grip: 0.45 },
    deserto:   { skyTop: '#74aee6', skyBot: '#f6d8a6', low: '#d3a05c', high: '#e6c079', rock: '#a3794c', fog: '#ecd8ae', grip: 1 },
    primavera: { skyTop: '#85cbf4', skyBot: '#f8e2ef', low: '#579a49', high: '#8cc061', rock: '#96917f', fog: '#e1eed6', grip: 1 }
  };

  // Estilos de carrinho: proporções + números de fábrica (car_stats sobrepõe).
  var CAR_STYLES = {
    passeio: { w: 1.7, h: 0.6, l: 3.0, wheel: 0.42, clear: 0.34, cab: 0.5, speed: 22, turn: 110, jump: 7 },
    jipe:    { w: 1.8, h: 0.7, l: 3.2, wheel: 0.56, clear: 0.52, cab: 0.56, speed: 20, turn: 100, jump: 8 },
    corrida: { w: 1.9, h: 0.42, l: 3.6, wheel: 0.44, clear: 0.24, cab: 0.34, speed: 30, turn: 120, jump: 6 }
  };

  // ---- Estado interno ----
  var started = false;
  var shellReady = false;
  var worldReady = false;
  var disposed = false;
  var keys = {};
  var justPressed = {};
  var pending = [];             // promessas de carregamento (sons/modelos, futuro)
  var updateHooks = [];
  var stageEl = null;
  var frameEl = null;
  var canvasEl = null;
  var styleEl = null;
  var splashEl = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var sunLight = null;
  var sunTarget = null;
  var ambientLight = null;
  var terrainMesh = null;
  var gradientTex = null;
  var skyTex = null;
  var playTime = 0;
  var _lastT = 0;
  var currentDt = 0;
  // Carrinho: config (dos blocos) + estado físico + peças visuais.
  var carCfg = null;            // { style, color, speed, turn, jump }
  var carState = null;          // { x, y, z, yaw, speed, vy, airborne, steerVis, pitch, pitchV, roll, rollV }
  var carGroup = null;          // raiz (posição + yaw)
  var carBody = null;           // carroceria (molejo: pitch/roll)
  var carWheels = [];           // { mesh, pivot, front }
  var GRAV = 22;
  // Câmera que segue (com zoom por velocidade) + órbita automática sem carro.
  var _look = null;
  var _autoAngle = 0;
  var camSnap = true;           // 1º quadro / teleporte: cola sem lerp

  function warn(msg) {
    try { console.warn('SZWorld3D: ' + msg); } catch (e) {}
  }

  /** Aviso UMA vez por chave (coisa chamada a cada quadro entupiria o console). */
  var _warned = {};
  function warnOnce(key, msg) {
    if (_warned[key]) return;
    _warned[key] = true;
    warn(msg);
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

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a || 1), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /** Amortecimento independente de FPS (lerp exponencial). */
  function damp(k, dt) {
    return 1 - Math.exp(-k * dt);
  }

  function styleOf() {
    return STYLES[config.style] || STYLES.floresta;
  }

  // ---- Ruído do terreno (value noise 2D determinístico, 3 oitavas) ----
  // Determinístico DE PROPÓSITO: o mundo da criança é sempre o MESMO mundo —
  // ela decora onde ficam os morros, como quem decora o próprio quintal.

  function hash2(ix, iz) {
    var n = (ix * 374761393 + iz * 668265263) | 0;
    n = (n ^ (n >>> 13)) | 0;
    n = Math.imul(n, 1274126177) | 0;
    n = (n ^ (n >>> 16)) >>> 0;
    return n / 4294967296;
  }

  function smooth01(t) {
    return t * t * (3 - 2 * t);
  }

  function vnoise(x, z) {
    var ix = Math.floor(x);
    var iz = Math.floor(z);
    var fx = x - ix;
    var fz = z - iz;
    var a = hash2(ix, iz);
    var b = hash2(ix + 1, iz);
    var c = hash2(ix, iz + 1);
    var d = hash2(ix + 1, iz + 1);
    var u = smooth01(fx);
    var v = smooth01(fz);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /**
   * A altura do chão em (x, z) — ANALÍTICA e pura: carro, natureza, água e o
   * bloco "a altura do chão" consultam a MESMA função (nunca dessincroniza).
   * O centro do mundo é aplainado (raio ~8..20 m) para o carrinho nascer em paz.
   */
  function heightAt(x, z) {
    var scale = 1 / Math.max(4, terrainCfg.smooth * 8);
    var h = 0;
    var amp = 1;
    var freq = scale;
    var tot = 0;
    for (var o = 0; o < 3; o++) {
      h += (vnoise(x * freq + 100, z * freq + 100) * 2 - 1) * amp;
      tot += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    h = (h / tot) * terrainCfg.hills;
    var d = Math.sqrt(x * x + z * z);
    return h * smoothstep(8, 20, d);
  }

  /** Componentes da normal do chão por diferenças finitas (para o molejo). */
  var _normScratch = { x: 0, y: 1, z: 0 };
  function groundNormalAt(x, z) {
    var e = 0.6;
    var hl = heightAt(x - e, z);
    var hr = heightAt(x + e, z);
    var hd = heightAt(x, z - e);
    var hu = heightAt(x, z + e);
    var nx = hl - hr;
    var nz = hd - hu;
    var ny = 2 * e;
    var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    _normScratch.x = nx / len;
    _normScratch.y = ny / len;
    _normScratch.z = nz / len;
    return _normScratch;
  }

  // ---- Teclas (com apelidos em português) ----

  var KEY_ALIASES = {
    'cima': 'arrowup', 'baixo': 'arrowdown', 'esquerda': 'arrowleft', 'direita': 'arrowright',
    'espaco': ' ', 'espaço': ' ', 'space': ' ', 'seta cima': 'arrowup', 'seta baixo': 'arrowdown',
    'seta esquerda': 'arrowleft', 'seta direita': 'arrowright'
  };
  function keyName(k) {
    var s = text(k, '').toLowerCase();
    return KEY_ALIASES[s] || s;
  }
  function isDown(k) {
    return !!keys[k];
  }
  function isJust(k) {
    return !!justPressed[k];
  }

  function bindInput() {
    window.addEventListener('keydown', function (e) {
      var k = String(e.key).toLowerCase();
      keys[k] = true;
      justPressed[k] = true;
      hideSplash();
      // As teclas do passeio rolam a página do iframe (setas/espaço) — segura.
      if (k === ' ' || k.indexOf('arrow') === 0) {
        try { e.preventDefault(); } catch (err) {}
      }
    });
    window.addEventListener('keyup', function (e) {
      keys[String(e.key).toLowerCase()] = false;
    });
    window.addEventListener('contextmenu', function () { keys = {}; });
    window.addEventListener('blur', function () { keys = {}; });
  }

  // ---- Tela (stage + letterbox + splash "clique para começar") ----

  function buildCss() {
    return '#szw3d-stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0f14;z-index:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif}' +
      '#szw3d-frame{position:relative}' +
      '#szw3d-canvas{display:block;background:#0b0f14}' +
      '.szw3d-splash{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(8,12,18,0.5);color:#fff;text-align:center;z-index:5;transition:opacity .3s}' +
      '.szw3d-splash h1{margin:0;font-size:34px;text-shadow:0 2px 12px rgba(0,0,0,.5)}' +
      '.szw3d-splash p{margin:0;font-size:15px;opacity:.85}' +
      '.szw3d-splash button{font:inherit;font-size:17px;font-weight:700;padding:10px 26px;border-radius:999px;border:0;cursor:pointer;background:#10b981;color:#04281d}' +
      '.szw3d-splash button:hover{background:#34d399}' +
      '.szw3d-hidden{opacity:0;pointer-events:none}';
  }

  function ensureShell() {
    if (shellReady) return true;
    try {
      if (typeof document === 'undefined' || !document || !document.body) return false;

      styleEl = document.createElement('style');
      styleEl.id = 'szw3d-style';
      styleEl.textContent = buildCss();
      document.head.appendChild(styleEl);

      stageEl = document.createElement('div');
      stageEl.id = 'szw3d-stage';
      frameEl = document.createElement('div');
      frameEl.id = 'szw3d-frame';
      canvasEl = document.createElement('canvas');
      canvasEl.id = 'szw3d-canvas';
      canvasEl.width = config.w;
      canvasEl.height = config.h;
      frameEl.appendChild(canvasEl);
      stageEl.appendChild(frameEl);
      document.body.appendChild(stageEl);

      splashEl = document.createElement('div');
      splashEl.className = 'szw3d-splash';
      var h1 = document.createElement('h1');
      h1.textContent = 'Meu Mundo 3D';
      var p = document.createElement('p');
      p.textContent = 'WASD ou setas dirigem · espaço pula';
      var btn = document.createElement('button');
      btn.textContent = 'Começar o passeio';
      btn.addEventListener('click', function () { hideSplash(); });
      splashEl.appendChild(h1);
      splashEl.appendChild(p);
      splashEl.appendChild(btn);
      frameEl.appendChild(splashEl);

      shellReady = true;
      return true;
    } catch (e) {
      warn('não consegui montar a tela do mundo: ' + e);
      return false;
    }
  }

  function hideSplash() {
    if (splashEl) splashEl.classList.add('szw3d-hidden');
  }

  /** Canvas responsivo: resolução interna fixa + letterbox por CSS. */
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

  // ---- Mundo three (renderer/céu/luz/terreno) — só no start ----

  function initWorld() {
    if (worldReady) return true;
    try {
      var st = styleOf();

      renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasEl });
      // Resolução interna FIXA (as contas do aluno nunca mudam com a janela).
      renderer.setPixelRatio(1);
      renderer.setSize(config.w, config.h, false);
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;

      scene = new THREE.Scene();
      applySky();
      if (THREE.Fog) {
        scene.fog = new THREE.Fog(st.fog, config.world * 0.45, config.world * 1.5);
      }

      camera = new THREE.PerspectiveCamera(60, config.w / config.h, 0.1, Math.max(600, config.world * 4));
      _look = new THREE.Vector3(0, 0, 0);

      ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      var sun = new THREE.DirectionalLight(0xffffff, 1.05);
      sunLight = sun;
      sun.position.set(config.world * 0.25, config.world * 0.4, config.world * 0.18);
      sun.castShadow = true;
      if (sun.shadow && sun.shadow.camera) {
        // Frustum PEQUENO que SEGUE o carro (updateSun): sombra nítida num mundo
        // grande — o segredo do folio. O ortho cobre só ~45 m ao redor.
        var half = 45;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = config.world * 1.6;
        sun.shadow.camera.left = -half;
        sun.shadow.camera.right = half;
        sun.shadow.camera.top = half;
        sun.shadow.camera.bottom = -half;
        if (sun.shadow.mapSize && sun.shadow.mapSize.set) sun.shadow.mapSize.set(2048, 2048);
        // Anti-acne: sem o bias, superfícies rasantes ficam listradas.
        sun.shadow.normalBias = 0.05;
      }
      scene.add(sun);
      if (sun.target) {
        sunTarget = sun.target;
        scene.add(sunTarget);
      }

      buildTerrain();
      if (carCfg) buildCar();

      worldReady = true;
      return true;
    } catch (e) {
      warn('não consegui montar o mundo 3D: ' + e);
      return false;
    }
  }

  /** Céu = degradê vertical do estilo (canvas 2D → textura de fundo). */
  function applySky() {
    if (!scene) return;
    var st = styleOf();
    try {
      var cv = document.createElement('canvas');
      cv.width = 2;
      cv.height = 256;
      var g = cv.getContext('2d');
      if (!g) {
        scene.background = new THREE.Color(st.skyTop);
        return;
      }
      var grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, st.skyTop);
      grad.addColorStop(1, st.skyBot);
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 256);
      if (skyTex && skyTex.dispose) { try { skyTex.dispose(); } catch (e) {} }
      skyTex = new THREE.CanvasTexture(cv);
      scene.background = skyTex;
    } catch (e) {
      try { scene.background = new THREE.Color(st.skyTop); } catch (e2) {}
    }
  }

  /** 3 degraus de luz = o look toon/chapado (compartilhado pelos materiais). */
  function ensureGradientMap() {
    if (gradientTex) return gradientTex;
    try {
      var data = new Uint8Array([96, 176, 255]);
      var fmt = THREE.RedFormat || THREE.LuminanceFormat;
      gradientTex = new THREE.DataTexture(data, 3, 1, fmt);
      if (THREE.NearestFilter) {
        gradientTex.minFilter = THREE.NearestFilter;
        gradientTex.magFilter = THREE.NearestFilter;
      }
      gradientTex.needsUpdate = true;
    } catch (e) {
      gradientTex = null;
    }
    return gradientTex;
  }

  function toonMaterial(opts) {
    var grad = ensureGradientMap();
    if (THREE.MeshToonMaterial && grad) {
      var o = {};
      for (var k in opts) o[k] = opts[k];
      o.gradientMap = grad;
      return new THREE.MeshToonMaterial(o);
    }
    if (THREE.MeshLambertMaterial) return new THREE.MeshLambertMaterial(opts);
    return new THREE.MeshStandardMaterial(opts);
  }

  /**
   * O terreno: um PlaneGeometry deformado pela MESMA heightAt() que todo mundo
   * consulta, colorido por VÉRTICE (baixo→alto + encosta vira pedra) e com o
   * material toon. Rebuild descarta o antigo (higiene de GPU).
   */
  function buildTerrain() {
    if (!scene) return;
    if (terrainMesh) {
      try {
        scene.remove(terrainMesh);
        if (terrainMesh.geometry && terrainMesh.geometry.dispose) terrainMesh.geometry.dispose();
        if (terrainMesh.material && terrainMesh.material.dispose) terrainMesh.material.dispose();
      } catch (e) {}
      terrainMesh = null;
    }
    var st = styleOf();
    var SEG = 128;
    var geo = new THREE.PlaneGeometry(config.world, config.world, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var i;
    for (i = 0; i < pos.count; i++) {
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    // Cores por vértice: mistura baixo→alto pela altura; encosta puxa p/ pedra.
    var low = new THREE.Color(st.low);
    var high = new THREE.Color(st.high);
    var rock = new THREE.Color(st.rock);
    var tmp = new THREE.Color();
    var norm = geo.attributes.normal;
    var colors = new Float32Array(pos.count * 3);
    var span = Math.max(1, terrainCfg.hills * 1.15);
    for (i = 0; i < pos.count; i++) {
      var t = clamp((pos.getY(i) / span + 1) / 2, 0, 1);
      tmp.copy(low).lerp(high, t);
      var ny = norm.getY(i);
      var rockK = smoothstep(0.86, 0.62, ny);
      if (rockK > 0) tmp.lerp(rock, rockK);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var mat = toonMaterial({ vertexColors: true });
    terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
  }

  // ---- Carrinho (visual + física arcade na unha) ----

  function carStyleOf() {
    return CAR_STYLES[(carCfg && carCfg.style) || 'passeio'] || CAR_STYLES.passeio;
  }

  function disposeCar() {
    if (!carGroup) return;
    try {
      if (scene) scene.remove(carGroup);
      carGroup.traverse(function (o) {
        if (o.geometry && o.geometry.dispose) { try { o.geometry.dispose(); } catch (e) {} }
        if (o.material && o.material.dispose) { try { o.material.dispose(); } catch (e) {} }
      });
    } catch (e) {}
    carGroup = null;
    carBody = null;
    carWheels = [];
  }

  function buildCar() {
    if (!scene || !carCfg) return;
    disposeCar();
    var cs = carStyleOf();
    var color = text(carCfg.color, '#ef4444');

    carGroup = new THREE.Group();
    carBody = new THREE.Group();
    carGroup.add(carBody);

    var bodyMat = toonMaterial({ color: color });
    var darkMat = toonMaterial({ color: '#1f2937' });
    var glassMat = toonMaterial({ color: '#bfdbfe' });

    // Carroceria (senta sobre o vão livre; as peças são autoradas do chão p/ cima).
    var body = new THREE.Mesh(new THREE.BoxGeometry(cs.w, cs.h, cs.l), bodyMat);
    body.position.y = cs.clear + cs.h / 2;
    body.castShadow = true;
    carBody.add(body);

    // Cabine (um degrau em cima, puxada para trás).
    var cab = new THREE.Mesh(new THREE.BoxGeometry(cs.w * 0.78, cs.cab, cs.l * 0.42), glassMat);
    cab.position.set(0, cs.clear + cs.h + cs.cab / 2, -cs.l * 0.06);
    cab.castShadow = true;
    carBody.add(cab);

    // 4 rodas: as da FRENTE ficam num pivô próprio (esterço visual).
    var wheelGeo = new THREE.CylinderGeometry(cs.wheel, cs.wheel, 0.3, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    var xw = cs.w / 2 + 0.04;
    var zw = cs.l * 0.34;
    var corners = [
      { x: -xw, z: zw, front: true },
      { x: xw, z: zw, front: true },
      { x: -xw, z: -zw, front: false },
      { x: xw, z: -zw, front: false }
    ];
    carWheels = [];
    for (var i = 0; i < corners.length; i++) {
      var c = corners[i];
      var pivot = new THREE.Group();
      pivot.position.set(c.x, cs.wheel, c.z);
      var wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.castShadow = true;
      pivot.add(wheel);
      carGroup.add(pivot);
      carWheels.push({ mesh: wheel, pivot: pivot, front: c.front });
    }

    if (!carState) {
      carState = {
        x: 0, y: 0, z: 0, yaw: 0, speed: 0, vy: 0, airborne: false,
        steerVis: 0, pitch: 0, pitchV: 0, roll: 0, rollV: 0, spin: 0
      };
      carState.y = heightAt(0, 0);
    }
    camSnap = true;
    scene.add(carGroup);
  }

  function stepCar(dt) {
    if (!carState || !carCfg) return;
    var s = carState;
    var cs = carStyleOf();
    var top = num(carCfg.speed, cs.speed);
    var turnDeg = num(carCfg.turn, cs.turn);
    var jump = num(carCfg.jump, cs.jump);
    var grip = styleOf().grip;

    var accelIn = ((isDown('w') || isDown('arrowup')) ? 1 : 0) - ((isDown('s') || isDown('arrowdown')) ? 1 : 0);
    var steerIn = ((isDown('a') || isDown('arrowleft')) ? 1 : 0) - ((isDown('d') || isDown('arrowright')) ? 1 : 0);

    // Aceleração/freio + arrasto natural. Na neve tudo responde mais devagar.
    var acc = 16 * (0.5 + 0.5 * grip);
    if (accelIn > 0) s.speed += acc * dt;
    else if (accelIn < 0) s.speed -= acc * 0.95 * dt;
    else s.speed -= s.speed * Math.min(1, (0.9 + 0.7 * grip) * dt);
    s.speed = clamp(s.speed, -top * 0.45, top);

    // Curva: parado não vira; muito rápido vira menos (estabilidade arcade).
    var spdK = Math.min(1, Math.abs(s.speed) / (top * 0.22));
    var hiK = Math.max(0.35, 1 - Math.abs(s.speed) / (top * 1.7));
    var turnRate = (turnDeg * Math.PI / 180) * spdK * hiK * (0.55 + 0.45 * grip);
    var rev = s.speed >= 0 ? 1 : -1;
    s.yaw += steerIn * turnRate * rev * dt;

    // Avanço ao longo da frente (+Z do grupo, yaw 0 olha para +Z).
    s.x += Math.sin(s.yaw) * s.speed * dt;
    s.z += Math.cos(s.yaw) * s.speed * dt;

    // Bordas do mundo: para com um empurrãozinho de volta (queda vem depois).
    var lim = config.world / 2 - 2;
    if (s.x > lim) { s.x = lim; s.speed *= 0.35; }
    if (s.x < -lim) { s.x = -lim; s.speed *= 0.35; }
    if (s.z > lim) { s.z = lim; s.speed *= 0.35; }
    if (s.z < -lim) { s.z = -lim; s.speed *= 0.35; }

    // Chão + pulo: no chão a altura SEGUE o terreno; no ar, gravidade.
    var gy = heightAt(s.x, s.z);
    var landed = false;
    if (s.airborne) {
      s.vy -= GRAV * dt;
      s.y += s.vy * dt;
      if (s.y <= gy) {
        s.y = gy;
        s.airborne = false;
        landed = true;
        // Aterrissagem "afunda" o molejo proporcional à queda.
        s.pitchV += Math.min(2.5, Math.abs(s.vy) * 0.12);
        s.vy = 0;
      }
    } else {
      // Rampa para baixo em alta velocidade = decola de leve (o pulo do folio).
      var dy = gy - s.y;
      if (dy < -0.5 && Math.abs(s.speed) > top * 0.55) {
        s.airborne = true;
        s.vy = 0;
      } else {
        s.y = gy;
      }
      if (isJust(' ')) {
        s.vy = jump;
        s.airborne = true;
      }
    }

    // ---- Molejo COSMÉTICO (mola-amortecedor de pitch/roll na carroceria) ----
    var n = s.airborne ? null : groundNormalAt(s.x, s.z);
    // Alvos: inclinação do terreno (projetada nos eixos do carro) + reação de
    // acelerar (levanta o nariz) e de curvar (deita para fora da curva).
    var sinY = Math.sin(s.yaw);
    var cosY = Math.cos(s.yaw);
    var slopePitch = 0;
    var slopeRoll = 0;
    if (n) {
      slopePitch = (n.x * sinY + n.z * cosY) * 1.4;
      slopeRoll = (n.x * cosY - n.z * sinY) * 1.4;
    }
    var pitchTarget = slopePitch - accelIn * Math.min(1, Math.abs(s.speed) / top + 0.3) * 0.06;
    var rollTarget = slopeRoll + steerIn * rev * Math.min(1, Math.abs(s.speed) / top) * 0.1;
    var K = 42;
    var D = 9;
    s.pitchV += ((pitchTarget - s.pitch) * K - s.pitchV * D) * dt;
    s.pitch += s.pitchV * dt;
    s.rollV += ((rollTarget - s.roll) * K - s.rollV * D) * dt;
    s.roll += s.rollV * dt;

    // ---- Aplica no visual ----
    if (carGroup) {
      carGroup.position.set(s.x, s.y, s.z);
      carGroup.rotation.y = s.yaw;
      if (carBody) {
        carBody.rotation.x = clamp(s.pitch, -0.5, 0.5);
        carBody.rotation.z = clamp(s.roll, -0.5, 0.5);
      }
      s.steerVis += (steerIn - s.steerVis) * Math.min(1, 10 * dt);
      var cs2 = carStyleOf();
      s.spin += (s.speed / Math.max(0.05, cs2.wheel)) * dt;
      for (var i = 0; i < carWheels.length; i++) {
        var w = carWheels[i];
        w.mesh.rotation.x = s.spin;
        if (w.front) w.pivot.rotation.y = s.steerVis * 0.42;
      }
    }
    if (landed && carBody) carBody.position.y = -0.03;
    else if (carBody && carBody.position.y !== 0) {
      carBody.position.y += (0 - carBody.position.y) * Math.min(1, 8 * dt);
    }
  }

  // ---- Câmera (segue o carro com zoom por velocidade; sem carro, orbita) ----

  function updateCamera(dt) {
    if (!camera) return;
    if (carState) {
      var s = carState;
      var dist = 7.5 + Math.abs(s.speed) * 0.12;
      var h = 3.1 + Math.abs(s.speed) * 0.03;
      var bx = s.x - Math.sin(s.yaw) * dist;
      var bz = s.z - Math.cos(s.yaw) * dist;
      var by = s.y + h;
      // A câmera nunca entra no morro: respeita o chão dela + 1.2 m.
      var minY = heightAt(bx, bz) + 1.2;
      if (by < minY) by = minY;
      if (camSnap) {
        camera.position.set(bx, by, bz);
        _look.set(s.x, s.y + 1.1, s.z);
        camSnap = false;
      } else {
        var k = damp(4.5, dt);
        camera.position.x += (bx - camera.position.x) * k;
        camera.position.y += (by - camera.position.y) * k;
        camera.position.z += (bz - camera.position.z) * k;
        var k2 = damp(8, dt);
        _look.x += (s.x - _look.x) * k2;
        _look.y += (s.y + 1.1 - _look.y) * k2;
        _look.z += (s.z - _look.z) * k2;
      }
      camera.lookAt(_look);
    } else {
      // Sem carrinho: sobrevoo lento do mundo (projetos "só cenário" ficam vivos).
      _autoAngle += dt * 0.12;
      var r = config.world * 0.32;
      camera.position.set(Math.cos(_autoAngle) * r, config.world * 0.16, Math.sin(_autoAngle) * r);
      _look.set(0, 0, 0);
      camera.lookAt(_look);
    }
  }

  /** O sol acompanha o carro: frustum de sombra pequeno + mundo grande. */
  function updateSun() {
    if (!sunLight || !carState) return;
    var s = carState;
    sunLight.position.set(s.x + config.world * 0.22, config.world * 0.35, s.z + config.world * 0.16);
    if (sunTarget) {
      sunTarget.position.set(s.x, 0, s.z);
      if (sunTarget.updateMatrixWorld) sunTarget.updateMatrixWorld();
    }
  }

  // ---- Laço principal ----

  function gameLoop(t) {
    var nowT = typeof t === 'number' ? t : 0;
    var dt = _lastT ? (nowT - _lastT) / 1000 : 0;
    _lastT = nowT;
    if (!(dt >= 0)) dt = 0;
    // Clamp (1/30): aba em segundo plano não teleporta o mundo.
    if (dt > 1 / 30) dt = 1 / 30;
    currentDt = dt;
    playTime += dt;

    stepCar(dt);
    for (var i = 0; i < updateHooks.length; i++) {
      try { updateHooks[i](dt); } catch (e) {
        warnOnce('hook-update-' + i, 'erro no "A cada quadro": ' + e);
      }
    }
    updateCamera(dt);
    updateSun();

    justPressed = {};
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  // ---- Começar (shell -> mundo -> input -> resize -> loop) ----

  function start() {
    if (started) {
      warn('o passeio já começou — use "Começar o passeio" uma vez só');
      return;
    }
    if (!ensureShell()) {
      try {
        document.addEventListener('DOMContentLoaded', function () { start(); });
      } catch (e) {}
      return;
    }
    if (!initWorld()) return;
    started = true;
    bindInput();
    resizeCanvas();
    window.addEventListener('resize', function () { resizeCanvas(); });
    Promise.all(pending.slice()).then(function () {
      _lastT = 0;
      renderer.setAnimationLoop(gameLoop);
    });
  }

  // ---- Dispose (higiene de GPU — o preview recria o iframe a cada Atualizar) ----

  function disposeAll() {
    if (disposed) return;
    disposed = true;
    try {
      if (renderer) {
        renderer.setAnimationLoop(null);
        try { renderer.dispose(); } catch (e) {}
        // dispose() sozinho NÃO devolve o contexto WebGL ao navegador — é o
        // forceContextLoss() que libera o slot.
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
      if (skyTex && skyTex.dispose) { try { skyTex.dispose(); } catch (e) {} }
      if (gradientTex && gradientTex.dispose) { try { gradientTex.dispose(); } catch (e) {} }
      if (stageEl && stageEl.parentNode) { try { stageEl.parentNode.removeChild(stageEl); } catch (e) {} }
      if (styleEl && styleEl.parentNode) { try { styleEl.parentNode.removeChild(styleEl); } catch (e) {} }
    } catch (e) {}
    renderer = null;
    scene = null;
    camera = null;
    terrainMesh = null;
    carGroup = null;
    carBody = null;
    carWheels = [];
    skyTex = null;
    gradientTex = null;
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', disposeAll);
    window.addEventListener('beforeunload', disposeAll);
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
    // 🌍 Mundo
    setup: guard('setup', function (opts) {
      var o = (opts && typeof opts === 'object') ? opts : {};
      if (started) {
        warn('"Criar o mundo 3D" depois de começar não muda o mundo — deixe-o no comecinho');
        return;
      }
      var st = text(o.style, config.style);
      if (!STYLES[st]) {
        warn('não conheço o estilo "' + st + '" — usando floresta (tem: floresta, praia, neve, deserto, primavera)');
        st = 'floresta';
      }
      config.style = st;
      config.world = clamp(num(o.world, config.world), 40, 600);
    }),
    terrain: guard('terrain', function (hills, smooth) {
      terrainCfg.hills = clamp(num(hills, terrainCfg.hills), 0, 30);
      terrainCfg.smooth = clamp(num(smooth, terrainCfg.smooth), 1, 30);
      // Depois do start, reconstrói na hora (ordem dos blocos nunca prende ninguém).
      if (worldReady) buildTerrain();
    }),
    start: guard('start', start),
    worldSize: guard('worldSize', function () {
      return config.world;
    }),
    groundHeight: guard('groundHeight', function (x, z) {
      return heightAt(num(x, 0), num(z, 0));
    }),

    // 🚗 Carrinho
    car: guard('car', function (opts) {
      var o = (opts && typeof opts === 'object') ? opts : {};
      var st = text(o.style, 'passeio');
      if (!CAR_STYLES[st]) {
        warn('não conheço o carrinho "' + st + '" — usando passeio (tem: passeio, jipe, corrida)');
        st = 'passeio';
      }
      var cs = CAR_STYLES[st];
      carCfg = {
        style: st,
        color: text(o.color, '#ef4444'),
        speed: cs.speed,
        turn: cs.turn,
        jump: cs.jump
      };
      if (worldReady) buildCar();
    }),
    carStats: guard('carStats', function (speed, turn, jump) {
      if (!carCfg) {
        warn('ajuste DEPOIS de "Criar o carrinho dirigível"');
        return;
      }
      carCfg.speed = clamp(num(speed, carCfg.speed), 1, 80);
      carCfg.turn = clamp(num(turn, carCfg.turn), 10, 360);
      carCfg.jump = clamp(num(jump, carCfg.jump), 0, 30);
    }),
    carPlace: guard('carPlace', function (x, z, deg) {
      if (!carState) {
        warn('leve o carrinho DEPOIS de "Criar o carrinho dirigível"');
        return;
      }
      var lim = config.world / 2 - 2;
      carState.x = clamp(num(x, 0), -lim, lim);
      carState.z = clamp(num(z, 0), -lim, lim);
      carState.yaw = num(deg, 0) * Math.PI / 180;
      carState.y = heightAt(carState.x, carState.z);
      carState.speed = 0;
      carState.vy = 0;
      carState.airborne = false;
      camSnap = true;
    }),
    carPos: guard('carPos', function (axis) {
      if (!carState) return 0;
      var a = text(axis, 'x');
      if (a === 'y') return carState.y;
      if (a === 'z') return carState.z;
      return carState.x;
    }),
    carSpeed: guard('carSpeed', function () {
      return carState ? Math.abs(carState.speed) : 0;
    }),

    // ⏱️ Jogo & tela
    onUpdate: guard('onUpdate', function (fn) {
      if (typeof fn !== 'function') {
        warn('"A cada quadro" precisa de um bloco de fazer dentro');
        return;
      }
      updateHooks.push(fn);
    }),
    keyDown: guard('keyDown', function (k) {
      return isDown(keyName(k));
    }),
    keyPressed: guard('keyPressed', function (k) {
      return isJust(keyName(k));
    })
  };

  if (typeof window !== 'undefined') {
    window.SZWorld3D = api;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.SZWorld3D = api;
  }
})();
`
