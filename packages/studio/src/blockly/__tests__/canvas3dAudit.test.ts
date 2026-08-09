import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { LearningProfile } from '#core'
import { CORE_CATEGORY_LEVELS } from '#core'
import { SZIRInputSchema, SZIRSchema } from '#ir'
import { generateJS } from '../../generators/js'
import { CANVAS3D_BLOCK_TYPES, canvas3DSymbolKindsForClass } from '../../three/canvas3dContract'
import { BLOCK_CATALOG } from '../blockCatalog'
import { resolveBlockLevel } from '../blockLevels'
import { CANVAS3D_BLOCKS, CANVAS3D_GROUPS } from '../blocks/canvas3d'
import type { BlockDefinition } from '../blocks/types'
import { socketInputsFor } from '../blocks/valueSockets'
import { buildIRFromWorkspace } from '../buildIR'
import { categoryShades } from '../colorShades'
import { COMMON_ADDONS } from '../fields/FieldAddonPicker'
import { COMMON_CLASSES } from '../fields/FieldClassPicker'
import { ensureBlocklyInitialized } from '../setup'
import { CATEGORY_COLORS } from '../theme'
import { buildCoreToolbox } from '../toolbox'

interface BlockArg {
  type?: string
  name?: string
}

type MultilineBlockDefinition = BlockDefinition & {
  message4?: string
  args4?: unknown[]
  message5?: string
  args5?: unknown[]
}

function rows(definition: MultilineBlockDefinition): Array<unknown[] | undefined> {
  return [
    definition.args0,
    definition.args1,
    definition.args2,
    definition.args3,
    definition.args4,
    definition.args5,
  ]
}

function valueInputs(definition: MultilineBlockDefinition): string[] {
  return rows(definition)
    .flatMap((args) => (Array.isArray(args) ? args : []))
    .filter((arg): arg is BlockArg => Boolean(arg) && typeof arg === 'object')
    .filter((arg) => arg.type === 'input_value' && typeof arg.name === 'string')
    .map((arg) => arg.name ?? '')
}

function collectToolbox(value: unknown, types: Set<string>, names: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectToolbox(item, types, names)
    return
  }
  if (!value || typeof value !== 'object') return
  const node = value as { kind?: string; type?: string; name?: string; contents?: unknown }
  if (node.kind === 'block' && node.type) types.add(node.type)
  if (node.kind === 'category' && node.name) {
    names.add(node.name.replace(/^[^\p{L}\p{N}]+\s*/u, ''))
  }
  if (node.contents) collectToolbox(node.contents, types, names)
}

function paletteAt(level: LearningProfile['level']): { types: Set<string>; names: Set<string> } {
  const types = new Set<string>()
  const names = new Set<string>()
  collectToolbox(buildCoreToolbox([], { level }).contents, types, names)
  return { types, names }
}

