export const gameTwoDSpritesRuntime = `  // ---- Imagens / assets ----
  // Manifesto semeado pelo assetsBridge (window.__SZGAME_ASSETS = { nome: dataUrl }).
  // Resolvemos nomes de asset OU URLs/dataUrls diretas. As imagens carregam de
  // forma ASSÍNCRONA, mas a API é SÍNCRONA e didática: loadImage devolve um handle
  // { img, loaded } na hora; drawSprite desenha quando loaded, senão cai no
  // placeholder (retângulo da cor). Como o gameLoop roda todo frame, a imagem
  // aparece 1–2 frames depois. Sem await/callback.
  var ASSETS = (window.__SZGAME_ASSETS && typeof window.__SZGAME_ASSETS === 'object')
    ? window.__SZGAME_ASSETS
    : {};
  // Metadados de preview por asset (hoje: mapas de tiles do Pinta/fatiador),
  // semeados pelo mesmo assetsBridge em __SZGAME_ASSET_META.
  var ASSET_META = (window.__SZGAME_ASSET_META && typeof window.__SZGAME_ASSET_META === 'object')
    ? window.__SZGAME_ASSET_META
    : {};
  var imageCache = Object.create(null);

  // Aviso DEDUPADO por chave: um nome errado (de figura/imagem/som/mapa) chamado
  // DENTRO do "a cada quadro" afogaria o console 60×/s. warnOnce fala UMA vez por
  // chave e o jogo segue rodando — a criança vê a dica sem o console travar.
  var _warnedOnce = Object.create(null);
  function warnOnce(key, msg) {
    if (_warnedOnce[key]) return;
    _warnedOnce[key] = true;
    try { console.warn('SZGame2D: ' + msg); } catch (e) {}
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
    var known = Object.prototype.hasOwnProperty.call(ASSETS, src);
    var url = known ? ASSETS[src] : src;
    // Nome que não é asset do projeto NEM parece um endereço (sem "/" nem ":") =
    // provável erro de digitação. Avisa uma vez; segue tentando como URL.
    if (!known && src.indexOf('/') === -1 && src.indexOf(':') === -1) {
      warnOnce('img:' + src, 'a imagem "' + src + '" não está no projeto. Confira o nome no painel Imagens (maiúsculas e espaços contam).');
    }
    if (imageCache[url]) return imageCache[url];
    var handle = { img: null, loaded: false, url: url };
    try {
      var im = new Image();
      handle.img = im;
      im.onload = function () { handle.loaded = true; };
      im.onerror = function () { handle.loaded = false; warnOnce('imgerr:' + url, 'não consegui carregar a imagem "' + src + '".'); };
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
    sprite._animState = null;
    sprite._imgHooked = false;
  }

  // ---- Figuras: sprite desenhado por codigo (v0.23.0) ----
  // Uma FIGURA e uma funcao de desenho nomeada. O sprite guarda skin custom
  // apontando a figura; ao desenhar, o runtime translada o ctx para o canto do
  // sprite e chama a figura em coords LOCAIS (0,0 = canto). Ganha giro/flip/
  // piscar/transparencia do wrapper (drawSprite) de graca.
  var _shapes = Object.create(null);
  var _shapeW = 0, _shapeH = 0;

  /** Guarda a figura (funcao de desenho) sob um nome. */
  function defineShape(name, fn) {
    if (name && typeof name === 'string' && typeof fn === 'function') _shapes[name] = fn;
  }

  /** Faz o sprite usar uma figura (cancela imagem/animacao — uma coisa por vez). */
  function setShape(sprite, name) {
    if (!sprite) return;
    sprite.skin = { kind: 'custom', shape: name };
    sprite.image = null;
    sprite.anim = null;
    sprite._animState = null;
  }

  /** Cria um sprite ja com uma figura (mesmo modelo fisico do createSprite). */
  function createShapeSprite(name, opts) {
    var s = createSprite(opts);
    setShape(s, name);
    return s;
  }

  /** A largura / altura do sprite que esta sendo desenhado (para centralizar/escalar). */
  function shapeW() { return _shapeW; }
  function shapeH() { return _shapeH; }

  /**
   * Desenha a figura do sprite: translada para o canto do sprite (coords locais)
   * e roda a funcao da crianca. Sem figura registrada -> retangulo da cor (fallback).
   */
  function drawCustomShape(ctx, sprite) {
    var name = sprite.skin ? sprite.skin.shape : null;
    var fn = name ? _shapes[name] : null;
    if (typeof fn !== 'function') {
      if (name) warnOnce('shape:' + name, 'a figura "' + name + '" não existe. Crie-a com “Desenhar a figura … assim” (o nome tem que ser igualzinho: maiúsculas e espaços contam).');
      ctx.fillStyle = sprite.color;
      ctx.fillRect(sprite.x, sprite.y, sprite.w, sprite.h);
      return;
    }
    _shapeW = sprite.w;
    _shapeH = sprite.h;
    ctx.save();
    ctx.translate(sprite.x, sprite.y);
    try { fn(ctx); }
    finally { ctx.restore(); }
  }

  // Blocos SIMPLES de desenho (coords locais dentro da figura; recebem o ctx da
  // figura). Cada um e autossuficiente (begin/fill) para nao depender de estado.
  function paintRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color || '#000000';
    ctx.fillRect(x || 0, y || 0, w || 0, h || 0);
  }
  function paintCircle(ctx, x, y, r, color) {
    ctx.fillStyle = color || '#000000';
    ctx.beginPath();
    ctx.arc(x || 0, y || 0, Math.max(0, r || 0), 0, Math.PI * 2);
    ctx.fill();
  }
  function paintEllipse(ctx, x, y, w, h, color) {
    var rw = Math.max(0, (w || 0) / 2), rh = Math.max(0, (h || 0) / 2);
    ctx.fillStyle = color || '#000000';
    ctx.beginPath();
    ctx.ellipse((x || 0) + rw, (y || 0) + rh, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function paintTriangle(ctx, x1, y1, x2, y2, x3, y3, color) {
    ctx.fillStyle = color || '#000000';
    ctx.beginPath();
    ctx.moveTo(x1 || 0, y1 || 0);
    ctx.lineTo(x2 || 0, y2 || 0);
    ctx.lineTo(x3 || 0, y3 || 0);
    ctx.closePath();
    ctx.fill();
  }
  function paintLine(ctx, x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = color || '#000000';
    ctx.lineWidth = (typeof width === 'number' && width > 0) ? width : 2;
    ctx.beginPath();
    ctx.moveTo(x1 || 0, y1 || 0);
    ctx.lineTo(x2 || 0, y2 || 0);
    ctx.stroke();
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

  // ---- Animação por ESTADO (troca sozinha conforme o sprite se move) ----
  // "Tomar dano" dura este tanto de quadros depois de perder vida (funciona
  // mesmo sem o piscar visual; o piscar também conta como dano).
  var HURT_FRAMES = 30;
  // Estado sem animação registrada cai para o parente mais próximo, numa ordem
  // FIXA e previsível (caindo parece pular; pular parece andar; etc.).
  var ANIM_FALLBACK = {
    caindo: ['pulando', 'andando', 'parado'],
    pulando: ['andando', 'parado'],
    vertical: ['andando', 'parado'],
    dano: ['andando', 'parado'],
    andando: ['parado'],
    parado: []
  };

  /**
   * Guarda no sprite a animação de UM estado (parado/andando/vertical/pulando/
   * caindo/dano). Quem troca sozinho é o autoAnimate, no "a cada quadro".
   */
  function setStateAnimation(sprite, state, sheet, from, to, fps) {
    if (!sprite || !sheet || !state) return;
    if (!sprite.animStates) sprite.animStates = {};
    var f = (typeof from === 'number') ? from : 0;
    var t = (typeof to === 'number') ? to : f;
    sprite.animStates[state] = {
      sheet: sheet,
      from: Math.max(0, Math.floor(f)),
      to: Math.max(0, Math.floor(t)),
      fps: (typeof fps === 'number' && fps > 0) ? fps : 8
    };
  }

  // Decide o estado do sprite AGORA, por prioridade: dano > no ar (pulando/
  // caindo, só quando alguém marcou onGround === false) > andando > vertical >
  // parado. Jogo top-down (sem gravidade) nunca marca onGround, então nunca
  // entra em pulando/caindo.
  function _resolveAnimState(s) {
    if ((s.hurtFrames || 0) > 0 || (s.blinkFrames || 0) > 0) return 'dano';
    if (s.onGround === false) return ((s.vy || 0) < 0) ? 'pulando' : 'caindo';
    if (Math.abs(s.vx || 0) > 0.01) return 'andando';
    if (Math.abs(s.vy || 0) > 0.01) return 'vertical';
    return 'parado';
  }

  /**
   * Troca a animação do sprite sozinho conforme o estado E vira o sprite para
   * onde ele anda (flip automático). Use DENTRO do "a cada quadro do jogo".
   * Só re-dispara setAnimation quando o estado RESOLVIDO muda — chamar
   * setAnimation todo quadro reiniciaria o tempo e congelaria no 1º quadro.
   */
  function autoAnimate(s) {
    if (!s) return;
    if ((s.hurtFrames || 0) > 0 && (_loopOrder.length === 0 || s._hurtStamp !== _frameStamp)) {
      s.hurtFrames--;
      s._hurtStamp = _frameStamp;
    }
    // Flip automático: andando p/ a esquerda vira o desenho; parado mantém o
    // último lado (o "Virar o sprite" manual vale enquanto está parado).
    var vx = s.vx || 0;
    if (vx > 0.01) s.facing = 1;
    else if (vx < -0.01) s.facing = -1;
    var states = s.animStates;
    if (!states) return;
    var want = _resolveAnimState(s);
    var key = states[want] ? want : null;
    if (!key) {
      var chain = ANIM_FALLBACK[want] || [];
      for (var i = 0; i < chain.length; i++) {
        if (states[chain[i]]) { key = chain[i]; break; }
      }
    }
    if (!key || s._animState === key) return;
    s._animState = key;
    var cfg = states[key];
    setAnimation(s, cfg.sheet, cfg.from, cfg.to, cfg.fps);
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
      // Decai 1× por quadro do jogo (carimbo) — não por desenho. Sem "a cada quadro
      // do jogo" ativo (aluno desenhando no rAF do núcleo), cai no modo antigo.
      if (_loopOrder.length === 0 || sprite._blinkStamp !== _frameStamp) {
        sprite.blinkFrames--;
        sprite._blinkStamp = _frameStamp;
      }
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
      if (sprite.skin.kind === 'custom') { drawCustomShape(ctx, sprite); return; }
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

  _registerRuntimeDomain('sprites', {
    reset: function () {
      _warnedOnce = Object.create(null);
      _shapes = Object.create(null);
      _shapeW = 0;
      _shapeH = 0;
    }
  });

`
