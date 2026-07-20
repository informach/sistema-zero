import { describe, expect, it } from 'bun:test'
import {
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
  PROGRAMMING_VISIBLE_DEFINITIONS,
} from '../programmingContract'

const PROGRAMMING_BLOCKS = [
  ...PROGRAMMING_VISIBLE_DEFINITIONS,
  ...PROGRAMMING_COMPATIBILITY_DEFINITIONS,
]

describe('textos infantis da categoria Programação', () => {
  it('todo bloco visível explica para que serve', () => {
    expect(
      PROGRAMMING_BLOCKS.filter((block) => !block.hidden && !block.tooltip).map(
        (block) => block.type,
      ),
    ).toEqual([])
  })

  it('não repete a tradução para código que a Ponte já mostra', () => {
    expect(
      PROGRAMMING_BLOCKS.filter((block) => /\bVira\s/.test(String(block.tooltip ?? ''))).map(
        (block) => block.type,
      ),
    ).toEqual([])
  })

  it('explica os contextos compartilhados de retorno e parâmetro', () => {
    const tooltipOf = (type: string) =>
      String(PROGRAMMING_BLOCKS.find((block) => block.type === type)?.tooltip ?? '')
    expect(tooltipOf('sz_js_return')).toMatch(/função/i)
    expect(tooltipOf('sz_js_return')).toMatch(/método/i)
    expect(tooltipOf('sz_val_arg')).toMatch(/função/i)
    expect(tooltipOf('sz_val_arg')).toMatch(/construtor|método/i)
  })
})
