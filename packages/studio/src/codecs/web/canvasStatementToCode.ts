import type { JSExpr, JSStatement } from '#ir'
import type { ExprMapContext, IdentifierScope } from '../../generators/expr'

export const CANVAS_STATEMENT_IR_TYPES = [
  'canvasSetup',
  'canvasSetSize',
  'canvasClear',
  'canvasFillStyle',
  'canvasFillRect',
  'canvasArc',
  'canvasFillText',
  'animationLoop',
  'cancelAnimationFrame',
  'requestFrame',
  'requestFrameDo',
  'keyboardSimple',
  'canvasDrawImage',
  'newImage',
  'imageOnLoad',
  'imageOnError',
  'canvasSave',
  'canvasRestore',
  'canvasTranslate',
  'canvasRotate',
  'canvasScale',
  'canvasGradient',
  'canvasBeginPath',
  'canvasMoveTo',
  'canvasLineTo',
  'canvasClosePath',
  'canvasStroke',
  'canvasFill',
  'canvasRect',
  'canvasClip',
  'canvasStrokeStyle',
  'canvasLineWidth',
  'canvasGlobalAlpha',
  'canvasFont',
  'canvasTextAlign',
  'canvasTextBaseline',
  'canvasArcTo',
  'canvasStrokeRect',
  'canvasClearRect',
  'canvasRoundRect',
  'canvasEllipse',
  'canvasArcSlice',
  'canvasQuadraticCurve',
  'canvasBezierCurve',
  'canvasShadow',
  'canvasStrokeText',
  'canvasLineDash',
] as const satisfies readonly JSStatement['type'][]

export type CanvasStatement = Extract<
  JSStatement,
  { type: (typeof CANVAS_STATEMENT_IR_TYPES)[number] }
>

const CANVAS_STATEMENT_IR_TYPE_SET: ReadonlySet<JSStatement['type']> = new Set(
  CANVAS_STATEMENT_IR_TYPES,
)

export function isCanvasStatement(stmt: JSStatement): stmt is CanvasStatement {
  return CANVAS_STATEMENT_IR_TYPE_SET.has(stmt.type)
}

export interface CanvasStatementCodeContext<TMap extends { startLine: number }> {
  mapContext?: TMap
  recAt(line: number): ExprMapContext | undefined
  compileExpression(
    expr: JSExpr,
    parentPrecedence: number,
    identifiers: IdentifierScope,
    rec?: ExprMapContext,
  ): string
  compileStatements(
    statements: JSStatement[],
    indent: number,
    identifiers: IdentifierScope,
    mapContext?: TMap,
  ): string
  childMapContext(mapContext: TMap | undefined, startLine: number): TMap | undefined
  lifecycleResourceFunction(
    identifiers: IdentifierScope,
    globalName: 'requestAnimationFrame' | 'setInterval' | 'setTimeout',
  ): string
}

