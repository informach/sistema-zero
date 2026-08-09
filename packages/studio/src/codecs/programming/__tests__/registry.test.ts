import { describe, expect, it } from 'bun:test'
import {
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
  PROGRAMMING_VISIBLE_DEFINITIONS,
} from '../../../blockly/programmingContract'
import {
  createProgrammingBlockRegistry,
  PROGRAMMING_BLOCK_REGISTRATIONS,
  programmingRegistrationForBlockType,
} from '../registry'
import type { ProgrammingBlockRegistration } from '../types'

describe('registro dos blocos de Programação', () => {
  it('registra exatamente os 151 blocos públicos e os 7 legados', () => {
    const publicBlocks = PROGRAMMING_BLOCK_REGISTRATIONS.filter(
      (registration) => registration.compatibility === 'public',
    )
    const legacyBlocks = PROGRAMMING_BLOCK_REGISTRATIONS.filter(
      (registration) => registration.compatibility === 'legacy-hidden',
    )

    expect(publicBlocks.map((registration) => registration.blockType)).toEqual(
      expect.arrayContaining(PROGRAMMING_VISIBLE_DEFINITIONS.map((definition) => definition.type)),
    )
    expect(publicBlocks).toHaveLength(151)
    expect(legacyBlocks.map((registration) => registration.blockType)).toEqual(
      expect.arrayContaining(
        PROGRAMMING_COMPATIBILITY_DEFINITIONS.map((definition) => definition.type),
      ),
    )
    expect(legacyBlocks).toHaveLength(7)
    expect(PROGRAMMING_BLOCK_REGISTRATIONS).toHaveLength(158)
  })

  it('mantém tipos únicos, pesquisáveis e com adapters reais nas quatro direções', () => {
    const types = PROGRAMMING_BLOCK_REGISTRATIONS.map((registration) => registration.blockType)
    expect(new Set(types).size).toBe(types.length)
    for (const registration of PROGRAMMING_BLOCK_REGISTRATIONS) {
      expect(programmingRegistrationForBlockType(registration.blockType)).toBe(registration)
      expect(Object.keys(registration.adapters).sort()).toEqual([
        'blockToIR',
        'codeToIR',
        'irToBlock',
        'irToCode',
      ])
      for (const adapter of Object.values(registration.adapters)) {
        expect(typeof adapter).toBe('function')
      }
      expect(Object.isFrozen(registration.adapters)).toBe(true)
      expect(Object.isFrozen(registration)).toBe(true)
    }
    expect(Object.isFrozen(PROGRAMMING_BLOCK_REGISTRATIONS)).toBe(true)
  })

  it('separa as cinco famílias sem deixar bloco sem dono', () => {
    expect(
      new Set(PROGRAMMING_BLOCK_REGISTRATIONS.map((registration) => registration.family)),
    ).toEqual(
      new Set(['language-control', 'dom-events', 'values-math', 'functions', 'objects-classes']),
    )
  })

  it('mantém os dispatchers centrais livres dos cases de Programação', async () => {
    const [buildIR, workspaceState, jsGenerator, expressionGenerator, jsParser] = await Promise.all(
      [
        Bun.file(new URL('../../../blockly/buildIR.ts', import.meta.url)).text(),
        Bun.file(new URL('../../../blockly/workspaceState.ts', import.meta.url)).text(),
        Bun.file(new URL('../../../generators/js.ts', import.meta.url)).text(),
        Bun.file(new URL('../../../generators/expr.ts', import.meta.url)).text(),
        Bun.file(new URL('../../../parsers/js.ts', import.meta.url)).text(),
      ],
    )

    expect(buildIR).toContain('programmingRegistration.adapters.blockToIR')
    for (const { blockType } of PROGRAMMING_BLOCK_REGISTRATIONS) {
      expect(buildIR).not.toContain(`case '${blockType}'`)
    }
    expect(workspaceState).toContain('programmingStatementIRToBlock')
    expect(workspaceState).toContain('programmingExpressionIRToBlock')
    expect(jsGenerator).toContain('programmingStatementIRToCode')
    expect(expressionGenerator).toContain('programmingExpressionIRToCode')
    expect(jsParser).toContain('executeProgrammingCodeToIR')
  })

  it('rejeita tipo duplicado, metadados divergentes e adapter ausente', () => {
    const complete = PROGRAMMING_BLOCK_REGISTRATIONS[0] as ProgrammingBlockRegistration
    expect(() => createProgrammingBlockRegistry([complete, complete])).toThrow('duplicado')
    expect(() =>
      createProgrammingBlockRegistry([{ ...complete, blockType: 'tipo-divergente' }]),
    ).toThrow('Definição divergente')
    expect(() =>
      createProgrammingBlockRegistry([
        {
          ...complete,
          adapters: { ...complete.adapters, codeToIR: undefined },
        } as unknown as ProgrammingBlockRegistration,
      ]),
    ).toThrow('adapter codeToIR')
  })
})
