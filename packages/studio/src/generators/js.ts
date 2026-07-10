import type { JSExpr, JSStatement } from '#ir'
import { screenTextToExpr, valueToExpr } from '#ir'
import {
  compileExpr,
  createIdentifierScope,
  type ExprMapContext,
  GeneratorError,
  type IdentifierScope,
  normalizeIdentifier,
} from './expr'
import { countLines, SourceMapBuilder } from './sourceMap'

/**
 * Profundidade máxima de aninhamento que os geradores aceitam antes de abortar
 * de forma controlada. Os PARSERS já degradam quando o aninhamento estoura a
 * pilha (RangeError), mas os GERADORES não tinham guarda — uma IR
 * patologicamente aninhada (ex.: `if` dentro de `if` dentro de `if`… milhares de
 * níveis, ou elementos/`@media` igualmente fundos) estourava a pilha do motor
 * de JS no meio da compilação, e dois chamadores na thread principal
 * (`regenerateFromBlocks` na BlocklyPanel, ExtensionsPanel) não envolvem a
 * geração em try/catch → tela branca. Com um teto bem ABAIXO do limite do motor
 * (~10–15k frames), lançamos um erro TIPADO e CAPTURÁVEL antes do crash, então
 * o chamador pode tratá-lo (ou ao menos não derrubar a aba). 200 é folgado para
 * qualquer projeto real e ainda longe do limite de pilha.
 */
export const MAX_GENERATOR_DEPTH = 200

/**
 * Erro lançado quando a IR excede {@link MAX_GENERATOR_DEPTH} níveis de
 * aninhamento. Tipado para que os chamadores possam distingui-lo de um bug do
 * gerador (`error instanceof GeneratorDepthError`) e degradar com elegância.
 */
export class GeneratorDepthError extends Error {
  constructor(message = 'IR aninhada além do limite suportado pelo gerador') {
    super(message)
    this.name = 'GeneratorDepthError'
  }
}

/** Lança {@link GeneratorDepthError} quando `depth` ultrapassa o teto. */
export function assertGeneratorDepth(depth: number): void {
  if (depth > MAX_GENERATOR_DEPTH) throw new GeneratorDepthError()
}

/** Sub-listas de statements (corpos) de um statement — `[]` para folhas. */
function jsChildBodies(stmt: JSStatement): JSStatement[][] {
  switch (stmt.type) {
    case 'if':
      return [stmt.then, ...(stmt.elseif ?? []).map((c) => c.then), stmt.else ?? []]
    case 'repeat':
    case 'while':
    case 'doWhile':
    case 'forOf':
    case 'forRange':
    case 'event':
    case 'animationLoop':
    case 'g2d:updateEachFrame':
    case 'g2d:onPointer':
    case 'g2d:onKey':
    case 'g2d:onOverlap':
    case 'g2d:forEachInGroup':
    case 'g2d:pruneOffscreen':
    case 'g2d:onGroupOverlap':
    case 'g2d:onSpriteGroupOverlap':
    case 'g2d:onEnemyDefeated':
    case 'g2d:onEnemyShotHit':
    case 'g2d:everyFrames':
    case 'g2d:everySeconds':
    case 'g3d:animate':
    case 'g3d:forEachInSwarm':
    case 'funcDecl':
    case 'forEach':
    case 'imageOnLoad':
    case 'setTimeout':
    case 'setInterval':
    case 'setTimeoutSeconds':
    case 'setIntervalSeconds':
      return [stmt.body]
    case 'tryCatch':
      return [stmt.body, stmt.handler, stmt.finalizer ?? []]
    case 'fetchJson':
      return [stmt.body, stmt.catchBody ?? []]
    case 'classDecl':
      return [stmt.ctorBody, ...stmt.methods.map((m) => m.body)]
    default:
      return []
  }
}

/**
 * Guarda de profundidade ITERATIVA (pilha explícita, sem recursão). Roda ANTES
 * de `hoistAnimationLoops`/`createPreparedIdentifierScope`/compilação — todas
 * recursões sem guarda própria que estourariam a pilha numa IR patológica antes
 * de chegar ao `compileStatementCode`. Como é iterativa, ela mesma não estoura.
 */
function assertJSDepth(statements: JSStatement[]): void {
  const stack: Array<{ list: JSStatement[]; depth: number }> = [{ list: statements, depth: 0 }]
  while (stack.length > 0) {
    const { list, depth } = stack.pop() as { list: JSStatement[]; depth: number }
    assertGeneratorDepth(depth)
    for (const stmt of list) {
      for (const body of jsChildBodies(stmt)) {
        stack.push({ list: body, depth: depth + 1 })
      }
    }
  }
}

export interface GenerateJSOptions {
  statements: JSStatement[]
  /** Header injected at top (e.g., comment header). */
  header?: string
}

export interface GenerateJSWithMapResult {
  code: string
  map: SourceMapBuilder
}

interface CompileMapContext {
  map: SourceMapBuilder
  startLine: number
}

export function generateJS(opts: GenerateJSOptions): string {
  return generateJSWithMap(opts).code
}

/**
 * Versão que emite código + popula um SourceMapBuilder com a faixa de linhas
 * de cada statement top-level que tem `__id`. Mapeamento de statements
 * aninhados é um refinamento futuro — por ora basta o top-level (selecionar
 * "Quando clicar..." → linha do `addEventListener`).
 */
export function generateJSWithMap(opts: GenerateJSOptions): GenerateJSWithMapResult {
  const map = new SourceMapBuilder()
  // Aborta cedo (erro tipado e capturável) numa IR aninhada demais — antes que
  // as recursões abaixo (hoist/escopo/compilação) estourem a pilha do motor.
  assertJSDepth(opts.statements)
  // O loop de animação ("A cada frame fazer") sempre vai para o nível global,
  // fora de qualquer bloco: `function frame(){…} frame();`. A chamada precisa do
  // mesmo escopo da função, então ambos sobem juntos.
  const statements = hoistAnimationLoops(opts.statements)
  const identifiers = createPreparedIdentifierScope(statements)
  const headerText = opts.header ? `${opts.header.trim()}\n\n` : ''
  // Statements começam após o header (1-indexed).
  let currentLine = headerText ? countLines(headerText) + 1 : 1
  const pieces: string[] = []
  for (const stmt of statements) {
    const piece = compileStatement(stmt, 0, identifiers, { map, startLine: currentLine })
    const lines = countLines(piece)
    pieces.push(piece)
    // Pieces são unidos por '\n' (separador, não linha adicional). Próximo
    // piece começa exatamente em currentLine + lines.
    currentLine += lines
  }
  const body = pieces.join('\n')
  const code = headerText + (body ? `${body}\n` : '')
  return { code, map }
}

/**
 * Eleva (hoist) os loops de animação aninhados para o nível global. O bloco
 * "A cada frame fazer" sempre gera `function frame(){…} frame();` fora de tudo —
 * a chamada `frame()` precisa do mesmo escopo da função, então os dois sobem
 * juntos. Loops já no topo permanecem no lugar; os aninhados vão para o fim da
 * lista top-level (na ordem em que aparecem).
 */
function hoistAnimationLoops(statements: JSStatement[]): JSStatement[] {
  // Atalho do caso comum: se NENHUM loop de animação está ANINHADO dentro do
  // corpo de outro statement, não há o que elevar — devolve a lista original SEM
  // clonar a árvore. Antes, o `map` + spreads recursivos de `stripNested…`
  // alocavam uma cópia de CADA statement-container a cada geração (a cada tecla),
  // mesmo em projetos sem `animationLoop` algum.
  const needsHoist = statements.some((stmt) =>
    jsChildBodies(stmt).some((body) => containsAnimationLoop(body)),
  )
  if (!needsHoist) return statements
  const hoisted: JSStatement[] = []
  const top = statements.map((s) => stripNestedAnimationLoops(s, hoisted))
  return [...top, ...hoisted]
}

/** Há algum `animationLoop` em qualquer ponto desta lista (recursivo)? */
function containsAnimationLoop(list: JSStatement[]): boolean {
  for (const stmt of list) {
    if (stmt.type === 'animationLoop') return true
    for (const body of jsChildBodies(stmt)) {
      if (containsAnimationLoop(body)) return true
    }
  }
  return false
}

/** Remove loops de animação dos corpos aninhados de `stmt`, jogando-os em `hoisted`. */
function stripNestedAnimationLoops(stmt: JSStatement, hoisted: JSStatement[]): JSStatement {
  switch (stmt.type) {
    case 'if':
      return {
        ...stmt,
        then: extractAnimationLoops(stmt.then, hoisted),
        elseif: stmt.elseif?.map((c) => ({
          ...c,
          then: extractAnimationLoops(c.then, hoisted),
        })),
        else: stmt.else ? extractAnimationLoops(stmt.else, hoisted) : undefined,
      }
    case 'repeat':
      return { ...stmt, body: extractAnimationLoops(stmt.body, hoisted) }
    case 'while':
    case 'doWhile':
    case 'forOf':
    case 'forRange':
      return { ...stmt, body: extractAnimationLoops(stmt.body, hoisted) }
    case 'tryCatch':
      return {
        ...stmt,
        body: extractAnimationLoops(stmt.body, hoisted),
        handler: extractAnimationLoops(stmt.handler, hoisted),
        finalizer: stmt.finalizer ? extractAnimationLoops(stmt.finalizer, hoisted) : undefined,
      }
    case 'fetchJson':
      return {
        ...stmt,
        body: extractAnimationLoops(stmt.body, hoisted),
        catchBody: stmt.catchBody ? extractAnimationLoops(stmt.catchBody, hoisted) : undefined,
      }
    case 'event':
      // O handler de `load` é OPACO: um loop de animação lá dentro fica lá
      // dentro. Elevar p/ o top-level quebrava o jogo clássico "tudo dentro do
      // window.addEventListener('load', …)": o loop referencia consts do load
      // (ctx/canvas/jogo) — no topo viram ReferenceError — e passaria a rodar
      // ANTES do load. Function declaration aninhada é JS válido e o re-parse
      // re-funde o loop em qualquer profundidade (fixpoint estável). Os demais
      // eventos (click etc.) mantêm o hoisting histórico (teste travado).
      if (stmt.event === 'load') return stmt
      return { ...stmt, body: extractAnimationLoops(stmt.body, hoisted) }
    case 'g3d:forEachInSwarm':
    case 'forEach':
    case 'imageOnLoad':
    case 'setTimeout':
    case 'setInterval':
    case 'setTimeoutSeconds':
    case 'setIntervalSeconds':
      return { ...stmt, body: extractAnimationLoops(stmt.body, hoisted) }
    case 'animationLoop':
      return { ...stmt, body: extractAnimationLoops(stmt.body, hoisted) }
    default:
      return stmt
  }
}

/** Em uma lista de statements, separa os `animationLoop` (para `hoisted`) dos demais. */
function extractAnimationLoops(list: JSStatement[], hoisted: JSStatement[]): JSStatement[] {
  const out: JSStatement[] = []
  for (const s of list) {
    if (s.type === 'animationLoop') {
      hoisted.push({ ...s, body: extractAnimationLoops(s.body, hoisted) })
    } else {
      out.push(stripNestedAnimationLoops(s, hoisted))
    }
  }
  return out
}

export function compileStatements(
  stmts: JSStatement[],
  indent: number,
  identifiers: IdentifierScope = createPreparedIdentifierScope(stmts),
  mapContext?: CompileMapContext,
): string {
  let currentLine = mapContext?.startLine ?? 1
  return stmts
    .map((s) => {
      const code = compileStatement(
        s,
        indent,
        identifiers,
        mapContext ? { map: mapContext.map, startLine: currentLine } : undefined,
      )
      currentLine += countLines(code)
      return code
    })
    .join('\n')
}

/**
 * Expressão que referencia o elemento alvo de um statement: ou a variável que o
 * guarda (`targetKind === 'var'`) ou uma busca por id (`document.getElementById`).
 */
function elementExpr(
  target: string,
  targetKind: 'id' | 'var' | 'this' | undefined,
  identifiers: IdentifierScope,
): string {
  if (targetKind === 'this') return 'this'
  return targetKind === 'var'
    ? identifiers.get(target)
    : `document.getElementById(${JSON.stringify(target)})`
}

function compileStatement(
  stmt: JSStatement,
  indent: number,
  identifiers: IdentifierScope,
  mapContext?: CompileMapContext,
): string {
  const code = compileStatementCode(stmt, indent, identifiers, mapContext)
  if (mapContext && stmt.__id) {
    const endLine = mapContext.startLine + countLines(code) - 1
    mapContext.map.record(
      stmt.__id,
      'script.js',
      mapContext.startLine,
      endLine,
      indent * 2 + 1,
      lastLineEndColumn(code),
    )
  }
  return code
}

