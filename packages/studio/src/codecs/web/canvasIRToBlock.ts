import type { JSExpr, JSStatement } from '#ir'
import type { SerializedBlocklyBlock } from '../types'
import { isLosslessColor } from './losslessValues'

export interface CanvasIRToBlockContext {
  block(
    type: string,
    fields?: Record<string, string | number>,
    inputs?: Record<string, SerializedBlocklyBlock[]>,
    id?: string,
    valueInputs?: Record<string, SerializedBlocklyBlock>,
  ): SerializedBlocklyBlock
  expressionToBlock(expr: JSExpr): SerializedBlocklyBlock | null
  rawStatement(stmt: JSStatement): SerializedBlocklyBlock
  statementsToBlocks(statements: JSStatement[]): SerializedBlocklyBlock[]
  valueBlocks(map: Record<string, JSExpr>): Record<string, SerializedBlocklyBlock> | null
}

export function canvasStatementIRToBlock(
  stmt: JSStatement,
  context: CanvasIRToBlockContext,
): SerializedBlocklyBlock | null | undefined {
  const block = context.block
  const exprToValueBlock = context.expressionToBlock
  const rawJSBlock = context.rawStatement
  const statementsToBlocks = context.statementsToBlocks
  const valueBlocks = context.valueBlocks
  switch (stmt.type) {
    case 'canvasSetup':
      return block(
        'sz_canvas_setup',
        { CANVAS_ID: stmt.canvasId, CTX: stmt.varName },
        {},
        stmt.__id,
      )
    case 'canvasSetSize': {
      const vs = valueBlocks({ W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_set_size', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasClear':
      return block('sz_canvas_clear', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasFillStyle': {
      const vs = valueBlocks({ COLOR: stmt.color })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_fill_style', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasFillRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_fill_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasArc': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, R: stmt.r })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_arc', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasFillText': {
      const vs = valueBlocks({ TEXT: stmt.text, X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_fill_text', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'animationLoop': {
      const b = block('sz_canvas_anim_loop', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
      // Reativa os slots do mutator (guardar id / tempo / delta) quando o IR os tem.
      const extra: { handle?: string; timeVar?: string; deltaVar?: string } = {}
      if (stmt.handle) extra.handle = stmt.handle
      if (stmt.timeVar) extra.timeVar = stmt.timeVar
      if (stmt.deltaVar) extra.deltaVar = stmt.deltaVar
      if (Object.keys(extra).length > 0) b.extraState = extra
      return b
    }
    case 'cancelAnimationFrame': {
      const vs = valueBlocks({ HANDLE: stmt.handle })
      return vs === null ? rawJSBlock(stmt) : block('sz_canvas_cancel_anim', {}, {}, stmt.__id, vs)
    }
    case 'requestFrame':
      return block('sz_canvas_request_frame', { FN: stmt.fn }, {}, stmt.__id)
    case 'requestFrameDo':
      return block(
        'sz_canvas_request_frame_do',
        { PARAM: stmt.param ?? '' },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'keyboardSimple':
      return block('sz_canvas_keyboard', { NAME: stmt.varName }, {}, stmt.__id)
    case 'canvasDrawImage': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_draw_image', { CTX: stmt.ctxVar, SRC: stmt.src }, {}, stmt.__id, vs)
    }
    case 'newImage': {
      const src = exprToValueBlock(stmt.src)
      if (!src) return rawJSBlock(stmt)
      return block('sz_js_new_image', { VAR: stmt.varName }, {}, stmt.__id, { SRC: src })
    }
    case 'imageOnLoad': {
      const target = exprToValueBlock(stmt.target)
      if (!target) return rawJSBlock(stmt)
      return block('sz_js_image_onload', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        TARGET: target,
      })
    }
    case 'imageOnError': {
      const target = exprToValueBlock(stmt.target)
      if (!target) return rawJSBlock(stmt)
      return block('sz_js_image_onerror', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        TARGET: target,
      })
    }
    case 'canvasSave':
      return block('sz_canvas_save', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasRestore':
      return block('sz_canvas_restore', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasTranslate': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_translate', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasRotate': {
      const angle = exprToValueBlock(stmt.angle)
      return angle === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_rotate', { CTX: stmt.ctxVar }, {}, stmt.__id, { ANGLE: angle })
    }
    case 'canvasScale': {
      const sx = exprToValueBlock(stmt.sx)
      const sy = exprToValueBlock(stmt.sy)
      return sx === null || sy === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_scale', { CTX: stmt.ctxVar }, {}, stmt.__id, { SX: sx, SY: sy })
    }
    case 'canvasGradient': {
      // O bloco visual só representa FIELMENTE 2 stops nos offsets 0 e 1 com cor
      // hex de 6 dígitos (o seletor de cor a re-emite igual). Qualquer outra forma
      // — mais stops, offsets custom (0.3/0.8 viravam 0/1) ou cores nomeadas/rgba
      // (forçadas à paleta) — seria promovida COM PERDA, mudando o desenho do aluno
      // num round-trip blocos⇄código. Fica como rawJS, igual à disciplina de
      // cssEntryToBlocks (só promove quando regenera verbatim).
      const c0 = stmt.stops[0]?.color
      const c1 = stmt.stops[1]?.color
      if (
        stmt.stops.length !== 2 ||
        stmt.stops[0]?.offset !== 0 ||
        stmt.stops[1]?.offset !== 1 ||
        !c0 ||
        !c1 ||
        !isLosslessColor(c0) ||
        !isLosslessColor(c1)
      ) {
        return rawJSBlock(stmt)
      }
      const x0 = exprToValueBlock(stmt.x0)
      const y0 = exprToValueBlock(stmt.y0)
      const x1 = exprToValueBlock(stmt.x1)
      const y1 = exprToValueBlock(stmt.y1)
      if (x0 === null || y0 === null || x1 === null || y1 === null) return rawJSBlock(stmt)
      return block(
        'sz_canvas_gradient',
        { CTX: stmt.ctxVar, NAME: stmt.varName, C0: c0, C1: c1 },
        {},
        stmt.__id,
        { X0: x0, Y0: y0, X1: x1, Y1: y1 },
      )
    }
    case 'canvasBeginPath':
      return block('sz_canvas_begin_path', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasMoveTo': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_move_to', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasLineTo': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_line_to', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasClosePath':
      return block('sz_canvas_close_path', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasStroke':
      return block('sz_canvas_stroke', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasFill':
      return block('sz_canvas_fill', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasClip':
      return block('sz_canvas_clip', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasStrokeStyle': {
      const vs = valueBlocks({ COLOR: stmt.color })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_stroke_style', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasLineWidth': {
      const vs = valueBlocks({ WIDTH: stmt.width })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_line_width', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasGlobalAlpha': {
      const vs = valueBlocks({ ALPHA: stmt.alpha })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_global_alpha', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasFont':
      return block(
        'sz_canvas_font',
        { CTX: stmt.ctxVar, SIZE: stmt.size, FAMILY: stmt.family, WEIGHT: stmt.weight ?? '' },
        {},
        stmt.__id,
      )
    case 'canvasTextAlign':
      return block('sz_canvas_text_align', { CTX: stmt.ctxVar, ALIGN: stmt.align }, {}, stmt.__id)
    case 'canvasTextBaseline':
      return block(
        'sz_canvas_text_baseline',
        { CTX: stmt.ctxVar, BASELINE: stmt.baseline },
        {},
        stmt.__id,
      )
    case 'canvasArcTo': {
      const vs = valueBlocks({ X1: stmt.x1, Y1: stmt.y1, X2: stmt.x2, Y2: stmt.y2, R: stmt.r })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_arc_to', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasStrokeRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_stroke_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasClearRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_clear_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasRoundRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h, R: stmt.r })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_round_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasEllipse': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, RX: stmt.rx, RY: stmt.ry })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_ellipse', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasArcSlice': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, R: stmt.r, START: stmt.start, END: stmt.end })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_arc_slice', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasQuadraticCurve': {
      const vs = valueBlocks({ CPX: stmt.cpx, CPY: stmt.cpy, X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_quadratic_curve', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasBezierCurve': {
      const vs = valueBlocks({
        CP1X: stmt.cp1x,
        CP1Y: stmt.cp1y,
        CP2X: stmt.cp2x,
        CP2Y: stmt.cp2y,
        X: stmt.x,
        Y: stmt.y,
      })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_bezier_curve', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasShadow': {
      const vs = valueBlocks({ COLOR: stmt.color, BLUR: stmt.blur })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_shadow', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasStrokeText': {
      const vs = valueBlocks({ TEXT: stmt.text, X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_stroke_text', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasLineDash': {
      const vs = valueBlocks({ SEGMENT: stmt.segment })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_line_dash', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    default:
      return undefined
  }
}

export function canvasExpressionIRToBlock(
  expr: JSExpr,
  context: Pick<CanvasIRToBlockContext, 'block' | 'expressionToBlock' | 'valueBlocks'>,
): SerializedBlocklyBlock | null | undefined {
  const block = context.block
  const exprToValueBlock = context.expressionToBlock
  const valueBlocks = context.valueBlocks
  switch (expr.type) {
    case 'assetImage':
      return block('sz_val_image', { ASSET: expr.name }, {}, expr.__id)
    case 'canvasMeasureText': {
      const t = exprToValueBlock(expr.text)
      return t === null
        ? null
        : block('sz_canvas_measure_text', { CTX: expr.ctxVar }, {}, expr.__id, { TEXT: t })
    }
    case 'canvasIsPointInPath': {
      const vs = valueBlocks({ X: expr.x, Y: expr.y })
      return vs === null
        ? null
        : block('sz_canvas_point_in_path', { CTX: expr.ctxVar }, {}, expr.__id, vs)
    }
    case 'canvasIsPointInStroke': {
      const vs = valueBlocks({ X: expr.x, Y: expr.y })
      return vs === null
        ? null
        : block('sz_canvas_point_in_stroke', { CTX: expr.ctxVar }, {}, expr.__id, vs)
    }
    case 'inputKeyPressed':
      return block('sz_input_key_pressed', { KEY: expr.key })
    case 'inputPointer':
      return block(expr.axis === 'y' ? 'sz_input_pointer_y' : 'sz_input_pointer_x')
    default:
      return undefined
  }
}
