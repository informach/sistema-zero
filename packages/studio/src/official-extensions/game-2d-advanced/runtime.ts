import { buildProjectRunContextRuntime } from '#extensions'
import { withGameUIFontRuntime } from '../gameUiFont'
import { gameRuntimeDomains } from '../runtimeDomains'
import { gameKitAnimationRuntime } from './runtime/animation'
import { gameKitAudioRuntime } from './runtime/audio'
import { gameKitCardsRuntime } from './runtime/cards'
import { gameKitMonsterBattleRuntime } from './runtime/monsterBattle'
import { gameKitPlatformerRuntime } from './runtime/platformer'
import { gameKitRpgBattleRuntime } from './runtime/rpgBattle'
import { gameKitRpgNavigationRuntime } from './runtime/rpgNavigation'
import { gameKitShellRuntime } from './runtime/shell'
import { towerDefenseRuntime } from './runtime/towerDefense'
import { gameKitVisualEffectsRuntime } from './runtime/visualEffects'

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
export const gameKitRuntime = withGameUIFontRuntime(
  buildProjectRunContextRuntime() +
    '\n' +
    `(function () {
  var _szGameUIFont = window.SZGameUIFont.family;
${gameRuntimeDomains}
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

${gameKitShellRuntime}
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
  function drawTilemap(name, layer) {
    if (!ctx2d) return;
    var dk = text(name, '');
    var m = tilemaps[dk];
    if (!m) { warnOnce('drawmap:' + dk, 'o mapa "' + dk + '" não existe — carregue com "Carregar o mapa"'); return; }
    if (rpg.currentMap && rpg.maps[rpg.currentMap]) {
      var declared = rpg.maps[rpg.currentMap];
      var mapRows = m.rows.length;
      var mapCols = 0;
      for (var ri = 0; ri < m.rows.length; ri++) mapCols = Math.max(mapCols, m.rows[ri].length);
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
    var activeMap = rpg.maps[rpg.currentMap];
    if (activeMap && typeof activeMap.draw === 'function') {
      try { activeMap.draw(ctx2d); }
      catch (e) { warnOnce('mapdraw:' + rpg.currentMap, 'erro ao desenhar o mapa "' + rpg.currentMap + '": ' + e); }
      if (activeMap.empty) drawEmptyMapNotice(rpg.currentMap);
    }
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
  /**
   * Contorna a caixa que COLIDE de cada coisa viva, com a FORMA de verdade:
   * retângulo da hitbox no padrão, círculo em quem escolheu a caixa redonda —
   * sempre pelos mesmos helpers que o "touching" usa, para o desenho nunca
   * mentir sobre o que colide. (Antes isto desenhava um círculo pelo raio em
   * TUDO, inclusive no que colidia quadrado.)
   * Varre moldes, combatentes E personagens criados: a lista de combatentes só
   * recebe quem toma dano, então num jogo sem combate o herói ficaria de fora.
   */
  function drawDebugOverlay() {
    if (!ctx2d) return;
    ctx2d.save();
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = '#22c55e';
    var seen = [];
    function boxOf(e) {
      if (!e || e._active === false) return;
      if (seen.indexOf(e) !== -1) return; // um personagem pode estar em 2 listas
      seen.push(e);
      var w = hbW(e);
      var h = hbH(e);
      if (!(w > 0) || !(h > 0)) return;
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
    for (var pk in pools) {
      var act = pools[pk].active;
      for (var i = 0; i < act.length; i++) boxOf(act[i]);
    }
    for (var c = 0; c < combatants.length; c++) boxOf(combatants[c]);
    for (var k = 0; k < characters.length; k++) boxOf(characters[k]);
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

${gameKitAnimationRuntime}
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
    var e = pool.free.pop();
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

${gameKitCardsRuntime}

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

${gameKitPlatformerRuntime}

${gameKitMonsterBattleRuntime}

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
${gameKitVisualEffectsRuntime}

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
${towerDefenseRuntime}
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
  function rpgCreateMap(name, cols, rows, draw, hasDrawing) {
    var k = text(name, '');
    var requestedCols = Math.round(num(cols, 0));
    var requestedRows = Math.round(num(rows, 0));
    var c = Math.min(MAX_GRID_SIDE, requestedCols);
    var r = Math.min(MAX_GRID_SIDE, requestedRows);
    if (!k) { warn('"Criar o mapa" precisa de um nome'); return; }
    if (requestedCols <= 0 || requestedRows <= 0) { warn('o mapa "' + k + '" precisa ter largura e altura maiores que zero'); return; }
    if (requestedCols > MAX_GRID_SIDE || requestedRows > MAX_GRID_SIDE) {
      warnOnce('rpgmap:limit', 'o mapa foi limitado a ' + MAX_GRID_SIDE + ' × ' + MAX_GRID_SIDE + ' células para o jogo continuar responsivo');
    }
    if (typeof draw !== 'function') { warn('o mapa "' + k + '" precisa de um corpo de desenho'); return; }
    if (rpg.maps[k]) { warn('o mapa "' + k + '" foi criado mais de uma vez — usando a primeira criação'); return; }
    var empty = hasDrawing === false;
    if (empty) warn('o mapa "' + k + '" foi criado sem desenho — adicione formas, um mapa do Pinta ou uma imagem');
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

${gameKitRpgNavigationRuntime}
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

${gameKitRpgBattleRuntime}
${gameKitAudioRuntime}

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

  /** @type {GameKitRuntimeApi} */
  var api = {
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
          warnOnce('screenbg:' + asset, 'a imagem "' + asset + '" não está no projeto (importe em "Imagens e sons")');
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
  window.SZGameKit = api;
})();
`,
)