describe('Auditoria Canvas 3D — inventário e progressão', () => {
  it('mantém os 71 blocos em um único grupo e no catálogo da aula', () => {
    expect(CANVAS3D_BLOCKS).toHaveLength(71)
    expect(CANVAS3D_BLOCK_TYPES.map(String).sort()).toEqual(
      CANVAS3D_BLOCKS.map((block) => block.type).sort(),
    )
    const grouped = CANVAS3D_GROUPS.flatMap((group) => group.types)
    const counts = new Map<string, number>()
    for (const type of grouped) counts.set(type, (counts.get(type) ?? 0) + 1)

    expect([...counts.entries()].filter(([, count]) => count !== 1)).toEqual([])
    expect(CANVAS3D_BLOCKS.map((block) => block.type).filter((type) => !counts.has(type))).toEqual(
      [],
    )
    const catalogTypes = BLOCK_CATALOG.filter((entry) => entry.category === 'Canvas 3D')
      .map((entry) => entry.type)
      .sort()
    expect(catalogTypes).toEqual(CANVAS3D_BLOCKS.map((block) => block.type).sort())
  })

  it('Canvas 3D INTEIRO é avancado-3d — facilitadores + técnicos juntos (26/07, "na unha")', () => {
    expect(CORE_CATEGORY_LEVELS['Canvas 3D']).toBe('avancado-3d')
    // No intermediário 3D a categoria Canvas 3D NÃO aparece mais (subiu inteira).
    expect(paletteAt('intermediario-3d').names.has('Canvas 3D')).toBe(false)
    const advanced = paletteAt('avancado-3d')
    expect(advanced.names.has('Canvas 3D')).toBe(true)
    for (const type of [
      'sz_t3d_scene_create',
      'sz_t3d_renderer_create',
      'sz_t3d_camera_create',
      'sz_t3d_light_create',
      'sz_t3d_primitive',
      'sz_t3d_terrain',
      'sz_t3d_city',
      'sz_t3d_renderer_responsive',
      'sz_t3d_physics_body',
      // As peças técnicas (import/carregar/montar) também ficam aqui, junto.
      'sz_t3d_import',
      'sz_t3d_new_var',
      'sz_t3d_load_model',
      'sz_t3d_load_sound',
      'sz_t3d_mount_renderer',
    ]) {
      expect(resolveBlockLevel(type), type).toBe('avancado-3d')
      expect(advanced.types.has(type), type).toBe(true)
    }
  })

  it('oferece o caminho manual Canvas → cena → renderizador → câmera → luz (no avançado)', () => {
    const intermediate = paletteAt('avancado-3d')
    expect(intermediate.types.has('sz_html_canvas')).toBe(true)

    const expected = [
      'sz_t3d_scene_create',
      'sz_t3d_renderer_create',
      'sz_t3d_camera_create',
      'sz_t3d_light_create',
    ]
    for (const type of expected) {
      expect(intermediate.types.has(type), type).toBe(true)
      expect(CANVAS3D_BLOCKS.find((block) => block.type === type)?.placement, type).toBe(
        'resource-creator',
      )
    }

    const renderer = CANVAS3D_BLOCKS.find((block) => block.type === 'sz_t3d_renderer_create')
    const canvasField = rows(renderer as MultilineBlockDefinition)
      .flatMap((args) => args ?? [])
      .find(
        (arg) => Boolean(arg) && typeof arg === 'object' && (arg as BlockArg).name === 'CANVAS',
      ) as { type?: string; kind?: string } | undefined
    expect(canvasField).toMatchObject({ type: 'field_name_picker', kind: 'canvas3d-canvas' })
  })

  it('usa o mesmo id de tela no caminho padrão', () => {
    const defaults = new Map<string, string>()
    for (const type of ['sz_t3d_renderer_create', 'sz_t3d_camera_create']) {
      const definition = CANVAS3D_BLOCKS.find((block) => block.type === type)
      const canvas = rows(definition as MultilineBlockDefinition)
        .flatMap((args) => args ?? [])
        .find(
          (arg) => Boolean(arg) && typeof arg === 'object' && (arg as BlockArg).name === 'CANVAS',
        ) as { text?: string } | undefined
      defaults.set(type, canvas?.text ?? '')
    }
    expect(defaults).toEqual(
      new Map([
        ['sz_t3d_renderer_create', 'tela'],
        ['sz_t3d_camera_create', 'tela'],
      ]),
    )
  })

  it('tipa os seletores pelos papéis de cada recurso 3D', () => {
    const expected = new Map<string, Readonly<Record<string, string>>>([
      ['sz_t3d_light_create', { SCENE: 'scene3d' }],
      ['sz_t3d_renderer_config', { R: 'renderer3d' }],
      [
        'sz_t3d_renderer_responsive',
        { R: 'renderer3d', CAMERA: 'perspective-camera3d', COMPOSER: 'composer3d' },
      ],
      ['sz_t3d_render', { SCENE: 'scene3d', CAMERA: 'camera3d', R: 'renderer3d' }],
      ['sz_t3d_load_model', { LOADER: 'model-loader3d' }],
      ['sz_t3d_load_sound', { LOADER: 'audio-loader3d' }],
      ['sz_t3d_water_wave', { WATER: 'water3d' }],
      ['sz_t3d_grass_wave', { GRASS: 'grass3d' }],
      ['sz_t3d_set_matrix_at', { MESH: 'instanced-mesh3d' }],
      ['sz_t3d_instances_dirty', { MESH: 'instanced-mesh3d' }],
      ['sz_t3d_set_color', { OBJ: 'color-target3d' }],
      ['sz_t3d_look_at', { OBJ: 'object3d' }],
      ['sz_t3d_lerp_position', { OBJ: 'object3d' }],
      ['sz_t3d_set_shadow', { OBJ: 'shadow-target3d' }],
      ['sz_t3d_physics_step', { WORLD: 'physics-world' }],
      ['sz_t3d_physics_static_object', { OBJECT: 'physics-collider3d' }],
      ['sz_t3d_physics_static_city', { CITY: 'physics-city3d' }],
      ['sz_t3d_road', { HEIGHT_FN: 'optional-function' }],
      ['sz_t3d_building', { HEIGHT_FN: 'optional-function' }],
    ])

    for (const [type, fields] of expected) {
      const definition = CANVAS3D_BLOCKS.find((block) => block.type === type)
      const args = rows(definition as MultilineBlockDefinition).flatMap((row) => row ?? [])
      for (const [name, kind] of Object.entries(fields)) {
        const field = args.find(
          (arg) => Boolean(arg) && typeof arg === 'object' && (arg as BlockArg).name === name,
        ) as { type?: string; kind?: string } | undefined
        expect(field, `${type}.${name}`).toMatchObject({ type: 'field_name_picker', kind })
      }
    }
  })

  it('classifica atualizações contínuas como comandos de loop', () => {
    for (const type of ['sz_t3d_water_wave', 'sz_t3d_grass_wave', 'sz_t3d_physics_step']) {
      expect(CANVAS3D_BLOCKS.find((block) => block.type === type)?.placement, type).toBe(
        'loop-command',
      )
    }
  })

  it('não oferece no seletor recursos incompatíveis com o preview', () => {
    const addonNames = COMMON_ADDONS.flatMap((group) => group.items.map((item) => item.name))
    const classNames = COMMON_CLASSES.flatMap((group) => group.items.map((item) => item.name))
    // DRACO/KTX2 exigem decoder WASM em worker (`worker-src 'none'`) → seguem fora do picker.
    for (const unavailable of ['DRACOLoader', 'KTX2Loader']) {
      expect(addonNames, unavailable).not.toContain(unavailable)
      expect(classNames, unavailable).not.toContain(unavailable)
    }
    // PointerLockControls PASSOU a rodar no preview (sandbox com `allow-pointer-lock`) → oferecido.
    expect(addonNames).toContain('PointerLockControls')
    expect(classNames).toContain('PointerLockControls')
  })

  it('não promete capacidades ausentes em classes técnicas', () => {
    expect(canvas3DSymbolKindsForClass('ShaderMaterial')).not.toContain('color-target3d')
    expect(canvas3DSymbolKindsForClass('LineMaterial')).toContain('color-target3d')
    expect(canvas3DSymbolKindsForClass('PerspectiveCamera')).toContain('perspective-camera3d')
    expect(canvas3DSymbolKindsForClass('OrthographicCamera')).not.toContain('perspective-camera3d')
  })
})

