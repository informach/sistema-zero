import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { START_ONLY_STATEMENT_TYPES, SZIRV2Schema } from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { PERSISTENT_EXTENSION_COMMANDS } from '../../official-extensions/persistentResourceContract'
import { CANVAS3D_RESOURCE_CREATOR_BLOCK_TYPES } from '../../three/canvas3dContract'
import {
  BEHAVIOR_AREA_LABELS,
  getBlockContract,
  inferBlockContract,
  materializeBlockDefinition,
  NESTED_STATEMENT_CHECKS,
  registerBlockContracts,
} from '../blockContracts'
import { CORE_BLOCKS, registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { HTMLConnectionChecker } from '../htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../setup'

function definition(type: string) {
  const all = [...CORE_BLOCKS, ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks)]
  const found = all.find((block) => block.type === type)
  if (!found) throw new Error(`Bloco ausente no teste: ${type}`)
  return found
}

describe('contrato central de posicionamento', () => {
  it('mantém documentação e contexto da IA alinhados aos nomes canônicos das áreas', () => {
    for (const extension of OFFICIAL_CATALOG) {
      const docs = extension.manifest.docs ?? ''
      const ai = extension.ai?.promptContext ?? extension.ai?.promptSummary ?? ''
      for (const label of Object.values(BEHAVIOR_AREA_LABELS)) {
        expect(docs).toContain(label)
        expect(ai).toContain(label)
      }
    }
  })

  it('usa linguagem visível simples e sem travessões', () => {
    const blocks = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    const visibleBlockText = (block: (typeof blocks)[number]) => ({
      message0: block.message0,
      args0: block.args0,
      message1: block.message1,
      args1: block.args1,
      message2: block.message2,
      args2: block.args2,
      message3: block.message3,
      args3: block.args3,
      message4: block.message4,
      args4: block.args4,
      message5: block.message5,
      args5: block.args5,
      tooltip: block.tooltip,
    })
    const blockOffenders = blocks
      .filter((block) => /[—–]/u.test(JSON.stringify(visibleBlockText(block))))
      .map((block) => block.type)
    const extensionOffenders = OFFICIAL_CATALOG.filter((extension) =>
      /[—–]/u.test(
        JSON.stringify({
          name: extension.manifest.name,
          description: extension.manifest.description,
          docs: extension.manifest.docs,
          toolbox: extension.blockly.toolboxCategory,
        }),
      ),
    ).map((extension) => extension.manifest.id)

    expect(blockOffenders).toEqual([])
    expect(extensionOffenders).toEqual([])
  })

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

  it('exige placement declarado em todo bloco executável oficial', () => {
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    for (const block of all) {
      const contract = inferBlockContract(block)
      if (contract.domain !== 'behavior') continue
      expect(block.placement, block.type).toBeDefined()
    }
  })

  it('separa fisicamente início, eventos e loops', () => {
    expect(
      materializeBlockDefinition(definition('sz_js_console_log_text')).previousStatement,
    ).toEqual(['JSStartRoot', ...NESTED_STATEMENT_CHECKS])
    expect(materializeBlockDefinition(definition('sz_js_on_click')).previousStatement).toEqual([
      'JSEventRoot',
      'JSFunctionStmt',
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
      for (const args of [
        materialized.args0,
        materialized.args1,
        materialized.args2,
        materialized.args3,
      ]) {
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

  it('impede fisicamente e na IR que preparações exclusivas de Ao iniciar sejam aninhadas', () => {
    ensureBlocklyInitialized()
    for (const extension of OFFICIAL_CATALOG) {
      registerExtensionBlocks(extension.blockly.blocks)
    }
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    const derivedStatementTypes = new Set<string>()

    for (const definition of all) {
      const contract = inferBlockContract(definition)
      const placement = contract.placement
      if (
        definition.hidden ||
        contract.domain !== 'behavior' ||
        !placement ||
        placement.root.length !== 1 ||
        placement.root[0] !== 'start' ||
        placement.nested.length !== 0
      ) {
        continue
      }

      expect(materializeBlockDefinition(definition).previousStatement, definition.type).toEqual([
        'JSStartRoot',
      ])

      const workspace = new Blockly.Workspace()
      try {
        const frame = workspace.newBlock('sz_frame_start')
        const block = workspace.newBlock(definition.type)
        const frameConnection = frame.getInput('CHILDREN')?.connection
        const blockConnection = block.previousConnection
        if (!frameConnection || !blockConnection) {
          throw new Error(`${definition.type}: conexões do bloco inicial ausentes`)
        }
        frameConnection.connect(blockConnection)
        const ir = buildIRFromWorkspace(workspace)
        const statement = ir.behavior.start[0]
        if (!statement) throw new Error(`${definition.type}: não gerou statement`)
        derivedStatementTypes.add(statement.type)

        const nestedInEvent = {
          ...ir,
          behavior: {
            start: [],
            events: [{ type: 'event', target: 'window', event: 'click', body: [statement] }],
            loops: [],
          },
        }
        const nestedInLoop = {
          ...ir,
          behavior: {
            start: [],
            events: [],
            loops: [{ type: 'animationLoop', body: [statement] }],
          },
        }
        expect(SZIRV2Schema.safeParse(nestedInEvent).success, definition.type).toBe(false)
        expect(SZIRV2Schema.safeParse(nestedInLoop).success, definition.type).toBe(false)
      } finally {
        workspace.dispose()
      }
    }

    expect(derivedStatementTypes).toEqual(START_ONLY_STATEMENT_TYPES)
  })

  it('repara um bloco que foi registrado externamente sem o contrato físico', () => {
    const raw = {
      type: 'sz_test_external_registration',
      message0: 'teste',
      placement: 'command' as const,
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

  it('mantém imports do Canvas 3D somente em Ao iniciar', () => {
    for (const type of ['sz_t3d_import', 'sz_t3d_import_named']) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.root, type).toEqual(['start'])
      expect(contract.placement?.nested, type).toEqual([])
      expect(contract.placement?.role, type).toBe('declaration')
      expect(materializeBlockDefinition(definition(type)).previousStatement, type).toEqual([
        'JSStartRoot',
      ])
    }
  })

  it('não encaixa criadores de recursos Canvas 3D diretamente em um laço', () => {
    ensureBlocklyInitialized()
    for (const type of CANVAS3D_RESOURCE_CREATOR_BLOCK_TYPES) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.nested, type).not.toContain('loop-body')
      expect(contract.placement?.forbiddenNested, type).toContain('loop-body')
      expect(materializeBlockDefinition(definition(type)).previousStatement, type).not.toContain(
        'JSLoopStmt',
      )

      const workspace = new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )
      try {
        const frame = workspace.newBlock('sz_frame_loops')
        const loop = workspace.newBlock('sz_canvas_anim_loop')
        const resource = workspace.newBlock(type)
        const frameConnection = frame.getInput('CHILDREN')?.connection
        const loopConnection = loop.previousConnection
        const bodyConnection = loop.getInput('BODY')?.connection
        const resourceConnection = resource.previousConnection
        if (!frameConnection || !loopConnection || !bodyConnection || !resourceConnection) {
          throw new Error(`${type}: conexões do cenário de laço ausentes`)
        }
        expect(frameConnection.connect(loopConnection), type).toBe(true)
        expect(bodyConnection.connect(resourceConnection), type).toBe(false)
        expect(resource.getParent(), type).toBeNull()
      } finally {
        workspace.dispose()
      }
    }
  })

  it('impede comandos persistentes das extensões em qualquer laço físico e na IR', () => {
    ensureBlocklyInitialized()
    for (const extension of OFFICIAL_CATALOG) {
      registerExtensionBlocks(extension.blockly.blocks)
    }

    expect(PERSISTENT_EXTENSION_COMMANDS).toEqual(
      expect.arrayContaining([
        { blockType: 'sz_gk_start_spawner', statementType: 'gk:startSpawner' },
        { blockType: 'sz_g3k_start_spawner', statementType: 'g3k:startSpawner' },
        { blockType: 'sz_g3k_start_timer', statementType: 'g3k:startTimer' },
      ]),
    )

    const declaredPersistentBlocks = OFFICIAL_CATALOG.filter((extension) =>
      ['game-2d-advanced', 'game-3d-advanced'].includes(extension.manifest.id),
    )
      .flatMap((extension) => extension.blockly.blocks)
      .filter((block) => block.placement === 'resource-creator')
      .map((block) => block.type)
      .sort()
    expect(declaredPersistentBlocks).toEqual(
      PERSISTENT_EXTENSION_COMMANDS.map(({ blockType }) => blockType).sort(),
    )

    for (const contractEntry of PERSISTENT_EXTENSION_COMMANDS) {
      const { blockType, statementType } = contractEntry
      const gameKit3D = blockType.startsWith('sz_g3k_')
      const loopType = gameKit3D ? 'g3k:onUpdate' : 'gk:onUpdate'
      const contract = inferBlockContract(definition(blockType))
      expect(contract.placement?.forbiddenNested, blockType).toContain('loop-body')
      expect(
        materializeBlockDefinition(definition(blockType)).previousStatement,
        blockType,
      ).not.toContain('JSLoopStmt')

      const workspace = new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )
      try {
        const loopFrame = workspace.newBlock('sz_frame_loops')
        const loopBlockType = gameKit3D ? 'sz_g3k_on_update' : 'sz_gk_on_update'
        const loop = workspace.newBlock(loopBlockType)
        const resource = workspace.newBlock(blockType)
        const frameConnection = loopFrame.getInput('CHILDREN')?.connection
        const loopConnection = loop.previousConnection
        const bodyConnection = loop.getInput('BODY')?.connection
        const resourceConnection = resource.previousConnection
        if (!frameConnection || !loopConnection || !bodyConnection || !resourceConnection) {
          throw new Error(`${blockType}: conexões do cenário de laço ausentes`)
        }
        expect(frameConnection.connect(loopConnection), blockType).toBe(true)
        expect(bodyConnection.connect(resourceConnection), blockType).toBe(false)

        const startFrame = workspace.newBlock('sz_frame_start')
        const startConnection = startFrame.getInput('CHILDREN')?.connection
        if (!startConnection) throw new Error(`${blockType}: conexão da área inicial ausente`)
        expect(startConnection.connect(resourceConnection), blockType).toBe(true)
        const ir = buildIRFromWorkspace(workspace)
        const statement = ir.behavior.start[0]
        if (!statement) throw new Error(`${blockType}: não gerou statement`)
        expect(statement.type, blockType).toBe(statementType)

        const nestedInNativeLoop = {
          ...ir,
          behavior: {
            start: [],
            events: [],
            loops: [{ type: loopType, dtName: 'dt', body: [statement] }],
          },
        }
        expect(SZIRV2Schema.safeParse(nestedInNativeLoop).success, blockType).toBe(false)

        const nestedInSyntacticLoop = {
          ...ir,
          behavior: {
            start: [
              {
                type: 'repeat',
                times: { type: 'num', value: 2 },
                body: [statement],
              },
            ],
            events: [],
            loops: [],
          },
        }
        expect(SZIRV2Schema.safeParse(nestedInSyntacticLoop).success, blockType).toBe(false)
      } finally {
        workspace.dispose()
      }
    }
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