function compileStatementCode(
  stmt: JSStatement,
  indent: number,
  identifiers: IdentifierScope,
  mapContext?: CompileMapContext,
): string {
  // `indent` cresce em 1 a cada corpo aninhado (compileStatements(body, indent+1)),
  // então É a profundidade de aninhamento — guardamos aqui, o único ponto de
  // recursão de statements, antes de estourar a pilha do motor.
  assertGeneratorDepth(indent)
  const pad = '  '.repeat(indent)
  // Linha-base (1ª linha) deste statement. Expressões em soquetes de valor são
  // single-line; `recAt(line)` registra cada uma na linha onde foi emitida.
  const base = mapContext?.startLine ?? 1
  const recAt = (line: number): ExprMapContext | undefined =>
    mapContext ? { map: mapContext.map, line } : undefined
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
      return `${pad}for (let ${loopVar} = 0; ${loopVar} < ${times}; ${loopVar}++) {\n${body}\n${pad}}`
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
      const stepIsOne = stmt.step.type === 'num' && stmt.step.value === 1
      const update = stepIsOne
        ? `${v}++`
        : `${v} += ${compileExpr(stmt.step, 0, identifiers, recAt(base))}`
      return `${pad}for (let ${v} = ${from}; ${v} < ${to}; ${update}) {\n${body}\n${pad}}`
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
      const handler = compileStatements(
        stmt.handler,
        indent + 1,
        identifiers,
        childMapContext(mapContext, catchHeaderLine + 1),
      )
      const param = stmt.errorName ? `(${identifiers.get(stmt.errorName)}) ` : ''
      let out = `${pad}try {\n${body}\n${pad}} catch ${param}{\n${handler}\n${pad}}`
      if (stmt.finalizer) {
        const finallyHeaderLine = catchHeaderLine + 1 + countLines(handler)
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
      // Linhas: fetch(url) | .then(json) | .then((dados) => { | corpo… | })
      const body = compileStatements(
        stmt.body,
        indent + 2,
        identifiers,
        childMapContext(mapContext, startLine + 3),
      )
      let out = `${pad}fetch(${url})\n${pad}  .then((${resp}) => ${resp}.json())\n${pad}  .then((${ok}) => {\n${body}\n${pad}  })`
      if (stmt.catchBody) {
        const catchVar = stmt.catchName
          ? identifiers.get(stmt.catchName)
          : identifiers.reserveInternal('erro')
        const catchBody = compileStatements(
          stmt.catchBody,
          indent + 2,
          identifiers,
          childMapContext(mapContext, startLine + 3 + countLines(body) + 2),
        )
        out += `\n${pad}  .catch((${catchVar}) => {\n${catchBody}\n${pad}  })`
      }
      return `${out};`
    }
    case 'event': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      // Escuta global na JANELA: eventos da página inteira (load/resize) — ou
      // qualquer evento marcado explicitamente como targetKind 'window'.
      if (stmt.targetKind === 'window' || stmt.event === 'load' || stmt.event === 'resize') {
        return `${pad}window.addEventListener(${JSON.stringify(stmt.event)}, (event) => {\n${body}\n${pad}});`
      }
      // Eventos que pegam um alvo (target) — vão para o elemento:
      const elementBound: ReadonlySet<string> = new Set([
        'click',
        'mouseover',
        'mouseout',
        'submit',
        'input',
        'change',
      ])
      // Escuta global no documento: clique em qualquer lugar (targetKind
      // 'document'), eventos de teclado (keydown/keyup) ou mover o mouse.
      if (stmt.targetKind === 'document' || !elementBound.has(stmt.event)) {
        return `${pad}document.addEventListener(${JSON.stringify(stmt.event)}, (event) => {\n${body}\n${pad}});`
      }
      return `${pad}${elementExpr(stmt.target, stmt.targetKind, identifiers)}?.addEventListener(${JSON.stringify(stmt.event)}, (event) => {\n${body}\n${pad}});`
    }
    case 'consoleLog':
      return `${pad}console.log(${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    case 'alert':
      return `${pad}alert(${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    case 'setText':
      // `el.textContent = <value>` fica na 3ª linha (base+2) do bloco `{ … }`.
      return `${pad}{\n${pad}  const el = document.getElementById(${JSON.stringify(stmt.targetId)});\n${pad}  if (el) el.textContent = ${compileExpr(stmt.value, 0, identifiers, recAt(base + 2))};\n${pad}}`
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
      const cases = stmt.cases
        .map((c) => {
          const body = compileStatements(c.body, indent + 2, identifiers)
          return `${pad}  case ${compileExpr(c.match, 0, identifiers)}: {\n${body}\n${pad}    break;\n${pad}  }`
        })
        .join('\n')
      const def = stmt.default
        ? `\n${pad}  default: {\n${compileStatements(stmt.default, indent + 2, identifiers)}\n${pad}  }`
        : ''
      return `${pad}switch (${subj}) {\n${cases}${def}\n${pad}}`
    }
    // Tela cheia na PÁGINA inteira (document.documentElement). Só funciona a partir
    // de um gesto do aluno (clique/tecla) — daí ir dentro de um "Quando ...".
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
    // Canvas
    case 'canvasSetup': {
      const v = identifiers.get(stmt.varName)
      const canvas = identifiers.getCanvasElement(stmt.varName)
      return [
        `${pad}const ${canvas} = document.getElementById(${JSON.stringify(stmt.canvasId)});`,
        `${pad}const ${v} = ${canvas}.getContext('2d');`,
      ].join('\n')
    }
    case 'canvasSetSize': {
      const canvas = identifiers.getCanvasElement(stmt.ctxVar)
      return [
        `${pad}${canvas}.width = ${compileExpr(stmt.w, 0, identifiers, recAt(base))};`,
        `${pad}${canvas}.height = ${compileExpr(stmt.h, 0, identifiers, recAt(base + 1))};`,
      ].join('\n')
    }
    case 'canvasClear': {
      const ctx = identifiers.get(stmt.ctxVar)
      // ⚠️ Chavear pelo CTX (igual a canvasSetup/canvasSetSize/canvasDim), NUNCA
      // por `stmt.canvasVar`: o mapa ctx→elemento já tem a entrada do setup e a
      // chave divergente criava uma SEGUNDA alocação — o corpo do loop saía
      // `canvas_2.width` (ReferenceError) e o nome derivava a cada round-trip.
      const canvas = identifiers.getCanvasElement(stmt.ctxVar)
      return `${pad}${ctx}.clearRect(0, 0, ${canvas}.width, ${canvas}.height);`
    }
    case 'canvasFillStyle':
      return `${pad}${identifiers.get(stmt.ctxVar)}.fillStyle = ${compileExpr(stmt.color, 0, identifiers, recAt(base))};`
    case 'canvasFillRect':
      return `${pad}${identifiers.get(stmt.ctxVar)}.fillRect(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base))});`
    case 'canvasArc': {
      const ctx = identifiers.get(stmt.ctxVar)
      // beginPath na 1ª linha; o arc(x, y, r, …) fica na 2ª linha (base+1).
      return [
        `${pad}${ctx}.beginPath();`,
        `${pad}${ctx}.arc(${compileExpr(stmt.x, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.r, 0, identifiers, recAt(base + 1))}, 0, Math.PI * 2);`,
        `${pad}${ctx}.fill();`,
      ].join('\n')
    }
    case 'canvasStrokeRect':
      return `${pad}${identifiers.get(stmt.ctxVar)}.strokeRect(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base))});`
    case 'canvasClearRect':
      return `${pad}${identifiers.get(stmt.ctxVar)}.clearRect(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base))});`
    case 'canvasRoundRect': {
      const ctxRR = identifiers.get(stmt.ctxVar)
      return [
        `${pad}${ctxRR}.beginPath();`,
        `${pad}${ctxRR}.roundRect(${compileExpr(stmt.x, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.r, 0, identifiers, recAt(base + 1))});`,
        `${pad}${ctxRR}.fill();`,
      ].join('\n')
    }
    case 'canvasEllipse': {
      const ctxEl = identifiers.get(stmt.ctxVar)
      return [
        `${pad}${ctxEl}.beginPath();`,
        `${pad}${ctxEl}.ellipse(${compileExpr(stmt.x, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.rx, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.ry, 0, identifiers, recAt(base + 1))}, 0, 0, Math.PI * 2);`,
        `${pad}${ctxEl}.fill();`,
      ].join('\n')
    }
    case 'canvasArcSlice': {
      const ctxAs = identifiers.get(stmt.ctxVar)
      return [
        `${pad}${ctxAs}.beginPath();`,
        `${pad}${ctxAs}.moveTo(${compileExpr(stmt.x, 0, identifiers, recAt(base + 1))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 1))});`,
        `${pad}${ctxAs}.arc(${compileExpr(stmt.x, 0, identifiers, recAt(base + 2))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 2))}, ${compileExpr(stmt.r, 0, identifiers, recAt(base + 2))}, ${compileExpr(stmt.start, 0, identifiers, recAt(base + 2))}, ${compileExpr(stmt.end, 0, identifiers, recAt(base + 2))});`,
        `${pad}${ctxAs}.closePath();`,
        `${pad}${ctxAs}.fill();`,
      ].join('\n')
    }
    case 'canvasQuadraticCurve':
      return `${pad}${identifiers.get(stmt.ctxVar)}.quadraticCurveTo(${compileExpr(stmt.cpx, 0, identifiers, recAt(base))}, ${compileExpr(stmt.cpy, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasBezierCurve':
      return `${pad}${identifiers.get(stmt.ctxVar)}.bezierCurveTo(${compileExpr(stmt.cp1x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.cp1y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.cp2x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.cp2y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasArcTo':
      return `${pad}${identifiers.get(stmt.ctxVar)}.arcTo(${compileExpr(stmt.x1, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y1, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x2, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y2, 0, identifiers, recAt(base))}, ${compileExpr(stmt.r, 0, identifiers, recAt(base))});`
    case 'canvasShadow': {
      const ctxSh = identifiers.get(stmt.ctxVar)
      return [
        `${pad}${ctxSh}.shadowColor = ${compileExpr(stmt.color, 0, identifiers, recAt(base))};`,
        `${pad}${ctxSh}.shadowBlur = ${compileExpr(stmt.blur, 0, identifiers, recAt(base + 1))};`,
      ].join('\n')
    }
    case 'canvasStrokeText':
      return `${pad}${identifiers.get(stmt.ctxVar)}.strokeText(${compileExpr(stmt.text, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasLineDash': {
      // Um único valor de traço (traço = espaço). Emite [seg], não [seg, seg]: o
      // canvas DUPLICA arrays de tamanho ímpar (então [seg] já é traço=espaço=seg)
      // e, se `seg` for impuro (ex.: número aleatório / medida de texto), não é
      // avaliado DUAS vezes nem com valores divergentes. O parser lê elements[0],
      // então o round-trip continua estável.
      const seg = compileExpr(stmt.segment, 0, identifiers, recAt(base))
      return `${pad}${identifiers.get(stmt.ctxVar)}.setLineDash([${seg}]);`
    }
    case 'canvasFillText':
      return `${pad}${identifiers.get(stmt.ctxVar)}.fillText(${compileExpr(stmt.text, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'animationLoop': {
      const frame = identifiers.reserveInternal('frame')
      const startLine = mapContext?.startLine ?? 1
      // Forma com TEMPO: expõe o tempo do quadro (ms, do requestAnimationFrame) e
      // o tempo desde o quadro anterior (delta) em variáveis do aluno, para
      // movimento independente de FPS. O loop é iniciado com requestAnimationFrame
      // (não com frame()) para que o 1º quadro já receba um tempo real.
      if (stmt.timeVar || stmt.deltaVar) {
        const tVar = stmt.timeVar
          ? identifiers.get(stmt.timeVar)
          : identifiers.reserveInternal('frameTime')
        const dVar = stmt.deltaVar ? identifiers.get(stmt.deltaVar) : null
        const lastT = dVar ? identifiers.reserveInternal('lastFrameTime') : null
        const pre: string[] = []
        if (stmt.handle) pre.push(`${pad}let ${identifiers.get(stmt.handle)};`)
        if (lastT) pre.push(`${pad}let ${lastT};`)
        pre.push(`${pad}function ${frame}(${tVar}) {`)
        if (stmt.handle) {
          pre.push(`${pad}  ${identifiers.get(stmt.handle)} = requestAnimationFrame(${frame});`)
        }
        if (dVar && lastT) {
          pre.push(`${pad}  const ${dVar} = ${lastT} === undefined ? 0 : ${tVar} - ${lastT};`)
          pre.push(`${pad}  ${lastT} = ${tVar};`)
        }
        const body = compileStatements(
          stmt.body,
          indent + 1,
          identifiers,
          childMapContext(mapContext, startLine + pre.length),
        )
        const post: string[] = []
        if (!stmt.handle) post.push(`${pad}  requestAnimationFrame(${frame});`)
        post.push(`${pad}}`)
        post.push(`${pad}requestAnimationFrame(${frame});`)
        return [...pre, body, ...post].join('\n')
      }
      // Forma cancelável: guarda o id do requestAnimationFrame numa variável do
      // aluno para poder pará-lo depois com cancelAnimationFrame.
      if (stmt.handle) {
        const handle = identifiers.get(stmt.handle)
        // Reagenda o próximo quadro NO TOPO da função (padrão MDN). Assim, se o
        // corpo chamar cancelAnimationFrame(<handle>), ele cancela o quadro JÁ
        // agendado e o loop realmente para — inclusive quando o cancelamento
        // acontece de dentro do próprio corpo (ex.: colisão). Cabeçalho de 3
        // linhas (let / function / requestAnimationFrame) antes do corpo.
        const body = compileStatements(
          stmt.body,
          indent + 1,
          identifiers,
          childMapContext(mapContext, startLine + 3),
        )
        return [
          `${pad}let ${handle};`,
          `${pad}function ${frame}() {`,
          `${pad}  ${handle} = requestAnimationFrame(${frame});`,
          body,
          `${pad}}`,
          `${pad}${frame}();`,
        ].join('\n')
      }
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, startLine + 1),
      )
      return [
        `${pad}function ${frame}() {`,
        body,
        `${pad}  requestAnimationFrame(${frame});`,
        `${pad}}`,
        // Pontapé inicial: chama a própria função (sem parâmetros) para iniciar o
        // loop. Dentro dela, requestAnimationFrame reagenda o próximo quadro.
        `${pad}${frame}();`,
      ].join('\n')
    }
    case 'cancelAnimationFrame':
      return `${pad}cancelAnimationFrame(${compileExpr(stmt.handle, 0, identifiers, recAt(base))});`
    case 'canvasDrawImage': {
      const ctx = identifiers.get(stmt.ctxVar)
      const image = identifiers.reserveInternal(`${ctx}Img`)
      return [
        `${pad}{`,
        `${pad}  const ${image} = new Image();`,
        `${pad}  ${image}.src = window.__SZGAME_ASSETS?.[${JSON.stringify(stmt.src)}] ?? ${JSON.stringify(stmt.src)};`,
        `${pad}  ${image}.onload = () => ${ctx}.drawImage(${image}, ${compileExpr(stmt.x, 0, identifiers, recAt(base + 3))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 3))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base + 3))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base + 3))});`,
        `${pad}}`,
      ].join('\n')
    }
    case 'canvasSave':
      return `${pad}${identifiers.get(stmt.ctxVar)}.save();`
    case 'canvasRestore':
      return `${pad}${identifiers.get(stmt.ctxVar)}.restore();`
    case 'canvasTranslate':
      return `${pad}${identifiers.get(stmt.ctxVar)}.translate(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasRotate':
      return `${pad}${identifiers.get(stmt.ctxVar)}.rotate(${compileExpr(stmt.angle, 0, identifiers, recAt(base))});`
    case 'canvasScale':
      return `${pad}${identifiers.get(stmt.ctxVar)}.scale(${compileExpr(stmt.sx, 0, identifiers, recAt(base))}, ${compileExpr(stmt.sy, 0, identifiers, recAt(base))});`
    case 'canvasGradient': {
      const ctx = identifiers.get(stmt.ctxVar)
      const v = identifiers.get(stmt.varName)
      const stops = stmt.stops
        .map((s) => `${pad}${v}.addColorStop(${s.offset}, ${JSON.stringify(s.color)});`)
        .join('\n')
      return [
        `${pad}const ${v} = ${ctx}.createLinearGradient(${compileExpr(stmt.x0, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y0, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x1, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y1, 0, identifiers, recAt(base))});`,
        stops,
      ].join('\n')
    }
    case 'canvasBeginPath':
      return `${pad}${identifiers.get(stmt.ctxVar)}.beginPath();`
    case 'canvasClosePath':
      return `${pad}${identifiers.get(stmt.ctxVar)}.closePath();`
    case 'canvasStroke':
      return `${pad}${identifiers.get(stmt.ctxVar)}.stroke();`
    case 'canvasFill':
      return `${pad}${identifiers.get(stmt.ctxVar)}.fill();`
    case 'canvasMoveTo':
      return `${pad}${identifiers.get(stmt.ctxVar)}.moveTo(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasLineTo':
      return `${pad}${identifiers.get(stmt.ctxVar)}.lineTo(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasRect':
      return `${pad}${identifiers.get(stmt.ctxVar)}.rect(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base))});`
    case 'canvasClip':
      return `${pad}${identifiers.get(stmt.ctxVar)}.clip();`
    case 'canvasStrokeStyle':
      return `${pad}${identifiers.get(stmt.ctxVar)}.strokeStyle = ${compileExpr(stmt.color, 0, identifiers, recAt(base))};`
    case 'canvasLineWidth':
      return `${pad}${identifiers.get(stmt.ctxVar)}.lineWidth = ${compileExpr(stmt.width, 0, identifiers, recAt(base))};`
    case 'canvasGlobalAlpha':
      return `${pad}${identifiers.get(stmt.ctxVar)}.globalAlpha = ${compileExpr(stmt.alpha, 0, identifiers, recAt(base))};`
    case 'canvasFont':
      return `${pad}${identifiers.get(stmt.ctxVar)}.font = ${JSON.stringify(`${stmt.weight ? `${stmt.weight} ` : ''}${stmt.size}px ${stmt.family}`)};`
    case 'canvasTextAlign':
      return `${pad}${identifiers.get(stmt.ctxVar)}.textAlign = ${JSON.stringify(stmt.align)};`
    case 'canvasTextBaseline':
      return `${pad}${identifiers.get(stmt.ctxVar)}.textBaseline = ${JSON.stringify(stmt.baseline)};`
    case 'keyboardSimple': {
      const v = identifiers.get(stmt.varName)
      return [
        `${pad}const ${v} = { left: false, right: false, up: false, down: false };`,
        `${pad}document.addEventListener('keydown', (e) => {`,
        `${pad}  if (e.key === 'ArrowLeft') ${v}.left = true;`,
        `${pad}  if (e.key === 'ArrowRight') ${v}.right = true;`,
        `${pad}  if (e.key === 'ArrowUp') ${v}.up = true;`,
        `${pad}  if (e.key === 'ArrowDown') ${v}.down = true;`,
        `${pad}});`,
        `${pad}document.addEventListener('keyup', (e) => {`,
        `${pad}  if (e.key === 'ArrowLeft') ${v}.left = false;`,
        `${pad}  if (e.key === 'ArrowRight') ${v}.right = false;`,
        `${pad}  if (e.key === 'ArrowUp') ${v}.up = false;`,
        `${pad}  if (e.key === 'ArrowDown') ${v}.down = false;`,
        `${pad}});`,
      ].join('\n')
    }
    case 'arrayPush':
      return `${pad}${identifiers.get(stmt.arrayVar)}.push(${compileExpr(stmt.value, 0, identifiers, recAt(base))});`
    case 'arrayRemove':
      return `${pad}${identifiers.get(stmt.arrayVar)}.${stmt.end}();`
    case 'arraySplice':
      return `${pad}${identifiers.get(stmt.arrayVar)}.splice(${compileExpr(stmt.start, 0, identifiers, recAt(base))}, ${compileExpr(stmt.count, 0, identifiers, recAt(base))});`
    // ----- game-2d -----
    case 'g2d:createSprite': {
      const v = identifiers.get(stmt.varName)
      return `${pad}const ${v} = SZGame2D.createSprite({ x: ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, y: ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, w: ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, h: ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    }
    case 'g2d:drawSprite':
      return `${pad}SZGame2D.drawSprite(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.spriteVar)});`
    case 'g2d:setPosition':
      return `${pad}${identifiers.get(stmt.spriteVar)}.x = ${compileExpr(stmt.x, 0, identifiers, recAt(base))}; ${identifiers.get(stmt.spriteVar)}.y = ${compileExpr(stmt.y, 0, identifiers, recAt(base))};`
    case 'g2d:setVelocity':
      return `${pad}${identifiers.get(stmt.spriteVar)}.vx = ${compileExpr(stmt.vx, 0, identifiers, recAt(base))}; ${identifiers.get(stmt.spriteVar)}.vy = ${compileExpr(stmt.vy, 0, identifiers, recAt(base))};`
    case 'g2d:collides':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.isColliding(${identifiers.get(stmt.aVar)}, ${identifiers.get(stmt.bVar)});`
    case 'g2d:score':
      return `${pad}let ${identifiers.get(stmt.varName)} = ${compileExpr(valueToExpr(stmt.initial), 0, identifiers, recAt(base))};`
    case 'g2d:gameOver':
      return [
        `${pad}${identifiers.get(stmt.ctxVar)}.fillStyle = '#f87171';`,
        `${pad}${identifiers.get(stmt.ctxVar)}.font = '32px sans-serif';`,
        `${pad}${identifiers.get(stmt.ctxVar)}.fillText(${compileExpr(valueToExpr(stmt.text), 0, identifiers, recAt(base))}, 40, 80);`,
      ].join('\n')
    case 'g2d:clear':
      return `${pad}SZGame2D.clear();`
    case 'g2d:setGravity':
      return `${pad}SZGame2D.setGravity(${compileExpr(valueToExpr(stmt.value), 0, identifiers, recAt(base))});`
    case 'g2d:applyVelocity':
      return `${pad}SZGame2D.applyVelocity(${identifiers.get(stmt.spriteVar)});`
    case 'g2d:bounceOnEdges':
      return `${pad}SZGame2D.bounceOnEdges(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.ctxVar)});`
    case 'g2d:circleCollides':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.circleCollides(${identifiers.get(stmt.aVar)}, ${identifiers.get(stmt.bVar)});`
    case 'g2d:playSound':
      return `${pad}SZGame2D.playSound(${compileExpr(valueToExpr(stmt.freq), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.durationMs), 0, identifiers, recAt(base))});`
    case 'g2d:playFx':
      return `${pad}SZGame2D.playFx(${JSON.stringify(stmt.fx)});`
    case 'g2d:playMusic':
      return `${pad}SZGame2D.playMusic(${JSON.stringify(stmt.tune)});`
    case 'g2d:stopMusic':
      return `${pad}SZGame2D.stopMusic();`
    case 'g2d:playNote':
      return `${pad}SZGame2D.playNote(${JSON.stringify(stmt.note)}, ${compileExpr(valueToExpr(stmt.ms), 0, identifiers, recAt(base))});`
    case 'g2d:aimAt':
      return `${pad}SZGame2D.aimAt(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.targetVar)});`
    case 'g2d:moveToward':
      return `${pad}SZGame2D.moveToward(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.targetVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g2d:setHealth':
      return `${pad}SZGame2D.setHealth(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.amount), 0, identifiers, recAt(base))});`
    case 'g2d:changeHealth':
      return `${pad}SZGame2D.changeHealth(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.delta), 0, identifiers, recAt(base))});`
    case 'g2d:flipSprite':
      return `${pad}SZGame2D.flipSprite(${identifiers.get(stmt.spriteVar)}, ${JSON.stringify(stmt.dir)});`
    case 'g2d:setOpacity':
      return `${pad}SZGame2D.setOpacity(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.percent), 0, identifiers, recAt(base))});`
    case 'g2d:setSize':
      return `${pad}SZGame2D.setSize(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))});`
    case 'g2d:scaleSprite':
      return `${pad}SZGame2D.scaleSprite(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.factor), 0, identifiers, recAt(base))});`
    case 'g2d:wrapEdges':
      return `${pad}SZGame2D.wrapEdges(${identifiers.get(stmt.spriteVar)});`
    case 'g2d:pruneOld':
      return `${pad}SZGame2D.pruneOld(${identifiers.get(stmt.groupVar)}, ${compileExpr(valueToExpr(stmt.seconds), 0, identifiers, recAt(base))});`
    case 'g2d:pauseGame':
      return `${pad}SZGame2D.pauseGame();`
    case 'g2d:resumeGame':
      return `${pad}SZGame2D.resumeGame();`
    case 'g2d:cameraFollow':
      return `${pad}SZGame2D.cameraFollow(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.worldW), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.worldH), 0, identifiers, recAt(base))});`
    case 'g2d:setCamera':
      return `${pad}SZGame2D.setCamera(${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))});`
    case 'g2d:breakTile':
      return `${pad}SZGame2D.breakTileAtSprite(${identifiers.get(stmt.mapVar)}, ${identifiers.get(stmt.spriteVar)});`
    case 'g2d:setTile':
      return `${pad}SZGame2D.setTileAtSprite(${identifiers.get(stmt.mapVar)}, ${compileExpr(valueToExpr(stmt.index), 0, identifiers, recAt(base))}, ${identifiers.get(stmt.spriteVar)});`
    case 'g2d:bringToFront':
      return `${pad}SZGame2D.bringToFront(${identifiers.get(stmt.groupVar)}, ${identifiers.get(stmt.spriteVar)});`
    case 'g2d:sendToBack':
      return `${pad}SZGame2D.sendToBack(${identifiers.get(stmt.groupVar)}, ${identifiers.get(stmt.spriteVar)});`
    case 'g2d:drawHitbox':
      return `${pad}SZGame2D.drawHitbox(${identifiers.get(stmt.spriteVar)});`
    case 'g2d:showFps':
      return `${pad}SZGame2D.showFps(${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))});`
    case 'g2d:onPointer': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.onPointer((${identifiers.get(stmt.xName)}, ${identifiers.get(stmt.yName)}) => {\n${body}\n${pad}});`
    }
    case 'g2d:onKey': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.onKey(${JSON.stringify(stmt.key)}, function () {\n${body}\n${pad}});`
    }
    case 'g2d:onOverlap': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      // Sprites passados como thunks (() => sprite) para resolver no DISPARO, não no
      // registro — assim a ordem dos blocos no topo não causa TDZ (const léxico).
      return `${pad}SZGame2D.onOverlap(() => ${identifiers.get(stmt.aVar)}, () => ${identifiers.get(stmt.bVar)}, function () {\n${body}\n${pad}});`
    }
    case 'g2d:createImageSprite': {
      const v = identifiers.get(stmt.varName)
      return `${pad}const ${v} = SZGame2D.createSprite({ x: ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, y: ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, w: ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, h: ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))}, image: ${JSON.stringify(stmt.image)} });`
    }
    case 'g2d:setImage':
      return `${pad}SZGame2D.setImage(${identifiers.get(stmt.spriteVar)}, ${JSON.stringify(stmt.image)});`
    case 'g2d:loadSpritesheet': {
      const v = identifiers.get(stmt.varName)
      return `${pad}const ${v} = SZGame2D.loadSpriteSheet(${JSON.stringify(stmt.image)}, ${compileExpr(valueToExpr(stmt.frameW), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.frameH), 0, identifiers, recAt(base))});`
    }
    case 'g2d:animateSprite':
      return `${pad}SZGame2D.setAnimation(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.sheetVar)}, ${compileExpr(valueToExpr(stmt.from), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.to), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.fps), 0, identifiers, recAt(base))});`
    case 'g2d:setStateAnim':
      return `${pad}SZGame2D.setStateAnimation(${identifiers.get(stmt.spriteVar)}, ${JSON.stringify(stmt.state)}, ${identifiers.get(stmt.sheetVar)}, ${compileExpr(valueToExpr(stmt.from), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.to), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.fps), 0, identifiers, recAt(base))});`
    case 'g2d:autoAnimate':
      return `${pad}SZGame2D.autoAnimate(${identifiers.get(stmt.spriteVar)});`
    case 'g2d:defineEnemyType':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.createEnemyType({ behavior: ${JSON.stringify(stmt.behavior)}, color: ${JSON.stringify(stmt.color)}, image: ${JSON.stringify(stmt.image)}, hp: ${compileExpr(valueToExpr(stmt.hp), 0, identifiers, recAt(base))}, speed: ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))}, dmg: ${compileExpr(valueToExpr(stmt.dmg), 0, identifiers, recAt(base))}, w: ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, h: ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))} });`
    case 'g2d:enemyStateAnim':
      return `${pad}SZGame2D.setEnemyStateAnimation(${identifiers.get(stmt.typeVar)}, ${JSON.stringify(stmt.state)}, ${identifiers.get(stmt.sheetVar)}, ${compileExpr(valueToExpr(stmt.from), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.to), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.fps), 0, identifiers, recAt(base))});`
    case 'g2d:setEnemyTypeParam':
      return `${pad}SZGame2D.setEnemyTypeParam(${identifiers.get(stmt.typeVar)}, ${JSON.stringify(stmt.param)}, ${compileExpr(valueToExpr(stmt.value), 0, identifiers, recAt(base))});`
    case 'g2d:spawnEnemy':
      return `${pad}SZGame2D.spawnEnemy(${identifiers.get(stmt.typeVar)}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))});`
    case 'g2d:updateEnemyType':
      return `${pad}SZGame2D.updateEnemyType(${identifiers.get(stmt.typeVar)}, ${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.targetVar)});`
    case 'g2d:drawEnemyType':
      return `${pad}SZGame2D.drawEnemyType(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.typeVar)});`
    case 'g2d:onEnemyDefeated': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.onEnemyDefeated(${identifiers.get(stmt.typeVar)}, function (${identifiers.get(stmt.itemName)}) {\n${body}\n${pad}});`
    }
    case 'g2d:onEnemyShotHit': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.overlapEnemyShots(() => ${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.typeVar)}, function (${identifiers.get(stmt.itemName)}) {\n${body}\n${pad}});`
    }
    case 'g2d:hurtByEnemy':
      return `${pad}SZGame2D.hurtByEnemy(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.enemyVar)});`
    case 'g2d:drawFrame':
      return `${pad}SZGame2D.drawFrame(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.sheetVar)}, ${compileExpr(valueToExpr(stmt.index), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))});`
    case 'g2d:platformer':
      return `${pad}SZGame2D.platformer(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.ctxVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.jump), 0, identifiers, recAt(base))});`
    case 'g2d:topDown':
      return `${pad}SZGame2D.topDown(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g2d:followPointer':
      return `${pad}SZGame2D.followPointer(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g2d:clampToScreen':
      return `${pad}SZGame2D.clampToScreen(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.ctxVar)});`
    case 'g2d:flash':
      return `${pad}SZGame2D.flash(${identifiers.get(stmt.ctxVar)}, ${JSON.stringify(stmt.color)});`
    case 'g2d:shake':
      return `${pad}SZGame2D.shake(${identifiers.get(stmt.ctxVar)}, ${compileExpr(valueToExpr(stmt.intensity), 0, identifiers, recAt(base))});`
    case 'g2d:emitParticles':
      return `${pad}SZGame2D.emitParticles(${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.count), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.color)});`
    case 'g2d:drawParticles':
      return `${pad}SZGame2D.drawParticles(${identifiers.get(stmt.ctxVar)});`
    case 'g2d:createTileMap': {
      const v = identifiers.get(stmt.varName)
      return `${pad}const ${v} = SZGame2D.createTileMap({ image: ${JSON.stringify(stmt.image)}, tile: ${compileExpr(valueToExpr(stmt.tile), 0, identifiers, recAt(base))}, solid: ${JSON.stringify(stmt.solid)}, grid: ${JSON.stringify(stmt.grid)} });`
    }
    case 'g2d:drawTileMap':
      return `${pad}SZGame2D.drawTileMap(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.mapVar)}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))});`
    case 'g2d:tileMapCollide':
      return `${pad}SZGame2D.collideTileMap(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.mapVar)});`
    case 'g2d:createGroup':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.createGroup();`
    case 'g2d:spawnInGroup':
      return `${pad}SZGame2D.spawn(${identifiers.get(stmt.groupVar)}, { x: ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, y: ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, w: ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, h: ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)}, vx: ${compileExpr(stmt.vx, 0, identifiers, recAt(base))}, vy: ${compileExpr(stmt.vy, 0, identifiers, recAt(base))} });`
    case 'g2d:spawnImageInGroup':
      return `${pad}SZGame2D.spawn(${identifiers.get(stmt.groupVar)}, { x: ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, y: ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, w: ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, h: ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))}, image: ${JSON.stringify(stmt.image)}, vx: ${compileExpr(stmt.vx, 0, identifiers, recAt(base))}, vy: ${compileExpr(stmt.vy, 0, identifiers, recAt(base))} });`
    case 'g2d:spawnBullet':
      return `${pad}SZGame2D.spawnBullet(${identifiers.get(stmt.groupVar)}, { x: ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, y: ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, radius: ${compileExpr(valueToExpr(stmt.radius), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)}, vx: ${compileExpr(stmt.vx, 0, identifiers, recAt(base))}, vy: ${compileExpr(stmt.vy, 0, identifiers, recAt(base))} });`
    case 'g2d:arrowsX':
      return `${pad}SZGame2D.arrowsX(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g2d:blinkSprite':
      return `${pad}SZGame2D.blink(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.frames), 0, identifiers, recAt(base))});`
    case 'g2d:updateGroup':
      return `${pad}SZGame2D.updateGroup(${identifiers.get(stmt.groupVar)});`
    case 'g2d:drawGroup':
      return `${pad}SZGame2D.drawGroup(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.groupVar)});`
    case 'g2d:forEachInGroup': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.forEachInGroup(${identifiers.get(stmt.groupVar)}, function (${identifiers.get(stmt.itemName)}) {\n${body}\n${pad}});`
    }
    case 'g2d:clearGroup':
      return `${pad}SZGame2D.clearGroup(${identifiers.get(stmt.groupVar)});`
    case 'g2d:pruneOffscreen': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.pruneOffscreen(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.groupVar)}, 40, function (${identifiers.get(stmt.itemName)}) {\n${body}\n${pad}});`
    }
    case 'g2d:onGroupOverlap': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.overlapGroups(${identifiers.get(stmt.aGroup)}, ${identifiers.get(stmt.bGroup)}, function (${identifiers.get(stmt.aName)}, ${identifiers.get(stmt.bName)}) {\n${body}\n${pad}});`
    }
    case 'g2d:removeFromGroup':
      return `${pad}SZGame2D.removeFromGroup(${identifiers.get(stmt.groupVar)}, ${identifiers.get(stmt.spriteVar)});`
    case 'g2d:everyFrames': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const key = identifiers.reserveInternal('cada')
      return [
        `${pad}if (SZGame2D.everyFrames(${JSON.stringify(key)}, ${compileExpr(stmt.n, 0, identifiers, recAt(base))})) {`,
        body,
        `${pad}}`,
      ].join('\n')
    }
    case 'g2d:everySeconds': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const key = identifiers.reserveInternal('cada')
      return [
        `${pad}if (SZGame2D.everySeconds(${JSON.stringify(key)}, ${compileExpr(valueToExpr(stmt.seconds), 0, identifiers, recAt(base))})) {`,
        body,
        `${pad}}`,
      ].join('\n')
    }
    case 'g2d:drawScore':
      return `${pad}SZGame2D.drawScore(${identifiers.get(stmt.ctxVar)}, ${JSON.stringify(stmt.label)}, ${compileExpr(stmt.value, 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.color)}, ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))});`
    case 'g2d:drawLabel':
      return `${pad}SZGame2D.drawLabel(${identifiers.get(stmt.ctxVar)}, ${JSON.stringify(stmt.text)}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.color)}, ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.align)});`
    case 'g2d:drawHearts':
      return `${pad}SZGame2D.drawHearts(${identifiers.get(stmt.ctxVar)}, ${compileExpr(stmt.count, 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.color)});`
    case 'g2d:drawBar':
      return `${pad}SZGame2D.drawBar(${identifiers.get(stmt.ctxVar)}, ${compileExpr(stmt.value, 0, identifiers, recAt(base))}, ${compileExpr(stmt.max, 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.color)});`
    case 'g2d:setScene':
      return `${pad}SZGame2D.setScene(${JSON.stringify(stmt.name)});`
    case 'g2d:showScreen':
      return `${pad}SZGame2D.showScreen(${identifiers.get(stmt.ctxVar)}, ${compileExpr(screenTextToExpr(stmt.title), 0, identifiers, recAt(base))}, ${compileExpr(screenTextToExpr(stmt.subtitle), 0, identifiers, recAt(base))}, ${compileExpr(screenTextToExpr(stmt.hint), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.bg)});`
    case 'g2d:restart':
      return `${pad}SZGame2D.restart();`
    case 'g2d:starfield':
      return `${pad}SZGame2D.drawStarfield(${identifiers.get(stmt.ctxVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g2d:dragX':
      return `${pad}SZGame2D.dragX(${identifiers.get(stmt.spriteVar)});`
    case 'g2d:fitScreen':
      return `${pad}SZGame2D.fitScreen(${compileExpr(valueToExpr(stmt.percent), 0, identifiers, recAt(base))});`
    case 'g2d:setupStage':
      return `${pad}SZGame2D.setupStage(${compileExpr(valueToExpr(stmt.width), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.height), 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.bg)});`
    case 'g2d:createShip':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.createShip({ x: ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, y: ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, w: ${compileExpr(valueToExpr(stmt.w), 0, identifiers, recAt(base))}, h: ${compileExpr(valueToExpr(stmt.h), 0, identifiers, recAt(base))}, body: ${JSON.stringify(stmt.bodyColor)}, wings: ${JSON.stringify(stmt.wingColor)} });`
    case 'g2d:spawnAsteroid':
      return `${pad}SZGame2D.spawnAsteroid(${identifiers.get(stmt.groupVar)}, { x: ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, y: ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, size: ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)}, vx: ${compileExpr(stmt.vx, 0, identifiers, recAt(base))}, vy: ${compileExpr(stmt.vy, 0, identifiers, recAt(base))} });`
    case 'g2d:explode':
      return `${pad}SZGame2D.explodeSprite(${identifiers.get(stmt.spriteVar)}, ${JSON.stringify(stmt.color)});`
    case 'g2d:playShoot':
      return `${pad}SZGame2D.playShoot();`
    case 'g2d:playExplosion':
      return `${pad}SZGame2D.playExplosion();`
    case 'g2d:onSpriteGroupOverlap': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame2D.overlapSpriteGroup(() => ${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.groupVar)}, function (${identifiers.get(stmt.itemName)}) {\n${body}\n${pad}});`
    }
    case 'g2d:steerThrust':
      return `${pad}SZGame2D.steerThrust(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.turn), 0, identifiers, recAt(base))});`
    case 'g2d:rotateSprite':
      return `${pad}SZGame2D.rotateSprite(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.deg), 0, identifiers, recAt(base))});`
    case 'g2d:pointSprite':
      return `${pad}SZGame2D.pointSprite(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.deg), 0, identifiers, recAt(base))});`
    case 'g2d:thrust':
      return `${pad}SZGame2D.thrust(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.force), 0, identifiers, recAt(base))});`
    case 'g2d:applyFriction':
      return `${pad}SZGame2D.applyFriction(${identifiers.get(stmt.spriteVar)}, ${compileExpr(valueToExpr(stmt.factor), 0, identifiers, recAt(base))});`
    case 'g2d:shootFrom':
      return `${pad}SZGame2D.shootFrom(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.groupVar)}, { speed: ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g2d:spawnAsteroidEdge':
      return `${pad}SZGame2D.spawnAsteroidFromEdge(${identifiers.get(stmt.groupVar)}, { size: ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)}, speed: ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))} });`
    case 'g2d:jumpOnGround':
      return `${pad}SZGame2D.jumpOnGround(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.ctxVar)}, ${compileExpr(valueToExpr(stmt.jump), 0, identifiers, recAt(base))});`
    case 'g2d:createDino':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.createDino({ x: ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, y: ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, size: ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g2d:createStickHero':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.createStickHero(${identifiers.get(stmt.ctxVar)});`
    case 'g2d:updateStickHero':
      return `${pad}SZGame2D.updateStickHero(${identifiers.get(stmt.gameVar)});`
    case 'g2d:restartStickHero':
      return `${pad}SZGame2D.restartStickHero(${identifiers.get(stmt.gameVar)});`
    case 'g2d:createBalloon':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.createBalloon(${identifiers.get(stmt.ctxVar)});`
    case 'g2d:updateBalloon':
      return `${pad}SZGame2D.updateBalloon(${identifiers.get(stmt.gameVar)});`
    case 'g2d:restartBalloon':
      return `${pad}SZGame2D.restartBalloon(${identifiers.get(stmt.gameVar)});`
    case 'g2d:controlDino':
      return `${pad}SZGame2D.controlDino(${identifiers.get(stmt.spriteVar)}, ${identifiers.get(stmt.ctxVar)}, ${compileExpr(valueToExpr(stmt.jump), 0, identifiers, recAt(base))});`
    case 'g2d:spawnObstacle':
      return `${pad}SZGame2D.spawnObstacle(${identifiers.get(stmt.groupVar)}, ${identifiers.get(stmt.ctxVar)}, { type: ${JSON.stringify(stmt.shape)}, x: ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, size: ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))}, vx: ${compileExpr(stmt.vx, 0, identifiers, recAt(base))} });`
    case 'g2d:spawnEgg':
      return `${pad}SZGame2D.spawnEgg(${identifiers.get(stmt.groupVar)}, { x: ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, y: ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, vx: ${compileExpr(stmt.vx, 0, identifiers, recAt(base))} });`
    case 'g2d:forest':
      return `${pad}SZGame2D.drawForest(${identifiers.get(stmt.ctxVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g2d:playJump':
      return `${pad}SZGame2D.playJump();`
    case 'g2d:playDinoHurt':
      return `${pad}SZGame2D.playDinoHurt();`
    case 'g2d:playCollect':
      return `${pad}SZGame2D.playCollect();`
    case 'g2d:createCity':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.createCity();`
    case 'g2d:drawCity':
      return `${pad}SZGame2D.drawCity(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.cityVar)});`
    case 'g2d:placeThrower':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.placeThrower(${identifiers.get(stmt.cityVar)}, { side: ${JSON.stringify(stmt.side)}, color: ${JSON.stringify(stmt.color)} });`
    case 'g2d:newWind':
      return `${pad}SZGame2D.newWind(${identifiers.get(stmt.cityVar)});`
    case 'g2d:drawWind':
      return `${pad}SZGame2D.drawWind(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.cityVar)});`
    case 'g2d:aimDrag':
      return `${pad}SZGame2D.aimDrag(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.throwerVar)});`
    case 'g2d:throwBanana':
      return `${pad}SZGame2D.throwBanana(${identifiers.get(stmt.throwerVar)}, ${identifiers.get(stmt.cityVar)});`
    case 'g2d:updateBanana':
      return `${pad}SZGame2D.updateBanana(${identifiers.get(stmt.cityVar)});`
    case 'g2d:drawBanana':
      return `${pad}SZGame2D.drawBanana(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.cityVar)});`
    case 'g2d:playWhistle':
      return `${pad}SZGame2D.playWhistle();`
    case 'g2d:playBoom':
      return `${pad}SZGame2D.playBoom();`
    case 'g2d:computerTurn':
      return `${pad}SZGame2D.computerTurn(${identifiers.get(stmt.throwerVar)}, ${identifiers.get(stmt.cityVar)}, ${identifiers.get(stmt.enemyVar)});`
    case 'g2d:drawAimReadout':
      return `${pad}SZGame2D.drawAimReadout(${identifiers.get(stmt.ctxVar)});`
    case 'g2d:updateEachFrame': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const update = identifiers.reserveInternal('update')
      return [`${pad}SZGame2D.gameLoop(function ${update}() {`, body, `${pad}});`].join('\n')
    }
    case 'g3d:createScene':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createScene(${JSON.stringify(stmt.canvasId)});`
    case 'g3d:createFullscreenScene':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createFullscreenScene(${JSON.stringify(stmt.bg)});`
    case 'g3d:setBackground':
      return `${pad}SZGame3D.setBackground(${identifiers.get(stmt.worldVar)}, ${JSON.stringify(stmt.color)});`
    case 'g3d:setCameraPosition':
      return `${pad}SZGame3D.setCameraPosition(${identifiers.get(stmt.worldVar)}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.z, 0, identifiers, recAt(base))});`
    case 'g3d:createBox':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createBox(${identifiers.get(stmt.worldVar)}, { size: ${compileExpr(valueToExpr(stmt.size), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:createSphere':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createSphere(${identifiers.get(stmt.worldVar)}, { radius: ${compileExpr(valueToExpr(stmt.radius), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:setPosition':
      return `${pad}SZGame3D.setPosition(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.z, 0, identifiers, recAt(base))});`
    case 'g3d:setRotation':
      return `${pad}SZGame3D.setRotation(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.z, 0, identifiers, recAt(base))});`
    case 'g3d:animate': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame3D.animate(${identifiers.get(stmt.worldVar)}, () => {\n${body}\n${pad}});`
    }
    case 'g3d:createBlock':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createBlock(${identifiers.get(stmt.worldVar)}, { width: ${compileExpr(valueToExpr(stmt.width), 0, identifiers, recAt(base))}, height: ${compileExpr(valueToExpr(stmt.height), 0, identifiers, recAt(base))}, depth: ${compileExpr(valueToExpr(stmt.depth), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:setVelocity':
      return `${pad}SZGame3D.setVelocity(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.z, 0, identifiers, recAt(base))});`
    case 'g3d:jump':
      return `${pad}SZGame3D.jump(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.force, 0, identifiers, recAt(base))});`
    case 'g3d:applyGravity':
      return `${pad}SZGame3D.applyGravity(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.groundVar)});`
    case 'g3d:controlWithKeys':
      return `${pad}SZGame3D.controlWithKeys(${identifiers.get(stmt.objVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g3d:setScale':
      return `${pad}SZGame3D.setScale(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.factor, 0, identifiers, recAt(base))});`
    case 'g3d:cameraFollow':
      return `${pad}SZGame3D.cameraFollow(${identifiers.get(stmt.worldVar)}, ${identifiers.get(stmt.objVar)});`
    case 'g3d:createGroup':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createGroup();`
    case 'g3d:runEnemies':
      return `${pad}SZGame3D.runEnemies(${identifiers.get(stmt.worldVar)}, ${identifiers.get(stmt.groupVar)}, ${identifiers.get(stmt.groundVar)}, ${compileExpr(valueToExpr(stmt.every), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g3d:stop':
      return `${pad}SZGame3D.stop(${identifiers.get(stmt.worldVar)});`
    case 'g3d:createCrossingScene':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createCrossingScene(${JSON.stringify(stmt.canvasId)});`
    case 'g3d:createCrosser':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createCrosser(${identifiers.get(stmt.worldVar)}, { color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:crosserMove':
      return `${pad}SZGame3D.crosserMove(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.direction)});`
    case 'g3d:crosserStep':
      return `${pad}SZGame3D.crosserStep(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.worldVar)});`
    case 'g3d:crosserReset':
      return `${pad}SZGame3D.crosserReset(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.worldVar)});`
    case 'g3d:addRow':
      return `${pad}SZGame3D.addRow(${identifiers.get(stmt.worldVar)}, ${compileExpr(stmt.rowIndex, 0, identifiers, recAt(base))}, ${JSON.stringify(stmt.kind)}, ${JSON.stringify(stmt.direction)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g3d:generateRows':
      return `${pad}SZGame3D.generateRows(${identifiers.get(stmt.worldVar)}, ${compileExpr(valueToExpr(stmt.count), 0, identifiers, recAt(base))});`
    case 'g3d:moveTraffic':
      return `${pad}SZGame3D.moveTraffic(${identifiers.get(stmt.worldVar)});`
    case 'g3d:isometricCamera':
      return `${pad}SZGame3D.isometricCamera(${identifiers.get(stmt.worldVar)}, ${stmt.followVar ? identifiers.get(stmt.followVar) : 'null'});`
    case 'g3d:gridStep':
      return `${pad}SZGame3D.gridStep(${identifiers.get(stmt.objVar)});`
    case 'g3d:gridMove':
      return `${pad}SZGame3D.gridMove(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.direction)});`
    case 'g3d:moveAcross':
      return `${pad}SZGame3D.moveAcross(${identifiers.get(stmt.groupVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.min), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.max), 0, identifiers, recAt(base))});`
    case 'g3d:gridPosition':
      return `${pad}SZGame3D.gridPosition(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.row, 0, identifiers, recAt(base))}, ${compileExpr(stmt.col, 0, identifiers, recAt(base))});`
    case 'g3d:topCamera':
      return `${pad}SZGame3D.topCamera(${identifiers.get(stmt.worldVar)}, ${stmt.followVar ? identifiers.get(stmt.followVar) : 'null'});`
    case 'g3d:moveInCircle':
      return `${pad}SZGame3D.moveInCircle(${identifiers.get(stmt.objVar)}, ${compileExpr(valueToExpr(stmt.radius), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g3d:createRaceScene':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createRaceScene(${JSON.stringify(stmt.canvasId)});`
    case 'g3d:createRaceTrack':
      return `${pad}SZGame3D.createRaceTrack(${identifiers.get(stmt.worldVar)});`
    case 'g3d:createRaceCar':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createRaceCar(${identifiers.get(stmt.worldVar)}, { color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:raceStep':
      return `${pad}SZGame3D.raceStep(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.worldVar)});`
    case 'g3d:raceControl':
      return `${pad}SZGame3D.raceControl(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.mode)});`
    case 'g3d:runRivals':
      return `${pad}SZGame3D.runRivals(${identifiers.get(stmt.worldVar)});`
    case 'g3d:raceReset':
      return `${pad}SZGame3D.raceReset(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.worldVar)});`
    case 'g3d:fall':
      return `${pad}SZGame3D.fall(${identifiers.get(stmt.objVar)});`
    case 'g3d:slideBetween':
      return `${pad}SZGame3D.slideBetween(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.axis)}, ${compileExpr(valueToExpr(stmt.min), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.max), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g3d:spin':
      return `${pad}SZGame3D.spin(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.axis)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g3d:createStackScene':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createStackScene(${JSON.stringify(stmt.canvasId)});`
    case 'g3d:createStackTower':
      return `${pad}SZGame3D.createStackTower(${identifiers.get(stmt.worldVar)});`
    case 'g3d:stackDrop':
      return `${pad}SZGame3D.stackDrop(${identifiers.get(stmt.worldVar)});`
    case 'g3d:stackStep':
      return `${pad}SZGame3D.stackStep(${identifiers.get(stmt.worldVar)});`
    case 'g3d:stackReset':
      return `${pad}SZGame3D.stackReset(${identifiers.get(stmt.worldVar)});`
    case 'g3d:moveBy':
      return `${pad}SZGame3D.moveBy(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.z, 0, identifiers, recAt(base))});`
    case 'g3d:rotateBy':
      return `${pad}SZGame3D.rotateBy(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.axis)}, ${compileExpr(stmt.amount, 0, identifiers, recAt(base))});`
    case 'g3d:moveTowards':
      return `${pad}SZGame3D.moveTowards(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.z, 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.factor), 0, identifiers, recAt(base))});`
    case 'g3d:lookAtObject':
      return `${pad}SZGame3D.lookAtObject(${identifiers.get(stmt.aVar)}, ${identifiers.get(stmt.bVar)});`
    case 'g3d:lookAtPoint':
      return `${pad}SZGame3D.lookAtPoint(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))}, ${compileExpr(stmt.z, 0, identifiers, recAt(base))});`
    case 'g3d:moveForward':
      return `${pad}SZGame3D.moveForward(${identifiers.get(stmt.objVar)}, ${compileExpr(stmt.dist, 0, identifiers, recAt(base))});`
    case 'g3d:faceVelocity':
      return `${pad}SZGame3D.faceVelocity(${identifiers.get(stmt.objVar)});`
    case 'g3d:body':
      return `${pad}SZGame3D.body(${identifiers.get(stmt.objVar)}, ${compileExpr(valueToExpr(stmt.gravity), 0, identifiers, recAt(base))});`
    case 'g3d:stepBody':
      return `${pad}SZGame3D.stepBody(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.worldVar)});`
    case 'g3d:setSolid':
      return `${pad}SZGame3D.setSolid(${identifiers.get(stmt.objVar)});`
    case 'g3d:platformerControls':
      return `${pad}SZGame3D.platformerControls(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.worldVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.jump), 0, identifiers, recAt(base))});`
    case 'g3d:fpsControls':
      return `${pad}SZGame3D.fpsControls(${identifiers.get(stmt.objVar)}, ${identifiers.get(stmt.worldVar)}, ${compileExpr(valueToExpr(stmt.speed), 0, identifiers, recAt(base))});`
    case 'g3d:resolveCollision':
      return `${pad}SZGame3D.resolveCollision(${identifiers.get(stmt.aVar)}, ${identifiers.get(stmt.bVar)});`
    case 'g3d:fpsCamera':
      return `${pad}SZGame3D.fpsCamera(${identifiers.get(stmt.worldVar)}, ${identifiers.get(stmt.objVar)});`
    case 'g3d:orbitCamera':
      return `${pad}SZGame3D.orbitCamera(${identifiers.get(stmt.worldVar)}, ${identifiers.get(stmt.objVar)});`
    case 'g3d:thirdPersonCamera':
      return `${pad}SZGame3D.thirdPersonCamera(${identifiers.get(stmt.worldVar)}, ${identifiers.get(stmt.objVar)}, ${compileExpr(valueToExpr(stmt.dist), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.height), 0, identifiers, recAt(base))});`
    case 'g3d:cameraLookAt':
      return `${pad}SZGame3D.cameraLookAt(${identifiers.get(stmt.worldVar)}, ${identifiers.get(stmt.objVar)});`
    case 'g3d:setFOV':
      return `${pad}SZGame3D.setFOV(${identifiers.get(stmt.worldVar)}, ${compileExpr(valueToExpr(stmt.deg), 0, identifiers, recAt(base))});`
    case 'g3d:createCylinder':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createCylinder(${identifiers.get(stmt.worldVar)}, { radius: ${compileExpr(valueToExpr(stmt.radius), 0, identifiers, recAt(base))}, height: ${compileExpr(valueToExpr(stmt.height), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:createCone':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createCone(${identifiers.get(stmt.worldVar)}, { radius: ${compileExpr(valueToExpr(stmt.radius), 0, identifiers, recAt(base))}, height: ${compileExpr(valueToExpr(stmt.height), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:createPlane':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createPlane(${identifiers.get(stmt.worldVar)}, { width: ${compileExpr(valueToExpr(stmt.width), 0, identifiers, recAt(base))}, depth: ${compileExpr(valueToExpr(stmt.depth), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:createTorus':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createTorus(${identifiers.get(stmt.worldVar)}, { radius: ${compileExpr(valueToExpr(stmt.radius), 0, identifiers, recAt(base))}, tube: ${compileExpr(valueToExpr(stmt.tube), 0, identifiers, recAt(base))}, color: ${JSON.stringify(stmt.color)} });`
    case 'g3d:createModel':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createModel(${identifiers.get(stmt.worldVar)});`
    case 'g3d:setColor':
      return `${pad}SZGame3D.setColor(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.color)});`
    case 'g3d:setOpacity':
      return `${pad}SZGame3D.setOpacity(${identifiers.get(stmt.objVar)}, ${compileExpr(valueToExpr(stmt.opacity), 0, identifiers, recAt(base))});`
    case 'g3d:setMaterial':
      return `${pad}SZGame3D.setMaterial(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.kind)});`
    case 'g3d:setTexture':
      return `${pad}SZGame3D.setTexture(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.asset)});`
    case 'g3d:setVisible':
      return `${pad}SZGame3D.setVisible(${identifiers.get(stmt.objVar)}, ${JSON.stringify(stmt.mode)});`
    case 'g3d:removeObject':
      return `${pad}SZGame3D.remove(${identifiers.get(stmt.worldVar)}, ${identifiers.get(stmt.objVar)});`
    case 'g3d:addToModel':
      return `${pad}SZGame3D.addToModel(${identifiers.get(stmt.modelVar)}, ${identifiers.get(stmt.partVar)});`
    case 'g3d:addAmbientLight':
      return `${pad}SZGame3D.addAmbientLight(${identifiers.get(stmt.worldVar)}, ${JSON.stringify(stmt.color)}, ${compileExpr(valueToExpr(stmt.intensity), 0, identifiers, recAt(base))});`
    case 'g3d:addSunLight':
      return `${pad}SZGame3D.addSunLight(${identifiers.get(stmt.worldVar)}, ${JSON.stringify(stmt.color)}, ${compileExpr(valueToExpr(stmt.intensity), 0, identifiers, recAt(base))});`
    case 'g3d:addPointLight':
      return `${pad}SZGame3D.addPointLight(${identifiers.get(stmt.worldVar)}, ${JSON.stringify(stmt.color)}, ${compileExpr(valueToExpr(stmt.intensity), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.z), 0, identifiers, recAt(base))});`
    case 'g3d:setFog':
      return `${pad}SZGame3D.setFog(${identifiers.get(stmt.worldVar)}, ${JSON.stringify(stmt.color)}, ${compileExpr(valueToExpr(stmt.near), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.far), 0, identifiers, recAt(base))});`
    case 'g3d:setSky':
      return `${pad}SZGame3D.setSky(${identifiers.get(stmt.worldVar)}, ${JSON.stringify(stmt.top)}, ${JSON.stringify(stmt.bottom)});`
    case 'g3d:setShadows':
      return `${pad}SZGame3D.setShadows(${identifiers.get(stmt.worldVar)}, ${JSON.stringify(stmt.mode)});`
    case 'g3d:createSwarm':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame3D.createSwarm(${identifiers.get(stmt.worldVar)});`
    case 'g3d:spawnInSwarm':
      return `${pad}SZGame3D.spawnInSwarm(${identifiers.get(stmt.swarmVar)}, ${identifiers.get(stmt.originalVar)}, ${compileExpr(valueToExpr(stmt.x), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.y), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.z), 0, identifiers, recAt(base))});`
    case 'g3d:forEachInSwarm': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      return `${pad}SZGame3D.forEachInSwarm(${identifiers.get(stmt.swarmVar)}, (${identifiers.get(stmt.itemName)}) => {\n${body}\n${pad}});`
    }
    case 'g3d:removeFromSwarm':
      return `${pad}SZGame3D.removeFromSwarm(${identifiers.get(stmt.swarmVar)}, ${identifiers.get(stmt.itemVar)});`
    case 'g3d:pruneSwarm':
      return `${pad}SZGame3D.pruneSwarm(${identifiers.get(stmt.swarmVar)}, ${JSON.stringify(stmt.axis)}, ${compileExpr(valueToExpr(stmt.min), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.max), 0, identifiers, recAt(base))});`
    case 'g3d:playNote':
      return `${pad}SZGame3D.playNote(${compileExpr(valueToExpr(stmt.freq), 0, identifiers, recAt(base))}, ${compileExpr(valueToExpr(stmt.ms), 0, identifiers, recAt(base))});`
    case 'g3d:playEffect':
      return `${pad}SZGame3D.playEffect(${JSON.stringify(stmt.kind)});`
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
        lines.push(`${pad}  ${normalizeIdentifier(m.name)}(${params}) {`)
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
      return `${pad}const ${identifiers.get(stmt.varName)} = new ${identifiers.getClassReference(stmt.className)}(${args});`
    }
    case 'callMethod': {
      const args = (stmt.args ?? [])
        .map((a) => compileExpr(a, 0, identifiers, recAt(base)))
        .join(', ')
      return `${pad}${identifiers.get(stmt.objectVar)}.${normalizeIdentifier(stmt.method)}(${args});`
    }
    case 'eventHandler': {
      const handler = identifiers.get(stmt.handlerName)
      if (stmt.targetKind === 'window') {
        return `${pad}window.addEventListener(${JSON.stringify(stmt.event)}, ${handler});`
      }
      if (stmt.targetKind === 'document') {
        return `${pad}document.addEventListener(${JSON.stringify(stmt.event)}, ${handler});`
      }
      return `${pad}${elementExpr(stmt.target, stmt.targetKind, identifiers)}?.addEventListener(${JSON.stringify(stmt.event)}, ${handler});`
    }
    case 'setThisProp':
      return `${pad}this.${normalizeIdentifier(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'setProp':
      return `${pad}${identifiers.get(stmt.objectVar)}.${normalizeIdentifier(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'memberSet':
      return `${pad}${compileExpr(stmt.object, 20, identifiers, recAt(base))}.${normalizeIdentifier(stmt.name)} = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'newImage': {
      const imgVar = identifiers.get(stmt.varName)
      const src = compileExpr(stmt.src, 0, identifiers, recAt(base))
      return `${pad}const ${imgVar} = new Image();\n${pad}${imgVar}.src = ${src};`
    }
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
    // Statement que só avalia um valor e descarta (round-trip fiel de um no-op).
    case 'exprStatement':
      return `${pad}${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    // `requestAnimationFrame(nome)` — a função é uma REFERÊNCIA (nome), não uma chamada.
    case 'requestFrame':
      return `${pad}requestAnimationFrame(${identifiers.get(stmt.fn)});`
    case 'indexSet':
      return `${pad}${compileExpr(stmt.object, 20, identifiers, recAt(base))}[${compileExpr(stmt.index, 0, identifiers, recAt(base))}] = ${compileExpr(stmt.value, 0, identifiers, recAt(base))};`
    case 'imageOnLoad': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const target = compileExpr(stmt.target, 20, identifiers, recAt(base))
      return `${pad}${target}.onload = () => {\n${body}\n${pad}};`
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
      const head = `${pad}function ${identifiers.get(stmt.name)}(${params}) {`
      return body ? `${head}\n${body}\n${pad}}` : `${head}\n${pad}}`
    }
    case 'callFunction': {
      const args = stmt.args.map((a) => compileExpr(a, 0, identifiers, recAt(base))).join(', ')
      return `${pad}${identifiers.get(stmt.name)}(${args});`
    }
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
      return `${pad}setTimeout(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 0, identifiers, recAt(delayLine))});`
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
      return `${pad}setInterval(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 0, identifiers, recAt(delayLine))});`
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
      return `${pad}setTimeout(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 6, identifiers, recAt(delayLine))} * 1000);`
    }
    case 'setIntervalSeconds': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const delayLine = base + 1 + countLines(body)
      return `${pad}setInterval(() => {\n${body}\n${pad}}, ${compileExpr(stmt.delay, 6, identifiers, recAt(delayLine))} * 1000);`
    }
    case 'rawJS': {
      // Indenta APENAS a 1ª linha física (e só se ela não for vazia). As linhas
      // seguintes ficam verbatim — re-indentar todas inseria o pad DENTRO de
      // template/strings multilinha, corrompendo o conteúdo. No nível raiz (pad
      // vazio) o texto sai byte-a-byte idêntico ao original.
      if (!pad) return stmt.code
      const nl = stmt.code.indexOf('\n')
      const firstLine = nl === -1 ? stmt.code : stmt.code.slice(0, nl)
      if (!firstLine.length) return stmt.code
      return pad + stmt.code
    }
    default: {
      // Espelha o default de `compileExpr`: um statement fora do esquema (ex.:
      // IR de um JSON importado por um estranho) caía pela borda do `switch` e
      // `compileStatementCode` devolvia `undefined`, que vazava como a STRING
      // `"undefined"` no script gerado. A atribuição a `never` é o valor real:
      // uma variante nova de `JSStatement` sem `case` aqui passa a ser ERRO DE
      // COMPILAÇÃO. Em runtime, lança erro tipado e capturável.
      const _never: never = stmt
      throw new GeneratorError(
        `Statement de IR não suportado: ${JSON.stringify((_never as { type?: unknown }).type)}`,
      )
    }
  }
}

