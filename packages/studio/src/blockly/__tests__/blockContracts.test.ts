import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { loadExtensionDocs } from '#extensions'
import {
  behaviorStatements,
  type JSExpr,
  type JSStatement,
  START_ONLY_STATEMENT_TYPES,
  SZIRSchema,
  SZIRV2Schema,
} from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import {
  programmingChildBodyEntries,
  programmingEmbeddedBodyEntries,
} from '../../ir/programmingExecution'
import { CONTINUOUS_EXTENSION_COMMANDS } from '../../official-extensions/continuousCommandContract'
import { PERSISTENT_EXTENSION_COMMANDS } from '../../official-extensions/persistentResourceContract'
import {
  CANVAS3D_RESOURCE_CREATOR_BLOCK_TYPES,
  CANVAS3D_START_ONLY_BLOCK_TYPES,
} from '../../three/canvas3dContract'
import {
  BEHAVIOR_AREA_LABELS,
  contractEventObjectCapability,
  contractProvidesUserGesture,
  effectiveBodyExecution,
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

function hasStatementInput(block: ReturnType<typeof definition>): boolean {
  return [block.args0, block.args1, block.args2, block.args3, block.args4, block.args5].some(
    (args) =>
      args?.some(
        (arg) =>
          typeof arg === 'object' &&
          arg !== null &&
          (arg as { type?: unknown }).type === 'input_statement',
      ),
  )
}

function nodeWithId(value: unknown, id: string): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = nodeWithId(child, id)
      if (found) return found
    }
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (record.__id === id || record.ctorId === id) return record
  for (const child of Object.values(record)) {
    const found = nodeWithId(child, id)
    if (found) return found
  }
  return null
}

