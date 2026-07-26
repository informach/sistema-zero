export const gameTwoDPhysicsRuntime = `  // ---- Física ----
  // Mundo com gravidade (px/frame² aplicada ao eixo Y por applyVelocity).
  // configured distingue "nenhuma gravidade declarada" da gravidade 0. Assim
  // inimigos top-down não caem por inferência e valores 0/negativos mantêm o
  // mesmo significado em todos os helpers físicos.
  var world = { gravity: 0, gravityConfigured: false };
  function setGravity(g) {
    if (!_isFiniteNumber(g)) {
      warnOnce('gravidade-invalida', 'a gravidade precisa ser um número finito; mantive o valor anterior.');
      return;
    }
    world.gravity = g;
    world.gravityConfigured = true;
  }
  function _worldGravityOr(fallback) {
    return world.gravityConfigured ? world.gravity : fallback;
  }
  function _gravityPullsUp(gravity) {
    return _finiteNumber(gravity, 0) < 0;
  }
  function _jumpVelocityForGravity(gravity, strength) {
    var jump = _positiveFiniteNumber(strength, 0);
    return _gravityPullsUp(gravity) ? jump : -jump;
  }
  function _isJumpingForGravity(velocityY, gravity) {
    var vy = _finiteNumber(velocityY, 0);
    return _gravityPullsUp(gravity) ? vy > 0 : vy < 0;
  }
  /**
   * Resolve a borda que funciona como chão para a gravidade atual. Gravidade
   * positiva pousa em bottom; gravidade negativa pousa em top.
   */
  function _resolveGravityGround(sprite, top, bottom, gravity) {
    if (!sprite) return false;
    var ceiling = _finiteNumber(top, 0);
    var floor = _finiteNumber(bottom, ceiling) -
      ((_isFiniteNumber(sprite.h) && sprite.h > 0) ? sprite.h : 0);
    sprite.y = _finiteNumber(sprite.y, 0);
    sprite.vy = _finiteNumber(sprite.vy, 0);
    sprite.onGround = false;
    if (_gravityPullsUp(gravity)) {
      if (sprite.y <= ceiling) {
        sprite.y = ceiling;
        sprite.vy = 0;
        sprite.onGround = true;
      }
    } else if (sprite.y >= floor) {
      sprite.y = floor;
      sprite.vy = 0;
      sprite.onGround = true;
    }
    return sprite.onGround;
  }

  /** Integra a velocidade no sprite e soma a gravidade ao vy. */
  function applyVelocity(s) {
    if (!s) return;
    // A colisão do quadro anterior pode ter marcado o chão. A integração abre
    // um novo quadro: se ainda houver apoio, collideTileMap/collideGroup/
    // collideSprite o confirma de novo depois de mover.
    s._groundedLastFrame = s.onGround === true;
    if (s.onGround === true) s.onGround = false;
    var vx = _finiteNumber(s.vx, 0), vy = _finiteNumber(s.vy, 0);
    s.x = _finiteNumber(s.x, 0) + vx;
    s.y = _finiteNumber(s.y, 0) + vy;
    s.vx = vx;
    s.vy = vy + world.gravity;
  }

  /** Faz o sprite ricochetear nas bordas do canvas (invertendo a velocidade). */
  function bounceOnEdges(s, ctx) {
    if (!s || !ctx || !ctx.canvas) return;
    var visible = _visibleWorldRect(ctx);
    if (s.x < visible.left) { s.x = visible.left; s.vx = Math.abs(s.vx || 0); }
    else if (s.x + s.w > visible.right) { s.x = visible.right - s.w; s.vx = -Math.abs(s.vx || 0); }
    if (s.y < visible.top) { s.y = visible.top; s.vy = Math.abs(s.vy || 0); }
    else if (s.y + s.h > visible.bottom) { s.y = visible.bottom - s.h; s.vy = -Math.abs(s.vy || 0); }
  }

  /** Colisão por círculo: distância dos centros < soma dos raios (≈ metade do lado). */
  function circleCollides(a, b) {
    if (!a || !b) return false;
    // O raio respeita o dial "usar área de colisão de N%"; os centros não mudam.
    var aScale = _positiveFiniteNumber(a._hitboxScale, 1);
    var bScale = _positiveFiniteNumber(b._hitboxScale, 1);
    var ar = (Math.min(a.w, a.h) / 2) * aScale, br = (Math.min(b.w, b.h) / 2) * bScale;
    var dx = (a.x + a.w / 2) - (b.x + b.w / 2);
    var dy = (a.y + a.h / 2) - (b.y + b.h / 2);
    return Math.sqrt(dx * dx + dy * dy) < ar + br;
  }

  _registerRuntimeDomain('physics', {
    reset: function () { world.gravity = 0; world.gravityConfigured = false; }
  });

`
