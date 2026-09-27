import type { BbmodelEnvelope } from './bbmodelEnvelope'
import type { BbmodelGraph } from './bbmodelGraph'
import {
  BBMODEL_INPUT_LIMITS,
  BbmodelInputError,
  bbmodelIdentifier,
  requireBbmodel,
} from './bbmodelInput'
import { type BbmodelNodeProperties, readBbmodelNodeProperties } from './bbmodelNodeProperties'
import { bbmodelBoolean } from './bbmodelValues'

export type BbmodelNodeMetadata =
  | (BbmodelNodeProperties & {
      kind: 'group' | 'cube' | 'mesh'
      node: number
      name: string | null
      locked: boolean
      /** Remaining semantics stay inert and must be reviewed separately. */
      source: Readonly<Record<string, unknown>>
    })
  | {
      kind: 'unresolved'
      node: number
      sourcePath: string
      type: string | null
      source: Readonly<Record<string, unknown>>
    }

function name(value: unknown, path: string): string | null {
  if (value === undefined) return null
  requireBbmodel(typeof value === 'string', path, 'O nome precisa ser texto.')
  if (value.length > BBMODEL_INPUT_LIMITS.identifierChars)
    throw new BbmodelInputError('budget', path, 'O nome desta peça é longo demais para abrir.')
  return value
}

/**
 * Source metadata of EVERY known free-format node, independent of native selection/limits.
 * Unknown element schemas remain explicit; this is not full geometry/material/animation validation.
 */
export function readBbmodelNodeMetadata(
  envelope: BbmodelEnvelope,
  graph: BbmodelGraph,
): BbmodelNodeMetadata[] {
  if (envelope.modelFormat !== 'free')
    throw new BbmodelInputError(
      'unsupported',
      'meta.model_format',
      'Esta leitura de grupos precisa do formato genérico do Blockbench.',
    )
  return graph.nodes.map((entry, node): BbmodelNodeMetadata => {
    const { data: source, path } = entry.source
    const type =
      entry.kind === 'group'
        ? 'group'
        : source.type === undefined
          ? null
          : bbmodelIdentifier(source.type, `${path}.type`)
    const kind = entry.kind === 'group' ? 'group' : type === 'cube' || type === 'mesh' ? type : null
    if (kind === null) return { kind: 'unresolved', node, sourcePath: path, type, source }
    return {
      kind,
      node,
      ...readBbmodelNodeProperties(source, path),
      name: name(source.name, `${path}.name`),
      locked: bbmodelBoolean(source.locked, `${path}.locked`, false),
      source,
    }
  })
}
