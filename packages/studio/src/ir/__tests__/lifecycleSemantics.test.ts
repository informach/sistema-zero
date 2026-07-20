import { describe, expect, it } from 'bun:test'
import { type JSStatement, SZIRV2Schema } from '../schema'

function parse(area: 'start' | 'events' | 'loops', statement: JSStatement) {
  return SZIRV2Schema.safeParse({
    version: 2,
    html: [],
    css: [],
    behavior: {
      start: area === 'start' ? [statement] : [],
      events: area === 'events' ? [statement] : [],
      loops: area === 'loops' ? [statement] : [],
    },
    extensions: [],
  })
}

describe('gramática recursiva do ciclo de vida', () => {
  it('aceita o evento nomeado na área de Eventos', () => {
    expect(
      parse('events', {
        type: 'eventHandler',
        target: 'botao',
        event: 'click',
        handlerName: 'responder',
      }).success,
    ).toBe(true)
  })

  it('recusa eventos fora de função e loops de motor aninhados', () => {
    expect(
      parse('start', {
        type: 'if',
        cond: { type: 'bool', value: true },
        then: [{ type: 'event', target: 'botao', event: 'click', body: [] }],
      }).success,
    ).toBe(false)

    expect(
      parse('events', {
        type: 'event',
        target: 'botao',
        event: 'click',
        body: [{ type: 'animationLoop', body: [] }],
      }).success,
    ).toBe(false)

    expect(
      parse('loops', {
        type: 'animationLoop',
        body: [{ type: 'event', target: 'botao', event: 'click', body: [] }],
      }).success,
    ).toBe(false)
  })

  it('aceita registros de evento encapsulados em funções e classes', () => {
    expect(
      parse('start', {
        type: 'funcDecl',
        name: 'configurar',
        params: [],
        body: [{ type: 'event', target: 'botao', event: 'click', body: [] }],
      }).success,
    ).toBe(true)

    expect(
      parse('start', {
        type: 'classDecl',
        name: 'Jogo',
        ctorBody: [{ type: 'event', target: 'window', event: 'keydown', body: [] }],
        methods: [],
      }).success,
    ).toBe(true)
  })

  it('recusa controle de fluxo fora do contexto sintático válido', () => {
    const invalidStatements: JSStatement[] = [
      { type: 'break' },
      { type: 'continue' },
      { type: 'return' },
      { type: 'awaitStmt', value: { type: 'num', value: 1 } },
      { type: 'superCall', args: [] },
      { type: 'superMethodCall', method: 'andar', args: [] },
    ]
    for (const statement of invalidStatements) {
      expect(parse('start', statement).success, statement.type).toBe(false)
    }
  })

  it('aceita controle de fluxo nos contextos sintáticos válidos', () => {
    expect(
      parse('start', {
        type: 'repeat',
        times: { type: 'num', value: 2 },
        body: [{ type: 'break' }, { type: 'continue' }],
      }).success,
    ).toBe(true)

    expect(
      parse('start', {
        type: 'funcDecl',
        name: 'calcular',
        params: [],
        body: [{ type: 'return', value: { type: 'num', value: 1 } }],
      }).success,
    ).toBe(true)

    expect(
      parse('start', {
        type: 'classDecl',
        name: 'Filha',
        superClass: 'Base',
        ctorBody: [{ type: 'superCall', args: [] }],
        methods: [
          {
            name: 'carregar',
            params: [],
            async: true,
            body: [
              { type: 'awaitStmt', value: { type: 'num', value: 1 } },
              { type: 'superMethodCall', method: 'carregar', args: [] },
            ],
          },
        ],
      }).success,
    ).toBe(true)
  })
})
