import { type JSExpr, valueToExpr } from '#ir'
import {
  isProgrammingExpressionIR,
  programmingExpressionIRToCode,
} from '../codecs/programming/irToCode'
import { canvasExpressionToCode, isCanvasExpression } from '../codecs/web/canvasExpressionToCode'
import { normalizeIdentifier, safeIdent } from './identifier'
import type { SourceMapBuilder } from './sourceMap'

// `normalizeIdentifier`/`safeIdent` foram extraídos para `./identifier` (são
// compartilhados com a camada de blocos via `paramsMutator`). Re-exportamos aqui
// para que os importadores existentes (`js.ts`) continuem funcionando.
export { normalizeIdentifier, safeIdent }

/**
 * Erro lançado quando o gerador encontra um nó de IR que NENHUM `case` do
 * `switch` cobre — ou seja, uma variante fora do esquema conhecido (ex.: IR de um
 * JSON importado por um estranho, ou uma variante nova sem `case` correspondente).
 * Sem ele, o `switch` "caía pela borda" e devolvia `undefined`, que era
 * interpolado como a STRING literal `"undefined"` no código gerado — um bug
 * silencioso. Tipado e capturável (irmão de `GeneratorDepthError`), para que os
 * chamadores na thread principal possam distingui-lo de um bug do gerador e
 * degradar com elegância em vez de emitir código quebrado. Vive AQUI (módulo
 * "de baixo") para que `js.ts` possa importá-lo sem criar dependência circular.
 */
export class GeneratorError extends Error {
  constructor(message = 'Nó de IR fora do esquema suportado pelo gerador') {
    super(message)
    this.name = 'GeneratorError'
  }
}

/**
 * Contexto opcional de source map para expressões. Como `compileExpr` nunca
 * emite `\n`, toda (sub)expressão vive numa única linha — basta registrar
 * `__id → linha`. A linha é a mesma para a expressão e seus filhos.
 */
export interface ExprMapContext {
  map: SourceMapBuilder
  line: number
  /** Indentação (nível) do statement que hospeda a expressão — usada só por
   * valores com CORPO de statements (`new Promise((resolve) => { ... })`) para
   * indentar o corpo. Ausente = nível 0. */
  indent?: number
}

/**
 * Compilador de STATEMENTS injetado por `js.ts` (a camada de cima) — evita
 * dependência circular (expr.ts é a camada de baixo). Só o `newPromise` (valor
 * com corpo) precisa dele; enquanto não injetado, o corpo sai vazio.
 */
let compileStatementsInjected:
  | ((stmts: readonly unknown[], indent: number, identifiers: IdentifierResolver) => string)
  | null = null
export function _setExprStatementCompiler(fn: typeof compileStatementsInjected): void {
  compileStatementsInjected = fn
}

export interface IdentifierResolver {
  get(name: string): string
  /** Nome da variável que guarda o elemento <canvas> associado a um contexto. */
  getCanvasElement(ctxName: string): string
  /** Nome emitido para a DECLARAÇÃO de uma classe (`class X`), única por `key`. */
  declareClassName(key: string, name: string): string
  /** Nome para uma REFERÊNCIA a classe (`new X`, `extends X`). */
  getClassReference(name: string): string
}

const defaultIdentifierResolver: IdentifierResolver = {
  get: safeIdent,
  getCanvasElement: () => 'canvas',
  declareClassName: (_key, name) => safeIdent(name),
  getClassReference: safeIdent,
}

export class IdentifierScope implements IdentifierResolver {
  private readonly byOriginal = new Map<string, string>()
  private readonly used = new Set<string>()
  private readonly canvasElements = new Map<string, string>()
  private readonly declaredClasses = new Map<string, string>()
  private readonly classRefs = new Map<string, string>()
  private canvasImageIdentifiers?: { images: string; ready: string }
  private projectRunContextIdentifier?: string
  // Próximo sufixo a tentar por base, para a sondagem de colisão NÃO recomeçar do
  // 2 a cada nome homônimo: k nomes que normalizam para a MESMA base custavam
  // O(k²) (a k-ésima alocação varria os sufixos 2..k). Como `used` só cresce
  // (nunca libera), retomar do último sufixo é seguro — o `while` ainda confere.
  private readonly nextSuffix = new Map<string, number>()
  private internalCount = 0

  get(name: string): string {
    const existing = this.byOriginal.get(name)
    if (existing) return existing
    return this.allocate(name, normalizeIdentifier(name))
  }

  /**
   * Nome emitido para a DECLARAÇÃO de uma classe. Vive no mesmo espaço léxico
   * das variáveis (em JS `class X` e `let X` colidem), então reservar a classe
   * antes das variáveis faz uma instância homônima virar `X_2`. Cada DECLARAÇÃO
   * (identificada por `key`, ex.: id do bloco) recebe um nome único, então duas
   * classes "X" viram `X` e `X_2` em vez de `class X` duplicado (SyntaxError).
   * A PRIMEIRA declaração de cada nome vira o alvo das referências.
   */
  declareClassName(key: string, name: string): string {
    const existing = this.declaredClasses.get(key)
    if (existing) return existing
    const allocated = this.allocate(`__classdecl_${key}`, normalizeIdentifier(name))
    this.declaredClasses.set(key, allocated)
    if (!this.classRefs.has(name)) this.classRefs.set(name, allocated)
    return allocated
  }

