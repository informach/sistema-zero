import { readValues, writeInOneTransaction } from '../idbTransaction'
import { encodeProjectJsonGraph } from '../projectJsonGraph'
import type { ProjectStorageScope } from '../projectStorageRuntime'

function identity(value: unknown) {
  const pending = [{ value, depth: 0 }]
  const ids: string[] = []
  let blocks = 0
  let depth = 0
  while (pending.length) {
    const item = pending.pop()!
    if (!item.value || typeof item.value !== 'object') continue
    depth = Math.max(depth, item.depth)
    const record = item.value as Record<string, unknown>
    if (typeof record.type === 'string') {
      blocks++
      if (typeof record.id === 'string') ids.push(record.id)
    }
    for (const child of Object.values(record)) pending.push({ value: child, depth: item.depth + 1 })
  }
  if (new Set(ids).size !== ids.length)
    throw new Error('Duplicate block identity in native fixture')
  return { blocks, ids: ids.length, depth }
}

/** Only the browser fixture calls this; no learner/project API is extended. */
export async function qualifyDeepStorage(scope: ProjectStorageScope) {
  const response = await fetch('/deep-blocks.json')
  if (!response.ok) throw new Error('Deep block fixture missing')
  const blocks: unknown = await response.json()
  const source = { blocks, unknown: { missing: undefined, retained: [-0, [], [0], [-1]] } }
  const shape = identity(source)
  if (shape.blocks < 10_000 || shape.depth < 1_000)
    throw new Error(`Native fixture is not a deep large project: ${JSON.stringify(shape)}`)
  const key = 'sz:v4:project-blocks:deep-native'
  const meta = 'sz:v4:project-meta:deep-native'
  await readValues(scope.store, [key]) // Opening prepares the codec before any exit write.
  let nativeCloneError: string | null = null
  try {
    structuredClone(source)
  } catch (error) {
    nativeCloneError = error instanceof Error ? error.name : 'unknown'
  }
  const before = performance.now()
  const encoded = encodeProjectJsonGraph(source)
  await writeInOneTransaction(scope.store, {
    puts: [
      [key, source],
      [meta, { revision: 1 }],
    ],
  })
  const [restored] = await readValues(scope.store, [key])
  if (encodeProjectJsonGraph(restored) !== encoded)
    throw new Error('Deep project changed during native round-trip')
  const readMs = performance.now() - before
  const revision = { ...source, edit: { name: 'edited', value: 42 } }
  await writeInOneTransaction(scope.store, {
    puts: [
      [key, revision],
      [meta, { revision: 2 }],
    ],
  })
  const [edited] = await readValues(scope.store, [key])
  if (encodeProjectJsonGraph(edited) !== encodeProjectJsonGraph(revision))
    throw new Error('Deep edit changed during native round-trip')
  let rejected = false
  try {
    await writeInOneTransaction(scope.store, {
      puts: [
        [meta, { revision: 3 }],
        [key, { format: 'sz-project-json-graph', version: 2, payload: encoded }],
      ],
    })
  } catch {
    rejected = true
  }
  const [after, metadata] = await readValues(scope.store, [key, meta])
  if (
    !rejected ||
    encodeProjectJsonGraph(after) !== encodeProjectJsonGraph(revision) ||
    (metadata as { revision?: number })?.revision !== 2
  )
    throw new Error('Incompatible storage write was not atomic')
  return {
    ...shape,
    nativeCloneError,
    graphChars: encoded.length,
    firstRoundTripMs: Math.round(readMs),
  }
}
