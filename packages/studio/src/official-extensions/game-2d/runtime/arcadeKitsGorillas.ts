export const gameTwoDArcadeGorillasRuntime = `  // ---- Kit gorilas: batalha de bananas (artilharia) ----
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
  function placeThrower(city, options) {
    options = options || {};
    if (!city || !city.buildings.length) return createSprite(options);
    var side = options.side === 'right' ? 'right' : 'left';
    var idx = side === 'left'
      ? Math.min(1, city.buildings.length - 1)
      : Math.max(0, city.buildings.length - 2);
    var b = city.buildings[idx];
    var w = 30, h = 36;
    var top = city.H - b.h;
    var s = createSprite({ x: b.x + b.w / 2 - w / 2, y: top - h, w: w, h: h, color: options.color });
    s.skin = { kind: 'gorilla', color: options.color || '#6b4a2b', side: side };
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
    ctx.font = 'bold 11px ' + _szGameUIFont;
    ctx.textAlign = 'center';
    ctx.fillText('vento', cx, cy - 9);
    ctx.restore();
    var strength = Math.round(Math.min(1, Math.abs(city.wind || 0) / GORILLA_WIND) * 100);
    var direction = city.wind > 0 ? 'para a direita' : (city.wind < 0 ? 'para a esquerda' : 'parado');
    _updateAccessibleHud('kit:gorilas:vento', 'Vento ' + direction + ': ' + strength + '%');
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
    ctx.font = 'bold 12px ' + _szGameUIFont;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('angulo ' + deg + ' / forca ' + pow, 12, stageH(ctx) - 12);
    ctx.restore();
    _updateAccessibleHud('kit:gorilas:mira', 'Ângulo: ' + deg + ' graus. Força: ' + pow);
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
      _startAudioSource(o, t); o.stop(t + 0.55);
    } catch (e) {}
  }

  _registerRuntimeDomain('arcade-kits', {
    reset: function () {
      _enemyTypeCreates = 0;
      _scene = 'inicio';
      _stars = null;
      _jumpTapPrev = false;
      _dinoTapPrev = false;
      _forest = null;
      _banana = null;
      _aim = { dragging: false, power: 0, angle: 0, vx: 0, vy: 0, released: false };
      _ai = null;
    }
  });
  /** Som de explosão da banana (reusa a explosão do kit nave). */

`
