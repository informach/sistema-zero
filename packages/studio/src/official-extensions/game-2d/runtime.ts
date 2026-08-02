import { buildProjectRunContextRuntime } from '#extensions'
import { withGameUIFontRuntime } from '../gameUiFont'
import { gameRuntimeDomains } from '../runtimeDomains'
import { gameTwoDArcadeKitsRuntime } from './runtime/arcadeKits'
import { gameTwoDAudioRuntime } from './runtime/audio'
import { gameTwoDCasualKitsRuntime } from './runtime/casualKits'
import { gameTwoDInputAndMotionRuntime } from './runtime/inputAndMotion'
import { gameTwoDLifecycleRuntime } from './runtime/lifecycle'
import { gameTwoDPhysicsRuntime } from './runtime/physics'
import { gameTwoDSpritesRuntime } from './runtime/sprites'
import { gameTwoDStageRuntime } from './runtime/stage'
import { gameTwoDUtilitiesRuntime } from './runtime/utilities'
import { gameTwoDWorldRuntime } from './runtime/world'
import { buildGameTwoDRuntimeApiSource } from './runtimeContract'

/**
 * Runtime didático injetado no <head> do iframe quando a extensão "game-2d"
 * está instalada. Expõe `window.SZGame2D` com helpers simples.
 *
 * É intencionalmente legível — o aluno pode abrir a Ponte, ver
 * `SZGame2D.createSprite(...)` no script.js e seguir o link mental até esta
 * função.
 */
export const gameTwoDRuntime = withGameUIFontRuntime(
  buildProjectRunContextRuntime() +
    '\n' +
    `(function () {
  var _szGameUIFont = window.SZGameUIFont.family;
  // Estado interno: lista de teclas pressionadas.
  var keys = { left: false, right: false, up: false, down: false };
  function _normalizeGameKey(value) {
    if (typeof value !== 'string') return '';
    if (value === ' ') return 'Space';
    if (/^Key[A-Z]$/.test(value)) return value.slice(3).toLowerCase();
    return value.length === 1 ? value.toLowerCase() : value;
  }
  function _eventGameKey(e) {
    var code = _normalizeGameKey(e && e.code);
    return code || _normalizeGameKey(e && e.key);
  }
  function _eventMatchesGameKey(e, wanted) {
    var normalized = _normalizeGameKey(wanted);
    return normalized === _normalizeGameKey(e && e.key) || normalized === _normalizeGameKey(e && e.code);
  }
  function _setDirectionalKey(e, down) {
    var key = _eventGameKey(e);
    if (key === 'ArrowLeft' || key === 'a') keys.left = down;
    if (key === 'ArrowRight' || key === 'd') keys.right = down;
    if (key === 'ArrowUp' || key === 'w') keys.up = down;
    if (key === 'ArrowDown' || key === 's') keys.down = down;
  }
  function _isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }
  function _finiteNumber(value, fallback) {
    return _isFiniteNumber(value) ? value : fallback;
  }
  function _positiveFiniteNumber(value, fallback) {
    return _isFiniteNumber(value) && value > 0 ? value : fallback;
  }
` +
    gameRuntimeDomains +
    `
  // O restart e a pausa apenas orquestram os domínios registrados; adicionar
  // um domínio novo não exige editar um reset central distante.
  function _resetRuntimeDomains() { _runRuntimeDomainHook('reset'); }
  function _pauseRuntimeDomains() { _runRuntimeDomainHook('pause'); }
  function _resumeRuntimeDomains() { _runRuntimeDomainHook('resume'); }

  // Relógio monotônico da PARTIDA: o tempo de parede continua andando, mas todo
  // período pausado é descontado. Animações, cooldowns e temporizadores usam now().
  var _gameClockPausedAt = null;
  var _gameClockPausedDuration = 0;
  function _wallNow() {
    try {
      return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    } catch (error) { return Date.now(); }
  }
  function now() {
    var wall = _wallNow();
    var currentPause = _gameClockPausedAt === null ? 0 : wall - _gameClockPausedAt;
    return wall - _gameClockPausedDuration - currentPause;
  }
  function _pauseGameClock() {
    if (_gameClockPausedAt === null) _gameClockPausedAt = _wallNow();
  }
  function _resumeGameClock() {
    if (_gameClockPausedAt === null) return;
    _gameClockPausedDuration += Math.max(0, _wallNow() - _gameClockPausedAt);
    _gameClockPausedAt = null;
  }
  function _resetGameClock() {
    _gameClockPausedAt = null;
    _gameClockPausedDuration = 0;
  }

` +
    gameTwoDSpritesRuntime +
    gameTwoDLifecycleRuntime +
    gameTwoDPhysicsRuntime +
    gameTwoDAudioRuntime +
    gameTwoDInputAndMotionRuntime +
    gameTwoDWorldRuntime +
    gameTwoDArcadeKitsRuntime +
    gameTwoDStageRuntime +
    gameTwoDCasualKitsRuntime +
    gameTwoDUtilitiesRuntime +
    buildGameTwoDRuntimeApiSource() +
    `
})();`,
)
