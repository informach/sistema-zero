export const gameTwoDWorldGroupsRuntime = `  // ---- Grupos de sprites: MUITOS sprites (tiros, inimigos, estrelas) ----
  // Um grupo é só uma LISTA gerenciada de sprites — os mesmos objetos de
  // createSprite. Assim drawSprite/applyVelocity/isColliding já funcionam em
  // cada item, sem motor novo. Teto rígido p/ não vazar memória se o aluno
  // criar sprites sem parar (ex.: um tiro por quadro).
  var MAX_GROUP = 400;
  // Um sprite pode pertencer a mais de um grupo no modo Código. O redraw de uma
  // imagem pendente pertence ao SPRITE, não a um vínculo isolado: só o liberamos
  // quando o último grupo gerenciado deixa de possuir aquele objeto.
  var _managedGroups = new WeakSet();
  var _spriteGroupOwners = new WeakMap();
  function _trackableGroupItem(sprite) {
    return !!sprite && (typeof sprite === 'object' || typeof sprite === 'function');
  }
  function _uniqueTrackableItems(items) {
    var unique = new Set();
    for (var i = 0; i < items.length; i++) {
      if (_trackableGroupItem(items[i])) unique.add(items[i]);
    }
    return unique;
  }
  function _syncGroupOwnership(previousItems, nextItems) {
    var previous = _uniqueTrackableItems(previousItems);
    var next = _uniqueTrackableItems(nextItems);
    next.forEach(function (sprite) {
      if (previous.has(sprite)) return;
      _spriteGroupOwners.set(sprite, (_spriteGroupOwners.get(sprite) || 0) + 1);
    });
    previous.forEach(function (sprite) {
      if (next.has(sprite)) return;
      var owners = _spriteGroupOwners.get(sprite) || 0;
      if (owners <= 1) {
        _spriteGroupOwners.delete(sprite);
        _disposeSprite(sprite);
      } else {
        _spriteGroupOwners.set(sprite, owners - 1);
      }
    });
  }
  function _disposeUnmanagedGroupItem(sprite) {
    if (!_trackableGroupItem(sprite) || (_spriteGroupOwners.get(sprite) || 0) > 0) return;
    _disposeSprite(sprite);
  }
  /** Marca uma mudança de pertencimento/ordem para varreduras com snapshot. */
  function _touchGroup(group) {
    if (!group) return;
    group._revision = _finiteNumber(group._revision, 0) + 1;
  }
  /** Grupos gerenciados já são marcados pelo Proxy de items. */
  function _touchUnmanagedGroup(group) {
    if (!_managedGroups.has(group)) _touchGroup(group);
  }
  /** Atualiza ownership e libera somente sprites que ficaram sem nenhum grupo dono. */
  function _disposeRemovedGroupItems(previousItems, nextItems) {
    _syncGroupOwnership(previousItems, nextItems);
  }
  // Fonte única dos métodos que realmente mudam um array de grupo. O espelho
  // de todos os inimigos usa a mesma guarda para recusar essas operações.
  // Protótipo nulo é obrigatório: toString/valueOf também existem em Array,
  // mas são LEITURAS e nunca podem invalidar a revisão do grupo.
  var GROUP_MUTATING_METHODS = Object.create(null);
  GROUP_MUTATING_METHODS.copyWithin = 1;
  GROUP_MUTATING_METHODS.fill = 1;
  GROUP_MUTATING_METHODS.pop = 1;
  GROUP_MUTATING_METHODS.push = 1;
  GROUP_MUTATING_METHODS.reverse = 1;
  GROUP_MUTATING_METHODS.shift = 1;
  GROUP_MUTATING_METHODS.sort = 1;
  GROUP_MUTATING_METHODS.splice = 1;
  GROUP_MUTATING_METHODS.unshift = 1;
  /**
   * O array do grupo faz parte da API pública no modo Código. Rastreá-lo aqui
   * mantém as varreduras corretas tanto pelos blocos quanto por push/splice,
   * atribuição por índice ou substituição direta de items feita pela criança.
   */
  function _trackGroupItems(group, initialItems) {
    var methodWrappers = Object.create(null);
    var proxy = null;
    proxy = new Proxy(initialItems, {
      get: function (target, property, receiver) {
        var arrayMethod = typeof property === 'string' ? Array.prototype[property] : null;
        if (!GROUP_MUTATING_METHODS[property] || typeof arrayMethod !== 'function' || target[property] !== arrayMethod) {
          return Reflect.get(target, property, receiver);
        }
        if (!methodWrappers[property]) {
          methodWrappers[property] = function () {
            var previousItems = target.slice();
            var result = arrayMethod.apply(target, arguments);
            if (target.length > MAX_GROUP) target.length = MAX_GROUP;
            _disposeRemovedGroupItems(previousItems, target);
            _touchGroup(group);
            if (property === 'push' || property === 'unshift') return target.length;
            return result === target ? proxy : result;
          };
        }
        return methodWrappers[property];
      },
      set: function (target, property, value) {
        var arrayIndex = typeof property === 'string' && property
          ? Number(property)
          : -1;
        if (Number.isInteger(arrayIndex) && arrayIndex >= MAX_GROUP && String(arrayIndex) === property) return true;
        if (property === 'length' && value > MAX_GROUP) value = MAX_GROUP;
        var previousItems = target.slice();
        var hadProperty = Object.prototype.hasOwnProperty.call(target, property);
        var previous = target[property];
        target[property] = value;
        if (!hadProperty || previous !== value) {
          _disposeRemovedGroupItems(previousItems, target);
          _touchGroup(group);
        }
        return true;
      },
      deleteProperty: function (target, property) {
        if (!Object.prototype.hasOwnProperty.call(target, property)) return true;
        var previousItems = target.slice();
        delete target[property];
        _disposeRemovedGroupItems(previousItems, target);
        _touchGroup(group);
        return true;
      },
      defineProperty: function (target, property, descriptor) {
        var arrayIndex = typeof property === 'string' && property
          ? Number(property)
          : -1;
        if (Number.isInteger(arrayIndex) && arrayIndex >= MAX_GROUP && String(arrayIndex) === property) return true;
        if (property === 'length' && descriptor && descriptor.value > MAX_GROUP) {
          descriptor = Object.assign({}, descriptor, { value: MAX_GROUP });
        }
        var previousItems = target.slice();
        var hadProperty = Object.prototype.hasOwnProperty.call(target, property);
        var previous = target[property];
        Object.defineProperty(target, property, descriptor);
        if (!hadProperty || previous !== target[property]) {
          _disposeRemovedGroupItems(previousItems, target);
          _touchGroup(group);
        }
        return true;
      }
    });
    return proxy;
  }
  /** Cria um grupo vazio com pertencimento observável inclusive no modo Código. */
  function createGroup() {
    var group = { _revision: 0 };
    _managedGroups.add(group);
    var items = _trackGroupItems(group, []);
    Object.defineProperty(group, 'items', {
      enumerable: true,
      get: function () { return items; },
      set: function (nextItems) {
        if (nextItems === items) return;
        var previousItems = items.slice();
        var replacement = Array.isArray(nextItems) ? nextItems.slice(0, MAX_GROUP) : [];
        items = _trackGroupItems(group, replacement);
        _disposeRemovedGroupItems(previousItems, replacement);
        _touchGroup(group);
      }
    });
    return group;
  }
  /** Snapshot estável: itens novos ficam para a próxima passada e removidos não rodam. */
  function _beginGroupTraversal(group) {
    return {
      items: group.items.slice(),
      revision: _finiteNumber(group._revision, 0),
      members: new Set(group.items)
    };
  }
  function _refreshGroupTraversal(group, traversal) {
    var revision = _finiteNumber(group._revision, 0);
    if (revision === traversal.revision) return;
    traversal.revision = revision;
    traversal.members = new Set(group.items);
  }
  /** Remove pertencimento e libera o trabalho assíncrono do sprite uma única vez. */
  function _removeGroupItemAt(group, index) {
    if (!group || !group.items || index < 0 || index >= group.items.length) return null;
    var sprite = group.items[index];
    group.items.splice(index, 1);
    if (!_managedGroups.has(group)) {
      _disposeUnmanagedGroupItem(sprite);
      _touchGroup(group);
    }
    return sprite;
  }
  function _clearGroupItems(group) {
    if (!group || !group.items || !group.items.length) return;
    if (_managedGroups.has(group)) {
      group.items.length = 0;
      return;
    }
    for (var i = 0; i < group.items.length; i++) _disposeUnmanagedGroupItem(group.items[i]);
    group.items.length = 0;
    _touchGroup(group);
  }
  /**
   * Cria um sprite (colorido OU com imagem, conforme opts) e o coloca no grupo.
   * Devolve o sprite. Acima do teto, descarta silenciosamente (nunca lança).
   */
  function spawn(group, options) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    var s = createSprite(options);
    group.items.push(s);
    _touchUnmanagedGroup(group);
    return s;
  }
  // Cria um TIRO (bolinha brilhante) no grupo. x/y = CENTRO; raio em px.
  function spawnBullet(group, options) {
    if (!group || !group.items) return null;
    if (group.items.length >= MAX_GROUP) return null;
    options = options || {};
    var r = _positiveFiniteNumber(options.radius, 5);
    var s = createSprite({
      x: _finiteNumber(options.x, 0) - r,
      y: _finiteNumber(options.y, 0) - r,
      w: r * 2,
      h: r * 2,
      color: options.color,
      vx: options.vx,
      vy: options.vy
    });
    s.skin = { kind: 'bullet', color: options.color || '#9cff57' };
    group.items.push(s);
    _touchUnmanagedGroup(group);
    return s;
  }
  /** Desenha o tiro: bolinha com brilho (glow). */
  function drawBullet(ctx, sprite) {
    var r = (sprite.w || 10) / 2;
    var cx = sprite.x + sprite.w / 2;
    var cy = sprite.y + sprite.h / 2;
    var col = (sprite.skin && sprite.skin.color) || sprite.color || '#9cff57';
    ctx.save();
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // Move o sprite SÓ na horizontal com as setas ← → (não sai sozinho da tela:
  // combine com "prender o sprite na tela").
  function arrowsX(sprite, speed) {
    if (!sprite) return;
    var sp = _finiteNumber(speed, 5);
    // Grava a velocidade horizontal p/ os getters (parado → 0); só mexe no eixo X.
    sprite.vx = (keys.right ? sp : 0) - (keys.left ? sp : 0);
    if (keys.left) sprite.x -= sp;
    if (keys.right) sprite.x += sp;
  }
  // Faz o sprite PISCAR por N quadros (ex.: invencibilidade ao levar dano).
  function blink(sprite, frames) {
    if (!sprite) return;
    sprite.blinkFrames = Math.floor(_positiveFiniteNumber(frames, 60));
  }
  /** Move cada sprite do grupo somente pela velocidade atual. */
  function updateGroup(group) {
    if (!group || !group.items) return;
    if (_isEnemyMirror(group)) {
      _warnEnemyMirror(
        'atualizar o grupo',
        'O bloco "Atualizar os inimigos do tipo ..." ja move cada inimigo pelo comportamento dele; aqui eles andariam DUAS vezes por quadro.'
      );
      return;
    }
    for (var i = 0; i < group.items.length; i++) {
      applyVelocity(group.items[i]);
    }
  }

  /** Soma a gravidade do mundo ao vy de cada sprite atual do grupo. */
  function applyGravityToGroup(group) {
    if (!group || !group.items) return;
    if (_isEnemyMirror(group)) {
      _warnEnemyMirror(
        'aplicar a gravidade ao grupo',
        'Aplique a gravidade ao GRUPO DO TIPO, antes de atualiza-lo. Aqui a queda entraria duas vezes no mesmo quadro.'
      );
      return;
    }
    for (var i = 0; i < group.items.length; i++) {
      var s = group.items[i];
      if (!s) continue;
      applyGravity(s);
    }
  }
  /** Desenha todos os sprites do grupo. */
  function drawGroup(ctx, group) {
    if (!ctx || !group || !group.items) return;
    // O tipo de inimigo É um grupo, e o seletor de "Desenhar o grupo" o lista.
    // Marcar AQUI (e não só no drawEnemyType) é o que impede o aviso de "ninguém
    // os desenha" de acusar quem desenhou pelo caminho de grupo, que é o certo
    // num jogo visto de cima.
    group._drawn = true;
    // Desenhar a VISTA de todos os inimigos conta como desenhar cada tipo.
    if (_isEnemyMirror(group)) _marcarTiposDesenhados();
    for (var i = 0; i < group.items.length; i++) drawSprite(ctx, group.items[i]);
    _drawEnemyBeamsIfAny(ctx, group);
  }
  /**
   * Desenha o grupo ordenado pela BASE (y+h): quem está mais para baixo na tela
   * é desenhado por último (fica na frente). É a profundidade dos jogos top-down.
   * Ordena uma CÓPIA — a ordem lógica do grupo (trazer para frente/fundo) fica intacta.
   */
  function drawGroupByY(ctx, group) {
    if (!ctx || !group || !group.items) return;
    group._drawn = true;
    if (_isEnemyMirror(group)) _marcarTiposDesenhados();
    var snapshot = group.items.slice();
    snapshot.sort(function (a, b) {
      var aBase = (a ? _finiteNumber(a.y, 0) + _finiteNumber(a.h, 0) : 0);
      var bBase = (b ? _finiteNumber(b.y, 0) + _finiteNumber(b.h, 0) : 0);
      return aBase - bBase;
    });
    for (var i = 0; i < snapshot.length; i++) drawSprite(ctx, snapshot[i]);
    _drawEnemyBeamsIfAny(ctx, group);
  }
  /**
   * Roda fn(sprite, i) para cada sprite. Itera em ordem REVERSA para que o
   * corpo possa remover o item atual (com "tirar do grupo") sem pular nenhum.
   */
  function forEachInGroup(group, fn) {
    if (!group || !group.items || typeof fn !== 'function') return;
    var generation = _driverGeneration;
    var traversal = _beginGroupTraversal(group);
    for (var i = traversal.items.length - 1; i >= 0; i--) {
      _refreshGroupTraversal(group, traversal);
      var sprite = traversal.items[i];
      if (!sprite || !traversal.members.has(sprite)) continue;
      _invokeProjectCallback(fn, undefined, [sprite, i]);
      if (_runGenerationChanged(generation)) return;
    }
  }
  /** Quantos sprites o grupo tem agora. */
  function countGroup(group) { return (group && group.items) ? group.items.length : 0; }
  /** Esvazia o grupo (tira todos os sprites). */
  function clearGroup(group) {
    // A vista de TODOS os inimigos nao tem lista propria: esvaziar ela e esvaziar
    // cada tipo (que e o "limpar a fase" que a crianca quer dizer).
    if (_isEnemyMirror(group)) { _clearAllEnemyTypes(); return; }
    _clearGroupItems(group);
    // Um TIPO de inimigo tem munição própria. Esvaziar a fase e deixar os tiros
    // no ar faria a nave renascer e levar dano sem inimigo nenhum na tela.
    if (group && group.bullets) _clearGroupItems(group.bullets);
    // Esvaziar o grupo esvazia também quem estava A CAMINHO de voltar (o
    // comportamento "renascer"). Sem isto, a criança limpa a fase 1, monta a
    // fase 2 e três segundos depois os mortos da fase anterior nascem nas
    // coordenadas velhas, possivelmente dentro de uma parede.
    if (group && group._revives) group._revives.length = 0;
  }
  /**
   * Põe um sprite que JÁ EXISTE dentro do grupo (o espelho do removeFromGroup).
   * Repetido não entra duas vezes; acima do teto, descarta em silêncio (mesma
   * régua do spawn — nunca lança no meio do jogo da criança).
   */
  function addToGroup(group, sprite) {
    if (!group || !group.items || !sprite || typeof sprite !== 'object') return;
    if (_isEnemyMirror(group)) {
      _warnEnemyMirror(
        'por um sprite no grupo',
        'Este grupo mostra os inimigos dos tipos, entao nao da para acrescentar alguem nele: em qual tipo ele entraria? Use "Por o sprite ... no grupo" escolhendo um TIPO de inimigo, que e quem da comportamento a ele.'
      );
      return;
    }
    if (group.items.indexOf(sprite) !== -1) return;
    if (group.items.length >= MAX_GROUP) return;
    group.items.push(sprite);
    _touchUnmanagedGroup(group);
  }
  /** Tira um sprite específico do grupo (por referência). */
  function removeFromGroup(group, sprite) {
    if (!group || !group.items) return;
    // Na vista, tirar significa tirar do TIPO que contem o sprite.
    if (_isEnemyMirror(group)) { _removeEnemyFromItsType(sprite); return; }
    var idx = group.items.indexOf(sprite);
    if (idx !== -1) _removeGroupItemAt(group, idx);
  }
  /**
   * Remove do grupo os sprites que saíram da tela (com uma margem) E estão indo
   * embora. Para cada um que sai, chama onLeave(sprite) — é assim que "asteroide
   * escapou = perde vida". Roda dentro do "a cada quadro" do aluno; sem RAF próprio.
   */
  function pruneOffscreen(ctx, group, margin, onLeave) {
    if (!ctx || !ctx.canvas || !group || !group.items) return;
    // Na vista, podar e podar cada tipo (o corpo da crianca roda por sprite).
    if (_isEnemyMirror(group)) { _pruneAllEnemyTypes(ctx, margin, onLeave); return; }
    var generation = _driverGeneration;
    var m = _finiteNumber(margin, 40);
    var visible = _visibleWorldRect(ctx);
    for (var i = group.items.length - 1; i >= 0; i--) {
      var s = group.items[i];
      if (!s) { _removeGroupItemAt(group, i); continue; }
      // "Saiu" ≠ "ainda não entrou": numa foto só as duas são IDÊNTICAS (o sprite
      // está fora da tela nas duas). O que as separa é para ONDE ele vai — então
      // só descartamos quem está fora E se afastando. Sem isso, obstáculo criado
      // fora da tela era apagado antes de entrar: com margem 40 num palco de 480 o
      // limite fica em 520, e o cacto do dino nasce em x 560 (nenhum sobrevivia).
      // Velocidade ausente conta como PARADO e segue sendo descartada — é o caso
      // do sprite que a câmera deixou para trás.
      var vx = _finiteNumber(s.vx, 0), vy = _finiteNumber(s.vy, 0);
      if (
        (s.x + s.w < visible.left - m && vx <= 0) ||
        (s.x > visible.right + m && vx >= 0) ||
        (s.y + s.h < visible.top - m && vy <= 0) ||
        (s.y > visible.bottom + m && vy >= 0)
      ) {
        _removeGroupItemAt(group, i);
        if (typeof onLeave === 'function') {
          _invokeProjectCallback(onLeave, undefined, [s]);
          if (_runGenerationChanged(generation)) return;
        }
      }
    }
  }
  /**
   * Para cada par (sprite do grupo A, sprite do grupo B) que se encosta, chama
   * fn(a, b). Varredura por quadro (NÃO registra handler como onOverlap — sem
   * teto de 32 e sem edge-trigger): use dentro do "a cada quadro". Itera em
   * ordem reversa p/ tolerar remoção dos sprites no corpo (tiro some, inimigo
   * explode). Grupos grandes usam uma fase ampla por eixo X antes do teste AABB.
   */
  function _overlapBroadPhase(firstItems, secondItems, sameGroup) {
    if (firstItems.length * secondItems.length < 2048) return null;
    var sortedSecond = [];
    for (var j = 0; j < secondItems.length; j++) {
      var second = secondItems[j];
      if (!second) continue;
      var secondBounds = _hitboxOf(second);
      var sx = secondBounds.x, sy = secondBounds.y, sw = secondBounds.w, sh = secondBounds.h;
      if (![sx, sy, sw, sh].every(Number.isFinite)) return null;
      sortedSecond.push({ index: j, left: sx, right: sx + sw, top: sy, bottom: sy + sh });
    }
    sortedSecond.sort(function (left, right) {
      return left.left - right.left || left.index - right.index;
    });
    var candidates = new Array(firstItems.length);
    for (var i = 0; i < firstItems.length; i++) {
      var first = firstItems[i];
      if (!first) { candidates[i] = []; continue; }
      var firstBounds = _hitboxOf(first);
      var ax = firstBounds.x, ay = firstBounds.y, aw = firstBounds.w, ah = firstBounds.h;
      if (![ax, ay, aw, ah].every(Number.isFinite)) return null;
      var rightEdge = ax + aw;
      var lo = 0, hi = sortedSecond.length;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (sortedSecond[mid].left < rightEdge) lo = mid + 1;
        else hi = mid;
      }
      var js = [];
      for (var k = 0; k < lo; k++) {
        var bound = sortedSecond[k];
        if (sameGroup && bound.index >= i) continue;
        if (bound.right > ax && ay < bound.bottom && ay + ah > bound.top) js.push(bound.index);
      }
      js.sort(function (left, right) { return right - left; });
      candidates[i] = js;
    }
    return candidates;
  }
  function overlapGroups(a, b, fn) {
    if (!a || !a.items || !b || !b.items || typeof fn !== 'function') return;
    var generation = _driverGeneration;
    var sameGroup = a === b;
    var firstItems = a.items.slice();
    var secondItems = sameGroup ? firstItems : b.items.slice();
    var firstMembers = new Set(firstItems);
    var secondMembers = sameGroup ? firstMembers : new Set(secondItems);
    var firstRevision = a._revision, secondRevision = b._revision;
    var firstLength = a.items.length, secondLength = b.items.length;
    var broadCandidates = _overlapBroadPhase(firstItems, secondItems, sameGroup);
    function refreshMembership() {
      if (a._revision !== firstRevision || a.items.length !== firstLength) {
        firstMembers = new Set(a.items);
        firstRevision = a._revision;
        firstLength = a.items.length;
        if (sameGroup) secondMembers = firstMembers;
      }
      if (!sameGroup && (b._revision !== secondRevision || b.items.length !== secondLength)) {
        secondMembers = new Set(b.items);
        secondRevision = b._revision;
        secondLength = b.items.length;
      }
    }
    for (var i = firstItems.length - 1; i >= 0; i--) {
      var ai = firstItems[i];
      refreshMembership();
      if (!ai || !firstMembers.has(ai)) continue;
      var lastJ = sameGroup ? i - 1 : secondItems.length - 1;
      var candidateJs = broadCandidates ? broadCandidates[i] : null;
      var cursor = candidateJs ? 0 : lastJ;
      while (candidateJs ? cursor < candidateJs.length : cursor >= 0) {
        var j = candidateJs ? candidateJs[cursor++] : cursor--;
        var bj = secondItems[j];
        if (!bj || ai === bj || !secondMembers.has(bj)) continue;
        if (isColliding(ai, bj)) {
          _invokeProjectCallback(fn, undefined, [ai, bj]);
          if (_runGenerationChanged(generation)) return;
          refreshMembership();
          // Se o corpo REMOVEU ai (ex.: "remova o tiro"), ele não deve acertar mais
          // ninguém neste quadro — senão um tiro só derrubaria TODOS os inimigos
          // encostados. Se NÃO removeu, o laço segue (o tiro "perfura" de propósito).
          if (!firstMembers.has(ai)) break;
        }
      }
    }
  }

`
