export const gameTwoDArcadeDinoRuntime = `  // ---- Pulo no chão (genérico) + Kit dino (v0.9.0) ----
  // Bloco genérico "pular no chão": pouso na borda atraída + pulo com
  // ↑/Espaço/W ou um toque. A gravidade é aplicada à parte.
  function jumpOnGround(sprite, ctx, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var j = (_isFiniteNumber(jump) && jump > 0) ? jump : 14;
    var g = world.gravity;
    sprite.vy = _finiteNumber(sprite.vy, 0);
    var wasGrounded = _beginGroundFrame(sprite);
    var pressing = keys.up || keyDown('Space') || pointer.down;
    var wantJump = pressing && sprite._screenJumpHeld !== true;
    sprite._screenJumpHeld = pressing;
    var jumped = false;
    if (wantJump && wasGrounded) {
      _jumpFromGround(sprite, g, j);
      jumped = true;
    }
    sprite.y += sprite.vy;
    var visible = _visibleWorldRect(ctx);
    // Persiste "no chão" NO sprite (mesmo contrato do platformer/autoAnimate).
    _resolveGravityGround(sprite, visible.top, visible.bottom, g);
    if (wantJump && !jumped && sprite.onGround) {
      _jumpFromGround(sprite, g, j);
    }
  }

  // Linha do chão do mundo "corrida": fica um pouco acima da base p/ o dino
  // correr sobre a grama desenhada por drawForest (não colado na borda).
  function dinoGround(ctx) {
    var visible = _visibleWorldRect(ctx);
    return visible.bottom - Math.round(visible.height * 0.16);
  }

  /** Cria um dinossauro desenhado (corre sozinho; pose muda no pulo/agachar). */
  function createDino(options) {
    options = options || {};
    var size = _positiveFiniteNumber(options.size, 64);
    var w = Math.round(size * 0.95), h = size;
    var s = createSprite({ x: options.x, y: options.y, w: w, h: h, color: options.color });
    s.skin = { kind: 'dino', color: options.color || '#5fb45f', fullH: h, ducking: false, onGround: true };
    return s;
  }

  var _dinoTapPrev = false;
  /**
   * Controla o dinossauro estilo "corrida": pula com ↑/Espaço/W ou toque na
   * METADE DE CIMA da tela; abaixa com ↓/S ou segurando o dedo na METADE DE
   * BAIXO. Integra a velocidade, pousa na linha do chão e solta poeira ao
   * pular/pousar. A gravidade é aplicada à parte, antes deste controle.
   */
  function controlDino(sprite, ctx, jump) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var sk = sprite.skin || (sprite.skin = { kind: 'dino' });
    var j = _positiveFiniteNumber(jump, 15);
    var g = world.gravity;
    var gh = stageH(ctx);
    var gy = dinoGround(ctx);
    var visible = _visibleWorldRect(ctx);
    // Integração vertical. ⚠️ A GRAVIDADE saiu daqui em 08/2026: quem puxa o dino
    // para baixo é o bloco "Aplicar a gravidade do mundo", encaixado logo acima
    // no laço. Assim a aula tem três passos com resultado na tela (o dino boia →
    // cai → ajusta a altura do salto) em vez de um kit que já faz tudo sozinho.
    // O g continua aqui para escolher a borda de apoio e o sinal do pulo.
    sprite.vy = _finiteNumber(sprite.vy, 0);
    sprite.y += sprite.vy;
    var impactVelocity = sprite.vy;
    sk.onGround = _resolveGravityGround(sprite, visible.top, gy, g);
    if (sk.onGround && (_gravityPullsUp(g) ? -impactVelocity : impactVelocity) > 5) {
      var landingY = _gravityPullsUp(g) ? sprite.y : sprite.y + sprite.h;
      emitParticles(sprite.x + sprite.w / 2, landingY, 5, '#caa977');
    }
    // Agachar (só no chão): encolhe mantendo a borda apoiada no lugar.
    var touchDuck = pointer.down && pointer.y > gh * 0.6;
    var wantDuck = (keys.down || touchDuck) && sk.onGround;
    var fullH = sk.fullH || sprite.h;
    if (wantDuck && !sk.ducking) {
      sk.ducking = true;
      var dh = Math.round(fullH * 0.6);
      if (!_gravityPullsUp(g)) sprite.y += (sprite.h - dh);
      sprite.h = dh;
    } else if (!wantDuck && sk.ducking) {
      sk.ducking = false;
      if (!_gravityPullsUp(g)) sprite.y -= (fullH - sprite.h);
      sprite.h = fullH;
    }
    // Pulo (não enquanto agacha): teclas OU toque na metade de cima.
    var tap = pointer.down && !_dinoTapPrev && pointer.y <= gh * 0.6;
    _dinoTapPrev = pointer.down;
    var wantJump = keys.up || keyDown('Space') || tap;
    if (wantJump && sk.onGround && !sk.ducking) {
      sprite.vy = _jumpVelocityForGravity(g, j);
      sk.onGround = false;
      sprite.onGround = false;
      var takeoffY = _gravityPullsUp(g) ? sprite.y : sprite.y + sprite.h;
      emitParticles(sprite.x + sprite.w / 2, takeoffY, 8, '#caa977');
      _emitJump(sprite);
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
    // sombra: FICA na linha do chão (não sobe com o pulo, como acontecia quando era
    // desenhada nos pés) e encolhe/clareia conforme o dino ganha altura — dá
    // profundidade sem "grudar" no dino.
    var invertedGravity = _gravityPullsUp(world.gravity);
    var groundY = invertedGravity ? _visibleWorldRect(ctx).top : dinoGround(ctx);
    var airborne = invertedGravity ? y - groundY : groundY - (y + h);
    if (airborne < 0) airborne = 0;
    var shadowScale = 1 - airborne / 260;
    if (shadowScale < 0.4) shadowScale = 0.4;
    ctx.fillStyle = 'rgba(32,65,92,' + (0.16 * shadowScale).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.52, groundY + (invertedGravity ? 1 : -1), w * 0.42 * shadowScale, h * 0.06 * shadowScale, 0, 0, Math.PI * 2);
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
  function spawnObstacle(group, ctx, options) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    options = options || {};
    var type = options.type || 'cactus';
    if (type === 'random' || type === 'surpresa') {
      var r = Math.random();
      type = r < 0.45 ? 'cactus' : (r < 0.8 ? 'rock' : 'bird');
    }
    var size = _positiveFiniteNumber(options.size, 44);
    var gy = dinoGround(ctx);
    var w, h, y;
    if (type === 'bird') { w = Math.round(size * 1.3); h = Math.round(size * 0.8); y = gy - h - 46; }
    else if (type === 'rock') { w = size; h = Math.round(size * 0.72); y = gy - h; }
    else { type = 'cactus'; w = Math.round(size * 0.7); h = Math.round(size * 1.3); y = gy - h; }
    var s = createSprite({ x: options.x, y: y, w: w, h: h, color: '#3f8f49', vx: options.vx, vy: 0 });
    s.skin = { kind: 'obstacle', shape: type, flap: Math.random() * Math.PI * 2 };
    group.items.push(s);
    _touchGroup(group);
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
  function spawnEgg(group, options) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    options = options || {};
    var s = createSprite({ x: options.x, y: options.y, w: 30, h: 38, color: '#fff3c4', vx: options.vx, vy: 0 });
    s.skin = { kind: 'egg', bob: Math.random() * Math.PI * 2 };
    group.items.push(s);
    _touchGroup(group);
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
    var sp = _finiteNumber(speed, 4);
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
    // Módulo é constante no tamanho da velocidade; a normalização antiga por
    // adições repetidas podia travar a thread com valores enormes/Infinity.
    F.gx = (_finiteNumber(F.gx, 0) - sp) % 40;
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
      _startAudioSource(o, t); o.stop(t + 0.14);
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
      _startAudioSource(o, t); o.stop(t + 0.3);
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
        _startAudioSource(o, t + start); o.stop(t + start + dur);
      }
      note(660, 0, 0.12);
      note(990, 0.09, 0.16);
    } catch (e) {}
  }

`
