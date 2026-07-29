import { describe, expect, it } from 'bun:test'
import {
  programmingChildBodyEntries,
  programmingEmbeddedBodyEntries,
} from '../programmingExecution'
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
      expect(programmingChildBodyEntries(statement)[0]?.execution, type).toBe('deferred-callback')
    }
  })

  it('distingue callback síncrono de corpo de função', () => {
    const each = {
      type: 'forEach',
      arrayExpr: { type: 'array', items: [] },
      itemName: 'item',
      body: [],
    } satisfies JSStatement
    const fn = {
      type: 'funcDecl',
      name: 'fazer',
      params: [],
      body: [],
    } satisfies JSStatement

    expect(programmingChildBodyEntries(each)[0]?.execution).toBe('sync-callback')
    expect(programmingChildBodyEntries(fn)[0]?.execution).toBe('function')
  })

  it('classifica callbacks oficiais pelo momento real de execução', () => {
    const cases: Array<{
      statement: JSStatement
      execution: 'sync-callback' | 'deferred-callback'
      timing: 'immediate' | 'deferred'
    }> = [
      {
        statement: {
          type: 'g2d:onSpriteGroupOverlap',
          spriteVar: 'heroi',
          groupVar: 'inimigos',
          itemName: 'inimigo',
          body: [],
        },
        execution: 'sync-callback',
        timing: 'immediate',
      },
      {
        statement: {
          type: 'g2d:onGroupOverlap',
          aGroup: 'tiros',
          aName: 'tiro',
          bGroup: 'inimigos',
          bName: 'inimigo',
          body: [],
        },
        execution: 'sync-callback',
        timing: 'immediate',
      },
      {
        statement: { type: 'gk:waitThen', seconds: 1, body: [] },
        execution: 'deferred-callback',
        timing: 'deferred',
      },
      {
        statement: {
          type: 'gk:defineLook',
          name: 'inimigo',
          baseW: { type: 'num', value: 32 },
          baseH: { type: 'num', value: 32 },
          ctxName: 'ctx',
          body: [],
        },
        execution: 'deferred-callback',
        timing: 'deferred',
      },
      {
        statement: {
          type: 'w3d:npcAsk',
          name: 'Lia',
          question: 'Vamos?',
          optA: 'Sim',
          bodyA: [],
          optB: 'Depois',
          bodyB: [],
        },
        execution: 'deferred-callback',
        timing: 'deferred',
      },
    ]

    for (const { statement, execution, timing } of cases) {
      const entries = programmingChildBodyEntries(statement)
      expect(entries.length, statement.type).toBeGreaterThan(0)
      for (const entry of entries) {
        expect(entry.execution, statement.type).toBe(execution)
        expect(entry.timing, statement.type).toBe(timing)
      }
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

    for (const type of ['onClickAssign', 'imageOnLoad', 'imageOnError'] as const) {
      const browserCallback = {
        type,
        target: { type: 'objectLiteral', entries: [] },
        body: [],
      } satisfies JSStatement
      expect(programmingChildBodyEntries(browserCallback)[0]?.localVariables, type).toEqual([
        'event',
      ])
    }

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

  it('enumera o executor de Promise escondido numa expressão', () => {
    const statement = {
      type: 'consoleLog',
      value: {
        type: 'newPromise',
        param: 'resolve',
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'pronto' } }],
      },
    } satisfies JSStatement

    expect(programmingEmbeddedBodyEntries(statement)).toEqual([
      {
        path: ['value', 'body'],
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'pronto' } }],
        execution: 'sync-callback',
      },
    ])
  })
})
