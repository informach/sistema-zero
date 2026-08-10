import type { JSExpr, JSStatement } from '#ir'
import { resolveEventTargetKind } from '#ir'
import {
  compileExpr,
  type ExprMapContext,
  type IdentifierScope,
  normalizeIdentifier,
} from '../../generators/expr'
import { countLines, type SourceMapBuilder } from '../../generators/sourceMap'

export const PROGRAMMING_IR_TO_CODE_UNHANDLED = Symbol('programming-ir-to-code-unhandled')

type ProgrammingStatementType =
  | 'event'
  | 'requestFullscreen'
  | 'exitFullscreen'
  | 'toggleFullscreen'
  | 'consoleLog'
  | 'alert'
  | 'getProperty'
  | 'getAttribute'
  | 'setProperty'
  | 'setStyle'
  | 'setAttribute'
  | 'var'
  | 'declareVar'
  | 'assign'
  | 'if'
  | 'repeat'
  | 'while'
  | 'doWhile'
  | 'break'
  | 'continue'
  | 'forOf'
  | 'forRange'
  | 'tryCatch'
  | 'forEach'
  | 'setTimeout'
  | 'setInterval'
  | 'setTimeoutSeconds'
  | 'setIntervalSeconds'
  | 'querySelector'
  | 'querySelectorAll'
  | 'storageSet'
  | 'eventMethod'
  | 'fetchJson'
  | 'getElementById'
  | 'classOp'
  | 'createElement'
  | 'createElementNS'
  | 'appendChild'
  | 'throwError'
  | 'objectAssign'
  | 'switch'
  | 'setDataset'
  | 'classDecl'
  | 'newInstance'
  | 'callMethod'
  | 'eventHandler'
  | 'setThisProp'
  | 'setProp'
  | 'memberSet'
  | 'onClickAssign'
  | 'awaitStmt'
  | 'setTimeoutCall'
  | 'indexSet'
  | 'memberCall'
  | 'superCall'
  | 'superMethodCall'
  | 'exprStatement'
  | 'return'
  | 'funcDecl'
  | 'callFunction'
  | 'arrayPush'
  | 'arrayRemove'
  | 'arraySplice'
type ProgrammingExpressionType =
  | 'num'
  | 'str'
  | 'color'
  | 'colorAlpha'
  | 'var'
  | 'bool'
  | 'null'
  | 'isFullscreen'
  | 'systemDark'
  | 'perfNow'
  | 'dateGet'
  | 'global'
  | 'canvasDim'
  | 'random'
  | 'arrayMap'
  | 'hslColor'
  | 'randomFloat'
  | 'thisRef'
  | 'thisProp'
  | 'propAccess'
  | 'binop'
  | 'logical'
  | 'logicalNot'
  | 'ternary'
  | 'mathUnary'
  | 'mathBinary'
  | 'distance'
  | 'mathConst'
  | 'angleConvert'
  | 'eventProp'
  | 'vec2'
  | 'vec3'
  | 'array'
  | 'arrayLength'
  | 'concat'
  | 'concatArrays'
  | 'index'
  | 'arrayLast'
  | 'arrayFind'
  | 'arrayFilter'
  | 'shuffle'
  | 'datasetGet'
  | 'getElement'
  | 'querySelectorValue'
  | 'promiseAll'
  | 'newPromise'
  | 'storageGet'
  | 'classContains'
  | 'callMethodExpr'
  | 'objectLiteral'
  | 'memberGet'
  | 'memberCallExpr'
  | 'newExpr'
  | 'call'
  | 'objectOp'
  | 'indexGet'
export type ProgrammingStatement = Extract<JSStatement, { type: ProgrammingStatementType }>
export type ProgrammingExpression = Extract<JSExpr, { type: ProgrammingExpressionType }>

