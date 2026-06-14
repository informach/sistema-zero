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

  /**
   * Cria um sprite retangular. Um sprite é apenas um objeto { x, y, w, h, color, vx, vy }.
   */
  function createSprite(opts) {
    return {
      x: opts.x || 0,
      y: opts.y || 0,
      w: opts.w || 32,
      h: opts.h || 32,
      color: opts.color || '#22d3ee',
      vx: opts.vx || 0,
      vy: opts.vy || 0
    };
  }

  /**
   * Desenha o sprite no contexto 2d. Apenas um fillRect — sem mágica.
   */
  function drawSprite(ctx, sprite) {
    if (!ctx || !sprite) return;
    ctx.fillStyle = sprite.color;
    ctx.fillRect(sprite.x, sprite.y, sprite.w, sprite.h);
  }

  /**
   * Move o sprite de acordo com as setas do teclado, somando ou subtraindo
   * a velocidade fornecida em cada eixo.
   */
  function moveByKeys(sprite, speed) {
    if (!sprite) return;
    var s = typeof speed === 'number' ? speed : 3;
    if (keys.left) sprite.x -= s;
    if (keys.right) sprite.x += s;
    if (keys.up) sprite.y -= s;
    if (keys.down) sprite.y += s;
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
   */
  function gameLoop(fn) {
    var canceled = false;
    var rafId = 0;
    function tick() {
      if (canceled) return;
      try { fn(); } catch (e) { console.error(e && e.message ? e.message : e); }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return function stop() {
      canceled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
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
  /** Registra uma função chamada a cada clique/toque com a posição (x, y) no canvas. */
  function onPointer(fn) { if (typeof fn === 'function') pointerHandlers.push(fn); }

  window.SZGame2D = {
    createSprite: createSprite,
    drawSprite: drawSprite,
    moveByKeys: moveByKeys,
    isColliding: isColliding,
    gameLoop: gameLoop,
    keys: keys,
    setGravity: setGravity,
    applyVelocity: applyVelocity,
    bounceOnEdges: bounceOnEdges,
    circleCollides: circleCollides,
    playSound: playSound,
    onPointer: onPointer,
    pointer: pointer
  };
})();`
