import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { eq } from 'drizzle-orm'
import { validateEditorialGraph } from '../src/domain/workspace/editorial-graph'
import { references } from '../src/domain/workspace/references'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { readEditorialGraph } from '../src/infrastructure/persistence/drizzle/editorial-graph-query'
import { editorialItems as items } from '../src/infrastructure/persistence/drizzle/workspace-schema'

// Read-only: the disposable review database and imported review project are intentionally fixed.
const projectId = '3e38583e-cdd7-4717-89b7-e155b4ca8dd6'
const connection = createDbConnection('postgres://postgres@127.0.0.1:15439/marketing_review', {
  max: 1,
})
const read = () =>
  connection.db
    .select({ id: items.id, document: items.document, archived: items.archived })
    .from(items)
    .where(eq(items.projectId, projectId))
const optimized = process.argv.includes('--neighborhood')
try {
  const initial = (await read()).sort((a, b) => a.id.localeCompare(b.id)),
    piece = initial.find((node) => !node.archived && node.document.kind === 'piece')
  if (!piece) throw new Error('Projeto de revisão ainda não tem peças')
  const changed = new Set([piece.id]),
    samples: Array<{ readMs: number; validateMs: number; totalMs: number }> = []
  let bytes = 0,
    returnedNodes = 0
  for (let iteration = 0; iteration < 13; iteration++) {
    const start = performance.now(),
      rows = optimized
        ? await connection.db.transaction((tx) => readEditorialGraph(tx, projectId, changed))
        : await read(),
      fetched = performance.now()
    validateEditorialGraph(rows, changed)
    const end = performance.now()
    if (iteration >= 3)
      samples.push({ readMs: fetched - start, validateMs: end - fetched, totalMs: end - start })
    bytes = Buffer.byteLength(JSON.stringify(rows))
    returnedNodes = rows.length
  }
  const outcomes: string[] = []
  const verify = (nodes: typeof initial, changed: Set<string>) => {
    if (!optimized) return validateEditorialGraph(nodes, changed)
    const affected = nodes.filter(
      (node) =>
        changed.has(node.id) ||
        (!node.archived && references(node.document).items.some((id) => changed.has(id))),
    )
    const included = new Set([
      ...affected.map((node) => node.id),
      ...affected
        .filter((node) => !node.archived)
        .flatMap((node) => references(node.document).items),
    ])
    return validateEditorialGraph(
      nodes.filter((node) => included.has(node.id)),
      changed,
    )
  }
  for (const node of initial.filter((node) => !node.archived).slice(0, 150)) {
    try {
      verify(initial, new Set([node.id]))
      outcomes.push('valid')
    } catch {
      outcomes.push('invalid')
    }
    try {
      verify(
        initial.map((value) => (value.id === node.id ? { ...value, archived: true } : value)),
        new Set([node.id]),
      )
      outcomes.push('valid')
    } catch {
      outcomes.push('invalid')
    }
  }
  const percentile = (key: keyof (typeof samples)[number], p: number) =>
    samples.map((sample) => sample[key]).sort((a, b) => a - b)[Math.ceil(p * samples.length) - 1]
  const result = {
    mode: optimized ? 'neighborhood' : 'full-project',
    projectId,
    nodes: initial.length,
    returnedNodes,
    transferredBytesPerValidation: bytes,
    samples: samples.length,
    latency: Object.fromEntries(
      (['readMs', 'validateMs', 'totalMs'] as const).map((key) => [
        key,
        { p50: percentile(key, 0.5), p95: percentile(key, 0.95), p99: percentile(key, 0.99) },
      ]),
    ),
    memory: process.memoryUsage(),
    outcomesHash: createHash('sha256').update(JSON.stringify(outcomes)).digest('hex'),
  }
  await writeFile(
    `../../.cache/editorial-graph-${optimized ? 'optimized' : 'baseline'}.json`,
    JSON.stringify(result, null, 2),
  )
  console.log(JSON.stringify(result))
} finally {
  await connection.close()
}
