export interface DependencyNode {
  id: string
  dependsOn: string[]
}
export function orderGraph<T extends DependencyNode>(nodes: T[]): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (byId.size !== nodes.length) throw new Error('Duplicate node identity')
  const seen = new Set<string>()
  const visiting = new Set<string>()
  const ordered: T[] = []
  function visit(node: T) {
    if (seen.has(node.id)) return
    if (visiting.has(node.id)) throw new Error(`Dependency cycle: ${node.id}`)
    visiting.add(node.id)
    if (new Set(node.dependsOn).size !== node.dependsOn.length)
      throw new Error('Duplicate dependency')
    for (const id of node.dependsOn) {
      const parent = byId.get(id)
      if (!parent) throw new Error(`Unknown dependency: ${id}`)
      visit(parent)
    }
    visiting.delete(node.id)
    seen.add(node.id)
    ordered.push(node)
  }
  for (const node of nodes) visit(node)
  return ordered
}
