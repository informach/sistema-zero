import type { Pincel } from '../pincel'

/**
 * Um PINCEL que só anota o que foi pedido.
 *
 * ⭐⭐ É a régua do teste de paridade: rodando a arte portada e a arte do runtime contra dois
 * gravadores, a comparação deixa de ser "parece igual" e passa a ser a sequência de operações,
 * argumento por argumento. Sem ele, o porte de mil linhas de desenho seria verificado a olho.
 *
 * ⚠️ As PROPRIEDADES são gravadas junto das chamadas, e na ordem: `fillStyle` trocado depois do
 * `beginPath` pinta diferente de antes, e um teste que só comparasse chamadas não veria isso.
 */
export type Operacao = { op: string; args: unknown[] }

const arred = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : v

export class PincelGravador implements Pincel {
  readonly ops: Operacao[] = []

  private prop(nome: string, v: unknown) {
    this.ops.push({ op: `set:${nome}`, args: [arred(v)] })
  }
  private chamada(nome: string, ...args: unknown[]) {
    this.ops.push({ op: nome, args: args.map(arred) })
  }

  private _fillStyle: string | CanvasGradient | CanvasPattern = '#000000'
  get fillStyle() {
    return this._fillStyle
  }
  set fillStyle(v) {
    this._fillStyle = v
    this.prop('fillStyle', typeof v === 'string' ? v : '<degrade>')
  }

  private _strokeStyle: string | CanvasGradient | CanvasPattern = '#000000'
  get strokeStyle() {
    return this._strokeStyle
  }
  set strokeStyle(v) {
    this._strokeStyle = v
    this.prop('strokeStyle', typeof v === 'string' ? v : '<degrade>')
  }

  private _lineWidth = 1
  get lineWidth() {
    return this._lineWidth
  }
  set lineWidth(v) {
    this._lineWidth = v
    this.prop('lineWidth', v)
  }

  private _lineCap: CanvasLineCap = 'butt'
  get lineCap() {
    return this._lineCap
  }
  set lineCap(v) {
    this._lineCap = v
    this.prop('lineCap', v)
  }

  private _lineJoin: CanvasLineJoin = 'miter'
  get lineJoin() {
    return this._lineJoin
  }
  set lineJoin(v) {
    this._lineJoin = v
    this.prop('lineJoin', v)
  }

  private _globalAlpha = 1
  get globalAlpha() {
    return this._globalAlpha
  }
  set globalAlpha(v) {
    this._globalAlpha = v
    this.prop('globalAlpha', v)
  }

  private _shadowColor = 'rgba(0, 0, 0, 0)'
  get shadowColor() {
    return this._shadowColor
  }
  set shadowColor(v) {
    this._shadowColor = v
    this.prop('shadowColor', v)
  }

  private _shadowBlur = 0
  get shadowBlur() {
    return this._shadowBlur
  }
  set shadowBlur(v) {
    this._shadowBlur = v
    this.prop('shadowBlur', v)
  }

  save() {
    this.chamada('save')
  }
  restore() {
    this.chamada('restore')
  }
  translate(x: number, y: number) {
    this.chamada('translate', x, y)
  }
  scale(x: number, y: number) {
    this.chamada('scale', x, y)
  }
  rotate(a: number) {
    this.chamada('rotate', a)
  }
  beginPath() {
    this.chamada('beginPath')
  }
  closePath() {
    this.chamada('closePath')
  }
  moveTo(x: number, y: number) {
    this.chamada('moveTo', x, y)
  }
  lineTo(x: number, y: number) {
    this.chamada('lineTo', x, y)
  }
  quadraticCurveTo(a: number, b: number, c: number, d: number) {
    this.chamada('quadraticCurveTo', a, b, c, d)
  }
  bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.chamada('bezierCurveTo', a, b, c, d, e, f)
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean) {
    this.chamada('arc', x, y, r, a0, a1, !!ccw)
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rot: number,
    a0: number,
    a1: number,
    ccw?: boolean,
  ) {
    this.chamada('ellipse', x, y, rx, ry, rot, a0, a1, !!ccw)
  }
  rect(x: number, y: number, w: number, h: number) {
    this.chamada('rect', x, y, w, h)
  }
  roundRect(x: number, y: number, w: number, h: number, r?: unknown) {
    this.chamada('roundRect', x, y, w, h, typeof r === 'number' ? r : 0)
  }
  fill() {
    this.chamada('fill')
  }
  stroke() {
    this.chamada('stroke')
  }
  clip() {
    this.chamada('clip')
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.chamada('fillRect', x, y, w, h)
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this.chamada('strokeRect', x, y, w, h)
  }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    this.chamada('createLinearGradient', x0, y0, x1, y1)
    const ops = this.ops
    return {
      addColorStop(offset: number, cor: string) {
        ops.push({ op: 'addColorStop', args: [arred(offset), cor] })
      },
    }
  }
}
