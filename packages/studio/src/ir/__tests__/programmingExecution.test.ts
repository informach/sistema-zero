import { describe, expect, it } from 'bun:test'
import { programmingChildBodyEntries } from '../programmingExecution'
import type { JSStatement } from '../schema'

describe('contrato de execução dos corpos filhos de Programação', () => {
  it('classifica callbacks DOM e de imagem como adiados', () => {
    for (const type of ['onClickAssign', 'imageOnLoad', 'imageOnError'] as const) {
      const statement = {
        type,
        target: { type: 'objectLiteral', entries: [] },
        body: [],
      } satisfies JSStatement
      expect(programmingChildBodyEntries(statement)[0]?.timing, type).toBe('deferred')
    }
  })

  it('declara event e ctx somente nos corpos correspondentes', () => {
    const event = {
      type: 'event',
      target: '',
      targetKind: 'document',
      event: 'click',
      body: [],
    } satisfies JSStatement
    expect(programmingChildBodyEntries(event)[0]?.localVariables).toEqual(['event'])

    const shape = {
      type: 'g2d:defineShape',
      shapeName: 'heroi',
      body: [],
    } satisfies JSStatement
    expect(programmingChildBodyEntries(shape)[0]).toMatchObject({
      localVariables: ['ctx'],
      canvasContexts: ['ctx'],
    })
  })

  it('enumera cases e default sem uma lista paralela no gerador', () => {
    const statement = {
      type: 'switch',
      subject: { type: 'num', value: 1 },
      cases: [{ match: { type: 'num', value: 1 }, body: [] }],
      default: [],
    } satisfies JSStatement

    expect(programmingChildBodyEntries(statement).map((entry) => entry.path)).toEqual([
      ['cases', 0, 'body'],
      ['default'],
    ])
  })
})
