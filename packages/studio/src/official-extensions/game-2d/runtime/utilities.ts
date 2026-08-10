export const gameTwoDUtilitiesRuntime = `  // ===== Genéricos Tier 1: mira/contas, vida/tempo, aparência, mundo, pausa =====
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
    _recordPreviousPosition(a);
    var sp = Math.max(0, _finiteNumber(speed, 3));
    var dx = (b.x + (b.w || 0) / 2) - (a.x + (a.w || 0) / 2);
    var dy = (b.y + (b.h || 0) / 2) - (a.y + (a.h || 0) / 2);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!len || !sp) { a.vx = 0; a.vy = 0; _commitRecordedMotion(a); return; }
    var step = Math.min(sp, len);
    var stepX = dx / len * step;
    var stepY = dy / len * step;
    a.x += stepX;
    a.y += stepY;
    a.vx = stepX;
    a.vy = stepY;
    _commitRecordedMotion(a);
  }
  // Sorteia um número inteiro de min a max (inclusive).
  function randomBetween(min, max) {
    var rawLo = _finiteNumber(min, 0);
    var rawHi = _finiteNumber(max, 1);
    if (rawHi < rawLo) { var t = rawLo; rawLo = rawHi; rawHi = t; }
    // Fora do intervalo seguro, JavaScript deixa de representar cada inteiro.
    // Limitar aqui também impede que (hi - lo + 1) transborde para Infinity.
    var minSafeInteger = -9007199254740991;
    var maxSafeInteger = 9007199254740991;
    rawLo = Math.max(minSafeInteger, Math.min(maxSafeInteger, rawLo));
    rawHi = Math.max(minSafeInteger, Math.min(maxSafeInteger, rawHi));
    var lo = Math.ceil(rawLo);
    var hi = Math.floor(rawHi);
    // Um intervalo como 0,2..0,8 não contém inteiro. Nesse caso impossível,
    // escolhemos deterministicamente o inteiro mais próximo do centro.
    if (lo > hi) return Math.round((rawLo + rawHi) / 2);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }
  // Verdadeiro com a chance dada (em %). Ex.: randomChance(30) ~ 30% das vezes.
  function randomChance(percent) {
    var p = _finiteNumber(percent, 50);
    if (p <= 0) return false;
    if (p >= 100) return true;
    return Math.random() * 100 < p;
  }
  // ---- Vida e tempo do sprite ----
  function _hasInitializedHealth(s) {
    return !!s && Number.isFinite(s.hp) && Number.isFinite(s.hpMax);
  }
  function _warnHealthNotInitialized() {
    warnOnce(
      'vida-nao-inicializada',
      'este sprite ainda não tem vidas. Use “Dar ao sprite … de vida” em “Ao iniciar” antes de mudar ou perguntar pelas vidas.'
    );
  }
  function setHealth(sprite, health) {
    if (!sprite) return;
    var valid = _isFiniteNumber(health);
    if (!valid) warnOnce('vida-inicial-invalida', 'a vida inicial precisa ser um número; usei 0.');
    var v = valid ? Math.max(0, Math.floor(health)) : 0;
    sprite.hp = v; sprite.hpMax = v;
  }
  function changeHealth(sprite, delta) {
    if (!sprite) return;
    if (!_hasInitializedHealth(sprite)) { _warnHealthNotInitialized(); return; }
    if (!_isFiniteNumber(delta)) {
      warnOnce('mudanca-de-vida-invalida', 'a mudança de vida precisa ser um número.');
      return;
    }
    var d = Math.trunc(delta);
    sprite.hp = Math.max(0, Math.min(sprite.hp + d, sprite.hpMax));
    // Perdeu vida = "tomando dano" por alguns quadros (a animação por estado
    // lê isto; decrementa no autoAnimate — único leitor).
    if (d < 0) sprite.hurtFrames = HURT_FRAMES;
  }
  function getHealth(sprite) { return _hasInitializedHealth(sprite) ? sprite.hp : 0; }
  function getMaxHealth(sprite) { return _hasInitializedHealth(sprite) ? sprite.hpMax : 0; }
  function hasHealth(sprite) {
    if (!_hasInitializedHealth(sprite)) { _warnHealthNotInitialized(); return false; }
    return sprite.hp > 0;
  }
  function healthDepleted(sprite) {
    if (!_hasInitializedHealth(sprite)) { _warnHealthNotInitialized(); return false; }
    return sprite.hp <= 0;
  }
  function isInvincible(sprite) { return !!sprite && (sprite.blinkFrames || 0) > 0; }
  function damageSprite(sprite, amount, invincibilityFrames) {
    if (!sprite || isInvincible(sprite)) return;
    if (!_hasInitializedHealth(sprite)) { _warnHealthNotInitialized(); return; }
    if (!_isFiniteNumber(amount)) {
      warnOnce('dano-invalido', 'o dano precisa ser um número.');
      return;
    }
    var damage = Math.max(0, Math.floor(Math.abs(amount)));
    if (damage <= 0) return;
    var before = sprite.hp;
    changeHealth(sprite, -damage);
    if (sprite.hp < before) {
      var frames = _isFiniteNumber(invincibilityFrames)
        ? Math.max(1, Math.floor(invincibilityFrames))
        : 45;
      blink(sprite, frames);
    }
  }
  // Geometria do sprite (valores prontos p/ a criança não precisar fazer x+w/2 na mão).
  function spriteX(sprite) { return sprite ? _finiteNumber(sprite.x, 0) : 0; }
  function spriteY(sprite) { return sprite ? _finiteNumber(sprite.y, 0) : 0; }
  function spriteW(sprite) { return sprite ? _finiteNumber(sprite.w, 0) : 0; }
  function spriteH(sprite) { return sprite ? _finiteNumber(sprite.h, 0) : 0; }
  function centerX(sprite) { return sprite ? _finiteNumber(sprite.x, 0) + _finiteNumber(sprite.w, 0) / 2 : 0; }
  function centerY(sprite) { return sprite ? _finiteNumber(sprite.y, 0) + _finiteNumber(sprite.h, 0) / 2 : 0; }
  // Velocidade do sprite (vx/vy) — valores prontos p/ ler/decidir. "Movendo" usa um
  // limiar pequeno (abaixo dele é resíduo sub-pixel do atrito, invisível na tela).
  function spriteVx(sprite) { return sprite ? _finiteNumber(sprite.vx, 0) : 0; }
  function spriteVy(sprite) { return sprite ? _finiteNumber(sprite.vy, 0) : 0; }
  function spriteSpeed(sprite) { var vx = spriteVx(sprite), vy = spriteVy(sprite); return Math.sqrt(vx * vx + vy * vy); }
  function isMovingH(sprite) { return !!sprite && Math.abs(_finiteNumber(sprite.vx, 0)) > 0.01; }
  function isMovingV(sprite) { return !!sprite && Math.abs(_finiteNumber(sprite.vy, 0)) > 0.01; }
  function isMoving(sprite) { return isMovingH(sprite) || isMovingV(sprite); }
  // Posição aleatória NA TELA — DINÂMICO: lê o tamanho REAL do palco a cada chamada
  // (largura lógica do jogo, ou o canvas), nunca um valor fixo. Evita a continha
  // Math.random()*largura na mão. Use no x/y ao criar/spawnar um sprite.
  // ⚠️ NÃO acrescente um parâmetro de "tamanho reservado" aqui (já foi tentado
  // em 0.55.2 e revertido — ver a nota no blockCatalogFundamentals).
  function randomX() { var visible = _visibleWorldRect(ensureStage()); return visible.left + Math.random() * visible.width; }
  function randomY() { var visible = _visibleWorldRect(ensureStage()); return visible.top + Math.random() * visible.height; }
  // Verdadeiro no máximo a cada "frames" quadros (recarga POR sprite). Use num "se".
  function cooldownReady(sprite, frames, key) {
    if (!sprite) return false;
    var n = (_isFiniteNumber(frames) && frames > 0) ? Math.round(frames) : 1;
    var id = (typeof key === 'string' && key) ? key : 'default';
    if (!sprite._cooldowns || typeof sprite._cooldowns !== 'object') sprite._cooldowns = Object.create(null);
    if (typeof sprite._cooldowns[id] !== 'number') sprite._cooldowns[id] = 0;
    if (sprite._cooldowns[id] > 0) { sprite._cooldowns[id] -= 1; return false; }
    sprite._cooldowns[id] = Math.max(0, n - 1);
    return true;
  }
  // Tira do grupo quem "nasceu" há mais de N segundos (tempo de vida).
  function pruneOld(group, seconds) {
    if (!group || !group.items) return;
    var max = _finiteNumber(seconds, 3) * 1000;
    var t = now();
    for (var i = group.items.length - 1; i >= 0; i--) {
      var s = group.items[i];
      if (!s) { _removeGroupItemAt(group, i); continue; }
      if (typeof s._born !== 'number') s._born = t;
      if (t - s._born > max) _removeGroupItemAt(group, i);
    }
  }
  // ---- Aparência do sprite (espelhar, transparência, tamanho) ----
  function flipSprite(sprite, direction) { if (sprite) sprite.facing = (direction === 'left') ? -1 : 1; }
  function setOpacity(sprite, percent) {
    if (!sprite) return;
    var p = _finiteNumber(percent, 100);
    sprite.opacity = Math.max(0, Math.min(1, p / 100));
  }
  /**
   * Coloca o sprite em outro ponto sem transformar o teleporte em movimento
   * contínuo. É a única saída dos blocos de posição e também serve ao modo Código.
   */
  function setPosition(sprite, x, y) {
    if (!sprite) return;
    sprite.x = _finiteNumber(x, _finiteNumber(sprite.x, 0));
    sprite.y = _finiteNumber(y, _finiteNumber(sprite.y, 0));
    _detachGroundSupport(sprite);
    _recordPreviousPosition(sprite);
    _commitRecordedMotion(sprite);
  }
  function setSize(sprite, width, height) {
    if (!sprite) return;
    if (_isFiniteNumber(width) && width > 0) sprite.w = width;
    if (_isFiniteNumber(height) && height > 0) sprite.h = height;
  }
  function scaleSprite(sprite, factor) {
    if (!sprite) return;
    var f = (_isFiniteNumber(factor) && factor > 0) ? factor : 1;
    var sx = _finiteNumber(sprite.x, 0), sy = _finiteNumber(sprite.y, 0);
    var sw = _finiteNumber(sprite.w, 0), sh = _finiteNumber(sprite.h, 0);
    var cx = sx + sw / 2, cy = sy + sh / 2;
    sprite.w = sw * f; sprite.h = sh * f;
    setPosition(sprite, cx - sprite.w / 2, cy - sprite.h / 2);
  }
  // ---- Mundo: dar a volta na tela (Pac-Man/Asteroids) ----
  function wrapEdges(sprite) {
    if (!sprite) return;
    var c = ensureStage();
    var visible = _visibleWorldRect(c);
    var x = sprite.x, y = sprite.y;
    if (x + (sprite.w || 0) < visible.left) x = visible.right;
    else if (x > visible.right) x = visible.left - (sprite.w || 0);
    if (y + (sprite.h || 0) < visible.top) y = visible.bottom;
    else if (y > visible.bottom) y = visible.top - (sprite.h || 0);
    if (x !== sprite.x || y !== sprite.y) setPosition(sprite, x, y);
  }
  // ---- Estado do jogo: pausa. "Pausar o jogo" CONGELA o gameLoop (o tick para de
  // rodar o quadro do aluno); "Continuar o jogo" descongela. "está pausado?" lê o
  // estado (útil em eventos de tecla). ----
  var _paused = false;
  function pauseGame() {
    if (_paused) return;
    _pauseGameClock();
    _paused = true;
    _suspendDriver();
    _pauseRuntimeDomains();
    _announceGameStatus('Jogo pausado.');
  }
  function resumeGame() {
    if (!_paused) return;
    _resumeGameClock();
    _paused = false;
    _resumeRuntimeDomains();
    _announceGameStatus('Jogo continuado.');
    _ensureDriver();
  }
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
  function cameraFollow(sprite, worldWidth, worldHeight) {
    if (!sprite) return;
    var c = ensureStage();
    var vw = c ? stageW(c) : 0, vh = c ? stageH(c) : 0;
    var x = (_finiteNumber(sprite.x, 0) + _finiteNumber(sprite.w, 0) / 2) - vw / 2;
    var y = (_finiteNumber(sprite.y, 0) + _finiteNumber(sprite.h, 0) / 2) - vh / 2;
    // Presa às bordas do mundo. Se o mundo não for maior que a tela num eixo, a
    // câmera fica em 0 nesse eixo (ex.: plataforma horizontal mantém o chão embaixo).
    if (_isFiniteNumber(worldWidth) && worldWidth > 0) x = Math.max(0, Math.min(x, Math.max(0, worldWidth - vw)));
    if (_isFiniteNumber(worldHeight) && worldHeight > 0) y = Math.max(0, Math.min(y, Math.max(0, worldHeight - vh)));
    camera.x = x; camera.y = y;
  }
  function setCamera(x, y) {
    camera.x = _finiteNumber(x, 0);
    camera.y = _finiteNumber(y, 0);
  }
  function cameraX() { return camera.x; }
  function cameraY() { return camera.y; }
  function _visibleWorldRect(ctx) {
    var width = stageW(ctx), height = stageH(ctx);
    // Mesmo antes de getContext ficar disponível, o canvas já conhece o tamanho.
    // Isso mantém helpers sem argumento ctx coerentes com o palco real.
    if (!width && _stageCanvas) width = _logicalW || _stageCanvas.width || 0;
    if (!height && _stageCanvas) height = _logicalH || _stageCanvas.height || 0;
    return {
      left: camera.x,
      top: camera.y,
      right: camera.x + width,
      bottom: camera.y + height,
      width: width,
      height: height
    };
  }
  // ---- Mapa destrutível: muda/quebra/lê o tile na posição de um sprite ----
  function setTileAt(map, px, py, index) {
    if (!map || !map.rows || !map.tile) return;
    var t = tileScreenSize(map);
    if (!_isFiniteNumber(px) || !_isFiniteNumber(py) || t <= 0) return;
    var ox = map.layout ? _finiteNumber(map.layout.x, 0) : _finiteNumber(map.ox, 0);
    var oy = map.layout ? _finiteNumber(map.layout.y, 0) : _finiteNumber(map.oy, 0);
    var col = Math.floor((px - ox) / t);
    var row = Math.floor((py - oy) / t);
    if (row < 0 || row >= map.rows.length) return;
    var r = map.rows[row];
    if (!r || col < 0 || col >= r.length) return;
    r[col] = _isFiniteNumber(index) ? Math.floor(index) : -1;
  }
  function _spriteCenter(s) { return { x: s.x + (s.w || 0) / 2, y: s.y + (s.h || 0) / 2 }; }
  function breakTileAtSprite(map, sprite) {
    if (sprite) { var p = _spriteCenter(sprite); setTileAt(map, p.x, p.y, -1); }
  }
  function setTileAtSprite(map, index, sprite) {
    if (sprite) { var p = _spriteCenter(sprite); setTileAt(map, p.x, p.y, index); }
  }
  function tileAtSprite(map, sprite) {
    if (!sprite) return -1;
    var p = _spriteCenter(sprite);
    return tileAt(map, p.x, p.y);
  }
  // ---- Ordem de desenho dentro de um grupo (frente = desenhado por último) ----
  function bringToFront(group, sprite) {
    if (!group || !group.items) return;
    if (_isEnemyMirror(group)) {
      _warnEnemyMirror(
        'a ordem de desenho',
        'Reordenar este grupo nao dura, porque ele e montado dos tipos a cada mudanca. Para mandar na ordem, desenhe um tipo depois do outro com "Desenhar os inimigos do tipo ...".'
      );
      return;
    }
    var i = group.items.indexOf(sprite);
    if (i >= 0) {
      var ordered = group.items.slice();
      ordered.splice(i, 1);
      ordered.push(sprite);
      group.items = ordered;
      _touchUnmanagedGroup(group);
    }
  }
  function sendToBack(group, sprite) {
    if (!group || !group.items) return;
    if (_isEnemyMirror(group)) {
      _warnEnemyMirror(
        'a ordem de desenho',
        'Reordenar este grupo nao dura, porque ele e montado dos tipos a cada mudanca. Para mandar na ordem, desenhe um tipo depois do outro com "Desenhar os inimigos do tipo ...".'
      );
      return;
    }
    var i = group.items.indexOf(sprite);
    if (i >= 0) {
      var ordered = group.items.slice();
      ordered.splice(i, 1);
      ordered.unshift(sprite);
      group.items = ordered;
      _touchUnmanagedGroup(group);
    }
  }
  // ---- Depuração: caixa de colisão e contador de FPS ----
  function drawHitbox(sprite) {
    if (!sprite) return;
    var c = ensureStage();
    if (!c) return;
    var camOn = camera.x !== 0 || camera.y !== 0;
    if (camOn) { c.save(); c.translate(-camera.x, -camera.y); }
    c.save();
    c.strokeStyle = '#ff2d95';
    c.lineWidth = 2;
    // Desenha a caixa EFETIVA (com o dial de N%) — o raio-X da colisão perdoadora.
    var box = _hitboxOf(sprite);
    c.strokeRect(box.x, box.y, box.w || 0, box.h || 0);
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
    c.fillText('FPS: ' + _fpsValue, _finiteNumber(x, 8), _finiteNumber(y, 20));
    c.restore();
  }

  _registerRuntimeDomain('utilities', {
    reset: function () {
      _paused = false;
      _resetGameClock();
      camera.x = 0;
      camera.y = 0;
      _fpsLast = 0;
      _fpsFrames = 0;
      _fpsValue = 0;
    }
  });

`
