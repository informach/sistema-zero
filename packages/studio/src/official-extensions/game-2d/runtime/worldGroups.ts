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
  /**
   * O array do grupo faz parte da API pública no modo Código. Rastreá-lo aqui
   * mantém as varreduras corretas tanto pelos blocos quanto por push/splice,
   * atribuição por índice ou substituição direta de items feita pela criança.
   */
  function _trackGroupItems(group, initialItems) {
    var mutatingMethods = {
      copyWithin: true,
      fill: true,
      pop: true,
      push: true,
      reverse: true,
      shift: true,
      sort: true,
      splice: true,
      unshift: true
    };
    var methodWrappers = Object.create(null);
    var proxy = null;
    proxy = new Proxy(initialItems, {
      get: function (target, property, receiver) {
        var arrayMethod = typeof property === 'string' ? Array.prototype[property] : null;
        if (!mutatingMethods[property] || typeof arrayMethod !== 'function' || target[property] !== arrayMethod) {
          return Reflect.get(target, property, receiver);
        }
        if (!methodWrappers[property]) {
          methodWrappers[property] = function () {
            var previousItems = target.slice();
            var result = arrayMethod.apply(target, arguments);
            _disposeRemovedGroupItems(previousItems, target);
            _touchGroup(group);
            return result === target ? proxy : result;
          };
        }
        return methodWrappers[property];
      },
      set: function (target, property, value) {
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
        var replacement = Array.isArray(nextItems) ? nextItems.slice() : [];
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
  /** Move cada sprite do grupo pela sua velocidade (e gravidade do mundo). */
  function updateGroup(group) {
    if (!group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) applyVelocity(group.items[i]);
  }
  /**
   * Move cada sprite do grupo pela sua velocidade, SEM somar gravidade — para
   * TIROS do jogador num jogo com gravidade (senão eles arqueiam para baixo).
   */
  function updateGroupNoGravity(group) {
    if (!group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) {
      var s = group.items[i];
      if (!s) continue;
      s.x = _finiteNumber(s.x, 0) + _finiteNumber(s.vx, 0);
      s.y = _finiteNumber(s.y, 0) + _finiteNumber(s.vy, 0);
    }
  }
  /** Desenha todos os sprites do grupo. */
  function drawGroup(ctx, group) {
    if (!ctx || !group || !group.items) return;
    for (var i = 0; i < group.items.length; i++) drawSprite(ctx, group.items[i]);
  }
  /**
   * Desenha o grupo ordenado pela BASE (y+h): quem está mais para baixo na tela
   * é desenhado por último (fica na frente). É a profundidade dos jogos top-down.
   * Ordena uma CÓPIA — a ordem lógica do grupo (trazer para frente/fundo) fica intacta.
   */
  function drawGroupByY(ctx, group) {
    if (!ctx || !group || !group.items) return;
    var snapshot = group.items.slice();
    snapshot.sort(function (a, b) {
      var aBase = (a ? _finiteNumber(a.y, 0) + _finiteNumber(a.h, 0) : 0);
      var bBase = (b ? _finiteNumber(b.y, 0) + _finiteNumber(b.h, 0) : 0);
      return aBase - bBase;
    });
    for (var i = 0; i < snapshot.length; i++) drawSprite(ctx, snapshot[i]);
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
    _clearGroupItems(group);
  }
  /** Tira um sprite específico do grupo (por referência). */
  function removeFromGroup(group, sprite) {
    if (!group || !group.items) return;
    var idx = group.items.indexOf(sprite);
    if (idx !== -1) _removeGroupItemAt(group, idx);
  }
  /**
   * Remove do grupo os sprites que saíram da tela (com uma margem). Para cada
   * um que sai, chama onLeave(sprite) — é assim que "asteroide escapou = perde
   * vida". Roda dentro do "a cada quadro" do aluno; sem RAF próprio.
   */
  function pruneOffscreen(ctx, group, margin, onLeave) {
    if (!ctx || !ctx.canvas || !group || !group.items) return;
    var generation = _driverGeneration;
    var m = _finiteNumber(margin, 40);
    var visible = _visibleWorldRect(ctx);
    for (var i = group.items.length - 1; i >= 0; i--) {
      var s = group.items[i];
      if (!s) { _removeGroupItemAt(group, i); continue; }
      if (s.x + s.w < visible.left - m || s.x > visible.right + m || s.y + s.h < visible.top - m || s.y > visible.bottom + m) {
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
      var sx = second.x, sy = second.y, sw = second.w, sh = second.h;
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
      var ax = first.x, ay = first.y, aw = first.w, ah = first.h;
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
        if (!bj || !secondMembers.has(bj)) continue;
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
