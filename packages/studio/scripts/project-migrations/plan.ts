import { creationStorageKey } from '@sistemazero/core/creations'
import { isGallerySubmission } from '@sistemazero/core/learning'
import { migrateGameTwoDToolTypes } from '../../src/project-migrations/gameTwoD'
import {
  canonical,
  convertCourseContent,
  convertCreation,
  convertDocument,
  convertStoredProject,
  decode,
  encode,
  objectId,
  sqlTimestamp,
} from './content'
import { migrateDraftBases } from './drafts'
import {
  hash,
  type Row,
  type RowChange,
  STAGING_PROJECT,
  type StoredObject,
  TABLES,
  type Table,
} from './railway'

export interface Corpus {
  environment: 'staging'
  project: typeof STAGING_PROJECT
  capturedAt: string
  rows: Record<Table, Row[]>
  objects: StoredObject[]
}
export interface ObjectChange {
  before?: StoredObject
  after: Omit<StoredObject, 'etag'>
}
export interface BatchPlan {
  version: 1
  environment: 'staging'
  project: typeof STAGING_PROJECT
  sourceHash: string
  createdAt: string
  rows: RowChange[]
  sources: Record<Table, Row[]>
  objects: ObjectChange[]
  backups: StoredObject[]
  failures: Array<{ target: string; message: string }>
  documents: number
  assets: number
}
const token = (value: unknown): string => hash(canonical(value)).slice(0, 32)
const uuid = (value: unknown): string => {
  const t = token(value)
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-4${t.slice(13, 16)}-8${t.slice(17, 20)}-${t.slice(20)}`
}

export async function makePlan(corpus: Corpus): Promise<BatchPlan> {
  if (corpus.environment !== 'staging' || corpus.project !== STAGING_PROJECT)
    throw new Error('Este lote só aceita staging')
  const plan: BatchPlan = {
    version: 1,
    environment: 'staging',
    project: STAGING_PROJECT,
    sourceHash: hash(canonical(corpus)),
    createdAt: corpus.capturedAt,
    rows: [],
    sources: structuredClone(corpus.rows),
    objects: [],
    backups: [],
    failures: [],
    documents: 0,
    assets: 0,
  }
  const objects = new Map(corpus.objects.map((object) => [objectId(object), object]))
  const backup = new Map<string, StoredObject>()
  for (const table of Object.keys(TABLES) as Table[]) {
    if (!Array.isArray(corpus.rows[table])) throw new Error(`Inventário incompleto: ${table}`)
    for (const before of corpus.rows[table]) {
      const target = `${table}:${before[TABLES[table].key]}`
      try {
        const after = structuredClone(before)
        const rowObjects: ObjectChange[] = []
        const rowBackups: StoredObject[] = []
        if (table === 'members.creations') {
          if (before.pending_revision !== null)
            throw new Error('Há upload reservado em voo; recolete depois de concluído')
          const main = objects.get(`ugc:${before.storage_ref}`)
          if (!main) throw new Error('Objeto principal ausente')
          const { payload, resources } = await convertCreation(before, objects)
          plan.documents++
          plan.assets += resources.length
          if (canonical(decode(main)) !== canonical(payload) || before.format_version !== 2) {
            const revision = Number(before.last_reserved_revision) + 1
            if (!Number.isSafeInteger(revision) || revision <= Number(before.revision))
              throw new Error('Contador de revisão inválido')
            const key = creationStorageKey(
              String(before.user_id),
              'studio',
              String(before.item_id),
              revision,
            )
            const bytes = encode(payload, true)
            Object.assign(after, {
              revision,
              last_reserved_revision: revision,
              format_version: 2,
              storage_ref: key,
              bytes:
                Buffer.from(bytes, 'base64').length +
                resources.reduce(
                  (total, object) => total + Buffer.from(object.bytes, 'base64').length,
                  0,
                ),
              synced_at: sqlTimestamp(plan.createdAt),
            })
            if (Number(after.bytes) > 40 * 1024 * 1024)
              throw new Error('Resultado excede o teto de armazenamento')
            rowObjects.push({ after: { bucket: 'ugc', key, bytes } })
            rowBackups.push(main, ...resources)
          }
        } else if (table === 'hub.threads') {
          const key = `studio/play/${before.play_id}.json`
          const main = objects.get(`private:${key}`)
          if (!main) throw new Error('Snapshot do mural ausente')
          const raw = decode(main)
          const converted = await convertDocument(raw)
          plan.documents++
          if (canonical(raw) !== canonical(converted)) {
            rowObjects.push({
              before: main,
              after: { bucket: 'private', key, bytes: encode(converted, false) },
            })
            rowBackups.push(main)
          }
        } else if (table === 'members.studio_submissions') {
          for (const key of ['project', 'previous_project']) {
            const value = before[key]
            if (isGallerySubmission(value)) {
              if (value.tool !== 'studio') throw new Error('Entrega diverge do tipo da atividade')
              for (const item of value.items) {
                const main = objects.get(`ugc:${item.storageKey}`)
                if (!main) throw new Error('Snapshot da entrega pela galeria ausente')
                const refs = item.parts.map((part) => {
                  const object = objects.get(`ugc:${part.storageKey}`)
                  if (!object) throw new Error('Recurso da entrega pela galeria ausente')
                  return {
                    hash: part.hash,
                    bucket: 'ugc' as const,
                    key: part.storageKey,
                    bytes: Buffer.from(object.bytes, 'base64').length,
                  }
                })
                const { payload, resources } = await convertStoredProject(
                  item.itemId,
                  main,
                  refs,
                  objects,
                )
                plan.documents++
                plan.assets += resources.length
                if (canonical(payload) !== canonical(decode(main))) {
                  rowObjects.push({
                    before: main,
                    after: { bucket: 'ugc', key: main.key, bytes: encode(payload, true) },
                  })
                  rowBackups.push(main, ...resources)
                }
              }
            } else if (value !== null) {
              after[key] = await convertDocument(value)
              plan.documents++
            }
          }
        } else if (table === 'members.studio_block_grants') {
          if (!Array.isArray(before.blocks) || before.blocks.some((v) => typeof v !== 'string'))
            throw new Error('Grant inválido')
          after.blocks = migrateGameTwoDToolTypes(before.blocks as string[])
        } else {
          for (const key of TABLES[table].columns)
            if (
              key !== 'content_revision' &&
              key !== 'revision' &&
              key !== 'published_revision' &&
              key !== 'version'
            )
              after[key] = await convertCourseContent(before[key])
          if (canonical(after) !== canonical(before)) {
            if ('content_revision' in before) after.content_revision = token(after.content)
            if ('revision' in before) after.revision = uuid(after)
            if (table === 'members.courses') {
              if (!Number.isSafeInteger(before.version)) throw new Error('Versão do curso inválida')
              after.version = Number(before.version) + 1
            }
          }
        }
        if (canonical(after) !== canonical(before)) plan.rows.push({ table, before, after })
        plan.objects.push(...rowObjects)
        for (const object of rowBackups) backup.set(objectId(object), object)
      } catch (error) {
        plan.failures.push({
          target,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
  try {
    migrateDraftBases(corpus.rows, plan.rows)
  } catch (error) {
    plan.failures.push({
      target: 'members.lesson_drafts',
      message: error instanceof Error ? error.message : String(error),
    })
  }
  plan.backups = [...backup.values()]
  return plan
}
