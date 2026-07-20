import { describe, expect, it } from 'bun:test'
import {
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
  PROGRAMMING_VISIBLE_DEFINITIONS,
} from '../../../blockly/programmingContract'
import {
  createProgrammingCodecRegistry,
  PROGRAMMING_BLOCK_CODECS,
  programmingCodecForBlockType,
  programmingCodecSupports,
} from '../registry'
import type { ProgrammingBlockCodec } from '../types'

describe('registry dos codecs de Programação', () => {
  it('registra exatamente os 149 blocos públicos e os 7 legados', () => {
    const publicCodecs = PROGRAMMING_BLOCK_CODECS.filter(
      (codec) => codec.compatibility === 'public',
    )
    const legacyCodecs = PROGRAMMING_BLOCK_CODECS.filter(
      (codec) => codec.compatibility === 'legacy-hidden',
    )

    expect(publicCodecs.map((codec) => codec.blockType)).toEqual(
      expect.arrayContaining(PROGRAMMING_VISIBLE_DEFINITIONS.map((definition) => definition.type)),
    )
    expect(publicCodecs).toHaveLength(149)
    expect(legacyCodecs.map((codec) => codec.blockType)).toEqual(
      expect.arrayContaining(
        PROGRAMMING_COMPATIBILITY_DEFINITIONS.map((definition) => definition.type),
      ),
    )
    expect(legacyCodecs).toHaveLength(7)
    expect(PROGRAMMING_BLOCK_CODECS).toHaveLength(156)
  })

  it('mantém tipos únicos, pesquisáveis e com as quatro capacidades', () => {
    const types = PROGRAMMING_BLOCK_CODECS.map((codec) => codec.blockType)
    expect(new Set(types).size).toBe(types.length)
    for (const codec of PROGRAMMING_BLOCK_CODECS) {
      expect(programmingCodecForBlockType(codec.blockType)).toBe(codec)
      expect(programmingCodecSupports(codec, 'block-to-ir')).toBe(true)
      expect(programmingCodecSupports(codec, 'ir-to-block')).toBe(true)
      expect(programmingCodecSupports(codec, 'ir-to-code')).toBe(true)
      expect(programmingCodecSupports(codec, 'code-to-ir')).toBe(true)
      expect(Object.isFrozen(codec)).toBe(true)
      expect(Object.isFrozen(codec.directions)).toBe(true)
    }
    expect(Object.isFrozen(PROGRAMMING_BLOCK_CODECS)).toBe(true)
  })

  it('separa as cinco famílias sem deixar bloco sem dono', () => {
    expect(new Set(PROGRAMMING_BLOCK_CODECS.map((codec) => codec.family))).toEqual(
      new Set(['language-control', 'dom-events', 'values-math', 'functions', 'objects-classes']),
    )
  })

  it('rejeita tipo duplicado e adapter ausente', () => {
    const complete = PROGRAMMING_BLOCK_CODECS[0] as ProgrammingBlockCodec
    expect(() => createProgrammingCodecRegistry([complete, complete])).toThrow('duplicado')
    expect(() =>
      createProgrammingCodecRegistry([{ ...complete, directions: ['block-to-ir'] }]),
    ).toThrow('incompleto')
  })
})
