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
  // Água: um plano na altura Y com ondulação; o carro afunda/respinga/respawna.
  var waterCfg = null;          // { y, color }
  var waterMesh = null;
  var waterMat = null;
  // Turbo (Shift) + som do motor sintetizado.
  var boostCfg = null;          // { force }
  var boostActive = false;
  var engineOn = false;
  var _audioCtx = null;
  var engineOsc = null;
  var engineGain = null;
  var engineFilter = null;
  // Sons do projeto (HTMLAudio, do __SZGAME_SOUNDS) + música.
  var sounds = Object.create(null);
  var music = null;
  // HUD por canto (DOM) + balão de fala que segue o carro.
  var hudEls = Object.create(null);
  var sayEl = null;
  var sayUntil = 0;
  var lastSafe = { x: 0, z: 0, yaw: 0 };   // último ponto seco (para respawn)
  // Pontos interativos ("aperte E"), áreas de gatilho, totens e galeria.
  var points = [];             // { name, x, z, r, hooks:[], marker (mesh) }
  var zones = [];              // { name, x, z, r, hooks:[], inside }
  var pointHooks = Object.create(null);  // name -> [fn]  (aperte E no ponto)
  var zoneHooks = Object.create(null);   // name -> [fn]  (entrou na área)
  var promptEl = null;         // badge "E" flutuante do ponto mais perto
  var galleryEl = null;        // overlay de zoom da galeria (imagem grande)
  var galleries = [];          // { x, z, angle, count } — arco de quadros
  var _decorGroup = null;      // totens/placas/galeria (raiz)
  // Receitas de decoração (pontos/áreas/totens/galeria): gravadas antes do start,
  // construídas EM ORDEM no initWorld (a cena só existe lá). Depois do start,
  // constroem na hora.
  var decorRecipes = [];
  // 🏁 Corrida: máquina idle→correndo→fim, checkpoints EM ORDEM, recorde no shim.
  var race = null;             // { x, z, yaw, laps, checkpoints:[], state, time, lap, next, portal, hooks }
  var raceHooks = { start: [], checkpoint: [], finish: [] };
  // 🎳 Boliche/derrubar: objetos TOMBÁVEIS (pinos/caixas) — física arcade sem solver.
  var knockables = [];         // { mesh, x, z, r, h, vx, vz, vy, y, tilt, down, home:{x,z} }
  var bowling = null;          // { x, z, pins:[], strikeHooks:[] }
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
  var camMode = 'seguir';       // 'seguir' | 'topo' | 'cinema'
  var _shakeT = 0;              // segundos restantes de tremor
  var _shakeAmp = 0;            // força do tremor (m)
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
  // ---- R11 "carrinho vivo": buzina, luzes, marcas, pintura, konami, lua ----
  var hornCfg = false;          // "Ligar a buzina" arma a tecla H
  var hornHooks = [];
  var hornOsc1 = null;          // par de osciladores em quinta (fom-fom)
  var hornOsc2 = null;
  var hornGain = null;
  var hornSquash = 0;           // mola do "pulinho" da carroceria ao buzinar
  var hornSquashV = 0;
  var _hornHeld = false;
  var lightsOn = false;         // "Ligar as luzes": faróis/freio/ré/piscas
  var carLightParts = null;     // { head:[], brake:[], rev:[], blinkL:[], blinkR:[] }
  var blinkPhase = 0;
  var nightAmount = 0;          // 0..1 (o mesmo fator das estrelas) — faróis/lua
  var tireOn = false;           // "Marcas de pneu": anel de quads com fade
  var tireMesh = null;
  var tireGeo = null;
  var tireAges = null;
  var tireIdx = 0;
  var TIRE_N = 256;
  var _tireEmitCd = 0;
  var TIRE_LIFE = 6;
  var paintStyle = 'lisa';      // lisa | listras | chamas | arco-iris | estrelas
  var carBodyMat = null;        // material da carroceria (arco-íris muda a cor viva)
  var rocketMode = false;       // konami: o corpo vira foguete 🚀
  var konamiBuf = [];
  var KONAMI = 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,KeyB,KeyA';
  var moonMesh = null;
  var moonMat = null;
  var antennaGroup = null;      // antena cosmética que "chicoteia" com o molejo
  var speedLinesEl = null;      // vinheta de velocidade do turbo (DOM)
  // Bullet-time: <1 desacelera o MUNDO (o dt), NUNCA a sonda de FPS/turbo — a
  // sonda mede o quadro REAL; escalar antes dela mentiria o FPS (documentado).
  var timeScale = 1;
  // Árbitro ÚNICO do "aperte E": além dos pontos, sistemas novos (entrar no
  // veículo, falar com o amigo, escrever recado…) registram interagíveis aqui:
  // { x, z, r, label, prio, fire, promptY? } — maior prio ganha; empate = mais perto.
  var extraInteract = [];
  // ---- R12 "festa & céu dramático": pool de festa, tornado, estação, nuvens ----
  var partyPts = null;          // Points ÚNICO compartilhado (confete + fogos)
  var partyGeo = null;
  var partyState = null;        // estados paralelos aos atributos (age/ttl/vel/g)
  var partyIdx = 0;
  var PARTY_N = 400;
  var PARTY_COLORS = ['#f472b6', '#facc15', '#4ade80', '#22d3ee', '#a78bfa'];
  var fwRockets = [];           // foguetes subindo: { x, z, y, peak, cd }
  var tornadoState = null;      // { group, cyls, mats, ttl, x, z, tx, tz, flingCd }
  var seasonName = null;        // primavera | verao | outono | inverno
  var _seasonOrig = null;       // cores originais p/ voltar ao verão
  var cloudsPts = null;
  var cloudsAmount = 'nenhuma';
  var stormT = 0;               // segundos até o próximo raio da tempestade
  var boltLine = null;          // o raio (LineSegments reusado)
  var boltT = 0;
  var flashEl = null;           // clarão (overlay DOM)
  var thunderQueue = [];        // trovões agendados pela distância
  // ---- R13 "boliche & bagunça": empurráveis, letras físicas, explosivos ----
  var pushables = [];           // { mesh?, type, im?, idx?, x, z, y, vx, vz, vy, spin, yaw, home, sink }
  var pushIM = null;            // { tipo: { mesh, states:[] } } — 1 InstancedMesh por tipo
  var PUSH_MAX = 256;
  var lettersCount = 0;
  var LETTERS_MAX = 24;
  var _letterTexCache = null;   // caractere -> CanvasTexture (cache)
  var explosives = [];          // { mesh, x, z, fuse, done }
  var explosionHooks = [];
  var boomSpheres = [];         // { mesh, t } — esfera emissiva que incha e some
  // ---- R14 "natureza acesa": cachoeira, postes, vaga-lumes, fogueira, espuma ----
  var waterfalls = [];          // { mesh, mat, foam, x, z }
  var lamps = [];               // { x, z, globeMat }
  var LAMP_MAX = 24;
  var lampLights = null;        // pool de até 4 PointLights REAIS (os postes mais perto)
  var firefliesPts = null;      // { mesh, mat, home:Float32Array, n }
  var campfires = [];           // { x, z, pts, mat, seeds }
  var CAMP_MAX = 6;
  var _campRespawn = null;      // última fogueira TOCADA — vence o lastSafe no resgate
  var waterFoamTex = null;      // altura do chão p/ a ESPUMA da costa (64×64)
  // ---- R15 "personagem a pé": rig procedural, entrar/sair do veículo ----
  var personCfg = null;         // { color, hat, walk, run, jump, acc }
  var personState = null;       // { x, y, z, yaw, vy, airborne, vis (vel p/ anim), phase }
  var personGroup = null;       // raiz do rig
  var personParts = null;       // { legL, legR, armL, armR, body, head }
  var driving = true;           // com carro e SEM pessoa: sempre true; com pessoa: nasce a pé
  var vehicleHooks = { entrar: [], sair: [] };
  var _enterInteract = null;    // interagível "E: entrar" (segue o carro)
  var personEmote = null;       // { kind, t }
  var _jetPuffCd = 0;
  // ---- R16 "ilha & barco": arquipélago, barco, ponte, farol, ambiente ----
  var islandsCfg = null;        // { list: [{x,z,r,h}] } — muda o baseHeightAt
  var boatCfg = null;           // { color }
  var boatState = null;         // { x, z, yaw, speed, roll }
  var boatGroup = null;
  var activeVehicle = 'car';    // 'car' | 'boat' — qual veículo o E encosta
  var _boatInteract = null;
  var bridges = [];             // { x1,z1,x2,z2,w,y1,y2 } — entram no heightAtDrive
  var lighthouses = [];         // { beam1, beam2, x, z }
  var ambienceKind = 'desligado';
  var _ambNoise = null;         // loop de "mar" (buffer de ruído + lowpass)
  var _ambT = 0;                // relógio dos chirps/grilos
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
  var SOUNDS = (typeof window !== 'undefined' && window.__SZGAME_SOUNDS && typeof window.__SZGAME_SOUNDS === 'object')
    ? window.__SZGAME_SOUNDS
    : {};
  var ASSETS = (typeof window !== 'undefined' && window.__SZGAME_ASSETS && typeof window.__SZGAME_ASSETS === 'object')
    ? window.__SZGAME_ASSETS
    : {};
  var _gltfMod = null;
  var _modelCache = null;       // nome -> { scene } já parseado
  var _modelPending = null;     // nome -> fila de callbacks (parse em voo)
  // Céu & clima: ciclo dia/noite por keyframes + tempo fixo + partículas de clima.
  var dayCfg = { on: false, minutes: 4 };
  var atmoUsed = false;         // setTime/dayNight ligam a atmosfera por keyframes
  var timeOfDay = 10;           // hora do mundo (0..24); 10h = manhã clara default
  var _lastDayPhase = null;     // 'dia' | 'noite' (edge-trigger dos ganchos)
  var dayNightHooks = { dia: [], noite: [] };
  var _skyDrawnAt = -1;         // última hora desenhada no degradê (redesenho barato)
  var _skyCanvas = null;
  var starsMesh = null;
  var starsMat = null;
  var weatherKind = 'limpo';
  var weatherPts = null;        // { mesh, mat, geo, pos (Float32Array), vel, n }
  var spriteTex = null;         // círculo suave compartilhado (clima)
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

  /** Altura só do RUÍDO (+ centro aplainado), antes dos modificadores. */
  function baseHeightAt(x, z) {
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
    if (islandsCfg) {
      // Arquipélago (R16): N domos determinísticos; fora deles o chão AFUNDA
      // (mar a -4). O ruído vira só detalhe (×0.3). A ilha 0 cobre o spawn.
      var best = 0;
      for (var ii = 0; ii < islandsCfg.list.length; ii++) {
        var isl = islandsCfg.list[ii];
        var ddx = x - isl.x;
        var ddz = z - isl.z;
        var dd = Math.sqrt(ddx * ddx + ddz * ddz);
        var k = 1 - smoothstep(isl.r * 0.5, isl.r, dd);
        var dome = k * isl.h;
        if (dome > best) best = dome;
      }
      return -4 + best + h * 0.3 * smoothstep(8, 20, d);
    }
    return h * smoothstep(8, 20, d);
  }

  // Modificadores de terreno (aplainar/trilha): cada um puxa a altura para um
  // alvo AMOSTRADO no registro (sem recursão) dentro do seu alcance. A trilha é
  // um segmento; o aplainar é um disco.
  var terrainMods = [];

  /** Distância do ponto (px,pz) ao segmento (ax,az)-(bx,bz) + parâmetro t [0,1]. */
  function segDist(px, pz, ax, az, bx, bz) {
    var dx = bx - ax;
    var dz = bz - az;
    var len2 = dx * dx + dz * dz;
    var t = len2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0;
    t = clamp(t, 0, 1);
    var cx = ax + dx * t;
    var cz = az + dz * t;
    var ex = px - cx;
    var ez = pz - cz;
    return { dist: Math.sqrt(ex * ex + ez * ez), t: t };
  }

  /**
   * A altura do chão em (x, z) — ANALÍTICA e pura: carro, natureza, água e o
   * bloco "a altura do chão" consultam a MESMA função (nunca dessincroniza).
   * O centro do mundo é aplainado; aplainar/trilha puxam a altura ao seu alvo.
   */
  function heightAt(x, z) {
    var h = baseHeightAt(x, z);
    for (var i = 0; i < terrainMods.length; i++) {
      var m = terrainMods[i];
      if (m.kind === 'flatten') {
        var dx = x - m.x;
        var dz = z - m.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        // 1 no centro → 0 na borda (com uma orla suave de 30%).
        var k = 1 - smoothstep(m.r * 0.7, m.r, d);
        if (k > 0) h = h + (m.y - h) * k;
      } else if (m.kind === 'path') {
        var s = segDist(x, z, m.x1, m.z1, m.x2, m.z2);
        var k2 = 1 - smoothstep(m.w * 0.6, m.w, s.dist);
        if (k2 > 0) {
          var target = m.y1 + (m.y2 - m.y1) * s.t;
          h = h + (target - h) * k2;
        }
      }
    }
    return h;
  }

  /**
   * A altura DE DIRIGIR/ANDAR (R16): heightAt + o DECK das pontes. O heightAt
   * segue PURO (água/scatter/grama/espuma leem o terreno de verdade); a ponte
   * só conta quando o jogador está à altura dela (yRef > deck − 0.8) — assim o
   * barco passa POR BAIXO e o carro sobe POR CIMA pela rampa.
   */
  function heightAtDrive(x, z, yRef) {
    var h = heightAt(x, z);
    for (var i = 0; i < bridges.length; i++) {
      var b = bridges[i];
      var s = segDist(x, z, b.x1, b.z1, b.x2, b.z2);
      if (s.dist > b.w / 2) continue;
      var deck = b.y1 + (b.y2 - b.y1) * s.t + Math.sin(s.t * Math.PI) * 1.2;
      if (yRef == null || yRef > deck - 0.8) {
        if (deck > h) h = deck;
      }
    }
    return h;
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
    },
    palmeiras: {
      collR: 0.45, smin: 0.9, smax: 1.6,
      parts: [
        { g: 'cyl', color: '#8a6a3f', x: 0, y: 1.6, z: 0, sx: 0.28, sy: 3.2, sz: 0.28 },
        { g: 'cone', color: '#2f9e44', x: 0.9, y: 3.3, z: 0, sx: 1.9, sy: 0.34, sz: 0.7 },
        { g: 'cone', color: '#2f9e44', x: -0.9, y: 3.3, z: 0, sx: 1.9, sy: 0.34, sz: 0.7 },
        { g: 'cone', color: '#37a34a', x: 0, y: 3.3, z: 0.9, sx: 0.7, sy: 0.34, sz: 1.9 },
        { g: 'cone', color: '#37a34a', x: 0, y: 3.3, z: -0.9, sx: 0.7, sy: 0.34, sz: 1.9 }
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
    'uniform float uNight;',
    'varying float vY;',
    'varying float vRand;',
    'varying float vFade;',
    'void main() {',
    '  vec3 col = mix(uColorA, uColorB, clamp(vY, 0.0, 1.0));',
    '  col *= 0.92 + vRand * 0.16;',
    '  col = mix(col, col * vec3(0.5, 0.55, 0.75), uNight);',
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
          uGamma: { value: 1.0 },
          uNight: { value: 0 }
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

  // ---- 🌦️ Céu & clima (ciclo dia/noite por keyframes + partículas) ----

  /**
   * Keyframes da atmosfera por HORA (0..24, circular): cada um tinge o céu do
   * ESTILO (mix) e manda no sol/ambiente/névoa/estrelas. Interpolação por
   * segmento — a mesma ideia dos presets de DayCycles do folio.
   */
  var DAY_KEYS = [
    { t: 0,  top: '#0b1230', bot: '#1a2342', mix: 0.92, sun: '#8fa8ff', sunI: 0.12, amb: 0.22, stars: 1 },
    { t: 6,  top: '#f4b46a', bot: '#ffe4b8', mix: 0.55, sun: '#ffd9a8', sunI: 0.75, amb: 0.5,  stars: 0 },
    { t: 12, top: '',        bot: '',        mix: 0,    sun: '#ffffff', sunI: 1.05, amb: 0.6,  stars: 0 },
    { t: 18, top: '#f4844d', bot: '#ffd2a0', mix: 0.6,  sun: '#ffb066', sunI: 0.6,  amb: 0.45, stars: 0 },
    { t: 24, top: '#0b1230', bot: '#1a2342', mix: 0.92, sun: '#8fa8ff', sunI: 0.12, amb: 0.22, stars: 1 }
  ];

  var _colScratchA = null;
  var _colScratchB = null;
  var _colScratchC = null;
  function ensureColScratch() {
    if (!_colScratchA) {
      _colScratchA = new THREE.Color();
      _colScratchB = new THREE.Color();
      _colScratchC = new THREE.Color();
    }
  }

  /** Interpola os keyframes na hora t e devolve o preset misturado (objeto reusado). */
  var _atmo = { top: '', bot: '', sunI: 1, amb: 0.6, stars: 0, sun: '#ffffff', fog: '' };
  function atmosphereAt(t) {
    var st = styleOf();
    var a = DAY_KEYS[0];
    var b = DAY_KEYS[DAY_KEYS.length - 1];
    for (var i = 0; i < DAY_KEYS.length - 1; i++) {
      if (t >= DAY_KEYS[i].t && t <= DAY_KEYS[i + 1].t) {
        a = DAY_KEYS[i];
        b = DAY_KEYS[i + 1];
        break;
      }
    }
    var k = (t - a.t) / Math.max(0.001, b.t - a.t);
    ensureColScratch();
    // Céu: cor do ESTILO puxada para o tint do keyframe (mix interpola junto).
    var mixA = a.mix;
    var mixB = b.mix;
    var mix = mixA + (mixB - mixA) * k;
    _colScratchA.set(st.skyTop);
    _colScratchB.set(a.top || st.skyTop);
    _colScratchC.set(b.top || st.skyTop);
    _colScratchB.lerp(_colScratchC, k);
    _colScratchA.lerp(_colScratchB, mix);
    _atmo.top = '#' + _colScratchA.getHexString();
    _colScratchA.set(st.skyBot);
    _colScratchB.set(a.bot || st.skyBot);
    _colScratchC.set(b.bot || st.skyBot);
    _colScratchB.lerp(_colScratchC, k);
    _colScratchA.lerp(_colScratchB, mix);
    _atmo.bot = '#' + _colScratchA.getHexString();
    // Névoa acompanha o horizonte (o mundo escurece junto).
    _colScratchA.set(st.fog);
    _colScratchB.set(a.top || st.fog);
    _colScratchC.set(b.top || st.fog);
    _colScratchB.lerp(_colScratchC, k);
    _colScratchA.lerp(_colScratchB, mix * 0.8);
    _atmo.fog = '#' + _colScratchA.getHexString();
    _colScratchB.set(a.sun);
    _colScratchC.set(b.sun);
    _colScratchB.lerp(_colScratchC, k);
    _atmo.sun = '#' + _colScratchB.getHexString();
    _atmo.sunI = a.sunI + (b.sunI - a.sunI) * k;
    _atmo.amb = a.amb + (b.amb - a.amb) * k;
    _atmo.stars = a.stars + (b.stars - a.stars) * k;
    return _atmo;
  }

  /** Redesenha o degradê do céu NA MESMA textura (barato: canvas 2×256). */
  function drawSky(top, bot) {
    if (!scene) return;
    try {
      if (!_skyCanvas) {
        _skyCanvas = document.createElement('canvas');
        _skyCanvas.width = 2;
        _skyCanvas.height = 256;
      }
      var g = _skyCanvas.getContext('2d');
      if (!g) return;
      var grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bot);
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 256);
      if (skyTex && skyTex.image === _skyCanvas) {
        skyTex.needsUpdate = true;
      } else {
        if (skyTex && skyTex.dispose) { try { skyTex.dispose(); } catch (e) {} }
        skyTex = new THREE.CanvasTexture(_skyCanvas);
        scene.background = skyTex;
      }
    } catch (e) {}
  }

  function ensureStars() {
    if (starsMesh || !scene) return;
    try {
      var N = 350;
      var rng = mulberry(99);
      var posArr = new Float32Array(N * 3);
      var R = Math.max(300, config.world * 2);
      for (var i = 0; i < N; i++) {
        var az = rng() * Math.PI * 2;
        var el = 0.12 + rng() * 1.35;
        posArr[i * 3] = Math.cos(az) * Math.cos(el) * R;
        posArr[i * 3 + 1] = Math.sin(el) * R;
        posArr[i * 3 + 2] = Math.sin(az) * Math.cos(el) * R;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      starsMat = new THREE.PointsMaterial({
        color: '#ffffff',
        size: 2.2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      starsMesh = new THREE.Points(geo, starsMat);
      starsMesh.frustumCulled = false;
      scene.add(starsMesh);
    } catch (e) {}
  }

  /** Aplica a atmosfera da hora atual (céu/sol/ambiente/névoa/estrelas). */
  function applyAtmosphere() {
    if (!worldReady) return;
    var a = atmosphereAt(timeOfDay);
    // O degradê só redesenha quando a hora andou o bastante (barato mesmo assim).
    if (Math.abs(timeOfDay - _skyDrawnAt) > 0.05) {
      _skyDrawnAt = timeOfDay;
      drawSky(a.top, a.bot);
      if (scene.fog && scene.fog.color) { try { scene.fog.color.set(a.fog); } catch (e) {} }
      if (sunLight) {
        sunLight.intensity = a.sunI;
        try { sunLight.color.set(a.sun); } catch (e) {}
      }
      if (ambientLight) ambientLight.intensity = a.amb;
    }
    if (a.stars > 0.01) {
      ensureStars();
      if (starsMat) starsMat.opacity = a.stars;
      if (starsMesh && carState) starsMesh.position.set(carState.x, 0, carState.z);
    } else if (starsMat) {
      starsMat.opacity = 0;
    }
    // Fator noturno compartilhado (faróis acendem, a lua aparece).
    nightAmount = a.stars;
    // Ganchos dia/noite (dia = 6h..18h), disparo só na TRANSIÇÃO.
    var phase = timeOfDay >= 6 && timeOfDay < 18 ? 'dia' : 'noite';
    if (_lastDayPhase && phase !== _lastDayPhase) {
      var hooks = dayNightHooks[phase] || [];
      for (var i = 0; i < hooks.length; i++) {
        try { hooks[i](); } catch (e) {
          warnOnce('hook-day-' + phase + '-' + i, 'erro no "Quando virar ' + phase + '": ' + e);
        }
      }
    }
    _lastDayPhase = phase;
  }

  function stepDayNight(dt) {
    if (!dayCfg.on) return;
    var daySecs = Math.max(10, dayCfg.minutes * 60);
    timeOfDay = (timeOfDay + (dt / daySecs) * 24) % 24;
    applyAtmosphere();
  }

  // ---- Clima (chuva/neve/folhas: UM Points num cilindro ao redor do carro) ----

  function ensureSpriteTex() {
    if (spriteTex) return spriteTex;
    try {
      var cv = document.createElement('canvas');
      cv.width = 32;
      cv.height = 32;
      var g = cv.getContext('2d');
      if (!g) return null;
      var grad = g.createRadialGradient(16, 16, 2, 16, 16, 15);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 32);
      spriteTex = new THREE.CanvasTexture(cv);
    } catch (e) {
      spriteTex = null;
    }
    return spriteTex;
  }

  var WEATHER_KINDS = {
    chuva:  { color: '#9fb4cc', size: 1.1, vy: -24, drift: 2, n: 900 },
    neve:   { color: '#ffffff', size: 1.6, vy: -2.4, drift: 1.6, n: 700 },
    folhas: { color: '#d9822b', size: 1.8, vy: -1.4, drift: 3.2, n: 350 },
    // R12: chuva PESADA + raios/trovões (o stepStorm cuida do espetáculo).
    tempestade: { color: '#8aa3c4', size: 1.1, vy: -34, drift: 3.4, n: 1200 }
  };
  var WEATHER_R = 42;   // raio do cilindro que segue o carro
  var WEATHER_H = 26;   // altura de reciclagem

  function disposeWeather() {
    if (!weatherPts) return;
    try {
      if (scene) scene.remove(weatherPts.mesh);
      if (weatherPts.geo && weatherPts.geo.dispose) weatherPts.geo.dispose();
      if (weatherPts.mat && weatherPts.mat.dispose) weatherPts.mat.dispose();
    } catch (e) {}
    weatherPts = null;
  }

  function buildWeather() {
    disposeWeather();
    if (!scene || weatherKind === 'limpo') return;
    var spec = WEATHER_KINDS[weatherKind];
    if (!spec) return;
    var n = quality.tier === 'turbo' ? Math.round(spec.n / 3) : spec.n;
    var rng = mulberry(555);
    var posArr = new Float32Array(n * 3);
    var vel = new Float32Array(n * 2); // fase de deriva + velocidade própria
    var cx = carState ? carState.x : 0;
    var cz = carState ? carState.z : 0;
    for (var i = 0; i < n; i++) {
      posArr[i * 3] = cx + (rng() * 2 - 1) * WEATHER_R;
      posArr[i * 3 + 1] = rng() * WEATHER_H;
      posArr[i * 3 + 2] = cz + (rng() * 2 - 1) * WEATHER_R;
      vel[i * 2] = rng() * Math.PI * 2;      // fase
      vel[i * 2 + 1] = 0.6 + rng() * 0.8;    // multiplicador de queda
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    var mat = new THREE.PointsMaterial({
      color: spec.color,
      size: spec.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    var tex = ensureSpriteTex();
    if (tex) mat.map = tex;
    var mesh = new THREE.Points(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    weatherPts = { mesh: mesh, mat: mat, geo: geo, pos: posArr, vel: vel, n: n, spec: spec };
  }

  function stepWeather(dt) {
    if (!weatherPts) return;
    var p = weatherPts;
    var cx = carState ? carState.x : 0;
    var cz = carState ? carState.z : 0;
    var t = playTime;
    for (var i = 0; i < p.n; i++) {
      var ix = i * 3;
      p.pos[ix + 1] += p.spec.vy * p.vel[i * 2 + 1] * dt;
      var phase = p.vel[i * 2];
      p.pos[ix] += Math.sin(t * 1.3 + phase) * p.spec.drift * wind * dt;
      p.pos[ix + 2] += Math.cos(t * 1.1 + phase) * p.spec.drift * wind * 0.7 * dt;
      // Recicla: caiu no chão OU saiu do cilindro → volta pelo topo, perto do carro.
      var gy = 0;
      if (p.pos[ix + 1] < (gy = heightAt(p.pos[ix], p.pos[ix + 2]))) {
        p.pos[ix] = cx + (Math.random() * 2 - 1) * WEATHER_R;
        p.pos[ix + 1] = gy + WEATHER_H * (0.7 + Math.random() * 0.3);
        p.pos[ix + 2] = cz + (Math.random() * 2 - 1) * WEATHER_R;
      } else {
        if (p.pos[ix] < cx - WEATHER_R) p.pos[ix] += WEATHER_R * 2;
        else if (p.pos[ix] > cx + WEATHER_R) p.pos[ix] -= WEATHER_R * 2;
        if (p.pos[ix + 2] < cz - WEATHER_R) p.pos[ix + 2] += WEATHER_R * 2;
        else if (p.pos[ix + 2] > cz + WEATHER_R) p.pos[ix + 2] -= WEATHER_R * 2;
      }
    }
    if (p.geo.attributes.position) p.geo.attributes.position.needsUpdate = true;
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
    if (weatherPts) buildWeather();
  }

  // ---- 💧 Água (plano ondulado; o carro afunda/respinga/respawna) ----

  var WATER_VSH = [
    'uniform float uTime;',
    'varying vec2 vWorld;',
    'void main() {',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  float wave = sin(wp.x * 0.25 + uTime * 1.2) * 0.12 + cos(wp.z * 0.3 + uTime) * 0.1;',
    '  wp.y += wave;',
    '  vWorld = wp.xz;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'
  ].join(' ');

  var WATER_FSH = [
    'uniform vec3 uColor;',
    'uniform float uTime;',
    'uniform sampler2D uFoamTex;',
    'uniform float uHalf;',
    'uniform float uWaterY;',
    'uniform float uHasFoam;',
    'varying vec2 vWorld;',
    'void main() {',
    '  float spark = 0.5 + 0.5 * sin(vWorld.x * 0.8 + uTime * 2.0) * cos(vWorld.y * 0.7 - uTime * 1.5);',
    '  vec3 col = uColor + spark * 0.08;',
    '  if (uHasFoam > 0.5) {',
    '    float h = texture2D(uFoamTex, vWorld / (uHalf * 2.0) + 0.5).r * 40.0 - 10.0;',
    '    float depth = uWaterY - h;',
    '    float band = 0.55 + 0.14 * sin(vWorld.x * 1.7 + uTime * 1.8) + 0.1 * cos(vWorld.y * 2.3 - uTime * 1.3);',
    '    float foam = (1.0 - smoothstep(0.03, band, depth)) * step(0.0, depth);',
    '    col = mix(col, vec3(0.96, 0.98, 1.0), foam * 0.75);',
    '  }',
    '  gl_FragColor = vec4(col, 0.82);',
    '}'
  ].join(' ');

  /** Altura do chão em 64×64 (faixa -10..30 m) — a ESPUMA da costa lê daqui. */
  function buildWaterFoamTex() {
    if (!waterMat) return;
    var N = 64;
    var data = new Uint8Array(N * N);
    var half = config.world / 2;
    for (var j = 0; j < N; j++) {
      for (var i = 0; i < N; i++) {
        var wx = (i / (N - 1)) * config.world - half;
        var wz = (j / (N - 1)) * config.world - half;
        var h = heightAt(wx, wz);
        data[j * N + i] = Math.round(clamp((h + 10) / 40, 0, 1) * 255);
      }
    }
    if (waterFoamTex) { try { waterFoamTex.dispose(); } catch (e) {} }
    waterFoamTex = new THREE.DataTexture(data, N, N, THREE.RedFormat ? THREE.RedFormat : undefined);
    waterFoamTex.needsUpdate = true;
    waterMat.uniforms.uFoamTex.value = waterFoamTex;
    waterMat.uniforms.uHalf.value = half;
    waterMat.uniforms.uWaterY.value = waterCfg ? waterCfg.y : 0;
    waterMat.uniforms.uHasFoam.value = 1;
  }

  function buildWater() {
    if (!scene || !waterCfg) return;
    if (waterMesh) {
      try {
        scene.remove(waterMesh);
        if (waterMesh.geometry && waterMesh.geometry.dispose) waterMesh.geometry.dispose();
      } catch (e) {}
      waterMesh = null;
    }
    if (!THREE.ShaderMaterial) return;
    var geo = new THREE.PlaneGeometry(config.world * 1.4, config.world * 1.4, 40, 40);
    geo.rotateX(-Math.PI / 2);
    if (!waterMat) {
      var c = new THREE.Color(waterCfg.color);
      waterMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
          uFoamTex: { value: null },
          uHalf: { value: config.world / 2 },
          uWaterY: { value: waterCfg.y },
          uHasFoam: { value: 0 }
        },
        vertexShader: WATER_VSH,
        fragmentShader: WATER_FSH,
        transparent: true
      });
    }
    waterMesh = new THREE.Mesh(geo, waterMat);
    waterMesh.position.y = waterCfg.y;
    waterMesh.frustumCulled = false;
    scene.add(waterMesh);
    // Espuma da costa: a água lê a altura do chão e pinta a faixa rasa de branco.
    try { buildWaterFoamTex(); } catch (e) { waterMat.uniforms.uHasFoam.value = 0; }
  }

  // ---- 🔊 Áudio (motor sintetizado + sons/música do projeto) ----

  function ensureAudioCtx() {
    if (_audioCtx) return _audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    } catch (e) { _audioCtx = null; }
    return _audioCtx;
  }

  function resumeAudio() {
    try {
      if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    } catch (e) {}
  }

  /** Liga o oscilador do motor (grave, com lowpass) — o pitch segue a velocidade. */
  function startEngine() {
    var ac = ensureAudioCtx();
    if (!ac || engineOsc) return;
    try {
      engineOsc = ac.createOscillator();
      engineGain = ac.createGain();
      engineFilter = ac.createBiquadFilter();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 500;
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ac.destination);
      engineOsc.start();
    } catch (e) { engineOsc = null; }
  }

  function updateEngine() {
    if (!engineOn || !engineOsc || !carState) return;
    var ac = _audioCtx;
    if (!ac) return;
    var top = carCfg ? num(carCfg.speed, 22) : 22;
    var frac = Math.min(1, Math.abs(carState.speed) / Math.max(1, top));
    try {
      engineOsc.frequency.setTargetAtTime(55 + frac * 130, ac.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(400 + frac * 1800, ac.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(0.04 + frac * 0.06, ac.currentTime, 0.1);
    } catch (e) {}
  }

  function ensureSound(name) {
    var key = text(name, '');
    if (sounds[key]) return sounds[key];
    var url = SOUNDS[key];
    if (!url) return null;
    try {
      var a = new Audio(url);
      a.preload = 'auto';
      sounds[key] = a;
      return a;
    } catch (e) { return null; }
  }

  // ---- 🖥️ HUD + 💬 balão de fala (DOM sobre o canvas) ----

  var HUD_SLOTS = { 'topo-esquerda': 1, 'topo-direita': 1, 'baixo-esquerda': 1, 'baixo-direita': 1 };
  var HUD_POS = {
    'topo-esquerda': 'top:12px;left:12px', 'topo-direita': 'top:12px;right:12px',
    'baixo-esquerda': 'bottom:12px;left:12px', 'baixo-direita': 'bottom:12px;right:12px'
  };
  function setHud(slot, value) {
    if (!ensureShell()) return;
    var key = text(slot, 'topo-esquerda');
    if (!HUD_SLOTS[key]) key = 'topo-esquerda';
    var content = text(value, '');
    var el = hudEls[key];
    if (!content) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      delete hudEls[key];
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.className = 'szw3d-hud';
      el.setAttribute('style', 'position:absolute;' + HUD_POS[key] + ';color:#fff;font:700 20px system-ui,sans-serif;text-shadow:0 2px 6px rgba(0,0,0,.6);pointer-events:none;z-index:6');
      frameEl.appendChild(el);
      hudEls[key] = el;
    }
    el.textContent = content;
  }

  function showSay(msgTxt, secs) {
    if (!ensureShell()) return;
    if (!sayEl) {
      sayEl = document.createElement('div');
      sayEl.setAttribute('style', 'position:absolute;padding:6px 12px;border-radius:14px;background:rgba(255,255,255,.92);color:#123;font:600 15px system-ui,sans-serif;transform:translate(-50%,-100%);white-space:nowrap;pointer-events:none;z-index:7;box-shadow:0 4px 12px rgba(0,0,0,.3)');
      frameEl.appendChild(sayEl);
    }
    sayEl.textContent = text(msgTxt, '');
    sayEl.style.display = 'block';
    sayUntil = playTime + Math.max(0.5, num(secs, 2));
  }

  function stepSay() {
    if (!sayEl) return;
    if (playTime > sayUntil) {
      sayEl.style.display = 'none';
      return;
    }
    if (!carState || !camera || !renderer) return;
    // Projeta a cabeça do carrinho para a tela (mundo → pixel do canvas).
    _proj.set(carState.x, carState.y + 2.2, carState.z);
    _proj.project(camera);
    var rect = canvasEl.getBoundingClientRect();
    var sx = (_proj.x * 0.5 + 0.5) * rect.width;
    var sy = (-_proj.y * 0.5 + 0.5) * rect.height;
    sayEl.style.left = sx + 'px';
    sayEl.style.top = sy + 'px';
    sayEl.style.display = _proj.z < 1 ? 'block' : 'none';
  }
  var _proj = null;

  // ---- 📍 Pontos interativos, áreas, totens e galeria ----

  function ensureDecorGroup() {
    if (!_decorGroup && scene) {
      _decorGroup = new THREE.Group();
      scene.add(_decorGroup);
    }
    return _decorGroup;
  }

  /** CanvasTexture de um cartaz (título + linhas de texto), fundo claro. */
  function makeSignTexture(title, body) {
    try {
      var cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 256;
      var g = cv.getContext('2d');
      if (!g) return null;
      g.fillStyle = '#fdf6e3';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#8a6d3b';
      g.fillRect(0, 0, 256, 10);
      g.fillRect(0, 246, 256, 10);
      g.fillStyle = '#3a2f1b';
      g.font = 'bold 26px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(text(title, ''), 128, 48, 240);
      g.font = '18px system-ui, sans-serif';
      var words = text(body, '').split(' ');
      var line = '';
      var y = 92;
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (g.measureText(test).width > 224 && line) {
          g.fillText(line, 128, y, 240);
          line = words[i];
          y += 26;
          if (y > 232) break;
        } else {
          line = test;
        }
      }
      if (line && y <= 232) g.fillText(line, 128, y, 240);
      return new THREE.CanvasTexture(cv);
    } catch (e) {
      return null;
    }
  }

  function buildTotemText(x, z, title, body) {
    if (!scene) return;
    var group = ensureDecorGroup();
    var gy = heightAt(x, z);
    // Poste.
    var post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6),
      toonMaterial({ color: '#6b4226' })
    );
    post.position.set(x, gy + 1.2, z);
    post.castShadow = true;
    group.add(post);
    // Placa (dois lados com a mesma textura).
    var tex = makeSignTexture(title, body);
    var mat = tex ? new THREE.MeshBasicMaterial({ map: tex }) : toonMaterial({ color: '#fdf6e3' });
    var sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.12), mat);
    sign.position.set(x, gy + 3.1, z);
    sign.castShadow = true;
    group.add(sign);
  }

  function buildTotemImage(x, z, imageName, w) {
    if (!scene) return;
    var group = ensureDecorGroup();
    var gy = heightAt(x, z);
    var width = clamp(num(w, 3), 0.5, 20);
    var height = width * 0.7;
    var post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, gy > -100 ? 2 : 2, 6),
      toonMaterial({ color: '#5a4632' })
    );
    post.position.set(x, gy + 1, z);
    post.castShadow = true;
    group.add(post);
    var frame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.3, height + 0.3, 0.16),
      toonMaterial({ color: '#3a2f1b' })
    );
    frame.position.set(x, gy + 2 + height / 2, z);
    frame.castShadow = true;
    group.add(frame);
    var tex = imageTexture(imageName);
    var mat = tex
      ? new THREE.MeshBasicMaterial({ map: tex })
      : toonMaterial({ color: '#8892a0' });
    var pic = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    pic.position.set(x, gy + 2 + height / 2, z + 0.1);
    group.add(pic);
    return { x: x, z: z, image: imageName };
  }

  /** Textura de imagem do projeto (data:URL), via <img>. Rede morta ⇒ img.src. */
  var _imgTexCache = null;
  function imageTexture(name) {
    var key = text(name, '');
    if (!key) return null;
    if (!_imgTexCache) _imgTexCache = {};
    if (_imgTexCache[key]) return _imgTexCache[key];
    var url = ASSETS[key];
    if (!url) {
      warnOnce('img:' + key, 'a imagem "' + key + '" não está no projeto');
      return null;
    }
    try {
      var tex = new THREE.Texture();
      var img = new Image();
      img.onload = function () {
        tex.image = img;
        tex.needsUpdate = true;
      };
      img.src = url;
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      _imgTexCache[key] = tex;
      return tex;
    } catch (e) {
      return null;
    }
  }

  function addPoint(name, x, z) {
    var p = { name: text(name, ''), x: num(x, 0), z: num(z, 0), r: 4 };
    points.push(p);
    if (!scene) return;
    // Pilar-marcador brilhante (bloom pega nele).
    var group = ensureDecorGroup();
    var gy = heightAt(p.x, p.z);
    var mat = toonMaterial({ color: '#22d3ee' });
    if (mat.emissive) { try { mat.emissive.set('#0891b2'); } catch (e) {} }
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 7), mat);
    pole.position.set(p.x, gy + 0.8, z);
    group.add(pole);
    p.marker = pole;
  }

  function addZone(name, x, z, r) {
    zones.push({ name: text(name, ''), x: num(x, 0), z: num(z, 0), r: clamp(num(r, 6), 0.5, 200), inside: false });
  }

  function firePoint(name) {
    var hooks = pointHooks[name] || [];
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) {
        warnOnce('hook-point-' + name + '-' + i, 'erro no "Quando apertar E no ponto ' + name + '": ' + e);
      }
    }
  }

  function fireZone(name) {
    var hooks = zoneHooks[name] || [];
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) {
        warnOnce('hook-zone-' + name + '-' + i, 'erro no "Quando entrar na área ' + name + '": ' + e);
      }
    }
  }

  /** A cada quadro: badge "E" no ponto mais perto, gatilho de E e de zona. */
  function stepInteractions() {
    if (!carState) return;
    var cx = carState.x;
    var cz = carState.z;
    // Árbitro ÚNICO do "aperte E" (R11): pontos + interagíveis extras (entrar no
    // veículo, falar com o amigo, escrever recado… registram em extraInteract).
    // Maior prioridade ganha; no empate, o mais perto. O badge mostra o rótulo.
    var best = null;
    var bestD = Infinity;
    var bestPrio = -Infinity;
    var bestLabel = 'E';
    var bestFire = null;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var dx = cx - p.x;
      var dz = cz - p.z;
      var d = dx * dx + dz * dz;
      if (d < p.r * p.r && (bestPrio < 0 || d < bestD)) {
        bestD = d;
        best = p;
        bestPrio = 0;
        bestLabel = 'E';
        bestFire = null;
      }
      if (p.marker) p.marker.rotation.y += currentDt * 1.5;
    }
    for (var xi = 0; xi < extraInteract.length; xi++) {
      var ex = extraInteract[xi];
      var edx = cx - ex.x;
      var edz = cz - ex.z;
      var ed = edx * edx + edz * edz;
      var eprio = ex.prio || 0;
      if (ed < ex.r * ex.r && (eprio > bestPrio || (eprio === bestPrio && ed < bestD))) {
        bestD = ed;
        best = ex;
        bestPrio = eprio;
        bestLabel = ex.label || 'E';
        bestFire = ex.fire || null;
      }
    }
    updatePrompt(best, bestLabel);
    if (best && isJust('e')) {
      if (bestFire) {
        try { bestFire(); } catch (e) { warnOnce('interact-fire', 'erro no interagir: ' + e); }
      } else {
        firePoint(best.name);
      }
    }
    // Zonas: dispara na ENTRADA (estava fora, agora dentro).
    for (var z = 0; z < zones.length; z++) {
      var zn = zones[z];
      var zdx = cx - zn.x;
      var zdz = cz - zn.z;
      var now = zdx * zdx + zdz * zdz < zn.r * zn.r;
      if (now && !zn.inside) fireZone(zn.name);
      zn.inside = now;
    }
  }

  function updatePrompt(p, label) {
    if (!p) {
      if (promptEl) promptEl.style.display = 'none';
      return;
    }
    if (!ensureShell()) return;
    if (!promptEl) {
      promptEl = document.createElement('div');
      promptEl.setAttribute('style', 'position:absolute;padding:4px 10px;border-radius:10px;background:#22d3ee;color:#04252b;font:800 15px system-ui,sans-serif;transform:translate(-50%,-100%);pointer-events:none;z-index:7;box-shadow:0 3px 10px rgba(0,0,0,.35)');
      promptEl.textContent = 'E';
      frameEl.appendChild(promptEl);
    }
    promptEl.textContent = label || 'E';
    if (!camera || !renderer || !_proj) return;
    _proj.set(p.x, typeof p.promptY === 'number' ? p.promptY : heightAt(p.x, p.z) + 2.4, p.z);
    _proj.project(camera);
    if (_proj.z >= 1) { promptEl.style.display = 'none'; return; }
    var rect = canvasEl.getBoundingClientRect();
    promptEl.style.left = (_proj.x * 0.5 + 0.5) * rect.width + 'px';
    promptEl.style.top = (-_proj.y * 0.5 + 0.5) * rect.height + 'px';
    promptEl.style.display = 'block';
  }

  /** Reserva o terreno da praça (SÓ dados — seguro antes do start). */
  function reserveGallery(x, z) {
    terrainMods.push({ kind: 'flatten', x: num(x, 0), z: num(z, 0), r: 14, y: baseHeightAt(num(x, 0), num(z, 0)) });
    exclusions.push({ x: num(x, 0), z: num(z, 0), r: 16 });
  }

  // Galeria: praça + arco de quadros. Cada quadro é um totem-imagem + um ponto
  // "E: ver" que abre o overlay de zoom. (O terreno já foi reservado no record.)
  function buildGalleryBase(x, z, title) {
    if (!scene) return;
    if (worldReady) {
      // Chamada AO VIVO (depois do start): reserva + reconstrói o terreno agora.
      reserveGallery(x, z);
      buildTerrain();
      if (grassMat) buildGrassHeightTex();
      if (waterMat) buildWaterFoamTex();
    }
    galleries.push({ x: num(x, 0), z: num(z, 0), count: 0 });
    buildTotemText(num(x, 0), num(z, 0) - 10, text(title, 'Galeria'), '');
  }

  function galleryAdd(imageName, caption) {
    if (!galleries.length) {
      warn('crie a galeria antes com "Criar a galeria de projetos"');
      return;
    }
    var gal = galleries[galleries.length - 1];
    // Arco de até 8 quadros ao redor do centro (raio 11).
    var idx = gal.count;
    gal.count++;
    var ang = -Math.PI / 2 + (idx - 3.5) * 0.32;
    var px = gal.x + Math.cos(ang) * 11;
    var pz = gal.z + Math.sin(ang) * 11;
    buildTotemImage(px, pz, imageName, 3.4);
    // Ponto "E: ver" que abre o zoom.
    var pname = '__galeria_' + galleries.length + '_' + idx;
    addPoint(pname, px, pz + 2);
    pointHooks[pname] = [function () { openGallery(imageName, caption); }];
  }

  function openGallery(imageName, caption) {
    if (!ensureShell()) return;
    if (!galleryEl) {
      galleryEl = document.createElement('div');
      galleryEl.setAttribute('style', 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(6,10,16,.82);z-index:9;cursor:pointer');
      galleryEl.addEventListener('click', function () { galleryEl.style.display = 'none'; });
      frameEl.appendChild(galleryEl);
    }
    var url = ASSETS[text(imageName, '')];
    galleryEl.innerHTML = '';
    if (url) {
      var im = document.createElement('img');
      im.src = url;
      im.setAttribute('style', 'max-width:80%;max-height:70%;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.6)');
      galleryEl.appendChild(im);
    }
    var cap = document.createElement('div');
    cap.setAttribute('style', 'color:#fff;font:600 20px system-ui,sans-serif;text-align:center');
    cap.textContent = text(caption, '');
    galleryEl.appendChild(cap);
    var hint = document.createElement('div');
    hint.setAttribute('style', 'color:#9fb;opacity:.7;font:400 13px system-ui,sans-serif');
    hint.textContent = 'clique para fechar';
    galleryEl.appendChild(hint);
    galleryEl.style.display = 'flex';
  }

  // ---- 🏁 Kit Corrida (largada + checkpoints em ordem + cronômetro + recorde) ----

  function raceKey() {
    return 'w3d-recorde-' + (config.style || 'x');
  }

  function loadBest() {
    try {
      var v = window.localStorage ? window.localStorage.getItem(raceKey()) : null;
      var n = v == null ? 0 : Number(v);
      return isFinite(n) && n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(t) {
    try {
      if (window.localStorage) window.localStorage.setItem(raceKey(), String(t));
    } catch (e) {}
  }

  /** Portal-arco na largada + faixa (só visual). */
  function buildRacePortal(x, z, yaw) {
    if (!scene) return null;
    var group = new THREE.Group();
    var mat = toonMaterial({ color: '#f59e0b' });
    var gy = heightAt(x, z);
    var left = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 8), mat);
    left.position.set(-4, 2.5, 0);
    left.castShadow = true;
    var right = left.clone();
    right.position.set(4, 2.5, 0);
    var top = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 0.8), mat);
    top.position.set(0, 5, 0);
    group.add(left);
    group.add(right);
    group.add(top);
    group.position.set(x, gy, z);
    group.rotation.y = yaw * Math.PI / 180;
    ensureDecorGroup().add(group);
    return group;
  }

  /** Anel de checkpoint (torus em pé) que pulsa quando é o PRÓXIMO. */
  function buildCheckpointRing(x, z, yaw) {
    if (!scene) return null;
    var gy = heightAt(x, z);
    var mat = toonMaterial({ color: '#22d3ee' });
    if (mat.emissive) { try { mat.emissive.set('#0e7490'); } catch (e) {} }
    var geo = THREE.TorusGeometry ? new THREE.TorusGeometry(3, 0.35, 8, 20) : new THREE.CylinderGeometry(3, 3, 0.4, 16);
    var ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, gy + 3, z);
    ring.rotation.y = yaw * Math.PI / 180;
    ensureDecorGroup().add(ring);
    return { x: x, z: z, mesh: ring, mat: mat };
  }

  function fireRace(kind) {
    var hooks = raceHooks[kind] || [];
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) {
        warnOnce('hook-race-' + kind + '-' + i, 'erro no gancho da corrida "' + kind + '": ' + e);
      }
    }
  }

  function createRace(x, z, yaw, laps) {
    race = {
      x: num(x, 0), z: num(z, 0), yaw: num(yaw, 0),
      laps: Math.max(1, Math.floor(num(laps, 1))),
      checkpoints: [], state: 'idle', time: 0, lap: 1, next: 0,
      best: loadBest(), armed: false
    };
    if (worldReady) race.portal = buildRacePortal(race.x, race.z, race.yaw);
  }

  /** Constrói o visual da corrida (portal + anéis) no start, se ainda faltarem. */
  function buildRace() {
    if (!race || !scene) return;
    if (!race.portal) race.portal = buildRacePortal(race.x, race.z, race.yaw);
    for (var i = 0; i < race.checkpoints.length; i++) {
      var cp = race.checkpoints[i];
      if (!cp.mesh) {
        var built = buildCheckpointRing(cp.x, cp.z, 0);
        if (built) { cp.mesh = built.mesh; cp.mat = built.mat; }
      }
    }
    pulseRings();
  }

  function addCheckpoint(x, z, yaw) {
    if (!race) {
      warn('crie a corrida antes com "Criar a corrida"');
      return;
    }
    var cp = worldReady ? buildCheckpointRing(num(x, 0), num(z, 0), num(yaw, 0)) : { x: num(x, 0), z: num(z, 0), mesh: null, mat: null };
    race.checkpoints.push(cp);
  }

  function stepRace(dt) {
    if (!race || !carState) return;
    var cx = carState.x;
    var cz = carState.z;
    // Largada: cruzar perto do portal ARMA e inicia (idle→correndo).
    var ddx = cx - race.x;
    var ddz = cz - race.z;
    var nearStart = ddx * ddx + ddz * ddz < 36;  // raio 6
    if (race.state === 'idle') {
      // Só começa quando o carro se AFASTA e volta (evita começar parado nele).
      if (!nearStart) race.armed = true;
      if (race.armed && nearStart && race.checkpoints.length > 0) {
        race.state = 'correndo';
        race.time = 0;
        race.lap = 1;
        race.next = 0;
        pulseRings();
        fireRace('start');
      }
    } else if (race.state === 'correndo') {
      race.time += dt;
      // Checkpoint atual: passou perto do anel na ORDEM?
      var cp = race.checkpoints[race.next];
      if (cp) {
        var cdx = cx - cp.x;
        var cdz = cz - cp.z;
        if (cdx * cdx + cdz * cdz < 16) {  // raio 4
          race.next++;
          fireRace('checkpoint');
          if (race.next >= race.checkpoints.length) {
            // Volta completa: cruzar a largada de novo fecha a volta.
            race.next = 0;
            if (race.lap >= race.laps) {
              race.state = 'fim';
              if (!race.best || race.time < race.best) {
                race.best = race.time;
                saveBest(race.time);
              }
              fireRace('finish');
            } else {
              race.lap++;
            }
          }
          pulseRings();
        }
      }
      // Pulso do próximo anel.
      var glow = race.checkpoints[race.next];
      for (var i = 0; i < race.checkpoints.length; i++) {
        var r = race.checkpoints[i];
        if (r.mesh) r.mesh.scale.setScalar(r === glow ? 1 + Math.sin(playTime * 4) * 0.08 : 1);
      }
      // HUD automático.
      setHud('topo-esquerda', 'Tempo ' + race.time.toFixed(1) + 's  \\u00b7  ponto ' + Math.min(race.next + 1, race.checkpoints.length) + '/' + race.checkpoints.length + '  \\u00b7  volta ' + race.lap + '/' + race.laps);
    }
  }

  function pulseRings() {
    if (!race) return;
    for (var i = 0; i < race.checkpoints.length; i++) {
      var r = race.checkpoints[i];
      if (r.mat) {
        try { r.mat.color.set(i === race.next ? '#22d3ee' : '#0891b2'); } catch (e) {}
      }
    }
  }

  // ---- 🎳 Kit Boliche / derrubar (knockdown arcade, sem solver de física) ----

  /** Cria um corpo tombável (pino/caixa/lata) na cena, guardando o "home". */
  function makeKnockable(x, z, kind, s) {
    if (!scene) return null;
    var gy = heightAt(x, z);
    var mesh, r, h;
    if (kind === 'caixa') {
      var sz = 0.8 * s;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), toonMaterial({ color: '#b7791f' }));
      r = sz * 0.6; h = sz;
      mesh.position.set(x, gy + sz / 2, z);
    } else if (kind === 'lata') {
      r = 0.28 * s; h = 0.7 * s;
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), toonMaterial({ color: '#a0aec0' }));
      mesh.position.set(x, gy + h / 2, z);
    } else {
      // pino (boliche): cilindro branco afunilado.
      r = 0.22 * s; h = 0.9 * s;
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, h, 10), toonMaterial({ color: '#fefefe' }));
      mesh.position.set(x, gy + h / 2, z);
    }
    mesh.castShadow = true;
    ensureDecorGroup().add(mesh);
    var k = {
      mesh: mesh, x: x, z: z, y: gy, baseY: gy, r: r, h: h,
      vx: 0, vz: 0, vy: 0, tilt: 0, tiltAxis: 0, down: false, home: { x: x, z: z, kind: kind, s: s }
    };
    knockables.push(k);
    return k;
  }

  function knockableHit(k, fromX, fromZ, power) {
    if (k.down) return;
    var dx = k.x - fromX;
    var dz = k.z - fromZ;
    var d = Math.sqrt(dx * dx + dz * dz) || 0.001;
    var push = Math.min(14, power);
    k.vx += (dx / d) * push;
    k.vz += (dz / d) * push;
    k.vy += Math.min(4, push * 0.3);
    k.tiltAxis = Math.atan2(dz, dx);
  }

  function stepKnockables(dt) {
    if (!knockables.length) return;
    var cx = carState ? carState.x : 0;
    var cz = carState ? carState.z : 0;
    var cspd = carState ? Math.abs(carState.speed) : 0;
    for (var i = 0; i < knockables.length; i++) {
      var k = knockables[i];
      // Carro encosta? impulso proporcional à velocidade.
      if (!k.down && carState) {
        var ddx = k.x - cx;
        var ddz = k.z - cz;
        var rr = k.r + 1.2;
        if (ddx * ddx + ddz * ddz < rr * rr && cspd > 2) {
          knockableHit(k, cx, cz, cspd);
        }
      }
      var moving = Math.abs(k.vx) + Math.abs(k.vz) + Math.abs(k.vy) > 0.05 || k.y > k.baseY + 0.01;
      if (!moving && !k.down) continue;
      // Integra velocidade + gravidade + quique no chão.
      k.vy -= 22 * dt;
      k.x += k.vx * dt;
      k.z += k.vz * dt;
      k.y += k.vy * dt;
      var gy = heightAt(k.x, k.z);
      if (k.y < gy) {
        k.y = gy;
        k.vy = k.down ? 0 : -k.vy * 0.3;
        k.vx *= 0.6;
        k.vz *= 0.6;
      }
      // Atrito no chão.
      k.vx *= (1 - Math.min(1, 2 * dt));
      k.vz *= (1 - Math.min(1, 2 * dt));
      var speed = Math.sqrt(k.vx * k.vx + k.vz * k.vz);
      // Tomba quando levou pancada (velocidade alta) — lerp do 0 (em pé) a PI/2.
      if (!k.down && (speed > 2.5 || k.tilt > 0.02)) {
        k.tilt += (Math.PI / 2 - k.tilt) * Math.min(1, 4 * dt);
        if (k.tilt > 1.3) {
          k.down = true;
          onKnockDown();
        }
      }
      // Propaga para vizinhos próximos (pino bate em pino).
      if (speed > 1.5) {
        for (var j = 0; j < knockables.length; j++) {
          if (j === i) continue;
          var o = knockables[j];
          if (o.down) continue;
          var nx = o.x - k.x;
          var nz = o.z - k.z;
          if (nx * nx + nz * nz < (k.r + o.r + 0.15) * (k.r + o.r + 0.15)) {
            knockableHit(o, k.x, k.z, speed * 0.8);
          }
        }
      }
      // Aplica no visual.
      if (k.mesh) {
        k.mesh.position.set(k.x, k.y + k.h / 2, k.z);
        k.mesh.rotation.set(Math.sin(k.tiltAxis) * k.tilt, 0, -Math.cos(k.tiltAxis) * k.tilt);
      }
    }
  }

  function onKnockDown() {
    if (!bowling) return;
    var allDown = true;
    for (var i = 0; i < bowling.pins.length; i++) {
      if (!bowling.pins[i].down) { allDown = false; break; }
    }
    if (allDown && bowling.pins.length > 0) {
      for (var h = 0; h < bowling.strikeHooks.length; h++) {
        try { bowling.strikeHooks[h](); } catch (e) {
          warnOnce('hook-strike-' + h, 'erro no "Quando derrubar todos os pinos": ' + e);
        }
      }
    }
  }

  function knockedCount() {
    var n = 0;
    for (var i = 0; i < knockables.length; i++) if (knockables[i].down) n++;
    return n;
  }

  function resetKnockables() {
    for (var i = 0; i < knockables.length; i++) {
      var k = knockables[i];
      k.x = k.home.x;
      k.z = k.home.z;
      k.y = k.baseY;
      k.vx = k.vz = k.vy = 0;
      k.tilt = 0;
      k.down = false;
      if (k.mesh) {
        k.mesh.position.set(k.x, k.baseY + k.h / 2, k.z);
        k.mesh.rotation.set(0, 0, 0);
      }
    }
  }

  /** Pista de boliche: 10 pinos em triângulo na frente da posição dada. */
  function buildBowling(x, z, yaw) {
    if (!scene) return;
    bowling = { x: num(x, 0), z: num(z, 0), pins: [], strikeHooks: [] };
    var a = num(yaw, 0) * Math.PI / 180;
    var fx = Math.sin(a);
    var fz = Math.cos(a);
    var rx = Math.cos(a);
    var rz = -Math.sin(a);
    var spacing = 0.8;
    var idx = 0;
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col <= row; col++) {
        var off = (col - row / 2) * spacing;
        var px = bowling.x + fx * row * spacing + rx * off;
        var pz = bowling.z + fz * row * spacing + rz * off;
        var pin = makeKnockable(px, pz, 'pino', 1);
        if (pin) bowling.pins.push(pin);
        idx++;
      }
    }
  }

  /** Constrói TODAS as receitas de decoração em ordem (chamado no initWorld). */
  function buildDecor() {
    for (var i = 0; i < decorRecipes.length; i++) {
      var r = decorRecipes[i];
      if (r.kind === 'point') addPoint(r.name, r.x, r.z);
      else if (r.kind === 'zone') addZone(r.name, r.x, r.z, r.r);
      else if (r.kind === 'totemText') buildTotemText(r.x, r.z, r.title, r.body);
      else if (r.kind === 'totemImage') buildTotemImage(r.x, r.z, r.image, r.w);
      else if (r.kind === 'galleryCreate') buildGalleryBase(r.x, r.z, r.title);
      else if (r.kind === 'galleryAdd') galleryAdd(r.image, r.caption);
      else if (r.kind === 'bowling') buildBowling(r.x, r.z, r.yaw);
      else if (r.kind === 'stack') buildStack(r.n, r.thing, r.x, r.z);
      else if (r.kind === 'pushPlace') addPushable(r.thing, r.x, r.z);
      else if (r.kind === 'pushScatter') buildPushScatter(r.n, r.x, r.z, r.r);
      else if (r.kind === 'letters') addLetters(r.word, r.x, r.z, r.s);
      else if (r.kind === 'explosive') addExplosive(r.x, r.z);
      else if (r.kind === 'waterfall') buildWaterfall(r.x, r.z, r.h, r.deg);
      else if (r.kind === 'lamp') addLamp(r.x, r.z);
      else if (r.kind === 'fireflies') buildFireflies(r.amount);
      else if (r.kind === 'campfire') addCampfire(r.x, r.z);
      else if (r.kind === 'bridge') buildBridge(r.x1, r.z1, r.x2, r.z2, r.w);
      else if (r.kind === 'lighthouse') buildLighthouse(r.x, r.z);
    }
  }

  /** Espalha N empurráveis variados num raio (determinístico pela posição). */
  function buildPushScatter(n, x, z, r) {
    var kinds = ['tijolo', 'banco', 'cerca', 'lanterna', 'cone'];
    var count = clamp(num(n, 8), 1, 60);
    var rng = mulberry(Math.round(num(x, 0) * 13 + num(z, 0) * 7) + 99);
    for (var i = 0; i < count; i++) {
      var ang = rng() * Math.PI * 2;
      var rad = Math.sqrt(rng()) * clamp(num(r, 10), 2, 80);
      addPushable(kinds[Math.floor(rng() * kinds.length)], num(x, 0) + Math.cos(ang) * rad, num(z, 0) + Math.sin(ang) * rad);
    }
  }

  /** Empilha N caixas/latas numa coluna que o carro derruba. */
  function buildStack(n, thing, x, z) {
    if (!scene) return;
    var kind = thing === 'latas' ? 'lata' : 'caixa';
    var count = Math.floor(clamp(num(n, 3), 1, 30));
    var step = kind === 'lata' ? 0.72 : 0.82;
    var baseGy = heightAt(num(x, 0), num(z, 0));
    for (var i = 0; i < count; i++) {
      var k = makeKnockable(num(x, 0), num(z, 0), kind, 1);
      if (k) {
        // Empilha acima do chão (a base guarda a altura da pilha).
        k.baseY = baseGy + i * step;
        k.y = k.baseY;
        if (k.mesh) k.mesh.position.y = k.baseY + k.h / 2;
      }
    }
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
      resumeAudio();
      // Konami (↑↑↓↓←→←→BA): o carrinho vira FOGUETE. Segredo de quem sabe.
      if (!e.repeat) {
        konamiBuf.push(String(e.code));
        if (konamiBuf.length > 10) konamiBuf.shift();
        if (!rocketMode && konamiBuf.join(',') === KONAMI) {
          rocketMode = true;
          if (carGroup) buildCar();
          beep(660, 0.09);
          beep(880, 0.12);
        }
      }
      // As teclas do passeio rolam a página do iframe (setas/espaço) — segura.
      if (k === ' ' || k.indexOf('arrow') === 0) {
        try { e.preventDefault(); } catch (err) {}
      }
    });
    window.addEventListener('pointerdown', function () {
      resumeAudio();
    });
    window.addEventListener('keyup', function (e) {
      keys[String(e.key).toLowerCase()] = false;
    });
    window.addEventListener('contextmenu', function () { keys = {}; });
    window.addEventListener('blur', function () { keys = {}; });
    ensureJoystick();
  }

  /** Joystick virtual (só em toque): alavanca esquerda = dirigir; botões pular/E. */
  function ensureJoystick() {
    try {
      var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (!coarse || !frameEl) return;
    } catch (e) { return; }
    var stick = document.createElement('div');
    stick.setAttribute('style', 'position:absolute;left:20px;bottom:20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.35);z-index:8;touch-action:none');
    var nub = document.createElement('div');
    nub.setAttribute('style', 'position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.55)');
    stick.appendChild(nub);
    frameEl.appendChild(stick);
    var active = false;
    function setDir(dx, dy) {
      keys['w'] = dy < -0.3;
      keys['s'] = dy > 0.3;
      keys['a'] = dx < -0.3;
      keys['d'] = dx > 0.3;
      nub.style.left = (35 + dx * 35) + 'px';
      nub.style.top = (35 + dy * 35) + 'px';
    }
    function clearDir() {
      keys['w'] = keys['s'] = keys['a'] = keys['d'] = false;
      nub.style.left = '35px';
      nub.style.top = '35px';
    }
    stick.addEventListener('pointerdown', function (e) { active = true; hideSplash(); resumeAudio(); try { stick.setPointerCapture(e.pointerId); } catch (err) {} });
    stick.addEventListener('pointermove', function (e) {
      if (!active) return;
      var rect = stick.getBoundingClientRect();
      var dx = (e.clientX - rect.left - 60) / 45;
      var dy = (e.clientY - rect.top - 60) / 45;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) { dx /= len; dy /= len; }
      setDir(dx, dy);
    });
    stick.addEventListener('pointerup', function () { active = false; clearDir(); });
    stick.addEventListener('pointercancel', function () { active = false; clearDir(); });
    // Botões pular (espaço) e E.
    var jump = document.createElement('button');
    jump.textContent = '⤒';
    jump.setAttribute('style', 'position:absolute;right:24px;bottom:80px;width:64px;height:64px;border-radius:50%;border:0;background:rgba(16,185,129,.7);color:#fff;font-size:26px;z-index:8;touch-action:none');
    jump.addEventListener('pointerdown', function () { keys[' '] = true; justPressed[' '] = true; });
    jump.addEventListener('pointerup', function () { keys[' '] = false; });
    frameEl.appendChild(jump);
    var eb = document.createElement('button');
    eb.textContent = 'E';
    eb.setAttribute('style', 'position:absolute;right:96px;bottom:28px;width:56px;height:56px;border-radius:50%;border:0;background:rgba(34,211,238,.75);color:#04252b;font-weight:800;font-size:20px;z-index:8;touch-action:none');
    eb.addEventListener('pointerdown', function () { keys['e'] = true; justPressed['e'] = true; });
    eb.addEventListener('pointerup', function () { keys['e'] = false; });
    frameEl.appendChild(eb);
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

      _proj = new THREE.Vector3();
      buildTerrain();
      if (waterCfg) buildWater();
      if (carCfg) buildCar();
      if (personCfg) buildPerson();
      if (boatCfg) buildBoat();
      // Barco SEM carrinho e SEM personagem: pilota o barco direto.
      if (boatCfg && !carCfg && !personCfg) {
        activeVehicle = 'boat';
        driving = true;
      }
      buildNature();
      buildDecor();
      buildRace();
      if (grassCfg) buildGrass();

      worldReady = true;
      if (atmoUsed) {
        _skyDrawnAt = -1;
        applyAtmosphere();
      }
      if (weatherKind !== 'limpo') buildWeather();
      if (cloudsAmount !== 'nenhuma') buildClouds();
      if (seasonName) applySeason();
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

  // ---- R12: pool de festa (confete/fogos), tornado, estação, nuvens, raio ----

  function ensureParty() {
    if (partyPts || !scene) return;
    partyGeo = new THREE.BufferGeometry();
    var pos = new Float32Array(PARTY_N * 3);
    var col = new Float32Array(PARTY_N * 3);
    for (var i = 0; i < PARTY_N; i++) pos[i * 3 + 1] = -9999;
    partyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    partyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.5, vertexColors: true, sizeAttenuation: true,
      transparent: true, opacity: 0.95, depthWrite: false
    });
    var tex = ensureSpriteTex();
    if (tex) mat.map = tex;
    partyPts = new THREE.Points(partyGeo, mat);
    partyPts.frustumCulled = false;
    scene.add(partyPts);
    partyState = [];
    for (var j = 0; j < PARTY_N; j++) {
      partyState.push({ x: 0, y: -9999, z: 0, vx: 0, vy: 0, vz: 0, age: 0, ttl: 0, g: 6, flut: 0 });
    }
  }

  function spawnParty(x, y, z, vx, vy, vz, ttl, g, flut, colorHex) {
    if (!partyState) return;
    var i = partyIdx;
    partyIdx = (partyIdx + 1) % PARTY_N;
    var p = partyState[i];
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.age = 0; p.ttl = ttl; p.g = g; p.flut = flut;
    var col = partyGeo.getAttribute('color');
    var c = new THREE.Color(colorHex);
    col.setXYZ(i, c.r, c.g, c.b);
    col.needsUpdate = true;
  }

  function playerXZ() {
    if (personCfg && !driving && personState) {
      return { x: personState.x, y: personState.y, z: personState.z };
    }
    if (carState) return { x: carState.x, y: carState.y, z: carState.z };
    return { x: 0, y: heightAt(0, 0), z: 0 };
  }

  /** O "jogador ativo" que a câmera segue: a pé, no barco OU no carrinho. */
  function focusState() {
    if (personCfg && !driving && personState) return personState;
    if (driving && activeVehicle === 'boat' && boatState) return boatState;
    return carState;
  }

  function confettiBurst() {
    ensureParty();
    if (!partyState) return;
    var p = playerXZ();
    for (var i = 0; i < 90; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1 + Math.random() * 3;
      spawnParty(
        p.x + (Math.random() - 0.5) * 2, p.y + 5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 2,
        Math.cos(a) * sp, 1 + Math.random() * 2.5, Math.sin(a) * sp,
        2.4, 4.5, 1, PARTY_COLORS[i % PARTY_COLORS.length]
      );
    }
  }

  function fireworksLaunch() {
    ensureParty();
    if (!partyState) return;
    var p = playerXZ();
    var fx = p.x + (Math.random() - 0.5) * 26;
    var fz = p.z - 14 - Math.random() * 14;
    fwRockets.push({ x: fx, z: fz, y: heightAt(fx, fz) + 1, peak: 20 + Math.random() * 10, cd: 0 });
    beep(988, 0.12);
  }

  function burstAt(x, y, z) {
    var colorHex = PARTY_COLORS[Math.floor(Math.random() * PARTY_COLORS.length)];
    for (var i = 0; i < 80; i++) {
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      var sp = 6 + Math.random() * 4;
      spawnParty(
        x, y, z,
        Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp, Math.sin(ph) * Math.sin(th) * sp,
        1.6, 5, 0, colorHex
      );
    }
    beep(65, 0.35);
    _shakeT = Math.max(_shakeT, 0.15);
    _shakeAmp = Math.max(_shakeAmp, 0.08);
  }

  function stepParty(dt) {
    // Foguetes dos fogos sobem soltando um rastro; no pico, explodem em esfera.
    for (var r = fwRockets.length - 1; r >= 0; r--) {
      var rk = fwRockets[r];
      rk.y += 26 * dt;
      rk.cd -= dt;
      if (rk.cd <= 0 && partyState) {
        rk.cd = 0.03;
        spawnParty(rk.x, rk.y, rk.z, 0, -1, 0, 0.5, 2, 0, '#fde68a');
      }
      if (rk.y >= rk.peak) {
        burstAt(rk.x, rk.y, rk.z);
        fwRockets.splice(r, 1);
      }
    }
    if (!partyState) return;
    var pos = partyGeo.getAttribute('position');
    var any = false;
    for (var i = 0; i < PARTY_N; i++) {
      var p = partyState[i];
      if (p.ttl <= 0) continue;
      p.age += dt;
      if (p.age >= p.ttl) {
        p.ttl = 0;
        pos.setXYZ(i, 0, -9999, 0);
        any = true;
        continue;
      }
      p.vy -= p.g * dt;
      p.x += p.vx * dt + (p.flut ? Math.sin((p.age + i) * 7) * 0.8 * dt : 0);
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      pos.setXYZ(i, p.x, p.y, p.z);
      any = true;
    }
    if (any) pos.needsUpdate = true;
  }

  // Tornado: 3 cilindros girando que passeiam por waypoints e SUGAM o carrinho.
  function startTornado(secs) {
    if (!scene) {
      warn('use "Soltar um tornado" depois do "Começar o passeio"');
      return;
    }
    var ttl = clamp(num(secs, 15), 3, 60);
    if (tornadoState) {
      tornadoState.ttl = ttl;
      return;
    }
    var group = new THREE.Group();
    var cyls = [];
    var mats = [];
    var spec = [
      { r1: 0.9, r2: 1.8, h: 5, y: 2.5 },
      { r1: 1.8, r2: 3.0, h: 6, y: 8 },
      { r1: 3.0, r2: 4.4, h: 7, y: 14.5 }
    ];
    for (var i = 0; i < spec.length; i++) {
      var s = spec[i];
      var m = new THREE.MeshBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.34, depthWrite: false });
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(s.r1, s.r2, s.h, 10, 1, true), m);
      cyl.position.y = s.y;
      group.add(cyl);
      cyls.push(cyl);
      mats.push(m);
    }
    var p = playerXZ();
    var tx = p.x + 24;
    var tz = p.z + 10;
    group.position.set(tx, heightAt(tx, tz), tz);
    scene.add(group);
    tornadoState = { group: group, cyls: cyls, mats: mats, ttl: ttl, x: tx, z: tz, tx: tx, tz: tz, flingCd: 0 };
  }

  function stepTornado(dt) {
    if (!tornadoState) return;
    var t = tornadoState;
    t.ttl -= dt;
    for (var i = 0; i < t.cyls.length; i++) {
      t.cyls[i].rotation.y += (3.4 - i * 0.8) * dt;
    }
    // Passeia por waypoints dentro do mundo.
    var ddx = t.tx - t.x;
    var ddz = t.tz - t.z;
    var d = Math.sqrt(ddx * ddx + ddz * ddz);
    if (d < 3) {
      var lim = config.world / 2 - 12;
      t.tx = (Math.random() * 2 - 1) * lim;
      t.tz = (Math.random() * 2 - 1) * lim;
    } else {
      t.x += (ddx / d) * 7 * dt;
      t.z += (ddz / d) * 7 * dt;
    }
    t.group.position.set(t.x, heightAt(t.x, t.z), t.z);
    // Sucção: perto puxa; MUITO perto arremessa o carrinho pro alto (uma vez).
    t.flingCd -= dt;
    if (carState) {
      var cdx = t.x - carState.x;
      var cdz = t.z - carState.z;
      var cd = Math.sqrt(cdx * cdx + cdz * cdz);
      if (cd < 9 && cd > 0.01) {
        carState.x += (cdx / cd) * 8 * dt;
        carState.z += (cdz / cd) * 8 * dt;
      }
      if (cd < 3 && t.flingCd <= 0) {
        t.flingCd = 1.5;
        carState.vy = 15;
        carState.airborne = true;
        carState.pitchV += 2.5;
        _shakeT = Math.max(_shakeT, 0.5);
        _shakeAmp = Math.max(_shakeAmp, 0.35);
      }
    }
    // Última hora: esmaece e vai embora.
    if (t.ttl < 1) {
      for (var mi = 0; mi < t.mats.length; mi++) t.mats[mi].opacity = 0.34 * Math.max(0, t.ttl);
    }
    if (t.ttl <= 0) {
      try {
        scene.remove(t.group);
        for (var ci = 0; ci < t.cyls.length; ci++) {
          t.cyls[ci].geometry.dispose();
          t.mats[ci].dispose();
        }
      } catch (e) {}
      tornadoState = null;
    }
  }

  // Estações: recolorem as COPAS (materiais compartilhados) e a grama (uniforms).
  var LEAF_KEYS = ['#3e8f3e', '#57a344', '#2d6a34', '#357c3c', '#3f8f46'];
  var SEASONS = {
    primavera: { leaves: ['#55b055', '#74c463', '#3f8d4b', '#4da457', '#58b862'], grass: ['#3f7c2f', '#68b04a'], weather: null },
    verao: { leaves: null, grass: null, weather: null },
    outono: { leaves: ['#d97706', '#ea9a3c', '#b45309', '#c2620e', '#a16207'], grass: ['#8a5a1f', '#c98a2e'], weather: 'folhas' },
    inverno: { leaves: ['#e5e7eb', '#f3f4f6', '#cbd5e1', '#dbe3ec', '#eef1f5'], grass: ['#9fb2c4', '#dbe4ee'], weather: 'neve' }
  };

  function applySeason() {
    if (!seasonName || !worldReady) return;
    var sz = SEASONS[seasonName];
    if (!sz) return;
    // Guarda os originais UMA vez (p/ o verão restaurar).
    if (!_seasonOrig) {
      _seasonOrig = { leaves: {}, grass: null };
      for (var k = 0; k < LEAF_KEYS.length; k++) {
        var key = LEAF_KEYS[k];
        if (speciesMats && speciesMats[key]) _seasonOrig.leaves[key] = '#' + speciesMats[key].color.getHexString();
      }
      if (grassMat && grassMat.uniforms.uColorA) {
        _seasonOrig.grass = [
          grassMat.uniforms.uColorA.value.clone(),
          grassMat.uniforms.uColorB.value.clone()
        ];
      }
    }
    for (var i = 0; i < LEAF_KEYS.length; i++) {
      var lk = LEAF_KEYS[i];
      if (!speciesMats || !speciesMats[lk]) continue;
      var target = sz.leaves ? sz.leaves[i] : (_seasonOrig.leaves[lk] || lk);
      try { speciesMats[lk].color.set(target); } catch (e) {}
    }
    if (grassMat && grassMat.uniforms.uColorA) {
      if (sz.grass) {
        var ga = new THREE.Color(sz.grass[0]);
        var gb = new THREE.Color(sz.grass[1]);
        grassMat.uniforms.uColorA.value.set(ga.r, ga.g, ga.b);
        grassMat.uniforms.uColorB.value.set(gb.r, gb.g, gb.b);
      } else if (_seasonOrig.grass) {
        grassMat.uniforms.uColorA.value.copy(_seasonOrig.grass[0]);
        grassMat.uniforms.uColorB.value.copy(_seasonOrig.grass[1]);
      }
    }
    // Outono chove folhas, inverno neva — só se a criança não pediu outro clima.
    if (sz.weather && weatherKind === 'limpo') {
      weatherKind = sz.weather;
      buildWeather();
    }
  }

  // Nuvens: pontos GRANDES e moles lá no alto, derivando com o vento.
  var CLOUD_AMOUNTS = { nenhuma: 0, poucas: 10, muitas: 26 };

  function buildClouds() {
    if (cloudsPts) {
      try {
        scene.remove(cloudsPts.mesh);
        cloudsPts.geo.dispose();
        cloudsPts.mat.dispose();
      } catch (e) {}
      cloudsPts = null;
    }
    var n = CLOUD_AMOUNTS[cloudsAmount] || 0;
    if (!scene || n <= 0) return;
    var rng = mulberry(777);
    var pos = new Float32Array(n * 3);
    var lim = config.world * 0.9;
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (rng() * 2 - 1) * lim;
      pos[i * 3 + 1] = 55 + rng() * 30;
      pos[i * 3 + 2] = (rng() * 2 - 1) * lim;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      color: '#ffffff', size: 34, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false
    });
    var tex = ensureSpriteTex();
    if (tex) mat.map = tex;
    var mesh = new THREE.Points(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    cloudsPts = { mesh: mesh, geo: geo, mat: mat, pos: pos, n: n };
  }

  function stepClouds(dt) {
    if (!cloudsPts) return;
    var cx = carState ? carState.x : 0;
    var cz = carState ? carState.z : 0;
    var lim = config.world * 0.95;
    for (var i = 0; i < cloudsPts.n; i++) {
      var ix = i * 3;
      cloudsPts.pos[ix] += (1.2 + wind * 2.4) * dt;
      if (cloudsPts.pos[ix] > cx + lim) cloudsPts.pos[ix] -= lim * 2;
    }
    cloudsPts.geo.attributes.position.needsUpdate = true;
  }

  // Tempestade: raio em zigue-zague + clarão + trovão atrasado pela distância.
  function ensureBolt() {
    if (boltLine || !scene) return;
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 2 * 3), 3));
    var mat = new THREE.LineBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.95 });
    boltLine = new THREE.LineSegments(geo, mat);
    boltLine.frustumCulled = false;
    boltLine.visible = false;
    scene.add(boltLine);
  }

  function strikeBolt() {
    ensureBolt();
    if (!boltLine) return;
    var p = playerXZ();
    var sx = p.x + (Math.random() * 2 - 1) * 46;
    var sz2 = p.z + (Math.random() * 2 - 1) * 46;
    var pos = boltLine.geometry.getAttribute('position');
    var x = sx;
    var y = 44;
    var z = sz2;
    for (var i = 0; i < 9; i++) {
      var nx = x + (Math.random() - 0.5) * 4;
      var ny = y - (44 - heightAt(sx, sz2)) / 9;
      var nz = z + (Math.random() - 0.5) * 4;
      pos.setXYZ(i * 2, x, y, z);
      pos.setXYZ(i * 2 + 1, nx, ny, nz);
      x = nx; y = ny; z = nz;
    }
    pos.needsUpdate = true;
    boltLine.visible = true;
    boltT = 0.22;
    // Clarão (DOM) + trovão atrasado pela distância (som viaja ~340 m/s; aqui
    // dividimos por menos p/ a criança LIGAR o raio ao barulho).
    if (frameEl) {
      if (!flashEl) {
        flashEl = document.createElement('div');
        flashEl.setAttribute('style', 'position:absolute;inset:0;background:#ffffff;opacity:0;pointer-events:none;z-index:6;');
        frameEl.appendChild(flashEl);
      }
      flashEl.style.opacity = '0.7';
    }
    var dx = sx - p.x;
    var dz = sz2 - p.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    thunderQueue.push({ t: 0.15 + dist / 90 });
    // Raio EM CIMA do carrinho: chacoalha e liga a câmera lenta um instante.
    if (dist < 7 && carState) {
      carState.pitchV += 2.2;
      _shakeT = Math.max(_shakeT, 0.6);
      _shakeAmp = Math.max(_shakeAmp, 0.4);
      timeScale = 0.35;
    }
  }

  function stepStorm(dt) {
    if (boltT > 0) {
      boltT -= dt;
      if (boltT <= 0 && boltLine) boltLine.visible = false;
    }
    if (flashEl) {
      var op = parseFloat(flashEl.style.opacity || '0');
      if (op > 0) flashEl.style.opacity = String(Math.max(0, op - dt * 3));
    }
    for (var i = thunderQueue.length - 1; i >= 0; i--) {
      thunderQueue[i].t -= dt;
      if (thunderQueue[i].t <= 0) {
        beep(52, 0.5);
        beep(38, 0.7);
        thunderQueue.splice(i, 1);
      }
    }
    if (weatherKind !== 'tempestade' || !worldReady) return;
    stormT -= dt;
    if (stormT <= 0) {
      stormT = 4 + Math.random() * 5;
      strikeBolt();
    }
  }

  // ---- R16: barco, ponte, farol, ambiente ----

  function buildBoat() {
    if (!scene || !boatCfg) return;
    if (boatGroup) {
      try { scene.remove(boatGroup); } catch (e) {}
      boatGroup = null;
    }
    boatGroup = new THREE.Group();
    var hullMat = toonMaterial({ color: text(boatCfg.color, '#f8fafc') });
    var hull = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), hullMat);
    hull.position.y = 0.35;
    hull.castShadow = true;
    boatGroup.add(hull);
    var bow = new THREE.Mesh(new THREE.ConeGeometry(1, 1.4, 4), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.35, 2.8);
    boatGroup.add(bow);
    var cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.2), toonMaterial({ color: '#94a3b8' }));
    cab.position.set(0, 1.05, -0.8);
    boatGroup.add(cab);
    if (!boatState) {
      // Nasce na água mais perto do spawn: procura raio crescente.
      var bx = 12;
      var bz = 0;
      if (waterCfg) {
        var found = false;
        for (var r = 8; r <= config.world / 2 - 4 && !found; r += 4) {
          for (var a = 0; a < 12 && !found; a++) {
            var ax = Math.cos((a / 12) * Math.PI * 2) * r;
            var az = Math.sin((a / 12) * Math.PI * 2) * r;
            if (heightAt(ax, az) < waterCfg.y - 0.6) {
              bx = ax;
              bz = az;
              found = true;
            }
          }
        }
      }
      boatState = { x: bx, z: bz, yaw: 0, speed: 0, roll: 0 };
    }
    scene.add(boatGroup);
  }

  function stepBoat(dt) {
    if (!boatState || !boatGroup) return;
    var s = boatState;
    var piloting = driving && activeVehicle === 'boat';
    if (piloting) {
      var fwd = ((isDown('w') || isDown('arrowup')) ? 1 : 0) - ((isDown('s') || isDown('arrowdown')) ? 1 : 0);
      var turn = ((isDown('a') || isDown('arrowleft')) ? 1 : 0) - ((isDown('d') || isDown('arrowright')) ? 1 : 0);
      s.speed += fwd * 9 * dt;
      s.speed = clamp(s.speed, -4, 12);
      s.speed *= 1 - Math.min(1, 0.5 * dt);
      var spdK = Math.min(1, Math.abs(s.speed) / 3);
      s.yaw += turn * 1.4 * spdK * (s.speed >= 0 ? 1 : -1) * dt;
      var nx = s.x + Math.sin(s.yaw) * s.speed * dt;
      var nz = s.z + Math.cos(s.yaw) * s.speed * dt;
      // Barco SÓ anda na água: encalha na praia (empurra de volta e freia).
      if (waterCfg && heightAt(nx, nz) < waterCfg.y - 0.35) {
        s.x = nx;
        s.z = nz;
      } else {
        s.speed *= 0.6;
      }
      var lim = config.world / 2 - 2;
      s.x = clamp(s.x, -lim, lim);
      s.z = clamp(s.z, -lim, lim);
      s.roll += (turn * spdK * 0.14 - s.roll) * Math.min(1, 5 * dt);
    } else {
      s.speed *= 1 - Math.min(1, 1.2 * dt);
      s.roll *= 1 - Math.min(1, 2 * dt);
    }
    var wy = waterCfg ? waterCfg.y : heightAt(s.x, s.z);
    s.y = wy + 0.05 + Math.sin(playTime * 1.7 + s.x * 0.2) * 0.1;
    boatGroup.position.set(s.x, s.y, s.z);
    boatGroup.rotation.set(Math.sin(playTime * 1.3) * 0.02, s.yaw, s.roll);
    // Interagível "entrar no barco" (só com personagem, a pé, e barco perto da margem).
    if (personCfg) {
      if (!_boatInteract) {
        _boatInteract = { x: 0, z: 0, r: 3.4, label: 'E: barco', prio: 2, fire: function () { enterVehicle('boat'); } };
        extraInteract.push(_boatInteract);
      }
      _boatInteract.x = s.x;
      _boatInteract.z = s.z;
      _boatInteract.r = driving ? 0 : 3.4;
      _boatInteract.promptY = wy + 2.2;
    }
  }

  function buildBridge(x1, z1, x2, z2, w) {
    if (!scene) return;
    var b = {
      x1: num(x1, 0), z1: num(z1, 0), x2: num(x2, 20), z2: num(z2, 20),
      w: clamp(num(w, 4), 2, 12), y1: 0, y2: 0
    };
    b.y1 = heightAt(b.x1, b.z1) + 0.2;
    b.y2 = heightAt(b.x2, b.z2) + 0.2;
    var dx = b.x2 - b.x1;
    var dz = b.z2 - b.z1;
    var len = Math.sqrt(dx * dx + dz * dz) || 1;
    var n = Math.max(6, Math.round(len / 0.9));
    var plankGeo = new THREE.BoxGeometry(b.w, 0.12, 0.7);
    var im = new THREE.InstancedMesh(plankGeo, toonMaterial({ color: '#9a7b4f' }), n);
    im.castShadow = true;
    im.frustumCulled = false;
    if (!_dummy) _dummy = new THREE.Object3D();
    var yaw = Math.atan2(dx, dz);
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var deck = b.y1 + (b.y2 - b.y1) * t + Math.sin(t * Math.PI) * 1.2;
      _dummy.position.set(b.x1 + dx * t, deck, b.z1 + dz * t);
      _dummy.rotation.set(0, yaw, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      im.setMatrixAt(i, _dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    bridges.push(b);
  }

  function buildLighthouse(x, z) {
    if (!scene) return;
    var lx = num(x, 0);
    var lz = num(z, 0);
    var gy = heightAt(lx, lz);
    var g = new THREE.Group();
    for (var i = 0; i < 4; i++) {
      var seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9 - i * 0.12, 1.05 - i * 0.12, 2.2, 10),
        toonMaterial({ color: i % 2 ? '#f8fafc' : '#ef4444' })
      );
      seg.position.y = 1.1 + i * 2.2;
      seg.castShadow = true;
      g.add(seg);
    }
    var lamp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 8), new THREE.MeshBasicMaterial({ color: '#fff7c2' }));
    lamp2.position.y = 9.4;
    g.add(lamp2);
    var beamMat = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, depthWrite: false });
    var beamGeo = new THREE.PlaneGeometry(16, 1.6);
    var beam1 = new THREE.Mesh(beamGeo, beamMat);
    beam1.position.set(8, 9.4, 0);
    var beamPivot = new THREE.Group();
    beamPivot.position.y = 0;
    beamPivot.add(beam1);
    var beam2 = beam1.clone();
    beam2.position.set(-8, 9.4, 0);
    beam2.rotation.y = Math.PI;
    beamPivot.add(beam2);
    g.add(beamPivot);
    g.position.set(lx, gy, lz);
    scene.add(g);
    lighthouses.push({ pivot: beamPivot, mat: beamMat, x: lx, z: lz });
    exclusions.push({ x: lx, z: lz, r: 4 });
  }

  function stepLighthouses(dt) {
    for (var i = 0; i < lighthouses.length; i++) {
      var lh = lighthouses[i];
      lh.pivot.rotation.y += dt * 0.9;
      lh.mat.opacity = nightAmount * 0.5;
    }
  }

  // Ambiente sonoro: mar (ruído em loop), pássaros (dia) e grilos (noite).
  function startSeaNoise() {
    var ac = ensureAudioCtx();
    if (!ac || _ambNoise) return;
    try {
      var len = ac.sampleRate * 2;
      var buf = ac.createBuffer(1, len, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      var src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var filt = ac.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      var g = ac.createGain();
      g.gain.value = 0.035;
      src.connect(filt);
      filt.connect(g);
      g.connect(ac.destination);
      src.start();
      _ambNoise = { src: src, gain: g, filt: filt };
    } catch (e) {}
  }

  function stopSeaNoise() {
    try { if (_ambNoise) _ambNoise.src.stop(); } catch (e) {}
    _ambNoise = null;
  }

  function stepAmbience(dt) {
    if (ambienceKind === 'desligado') return;
    if (ambienceKind === 'mar') {
      startSeaNoise();
      if (_ambNoise) {
        // A maré "respira" devagar.
        _ambNoise.filt.frequency.value = 280 + Math.sin(playTime * 0.5) * 120;
      }
      return;
    }
    _ambT -= dt;
    if (_ambT > 0) return;
    if (ambienceKind === 'passaros') {
      _ambT = 2.5 + Math.random() * 4;
      if (nightAmount < 0.4) {
        beep(1800 + Math.random() * 900, 0.07);
        beep(2300 + Math.random() * 700, 0.05);
      }
    } else if (ambienceKind === 'grilos') {
      _ambT = 0.4 + Math.random() * 0.4;
      if (nightAmount > 0.3) beep(4200, 0.03);
    }
  }

  // ---- R15: personagem a pé (rig procedural + entrar/sair do veículo) ----

  var HAT_COLORS = { bone: '#ef4444', palha: '#eab308', coroa: '#facc15', capacete: '#3b82f6' };

  function buildPerson() {
    if (!scene || !personCfg) return;
    disposePerson();
    var cor = text(personCfg.color, '#3b82f6');
    personGroup = new THREE.Group();
    personParts = {};
    var pele = toonMaterial({ color: '#f5c99b' });
    var roupa = toonMaterial({ color: cor });
    var calca = toonMaterial({ color: '#1f2937' });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.3), roupa);
    body.position.y = 0.95;
    body.castShadow = true;
    personGroup.add(body);
    personParts.body = body;
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), pele);
    head.position.y = 1.42;
    head.castShadow = true;
    personGroup.add(head);
    personParts.head = head;
    var hat = text(personCfg.hat, 'nenhum');
    if (hat !== 'nenhum' && HAT_COLORS[hat]) {
      var hm = toonMaterial({ color: HAT_COLORS[hat] });
      var hatMesh = hat === 'palha'
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10), hm)
        : hat === 'coroa'
          ? new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 8), hm)
          : new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.36), hm);
      hatMesh.position.y = 1.64;
      personGroup.add(hatMesh);
    }
    var mk = function (w, h, x, y, mat) {
      var pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h / 2;
      m.castShadow = true;
      pivot.add(m);
      personGroup.add(pivot);
      return pivot;
    };
    personParts.armL = mk(0.14, 0.5, -0.34, 1.18, roupa);
    personParts.armR = mk(0.14, 0.5, 0.34, 1.18, roupa);
    personParts.legL = mk(0.16, 0.62, -0.14, 0.66, calca);
    personParts.legR = mk(0.16, 0.62, 0.14, 0.66, calca);
    if (text(personCfg.acc, 'nenhum') === 'jetpack') {
      var jp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.16), toonMaterial({ color: '#64748b' }));
      jp.position.set(0, 1.0, -0.24);
      personGroup.add(jp);
    }
    if (!personState) {
      var sx = carState ? carState.x + 3 : 2;
      var sz2 = carState ? carState.z : 2;
      personState = { x: sx, y: heightAt(sx, sz2), z: sz2, yaw: 0, vy: 0, airborne: false, vis: 0, phase: 0, speed: 0 };
    }
    personGroup.position.set(personState.x, personState.y, personState.z);
    personGroup.visible = !driving;
    scene.add(personGroup);
  }

  function disposePerson() {
    if (!personGroup) return;
    try {
      scene.remove(personGroup);
      personGroup.traverse(function (o) {
        if (o.geometry && o.geometry.dispose) { try { o.geometry.dispose(); } catch (e) {} }
      });
    } catch (e) {}
    personGroup = null;
    personParts = null;
  }

  function fireVehicleHooks(kind) {
    var hooks = vehicleHooks[kind] || [];
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) {
        warnOnce('hook-veh-' + kind + '-' + i, 'erro no "Quando ' + kind + ' do veículo": ' + e);
      }
    }
  }

  function enterVehicle(kind) {
    if (!personCfg || driving) return;
    var k = kind || 'car';
    if (k === 'car' && !carState) return;
    if (k === 'boat' && !boatState) return;
    activeVehicle = k;
    driving = true;
    if (personGroup) personGroup.visible = false;
    camSnap = true;
    fireVehicleHooks('entrar');
  }

  function exitVehicle() {
    if (!personCfg || !driving) return;
    var src = activeVehicle === 'boat' && boatState ? boatState : carState;
    if (!src) return;
    driving = false;
    if (!personState) {
      personState = { x: 0, y: 0, z: 0, yaw: 0, vy: 0, airborne: false, vis: 0, phase: 0, speed: 0 };
    }
    personState.x = src.x + Math.cos(src.yaw) * 2.4;
    personState.z = src.z - Math.sin(src.yaw) * 2.4;
    personState.y = heightAtDrive(personState.x, personState.z, null);
    personState.yaw = src.yaw;
    personState.vy = 0;
    personState.airborne = false;
    if (personGroup) {
      personGroup.visible = true;
      personGroup.position.set(personState.x, personState.y, personState.z);
    }
    camSnap = true;
    fireVehicleHooks('sair');
  }

  function stepPerson(dt) {
    if (!personCfg || !personState) return;
    var s = personState;
    // Interagível "entrar no carrinho" segue o carro (prio alta perto dele).
    if (carState) {
      if (!_enterInteract) {
        _enterInteract = { x: 0, z: 0, r: 3, label: 'E: entrar', prio: 2, fire: function () { enterVehicle('car'); } };
        extraInteract.push(_enterInteract);
      }
      _enterInteract.x = carState.x;
      _enterInteract.z = carState.z;
      _enterInteract.r = driving ? 0 : 3; // dirigindo, o "entrar" some
      _enterInteract.promptY = carState.y + 2.6;
    }
    if (driving) {
      // Dentro do veículo: E desce (sem brigar com pontos — só quando nada mais pegou).
      var vsrc = activeVehicle === 'boat' && boatState ? boatState : carState;
      if (isJust('e') && vsrc) {
        var near = false;
        for (var i = 0; i < points.length; i++) {
          var dx0 = vsrc.x - points[i].x;
          var dz0 = vsrc.z - points[i].z;
          if (dx0 * dx0 + dz0 * dz0 < points[i].r * points[i].r) { near = true; break; }
        }
        if (!near) exitVehicle();
      }
      return;
    }
    // ---- A pé ----
    var walk = num(personCfg.walk, 4);
    var run = num(personCfg.run, 8);
    var jumpF = num(personCfg.jump, 7);
    var acc = text(personCfg.acc, 'nenhum');
    if (acc === 'botas') run *= 1.8;
    var fwd = ((isDown('w') || isDown('arrowup')) ? 1 : 0) - ((isDown('s') || isDown('arrowdown')) ? 1 : 0);
    var turn = ((isDown('a') || isDown('arrowleft')) ? 1 : 0) - ((isDown('d') || isDown('arrowright')) ? 1 : 0);
    var running = isDown('shift') || isDown('shiftleft') || isDown('shiftright');
    var spd = fwd * (running ? run : walk);
    s.yaw += turn * 2.6 * dt;
    s.x += Math.sin(s.yaw) * spd * dt;
    s.z += Math.cos(s.yaw) * spd * dt;
    s.speed = spd;
    // Colisão com a natureza sólida (círculo menor que o do carro).
    var near2 = collidersNear(s.x, s.z, 2.5);
    for (var ci = 0; ci < near2.length; ci++) {
      var col = near2[ci];
      var ddx = s.x - col.x;
      var ddz = s.z - col.z;
      var rr = col.r + 0.45;
      var d2c = ddx * ddx + ddz * ddz;
      if (d2c >= rr * rr) continue;
      var dc = Math.sqrt(d2c) || 0.001;
      s.x += (ddx / dc) * (rr - dc);
      s.z += (ddz / dc) * (rr - dc);
    }
    var lim = config.world / 2 - 1.5;
    s.x = clamp(s.x, -lim, lim);
    s.z = clamp(s.z, -lim, lim);
    // Chão/pulo/jetpack (com o DECK das pontes).
    var gy = heightAtDrive(s.x, s.z, s.y);
    if (s.airborne) {
      if (acc === 'jetpack' && isDown(' ')) {
        s.vy = Math.min(7, s.vy + 26 * dt);
        _jetPuffCd -= dt;
        if (_jetPuffCd <= 0 && partyState) {
          _jetPuffCd = 0.05;
          spawnParty(s.x, s.y + 0.4, s.z, (Math.random() - 0.5) * 1.5, -2.5, (Math.random() - 0.5) * 1.5, 0.5, 2, 0, '#fde68a');
        }
      }
      s.vy -= GRAV * dt;
      s.y += s.vy * dt;
      if (s.y <= gy) {
        s.y = gy;
        s.vy = 0;
        s.airborne = false;
      }
    } else {
      s.y = gy;
      if (isJust(' ')) {
        s.vy = jumpF;
        s.airborne = true;
        if (acc === 'jetpack') ensureParty();
      }
    }
    // Água: a pé afundar dá o mesmo resgate do carrinho.
    if (waterCfg && waterCfg.y - s.y > 1.1) {
      var back = _campRespawn || lastSafe;
      s.x = back.x + 1.5;
      s.z = back.z + 1.5;
      s.y = heightAt(s.x, s.z);
      s.vy = 0;
      camSnap = true;
    }
    // ---- Anim procedural ----
    s.vis += (Math.abs(spd) - s.vis) * Math.min(1, 8 * dt);
    s.phase += (2.2 + s.vis * 1.4) * dt * (s.vis > 0.15 ? 1 : 0);
    var swing = Math.sin(s.phase * 4) * Math.min(0.7, s.vis * 0.16);
    var emoteArmL = 0;
    var emoteSpin = 0;
    if (personEmote) {
      personEmote.t -= dt;
      if (personEmote.kind === 'acenar') emoteArmL = 2.4 + Math.sin(playTime * 10) * 0.4;
      else if (personEmote.kind === 'girar') emoteSpin = 10 * dt;
      else if (personEmote.kind === 'dancar') {
        emoteArmL = 1.2 + Math.sin(playTime * 8) * 1.0;
        emoteSpin = Math.sin(playTime * 6) * 4 * dt;
      }
      if (personEmote.t <= 0) personEmote = null;
    }
    s.yaw += emoteSpin;
    if (personGroup && personParts) {
      personGroup.position.set(s.x, s.y, s.z);
      personGroup.rotation.y = s.yaw;
      personParts.legL.rotation.x = swing;
      personParts.legR.rotation.x = -swing;
      personParts.armL.rotation.x = emoteArmL ? -emoteArmL : -swing * 0.8;
      personParts.armR.rotation.x = swing * 0.8;
      var bob = Math.abs(Math.sin(s.phase * 4)) * Math.min(0.06, s.vis * 0.02);
      personParts.body.position.y = 0.95 + bob;
      personParts.head.position.y = 1.42 + bob;
    }
  }

  // ---- R14: cachoeira, postes de luz, vaga-lumes, fogueira (respawn) ----

  var WFALL_VSH = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join(' ');

  var WFALL_FSH = [
    'uniform float uTime;',
    'varying vec2 vUv;',
    'void main() {',
    '  float s = fract(vUv.y * 3.0 + uTime * 1.4 + sin(vUv.x * 9.0) * 0.08);',
    '  vec3 agua = vec3(0.55, 0.75, 0.9);',
    '  vec3 col = mix(agua, vec3(1.0), smoothstep(0.62, 0.95, s) * 0.8);',
    '  gl_FragColor = vec4(col, 0.85);',
    '}'
  ].join(' ');

  function buildWaterfall(x, z, h, deg) {
    if (!scene) return;
    var wx = num(x, 0);
    var wz = num(z, 0);
    var wh = clamp(num(h, 8), 3, 30);
    var mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: WFALL_VSH,
      fragmentShader: WFALL_FSH,
      transparent: true,
      side: THREE.DoubleSide ? THREE.DoubleSide : undefined
    });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, wh), mat);
    var gy = heightAt(wx, wz);
    mesh.position.set(wx, gy + wh / 2, wz);
    mesh.rotation.y = (num(deg, 0) * Math.PI) / 180;
    scene.add(mesh);
    // Espuma na base: pontinhos brancos chacoalhando.
    var n = 26;
    var pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = wx + (Math.random() - 0.5) * 5;
      pos[i * 3 + 1] = gy + 0.3 + Math.random() * 0.5;
      pos[i * 3 + 2] = wz + (Math.random() - 0.5) * 2.4;
    }
    var fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var fmat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.7, transparent: true, opacity: 0.85, depthWrite: false });
    var ftex = ensureSpriteTex();
    if (ftex) fmat.map = ftex;
    var foam = new THREE.Points(fgeo, fmat);
    foam.frustumCulled = false;
    scene.add(foam);
    waterfalls.push({ mesh: mesh, mat: mat, foam: foam, x: wx, z: wz });
  }

  function stepWaterfalls() {
    for (var i = 0; i < waterfalls.length; i++) {
      waterfalls[i].mat.uniforms.uTime.value = playTime;
    }
  }

  function addLamp(x, z) {
    if (!scene) return;
    if (lamps.length >= LAMP_MAX) {
      warnOnce('lamp-max', 'muitos postes (teto ' + LAMP_MAX + ')');
      return;
    }
    var lx = num(x, 0);
    var lz = num(z, 0);
    var gy = heightAt(lx, lz);
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 8), toonMaterial({ color: '#1f2937' }));
    pole.position.y = 1.7;
    pole.castShadow = true;
    g.add(pole);
    var globeMat = new THREE.MeshBasicMaterial({ color: '#6b7280' });
    var globe = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), globeMat);
    globe.position.y = 3.6;
    g.add(globe);
    g.position.set(lx, gy, lz);
    scene.add(g);
    lamps.push({ x: lx, z: lz, globeMat: globeMat });
  }

  function stepLamps() {
    if (!lamps.length) return;
    var night = nightAmount > 0.2;
    for (var i = 0; i < lamps.length; i++) {
      lamps[i].globeMat.color.set(night ? '#ffe9a3' : '#6b7280');
    }
    // Orçamento de LUZ REAL: só os 4 postes mais perto do jogador iluminam de
    // verdade (PointLight é cara); o resto fica só com o globo aceso.
    if (!night) {
      if (lampLights) for (var li = 0; li < lampLights.length; li++) lampLights[li].intensity = 0;
      return;
    }
    if (!lampLights) {
      lampLights = [];
      for (var c = 0; c < 4; c++) {
        var pl = new THREE.PointLight(0xffe9a3, 0, 16);
        scene.add(pl);
        lampLights.push(pl);
      }
    }
    var p = playerXZ();
    var order = lamps.slice().sort(function (a, b) {
      var da = (a.x - p.x) * (a.x - p.x) + (a.z - p.z) * (a.z - p.z);
      var db = (b.x - p.x) * (b.x - p.x) + (b.z - p.z) * (b.z - p.z);
      return da - db;
    });
    for (var k = 0; k < lampLights.length; k++) {
      var lamp = order[k];
      if (lamp) {
        lampLights[k].position.set(lamp.x, heightAt(lamp.x, lamp.z) + 3.6, lamp.z);
        lampLights[k].intensity = 1.4 * nightAmount;
      } else {
        lampLights[k].intensity = 0;
      }
    }
  }

  var FIREFLY_AMOUNTS = { pouca: 30, media: 80, muita: 150 };

  function buildFireflies(amount) {
    if (firefliesPts) {
      try {
        scene.remove(firefliesPts.mesh);
        firefliesPts.mesh.geometry.dispose();
        firefliesPts.mat.dispose();
      } catch (e) {}
      firefliesPts = null;
    }
    var n = FIREFLY_AMOUNTS[amount] || 0;
    if (!scene || n <= 0) return;
    var rng = mulberry(4242);
    var home = new Float32Array(n * 3);
    var lim = config.world / 2 - 4;
    for (var i = 0; i < n; i++) {
      home[i * 3] = (rng() * 2 - 1) * lim;
      home[i * 3 + 2] = (rng() * 2 - 1) * lim;
      home[i * 3 + 1] = heightAt(home[i * 3], home[i * 3 + 2]) + 0.8 + rng() * 1.6;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(home.slice(), 3));
    var mat = new THREE.PointsMaterial({ color: '#fef08a', size: 0.35, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    var tex = ensureSpriteTex();
    if (tex) mat.map = tex;
    var mesh = new THREE.Points(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    firefliesPts = { mesh: mesh, mat: mat, home: home, n: n };
  }

  function stepFireflies() {
    if (!firefliesPts) return;
    firefliesPts.mat.opacity = nightAmount * 0.9;
    if (nightAmount < 0.02) return;
    var pos = firefliesPts.mesh.geometry.getAttribute('position');
    var t = playTime;
    for (var i = 0; i < firefliesPts.n; i++) {
      var hx = firefliesPts.home[i * 3];
      var hy = firefliesPts.home[i * 3 + 1];
      var hz = firefliesPts.home[i * 3 + 2];
      pos.setXYZ(
        i,
        hx + Math.sin(t * 0.9 + i * 1.7) * 1.2,
        hy + Math.sin(t * 1.3 + i * 0.9) * 0.5,
        hz + Math.cos(t * 0.7 + i * 2.3) * 1.2
      );
    }
    pos.needsUpdate = true;
  }

  function addCampfire(x, z) {
    if (!scene) return;
    if (campfires.length >= CAMP_MAX) {
      warnOnce('camp-max', 'muitas fogueiras (teto ' + CAMP_MAX + ')');
      return;
    }
    var cx = num(x, 0);
    var cz = num(z, 0);
    var gy = heightAt(cx, cz);
    var g = new THREE.Group();
    var logMat = toonMaterial({ color: '#7c4a2d' });
    var log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), logMat);
    log1.rotation.z = Math.PI / 2;
    log1.rotation.y = 0.6;
    log1.position.y = 0.14;
    g.add(log1);
    var log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), logMat);
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = -0.6;
    log2.position.y = 0.16;
    g.add(log2);
    g.position.set(cx, gy, cz);
    scene.add(g);
    var n = 18;
    var pos = new Float32Array(n * 3);
    var seeds = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      seeds[i] = Math.random();
      pos[i * 3] = cx + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = gy + Math.random() * 1.2;
      pos[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.5;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ color: '#fb923c', size: 0.5, transparent: true, opacity: 0.95, depthWrite: false });
    var tex = ensureSpriteTex();
    if (tex) mat.map = tex;
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    campfires.push({ x: cx, z: cz, gy: gy, pts: pts, seeds: seeds, n: n });
  }

  function stepCampfires(dt) {
    for (var c = 0; c < campfires.length; c++) {
      var cf = campfires[c];
      var pos = cf.pts.geometry.getAttribute('position');
      for (var i = 0; i < cf.n; i++) {
        var y = pos.getY(i) + (0.8 + cf.seeds[i]) * dt;
        if (y > cf.gy + 1.3) y = cf.gy + 0.1;
        pos.setXYZ(
          i,
          cf.x + Math.sin(playTime * 6 + i * 2.1) * 0.14 * cf.seeds[i],
          y,
          cf.z + Math.cos(playTime * 5 + i * 1.3) * 0.14 * cf.seeds[i]
        );
      }
      pos.needsUpdate = true;
      // Tocar na fogueira grava o CHECKPOINT do resgate da água.
      if (carState) {
        var dx = carState.x - cf.x;
        var dz = carState.z - cf.z;
        if (dx * dx + dz * dz < 25) _campRespawn = { x: cf.x, z: cf.z };
      }
    }
  }

  // ---- R13: empurráveis (bagunça física), letras, caixas explosivas ----

  var PUSH_TYPES = {
    tijolo:   { g: 'box', sx: 0.55, sy: 0.3, sz: 0.28, color: '#b45309', r: 0.4 },
    banco:    { g: 'box', sx: 1.3, sy: 0.42, sz: 0.45, color: '#8b5a2b', r: 0.7 },
    cerca:    { g: 'box', sx: 1.5, sy: 0.95, sz: 0.09, color: '#9a7b4f', r: 0.8 },
    lanterna: { g: 'cyl', sx: 0.3, sy: 0.55, sz: 0.3, color: '#fbbf24', r: 0.3 },
    cone:     { g: 'cone', sx: 0.5, sy: 0.7, sz: 0.5, color: '#f97316', r: 0.35 }
  };

  function ensurePushIM(type) {
    if (!pushIM) pushIM = {};
    if (pushIM[type]) return pushIM[type];
    var spec = PUSH_TYPES[type];
    var geos = ensureUnitGeos();
    var geo = spec.g === 'cyl' ? geos.cyl : spec.g === 'cone' ? geos.cone : new THREE.BoxGeometry(1, 1, 1);
    var im = new THREE.InstancedMesh(geo, toonMaterial({ color: spec.color }), 80);
    im.count = 0;
    im.castShadow = true;
    im.frustumCulled = false;
    scene.add(im);
    pushIM[type] = { mesh: im, spec: spec };
    return pushIM[type];
  }

  function addPushable(type, x, z) {
    if (!scene || !PUSH_TYPES[type]) return;
    if (pushables.length >= PUSH_MAX) {
      warnOnce('push-max', 'muitos objetos empurráveis (teto ' + PUSH_MAX + ') — os novos foram ignorados');
      return;
    }
    var slot = ensurePushIM(type);
    var idx = slot.mesh.count;
    if (idx >= 80) {
      warnOnce('push-type-max-' + type, 'muitos "' + type + '" (teto 80 por tipo)');
      return;
    }
    slot.mesh.count = idx + 1;
    var p = {
      type: type, im: slot, idx: idx,
      x: num(x, 0), z: num(z, 0), y: 0, vx: 0, vz: 0, vy: 0,
      spin: 0, yaw: Math.random() * Math.PI * 2,
      home: { x: num(x, 0), z: num(z, 0) }, sink: 0
    };
    p.y = heightAt(p.x, p.z) + slot.spec.sy / 2;
    pushables.push(p);
    writePushable(p);
  }

  function writePushable(p) {
    if (!_dummy) _dummy = new THREE.Object3D();
    var spec = p.im.spec;
    _dummy.position.set(p.x, p.y, p.z);
    _dummy.rotation.set(0, p.yaw, 0);
    _dummy.scale.set(spec.sx, spec.sy, spec.sz);
    _dummy.updateMatrix();
    p.im.mesh.setMatrixAt(p.idx, _dummy.matrix);
    p.im.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Letras físicas: caixas com a LETRA pintada (CanvasTexture cacheada por char). */
  function letterTexture(ch) {
    if (!_letterTexCache) _letterTexCache = {};
    if (_letterTexCache[ch]) return _letterTexCache[ch];
    var cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 128;
    var g = cv.getContext('2d');
    if (!g) return null;
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#0f172a';
    g.font = '900 96px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, 64, 70);
    var tex = new THREE.CanvasTexture(cv);
    _letterTexCache[ch] = tex;
    return tex;
  }

  function addLetters(word, x, z, s) {
    if (!scene) return;
    var w = text(word, 'OI').toUpperCase();
    var size = clamp(num(s, 1), 0.4, 3);
    var bx = num(x, 0);
    var bz = num(z, 0);
    for (var i = 0; i < w.length; i++) {
      var ch = w.charAt(i);
      if (ch === ' ') continue;
      if (lettersCount >= LETTERS_MAX) {
        warnOnce('letters-max', 'muitas letras (teto ' + LETTERS_MAX + ') — o resto da palavra ficou de fora');
        return;
      }
      lettersCount++;
      var tex = letterTexture(ch);
      var mat = tex
        ? new THREE.MeshBasicMaterial({ map: tex })
        : new THREE.MeshBasicMaterial({ color: '#f8fafc' });
      var box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat);
      box.castShadow = true;
      var lx = bx + (i - (w.length - 1) / 2) * size;
      var p = {
        type: 'letra', mesh: box, x: lx, z: bz, y: 0, vx: 0, vz: 0, vy: 0,
        spin: 0, yaw: 0, home: { x: lx, z: bz }, sink: 0, scale: size * 0.9
      };
      p.y = heightAt(lx, bz) + size * 0.45;
      box.scale.setScalar(size * 0.9 / 0.9);
      box.position.set(p.x, p.y, p.z);
      scene.add(box);
      pushables.push(p);
    }
  }

  function pushImpulse(p, ix, iz, force) {
    p.vx += ix * force;
    p.vz += iz * force;
    p.vy += force * 0.35;
    p.spin += (Math.random() - 0.5) * force * 2;
  }

  function stepPushables(dt) {
    if (!pushables.length) return;
    var s = carState;
    for (var i = 0; i < pushables.length; i++) {
      var p = pushables[i];
      var spec = p.im ? p.im.spec : { sy: p.scale || 0.9, r: (p.scale || 0.9) * 0.55 };
      // Afundou na água: espera 2 s e renasce em casa.
      if (p.sink > 0) {
        p.sink -= dt;
        if (p.sink <= 0) {
          p.x = p.home.x;
          p.z = p.home.z;
          p.vx = p.vz = p.vy = 0;
          p.y = heightAt(p.x, p.z) + spec.sy / 2;
        } else {
          continue;
        }
      }
      // Encostão do carrinho: impulso proporcional à velocidade.
      if (s) {
        var dx = p.x - s.x;
        var dz = p.z - s.z;
        var rr = spec.r + 1.2;
        var d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && Math.abs(s.speed) > 0.8) {
          var d = Math.sqrt(d2) || 0.01;
          pushImpulse(p, dx / d, dz / d, Math.min(10, Math.abs(s.speed) * 0.55));
          s.speed *= 0.92;
          if (Math.abs(s.speed) > 6) beep(160, 0.05);
        }
      }
      var moving = Math.abs(p.vx) + Math.abs(p.vz) + Math.abs(p.vy) > 0.02;
      if (moving) {
        p.vy -= GRAV * 0.8 * dt;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.y += p.vy * dt;
        var gy = heightAt(p.x, p.z) + spec.sy / 2;
        if (p.y <= gy) {
          p.y = gy;
          p.vy = p.vy < -3 ? -p.vy * 0.3 : 0;
          p.vx *= 0.86;
          p.vz *= 0.86;
        }
        p.yaw += p.spin * dt;
        p.spin *= 0.94;
        // Caiu na água funda: afunda e agenda o renascimento.
        if (waterCfg && waterCfg.y - p.y > 0.6) {
          p.sink = 2;
          p.y = -9999;
        }
        if (p.im) writePushable(p);
        if (p.mesh) {
          p.mesh.position.set(p.x, p.y, p.z);
          p.mesh.rotation.y = p.yaw;
        }
      }
    }
  }

  /** Caixa explosiva: detona no encostão forte; explosão em CADEIA com atraso. */
  function addExplosive(x, z) {
    if (!scene) return;
    var mat = toonMaterial({ color: '#dc2626' });
    var box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat);
    var bx = num(x, 0);
    var bz = num(z, 0);
    box.position.set(bx, heightAt(bx, bz) + 0.45, bz);
    box.castShadow = true;
    scene.add(box);
    var tampa = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.16, 0.94), toonMaterial({ color: '#7f1d1d' }));
    tampa.position.y = 0.4;
    box.add(tampa);
    explosives.push({ mesh: box, x: bx, z: bz, fuse: -1, done: false });
  }

  function detonate(ex) {
    if (ex.done) return;
    ex.done = true;
    try { scene.remove(ex.mesh); } catch (e) {}
    // Bola de fogo que incha e some + faíscas do pool de festa.
    var bm = new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.9 });
    var ball = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), bm);
    ball.position.set(ex.x, heightAt(ex.x, ex.z) + 1, ex.z);
    scene.add(ball);
    boomSpheres.push({ mesh: ball, t: 0 });
    ensureParty();
    for (var i = 0; i < 40; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 3 + Math.random() * 6;
      spawnParty(ex.x, heightAt(ex.x, ex.z) + 1, ex.z, Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp, 1.1, 8, 0, i % 2 ? '#f97316' : '#fde68a');
    }
    beep(52, 0.4);
    beep(90, 0.2);
    // Impulso radial: empurráveis, pinos/caixas do boliche e o carrinho.
    var R = 8;
    for (var pi = 0; pi < pushables.length; pi++) {
      var p = pushables[pi];
      var dx = p.x - ex.x;
      var dz = p.z - ex.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < R) pushImpulse(p, dx / (d || 0.01), dz / (d || 0.01), (1 - d / R) * 14);
    }
    for (var ki = 0; ki < knockables.length; ki++) {
      var k = knockables[ki];
      var kdx = k.x - ex.x;
      var kdz = k.z - ex.z;
      var kd = Math.sqrt(kdx * kdx + kdz * kdz);
      if (kd < R) {
        k.vx += (kdx / (kd || 0.01)) * (1 - kd / R) * 10;
        k.vz += (kdz / (kd || 0.01)) * (1 - kd / R) * 10;
        k.vy += (1 - kd / R) * 6;
      }
    }
    if (carState) {
      var cdx = carState.x - ex.x;
      var cdz = carState.z - ex.z;
      var cd = Math.sqrt(cdx * cdx + cdz * cdz);
      if (cd < R) {
        carState.vy = Math.max(carState.vy, (1 - cd / R) * 9);
        carState.airborne = true;
        carState.pitchV += 2;
        _shakeT = Math.max(_shakeT, 0.5);
        _shakeAmp = Math.max(_shakeAmp, 0.4);
        // Bullet-time do folio: explosão que te pega liga a câmera lenta.
        timeScale = 0.3;
      }
    }
    // Cadeia: vizinhos explodem com um respiro (fica CINEMA).
    for (var ei = 0; ei < explosives.length; ei++) {
      var other = explosives[ei];
      if (other.done || other.fuse >= 0) continue;
      var odx = other.x - ex.x;
      var odz = other.z - ex.z;
      if (Math.sqrt(odx * odx + odz * odz) < 6) other.fuse = 0.15;
    }
    for (var hi = 0; hi < explosionHooks.length; hi++) {
      try { explosionHooks[hi](); } catch (e2) {
        warnOnce('hook-boom-' + hi, 'erro no "Quando algo explodir": ' + e2);
      }
    }
  }

  function stepExplosives(dt) {
    for (var i = 0; i < explosives.length; i++) {
      var ex = explosives[i];
      if (ex.done) continue;
      if (ex.fuse >= 0) {
        ex.fuse -= dt;
        if (ex.fuse <= 0) detonate(ex);
        continue;
      }
      if (carState) {
        var dx = ex.x - carState.x;
        var dz = ex.z - carState.z;
        if (dx * dx + dz * dz < 2.6 && Math.abs(carState.speed) > 3) detonate(ex);
      }
    }
    for (var b = boomSpheres.length - 1; b >= 0; b--) {
      var bs = boomSpheres[b];
      bs.t += dt;
      var k = bs.t / 0.45;
      if (k >= 1) {
        try {
          scene.remove(bs.mesh);
          bs.mesh.geometry.dispose();
          bs.mesh.material.dispose();
        } catch (e) {}
        boomSpheres.splice(b, 1);
      } else {
        bs.mesh.scale.setScalar(1 + k * 5);
        bs.mesh.material.opacity = 0.9 * (1 - k);
      }
    }
  }

  // ---- R11: buzina / luzes / marcas de pneu / lua / vinheta de turbo ----

  /** Bip curto de UI (konami, celebrações) — oscilador descartável. */
  function beep(freq, dur) {
    var ac = ensureAudioCtx();
    if (!ac) return;
    try {
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      g.gain.setTargetAtTime(0.0001, ac.currentTime + dur, 0.03);
      o.stop(ac.currentTime + dur + 0.2);
    } catch (e) {}
  }

  function startHorn() {
    var ac = ensureAudioCtx();
    if (ac && !hornOsc1) {
      try {
        hornGain = ac.createGain();
        hornGain.gain.value = 0.0001;
        hornGain.connect(ac.destination);
        hornOsc1 = ac.createOscillator();
        hornOsc1.type = 'square';
        hornOsc1.frequency.value = 392;
        hornOsc2 = ac.createOscillator();
        hornOsc2.type = 'square';
        hornOsc2.frequency.value = 494;
        hornOsc1.connect(hornGain);
        hornOsc2.connect(hornGain);
        hornOsc1.start();
        hornOsc2.start();
        hornGain.gain.setTargetAtTime(0.06, ac.currentTime, 0.02);
      } catch (e) {}
    }
    // O "pulinho" do folio: a carroceria dá uma amassadinha ao buzinar.
    hornSquashV -= 3.2;
    for (var i = 0; i < hornHooks.length; i++) {
      try { hornHooks[i](); } catch (e2) {
        warnOnce('hook-horn-' + i, 'erro no "Quando buzinar": ' + e2);
      }
    }
  }

  function stopHorn() {
    try {
      if (hornGain && _audioCtx) hornGain.gain.setTargetAtTime(0.0001, _audioCtx.currentTime, 0.03);
    } catch (e) {}
    try { if (hornOsc1) hornOsc1.stop(_audioCtx ? _audioCtx.currentTime + 0.2 : 0); } catch (e) {}
    try { if (hornOsc2) hornOsc2.stop(_audioCtx ? _audioCtx.currentTime + 0.2 : 0); } catch (e) {}
    hornOsc1 = null;
    hornOsc2 = null;
    hornGain = null;
  }

  function stepHorn(dt) {
    if (carBody) {
      hornSquashV += ((0 - hornSquash) * 60 - hornSquashV * 10) * dt;
      hornSquash += hornSquashV * dt;
      carBody.scale.y = 1 + clamp(hornSquash, -0.35, 0.2) * 0.4;
    }
    if (!hornCfg || !carState) return;
    if (personCfg && !driving) return; // buzina só DENTRO do carrinho
    var held = isDown('h');
    if (held && !hornOsc1 && !_hornHeld) startHorn();
    if (!held && hornOsc1) stopHorn();
    _hornHeld = held;
  }

  /** Anel de quads das marcas de pneu (1 draw call; alpha por vértice com fade). */
  function ensureTireMesh() {
    if (tireMesh || !scene) return;
    tireGeo = new THREE.BufferGeometry();
    var pos = new Float32Array(TIRE_N * 4 * 3);
    var alp = new Float32Array(TIRE_N * 4);
    var idx = [];
    for (var i = 0; i < TIRE_N; i++) {
      var b = i * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    tireGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    tireGeo.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
    tireGeo.setIndex(idx);
    tireAges = new Float32Array(TIRE_N);
    for (var j = 0; j < TIRE_N; j++) tireAges[j] = 1e9;
    var vsh = [
      'attribute float aAlpha;',
      'varying float vA;',
      'void main() {',
      '  vA = aAlpha;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join(' ');
    var fsh = [
      'varying float vA;',
      'void main() {',
      '  if (vA <= 0.01) discard;',
      '  gl_FragColor = vec4(0.12, 0.14, 0.16, vA * 0.55);',
      '}'
    ].join(' ');
    var mat = new THREE.ShaderMaterial({
      vertexShader: vsh,
      fragmentShader: fsh,
      transparent: true,
      depthWrite: false
    });
    tireMesh = new THREE.Mesh(tireGeo, mat);
    tireMesh.frustumCulled = false;
    tireMesh.renderOrder = 1;
    scene.add(tireMesh);
  }

  /** Grava um quadzinho de marca no anel (sob uma roda traseira). */
  function stampTire(wx, wz, yaw) {
    var i = tireIdx;
    tireIdx = (tireIdx + 1) % TIRE_N;
    tireAges[i] = 0;
    var hw = 0.14;
    var hl = 0.3;
    var sy = Math.sin(yaw);
    var cy = Math.cos(yaw);
    var y = heightAt(wx, wz) + 0.03;
    var pos = tireGeo.getAttribute('position');
    var b = i * 4;
    pos.setXYZ(b, wx - cy * hw - sy * hl, y, wz + sy * hw - cy * hl);
    pos.setXYZ(b + 1, wx + cy * hw - sy * hl, y, wz - sy * hw - cy * hl);
    pos.setXYZ(b + 2, wx + cy * hw + sy * hl, y, wz - sy * hw + cy * hl);
    pos.setXYZ(b + 3, wx - cy * hw + sy * hl, y, wz + sy * hw + cy * hl);
    pos.needsUpdate = true;
  }

  function stepTires(dt) {
    if (!tireOn || !carState || !carCfg) return;
    ensureTireMesh();
    if (!tireMesh) return;
    var s = carState;
    var cs = carStyleOf();
    var top = num(carCfg.speed, cs.speed);
    var grip = styleOf().grip;
    var drifting = Math.abs(s.steerIn || 0) > 0.5 && Math.abs(s.speed) > top * 0.45;
    var marking = !s.airborne && (boostActive || drifting || (grip < 0.6 && Math.abs(s.speed) > 2));
    _tireEmitCd -= dt;
    if (marking && _tireEmitCd <= 0) {
      _tireEmitCd = 0.035;
      var xw = cs.w / 2 + 0.04;
      var zw = cs.l * 0.34;
      var sy = Math.sin(s.yaw);
      var cy = Math.cos(s.yaw);
      // Rodas TRASEIRAS (local -zw), levadas ao mundo pelo yaw.
      stampTire(s.x + (-xw) * cy + (-zw) * sy, s.z - (-xw) * sy + (-zw) * cy, s.yaw);
      stampTire(s.x + xw * cy + (-zw) * sy, s.z - xw * sy + (-zw) * cy, s.yaw);
    }
    // Fade: envelhece TODAS e reescreve o alpha (1k floats, barato).
    var alp = tireGeo.getAttribute('aAlpha');
    for (var i = 0; i < TIRE_N; i++) {
      tireAges[i] += dt;
      var a = 1 - tireAges[i] / TIRE_LIFE;
      if (a < 0) a = 0;
      var b = i * 4;
      alp.setX(b, a);
      alp.setX(b + 1, a);
      alp.setX(b + 2, a);
      alp.setX(b + 3, a);
    }
    alp.needsUpdate = true;
  }

  /** Luzes do carrinho: estados AUTOMÁTICOS (freio/ré/piscas/faróis à noite). */
  function stepCarLights(dt) {
    if (!lightsOn || !carLightParts || !carState) return;
    var s = carState;
    blinkPhase += dt * 8;
    var blinkOn = Math.sin(blinkPhase) > 0;
    var braking = (s.accelIn || 0) < 0 && s.speed > 0.5;
    var reversing = s.speed < -0.2;
    var steering = s.steerIn || 0;
    var i;
    for (i = 0; i < carLightParts.brake.length; i++) {
      carLightParts.brake[i].material.color.set(braking ? '#ff2d2d' : '#5f1414');
    }
    for (i = 0; i < carLightParts.rev.length; i++) {
      carLightParts.rev[i].material.color.set(reversing ? '#ffffff' : '#6b7280');
    }
    for (i = 0; i < carLightParts.blinkL.length; i++) {
      carLightParts.blinkL[i].material.color.set(steering > 0.3 && blinkOn ? '#ffb020' : '#7c5a10');
    }
    for (i = 0; i < carLightParts.blinkR.length; i++) {
      carLightParts.blinkR[i].material.color.set(steering < -0.3 && blinkOn ? '#ffb020' : '#7c5a10');
    }
    var headBright = nightAmount > 0.25;
    for (i = 0; i < carLightParts.head.length; i++) {
      carLightParts.head[i].material.color.set(headBright ? '#fff7c2' : '#8a8672');
    }
  }

  /** Lua: um disco que aparece junto das estrelas e olha para a câmera. */
  function stepMoon() {
    if (!scene) return;
    if (!moonMesh && nightAmount > 0.01) {
      moonMat = new THREE.MeshBasicMaterial({ color: '#f5f3ce', transparent: true, opacity: 0, fog: false, depthWrite: false });
      moonMesh = new THREE.Mesh(new THREE.CircleGeometry(7, 24), moonMat);
      moonMesh.renderOrder = -1;
      scene.add(moonMesh);
    }
    if (!moonMesh) return;
    moonMat.opacity = nightAmount * 0.9;
    var cx = carState ? carState.x : 0;
    var cz = carState ? carState.z : 0;
    moonMesh.position.set(cx - 90, 85, cz - 130);
    if (camera) moonMesh.lookAt(camera.position);
  }

  /** Vinheta de velocidade do turbo (DOM — zero draw calls 3D). */
  function stepSpeedLines() {
    if (!frameEl) return;
    var show = false;
    if (boostActive && carState && carCfg) {
      var top = num(carCfg.speed, carStyleOf().speed);
      show = Math.abs(carState.speed) > top * 0.75;
    }
    if (show && !speedLinesEl) {
      speedLinesEl = document.createElement('div');
      speedLinesEl.setAttribute('style', 'position:absolute;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse at center, rgba(255,255,255,0) 55%, rgba(255,255,255,0.16) 100%);');
      frameEl.appendChild(speedLinesEl);
    }
    if (speedLinesEl) speedLinesEl.style.display = show ? 'block' : 'none';
  }

  /** Antena cosmética: chicoteia contra o molejo (a alma do carrinho do folio). */
  function stepAntenna() {
    if (!antennaGroup || !carState) return;
    antennaGroup.rotation.x = clamp(-carState.pitch * 1.6, -0.7, 0.7);
    antennaGroup.rotation.z = clamp(-carState.roll * 1.6, -0.7, 0.7);
  }

  function stepCarExtras(dt) {
    stepHorn(dt);
    stepCarLights(dt);
    stepTires(dt);
    stepMoon();
    stepSpeedLines();
    stepAntenna();
    // Pintura arco-íris: a cor da carroceria passeia pelo círculo cromático.
    if (paintStyle === 'arco-iris' && carBodyMat && carBodyMat.color && carBodyMat.color.setHSL) {
      carBodyMat.color.setHSL((playTime * 0.12) % 1, 0.75, 0.55);
    }
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

    // Pintura (R11): cada esquema decide a cor-base e uma listra opcional.
    var bodyColor = color;
    var stripeColor = null;
    if (paintStyle === 'chamas') { bodyColor = '#ea580c'; stripeColor = '#facc15'; }
    else if (paintStyle === 'listras') { stripeColor = '#ffffff'; }
    else if (paintStyle === 'estrelas') { bodyColor = '#1e2a5a'; stripeColor = '#ffffff'; }
    carBodyMat = toonMaterial({ color: bodyColor });
    var bodyMat = carBodyMat;
    var darkMat = toonMaterial({ color: '#1f2937' });
    var glassMat = toonMaterial({ color: '#bfdbfe' });

    if (rocketMode) {
      // Konami: FOGUETE sobre rodas — corpo cilíndrico + nariz + 3 aletas.
      var rocketBody = new THREE.Mesh(new THREE.CylinderGeometry(cs.w * 0.34, cs.w * 0.42, cs.l * 0.72, 12), bodyMat);
      rocketBody.rotation.x = Math.PI / 2;
      rocketBody.position.y = cs.clear + cs.h * 0.9;
      rocketBody.castShadow = true;
      carBody.add(rocketBody);
      var nose = new THREE.Mesh(new THREE.ConeGeometry(cs.w * 0.34, cs.l * 0.3, 12), toonMaterial({ color: '#ef4444' }));
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, cs.clear + cs.h * 0.9, cs.l * 0.51);
      nose.castShadow = true;
      carBody.add(nose);
      for (var fi = 0; fi < 3; fi++) {
        var fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, cs.h * 0.9, cs.l * 0.22), toonMaterial({ color: '#ef4444' }));
        var fa = (fi / 3) * Math.PI * 2;
        fin.position.set(Math.cos(fa) * cs.w * 0.4, cs.clear + cs.h * 0.9 + Math.sin(fa) * cs.w * 0.4, -cs.l * 0.3);
        fin.rotation.z = fa;
        carBody.add(fin);
      }
    } else {
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

      if (stripeColor) {
        // Listra de corrida no capô/teto (fina, ao longo do carro).
        var stripe = new THREE.Mesh(new THREE.BoxGeometry(cs.w * 0.28, 0.03, cs.l * 0.98), toonMaterial({ color: stripeColor }));
        stripe.position.y = cs.clear + cs.h + 0.02;
        carBody.add(stripe);
      }
    }

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

    // Antena cosmética (traseira) — chicoteia contra o molejo no stepAntenna.
    antennaGroup = new THREE.Group();
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.7, 6), darkMat);
    mast.position.y = 0.35;
    antennaGroup.add(mast);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), toonMaterial({ color: '#ef4444' }));
    tip.position.y = 0.72;
    antennaGroup.add(tip);
    antennaGroup.position.set(-cs.w * 0.32, cs.clear + cs.h, -cs.l * 0.42);
    carBody.add(antennaGroup);

    // Luzes (R11): meshes UNLIT (MeshBasicMaterial) — o stepCarLights troca as
    // cores conforme freio/ré/piscas/noite. Só nascem com "Ligar as luzes".
    carLightParts = null;
    if (lightsOn && !rocketMode) {
      carLightParts = { head: [], brake: [], rev: [], blinkL: [], blinkR: [] };
      var mk = function (w2, h2, x2, y2, z2, colr, arr) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, 0.05), new THREE.MeshBasicMaterial({ color: colr }));
        m.position.set(x2, y2, z2);
        carBody.add(m);
        arr.push(m);
      };
      var fy = cs.clear + cs.h * 0.62;
      var fz = cs.l / 2 + 0.026;
      var bx = cs.w * 0.32;
      mk(0.22, 0.12, -bx, fy, fz, '#8a8672', carLightParts.head);
      mk(0.22, 0.12, bx, fy, fz, '#8a8672', carLightParts.head);
      mk(0.2, 0.1, -bx, fy, -fz, '#5f1414', carLightParts.brake);
      mk(0.2, 0.1, bx, fy, -fz, '#5f1414', carLightParts.brake);
      mk(0.1, 0.08, 0, fy - 0.02, -fz, '#6b7280', carLightParts.rev);
      var by = cs.clear + cs.h * 0.4;
      mk(0.09, 0.09, -(cs.w / 2 + 0.026), by, cs.l * 0.38, '#7c5a10', carLightParts.blinkL);
      mk(0.09, 0.09, -(cs.w / 2 + 0.026), by, -cs.l * 0.38, '#7c5a10', carLightParts.blinkL);
      mk(0.09, 0.09, cs.w / 2 + 0.026, by, cs.l * 0.38, '#7c5a10', carLightParts.blinkR);
      mk(0.09, 0.09, cs.w / 2 + 0.026, by, -cs.l * 0.38, '#7c5a10', carLightParts.blinkR);
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
    // A pé (R15) ou no BARCO (R16): o carrinho fica ESTACIONADO.
    var walking = (personCfg && !driving) || (driving && activeVehicle === 'boat');
    if (walking) {
      accelIn = 0;
      steerIn = 0;
    }
    // Guardados p/ os extras (luzes de freio/piscas, marcas de pneu).
    s.accelIn = accelIn;
    s.steerIn = steerIn;

    // Turbo (Shift): mais aceleração e um teto de velocidade maior enquanto segura.
    boostActive = boostCfg != null && !walking && (isDown('shift') || isDown('shiftleft') || isDown('shiftright'));
    var boostMul = boostActive ? 1 + num(boostCfg.force, 1) : 1;

    // Aceleração/freio + arrasto natural. Na neve tudo responde mais devagar.
    var acc = 16 * (0.5 + 0.5 * grip) * boostMul;
    if (accelIn > 0) s.speed += acc * dt;
    else if (accelIn < 0) s.speed -= acc * 0.95 * dt;
    else s.speed -= s.speed * Math.min(1, (0.9 + 0.7 * grip) * dt);
    s.speed = clamp(s.speed, -top * 0.45, top * boostMul);

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

    // Chão + pulo: no chão a altura SEGUE o terreno (com o DECK das pontes).
    var gy = heightAtDrive(s.x, s.z, s.y);
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
      if (isJust(' ') && !walking) {
        s.vy = jump;
        s.airborne = true;
      }
    }

    // Água: rasa = arrasta e respinga; funda (> 1.2 m abaixo do nível) = respawn
    // no último ponto seco. Sem água, guarda o ponto atual como seguro.
    if (waterCfg && !s.airborne) {
      var prof = waterCfg.y - s.y;
      if (prof > 1.2) {
        // Resgate: a última FOGUEIRA tocada vence o último ponto seco (R14).
        if (_campRespawn) {
          s.x = _campRespawn.x + 2;
          s.z = _campRespawn.z + 2;
          s.yaw = lastSafe.yaw;
        } else {
          s.x = lastSafe.x;
          s.z = lastSafe.z;
          s.yaw = lastSafe.yaw;
        }
        s.y = heightAt(s.x, s.z);
        s.speed = 0;
        s.vy = 0;
        camSnap = true;
      } else if (prof > 0) {
        // Arrasto da água rasa: proporcional à profundidade, mas dt-escalado e
        // com teto — atola sem CONGELAR (o *0.7 por quadro travava tudo).
        var drag = Math.min(0.7, prof * 0.35);
        s.speed *= Math.max(0, 1 - drag * dt * 4);
      } else {
        lastSafe.x = s.x;
        lastSafe.z = s.z;
        lastSafe.yaw = s.yaw;
      }
    } else if (!s.airborne) {
      lastSafe.x = s.x;
      lastSafe.z = s.z;
      lastSafe.yaw = s.yaw;
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
    var fs = focusState();
    if (fs && camMode !== 'cinema-sem-carro') {
      var s = fs;
      var walking = personCfg && !driving;
      var bx, by, bz;
      if (camMode === 'topo') {
        // De cima: acompanha o carro olhando para baixo (um pouco atrás).
        bx = s.x;
        bz = s.z + 0.01;
        by = s.y + 22 + Math.abs(s.speed) * 0.2;
      } else if (camMode === 'cinema') {
        // Cinema: órbita lenta ao redor do carro (mostra o mundo).
        _autoAngle += dt * 0.25;
        var cr = 12 + Math.abs(s.speed) * 0.15;
        bx = s.x + Math.cos(_autoAngle) * cr;
        bz = s.z + Math.sin(_autoAngle) * cr;
        by = s.y + 5;
      } else {
        // Seguir (padrão): atrás do jogador, com zoom por velocidade. A pé a
        // câmera chega mais perto e mais baixa (escala humana).
        var dist = (walking ? 5 : 7.5) + Math.abs(s.speed) * 0.12;
        var h = (walking ? 2.3 : 3.1) + Math.abs(s.speed) * 0.03;
        bx = s.x - Math.sin(s.yaw) * dist;
        bz = s.z - Math.cos(s.yaw) * dist;
        by = s.y + h;
      }
      // A câmera nunca entra no morro: respeita o chão dela + 1.2 m.
      var minY = heightAt(bx, bz) + 1.2;
      if (by < minY) by = minY;
      if (camSnap) {
        camera.position.set(bx, by, bz);
        _look.set(s.x, s.y + 1.1, s.z);
        camSnap = false;
      } else {
        var k = damp(camMode === 'topo' ? 6 : 4.5, dt);
        camera.position.x += (bx - camera.position.x) * k;
        camera.position.y += (by - camera.position.y) * k;
        camera.position.z += (bz - camera.position.z) * k;
        var k2 = damp(8, dt);
        _look.x += (s.x - _look.x) * k2;
        _look.y += (s.y + 1.1 - _look.y) * k2;
        _look.z += (s.z - _look.z) * k2;
      }
      // Tremor: desloca a posição por um pouco de ruído que decai.
      if (_shakeT > 0) {
        _shakeT -= dt;
        var amp = _shakeAmp * Math.max(0, _shakeT);
        camera.position.x += (Math.random() * 2 - 1) * amp;
        camera.position.y += (Math.random() * 2 - 1) * amp;
        camera.position.z += (Math.random() * 2 - 1) * amp;
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

    // Bullet-time: escala o dt DEPOIS da sonda (a sonda mede o quadro REAL —
    // escalar antes mentiria o FPS e o turbo nunca ligaria). Volta em ~1,2 s.
    if (timeScale < 1) {
      var rawDt = dt;
      dt *= timeScale;
      currentDt = dt;
      timeScale = Math.min(1, timeScale + rawDt / 1.2);
    }

    stepCar(dt);
    stepPerson(dt);
    stepCarExtras(dt);
    stepDayNight(dt);
    stepWeather(dt);
    stepStorm(dt);
    stepParty(dt);
    stepTornado(dt);
    stepClouds(dt);
    stepPushables(dt);
    stepExplosives(dt);
    stepWaterfalls();
    stepLamps();
    stepFireflies();
    stepCampfires(dt);
    stepBoat(dt);
    stepLighthouses(dt);
    stepAmbience(dt);
    updateEngine();
    for (var i = 0; i < updateHooks.length; i++) {
      try { updateHooks[i](dt); } catch (e) {
        warnOnce('hook-update-' + i, 'erro no "A cada quadro": ' + e);
      }
    }
    updateCamera(dt);
    updateSun();
    stepInteractions();
    stepRace(dt);
    stepKnockables(dt);
    stepSay();
    if (waterMat) waterMat.uniforms.uTime.value = playTime;
    if (grassMat) {
      grassMat.uniforms.uTime.value = playTime;
      grassMat.uniforms.uWind.value = wind;
      var gp = focusState();
      var gcx = gp ? gp.x : (camera ? camera.position.x : 0);
      var gcz = gp ? gp.z : (camera ? camera.position.z : 0);
      grassMat.uniforms.uCenter.value.set(gcx, gcz);
      // Tinta noturna: o gramado escurece/azula junto das estrelas (a grama é
      // ShaderMaterial cru — o sol não a alcança; este uniform é o "sol" dela).
      if (grassMat.uniforms.uNight) grassMat.uniforms.uNight.value = nightAmount;
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
      if (spriteTex && spriteTex.dispose) { try { spriteTex.dispose(); } catch (e) {} }
      if (waterMat && waterMat.dispose) { try { waterMat.dispose(); } catch (e) {} }
      // O motor e a música vivem no WebAudio/Audio (fora da cena) — o teardown
      // do renderer não os alcança; parar aqui evita som na janela do bfcache.
      try { if (engineOsc) engineOsc.stop(); } catch (e) {}
      try { if (hornOsc1) hornOsc1.stop(); } catch (e) {}
      try { if (hornOsc2) hornOsc2.stop(); } catch (e) {}
      try { if (music) music.pause(); } catch (e) {}
      try { if (_audioCtx && _audioCtx.close) _audioCtx.close(); } catch (e) {}
      disposeWeather();
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
    starsMesh = null;
    starsMat = null;
    spriteTex = null;
    weatherPts = null;
    waterMesh = null;
    waterMat = null;
    engineOsc = null;
    engineGain = null;
    engineFilter = null;
    _audioCtx = null;
    music = null;
    points = [];
    zones = [];
    galleries = [];
    _decorGroup = null;
    _imgTexCache = null;
    race = null;
    knockables = [];
    bowling = null;
    hornOsc1 = null;
    hornOsc2 = null;
    hornGain = null;
    carLightParts = null;
    tireMesh = null;
    tireGeo = null;
    tireAges = null;
    moonMesh = null;
    moonMat = null;
    antennaGroup = null;
    speedLinesEl = null;
    extraInteract = [];
    partyPts = null;
    partyGeo = null;
    partyState = null;
    fwRockets = [];
    tornadoState = null;
    cloudsPts = null;
    boltLine = null;
    flashEl = null;
    thunderQueue = [];
    _seasonOrig = null;
    pushables = [];
    pushIM = null;
    lettersCount = 0;
    _letterTexCache = null;
    explosives = [];
    explosionHooks = [];
    boomSpheres = [];
    waterfalls = [];
    lamps = [];
    lampLights = null;
    firefliesPts = null;
    campfires = [];
    _campRespawn = null;
    if (waterFoamTex) { try { waterFoamTex.dispose(); } catch (e) {} }
    waterFoamTex = null;
    personGroup = null;
    personParts = null;
    personState = null;
    _enterInteract = null;
    personEmote = null;
    stopSeaNoise();
    boatGroup = null;
    boatState = null;
    _boatInteract = null;
    bridges = [];
    lighthouses = [];
    islandsCfg = null;
    ambienceKind = 'desligado';
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
      if (waterMat) buildWaterFoamTex();
      }
    }),
    start: guard('start', start),
    worldSize: guard('worldSize', function () {
      return config.world;
    }),
    groundHeight: guard('groundHeight', function (x, z) {
      return heightAt(num(x, 0), num(z, 0));
    }),
    flatten: guard('flatten', function (x, z, r) {
      var cx = num(x, 0);
      var cz = num(z, 0);
      // Alvo = a altura do RUÍDO no centro (sem outros mods → sem recursão).
      terrainMods.push({ kind: 'flatten', x: cx, z: cz, r: clamp(num(r, 15), 1, 200), y: baseHeightAt(cx, cz) });
      if (worldReady) {
        buildTerrain();
        if (grassMat) buildGrassHeightTex();
      if (waterMat) buildWaterFoamTex();
      }
    }),
    path: guard('path', function (x1, z1, x2, z2, w) {
      var ax = num(x1, 0);
      var az = num(z1, 0);
      var bx = num(x2, 0);
      var bz = num(z2, 0);
      terrainMods.push({
        kind: 'path', x1: ax, z1: az, x2: bx, z2: bz,
        w: clamp(num(w, 5), 1, 40),
        y1: baseHeightAt(ax, az), y2: baseHeightAt(bx, bz)
      });
      if (worldReady) {
        buildTerrain();
        if (grassMat) buildGrassHeightTex();
      if (waterMat) buildWaterFoamTex();
      }
    }),
    water: guard('water', function (y, color) {
      waterCfg = { y: num(y, 0), color: text(color, '#2b6cb0') };
      if (worldReady) buildWater();
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
    carBoost: guard('carBoost', function (force) {
      boostCfg = { force: clamp(num(force, 1), 0, 4) };
    }),
    // 🚗 R11 "carrinho vivo"
    horn: guard('horn', function () {
      hornCfg = true;
    }),
    onHorn: guard('onHorn', function (fn) {
      if (typeof fn !== 'function') {
        warn('"Quando buzinar" precisa de blocos de fazer dentro');
        return;
      }
      hornHooks.push(fn);
    }),
    carLights: guard('carLights', function () {
      lightsOn = true;
      if (carGroup) buildCar();
    }),
    tireMarks: guard('tireMarks', function (on) {
      tireOn = !(on === false || on === 'desligadas' || on === 'desligado');
      if (!tireOn && tireAges) {
        for (var i = 0; i < TIRE_N; i++) tireAges[i] = 1e9;
      }
    }),
    carPaint: guard('carPaint', function (paint) {
      var p = text(paint, 'lisa');
      if (p !== 'lisa' && p !== 'listras' && p !== 'chamas' && p !== 'arco-iris' && p !== 'estrelas') {
        warn('não conheço a pintura "' + p + '" — tem: lisa, listras, chamas, arco-iris, estrelas');
        return;
      }
      paintStyle = p;
      if (carGroup) buildCar();
    }),
    engineSound: guard('engineSound', function (on) {
      var ligado = on === true || on === 'ligado' || on === 'ligados' || on === 'true';
      engineOn = ligado;
      if (ligado) {
        startEngine();
      } else if (engineGain && _audioCtx) {
        try { engineGain.gain.setTargetAtTime(0, _audioCtx.currentTime, 0.1); } catch (e) {}
      }
    }),

    // 🌿 Natureza
    scatter: guard('scatter', function (n, thing) {
      var t = text(thing, '');
      if (!SPECIES[t]) {
        warn('não conheço "' + t + '" — tem: arvores, pinheiros, pedras, flores, cogumelos, cactos, palmeiras');
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
        warn('não conheço "' + t + '" — tem: arvores, pinheiros, pedras, flores, cogumelos, cactos, palmeiras');
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
    // 🌦️ Céu & clima
    dayNight: guard('dayNight', function (minutes) {
      dayCfg.on = true;
      dayCfg.minutes = clamp(num(minutes, 4), 0.5, 60);
      atmoUsed = true;
      if (worldReady) {
        _skyDrawnAt = -1;
        applyAtmosphere();
      }
    }),
    setTime: guard('setTime', function (name) {
      var map = { manha: 9, meiodia: 12, entardecer: 17.5, noite: 0 };
      var t = map[text(name, '')];
      if (t == null) {
        warn('não conheço a hora "' + text(name, '') + '" — tem: manha, meiodia, entardecer, noite');
        return;
      }
      timeOfDay = t;
      atmoUsed = true;
      if (worldReady) {
        _skyDrawnAt = -1;
        applyAtmosphere();
      }
    }),
    weather: guard('weather', function (kind) {
      var k = text(kind, 'limpo');
      if (k !== 'limpo' && !WEATHER_KINDS[k]) {
        warn('não conheço o clima "' + k + '" — tem: limpo, chuva, neve, folhas, tempestade');
        return;
      }
      weatherKind = k;
      if (worldReady) buildWeather();
    }),
    // 🎉 R12 festa & céu dramático
    confetti: guard('confetti', function () {
      confettiBurst();
    }),
    fireworks: guard('fireworks', function () {
      fireworksLaunch();
    }),
    tornado: guard('tornado', function (secs) {
      startTornado(secs);
    }),
    season: guard('season', function (name) {
      var n2 = text(name, 'verao');
      if (!SEASONS[n2]) {
        warn('não conheço a estação "' + n2 + '" — tem: primavera, verao, outono, inverno');
        return;
      }
      seasonName = n2;
      if (worldReady) applySeason();
    }),
    // 🏝️ R16 ilha & barco
    islands: guard('islands', function (n, y) {
      var count = clamp(num(n, 4), 2, 8);
      var seaY = num(y, 0);
      var list = [{ x: 0, z: 0, r: Math.max(18, config.world * 0.16), h: 5.5 }];
      var rng = mulberry(count * 31 + 7);
      for (var i = 1; i < count; i++) {
        var ang = (i / count) * Math.PI * 2 + rng() * 0.8;
        var rad = config.world * (0.24 + rng() * 0.14);
        list.push({
          x: Math.cos(ang) * rad,
          z: Math.sin(ang) * rad,
          r: 12 + rng() * 12,
          h: 3.5 + rng() * 3
        });
      }
      islandsCfg = { list: list };
      if (!waterCfg) waterCfg = { y: seaY, color: '#2b6cb0' };
      else waterCfg.y = seaY;
      if (worldReady) {
        buildTerrain();
        buildWater();
        if (grassMat) buildGrassHeightTex();
        if (waterMat) buildWaterFoamTex();
      }
    }),
    boat: guard('boat', function (color) {
      boatCfg = { color: text(color, '#f8fafc') };
      if (worldReady) buildBoat();
    }),
    bridge: guard('bridge', function (x1, z1, x2, z2, w) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'bridge', x1: num(x1, 0), z1: num(z1, 0), x2: num(x2, 20), z2: num(z2, 20), w: num(w, 4) });
        return;
      }
      buildBridge(x1, z1, x2, z2, w);
    }),
    lighthouse: guard('lighthouse', function (x, z) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'lighthouse', x: num(x, 0), z: num(z, 0) });
        return;
      }
      buildLighthouse(x, z);
    }),
    ambience: guard('ambience', function (kind) {
      var k5 = text(kind, 'desligado');
      if (k5 !== 'desligado' && k5 !== 'mar' && k5 !== 'passaros' && k5 !== 'grilos') {
        warn('não conheço "' + k5 + '" — tem: mar, passaros, grilos, desligado');
        return;
      }
      if (k5 !== 'mar') stopSeaNoise();
      ambienceKind = k5;
      _ambT = 0;
    }),
    // 🧍 R15 personagem a pé
    person: guard('person', function (color, hat) {
      var h2 = text(hat, 'nenhum');
      if (h2 !== 'nenhum' && !HAT_COLORS[h2]) {
        warn('não conheço o chapéu "' + h2 + '" — tem: nenhum, bone, palha, coroa, capacete');
        h2 = 'nenhum';
      }
      personCfg = personCfg || {};
      personCfg.color = text(color, '#3b82f6');
      personCfg.hat = h2;
      if (personCfg.walk == null) personCfg.walk = 4;
      if (personCfg.run == null) personCfg.run = 8;
      if (personCfg.jump == null) personCfg.jump = 7;
      if (personCfg.acc == null) personCfg.acc = 'nenhum';
      driving = false; // com personagem, o passeio COMEÇA a pé
      if (worldReady) buildPerson();
    }),
    personStats: guard('personStats', function (walk, run, jump) {
      if (!personCfg) {
        warn('ajuste DEPOIS de "Criar o personagem a pé"');
        return;
      }
      personCfg.walk = clamp(num(walk, 4), 1, 20);
      personCfg.run = clamp(num(run, 8), 1, 40);
      personCfg.jump = clamp(num(jump, 7), 0, 20);
    }),
    personPlace: guard('personPlace', function (x, z, deg) {
      if (!personCfg) {
        warn('leve o personagem DEPOIS de "Criar o personagem a pé"');
        return;
      }
      if (!personState) {
        personState = { x: 0, y: 0, z: 0, yaw: 0, vy: 0, airborne: false, vis: 0, phase: 0, speed: 0 };
      }
      personState.x = num(x, 0);
      personState.z = num(z, 0);
      personState.y = heightAt(personState.x, personState.z);
      personState.yaw = (num(deg, 0) * Math.PI) / 180;
      personState.vy = 0;
      personState.airborne = false;
      camSnap = true;
      if (personGroup) personGroup.position.set(personState.x, personState.y, personState.z);
    }),
    personAccessory: guard('personAccessory', function (acc) {
      var a3 = text(acc, 'nenhum');
      if (a3 !== 'nenhum' && a3 !== 'jetpack' && a3 !== 'botas') {
        warn('não conheço o acessório "' + a3 + '" — tem: nenhum, jetpack, botas');
        return;
      }
      if (!personCfg) {
        warn('dê o acessório DEPOIS de "Criar o personagem a pé"');
        return;
      }
      personCfg.acc = a3;
      if (worldReady && personGroup) buildPerson();
    }),
    personEmote: guard('personEmote', function (kind) {
      var k3 = text(kind, 'acenar');
      if (k3 === 'pular') {
        if (personState && !personState.airborne && !driving) {
          personState.vy = num(personCfg && personCfg.jump, 7);
          personState.airborne = true;
        }
        return;
      }
      if (k3 !== 'acenar' && k3 !== 'girar' && k3 !== 'dancar') {
        warn('não conheço "' + k3 + '" — tem: acenar, pular, girar, dancar');
        return;
      }
      personEmote = { kind: k3, t: k3 === 'dancar' ? 2 : 1.2 };
    }),
    onVehicle: guard('onVehicle', function (when, fn) {
      var w3 = text(when, 'entrar');
      if (w3 !== 'entrar' && w3 !== 'sair') {
        warn('"Quando … do veículo" só conhece entrar e sair');
        return;
      }
      if (typeof fn !== 'function') {
        warn('"Quando ' + w3 + ' do veículo" precisa de blocos de fazer dentro');
        return;
      }
      vehicleHooks[w3].push(fn);
    }),
    personPos: guard('personPos', function (axis) {
      var src = personCfg && !driving && personState ? personState : carState;
      if (!src) return 0;
      var a4 = text(axis, 'x');
      return a4 === 'y' ? src.y : a4 === 'z' ? src.z : src.x;
    }),
    isDriving: guard('isDriving', function () {
      return !!(driving && (carState || boatState));
    }),
    // 🌿 R14 natureza acesa
    waterfall: guard('waterfall', function (x, z, h, deg) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'waterfall', x: num(x, 0), z: num(z, 0), h: num(h, 8), deg: num(deg, 0) });
        return;
      }
      buildWaterfall(x, z, h, deg);
    }),
    lamp: guard('lamp', function (x, z) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'lamp', x: num(x, 0), z: num(z, 0) });
        return;
      }
      addLamp(x, z);
    }),
    fireflies: guard('fireflies', function (amount) {
      var fa = text(amount, 'media');
      if (!(fa in FIREFLY_AMOUNTS)) {
        warn('não conheço "' + fa + '" — tem: pouca, media, muita');
        return;
      }
      if (!worldReady) {
        decorRecipes.push({ kind: 'fireflies', amount: fa });
        return;
      }
      buildFireflies(fa);
    }),
    campfire: guard('campfire', function (x, z) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'campfire', x: num(x, 0), z: num(z, 0) });
        return;
      }
      addCampfire(x, z);
    }),
    // 🎳 R13 bagunça física
    pushPlace: guard('pushPlace', function (thing, x, z) {
      var t2 = text(thing, 'tijolo');
      if (!PUSH_TYPES[t2]) {
        warn('não conheço "' + t2 + '" — tem: tijolo, banco, cerca, lanterna, cone');
        return;
      }
      if (!worldReady) {
        decorRecipes.push({ kind: 'pushPlace', thing: t2, x: num(x, 0), z: num(z, 0) });
        return;
      }
      addPushable(t2, x, z);
    }),
    pushScatter: guard('pushScatter', function (n, x, z, r) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'pushScatter', n: num(n, 8), x: num(x, 0), z: num(z, 0), r: num(r, 10) });
        return;
      }
      buildPushScatter(num(n, 8), num(x, 0), num(z, 0), num(r, 10));
    }),
    letters: guard('letters', function (word, x, z, s) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'letters', word: text(word, 'OI'), x: num(x, 0), z: num(z, 0), s: num(s, 1) });
        return;
      }
      addLetters(word, x, z, s);
    }),
    explosive: guard('explosive', function (x, z) {
      if (!worldReady) {
        decorRecipes.push({ kind: 'explosive', x: num(x, 0), z: num(z, 0) });
        return;
      }
      addExplosive(x, z);
    }),
    onExplosion: guard('onExplosion', function (fn) {
      if (typeof fn !== 'function') {
        warn('"Quando algo explodir" precisa de blocos de fazer dentro');
        return;
      }
      explosionHooks.push(fn);
    }),
    clouds: guard('clouds', function (amount) {
      var a2 = text(amount, 'nenhuma');
      if (!(a2 in CLOUD_AMOUNTS)) {
        warn('não conheço "' + a2 + '" — tem: nenhuma, poucas, muitas');
        return;
      }
      cloudsAmount = a2;
      if (worldReady) buildClouds();
    }),
    setWind: guard('setWind', function (force) {
      wind = clamp(num(force, 1), 0, 5);
    }),
    onDayNight: guard('onDayNight', function (when, fn) {
      var w = text(when, 'noite');
      if (w !== 'dia' && w !== 'noite') w = 'noite';
      if (typeof fn !== 'function') {
        warn('"Quando virar ' + w + '" precisa de blocos de fazer dentro');
        return;
      }
      dayNightHooks[w].push(fn);
    }),
    timeOfDay: guard('timeOfDay', function () {
      return timeOfDay;
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

    // 🔊 Sons
    loadSound: guard('loadSound', function (name, asset) {
      var key = text(name, '');
      var url = SOUNDS[text(asset, '')];
      if (!url) {
        warn('o som "' + text(asset, '') + '" não está no projeto — envie em "Imagens" na barra de cima');
        return;
      }
      // Aponta o apelido para o arquivo e pré-carrega.
      SOUNDS[key] = url;
      ensureSound(key);
    }),
    playSound: guard('playSound', function (name) {
      var a = ensureSound(name);
      if (!a) {
        warnOnce('sound:' + text(name, ''), 'o som "' + text(name, '') + '" não foi carregado — use "Carregar o som"');
        return;
      }
      try {
        a.currentTime = 0;
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }),
    playMusic: guard('playMusic', function (name) {
      var url = SOUNDS[text(name, '')];
      if (!url) {
        warn('a música "' + text(name, '') + '" não está no projeto');
        return;
      }
      try {
        if (music) music.pause();
        music = new Audio(url);
        music.loop = true;
        music.volume = 0.5;
        var p = music.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }),
    stopMusic: guard('stopMusic', function () {
      try { if (music) { music.pause(); music.currentTime = 0; } } catch (e) {}
    }),

    // ⏱️ Jogo & tela
    hud: guard('hud', function (txt, corner) {
      setHud(corner, txt);
    }),
    say: guard('say', function (txt, secs) {
      showSay(txt, secs);
    }),

    // 📍 Pontos & placas
    point: guard('point', function (name, x, z) {
      if (worldReady) addPoint(name, x, z);
      else decorRecipes.push({ kind: 'point', name: text(name, ''), x: num(x, 0), z: num(z, 0) });
    }),
    onPoint: guard('onPoint', function (name, fn) {
      if (typeof fn !== 'function') {
        warn('"Quando apertar E no ponto" precisa de blocos de fazer dentro');
        return;
      }
      var key = text(name, '');
      (pointHooks[key] || (pointHooks[key] = [])).push(fn);
    }),
    zone: guard('zone', function (name, x, z, r) {
      if (worldReady) addZone(name, x, z, r);
      else decorRecipes.push({ kind: 'zone', name: text(name, ''), x: num(x, 0), z: num(z, 0), r: num(r, 6) });
    }),
    onZone: guard('onZone', function (name, fn) {
      if (typeof fn !== 'function') {
        warn('"Quando o carrinho entrar na área" precisa de blocos de fazer dentro');
        return;
      }
      var key = text(name, '');
      (zoneHooks[key] || (zoneHooks[key] = [])).push(fn);
    }),
    totemText: guard('totemText', function (x, z, title, body) {
      if (worldReady) buildTotemText(num(x, 0), num(z, 0), title, body);
      else decorRecipes.push({ kind: 'totemText', x: num(x, 0), z: num(z, 0), title: text(title, ''), body: text(body, '') });
    }),
    totemImage: guard('totemImage', function (x, z, image, w) {
      if (worldReady) buildTotemImage(num(x, 0), num(z, 0), image, w);
      else decorRecipes.push({ kind: 'totemImage', x: num(x, 0), z: num(z, 0), image: text(image, ''), w: num(w, 3) });
    }),
    galleryCreate: guard('galleryCreate', function (x, z, title) {
      if (worldReady) {
        buildGalleryBase(x, z, title);
      } else {
        // Reserva o terreno JÁ (dados) para o buildTerrain do start enxergar.
        reserveGallery(x, z);
        decorRecipes.push({ kind: 'galleryCreate', x: num(x, 0), z: num(z, 0), title: text(title, 'Galeria') });
      }
    }),
    galleryAdd: guard('galleryAdd', function (image, caption) {
      if (worldReady) galleryAdd(image, caption);
      else decorRecipes.push({ kind: 'galleryAdd', image: text(image, ''), caption: text(caption, '') });
    }),

    // 🏁 Kit Corrida
    raceCreate: guard('raceCreate', function (x, z, yaw, laps) {
      createRace(x, z, yaw, laps);
    }),
    raceCheckpoint: guard('raceCheckpoint', function (x, z, yaw) {
      addCheckpoint(x, z, yaw);
    }),
    raceOnStart: guard('raceOnStart', function (fn) {
      if (typeof fn === 'function') raceHooks.start.push(fn);
    }),
    raceOnCheckpoint: guard('raceOnCheckpoint', function (fn) {
      if (typeof fn === 'function') raceHooks.checkpoint.push(fn);
    }),
    raceOnFinish: guard('raceOnFinish', function (fn) {
      if (typeof fn === 'function') raceHooks.finish.push(fn);
    }),
    raceTime: guard('raceTime', function () {
      return race ? race.time : 0;
    }),
    raceBest: guard('raceBest', function () {
      return race ? race.best || 0 : 0;
    }),

    // 🎳 Kit Boliche
    bowlingCreate: guard('bowlingCreate', function (x, z, yaw) {
      if (worldReady) buildBowling(x, z, yaw);
      else decorRecipes.push({ kind: 'bowling', x: num(x, 0), z: num(z, 0), yaw: num(yaw, 0) });
    }),
    bowlingReset: guard('bowlingReset', function () {
      resetKnockables();
    }),
    bowlingOnStrike: guard('bowlingOnStrike', function (fn) {
      if (typeof fn !== 'function') {
        warn('"Quando derrubar todos os pinos" precisa de blocos de fazer dentro');
        return;
      }
      if (!bowling) bowling = { x: 0, z: 0, pins: [], strikeHooks: [] };
      bowling.strikeHooks.push(fn);
    }),
    pinsDown: guard('pinsDown', function () {
      if (!bowling) return 0;
      var n = 0;
      for (var i = 0; i < bowling.pins.length; i++) if (bowling.pins[i].down) n++;
      return n;
    }),
    stack: guard('stack', function (n, thing, x, z) {
      if (worldReady) buildStack(n, thing, x, z);
      else decorRecipes.push({ kind: 'stack', n: num(n, 3), thing: text(thing, 'caixas'), x: num(x, 0), z: num(z, 0) });
    }),
    knockedCount: guard('knockedCount', function () {
      return knockedCount();
    }),

    // 🎥 Câmera & efeitos
    cameraMode: guard('cameraMode', function (mode) {
      var m = text(mode, 'seguir');
      if (m !== 'seguir' && m !== 'topo' && m !== 'cinema') {
        warn('não conheço a câmera "' + m + '" — tem: seguir, topo, cinema');
        return;
      }
      camMode = m;
      camSnap = true;
    }),
    cameraShake: guard('cameraShake', function (force, secs) {
      _shakeAmp = clamp(num(force, 0.5), 0, 5);
      _shakeT = Math.max(_shakeT, clamp(num(secs, 0.3), 0.05, 5));
    }),

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
