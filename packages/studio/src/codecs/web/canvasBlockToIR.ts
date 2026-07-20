import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '#ir'

export interface CanvasBlockToIRContext {
  field(block: Blockly.Block, name: string): string
  numberField(block: Blockly.Block, name: string, fallback?: number): number
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string, seen: Set<string>): JSStatement[]
}

export type CanvasStatementBlockToIRResult = { kind: 'js'; value: JSStatement }

export function canvasStatementBlockToIR(
  block: Blockly.Block,
  seen: Set<string>,
  context: CanvasBlockToIRContext,
): CanvasStatementBlockToIRResult | null {
  const f = context.field
  const fn = context.numberField
  const exprInput = context.expression
  const getStatementChildren = context.statements
  switch (block.type) {
    case 'sz_canvas_setup':
      return {
        kind: 'js',
        value: { type: 'canvasSetup', canvasId: f(block, 'CANVAS_ID'), varName: f(block, 'CTX') },
      }
    case 'sz_canvas_set_size':
      return {
        kind: 'js',
        value: {
          type: 'canvasSetSize',
          ctxVar: f(block, 'CTX'),
          w: exprInput(block, 'W', { type: 'num', value: 400 }),
          h: exprInput(block, 'H', { type: 'num', value: 300 }),
        },
      }
    case 'sz_canvas_clear':
      return { kind: 'js', value: { type: 'canvasClear', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_fill_style':
      return {
        kind: 'js',
        value: {
          type: 'canvasFillStyle',
          ctxVar: f(block, 'CTX'),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#22d3ee' }),
        },
      }
    case 'sz_canvas_fill_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasFillRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 10 }),
          w: exprInput(block, 'W', { type: 'num', value: 50 }),
          h: exprInput(block, 'H', { type: 'num', value: 50 }),
        },
      }
    case 'sz_canvas_arc':
      return {
        kind: 'js',
        value: {
          type: 'canvasArc',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          r: exprInput(block, 'R', { type: 'num', value: 20 }),
        },
      }
    case 'sz_canvas_fill_text':
      return {
        kind: 'js',
        value: {
          type: 'canvasFillText',
          ctxVar: f(block, 'CTX'),
          text: exprInput(block, 'TEXT', { type: 'str', value: 'Olá' }),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 30 }),
        },
      }
    case 'sz_canvas_anim_loop': {
      // Os campos HANDLE / TIME_VAR / DELTA_VAR só existem quando o mutator
      // revelou o respectivo slot (botões +). Ausentes/vazios → loop padrão.
      const handle = f(block, 'HANDLE').trim()
      const timeVar = f(block, 'TIME_VAR').trim()
      const deltaVar = f(block, 'DELTA_VAR').trim()
      return {
        kind: 'js',
        value: {
          type: 'animationLoop',
          body: getStatementChildren(block, 'BODY', seen),
          ...(handle ? { handle } : {}),
          ...(timeVar ? { timeVar } : {}),
          ...(deltaVar ? { deltaVar } : {}),
        },
      }
    }
    case 'sz_canvas_cancel_anim':
      return {
        kind: 'js',
        value: {
          type: 'cancelAnimationFrame',
          // Um encaixe ainda vazio precisa continuar gerando IR válido e um
          // no-op seguro; `cancelAnimationFrame(0)` não cancela outro quadro.
          handle: exprInput(block, 'HANDLE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_request_frame':
      return { kind: 'js', value: { type: 'requestFrame', fn: f(block, 'FN') } }
    case 'sz_canvas_request_frame_do':
      return {
        kind: 'js',
        value: {
          type: 'requestFrameDo',
          ...(f(block, 'PARAM') ? { param: f(block, 'PARAM') } : {}),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_canvas_keyboard':
      return { kind: 'js', value: { type: 'keyboardSimple', varName: f(block, 'NAME') } }
    case 'sz_canvas_draw_image':
      return {
        kind: 'js',
        value: {
          type: 'canvasDrawImage',
          ctxVar: f(block, 'CTX'),
          src: f(block, 'SRC'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 100 }),
          h: exprInput(block, 'H', { type: 'num', value: 100 }),
        },
      }
    case 'sz_js_new_image':
      return {
        kind: 'js',
        value: {
          type: 'newImage',
          varName: f(block, 'VAR'),
          src: exprInput(block, 'SRC', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_image_onload':
      return {
        kind: 'js',
        value: {
          type: 'imageOnLoad',
          // O objeto vazio mantém o projeto executável enquanto a criança
          // ainda não encaixou uma imagem, sem inventar uma variável global.
          target: exprInput(block, 'TARGET', { type: 'objectLiteral', entries: [] }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_image_onerror':
      return {
        kind: 'js',
        value: {
          type: 'imageOnError',
          target: exprInput(block, 'TARGET', { type: 'objectLiteral', entries: [] }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_canvas_save':
      return { kind: 'js', value: { type: 'canvasSave', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_restore':
      return { kind: 'js', value: { type: 'canvasRestore', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_translate':
      return {
        kind: 'js',
        value: {
          type: 'canvasTranslate',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_rotate':
      return {
        kind: 'js',
        value: {
          type: 'canvasRotate',
          ctxVar: f(block, 'CTX'),
          angle: exprInput(block, 'ANGLE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_scale':
      return {
        kind: 'js',
        value: {
          type: 'canvasScale',
          ctxVar: f(block, 'CTX'),
          sx: exprInput(block, 'SX', { type: 'num', value: 1 }),
          sy: exprInput(block, 'SY', { type: 'num', value: 1 }),
        },
      }
    case 'sz_canvas_gradient':
      return {
        kind: 'js',
        value: {
          type: 'canvasGradient',
          ctxVar: f(block, 'CTX'),
          varName: f(block, 'NAME'),
          x0: exprInput(block, 'X0', { type: 'num', value: 0 }),
          y0: exprInput(block, 'Y0', { type: 'num', value: 0 }),
          x1: exprInput(block, 'X1', { type: 'num', value: 200 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 0 }),
          stops: [
            { offset: 0, color: f(block, 'C0') },
            { offset: 1, color: f(block, 'C1') },
          ],
        },
      }

    // ---- Canvas: traçado/contorno, fonte e transparência (caminho "na mão") ----
    case 'sz_canvas_begin_path':
      return { kind: 'js', value: { type: 'canvasBeginPath', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_move_to':
      return {
        kind: 'js',
        value: {
          type: 'canvasMoveTo',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_line_to':
      return {
        kind: 'js',
        value: {
          type: 'canvasLineTo',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_close_path':
      return { kind: 'js', value: { type: 'canvasClosePath', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_stroke':
      return { kind: 'js', value: { type: 'canvasStroke', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_fill':
      return { kind: 'js', value: { type: 'canvasFill', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 100 }),
          h: exprInput(block, 'H', { type: 'num', value: 100 }),
        },
      }
    case 'sz_canvas_clip':
      return { kind: 'js', value: { type: 'canvasClip', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_stroke_style':
      return {
        kind: 'js',
        value: {
          type: 'canvasStrokeStyle',
          ctxVar: f(block, 'CTX'),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#000000' }),
        },
      }
    case 'sz_canvas_line_width':
      return {
        kind: 'js',
        value: {
          type: 'canvasLineWidth',
          ctxVar: f(block, 'CTX'),
          width: exprInput(block, 'WIDTH', { type: 'num', value: 1 }),
        },
      }
    case 'sz_canvas_global_alpha':
      return {
        kind: 'js',
        value: {
          type: 'canvasGlobalAlpha',
          ctxVar: f(block, 'CTX'),
          alpha: exprInput(block, 'ALPHA', { type: 'num', value: 1 }),
        },
      }
    case 'sz_canvas_font': {
      const weight = f(block, 'WEIGHT')
      return {
        kind: 'js',
        value: {
          type: 'canvasFont',
          ctxVar: f(block, 'CTX'),
          size: fn(block, 'SIZE', 20),
          family: f(block, 'FAMILY') || 'sans-serif',
          ...(weight ? { weight: weight as 'bold' | 'italic' | 'italic bold' } : {}),
        },
      }
    }
    case 'sz_canvas_text_align':
      return {
        kind: 'js',
        value: {
          type: 'canvasTextAlign',
          ctxVar: f(block, 'CTX'),
          align: (f(block, 'ALIGN') || 'left') as 'left' | 'center' | 'right',
        },
      }
    case 'sz_canvas_text_baseline':
      return {
        kind: 'js',
        value: {
          type: 'canvasTextBaseline',
          ctxVar: f(block, 'CTX'),
          baseline: (f(block, 'BASELINE') || 'alphabetic') as
            | 'top'
            | 'middle'
            | 'bottom'
            | 'alphabetic',
        },
      }

    // ---- Orientação a objetos ----
    case 'sz_canvas_arc_to':
      return {
        kind: 'js',
        value: {
          type: 'canvasArcTo',
          ctxVar: f(block, 'CTX'),
          x1: exprInput(block, 'X1', { type: 'num', value: 0 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 0 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 0 }),
          y2: exprInput(block, 'Y2', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 10 }),
        },
      }
    case 'sz_canvas_stroke_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasStrokeRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_clear_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasClearRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_round_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasRoundRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_ellipse':
      return {
        kind: 'js',
        value: {
          type: 'canvasEllipse',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          rx: exprInput(block, 'RX', { type: 'num', value: 0 }),
          ry: exprInput(block, 'RY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_arc_slice':
      return {
        kind: 'js',
        value: {
          type: 'canvasArcSlice',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 0 }),
          start: exprInput(block, 'START', { type: 'num', value: 0 }),
          end: exprInput(block, 'END', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_quadratic_curve':
      return {
        kind: 'js',
        value: {
          type: 'canvasQuadraticCurve',
          ctxVar: f(block, 'CTX'),
          cpx: exprInput(block, 'CPX', { type: 'num', value: 0 }),
          cpy: exprInput(block, 'CPY', { type: 'num', value: 0 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_bezier_curve':
      return {
        kind: 'js',
        value: {
          type: 'canvasBezierCurve',
          ctxVar: f(block, 'CTX'),
          cp1x: exprInput(block, 'CP1X', { type: 'num', value: 0 }),
          cp1y: exprInput(block, 'CP1Y', { type: 'num', value: 0 }),
          cp2x: exprInput(block, 'CP2X', { type: 'num', value: 0 }),
          cp2y: exprInput(block, 'CP2Y', { type: 'num', value: 0 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_shadow':
      return {
        kind: 'js',
        value: {
          type: 'canvasShadow',
          ctxVar: f(block, 'CTX'),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#000000' }),
          blur: exprInput(block, 'BLUR', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_stroke_text':
      return {
        kind: 'js',
        value: {
          type: 'canvasStrokeText',
          ctxVar: f(block, 'CTX'),
          text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_line_dash':
      return {
        kind: 'js',
        value: {
          type: 'canvasLineDash',
          ctxVar: f(block, 'CTX'),
          segment: exprInput(block, 'SEGMENT', { type: 'num', value: 8 }),
        },
      }
    default:
      return null
  }
}

export function canvasExpressionBlockToIR(
  block: Blockly.Block,
  context: Pick<CanvasBlockToIRContext, 'field' | 'expression'>,
): JSExpr | null {
  const f = context.field
  const exprInput = context.expression
  switch (block.type) {
    case 'sz_val_image':
      return { type: 'assetImage', name: f(block, 'ASSET') }
    case 'sz_canvas_measure_text':
      return {
        type: 'canvasMeasureText',
        ctxVar: f(block, 'CTX'),
        text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
      }
    case 'sz_canvas_point_in_path':
      return {
        type: 'canvasIsPointInPath',
        ctxVar: f(block, 'CTX'),
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
    case 'sz_canvas_point_in_stroke':
      return {
        type: 'canvasIsPointInStroke',
        ctxVar: f(block, 'CTX'),
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
    case 'sz_input_key_pressed':
      return { type: 'inputKeyPressed', key: f(block, 'KEY') || 'ArrowRight' }
    case 'sz_input_pointer_x':
      return { type: 'inputPointer', axis: 'x' }
    case 'sz_input_pointer_y':
      return { type: 'inputPointer', axis: 'y' }
    default:
      return null
  }
}
