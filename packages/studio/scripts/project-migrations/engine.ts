import { canonical, decode, encode, objectId, sqlTimestamp } from './content'
import { promotedRows } from './drafts'
import type { BatchPlan } from './plan'
import {
  hash,
  type Row,
  type RowChange,
  rowIdentity,
  STAGING_PROJECT,
  type StoredObject,
  TABLES,
  type Table,
} from './railway'

export interface BatchAdapter {
  assertCandidate(): Promise<void>
  rows(): Promise<Record<Table, Row[]>>
  objects(refs: Array<Pick<StoredObject, 'bucket' | 'key'>>): Promise<StoredObject[]>
  put(object: Omit<StoredObject, 'etag'>, etag?: string): Promise<void>
  swap(changes: RowChange[], sources: Record<Table, Row[]>): Promise<void>
  progress(message: string): void
}

function assertPlan(plan: BatchPlan): void {
  if (
    plan.version !== 1 ||
    plan.environment !== 'staging' ||
    plan.project !== STAGING_PROJECT ||
    !/^[a-f0-9]{64}$/.test(plan.sourceHash)
  )
    throw new Error('Plano de staging inválido')
  if (plan.failures.length)
    throw new Error(`Há ${plan.failures.length} pendências; nenhum dado pode ser promovido`)
}
function rowMap(rows: Record<Table, Row[]>): Map<string, Row> {
  return new Map(
    (Object.keys(TABLES) as Table[]).flatMap((table) =>
      rows[table].map((row) => [`${table}:${rowIdentity(table, row)}`, row] as const),
    ),
  )
}
const rowId = ({ table, before }: RowChange): string => `${table}:${rowIdentity(table, before)}`

export async function applyPlan(plan: BatchPlan, adapter: BatchAdapter): Promise<void> {
  assertPlan(plan)
  await adapter.assertCandidate()
  const current = rowMap(await adapter.rows())
  for (const change of plan.rows) {
    const row = current.get(rowId(change))
    if (canonical(row) !== canonical(change.before) && canonical(row) !== canonical(change.after))
      throw new Error(`Origem mudou: ${rowId(change)}`)
  }
  // Backup independente da revisão ativa e fora dos prefixos varridos pelo GC de criações.
  const prefix = `studio-migration-backups/${plan.sourceHash}`
  await adapter.put({ bucket: 'private', key: `${prefix}/plan.json.gz`, bytes: encode(plan, true) })
  for (let index = 0; index < plan.backups.length; index++) {
    const object = plan.backups[index]!
    await adapter.put({
      bucket: 'private',
      key: `${prefix}/objects/${hash(objectId(object))}${object.key.endsWith('.gz') ? '.gz' : '.json'}`,
      bytes: object.bytes,
    })
    adapter.progress(`Backup ${index + 1}/${plan.backups.length}`)
  }
  // Confere novamente as partes: o inventário pode ter sido coletado antes de outro autosave.
  for (let i = 0; i < plan.backups.length; i += 8) {
    const expected = plan.backups.slice(i, i + 8)
    const found = await adapter.objects(expected)
    for (const original of expected) {
      const actual = found.find((o) => objectId(o) === objectId(original))
      const already = plan.objects.find(
        (o) => o.before && objectId(o.before) === objectId(original),
      )
      if (!actual || (actual.bytes !== original.bytes && actual.bytes !== already?.after.bytes))
        throw new Error(`Objeto de origem mudou: ${objectId(original)}`)
    }
  }
  for (const change of plan.objects) {
    await adapter.put(change.after, change.before?.etag)
    adapter.progress(
      `Objeto preparado: ${change.after.bucket}:${hash(change.after.key).slice(0, 12)}`,
    )
  }
  // Só promove depois de reler e comparar os bytes gravados. Uma falha deixa originais recuperáveis.
  for (let i = 0; i < plan.objects.length; i += 8) {
    const expected = plan.objects.slice(i, i + 8)
    const found = await adapter.objects(expected.map((o) => o.after))
    for (const change of expected)
      if (found.find((o) => objectId(o) === objectId(change.after))?.bytes !== change.after.bytes)
        throw new Error('Verificação da escrita falhou')
  }
  await adapter.swap(plan.rows, plan.sources)
  const final = rowMap(await adapter.rows())
  for (const change of plan.rows)
    if (canonical(final.get(rowId(change))) !== canonical(change.after))
      throw new Error(`Verificação da promoção falhou: ${rowId(change)}`)
  await adapter.put({
    bucket: 'private',
    key: `${prefix}/applied.json`,
    bytes: encode({ sourceHash: plan.sourceHash, state: 'applied' }, false),
  })
}

