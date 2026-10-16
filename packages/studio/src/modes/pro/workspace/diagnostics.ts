import type { ProjectTree, ProNode } from '../../../core/proProject'
import type { ProEditorDiagnostic } from '../../../monaco/pro/session'
import { studioTutorSourceHash } from '../../../studio/tutorSafety'

// Nodes are immutable in the store. Weak keys do not retain closed projects; the
// text check also protects callers that reuse a node while replacing its content.
const hashes = new WeakMap<ProNode, { content: string; hash: string }>()

export function currentProDiagnostics(items: ProEditorDiagnostic[], tree: ProjectTree) {
  const current = new Map<string, ProEditorDiagnostic>()
  for (const item of items) {
    const node = tree[item.path]
    if (node?.kind !== 'file') continue
    let cached = hashes.get(node)
    if (!cached || cached.content !== node.content) {
      cached = { content: node.content, hash: studioTutorSourceHash(node.content) }
      hashes.set(node, cached)
    }
    if (item.sourceHash !== cached.hash) continue
    current.set(`${item.path}:${item.line}:${item.column}:${item.code}:${item.message}`, item)
  }
  return [...current.values()]
}