const PROGRAMMING_STATEMENT_TYPES: ReadonlySet<string> = new Set([
  'event',
  'requestFullscreen',
  'exitFullscreen',
  'toggleFullscreen',
  'consoleLog',
  'alert',
  'getProperty',
  'getAttribute',
  'setProperty',
  'setStyle',
  'setAttribute',
  'var',
  'declareVar',
  'assign',
  'if',
  'repeat',
  'while',
  'doWhile',
  'break',
  'continue',
  'forOf',
  'forRange',
  'tryCatch',
  'forEach',
  'setTimeout',
  'setInterval',
  'setTimeoutSeconds',
  'setIntervalSeconds',
  'querySelector',
  'querySelectorAll',
  'storageSet',
  'eventMethod',
  'fetchJson',
  'getElementById',
  'classOp',
  'createElement',
  'createElementNS',
  'appendChild',
  'throwError',
  'objectAssign',
  'switch',
  'setDataset',
  'classDecl',
  'newInstance',
  'callMethod',
  'eventHandler',
  'setThisProp',
  'setProp',
  'memberSet',
  'onClickAssign',
  'awaitStmt',
  'setTimeoutCall',
  'indexSet',
  'memberCall',
  'superCall',
  'superMethodCall',
  'exprStatement',
  'return',
  'funcDecl',
  'callFunction',
  'arrayPush',
  'arrayRemove',
  'arraySplice',
])
const PROGRAMMING_EXPRESSION_TYPES: ReadonlySet<string> = new Set([
  'num',
  'str',
  'color',
  'colorAlpha',
  'var',
  'bool',
  'null',
  'isFullscreen',
  'systemDark',
  'perfNow',
  'dateGet',
  'global',
  'canvasDim',
  'random',
  'arrayMap',
  'hslColor',
  'randomFloat',
  'thisRef',
  'thisProp',
  'propAccess',
  'binop',
  'logical',
  'logicalNot',
  'ternary',
  'mathUnary',
  'mathBinary',
  'distance',
  'mathConst',
  'angleConvert',
  'eventProp',
  'vec2',
  'vec3',
  'array',
  'arrayLength',
  'concat',
  'concatArrays',
  'index',
  'arrayLast',
  'arrayFind',
  'arrayFilter',
  'shuffle',
  'datasetGet',
  'getElement',
  'querySelectorValue',
  'promiseAll',
  'newPromise',
  'storageGet',
  'classContains',
  'callMethodExpr',
  'objectLiteral',
  'memberGet',
  'memberCallExpr',
  'newExpr',
  'call',
  'objectOp',
  'indexGet',
])

export function isProgrammingStatementIR(stmt: JSStatement): stmt is ProgrammingStatement {
  return PROGRAMMING_STATEMENT_TYPES.has(stmt.type)
}

export function isProgrammingExpressionIR(expr: JSExpr): expr is ProgrammingExpression {
  return PROGRAMMING_EXPRESSION_TYPES.has(expr.type)
}

export interface ProgrammingStatementMapContext {
  map: SourceMapBuilder
  startLine: number
}

export interface ProgrammingStatementToCodeContext {
  pad: string
  base: number
  recAt(line: number): ExprMapContext | undefined
  compileStatements(
    statements: JSStatement[],
    indent: number,
    identifiers: IdentifierScope,
    mapContext?: ProgrammingStatementMapContext,
  ): string
  childMapContext(
    mapContext: ProgrammingStatementMapContext | undefined,
    startLine: number,
  ): ProgrammingStatementMapContext | undefined
  elementExpr(
    target: string,
    targetKind: 'id' | 'var' | 'this' | undefined,
    identifiers: IdentifierScope,
  ): string
  lifecycleResourceFunction(
    identifiers: IdentifierScope,
    globalName: 'requestAnimationFrame' | 'setInterval' | 'setTimeout',
  ): string
  lifecycleCallback(
    identifiers: IdentifierScope,
    parameters: string,
    body: string,
    closingIndent: string,
  ): string
  datasetAccess(base: string, key: string): string
  styleAccess(base: string, property: string): string
  lastLineEndColumn(code: string): number
  classKey(stmt: Extract<JSStatement, { type: 'classDecl' }>): string
}

