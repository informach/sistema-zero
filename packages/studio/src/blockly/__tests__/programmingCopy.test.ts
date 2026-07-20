import { describe, expect, it } from 'bun:test'
import { DOM_BLOCKS } from '../blocks/dom'
import { JS_BLOCKS } from '../blocks/js'
import { OBJECT_BLOCKS } from '../blocks/objects'
import { OOP_BLOCKS } from '../blocks/oop'
import { VALUE_BLOCKS } from '../blocks/values'

const PROGRAMMING_BLOCKS = [
  ...JS_BLOCKS,
  ...DOM_BLOCKS,
  ...VALUE_BLOCKS,
  ...OOP_BLOCKS,
  ...OBJECT_BLOCKS,
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
})
