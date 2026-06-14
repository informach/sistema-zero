import type { ProjectTree } from '#core'

/**
 * Converte a `ProjectTree` path-keyed numa estrutura hierárquica para render,
 * com pastas antes de arquivos e ordem alfabética. Puro/testável. Sintetiza
 * pastas-pai ausentes (defesa — o sanitizer já garante consistência).
 */
export interface TreeViewNode {
  /** Caminho completo (chave na árvore). */
  path: string
  /** Último segmento (nome exibido). */
  name: string
  kind: 'file' | 'dir'
  /** Profundidade (0 = raiz) para indentação. */
  depth: number
  children: TreeViewNode[]
}

export function buildTreeView(tree: ProjectTree): TreeViewNode[] {
  const nodes = new Map<string, TreeViewNode>()

  const ensure = (path: string, kind: 'file' | 'dir'): TreeViewNode => {
    const existing = nodes.get(path)
    if (existing) return existing
    const segments = path.split('/')
    const node: TreeViewNode = {
      path,
      name: segments[segments.length - 1] ?? path,
      kind,
      depth: segments.length - 1,
      children: [],
    }
    nodes.set(path, node)
    return node
  }

  for (const [path, node] of Object.entries(tree)) {
    ensure(path, node.kind)
    const segments = path.split('/')
    for (let i = 1; i < segments.length; i++) ensure(segments.slice(0, i).join('/'), 'dir')
  }

  const roots: TreeViewNode[] = []
  for (const node of nodes.values()) {
    const slash = node.path.lastIndexOf('/')
    const parent = slash < 0 ? undefined : nodes.get(node.path.slice(0, slash))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortRec = (list: TreeViewNode[]): void => {
    list.sort((a, b) =>
      a.kind !== b.kind ? (a.kind === 'dir' ? -1 : 1) : a.name.localeCompare(b.name),
    )
    for (const child of list) sortRec(child.children)
  }
  sortRec(roots)
  return roots
}
