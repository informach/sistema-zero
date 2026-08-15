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
      // O apoio do quadro anterior vence quando ELE MESMO se confirma de novo,
      // qualquer que seja a ordem da varredura: por isso o candidato preferido
      // passa por aqui e sobrescreve o que já tinha sido escolhido.
      // ⚠️ Não basta ele ser o apoio VIGENTE: quem anda de uma base para a
      // VIZINHA nunca reconfirma a antiga, e prender o apoio nela fazia o
      // passageiro herdar para sempre o deslocamento de uma plataforma que já
      // tinha ficado para trás.
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

  /**
   * Quica só num PAR de bordas, deixando o outro par aberto.
   *
   * É o que o Pong precisa e o "quicar nas bordas" não dá: ali a bola quica nos
   * quatro lados e nunca sai, então NUNCA há ponto. Aqui o par aberto é a passagem.
   * Mesmo corpo do irmão, inclusive a CORREÇÃO DE POSIÇÃO — que é o que impede a
   * bola de aparecer meio quadro fora do palco.
   */
  function bounceOnEdgePair(sprite, ctx, edges) {
    if (!sprite || !ctx || !ctx.canvas) return;
    var visible = _visibleWorldRect(ctx);
    if (String(edges) === 'left-right') {
      if (sprite.x < visible.left) { sprite.x = visible.left; sprite.vx = Math.abs(sprite.vx || 0); }
      else if (sprite.x + sprite.w > visible.right) { sprite.x = visible.right - sprite.w; sprite.vx = -Math.abs(sprite.vx || 0); }
      return;
    }
    if (sprite.y < visible.top) { sprite.y = visible.top; sprite.vy = Math.abs(sprite.vy || 0); }
    else if (sprite.y + sprite.h > visible.bottom) { sprite.y = visible.bottom - sprite.h; sprite.vy = -Math.abs(sprite.vy || 0); }
  }

  /**
   * O eixo por onde a bola volta: o lado COMPRIDO da raquete.
   *
   * Raquete em pé (12x44, Pong) devolve 'x'; deitada (60x12, Breakout) devolve 'y'.
   * É a regra que a criança lê na TELA, sem campo novo e sem bloco irmão: ela vê a
   * raquete e sabe para onde a bola volta. Empate (raquete quadrada): manda o eixo
   * em que a bola vinha mais rápido — "ela volta por onde veio".
   */
  function _paddleReflectAxis(ball, paddle) {
    var pw = _finiteNumber(paddle.w, 0), ph = _finiteNumber(paddle.h, 0);
    if (ph > pw) return 'x';
    if (pw > ph) return 'y';
    return Math.abs(_finiteNumber(ball.vx, 0)) >= Math.abs(_finiteNumber(ball.vy, 0)) ? 'x' : 'y';
  }

  /**
   * Rebater a bola na raquete — o coração do Pong, do Breakout e do Arkanoid.
   *
   * Três coisas que parecem detalhe e são o jogo inteiro:
   *
   * 1. ⭐ **Guarda de aproximação**: só rebate se a bola estiver INDO na direção da
   *    raquete. Sem ela, dois quadros seguidos em contato invertem duas vezes e a
   *    bola gruda vibrando dentro da raquete.
   * 2. ⭐ **Correção de posição**: empurra a bola para fora antes de devolvê-la.
   *    Sem isso a bola some meio quadro dentro da raquete e o rebote fica no acaso.
   * 3. ⭐⭐ **Teto de velocidade**: a bola não pode andar mais que a espessura da
   *    raquete num quadro, senão ela ATRAVESSA e o jogo "perde a bola". Como o
   *    acelerar é o ajuste que toda criança mexe, sem o teto o próprio soquete
   *    quebraria o jogo.
   *
   * O ângulo sai do PONTO do impacto: bater na beirada manda a bola mais de lado.
   */
  function paddleBounce(ball, paddle, boostPercent) {
    if (!ball || !paddle || !isColliding(ball, paddle)) return;
    var eixo = _paddleReflectAxis(ball, paddle);
    var bola = _hitboxOf(ball), raquete = _hitboxOf(paddle);
    var centroBola = eixo === 'x'
      ? bola.x + bola.w / 2
      : bola.y + bola.h / 2;
    var centroRaquete = eixo === 'x'
      ? raquete.x + raquete.w / 2
      : raquete.y + raquete.h / 2;
    var vindo = eixo === 'x' ? _finiteNumber(ball.vx, 0) : _finiteNumber(ball.vy, 0);
    // Para onde ela volta: o lado da raquete em que a bola está.
    var paraTras = centroBola < centroRaquete ? -1 : 1;
    // Guarda de aproximação: já indo embora, não faz nada (senão gruda).
    if (vindo !== 0 && (vindo > 0) === (paraTras > 0)) return;

    var vx = _finiteNumber(ball.vx, 0), vy = _finiteNumber(ball.vy, 0);
    var velocidade = Math.sqrt(vx * vx + vy * vy);
    if (!(velocidade > 0)) velocidade = 1;
    velocidade *= 1 + Math.max(0, Math.min(100, _finiteNumber(boostPercent, 0))) / 100;

    // Teto: nunca mais que a espessura da raquete + o lado da bola por quadro.
    var espessura = eixo === 'x' ? _finiteNumber(paddle.w, 0) : _finiteNumber(paddle.h, 0);
    var lado = eixo === 'x' ? _finiteNumber(ball.w, 0) : _finiteNumber(ball.h, 0);
    velocidade = Math.min(velocidade, Math.max(4, espessura + lado));

    // Ângulo pelo ponto do impacto: -1 numa beirada, +1 na outra.
    var meiaRaquete = Math.max(1, (eixo === 'x' ? raquete.h : raquete.w) / 2);
    var outroBola = eixo === 'x' ? bola.y + bola.h / 2 : bola.x + bola.w / 2;
    var outroRaquete = eixo === 'x' ? raquete.y + raquete.h / 2 : raquete.x + raquete.w / 2;
    var desvio = Math.max(-1, Math.min(1, (outroBola - outroRaquete) / meiaRaquete));
    // 0.6 deixa a componente de volta sempre maior que a lateral: a bola nunca sai
    // rente à raquete, que é o jeito de o rebote virar um passeio de lado.
    var deVolta = Math.sqrt(Math.max(0.04, 1 - desvio * desvio * 0.6 * 0.6));

    if (eixo === 'x') {
      ball.vx = paraTras * velocidade * deVolta;
      ball.vy = desvio * velocidade * 0.6;
      ball.x = paraTras < 0
        ? _finiteNumber(paddle.x, 0) - _finiteNumber(ball.w, 0)
        : _finiteNumber(paddle.x, 0) + _finiteNumber(paddle.w, 0);
    } else {
      ball.vy = paraTras * velocidade * deVolta;
      ball.vx = desvio * velocidade * 0.6;
      ball.y = paraTras < 0
        ? _finiteNumber(paddle.y, 0) - _finiteNumber(ball.h, 0)
        : _finiteNumber(paddle.y, 0) + _finiteNumber(paddle.h, 0);
    }
  }

  /** Colisão por círculo: distância dos centros < soma dos raios (≈ metade do lado). */
  function circleCollides(a, b) {
    if (!a || !b) return false;
    // ⭐ Le a caixa EFETIVA (_hitboxOf), a mesma do retangulo: assim o dial "usar
    // area de colisao de N%" E a caixa medida no desenho valem aqui tambem. Antes
    // isto lia o fator na mao e teria ficado cego para a medicao do Pinta.
    var ea = _hitboxOf(a), eb = _hitboxOf(b);
    var ar = Math.min(ea.w, ea.h) / 2, br = Math.min(eb.w, eb.h) / 2;
    var dx = (ea.x + ea.w / 2) - (eb.x + eb.w / 2);
    var dy = (ea.y + ea.h / 2) - (eb.y + eb.h / 2);
    return Math.sqrt(dx * dx + dy * dy) < ar + br;
  }

  _registerRuntimeDomain('physics', {
    reset: function () { world.gravity = 0.6; }
  });

`
