/** Saves íntegros, gravação compacta e reprodução determinística da campanha. */
export const gameKitCampaignPersistenceRuntime = `
  var proReplayRecording = null;
  var proReplayPlaying = null;
  var proReplayRunIndex = 0;
  var proReplayRunTick = 0;
  var proReplayPlaybackTick = 0;
  var proReplayLastError = '';
  var proLastReplay = null;

  function proHashString(value) {
    var hash = 2166136261;
    var input = String(value);
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    var out = (hash >>> 0).toString(16);
    return ('00000000' + out).slice(-8);
  }
  function proStableStringify(value) {
    if (value == null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
      var items = [];
      for (var ai = 0; ai < value.length; ai++) items.push(proStableStringify(value[ai]));
      return '[' + items.join(',') + ']';
    }
    var keysSorted = Object.keys(value).sort();
    var pairs = [];
    for (var oi = 0; oi < keysSorted.length; oi++) {
      var key = keysSorted[oi];
      if (value[key] !== undefined) pairs.push(JSON.stringify(key) + ':' + proStableStringify(value[key]));
    }
    return '{' + pairs.join(',') + '}';
  }
  function proReplayMask() {
    if (!proReplayPlaying) return -1;
    var runs = proReplayPlaying.runs;
    if (proReplayRunIndex >= runs.length) { proReplayPlaying = null; return 0; }
    var run = runs[proReplayRunIndex];
    var mask = run.mask >>> 0;
    proReplayRunTick += 1;
    proReplayPlaybackTick += 1;
    if (proReplayRunTick >= run.ticks) { proReplayRunIndex += 1; proReplayRunTick = 0; }
    return mask;
  }
  function proCampaignSnapshot() {
    var hero = proCampaign.hero;
    return { tick: proSim.tick, random: proSim.randomState, stage: proCampaign.stageId, x: hero ? Math.round(hero.x * 1024) : 0, y: hero ? Math.round(hero.y * 1024) : 0, vx: hero ? Math.round(num(hero.vx, 0) * 1024) : 0, vy: hero ? Math.round(num(hero.vy, 0) * 1024) : 0, progress: proCampaign.progress };
  }
  function replayHash() { return proHashString(proStableStringify(proCampaignSnapshot())); }
  function proReplayCheckpointHash(tick) {
    var snapshot = proCampaignSnapshot(); snapshot.tick = tick;
    return proHashString(proStableStringify(snapshot));
  }
  function professionalBeforeSimulationStep() {
    proSim.tick += 1; sampleProfessionalActions(); stepCampaign(proSim.step);
    if (proReplayRecording) {
      var mask = proActionMask(); var runs = proReplayRecording.runs; var last = runs[runs.length - 1];
      if (last && last.mask === mask) last.ticks += 1; else runs.push({ mask: mask, ticks: 1 });
      proReplayRecording.ticks += 1;
    }
  }
  function professionalAfterSimulationStep() {
    runFixedHooks(proSim.step);
    if (proReplayRecording && proReplayRecording.ticks % 60 === 0) proReplayRecording.checksums.push({ tick: proReplayRecording.ticks, hash: proReplayCheckpointHash(proReplayRecording.ticks) });
    if (proReplayPlaying) {
      var replayCheckpointHash = proReplayCheckpointHash(proReplayPlaybackTick);
      for (var i = 0; i < proReplayPlaying.checksums.length; i++) {
        var expected = proReplayPlaying.checksums[i];
        if (expected.tick === proReplayPlaybackTick && expected.hash !== replayCheckpointHash) {
          proReplayLastError = 'tick ' + proReplayPlaybackTick + ': esperado ' + expected.hash + ', recebido ' + replayCheckpointHash;
          warn('a repetição divergiu no ' + proReplayLastError); proReplayPlaying = null; break;
        }
      }
    }
  }
  function startReplayRecording() {
    proReplayPlaying = null;
    if (proCampaign.active && proCampaign.progress && proCampaign.checkpoint) {
      var checkpointBeforeReplay = { id: proCampaign.checkpoint.id, x: proCampaign.checkpoint.x, y: proCampaign.checkpoint.y };
      proLoadStage(proCampaign.stageId, 'replay-record'); proCampaign.checkpoint = checkpointBeforeReplay;
      proCampaign.progress.checkpointId = checkpointBeforeReplay.id; proCampaign.progress.checkpointX = checkpointBeforeReplay.x; proCampaign.progress.checkpointY = checkpointBeforeReplay.y;
      restartAtCheckpoint(); proCampaign.elapsed = 0;
    }
    var hero = proCampaign.hero; var checkpoint = proCampaign.checkpoint || { id: 'inicio', x: hero ? hero.x : 0, y: hero ? hero.y : 0 };
    var initial = proCampaign.active && proCampaign.progress ? { progress: proSavePayload(), hero: { x: hero ? hero.x : 0, y: hero ? hero.y : 0, vx: hero ? num(hero.vx, 0) : 0, vy: hero ? num(hero.vy, 0) : 0 }, checkpoint: { id: checkpoint.id, x: checkpoint.x, y: checkpoint.y }, elapsed: proCampaign.elapsed, randomState: proSim.randomState } : null;
    proReplayRecording = { schemaVersion: 1, campaignVersion: proCampaign.version, seed: proSim.seed, hz: 60, ticks: 0, runs: [], checksums: [], initial: initial };
  }
  function stopReplayRecording() {
    var replay = proReplayRecording; proReplayRecording = null;
    if (replay) proLastReplay = replay;
    return replay;
  }
  function proCleanReplayInitial(value) {
    if (!proPlainObject(value) || !proObjectHasOnlyKeys(value, ['progress', 'hero', 'checkpoint', 'elapsed', 'randomState'])) return null;
    var progress = proCleanChecksummedSave(value.progress);
    if (!progress || progress.campaignVersion !== proCampaign.version || !proCampaign.stages[progress.stageId]) return null;
    if (!proPlainObject(value.hero) || !proObjectHasOnlyKeys(value.hero, ['x', 'y', 'vx', 'vy']) || typeof value.hero.x !== 'number' || !isFinite(value.hero.x) || typeof value.hero.y !== 'number' || !isFinite(value.hero.y) || typeof value.hero.vx !== 'number' || !isFinite(value.hero.vx) || typeof value.hero.vy !== 'number' || !isFinite(value.hero.vy)) return null;
    if (!proPlainObject(value.checkpoint) || !proObjectHasOnlyKeys(value.checkpoint, ['id', 'x', 'y']) || !proSafeId(value.checkpoint.id) || typeof value.checkpoint.x !== 'number' || !isFinite(value.checkpoint.x) || typeof value.checkpoint.y !== 'number' || !isFinite(value.checkpoint.y)) return null;
    if (typeof value.elapsed !== 'number' || !isFinite(value.elapsed) || value.elapsed < 0 || value.elapsed > 3600 || !Number.isInteger(value.randomState) || value.randomState < 1 || value.randomState > 4294967295) return null;
    return { progress: progress, hero: { x: value.hero.x, y: value.hero.y, vx: value.hero.vx, vy: value.hero.vy }, checkpoint: { id: value.checkpoint.id, x: value.checkpoint.x, y: value.checkpoint.y }, elapsed: value.elapsed, randomState: value.randomState };
  }
  function proCleanReplay(replay) {
    if (!proPlainObject(replay) || !proObjectHasOnlyKeys(replay, ['schemaVersion', 'campaignVersion', 'seed', 'hz', 'ticks', 'runs', 'checksums', 'initial']) || replay.schemaVersion !== 1 || replay.campaignVersion !== proCampaign.version || replay.hz !== 60 || !Number.isInteger(replay.seed) || replay.seed < 1 || replay.seed > 4294967295 || !Number.isInteger(replay.ticks) || replay.ticks < 0 || replay.ticks > 432000) return null;
    if (!Array.isArray(replay.runs) || replay.runs.length > 100000 || !Array.isArray(replay.checksums) || replay.checksums.length > 7200) return null;
    var runs = [];
    var total = 0;
    for (var i = 0; i < replay.runs.length; i++) {
      var run = replay.runs[i]; if (!proPlainObject(run) || !proObjectHasOnlyKeys(run, ['mask', 'ticks']) || !Number.isInteger(run.mask) || run.mask < 0 || run.mask > 1023 || !Number.isInteger(run.ticks) || run.ticks < 1 || run.ticks > 7200) return null;
      total += run.ticks; if (total > 432000) return null;
      runs.push({ mask: run.mask, ticks: run.ticks });
    }
    if (total !== replay.ticks) return null;
    var checksums = [];
    for (var ci = 0; ci < replay.checksums.length; ci++) {
      var checksum = replay.checksums[ci];
      if (!proPlainObject(checksum) || !proObjectHasOnlyKeys(checksum, ['tick', 'hash']) || !Number.isInteger(checksum.tick) || checksum.tick < 1 || checksum.tick > replay.ticks || typeof checksum.hash !== 'string' || !/^[0-9a-f]{8}$/.test(checksum.hash)) return null;
      checksums.push({ tick: checksum.tick, hash: checksum.hash });
    }
    var initial = replay.initial === null ? null : proCleanReplayInitial(replay.initial); if (replay.initial !== null && !initial) return null;
    return { schemaVersion: 1, campaignVersion: replay.campaignVersion, seed: replay.seed, hz: 60, ticks: replay.ticks, runs: runs, checksums: checksums, initial: initial };
  }
  function playReplay(replay) {
    var cleaned = proCleanReplay(replay);
    if (!cleaned) { warn('a repetição não é compatível com esta aventura'); return false; }
    proReplayRecording = null; proReplayPlaying = cleaned; proReplayRunIndex = 0; proReplayRunTick = 0; proReplayPlaybackTick = 0; proReplayLastError = '';
    enableFixedSimulation({ seed: cleaned.seed, maxCatchUpSteps: 5 });
    if (cleaned.initial) {
      proCampaign.progress = proProgressFromSave(cleaned.initial.progress); proLoadStage(cleaned.initial.progress.stageId, 'replay');
      proCampaign.checkpoint = cleaned.initial.checkpoint;
      proCampaign.progress.checkpointId = cleaned.initial.checkpoint.id; proCampaign.progress.checkpointX = cleaned.initial.checkpoint.x; proCampaign.progress.checkpointY = cleaned.initial.checkpoint.y;
      placeCharacterAt(proCampaign.hero, cleaned.initial.hero.x, cleaned.initial.hero.y); proCampaign.hero._proPrevX = cleaned.initial.hero.x; proCampaign.hero._proPrevY = cleaned.initial.hero.y;
      proCampaign.hero.vx = cleaned.initial.hero.vx; proCampaign.hero.vy = cleaned.initial.hero.vy; proCampaign.elapsed = cleaned.initial.elapsed; proSim.randomState = cleaned.initial.randomState;
    }
    return true;
  }
  function playLastReplay() { return proLastReplay ? playReplay(proLastReplay) : false; }
  function configureSaveSlots(count) { proCampaign.saveSlots = boundedInteger(count, 3, 1, 3); }
  function proSaveKey(slot) { return 'szgk-campaign:' + proCampaign.id + ':slot:' + slot; }
  function proSavePayload() {
    var progress = proCampaign.progress || proNewProgress();
    var payload = { schemaVersion: 1, campaignVersion: proCampaign.version, stageId: progress.stageId, checkpointId: progress.checkpointId, checkpointX: progress.checkpointX, checkpointY: progress.checkpointY, activePlayer: progress.activePlayer, players: progress.players, coins: progress.coins, gems: progress.gems, secrets: progress.secrets, journey: progress.journey, settings: progress.settings };
    payload.checksum = proHashString(proStableStringify(payload)); return payload;
  }
  function saveCampaign(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); if (!proCampaign.id || !proCampaign.progress) return false;
    try { window.localStorage.setItem(proSaveKey(index), JSON.stringify(proSavePayload())); proCampaign.activeSlot = index; return true; }
    catch (e) { warn('não consegui guardar a aventura: ' + e); return false; }
  }
  function proSafeIdList(value) {
    if (!Array.isArray(value) || value.length > 128) return null;
    var output = [];
    for (var i = 0; i < value.length; i++) {
      var id = proSafeId(value[i]); if (!id) return null;
      if (output.indexOf(id) === -1) output.push(id);
    }
    return output;
  }
  function proCleanSaveData(data) {
    if (!proPlainObject(data) || !proObjectHasOnlyKeys(data, ['schemaVersion', 'campaignVersion', 'stageId', 'checkpointId', 'checkpointX', 'checkpointY', 'activePlayer', 'players', 'coins', 'gems', 'secrets', 'journey', 'settings'])) return null;
    if (data.schemaVersion !== 1 || !Number.isInteger(data.campaignVersion) || data.campaignVersion < 1 || !proSafeId(data.stageId)) return null;
    var checkpointId = data.checkpointId === '' ? '' : proSafeId(data.checkpointId); if (!checkpointId && data.checkpointId !== '') return null;
    if (typeof data.checkpointX !== 'number' || !isFinite(data.checkpointX) || typeof data.checkpointY !== 'number' || !isFinite(data.checkpointY)) return null;
    if (!Array.isArray(data.players) || data.players.length < 1 || data.players.length > 2 || !Number.isInteger(data.activePlayer) || data.activePlayer < 1 || data.activePlayer > data.players.length) return null;
    var players = [];
    for (var pi = 0; pi < data.players.length; pi++) {
      var sourcePlayer = data.players[pi];
      if (!proPlainObject(sourcePlayer) || !proObjectHasOnlyKeys(sourcePlayer, ['lives', 'score', 'form']) || !Number.isInteger(sourcePlayer.lives) || sourcePlayer.lives < 0 || sourcePlayer.lives > 99 || !Number.isInteger(sourcePlayer.score) || sourcePlayer.score < 0 || sourcePlayer.score > 999999999 || sourcePlayer.form !== 'pequeno' && sourcePlayer.form !== 'forte' && sourcePlayer.form !== 'invencivel') return null;
      players.push({ lives: sourcePlayer.lives, score: sourcePlayer.score, form: sourcePlayer.form });
    }
    if (!Number.isInteger(data.coins) || data.coins < 0 || data.coins > 999999 || data.journey !== 1 && data.journey !== 2) return null;
    var gems = proSafeIdList(data.gems); var secrets = proSafeIdList(data.secrets); if (!gems || !secrets) return null;
    if (!proPlainObject(data.settings) || !proObjectHasOnlyKeys(data.settings, ['volume', 'reducedMotion', 'highContrast']) || typeof data.settings.volume !== 'number' || !isFinite(data.settings.volume) || data.settings.volume < 0 || data.settings.volume > 1 || typeof data.settings.reducedMotion !== 'boolean' || typeof data.settings.highContrast !== 'boolean') return null;
    return { schemaVersion: 1, campaignVersion: data.campaignVersion, stageId: data.stageId, checkpointId: checkpointId, checkpointX: data.checkpointX, checkpointY: data.checkpointY, activePlayer: data.activePlayer, players: players, coins: data.coins, gems: gems, secrets: secrets, journey: data.journey, settings: { volume: data.settings.volume, reducedMotion: data.settings.reducedMotion, highContrast: data.settings.highContrast } };
  }
  function proCleanChecksummedSave(data) {
    if (!proPlainObject(data) || !proObjectHasOnlyKeys(data, ['schemaVersion', 'campaignVersion', 'stageId', 'checkpointId', 'checkpointX', 'checkpointY', 'activePlayer', 'players', 'coins', 'gems', 'secrets', 'journey', 'settings', 'checksum']) || typeof data.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(data.checksum)) return null;
    var payload = Object.create(null); var keysList = Object.keys(data);
    for (var i = 0; i < keysList.length; i++) if (keysList[i] !== 'checksum') payload[keysList[i]] = data[keysList[i]];
    if (proHashString(proStableStringify(payload)) !== data.checksum) return null;
    var cleaned = proCleanSaveData(payload); if (!cleaned) return null;
    cleaned.checksum = data.checksum; return cleaned;
  }
  function proProgressFromSave(data) {
    return { stageId: data.stageId, checkpointId: data.checkpointId, checkpointX: data.checkpointX, checkpointY: data.checkpointY, activePlayer: data.activePlayer, players: data.players, coins: data.coins, gems: data.gems, secrets: data.secrets, journey: data.journey, settings: data.settings };
  }
  function proReadSave(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); var raw;
    try { raw = window.localStorage.getItem(proSaveKey(index)); } catch (e) { return { kind: 'corrupt' }; }
    if (raw == null) return { kind: 'empty' };
    try {
      var data = JSON.parse(raw); var cleaned = proCleanChecksummedSave(data); if (!cleaned) return { kind: 'corrupt' };
      return { kind: cleaned.campaignVersion === proCampaign.version ? 'ok' : 'incompatible', data: cleaned };
    } catch (e) { return { kind: 'corrupt' }; }
  }
  function campaignSaveInfo(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); var result = proReadSave(index); var data = result.data;
    return { slot: index, available: result.kind === 'ok' || result.kind === 'incompatible', compatible: result.kind === 'ok', corrupted: result.kind === 'corrupt', stageId: data ? data.stageId : '', journey: data ? boundedInteger(data.journey, 1, 1, 2) : 1 };
  }
  function loadCampaign(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots); var result = proReadSave(index);
    if (result.kind !== 'ok' || !proCampaign.stages[result.data.stageId]) return false;
    var data = result.data;
    proCampaign.progress = proProgressFromSave(data);
    proCampaign.activeSlot = index;
    if (!proLoadStage(data.stageId, 'load')) return false;
    proCampaign.checkpoint = { id: proCampaign.progress.checkpointId || 'inicio', x: proCampaign.progress.checkpointX, y: proCampaign.progress.checkpointY }; restartAtCheckpoint(); return true;
  }
  function deleteCampaignSave(slot) {
    var index = boundedInteger(slot, 1, 1, proCampaign.saveSlots);
    try { window.localStorage.removeItem(proSaveKey(index)); return true; } catch (e) { warn('não consegui apagar o slot: ' + e); return false; }
  }
  function campaignProgress() { return proSavePayload(); }
`