export function programmingStatementIRToCode(
  stmt: ProgrammingStatement,
  indent: number,
  identifiers: IdentifierScope,
  mapContext: ProgrammingStatementMapContext | undefined,
  context: ProgrammingStatementToCodeContext,
): string {
  const {
    base,
    childMapContext,
    classKey,
    compileStatements,
    datasetAccess,
    elementExpr,
    lastLineEndColumn,
    lifecycleCallback,
    lifecycleResourceFunction,
    pad,
    recAt,
    styleAccess,
  } = context
  switch (stmt.type) {
    case 'var': {
      const keyword = stmt.kind === 'const' ? 'const' : 'let'
      return `${pad}${keyword} ${identifiers.get(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    }
    case 'declareVar':
      return `${pad}let ${identifiers.get(stmt.name)};`
    case 'assign':
      return `${pad}${identifiers.get(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'if': {
      const startLine = mapContext?.startLine ?? 1
      const thenBody = compileStatements(
        stmt.then,
        indent + 1,
        identifiers,
        childMapContext(mapContext, startLine + 1),
      )
      let out = `${pad}if (${compileExpr(stmt.cond, 0, identifiers, recAt(base))}) {\n${thenBody}\n${pad}}`
      // Cada "senão se" começa na linha SEGUINTE ao `} else if (…) {` (que fica na
      // última linha do que já foi montado) — daí `startLine + countLines(out)`.
      for (const clause of stmt.elseif ?? []) {
        const body = compileStatements(
          clause.then,
          indent + 1,
          identifiers,
          childMapContext(mapContext, startLine + countLines(out)),
        )
        out += ` else if (${compileExpr(clause.cond, 0, identifiers, recAt(base))}) {\n${body}\n${pad}}`
      }
      if (stmt.else) {
        const elseBody = compileStatements(
          stmt.else,
          indent + 1,
          identifiers,
          childMapContext(mapContext, startLine + countLines(out)),
        )
        // Corpo vazio (`else {}`) é no-op: não emite o `else` (round-trip idêntico).
        if (elseBody) out += ` else {\n${elseBody}\n${pad}}`
      }
      return out
    }
    case 'repeat': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const times = compileExpr(stmt.times, 0, identifiers, recAt(base))
      const loopVar = identifiers.reserveInternal('i')
      const limitVar = identifiers.reserveInternal('limite')
      return `${pad}for (let ${loopVar} = 0, ${limitVar} = ${times}; ${loopVar} < ${limitVar}; ${loopVar}++) {\n${body}\n${pad}}`
    }
    case 'while': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}while (${compileExpr(stmt.cond, 0, identifiers, recAt(base))}) {\n${body}\n${pad}}`
    }
    case 'doWhile': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      // `} while (cond);` é a última linha: base + 1 (abertura) + linhas do corpo.
      const condLine = base + 1 + countLines(body)
      return `${pad}do {\n${body}\n${pad}} while (${compileExpr(stmt.cond, 0, identifiers, recAt(condLine))});`
    }
    case 'break':
      return `${pad}break;`
    case 'continue':
      return `${pad}continue;`
    case 'forOf': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}for (const ${identifiers.get(stmt.itemName)} of ${identifiers.get(stmt.iterableVar)}) {\n${body}\n${pad}}`
    }
    case 'forRange': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const v = identifiers.get(stmt.varName)
      const from = compileExpr(stmt.from, 0, identifiers, recAt(base))
      const to = compileExpr(stmt.to, 0, identifiers, recAt(base))
      const step = compileExpr(stmt.step, 0, identifiers, recAt(base))
      const limitVar = identifiers.reserveInternal('fim')
      const stepVar = identifiers.reserveInternal('passo')
      const condition = `${stepVar} > 0 ? ${v} < ${limitVar} : ${stepVar} < 0 ? ${v} > ${limitVar} : false`
      return `${pad}for (let ${v} = ${from}, ${limitVar} = ${to}, ${stepVar} = ${step}; ${condition}; ${v} += ${stepVar}) {\n${body}\n${pad}}`
    }
    case 'tryCatch': {
      const startLine = mapContext?.startLine ?? 1
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, startLine + 1),
      )
      // `} catch (erro) {` fica na linha base + 1 (try) + linhas do corpo.
      const catchHeaderLine = startLine + 1 + countLines(body)
      const projectRunContext = identifiers.getProjectRunContextIdentifier()
      const catchIdentifier = stmt.errorName
        ? identifiers.get(stmt.errorName)
        : projectRunContext
          ? identifiers.reserveInternal('__szRestartSignal')
          : undefined
      const controlGuard =
        projectRunContext && catchIdentifier
          ? `${'  '.repeat(indent + 1)}if (${projectRunContext}.isControlSignal(${catchIdentifier})) throw ${catchIdentifier};`
          : ''
      const handler = compileStatements(
        stmt.handler,
        indent + 1,
        identifiers,
        childMapContext(mapContext, catchHeaderLine + 1 + (controlGuard ? 1 : 0)),
      )
      const param = catchIdentifier ? `(${catchIdentifier}) ` : ''
      const guardedHandler = [controlGuard, handler].filter(Boolean).join('\n')
      let out = `${pad}try {\n${body}\n${pad}} catch ${param}{\n${guardedHandler}\n${pad}}`
      if (stmt.finalizer) {
        const finallyHeaderLine = catchHeaderLine + 1 + countLines(guardedHandler)
        const finalizer = compileStatements(
          stmt.finalizer,
          indent + 1,
          identifiers,
          childMapContext(mapContext, finallyHeaderLine + 1),
        )
        out += ` finally {\n${finalizer}\n${pad}}`
      }
      return out
    }
    case 'fetchJson': {
      const startLine = mapContext?.startLine ?? 1
      const url = compileExpr(stmt.url, 0, identifiers, recAt(startLine))
      const resp = identifiers.reserveInternal('resposta')
      const ok = identifiers.get(stmt.okName)
      // A resposta HTTP é validada ANTES do JSON: fetch só rejeita em falha de
      // rede, portanto 4xx/5xx precisam lançar explicitamente para chegar ao
      // callback de erro do bloco.
      const body = compileStatements(
        stmt.body,
        indent + 2,
        identifiers,
        childMapContext(mapContext, startLine + 8),
      )
      const successCallback = lifecycleCallback(identifiers, ok, body, `${pad}  `)
      let out = `${pad}fetch(${url})\n${pad}  .then((${resp}) => {\n${pad}    if (!${resp}.ok) {\n${pad}      throw new Error("Falha HTTP " + ${resp}.status);\n${pad}    }\n${pad}    return ${resp}.json();\n${pad}  })\n${pad}  .then(${successCallback})`
      if (stmt.catchBody) {
        const catchVar = stmt.catchName
          ? identifiers.get(stmt.catchName)
          : identifiers.reserveInternal('erro')
        const catchBody = compileStatements(
          stmt.catchBody,
          indent + 2,
          identifiers,
          childMapContext(mapContext, startLine + 10 + countLines(body)),
        )
        const errorCallback = lifecycleCallback(identifiers, catchVar, catchBody, `${pad}  `)
        out += `\n${pad}  .catch(${errorCallback})`
      }
      return `${out};`
    }
    case 'event': {
      const hasExplicitFormProtection = stmt.body.some(
        (child) => child.type === 'eventMethod' && child.method === 'preventDefault',
      )
      const injectsFormProtection = stmt.event === 'submit' && !hasExplicitFormProtection
      const projectRunContext = identifiers.getProjectRunContextIdentifier()
      const listenerOptions = projectRunContext ? `, { signal: ${projectRunContext}.signal }` : ''
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + (injectsFormProtection ? 2 : 1)),
      )
      const protectedBody = injectsFormProtection
        ? `${'  '.repeat(indent + 1)}event.preventDefault();${body ? `\n${body}` : ''}`
        : body
      const targetKind = resolveEventTargetKind(stmt.target, stmt.targetKind)
      const callback = lifecycleCallback(identifiers, 'event', protectedBody, pad)
      if (targetKind === 'window') {
        return `${pad}window.addEventListener(${JSON.stringify(stmt.event)}, ${callback}${listenerOptions});`
      }
      if (targetKind === 'document') {
        return `${pad}document.addEventListener(${JSON.stringify(stmt.event)}, ${callback}${listenerOptions});`
      }
      return `${pad}${elementExpr(stmt.target, targetKind, identifiers)}?.addEventListener(${JSON.stringify(stmt.event)}, ${callback}${listenerOptions});`
    }
    case 'consoleLog':
      return `${pad}console.log(${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    case 'alert':
      return `${pad}alert(${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    case 'setProperty':
      return `${pad}${elementExpr(stmt.targetId, stmt.targetKind, identifiers)}.${stmt.property} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'getProperty':
      return `${pad}const ${identifiers.get(stmt.varName)} = ${elementExpr(stmt.targetId, stmt.targetKind, identifiers)}?.${stmt.property};`
    case 'getAttribute':
      return `${pad}const ${identifiers.get(stmt.varName)} = ${elementExpr(stmt.targetId, stmt.targetKind, identifiers)}?.getAttribute(${JSON.stringify(stmt.name)});`
    case 'setStyle':
      return `${pad}${styleAccess(elementExpr(stmt.targetId, stmt.targetKind, identifiers), stmt.property)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'setAttribute':
      return `${pad}${elementExpr(stmt.targetId, stmt.targetKind, identifiers)}?.setAttribute(${JSON.stringify(stmt.name)}, ${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    case 'querySelector':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.querySelector(${JSON.stringify(stmt.selector)});`
    case 'querySelectorAll':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.querySelectorAll(${JSON.stringify(stmt.selector)});`
    case 'storageSet': {
      const store = stmt.store === 'session' ? 'sessionStorage' : 'localStorage'
      return `${pad}${store}.setItem(${compileExpr(stmt.key, 0, identifiers, recAt(base))}, ${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    }
    case 'eventMethod':
      return `${pad}event.${stmt.method}();`
    case 'getElementById':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.getElementById(${JSON.stringify(stmt.id)});`
    case 'classOp':
      return `${pad}${elementExpr(stmt.targetId, stmt.targetKind, identifiers)}?.classList.${stmt.op}(${JSON.stringify(stmt.className)});`
    case 'createElement':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.createElement(${JSON.stringify(stmt.tag)});`
    case 'createElementNS':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.createElementNS("http://www.w3.org/2000/svg", ${JSON.stringify(stmt.tag)});`
    case 'appendChild':
      return `${pad}${identifiers.get(stmt.parentVar)}.appendChild(${identifiers.get(stmt.childVar)});`
    case 'throwError':
      return `${pad}throw new Error(${compileExpr(stmt.message, 0, identifiers, recAt(base))});`
    case 'objectAssign':
      return `${pad}Object.assign(${identifiers.get(stmt.targetVar)}, ${identifiers.get(stmt.sourceVar)});`
    case 'switch': {
      const subj = compileExpr(stmt.subject, 0, identifiers, recAt(base))
      let cursorLine = base + 1
      const caseChunks: string[] = []
      for (const c of stmt.cases) {
        const body = compileStatements(
          c.body,
          indent + 2,
          identifiers,
          childMapContext(mapContext, cursorLine + 1),
        )
        const matchContext: ExprMapContext | undefined = mapContext
          ? { map: mapContext.map, line: cursorLine, indent: indent + 1 }
          : undefined
        const chunk = `${pad}  case ${compileExpr(c.match, 0, identifiers, matchContext)}: {\n${body}\n${pad}    break;\n${pad}  }`
        const endLine = cursorLine + countLines(chunk) - 1
        mapContext?.map.record(
          c.__id,
          'script.js',
          cursorLine,
          endLine,
          (indent + 1) * 2 + 1,
          lastLineEndColumn(chunk),
        )
        caseChunks.push(chunk)
        cursorLine = endLine + 1
      }
      let def = ''
      if (stmt.default) {
        const defaultBody = compileStatements(
          stmt.default,
          indent + 2,
          identifiers,
          childMapContext(mapContext, cursorLine + 1),
        )
        def = `${caseChunks.length > 0 ? '\n' : ''}${pad}  default: {\n${defaultBody}\n${pad}  }`
      }
      return `${pad}switch (${subj}) {\n${caseChunks.join('\n')}${def}\n${pad}}`
    }
    case 'requestFullscreen':
      return `${pad}document.documentElement.requestFullscreen();`
    case 'exitFullscreen':
      return `${pad}document.exitFullscreen();`
    case 'toggleFullscreen':
      return `${pad}if (document.fullscreenElement) {\n${pad}  document.exitFullscreen();\n${pad}} else {\n${pad}  document.documentElement.requestFullscreen();\n${pad}}`
    case 'setDataset': {
      const target = elementExpr(stmt.targetId, stmt.targetKind, identifiers)
      return `${pad}${datasetAccess(target, stmt.key)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    }
    case 'arrayPush':
      return `${pad}${identifiers.get(stmt.arrayVar)}.push(${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    case 'arrayRemove':
      return `${pad}${identifiers.get(stmt.arrayVar)}.${stmt.end}();`
    case 'arraySplice':
      return `${pad}${identifiers.get(stmt.arrayVar)}.splice(${compileExpr(stmt.start, 0, identifiers, recAt(base))}, ${compileExpr(stmt.count, 0, identifiers, recAt(base))});`
    case 'classDecl': {
      const className = identifiers.declareClassName(classKey(stmt), stmt.name)
      const superClause = stmt.superClass
        ? ` extends ${identifiers.getClassReference(stmt.superClass)}`
        : ''
      const ctorParams = (stmt.ctorParams ?? []).map((x) => normalizeIdentifier(x))
      const lines = [`${pad}class ${className}${superClause} {`]
      let cursorLine = (mapContext?.startLine ?? 1) + 1
      // Gera o construtor quando há parâmetros OU corpo a executar.
      if (ctorParams.length > 0 || stmt.ctorBody.length > 0) {
        const ctorHeaderLine = cursorLine
        lines.push(`${pad}  constructor(${ctorParams.join(', ')}) {`)
        cursorLine += 1
        const ctorBody = compileStatements(
          stmt.ctorBody,
          indent + 2,
          identifiers,
          childMapContext(mapContext, cursorLine),
        )
        if (ctorBody) lines.push(ctorBody)
        cursorLine += countLines(ctorBody)
        lines.push(`${pad}  }`)
        cursorLine += 1
        // Registra a faixa `constructor(...) { … }` no sourcemap para que clicar
        // no bloco `sz_js_constructor` realce o cabeçalho + corpo no Monaco.
        // Sem esta entrada, o construtor seguia sem destino e o realce sumia
        // mesmo nas tentativas (esse era o sintoma B do plano).
        if (stmt.ctorId && mapContext) {
          mapContext.map.record(stmt.ctorId, 'script.js', ctorHeaderLine, cursorLine - 1)
        }
      }
      for (const m of stmt.methods) {
        const params = m.params.map((x) => normalizeIdentifier(x)).join(', ')
        const methodHeaderLine = cursorLine
        lines.push(`${pad}  ${m.async ? 'async ' : ''}${normalizeIdentifier(m.name)}(${params}) {`)
        cursorLine += 1
        const body = compileStatements(
          m.body,
          indent + 2,
          identifiers,
          childMapContext(mapContext, cursorLine),
        )
        if (body) lines.push(body)
        cursorLine += countLines(body)
        lines.push(`${pad}  }`)
        cursorLine += 1
        // Idem para cada método: a faixa do `metodo(...) { … }` é registrada
        // sob o id do bloco `sz_js_class_method`.
        if (m.__id && mapContext) {
          mapContext.map.record(m.__id, 'script.js', methodHeaderLine, cursorLine - 1)
        }
      }
      lines.push(`${pad}}`)
      return lines.join('\n')
    }
    case 'newInstance': {
      const args = (stmt.args ?? [])
        .map((a) => compileExpr(a, 0, identifiers, recAt(base)))
        .join(', ')
      const ctor = stmt.namespace
        ? `${identifiers.get(stmt.namespace)}.${stmt.className}`
        : identifiers.getClassReference(stmt.className)
      return `${pad}const ${identifiers.get(stmt.varName)} = new ${ctor}(${args});`
    }
    case 'callMethod': {
      const args = (stmt.args ?? [])
        .map((a) => compileExpr(a, 0, identifiers, recAt(base)))
        .join(', ')
      return `${pad}${identifiers.get(stmt.objectVar)}.${normalizeIdentifier(stmt.method)}(${args});`
    }
    case 'eventHandler': {
      const handler = identifiers.get(stmt.handlerName)
      const projectRunContext = identifiers.getProjectRunContextIdentifier()
      const listenerOptions = projectRunContext ? `, { signal: ${projectRunContext}.signal }` : ''
      const callback = projectRunContext
        ? `(event) => ${projectRunContext}.run(() => ${handler}(event))`
        : handler
      const targetKind = resolveEventTargetKind(stmt.target, stmt.targetKind)
      if (targetKind === 'window') {
        return `${pad}window.addEventListener(${JSON.stringify(stmt.event)}, ${callback}${listenerOptions});`
      }
      if (targetKind === 'document') {
        return `${pad}document.addEventListener(${JSON.stringify(stmt.event)}, ${callback}${listenerOptions});`
      }
      return `${pad}${elementExpr(stmt.target, targetKind, identifiers)}?.addEventListener(${JSON.stringify(stmt.event)}, ${callback}${listenerOptions});`
    }
    case 'setThisProp':
      return `${pad}this.${normalizeIdentifier(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'setProp':
      return `${pad}${identifiers.get(stmt.objectVar)}.${normalizeIdentifier(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'memberSet':
      return `${pad}${compileExpr(stmt.object, 20, identifiers, recAt(base))}.${normalizeIdentifier(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'memberCall': {
      const args = stmt.args.map((a) => compileExpr(a, 0, identifiers, recAt(base))).join(', ')
      return `${pad}${compileExpr(stmt.object, 20, identifiers, recAt(base))}.${normalizeIdentifier(stmt.method)}(${args});`
    }
    case 'superCall': {
      const args = stmt.args.map((a) => compileExpr(a, 0, identifiers, recAt(base))).join(', ')
      return `${pad}super(${args});`
    }
    case 'superMethodCall': {
      const args = stmt.args.map((a) => compileExpr(a, 0, identifiers, recAt(base))).join(', ')
      return `${pad}super.${normalizeIdentifier(stmt.method)}(${args});`
    }
    case 'exprStatement':
      return `${pad}${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'indexSet':
      return `${pad}${compileExpr(stmt.object, 20, identifiers, recAt(base))}[${compileExpr(stmt.index, 0, identifiers, recAt(base))}] = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'onClickAssign': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const compiledTarget = compileExpr(stmt.target, 20, identifiers, recAt(base))
      const target = stmt.target.type === 'objectLiteral' ? `(${compiledTarget})` : compiledTarget
      const projectRunContext = identifiers.getProjectRunContextIdentifier()
      if (projectRunContext) {
        return `${pad}${projectRunContext}.setEventHandler(${target}, "onclick", (event) => {\n${body}\n${pad}});`
      }
      return `${pad}${target}.onclick = (event) => {\n${body}\n${pad}};`
    }
    case 'return':
      return stmt.value === undefined
        ? `${pad}return;`
        : `${pad}return ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'funcDecl': {
      const params = stmt.params.map((x) => normalizeIdentifier(x)).join(', ')
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const head = `${pad}${stmt.async ? 'async ' : ''}function ${identifiers.get(stmt.name)}(${params}) {`
      return body ? `${head}\n${body}\n${pad}}` : `${head}\n${pad}}`
    }
    case 'callFunction': {
      const args = stmt.args.map((a) => compileExpr(a, 0, identifiers, recAt(base))).join(', ')
      return `${pad}${identifiers.get(stmt.name)}(${args});`
    }
    case 'awaitStmt':
      return `${pad}await ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'setTimeoutCall':
      return `${pad}${lifecycleResourceFunction(identifiers, 'setTimeout')}(${identifiers.get(stmt.fn)}, ${compileExpr(stmt.delay, 0, identifiers, recAt(base))});`
    case 'forEach': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const item = identifiers.get(stmt.itemName)
      const params = stmt.indexName ? `${item}, ${identifiers.get(stmt.indexName)}` : item
      const list = compileExpr(stmt.arrayExpr, 20, identifiers)
      return `${pad}${list}.forEach((${params}) => {\n${body}\n${pad}});`
    }
    case 'setTimeout': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      // `}, <delay>);` é a última linha: base + 1 (abertura) + linhas do corpo.
      const delayLine = base + 1 + countLines(body)
      return `${pad}${lifecycleResourceFunction(identifiers, 'setTimeout')}(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 0, identifiers, recAt(delayLine))});`
    }
    case 'setInterval': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      // `}, <delay>);` é a última linha: base + 1 (abertura) + linhas do corpo.
      const delayLine = base + 1 + countLines(body)
      return `${pad}${lifecycleResourceFunction(identifiers, 'setInterval')}(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 0, identifiers, recAt(delayLine))});`
    }
    case 'setTimeoutSeconds': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      // Segundos → milissegundos no código: `<delay> * 1000`. A precedência 6 (`*`)
      // garante que um delay composto (ex.: `a + b`) saia parentizado: `(a + b) * 1000`.
      const delayLine = base + 1 + countLines(body)
      return `${pad}${lifecycleResourceFunction(identifiers, 'setTimeout')}(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 6, identifiers, recAt(delayLine))} * 1000);`
    }
    case 'setIntervalSeconds': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const delayLine = base + 1 + countLines(body)
      return `${pad}${lifecycleResourceFunction(identifiers, 'setInterval')}(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 6, identifiers, recAt(delayLine))} * 1000);`
    }
  }
}

