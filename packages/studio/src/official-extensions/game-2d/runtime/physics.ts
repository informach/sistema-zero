export const gameTwoDPhysicsRuntime = `  // ---- Física ----
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

  _registerRuntimeDomain('physics', {
    reset: function () { world.gravity = 0; }
  });

`
