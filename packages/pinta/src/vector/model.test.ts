import { describe, expect, it } from 'bun:test'
import { isVectorGradient, sanitizeVectorShape } from './model'

const base = { id: 's1', stroke: null, opacity: 1, rotation: 0 }

describe('sanitizeVectorShape — preenchimento degradê', () => {
  it('aceita e normaliza um degradê linear válido', () => {
    const shape = sanitizeVectorShape({
      ...base,
      type: 'rect',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
      fill: { type: 'linear', from: '#ff2121', to: '#003fad', angle: 450 },
    })
    expect(shape).not.toBeNull()
    if (!shape || !isVectorGradient(shape.fill)) throw new Error('degradê esperado')
    expect(shape.fill.from).toBe('#ff2121')
    expect(shape.fill.to).toBe('#003fad')
    expect(shape.fill.angle).toBe(90) // 450 % 360
  })

  it('cor sólida hex continua aceita', () => {
    const shape = sanitizeVectorShape({
      ...base,
      type: 'ellipse',
      cx: 5,
      cy: 5,
      rx: 3,
      ry: 3,
      fill: '#78dc52',
    })
    expect(shape?.fill).toBe('#78dc52')
  })

  it('descarta degradê com cor inválida (from não-hex)', () => {
    const shape = sanitizeVectorShape({
      ...base,
      type: 'rect',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
      fill: { type: 'linear', from: 'vermelho', to: '#003fad', angle: 0 },
    })
    expect(shape).toBeNull()
  })
})

describe('sanitizeVectorShape — grupo', () => {
  const rectRaw = { ...base, type: 'rect', x: 0, y: 0, w: 10, h: 10, rx: 0, fill: '#78dc52' }

  it('preserva um groupId string válido', () => {
    const shape = sanitizeVectorShape({ ...rectRaw, groupId: 'grupo-1' })
    expect(shape?.groupId).toBe('grupo-1')
  })

  it('groupId ausente/ inválido fica undefined', () => {
    expect(sanitizeVectorShape(rectRaw)?.groupId).toBeUndefined()
    expect(sanitizeVectorShape({ ...rectRaw, groupId: 42 })?.groupId).toBeUndefined()
  })

  it('rejeita ids capazes de quebrar atributos SVG', () => {
    expect(sanitizeVectorShape({ ...rectRaw, id: 'x"><script>alert(1)</script>' })).toBeNull()
    expect(
      sanitizeVectorShape({ ...rectRaw, groupId: 'grupo com espaço' })?.groupId,
    ).toBeUndefined()
  })
})
