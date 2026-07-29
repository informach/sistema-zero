/**
 * Domínio de plataforma do Jogo 2D Avançado. O fragmento roda dentro do IIFE
 * do runtime principal e compartilha suas funções/variáveis internas.
 */
export const gameKitPlatformerRuntime = `
  // ============================================================================
  // 🏃 KIT PLATAFORMA — o atalho do gênero (Mario, Celeste, Sunnyland)
  // ============================================================================
  // A extensão GERAL já faz plataforma "na unha" com os primitivos de ⚙️ Física
  // (gravidade + mover + colidir + pulo). Este kit é o ATALHO: junta tudo num
  // bloco só e acrescenta o que só existe em jogo de plataforma — o "feel" (o que
  // separa um pulo gostoso de um pulo duro), plataformas de atravessar por baixo,
  // pisar no inimigo, escada, wall jump.
  //
  // ⭐ As três peças do pulo bom (as duas primeiras os tutoriais esquecem):
  //  · COYOTE TIME — você ainda pode pular por um instantinho DEPOIS de sair da
  //    beirada. Ninguém percebe; todo mundo sente. Sem ele o jogo parece "duro".
  //  · BUFFER — apertar um tiquinho ANTES de pousar não perde o pulo: o aperto
  //    fica guardado e dispara no pouso.
  //  · PULO VARIÁVEL — segurou, pula alto; deu um toquinho, pula baixinho. O
  //    empurrão é RE-AFIRMADO enquanto segura (até 0,3 s) e soltar CANCELA.
  var jumpFeel = { coyote: 0.1, buffer: 0.1, hold: 0.3 };
  var plat = { cpX: 0, cpY: 0, hasCp: false, gravity: 2160 };
  var PLAT_SPEED_BOOST = 0.3; // correndo pula mais alto (Mario) — vy += |vx| * 0.3
  function setJumpFeel(coyote, buffer, hold, gravity) {
    jumpFeel.coyote = Math.max(0, num(coyote, 0.1));
    jumpFeel.buffer = Math.max(0, num(buffer, 0.1));
    jumpFeel.hold = Math.max(0, num(hold, 0.3));
    plat.gravity = Math.max(1, num(gravity, 2160));
  }
  function platJumpPressed() {
    return justPressed[' '] === true || justPressed.w === true || justPressed.arrowup === true;
  }
  function platJumpHeld() {
    return keys[' '] === true || keys.w === true || keys.arrowup === true;
  }
  /** O empurrão do pulo (com o bônus de correr do Mario). */
  function platImpulse(who, force) {
    who.vy = -(Math.abs(num(force, 660)) + Math.abs(num(who.vx, 0)) * PLAT_SPEED_BOOST);
    who.onGround = false;
  }
  /** Herói de plataforma TUDO-EM-UM: gravidade + setas + pulo com feel + mover.
   * A colisão fica FORA de propósito (o bloco "colidir com o mapa/enxame" vem
   * DEPOIS) — é a ordem de verdade, e é ela que a criança aprende. */
  function platformerHero(who, speed, force, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    // 1) COYOTE e BUFFER medidos ANTES da gravidade — ela zera o onGround.
    if (who.onGround) {
      who._coyoteT = jumpFeel.coyote;
      who._airJumps = 0; // pousou: devolve o pulo duplo
    } else {
      who._coyoteT = Math.max(0, num(who._coyoteT, 0) - d);
    }
    if (platJumpPressed()) who._bufferT = jumpFeel.buffer;
    else who._bufferT = Math.max(0, num(who._bufferT, 0) - d);
    who._dropT = Math.max(0, num(who._dropT, 0) - d); // janela do "descer da plataforma"
    // Parede: a colisão marcou no FIM do quadro passado e a gravidade logo abaixo
    // vai zerar — guarde aqui (o coyote da parede, que o Celeste também tem),
    // senão "deslizar"/"wall jump" nunca veriam parede nenhuma.
    if (num(who._wallDir, 0)) {
      who._wallSide = who._wallDir;
      who._wallT = jumpFeel.coyote;
    } else {
      who._wallT = Math.max(0, num(who._wallT, 0) - d);
    }
    // 2) gravidade
    applyGravity(who, plat.gravity, d);
    // 3) setas (só na horizontal — em plataforma, cima é PULAR). ⚠️ O empurrão do
    // wall jump manda por um tiquinho: sem essa trava, a seta reescreveria o vx no
    // quadro seguinte e o herói grudaria na parede em vez de sair dela.
    who._wallLockT = Math.max(0, num(who._wallLockT, 0) - d);
    var dir = 0;
    if (keys.a || keys.arrowleft) dir -= 1;
    if (keys.d || keys.arrowright) dir += 1;
    if (num(who._wallLockT, 0) <= 0) {
      who.vx = dir * Math.abs(num(speed, 240));
      if (dir) setFacing(who, dir, 0);
    }
    // 4) pulo: o aperto guardado (buffer) encontra o chão recente (coyote)
    if (num(who._bufferT, 0) > 0 && num(who._coyoteT, 0) > 0) {
      who._bufferT = 0;
      who._coyoteT = 0;
      who._holdT = jumpFeel.hold;
      platImpulse(who, force); // o empurrão sai SEMPRE, mesmo num toque de 1 quadro
    }
    // 5) segurando = continua subindo (pulo alto); soltou = cancela (pulo curto)
    if (num(who._holdT, 0) > 0) {
      if (platJumpHeld()) {
        platImpulse(who, force);
        who._holdT = num(who._holdT, 0) - d;
      } else {
        who._holdT = 0;
      }
    }
    // 6) mover
    moveByVelocity(who, d);
  }
  /** Pulo duplo (INVENTADO — nenhum dos jogos-fonte tem): N pulos no AR, e o
   * pouso devolve todos. Chame DEPOIS do herói, no mesmo quadro. */
  function doubleJump(who, force, times) {
    if (!who || typeof who !== 'object') return;
    var max = Math.max(1, Math.round(num(times, 1)));
    // Só no ar, e só se o pulo do chão já não tiver acabado de sair (o
    // platformerHero zera o buffer quando gasta o aperto).
    if (who.onGround || num(who._bufferT, 0) <= 0) return;
    if (num(who._airJumps, 0) >= max) return;
    who._airJumps = num(who._airJumps, 0) + 1;
    who._bufferT = 0;
    who._holdT = jumpFeel.hold;
    platImpulse(who, force);
  }
  /** Deslizar na parede: caindo e encostado, a queda fica LENTA. */
  function wallSlide(who, speed) {
    if (!who || typeof who !== 'object') return;
    if (who.onGround || num(who._wallT, 0) <= 0) return;
    var s = Math.abs(num(speed, 90));
    if (num(who.vy, 0) > s) who.vy = s;
  }
  /** Wall jump: pula para LONGE da parede (o clássico do Celeste). O empurrão
   * horizontal fica travado um tiquinho, senão a seta apagaria ele no quadro
   * seguinte (o herói escreve vx todo quadro). */
  function wallJump(who, forceX, forceY) {
    if (!who || typeof who !== 'object') return;
    if (who.onGround || num(who._wallT, 0) <= 0) return;
    if (num(who._bufferT, 0) <= 0) return;
    var away = -num(who._wallSide, 0); // longe da parede
    if (!away) return;
    who._bufferT = 0;
    who._holdT = 0; // o empurrão do wall jump é fixo: segurar não estica
    who._wallLockT = 0.15;
    who._wallT = 0;
    who._airJumps = 0; // a parede devolve o pulo duplo (é o combo do Celeste)
    who.vy = -Math.abs(num(forceY, 660));
    who.vx = away * Math.abs(num(forceX, 300));
    who.onGround = false;
    setFacing(who, away, 0);
  }
  /** Escada (INVENTADO): em cima da peça de escada, cima/baixo sobem e descem e a
   * gravidade não vale. Chame DEPOIS do herói e ANTES de colidir. */
  function climbLadder(who, mapName, tileIndex, speed) {
    if (!who || typeof who !== 'object') return;
    var want = Math.round(num(tileIndex, 0));
    if (tileAt(mapName, centerX(who), centerY(who)) !== want) return;
    var s = Math.abs(num(speed, 160));
    var dy = 0;
    if (keys.w || keys.arrowup) dy -= 1;
    if (keys.s || keys.arrowdown) dy += 1;
    if (dy) {
      // ⚠️ Na escada, ↑ é SUBIR — não pular. O herói roda antes daqui e já tratou
      // o ↑/W como pulo (são a mesma tecla): desfaça, senão sair do topo ainda
      // segurando ↑ dispara o empurrão guardado e a criança "voa" sem entender.
      who._holdT = 0;
      who._bufferT = 0;
      who.vy = dy * s; // subir/descer manda: a gravidade deste quadro é anulada
    } else if (num(who._holdT, 0) > 0) {
      return; // pulou da escada (espaço): deixa o pulo acontecer
    } else {
      who.vy = 0; // parado na escada = fica pendurado
    }
    who.onGround = true; // dá para pular DA escada
  }
  /** Plataforma de atravessar por baixo (one-way). ⭐ Técnica do Sunnyland
   * (Platform.js): NÃO testa sobreposição — testa se os pés CRUZAM o plano do
   * topo neste quadro (começo preservado × posição projetada). Por isso não fura
   * numa queda rápida mesmo quando a colisão sólida já atualizou _prevY. */
  function oneWayPlatform(who, moldName, dt) {
    if (!who || typeof who !== 'object') return;
    var ok = text(moldName, '');
    var pool = pools[ok];
    if (!pool) { warnOnce('oneway:' + ok, 'o molde "' + ok + '" não existe — crie com "Criar o molde"'); return; }
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    if (num(who.vy, 0) < 0) return; // subindo: atravessa
    if (who._dropT > 0) return; // pediu para descer (↓): ignora as plataformas
    // Os pés são os da CAIXA (quem declarou uma caixa nos pés quer pousar por ela).
    var feetFrom = oneWayFeetFrom(who);
    var feetTo = oneWayFeetTo(who, d);
    var act = pool.active;
    for (var i = 0; i < act.length; i++) {
      var p = act[i];
      if (p === who || p._active === false) continue;
      var top = hbTop(p);
      if (feetFrom > top) continue; // começou abaixo do topo: não é pouso
      if (feetTo < top) continue; // não alcança o plano neste quadro
      if (hbRight(who) <= hbLeft(p)) continue;
      if (hbLeft(who) >= hbRight(p)) continue;
      who.y = top - hbH(who) - num(who._hbY, 0);
      who.vy = 0;
      who.onGround = true;
      who._prevY = who.y; // a varredura não deve desfazer este pouso
      who._sweepFrame = -1;
      return;
    }
  }
  /** Descer de uma plataforma one-way (↓ + pulo) — abre uma janelinha em que ela
   * é ignorada. */
  function dropThrough(who) {
    if (!who || typeof who !== 'object') return;
    if (!(keys.s || keys.arrowdown)) return;
    if (!platJumpPressed()) return;
    who._dropT = 0.25;
    who.onGround = false;
  }
  /** Plataforma que anda (INVENTADO) e CARREGA quem está em cima: guarda o quanto
   * ela andou e soma em quem pegou carona. Sem isso o herói "escorrega" dela. */
  function movingPlatform(who, x1, y1, x2, y2, seconds, dt) {
    if (!who || typeof who !== 'object') return;
    var d = (typeof dt === 'number' && isFinite(dt) && dt >= 0) ? dt : currentDt;
    var dur = Math.max(0.1, num(seconds, 2));
    who._platT = num(who._platT, 0) + d / dur;
    // Vai-e-volta suave (0→1→0) sem precisar de estado de direção.
    var t = who._platT % 2;
    var k = t > 1 ? 2 - t : t;
    var ease = k * k * (3 - 2 * k); // suaviza as pontas (smoothstep)
    var nx = num(x1, 0) + (num(x2, 0) - num(x1, 0)) * ease;
    var ny = num(y1, 0) + (num(y2, 0) - num(y1, 0)) * ease;
    who._carryX = nx - num(who.x, 0);
    who._carryY = ny - num(who.y, 0);
    who.x = nx;
    who.y = ny;
    who._prevX = nx;
    who._prevY = ny;
  }
  /** Pega carona: quem está em cima anda junto com a plataforma. */
  function rideOn(who, moldName) {
    if (!who || typeof who !== 'object') return;
    var rk = text(moldName, '');
    var pool = pools[rk];
    if (!pool) { warnOnce('ride:' + rk, 'o molde "' + rk + '" não existe — crie com "Criar o molde"'); return; }
    var act = pool.active;
    var feet = hbBottom(who);
    for (var i = 0; i < act.length; i++) {
      var p = act[i];
      if (p._active === false) continue;
      if (Math.abs(feet - hbTop(p)) > 4) continue; // não está em cima
      if (hbRight(who) <= hbLeft(p)) continue;
      if (hbLeft(who) >= hbRight(p)) continue;
      who.x = num(who.x, 0) + num(p._carryX, 0);
      who.y = num(who.y, 0) + num(p._carryY, 0);
      who._prevX = num(who.x, 0);
      who._prevY = num(who.y, 0);
      who.onGround = true;
      return;
    }
  }
  /** Pisar no inimigo. ⭐ Técnica do Super Mario (Stomper.js): compara as
   * VELOCIDADES (us.vel.y > them.vel.y) em vez de olhar o lado — assim funciona
   * mesmo se os dois estiverem caindo, e um inimigo subindo te machuca. Quem
   * pisou QUICA; quem levou é recolhido e sai o aviso "plataforma:pisou". */
  function stompKill(who, moldName, bounce) {
    if (!who || typeof who !== 'object') return;
    var sk = text(moldName, '');
    var pool = pools[sk];
    if (!pool) { warnOnce('stomp:' + sk, 'o molde "' + sk + '" não existe — crie com "Criar o molde"'); return; }
    var act = pool.active;
    for (var i = act.length - 1; i >= 0; i--) {
      var e = act[i];
      if (e._active === false) continue;
      if (!touching(who, e)) continue;
      if (num(who.vy, 0) <= num(e.vy, 0)) continue; // não estava caindo NELE
      who.y = hbTop(e) - hbH(who) - num(who._hbY, 0); // encaixa em cima (bounds.bottom = top)
      who.vy = -Math.abs(num(bounce, 400));
      who.onGround = false;
      who._holdT = 0;
      who._prevY = who.y;
      // ⚠️ Avisar ANTES de recolher: aqui a varredura está DESLIGADA, então o
      // recolher devolve "e" ao pool na hora — e um ouvinte que faça nascer do
      // mesmo molde receberia ESTE objeto de volta, já reescrito.
      emit('plataforma:pisou', e);
      recycle(e);
    }
  }
  /** Patrulha que vira na PAREDE. ⭐ Técnica do Super Mario (PendulumMove.js): a
   * colisão é que manda virar (vx zerado = bateu), em vez de contar passos —
   * então o inimigo nunca cai da beirada errada nem trava na quina. */
  function patrolTurnAtWall(who, speed) {
    if (!who || typeof who !== 'object') return;
    var s = Math.abs(num(speed, 60));
    if (num(who._patrolDir, 0) === 0) who._patrolDir = -1;
    // vx == 0 depois de ter andado = a colisão zerou = bateu numa parede.
    if (num(who._patrolWas, 0) !== 0 && num(who.vx, 0) === 0) {
      who._patrolDir = -num(who._patrolDir, -1);
    }
    who.vx = num(who._patrolDir, -1) * s;
    who._patrolWas = who.vx;
    setFacing(who, who.vx, 0);
  }
  /** Ponto de renascer. */
  function setCheckpoint(x, y) {
    plat.cpX = num(x, 0);
    plat.cpY = num(y, 0);
    plat.hasCp = true;
  }
  function respawn(who) {
    if (!who || typeof who !== 'object') return;
    who.x = plat.hasCp ? plat.cpX : num(who._bornX, num(who.x, 0));
    who.y = plat.hasCp ? plat.cpY : num(who._bornY, num(who.y, 0));
    // Renascer é TELEPORTE, não movimento: zerar a varredura, senão a colisão
    // tentaria varrer do lugar da morte até aqui e travaria no caminho.
    who._prevX = who.x;
    who._prevY = who.y;
    who.vx = 0;
    who.vy = 0;
    who._holdT = 0;
    who._coyoteT = 0;
    who._bufferT = 0;
    who._wallT = 0;
    who._wallSide = 0;
    who._wallDir = 0;
    who._wallLockT = 0;
    who._dropT = 0;
    who._airJumps = 0;
  }
  /** Quadros de um ESTADO do herói (parado/andando/pulando/caindo) — o mapa
   * estado→animação do Sunnyland (Player.js). Declare uma vez por estado. */
  var PLAT_STATES = { parado: 1, andando: 1, pulando: 1, caindo: 1 };
  function platStateFrames(who, state, from, to, fps) {
    if (!who || typeof who !== 'object') return;
    var st = text(state, 'parado');
    if (!PLAT_STATES[st]) {
      warnOnce('platstate:' + st, 'o estado "' + st + '" não existe (use parado, andando, pulando ou caindo)');
      return;
    }
    if (!who._platFrames) who._platFrames = {};
    who._platFrames[st] = { from: Math.max(0, Math.floor(num(from, 0))), to: Math.max(0, Math.floor(num(to, 0))), fps: Math.max(1, num(fps, 8)) };
  }
  /** Animação por ESTADO, lida da FÍSICA (jeito do Sunnyland/Mario): a folha de
   * quadros troca sozinha conforme (no chão, vx, vy) — parado / andando / pulando
   * / caindo. Chame no "A cada quadro", depois de mover. */
  function platformerAnim(who) {
    if (!who || typeof who !== 'object') return;
    var st;
    if (!who.onGround) st = num(who.vy, 0) < 0 ? 'pulando' : 'caindo';
    else st = Math.abs(num(who.vx, 0)) > 1 ? 'andando' : 'parado';
    // Espelha o desenho pelo lado que anda (o setFacing do herói já decidiu).
    var f = who._platFrames && who._platFrames[st];
    // Sem quadros para o estado do ar? Cai no de andar/parado (folha simples de 2
    // estados é o caso comum) — em vez de congelar sem animação nenhuma.
    if (!f && who._platFrames) f = who._platFrames[st === 'caindo' ? 'pulando' : 'parado'];
    if (!f) return;
    playAnim(who, f.from, f.to, f.fps); // a guarda de transição vive no playAnim
  }
`
