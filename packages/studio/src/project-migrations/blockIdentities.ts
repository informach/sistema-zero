import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import type { MigrationChange } from './types'

/** Cada nó inserido recebe identidade estável antes de chegar ao Blockly. */
export function assignMissingBlockIdentities(state: unknown, changes: MigrationChange[]): void {
  if (
    !isDocumentRecord(state) ||
    !isDocumentRecord(state.blocks) ||
    !Array.isArray(state.blocks.blocks)
  )
    return
  const nodes: Record<string, unknown>[] = []
  const pending: unknown[] = [...state.blocks.blocks].reverse()
  const used = new Set<string>()
  while (pending.length) {
    const node = pending.pop()
    if (!isDocumentRecord(node)) continue
    nodes.push(node)
    if (typeof node.id === 'string') used.add(node.id)
    if (isDocumentRecord(node.next)) pending.push(node.next.block)
    if (isDocumentRecord(node.inputs))
      for (const input of Object.values(node.inputs).reverse())
        if (isDocumentRecord(input)) pending.push(input.block, input.shadow)
  }
  let sequence = 0
  for (const node of nodes) {
    if (typeof node.id === 'string' && node.id) continue
    let id: string
    do {
      id = `sz-migrated-${++sequence}`
    } while (used.has(id))
    used.add(id)
    node.id = id
    changes.push({ rule: 'blockly.inserted-identity', path: `$.blocksState#${id}` })
  }
}

/** Sombras copiadas antigamente repetiam IDs; os IDs dos blocos do programa prevalecem. */
export function migrateShadowIdentities(state: unknown, changes: MigrationChange[]): void {
  if (
    !isDocumentRecord(state) ||
    !isDocumentRecord(state.blocks) ||
    !Array.isArray(state.blocks.blocks)
  )
    return
  type Entry = { node: unknown; shadow: boolean; path: string }
  const pending: Entry[] = state.blocks.blocks
    .map((node, index) => ({ node, shadow: false, path: `$.blocksState.blocks.blocks[${index}]` }))
    .reverse()
  const groups = new Map<
    string,
    Array<{ node: Record<string, unknown>; shadow: boolean; path: string }>
  >()
  while (pending.length) {
    const entry = pending.pop()!
    const { node, shadow, path } = entry
    if (!isDocumentRecord(node)) continue
    if (typeof node.id === 'string') {
      const group = groups.get(node.id) ?? []
      group.push({ node, shadow, path })
      groups.set(node.id, group)
    }
    if (isDocumentRecord(node.next))
      pending.push({ node: node.next.block, shadow, path: `${path}.next.block` })
    if (isDocumentRecord(node.inputs))
      for (const [key, input] of Object.entries(node.inputs).reverse()) {
        if (!isDocumentRecord(input)) continue
        pending.push(
          { node: input.block, shadow, path: `${path}.inputs.${key}.block` },
          { node: input.shadow, shadow: true, path: `${path}.inputs.${key}.shadow` },
        )
      }
  }
  const used = new Set(groups.keys())
  let serial = 0
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const active = group.filter((entry) => !entry.shadow)
    if (active.length > 1)
      throw new ProjectDocumentError(
        'migration-pending',
        'Dois blocos do programa têm o mesmo identificador; suas referências precisam de revisão.',
        active[1]!.path,
      )
    const retained = active[0] ?? group[0]
    for (const entry of group) {
      if (entry === retained) continue
      let id: string
      do {
        id = `sz-shadow-${++serial}`
      } while (used.has(id))
      used.add(id)
      entry.node.id = id
      changes.push({ rule: 'blockly.shadow-identity', path: `${entry.path}.id` })
    }
  }
}
