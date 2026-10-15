import type { ProjectTree, ProNode } from '#core'

export function sameProNode(a: ProNode | undefined, b: ProNode | undefined): boolean {
  return (
    a?.kind === b?.kind && (a?.kind !== 'file' || (b?.kind === 'file' && a.content === b.content))
  )
}

function changedBranches(base: ProjectTree, current: ProjectTree): Set<string> {
  const changed = new Set<string>()
  for (const path of new Set([...Object.keys(base), ...Object.keys(current)])) {
    if (sameProNode(base[path], current[path])) continue
    const parts = path.split('/')
    while (parts.length) {
      changed.add(parts.join('/'))
      parts.pop()
    }
  }
  return changed
}

export interface ProTreeReconciliation {
  tree: ProjectTree
  conflicts: string[]
  recoveryDirectory: string | null
}

/** Three-way merge. Conflict copies are ordinary persisted files, never an ephemeral buffer. */
export function reconcileProTree(
  base: ProjectTree,
  editor: ProjectTree,
  disk: ProjectTree,
): ProTreeReconciliation {
  const editorChanges = changedBranches(base, editor)
  const diskChanges = changedBranches(base, disk)
  const paths = new Set([...Object.keys(base), ...Object.keys(editor), ...Object.keys(disk)])
  const children = new Map<string, Set<string>>()
  for (const path of paths) {
    const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    if (!children.has(parent)) children.set(parent, new Set())
    children.get(parent)?.add(path)
  }
  const tree: ProjectTree = {}
  const conflicts: string[] = []
  let recoveryDirectory: string | null = null
  const copyBranch = (source: ProjectTree, path: string, prefix = '') => {
    for (const [key, node] of Object.entries(source)) {
      if (key === path || key.startsWith(`${path}/`)) tree[`${prefix}${key}`] = node
    }
  }
  const visit = (path: string) => {
    if (!diskChanges.has(path)) {
      copyBranch(editor, path)
      return
    }
    if (!editorChanges.has(path)) {
      copyBranch(disk, path)
      return
    }
    const ours = editor[path]
    const theirs = disk[path]
    if (ours?.kind === 'dir' && theirs?.kind === 'dir') {
      tree[path] = ours
      for (const child of children.get(path) ?? []) visit(child)
      return
    }
    if (sameProNode(ours, theirs)) {
      if (ours) tree[path] = ours
      return
    }
    conflicts.push(path)
    copyBranch(editor, path)
    if (!recoveryDirectory) {
      let index = 1
      const roots = new Set([...paths].map((key) => key.split('/')[0]?.toLowerCase()))
      while (roots.has(`studio-terminal-conflict-${index}`)) index++
      recoveryDirectory = `studio-terminal-conflict-${index}`
      tree[recoveryDirectory] = { kind: 'dir' }
      tree[`${recoveryDirectory}/files`] = { kind: 'dir' }
    }
    copyBranch(disk, path, `${recoveryDirectory}/files/`)
  }
  for (const root of children.get('') ?? []) visit(root)
  if (recoveryDirectory) {
    tree[`${recoveryDirectory}/README.md`] = {
      kind: 'file',
      content: `# Edições simultâneas\n\nO editor e o terminal mudaram os mesmos caminhos. A versão do editor foi mantida no projeto; a versão do terminal está em files/. Um caminho ausente em files/ foi excluído no terminal. Compare as versões antes de remover esta pasta.\n\n${conflicts.map((path) => `- ${path}`).join('\n')}\n`,
    }
    // Conflict branches can begin below a directory not copied from disk.
    for (const path of Object.keys(tree)) {
      const parts = path.split('/')
      parts.pop()
      while (parts.length) {
        const parent = parts.join('/')
        tree[parent] ??= { kind: 'dir' }
        parts.pop()
      }
    }
  }
  return { tree, conflicts, recoveryDirectory }
}
