export const gameTwoDArcadeSpaceRuntime = `  // ---- Kit "Nave & Asteroides" (v0.7.0): desenhos prontos + efeitos ----
  // Um sprite pode ter um "skin" (sprite.skin) que muda o jeito que ele é
  // desenhado. drawSprite despacha: skin 'ship' -> nave; 'asteroid' -> asteroide.
  // Assim o mesmo modelo de sprite (x/y/w/h/vx/vy) ganha o visual do jogo.

  /** Cria uma nave (corpo + asas customizáveis; cabine e foguinho fixos, animados). */
  function createShip(options) {
    options = options || {};
    var s = createSprite({ x: options.x, y: options.y, w: options.w, h: options.h, color: options.body });
    s.skin = { kind: 'ship', body: options.body || '#35e8ff', wings: options.wings || '#2568ff' };
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
  function spawnAsteroid(group, options) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    options = options || {};
    var base = _positiveFiniteNumber(options.size, 36);
    // Cada asteroide nasce com um tamanho um pouco diferente (variedade automática).
    var size = Math.round(base * (0.65 + Math.random() * 0.5));
    var s = createSprite({ x: options.x, y: options.y, w: size, h: size, color: options.color, vx: options.vx, vy: options.vy });
    s.skin = {
      kind: 'asteroid',
      color: options.color || '#8d8f9b',
      sides: 7 + Math.floor(Math.random() * 3),
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.002
    };
    group.items.push(s);
    _touchGroup(group);
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
      _startAudioSource(osc, t); osc.stop(t + 0.1);
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
      _startAudioSource(src);
    } catch (e) {}
  }

  /**
   * Para cada sprite do grupo que encosta no sprite dado, roda fn(item). O sprite
   * entra como thunk (() => sprite). Varredura por quadro (use no "a cada quadro").
   */
  function overlapSpriteGroup(getSprite, group, fn) {
    if (typeof getSprite !== 'function' || !group || !group.items || typeof fn !== 'function') return;
    var generation = _driverGeneration;
    var sprite = _invokeProjectCallback(getSprite, undefined, []);
    if (_runGenerationChanged(generation)) return;
    if (!sprite) return;
    var traversal = _beginGroupTraversal(group);
    for (var i = traversal.items.length - 1; i >= 0; i--) {
      _refreshGroupTraversal(group, traversal);
      var it = traversal.items[i];
      if (!it || !traversal.members.has(it)) continue;
      if (it && isColliding(sprite, it)) {
        _invokeProjectCallback(fn, undefined, [it]);
        if (_runGenerationChanged(generation)) return;
      }
    }
  }

`
