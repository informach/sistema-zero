/**
 * Domínio de apresentação do Jogo 2D Avançado: HUD, aparências e efeitos.
 * O fragmento roda dentro do IIFE principal e compartilha seu estado interno.
 */
export const gameKitVisualEffectsRuntime = `
  // ---- ❤️ HUD de corações ----
  function heartPath(cx, cy, s) {
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy + s * 0.3);
    ctx2d.lineTo(cx - s * 0.5, cy - s * 0.15);
    ctx2d.arc(cx - s * 0.25, cy - s * 0.15, s * 0.25, Math.PI, 0);
    ctx2d.arc(cx + s * 0.25, cy - s * 0.15, s * 0.25, Math.PI, 0);
    ctx2d.lineTo(cx, cy + s * 0.3);
    ctx2d.closePath();
  }
  function drawHearts(current, max, x, y) {
    if (!ctx2d) return;
    var requested = Math.max(0, Math.floor(num(max, 3)));
    var total = Math.min(MAX_HUD_HEARTS, requested);
    if (requested > MAX_HUD_HEARTS) warnOnce('hearts:limit', 'o HUD mostra no máximo ' + MAX_HUD_HEARTS + ' corações');
    var cur = Math.max(0, Math.min(total, Math.floor(num(current, 0))));
    var s = 22, gap = 6, bx = num(x, 20), by = num(y, 20);
    for (var i = 0; i < total; i++) {
      var cx = bx + i * (s + gap) + s / 2;
      var cy = by + s / 2;
      heartPath(cx, cy, s);
      if (i < cur) { ctx2d.fillStyle = '#ff5f6d'; ctx2d.fill(); }
      else { ctx2d.fillStyle = 'rgba(0,0,0,0.35)'; ctx2d.fill(); }
      ctx2d.strokeStyle = 'white'; ctx2d.lineWidth = 2; ctx2d.stroke();
    }
  }

  // ---- ✨ Partículas e feedback visual ----
  function defineEffect(name, opts) {
    var k = text(name, '');
    if (!k) { warn('"Criar o efeito" precisa de um nome'); return; }
    var o = (opts && typeof opts === 'object') ? opts : {};
    effects[k] = {
      count: Math.max(0, Math.min(200, Math.floor(num(o.count, 16)))),
      color: text(o.color, '#ffd166'),
      size: num(o.size, 4),
      life: num(o.life, 0.6),
      speed: num(o.speed, 200),
      gravity: num(o.gravity, 300)
    };
  }
  var MAX_PARTICLES = 1000;
  function burst(name, x, y) {
    var e = effects[text(name, '')];
    if (!e) { warnOnce('effect:' + text(name, ''), 'efeito "' + text(name, '') + '" não existe — crie com "Criar o efeito"'); return; }
    for (var i = 0; i < e.count; i++) {
      if (particles.active.length >= MAX_PARTICLES) break;
      var p = particles.free.pop() || {};
      var ang = Math.random() * Math.PI * 2;
      var sp = e.speed * (0.4 + Math.random() * 0.6);
      p.x = num(x, 0); p.y = num(y, 0);
      p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
      p.life = e.life; p.max = e.life; p.size = e.size; p.color = e.color; p.gravity = e.gravity;
      particles.active.push(p);
    }
  }
  function stepParticles(dt) {
    for (var i = particles.active.length - 1; i >= 0; i--) {
      var p = particles.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        var last = particles.active.length - 1;
        particles.active[i] = particles.active[last];
        particles.active.pop();
        particles.free.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  function drawEffects() {
    if (!ctx2d) return;
    for (var i = 0; i < particles.active.length; i++) {
      var p = particles.active[i];
      var prev = 1;
      try { prev = ctx2d.globalAlpha; ctx2d.globalAlpha = Math.max(0, p.life / p.max); } catch (e) {}
      ctx2d.fillStyle = p.color;
      ctx2d.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      try { ctx2d.globalAlpha = prev; } catch (e) {}
    }
  }
  function floatText(txt, x, y, color, size) {
    if (floaties.active.length >= MAX_FLOATIES) {
      warnOnce('floaties', 'muitos textos flutuantes de uma vez (teto ' + MAX_FLOATIES + ')');
      return;
    }
    var f = floaties.free.pop() || {};
    f.text = text(txt, '');
    f.x = num(x, 0); f.y = num(y, 0); f.t = 0; f.life = 0.75;
    f.color = text(color, '#ffffff');
    f.size = Math.max(6, num(size, 24));
    floaties.active.push(f);
  }
  function stepFloaties(dt) {
    for (var i = floaties.active.length - 1; i >= 0; i--) {
      var f = floaties.active[i];
      f.t += dt;
      f.y -= (40 / 0.75) * dt;
      if (f.t >= f.life) {
        var last = floaties.active.length - 1;
        floaties.active[i] = floaties.active[last];
        floaties.active.pop();
        floaties.free.push(f);
      }
    }
  }
  function drawFloaties() {
    if (!ctx2d || !floaties.active.length) return;
    var prev = 1;
    try { prev = ctx2d.globalAlpha; } catch (e) {}
    for (var i = 0; i < floaties.active.length; i++) {
      var f = floaties.active[i];
      try { ctx2d.globalAlpha = Math.max(0, 1 - f.t / f.life); } catch (e) {}
      ctx2d.fillStyle = f.color;
      var fs = Math.round(f.size);
      ctx2d.font = floatieFonts[fs] || (floatieFonts[fs] = 'bold ' + fs + 'px ' + _szGameUIFont);
      ctx2d.fillText(f.text, f.x, f.y);
    }
    try { ctx2d.globalAlpha = prev; } catch (e) {}
  }
  function shockwave(x, y, radius, seconds, color) {
    if (shockwaves.active.length >= MAX_SHOCKWAVES) {
      warnOnce('shockwaves', 'muitas ondas de choque de uma vez (teto ' + MAX_SHOCKWAVES + ')');
      return;
    }
    var s = shockwaves.free.pop() || {};
    s.x = num(x, 0); s.y = num(y, 0); s.r = Math.max(1, num(radius, 200)); s.t = 0;
    s.secs = Math.max(0.05, num(seconds, 0.4));
    s.color = text(color, '#ffffff');
    shockwaves.active.push(s);
  }
  function stepShockwaves(dt) {
    for (var i = shockwaves.active.length - 1; i >= 0; i--) {
      var s = shockwaves.active[i];
      s.t += dt;
      if (s.t >= s.secs) {
        var last = shockwaves.active.length - 1;
        shockwaves.active[i] = shockwaves.active[last];
        shockwaves.active.pop();
        shockwaves.free.push(s);
      }
    }
  }
  function drawShockwaves() {
    if (!ctx2d || !shockwaves.active.length) return;
    var prev = 1;
    try { prev = ctx2d.globalAlpha; } catch (e) {}
    for (var i = 0; i < shockwaves.active.length; i++) {
      var s = shockwaves.active[i];
      var k = Math.min(1, s.t / s.secs);
      try { ctx2d.globalAlpha = 0.9 * (1 - k); } catch (e) {}
      ctx2d.fillStyle = s.color;
      ctx2d.beginPath();
      try { ctx2d.arc(s.x, s.y, Math.max(1, s.r * k), 0, Math.PI * 2); ctx2d.fill(); } catch (e) {}
    }
    try { ctx2d.globalAlpha = prev; } catch (e) {}
  }
  function trailOn(who, color, size, rate, life) {
    if (!who || typeof who !== 'object') return;
    if (!who._trailOn) trailed.push(who);
    who._trailOn = true;
    who._trailColor = text(color, '#ffffff');
    who._trailSize = Math.max(1, num(size, 3));
    who._trailRate = Math.max(1, Math.min(60, num(rate, 30)));
    who._trailLife = Math.max(0.05, Math.min(3, num(life, 0.4)));
  }
  function trailOff(who) { if (who && typeof who === 'object') who._trailOn = false; }
  function stepTrails(dt) {
    for (var i = trailed.length - 1; i >= 0; i--) {
      var e = trailed[i];
      if (!e || e._trailOn !== true || e._active === false) {
        if (e) e._trailOn = false;
        trailed[i] = trailed[trailed.length - 1];
        trailed.pop();
        continue;
      }
      if (e._trailFrame === frameCount) continue;
      e._trailFrame = frameCount;
      e._trailAcc = num(e._trailAcc, 0) + e._trailRate * dt;
      while (e._trailAcc >= 1) {
        e._trailAcc -= 1;
        if (particles.active.length >= MAX_PARTICLES) { e._trailAcc = 0; break; }
        var p = particles.free.pop() || {};
        p.x = centerX(e) + (Math.random() - 0.5) * e.w * 0.3;
        p.y = centerY(e) + (Math.random() - 0.5) * e.h * 0.3;
        p.vx = (Math.random() - 0.5) * 30; p.vy = (Math.random() - 0.5) * 30;
        p.life = e._trailLife; p.max = e._trailLife; p.size = e._trailSize;
        p.color = e._trailColor; p.gravity = 0;
        particles.active.push(p);
      }
    }
  }
  function leanOnMove(who, degrees) {
    if (!who || typeof who !== 'object') return;
    who._leanMax = num(degrees, 10);
  }
  function scrollImage(name, vx, vy) {
    var k = text(name, '');
    ensureImageLoaded(k);
    var rec = images[k];
    if (!rec) { warnOnce('scroll:' + k, 'a imagem "' + k + '" não está no projeto'); return; }
    if (!rec.loaded || !rec.img || !ctx2d) return;
    var iw = Math.max(1, num(rec.img.width, 1));
    var ih = Math.max(1, num(rec.img.height, 1));
    if ((config.w / iw + 2) * (config.h / ih + 2) > 4096) {
      warnOnce('scrollsmall:' + k, 'a imagem "' + k + '" é pequena demais para rolar de fundo');
      return;
    }
    var st = scrolls[k] || (scrolls[k] = { ox: 0, oy: 0, frame: -1 });
    if (st.frame !== frameCount && state === 'jogando') {
      st.frame = frameCount;
      st.ox += num(vx, 0) * currentDt; st.oy += num(vy, 0) * currentDt;
    }
    var camX = camera.on ? camera.x : 0;
    var camY = camera.on ? camera.y : 0;
    var mx = (((camX - st.ox) % iw) + iw) % iw;
    var my = (((camY - st.oy) % ih) + ih) % ih;
    var x0 = camX - mx; var y0 = camY - my;
    for (var ty = y0; ty < camY + config.h; ty += ih) {
      for (var tx = x0; tx < camX + config.w; tx += iw) {
        try { ctx2d.drawImage(rec.img, tx, ty, iw, ih); } catch (e) {}
      }
    }
  }
  function parallaxLayer(name, fx, fy) {
    var k = text(name, '');
    ensureImageLoaded(k);
    var rec = images[k];
    if (!rec) { warnOnce('parallax:' + k, 'a imagem "' + k + '" não está no projeto'); return; }
    if (!rec.loaded || !rec.img || !ctx2d) return;
    if (!camera.on) warnOnce('parallaxcam:' + k, 'a paralaxe precisa da câmera ligada — use "A câmera segue"');
    var iw = Math.max(1, num(rec.img.width, 1));
    var ih = Math.max(1, num(rec.img.height, 1));
    if ((config.w / iw + 2) * (config.h / ih + 2) > 4096) {
      warnOnce('parallaxsmall:' + k, 'a imagem "' + k + '" é pequena demais para o fundo');
      return;
    }
    var camX = camera.on ? camera.x : 0; var camY = camera.on ? camera.y : 0;
    var pfx = Math.max(0, Math.min(1, num(fx, 0.3)));
    var pfy = Math.max(0, Math.min(1, num(fy, 1)));
    var ax = camX * (1 - pfx); var ay = camY * (1 - pfy);
    var mx = (((camX - ax) % iw) + iw) % iw;
    var my = (((camY - ay) % ih) + ih) % ih;
    var x0 = camX - mx; var y0 = camY - my;
    for (var ty = y0; ty < camY + config.h; ty += ih) {
      for (var tx = x0; tx < camX + config.w; tx += iw) {
        try { ctx2d.drawImage(rec.img, tx, ty, iw, ih); } catch (e) {}
      }
    }
  }
  function sheetBurst(name, frames, fps, x, y, size) {
    if (sheetBursts.active.length >= MAX_SHEET_BURSTS) {
      warnOnce('sheetbursts', 'muitas explosões de folha ao mesmo tempo (teto ' + MAX_SHEET_BURSTS + ')');
      return;
    }
    var k = text(name, '');
    ensureImageLoaded(k);
    var rec = images[k];
    if (!rec) { warnOnce('sheetburst:' + k, 'a imagem "' + k + '" não está no projeto'); return; }
    if (!rec.loaded || !rec.img) return;
    var s = sheetBursts.free.pop() || {};
    s.img = rec.img; s.frames = Math.max(1, Math.round(num(frames, 4)));
    s.fps = Math.max(1, num(fps, 12)); s.x = num(x, 0); s.y = num(y, 0);
    s.size = Math.max(4, num(size, 64)); s.t = 0;
    sheetBursts.active.push(s);
  }
  function stepSheetBursts(dt) {
    for (var i = sheetBursts.active.length - 1; i >= 0; i--) {
      var s = sheetBursts.active[i];
      s.t += dt;
      if (Math.floor(s.t * s.fps) >= s.frames) {
        var last = sheetBursts.active.length - 1;
        sheetBursts.active[i] = sheetBursts.active[last];
        sheetBursts.active.pop();
        sheetBursts.free.push(s);
      }
    }
  }
  function drawSheetBursts() {
    if (!ctx2d || !sheetBursts.active.length) return;
    for (var i = 0; i < sheetBursts.active.length; i++) {
      var s = sheetBursts.active[i];
      var idx = Math.min(s.frames - 1, Math.floor(s.t * s.fps));
      var fw = Math.max(1, num(s.img.width, s.frames) / s.frames);
      try {
        ctx2d.drawImage(s.img, idx * fw, 0, fw, num(s.img.height, s.size),
          s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      } catch (e) {}
    }
  }

  // ---- 🎨 Aparências (looks) ----
  function defineLook(name, fn, baseW, baseH) {
    var k = text(name, '');
    if (!k || typeof fn !== 'function') return;
    looks[k] = {
      fn: fn,
      baseW: Math.max(1, num(baseW, 40)),
      baseH: Math.max(1, num(baseH, 40))
    };
  }
  function drawLook(name, x, y, w, h) {
    if (!ctx2d) return;
    var k = text(name, '');
    var look = looks[k];
    if (!look || typeof look.fn !== 'function') return;
    ctx2d.save();
    ctx2d.translate(num(x, 0), num(y, 0));
    paintLook(look, k, w, h);
    ctx2d.restore();
  }

  // ---- 🖥️ HUD & Missão ----
  function drawBar(current, max, x, y, w, h, color) {
    if (!ctx2d) return;
    var m = num(max, 100);
    if (!(m > 0)) m = 100;
    var frac = Math.max(0, Math.min(1, num(current, 0) / m));
    var bx = num(x, 20); var by = num(y, 20);
    var bw = Math.max(1, num(w, 200)); var bh = Math.max(1, num(h, 16));
    ctx2d.save();
    ctx2d.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx2d.fillRect(bx, by, bw, bh);
    ctx2d.fillStyle = text(color, config.accent); ctx2d.fillRect(bx, by, bw * frac, bh);
    ctx2d.strokeStyle = 'white'; ctx2d.lineWidth = 2; ctx2d.strokeRect(bx, by, bw, bh);
    ctx2d.restore();
  }
  function drawTimer(x, y) {
    if (!ctx2d) return;
    var mins = Math.floor(playTime / 60); var secs = Math.floor(playTime % 60);
    var label = mins + ':' + (secs < 10 ? '0' + secs : '' + secs);
    ctx2d.save();
    ctx2d.fillStyle = config.accent; ctx2d.font = '28px ' + _szGameUIFont;
    try { ctx2d.textAlign = 'left'; } catch (e) {}
    ctx2d.fillText(label, num(x, 20), num(y, 40));
    ctx2d.restore();
  }

  // ---- Cenário de fundo: o desenho do Pinta cobrindo a tela ----
  // Fica no MOTOR (pintado no render(), antes do translate da câmera) e não numa
  // camada de decoração porque o cenário é o chão de tudo: se dependesse de a
  // criança lembrar de desenhá-lo primeiro, um bloco fora de ordem apagaria o
  // fundo dela sem explicação.
  var _backdropName = '';
  /**
   * COBRE a área visível sem entortar, centralizado. Uma geometria só, usada
   * pelos DOIS blocos (o fixo e o por-quadro), para que trocar de bloco não mude
   * o visual; ox/oy existem porque o motor pinta ANTES do translate da câmera
   * (origem 0,0) e o bloco por-quadro pinta DEPOIS (origem na câmera, igual ao
   * drawBackground) — os dois cobrem exatamente os mesmos pixels.
   *
   * "Cobrir" e não "esticar" nem "caber": esticar deforma o boneco que ela
   * desenhou e ela vê que ficou errado sem saber consertar; caber deixa faixas
   * lisas nas laterais e lê como defeito. Cobrir corta um pouco de céu e de
   * chão, e lê como "a câmera está mais perto".
   */
  function _paintBackdrop(name, ox, oy) {
    if (!ctx2d || !name) return false;
    ensureImageLoaded(name);
    var entry = images[name];
    var img = entry && entry.loaded ? entry.img : null;
    if (!img) return false; // ainda carregando, ou nome errado (o loadImage já avisou)
    var sw = img.naturalWidth || img.width || 0;
    var sh = img.naturalHeight || img.height || 0;
    var cw = config.w, ch = config.h;
    if (!(sw > 0) || !(sh > 0) || !(cw > 0) || !(ch > 0)) return false;
    var scale = Math.max(cw / sw, ch / sh);
    var dw = sw * scale, dh = sh * scale;
    // O canvas inteiro roda com smoothing DESLIGADO (pixel art nítida). Ampliar
    // um cenário pequeno agradece isso; reduzir um grande fica serrilhado, então
    // só nesse caso religamos, e devolvemos como estava.
    var smooth = scale < 1;
    if (smooth) { try { ctx2d.imageSmoothingEnabled = true; } catch (e) {} }
    try {
      ctx2d.drawImage(img, num(ox, 0) + (cw - dw) / 2, num(oy, 0) + (ch - dh) / 2, dw, dh);
    } catch (e) {}
    if (smooth) { try { ctx2d.imageSmoothingEnabled = false; } catch (e) {} }
    return true;
  }
  /** Fixa o cenário: o motor repinta a cada quadro, sem a criança fazer nada. */
  function setBackdrop(name) {
    _backdropName = text(name, '');
    if (_backdropName) ensureImageLoaded(_backdropName);
  }
  /** Desenha o cenário AGORA, neste ponto do quadro (dentro do "Desenhar o jogo"). */
  function drawBackdrop(name) {
    var on = camera.on;
    return _paintBackdrop(text(name, ''), on ? camera.x : 0, on ? camera.y : 0);
  }
`
