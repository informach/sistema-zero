import { REINO_ZERO_ULTRA_STAGES } from './reinoZeroUltraData'

const STAGE_JSON_SOURCE = JSON.stringify(JSON.stringify(REINO_ZERO_ULTRA_STAGES))

/**
 * Fonte canônico do motor “na mão”. O gerador transforma cada construção em IR
 * estruturada; este módulo nunca entra no bundle da galeria.
 */
export const REINO_ZERO_ULTRA_SOURCE = `
const canvas = document.getElementById("reino-zero-ultra");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("reino-status");
const announcementEl = document.getElementById("reino-announcement");
const STAGES = JSON.parse(${STAGE_JSON_SOURCE});
const TILE = 32;
const VIEW_W = 960;
const VIEW_H = 540;
const STEP = 1000 / 60;
const GRAVITY = 1550;
const SAVE_KEY = "reino-zero-ultra-save";
const SAVE_BACKUP_KEY = "reino-zero-ultra-save-backup";
const SAVE_CORRUPT_KEY = "reino-zero-ultra-save-corrupt";
const SAVE_NOTICE_KEY = "reino-zero-ultra-save-notice";
const PIXEL_RATIO = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
canvas.width = VIEW_W * PIXEL_RATIO;
canvas.height = VIEW_H * PIXEL_RATIO;
ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
const THEMES = {
  campo: { sky: "#67c8f2", far: "#8ed081", near: "#3f8f4f", ground: "#79513a", accent: "#ffe066" },
  caverna: { sky: "#17162d", far: "#342858", near: "#4b3a68", ground: "#59445f", accent: "#82d9ff" },
  agua: { sky: "#58c8df", far: "#2d9fba", near: "#167a9c", ground: "#71573e", accent: "#b9f6ff" },
  canion: { sky: "#f6bb68", far: "#e7954f", near: "#b96b3e", ground: "#86503a", accent: "#fff1a8" },
  floresta: { sky: "#8fd7ad", far: "#4caa72", near: "#277354", ground: "#654632", accent: "#e9ff8f" },
  gelo: { sky: "#bce9ff", far: "#d9f3ff", near: "#8db7ce", ground: "#6c8291", accent: "#ffffff" },
  vulcao: { sky: "#351a29", far: "#6b2531", near: "#9c382e", ground: "#3b3138", accent: "#ffb347" },
  castelo: { sky: "#16192b", far: "#2a3150", near: "#465273", ground: "#5b6075", accent: "#f4d35e" }
};
let mode = "title";
let stage = STAGES[0];
let stageIndex = 0;
let playerCount = 2;
let playMode = "coop";
let activeTurn = 0;
let turnProfiles = [
  { lives: 5, score: 0, coins: 0, power: "normal" },
  { lives: 5, score: 0, coins: 0, power: "normal" }
];
let players = [];
let actors = [];
let platforms = [];
let shots = [];
let usedTiles = [];
let brokenTiles = [];
let fragileTiles = [];
let cameraX = 0;
let timeLeft = 300;
let score = 0;
let coins = 0;
let stageCoins = 0;
let gems = [];
let lives = 5;
let unlocked = 1;
let checkpointX = 96;
let checkpointY = 320;
let hint = "";
let hintTimer = 0;
let recoveryNotice = "";
let stageClearTimer = 0;
let pendingStage = "";
let replay = [];
let playback = [];
let recordingSnapshot = null;
let playbackSnapshot = null;
let playbackChecksum = 0;
let playbackAt = 0;
let replayMode = false;
let replaySession = null;
let lastTime = 0;
let accumulator = 0;
let musicTimer = 0;
let musicStep = 0;
let seed = 147480;
let touch = { left: false, right: false, jump: false, action: false, start: false };
let previousMenuStart = false;
let previousPause = false;
let previousDelete = false;
let deleteConfirmTimer = 0;
let lastStatus = "";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function announce(message) {
  if (message === "" || announcementEl.textContent === message) return;
  announcementEl.textContent = message;
}

function queueRecoveryNotice(message) {
  recoveryNotice = message;
  localStorage.setItem(SAVE_NOTICE_KEY, message);
}

function clearRecoveryNotice() {
  localStorage.removeItem(SAVE_NOTICE_KEY);
}

function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findStage(id) {
  for (let i = 0; i < STAGES.length; i += 1) {
    if (STAGES[i].id === id) return i;
  }
  return 0;
}

function stageExists(id) {
  for (let i = 0; i < STAGES.length; i += 1) {
    if (STAGES[i].id === id) return true;
  }
  return false;
}

function hasGem(id) {
  const key = stage.id + ":" + id;
  for (let i = 0; i < gems.length; i += 1) {
    if (gems[i] === key || gems[i] === id) return true;
  }
  return false;
}

function collectibleKey(id) {
  return stage.id + ":" + id;
}

function containsText(values, text) {
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] === text) return true;
  }
  return false;
}

function gemKeyExists(key) {
  for (let s = 0; s < STAGES.length; s += 1) {
    const candidate = STAGES[s];
    for (let e = 0; e < candidate.entities.length; e += 1) {
      const entity = candidate.entities[e];
      if (entity.kind === "gem" && candidate.id + ":" + entity.id === key) return true;
    }
  }
  return false;
}

function legacyGemKey(id) {
  for (let s = 0; s < STAGES.length; s += 1) {
    const candidate = STAGES[s];
    for (let e = 0; e < candidate.entities.length; e += 1) {
      const entity = candidate.entities[e];
      if (entity.kind === "gem" && entity.id === id) return candidate.id + ":" + entity.id;
    }
  }
  return "";
}

function normalizeGems(values) {
  const normalized = [];
  if (values == null || values.length !== Math.floor(values.length)) return normalized;
  for (let i = 0; i < values.length; i += 1) {
    if (normalized.length < 8) {
      let key = values[i];
      if (!gemKeyExists(key)) key = legacyGemKey(key);
      if (key !== "" && !containsText(normalized, key)) normalized.push(key);
    }
  }
  return normalized;
}

function safeInteger(value, fallback, min, max) {
  if (value !== Math.floor(value)) return fallback;
  return clamp(value, min, max);
}

function cloneData(value) {
  const text = JSON.stringify(value);
  const copy = JSON.parse(String(text));
  return copy;
}

function simulationSnapshot() {
  return cloneData({
    stageId: stage.id,
    playerCount: playerCount,
    playMode: playMode,
    activeTurn: activeTurn,
    turnProfiles: turnProfiles,
    players: players,
    actors: actors,
    platforms: platforms,
    shots: shots,
    usedTiles: usedTiles,
    brokenTiles: brokenTiles,
    fragileTiles: fragileTiles,
    cameraX: cameraX,
    timeLeft: timeLeft,
    score: score,
    coins: coins,
    stageCoins: stageCoins,
    gems: gems,
    lives: lives,
    unlocked: unlocked,
    checkpointX: checkpointX,
    checkpointY: checkpointY,
    hint: hint,
    hintTimer: hintTimer,
    seed: seed
  });
}

function restoreSimulationSnapshot(snapshot) {
  stageIndex = findStage(snapshot.stageId);
  stage = STAGES[stageIndex];
  playerCount = snapshot.playerCount;
  playMode = snapshot.playMode || "coop";
  activeTurn = snapshot.activeTurn || 0;
  turnProfiles = cloneData(snapshot.turnProfiles || turnProfiles);
  players = cloneData(snapshot.players);
  actors = cloneData(snapshot.actors);
  platforms = cloneData(snapshot.platforms);
  shots = cloneData(snapshot.shots);
  usedTiles = cloneData(snapshot.usedTiles);
  brokenTiles = cloneData(snapshot.brokenTiles);
  fragileTiles = cloneData(snapshot.fragileTiles);
  cameraX = snapshot.cameraX;
  timeLeft = snapshot.timeLeft;
  score = snapshot.score;
  coins = snapshot.coins;
  stageCoins = snapshot.stageCoins;
  gems = cloneData(snapshot.gems);
  lives = snapshot.lives;
  unlocked = snapshot.unlocked;
  checkpointX = snapshot.checkpointX;
  checkpointY = snapshot.checkpointY;
  hint = snapshot.hint;
  hintTimer = snapshot.hintTimer;
  seed = snapshot.seed;
  shots = [];
  playbackAt = 0;
  mode = "playing";
}

function checksumText(content) {
  let checksum = 17;
  for (let i = 0; i < content.length; i += 1) {
    checksum = (checksum * 31 + content.charCodeAt(i)) % 2147483647;
  }
  return checksum;
}

function checksumReplay(snapshot, frames) {
  const content = JSON.stringify({ snapshot: snapshot, frames: frames });
  return checksumText(content);
}

function validReplayFrames(frames) {
  if (frames == null || frames.length !== Math.floor(frames.length) || frames.length === 0 || frames.length > 36000) return false;
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    if (frame === null || frame.length !== Math.floor(frame.length) || frame.length !== 2) return false;
    for (let player = 0; player < frame.length; player += 1) {
      const code = frame[player];
      if (code !== Math.floor(code) || code < 0 || code > 63) return false;
    }
  }
  return true;
}

function validPlayback() {
  return validReplayPayload(playback, playbackSnapshot, playbackChecksum, false);
}

function validReplayPayload(frames, snapshot, checksum, requireSnapshot) {
  if (frames == null || frames.length !== Math.floor(frames.length)) return false;
  if (frames.length === 0) return snapshot === null && checksum === 0;
  if (!validReplayFrames(frames)) return false;
  if (snapshot === null) return !requireSnapshot && checksum === 0;
  if (checksum !== Math.floor(checksum)) return false;
  return checksum === checksumReplay(snapshot, frames);
}

function captureReplaySession(returnMode) {
  replaySession = cloneData({
    mode: returnMode,
    stageId: stage.id,
    playerCount: playerCount,
    playMode: playMode,
    activeTurn: activeTurn,
    turnProfiles: turnProfiles,
    players: players,
    actors: actors,
    platforms: platforms,
    shots: shots,
    usedTiles: usedTiles,
    brokenTiles: brokenTiles,
    fragileTiles: fragileTiles,
    cameraX: cameraX,
    timeLeft: timeLeft,
    score: score,
    coins: coins,
    stageCoins: stageCoins,
    gems: gems,
    lives: lives,
    unlocked: unlocked,
    checkpointX: checkpointX,
    checkpointY: checkpointY,
    hint: hint,
    hintTimer: hintTimer,
    stageClearTimer: stageClearTimer,
    pendingStage: pendingStage,
    replay: replay,
    playback: playback,
    playbackAt: playbackAt,
    seed: seed
  });
}

function finishReplay() {
  const snapshot = replaySession;
  replayMode = false;
  replaySession = null;
  if (snapshot === null) {
    mode = "title";
    return;
  }
  stageIndex = findStage(snapshot.stageId);
  stage = STAGES[stageIndex];
  mode = snapshot.mode;
  playerCount = snapshot.playerCount;
  playMode = snapshot.playMode;
  activeTurn = snapshot.activeTurn;
  turnProfiles = snapshot.turnProfiles;
  players = snapshot.players;
  actors = snapshot.actors;
  platforms = snapshot.platforms;
  shots = snapshot.shots;
  usedTiles = snapshot.usedTiles;
  brokenTiles = snapshot.brokenTiles;
  fragileTiles = snapshot.fragileTiles;
  cameraX = snapshot.cameraX;
  timeLeft = snapshot.timeLeft;
  score = snapshot.score;
  coins = snapshot.coins;
  stageCoins = snapshot.stageCoins;
  gems = snapshot.gems;
  lives = snapshot.lives;
  unlocked = snapshot.unlocked;
  checkpointX = snapshot.checkpointX;
  checkpointY = snapshot.checkpointY;
  hint = snapshot.hint;
  hintTimer = snapshot.hintTimer;
  stageClearTimer = snapshot.stageClearTimer;
  pendingStage = snapshot.pendingStage;
  replay = snapshot.replay;
  playback = snapshot.playback;
  playbackAt = snapshot.playbackAt;
  seed = snapshot.seed;
}

function beginReplay() {
  if (!validPlayback()) return;
  captureReplaySession("title");
  replayMode = true;
  if (playbackSnapshot === null) loadStage(stage.id);
  else restoreSimulationSnapshot(playbackSnapshot);
  __szAudio.tom("triangle", 392, 90, 4);
}

function makePlayer(index, x, y) {
  return {
    index: index,
    x: x,
    y: y,
    w: 24,
    h: 30,
    vx: 0,
    vy: 0,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    prevJump: false,
    prevAction: false,
    facing: 1,
    power: "normal",
    powerTimer: 0,
    life: 3,
    invulnerable: 0,
    active: true
    , swimming: false
    , climbing: false
    , crouching: false
  };
}

function resetTurnProfiles() {
  turnProfiles = [
    { lives: 5, score: 0, coins: 0, power: "normal" },
    { lives: 5, score: 0, coins: 0, power: "normal" }
  ];
  activeTurn = 0;
}

function validTurnProfiles(profiles) {
  if (profiles == null || profiles.length !== 2) return false;
  for (let i = 0; i < profiles.length; i += 1) {
    const profile = profiles[i];
    if (profile == null) return false;
    if (profile.lives !== Math.floor(profile.lives) || profile.lives < 0 || profile.lives > 99) return false;
    if (profile.score !== Math.floor(profile.score) || profile.score < 0 || profile.score > 999999999) return false;
    if (profile.coins !== Math.floor(profile.coins) || profile.coins < 0 || profile.coins > 999999999) return false;
    if (profile.power !== "normal" && profile.power !== "forte" && profile.power !== "fogo" && profile.power !== "estrela") return false;
  }
  return true;
}

function selectPlayMode(nextMode) {
  playMode = nextMode;
  playerCount = nextMode === "solo" ? 1 : 2;
  if (nextMode !== "turns") activeTurn = 0;
}

function syncTurnProfile(player) {
  if (playMode !== "turns") return;
  turnProfiles[activeTurn].lives = lives;
  turnProfiles[activeTurn].score = score;
  turnProfiles[activeTurn].coins = coins;
  turnProfiles[activeTurn].power = player.power === "estrela" ? "normal" : player.power;
}

function restoreTurnProfile() {
  if (playMode !== "turns") return;
  const profile = turnProfiles[activeTurn];
  lives = profile.lives;
  score = profile.score;
  coins = profile.coins;
}

function makeActor(entity) {
  return {
    id: entity.id,
    kind: entity.kind,
    x: entity.x * TILE,
    y: entity.y * TILE,
    originX: entity.x * TILE,
    originY: entity.y * TILE,
    w: entity.kind === "boss" ? 56 : 26,
    h: entity.kind === "boss" ? 58 : 28,
    speed: entity.speed || 42,
    range: entity.range || 72,
    health: entity.health || 1,
    maxHealth: entity.health || 1,
    variant: entity.variant || "",
    targetX: entity.targetX === Math.floor(entity.targetX) ? entity.targetX * TILE : 0,
    targetY: entity.targetY === Math.floor(entity.targetY) ? entity.targetY * TILE : 0,
    direction: entity.x % 2 === 0 ? 1 : -1,
    dead: false,
    phase: random() * 6.28,
    state: entity.kind === "shell" ? "walking" : "active",
    cooldown: 0.4 + random() * 1.2,
    vy: 0
  };
}

function loadStage(id) {
  stageIndex = findStage(id);
  stage = STAGES[stageIndex];
  seed = stage.seed;
  actors = [];
  platforms = [];
  shots = [];
  usedTiles = [];
  brokenTiles = [];
  fragileTiles = [];
  musicTimer = 0;
  musicStep = 0;
  for (let i = 0; i < stage.entities.length; i += 1) {
    const entity = stage.entities[i];
    if (entity.kind !== "gem" || !hasGem(entity.id)) actors.push(makeActor(entity));
  }
  for (let i = 0; i < stage.platforms.length; i += 1) {
    const item = stage.platforms[i];
    platforms.push({
      id: item.id,
      x: item.x * TILE,
      y: item.y * TILE,
      originX: item.x * TILE,
      originY: item.y * TILE,
      w: item.w * TILE,
      h: 12,
      range: item.range * TILE,
      speed: item.speed,
      axis: item.axis,
      phase: random() * 6.28,
      lastX: item.x * TILE,
      lastY: item.y * TILE
    });
  }
  checkpointX = stage.spawn.x * TILE;
  checkpointY = stage.spawn.y * TILE;
  players = [makePlayer(0, checkpointX, checkpointY), makePlayer(1, checkpointX - 28, checkpointY)];
  if (playMode === "solo") players[1].active = false;
  else if (playMode === "coop") players[1].active = true;
  else {
    players[0].active = activeTurn === 0;
    players[1].active = activeTurn === 1;
    players[activeTurn].power = turnProfiles[activeTurn].power;
  }
  cameraX = clamp(checkpointX - VIEW_W * 0.35, 0, stage.width * TILE - VIEW_W);
  timeLeft = stage.timeLimit;
  stageCoins = 0;
  hint = stage.triggers[0].value;
  hintTimer = 5;
  replay = [];
  playbackAt = 0;
  mode = "playing";
  if (!replayMode) recordingSnapshot = simulationSnapshot();
  announce((replayMode ? "Replay. " : "") + "Fase " + stage.id + ". " + hint);
  __szAudio.tom("triangle", 392, 90, 4);
}

function currentSaveData() {
  return {
    stageId: stage.id,
    unlocked: unlocked,
    score: score,
    coins: coins,
    gems: cloneData(gems),
    lives: lives,
    playMode: playMode,
    activeTurn: activeTurn,
    turnProfiles: cloneData(turnProfiles),
    replay: cloneData(playback),
    replaySnapshot: playbackSnapshot === null ? null : cloneData(playbackSnapshot),
    replayChecksum: playbackChecksum
  };
}

function makeSaveEnvelope(data) {
  const content = JSON.stringify(data);
  return { version: 2, data: data, checksum: checksumText(content) };
}

function parseJson(raw) {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed;
  } catch (error) {
    return null;
  }
}

function validSaveData(data) {
  if (data == null || !stageExists(data.stageId)) return false;
  if (data.unlocked !== Math.floor(data.unlocked) || data.unlocked < 1 || data.unlocked > STAGES.length) return false;
  if (data.score !== Math.floor(data.score) || data.score < 0 || data.score > 999999999) return false;
  if (data.coins !== Math.floor(data.coins) || data.coins < 0 || data.coins > 999999999) return false;
  if (data.lives !== Math.floor(data.lives) || data.lives < 0 || data.lives > 99) return false;
  if (data.playMode !== "solo" && data.playMode !== "turns" && data.playMode !== "coop") return false;
  if (data.activeTurn != null && (data.activeTurn !== Math.floor(data.activeTurn) || data.activeTurn < 0 || data.activeTurn > 1)) return false;
  if (data.turnProfiles != null && !validTurnProfiles(data.turnProfiles)) return false;
  if (data.gems == null || data.gems.length !== Math.floor(data.gems.length) || data.gems.length > 8) return false;
  for (let i = 0; i < data.gems.length; i += 1) {
    if (!gemKeyExists(data.gems[i])) return false;
  }
  return validReplayPayload(data.replay, data.replaySnapshot, data.replayChecksum, true);
}

function readSaveEnvelope(raw) {
  const envelope = parseJson(raw);
  if (envelope == null || envelope.version !== 2) return null;
  if (!validSaveData(envelope.data)) return null;
  if (envelope.checksum !== Math.floor(envelope.checksum)) return null;
  const content = JSON.stringify(envelope.data);
  if (envelope.checksum !== checksumText(content)) return null;
  return envelope;
}

function applySaveData(data) {
  stageIndex = findStage(data.stageId);
  stage = STAGES[stageIndex];
  unlocked = data.unlocked;
  score = data.score;
  coins = data.coins;
  gems = cloneData(data.gems);
  lives = data.lives;
  playMode = data.playMode;
  playerCount = playMode === "solo" ? 1 : 2;
  activeTurn = data.activeTurn === 1 ? 1 : 0;
  if (validTurnProfiles(data.turnProfiles)) turnProfiles = cloneData(data.turnProfiles);
  else {
    resetTurnProfiles();
    turnProfiles[0].lives = data.lives;
    turnProfiles[0].score = data.score;
    turnProfiles[0].coins = data.coins;
  }
  if (playMode === "turns") restoreTurnProfile();
  playback = cloneData(data.replay);
  playbackSnapshot = data.replaySnapshot === null ? null : cloneData(data.replaySnapshot);
  playbackChecksum = data.replayChecksum;
  playbackAt = 0;
}

function writeSaveData(data, backupCurrent) {
  const envelope = makeSaveEnvelope(data);
  if (backupCurrent) {
    const currentRaw = localStorage.getItem(SAVE_KEY);
    if (readSaveEnvelope(currentRaw) !== null) localStorage.setItem(SAVE_BACKUP_KEY, currentRaw);
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
}

function migrateLegacySave(value) {
  if (value == null || value.version !== 1) return null;
  let legacyStage = "1-1";
  if (stageExists(value.stageId)) legacyStage = value.stageId;
  const legacyReplay = validReplayPayload(value.replay, value.replaySnapshot, value.replayChecksum, true) ? cloneData(value.replay) : [];
  const legacySnapshot = legacyReplay.length > 0 ? cloneData(value.replaySnapshot) : null;
  const legacyChecksum = legacyReplay.length > 0 ? value.replayChecksum : 0;
  return {
    stageId: legacyStage,
    unlocked: safeInteger(value.unlocked, 1, 1, STAGES.length),
    score: safeInteger(value.score, 0, 0, 999999999),
    coins: safeInteger(value.coins, 0, 0, 999999999),
    gems: normalizeGems(value.gems),
    lives: safeInteger(value.lives, 5, 0, 99),
    playMode: value.playerCount === 1 ? "solo" : "coop",
    activeTurn: 0,
    turnProfiles: [
      { lives: safeInteger(value.lives, 5, 0, 99), score: safeInteger(value.score, 0, 0, 999999999), coins: safeInteger(value.coins, 0, 0, 999999999), power: "normal" },
      { lives: 5, score: 0, coins: 0, power: "normal" }
    ],
    replay: legacyReplay,
    replaySnapshot: legacySnapshot,
    replayChecksum: legacyChecksum
  };
}

function saveGame() {
  if (replayMode) return;
  if (recordingSnapshot !== null && replay.length > 0) {
    playback = cloneData(replay);
    playbackSnapshot = cloneData(recordingSnapshot);
    playbackChecksum = checksumReplay(playbackSnapshot, playback);
  }
  writeSaveData(currentSaveData(), true);
}

function loadSave() {
  const primaryRaw = localStorage.getItem(SAVE_KEY);
  if (primaryRaw === null) return;
  const primary = readSaveEnvelope(primaryRaw);
  if (primary !== null) {
    applySaveData(primary.data);
    return;
  }
  const backupRaw = localStorage.getItem(SAVE_BACKUP_KEY);
  const backup = readSaveEnvelope(backupRaw);
  if (backup !== null) {
    localStorage.setItem(SAVE_CORRUPT_KEY, primaryRaw);
    localStorage.setItem(SAVE_KEY, backupRaw);
    applySaveData(backup.data);
    queueRecoveryNotice("O último progresso válido foi recuperado.");
    return;
  }
  const migrated = migrateLegacySave(parseJson(primaryRaw));
  if (migrated !== null) {
    applySaveData(migrated);
    writeSaveData(migrated, false);
    queueRecoveryNotice("O progresso antigo foi migrado com segurança.");
    return;
  }
  localStorage.setItem(SAVE_CORRUPT_KEY, primaryRaw);
  queueRecoveryNotice("O save estava corrompido. Um progresso novo foi criado.");
  writeSaveData(currentSaveData(), false);
}

function encodeInput(input) {
  return (input.left ? 1 : 0) + (input.right ? 2 : 0) + (input.jump ? 4 : 0) + (input.action ? 8 : 0) + (input.up ? 16 : 0) + (input.down ? 32 : 0);
}

function decodeInput(code) {
  return {
    left: code % 2 >= 1,
    right: Math.floor(code / 2) % 2 >= 1,
    jump: Math.floor(code / 4) % 2 >= 1,
    action: Math.floor(code / 8) % 2 >= 1,
    up: Math.floor(code / 16) % 2 >= 1,
    down: Math.floor(code / 32) % 2 >= 1
  };
}

function readInput(index) {
  if (replayMode && playbackAt < playback.length) {
    const frame = playback[playbackAt] || [0, 0];
    return decodeInput(frame[index] || 0);
  }
  const axis = __szInput.gamepadAxis(index, 0);
  const verticalAxis = __szInput.gamepadAxis(index, 1);
  const padJump = __szInput.gamepadButton(index, 0) > 0.5;
  const padAction = __szInput.gamepadButton(index, 2) > 0.5;
  if (index === 0) {
    return {
      left: __szInput.key("ArrowLeft") || axis < -0.25 || touch.left,
      right: __szInput.key("ArrowRight") || axis > 0.25 || touch.right,
      jump: __szInput.key("x") || __szInput.key("X") || __szInput.key("Space") || padJump || touch.jump,
      action: __szInput.key("z") || __szInput.key("Z") || __szInput.key("Shift") || padAction || touch.action
      , up: __szInput.key("ArrowUp") || verticalAxis < -0.4
      , down: __szInput.key("ArrowDown") || verticalAxis > 0.4
    };
  }
  return {
    left: __szInput.key("a") || __szInput.key("A") || axis < -0.25,
    right: __szInput.key("d") || __szInput.key("D") || axis > 0.25,
    jump: __szInput.key("g") || __szInput.key("G") || padJump,
    action: __szInput.key("f") || __szInput.key("F") || padAction
    , up: __szInput.key("w") || __szInput.key("W") || verticalAxis < -0.4
    , down: __szInput.key("s") || __szInput.key("S") || verticalAxis > 0.4
  };
}

function tileKey(column, row) {
  return column + ":" + row;
}

function tileAt(px, py) {
  const column = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  if (column < 0 || column >= stage.width || row < 0) return "#";
  if (row >= stage.height) return ".";
  const key = tileKey(column, row);
  if (containsText(brokenTiles, key)) return ".";
  const tile = stage.tiles[row].charAt(column);
  if (containsText(usedTiles, key) && (tile === "?" || tile === "B")) return "U";
  return tile;
}

function solidTile(tile) {
  return tile === "#" || tile === "=" || tile === "B" || tile === "?" || tile === "U" || tile === "S" || tile === "F";
}

function useBlock(px, py, player) {
  const column = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  const key = tileKey(column, row);
  const tile = tileAt(px, py);
  if (tile === "?") {
    usedTiles.push(key);
    coins += 1;
    stageCoins += 1;
    score += 100;
    __szAudio.tom("sine", 940, 70, 3);
  } else if (tile === "B") {
    if (player.power === "normal") usedTiles.push(key);
    else brokenTiles.push(key);
    score += 50;
    __szAudio.ruido(55, 2);
  }
}

function startFragileTile(px, py) {
  const column = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  const key = tileKey(column, row);
  for (let i = 0; i < fragileTiles.length; i += 1) if (fragileTiles[i].key === key) return;
  fragileTiles.push({ key: key, timer: 0.55 });
}

function updateFragileTiles(dt) {
  const active = [];
  for (let i = 0; i < fragileTiles.length; i += 1) {
    const fragile = fragileTiles[i];
    fragile.timer -= dt;
    if (fragile.timer <= 0) {
      if (!containsText(brokenTiles, fragile.key)) brokenTiles.push(fragile.key);
      __szAudio.ruido(45, 2);
    } else active.push(fragile);
  }
  fragileTiles = active;
}

function hitsWorld(body) {
  return solidTile(tileAt(body.x + 2, body.y + 2)) ||
    solidTile(tileAt(body.x + body.w - 2, body.y + 2)) ||
    solidTile(tileAt(body.x + 2, body.y + body.h - 2)) ||
    solidTile(tileAt(body.x + body.w - 2, body.y + body.h - 2));
}

function hurtPlayer(player) {
  if (player.invulnerable > 0 || !player.active) return;
  player.life -= 1;
  player.invulnerable = 1.5;
  player.vy = -330;
  player.vx = -player.facing * 210;
  __szAudio.ruido(90, 4);
  if (player.life <= 0) {
    lives -= 1;
    if (playMode === "turns") {
      syncTurnProfile(player);
      const otherTurn = activeTurn === 0 ? 1 : 0;
      if (turnProfiles[otherTurn].lives > 0) activeTurn = otherTurn;
      restoreTurnProfile();
      if (turnProfiles[0].lives <= 0 && turnProfiles[1].lives <= 0) {
        mode = "gameover";
        announce("Fim de jogo para os dois exploradores.");
        saveGame();
      } else {
        mode = "turnswitch";
        stageClearTimer = 0.8;
        pendingStage = stage.id;
        announce("Vez do jogador " + (activeTurn + 1) + ".");
        saveGame();
      }
      return;
    }
    if (lives <= 0) {
      mode = "gameover";
      announce("Fim de jogo.");
      saveGame();
    } else {
      player.life = 3;
      player.power = "normal";
      player.x = checkpointX;
      player.y = checkpointY;
      player.vx = 0;
      player.vy = 0;
    }
  }
}

function movePlayer(player, dx, dy) {
  player.x += dx;
  if (hitsWorld(player)) {
    player.x -= dx;
    player.vx = 0;
  }
  player.grounded = false;
  player.y += dy;
  if (hitsWorld(player)) {
    player.y -= dy;
    if (dy > 0) {
      player.grounded = true;
      const floorTile = tileAt(player.x + player.w * 0.5, player.y + player.h + 2);
      if (floorTile === "S") {
        player.vy = -720;
        player.grounded = false;
        __szAudio.tom("square", 620, 90, 4);
      } else if (floorTile === "F") startFragileTile(player.x + player.w * 0.5, player.y + player.h + 2);
    } else useBlock(player.x + player.w * 0.5, player.y - 2, player);
    if (dy < 0 || player.grounded) player.vy = 0;
  }
  for (let i = 0; i < platforms.length; i += 1) {
    const platform = platforms[i];
    const previousBottom = player.y + player.h;
    const stoodOnPreviousTop = player.vy >= 0 &&
      previousBottom >= platform.lastY - 2 &&
      previousBottom <= platform.lastY + 18 &&
      player.x < platform.lastX + platform.w &&
      player.x + player.w > platform.lastX;
    if (stoodOnPreviousTop) {
      player.x += platform.x - platform.lastX;
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
      continue;
    }
    if (player.vy >= 0 && player.y + player.h >= platform.y && player.y + player.h <= platform.y + 18 && overlaps(player, platform)) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }
}

function fire(player) {
  if (player.power !== "fogo") return;
  shots.push({
    x: player.x + (player.facing > 0 ? player.w : -8),
    y: player.y + 12,
    w: 9,
    h: 9,
    vx: player.facing * 430,
    life: 1.2,
    owner: player.index,
    vy: 0,
    dead: false
  });
  __szAudio.tom("square", 660, 70, 3);
}

function updatePlayer(player, input, dt) {
  if (!player.active) return;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.powerTimer = Math.max(0, player.powerTimer - dt);
  if (player.power === "estrela" && player.powerTimer <= 0) player.power = "normal";
  const centerTile = tileAt(player.x + player.w * 0.5, player.y + player.h * 0.55);
  player.swimming = centerTile === "~";
  player.climbing = centerTile === "H" && (input.up || input.down);
  player.crouching = input.down && player.grounded && !player.climbing;
  player.coyote = player.grounded ? 0.11 : Math.max(0, player.coyote - dt);
  player.jumpBuffer = input.jump && !player.prevJump ? 0.12 : Math.max(0, player.jumpBuffer - dt);
  const running = input.action && player.power !== "fogo";
  const maxSpeed = player.crouching ? 70 : running ? 250 : player.swimming ? 135 : 185;
  const acceleration = player.grounded ? 1450 : 850;
  if (input.left !== input.right) {
    player.facing = input.left ? -1 : 1;
    player.vx += player.facing * acceleration * dt;
  } else {
    player.vx *= player.grounded ? (stage.theme === "gelo" ? 0.92 : 0.76) : player.swimming ? 0.88 : 0.96;
  }
  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
  if (player.climbing) {
    player.vy = (input.down ? 1 : -1) * 145;
    player.grounded = false;
    player.jumpBuffer = 0;
  } else if (player.swimming && input.jump && !player.prevJump) {
    player.vy = -245;
    __szAudio.tom("sine", 510, 65, 2);
  } else if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = -520;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    __szAudio.tom("square", 430 + player.index * 70, 80, 3);
  }
  if (!input.jump && player.prevJump && player.vy < -180) player.vy = -180;
  if (input.action && !player.prevAction) fire(player);
  if (!player.climbing) player.vy = Math.min(player.swimming ? 260 : 780, player.vy + (player.swimming ? 360 : GRAVITY) * dt);
  movePlayer(player, player.vx * dt, player.vy * dt);
  const hazard = tileAt(player.x + player.w * 0.5, player.y + player.h);
  if (hazard === "^" || player.y > stage.height * TILE + 80) hurtPlayer(player);
  player.prevJump = input.jump;
  player.prevAction = input.action;
}

function updatePlatforms(dt) {
  for (let i = 0; i < platforms.length; i += 1) {
    const platform = platforms[i];
    platform.lastX = platform.x;
    platform.lastY = platform.y;
    platform.phase += platform.speed * dt;
    if (platform.axis === "x") platform.x = platform.originX + Math.sin(platform.phase) * platform.range;
    else platform.y = platform.originY + Math.sin(platform.phase) * platform.range;
  }
}

function defeatActor(actor, points) {
  actor.health -= 1;
  if (actor.health <= 0) {
    actor.dead = true;
    score += points;
    __szAudio.ruido(actor.kind === "boss" ? 260 : 75, actor.kind === "boss" ? 7 : 3);
  } else {
    __szAudio.tom("sawtooth", 150 + actor.health * 25, 90, 4);
  }
}

function nearestPlayer(actor) {
  let target = players[0];
  let distance = Math.abs(target.x - actor.x);
  for (let i = 1; i < players.length; i += 1) {
    const candidate = players[i];
    const candidateDistance = Math.abs(candidate.x - actor.x);
    if (candidate.active && candidateDistance < distance) {
      target = candidate;
      distance = candidateDistance;
    }
  }
  return target;
}

function fireEnemyShot(actor, speed, verticalSpeed) {
  const target = nearestPlayer(actor);
  const direction = target.x < actor.x ? -1 : 1;
  shots.push({
    x: actor.x + actor.w * 0.5,
    y: actor.y + actor.h * 0.45,
    w: 10,
    h: 10,
    vx: direction * speed,
    vy: verticalSpeed,
    life: 3,
    owner: -1,
    dead: false
  });
  __szAudio.tom("sawtooth", 180, 55, 2);
}

function updateBoss(actor, dt) {
  actor.phase += dt;
  actor.cooldown -= dt;
  if (actor.variant === "marinho") {
    actor.x = actor.originX + Math.sin(actor.phase * 1.4) * actor.range;
    actor.y = actor.originY + Math.cos(actor.phase * 1.9) * 42;
  } else if (actor.variant === "falcao" || actor.variant === "dragao") {
    actor.x = actor.originX + Math.sin(actor.phase * 1.1) * actor.range;
    actor.y = actor.originY + Math.cos(actor.phase * 1.7) * 70;
  } else if (actor.variant === "tita") {
    actor.x += actor.direction * actor.speed * dt;
    actor.y = actor.originY - Math.abs(Math.sin(actor.phase * 1.8)) * 76;
  } else {
    actor.x += actor.direction * actor.speed * dt;
    if (Math.abs(actor.x - actor.originX) > actor.range) actor.direction *= -1;
  }
  if (actor.cooldown <= 0 && actor.variant !== "broto") {
    fireEnemyShot(actor, actor.variant === "arquiteto" ? 310 : 230, actor.variant === "dragao" ? 90 : 0);
    if (actor.variant === "besouro" || actor.variant === "arquiteto") {
      fireEnemyShot(actor, 210, -120);
      fireEnemyShot(actor, 210, 120);
    }
    actor.cooldown = actor.variant === "eco" ? 0.8 : 1.25;
  }
}

function updateActors(dt) {
  for (let i = 0; i < actors.length; i += 1) {
    const actor = actors[i];
    if (actor.dead) continue;
    if (actor.kind === "boss") updateBoss(actor, dt);
    if (actor.kind === "walker" || actor.kind === "spiky" || (actor.kind === "shell" && actor.state !== "shell")) {
      actor.x += actor.direction * actor.speed * dt;
      const aheadX = actor.direction > 0 ? actor.x + actor.w + 4 : actor.x - 4;
      const wallAhead = solidTile(tileAt(aheadX, actor.y + actor.h * 0.55));
      const groundAhead = solidTile(tileAt(aheadX, actor.y + actor.h + 3));
      if (Math.abs(actor.x - actor.originX) > actor.range || wallAhead || !groundAhead) actor.direction *= -1;
    }
    if (actor.kind === "flyer") {
      actor.phase += dt * 2;
      actor.x = actor.originX + Math.sin(actor.phase) * actor.range;
      actor.y = actor.originY + Math.cos(actor.phase * 1.4) * 22;
    }
    if (actor.kind === "plant") {
      actor.phase += dt * 1.8;
      actor.y = actor.originY - Math.max(0, Math.sin(actor.phase)) * actor.range;
    }
    if (actor.kind === "aquatic") {
      actor.phase += dt * 1.5;
      actor.x = actor.originX + Math.sin(actor.phase) * actor.range;
      actor.y = actor.originY + Math.cos(actor.phase * 1.3) * 34;
    }
    if (actor.kind === "chaser") {
      const target = nearestPlayer(actor);
      const dx = target.x - actor.x;
      const dy = target.y - actor.y;
      actor.x += clamp(dx, -1, 1) * actor.speed * dt;
      actor.y += clamp(dy, -1, 1) * actor.speed * 0.65 * dt;
    }
    if (actor.kind === "thrower") {
      actor.cooldown -= dt;
      if (actor.cooldown <= 0) {
        fireEnemyShot(actor, 205, -35);
        actor.cooldown = 1.4;
      }
    }
    for (let p = 0; p < players.length; p += 1) {
      if (actor.dead) break;
      const player = players[p];
      if (!player.active || !overlaps(player, actor)) continue;
      if (actor.kind === "coin") {
        actor.dead = true;
        coins += 1;
        stageCoins += 1;
        score += 100;
        __szAudio.tom("sine", 880, 55, 2);
      } else if (actor.kind === "gem") {
        actor.dead = true;
        if (!hasGem(actor.id)) {
          gems.push(collectibleKey(actor.id));
          score += 1500;
          __szAudio.tom("triangle", 1180, 240, 6);
        }
      } else if (actor.kind === "powerup") {
        actor.dead = true;
        player.power = actor.variant || "forte";
        if (player.power === "estrela") {
          player.powerTimer = 10;
          player.invulnerable = 10;
        }
        player.life = Math.min(4, player.life + 1);
        __szAudio.tom("sine", 520, 260, 5);
      } else if (actor.kind === "life") {
        actor.dead = true;
        lives = Math.min(99, lives + 1);
        score += 1000;
        announce("Vida extra encontrada.");
        __szAudio.tom("triangle", 1040, 320, 6);
      } else if (actor.kind === "checkpoint") {
        checkpointX = actor.x;
        checkpointY = actor.y - 20;
        actor.dead = true;
        hint = "Checkpoint ativado";
        hintTimer = 2;
        announce("Checkpoint ativado.");
        saveGame();
      } else if (actor.kind === "secretExit") {
        if (stage.secretStage && player.prevAction) completeStage(stage.secretStage);
      } else if (actor.kind === "portal") {
        if (player.prevAction) {
          player.x = actor.targetX;
          player.y = actor.targetY;
          player.vx = 0;
          player.vy = 0;
          announce("Portal atravessado.");
          __szAudio.tom("sine", 760, 180, 4);
        }
      } else if (actor.kind === "exit") {
        let bossAlive = false;
        for (let b = 0; b < actors.length; b += 1) if (actors[b].kind === "boss" && !actors[b].dead) bossAlive = true;
        if (!bossAlive) completeStage(stage.nextStage || "");
        else {
          hint = "Derrote o guardião primeiro";
          hintTimer = 1;
        }
      } else if (player.power === "estrela") {
        defeatActor(actor, actor.kind === "boss" ? 300 : 200);
      } else if (player.vy > 120 && player.y + player.h < actor.y + actor.h * 0.7 && actor.kind !== "spiky" && actor.kind !== "plant") {
        player.vy = -350;
        if (actor.kind === "shell" && actor.state === "walking") {
          actor.state = "shell";
          actor.speed = 0;
          actor.health = 1;
          __szAudio.tom("square", 260, 80, 3);
        } else defeatActor(actor, actor.kind === "boss" ? 500 : 200);
      } else if (actor.kind === "shell" && actor.state === "shell") {
        actor.state = "sliding";
        actor.direction = player.x < actor.x ? 1 : -1;
        actor.speed = 330;
        player.vx = -actor.direction * 90;
      } else {
        hurtPlayer(player);
      }
    }
  }
}

function updateShots(dt) {
  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (shot.dead) continue;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0 || solidTile(tileAt(shot.x, shot.y))) shot.dead = true;
    if (shot.owner < 0) {
      for (let p = 0; p < players.length; p += 1) {
        const player = players[p];
        if (!shot.dead && player.active && overlaps(shot, player)) {
          shot.dead = true;
          hurtPlayer(player);
        }
      }
    }
    for (let a = 0; a < actors.length; a += 1) {
      const actor = actors[a];
      if (shot.owner >= 0 && !shot.dead && !actor.dead && (actor.kind === "walker" || actor.kind === "flyer" || actor.kind === "shell" || actor.kind === "plant" || actor.kind === "thrower" || actor.kind === "chaser" || actor.kind === "aquatic" || actor.kind === "boss") && overlaps(shot, actor)) {
        shot.dead = true;
        defeatActor(actor, actor.kind === "boss" ? 300 : 150);
      }
    }
  }
  const activeShots = [];
  for (let i = 0; i < shots.length; i += 1) {
    if (!shots[i].dead) activeShots.push(shots[i]);
  }
  shots = activeShots;
}

function completeStage(nextId) {
  if (mode !== "playing") return;
  if (replayMode) {
    mode = nextId ? "stageclear" : "victory";
    announce(nextId ? "Replay da fase concluído." : "Replay da campanha concluído.");
    __szAudio.tom("triangle", 784, 500, 6);
    return;
  }
  unlocked = Math.max(unlocked, Math.min(STAGES.length, stageIndex + 2));
  score += Math.floor(timeLeft) * 10 + stageCoins * 5;
  if (playMode === "turns") syncTurnProfile(players[activeTurn]);
  pendingStage = nextId;
  stageClearTimer = 0.8;
  mode = nextId ? "stageclear" : "victory";
  replayMode = false;
  saveGame();
  announce(nextId ? "Fase concluída." : "Campanha concluída.");
  __szAudio.tom("triangle", 784, 500, 6);
}

function updateGame(dt) {
  if (replayMode && replaySession === null) captureReplaySession("title");
  if (mode === "title") {
    deleteConfirmTimer = Math.max(0, deleteConfirmTimer - dt);
    if (__szInput.key("1")) selectPlayMode("solo");
    if (__szInput.key("2")) selectPlayMode("turns");
    if (__szInput.key("3")) selectPlayMode("coop");
    const start = __szInput.key("Enter") || touch.start || __szInput.gamepadButton(0, 9) > 0.5;
    if (start && !previousMenuStart) {
      replayMode = false;
      loadStage(STAGES[Math.min(unlocked - 1, STAGES.length - 1)].id);
    }
    if (__szInput.key("r") || __szInput.key("R")) {
      beginReplay();
    }
    const deletePressed = __szInput.key("Delete");
    if (deletePressed && !previousDelete) {
      if (deleteConfirmTimer > 0) {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(SAVE_BACKUP_KEY);
        localStorage.removeItem(SAVE_CORRUPT_KEY);
        clearRecoveryNotice();
        unlocked = 1;
        score = 0;
        coins = 0;
        gems = [];
        lives = 5;
        playMode = "coop";
        playerCount = 2;
        resetTurnProfiles();
        recoveryNotice = "Progresso apagado.";
        announce(recoveryNotice);
        deleteConfirmTimer = 0;
      } else {
        deleteConfirmTimer = 3;
        announce("Pressione Delete novamente em até três segundos para apagar o progresso.");
      }
    }
    previousDelete = deletePressed;
    previousMenuStart = start;
    touch.start = false;
    return;
  }
  if (mode === "paused") {
    const pausePressed = __szInput.key("Escape") || __szInput.key("p") || __szInput.key("P");
    if (pausePressed && !previousPause) {
      mode = "playing";
      announce("Partida retomada.");
    }
    previousPause = pausePressed;
    return;
  }
  if (mode === "stageclear" || mode === "turnswitch") {
    stageClearTimer -= dt;
    if (stageClearTimer <= 0) loadStage(pendingStage);
    return;
  }
  if (mode === "gameover" || mode === "victory") {
    const restart = __szInput.key("Enter") || touch.start;
    if (restart && !previousMenuStart) {
      mode = "title";
      lives = Math.max(3, lives);
    }
    previousMenuStart = restart;
    touch.start = false;
    return;
  }
  const pausePressed = __szInput.key("Escape") || __szInput.key("p") || __szInput.key("P");
  if (pausePressed && !previousPause) {
    mode = "paused";
    announce("Partida pausada.");
    previousPause = true;
    return;
  }
  previousPause = pausePressed;
  const input0 = readInput(0);
  const input1 = readInput(1);
  if (!replayMode && replay.length < 36000) replay.push([encodeInput(input0), encodeInput(input1)]);
  updatePlatforms(dt);
  updateFragileTiles(dt);
  updatePlayer(players[0], input0, dt);
  updatePlayer(players[1], input1, dt);
  updateActors(dt);
  updateShots(dt);
  musicTimer -= dt;
  if (musicTimer <= 0) {
    const themeBase = 150 + stage.world * 28;
    const notes = [0, 4, 7, 12, 7, 4, 9, 7];
    __szAudio.tom("triangle", themeBase + notes[musicStep % notes.length] * 8, 80, 1.2);
    musicStep += 1;
    musicTimer = mode === "playing" ? 0.24 : 0.48;
  }
  if (replayMode && mode !== "playing") {
    finishReplay();
    return;
  }
  playbackAt += replayMode ? 1 : 0;
  if (replayMode && playbackAt >= playback.length) {
    finishReplay();
    return;
  }
  timeLeft -= dt;
  hintTimer = Math.max(0, hintTimer - dt);
  if (timeLeft <= 0) {
    if (replayMode) {
      finishReplay();
      return;
    }
    lives -= 1;
    if (lives <= 0) {
      mode = "gameover";
      announce("Fim de jogo por tempo esgotado.");
    }
    else loadStage(stage.id);
  }
  if (playMode === "coop" && players[0].active && players[1].active && Math.abs(players[0].x - players[1].x) > VIEW_W * 0.82) {
    const leader = players[0].x > players[1].x ? players[0] : players[1];
    const follower = players[0].x > players[1].x ? players[1] : players[0];
    follower.x = leader.x - leader.facing * 48;
    follower.y = leader.y - 16;
    follower.vx = 0;
    follower.vy = 0;
    follower.invulnerable = Math.max(follower.invulnerable, 1.5);
    announce("O jogador que ficou para trás voltou ao grupo.");
  }
  let targetX = 0;
  let activePlayers = 0;
  for (let i = 0; i < players.length; i += 1) {
    if (players[i].active) {
      targetX += players[i].x;
      activePlayers += 1;
    }
  }
  if (activePlayers > 0) targetX = targetX / activePlayers;
  const wanted = clamp(targetX - VIEW_W * 0.42, 0, stage.width * TILE - VIEW_W);
  if (reducedMotion) cameraX = wanted;
  else cameraX += (wanted - cameraX) * 0.12;
}

function drawTile(tile, x, y, palette) {
  if (tile === ".") return;
  if (tile === "#") {
    ctx.fillStyle = palette.ground;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = palette.near;
    ctx.fillRect(x, y, TILE, 6);
  } else if (tile === "=" || tile === "B" || tile === "?" || tile === "U" || tile === "S" || tile === "F") {
    ctx.fillStyle = tile === "?" ? palette.accent : tile === "B" ? "#a95d3c" : tile === "U" ? "#6e7787" : tile === "S" ? "#57d48a" : tile === "F" ? "#db8665" : "#d2a15e";
    ctx.fillRect(x + 1, y + 4, TILE - 2, TILE - 8);
    ctx.strokeStyle = "rgba(20,20,30,0.35)";
    ctx.strokeRect(x + 1.5, y + 4.5, TILE - 3, TILE - 9);
  } else if (tile === "^" || tile === "~") {
    ctx.fillStyle = tile === "^" ? "#ff563d" : "#32b8df";
    ctx.beginPath();
    ctx.moveTo(x, y + TILE);
    ctx.lineTo(x + TILE * 0.5, y + 6);
    ctx.lineTo(x + TILE, y + TILE);
    ctx.fill();
  } else if (tile === "H") {
    ctx.strokeStyle = "#d99b4e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 8, y + TILE);
    ctx.moveTo(x + TILE - 8, y);
    ctx.lineTo(x + TILE - 8, y + TILE);
    ctx.moveTo(x + 8, y + 8);
    ctx.lineTo(x + TILE - 8, y + 8);
    ctx.moveTo(x + 8, y + 22);
    ctx.lineTo(x + TILE - 8, y + 22);
    ctx.stroke();
  }
}

function drawPlayer(player) {
  if (!player.active || (player.power !== "estrela" && player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0)) return;
  ctx.save();
  ctx.translate(player.x - cameraX + player.w * 0.5, player.y + player.h * 0.5);
  if (player.facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = player.power === "estrela" ? "#ffe066" : player.index === 0 ? "#ff5c5c" : "#45c486";
  ctx.fillRect(-12, -9, 24, 21);
  ctx.fillStyle = player.power === "normal" ? "#f7d6a3" : "#ffe26f";
  ctx.fillRect(-9, -15, 18, 10);
  ctx.fillStyle = "#182033";
  ctx.fillRect(3, -12, 3, 3);
  ctx.fillStyle = "#263b75";
  ctx.fillRect(-10, 12, 8, 4);
  ctx.fillRect(3, 12, 8, 4);
  ctx.restore();
}

function drawActor(actor, palette) {
  if (actor.dead) return;
  const x = actor.x - cameraX;
  if (x < -80 || x > VIEW_W + 80) return;
  if (actor.kind === "coin" || actor.kind === "gem" || actor.kind === "life") {
    ctx.fillStyle = actor.kind === "gem" ? "#8af0ff" : actor.kind === "life" ? "#ff75bd" : "#ffd447";
    ctx.beginPath();
    ctx.arc(x + actor.w * 0.5, actor.y + actor.h * 0.5, actor.kind === "gem" ? 10 : 8, 0, 6.283);
    ctx.fill();
  } else if (actor.kind === "checkpoint") {
    ctx.fillStyle = "#e7eef7";
    ctx.fillRect(x + 5, actor.y - 20, 4, 48);
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(x + 9, actor.y - 20);
    ctx.lineTo(x + 32, actor.y - 10);
    ctx.lineTo(x + 9, actor.y);
    ctx.fill();
  } else if (actor.kind === "exit" || actor.kind === "secretExit" || actor.kind === "portal") {
    ctx.fillStyle = actor.kind === "secretExit" ? "#9d78db" : "#e8edf7";
    ctx.fillRect(x, actor.y - 28, 28, 56);
    ctx.fillStyle = "#26334d";
    ctx.fillRect(x + 6, actor.y - 19, 16, 47);
  } else if (actor.kind === "powerup") {
    ctx.fillStyle = actor.variant === "fogo" ? "#ff914d" : "#6fdb73";
    ctx.fillRect(x, actor.y, actor.w, actor.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 10, actor.y + 4, 6, 20);
    ctx.fillRect(x + 3, actor.y + 11, 20, 6);
  } else {
    ctx.fillStyle = actor.kind === "boss" ? "#7b3aa4" : actor.kind === "spiky" ? "#e24b3b" : actor.kind === "aquatic" ? "#268cbb" : actor.kind === "chaser" ? "#d8d8ef" : actor.kind === "thrower" ? "#d97c3f" : actor.kind === "plant" ? "#45a657" : actor.kind === "shell" ? "#4b9b67" : "#8b583a";
    ctx.fillRect(x, actor.y, actor.w, actor.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + actor.w * 0.2, actor.y + actor.h * 0.22, 6, 6);
    ctx.fillRect(x + actor.w * 0.65, actor.y + actor.h * 0.22, 6, 6);
    if (actor.kind === "boss") {
      ctx.fillStyle = "#281b35";
      ctx.fillRect(x, actor.y - 12, actor.w, 6);
      ctx.fillStyle = "#ef5b5b";
      ctx.fillRect(x, actor.y - 12, actor.w * actor.health / actor.maxHealth, 6);
    }
  }
}

function drawWorld() {
  const palette = THEMES[stage.theme];
  ctx.fillStyle = palette.sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = palette.far;
  for (let i = 0; i < 8; i += 1) {
    const hillX = i * 180 - (cameraX * 0.18) % 180;
    ctx.beginPath();
    ctx.arc(hillX, VIEW_H - 40, 150 + (i % 3) * 24, 3.14, 6.283);
    ctx.fill();
  }
  ctx.fillStyle = palette.near;
  for (let i = 0; i < 12; i += 1) {
    const nearX = i * 110 - (cameraX * 0.35) % 110;
    ctx.fillRect(nearX, VIEW_H - 105 - (i % 2) * 35, 70, 120);
  }
  const firstColumn = Math.max(0, Math.floor(cameraX / TILE) - 1);
  const lastColumn = Math.min(stage.width, firstColumn + Math.ceil(VIEW_W / TILE) + 3);
  for (let row = 0; row < stage.height; row += 1) {
    for (let column = firstColumn; column < lastColumn; column += 1) {
      drawTile(stage.tiles[row].charAt(column), column * TILE - cameraX, row * TILE, palette);
    }
  }
  ctx.fillStyle = "#d7b169";
  for (let i = 0; i < platforms.length; i += 1) {
    const platform = platforms[i];
    ctx.fillRect(platform.x - cameraX, platform.y, platform.w, platform.h);
  }
  for (let i = 0; i < actors.length; i += 1) drawActor(actors[i], palette);
  ctx.fillStyle = "#ffb34a";
  for (let i = 0; i < shots.length; i += 1) {
    if (!shots[i].dead) {
      ctx.beginPath();
      ctx.arc(shots[i].x - cameraX, shots[i].y, 6, 0, 6.283);
      ctx.fill();
    }
  }
  drawPlayer(players[0]);
  drawPlayer(players[1]);
}

function drawHud() {
  ctx.fillStyle = "rgba(10,14,28,0.82)";
  ctx.fillRect(14, 12, VIEW_W - 28, 52);
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px sans-serif";
  ctx.fillText("REINO ZERO ULTRA", 30, 35);
  ctx.font = "15px sans-serif";
  ctx.fillText("MUNDO " + stage.id, 30, 55);
  ctx.fillText("PONTOS " + score, 220, 43);
  ctx.fillText("MOEDAS " + coins, 390, 43);
  ctx.fillText("GEMAS " + gems.length + "/8", 540, 43);
  ctx.fillText("VIDAS " + lives, 670, 43);
  ctx.fillText("TEMPO " + Math.max(0, Math.ceil(timeLeft)), 800, 43);
  if (playMode === "turns") ctx.fillText("TURNO P" + (activeTurn + 1), 30, 82);
  if (playMode === "coop") ctx.fillText("COOPERATIVO", 30, 82);
  if (replayMode) {
    ctx.fillStyle = "#ffdd66";
    ctx.fillText("REPLAY", 820, 82);
  }
  if (hintTimer > 0) {
    ctx.fillStyle = "rgba(10,14,28,0.88)";
    ctx.fillRect(120, VIEW_H - 64, VIEW_W - 240, 42);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(hint, VIEW_W * 0.5, VIEW_H - 37);
    ctx.textAlign = "left";
  }
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(8,10,24,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "48px sans-serif";
  ctx.fillText(title, VIEW_W * 0.5, 220);
  ctx.font = "20px sans-serif";
  ctx.fillText(subtitle, VIEW_W * 0.5, 270);
  ctx.textAlign = "left";
}

function draw() {
  const status = mode + "|" + stage.id + "|" + playerCount + "|" + replay.length;
  if (status !== lastStatus) {
    statusEl.textContent = status;
    lastStatus = status;
  }
  if (mode === "title") {
    const palette = THEMES.campo;
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = palette.near;
    ctx.fillRect(0, 390, VIEW_W, 150);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "56px sans-serif";
    ctx.fillText("REINO ZERO ULTRA", VIEW_W * 0.5, 165);
    ctx.font = "22px sans-serif";
    ctx.fillText("32 fases · save seguro · replay · controle", VIEW_W * 0.5, 215);
    ctx.font = "18px sans-serif";
    ctx.fillText("1 = solo · 2 = turnos · 3 = cooperativo", VIEW_W * 0.5, 270);
    ctx.fillText("ENTER começa · R replay · DELETE duas vezes apaga", VIEW_W * 0.5, 302);
    ctx.fillText("Modo atual: " + playMode + " · P1 setas X/Z · P2 WASD G/F", VIEW_W * 0.5, 334);
    ctx.fillText("Progresso: " + unlocked + "/32   Gemas: " + gems.length + "/8", VIEW_W * 0.5, 370);
    ctx.textAlign = "left";
    return;
  }
  drawWorld();
  drawHud();
  if (mode === "paused") drawOverlay("PAUSADO", "P ou Esc para continuar");
  if (mode === "stageclear") drawOverlay("FASE CONCLUÍDA", "Salvando progresso...");
  if (mode === "turnswitch") drawOverlay("TROCA DE TURNO", "Jogador " + (activeTurn + 1) + " prepara-se");
  if (mode === "gameover") drawOverlay("FIM DE JOGO", "Enter para voltar ao menu");
  if (mode === "victory") drawOverlay("REINO SALVO!", "Você concluiu os 8 mundos. Enter para o menu.");
}

function frame(time) {
  requestAnimationFrame(frame);
  if (lastTime === 0) lastTime = time;
  accumulator += Math.min(250, time - lastTime);
  lastTime = time;
  while (accumulator >= STEP) {
    updateGame(STEP / 1000);
    accumulator -= STEP;
  }
  draw();
}

let touchPointers = { left: -1, right: -1, jump: -1, action: -1, start: -1 };

function setTouchDown(key, pointerId, button) {
  if (touchPointers[key] !== -1) return;
  touchPointers[key] = pointerId;
  touch[key] = true;
  try {
    button.setPointerCapture(pointerId);
  } catch (error) {
  }
}

function setTouchUp(key, pointerId) {
  if (touchPointers[key] !== pointerId) return;
  touchPointers[key] = -1;
  touch[key] = false;
}

function pressTouchLeft(event) { setTouchDown("left", event.pointerId, touchLeft); }
function pressTouchRight(event) { setTouchDown("right", event.pointerId, touchRight); }
function pressTouchJump(event) { setTouchDown("jump", event.pointerId, touchJump); }
function pressTouchAction(event) { setTouchDown("action", event.pointerId, touchAction); }
function pressTouchStart(event) { setTouchDown("start", event.pointerId, touchStart); }
function releaseTouchLeft(event) { setTouchUp("left", event.pointerId); }
function releaseTouchRight(event) { setTouchUp("right", event.pointerId); }
function releaseTouchJump(event) { setTouchUp("jump", event.pointerId); }
function releaseTouchAction(event) { setTouchUp("action", event.pointerId); }
function releaseTouchStart(event) { setTouchUp("start", event.pointerId); }

function releaseAllTouch() {
  touch.left = false;
  touch.right = false;
  touch.jump = false;
  touch.action = false;
  touch.start = false;
  touchPointers.left = -1;
  touchPointers.right = -1;
  touchPointers.jump = -1;
  touchPointers.action = -1;
  touchPointers.start = -1;
}

const touchLeft = document.getElementById("touch-left");
const touchRight = document.getElementById("touch-right");
const touchJump = document.getElementById("touch-jump");
const touchAction = document.getElementById("touch-action");
const touchStart = document.getElementById("touch-start");
touchLeft.addEventListener("pointerdown", pressTouchLeft);
touchRight.addEventListener("pointerdown", pressTouchRight);
touchJump.addEventListener("pointerdown", pressTouchJump);
touchAction.addEventListener("pointerdown", pressTouchAction);
touchStart.addEventListener("pointerdown", pressTouchStart);
touchLeft.addEventListener("pointerup", releaseTouchLeft);
touchRight.addEventListener("pointerup", releaseTouchRight);
touchJump.addEventListener("pointerup", releaseTouchJump);
touchAction.addEventListener("pointerup", releaseTouchAction);
touchStart.addEventListener("pointerup", releaseTouchStart);
touchLeft.addEventListener("pointercancel", releaseTouchLeft);
touchRight.addEventListener("pointercancel", releaseTouchRight);
touchJump.addEventListener("pointercancel", releaseTouchJump);
touchAction.addEventListener("pointercancel", releaseTouchAction);
touchStart.addEventListener("pointercancel", releaseTouchStart);
touchLeft.addEventListener("lostpointercapture", releaseTouchLeft);
touchRight.addEventListener("lostpointercapture", releaseTouchRight);
touchJump.addEventListener("lostpointercapture", releaseTouchJump);
touchAction.addEventListener("lostpointercapture", releaseTouchAction);
touchStart.addEventListener("lostpointercapture", releaseTouchStart);
window.addEventListener("blur", releaseAllTouch);
loadSave();
const queuedRecoveryNotice = localStorage.getItem(SAVE_NOTICE_KEY);
if (queuedRecoveryNotice !== null) recoveryNotice = queuedRecoveryNotice;
if (recoveryNotice !== "") {
  announce(recoveryNotice);
  setTimeout(clearRecoveryNotice, 60000);
}
requestAnimationFrame(frame);
`
