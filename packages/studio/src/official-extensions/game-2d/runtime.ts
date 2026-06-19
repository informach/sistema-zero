/**
 * Runtime didático injetado no <head> do iframe quando a extensão "game-2d"
 * está instalada. Expõe `window.SZGame2D` com helpers simples.
 *
 * É intencionalmente legível — o aluno pode abrir o modo Código, ver
 * `SZGame2D.createSprite(...)` no script.js e seguir o link mental até esta
 * função.
 */
export const gameTwoDRuntime = `(function () {
  // Estado interno: lista de teclas pressionadas.
  var keys = { left: false, right: false, up: false, down: false };
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
  });

  // ---- Imagens / assets ----
  // Manifesto semeado pelo assetsBridge (window.__SZGAME_ASSETS = { nome: dataUrl }).
  // Resolvemos nomes de asset OU URLs/dataUrls diretas. As imagens carregam de
  // forma ASSÍNCRONA, mas a API é SÍNCRONA e didática: loadImage devolve um handle
  // { img, loaded } na hora; drawSprite desenha quando loaded, senão cai no
  // placeholder (retângulo da cor). Como o gameLoop roda todo frame, a imagem
  // aparece 1–2 frames depois. Sem await/callback.
  var ASSETS = (window.__SZGAME_ASSETS && typeof window.__SZGAME_ASSETS === 'object')
    ? window.__SZGAME_ASSETS
    : {};
  var imageCache = Object.create(null);

  function now() {
    try {
      return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    } catch (e) { return Date.now(); }
  }

  /**
   * Carrega uma imagem por NOME do asset (do manifesto) ou por URL/dataUrl direta.
   * Devolve um handle { img, loaded, url } cacheado por URL. Defensivo: nunca lança
   * e nunca bloqueia — "loaded" vira true no onload.
   */
  function loadImage(src) {
    if (!src || typeof src !== 'string') return null;
    var url = Object.prototype.hasOwnProperty.call(ASSETS, src) ? ASSETS[src] : src;
    if (imageCache[url]) return imageCache[url];
    var handle = { img: null, loaded: false, url: url };
    try {
      var im = new Image();
      handle.img = im;
      im.onload = function () { handle.loaded = true; };
      im.onerror = function () { handle.loaded = false; };
      im.src = url;
    } catch (e) {}
    imageCache[url] = handle;
    return handle;
  }

  /**
   * Prepara uma spritesheet: uma imagem com vários quadros em grade. fw/fh são o
   * tamanho de CADA quadro em pixels. drawFrame/animação indexam os quadros.
   */
  function loadSpriteSheet(name, fw, fh) {
    return {
      image: loadImage(name),
      frameW: (typeof fw === 'number' && fw > 0) ? fw : 32,
      frameH: (typeof fh === 'number' && fh > 0) ? fh : 32
    };
  }

  /**
   * Cria um sprite. Um sprite é só um objeto { x, y, w, h, color, vx, vy } — e,
   * opcionalmente, uma imagem (opts.image, nome do asset) e/ou uma animação.
   */
  function createSprite(opts) {
    opts = opts || {};
    return {
      x: opts.x || 0,
      y: opts.y || 0,
      w: opts.w || 32,
      h: opts.h || 32,
      color: opts.color || '#22d3ee',
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      image: opts.image ? loadImage(opts.image) : null,
      anim: null
    };
  }

  /** Troca a imagem fixa do sprite (e cancela a animação atual). */
  function setImage(sprite, name) {
    if (!sprite) return;
    sprite.image = name ? loadImage(name) : null;
    sprite.anim = null;
    sprite._imgHooked = false;
  }

  /**
   * Anexa uma animação de spritesheet ao sprite: percorre os quadros [from..to] a
   * "fps" quadros por segundo. drawSprite avança o quadro pelo tempo e desenha.
   */
  function setAnimation(sprite, sheet, from, to, fps) {
    if (!sprite || !sheet) return;
    var f = (typeof from === 'number') ? from : 0;
    var t = (typeof to === 'number') ? to : f;
    sprite.anim = {
      sheet: sheet,
      from: Math.max(0, Math.floor(f)),
      to: Math.max(0, Math.floor(t)),
      fps: (typeof fps === 'number' && fps > 0) ? fps : 8,
      start: now()
    };
  }

  /**
   * Desenha UM quadro (índice) de uma spritesheet na posição/tamanho dados.
   * Placeholder cinza se a imagem ainda não carregou.
   */
  function drawFrame(ctx, sheet, index, x, y, w, h) {
    if (!ctx) return;
    var dx = x || 0, dy = y || 0;
    var img = sheet && sheet.image && sheet.image.loaded ? sheet.image.img : null;
    if (!img) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(dx, dy, w || 32, h || 32);
      return;
    }
    var fw = sheet.frameW || 32, fh = sheet.frameH || 32;
    var sheetW = img.naturalWidth || img.width || fw;
    var cols = Math.max(1, Math.floor(sheetW / fw));
    var i = Math.max(0, Math.floor(index || 0));
    var sx = (i % cols) * fw;
    var sy = Math.floor(i / cols) * fh;
    var dw = (typeof w === 'number') ? w : fw;
    var dh = (typeof h === 'number') ? h : fh;
    try { ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh); } catch (e) {}
  }

  /**
   * Desenha o sprite no contexto 2d. Prioridade: animação de spritesheet →
   * imagem fixa → placeholder (retângulo da cor, enquanto a imagem carrega ou se
   * não houver imagem). Mantém o comportamento antigo (só fillRect) para sprites
   * sem imagem — retrocompatível.
   */
  function drawSprite(ctx, sprite) {
    if (!ctx || !sprite) return;
    var a = sprite.anim;
    if (a && a.sheet && a.sheet.image && a.sheet.image.loaded) {
      var frames = (a.to - a.from) + 1;
      if (frames < 1) frames = 1;
      var elapsed = (now() - a.start) / 1000;
      var idx = a.from + (Math.floor(elapsed * a.fps) % frames);
      drawFrame(ctx, a.sheet, idx, sprite.x, sprite.y, sprite.w, sprite.h);
      return;
    }
    if (sprite.image && sprite.image.loaded && sprite.image.img) {
      try { ctx.drawImage(sprite.image.img, sprite.x, sprite.y, sprite.w, sprite.h); return; }
      catch (e) {}
    }
    // Imagem ainda CARREGANDO: agenda UM redraw para quando ela chegar. Assim um
    // desenho ÚNICO (fora do "a cada frame") também mostra a imagem assim que ela
    // termina de carregar — senão o aluno via só o retângulo (placeholder) para
    // sempre. Num loop, isto dispara uma vez e o loop segue desenhando normalmente.
    var fixed = sprite.image;
    if (fixed && fixed.img && !fixed.loaded && !sprite._imgHooked) {
      sprite._imgHooked = true;
      try {
        fixed.img.addEventListener('load', function () {
          try {
            ctx.clearRect(sprite.x, sprite.y, sprite.w, sprite.h);
            ctx.drawImage(fixed.img, sprite.x, sprite.y, sprite.w, sprite.h);
          } catch (e) {}
        });
      } catch (e) {}
    }
    ctx.fillStyle = sprite.color;
    ctx.fillRect(sprite.x, sprite.y, sprite.w, sprite.h);
  }

  /**
   * Colisão retangular simples (AABB).
   */
  function isColliding(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /**
   * Loop de jogo. Recebe uma função que vai rodar a cada frame e devolve uma
   * função para PARAR o loop (chame-a quando o jogo acabar ou ao reiniciar,
   * para não empilhar vários loops rodando ao mesmo tempo).
   *
   * Só pode existir UM loop ativo: ao chamar gameLoop de novo (ex.: o gerador
   * emite a chamada num caminho que roda mais de uma vez), o loop anterior é
   * parado automaticamente antes de iniciar o novo. Assim a velocidade do jogo
   * não acelera por empilhamento de RAFs.
   */
  var activeLoopStop = null;
  function gameLoop(fn) {
    if (activeLoopStop) activeLoopStop();
    var canceled = false;
    var rafId = 0;
    function tick() {
      if (canceled) return;
      try { fn(); } catch (e) { console.error(e && e.message ? e.message : e); }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    function stop() {
      canceled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (activeLoopStop === stop) activeLoopStop = null;
    }
    activeLoopStop = stop;
    return stop;
  }

  // ---- Física ----
  // Mundo com gravidade (px/frame² aplicada ao eixo Y por applyVelocity).
  var world = { gravity: 0 };
  function setGravity(g) { world.gravity = typeof g === 'number' ? g : 0; }

  /** Integra a velocidade no sprite e soma a gravidade ao vy. */
  function applyVelocity(s) {
    if (!s) return;
    s.x += s.vx || 0;
    s.y += s.vy || 0;
    s.vy = (s.vy || 0) + world.gravity;
  }

  /** Faz o sprite ricochetear nas bordas do canvas (invertendo a velocidade). */
  function bounceOnEdges(s, ctx) {
    if (!s || !ctx || !ctx.canvas) return;
    var w = ctx.canvas.width, h = ctx.canvas.height;
    if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx || 0); }
    else if (s.x + s.w > w) { s.x = w - s.w; s.vx = -Math.abs(s.vx || 0); }
    if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy || 0); }
    else if (s.y + s.h > h) { s.y = h - s.h; s.vy = -Math.abs(s.vy || 0); }
  }

  /** Colisão por círculo: distância dos centros < soma dos raios (≈ metade do lado). */
  function circleCollides(a, b) {
    if (!a || !b) return false;
    var ar = Math.min(a.w, a.h) / 2, br = Math.min(b.w, b.h) / 2;
    var dx = (a.x + a.w / 2) - (b.x + b.w / 2);
    var dy = (a.y + a.h / 2) - (b.y + b.h / 2);
    return Math.sqrt(dx * dx + dy * dy) < ar + br;
  }

  // ---- Áudio (Web Audio, sem assets) ----
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) {}
    return audioCtx;
  }
  /** Toca um tom curto (freq em Hz, duração em ms). Sintetizado — não precisa de arquivo. */
  function playSound(freq, ms) {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = typeof freq === 'number' && freq > 0 ? freq : 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      var dur = (typeof ms === 'number' && ms > 0 ? ms : 200) / 1000;
      var t = ctx.currentTime;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {}
  }

  // ---- Ponteiro (mouse/toque, Pointer Events) ----
  var pointer = { x: 0, y: 0, down: false };
  var pointerHandlers = [];
  // Teto de segurança de handlers de clique/toque. O gerador emite um arrow
  // NOVO a cada vez que o bloco "quando clicar/tocar" roda; se o aluno colocar
  // esse bloco DENTRO do "a cada frame" (é um input_statement, então é legal),
  // onPointer seria chamado com uma referência inédita por frame e a lista
  // cresceria sem limite — vazamento de memória + N disparos por clique. O cap
  // é folgado o bastante para vários handlers distintos de propósito.
  var MAX_POINTER_HANDLERS = 32;
  var pointerLimitWarned = false;
  function pointerXY(e) {
    var c = document.querySelector('canvas');
    var rect = c ? c.getBoundingClientRect() : { left: 0, top: 0 };
    return { x: (e.clientX || 0) - rect.left, y: (e.clientY || 0) - rect.top };
  }
  window.addEventListener('pointermove', function (e) {
    var p = pointerXY(e); pointer.x = p.x; pointer.y = p.y;
  });
  window.addEventListener('pointerup', function () { pointer.down = false; });
  window.addEventListener('pointerdown', function (e) {
    var p = pointerXY(e); pointer.x = p.x; pointer.y = p.y; pointer.down = true;
    for (var i = 0; i < pointerHandlers.length; i++) {
      try { pointerHandlers[i](p.x, p.y); }
      catch (err) { console.error(err && err.message ? err.message : err); }
    }
  });
  /**
   * Registra uma função chamada a cada clique/toque com a posição (x, y) no
   * canvas. Dois guardas, nessa ordem:
   *
   *  1. Dedup por REFERÊNCIA: registrar a mesma função duas vezes mantém um só
   *     handler. Só ajuda quando a referência se repete de fato (ex.: aluno
   *     chama onPointer com a mesma variável duas vezes).
   *  2. Teto rígido (MAX_POINTER_HANDLERS): o gerador emite um arrow LITERAL
   *     novo a cada execução do bloco, então o dedup por referência NUNCA casa
   *     nesse caso. Se o bloco "quando clicar/tocar" estiver dentro do "a cada
   *     frame", a lista cresceria sem limite. Acima do teto, ignoramos novos
   *     registros (avisando uma única vez no console) — o jogo segue rodando
   *     com os handlers que já tem, sem vazar memória nem multiplicar disparos.
   *
   * O cap NÃO muda o comportamento legítimo de poucos handlers distintos: 32 é
   * folgado para qualquer jogo didático com alguns cliques registrados de
   * propósito.
   */
  function onPointer(fn) {
    if (typeof fn !== 'function') return;
    if (pointerHandlers.indexOf(fn) !== -1) return;
    if (pointerHandlers.length >= MAX_POINTER_HANDLERS) {
      if (!pointerLimitWarned) {
        pointerLimitWarned = true;
        console.warn(
          'SZGame2D: muitos handlers de clique/toque registrados (limite ' +
            MAX_POINTER_HANDLERS +
            '). Registros extras serão ignorados. Dica: registre "quando clicar/tocar" FORA do "a cada frame".'
        );
      }
      return;
    }
    pointerHandlers.push(fn);
  }

  // ---- Movimento (v0.4.0) ----
  /** Plataforma: esq/dir + pulo (só no chão) + gravidade. O chão é a base do canvas. */
  function platformer(sprite, ctx, speed, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var s = typeof speed === 'number' ? speed : 4;
    var j = typeof jump === 'number' ? jump : 11;
    if (keys.left) sprite.x -= s;
    if (keys.right) sprite.x += s;
    sprite.vy = (sprite.vy || 0) + 0.6; // gravidade
    sprite.y += sprite.vy;
    var floor = ctx.canvas.height - sprite.h;
    var onGround = false;
    if (sprite.y >= floor) { sprite.y = floor; sprite.vy = 0; onGround = true; }
    if (keys.up && onGround) sprite.vy = -j;
  }

  /** Top-down: 4 direções com diagonal normalizada (diagonal não fica mais rápida). */
  function topDown(sprite, speed) {
    if (!sprite) return;
    var s = typeof speed === 'number' ? speed : 3;
    var dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    sprite.x += dx * s;
    sprite.y += dy * s;
  }

  /** Faz o sprite andar em direção ao ponteiro (mouse/toque). */
  function followPointer(sprite, speed) {
    if (!sprite) return;
    var s = typeof speed === 'number' ? speed : 3;
    var cx = sprite.x + sprite.w / 2, cy = sprite.y + sprite.h / 2;
    var dx = pointer.x - cx, dy = pointer.y - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > s) { sprite.x += (dx / dist) * s; sprite.y += (dy / dist) * s; }
    else { sprite.x = pointer.x - sprite.w / 2; sprite.y = pointer.y - sprite.h / 2; }
  }

  /** Gruda o sprite nas bordas do canvas (não deixa sair da tela). */
  function clampToScreen(sprite, ctx) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var w = ctx.canvas.width, h = ctx.canvas.height;
    if (sprite.x < 0) sprite.x = 0;
    if (sprite.y < 0) sprite.y = 0;
    if (sprite.x + sprite.w > w) sprite.x = w - sprite.w;
    if (sprite.y + sprite.h > h) sprite.y = h - sprite.h;
  }

  // ---- Efeitos visuais (v0.4.0) ----
  /** Clarão: pinta a tela inteira com uma cor translúcida (use num frame). */
  function flash(ctx, color) {
    if (!ctx || !ctx.canvas) return;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  /**
   * Tremor de tela: sacode o ELEMENTO canvas via CSS transform e PARA SOZINHO (o
   * tremor decai num RAF próprio). Chamar de novo renova a intensidade. Usar o
   * transform do elemento (não o ctx.translate) evita conflito com clear/draw.
   */
  var shakeAmount = 0;
  var shakeActive = false;
  function shake(ctx, intensity) {
    if (!ctx || !ctx.canvas) return;
    var inten = typeof intensity === 'number' ? intensity : 8;
    if (inten > shakeAmount) shakeAmount = inten;
    if (shakeActive) return;
    shakeActive = true;
    var canvas = ctx.canvas;
    function tick() {
      if (shakeAmount > 0.3) {
        var dx = (Math.random() * 2 - 1) * shakeAmount;
        var dy = (Math.random() * 2 - 1) * shakeAmount;
        canvas.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        shakeAmount *= 0.88;
        requestAnimationFrame(tick);
      } else {
        canvas.style.transform = '';
        shakeAmount = 0;
        shakeActive = false;
      }
    }
    requestAnimationFrame(tick);
  }

  // Partículas: estado + emitir + (atualizar e desenhar). Teto rígido p/ não vazar.
  var particles = [];
  var MAX_PARTICLES = 400;
  /** Explosão de N partículas no ponto x/y, espalhando em todas as direções. */
  function emitParticles(x, y, count, color) {
    var n = Math.min(typeof count === 'number' ? count : 12, 80);
    for (var i = 0; i < n; i++) {
      if (particles.length >= MAX_PARTICLES) break;
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * 3 + 1;
      particles.push({
        x: x || 0, y: y || 0,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, size: Math.random() * 3 + 2, color: color || '#fbbf24'
      });
    }
  }
  /** Move E desenha as partículas (uma chamada por frame); elas somem sozinhas. */
  function drawParticles(ctx) {
    if (!ctx) return;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.06;
      p.life -= 0.02;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  // ---- Tiles / tilemaps (v0.5.0) ----
  // Um tilemap é uma GRADE de índices desenhada com um tileset (uma imagem com
  // vários quadros lado a lado, indexados como na spritesheet). O índice de cada
  // célula escolhe o quadro; célula vazia (-1) não desenha nada. Os índices
  // marcados como "sólidos" barram o sprite (collideTileMap). O texto da grade
  // aceita linhas separadas por ';' ou quebra de linha, e células separadas por
  // espaço ou vírgula; '.' ou '-' (ou vazio) = célula vazia.
  // IMPORTANTE: este runtime é injetado como STRING (template literal) — escapes
  // de barra invertida (como em literais de regex) NÃO sobrevivem à montagem da
  // string. Por isso tokenizamos a grade na mão, comparando caracteres por código,
  // sem usar regex. Separadores de COLUNA: espaço(32), tab(9), vírgula(44).
  // Separadores de LINHA: ';'(59), nova linha(10), retorno(13).
  function parseGrid(text) {
    var rows = [];
    if (typeof text !== 'string') return rows;
    var row = [];
    var token = '';
    function pushToken() {
      if (token === '') return;
      if (token === '.' || token === '-') { row.push(-1); }
      else { var n = parseInt(token, 10); row.push(isNaN(n) ? -1 : n); }
      token = '';
    }
    function pushRow() {
      pushToken();
      if (row.length > 0) rows.push(row);
      row = [];
    }
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var code = text.charCodeAt(i);
      if (ch === ';' || code === 10 || code === 13) { pushRow(); }
      else if (code === 32 || code === 9 || ch === ',') { pushToken(); }
      else { token += ch; }
    }
    pushRow();
    return rows;
  }
  function parseSolidList(text) {
    var out = [];
    if (typeof text !== 'string') return out;
    var token = '';
    function flush() {
      if (token === '') return;
      var n = parseInt(token, 10);
      if (!isNaN(n)) out.push(n);
      token = '';
    }
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      // separadores: espaço(32), tab(9), nova linha(10), retorno(13), vírgula(44), ';'(59)
      if (code === 32 || code === 9 || code === 10 || code === 13 || code === 44 || code === 59) {
        flush();
      } else {
        token += text.charAt(i);
      }
    }
    flush();
    return out;
  }
  /**
   * Cria um tilemap a partir de { image, tile, solid, grid }. image = nome do
   * asset do tileset; tile = tamanho (px) de cada quadro/célula; grid = texto da
   * grade; solid = índices que barram o sprite. ox/oy guardam onde o mapa foi
   * desenhado por último (collideTileMap usa para alinhar a colisão ao desenho).
   */
  function createTileMap(opts) {
    opts = opts || {};
    var t = (typeof opts.tile === 'number' && opts.tile > 0) ? opts.tile : 32;
    return {
      tileset: loadSpriteSheet(opts.image, t, t),
      tile: t,
      rows: parseGrid(opts.grid),
      solid: parseSolidList(opts.solid),
      ox: 0,
      oy: 0
    };
  }
  /** Verdadeiro se a célula (col,row) tem um índice marcado como sólido. */
  function isSolidCell(map, col, row) {
    if (!map || !map.rows) return false;
    if (row < 0 || row >= map.rows.length) return false;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return false;
    return map.solid.indexOf(r[col]) !== -1;
  }
  /** Índice do tile no PIXEL (px,py) do canvas (alinhado a onde o mapa foi desenhado); -1 fora/vazio. */
  function tileAt(map, px, py) {
    if (!map || !map.rows || !map.tile) return -1;
    var col = Math.floor((px - (map.ox || 0)) / map.tile);
    var row = Math.floor((py - (map.oy || 0)) / map.tile);
    if (row < 0 || row >= map.rows.length) return -1;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return -1;
    return r[col];
  }
  /** Desenha o tilemap no contexto, com o canto superior esquerdo em (x,y). */
  function drawTileMap(ctx, map, x, y) {
    if (!ctx || !map || !map.rows) return;
    var ox = x || 0, oy = y || 0;
    map.ox = ox;
    map.oy = oy;
    var t = map.tile;
    for (var r = 0; r < map.rows.length; r++) {
      var row = map.rows[r];
      for (var c = 0; c < row.length; c++) {
        var idx = row[c];
        if (idx < 0) continue;
        drawFrame(ctx, map.tileset, idx, ox + c * t, oy + r * t, t, t);
      }
    }
  }
  /**
   * Impede o sprite de atravessar os tiles sólidos do mapa: empurra o sprite para
   * FORA de cada célula sólida que ele toca (pelo eixo de menor sobreposição) e
   * zera a velocidade nesse eixo — assim ele pousa sobre o chão e bate nas
   * paredes. Usa o canto (ox/oy) do último drawTileMap para alinhar a colisão.
   */
  function collideTileMap(sprite, map) {
    if (!sprite || !map || !map.rows || !map.tile) return;
    var t = map.tile, ox = map.ox || 0, oy = map.oy || 0;
    var c0 = Math.floor((sprite.x - ox) / t);
    var c1 = Math.floor((sprite.x + sprite.w - 1 - ox) / t);
    var r0 = Math.floor((sprite.y - oy) / t);
    var r1 = Math.floor((sprite.y + sprite.h - 1 - oy) / t);
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        if (!isSolidCell(map, c, r)) continue;
        var tx = ox + c * t, ty = oy + r * t;
        var overlapX = Math.min(sprite.x + sprite.w, tx + t) - Math.max(sprite.x, tx);
        var overlapY = Math.min(sprite.y + sprite.h, ty + t) - Math.max(sprite.y, ty);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX < overlapY) {
          if (sprite.x < tx) sprite.x -= overlapX; else sprite.x += overlapX;
          sprite.vx = 0;
        } else {
          if (sprite.y < ty) { sprite.y -= overlapY; if ((sprite.vy || 0) > 0) sprite.vy = 0; }
          else { sprite.y += overlapY; if ((sprite.vy || 0) < 0) sprite.vy = 0; }
        }
      }
    }
  }

  // ---- Eventos "Quando…" ----
  /** Roda fn toda vez que a tecla é apertada (compara e.key e e.code). */
  function onKey(key, fn) {
    if (typeof fn !== 'function' || !key) return;
    window.addEventListener('keydown', function (e) {
      var hit = e.key === key || e.code === key ||
        (key === 'Space' && (e.key === ' ' || e.code === 'Space'));
      if (!hit) return;
      try { fn(); } catch (err) { console.error(err && err.message ? err.message : err); }
    });
  }
  // Sobreposição: registra pares (getA, getB, fn) e checa num rAF interno (começa
  // sob demanda). Edge-triggered: dispara UMA vez quando começam a encostar. Os
  // sprites entram como thunks (() => sprite) — resolvidos no disparo, então a
  // ordem dos blocos no topo não causa erro de "antes de declarar".
  var overlapHandlers = [];
  var MAX_OVERLAP_HANDLERS = 32;
  var overlapLoopStarted = false;
  function overlapTick() {
    for (var i = 0; i < overlapHandlers.length; i++) {
      var h = overlapHandlers[i];
      var a = null, b = null;
      try { a = h.getA(); b = h.getB(); } catch (e) { h.wasOverlapping = false; continue; }
      var over = isColliding(a, b);
      if (over && !h.wasOverlapping) {
        try { h.fn(); } catch (err) { console.error(err && err.message ? err.message : err); }
      }
      h.wasOverlapping = over;
    }
    requestAnimationFrame(overlapTick);
  }
  function onOverlap(getA, getB, fn) {
    if (typeof getA !== 'function' || typeof getB !== 'function' || typeof fn !== 'function') return;
    if (overlapHandlers.length >= MAX_OVERLAP_HANDLERS) return;
    overlapHandlers.push({ getA: getA, getB: getB, fn: fn, wasOverlapping: false });
    if (!overlapLoopStarted) { overlapLoopStarted = true; requestAnimationFrame(overlapTick); }
  }

  // ---- Perguntas (booleanos): "tecla apertada?" e "sprites se tocando?" ----
  // Estado de TODAS as teclas seguradas (o "keys" lá de cima só cobre as setas).
  var pressedKeys = Object.create(null);
  window.addEventListener('keydown', function (e) { pressedKeys[e.key] = true; pressedKeys[e.code] = true; });
  window.addEventListener('keyup', function (e) { pressedKeys[e.key] = false; pressedKeys[e.code] = false; });
  /** Verdadeiro enquanto a tecla está segurada (compara e.key e e.code). */
  function keyDown(key) {
    if (key === 'Space') return !!(pressedKeys[' '] || pressedKeys['Space']);
    return !!pressedKeys[key];
  }
  /** Verdadeiro enquanto os dois sprites se tocam (alias de isColliding). */
  function touches(a, b) { return isColliding(a, b); }

  // ---- Palco implícito: o runtime é DONO de um canvas + contexto 2D ----
  // Assim os blocos de jogo não precisam mais mostrar "o pincel (ctx)": o código
  // gerado referencia 'ctx'/'tela' (definidos aqui) sem o aluno montar o canvas na
  // mão. Se a página já tiver um <canvas>, usamos ele; senão criamos um. Tudo
  // PREGUIÇOSO (lazy): este script roda no <head>, antes de o <body> existir.
  var _stageCanvas = null;
  var _stageCtx = null;
  function ensureStage() {
    if (_stageCtx) return _stageCtx;
    var c = null;
    try { c = document.querySelector('canvas'); } catch (e) {}
    if (!c) {
      c = document.createElement('canvas');
      c.width = 320;
      c.height = 480;
      c.style.background = '#11172a';
      c.style.display = 'block';
      if (document.body) document.body.appendChild(c);
    }
    _stageCanvas = c;
    try { _stageCtx = c.getContext('2d'); } catch (e) {}
    return _stageCtx;
  }
  /** Limpa a tela inteira do palco (use no começo de cada quadro). */
  function clear() {
    var c = ensureStage();
    if (c && c.canvas) c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  }
  // Expõe 'ctx' e 'tela' como globais preguiçosos. O setter REDEFINE a propriedade
  // como um valor normal — assim um eventual 'const ctx = ...' antigo (canvasSetup)
  // ou uma atribuição direta continuam funcionando sem conflito.
  function defineLazyGlobal(nameKey, getter) {
    try {
      Object.defineProperty(window, nameKey, {
        configurable: true,
        get: getter,
        set: function (v) {
          Object.defineProperty(window, nameKey, { configurable: true, writable: true, value: v });
        }
      });
    } catch (e) {}
  }
  defineLazyGlobal('ctx', function () { return ensureStage(); });
  defineLazyGlobal('tela', function () { ensureStage(); return _stageCanvas; });

  window.SZGame2D = {
    createSprite: createSprite,
    drawSprite: drawSprite,
    clear: clear,
    isColliding: isColliding,
    gameLoop: gameLoop,
    keys: keys,
    setGravity: setGravity,
    applyVelocity: applyVelocity,
    bounceOnEdges: bounceOnEdges,
    circleCollides: circleCollides,
    playSound: playSound,
    onPointer: onPointer,
    onKey: onKey,
    onOverlap: onOverlap,
    keyDown: keyDown,
    touches: touches,
    pointer: pointer,
    // Imagens / spritesheet / animação (v0.3.0).
    loadImage: loadImage,
    loadSpriteSheet: loadSpriteSheet,
    setImage: setImage,
    setAnimation: setAnimation,
    drawFrame: drawFrame,
    // Movimento + efeitos (v0.4.0).
    platformer: platformer,
    topDown: topDown,
    followPointer: followPointer,
    clampToScreen: clampToScreen,
    flash: flash,
    shake: shake,
    emitParticles: emitParticles,
    drawParticles: drawParticles,
    // Tiles / tilemaps (v0.5.0).
    createTileMap: createTileMap,
    drawTileMap: drawTileMap,
    collideTileMap: collideTileMap,
    tileAt: tileAt
  };
})();`
