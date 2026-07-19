import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { compileStatements, generateJS } from '#generators'
import { behaviorStatements, type JSStatement, num, str, variable } from '#ir'
import { parseJS } from '#parsers'
import { socketInputsFor } from '../blocks/valueSockets'
import { migrateIfElseBlocks } from '../migrateIfElse'
import { ensureBlocklyInitialized } from '../setup'
import { irInFrame } from './frameTestUtils'

interface IfApi extends Blockly.Block {
  addElseIf_(): void
  addElse_(): void
  removeLast_(): void
}

type IfStmt = Extract<JSStatement, { type: 'if' }>

/** IR do (único) "Se" no workspace, embrulhado no frame de Comportamento. */
function ifOf(ws: Blockly.Workspace): IfStmt {
  const stmt = behaviorStatements(irInFrame(ws)).find((s) => s.type === 'if')
  if (stmt?.type !== 'if') throw new Error('sem if')
  return stmt
}

describe('mutator do "Se / senão" (estilo MakeCode: +/− senão-se e senão)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('o "Se" nasce só com "então" (sem senão-se, sem senão)', () => {
    const ws = new Blockly.Workspace()
    ws.newBlock('sz_js_if_else')
    const ir = ifOf(ws)
    expect(ir.elseif).toBeUndefined()
    expect(ir.else).toBeUndefined()
  })

  it('addElseIf_ adiciona um ramo "senão se" JÁ semeado com a comparação x > 0', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_js_if_else') as IfApi
    b.addElseIf_()
    const ir = ifOf(ws)
    expect(ir.elseif).toHaveLength(1)
    expect(ir.elseif?.[0]?.then).toEqual([])
    expect(ir.elseif?.[0]?.cond).toMatchObject({ type: 'binop', op: '>' })
  })

  it('addElse_ liga o "senão" final', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_js_if_else') as IfApi
    b.addElse_()
    expect(ifOf(ws).else).toEqual([])
  })

  it('removeLast_ tira o "senão" primeiro, depois os "senão se"', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_js_if_else') as IfApi
    b.addElseIf_()
    b.addElse_()
    expect(ifOf(ws).elseif).toHaveLength(1)
    expect(ifOf(ws).else).toEqual([])

    b.removeLast_() // tira o senão
    expect(ifOf(ws).else).toBeUndefined()
    expect(ifOf(ws).elseif).toHaveLength(1)

    b.removeLast_() // tira o senão-se
    expect(ifOf(ws).elseif).toBeUndefined()
  })

  it('preserva o corpo de um "senão se" ao adicionar OUTRO ramo', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_js_if_else') as IfApi
    b.addElseIf_()
    // Encaixa um "sair do laço" (break) no corpo do 1º senão-se.
    const brk = ws.newBlock('sz_js_break')
    const conn = b.getInput('ELSEIF_THEN0')?.connection
    if (conn && brk.previousConnection) conn.connect(brk.previousConnection)
    expect(ifOf(ws).elseif?.[0]?.then).toHaveLength(1)

    // Mudar a forma (novo ramo) NÃO pode derrubar o corpo do ramo anterior.
    b.addElseIf_()
    const ir = ifOf(ws)
    expect(ir.elseif).toHaveLength(2)
    expect(ir.elseif?.[0]?.then).toHaveLength(1)
  })

  it('a forma (senão-se + senão) sobrevive a salvar/carregar a serialização', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_js_if_else') as IfApi
    b.addElseIf_()
    b.addElseIf_()
    b.addElse_()

    const state = Blockly.serialization.workspaces.save(ws)
    const ws2 = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state, ws2)

    const ir = ifOf(ws2)
    expect(ir.elseif).toHaveLength(2)
    expect(ir.else).toEqual([])
  })
})

describe('"Se / senão" — gerador e Ponte da cadeia else-if', () => {
  it('gera a cadeia if / else if / else', () => {
    const code = generateJS({
      statements: [
        {
          type: 'if',
          cond: { type: 'binop', op: '>', left: variable('x'), right: num(0) },
          then: [{ type: 'consoleLog', value: str('a') }],
          elseif: [
            {
              cond: { type: 'binop', op: '>', left: variable('x'), right: num(5) },
              then: [{ type: 'consoleLog', value: str('b') }],
            },
          ],
          else: [{ type: 'consoleLog', value: str('c') }],
        },
      ],
    })
    expect(code).toMatch(/if \(x > 0\) \{/)
    expect(code).toMatch(/\} else if \(x > 5\) \{/)
    expect(code).toContain('} else {')
  })

  it('a Ponte (código → IR) achata o else-if em ramos, ida e volta estável', () => {
    const src = 'if (x > 0) {\n  y = 1;\n} else if (x > 5) {\n  y = 2;\n} else {\n  y = 3;\n}'
    const ir = parseJS(src)
    const first = ir[0] as IfStmt
    expect(first.type).toBe('if')
    expect(first.elseif).toHaveLength(1)
    expect(first.elseif?.[0]?.cond).toMatchObject({ type: 'binop', op: '>' })
    expect(first.else).toBeDefined()
    // Round-trip: recompilar e re-parsear devolve o MESMO IR.
    expect(parseJS(compileStatements(ir, 0))).toEqual(ir)
  })
})

describe('semente da condição (Se/enquanto/…) é bloco REAL com operandos substituíveis', () => {
  // Um bloco de valor não pode ser encaixado dentro de um input de SOMBRA; por isso
  // a comparação da condição vem como bloco REAL (`block`), com operandos SOMBRA que
  // a criança pode trocar um a um (variável na esquerda, outro valor na direita).
  for (const type of ['sz_js_if_else', 'sz_js_while', 'sz_js_do_while', 'sz_val_ternary']) {
    it(`${type}: COND é uma comparação em bloco (não sombra), operandos em sombra`, () => {
      const cond = socketInputsFor(type)?.COND as
        | { block?: { type: string; inputs: { LEFT: unknown; RIGHT: unknown } } }
        | undefined
      expect(cond?.block?.type).toBe('sz_val_compare')
      expect(cond?.block?.inputs.LEFT).toHaveProperty('shadow')
      expect(cond?.block?.inputs.RIGHT).toHaveProperty('shadow')
    })
  }
})

describe('migração do "Se" legado (input ELSE fixo → mutator)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  function legacyIfWithElse() {
    return {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_js_if_else',
            inputs: {
              COND: { block: { type: 'sz_val_bool', fields: { VALUE: 'true' } } },
              THEN: { block: { type: 'sz_js_break' } },
              ELSE: { block: { type: 'sz_js_break' } },
            },
          },
        ],
      },
    }
  }

  it('marca extraState.hasElse num "Se" legado com ELSE preenchido', () => {
    const migrated = migrateIfElseBlocks(legacyIfWithElse()) as {
      blocks: { blocks: Array<Record<string, unknown>> }
    }
    expect(migrated.blocks.blocks[0]?.extraState).toEqual({ hasElse: true })
  })

  it('preserva o corpo do "senão" legado ao carregar (não perde código)', () => {
    const migrated = migrateIfElseBlocks(legacyIfWithElse()) as Record<string, unknown>
    const ws = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(migrated, ws)
    expect(ifOf(ws).else).toHaveLength(1)
  })

  it('não toca num "Se" que já tem extraState (idempotente)', () => {
    const state = legacyIfWithElse()
    ;(state.blocks.blocks[0] as Record<string, unknown>).extraState = { hasElse: true }
    // Sem nada a migrar → devolve a MESMA referência.
    expect(migrateIfElseBlocks(state)).toBe(state)
  })
})