export interface ProgrammingExpressionToCodeContext {
  compileExpression(
    expression: JSExpr,
    parentPrecedence?: number,
    identifiers?: import('../../generators/expr').IdentifierResolver,
    rec?: ExprMapContext,
  ): string
  compileStatements(
    statements: readonly unknown[],
    indent: number,
    identifiers: import('../../generators/expr').IdentifierResolver,
  ): string
  isPureExpression(expression: JSExpr): boolean
  objectKey(key: string): string
  escapeTemplateText(text: string): string
  formatNumber(value: number): string
  normalizeHex(hex: string): string
}

const TERNARY_PRECEDENCE = 0.5
const MEMBER_PRECEDENCE = 20
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

export function programmingExpressionIRToCode(
  expr: ProgrammingExpression,
  parentPrecedence: number,
  identifiers: import('../../generators/expr').IdentifierResolver,
  rec: ExprMapContext | undefined,
  context: ProgrammingExpressionToCodeContext,
): string {
  const compileExpr = context.compileExpression
  const compileStatementsInjected = context.compileStatements
  const isPureExpr = context.isPureExpression
  const { escapeTemplateText, formatNumber, normalizeHex, objectKey } = context
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
    case 'null':
      return 'null'
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
    case 'logicalNot':
      // Operando em alta precedência: `!a`, `!fn()`, mas `!(a && b)`.
      return `!${compileExpr(expr.value, 20, identifiers, rec)}`
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
    case 'isFullscreen':
      return 'document.fullscreenElement != null'
    case 'dateGet': {
      const method = {
        year: 'getFullYear',
        month: 'getMonth',
        dayOfMonth: 'getDate',
        weekday: 'getDay',
        hours: 'getHours',
        minutes: 'getMinutes',
        seconds: 'getSeconds',
        ms: 'getMilliseconds',
      }[expr.part]
      return `new Date().${method}()`
    }
    case 'global':
      switch (expr.kind) {
        case 'innerWidth':
          return 'window.innerWidth'
        case 'innerHeight':
          return 'window.innerHeight'
        case 'devicePixelRatio':
          return 'window.devicePixelRatio'
      }
      return ''
    case 'systemDark':
      return "window.matchMedia('(prefers-color-scheme: dark)').matches"
    case 'perfNow':
      return 'performance.now()'
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
    case 'arrayMap':
      return `${identifiers.get(expr.arrayVar)}.map((${identifiers.get(expr.itemName)}) => ${compileExpr(expr.transform, 0, identifiers, rec)})`
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
    case 'arrayLast': {
      const a = identifiers.get(expr.arrayVar)
      return `${a}[${a}.length - 1]`
    }
    case 'arrayFind':
      return `${identifiers.get(expr.arrayVar)}.find((${identifiers.get(expr.itemName)}) => ${compileExpr(expr.cond, 0, identifiers, rec)})`
    case 'arrayFilter':
      // A lista é uma EXPRESSÃO (soquete): `this.enemies.filter(...)` funciona.
      return `${compileExpr(expr.array, MEMBER_PRECEDENCE, identifiers, rec)}.filter((${identifiers.get(expr.itemName)}) => ${compileExpr(expr.cond, 0, identifiers, rec)})`
    case 'concatArrays':
      return `[${expr.parts.map((p) => `...${compileExpr(p, 0, identifiers, rec)}`).join(', ')}]`
    case 'shuffle':
      // Fisher–Yates é uniforme e trabalha numa cópia. A lista entra como
      // argumento da IIFE para que até um nome como "__szLista" seja lido no
      // escopo externo antes de o parâmetro local passar a existir.
      return `((__szLista) => { for (let __szI = __szLista.length - 1; __szI > 0; __szI--) { const __szJ = Math.floor(Math.random() * (__szI + 1)); [__szLista[__szI], __szLista[__szJ]] = [__szLista[__szJ], __szLista[__szI]]; } return __szLista; })([...${identifiers.get(expr.arrayVar)}])`
    case 'objectLiteral': {
      const out =
        expr.entries.length === 0
          ? '{}'
          : `{ ${expr.entries
              .map((e) => `${objectKey(e.key)}: ${compileExpr(e.value, 0, identifiers, rec)}`)
              .join(', ')} }`
      // Um literal usado como receptor precisa de parênteses: `({}).x`.
      // Sem isso, no início de um statement, `{}` é interpretado como bloco e
      // o código deixa de ser JavaScript válido.
      return parentPrecedence > 0 ? `(${out})` : out
    }
    case 'memberGet':
      return `${compileExpr(expr.object, MEMBER_PRECEDENCE, identifiers, rec)}${expr.optional ? '?.' : '.'}${normalizeIdentifier(expr.name)}`
    case 'memberCallExpr': {
      const args = expr.args.map((a) => compileExpr(a, 0, identifiers, rec)).join(', ')
      return `${compileExpr(expr.object, MEMBER_PRECEDENCE, identifiers, rec)}.${normalizeIdentifier(expr.method)}(${args})`
    }
    case 'newExpr': {
      // `new Classe(args)` como VALOR (espelha o statement `newInstance`). Sem
      // namespace: o nome da classe resolve pela tabela das declarações do aluno
      // (getClassReference). Com namespace (biblioteca): `new THREE.Scene()` — o
      // namespace passa pelo scope (get) para casar com o memberGet de THREE, e o
      // className fica LITERAL (é o nome real da lib, não renomeável).
      const args = expr.args.map((a) => compileExpr(a, 0, identifiers, rec)).join(', ')
      const ctor = expr.namespace
        ? `${identifiers.get(expr.namespace)}.${expr.className}`
        : identifiers.getClassReference(expr.className)
      return `new ${ctor}(${args})`
    }
    case 'objectOp':
      return `Object.${expr.op}(${compileExpr(expr.object, 0, identifiers, rec)})`
    case 'getElement':
      return `document.getElementById(${JSON.stringify(expr.id)})`
    case 'querySelectorValue':
      return `document.querySelector${expr.all ? 'All' : ''}(${JSON.stringify(expr.selector)})`
    case 'promiseAll':
      return `Promise.all(${compileExpr(expr.list, 0, identifiers, rec)})`
    case 'newPromise': {
      const indent = rec?.indent ?? 0
      const pad = '  '.repeat(indent)
      const body = compileStatementsInjected
        ? compileStatementsInjected(expr.body, indent + 1, identifiers)
        : ''
      return `new Promise((${normalizeIdentifier(expr.param)}) => {\n${body}\n${pad}})`
    }
    case 'indexGet':
      return `${compileExpr(expr.object, MEMBER_PRECEDENCE, identifiers, rec)}[${compileExpr(expr.index, 0, identifiers, rec)}]`
  }
}
