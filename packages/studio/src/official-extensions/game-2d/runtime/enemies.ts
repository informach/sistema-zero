export const gameTwoDEnemiesRuntime = `  // ---- Tipos de inimigo (v0.22.0) ----
  // Um TIPO de inimigo é um GRUPO estendido: { items, bullets: {items}, config,
  // onDefeat }. Como todos os helpers de grupo leem só .items, os blocos de
  // grupo (para cada / contar / colisões / tirar) funcionam direto no tipo.
  //
  // "Criar tipo de inimigo" DENTRO do "a cada quadro" recria o tipo (e ZERA a
  // lista) a cada quadro: os inimigos soltos somem da tela sem pista nenhuma.
  // O teto de chamadas detecta esse laço e avisa UMA vez (o jogo segue rodando).
  var _enemyTypeCreates = 0;
  // ---- A VISTA de todos os inimigos ("Criar o grupo ... com os inimigos de
  // todos os tipos") ----
  // Registro dos tipos vivos + um contador de ROTATIVIDADE. A vista nao guarda
  // sprite nenhum: ela MONTA a lista a partir dos tipos, e so remonta quando a
  // composicao mudou de fato (nasceu, morreu, foi removido, tipo novo).
  //
  // ⚠️ Por que derivada e nao uma copia mantida em sincronia: o atalho manual
  // (grupo comum + "Por o sprite no grupo" a cada nascimento) VAZA, porque a
  // morte tira o inimigo do TIPO e nao do grupo dela, e o morto segue colidindo
  // para sempre. Vista derivada nao pode vazar: se saiu do tipo, saiu da vista no
  // mesmo instante. E pega de graca o sprite ADOTADO por "Por o sprite no grupo
  // <tipo>", que uma sincronia no spawn perderia.
  var _enemyTypes = [];
  // Teto: "Criar tipo de inimigo" dentro do laco cria um tipo por quadro (ja tem
  // aviso proprio). Sem teto o registro cresceria para sempre.
  var MAX_ENEMY_TYPES = 64;

  /**
   * SELO da composicao, DERIVADO: todo grupo gerenciado bump o proprio _revision
   * em qualquer mutacao da lista (o proxy de _trackGroupItems embrulha push,
   * splice, sort, atribuicao...). Somando os revisions mais a quantidade de
   * tipos, a vista sabe quando remontar sem que ninguem precise avisar.
   *
   * ⚠️ A primeira versao disto era um contador que eu incrementava na mao no
   * spawn e na morte, e o teste da poda pegou o furo na hora: "Tirar do grupo
   * quem sair da tela" removia do tipo sem avisar a vista, que ficava mostrando
   * inimigo que nao existe mais. Derivar mata a classe; sincronizar sempre deixa
   * um caminho de fora.
   */
  function _enemySelo() {
    var selo = _enemyTypes.length;
    for (var i = 0; i < _enemyTypes.length; i++) {
      var t = _enemyTypes[i];
      if (t) selo += _finiteNumber(t._revision, 0);
    }
    return selo;
  }

  function _registerEnemyType(type) {
    if (_enemyTypes.length < MAX_ENEMY_TYPES) { _enemyTypes.push(type); return; }
    warnOnce(
      'tipos-demais',
      'sao tipos de inimigo demais (mais de ' + MAX_ENEMY_TYPES + '): os tipos criados daqui para a frente nao entram no grupo de TODOS os inimigos. Normalmente isso quer dizer que "Criar tipo de inimigo" esta dentro do "A cada quadro do jogo".'
    );
  }

  /** É uma vista de todos os inimigos? (usado pelas guardas dos blocos de grupo) */
  function _isEnemyMirror(group) {
    return !!group && group._enemyMirror === true;
  }

  /**
   * Cria a VISTA. O 'items' é um getter: devolve a lista montada dos tipos, em
   * cache pela rotatividade (leitura O(1) enquanto nada muda). O grupo entra em
   * _managedGroups para o caminho de descarte por remocao nunca tocar nele: os
   * sprites pertencem aos TIPOS, a vista so olha.
   */
  /**
   * ⚠️ A lista da vista sai embrulhada num PROXY que recusa mutacao. Sem ele,
   * QUALQUER helper que faca group.items.push escreveria no cache: "Criar tiro
   * no grupo", "Criar um sprite no grupo", os spawns dos kits... O sprite
   * apareceria ate a proxima remontagem e sumiria sozinho, em silencio. Guardar
   * um a um os seis criadores seria a mesma sincronia frouxa que este lote
   * existe para eliminar; a lista se defender sozinha vale para os que ainda nem
   * existem. Idioma emprestado do _trackGroupItems, que ja faz isso nos grupos
   * normais para observar pertencimento.
   */
  // ⚠️ Object.create(null) NAO e preciosismo: com um objeto literal, 'toString',
  // 'valueOf', 'constructor' e 'hasOwnProperty' vem de Object.prototype e sao
  // TRUTHY, e todos existem em Array.prototype — entao a guarda abaixo devolveria
  // o aviso no lugar da funcao de verdade, e qualquer coercao da lista (String,
  // concatenacao) dispararia aviso e voltaria undefined. E a MESMA armadilha que
  // o 1o full review pegou neste arquivo (nome herdado passando por comportamento
  // valido); repeti dois meses depois, agora com prototipo nulo.
  var MIRROR_MUTANTES = Object.create(null);
  MIRROR_MUTANTES.copyWithin = 1;
  MIRROR_MUTANTES.fill = 1;
  MIRROR_MUTANTES.pop = 1;
  MIRROR_MUTANTES.push = 1;
  MIRROR_MUTANTES.reverse = 1;
  MIRROR_MUTANTES.shift = 1;
  MIRROR_MUTANTES.sort = 1;
  MIRROR_MUTANTES.splice = 1;
  MIRROR_MUTANTES.unshift = 1;
  function _protegerListaDaVista(lista) {
    return new Proxy(lista, {
      get: function (target, prop, receiver) {
        if (MIRROR_MUTANTES[prop] && typeof Array.prototype[prop] === 'function') {
          return function () {
            _warnEnemyMirror(
              'mexer na lista',
              'Este grupo mostra os inimigos dos tipos, entao a lista dele nao se muda na mao. Para acrescentar, use o bloco de soltar do TIPO; para tirar, "Tirar o sprite do grupo" (ele sai do tipo dele).'
            );
            return undefined;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
      set: function () {
        _warnEnemyMirror(
          'mexer na lista',
          'Este grupo mostra os inimigos dos tipos, entao a lista dele nao se muda na mao.'
        );
        return true;
      }
    });
  }

  function createAllEnemiesGroup() {
    var cache = [];
    var protegida = _protegerListaDaVista(cache);
    var seloDoCache = -1;
    var group = { _revision: 0, _enemyMirror: true };
    _managedGroups.add(group);
    Object.defineProperty(group, 'items', {
      enumerable: true,
      get: function () {
        var selo = _enemySelo();
        if (seloDoCache !== selo) {
          cache = [];
          for (var i = 0; i < _enemyTypes.length; i++) {
            var itens = _enemyTypes[i] && _enemyTypes[i].items;
            if (!itens) continue;
            for (var k = 0; k < itens.length; k++) if (itens[k]) cache.push(itens[k]);
          }
          protegida = _protegerListaDaVista(cache);
          seloDoCache = selo;
          // ⚠️ O bump so acontece na REMONTAGEM. Se acontecesse a cada leitura, o
          // overlapGroups (que compara _revision para refrescar o Set de
          // pertencimento) refaria o Set a cada item: O(n) virava O(n²).
          group._revision += 1;
        }
        return protegida;
      },
      set: function () {
        // Reordenar a vista (Trazer para a frente / Mandar para tras) nao tem
        // efeito duradouro: ela e remontada dos tipos. Avisa em vez de mentir.
        _warnEnemyMirror(
          'a ordem de desenho',
          'Reordenar este grupo nao dura, porque ele e montado dos tipos a cada mudanca. Para mandar na ordem, desenhe um tipo depois do outro com "Desenhar os inimigos do tipo ...".'
        );
      }
    });
    return group;
  }

  var _enemyMirrorWarned = Object.create(null);
  /** Aviso da vista: cita o que a crianca tentou e o que fazer no lugar. */
  function _warnEnemyMirror(oque, dica) {
    if (_enemyMirrorWarned[oque]) return;
    _enemyMirrorWarned[oque] = true;
    console.warn('SZGame2D: ' + oque + ' nao vale no grupo de TODOS os inimigos. ' + dica);
  }

  /**
   * Desenhar a VISTA conta como desenhar cada tipo. Sem isto, quem desenha pela
   * vista (que o manual apresenta como o jeito de fazer uma coisa so para todos)
   * levaria o aviso de "os inimigos estao vivos e ninguem os desenha" com a tela
   * CHEIA. E o mesmo defeito que o 2o full review corrigiu quando o caminho de
   * grupo virou oficial; o bloco novo reabriu a porta.
   */
  function _marcarTiposDesenhados() {
    for (var i = 0; i < _enemyTypes.length; i++) {
      if (_enemyTypes[i]) _enemyTypes[i]._drawn = true;
    }
  }

  /** Esvaziar a vista = esvaziar todos os tipos (o "limpar a fase"). */
  function _clearAllEnemyTypes() {
    for (var i = 0; i < _enemyTypes.length; i++) {
      if (_enemyTypes[i]) clearGroup(_enemyTypes[i]);
    }
  }

  /** Tirar da vista = tirar do tipo que contem o sprite. */
  function _removeEnemyFromItsType(sprite) {
    for (var i = 0; i < _enemyTypes.length; i++) {
      var t = _enemyTypes[i];
      if (!t || !t.items) continue;
      var idx = t.items.indexOf(sprite);
      if (idx !== -1) {
        _removeGroupItemAt(t, idx);
        return true;
      }
    }
    return false;
  }

  /** Podar a vista = podar cada tipo, com o mesmo corpo da crianca. */
  function _pruneAllEnemyTypes(ctx, margin, onLeave) {
    for (var i = 0; i < _enemyTypes.length; i++) {
      if (_enemyTypes[i]) pruneOffscreen(ctx, _enemyTypes[i], margin, onLeave);
    }
  }

  function createEnemyType(options) {
    options = options || {};
    _enemyTypeCreates += 1;
    if (_enemyTypeCreates === 61) {
      console.warn(
        'SZGame2D: "Criar tipo de inimigo" (o normal ou o "com inteligência") está rodando sem parar: ele provavelmente está DENTRO do "A cada quadro do jogo". Monte esse bloco FORA do laço (ele roda uma vez só); dentro do laço a lista é recriada a cada quadro e os inimigos soltos somem da tela.'
      );
    }
    var type = createGroup();
    type.bullets = createGroup();
    type.config = {
        behavior: options.behavior || 'patrulha',
        // Lista de comportamentos JUNTADOS (bloco "O tipo de inimigo ... também e ...").
        // O campo 'behavior' acima guarda o de NASCENÇA e nunca muda; esta lista
        // é a fonte da verdade do "atualizar".
        behaviors: [options.behavior || 'patrulha'],
        color: options.color || '#e4573d',
        image: (typeof options.image === 'string') ? options.image : '',
        // Figura desenhada (defineShape) como visual do tipo; '' = imagem/cor.
        shape: (typeof options.shape === 'string') ? options.shape : '',
        hp: _positiveFiniteNumber(options.hp, 3),
        speed: _finiteNumber(options.speed, 2),
        dmg: _finiteNumber(options.dmg, 1),
        w: _positiveFiniteNumber(options.w, 32),
        h: _positiveFiniteNumber(options.h, 32),
        // Ajustes finos por comportamento (bloco "Ajustar no tipo de inimigo…").
        jump: 10,
        jumpRate: 90,
        range: 80,
        rate: 90,
        shotSpeed: 4,
        reviveRate: 180,
        beamFrames: 180,
        animStates: null
    };
    type.onDefeat = null;
    type._defeatHandlers = Object.create(null);
    type._defeatOrder = [];
    type._hurtHandlers = Object.create(null);
    type._hurtOrder = [];
    // Entra no registro que a VISTA de todos os inimigos monta.
    _registerEnemyType(type);
    return type;
  }

  /** Guarda a animação de UM estado no TIPO (vale p/ todos os inimigos dele). */
  function setEnemyStateAnimation(type, state, sheet, from, to, fps) {
    if (!type || !type.config || !sheet || !state) return;
    if (!type.config.animStates) type.config.animStates = {};
    var f = _finiteNumber(from, 0);
    var t = _finiteNumber(to, f);
    type.config.animStates[state] = {
      sheet: sheet,
      from: Math.max(0, Math.floor(f)),
      to: Math.max(0, Math.floor(t)),
      fps: _positiveFiniteNumber(fps, 8)
    };
  }

  /**
   * Ajuste fino por comportamento: pulo/ritmo (saltador), alcance (quem voa e
   * quem reage à distância), cadencia/tiro (quem atira), voltar (renascer).
   */
  function setEnemyTypeParam(type, param, value) {
    if (!type || !type.config || !_isFiniteNumber(value)) return;
    var c = type.config;
    if (param === 'pulo') c.jump = value;
    else if (param === 'ritmo') c.jumpRate = Math.max(1, Math.round(value));
    else if (param === 'alcance') c.range = value;
    else if (param === 'cadencia') c.rate = Math.max(1, Math.round(value));
    // Zero entupiria o grupo: o tiro nasceria parado e a poda por borda nunca o
    // alcançaria (mesma régua do 'vida').
    else if (param === 'tiro') {
      if (value <= 0) {
        warnOnce(
          'tiro-parado',
          'a velocidade do tiro precisa ser maior que zero, senão ele nasce parado em cima do inimigo. Deixei como estava.'
        );
      }
      c.shotSpeed = _positiveFiniteNumber(value, c.shotSpeed);
    }
    else if (param === 'voltar') c.reviveRate = Math.max(1, Math.round(value));
    // A vida vale para quem for solto DAQUI PARA A FRENTE (quem já está em cena
    // fica com a que recebeu ao nascer) — é o que faz a onda seguinte ser mais dura.
    else if (param === 'vida') c.hp = _positiveFiniteNumber(value, c.hp);
    else if (param === 'duracao') c.beamFrames = Math.max(1, Math.round(value));
    else return;
    // Guarda o que ela ajustou para o aviso conferir DEPOIS, quando a lista de
    // comportamentos já está fechada. Conferir aqui daria falso-positivo: o
    // normal é ajustar a cadência antes de somar o atirador.
    if (!c._touched) c._touched = Object.create(null);
    c._touched[param] = true;
  }

  /** Solta um inimigo do tipo em x/y (aplica vida, dano e animações do tipo). */
  function spawnEnemy(type, x, y) {
    if (!type || !type.items || !type.config) return null;
    if (type.items.length >= MAX_GROUP) return null;
    var c = type.config;
    var s = createSprite({
      x: _finiteNumber(x, 0),
      y: _finiteNumber(y, 0),
      w: c.w,
      h: c.h,
      color: c.color,
      image: c.image || null
    });
    // Figura desenhada VENCE a imagem (setShape cancela imagem — "uma coisa por vez").
    if (c.shape) setShape(s, c.shape);
    s.dmg = c.dmg;
    setHealth(s, c.hp);
    // A referência do "quando levar dano" nasce COM o inimigo: um golpe que
    // chegue antes do primeiro "atualizar" (onda solta no meio do quadro)
    // precisa contar.
    s._hpAntes = s.hp;
    s._dir = 1;
    s._homeX = s.x;
    s._homeY = s.y;
    if (c.animStates) s.animStates = c.animStates;
    // Marca que o tipo JÁ teve inimigo em jogo: desliga o aviso pedagógico do
    // update/draw (lista vazia DEPOIS disso é derrota legítima, não esquecimento).
    type._spawned = true;
    type.items.push(s);
    _touchGroup(type);
    return s;
  }

  // ---- Comportamentos: uma TABELA, não uma cadeia de if/else ----
  // Cada comportamento declara os EIXOS que dirige. Ao atualizar o tipo, por
  // eixo vale o ÚLTIMO comportamento da lista que o dirige (então "somar" tem
  // sempre efeito visível) e as AÇÕES rodam todas. Um comportamento que dirige
  // os dois eixos recebe (ownX, ownY) e escreve só o que venceu — é o que faz
  // "perseguidor + saltador" perseguir no chão pulando.
  //
  //   move(s, c, env, ownX, ownY)  · act(s, c, env, hasXDriver)
  //   env = { type, visible, g, target, speed }
  //
  // 'flying' só importa no FALLBACK do eixo Y (quem voa não cai nem resolve
  // chão); com um dono do Y na lista, a flag é irrelevante.

  /** Persegue o CENTRO do alvo GRAVANDO vx/vy (flip/animação de graça). */
  function _enemyChaseMove(s, c, env, ownX, ownY) {
    var target = env.target;
    if (!target) {
      if (ownX) s.vx = 0;
      if (ownY) s.vy = 0;
      return;
    }
    var dx = (target.x + (target.w || 0) / 2) - (s.x + s.w / 2);
    var dy = (target.y + (target.h || 0) / 2) - (s.y + s.h / 2);
    if (ownX && ownY) {
      // Dono dos dois eixos: o passo tem o tamanho da velocidade NA DIAGONAL.
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > env.speed) { s.vx = (dx / d) * env.speed; s.vy = (dy / d) * env.speed; }
      else { s.vx = dx; s.vy = dy; }
      s.x += s.vx;
      s.y += s.vy;
      return;
    }
    // ⚠️ Dono de UM eixo só: a velocidade vale NAQUELE eixo. Normalizar em 2D
    // aqui faria o "perseguidor + saltador" andar a passo de formiga sempre que
    // o alvo estivesse numa plataforma bem mais alta (quase todo o vetor iria
    // para o eixo Y, que é do saltador e seria descartado aqui).
    if (ownX) {
      s.vx = Math.abs(dx) > env.speed ? (dx < 0 ? -env.speed : env.speed) : dx;
      s.x += s.vx;
    }
    if (ownY) {
      s.vy = Math.abs(dy) > env.speed ? (dy < 0 ? -env.speed : env.speed) : dy;
      s.y += s.vy;
    }
  }

  /**
   * Fica no lugar. Quem anda no chão cai e pousa (com gravidade aplicada); quem
   * VOA fica parado no ar, senão somar "parado" a um fantasma o derrubaria, e o
   * rótulo promete só que ele fica no lugar.
   */
  function _enemyIdleMove(s, c, env, ownX, ownY) {
    if (ownX) s.vx = 0;
    if (!ownY) return;
    if (env.flying) { s.vy = 0; return; }
    s.vy = _finiteNumber(s.vy, 0);
    s.y += s.vy;
    if (s.vy !== 0 || typeof s.onGround === 'boolean') {
      _resolveGravityGround(s, env.visible.top, env.visible.bottom, env.g);
    }
  }

  /** Vai-e-volta voando na horizontal, "alcance" px da posicao de nascenca. */
  function _enemyFlyMove(s, c, env) {
    if (s.x - s._homeX >= c.range) s._dir = -1;
    if (s._homeX - s.x >= c.range) s._dir = 1;
    s.vx = (s._dir || 1) * env.speed;
    s.x += s.vx;
  }

  /**
   * Sobe-e-desce voando, "alcance" px da posicao de nascenca.
   * ⚠️ Usa _dirY, e não _dir: o _dir é a direção do eixo X e pertence a quem
   * ganhou aquele eixo. Compartilhar os dois fazia a patrulha (ou o voador)
   * VIRAR na horizontal toda vez que este aqui batia no limite de cima/baixo.
   */
  function _enemyFlyVerticalMove(s, c, env) {
    if (typeof s._dirY !== 'number') s._dirY = 1;
    if (s.y - s._homeY >= c.range) s._dirY = -1;
    if (s._homeY - s.y >= c.range) s._dirY = 1;
    s.vy = s._dirY * env.speed;
    s.y += s.vy;
  }

  /** Pula de tempos em tempos ("ritmo" quadros) e resolve o chão. */
  function _enemyHopMove(s, c, env) {
    s.vy = _finiteNumber(s.vy, 0);
    s.y += s.vy;
    if (s.vy !== 0 || typeof s.onGround === 'boolean') {
      _resolveGravityGround(s, env.visible.top, env.visible.bottom, env.g);
    }
    if (typeof s._jcd !== 'number') s._jcd = c.jumpRate;
    if (s.onGround) {
      s._jcd -= 1;
      if (s._jcd <= 0) { s.vy = _jumpVelocityForGravity(env.g, c.jump); s.onGround = false; s._jcd = c.jumpRate; }
    }
  }

  /**
   * Patrulha: anda na horizontal e VIRA na parede ou na borda.
   * "Parede" = alguem zerou o vx dele neste meio-tempo (o "Impedir de
   * atravessar os tiles" zera o vx ao bater) — 1 quadro de latencia, ok.
   */
  function _enemyPatrolMove(s, c, env) {
    if (s._moved && (s.vx || 0) === 0) s._dir = -(s._dir || 1);
    if (s.x <= env.visible.left) s._dir = 1;
    if (s.x + s.w >= env.visible.right) s._dir = -1;
    s.vx = (s._dir || 1) * env.speed;
    s.x += s.vx;
    s._moved = true;
  }

  /** Vira para o alvo e atira a cada "cadencia" quadros (fica no chão). */
  function _enemyShootAct(s, c, env, hasXDriver) {
    var target = env.target;
    if (!target) return;
    // Quem anda decide o lado pelo movimento (autoAnimate); atirador PARADO
    // encara o alvo.
    if (!hasXDriver) s.facing = ((target.x + (target.w || 0) / 2) < (s.x + s.w / 2)) ? -1 : 1;
    if (typeof s._scd !== 'number') s._scd = c.rate;
    s._scd -= 1;
    if (s._scd <= 0) {
      s._scd = c.rate;
      var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
      var tx = target.x + (target.w || 0) / 2, ty = target.y + (target.h || 0) / 2;
      var ddx = tx - cx, ddy = ty - cy;
      var dd = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dd < 0.001) { ddx = (s.facing || 1); ddy = 0; dd = 1; }
      var shot = spawnBullet(env.type.bullets, {
        x: cx,
        y: cy,
        radius: ENEMY_SHOT_R,
        color: c.color,
        vx: (ddx / dd) * c.shotSpeed,
        vy: (ddy / dd) * c.shotSpeed
      });
      if (shot) shot.dmg = c.dmg;
    }
  }

  /** Distância do CENTRO do inimigo ao CENTRO do alvo (quem reage a "chegar perto"). */
  function _enemyDistanceTo(s, target) {
    var dx = (target.x + (target.w || 0) / 2) - (s.x + s.w / 2);
    var dy = (target.y + (target.h || 0) / 2) - (s.y + s.h / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Segura o inimigo dentro da área visível no eixo X (senão o medroso sairia
   * da tela e não voltaria mais).
   * ⚠️ Só segura quem JÁ estava dentro antes de andar. A área visível ANDA com
   * a câmera; segurar sempre ARRASTARIA pelo mundo inteiro um inimigo parado lá
   * atrás, colado na borda, para ele reaparecer na cara do jogador.
   */
  function _clampEnemyX(s, visible, antesX) {
    // "Encostava na tela" e não "estava todo dentro": um inimigo solto EM CIMA
    // da borda (padrão de onda) nunca estaria todo dentro, e a borda daquele
    // lado não o seguraria nunca. O else-if também cura o inimigo mais largo
    // que a tela, que com dois ifs independentes era empurrado para fora.
    if (antesX >= visible.right || antesX + s.w <= visible.left) return;
    if (s.x < visible.left) s.x = visible.left;
    else if (s.x + s.w > visible.right) s.x = visible.right - s.w;
  }

  /** Foge na horizontal enquanto o alvo estiver dentro do "alcance". */
  function _enemyFleeMove(s, c, env) {
    var t = env.target;
    var antesX = s.x;
    s.vx = 0;
    if (t && _enemyDistanceTo(s, t) <= c.range) {
      var dx = (t.x + (t.w || 0) / 2) - (s.x + s.w / 2);
      s.vx = (dx < 0 ? 1 : -1) * env.speed;
    }
    s.x += s.vx;
    _clampEnemyX(s, env.visible, antesX);
  }

  /** Espera quieto e CORRE (3× a velocidade) quando o alvo entra no "alcance". */
  function _enemyChargeMove(s, c, env) {
    var t = env.target;
    var antesX = s.x;
    s.vx = 0;
    if (t && _enemyDistanceTo(s, t) <= c.range) {
      var dx = (t.x + (t.w || 0) / 2) - (s.x + s.w / 2);
      s.vx = (dx < 0 ? -1 : 1) * env.speed * 3;
    }
    s.x += s.vx;
    _clampEnemyX(s, env.visible, antesX);
  }

  /**
   * Voa em círculo de raio "alcance" em volta de onde nasceu. O (cos - 1) faz o
   * círculo PASSAR pela posição de nascença: sem ele o inimigo daria um salto no
   * primeiro quadro. vx/vy saem como delta -> flip e animação de graça.
   */
  function _enemyCircleMove(s, c, env, ownX, ownY) {
    var r = Math.max(1, Math.abs(c.range));
    if (typeof s._ang !== 'number') s._ang = 0;
    s._ang += env.speed / r;
    var nx = s._homeX + Math.sin(s._ang) * r;
    var ny = s._homeY + (Math.cos(s._ang) - 1) * r;
    if (ownX) { s.vx = nx - s.x; s.x = nx; }
    if (ownY) { s.vy = ny - s.y; s.y = ny; }
  }

  /**
   * Voa e MERGULHA no alvo quando ele passa por baixo, depois volta à altura de
   * casa. O vetor do mergulho é CONGELADO no gatilho: mergulho tem compromisso,
   * não teleguia (é o que dá à criança a chance de desviar).
   */
  function _enemyDiveMove(s, c, env, ownX, ownY) {
    var t = env.target;
    if (typeof s._dive !== 'number') s._dive = 0;
    if (s._dive === 0) {
      // _dir é do eixo X: só mexe nele quem ganhou o X (senão a patrulha somada
      // aqui viraria a marcha sozinha no meio do caminho).
      if (ownX) {
        if (s.x - s._homeX >= c.range) s._dir = -1;
        if (s._homeX - s.x >= c.range) s._dir = 1;
        s.vx = (s._dir || 1) * env.speed;
        s.x += s.vx;
      }
      if (ownY) s.vy = 0;
      // ⚠️ Só mergulha se for dono do eixo Y. Sem ele o mergulho não desceria, e
      // a saída do estado 1 (que olha o y) nunca chegaria: o inimigo sairia da
      // tela na horizontal para sempre. Sem o Y, ele fica sendo um voador.
      if (t && ownY) {
        var dx = (t.x + (t.w || 0) / 2) - (s.x + s.w / 2);
        var dy = (t.y + (t.h || 0) / 2) - (s.y + s.h / 2);
        if (Math.abs(dx) <= c.range && dy > 0) {
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          s._dvx = (dx / d) * env.speed * 2;
          s._dvy = (dy / d) * env.speed * 2;
          s._dive = 1;
        }
      }
    } else if (s._dive === 1) {
      // Perdeu o Y no meio do mergulho (a criança somou um comportamento agora)?
      // A saída do estado olha o y, que ele não move mais: abortar é o único
      // jeito de não sair voando na horizontal para sempre.
      if (!ownY) { s._dive = 0; return; }
      if (ownX) { s.vx = _finiteNumber(s._dvx, 0); s.x += s.vx; }
      if (ownY) { s.vy = _finiteNumber(s._dvy, 0); s.y += s.vy; }
      if (s.y + s.h >= env.visible.bottom || s.y - s._homeY >= c.range * 2) s._dive = 2;
    } else {
      if (ownX) s.vx = 0;
      if (ownY) {
        s.vy = -env.speed;
        s.y += s.vy;
        if (s.y <= s._homeY) { s.y = s._homeY; s.vy = 0; s._dive = 0; }
      } else {
        s._dive = 0;
      }
    }
  }

  /**
   * Some e reaparece do lado do alvo a cada "cadencia" quadros, alternando o
   * lado (nunca sorteado: o primeiro salto é sempre à ESQUERDA do alvo, então a
   * criança consegue prever e o jogo é o mesmo em todo computador).
   */
  function _enemyTeleportMove(s, c, env, ownX, ownY) {
    if (ownX) s.vx = 0;
    if (ownY) s.vy = 0;
    var t = env.target;
    if (!t) return;
    if (typeof s._tcd !== 'number') s._tcd = c.rate;
    s._tcd -= 1;
    if (s._tcd > 0) return;
    s._tcd = c.rate;
    s._tside = -(s._tside || 1);
    emitParticles(s.x + s.w / 2, s.y + s.h / 2, 8, s.color || c.color);
    if (ownX) s.x = (t.x + (t.w || 0) / 2) + s._tside * c.range - s.w / 2;
    if (ownY) s.y = (t.y + (t.h || 0) / 2) - s.h / 2;
    emitParticles(s.x + s.w / 2, s.y + s.h / 2, 8, s.color || c.color);
  }

  /** Voa na diagonal quicando: vira nas bordas no X e a "alcance" de casa no Y. */
  function _enemyZigZagMove(s, c, env, ownX, ownY) {
    if (ownX) {
      if (s.x <= env.visible.left) s._dir = 1;
      if (s.x + s.w >= env.visible.right) s._dir = -1;
      s.vx = (s._dir || 1) * env.speed;
      s.x += s.vx;
    }
    if (ownY) {
      if (typeof s._dirY !== 'number') s._dirY = 1;
      if (s.y - s._homeY >= c.range) s._dirY = -1;
      if (s._homeY - s.y >= c.range) s._dirY = 1;
      s.vy = s._dirY * env.speed;
      s.y += s.vy;
    }
  }

  /**
   * Três tiros de uma vez, num leque em volta da direção do alvo. Contador
   * PRÓPRIO (_lcd): somado ao atirador comum, cada um mantém a sua cadência.
   */
  function _enemyFanShootAct(s, c, env, hasXDriver) {
    var t = env.target;
    if (!t) return;
    if (!hasXDriver) s.facing = ((t.x + (t.w || 0) / 2) < (s.x + s.w / 2)) ? -1 : 1;
    if (typeof s._lcd !== 'number') s._lcd = c.rate;
    s._lcd -= 1;
    if (s._lcd > 0) return;
    s._lcd = c.rate;
    var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    var ddx = (t.x + (t.w || 0) / 2) - cx, ddy = (t.y + (t.h || 0) / 2) - cy;
    if (Math.abs(ddx) < 0.001 && Math.abs(ddy) < 0.001) { ddx = (s.facing || 1); ddy = 0; }
    var base = Math.atan2(ddy, ddx);
    for (var k = -1; k <= 1; k++) {
      var a = base + k * 0.35;
      var shot = spawnBullet(env.type.bullets, {
        x: cx,
        y: cy,
        radius: ENEMY_SHOT_R,
        color: c.color,
        vx: Math.cos(a) * c.shotSpeed,
        vy: Math.sin(a) * c.shotSpeed
      });
      if (shot) shot.dmg = c.dmg;
    }
  }

  /**
   * Solta um tiro RETO para baixo a cada "cadencia" quadros. Não precisa de
   * alvo (é posicional): é o par natural do voador, que passa por cima bombardeando.
   */
  function _enemyBombAct(s, c, env) {
    if (typeof s._bcd !== 'number') s._bcd = c.rate;
    s._bcd -= 1;
    if (s._bcd > 0) return;
    s._bcd = c.rate;
    var shot = spawnBullet(env.type.bullets, {
      x: s.x + s.w / 2,
      y: s.y + s.h,
      radius: ENEMY_SHOT_R,
      color: c.color,
      vx: 0,
      vy: Math.abs(c.shotSpeed)
    });
    if (shot) shot.dmg = c.dmg;
  }

  /** Segue o alvo SÓ na horizontal, mantendo a altura. O andar clássico de nave. */
  function _enemyTrackMove(s, c, env) {
    var t = env.target;
    s.vx = 0;
    if (t) {
      var dx = (t.x + (t.w || 0) / 2) - (s.x + s.w / 2);
      if (Math.abs(dx) > env.speed) s.vx = dx < 0 ? -env.speed : env.speed;
      else s.vx = dx;
    }
    s.x += s.vx;
  }

  /**
   * Só atira quando o alvo está NA MESMA COLUNA (a folga é o "alcance"). É o
   * inimigo que espera a nave passar na frente em vez de atirar para o nada.
   * Contador PRÓPRIO (_acd) e tiro RETO na direção do alvo (já está alinhado):
   * ele só dispara quando a bala, caindo reta, tem como encostar no alvo.
   */
  function _enemyAimedShootAct(s, c, env, hasXDriver) {
    var t = env.target;
    if (!t) return;
    var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    var tcx = t.x + (t.w || 0) / 2, tcy = t.y + (t.h || 0) / 2;
    if (!hasXDriver) s.facing = (tcx < cx) ? -1 : 1;
    // ⭐ A pergunta é "se eu solto a bala AGORA, ela cai em cima dela?", e não
    // "estamos nos cruzando?". A bala sai do MEIO do inimigo e desce reta, então
    // quem manda é o corredor dela: meia caixa do alvo + o raio da bala.
    // ⚠️ A régua anterior era a sobreposição dos SPRITES ((s.w + t.w) / 2), que
    // mete a largura do INIMIGO numa conta em que ela não entra: a bala não sai
    // do ombro dele, sai da barriga. Com os padrões isso liberava o tiro com até
    // 28 px de desalinhamento contra 16 px de acerto possível, ou seja, 43% da
    // janela era erro GARANTIDO. Como a patrulha é periódica, o inimigo repetia
    // quase a mesma posição de disparo e, para uma nave parada, nunca acertava.
    // Relato dela: "ele atira meio para o lado e nunca me pega".
    // ⚠️ O _hitboxOf é o MESMO helper da colisão (respeita "área de colisão de
    // ⚠️ Limite conhecido, aceito: como o corredor é estreito (32 px com os
    // padrões), um inimigo que ande mais que isso por quadro PULA o corredor
    // entre dois quadros e quase nunca atira. Vale para qualquer porteiro por
    // posição em tempo discreto, e a alternativa (soltar a bala na beirada do
    // corredor) a faria nascer longe do corpo dele. Velocidade de patrulha
    // costuma ser 2.
    // O _hitboxOf é o MESMO helper da colisão (respeita "área de colisão de
    // N%"). O centro sai da CAIXA, não do sprite: hoje dá no mesmo (a caixa
    // nasce centrada), mas se ela ganhar deslocamento, como na extensão
    // avançada tem, o corredor acompanha sem ninguém lembrar disto aqui.
    // A comparação com >= casa com o < estrito do isColliding: no limite
    // há sobreposição, logo não há acerto.
    // ⭐ A recarga corre SEMPRE, alinhado ou não; o alinhamento é o GATILHO.
    // ⚠️ Era o contrário (o contador só descia dentro do corredor) e o efeito era
    // um inimigo que passava por cima da nave sem atirar: patrulhando a 2 px por
    // quadro ele fica alinhado poucos quadros por passagem, contra uma cadência
    // de 90, então precisava de QUATRO passagens para o primeiro tiro. Relato
    // dela, medido: 10 segundos parada embaixo dele, vendo passar três vezes.
    // Nasce CARREGADO de propósito: quem dá a folga aqui é o corredor (ele só
    // atira se ela estiver na frente), não um tempo de espera inicial.
    if (typeof s._acd !== 'number') s._acd = 0;
    if (s._acd > 0) s._acd -= 1;
    var alvoHb = _hitboxOf(t);
    var alvoCx = _finiteNumber(alvoHb.x, 0) + _finiteNumber(alvoHb.w, 0) / 2;
    if (Math.abs(alvoCx - cx) >= _finiteNumber(alvoHb.w, 0) / 2 + ENEMY_SHOT_R) return;
    if (s._acd > 0) return;
    s._acd = c.rate;
    var shot = spawnBullet(env.type.bullets, {
      x: cx,
      y: cy,
      radius: ENEMY_SHOT_R,
      color: c.color,
      vx: 0,
      vy: (tcy < cy ? -1 : 1) * Math.abs(c.shotSpeed)
    });
    if (shot) shot.dmg = c.dmg;
  }

  /**
   * Espelho horizontal do atirador alinhado: a TORRE de lado. Só dispara quando o
   * alvo entra na mesma faixa de ALTURA, e a bala sai reta para o lado dele.
   * Contador PROPRIO (_ycd) e o mesmo corredor de bala do irmao vertical: ele so
   * atira quando a bala, indo reta, tem como encostar no alvo.
   */
  function _enemySideShootAct(s, c, env) {
    var t = env.target;
    if (!t) return;
    var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    var tcx = t.x + (t.w || 0) / 2;
    // Nasce CARREGADO e recarrega SEMPRE: a faixa de altura e o GATILHO, nao o
    // relogio. (Foi o defeito que ela achou jogando no irmao vertical: com o
    // contador andando so dentro da faixa, ele passava e nao atirava.)
    if (typeof s._ycd !== 'number') s._ycd = 0;
    if (s._ycd > 0) s._ycd -= 1;
    // O corredor agora e na ALTURA: meia caixa do alvo + o raio da bala. Mesmo
    // helper da colisao, entao previsao e acerto nao podem divergir.
    var alvoHb = _hitboxOf(t);
    var alvoCy = _finiteNumber(alvoHb.y, 0) + _finiteNumber(alvoHb.h, 0) / 2;
    if (Math.abs(alvoCy - cy) >= _finiteNumber(alvoHb.h, 0) / 2 + ENEMY_SHOT_R) return;
    if (s._ycd > 0) return;
    s._ycd = c.rate;
    // ⚠️ Aqui o facing e definido SEMPRE, e nao so quando ninguem dirige o X como
    // fazem os irmaos. Motivo: hasXDriver e verdadeiro tambem com "parado" (ele
    // dirige os dois eixos), e numa TORRE parada a convencao deixaria o sprite
    // olhando para um lado e atirando para o outro, que estraga o arquetipo. O
    // autoAnimate roda DEPOIS das acoes e so mexe no facing com |vx| > 0.01,
    // entao quem anda continua virando pelo movimento, de graca.
    s.facing = (tcx < cx) ? -1 : 1;
    var shot = spawnBullet(env.type.bullets, {
      x: cx,
      y: cy,
      radius: ENEMY_SHOT_R,
      color: c.color,
      vx: (tcx < cx ? -1 : 1) * Math.abs(c.shotSpeed),
      vy: 0
    });
    if (shot) shot.dmg = c.dmg;
  }

  /**
   * Mira onde o alvo VAI ESTAR, não onde ele está: estima quantos quadros o
   * tiro leva para chegar e joga a mira na frente pela velocidade do alvo. É o
   * que separa a inteligência "ultra" da "avançada" — dessa não dá para fugir
   * andando reto, só mudando de direção. Contador PRÓPRIO (_pcd).
   */
  function _enemyPredictShootAct(s, c, env, hasXDriver) {
    var t = env.target;
    if (!t) return;
    var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    if (!hasXDriver) s.facing = ((t.x + (t.w || 0) / 2) < cx) ? -1 : 1;
    if (typeof s._pcd !== 'number') s._pcd = c.rate;
    s._pcd -= 1;
    if (s._pcd > 0) return;
    s._pcd = c.rate;
    var vel = Math.max(0.001, Math.abs(c.shotSpeed));
    var tx = t.x + (t.w || 0) / 2, ty = t.y + (t.h || 0) / 2;
    var bruto = Math.sqrt((tx - cx) * (tx - cx) + (ty - cy) * (ty - cy));
    var quadros = bruto / vel;
    var avx = _finiteNumber(t.vx, 0), avy = _finiteNumber(t.vy, 0);
    // ⚠️ Só adianta a mira quando o tiro é MAIS RÁPIDO que o alvo. Com um alvo
    // que fecha mais depressa que a bala, a conta de uma passada inverte o sinal
    // e o inimigo atira para o lado OPOSTO — e é o caso COMUM, porque a nave
    // anda a 6 por padrão e o tiro sai a 4. Nesse caso a mira direta é o melhor
    // que existe: interceptar é impossível mesmo.
    if (Math.sqrt(avx * avx + avy * avy) < vel) {
      tx += avx * quadros;
      ty += avy * quadros;
    }
    var ddx = tx - cx, ddy = ty - cy;
    var dd = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dd < 0.001) { ddx = (s.facing || 1); ddy = 0; dd = 1; }
    var shot = spawnBullet(env.type.bullets, {
      x: cx,
      y: cy,
      radius: ENEMY_SHOT_R,
      color: c.color,
      vx: (ddx / dd) * vel,
      vy: (ddy / dd) * vel
    });
    if (shot) shot.dmg = c.dmg;
  }

  // ---- Raio: o ataque que NÃO é um projétil ----
  // Três fases por inimigo: recarrega (cadencia) -> AVISA (60 quadros, um risco
  // fino piscando) -> LIGA (duracao). O aviso é o que torna o ataque justo: sem
  // ele a criança leva dano sem ter como sair da frente.
  /**
   * Raio da bala de TODO atirador de inimigo. É constante de propósito: o
   * atirador alinhado usa este número para decidir se vale disparar (a bala cai
   * reto e só acerta se passar dentro do alvo), então tamanho da bala e régua do
   * disparo têm que sair do MESMO lugar. Com dois literais soltos, mudar o
   * tamanho da bala desalinharia a mira em silêncio.
   */
  var ENEMY_SHOT_R = 4;

  var BEAM_WARN = 60;
  var BEAM_OFF = 0, BEAM_WARNING = 1, BEAM_ON = 2;

  /**
   * A coluna do raio: do pé do inimigo até a borda de baixo visível, com 60% da
   * largura dele. Reto para baixo, como o bombardeiro — assim o raio serve
   * também ao inimigo burro, que não olha para ninguém.
   * Devolve um objeto REUSADO (não guarde a referência).
   */
  var _beamRect = { x: 0, y: 0, w: 0, h: 0 };
  function _enemyBeamRect(s) {
    var largura = Math.max(2, s.w * 0.6);
    _beamRect.x = s.x + (s.w - largura) / 2;
    _beamRect.y = s.y + s.h;
    _beamRect.w = largura;
    // A borda de baixo foi guardada no quadro do update: quem varre a colisão
    // não tem pincel em mãos, e desenho e dano precisam da MESMA coluna.
    _beamRect.h = Math.max(0, _finiteNumber(s._beamBottom, _beamRect.y) - _beamRect.y);
    return _beamRect;
  }

  function _enemyBeamAct(s, c, env) {
    s._beamBottom = env.visible.bottom;
    if (typeof s._beamPhase !== 'number') { s._beamPhase = BEAM_OFF; s._beamT = c.rate; }
    s._beamT -= 1;
    if (s._beamT > 0) return;
    if (s._beamPhase === BEAM_OFF) { s._beamPhase = BEAM_WARNING; s._beamT = BEAM_WARN; }
    else if (s._beamPhase === BEAM_WARNING) { s._beamPhase = BEAM_ON; s._beamT = c.beamFrames; }
    else { s._beamPhase = BEAM_OFF; s._beamT = c.rate; }
  }

  /**
   * O raio pelo caminho de GRUPO ("Desenhar o grupo …", que o review de 07/08
   * legitimou como o bloco CERTO num jogo visto de cima). Sem isto o feixe
   * machucaria sem aparecer, inclusive o aviso, que é o que torna o ataque justo.
   * Reconhece o tipo pelo formato: só ele tem config E bullets.
   */
  function _drawEnemyBeamsIfAny(ctx, group) {
    if (group && group.config && group.bullets) _drawEnemyBeams(ctx, group);
  }

  /** Desenha o aviso (risco fino piscando) e o feixe ligado. */
  function _drawEnemyBeams(ctx, type) {
    var items = type.items;
    var c = type.config || {};
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      if (!s || !s._beamPhase) continue;
      var r = _enemyBeamRect(s);
      if (r.h <= 0) continue;
      ctx.save();
      if (s._beamPhase === BEAM_WARNING) {
        // Pisca a cada 8 quadros: dá para ver de onde vem sem sujar a tela.
        // ⚠️ A conta é pelo tempo JÁ DECORRIDO, não pelo que falta: o contador
        // desce de 60, e por 60 o primeiro trecho caía no lado apagado. O aviso
        // nascia invisível justo nos quadros em que ela precisa reagir (visto
        // em navegador, lendo o pixel do risco no 1º quadro do aviso).
        if (Math.floor((BEAM_WARN - s._beamT) / 8) % 2 === 0) {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = s.color || c.color;
          ctx.fillRect(r.x + r.w / 2 - 1, r.y, 2, r.h);
        }
      } else {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = s.color || c.color;
        ctx.fillRect(r.x - 3, r.y, r.w + 6, r.h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(r.x + r.w / 4, r.y, r.w / 2, r.h);
      }
      ctx.restore();
    }
  }

  /**
   * Para cada RAIO ligado do tipo que encosta no sprite: roda fn(dono do raio).
   * ⚠️ Ao contrário do overlapEnemyShots, NÃO remove nada — o feixe continua
   * ligado. Quem segura o ritmo do dano é a invencibilidade do "Machucar o
   * sprite com o dano de contato" (45 quadros).
   */
  function overlapEnemyBeams(getSprite, type, fn) {
    if (typeof getSprite !== 'function' || typeof fn !== 'function') return;
    if (!type || !type.items) return;
    type._beamChecked = true;
    var generation = _driverGeneration;
    var sprite = _invokeProjectCallback(getSprite, undefined, []);
    if (_runGenerationChanged(generation)) return;
    if (!sprite) return;
    // Snapshot + pertencimento (o padrão do overlapGroups): remover OUTRO
    // inimigo dentro do corpo desloca os índices e faria o mesmo raio acertar
    // duas vezes no mesmo quadro.
    var items = type.items.slice();
    var vivos = new Set(type.items);
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      if (!s || !vivos.has(s) || s._beamPhase !== BEAM_ON) continue;
      var r = _enemyBeamRect(s);
      if (r.h <= 0 || !isColliding(sprite, r)) continue;
      _invokeProjectCallback(fn, undefined, [s]);
      if (_runGenerationChanged(generation)) return;
    }
  }

  var ENEMY_BEHAVIORS = {
    // --- jeitos de andar no chão ---
    'patrulha':        { x: 1, move: _enemyPatrolMove },
    'perseguidor':     { x: 1, y: 1, alvo: 1, move: _enemyChaseMove },
    'saltador':        { y: 1, move: _enemyHopMove },
    // "Parado" DIRIGE os dois eixos de propósito: se não dirigisse nenhum, somar
    // "parado" a um perseguidor não faria nada e a criança não teria como
    // congelar um inimigo.
    'parado':          { x: 1, y: 1, move: _enemyIdleMove },
    'medroso':         { x: 1, alvo: 1, move: _enemyFleeMove },
    'arrancada':       { x: 1, alvo: 1, move: _enemyChargeMove },
    'perseguidor-lado': { x: 1, alvo: 1, move: _enemyTrackMove },
    // --- jeitos de voar ---
    'voador':          { x: 1, flying: 1, move: _enemyFlyMove },
    'voador-vertical': { y: 1, flying: 1, move: _enemyFlyVerticalMove },
    'rondador':        { x: 1, y: 1, flying: 1, move: _enemyCircleMove },
    'mergulhador':     { x: 1, y: 1, flying: 1, alvo: 1, move: _enemyDiveMove },
    'teleporte':       { x: 1, y: 1, flying: 1, alvo: 1, move: _enemyTeleportMove },
    'zigue-zague':     { x: 1, y: 1, flying: 1, move: _enemyZigZagMove },
    // --- o que ele FAZ (soma com qualquer jeito de andar) ---
    'atirador':        { alvo: 1, act: _enemyShootAct },
    'atirador-alinhado': { alvo: 1, act: _enemyAimedShootAct },
    'atirador-lado':   { alvo: 1, act: _enemySideShootAct },
    'atirador-esperto': { alvo: 1, act: _enemyPredictShootAct },
    'atirador-leque':  { alvo: 1, act: _enemyFanShootAct },
    'bombardeiro':     { act: _enemyBombAct },
    'raio':            { act: _enemyBeamAct },
    'espinho':         { immortal: 1 },
    'renascer':   { revive: 1 },
    'chefao':          { boss: 1, alvo: 1, act: _enemyFanShootAct }
  };

  /**
   * Os níveis de INTELIGÊNCIA: cada um é um pacote pronto de comportamentos, na
   * ordem em que entram na lista. A criança escolhe UMA coisa e ganha o inimigo
   * inteiro; o "também é" continua somando por cima (é assim que um inimigo de
   * inteligência burra ganha um raio).
   */
  var ENEMY_SMART_COMBOS = {
    'burra': { fazer: ['patrulha', 'bombardeiro'] },
    'basica': { fazer: ['patrulha', 'atirador-alinhado'] },
    'avancada': { fazer: ['perseguidor', 'atirador'] },
    // ⚠️ tiro 8: a mira adiantada só existe quando o tiro é mais rápido que o
    // alvo, e a nave anda a 6 por padrão. Sem este ajuste a "ultra" seria
    // idêntica à "avançada" na tela, e o menu estaria mentindo.
    'ultra': { fazer: ['perseguidor', 'atirador-esperto'], tiro: 8 },
    'rei': { fazer: ['perseguidor', 'atirador-esperto', 'raio', 'chefao'], tiro: 8 }
  };

  /** Cria o tipo já com o pacote da inteligência escolhida. */
  function createSmartEnemyType(options) {
    options = options || {};
    var combo = Object.prototype.hasOwnProperty.call(ENEMY_SMART_COMBOS, options.smart)
      ? ENEMY_SMART_COMBOS[options.smart]
      : null;
    if (!combo) {
      var pedida = (typeof options.smart === 'string' && options.smart) ? '"' + options.smart + '"' : 'nenhuma';
      warnOnce(
        'inteligencia-desconhecida:' + String(options.smart),
        'você escolheu a inteligência ' + pedida + ', que não existe. Vale burra, basica, avancada, ultra ou rei; por enquanto ele fica com a burra.'
      );
      combo = ENEMY_SMART_COMBOS['burra'];
    }
    var type = createEnemyType(options);
    type.config.behavior = combo.fazer[0];
    type.config.behaviors = combo.fazer.slice();
    if (combo.tiro) type.config.shotSpeed = combo.tiro;
    return type;
  }

  /**
   * Soma MAIS um comportamento ao tipo (patrulha + atirador anda E atira).
   * Repetir um que já está na lista o move para o FIM: "o que acabei de somar
   * passou a mandar" vale sempre, senão somar de novo não faria nada visível.
   */
  /**
   * O registro do comportamento, ou null.
   * ⚠️ hasOwnProperty: sem ele, nomes herdados de Object.prototype
   * ('toString', 'constructor', '__proto__') passariam por comportamento válido
   * e o inimigo ficaria inerte em vez de cair no padrão.
   */
  function _enemyBehaviorRecord(name) {
    return Object.prototype.hasOwnProperty.call(ENEMY_BEHAVIORS, name) ? ENEMY_BEHAVIORS[name] : null;
  }

  function addEnemyTypeBehavior(type, behavior) {
    if (!type || !type.config) return;
    var c = type.config;
    var list = c.behaviors || (c.behaviors = [c.behavior || 'patrulha']);
    if (!_enemyBehaviorRecord(behavior)) {
      if (!type._warnedBadBehavior) {
        type._warnedBadBehavior = true;
        console.warn(
          'SZGame2D: "' + behavior + '" não é um comportamento de inimigo conhecido. Use um dos nomes que aparecem no bloco "O tipo de inimigo ... também é ...".'
        );
      }
      return;
    }
    var at = list.indexOf(behavior);
    if (at >= 0) list.splice(at, 1);
    list.push(behavior);
  }

  /**
   * Tropeço nº 1 dos inimigos: atualizar/desenhar um tipo em que NUNCA se
   * soltou inimigo (o "Criar tipo" define só a CLASSE; sem o "Soltar um
   * inimigo do tipo..." a lista fica vazia e nada aparece na tela). Avisa UMA
   * vez por tipo; depois do primeiro spawn o aviso não dispara mais.
   */
  function warnEnemyTypeEmptyOnce(type) {
    if (!type || !type.config || type._spawned || type._warnedNoSpawn) return;
    if (!type.items || type.items.length !== 0) return;
    // GRAÇA: jogos de ONDA soltam o 1º inimigo via "A cada N quadros", alguns
    // segundos depois do início. Sem esta janela, o aviso dispararia já no 1º
    // quadro (antes da 1ª onda) — falso-positivo em Sobrevivente/Herói que Evolui
    // e reprova o smoke e2e. ~6s (chamado ~2×/quadro por update+draw) dá tempo à
    // onda; se NUNCA soltar (esquecimento real), avisa depois disso.
    type._emptyUpdates = (type._emptyUpdates || 0) + 1;
    if (type._emptyUpdates < 720) return;
    type._warnedNoSpawn = true;
    console.warn(
      'SZGame2D: o tipo de inimigo foi criado, mas nenhum inimigo foi solto ainda, por isso nada aparece. Use o bloco "Soltar um inimigo do tipo ... em x y" (fora do "A cada quadro"; para ondas, use dentro de "A cada N quadros fazer").'
    );
  }

  /** A lista de comportamentos do tipo (projeto antigo cai no de nascença). */
  function _enemyBehaviorList(c) {
    return (c.behaviors && c.behaviors.length) ? c.behaviors : [c.behavior || 'patrulha'];
  }

  /**
   * Quem aproveita cada ajuste fino. Espelha o parêntese do dropdown "Ajustar
   * no tipo de inimigo" e serve só para avisar quando a criança mexe num valor
   * que nenhum comportamento do tipo usa.
   */
  var ENEMY_PARAM_OWNERS = {
    'pulo': ['saltador'],
    'ritmo': ['saltador'],
    'alcance': ['voador', 'voador-vertical', 'rondador', 'zigue-zague', 'mergulhador', 'teleporte', 'arrancada', 'medroso'],
    'cadencia': ['atirador', 'atirador-alinhado', 'atirador-lado', 'atirador-esperto', 'atirador-leque', 'bombardeiro', 'teleporte', 'chefao', 'raio'],
    'tiro': ['atirador', 'atirador-alinhado', 'atirador-lado', 'atirador-esperto', 'atirador-leque', 'bombardeiro', 'chefao'],
    'voltar': ['renascer'],
    'duracao': ['raio'],
    // Serve a TODOS (é a vida de quem nasce), então nunca vira aviso de órfão.
    'vida': null
  };

  /**
   * O nome CURTO de cada comportamento como ele aparece no menu. O aviso de
   * ajuste órfão citava o valor do enum ('atirador-esperto', 'chefao'), que ela
   * nunca leu em lugar nenhum.
   * ⚠️ Travado contra o dropdown no docDrift.
   */
  var ENEMY_BEHAVIOR_LABELS = {
    'patrulha': 'patrulha',
    'perseguidor': 'perseguidor',
    'perseguidor-lado': 'perseguidor de lado',
    'saltador': 'saltador',
    'arrancada': 'arrancada',
    'medroso': 'medroso',
    'parado': 'parado',
    'voador': 'voador',
    'voador-vertical': 'voador (sobe e desce)',
    'rondador': 'rondador',
    'zigue-zague': 'zigue-zague',
    'mergulhador': 'mergulhador',
    'teleporte': 'teleporte',
    'atirador': 'atirador',
    'atirador-alinhado': 'atirador alinhado',
    'atirador-lado': 'atirador de lado',
    'atirador-esperto': 'atirador esperto',
    'atirador-leque': 'atirador em leque',
    'bombardeiro': 'bombardeiro',
    'raio': 'raio',
    'espinho': 'espinho',
    'renascer': 'renascer',
    'chefao': 'chefão'
  };

  /** Os nomes dos donos de um ajuste, do jeito que ela lê no menu. */
  function _enemyOwnerLabels(param) {
    var donos = ENEMY_PARAM_OWNERS[param] || [];
    var out = [];
    for (var i = 0; i < donos.length; i++) out.push(ENEMY_BEHAVIOR_LABELS[donos[i]] || donos[i]);
    return out.join(', ');
  }

  /** O rótulo do ajuste como ele aparece no bloco (para o aviso citar a face). */
  var ENEMY_PARAM_LABELS = {
    'pulo': 'força do pulo',
    'ritmo': 'pular a cada tantos quadros',
    'alcance': 'alcance',
    'cadencia': 'a cada tantos quadros ele age',
    'tiro': 'velocidade do tiro',
    'voltar': 'voltar depois de tantos quadros',
    'duracao': 'o raio fica ligado por tantos quadros',
    'vida': 'vida dos próximos que nascerem'
  };

  /** O primeiro ajuste que a criança mexeu e que nenhum comportamento do tipo usa. */
  function _enemyOrphanParam(c, list) {
    var tocados = c._touched;
    if (!tocados) return '';
    for (var param in tocados) {
      var donos = Object.prototype.hasOwnProperty.call(ENEMY_PARAM_OWNERS, param)
        ? ENEMY_PARAM_OWNERS[param]
        : null;
      if (!donos) continue;
      var serve = false;
      for (var i = 0; i < list.length; i++) {
        if (donos.indexOf(list[i]) >= 0) { serve = true; break; }
      }
      if (!serve) return param;
    }
    return '';
  }

  /**
   * Os quatro tropeços que o motor não tinha como mostrar: atualizar sem
   * desenhar, ajustar um valor que ninguém do tipo usa e esquecer o alvo.
   *
   * Todos esperam a MESMA janela de graça do aviso de "tipo sem inimigo": jogos
   * de onda montam o cenário aos poucos (um "também é" pode chegar na fase 2),
   * e acusar no primeiro quadro seria falso-positivo. Avisa uma vez só.
   */
  function _warnEnemySetupOnce(type, c, list, target, precisaDeAlvo) {
    if (!type.items.length) return;
    // ⚠️ Contadores de quadros SEGUIDOS, não um instante marcado. A criança monta
    // o jogo aos poucos (o "também é" da fase 2 chega minutos depois), e um
    // aviso disparado num quadro fixo acusaria quem ainda ia consertar. Assim o
    // contador zera sozinho quando ela liga a peça que faltava.
    // Consome a marca: quem PAROU de desenhar (o "Desenhar" dentro de um "se" de
    // fase, por exemplo) volta a ser contado.
    type._noDraw = type._drawn ? 0 : (type._noDraw || 0) + 1;
    type._drawn = false;
    type._noTarget = (precisaDeAlvo && !target) ? (type._noTarget || 0) + 1 : 0;
    var orfao = _enemyOrphanParam(c, list);
    type._orphan = orfao ? (type._orphan || 0) + 1 : 0;
    if (type._noDraw === 360) {
      console.warn(
        'SZGame2D: os inimigos estão vivos e andando, mas ninguém os desenha, por isso a tela fica vazia. Ponha o bloco "Desenhar os inimigos do tipo ..." dentro do "A cada quadro do jogo", logo depois do "Atualizar os inimigos do tipo ...".'
      );
    }
    // O raio é o único ataque cujo dano precisa de um bloco SEPARADO. Sem isso a
    // criança vê o feixe atravessar a nave e conclui que "o raio não funciona".
    type._beamSemDano =
      (list.indexOf('raio') >= 0 && !type._beamChecked) ? (type._beamSemDano || 0) + 1 : 0;
    type._beamChecked = false;
    if (type._beamSemDano === 360) {
      console.warn(
        'SZGame2D: o raio está ligando, mas ninguém confere se ele acertou, então ele não machuca ninguém. Ponha o bloco "Para cada raio do tipo ... que acertar o sprite ..." dentro do "A cada quadro do jogo", com o "Machucar o sprite com o dano de contato do inimigo" lá dentro.'
      );
    }
    if (type._noTarget === 360) {
      console.warn(
        'SZGame2D: este tipo de inimigo tem um comportamento que precisa de ALVO (perseguir, mirar, fugir), mas o alvo está vazio, então a parte que precisa de alvo não acontece. No bloco "Atualizar os inimigos do tipo ...", escolha o sprite em "alvo:".'
      );
    }
    if (type._orphan === 1800) {
      console.warn(
        'SZGame2D: "' + ENEMY_PARAM_LABELS[orfao] + '" só muda alguma coisa nos comportamentos ' + _enemyOwnerLabels(orfao) + ', e este tipo de inimigo não tem nenhum deles. Junte o comportamento no bloco "O tipo de inimigo ... também é ...", ou escolha outro valor para ajustar.'
      );
    }
  }

  /**
   * Move TODOS os inimigos do tipo conforme os comportamentos somados, anima
   * (autoAnimate), atira, remove os derrotados (vida 0 -> particulas + "quando
   * for derrotado") e move/poda os tiros. Use DENTRO do "a cada quadro".
   */
  function updateEnemyType(type, ctx, target) {
    warnEnemyTypeEmptyOnce(type);
    if (!type || !type.items || !ctx || !ctx.canvas) return;
    var generation = _driverGeneration;
    var c = type.config || {};
    var visible = _visibleWorldRect(ctx);
    // A direção do mundo escolhe chão/pulo, mas a aceleração nunca vem escondida
    // neste helper: use applyGravityToGroup(type) antes de atualizar inimigos
    // terrestres que devem cair.
    var g = world.gravity;
    // Quem manda em cada eixo é resolvido UMA vez por chamada (não por item):
    // somar um comportamento vale a partir do próximo "atualizar".
    var list = _enemyBehaviorList(c);
    var ownerX = null, ownerY = null, flying = false, acts = null;
    var immortal = false, revive = false, boss = false, precisaDeAlvo = false;
    for (var bi = 0; bi < list.length; bi++) {
      // Compat com o modo Código: nome desconhecido na posição de NASCENÇA cai
      // em patrulha (era o 'else' da cadeia antiga). Via "Somar" nunca entra.
      var rec = _enemyBehaviorRecord(list[bi]) || (bi === 0 ? ENEMY_BEHAVIORS['patrulha'] : null);
      if (!rec) continue;
      if (rec.x) ownerX = rec;
      if (rec.y) ownerY = rec;
      if (rec.flying) flying = true;
      if (rec.immortal) immortal = true;
      if (rec.revive) revive = true;
      if (rec.boss) boss = true;
      if (rec.alvo) precisaDeAlvo = true;
      // Mesma função duas vezes (chefão + atirador em leque) dispara UMA rajada.
      if (rec.act && (!acts || acts.indexOf(rec.act) < 0)) (acts || (acts = [])).push(rec.act);
    }
    _warnEnemySetupOnce(type, c, list, target, precisaDeAlvo);
    var hasXDriver = !!ownerX;
    var env = {
      type: type,
      visible: visible,
      g: g,
      flying: flying,
      target: target,
      speed: boss ? c.speed * 0.5 : c.speed
    };
    // Ressuscitador: os prazos vencidos viram inimigos novos na casa deles. Vem
    // ANTES do laço para o prazo contar a partir do quadro SEGUINTE ao da morte
    // (senão "voltar em 3 quadros" voltaria em 2) e para o inimigo que renasce
    // já andar neste mesmo quadro.
    var revives = type._revives;
    if (revives && revives.length) {
      for (var ri = revives.length - 1; ri >= 0; ri--) {
        var slot = revives[ri];
        slot.t -= 1;
        // Com o grupo no teto, spawnEnemy devolve null. O slot FICA na fila e
        // tenta de novo no quadro seguinte: sumir em silêncio faria o inimigo
        // prometido nunca voltar, e a criança não teria como saber por quê.
        if (slot.t <= 0 && spawnEnemy(type, slot.x, slot.y)) revives.splice(ri, 1);
      }
    }
    for (var i = type.items.length - 1; i >= 0; i--) {
      var s = type.items[i];
      if (!s) { _removeGroupItemAt(type, i); continue; }
      // Animações registradas DEPOIS do spawn ainda alcançam este inimigo.
      if (c.animStates && !s.animStates) s.animStates = c.animStates;
      // Sprite que entrou pelo "Pôr o sprite no grupo" não passou pelo spawn e
      // não tem casa: sem isto o rondador faria a conta com undefined e o
      // inimigo sumia da tela com x/y NaN, ocupando um slot para sempre.
      if (typeof s._homeX !== 'number') { s._homeX = s.x; s._homeY = s.y; }
      if (typeof s._dir !== 'number') s._dir = 1;
      // Chefão: engorda a vida UMA vez por inimigo. É um buff de TETO, não uma
      // cura: a vida máxima cresce 5× e o inimigo ganha a diferença, então o
      // dano que ele já levou continua valendo (somar "chefão" no meio do jogo
      // não pode apagar a luta que a criança já teve).
      // ⚠️ Só engorda quem está VIVO: um inimigo morto no quadro anterior (onda
      // que solta depois do update) teria o primeiro update dele já com hp 0, e
      // o buff o traria de volta com vida cheia antes da poda.
      if (boss && !s._boss && typeof s.hp === 'number' && s.hp > 0) {
        s._boss = true;
        var tetoAntigo = _positiveFiniteNumber(s.hpMax, c.hp);
        var tetoNovo = tetoAntigo * 5;
        s.hpMax = tetoNovo;
        s.hp = Math.min(tetoNovo, _finiteNumber(s.hp, tetoAntigo) + (tetoNovo - tetoAntigo));
        // A referência do "levou dano" sobe junto: senão um chefão já ferido no
        // quadro em que nasce teria o golpe engolido pelo buff.
        s._hpAntes = _finiteNumber(s._hpAntes, tetoAntigo) + (tetoNovo - tetoAntigo);
      }
      // Trocou quem manda no X? O andar começa do zero. Sem isto a patrulha lê o
      // vx 0 que o dono anterior deixou como "bati na parede" e vira sozinha ao
      // ser somada de volta. Com um comportamento só, o dono nunca muda e nada
      // acontece aqui.
      if (s._xOwner !== ownerX) { s._xOwner = ownerX; s._moved = false; }
      if (ownerX && ownerX === ownerY) {
        // Um só comportamento dirige os dois eixos: uma chamada, não duas.
        ownerX.move(s, c, env, true, true);
      } else {
        if (ownerX) ownerX.move(s, c, env, true, false); else s.vx = 0;
        if (ownerY) {
          ownerY.move(s, c, env, false, true);
        } else if (flying) {
          s.vy = 0;
        } else {
          // Integra o vy existente. Num top-down ele continua 0; num jogo de
          // plataforma applyGravityToGroup o acelera explicitamente antes daqui.
          s.vy = _finiteNumber(s.vy, 0);
          s.y += s.vy;
          if (s.vy !== 0 || typeof s.onGround === 'boolean') {
            _resolveGravityGround(s, visible.top, visible.bottom, g);
          }
        }
      }
      if (acts) for (var ai = 0; ai < acts.length; ai++) acts[ai](s, c, env, hasXDriver);
      autoAnimate(s);
      // ⚠️ Guardado ANTES da cura do espinho: é este o valor que diz se ele
      // levou dano. Sem isso, o golpe que o mataria (e a pisada) restauravam a
      // vida e o "quando levar dano" ficava mudo justo no golpe mais forte.
      var hpDoQuadro = typeof s.hp === 'number' ? s.hp : null;
      // Espinho: a vida volta antes da poda, então ele nunca é derrotado, só
      // machuca quem encostar. Volta ao TETO DELE (não ao do tipo: o chefão
      // dobrou o teto, e a barra de vida lê hp/hpMax).
      // ⚠️ O dano volta junto: quem pisa num inimigo zera o dano dele
      // (stompEnemyType) contando que ele morra no mesmo quadro. O espinho não
      // morre, então sem esta linha ele viraria enfeite para o resto do jogo.
      if (immortal && typeof s.hp === 'number' && s.hp <= 0) {
        s.hp = _positiveFiniteNumber(s.hpMax, c.hp);
        s.dmg = c.dmg;
      }
      // Levou dano e SOBREVIVEU: avisa o "quando levar dano". Quem chegou a zero
      // não passa por aqui — para esse a criança tem o "quando for derrotado", e
      // disparar os dois no mesmo golpe faria o chefão trocar de fase morrendo.
      if (hpDoQuadro !== null) {
        var antes = _finiteNumber(s._hpAntes, hpDoQuadro);
        // "Sobreviveu" = a vida de AGORA é positiva (o espinho já foi curado).
        if (hpDoQuadro < antes && s.hp > 0) {
          _runEnemyHurtHandlers(type, s);
          if (_runGenerationChanged(generation)) return;
        }
        s._hpAntes = s.hp;
      }
      // Derrotado: some soltando particulas e avisa o "quando for derrotado".
      if (typeof s.hp === 'number' && s.hp <= 0) {
        // Saiu do tipo, sai da vista no MESMO quadro (o _revision do tipo muda,
        // e o selo da vista muda com ele).
        _removeGroupItemAt(type, i);
        if (revive) {
          if (!type._revives) type._revives = [];
          if (type._revives.length < 100) {
            type._revives.push({
              x: _finiteNumber(s._homeX, s.x),
              y: _finiteNumber(s._homeY, s.y),
              t: c.reviveRate
            });
          }
        }
        emitParticles(s.x + s.w / 2, s.y + s.h / 2, 12, s.color || c.color);
        _runEnemyDefeatHandlers(type, s);
        if (_runGenerationChanged(generation)) return;
      }
    }
    // Integra e poda os tiros numa passagem. Eles seguem em linha reta, sem a
    // gravidade do mundo, e usam uma margem de 40 px fora da área visível.
    var bs = (type.bullets && type.bullets.items) ? type.bullets.items : null;
    if (bs) {
      for (var k = bs.length - 1; k >= 0; k--) {
        var shot2 = bs[k];
        if (!shot2) { _removeGroupItemAt(type.bullets, k); continue; }
        shot2.x += shot2.vx || 0;
        shot2.y += shot2.vy || 0;
        if (shot2.x < visible.left - 40 || shot2.y < visible.top - 40 || shot2.x > visible.right + 40 || shot2.y > visible.bottom + 40) _removeGroupItemAt(type.bullets, k);
      }
    }
  }

  /** Desenha os inimigos do tipo E os tiros deles. */
  function drawEnemyType(ctx, type) {
    warnEnemyTypeEmptyOnce(type);
    if (!ctx || !type) return;
    // Marca para o aviso de "atualizou e nunca desenhou" (a tela vazia sem pista).
    type._drawn = true;
    // ⚠️ NÃO desenhar o feixe aqui: o drawGroup abaixo já cuida disso (foi para
    // lá quando o caminho de grupo virou oficial). Chamar nos dois pintava o
    // halo duas vezes e o aviso ficava quase sólido, estragando a leitura.
    drawGroup(ctx, type);
    drawGroup(ctx, type.bullets);
  }

  function _runEnemyDefeatHandlers(type, sprite) {
    if (!type) return;
    var generation = _driverGeneration;
    var order = type._defeatOrder ? type._defeatOrder.slice() : [];
    // Compatibilidade com código antigo que atribuía type.onDefeat diretamente.
    if (!order.length && typeof type.onDefeat === 'function') order.push('__legacy__');
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var handler = id === '__legacy__' ? type.onDefeat : type._defeatHandlers[id];
      if (typeof handler !== 'function') continue;
      try { _invokeProjectCallback(handler, undefined, [sprite]); }
      catch (error) {
        _reportHandlerError('“Quando um inimigo for derrotado”', id, error);
        if (id === '__legacy__') {
          if (type.onDefeat === handler) type.onDefeat = null;
        } else {
          _removeOrderedIfCurrent(type._defeatHandlers, type._defeatOrder, id, handler);
        }
      }
      if (_runGenerationChanged(generation)) return;
    }
  }

  function _runEnemyHurtHandlers(type, sprite) {
    if (!type || !type._hurtOrder) return;
    var generation = _driverGeneration;
    var order = type._hurtOrder.slice();
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var handler = type._hurtHandlers[id];
      if (typeof handler !== 'function') continue;
      try { _invokeProjectCallback(handler, undefined, [sprite]); }
      catch (error) {
        _reportHandlerError('“Quando um inimigo levar dano”', id, error);
        _removeOrderedIfCurrent(type._hurtHandlers, type._hurtOrder, id, handler);
      }
      if (_runGenerationChanged(generation)) return;
    }
  }

  /**
   * Registra o "quando levar dano" (o gancho de FASE do chefão: leia a vida dele
   * ali dentro para deixá-lo furioso na metade). Registre UMA vez, fora do laço.
   */
  function onEnemyHurt(type, fn, id) {
    if (!type || typeof fn !== 'function') return;
    if (!type._hurtHandlers) type._hurtHandlers = Object.create(null);
    if (!type._hurtOrder) type._hurtOrder = [];
    var handlerId = _stableHandlerId('inimigo-machucado', id, fn);
    if (!type._hurtHandlers[handlerId]) type._hurtOrder.push(handlerId);
    type._hurtHandlers[handlerId] = fn;
  }

  /** Registra eventos independentes de derrota, identificados pelo bloco. */
  function onEnemyDefeated(type, fn, id) {
    if (!type || typeof fn !== 'function') return;
    if (!type._defeatHandlers) type._defeatHandlers = Object.create(null);
    if (!type._defeatOrder) type._defeatOrder = [];
    var handlerId = _stableHandlerId('inimigo-derrotado', id, fn);
    if (!type._defeatHandlers[handlerId]) type._defeatOrder.push(handlerId);
    type._defeatHandlers[handlerId] = fn;
  }

  /**
   * Para cada TIRO do tipo que encosta no sprite: REMOVE o tiro e roda fn(tiro).
   * Varredura por quadro (use no "a cada quadro"), espelho do overlapSpriteGroup.
   */
  function overlapEnemyShots(getSprite, type, fn) {
    if (typeof getSprite !== 'function' || typeof fn !== 'function') return;
    if (!type || !type.bullets || !type.bullets.items) return;
    var generation = _driverGeneration;
    var sprite = _invokeProjectCallback(getSprite, undefined, []);
    if (_runGenerationChanged(generation)) return;
    if (!sprite) return;
    var items = type.bullets.items;
    for (var i = items.length - 1; i >= 0; i--) {
      var shot = items[i];
      if (shot && isColliding(sprite, shot)) {
        _removeGroupItemAt(type.bullets, i);
        _invokeProjectCallback(fn, undefined, [shot]);
        if (_runGenerationChanged(generation)) return;
      }
    }
  }

  /** O dano de contato guardado no inimigo (ou no tiro dele). */
  function enemyDamage(sprite) {
    return sprite ? _finiteNumber(sprite.dmg, 1) : 1;
  }

  /**
   * Machuca o sprite com o dano do inimigo/tiro e faz piscar. Enquanto pisca,
   * e INVENCIVEL (nao leva dano de novo) — sem isso, o contato continuo
   * drenaria a vida a cada quadro.
   */
  function hurtByEnemy(sprite, enemy) {
    if (!sprite || !enemy) return;
    damageSprite(sprite, enemyDamage(enemy), 45);
  }

  /**
   * Derrota os inimigos do tipo em que o sprite PISAR — o gesto clássico de
   * plataforma. Só vale CAINDO nele (com a gravidade invertida, subindo nele);
   * encostar de lado não derrota, e ali quem age é o "Machucar o sprite com o
   * dano de contato".
   */
  function stompEnemyType(sprite, type, bounce) {
    if (!sprite || !type || !type.items) return;
    var up = _gravityPullsUp(world.gravity);
    var b = Math.abs(_finiteNumber(bounce, 8));
    for (var i = type.items.length - 1; i >= 0; i--) {
      var e = type.items[i];
      if (!e || !isColliding(sprite, e)) continue;
      var svy = _finiteNumber(sprite.vy, 0);
      var evy = _finiteNumber(e.vy, 0);
      if (up ? svy >= evy : svy <= evy) continue;
      // ⚠️ Descer não basta: com a gravidade do mundo o jogador está SEMPRE
      // descendo, então só a velocidade faria o encontrão de LADO virar pisada
      // (e o bloco promete o contrário). Ele também precisa ter VINDO de cima:
      // no começo do quadro o pé estava na altura do topo do inimigo, com a
      // folga de um quadro de queda para o pulo rápido não passar batido.
      var folga = Math.max(4, Math.abs(svy));
      if (up) {
        if (sprite.y - svy < e.y + e.h - folga) continue;
      } else if (sprite.y + sprite.h - svy > e.y + folga) {
        continue;
      }
      sprite.y = up ? e.y + e.h : e.y - sprite.h;
      sprite.vy = up ? b : -b;
      sprite.onGround = false;
      // Inimigo derrotado não machuca mais neste quadro: com dano 0 o "Machucar
      // com o dano de contato" sai cedo, então o pulo certo não vira castigo.
      e.dmg = 0;
      // A MORTE continua sendo do "Atualizar os inimigos": partículas, o
      // "quando for derrotado" e o aborto de reinício moram num lugar só.
      e.hp = 0;
    }
  }

  _registerRuntimeDomain('enemies', {
    reset: function () {
      _enemyTypeCreates = 0;
      _enemyTypes.length = 0;
      _enemyMirrorWarned = Object.create(null);
    }
  });

`
