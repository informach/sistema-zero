export const gameTwoDWorldSystemsRuntime = `  // ---- Mundos e fases: Mapa -> Mundo -> Fase ----
  // Mapa guarda tiles e layout. Mundo guarda limites, terreno e câmera. Fase é
  // apenas a progressão opcional: mundo + spawn + evento de entrada.
  var WORLD_EDGE_MODES = new Set(['none', 'floor', 'solid']);
  var CAMERA_HORIZONTAL_MODES = new Set(['off', 'free', 'right', 'left']);
  var CAMERA_VERTICAL_MODES = new Set(['off', 'free', 'down', 'up']);
  var _currentLevel = null;
  var _levelEnterHandlers = Object.create(null);
  var _levelEnterOrder = [];
  var _levelEntryGeneration = 0;

  function _worldDimension(value, fallback) {
    return Math.max(1, Math.floor(_positiveFiniteNumber(value, fallback)));
  }
  function _isGameWorld(value) {
    return !!value && value._kind === 'g2d-world';
  }
  function _isGameLevel(value) {
    return !!value && value._kind === 'g2d-level' && _isGameWorld(value.world);
  }
  function createWorld(width, height) {
    return {
      _kind: 'g2d-world',
      width: _worldDimension(width, 800),
      height: _worldDimension(height, 480),
      edges: 'none',
      tileMaps: [],
      terrain: [],
      camera: {
        x: 0,
        y: 0,
        horizontal: 'off',
        vertical: 'off',
        deadZoneX: 0,
        deadZoneY: 0
      }
    };
  }
  function _mapFitsWorld(worldValue, map) {
    if (!_isGameWorld(worldValue) || !map || !map.layout) return false;
    var layout = map.layout;
    return layout.x >= 0 && layout.y >= 0 &&
      layout.x + layout.width <= worldValue.width &&
      layout.y + layout.height <= worldValue.height;
  }
  function addTileMapToWorld(worldValue, map) {
    if (!_isGameWorld(worldValue)) {
      warnOnce('mundo-invalido-mapa', 'crie o Mundo antes de adicionar um mapa.');
      return;
    }
    if (!map || !map.layout) {
      warnOnce('mapa-sem-layout-no-mundo', 'posicione o mapa antes de adicioná-lo ao Mundo.');
      return;
    }
    if (!_mapFitsWorld(worldValue, map)) {
      warnOnce(
        'mapa-fora-do-mundo',
        'o mapa não cabe nos limites deste Mundo. Aumente o Mundo ou reposicione o mapa.'
      );
      return;
    }
    if (worldValue.tileMaps.indexOf(map) === -1) worldValue.tileMaps.push(map);
  }
  function createWorldFromTileMap(map, tileSize) {
    if (!map || !map.rows) {
      warnOnce('mundo-sem-mapa', 'crie o mapa antes de criar um Mundo a partir dele.');
      return createWorld(1, 1);
    }
    placeTileMap(map, 0, 0, tileSize);
    var layout = map.layout;
    var worldValue = createWorld(layout ? layout.width : 1, layout ? layout.height : 1);
    addTileMapToWorld(worldValue, map);
    return worldValue;
  }
  function _removeTerrainRegistration(worldValue, group, kind) {
    for (var i = worldValue.terrain.length - 1; i >= 0; i--) {
      var entry = worldValue.terrain[i];
      if (entry.group === group && entry.kind === kind) worldValue.terrain.splice(i, 1);
    }
  }
  function _addTerrainGroup(worldValue, group, kind) {
    if (!_isGameWorld(worldValue)) {
      warnOnce('mundo-invalido-terreno', 'crie o Mundo antes de adicionar figuras como terreno.');
      return;
    }
    if (!group || !group.items) {
      warnOnce('grupo-invalido-terreno', 'crie o grupo de figuras antes de usá-lo como terreno.');
      return;
    }
    var otherKind = kind === 'solid' ? 'platform' : 'solid';
    var conflict = worldValue.terrain.some(function (entry) {
      return entry.group === group && entry.kind === otherKind;
    });
    if (conflict) {
      warnOnce(
        'terreno-conflitante',
        'o mesmo grupo foi marcado como sólido e plataforma; sólido tem prioridade.'
      );
      if (kind === 'platform') return;
      _removeTerrainRegistration(worldValue, group, 'platform');
    }
    var exists = worldValue.terrain.some(function (entry) {
      return entry.group === group && entry.kind === kind;
    });
    if (!exists) worldValue.terrain.push({ kind: kind, group: group });
  }
  function addSolidGroupToWorld(worldValue, group) {
    _addTerrainGroup(worldValue, group, 'solid');
  }
  function addPlatformGroupToWorld(worldValue, group) {
    _addTerrainGroup(worldValue, group, 'platform');
  }
  function setWorldEdges(worldValue, edges) {
    if (!_isGameWorld(worldValue)) return;
    if (!WORLD_EDGE_MODES.has(edges)) {
      warnOnce('borda-de-mundo-invalida', 'a borda do Mundo deve ser nenhuma, chão ou sólida.');
      return;
    }
    worldValue.edges = edges;
  }
  function configureWorldCamera(worldValue, horizontal, vertical, deadZoneX, deadZoneY) {
    if (!_isGameWorld(worldValue)) return;
    var h = CAMERA_HORIZONTAL_MODES.has(horizontal) ? horizontal : 'off';
    var v = CAMERA_VERTICAL_MODES.has(vertical) ? vertical : 'off';
    if (h !== horizontal || v !== vertical) {
      warnOnce('camera-de-mundo-invalida', 'revise os modos horizontal e vertical da câmera do Mundo.');
    }
    worldValue.camera.horizontal = h;
    worldValue.camera.vertical = v;
    worldValue.camera.deadZoneX = Math.max(0, _finiteNumber(deadZoneX, 0));
    worldValue.camera.deadZoneY = Math.max(0, _finiteNumber(deadZoneY, 0));
    _resetWorldCamera(worldValue);
    if (_currentLevel && _currentLevel.world === worldValue) {
      camera.x = worldValue.camera.x;
      camera.y = worldValue.camera.y;
    }
  }
  /**
   * Modos que só voltam/sobem começam na extremidade oposta. Começar sempre em
   * zero tornava esses dois modos impossíveis: uma câmera que só diminui nunca
   * sairia do menor valor permitido.
   */
  function _resetWorldCamera(worldValue) {
    if (!_isGameWorld(worldValue)) return;
    var ctx = ensureStage();
    var maxX = Math.max(0, worldValue.width - stageW(ctx));
    var maxY = Math.max(0, worldValue.height - stageH(ctx));
    worldValue.camera.x = worldValue.camera.horizontal === 'left' ? maxX : 0;
    worldValue.camera.y = worldValue.camera.vertical === 'up' ? maxY : 0;
  }
  function _followCameraAxis(current, center, viewport, worldSize, deadZone, mode, positiveMode, negativeMode) {
    if (mode === 'off' || !(viewport > 0)) return 0;
    var halfDeadZone = Math.max(0, deadZone) / 2;
    var viewCenter = current + viewport / 2;
    var desired = current;
    if (center > viewCenter + halfDeadZone) desired += center - (viewCenter + halfDeadZone);
    else if (center < viewCenter - halfDeadZone) desired += center - (viewCenter - halfDeadZone);
    if (mode === positiveMode) desired = Math.max(current, desired);
    if (mode === negativeMode) desired = Math.min(current, desired);
    return Math.round(Math.max(0, Math.min(desired, Math.max(0, worldSize - viewport))));
  }
  function followCameraInWorld(sprite, worldValue) {
    if (!sprite || !_isGameWorld(worldValue)) return;
    var ctx = ensureStage();
    var viewW = stageW(ctx), viewH = stageH(ctx);
    var centerX = _finiteNumber(sprite.x, 0) + _finiteNumber(sprite.w, 0) / 2;
    var centerY = _finiteNumber(sprite.y, 0) + _finiteNumber(sprite.h, 0) / 2;
    var config = worldValue.camera;
    config.x = _followCameraAxis(
      config.x,
      centerX,
      viewW,
      worldValue.width,
      config.deadZoneX,
      config.horizontal,
      'right',
      'left'
    );
    config.y = _followCameraAxis(
      config.y,
      centerY,
      viewH,
      worldValue.height,
      config.deadZoneY,
      config.vertical,
      'down',
      'up'
    );
    camera.x = config.x;
    camera.y = config.y;
  }
  function _collideWorldEdges(sprite, worldValue) {
    if (!sprite || worldValue.edges === 'none') return;
    var pullsUp = _gravityPullsUp(world.gravity);
    var floorY = worldValue.height - _finiteNumber(sprite.h, 0);
    if (worldValue.edges === 'solid') {
      if (sprite.x < 0) { sprite.x = 0; sprite.vx = 0; }
      if (sprite.x + sprite.w > worldValue.width) {
        sprite.x = worldValue.width - sprite.w;
        sprite.vx = 0;
      }
      if (pullsUp && sprite.y + sprite.h > worldValue.height) {
        sprite.y = floorY;
        if (sprite.vy > 0) sprite.vy = 0;
      }
      if (!pullsUp && sprite.y < 0) {
        sprite.y = 0;
        if (sprite.vy < 0) sprite.vy = 0;
      }
    }
    if (pullsUp) {
      if (sprite.y <= 0) {
        sprite.y = 0;
        sprite.vy = 0;
        _confirmGroundSupport(sprite, null);
      }
    } else if (sprite.y >= floorY) {
      sprite.y = floorY;
      sprite.vy = 0;
      _confirmGroundSupport(sprite, null);
    }
  }
  function collideWorld(sprite, worldValue) {
    if (!sprite || !_isGameWorld(worldValue)) return;
    _beginSupportResolution(sprite);
    try {
      for (var i = 0; i < worldValue.tileMaps.length; i++) {
        collideTileMap(sprite, worldValue.tileMaps[i]);
      }
      for (var j = 0; j < worldValue.terrain.length; j++) {
        var entry = worldValue.terrain[j];
        if (entry.kind === 'solid') collideGroup(sprite, entry.group);
        else collidePlatformGroup(sprite, entry.group);
      }
      _collideWorldEdges(sprite, worldValue);
    } finally {
      _endSupportResolution(sprite);
    }
  }
  function drawWorld(ctx, worldValue) {
    if (!ctx || !_isGameWorld(worldValue)) return;
    camera.x = worldValue.camera.x;
    camera.y = worldValue.camera.y;
    var camOn = camera.x !== 0 || camera.y !== 0;
    if (camOn) { ctx.save(); ctx.translate(-camera.x, -camera.y); }
    for (var i = 0; i < worldValue.tileMaps.length; i++) drawTileMap(ctx, worldValue.tileMaps[i]);
    for (var j = 0; j < worldValue.terrain.length; j++) drawGroup(ctx, worldValue.terrain[j].group);
    if (camOn) ctx.restore();
  }

  function createLevel(worldValue, spawnX, spawnY) {
    if (!_isGameWorld(worldValue)) {
      warnOnce('fase-sem-mundo', 'crie um Mundo antes de criar a Fase.');
      worldValue = createWorld(1, 1);
    }
    return {
      _kind: 'g2d-level',
      world: worldValue,
      spawnX: _finiteNumber(spawnX, 0),
      spawnY: _finiteNumber(spawnY, 0),
      _entryGeneration: 0
    };
  }
  function _runLevelEnterHandler(handlerId, handler, generation) {
    if (!handler || handler.lastGeneration === generation) return;
    handler.lastGeneration = generation;
    try { _invokeProjectCallback(handler.fn, undefined, []); }
    catch (error) {
      _reportHandlerError('“Quando entrar na fase”', handlerId, error);
      _removeOrderedIfCurrent(_levelEnterHandlers, _levelEnterOrder, handlerId, handler);
    }
  }
  function _dispatchLevelEnter(level) {
    var generation = level._entryGeneration;
    var order = _levelEnterOrder.slice();
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var handler = _levelEnterHandlers[id];
      if (!handler) continue;
      var handlerLevel = null;
      try { handlerLevel = handler.getLevel(); }
      catch (error) {
        // O evento pode vir antes da declaração da Fase no código gerado.
        // O thunk resolve esse nome somente quando a entrada acontece.
        if (error instanceof ReferenceError) continue;
        _reportHandlerError('“Quando entrar na fase”', id, error);
        _removeOrderedIfCurrent(_levelEnterHandlers, _levelEnterOrder, id, handler);
        continue;
      }
      if (handlerLevel !== level) continue;
      _runLevelEnterHandler(id, handler, generation);
    }
  }
  function enterLevel(level, player) {
    if (!_isGameLevel(level) || !player) {
      warnOnce('entrada-de-fase-invalida', 'escolha uma Fase e um sprite para entrar nela.');
      return;
    }
    _currentLevel = level;
    _levelEntryGeneration += 1;
    level._entryGeneration = _levelEntryGeneration;
    player.x = level.spawnX;
    player.y = level.spawnY;
    player.vx = 0;
    player.vy = 0;
    _detachGroundSupport(player);
    // Uma posição anterior de outro Mundo não pode participar da primeira
    // colisão varrida da nova Fase.
    player._previousX = level.spawnX;
    player._previousY = level.spawnY;
    player._supportResolutionDepth = 0;
    player._supportResolutionGroup = null;
    delete player._supportPreferenceOwner;
    delete player._supportCandidateChosen;
    _resetWorldCamera(level.world);
    camera.x = level.world.camera.x;
    camera.y = level.world.camera.y;
    _dispatchLevelEnter(level);
  }
  function onLevelEnter(getLevel, fn, id) {
    if (typeof getLevel !== 'function' || typeof fn !== 'function') return;
    var handlerId = _stableHandlerId('entrada-de-fase', id, fn);
    if (!_levelEnterHandlers[handlerId]) _levelEnterOrder.push(handlerId);
    var handler = {
      getLevel: getLevel,
      fn: fn,
      lastGeneration: _levelEnterHandlers[handlerId]
        ? _levelEnterHandlers[handlerId].lastGeneration
        : 0
    };
    _levelEnterHandlers[handlerId] = handler;
    var level = null;
    try { level = getLevel(); }
    catch (error) {
      if (!(error instanceof ReferenceError)) {
        _reportHandlerError('“Quando entrar na fase”', handlerId, error);
        _removeOrderedIfCurrent(_levelEnterHandlers, _levelEnterOrder, handlerId, handler);
      }
      return;
    }
    if (!_isGameLevel(level)) {
      warnOnce('evento-de-fase-sem-fase', 'crie a Fase antes do evento “Quando entrar na fase”.');
      return;
    }
    if (_currentLevel === level && level._entryGeneration > 0) {
      _runLevelEnterHandler(handlerId, handler, level._entryGeneration);
    }
  }
  function levelIsActive(level) { return _currentLevel === level; }
  function _currentLevelOrWarn(action) {
    if (_currentLevel) return _currentLevel;
    warnOnce('fase-atual-ausente-' + action, 'entre em uma Fase antes de usar os blocos da Fase atual.');
    return null;
  }
  function collideCurrentLevel(sprite) {
    var level = _currentLevelOrWarn('colidir');
    if (level) collideWorld(sprite, level.world);
  }
  function followCurrentLevelCamera(sprite) {
    var level = _currentLevelOrWarn('camera');
    if (level) followCameraInWorld(sprite, level.world);
  }
  function drawCurrentLevel(ctx) {
    var level = _currentLevelOrWarn('desenhar');
    if (level) drawWorld(ctx, level.world);
  }
  function _resetWorldsAndLevels() {
    _currentLevel = null;
    _levelEnterHandlers = Object.create(null);
    _levelEnterOrder = [];
    _levelEntryGeneration = 0;
  }

`
