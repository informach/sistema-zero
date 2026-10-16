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

export function proSourcePosition(source: string, offset: number) {
  const lines = source.slice(0, offset).split(/\r\n|\r|\n/)
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

/** Literal, bounded search over editable source files, including closed tabs. */
export function searchProFiles(
  tree: ProjectTree,
  query: string,
  mode: 'files' | 'content',
  limit = 100,
): ProSearchResults {
  const needle = query.trim().slice(0, 160)
  if (!needle) return { items: [], truncated: false }
  // Escape literals and match the original text: lowercasing can change UTF-16 offsets (e.g. İ).
  const match = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu')
  const items: ProSearchResult[] = []
  const max = Math.max(1, Math.min(500, limit))
  for (const path of Object.keys(tree).sort()) {
    const node = tree[path]
    if (node?.kind !== 'file' || path.split('/').includes('node_modules')) continue
    if (mode === 'files') {
      if (match.test(path)) items.push({ path, line: 1, column: 1, text: path })
    } else {
      // Most files do not match. Avoid allocating a line array for every keystroke.
      if (!match.test(node.content)) continue
      const endings = /\r\n|\r|\n/g
      let startOfLine = 0
      let lineNumber = 1
      while (startOfLine <= node.content.length) {
        const ending = endings.exec(node.content)
        const line = node.content.slice(startOfLine, ending?.index ?? node.content.length)
        const column = line.search(match)
        if (column >= 0) {
          const start = Math.max(0, column - 55)
          items.push({
            path,
            line: lineNumber,
            column: column + 1,
            text: `${start ? '…' : ''}${line.slice(start, start + 180)}`,
          })
          if (items.length > max) break
        }
        if (!ending) break
        startOfLine = ending.index + ending[0].length
        lineNumber++
      }
    }
    if (items.length > max) return { items: items.slice(0, max), truncated: true }
  }
  return { items, truncated: false }
}