  /**
   * Nome para uma REFERÊNCIA a classe. Resolve para a primeira declaração com
   * esse nome; se não houver (classe externa/global, ex.: `extends Date`),
   * mantém o nome literal — renomear quebraria a referência.
   */
  getClassReference(name: string): string {
    return this.classRefs.get(name) ?? normalizeIdentifier(name)
  }

  reserveInternal(hint: string): string {
    this.internalCount += 1
    return this.allocate(`__internal_${this.internalCount}_${hint}`, normalizeIdentifier(hint))
  }

  /** Reserva, uma única vez, os nomes do pré-carregador de imagens do Canvas. */
  prepareCanvasImageIdentifiers(): { images: string; ready: string } {
    if (!this.canvasImageIdentifiers) {
      this.canvasImageIdentifiers = {
        images: this.reserveInternal('imagensCanvas'),
        ready: this.reserveInternal('imagensCanvasProntas'),
      }
    }
    return this.canvasImageIdentifiers
  }

  /** Identificadores presentes somente quando o gerador instalou o pré-carregador. */
  getCanvasImageIdentifiers(): { images: string; ready: string } | undefined {
    return this.canvasImageIdentifiers
  }

  /** Reserva o contexto descartável usado pelo envelope das três áreas. */
  prepareProjectRunContextIdentifier(): string {
    if (!this.projectRunContextIdentifier) {
      this.projectRunContextIdentifier = this.reserveInternal('__szProjectRunContext')
    }
    return this.projectRunContextIdentifier
  }

  /** Presente somente durante a geração das três áreas com lifecycle. */
  getProjectRunContextIdentifier(): string | undefined {
    return this.projectRunContextIdentifier
  }

  getCanvasElement(ctxName: string): string {
    const existing = this.canvasElements.get(ctxName)
    if (existing) return existing
    // O elemento <canvas> recebe o nome `canvas` (colisões viram `canvas_2`…).
    // Antes era `${ctx}Canvas` (ex.: `ctxCanvas`), menos legível para o aluno.
    const name = this.allocate(`__canvas_${ctxName}`, 'canvas')
    this.canvasElements.set(ctxName, name)
    // Registra o elemento sob o próprio nome para que o aluno possa referenciá-lo
    // diretamente (ex.: console.log(canvas)) sem o gerador criar um `canvas_2`.
    if (!this.byOriginal.has(name)) this.byOriginal.set(name, name)
    return name
  }

  private allocate(key: string, base: string): string {
    // `suffix < 2` significa "tentar a base nua primeiro"; >= 2 retoma da última
    // tentativa desta base (os sufixos abaixo já foram consumidos por ela).
    let suffix = this.nextSuffix.get(base) ?? 0
    let candidate = suffix < 2 ? base : `${base}_${suffix}`
    while (this.used.has(candidate)) {
      suffix = suffix < 2 ? 2 : suffix + 1
      candidate = `${base}_${suffix}`
    }
    this.nextSuffix.set(base, suffix < 2 ? 2 : suffix + 1)
    this.used.add(candidate)
    this.byOriginal.set(key, candidate)
    return candidate
  }
}

export function createIdentifierScope(): IdentifierScope {
  return new IdentifierScope()
}

