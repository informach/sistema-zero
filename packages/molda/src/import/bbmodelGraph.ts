import type { BbmodelEnvelope } from './bbmodelEnvelope'
import {
  BBMODEL_INPUT_LIMITS,
  BbmodelInputError,
  bbmodelRecord,
  bbmodelIdentifier as identifier,
  bbmodelList as list,
  requireBbmodel,
} from './bbmodelInput'

export interface BbmodelGraphNode {
  uuid: string
  kind: 'element' | 'group'
  /** References to the envelope's owned JSON, read-only by contract. No deep copies per node. */
  source: { path: string; data: Readonly<Record<string, unknown>> }
  /** null for a node absent from the outliner; string entries have no object data. */
  outliner: { path: string; data: Readonly<Record<string, unknown>> | null } | null
  parent: number | null
  children: number[]
}

export interface BbmodelGraph {
  nodes: BbmodelGraphNode[]
  byUuid: ReadonlyMap<string, number>
  /** Authored roots only. Unlisted definitions are NOT silently appended here. */
  roots: number[]
  /** Unlisted groups, then unlisted elements, in declaration order within each category. */
  unlisted: number[]
  /** Breadth-first order of the authored forest only. */
  order: number[]
}

interface Frame {
  values: readonly unknown[]
  cursor: number
  parent: number | null
  path: string
}

/** Connectivity only: no transforms, geometry, element-type semantics, resources or native adoption. */
export function readBbmodelGraph(envelope: BbmodelEnvelope): BbmodelGraph {
  const source = envelope.json
  const elements = list(source.elements, 'elements', BBMODEL_INPUT_LIMITS.nodes)
  const groups = list(source.groups, 'groups', BBMODEL_INPUT_LIMITS.nodes)
  if (elements.length + groups.length > BBMODEL_INPUT_LIMITS.nodes)
    throw new BbmodelInputError('budget', 'nodes', 'Há peças e grupos demais neste arquivo.')
  if (envelope.version !== '5.0' && groups.length > 0)
    throw new BbmodelInputError(
      'unsupported',
      'groups',
      'Este arquivo mistura uma versão antiga com grupos separados. A organização precisa ser revisada.',
    )
  const rootsInput = list(source.outliner, 'outliner', BBMODEL_INPUT_LIMITS.outlinerEntries)
  const nodes: BbmodelGraphNode[] = []
  const byUuid = new Map<string, number>()
  const groupIndices: number[] = [],
    elementIndices: number[] = [],
    roots: number[] = []
  let references = rootsInput.length

  const add = (value: unknown, path: string, kind: BbmodelGraphNode['kind']): number => {
    if (nodes.length === BBMODEL_INPUT_LIMITS.nodes)
      throw new BbmodelInputError('budget', 'nodes', 'Há peças e grupos demais neste arquivo.')
    const data = bbmodelRecord(value, path)
    const uuid = identifier(data.uuid, `${path}.uuid`)
    requireBbmodel(
      !byUuid.has(uuid),
      `${path}.uuid`,
      'Duas peças ou grupos têm o mesmo identificador.',
    )
    const index = nodes.length
    byUuid.set(uuid, index)
    nodes.push({ uuid, kind, source: { path, data }, outliner: null, parent: null, children: [] })
    if (kind === 'group') groupIndices.push(index)
    else elementIndices.push(index)
    return index
  }
  for (let i = 0; i < elements.length; i++) add(elements[i], `elements[${i}]`, 'element')
  for (let i = 0; i < groups.length; i++) add(groups[i], `groups[${i}]`, 'group')

  const stack: Frame[] = [{ values: rootsInput, cursor: 0, parent: null, path: 'outliner' }]
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!
    if (frame.cursor === frame.values.length) {
      stack.pop()
      continue
    }
    const path = `${frame.path}[${frame.cursor}]`
    const value = frame.values[frame.cursor++]
    const data = typeof value === 'string' ? null : bbmodelRecord(value, path)
    let index: number | undefined
    if (data !== null && envelope.version !== '5.0') {
      index = add(data, path, 'group')
    } else {
      const uuid = identifier(
        data === null ? value : data.uuid,
        data === null ? path : `${path}.uuid`,
      )
      index = byUuid.get(uuid)
      requireBbmodel(
        index !== undefined,
        path,
        'A organização aponta para uma peça ou grupo que não existe.',
      )
    }
    const node = nodes[index]!
    requireBbmodel(
      node.outliner === null,
      path,
      'Uma peça ou grupo não pode aparecer duas vezes, ter dois pais ou formar um ciclo.',
    )
    node.outliner = { path, data }
    node.parent = frame.parent
    if (frame.parent === null) roots.push(index)
    else nodes[frame.parent]!.children.push(index)
    if (data === null) continue
    if (data.content !== undefined)
      throw new BbmodelInputError(
        'unsupported',
        `${path}.content`,
        'Esta organização usa uma lista antiga de conteúdo que ainda não é suportada.',
      )
    const children = list(data.children, `${path}.children`, BBMODEL_INPUT_LIMITS.outlinerEntries)
    references += children.length
    if (references > BBMODEL_INPUT_LIMITS.outlinerEntries)
      throw new BbmodelInputError(
        'budget',
        'outliner',
        'Há referências demais na organização deste arquivo.',
      )
    if (children.length > 0) {
      if (stack.length === BBMODEL_INPUT_LIMITS.outlinerDepth)
        throw new BbmodelInputError(
          'budget',
          'outliner',
          'A organização tem grupos aninhados demais.',
        )
      stack.push({ values: children, cursor: 0, parent: index, path: `${path}.children` })
    }
  }
  const unlisted: number[] = []
  for (const indices of [groupIndices, elementIndices])
    for (const index of indices) if (nodes[index]!.outliner === null) unlisted.push(index)
  const order = [...roots]
  for (let cursor = 0; cursor < order.length; cursor++)
    for (const child of nodes[order[cursor]!]!.children) order.push(child)
  return { nodes, byUuid, roots, unlisted, order }
}
