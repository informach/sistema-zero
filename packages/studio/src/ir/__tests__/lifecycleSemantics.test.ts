import { describe, expect, it } from 'bun:test'
import { type JSStatement, SZIRV2Schema } from '../schema'

function parse(
  area: 'start' | 'events' | 'loops',
  statement: JSStatement,
  prerequisites: JSStatement[] = [],
) {
  return SZIRV2Schema.safeParse({
    version: 2,
    html: [],
    css: [],
    behavior: {
      start: area === 'start' ? [...prerequisites, statement] : prerequisites,
      events: area === 'events' ? [statement] : [],
      loops: area === 'loops' ? [statement] : [],
    },
    extensions: [],
  })
}

describe('gramática recursiva do ciclo de vida', () => {
  it('aceita o evento nomeado na área de Eventos', () => {
    expect(
      parse(
        'events',
        {
          type: 'eventHandler',
          target: 'botao',
          event: 'click',
          handlerName: 'responder',
        },
        [{ type: 'funcDecl', name: 'responder', params: [], body: [] }],
      ).success,
    ).toBe(true)
  })

  it('trata conversa de NPC como evento e pergunta como comando do corpo', () => {
    const conversation: JSStatement = {
      type: 'w3d:npcTalk',
      name: 'Lia',
      body: [
        {
          type: 'w3d:npcAsk',
          name: 'Lia',
          question: 'Vamos explorar?',
          optA: 'Sim',
          bodyA: [{ type: 'w3d:npcSay', name: 'Lia', text: 'Vamos!' }],
          optB: 'Depois',
          bodyB: [],
        },
      ],
    }

    expect(parse('events', conversation).success).toBe(true)
    expect(parse('start', conversation).success).toBe(false)
    expect(
      parse('start', {
        type: 'w3d:npcAsk',
        name: 'Lia',
        question: 'Fora da conversa?',
        optA: 'A',
        bodyA: [],
        optB: 'B',
        bodyB: [],
      }).success,
    ).toBe(false)
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
      parse(
        'start',
        {
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
        },
        [{ type: 'classDecl', name: 'Base', ctorBody: [], methods: [] }],
      ).success,
    ).toBe(true)
  })

  it('não confunde loops do motor com laços sintáticos para break e continue', () => {
    for (const statement of [{ type: 'break' }, { type: 'continue' }] as JSStatement[]) {
      expect(
        parse('loops', {
          type: 'animationLoop',
          body: [statement],
        }).success,
        statement.type,
      ).toBe(false)

      expect(
        parse('loops', {
          type: 'animationLoop',
          body: [
            {
              type: 'repeat',
              times: { type: 'num', value: 2 },
              body: [statement],
            },
          ],
        }).success,
        statement.type,
      ).toBe(true)
    }
  })

  it('valida capacidades específicas de teclado e ponteiro em eventos', () => {
    const eventWithValue = (event: 'click' | 'keydown', prop: 'key' | 'clientX'): JSStatement => ({
      type: 'event',
      target: 'window',
      targetKind: 'window',
      event,
      body: [{ type: 'consoleLog', value: { type: 'eventProp', prop } }],
    })

    expect(parse('events', eventWithValue('keydown', 'key')).success).toBe(true)
    expect(parse('events', eventWithValue('click', 'clientX')).success).toBe(true)
    expect(parse('events', eventWithValue('click', 'key')).success).toBe(false)
    expect(parse('events', eventWithValue('keydown', 'clientX')).success).toBe(false)
  })

  it('recusa alvos this fora de funções e os aceita em funções', () => {
    const classOp: JSStatement = {
      type: 'classOp',
      targetId: 'elemento',
      targetKind: 'this',
      op: 'add',
      className: 'ativo',
    }
    const contains: JSStatement = {
      type: 'consoleLog',
      value: {
        type: 'classContains',
        targetId: 'elemento',
        targetKind: 'this',
        className: 'ativo',
      },
    }

    expect(parse('start', classOp).success).toBe(false)
    expect(parse('start', contains).success).toBe(false)
    expect(
      parse('start', {
        type: 'funcDecl',
        name: 'atualizar',
        params: [],
        body: [classOp, contains],
      }).success,
    ).toBe(true)
  })

  it('exige super único e primeiro em construtor derivado explícito', () => {
    const base: JSStatement = { type: 'classDecl', name: 'Base', ctorBody: [], methods: [] }
    const derived = (ctorBody: JSStatement[]): JSStatement => ({
      type: 'classDecl',
      name: 'Filha',
      superClass: 'Base',
      ctorId: 'ctor-explicito',
      ctorBody,
      methods: [],
    })

    expect(parse('start', derived([]), [base]).success).toBe(false)
    expect(
      parse(
        'start',
        derived([
          { type: 'setThisProp', name: 'x', value: { type: 'num', value: 1 } },
          { type: 'superCall', args: [] },
        ]),
        [base],
      ).success,
    ).toBe(false)
    expect(
      parse(
        'start',
        derived([
          { type: 'superCall', args: [] },
          { type: 'superCall', args: [] },
        ]),
        [base],
      ).success,
    ).toBe(false)
    expect(parse('start', derived([{ type: 'superCall', args: [] }]), [base]).success).toBe(true)
  })
})
