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
  var _dispatchingLevelEnter = false;

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
    var worldValue = {
      _kind: 'g2d-world',
      // Os fallbacks são os MESMOS números das sombras do bloco (800x512): dois
      // defaults diferentes para a mesma coisa só existem para confundir quem
      // abre o modo Código depois de montar nos blocos.
      width: _worldDimension(width, 800),
      height: _worldDimension(height, 512),
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
      },
      _viewportWidth: 0,
      _viewportHeight: 0
    };
    return worldValue;
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
    // ⚠️ "Encaixado na tela" é geometria de TELA: ela se recalcula sozinha toda
    // vez que o palco muda de tamanho. Como terreno de um Mundo isso desalinhava
    // colisão, desenho e bordas EM SILÊNCIO, porque o encaixe só era conferido
    // aqui, uma vez. Ao virar terreno, o mapa é congelado em coordenadas do
    // Mundo e para de se reencaixar — que é o que o Mundo já promete.
    if (map.layout.mode === 'fitted') {
      _setTileMapLayout(map, map.layout.x, map.layout.y, map.layout.tileSize, 'placed');
      map._fitStageRevision = -1;
      warnOnce(
        'mapa-encaixado-virou-terreno',
        'o mapa encaixado na tela virou terreno do Mundo, então o tamanho dele ficou fixo e não acompanha mais a tela. Para um mapa que se reencaixa, desenhe-o fora do Mundo; para escolher o tamanho, use “Preparar o mapa em x y com tiles”.'
      );
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
  /**
   * Faz os inimigos de um tipo andarem no terreno deste Mundo em vez de tratarem
   * a borda da TELA como chão e como parede. Vale para os que andam no chão; quem
   * voa continua voando, porque voador nunca resolveu apoio.
   */
  function addEnemyTypeToWorld(worldValue, type) {
    if (!_isGameWorld(worldValue)) {
      warnOnce('mundo-invalido-inimigos', 'crie o Mundo antes de pôr os inimigos no terreno dele.');
      return;
    }
    if (!type || !type.items || !type.config || !type.bullets) {
      warnOnce(
        'tipo-de-inimigo-invalido-no-mundo',
        'escolha um tipo de inimigo para andar no terreno do Mundo.'
      );
      return;
    }
    type._world = worldValue;
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
    worldValue._viewportWidth = stageW(ctx);
    worldValue._viewportHeight = stageH(ctx);
  }
  /**
   * Mantém a âncora da câmera sem um registro global forte. Mundos inativos se
   * atualizam quando voltam a ser usados; somente a Fase ativa sincroniza já no
   * evento de resize.
   */
  function _syncWorldViewport(worldValue) {
    if (!_isGameWorld(worldValue)) return;
    var ctx = ensureStage();
    var nextW = stageW(ctx), nextH = stageH(ctx);
    var previousW = worldValue._viewportWidth || nextW;
    var previousH = worldValue._viewportHeight || nextH;
    if (previousW === nextW && previousH === nextH) return;
    var oldMaxX = Math.max(0, worldValue.width - previousW);
    var oldMaxY = Math.max(0, worldValue.height - previousH);
    var nextMaxX = Math.max(0, worldValue.width - nextW);
    var nextMaxY = Math.max(0, worldValue.height - nextH);
    if (worldValue.camera.horizontal === 'left') {
      worldValue.camera.x = nextMaxX - Math.max(0, oldMaxX - worldValue.camera.x);
    }
    if (worldValue.camera.vertical === 'up') {
      worldValue.camera.y = nextMaxY - Math.max(0, oldMaxY - worldValue.camera.y);
    }
    worldValue.camera.x = Math.max(0, Math.min(nextMaxX, worldValue.camera.x));
    worldValue.camera.y = Math.max(0, Math.min(nextMaxY, worldValue.camera.y));
    worldValue._viewportWidth = nextW;
    worldValue._viewportHeight = nextH;
  }
  function _onStageViewportChanged() {
    if (!_currentLevel) return;
    _syncWorldViewport(_currentLevel.world);
    camera.x = _currentLevel.world.camera.x;
    camera.y = _currentLevel.world.camera.y;
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
    _syncWorldViewport(worldValue);
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
  // Índice espacial do terreno desenhado por figuras. O grupo continua sendo a
  // fonte da verdade; o índice é reconstruído se pertencimento OU geometria
  // mudarem, inclusive por atribuição direta no modo Código.
  var TERRAIN_SPATIAL_CELL = 128;
  var MAX_TERRAIN_BUCKETS_PER_SPRITE = 4096;
  function _terrainGeometryIsCurrent(entry) {
    var items = entry.group.items;
    var snapshot = entry._spatialGeometry;
    if (!snapshot || snapshot.length !== items.length * 7 ||
        entry._spatialRevision !== entry.group._revision) return false;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var offset = i * 7;
      var previous = item ? _motionPreviousPosition(item) : { x: 0, y: 0 };
      if (snapshot[offset] !== item ||
          snapshot[offset + 1] !== (item && item.x) ||
          snapshot[offset + 2] !== (item && item.y) ||
          snapshot[offset + 3] !== (item && item.w) ||
          snapshot[offset + 4] !== (item && item.h) ||
          snapshot[offset + 5] !== previous.x ||
          snapshot[offset + 6] !== previous.y) return false;
    }
    return true;
  }
  function _terrainBucketKey(col, row) { return col + ':' + row; }
  function _rebuildTerrainSpatialIndex(entry) {
    var items = entry.group.items;
    var buckets = new Map();
    var large = [];
    var geometry = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var previous = item ? _motionPreviousPosition(item) : { x: 0, y: 0 };
      geometry.push(
        item,
        item && item.x,
        item && item.y,
        item && item.w,
        item && item.h,
        previous.x,
        previous.y
      );
      if (!item) continue;
      var w = _finiteNumber(item.w, 0), h = _finiteNumber(item.h, 0);
      var left = Math.min(previous.x, _finiteNumber(item.x, 0));
      var top = Math.min(previous.y, _finiteNumber(item.y, 0));
      var right = Math.max(previous.x + w, _finiteNumber(item.x, 0) + w);
      var bottom = Math.max(previous.y + h, _finiteNumber(item.y, 0) + h);
      if (!(right >= left && bottom >= top)) continue;
      var c0 = Math.floor(left / TERRAIN_SPATIAL_CELL);
      var c1 = Math.floor((right - 0.0001) / TERRAIN_SPATIAL_CELL);
      var r0 = Math.floor(top / TERRAIN_SPATIAL_CELL);
      var r1 = Math.floor((bottom - 0.0001) / TERRAIN_SPATIAL_CELL);
      var bucketCount = (c1 - c0 + 1) * (r1 - r0 + 1);
      if (!(bucketCount > 0) || bucketCount > MAX_TERRAIN_BUCKETS_PER_SPRITE) {
        large.push(i);
        continue;
      }
      for (var row = r0; row <= r1; row++) for (var col = c0; col <= c1; col++) {
        var key = _terrainBucketKey(col, row);
        var bucket = buckets.get(key);
        if (!bucket) { bucket = []; buckets.set(key, bucket); }
        bucket.push(i);
      }
    }
    entry._spatialBuckets = buckets;
    entry._spatialLarge = large;
    entry._spatialGeometry = geometry;
    entry._spatialRevision = entry.group._revision;
  }
  function _terrainCandidates(entry, left, top, right, bottom) {
    if (!_terrainGeometryIsCurrent(entry)) _rebuildTerrainSpatialIndex(entry);
    var selected = new Set(entry._spatialLarge || []);
    var c0 = Math.floor(left / TERRAIN_SPATIAL_CELL);
    var c1 = Math.floor((right - 0.0001) / TERRAIN_SPATIAL_CELL);
    var r0 = Math.floor(top / TERRAIN_SPATIAL_CELL);
    var r1 = Math.floor((bottom - 0.0001) / TERRAIN_SPATIAL_CELL);
    var queryBuckets = (c1 - c0 + 1) * (r1 - r0 + 1);
    if (!(queryBuckets > 0) || queryBuckets > MAX_TERRAIN_BUCKETS_PER_SPRITE) {
      var all = [];
      for (var allIndex = 0; allIndex < entry.group.items.length; allIndex++) all.push(allIndex);
      return all;
    }
    for (var row = r0; row <= r1; row++) for (var col = c0; col <= c1; col++) {
      var bucket = entry._spatialBuckets.get(_terrainBucketKey(col, row));
      if (bucket) for (var i = 0; i < bucket.length; i++) selected.add(bucket[i]);
    }
    return Array.from(selected).sort(function (a, b) { return a - b; });
  }
  function _collideTerrainEntry(sprite, entry) {
    var previous = _motionPreviousPosition(sprite);
    var left = Math.min(previous.x, sprite.x) - 1;
    var top = Math.min(previous.y, sprite.y) - 1;
    var right = Math.max(previous.x + sprite.w, sprite.x + sprite.w) + 1;
    var bottom = Math.max(previous.y + sprite.h, sprite.y + sprite.h) + 1;
    var indices = _terrainCandidates(entry, left, top, right, bottom);
    var previousResolutionGroup = sprite._supportResolutionGroup;
    sprite._supportResolutionGroup = entry.group;
    _beginSupportResolution(sprite);
    try {
      for (var i = 0; i < indices.length; i++) {
        var obstacle = entry.group.items[indices[i]];
        if (entry.kind === 'solid') collideSprite(sprite, obstacle);
        else collidePlatform(sprite, obstacle);
      }
    } finally {
      _endSupportResolution(sprite);
      sprite._supportResolutionGroup = previousResolutionGroup;
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
        _collideTerrainEntry(sprite, worldValue.terrain[j]);
      }
      _collideWorldEdges(sprite, worldValue);
    } finally {
      _endSupportResolution(sprite);
    }
  }
  function drawWorld(ctx, worldValue) {
    if (!ctx || !_isGameWorld(worldValue)) return;
    _syncWorldViewport(worldValue);
    camera.x = worldValue.camera.x;
    camera.y = worldValue.camera.y;
    var camOn = camera.x !== 0 || camera.y !== 0;
    if (camOn) { ctx.save(); ctx.translate(-camera.x, -camera.y); }
    try {
      for (var i = 0; i < worldValue.tileMaps.length; i++) drawTileMap(ctx, worldValue.tileMaps[i]);
      var visible = _visibleWorldRect(ctx);
      for (var j = 0; j < worldValue.terrain.length; j++) {
        var entry = worldValue.terrain[j];
        var indices = _terrainCandidates(entry, visible.left, visible.top, visible.right, visible.bottom);
        entry.group._drawn = true;
        for (var k = 0; k < indices.length; k++) drawSprite(ctx, entry.group.items[indices[k]]);
      }
    } finally {
      if (camOn) ctx.restore();
    }
  }

  function createLevel(worldValue, spawnX, spawnY) {
    if (!_isGameWorld(worldValue)) {
      warnOnce('fase-sem-mundo', 'crie um Mundo antes de criar a Fase.');
      worldValue = createWorld(1, 1);
    }
    var level = {
      _kind: 'g2d-level',
      world: worldValue,
      spawnX: _finiteNumber(spawnX, 0),
      spawnY: _finiteNumber(spawnY, 0),
      resetGroups: [],
      _entryGeneration: 0,
      _mapSnapshots: null
    };
    return level;
  }
  function _cloneTileRows(rows) {
    var result = [];
    if (!rows) return result;
    for (var i = 0; i < rows.length; i++) result.push(rows[i] ? rows[i].slice() : []);
    return result;
  }
  /**
   * A linha de base nasce na primeira entrada, depois que todos os blocos de
   * preparação tiveram chance de montar o Mundo. Mapas adicionados mais tarde
   * ganham sua própria linha de base sem sobrescrever os snapshots existentes.
   */
  function _ensureLevelMapSnapshots(level) {
    if (!level._mapSnapshots) level._mapSnapshots = [];
    var maps = level.world.tileMaps;
    for (var i = 0; i < maps.length; i++) {
      var map = maps[i];
      var known = false;
      for (var j = 0; j < level._mapSnapshots.length; j++) {
        if (level._mapSnapshots[j].map === map) { known = true; break; }
      }
      if (!known) level._mapSnapshots.push({ map: map, rows: _cloneTileRows(map.rows) });
    }
  }
  /** Registra conteúdo dinâmico que pertence à Fase e deve renascer no reinício. */
  function resetGroupWithLevel(level, group) {
    if (!_isGameLevel(level) || !group || !group.items) {
      warnOnce('grupo-de-fase-invalido', 'escolha uma Fase e um grupo para reiniciar juntos.');
      return;
    }
    if (level.resetGroups.indexOf(group) === -1) level.resetGroups.push(group);
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
  /**
   * ⚠️ Entrar (ou reiniciar) DENTRO do próprio "Quando entrar na Fase" é um
   * engano fácil de montar ("quando entrar, comece de novo") e RECURSIVO: cada
   * entrada abre uma geração nova, então a dedução por geração não segura nada.
   * Sem esta trava eram milhares de entradas aninhadas até estourar a pilha, e o
   * que a criança via era só "aconteceu um erro".
   */
  function _dispatchLevelEnter(level) {
    if (_dispatchingLevelEnter) {
      warnOnce(
        'entrada-de-fase-reentrante',
        'o bloco “Quando entrar na Fase” entrou na Fase outra vez, e isso se repetiria para sempre. Tire o “Entrar na Fase” ou o “Reiniciar a Fase” de dentro dele.'
      );
      return;
    }
    _dispatchingLevelEnter = true;
    try {
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
    } finally {
      _dispatchingLevelEnter = false;
    }
  }
  function enterLevel(level, player) {
    if (!_isGameLevel(level) || !player) {
      warnOnce('entrada-de-fase-invalida', 'escolha uma Fase e um sprite para entrar nela.');
      return;
    }
    _currentLevel = level;
    _ensureLevelMapSnapshots(level);
    _levelEntryGeneration += 1;
    level._entryGeneration = _levelEntryGeneration;
    setPosition(player, level.spawnX, level.spawnY);
    player.vx = 0;
    player.vy = 0;
    player._supportResolutionDepth = 0;
    player._supportResolutionGroup = null;
    delete player._supportPreferenceOwner;
    delete player._supportCandidateChosen;
    _resetWorldCamera(level.world);
    camera.x = level.world.camera.x;
    camera.y = level.world.camera.y;
    _dispatchLevelEnter(level);
  }
  /**
   * Reinício é deliberadamente diferente de entrada: restaura tiles quebrados,
   * esvazia somente os grupos registrados pela criança e então dispara a mesma
   * entrada para que o conteúdo inicial seja criado uma vez.
   */
  function restartLevel(level, player) {
    if (!_isGameLevel(level) || !player) {
      warnOnce('reinicio-de-fase-invalido', 'escolha uma Fase e um sprite para reiniciá-la.');
      return;
    }
    _ensureLevelMapSnapshots(level);
    for (var i = 0; i < level._mapSnapshots.length; i++) {
      var snapshot = level._mapSnapshots[i];
      snapshot.map.rows = _cloneTileRows(snapshot.rows);
    }
    for (var j = 0; j < level.resetGroups.length; j++) clearGroup(level.resetGroups[j]);
    enterLevel(level, player);
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
  // Compara depois de conferir o tipo: antes da primeira entrada _currentLevel é
  // null, e "null é a Fase atual?" respondia SIM.
  function levelIsActive(level) { return _isGameLevel(level) && _currentLevel === level; }
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
    _dispatchingLevelEnter = false;
    _levelEnterHandlers = Object.create(null);
    _levelEnterOrder = [];
    _levelEntryGeneration = 0;
  }

`
