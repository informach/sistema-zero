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
})
