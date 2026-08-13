import { describe, expect, it } from 'bun:test'
import { stageCursor } from './stageCursor'

describe('stageCursor (o cursor da mãozinha)', () => {
  it('sem Mão e sem espaço não impõe cursor nenhum', () => {
    expect(stageCursor({ handTool: false, panning: false })).toBeUndefined()
    expect(stageCursor({ handTool: false, spaceHeld: false, panning: false })).toBeUndefined()
  })

  it('a ferramenta Mão mostra a mão ABERTA', () => {
    expect(stageCursor({ handTool: true, panning: false })).toBe('grab')
  })

  it('segurar espaço mostra a mão ABERTA mesmo com outra ferramenta', () => {
    expect(stageCursor({ handTool: false, spaceHeld: true, panning: false })).toBe('grab')
  })

  it('arrastando mostra a mão FECHADA, venha a mão de onde vier', () => {
    expect(stageCursor({ handTool: true, panning: true })).toBe('grabbing')
    expect(stageCursor({ handTool: false, spaceHeld: true, panning: true })).toBe('grabbing')
  })

  it('o arrasto vence: mão fechada mesmo se a ferramenta já não for a Mão', () => {
    // Soltar o espaço no meio do arrasto deixa o gesto terminar (VectorStage).
    expect(stageCursor({ handTool: false, spaceHeld: false, panning: true })).toBe('grabbing')
  })
})
