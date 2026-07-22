import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { LearningProfile } from '#core'
import { CORE_CATEGORY_LEVELS } from '#core'
import { CANVAS3D_BLOCK_TYPES } from '../../three/canvas3dContract'
import { BLOCK_CATALOG } from '../blockCatalog'
import { resolveBlockLevel } from '../blockLevels'
import { CANVAS3D_BLOCKS, CANVAS3D_GROUPS } from '../blocks/canvas3d'
import type { BlockDefinition } from '../blocks/types'
import { socketInputsFor } from '../blocks/valueSockets'
import { buildIRFromWorkspace } from '../buildIR'
import { categoryShades } from '../colorShades'
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
  it('mantém os 67 blocos em um único grupo e no catálogo da aula', () => {
    expect(CANVAS3D_BLOCKS).toHaveLength(67)
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

  it('mostra os facilitadores no intermediário 3D e guarda as peças técnicas para o avançado', () => {
    expect(CORE_CATEGORY_LEVELS['Canvas 3D']).toBe('intermediario-3d')
    const intermediate = paletteAt('intermediario-3d')
    expect(intermediate.names.has('Canvas 3D')).toBe(true)
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
    ]) {
      expect(resolveBlockLevel(type), type).toBe('intermediario-3d')
      expect(intermediate.types.has(type), type).toBe(true)
    }
    expect(intermediate.types.has('sz_t3d_import')).toBe(false)
    expect(intermediate.types.has('sz_t3d_new_var')).toBe(false)
    expect(paletteAt('avancado-2d').names.has('Canvas 3D')).toBe(true)
  })

  it('oferece o caminho manual Canvas → cena → renderizador → câmera → luz', () => {
    const intermediate = paletteAt('intermediario-3d')
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
    expect(canvasField).toMatchObject({ type: 'field_name_picker', kind: 'canvas' })
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

  it('distribui blocos densos em linhas curtas para o celular', () => {
    for (const definition of CANVAS3D_BLOCKS as MultilineBlockDefinition[]) {
      for (const [index, args] of rows(definition).entries()) {
        expect(args?.length ?? 0, `${definition.type}.args${index}`).toBeLessThanOrEqual(4)
      }
    }
    expect(
      (CANVAS3D_BLOCKS.find((block) => block.type === 'sz_t3d_city') as MultilineBlockDefinition)
        ?.message3,
    ).toBeTruthy()
    expect(
      (
        CANVAS3D_BLOCKS.find(
          (block) => block.type === 'sz_t3d_physics_raycast',
        ) as MultilineBlockDefinition
      )?.message2,
    ).toBeTruthy()
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
      const frame = workspace.newBlock('sz_frame_start')
      const block = workspace.newBlock('sz_t3d_import_named')
      const frameConnection = frame.getInput('CHILDREN')?.connection
      const blockConnection = block.previousConnection
      if (!frameConnection || !blockConnection) throw new Error('Conexões do import ausentes')
      frameConnection.connect(blockConnection)
      const statement = buildIRFromWorkspace(workspace).behavior.start[0]
      expect(statement).toMatchObject({
        type: 'importNamed',
        names: ['GLTFLoader'],
        module: 'three/addons/loaders/GLTFLoader.js',
      })
    } finally {
      workspace.dispose()
    }
  })

  it('faz consumidores da física escolherem IDs declarados', () => {
    const expectedKinds = new Map<string, string>([
      ['sz_t3d_physics_move', 'physics-body'],
      ['sz_t3d_physics_jump', 'physics-body'],
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
})
