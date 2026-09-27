import type { BbmodelAppearance } from './bbmodelAppearance'
import type { BbmodelEnvelope } from './bbmodelEnvelope'
import type { BbmodelGeometrySource } from './bbmodelGeometryTypes'
import type { BbmodelGraph } from './bbmodelGraph'
import {
  BBMODEL_INPUT_LIMITS,
  BbmodelInputError,
  bbmodelIdentifier,
  bbmodelList,
  bbmodelRecord,
  requireBbmodel,
} from './bbmodelInput'
import type { BbmodelNodeMetadata } from './bbmodelNodeMetadata'
import type { BbmodelSelection } from './bbmodelSelection'
import { bbmodelKeyPath } from './bbmodelValues'

export interface BbmodelRemainderOptions {
  unmapped?: 'reject' | 'discard'
  /** Omission stays opaque; conversion delegates clip coverage to the animation pipeline. */
  animations?: 'reject' | 'omit' | 'convert'
  /** Defaults to omit only for the existing static-omission choice. Never executes controllers. */
  controllers?: 'reject' | 'omit'
}
export type BbmodelRemainderIssue =
  | { code: 'unmapped-field-discarded'; path: string }
  | { code: 'animations-omitted' | 'animation-controllers-omitted'; path: string; count: number }

export function readBbmodelRemainderOptions(value: BbmodelRemainderOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como tratar as informações ainda não convertidas.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'unmapped' || key === 'animations' || key === 'controllers',
      `options.${key}`,
      'Esta opção de informação adicional não é conhecida.',
    )
  const unmapped = value.unmapped === undefined ? 'reject' : value.unmapped,
    animations = value.animations === undefined ? 'reject' : value.animations,
    controllers =
      value.controllers === undefined
        ? animations === 'omit'
          ? 'omit'
          : 'reject'
        : value.controllers
  requireBbmodel(
    unmapped === 'reject' || unmapped === 'discard',
    'options.unmapped',
    'Escolha se deseja descartar os campos ainda não mapeados.',
  )
  requireBbmodel(
    animations === 'reject' || animations === 'omit' || animations === 'convert',
    'options.animations',
    'Escolha se deseja recusar, omitir ou adaptar os movimentos.',
  )
  requireBbmodel(
    controllers === 'reject' || controllers === 'omit',
    'options.controllers',
    'Escolha se deseja abrir uma cópia sem os controladores de animação.',
  )
  return { unmapped, animations, controllers }
}

const rootFields = new Set([
  'meta',
  'resolution',
  'elements',
  'groups',
  'outliner',
  'textures',
  'texture_groups',
  'animations',
  'animation_controllers',
])
const common = ['uuid', 'name', 'origin', 'rotation', 'visibility', 'export', 'locked', 'color']
const nodeFields = {
  group: new Set(common),
  cube: new Set([
    ...common,
    'type',
    'from',
    'to',
    'inflate',
    'stretch',
    'rescale',
    'mirror_uv',
    'uv_offset',
    'box_uv',
    'faces',
    'shade',
  ]),
  mesh: new Set([...common, 'type', 'vertices', 'faces', 'shading', 'render_order', 'seams']),
}
const faceFields = {
  cube: new Set(['uv', 'rotation', 'texture']),
  mesh: new Set(['vertices', 'uv', 'texture']),
}
const textureFields = new Set([
  'uuid',
  'name',
  'group',
  'width',
  'height',
  'uv_width',
  'uv_height',
  'path',
  'relative_path',
  'source',
  'internal',
  'visible',
  'use_as_default',
  'layers_enabled',
  'layers',
  'render_mode',
  'render_sides',
  'wrap_mode',
  'pbr_channel',
  'file_format',
  'fps',
  'frame_time',
  'frame_order_type',
  'frame_order',
  'frame_interpolate',
])
const groupFields = new Set(['uuid', 'name', 'is_material', 'material_config'])
const inlineGroupFields = new Set([...common, 'children'])
const outlinerFields = new Set(['uuid', 'children'])

export interface BbmodelRemainderContext {
  envelope: BbmodelEnvelope
  graph: BbmodelGraph
  metadata: readonly BbmodelNodeMetadata[]
  geometry: readonly BbmodelGeometrySource[]
  appearance: BbmodelAppearance
  selection: BbmodelSelection
  textureIndices: readonly number[]
}

