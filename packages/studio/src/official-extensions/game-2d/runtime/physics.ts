export const gameTwoDPhysicsRuntime = `  // ---- Física ----
  // A gravidade do mundo é uma ACELERAÇÃO (px/frame²). Ela só muda a velocidade
  // dos sprites quando applyGravity/applyGravityToGroup são chamados; definir o
  // valor do mundo, sozinho, nunca faz um objeto cair.
  var world = { gravity: 0.6 };
  function setGravity(gravity) {
    if (!_isFiniteNumber(gravity)) {
      warnOnce('gravidade-invalida', 'a gravidade precisa ser um número finito; mantive o valor anterior.');
      return;
    }
    world.gravity = gravity;
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

  /**
   * Move o sprite pela velocidade dele. NÃO mexe na gravidade — quem puxa para
   * baixo é o "Aplicar a gravidade do mundo", à parte.
   *
   * ⚠️ Até 08/2026 este helper somava \`world.gravity\` no fim, e o bloco se
   * chamava "Aplicar velocidade E gravidade". Duas coisas num bloco só: o nome
   * mentia num jogo sem gravidade (Pong) e não existia passo intermediário para
   * ENSINAR queda — a criança não via "não cai" virar "cai" por causa de um
   * bloco. Separar deixou os dois honestos.
   */
  function applyVelocity(sprite) {
    if (!sprite) return;
    // A colisão do quadro anterior pode ter marcado o chão. A integração abre
    // um novo quadro: se ainda houver apoio, collideTileMap/collideGroup/
    // collideSprite o confirma de novo depois de mover.
    sprite._groundedLastFrame = sprite.onGround === true;
    if (sprite.onGround === true) sprite.onGround = false;
    var vx = _finiteNumber(sprite.vx, 0), vy = _finiteNumber(sprite.vy, 0);
    sprite.x = _finiteNumber(sprite.x, 0) + vx;
    sprite.y = _finiteNumber(sprite.y, 0) + vy;
    sprite.vx = vx;
    sprite.vy = vy;
  }

  /**
   * Soma a gravidade DO MUNDO à velocidade vertical do sprite. Uma fonte só
   * de verdade: quem regula a força é o "Botar a
   * gravidade do mundo"; sem ninguém declarar, vale 0.6.
   *
   * ORDEM didática/física: aplicar a aceleração ANTES de integrar a posição
   * (Euler semi-implícito). Assim a queda responde no mesmo quadro e o contato
   * com o chão é mais estável.
   */
  function applyGravity(sprite) {
    if (!sprite) return;
    sprite.vy = _finiteNumber(sprite.vy, 0) + world.gravity;
  }

  /** Faz o sprite ricochetear nas bordas do canvas (invertendo a velocidade). */
  function bounceOnEdges(sprite, ctx) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var visible = _visibleWorldRect(ctx);
    if (sprite.x < visible.left) { sprite.x = visible.left; sprite.vx = Math.abs(sprite.vx || 0); }
    else if (sprite.x + sprite.w > visible.right) { sprite.x = visible.right - sprite.w; sprite.vx = -Math.abs(sprite.vx || 0); }
    if (sprite.y < visible.top) { sprite.y = visible.top; sprite.vy = Math.abs(sprite.vy || 0); }
    else if (sprite.y + sprite.h > visible.bottom) { sprite.y = visible.bottom - sprite.h; sprite.vy = -Math.abs(sprite.vy || 0); }
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
    reset: function () { world.gravity = 0.6; }
  });

`
