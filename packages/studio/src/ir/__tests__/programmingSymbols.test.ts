import { describe, expect, it } from 'bun:test'
import { SZIRSchema, SZIRV2Schema } from '../schema'

const legacyProject = (js: unknown[], gameTwoD = false) => ({
  html: [],
  css: [],
  js,
  extensions: gameTwoD ? [{ extensionId: 'game-2d' }] : [],
})

describe('símbolos léxicos da Programação', () => {
  it('aceita os locais do núcleo mesmo quando Jogo 2D está instalado', () => {
    const cases = [
      {
        type: 'funcDecl',
        name: 'dobrar',
        params: ['n'],
        body: [{ type: 'return', value: { type: 'var', name: 'n' } }],
      },
      {
        type: 'forRange',
        varName: 'i',
        from: { type: 'num', value: 0 },
        to: { type: 'num', value: 2 },
        step: { type: 'num', value: 1 },
        body: [{ type: 'consoleLog', value: { type: 'var', name: 'i' } }],
      },
      {
        type: 'tryCatch',
        body: [],
        errorName: 'erro',
        handler: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
      },
      {
        type: 'fetchJson',
        url: { type: 'str', value: '/dados' },
        okName: 'dados',
        body: [{ type: 'consoleLog', value: { type: 'var', name: 'dados' } }],
        catchName: 'erro',
        catchBody: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
      },
    ]

    for (const statement of cases) {
      expect(SZIRSchema.safeParse(legacyProject([statement], true)).success, statement.type).toBe(
        true,
      )
    }
  })

  it('recusa leitura e atribuição de variável que ainda não foi declarada', () => {
    const project = {
      version: 2 as const,
      html: [],
      css: [],
      behavior: {
        start: [
          { type: 'consoleLog', value: { type: 'var', name: 'futuro' } },
          { type: 'assign', name: 'futuro', value: { type: 'num', value: 1 } },
          { type: 'var', name: 'futuro', value: { type: 'num', value: 0 } },
        ],
        events: [],
        loops: [],
      },
      extensions: [],
    }

    const parsed = SZIRV2Schema.safeParse(project)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('futuro'))).toBe(true)
    }
  })

  it('mantém variáveis declaradas disponíveis depois da declaração e em ramos internos', () => {
    const parsed = SZIRV2Schema.safeParse({
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
          {
            type: 'if',
            cond: { type: 'bool', value: true },
            then: [{ type: 'assign', name: 'pontos', value: { type: 'num', value: 1 } }],
          },
        ],
        events: [],
        loops: [],
      },
      extensions: [],
    })

    expect(parsed.success).toBe(true)
  })

  it('reconhece id, tempo e delta declarados pelo próprio loop de animação', () => {
    const parsed = SZIRV2Schema.safeParse({
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [],
        events: [],
        loops: [
          {
            type: 'animationLoop',
            handle: 'ciclo',
            timeVar: 'tempo',
            deltaVar: 'delta',
            body: [
              { type: 'consoleLog', value: { type: 'var', name: 'tempo' } },
              { type: 'consoleLog', value: { type: 'var', name: 'delta' } },
              { type: 'cancelAnimationFrame', handle: { type: 'var', name: 'ciclo' } },
            ],
          },
        ],
      },
      extensions: [],
    })

    expect(parsed.success).toBe(true)
  })

  it('valida o nome de listas como uma referência léxica, inclusive em expressões', () => {
    const missing = SZIRSchema.safeParse(
      legacyProject([
        { type: 'arrayPush', arrayVar: 'itens', value: { type: 'num', value: 1 } },
        { type: 'consoleLog', value: { type: 'arrayLength', arrayVar: 'itens' } },
      ]),
    )
    expect(missing.success).toBe(false)
    if (!missing.success) {
      expect(missing.error.issues.filter((issue) => issue.message.includes('itens'))).toHaveLength(
        2,
      )
    }

    expect(
      SZIRSchema.safeParse(
        legacyProject([
          { type: 'var', name: 'itens', value: { type: 'array', items: [] } },
          { type: 'arrayPush', arrayVar: 'itens', value: { type: 'num', value: 1 } },
          { type: 'consoleLog', value: { type: 'arrayLength', arrayVar: 'itens' } },
        ]),
      ).success,
    ).toBe(true)
  })

  it('exige que classes existam antes de extends/new e libera namespaces oficiais', () => {
    const beforeDeclaration = SZIRSchema.safeParse(
      legacyProject([
        { type: 'newInstance', varName: 'heroi', className: 'Heroi', args: [] },
        { type: 'classDecl', name: 'Heroi', ctorBody: [], methods: [] },
      ]),
    )
    expect(beforeDeclaration.success).toBe(false)

    expect(
      SZIRSchema.safeParse(
        legacyProject([
          { type: 'classDecl', name: 'Base', ctorBody: [], methods: [] },
          { type: 'classDecl', name: 'Heroi', superClass: 'Base', ctorBody: [], methods: [] },
          { type: 'newInstance', varName: 'heroi', className: 'Heroi', args: [] },
          {
            type: 'var',
            name: 'cena',
            value: { type: 'newExpr', namespace: 'THREE', className: 'Scene', args: [] },
          },
        ]),
      ).success,
    ).toBe(true)
  })

  it('faz hoisting de funções apenas no escopo onde foram declaradas', () => {
    const valid = SZIRSchema.safeParse(
      legacyProject([
        { type: 'callFunction', name: 'iniciar', args: [] },
        { type: 'funcDecl', name: 'iniciar', params: [], body: [] },
        {
          type: 'var',
          name: 'promessa',
          value: {
            type: 'newPromise',
            param: 'concluir',
            body: [{ type: 'callFunction', name: 'concluir', args: [] }],
          },
        },
      ]),
    )
    expect(valid.success).toBe(true)

    const leaked = SZIRSchema.safeParse(
      legacyProject([
        {
          type: 'if',
          cond: { type: 'bool', value: true },
          then: [{ type: 'funcDecl', name: 'local', params: [], body: [] }],
        },
        { type: 'requestFrame', fn: 'local' },
      ]),
    )
    expect(leaked.success).toBe(false)
  })

  it('recusa referências em campos-string que não possuem declaração', () => {
    const cases = [
      {
        type: 'setProperty',
        targetId: 'elemento',
        targetKind: 'var',
        property: 'textContent',
        value: { type: 'str', value: 'oi' },
      },
      { type: 'appendChild', parentVar: 'pai', childVar: 'filho' },
      { type: 'objectAssign', targetVar: 'destino', sourceVar: 'origem' },
      {
        type: 'consoleLog',
        value: { type: 'canvasDim', ctxVar: 'pincel', dim: 'width' },
      },
      {
        type: 'consoleLog',
        value: { type: 'datasetGet', objectVar: 'elemento', key: 'fase' },
      },
    ]

    for (const statement of cases) {
      const parsed = SZIRSchema.safeParse(legacyProject([statement]))
      expect(parsed.success, statement.type).toBe(false)
    }
  })

  it('aceita os mesmos campos-string depois que as variáveis foram declaradas', () => {
    const parsed = SZIRSchema.safeParse(
      legacyProject([
        { type: 'var', name: 'pai', value: { type: 'objectLiteral', entries: [] } },
        { type: 'var', name: 'filho', value: { type: 'objectLiteral', entries: [] } },
        { type: 'var', name: 'destino', value: { type: 'objectLiteral', entries: [] } },
        { type: 'var', name: 'origem', value: { type: 'objectLiteral', entries: [] } },
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'pincel' },
        { type: 'appendChild', parentVar: 'pai', childVar: 'filho' },
        { type: 'objectAssign', targetVar: 'destino', sourceVar: 'origem' },
        {
          type: 'consoleLog',
          value: { type: 'canvasDim', ctxVar: 'pincel', dim: 'width' },
        },
        {
          type: 'consoleLog',
          value: { type: 'datasetGet', objectVar: 'filho', key: 'fase' },
        },
      ]),
    )

    expect(parsed.success).toBe(true)
  })

  it('exige que o pincel seja preparado antes de qualquer operação Canvas', () => {
    const parsed = SZIRSchema.safeParse(
      legacyProject([
        {
          type: 'canvasFillRect',
          ctxVar: 'pincel',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 10 },
          h: { type: 'num', value: 10 },
        },
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'pincel' },
      ]),
    )

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('pincel “pincel”'))).toBe(
        true,
      )
    }
  })

  it('não confunde uma variável comum com um pincel Canvas preparado', () => {
    const parsed = SZIRSchema.safeParse(
      legacyProject([
        { type: 'var', name: 'pincel', value: { type: 'null' } },
        {
          type: 'canvasFillRect',
          ctxVar: 'pincel',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 10 },
          h: { type: 'num', value: 10 },
        },
      ]),
    )

    expect(parsed.success).toBe(false)
  })

  it('recusa declarações JavaScript repetidas no mesmo escopo', () => {
    const parsed = SZIRSchema.safeParse(
      legacyProject([
        { type: 'var', name: 'pincel', value: { type: 'null' } },
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'pincel' },
      ]),
    )

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('já foi declarado'))).toBe(
        true,
      )
    }
  })

  it('permite reutilizar um nome em um escopo filho', () => {
    const parsed = SZIRSchema.safeParse(
      legacyProject([
        { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
        {
          type: 'if',
          cond: { type: 'bool', value: true },
          then: [{ type: 'var', name: 'pontos', value: { type: 'num', value: 2 } }],
        },
      ]),
    )

    expect(parsed.success).toBe(true)
  })

  it('não entrega variáveis futuras ao corpo de uma função', () => {
    const parsed = SZIRSchema.safeParse(
      legacyProject([
        {
          type: 'funcDecl',
          name: 'mostrar',
          params: [],
          body: [{ type: 'consoleLog', value: { type: 'var', name: 'pontos' } }],
        },
        { type: 'callFunction', name: 'mostrar', args: [] },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
      ]),
    )

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('pontos'))).toBe(true)
    }
  })

  it('permite que uma função capture uma variável já declarada', () => {
    expect(
      SZIRSchema.safeParse(
        legacyProject([
          { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
          {
            type: 'funcDecl',
            name: 'mostrar',
            params: [],
            body: [{ type: 'consoleLog', value: { type: 'var', name: 'pontos' } }],
          },
          { type: 'callFunction', name: 'mostrar', args: [] },
        ]),
      ).success,
    ).toBe(true)
  })

  it('permite declarar a closure antes da variável quando a chamada acontece depois', () => {
    expect(
      SZIRSchema.safeParse(
        legacyProject([
          {
            type: 'funcDecl',
            name: 'mostrar',
            params: [],
            body: [{ type: 'consoleLog', value: { type: 'var', name: 'pontos' } }],
          },
          { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
          { type: 'callFunction', name: 'mostrar', args: [] },
        ]),
      ).success,
    ).toBe(true)
  })

  it('resolve variáveis futuras em callbacks que só executam depois do trecho atual', () => {
    expect(
      SZIRSchema.safeParse(
        legacyProject([
          {
            type: 'setTimeout',
            delay: { type: 'num', value: 1000 },
            body: [{ type: 'consoleLog', value: { type: 'var', name: 'pontos' } }],
          },
          { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
        ]),
      ).success,
    ).toBe(true)
  })

  it('valida o corpo de métodos e construtores no ponto em que a instância é usada', () => {
    const classDecl = {
      type: 'classDecl',
      name: 'Painel',
      ctorBody: [{ type: 'consoleLog', value: { type: 'var', name: 'pontos' } }],
      methods: [
        {
          name: 'mostrar',
          params: [],
          body: [{ type: 'consoleLog', value: { type: 'var', name: 'pontos' } }],
        },
      ],
    }

    const constructorTooEarly = SZIRSchema.safeParse(
      legacyProject([
        classDecl,
        { type: 'newInstance', varName: 'painel', className: 'Painel', args: [] },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
      ]),
    )
    expect(constructorTooEarly.success).toBe(false)

    const methodTooEarly = SZIRSchema.safeParse(
      legacyProject([
        { ...classDecl, ctorBody: [] },
        { type: 'newInstance', varName: 'painel', className: 'Painel', args: [] },
        { type: 'callMethod', objectVar: 'painel', method: 'mostrar', args: [] },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
      ]),
    )
    expect(methodTooEarly.success).toBe(false)

    expect(
      SZIRSchema.safeParse(
        legacyProject([
          { ...classDecl, ctorBody: [] },
          { type: 'newInstance', varName: 'painel', className: 'Painel', args: [] },
          { type: 'var', name: 'pontos', value: { type: 'num', value: 1 } },
          { type: 'callMethod', objectVar: 'painel', method: 'mostrar', args: [] },
        ]),
      ).success,
    ).toBe(true)
  })

  it('exige que o namespace de um construtor exista', () => {
    const missing = SZIRSchema.safeParse(
      legacyProject([
        {
          type: 'var',
          name: 'heroi',
          value: { type: 'newExpr', namespace: 'Inexistente', className: 'Heroi', args: [] },
        },
      ]),
    )
    expect(missing.success).toBe(false)
    if (!missing.success) {
      expect(missing.error.issues.some((issue) => issue.message.includes('Inexistente'))).toBe(true)
    }

    expect(
      SZIRSchema.safeParse(
        legacyProject([
          { type: 'importStar', name: 'Biblioteca', module: './biblioteca.js' },
          {
            type: 'newInstance',
            varName: 'heroi',
            namespace: 'Biblioteca',
            className: 'Heroi',
            args: [],
          },
        ]),
      ).success,
    ).toBe(true)
  })
})
