import { creationPartRefs, objectId } from './content'
import type { Corpus } from './plan'
import { type Bucket, inventoryRows, readObjects, type StoredObject } from './railway'
import type { MigrationTarget } from './target'

export async function captureCorpus(
  target: MigrationTarget,
  progress: (message: string) => void = console.log,
): Promise<Corpus> {
  await readObjects(target, [])
  const rows = await inventoryRows(target)
  const refs = new Map<string, { bucket: Bucket; key: string }>()
  for (const row of rows['members.creations']) {
    const main = { bucket: 'ugc' as const, key: String(row.storage_ref) }
    refs.set(objectId(main), main)
    for (const ref of creationPartRefs(row)) refs.set(objectId(ref), ref)
  }
  for (const row of rows['hub.threads']) {
    const ref = { bucket: 'private' as const, key: `studio/play/${row.play_id}.json` }
    refs.set(objectId(ref), ref)
  }
  for (const row of rows['members.studio_submissions'])
    for (const value of [row.project, row.previous_project])
      if (isGallerySubmission(value) && value.tool === 'studio')
        for (const item of value.items)
          for (const key of [item.storageKey, ...item.parts.map((part) => part.storageKey)]) {
            const ref = { bucket: 'ugc' as const, key }
            refs.set(objectId(ref), ref)
          }
  const requested = [...refs.values()]
  const objects: StoredObject[] = []
  for (let i = 0; i < requested.length; i += 8) {
    objects.push(...(await readObjects(target, requested.slice(i, i + 8))))
    progress(`Objetos conferidos: ${objects.length}/${requested.length}`)
  }
  return {
    target: structuredClone(target),
    capturedAt: new Date().toISOString(),
    rows,
    objects,
  }
}

import { isGallerySubmission } from '@sistemazero/core/learning'
