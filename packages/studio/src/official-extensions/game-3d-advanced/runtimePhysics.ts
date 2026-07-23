/**
 * Máquina de estados por entidade e física cinemática do Jogo 3D Avançado.
 * Este fragmento é composto dentro da mesma IIFE do runtime principal, então
 * não cria API paralela; o runtime final continua sendo a unidade validada
 * semanticamente pelos testes.
 */
export const gameKit3DPhysicsRuntimeSource = `
  // ---- FSM por MOLDE (o coração didático do curso: cada entidade tem estado) ----

  var MAX_ENTITY_STATE_TRANSITIONS = 32;

  function fsmBucket(mold, stateName) {
    var m = text(mold, '');
    var s = text(stateName, '');
    if (!m || !s) return null;
    var perMold = fsmHooks[m] || (fsmHooks[m] = Object.create(null));
    return perMold[s] || (perMold[s] = { enter: [], step: [], exit: [] });
  }

  /** Executa UMA transição; setEntityState serializa as transições aninhadas. */
  function transitionEntityState(e, next) {
    var perMold = fsmHooks[e._mold];
    var oldBucket = perMold && e.state ? perMold[e.state] : null;
    if (oldBucket) runEntityHooks(oldBucket.exit, e, 'quando sair do estado ' + e.state);
    // O gancho pode recolher a entidade. Nesse caso não escreva no handle morto,
    // não toque no mixer compartilhado pelo pool e não rode uma entrada fantasma.
    if (!isEntity(e)) return;
    e.state = next;
    e.stateTime = 0;
    // ⭐ A animação amarrada ao ESTADO: é o casamento da lição do curso (mixer por
    // personagem) com o coração do kit (FSM por entidade). A criança amarra uma
    // vez e o boneco se anima sozinho conforme o cérebro dele muda — o mesmo que o
    // autoAnimate do Jogo 2D faz lá.
    var mold = molds[e._mold];
    if (mold && mold.stateAnims && e._mixer) {
      var clipName = mold.stateAnims[next];
      if (clipName) playAnim(e, clipName, true);
    }
    // Um gancho pode reiniciar o projeto e substituir os buckets; consulte a
    // tabela viva depois da saída em vez de usar a referência antiga.
    perMold = fsmHooks[e._mold];
    var newBucket = perMold ? perMold[next] : null;
    if (newBucket) runEntityHooks(newBucket.enter, e, 'quando entrar no estado ' + next);
  }

  function setEntityState(e, stateName) {
    if (!isEntity(e)) return;
    var next = text(stateName, '');
    if (!next || e.state === next) return; // idempotente, como no curso
    var queue = e._stateQueue;
    if (!queue) queue = e._stateQueue = [];
    queue.push(next);
    if (e._stateChanging) return;

    e._stateChanging = true;
    var transitions = 0;
    try {
      while (queue.length && isEntity(e)) {
        var requested = queue.shift();
        if (!requested || requested === e.state) continue;
        if (transitions >= MAX_ENTITY_STATE_TRANSITIONS) {
          warnOnce('fsm-cycle:' + e._mold,
            'as mudanças de estado do molde "' + e._mold + '" entraram em ciclo — revise os ganchos de entrar/sair');
          queue.length = 0;
          break;
        }
        transitions++;
        transitionEntityState(e, requested);
      }
    } finally {
      e._stateChanging = false;
      queue.length = 0;
    }
  }

  /** "No molde X, no estado Y, tocar a animação Z." */
  function setStateAnim(mold, state, clip) {
    var m = molds[text(mold, '')];
    if (!m) return;
    if (!m.stateAnims) m.stateAnims = {};
    m.stateAnims[text(state, '')] = text(clip, '');
  }

  function runEntityHooks(list, e, label) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      try {
        fn(e, currentDt);
      } catch (err) {
        if (!fn.__szg3kWarned) {
          fn.__szg3kWarned = true;
          warn('erro no "' + label + '": ' + err);
        }
      }
    }
  }

  /** Ganchos da ZONA: fn(zona, quemEncostou). Warn-1x igual aos outros. */
  function runOverlapHooks(zone, who) {
    var list = overlapHooks[zone._mold];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      try {
        fn(zone, who);
      } catch (err) {
        if (!fn.__szg3kWarned) {
          fn.__szg3kWarned = true;
          warn('erro no "Quando alguém encostar": ' + err);
        }
      }
    }
  }

  function stateTimer(mold, stateName, sec, next) {
    var m = text(mold, '');
    var s = text(stateName, '');
    var n = text(next, '');
    if (!m || !s || !n) return;
    // Dedupe por (molde, estado): re-registrar troca o destino/tempo.
    for (var i = 0; i < stateTimers.length; i++) {
      if (stateTimers[i].mold === m && stateTimers[i].state === s) {
        stateTimers[i].sec = Math.max(0.05, num(sec, 1.5));
        stateTimers[i].next = n;
        return;
      }
    }
    stateTimers.push({ mold: m, state: s, sec: Math.max(0.05, num(sec, 1.5)), next: n });
  }

  // ---- Física sólida (gravidade + chão + colisão de molde sólido) ----
  //
  // Modelo: cinemático, caixa/bola/cápsula/rampa por MOLDE. Uma varredura
  // contínua acha o PRIMEIRO impacto do deslocamento; os substeps continuam
  // refinando penetração, rampas e múltiplos contatos. Quem manda no grounded é
  // a NORMAL do contato — não o desempate de eixo, que empurrava de lado num
  // pouso raso.

  var anySolid = false;      // liga a resolução de sólidos só quando há algum
  var anyTrigger = false;    // idem para as zonas
  var anyCarrier = false;    // algum molde sólido que se MOVE (plataforma)
  var _minSolidThin = 1e9;   // o sólido mais FINO do mundo (critério do substep)
  var MAX_SUBSTEPS = 4;
  var MIN_GROUND_Y = 0.64;   // ~50°: mais íngreme que isso é PAREDE, escorrega
  var SNAP_DIST = 0.3;       // grude no chão ao descer rampa (senão vira trampolim)
  var SKIN = 0.02;
  var BOUNCE_MIN = 1.2;      // quique morto abaixo disso: não fica tremendo
  var _boxA = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  var _boxB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  var _sweepHit = { t: 1, nx: 0, ny: 0, nz: 0, solid: null };
  var _sweepCandidate = { t: 1, nx: 0, ny: 0, nz: 0, solid: null };
  var _cand = [];            // candidatos do broadphase (buffer PRÓPRIO — ver nota)
  var _candN = 0;

  /** Caixa MUNDO da entidade a partir da caixa local do molde. */
  function entBox(e, out) {
    var m = molds[e._mold];
    var p = e.mesh.position;
    if (!m) {
      out.minX = p.x - 0.5; out.maxX = p.x + 0.5;
      out.minY = p.y;       out.maxY = p.y + 1;
      out.minZ = p.z - 0.5; out.maxZ = p.z + 0.5;
      return;
    }
    var c = m.col;
    out.minX = p.x + c.minX; out.maxX = p.x + c.maxX;
    out.minY = p.y + c.minY; out.maxY = p.y + c.maxY;
    out.minZ = p.z + c.minZ; out.maxZ = p.z + c.maxZ;
  }

  /**
   * Caixa MUNDO de um sólido, no frame LOCAL dele (desfaz o yaw). Yaw preserva o
   * eixo Y do mundo, então uma bola/cápsula vertical continua vertical no frame
   * girado — cápsula-vs-caixa-girada vira cápsula-vs-AABB, sem matemática nova.
   * (A engine não consegue produzir pitch/roll: setYaw/faceVelocity escrevem
   * (0,y,0), lookAt força o Y do alvo e aimAt achata em Y.)
   */
  function localOf(s, px, pz, out) {
    var yaw = s.mesh.rotation.y;
    var dx = px - s.mesh.position.x;
    var dz = pz - s.mesh.position.z;
    if (!yaw) { out.x = dx; out.z = dz; return out; }
    var c = Math.cos(-yaw), si = Math.sin(-yaw);
    out.x = dx * c - dz * si;
    out.z = dx * si + dz * c;
    return out;
  }
  var _loc = { x: 0, z: 0 };

  /** Altura da rampa no ponto local (lx,lz) — a MESMA reta da malha (wedgeGeo). */
  function rampHeight(c, lx, lz) {
    var t = c.rampAxis === 0
      ? (lx - c.minX) / (c.maxX - c.minX || 1)
      : (lz - c.minZ) / (c.maxZ - c.minZ || 1);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return c.rampY0 + (c.rampY1 - c.rampY0) * t;
  }

  /** Marca o contato: a normal decide o grounded (e quem me carrega). */
  function contact(e, nx, ny, nz, solidEnt) {
    if (ny >= MIN_GROUND_Y) {
      e.grounded = true;
      e.nx = nx; e.ny = ny; e.nz = nz;
      if (solidEnt) { e._ride = solidEnt; e._rideGen = solidEnt._gen; }
    }
    // Impulso na normal. bounce=0 -> v -= vn*N -> remove só a componente que
    // ENTRA na superfície, que é exatamente o "zera o eixo" de antes — mas sem
    // matar a velocidade de quem já está SAINDO da parede (o antigo grudava).
    var vn = e.vx * nx + e.vy * ny + e.vz * nz;
    if (vn < 0) {
      // ⭐ O quique é dos DOIS lados, e o MAIOR manda. Antes só a superfície
      // contava — e o piso-base chega aqui com solidEnt null, então NADA quicava
      // nele. Resultado: a bola era obrigada a não quicar no chão comum e o
      // humano era obrigado a quicar no trampolim. Com o máximo: a bola quica em
      // qualquer chão, o humano não quica em chão nenhum, e o trampolim continua
      // arremessando o humano (0.9 vence o 0 dele).
      var m = solidEnt ? molds[solidEnt._mold] : null;
      var em = molds[e._mold];
      var b = m ? m.bounce : 0;
      var eb = em ? em.bounce : 0;
      if (eb > b) b = eb;
      var j = (1 + b) * vn;
      if (b > 0 && Math.abs(vn) < BOUNCE_MIN) j = vn;
      e.vx -= j * nx; e.vy -= j * ny; e.vz -= j * nz;
    }
  }

  /** Pisa no chão-base (y=0): os pés do molde são a origem. */
  function resolveGround(e) {
    var p = e.mesh.position;
    var m = molds[e._mold];
    var foot = m ? m.col.minY : 0;
    if (p.y + foot <= 0) {
      p.y = -foot;
      contact(e, 0, 1, 0, null);
    }
  }

  /** Resolve a entidade contra UM sólido. Devolve true se houve contato. */
  function resolveOne(e, s) {
    var p = e.mesh.position;
    var sm = molds[s._mold];
    if (!sm) return false;
    var c = sm.col;
    entBox(e, _boxA);
    // Rampa: superfície inclinada — trata pelo topo, não por push-out de caixa.
    if (c.kind === 3) {
      localOf(s, p.x, p.z, _loc);
      if (_loc.x < c.minX || _loc.x > c.maxX || _loc.z < c.minZ || _loc.z > c.maxZ) return false;
      var em = molds[e._mold];
      var foot = em ? em.col.minY : 0;
      var surf = s.mesh.position.y + rampHeight(c, _loc.x, _loc.z);
      if (p.y + foot < surf && p.y + foot > surf - 1.2) {
        p.y = surf - foot;
        // Normal da rampa: a reta sobe (rampY1-rampY0) ao longo de (max-min).
        var run = (c.rampAxis === 0 ? c.maxX - c.minX : c.maxZ - c.minZ) || 1;
        var rise = c.rampY1 - c.rampY0;
        var len = Math.sqrt(run * run + rise * rise) || 1;
        var ny = run / len;
        var nt = -rise / len;
        var yaw = s.mesh.rotation.y;
        var cs = Math.cos(yaw), sn = Math.sin(yaw);
        var lnx = c.rampAxis === 0 ? nt : 0;
        var lnz = c.rampAxis === 0 ? 0 : nt;
        contact(e, lnx * cs + lnz * sn, ny, -lnx * sn + lnz * cs, s);
        return true;
      }
      return false;
    }
    var yaw2 = s.mesh.rotation.y;
    localOf(s, p.x, p.z, _loc);
    // Movedor BOLA/CÁPSULA vs caixa sólida: ponto mais próximo na caixa e empurra
    // na direção dele. É o que tira o enganchar em quina (a caixa engata no canto;
    // a cápsula desliza) e o que faz gente subir rampa/degrau liso.
    // Como o yaw preserva o eixo Y do mundo, a cápsula continua EM PÉ no frame
    // local do sólido — vira cápsula-vs-AABB, sem matemática nova.
    var em = molds[e._mold];
    var ec = em ? em.col : null;
    if (ec && (ec.kind === 1 || ec.kind === 2)) {
      var r = ec.r;
      var cy0 = p.y + ec.minY + r;
      var cy1 = p.y + ec.maxY - r;
      if (ec.kind === 1 || cy1 < cy0) { cy0 = cy1 = p.y + (ec.minY + ec.maxY) / 2; }
      var bMinY = s.mesh.position.y + c.minY;
      var bMaxY = s.mesh.position.y + c.maxY;
      // Ponto do SEGMENTO da cápsula mais perto da faixa Y da caixa.
      var segY = (bMinY + bMaxY) / 2;
      if (segY < cy0) segY = cy0;
      if (segY > cy1) segY = cy1;
      // Ponto da CAIXA mais perto desse ponto do segmento.
      var qx = _loc.x < c.minX ? c.minX : (_loc.x > c.maxX ? c.maxX : _loc.x);
      var qy = segY < bMinY ? bMinY : (segY > bMaxY ? bMaxY : segY);
      var qz = _loc.z < c.minZ ? c.minZ : (_loc.z > c.maxZ ? c.maxZ : _loc.z);
      var ddx = _loc.x - qx, ddy = segY - qy, ddz = _loc.z - qz;
      var d2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d2 > 0.000001) {
        var dist = Math.sqrt(d2);
        if (dist >= r) return false;
        var pen = r - dist;
        var lnx3 = ddx / dist, lny3 = ddy / dist, lnz3 = ddz / dist;
        var cw = Math.cos(yaw2), sw = Math.sin(yaw2);
        var wnx = lnx3 * cw + lnz3 * sw;
        var wnz = -lnx3 * sw + lnz3 * cw;
        p.x += wnx * pen; p.y += lny3 * pen; p.z += wnz * pen;
        contact(e, wnx, lny3, wnz, s);
        return true;
      }
      // Centro DENTRO da caixa (penetração profunda): cai no caminho de caixa.
    }
    // Caixa (yaw-aware): resolve no frame LOCAL do sólido e devolve a correção.
    var ehw = (_boxA.maxX - _boxA.minX) / 2;
    var ehd = (_boxA.maxZ - _boxA.minZ) / 2;
    if (yaw2) { var big = Math.max(ehw, ehd); ehw = big; ehd = big; }  // AABB do movedor não gira
    var ox = Math.min(_loc.x + ehw, c.maxX) - Math.max(_loc.x - ehw, c.minX);
    var oz = Math.min(_loc.z + ehd, c.maxZ) - Math.max(_loc.z - ehd, c.minZ);
    var sMinY = s.mesh.position.y + c.minY;
    var sMaxY = s.mesh.position.y + c.maxY;
    var oy = Math.min(_boxA.maxY, sMaxY) - Math.max(_boxA.minY, sMinY);
    if (ox <= 0 || oy <= 0 || oz <= 0) return false;
    // Eixo de MENOR penetração. O empate importa de verdade: um objeto pequeno
    // ENGOLIDO por uma parede grossa tem ox = oy = oz = o próprio tamanho, e aí
    // "o menor" não diz nada. Desempata por VELOCIDADE — o eixo em que a
    // entidade mais se move é aquele por onde ela entrou. Sem isso, um tiro
    // dentro da parede era empurrado para CIMA e seguia atravessando.
    var EPS = 1e-4;
    var mn = Math.min(ox, Math.min(oy, oz));
    var useX = ox <= mn + EPS;
    var useY = oy <= mn + EPS;
    var useZ = oz <= mn + EPS;
    if ((useX ? 1 : 0) + (useY ? 1 : 0) + (useZ ? 1 : 0) > 1) {
      var avx = useX ? Math.abs(e.vx) : -1;
      var avy = useY ? Math.abs(e.vy) : -1;
      var avz = useZ ? Math.abs(e.vz) : -1;
      if (avy >= avx && avy >= avz) { useX = false; useZ = false; }
      else if (avx >= avz) { useY = false; useZ = false; }
      else { useX = false; useY = false; }
    }
    if (useY) {
      // Vertical: pousa em cima ou bate a cabeça.
      if ((_boxA.minY + _boxA.maxY) / 2 > (sMinY + sMaxY) / 2) { p.y += oy; contact(e, 0, 1, 0, s); }
      else { p.y -= oy; contact(e, 0, -1, 0, s); }
      return true;
    }
    // Horizontal: empurra pelo eixo escolhido NO FRAME LOCAL e volta ao mundo.
    var lpx = 0, lpz = 0, lnx2 = 0, lnz2 = 0;
    if (useX) {
      var sx = _loc.x < (c.minX + c.maxX) / 2 ? -1 : 1;
      lpx = ox * sx; lnx2 = sx;
    } else {
      var sz = _loc.z < (c.minZ + c.maxZ) / 2 ? -1 : 1;
      lpz = oz * sz; lnz2 = sz;
    }
    var cc = Math.cos(yaw2), ss = Math.sin(yaw2);
    p.x += lpx * cc + lpz * ss;
    p.z += -lpx * ss + lpz * cc;
    contact(e, lnx2 * cc + lnz2 * ss, 0, -lnx2 * ss + lnz2 * cc, s);
    return true;
  }

  /**
   * Empurra para fora de TODOS os sólidos candidatos (sequencial). Os candidatos
   * incluem as ZONAS (o broadphase é um só para colisão e gatilho) — e zona
   * AVISA, não empurra: sem o filtro de solid, qualquer mundo com UM sólido
   * ligava o empurrão também nas zonas — a gema/moeda virava parede em que se
   * pisa, e o gatilho (que confere a sobreposição DEPOIS do empurrão) nunca
   * disparava. O teste antigo de zona não via porque o mundo dele não tinha
   * sólido nenhum, e o resolveSolids só roda sob anySolid.
   */
  function resolveSolids(e) {
    for (var i = 0; i < _candN; i++) {
      var s = _cand[i];
      if (!s || !s._alive) continue;
      var sm = molds[s._mold];
      if (!sm || !sm.solid) continue;
      resolveOne(e, s);
    }
  }

  /**
   * Tempo de impacto de uma AABB móvel contra um sólido, pelo método dos slabs.
   * O cálculo acontece no frame LOCAL do sólido: paredes giradas continuam
   * estreitas em vez de virarem a AABB mundial inflada do próprio yaw.
   */
  function sweepOne(e, s, dx, dy, dz, out) {
    var sm = molds[s._mold];
    if (!sm || !sm.solid) return false;
    // Rampa não é a caixa cheia: varrê-la como AABB criaria uma parede invisível
    // na entrada baixa. A superfície inclinada continua no resolvedor exato,
    // refinada pelos substeps; a varredura cobre paredes/volumes fechados.
    if (sm.col.kind === 3) return false;
    entBox(e, _boxA);
    var acx = (_boxA.minX + _boxA.maxX) * 0.5;
    var acy = (_boxA.minY + _boxA.maxY) * 0.5;
    var acz = (_boxA.minZ + _boxA.maxZ) * 0.5;
    var ahx = (_boxA.maxX - _boxA.minX) * 0.5;
    var ahy = (_boxA.maxY - _boxA.minY) * 0.5;
    var ahz = (_boxA.maxZ - _boxA.minZ) * 0.5;
    var yaw = s.mesh.rotation.y;
    var cy = Math.cos(-yaw), sy = Math.sin(-yaw);
    var rx = acx - s.mesh.position.x;
    var rz = acz - s.mesh.position.z;
    var lx = rx * cy - rz * sy;
    var lz = rx * sy + rz * cy;
    var ldx = dx * cy - dz * sy;
    var ldz = dx * sy + dz * cy;
    // A entidade é uma AABB no mundo. Vista no frame girado do sólido, sua
    // extensão conservadora é a soma das projeções dos dois semi-eixos.
    var lahx = Math.abs(cy) * ahx + Math.abs(sy) * ahz;
    var lahz = Math.abs(sy) * ahx + Math.abs(cy) * ahz;
    var aMinX = lx - lahx, aMaxX = lx + lahx;
    var aMinY = acy - ahy, aMaxY = acy + ahy;
    var aMinZ = lz - lahz, aMaxZ = lz + lahz;
    var c = sm.col;
    var bMinY = s.mesh.position.y + c.minY;
    var bMaxY = s.mesh.position.y + c.maxY;
    var xEntry = -Infinity, xExit = Infinity;
    var yEntry = -Infinity, yExit = Infinity;
    var zEntry = -Infinity, zExit = Infinity;

    if (ldx > 0) {
      xEntry = (c.minX - aMaxX) / ldx;
      xExit = (c.maxX - aMinX) / ldx;
    } else if (ldx < 0) {
      xEntry = (c.maxX - aMinX) / ldx;
      xExit = (c.minX - aMaxX) / ldx;
    } else if (aMaxX <= c.minX || aMinX >= c.maxX) return false;

    if (dy > 0) {
      yEntry = (bMinY - aMaxY) / dy;
      yExit = (bMaxY - aMinY) / dy;
    } else if (dy < 0) {
      yEntry = (bMaxY - aMinY) / dy;
      yExit = (bMinY - aMaxY) / dy;
    } else if (aMaxY <= bMinY || aMinY >= bMaxY) return false;

    if (ldz > 0) {
      zEntry = (c.minZ - aMaxZ) / ldz;
      zExit = (c.maxZ - aMinZ) / ldz;
    } else if (ldz < 0) {
      zEntry = (c.maxZ - aMinZ) / ldz;
      zExit = (c.minZ - aMaxZ) / ldz;
    } else if (aMaxZ <= c.minZ || aMinZ >= c.maxZ) return false;

    var entry = Math.max(xEntry, Math.max(yEntry, zEntry));
    var exit = Math.min(xExit, Math.min(yExit, zExit));
    if (entry < 0 || entry > 1 || entry > exit) return false;

    var lnx = 0, lny = 0, lnz = 0;
    if (xEntry >= yEntry && xEntry >= zEntry) lnx = ldx > 0 ? -1 : 1;
    else if (yEntry >= zEntry) lny = dy > 0 ? -1 : 1;
    else lnz = ldz > 0 ? -1 : 1;
    var cw = Math.cos(yaw), sw = Math.sin(yaw);
    out.t = entry;
    out.nx = lnx * cw + lnz * sw;
    out.ny = lny;
    out.nz = -lnx * sw + lnz * cw;
    out.solid = s;
    return true;
  }

  /** Primeiro sólido atingido pelo deslocamento deste pedaço de quadro. */
  function sweepSolids(e, dx, dy, dz, out) {
    out.t = 1; out.nx = 0; out.ny = 0; out.nz = 0; out.solid = null;
    var found = false;
    for (var i = 0; i < _candN; i++) {
      var s = _cand[i];
      if (!s || !s._alive) continue;
      if (!sweepOne(e, s, dx, dy, dz, _sweepCandidate)) continue;
      if (!found || _sweepCandidate.t < out.t) {
        found = true;
        out.t = _sweepCandidate.t;
        out.nx = _sweepCandidate.nx;
        out.ny = _sweepCandidate.ny;
        out.nz = _sweepCandidate.nz;
        out.solid = _sweepCandidate.solid;
      }
    }
    return found;
  }

  /**
   * Integra um substep consumindo o tempo restante depois de cada impacto. Três
   * contatos bastam para remover os três graus de liberdade de uma AABB; se ela
   * ficar presa num canto, o tempo restante é descartado em vez de atravessar.
   */
  function moveContinuous(e, seconds) {
    var p = e.mesh.position;
    var left = seconds;
    for (var impact = 0; impact < 3 && left > 0.000001; impact++) {
      var dx = e.vx * left, dy = e.vy * left, dz = e.vz * left;
      if (!dx && !dy && !dz) return;
      if (!sweepSolids(e, dx, dy, dz, _sweepHit)) {
        p.x += dx; p.y += dy; p.z += dz;
        return;
      }
      p.x += dx * _sweepHit.t;
      p.y += dy * _sweepHit.t;
      p.z += dz * _sweepHit.t;
      contact(e, _sweepHit.nx, _sweepHit.ny, _sweepHit.nz, _sweepHit.solid);
      left *= 1 - _sweepHit.t;
    }
  }

  /**
   * Broadphase UMA vez por quadro: copia os candidatos para um buffer PRÓPRIO.
   * A cópia é obrigatória, não otimização: o gridQuery devolve o buffer
   * COMPARTILHADO ("o chamador consome antes da próxima consulta"), e um gancho
   * da criança dentro da resolução (forEachNear/nearest) o sobrescreveria.
   */
  function fillCandidates(e, dx, dz) {
    _candN = 0;
    var m = molds[e._mold];
    if (!m) return;
    var p = e.mesh.position;
    // alcance = extensão do MOVEDOR + deslocamento do QUADRO + pele. O "+2" fixo
    // de antes ignorava o deslocamento — com substep, um tiro rápido saía da
    // consulta antes de a varredura testá-lo.
    var reach = Math.max(m.hw, m.hd) + Math.sqrt(dx * dx + dz * dz) + SKIN + 0.5;
    var list = gridQuery(p.x, p.z, reach);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s === e || !s._alive) continue;
      var sm = molds[s._mold];
      if (!sm || (!sm.solid && !sm.trigger)) continue;
      _cand[_candN++] = s;
    }
  }

  /** Quantos substeps para não atravessar o sólido mais fino do mundo. */
  function substepsFor(e, dx, dy, dz) {
    var m = molds[e._mold];
    var c = m ? m.col : null;
    var thin = c
      ? Math.min(c.maxX - c.minX, Math.min(c.maxY - c.minY, c.maxZ - c.minZ))
      : MIN_THICK;
    if (_minSolidThin < thin) thin = _minSolidThin;
    if (thin < MIN_THICK) thin = MIN_THICK;
    var disp = Math.abs(dx);
    if (Math.abs(dy) > disp) disp = Math.abs(dy);
    if (Math.abs(dz) > disp) disp = Math.abs(dz);
    var k = 1 + Math.floor(disp / (thin * 0.5));
    return k > MAX_SUBSTEPS ? MAX_SUBSTEPS : k;
  }

  /** Grude no chão ao descer rampa/degrau (senão a descida vira trampolim). */
  function snapDown(e) {
    var p = e.mesh.position;
    var y0 = p.y;
    p.y -= SNAP_DIST;
    var hit = false;
    for (var i = 0; i < _candN; i++) {
      var s = _cand[i];
      if (!s || !s._alive) continue;
      var sm = molds[s._mold];
      if (!sm || !sm.solid) continue;
      if (resolveOne(e, s)) hit = true;
    }
    if (!hit) p.y = y0;
  }

  function boxesOverlap(a, b) {
    return a.maxX > b.minX && a.minX < b.maxX &&
           a.maxY > b.minY && a.minY < b.maxY &&
           a.maxZ > b.minZ && a.minZ < b.maxZ;
  }

  /** Broadphase de uma zona: traz qualquer entidade, não só sólidos/zonas. */
  function fillTriggerVisitors(z) {
    _candN = 0;
    var m = molds[z._mold];
    if (!m) return;
    var p = z.mesh.position;
    var reach = Math.max(m.hw, m.hd) + SKIN + 0.5;
    var list = gridQuery(p.x, p.z, reach);
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e === z || !e._alive) continue;
      var em = molds[e._mold];
      // Uma zona é sensor, não visitante de outra zona.
      if (!em || em.trigger) continue;
      _cand[_candN++] = e;
    }
  }

  /** Uma zona acompanha TODOS os visitantes, cada um junto da geração do pool. */
  function stepTriggerZone(z) {
    var inside = z._inside || (z._inside = new Map());
    entBox(z, _boxA);
    // Primeiro reconhece SAÍDAS, inclusive visitante reciclado ou teleportado
    // para longe. Assim uma reentrada da mesma vida volta a disparar uma vez.
    inside.forEach(function (gen, e) {
      if (!e || !e._alive || e._gen !== gen) {
        inside.delete(e);
        return;
      }
      entBox(e, _boxB);
      if (!boxesOverlap(_boxA, _boxB)) inside.delete(e);
    });
    if (!z._alive) return;
    fillTriggerVisitors(z);
    entBox(z, _boxA);
    for (var i = 0; i < _candN; i++) {
      var e = _cand[i];
      if (!e || !e._alive) continue;
      entBox(e, _boxB);
      if (!boxesOverlap(_boxA, _boxB) || inside.get(e) === e._gen) continue;
      inside.set(e, e._gen);
      runOverlapHooks(z, e);
      // Coletas costumam reciclar a própria zona dentro do gancho.
      if (!z._alive) return;
    }
  }

  /** Passada própria DEPOIS da física: zonas móveis e visitantes parados valem. */
  function stepTriggers() {
    if (!anyTrigger) return;
    for (var pk in pools) {
      var m = molds[pk];
      if (!m || !m.trigger) continue;
      var active = pools[pk].active;
      for (var i = active.length - 1; i >= 0; i--) {
        var z = active[i];
        if (z && z._alive) stepTriggerZone(z);
      }
    }
  }

  // ---- Física da entidade (arrasto exponencial + integração + i-frames) ----

  function stepEntity(e, dt) {
    // 1. FSM: ganchos "enquanto estiver no estado" + transições por tempo.
    var perMold = fsmHooks[e._mold];
    if (perMold && e.state) {
      var bucket = perMold[e.state];
      if (bucket) runEntityHooks(bucket.step, e, 'enquanto estiver no estado ' + e.state);
    }
    if (!e._alive) return; // o gancho pode ter recolhido a entidade
    // 1b. O boneco anima. Só quem TEM mixer paga (o curso roda o mixer.update com
    // o mesmo dt clampado). Vem antes do split estático/dinâmico logo abaixo: um
    // boneco parado no lugar ainda respira.
    if (e._mixer) {
      try { e._mixer.update(dt); } catch (err) {}
    }
    e.stateTime += dt;
    for (var t = 0; t < stateTimers.length; t++) {
      var timer = stateTimers[t];
      if (timer.mold === e._mold && timer.state === e.state && e.stateTime >= timer.sec) {
        setEntityState(e, timer.next);
        if (!e._alive) return;
        break;
      }
    }
    var p = e.mesh.position;
    // 2. Carona: a plataforma que me segura já andou neste quadro (passo A) —
    //    ando junto ANTES de integrar. _gen guarda a geração do recurso gráfico.
    if (e._ride) {
      if (e._ride._alive && e._ride._gen === e._rideGen) {
        p.x += e._ride._dx; p.y += e._ride._dy; p.z += e._ride._dz;
      } else {
        e._ride = null;
      }
    }
    // Split ESTÁTICO/DINÂMICO do curso ("só as dinâmicas dão step"), aqui por
    // ENTIDADE — a gravidade é da entidade, não do molde. Quem está parado, sem
    // gravidade, sem carona e sem piscar não tem NADA para integrar: pula a
    // física, a colisão, as zonas e o gridSync (a posição não mudou, então a
    // grade e os deltas seguem válidos). Conservador de propósito: os ganchos da
    // FSM e o stateTime ACIMA continuam rodando — congelá-los pararia o cérebro
    // da entidade e o relógio que a criança lê.
    if (!e.vx && !e.vy && !e.vz && !e.gravity && !e._ride && e._iFrames <= 0) {
      e._dx = 0; e._dy = 0; e._dz = 0;
      // ⭐ Congela a matriz de quem está parado: um molde sólido (parede, moeda,
      // enfeite) não muda de transform, então recompô-la todo quadro é puro
      // desperdício. Assa UMA vez, na transição para estático (o guard do
      // matrixAutoUpdate), senão a matriz ficaria na identidade e a coisa
      // renderizaria na ORIGEM. Um setter que mexa depois (place/setYaw/lookAt/
      // aimAt) chama updateMatrix por conta própria — ver markStaticMoved.
      if (e.mesh && e.mesh.matrixAutoUpdate) {
        e.mesh.updateMatrix();
        e.mesh.matrixAutoUpdate = false;
      }
      return;
    }
    // Voltou a se mexer: re-arma o auto-update (senão a matriz ficaria congelada).
    if (e.mesh && !e.mesh.matrixAutoUpdate) e.mesh.matrixAutoUpdate = true;
    var wasGrounded = e.grounded;
    // 3. Gravidade própria (se ligada): puxa antes de integrar (semi-implícito).
    if (e.gravity) e.vy += e.gravity * dt;
    e.grounded = false;
    e._ride = null;
    // 4. Arrasto do AR: só no plano. Aplicar em Y brigava com a gravidade — a
    //    criança ligava "arrasto" e a entidade passava a flutuar, que não é o
    //    que o bloco promete.
    if (e.drag > 0) {
      var f = Math.exp(-e.drag * dt);
      e.vx *= f; e.vz *= f;
    }
    var dx = e.vx * dt, dy = e.vy * dt, dz = e.vz * dt;
    // 5. Colisão. Os dois gates são perguntas DIFERENTES e estavam fundidos:
    //    o CHÃO-BASE (y=0) é consequência da GRAVIDADE — quem não cai não tem por
    //    que ser parado por um piso invisível (tiro, drone, câmera). Já ser SÓLIDO
    //    é consequência de EXISTIR: parede para tudo que não é fantasma. Fundir os
    //    dois era o bug do tiro atravessando a parede.
    var wantSolid = anySolid && e.body === 0;
    if (wantSolid && (dx || dy || dz || e.gravity)) {
      fillCandidates(e, dx, dz);
      var k = _candN > 0 ? substepsFor(e, dx, dy, dz) : 1;
      // Integra cada substep com a velocidade VIVA (dt/k). A varredura contínua
      // encontra o impacto mesmo quando o deslocamento pula a parede inteira; o
      // resolveSolids mantém a resposta de rampas/penetrações já existente.
      var h = dt / k;
      for (var st = 0; st < k; st++) {
        moveContinuous(e, h);
        if (anySolid) resolveSolids(e);
      }
      if (e.gravity) resolveGround(e);
      // 7. Grude no chão ao descer rampa/degrau (senão a descida vira trampolim).
      if (wasGrounded && !e.grounded && e.vy <= 0 && anySolid) snapDown(e);
      // 8. Atrito: o mais ESCORREGADIO dos dois manda — gelo no chão OU no disco
      //    e escorrega igual. Não-definido (-1) vale 0 na superfície (gelo, o de
      //    sempre) e 1 em quem anda (sem opinião) → min = a superfície decide,
      //    exatamente como antes de existir atrito por entidade.
      if (e.grounded && e._ride) {
        var rm = molds[e._ride._mold];
        var fm = molds[e._mold];
        var sfr = rm ? (rm.friction < 0 ? 0 : rm.friction) : 0;
        var mfr = fm ? (fm.friction < 0 ? 1 : fm.friction) : 1;
        var fr = sfr < mfr ? sfr : mfr;
        if (fr > 0) {
          var ff = Math.exp(-fr * 8 * dt);
          e.vx *= ff; e.vz *= ff;
        }
      }
    } else {
      if (dx || dy || dz) { p.x += dx; p.y += dy; p.z += dz; }
      if (e.gravity) resolveGround(e);
    }
    // 9. Invencibilidade: decai e pisca a 10 Hz.
    if (e._iFrames > 0) {
      e._iFrames = Math.max(0, e._iFrames - dt);
      e.mesh.visible = e._iFrames <= 0 || Math.floor(e._iFrames * 10) % 2 === 0;
      if (e._iFrames <= 0) e.mesh.visible = true;
    }
    // 10. Deslocamento deste quadro (o que os passageiros somam). Sai de
    //     pos - _l, então captura integração E teleporte por place().
    e._dx = p.x - e._lx; e._dy = p.y - e._ly; e._dz = p.z - e._lz;
    e._lx = p.x; e._ly = p.y; e._lz = p.z;
    // 11. Grade espacial acompanha a posição.
    gridSync(e);
  }

`