function childMapContext(
  mapContext: CompileMapContext | undefined,
  startLine: number,
): CompileMapContext | undefined {
  return mapContext ? { map: mapContext.map, startLine } : undefined
}

/** Acesso a um data-attribute: `.dataset.chave` (chave identificadora) ou `.dataset["chave"]`. */
function datasetAccess(base: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${base}.dataset.${key}`
    : `${base}.dataset[${JSON.stringify(key)}]`
}

/** Acesso a uma propriedade de estilo: `.style.left` (camelCase) ou `.style["z-index"]`. */
function styleAccess(base: string, prop: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(prop)
    ? `${base}.style.${prop}`
    : `${base}.style[${JSON.stringify(prop)}]`
}

function lastLineEndColumn(code: string): number {
  const lines = code.split('\n')
  return (lines[lines.length - 1]?.length ?? 0) + 1
}

function createPreparedIdentifierScope(statements: JSStatement[]): IdentifierScope {
  // Guarda também o caminho de `compileStatements` chamado de fora (sem passar
  // um escopo) — aqui as recursões de reserva/coleta rodam primeiro. Iterativo,
  // então não estoura a pilha por conta própria.
  assertJSDepth(statements)
  const identifiers = createIdentifierScope()
  // Reserva o elemento <canvas> de cada `canvasSetup` ANTES dos nomes de
  // variável. Assim o elemento fica sempre com o nome `canvas` (estável), em vez
  // de virar `canvas_2` quando, por acaso, existe uma variável homônima ou a
  // ordem dos blocos muda (ex.: ao reorganizar). A alocação preguiçosa anterior
  // dependia da ordem de compilação e causava o nome instável.
  reserveCanvasElements(statements, identifiers)
  // Reserva nomes de CLASSE antes das variáveis: a classe fica com o nome e uma
  // variável homônima (ex.: a instância) recebe um sufixo, evitando
  // `class X {}` + `const X = new X()` (Identifier 'X' already declared).
  reserveClassNames(statements, identifiers)
  const names = collectIdentifierNames(statements)
  for (const name of orderIdentifierNames(names)) identifiers.get(name)
  return identifiers
}

/** Chave única de uma declaração de classe (id do bloco; cai no nome se ausente). */
function classKey(stmt: Extract<JSStatement, { type: 'classDecl' }>): string {
  return stmt.__id ?? stmt.name
}

/** Reserva os nomes de todas as classes declaradas (inclui corpos aninhados). */
function reserveClassNames(statements: JSStatement[], scope: IdentifierScope): void {
  for (const stmt of statements) {
    if (stmt.type === 'classDecl') {
      scope.declareClassName(classKey(stmt), stmt.name)
    }
    switch (stmt.type) {
      case 'if':
        reserveClassNames(stmt.then, scope)
        if (stmt.else) reserveClassNames(stmt.else, scope)
        break
      case 'repeat':
      case 'while':
      case 'doWhile':
      case 'forOf':
      case 'forRange':
      case 'event':
      case 'forEach':
      case 'setTimeout':
      case 'setInterval':
      case 'setTimeoutSeconds':
      case 'setIntervalSeconds':
      case 'animationLoop':
      case 'g2d:updateEachFrame':
      case 'g2d:onPointer':
      case 'g2d:onKey':
      case 'g2d:onOverlap':
      case 'g2d:forEachInGroup':
      case 'g2d:pruneOffscreen':
      case 'g2d:onGroupOverlap':
      case 'g2d:onSpriteGroupOverlap':
      case 'g2d:onEnemyDefeated':
      case 'g2d:onEnemyShotHit':
      case 'g2d:everyFrames':
      case 'g2d:everySeconds':
      case 'g3d:animate':
      case 'g3d:forEachInSwarm':
        reserveClassNames(stmt.body, scope)
        break
      case 'classDecl':
        reserveClassNames(stmt.ctorBody, scope)
        for (const method of stmt.methods) reserveClassNames(method.body, scope)
        break
      case 'tryCatch':
        reserveClassNames(stmt.body, scope)
        reserveClassNames(stmt.handler, scope)
        if (stmt.finalizer) reserveClassNames(stmt.finalizer, scope)
        break
      case 'fetchJson':
        reserveClassNames(stmt.body, scope)
        if (stmt.catchBody) reserveClassNames(stmt.catchBody, scope)
        break
    }
  }
}

/** Reserva, em ordem, o elemento <canvas> de cada `canvasSetup` (inclui corpos aninhados). */
function reserveCanvasElements(statements: JSStatement[], scope: IdentifierScope): void {
  for (const stmt of statements) {
    if (stmt.type === 'canvasSetup') scope.getCanvasElement(stmt.varName)
    switch (stmt.type) {
      case 'if':
        reserveCanvasElements(stmt.then, scope)
        if (stmt.else) reserveCanvasElements(stmt.else, scope)
        break
      case 'repeat':
      case 'while':
      case 'doWhile':
      case 'forOf':
      case 'forRange':
      case 'event':
      case 'forEach':
      case 'setTimeout':
      case 'setInterval':
      case 'setTimeoutSeconds':
      case 'setIntervalSeconds':
      case 'animationLoop':
      case 'g2d:updateEachFrame':
      case 'g2d:onPointer':
      case 'g2d:onKey':
      case 'g2d:onOverlap':
      case 'g2d:forEachInGroup':
      case 'g2d:pruneOffscreen':
      case 'g2d:onGroupOverlap':
      case 'g2d:onSpriteGroupOverlap':
      case 'g2d:onEnemyDefeated':
      case 'g2d:onEnemyShotHit':
      case 'g2d:everyFrames':
      case 'g2d:everySeconds':
      case 'g3d:animate':
      case 'g3d:forEachInSwarm':
        reserveCanvasElements(stmt.body, scope)
        break
      case 'classDecl':
        for (const method of stmt.methods) reserveCanvasElements(method.body, scope)
        break
      case 'tryCatch':
        reserveCanvasElements(stmt.body, scope)
        reserveCanvasElements(stmt.handler, scope)
        if (stmt.finalizer) reserveCanvasElements(stmt.finalizer, scope)
        break
      case 'fetchJson':
        reserveCanvasElements(stmt.body, scope)
        if (stmt.catchBody) reserveCanvasElements(stmt.catchBody, scope)
        break
    }
  }
}

function orderIdentifierNames(names: Set<string>): string[] {
  return [...names].sort((a, b) => identifierPriority(a) - identifierPriority(b))
}

function identifierPriority(name: string): number {
  return normalizeIdentifier(name) === name ? 0 : 1
}

function collectIdentifierNames(statements: JSStatement[]): Set<string> {
  const names = new Set<string>()
  for (const statement of statements) collectStatementIdentifiers(statement, names)
  return names
}

function collectStatementIdentifiers(stmt: JSStatement, names: Set<string>): void {
  switch (stmt.type) {
    case 'var':
    case 'assign':
      names.add(stmt.name)
      collectExprIdentifiers(stmt.value, names)
      return
    case 'declareVar':
      names.add(stmt.name)
      return
    case 'if':
      collectExprIdentifiers(stmt.cond, names)
      for (const child of stmt.then) collectStatementIdentifiers(child, names)
      for (const child of stmt.else ?? []) collectStatementIdentifiers(child, names)
      return
    case 'repeat':
      collectExprIdentifiers(stmt.times, names)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'while':
    case 'doWhile':
      collectExprIdentifiers(stmt.cond, names)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'break':
    case 'continue':
      return
    case 'forOf':
      names.add(stmt.itemName)
      names.add(stmt.iterableVar)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'forRange':
      names.add(stmt.varName)
      collectExprIdentifiers(stmt.from, names)
      collectExprIdentifiers(stmt.to, names)
      collectExprIdentifiers(stmt.step, names)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'tryCatch':
      if (stmt.errorName) names.add(stmt.errorName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      for (const child of stmt.handler) collectStatementIdentifiers(child, names)
      for (const child of stmt.finalizer ?? []) collectStatementIdentifiers(child, names)
      return
    case 'fetchJson':
      collectExprIdentifiers(stmt.url, names)
      names.add(stmt.okName)
      if (stmt.catchName) names.add(stmt.catchName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      for (const child of stmt.catchBody ?? []) collectStatementIdentifiers(child, names)
      return
    case 'event':
    case 'animationLoop':
    case 'g2d:updateEachFrame':
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'consoleLog':
      collectExprIdentifiers(stmt.value, names)
      return
    case 'setText':
      collectExprIdentifiers(stmt.value, names)
      return
    case 'querySelector':
    case 'querySelectorAll':
    case 'getElementById':
    case 'keyboardSimple':
      names.add(stmt.varName)
      return
    case 'storageSet':
      collectExprIdentifiers(stmt.key, names)
      collectExprIdentifiers(stmt.value, names)
      return
    case 'eventMethod':
      return
    case 'createElement':
    case 'createElementNS':
      names.add(stmt.varName)
      return
    case 'getAttribute':
      names.add(stmt.varName)
      if (stmt.targetKind === 'var') names.add(stmt.targetId)
      return
    case 'appendChild':
      names.add(stmt.parentVar)
      names.add(stmt.childVar)
      return
    case 'throwError':
      collectExprIdentifiers(stmt.message, names)
      return
    case 'objectAssign':
      names.add(stmt.targetVar)
      names.add(stmt.sourceVar)
      return
    case 'switch':
      collectExprIdentifiers(stmt.subject, names)
      for (const c of stmt.cases) {
        collectExprIdentifiers(c.match, names)
        for (const s of c.body) collectStatementIdentifiers(s, names)
      }
      for (const s of stmt.default ?? []) collectStatementIdentifiers(s, names)
      return
    case 'setDataset':
    case 'setStyle':
    case 'setAttribute':
      if (stmt.targetKind === 'var') names.add(stmt.targetId)
      collectExprIdentifiers(stmt.value, names)
      return
    case 'canvasSetup':
      names.add(stmt.varName)
      return
    case 'canvasClear':
      names.add(stmt.ctxVar)
      names.add(stmt.canvasVar)
      return
    case 'canvasFillStyle':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.color, names)
      return
    case 'canvasFillRect':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.w, names)
      collectExprIdentifiers(stmt.h, names)
      return
    case 'canvasArc':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.r, names)
      return
    case 'canvasStrokeRect':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.w, names)
      collectExprIdentifiers(stmt.h, names)
      return
    case 'canvasClearRect':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.w, names)
      collectExprIdentifiers(stmt.h, names)
      return
    case 'canvasRoundRect':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.w, names)
      collectExprIdentifiers(stmt.h, names)
      collectExprIdentifiers(stmt.r, names)
      return
    case 'canvasEllipse':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.rx, names)
      collectExprIdentifiers(stmt.ry, names)
      return
    case 'canvasArcSlice':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.r, names)
      collectExprIdentifiers(stmt.start, names)
      collectExprIdentifiers(stmt.end, names)
      return
    case 'canvasQuadraticCurve':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.cpx, names)
      collectExprIdentifiers(stmt.cpy, names)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      return
    case 'canvasBezierCurve':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.cp1x, names)
      collectExprIdentifiers(stmt.cp1y, names)
      collectExprIdentifiers(stmt.cp2x, names)
      collectExprIdentifiers(stmt.cp2y, names)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      return
    case 'canvasShadow':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.color, names)
      collectExprIdentifiers(stmt.blur, names)
      return
    case 'canvasStrokeText':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.text, names)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      return
    case 'canvasLineDash':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.segment, names)
      return

    case 'canvasFillText':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.text, names)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      return
    case 'canvasDrawImage':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.w, names)
      collectExprIdentifiers(stmt.h, names)
      return
    case 'canvasSave':
    case 'canvasRestore':
      names.add(stmt.ctxVar)
      return
    case 'canvasTranslate':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      return
    case 'canvasRotate':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.angle, names)
      return
    case 'canvasScale':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.sx, names)
      collectExprIdentifiers(stmt.sy, names)
      return
    case 'canvasGradient':
      names.add(stmt.ctxVar)
      names.add(stmt.varName)
      collectExprIdentifiers(stmt.x0, names)
      collectExprIdentifiers(stmt.y0, names)
      collectExprIdentifiers(stmt.x1, names)
      collectExprIdentifiers(stmt.y1, names)
      return
    case 'canvasBeginPath':
    case 'canvasClosePath':
    case 'canvasStroke':
    case 'canvasFill':
    case 'canvasFont':
    case 'canvasTextAlign':
    case 'canvasTextBaseline':
      names.add(stmt.ctxVar)
      return
    case 'canvasArcTo':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x1, names)
      collectExprIdentifiers(stmt.y1, names)
      collectExprIdentifiers(stmt.x2, names)
      collectExprIdentifiers(stmt.y2, names)
      collectExprIdentifiers(stmt.r, names)
      return
    case 'canvasMoveTo':
    case 'canvasLineTo':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      return
    case 'canvasRect':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.w, names)
      collectExprIdentifiers(stmt.h, names)
      return
    case 'canvasClip':
      names.add(stmt.ctxVar)
      return
    case 'canvasStrokeStyle':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.color, names)
      return
    case 'canvasLineWidth':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.width, names)
      return
    case 'canvasGlobalAlpha':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.alpha, names)
      return
    case 'g2d:createSprite':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      return
    case 'g2d:score':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.initial), names)
      return
    case 'g2d:drawSprite':
      names.add(stmt.ctxVar)
      names.add(stmt.spriteVar)
      return
    case 'g2d:setPosition':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      return
    case 'g2d:setVelocity':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(stmt.vx, names)
      collectExprIdentifiers(stmt.vy, names)
      return
    case 'g2d:collides':
      names.add(stmt.aVar)
      names.add(stmt.bVar)
      names.add(stmt.varName)
      return
    case 'g2d:gameOver':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.text), names)
      return
    case 'g2d:applyVelocity':
      names.add(stmt.spriteVar)
      return
    case 'g2d:bounceOnEdges':
      names.add(stmt.spriteVar)
      names.add(stmt.ctxVar)
      return
    case 'g2d:circleCollides':
      names.add(stmt.aVar)
      names.add(stmt.bVar)
      names.add(stmt.varName)
      return
    case 'g2d:setGravity':
      collectExprIdentifiers(valueToExpr(stmt.value), names)
      return
    case 'g2d:playSound':
      collectExprIdentifiers(valueToExpr(stmt.freq), names)
      collectExprIdentifiers(valueToExpr(stmt.durationMs), names)
      return
    case 'g2d:playNote':
      collectExprIdentifiers(valueToExpr(stmt.ms), names)
      return
    case 'g2d:playFx':
    case 'g2d:playMusic':
    case 'g2d:stopMusic':
    case 'g2d:pauseGame':
    case 'g2d:resumeGame':
      return
    case 'g2d:setCamera':
    case 'g2d:showFps':
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      return
    case 'g2d:drawHitbox':
      names.add(stmt.spriteVar)
      return
    case 'g2d:cameraFollow':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.worldW), names)
      collectExprIdentifiers(valueToExpr(stmt.worldH), names)
      return
    case 'g2d:breakTile':
      names.add(stmt.mapVar)
      names.add(stmt.spriteVar)
      return
    case 'g2d:setTile':
      names.add(stmt.mapVar)
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.index), names)
      return
    case 'g2d:bringToFront':
    case 'g2d:sendToBack':
      names.add(stmt.spriteVar)
      names.add(stmt.groupVar)
      return
    case 'g2d:aimAt':
      names.add(stmt.spriteVar)
      names.add(stmt.targetVar)
      return
    case 'g2d:moveToward':
      names.add(stmt.spriteVar)
      names.add(stmt.targetVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g2d:flipSprite':
    case 'g2d:wrapEdges':
      names.add(stmt.spriteVar)
      return
    case 'g2d:setOpacity':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.percent), names)
      return
    case 'g2d:setHealth':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.amount), names)
      return
    case 'g2d:changeHealth':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.delta), names)
      return
    case 'g2d:setSize':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      return
    case 'g2d:scaleSprite':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.factor), names)
      return
    case 'g2d:pruneOld':
      names.add(stmt.groupVar)
      collectExprIdentifiers(valueToExpr(stmt.seconds), names)
      return
    case 'g2d:onPointer':
      names.add(stmt.xName)
      names.add(stmt.yName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:onKey':
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:onOverlap':
      names.add(stmt.aVar)
      names.add(stmt.bVar)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:createGroup':
      names.add(stmt.varName)
      return
    case 'g2d:spawnInGroup':
    case 'g2d:spawnImageInGroup':
      names.add(stmt.groupVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      collectExprIdentifiers(stmt.vx, names)
      collectExprIdentifiers(stmt.vy, names)
      return
    case 'g2d:updateGroup':
    case 'g2d:clearGroup':
      names.add(stmt.groupVar)
      return
    case 'g2d:drawGroup':
      names.add(stmt.groupVar)
      names.add(stmt.ctxVar)
      return
    case 'g2d:forEachInGroup':
      names.add(stmt.groupVar)
      names.add(stmt.itemName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:pruneOffscreen':
      names.add(stmt.groupVar)
      names.add(stmt.ctxVar)
      names.add(stmt.itemName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:onGroupOverlap':
      names.add(stmt.aGroup)
      names.add(stmt.bGroup)
      names.add(stmt.aName)
      names.add(stmt.bName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:removeFromGroup':
      names.add(stmt.groupVar)
      names.add(stmt.spriteVar)
      return
    case 'g2d:everyFrames':
      collectExprIdentifiers(stmt.n, names)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:everySeconds':
      collectExprIdentifiers(valueToExpr(stmt.seconds), names)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:spawnBullet':
      names.add(stmt.groupVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(valueToExpr(stmt.radius), names)
      collectExprIdentifiers(stmt.vx, names)
      collectExprIdentifiers(stmt.vy, names)
      return
    case 'g2d:blinkSprite':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.frames), names)
      return
    case 'g2d:arrowsX':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g2d:drawScore':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.value, names)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      return
    case 'g2d:drawLabel':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      return
    case 'g2d:drawHearts':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.count, names)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      return
    case 'g2d:drawBar':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.value, names)
      collectExprIdentifiers(stmt.max, names)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      return
    case 'g2d:showScreen':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(screenTextToExpr(stmt.title), names)
      collectExprIdentifiers(screenTextToExpr(stmt.subtitle), names)
      collectExprIdentifiers(screenTextToExpr(stmt.hint), names)
      return
    case 'g2d:starfield':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g2d:dragX':
    case 'g2d:explode':
      names.add(stmt.spriteVar)
      return
    case 'g2d:createShip':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      return
    case 'g2d:spawnAsteroid':
      names.add(stmt.groupVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      collectExprIdentifiers(stmt.vx, names)
      collectExprIdentifiers(stmt.vy, names)
      return
    case 'g2d:onSpriteGroupOverlap':
      names.add(stmt.spriteVar)
      names.add(stmt.groupVar)
      names.add(stmt.itemName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:steerThrust':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      collectExprIdentifiers(valueToExpr(stmt.turn), names)
      return
    case 'g2d:rotateSprite':
    case 'g2d:pointSprite':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.deg), names)
      return
    case 'g2d:thrust':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.force), names)
      return
    case 'g2d:applyFriction':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.factor), names)
      return
    case 'g2d:shootFrom':
      names.add(stmt.spriteVar)
      names.add(stmt.groupVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g2d:spawnAsteroidEdge':
      names.add(stmt.groupVar)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g2d:jumpOnGround':
    case 'g2d:controlDino':
      names.add(stmt.spriteVar)
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.jump), names)
      return
    case 'g2d:createDino':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      return
    case 'g2d:createStickHero':
    case 'g2d:createBalloon':
      names.add(stmt.varName)
      names.add(stmt.ctxVar)
      return
    case 'g2d:updateStickHero':
    case 'g2d:restartStickHero':
    case 'g2d:updateBalloon':
    case 'g2d:restartBalloon':
      names.add(stmt.gameVar)
      return
    case 'g2d:spawnObstacle':
      names.add(stmt.groupVar)
      names.add(stmt.ctxVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      collectExprIdentifiers(stmt.vx, names)
      return
    case 'g2d:spawnEgg':
      names.add(stmt.groupVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.vx, names)
      return
    case 'g2d:forest':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g2d:createCity':
      names.add(stmt.varName)
      return
    case 'g2d:drawCity':
    case 'g2d:drawWind':
    case 'g2d:drawBanana':
      names.add(stmt.ctxVar)
      names.add(stmt.cityVar)
      return
    case 'g2d:placeThrower':
      names.add(stmt.varName)
      names.add(stmt.cityVar)
      return
    case 'g2d:newWind':
    case 'g2d:updateBanana':
      names.add(stmt.cityVar)
      return
    case 'g2d:aimDrag':
      names.add(stmt.ctxVar)
      names.add(stmt.throwerVar)
      return
    case 'g2d:throwBanana':
      names.add(stmt.throwerVar)
      names.add(stmt.cityVar)
      return
    case 'g2d:setScene':
    case 'g2d:restart':
    case 'g2d:playShoot':
    case 'g2d:playExplosion':
    case 'g2d:playJump':
    case 'g2d:playDinoHurt':
    case 'g2d:playCollect':
    case 'g2d:playWhistle':
    case 'g2d:playBoom':
      return
    case 'g2d:fitScreen':
      collectExprIdentifiers(valueToExpr(stmt.percent), names)
      return
    case 'g2d:setupStage':
      collectExprIdentifiers(valueToExpr(stmt.width), names)
      collectExprIdentifiers(valueToExpr(stmt.height), names)
      return
    case 'g2d:computerTurn':
      names.add(stmt.throwerVar)
      names.add(stmt.cityVar)
      names.add(stmt.enemyVar)
      return
    case 'g2d:drawAimReadout':
      names.add(stmt.ctxVar)
      return
    case 'g2d:createImageSprite':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      return
    case 'g2d:setImage':
      names.add(stmt.spriteVar)
      return
    case 'g2d:loadSpritesheet':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.frameW), names)
      collectExprIdentifiers(valueToExpr(stmt.frameH), names)
      return
    case 'g2d:animateSprite':
      names.add(stmt.spriteVar)
      names.add(stmt.sheetVar)
      collectExprIdentifiers(valueToExpr(stmt.from), names)
      collectExprIdentifiers(valueToExpr(stmt.to), names)
      collectExprIdentifiers(valueToExpr(stmt.fps), names)
      return
    case 'g2d:setStateAnim':
      names.add(stmt.spriteVar)
      names.add(stmt.sheetVar)
      collectExprIdentifiers(valueToExpr(stmt.from), names)
      collectExprIdentifiers(valueToExpr(stmt.to), names)
      collectExprIdentifiers(valueToExpr(stmt.fps), names)
      return
    case 'g2d:autoAnimate':
      names.add(stmt.spriteVar)
      return
    case 'g2d:defineEnemyType':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.hp), names)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      collectExprIdentifiers(valueToExpr(stmt.dmg), names)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      return
    case 'g2d:enemyStateAnim':
      names.add(stmt.typeVar)
      names.add(stmt.sheetVar)
      collectExprIdentifiers(valueToExpr(stmt.from), names)
      collectExprIdentifiers(valueToExpr(stmt.to), names)
      collectExprIdentifiers(valueToExpr(stmt.fps), names)
      return
    case 'g2d:setEnemyTypeParam':
      names.add(stmt.typeVar)
      collectExprIdentifiers(valueToExpr(stmt.value), names)
      return
    case 'g2d:spawnEnemy':
      names.add(stmt.typeVar)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      return
    case 'g2d:updateEnemyType':
      names.add(stmt.typeVar)
      names.add(stmt.ctxVar)
      names.add(stmt.targetVar)
      return
    case 'g2d:drawEnemyType':
      names.add(stmt.ctxVar)
      names.add(stmt.typeVar)
      return
    case 'g2d:onEnemyDefeated':
      names.add(stmt.typeVar)
      names.add(stmt.itemName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:onEnemyShotHit':
      names.add(stmt.spriteVar)
      names.add(stmt.typeVar)
      names.add(stmt.itemName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g2d:hurtByEnemy':
      names.add(stmt.spriteVar)
      names.add(stmt.enemyVar)
      return
    case 'g2d:drawFrame':
      names.add(stmt.ctxVar)
      names.add(stmt.sheetVar)
      collectExprIdentifiers(valueToExpr(stmt.index), names)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.w), names)
      collectExprIdentifiers(valueToExpr(stmt.h), names)
      return
    case 'g2d:clampToScreen':
      names.add(stmt.spriteVar)
      names.add(stmt.ctxVar)
      return
    case 'g2d:platformer':
      names.add(stmt.spriteVar)
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      collectExprIdentifiers(valueToExpr(stmt.jump), names)
      return
    case 'g2d:topDown':
    case 'g2d:followPointer':
      names.add(stmt.spriteVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g2d:flash':
    case 'g2d:drawParticles':
      names.add(stmt.ctxVar)
      return
    case 'g2d:shake':
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.intensity), names)
      return
    case 'g2d:emitParticles':
      collectExprIdentifiers(valueToExpr(stmt.count), names)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      return
    case 'g2d:createTileMap':
      names.add(stmt.varName)
      collectExprIdentifiers(valueToExpr(stmt.tile), names)
      return
    case 'g2d:drawTileMap':
      names.add(stmt.mapVar)
      names.add(stmt.ctxVar)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      return
    case 'g2d:tileMapCollide':
      names.add(stmt.spriteVar)
      names.add(stmt.mapVar)
      return
    case 'g3d:createScene':
    case 'g3d:createFullscreenScene':
      names.add(stmt.varName)
      return
    case 'g3d:setBackground':
      names.add(stmt.worldVar)
      return
    case 'g3d:setCameraPosition':
      names.add(stmt.worldVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.z, names)
      return
    case 'g3d:createBox':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.size), names)
      return
    case 'g3d:createSphere':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.radius), names)
      return
    case 'g3d:setPosition':
    case 'g3d:setRotation':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.z, names)
      return
    case 'g3d:animate':
      names.add(stmt.worldVar)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g3d:createBlock':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.width), names)
      collectExprIdentifiers(valueToExpr(stmt.height), names)
      collectExprIdentifiers(valueToExpr(stmt.depth), names)
      return
    case 'g3d:setVelocity':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.z, names)
      return
    case 'g3d:jump':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.force, names)
      return
    case 'g3d:setScale':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.factor, names)
      return
    case 'g3d:applyGravity':
      names.add(stmt.objVar)
      names.add(stmt.groundVar)
      return
    case 'g3d:controlWithKeys':
      names.add(stmt.objVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g3d:cameraFollow':
      names.add(stmt.worldVar)
      names.add(stmt.objVar)
      return
    case 'g3d:createGroup':
      names.add(stmt.varName)
      return
    case 'g3d:runEnemies':
      names.add(stmt.worldVar)
      names.add(stmt.groupVar)
      names.add(stmt.groundVar)
      collectExprIdentifiers(valueToExpr(stmt.every), names)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g3d:stop':
      names.add(stmt.worldVar)
      return
    case 'g3d:createCrossingScene':
      names.add(stmt.varName)
      return
    case 'g3d:createCrosser':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      return
    case 'g3d:crosserMove':
    case 'g3d:gridStep':
    case 'g3d:gridMove':
      names.add(stmt.objVar)
      return
    case 'g3d:crosserStep':
    case 'g3d:crosserReset':
      names.add(stmt.objVar)
      names.add(stmt.worldVar)
      return
    case 'g3d:addRow':
      names.add(stmt.worldVar)
      collectExprIdentifiers(stmt.rowIndex, names)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g3d:moveTraffic':
      names.add(stmt.worldVar)
      return
    case 'g3d:generateRows':
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.count), names)
      return
    case 'g3d:isometricCamera':
      names.add(stmt.worldVar)
      if (stmt.followVar) names.add(stmt.followVar)
      return
    case 'g3d:moveAcross':
      names.add(stmt.groupVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      collectExprIdentifiers(valueToExpr(stmt.min), names)
      collectExprIdentifiers(valueToExpr(stmt.max), names)
      return
    case 'g3d:gridPosition':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.row, names)
      collectExprIdentifiers(stmt.col, names)
      return
    case 'g3d:topCamera':
      names.add(stmt.worldVar)
      if (stmt.followVar) names.add(stmt.followVar)
      return
    case 'g3d:moveInCircle':
      names.add(stmt.objVar)
      collectExprIdentifiers(valueToExpr(stmt.radius), names)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g3d:createRaceScene':
      names.add(stmt.varName)
      return
    case 'g3d:createRaceCar':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      return
    case 'g3d:createRaceTrack':
    case 'g3d:runRivals':
      names.add(stmt.worldVar)
      return
    case 'g3d:raceStep':
    case 'g3d:raceReset':
      names.add(stmt.objVar)
      names.add(stmt.worldVar)
      return
    case 'g3d:raceControl':
      names.add(stmt.objVar)
      return
    case 'g3d:fall':
      names.add(stmt.objVar)
      return
    case 'g3d:slideBetween':
      names.add(stmt.objVar)
      collectExprIdentifiers(valueToExpr(stmt.min), names)
      collectExprIdentifiers(valueToExpr(stmt.max), names)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g3d:spin':
      names.add(stmt.objVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g3d:createStackScene':
      names.add(stmt.varName)
      return
    case 'g3d:createStackTower':
    case 'g3d:stackDrop':
    case 'g3d:stackStep':
    case 'g3d:stackReset':
      names.add(stmt.worldVar)
      return
    case 'g3d:moveBy':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.z, names)
      return
    case 'g3d:moveTowards':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.z, names)
      collectExprIdentifiers(valueToExpr(stmt.factor), names)
      return
    case 'g3d:rotateBy':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.amount, names)
      return
    case 'g3d:lookAtObject':
      names.add(stmt.aVar)
      names.add(stmt.bVar)
      return
    case 'g3d:lookAtPoint':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.x, names)
      collectExprIdentifiers(stmt.y, names)
      collectExprIdentifiers(stmt.z, names)
      return
    case 'g3d:moveForward':
      names.add(stmt.objVar)
      collectExprIdentifiers(stmt.dist, names)
      return
    case 'g3d:faceVelocity':
    case 'g3d:setSolid':
      names.add(stmt.objVar)
      return
    case 'g3d:body':
      names.add(stmt.objVar)
      collectExprIdentifiers(valueToExpr(stmt.gravity), names)
      return
    case 'g3d:stepBody':
      names.add(stmt.objVar)
      names.add(stmt.worldVar)
      return
    case 'g3d:platformerControls':
      names.add(stmt.objVar)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      collectExprIdentifiers(valueToExpr(stmt.jump), names)
      return
    case 'g3d:fpsControls':
      names.add(stmt.objVar)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.speed), names)
      return
    case 'g3d:resolveCollision':
      names.add(stmt.aVar)
      names.add(stmt.bVar)
      return
    case 'g3d:fpsCamera':
    case 'g3d:orbitCamera':
    case 'g3d:cameraLookAt':
      names.add(stmt.worldVar)
      names.add(stmt.objVar)
      return
    case 'g3d:thirdPersonCamera':
      names.add(stmt.worldVar)
      names.add(stmt.objVar)
      collectExprIdentifiers(valueToExpr(stmt.dist), names)
      collectExprIdentifiers(valueToExpr(stmt.height), names)
      return
    case 'g3d:setFOV':
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.deg), names)
      return
    case 'g3d:createCylinder':
    case 'g3d:createCone':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.radius), names)
      collectExprIdentifiers(valueToExpr(stmt.height), names)
      return
    case 'g3d:createPlane':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.width), names)
      collectExprIdentifiers(valueToExpr(stmt.depth), names)
      return
    case 'g3d:createTorus':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.radius), names)
      collectExprIdentifiers(valueToExpr(stmt.tube), names)
      return
    case 'g3d:createModel':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      return
    case 'g3d:setColor':
    case 'g3d:setMaterial':
    case 'g3d:setTexture':
    case 'g3d:setVisible':
      names.add(stmt.objVar)
      return
    case 'g3d:setOpacity':
      names.add(stmt.objVar)
      collectExprIdentifiers(valueToExpr(stmt.opacity), names)
      return
    case 'g3d:removeObject':
      names.add(stmt.worldVar)
      names.add(stmt.objVar)
      return
    case 'g3d:addToModel':
      names.add(stmt.modelVar)
      names.add(stmt.partVar)
      return
    case 'g3d:setSky':
    case 'g3d:setShadows':
      names.add(stmt.worldVar)
      return
    case 'g3d:addAmbientLight':
    case 'g3d:addSunLight':
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.intensity), names)
      return
    case 'g3d:addPointLight':
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.intensity), names)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.z), names)
      return
    case 'g3d:setFog':
      names.add(stmt.worldVar)
      collectExprIdentifiers(valueToExpr(stmt.near), names)
      collectExprIdentifiers(valueToExpr(stmt.far), names)
      return
    case 'g3d:createSwarm':
      names.add(stmt.varName)
      names.add(stmt.worldVar)
      return
    case 'g3d:spawnInSwarm':
      names.add(stmt.swarmVar)
      names.add(stmt.originalVar)
      collectExprIdentifiers(valueToExpr(stmt.x), names)
      collectExprIdentifiers(valueToExpr(stmt.y), names)
      collectExprIdentifiers(valueToExpr(stmt.z), names)
      return
    case 'g3d:forEachInSwarm':
      names.add(stmt.swarmVar)
      names.add(stmt.itemName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'g3d:removeFromSwarm':
      names.add(stmt.swarmVar)
      names.add(stmt.itemVar)
      return
    case 'g3d:pruneSwarm':
      names.add(stmt.swarmVar)
      collectExprIdentifiers(valueToExpr(stmt.min), names)
      collectExprIdentifiers(valueToExpr(stmt.max), names)
      return
    case 'g3d:playEffect':
      return
    case 'g3d:playNote':
      collectExprIdentifiers(valueToExpr(stmt.freq), names)
      collectExprIdentifiers(valueToExpr(stmt.ms), names)
      return
    case 'classDecl':
      for (const param of stmt.ctorParams ?? []) names.add(param)
      for (const child of stmt.ctorBody) collectStatementIdentifiers(child, names)
      for (const m of stmt.methods) {
        for (const param of m.params) names.add(param)
        for (const child of m.body) collectStatementIdentifiers(child, names)
      }
      return
    case 'newInstance':
      names.add(stmt.varName)
      for (const arg of stmt.args ?? []) collectExprIdentifiers(arg, names)
      return
    case 'callMethod':
      names.add(stmt.objectVar)
      for (const arg of stmt.args ?? []) collectExprIdentifiers(arg, names)
      return
    case 'eventHandler':
      names.add(stmt.handlerName)
      if (stmt.targetKind === 'var') names.add(stmt.target)
      return
    case 'setThisProp':
      collectExprIdentifiers(stmt.value, names)
      return
    case 'setProp':
      names.add(stmt.objectVar)
      collectExprIdentifiers(stmt.value, names)
      return
    case 'memberSet':
      collectExprIdentifiers(stmt.object, names)
      collectExprIdentifiers(stmt.value, names)
      return
    case 'newImage':
      names.add(stmt.varName)
      collectExprIdentifiers(stmt.src, names)
      return
    case 'memberCall':
      collectExprIdentifiers(stmt.object, names)
      for (const arg of stmt.args) collectExprIdentifiers(arg, names)
      return
    case 'superCall':
    case 'superMethodCall':
      for (const arg of stmt.args) collectExprIdentifiers(arg, names)
      return
    case 'exprStatement':
      collectExprIdentifiers(stmt.value, names)
      return
    case 'requestFrame':
      names.add(stmt.fn)
      return
    case 'indexSet':
      collectExprIdentifiers(stmt.object, names)
      collectExprIdentifiers(stmt.index, names)
      collectExprIdentifiers(stmt.value, names)
      return
    case 'imageOnLoad':
      collectExprIdentifiers(stmt.target, names)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'return':
      if (stmt.value !== undefined) collectExprIdentifiers(stmt.value, names)
      return
    case 'funcDecl':
      names.add(stmt.name)
      for (const param of stmt.params) names.add(param)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'callFunction':
      names.add(stmt.name)
      for (const arg of stmt.args) collectExprIdentifiers(arg, names)
      return
    case 'forEach':
      collectExprIdentifiers(stmt.arrayExpr, names)
      names.add(stmt.itemName)
      if (stmt.indexName) names.add(stmt.indexName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'setTimeout':
    case 'setInterval':
    case 'setTimeoutSeconds':
    case 'setIntervalSeconds':
      collectExprIdentifiers(stmt.delay, names)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'arrayPush':
      names.add(stmt.arrayVar)
      collectExprIdentifiers(stmt.value, names)
      return
    case 'arrayRemove':
      names.add(stmt.arrayVar)
      return
    case 'arraySplice':
      names.add(stmt.arrayVar)
      collectExprIdentifiers(stmt.start, names)
      collectExprIdentifiers(stmt.count, names)
      return
    case 'classOp':
    case 'rawJS':
    // Tela cheia: sem variáveis a coletar (alvo fixo = a página).
    case 'requestFullscreen':
    case 'exitFullscreen':
    case 'toggleFullscreen':
      return
  }
}

function collectExprIdentifiers(expr: JSExpr, names: Set<string>): void {
  switch (expr.type) {
    case 'var':
      names.add(expr.name)
      return
    case 'arrayMap':
      names.add(expr.arrayVar)
      names.add(expr.itemName)
      collectExprIdentifiers(expr.transform, names)
      return
    case 'binop':
    case 'logical':
      collectExprIdentifiers(expr.left, names)
      collectExprIdentifiers(expr.right, names)
      return
    case 'logicalNot':
      collectExprIdentifiers(expr.value, names)
      return
    case 'ternary':
      collectExprIdentifiers(expr.condition, names)
      collectExprIdentifiers(expr.whenTrue, names)
      collectExprIdentifiers(expr.whenFalse, names)
      return
    case 'call':
      names.add(expr.name)
      for (const arg of expr.args) collectExprIdentifiers(arg, names)
      return
    case 'mathUnary':
      collectExprIdentifiers(expr.arg, names)
      return
    case 'mathBinary':
    case 'distance':
      collectExprIdentifiers(expr.a, names)
      collectExprIdentifiers(expr.b, names)
      return
    case 'propAccess':
      names.add(expr.objectVar)
      return
    case 'storageGet':
      collectExprIdentifiers(expr.key, names)
      return
    case 'callMethodExpr':
      names.add(expr.objectVar)
      for (const arg of expr.args) collectExprIdentifiers(arg, names)
      return
    case 'datasetGet':
      names.add(expr.objectVar)
      return
    case 'classContains':
      if (expr.targetKind === 'var') names.add(expr.targetId)
      return
    case 'concat':
    case 'concatArrays':
      for (const part of expr.parts) collectExprIdentifiers(part, names)
      return
    case 'index':
      names.add(expr.arrayVar)
      collectExprIdentifiers(expr.index, names)
      return
    case 'shuffle':
      names.add(expr.arrayVar)
      return
    case 'angleConvert':
      collectExprIdentifiers(expr.arg, names)
      return
    case 'vec2':
      collectExprIdentifiers(expr.x, names)
      collectExprIdentifiers(expr.y, names)
      return
    case 'vec3':
      collectExprIdentifiers(expr.x, names)
      collectExprIdentifiers(expr.y, names)
      collectExprIdentifiers(expr.z, names)
      return
    case 'array':
      for (const item of expr.items) collectExprIdentifiers(item, names)
      return
    case 'arrayLength':
      names.add(expr.arrayVar)
      return
    case 'objectLiteral':
      for (const e of expr.entries) collectExprIdentifiers(e.value, names)
      return
    case 'memberGet':
      collectExprIdentifiers(expr.object, names)
      return
    case 'memberCallExpr':
      collectExprIdentifiers(expr.object, names)
      for (const arg of expr.args) collectExprIdentifiers(arg, names)
      return
    case 'newExpr':
      // O nome da CLASSE resolve por getClassReference/reserveClassNames (igual
      // ao newInstance) — só os argumentos entram na coleta de identificadores.
      for (const arg of expr.args) collectExprIdentifiers(arg, names)
      return
    case 'objectOp':
      collectExprIdentifiers(expr.object, names)
      return
    case 'indexGet':
      collectExprIdentifiers(expr.object, names)
      collectExprIdentifiers(expr.index, names)
      return
    case 'hslColor':
      collectExprIdentifiers(expr.h, names)
      collectExprIdentifiers(expr.s, names)
      collectExprIdentifiers(expr.l, names)
      return
    case 'g2d:countGroup':
      names.add(expr.groupVar)
      return
    case 'g2d:spriteAngle':
      names.add(expr.spriteVar)
      return
    case 'g2d:distance':
    case 'g2d:angleTo':
      names.add(expr.aVar)
      names.add(expr.bVar)
      return
    case 'g2d:getHealth':
    case 'g2d:enemyDamage':
    case 'g2d:spriteX':
    case 'g2d:spriteY':
    case 'g2d:spriteW':
    case 'g2d:spriteH':
    case 'g2d:centerX':
    case 'g2d:centerY':
    case 'g2d:spriteVx':
    case 'g2d:spriteVy':
    case 'g2d:spriteSpeed':
    case 'g2d:isMoving':
    case 'g2d:isMovingH':
    case 'g2d:isMovingV':
    case 'g2d:hasHealth':
      names.add(expr.spriteVar)
      return
    case 'g2d:cooldownReady':
      names.add(expr.spriteVar)
      collectExprIdentifiers(valueToExpr(expr.frames), names)
      return
    case 'g2d:tileAtSprite':
      names.add(expr.mapVar)
      names.add(expr.spriteVar)
      return
    case 'g2d:stickHeroScore':
    case 'g2d:stickHeroOver':
    case 'g2d:balloonScore':
    case 'g2d:balloonFuel':
    case 'g2d:balloonOver':
      names.add(expr.gameVar)
      return
    case 'g2d:aimReleased':
      names.add(expr.throwerVar)
      return
    case 'g2d:bananaHitThrower':
      names.add(expr.cityVar)
      names.add(expr.throwerVar)
      return
    case 'g2d:bananaHitCity':
      names.add(expr.cityVar)
      return
    case 'canvasMeasureText':
      collectExprIdentifiers(expr.text, names)
      return
    case 'canvasIsPointInPath':
    case 'canvasIsPointInStroke':
      names.add(expr.ctxVar)
      collectExprIdentifiers(expr.x, names)
      collectExprIdentifiers(expr.y, names)
      return
    case 'arrayLast':
      names.add(expr.arrayVar)
      return
    case 'arrayFind':
      names.add(expr.arrayVar)
      names.add(expr.itemName)
      collectExprIdentifiers(expr.cond, names)
      return
    case 'arrayFilter':
      names.add(expr.itemName)
      collectExprIdentifiers(expr.array, names)
      collectExprIdentifiers(expr.cond, names)
      return
    case 'g2d:randomBetween':
      collectExprIdentifiers(valueToExpr(expr.min), names)
      collectExprIdentifiers(valueToExpr(expr.max), names)
      return
    case 'g2d:randomChance':
      collectExprIdentifiers(valueToExpr(expr.percent), names)
      return
    default:
      return
  }
}
