import { describe, expect, it } from 'bun:test'
import { lifecycleAreaForStatement } from '../lifecycle'
import { type JSExpr, type JSStatement, SZIRV2Schema } from '../schema'

/**
 * Monta o projeto mínimo com o statement na área pedida.
 *
 * ⚠️ "start" aqui significa "a área onde este bloco vive antes de o jogo rodar",
 * e desde a criação de 🧩 Meus moldes isso pode ser uma das duas: classe, figura
 * e tipo de inimigo têm área própria. Deixar a escolha com
 * `lifecycleAreaForStatement` mantém cada teste falando da SEMÂNTICA que ele
 * quer provar, em vez de repetir o mapa de áreas em dezenas de lugares.
 */
function parse(
  area: 'start' | 'events' | 'loops',
  statement: JSStatement,
  prerequisites: JSStatement[] = [],
) {
  const molds: JSStatement[] = []
  const start: JSStatement[] = []
  for (const prerequisite of prerequisites) {
    if (lifecycleAreaForStatement(prerequisite) === 'molds') molds.push(prerequisite)
    else start.push(prerequisite)
  }
  if (area === 'start') {
    if (lifecycleAreaForStatement(statement) === 'molds') molds.push(statement)
    else start.push(statement)
  }
  return SZIRV2Schema.safeParse({
    version: 2,
    html: [],
    css: [],
    behavior: {
      molds,
      start,
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

  it('aceita registros de evento diretamente em funções e classes', () => {
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

  it.each([
    'requestFullscreen',
    'toggleFullscreen',
  ] as const)('aceita %s somente enquanto o gesto ainda está ativo', (type) => {
    expect(parse('start', { type }).success).toBe(false)
    expect(
      parse('events', {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'click',
        body: [{ type }],
      }).success,
    ).toBe(true)
    expect(
      parse('events', {
        type: 'event',
        target: 'window',
        targetKind: 'window',
        event: 'resize',
        body: [{ type }],
      }).success,
    ).toBe(false)
    expect(
      parse('start', {
        type: 'funcDecl',
        name: 'alternarTela',
        params: [],
        body: [{ type }],
      }).success,
    ).toBe(false)
    expect(
      parse('events', {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'click',
        body: [
          {
            type: 'setTimeoutSeconds',
            delay: { type: 'num', value: 1 },
            body: [{ type }],
          },
        ],
      }).success,
    ).toBe(false)

    const directGestures: JSStatement[] = [
      { type: 'g2d:onPointer', xName: 'x', yName: 'y', body: [{ type }] },
      { type: 'g2d:onKey', key: 'Enter', body: [{ type }] },
      { type: 'gk:onGameClick', xName: 'x', yName: 'y', body: [{ type }] },
    ]
    for (const gesture of directGestures) {
      expect(parse('events', gesture).success, gesture.type).toBe(true)
    }

    for (const button of [
      { type: 'gk:addButton', screen: 'menu', label: 'Jogar', body: [{ type }] },
      { type: 'g3k:addButton', screen: 'menu', label: 'Jogar', body: [{ type }] },
    ] satisfies JSStatement[]) {
      expect(parse('start', button).success, button.type).toBe(true)
    }
  })

  it('encontra raízes de lifecycle em elseif e cases de switch', () => {
    const event: JSStatement = {
      type: 'event',
      target: 'document',
      targetKind: 'document',
      event: 'click',
      body: [],
    }

    expect(
      parse('start', {
        type: 'if',
        cond: { type: 'bool', value: false },
        then: [],
        elseif: [{ cond: { type: 'bool', value: true }, then: [event] }],
      }).success,
    ).toBe(false)
    expect(
      parse('start', {
        type: 'switch',
        subject: { type: 'num', value: 1 },
        cases: [{ match: { type: 'num', value: 1 }, body: [event] }],
        default: [],
      }).success,
    ).toBe(false)
  })

  it('não deixa o async externo atravessar o executor de uma Promise', () => {
    expect(
      parse('start', {
        type: 'funcDecl',
        name: 'carregar',
        params: [],
        async: true,
        body: [
          {
            type: 'consoleLog',
            value: {
              type: 'newPromise',
              param: 'resolve',
              body: [
                {
                  type: 'if',
                  cond: { type: 'bool', value: true },
                  then: [{ type: 'awaitStmt', value: { type: 'null' } }],
                },
              ],
            },
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('recusa eventos escondidos em comandos dentro de funções e classes', () => {
    const event: JSStatement = {
      type: 'event',
      target: 'botao',
      event: 'click',
      body: [],
    }

    expect(
      parse('start', {
        type: 'funcDecl',
        name: 'configurar',
        params: [],
        body: [{ type: 'repeat', times: { type: 'num', value: 2 }, body: [event] }],
      }).success,
    ).toBe(false)

    expect(
      parse('start', {
        type: 'classDecl',
        name: 'Jogo',
        ctorBody: [
          {
            type: 'if',
            cond: { type: 'bool', value: true },
            then: [event],
          },
        ],
        methods: [],
      }).success,
    ).toBe(false)
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

  it('recusa construtores Three.js dentro de qualquer laço', () => {
    const threeConstructor: JSStatement = {
      type: 'newInstance',
      varName: 'renderizador',
      namespace: 'THREE',
      className: 'WebGLRenderer',
      args: [],
    }

    expect(parse('start', threeConstructor).success).toBe(true)
    expect(
      parse('loops', {
        type: 'animationLoop',
        body: [threeConstructor],
      }).success,
    ).toBe(false)
    expect(
      parse('start', {
        type: 'repeat',
        times: { type: 'num', value: 2 },
        body: [threeConstructor],
      }).success,
    ).toBe(false)
  })

  it('aceita comandos contínuos em loops e funções, mas não em início, eventos ou construtores', () => {
    const continuous: JSStatement = {
      type: 'g3d:controlWithKeys',
      objVar: 'jogador',
      speed: { type: 'num', value: 0.05 },
    }
    const game3DPrerequisites: JSStatement[] = [
      { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
      {
        type: 'g3d:createBox',
        varName: 'jogador',
        worldVar: 'cena',
        size: 1,
        color: '#22d3ee',
      },
    ]

    expect(parse('start', continuous, game3DPrerequisites).success).toBe(false)
    expect(
      parse(
        'events',
        {
          type: 'event',
          target: 'botao',
          event: 'click',
          body: [continuous],
        },
        game3DPrerequisites,
      ).success,
    ).toBe(false)
    expect(
      parse(
        'events',
        {
          type: 'event',
          target: 'botao',
          event: 'click',
          body: [
            {
              type: 'repeat',
              times: { type: 'num', value: 2 },
              body: [continuous],
            },
          ],
        },
        game3DPrerequisites,
      ).success,
    ).toBe(true)
    expect(
      parse(
        'loops',
        { type: 'g3d:animate', worldVar: 'cena', body: [continuous] },
        game3DPrerequisites,
      ).success,
    ).toBe(true)
    expect(
      parse(
        'start',
        {
          type: 'repeat',
          times: { type: 'num', value: 2 },
          body: [continuous],
        },
        game3DPrerequisites,
      ).success,
    ).toBe(true)
    expect(
      parse(
        'start',
        {
          type: 'funcDecl',
          name: 'atualizar',
          params: [],
          body: [continuous],
        },
        game3DPrerequisites,
      ).success,
    ).toBe(true)
    expect(
      parse(
        'start',
        {
          type: 'classDecl',
          name: 'Jogo',
          ctorBody: [continuous],
          methods: [{ name: 'atualizar', params: [], body: [continuous] }],
        },
        game3DPrerequisites,
      ).success,
    ).toBe(false)
    expect(
      parse(
        'start',
        {
          type: 'classDecl',
          name: 'Jogo',
          ctorBody: [],
          methods: [{ name: 'atualizar', params: [], body: [continuous] }],
        },
        game3DPrerequisites,
      ).success,
    ).toBe(true)
    expect(
      parse(
        'start',
        {
          type: 'classDecl',
          name: 'Jogo',
          ctorBody: [
            {
              type: 'repeat',
              times: { type: 'num', value: 2 },
              body: [continuous],
            },
          ],
          methods: [],
        },
        game3DPrerequisites,
      ).success,
    ).toBe(true)
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

  it('não confunde callbacks de jogos com o objeto Event do navegador', () => {
    expect(
      parse('events', {
        type: 'g2d:onPointer',
        xName: 'x',
        yName: 'y',
        body: [{ type: 'consoleLog', value: { type: 'eventProp', prop: 'clientX' } }],
      }).success,
    ).toBe(false)
    expect(
      parse('events', {
        type: 'g2d:onKey',
        key: 'Enter',
        body: [{ type: 'consoleLog', value: { type: 'eventProp', prop: 'key' } }],
      }).success,
    ).toBe(false)
    expect(
      parse('events', {
        type: 'gk:onEvent',
        event: 'pontuou',
        body: [{ type: 'eventMethod', method: 'preventDefault' }],
      }).success,
    ).toBe(false)
  })

  it('mantém Event nos callbacks do navegador e encerra sua ativação em tarefas adiadas', () => {
    const eventMethod: JSStatement = { type: 'eventMethod', method: 'preventDefault' }
    const target: JSExpr = { type: 'objectLiteral', entries: [] }

    expect(parse('events', { type: 'onClickAssign', target, body: [eventMethod] }).success).toBe(
      true,
    )
    expect(parse('events', { type: 'imageOnLoad', target, body: [eventMethod] }).success).toBe(true)
    expect(parse('events', { type: 'imageOnError', target, body: [eventMethod] }).success).toBe(
      true,
    )
    expect(
      parse('events', {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'click',
        body: [{ type: 'setTimeout', delay: { type: 'num', value: 10 }, body: [eventMethod] }],
      }).success,
    ).toBe(false)
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
