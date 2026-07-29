import type { JSExpr } from '#ir'
import type { ExprMapContext, IdentifierResolver } from '../../generators/expr'

export const CANVAS_EXPRESSION_IR_TYPES = [
  'inputKeyPressed',
  'inputPointer',
  'assetImage',
  'canvasMeasureText',
  'canvasIsPointInPath',
  'canvasIsPointInStroke',
] as const satisfies readonly JSExpr['type'][]

export type CanvasExpression = Extract<
  JSExpr,
  { type: (typeof CANVAS_EXPRESSION_IR_TYPES)[number] }
>

const CANVAS_EXPRESSION_IR_TYPE_SET: ReadonlySet<JSExpr['type']> = new Set(
  CANVAS_EXPRESSION_IR_TYPES,
)

export function isCanvasExpression(expr: JSExpr): expr is CanvasExpression {
  return CANVAS_EXPRESSION_IR_TYPE_SET.has(expr.type)
}

export interface CanvasExpressionCodeContext {
  compileExpression(
    expr: JSExpr,
    parentPrecedence: number,
    identifiers: IdentifierResolver,
    rec?: ExprMapContext,
  ): string
}

export function canvasExpressionToCode(
  expr: CanvasExpression,
  identifiers: IdentifierResolver,
  rec: ExprMapContext | undefined,
  context: CanvasExpressionCodeContext,
): string | undefined {
  const compileExpr = context.compileExpression
  switch (expr.type) {
    case 'inputKeyPressed':
      return `__szInput.key(${JSON.stringify(expr.key)})`
    case 'inputPointer':
      return `__szInput.${expr.axis}`
    case 'assetImage':
      // Fonte RESOLVIDA do asset: o dataURL semeado em __SZGAME_ASSETS (ver
      // preview/assetsBridge), com fallback pro nome cru. Usável direto em img.src.
      return `(window.__SZGAME_ASSETS?.[${JSON.stringify(expr.name)}] ?? ${JSON.stringify(expr.name)})`
    case 'canvasMeasureText':
      return `${identifiers.get(expr.ctxVar)}.measureText(${compileExpr(expr.text, 0, identifiers, rec)}).width`
    case 'canvasIsPointInPath':
      return `${identifiers.get(expr.ctxVar)}.isPointInPath(${compileExpr(expr.x, 0, identifiers, rec)}, ${compileExpr(expr.y, 0, identifiers, rec)})`
    case 'canvasIsPointInStroke':
      return `${identifiers.get(expr.ctxVar)}.isPointInStroke(${compileExpr(expr.x, 0, identifiers, rec)}, ${compileExpr(expr.y, 0, identifiers, rec)})`
    default:
      return undefined
  }
}
