import type { JSExpr } from '#ir'
import { normalizeIdentifier, safeIdent } from './identifier'
import type { SourceMapBuilder } from './sourceMap'

// `normalizeIdentifier`/`safeIdent` foram extraídos para `./identifier` (são
// compartilhados com a camada de blocos via `paramsMutator`). Re-exportamos aqui
// para que os importadores existentes (`js.ts`) continuem funcionando.
export { normalizeIdentifier, safeIdent }

/**
 * Contexto opcional de source map para expressões. Como `compileExpr` nunca
 * emite `\n`, toda (sub)expressão vive numa única linha — basta registrar
 * `__id → linha`. A linha é a mesma para a expressão e seus filhos.
 */
export interface ExprMapContext {
  map: SourceMapBuilder
  line: number
}

/** Precedência do operador ternário (`?:`): a mais baixa, abaixo de `||`. */
const TERNARY_PRECEDENCE = 0.5

const PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '===': 3,
  '!==': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
  '**': 7,
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
  switch (expr.type) {
    case 'num':
      return formatNumber(expr.value)
    case 'str':
    case 'color':
      return JSON.stringify(expr.value)
    case 'colorAlpha': {
      // `hex` é irText() não validado — sem normalizar, um valor malformado vira
      // `rgba(NaN, NaN, NaN, …)`. Aceita #rgb (expande p/ #rrggbb) e #rrggbb;
      // qualquer outra coisa cai para preto. Alpha é truncado a [0, 1].
      const normalized = normalizeHex(expr.hex)
      const r = Number.parseInt(normalized.slice(1, 3), 16)
      const g = Number.parseInt(normalized.slice(3, 5), 16)
      const b = Number.parseInt(normalized.slice(5, 7), 16)
      const alpha = Math.min(1, Math.max(0, Number.isFinite(expr.alpha) ? expr.alpha : 0))
      const a = Math.round(alpha * 100) / 100
      return JSON.stringify(`rgba(${r}, ${g}, ${b}, ${a})`)
    }
    case 'bool':
      return expr.value ? 'true' : 'false'
    case 'var':
      return identifiers.get(expr.name)
    case 'binop': {
      const p = PRECEDENCE[expr.op] ?? 0
      const left = compileExpr(expr.left, p, identifiers, rec)
      const right = compileExpr(expr.right, p + 1, identifiers, rec)
      const out = `${left} ${expr.op} ${right}`
      return p < parentPrecedence ? `(${out})` : out
    }
    case 'logical': {
      const p = PRECEDENCE[expr.op] ?? 0
      const left = compileExpr(expr.left, p, identifiers, rec)
      const right = compileExpr(expr.right, p + 1, identifiers, rec)
      const out = `${left} ${expr.op} ${right}`
      return p < parentPrecedence ? `(${out})` : out
    }
    case 'ternary': {
      // A condição não pode ser ela própria um ternário sem parênteses (só liga
      // até `||`); por isso compila com precedência de `||`. Os ramos aceitam
      // ternários aninhados sem parênteses (associatividade à direita).
      const cond = compileExpr(expr.condition, PRECEDENCE['||'] ?? 1, identifiers, rec)
      const whenTrue = compileExpr(expr.whenTrue, 0, identifiers, rec)
      const whenFalse = compileExpr(expr.whenFalse, 0, identifiers, rec)
      const out = `${cond} ? ${whenTrue} : ${whenFalse}`
      return parentPrecedence > TERNARY_PRECEDENCE ? `(${out})` : out
    }
    case 'call': {
      const args = expr.args.map((a) => compileExpr(a, 0, identifiers, rec)).join(', ')
      return `${identifiers.get(expr.name)}(${args})`
    }
    case 'g2d:keyDown':
      return `SZGame2D.keyDown(${JSON.stringify(expr.key)})`
    case 'g2d:touches':
      return `SZGame2D.touches(${identifiers.get(expr.aVar)}, ${identifiers.get(expr.bVar)})`
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
    case 'global':
      return expr.kind === 'innerWidth' ? 'window.innerWidth' : 'window.innerHeight'
    case 'canvasDim':
      return `${identifiers.getCanvasElement(expr.ctxVar)}.${expr.dim}`
    case 'random': {
      const min = compileExpr(expr.min, 0, identifiers, rec)
      const max = compileExpr(expr.max, 0, identifiers, rec)
      // Parenteses explícitos em cada operando: compilados em precedência 0, os
      // limites aditivos (ex.: `a - b`) sairiam sem parênteses e a aritmética
      // ficaria errada (`(m - a - b + 1)`).
      if (isPureExpr(expr.min) && isPureExpr(expr.max)) {
        // Limites sem efeito colateral: inline legível (o `min` aparecer duas
        // vezes é inofensivo). Mantém a forma que o aluno reconhece.
        return `Math.floor(Math.random() * ((${max}) - (${min}) + 1)) + (${min})`
      }
      // Limite com efeito colateral (ex.: `lista.pop()`): a forma inline emitia
      // `min` DUAS vezes, avaliando o efeito em dobro. Uma IIFE liga cada limite
      // a um parâmetro, garantindo avaliação única na ordem min→max.
      return `((a, b) => Math.floor(Math.random() * (b - a + 1)) + a)(${min}, ${max})`
    }
    case 'hslColor': {
      // Números literais entram inline (`50%`); o resto vira interpolação
      // (`${...}`), reproduzindo o idioma `hsl(${Math.random() * 360}, 50%, 50%)`.
      const part = (e: JSExpr) =>
        e.type === 'num' ? formatNumber(e.value) : `\${${compileExpr(e, 0, identifiers, rec)}}`
      return `\`hsl(${part(expr.h)}, ${part(expr.s)}%, ${part(expr.l)}%)\``
    }
    case 'randomFloat':
      return 'Math.random()'
    case 'thisRef':
      return 'this'
    case 'thisProp':
      return `this.${normalizeIdentifier(expr.name)}`
    case 'propAccess':
      return `${identifiers.get(expr.objectVar)}.${normalizeIdentifier(expr.name)}`
    case 'callMethodExpr': {
      const args = expr.args.map((a) => compileExpr(a, 0, identifiers, rec)).join(', ')
      return `${identifiers.get(expr.objectVar)}.${normalizeIdentifier(expr.method)}(${args})`
    }
    case 'mathUnary':
      return `Math.${expr.fn}(${compileExpr(expr.arg, 0, identifiers, rec)})`
    case 'mathBinary':
      return `Math.${expr.fn}(${compileExpr(expr.a, 0, identifiers, rec)}, ${compileExpr(expr.b, 0, identifiers, rec)})`
    case 'distance': {
      if (isPureExpr(expr.a) && isPureExpr(expr.b)) {
        // Operandos sem efeito colateral: forma inline legível (cada operando
        // aparecer duas vezes é inofensivo). `MEMBER_PRECEDENCE` força parênteses
        // em torno de operadores (ex.: `(a + b).x`).
        const a = compileExpr(expr.a, MEMBER_PRECEDENCE, identifiers, rec)
        const b = compileExpr(expr.b, MEMBER_PRECEDENCE, identifiers, rec)
        return `Math.hypot(${a}.x - ${b}.x, ${a}.y - ${b}.y)`
      }
      // Operando com efeito colateral (ex.: `lista.pop()`): a forma inline emitia
      // cada operando DUAS vezes, avaliando o efeito em dobro. Uma IIFE liga cada
      // operando a um parâmetro, garantindo avaliação única na ordem a→b.
      const a = compileExpr(expr.a, 0, identifiers, rec)
      const b = compileExpr(expr.b, 0, identifiers, rec)
      return `((a, b) => Math.hypot(a.x - b.x, a.y - b.y))(${a}, ${b})`
    }
    case 'mathConst':
      return `Math.${expr.name}`
    case 'angleConvert': {
      const arg = compileExpr(expr.arg, 0, identifiers, rec)
      return expr.dir === 'degToRad' ? `(${arg} * Math.PI / 180)` : `(${arg} * 180 / Math.PI)`
    }
    case 'eventProp':
      return `event.${expr.prop}`
    case 'storageGet': {
      const store = expr.store === 'session' ? 'sessionStorage' : 'localStorage'
      return `${store}.getItem(${compileExpr(expr.key, 0, identifiers, rec)})`
    }
    case 'vec2':
      return `{ x: ${compileExpr(expr.x, 0, identifiers, rec)}, y: ${compileExpr(expr.y, 0, identifiers, rec)} }`
    case 'vec3':
      return `{ x: ${compileExpr(expr.x, 0, identifiers, rec)}, y: ${compileExpr(expr.y, 0, identifiers, rec)}, z: ${compileExpr(expr.z, 0, identifiers, rec)} }`
    case 'array':
      return `[${expr.items.map((it) => compileExpr(it, 0, identifiers, rec)).join(', ')}]`
    case 'arrayLength':
      return `${identifiers.get(expr.arrayVar)}.length`
    case 'datasetGet': {
      const base = identifiers.get(expr.objectVar)
      return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(expr.key)
        ? `${base}.dataset.${expr.key}`
        : `${base}.dataset[${JSON.stringify(expr.key)}]`
    }
    case 'classContains': {
      const base =
        expr.targetKind === 'this'
          ? 'this'
          : expr.targetKind === 'var'
            ? identifiers.get(expr.targetId)
            : `document.getElementById(${JSON.stringify(expr.targetId)})`
      return `${base}.classList.contains(${JSON.stringify(expr.className)})`
    }
    case 'concat': {
      const inner = expr.parts
        .map((p) =>
          p.type === 'str'
            ? escapeTemplateText(p.value)
            : `\${${compileExpr(p, 0, identifiers, rec)}}`,
        )
        .join('')
      return `\`${inner}\``
    }
    case 'index':
      return `${identifiers.get(expr.arrayVar)}[${compileExpr(expr.index, 0, identifiers, rec)}]`
    case 'concatArrays':
      return `[${expr.parts.map((p) => `...${compileExpr(p, 0, identifiers, rec)}`).join(', ')}]`
    case 'shuffle':
      return `${identifiers.get(expr.arrayVar)}.sort(() => Math.random() - 0.5)`
    case 'objectLiteral': {
      if (expr.entries.length === 0) return '{}'
      const parts = expr.entries
        .map((e) => `${objectKey(e.key)}: ${compileExpr(e.value, 0, identifiers, rec)}`)
        .join(', ')
      return `{ ${parts} }`
    }
    case 'memberGet':
      return `${compileExpr(expr.object, MEMBER_PRECEDENCE, identifiers, rec)}.${normalizeIdentifier(expr.name)}`
    case 'memberCallExpr': {
      const args = expr.args.map((a) => compileExpr(a, 0, identifiers, rec)).join(', ')
      return `${compileExpr(expr.object, MEMBER_PRECEDENCE, identifiers, rec)}.${normalizeIdentifier(expr.method)}(${args})`
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
    case 'binop':
    case 'logical':
      return isPureExpr(expr.left) && isPureExpr(expr.right)
    case 'ternary':
      return isPureExpr(expr.condition) && isPureExpr(expr.whenTrue) && isPureExpr(expr.whenFalse)
    case 'mathUnary':
      return isPureExpr(expr.arg)
    case 'mathBinary':
      return isPureExpr(expr.a) && isPureExpr(expr.b)
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

/**
 * Precedência (alta) do acesso a membro: ao compilar o OBJETO de
 * `memberGet`/`memberCallExpr`, força parênteses em torno de operadores
 * (ex.: `(a + b).x`). Identificadores/`this`/membros não checam precedência,
 * então saem sem parênteses redundantes.
 */
const MEMBER_PRECEDENCE = 20

/** Chave de objeto literal: nome cru se for identificador válido, senão entre aspas. */
function objectKey(key: string): string {
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
