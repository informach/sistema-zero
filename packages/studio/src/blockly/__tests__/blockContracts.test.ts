import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { SZIRV2Schema } from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import {
  getBlockContract,
  inferBlockContract,
  materializeBlockDefinition,
  NESTED_STATEMENT_CHECKS,
  registerBlockContracts,
} from '../blockContracts'
import { CORE_BLOCKS, registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'

function definition(type: string) {
  const all = [...CORE_BLOCKS, ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks)]
  const found = all.find((block) => block.type === type)
  if (!found) throw new Error(`Bloco ausente no teste: ${type}`)
  return found
}

describe('contrato central de posicionamento', () => {
  it('classifica todos os blocos core e das extensões oficiais', () => {
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    expect(() => registerBlockContracts(all)).not.toThrow()
    for (const block of all) {
      expect(getBlockContract(block.type), block.type).toBeDefined()
    }
  })

  it('separa fisicamente início, eventos e loops', () => {
    expect(
      materializeBlockDefinition(definition('sz_js_console_log_text')).previousStatement,
    ).toEqual(['JSStartRoot', ...NESTED_STATEMENT_CHECKS])
    expect(materializeBlockDefinition(definition('sz_js_on_click')).previousStatement).toEqual([
      'JSEventRoot',
    ])
    expect(materializeBlockDefinition(definition('sz_canvas_anim_loop')).previousStatement).toEqual(
      ['JSLoopRoot'],
    )
  })

  it('tipa toda boca de comandos e não deixa JSStmt genérico no catálogo materializado', () => {
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    for (const definition of all) {
      const contract = inferBlockContract(definition)
      if (contract.domain !== 'behavior') continue
      const materialized = materializeBlockDefinition(definition)
      expect(materialized.placement, `${definition.type}: placement`).toEqual(contract.placement)
      for (const args of [materialized.args0, materialized.args1, materialized.args2]) {
        for (const arg of args ?? []) {
          if (typeof arg !== 'object' || arg === null) continue
          const input = arg as { type?: unknown; check?: unknown }
          if (input.type !== 'input_statement') continue
          expect(input.check, `${definition.type}: input_statement`).toBeDefined()
          expect(input.check, `${definition.type}: input_statement`).not.toBe('JSStmt')
        }
      }
    }
  })

  it('prova definição → Blockly → IR → área para toda raiz oficial visível', () => {
    ensureBlocklyInitialized()
    for (const extension of OFFICIAL_CATALOG) {
      registerExtensionBlocks(extension.blockly.blocks)
    }
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    const frameFor = {
      start: 'sz_frame_start',
      events: 'sz_frame_events',
      loops: 'sz_frame_loops',
    } as const

    for (const definition of all) {
      const contract = inferBlockContract(definition)
      const area = contract.placement?.root[0]
      if (
        contract.domain !== 'behavior' ||
        !area ||
        definition.hidden ||
        !['keep', 'lift-periodic-loop'].includes(contract.migration)
      ) {
        continue
      }
      const workspace = new Blockly.Workspace()
      try {
        const frame = workspace.newBlock(frameFor[area])
        const block = workspace.newBlock(definition.type)
        const input = frame.getInput('CHILDREN')?.connection
        if (!input || !block.previousConnection)
          throw new Error(`Conexão ausente: ${definition.type}`)
        expect(input.connect(block.previousConnection), definition.type).toBe(true)
        const ir = buildIRFromWorkspace(workspace)
        expect(ir.behavior[area].length, definition.type).toBeGreaterThan(0)
        const parsed = SZIRV2Schema.safeParse(ir)
        const lifecycleIssues = parsed.success
          ? []
          : parsed.error.issues.filter(
              (issue) =>
                issue.path.length === 3 &&
                issue.path[0] === 'behavior' &&
                issue.message.includes('não pode ficar na área'),
            )
        expect(lifecycleIssues, definition.type).toEqual([])
      } finally {
        workspace.dispose()
      }
    }
  })

  it('repara um bloco que foi registrado externamente sem o contrato físico', () => {
    const raw = {
      type: 'sz_test_external_registration',
      message0: 'teste',
      previousStatement: 'JSStmt',
      nextStatement: 'JSStmt',
      colour: 20,
    }
    Blockly.defineBlocksWithJsonArray([raw])

    try {
      registerExtensionBlocks([raw])
      const workspace = new Blockly.Workspace()
      try {
        const block = workspace.newBlock(raw.type)
        expect(block.previousConnection?.getCheck()).toEqual([
          'JSStartRoot',
          ...NESTED_STATEMENT_CHECKS,
        ])
      } finally {
        workspace.dispose()
      }
    } finally {
      delete Blockly.Blocks[raw.type]
    }
  })

  it('não chama varreduras contínuas de evento', () => {
    for (const type of [
      'sz_g2d_on_enemy_shot_hit',
      'sz_g2d_on_group_overlap',
      'sz_g2d_on_sprite_group_overlap',
    ]) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.role, type).toBe('loop')
      expect(contract.placement?.root, type).toEqual([])
      expect(contract.placement?.nested, type).toEqual(['loop-body'])
    }
  })

  it('mantém métodos do evento fora das raízes', () => {
    const contract = inferBlockContract(definition('sz_js_event_method'))
    expect(contract.placement?.root).toEqual([])
    expect(contract.placement?.nested).toEqual(['event-body'])
  })

  it('aceita inscrições de evento encapsuladas em funções e classes', () => {
    const project = (ctorBody: unknown[]) => ({
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'classDecl',
            name: 'Jogo',
            ctorParams: [],
            ctorBody,
            methods: [],
          },
        ],
        events: [],
        loops: [],
      },
      extensions: [],
    })
    const event = { type: 'event', target: 'window', event: 'keydown', body: [] }

    expect(SZIRV2Schema.safeParse(project([event])).success).toBe(true)
    expect(
      SZIRV2Schema.safeParse(
        project([{ type: 'repeat', times: { type: 'num', value: 2 }, body: [event] }]),
      ).success,
    ).toBe(true)
  })

  it('não confunde comandos que contêm “on” com eventos', () => {
    for (const type of ['sz_gk_keep_on_screen', 'sz_gk_bounce_on_edges', 'sz_gk_lean_on_move']) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.role, type).toBe('command')
      expect(contract.placement?.root, type).toEqual(['start'])
    }
    expect(inferBlockContract(definition('sz_gk_rpg_on_step')).placement?.role).toBe('event')
  })

  it('marca wrappers e boots antigos para migração, não para projetos novos', () => {
    expect(inferBlockContract(definition('sz_g2d_on_start')).migration).toBe('unwrap-start')
    expect(inferBlockContract(definition('sz_js_on_load')).migration).toBe('unwrap-load')
    expect(inferBlockContract(definition('sz_gk_start')).migration).toBe('remove-engine-boot')
  })

  it('mantém todo bloco de migração registrado, mas fora das paletas novas', () => {
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    for (const block of all) {
      const contract = inferBlockContract(block)
      if (contract.migration === 'keep' || contract.migration === 'lift-periodic-loop') continue
      expect(block.hidden, block.type).toBe(true)
    }

    const toolboxTypes = (value: unknown): string[] => {
      if (Array.isArray(value)) return value.flatMap(toolboxTypes)
      if (typeof value !== 'object' || value === null) return []
      const record = value as { type?: unknown; contents?: unknown }
      return [
        ...(typeof record.type === 'string' ? [record.type] : []),
        ...toolboxTypes(record.contents),
      ]
    }

    for (const extension of OFFICIAL_CATALOG) {
      const offered = new Set(toolboxTypes(extension.blockly.toolboxCategory))
      for (const block of extension.blockly.blocks) {
        const migration = inferBlockContract(block).migration
        if (migration !== 'keep' && migration !== 'lift-periodic-loop') {
          expect(offered.has(block.type), block.type).toBe(false)
        }
      }
    }
  })
})
