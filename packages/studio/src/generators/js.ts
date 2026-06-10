import type { JSExpr, JSStatement } from '#ir'
import {
  compileExpr,
  createIdentifierScope,
  type ExprMapContext,
  type IdentifierScope,
  normalizeIdentifier,
} from './expr'
import { countLines, SourceMapBuilder } from './sourceMap'

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
  const hoisted: JSStatement[] = []
  const top = statements.map((s) => stripNestedAnimationLoops(s, hoisted))
  return [...top, ...hoisted]
}

/** Remove loops de animação dos corpos aninhados de `stmt`, jogando-os em `hoisted`. */
function stripNestedAnimationLoops(stmt: JSStatement, hoisted: JSStatement[]): JSStatement {
  switch (stmt.type) {
    case 'if':
      return {
        ...stmt,
        then: extractAnimationLoops(stmt.then, hoisted),
        else: stmt.else ? extractAnimationLoops(stmt.else, hoisted) : undefined,
      }
    case 'repeat':
      return { ...stmt, body: extractAnimationLoops(stmt.body, hoisted) }
    case 'event':
      return { ...stmt, body: extractAnimationLoops(stmt.body, hoisted) }
    case 'forEach':
    case 'setTimeout':
    case 'setInterval':
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
      const ifBlock = `${pad}if (${compileExpr(stmt.cond, 0, identifiers, recAt(base))}) {\n${thenBody}\n${pad}}`
      const elseBody = stmt.else
        ? compileStatements(
            stmt.else,
            indent + 1,
            identifiers,
            childMapContext(mapContext, startLine + countLines(ifBlock)),
          )
        : null
      return elseBody ? `${ifBlock} else {\n${elseBody}\n${pad}}` : ifBlock
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
    case 'event': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
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
      // 'document') ou eventos de teclado (keydown/keyup).
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
    case 'querySelector':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.querySelector(${JSON.stringify(stmt.selector)});`
    case 'getElementById':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.getElementById(${JSON.stringify(stmt.id)});`
    case 'classOp':
      return `${pad}${elementExpr(stmt.targetId, stmt.targetKind, identifiers)}?.classList.${stmt.op}(${JSON.stringify(stmt.className)});`
    case 'createElement':
      return `${pad}const ${identifiers.get(stmt.varName)} = document.createElement(${JSON.stringify(stmt.tag)});`
    case 'appendChild':
      return `${pad}${identifiers.get(stmt.parentVar)}.appendChild(${identifiers.get(stmt.childVar)});`
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
      const canvas = identifiers.getCanvasElement(stmt.canvasVar)
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
    case 'canvasFillText':
      return `${pad}${identifiers.get(stmt.ctxVar)}.fillText(${compileExpr(stmt.text, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'animationLoop': {
      const frame = identifiers.reserveInternal('frame')
      const startLine = mapContext?.startLine ?? 1
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
        `${pad}  ${image}.src = ${JSON.stringify(stmt.src)};`,
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
      return `${pad}const ${v} = SZGame2D.createSprite({ x: ${stmt.x}, y: ${stmt.y}, w: ${stmt.w}, h: ${stmt.h}, color: ${JSON.stringify(stmt.color)} });`
    }
    case 'g2d:drawSprite':
      return `${pad}SZGame2D.drawSprite(${identifiers.get(stmt.ctxVar)}, ${identifiers.get(stmt.spriteVar)});`
    case 'g2d:moveByKeys':
      return `${pad}SZGame2D.moveByKeys(${identifiers.get(stmt.spriteVar)}, ${stmt.speed});`
    case 'g2d:setPosition':
      return `${pad}${identifiers.get(stmt.spriteVar)}.x = ${compileExpr(stmt.x, 0, identifiers, recAt(base))}; ${identifiers.get(stmt.spriteVar)}.y = ${compileExpr(stmt.y, 0, identifiers, recAt(base))};`
    case 'g2d:setVelocity':
      return `${pad}${identifiers.get(stmt.spriteVar)}.vx = ${compileExpr(stmt.vx, 0, identifiers, recAt(base))}; ${identifiers.get(stmt.spriteVar)}.vy = ${compileExpr(stmt.vy, 0, identifiers, recAt(base))};`
    case 'g2d:collides':
      return `${pad}const ${identifiers.get(stmt.varName)} = SZGame2D.isColliding(${identifiers.get(stmt.aVar)}, ${identifiers.get(stmt.bVar)});`
    case 'g2d:score':
      return `${pad}let ${identifiers.get(stmt.varName)} = ${stmt.initial};`
    case 'g2d:gameOver':
      return [
        `${pad}${identifiers.get(stmt.ctxVar)}.fillStyle = '#f87171';`,
        `${pad}${identifiers.get(stmt.ctxVar)}.font = '32px sans-serif';`,
        `${pad}${identifiers.get(stmt.ctxVar)}.fillText(${JSON.stringify(stmt.text)}, 40, 80);`,
      ].join('\n')
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
    case 'memberCall': {
      const args = stmt.args.map((a) => compileExpr(a, 0, identifiers, recAt(base))).join(', ')
      return `${pad}${compileExpr(stmt.object, 20, identifiers, recAt(base))}.${normalizeIdentifier(stmt.method)}(${args});`
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
      return `${pad}${identifiers.get(stmt.arrayVar)}.forEach((${params}) => {\n${body}\n${pad}});`
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
    case 'rawJS':
      return stmt.code
        .split('\n')
        .map((l) => (l.length ? pad + l : l))
        .join('\n')
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

function lastLineEndColumn(code: string): number {
  const lines = code.split('\n')
  return (lines[lines.length - 1]?.length ?? 0) + 1
}

function createPreparedIdentifierScope(statements: JSStatement[]): IdentifierScope {
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
      case 'event':
      case 'forEach':
      case 'setTimeout':
      case 'setInterval':
      case 'animationLoop':
      case 'g2d:updateEachFrame':
        reserveClassNames(stmt.body, scope)
        break
      case 'classDecl':
        reserveClassNames(stmt.ctorBody, scope)
        for (const method of stmt.methods) reserveClassNames(method.body, scope)
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
      case 'event':
      case 'forEach':
      case 'setTimeout':
      case 'setInterval':
      case 'animationLoop':
      case 'g2d:updateEachFrame':
        reserveCanvasElements(stmt.body, scope)
        break
      case 'classDecl':
        for (const method of stmt.methods) reserveCanvasElements(method.body, scope)
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
    case 'getElementById':
    case 'keyboardSimple':
      names.add(stmt.varName)
      return
    case 'createElement':
      names.add(stmt.varName)
      return
    case 'appendChild':
      names.add(stmt.parentVar)
      names.add(stmt.childVar)
      return
    case 'setDataset':
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
    case 'g2d:createSprite':
    case 'g2d:score':
      names.add(stmt.varName)
      return
    case 'g2d:drawSprite':
      names.add(stmt.ctxVar)
      names.add(stmt.spriteVar)
      return
    case 'g2d:moveByKeys':
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
    case 'memberCall':
      collectExprIdentifiers(stmt.object, names)
      for (const arg of stmt.args) collectExprIdentifiers(arg, names)
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
      names.add(stmt.arrayVar)
      names.add(stmt.itemName)
      if (stmt.indexName) names.add(stmt.indexName)
      for (const child of stmt.body) collectStatementIdentifiers(child, names)
      return
    case 'setTimeout':
    case 'setInterval':
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
      return
  }
}

function collectExprIdentifiers(expr: JSExpr, names: Set<string>): void {
  switch (expr.type) {
    case 'var':
      names.add(expr.name)
      return
    case 'binop':
    case 'logical':
      collectExprIdentifiers(expr.left, names)
      collectExprIdentifiers(expr.right, names)
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
    case 'hslColor':
      collectExprIdentifiers(expr.h, names)
      collectExprIdentifiers(expr.s, names)
      collectExprIdentifiers(expr.l, names)
      return
    default:
      return
  }
}
