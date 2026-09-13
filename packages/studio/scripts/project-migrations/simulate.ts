import { canonical, objectId } from './content'
import { applyPlan, type BatchAdapter, rollbackPlan } from './engine'
import { type Corpus, makePlan } from './plan'
import { hash, rowIdentity, type StoredObject } from './railway'

/** Ensaio offline com os bytes reais: interromper, retomar, repetir e recuperar. */
export async function simulate(corpus: Corpus): Promise<Record<string, unknown>> {
  const plan = await makePlan(corpus)
  if (plan.failures.length) throw new Error('A simulação tem conversões pendentes')
  let rows = structuredClone(corpus.rows)
  const objects = new Map<string, StoredObject>(
    corpus.objects.map((o) => [objectId(o), structuredClone(o)]),
  )
  let interrupt = true
  const adapter: BatchAdapter = {
    assertCandidate: async () => {},
    rows: async () => structuredClone(rows),
    objects: async (refs) =>
      refs.flatMap((ref) => {
        const found = objects.get(objectId(ref))
        return found ? [structuredClone(found)] : []
      }),
    put: async (object, etag) => {
      const old = objects.get(objectId(object))
      if (old?.bytes === object.bytes) return
      if (old && etag !== old.etag) throw new Error('Conflito de objeto na simulação')
      objects.set(objectId(object), { ...object, etag: hash(object.bytes) })
    },
    swap: async (changes) => {
      if (interrupt) throw new Error('interrupção-simulada')
      const next = structuredClone(rows)
      for (const change of changes) {
        const index = next[change.table].findIndex(
          (row) => rowIdentity(change.table, row) === rowIdentity(change.table, change.before),
        )
        const actual = next[change.table][index]
        if (canonical(actual) === canonical(change.after)) continue
        if (canonical(actual) !== canonical(change.before))
          throw new Error('Conflito de linha na simulação')
        next[change.table][index] = structuredClone(change.after)
      }
      rows = next
    },
    progress: () => {},
  }
  try {
    await applyPlan(plan, adapter)
    throw new Error('A interrupção não ocorreu')
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'interrupção-simulada') throw error
  }
  if (canonical(rows) !== canonical(corpus.rows)) throw new Error('A interrupção alterou o banco')
  interrupt = false
  await applyPlan(plan, adapter)
  await applyPlan(plan, adapter)
  const current = await makePlan({
    ...corpus,
    rows,
    objects: [...objects.values()].filter((o) => !o.key.startsWith('studio-migration-backups/')),
  })
  if (current.failures.length || current.rows.length || current.objects.length)
    throw new Error('A segunda migração não ficou vazia')
  await rollbackPlan(plan, adapter)
  await rollbackPlan(plan, adapter)
  for (const change of plan.rows) {
    const restored = rows[change.table].find(
      (row) => rowIdentity(change.table, row) === rowIdentity(change.table, change.before),
    )!
    const normalized = { ...restored }
    if (change.table === 'members.creations') {
      const beforeObject = corpus.objects.find(
        (o) => o.bucket === 'ugc' && o.key === change.before.storage_ref,
      )
      const afterObject = objects.get(`ugc:${restored.storage_ref}`)
      if (
        beforeObject?.bytes !== afterObject?.bytes ||
        Number(restored.revision) <= Number(change.after.revision)
      )
        throw new Error('A recuperação da criação divergiu')
      for (const column of ['revision', 'last_reserved_revision', 'storage_ref', 'synced_at'])
        normalized[column] = change.before[column]
    } else if (
      change.table === 'members.lesson_drafts' ||
      change.table === 'members.lesson_structures'
    )
      normalized.revision = change.before.revision
    if (change.table === 'members.courses') normalized.version = change.before.version
    if (canonical(normalized) !== canonical(change.before))
      throw new Error('A recuperação alterou dados do aluno')
  }
  for (const change of plan.objects)
    if (change.before && objects.get(objectId(change.before))?.bytes !== change.before.bytes)
      throw new Error('A recuperação alterou o mural')
  return {
    environment: 'offline',
    source: 'staging',
    sourceHash: plan.sourceHash,
    documents: plan.documents,
    assets: plan.assets,
    changedRows: plan.rows.length,
    changedObjects: plan.objects.length,
    interruption: 'passed',
    resume: 'passed',
    repeat: 'passed',
    secondMigration: 'empty',
    recovery: 'passed',
    repeatedRecovery: 'passed',
  }
}
