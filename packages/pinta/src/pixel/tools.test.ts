import { describe, expect, it } from 'bun:test'
import { bmp, rows } from '../testing/fixtures'
import { type ToolSettings, toolPointerDown, toolPointerMove, toolPointerUp } from './tools'

const empty5 = () => bmp(['.....', '.....', '.....', '.....', '.....'])

function settings(overrides: Partial<ToolSettings> = {}): ToolSettings {
  return {
    tool: 'pencil',
    color: 1,
    brushSize: 1,
    mirrorX: false,
    mirrorY: false,
    filled: false,
    ...overrides,
  }
}

describe('lápis/borracha (gesto acumulativo)', () => {
  it('down → move desenha traço contínuo; up commita', () => {
    const down = toolPointerDown(empty5(), settings(), { x: 0, y: 0 })
    expect(down.gesture).not.toBeNull()
    if (!down.gesture) return
    const moved = toolPointerMove(down.gesture, { x: 2, y: 0 })
    const committed = toolPointerUp(moved)
    expect(committed).not.toBeNull()
    if (!committed) return
    expect(rows(committed)).toEqual(['111..', '.....', '.....', '.....', '.....'])
  })

  it('borracha pinta transparente por cima', () => {
    const base = bmp(['111..', '.....', '.....', '.....', '.....'])
    const down = toolPointerDown(base, settings({ tool: 'eraser' }), { x: 1, y: 0 })
    if (!down.gesture) throw new Error('gesto esperado')
    const committed = toolPointerUp(down.gesture)
    expect(committed).not.toBeNull()
    if (!committed) return
    expect(rows(committed)).toEqual(['1.1..', '.....', '.....', '.....', '.....'])
  })

  it('gesto sem mudança devolve null (não gasta undo)', () => {
    const base = bmp(['1....', '.....', '.....', '.....', '.....'])
    const down = toolPointerDown(base, settings(), { x: 0, y: 0 })
    if (!down.gesture) throw new Error('gesto esperado')
    expect(toolPointerUp(down.gesture)).toBeNull()
  })

  it('posições fora do bitmap são clampadas (arrasto pra fora)', () => {
    const down = toolPointerDown(empty5(), settings(), { x: 0, y: 0 })
    if (!down.gesture) throw new Error('gesto esperado')
    const moved = toolPointerMove(down.gesture, { x: 99, y: -5 })
    const committed = toolPointerUp(moved)
    expect(committed).not.toBeNull()
  })
})

describe('formas (preview redesenhado da base)', () => {
  it('retângulo encolhe quando o arrasto volta (não deixa rastro)', () => {
    const down = toolPointerDown(empty5(), settings({ tool: 'rect' }), { x: 0, y: 0 })
    if (!down.gesture) throw new Error('gesto esperado')
    const big = toolPointerMove(down.gesture, { x: 4, y: 4 })
    const small = toolPointerMove(big, { x: 2, y: 2 })
    const committed = toolPointerUp(small)
    expect(committed).not.toBeNull()
    if (!committed) return
    expect(rows(committed)).toEqual(['111..', '1.1..', '111..', '.....', '.....'])
  })
})

describe('balde (um toque)', () => {
  it('commita no down', () => {
    const result = toolPointerDown(empty5(), settings({ tool: 'fill', color: 2 }), {
      x: 2,
      y: 2,
    })
    expect(result.gesture).toBeNull()
    expect(result.commit).toBeDefined()
    if (!result.commit) return
    expect(rows(result.commit)).toEqual(['22222', '22222', '22222', '22222', '22222'])
  })

  it('sem mudança não commita', () => {
    const base = bmp(['222', '222', '222'])
    const result = toolPointerDown(base, settings({ tool: 'fill', color: 2 }), { x: 1, y: 1 })
    expect(result.commit).toBeUndefined()
  })
})

describe('conta-gotas', () => {
  it('devolve a cor sob o toque, sem desenhar', () => {
    const base = bmp(['..5..', '.....', '.....', '.....', '.....'])
    const result = toolPointerDown(base, settings({ tool: 'picker' }), { x: 2, y: 0 })
    expect(result.gesture).toBeNull()
    expect(result.pickedColor).toBe(5)
    expect(result.preview).toBe(base)
  })
})

describe('trocar cor (recolor, um toque)', () => {
  it('troca TODAS as ocorrências da cor sob o toque, não só a região contígua', () => {
    const base = bmp(['2..2.', '.....', '2..2.', '.....', '.....'])
    const result = toolPointerDown(base, settings({ tool: 'recolor', color: 7 }), { x: 0, y: 0 })
    expect(result.gesture).toBeNull()
    expect(result.commit).toBeDefined()
    if (!result.commit) return
    expect(rows(result.commit)).toEqual(['7..7.', '.....', '7..7.', '.....', '.....'])
  })

  it('tocar numa cor igual à selecionada não commita (sem gasto de undo)', () => {
    const base = bmp(['2....', '.....', '.....', '.....', '.....'])
    const result = toolPointerDown(base, settings({ tool: 'recolor', color: 2 }), { x: 0, y: 0 })
    expect(result.commit).toBeUndefined()
  })
})
