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
   * Abre o quadro de física sem esquecer o apoio confirmado no quadro anterior.
   * O movimento pode consumir essa informação para pular; a colisão executada
   * depois do movimento precisa confirmar novamente o apoio do quadro atual.
   */
  function _beginGroundFrame(sprite) {
    if (!sprite) return false;
    var wasGrounded = sprite.onGround === true;
    sprite._groundedLastFrame = wasGrounded;
    sprite.onGround = false;
    if (!wasGrounded) sprite._groundSupport = null;
    return wasGrounded;
  }
  /** Confirma o chão atual e, quando é uma figura, guarda sua posição para transporte. */
  function _confirmGroundSupport(sprite, support) {
    if (!sprite) return;
    sprite.onGround = true;
    var candidateOwner = support && support !== sprite ? support : null;
    if (sprite._supportResolutionDepth > 0) {
      var preferred = sprite._supportPreferenceOwner || null;
      var currentOwner = sprite._groundSupport && sprite._groundSupport.owner;
      // O apoio do quadro anterior vence enquanto continuar válido. Assim um
      // obstáculo sobreposto visitado antes/depois não muda o transporte.
      if (preferred && candidateOwner !== preferred && currentOwner === preferred) return;
      if (preferred && candidateOwner !== preferred && sprite._supportCandidateChosen) return;
    }
    if (support && support !== sprite &&
        _isFiniteNumber(support.x) && _isFiniteNumber(support.y)) {
      sprite._groundSupport = {
        owner: support,
        x: support.x,
        y: support.y,
        group: sprite._supportResolutionGroup || null
      };
    } else {
      sprite._groundSupport = null;
    }
    if (sprite._supportResolutionDepth > 0) sprite._supportCandidateChosen = true;
  }
  /** Solta imediatamente o apoio (pulo, troca para movimento livre etc.). */
  function _detachGroundSupport(sprite) {
    if (!sprite) return;
    sprite.onGround = false;
    sprite._groundedLastFrame = false;
    sprite._groundSupport = null;
  }
  /**
   * Leva o passageiro pelo deslocamento que a figura de apoio já fez neste
   * quadro. O deslocamento próprio do passageiro é preservado e somado ao da base.
   */
  function _carryByGroundSupport(sprite, support) {
    if (!sprite || !support ||
        (sprite._groundedLastFrame !== true && sprite.onGround !== true)) return;
    var previous = sprite._groundSupport;
    if (!previous || previous.owner !== support) return;
    var supportX = _finiteNumber(support.x, previous.x);
    var supportY = _finiteNumber(support.y, previous.y);
    sprite.x = _finiteNumber(sprite.x, 0) + supportX - previous.x;
    sprite.y = _finiteNumber(sprite.y, 0) + supportY - previous.y;
    previous.x = supportX;
    previous.y = supportY;
  }
  function _beginSupportResolution(sprite) {
    if (!sprite) return;
    var depth = _finiteNumber(sprite._supportResolutionDepth, 0);
    if (depth === 0) {
      var previous = sprite._groundSupport;
      // Uma figura removida do grupo deixa de ser terreno imediatamente. Sem
      // esta validação, o passageiro ainda herdava o último deslocamento dela.
      if (previous && previous.group &&
          (!previous.group.items || previous.group.items.indexOf(previous.owner) === -1)) {
        _detachGroundSupport(sprite);
        previous = null;
      }
      sprite._supportPreferenceOwner = previous && previous.owner ? previous.owner : null;
      sprite._supportCandidateChosen = false;
      if (sprite._supportPreferenceOwner) {
        _carryByGroundSupport(sprite, sprite._supportPreferenceOwner);
      }
    }
    sprite._supportResolutionDepth = depth + 1;
  }
  function _endSupportResolution(sprite) {
    if (!sprite) return;
    var depth = Math.max(0, _finiteNumber(sprite._supportResolutionDepth, 1) - 1);
    sprite._supportResolutionDepth = depth;
    if (depth === 0) {
      delete sprite._supportPreferenceOwner;
      delete sprite._supportCandidateChosen;
    }
  }
  function _recordPreviousPosition(sprite) {
    if (!sprite) return;
    sprite._previousX = _finiteNumber(sprite.x, 0);
    sprite._previousY = _finiteNumber(sprite.y, 0);
    sprite._previousFrameStamp = _frameStamp;
    sprite._recordedMotionDX = 0;
    sprite._recordedMotionDY = 0;
  }
  /**
   * Fecha um passo de movimento iniciado por _recordPreviousPosition. A colisão
   * usa o deslocamento REAL, não a velocidade que outro bloco pode mudar depois.
   */
  function _commitRecordedMotion(sprite) {
    if (!sprite || sprite._previousFrameStamp !== _frameStamp) return;
    sprite._recordedMotionDX = _finiteNumber(sprite.x, 0) - sprite._previousX;
    sprite._recordedMotionDY = _finiteNumber(sprite.y, 0) - sprite._previousY;
  }
  /**
   * Posição inicial confiável da varredura contínua. Se código manual teleportou
   * o sprite depois de um helper de movimento, o deslocamento deixa de bater com
   * o passo registrado e a nova posição vira o começo — nunca atravessamos o
   * caminho antigo. Sem histórico deste quadro, mantemos a compatibilidade com
   * código que soma x/y pela velocidade diretamente.
   */
  function _motionPreviousPosition(sprite) {
    var currentX = _finiteNumber(sprite && sprite.x, 0);
    var currentY = _finiteNumber(sprite && sprite.y, 0);
    if (sprite && sprite._previousFrameStamp === _frameStamp &&
        _isFiniteNumber(sprite._previousX) && _isFiniteNumber(sprite._previousY)) {
      var actualDX = currentX - sprite._previousX;
      var actualDY = currentY - sprite._previousY;
      var expectedDX = _finiteNumber(sprite._recordedMotionDX, 0);
      var expectedDY = _finiteNumber(sprite._recordedMotionDY, 0);
      if (Math.abs(actualDX - expectedDX) <= 0.0001 &&
          Math.abs(actualDY - expectedDY) <= 0.0001) {
        return { x: sprite._previousX, y: sprite._previousY, recorded: true };
      }
      return { x: currentX, y: currentY, recorded: false };
    }
    return {
      x: currentX - _finiteNumber(sprite && sprite.vx, 0),
      y: currentY - _finiteNumber(sprite && sprite.vy, 0),
      recorded: false
    };
  }
  /** Mantém a origem varrida após uma resolução legítima, nunca após teleporte. */
  function _refreshRecordedMotionAfterCollision(sprite, previous) {
    if (previous && previous.recorded === true) _commitRecordedMotion(sprite);
  }
  function _jumpFromGround(sprite, gravity, strength) {
    if (!sprite) return;
    sprite.vy = _jumpVelocityForGravity(gravity, strength);
    _detachGroundSupport(sprite);
    _emitJump(sprite);
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
        _confirmGroundSupport(sprite, null);
      }
    } else if (sprite.y >= floor) {
      sprite.y = floor;
      sprite.vy = 0;
      _confirmGroundSupport(sprite, null);
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
    _recordPreviousPosition(sprite);
    // A colisão do quadro anterior pode ter marcado o chão. A integração abre
    // um novo quadro: se ainda houver apoio, a colisão o confirma depois de mover.
    var wasGrounded = _beginGroundFrame(sprite);
    var vx = _finiteNumber(sprite.vx, 0), vy = _finiteNumber(sprite.vy, 0);
    // Código manual também pode iniciar um pulo atribuindo vy antes de mover.
    if (wasGrounded && _isJumpingForGravity(vy, world.gravity)) {
      _detachGroundSupport(sprite);
    }
    sprite.x = _finiteNumber(sprite.x, 0) + vx;
    sprite.y = _finiteNumber(sprite.y, 0) + vy;
    sprite.vx = vx;
    sprite.vy = vy;
    _commitRecordedMotion(sprite);
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
