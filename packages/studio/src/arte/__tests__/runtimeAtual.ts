import { gameTwoDArcadeDinoRuntime } from '../../official-extensions/game-2d/runtime/arcadeKitsDino'
import { gameTwoDArcadeGorillasRuntime } from '../../official-extensions/game-2d/runtime/arcadeKitsGorillas'
import { gameTwoDArcadeHudRuntime } from '../../official-extensions/game-2d/runtime/arcadeKitsHud'
import { gameTwoDArcadeSpaceRuntime } from '../../official-extensions/game-2d/runtime/arcadeKitsSpace'

/**
 * Carrega a arte COMO ELA ESTÁ HOJE no runtime do jogo, para o teste de paridade comparar.
 *
 * ⭐⭐ O runtime é uma STRING (template literal), então não dá para importar `drawDino`: ele é
 * avaliado dentro do IIFE do iframe de preview, com dezenas de helpers em escopo. Aqui a string é
 * avaliada com um preâmbulo que declara esses helpers, e o epílogo devolve só os desenhos.
 *
 * ⚠️ Os stubs que IMPORTAM são os que entram na conta do desenho — `now()` (o relógio),
 * `dinoGround` (a linha da sombra), `world.gravity` e `_visibleWorldRect`. Eles recebem
 * exatamente os mesmos valores que o `Ambiente` do módulo portado, e é essa igualdade que faz a
 * comparação significar alguma coisa. O resto é no-op: nenhum desenho os chama.
 *
 * ⚠️ Este arquivo é só de TESTE. Nada do produto carrega o runtime assim.
 */

export interface AmbienteDoRuntime {
  t: number
  chao: number
  largura: number
  altura: number
  gravidade: number
}

const PREAMBULO = `
  var __amb = __ambiente;
  var now = function () { return __amb.t; };
  var stageW = function () { return __amb.largura; };
  var stageH = function () { return __amb.altura; };
  var stageWidth = stageW;
  var stageHeight = stageH;
  var dinoGround = function () { return __amb.chao; };
  var world = { gravity: __amb.gravidade };
  var _visibleWorldRect = function () {
    return {
      left: 0, top: 0, right: __amb.largura, bottom: __amb.altura,
      width: __amb.largura, height: __amb.altura,
    };
  };
  var _gravityPullsUp = function (g) { return g < 0; };
  var _finiteNumber = function (v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; };
  var _positiveFiniteNumber = function (v, d) {
    return (typeof v === 'number' && isFinite(v) && v > 0) ? v : d;
  };
  var MAX_GROUP = 400;
  var camera = { x: 0, y: 0 };
  var keys = {};
  var pointer = { x: 0, y: 0, down: false };
  var _nada = function () {};
  var keyDown = function () { return false; };
  var _isDestroyedSprite = function () { return false; };
  var _touchGroup = _nada;
  var emitParticles = _nada;
  var ensureAudio = function () { return null; };
  var ensureStage = function () { return __ctxFalso; };
  var createSprite = function (o) { return Object.assign({ x: 0, y: 0, w: 0, h: 0 }, o); };
  var _beginGroundFrame = function () { return true; };
  var _jumpFromGround = _nada;
  var _resolveGravityGround = function () { return true; };
  var _jumpVelocityForGravity = function () { return 0; };
  var _emitJump = _nada;
  var _registerRuntimeDomain = _nada;
  var _clampSpeed = function (v) { return v; };
  var _warnOnce = _nada;
  var warnOnce = _nada;
`

function avaliar(
  corpo: string,
  nomes: string[],
  amb: AmbienteDoRuntime,
): Record<string, DesenhoDoRuntime> {
  const fabrica = new Function(
    '__ambiente',
    '__ctxFalso',
    `${PREAMBULO}\n${corpo}\n;return { ${nomes.join(', ')} };`,
  )
  return fabrica(amb, { canvas: { width: amb.largura, height: amb.altura } }) as Record<
    string,
    DesenhoDoRuntime
  >
}

/** Cada desenho do runtime: `(pincel, sprite) => void` — a assinatura dele, porque é ele. */
export type DesenhoDoRuntime = (ctx: unknown, alvo?: unknown) => void

/**
 * Os desenhos do runtime de hoje, prontos para receber um pincel.
 *
 * ⚠️ O retorno é um `Record` explícito, e não o inferido do spread: com o tipo inferido o
 * `tsc` reclama de indexar por string, e foi assim que este arquivo passou no `bun test` com o
 * typecheck vermelho — o `bun test` não roda o `tsc`.
 */
export function desenhosDoRuntime(amb: AmbienteDoRuntime): Record<string, DesenhoDoRuntime> {
  const dino = avaliar(
    gameTwoDArcadeDinoRuntime,
    ['drawDino', 'drawObstacleSprite', 'drawEggSprite', 'drawCloud', 'drawForest'],
    amb,
  )
  const space = avaliar(gameTwoDArcadeSpaceRuntime, ['drawShip', 'drawAsteroidSprite'], amb)
  const hud = avaliar(gameTwoDArcadeHudRuntime, ['drawStarfield'], amb)
  const gorillas = avaliar(gameTwoDArcadeGorillasRuntime, ['drawGorilla', 'drawCity'], amb)
  return { ...dino, ...space, ...hud, ...gorillas }
}
