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
    var sp = (typeof speed === 'number' && Number.isFinite(speed)) ? Math.max(0, speed) : 3;
    var dx = (b.x + (b.w || 0) / 2) - (a.x + (a.w || 0) / 2);
    var dy = (b.y + (b.h || 0) / 2) - (a.y + (a.h || 0) / 2);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!len || !sp) { a.vx = 0; a.vy = 0; return; }
    var step = Math.min(sp, len);
    var stepX = dx / len * step;
    var stepY = dy / len * step;
    a.x += stepX;
    a.y += stepY;
    a.vx = stepX;
    a.vy = stepY;
  }
  // Sorteia um número inteiro de min a max (inclusive).
  function randomBetween(min, max) {
    var rawLo = (typeof min === 'number' && Number.isFinite(min)) ? min : 0;
    var rawHi = (typeof max === 'number' && Number.isFinite(max)) ? max : 1;
    if (rawHi < rawLo) { var t = rawLo; rawLo = rawHi; rawHi = t; }
    var lo = Math.ceil(rawLo);
    var hi = Math.floor(rawHi);
    // Um intervalo como 0,2..0,8 não contém inteiro. Nesse caso impossível,
    // escolhemos deterministicamente o inteiro mais próximo do centro.
    if (lo > hi) return Math.round((rawLo + rawHi) / 2);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }
  // Verdadeiro com a chance dada (em %). Ex.: randomChance(30) ~ 30% das vezes.
  function randomChance(percent) {
    var p = (typeof percent === 'number') ? percent : 50;
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
  function setHealth(s, n) {
    if (!s) return;
    var valid = typeof n === 'number' && Number.isFinite(n);
    if (!valid) warnOnce('vida-inicial-invalida', 'a vida inicial precisa ser um número; usei 0.');
    var v = valid ? Math.max(0, Math.floor(n)) : 0;
    s.hp = v; s.hpMax = v;
  }
  function changeHealth(s, delta) {
    if (!s) return;
    if (!_hasInitializedHealth(s)) { _warnHealthNotInitialized(); return; }
    if (typeof delta !== 'number' || !Number.isFinite(delta)) {
      warnOnce('mudanca-de-vida-invalida', 'a mudança de vida precisa ser um número.');
      return;
    }
    var d = Math.trunc(delta);
    s.hp = Math.max(0, Math.min(s.hp + d, s.hpMax));
    // Perdeu vida = "tomando dano" por alguns quadros (a animação por estado
    // lê isto; decrementa no autoAnimate — único leitor).
    if (d < 0) s.hurtFrames = HURT_FRAMES;
  }
  function getHealth(s) { return _hasInitializedHealth(s) ? s.hp : 0; }
  function getMaxHealth(s) { return _hasInitializedHealth(s) ? s.hpMax : 0; }
  function hasHealth(s) {
    if (!_hasInitializedHealth(s)) { _warnHealthNotInitialized(); return false; }
    return s.hp > 0;
  }
  function healthDepleted(s) {
    if (!_hasInitializedHealth(s)) { _warnHealthNotInitialized(); return false; }
    return s.hp <= 0;
  }
  function isInvincible(s) { return !!s && (s.blinkFrames || 0) > 0; }
  function damageSprite(s, amount, invincibilityFrames) {
    if (!s || isInvincible(s)) return;
    if (!_hasInitializedHealth(s)) { _warnHealthNotInitialized(); return; }
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      warnOnce('dano-invalido', 'o dano precisa ser um número.');
      return;
    }
    var damage = Math.max(0, Math.floor(Math.abs(amount)));
    if (damage <= 0) return;
    var before = s.hp;
    changeHealth(s, -damage);
    if (s.hp < before) {
      var frames = (typeof invincibilityFrames === 'number' && Number.isFinite(invincibilityFrames))
        ? Math.max(1, Math.floor(invincibilityFrames))
        : 45;
      blink(s, frames);
    }
  }
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
  function randomX() { var visible = _visibleWorldRect(ensureStage()); return visible.left + Math.random() * visible.width; }
  function randomY() { var visible = _visibleWorldRect(ensureStage()); return visible.top + Math.random() * visible.height; }
  // Verdadeiro no máximo a cada "frames" quadros (recarga POR sprite). Use num "se".
  function cooldownReady(s, frames, key) {
    if (!s) return false;
    var n = (typeof frames === 'number' && Number.isFinite(frames) && frames > 0) ? Math.round(frames) : 1;
    var id = (typeof key === 'string' && key) ? key : 'default';
    if (!s._cooldowns || typeof s._cooldowns !== 'object') s._cooldowns = Object.create(null);
    if (typeof s._cooldowns[id] !== 'number') s._cooldowns[id] = 0;
    if (s._cooldowns[id] > 0) { s._cooldowns[id] -= 1; return false; }
    s._cooldowns[id] = Math.max(0, n - 1);
    return true;
  }
  // Tira do grupo quem "nasceu" há mais de N segundos (tempo de vida).
  function pruneOld(group, seconds) {
    if (!group || !group.items) return;
    var max = (typeof seconds === 'number' ? seconds : 3) * 1000;
    var t = now();
    for (var i = group.items.length - 1; i >= 0; i--) {
      var s = group.items[i];
      if (!s) { group.items.splice(i, 1); _touchGroup(group); continue; }
      if (typeof s._born !== 'number') s._born = t;
      if (t - s._born > max) { group.items.splice(i, 1); _touchGroup(group); }
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
    var visible = _visibleWorldRect(c);
    if (s.x + (s.w || 0) < visible.left) s.x = visible.right;
    else if (s.x > visible.right) s.x = visible.left - (s.w || 0);
    if (s.y + (s.h || 0) < visible.top) s.y = visible.bottom;
    else if (s.y > visible.bottom) s.y = visible.top - (s.h || 0);
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
  }
  function resumeGame() {
    if (!_paused) return;
    _resumeGameClock();
    _paused = false;
    _resumeRuntimeDomains();
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
    if (i >= 0) { group.items.splice(i, 1); group.items.push(s); _touchGroup(group); }
  }
  function sendToBack(group, s) {
    if (!group || !group.items) return;
    var i = group.items.indexOf(s);
    if (i >= 0) { group.items.splice(i, 1); group.items.unshift(s); _touchGroup(group); }
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
