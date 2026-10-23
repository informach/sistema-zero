import type { StudioProAssistanceRequest } from './pro-assistance'
import type { StudioProChange } from './pro-revision'

/** Line scope preserves the exact prefix/suffix, including line endings. No regex rewrite or fuzzy diff. */
export function studioProChangeScopeIssue(
  request: StudioProAssistanceRequest | undefined,
  beforeFiles: Record<string, string | null>,
  change: StudioProChange,
): string | null {
  if (request?.scope !== 'selection') return null
  const selection = request.selection
  const outside =
    'A proposta muda algo fora das linhas escolhidas. Faça um novo pedido com o tamanho Parte ou Jogo e revise a nova proposta.'
  if (change.configuration) return outside
  if (!selection) return 'O pedido não tem um trecho válido.'
  const original = beforeFiles[selection.path]
  if (typeof original !== 'string') return 'O arquivo do trecho não está na revisão escolhida.'
  const starts = [0]
  for (const match of original.matchAll(/\r\n|\r|\n/g)) starts.push(match.index + match[0].length)
  if (
    !Number.isSafeInteger(selection.startLine) ||
    !Number.isSafeInteger(selection.endLine) ||
    selection.startLine < 1 ||
    selection.endLine < selection.startLine ||
    selection.endLine > starts.length
  )
    return 'As linhas escolhidas não correspondem ao arquivo.'
  const start = starts[selection.startLine - 1]!
  const end = starts[selection.endLine] ?? original.length
  const prefix = original.slice(0, start),
    suffix = original.slice(end)
  if (
    change.directories &&
    JSON.stringify([...change.directories.before].sort()) !==
      JSON.stringify([...change.directories.after].sort())
  )
    return outside
  for (const patch of change.patches) {
    if (patch.path !== selection.path || patch.before === null || patch.content === null)
      return outside
    if (
      patch.content.length < prefix.length + suffix.length ||
      !patch.content.startsWith(prefix) ||
      !patch.content.endsWith(suffix)
    )
      return outside
    // The untouched suffix must still begin at a line boundary.
    const edited = patch.content.slice(prefix.length, patch.content.length - suffix.length)
    if (suffix && edited && !/[\r\n]$/.test(edited)) return outside
  }
  return null
}
