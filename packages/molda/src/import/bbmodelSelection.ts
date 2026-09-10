import { SCENE_LIMITS } from '../scene/limits'
import type { BbmodelEnvelope } from './bbmodelEnvelope'
import type { BbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError, bbmodelIdentifier, requireBbmodel } from './bbmodelInput'

export interface BbmodelSelectionOptions {
  unlisted?: 'reject' | 'append' | 'omit'
  unsupportedNodes?: 'reject' | 'omit-subtree'
}
export type BbmodelSelectionIssue =
  | { code: 'unlisted-nodes-appended' | 'unlisted-nodes-omitted'; path: 'outliner'; count: number }
  | {
      code: 'unsupported-subtree-omitted'
      node: number
      type: string | null
      reason: 'element-type' | 'element-children'
      path: string
      /** Includes the unsupported root and all descendants, regardless of their types. */
      count: number
    }
export interface BbmodelSelection {
  /** Original graph indices. Order/parentage are never derived from display names. */
  roots: number[]
  /** Breadth-first, parents before children; preserved authored root/sibling order. */
  nodes: Array<{ node: number; parent: number | null; kind: 'group' | 'cube' | 'mesh' }>
  /** Original graph indices with one planned geometry each, including hidden/non-exporting nodes. */
  geometries: number[]
  issues: BbmodelSelectionIssue[]
}

export function readBbmodelSelectionOptions(value: BbmodelSelectionOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha opções para organizar o modelo.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'unlisted' || key === 'unsupportedNodes',
      `options.${key}`,
      'Esta opção de organização não é conhecida.',
    )
  const unlisted = value.unlisted === undefined ? 'reject' : value.unlisted
  const unsupportedNodes = value.unsupportedNodes === undefined ? 'reject' : value.unsupportedNodes
  requireBbmodel(
    unlisted === 'reject' || unlisted === 'append' || unlisted === 'omit',
    'options.unlisted',
    'Escolha como tratar as peças que não estão na organização.',
  )
  requireBbmodel(
    unsupportedNodes === 'reject' || unsupportedNodes === 'omit-subtree',
    'options.unsupportedNodes',
    'Escolha como tratar os tipos de peça ainda não suportados.',
  )
  return { unlisted, unsupportedNodes }
}

function subtreeSize(graph: BbmodelGraph, root: number): number {
  const pending = [root]
  let size = 0
  while (pending.length > 0) {
    const node = pending.pop()!
    size++
    for (const child of graph.nodes[node]!.children) pending.push(child)
  }
  return size
}

/**
 * Structural plan from the matching, immutable envelope/validated forest only.
 * No coordinates, UV, textures or animation reads; no native document or consent.
 * This limits subsequent conversion work, not the full source readers' validation duties.
 */
export function planBbmodelSelection(
  envelope: BbmodelEnvelope,
  graph: BbmodelGraph,
  options: BbmodelSelectionOptions = {},
): BbmodelSelection {
  const policy = readBbmodelSelectionOptions(options)
  if (envelope.modelFormat !== 'free')
    throw new BbmodelInputError(
      'unsupported',
      'meta.model_format',
      'Esta conversão precisa de um modelo no formato genérico do Blockbench.',
    )
  if (graph.unlisted.length > 0 && policy.unlisted === 'reject')
    throw new BbmodelInputError(
      'unsupported',
      'outliner',
      'Há peças fora da organização. Escolha se quer adicioná-las como raízes ou omiti-las.',
    )
  const issues: BbmodelSelectionIssue[] = []
  if (graph.unlisted.length > 0)
    issues.push({
      code: policy.unlisted === 'append' ? 'unlisted-nodes-appended' : 'unlisted-nodes-omitted',
      path: 'outliner',
      count: graph.unlisted.length,
    })
  const queue = [...graph.roots]
  if (policy.unlisted === 'append') for (const node of graph.unlisted) queue.push(node)
  const roots: number[] = []
  const nodes: BbmodelSelection['nodes'] = []
  const geometries: number[] = []
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor]!
    const entry = graph.nodes[node]!
    const type =
      entry.kind === 'group'
        ? 'group'
        : entry.source.data.type === undefined
          ? null
          : bbmodelIdentifier(entry.source.data.type, `${entry.source.path}.type`)
    const kind = entry.kind === 'group' ? 'group' : type === 'cube' || type === 'mesh' ? type : null
    const reason =
      kind === null
        ? 'element-type'
        : kind !== 'group' && entry.children.length > 0
          ? 'element-children'
          : null
    if (reason !== null) {
      const path =
        reason === 'element-type' ? `${entry.source.path}.type` : `${entry.outliner!.path}.children`
      if (policy.unsupportedNodes === 'reject')
        throw new BbmodelInputError(
          'unsupported',
          path,
          reason === 'element-type'
            ? 'Este tipo de peça ainda não pode ser convertido. Você pode omitir sua subárvore na revisão.'
            : 'Uma malha ou cubo com filhos precisa de uma organização ainda não suportada.',
        )
      issues.push({
        code: 'unsupported-subtree-omitted',
        node,
        type,
        reason,
        path,
        count: subtreeSize(graph, node),
      })
      continue
    }
    // kind is supported here; do not reinterpret an unsupported element as a group.
    if (kind === null) throw new Error('Unsupported bbmodel kind escaped selection')
    if (nodes.length === SCENE_LIMITS.nodes)
      throw new BbmodelInputError(
        'budget',
        'nodes',
        'Há peças e grupos demais para editar no Molda.',
      )
    if (kind !== 'group') {
      if (geometries.length === Math.min(SCENE_LIMITS.geometries, SCENE_LIMITS.renderedParts))
        throw new BbmodelInputError(
          'budget',
          'geometries',
          'Há partes demais para editar no Molda.',
        )
      geometries.push(node)
    }
    nodes.push({ node, parent: entry.parent, kind })
    if (entry.parent === null) roots.push(node)
    for (const child of entry.children) queue.push(child)
  }
  return { roots, nodes, geometries, issues }
}