describe('Auditoria Canvas 3D — experiência infantil', () => {
  it('aplica o tom de cada subgrupo aos próprios blocos', () => {
    const shades = categoryShades(CATEGORY_COLORS.canvas3d, CANVAS3D_GROUPS.length)
    for (const [index, group] of CANVAS3D_GROUPS.entries()) {
      const shade = shades[index]
      if (!shade) throw new Error(`Tom ausente para o grupo ${group.name}`)
      expect(group.colour, group.name).toBe(shade)
      for (const type of group.types) {
        expect(CANVAS3D_BLOCKS.find((block) => block.type === type)?.colour, type).toBe(shade)
      }
    }
  })

  it('nenhum encaixe de valor nasce vazio', () => {
    const missing: string[] = []
    for (const definition of CANVAS3D_BLOCKS) {
      const sockets = socketInputsFor(definition.type) ?? {}
      for (const name of valueInputs(definition)) {
        if (!sockets[name]) missing.push(`${definition.type}.${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('explica ações sem repetir código ou jargão da biblioteca', () => {
    const forbidden =
      /three\.js|\bTHREE\b|EffectComposer|RenderPass|UnrealBloomPass|OutputPass|InstancedMesh|BufferGeometry|PointsMaterial|CanvasTexture|\bHDR\b|\bPBR\b|\bGPU\b|\bWASM\b|\bFPS\b|\bdt\b|procedural|renderizador|draw calls?|setPixelRatio|shadowMap|outputColorSpace|toneMapping|\bshader\b|\bVector3\b|\bnew\b|\bimport\b/i
    const exposed: string[] = []
    for (const definition of CANVAS3D_BLOCKS as MultilineBlockDefinition[]) {
      expect(definition.tooltip?.trim(), definition.type).toBeTruthy()
      expect(definition.tooltip?.length ?? 0, definition.type).toBeLessThanOrEqual(180)
      for (const text of [
        definition.message0,
        definition.message1,
        definition.message2,
        definition.message3,
        definition.message4,
        definition.message5,
        definition.tooltip,
      ]) {
        if (text && forbidden.test(text)) exposed.push(`${definition.type}: ${text}`)
      }
    }
    expect(exposed).toEqual([])
  })

  it('esconde o caminho técnico padrão da ferramenta sem perder o módulo gerado', () => {
    ensureBlocklyInitialized()
    const definition = CANVAS3D_BLOCKS.find((block) => block.type === 'sz_t3d_import_named')
    const moduleField = definition?.args1?.find(
      (arg) => Boolean(arg) && typeof arg === 'object' && (arg as BlockArg).name === 'MODULE',
    ) as { text?: string } | undefined
    expect(moduleField?.text).toBe('automático')

    const workspace = new Blockly.Workspace()
    try {
      const frame = workspace.newBlock('sz_frame_molds')
      const block = workspace.newBlock('sz_t3d_import_named')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      const blockConnection = block.previousConnection
      if (!frameConnection || !blockConnection) throw new Error('Conexões do import ausentes')
      frameConnection.connect(blockConnection)
      const statement = (buildIRFromWorkspace(workspace).behavior.molds ?? [])[0]
      expect(statement).toMatchObject({
        type: 'importNamed',
        names: ['GLTFLoader'],
        module: 'three/addons/loaders/GLTFLoader.js',
      })
    } finally {
      workspace.dispose()
    }
  })

  it('separa addons conhecidos pelo módulo canônico, mesmo quando a Ponte trouxe um caminho explícito errado', () => {
    ensureBlocklyInitialized()
    const workspace = new Blockly.Workspace()
    try {
      const frame = workspace.newBlock('sz_frame_molds')
      const block = workspace.newBlock('sz_t3d_import_named')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      if (!frameConnection || !block.previousConnection) {
        throw new Error('Conexões do import ausentes')
      }
      frameConnection.connect(block.previousConnection)
      block.setFieldValue('GLTFLoader, OrbitControls', 'NAMES')
      block.setFieldValue('automático', 'MODULE')

      const ir = buildIRFromWorkspace(workspace)
      expect(ir.behavior.molds ?? []).toMatchObject([
        {
          type: 'importNamed',
          names: ['GLTFLoader'],
          module: 'three/addons/loaders/GLTFLoader.js',
        },
        {
          type: 'importNamed',
          names: ['OrbitControls'],
          module: 'three/addons/controls/OrbitControls.js',
        },
      ])
      expect(generateJS({ behavior: ir.behavior })).not.toContain('automático')

      block.setFieldValue('three/addons/loaders/GLTFLoader.js', 'MODULE')
      const normalized = buildIRFromWorkspace(workspace)
      expect(normalized.behavior.molds ?? []).toMatchObject([
        {
          type: 'importNamed',
          names: ['GLTFLoader'],
          module: 'three/addons/loaders/GLTFLoader.js',
        },
        {
          type: 'importNamed',
          names: ['OrbitControls'],
          module: 'three/addons/controls/OrbitControls.js',
        },
      ])
    } finally {
      workspace.dispose()
    }
  })

  it('exige caminho explícito para addon livre que o modo automático não conhece', () => {
    ensureBlocklyInitialized()
    const workspace = new Blockly.Workspace()
    try {
      const frame = workspace.newBlock('sz_frame_molds')
      const block = workspace.newBlock('sz_t3d_import_named')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      if (!frameConnection || !block.previousConnection) {
        throw new Error('Conexões do import ausentes')
      }
      frameConnection.connect(block.previousConnection)
      block.setFieldValue('MeuControle', 'NAMES')
      block.setFieldValue('automático', 'MODULE')

      const unresolved = buildIRFromWorkspace(workspace)
      const invalid = SZIRInputSchema.safeParse(unresolved)
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues.some((issue) => issue.message.includes('caminho'))).toBe(true)
      }

      block.setFieldValue('', 'MODULE')
      expect(SZIRInputSchema.safeParse(buildIRFromWorkspace(workspace)).success).toBe(false)

      block.setFieldValue('three/addons/controls/MeuControle.js', 'MODULE')
      const manual = buildIRFromWorkspace(workspace)
      expect(SZIRInputSchema.safeParse(manual).success).toBe(true)
      expect(manual.behavior.molds ?? []).toMatchObject([
        {
          type: 'importNamed',
          names: ['MeuControle'],
          module: 'three/addons/controls/MeuControle.js',
        },
      ])
    } finally {
      workspace.dispose()
    }
  })

  it('recusa uma IR estruturada que liga addon conhecido ao arquivo errado', () => {
    const invalid = SZIRSchema.safeParse({
      html: [],
      css: [],
      js: [
        {
          type: 'importNamed',
          names: ['GLTFLoader', 'OrbitControls'],
          module: 'three/addons/loaders/GLTFLoader.js',
        },
      ],
      extensions: [],
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues.some((issue) => issue.message.includes('arquivo correto'))).toBe(
        true,
      )
    }
  })

  it('faz consumidores da física escolherem IDs declarados', () => {
    const expectedKinds = new Map<string, string>([
      ['sz_t3d_physics_move', 'physics-character'],
      ['sz_t3d_physics_jump', 'physics-character'],
      ['sz_t3d_physics_velocity', 'physics-body'],
      ['sz_t3d_physics_impulse', 'physics-body'],
      ['sz_t3d_physics_teleport', 'physics-body'],
      ['sz_t3d_physics_body_state', 'physics-body'],
      ['sz_t3d_physics_remove', 'physics-resource'],
    ])

    for (const [type, kind] of expectedKinds) {
      const definition = CANVAS3D_BLOCKS.find((block) => block.type === type)
      const id = rows(definition as MultilineBlockDefinition)
        .flatMap((args) => args ?? [])
        .find(
          (arg) => Boolean(arg) && typeof arg === 'object' && (arg as BlockArg).name === 'ID',
        ) as { type?: string; kind?: string } | undefined
      expect(id, type).toMatchObject({ type: 'field_name_picker', kind })
    }
  })

  it('preserva a opção plana de estrada e prédio na ida dos blocos para a IR', () => {
    ensureBlocklyInitialized()
    for (const type of ['sz_t3d_road', 'sz_t3d_building']) {
      const workspace = new Blockly.Workspace()
      try {
        const frame = workspace.newBlock('sz_frame_start')
        const resource = workspace.newBlock(type)
        const frameConnection = frame.getInput('CHILDREN')?.connection
        if (!frameConnection || !resource.previousConnection) {
          throw new Error(`Conexões ausentes em ${type}`)
        }
        frameConnection.connect(resource.previousConnection)

        const statement = (buildIRFromWorkspace(workspace).behavior.molds ?? [])[0]
        expect(statement, type).not.toHaveProperty('heightFunction')
      } finally {
        workspace.dispose()
      }
    }
  })
})
