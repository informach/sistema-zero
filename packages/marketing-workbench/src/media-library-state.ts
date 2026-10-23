import { type AssetLibraryPage, assetStatusSchema } from '@sistemazero/marketing-contracts'
import type { WorkbenchPort } from './port'

type Entry = AssetLibraryPage['items'][number]

/** Merge by identity without discarding loaded pages or their continuation cursor. */
export function mergeMediaEntries(page: AssetLibraryPage, updates: Entry[]): AssetLibraryPage {
  const next = new Map(updates.map((item) => [item.manifest.id, item]))
  const existing = new Set(page.items.map((item) => item.manifest.id))
  return {
    ...page,
    items: [
      ...updates.filter((item) => !existing.has(item.manifest.id)),
      ...page.items.map((item) => next.get(item.manifest.id) ?? item),
    ],
  }
}

export const pendingMedia = (page: AssetLibraryPage) =>
  page.items.filter((item) => ['preparing', 'uploading', 'verifying'].includes(item.state))

/** One bounded lookup per 100 known pending assets; no multipart/storage calls. */
export async function pollMediaLibrary(
  request: WorkbenchPort['request'],
  projectId: string,
  page: AssetLibraryPage,
) {
  const pending = pendingMedia(page),
    updates: Entry[] = []
  for (let start = 0; start < pending.length; start += 100) {
    const ids = pending.slice(start, start + 100).map((item) => item.manifest.id)
    const result = assetStatusSchema.parse(
      await request(`/projects/${projectId}/assets/status`, 'POST', { ids }),
    )
    if (
      result.projectId !== projectId ||
      result.items.some(
        (item) => item.manifest.projectId !== projectId || !ids.includes(item.manifest.id),
      )
    )
      throw new Error('A confirmação dos arquivos pertence a outro contexto')
    updates.push(...result.items)
  }
  return updates
}