describe('contrato central de posicionamento', () => {
  it('mantém documentação e contexto da IA alinhados aos nomes canônicos das áreas', async () => {
    for (const extension of OFFICIAL_CATALOG) {
      const docs = await loadExtensionDocs(extension)
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

  it('exige timing explícito em todo corpo de comando que é callback', () => {
    const syntacticContainers = new Set([
      'sz_legacy_nested_start',
      'sz_legacy_nested_event',
      'sz_legacy_nested_loop',
      'sz_js_if_else',
      'sz_js_repeat',
      'sz_js_while',
      'sz_js_do_while',
      'sz_js_switch',
      'sz_js_case',
      'sz_js_for_of',
      'sz_js_for_range',
      'sz_js_try_catch',
      'sz_js_class',
    ])
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    const missing = all
      .filter((block) =>
        [block.args0, block.args1, block.args2, block.args3, block.args4, block.args5].some(
          (args) =>
            args?.some(
              (arg) =>
                typeof arg === 'object' &&
                arg !== null &&
                (arg as { type?: unknown }).type === 'input_statement',
            ),
        ),
      )
      .filter((block) => {
        const contract = inferBlockContract(block)
        return (
          contract.domain === 'behavior' &&
          contract.placement?.role !== 'event' &&
          contract.placement?.role !== 'loop' &&
          contract.bodyExecution === 'structural' &&
          !syntacticContainers.has(block.type)
        )
      })
      .map((block) => block.type)

    expect(missing).toEqual([])
  })

  it('declara gestos diretos no catálogo, inclusive a condição de keydown', () => {
    for (const type of [
      'sz_js_on_click',
      'sz_js_on_click_anywhere',
      'sz_js_element_onclick',
      'sz_js_on_pointer_down',
      'sz_js_on_pointer_up',
      'sz_g2d_on_pointer',
      'sz_g2d_on_key',
      'sz_gk_on_game_click',
      'sz_gk_add_button',
      'sz_g3k_add_button',
    ]) {
      expect(contractProvidesUserGesture(inferBlockContract(definition(type))), type).toBe(true)
    }

    const keyboard = inferBlockContract(definition('sz_js_on_key'))
    expect(contractProvidesUserGesture(keyboard, () => 'keydown')).toBe(true)
    expect(contractProvidesUserGesture(keyboard, () => 'keyup')).toBe(false)
  })

  it('declara somente os callbacks que recebem um objeto Event do navegador', () => {
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    const declared = Object.fromEntries(
      all.flatMap((block) => {
        const capability = contractEventObjectCapability(inferBlockContract(block))
        return capability ? [[block.type, capability]] : []
      }),
    )

    expect(declared).toEqual({
      sz_js_on_click: 'pointer',
      sz_js_on_click_anywhere: 'pointer',
      sz_js_on_mouseover: 'pointer',
      sz_js_on_input: 'generic',
      sz_js_on_submit: 'generic',
      sz_js_on_key: 'keyboard',
      sz_js_on_mousemove: 'pointer',
      sz_js_on_pointer_down: 'pointer',
      sz_js_on_pointer_up: 'pointer',
      sz_js_on_load: 'generic',
      sz_js_on_resize: 'generic',
      sz_js_on_context_menu: 'pointer',
      sz_js_on_blur: 'generic',
      sz_js_element_onclick: 'pointer',
      sz_js_on_fullscreen_change: 'generic',
      sz_js_image_onload: 'generic',
      sz_js_image_onerror: 'generic',
    })
  })

  it('mantém timing e objeto Event alinhados entre cada bloco-callback e a IR real', () => {
    ensureBlocklyInitialized()
    for (const extension of OFFICIAL_CATALOG) {
      registerExtensionBlocks(extension.blockly.blocks)
    }
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    const callbacks = all.filter((block) => {
      const contract = inferBlockContract(block)
      return hasStatementInput(block) && effectiveBodyExecution(contract) !== 'structural'
    })

    expect(callbacks.length).toBeGreaterThan(100)
    for (const block of callbacks) {
      const workspace = new Blockly.Workspace()
      try {
        const target = workspace.newBlock(block.type)
        const contract = inferBlockContract(block)
        const expectedExecution = effectiveBodyExecution(contract)
        const expectedEventObject = contractEventObjectCapability(contract)
        const connect = (parent: Blockly.Block, inputName: string, child: Blockly.Block): void => {
          const input = parent.getInput(inputName)?.connection
          const previous = child.previousConnection
          if (!input || !previous || !input.connect(previous)) {
            throw new Error(`${block.type}: não conectou em ${parent.type}.${inputName}`)
          }
        }

        if (target.outputConnection) {
          const frame = workspace.newBlock('sz_frame_start')
          const log = workspace.newBlock('sz_js_console_log_value')
          connect(frame, 'CHILDREN', log)
          const value = log.getInput('VALUE')?.connection
          if (!value?.connect(target.outputConnection)) {
            throw new Error(`${block.type}: não conectou como valor`)
          }
        } else if (
          contract.placement?.role === 'declaration' &&
          contract.placement.root.length === 0
        ) {
          // Membro de classe: hospedado numa classe, que mora em 🧩 Meus moldes.
          const frame = workspace.newBlock('sz_frame_molds')
          const classBlock = workspace.newBlock('sz_js_class')
          connect(frame, 'CHILDREN', classBlock)
          connect(classBlock, 'MEMBERS', target)
        } else if (contract.placement?.root[0]) {
          const frame = workspace.newBlock(`sz_frame_${contract.placement.root[0]}`)
          connect(frame, 'CHILDREN', target)
        } else if (contract.placement?.nested.includes('loop-body')) {
          const frame = workspace.newBlock('sz_frame_loops')
          const loop = workspace.newBlock('sz_canvas_anim_loop')
          connect(frame, 'CHILDREN', loop)
          connect(loop, 'BODY', target)
        } else if (contract.placement?.nested.includes('event-body')) {
          const frame = workspace.newBlock('sz_frame_events')
          const event = workspace.newBlock('sz_js_on_click_anywhere')
          connect(frame, 'CHILDREN', event)
          connect(event, 'DO', target)
        } else {
          const frame = workspace.newBlock('sz_frame_start')
          const fn = workspace.newBlock('sz_js_function')
          connect(frame, 'CHILDREN', fn)
          connect(fn, 'BODY', target)
        }

        const ir = buildIRFromWorkspace(workspace)
        const targetNode = nodeWithId(ir, target.id)
        expect(targetNode, `${block.type}: nó da IR`).not.toBeNull()
        if (!targetNode) throw new Error(`${block.type}: nó da IR ausente`)

        if (target.outputConnection) {
          const expression = targetNode as unknown as JSExpr
          const entries = programmingEmbeddedBodyEntries({
            type: 'consoleLog',
            value: expression,
          })
          expect(entries.length, block.type).toBeGreaterThan(0)
          expect(
            entries.every((entry) => entry.execution === expectedExecution),
            block.type,
          ).toBe(true)
          continue
        }

        if (
          block.type === 'sz_js_constructor' ||
          block.type === 'sz_js_class_method' ||
          block.type === 'sz_js_class_method_async'
        ) {
          const classStatement = behaviorStatements(ir).find(
            (statement) => statement.type === 'classDecl',
          )
          if (!classStatement) throw new Error(`${block.type}: classe ausente na IR`)
          const entries = programmingChildBodyEntries(classStatement)
          expect(
            entries.some((entry) => entry.execution === expectedExecution),
            block.type,
          ).toBe(true)
          continue
        }

        const entries = programmingChildBodyEntries(targetNode as unknown as JSStatement)
        expect(entries.length, block.type).toBeGreaterThan(0)
        for (const entry of entries) {
          expect(entry.execution, `${block.type}: timing`).toBe(expectedExecution)
          expect(entry.eventObject, `${block.type}: Event`).toBe(expectedEventObject)
        }
      } finally {
        workspace.dispose()
      }
    }
  })

  it('separa fisicamente início, eventos e loops', () => {
    expect(
      materializeBlockDefinition(definition('sz_js_console_log_text')).previousStatement,
    ).toEqual(['JSStartRoot', ...NESTED_STATEMENT_CHECKS])
    expect(materializeBlockDefinition(definition('sz_js_on_click')).previousStatement).toEqual([
      'JSEventRoot',
      'JSFunctionStmt',
      'JSAsyncStmt',
      'JSConstructorStmt',
      'JSDerivedConstructorStmt',
      'JSDerivedMethodStmt',
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
        materialized.args4,
        materialized.args5,
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
      molds: 'sz_frame_molds',
      start: 'sz_frame_start',
      events: 'sz_frame_events',
      loops: 'sz_frame_loops',
    } as const

    for (const definition of all) {
      const contract = inferBlockContract(definition)
      const areas = contract.placement?.root ?? []
      if (
        contract.domain !== 'behavior' ||
        areas.length === 0 ||
        definition.hidden ||
        !['keep', 'lift-periodic-loop'].includes(contract.migration)
      ) {
        continue
      }
      for (const area of areas) {
        const workspace = new Blockly.Workspace()
        const label = `${definition.type}@${area}`
        try {
          const frame = workspace.newBlock(frameFor[area])
          const block = workspace.newBlock(definition.type)
          const input = frame.getInput('CHILDREN')?.connection
          if (!input || !block.previousConnection) throw new Error(`Conexão ausente: ${label}`)
          expect(input.connect(block.previousConnection), label).toBe(true)
          const ir = buildIRFromWorkspace(workspace)
          expect((ir.behavior[area] ?? []).length, label).toBeGreaterThan(0)
          const parsed = SZIRV2Schema.safeParse(ir)
          const lifecycleIssues = parsed.success
            ? []
            : parsed.error.issues.filter(
                (issue) =>
                  issue.path.length === 3 &&
                  issue.path[0] === 'behavior' &&
                  issue.message.includes('não pode ficar na área'),
              )
          expect(lifecycleIssues, label).toEqual([])
        } finally {
          workspace.dispose()
        }
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
      // Preparação exclusiva vale para as DUAS áreas sem aninhamento: ⚙️ Ao
      // iniciar (montar a partida) e 🧩 Meus moldes (definir as receitas).
      // Preparação exclusiva = só cabe em área(s) de preparação e NUNCA aninha.
      // A função cabe nas DUAS (é molde ou agrupamento do início), então o
      // critério é o conjunto de raízes, não uma raiz única.
      const preparationAreas = new Set<string>(['start', 'molds'])
      const exclusiveArea = placement?.root.includes('molds') ? 'molds' : 'start'
      if (
        definition.hidden ||
        contract.domain !== 'behavior' ||
        !placement ||
        placement.root.length === 0 ||
        !placement.root.every((area) => preparationAreas.has(area)) ||
        placement.nested.length !== 0
      ) {
        continue
      }
      const rootFrame = exclusiveArea === 'molds' ? 'sz_frame_molds' : 'sz_frame_start'
      // O bloco aceita EXATAMENTE os checks das áreas de preparação que declara.
      const expectedChecks = placement.root.map((area) =>
        area === 'molds' ? 'JSMoldRoot' : 'JSStartRoot',
      )
      expect(
        [...(materializeBlockDefinition(definition).previousStatement as string[])].sort(),
        definition.type,
      ).toEqual([...expectedChecks].sort())

      const workspace = new Blockly.Workspace()
      try {
        const frame = workspace.newBlock(rootFrame)
        const block = workspace.newBlock(definition.type)
        const frameConnection = frame.getInput('CHILDREN')?.connection
        const blockConnection = block.previousConnection
        if (!frameConnection || !blockConnection) {
          throw new Error(`${definition.type}: conexões do bloco inicial ausentes`)
        }
        frameConnection.connect(blockConnection)
        const ir = buildIRFromWorkspace(workspace)
        const statement = (ir.behavior[exclusiveArea] ?? [])[0]
        if (!statement) throw new Error(`${definition.type}: não gerou statement`)
        derivedStatementTypes.add(statement.type)

        const nestedInEvent = {
          ...ir,
          behavior: {
            molds: [],
            start: [],
            events: [{ type: 'event', target: 'window', event: 'click', body: [statement] }],
            loops: [],
          },
        }
        const nestedInLoop = {
          ...ir,
          behavior: {
            molds: [],
            start: [],
            events: [],
            loops: [{ type: 'animationLoop', body: [statement] }],
          },
        }
        expect(SZIRV2Schema.safeParse(nestedInEvent).success, definition.type).toBe(false)
        expect(SZIRV2Schema.safeParse(nestedInLoop).success, definition.type).toBe(false)

        const legacyNested = SZIRSchema.safeParse({
          html: ir.html,
          css: ir.css,
          js: [{ type: 'event', target: 'window', event: 'click', body: [statement] }],
          extensions: ir.extensions,
        })
        expect(legacyNested.success, `${definition.type}: IR legada`).toBe(false)
        if (!legacyNested.success) {
          expect(
            legacyNested.error.issues.some((issue) =>
              issue.message.includes('só pode ser usado diretamente em'),
            ),
            `${definition.type}: diagnóstico da IR legada`,
          ).toBe(true)
        }
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

  it('não chama varreduras contínuas de evento nem as limita só ao loop', () => {
    for (const type of [
      'sz_g2d_on_enemy_shot_hit',
      'sz_g2d_on_group_overlap',
      'sz_g2d_on_sprite_group_overlap',
    ]) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.role, type).toBe('command')
      expect(contract.placement?.root, type).toEqual([])
      expect(contract.placement?.nested, type).toContain('loop-body')
      expect(contract.placement?.nested, type).toContain('function-body')
      expect(contract.placement?.nested, type).not.toContain('event-body')
      expect(contract.placement?.forbiddenDirectNested, type).toContain('event-body')
    }
  })

  it('mantém todos os comandos contínuos apenas em loops e funções ou métodos', () => {
    const declaredContinuousBlocks = OFFICIAL_CATALOG.flatMap(
      (extension) => extension.blockly.blocks,
    )
      .filter((block) => block.placement === 'loop-command')
      .map((block) => block.type)
      .sort()

    expect(declaredContinuousBlocks).toEqual(
      CONTINUOUS_EXTENSION_COMMANDS.map(({ blockType }) => blockType).sort(),
    )

    for (const { blockType } of CONTINUOUS_EXTENSION_COMMANDS) {
      const contract = inferBlockContract(definition(blockType))
      expect(contract.placement?.root, blockType).toEqual([])
      expect(contract.placement?.nested, blockType).toEqual([
        'loop-body',
        'function-body',
        'async-function-body',
        'derived-method-body',
      ])
      expect(contract.placement?.forbiddenNested, blockType).toBeUndefined()
      expect(contract.placement?.forbiddenDirectNested, blockType).toEqual([
        'event-body',
        'constructor-body',
      ])
      expect(
        materializeBlockDefinition(definition(blockType)).previousStatement,
        blockType,
      ).toEqual(['JSLoopStmt', 'JSFunctionStmt', 'JSAsyncStmt', 'JSDerivedMethodStmt'])
    }
  })

  it('aplica fisicamente o contexto de comando contínuo', () => {
    ensureBlocklyInitialized()
    for (const extension of OFFICIAL_CATALOG) {
      registerExtensionBlocks(extension.blockly.blocks)
    }

    const connectInside = (
      areaType: 'sz_frame_events' | 'sz_frame_loops' | 'sz_frame_start',
      containerType: 'sz_g3d_animate' | 'sz_js_function' | 'sz_js_on_click',
      inputName: 'BODY' | 'DO',
      expected: boolean,
    ): void => {
      const workspace = new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )
      try {
        const frame = workspace.newBlock(areaType)
        const container = workspace.newBlock(containerType)
        const command = workspace.newBlock('sz_g3d_control_keys')
        const frameConnection = frame.getInput('CHILDREN')?.connection
        const containerConnection = container.previousConnection
        const bodyConnection = container.getInput(inputName)?.connection
        const commandConnection = command.previousConnection
        if (!frameConnection || !containerConnection || !bodyConnection || !commandConnection) {
          throw new Error(`${containerType}: conexões do cenário ausentes`)
        }
        expect(frameConnection.connect(containerConnection), containerType).toBe(true)
        expect(bodyConnection.connect(commandConnection), containerType).toBe(expected)
      } finally {
        workspace.dispose()
      }
    }

    connectInside('sz_frame_loops', 'sz_g3d_animate', 'BODY', true)
    connectInside('sz_frame_start', 'sz_js_function', 'BODY', true)
    connectInside('sz_frame_events', 'sz_js_on_click', 'DO', false)

    const nestedEventWorkspace = new Blockly.Workspace(
      new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
    )
    try {
      const frame = nestedEventWorkspace.newBlock('sz_frame_events')
      const event = nestedEventWorkspace.newBlock('sz_js_on_click')
      const loop = nestedEventWorkspace.newBlock('sz_js_repeat')
      const command = nestedEventWorkspace.newBlock('sz_g3d_control_keys')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      const eventConnection = event.previousConnection
      const eventBodyConnection = event.getInput('DO')?.connection
      const loopConnection = loop.previousConnection
      const loopBodyConnection = loop.getInput('DO')?.connection
      const commandConnection = command.previousConnection
      if (
        !frameConnection ||
        !eventConnection ||
        !eventBodyConnection ||
        !loopConnection ||
        !loopBodyConnection ||
        !commandConnection
      ) {
        throw new Error('Conexões do cenário de loop dentro de evento ausentes')
      }
      expect(frameConnection.connect(eventConnection)).toBe(true)
      expect(eventBodyConnection.connect(loopConnection)).toBe(true)
      expect(loopBodyConnection.connect(commandConnection)).toBe(true)
    } finally {
      nestedEventWorkspace.dispose()
    }

    const workspace = new Blockly.Workspace(
      new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
    )
    try {
      const frame = workspace.newBlock('sz_frame_start')
      const command = workspace.newBlock('sz_g3d_control_keys')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      const commandConnection = command.previousConnection
      if (!frameConnection || !commandConnection) throw new Error('Conexões da raiz ausentes')
      expect(frameConnection.connect(commandConnection)).toBe(false)
    } finally {
      workspace.dispose()
    }

    for (const [memberType, expected] of [
      ['sz_js_class_method', true],
      ['sz_js_constructor', false],
    ] as const) {
      const classWorkspace = new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )
      try {
        // A classe é molde: mora em 🧩 Meus moldes.
        const frame = classWorkspace.newBlock('sz_frame_molds')
        const classBlock = classWorkspace.newBlock('sz_js_class')
        const member = classWorkspace.newBlock(memberType)
        const command = classWorkspace.newBlock('sz_g3d_control_keys')
        const frameConnection = frame.getInput('CHILDREN')?.connection
        const classConnection = classBlock.previousConnection
        const membersConnection = classBlock.getInput('MEMBERS')?.connection
        const memberConnection = member.previousConnection
        const bodyConnection = member.getInput('BODY')?.connection
        const commandConnection = command.previousConnection
        if (
          !frameConnection ||
          !classConnection ||
          !membersConnection ||
          !memberConnection ||
          !bodyConnection ||
          !commandConnection
        ) {
          throw new Error(`${memberType}: conexões do cenário de classe ausentes`)
        }
        expect(frameConnection.connect(classConnection), memberType).toBe(true)
        expect(membersConnection.connect(memberConnection), memberType).toBe(true)
        expect(bodyConnection.connect(commandConnection), memberType).toBe(expected)
      } finally {
        classWorkspace.dispose()
      }
    }

    const nestedConstructorWorkspace = new Blockly.Workspace(
      new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
    )
    try {
      const frame = nestedConstructorWorkspace.newBlock('sz_frame_molds')
      const classBlock = nestedConstructorWorkspace.newBlock('sz_js_class')
      const constructorBlock = nestedConstructorWorkspace.newBlock('sz_js_constructor')
      const loop = nestedConstructorWorkspace.newBlock('sz_js_repeat')
      const command = nestedConstructorWorkspace.newBlock('sz_g3d_control_keys')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      const classConnection = classBlock.previousConnection
      const membersConnection = classBlock.getInput('MEMBERS')?.connection
      const constructorConnection = constructorBlock.previousConnection
      const constructorBodyConnection = constructorBlock.getInput('BODY')?.connection
      const loopConnection = loop.previousConnection
      const loopBodyConnection = loop.getInput('DO')?.connection
      const commandConnection = command.previousConnection
      if (
        !frameConnection ||
        !classConnection ||
        !membersConnection ||
        !constructorConnection ||
        !constructorBodyConnection ||
        !loopConnection ||
        !loopBodyConnection ||
        !commandConnection
      ) {
        throw new Error('Conexões do cenário de loop dentro de construtor ausentes')
      }
      expect(frameConnection.connect(classConnection)).toBe(true)
      expect(membersConnection.connect(constructorConnection)).toBe(true)
      expect(constructorBodyConnection.connect(loopConnection)).toBe(true)
      expect(loopBodyConnection.connect(commandConnection)).toBe(true)
    } finally {
      nestedConstructorWorkspace.dispose()
    }
  })

  it('mantém métodos do evento fora das raízes', () => {
    const contract = inferBlockContract(definition('sz_js_event_method'))
    expect(contract.placement?.root).toEqual([])
    expect(contract.placement?.nested).toEqual(['event-body'])
  })

  it('mantém as declarações do Canvas 3D presas à sua área, sem aninhamento', () => {
    // Os imports são MOLDES (só trazem a biblioteca); as demais declarações do
    // Canvas 3D continuam sendo preparação de partida em Ao iniciar.
    const MOLD_IMPORTS = new Set(['sz_t3d_import', 'sz_t3d_import_named'])
    for (const type of CANVAS3D_START_ONLY_BLOCK_TYPES) {
      const contract = inferBlockContract(definition(type))
      const area = MOLD_IMPORTS.has(type) ? 'molds' : 'start'
      const check = MOLD_IMPORTS.has(type) ? 'JSMoldRoot' : 'JSStartRoot'
      expect(contract.placement?.root, type).toEqual([area])
      expect(contract.placement?.nested, type).toEqual([])
      expect(contract.placement?.role, type).toBe('declaration')
      expect(materializeBlockDefinition(definition(type)).previousStatement, type).toEqual([check])
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
        { blockType: 'sz_g2d_play_music', statementType: 'g2d:playMusic' },
        { blockType: 'sz_gk_pkm_grass_cells', statementType: 'gk:pkmGrassCells' },
        { blockType: 'sz_gk_pkm_grass_tiles', statementType: 'gk:pkmGrassTiles' },
        { blockType: 'sz_gk_pkm_wild', statementType: 'gk:pkmWild' },
        { blockType: 'sz_gk_start_spawner', statementType: 'gk:startSpawner' },
        { blockType: 'sz_gk_wait', statementType: 'gk:waitThen' },
        { blockType: 'sz_g3k_start_spawner', statementType: 'g3k:startSpawner' },
        { blockType: 'sz_g3k_start_timer', statementType: 'g3k:startTimer' },
        { blockType: 'sz_w3d_ambience', statementType: 'w3d:ambience' },
        { blockType: 'sz_w3d_play_music', statementType: 'w3d:playMusic' },
      ]),
    )

    const declaredPersistentBlocks = OFFICIAL_CATALOG.flatMap(
      (extension) => extension.blockly.blocks,
    )
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

  it('aceita eventos diretamente em funções e classes, sem escondê-los em comandos', () => {
    const project = (ctorBody: unknown[]) => ({
      version: 2,
      html: [],
      css: [],
      behavior: {
        // A classe é molde: a área dela é 🧩 Meus moldes.
        molds: [
          {
            type: 'classDecl',
            name: 'Jogo',
            ctorParams: [],
            ctorBody,
            methods: [],
          },
        ],
        start: [],
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
    ).toBe(false)
  })

  it('aplica fisicamente a exigência de evento como filho direto de função', () => {
    ensureBlocklyInitialized()
    const makeWorkspace = () =>
      new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )

    const directWorkspace = makeWorkspace()
    try {
      const frame = directWorkspace.newBlock('sz_frame_start')
      const func = directWorkspace.newBlock('sz_js_function')
      const event = directWorkspace.newBlock('sz_js_on_click_anywhere')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      const funcConnection = func.previousConnection
      const bodyConnection = func.getInput('BODY')?.connection
      const eventConnection = event.previousConnection
      if (!frameConnection || !funcConnection || !bodyConnection || !eventConnection) {
        throw new Error('Conexões do evento direto ausentes')
      }
      expect(frameConnection.connect(funcConnection)).toBe(true)
      expect(bodyConnection.connect(eventConnection)).toBe(true)
    } finally {
      directWorkspace.dispose()
    }

    const nestedWorkspace = makeWorkspace()
    try {
      const frame = nestedWorkspace.newBlock('sz_frame_start')
      const func = nestedWorkspace.newBlock('sz_js_function')
      const repeat = nestedWorkspace.newBlock('sz_js_repeat')
      const event = nestedWorkspace.newBlock('sz_js_on_click_anywhere')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      const funcConnection = func.previousConnection
      const functionBodyConnection = func.getInput('BODY')?.connection
      const repeatConnection = repeat.previousConnection
      const repeatBodyConnection = repeat.getInput('DO')?.connection
      const eventConnection = event.previousConnection
      if (
        !frameConnection ||
        !funcConnection ||
        !functionBodyConnection ||
        !repeatConnection ||
        !repeatBodyConnection ||
        !eventConnection
      ) {
        throw new Error('Conexões do evento aninhado ausentes')
      }
      expect(frameConnection.connect(funcConnection)).toBe(true)
      expect(functionBodyConnection.connect(repeatConnection)).toBe(true)
      expect(repeatBodyConnection.connect(eventConnection)).toBe(false)
      expect(event.getParent()).toBeNull()
    } finally {
      nestedWorkspace.dispose()
    }
  })

  it('não confunde comandos que contêm “on” com eventos', () => {
    for (const type of ['sz_gk_keep_on_screen', 'sz_gk_bounce_on_edges', 'sz_gk_lean_on_move']) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.role, type).toBe('command')
      expect(contract.placement?.root, type).toEqual(['start'])
    }
    expect(inferBlockContract(definition('sz_gk_rpg_on_step')).placement?.role).toBe('event')
  })

  it('restringe os blocos auxiliares do GK aos contêineres que os interpretam', () => {
    ensureBlocklyInitialized()
    for (const extension of OFFICIAL_CATALOG) {
      registerExtensionBlocks(extension.blockly.blocks)
    }

    const scenarios = [
      {
        area: 'sz_frame_events',
        container: 'sz_gk_rpg_on_enter_map',
        child: 'sz_gk_rpg_on_step',
      },
      // "Criar o caminho" é molde: o caminho é uma receita, não uma instância.
      { area: 'sz_frame_molds', container: 'sz_gk_define_path', child: 'sz_gk_path_point' },
      { area: 'sz_frame_start', container: 'sz_gk_rpg_menu', child: 'sz_gk_rpg_option' },
      { area: 'sz_frame_start', container: 'sz_gk_rpg_cutscene', child: 'sz_gk_rpg_wait' },
      {
        area: 'sz_frame_start',
        container: 'sz_gk_pkm_battle_trainer',
        child: 'sz_gk_pkm_trainer_creature',
      },
    ] as const

    for (const [index, scenario] of scenarios.entries()) {
      const nested = new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )
      try {
        const frame = nested.newBlock(scenario.area)
        const container = nested.newBlock(scenario.container)
        const child = nested.newBlock(scenario.child)
        const rootConnection = frame.getInput('CHILDREN')?.connection
        const containerConnection = container.previousConnection
        const bodyConnection = container.getInput('BODY')?.connection
        const childConnection = child.previousConnection
        if (!rootConnection || !containerConnection || !bodyConnection || !childConnection) {
          throw new Error(`${scenario.child}: conexões do contêiner ausentes`)
        }
        expect(rootConnection.connect(containerConnection), scenario.container).toBe(true)
        expect(bodyConnection.connect(childConnection), scenario.child).toBe(true)
        const sibling = nested.newBlock(scenario.child)
        if (!child.nextConnection || !sibling.previousConnection) {
          throw new Error(`${scenario.child}: conexões da sequência ausentes`)
        }
        expect(child.nextConnection.connect(sibling.previousConnection), scenario.child).toBe(true)
      } finally {
        nested.dispose()
      }

      const atRoot = new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )
      try {
        const frame = atRoot.newBlock(scenario.area)
        const child = atRoot.newBlock(scenario.child)
        const rootConnection = frame.getInput('CHILDREN')?.connection
        const childConnection = child.previousConnection
        if (!rootConnection || !childConnection) {
          throw new Error(`${scenario.child}: conexões da raiz ausentes`)
        }
        expect(rootConnection.connect(childConnection), scenario.child).toBe(false)
      } finally {
        atRoot.dispose()
      }

      const wrongHost = scenarios[(index + 1) % scenarios.length]
      if (!wrongHost) throw new Error('cenário de contêiner incorreto ausente')
      const inWrongContainer = new Blockly.Workspace(
        new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
      )
      try {
        const frame = inWrongContainer.newBlock(wrongHost.area)
        const container = inWrongContainer.newBlock(wrongHost.container)
        const child = inWrongContainer.newBlock(scenario.child)
        const rootConnection = frame.getInput('CHILDREN')?.connection
        const containerConnection = container.previousConnection
        const bodyConnection = container.getInput('BODY')?.connection
        const childConnection = child.previousConnection
        if (!rootConnection || !containerConnection || !bodyConnection || !childConnection) {
          throw new Error(`${scenario.child}: conexões do contêiner incorreto ausentes`)
        }
        expect(rootConnection.connect(containerConnection), wrongHost.container).toBe(true)
        expect(bodyConnection.connect(childConnection), scenario.child).toBe(false)
      } finally {
        inWrongContainer.dispose()
      }
    }
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