/** Recuperação também usa CAS. Uma edição posterior nunca é trocada por backup. */
export async function rollbackPlan(plan: BatchPlan, adapter: BatchAdapter): Promise<void> {
  assertPlan(plan)
  await adapter.assertCandidate()
  const prefix = `studio-migration-backups/${plan.sourceHash}`
  const receiptKey = `${prefix}/recovery.json.gz`
  const [receipt] = await adapter.objects([{ bucket: 'private', key: receiptKey }])
  const current = rowMap(await adapter.rows())
  let recovery: { sourceHash: string; rows: RowChange[]; objects: BatchPlan['objects'] }
  if (receipt) {
    recovery = decode(receipt) as typeof recovery
    if (
      recovery.sourceHash !== plan.sourceHash ||
      !Array.isArray(recovery.rows) ||
      !Array.isArray(recovery.objects)
    )
      throw new Error('Diário de recuperação inválido')
  } else {
    recovery = { sourceHash: plan.sourceHash, rows: [], objects: [] }
    for (const change of plan.rows) {
      const row = current.get(rowId(change))
      if (canonical(row) === canonical(change.before)) continue
      if (canonical(row) !== canonical(change.after))
        throw new Error(`Edição posterior impede recuperação: ${rowId(change)}`)
      const restored = structuredClone(change.before)
      if (change.table === 'members.creations') {
        const revision = Number(change.after.last_reserved_revision) + 1
        const key = String(change.before.storage_ref).replace(
          /\/\d+\.json\.gz$/,
          `/${revision}.json.gz`,
        )
        const original = plan.backups.find(
          (o) => o.bucket === 'ugc' && o.key === change.before.storage_ref,
        )
        if (!original || key === original.key)
          throw new Error('Backup principal da recuperação ausente')
        recovery.objects.push({ after: { ...original, key } })
        Object.assign(restored, {
          revision,
          last_reserved_revision: revision,
          storage_ref: key,
          synced_at: sqlTimestamp(new Date().toISOString()),
        })
      } else if (
        change.table === 'members.lesson_drafts' ||
        change.table === 'members.lesson_structures'
      ) {
        restored.revision = crypto.randomUUID()
      }
      if (change.table === 'members.courses') restored.version = Number(change.after.version) + 1
      recovery.rows.push({ table: change.table, before: change.after, after: restored })
    }
    for (const change of plan.objects) {
      if (!change.before) continue
      const [object] = await adapter.objects([change.after])
      if (object?.bytes === change.before.bytes) continue
      if (!object || object.bytes !== change.after.bytes)
        throw new Error('Snapshot do mural mudou depois da migração')
      recovery.objects.push({ before: object, after: change.before })
    }
    // O instante e os números de recuperação ficam duráveis ANTES da primeira escrita.
    await adapter.put({ bucket: 'private', key: receiptKey, bytes: encode(recovery, true) })
  }
  for (const change of recovery.rows) {
    const row = current.get(rowId(change))
    if (canonical(row) !== canonical(change.before) && canonical(row) !== canonical(change.after))
      throw new Error(`Edição posterior impede recuperação: ${rowId(change)}`)
  }
  for (const change of recovery.objects) await adapter.put(change.after, change.before?.etag)
  const found = await adapter.objects(recovery.objects.map((o) => o.after))
  for (const change of recovery.objects)
    if (found.find((o) => objectId(o) === objectId(change.after))?.bytes !== change.after.bytes)
      throw new Error('Verificação da recuperação falhou')
  await adapter.swap(recovery.rows, promotedRows(plan.sources, plan.rows))
  const final = rowMap(await adapter.rows())
  for (const change of recovery.rows)
    if (canonical(final.get(rowId(change))) !== canonical(change.after))
      throw new Error('Verificação da recuperação no banco falhou')
  await adapter.put({
    bucket: 'private',
    key: `${prefix}/recovered.json`,
    bytes: encode({ sourceHash: plan.sourceHash, state: 'recovered' }, false),
  })
  adapter.progress('Recuperação concluída; backups e objetos novos foram conservados')
}
