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
   * Escala física do ctx do palco: com fitScreen o backing store cresce além do
   * tamanho lógico (devicePixelRatio), então o upscale REAL é maior do que w/h
   * sugerem. Fora do palco (canvas do aluno) a escala é 1.
   */
  function _deviceScale(ctx) {
    if (ctx && ctx === _stageCtx && _logicalW && _stageCanvas && _stageCanvas.width) {
      return _stageCanvas.width / _logicalW;
    }
    return 1;
  }

  /**
   * Desenha com nitidez de pixel art quando AMPLIA (nearest, sem o borrão
   * bilinear do navegador) e suave quando REDUZ (vetor/foto não serrilham).
   * Sempre restaura o smoothing: setupStage/_resizeBacking reatribuem c.width
   * (que reseta o estado do ctx), então o ajuste é POR DESENHO, nunca global.
   * Devolve false se o desenho lançou (o chamador cai no placeholder).
   */
  function _crispDraw(ctx, srcW, dw, draw) {
    var prev = true, ok = true;
    try { prev = ctx.imageSmoothingEnabled; } catch (e) {}
    try {
      if (typeof srcW === 'number' && srcW > 0 && dw * _deviceScale(ctx) >= srcW) {
        ctx.imageSmoothingEnabled = false;
      }
    } catch (e) {}
    try { draw(); } catch (e) { ok = false; }
    try { ctx.imageSmoothingEnabled = prev; } catch (e) {}
    return ok;
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
    _crispDraw(ctx, fw, dw, function () { ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh); });
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
    var op = (typeof sprite.opacity === 'number') ? sprite.opacity : 1;
    if (sprite.blinkFrames > 0) {
      sprite.blinkFrames--;
      // Fase "apagada" do piscar: meia transparência por cima da opacidade atual.
      if (Math.floor(sprite.blinkFrames / 6) % 2 === 0) op = op * 0.35;
    }
    if (op >= 1) { _drawSpriteRaw(ctx, sprite); return; }
    var pa = ctx.globalAlpha;
    ctx.globalAlpha = Math.max(0, op);
    _drawSpriteRaw(ctx, sprite);
    ctx.globalAlpha = pa;
  }
  function _drawSpriteRaw(ctx, sprite) {
    if (!ctx || !sprite) return;
    var ang = (typeof sprite.angle === 'number') ? sprite.angle : 0;
    var flip = sprite.facing === -1;
    if (!ang && !flip) { _drawSpriteBody(ctx, sprite); return; }
    // Gira/espelha o desenho em torno do CENTRO do sprite (o corpo segue em
    // coordenadas absolutas — mesmo truque translate/rotate/translate da referência).
    var cx = sprite.x + (sprite.w || 0) / 2, cy = sprite.y + (sprite.h || 0) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (ang) ctx.rotate(ang);
    if (flip) ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
    _drawSpriteBody(ctx, sprite);
    ctx.restore();
  }
  function _drawSpriteBody(ctx, sprite) {
    if (!ctx || !sprite) return;
    // Desenhos prontos (skins): nave, asteroide e tiro têm forma própria.
    if (sprite.skin) {
      if (sprite.skin.kind === 'ship') { drawShip(ctx, sprite); return; }
      if (sprite.skin.kind === 'asteroid') { drawAsteroidSprite(ctx, sprite); return; }
      if (sprite.skin.kind === 'bullet') { drawBullet(ctx, sprite); return; }
      if (sprite.skin.kind === 'dino') { drawDino(ctx, sprite); return; }
      if (sprite.skin.kind === 'obstacle') { drawObstacleSprite(ctx, sprite); return; }
      if (sprite.skin.kind === 'egg') { drawEggSprite(ctx, sprite); return; }
      if (sprite.skin.kind === 'gorilla') { drawGorilla(ctx, sprite); return; }
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
      var fimg = sprite.image.img;
      var okDraw = _crispDraw(ctx, fimg.naturalWidth || sprite.w, sprite.w, function () {
        ctx.drawImage(fimg, sprite.x, sprite.y, sprite.w, sprite.h);
      });
      if (okDraw) return;
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
          try { ctx.clearRect(sprite.x, sprite.y, sprite.w, sprite.h); } catch (e) {}
          _crispDraw(ctx, fixed.img.naturalWidth || sprite.w, sprite.w, function () {
            ctx.drawImage(fixed.img, sprite.x, sprite.y, sprite.w, sprite.h);
          });
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
      // "Pausar o jogo" CONGELA o jogo: não roda o quadro do aluno (movimento,
      // spawn, física, desenho). A última tela fica parada. Para mostrar "Você
      // ganhou/perdeu", desenhe a tela ANTES de "Pausar o jogo" — ela fica
      // congelada por cima. "Continuar o jogo" descongela.
      if (!_paused) {
        _particlesDrawnThisFrame = false;
        try { fn(); } catch (e) { console.error(e && e.message ? e.message : e); }
        // As partículas (explosões) se desenham sozinhas no FIM do quadro do aluno,
        // com a câmera — a menos que ele já tenha usado "atualizar e desenhar as
        // partículas". Sem isto, "soltar explosão" emite mas nada aparece na tela.
        if (!_particlesDrawnThisFrame && particles.length) {
          try { _camWrap(drawParticles)(ensureStage()); } catch (e) {}
        }
      }
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

  // Um tom com varredura de frequência opcional (slide 'exp'|'linear'|'none').
  function _fxBeep(type, fromHz, toHz, durSec, slide, peak) {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      var t = ctx.currentTime;
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(fromHz, t);
      if (toHz !== fromHz && slide && slide !== 'none') {
        if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), t + durSec);
        else osc.frequency.linearRampToValueAtTime(toHz, t + durSec);
      }
      var pk = (typeof peak === 'number') ? peak : 0.1;
      gain.gain.setValueAtTime(pk, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + durSec);
    } catch (e) {}
  }
  // Uma sequência de notas: cada nota é [freqHz, inícioSeg, duraçãoSeg].
  function _fxSeq(type, notes, peak) {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var t0 = ctx.currentTime;
      var pk = (typeof peak === 'number') ? peak : 0.1;
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.value = n[0];
        gain.gain.setValueAtTime(0.0001, t0 + n[1]);
        gain.gain.exponentialRampToValueAtTime(pk, t0 + n[1] + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t0 + n[1]); osc.stop(t0 + n[1] + n[2]);
      }
    } catch (e) {}
  }
  /**
   * Toca um efeito sonoro PRONTO pelo nome (sintetizado, sem arquivo). Reusa os
   * sons dos Kits quando combinam e tem receitas próprias para os demais.
   */
  function playFx(name) {
    switch (name) {
      case 'coin': _fxSeq('square', [[988, 0, 0.08], [1319, 0.07, 0.14]], 0.08); return;
      case 'gem': _fxSeq('triangle', [[1047, 0, 0.09], [1568, 0.08, 0.16]], 0.09); return;
      case 'heal': _fxSeq('sine', [[660, 0, 0.12], [880, 0.1, 0.2]], 0.1); return;
      case 'powerup': _fxBeep('square', 300, 1200, 0.35, 'exp', 0.09); return;
      case 'levelup': _fxSeq('square', [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.22]], 0.08); return;
      case 'collect': playCollect(); return;
      case 'laser': _fxBeep('square', 1200, 300, 0.12, 'exp', 0.07); return;
      case 'shoot': playShoot(); return;
      case 'explosion': playExplosion(); return;
      case 'hit': _fxBeep('square', 300, 90, 0.1, 'exp', 0.12); return;
      case 'hurt': playDinoHurt(); return;
      case 'punch': _fxBeep('sawtooth', 200, 60, 0.12, 'exp', 0.14); return;
      case 'jump': playJump(); return;
      case 'land': _fxBeep('sine', 220, 80, 0.12, 'exp', 0.12); return;
      case 'whoosh': _fxBeep('sine', 200, 900, 0.18, 'linear', 0.05); return;
      case 'step': _fxBeep('square', 150, 110, 0.05, 'exp', 0.06); return;
      case 'bounce': _fxBeep('sine', 400, 720, 0.08, 'linear', 0.1); return;
      case 'whistle': playWhistle(); return;
      case 'win': _fxSeq('square', [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.3]], 0.08); return;
      case 'gameover': _fxSeq('sawtooth', [[440, 0, 0.18], [349, 0.18, 0.18], [262, 0.36, 0.42]], 0.12); return;
      case 'start': _fxSeq('square', [[523, 0, 0.1], [784, 0.1, 0.2]], 0.08); return;
      case 'alarm': _fxSeq('square', [[880, 0, 0.12], [660, 0.14, 0.12], [880, 0.28, 0.12], [660, 0.42, 0.12]], 0.08); return;
      case 'click': _fxBeep('square', 800, 800, 0.04, 'none', 0.05); return;
      case 'confirm': _fxSeq('sine', [[660, 0, 0.08], [990, 0.07, 0.12]], 0.08); return;
      case 'error': _fxSeq('square', [[200, 0, 0.12], [160, 0.13, 0.2]], 0.1); return;
      case 'select': _fxBeep('triangle', 520, 720, 0.06, 'linear', 0.06); return;
      case 'blip': _fxBeep('square', 1000, 1000, 0.05, 'none', 0.05); return;
      default: _fxBeep('square', 880, 1320, 0.18, 'exp', 0.08); return;
    }
  }

  // ---- Música de fundo: uma melodia curta sintetizada que toca em loop ----
  // Só UMA música por vez: chamar de novo para a anterior antes de começar.
  var _musicTimer = null;
  var _musicStop = false;
  var MUSIC_TUNES = {
    adventure: { wave: 'square', step: 200, notes: [262, 330, 392, 330, 440, 392, 330, 262] },
    happy: { wave: 'triangle', step: 180, notes: [523, 587, 659, 784, 659, 587, 523, 587] },
    tense: { wave: 'sawtooth', step: 160, notes: [220, 233, 220, 207, 220, 247, 220, 196] },
    calm: { wave: 'sine', step: 320, notes: [392, 440, 523, 440, 392, 349, 392, 0] },
    victory: { wave: 'square', step: 200, notes: [523, 523, 523, 659, 784, 0, 784, 1047] }
  };
  function playMusic(name) {
    stopMusic();
    var tune = MUSIC_TUNES[name] || MUSIC_TUNES.adventure;
    var step = (typeof tune.step === 'number' && tune.step > 0) ? tune.step : 200;
    var i = 0;
    _musicStop = false;
    function next() {
      if (_musicStop) return;
      var f = tune.notes[i % tune.notes.length];
      if (f > 0) _fxBeep(tune.wave, f, f, step / 1000 * 0.9, 'none', 0.05);
      i++;
      _musicTimer = setTimeout(next, step);
    }
    next();
  }
  function stopMusic() {
    _musicStop = true;
    if (_musicTimer) { clearTimeout(_musicTimer); _musicTimer = null; }
  }

  // ---- Notas musicais por nome (dó ré mi…) → frequência ----
  var NOTE_FREQS = { C: 262, D: 294, E: 330, F: 349, G: 392, A: 440, B: 494, C5: 523 };
  function playNote(note, ms) {
    var f = NOTE_FREQS[note];
    playSound(typeof f === 'number' ? f : 440, ms);
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
    // Grava a velocidade horizontal p/ os getters (vx/velocidade/está se movendo) —
    // o vy já é real (gravidade/pulo abaixo).
    sprite.vx = (keys.right ? s : 0) - (keys.left ? s : 0);
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
    // Grava a velocidade (o passo real deste quadro) p/ os getters de velocidade;
    // parado → 0 → "está se movendo?" falso.
    sprite.vx = dx * s;
    sprite.vy = dy * s;
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
    if (dist > s) {
      // Grava a velocidade (o passo dado) p/ os getters; ao chegar no ponteiro, para (0).
      sprite.vx = (dx / dist) * s; sprite.vy = (dy / dist) * s;
      sprite.x += sprite.vx; sprite.y += sprite.vy;
    }
    else { sprite.vx = 0; sprite.vy = 0; sprite.x = pointer.x - sprite.w / 2; sprite.y = pointer.y - sprite.h / 2; }
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

  // ---- Nave clássica: girar + impulsionar na direção apontada (v0.10.0) ----
  // Ângulo do sprite em RADIANOS; 0 = apontando pra cima; positivo = horário.
  // "Pra frente" = (sin a, -cos a). Os blocos falam em GRAUS; convertemos aqui.
  var DEG = Math.PI / 180;
  function _ensureAngle(s) { if (typeof s.angle !== 'number') s.angle = 0; return s.angle; }
  function _forward(s) {
    var a = (typeof s.angle === 'number') ? s.angle : 0;
    return { x: Math.sin(a), y: -Math.cos(a) };
  }
  /** Gira o sprite em N GRAUS (positivo = horário; negativo = anti-horário). */
  function rotateSprite(s, deg) {
    if (!s) return;
    _ensureAngle(s);
    s.angle += (typeof deg === 'number' ? deg : 0) * DEG;
  }
  /** Aponta o sprite para um ângulo em GRAUS (0 = pra cima, horário). */
  function pointSprite(s, deg) {
    if (!s) return;
    s.angle = (typeof deg === 'number' ? deg : 0) * DEG;
  }
  /** Soma força à velocidade na direção apontada (impulso pra frente). */
  function thrust(s, force) {
    if (!s) return;
    var f = (typeof force === 'number') ? force : 0.1;
    var d = _forward(s);
    s.vx = (s.vx || 0) + d.x * f;
    s.vy = (s.vy || 0) + d.y * f;
  }
  /** Freia o sprite aos poucos: multiplica a velocidade pelo fator (0..1). */
  function applyFriction(s, factor) {
    if (!s) return;
    var k = (typeof factor === 'number') ? factor : 0.97;
    s.vx = (s.vx || 0) * k;
    s.vy = (s.vy || 0) * k;
  }
  /**
   * Controle estilo NAVE (asteroids): vira com esquerda/A e direita/D, acelera
   * com cima/W na direção apontada e desliza com atrito ao soltar. Integra a
   * posição (move o sprite pela velocidade). Use a cada quadro.
   */
  function steerThrust(sprite, speed, turnDeg) {
    if (!sprite) return;
    _ensureAngle(sprite);
    var sp = (typeof speed === 'number') ? speed : 3;
    var turn = (typeof turnDeg === 'number') ? turnDeg : 3;
    if (keys.left) sprite.angle -= turn * DEG;
    if (keys.right) sprite.angle += turn * DEG;
    var d = _forward(sprite);
    if (keys.up) { sprite.vx = d.x * sp; sprite.vy = d.y * sp; }
    else { sprite.vx = (sprite.vx || 0) * 0.97; sprite.vy = (sprite.vy || 0) * 0.97; }
    sprite.x += sprite.vx || 0;
    sprite.y += sprite.vy || 0;
  }
  /** Devolve a direção (em GRAUS) que o sprite está apontando. */
  function spriteAngleDeg(s) {
    if (!s || typeof s.angle !== 'number') return 0;
    return s.angle / DEG;
  }
  /**
   * Atira do sprite PARA A FRENTE: cria um tiro na ponta do sprite, com
   * velocidade na direção apontada. Reusa o tiro brilhante (spawnBullet).
   */
  function shootFrom(sprite, group, opts) {
    if (!sprite || !group) return null;
    opts = opts || {};
    var speed = (typeof opts.speed === 'number') ? opts.speed : 6;
    var d = _forward(sprite);
    var cx = sprite.x + (sprite.w || 0) / 2, cy = sprite.y + (sprite.h || 0) / 2;
    var nose = Math.max(sprite.w || 0, sprite.h || 0) / 2 + 4;
    return spawnBullet(group, {
      x: cx + d.x * nose, y: cy + d.y * nose,
      radius: opts.radius, color: opts.color,
      vx: d.x * speed, vy: d.y * speed
    });
  }
  /**
   * Solta um asteroide vindo de uma BORDA aleatória da tela, rumo ao centro.
   * Sorteia um dos 4 lados, nasce logo fora dele e ganha velocidade pra dentro.
   * Reusa o asteroide desenhado (spawnAsteroid).
   */
  function spawnAsteroidFromEdge(group, opts) {
    if (!group) return null;
    opts = opts || {};
    var ctx = ensureStage();
    var W = stageW(ctx) || 360;
    var H = stageH(ctx) || 360;
    var speed = (typeof opts.speed === 'number') ? opts.speed : 1.5;
    var base = (typeof opts.size === 'number' && opts.size > 0) ? opts.size : 40;
    var m = base;
    var side = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    if (side === 0) { x = -m; y = Math.random() * H; vx = speed; vy = 0; }
    else if (side === 1) { x = Math.random() * W; y = H + m; vx = 0; vy = -speed; }
    else if (side === 2) { x = W + m; y = Math.random() * H; vx = -speed; vy = 0; }
    else { x = Math.random() * W; y = -m; vx = 0; vy = speed; }
    return spawnAsteroid(group, { x: x, y: y, size: base, color: opts.color, vx: vx, vy: vy });
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
  // Marca se o aluno já desenhou as partículas NESTE quadro (bloco "atualizar e
  // desenhar as partículas"). Se NÃO, o gameLoop as desenha sozinho no fim do
  // quadro — assim "soltar explosão" funciona sem precisar de bloco extra. Ver tick().
  var _particlesDrawnThisFrame = false;
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
    _particlesDrawnThisFrame = true;
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
    // tile = tamanho do tile NA ARTE (para fatiar o tileset). O tamanho NA TELA
    // (draw) é calculado no desenho: o mapa ENCAIXA no canvas (a arte é ampliada
    // com nitidez pelo drawFrame). Assim um tile de 16px não fica minúsculo.
    var t = (typeof opts.tile === 'number' && opts.tile > 0) ? opts.tile : 32;
    return {
      tileset: loadSpriteSheet(opts.image, t, t),
      tile: t,
      draw: 0,
      rows: parseGrid(opts.grid),
      solid: parseSolidList(opts.solid),
      ox: 0,
      oy: 0
    };
  }
  /** Nº de colunas do mapa (maior linha). */
  function tileMapCols(map) {
    var cols = 0;
    if (map && map.rows) for (var i = 0; i < map.rows.length; i++) {
      if (map.rows[i].length > cols) cols = map.rows[i].length;
    }
    return cols;
  }
  /** Tamanho do tile NA TELA (o efetivo do último desenho; cai no da arte se não desenhou). */
  function tileScreenSize(map) {
    return (map && map.draw > 0) ? map.draw : (map ? map.tile : 0);
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
    var t = tileScreenSize(map);
    var col = Math.floor((px - (map.ox || 0)) / t);
    var row = Math.floor((py - (map.oy || 0)) / t);
    if (row < 0 || row >= map.rows.length) return -1;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return -1;
    return r[col];
  }
  /**
   * Desenha o tilemap ENCAIXANDO no canvas: calcula o maior tile QUADRADO que faz o
   * mapa inteiro caber (sem distorcer) e centraliza. A arte (map.tile) é ampliada com
   * nitidez. x/y deslocam por cima (ex.: câmera) — mapa maior que a tela rola com ela.
   */
  function drawTileMap(ctx, map, x, y) {
    if (!ctx || !map || !map.rows) return;
    var rowsN = map.rows.length;
    var cols = tileMapCols(map);
    if (cols === 0 || rowsN === 0) return;
    var cw = (ctx.canvas && ctx.canvas.width) || 0;
    var ch = (ctx.canvas && ctx.canvas.height) || 0;
    var hasCanvas = cw > 0 && ch > 0;
    var cell = hasCanvas ? Math.max(1, Math.floor(Math.min(cw / cols, ch / rowsN))) : map.tile;
    map.draw = cell;
    // Sem tamanho de canvas (contexto atípico): não encaixa nem centraliza (fica em x/y).
    var ox = (x || 0) + (hasCanvas ? Math.floor((cw - cols * cell) / 2) : 0);
    var oy = (y || 0) + (hasCanvas ? Math.floor((ch - rowsN * cell) / 2) : 0);
    map.ox = ox;
    map.oy = oy;
    for (var r = 0; r < rowsN; r++) {
      var row = map.rows[r];
      for (var c = 0; c < row.length; c++) {
        var idx = row[c];
        if (idx < 0) continue;
        drawFrame(ctx, map.tileset, idx, ox + c * cell, oy + r * cell, cell, cell);
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
    var t = tileScreenSize(map), ox = map.ox || 0, oy = map.oy || 0;
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
    // Grava a velocidade horizontal p/ os getters (parado → 0); só mexe no eixo X.
    sprite.vx = (keys.right ? sp : 0) - (keys.left ? sp : 0);
    sprite.vy = 0;
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

  // ---- Kit gorilas: batalha de bananas (artilharia) ----
  // Dois gorilas no alto de prédios jogam bananas um no outro. O vento e a
  // gravidade entortam a parábola; a banana abre crateras nos prédios. É por
  // turnos. Estado interno: a banana ativa (_banana) e a mira atual (_aim).
  var GORILLA_GRAV = 0.32;   // gravidade da banana (px por quadro²)
  var GORILLA_K = 0.16;      // arrasto (px) -> velocidade (px por quadro)
  var GORILLA_MAXV = 26;     // velocidade máxima de arremesso
  var GORILLA_WIND = 0.06;   // vento máximo (px por quadro²) somado ao vx
  var BANANA_BLAST = 26;     // raio da cratera
  var _banana = null;
  var _aim = { dragging: false, power: 0, angle: 0, vx: 0, vy: 0, released: false };

  // Mão do gorila: de onde a banana sai e a seta de mira começa (topo, centro).
  function _throwerHand(s) {
    return { x: s.x + (s.w || 0) / 2, y: s.y + 2 };
  }

  /** Cria a cidade: uma fileira de prédios (com janelas) ocupando a tela. */
  function createCity() {
    var ctx = ensureStage();
    var W = stageW(ctx) || 480, H = stageH(ctx) || 270;
    var buildings = [];
    var palette = ['#3b3a5a', '#454168', '#2f3350', '#544b74', '#3a4a6b'];
    var x = 0, bi = 0;
    while (x < W) {
      var bw = 38 + Math.floor(Math.random() * 34);
      if (x + bw > W) bw = W - x;
      // Prédios das pontas mais baixos (cabem os gorilas e dá pra mirar por cima).
      var edge = x < W * 0.22 || x > W * 0.74;
      var minh = H * 0.28;
      var maxh = edge ? H * 0.45 : H * 0.8;
      var bh = Math.round(minh + Math.random() * (maxh - minh));
      var lights = [];
      for (var L = 0; L < 60; L++) lights.push(Math.random() < 0.34);
      buildings.push({ x: x, w: bw, h: bh, color: palette[bi % palette.length], lights: lights });
      x += bw;
      bi++;
    }
    return { buildings: buildings, holes: [], wind: 0, W: W, H: H };
  }

  /** Desenha a cidade: céu + lua + prédios com janelas, com as crateras furadas. */
  function drawCity(ctx, city) {
    if (!ctx || !city) return;
    var W = city.W, H = city.H;
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1b2a4a');
    sky.addColorStop(1, '#5a3b6b');
    ctx.save();
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(W - 60, 52, 22, 0, Math.PI * 2);
    ctx.fill();
    // Recorta as crateras: tudo MENOS os círculos. Assim os prédios não
    // aparecem dentro dos buracos (mostra o céu) — igual ao jogo clássico.
    for (var k = 0; k < city.holes.length; k++) {
      var ho = city.holes[k];
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(ho.x, ho.y, ho.r, 0, Math.PI * 2, true);
      ctx.clip();
    }
    for (var i = 0; i < city.buildings.length; i++) {
      var b = city.buildings[i];
      var top = H - b.h;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, top, b.w, b.h);
      var gap = 10, ww = 7, wh = 9;
      var cols = Math.floor((b.w - gap) / (ww + gap));
      var rows = Math.floor((b.h - gap) / (wh + gap));
      var li = 0;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          ctx.fillStyle = b.lights[li % b.lights.length] ? '#ffd97a' : '#20203a';
          ctx.fillRect(b.x + gap + c * (ww + gap), top + gap + r * (wh + gap), ww, wh);
          li++;
        }
      }
    }
    ctx.restore();
  }

  /** Põe um gorila no alto de um prédio perto da ponta (lado 'left'/'right'). */
  function placeThrower(city, opts) {
    opts = opts || {};
    if (!city || !city.buildings.length) return createSprite(opts);
    var side = opts.side === 'right' ? 'right' : 'left';
    var idx = side === 'left'
      ? Math.min(1, city.buildings.length - 1)
      : Math.max(0, city.buildings.length - 2);
    var b = city.buildings[idx];
    var w = 30, h = 36;
    var top = city.H - b.h;
    var s = createSprite({ x: b.x + b.w / 2 - w / 2, y: top - h, w: w, h: h, color: opts.color });
    s.skin = { kind: 'gorilla', color: opts.color || '#6b4a2b', side: side };
    return s;
  }

  /** Desenha um gorila (braços levantados prontos pra lançar + carinha). */
  function drawGorilla(ctx, sprite) {
    var sk = sprite.skin || {};
    var x = sprite.x, y = sprite.y, w = sprite.w, h = sprite.h;
    var col = sk.color || '#6b4a2b';
    var dark = '#4a3220';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 1, w * 0.5, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(5, w * 0.22);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.lineTo(x + w * 0.12, y + h * 0.12);
    ctx.moveTo(x + w * 0.7, y + h * 0.5);
    ctx.lineTo(x + w * 0.88, y + h * 0.12);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.66, w * 0.42, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.32, w * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#caa884';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.37, w * 0.2, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    var er = Math.max(1.5, w * 0.05);
    ctx.beginPath();
    ctx.arc(x + w * 0.4, y + h * 0.31, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.6, y + h * 0.31, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Sorteia um novo vento para a cidade (entre -máx e +máx). */
  function newWind(city) {
    if (!city) return;
    city.wind = (Math.random() * 2 - 1) * GORILLA_WIND;
  }

  /** Desenha a seta do vento no topo (tamanho = força, lado = direção). */
  function drawWind(ctx, city) {
    if (!ctx || !city) return;
    var cx = city.W / 2, cy = 18;
    var len = city.wind * 600;
    if (len > 70) len = 70;
    if (len < -70) len = -70;
    ctx.save();
    ctx.strokeStyle = '#ffe06b';
    ctx.fillStyle = '#ffe06b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + len, cy);
    ctx.stroke();
    if (Math.abs(len) > 6) {
      var dir = len > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(cx + len, cy);
      ctx.lineTo(cx + len - dir * 8, cy - 5);
      ctx.lineTo(cx + len - dir * 8, cy + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('vento', cx, cy - 9);
    ctx.restore();
  }

  /**
   * Mira arrastando: enquanto segura o mouse/dedo, define força e ângulo a
   * partir do gorila (aponte para onde quer jogar; longe = mais forte) e
   * desenha a trajetória prevista (linha pontilhada). Ao SOLTAR, congela a
   * mira e marca "soltou" por um quadro. Use a cada quadro no gorila da vez.
   */
  function aimDrag(ctx, thrower) {
    if (!ctx || !thrower) return;
    // Enquanto uma banana está voando, não dá pra mirar de novo (um tiro por vez).
    if (_banana) { _aim.dragging = false; return; }
    var hand = _throwerHand(thrower);
    if (pointer.down) {
      _aim.dragging = true;
      var dx = pointer.x - hand.x, dy = pointer.y - hand.y;
      var vx = dx * GORILLA_K, vy = dy * GORILLA_K;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > GORILLA_MAXV) { vx = vx / sp * GORILLA_MAXV; vy = vy / sp * GORILLA_MAXV; }
      _aim.vx = vx; _aim.vy = vy;
      _aim.power = Math.sqrt(vx * vx + vy * vy);
      _aim.angle = Math.atan2(vy, vx);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      var sx = hand.x, sy = hand.y, svx = vx, svy = vy;
      for (var i = 0; i < 26; i++) {
        svy = svy + GORILLA_GRAV;
        sx = sx + svx; sy = sy + svy;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    } else if (_aim.dragging) {
      _aim.dragging = false;
      _aim.released = true;
    }
  }

  /** Verdadeiro no quadro em que a criança SOLTA a mira (consome o evento). */
  function aimReleased(thrower) {
    if (_aim.released) { _aim.released = false; return true; }
    return false;
  }

  /** Lança a banana do gorila com a mira atual (vento e gravidade agem depois). */
  function throwBanana(thrower, city) {
    if (!thrower) return;
    _ai = null; // qualquer arremesso (humano ou robô) encerra o plano do robô.
    var hand = _throwerHand(thrower);
    _banana = { x: hand.x, y: hand.y, vx: _aim.vx, vy: _aim.vy, rot: 0, trail: [] };
  }

  // ---- Robô (IA): mira por simulação, "pensa" e joga sozinho. Sem ctx. ----
  var _ai = null;

  /**
   * Simula um arremesso (vx,vy) da mão do gorila e devolve a MENOR distância à
   * cabeça do inimigo ao longo do voo. Mesma física da banana (gravidade +
   * vento), sem desenhar nada — roda sem canvas (headless).
   */
  function _simulateThrow(start, vx, vy, city, enemy) {
    var x = start.x, y = start.y, wind = city ? (city.wind || 0) : 0;
    var ex = enemy.x + enemy.w / 2, ey = enemy.y + enemy.h / 2;
    var best = Infinity;
    var H = (city && city.H) ? city.H : 270, W = (city && city.W) ? city.W : 480;
    for (var i = 0; i < 600; i++) {
      vy = vy + GORILLA_GRAV;
      vx = vx + wind;
      x = x + vx; y = y + vy;
      var dx = x - ex, dy = y - ey;
      var d = dx * dx + dy * dy;
      if (d < best) best = d;
      if (y > H + 40 || x < -60 || x > W + 60) break;
    }
    return Math.sqrt(best);
  }

  /**
   * "Pensa": sorteia N tentativas (ângulo -10..90°, força variável), simula cada
   * uma e guarda a melhor (mais perto do inimigo). difficulty maior = mais
   * tentativas = mira melhor. Devolve { vx, vy, power, angle } ou null.
   */
  function _computeBestAim(thrower, city, enemy, difficulty) {
    var hand = _throwerHand(thrower);
    var dir = (enemy.x >= thrower.x) ? 1 : -1;
    var tries = 12 + Math.floor((difficulty || 1) * 8);
    if (tries > 220) tries = 220;
    var best = null, bestD = Infinity;
    for (var i = 0; i < tries; i++) {
      var angDeg = -10 + Math.random() * 100;
      var ang = angDeg * Math.PI / 180;
      var power = 6 + Math.random() * (GORILLA_MAXV - 6);
      var vx = Math.cos(ang) * power * dir;
      var vy = -Math.sin(ang) * power;
      var d = _simulateThrow(hand, vx, vy, city, enemy);
      if (d < bestD) {
        bestD = d;
        best = { vx: vx, vy: vy, power: power, angle: Math.atan2(vy, vx) };
      }
    }
    return best;
  }

  /**
   * Vez do robô (use no "a cada quadro", na vez dele): na 1ª chamada calcula a
   * melhor mira e começa a "pensar" (~0,8s); quando o relógio zera, joga a
   * banana sozinho. Espera a banana atual terminar (um tiro por vez).
   */
  function computerTurn(thrower, city, enemy) {
    if (!thrower || !city || !enemy) return;
    if (_banana) return;
    if (!_ai) {
      var best = _computeBestAim(thrower, city, enemy, (city.holes ? city.holes.length : 0) + 1);
      if (!best) return;
      _aim.vx = best.vx; _aim.vy = best.vy;
      _aim.power = best.power; _aim.angle = best.angle;
      _aim.dragging = false; _aim.released = false;
      _ai = { thinking: 48, aim: best };
      return;
    }
    if (_ai.thinking > 0) { _ai.thinking--; return; }
    _aim.vx = _ai.aim.vx; _aim.vy = _ai.aim.vy;
    throwBanana(thrower, city); // zera _ai
  }

  /** Mostra ângulo (graus) e força da mira atual no canto inferior esquerdo. */
  function drawAimReadout(ctx) {
    if (!ctx) return;
    var deg = Math.round(-_aim.angle * 180 / Math.PI);
    var pow = Math.round(_aim.power);
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('angulo ' + deg + ' / forca ' + pow, 12, stageH(ctx) - 12);
    ctx.restore();
  }

  /** Move a banana: gravidade + vento da cidade (use a cada quadro). */
  function updateBanana(city) {
    if (!_banana) return;
    var wind = city ? (city.wind || 0) : 0;
    _banana.vx += wind;
    _banana.vy += GORILLA_GRAV;
    _banana.x += _banana.vx;
    _banana.y += _banana.vy;
    _banana.rot += 0.25;
    _banana.trail.push({ x: _banana.x, y: _banana.y });
    if (_banana.trail.length > 12) _banana.trail.shift();
  }

  /** Desenha a banana voando (com rastro) — uma meia-lua amarela girando. */
  function drawBanana(ctx, city) {
    if (!ctx || !_banana) return;
    var b = _banana;
    ctx.save();
    for (var i = 0; i < b.trail.length; i++) {
      var t = b.trail[i];
      ctx.globalAlpha = (i + 1) / b.trail.length * 0.5;
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#caa400';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.quadraticCurveTo(0, 11, 7, -2);
    ctx.quadraticCurveTo(0, 3, -7, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** A banana acertou o gorila? (zera a banana no acerto). */
  function bananaHitThrower(city, thrower) {
    if (!_banana || !thrower) return false;
    var cx = thrower.x + thrower.w / 2, cy = thrower.y + thrower.h / 2;
    var dx = _banana.x - cx, dy = _banana.y - cy;
    var r = Math.max(thrower.w, thrower.h) / 2 + 4;
    if (dx * dx + dy * dy <= r * r) { _banana = null; return true; }
    return false;
  }

  /** A banana bateu num prédio (abre cratera) OU saiu da tela? (zera a banana). */
  function bananaHitCity(city) {
    if (!_banana || !city) return false;
    var b = _banana, W = city.W, H = city.H;
    for (var i = 0; i < city.buildings.length; i++) {
      var bd = city.buildings[i];
      var top = H - bd.h;
      if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= top) {
        var inHole = false;
        for (var k = 0; k < city.holes.length; k++) {
          var ho = city.holes[k];
          var hdx = b.x - ho.x, hdy = b.y - ho.y;
          if (hdx * hdx + hdy * hdy < ho.r * ho.r) { inHole = true; break; }
        }
        if (!inHole) {
          city.holes.push({ x: b.x, y: b.y, r: BANANA_BLAST });
          _banana = null;
          return true;
        }
      }
    }
    if (b.y > H + 20 || b.x < -40 || b.x > W + 40) { _banana = null; return true; }
    return false;
  }

  /** Som de banana caindo: assobio que desce de tom. */
  function playWhistle() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      var t = ctx.currentTime;
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.5);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.55);
    } catch (e) {}
  }
  /** Som de explosão da banana (reusa a explosão do kit nave). */
  function playBoom() { playExplosion(); }

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
    // Convenção do studio: a tela tem id "tela". Garante que o canvas criado pelo
    // facilitador (setupStage) seja achável por getElementById("tela") — senão o
    // bloco "pegar tela de desenho" devolve null.
    if (c && !c.id) c.id = 'tela';
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
  // Facilitador: prepara o palco em tela cheia (responsivo) num passo só. Define o
  // tamanho do "mundo" do jogo (w x h) e chama fitScreen para o canvas ocupar a
  // janela mantendo a proporção. É o bloco "preparar o jogo em tela cheia".
  function setupStage(w, h, bg) {
    ensureStage();
    var c = _stageCanvas;
    if (!c) { try { c = document.querySelector('canvas'); } catch (e) {} }
    if (c && typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0) {
      c.width = Math.round(w);
      c.height = Math.round(h);
      // Recongela o tamanho lógico no novo tamanho quando o fitScreen rodar.
      _logicalW = 0; _logicalH = 0;
    }
    // Cor de fundo escolhida no bloco: vai no canvas E no fundo da janela (a sobra
    // ao redor do canvas centralizado), para a tela inteira combinar com o jogo.
    var color = (typeof bg === 'string' && bg) ? bg : '#0b1020';
    if (c) c.style.background = color;
    if (document.body) {
      document.body.style.margin = '0';
      document.body.style.background = color;
      // Centraliza o canvas na janela: quando a proporção da TELA não bate com a
      // do jogo (ex.: jogo 800x480 numa janela 800x600), o espaço que sobra fica
      // igual dos dois lados, em vez de tudo num canto. O clique continua certo
      // porque o mapeamento do ponteiro usa getBoundingClientRect (posição real).
      document.body.style.minHeight = '100vh';
      document.body.style.display = 'flex';
      document.body.style.alignItems = 'center';
      document.body.style.justifyContent = 'center';
    }
    fitScreen(100);
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

  // ============================================================
  // Kit equilibrista (Stick Hero) — v0.13.0
  // Estica o bastão segurando o mouse/dedo, solta para derrubar e atravessar.
  // Lê o estado do ponteiro global (pointer.down) — sem listeners próprios.
  // ============================================================
  function shRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shGeneratePlatform(game) {
    var w = game.w;
    var minGap = Math.round(w * 0.10), maxGap = Math.round(w * 0.42);
    var minW = Math.round(w * 0.06), maxW = Math.round(w * 0.24);
    var last = game.platforms[game.platforms.length - 1];
    var furthest = last.x + last.w;
    var x = furthest + minGap + Math.floor(Math.random() * (maxGap - minGap));
    var pw = minW + Math.floor(Math.random() * (maxW - minW));
    game.platforms.push({ x: x, w: pw });
  }
  function shGenerateTree(game) {
    var last = game.trees[game.trees.length - 1];
    var furthest = last ? last.x : 0;
    var x = furthest + Math.round(game.w * 0.08) + Math.floor(Math.random() * Math.round(game.w * 0.30));
    var colors = ['#6D8821', '#8FAC34', '#98B333'];
    game.trees.push({ x: x, color: colors[Math.floor(Math.random() * 3)] });
  }
  function shReset(game) {
    game.phase = 'waiting';
    game.last = 0;
    game.sceneOffset = 0;
    game.score = 0;
    game.perfectFlash = 0;
    game.wasDown = false;
    var startW = Math.round(game.w * 0.13);
    game.platforms = [{ x: Math.round(game.w * 0.12), w: startW }];
    shGeneratePlatform(game); shGeneratePlatform(game);
    shGeneratePlatform(game); shGeneratePlatform(game);
    game.sticks = [{ x: game.platforms[0].x + game.platforms[0].w, length: 0, rotation: 0 }];
    game.trees = [];
    for (var i = 0; i < 12; i++) shGenerateTree(game);
    game.heroX = game.platforms[0].x + game.platforms[0].w - game.cfg.heroEdge;
    game.heroY = 0;
  }
  function shConfig(w, h) {
    return {
      heroW: Math.max(10, Math.round(w * 0.045)),
      heroH: Math.max(16, Math.round(h * 0.085)),
      platformH: Math.round(h * 0.30),
      heroEdge: Math.max(3, Math.round(w * 0.015)),
      perfect: Math.max(6, Math.round(w * 0.022)),
      stretch: w * 0.85,
      turn: 320,
      walk: w * 0.85,
      trans: w * 1.7,
      fall: h * 1.4
    };
  }
  function createStickHero(ctx) {
    if (!ctx || !ctx.canvas) return null;
    var w = ctx.canvas.width, h = ctx.canvas.height;
    var game = { ctx: ctx, w: w, h: h, cfg: shConfig(w, h), paddingX: Math.round(w * 0.27) };
    shReset(game);
    return game;
  }
  function shHitPlatform(game) {
    var st = game.sticks[game.sticks.length - 1];
    var far = st.x + st.length;
    var p = game.cfg.perfect;
    for (var i = 0; i < game.platforms.length; i++) {
      var pl = game.platforms[i];
      if (pl.x < far && far < pl.x + pl.w) {
        var mid = pl.x + pl.w / 2;
        var perfect = (mid - p / 2 < far) && (far < mid + p / 2);
        return { platform: pl, perfect: perfect };
      }
    }
    return { platform: null, perfect: false };
  }
  function updateStickHero(game) {
    if (!game) return;
    var cfg = game.cfg;
    var down = pointer.down;
    var pressed = down && !game.wasDown;
    var released = !down && game.wasDown;
    game.wasDown = down;
    if (pressed) {
      if (game.phase === 'waiting') { game.phase = 'stretching'; game.last = now(); }
      else if (game.phase === 'over') { shReset(game); }
    }
    if (released && game.phase === 'stretching') game.phase = 'turning';

    var t = now();
    var dt = game.last ? (t - game.last) / 1000 : 0;
    game.last = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;

    var st = game.sticks[game.sticks.length - 1];
    if (game.phase === 'stretching') {
      st.length += cfg.stretch * dt;
    } else if (game.phase === 'turning') {
      st.rotation += cfg.turn * dt;
      if (st.rotation >= 90) {
        st.rotation = 90;
        var hit = shHitPlatform(game);
        if (hit.platform) {
          game.score += hit.perfect ? 2 : 1;
          if (hit.perfect) game.perfectFlash = 1;
          shGeneratePlatform(game); shGenerateTree(game); shGenerateTree(game);
        }
        game.phase = 'walking';
      }
    } else if (game.phase === 'walking') {
      game.heroX += cfg.walk * dt;
      var hw = shHitPlatform(game);
      if (hw.platform) {
        var maxX = hw.platform.x + hw.platform.w - cfg.heroEdge;
        if (game.heroX > maxX) { game.heroX = maxX; game.phase = 'transitioning'; }
      } else {
        var maxX2 = st.x + st.length + cfg.heroW;
        if (game.heroX > maxX2) { game.heroX = maxX2; game.phase = 'falling'; }
      }
    } else if (game.phase === 'transitioning') {
      game.sceneOffset += cfg.trans * dt;
      var ht = shHitPlatform(game);
      if (ht.platform) {
        var goal = ht.platform.x + ht.platform.w - game.paddingX;
        if (game.sceneOffset > goal) {
          game.sceneOffset = goal;
          game.sticks.push({ x: ht.platform.x + ht.platform.w, length: 0, rotation: 0 });
          game.phase = 'waiting';
        }
      } else { game.phase = 'waiting'; }
    } else if (game.phase === 'falling') {
      if (st.rotation < 180) st.rotation += cfg.turn * dt;
      game.heroY += cfg.fall * dt;
      if (game.heroY > game.h) game.phase = 'over';
    }
    if (game.perfectFlash > 0) { game.perfectFlash -= dt * 0.6; if (game.perfectFlash < 0) game.perfectFlash = 0; }
    shDraw(game);
  }
  function shDrawHill(game, fromBottom, amp, color) {
    var ctx = game.ctx, w = game.w, h = game.h;
    var baseY = h - fromBottom;
    var off = game.sceneOffset * 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (var x = 0; x <= w; x += 14) ctx.lineTo(x, baseY - Math.sin((x + off) * 0.02) * amp);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  function shDrawBackground(game) {
    var ctx = game.ctx, w = game.w, h = game.h;
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#BBD691');
    sky.addColorStop(1, '#FEF1E1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    shDrawHill(game, h * 0.30, h * 0.05, '#95C629');
    shDrawHill(game, h * 0.22, h * 0.08, '#659F1C');
    var baseY = h - game.cfg.platformH - 2;
    for (var i = 0; i < game.trees.length; i++) {
      var tr = game.trees[i];
      var x = tr.x - game.sceneOffset * 0.2;
      if (x < -20 || x > w + 20) continue;
      ctx.fillStyle = '#7D833C';
      ctx.fillRect(x - 1, baseY - h * 0.04, 2, h * 0.04);
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.moveTo(x - h * 0.035, baseY - h * 0.04);
      ctx.lineTo(x, baseY - h * 0.14);
      ctx.lineTo(x + h * 0.035, baseY - h * 0.04);
      ctx.closePath();
      ctx.fill();
    }
  }
  function shDraw(game) {
    var ctx = game.ctx, cfg = game.cfg, w = game.w, h = game.h;
    var top = h - cfg.platformH;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    shDrawBackground(game);
    ctx.save();
    ctx.translate(-game.sceneOffset, 0);
    // platforms
    for (var i = 0; i < game.platforms.length; i++) {
      var pl = game.platforms[i];
      ctx.fillStyle = '#1b2330';
      ctx.fillRect(pl.x, top, pl.w, cfg.platformH);
      if (game.sticks[game.sticks.length - 1].x < pl.x) {
        ctx.fillStyle = '#e23b3b';
        ctx.fillRect(pl.x + pl.w / 2 - cfg.perfect / 2, top, cfg.perfect, cfg.perfect);
      }
    }
    // hero
    var hx = game.heroX - cfg.heroW / 2;
    var hy = top - cfg.heroH + game.heroY;
    ctx.fillStyle = '#1b2330';
    shRoundRect(ctx, hx, hy, cfg.heroW, cfg.heroH, Math.max(2, cfg.heroW * 0.25));
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hx + cfg.heroW * 0.72, hy + cfg.heroH * 0.28, Math.max(1.5, cfg.heroW * 0.13), 0, Math.PI * 2);
    ctx.fill();
    // sticks
    for (var k = 0; k < game.sticks.length; k++) {
      var s = game.sticks[k];
      ctx.save();
      ctx.translate(s.x, top);
      ctx.rotate((Math.PI / 180) * s.rotation);
      ctx.strokeStyle = '#1b2330';
      ctx.lineWidth = Math.max(2, w * 0.008);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s.length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // HUD
    ctx.fillStyle = '#1b2330';
    ctx.font = 'bold ' + Math.round(h * 0.10) + 'px Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(String(game.score), w - w * 0.04, h * 0.04);
    if (game.perfectFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, game.perfectFlash);
      ctx.fillStyle = '#e23b3b';
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(h * 0.06) + 'px Segoe UI, sans-serif';
      ctx.fillText('PERFEITO! +2', w / 2, h * 0.16);
      ctx.restore();
    }
    if (game.phase === 'waiting') {
      ctx.fillStyle = 'rgba(20,20,30,0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.round(h * 0.045) + 'px Segoe UI, sans-serif';
      ctx.fillText('Segure para esticar o bastão', w / 2, h * 0.45);
    } else if (game.phase === 'over') {
      ctx.fillStyle = 'rgba(20,20,30,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(h * 0.06) + 'px Segoe UI, sans-serif';
      ctx.fillText('Caiu! Toque para recomeçar', w / 2, h * 0.45);
    }
    ctx.restore();
  }
  function stickHeroScore(game) { return game ? game.score : 0; }
  function stickHeroOver(game) { return game ? game.phase === 'over' : false; }
  function restartStickHero(game) { if (game) shReset(game); }

  // ============================================================
  // Kit balão (Hot-Air-Balloon) — v0.13.0
  // Suba segurando o mouse/dedo, economize combustível e desvie das árvores.
  // ============================================================
  function blMakeTree(game, fromX) {
    var w = game.w;
    var gap = w * 0.45 + Math.random() * w * 1.1;
    var th = game.h * (0.16 + Math.random() * 0.22);
    var colors = ['#6D8821', '#8FAC34', '#98B333'];
    return { x: fromX + gap, th: th, color: colors[Math.floor(Math.random() * 3)] };
  }
  function blReset(game) {
    var w = game.w, h = game.h;
    game.over = false;
    game.vVel = 0;
    game.hVel = Math.max(2, w * 0.006);
    game.groundY = h * 0.82;
    game.by = game.groundY;
    game.dist = 0;
    game.meters = 0;
    game.fuel = 100;
    game.wasDown = false;
    game.last = 0;
    game.trees = [];
    var fromX = w;
    for (var i = 0; i < 6; i++) { var t = blMakeTree(game, fromX); game.trees.push(t); fromX = t.x; }
  }
  function createBalloon(ctx) {
    if (!ctx || !ctx.canvas) return null;
    var w = ctx.canvas.width, h = ctx.canvas.height;
    var game = { ctx: ctx, w: w, h: h };
    blReset(game);
    return game;
  }
  function blCircle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function updateBalloon(game) {
    if (!game) return;
    var w = game.w, h = game.h;
    var down = pointer.down;
    var pressed = down && !game.wasDown;
    game.wasDown = down;
    if (game.over) { if (pressed) blReset(game); blDraw(game); return; }
    var t = now();
    var dt = game.last ? (t - game.last) / 1000 : 0;
    game.last = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    var step = dt * 60;
    var heating = down && game.fuel > 0;
    var maxRise = h * 0.013, maxFall = h * 0.009;
    if (heating) {
      if (game.vVel > -maxRise) game.vVel -= h * 0.0011 * step;
      var altitude = (game.groundY - game.by) / game.groundY;
      game.fuel -= (0.06 + altitude * 0.10) * step;
      if (game.fuel < 0) game.fuel = 0;
    } else if (game.vVel < maxFall) {
      game.vVel += h * 0.0006 * step;
    }
    game.by += game.vVel * step;
    if (game.by > game.groundY) { game.by = game.groundY; game.vVel = 0; }
    var airborne = game.by < game.groundY - 1;
    if (airborne) game.dist += game.hVel * step;
    game.meters = Math.floor(game.dist / (w * 0.03));
    // recicla árvores que saíram pela esquerda
    if (game.trees.length && (game.trees[0].x - game.dist) < -80) {
      game.trees.shift();
      var lastT = game.trees[game.trees.length - 1];
      game.trees.push(blMakeTree(game, lastT ? lastT.x : game.dist + w));
    }
    // colisão: passando por uma árvore e baixo demais
    var screenX = w * 0.3;
    for (var i = 0; i < game.trees.length; i++) {
      var tx = game.trees[i].x - game.dist;
      if (Math.abs(tx - screenX) < w * 0.06 && game.by > game.groundY - game.trees[i].th) {
        game.over = true;
      }
    }
    if (game.fuel <= 0 && game.by >= game.groundY - 1) game.over = true;
    blDraw(game);
  }
  function blHill(game, fromBottom, amp, color, par) {
    var ctx = game.ctx, w = game.w, h = game.h;
    var baseY = h - fromBottom;
    var off = game.dist * par;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (var x = 0; x <= w; x += 14) ctx.lineTo(x, baseY - Math.sin((x + off) * 0.015) * amp);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  function blDrawBalloon(game, x, by) {
    var ctx = game.ctx, h = game.h;
    var R = h * 0.11;
    var cy = by - R * 2.0;
    ctx.save();
    ctx.fillStyle = '#D62828';
    ctx.beginPath();
    ctx.moveTo(x - R * 0.4, by - R * 0.95);
    ctx.quadraticCurveTo(x - R, cy + R * 0.7, x - R, cy);
    ctx.arc(x, cy, R, Math.PI, 0, false);
    ctx.quadraticCurveTo(x + R, cy + R * 0.7, x + R * 0.4, by - R * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a51f1f';
    ctx.lineWidth = Math.max(1, h * 0.004);
    ctx.beginPath();
    ctx.moveTo(x - R * 0.3, by - R * 0.95); ctx.lineTo(x - R * 0.22, by - R * 0.3);
    ctx.moveTo(x + R * 0.3, by - R * 0.95); ctx.lineTo(x + R * 0.22, by - R * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(x - R * 0.28, by - R * 0.3, R * 0.56, R * 0.3);
    ctx.restore();
  }
  function blDraw(game) {
    var ctx = game.ctx, w = game.w, h = game.h;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#AADBEA');
    sky.addColorStop(1, '#FEF1E1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    blHill(game, h * 0.30, h * 0.05, '#AAD155', 0.2);
    blHill(game, h * 0.20, h * 0.07, '#84B249', 0.4);
    ctx.fillStyle = '#5fa24a';
    ctx.fillRect(0, game.groundY + h * 0.02, w, h);
    var baseY = game.groundY + h * 0.02;
    for (var i = 0; i < game.trees.length; i++) {
      var tr = game.trees[i];
      var x = tr.x - game.dist;
      if (x < -60 || x > w + 60) continue;
      var topY = baseY - tr.th;
      ctx.fillStyle = '#885F37';
      ctx.fillRect(x - h * 0.012, topY + tr.th * 0.4, h * 0.024, tr.th * 0.6);
      ctx.fillStyle = tr.color;
      var r = tr.th * 0.28;
      blCircle(ctx, x, topY + r, r);
      blCircle(ctx, x - r * 0.75, topY + r * 1.7, r * 0.9);
      blCircle(ctx, x + r * 0.75, topY + r * 1.7, r * 0.9);
    }
    blDrawBalloon(game, w * 0.3, game.by);
    // HUD: combustível + metros
    var fw = w * 0.4, fh = h * 0.05, fx = w * 0.06, fy = h * 0.06;
    ctx.strokeStyle = game.fuel <= 30 ? '#e23b3b' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.fillStyle = game.fuel <= 30 ? 'rgba(230,40,40,0.55)' : 'rgba(150,150,200,0.55)';
    ctx.fillRect(fx, fy, fw * game.fuel / 100, fh);
    ctx.fillStyle = '#1b2330';
    ctx.font = 'bold ' + Math.round(h * 0.07) + 'px Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(game.meters + ' m', w - w * 0.06, fy);
    if (game.over) {
      ctx.fillStyle = 'rgba(20,20,30,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(h * 0.06) + 'px Segoe UI, sans-serif';
      ctx.fillText('Fim! Toque para recomeçar', w / 2, h * 0.45);
    } else if (game.by >= game.groundY - 1 && game.dist === 0) {
      ctx.fillStyle = 'rgba(20,20,30,0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.round(h * 0.045) + 'px Segoe UI, sans-serif';
      ctx.fillText('Segure para subir · voe baixo p/ poupar combustível', w / 2, h * 0.45);
    }
    ctx.restore();
  }
  function balloonScore(game) { return game ? game.meters : 0; }
  function balloonFuel(game) { return game ? Math.round(game.fuel) : 0; }
  function balloonOver(game) { return game ? !!game.over : false; }
  function restartBalloon(game) { if (game) blReset(game); }

  // ===== Genéricos Tier 1: mira/contas, vida/tempo, aparência, mundo, pausa =====
  // Distância entre os CENTROS de dois sprites (em pixels).
  function distance(a, b) {
    if (!a || !b) return 0;
    var dx = (a.x + (a.w || 0) / 2) - (b.x + (b.w || 0) / 2);
    var dy = (a.y + (a.h || 0) / 2) - (b.y + (b.h || 0) / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }
  // Ângulo (GRAUS, 0 = pra cima, horário) do sprite A até o sprite B.
  function angleTo(a, b) {
    if (!a || !b) return 0;
    var dx = (b.x + (b.w || 0) / 2) - (a.x + (a.w || 0) / 2);
    var dy = (b.y + (b.h || 0) / 2) - (a.y + (a.h || 0) / 2);
    return Math.atan2(dx, -dy) / DEG;
  }
  // Faz o sprite A apontar para o sprite B (ajusta o ângulo).
  function aimAt(a, b) {
    if (!a || !b) return;
    var dx = (b.x + (b.w || 0) / 2) - (a.x + (a.w || 0) / 2);
    var dy = (b.y + (b.h || 0) / 2) - (a.y + (a.h || 0) / 2);
    a.angle = Math.atan2(dx, -dy);
  }
  // Move o sprite A na direção do sprite B (px por quadro). Move a posição direto.
  function moveToward(a, b, speed) {
    if (!a || !b) return;
    var sp = (typeof speed === 'number') ? speed : 3;
    var dx = (b.x + (b.w || 0) / 2) - (a.x + (a.w || 0) / 2);
    var dy = (b.y + (b.h || 0) / 2) - (a.y + (a.h || 0) / 2);
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    a.x += dx / len * sp;
    a.y += dy / len * sp;
  }
  // Sorteia um número inteiro de min a max (inclusive).
  function randomBetween(min, max) {
    var lo = (typeof min === 'number') ? min : 0;
    var hi = (typeof max === 'number') ? max : 1;
    if (hi < lo) { var t = lo; lo = hi; hi = t; }
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }
  // Verdadeiro com a chance dada (em %). Ex.: randomChance(30) ~ 30% das vezes.
  function randomChance(percent) {
    var p = (typeof percent === 'number') ? percent : 50;
    return Math.random() * 100 < p;
  }
  // ---- Vida e tempo do sprite ----
  function setHealth(s, n) {
    if (!s) return;
    var v = (typeof n === 'number') ? n : 0;
    s.hp = v; s.hpMax = v;
  }
  function changeHealth(s, delta) {
    if (!s) return;
    var d = (typeof delta === 'number') ? delta : 0;
    s.hp = (typeof s.hp === 'number' ? s.hp : 0) + d;
    if (s.hp < 0) s.hp = 0;
    if (typeof s.hpMax === 'number' && s.hp > s.hpMax) s.hp = s.hpMax;
  }
  function getHealth(s) { return s && typeof s.hp === 'number' ? s.hp : 0; }
  function hasHealth(s) { return !!s && typeof s.hp === 'number' && s.hp > 0; }
  // Geometria do sprite (valores prontos p/ a criança não precisar fazer x+w/2 na mão).
  function spriteX(s) { return s ? (s.x || 0) : 0; }
  function spriteY(s) { return s ? (s.y || 0) : 0; }
  function spriteW(s) { return s ? (s.w || 0) : 0; }
  function spriteH(s) { return s ? (s.h || 0) : 0; }
  function centerX(s) { return s ? (s.x || 0) + (s.w || 0) / 2 : 0; }
  function centerY(s) { return s ? (s.y || 0) + (s.h || 0) / 2 : 0; }
  // Velocidade do sprite (vx/vy) — valores prontos p/ ler/decidir. "Movendo" usa um
  // limiar pequeno (abaixo dele é resíduo sub-pixel do atrito, invisível na tela).
  function spriteVx(s) { return s ? (s.vx || 0) : 0; }
  function spriteVy(s) { return s ? (s.vy || 0) : 0; }
  function spriteSpeed(s) { return s ? Math.sqrt((s.vx || 0) * (s.vx || 0) + (s.vy || 0) * (s.vy || 0)) : 0; }
  function isMovingH(s) { return !!s && Math.abs(s.vx || 0) > 0.01; }
  function isMovingV(s) { return !!s && Math.abs(s.vy || 0) > 0.01; }
  function isMoving(s) { return isMovingH(s) || isMovingV(s); }
  // Posição aleatória NA TELA — DINÂMICO: lê o tamanho REAL do palco a cada chamada
  // (largura lógica do jogo, ou o canvas), nunca um valor fixo. Evita a continha
  // Math.random()*largura na mão. Use no x/y ao criar/spawnar um sprite.
  function randomX() { ensureStage(); return Math.random() * (_logicalW || (_stageCanvas ? _stageCanvas.width : 0)); }
  function randomY() { ensureStage(); return Math.random() * (_logicalH || (_stageCanvas ? _stageCanvas.height : 0)); }
  // Verdadeiro no máximo a cada "frames" quadros (recarga POR sprite). Use num "se".
  function cooldownReady(s, frames) {
    if (!s) return false;
    var n = (typeof frames === 'number' && frames > 0) ? Math.round(frames) : 1;
    if (typeof s._cd !== 'number') s._cd = 0;
    if (s._cd > 0) { s._cd -= 1; return false; }
    s._cd = n;
    return true;
  }
  // Tira do grupo quem "nasceu" há mais de N segundos (tempo de vida).
  function pruneOld(group, seconds) {
    if (!group || !group.items) return;
    var max = (typeof seconds === 'number' ? seconds : 3) * 1000;
    var t = now();
    for (var i = group.items.length - 1; i >= 0; i--) {
      var s = group.items[i];
      if (!s) { group.items.splice(i, 1); continue; }
      if (typeof s._born !== 'number') s._born = t;
      if (t - s._born > max) group.items.splice(i, 1);
    }
  }
  // ---- Aparência do sprite (espelhar, transparência, tamanho) ----
  function flipSprite(s, dir) { if (s) s.facing = (dir === 'left') ? -1 : 1; }
  function setOpacity(s, percent) {
    if (!s) return;
    var p = (typeof percent === 'number') ? percent : 100;
    s.opacity = Math.max(0, Math.min(1, p / 100));
  }
  function setSize(s, w, h) {
    if (!s) return;
    if (typeof w === 'number') s.w = w;
    if (typeof h === 'number') s.h = h;
  }
  function scaleSprite(s, factor) {
    if (!s) return;
    var f = (typeof factor === 'number' && factor > 0) ? factor : 1;
    var cx = s.x + (s.w || 0) / 2, cy = s.y + (s.h || 0) / 2;
    s.w = (s.w || 0) * f; s.h = (s.h || 0) * f;
    s.x = cx - s.w / 2; s.y = cy - s.h / 2;
  }
  // ---- Mundo: dar a volta na tela (Pac-Man/Asteroids) ----
  function wrapEdges(s) {
    if (!s) return;
    var c = ensureStage();
    if (!c) return;
    var w = stageW(c), h = stageH(c);
    if (s.x + (s.w || 0) < 0) s.x = w;
    else if (s.x > w) s.x = -(s.w || 0);
    if (s.y + (s.h || 0) < 0) s.y = h;
    else if (s.y > h) s.y = -(s.h || 0);
  }
  // ---- Estado do jogo: pausa. "Pausar o jogo" CONGELA o gameLoop (o tick para de
  // rodar o quadro do aluno); "Continuar o jogo" descongela. "está pausado?" lê o
  // estado (útil em eventos de tecla). ----
  var _paused = false;
  function pauseGame() { _paused = true; }
  function resumeGame() { _paused = false; }
  function isPaused() { return _paused; }

  // ===== Genéricos Tier 2: câmera, mapa destrutível, ordem de desenho, depuração =====
  // ---- Câmera: rola o MUNDO; o HUD continua fixo na tela ----
  var camera = { x: 0, y: 0 };
  // Envolve uma função de desenho do MUNDO para aplicar o deslocamento da câmera.
  // Com a câmera em (0,0) NÃO faz nada — jogos sem câmera ficam idênticos.
  function _camWrap(fn) {
    return function () {
      var ctx = arguments[0];
      var camOn = ctx && (camera.x !== 0 || camera.y !== 0);
      if (camOn) { ctx.save(); ctx.translate(-camera.x, -camera.y); }
      try { return fn.apply(null, arguments); }
      finally { if (camOn) ctx.restore(); }
    };
  }
  // Centraliza a câmera no sprite, presa aos limites do mundo (0..worldW/H).
  function cameraFollow(s, worldW, worldH) {
    if (!s) return;
    var c = ensureStage();
    var vw = c ? stageW(c) : 0, vh = c ? stageH(c) : 0;
    var x = (s.x + (s.w || 0) / 2) - vw / 2;
    var y = (s.y + (s.h || 0) / 2) - vh / 2;
    // Presa às bordas do mundo. Se o mundo não for maior que a tela num eixo, a
    // câmera fica em 0 nesse eixo (ex.: plataforma horizontal mantém o chão embaixo).
    if (typeof worldW === 'number' && worldW > 0) x = Math.max(0, Math.min(x, Math.max(0, worldW - vw)));
    if (typeof worldH === 'number' && worldH > 0) y = Math.max(0, Math.min(y, Math.max(0, worldH - vh)));
    camera.x = x; camera.y = y;
  }
  function setCamera(x, y) {
    camera.x = (typeof x === 'number') ? x : 0;
    camera.y = (typeof y === 'number') ? y : 0;
  }
  function cameraX() { return camera.x; }
  function cameraY() { return camera.y; }
  // ---- Mapa destrutível: muda/quebra/lê o tile na posição de um sprite ----
  function setTileAt(map, px, py, index) {
    if (!map || !map.rows || !map.tile) return;
    var t = tileScreenSize(map);
    var col = Math.floor((px - (map.ox || 0)) / t);
    var row = Math.floor((py - (map.oy || 0)) / t);
    if (row < 0 || row >= map.rows.length) return;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return;
    r[col] = (typeof index === 'number') ? index : -1;
  }
  function _spriteCenter(s) { return { x: s.x + (s.w || 0) / 2, y: s.y + (s.h || 0) / 2 }; }
  function breakTileAtSprite(map, s) {
    if (s) { var p = _spriteCenter(s); setTileAt(map, p.x, p.y, -1); }
  }
  function setTileAtSprite(map, index, s) {
    if (s) { var p = _spriteCenter(s); setTileAt(map, p.x, p.y, index); }
  }
  function tileAtSprite(map, s) {
    if (!s) return -1;
    var p = _spriteCenter(s);
    return tileAt(map, p.x, p.y);
  }
  // ---- Ordem de desenho dentro de um grupo (frente = desenhado por último) ----
  function bringToFront(group, s) {
    if (!group || !group.items) return;
    var i = group.items.indexOf(s);
    if (i >= 0) { group.items.splice(i, 1); group.items.push(s); }
  }
  function sendToBack(group, s) {
    if (!group || !group.items) return;
    var i = group.items.indexOf(s);
    if (i >= 0) { group.items.splice(i, 1); group.items.unshift(s); }
  }
  // ---- Depuração: caixa de colisão e contador de FPS ----
  function drawHitbox(s) {
    if (!s) return;
    var c = ensureStage();
    if (!c) return;
    var camOn = camera.x !== 0 || camera.y !== 0;
    if (camOn) { c.save(); c.translate(-camera.x, -camera.y); }
    c.save();
    c.strokeStyle = '#ff2d95';
    c.lineWidth = 2;
    c.strokeRect(s.x, s.y, s.w || 0, s.h || 0);
    c.restore();
    if (camOn) c.restore();
  }
  var _fpsLast = 0, _fpsFrames = 0, _fpsValue = 0;
  function showFps(x, y) {
    var c = ensureStage();
    if (!c) return;
    var t = now();
    _fpsFrames += 1;
    if (!_fpsLast) _fpsLast = t;
    if (t - _fpsLast >= 500) {
      _fpsValue = Math.round((_fpsFrames * 1000) / (t - _fpsLast));
      _fpsFrames = 0;
      _fpsLast = t;
    }
    c.save();
    c.fillStyle = '#00ff88';
    c.font = 'bold 16px monospace';
    c.fillText('FPS: ' + _fpsValue, typeof x === 'number' ? x : 8, typeof y === 'number' ? y : 20);
    c.restore();
  }

  window.SZGame2D = {
    createSprite: createSprite,
    drawSprite: _camWrap(drawSprite),
    clear: clear,
    fitScreen: fitScreen,
    setupStage: setupStage,
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
    playFx: playFx,
    playMusic: playMusic,
    stopMusic: stopMusic,
    playNote: playNote,
    // Genéricos Tier 1 (v0.15.0): mira/contas, vida/tempo, aparência, mundo, pausa.
    distance: distance,
    angleTo: angleTo,
    aimAt: aimAt,
    moveToward: moveToward,
    randomBetween: randomBetween,
    randomChance: randomChance,
    setHealth: setHealth,
    changeHealth: changeHealth,
    getHealth: getHealth,
    spriteX: spriteX,
    spriteY: spriteY,
    spriteW: spriteW,
    spriteH: spriteH,
    centerX: centerX,
    centerY: centerY,
    spriteVx: spriteVx,
    spriteVy: spriteVy,
    spriteSpeed: spriteSpeed,
    isMoving: isMoving,
    isMovingH: isMovingH,
    isMovingV: isMovingV,
    randomX: randomX,
    randomY: randomY,
    hasHealth: hasHealth,
    cooldownReady: cooldownReady,
    pruneOld: pruneOld,
    flipSprite: flipSprite,
    setOpacity: setOpacity,
    setSize: setSize,
    scaleSprite: scaleSprite,
    wrapEdges: wrapEdges,
    pauseGame: pauseGame,
    resumeGame: resumeGame,
    isPaused: isPaused,
    // Genéricos Tier 2 (v0.16.0): câmera, mapa destrutível, ordem de desenho, depuração.
    cameraFollow: cameraFollow,
    setCamera: setCamera,
    cameraX: cameraX,
    cameraY: cameraY,
    setTileAtSprite: setTileAtSprite,
    breakTileAtSprite: breakTileAtSprite,
    tileAtSprite: tileAtSprite,
    bringToFront: bringToFront,
    sendToBack: sendToBack,
    drawHitbox: drawHitbox,
    showFps: showFps,
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
    drawParticles: _camWrap(drawParticles),
    // Tiles / tilemaps (v0.5.0).
    createTileMap: createTileMap,
    drawTileMap: _camWrap(drawTileMap),
    collideTileMap: collideTileMap,
    tileAt: tileAt,
    // Grupos de sprites + temporizadores (v0.6.0).
    createGroup: createGroup,
    spawn: spawn,
    updateGroup: updateGroup,
    drawGroup: _camWrap(drawGroup),
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
    // Nave clássica: girar + impulsionar na direção apontada (v0.10.0).
    rotateSprite: rotateSprite,
    pointSprite: pointSprite,
    thrust: thrust,
    applyFriction: applyFriction,
    steerThrust: steerThrust,
    spriteAngleDeg: spriteAngleDeg,
    shootFrom: shootFrom,
    spawnAsteroidFromEdge: spawnAsteroidFromEdge,
    // Pulo genérico + Kit dino (v0.9.0).
    jumpOnGround: jumpOnGround,
    createDino: createDino,
    controlDino: controlDino,
    spawnObstacle: spawnObstacle,
    spawnEgg: spawnEgg,
    drawForest: drawForest,
    playJump: playJump,
    playDinoHurt: playDinoHurt,
    playCollect: playCollect,
    // Kit gorilas: batalha de bananas (v0.11.0).
    createCity: createCity,
    drawCity: drawCity,
    placeThrower: placeThrower,
    newWind: newWind,
    drawWind: drawWind,
    aimDrag: aimDrag,
    aimReleased: aimReleased,
    throwBanana: throwBanana,
    updateBanana: updateBanana,
    drawBanana: drawBanana,
    bananaHitThrower: bananaHitThrower,
    bananaHitCity: bananaHitCity,
    playWhistle: playWhistle,
    playBoom: playBoom,
    computerTurn: computerTurn,
    drawAimReadout: drawAimReadout,
    // Kit equilibrista (Stick Hero) (v0.13.0).
    createStickHero: createStickHero,
    updateStickHero: updateStickHero,
    stickHeroScore: stickHeroScore,
    stickHeroOver: stickHeroOver,
    restartStickHero: restartStickHero,
    // Kit balão (Hot-Air-Balloon) (v0.13.0).
    createBalloon: createBalloon,
    updateBalloon: updateBalloon,
    balloonScore: balloonScore,
    balloonFuel: balloonFuel,
    balloonOver: balloonOver,
    restartBalloon: restartBalloon
  };
})();`
