import { type DefaultTreeAdapterMap, parse } from 'parse5'
import { ProjectDocumentError } from '../core/projectDocument'
import { migrateGameTwoDJavaScript } from './javascript'
import type { MigrationChange } from './types'

/** Somente intervalos de código mudam: não serializa novamente o HTML autoral. */
export function migrateGameTwoDHTML(
  source: string,
  changes: MigrationChange[],
  path: string,
): string {
  if (!source.includes('SZGame2D') && !source.includes('SZGameKit')) return source
  if (source.length > 4_000_000)
    throw new ProjectDocumentError(
      'migration-pending',
      'Este HTML excede o limite de análise do conversor.',
      path,
    )
  const document = parse(source, { sourceCodeLocationInfo: true })
  const pending: DefaultTreeAdapterMap['node'][] = [document]
  const edits: Array<{ start: number; end: number; text: string }> = []
  while (pending.length) {
    const node = pending.pop()!
    if ('childNodes' in node) pending.push(...node.childNodes)
    if ('content' in node) pending.push(node.content)
    if (!('tagName' in node)) continue
    const location = node.sourceCodeLocation
    if (node.tagName === 'script') {
      const type =
        node.attrs
          .find((attr) => attr.name === 'type')
          ?.value.trim()
          .toLowerCase() ?? ''
      if (
        node.attrs.some((attr) => attr.name === 'src') ||
        ![
          '',
          'module',
          'text/javascript',
          'application/javascript',
          'text/ecmascript',
          'application/ecmascript',
          'application/x-javascript',
          'text/jscript',
          'text/livescript',
        ].includes(type)
      )
        continue
      if (location?.startTag) {
        const start = location.startTag.endOffset
        const end = location.endTag?.startOffset ?? location.endOffset
        const original = source.slice(start, end)
        const text = migrateGameTwoDJavaScript(original, changes, `${path}:script:${start}`)
        if (text !== original) edits.push({ start, end, text })
      }
    }
    for (const attr of node.attrs) {
      if (!attr.value.includes('SZGame2D') && !attr.value.includes('SZGameKit')) continue
      if (attr.value.trim().toLowerCase().startsWith('javascript:'))
        throw new ProjectDocumentError(
          'migration-pending',
          'Um endereço com código precisa de revisão antes da conversão.',
          path,
        )
      if (!attr.name.startsWith('on')) continue
      const converted = migrateGameTwoDJavaScript(attr.value, changes, `${path}:${attr.name}`)
      if (converted === attr.value) continue
      const range = location?.attrs?.[attr.name]
      if (!range)
        throw new ProjectDocumentError(
          'migration-pending',
          'O evento HTML não tem posição identificável.',
          path,
        )
      const escaped = converted
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
      edits.push({
        start: range.startOffset,
        end: range.endOffset,
        text: `${attr.name}="${escaped}"`,
      })
    }
  }
  let result = source
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
  return result
}
