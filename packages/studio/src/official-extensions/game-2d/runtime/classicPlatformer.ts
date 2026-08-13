/**
 * Primitivas genéricas para jogos de plataforma clássicos. O código continua
 * sendo injetado no mesmo IIFE do runtime e não depende de imagens ou fontes.
 */
export const gameTwoDClassicPlatformerRuntime = `  // ---- Plataforma clássica e arte vetorial (v0.74.0) ----
  var CLASSIC_ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'action', 'select', 'start', 'pause'];
  var CLASSIC_KEY_ACTION = {
    ArrowLeft: 'left', a: 'left',
    ArrowRight: 'right', d: 'right',
    ArrowUp: 'up', w: 'up',
    ArrowDown: 'down', s: 'down',
    z: 'jump', Space: 'jump',
    x: 'action', ShiftLeft: 'action', ShiftRight: 'action',
    Backspace: 'select', Enter: 'start', Escape: 'pause', p: 'pause'
  };
  var _classicKeyHeld = Object.create(null);
  var _classicKeyboardCount = Object.create(null);
  var _classicTouchPointers = Object.create(null);
  var _classicPressedStamp = Object.create(null);
  var _classicVirtualHeldStamp = Object.create(null);
  var _classicActionHandlers = Object.create(null);
  var _classicActionOrder = [];
  var _classicControlsRoot = null;

  function _knownClassicAction(action) {
    return CLASSIC_ACTIONS.indexOf(String(action || '')) >= 0;
  }
  function _classicActionForEvent(e) {
    var key = _eventGameKey(e);
    return Object.prototype.hasOwnProperty.call(CLASSIC_KEY_ACTION, key)
      ? CLASSIC_KEY_ACTION[key]
      : '';
  }
  function _markClassicPressed(action) {
    if (!_knownClassicAction(action)) return;
    var stamp = _frameStamp + 1;
    _classicPressedStamp[action] = stamp;
    var generation = _driverGeneration;
    var handlers = _classicActionOrder.slice();
    for (var i = 0; i < handlers.length; i++) {
      var id = handlers[i];
      var handler = _classicActionHandlers[id];
      if (!handler || handler.action !== action) continue;
      try { _invokeProjectCallback(handler.fn, handler, []); }
      catch (error) {
        _reportHandlerError('“Quando a ação for apertada”', id, error);
        _removeOrderedIfCurrent(_classicActionHandlers, _classicActionOrder, id, handler);
      }
      if (_runGenerationChanged(generation)) return;
    }
  }
  /** Evento semântico comum a teclado, toque, botão focado e leitor de tela. */
  function onActionPressed(action, fn, id) {
    var name = String(action || '');
    if (!_knownClassicAction(name) || typeof fn !== 'function') return;
    if (_runningLoopId && !id) {
      warnOnce('evento-acao-no-quadro', '“Quando a ação for apertada” deve ficar no início, fora de “A cada quadro”.');
      return;
    }
    var handlerId = _stableHandlerId('acao', id, fn);
    if (!_classicActionHandlers[handlerId]) _classicActionOrder.push(handlerId);
    _classicActionHandlers[handlerId] = { action: name, fn: fn };
  }
  window.addEventListener('keydown', function (e) {
    var action = _classicActionForEvent(e);
    if (!action) return;
    var key = _eventGameKey(e);
    if (!_classicKeyHeld[key]) {
      _classicKeyHeld[key] = action;
      _classicKeyboardCount[action] = (_classicKeyboardCount[action] || 0) + 1;
      if (!e || !e.repeat) _markClassicPressed(action);
    }
  });
  window.addEventListener('keyup', function (e) {
    var key = _eventGameKey(e);
    var action = _classicKeyHeld[key] || _classicActionForEvent(e);
    if (!action || !_classicKeyHeld[key]) return;
    delete _classicKeyHeld[key];
    _classicKeyboardCount[action] = Math.max(0, (_classicKeyboardCount[action] || 0) - 1);
  });
  function _releaseClassicKeyboard() {
    _classicKeyHeld = Object.create(null);
    _classicKeyboardCount = Object.create(null);
  }
  window.addEventListener('blur', _releaseClassicKeyboard);
  // ⚠️ O teclado do núcleo (worldEvents) solta as teclas no blur E ao esconder a aba;
  // este aqui só tinha o blur. Uma aba escondida SEM perder o foco (trocar de aba com
  // atalho, apagar a tela do celular) deixava a ação presa para sempre, e o herói
  // voltava andando sozinho. São duas máquinas de estado paralelas: enquanto elas
  // existirem, o que uma solta a outra também precisa soltar.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) _releaseClassicKeyboard();
  });

  /** Verdadeiro enquanto qualquer teclado/dedo mantém a ação pressionada. */
  function actionDown(action) {
    var name = String(action || '');
    if (!_knownClassicAction(name)) return false;
    var touches = _classicTouchPointers[name];
    return (_classicKeyboardCount[name] || 0) > 0 ||
      !!(touches && touches.size) ||
      (_classicVirtualHeldStamp[name] || 0) > 0 &&
      _classicVirtualHeldStamp[name] >= _frameStamp;
  }
  /** Borda do aperto, compartilhada por todos os leitores do mesmo quadro. */
  function actionPressed(action) {
    var stamp = _classicPressedStamp[String(action || '')];
    return stamp === _frameStamp || stamp === _frameStamp + 1;
  }

  var CLASSIC_TOUCH_LABELS = {
    left: 'Mover para a esquerda', right: 'Mover para a direita',
    up: 'Mover para cima', down: 'Agachar', jump: 'Pular', action: 'Correr ou agir',
    select: 'Selecionar', start: 'Começar', pause: 'Pausar'
  };
  var CLASSIC_TOUCH_POSITIONS = {
    left: 'grid-column:1;grid-row:2;', up: 'grid-column:2;grid-row:1;',
    down: 'grid-column:2;grid-row:2;', right: 'grid-column:3;grid-row:2;',
    select: 'grid-column:1;grid-row:1;', start: 'grid-column:2;grid-row:1;',
    pause: 'grid-column:3;grid-row:1;', action: 'grid-column:2;grid-row:2;',
    jump: 'grid-column:3;grid-row:2;'
  };
  function _removeClassicControls() {
    if (_classicControlsRoot && _classicControlsRoot.parentNode) {
      _classicControlsRoot.parentNode.removeChild(_classicControlsRoot);
    }
    _classicControlsRoot = null;
    _classicTouchPointers = Object.create(null);
    _classicVirtualHeldStamp = Object.create(null);
  }
  function _classicTouchButton(action, text) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', CLASSIC_TOUCH_LABELS[action] || action);
    button.setAttribute('data-sz-g2d-action', action);
    button.style.cssText = 'width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border:2px solid rgba(255,255,255,.8);border-radius:12px;background:rgba(8,15,35,.72);color:white;font:700 18px sans-serif;touch-action:none;user-select:none;' + (CLASSIC_TOUCH_POSITIONS[action] || '');
    var ignoreNextKeyboardClick = false;
    function press(e) {
      var id = e && e.pointerId !== undefined ? e.pointerId : '__pointer__';
      var pointers = _classicTouchPointers[action];
      if (!pointers) pointers = _classicTouchPointers[action] = new Set();
      if (!pointers.has(id)) {
        pointers.add(id);
        _markClassicPressed(action);
      }
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (e && e.pointerId !== undefined && typeof button.setPointerCapture === 'function') {
        try { button.setPointerCapture(e.pointerId); } catch (ignored) {}
      }
    }
    function release(e) {
      var id = e && e.pointerId !== undefined ? e.pointerId : '__pointer__';
      var pointers = _classicTouchPointers[action];
      if (pointers) pointers.delete(id);
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
    }
    function keyboardPress(e) {
      if (!e || (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar')) return;
      if (e.repeat) return;
      ignoreNextKeyboardClick = true;
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      press({
        pointerId: '__keyboard__',
        preventDefault: function () {}
      });
    }
    function keyboardRelease(e) {
      if (!e || (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar')) return;
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      release({
        pointerId: '__keyboard__',
        preventDefault: function () {}
      });
      setTimeout(function () { ignoreNextKeyboardClick = false; }, 0);
    }
    function activate(e) {
      // Click com detail > 0 veio do ponteiro, cuja borda já foi tratada no
      // pointerdown. detail 0 cobre button.click(), teclado nativo e leitores.
      if (e && _finiteNumber(e.detail, 0) > 0) return;
      if (ignoreNextKeyboardClick) {
        ignoreNextKeyboardClick = false;
        return;
      }
      _classicVirtualHeldStamp[action] = _frameStamp + 1;
      _markClassicPressed(action);
    }
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', keyboardPress);
    button.addEventListener('keyup', keyboardRelease);
    button.addEventListener('click', activate);
    return button;
  }
  /** Liga controles de toque responsivos: auto, sempre ou desligado. */
  function enableClassicControls(mode) {
    var selected = mode === 'always' || mode === 'off' ? mode : 'auto';
    _removeClassicControls();
    if (selected === 'off' || typeof document === 'undefined') return;
    var coarse = false;
    try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (ignored) {}
    try { coarse = coarse || !!(window.navigator && window.navigator.maxTouchPoints > 0); } catch (ignored2) {}
    if (selected === 'auto' && !coarse) return;
    ensureStage();
    var root = document.createElement('div');
    root.setAttribute('data-sz-g2d-classic-controls', '');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Controles do jogo');
    root.style.cssText = 'position:fixed;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));display:flex;justify-content:space-between;align-items:end;gap:8px;z-index:2147483000;pointer-events:none;';
    var directions = document.createElement('div');
    var actions = document.createElement('div');
    directions.style.cssText = actions.style.cssText = 'display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:6px;pointer-events:auto;';
    directions.appendChild(_classicTouchButton('left', '◀'));
    directions.appendChild(_classicTouchButton('up', '▲'));
    directions.appendChild(_classicTouchButton('down', '▼'));
    directions.appendChild(_classicTouchButton('right', '▶'));
    actions.appendChild(_classicTouchButton('select', '−'));
    actions.appendChild(_classicTouchButton('start', '+'));
    actions.appendChild(_classicTouchButton('pause', 'Ⅱ'));
    actions.appendChild(_classicTouchButton('action', 'B'));
    actions.appendChild(_classicTouchButton('jump', 'A'));
    root.appendChild(directions);
    root.appendChild(actions);
    if (document.body) document.body.appendChild(root);
    _classicControlsRoot = root;
  }

  // ---- Afinação da plataforma clássica ----
  // Aceleração e atrito saem do TETO de velocidade, e não de números fixos: assim a
  // mesma sensação vale para quem escolhe velocidade 2 e para quem escolhe 8. Os
  // números fixos de antes (0.16 no chão, 0.34 derrapando) davam um herói DURO, que
  // chegava ao topo em 15 quadros; a inércia longa é a assinatura do gênero.
  var CLASSIC_FRAMES_TO_TOP = 42;
  var CLASSIC_RUN_RATIO = 1.64;
  var CLASSIC_SKID_FACTOR = 1.7;
  var CLASSIC_FRICTION_FACTOR = 1.4;
  // Soltar o botão de pulo faz a gravidade PESAR mais na subida. É o que separa o
  // pulinho do pulo inteiro sem inventar contador de quadros.
  var CLASSIC_RELEASED_FALL = 2.5;
  // Correr e pular vai mais alto: o impulso cresce com a velocidade horizontal.
  var CLASSIC_RUN_JUMP_BONUS = 0.12;

  /**
   * Movimento autocontido de plataforma: aceleração, corrida, derrapagem,
   * agachamento, gravidade e pulo de altura variável.
   */
  function classicPlatformer(sprite, speed, jump) {
    if (!sprite) return;
    _recordPreviousPosition(sprite);
    var maxWalk = _positiveFiniteNumber(speed, 2.5);
    var maxRun = maxWalk * CLASSIC_RUN_RATIO;
    var max = actionDown('action') ? maxRun : maxWalk;
    var gravity = _finiteNumber(world.gravity, 0.6);
    var wasGrounded = _beginGroundFrame(sprite);
    var direction = (actionDown('right') ? 1 : 0) - (actionDown('left') ? 1 : 0);
    var vx = _finiteNumber(sprite.vx, 0);
    // ⚠️ Correr acelera MAIS, além de ter teto maior. Derivar a aceleração só da
    // caminhada deixava os dois indistinguíveis no começo do trecho — medido: 40
    // quadros davam os MESMOS 45,9 px andando e correndo, porque nesse tempo o herói
    // sequer chegava ao teto de caminhada. Quem corre chega ao próprio teto no mesmo
    // tempo em que quem anda chega ao dele.
    var accel = max / CLASSIC_FRAMES_TO_TOP;
    // Derrapar e frear NÃO seguem o teto do momento: são a mesma travagem sempre,
    // senão soltar o botão de correr mudaria também a força do freio.
    var travagem = maxWalk / CLASSIC_FRAMES_TO_TOP;
    var acceleratingAgainstMotion = direction && vx && (vx < 0 ? -1 : 1) !== direction;
    var acceleration = acceleratingAgainstMotion ? travagem * CLASSIC_SKID_FACTOR : accel;
    if (direction) {
      vx += direction * acceleration;
      if (Math.abs(vx) > max) {
        // Passar do teto não trava no ato: a velocidade DESCE até ele. É o que faz
        // soltar o botão de correr devolver o passo de caminhada aos poucos, em vez
        // de o herói frear como se batesse numa parede invisível.
        var alvo = Math.max(max, Math.abs(vx) - travagem);
        vx = (vx < 0 ? -1 : 1) * alvo;
      }
      sprite.facing = direction;
      sprite.direction = direction < 0 ? 'left' : 'right';
    } else if (wasGrounded) {
      var friction = travagem * CLASSIC_FRICTION_FACTOR;
      if (Math.abs(vx) <= friction) vx = 0;
      else vx -= (vx < 0 ? -1 : 1) * friction;
    }
    // ⚠️ Sem direção E NO AR o impulso é CONSERVADO: nada de atrito aéreo. O 0.015
    // de antes comia o alcance do salto no meio do voo, e é exatamente o que impede
    // um pulo longo de existir.

    // ⚠️ A altura "em pé" é RELIDA sempre que o sprite não está agachado. Memorizá-la
    // só na primeira chamada fazia o primeiro agachar depois de um power-up de tamanho
    // devolver a altura ANTIGA: crescer para 80, agachar e levantar voltava para 44,
    // apagando o power-up em silêncio.
    if (!sprite._classicCrouching) sprite._classicStandingH = sprite.h;
    var standingH = _positiveFiniteNumber(sprite._classicStandingH, sprite.h);
    var crouching = actionDown('down') && wasGrounded;
    if (crouching && !sprite._classicCrouching) {
      var bottom = sprite.y + sprite.h;
      sprite.h = Math.max(8, Math.round(standingH * 0.65));
      sprite.y = bottom - sprite.h;
      sprite._classicCrouching = true;
    } else if (!crouching && sprite._classicCrouching) {
      var crouchedBottom = sprite.y + sprite.h;
      sprite.h = standingH;
      sprite.y = crouchedBottom - sprite.h;
      sprite._classicCrouching = false;
    }
    if (crouching) vx *= 0.8;

    var jumpHeld = actionDown('jump');
    var jumpStarts = actionPressed('jump') && wasGrounded && !crouching;
    if (jumpStarts) {
      // ⭐ O impulso CRESCE com a velocidade horizontal — correr e pular vai mais alto
      // e mais longe. É a assinatura do pulo do gênero, e o motor simplesmente não
      // tinha: o mesmo número saía parado ou em disparada.
      var embalo = maxRun > 0 ? Math.min(1, Math.abs(vx) / maxRun) : 0;
      var impulso = _positiveFiniteNumber(jump, 7) * (1 + CLASSIC_RUN_JUMP_BONUS * embalo);
      _jumpFromGround(sprite, gravity, impulso);
    }
    var vy = _finiteNumber(sprite.vy, 0);
    // Segurar o botão não empurra para cima: ele apenas ADIA a queda. Soltar cedo faz
    // a gravidade pesar mais NA SUBIDA, e é daí que sai o pulinho curto.
    // ⚠️ A versão anterior somava impulso por 10 quadros e depois cortava a subida
    // pela metade — dois números mágicos para um efeito que a gravidade sozinha
    // entrega, e que deixavam a altura presa a uma contagem em vez de ao botão.
    var subindo = _isJumpingForGravity(vy, gravity);
    vy += subindo && !jumpHeld ? gravity * CLASSIC_RELEASED_FALL : gravity;
    sprite.vx = vx;
    sprite.vy = vy;
    sprite.x = _finiteNumber(sprite.x, 0) + vx;
    sprite.y = _finiteNumber(sprite.y, 0) + vy;
    _commitRecordedMotion(sprite);
  }

  function createVectorTileset(tileSize) {
    return {
      _kind: 'g2d-vector-tileset',
      tileSize: _positiveFiniteNumber(tileSize, 16),
      tiles: Object.create(null)
    };
  }
  function defineVectorTile(tileset, index, shape, role) {
    if (!tileset || tileset._kind !== 'g2d-vector-tileset') return;
    var tileIndex = Math.max(0, Math.floor(_finiteNumber(index, 0)));
    var tileRole = role === 'solid' || role === 'platform' || role === 'contact' ? role : 'decor';
    tileset.tiles[tileIndex] = { shape: String(shape || ''), role: tileRole };
  }
  function createVectorTileMap(tileset, grid) {
    if (!tileset || tileset._kind !== 'g2d-vector-tileset') {
      warnOnce('tileset-vetorial-invalido', 'crie o conjunto de tiles vetoriais antes do mapa.');
      tileset = createVectorTileset(16);
    }
    var solid = [];
    var platform = [];
    var atravessaveis = [];
    for (var key in tileset.tiles) {
      if (!Object.prototype.hasOwnProperty.call(tileset.tiles, key)) continue;
      var tile = tileset.tiles[key];
      if (tile.role === 'solid') solid.push(key);
      else if (tile.role === 'platform') platform.push(key);
      else if (tile.role === 'contact') atravessaveis.push(Math.floor(Number(key)));
    }
    var map = createTileMap({
      image: '',
      tile: tileset.tileSize,
      solid: solid.join(' '),
      platform: platform.join(' '),
      grid: String(grid || '')
    });
    map.tileset = tileset;
    // Índice das peças que a criança ATRAVESSA e que mesmo assim precisam avisar.
    // O varredor por sobreposição (worldTiles) lê daqui.
    map._overlapIndex = atravessaveis.length ? new Set(atravessaveis) : null;
    return map;
  }
  function _drawVectorTile(ctx, tileset, index, x, y, width, height) {
    var tile = tileset && tileset.tiles ? tileset.tiles[index] : null;
    if (!tile) return;
    drawCustomShape(ctx, {
      x: x, y: y, w: width, h: height,
      color: '#000000', skin: { kind: 'custom', shape: tile.shape }
    });
  }

  function _beginTileContacts(sprite) {
    if (!sprite) return;
    if (_runningLoopId) {
      if (sprite._tileContactsFrame !== _frameStamp) sprite._tileContacts = [];
      sprite._tileContactsFrame = _frameStamp;
    } else {
      sprite._tileContacts = [];
      sprite._tileContactsFrame = _frameStamp;
    }
  }
  function _recordTileContact(sprite, map, row, col, side) {
    if (!sprite || !map || !map.rows || !map.rows[row]) return;
    var contacts = sprite._tileContacts || (sprite._tileContacts = []);
    for (var i = 0; i < contacts.length; i++) {
      var known = contacts[i];
      if (known.map === map && known.row === row && known.col === col && known.side === side) return;
    }
    var size = tileScreenSize(map);
    var ox = map.layout ? map.layout.x : map.ox;
    var oy = map.layout ? map.layout.y : map.oy;
    contacts.push({
      map: map,
      index: map.rows[row][col],
      row: row,
      col: col,
      x: ox + col * size,
      y: oy + row * size,
      side: side
    });
  }
  function forEachTileContact(sprite, map, side, visit) {
    if (!sprite || !map || typeof visit !== 'function') return;
    if (_runningLoopId && sprite._tileContactsFrame !== _frameStamp) return;
    var wanted = side === 'head' || side === 'feet' || side === 'left' || side === 'right' ? side : 'any';
    var contacts = sprite._tileContacts ? sprite._tileContacts.slice() : [];
    var generation = _driverGeneration;
    for (var i = 0; i < contacts.length; i++) {
      var contact = contacts[i];
      if (contact.map !== map || (wanted !== 'any' && contact.side !== wanted)) continue;
      _invokeProjectCallback(visit, undefined, [contact]);
      if (_runGenerationChanged(generation)) return;
    }
  }
  function tileContactIs(contact, index) {
    if (!contact || !contact.map) return false;
    return contact.index === Math.floor(_finiteNumber(index, -1));
  }
  function setTileAtContact(contact, index) {
    if (!contact || !contact.map || !contact.map.rows) return;
    var row = contact.map.rows[contact.row];
    if (!row || contact.col < 0 || contact.col >= row.length) return;
    row[contact.col] = _isFiniteNumber(index) ? Math.floor(index) : -1;
    contact.index = row[contact.col];
  }

  function setEnemyStompMode(type, mode) {
    if (!type || !type.items) return;
    type._stompMode = mode === 'damage' || mode === 'squash' || mode === 'shell' || mode === 'spiky'
      ? mode
      : 'defeat';
  }
  function updateEnemyShells(type, worldValue) {
    if (!type || !type.items) return;
    for (var i = 0; i < type.items.length; i++) {
      var shell = type.items[i];
      if (!shell || !shell._shell || !shell._shellMoving) continue;
      _recordPreviousPosition(shell);
      var shellSpeed = _finiteNumber(shell._shellSpeed, 5);
      shell.vx = shellSpeed;
      shell.x += shellSpeed;
      // ⭐ O casco CAI. Antes só o eixo X era integrado: chutado de uma beirada ele
      // seguia reto pelo ar para sempre e, por nunca encostar no chão do Mundo,
      // também escapava do recolhimento de quem sai do mundo.
      var shellGravity = _finiteNumber(world.gravity, 0.6);
      shell.vy = _finiteNumber(shell.vy, 0) + shellGravity;
      shell.y += shell.vy;
      _commitRecordedMotion(shell);
      if (worldValue && worldValue._kind === 'g2d-world') {
        // Longe demais do Mundo: marca para o "Atualizar" recolher, como qualquer
        // inimigo. Sem isto o casco perdido continuaria contando no grupo.
        if (shell.y > _finiteNumber(worldValue.height, 0) + 2000) {
          shell._foraDoMundo = true;
          continue;
        }
        collideWorld(shell, worldValue);
        if (shell.vx === 0) {
          shell._shellSpeed = -shellSpeed;
          shell.vx = shell._shellSpeed;
        }
      }
      // O tipo recebido é o DONO dos cascos, não o universo de alvos. Todos os
      // tipos registrados compartilham o mesmo mundo e podem ser atingidos.
      for (var typeIndex = 0; typeIndex < _enemyTypes.length; typeIndex++) {
        var targetType = _enemyTypes[typeIndex];
        if (!targetType || !targetType.items) continue;
        for (var j = 0; j < targetType.items.length; j++) {
          var other = targetType.items[j];
          if (!other || other === shell || other._shell || !isColliding(shell, other)) continue;
          other.dmg = 0;
          other.hp = 0;
        }
      }
    }
  }

  var PIXEL_GLYPHS = {
    ' ': ['000','000','000','000','000','000','000'],
    '-': ['000','000','000','111','000','000','000'],
    '.': ['000','000','000','000','000','110','110'],
    ',': ['000','000','000','000','110','110','100'],
    ':': ['000','110','110','000','110','110','000'],
    '!': ['1','1','1','1','1','0','1'],
    // ⚠️ A barra FALTAVA, e a tela de título escreve "BACKSPACE: 1/2": saía 1?2 na
    // cara da criança. O parêntese e o sinal entram junto porque são o resto do que
    // um texto de jogo pede.
    '/': ['001','001','010','010','010','100','100'],
    '(': ['01','10','10','10','10','10','01'],
    ')': ['10','01','01','01','01','01','10'],
    '+': ['000','000','010','111','010','000','000'],
    '?': ['111','001','001','011','010','000','010'],
    '0': ['111','101','101','101','101','101','111'],
    '1': ['010','110','010','010','010','010','111'],
    '2': ['111','001','001','111','100','100','111'],
    '3': ['111','001','001','111','001','001','111'],
    '4': ['101','101','101','111','001','001','001'],
    '5': ['111','100','100','111','001','001','111'],
    '6': ['111','100','100','111','101','101','111'],
    '7': ['111','001','001','010','010','010','010'],
    '8': ['111','101','101','111','101','101','111'],
    '9': ['111','101','101','111','001','001','111'],
    A: ['010','101','101','111','101','101','101'], B: ['110','101','101','110','101','101','110'],
    C: ['111','100','100','100','100','100','111'], D: ['110','101','101','101','101','101','110'],
    E: ['111','100','100','110','100','100','111'], F: ['111','100','100','110','100','100','100'],
    G: ['111','100','100','101','101','101','111'], H: ['101','101','101','111','101','101','101'],
    I: ['111','010','010','010','010','010','111'], J: ['001','001','001','001','101','101','111'],
    K: ['101','101','110','100','110','101','101'], L: ['100','100','100','100','100','100','111'],
    M: ['10001','11011','10101','10101','10001','10001','10001'], N: ['1001','1101','1011','1001','1001','1001','1001'],
    O: ['111','101','101','101','101','101','111'], P: ['110','101','101','110','100','100','100'],
    Q: ['111','101','101','101','101','111','001'], R: ['110','101','101','110','101','101','101'],
    S: ['111','100','100','111','001','001','111'], T: ['111','010','010','010','010','010','010'],
    U: ['101','101','101','101','101','101','111'], V: ['101','101','101','101','101','101','010'],
    W: ['10001','10001','10001','10101','10101','11011','10001'], X: ['101','101','101','010','101','101','101'],
    Y: ['101','101','101','010','010','010','010'], Z: ['111','001','001','010','100','100','111'],
    // A cedilha é uma linha ABAIXO da base (não sobe, desce) — cabe porque a
    // entrelinha é de 9 linhas e a letra usa 7.
    'Ç': ['111','100','100','100','100','111','010','011']
  };
  /**
   * Vogais acentuadas: a fonte é 5x7 e não caberia um alfabeto acentuado inteiro,
   * então o acento é UMA LINHA a mais colada acima da letra, e a letra desce uma
   * linha para o corpo continuar na mesma base das vizinhas.
   *
   * ⚠️ Sem isto, TODO texto em português com acento saía com "?" no lugar da vogal —
   * e é por isso que o exemplo escrevia "RECOMECA" sem a cedilha, contornando à mão
   * uma falta que era da fonte.
   */
  var PIXEL_RISE = 'ÁÂÃÀÉÊÍÓÔÕÚ';
  (function () {
    var acentuadas = [
      ['Á','A','001'], ['Â','A','010'], ['Ã','A','111'], ['À','A','100'],
      ['É','E','001'], ['Ê','E','010'], ['Í','I','001'],
      ['Ó','O','001'], ['Ô','O','010'], ['Õ','O','111'], ['Ú','U','001']
    ];
    for (var i = 0; i < acentuadas.length; i++) {
      var base = PIXEL_GLYPHS[acentuadas[i][1]];
      if (base) PIXEL_GLYPHS[acentuadas[i][0]] = [acentuadas[i][2]].concat(base);
    }
  })();
  function _pixelTextWidth(text, pixelSize) {
    var width = 0;
    var lineWidth = 0;
    var str = String(text || '').toUpperCase();
    for (var i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) === 10) { width = Math.max(width, lineWidth); lineWidth = 0; continue; }
      var glyph = PIXEL_GLYPHS[str.charAt(i)] || PIXEL_GLYPHS['?'];
      lineWidth += (glyph[0].length + 1) * pixelSize;
    }
    return Math.max(width, Math.max(0, lineWidth - pixelSize));
  }
  function drawPixelText(ctx, text, x, y, pixelSize, color, align) {
    if (!ctx) return;
    var size = Math.max(1, Math.floor(_positiveFiniteNumber(pixelSize, 2)));
    var startX = _finiteNumber(x, 0);
    var px = startX;
    var py = _finiteNumber(y, 0);
    var str = String(text === undefined || text === null ? '' : text).toUpperCase();
    if (align === 'center') px -= _pixelTextWidth(str.split(String.fromCharCode(10))[0], size) / 2;
    else if (align === 'right') px -= _pixelTextWidth(str.split(String.fromCharCode(10))[0], size);
    ctx.save();
    ctx.fillStyle = color || '#ffffff';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (str.charCodeAt(i) === 10) {
        py += size * 9;
        px = startX;
        var rest = str.slice(i + 1).split(String.fromCharCode(10))[0];
        if (align === 'center') px -= _pixelTextWidth(rest, size) / 2;
        else if (align === 'right') px -= _pixelTextWidth(rest, size);
        continue;
      }
      var glyph = PIXEL_GLYPHS[ch] || PIXEL_GLYPHS['?'];
      // Vogal acentuada sobe uma linha para o acento caber sem empurrar a base.
      var topo = PIXEL_RISE.indexOf(ch) >= 0 ? py - size : py;
      for (var row = 0; row < glyph.length; row++) {
        for (var col = 0; col < glyph[row].length; col++) {
          if (glyph[row].charAt(col) === '1') ctx.fillRect(px + col * size, topo + row * size, size, size);
        }
      }
      px += (glyph[0].length + 1) * size;
    }
    ctx.restore();
  }
  /**
   * Um campo do placar na fonte de PIXEL: o rótulo em cima e o valor embaixo, como
   * no jogo de referência.
   *
   * ⚠️ Existe porque o "Escrever texto pixel" só aceita texto LITERAL, e os números do
   * placar são variáveis. Sem ele o HUD tinha que usar a fonte proporcional, e o jogo
   * ficava com DUAS tipografias: pixel nas telas de título e fim, e outra no placar.
   */
  function drawPixelScore(ctx, label, value, x, y, pixelSize, color) {
    if (!ctx) return;
    var size = Math.max(1, Math.floor(_positiveFiniteNumber(pixelSize, 2)));
    var px = _finiteNumber(x, 0);
    var py = _finiteNumber(y, 0);
    drawPixelText(ctx, label, px, py, size, color, 'left');
    // 9 linhas é a mesma entrelinha que o drawPixelText usa na quebra de linha.
    drawPixelText(ctx, value, px, py + size * 9, size, color, 'left');
  }
  function drawFade(ctx, percent, color) {
    if (!ctx || !ctx.canvas) return;
    var alpha = Math.max(0, Math.min(_finiteNumber(percent, 0), 100)) / 100;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color || '#000000';
    ctx.fillRect(0, 0, stageW(ctx), stageH(ctx));
    ctx.restore();
  }

  _registerRuntimeDomain('classic-platformer', {
    reset: function () {
      _releaseClassicKeyboard();
      _classicPressedStamp = Object.create(null);
      _classicVirtualHeldStamp = Object.create(null);
      _classicActionHandlers = Object.create(null);
      _classicActionOrder = [];
      _removeClassicControls();
    }
  });

`
