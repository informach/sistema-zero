import { CAMPAIGN_ENTITY_RUNTIME_CATALOG_JSON } from '../campaignEntityCatalog'
import { gameKitCampaignEventsRuntime } from './campaignEvents'
import { gameKitCampaignInputRuntime, gameKitCampaignInputStateRuntime } from './campaignInput'
import { gameKitCampaignPersistenceRuntime } from './campaignPersistence'

/**
 * Relógio determinístico, entrada semântica e campanha de plataforma do Jogo
 * 2D Avançado. O fragmento roda dentro do IIFE principal e usa somente os
 * pontos de extensão do próprio runtime.
 */
export const gameKitCampaignRuntime = `
  // ============================================================================
  // AVENTURA EM FASES — simulação fixa, ações, save e replay
  // ============================================================================
${gameKitCampaignInputStateRuntime}
  function proPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function proObjectHasOnlyKeys(value, allowed) {
    var allowedMap = Object.create(null);
    for (var ai = 0; ai < allowed.length; ai++) allowedMap[allowed[ai]] = true;
    var valueKeys = Object.keys(value);
    for (var vi = 0; vi < valueKeys.length; vi++) if (!allowedMap[valueKeys[vi]]) return false;
    return true;
  }
${gameKitCampaignInputRuntime}

  var proCampaign = {
    id: '', version: 0, firstStage: '', playersCount: 1, seed: 1, requiredGems: 0,
    stages: Object.create(null), stageOrder: [], active: false, stageId: '', stage: null,
    hero: null, entities: [], entityPool: [], checkpoint: null, listeners: Object.create(null),
    saveSlots: 3, activeSlot: 1, transition: null, elapsed: 0, triggered: Object.create(null),
    progress: null, mapKey: '__szgk_campaign_stage', reducedMotion: false,
    highContrast: false, volume: 1, eventName: '', eventPayload: null
  };
  var PRO_STAGE_ENTITY_CATALOG = ${CAMPAIGN_ENTITY_RUNTIME_CATALOG_JSON};
  var PRO_STAGE_KINDS = Object.create(null);
  var proStageKindNames = Object.keys(PRO_STAGE_ENTITY_CATALOG);
  for (var proKindIndex = 0; proKindIndex < proStageKindNames.length; proKindIndex++) PRO_STAGE_KINDS[proStageKindNames[proKindIndex]] = 1;
  var PRO_TILE_INDEX = { '.': 0, '#': 1, '=': 2, 'B': 3, '?': 4, '^': 5, '~': 6, 'H': 7 };
  function proSafeId(value) {
    var id = text(value, '').trim();
    return id.length > 0 && id.length <= 64 && /^[A-Za-z0-9_-]+$/.test(id) ? id : '';
  }
  function proCopyProps(value) {
    var out = Object.create(null);
    if (!proPlainObject(value)) return out;
    var keysList = Object.keys(value);
    if (keysList.length > 32) return null;
    for (var i = 0; i < keysList.length; i++) {
      var key = keysList[i]; var item = value[key];
      if (key.length > 40 || (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean')) return null;
      if (typeof item === 'string' && item.length > 200) return null;
      if (typeof item === 'number' && !isFinite(item)) return null;
      out[key] = item;
    }
    return out;
  }
  function proEntityPropsValid(kind, props) {
    var definition = PRO_STAGE_ENTITY_CATALOG[kind];
    if (!definition) return false;
    for (var ri = 0; ri < definition.properties.length; ri++) {
      var rule = definition.properties[ri];
      if (!Object.prototype.hasOwnProperty.call(props, rule.key)) continue;
      var value = props[rule.key];
      if (rule.type === 'boolean') { if (typeof value !== 'boolean') return false; continue; }
      if (rule.type === 'number') {
        if (typeof value !== 'number' || !isFinite(value) || value < rule.min || value > rule.max) return false;
        continue;
      }
      var allowed = false;
      for (var oi = 0; oi < rule.options.length; oi++) if (rule.options[oi].value === value) allowed = true;
      if (!allowed) return false;
    }
    return true;
  }
  function proUniqueEntityId(base, usedIds) {
    if (!usedIds[base]) return base;
    for (var suffix = 2; suffix <= 129; suffix++) {
      var suffixText = '-' + suffix;
      var candidate = base.slice(0, 64 - suffixText.length) + suffixText;
      if (!usedIds[candidate]) return candidate;
    }
    return base.slice(0, 59) + '-' + Object.keys(usedIds).length;
  }
  function validateCampaignStage(raw) {
    if (!proPlainObject(raw) || raw.schemaVersion !== 1 || !proObjectHasOnlyKeys(raw, ['schemaVersion', 'id', 'world', 'order', 'theme', 'width', 'height', 'tiles', 'entities', 'triggers', 'nextStage', 'secretStage', 'timeLimit'])) return null;
    var id = proSafeId(raw.id);
    var width = raw.width; var height = raw.height; var world = raw.world; var order = raw.order;
    var nextStageId = raw.nextStage === undefined || raw.nextStage === '' ? '' : proSafeId(raw.nextStage);
    var secretStageId = raw.secretStage === undefined || raw.secretStage === '' ? '' : proSafeId(raw.secretStage);
    var stageTime = raw.timeLimit === undefined ? 300 : raw.timeLimit;
    if (!id || !Number.isInteger(width) || width < 1 || width > 512 || !Number.isInteger(height) || height < 1 || height > 512 || !Number.isInteger(world) || world < 1 || world > 128 || !Number.isInteger(order) || order < 1 || order > 128 || !nextStageId && raw.nextStage !== undefined && raw.nextStage !== '' || !secretStageId && raw.secretStage !== undefined && raw.secretStage !== '' || typeof raw.theme !== 'string' || raw.theme.length < 1 || raw.theme.length > 40 || typeof stageTime !== 'number' || !isFinite(stageTime) || stageTime < 0 || stageTime > 3600 || !Array.isArray(raw.tiles) || raw.tiles.length !== height) return null;
    var tiles = [];
    for (var r = 0; r < raw.tiles.length; r++) {
      if (typeof raw.tiles[r] !== 'string' || raw.tiles[r].length !== width) return null;
      for (var c = 0; c < width; c++) if (PRO_TILE_INDEX[raw.tiles[r].charAt(c)] == null) return null;
      tiles.push(raw.tiles[r]);
    }
    if (!Array.isArray(raw.entities) || raw.entities.length > 128) return null;
    var entities = [];
    var usedEntityIds = Object.create(null);
    for (var ei = 0; ei < raw.entities.length; ei++) {
      var sourceEntity = raw.entities[ei];
      if (!proPlainObject(sourceEntity) || !proObjectHasOnlyKeys(sourceEntity, ['kind', 'id', 'x', 'y', 'variant', 'props']) || !PRO_STAGE_KINDS[sourceEntity.kind]) return null;
      if (sourceEntity.props !== undefined && !proPlainObject(sourceEntity.props)) return null;
      var props = proCopyProps(sourceEntity.props); if (props == null || !proEntityPropsValid(sourceEntity.kind, props)) return null;
      var sourceEntityId = sourceEntity.id === undefined || sourceEntity.id === '' ? '' : proSafeId(sourceEntity.id); if (sourceEntity.id !== undefined && sourceEntity.id !== '' && !sourceEntityId) return null;
      if (typeof sourceEntity.x !== 'number' || !isFinite(sourceEntity.x) || typeof sourceEntity.y !== 'number' || !isFinite(sourceEntity.y) || sourceEntity.variant !== undefined && (typeof sourceEntity.variant !== 'string' || sourceEntity.variant.length > 80)) return null;
      var entityId = proUniqueEntityId(sourceEntityId || sourceEntity.kind + '-' + (ei + 1), usedEntityIds);
      usedEntityIds[entityId] = true;
      entities.push({ kind: sourceEntity.kind, id: entityId, x: num(sourceEntity.x, 0), y: num(sourceEntity.y, 0), variant: text(sourceEntity.variant, ''), props: props });
    }
    if (!Array.isArray(raw.triggers) || raw.triggers.length > 256) return null;
    var triggers = [];
    for (var ti = 0; ti < raw.triggers.length; ti++) {
      var trigger = raw.triggers[ti];
      if (!proPlainObject(trigger) || !proObjectHasOnlyKeys(trigger, ['kind', 'x', 'y', 'w', 'h', 'target', 'value']) || !proSafeId(trigger.kind)) return null;
      var value = trigger.value;
      var triggerTarget = trigger.target === undefined || trigger.target === '' ? '' : proSafeId(trigger.target);
      if (typeof trigger.x !== 'number' || !isFinite(trigger.x) || typeof trigger.y !== 'number' || !isFinite(trigger.y) || typeof trigger.w !== 'number' || !isFinite(trigger.w) || trigger.w < 0 || typeof trigger.h !== 'number' || !isFinite(trigger.h) || trigger.h < 0 || !triggerTarget && trigger.target !== undefined && trigger.target !== '' || value !== undefined && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' || typeof value === 'number' && !isFinite(value) || typeof value === 'string' && value.length > 200) return null;
      triggers.push({ kind: trigger.kind, x: trigger.x, y: trigger.y, w: trigger.w, h: trigger.h, target: triggerTarget, value: value });
    }
    return {
      schemaVersion: 1, id: id, world: world, order: order,
      theme: raw.theme, width: width, height: height, tiles: tiles,
      entities: entities, triggers: triggers, nextStage: nextStageId, secretStage: secretStageId,
      timeLimit: stageTime
    };
  }
  function defineCampaign(options) {
    if (!proPlainObject(options)) { warn('os dados da aventura são inválidos'); return false; }
    var id = proSafeId(options.id); var first = proSafeId(options.firstStage);
    if (!id || !first) { warn('a aventura precisa de nome e primeira fase válidos'); return false; }
    proCampaign.id = id; proCampaign.version = boundedInteger(options.version, 1, 1, 999999);
    proCampaign.firstStage = first; proCampaign.playersCount = boundedInteger(options.players, 1, 1, 2);
    proCampaign.seed = proUint32(options.seed); proCampaign.requiredGems = boundedInteger(options.requiredGems, 0, 0, 128); proCampaign.stages = Object.create(null);
    proCampaign.stageOrder.length = 0; proCampaign.active = false; proCampaign.stageId = ''; proCampaign.stage = null;
    proCampaign.progress = null; proCampaign.checkpoint = null; proCampaign.transition = null;
    return true;
  }
  function defineCampaignStage(stage) {
    if (!proCampaign.id) { warn('prepare a aventura antes de definir fases'); return false; }
    if (!proCampaign.stages[stage && stage.id] && proCampaign.stageOrder.length >= 128) { warn('a aventura aceita até 128 fases'); return false; }
    var valid = validateCampaignStage(stage);
    if (!valid) { warn('a fase não pôde ser usada; confira tamanho, peças, personagens e gatilhos'); return false; }
    if (!proCampaign.stages[valid.id]) proCampaign.stageOrder.push(valid.id);
    proCampaign.stages[valid.id] = valid;
    return true;
  }
  function proNewProgress() {
    var players = [];
    for (var i = 0; i < proCampaign.playersCount; i++) players.push({ lives: 5, score: 0, form: 'pequeno' });
    return { stageId: proCampaign.firstStage, checkpointId: '', checkpointX: 0, checkpointY: 0, activePlayer: 1, players: players, coins: 0, gems: [], secrets: [], journey: 1, settings: { volume: 1, reducedMotion: false, highContrast: false } };
  }
  function proReleaseCampaignEntities() {
    for (var i = 0; i < proCampaign.entities.length; i++) {
      var entity = proCampaign.entities[i]; entity.active = false; entity.props = Object.create(null); proCampaign.entityPool.push(entity);
    }
    proCampaign.entities.length = 0;
  }
  function proEntityFromSpec(spec) {
    var entity = proCampaign.entityPool.pop();
    if (!entity) entity = {};
    entity.kind = spec.kind; entity.id = spec.id; entity.x = spec.x * 16; entity.y = spec.y * 16;
    entity.startX = entity.x; entity.startY = entity.y; entity.prevX = entity.x; entity.prevY = entity.y;
    entity.w = spec.kind === 'coin' || spec.kind === 'gem' ? 10 : spec.kind === 'movingPlatform' ? 28 : spec.kind === 'boss' ? 24 : 14;
    entity.h = spec.kind === 'coin' || spec.kind === 'gem' ? 10 : spec.kind === 'boss' ? 22 : 14; entity.vx = 0; entity.vy = 0;
    entity.active = true; entity.variant = spec.variant; entity.props = spec.props; entity.health = spec.kind === 'boss' ? Math.max(3, num(spec.props.health, 6)) : 1;
    entity.phase = 1; entity.timer = 0; entity.direction = num(spec.props.direction, -1) < 0 ? -1 : 1;
    return entity;
  }
  function proBuildTilemap(stage) {
    var rows = [];
    for (var r = 0; r < stage.tiles.length; r++) {
      var row = [];
      for (var c = 0; c < stage.width; c++) row.push(PRO_TILE_INDEX[stage.tiles[r].charAt(c)]);
      rows.push(row);
    }
    tilePx = 16;
    tilemaps[proCampaign.mapKey] = { rows: rows, artTile: 16, imgKey: '', solid: { 1: true, 3: true, 4: true }, platform: { 2: true } };
  }
  function proStageInstance(source) {
    return { schemaVersion: 1, id: source.id, world: source.world, order: source.order, theme: source.theme, width: source.width, height: source.height, tiles: source.tiles.slice(), entities: source.entities, triggers: source.triggers, nextStage: source.nextStage, secretStage: source.secretStage, timeLimit: source.timeLimit };
  }
  function proCampaignEntityKey(stageId, entityId) {
    return String(stageId.length) + '_' + stageId + '_' + entityId;
  }
  function proGemWasCollected(stageId, entityId) {
    if (!proCampaign.progress) return false;
    var gems = proCampaign.progress.gems;
    return gems.indexOf(proCampaignEntityKey(stageId, entityId)) !== -1 || gems.indexOf(entityId) !== -1;
  }
${gameKitCampaignEventsRuntime}
  function proLoadStage(stageId, reason) {
    var id = proSafeId(stageId); var sourceStage = proCampaign.stages[id];
    if (!sourceStage) { warn('a fase "' + id + '" não existe'); return false; }
    var stage = proStageInstance(sourceStage);
    proReleaseCampaignEntities(); proBuildTilemap(stage);
    var heroSpec = null;
    for (var i = 0; i < stage.entities.length; i++) {
      var spec = stage.entities[i];
      if (spec.kind === 'hero' && !heroSpec) heroSpec = spec;
      else if (spec.kind === 'gem' && proGemWasCollected(id, spec.id)) continue;
      else proCampaign.entities.push(proEntityFromSpec(spec));
    }
    if (!proCampaign.hero) proCampaign.hero = createCharacter({ w: 12, h: 15, color: '#40d9ff', speed: 82 });
    var hx = heroSpec ? heroSpec.x * 16 : 16; var hy = heroSpec ? heroSpec.y * 16 : 16;
    placeCharacterAt(proCampaign.hero, hx, hy); proCampaign.hero.vx = 0; proCampaign.hero.vy = 0; proCampaign.hero.onGround = false;
    proCampaign.hero._proPrevX = hx; proCampaign.hero._proPrevY = hy;
    proCampaign.hero._proCoyote = 0; proCampaign.hero._proBuffer = 0; proCampaign.hero._proInvincible = 0;
    proCampaign.stage = stage; proCampaign.stageId = id; proCampaign.active = true; proCampaign.elapsed = 0; proCampaign.triggered = Object.create(null);
    proCampaign.checkpoint = { id: heroSpec && heroSpec.id ? heroSpec.id : 'inicio', x: hx, y: hy };
    proCampaign.progress.stageId = id; proCampaign.progress.checkpointId = proCampaign.checkpoint.id;
    proCampaign.progress.checkpointX = hx; proCampaign.progress.checkpointY = hy;
    var settings = proPlainObject(proCampaign.progress.settings) ? proCampaign.progress.settings : {};
    proCampaign.volume = Math.max(0, Math.min(1, num(settings.volume, 1)));
    proCampaign.reducedMotion = settings.reducedMotion === true;
    proCampaign.highContrast = settings.highContrast === true;
    cameraFollow(proCampaign.hero, stage.width * 16, stage.height * 16);
    proEmitCampaign('fase', { stageId: id, reason: reason || 'start' });
    return true;
  }
  function startCampaign(stageId) {
    if (!proCampaign.id || !proCampaign.stages[proCampaign.firstStage]) { warn('a aventura ainda não tem uma primeira fase válida'); return false; }
    if (!proCampaign.progress) proCampaign.progress = proNewProgress();
    enableFixedSimulation({ seed: proCampaign.seed, maxCatchUpSteps: 5 });
    return proLoadStage(stageId || proCampaign.progress.stageId || proCampaign.firstStage, 'start');
  }
  function proQueueStage(stageId, reason) {
    var id = proSafeId(stageId);
    if (!proCampaign.stages[id] || proCampaign.transition) return false;
    if (proCampaign.reducedMotion) {
      var loadedNow = proLoadStage(id, reason);
      if (loadedNow) saveCampaign(proCampaign.activeSlot);
      return loadedNow;
    }
    proCampaign.transition = { stageId: id, reason: reason, phase: 'out', elapsed: 0, duration: 0.18 };
    return true;
  }
  function proStepTransition(dt) {
    var transition = proCampaign.transition;
    if (!transition) return false;
    transition.elapsed += dt;
    if (transition.phase === 'out' && transition.elapsed >= transition.duration) {
      var loaded = proLoadStage(transition.stageId, transition.reason);
      if (!loaded) { proCampaign.transition = null; return false; }
      transition.phase = 'in'; transition.elapsed = 0; proCampaign.transition = transition;
      saveCampaign(proCampaign.activeSlot);
    } else if (transition.phase === 'in' && transition.elapsed >= transition.duration) proCampaign.transition = null;
    return true;
  }
  function goToStage(stageId) { return proQueueStage(stageId, 'go'); }
  function warpToStage(stageId) {
    var id = proSafeId(stageId);
    if (!proCampaign.stages[id] || !proCampaign.progress) return false;
    if (proCampaign.progress.secrets.indexOf(id) === -1) proCampaign.progress.secrets.push(id);
    saveCampaign(proCampaign.activeSlot);
    return proQueueStage(id, 'warp');
  }
  function nextStage() {
    if (!proCampaign.stage) return false;
    var next = proCampaign.stage.nextStage;
    if (!next) {
      var complete = proCampaign.progress.gems.length >= proCampaign.requiredGems;
      if (complete) proCampaign.progress.journey = 2;
      saveCampaign(proCampaign.activeSlot); setState('vitoria'); proEmitCampaign('fim', { complete: complete, journey: proCampaign.progress.journey }); return true;
    }
    saveCampaign(proCampaign.activeSlot);
    return proQueueStage(next, 'next');
  }
  function setCampaignCheckpoint(id, x, y) {
    if (!proCampaign.progress) return;
    var key = proSafeId(id); if (!key) return;
    proCampaign.checkpoint = { id: key, x: num(x, 0) * 16, y: num(y, 0) * 16 };
    proCampaign.progress.checkpointId = key; proCampaign.progress.checkpointX = proCampaign.checkpoint.x; proCampaign.progress.checkpointY = proCampaign.checkpoint.y;
    saveCampaign(proCampaign.activeSlot); proEmitCampaign('checkpoint', { id: key });
  }
  function restartAtCheckpoint() {
    if (!proCampaign.hero || !proCampaign.checkpoint) return false;
    placeCharacterAt(proCampaign.hero, proCampaign.checkpoint.x, proCampaign.checkpoint.y);
    proCampaign.hero._proPrevX = proCampaign.checkpoint.x; proCampaign.hero._proPrevY = proCampaign.checkpoint.y;
    proCampaign.hero.vx = 0; proCampaign.hero.vy = 0; return true;
  }
  function proCurrentPlayer() {
    if (!proCampaign.progress) return null;
    return proCampaign.progress.players[proCampaign.progress.activePlayer - 1] || null;
  }
  function setHeroForm(form) {
    var player = proCurrentPlayer(); if (!player) return;
    var next = text(form, 'pequeno');
    if (next !== 'pequeno' && next !== 'forte' && next !== 'invencivel') next = 'pequeno';
    player.form = next; if (next === 'invencivel' && proCampaign.hero) proCampaign.hero._proInvincible = 10;
  }
  function heroForm() { var player = proCurrentPlayer(); return player ? player.form : 'pequeno'; }
  function hurtHeroForm() {
    var player = proCurrentPlayer(); if (!player || !proCampaign.hero || proCampaign.hero._proInvincible > 0) return false;
    if (player.form === 'invencivel' || player.form === 'forte') { player.form = 'pequeno'; proCampaign.hero._proInvincible = 1.5; return true; }
    player.lives -= 1;
    if (player.lives <= 0) {
      var nextIndex = proCampaign.progress.activePlayer % proCampaign.progress.players.length;
      var nextPlayer = proCampaign.progress.players[nextIndex];
      if (nextPlayer && nextPlayer.lives > 0) { proCampaign.progress.activePlayer = nextIndex + 1; restartAtCheckpoint(); }
      else setState('fim');
    } else restartAtCheckpoint();
    return true;
  }
  function proTileCharAt(x, y) {
    if (!proCampaign.stage) return '.';
    var c = Math.floor(x / 16); var r = Math.floor(y / 16);
    if (r < 0 || r >= proCampaign.stage.tiles.length || c < 0 || c >= proCampaign.stage.width) return '.';
    return proCampaign.stage.tiles[r].charAt(c);
  }
  function proSetTileChar(column, row, tile) {
    if (!proCampaign.stage || PRO_TILE_INDEX[tile] == null) return false;
    if (row < 0 || row >= proCampaign.stage.height || column < 0 || column >= proCampaign.stage.width) return false;
    var source = proCampaign.stage.tiles[row];
    proCampaign.stage.tiles[row] = source.slice(0, column) + tile + source.slice(column + 1);
    var map = tilemaps[proCampaign.mapKey];
    if (map && map.rows[row]) map.rows[row][column] = PRO_TILE_INDEX[tile];
    return true;
  }
  function proBumpTile(hero, wasMovingUp) {
    if (!wasMovingUp || num(hero.vy, 0) !== 0) return;
    var column = Math.floor(centerX(hero) / 16); var row = Math.floor((hero.y - 1) / 16);
    var tile = proCampaign.stage && proCampaign.stage.tiles[row] ? proCampaign.stage.tiles[row].charAt(column) : '.';
    if (tile === '?' && proSetTileChar(column, row, '.')) {
      proCampaign.progress.coins += 1; var player = proCurrentPlayer(); if (player) player.score += 100;
      proEmitCampaign('bloco', { kind: 'surpresa', column: column, row: row });
    } else if (tile === 'B' && heroForm() !== 'pequeno' && proSetTileChar(column, row, '.')) {
      var player2 = proCurrentPlayer(); if (player2) player2.score += 50;
      proEmitCampaign('bloco', { kind: 'quebrado', column: column, row: row });
    }
  }
  function proEntityTouchesHero(entity) {
    var hero = proCampaign.hero;
    return hero && entity.active && hero.x < entity.x + entity.w && hero.x + hero.w > entity.x && hero.y < entity.y + entity.h && hero.y + hero.h > entity.y;
  }
  function proCollect(entity) {
    entity.active = false; var player = proCurrentPlayer();
    if (entity.kind === 'coin') { proCampaign.progress.coins += 1; if (player) player.score += 100; }
    if (entity.kind === 'gem' && !proGemWasCollected(proCampaign.stageId, entity.id)) { proCampaign.progress.gems.push(proCampaignEntityKey(proCampaign.stageId, entity.id)); if (player) player.score += 1000; }
    proEmitCampaign('coleta', { kind: entity.kind, id: entity.id });
  }
  function proStepCampaignEntity(entity, dt) {
    if (!entity.active) return;
    entity.prevX = entity.x; entity.prevY = entity.y;
    entity.timer += dt;
    if (entity.kind === 'walker' || entity.kind === 'spiky' || entity.kind === 'shell') {
      var speed = entity.kind === 'shell' && entity.phase === 2 ? 130 : Math.max(18, num(entity.props.speed, 30));
      entity.x += entity.direction * speed * dt;
      var aheadX = entity.direction < 0 ? entity.x - 1 : entity.x + entity.w + 1;
      if (proTileCharAt(aheadX, entity.y + entity.h / 2) === '#' || proTileCharAt(aheadX, entity.y + entity.h + 2) === '.') entity.direction *= -1;
    } else if (entity.kind === 'flyer') {
      entity.x = entity.startX + Math.sin(entity.timer * Math.max(1, num(entity.props.speed, 2))) * Math.max(16, num(entity.props.range, 48));
      entity.y = entity.startY + Math.sin(entity.timer * 3) * 8;
    } else if (entity.kind === 'movingPlatform') {
      var range = Math.max(16, num(entity.props.range, 64)); var speed2 = Math.max(0.2, num(entity.props.speed, 1));
      entity.x = entity.startX + Math.sin(entity.timer * speed2) * range;
      var heroOnPlatform = proCampaign.hero;
      if (heroOnPlatform) {
        var oldTop = entity.prevY;
        var feet = heroOnPlatform.y + heroOnPlatform.h;
        var overlaps = heroOnPlatform.x + heroOnPlatform.w > entity.prevX && heroOnPlatform.x < entity.prevX + entity.w;
        if (num(heroOnPlatform.vy, 0) >= 0 && Math.abs(feet - oldTop) <= 4 && overlaps) {
          heroOnPlatform.x += entity.x - entity.prevX; heroOnPlatform.y += entity.y - entity.prevY;
          heroOnPlatform.onGround = true; heroOnPlatform.vy = 0;
        }
      }
    } else if (entity.kind === 'boss') {
      var ratio = entity.health / Math.max(1, num(entity.props.health, 6));
      entity.phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
      var bossSpeed = Math.max(0.2, num(entity.props.speed, 1));
      var bossRange = Math.max(16, num(entity.props.range, 30));
      entity.x = entity.startX + Math.sin(entity.timer * bossSpeed * entity.phase) * (bossRange + (entity.phase - 1) * 10);
      entity.y = entity.startY + Math.abs(Math.sin(entity.timer * 1.5)) * -16 * entity.phase;
    }
    if (!proEntityTouchesHero(entity)) return;
    if (entity.kind === 'coin' || entity.kind === 'gem') { proCollect(entity); return; }
    if (entity.kind === 'powerup') { setHeroForm(entity.variant === 'invencivel' ? 'invencivel' : 'forte'); proCollect(entity); return; }
    if (entity.kind === 'checkpoint') { setCampaignCheckpoint(entity.id || 'checkpoint', entity.x / 16, entity.y / 16); entity.active = false; return; }
    if (entity.kind === 'exit') {
      var bossAlive = false;
      if (entity.props.requiresBoss === true) for (var bi = 0; bi < proCampaign.entities.length; bi++) if (proCampaign.entities[bi].kind === 'boss' && proCampaign.entities[bi].active) bossAlive = true;
      if (bossAlive) { proCampaign.hero.x = Math.min(proCampaign.hero.x, entity.x - proCampaign.hero.w); proEmitCampaign('saida-bloqueada', { boss: true }); return; }
      nextStage(); return;
    }
    if (entity.kind === 'secretExit' || entity.kind === 'portal') { if (proCampaign.stage.secretStage) warpToStage(proCampaign.stage.secretStage); return; }
    if (entity.kind === 'walker' || entity.kind === 'flyer' || entity.kind === 'shell' || entity.kind === 'boss') {
      var hero = proCampaign.hero;
      var stomp = hero.vy > 0 && hero.y + hero.h - entity.y < 9;
      if (heroForm() === 'invencivel') { entity.active = false; return; }
      if (stomp && entity.kind !== 'spiky') {
        hero.vy = -180;
        if (entity.kind === 'boss') { entity.health -= 1; if (entity.health <= 0) { entity.active = false; proEmitCampaign('guardiao', { id: entity.id }); } }
        else if (entity.kind === 'shell' && entity.phase === 1) { entity.phase = 2; entity.direction = hero.x < entity.x ? 1 : -1; }
        else entity.active = false;
      } else hurtHeroForm();
    }
  }
  function stepCampaign(dt) {
    if (!proCampaign.active || !proCampaign.stage || !proCampaign.hero || state !== 'jogando') return;
    if (proStepTransition(dt)) return;
    var hero = proCampaign.hero; proCampaign.elapsed += dt;
    hero._proPrevX = hero.x; hero._proPrevY = hero.y;
    hero._proInvincible = Math.max(0, num(hero._proInvincible, 0) - dt);
    hero._proCoyote = hero.onGround ? 0.1 : Math.max(0, num(hero._proCoyote, 0) - dt);
    if (proActionPressed.pular) hero._proBuffer = 0.1; else hero._proBuffer = Math.max(0, num(hero._proBuffer, 0) - dt);
    var inWater = proTileCharAt(centerX(hero), centerY(hero)) === '~';
    var onLadder = proTileCharAt(centerX(hero), centerY(hero)) === 'H';
    var direction = (proActionDown.direita ? 1 : 0) - (proActionDown.esquerda ? 1 : 0);
    var speed = (proActionDown.correr ? 118 : 82) * (inWater ? 0.6 : 1);
    hero.vx = direction * speed;
    if (onLadder && (proActionDown.cima || proActionDown.baixo)) hero.vy = ((proActionDown.baixo ? 1 : 0) - (proActionDown.cima ? 1 : 0)) * 62;
    else {
      applyGravity(hero, inWater ? 180 : 520, dt);
      if (hero._proBuffer > 0 && (hero.onGround || hero._proCoyote > 0 || inWater)) { hero.vy = inWater ? -120 : -205; hero.onGround = false; hero._proBuffer = 0; hero._proCoyote = 0; }
      if (!proActionDown.pular && hero.vy < -85) hero.vy = -85;
    }
    var wasMovingUp = num(hero.vy, 0) < 0;
    moveByVelocity(hero, dt); collideTilemap(hero, proCampaign.mapKey); proBumpTile(hero, wasMovingUp);
    var material = proTileCharAt(centerX(hero), centerY(hero));
    if (material === '^' || hero.y > proCampaign.stage.height * 16 + 32) hurtHeroForm();
    for (var i = 0; i < proCampaign.entities.length; i++) proStepCampaignEntity(proCampaign.entities[i], dt);
    for (var ti = 0; ti < proCampaign.stage.triggers.length; ti++) {
      var trigger = proCampaign.stage.triggers[ti];
      var tx = trigger.x * 16, ty = trigger.y * 16, tw = trigger.w * 16, th = trigger.h * 16;
      var triggerKey = ti + ':' + trigger.kind;
      if (!proCampaign.triggered[triggerKey] && hero.x < tx + tw && hero.x + hero.w > tx && hero.y < ty + th && hero.y + hero.h > ty) { proCampaign.triggered[triggerKey] = true; proEmitCampaign(trigger.kind, trigger); }
    }
    if (proCampaign.stage.timeLimit > 0 && proCampaign.elapsed >= proCampaign.stage.timeLimit) { proCampaign.elapsed = 0; hurtHeroForm(); }
  }
  function proThemeColors(theme) {
    var themes = {
      campo: ['#5cc8ff', '#9ee56b', '#6f4b2b'], caverna: ['#17162b', '#6f5b88', '#392f4f'],
      agua: ['#36a9e1', '#5eead4', '#175b8a'], neve: ['#bde9ff', '#ffffff', '#6687a3'],
      deserto: ['#ffd166', '#e8a84f', '#8a5636'], castelo: ['#241d35', '#8c6f9d', '#3f334d'],
      ceu: ['#77d9ff', '#ffffff', '#7599c9'], vulcao: ['#3a1520', '#ff6b35', '#5a2a2a']
    };
    return themes[theme] || themes.campo;
  }
  function proDrawTile(ch, x, y, colors) {
    if (ch === '.') return;
    if (ch === '~') { ctx2d.fillStyle = 'rgba(40,180,235,.72)'; ctx2d.fillRect(x, y + 4, 16, 12); return; }
    if (ch === 'H') { ctx2d.strokeStyle = '#d8a15d'; ctx2d.lineWidth = 2; ctx2d.strokeRect(x + 4, y, 8, 16); ctx2d.beginPath(); ctx2d.moveTo(x + 4, y + 5); ctx2d.lineTo(x + 12, y + 5); ctx2d.moveTo(x + 4, y + 11); ctx2d.lineTo(x + 12, y + 11); ctx2d.stroke(); return; }
    ctx2d.fillStyle = ch === '^' ? '#f04d4d' : ch === '=' ? '#c68a4a' : ch === '?' ? '#f7c948' : ch === 'B' ? '#b56a3b' : colors[2];
    if (ch === '^') { ctx2d.beginPath(); ctx2d.moveTo(x, y + 16); ctx2d.lineTo(x + 8, y); ctx2d.lineTo(x + 16, y + 16); ctx2d.fill(); return; }
    ctx2d.fillRect(x, ch === '=' ? y + 10 : y, 16, ch === '=' ? 6 : 16);
    ctx2d.fillStyle = 'rgba(255,255,255,.18)'; ctx2d.fillRect(x + 1, ch === '=' ? y + 10 : y + 1, 14, 2);
    // ⚠️ O setter de ctx.font NÃO resolve custom property: 'bold 12px var(--sz-game-ui-font)'
    // é descartado em silêncio e o texto sai na fonte ANTERIOR. Quem tem o nome
    // resolvido da família é o _szGameUIFont, como nos outros 20 sites do runtime.
    if (ch === '?') { ctx2d.fillStyle = '#6b4d16'; ctx2d.font = 'bold 12px ' + _szGameUIFont; ctx2d.fillText('?', x + 5, y + 13); }
  }
  function proDrawEntity(entity) {
    if (!entity.active) return;
    var alpha = proSim.enabled ? proSim.alpha : 1;
    var x = num(entity.prevX, entity.x) + (entity.x - num(entity.prevX, entity.x)) * alpha;
    var y = num(entity.prevY, entity.y) + (entity.y - num(entity.prevY, entity.y)) * alpha;
    if (entity.kind === 'coin') { ctx2d.fillStyle = '#ffd84a'; ctx2d.beginPath(); ctx2d.ellipse(x + 5, y + 5, 3, 5, 0, 0, Math.PI * 2); ctx2d.fill(); return; }
    if (entity.kind === 'gem') { ctx2d.fillStyle = '#66f5ff'; ctx2d.beginPath(); ctx2d.moveTo(x + 5, y); ctx2d.lineTo(x + 10, y + 5); ctx2d.lineTo(x + 5, y + 10); ctx2d.lineTo(x, y + 5); ctx2d.fill(); return; }
    if (entity.kind === 'checkpoint') { ctx2d.fillStyle = '#ececec'; ctx2d.fillRect(x + 2, y - 8, 2, 22); ctx2d.fillStyle = '#55e37b'; ctx2d.fillRect(x + 4, y - 7, 10, 7); return; }
    if (entity.kind === 'exit' || entity.kind === 'secretExit' || entity.kind === 'portal') { ctx2d.strokeStyle = entity.kind === 'secretExit' ? '#b96cff' : '#63f5ad'; ctx2d.lineWidth = 3; ctx2d.strokeRect(x + 1, y - 10, 12, 24); return; }
    if (entity.kind === 'movingPlatform') { ctx2d.fillStyle = '#c7925b'; ctx2d.fillRect(x, y + 8, 28, 6); return; }
    if (entity.kind === 'powerup') { ctx2d.fillStyle = entity.variant === 'invencivel' ? '#ff77d5' : '#ff4d55'; ctx2d.beginPath(); ctx2d.arc(x + 7, y + 7, 7, Math.PI, 0); ctx2d.fill(); ctx2d.fillStyle = '#f7e6c5'; ctx2d.fillRect(x + 3, y + 7, 8, 7); return; }
    ctx2d.fillStyle = entity.kind === 'boss' ? '#8e3b9c' : entity.kind === 'spiky' ? '#cf4454' : entity.kind === 'flyer' ? '#5b73d6' : '#7a4c2a';
    ctx2d.fillRect(x, y + 3, entity.kind === 'boss' ? 24 : 14, entity.kind === 'boss' ? 22 : 11);
    ctx2d.fillStyle = '#ffffff'; ctx2d.fillRect(x + 3, y + 5, 2, 2); ctx2d.fillRect(x + 9, y + 5, 2, 2);
  }
  function drawCampaign() {
    if (!ctx2d || !proCampaign.active || !proCampaign.stage) return;
    var colors = proThemeColors(proCampaign.stage.theme);
    ctx2d.fillStyle = colors[0]; ctx2d.fillRect(camera.x, camera.y, config.w, config.h);
    ctx2d.fillStyle = colors[1];
    for (var hill = 0; hill < 8; hill++) { var hx = Math.floor(camera.x / 96) * 96 + hill * 96; ctx2d.beginPath(); ctx2d.arc(hx, proCampaign.stage.height * 16 - 12, 46, Math.PI, 0); ctx2d.fill(); }
    var firstCol = Math.max(0, Math.floor(camera.x / 16) - 1); var lastCol = Math.min(proCampaign.stage.width - 1, Math.ceil((camera.x + config.w) / 16) + 1);
    var firstRow = Math.max(0, Math.floor(camera.y / 16) - 1); var lastRow = Math.min(proCampaign.stage.height - 1, Math.ceil((camera.y + config.h) / 16) + 1);
    for (var r = firstRow; r <= lastRow; r++) for (var c = firstCol; c <= lastCol; c++) proDrawTile(proCampaign.stage.tiles[r].charAt(c), c * 16, r * 16, colors);
    for (var i = 0; i < proCampaign.entities.length; i++) proDrawEntity(proCampaign.entities[i]);
    var hero = proCampaign.hero;
    if (hero) {
      var alpha = proSim.enabled ? proSim.alpha : 1;
      var heroX = num(hero._proPrevX, hero.x) + (hero.x - num(hero._proPrevX, hero.x)) * alpha;
      var heroY = num(hero._proPrevY, hero.y) + (hero.y - num(hero._proPrevY, hero.y)) * alpha;
      var blink = hero._proInvincible > 0 && Math.floor(hero._proInvincible * 12) % 2 === 0;
      if (!blink) {
        ctx2d.fillStyle = heroForm() === 'forte' ? '#ff5b55' : heroForm() === 'invencivel' ? '#ff77d5' : '#29b6d8';
        ctx2d.fillRect(heroX + 2, heroY, 8, 5); ctx2d.fillRect(heroX, heroY + 5, 12, 8);
        ctx2d.fillStyle = '#f5d3b3'; ctx2d.fillRect(heroX + 3, heroY + 3, 7, 5);
        ctx2d.fillStyle = '#283044'; ctx2d.fillRect(heroX + 8, heroY + 4, 1, 1);
      }
    }
  }
  function drawCampaignHud() {
    if (!ctx2d || !proCampaign.active || !proCampaign.progress) return;
    var player = proCurrentPlayer();
    ctx2d.save(); ctx2d.fillStyle = proCampaign.highContrast ? '#000000' : 'rgba(10,18,35,.72)'; ctx2d.fillRect(4, 4, 248, 18);
    ctx2d.fillStyle = '#ffffff'; ctx2d.font = 'bold 9px ' + _szGameUIFont;
    ctx2d.fillText('MUNDO ' + proCampaign.stage.world + '  FASE ' + proCampaign.stage.order, 9, 16);
    ctx2d.fillText('P' + proCampaign.progress.activePlayer + ' ×' + (player ? player.lives : 0), 105, 16);
    ctx2d.fillText('MOEDAS ' + proCampaign.progress.coins, 154, 16); ctx2d.fillText('◆' + proCampaign.progress.gems.length, 222, 16); ctx2d.restore();
    if (proCampaign.transition) {
      var transition = proCampaign.transition; var progress = Math.min(1, transition.elapsed / transition.duration);
      var opacity = transition.phase === 'out' ? progress : 1 - progress;
      ctx2d.save(); ctx2d.globalAlpha = opacity; ctx2d.fillStyle = '#05070d'; ctx2d.fillRect(0, 0, config.w, config.h); ctx2d.restore();
    }
  }
${gameKitCampaignPersistenceRuntime}
  function resetCampaignProject() {
    fixedHooks.length = 0; proCampaign.listeners = Object.create(null); proCampaign.eventName = ''; proCampaign.eventPayload = null; proCampaign.stages = Object.create(null); proCampaign.stageOrder.length = 0; proCampaign.active = false; proCampaign.stage = null; proCampaign.stageId = ''; proCampaign.progress = null; proReleaseCampaignEntities(); proReplayRecording = null; proReplayPlaying = null; proLastReplay = null; proReleaseAllActions();
  }
  function resetCampaignGame() {
    proSim.accumulator = 0; proSim.tick = 0; proSim.alpha = 0; proSim.droppedSeconds = 0; proSim.randomState = proSim.seed; proReplayRecording = null; proReplayPlaying = null;
    if (proCampaign.id && proCampaign.stages[proCampaign.firstStage]) { proCampaign.progress = proNewProgress(); proLoadStage(proCampaign.firstStage, 'restart'); }
  }
`