/**
 * Coverage of remaining serialized fields, NOT an external source parser or general discard bypass.
 * Caller first reads ALL known source metadata/geometry/appearance and later applies every stage policy.
 * Only selected nodes/textures need field-level decisions; omitted subtrees/resources are reported separately.
 * Callback must append to a bounded report before proceeding. Unknown values are never traversed/copied.
 */
export function assessBbmodelRemainder(
  context: BbmodelRemainderContext,
  options: BbmodelRemainderOptions,
  onIssue: (issue: BbmodelRemainderIssue) => void,
): void {
  const { envelope, graph, metadata, geometry, appearance, selection, textureIndices } = context,
    policy = readBbmodelRemainderOptions(options),
    source = envelope.json
  if (metadata.length !== graph.nodes.length)
    throw new Error('Mismatched bbmodel remainder metadata')
  const inspect = (
    row: Readonly<Record<string, unknown>>,
    covered: ReadonlySet<string>,
    path: string,
  ) => {
    for (const key in row) {
      if (!Object.hasOwn(row, key) || covered.has(key)) continue
      bbmodelIdentifier(key, path || 'json')
      const at = path ? bbmodelKeyPath(path, key) : bbmodelKeyPath('json', key)
      if (policy.unmapped === 'reject')
        throw new BbmodelInputError(
          'unsupported',
          at,
          'Este campo ainda não é convertido. Escolha se deseja abrir uma cópia sem ele.',
        )
      onIssue({ code: 'unmapped-field-discarded', path: at })
    }
  }
  for (const [key, code] of [
    ['animations', 'animations-omitted'],
    ['animation_controllers', 'animation-controllers-omitted'],
  ] as const) {
    const rows = bbmodelList(source[key], key, BBMODEL_INPUT_LIMITS.jsonStructure)
    if (!rows.length) continue
    // This coverage stage never approves clip contents; the document converter must run
    // the strict clip pipeline before producing any candidate when conversion is selected.
    if (key === 'animations' && policy.animations === 'convert') continue
    if ((key === 'animations' ? policy.animations : policy.controllers) === 'reject')
      throw new BbmodelInputError(
        'unsupported',
        key,
        'Estas informações de movimento precisam de uma escolha de importação. Mantenha o arquivo original.',
      )
    onIssue({ code, path: key, count: rows.length })
  }
  inspect(source, rootFields, '')
  inspect(
    bbmodelRecord(source.meta, 'meta'),
    new Set(['format_version', 'model_format', 'box_uv']),
    'meta',
  )
  if (source.resolution !== undefined)
    inspect(
      bbmodelRecord(source.resolution, 'resolution'),
      new Set(['width', 'height']),
      'resolution',
    )
  const byGeometry = new Map(geometry.map((row) => [row.node, row]))
  for (const selected of selection.nodes) {
    const info = metadata[selected.node],
      entry = graph.nodes[selected.node]
    if (
      !info ||
      !entry ||
      info.kind === 'unresolved' ||
      info.kind !== selected.kind ||
      info.node !== selected.node ||
      info.sourcePath !== entry.source.path
    )
      throw new Error('Mismatched bbmodel remainder node')
    inspect(
      info.source,
      info.kind === 'group' && envelope.version !== '5.0'
        ? inlineGroupFields
        : nodeFields[info.kind],
      info.sourcePath,
    )
    if (entry.outliner?.data && entry.outliner.data !== entry.source.data)
      inspect(entry.outliner.data, outlinerFields, entry.outliner.path)
    if (info.kind === 'group') continue
    const shape = byGeometry.get(selected.node)
    if (!shape || shape.kind === 'unresolved' || shape.kind !== info.kind)
      throw new Error('Mismatched bbmodel remainder geometry')
    for (const face of shape.faces)
      inspect(
        face.source,
        faceFields[shape.kind],
        bbmodelKeyPath(`${shape.sourcePath}.faces`, 'direction' in face ? face.direction : face.id),
      )
  }
  const groups = new Set<number>()
  for (const index of textureIndices) {
    const texture = appearance.textures[index]
    if (!texture) throw new Error('Mismatched bbmodel remainder texture')
    inspect(texture.source, textureFields, `textures[${index}]`)
    if (texture.group !== null) groups.add(texture.group)
  }
  for (const index of groups) {
    const group = appearance.groups[index]
    if (!group) throw new Error('Mismatched bbmodel remainder texture group')
    inspect(group.source, groupFields, `texture_groups[${index}]`)
  }
}
