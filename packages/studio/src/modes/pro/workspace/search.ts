import type { ProjectTree } from '../../../core/proProject'

export interface ProSearchResult {
  path: string
  line: number
  column: number
  text: string
}
export interface ProSearchResults {
  items: ProSearchResult[]
  truncated: boolean
}

/** Literal, bounded search over editable source files, including closed tabs. */
export function searchProFiles(
  tree: ProjectTree,
  query: string,
  mode: 'files' | 'content',
  limit = 100,
): ProSearchResults {
  const needle = query.trim().slice(0, 160).toLocaleLowerCase()
  if (!needle) return { items: [], truncated: false }
  const items: ProSearchResult[] = []
  const max = Math.max(1, Math.min(500, limit))
  for (const path of Object.keys(tree).sort()) {
    const node = tree[path]
    if (node?.kind !== 'file' || path.split('/').includes('node_modules')) continue
    if (mode === 'files') {
      if (path.toLocaleLowerCase().includes(needle))
        items.push({ path, line: 1, column: 1, text: path })
    } else {
      const lines = node.content.split('\n')
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? ''
        const column = line.toLocaleLowerCase().indexOf(needle)
        if (column < 0) continue
        const start = Math.max(0, column - 55)
        items.push({
          path,
          line: index + 1,
          column: column + 1,
          text: `${start ? '…' : ''}${line.slice(start, start + 180)}`,
        })
        if (items.length > max) break
      }
    }
    if (items.length > max) return { items: items.slice(0, max), truncated: true }
  }
  return { items, truncated: false }
}