export function compileExpr(
  expr: JSExpr,
  parentPrecedence = 0,
  identifiers: IdentifierResolver = defaultIdentifierResolver,
  rec?: ExprMapContext,
): string {
  // Registra a (sub)expressão no source map (linha única). Filhos registram a si
  // mesmos no topo da própria chamada recursiva — por isso `rec` é repassado.
  if (rec && expr.__id) rec.map.record(expr.__id, 'script.js', rec.line, rec.line)
  if (isCanvasExpression(expr)) {
    const canvasCode = canvasExpressionToCode(expr, identifiers, rec, {
      compileExpression: compileExpr,
    })
    if (canvasCode !== undefined) return canvasCode
    throw new GeneratorError(`Expressão Canvas sem codec: ${expr.type}`)
  }
  if (isProgrammingExpressionIR(expr)) {
    return programmingExpressionIRToCode(expr, parentPrecedence, identifiers, rec, {
      compileExpression: compileExpr,
      compileStatements: (statements, indent, scope) =>
        compileStatementsInjected?.(statements, indent, scope) ?? '',
      escapeTemplateText,
      formatNumber,
      isPureExpression: isPureExpr,
      normalizeHex,
      objectKey,
    })
  }
  switch (expr.type) {
    case 'g2d:keyDown':
      return `SZGame2D.keyDown(${JSON.stringify(expr.key)})`
    case 'g2d:touches':
      return `SZGame2D.touches(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g2d:countGroup':
      return `SZGame2D.countGroup(${identifiers.get(expr.groupVar)})`
    case 'g2d:spriteAngle':
      return `SZGame2D.spriteAngleDeg(${identifiers.get(expr.spriteVar)})`
    case 'g2d:distance':
      return `SZGame2D.distance(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g2d:angleTo':
      return `SZGame2D.angleTo(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g2d:getHealth':
      return `SZGame2D.getHealth(${identifiers.get(expr.spriteVar)})`
    case 'g2d:getMaxHealth':
      return `SZGame2D.getMaxHealth(${identifiers.get(expr.spriteVar)})`
    case 'g2d:enemyDamage':
      return `SZGame2D.enemyDamage(${identifiers.get(expr.spriteVar)})`
    case 'g2d:animEnded':
      return `SZGame2D.animationEnded(${identifiers.get(expr.spriteVar)})`
    case 'g2d:spriteX':
      return `SZGame2D.spriteX(${identifiers.get(expr.spriteVar)})`
    case 'g2d:spriteY':
      return `SZGame2D.spriteY(${identifiers.get(expr.spriteVar)})`
    case 'g2d:spriteW':
      return `SZGame2D.spriteW(${identifiers.get(expr.spriteVar)})`
    case 'g2d:spriteH':
      return `SZGame2D.spriteH(${identifiers.get(expr.spriteVar)})`
    case 'g2d:centerX':
      return `SZGame2D.centerX(${identifiers.get(expr.spriteVar)})`
    case 'g2d:centerY':
      return `SZGame2D.centerY(${identifiers.get(expr.spriteVar)})`
    case 'g2d:shapeW':
      return 'SZGame2D.shapeW()'
    case 'g2d:shapeH':
      return 'SZGame2D.shapeH()'
    case 'g2d:spriteVx':
      return `SZGame2D.spriteVx(${identifiers.get(expr.spriteVar)})`
    case 'g2d:spriteVy':
      return `SZGame2D.spriteVy(${identifiers.get(expr.spriteVar)})`
    case 'g2d:spriteSpeed':
      return `SZGame2D.spriteSpeed(${identifiers.get(expr.spriteVar)})`
    case 'g2d:isMoving':
      return `SZGame2D.isMoving(${identifiers.get(expr.spriteVar)})`
    case 'g2d:isMovingH':
      return `SZGame2D.isMovingH(${identifiers.get(expr.spriteVar)})`
    case 'g2d:isMovingV':
      return `SZGame2D.isMovingV(${identifiers.get(expr.spriteVar)})`
    case 'g2d:randomBetween':
      return `SZGame2D.randomBetween(${compileExpr(valueToExpr(expr.min), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.max), 0, identifiers, rec)})`
    case 'g2d:randomChance':
      return `SZGame2D.randomChance(${compileExpr(valueToExpr(expr.percent), 0, identifiers, rec)})`
    case 'g2d:hasHealth':
      return `SZGame2D.hasHealth(${identifiers.get(expr.spriteVar)})`
    case 'g2d:healthDepleted':
      return `SZGame2D.healthDepleted(${identifiers.get(expr.spriteVar)})`
    case 'g2d:isInvincible':
      return `SZGame2D.isInvincible(${identifiers.get(expr.spriteVar)})`
    case 'g2d:cooldownReady': {
      const stableKey = expr.__id ? `, ${JSON.stringify(expr.__id)}` : ''
      return `SZGame2D.cooldownReady(${identifiers.get(expr.spriteVar)}, ${compileExpr(valueToExpr(expr.frames), 0, identifiers, rec)}${stableKey})`
    }
    case 'g2d:isPaused':
      return 'SZGame2D.isPaused()'
    case 'g2d:cameraX':
      return 'SZGame2D.cameraX()'
    case 'g2d:cameraY':
      return 'SZGame2D.cameraY()'
    case 'g2d:randomX':
      return 'SZGame2D.randomX()'
    case 'g2d:randomY':
      return 'SZGame2D.randomY()'
    case 'g2d:tileAtSprite':
      return `SZGame2D.tileAtSprite(${identifiers.get(expr.mapVar)}, ${identifiers.get(expr.spriteVar)})`
    case 'g2d:sceneIs':
      return `SZGame2D.sceneIs(${JSON.stringify(expr.name)})`
    case 'g2d:levelIsActive':
      return `SZGame2D.levelIsActive(${identifiers.get(expr.levelVar)})`
    case 'g2d:stickPathFell':
      return `SZGame2D.stickPathFell(${identifiers.get(expr.pathVar)})`
    case 'g2d:balloonPathMeters':
      return `SZGame2D.balloonPathMeters(${identifiers.get(expr.pathVar)})`
    case 'g2d:balloonFuel':
      return `SZGame2D.balloonFuel(${identifiers.get(expr.spriteVar)})`
    case 'g2d:balloonLandedOut':
      return `SZGame2D.balloonLandedOut(${identifiers.get(expr.spriteVar)})`
    case 'g2d:pointerDown':
      return 'SZGame2D.pointerDown()'
    case 'g2d:aimReleased':
      return `SZGame2D.aimReleased(${identifiers.get(expr.throwerVar)})`
    case 'g2d:bananaHitThrower':
      return `SZGame2D.bananaHitThrower(${identifiers.get(expr.cityVar)}, ${identifiers.get(expr.throwerVar)})`
    case 'g2d:bananaHitCity':
      return `SZGame2D.bananaHitCity(${identifiers.get(expr.cityVar)})`
    case 'g3d:keyDown':
      return `SZGame3D.keyDown(${JSON.stringify(expr.key)})`
    case 'g3d:collides':
      return `SZGame3D.collides(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g3d:hitAny':
      return `SZGame3D.hitAny(${identifiers.get(expr.objVar)}, ${identifiers.get(expr.groupVar)})`
    case 'g3d:crosserHit':
      return `SZGame3D.crosserHit(${identifiers.get(expr.objVar)}, ${identifiers.get(expr.worldVar)})`
    case 'g3d:crosserRow':
      return `SZGame3D.crosserRow(${identifiers.get(expr.objVar)})`
    case 'g3d:touchesBox':
      return `SZGame3D.touchesBox(${identifiers.get(expr.objVar)}, ${identifiers.get(expr.groupVar)})`
    case 'g3d:distanceTo':
      return `SZGame3D.distanceTo(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g3d:countSwarm':
      return `SZGame3D.countSwarm(${identifiers.get(expr.swarmVar)})`
    case 'g3d:countGroup':
      return `SZGame3D.countGroup(${identifiers.get(expr.groupVar)})`
    case 'g3d:isNear':
      return `SZGame3D.isNear(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)}, ${compileExpr(valueToExpr(expr.dist), 0, identifiers, rec)})`
    case 'g3d:raceHit':
      return `SZGame3D.raceHit(${identifiers.get(expr.objVar)}, ${identifiers.get(expr.worldVar)})`
    case 'g3d:raceLaps':
      return `SZGame3D.raceLaps(${identifiers.get(expr.objVar)})`
    case 'g3d:stackScore':
      return `SZGame3D.stackScore(${identifiers.get(expr.worldVar)})`
    case 'g3d:stackGameOver':
      return `SZGame3D.stackGameOver(${identifiers.get(expr.worldVar)})`
    case 'g3d:getPos':
      return `SZGame3D.getPos(${identifiers.get(expr.objVar)}, ${JSON.stringify(expr.axis)})`
    case 'g3d:getRot':
      return `SZGame3D.getRot(${identifiers.get(expr.objVar)}, ${JSON.stringify(expr.axis)})`
    case 'g3d:getScale':
      return `SZGame3D.getScale(${identifiers.get(expr.objVar)})`
    case 'g3d:getVel':
      return `SZGame3D.getVel(${identifiers.get(expr.objVar)}, ${JSON.stringify(expr.axis)})`
    case 'g3d:getSpeed':
      return `SZGame3D.getSpeed(${identifiers.get(expr.objVar)})`
    case 'g3d:isMoving':
      return `SZGame3D.isMoving(${identifiers.get(expr.objVar)})`
    case 'g3d:dt':
      return `SZGame3D.dt(${identifiers.get(expr.worldVar)})`
    case 'g3d:angleTo':
      return `SZGame3D.angleTo(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g3d:pickAtMouse':
      return `SZGame3D.pickAtMouse(${identifiers.get(expr.worldVar)})`
    case 'g3d:pointerOver':
      return `SZGame3D.pointerOver(${identifiers.get(expr.worldVar)}, ${identifiers.get(expr.objVar)})`
    case 'g3d:aimAhead':
      return `SZGame3D.aimAhead(${identifiers.get(expr.worldVar)}, ${identifiers.get(expr.objVar)}, ${compileExpr(valueToExpr(expr.dist), 0, identifiers, rec)})`
    case 'g3d:onGround':
      return `SZGame3D.onGround(${identifiers.get(expr.worldVar)}, ${identifiers.get(expr.objVar)})`
    case 'g3d:groundHeight':
      return `SZGame3D.groundHeight(${identifiers.get(expr.worldVar)}, ${identifiers.get(expr.objVar)})`
    // ----- game-2d-advanced (kit profissional) -----
    case 'gk:gameWidth':
      return 'SZGameKit.width()'
    case 'gk:gameHeight':
      return 'SZGameKit.height()'
    case 'gk:gameState':
      return 'SZGameKit.state()'
    case 'gk:stateIs':
      return `SZGameKit.stateIs(${JSON.stringify(expr.name)})`
    case 'gk:charactersTouch':
      return `SZGameKit.touching(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'gk:charX':
      return `SZGameKit.charX(${identifiers.get(expr.charVar)})`
    case 'gk:charY':
      return `SZGameKit.charY(${identifiers.get(expr.charVar)})`
    case 'gk:keyDown':
      return `SZGameKit.keyDown(${JSON.stringify(expr.key)})`
    case 'gk:keyPressed':
      return `SZGameKit.keyPressed(${JSON.stringify(expr.key)})`
    case 'gk:countActive':
      return `SZGameKit.countActive(${JSON.stringify(expr.mold)})`
    case 'gk:touchCircle':
      return `SZGameKit.touchCircle(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'gk:didHit':
      return `SZGameKit.didHit(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'gk:isOnGround':
      return `SZGameKit.isOnGround(${identifiers.get(expr.charVar)})`
    case 'gk:isInside':
      return `SZGameKit.isInside(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.region)})`
    case 'gk:overlapPercent':
      return `SZGameKit.overlapPercent(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.region)})`
    case 'gk:chance':
      return `SZGameKit.chance(${compileExpr(valueToExpr(expr.percent), 0, identifiers, rec)})`
    case 'gk:distanceBetween':
      return `SZGameKit.distanceBetween(${identifiers.get(expr.a)}, ${identifiers.get(expr.b)})`
    case 'gk:pointIn':
      return `SZGameKit.pointIn(${compileExpr(valueToExpr(expr.x), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.y), 0, identifiers, rec)}, ${identifiers.get(expr.charVar)})`
    case 'gk:opacityOf':
      return `SZGameKit.opacityOf(${identifiers.get(expr.charVar)})`
    case 'gk:savedValue':
      return `SZGameKit.savedValue(${JSON.stringify(expr.name)})`
    // 👾 R16
    case 'gk:pkmLevelOf':
      return `SZGameKit.pkmLevelOf(${JSON.stringify(expr.creature)})`
    case 'gk:pkmHas':
      return `SZGameKit.pkmHas(${JSON.stringify(expr.creature)})`
    case 'gk:pkmTeamSize':
      return 'SZGameKit.pkmTeamSize()'
    case 'gk:pkmBallCount':
      return 'SZGameKit.pkmBallCount()'
    case 'gk:pkmCaught':
      return 'SZGameKit.pkmCaught()'
    case 'gk:velocityOf':
      return `SZGameKit.velocityOf(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.axis)})`
    case 'gk:propertyOf':
      return `SZGameKit.propertyOf(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.prop)})`
    case 'gk:facingOf':
      return `SZGameKit.facingOf(${identifiers.get(expr.charVar)})`
    case 'gk:cooldownReady':
      return `SZGameKit.cooldownReady(${identifiers.get(expr.charVar)}, ${compileExpr(valueToExpr(expr.seconds), 0, identifiers, rec)})`
    case 'gk:tileAt':
      return `SZGameKit.tileAt(${JSON.stringify(expr.map)}, ${compileExpr(valueToExpr(expr.x), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.y), 0, identifiers, rec)})`
    case 'gk:isDead':
      return `SZGameKit.isDead(${identifiers.get(expr.charVar)})`
    case 'gk:isInvincible':
      return `SZGameKit.isInvincible(${identifiers.get(expr.charVar)})`
    case 'gk:healthOf':
      return `SZGameKit.healthOf(${identifiers.get(expr.charVar)})`
    case 'gk:animEnded':
      return `SZGameKit.animEnded(${identifiers.get(expr.charVar)})`
    case 'gk:lutaWinner':
      return 'SZGameKit.lutaWinner()'
    case 'gk:lutaRound':
      return 'SZGameKit.lutaRoundNow()'
    case 'gk:lutaWinsOf':
      return `SZGameKit.lutaWinsOf(${identifiers.get(expr.charVar)})`
    case 'gk:lutaCombo':
      return `SZGameKit.lutaComboOf(${identifiers.get(expr.charVar)})`
    case 'gk:lutaSpecial':
      return `SZGameKit.lutaSpecialOf(${identifiers.get(expr.charVar)})`
    case 'gk:lutaIsGuarding':
      return `SZGameKit.lutaIsGuarding(${identifiers.get(expr.charVar)})`
    case 'gk:entityState':
      return `SZGameKit.entityState(${identifiers.get(expr.charVar)})`
    case 'gk:angleOf':
      return `SZGameKit.angleOf(${identifiers.get(expr.charVar)})`
    case 'gk:angleTo':
      return `SZGameKit.angleTo(${identifiers.get(expr.charVar)}, ${identifiers.get(expr.targetVar)})`
    case 'gk:nearestActive':
      return `SZGameKit.nearestActive(${JSON.stringify(expr.mold)}, ${compileExpr(valueToExpr(expr.x), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.y), 0, identifiers, rec)})`
    case 'gk:randomActive':
      return `SZGameKit.randomActive(${JSON.stringify(expr.mold)})`
    case 'gk:navePowerOf':
      return `SZGameKit.navePowerOf(${identifiers.get(expr.charVar)})`
    case 'gk:pathProgress':
      return `SZGameKit.pathProgress(${identifiers.get(expr.charVar)})`
    case 'gk:pickActive':
      return `SZGameKit.pickActive(${JSON.stringify(expr.mold)}, ${JSON.stringify(expr.mode)}, ${JSON.stringify(expr.prop)})`
    case 'gk:tdCoins':
      return 'SZGameKit.tdCoins()'
    case 'gk:countItem':
      return `SZGameKit.rpgCountItem(${JSON.stringify(expr.name)})`
    case 'gk:timeSurvived':
      return 'SZGameKit.timeSurvived()'
    case 'gk:cameraX':
      return 'SZGameKit.cameraX()'
    case 'gk:cameraY':
      return 'SZGameKit.cameraY()'
    case 'gk:mouseX':
      return 'SZGameKit.mouseX()'
    case 'gk:mouseY':
      return 'SZGameKit.mouseY()'
    case 'gk:mouseScreenX':
      return 'SZGameKit.mouseScreenX()'
    case 'gk:mouseScreenY':
      return 'SZGameKit.mouseScreenY()'
    case 'gk:mouseDown':
      return 'SZGameKit.mouseDown()'
    case 'gk:rpgCell':
      return `SZGameKit.rpgCell(${compileExpr(valueToExpr(expr.n), 0, identifiers, rec)})`
    case 'gk:rpgHasFlag':
      return `SZGameKit.rpgHasFlag(${JSON.stringify(expr.flag)})`
    case 'gk:rpgHasItem':
      return `SZGameKit.rpgHasItem(${JSON.stringify(expr.item)})`
    case 'gk:rpgBattleWon':
      return 'SZGameKit.rpgBattleWon()'
    case 'gk:rpgHasSave':
      return 'SZGameKit.rpgHasSave()'
    case 'gk:rpgLevel':
      return 'SZGameKit.rpgLevel()'
    case 'gk:rpgXp':
      return 'SZGameKit.rpgXp()'
    case 'gk:battlerLife':
      return `SZGameKit.battlerLife(${JSON.stringify(expr.name)})`
    case 'gk:battlerMaxLife':
      return `SZGameKit.battlerMaxLife(${JSON.stringify(expr.name)})`
    case 'gk:rpgCurrentMap':
      return 'SZGameKit.rpgCurrentMap()'
    case 'gk:boardGet':
      return `SZGameKit.boardGet(${JSON.stringify(expr.name)}, ${compileExpr(valueToExpr(expr.col), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.row), 0, identifiers, rec)})`
    case 'gk:boardCount':
      return `SZGameKit.boardCount(${JSON.stringify(expr.name)}, ${compileExpr(valueToExpr(expr.value), 0, identifiers, rec)})`
    case 'gk:boardIn':
      return `SZGameKit.boardIn(${JSON.stringify(expr.name)}, ${compileExpr(valueToExpr(expr.col), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.row), 0, identifiers, rec)})`
    case 'gk:rollDice':
      return `SZGameKit.rollDice(${compileExpr(valueToExpr(expr.faces), 0, identifiers, rec)})`
    case 'gk:currentPlayer':
      return 'SZGameKit.currentPlayer()'
    case 'gk:spaceOf':
      return `SZGameKit.spaceOf(${identifiers.get(expr.who)})`
    case 'gk:pileTop':
      return `SZGameKit.pileTop(${identifiers.get(expr.pileVar)})`
    case 'gk:pileSize':
      return `SZGameKit.pileSize(${identifiers.get(expr.pileVar)})`
    case 'gk:card':
      return `SZGameKit.card(${compileExpr(valueToExpr(expr.front), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.back), 0, identifiers, rec)})`
    case 'gk:cardIsUp':
      return `SZGameKit.cardIsUp(${compileExpr(valueToExpr(expr.card), 0, identifiers, rec)})`
    case 'gk:cardFace':
      return `SZGameKit.cardFace(${compileExpr(valueToExpr(expr.card), 0, identifiers, rec)})`
    case 'gk:cardAt':
      return `SZGameKit.cardAt(${compileExpr(valueToExpr(expr.x), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.y), 0, identifiers, rec)}, ${identifiers.get(expr.pileVar)})`
    case 'gk:cardsEnergy':
      return 'SZGameKit.cardsEnergy()'
    case 'gk:cardsHeroLife':
      return 'SZGameKit.cardsHeroLife()'
    case 'gk:cardsEnemyLife':
      return 'SZGameKit.cardsEnemyLife()'
    case 'gk:cardsIntentAction':
      return 'SZGameKit.cardsIntentAction()'
    case 'gk:cardsIntentValue':
      return 'SZGameKit.cardsIntentValue()'
    case 'gk:kills':
      return 'SZGameKit.kills()'
    // ---- Jogo 3D Avançado (game-3d-advanced) ----
    case 'g3k:worldSize':
      return 'SZGameKit3D.worldSize()'
    case 'g3k:countAlive':
      return `SZGameKit3D.countAlive(${JSON.stringify(expr.mold)})`
    case 'g3k:keyDown':
      return `SZGameKit3D.keyDown(${JSON.stringify(expr.key)})`
    case 'g3k:keyPressed':
      return `SZGameKit3D.keyPressed(${JSON.stringify(expr.key)})`
    case 'g3k:mouseDown':
      return 'SZGameKit3D.mouseDown()'
    case 'g3k:mousePressed':
      return 'SZGameKit3D.mousePressed()'
    case 'g3k:posOf':
      return `SZGameKit3D.posOf(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.axis)})`
    case 'g3k:exists':
      return `SZGameKit3D.exists(${identifiers.get(expr.charVar)})`
    case 'g3k:entityStateIs':
      return `SZGameKit3D.entityStateIs(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.state)})`
    case 'g3k:isMold':
      return `SZGameKit3D.isMold(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.mold)})`
    case 'g3k:isAimingAt':
      return `SZGameKit3D.isAimingAt(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g3k:touches':
      return `SZGameKit3D.touches(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)}, ${compileExpr(valueToExpr(expr.dist), 0, identifiers, rec)})`
    case 'g3k:healthOf':
      return `SZGameKit3D.healthOf(${identifiers.get(expr.charVar)})`
    case 'g3k:entityValue':
      return `SZGameKit3D.entityValue(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.key)})`
    case 'g3k:stateTime':
      return `SZGameKit3D.stateTime(${identifiers.get(expr.charVar)})`
    case 'g3k:onGround':
      return `SZGameKit3D.onGround(${identifiers.get(expr.charVar)})`
    case 'g3k:velocityOf':
      return `SZGameKit3D.velocityOf(${identifiers.get(expr.charVar)}, ${JSON.stringify(expr.axis)})`
    case 'g3k:distanceBetween':
      return `SZGameKit3D.distanceBetween(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
    case 'g3k:randomBetween':
      return `SZGameKit3D.randomBetween(${compileExpr(valueToExpr(expr.from), 0, identifiers)}, ${compileExpr(valueToExpr(expr.to), 0, identifiers)})`
    case 'g3k:randomChance':
      return `SZGameKit3D.randomChance(${compileExpr(valueToExpr(expr.percent), 0, identifiers)})`
    case 'g3k:timeLeft':
      return 'SZGameKit3D.timeLeft()'
    case 'g3k:maxHealthOf':
      return `SZGameKit3D.maxHealthOf(${identifiers.get(expr.charVar)})`
    case 'g3k:stateOf':
      return `SZGameKit3D.stateOf(${identifiers.get(expr.charVar)})`
    case 'g3k:pointerOver':
      return `SZGameKit3D.pointerOver(${identifiers.get(expr.charVar)})`
    case 'g3k:groundPoint':
      return `SZGameKit3D.groundPoint(${JSON.stringify(expr.axis)})`
    // ---- Mundo 3D (world-3d) ----
    case 'w3d:worldSize':
      return 'SZWorld3D.worldSize()'
    case 'w3d:groundHeight':
      return `SZWorld3D.groundHeight(${compileExpr(valueToExpr(expr.x), 0, identifiers, rec)}, ${compileExpr(valueToExpr(expr.z), 0, identifiers, rec)})`
    case 'w3d:carPos':
      return `SZWorld3D.carPos(${JSON.stringify(expr.axis)})`
    case 'w3d:carSpeed':
      return 'SZWorld3D.carSpeed()'
    case 'w3d:personPos':
      return `SZWorld3D.personPos(${JSON.stringify(expr.axis)})`
    case 'w3d:isDriving':
      return 'SZWorld3D.isDriving()'
    case 'w3d:coinCount':
      return 'SZWorld3D.coinCount()'
    case 'w3d:hasAchievement':
      return `SZWorld3D.hasAchievement(${JSON.stringify(expr.name)})`
    case 'w3d:inventoryCount':
      return `SZWorld3D.inventoryCount(${JSON.stringify(expr.item)})`
    case 'w3d:inventoryHas':
      return `SZWorld3D.inventoryHas(${JSON.stringify(expr.item)}, ${compileExpr(valueToExpr(expr.n), 0, identifiers, rec)})`
    case 'w3d:keyDown':
      return `SZWorld3D.keyDown(${JSON.stringify(expr.key)})`
    case 'w3d:keyPressed':
      return `SZWorld3D.keyPressed(${JSON.stringify(expr.key)})`
    case 'w3d:timeOfDay':
      return 'SZWorld3D.timeOfDay()'
    case 'w3d:raceTime':
      return 'SZWorld3D.raceTime()'
    case 'w3d:raceBest':
      return 'SZWorld3D.raceBest()'
    case 'w3d:pinsDown':
      return 'SZWorld3D.pinsDown()'
    case 'w3d:knockedCount':
      return 'SZWorld3D.knockedCount()'
    case 'g3k:stateIs':
      return `SZGameKit3D.stateIs(${JSON.stringify(expr.name)})`
    case 'g3k:gameState':
      return 'SZGameKit3D.state()'

    case 'now':
      switch (expr.kind) {
        case 'year':
          return 'new Date().getFullYear()'
        case 'date':
          return 'new Date().toLocaleDateString()'
        case 'time':
          return 'new Date().toLocaleTimeString()'
      }
      return ''

    default: {
      // Sem este ramo, uma expressão fora do esquema (ex.: IR de um JSON
      // importado por um estranho) caía pela borda do `switch` e `compileExpr`
      // devolvia `undefined`, interpolado como a STRING `"undefined"` no código
      // gerado — bug silencioso. A atribuição a `never` é o verdadeiro valor:
      // se um dia surgir uma variante de `JSExpr` sem `case` aqui, ela vira
      // ERRO DE COMPILAÇÃO (TS reclama que o tipo não é `never`), forçando o
      // autor a tratá-la. Em runtime, lança erro tipado e capturável.
      const _never: never = expr
      throw new GeneratorError(
        `Expressão de IR não suportada: ${JSON.stringify((_never as { type?: unknown }).type)}`,
      )
    }
  }
}

/**
 * Uma expressão é "pura" quando reemiti-la (texto idêntico) não muda o
 * comportamento — ou seja, avaliá-la duas vezes equivale a avaliá-la uma só.
 * Usada pelo `random` para decidir entre a forma inline (limites duplicados,
 * legível) e a IIFE (limite avaliado uma única vez). Tipos que CHAMAM código do
 * aluno (`call`/`callMethodExpr`/`memberCallExpr`) ou que carregam estado/efeito
 * (`shuffle`, `storageGet`, `now`, `randomFloat`, `random`, …) são impuros; os
 * compostos só são puros quando TODOS os filhos também são.
 */
function isPureExpr(expr: JSExpr): boolean {
  switch (expr.type) {
    case 'num':
    case 'str':
    case 'color':
    case 'colorAlpha':
    case 'bool':
    case 'null':
    case 'var':
    case 'thisRef':
    case 'thisProp':
    case 'propAccess':
    case 'arrayLength':
    case 'mathConst':
    case 'eventProp':
    case 'global':
    case 'canvasDim':
    case 'datasetGet':
    case 'classContains':
      return true
    case 'canvasMeasureText':
      return isPureExpr(expr.text)
    case 'binop':
    case 'logical':
      return isPureExpr(expr.left) && isPureExpr(expr.right)
    case 'logicalNot':
      return isPureExpr(expr.value)
    case 'ternary':
      return isPureExpr(expr.condition) && isPureExpr(expr.whenTrue) && isPureExpr(expr.whenFalse)
    case 'mathUnary':
      return isPureExpr(expr.arg)
    case 'mathBinary':
      return isPureExpr(expr.a) && isPureExpr(expr.b)
    case 'arrayMap':
    case 'arrayFilter':
      return false
    // Instanciar roda o construtor do aluno (efeitos arbitrários) — impuro.
    case 'newExpr':
      return false
    case 'distance':
      return isPureExpr(expr.a) && isPureExpr(expr.b)
    case 'angleConvert':
      return isPureExpr(expr.arg)
    case 'vec2':
      return isPureExpr(expr.x) && isPureExpr(expr.y)
    case 'vec3':
      return isPureExpr(expr.x) && isPureExpr(expr.y) && isPureExpr(expr.z)
    case 'memberGet':
      return isPureExpr(expr.object)
    case 'index':
      return isPureExpr(expr.index)
    case 'array':
      return expr.items.every(isPureExpr)
    case 'concat':
    case 'concatArrays':
      return expr.parts.every(isPureExpr)
    case 'objectLiteral':
      return expr.entries.every((e) => isPureExpr(e.value))
    case 'hslColor':
      return isPureExpr(expr.h) && isPureExpr(expr.s) && isPureExpr(expr.l)
    default:
      // Inclui call/callMethodExpr/memberCallExpr/shuffle/storageGet/now/
      // random/randomFloat: na dúvida, trata como impuro (usa a IIFE).
      return false
  }
}

/** Chave de objeto literal: nome cru se for identificador válido, senão entre aspas. */
function objectKey(key: string): string {
  // `__proto__` casa o regex de identificador, mas como chave CRUA num literal
  // (`{ __proto__: v }`) ela é especial: define o PROTÓTIPO do objeto em vez de
  // uma propriedade própria — `obj.__proto__` não enumera e o objeto herda de
  // `v`. Forçar as aspas (`{ "__proto__": v }`) volta a ser uma propriedade
  // própria normal, que é o que o aluno espera. `constructor`/`prototype` não
  // têm esse tratamento especial em literais e não precisam de ajuste.
  if (key === '__proto__') return JSON.stringify(key)
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
}

/** Escapa texto literal para dentro de um template literal (backtick, barra e `${`). */
function escapeTemplateText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? `${n}` : `${n}`
}

/**
 * Normaliza um hex de cor para a forma `#rrggbb`. Aceita `#rgb` (expande cada
 * dígito) e `#rrggbb`; qualquer outro valor (vazio, sem `#`, comprimento
 * errado) cai para `#000000` — evita `rgba(NaN, …)` a partir de hex malformado.
 */
function normalizeHex(hex: string): string {
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return '#000000'
  if (hex.length === 4) {
    // #rgb → #rrggbb: duplica cada dígito.
    const r = hex.slice(1, 2)
    const g = hex.slice(2, 3)
    const b = hex.slice(3, 4)
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return hex
}
