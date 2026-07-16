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
    style: 'floresta',
    // Efeitos de cinema (pós-processamento próprio, sem addons): ligados por
    // padrão — são a identidade do mundo. setEffects/turbo desligam.
    bloom: true,
    bloomStrength: 1.0,
    vignette: true
  };
  var terrainCfg = {
    hills: 2.5,   // altura dos morros (m) — o default dá um mundo levemente ondulado
    smooth: 6     // "tamanho" de cada morro (maior = colinas largas)
  };

  // Paletas por estilo: céu (topo/horizonte), chão (baixo/alto), pedra, névoa e
  // o quanto o chão agarra (a neve escorrega DE PROPÓSITO).
  var STYLES = {
    floresta:  { skyTop: '#6db8f2', skyBot: '#e8f4d2', low: '#3e7c3a', high: '#7ca63f', rock: '#8a8f7e', fog: '#cfe4c8', grip: 1, grass: ['#2f6b2f', '#8fc24a'], grassK: 1 },
    praia:     { skyTop: '#5fc0ee', skyBot: '#fdeec9', low: '#e3cb8d', high: '#d2b268', rock: '#b3a284', fog: '#f2e4c2', grip: 1, grass: ['#7ea35a', '#c9d97a'], grassK: 0.5 },
    neve:      { skyTop: '#9dbcdd', skyBot: '#eef4fb', low: '#dfe8f2', high: '#ffffff', rock: '#9fb0c0', fog: '#e3ecf6', grip: 0.45, grass: ['#b9c8d8', '#eef4fb'], grassK: 0.25 },
    deserto:   { skyTop: '#74aee6', skyBot: '#f6d8a6', low: '#d3a05c', high: '#e6c079', rock: '#a3794c', fog: '#ecd8ae', grip: 1, grass: ['#8a8a4a', '#c9c96a'], grassK: 0.2 },
    primavera: { skyTop: '#85cbf4', skyBot: '#f8e2ef', low: '#579a49', high: '#8cc061', rock: '#96917f', fog: '#e1eed6', grip: 1, grass: ['#3f7a3a', '#9ed36a'], grassK: 1 }
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
  // Natureza: RECEITAS (os blocos só anotam; o start constrói — ordem livre).
  var natureRecipes = [];       // { kind, thing/name, n, s, x, z, deg, seed, model, built }
  var exclusions = [];          // { x, z, r } — "Deixar limpo" (o centro já é implícito)
  var natureGroup = null;       // raiz de tudo que foi espalhado/posto
  var scatterBudget = 12000;    // teto TOTAL de instâncias espalhadas (higiene de GPU)
  var scatterCount = 0;
  var placedCount = 0;
  var MAX_PLACED = 200;         // "Pôr 1" é para cantinhos especiais, não para florestas
  var crashHooks = [];
  var _crashCd = 0;             // segundos até a próxima batida poder disparar
  var _dummy = null;            // Object3D p/ compor matrizes de instância
  var _mat4 = null;
  var UNIT_GEOS = null;         // geometrias unitárias compartilhadas das espécies
  var speciesMats = null;       // materiais toon compartilhados por cor
  // Grade de colisores ESTÁTICOS (só insere no build; o carro consulta por raio).
  var COLL_GRID_DIM = 24;
  var collCells = Object.create(null);
  var collStamp = 0;
  var collResults = [];
  // Modelos .glb do projeto (data:URL semeada pelo assetsBridge) + cache de parse.
  var MODELS3D = (typeof window !== 'undefined' && window.__SZGAME_ASSETS_3D && typeof window.__SZGAME_ASSETS_3D === 'object')
    ? window.__SZGAME_ASSETS_3D
    : {};
  var _gltfMod = null;
  var _modelCache = null;       // nome -> { scene } já parseado
  var _modelPending = null;     // nome -> fila de callbacks (parse em voo)
  // Pós-processamento (mini-composer próprio) + grama + qualidade adaptativa.
  var composer = null;
  var composerFailed = false;   // WebGL/targets falharam -> render direto p/ sempre
  var grassCfg = null;          // { amount: 'pouca'|'media'|'muita' }
  var grassMesh = null;
  var grassMat = null;
  var heightTex = null;         // DataTexture 8-bit da altura (a grama lê no vertex)
  var wind = 1;                 // força do vento (o bloco de vento chega na R4)
  // Qualidade: 'alta' | 'turbo' (auto: mede o FPS nos primeiros segundos).
  var quality = { tier: 'alta', auto: true, decided: false, probeT: 0, fpsAcc: 0, fpsN: 0 };

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

  /** RNG semeado (mulberry32): a natureza espalhada cai SEMPRE nos mesmos lugares. */
  function mulberry(seed) {
    var s = seed | 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Colisores estáticos (grade esparsa no plano XZ, só-insere) ----

  function collIndex(v) {
    var half = config.world / 2;
    var t = (v + half) / (config.world || 1);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var i = Math.floor(t * COLL_GRID_DIM);
    return i >= COLL_GRID_DIM ? COLL_GRID_DIM - 1 : i;
  }

  function colliderAdd(x, z, r) {
    var c = { x: x, z: z, r: r, _stamp: 0 };
    var x0 = collIndex(x - r);
    var z0 = collIndex(z - r);
    var x1 = collIndex(x + r);
    var z1 = collIndex(z + r);
    for (var gx = x0; gx <= x1; gx++) {
      for (var gz = z0; gz <= z1; gz++) {
        var k = gx + ',' + gz;
        (collCells[k] || (collCells[k] = [])).push(c);
      }
    }
  }

  /** Colisores num raio (broad-phase; dedup por carimbo, buffer reusado). */
  function collidersNear(x, z, radius) {
    collStamp++;
    collResults.length = 0;
    var x0 = collIndex(x - radius);
    var z0 = collIndex(z - radius);
    var x1 = collIndex(x + radius);
    var z1 = collIndex(z + radius);
    for (var gx = x0; gx <= x1; gx++) {
      for (var gz = z0; gz <= z1; gz++) {
        var cell = collCells[gx + ',' + gz];
        if (!cell) continue;
        for (var i = 0; i < cell.length; i++) {
          var c = cell[i];
          if (c._stamp !== collStamp) {
            c._stamp = collStamp;
            collResults.push(c);
          }
        }
      }
    }
    return collResults;
  }

  // ---- 🌿 Natureza (espécies procedurais low-poly + instancing) ----

  /**
   * Cada espécie é uma lista de PEÇAS sobre geometrias unitárias compartilhadas
   * (1 InstancedMesh por peça → uma floresta de 300 árvores custa 3 draw calls).
   * color '' = a cor de pedra do ESTILO do mundo. collR 0 = passa por cima.
   */
  var SPECIES = {
    arvores: {
      collR: 0.55, smin: 0.8, smax: 1.5,
      parts: [
        { g: 'cyl', color: '#7c4a2d', x: 0, y: 0.8, z: 0, sx: 0.36, sy: 1.6, sz: 0.36 },
        { g: 'ico', color: '#3e8f3e', x: 0, y: 2.3, z: 0, sx: 2.4, sy: 2.2, sz: 2.4 },
        { g: 'ico', color: '#57a344', x: 0.6, y: 1.7, z: 0.3, sx: 1.5, sy: 1.3, sz: 1.5 }
      ]
    },
    pinheiros: {
      collR: 0.5, smin: 0.9, smax: 1.7,
      parts: [
        { g: 'cyl', color: '#6b4226', x: 0, y: 0.5, z: 0, sx: 0.3, sy: 1, sz: 0.3 },
        { g: 'cone', color: '#2d6a34', x: 0, y: 1.7, z: 0, sx: 2.2, sy: 1.8, sz: 2.2 },
        { g: 'cone', color: '#357c3c', x: 0, y: 2.8, z: 0, sx: 1.7, sy: 1.5, sz: 1.7 },
        { g: 'cone', color: '#3f8f46', x: 0, y: 3.7, z: 0, sx: 1.2, sy: 1.2, sz: 1.2 }
      ]
    },
    pedras: {
      collR: 0.7, smin: 0.5, smax: 1.6,
      parts: [{ g: 'ico', color: '', x: 0, y: 0.4, z: 0, sx: 1.6, sy: 1.0, sz: 1.3 }]
    },
    flores: {
      collR: 0, smin: 0.7, smax: 1.2,
      parts: [
        { g: 'cyl', color: '#3f9142', x: 0, y: 0.25, z: 0, sx: 0.07, sy: 0.5, sz: 0.07 },
        { g: 'ico', color: '#f472b6', x: 0, y: 0.55, z: 0, sx: 0.3, sy: 0.3, sz: 0.3 }
      ]
    },
    cogumelos: {
      collR: 0, smin: 0.5, smax: 1.1,
      parts: [
        { g: 'cyl', color: '#f5e6cf', x: 0, y: 0.22, z: 0, sx: 0.22, sy: 0.44, sz: 0.22 },
        { g: 'sph', color: '#dc2626', x: 0, y: 0.5, z: 0, sx: 0.7, sy: 0.4, sz: 0.7 }
      ]
    },
    cactos: {
      collR: 0.4, smin: 0.8, smax: 1.4,
      parts: [
        { g: 'cyl', color: '#3f9142', x: 0, y: 0.9, z: 0, sx: 0.5, sy: 1.8, sz: 0.5 },
        { g: 'cyl', color: '#357c3c', x: 0.55, y: 1.1, z: 0, sx: 0.3, sy: 0.7, sz: 0.3 },
        { g: 'cyl', color: '#357c3c', x: -0.55, y: 0.85, z: 0, sx: 0.3, sy: 0.6, sz: 0.3 }
      ]
    }
  };

  function ensureUnitGeos() {
    if (UNIT_GEOS) return UNIT_GEOS;
    UNIT_GEOS = {
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      cone: new THREE.ConeGeometry(0.5, 1, 9),
      ico: new THREE.IcosahedronGeometry(0.5, 0),
      sph: new THREE.SphereGeometry(0.5, 7, 6)
    };
    return UNIT_GEOS;
  }

  function speciesMat(color) {
    if (!speciesMats) speciesMats = {};
    if (!speciesMats[color]) speciesMats[color] = toonMaterial({ color: color });
    return speciesMats[color];
  }

  /** Matrizes locais das peças da espécie (compostas uma vez, cacheadas nela). */
  function speciesLocals(spec) {
    if (spec._locals) return spec._locals;
    spec._locals = [];
    var q = new THREE.Quaternion();
    for (var i = 0; i < spec.parts.length; i++) {
      var p = spec.parts[i];
      var m = new THREE.Matrix4();
      m.compose(
        new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0),
        q,
        new THREE.Vector3(p.sx || 1, p.sy || 1, p.sz || 1)
      );
      spec._locals.push(m);
    }
    return spec._locals;
  }

  function inExclusion(x, z) {
    if (Math.sqrt(x * x + z * z) < 10) return true; // o spawn nasce limpo
    for (var i = 0; i < exclusions.length; i++) {
      var e = exclusions[i];
      var dx = x - e.x;
      var dz = z - e.z;
      if (dx * dx + dz * dz < e.r * e.r) return true;
    }
    return false;
  }

  function ensureNatureGroup() {
    if (!natureGroup) {
      natureGroup = new THREE.Group();
      scene.add(natureGroup);
    }
    return natureGroup;
  }

  function ensureDummies() {
    if (!_dummy) _dummy = new THREE.Object3D();
    if (!_mat4) _mat4 = new THREE.Matrix4();
  }

  function composeInstance(mesh, i, x, y, z, yaw, s, local) {
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(0, yaw, 0);
    _dummy.scale.set(s, s, s);
    _dummy.updateMatrix();
    _mat4.multiplyMatrices(_dummy.matrix, local);
    mesh.setMatrixAt(i, _mat4);
  }

  /** Sorteia os lugares de uma receita (fora das áreas limpas), semeado. */
  function samplePlacements(rec, want, smin, smax) {
    var rng = mulberry(4242 + rec.seed * 101);
    var lim = config.world / 2 - 3;
    var placements = [];
    var attempts = want * 10;
    while (placements.length < want && attempts-- > 0) {
      var x = (rng() * 2 - 1) * lim;
      var z = (rng() * 2 - 1) * lim;
      if (inExclusion(x, z)) continue;
      placements.push({
        x: x,
        z: z,
        yaw: rng() * Math.PI * 2,
        s: smin + rng() * (smax - smin)
      });
    }
    return placements;
  }

  function takeScatterRoom(want) {
    var room = scatterBudget - scatterCount;
    if (room <= 0) {
      warnOnce('scatter-budget', 'o mundo está cheio — teto de ' + scatterBudget + ' coisas espalhadas (para o passeio continuar liso)');
      return 0;
    }
    if (want > room) {
      warnOnce('scatter-budget', 'faltou espaço para tudo — espalhei só ' + room + ' (teto de ' + scatterBudget + ' coisas)');
      return room;
    }
    return want;
  }

  function buildSpeciesRecipe(rec) {
    var spec = SPECIES[rec.thing];
    if (!spec || !scene) return;
    var want = takeScatterRoom(Math.floor(clamp(num(rec.n, 0), 1, 3000)));
    if (want <= 0) return;
    var placements = samplePlacements(rec, want, spec.smin, spec.smax);
    if (!placements.length) return;
    scatterCount += placements.length;
    ensureUnitGeos();
    ensureDummies();
    var locals = speciesLocals(spec);
    var group = ensureNatureGroup();
    for (var p = 0; p < spec.parts.length; p++) {
      var part = spec.parts[p];
      var mesh = new THREE.InstancedMesh(UNIT_GEOS[part.g], speciesMat(part.color || styleOf().rock), placements.length);
      mesh.castShadow = true;
      for (var i = 0; i < placements.length; i++) {
        var pl = placements[i];
        composeInstance(mesh, i, pl.x, heightAt(pl.x, pl.z), pl.z, pl.yaw, pl.s, locals[p]);
      }
      if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }
    if (spec.collR > 0) {
      for (var c = 0; c < placements.length; c++) {
        colliderAdd(placements[c].x, placements[c].z, spec.collR * placements[c].s);
      }
    }
  }

  function buildPlaceSpecies(rec) {
    var spec = SPECIES[rec.thing];
    if (!spec || !scene) return;
    if (placedCount >= MAX_PLACED) {
      warnOnce('placed-max', 'muitos "Pôr 1" — o teto é ' + MAX_PLACED + ' (para florestas, use o Espalhar)');
      return;
    }
    placedCount++;
    ensureUnitGeos();
    var g = new THREE.Group();
    for (var i = 0; i < spec.parts.length; i++) {
      var part = spec.parts[i];
      var mesh = new THREE.Mesh(UNIT_GEOS[part.g], speciesMat(part.color || styleOf().rock));
      mesh.position.set(part.x || 0, part.y || 0, part.z || 0);
      mesh.scale.set(part.sx || 1, part.sy || 1, part.sz || 1);
      mesh.castShadow = true;
      g.add(mesh);
    }
    var s = clamp(num(rec.s, 1), 0.1, 10);
    g.scale.set(s, s, s);
    var lim = config.world / 2 - 1;
    var x = clamp(num(rec.x, 0), -lim, lim);
    var z = clamp(num(rec.z, 0), -lim, lim);
    g.position.set(x, heightAt(x, z), z);
    ensureNatureGroup().add(g);
    if (spec.collR > 0) colliderAdd(x, z, spec.collR * s);
  }

  // ---- Modelos .glb do projeto (parse de ArrayBuffer — a rede é morta) ----

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

  /** Aquece o modelo (compileAsync best-effort — nunca derruba o carregamento). */
  function warmModel(root) {
    if (!root || !renderer || !scene || !camera) return;
    try {
      if (renderer.compileAsync) renderer.compileAsync(root, camera, scene);
      else if (renderer.compile) renderer.compile(scene, camera);
    } catch (e) {}
  }

  /**
   * Carrega e parseia um .glb do projeto (cacheado; carga em voo enfileira o
   * callback). O start() ESPERA a promessa em pending — o passeio só começa com
   * os modelos remendados. NUNCA rejeita: modelo quebrado avisa e segue.
   */
  function loadModel(name, onReady) {
    var k = text(name, '');
    if (!k) {
      warn('escreva o NOME do modelo (o nome dele no painel de imagens → modelos 3D)');
      return null;
    }
    if (!_modelCache) _modelCache = {};
    if (_modelCache[k]) return _modelCache[k];
    if (!_modelPending) _modelPending = {};
    if (_modelPending[k]) {
      if (typeof onReady === 'function') _modelPending[k].push(onReady);
      return null;
    }
    var entry = MODELS3D[k];
    if (!entry || entry.kind !== 'model3d') {
      warn('o modelo "' + k + '" não está no projeto — envie o .glb no painel de imagens');
      return null;
    }
    var buf = dataUrlToBuffer(entry.dataUrl);
    if (!buf) return null;
    _modelPending[k] = typeof onReady === 'function' ? [onReady] : [];
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
            _modelCache[k] = { scene: gltf.scene };
            warmModel(gltf.scene);
            flush(_modelCache[k]);
          } else {
            warn('o modelo "' + k + '" veio vazio');
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
    if (_gltfMod) {
      finish(_gltfMod);
      return null;
    }
    try {
      import('three/addons/loaders/GLTFLoader.js').then(finish, function (e) {
        warn('não consegui carregar o leitor de modelos: ' + e);
        flush(null);
      });
    } catch (e) {
      warn('não consegui carregar o leitor de modelos: ' + e);
      flush(null);
    }
    return null;
  }

  function modelMeshList(root) {
    var list = [];
    try {
      if (root.updateWorldMatrix) root.updateWorldMatrix(true, true);
      root.traverse(function (o) {
        if (o.isMesh && o.geometry) list.push(o);
      });
    } catch (e) {}
    return list;
  }

  /** Raio de colisão do modelo no plano XZ (metade da diagonal da caixa). */
  function modelRadius(root) {
    try {
      if (!THREE.Box3) return 0;
      var box = new THREE.Box3().setFromObject(root);
      var dx = box.max.x - box.min.x;
      var dz = box.max.z - box.min.z;
      return Math.sqrt(dx * dx + dz * dz) * 0.35;
    } catch (e) {
      return 0;
    }
  }

  function buildScatterModel(rec) {
    if (!rec.model || !rec.model.scene || !scene) return;
    var want = takeScatterRoom(Math.floor(clamp(num(rec.n, 0), 1, 500)));
    if (want <= 0) return;
    var s = clamp(num(rec.s, 1), 0.05, 20);
    var placements = samplePlacements(rec, want, s * 0.9, s * 1.15);
    if (!placements.length) return;
    scatterCount += placements.length;
    var meshes = modelMeshList(rec.model.scene);
    if (!meshes.length) {
      warn('o modelo "' + rec.name + '" não tem malhas — nada para espalhar');
      return;
    }
    ensureDummies();
    var group = ensureNatureGroup();
    for (var m = 0; m < meshes.length; m++) {
      var src = meshes[m];
      var inst = new THREE.InstancedMesh(src.geometry, src.material, placements.length);
      inst.castShadow = true;
      for (var i = 0; i < placements.length; i++) {
        var pl = placements[i];
        _dummy.position.set(pl.x, heightAt(pl.x, pl.z), pl.z);
        _dummy.rotation.set(0, pl.yaw, 0);
        _dummy.scale.set(pl.s, pl.s, pl.s);
        _dummy.updateMatrix();
        _mat4.multiplyMatrices(_dummy.matrix, src.matrixWorld);
        inst.setMatrixAt(i, _mat4);
      }
      if (inst.instanceMatrix) inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
    }
    var r = modelRadius(rec.model.scene);
    if (r > 0.35) {
      for (var c = 0; c < placements.length; c++) {
        colliderAdd(placements[c].x, placements[c].z, r * placements[c].s);
      }
    }
  }

  function buildPlaceModel(rec) {
    if (!rec.model || !rec.model.scene || !scene) return;
    if (placedCount >= MAX_PLACED) {
      warnOnce('placed-max', 'muitos "Pôr" — o teto é ' + MAX_PLACED);
      return;
    }
    placedCount++;
    var root = rec.model.scene.clone();
    try {
      root.traverse(function (o) {
        if (o.isMesh) o.castShadow = true;
      });
    } catch (e) {}
    var s = clamp(num(rec.s, 1), 0.05, 20);
    root.scale.set(s, s, s);
    var lim = config.world / 2 - 1;
    var x = clamp(num(rec.x, 0), -lim, lim);
    var z = clamp(num(rec.z, 0), -lim, lim);
    root.position.set(x, heightAt(x, z), z);
    root.rotation.y = num(rec.deg, 0) * Math.PI / 180;
    ensureNatureGroup().add(root);
    var r = modelRadius(rec.model.scene);
    if (r > 0.35) colliderAdd(x, z, r * s);
  }

  function buildRecipe(rec) {
    if (rec.built) return;
    if (rec.kind === 'species') {
      rec.built = true;
      buildSpeciesRecipe(rec);
    } else if (rec.kind === 'placeSpecies') {
      rec.built = true;
      buildPlaceSpecies(rec);
    } else if (rec.kind === 'model' || rec.kind === 'placeModel') {
      if (!rec.model) return; // constrói quando o parse do .glb chegar
      rec.built = true;
      if (rec.kind === 'model') buildScatterModel(rec);
      else buildPlaceModel(rec);
    }
  }

  function buildNature() {
    for (var i = 0; i < natureRecipes.length; i++) buildRecipe(natureRecipes[i]);
  }

  function fireCrash() {
    if (_crashCd > 0) return;
    _crashCd = 0.4;
    for (var i = 0; i < crashHooks.length; i++) {
      try { crashHooks[i](); } catch (e) {
        warnOnce('hook-crash-' + i, 'erro no "Quando o carrinho bater forte": ' + e);
      }
    }
  }

  // ---- 🎬 Mini-composer próprio (fork do Jogo 3D Avançado) ----
  // Bloom dual-filter (downsample Karis + upsample tent) + vinheta + ACES
  // (curva EXATA do three) + conversão sRGB no passe final. Com o composer
  // ligado a cena renderiza LINEAR (NoToneMapping) em HalfFloat; qualquer
  // falha cai no render direto para sempre (composerFailed).
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
      var src = c.rtScene;
      for (var i = 1; i <= BLOOM_LEVELS; i++) {
        c.matDown.uniforms.frameTexture.value = src.texture;
        c.matDown.uniforms.useKaris.value = i === 1;
        c.matDown.uniforms.resolution.value.set(src.width, src.height);
        quadPass(c.matDown, c.down[i]);
        src = c.down[i];
      }
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
    var wantFx = (config.bloom || config.vignette) && quality.tier !== 'turbo';
    if (wantFx && !composerFailed) {
      if (!composer) initComposer();
      if (composer) {
        if (grassMat) grassMat.uniforms.uGamma.value = 1.0;
        renderWithComposer();
        return;
      }
    }
    // Caminho direto (efeitos desligados/indisponíveis/turbo): ACES do renderer.
    // A grama (ShaderMaterial cru, fora do tone mapping) compensa o sRGB no uGamma.
    if (grassMat) grassMat.uniforms.uGamma.value = 0.4545;
    if (THREE.ACESFilmicToneMapping != null) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  // ---- 🌱 Grama ao vento (o show-piece do folio, na versão instanciada) ----
  // Um ÚNICO draw call: InstancedBufferGeometry de lâminas com offsets fixos
  // num quadrado de 2R×2R que SEGUE o carro por mod-wrap no vertex shader
  // (grama "infinita"), altura lida de uma DataTexture 8-bit da MESMA
  // heightAt(), vento por soma de senos, gradiente raiz→ponta e fade por
  // distância ESCALANDO a lâmina a zero (sem transparência).

  var GRASS_VSH = [
    'uniform float uTime;',
    'uniform float uWind;',
    'uniform vec2 uCenter;',
    'uniform float uRadius;',
    'uniform sampler2D uHeight;',
    'uniform float uHMin;',
    'uniform float uHRange;',
    'uniform float uWorld;',
    'attribute vec2 aOffset;',
    'attribute float aRand;',
    'varying float vY;',
    'varying float vRand;',
    'varying float vFade;',
    'void main() {',
    '  float span = uRadius * 2.0;',
    '  vec2 wp = uCenter + mod(aOffset - uCenter, vec2(span)) - vec2(uRadius);',
    '  vec2 dc = wp - uCenter;',
    '  float dist = length(dc);',
    '  float fade = 1.0 - smoothstep(uRadius * 0.72, uRadius * 0.98, dist);',
    '  float half2 = uWorld * 0.5 - 1.5;',
    '  if (abs(wp.x) > half2 || abs(wp.y) > half2) fade = 0.0;',
    '  vec2 huv = (wp + vec2(uWorld * 0.5)) / uWorld;',
    '  float gh = uHMin + texture2D(uHeight, huv).r * uHRange;',
    '  float ang = aRand * 6.2831853;',
    '  float ca = cos(ang);',
    '  float sa = sin(ang);',
    '  vec3 pos = position;',
    // Altura de CANELA (o look do folio): grama alta demais engolia o carrinho.
    '  float h = 0.42 + aRand * 0.35;',
    '  pos.y *= h;',
    '  pos = vec3(pos.x * ca, pos.y, pos.x * sa);',
    '  float sway = sin(uTime * 1.6 + wp.x * 0.35 + wp.y * 0.27 + aRand * 6.28) * (0.1 + uWind * 0.22);',
    '  float bend = (pos.y * pos.y) / max(h * h, 0.0001);',
    '  pos.x += sway * bend;',
    '  pos.z += sway * bend * 0.6;',
    '  pos *= fade;',
    '  vec3 world = vec3(wp.x, gh, wp.y) + pos;',
    '  vY = position.y;',
    '  vRand = aRand;',
    '  vFade = dist / max(uRadius, 0.001);',
    '  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);',
    '}'
  ].join(' ');

  var GRASS_FSH = [
    'uniform vec3 uColorA;',
    'uniform vec3 uColorB;',
    'uniform vec3 uFog;',
    'uniform float uGamma;',
    'varying float vY;',
    'varying float vRand;',
    'varying float vFade;',
    'void main() {',
    '  vec3 col = mix(uColorA, uColorB, clamp(vY, 0.0, 1.0));',
    '  col *= 0.92 + vRand * 0.16;',
    '  col = mix(col, uFog, smoothstep(0.7, 1.0, vFade) * 0.6);',
    '  col = pow(col, vec3(uGamma));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join(' ');

  /**
   * Textura 8-bit da altura do chão (a MESMA heightAt) — 8 bits chegam: com
   * morros de 4 m o degrau é ~4 cm, invisível numa lâmina de 1 m. Reconstruída
   * quando o terreno muda (o bloco de morros).
   */
  function buildGrassHeightTex() {
    var HG = 128;
    var data = new Uint8Array(HG * HG);
    var hMin = -terrainCfg.hills * 1.25 - 1;
    var hRange = (terrainCfg.hills * 1.25 + 1) * 2;
    for (var iz = 0; iz < HG; iz++) {
      for (var ix = 0; ix < HG; ix++) {
        var x = (ix / (HG - 1) - 0.5) * config.world;
        var z = (iz / (HG - 1) - 0.5) * config.world;
        var v = (heightAt(x, z) - hMin) / hRange;
        if (v < 0) v = 0;
        if (v > 1) v = 1;
        data[iz * HG + ix] = Math.round(v * 255);
      }
    }
    if (heightTex && heightTex.dispose) { try { heightTex.dispose(); } catch (e) {} }
    heightTex = new THREE.DataTexture(data, HG, HG, THREE.RedFormat);
    if (THREE.LinearFilter) {
      heightTex.minFilter = THREE.LinearFilter;
      heightTex.magFilter = THREE.LinearFilter;
    }
    heightTex.needsUpdate = true;
    if (grassMat) {
      grassMat.uniforms.uHeight.value = heightTex;
      grassMat.uniforms.uHMin.value = hMin;
      grassMat.uniforms.uHRange.value = hRange;
    }
  }

  var GRASS_COUNTS = { pouca: 8000, media: 16000, muita: 24000 };

  function buildGrass() {
    if (!scene || !grassCfg) return;
    if (grassMesh) {
      try {
        scene.remove(grassMesh);
        if (grassMesh.geometry && grassMesh.geometry.dispose) grassMesh.geometry.dispose();
      } catch (e) {}
      grassMesh = null;
    }
    if (!THREE.InstancedBufferGeometry || !THREE.InstancedBufferAttribute || !THREE.ShaderMaterial) return;
    var st = styleOf();
    var n = Math.round((GRASS_COUNTS[grassCfg.amount] || GRASS_COUNTS.media) * (st.grassK != null ? st.grassK : 1));
    var radius = 55;
    if (quality.tier === 'turbo') {
      n = Math.round(n / 3);
      radius = 35;
    }
    if (n <= 0) return;
    var base = new THREE.PlaneGeometry(0.14, 1, 1, 2);
    base.translate(0, 0.5, 0);
    var geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    var rng = mulberry(777);
    var span = radius * 2;
    var offsets = new Float32Array(n * 2);
    var rands = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      offsets[i * 2] = rng() * span;
      offsets[i * 2 + 1] = rng() * span;
      rands[i] = rng();
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 2));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rands, 1));
    geo.instanceCount = n;
    if (!grassMat) {
      var ca = new THREE.Color(st.grass[0]);
      var cb = new THREE.Color(st.grass[1]);
      var cf = new THREE.Color(st.fog);
      grassMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: wind },
          uCenter: { value: new THREE.Vector2(0, 0) },
          uRadius: { value: radius },
          uHeight: { value: null },
          uHMin: { value: 0 },
          uHRange: { value: 1 },
          uWorld: { value: config.world },
          uColorA: { value: new THREE.Vector3(ca.r, ca.g, ca.b) },
          uColorB: { value: new THREE.Vector3(cb.r, cb.g, cb.b) },
          uFog: { value: new THREE.Vector3(cf.r, cf.g, cf.b) },
          uGamma: { value: 1.0 }
        },
        vertexShader: GRASS_VSH,
        fragmentShader: GRASS_FSH,
        side: THREE.DoubleSide != null ? THREE.DoubleSide : 2
      });
    } else {
      grassMat.uniforms.uRadius.value = radius;
      grassMat.uniforms.uWorld.value = config.world;
    }
    buildGrassHeightTex();
    grassMesh = new THREE.Mesh(geo, grassMat);
    // As lâminas dão a volta ao redor do carro no shader — a esfera de recorte
    // da geometria mentiria. Nunca recortar.
    grassMesh.frustumCulled = false;
    scene.add(grassMesh);
  }

  /** Modo turbo: menos grama, sombra menor, sem composer (o gate no renderFrame). */
  function applyTurbo() {
    if (quality.tier === 'turbo') return;
    quality.tier = 'turbo';
    warn('modo turbo ligado: este computador pediu um mundo mais leve (menos grama, sombra menor, sem efeitos de cinema)');
    if (sunLight && sunLight.shadow) {
      try {
        if (sunLight.shadow.mapSize && sunLight.shadow.mapSize.set) sunLight.shadow.mapSize.set(1024, 1024);
        if (sunLight.shadow.map) {
          sunLight.shadow.map.dispose();
          sunLight.shadow.map = null;
        }
      } catch (e) {}
    }
    if (grassMesh) buildGrass();
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
      buildNature();
      if (grassCfg) buildGrass();

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

    // Colisão com a natureza SÓLIDA (círculo × círculo, broad-phase na grade):
    // empurra para fora, perde velocidade e, se a trombada foi forte, dispara
    // o "Quando o carrinho bater forte" (com um respiro de 0.4 s).
    if (_crashCd > 0) _crashCd -= dt;
    var near = collidersNear(s.x, s.z, 3.5);
    for (var ci = 0; ci < near.length; ci++) {
      var col = near[ci];
      var ddx = s.x - col.x;
      var ddz = s.z - col.z;
      var rr = col.r + 1.1;
      var d2c = ddx * ddx + ddz * ddz;
      if (d2c >= rr * rr) continue;
      var dc = Math.sqrt(d2c) || 0.001;
      s.x += (ddx / dc) * (rr - dc);
      s.z += (ddz / dc) * (rr - dc);
      var impact = Math.abs(s.speed);
      s.speed *= 0.3;
      if (impact > Math.max(4, top * 0.35)) {
        s.pitchV -= 1.4;
        fireCrash();
      }
    }

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

    // Sonda de qualidade: mede o FPS entre 1.5 s e 4 s de passeio; abaixo de
    // 45 liga o modo turbo (uma vez, sem ping-pong).
    if (quality.auto && !quality.decided) {
      quality.probeT += dt;
      if (quality.probeT > 1.5) {
        quality.fpsAcc += dt;
        quality.fpsN++;
      }
      if (quality.probeT > 4) {
        quality.decided = true;
        var fps = quality.fpsN / Math.max(0.001, quality.fpsAcc);
        if (fps < 45) applyTurbo();
      }
    }

    stepCar(dt);
    for (var i = 0; i < updateHooks.length; i++) {
      try { updateHooks[i](dt); } catch (e) {
        warnOnce('hook-update-' + i, 'erro no "A cada quadro": ' + e);
      }
    }
    updateCamera(dt);
    updateSun();
    if (grassMat) {
      grassMat.uniforms.uTime.value = playTime;
      grassMat.uniforms.uWind.value = wind;
      var gcx = carState ? carState.x : (camera ? camera.position.x : 0);
      var gcz = carState ? carState.z : (camera ? camera.position.z : 0);
      grassMat.uniforms.uCenter.value.set(gcx, gcz);
    }

    justPressed = {};
    if (renderer && scene && camera) renderFrame();
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
          // InstancedMesh.dispose() libera os buffers de instância (o dispose de
          // geometria/material abaixo não os alcança).
          if (o.isInstancedMesh && o.dispose) { try { o.dispose(); } catch (e) {} }
          if (o.geometry && o.geometry.dispose) { try { o.geometry.dispose(); } catch (e) {} }
          if (o.material) {
            var m = o.material;
            if (m.length) { for (var i = 0; i < m.length; i++) { if (m[i] && m[i].dispose) { try { m[i].dispose(); } catch (e) {} } } }
            else if (m.dispose) { try { m.dispose(); } catch (e2) {} }
          }
        });
      }
      if (UNIT_GEOS) {
        for (var gk in UNIT_GEOS) {
          if (UNIT_GEOS[gk] && UNIT_GEOS[gk].dispose) { try { UNIT_GEOS[gk].dispose(); } catch (e) {} }
        }
      }
      if (skyTex && skyTex.dispose) { try { skyTex.dispose(); } catch (e) {} }
      if (gradientTex && gradientTex.dispose) { try { gradientTex.dispose(); } catch (e) {} }
      if (heightTex && heightTex.dispose) { try { heightTex.dispose(); } catch (e) {} }
      disposeComposer();
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
    natureGroup = null;
    UNIT_GEOS = null;
    speciesMats = null;
    collCells = Object.create(null);
    _modelCache = null;
    grassMesh = null;
    grassMat = null;
    heightTex = null;
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
      // Depois do start, reconstrói na hora (ordem dos blocos nunca prende
      // ninguém) — e a grama relê a altura nova pela textura.
      if (worldReady) {
        buildTerrain();
        if (grassMat) buildGrassHeightTex();
      }
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

    // 🌿 Natureza
    scatter: guard('scatter', function (n, thing) {
      var t = text(thing, '');
      if (!SPECIES[t]) {
        warn('não conheço "' + t + '" — tem: arvores, pinheiros, pedras, flores, cogumelos, cactos');
        return;
      }
      var rec = { kind: 'species', thing: t, n: num(n, 100), seed: natureRecipes.length, built: false };
      natureRecipes.push(rec);
      if (worldReady) buildRecipe(rec);
    }),
    scatterModel: guard('scatterModel', function (n, name, s) {
      var rec = {
        kind: 'model', name: text(name, ''), n: num(n, 20), s: num(s, 1),
        seed: natureRecipes.length, model: null, built: false
      };
      natureRecipes.push(rec);
      var hit = loadModel(rec.name, function (m) {
        rec.model = m;
        if (worldReady) buildRecipe(rec);
      });
      if (hit) {
        rec.model = hit;
        if (worldReady) buildRecipe(rec);
      }
    }),
    placeThing: guard('placeThing', function (thing, x, z, s) {
      var t = text(thing, '');
      if (!SPECIES[t]) {
        warn('não conheço "' + t + '" — tem: arvores, pinheiros, pedras, flores, cogumelos, cactos');
        return;
      }
      var rec = {
        kind: 'placeSpecies', thing: t, x: num(x, 0), z: num(z, 0), s: num(s, 1),
        seed: natureRecipes.length, built: false
      };
      natureRecipes.push(rec);
      if (worldReady) buildRecipe(rec);
    }),
    placeModel: guard('placeModel', function (name, x, z, s, deg) {
      var rec = {
        kind: 'placeModel', name: text(name, ''), x: num(x, 0), z: num(z, 0),
        s: num(s, 1), deg: num(deg, 0), seed: natureRecipes.length, model: null, built: false
      };
      natureRecipes.push(rec);
      var hit = loadModel(rec.name, function (m) {
        rec.model = m;
        if (worldReady) buildRecipe(rec);
      });
      if (hit) {
        rec.model = hit;
        if (worldReady) buildRecipe(rec);
      }
    }),
    clearArea: guard('clearArea', function (x, z, r) {
      exclusions.push({ x: num(x, 0), z: num(z, 0), r: clamp(num(r, 10), 1, 200) });
    }),
    grass: guard('grass', function (amount) {
      var a = text(amount, 'media');
      if (!GRASS_COUNTS[a]) a = 'media';
      grassCfg = { amount: a };
      if (worldReady) buildGrass();
    }),
    setEffects: guard('setEffects', function (on, strength) {
      var ligado = on === true || on === 'ligados' || on === 'ligado' || on === 'true';
      config.bloom = ligado;
      config.vignette = ligado;
      config.bloomStrength = clamp(num(strength, config.bloomStrength), 0, 3);
    }),
    onCrash: guard('onCrash', function (fn) {
      if (typeof fn !== 'function') {
        warn('"Quando o carrinho bater forte" precisa de blocos de fazer dentro');
        return;
      }
      crashHooks.push(fn);
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
