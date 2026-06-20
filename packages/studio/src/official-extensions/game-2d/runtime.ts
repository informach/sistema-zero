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
  // Wrapper público: aplica o "piscar" (invencibilidade) e delega o desenho real.
  function drawSprite(ctx, sprite) {
    if (!ctx || !sprite) return;
    if (sprite.blinkFrames > 0) {
      sprite.blinkFrames--;
      if (Math.floor(sprite.blinkFrames / 6) % 2 === 0) {
        var pa = ctx.globalAlpha;
        ctx.globalAlpha = 0.35;
        _drawSpriteRaw(ctx, sprite);
        ctx.globalAlpha = pa;
        return;
      }
    }
    _drawSpriteRaw(ctx, sprite);
  }
  function _drawSpriteRaw(ctx, sprite) {
    if (!ctx || !sprite) return;
    // Desenhos prontos (skins): nave, asteroide e tiro têm forma própria.
    if (sprite.skin) {
      if (sprite.skin.kind === 'ship') { drawShip(ctx, sprite); return; }
      if (sprite.skin.kind === 'asteroid') { drawAsteroidSprite(ctx, sprite); return; }
      if (sprite.skin.kind === 'bullet') { drawBullet(ctx, sprite); return; }
      if (sprite.skin.kind === 'dino') { drawDino(ctx, sprite); return; }
      if (sprite.skin.kind === 'obstacle') { drawObstacleSprite(ctx, sprite); return; }
      if (sprite.skin.kind === 'egg') { drawEggSprite(ctx, sprite); return; }
    }
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
    var w = stageW(ctx), h = stageH(ctx);
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
    if (!c) return { x: e.clientX || 0, y: e.clientY || 0 };
    var rect = c.getBoundingClientRect();
    // Mapeia a posição na TELA para as coordenadas internas do canvas: quando ele
    // é exibido maior/menor que a resolução (ex.: "preencher a janela"), display ≠
    // interno, então escalamos — senão o ponteiro (dragX/onPointer) fica torto.
    var sx = rect.width ? (_logicalW || c.width) / rect.width : 1;
    var sy = rect.height ? (_logicalH || c.height) / rect.height : 1;
    return { x: ((e.clientX || 0) - rect.left) * sx, y: ((e.clientY || 0) - rect.top) * sy };
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
    var floor = stageH(ctx) - sprite.h;
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
    var w = stageW(ctx), h = stageH(ctx);
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
    ctx.fillRect(0, 0, stageW(ctx), stageH(ctx));
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

  // ---- Grupos de sprites: MUITOS sprites (tiros, inimigos, estrelas) ----
  // Um grupo é só uma LISTA gerenciada de sprites — os mesmos objetos de
  // createSprite. Assim drawSprite/applyVelocity/isColliding já funcionam em
  // cada item, sem motor novo. Teto rígido p/ não vazar memória se o aluno
  // criar sprites sem parar (ex.: um tiro por quadro).
  var MAX_GROUP = 400;
  /** Cria um grupo vazio. */
  function createGroup() { return { items: [] }; }
  /**
   * Cria um sprite (colorido OU com imagem, conforme opts) e o coloca no grupo.
   * Devolve o sprite. Acima do teto, descarta silenciosamente (nunca lança).
   */
  function spawn(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    var s = createSprite(opts);
    group.items.push(s);
    return s;
  }
  // Cria um TIRO (bolinha brilhante) no grupo. x/y = CENTRO; raio em px.
  function spawnBullet(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var r = (typeof opts.radius === 'number' && opts.radius > 0) ? opts.radius : 5;
    var s = createSprite({
      x: (opts.x || 0) - r,
      y: (opts.y || 0) - r,
      w: r * 2,
      h: r * 2,
      color: opts.color,
      vx: opts.vx,
      vy: opts.vy
    });
    s.skin = { kind: 'bullet', color: opts.color || '#9cff57' };
    group.items.push(s);
    return s;
  }
  /** Desenha o tiro: bolinha com brilho (glow). */
  function drawBullet(ctx, sprite) {
    var r = (sprite.w || 10) / 2;
    var cx = sprite.x + sprite.w / 2;
    var cy = sprite.y + sprite.h / 2;
    var col = (sprite.skin && sprite.skin.color) || sprite.color || '#9cff57';
    ctx.save();
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // Move o sprite SÓ na horizontal com as setas ← → (não sai sozinho da tela:
  // combine com "prender o sprite na tela").
  function arrowsX(sprite, speed) {
    if (!sprite) return;
    var sp = (typeof speed === 'number') ? speed : 5;
    if (keys.left) sprite.x -= sp;
    if (keys.right) sprite.x += sp;
  }
  // Faz o sprite PISCAR por N quadros (ex.: invencibilidade ao levar dano).
  function blink(sprite, frames) {
    if (!sprite) return;
    sprite.blinkFrames = (typeof frames === 'number' && frames > 0) ? Math.floor(frames) : 60;
  }
  /** Move cada sprite do grupo pela sua velocidade (e gravidade do mundo). */
  function updateGroup(group) {
    if (!group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) applyVelocity(group.items[i]);
  }
  /** Desenha todos os sprites do grupo. */
  function drawGroup(ctx, group) {
    if (!ctx || !group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) drawSprite(ctx, group.items[i]);
  }
  /**
   * Roda fn(sprite, i) para cada sprite. Itera em ordem REVERSA para que o
   * corpo possa remover o item atual (com "tirar do grupo") sem pular nenhum.
   */
  function forEachInGroup(group, fn) {
    if (!group || !group.items || typeof fn !== 'function') return;
    for (var i = group.items.length - 1; i >= 0; i--) {
      try { fn(group.items[i], i); } catch (e) { console.error(e && e.message ? e.message : e); }
    }
  }
  /** Quantos sprites o grupo tem agora. */
  function countGroup(group) { return (group && group.items) ? group.items.length : 0; }
  /** Esvazia o grupo (tira todos os sprites). */
  function clearGroup(group) { if (group && group.items) group.items.length = 0; }
  /** Tira um sprite específico do grupo (por referência). */
  function removeFromGroup(group, sprite) {
    if (!group || !group.items) return;
    var idx = group.items.indexOf(sprite);
    if (idx !== -1) group.items.splice(idx, 1);
  }
  /**
   * Remove do grupo os sprites que saíram da tela (com uma margem). Para cada
   * um que sai, chama onLeave(sprite) — é assim que "asteroide escapou = perde
   * vida". Roda dentro do "a cada quadro" do aluno; sem RAF próprio.
   */
  function pruneOffscreen(ctx, group, margin, onLeave) {
    if (!ctx || !ctx.canvas || !group || !group.items) return;
    var m = typeof margin === 'number' ? margin : 40;
    var w = stageW(ctx), h = stageH(ctx);
    for (var i = group.items.length - 1; i >= 0; i--) {
      var s = group.items[i];
      if (!s) { group.items.splice(i, 1); continue; }
      if (s.x + s.w < -m || s.x > w + m || s.y + s.h < -m || s.y > h + m) {
        group.items.splice(i, 1);
        if (typeof onLeave === 'function') {
          try { onLeave(s); } catch (e) { console.error(e && e.message ? e.message : e); }
        }
      }
    }
  }
  /**
   * Para cada par (sprite do grupo A, sprite do grupo B) que se encosta, chama
   * fn(a, b). Varredura por quadro (NÃO registra handler como onOverlap — sem
   * teto de 32 e sem edge-trigger): use dentro do "a cada quadro". Itera em
   * ordem reversa p/ tolerar remoção dos sprites no corpo (tiro some, inimigo
   * explode). Custo O(N×M) por quadro — os tetos de grupo seguram o tamanho.
   */
  function overlapGroups(a, b, fn) {
    if (!a || !a.items || !b || !b.items || typeof fn !== 'function') return;
    for (var i = a.items.length - 1; i >= 0; i--) {
      var ai = a.items[i];
      if (!ai) continue;
      for (var j = b.items.length - 1; j >= 0; j--) {
        var bj = b.items[j];
        if (!bj) continue;
        if (isColliding(ai, bj)) {
          try { fn(ai, bj); } catch (e) { console.error(e && e.message ? e.message : e); }
        }
      }
    }
  }

  // ---- Temporizadores didáticos: "a cada N quadros / segundos" ----
  // Sem RAF próprio: contadores por CHAVE estável (o gerador passa uma chave
  // literal por bloco). everyFrames conta quadros; everySeconds usa o relógio.
  // O aluno chama dentro do "a cada quadro": if (SZGame2D.everyFrames('k', 30)) {…}.
  var frameCounters = Object.create(null);
  function everyFrames(key, n) {
    var step = (typeof n === 'number' && n > 0) ? Math.floor(n) : 1;
    var c = (frameCounters[key] || 0) + 1;
    frameCounters[key] = c;
    return c % step === 0;
  }
  var secondTimers = Object.create(null);
  function everySeconds(key, secs) {
    var period = (typeof secs === 'number' && secs > 0) ? secs * 1000 : 1000;
    var t = now();
    var last = secondTimers[key];
    if (last === undefined) { secondTimers[key] = t; return false; }
    if (t - last >= period) { secondTimers[key] = t; return true; }
    return false;
  }

  // ---- Kit "Nave & Asteroides" (v0.7.0): desenhos prontos + efeitos ----
  // Um sprite pode ter um "skin" (sprite.skin) que muda o jeito que ele é
  // desenhado. drawSprite despacha: skin 'ship' -> nave; 'asteroid' -> asteroide.
  // Assim o mesmo modelo de sprite (x/y/w/h/vx/vy) ganha o visual do jogo.

  /** Cria uma nave (corpo + asas customizáveis; cabine e foguinho fixos, animados). */
  function createShip(opts) {
    opts = opts || {};
    var s = createSprite({ x: opts.x, y: opts.y, w: opts.w, h: opts.h, color: opts.body });
    s.skin = { kind: 'ship', body: opts.body || '#35e8ff', wings: opts.wings || '#2568ff' };
    return s;
  }
  /**
   * Desenha a nave centrada na caixa do sprite, na escala da largura (w=54 => 1:1
   * com o desenho de referência). O foguinho pulsa com o tempo (animação embutida);
   * o corpo usa a cor "body" e as asas a cor "wings"; cabine fixa.
   */
  function drawShip(ctx, sprite) {
    var sk = sprite.skin || {};
    var cx = sprite.x + sprite.w / 2;
    var cy = sprite.y + sprite.h / 2;
    // Escala para a nave INTEIRA (ponta de asa a ponta de asa = 96 no desenho de
    // referência) caber na largura da caixa — assim ela fica proporcional aos
    // outros objetos (não estoura a própria caixa) e a colisão bate com o visual.
    var s = (sprite.w || 54) / 96;
    var oy = -17; // desloca o desenho de referência p/ centralizar na caixa
    var flame = 22 + Math.sin(now() * 0.015) * 5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    // foguinho (laranja)
    ctx.fillStyle = '#ffb13b';
    ctx.beginPath();
    ctx.moveTo(0, oy + 42);
    ctx.lineTo(-11, oy + 66);
    ctx.lineTo(11, oy + 66);
    ctx.closePath();
    ctx.fill();
    // foguinho (vermelho, pulsando)
    ctx.fillStyle = '#ff5d3d';
    ctx.beginPath();
    ctx.moveTo(0, oy + 45);
    ctx.lineTo(-7, oy + flame + 58);
    ctx.lineTo(7, oy + flame + 58);
    ctx.closePath();
    ctx.fill();
    // corpo (cor customizada)
    ctx.fillStyle = sk.body || '#35e8ff';
    ctx.beginPath();
    ctx.moveTo(0, oy - 32);
    ctx.lineTo(-28, oy + 38);
    ctx.quadraticCurveTo(0, oy + 58, 28, oy + 38);
    ctx.closePath();
    ctx.fill();
    // asas (cor customizada)
    ctx.fillStyle = sk.wings || '#2568ff';
    ctx.beginPath();
    ctx.moveTo(-20, oy + 16);
    ctx.lineTo(-48, oy + 46);
    ctx.lineTo(-18, oy + 42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, oy + 16);
    ctx.lineTo(48, oy + 46);
    ctx.lineTo(18, oy + 42);
    ctx.closePath();
    ctx.fill();
    // cabine
    ctx.fillStyle = '#dffcff';
    ctx.beginPath();
    ctx.ellipse(0, oy + 2, 13, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(-4, oy - 4, 4, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Coloca no grupo um asteroide (polígono irregular que gira), com forma única. */
  function spawnAsteroid(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var base = (typeof opts.size === 'number' && opts.size > 0) ? opts.size : 36;
    // Cada asteroide nasce com um tamanho um pouco diferente (variedade automática).
    var size = Math.round(base * (0.65 + Math.random() * 0.5));
    var s = createSprite({ x: opts.x, y: opts.y, w: size, h: size, color: opts.color, vx: opts.vx, vy: opts.vy });
    s.skin = {
      kind: 'asteroid',
      color: opts.color || '#8d8f9b',
      sides: 7 + Math.floor(Math.random() * 3),
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.002
    };
    group.items.push(s);
    return s;
  }
  /** Desenha o asteroide: polígono irregular (com "calombos") girando + crateras. */
  function drawAsteroidSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var cx = sprite.x + sprite.w / 2;
    var cy = sprite.y + sprite.h / 2;
    var radius = Math.min(sprite.w, sprite.h) / 2;
    var sides = sk.sides || 8;
    var angle = (sk.spin || 0) + now() * (sk.spinSpeed || 0);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = sk.color || '#8d8f9b';
    ctx.strokeStyle = '#d6d7df';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < sides; i++) {
      var a = (Math.PI * 2 / sides) * i;
      var bump = 0.78 + Math.sin(i * 12.98 + radius) * 0.22;
      var r = radius * bump;
      var px = Math.cos(a) * r;
      var py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.arc(-radius * 0.25, -radius * 0.1, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(radius * 0.25, radius * 0.18, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Explosão temática no centro do sprite (jato da cor + estilhaços cinza). */
  function explodeSprite(sprite, color) {
    if (!sprite) return;
    var cx = sprite.x + (sprite.w || 0) / 2, cy = sprite.y + (sprite.h || 0) / 2;
    emitParticles(cx, cy, 18, color || '#ffb13b');
    emitParticles(cx, cy, 10, '#d6d7df');
  }

  /** Som de tiro: blip curto descendo de tom. */
  function playShoot() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'square';
      var t = ctx.currentTime;
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.1);
    } catch (e) {}
  }
  /** Som de explosão: rajada de ruído filtrado que decai. */
  function playExplosion() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var dur = 0.3;
      var rate = ctx.sampleRate || 44100;
      var len = Math.floor(rate * dur);
      var buffer = ctx.createBuffer(1, len, rate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      var gain = ctx.createGain();
      var t = ctx.currentTime;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start();
    } catch (e) {}
  }

  /**
   * Para cada sprite do grupo que encosta no sprite dado, roda fn(item). O sprite
   * entra como thunk (() => sprite). Varredura por quadro (use no "a cada quadro").
   */
  function overlapSpriteGroup(getSprite, group, fn) {
    if (typeof getSprite !== 'function' || !group || !group.items || typeof fn !== 'function') return;
    var sprite = null;
    try { sprite = getSprite(); } catch (e) { return; }
    if (!sprite) return;
    for (var i = group.items.length - 1; i >= 0; i--) {
      var it = group.items[i];
      if (it && isColliding(sprite, it)) {
        try { fn(it); } catch (err) { console.error(err && err.message ? err.message : err); }
      }
    }
  }

  // ---- HUD no canvas: placar, texto, vidas (corações) e barra ----
  /** Escreve "rótulo valor" (ex.: "Pontos: 5") na tela. */
  function drawScore(ctx, label, value, x, y, color, size) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = color || '#ffffff';
    ctx.font = 'bold ' + ((typeof size === 'number' && size > 0) ? size : 20) + 'px sans-serif';
    ctx.textAlign = 'left';
    var text = (label === undefined || label === null || label === '') ? String(value)
      : String(label) + ' ' + String(value);
    ctx.fillText(text, x || 0, y || 0);
    ctx.restore();
  }
  /** Escreve um texto na tela (com alinhamento esquerda/centro/direita). */
  function drawLabel(ctx, text, x, y, color, size, align) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = color || '#ffffff';
    ctx.font = 'bold ' + ((typeof size === 'number' && size > 0) ? size : 20) + 'px sans-serif';
    ctx.textAlign = align || 'left';
    ctx.fillText(String(text === undefined || text === null ? '' : text), x || 0, y || 0);
    ctx.restore();
  }
  /** Desenha UM coração de tamanho s, canto superior-esquerdo em (x,y). */
  function drawHeart(ctx, x, y, s) {
    var top = s * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + top);
    ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + top);
    ctx.bezierCurveTo(x, y + (s + top) / 2, x + s / 2, y + (s + top) / 2, x + s / 2, y + s);
    ctx.bezierCurveTo(x + s / 2, y + (s + top) / 2, x + s, y + (s + top) / 2, x + s, y + top);
    ctx.bezierCurveTo(x + s, y, x + s / 2, y, x + s / 2, y + top);
    ctx.closePath();
    ctx.fill();
  }
  /** Desenha "count" corações em linha (ex.: vidas). Teto de 20. */
  function drawHearts(ctx, count, x, y, size, color) {
    if (!ctx) return;
    var n = Math.max(0, Math.min(typeof count === 'number' ? Math.floor(count) : 0, 20));
    var s = (typeof size === 'number' && size > 0) ? size : 22;
    ctx.save();
    ctx.fillStyle = color || '#ff5d5d';
    for (var i = 0; i < n; i++) drawHeart(ctx, (x || 0) + i * (s + 6), y || 0, s);
    ctx.restore();
  }
  /** Barra de progresso/vida: fundo + preenchimento proporcional a value/max. */
  function drawBar(ctx, value, max, x, y, w, h, color) {
    if (!ctx) return;
    var m = (typeof max === 'number' && max > 0) ? max : 1;
    var v = (typeof value === 'number') ? value : 0;
    var frac = Math.max(0, Math.min(v / m, 1));
    var bw = (typeof w === 'number' && w > 0) ? w : 100;
    var bh = (typeof h === 'number' && h > 0) ? h : 12;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x || 0, y || 0, bw, bh);
    ctx.fillStyle = color || '#9cff57';
    ctx.fillRect(x || 0, y || 0, bw * frac, bh);
    ctx.restore();
  }

  // ---- Estado do jogo (cenas): início → jogando → ganhou → perdeu ----
  var _scene = 'inicio';
  /** Troca a tela/cena atual. */
  function setScene(name) { _scene = String(name || 'inicio'); }
  /** Cena atual (string). */
  function getScene() { return _scene; }
  /** Verdadeiro se a cena atual é "name". Use dentro de um "se". */
  function sceneIs(name) { return _scene === String(name); }
  /** Overlay de tela cheia com título, subtítulo e dica (centralizados). */
  // Quebra o texto em várias linhas para caber em maxWidth (centralizado).
  function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var str = String(text);
    if (!ctx.measureText) { ctx.fillText(str, x, y); return y; }
    var words = str.split(' ');
    var line = '';
    var yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x, yy);
        line = words[i] + ' ';
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.replace(/ +$/, ''), x, yy);
    return yy;
  }
  function showScreen(ctx, title, subtitle, hint, bg) {
    if (!ctx || !ctx.canvas) return;
    var w = stageW(ctx), h = stageH(ctx);
    var sc = Math.max(0.7, Math.min(2, w / 640));
    ctx.save();
    // Overlay SEMITRANSPARENTE: o jogo continua aparecendo por trás (à la referência).
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = bg || '#02111f';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(36 * sc) + 'px sans-serif';
    ctx.fillText(String(title || ''), w / 2, h / 2 - 24 * sc);
    var afterY = h / 2 + 12 * sc;
    if (subtitle) {
      ctx.font = Math.round(20 * sc) + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      afterY = _wrapText(ctx, subtitle, w / 2, afterY, Math.min(w * 0.8, 640), 30 * sc);
    }
    if (hint) {
      ctx.font = Math.round(16 * sc) + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(String(hint), w / 2, afterY + 40 * sc);
    }
    ctx.restore();
  }
  /** Reinicia o jogo do zero (recarrega a página do preview). */
  function restart() {
    try { location.reload(); } catch (e) {}
  }

  // ---- Cenário: fundo de estrelas rolando + arrastar nave com o dedo ----
  var _stars = null;
  function ensureStars(ctx) {
    if (_stars) return _stars;
    _stars = [];
    var w = stageW(ctx), h = stageH(ctx);
    for (var i = 0; i < 100; i++) {
      _stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.4,
        s: Math.random() * 0.7 + 0.2,
        alpha: Math.random() * 0.6 + 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    return _stars;
  }
  /**
   * Fundo espacial completo (à la "Nave contra Asteroides"): gradiente vertical do
   * céu + 100 estrelas que ROLAM para baixo e CINTILAM (twinkle). Use no começo do
   * "a cada quadro" (depois de limpar a tela) — ele já pinta o fundo todo.
   */
  function drawStarfield(ctx, speed) {
    if (!ctx || !ctx.canvas) return;
    var sp = (typeof speed === 'number') ? speed : 1;
    var w = stageW(ctx), h = stageH(ctx);
    ctx.save();
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#071b3a');
    grad.addColorStop(0.55, '#06101f');
    grad.addColorStop(1, '#020611');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    var stars = ensureStars(ctx);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = st.alpha + Math.sin(now() * 0.003 + st.phase) * 0.25;
      ctx.globalAlpha = Math.max(0.1, Math.min(1, tw));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
      st.y += st.s * sp;
      if (st.y > h) { st.y = 0; st.x = Math.random() * w; }
    }
    ctx.restore();
  }
  /** Faz o sprite seguir o dedo/mouse SÓ na horizontal (ótimo p/ nave no celular). */
  function dragX(sprite) {
    if (!sprite) return;
    sprite.x = pointer.x - sprite.w / 2;
  }

  // ---- Pulo no chão (genérico) + Kit dino (v0.9.0) ----
  // Bloco genérico "pular no chão": gravidade + pouso na base do canvas + pulo
  // com ↑/Espaço/W ou um toque (borda de toque). Serve a QUALQUER jogo de pulo.
  var _jumpTapPrev = false;
  function jumpOnGround(sprite, ctx, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var j = (typeof jump === 'number' && jump > 0) ? jump : 14;
    var g = world.gravity > 0 ? world.gravity : 0.6;
    sprite.vy = (sprite.vy || 0) + g;
    sprite.y += sprite.vy;
    var floor = stageH(ctx) - sprite.h;
    var onGround = false;
    if (sprite.y >= floor) { sprite.y = floor; sprite.vy = 0; onGround = true; }
    var tap = pointer.down && !_jumpTapPrev;
    _jumpTapPrev = pointer.down;
    var wantJump = keys.up || keyDown('Space') || tap;
    if (wantJump && onGround) sprite.vy = -j;
  }

  // Linha do chão do mundo "corrida": fica um pouco acima da base p/ o dino
  // correr sobre a grama desenhada por drawForest (não colado na borda).
  function dinoGround(ctx) {
    var h = stageH(ctx);
    return h - Math.round(h * 0.16);
  }

  /** Cria um dinossauro desenhado (corre sozinho; pose muda no pulo/agachar). */
  function createDino(opts) {
    opts = opts || {};
    var size = (typeof opts.size === 'number' && opts.size > 0) ? opts.size : 64;
    var w = Math.round(size * 0.95), h = size;
    var s = createSprite({ x: opts.x, y: opts.y, w: w, h: h, color: opts.color });
    s.skin = { kind: 'dino', color: opts.color || '#5fb45f', fullH: h, ducking: false, onGround: true };
    return s;
  }

  var _dinoTapPrev = false;
  /**
   * Controla o dinossauro estilo "corrida": pula com ↑/Espaço/W ou toque na
   * METADE DE CIMA da tela; abaixa com ↓/S ou segurando o dedo na METADE DE
   * BAIXO. Aplica gravidade, pousa na linha do chão (dinoGround) e solta poeira
   * ao pular/pousar. Use DENTRO do "a cada quadro".
   */
  function controlDino(sprite, ctx, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var sk = sprite.skin || (sprite.skin = { kind: 'dino' });
    var j = (typeof jump === 'number' && jump > 0) ? jump : 15;
    var g = world.gravity > 0 ? world.gravity : 0.6;
    var gh = stageH(ctx);
    var gy = dinoGround(ctx);
    // Gravidade + integração vertical.
    sprite.vy = (sprite.vy || 0) + g;
    sprite.y += sprite.vy;
    var floor = gy - sprite.h;
    if (sprite.y >= floor) {
      if (sprite.vy > 5) emitParticles(sprite.x + sprite.w / 2, sprite.y + sprite.h, 5, '#caa977');
      sprite.y = floor; sprite.vy = 0; sk.onGround = true;
    } else {
      sk.onGround = false;
    }
    // Agachar (só no chão): encolhe a altura mantendo os pés na linha do chão.
    var touchDuck = pointer.down && pointer.y > gh * 0.6;
    var wantDuck = (keys.down || touchDuck) && sk.onGround;
    var fullH = sk.fullH || sprite.h;
    if (wantDuck && !sk.ducking) {
      sk.ducking = true;
      var dh = Math.round(fullH * 0.6);
      sprite.y += (sprite.h - dh);
      sprite.h = dh;
    } else if (!wantDuck && sk.ducking) {
      sk.ducking = false;
      sprite.y -= (fullH - sprite.h);
      sprite.h = fullH;
    }
    // Pulo (não enquanto agacha): teclas OU toque na metade de cima.
    var tap = pointer.down && !_dinoTapPrev && pointer.y <= gh * 0.6;
    _dinoTapPrev = pointer.down;
    var wantJump = keys.up || keyDown('Space') || tap;
    if (wantJump && sk.onGround && !sk.ducking) {
      sprite.vy = -j;
      sk.onGround = false;
      emitParticles(sprite.x + sprite.w / 2, sprite.y + sprite.h, 8, '#caa977');
    }
  }

  /** Desenha o dinossauro (corpo, cabeça, espinhos, perninhas que correm). */
  function drawDino(ctx, sprite) {
    var sk = sprite.skin || {};
    var x = sprite.x, y = sprite.y, w = sprite.w, h = sprite.h;
    var col = sk.color || '#5fb45f';
    var dark = '#3f8f49';
    var belly = '#d6f3b4';
    var ducking = !!sk.ducking;
    var jumping = sk.onGround === false;
    var swing = (!ducking && !jumping) ? Math.sin(now() * 0.02) * (h * 0.09) : (jumping ? -h * 0.05 : 0);
    ctx.save();
    // sombra
    ctx.fillStyle = 'rgba(32,65,92,0.16)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.52, y + h - 1, w * 0.42, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // cauda
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.52);
    ctx.quadraticCurveTo(x - w * 0.06, y + h * 0.46, x + w * 0.02, y + h * 0.74);
    ctx.quadraticCurveTo(x + w * 0.16, y + h * 0.7, x + w * 0.28, y + h * 0.58);
    ctx.closePath();
    ctx.fill();
    // perninhas (duas, alternando)
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(4, w * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.42, y + h * 0.78);
    ctx.lineTo(x + w * 0.38 - swing * 0.4, y + h - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.6, y + h * 0.78);
    ctx.lineTo(x + w * 0.64 + swing * 0.4, y + h - 1);
    ctx.stroke();
    // corpo
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.52, y + h * 0.58, w * 0.3, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    // barriga
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.56, y + h * 0.66, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // espinhos nas costas
    ctx.fillStyle = dark;
    for (var i = 0; i < 3; i++) {
      var spx = x + w * (0.34 + i * 0.12);
      ctx.beginPath();
      ctx.moveTo(spx, y + h * 0.4);
      ctx.lineTo(spx + w * 0.05, y + h * 0.28);
      ctx.lineTo(spx + w * 0.1, y + h * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    // cabeça
    var hx = x + w * 0.74, hy = y + h * (ducking ? 0.5 : 0.36);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(hx, hy, w * 0.2, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // focinho
    ctx.beginPath();
    ctx.ellipse(hx + w * 0.14, hy + h * 0.04, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // olho
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx + w * 0.06, hy - h * 0.03, Math.max(2, w * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20415c';
    ctx.beginPath();
    ctx.arc(hx + w * 0.08, hy - h * 0.03, Math.max(1, w * 0.022), 0, Math.PI * 2);
    ctx.fill();
    // bracinho
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(3, w * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.66, y + h * 0.6);
    ctx.lineTo(x + w * 0.74, y + h * 0.68);
    ctx.stroke();
    ctx.restore();
  }

  /** Coloca no grupo um obstáculo desenhado (cacto/pedra no chão; pássaro no alto). */
  function spawnObstacle(group, ctx, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var type = opts.type || 'cactus';
    if (type === 'random' || type === 'surpresa') {
      var r = Math.random();
      type = r < 0.45 ? 'cactus' : (r < 0.8 ? 'rock' : 'bird');
    }
    var size = (typeof opts.size === 'number' && opts.size > 0) ? opts.size : 44;
    var gy = dinoGround(ctx);
    var w, h, y;
    if (type === 'bird') { w = Math.round(size * 1.3); h = Math.round(size * 0.8); y = gy - h - 46; }
    else if (type === 'rock') { w = size; h = Math.round(size * 0.72); y = gy - h; }
    else { type = 'cactus'; w = Math.round(size * 0.7); h = Math.round(size * 1.3); y = gy - h; }
    var s = createSprite({ x: opts.x, y: y, w: w, h: h, color: '#3f8f49', vx: opts.vx, vy: 0 });
    s.skin = { kind: 'obstacle', shape: type, flap: Math.random() * Math.PI * 2 };
    group.items.push(s);
    return s;
  }
  /** Desenha o obstáculo conforme a forma (cacto, pedra ou pássaro batendo asas). */
  function drawObstacleSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var x = sprite.x, y = sprite.y, w = sprite.w, h = sprite.h;
    ctx.save();
    if (sk.shape === 'rock') {
      ctx.fillStyle = '#8f7d70';
      ctx.strokeStyle = '#66564c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.06, y + h);
      ctx.lineTo(x + w * 0.2, y + h * 0.25);
      ctx.lineTo(x + w * 0.55, y + h * 0.05);
      ctx.lineTo(x + w * 0.85, y + h * 0.3);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (sk.shape === 'bird') {
      var flap = Math.sin(now() * 0.02 + (sk.flap || 0)) * (h * 0.35);
      ctx.fillStyle = '#5b6b8c';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + h * 0.55, w * 0.28, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // asas
      ctx.beginPath();
      ctx.moveTo(x + w * 0.45, y + h * 0.5);
      ctx.lineTo(x + w * 0.05, y + h * 0.5 - flap);
      ctx.lineTo(x + w * 0.42, y + h * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.55, y + h * 0.5);
      ctx.lineTo(x + w * 0.95, y + h * 0.5 - flap);
      ctx.lineTo(x + w * 0.58, y + h * 0.68);
      ctx.closePath();
      ctx.fill();
      // bico + olho
      ctx.fillStyle = '#ffb13b';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.74, y + h * 0.52);
      ctx.lineTo(x + w * 0.92, y + h * 0.56);
      ctx.lineTo(x + w * 0.74, y + h * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + w * 0.66, y + h * 0.48, Math.max(2, w * 0.05), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20415c';
      ctx.beginPath();
      ctx.arc(x + w * 0.67, y + h * 0.48, Math.max(1, w * 0.025), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // cacto
      ctx.fillStyle = '#24a05a';
      ctx.strokeStyle = '#157940';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x + w * 0.36, y, w * 0.28, h, w * 0.14) : ctx.rect(x + w * 0.36, y, w * 0.28, h);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y + h * 0.32, w * 0.3, h * 0.5, w * 0.14) : ctx.rect(x, y + h * 0.32, w * 0.3, h * 0.5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x + w * 0.66, y + h * 0.46, w * 0.3, h * 0.42, w * 0.14) : ctx.rect(x + w * 0.66, y + h * 0.46, w * 0.3, h * 0.42);
      ctx.fill();
      ctx.stroke();
      // florzinha no topo
      ctx.fillStyle = '#ff7aa8';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.04, Math.max(2, w * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Coloca no grupo um OVO (item de bônus para coletar). */
  function spawnEgg(group, opts) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    opts = opts || {};
    var s = createSprite({ x: opts.x, y: opts.y, w: 30, h: 38, color: '#fff3c4', vx: opts.vx, vy: 0 });
    s.skin = { kind: 'egg', bob: Math.random() * Math.PI * 2 };
    group.items.push(s);
    return s;
  }
  /** Desenha o ovo (casca clara com manchinhas e um brilho que pisca). */
  function drawEggSprite(ctx, sprite) {
    var sk = sprite.skin || {};
    var cx = sprite.x + sprite.w / 2, cy = sprite.y + sprite.h / 2;
    ctx.save();
    ctx.fillStyle = '#fff5c8';
    ctx.strokeStyle = '#e0b352';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sprite.w * 0.44, sprite.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8fd6ff';
    ctx.beginPath();
    ctx.arc(cx - sprite.w * 0.14, cy, sprite.w * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff93b5';
    ctx.beginPath();
    ctx.arc(cx + sprite.w * 0.12, cy + sprite.h * 0.12, sprite.w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    var shine = 0.4 + Math.sin(now() * 0.006 + (sk.bob || 0)) * 0.3;
    ctx.globalAlpha = Math.max(0.1, Math.min(0.9, shine));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - sprite.w * 0.1, cy - sprite.h * 0.2, sprite.w * 0.08, sprite.h * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Nuvenzinha fofa (usada pelo fundo de floresta).
  function drawCloud(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.arc(30, 9, 17, 0, Math.PI * 2);
    ctx.arc(48, 15, 12, 0, Math.PI * 2);
    ctx.arc(32, 20, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  var _forest = null;
  function ensureForest(ctx) {
    if (_forest) return _forest;
    var w = stageW(ctx), h = stageH(ctx);
    var clouds = [], hills = [];
    for (var i = 0; i < 5; i++) {
      clouds.push({ x: Math.random() * w, y: 20 + Math.random() * (h * 0.3), s: 0.2 + Math.random() * 0.35, scale: 0.7 + Math.random() * 0.7 });
    }
    for (var j = 0; j < 4; j++) {
      hills.push({ x: j * (w / 3), w: w * (0.42 + Math.random() * 0.3), h: h * (0.16 + Math.random() * 0.14) });
    }
    _forest = { clouds: clouds, hills: hills, gx: 0 };
    return _forest;
  }
  /**
   * Fundo de FLORESTA com parallax: céu, sol, nuvens (lentas), morros (médios) e
   * uma faixa de grama/chão que ROLA (rápida). Use no começo do "a cada quadro",
   * depois de limpar a tela. O dino corre sobre a grama (linha dinoGround).
   */
  function drawForest(ctx, speed) {
    if (!ctx || !ctx.canvas) return;
    var sp = (typeof speed === 'number') ? speed : 4;
    var w = stageW(ctx), h = stageH(ctx);
    var gy = dinoGround(ctx);
    ctx.save();
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8fe7ff');
    sky.addColorStop(0.55, '#c7fff2');
    sky.addColorStop(1, '#fff0b3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // sol
    ctx.fillStyle = '#ffe06b';
    ctx.beginPath();
    ctx.arc(w - 64, 58, 26, 0, Math.PI * 2);
    ctx.fill();
    var F = ensureForest(ctx);
    for (var i = 0; i < F.clouds.length; i++) {
      var c = F.clouds[i];
      drawCloud(ctx, c.x, c.y, c.scale);
      c.x -= c.s * sp;
      if (c.x < -90) { c.x = w + 30; c.y = 20 + Math.random() * (h * 0.3); }
    }
    for (var k = 0; k < F.hills.length; k++) {
      var hl = F.hills[k];
      ctx.fillStyle = (k % 2 === 0) ? '#91dc7a' : '#74cf77';
      ctx.beginPath();
      ctx.moveTo(hl.x, gy);
      ctx.quadraticCurveTo(hl.x + hl.w / 2, gy - hl.h, hl.x + hl.w, gy);
      ctx.closePath();
      ctx.fill();
      hl.x -= sp * 0.4;
      if (hl.x + hl.w < 0) hl.x = w;
    }
    // grama + chão
    var band = h - gy;
    ctx.fillStyle = '#75cc63';
    ctx.fillRect(0, gy, w, band);
    ctx.fillStyle = '#57b850';
    ctx.fillRect(0, gy, w, Math.max(4, band * 0.2));
    ctx.fillStyle = '#9d7346';
    ctx.fillRect(0, gy + band * 0.55, w, h - (gy + band * 0.55));
    // tracinhos do chão rolando (sensação de velocidade)
    F.gx = F.gx - sp;
    while (F.gx <= -40) F.gx += 40;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    for (var gx = F.gx; gx < w; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + band * 0.34);
      ctx.lineTo(gx + 16, gy + band * 0.34);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Som de pulo: blip curto subindo de tom. */
  function playJump() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      var t = ctx.currentTime;
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.12);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.14);
    } catch (e) {}
  }
  /** Som de dano: rosnado grave que decai. */
  function playDinoHurt() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      var t = ctx.currentTime;
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.3);
    } catch (e) {}
  }
  /** Som de coletar: duas notinhas alegres (ovo bônus). */
  function playCollect() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var t = ctx.currentTime;
      function note(freq, start, dur) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t + start);
        g.gain.exponentialRampToValueAtTime(0.12, t + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + start); o.stop(t + start + dur);
      }
      note(660, 0, 0.12);
      note(990, 0.09, 0.16);
    } catch (e) {}
  }

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
  var _logicalW = 0, _logicalH = 0, _resizeHooked = false;
  // Tamanho LÓGICO do palco (coordenadas do jogo). Sem fitScreen, é o tamanho do
  // próprio canvas; com fitScreen, fica FIXO enquanto o canvas REAL cresce para a
  // resolução da tela (nitidez) — os helpers usam o lógico para não dependerem disso.
  function stageW(ctx) { return _logicalW || (ctx && ctx.canvas ? ctx.canvas.width : 0); }
  function stageH(ctx) { return _logicalH || (ctx && ctx.canvas ? ctx.canvas.height : 0); }
  function _applyBaseTransform() {
    if (!_stageCtx || !_logicalW || !_stageCanvas) return;
    try { _stageCtx.setTransform(_stageCanvas.width / _logicalW, 0, 0, _stageCanvas.height / _logicalH, 0, 0); } catch (e) {}
  }
  function _resizeBacking() {
    var c = _stageCanvas;
    if (!c || !_logicalW || !c.getBoundingClientRect) return;
    var rect = c.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var dpr = window.devicePixelRatio || 1;
    var bw = Math.max(1, Math.round(rect.width * dpr));
    var bh = Math.max(1, Math.round(rect.height * dpr));
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    _applyBaseTransform();
  }
  /** Limpa a tela inteira do palco (use no começo de cada quadro). */
  function clear() {
    var c = ensureStage();
    if (!c || !c.canvas) return;
    if (_logicalW) {
      try { c.setTransform(1, 0, 0, 1, 0, 0); } catch (e) {}
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      _applyBaseTransform();
    } else {
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    }
  }
  /**
   * Faz o canvas PREENCHER ~percent% da janela, MANTENDO a proporção do jogo. A
   * resolução interna (coordenadas do jogo) NÃO muda — só o tamanho de exibição
   * (CSS), então todos os desenhos escalam juntos e o navegador re-encaixa sozinho
   * ao redimensionar a janela. Sem distorção: numa tela de formato diferente do
   * jogo, sobra um espaço escuro nas laterais (ou em cima/baixo). Chame uma vez no
   * começo do programa. width = min(P vw, P*proporção vh) garante caber nos dois
   * eixos; box-sizing inclui a borda p/ não criar barra de rolagem.
   */
  function fitScreen(percent) {
    ensureStage();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (!c) return;
    if (!_logicalW) { _logicalW = c.width || 4; _logicalH = c.height || 3; }
    var p = (typeof percent === 'number' && percent > 0 && percent <= 100) ? percent : 100;
    var ar = _logicalW / _logicalH;
    c.style.width = 'min(' + p + 'vw, ' + (p * ar) + 'vh)';
    c.style.height = 'auto';
    c.style.aspectRatio = _logicalW + ' / ' + _logicalH;
    c.style.maxWidth = '100%';
    c.style.boxSizing = 'border-box';
    c.style.display = 'block';
    _resizeBacking();
    try { requestAnimationFrame(_resizeBacking); } catch (e) {}
    if (!_resizeHooked) {
      _resizeHooked = true;
      try { window.addEventListener('resize', function () { try { requestAnimationFrame(_resizeBacking); } catch (e) { _resizeBacking(); } }); } catch (e) {}
    }
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
    fitScreen: fitScreen,
    spawnBullet: spawnBullet,
    arrowsX: arrowsX,
    blink: blink,
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
    tileAt: tileAt,
    // Grupos de sprites + temporizadores (v0.6.0).
    createGroup: createGroup,
    spawn: spawn,
    updateGroup: updateGroup,
    drawGroup: drawGroup,
    forEachInGroup: forEachInGroup,
    countGroup: countGroup,
    clearGroup: clearGroup,
    removeFromGroup: removeFromGroup,
    pruneOffscreen: pruneOffscreen,
    overlapGroups: overlapGroups,
    everyFrames: everyFrames,
    everySeconds: everySeconds,
    // HUD + estado/cenas (v0.6.0).
    drawScore: drawScore,
    drawLabel: drawLabel,
    drawHearts: drawHearts,
    drawBar: drawBar,
    setScene: setScene,
    getScene: getScene,
    sceneIs: sceneIs,
    showScreen: showScreen,
    restart: restart,
    drawStarfield: drawStarfield,
    dragX: dragX,
    // Kit Nave & Asteroides (v0.7.0).
    createShip: createShip,
    spawnAsteroid: spawnAsteroid,
    explodeSprite: explodeSprite,
    playShoot: playShoot,
    playExplosion: playExplosion,
    overlapSpriteGroup: overlapSpriteGroup,
    // Pulo genérico + Kit dino (v0.9.0).
    jumpOnGround: jumpOnGround,
    createDino: createDino,
    controlDino: controlDino,
    spawnObstacle: spawnObstacle,
    spawnEgg: spawnEgg,
    drawForest: drawForest,
    playJump: playJump,
    playDinoHurt: playDinoHurt,
    playCollect: playCollect
  };
})();`