export function canvasStatementToCode<TMap extends { startLine: number }>(
  stmt: CanvasStatement,
  indent: number,
  identifiers: IdentifierScope,
  context: CanvasStatementCodeContext<TMap>,
): string | undefined {
  const pad = '  '.repeat(indent)
  const mapContext = context.mapContext
  const base = mapContext?.startLine ?? 1
  const recAt = context.recAt
  const compileExpr = context.compileExpression
  const compileStatements = context.compileStatements
  const childMapContext = context.childMapContext
  const lifecycleResourceFunction = context.lifecycleResourceFunction
  switch (stmt.type) {
    case 'canvasSetup': {
      const v = identifiers.get(stmt.varName)
      const canvas = identifiers.getCanvasElement(stmt.varName)
      const message = `Não foi possível preparar a tela Canvas “${stmt.canvasId}”. Confira se o id existe e pertence a uma tela Canvas.`
      return [
        `${pad}const ${canvas} = document.getElementById(${JSON.stringify(stmt.canvasId)});`,
        `${pad}const ${v} = ${canvas}?.getContext?.('2d');`,
        `${pad}if (!${v}) {`,
        `${pad}  throw new Error(${JSON.stringify(message)});`,
        `${pad}}`,
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
    case 'canvasFillText':
      return `${pad}${identifiers.get(stmt.ctxVar)}.fillText(${compileExpr(stmt.text, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'animationLoop': {
      const frame = identifiers.reserveInternal('frame')
      const startLine = mapContext?.startLine ?? 1
      const projectRunContext = identifiers.getProjectRunContextIdentifier()
      const requestFrame = lifecycleResourceFunction(identifiers, 'requestAnimationFrame')
      // Forma com TEMPO: expõe o relógio do requestAnimationFrame (ms) e o tempo
      // desde o quadro anterior em SEGUNDOS, para APIs de movimento/física
      // movimento independente de FPS. O loop é iniciado com requestAnimationFrame
      // (não com frame()) para que o 1º quadro já receba um tempo real.
      if (stmt.timeVar || stmt.deltaVar) {
        const tVar = stmt.timeVar
          ? identifiers.get(stmt.timeVar)
          : identifiers.reserveInternal('frameTime')
        const dVar = stmt.deltaVar ? identifiers.get(stmt.deltaVar) : null
        const lastT = dVar ? identifiers.reserveInternal('lastFrameTime') : null
        const handle = stmt.handle ? identifiers.get(stmt.handle) : undefined
        const pre: string[] = []
        if (handle) pre.push(`${pad}let ${handle};`)
        if (lastT) pre.push(`${pad}let ${lastT};`)
        pre.push(`${pad}function ${frame}(${tVar}) {`)
        if (stmt.handle && handle) {
          pre.push(`${pad}  ${handle} = ${requestFrame}(${frame});`)
        }
        if (dVar && lastT) {
          pre.push(
            `${pad}  const ${dVar} = ${lastT} === undefined ? 0 : (${tVar} - ${lastT}) / 1000;`,
          )
          pre.push(`${pad}  ${lastT} = ${tVar};`)
        }
        const body = compileStatements(
          stmt.body,
          indent + 1,
          identifiers,
          childMapContext(mapContext, startLine + pre.length),
        )
        const post: string[] = []
        if (!stmt.handle) {
          post.push(`${pad}  ${requestFrame}(${frame});`)
        }
        post.push(`${pad}}`)
        post.push(`${pad}${handle ? `${handle} = ` : ''}${requestFrame}(${frame});`)
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
          `${pad}  ${handle} = ${requestFrame}(${frame});`,
          body,
          `${pad}}`,
          projectRunContext ? `${pad}${projectRunContext}.run(${frame});` : `${pad}${frame}();`,
        ].join('\n')
      }
      if (projectRunContext) {
        const body = compileStatements(
          stmt.body,
          indent + 1,
          identifiers,
          childMapContext(mapContext, startLine + 1),
        )
        return [
          `${pad}function ${frame}() {`,
          body,
          `${pad}  ${requestFrame}(${frame});`,
          `${pad}}`,
          `${pad}${projectRunContext}.run(${frame});`,
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
    case 'requestFrame':
      return `${pad}${lifecycleResourceFunction(identifiers, 'requestAnimationFrame')}(${identifiers.get(stmt.fn)});`
    case 'requestFrameDo': {
      const body = compileStatements(
        stmt.body,
        indent + 1,
        identifiers,
        childMapContext(mapContext, (mapContext?.startLine ?? 1) + 1),
      )
      const param = stmt.param ? identifiers.get(stmt.param) : ''
      return `${pad}${lifecycleResourceFunction(identifiers, 'requestAnimationFrame')}((${param}) => {\n${body}\n${pad}});`
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
    case 'canvasDrawImage': {
      const ctx = identifiers.get(stmt.ctxVar)
      const cached = identifiers.getCanvasImageIdentifiers()
      if (cached) {
        const image = identifiers.reserveInternal(`${ctx}Imagem`)
        return [
          `${pad}{`,
          `${pad}  const ${image} = ${cached.images}.get(${JSON.stringify(stmt.src)});`,
          `${pad}  if (${image}) ${ctx}.drawImage(${image}, ${compileExpr(stmt.x, 0, identifiers, recAt(base + 2))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 2))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base + 2))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base + 2))});`,
          `${pad}}`,
        ].join('\n')
      }
      const image = identifiers.reserveInternal(`${ctx}Img`)
      return [
        `${pad}{`,
        `${pad}  const ${image} = new Image();`,
        `${pad}  ${image}.src = window.__SZGAME_ASSETS?.[${JSON.stringify(stmt.src)}] ?? ${JSON.stringify(stmt.src)};`,
        `${pad}  ${image}.onload = () => ${ctx}.drawImage(${image}, ${compileExpr(stmt.x, 0, identifiers, recAt(base + 3))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base + 3))}, ${compileExpr(stmt.w, 0, identifiers, recAt(base + 3))}, ${compileExpr(stmt.h, 0, identifiers, recAt(base + 3))});`,
        `${pad}}`,
      ].join('\n')
    }
    case 'newImage': {
      const imgVar = identifiers.get(stmt.varName)
      const src = compileExpr(stmt.src, 0, identifiers, recAt(base))
      return `${pad}const ${imgVar} = new Image();\n${pad}${imgVar}.src = ${src};`
    }
    case 'imageOnLoad': {
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
        return `${pad}${projectRunContext}.setEventHandler(${target}, "onload", (event) => {\n${body}\n${pad}});`
      }
      return `${pad}${target}.onload = (event) => {\n${body}\n${pad}};`
    }
    case 'imageOnError': {
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
        return `${pad}${projectRunContext}.setEventHandler(${target}, "onerror", (event) => {\n${body}\n${pad}});`
      }
      return `${pad}${target}.onerror = (event) => {\n${body}\n${pad}};`
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
    case 'canvasMoveTo':
      return `${pad}${identifiers.get(stmt.ctxVar)}.moveTo(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasLineTo':
      return `${pad}${identifiers.get(stmt.ctxVar)}.lineTo(${compileExpr(stmt.x, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y, 0, identifiers, recAt(base))});`
    case 'canvasClosePath':
      return `${pad}${identifiers.get(stmt.ctxVar)}.closePath();`
    case 'canvasStroke':
      return `${pad}${identifiers.get(stmt.ctxVar)}.stroke();`
    case 'canvasFill':
      return `${pad}${identifiers.get(stmt.ctxVar)}.fill();`
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
    case 'canvasArcTo':
      return `${pad}${identifiers.get(stmt.ctxVar)}.arcTo(${compileExpr(stmt.x1, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y1, 0, identifiers, recAt(base))}, ${compileExpr(stmt.x2, 0, identifiers, recAt(base))}, ${compileExpr(stmt.y2, 0, identifiers, recAt(base))}, ${compileExpr(stmt.r, 0, identifiers, recAt(base))});`
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
    default:
      return undefined
  }
}
